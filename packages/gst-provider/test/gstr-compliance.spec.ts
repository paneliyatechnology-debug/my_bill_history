import { describe, expect, it } from "vitest";
import {
  assertItcReview,
  buildGstr1,
  buildGstr3b,
  matchGstr2bDocuments,
  parseGstr2bFile,
  resolveGstCredentials,
  resolveReportPeriod,
  settleItc,
} from "../src";

const taxed = {
  invoiceNumber: "INV/1",
  invoiceDate: "2026-04-15",
  grandTotal: "1180.00",
  taxableAmount: "1000.00",
  cgstAmount: "90.00",
  sgstAmount: "90.00",
  igstAmount: "0.00",
  cessAmount: "0.00",
  roundOff: "0.00",
  placeOfSupply: "24",
  partyGstin: "24AAAAA0000A1Z5",
  items: [
    {
      hsnCode: "1701",
      quantity: "10",
      taxableAmount: "1000.00",
      taxRate: "18",
      cgstAmount: "90.00",
      sgstAmount: "90.00",
      igstAmount: "0.00",
      totalAmount: "1180.00",
    },
  ],
};

describe("GSTR return preparation", () => {
  it("keeps intra-state tax, B2CL threshold, nil supplies, and April boundaries apart", () => {
    const prepared = buildGstr1({
      companyStateCode: "24",
      period: { month: 4, year: 2026 },
      invoices: [
        taxed,
        {
          ...taxed,
          invoiceNumber: "INV/2",
          invoiceDate: "2026-05-01",
          partyGstin: null,
          placeOfSupply: "27",
          grandTotal: "300000.00",
          taxableAmount: "254237.29",
          cgstAmount: "0",
          sgstAmount: "0",
          igstAmount: "45762.71",
        },
        {
          ...taxed,
          invoiceNumber: "NIL/1",
          partyGstin: null,
          taxableAmount: "500.00",
          cgstAmount: "0",
          sgstAmount: "0",
          igstAmount: "0",
          grandTotal: "500.00",
          items: [
            {
              ...taxed.items[0],
              taxRate: "0",
              taxableAmount: "500.00",
              cgstAmount: "0",
              sgstAmount: "0",
              igstAmount: "0",
              totalAmount: "500.00",
            },
          ],
        },
        {
          ...taxed,
          invoiceNumber: "B2C/1",
          partyGstin: null,
          grandTotal: "118.00",
          taxableAmount: "100.00",
          cgstAmount: "9.00",
          sgstAmount: "9.00",
          items: [
            {
              ...taxed.items[0],
              taxableAmount: "100.00",
              cgstAmount: "9.00",
              sgstAmount: "9.00",
              totalAmount: "118.00",
              quantity: "1",
            },
          ],
        },
      ],
      creditNotes: [
        {
          ...taxed,
          noteNumber: "CN/1",
          noteDate: "2026-04-20",
          noteType: "C",
          grandTotal: "118.00",
          taxableAmount: "100.00",
          cgstAmount: "9.00",
          sgstAmount: "9.00",
          items: [
            {
              ...taxed.items[0],
              quantity: "1",
              taxableAmount: "100.00",
              cgstAmount: "9.00",
              sgstAmount: "9.00",
              totalAmount: "118.00",
            },
          ],
        },
      ],
    });

    expect(prepared.filingStatus).toBe("NOT_FILED");
    expect(prepared.b2b).toHaveLength(1);
    expect(prepared.b2b[0].inv[0].itms[0].itm_det.iamt).toBe(0);
    expect(prepared.b2b[0].inv[0].itms[0].itm_det.camt).toBe(90);
    expect(prepared.b2cl).toHaveLength(0);
    expect(prepared.nil.rows).toHaveLength(1);
    expect(prepared.b2cs).toHaveLength(1);
    expect(prepared.cdnr).toHaveLength(1);
    expect(prepared.hsn.data[0].qty).toBe("20.00");
    expect(prepared.grossTurnover).toBe("1798.00");
    expect(resolveReportPeriod({ month: 4, year: 2026 })).toEqual({
      from: "2026-04-01",
      to: "2026-04-30",
    });
  });

  it("does not claim ITC from books alone and does not clamp excess credit notes to zero", () => {
    const summary = buildGstr3b({
      invoices: [taxed],
      creditNotes: [
        {
          ...taxed,
          noteNumber: "CN/BIG",
          noteDate: "2026-04-21",
          noteType: "C",
          taxableAmount: "2000.00",
          cgstAmount: "180.00",
          sgstAmount: "180.00",
          grandTotal: "2360.00",
        },
      ],
      purchases: [
        {
          id: "p1",
          invoiceDate: "2026-04-10",
          taxableAmount: "1000.00",
          cgstAmount: "90.00",
          sgstAmount: "90.00",
          igstAmount: "0",
          itcEligibility: "INPUT",
        },
      ],
      acceptedPurchaseIds: [],
    });

    expect(summary.table3_1_outwardSupplies.taxableValue).toBe("-1000.00");
    expect(summary.table3_1_outwardSupplies.cgst).toBe("-90.00");
    expect(summary.table6_1_paymentOfTax.creditNotesExceedOutward).toBe(true);
    expect(summary.table4_eligibleItc.booksNetItc.cgst).toBe("90.00");
    expect(summary.table4_eligibleItc.netItcAvailable.cgst).toBe("0.00");
    expect(summary.table6_1_paymentOfTax.netPayableCgst).toBe("0.00");
    expect(summary.filingStatus).toBe("NOT_FILED");
  });

  it("uses accepted review rows only when reducing draft tax payable", () => {
    const summary = buildGstr3b({
      invoices: [taxed],
      purchases: [
        {
          id: "p1",
          invoiceDate: "2026-04-10",
          taxableAmount: "1000.00",
          cgstAmount: "90.00",
          sgstAmount: "90.00",
          igstAmount: "0",
          itcEligibility: "INPUT",
        },
      ],
      acceptedPurchaseIds: ["p1"],
    });
    expect(summary.table6_1_paymentOfTax.signedNetCgst).toBe("0.00");
    expect(summary.table6_1_paymentOfTax.netPayableCgst).toBe("0.00");
  });
});

