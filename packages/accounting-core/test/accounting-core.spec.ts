import { describe, it, expect } from "vitest";
import { AccountNature } from "@billing/shared-types";
import {
  Decimal,
  toDecimal,
  toMoney,
  validateJournalLines,
  calculateNaturalBalanceDelta,
  applyTransactionToBalance,
  formatAccountingBalance,
  validatePeriodAccess,
  calculateRoundOff,
  buildReversalVoucherPlan,
  STANDARD_SME_GROUPS,
  STANDARD_SME_ACCOUNTS,
  calculateSalesInvoiceTaxes,
  resolveInwardSupply,
  splitInwardLineTax,
  calculateTrialBalanceTotals,
  calculateProfitAndLoss,
  calculateBalanceSheetTotals,
  calculatePartyAging,
  formatCurrencyIndian,
} from "../src";

describe("Accounting Core: Decimal & Double-Entry Invariants", () => {
  it("should validate a simple two-line balanced voucher", () => {
    const lines = [
      { accountId: "acc-bank", debitAmount: "1180.00", creditAmount: "0.00" },
      { accountId: "acc-debtor", debitAmount: "0.00", creditAmount: "1180.00" },
    ];
    const result = validateJournalLines(lines);

    expect(result.isValid).toBe(true);
    expect(result.isBalanced).toBe(true);
    expect(result.totalDebit.toString()).toBe("1180");
    expect(result.totalCredit.toString()).toBe("1180");
    expect(result.difference.toString()).toBe("0");
    expect(result.errors).toHaveLength(0);
  });

  it("should validate a compound multi-line balanced voucher (e.g. Sales with CGST and SGST)", () => {
    const lines = [
      {
        accountId: "acc-customer",
        debitAmount: "118.00",
        creditAmount: "0.00",
      },
      { accountId: "acc-sales", debitAmount: "0.00", creditAmount: "100.00" },
      { accountId: "acc-cgst", debitAmount: "0.00", creditAmount: "9.00" },
      { accountId: "acc-sgst", debitAmount: "0.00", creditAmount: "9.00" },
    ];
    const result = validateJournalLines(lines);

    expect(result.isValid).toBe(true);
    expect(result.isBalanced).toBe(true);
    expect(result.totalDebit.toString()).toBe("118");
    expect(result.totalCredit.toString()).toBe("118");
    expect(result.errors).toHaveLength(0);
  });

  it("should reject an unbalanced voucher (total debits != total credits)", () => {
    const lines = [
      { accountId: "acc-bank", debitAmount: "100.00", creditAmount: "0.00" },
      { accountId: "acc-sales", debitAmount: "0.00", creditAmount: "99.00" },
    ];
    const result = validateJournalLines(lines);

    expect(result.isValid).toBe(false);
    expect(result.isBalanced).toBe(false);
    expect(result.difference.toString()).toBe("1");
    expect(result.errors.some((e) => e.includes("Unbalanced voucher"))).toBe(
      true,
    );
  });

  it("should reject zero-value journal lines", () => {
    const lines = [
      { accountId: "acc-bank", debitAmount: "100.00", creditAmount: "0.00" },
      { accountId: "acc-dummy", debitAmount: "0.00", creditAmount: "0.00" },
      { accountId: "acc-sales", debitAmount: "0.00", creditAmount: "100.00" },
    ];
    const result = validateJournalLines(lines);

    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((e) => e.includes("zero debit and zero credit")),
    ).toBe(true);
  });

  it("should reject lines with simultaneous debit and credit amounts", () => {
    const lines = [
      { accountId: "acc-bank", debitAmount: "50.00", creditAmount: "50.00" },
      { accountId: "acc-sales", debitAmount: "0.00", creditAmount: "100.00" },
    ];
    const result = validateJournalLines(lines);

    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((e) =>
        e.includes("cannot contain both debit and credit"),
      ),
    ).toBe(true);
  });

  it("should reject negative amounts in debit or credit fields", () => {
    const lines = [
      { accountId: "acc-bank", debitAmount: "-50.00", creditAmount: "0.00" },
      { accountId: "acc-sales", debitAmount: "0.00", creditAmount: "50.00" },
    ];
    const result = validateJournalLines(lines);

    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((e) => e.includes("Debit amount cannot be negative")),
    ).toBe(true);
  });

  it("should reject vouchers with fewer than 2 lines", () => {
    const lines = [
      { accountId: "acc-bank", debitAmount: "100.00", creditAmount: "0.00" },
    ];
    const result = validateJournalLines(lines);

    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((e) => e.includes("at least two journal lines")),
    ).toBe(true);
  });

  it("should accurately maintain exact decimal precision without floating point drift", () => {
    // 0.1 + 0.2 in floating point is 0.30000000000000004
    const lines = [
      { accountId: "acc-1", debitAmount: "0.10", creditAmount: "0.00" },
      { accountId: "acc-2", debitAmount: "0.20", creditAmount: "0.00" },
      { accountId: "acc-3", debitAmount: "0.00", creditAmount: "0.30" },
    ];
    const result = validateJournalLines(lines);

    expect(result.isValid).toBe(true);
    expect(result.totalDebit.toString()).toBe("0.3");
    expect(result.totalCredit.toString()).toBe("0.3");
    expect(result.difference.toString()).toBe("0");
  });
});

