"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";

export type ReportCategoryKey =
  | "FAVOURITE"
  | "SALES"
  | "PURCHASE"
  | "GST"
  | "TRANSACTION"
  | "ITEM"
  | "PARTY"
  | "FINANCIAL";

export type FilterChipTag =
  | "ALL"
  | "Sales"
  | "Purchase"
  | "Party"
  | "Category"
  | "Payment Collection"
  | "Item"
  | "Invoice Details"
  | "Summary"
  | "GST";

export interface ReportItem {
  id: string;
  tabId: string;
  name: string;
  nameGu: string;
  category: ReportCategoryKey;
  tags: FilterChipTag[];
  badge?: string;
  description?: string;
}

interface ReportsDashboardProps {
  lang: string;
  onSelectReport: (tabId: string, extra?: Record<string, string>) => void;
  onOpenCaSharing: () => void;
}

const ALL_REPORTS: ReportItem[] = [
  // 1. Sales Reports
  {
    id: "sales-register",
    tabId: "sales-register",
    name: "Sales Register (Invoices)",
    nameGu: "વેચાણ રજિસ્ટર (બીલ-વાઇઝ)",
    category: "SALES",
    tags: ["Sales", "Invoice Details", "Summary"],
    badge: "GST",
    description: "Itemized tax invoices with GST slabs, customer details & balance",
  },
  {
    id: "sales-summary",
    tabId: "sales-summary",
    name: "Sales Summary - Staff Wise",
    nameGu: "વેચાણ સારાંશ (કર્મચારી/બ્રાન્ચ વાઇઝ)",
    category: "SALES",
    tags: ["Sales", "Summary"],
    description: "Aggregate monthly/daily sales volumes & collections",
  },
  {
    id: "bill-wise-profit",
    tabId: "bill-wise-profit",
    name: "Bill Wise Profit & Margin",
    nameGu: "બીલ દીઠ નફો અને માર્જિન",
    category: "SALES",
    tags: ["Sales", "Invoice Details", "Summary", "Category"],
    badge: "PROFIT",
    description: "Invoice-by-invoice gross profit calculation against item cost (COGS)",
  },
  {
    id: "item-sales-report",
    tabId: "item-sales-report",
    name: "Item-Wise Sales Report",
    nameGu: "આઇટમ મુજબ વેચાણ પત્રક",
    category: "SALES",
    tags: ["Sales", "Item"],
    description: "Quantities sold, average rate, taxable value & revenue by product",
  },
  {
    id: "party-sales-report",
    tabId: "party-sales-report",
    name: "Customer-Wise Sales Report",
    nameGu: "ગ્રાહક મુજબ વેચાણ પત્રક",
    category: "SALES",
    tags: ["Sales", "Party"],
    description: "Total orders, sales volume, paid amount & balance by customer",
  },
  {
    id: "sales-returns",
    tabId: "sales-returns",
    name: "Sales Return (Credit Notes)",
    nameGu: "વેચાણ પરત (ક્રેડિટ નોટ્સ)",
    category: "SALES",
    tags: ["Sales", "Invoice Details"],
    description: "Customer returned goods, credit note vouchers & GST adjustments",
  },
  {
    id: "quotations",
    tabId: "quotations",
    name: "Quotations & Estimates",
    nameGu: "અંદાજ / કોટેશન પત્રક",
    category: "SALES",
    tags: ["Sales", "Invoice Details"],
    description: "Non-financial price estimates, status & invoice conversion tracking",
  },
  {
    id: "delivery-challans",
    tabId: "delivery-challans",
    name: "Delivery Challans Report",
    nameGu: "ડિલિવરી ચલણ રજિસ્ટર",
    category: "SALES",
    tags: ["Sales", "Invoice Details"],
    description: "Dispatch challans, transporter records & item delivery status",
  },

  // 2. Purchase Reports
  {
    id: "purchase-register",
    tabId: "purchase-register",
    name: "Purchase Register (Bills)",
    nameGu: "ખરીદ રજિસ્ટર (બીલ-વાઇઝ)",
    category: "PURCHASE",
    tags: ["Purchase", "Invoice Details", "Summary"],
    badge: "ITC",
    description: "Inward supply bills with vendor GSTIN, taxable amount & Input Tax Credit",
  },
  {
    id: "purchase-summary",
    tabId: "purchase-summary",
    name: "Purchase Summary",
    nameGu: "ખરીદી સારાંશ પત્રક",
    category: "PURCHASE",
    tags: ["Purchase", "Summary"],
    description: "Monthly and supplier-wise aggregate purchase volumes & ITC",
  },
  {
    id: "item-purchase-report",
    tabId: "item-purchase-report",
    name: "Item-Wise Purchase Report",
    nameGu: "આઇટમ મુજબ ખરીદી પત્રક",
    category: "PURCHASE",
    tags: ["Purchase", "Item"],
    description: "Inward quantity, average buy rate & total cost by product",
  },
  {
    id: "party-purchase-report",
    tabId: "party-purchase-report",
    name: "Supplier-Wise Purchase Report",
    nameGu: "વેપારી મુજબ ખરીદી પત્રક",
    category: "PURCHASE",
    tags: ["Purchase", "Party"],
    description: "Total bills, total purchases, payments made & balance payable",
  },
  {
    id: "purchase-returns",
    tabId: "purchase-returns",
    name: "Purchase Return (Debit Notes)",
    nameGu: "ખરીદ પરત (ડેબિટ નોટ્સ)",
    category: "PURCHASE",
    tags: ["Purchase", "Invoice Details"],
    description: "Goods returned to suppliers, debit notes issued & tax reversals",
  },

  // 3. GST Section
  {
    id: "gstr-1",
    tabId: "gstr-1",
    name: "GSTR-1 (Sales)",
    nameGu: "જીએસટીઆર-૧ વેચાણ રિટર્ન",
    category: "GST",
    tags: ["GST", "Sales", "Invoice Details", "Summary"],
    badge: "GOV",
    description: "B2B, B2C, HSN summary & tax outward register",
  },
  {
    id: "gstr-2",
    tabId: "purchase-register",
    name: "GSTR-2 (Purchase)",
    nameGu: "જીએસટીઆર-૨ ખરીદ રિટર્ન",
    category: "GST",
    tags: ["GST", "Purchase", "Invoice Details"],
    description: "Inward supplies & eligible Input Tax Credit (ITC)",
  },
  {
    id: "gstr-3b",
    tabId: "gstr-3b",
    name: "GSTR-3b",
    nameGu: "જીએસટીઆર-૩બી માસિક સારાંશ",
    category: "GST",
    tags: ["GST", "Summary"],
    badge: "TAX",
    description: "Monthly self-assessed tax return and payment",
  },
  {
    id: "gst-purchase-hsn",
    tabId: "purchase-register",
    name: "GST Purchase (With HSN)",
    nameGu: "જીએસટી ખરીદી (HSN સાથે)",
    category: "GST",
    tags: ["GST", "Purchase", "Item", "Invoice Details"],
    description: "Purchase bills categorized by HSN/SAC codes",
  },
  {
    id: "gst-sales-hsn",
    tabId: "sales-register",
    name: "GST Sales (With HSN)",
    nameGu: "જીએસટી વેચાણ (HSN સાથે)",
    category: "GST",
    tags: ["GST", "Sales", "Item", "Invoice Details"],
    description: "Outward invoices with item-level tax slabs & HSN",
  },
  {
    id: "hsn-sales-summary",
    tabId: "hsn-sales-summary",
    name: "HSN Wise Sales Summary",
    nameGu: "HSN વાઈઝ વેચાણ સારાંશ",
    category: "GST",
    tags: ["GST", "Sales", "Item", "Summary"],
    description: "Official Table 12 HSN outward quantities and taxes",
  },
  {
    id: "tds-payable",
    tabId: "trial-balance",
    name: "TDS Payable",
    nameGu: "TDS ચૂકવવાપાત્ર પત્રક",
    category: "GST",
    tags: ["GST", "Summary"],
    description: "Tax Deducted at Source liability balance",
  },
  {
    id: "tds-receivable",
    tabId: "trial-balance",
    name: "TDS Receivable",
    nameGu: "TDS મળવાપાત્ર પત્રક",
    category: "GST",
    tags: ["GST", "Summary"],
    description: "Tax deducted by customers against invoices",
  },
  {
    id: "tcs-payable",
    tabId: "trial-balance",
    name: "TCS Payable",
    nameGu: "TCS ચૂકવવાપાત્ર",
    category: "GST",
    tags: ["GST", "Summary"],
    description: "Tax Collected at Source on specified supplies",
  },
  {
    id: "tcs-receivable",
    tabId: "trial-balance",
    name: "TCS Receivable",
    nameGu: "TCS મળવાપાત્ર",
    category: "GST",
    tags: ["GST", "Summary"],
    description: "TCS credited by suppliers on heavy purchases",
  },

  // 4. Transaction Section
  {
    id: "audit-trail",
    tabId: "audit-trail",
    name: "Audit Trail",
    nameGu: "ઓડિટ ટ્રેઇલ & ક્રિયા લોગ",
    category: "TRANSACTION",
    tags: ["Payment Collection", "Invoice Details"],
    description: "Statutory edit, cancel, and creation timestamp log",
  },
  {
    id: "cash-bank-report",
    tabId: "receipt-payment",
    name: "Cash and Bank Report (All Payments)",
    nameGu: "રોકડ અને બેંક ખાતાવહી (તમામ વ્યવહાર)",
    category: "TRANSACTION",
    tags: ["Payment Collection", "Category"],
    description: "Complete inward & outward bank/cash register",
  },
  {
    id: "daybook-staff",
    tabId: "daybook",
    name: "Daybook - Staff Wise",
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
    id: "receipt-payment",
    tabId: "receipt-payment",
    name: "Receipt / Payment Register",
    nameGu: "આવક / જાવક રજિસ્ટર",
    category: "TRANSACTION",
    tags: ["Payment Collection"],
    description: "All customer collections and supplier disbursements",
  },

  // 5. Item Section
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
    id: "stock-movement",
    tabId: "stock-movement",
    name: "Stock Movement Report",
    nameGu: "સ્ટોક હિલચાલ પત્રક",
    category: "ITEM",
    tags: ["Item"],
    description: "Item batch receipts, sales dispatches & adjustments",
  },
  {
    id: "item-batch-report",
    tabId: "item-batch-report",
    name: "Item Batch & Expiry Report",
    nameGu: "આઇટમ બેચ અને એક્સપાયરી રિપોર્ટ",
    category: "ITEM",
    tags: ["Item"],
    description: "Batch-wise inventory with manufacturing & expiry dates",
  },
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
    id: "low-stock-alert",
    tabId: "low-stock-alert",
    name: "Low Stock Alert Report",
    nameGu: "ઓછા સ્ટોકની ચેતવણી પત્રક",
    category: "ITEM",
    tags: ["Item", "Summary"],
    badge: "ALERT",
    description: "Items that have breached the minimum reorder threshold",
  },

  // 6. Party Section
  {
    id: "party-ledger",
    tabId: "party-ledger",
    name: "Party Statement (Khata)",
    nameGu: "પાર્ટી ખાતાવહી (Khata Ledger)",
    category: "PARTY",
    tags: ["Party"],
    description: "Comprehensive debit/credit ledger statement for parties",
  },
  {
    id: "party-aging",
    tabId: "party-aging",
    name: "Receivable Ageing Report",
    nameGu: "ઉઘરાણી મુદત વિશ્લેષણ (૩૦/૬૦/૯૦+ દિવસ)",
    category: "PARTY",
    tags: ["Party", "Summary"],
    description: "Aging analysis of unpaid bills by customer",
  },
  {
    id: "payable-aging",
    tabId: "outstanding",
    name: "Payable Ageing Report",
    nameGu: "ચૂકવણી મુદત વિશ્લેષણ (સપ્લાયર્સ)",
    category: "PARTY",
    tags: ["Party", "Summary"],
    description: "Overdue supplier bills and pending vendor payouts",
  },
  {
    id: "outstanding",
    tabId: "outstanding",
    name: "Outstanding Balances",
    nameGu: "બાકી સિલક (લેણાં-દેવાં)",
    category: "PARTY",
    tags: ["Party", "Payment Collection"],
    description: "Consolidated balances of all debtors and creditors",
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

  // 7. Financial Section
  {
    id: "balance-sheet",
    tabId: "balance-sheet",
    name: "Balance Sheet",
    nameGu: "પાકું સરવૈયું (Paku Sarvaiyu)",
    category: "FINANCIAL",
    tags: ["Summary", "Category"],
    description: "Assets, liabilities, and capital position statement",
  },
  {
    id: "profit-loss",
    tabId: "profit-loss",
    name: "Profit And Loss Report",
    nameGu: "નફા-નુકસાન ખાતું (P&L Account)",
    category: "FINANCIAL",
    tags: ["Summary", "Category"],
    description: "Gross profit, indirect expenses & net business earnings",
  },
  {
    id: "trial-balance",
    tabId: "trial-balance",
    name: "Trial Balance",
    nameGu: "કાચું સરવૈયું (Kachu Sarvaiyu)",
    category: "FINANCIAL",
    tags: ["Summary"],
    description: "Debit and credit trial balance verifying general ledger",
  },
  {
    id: "cash-flow",
    tabId: "cash-flow",
    name: "Cash Flow Statement",
    nameGu: "રોકડ પ્રવાહ પત્રક",
    category: "FINANCIAL",
    tags: ["Payment Collection", "Summary"],
    description: "Inflows and outflows across operations and financing",
  },
];