describe("GSTR-2B matching", () => {
  const book = {
    id: "book-1",
    supplierGstin: "24AAAAA0000A1Z5",
    documentNumber: "INV/001",
    documentDate: "2026-04-02",
    documentType: "INVOICE" as const,
    taxableValue: "1000.00",
    cgst: "90.00",
    sgst: "90.00",
    igst: "0.00",
  };

  it("classifies match, partial, missing, duplicate, and mismatch without claiming ITC", () => {
    const matches = matchGstr2bDocuments(
      [
        book,
        { ...book, id: "book-2", documentNumber: "PARTIAL-1", taxableValue: "1005.00" },
        { ...book, id: "book-3", documentNumber: "MISS-1" },
        { ...book, id: "book-4", documentNumber: "DUP-1" },
        { ...book, id: "book-5", documentNumber: "DUP-1" },
        { ...book, id: "book-6", documentNumber: "BAD-1", taxableValue: "5000.00" },
      ],
      [
        { ...book, id: "portal-1", documentNumber: "inv-001" },
        { ...book, id: "portal-2", documentNumber: "PARTIAL/1", documentDate: "2026-04-04" },
        { ...book, id: "portal-3", documentNumber: "ONLY-PORTAL" },
        { ...book, id: "portal-4", documentNumber: "DUP-1" },
        { ...book, id: "portal-5", documentNumber: "BAD-1" },
      ],
    );
    const byBook = new Map(matches.filter((row) => row.bookId).map((row) => [row.bookId, row.status]));
    expect(byBook.get("book-1")).toBe("MATCHED");
    expect(matches.find((row) => row.bookId === "book-1")?.explanation.itcClaim).toBe("NOT_DECIDED");
    expect(byBook.get("book-2")).toBe("PARTIAL_MATCH");
    expect(byBook.get("book-3")).toBe("MISSING_IN_GSTR2B");
    expect(byBook.get("book-4")).toBe("DUPLICATE");
    expect(byBook.get("book-6")).toBe("MISMATCH");
    expect(matches.some((row) => row.portalId === "portal-3" && row.status === "MISSING_IN_BOOKS")).toBe(true);
  });

  it("rejects an invalid portal file and parses a valid B2B invoice", () => {
    const invalid = parseGstr2bFile("{", "gstr2b.json");
    expect(invalid.ok).toBe(false);
    const parsed = parseGstr2bFile(
      JSON.stringify({
        data: {
          gstin: "24AAAAA0000A1Z5",
          rtnprd: "042026",
          docdata: {
            b2b: [
              {
                ctin: "27AAAAA0000A1Z5",
                trdnm: "Supplier",
                inv: [
                  {
                    inum: "A/1",
                    dt: "02-04-2026",
                    val: 1180,
                    itcavl: "Y",
                    itms: [{ txval: 1000, cgst: 90, sgst: 90, igst: 0, cess: 0 }],
                  },
                ],
              },
            ],
          },
        },
      }),
    );
    expect(parsed.ok).toBe(true);
    expect(parsed.lines[0].normalizedInvoiceNumber).toBe("A1");
    expect(parsed.lines[0].portalItcFlag).toBe("Y");
    expect(parsed.returnPeriod).toBe("042026");
  });
});

