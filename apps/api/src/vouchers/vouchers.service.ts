import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { TenantContext } from "@billing/shared-types";
import {
  validateJournalLines,
  validatePeriodAccess,
  buildReversalVoucherPlan,
  applyTransactionToBalance,
  calculateNaturalBalanceDelta,
  toMoney,
  toDecimal,
  Decimal,
} from "@billing/accounting-core";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../audit/audit.service";
import { CreateVoucherDto } from "./dto/create-voucher.dto";
import { ReverseVoucherDto } from "./dto/reverse-voucher.dto";
import { CreateReceiptVoucherDto } from "./dto/create-receipt-voucher.dto";
import { CreateExpenseVoucherDto } from "./dto/create-expense-voucher.dto";

@Injectable()
export class VouchersService {
  private readonly logger = new Logger(VouchersService.name);

  constructor(
    private readonly prisma: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Posts a new balanced double-entry voucher inside an atomic database transaction
   */
  async createVoucher(
    dto: CreateVoucherDto,
    tenant: TenantContext,
  ): Promise<any> {
    if (!dto.voucherNumber || dto.voucherNumber.trim() === "") {
      throw new BadRequestException("Voucher number is required.");
    }
    if (!dto.voucherDate) {
      throw new BadRequestException("Voucher date is required.");
    }

    // 1. Validate Double-Entry Invariants (Debits == Credits, no negative/zero lines)
    const lineValidation = validateJournalLines(dto.lines);
    if (!lineValidation.isValid) {
      throw new BadRequestException(lineValidation.errors.join("; "));
    }

    return await this.prisma.executeInTenantContext(tenant, async (tx) => {
      // 2. Identify and Validate Financial Year & Period Lock
      let fy: any;
      if (dto.financialYearId) {
        fy = await tx.financialYear.findFirst({
          where: { id: dto.financialYearId, companyId: tenant.companyId },
        });
      } else {
        const vDate = new Date(dto.voucherDate);
        fy = await tx.financialYear.findFirst({
          where: {
            companyId: tenant.companyId,
            startDate: { lte: vDate },
            endDate: { gte: vDate },
          },
        });
        if (!fy) {
          // Fallback to active/current financial year
          fy = await tx.financialYear.findFirst({
            where: { companyId: tenant.companyId, isCurrent: true },
          });
        }
      }

      if (!fy) {
        throw new NotFoundException(
          `No valid financial year found for company ${tenant.companyId} and date ${dto.voucherDate}.`,
        );
      }

      const periodCheck = validatePeriodAccess(
        dto.voucherDate,
        tenant.companyId,
        fy,
      );
      if (!periodCheck.isAllowed) {
        throw new BadRequestException(periodCheck.reason);
      }

      // 3. Check for Duplicate Voucher Number in the same company & FY
      const duplicate = await tx.voucher.findUnique({
        where: {
          companyId_financialYearId_voucherType_voucherNumber: {
            companyId: tenant.companyId,
            financialYearId: fy.id,
            voucherType: dto.voucherType as any,
            voucherNumber: dto.voucherNumber.trim(),
          },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          `Voucher '${dto.voucherNumber}' already exists for this financial year and voucher type.`,
        );
      }

      // 4. Fetch and Verify all Referenced Ledger Accounts
      const accountIds = dto.lines.map((l) => l.accountId);
      const accounts = await tx.ledgerAccount.findMany({
        where: {
          id: { in: accountIds },
          companyId: tenant.companyId,
        },
        include: { group: true },
      });

      if (accounts.length !== new Set(accountIds).size) {
        throw new BadRequestException(
          "One or more referenced ledger accounts do not exist in this company.",
        );
      }

      const accountMap = new Map(accounts.map((a) => [a.id, a]));

      // Verify all accounts are active
      for (const line of dto.lines) {
        const acc = accountMap.get(line.accountId);
        if (acc && !acc.isActive) {
          throw new BadRequestException(
            `Ledger account '${acc.name}' is inactive and cannot receive postings.`,
          );
        }
      }

      // 5. Create Voucher Header
      const voucher = await tx.voucher.create({
        data: {
          organizationId: tenant.organizationId,
          companyId: tenant.companyId,
          financialYearId: fy.id,
          voucherType: dto.voucherType as any,
          voucherNumber: dto.voucherNumber.trim(),
          voucherDate: new Date(dto.voucherDate),
          referenceNo: dto.referenceNo?.trim(),
          narration: dto.narration?.trim(),
          narrationGujarati: dto.narrationGujarati?.trim(),
          totalAmount: lineValidation.totalDebit.toNumber(),
          isAutoGenerated: false,
          isCancelled: false,
        },
      });

      // 6. Insert Journal Lines & Atomically Update Ledger Account Balances
      const createdLines: any[] = [];
      for (let i = 0; i < dto.lines.length; i++) {
        const line = dto.lines[i];
        const acc = accountMap.get(line.accountId)!;
        const dr = toMoney(line.debitAmount || 0);
        const cr = toMoney(line.creditAmount || 0);

        const journalEntry = await tx.journalEntry.create({
          data: {
            voucherId: voucher.id,
            accountId: line.accountId,
            debitAmount: dr.toNumber(),
            creditAmount: cr.toNumber(),
            lineNarration: line.lineNarration?.trim(),
            sequenceOrder: line.sequenceOrder || i + 1,
          },
        });
        createdLines.push(journalEntry);

        // Update Account Current Balance according to Account Nature
        const newBalance = applyTransactionToBalance(
          acc.group.nature as any,
          acc.currentBalance.toString(),
          dr,
          cr,
        );

        await tx.ledgerAccount.update({
          where: { id: acc.id },
          data: { currentBalance: newBalance.toNumber() },
        });
      }

      // 7. Audit Logging (atomic with voucher creation)
      await this.audit.record(
        {
          organizationId: tenant.organizationId,
          companyId: tenant.companyId,
          userId: tenant.userId || "00000000-0000-0000-0000-000000000000",
          action: "POST_VOUCHER",
          entityName: "Voucher",
          entityId: voucher.id,
          newState: {
            voucherNumber: voucher.voucherNumber,
            voucherType: voucher.voucherType,
            totalAmount: voucher.totalAmount,
            linesCount: createdLines.length,
          },
        },
        tx,
      );

      return {
        ...voucher,
        journalEntries: createdLines,
      };
    });
  }

  /**
   * Reverse an existing posted voucher with an atomic contra correction
   */
  async reverseVoucher(
    id: string,
    dto: ReverseVoucherDto,
    tenant: TenantContext,
  ): Promise<any> {
    if (!dto.reason || dto.reason.trim() === "") {
      throw new BadRequestException("Reversal reason is required.");
    }

    return await this.prisma.executeInTenantContext(tenant, async (tx) => {
      const original = await tx.voucher.findFirst({
        where: { id, companyId: tenant.companyId },
        include: {
          financialYear: true,
          journalEntries: {
            include: { account: { include: { group: true } } },
            orderBy: { sequenceOrder: "asc" },
          },
        },
      });

      if (!original) {
        throw new NotFoundException(`Voucher '${id}' not found.`);
      }

      if (original.isCancelled) {
        throw new BadRequestException(
          `Voucher '${original.voucherNumber}' is already cancelled or reversed.`,
        );
      }

      // Period lock check on original FY
      if (original.financialYear.isLocked) {
        throw new BadRequestException(
          `Financial year ${original.financialYear.name} is locked. Cannot reverse vouchers in locked periods.`,
        );
      }

      // Build contra reversal plan
      const plan = buildReversalVoucherPlan(
        {
          id: original.id,
          voucherNumber: original.voucherNumber,
          voucherDate: original.voucherDate,
          narration: original.narration,
          journalEntries: original.journalEntries.map((e) => ({
            accountId: e.accountId,
            debitAmount: e.debitAmount.toString(),
            creditAmount: e.creditAmount.toString(),
            lineNarration: e.lineNarration,
            sequenceOrder: e.sequenceOrder,
          })),
        },
        dto.reason.trim(),
        dto.reversalVoucherNumber?.trim(),
      );

      // Check if reversal voucher number already exists
      const duplicate = await tx.voucher.findUnique({
        where: {
          companyId_financialYearId_voucherType_voucherNumber: {
            companyId: tenant.companyId,
            financialYearId: original.financialYearId,
            voucherType: "JOURNAL",
            voucherNumber: plan.reversalVoucherNumber,
          },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          `Reversal voucher number '${plan.reversalVoucherNumber}' already exists.`,
        );
      }

      // Mark original as cancelled
      await tx.voucher.update({
        where: { id: original.id },
        data: { isCancelled: true },
      });

      // Create Reversal Voucher
      const reversalDate = dto.reversalDate
        ? new Date(dto.reversalDate)
        : original.voucherDate;
      const reversalVoucher = await tx.voucher.create({
        data: {
          organizationId: tenant.organizationId,
          companyId: tenant.companyId,
          financialYearId: original.financialYearId,
          voucherType: "JOURNAL",
          voucherNumber: plan.reversalVoucherNumber,
          voucherDate: reversalDate,
          referenceNo: original.voucherNumber,
          narration: plan.narration,
          narrationGujarati: plan.narrationGujarati,
          totalAmount: original.totalAmount,
          isAutoGenerated: false,
          isCancelled: false,
          sourceDocument: "VOUCHER_REVERSAL",
          sourceEntityId: original.id,
        },
      });

      // Insert contra journal lines & revert balances
      const createdContraLines: any[] = [];
      for (const line of plan.lines) {
        const originalEntry = original.journalEntries.find(
          (e) => e.accountId === line.accountId,
        )!;
        const acc = originalEntry.account;
        const dr = toMoney(line.debitAmount);
        const cr = toMoney(line.creditAmount);

        const contraEntry = await tx.journalEntry.create({
          data: {
            voucherId: reversalVoucher.id,
            accountId: line.accountId,
            debitAmount: dr.toNumber(),
            creditAmount: cr.toNumber(),
            lineNarration: line.lineNarration,
            sequenceOrder: line.sequenceOrder,
          },
        });
        createdContraLines.push(contraEntry);

        // Apply contra transaction to account balance
        const newBalance = applyTransactionToBalance(
          acc.group.nature as any,
          acc.currentBalance.toString(),
          dr,
          cr,
        );

        await tx.ledgerAccount.update({
          where: { id: acc.id },
          data: { currentBalance: newBalance.toNumber() },
        });
      }

      // Audit Logging (atomic with voucher reversal)
      await this.audit.record(
        {
          organizationId: tenant.organizationId,
          companyId: tenant.companyId,
          userId: tenant.userId || "00000000-0000-0000-0000-000000000000",
          action: "REVERSE_VOUCHER",
          entityName: "Voucher",
          entityId: original.id,
          previousState: { isCancelled: false },
          newState: {
            isCancelled: true,
            reversalVoucherId: reversalVoucher.id,
            reversalVoucherNumber: reversalVoucher.voucherNumber,
          },
        },
        tx,
      );

      return {
        originalVoucherId: original.id,
        isCancelled: true,
        reversalVoucher: {
          ...reversalVoucher,
          journalEntries: createdContraLines,
        },
      };
    });
  }

  /**
   * Search and paginate posted vouchers
   */
  async listVouchers(
    tenant: TenantContext,
    query?: {
      voucherType?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      isCancelled?: boolean;
      page?: number;
      limit?: number;
    },
  ): Promise<any> {
    return await this.prisma.executeInTenantContext(tenant, async (tx) => {
      const page = Math.max(1, Number(query?.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(query?.limit) || 50));
      const skip = (page - 1) * limit;

      const where: any = { companyId: tenant.companyId };

      if (query?.voucherType) {
        where.voucherType = query.voucherType;
      }

      if (query?.isCancelled !== undefined) {
        where.isCancelled = String(query.isCancelled) === "true";
      }

      if (query?.startDate || query?.endDate) {
        where.voucherDate = {};
        if (query.startDate) where.voucherDate.gte = new Date(query.startDate);
        if (query.endDate) where.voucherDate.lte = new Date(query.endDate);
      }

      if (query?.search && query.search.trim() !== "") {
        const s = query.search.trim();
        where.OR = [
          { voucherNumber: { contains: s, mode: "insensitive" } },
          { narration: { contains: s, mode: "insensitive" } },
          { referenceNo: { contains: s, mode: "insensitive" } },
        ];
      }

      const [data, total] = await Promise.all([
        tx.voucher.findMany({
          where,
          include: {
            financialYear: { select: { id: true, name: true } },
            journalEntries: {
              include: {
                account: { select: { id: true, name: true, code: true } },
              },
              orderBy: { sequenceOrder: "asc" },
            },
          },
          orderBy: [{ voucherDate: "desc" }, { createdAt: "desc" }],
          skip,
          take: limit,
        }),
        tx.voucher.count({ where }),
      ]);

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    });
  }

  /**
   * Get single voucher by ID
   */
  async getVoucherById(id: string, tenant: TenantContext): Promise<any> {
    return await this.prisma.executeInTenantContext(tenant, async (tx) => {
      const voucher = await tx.voucher.findFirst({
        where: { id, companyId: tenant.companyId },
        include: {
          financialYear: true,
          journalEntries: {
            include: {
              account: {
                include: { group: true },
              },
            },
            orderBy: { sequenceOrder: "asc" },
          },
        },
      });

      if (!voucher) {
        throw new NotFoundException(`Voucher '${id}' not found.`);
      }

      return voucher;
    });
  }

  /**
   * Post Receipt Voucher with Bill Matching (Payment Allocation against Sales Invoices)
   */
  async createReceiptVoucher(
    dto: CreateReceiptVoucherDto,
    tenant: TenantContext,
  ): Promise<any> {
    if (!dto.allocations || dto.allocations.length === 0) {
      throw new BadRequestException(
        "Receipt voucher must have at least one bill allocation.",
      );
    }

    const receivedAmount = toMoney(dto.receivedAmount);
    if (receivedAmount.lessThanOrEqualTo(0)) {
      throw new BadRequestException(
        "Received amount must be greater than zero.",
      );
    }

    return await this.prisma.executeInTenantContext(tenant, async (tx) => {
      // 1. Validate Party
      const party = await tx.party.findFirst({
        where: { id: dto.partyId, companyId: tenant.companyId },
        include: { ledgerAccount: true },
      });
      if (!party) {
        throw new NotFoundException(`Party '${dto.partyId}' not found.`);
      }

      // 2. Validate Financial Year & Period
      const vDate = new Date(dto.voucherDate);
      let fy = await tx.financialYear.findFirst({
        where: {
          companyId: tenant.companyId,
          startDate: { lte: vDate },
          endDate: { gte: vDate },
        },
      });
      if (!fy) {
        fy = await tx.financialYear.findFirst({
          where: { companyId: tenant.companyId, isCurrent: true },
        });
      }
      if (!fy) {
        throw new NotFoundException(
          `No open financial year found for company on ${dto.voucherDate}.`,
        );
      }
      const periodCheck = validatePeriodAccess(
        dto.voucherDate,
        tenant.companyId,
        fy,
      );
      if (!periodCheck.isAllowed) {
        throw new BadRequestException(periodCheck.reason);
      }

      // 3. Deposit Account (Cash or Bank)
      let depositAccount: any;
      if (dto.depositToAccountId) {
        depositAccount = await tx.ledgerAccount.findFirst({
          where: { id: dto.depositToAccountId, companyId: tenant.companyId },
          include: { group: true },
        });
      } else {
        depositAccount = await tx.ledgerAccount.findFirst({
          where: { companyId: tenant.companyId, name: "Cash Account" },
          include: { group: true },
        });
      }
      if (!depositAccount) {
        throw new NotFoundException(
          "Deposit account not found in this company.",
        );
      }

      // 4. Customer Account
      let customerAccount = party.ledgerAccount;
      if (!customerAccount) {
        customerAccount = await tx.ledgerAccount.findFirst({
          where: { companyId: tenant.companyId, partyId: party.id },
          include: { group: true },
        });
      }
      if (!customerAccount) {
        const sundryDebtors = await tx.ledgerGroup.findFirst({
          where: { companyId: tenant.companyId, name: "Sundry Debtors" },
        });
        customerAccount = await tx.ledgerAccount.create({
          data: {
            organizationId: tenant.organizationId,
            companyId: tenant.companyId,
            groupId:
              sundryDebtors?.id ||
              (await tx.ledgerGroup.findFirst({
                where: { companyId: tenant.companyId, nature: "ASSET" },
              }))!.id,
            name: party.name,
            isPartyLedger: true,
            partyId: party.id,
            openingType: "DR",
            currentBalance: 0,
          },
          include: { group: true },
        });
      }

      // 5. Validate Allocations
      let totalSettled = new Decimal(0);
      let totalCashDiscount = new Decimal(0);
      const invoiceUpdates: Array<{
        invoice: any;
        settled: Decimal;
        discount: Decimal;
      }> = [];

      for (const alloc of dto.allocations) {
        const inv = await tx.salesInvoice.findFirst({
          where: { id: alloc.invoiceId, companyId: tenant.companyId },
        });
        if (!inv) {
          throw new NotFoundException(
            `Sales invoice '${alloc.invoiceId}' not found.`,
          );
        }
        if (inv.status !== "ISSUED" && inv.status !== "PARTIALLY_PAID") {
          throw new BadRequestException(
            `Invoice '${inv.invoiceNumber}' is already ${inv.status} and cannot receive payments.`,
          );
        }
        const settled = toMoney(alloc.settledAmount);
        const discount = toMoney(alloc.cashDiscountGiven || 0);
        const allocTotal = settled.plus(discount);
        const invBalance = toMoney(inv.balanceAmount);

        if (allocTotal.greaterThan(invBalance)) {
          throw new BadRequestException(
            `Settlement amount of ₹${allocTotal.toString()} exceeds pending balance of ₹${invBalance.toString()} on invoice #${inv.invoiceNumber}.`,
          );
        }

        totalSettled = totalSettled.plus(settled);
        totalCashDiscount = totalCashDiscount.plus(discount);
        invoiceUpdates.push({ invoice: inv, settled, discount });
      }

      if (!totalSettled.equals(receivedAmount)) {
        throw new BadRequestException(
          `Sum of allocated settled amounts (₹${totalSettled.toString()}) does not match received amount (₹${receivedAmount.toString()}).`,
        );
      }

      // 6. Build Double-Entry Journal Lines
      const voucherLines: Array<{
        accountId: string;
        debitAmount: number;
        creditAmount: number;
        lineNarration: string;
      }> = [];

      // DR Deposit Account for Received Amount
      voucherLines.push({
        accountId: depositAccount.id,
        debitAmount: receivedAmount.toNumber(),
        creditAmount: 0,
        lineNarration: `Receipt from ${party.name}`,
      });

      // DR Discount Allowed for Cash Discount if any
      if (totalCashDiscount.greaterThan(0)) {
        const discountAcc = await tx.ledgerAccount.findFirst({
          where: { companyId: tenant.companyId, name: "Discount Allowed" },
        });
        if (discountAcc) {
          voucherLines.push({
            accountId: discountAcc.id,
            debitAmount: totalCashDiscount.toNumber(),
            creditAmount: 0,
            lineNarration: "Cash discount allowed on bill settlement",
          });
        }
      }

      // CR Customer Ledger for Total Settlement
      const totalCustomerCredit = receivedAmount.plus(totalCashDiscount);
      voucherLines.push({
        accountId: customerAccount.id,
        debitAmount: 0,
        creditAmount: totalCustomerCredit.toNumber(),
        lineNarration: `Receipt settlement against bills`,
      });

      // Validate lines
      const validation = validateJournalLines(voucherLines);
      if (!validation.isValid) {
        throw new BadRequestException(validation.errors.join("; "));
      }

      // 7. Create Voucher
      const voucherNumber = `RC-${Date.now().toString(36).toUpperCase()}`;
      const voucher = await tx.voucher.create({
        data: {
          organizationId: tenant.organizationId,
          companyId: tenant.companyId,
          financialYearId: fy.id,
          voucherType: "RECEIPT" as any,
          voucherNumber,
          voucherDate: vDate,
          referenceNo: dto.paymentReference || null,
          narration: dto.narration || `Receipt from ${party.name}`,
          narrationGujarati: dto.narrationGujarati || null,
          totalAmount: totalCustomerCredit.toNumber(),
          isAutoGenerated: false,
          isCancelled: false,
        },
      });

      // Insert Journal Entries & Update Account Balances
      for (let i = 0; i < voucherLines.length; i++) {
        const vl = voucherLines[i];
        await tx.journalEntry.create({
          data: {
            voucherId: voucher.id,
            accountId: vl.accountId,
            debitAmount: vl.debitAmount,
            creditAmount: vl.creditAmount,
            lineNarration: vl.lineNarration,
            sequenceOrder: i + 1,
          },
        });

        const acc = await tx.ledgerAccount.findUnique({
          where: { id: vl.accountId },
          include: { group: true },
        });
        if (acc) {
          const newBal = applyTransactionToBalance(
            acc.group.nature as any,
            acc.currentBalance.toString(),
            toMoney(vl.debitAmount),
            toMoney(vl.creditAmount),
          );
          await tx.ledgerAccount.update({
            where: { id: acc.id },
            data: { currentBalance: newBal.toNumber() },
          });
        }
      }

      // 8. Create PaymentAllocation records and update invoice balances
      const createdAllocations: any[] = [];
      for (const item of invoiceUpdates) {
        const allocRecord = await tx.paymentAllocation.create({
          data: {
            voucherId: voucher.id,
            invoiceId: item.invoice.id,
            allocatedAmount: item.settled.toNumber(),
            cashDiscount: item.discount.toNumber(),
            allocationDate: vDate,
          },
        });
        createdAllocations.push(allocRecord);

        const totalApplied = item.settled.plus(item.discount);
        const newPaid = toMoney(item.invoice.paidAmount).plus(totalApplied);
        const newBalance = toMoney(item.invoice.balanceAmount).minus(
          totalApplied,
        );
        const newStatus = newBalance.isZero() ? "PAID" : "PARTIALLY_PAID";

        await tx.salesInvoice.update({
          where: { id: item.invoice.id },
          data: {
            paidAmount: newPaid.toNumber(),
            balanceAmount: newBalance.toNumber(),
            status: newStatus as any,
          },
        });
      }

      // 9. Audit Log (atomic with receipt voucher posting)
      await this.audit.record(
        {
          organizationId: tenant.organizationId,
          companyId: tenant.companyId,
          userId: tenant.userId || "00000000-0000-0000-0000-000000000000",
          action: "POST_RECEIPT_VOUCHER",
          entityName: "Voucher",
          entityId: voucher.id,
          newState: {
            voucherNumber,
            receivedAmount: receivedAmount.toNumber(),
            partyId: party.id,
          },
        },
        tx,
      );

      return {
        ...voucher,
        allocations: createdAllocations,
      };
    });
  }

  /**
   * Posts an expense payment voucher debiting an expense ledger and crediting cash/bank
   */
  async createExpenseVoucher(
    dto: CreateExpenseVoucherDto,
    tenant: TenantContext,
  ): Promise<any> {
    if (!dto.expenseAccountId) {
      throw new BadRequestException("Expense account ID is required.");
    }
    if (!dto.amount || Number(dto.amount) <= 0) {
      throw new BadRequestException(
        "Expense amount must be greater than zero.",
      );
    }

    const expenseAmount = toMoney(dto.amount);
    const voucherDate = dto.voucherDate
      ? new Date(dto.voucherDate)
      : new Date();

    return this.prisma.executeInTenantContext(tenant, async (tx) => {
      // 1. Verify Financial Year
      const fy = await tx.financialYear.findFirst({
        where: { id: tenant.financialYearId, companyId: tenant.companyId },
      });
      if (!fy) {
        throw new NotFoundException(
          "Active financial year not found for this company.",
        );
      }

      const periodCheck = validatePeriodAccess(
        voucherDate,
        tenant.companyId,
        fy,
      );
      if (!periodCheck.isAllowed) {
        throw new BadRequestException(periodCheck.reason);
      }

      // 2. Verify Expense Account
      const expenseAccount = await tx.ledgerAccount.findFirst({
        where: { id: dto.expenseAccountId, companyId: tenant.companyId },
        include: { group: true },
      });
      if (!expenseAccount) {
        throw new NotFoundException(
          "Expense account not found in this company.",
        );
      }
      if (!expenseAccount.isActive) {
        throw new BadRequestException(
          `Cannot post expense to inactive account: ${expenseAccount.name}`,
        );
      }

      // 3. Payment Account (Cash or Bank)
      let paymentAccount: any;
      if (dto.paidFromAccountId) {
        paymentAccount = await tx.ledgerAccount.findFirst({
          where: { id: dto.paidFromAccountId, companyId: tenant.companyId },
          include: { group: true },
        });
      } else {
        paymentAccount = await tx.ledgerAccount.findFirst({
          where: { companyId: tenant.companyId, isCashLedger: true },
          include: { group: true },
        });
        if (!paymentAccount) {
          paymentAccount = await tx.ledgerAccount.findFirst({
            where: {
              companyId: tenant.companyId,
              name: { contains: "Cash", mode: "insensitive" },
            },
            include: { group: true },
          });
        }
      }
      if (!paymentAccount) {
        throw new NotFoundException(
          "Payment account (Cash/Bank) not found in this company.",
        );
      }
      if (!paymentAccount.isActive) {
        throw new BadRequestException(
          `Cannot post payment from inactive account: ${paymentAccount.name}`,
        );
      }

      // 4. Voucher Number Sequence
      let voucherNumber = dto.voucherNumber;
      if (!voucherNumber) {
        const count = await tx.voucher.count({
          where: {
            companyId: tenant.companyId,
            financialYearId: tenant.financialYearId,
            voucherType: "PAYMENT" as any,
          },
        });
        voucherNumber = `PAY-${voucherDate.getFullYear()}-${String(count + 1).padStart(4, "0")}`;
      } else {
        const existing = await tx.voucher.findUnique({
          where: {
            companyId_financialYearId_voucherType_voucherNumber: {
              companyId: tenant.companyId,
              financialYearId: fy.id,
              voucherType: "PAYMENT" as any,
              voucherNumber: voucherNumber.trim(),
            },
          },
        });
        if (existing) {
          throw new ConflictException(
            `Voucher number ${voucherNumber} already exists in this financial year.`,
          );
        }
      }

      // 5. Create Voucher with Journal Entries
      const voucher = await tx.voucher.create({
        data: {
          organizationId: tenant.organizationId,
          companyId: tenant.companyId,
          financialYearId: fy.id,
          voucherType: "PAYMENT" as any,
          voucherNumber,
          voucherDate,
          totalAmount: expenseAmount.toNumber(),
          referenceNo: dto.referenceNo || null,
          narration: dto.narration || `Expense paid: ${expenseAccount.name}`,
          journalEntries: {
            create: [
              {
                accountId: expenseAccount.id,
                debitAmount: expenseAmount.toNumber(),
                creditAmount: 0,
                lineNarration: `Expense: ${expenseAccount.name}`,
                sequenceOrder: 1,
              },
              {
                accountId: paymentAccount.id,
                debitAmount: 0,
                creditAmount: expenseAmount.toNumber(),
                lineNarration: `Paid from ${paymentAccount.name}`,
                sequenceOrder: 2,
              },
            ],
          },
        },
        include: {
          journalEntries: {
            include: { account: true },
          },
        },
      });

      // 6. Update Account Current Balances
      const newExpenseBalance = applyTransactionToBalance(
        expenseAccount.group.nature as any,
        expenseAccount.currentBalance.toString(),
        expenseAmount,
        new Decimal(0),
      );

      await tx.ledgerAccount.update({
        where: { id: expenseAccount.id },
        data: { currentBalance: newExpenseBalance.toNumber() },
      });

      const newPaymentBalance = applyTransactionToBalance(
        paymentAccount.group.nature as any,
        paymentAccount.currentBalance.toString(),
        new Decimal(0),
        expenseAmount,
      );

      await tx.ledgerAccount.update({
        where: { id: paymentAccount.id },
        data: { currentBalance: newPaymentBalance.toNumber() },
      });

      // 7. Audit Log
      await this.audit.record(
        {
          organizationId: tenant.organizationId,
          companyId: tenant.companyId,
          userId: tenant.userId || "00000000-0000-0000-0000-000000000000",
          action: "POST_EXPENSE_VOUCHER",
          entityName: "Voucher",
          entityId: voucher.id,
          newState: {
            voucherNumber,
            expenseAccountId: expenseAccount.id,
            amount: expenseAmount.toNumber(),
          },
        },
        tx,
      );

      return voucher;
    });
  }
}
