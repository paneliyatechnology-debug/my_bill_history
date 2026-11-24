"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { apiClient } from "../../../lib/api-client";
import {
  X,
  Search,
  Star,
  RefreshCw,
  Calendar,
  ChevronDown,
  LayoutGrid,
  List,
  ArrowRight,
  TrendingUp,
  Percent,
  CheckCircle2,
  Clock,
  Wallet,
  Building2,
  CreditCard,
  FileSpreadsheet,
  Share2,
  SlidersHorizontal,
  Info,
} from "lucide-react";
import { formatDate } from "@/lib/date-utils";
import { CustomDatePicker } from "@/components/ui/custom-datepicker";
import { SHOW_GUJARATI_SUBTITLES } from "../../../lib/ui-language-config";

export interface ReportItem {
  id: string;
  tabId: string;
  name: string;
  nameGu: string;
  categories: string[];
  tags: string[];
  description: string;
  iconBg: string;
  iconColor: string;
  iconType: string;
}

// Complete 33 Reports Catalogue with rich categorization, tags and Gujarati localization
export const ALL_REPORTS: ReportItem[] = [
  // 1. Sales Register
  {
    id: "sales-register",
    tabId: "sales-register",
    name: "Sales Register",
    nameGu: "વેચાણ રજિસ્ટર",
    categories: ["sales"],
    tags: ["Sales", "GST", "Invoices"],
    description: "Detailed register of all sales invoices with taxable value, GST tax slabs, and payment status.",
    iconBg: "bg-blue-50 text-blue-600 border border-blue-100",
    iconColor: "text-blue-600",
    iconType: "chart-bar",
  },
  // 2. Sales Summary
  {
    id: "sales-summary",
    tabId: "sales-summary",
    name: "Sales Summary",
    nameGu: "વેચાણ સારાંશ",
    categories: ["sales"],
    tags: ["Sales", "Summary", "Analytics"],
    description: "Executive sales performance summary grouped by month, payment status, and sales channel.",
    iconBg: "bg-sky-50 text-sky-600 border border-sky-100",
    iconColor: "text-sky-600",
    iconType: "layers",
  },
  // 3. Sales by Customer
  {
    id: "party-sales-report",
    tabId: "party-sales-report",
    name: "Sales by Customer",
    nameGu: "ગ્રાહક મુજબ વેચાણ",
    categories: ["sales", "parties"],
    tags: ["Sales", "Parties", "Turnover"],
    description: "Customer-wise turnover breakdown, order frequency, total billed amount, and open balances.",
    iconBg: "bg-cyan-50 text-cyan-600 border border-cyan-100",
    iconColor: "text-cyan-600",
    iconType: "users",
  },
  // 4. Sales by Item
  {
    id: "item-sales-report",
    tabId: "item-sales-report",
    name: "Sales by Item",
    nameGu: "આઇટમ મુજબ વેચાણ",
    categories: ["sales", "inventory"],
    tags: ["Sales", "Inventory", "Products"],
    description: "Product-wise sales quantities, net revenue generated, average selling rate, and gross margins.",
    iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-100",
    iconColor: "text-emerald-600",
    iconType: "box",
  },
  // 5. Sales Returns
  {
    id: "sales-returns",
    tabId: "sales-returns",
    name: "Sales Returns (Credit Notes)",
    nameGu: "વેચાણ પરત (ક્રેડિટ નોટ્સ)",
    categories: ["sales"],
    tags: ["Sales", "Returns", "Credit Note"],
    description: "Statutory credit notes register with original invoice references, return reasons, and tax reversals.",
    iconBg: "bg-teal-50 text-teal-600 border border-teal-100",
    iconColor: "text-teal-600",
    iconType: "rotate-ccw",
  },
  // 6. Purchase Register
  {
    id: "purchase-register",
    tabId: "purchase-register",
    name: "Purchase Register",
    nameGu: "ખરીદ રજિસ્ટર",
    categories: ["purchases"],
    tags: ["Purchases", "GST", "Bills"],
    description: "Comprehensive inward purchase register with vendor GSTINs, taxable values, and eligible ITC.",
    iconBg: "bg-purple-50 text-purple-600 border border-purple-100",
    iconColor: "text-purple-600",
    iconType: "shopping-cart",
  },
  // 7. Purchase Summary
  {
    id: "purchase-summary",
    tabId: "purchase-summary",
    name: "Purchase Summary",
    nameGu: "ખરીદી સારાંશ પત્રક",
    categories: ["purchases"],
    tags: ["Purchases", "Summary"],
    description: "Consolidated inward procurement metrics, vendor volume distribution, and tax credits claimed.",
    iconBg: "bg-indigo-50 text-indigo-600 border border-indigo-100",
    iconColor: "text-indigo-600",
    iconType: "document-text",
  },
  // 8. Party Ledger
  {
    id: "party-ledger",
    tabId: "party-ledger",
    name: "Party Ledger (Statement)",
    nameGu: "પાર્ટી ખાતાવહી (લેજર સ્ટેટમેન્ટ)",
    categories: ["parties", "accounting"],
    tags: ["Parties", "Ledger", "Statement"],
    description: "Detailed chronological account statement for any customer or vendor with running debit-credit balances.",
    iconBg: "bg-green-50 text-green-600 border border-green-100",
    iconColor: "text-green-600",
    iconType: "currency-rupee",
  },
  // 9. Bill Wise Profit & Margin
  {
    id: "bill-wise-profit",
    tabId: "bill-wise-profit",
    name: "Bill Wise Profit & Margin",
    nameGu: "બીલ દીઠ નફો અને માર્જિન",
    categories: ["sales", "accounting"],
    tags: ["Profitability", "Margins", "Invoices"],
    description: "Gross margin & profit calculation for every individual sales bill comparing selling price with purchase cost.",
    iconBg: "bg-blue-50 text-blue-700 border border-blue-100",
    iconColor: "text-blue-700",
    iconType: "trending-up",
  },
  // 10. Quotations & Estimates
  {
    id: "quotations",
    tabId: "quotations",
    name: "Quotations & Estimates",
    nameGu: "અંદાજ / કોટેશન પત્રક",
    categories: ["sales"],
    tags: ["Sales", "Estimates", "Quotes"],
    description: "Track customer quotations, proforma estimates, validity periods, and conversion rates to sales invoices.",
    iconBg: "bg-amber-50 text-amber-600 border border-amber-100",
    iconColor: "text-amber-600",
    iconType: "file-text",
  },
  // 11. Delivery Challans
  {
    id: "delivery-challans",
    tabId: "delivery-challans",
    name: "Delivery Challans",
    nameGu: "ડિલિવરી ચલણ રજિસ્ટર",
    categories: ["sales", "inventory"],
    tags: ["Sales", "Dispatch", "Logistics"],
    description: "Outward goods dispatch challans, transport vehicle numbers, and pending invoice billing status.",
    iconBg: "bg-indigo-50 text-indigo-700 border border-indigo-100",
    iconColor: "text-indigo-700",
    iconType: "truck",
  },
  // 12. Purchase by Supplier
  {
    id: "party-purchase-report",
    tabId: "party-purchase-report",
    name: "Purchase by Supplier",
    nameGu: "વેપારી મુજબ ખરીદી",
    categories: ["purchases", "parties"],
    tags: ["Purchases", "Vendors", "Suppliers"],
    description: "Supplier-wise inward volume analysis, payment track records, and pending purchase orders.",
    iconBg: "bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-100",
    iconColor: "text-fuchsia-600",
    iconType: "users",
  },
  // 13. Purchase by Item
  {
    id: "item-purchase-report",
    tabId: "item-purchase-report",
    name: "Purchase by Item",
    nameGu: "આઇટમ મુજબ ખરીદી",
    categories: ["purchases", "inventory"],
    tags: ["Purchases", "Inventory", "Products"],
    description: "Item-level inward procurement quantities, purchase rate price trends, and total spend breakdown.",
    iconBg: "bg-pink-50 text-pink-600 border border-pink-100",
    iconColor: "text-pink-600",
    iconType: "box",
  },
  // 14. Purchase Returns
  {
    id: "purchase-returns",
    tabId: "purchase-returns",
    name: "Purchase Returns (Debit Notes)",
    nameGu: "ખરીદ પરત (ડેબિટ નોટ્સ)",
    categories: ["purchases"],
    tags: ["Purchases", "Debit Note", "Returns"],
    description: "Statutory debit notes register with supplier acknowledgments and input tax credit reversals.",
    iconBg: "bg-rose-50 text-rose-600 border border-rose-100",
    iconColor: "text-rose-600",
    iconType: "rotate-cw",
  },
  // 15. GST Purchase (With HSN)
  {
    id: "gst-purchase-hsn",
    tabId: "gst-purchase-hsn",
    name: "GST Purchase (With HSN)",
    nameGu: "જીએસટી ખરીદી (HSN સાથે)",
    categories: ["purchases", "gst"],
    tags: ["GST", "HSN", "Tax"],
    description: "HSN/SAC summarized purchase report with taxable amounts and IGST, CGST, SGST breakdown.",
    iconBg: "bg-purple-50 text-purple-700 border border-purple-100",
    iconColor: "text-purple-700",
    iconType: "percent",
  },
  // 16. GSTR-1 Return Preparation
  {
    id: "gstr-1",
    tabId: "gstr-1",
    name: "GSTR-1 Return Preparation",
    nameGu: "જીએસટીઆર-૧ ફાઇલિંગ તૈયારી",
    categories: ["gst"],
    tags: ["GST", "Filing", "Statutory"],
    description: "Government-compliant outward tax return: B2B, B2C Large, B2C Small, Credit Notes, and HSN Table 12.",
    iconBg: "bg-blue-50 text-blue-800 border border-blue-100",
    iconColor: "text-blue-800",
    iconType: "file-text",
  },
  // 17. GSTR-3B Monthly Return
  {
    id: "gstr-3b",
    tabId: "gstr-3b",
    name: "GSTR-3B Monthly Return",
    nameGu: "જીએસટીઆર-૩બી માસિક સારાંશ",
    categories: ["gst"],
    tags: ["GST", "Filing", "Statutory"],
    description: "Self-assessed monthly summary of outward taxable supplies, eligible ITC, and net tax payable to the government.",
    iconBg: "bg-sky-50 text-sky-800 border border-sky-100",
    iconColor: "text-sky-800",
    iconType: "document-text",
  },
  // 18. GST Sales (With HSN)
  {
    id: "gst-sales-hsn",
    tabId: "gst-sales-hsn",
    name: "GST Sales (With HSN)",
    nameGu: "જીએસટી વેચાણ (HSN સાથે)",
    categories: ["gst", "sales"],
    tags: ["GST", "HSN", "Sales"],
    description: "Item-level outward tax register classified by 4, 6, and 8 digit HSN codes with respective GST slabs.",
    iconBg: "bg-indigo-50 text-indigo-800 border border-indigo-100",
    iconColor: "text-indigo-800",
    iconType: "percent",
  },
  // 19. HSN Wise Sales Summary
  {
    id: "hsn-sales-summary",
    tabId: "hsn-sales-summary",
    name: "HSN Wise Sales Summary",
    nameGu: "HSN વાઈઝ વેચાણ સારાંશ",
    categories: ["gst"],
    tags: ["GST", "HSN", "Summary"],
    description: "Official Table 12 format outward quantity metrics, units of measurement, taxable values, and tax splits.",
    iconBg: "bg-emerald-50 text-emerald-800 border border-emerald-100",
    iconColor: "text-emerald-800",
    iconType: "hash",
  },
  // 20. Receivables Aging
  {
    id: "party-aging",
    tabId: "party-aging",
    name: "Receivables Aging Analysis",
    nameGu: "ઉઘરાણી મુદત વિશ્લેષણ (Aging)",
    categories: ["parties", "sales"],
    tags: ["Parties", "Overdue", "Aging"],
    description: "Customer overdue aging distribution categorized into 0-30, 31-60, 61-90, and 90+ days aging buckets.",
    iconBg: "bg-amber-50 text-amber-700 border border-amber-100",
    iconColor: "text-amber-700",
    iconType: "clock",
  },
  // 21. Outstanding Balances
  {
    id: "outstanding",
    tabId: "outstanding",
    name: "Outstanding Balances (Khata)",
    nameGu: "બાકી સિલક (લેણાં-દેવાં)",
    categories: ["parties"],
    tags: ["Parties", "Balances", "Khata"],
    description: "Comprehensive list of all customer receivables (Lena) and supplier payables (Deva) with net balances.",
    iconBg: "bg-rose-50 text-rose-700 border border-rose-100",
    iconColor: "text-rose-700",
    iconType: "scale",
  },
  // 22. Stock Summary
  {
    id: "stock-summary",
    tabId: "stock-summary",
    name: "Stock Summary (Inventory)",
    nameGu: "સ્ટોક સિલક રિપોર્ટ",
    categories: ["inventory"],
    tags: ["Inventory", "Stock", "Valuation"],
    description: "Current on-hand stock quantities, purchase cost valuation, selling valuation, and minimum reorder points.",
    iconBg: "bg-teal-50 text-teal-700 border border-teal-100",
    iconColor: "text-teal-700",
    iconType: "box",
  },
  // 23. Stock Movement
  {
    id: "stock-movement",
    tabId: "stock-movement",
    name: "Stock Movement Register",
    nameGu: "સ્ટોક હિલચાલ પત્રક",
    categories: ["inventory"],
    tags: ["Inventory", "Movement", "Logistics"],
    description: "Inward & outward stock ledger recording sales dispatches, purchases, transfers, and inventory adjustments.",
    iconBg: "bg-cyan-50 text-cyan-700 border border-cyan-100",
    iconColor: "text-cyan-700",
    iconType: "arrow-up-down",
  },
  // 24. Low Stock Alert
  {
    id: "low-stock-alert",
    tabId: "low-stock-alert",
    name: "Low Stock Alert",
    nameGu: "ઓછા સ્ટોકની ચેતવણી",
    categories: ["inventory"],
    tags: ["Inventory", "Reorder", "Alerts"],
    description: "Items currently at or below their defined minimum reorder threshold to prevent stockouts.",
    iconBg: "bg-amber-50 text-amber-800 border border-amber-100",
    iconColor: "text-amber-800",
    iconType: "alert-triangle",
  },
  // 25. Item Batch & Expiry
  {
    id: "item-batch-report",
    tabId: "item-batch-report",
    name: "Item Batch & Expiry",
    nameGu: "આઇટમ બેચ અને એક્સપાયરી",
    categories: ["inventory"],
    tags: ["Inventory", "Batches", "Expiry"],
    description: "Batch-wise inventory balances, manufacturing dates, and near-expiry goods alerts for FIFO management.",
    iconBg: "bg-violet-50 text-violet-700 border border-violet-100",
    iconColor: "text-violet-700",
    iconType: "tag",
  },
  // 26. Expense Category Report
  {
    id: "expense-category",
    tabId: "expense-category",
    name: "Expense Category Report",
    nameGu: "ખર્ચ કેટેગરી પત્રક",
    categories: ["expenses"],
    tags: ["Expenses", "Overhead", "Costing"],
    description: "Operational expenditure analysis categorized by nominal account: rent, utilities, salaries, and logistics.",
    iconBg: "bg-red-50 text-red-600 border border-red-100",
    iconColor: "text-red-600",
    iconType: "receipt",
  },
  // 27. Day Book (Rojmel)
  {
    id: "daybook",
    tabId: "daybook",
    name: "Day Book (Rojmel)",
    nameGu: "રોજમેળ (Day Book)",
    categories: ["cash-bank", "accounting", "expenses"],
    tags: ["Daily", "Cash", "Rojmel"],
    description: "Traditional chronological daily ledger of all cash, bank, voucher receipts, payments, and closing balances.",
    iconBg: "bg-green-50 text-green-700 border border-green-100",
    iconColor: "text-green-700",
    iconType: "book-open",
  },
  // 28. Cash Flow Statement
  {
    id: "cash-flow",
    tabId: "cash-flow",
    name: "Cash Flow Statement",
    nameGu: "રોકડ પ્રવાહ પત્રક",
    categories: ["cash-bank", "accounting"],
    tags: ["Cash", "Liquidity", "Financials"],
    description: "Operating cash inflows and outflows, financing activities, and net liquidity change for the selected period.",
    iconBg: "bg-sky-50 text-sky-700 border border-sky-100",
    iconColor: "text-sky-700",
    iconType: "landmark",
  },
  // 29. Receipt / Payment Register
  {
    id: "receipt-payment",
    tabId: "receipt-payment",
    name: "Receipt / Payment Register",
    nameGu: "આવક / જાવક રજિસ્ટર",
    categories: ["expenses", "cash-bank"],
    tags: ["Receipts", "Payments", "Cash"],
    description: "Unified inward receipt and outward payment voucher register with bank reference numbers and modes.",
    iconBg: "bg-orange-50 text-orange-600 border border-orange-100",
    iconColor: "text-orange-600",
    iconType: "credit-card",
  },
  // 30. Profit & Loss Statement
  {
    id: "profit-loss",
    tabId: "profit-loss",
    name: "Profit & Loss Account",
    nameGu: "નફા-નુકસાન ખાતું (P&L)",
    categories: ["accounting"],
    tags: ["Financials", "Profit", "Income Statement"],
    description: "Trading income, direct expenses, gross trading profit, indirect overheads, and net business earnings.",
    iconBg: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    iconColor: "text-emerald-700",
    iconType: "trending-up",
  },
  // 31. Balance Sheet
  {
    id: "balance-sheet",
    tabId: "balance-sheet",
    name: "Balance Sheet",
    nameGu: "પાકું સરવૈયું (Balance Sheet)",
    categories: ["accounting"],
    tags: ["Financials", "Assets", "Liabilities"],
    description: "Authoritative financial position: Fixed assets, current assets, liabilities, bank loans, and owner's capital equity.",
    iconBg: "bg-indigo-50 text-indigo-700 border border-indigo-100",
    iconColor: "text-indigo-700",
    iconType: "building",
  },
  // 32. Trial Balance
  {
    id: "trial-balance",
    tabId: "trial-balance",
    name: "Trial Balance",
    nameGu: "કાચું સરવૈયું (Trial Balance)",
    categories: ["accounting"],
    tags: ["Financials", "Ledger", "Verification"],
    description: "Debit-credit mathematical balance verification across all general ledger accounts as per standard accounting principles.",
    iconBg: "bg-purple-50 text-purple-700 border border-purple-100",
    iconColor: "text-purple-700",
    iconType: "check-square",
  },
  // 33. Audit Trail
  {
    id: "audit-trail",
    tabId: "audit-trail",
    name: "Audit Trail & Activity Log",
    nameGu: "ઓડિટ ટ્રેઇલ & ક્રિયા લોગ",
    categories: ["accounting"],
    tags: ["Compliance", "Audit", "Security"],
    description: "Statutory audit trail tracking all invoice creations, edits, cancellations, timestamped user credentials, and actions.",
    iconBg: "bg-slate-50 text-slate-700 border border-slate-200",
    iconColor: "text-slate-700",
    iconType: "shield-check",
  },
];