describe("supply categories, UTGST, and ITC settlement", () => {
  const line = (category: string, taxable = "1000.00") => ({
    hsnCode: "9983",
    quantity: "1",
    taxableAmount: taxable,
    taxRate: category === "TAXABLE" ? "18" : "0",
    cgstAmount: "0.00",
    sgstAmount: "0.00",
    utgstAmount: category === "TAXABLE" ? "90.00" : "0.00",
    igstAmount: "0.00",
    totalAmount: taxable,
    supplyCategory: category,
  });

  it("separates nil, exempt, and non-GST supplies and puts UTGST inside samt", () => {
    const prepared = buildGstr1({
      companyStateCode: "38",
      invoices: [
        { ...taxed, invoiceNumber: "NIL-1", partyGstin: null, placeOfSupply: "38", taxableAmount: "500.00", grandTotal: "500.00", cgstAmount: "0", sgstAmount: "0", items: [line("NIL_RATED", "500.00")] },
        { ...taxed, invoiceNumber: "EX-1", partyGstin: null, placeOfSupply: "38", taxableAmount: "400.00", grandTotal: "400.00", cgstAmount: "0", sgstAmount: "0", items: [line("EXEMPT", "400.00")] },
        { ...taxed, invoiceNumber: "NG-1", partyGstin: null, placeOfSupply: "38", taxableAmount: "300.00", grandTotal: "300.00", cgstAmount: "0", sgstAmount: "0", items: [line("NON_GST", "300.00")] },
        { ...taxed, invoiceNumber: "UT-1", placeOfSupply: "38", cgstAmount: "90.00", sgstAmount: "0.00", utgstAmount: "90.00", items: [line("TAXABLE")] },
      ],
    });
    const nil = prepared.nil.rows.find((row) => row.pos === "38");
    expect(nil.nil_amt).toBe("500.00");
    expect(nil.expt_amt).toBe("400.00");
    expect(nil.ngsup_amt).toBe("300.00");
    const utItem = prepared.b2b[0].inv[0].itms[0].itm_det;
    expect(utItem.samt).toBe(90);
    expect(utItem.utgstIncludedInSamt).toBe(90);
    expect(prepared.totalUtgst).toBe("90.00");
  });

  it("does not invent an IGST cross-utilization order and keeps CGST off SGST", () => {
    const undecided = settleItc({
      liability: { igst: 0, cgst: 100, sgst: 100, utgst: 0, cess: 0 },
      acceptedItc: { igst: 80, cgst: 10, sgst: 0, utgst: 0, cess: 0 },
    });
    expect(undecided.igstCreditAllocationRequired).toBe(true);
    expect(undecided.cashPayable.cgst).toBe("90.00");
    expect(undecided.cashPayable.sgst).toBe("100.00");

    const allocated = settleItc({
      liability: { igst: 0, cgst: 100, sgst: 100, utgst: 0, cess: 0 },
      acceptedItc: { igst: 80, cgst: 10, sgst: 0, utgst: 0, cess: 0 },
      igstCreditAllocation: { cgst: 50, stateOrUt: 30 },
    });
    expect(allocated.igstCreditAllocationRequired).toBe(false);
    expect(allocated.cashPayable.cgst).toBe("40.00");
    expect(allocated.cashPayable.sgst).toBe("70.00");
  });

  it("accepts ITC review only for matched or partial rows", () => {
    expect(assertItcReview("MISSING_IN_GSTR2B", "ACCEPTED")).toContain("not accepted");
    expect(assertItcReview("MISMATCH", "ACCEPTED")).toContain("not accepted");
    expect(assertItcReview("MATCHED", "ACCEPTED")).toBeNull();
    expect(assertItcReview("PARTIAL_MATCH", "REJECTED")).toBeNull();
  });

  it("keeps service advances in Table 11 and does not tax goods advances", () => {
    const prepared = buildGstr1({
      companyStateCode: "24",
      invoices: [],
      advances: [
        {
          receiptNumber: "ADV-S",
          receiptDate: "2026-04-10",
          supplyKind: "SERVICES",
          placeOfSupply: "24",
          taxableAmount: "1000",
          cgstAmount: "90",
          sgstAmount: "90",
          igstAmount: "0",
          adjustedTaxable: "200",
        },
        {
          receiptNumber: "ADV-G",
          receiptDate: "2026-04-11",
          supplyKind: "GOODS",
          placeOfSupply: "24",
          taxableAmount: "5000",
          cgstAmount: "0",
          sgstAmount: "0",
          igstAmount: "0",
        },
      ],
    });
    expect(prepared.table11Advances.servicesReceived[0].taxableValue).toBe("800.00");
    expect(prepared.table11Advances.goodsNotTaxedOnReceipt).toEqual(["ADV-G"]);
  });
});

describe("GST credential gate", () => {
  it("blocks production until it is explicitly enabled and refuses missing secrets", () => {
    const blocked = resolveGstCredentials({
      environment: "PRODUCTION",
      productionEnabled: false,
      gstin: "24AAAAA0000A1Z5",
      clientId: "id",
      username: "user",
      clientSecret: "secret",
      password: "password",
    });
    expect(blocked.ok).toBe(false);
    expect(blocked.code).toBe("PRODUCTION_NOT_ENABLED");

    const missing = resolveGstCredentials({
      environment: "SANDBOX",
      productionEnabled: false,
      gstin: "24AAAAA0000A1Z5",
      clientId: "id",
      username: "user",
    });
    expect(missing.code).toBe("CREDENTIALS_UNAVAILABLE");
  });
});
