"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";

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

const DEFAULT_FAVORITES = [
  "balance-sheet",
  "gstr-1",
  "profit-loss",
  "sales-summary",
];

const FILTER_TAGS: FilterChipTag[] = [
  "Party",
  "Category",
  "Payment Collection",
  "Item",
  "Invoice Details",
  "Summary",
];

export function ReportsDashboard({
  lang,
  onSelectReport,
  onOpenCaSharing,
}: ReportsDashboardProps) {
  const [activeFilter, setActiveFilter] = useState<FilterChipTag | null>(null);
  const [favorites, setFavorites] = useState<string[]>(DEFAULT_FAVORITES);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    GST: false,
    TRANSACTION: false,
    ITEM: false,
    PARTY: false,
  });

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

  // Global Ctrl+F listener for quick report search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setSearchModalOpen(true);
      } else if (e.key === "Escape") {
        setSearchModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (searchModalOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [searchModalOpen]);

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

  // Group reports exactly matching the MyBillBook categories
  const categoriesData = useMemo(() => {
    const favItems = ALL_REPORTS.filter((r) => favorites.includes(r.id));

    const gstItems = ALL_REPORTS.filter(
      (r) =>
        r.category === "GST" &&
        !["gstr-1"].includes(r.id) // keep official order
    );

    const transactionItems = ALL_REPORTS.filter(
      (r) =>
        r.category === "TRANSACTION" &&
        !["balance-sheet", "profit-loss", "sales-summary"].includes(r.id)
    );

    const itemItems = ALL_REPORTS.filter((r) => r.category === "ITEM");
    const partyItems = ALL_REPORTS.filter((r) => r.category === "PARTY");

    const filterList = (items: ReportItem[]) => {
      if (!activeFilter) return items;
      return items.filter((r) => r.tags.includes(activeFilter));
    };

    return {
      FAVOURITE: filterList(favItems),
      GST: filterList(gstItems),
      TRANSACTION: filterList(transactionItems),
      ITEM: filterList(itemItems),
      PARTY: filterList(partyItems),
    };
  }, [favorites, activeFilter]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return ALL_REPORTS.slice(0, 8);
    const q = searchQuery.toLowerCase().trim();
    return ALL_REPORTS.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.nameGu?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const renderCategorySection = (
    title: string,
    icon: React.ReactNode,
    items: ReportItem[],
    sectionKey: string,
    limit = 5,
    isFavouriteSection = false
  ) => {
    const isExpanded = expandedSections[sectionKey] || false;
    const displayedItems = isExpanded || isFavouriteSection ? items : items.slice(0, limit);
    const hasMore = items.length > limit && !isFavouriteSection;

    return (
      <div className="flex flex-col justify-between h-full bg-white">
        <div>
          {/* Section Header */}
          <div className="px-5 py-3 border-b border-[#E2E8F0] flex items-center gap-2.5 bg-white">
            <span className="text-[#64748B] flex items-center justify-center w-4 h-4">
              {icon}
            </span>
            <h3 className="text-[13px] font-semibold text-[#334155] tracking-tight">
              {title}
            </h3>
          </div>

          {/* Report rows */}
          <div className="divide-y divide-slate-50">
            {displayedItems.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 italic">
                No reports match selected filter
              </div>
            ) : (
              displayedItems.map((report) => {
                const isFav = favorites.includes(report.id);
                return (
                  <div
                    key={report.id}
                    onClick={() => onSelectReport(report.tabId)}
                    className="group flex items-center justify-between px-5 py-2.5 hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                  >
                    <span className="text-[13px] font-normal text-[#1E293B] group-hover:text-[#174B43] transition-colors truncate pr-2">
                      {report.name}
                    </span>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Golden Crown Icon */}
                      <span title="Pro Feature">
                        <svg className="w-3.5 h-3.5 text-[#E5A128]" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
                        </svg>
                      </span>

                      {/* Favorite Toggle Star */}
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(report.id, e)}
                        className={`p-0.5 rounded transition-colors ${
                          isFav
                            ? "text-[#F59E0B]"
                            : "text-slate-300 opacity-0 group-hover:opacity-100 hover:text-[#F59E0B]"
                        }`}
                        title={isFav ? "Remove from Favourite" : "Add to Favourite"}
                      >
                        <svg
                          className={`w-3.5 h-3.5 ${
                            isFav ? "fill-[#F59E0B] text-[#F59E0B]" : "fill-none stroke-current"
                          }`}
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* See More / See Less Toggle */}
        {hasMore && (
          <div className="px-5 py-2.5">
            <button
              type="button"
              onClick={() => toggleSection(sectionKey)}
              className="text-xs font-semibold text-[#174B43] hover:text-[#123B35] flex items-center gap-1 cursor-pointer"
            >
              <span>{isExpanded ? "See less" : "See more"}</span>
              <span>{isExpanded ? "^" : "v"}</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 w-full min-w-0 max-w-full pb-16 animate-fadeIn">
      {/* 1. Header Bar matching MyBillBook */}
      <div className="flex items-center justify-between gap-4 pt-1 pb-1">
        <h1 className="text-2xl font-bold text-[#1E293B] tracking-tight">
          Reports
        </h1>

        <button
          type="button"
          onClick={onOpenCaSharing}
          className="px-4 py-2 bg-[#123B35] hover:bg-[#0F322C] text-white text-xs sm:text-sm font-semibold rounded-md shadow-2xs transition-colors flex items-center gap-2 active:scale-95 cursor-pointer"
        >
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
            />
          </svg>
          <span>CA Reports Sharing</span>
        </button>
      </div>

      {/* 2. Filter By Chips Bar */}
      <div className="flex items-center gap-2.5 flex-wrap py-1">
        <span className="text-xs font-semibold text-[#64748B] mr-1">
          Filter By
        </span>

        {FILTER_TAGS.map((tag) => {
          const isActive = activeFilter === tag;
          return (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveFilter(isActive ? null : tag)}
              className={`px-4 py-1.5 text-xs font-medium rounded-full border transition-all cursor-pointer ${
                isActive
                  ? "bg-[#1E293B] border-[#1E293B] text-white font-semibold shadow-2xs"
                  : "bg-white border-[#D1D5DB] text-[#334155] hover:bg-slate-50 hover:border-slate-400"
              }`}
            >
              {tag}
            </button>
          );
        })}

        {activeFilter && (
          <button
            type="button"
            onClick={() => setActiveFilter(null)}
            className="text-xs text-[#174B43] hover:underline ml-1 font-medium cursor-pointer"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* 3. Seamless Unified 3-Column Reports Table (Matching MyBillBook EXACTLY) */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-2xs overflow-hidden">
        {/* TOP ROW: Favourite (col 1) | GST (col 2) | Transaction (col 3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3">
          {/* Col 1: Favourite */}
          <div className="border-b lg:border-b-0 lg:border-r border-[#E2E8F0] flex flex-col justify-between">
            {renderCategorySection(
              "Favourite",
              <svg className="w-4 h-4 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>,
              categoriesData.FAVOURITE,
              "FAVOURITE",
              10,
              true
            )}
          </div>

          {/* Col 2: GST */}
          <div className="border-b lg:border-b-0 lg:border-r border-[#E2E8F0] flex flex-col justify-between">
            {renderCategorySection(
              "GST",
              <svg className="w-4 h-4 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>,
              categoriesData.GST,
              "GST",
              8
            )}
          </div>

          {/* Col 3: Transaction */}
          <div className="flex flex-col justify-between">
            {renderCategorySection(
              "Transaction",
              <svg className="w-4 h-4 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>,
              categoriesData.TRANSACTION,
              "TRANSACTION",
              6
            )}
          </div>
        </div>

        {/* HORIZONTAL DIVIDER */}
        <div className="border-t border-[#E2E8F0]" />

        {/* BOTTOM ROW: Item (col 1) | Party (col 2) | Empty Col 3 with Docked Find Report */}
        <div className="grid grid-cols-1 lg:grid-cols-3">
          {/* Col 1: Item */}
          <div className="border-b lg:border-b-0 lg:border-r border-[#E2E8F0] flex flex-col justify-between">
            {renderCategorySection(
              "Item",
              <svg className="w-4 h-4 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>,
              categoriesData.ITEM,
              "ITEM",
              5
            )}
          </div>

          {/* Col 2: Party */}
          <div className="border-b lg:border-b-0 lg:border-r border-[#E2E8F0] flex flex-col justify-between">
            {renderCategorySection(
              "Party",
              <svg className="w-4 h-4 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>,
              categoriesData.PARTY,
              "PARTY",
              5
            )}
          </div>

          {/* Col 3: Empty Area with Docked Find Report (Ctrl + F) at the bottom right */}
          <div className="relative min-h-[160px] flex flex-col justify-end items-end p-5 bg-white">
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#1E293B] cursor-pointer group transition-colors"
            >
              <span>Find Report</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#F1F5F9] text-[#64748B] rounded border border-[#CBD5E1]">
                Ctrl
              </kbd>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#F1F5F9] text-[#64748B] rounded border border-[#CBD5E1]">
                F
              </kbd>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Search Spotlight Modal */}
      {searchModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-start justify-center pt-20 px-4"
          onClick={() => setSearchModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 border-b border-slate-100 flex items-center gap-2.5">
              <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any report (e.g. Sales, GST, Stock, Daybook, Profit)..."
                className="w-full text-xs sm:text-sm bg-transparent focus:outline-none text-slate-900 placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setSearchModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 text-xs"
              >
                ESC
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 p-1">
              {searchResults.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No matching reports found for &quot;{searchQuery}&quot;
                </div>
              ) : (
                searchResults.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => {
                      setSearchModalOpen(false);
                      onSelectReport(r.tabId);
                    }}
                    className="flex items-center justify-between px-3 py-2.5 hover:bg-teal-50/60 rounded-xl cursor-pointer group transition-colors"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-800 group-hover:text-teal-600">
                        {r.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate max-w-sm">
                        {r.description || r.category}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                      {r.category}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
