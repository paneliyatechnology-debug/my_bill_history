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
          allocations: { include: { salesInvoice: true } },
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

      // Put settled sales invoices back when a receipt is reversed.
      for (const alloc of original.allocations || []) {
        const inv = alloc.salesInvoice;
        if (!inv || inv.status === "CANCELLED") continue;
        const applied = toMoney(alloc.allocatedAmount).plus(
          toMoney(alloc.cashDiscount),
        );
        let newPaid = toMoney(inv.paidAmount).minus(applied);
        if (newPaid.lessThan(0)) newPaid = new Decimal(0);
        const newBalance = toMoney(inv.balanceAmount).plus(applied);
        const newStatus = newBalance.lessThanOrEqualTo(0)
          ? "PAID"
          : newPaid.greaterThan(0)
            ? "PARTIALLY_PAID"
            : "ISSUED";
        await tx.salesInvoice.update({
          where: { id: inv.id },
          data: {
            paidAmount: newPaid.toNumber(),
            balanceAmount: newBalance.toNumber(),
            status: newStatus as any,
          },
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
                include: {
                  group: true,
                  party: { select: { id: true, name: true } },
                },
              },
            },
            orderBy: { sequenceOrder: "asc" },
          },
          allocations: {
            include: {
              salesInvoice: {
                select: {
                  id: true,
                  invoiceNumber: true,
                  invoiceDate: true,
                  grandTotal: true,
                  balanceAmount: true,
                  paidAmount: true,
                  partyId: true,
                },
              },
            },
          },
        },
      });

      if (!voucher) {
        throw new NotFoundException(`Voucher '${id}' not found.`);
      }

      return {
        ...voucher,
        ...shapeReceipt(voucher),
      };
    });
  }

  /**
   * Payment In list: receipt vouchers with party, settled amount, and mode.
   */
  async listReceipts(
    tenant: TenantContext,
    query?: {
      startDate?: string;
      endDate?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<any> {
    return await this.prisma.executeInTenantContext(tenant, async (tx) => {
      const page = Math.max(1, Number(query?.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(query?.limit) || 50));
      const skip = (page - 1) * limit;

      const where: any = {
        companyId: tenant.companyId,
        voucherType: "RECEIPT",
      };

      if (query?.startDate || query?.endDate) {
        where.voucherDate = {};
        if (query.startDate) where.voucherDate.gte = new Date(query.startDate);
        if (query.endDate) {
          const end = new Date(query.endDate);
          if (/^\d{4}-\d{2}-\d{2}$/.test(query.endDate)) {
            end.setUTCHours(23, 59, 59, 999);
          }
          where.voucherDate.lte = end;
        }
      }

      if (query?.search && query.search.trim() !== "") {
        const s = query.search.trim();
        where.OR = [
          { voucherNumber: { contains: s, mode: "insensitive" } },
          { narration: { contains: s, mode: "insensitive" } },
          { referenceNo: { contains: s, mode: "insensitive" } },
          {
            journalEntries: {
              some: {
                account: {
                  OR: [
                    { name: { contains: s, mode: "insensitive" } },
                    {
                      party: {
                        name: { contains: s, mode: "insensitive" },
                      },
                    },
                  ],
                },
              },
            },
          },
        ];
      }

      const receiptInclude = {
        journalEntries: {
          include: {
            account: {
              select: {
                id: true,
                name: true,
                partyId: true,
                isPartyLedger: true,
                isCashLedger: true,
                isBankLedger: true,
                party: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { sequenceOrder: "asc" as const },
        },
        allocations: true,
      };

      const [rows, total] = await Promise.all([
        tx.voucher.findMany({
          where,
          include: receiptInclude,
          orderBy: [{ voucherDate: "desc" }, { createdAt: "desc" }],
          skip,
          take: limit,
        }),
        tx.voucher.count({ where }),
      ]);

      const fyId =
        tenant.financialYearId ||
        (
          await tx.financialYear.findFirst({
            where: { companyId: tenant.companyId, isCurrent: true },
            select: { id: true },
          })
        )?.id;

      let nextNumber = "1";
      if (fyId) {
        const numbered = await tx.voucher.findMany({
          where: {
            companyId: tenant.companyId,
            financialYearId: fyId,
            voucherType: "RECEIPT",
          },
          select: { voucherNumber: true },
        });
        nextNumber = String(maxNumericReceiptNumber(numbered) + 1);
      }

      return {
        data: rows.map((row) => shapeReceipt(row)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        nextNumber,
      };
    });
  }

  /**
   * Post Receipt Voucher with Bill Matching (Payment Allocation against Sales Invoices)
   */
  async createReceiptVoucher(
    dto: CreateReceiptVoucherDto,
    tenant: TenantContext,
  ): Promise<any> {
    const paymentMode = normalizePaymentMode(dto.paymentMode);

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

      // 5. Validate Allocations (optional: unallocated balance stays as party advance)
      let totalSettled = new Decimal(0);
      let totalCashDiscount = new Decimal(0);
      const invoiceUpdates: Array<{
        invoice: any;
        settled: Decimal;
        discount: Decimal;
      }> = [];

      const seenInvoices = new Set<string>();
      for (const alloc of dto.allocations || []) {
        if (seenInvoices.has(alloc.invoiceId)) {
          throw new BadRequestException(
            "The same invoice cannot be settled twice on one receipt.",
          );
        }
        seenInvoices.add(alloc.invoiceId);
        const inv = await tx.salesInvoice.findFirst({
          where: { id: alloc.invoiceId, companyId: tenant.companyId },
        });
        if (!inv) {
          throw new NotFoundException(
            `Sales invoice '${alloc.invoiceId}' not found.`,
          );
        }
        if (inv.partyId !== party.id) {
          throw new BadRequestException(
            `Invoice '${inv.invoiceNumber}' belongs to a different party.`,
          );
        }
        if (
          inv.status !== "ISSUED" &&
          inv.status !== "PARTIALLY_PAID" &&
          inv.status !== "OVERDUE"
        ) {
          throw new BadRequestException(
            `Invoice '${inv.invoiceNumber}' is already ${inv.status} and cannot receive payments.`,
          );
        }
        const settled = toMoney(alloc.settledAmount);
        const discount = toMoney(alloc.cashDiscountGiven || 0);
        const allocTotal = settled.plus(discount);
        if (allocTotal.lessThanOrEqualTo(0)) continue;
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

      if (totalSettled.greaterThan(receivedAmount)) {
        throw new BadRequestException(
          `Sum of allocated settled amounts (₹${totalSettled.toString()}) cannot exceed received amount (₹${receivedAmount.toString()}). Record the extra as a smaller receipt or leave it unallocated as an advance.`,
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
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(hashtext(${`receipt:${tenant.companyId}:${fy.id}`})::bigint)
      `;
      const numbered = await tx.voucher.findMany({
        where: {
          companyId: tenant.companyId,
          financialYearId: fy.id,
          voucherType: "RECEIPT",
        },
        select: { voucherNumber: true },
      });
      const voucherNumber = String(maxNumericReceiptNumber(numbered) + 1);
      const voucher = await tx.voucher.create({
        data: {
          organizationId: tenant.organizationId,
          companyId: tenant.companyId,
          financialYearId: fy.id,
          voucherType: "RECEIPT" as any,
          voucherNumber,
          voucherDate: vDate,
          referenceNo: dto.paymentReference || null,
          paymentMode,
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

const RECEIPT_PAYMENT_MODES = ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE"] as const;

function normalizePaymentMode(mode?: string): string {
  const value = (mode || "CASH").trim().toUpperCase().replace(/\s+/g, "_");
  const aliases: Record<string, string> = {
    UPI_QR: "UPI",
    ONLINE: "UPI",
    BANK: "BANK_TRANSFER",
    NETBANKING: "BANK_TRANSFER",
  };
  const normalized = aliases[value] || value;
  if (!RECEIPT_PAYMENT_MODES.includes(normalized as (typeof RECEIPT_PAYMENT_MODES)[number])) {
    throw new BadRequestException(
      "Payment mode must be Cash, UPI, Bank Transfer, or Cheque.",
    );
  }
  return normalized;
}

function paymentModeLabel(mode?: string | null): string {
  switch (mode) {
    case "CASH":
      return "Cash";
    case "UPI":
    case "UPI_QR":
      return "UPI";
    case "BANK_TRANSFER":
      return "Bank Transfer";
    case "CHEQUE":
      return "Cheque";
    case "CREDIT_NOTE":
      return "Credit Note";
    case "SPLIT":
      return "Split";
    default:
      return mode ? mode.replace(/_/g, " ") : "Cash";
  }
}

function maxNumericReceiptNumber(rows: Array<{ voucherNumber: string }>): number {
  let max = 0;
  for (const row of rows) {
    if (/^\d+$/.test(row.voucherNumber)) {
      max = Math.max(max, Number(row.voucherNumber));
    }
  }
  return max;
}

function moneyNumber(value: any): number {
  const n = Number(value?.toString?.() ?? value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function shapeReceipt(voucher: any) {
  const entries = voucher.journalEntries || [];
  const partyEntry = entries.find(
    (entry: any) =>
      moneyNumber(entry.creditAmount) > 0 &&
      (entry.account?.partyId || entry.account?.isPartyLedger || entry.account?.party),
  );
  const cashDebits = entries.filter(
    (entry: any) =>
      moneyNumber(entry.debitAmount) > 0 &&
      (entry.account?.isCashLedger || entry.account?.isBankLedger),
  );
  const otherDebits = entries.filter(
    (entry: any) =>
      moneyNumber(entry.debitAmount) > 0 &&
      entry.account?.name !== "Discount Allowed" &&
      entry.account?.name !== "Cash Discount Allowed",
  );
  const receivedLines = cashDebits.length > 0 ? cashDebits : otherDebits;
  const amountReceived = receivedLines.reduce(
    (sum: number, entry: any) => sum + moneyNumber(entry.debitAmount),
    0,
  );
  const allocations = voucher.allocations || [];
  const totalSettled = allocations.reduce(
    (sum: number, alloc: any) =>
      sum + moneyNumber(alloc.allocatedAmount) + moneyNumber(alloc.cashDiscount),
    0,
  );
  let paymentMode = voucher.paymentMode || null;
  if (!paymentMode) {
    if (cashDebits.some((entry: any) => entry.account?.isCashLedger)) {
      paymentMode = "CASH";
    } else if (cashDebits.some((entry: any) => entry.account?.isBankLedger)) {
      paymentMode = "BANK_TRANSFER";
    } else {
      paymentMode = "CASH";
    }
  }

  return {
    id: voucher.id,
    paymentNumber: voucher.voucherNumber,
    paymentDate: voucher.voucherDate,
    partyId: partyEntry?.account?.partyId || partyEntry?.account?.party?.id || null,
    partyName: partyEntry?.account?.party?.name || partyEntry?.account?.name || "—",
    totalSettled,
    amountReceived,
    paymentMode,
    paymentModeLabel: paymentModeLabel(paymentMode),
    narration: voucher.narration,
    referenceNo: voucher.referenceNo,
    isCancelled: voucher.isCancelled,
    createdAt: voucher.createdAt,
  };
}