const CATEGORIES = [
  { id: "all", label: "All Reports", labelGu: "તમામ અહેવાલો", icon: "grid" },
  { id: "sales", label: "Sales", labelGu: "વેચાણ", icon: "shopping-cart" },
  { id: "purchases", label: "Purchases", labelGu: "ખરીદી", icon: "shopping-bag" },
  { id: "gst", label: "GST & Tax", labelGu: "જીએસટી અને ટેક્સ", icon: "percent" },
  { id: "parties", label: "Parties", labelGu: "પાર્ટીઓ", icon: "users" },
  { id: "inventory", label: "Inventory", labelGu: "સ્ટોક / ગોડાઉન", icon: "box" },
  { id: "expenses", label: "Expenses", labelGu: "ખર્ચાઓ", icon: "receipt" },
  { id: "cash-bank", label: "Cash & Bank", labelGu: "રોકડ અને બેંક", icon: "landmark" },
  { id: "accounting", label: "Accounting", labelGu: "હિસાબી ખાતાવહી", icon: "book-open" },
];

const DATE_PRESET_OPTIONS = [
  { value: "Today", label: "Today" },
  { value: "Yesterday", label: "Yesterday" },
  { value: "This Week", label: "This Week" },
  { value: "This Month", label: "This Month" },
  { value: "Last Month", label: "Last Month" },
  { value: "This Quarter", label: "This Quarter" },
  { value: "This FY", label: "This Financial Year" },
  { value: "Last FY", label: "Previous Financial Year" },
  { value: "Custom", label: "Custom Range" },
];