const DEFAULT_FAVORITES = [
  "sales-register",
  "purchase-register",
  "bill-wise-profit",
  "balance-sheet",
  "profit-loss",
  "stock-summary",
];

const FILTER_TAGS: FilterChipTag[] = [
  "ALL",
  "Sales",
  "Purchase",
  "Party",
  "Category",
  "Payment Collection",
  "Item",
  "Invoice Details",
  "Summary",
  "GST",
];

const CATEGORY_ORDER: ReportCategoryKey[] = [
  "FAVOURITE",
  "SALES",
  "PURCHASE",
  "GST",
  "TRANSACTION",
  "ITEM",
  "PARTY",
  "FINANCIAL",
];

const CATEGORY_CONFIG: Record<
  ReportCategoryKey,
  { title: string; titleGu: string; icon: string; bg: string; color: string }
> = {
  FAVOURITE: {
    title: "Favourite",
    titleGu: "મનપસંદ અહેવાલો",
    icon: "⭐",
    bg: "bg-amber-50",
    color: "text-amber-500",
  },
  SALES: {
    title: "Sales Reports",
    titleGu: "વેચાણ અહેવાલો",
    icon: "📈",
    bg: "bg-orange-50",
    color: "text-orange-600",
  },
  PURCHASE: {
    title: "Purchase Reports",
    titleGu: "ખરીદી અહેવાલો",
    icon: "🛒",
    bg: "bg-sky-50",
    color: "text-sky-600",
  },
  GST: {
    title: "GST",
    titleGu: "જીએસટી પત્રકો",
    icon: "🧾",
    bg: "bg-emerald-50",
    color: "text-emerald-600",
  },
  TRANSACTION: {
    title: "Transaction",
    titleGu: "રોજમેળ & વ્યવહારો",
    icon: "💳",
    bg: "bg-blue-50",
    color: "text-blue-600",
  },
  ITEM: {
    title: "Item",
    titleGu: "આઇટમ & સ્ટોક",
    icon: "📦",
    bg: "bg-amber-50",
    color: "text-amber-600",
  },
  PARTY: {
    title: "Party",
    titleGu: "પાર્ટી ખાતાવહી",
    icon: "👥",
    bg: "bg-purple-50",
    color: "text-purple-600",
  },
  FINANCIAL: {
    title: "Financial Statements",
    titleGu: "નાણાકીય પત્રકો",
    icon: "📊",
    bg: "bg-rose-50",
    color: "text-rose-600",
  },
};