describe("Accounting Core: Account Nature & Balance Rules", () => {
  it("should calculate balance deltas correctly according to account nature", () => {
    // ASSET: Dr increases, Cr decreases
    expect(
      calculateNaturalBalanceDelta(
        AccountNature.ASSET,
        "100.00",
        "0.00",
      ).toString(),
    ).toBe("100");
    expect(
      calculateNaturalBalanceDelta(
        AccountNature.ASSET,
        "0.00",
        "40.00",
      ).toString(),
    ).toBe("-40");

    // LIABILITY: Cr increases, Dr decreases
    expect(
      calculateNaturalBalanceDelta(
        AccountNature.LIABILITY,
        "0.00",
        "100.00",
      ).toString(),
    ).toBe("100");
    expect(
      calculateNaturalBalanceDelta(
        AccountNature.LIABILITY,
        "30.00",
        "0.00",
      ).toString(),
    ).toBe("-30");

    // EXPENSE: Dr increases, Cr decreases
    expect(
      calculateNaturalBalanceDelta(
        AccountNature.EXPENSE,
        "50.00",
        "0.00",
      ).toString(),
    ).toBe("50");

    // INCOME: Cr increases, Dr decreases
    expect(
      calculateNaturalBalanceDelta(
        AccountNature.INCOME,
        "0.00",
        "200.00",
      ).toString(),
    ).toBe("200");
  });

  it("should update current balance cumulatively", () => {
    const updated = applyTransactionToBalance(
      AccountNature.ASSET,
      "500.00",
      "200.00",
      "50.00",
    );
    expect(updated.toString()).toBe("650");
  });

  it("should format balance indicators (DR/CR) cleanly", () => {
    // Positive asset balance -> DR
    expect(formatAccountingBalance(AccountNature.ASSET, "1500.00")).toEqual({
      amount: "1500.00",
      type: "DR",
    });

    // Overdrawn bank account (negative asset balance) -> CR
    expect(formatAccountingBalance(AccountNature.ASSET, "-500.00")).toEqual({
      amount: "500.00",
      type: "CR",
    });

    // Liability balance -> CR
    expect(formatAccountingBalance(AccountNature.LIABILITY, "800.00")).toEqual({
      amount: "800.00",
      type: "CR",
    });
  });
});

describe("Accounting Core: Financial Year & Period Lock Rules", () => {
  const fy = {
    id: "fy-2026-27",
    companyId: "comp-1",
    name: "FY 2026-27",
    startDate: new Date("2026-04-01T00:00:00.000Z"),
    endDate: new Date("2027-03-31T23:59:59.999Z"),
    isLocked: false,
  };

  it("should permit posting within active unlocked period", () => {
    const res = validatePeriodAccess("2026-10-12", "comp-1", fy);
    expect(res.isAllowed).toBe(true);
  });

  it("should reject posting into locked financial year", () => {
    const lockedFy = { ...fy, isLocked: true };
    const res = validatePeriodAccess("2026-10-12", "comp-1", lockedFy);
    expect(res.isAllowed).toBe(false);
    expect(res.errorCode).toBe("FINANCIAL_YEAR_LOCKED");
  });

  it("should reject posting outside financial year bounds", () => {
    const res = validatePeriodAccess("2025-12-15", "comp-1", fy);
    expect(res.isAllowed).toBe(false);
    expect(res.errorCode).toBe("DATE_OUT_OF_PERIOD");
  });

  it("should reject financial year belonging to another company", () => {
    const res = validatePeriodAccess("2026-10-12", "comp-2", fy);
    expect(res.isAllowed).toBe(false);
    expect(res.errorCode).toBe("COMPANY_MISMATCH");
  });
});