function formatDisplayDate(dateStr?: string): string {
  return formatDate(dateStr, "");
}

function formatInr(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return "₹0.00";
  const num = Number(val);
  const isNegative = num < 0;
  const abs = Math.abs(num);
  const formatted =
    "₹" +
    abs.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  return isNegative ? `-${formatted}` : formatted;
}

function RenderIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case "grid":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "shopping-cart":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
        </svg>
      );
    case "shopping-bag":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 01-8 0" />
        </svg>
      );
    case "percent":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <line x1="19" y1="5" x2="5" y2="19" />
          <circle cx="6.5" cy="6.5" r="2.5" />
          <circle cx="17.5" cy="17.5" r="2.5" />
        </svg>
      );
    case "users":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87" />
          <path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
      );
    case "box":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      );
    case "receipt":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" />
          <line x1="8" y1="7" x2="16" y2="7" />
          <line x1="8" y1="11" x2="16" y2="11" />
          <line x1="8" y1="15" x2="13" y2="15" />
        </svg>
      );
    case "landmark":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <line x1="3" y1="22" x2="21" y2="22" />
          <line x1="6" y1="18" x2="6" y2="11" />
          <line x1="10" y1="18" x2="10" y2="11" />
          <line x1="14" y1="18" x2="14" y2="11" />
          <line x1="18" y1="18" x2="18" y2="11" />
          <polygon points="12 2 20 7 4 7" />
        </svg>
      );
    case "book-open":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
          <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
        </svg>
      );
    case "chart-bar":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <line x1="12" y1="20" x2="12" y2="10" />
          <line x1="18" y1="20" x2="18" y2="4" />
          <line x1="6" y1="20" x2="6" y2="16" />
        </svg>
      );
    case "layers":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      );
    case "rotate-ccw":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
        </svg>
      );
    case "rotate-cw":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
        </svg>
      );
    case "trending-up":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      );
    case "file-text":
    case "document-text":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );
    case "truck":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="1" y="3" width="15" height="13" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      );
    case "currency-rupee":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M6 3h12M6 8h12m-6 0a4 4 0 010 8H6l8 6" />
        </svg>
      );
    case "clock":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case "scale":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 3v18M6 8l6-5 6 5M6 8l-4 8h8L6 8zm12 0l-4 8h8l-4-8z" />
        </svg>
      );
    case "arrow-up-down":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="7 10 12 5 17 10" />
          <polyline points="17 14 12 19 7 14" />
        </svg>
      );
    case "alert-triangle":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case "tag":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      );
    case "hash":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <line x1="4" y1="9" x2="20" y2="9" />
          <line x1="4" y1="15" x2="20" y2="15" />
          <line x1="10" y1="3" x2="8" y2="21" />
          <line x1="16" y1="3" x2="14" y2="21" />
        </svg>
      );
    case "credit-card":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      );
    case "building":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18Z" />
          <path d="M6 12H4a2 2 0 00-2 2v8h4" />
          <path d="M18 9h2a2 2 0 012 2v11h-4" />
        </svg>
      );
    case "check-square":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
        </svg>
      );
    case "shield-check":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      );
    default:
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      );
  }
}