export function ReportsDashboard({
  lang,
  onSelectReport,
  onOpenCaSharing,
}: ReportsDashboardProps) {
  const [activeFilter, setActiveFilter] = useState<FilterChipTag>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>(DEFAULT_FAVORITES);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load favorites from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("mybill_favorite_reports");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setFavorites(parsed);
          }
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Keyboard shortcut Ctrl + F to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setFavorites((prev) => {
      const next = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id];
      try {
        localStorage.setItem("mybill_favorite_reports", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const toggleSection = (sec: string) => {
    setExpandedSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  // Filtered reports
  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ALL_REPORTS.filter((r) => {
      // Tag filter
      if (activeFilter !== "ALL") {
        const matchesTag = r.tags.includes(activeFilter) || r.category.toLowerCase() === activeFilter.toLowerCase();
        if (!matchesTag) return false;
      }
      // Search query
      if (q) {
        const matchName = r.name.toLowerCase().includes(q);
        const matchGu = r.nameGu?.toLowerCase().includes(q);
        const matchDesc = r.description?.toLowerCase().includes(q);
        const matchCat = r.category.toLowerCase().includes(q);
        if (!matchName && !matchGu && !matchDesc && !matchCat) return false;
      }
      return true;
    });
  }, [activeFilter, searchQuery]);

  // Group by category
  const reportsByCategory = useMemo(() => {
    const map: Record<ReportCategoryKey, ReportItem[]> = {
      FAVOURITE: [],
      SALES: [],
      PURCHASE: [],
      GST: [],
      TRANSACTION: [],
      ITEM: [],
      PARTY: [],
      FINANCIAL: [],
    };

    // Favorites list (only show if it matches current search & filter)
    const favSet = new Set(favorites);
    ALL_REPORTS.forEach((r) => {
      if (favSet.has(r.id)) {
        const q = searchQuery.trim().toLowerCase();
        const matchesTag = activeFilter === "ALL" || r.tags.includes(activeFilter) || r.category.toLowerCase() === activeFilter.toLowerCase();
        const matchesQuery =
          !q ||
          r.name.toLowerCase().includes(q) ||
          r.nameGu?.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q);
        if (matchesTag && matchesQuery) {
          map.FAVOURITE.push(r);
        }
      }
    });

    // Populate filtered categories
    filteredReports.forEach((r) => {
      if (map[r.category]) {
        map[r.category].push(r);
      }
    });

    return map;
  }, [filteredReports, favorites, activeFilter, searchQuery]);

  // Identify only non-empty categories to display (fixes empty card "No matching reports" issue)
  const nonZeroCategories = useMemo(() => {
    return CATEGORY_ORDER.filter((catKey) => {
      const items = reportsByCategory[catKey];
      return items && items.length > 0;
    });
  }, [reportsByCategory]);

  const renderReportList = (
    items: ReportItem[],
    sectionKey: string,
    defaultLimit = 6
  ) => {
    const isExpanded = expandedSections[sectionKey] || false;
    const displayedItems = isExpanded ? items : items.slice(0, defaultLimit);
    const hasMore = items.length > defaultLimit;

    return (
      <div className="divide-y divide-slate-100">
        {displayedItems.map((r) => {
          const isFav = favorites.includes(r.id);
          return (
            <div
              key={r.id}
              onClick={() => onSelectReport(r.tabId)}
              className="group flex items-center justify-between py-2.5 px-3 hover:bg-slate-50/80 rounded-lg transition-colors cursor-pointer"
            >
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-800 group-hover:text-[#F47721] transition-colors truncate">
                    {r.name}
                  </span>
                  {r.badge && (
                    <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-orange-100 text-orange-800 uppercase shrink-0">
                      {r.badge}
                    </span>
                  )}
                </div>
                {lang === "gu" && r.nameGu && (
                  <p className="text-[11px] text-slate-500 font-gujarati truncate mt-0.5">
                    {r.nameGu}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={(e) => toggleFavorite(r.id, e)}
                  title={isFav ? "Remove from Favourites" : "Add to Favourites"}
                  className="p-1 text-slate-300 hover:text-amber-400 transition-colors rounded"
                >
                  <svg
                    className={`w-4 h-4 ${isFav ? "text-amber-400 fill-amber-400" : "fill-none stroke-current"}`}
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                </button>
                <svg
                  className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#F47721] group-hover:translate-x-0.5 transition-all"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          );
        })}

        {hasMore && (
          <button
            type="button"
            onClick={() => toggleSection(sectionKey)}
            className="w-full text-center py-2 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/50 rounded-lg transition-colors mt-1"
          >
            {isExpanded ? "See less ^" : `See all (${items.length}) v`}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full pb-16 animate-fadeIn">
      {/* 1. Header with CA Reports Sharing Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {lang === "gu" ? "અહેવાલો (Reports Dashboard)" : "Reports"}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-[#F47721] uppercase tracking-wider">
              Statutory Center
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
            {lang === "gu"
              ? "તમામ નાણાકીય પત્રકો, જીએસટી રિટર્ન, સ્ટોક ખાતાવહી અને વ્યવહાર અહેવાલો"
              : "Business intelligence, GST statutory returns, financial statements & inventory reports"}
          </p>
        </div>

        {/* CA Reports Sharing Button */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={onOpenCaSharing}
            className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-purple-700 via-indigo-600 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-indigo-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4 text-purple-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>CA Reports Sharing</span>
          </button>
        </div>
      </div>

      {/* 2. Filter By Chips Bar & Find Report Input */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 lg:pb-0 scrollbar-none flex-wrap">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter By
            </span>

            {FILTER_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveFilter(tag)}
                className={`py-1.5 px-3 text-xs font-semibold rounded-lg border transition-all shrink-0 ${
                  activeFilter === tag
                    ? "bg-[#F47721] text-white border-[#F47721] shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {tag === "ALL" ? "All Reports" : tag}
              </button>
            ))}
          </div>

          {/* Search Bar (Find Report - Ctrl + F) */}
          <div className="relative min-w-[240px] sm:min-w-[300px]">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find Report (Ctrl + F)..."
              className="w-full pl-9 pr-14 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 focus:border-[#F47721] transition-all placeholder:text-slate-400"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-slate-400 hover:text-slate-600 text-xs px-1 font-bold"
                >
                  ✕
                </button>
              ) : (
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-slate-200/80 text-slate-500 rounded border border-slate-300/60 shadow-2xs">
                  Ctrl+F
                </kbd>
              )}
            </div>
          </div>
        </div>

        {searchQuery && (
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
            <span>
              Found <strong>{filteredReports.length}</strong> matching report{filteredReports.length === 1 ? "" : "s"} for &quot;{searchQuery}&quot;
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveFilter("ALL");
              }}
              className="text-[#F47721] font-bold hover:underline"
            >
              Clear Search
            </button>
          </div>
        )}
      </div>

      {/* 3. Categorized Cards Grid - Dynamically ONLY renders categories that have matching items */}
      {nonZeroCategories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-xs">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-orange-50 flex items-center justify-center text-xl mb-3">
            🔍
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            {lang === "gu" ? "કોઈ મેળ ખાતા અહેવાલો મળ્યા નથી" : "No matching reports found"}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No reports found matching "${searchQuery}" in ${activeFilter === "ALL" ? "any category" : activeFilter}.`
              : `There are currently no reports with the "${activeFilter}" filter tag.`}
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveFilter("ALL");
              setSearchQuery("");
            }}
            className="mt-4 px-4 py-2 bg-[#F47721] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            {lang === "gu" ? "તમામ અહેવાલો બતાવો" : "Show All Reports"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {nonZeroCategories.map((catKey) => {
            const items = reportsByCategory[catKey];
            const cfg = CATEGORY_CONFIG[catKey];
            return (
              <div
                key={catKey}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className={`w-7 h-7 rounded-lg ${cfg.bg} ${cfg.color} flex items-center justify-center font-bold text-sm`}>
                        {cfg.icon}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">
                        {lang === "gu" && cfg.titleGu ? cfg.titleGu : cfg.title}
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {items.length} {items.length === 1 ? "report" : "reports"}
                    </span>
                  </div>
                  {renderReportList(items, catKey, 6)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