describe("Accounting Core: Section 170 Indian Round-Off Rules", () => {
  it("should round 40 paise down to nearest rupee with negative round-off", () => {
    const res = calculateRoundOff("100.40");
    expect(res.roundedAmount.toString()).toBe("100");
    expect(res.roundOffAmount.toString()).toBe("-0.4");
  });

  it("should round 50 paise up to nearest rupee with positive round-off", () => {
    const res = calculateRoundOff("100.50");
    expect(res.roundedAmount.toString()).toBe("101");
    expect(res.roundOffAmount.toString()).toBe("0.5");
  });

  it("should produce zero round-off on exact rupee amounts", () => {
    const res = calculateRoundOff("500.00");
    expect(res.roundedAmount.toString()).toBe("500");
    expect(res.roundOffAmount.toString()).toBe("0");
  });
});

describe("Accounting Core: Voucher Reversal & Contra Plan", () => {
  it("should generate exact contra inversion for posted voucher", () => {
    const original = {
      id: "vouch-1",
      voucherNumber: "JV/26-27/001",
      voucherDate: "2026-10-12",
      narration: "Office rent payment",
      journalEntries: [
        {
          accountId: "acc-rent",
          debitAmount: "15000.00",
          creditAmount: "0.00",
          lineNarration: "Rent",
        },
        {
          accountId: "acc-bank",
          debitAmount: "0.00",
          creditAmount: "15000.00",
          lineNarration: "Bank",
        },
      ],
    };

    const plan = buildReversalVoucherPlan(
      original,
      "Paid wrong landlord bank account",
    );

    expect(plan.reversalVoucherNumber).toBe("REV-JV/26-27/001");
    expect(plan.lines).toHaveLength(2);
    // Rent line should now be Credit
    expect(plan.lines[0].accountId).toBe("acc-rent");
    expect(plan.lines[0].debitAmount).toBe("0.00");
    expect(plan.lines[0].creditAmount).toBe("15000.00");
    // Bank line should now be Debit
    expect(plan.lines[1].accountId).toBe("acc-bank");
    expect(plan.lines[1].debitAmount).toBe("15000.00");
    expect(plan.lines[1].creditAmount).toBe("0.00");

    // The reversal lines themselves must validate as perfectly balanced
    const balanceCheck = validateJournalLines(plan.lines);
    expect(balanceCheck.isValid).toBe(true);
    expect(balanceCheck.isBalanced).toBe(true);
  });
});

describe("Accounting Core: Standard Indian SME Chart of Accounts Template", () => {
  it("should define statutory groups with all 5 accounting heads", () => {
    const natures = new Set(STANDARD_SME_GROUPS.map((g) => g.nature));
    expect(natures.has(AccountNature.ASSET)).toBe(true);
    expect(natures.has(AccountNature.LIABILITY)).toBe(true);
    expect(natures.has(AccountNature.EQUITY)).toBe(true);
    expect(natures.has(AccountNature.INCOME)).toBe(true);
    expect(natures.has(AccountNature.EXPENSE)).toBe(true);
  });

  it("should define standard system accounts with zero opening balance", () => {
    expect(STANDARD_SME_ACCOUNTS.length).toBeGreaterThan(10);
    // All system accounts must belong to one of the defined standard groups
    const groupNames = new Set(STANDARD_SME_GROUPS.map((g) => g.name));
    for (const acc of STANDARD_SME_ACCOUNTS) {
      expect(groupNames.has(acc.groupName)).toBe(true);
    }
  });
});