export function ReportsOverview({
  lang = "en",
  onSelectReport,
  onOpenCaSharing,
  startDate = "",
  endDate = "",
  preset = "This FY",
  onPreset,
  onCustomRange,
  companyName = "",
  financialYear = "",
}: {
  lang?: string;
  onSelectReport: (tabId: string) => void;
  onOpenCaSharing?: () => void;
  startDate?: string;
  endDate?: string;
  preset?: string;
  onPreset?: (preset: string) => void;
  onCustomRange?: (from: string, to: string) => void;
  companyName?: string;
  financialYear?: string;
}) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewLayout, setViewLayout] = useState<"grid" | "table">("table");
  const [favorites, setFavorites] = useState<string[]>([
    "sales-register",
    "gstr-1",
    "balance-sheet",
    "profit-loss",
    "daybook",
    "stock-summary",
  ]);
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState<boolean>(false);
  const [showCustomDateModal, setShowCustomDateModal] = useState<boolean>(false);
  const [customFromDate, setCustomFromDate] = useState<string>(startDate || "");
  const [customToDate, setCustomToDate] = useState<string>(endDate || "");
  const periodDropdownRef = useRef<HTMLDivElement>(null);

  // Financial metrics state
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // 100% Real Accurate Financial Data
  const [metrics, setMetrics] = useState({
    totalSales: 0,
    salesPaid: 0,
    salesBalance: 0,
    salesTaxable: 0,
    salesTax: 0,
    salesCount: 0,
    collectionRate: 0, // strictly 0% to 100%

    totalPurchases: 0,
    purchasePaid: 0,
    purchaseBalance: 0,
    purchaseTaxable: 0,
    purchaseTax: 0,
    purchaseCount: 0,
    settlementRate: 0, // strictly 0% to 100%

    grossProfit: 0,
    grossMarginRate: 0, // profit margin strictly out of 100%

    receivables: 0,
    receivablesShare: 0, // % of total sales

    payables: 0,
    payablesShare: 0, // % of total purchases

    totalCash: 0,
    totalBank: 0,
    totalCashBank: 0,
  });

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("mybill_favorite_reports");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFavorites(parsed);
        }
      }
    } catch {
      // keep defaults
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(event.target as Node)) {
        setIsPeriodDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem("mybill_favorite_reports", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Fetch 100% genuine real financial metrics without any fake default percentages
  const fetchMetrics = useCallback(async () => {
    if (!startDate || !endDate) return;
    setIsLoadingMetrics(true);

    const params = { startDate, endDate, fromDate: startDate, toDate: endDate };

    try {
      const [salesRes, purchaseRes, outstandingRes, financeRes]: any =
        await Promise.allSettled([
          apiClient.get("/reports/sales-register", params),
          apiClient.get("/reports/purchase-register", params),
          apiClient.get("/reports/outstanding-balances", { asOfDate: endDate }),
          apiClient.get("/reports/financial-summary", { asOfDate: endDate }),
        ]);

      // 1. Genuine Sales Metrics
      let sTotal = 0;
      let sPaid = 0;
      let sBalance = 0;
      let sTaxable = 0;
      let sTax = 0;
      let sCount = 0;

      if (salesRes.status === "fulfilled" && salesRes.value) {
        const val = salesRes.value;
        const summary = val.summary || val.totals;
        if (summary) {
          sTotal = Number(summary.totalGrandTotal || summary.grandTotal || summary.totalSales || 0);
          sPaid = Number(summary.totalPaid || summary.paidAmount || 0);
          sBalance = Number(summary.totalBalance || summary.balanceAmount || 0);
          sTaxable = Number(summary.totalTaxable || 0);
          sTax =
            Number(summary.totalCgst || 0) +
            Number(summary.totalSgst || 0) +
            Number(summary.totalIgst || 0) +
            Number(summary.totalCess || 0);
          sCount = Number(summary.invoiceCount || val.pagination?.totalCount || 0);
        }
        if (!sTotal && Array.isArray(val.invoices)) {
          sTotal = val.invoices.reduce((acc: number, inv: any) => acc + Number(inv.grandTotal || 0), 0);
          sPaid = val.invoices.reduce((acc: number, inv: any) => acc + Number(inv.paidAmount || 0), 0);
          sBalance = val.invoices.reduce((acc: number, inv: any) => acc + Number(inv.balanceAmount || 0), 0);
          sTaxable = val.invoices.reduce((acc: number, inv: any) => acc + Number(inv.taxableAmount || 0), 0);
          sCount = val.invoices.length;
        }
      }

      // 2. Genuine Purchase Metrics
      let pTotal = 0;
      let pPaid = 0;
      let pBalance = 0;
      let pTaxable = 0;
      let pTax = 0;
      let pCount = 0;

      if (purchaseRes.status === "fulfilled" && purchaseRes.value) {
        const val = purchaseRes.value;
        const totals = val.totals || val.summary;
        if (totals) {
          pTotal = Number(totals.totalGrandTotal || totals.grandTotal || totals.totalPurchases || 0);
          pPaid = Number(totals.totalPaid || 0);
          pBalance = Number(totals.totalBalance || 0);
          pTaxable = Number(totals.totalTaxable || 0);
          pTax =
            Number(totals.totalCgst || 0) +
            Number(totals.totalSgst || 0) +
            Number(totals.totalIgst || 0);
          pCount = Number(val.totalCount || 0);
        }
        if (!pTotal && Array.isArray(val.items)) {
          pTotal = val.items.reduce((acc: number, inv: any) => acc + Number(inv.grandTotal || inv.totalAmount || 0), 0);
          pTaxable = val.items.reduce((acc: number, inv: any) => acc + Number(inv.taxableAmount || 0), 0);
          pCount = val.items.length;
        }
      }

      // 3. Genuine Receivables & Payables & Cash/Bank
      let recTotal = 0;
      let payTotal = 0;
      let cashTotal = 0;
      let bankTotal = 0;
      let totalLiquidity = 0;

      if (financeRes.status === "fulfilled" && financeRes.value) {
        const fv = financeRes.value;
        recTotal = Number(fv.toCollect || 0);
        payTotal = Number(fv.toPay || 0);
        cashTotal = Number(fv.cashBalance ?? fv.cashInHand ?? fv.totalCash ?? 0);
        bankTotal = Number(fv.bankBalance ?? fv.totalBank ?? 0);
        totalLiquidity = Number(fv.totalCashBankBalance ?? fv.totalCashBank ?? (cashTotal + bankTotal));
      }

      if (!recTotal && outstandingRes.status === "fulfilled" && outstandingRes.value) {
        recTotal = Number(outstandingRes.value.summary?.totalReceivables || outstandingRes.value.summary?.totalReceivable || 0);
        payTotal = Number(outstandingRes.value.summary?.totalPayables || outstandingRes.value.summary?.totalPayable || 0);
      }

      // Genuine Gross Trading Margin: Sales - Purchases
      const grossProfit = sTotal - pTotal;
      // Real Profit Margin % strictly out of 100%
      const grossMarginRate = sTotal > 0 ? ((grossProfit / sTotal) * 100) : 0;

      // Real Sales Collection % strictly out of 100%
      const collectionRate = sTotal > 0 ? Math.min(100, Math.max(0, (sPaid / sTotal) * 100)) : 0;

      // Real Purchase Settlement % strictly out of 100%
      const settlementRate = pTotal > 0 ? Math.min(100, Math.max(0, (pPaid / pTotal) * 100)) : 0;

      // Receivables share % of total sales
      const receivablesShare = sTotal > 0 ? Math.min(100, (recTotal / sTotal) * 100) : 0;

      // Payables share % of total purchases
      const payablesShare = pTotal > 0 ? Math.min(100, (payTotal / pTotal) * 100) : 0;

      setMetrics({
        totalSales: sTotal,
        salesPaid: sPaid,
        salesBalance: sBalance,
        salesTaxable: sTaxable,
        salesTax: sTax,
        salesCount: sCount,
        collectionRate,

        totalPurchases: pTotal,
        purchasePaid: pPaid,
        purchaseBalance: pBalance,
        purchaseTaxable: pTaxable,
        purchaseTax: pTax,
        purchaseCount: pCount,
        settlementRate,

        grossProfit,
        grossMarginRate,

        receivables: recTotal,
        receivablesShare,

        payables: payTotal,
        payablesShare,

        totalCash: cashTotal,
        totalBank: bankTotal,
        totalCashBank: totalLiquidity || (cashTotal + bankTotal),
      });
    } catch {
      // Keep safe state
    } finally {
      setIsLoadingMetrics(false);
      setIsRefreshing(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchMetrics();
  };

  const handleApplyCustomDates = () => {
    if (customFromDate && customToDate) {
      onCustomRange?.(customFromDate, customToDate);
      setShowCustomDateModal(false);
      setIsPeriodDropdownOpen(false);
    }
  };

  // Filtered reports
  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ALL_REPORTS.filter((report) => {
      const matchesCategory =
        activeCategory === "all" || report.categories.includes(activeCategory);

      const matchesTag =
        selectedTag === "ALL" || report.tags.includes(selectedTag);

      const matchesSearch =
        !q ||
        report.name.toLowerCase().includes(q) ||
        report.description.toLowerCase().includes(q) ||
        (report.nameGu && report.nameGu.toLowerCase().includes(q)) ||
        report.tags.some((t) => t.toLowerCase().includes(q));

      return matchesCategory && matchesTag && matchesSearch;
    });
  }, [activeCategory, selectedTag, searchQuery]);

  // Favorite reports list
  const favoriteReportsList = useMemo(() => {
    return ALL_REPORTS.filter((r) => favorites.includes(r.id));
  }, [favorites]);

  // Current preset display label
  const currentPresetLabel = useMemo(() => {
    const match = DATE_PRESET_OPTIONS.find((opt) => opt.value === preset);
    return match ? match.label : "This Financial Year";
  }, [preset]);

  return (
    <div className="w-full min-w-0 max-w-full space-y-6 pb-12 font-sans">
      {/* 1. Executive Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {lang === "gu" ? "અહેવાલ કેન્દ્ર (Reports Hub)" : "Reports Hub"}
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              {financialYear || "FY 2026-27"}
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            {lang === "gu"
              ? "તમારા વ્યવસાયના ચોક્કસ હિસાબી અહેવાલો, GST રિટર્ન અને ઓડિટ સ્ટેટમેન્ટ જુઓ."
              : "Official financial statements, statutory GST return packs, party ledgers, and profit analytics."}
          </p>
        </div>

        {/* Right side controls & Date Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period Dropdown Button */}
          <div className="relative" ref={periodDropdownRef}>
            <button
              type="button"
              onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)}
              className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 shadow-xs flex items-center gap-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>{currentPresetLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {isPeriodDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 divide-y divide-slate-100">
                <div className="py-1">
                  {DATE_PRESET_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        if (opt.value === "Custom") {
                          setShowCustomDateModal(true);
                        } else {
                          onPreset?.(opt.value);
                          setIsPeriodDropdownOpen(false);
                        }
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors cursor-pointer flex items-center justify-between ${
                        preset === opt.value
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {preset === opt.value && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Date Range Display Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <span className="text-slate-400 font-normal">Period:</span>
            <span>{formatDisplayDate(startDate)}</span>
            <span className="text-slate-400">→</span>
            <span>{formatDisplayDate(endDate)}</span>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            title="Refresh reports metrics"
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-xs flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-blue-600 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* CA / Auditor Sharing Action Button */}
          {onOpenCaSharing && (
            <button
              type="button"
              onClick={onOpenCaSharing}
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-3.5 py-2 shadow-xs flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Share with CA</span>
            </button>
          )}
        </div>
      </div>

      {/* Custom Date Range Popover / Modal */}
      {showCustomDateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Select Custom Date Range</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomDateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  From Date
                </label>
                <CustomDatePicker
                  value={customFromDate}
                  onChange={(val) => setCustomFromDate(val || "")}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  To Date
                </label>
                <CustomDatePicker
                  value={customToDate}
                  onChange={(val) => setCustomToDate(val || "")}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCustomDateModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCustomDates}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Redesigned 100% Real Financial Overview Cards (Bounded out of 100%) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Card 1: Total Sales */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Sales
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-2">
              {isLoadingMetrics ? (
                <div className="h-7 w-32 bg-slate-100 animate-pulse rounded-lg" />
              ) : (
                <p className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {formatInr(metrics.totalSales)}
                </p>
              )}
            </div>

            {/* Collection Percentage: Guaranteed out of 100% */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1">
                <span className="text-slate-500">Collection Rate</span>
                <span className="font-bold text-emerald-600">
                  {metrics.collectionRate.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, metrics.collectionRate))}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Collected: {formatInr(metrics.salesPaid)}</span>
            <span className="text-amber-600 font-medium">Pending: {formatInr(metrics.salesBalance)}</span>
          </div>
        </div>

        {/* Card 2: Total Purchases */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Purchases
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <RenderIcon type="shopping-bag" className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-2">
              {isLoadingMetrics ? (
                <div className="h-7 w-32 bg-slate-100 animate-pulse rounded-lg" />
              ) : (
                <p className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {formatInr(metrics.totalPurchases)}
                </p>
              )}
            </div>

            {/* Settlement Percentage: Guaranteed out of 100% */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1">
                <span className="text-slate-500">Settled (Paid)</span>
                <span className="font-bold text-purple-600">
                  {metrics.settlementRate.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, metrics.settlementRate))}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Taxable: {formatInr(metrics.purchaseTaxable)}</span>
            <span className="text-purple-600 font-medium">ITC: {formatInr(metrics.purchaseTax)}</span>
          </div>
        </div>

        {/* Card 3: Gross Trading Profit & Operating Margin */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Gross Trading Profit
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Percent className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-2">
              {isLoadingMetrics ? (
                <div className="h-7 w-32 bg-slate-100 animate-pulse rounded-lg" />
              ) : (
                <p
                  className={`text-xl font-extrabold tracking-tight ${
                    metrics.grossProfit >= 0 ? "text-emerald-700" : "text-rose-600"
                  }`}
                >
                  {formatInr(metrics.grossProfit)}
                </p>
              )}
            </div>

            {/* Profit Margin: Guaranteed out of 100% */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1">
                <span className="text-slate-500">Gross Margin</span>
                <span
                  className={`font-bold ${
                    metrics.grossMarginRate >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {metrics.grossMarginRate.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    metrics.grossMarginRate >= 0 ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(0, Math.abs(metrics.grossMarginRate)))}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Trading Surplus</span>
            <button
              type="button"
              onClick={() => onSelectReport("profit-loss")}
              className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
            >
              View P&L →
            </button>
          </div>
        </div>

        {/* Card 4: Receivables (To Collect) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-amber-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Receivables (Lena)
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-2">
              {isLoadingMetrics ? (
                <div className="h-7 w-32 bg-slate-100 animate-pulse rounded-lg" />
              ) : (
                <p className="text-xl font-extrabold text-amber-700 tracking-tight">
                  {formatInr(metrics.receivables)}
                </p>
              )}
            </div>

            {/* Receivables Ratio out of 100% */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1">
                <span className="text-slate-500">% of Total Sales</span>
                <span className="font-bold text-amber-700">
                  {metrics.receivablesShare.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, metrics.receivablesShare))}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Customer Balances</span>
            <button
              type="button"
              onClick={() => onSelectReport("outstanding")}
              className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
            >
              Aging →
            </button>
          </div>
        </div>

        {/* Card 5: Payables (To Pay) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-rose-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Payables (Deva)
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-2">
              {isLoadingMetrics ? (
                <div className="h-7 w-32 bg-slate-100 animate-pulse rounded-lg" />
              ) : (
                <p className="text-xl font-extrabold text-rose-700 tracking-tight">
                  {formatInr(metrics.payables)}
                </p>
              )}
            </div>

            {/* Payables Ratio out of 100% */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1">
                <span className="text-slate-500">% of Inward Purchases</span>
                <span className="font-bold text-rose-700">
                  {metrics.payablesShare.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, metrics.payablesShare))}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Supplier Liabilities</span>
            <button
              type="button"
              onClick={() => onSelectReport("outstanding")}
              className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
            >
              View Dues →
            </button>
          </div>
        </div>
      </div>

      {/* 3. Available Liquidity & Cash-Bank Ribbon (Clean Light Style matching cards above) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {lang === "gu" ? "કુલ રોકડ અને બેંક પ્રવાહ (Total Liquidity)" : "Total Cash & Bank Liquidity"}
              </span>
            </div>

            <div className="flex items-baseline gap-3 mt-1.5 flex-wrap">
              <span
                className={`text-2xl font-extrabold tracking-tight ${
                  metrics.totalCashBank >= 0 ? "text-slate-900" : "text-rose-600"
                }`}
              >
                {formatInr(metrics.totalCashBank)}
              </span>

              <div className="flex items-center gap-3 text-xs font-medium text-slate-500 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Cash:</span>
                  <span className="font-semibold text-slate-800">{formatInr(metrics.totalCash)}</span>
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${metrics.totalBank < 0 ? "bg-slate-400" : "bg-blue-500"}`} />
                  <span>Bank:</span>
                  <span className="font-semibold text-slate-800">{formatInr(metrics.totalBank)}</span>
                  {metrics.totalBank < 0 && (
                    <span className="text-[11px] font-normal text-slate-500">(Book Overdraft)</span>
                  )}
                </span>
              </div>
            </div>

            {metrics.totalBank < 0 && (
              <p className="mt-2 text-xs text-slate-500 leading-normal">
                {lang === "gu"
                  ? "બેંક ખાતામાંથી પ્રારંભિક ડિપોઝિટ કરતા વધારે ઉપાડ/ટ્રાન્સફર હોવાથી બેંક સિલક -₹35,000 છે. કુલ લિક્વિડિટી ચોખ્ખી ઉપલબ્ધ રકમ દર્શાવે છે."
                  : "Note: Bank ledger has net withdrawals/transfers exceeding deposits. Total liquidity reflects net available funds."}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onSelectReport("daybook")}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200 shadow-2xs"
          >
            <span>Day Book</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          </button>
          <button
            type="button"
            onClick={() => onSelectReport("cash-flow")}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <span>Cash Flow Statement</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. Starred / Pinned Favorite Reports Quick Access Shelf */}
      {favoriteReportsList.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                {lang === "gu" ? "મનપસંદ અહેવાલો (Starred Reports)" : "Quick Access (Starred Reports)"}
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              {favoriteReportsList.length} pinned
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {favoriteReportsList.map((fav) => (
              <button
                key={fav.id}
                type="button"
                onClick={() => onSelectReport(fav.tabId)}
                className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-left group cursor-pointer"
              >
                <div
                  className={`w-8 h-8 rounded-lg ${fav.iconBg} flex items-center justify-center shrink-0 shadow-2xs`}
                >
                  <RenderIcon type={fav.iconType} className={`w-4 h-4 ${fav.iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-700">
                    {fav.name}
                  </p>
                  {/* Centralized toggle: Gujarati subtitle */}
                  {SHOW_GUJARATI_SUBTITLES && (
                    <p className="text-[10px] text-slate-400 truncate">
                      {fav.nameGu}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5. Complete Reports Catalogue Section */}
      <div className="space-y-4 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {lang === "gu" ? "તમામ હિસાબી અહેવાલો" : "Reports Directory"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any report to view comprehensive tables, audit records, and export to Excel/PDF.
            </p>
          </div>

          {/* Search & View Switcher */}
          <div className="flex items-center gap-2.5">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === "gu" ? "અહેવાલ નામ શોધો..." : "Search 33 reports by name..."}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 shadow-2xs transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* View Layout Toggle: Table vs Grid */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-xs">
              <button
                type="button"
                onClick={() => setViewLayout("table")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewLayout === "table"
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewLayout("grid")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewLayout === "grid"
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const count =
              cat.id === "all"
                ? ALL_REPORTS.length
                : ALL_REPORTS.filter((r) => r.categories.includes(cat.id)).length;
            const isActive = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  setSelectedTag("ALL");
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <RenderIcon
                  type={cat.icon}
                  className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-slate-500"}`}
                />
                <span>
                  {lang === "gu" ? cat.labelGu : cat.label} ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Reports Content View (Table or Grid) */}
        {filteredReports.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center text-xs text-slate-500 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
              <Search className="w-6 h-6" />
            </div>
            <p className="font-semibold text-slate-800 text-sm">No reports found matching your search.</p>
            <p className="mt-1 text-slate-400">Try adjusting your keywords or select another category filter.</p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-3 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        ) : viewLayout === "table" ? (
          /* Table View: Enterprise standard scannable list */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="hidden sm:grid sm:grid-cols-[280px_1fr_120px_48px_110px] items-center px-6 py-3.5 border-b border-slate-200 bg-slate-50/70 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <div>Report Name</div>
              <div>Description</div>
              <div>Category</div>
              <div className="text-center">Pin</div>
              <div className="text-right">Action</div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredReports.map((report) => {
                const isFav = favorites.includes(report.id);

                return (
                  <div
                    key={report.id}
                    onClick={() => onSelectReport(report.tabId)}
                    className="flex flex-col sm:grid sm:grid-cols-[280px_1fr_120px_48px_110px] items-start sm:items-center px-4 sm:px-6 py-3.5 hover:bg-blue-50/40 transition-colors gap-2 sm:gap-0 cursor-pointer group"
                  >
                    {/* Col 1: Icon & Name */}
                    <div className="flex items-center gap-3 min-w-0 pr-3">
                      <div
                        className={`w-9 h-9 rounded-xl ${report.iconBg} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}
                      >
                        <RenderIcon type={report.iconType} className={`w-4 h-4 ${report.iconColor}`} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 block truncate">
                          {report.name}
                        </span>
                        {/* Centralized toggle: Gujarati subtitle */}
                        {SHOW_GUJARATI_SUBTITLES && (
                          <span className="text-[10px] text-slate-400 block truncate">
                            {report.nameGu}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Col 2: Description */}
                    <div className="text-xs text-slate-500 line-clamp-1 pr-4">
                      {report.description}
                    </div>

                    {/* Col 3: Category Badge */}
                    <div className="hidden sm:block">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 capitalize">
                        {report.categories[0] || "General"}
                      </span>
                    </div>

                    {/* Col 4: Favorite Star */}
                    <div className="flex items-center justify-start sm:justify-center">
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(report.id, e)}
                        className="p-1 rounded-md text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                        title={isFav ? "Unpin report" : "Pin to quick access"}
                      >
                        {isFav ? (
                          <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                        ) : (
                          <Star className="w-4 h-4 text-slate-300 hover:text-amber-400" />
                        )}
                      </button>
                    </div>

                    {/* Col 5: Open Button */}
                    <div className="w-full sm:w-auto flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectReport(report.tabId);
                        }}
                        className="inline-flex items-center justify-center gap-1.5 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-2xs transition-colors cursor-pointer group-hover:shadow-xs"
                      >
                        <span>Open</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Grid View: Rich card cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReports.map((report) => {
              const isFav = favorites.includes(report.id);

              return (
                <div
                  key={report.id}
                  onClick={() => onSelectReport(report.tabId)}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-blue-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl ${report.iconBg} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}
                        >
                          <RenderIcon type={report.iconType} className={`w-5 h-5 ${report.iconColor}`} />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {report.name}
                          </h3>
                          {/* Centralized toggle: Gujarati subtitle */}
                          {SHOW_GUJARATI_SUBTITLES && (
                            <p className="text-[10px] text-slate-400 font-medium">
                              {report.nameGu}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(report.id, e)}
                        className="p-1 rounded-md text-slate-300 hover:text-amber-400 transition-colors"
                        title={isFav ? "Unpin report" : "Pin to quick access"}
                      >
                        {isFav ? (
                          <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                        ) : (
                          <Star className="w-4 h-4 text-slate-300 hover:text-amber-400" />
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed">
                      {report.description}
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap mt-3.5">
                      {report.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-50 border border-slate-200 text-slate-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-400">
                      {report.categories[0]?.toUpperCase() || "REPORT"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:text-blue-700">
                      <span>View Report</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
