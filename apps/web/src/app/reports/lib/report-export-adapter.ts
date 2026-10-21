import {
  ExportColumn,
  ExportMetadata,
  ExportFormat,
} from "../../../lib/export/export-types";
import { executeExport } from "../../../lib/export/export-engine";

export interface ReportExportParams {
  tab: string;
  reportData: any;
  startDate: string;
  endDate: string;
  company: {
    legalName?: string;
    tradeName?: string;
    gstin?: string;
    city?: string;
  };
  lang?: string;
  format: ExportFormat;
}

/**
 * Normalizes numbers safely
 */
function num(val: any): number {
  if (val === null || val === undefined) return 0;
  const clean = typeof val === "string" ? val.replace(/[₹,\s]/g, "") : val;
  const n = Number(clean);
  return isNaN(n) ? 0 : n;
}

/**
 * Format currency in Indian locale without symbol (for PDF & tables)
 */
function inr(val: any): string {
  return num(val).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Adapts all 30+ reports into standardized export structures
 * and executes genuine Excel (.xlsx), CSV (.csv), or PDF (.pdf) generation.
 */
export async function exportReportData(params: ReportExportParams): Promise<void> {
  const { tab, reportData, startDate, endDate, company, lang, format } = params;
  if (!reportData) {
    throw new Error(
      lang === "gu"
        ? "એક્સપોર્ટ કરવા માટે કોઈ ડેટા ઉપલબ્ધ નથી. કૃપા કરીને પ્રથમ રિપોર્ટ લોડ કરો."
        : "No report data available to export. Please load the report first."
    );
  }

  const companyName = company.legalName || company.tradeName || "Audit Traders Ahmedabad";
  const companyGstin = company.gstin || "";
  const companyAddress = company.city || "";

  const baseMetadata: ExportMetadata = {
    title: "",
    fileName: `${tab}_${startDate}_to_${endDate}`,
    companyName,
    companyGstin,
    companyAddress,
    dateRange: { startDate, endDate },
    generatedAt: new Date().toLocaleString("en-IN"),
  };

  // 1. SALES REGISTER & SUMMARY
  if (tab === "sales-register" || tab === "sales-summary") {
    const invoices: any[] = reportData.invoices || reportData.items || (Array.isArray(reportData) ? reportData : []);
    const columns: ExportColumn[] = [
      { header: "Invoice No", key: "invoiceNumber", type: "string" },
      { header: "Date", key: "invoiceDate", type: "date" },
      { header: "Customer Name", key: "partyName", type: "string" },
      { header: "Customer GSTIN", key: "partyGstin", type: "string" },
      { header: "Taxable Amount", key: "totalTaxable", type: "currency", align: "right" },
      { header: "CGST", key: "cgstAmount", type: "currency", align: "right" },
      { header: "SGST", key: "sgstAmount", type: "currency", align: "right" },
      { header: "IGST", key: "igstAmount", type: "currency", align: "right" },
      { header: "Grand Total", key: "grandTotal", type: "currency", align: "right" },
      { header: "Paid Amount", key: "paidAmount", type: "currency", align: "right" },
      { header: "Balance Due", key: "balanceDue", type: "currency", align: "right" },
      { header: "Status", key: "status", type: "string", align: "center" },
    ];

    const sum = reportData.summary || {};
    const metadata: ExportMetadata = {
      ...baseMetadata,
      title: "Sales Register (Outward Tax Invoices)",
      fileName: `Sales_Register_${startDate}_to_${endDate}`,
      summaryCards: [
        { label: "Total Invoices", value: sum.totalInvoices || invoices.length },
        { label: "Taxable Amount", value: `₹${inr(sum.totalTaxable || sum.taxableAmount)}` },
        { label: "Total Tax", value: `₹${inr(sum.totalTax)}` },
        { label: "Grand Total", value: `₹${inr(sum.totalGrandTotal || sum.grandTotal)}`, color: "success" },
      ],
      totals: {
        "Taxable Amount": sum.totalTaxable ?? sum.taxableAmount,
        CGST: sum.totalCgst,
        SGST: sum.totalSgst,
        IGST: sum.totalIgst,
        "Grand Total": sum.totalGrandTotal ?? sum.grandTotal,
        "Paid Amount": sum.totalPaid,
        "Balance Due": sum.totalBalance,
      },
    };

    return await executeExport(format, columns, invoices, metadata);
  }

  // 2. BILL WISE PROFIT & MARGIN
  if (tab === "bill-wise-profit") {
    const bills: any[] = reportData.invoices || (Array.isArray(reportData) ? reportData : []);
    const columns: ExportColumn[] = [
      { header: "Invoice No", key: "invoiceNumber", type: "string" },
      { header: "Invoice Date", key: "invoiceDate", type: "date" },
      { header: "Customer", key: "partyName", type: "string" },
      {
        header: "Invoice Revenue",
        format: (_, r) => r.invoiceTotal || r.revenue || "0.00",
        type: "currency",
        align: "right",
      },
      {
        header: "COGS (Cost)",
        format: (_, r) => r.costOfGoodsSold || r.cost || "0.00",
        type: "currency",
        align: "right",
      },
      { header: "Gross Profit", key: "grossProfit", type: "currency", align: "right" },
      {
        header: "Margin %",
        format: (_, r) => `${num(r.marginPercentage || r.marginPct).toFixed(2)}%`,
        type: "string",
        align: "right",
      },
    ];

    const sum = reportData.summary || reportData.totals || {};
    const metadata: ExportMetadata = {
      ...baseMetadata,
      title: "Bill-Wise Profit and Margin Analysis",
      fileName: `Bill_Wise_Profit_${startDate}_to_${endDate}`,
      summaryCards: [
        { label: "Total Invoices", value: sum.totalInvoices || bills.length },
        { label: "Total Revenue", value: `₹${inr(sum.totalRevenue)}` },
        { label: "Total COGS", value: `₹${inr(sum.totalCogs)}` },
        { label: "Gross Profit", value: `₹${inr(sum.totalGrossProfit)}`, color: "success" },
      ],
      totals: {
        "Invoice Revenue": sum.totalRevenue,
        "COGS (Cost)": sum.totalCogs,
        "Gross Profit": sum.totalGrossProfit,
      },
    };

    return await executeExport(format, columns, bills, metadata);
  }

  // 3. ITEM WISE SALES REPORT
  if (tab === "item-sales-report") {
    const items: any[] = reportData.items || (Array.isArray(reportData) ? reportData : []);
    const columns: ExportColumn[] = [
      {
        header: "Item Name",
        format: (_, r) => r.itemName || r.name || "",
        type: "string",
      },
      {
        header: "Code / HSN",
        format: (_, r) => {
          const code = r.itemCode || r.sku || "";
          const hsn = r.hsnCode || "";
          if (code && hsn) return `${code} / ${hsn}`;
          return code || hsn || "-";
        },
        type: "string",
      },
      {
        header: "Category",
        format: (_, r) => r.category || r.categoryName || "General",
        type: "string",
      },
      {
        header: "UOM",
        format: (_, r) => r.uom || r.uomSymbol || "PCS",
        type: "string",
      },
      {
        header: "Qty Sold",
        format: (_, r) => r.totalQuantity || r.quantitySold || "0.00",
        type: "number",
        align: "right",
      },
      {
        header: "Avg Rate",
        format: (_, r) => r.avgRate || "0.00",
        type: "currency",
        align: "right",
      },
      {
        header: "Taxable Value",
        format: (_, r) => r.totalTaxable || r.taxableAmount || r.taxableValue || "0.00",
        type: "currency",
        align: "right",
      },
      {
        header: "Total Sales",
        format: (_, r) => r.totalSales || r.totalRevenue || "0.00",
        type: "currency",
        align: "right",
      },
    ];

    const sum = reportData.summary || reportData.totals || {};
    const metadata: ExportMetadata = {
      ...baseMetadata,
      title: "Item-Wise Sales Report",
      fileName: `Item_Sales_${startDate}_to_${endDate}`,
      summaryCards: [
        { label: "Unique Items", value: sum.totalUniqueItems || items.length },
        { label: "Total Qty Sold", value: inr(sum.totalQuantity) },
        { label: "Total Tax", value: `₹${inr(sum.totalTax)}` },
        { label: "Total Sales", value: `₹${inr(sum.totalSales || sum.totalRevenue)}`, color: "success" },
      ],
      totals: {
        "Qty Sold": sum.totalQuantity,
        "Taxable Value": sum.totalTaxable,
        "Total Sales": sum.totalSales || sum.totalRevenue,
      },
    };

    return await executeExport(format, columns, items, metadata);
  }

  // 4. CUSTOMER / PARTY SALES REPORT
  if (tab === "party-sales-report") {
    const parties: any[] = reportData.parties || (Array.isArray(reportData) ? reportData : []);
    const columns: ExportColumn[] = [
      { header: "Customer Name", key: "partyName", type: "string" },
      { header: "Phone", key: "phone", type: "string" },
      { header: "GSTIN", key: "gstin", type: "string" },
      { header: "Bills Count", key: "invoiceCount", type: "number", align: "right" },
      { header: "Total Sales", key: "totalSales", type: "currency", align: "right" },
      {
        header: "Paid Amount",
        format: (_, r) => r.totalPaid || r.paidAmount || "0.00",
        type: "currency",
        align: "right",
      },
      { header: "Balance Due", key: "balanceDue", type: "currency", align: "right" },
    ];

    const sum = reportData.summary || reportData.totals || {};
    const metadata: ExportMetadata = {
      ...baseMetadata,
      title: "Customer-Wise Sales Report",
      fileName: `Customer_Sales_${startDate}_to_${endDate}`,
      summaryCards: [
        { label: "Total Customers", value: sum.totalParties || parties.length },
        { label: "Total Invoices", value: sum.totalInvoices || 0 },
        { label: "Total Sales", value: `₹${inr(sum.totalSales)}`, color: "success" },
        { label: "Balance Due", value: `₹${inr(sum.totalBalance)}`, color: "danger" },
      ],
      totals: {
        "Total Sales": sum.totalSales,
        "Paid Amount": sum.totalPaid,
        "Balance Due": sum.totalBalance,
      },
    };

    return await executeExport(format, columns, parties, metadata);
  }

  // 5. SALES RETURNS (CREDIT NOTES)
  if (tab === "sales-returns") {
    const returns: any[] = reportData.returns || (Array.isArray(reportData) ? reportData : []);
    const columns: ExportColumn[] = [
      {
        header: "Credit Note No",
        format: (_, r) => r.creditNoteNumber || r.returnNumber || r.voucherNumber || "",
        type: "string",
      },
      {
        header: "Date",
        format: (_, r) => r.returnDate || r.date || "",
        type: "date",
      },
      { header: "Customer Name", key: "partyName", type: "string" },
      { header: "Reason", key: "reason", type: "string" },
      { header: "Items Count", key: "itemsCount", type: "number", align: "right" },
      { header: "Taxable Amount", key: "taxableAmount", type: "currency", align: "right" },
      {
        header: "Total Tax",
        format: (_, r) => r.totalTax || r.taxAmount || "0.00",
        type: "currency",
        align: "right",
      },
      {
        header: "Total Refund",
        format: (_, r) => r.grandTotal || r.totalAmount || "0.00",
        type: "currency",
        align: "right",
      },
    ];

    const sum = reportData.summary || reportData.totals || {};
    const metadata: ExportMetadata = {
      ...baseMetadata,
      title: "Sales Returns (Credit Notes Register)",
      fileName: `Sales_Returns_${startDate}_to_${endDate}`,
      summaryCards: [
        { label: "Total Returns", value: sum.totalReturns || returns.length },
        { label: "Taxable Reversal", value: `₹${inr(sum.totalTaxable)}` },
        { label: "Tax Reversal", value: `₹${inr(sum.totalTax)}` },
        { label: "Total Refund", value: `₹${inr(sum.grandTotal)}`, color: "warning" },
      ],
      totals: {
        "Taxable Amount": sum.totalTaxable,
        "Total Tax": sum.totalTax,
        "Total Refund": sum.grandTotal,
      },
    };

    return await executeExport(format, columns, returns, metadata);
  }

  // 6. QUOTATIONS & ESTIMATES
  if (tab === "quotations") {
    const quotes: any[] = reportData.quotations || (Array.isArray(reportData) ? reportData : []);
    const columns: ExportColumn[] = [
      {
        header: "Estimate / Quote No",
        format: (_, r) => r.quoteNumber || r.invoiceNumber || "",
        type: "string",
      },
      {
        header: "Date",
        format: (_, r) => r.date || r.invoiceDate || "",
        type: "date",
      },
      { header: "Customer Name", key: "partyName", type: "string" },
      { header: "Phone", key: "phone", type: "string" },
      { header: "Status", key: "status", type: "string", align: "center" },
      {
        header: "Total Amount",
        format: (_, r) => r.totalAmount || r.grandTotal || "0.00",
        type: "currency",
        align: "right",
      },
    ];

    const sum = reportData.summary || {};
    const metadata: ExportMetadata = {
      ...baseMetadata,
      title: "Quotations and Estimates Schedule",
      fileName: `Quotations_${startDate}_to_${endDate}`,
      summaryCards: [
        { label: "Total Estimates", value: sum.totalQuotations || quotes.length },
        { label: "Total Estimated Value", value: `₹${inr(sum.totalValue)}`, color: "success" },
      ],
      totals: {
        "Total Amount": sum.totalValue,
      },
    };

    return await executeExport(format, columns, quotes, metadata);
  }

  // 7. DELIVERY CHALLANS
  if (tab === "delivery-challans") {
    const challans: any[] = reportData.challans || (Array.isArray(reportData) ? reportData : []);
    const columns: ExportColumn[] = [
      { header: "Challan No", key: "challanNumber", type: "string" },
      { header: "Date", key: "date", type: "date" },
      { header: "Party Name", key: "partyName", type: "string" },
      { header: "Phone", key: "phone", type: "string" },
      { header: "Items Count", key: "itemsCount", type: "number", align: "right" },
      { header: "Delivery Status", key: "status", type: "string", align: "center" },
    ];

    const sum = reportData.summary || {};
    const metadata: ExportMetadata = {
      ...baseMetadata,
      title: "Delivery Challans Register",
      fileName: `Delivery_Challans_${startDate}_to_${endDate}`,
      summaryCards: [
        { label: "Total Challans", value: sum.totalChallans || challans.length },
      ],
    };

    return await executeExport(format, columns, challans, metadata);
  }

  // 8. PURCHASE REGISTER & SUMMARY
  if (tab === "purchase-register" || tab === "purchase-summary") {
    const bills: any[] = reportData.items || reportData.purchases || (Array.isArray(reportData) ? reportData : []);
    const columns: ExportColumn[] = [
      {
        header: "Bill No",
        format: (_, r) => r.vendorInvoiceNumber || r.billNumber || r.invoiceNumber || "",
        type: "string",
      },
      {
        header: "Date",
        format: (_, r) => r.invoiceDate || r.billDate || "",
        type: "date",
      },
      {
        header: "Supplier Name",
        format: (_, r) => r.supplierName || r.partyName || "",
        type: "string",
      },
      {
        header: "Supplier GSTIN",
        format: (_, r) => r.supplierGstin || r.partyGstin || "",
        type: "string",
      },
      { header: "Taxable Amount", key: "taxableAmount", type: "currency", align: "right" },
      { header: "CGST", key: "cgstAmount", type: "currency", align: "right" },
      { header: "SGST", key: "sgstAmount", type: "currency", align: "right" },
      { header: "IGST", key: "igstAmount", type: "currency", align: "right" },
      { header: "Total Bill Amount", key: "grandTotal", type: "currency", align: "right" },
      {
        header: "ITC Eligibility",
        format: (_, r) => r.itcEligibility || r.itcEligible || "INPUT_SERVICES",
        type: "string",
        align: "center",
      },
    ];

    const totals = reportData.totals || reportData.summary || {};
    const metadata: ExportMetadata = {
      ...baseMetadata,
      title: "Purchase Register (Inward Tax Invoices)",
      fileName: `Purchase_Register_${startDate}_to_${endDate}`,
      summaryCards: [
        { label: "Total Bills", value: reportData.totalCount || bills.length },
        { label: "Total Taxable", value: `₹${inr(totals.totalTaxable)}` },
        { label: "Total Purchases", value: `₹${inr(totals.totalGrandTotal)}`, color: "success" },
      ],
      totals: {
        "Taxable Amount": totals.totalTaxable,
        CGST: totals.totalCgst,
        SGST: totals.totalSgst,
        IGST: totals.totalIgst,
        "Total Bill Amount": totals.totalGrandTotal,
      },
    };

    return await executeExport(format, columns, bills, metadata);
  }

  // 9. ITEM WISE PURCHASE REPORT
  if (tab === "item-purchase-report") {
    const items: any[] = reportData.items || (Array.isArray(reportData) ? reportData : []);
    const columns: ExportColumn[] = [
      {
        header: "Item Name",
        format: (_, r) => r.itemName || r.name || "",
        type: "string",
      },
      {
        header: "Code / SKU",
        format: (_, r) => r.itemCode || r.sku || "-",
        type: "string",
      },
      {
        header: "Category",
        format: (_, r) => r.category || "General",
        type: "string",
      },
      {
        header: "UOM",
        format: (_, r) => r.uom || "PCS",
        type: "string",
      },
      {
        header: "Inward Quantity",
        format: (_, r) => r.totalQuantity || r.quantityInward || "0.00",
        type: "number",
        align: "right",
      },
      { header: "Avg Purchase Rate", key: "avgRate", type: "currency", align: "right" },
      {
        header: "Total Purchases",
        format: (_, r) => r.totalPurchases || r.totalCost || "0.00",
        type: "currency",
        align: "right",
      },
    ];

    const sum = reportData.summary || reportData.totals || {};
    const metadata: ExportMetadata = {
      ...baseMetadata,
      title: "Item-Wise Purchase Report",
      fileName: `Item_Purchase_${startDate}_to_${endDate}`,
      summaryCards: [
        { label: "Unique Items", value: sum.totalUniqueItems || items.length },
        { label: "Inward Quantity", value: inr(sum.totalQuantity) },
        { label: "Total Purchases", value: `₹${inr(sum.totalPurchases)}`, color: "success" },
      ],
      totals: {
        "Inward Quantity": sum.totalQuantity,
        "Total Purchases": sum.totalPurchases,
      },
    };

    return await executeExport(format, columns, items, metadata);
  }

  // 10. SUPPLIER / PARTY PURCHASE REPORT
  if (tab === "party-purchase-report") {
    const parties: any[] = reportData.parties || (Array.isArray(reportData) ? reportData : []);
    const columns: ExportColumn[] = [
      { header: "Supplier Name", key: "partyName", type: "string" },
      { header: "Phone", key: "phone", type: "string" },
      { header: "GSTIN", key: "gstin", type: "string" },
      { header: "Bills Count", key: "billCount", type: "number", align: "right" },
      { header: "Total Purchases", key: "totalPurchases", type: "currency", align: "right" },
      {
        header: "Paid Amount",
        format: (_, r) => r.totalPaid || r.paidAmount || "0.00",
        type: "currency",
        align: "right",
      },
      { header: "Balance Payable", key: "balancePayable", type: "currency", align: "right" },
    ];

    const sum = reportData.summary || reportData.totals || {};
    const metadata: ExportMetadata = {
      ...baseMetadata,
      title: "Supplier-Wise Purchase Report",
      fileName: `Supplier_Purchase_${startDate}_to_${endDate}`,
      summaryCards: [
        { label: "Total Suppliers", value: sum.totalSuppliers || parties.length },
        { label: "Total Purchases", value: `₹${inr(sum.totalPurchases)}`, color: "success" },
        { label: "Total Paid", value: `₹${inr(sum.totalPaid)}` },
        { label: "Balance Payable", value: `₹${inr(sum.totalPayable)}`, color: "danger" },
      ],
      totals: {
        "Total Purchases": sum.totalPurchases,
        "Paid Amount": sum.totalPaid,
        "Balance Payable": sum.totalPayable,
      },
    };

    return await executeExport(format, columns, parties, metadata);
  }

  // 11. PURCHASE RETURNS (DEBIT NOTES)
  if (tab === "purchase-returns") {
    const returns: any[] = reportData.returns || (Array.isArray(reportData) ? reportData : []);
    const columns: ExportColumn[] = [
      {
        header: "Debit Note No",
        format: (_, r) => r.debitNoteNumber || r.returnNumber || r.voucherNumber || "",
        type: "string",
      },
      {
        header: "Date",
        format: (_, r) => r.returnDate || r.date || "",
        type: "date",
      },
      { header: "Supplier Name", key: "partyName", type: "string" },
      { header: "Reason", key: "reason", type: "string" },
      { header: "Taxable Amount", key: "taxableAmount", type: "currency", align: "right" },
      {
        header: "Debit Amount",
        format: (_, r) => r.grandTotal || r.totalAmount || "0.00",
        type: "currency",
        align: "right",
      },
    ];

    const sum = reportData.summary || reportData.totals || {};
    const metadata: ExportMetadata = {
      ...baseMetadata,
      title: "Purchase Returns (Debit Notes Register)",
      fileName: `Purchase_Returns_${startDate}_to_${endDate}`,
      summaryCards: [
        { label: "Total Returns", value: sum.totalReturns || returns.length },
        { label: "Taxable Reversal", value: `₹${inr(sum.totalTaxable)}` },
        { label: "Total Debit Note", value: `₹${inr(sum.grandTotal)}`, color: "warning" },
      ],
      totals: {
        "Taxable Amount": sum.totalTaxable,
        "Debit Amount": sum.grandTotal,
      },
    };

    return await executeExport(format, columns, returns, metadata);
  }

  // 12. RECEIPT / PAYMENT REGISTER (CASH & BANK)
  if (tab === "receipt-payment") {
    const entries: any[] = reportData.items || reportData.entries || (Array.isArray(reportData) ? reportData : []);
    const columns: ExportColumn[] = [
      { header: "Voucher No", key: "voucherNumber", type: "string" },
      {
        header: "Date",
        format: (_, r) => r.voucherDate || r.date || "",
        type: "date",
      },
      { header: "Type", key: "voucherType", type: "string" },
      {
        header: "Party / Ledger Account",
        format: (_, r) => r.partyOrAccountName || r.partyName || "General Entry",
        type: "string",
      },
      {
        header: "Bank / Cash Ledger",
        format: (_, r) => r.bankCashAccount || r.bankLedgerName || "-",
        type: "string",
      },
      { header: "Narration", key: "narration", type: "string" },
      {
        header: "Amount",
        format: (_, r) => r.totalAmount || r.amount || "0.00",
        type: "currency",
        align: "right",
      },
    ];

    const sum = reportData.summary || {};
    const metadata: ExportMetadata = {
      ...baseMetadata,
      title: "Receipt and Payment Register (Cash & Bank Book)",
      fileName: `Receipt_Payment_${startDate}_to_${endDate}`,
      summaryCards: [
        { label: "Total Receipts", value: `₹${inr(sum.totalReceipts)}`, color: "success" },
        { label: "Total Payments", value: `₹${inr(sum.totalPayments)}`, color: "danger" },
        { label: "Total Contra", value: `₹${inr(sum.totalContra)}` },
        { label: "Net Cash Flow", value: `₹${inr(sum.netCashMovement)}` },
      ],
      totals: {
        Amount: sum.totalReceipts,
      },
    };

    return await executeExport(format, columns, entries, metadata);
  }

  // 13. OUTSTANDING BALANCES
  if (tab === "outstanding") {
    const balances: any[] = reportData.items || reportData.balances || (Array.isArray(reportData) ? reportData : []);
    const columns: ExportColumn[] = [
      {
        header: "Party Name",
        format: (_, r) => r.name || r.partyName || "",
        type: "string",
      },
      { header: "Party Type", key: "partyType", type: "string" },
      { header: "Phone", key: "phone", type: "string" },
      { header: "GSTIN", key: "gstin", type: "string" },
      { header: "Unpaid Invoices", key: "unpaidInvoicesCount", type: "number", align: "right" },
      { header: "Sales Balance", key: "salesOutstanding", type: "currency", align: "right" },
      { header: "Purchase Balance", key: "purchaseOutstanding", type: "currency", align: "right" },
      {
        header: "Ledger Balance",
        format: (_, r) => `${r.ledgerBalance || r.invoiceOutstanding || "0.00"} ${r.balanceType || ""}`,
        type: "string",
        align: "right",
      },
    ];

    const sum = reportData.summary || {};
    const metadata: ExportMetadata = {
      ...baseMetadata,
      title: "Outstanding Balances (Debtors & Creditors)",
      fileName: `Outstanding_Balances_${endDate}`,
      summaryCards: [
        { label: "Total Receivables (Debtors)", value: `₹${inr(sum.totalReceivables)}`, color: "success" },
        { label: "Total Payables (Creditors)", value: `₹${inr(sum.totalPayables)}`, color: "danger" },
        { label: "Net Outstanding", value: `₹${inr(sum.netOutstanding)}` },
      ],
      totals: {
        "Sales Balance": sum.totalReceivables,
        "Purchase Balance": sum.totalPayables,
      },
    };

    return await executeExport(format, columns, balances, metadata);
  }

  // 14. PARTY STATEMENT (KHATA LEDGER)
  if (tab === "party-ledger") {
    const entries: any[] = reportData.entries || reportData.transactions || [];
    const partyName = reportData.party?.name || "Party";
    const columns: ExportColumn[] = [
      {
        header: "Date",
        format: (_, r) => r.date || r.voucherDate || "",
        type: "date",
      },
      {
        header: "Voucher / Ref No",
        format: (_, r) => r.refNo || r.voucherNumber || "",
        type: "string",
      },
      {
        header: "Type",
        format: (_, r) => r.voucherType || r.type || "",
        type: "string",
      },
      { header: "Narration", key: "narration", type: "string" },
      { header: "Debit (Dr)", key: "debit", type: "currency", align: "right" },
      { header: "Credit (Cr)", key: "credit", type: "currency", align: "right" },
      {
        header: "Running Balance",
        format: (_, r) => r.balance || r.runningBalance || "0.00",
        type: "currency",
        align: "right",
      },
    ];

    const sum = reportData.summary || {};
    const metadata: ExportMetadata = {
      ...baseMetadata,
      title: `Party Statement (Khata Ledger) - ${partyName}`,
      fileName: `Party_Statement_${partyName.replace(/\s+/g, "_")}_${startDate}_to_${endDate}`,
      summaryCards: [
        { label: "Opening Balance", value: `₹${inr(sum.openingBalance)}` },
        { label: "Total Debit (Udhar)", value: `₹${inr(sum.totalDebits)}`, color: "danger" },
        { label: "Total Credit (Jama)", value: `₹${inr(sum.totalCredits)}`, color: "success" },
        { label: "Closing Balance", value: `₹${inr(sum.closingBalance)}` },
      ],
      totals: {
        "Debit (Dr)": sum.totalDebits,
        "Credit (Cr)": sum.totalCredits,
        "Running Balance": sum.closingBalance,
      },
    };

    return await executeExport(format, columns, entries, metadata);
  }

  // 15. RECEIVABLE AGING REPORT
  if (tab === "party-aging") {
    const rows: any[] = reportData.parties || reportData.aging || (Array.isArray(reportData) ? reportData : []);
    const columns: ExportColumn[] = [
      { header: "Customer Name", key: "partyName", type: "string" },
      { header: "Phone", key: "phone", type: "string" },
      { header: "Credit Days", key: "creditDays", type: "number", align: "center" },
      { header: "Not Due", key: "notDue", type: "currency", align: "right" },
      {
        header: "0 - 30 Days",
        format: (_, r) => r.overdue0to30 || r.bucket0_30 || "0.00",
        type: "currency",
        align: "right",
      },
      {
        header: "31 - 60 Days",
        format: (_, r) => r.overdue31to60 || r.bucket31_60 || "0.00",
        type: "currency",
        align: "right",
      },
      {
        header: "61 - 90 Days",
        format: (_, r) => r.overdue61to90 || r.bucket61_90 || "0.00",
        type: "currency",
        align: "right",
      },
      {
        header: "90+ Days",
        format: (_, r) => r.overdue90Plus || r.bucket90Plus || "0.00",
        type: "currency",
        align: "right",
      },
      {
        header: "Total Due",
        format: (_, r) => r.totalDue || r.totalOutstanding || "0.00",
        type: "currency",
        align: "right",
      },
    ];

    const sum = reportData.summary || reportData.totals || {};
    const metadata: ExportMetadata = {
      ...baseMetadata,
      title: "Receivable Aging Schedule (Overdue Aging Analysis)",
      fileName: `Receivable_Aging_${endDate}`,
      summaryCards: [
        { label: "Total Receivables", value: `₹${inr(sum.totalReceivable || sum.grandTotal)}`, color: "success" },
        { label: "Current Not Due", value: `₹${inr(sum.notDue)}` },
        { label: "0 - 30 Days Overdue", value: `₹${inr(sum.overdue0to30)}`, color: "warning" },
        { label: "60+ Days Overdue", value: `₹${inr(sum.overdue90Plus)}`, color: "danger" },
      ],
      totals: {
        "Not Due": sum.notDue,
        "0 - 30 Days": sum.overdue0to30,
        "31 - 60 Days": sum.overdue31to60,
        "61 - 90 Days": sum.overdue61to90,
        "90+ Days": sum.overdue90Plus,
        "Total Due": sum.totalReceivable || sum.grandTotal,
      },
    };

    return await executeExport(format, columns, rows, metadata);
  }

  // 16. STOCK SUMMARY
  if (tab === "stock-summary") {
    const items: any[] = reportData.items || (Array.isArray(reportData) ? reportData : []);
    const columns: ExportColumn[] = [
      {
        header: "Item Name",
        format: (_, r) => r.name || r.itemName || "",
        type: "string",
      },
      { header: "SKU / Code", key: "sku", type: "string" },
      {
        header: "Category",
        format: (_, r) => r.categoryName || r.category || "General",
        type: "string",
      },
      {
        header: "Purchase Rate",
        format: (_, r) => r.purchaseRate || r.costRate || "0.00",
        type: "currency",
        align: "right",
      },
      {
        header: "Selling Price",
        format: (_, r) => r.retailPrice || r.sellingPrice || "0.00",
        type: "currency",
        align: "right",
      },
      {
        header: "Current Stock",
        format: (_, r) => `${r.currentStockQuantity || r.currentStock || "0"} ${r.uomSymbol || r.uom || ""}`,
        type: "string",
        align: "right",
      },
      {
        header: "Stock Valuation",
        format: (_, r) => r.totalValuation || r.valuation || "0.00",
        type: "currency",
        align: "right",
      },
    ];

    const sum = reportData.summary || reportData.totals || {};
    const metadata: ExportMetadata = {
      ...baseMetadata,
      title: "Inventory Stock Summary and Valuation",
      fileName: `Stock_Summary_${endDate}`,
      summaryCards: [
        { label: "Catalog Items", value: sum.totalItems || items.length },
        { label: "Stock Valuation", value: `₹${inr(sum.totalValuation || sum.grandStockValuation)}`, color: "success" },
      ],
      totals: {
        "Stock Valuation": sum.totalValuation || sum.grandStockValuation,
      },
    };

    return await executeExport(format, columns, items, metadata);
  }

  // 17. STOCK MOVEMENTS
  if (tab === "stock-movement") {
    const movs: any[] = reportData.transactions || reportData.movements || (Array.isArray(reportData) ? reportData : []);
    const columns: ExportColumn[] = [
      { header: "Date", key: "date", type: "date" },
      { header: "Document Type", key: "docType", type: "string" },
      { header: "Reference No", key: "docId", type: "string" },
      {
        header: "Item Name",
        format: (_, r) => r.item || r.itemName || "",
        type: "string",
      },
      { header: "Godown / Warehouse", key: "warehouse", type: "string" },
      { header: "Quantity", key: "quantity", type: "number", align: "right" },
      { header: "Valuation Rate", key: "rate", type: "currency", align: "right" },
      { header: "Valuation", key: "valuation", type: "currency", align: "right" },
    ];

    const metadata: ExportMetadata = {
      ...baseMetadata,
      title: "Stock Movement Register (Inward & Outward Transactions)",
      fileName: `Stock_Movement_${startDate}_to_${endDate}`,
      summaryCards: [
        { label: "Total Movements", value: movs.length },
        { label: "Total Inward", value: inr(reportData.totalInward || 0) },
        { label: "Total Outward", value: inr(reportData.totalOutward || 0) },
      ],
    };

    return await executeExport(format, columns, movs, metadata);
  }

  // 18. ITEM BATCH & EXPIRY REPORT
  if (tab === "item-batch-report") {
    const batches: any[] = reportData.batches || (Array.isArray(reportData) ? reportData : []);
    const columns: ExportColumn[] = [
      { header: "Item Name", key: "itemName", type: "string" },
      { header: "Batch No", key: "batchNumber", type: "string" },
      { header: "Item Code", key: "itemCode", type: "string" },
      { header: "UOM", key: "uom", type: "string" },
      { header: "Mfg Date", key: "mfgDate", type: "date" },
      { header: "Expiry Date", key: "expiryDate", type: "date" },
      { header: "Days to Expiry", key: "daysToExpiry", type: "number", align: "right" },
      {
        header: "Stock Qty",
        format: (_, r) => r.currentStock || r.quantity || "0.00",
        type: "number",
        align: "right",
      },
      { header: "Valuation", key: "valuation", type: "currency", align: "right" },
      { header: "Status", key: "status", type: "string", align: "center" },
    ];

    const sum = reportData.summary || {};
    const metadata: ExportMetadata = {
      ...baseMetadata,
      title: "Item Batch and Expiry Tracking Schedule",
      fileName: `Batch_Expiry_${endDate}`,
      summaryCards: [
        { label: "Total Batches", value: sum.totalBatches || batches.length },
        { label: "Expired Batches", value: sum.expiredCount || 0, color: "danger" },
        { label: "Expiring Soon (30d)", value: sum.expiringSoonCount || 0, color: "warning" },
      ],
    };

    return await executeExport(format, columns, batches, metadata);
  }

  // 19. LOW STOCK ALERT REPORT
  if (tab === "low-stock-alert") {
    const alerts: any[] = reportData.items || (Array.isArray(reportData) ? reportData : []);
    const columns: ExportColumn[] = [
      {
        header: "Item Name",
        format: (_, r) => r.name || r.itemName || "",
        type: "string",
      },
      { header: "SKU / Code", key: "sku", type: "string" },
      { header: "Category", key: "category", type: "string" },
      { header: "Current Stock", key: "currentStock", type: "number", align: "right" },
      {
        header: "Min Stock Level",
        format: (_, r) => r.minStockLevel || r.reorderLevel || "0.00",
        type: "number",
        align: "right",
      },
      { header: "Deficit", key: "deficit", type: "number", align: "right" },
      {
        header: "Suggested Reorder",
        format: (_, r) => r.reorderQuantity || r.suggestedReorder || "0.00",
        type: "number",
        align: "right",
      },
      { header: "Purchase Rate", key: "purchaseRate", type: "currency", align: "right" },
    ];

    const sum = reportData.summary || {};
    const metadata: ExportMetadata = {
      ...baseMetadata,
      title: "Low Stock Alert and Reorder Schedule",
      fileName: `Low_Stock_Alert_${endDate}`,
      summaryCards: [
        { label: "Items Below Min Level", value: sum.totalLowStockCount || alerts.length, color: "danger" },
      ],
    };

    return await executeExport(format, columns, alerts, metadata);
  }

  // 20. EXPENSE CATEGORY REPORT
  if (tab === "expense-category") {
    const cats: any[] = reportData.categories || (Array.isArray(reportData) ? reportData : []);
    const columns: ExportColumn[] = [
      {
        header: "Expense Category / Ledger",
        format: (_, r) => r.categoryName || r.name || "",
        type: "string",
      },
      {
        header: "Voucher Count",
        format: (_, r) => r.count || r.voucherCount || 0,
        type: "number",
        align: "right",
      },
      {
        header: "Total Incurred",
        format: (_, r) => r.totalExpense || r.amount || "0.00",
        type: "currency",
        align: "right",
      },
      {
        header: "Share of Expenses",
        format: (_, r) => `${num(r.sharePercentage || r.sharePct).toFixed(2)}%`,
        type: "string",
        align: "right",
      },
    ];

    const sum = reportData.summary || reportData.totals || {};
    const metadata: ExportMetadata = {
      ...baseMetadata,
      title: "Expense Category Wise Expenditure Breakdown",
      fileName: `Expense_Category_${startDate}_to_${endDate}`,
      summaryCards: [
        { label: "Total Categories", value: cats.length },
        { label: "Total Expenditure", value: `₹${inr(sum.totalExpense || sum.grandTotalExpense)}`, color: "danger" },
      ],
      totals: {
        "Total Incurred": sum.totalExpense || sum.grandTotalExpense,
      },
    };

    return await executeExport(format, columns, cats, metadata);
  }

  // 21. AUDIT TRAIL REPORT
  if (tab === "audit-trail") {
    const logs: any[] = reportData.logs || (Array.isArray(reportData) ? reportData : []);
    const columns: ExportColumn[] = [
      { header: "Timestamp", key: "timestamp", type: "string" },
      { header: "User / Performed By", key: "userName", type: "string" },
      { header: "Action", key: "action", type: "string" },
      {
        header: "Entity / Module",
        format: (_, r) => r.entityName || r.entityType || "",
        type: "string",
      },
      { header: "Reference / Document ID", key: "entityId", type: "string" },
      { header: "IP Address", key: "ipAddress", type: "string" },
    ];

    const sum = reportData.summary || {};
    const metadata: ExportMetadata = {
      ...baseMetadata,
      title: "Statutory Audit Trail and Security Log Register",
      fileName: `Audit_Trail_${startDate}_to_${endDate}`,
      summaryCards: [
        { label: "Total Audit Events", value: sum.totalLogs || logs.length },
      ],
    };

    return await executeExport(format, columns, logs, metadata);
  }

  // 22. HSN WISE SALES SUMMARY (TABLE 12)
  if (tab === "hsn-sales-summary") {
    const hsnRows: any[] = reportData.records || reportData.hsnSummary || (Array.isArray(reportData) ? reportData : []);
    const columns: ExportColumn[] = [
      {
        header: "HSN / SAC Code",
        format: (_, r) => r.hsnCode || r.hsn || "",
        type: "string",
      },
      { header: "Description", key: "description", type: "string" },
      { header: "UOM", key: "uom", type: "string" },
      { header: "Total Quantity", key: "totalQuantity", type: "number", align: "right" },
      {
        header: "Taxable Value",
        format: (_, r) => r.totalTaxable || r.taxableValue || "0.00",
        type: "currency",
        align: "right",
      },
      { header: "CGST", key: "cgstAmount", type: "currency", align: "right" },
      { header: "SGST", key: "sgstAmount", type: "currency", align: "right" },
      { header: "IGST", key: "igstAmount", type: "currency", align: "right" },
      {
        header: "Total Value",
        format: (_, r) => r.totalValue || r.grandTotal || "0.00",
        type: "currency",
        align: "right",
      },
    ];

    const sum = reportData.summary || reportData.totals || {};
    const metadata: ExportMetadata = {
      ...baseMetadata,
      title: "GSTR-1 Table 12 HSN Wise Outward Summary",
      fileName: `HSN_Sales_Summary_${startDate}_to_${endDate}`,
      summaryCards: [
        { label: "Total HSNs", value: sum.totalHsns || hsnRows.length },
        { label: "Total Quantity", value: inr(sum.totalQuantity) },
        { label: "Taxable Value", value: `₹${inr(sum.totalTaxable)}` },
        { label: "Total Value", value: `₹${inr(sum.totalValue)}`, color: "success" },
      ],
      totals: {
        "Total Quantity": sum.totalQuantity,
        "Taxable Value": sum.totalTaxable,
        CGST: sum.totalCgst,
        SGST: sum.totalSgst,
        IGST: sum.totalIgst,
        "Total Value": sum.totalValue,
      },
    };

    return await executeExport(format, columns, hsnRows, metadata);
  }

  // 22B. GSTR-1 STATUTORY SALES, CREDIT & DEBIT NOTES (MATCHING BILLING SOFTWARE FORMAT)
  if (tab === "gstr-1") {
    const subTab = (reportData as any)._activeSubTab || "sales";

    if (subTab === "credit-notes") {
      const rows = reportData.creditNotes || [];
      const columns: ExportColumn[] = [
        { header: "GSTIN", key: "gstin", format: (v) => v || "Unregistered" },
        { header: "Customer Name", key: "customerName" },
        { header: "State Code", key: "stateCode", align: "center" },
        { header: "State Name", key: "stateName" },
        { header: "Credit Note #", key: "noteNumber" },
        { header: "Date", key: "noteDate" },
        { header: "Original Invoice #", key: "originalInvoiceNumber" },
        { header: "Note Value", key: "noteValue", type: "currency", align: "right" },
        { header: "Tax Rate (%)", key: "taxRate", align: "center", format: (v) => `${v}%` },
        { header: "Taxable Value", key: "taxableValue", type: "currency", align: "right" },
        { header: "CGST", key: "cgst", type: "currency", align: "right" },
        { header: "SGST", key: "sgst", type: "currency", align: "right" },
        { header: "IGST", key: "igst", type: "currency", align: "right" },
      ];

      const sumVal = rows.reduce((s: number, r: any) => s + (Number(r.noteValue) || 0), 0);
      const sumTaxable = rows.reduce((s: number, r: any) => s + (Number(r.taxableValue) || 0), 0);
      const sumCgst = rows.reduce((s: number, r: any) => s + (Number(r.cgst) || 0), 0);
      const sumSgst = rows.reduce((s: number, r: any) => s + (Number(r.sgst) || 0), 0);
      const sumIgst = rows.reduce((s: number, r: any) => s + (Number(r.igst) || 0), 0);

      const metadata: ExportMetadata = {
        ...baseMetadata,
        title: "GSTR-1 Sales Return / Credit Notes Schedule",
        fileName: `GSTR1_Credit_Notes_${startDate}_to_${endDate}`,
        summaryCards: [
          { label: "Total Credit Notes", value: rows.length },
          { label: "Total Note Value", value: `₹${inr(sumVal)}`, color: "danger" },
          { label: "Taxable Reversal", value: `₹${inr(sumTaxable)}` },
          { label: "Total Tax Reversal", value: `₹${inr(sumCgst + sumSgst + sumIgst)}` },
        ],
        totals: {
          "Note Value": sumVal,
          "Taxable Value": sumTaxable,
          CGST: sumCgst,
          SGST: sumSgst,
          IGST: sumIgst,
        },
      };

      return await executeExport(format, columns, rows, metadata);
    }

    if (subTab === "debit-notes") {
      const rows = reportData.debitNotes || [];
      const columns: ExportColumn[] = [
        { header: "GSTIN", key: "gstin", format: (v) => v || "Unregistered" },
        { header: "Supplier Name", key: "supplierName", format: (_, r) => r.supplierName || r.customerName },
        { header: "State Code", key: "stateCode", align: "center" },
        { header: "State Name", key: "stateName" },
        { header: "Debit Note #", key: "noteNumber" },
        { header: "Date", key: "noteDate" },
        { header: "Original Bill #", key: "originalInvoiceNumber" },
        { header: "Note Value", key: "noteValue", type: "currency", align: "right" },
        { header: "Tax Rate (%)", key: "taxRate", align: "center", format: (v) => `${v}%` },
        { header: "Taxable Value", key: "taxableValue", type: "currency", align: "right" },
        { header: "CGST", key: "cgst", type: "currency", align: "right" },
        { header: "SGST", key: "sgst", type: "currency", align: "right" },
        { header: "IGST", key: "igst", type: "currency", align: "right" },
      ];

      const sumVal = rows.reduce((s: number, r: any) => s + (Number(r.noteValue) || 0), 0);
      const sumTaxable = rows.reduce((s: number, r: any) => s + (Number(r.taxableValue) || 0), 0);
      const sumCgst = rows.reduce((s: number, r: any) => s + (Number(r.cgst) || 0), 0);
      const sumSgst = rows.reduce((s: number, r: any) => s + (Number(r.sgst) || 0), 0);
      const sumIgst = rows.reduce((s: number, r: any) => s + (Number(r.igst) || 0), 0);

      const metadata: ExportMetadata = {
        ...baseMetadata,
        title: "GSTR-1 Purchase Return / Debit Notes Schedule",
        fileName: `GSTR1_Debit_Notes_${startDate}_to_${endDate}`,
        summaryCards: [
          { label: "Total Debit Notes", value: rows.length },
          { label: "Total Note Value", value: `₹${inr(sumVal)}` },
          { label: "Taxable Value", value: `₹${inr(sumTaxable)}` },
          { label: "Total Tax", value: `₹${inr(sumCgst + sumSgst + sumIgst)}` },
        ],
        totals: {
          "Note Value": sumVal,
          "Taxable Value": sumTaxable,
          CGST: sumCgst,
          SGST: sumSgst,
          IGST: sumIgst,
        },
      };

      return await executeExport(format, columns, rows, metadata);
    }

    // Default: Sales Invoices
    const rows = reportData.salesInvoices || [];
    const columns: ExportColumn[] = [
      { header: "GSTIN", key: "gstin", format: (v) => v || "Unregistered" },
      { header: "Customer Name", key: "customerName" },
      { header: "State Code", key: "stateCode", align: "center" },
      { header: "State Name", key: "stateName" },
      { header: "Invoice Number", key: "invoiceNumber" },
      { header: "Invoice Date", key: "invoiceDate" },
      { header: "Invoice Value", key: "invoiceValue", type: "currency", align: "right" },
      { header: "Total Tax (%)", key: "taxRate", align: "center", format: (v) => `${v}%` },
      { header: "Taxable Value", key: "taxableValue", type: "currency", align: "right" },
      { header: "CGST", key: "cgst", type: "currency", align: "right" },
      { header: "SGST / UTGST", key: "sgst", type: "currency", align: "right" },
      { header: "IGST", key: "igst", type: "currency", align: "right" },
    ];

    const sum = reportData.summary || {};
    const metadata: ExportMetadata = {
      ...baseMetadata,
      title: "GSTR-1 Statutory Sales Schedule (Outward Supplies)",
      fileName: `GSTR1_Sales_${startDate}_to_${endDate}`,
      summaryCards: [
        { label: "Total Invoices", value: sum.totalInvoices || rows.length },
        { label: "Gross Turnover", value: `₹${inr(sum.grossTurnover || 0)}`, color: "success" },
        { label: "Taxable Value", value: `₹${inr(sum.totalTaxable || 0)}` },
        { label: "Total GST Tax", value: `₹${inr(sum.totalTax || 0)}` },
      ],
      totals: {
        "Invoice Value": sum.grossTurnover || rows.reduce((s: number, r: any) => s + (Number(r.invoiceValue) || 0), 0),
        "Taxable Value": sum.totalTaxable || rows.reduce((s: number, r: any) => s + (Number(r.taxableValue) || 0), 0),
        CGST: sum.totalCgst || rows.reduce((s: number, r: any) => s + (Number(r.cgst) || 0), 0),
        SGST: sum.totalSgst || rows.reduce((s: number, r: any) => s + (Number(r.sgst) || 0), 0),
        IGST: sum.totalIgst || rows.reduce((s: number, r: any) => s + (Number(r.igst) || 0), 0),
      },
    };

    return await executeExport(format, columns, rows, metadata);
  }

  // 22C. GSTR-3B STATUTORY SUMMARY
  if (tab === "gstr-3b") {
    const t31 = reportData.table3_1_outwardSupplies || {};
    const t4 = reportData.table4_eligibleItc?.allOtherItc || {};
    const rows = [
      {
        schedule: "3.1 (a) Outward Taxable Supplies",
        taxable: t31.taxableAmount || "0.00",
        igst: t31.igst || "0.00",
        cgst: t31.cgst || "0.00",
        sgst: t31.sgst || "0.00",
        cess: t31.cess || "0.00",
      },
      {
        schedule: "4 (A) (5) All Other Eligible ITC",
        taxable: "—",
        igst: t4.igst || "0.00",
        cgst: t4.cgst || "0.00",
        sgst: t4.sgst || "0.00",
        cess: t4.cess || "0.00",
      },
    ];

    const columns: ExportColumn[] = [
      { header: "Table Schedule", key: "schedule" },
      { header: "Taxable Value (₹)", key: "taxable", align: "right" },
      { header: "IGST (₹)", key: "igst", align: "right" },
      { header: "CGST (₹)", key: "cgst", align: "right" },
      { header: "SGST (₹)", key: "sgst", align: "right" },
      { header: "Cess (₹)", key: "cess", align: "right" },
    ];

    const metadata: ExportMetadata = {
      ...baseMetadata,
      title: "GSTR-3B Monthly Statutory Return Summary",
      fileName: `GSTR3B_Summary_${startDate}_to_${endDate}`,
      summaryCards: [
        { label: "Filing Status", value: reportData.filingStatus || "AUTO_COMPUTED" },
        { label: "Taxable Outward", value: `₹${inr(t31.taxableAmount || 0)}` },
        { label: "Total Outward Tax", value: `₹${inr(Number(t31.cgst || 0) + Number(t31.sgst || 0) + Number(t31.igst || 0))}`, color: "success" },
      ],
    };

    return await executeExport(format, columns, rows, metadata);
  }

  // 23. FINANCIAL STATEMENTS: PROFIT & LOSS
  if (tab === "profit-loss") {
    const rows: any[] = [];
    rows.push({ section: "--- REVENUE FROM OPERATIONS ---", account: "", amount: "" });
    if (reportData.operatingRevenue) {
      reportData.operatingRevenue.forEach((r: any) =>
        rows.push({ section: "Revenue", account: r.accountName, amount: inr(r.balance) })
      );
    }
    rows.push({ section: "Total Revenue", account: "Gross Turnover", amount: inr(reportData.totalRevenue || 0) });

    rows.push({ section: "--- COST OF GOODS SOLD ---", account: "", amount: "" });
    rows.push({ section: "COGS", account: "Cost of Materials & Direct Expenses", amount: inr(reportData.totalCogs || 0) });
    rows.push({ section: "GROSS PROFIT", account: "Turnover - Direct Cost", amount: inr(reportData.grossProfit || 0) });

    rows.push({ section: "--- OPERATING & INDIRECT EXPENSES ---", account: "", amount: "" });
    if (reportData.expenses) {
      reportData.expenses.forEach((e: any) =>
        rows.push({ section: "Expense", account: e.accountName, amount: inr(e.balance) })
      );
    }
    rows.push({ section: "Total Expenses", account: "Indirect Operating Costs", amount: inr(reportData.totalExpenses || 0) });
    rows.push({ section: "NET PROFIT / (LOSS)", account: "Net Earnings for the Period", amount: inr(reportData.netProfit || 0) });

    const columns: ExportColumn[] = [
      { header: "Classification", key: "section", type: "string" },
      { header: "Particulars / Ledger Account", key: "account", type: "string" },
      { header: "Amount", key: "amount", type: "currency", align: "right" },
    ];

    const metadata: ExportMetadata = {
      ...baseMetadata,
      title: "Profit and Loss Statement (P&L Account)",
      fileName: `Profit_and_Loss_${startDate}_to_${endDate}`,
      summaryCards: [
        { label: "Turnover (Revenue)", value: `₹${inr(reportData.totalRevenue)}` },
        { label: "Cost of Goods Sold", value: `₹${inr(reportData.totalCogs)}` },
        { label: "Gross Profit", value: `₹${inr(reportData.grossProfit)}`, color: "success" },
        { label: "Net Profit / Loss", value: `₹${inr(reportData.netProfit)}`, color: num(reportData.netProfit) >= 0 ? "success" : "danger" },
      ],
      totals: {
        Amount: inr(reportData.netProfit),
      },
    };

    return await executeExport(format, columns, rows, metadata);
  }

  // 24. FINANCIAL STATEMENTS: BALANCE SHEET
  if (tab === "balance-sheet") {
    const rows: any[] = [];
    rows.push({ side: "LIABILITIES & CAPITAL", particulars: "--- CAPITAL ACCOUNT & RESERVES ---", amount: "" });
    if (reportData.equity) {
      reportData.equity.forEach((r: any) =>
        rows.push({ side: "Capital", particulars: r.accountName, amount: inr(r.balance) })
      );
    }
    rows.push({ side: "LIABILITIES", particulars: "--- CURRENT & NON-CURRENT LIABILITIES ---", amount: "" });
    if (reportData.liabilities) {
      reportData.liabilities.forEach((r: any) =>
        rows.push({ side: "Liabilities", particulars: r.accountName, amount: inr(r.balance) })
      );
    }
    rows.push({ side: "TOTAL LIABILITIES & EQUITY", particulars: "Total Sources of Funds", amount: inr(reportData.totalLiabilities || 0) });

    rows.push({ side: "ASSETS", particulars: "--- FIXED & CURRENT ASSETS ---", amount: "" });
    if (reportData.assets) {
      reportData.assets.forEach((r: any) =>
        rows.push({ side: "Assets", particulars: r.accountName, amount: inr(r.balance) })
      );
    }
    rows.push({ side: "TOTAL ASSETS", particulars: "Total Application of Funds", amount: inr(reportData.totalAssets || 0) });

    const columns: ExportColumn[] = [
      { header: "Classification", key: "side", type: "string" },
      { header: "Particulars / Account", key: "particulars", type: "string" },
      { header: "Amount", key: "amount", type: "currency", align: "right" },
    ];

    const metadata: ExportMetadata = {
      ...baseMetadata,
      title: "Balance Sheet (Statement of Financial Position)",
      fileName: `Balance_Sheet_${endDate}`,
      summaryCards: [
        { label: "Total Assets", value: `₹${inr(reportData.totalAssets)}`, color: "success" },
        { label: "Total Liabilities", value: `₹${inr(reportData.totalLiabilities)}` },
        { label: "Owner Equity", value: `₹${inr(reportData.totalEquity)}` },
      ],
      totals: {
        Amount: inr(reportData.totalAssets),
      },
    };

    return await executeExport(format, columns, rows, metadata);
  }

  // 25. TRIAL BALANCE
  if (tab === "trial-balance") {
    const accounts: any[] = reportData.items || reportData.accounts || (Array.isArray(reportData) ? reportData : []);
    const columns: ExportColumn[] = [
      { header: "Account Code", key: "accountCode", type: "string" },
      { header: "Ledger Account", key: "accountName", type: "string" },
      { header: "Group", key: "groupName", type: "string" },
      { header: "Nature", key: "nature", type: "string" },
      { header: "Period Debit", key: "periodDebit", type: "currency", align: "right" },
      { header: "Period Credit", key: "periodCredit", type: "currency", align: "right" },
      { header: "Closing Debit", key: "closingDebit", type: "currency", align: "right" },
      { header: "Closing Credit", key: "closingCredit", type: "currency", align: "right" },
    ];

    const sum = reportData.totals || {};
    const metadata: ExportMetadata = {
      ...baseMetadata,
      title: "Trial Balance (General Ledger Balances)",
      fileName: `Trial_Balance_${startDate}_to_${endDate}`,
      summaryCards: [
        { label: "Period Debits", value: `₹${inr(sum.totalPeriodDebit)}` },
        { label: "Period Credits", value: `₹${inr(sum.totalPeriodCredit)}` },
        { label: "Closing Debit", value: `₹${inr(sum.totalClosingDebit)}`, color: "success" },
        { label: "Closing Credit", value: `₹${inr(sum.totalClosingCredit)}`, color: "success" },
      ],
      totals: {
        "Period Debit": sum.totalPeriodDebit,
        "Period Credit": sum.totalPeriodCredit,
        "Closing Debit": sum.totalClosingDebit,
        "Closing Credit": sum.totalClosingCredit,
      },
    };

    return await executeExport(format, columns, accounts, metadata);
  }

  // 26. DAYBOOK (ROJMEL)
  if (tab === "daybook") {
    const vouchers: any[] = reportData.entries || reportData.vouchers || (Array.isArray(reportData) ? reportData : []);
    const columns: ExportColumn[] = [
      { header: "Voucher No", key: "voucherNumber", type: "string" },
      { header: "Voucher Type", key: "voucherType", type: "string" },
      { header: "Narration", key: "narration", type: "string" },
      { header: "Debit (Udhar)", key: "debit", type: "currency", align: "right" },
      { header: "Credit (Jama)", key: "credit", type: "currency", align: "right" },
      { header: "Type", key: "type", type: "string", align: "center" },
    ];

    const metadata: ExportMetadata = {
      ...baseMetadata,
      title: `Daybook (Rojmel / Daily Register) for ${endDate}`,
      fileName: `Daybook_${endDate}`,
      summaryCards: [
        { label: "Opening Cash", value: `₹${inr(reportData.openingCashBalance)}` },
        { label: "Total Udhar (Outflow)", value: `₹${inr(reportData.totalUdhar)}`, color: "danger" },
        { label: "Total Jama (Inflow)", value: `₹${inr(reportData.totalJama)}`, color: "success" },
        { label: "Closing Cash", value: `₹${inr(reportData.closingCashBalance)}`, color: "success" },
      ],
      totals: {
        "Debit (Udhar)": reportData.totalUdhar,
        "Credit (Jama)": reportData.totalJama,
      },
    };

    return await executeExport(format, columns, vouchers, metadata);
  }

  // 27. CASH FLOW STATEMENT
  if (tab === "cash-flow") {
    const rows: any[] = [];
    rows.push({ section: "OPERATING ACTIVITIES", activity: "Cash from Customers", amount: inr(reportData.operatingActivities?.inflows?.receiptsFromCustomers || 0) });
    rows.push({ section: "OPERATING ACTIVITIES", activity: "Cash Paid to Suppliers", amount: inr(reportData.operatingActivities?.outflows?.paymentsToSuppliers || 0) });
    rows.push({ section: "OPERATING ACTIVITIES", activity: "Operating Expenses Paid", amount: inr(reportData.operatingActivities?.outflows?.operatingExpenses || 0) });
    rows.push({ section: "OPERATING ACTIVITIES", activity: "Net Operating Cash Flow", amount: inr(reportData.operatingActivities?.netOperatingCashFlow || 0) });

    rows.push({ section: "INVESTING ACTIVITIES", activity: "Net Investing Cash Flow", amount: inr(reportData.investingActivities?.netInvestingCashFlow || 0) });
    rows.push({ section: "FINANCING ACTIVITIES", activity: "Net Financing Cash Flow", amount: inr(reportData.financingActivities?.netFinancingCashFlow || 0) });
    rows.push({ section: "NET CASH CHANGE", activity: "Net Increase / (Decrease) in Cash", amount: inr(reportData.netChangeInCashAndBank || 0) });

    const columns: ExportColumn[] = [
      { header: "Activity Section", key: "section", type: "string" },
      { header: "Particulars / Cash Flow", key: "activity", type: "string" },
      { header: "Amount", key: "amount", type: "currency", align: "right" },
    ];

    const metadata: ExportMetadata = {
      ...baseMetadata,
      title: "Cash Flow Statement (Direct Method)",
      fileName: `Cash_Flow_${startDate}_to_${endDate}`,
      summaryCards: [
        { label: "Opening Cash & Bank", value: `₹${inr(reportData.openingCashAndBank)}` },
        { label: "Net Operating Flow", value: `₹${inr(reportData.operatingActivities?.netOperatingCashFlow)}`, color: "success" },
        { label: "Net Change in Cash", value: `₹${inr(reportData.netChangeInCashAndBank)}` },
        { label: "Closing Cash & Bank", value: `₹${inr(reportData.closingCashAndBank)}`, color: "success" },
      ],
      totals: {
        Amount: inr(reportData.closingCashAndBank),
      },
    };

    return await executeExport(format, columns, rows, metadata);
  }

  // 28. GSTR-3B STATUTORY SUMMARY
  if (tab === "gstr-3b") {
    const rows: any[] = [];
    const t31 = reportData.table31?.outwardTaxableSupplies || reportData.table3_1_outwardSupplies || {};
    rows.push({
      section: "3.1 (a) Outward Taxable Supplies",
      taxable: inr(t31.taxableValue || t31.taxableAmount),
      igst: inr(t31.igst),
      cgst: inr(t31.cgst),
      sgst: inr(t31.sgst),
      cess: inr(t31.cess),
    });

    const itc = reportData.table4?.itcAvailable || reportData.table4_eligibleItc?.allOtherItc || {};
    rows.push({
      section: "4 (A) (5) All Other Eligible ITC",
      taxable: "-",
      igst: inr(itc.igst),
      cgst: inr(itc.cgst),
      sgst: inr(itc.sgst),
      cess: inr(itc.cess),
    });

    const netItc = reportData.table4?.netItcAvailable || reportData.table4_eligibleItc?.netItcAvailable || {};
    rows.push({
      section: "4 (C) Net ITC Available",
      taxable: "-",
      igst: inr(netItc.igst),
      cgst: inr(netItc.cgst),
      sgst: inr(netItc.sgst),
      cess: inr(netItc.cess),
    });

    const columns: ExportColumn[] = [
      { header: "GSTR-3B Table Schedule", key: "section", type: "string" },
      { header: "Taxable Value", key: "taxable", type: "string", align: "right" },
      { header: "IGST", key: "igst", type: "currency", align: "right" },
      { header: "CGST", key: "cgst", type: "currency", align: "right" },
      { header: "SGST", key: "sgst", type: "currency", align: "right" },
      { header: "Cess", key: "cess", type: "currency", align: "right" },
    ];

    const metadata: ExportMetadata = {
      ...baseMetadata,
      title: "GSTR-3B Monthly Statutory Self-Assessment",
      fileName: `GSTR3B_${startDate}_to_${endDate}`,
      summaryCards: [
        { label: "Outward Taxable Value", value: `₹${inr(t31.taxableValue || t31.taxableAmount)}` },
        { label: "Net ITC Available", value: `₹${inr(netItc.cgst ? Number(netItc.cgst) * 2 : 0)}`, color: "success" },
      ],
    };

    return await executeExport(format, columns, rows, metadata);
  }

  // 29. FALLBACK: GENERIC KEY-VALUE OR ARRAY OBJECT EXPORTER
  const rawList = Array.isArray(reportData)
    ? reportData
    : reportData.items || reportData.data || reportData.records || [];

  if (rawList.length > 0) {
    const sample = rawList[0];
    const columns: ExportColumn[] = Object.keys(sample).map((k) => ({
      header: k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
      key: k,
      type: typeof sample[k] === "number" ? "number" : "string",
      align: typeof sample[k] === "number" ? "right" : "left",
    }));

    const metadata: ExportMetadata = {
      ...baseMetadata,
      title: `${tab.replace(/[_\-]/g, " ").toUpperCase()} Report`,
      fileName: `${tab}_${startDate}_to_${endDate}`,
    };

    return await executeExport(format, columns, rawList, metadata);
  }

  // If reportData is an object with summary key-values
  const rows = Object.entries(reportData.summary || reportData.totals || reportData)
    .filter(([_, v]) => typeof v !== "object")
    .map(([k, v]) => ({
      field: k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
      value: v,
    }));

  const columns: ExportColumn[] = [
    { header: "Metric / Ledger Line", key: "field", type: "string" },
    { header: "Value", key: "value", type: "currency", align: "right" },
  ];

  const metadata: ExportMetadata = {
    ...baseMetadata,
    title: `${tab.replace(/[_\-]/g, " ").toUpperCase()} Summary`,
    fileName: `${tab}_${startDate}_to_${endDate}`,
  };

  return await executeExport(format, columns, rows, metadata);
}