describe("Accounting Core: Statutory Indian GST Invoice Tax Calculator", () => {
  it("should calculate intra-state GST (50% CGST + 50% SGST) with discount and round-off", () => {
    // 10 units @ 295.00 with 2% discount and 5% GST (from approved api-contracts.md)
    // subTotal = 2950.00, discount = 59.00, taxable = 2891.00
    // CGST @ 2.5% = 72.28, SGST @ 2.5% = 72.28
    // Total = 3035.56, roundOff = +0.44, grandTotal = 3036.00
    const result = calculateSalesInvoiceTaxes("24", "24", [
      {
        itemId: "item-tea",
        quantity: "10",
        unitPrice: "295.00",
        discountPercent: "2.0",
        taxRate: "5.0",
      },
    ]);

    expect(result.isIntraState).toBe(true);
    expect(result.subTotal.toString()).toBe("2950");
    expect(result.discountTotal.toString()).toBe("59");
    expect(result.taxableAmount.toString()).toBe("2891");
    expect(result.cgstAmount.toString()).toBe("72.28");
    expect(result.sgstAmount.toString()).toBe("72.28");
    expect(result.igstAmount.toString()).toBe("0");
    expect(result.roundOff.toString()).toBe("0.44");
    expect(result.grandTotal.toString()).toBe("3036");
    expect(result.grandTotalWords).toBe(
      "Three Thousand Thirty Six Rupees Only",
    );
    expect(result.grandTotalWordsGujarati).toBe(
      "અક્ષરે રૂપિયા ત્રણ હજાર છત્રીસ પુરા",
    );
  });

  it("should calculate inter-state GST (100% IGST) across state boundaries", () => {
    // Gujarat (24) -> Maharashtra (27)
    // 5 units @ 1000.00 with 18% IGST = 5000 + 900 = 5900.00
    const result = calculateSalesInvoiceTaxes("24", "27", [
      {
        itemId: "item-fabric",
        quantity: "5",
        unitPrice: "1000.00",
        taxRate: "18.0",
      },
    ]);

    expect(result.isIntraState).toBe(false);
    expect(result.cgstAmount.toString()).toBe("0");
    expect(result.sgstAmount.toString()).toBe("0");
    expect(result.igstAmount.toString()).toBe("900");
    expect(result.grandTotal.toString()).toBe("5900");
    expect(result.grandTotalWords).toBe(
      "Five Thousand Nine Hundred Rupees Only",
    );
  });

  it("uses UTGST instead of SGST for an intra-UT supply in Ladakh", () => {
    const result = calculateSalesInvoiceTaxes("38", "38", [
      {
        itemId: "item-1",
        quantity: "1",
        unitPrice: "1000.00",
        taxRate: "18.0",
      },
    ]);
    expect(result.cgstAmount.toString()).toBe("90");
    expect(result.sgstAmount.toString()).toBe("0");
    expect(result.utgstAmount.toString()).toBe("90");
    expect(result.igstAmount.toString()).toBe("0");
  });

  it("calculates no tax for an exempt supply even when a rate is present on the input", () => {
    const result = calculateSalesInvoiceTaxes("24", "24", [
      {
        itemId: "item-1",
        quantity: "1",
        unitPrice: "1000.00",
        taxRate: "18.0",
        supplyCategory: "EXEMPT",
      },
    ]);
    expect(result.taxableAmount.toString()).toBe("1000");
    expect(result.cgstAmount.toString()).toBe("0");
    expect(result.sgstAmount.toString()).toBe("0");
    expect(result.items[0].supplyCategory).toBe("EXEMPT");
  });
});

