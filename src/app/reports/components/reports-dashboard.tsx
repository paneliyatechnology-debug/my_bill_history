"use client";

import { ReportsOverview } from "./reports-overview";

export type ReportCategoryKey =
  | "FAVOURITE"
  | "GST"
  | "TRANSACTION"
  | "ITEM"
  | "PARTY";

export type FilterChipTag =
  | "ALL"
  | "Party"
  | "Category"
  | "Payment Collection"
  | "Item"
  | "Invoice Details"
  | "Summary";

export interface ReportItem {
  id: string;
  tabId: string;
  name: string;
  nameGu: string;
  category: "GST" | "TRANSACTION" | "ITEM" | "PARTY";
  tags: FilterChipTag[];
  badge?: string;
  description?: string;
}

interface ReportsDashboardProps {
  lang: string;
  onSelectReport: (tabId: string, extra?: Record<string, string>) => void;
  onOpenCaSharing: () => void;
  startDate?: string;
  endDate?: string;
  preset?: string;
  onPreset?: (preset: string) => void;
  onCustomRange?: (from: string, to: string) => void;
  companyName?: string;
  financialYear?: string;
}

// Complete catalog matching MyBillBook Reports Dashboard
export const ALL_REPORTS: ReportItem[] = [
  // GST Category
  {
    id: "gstr-2",
    tabId: "purchase-register",
    name: "GSTR-2 (Purchase)",
    nameGu: "જીએસટીઆર-૨ ખરીદ રિટર્ન",
    category: "GST",
    tags: ["Invoice Details"],
    description: "Inward supplies & eligible Input Tax Credit (ITC)",
  },
  {
    id: "gstr-3b",
    tabId: "gstr-3b",
    name: "GSTR-3b",
    nameGu: "જીએસટીઆર-૩બી માસિક સારાંશ",
    category: "GST",
    tags: ["Summary"],
    description: "Monthly self-assessed tax return and payment",
  },
  {
    id: "gst-purchase-hsn",
    tabId: "gst-purchase-hsn",
    name: "GST Purchase (With HSN)",
    nameGu: "જીએસટી ખરીદી (HSN સાથે)",
    category: "GST",
    tags: ["Item", "Invoice Details"],
    description: "Purchase bills categorized by HSN/SAC codes",
  },
  {
    id: "gst-sales-hsn",
    tabId: "gst-sales-hsn",
    name: "GST Sales (With HSN)",
    nameGu: "જીએસટી વેચાણ (HSN સાથે)",
    category: "GST",
    tags: ["Item", "Invoice Details"],
    description: "Outward invoices with item-level tax slabs & HSN",
  },
  {
    id: "hsn-sales-summary",
    tabId: "hsn-sales-summary",
    name: "HSN Wise Sales Summary",
    nameGu: "HSN વાઈઝ વેચાણ સારાંશ",
    category: "GST",
    tags: ["Item", "Summary"],
    description: "Official Table 12 HSN outward quantities and taxes",
  },
  {
    id: "tds-payable",
    tabId: "trial-balance",
    name: "TDS Payable",
    nameGu: "TDS ચૂકવવાપાત્ર પત્રક",
    category: "GST",
    tags: ["Summary"],
    description: "Tax Deducted at Source liability balance",
  },
  {
    id: "tds-receivable",
    tabId: "trial-balance",
    name: "TDS Receivable",
    nameGu: "TDS મળવાપાત્ર પત્રક",
    category: "GST",
    tags: ["Summary"],
    description: "Tax deducted by customers against invoices",
  },
  {
    id: "tcs-payable",
    tabId: "trial-balance",
    name: "TCS Payable",
    nameGu: "TCS ચૂકવવાપાત્ર",
    category: "GST",
    tags: ["Summary"],
    description: "Tax Collected at Source on specified supplies",
  },
  {
    id: "tcs-receivable",
    tabId: "trial-balance",
    name: "TCS Receivable",
    nameGu: "TCS મળવાપાત્ર",
    category: "GST",
    tags: ["Summary"],
    description: "TCS credited by suppliers on heavy purchases",
  },

  // Transaction Category
  {
    id: "audit-trail",
    tabId: "audit-trail",
    name: "Audit Trail",
    nameGu: "ઓડિટ ટ્રેઇલ & ક્રિયા લોગ",
    category: "TRANSACTION",
    tags: ["Invoice Details"],
    description: "Statutory edit, cancel, and creation timestamp log",
  },
  {
    id: "bill-wise-profit",
    tabId: "bill-wise-profit",
    name: "Bill Wise Profit",
    nameGu: "બીલ દીઠ નફો અને માર્જિન",
    category: "TRANSACTION",
    tags: ["Category", "Invoice Details", "Summary"],
    description: "Invoice-by-invoice gross profit calculation",
  },
  {
    id: "cash-bank-report",
    tabId: "receipt-payment",
    name: "Cash and Bank Report (All Payments)",
    nameGu: "રોકડ અને બેંક ખાતાવહી (તમામ વ્યવહાર)",
    category: "TRANSACTION",
    tags: ["Payment Collection"],
    description: "Complete inward & outward bank/cash register",
  },
  {
    id: "daybook",
    tabId: "daybook",
    name: "Daybook",
    nameGu: "રોજમેળ (Rojmel / Daybook)",
    category: "TRANSACTION",
    tags: ["Payment Collection", "Summary"],
    description: "Chronological daily ledger of all transactions",
  },
  {
    id: "expense-category",
    tabId: "expense-category",
    name: "Expense Category Report",
    nameGu: "ખર્ચ કેટેગરી પત્રક",
    category: "TRANSACTION",
    tags: ["Category", "Summary"],
    description: "Operational expenditure categorized by account",
  },
  {
    id: "expense-transaction",
    tabId: "receipt-payment",
    name: "Expense Transaction Report",
    nameGu: "ખર્ચ વ્યવહારો પત્રક",
    category: "TRANSACTION",
    tags: ["Category", "Payment Collection"],
    description: "Detailed voucher entries for business expenses",
  },
  {
    id: "purchase-summary",
    tabId: "purchase-summary",
    name: "Purchase Summary",
    nameGu: "ખરીદી સારાંશ પત્રક",
    category: "TRANSACTION",
    tags: ["Summary"],
    description: "Monthly and supplier-wise aggregate purchase volumes",
  },

  // Item Category
  {
    id: "item-report-party",
    tabId: "item-sales-report",
    name: "Item Report By Party",
    nameGu: "પાર્ટી વાઇઝ આઇટમ વેચાણ",
    category: "ITEM",
    tags: ["Item", "Party"],
    description: "Product sales breakdown for each client/customer",
  },
  {
    id: "item-sales-purchase-summary",
    tabId: "item-sales-report",
    name: "Item Sales and Purchase Summary",
    nameGu: "આઇટમ વેચાણ અને ખરીદી સારાંશ",
    category: "ITEM",
    tags: ["Item", "Summary"],
    description: "Combined inward and outward movement per item",
  },
  {
    id: "low-stock-summary",
    tabId: "low-stock-alert",
    name: "Low Stock Summary",
    nameGu: "ઓછા સ્ટોકની સારાંશ પત્રક",
    category: "ITEM",
    tags: ["Item", "Summary"],
    description: "Items that have breached the minimum reorder threshold",
  },
  {
    id: "rate-list",
    tabId: "stock-summary",
    name: "Rate List",
    nameGu: "ભાવ પત્રક (Rate List)",
    category: "ITEM",
    tags: ["Item"],
    description: "Active wholesale and retail selling prices for all items",
  },
  {
    id: "stock-detail-report",
    tabId: "stock-movement",
    name: "Stock Detail Report",
    nameGu: "સ્ટોક વિગતવાર અહેવાલ",
    category: "ITEM",
    tags: ["Item"],
    description: "Item batch receipts, dispatches and quantity adjustments",
  },
  {
    id: "stock-summary",
    tabId: "stock-summary",
    name: "Stock Summary",
    nameGu: "સ્ટોક સિલક રિપોર્ટ",
    category: "ITEM",
    tags: ["Item", "Summary"],
    description: "Current on-hand quantities, reorder levels & valuation",
  },
  {
    id: "stock-summary-godown",
    tabId: "stock-summary",
    name: "Stock Summary - Godown wise",
    nameGu: "ગોડાઉન મુજબ સ્ટોક સારાંશ",
    category: "ITEM",
    tags: ["Item"],
    description: "Warehouse and godown segregated stock quantities",
  },

  // Party Category
  {
    id: "receivable-ageing",
    tabId: "party-aging",
    name: "Receivable Ageing Report",
    nameGu: "ઉઘરાણી મુદત વિશ્લેષણ (૩૦/૬૦/૯૦+ દિવસ)",
    category: "PARTY",
    tags: ["Party", "Summary"],
    description: "Aging analysis of unpaid bills by customer",
  },
  {
    id: "party-report-item",
    tabId: "party-sales-report",
    name: "Party Report By Item",
    nameGu: "આઇટમ મુજબ પાર્ટી ખાતાવહી",
    category: "PARTY",
    tags: ["Party", "Item"],
    description: "Order frequency and volume by business customer",
  },
  {
    id: "party-statement",
    tabId: "party-ledger",
    name: "Party Statement (Ledger)",
    nameGu: "પાર્ટી ખાતાવહી (Khata Ledger)",
    category: "PARTY",
    tags: ["Party"],
    description: "Comprehensive debit/credit ledger statement for parties",
  },
  {
    id: "party-wise-outstanding",
    tabId: "outstanding",
    name: "Party Wise Outstanding",
    nameGu: "બાકી સિલક (લેણાં-દેવાં)",
    category: "PARTY",
    tags: ["Party", "Payment Collection"],
    description: "Consolidated balances of all debtors and creditors",
  },
  {
    id: "sales-summary-category",
    tabId: "sales-summary",
    name: "Sales Summary - Category Wise",
    nameGu: "કેટેગરી મુજબ વેચાણ સારાંશ",
    category: "PARTY",
    tags: ["Category", "Summary"],
    description: "Product category revenue volume and turnover",
  },

  // Additional Special Master Reports
  {
    id: "balance-sheet",
    tabId: "balance-sheet",
    name: "Balance Sheet",
    nameGu: "પાકું સરવૈયું (Paku Sarvaiyu)",
    category: "TRANSACTION",
    tags: ["Summary", "Category"],
    description: "Assets, liabilities, and capital position statement",
  },
  {
    id: "gstr-1",
    tabId: "gstr-1",
    name: "GSTR-1 (Sales)",
    nameGu: "જીએસટીઆર-૧ વેચાણ રિટર્ન",
    category: "GST",
    tags: ["Invoice Details", "Summary"],
    description: "B2B, B2C, HSN summary & tax outward register",
  },
  {
    id: "profit-loss",
    tabId: "profit-loss",
    name: "Profit And Loss Report",
    nameGu: "નફા-નુકસાન ખાતું (P&L Account)",
    category: "TRANSACTION",
    tags: ["Summary", "Category"],
    description: "Gross profit, indirect expenses & net business earnings",
  },
  {
    id: "sales-summary",
    tabId: "sales-summary",
    name: "Sales Summary",
    nameGu: "વેચાણ સારાંશ (કર્મચારી/બ્રાન્ચ વાઇઝ)",
    category: "TRANSACTION",
    tags: ["Summary"],
    description: "Aggregate monthly/daily sales volumes & collections",
  },
];

export function ReportsDashboard(props: ReportsDashboardProps) {
  return <ReportsOverview {...props} />;
}