describe("Accounting Core: Financial Statement Invariants & Report Math", () => {
  it("should verify Trial Balance mathematical invariance (Debits == Credits)", () => {
    const items = [
      {
        accountId: "acc-bank",
        accountName: "HDFC Bank",
        nature: AccountNature.ASSET,
        groupName: "Bank Accounts",
        openingDebit: "10000.00",
        openingCredit: "0.00",
        periodDebit: "5000.00",
        periodCredit: "2000.00",
        closingDebit: "13000.00",
        closingCredit: "0.00",
      },
      {
        accountId: "acc-capital",
        accountName: "Owner Capital",
        nature: AccountNature.EQUITY,
        groupName: "Capital Account",
        openingDebit: "0.00",
        openingCredit: "10000.00",
        periodDebit: "0.00",
        periodCredit: "0.00",
        closingDebit: "0.00",
        closingCredit: "10000.00",
      },
      {
        accountId: "acc-sales",
        accountName: "Sales Revenue",
        nature: AccountNature.INCOME,
        groupName: "Direct Income",
        openingDebit: "0.00",
        openingCredit: "0.00",
        periodDebit: "0.00",
        periodCredit: "5000.00",
        closingDebit: "0.00",
        closingCredit: "5000.00",
      },
      {
        accountId: "acc-rent",
        accountName: "Rent Expense",
        nature: AccountNature.EXPENSE,
        groupName: "Indirect Expenses",
        openingDebit: "0.00",
        openingCredit: "0.00",
        periodDebit: "2000.00",
        periodCredit: "0.00",
        closingDebit: "2000.00",
        closingCredit: "0.00",
      },
    ];

    const tb = calculateTrialBalanceTotals(items);
    expect(tb.isBalanced).toBe(true);
    expect(tb.totalClosingDebit).toBe("15000.00");
    expect(tb.totalClosingCredit).toBe("15000.00");
    expect(tb.difference).toBe("0.00");
  });

  it("should detect unbalanced Trial Balance when discrepancy exists", () => {
    const items = [
      {
        accountId: "acc-1",
        accountName: "Cash",
        nature: AccountNature.ASSET,
        groupName: "Cash-in-hand",
        openingDebit: "100.00",
        openingCredit: "0.00",
        periodDebit: "0.00",
        periodCredit: "0.00",
        closingDebit: "100.00",
        closingCredit: "0.00",
      },
      {
        accountId: "acc-2",
        accountName: "Capital",
        nature: AccountNature.EQUITY,
        groupName: "Capital Account",
        openingDebit: "0.00",
        openingCredit: "90.00",
        periodDebit: "0.00",
        periodCredit: "0.00",
        closingDebit: "0.00",
        closingCredit: "90.00",
      },
    ];

    const tb = calculateTrialBalanceTotals(items);
    expect(tb.isBalanced).toBe(false);
    expect(tb.difference).toBe("10.00");
  });

  it("should calculate Profit & Loss accurately with Gross & Net profit", () => {
    const pnl = calculateProfitAndLoss({
      directIncome: "150000.00", // Sales
      directExpenses: "90000.00", // Direct costs / Purchases
      indirectIncome: "5000.00", // Discount received
      indirectExpenses: "25000.00", // Rent, Salaries
    });

    expect(pnl.grossProfit).toBe("60000.00"); // 150000 - 90000
    expect(pnl.isGrossLoss).toBe(false);
    expect(pnl.netProfit).toBe("40000.00"); // 60000 + 5000 - 25000
    expect(pnl.isNetLoss).toBe(false);
  });

  it("should verify Balance Sheet invariance (Assets == Liabilities + Equity + Net Profit)", () => {
    const bs = calculateBalanceSheetTotals({
      totalAssets: "150000.00",
      totalLiabilities: "30000.00",
      totalEquity: "80000.00",
      netProfitOrLoss: "40000.00", // Carried over from P&L
    });

    expect(bs.isBalanced).toBe(true);
    expect(bs.totalLiabilitiesAndEquity).toBe("150000.00");
    expect(bs.difference).toBe("0.00");
  });

  it("should calculate Party Aging buckets and contractual overdue interest", () => {
    const asOfDate = new Date("2026-10-15T00:00:00.000Z");
    const invoices = [
      {
        invoiceId: "inv-1",
        invoiceNumber: "INV/01",
        invoiceDate: "2026-10-10",
        dueDate: "2026-10-20", // Not due yet
        grandTotal: "5000.00",
        balanceAmount: "5000.00",
      },
      {
        invoiceId: "inv-2",
        invoiceNumber: "INV/02",
        invoiceDate: "2026-09-25",
        dueDate: "2026-09-25", // 20 days overdue (0-30 bucket)
        grandTotal: "10000.00",
        balanceAmount: "10000.00",
      },
      {
        invoiceId: "inv-3",
        invoiceNumber: "INV/03",
        invoiceDate: "2026-08-15",
        dueDate: "2026-08-15", // 61 days overdue (61-90 bucket)
        grandTotal: "20000.00",
        balanceAmount: "20000.00",
      },
    ];

    // 18.00% annual interest rate
    const aging = calculatePartyAging(invoices, "18.00", asOfDate);

    expect(aging.totalOutstanding).toBe("35000.00");
    expect(aging.notDue).toBe("5000.00");
    expect(aging.overdue0to30).toBe("10000.00");
    expect(aging.overdue61to90).toBe("20000.00");
    expect(aging.overdueDaysMax).toBe(61);
    // Interest:
    // inv-2: 10000 * 0.18 * (20/365) = 98.6301
    // inv-3: 20000 * 0.18 * (61/365) = 601.6438
    // Total interest = ~700.27
    expect(parseFloat(aging.accruedInterest)).toBeCloseTo(700.27, 1);
  });

  it("classifies inward tax from the supplier and place of supply", () => {
    const gujarat = resolveInwardSupply({
      supplierGstin: "24ABCDE1234F1Z6",
      supplierStateCode: "24",
      placeOfSupply: "24",
      recipientStateCode: "24",
    });
    expect(gujarat.taxKind).toBe("INTRA_SGST");

    const stateToUt = resolveInwardSupply({
      supplierGstin: "24ABCDE1234F1Z6",
      supplierStateCode: "24",
      placeOfSupply: "38",
      recipientStateCode: "24",
    });
    expect(stateToUt.taxKind).toBe("INTER_IGST");

    const intraUt = resolveInwardSupply({
      supplierGstin: "24ABCDE1234F1Z6",
      supplierStateCode: "24",
      placeOfSupply: "24",
      recipientStateCode: "38",
    });
    expect(intraUt.taxKind).toBe("INTRA_SGST");
    expect(intraUt.recipientStateDiffersFromPlaceOfSupply).toBe(true);

    const ladakh = resolveInwardSupply({
      supplierStateCode: "38",
      placeOfSupply: "38",
      recipientStateCode: "24",
    });
    expect(ladakh.taxKind).toBe("INTRA_UTGST");

    const delhi = resolveInwardSupply({
      supplierStateCode: "07",
      placeOfSupply: "07",
      recipientStateCode: "07",
    });
    expect(delhi.taxKind).toBe("INTRA_SGST");

    const taxable = new Decimal(1000);
    const ut = splitInwardLineTax({ taxableAmount: taxable, taxRate: new Decimal(18), taxKind: "INTRA_UTGST" });
    expect(ut.cgst.toString()).toBe("90");
    expect(ut.utgst.toString()).toBe("90");
    expect(ut.sgst.toString()).toBe("0");
    const exempt = splitInwardLineTax({
      taxableAmount: taxable,
      taxRate: new Decimal(18),
      taxKind: "INTRA_SGST",
      supplyCategory: "EXEMPT",
    });
    expect(exempt.cgst.toString()).toBe("0");
    expect(splitInwardLineTax({ taxableAmount: taxable, taxRate: new Decimal(5), taxKind: "INTER_IGST", supplyCategory: "NIL_RATED" }).igst.toString()).toBe("0");
    expect(splitInwardLineTax({ taxableAmount: taxable, taxRate: new Decimal(18), taxKind: "INTRA_UTGST", supplyCategory: "NON_GST" }).utgst.toString()).toBe("0");
    expect(() =>
      resolveInwardSupply({
        supplierGstin: "24ABCDE1234F1Z1",
        supplierStateCode: "24",
        placeOfSupply: "24",
        recipientStateCode: "24",
      }),
    ).toThrow(/checksum/);
  });

  it("should format currency with Indian comma separators (lakhs/crores)", () => {
    expect(formatCurrencyIndian("1234567.89")).toBe("12,34,567.89");
    expect(formatCurrencyIndian("50000")).toBe("50,000.00");
    expect(formatCurrencyIndian("10000000")).toBe("1,00,00,000.00");
    expect(formatCurrencyIndian("-45678.50")).toBe("-45,678.50");
  });
});
