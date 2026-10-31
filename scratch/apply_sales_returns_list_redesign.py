content = '''"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";
import { ScorecardRibbon, ScorecardSegment } from "@/components/design-system/scorecard-ribbon";
import { formatInr } from "@/components/design-system/tokens";

type DateRangePreset =
  | "ALL"
  | "TODAY"
  | "YESTERDAY"
  | "THIS_WEEK"
  | "LAST_WEEK"
  | "THIS_MONTH"
  | "PREV_MONTH"
  | "THIS_QUARTER"
  | "PREV_QUARTER"
  | "CURRENT_FY"
  | "PREV_FY"
  | "LAST_30_DAYS"
  | "LAST_365_DAYS"
  | "CUSTOM";

const DATE_PRESET_LABELS: Record<DateRangePreset, string> = {
  LAST_365_DAYS: "Last 365 Days",
  TODAY: "Today",
  YESTERDAY: "Yesterday",
  THIS_WEEK: "This Week",
  LAST_WEEK: "Last Week",
  THIS_MONTH: "This Month",
  PREV_MONTH: "Previous Month",
  THIS_QUARTER: "This Quarter",
  PREV_QUARTER: "Previous Quarter",
  CURRENT_FY: "Current Fiscal Year",
  PREV_FY: "Previous Fiscal Year",
  LAST_30_DAYS: "Last 30 Days",
  ALL: "All Time",
  CUSTOM: "Custom Range",
};

interface SalesReturnRow {
  id: string;
  returnNumber: string;
  returnDate: string;
  taxableAmount: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  grandTotal: number;
  status: string;
  reason?: string;
  party?: {
    id: string;
    name: string;
    phone?: string;
    gstin?: string;
  } | null;
  salesInvoice?: {
    id: string;
    invoiceNumber: string;
    invoiceDate?: string;
    grandTotal?: number;
  } | null;
  items?: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    item?: {
      id: string;
      name: string;
    };
  }>;
}

function formatDisplayDate(val?: string): string {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function rangeForPreset(
  preset: DateRangePreset,
  customStart: string,
  customEnd: string,
): { startDate?: string; endDate?: string } {
  if (preset === "ALL") return {};
  const now = new Date();
  let start: Date | null = null;
  let end: Date | null = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (preset === "TODAY") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (preset === "YESTERDAY") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    start = new Date(y.getFullYear(), y.getMonth(), y.getDate());
    end = start;
  } else if (preset === "THIS_WEEK") {
    const d = new Date(now);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  } else if (preset === "LAST_WEEK") {
    const d = new Date(now);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day - 6);
    start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const e = new Date(start);
    e.setDate(e.getDate() + 6);
    end = e;
  } else if (preset === "THIS_MONTH") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (preset === "PREV_MONTH") {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0);
  } else if (preset === "THIS_QUARTER") {
    const q = Math.floor(now.getMonth() / 3);
    start = new Date(now.getFullYear(), q * 3, 1);
  } else if (preset === "PREV_QUARTER") {
    const q = Math.floor(now.getMonth() / 3);
    const pq = q === 0 ? 3 : q - 1;
    const py = q === 0 ? now.getFullYear() - 1 : now.getFullYear();
    start = new Date(py, pq * 3, 1);
    end = new Date(py, pq * 3 + 3, 0);
  } else if (preset === "LAST_30_DAYS") {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    start = d;
  } else if (preset === "LAST_365_DAYS") {
    const d = new Date(now);
    d.setDate(d.getDate() - 365);
    start = d;
  } else if (preset === "CURRENT_FY") {
    const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    start = new Date(yr, 3, 1);
  } else if (preset === "PREV_FY") {
    const yr = now.getMonth() >= 3 ? now.getFullYear() - 1 : now.getFullYear() - 2;
    start = new Date(yr, 3, 1);
    end = new Date(yr + 1, 2, 31);
  } else if (preset === "CUSTOM") {
    return {
      startDate: customStart || undefined,
      endDate: customEnd || undefined,
    };
  }

  return {
    startDate: start ? isoDate(start) : undefined,
    endDate: end ? isoDate(end) : undefined,
  };
}

export default function SalesReturnsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { lang, tenantContext } = useAuth();

  const isCreditNote = pathname?.includes("credit-note");

  const [rows, setRows] = useState<SalesReturnRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "SETTLED" | "CANCELLED">("ALL");

  // Date Range state
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>(() => {
    const key = searchParams?.get("date_range_key");
    if (key === "last-365-days") return "LAST_365_DAYS";
    if (key === "last-30-days") return "LAST_30_DAYS";
    if (key === "today") return "TODAY";
    if (key === "this-month") return "THIS_MONTH";
    return "LAST_365_DAYS";
  });

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(() => searchParams?.get("start_date") || "");
  const [customEndDate, setCustomEndDate] = useState(() => searchParams?.get("end_date") || "");

  // Actions dropdown & Modals
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [selectedReturnForView, setSelectedReturnForView] = useState<SalesReturnRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SalesReturnRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<SalesReturnRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const datePickerRef = useRef<HTMLDivElement>(null);

  const dateRange = useMemo(
    () => rangeForPreset(dateRangePreset, customStartDate, customEndDate),
    [dateRangePreset, customStartDate, customEndDate],
  );

  const fetchReturns = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get("/sales/credit-notes", {
        search: searchQuery.trim() || undefined,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        limit: 150,
      });
      setRows(extractList<SalesReturnRow>(res));
    } catch (err: any) {
      setError(err.message || "Failed to load records.");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    if (!tenantContext.companyId) return;
    const timer = setTimeout(() => {
      fetchReturns();
    }, 200);
    return () => clearTimeout(timer);
  }, [tenantContext.companyId, fetchReturns]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
      setActiveActionMenuId(null);
    }
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  // KPI Metrics Calculations
  const metrics = useMemo(() => {
    let totalValue = 0;
    let settledValue = 0;
    let openValue = 0;
    let settledCount = 0;
    let openCount = 0;
    let cancelledCount = 0;
    let activeCount = 0;

    rows.forEach((r) => {
      const amt = Number(r.grandTotal || 0);
      totalValue += amt;

      const isCancelled = r.status === "CANCELLED";
      const isSettled = r.status === "CLOSED" || r.status === "REFUNDED" || r.status === "PAID";

      if (isCancelled) {
        cancelledCount += 1;
      } else {
        activeCount += 1;
        if (isSettled) {
          settledCount += 1;
          settledValue += amt;
        } else {
          openCount += 1;
          openValue += amt;
        }
      }
    });

    return {
      totalValue,
      settledValue,
      openValue,
      settledCount,
      openCount,
      cancelledCount,
      activeCount,
      totalCount: rows.length,
    };
  }, [rows]);

  // Filtered rows for client search query & status filter
  const displayedRows = useMemo(() => {
    let filtered = rows;

    if (statusFilter === "SETTLED") {
      filtered = filtered.filter((r) => r.status === "CLOSED" || r.status === "REFUNDED" || r.status === "PAID");
    } else if (statusFilter === "OPEN") {
      filtered = filtered.filter((r) => r.status !== "CANCELLED" && r.status !== "CLOSED" && r.status !== "REFUNDED" && r.status !== "PAID");
    } else if (statusFilter === "CANCELLED") {
      filtered = filtered.filter((r) => r.status === "CANCELLED");
    }

    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase().trim();
    return filtered.filter(
      (r) =>
        (r.party?.name && r.party.name.toLowerCase().includes(q)) ||
        (r.returnNumber && r.returnNumber.toLowerCase().includes(q)) ||
        (r.salesInvoice?.invoiceNumber && r.salesInvoice.invoiceNumber.toLowerCase().includes(q)) ||
        (r.reason && r.reason.toLowerCase().includes(q)),
    );
  }, [rows, statusFilter, searchQuery]);

  // Scorecard segments for ribbon
  const scorecardSegments: ScorecardSegment[] = [
    {
      id: "all",
      label: isCreditNote ? "Total Credit Notes" : "Total Sales Returns",
      labelGujarati: isCreditNote ? "કુલ ક્રેડિટ નોટ" : "કુલ વેચાણ પરત",
      value: metrics.totalValue,
      isCurrency: true,
      subtext: `${rows.length} Notes Recorded`,
      subtextGujarati: `${rows.length} નોંધાયેલ`,
      badge: DATE_PRESET_LABELS[dateRangePreset],
      variant: "primary",
      isActive: statusFilter === "ALL",
      onClick: () => setStatusFilter("ALL"),
    },
    {
      id: "settled",
      label: "Settled / Adjusted",
      labelGujarati: "સેટલ થયેલ રકમ",
      value: metrics.settledValue,
      isCurrency: true,
      subtext: `${metrics.settledCount} Invoices Adjusted`,
      subtextGujarati: `${metrics.settledCount} બિલ એડજસ્ટ`,
      variant: "success",
      isActive: statusFilter === "SETTLED",
      onClick: () => setStatusFilter("SETTLED"),
    },
    {
      id: "open",
      label: "Open Adjustments",
      labelGujarati: "ખુલ્લી ક્રેડિટ બેલેન્સ",
      value: metrics.openValue,
      isCurrency: true,
      subtext: `${metrics.openCount} Customer Credit`,
      subtextGujarati: `${metrics.openCount} પેન્ડિંગ ક્રેડિટ`,
      variant: "warning",
      isActive: statusFilter === "OPEN",
      onClick: () => setStatusFilter("OPEN"),
    },
    {
      id: "cancelled",
      label: "Cancelled / Void",
      labelGujarati: "રદ થયેલ વાઉચર",
      value: metrics.cancelledCount,
      isCurrency: false,
      subtext: "Voided Records",
      subtextGujarati: "રદ થયેલ",
      variant: "neutral",
      isActive: statusFilter === "CANCELLED",
      onClick: () => setStatusFilter("CANCELLED"),
    },
  ];

  // CSV Export
  const handleExportCsv = () => {
    if (displayedRows.length === 0) return;
    const headers = ["Date", "Credit Note / Return #", "Customer Name", "Original Invoice #", "Amount", "Reason", "Status"];
    const csvRows = displayedRows.map((r) => [
      formatDisplayDate(r.returnDate),
      `"${r.returnNumber || ""}"`,
      `"${(r.party?.name || "Cash Sale").replace(/"/g, '""')}"`,
      `"${r.salesInvoice?.invoiceNumber || "Direct Return"}"`,
      r.grandTotal || 0,
      `"${(r.reason || "").replace(/"/g, '""')}"`,
      r.status,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${isCreditNote ? "credit_notes" : "sales_returns"}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToast("Exported to CSV successfully!");
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto min-w-0 pb-16 font-sans">
      {/* 1. TOP UNIFIED COMMAND STRIP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:px-6 sm:py-3.5 rounded-2xl border border-[#E2E8E5] shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#26A58A]">
              {isCreditNote
                ? lang === "gu"
                  ? "વેચાણ અને ક્રેડિટ નોટ"
                  : "SALES & CREDIT ADJUSTMENTS"
                : lang === "gu"
                ? "વેચાણ પરત"
                : "SALES & RETURNS"}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[10px] font-bold text-slate-500 font-mono">
              {displayedRows.length} {lang === "gu" ? "રેકોર્ડ" : "Records"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-[#1A2E2B] tracking-tight">
              {isCreditNote
                ? lang === "gu"
                  ? "ક્રેડિટ નોટ રજિસ્ટર (Credit Notes)"
                  : "Credit Notes Register"
                : lang === "gu"
                ? "વેચાણ પરત રજિસ્ટર (Sales Returns)"
                : "Sales Returns Register"}
            </h1>
            <button
              type="button"
              onClick={fetchReturns}
              title="Refresh Records"
              className="p-1 text-slate-400 hover:text-[#174B43] rounded-md transition-colors"
            >
              <svg className={`w-4 h-4 ${isLoading ? "animate-spin text-[#26A58A]" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={displayedRows.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E2E8E5] bg-white text-xs font-semibold text-[#1A2E2B] hover:bg-[#F2FAF7] hover:border-[#85D5C2] disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
            title="Export to CSV"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>{lang === "gu" ? "નિકાસ" : "Export CSV"}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E2E8E5] bg-white text-xs font-semibold text-[#1A2E2B] hover:bg-[#F2FAF7] hover:border-[#85D5C2] transition-colors shadow-2xs cursor-pointer"
            title="Print Register"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print</span>
          </button>

          <Link
            href={isCreditNote ? "/sales/credit-note/create" : "/sales/returns/new"}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#174B43] hover:bg-[#123B35] text-white text-xs font-bold shadow-md shadow-[#174B43]/20 hover:shadow-lg hover:shadow-[#174B43]/30 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>{isCreditNote ? (lang === "gu" ? "+ નવી ક્રેડિટ નોટ" : "+ Create Credit Note") : (lang === "gu" ? "+ નવું વેચાણ પરત" : "+ Create Sales Return")}</span>
          </Link>
        </div>
      </div>

      {/* 2. SCORECARD RIBBON */}
      <ScorecardRibbon segments={scorecardSegments} lang={lang} />

      {/* 3. CONTROLS BAR: SEARCH, DATE SELECTOR & STATUS SEGMENTS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E2E8E5] shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* Omni Search Box */}
          <div className="relative w-full sm:w-72">
            <span className="absolute left-3 top-2.5 text-slate-400">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === "gu" ? "શોધો: વાઉચર નં, ગ્રાહક..." : "Search voucher #, customer..."}
              className="w-full rounded-xl border border-[#E2E8E5] bg-[#F6F7F1] py-2 pl-9 pr-8 text-xs text-[#1A2E2B] placeholder-slate-400 focus:bg-white focus:border-[#26A58A] focus:ring-1 focus:ring-[#26A58A] focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            )}
          </div>

          {/* Date Range Selector Dropdown */}
          <div className="relative" ref={datePickerRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsDatePickerOpen(!isDatePickerOpen);
              }}
              className="flex items-center gap-2 rounded-xl border border-[#E2E8E5] bg-white px-3 py-2 text-xs font-semibold text-[#174B43] hover:bg-[#F2FAF7] hover:border-[#85D5C2] transition-colors shadow-2xs"
            >
              <svg className="w-4 h-4 text-[#26A58A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>{DATE_PRESET_LABELS[dateRangePreset]}</span>
              <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {isDatePickerOpen && (
              <div
                className="absolute left-0 z-30 mt-1 w-56 rounded-xl border border-[#E2E8E5] bg-white py-1.5 shadow-xl text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="max-h-64 overflow-y-auto py-1">
                  {Object.entries(DATE_PRESET_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setDateRangePreset(key as DateRangePreset);
                        if (key !== "CUSTOM") setIsDatePickerOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left transition-colors ${
                        dateRangePreset === key ? "font-bold text-[#174B43] bg-[#E6F7F2]" : "text-[#1A2E2B] hover:bg-[#F2FAF7]"
                      }`}
                    >
                      <span>{label}</span>
                      {dateRangePreset === key && <span className="text-[#26A58A] font-bold">✓</span>}
                    </button>
                  ))}
                </div>

                {dateRangePreset === "CUSTOM" && (
                  <div className="border-t border-[#E2E8E5] p-3 space-y-2 bg-[#F6F7F1] rounded-b-xl">
                    <div>
                      <label className="block text-[10px] font-semibold text-[#5A6B66] mb-0.5">Start Date</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full rounded-lg border border-[#E2E8E5] bg-white px-2 py-1 text-xs text-[#1A2E2B] focus:border-[#26A58A] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-[#5A6B66] mb-0.5">End Date</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full rounded-lg border border-[#E2E8E5] bg-white px-2 py-1 text-xs text-[#1A2E2B] focus:border-[#26A58A] focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsDatePickerOpen(false)}
                      className="w-full mt-1 rounded-lg bg-[#26A58A] hover:bg-[#208E76] py-1.5 text-center font-bold text-white shadow-jade transition-colors cursor-pointer"
                    >
                      Apply Range
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Status segment pills switcher */}
        <div className="flex items-center gap-1 bg-[#F6F7F1] p-1 rounded-xl border border-[#E2E8E5] self-start sm:self-auto">
          {(
            [
              { key: "ALL", label: "All" },
              { key: "OPEN", label: "Open" },
              { key: "SETTLED", label: "Settled" },
              { key: "CANCELLED", label: "Void" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                statusFilter === tab.key
                  ? "bg-white text-[#174B43] shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 flex items-center justify-between shadow-2xs">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">✕</button>
        </div>
      )}

      {/* 4. ENTERPRISE DATA GRID */}
      <div className="overflow-visible rounded-2xl border border-[#E2E8E5] bg-white shadow-xs">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="min-w-full text-left text-xs border-collapse">
            <thead className="bg-[#F8FAF9] border-b border-[#E2E8E5] text-[#5A6B66] font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3.5 whitespace-nowrap font-bold">Date</th>
                <th className="px-4 py-3.5 whitespace-nowrap font-bold">{isCreditNote ? "Credit Note #" : "Return #"}</th>
                <th className="px-4 py-3.5 whitespace-nowrap font-bold">Party Name</th>
                <th className="px-4 py-3.5 whitespace-nowrap font-bold">Original Invoice</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap font-bold">Total Amount</th>
                <th className="px-4 py-3.5 text-center whitespace-nowrap font-bold">Status</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E5]">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-xs text-[#5A6B66]">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#26A58A] border-t-transparent" />
                      <span>Loading records...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading && displayedRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-20 text-center text-[#5A6B66]">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-3 shadow-inner">
                        <svg className="w-7 h-7 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-base font-bold text-[#1A2E2B]">
                        {lang === "gu" ? "કોઈ રેકોર્ડ મળ્યા નથી." : "No records found"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {searchQuery
                          ? "No transactions match your current search filters."
                          : "Issue credit notes for sales returns, rate differences, or invoice adjustments."}
                      </p>
                      <Link
                        href={isCreditNote ? "/sales/credit-note/create" : "/sales/returns/new"}
                        className="mt-4 rounded-xl bg-[#174B43] px-4 py-2 text-xs font-bold text-white shadow-jade hover:bg-[#123B35] transition-colors"
                      >
                        {isCreditNote ? "+ Create Credit Note" : "+ Create Sales Return"}
                      </Link>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading &&
                displayedRows.map((row) => {
                  const isSettled = row.status === "CLOSED" || row.status === "REFUNDED" || row.status === "PAID";
                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-[#F2FAF7]/70 transition-colors group ${
                        row.status === "CANCELLED" ? "opacity-60 bg-slate-50/50" : ""
                      }`}
                    >
                      {/* Date */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-[#1A2E2B] font-medium">
                        {formatDisplayDate(row.returnDate)}
                      </td>

                      {/* Number */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedReturnForView(row)}
                            className="font-mono font-bold text-[#174B43] hover:text-[#26A58A] hover:underline transition-colors text-xs cursor-pointer"
                          >
                            {row.returnNumber}
                          </button>
                        </div>
                      </td>

                      {/* Customer / Party */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-[#1A2E2B] text-xs">
                          {row.party?.name || "Cash Sale"}
                        </div>
                        {row.party?.phone && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            📞 {row.party.phone}
                          </div>
                        )}
                      </td>

                      {/* Original Invoice */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {row.salesInvoice?.invoiceNumber ? (
                          <Link
                            href={`/sales/invoices/${row.salesInvoice.id}`}
                            className="text-[#174B43] hover:underline font-mono font-semibold"
                          >
                            #{row.salesInvoice.invoiceNumber}
                          </Link>
                        ) : (
                          <span className="text-slate-400">Direct Return</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-right font-bold text-[#1A2E2B] whitespace-nowrap font-mono text-[13px]">
                        {formatInr(row.grandTotal)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {isSettled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Settled
                          </span>
                        ) : row.status === "CANCELLED" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                            Void
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span>Open</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedReturnForView(row)}
                            className="p-1.5 text-xs text-[#174B43] hover:bg-[#F2FAF7] rounded-lg font-semibold transition-colors border border-[#E2E8E5] cursor-pointer"
                            title="View Voucher"
                          >
                            View
                          </button>

                          <button
                            type="button"
                            onClick={() => setHistoryTarget(row)}
                            className="p-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="View History"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>

                          {row.status !== "CANCELLED" && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(row)}
                              className="p-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Record"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Return Modal */}
      {selectedReturnForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-[#E2E8E5] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-[#1A2E2B]">
                  {isCreditNote ? "Credit Note" : "Sales Return"} #{selectedReturnForView.returnNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  Date: {formatDisplayDate(selectedReturnForView.returnDate)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReturnForView(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-[#F6F7F1] p-3 rounded-xl border border-[#E2E8E5]">
                <p className="text-slate-500 font-semibold">Party:</p>
                <p className="font-bold text-slate-900">
                  {selectedReturnForView.party?.name || "Cash Sale"}
                </p>
                {selectedReturnForView.party?.phone && (
                  <p className="text-slate-500 font-mono mt-0.5">
                    {selectedReturnForView.party.phone}
                  </p>
                )}
              </div>
              <div className="bg-[#F6F7F1] p-3 rounded-xl border border-[#E2E8E5]">
                <p className="text-slate-500 font-semibold">Original Invoice:</p>
                <p className="font-bold text-slate-900">
                  {selectedReturnForView.salesInvoice?.invoiceNumber
                    ? `#${selectedReturnForView.salesInvoice.invoiceNumber}`
                    : "Direct Return"}
                </p>
                <p className="text-[#174B43] font-bold mt-1 text-sm">
                  {formatInr(selectedReturnForView.grandTotal)}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-xl border border-[#E2E8E5] bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Print
              </button>
              <button
                type="button"
                onClick={() => setSelectedReturnForView(null)}
                className="rounded-xl bg-[#174B43] px-5 py-2 text-xs font-bold text-white hover:bg-[#123B35] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#E2E8E5] space-y-4">
            <h2 className="text-base font-bold text-[#1A2E2B]">
              Delete Record #{deleteTarget.returnNumber}?
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              This will permanently delete this record and restore inventory and customer balance.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                className="rounded-xl border border-[#E2E8E5] px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 shadow-xs cursor-pointer"
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await apiClient.delete(`/sales/credit-notes/${deleteTarget.id}`);
                    setRows((curr) => curr.filter((r) => r.id !== deleteTarget.id));
                    setDeleteTarget(null);
                    setToast("Record deleted successfully.");
                  } catch (err: any) {
                    alert(err.message || "Could not delete record.");
                  } finally {
                    setIsDeleting(false);
                  }
                }}
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit History Modal */}
      {historyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#E2E8E5] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-[#1A2E2B] flex items-center gap-2">
                <svg className="w-4 h-4 text-[#26A58A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Edit History — #{historyTarget.returnNumber}</span>
              </h3>
              <button
                type="button"
                onClick={() => setHistoryTarget(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3 bg-[#F6F7F1] p-3 rounded-xl border border-[#E2E8E5]">
                <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-bold text-slate-800">Record Created</p>
                  <p className="text-slate-500 text-[11px]">
                    Date: {formatDisplayDate(historyTarget.returnDate)}
                  </p>
                  <p className="text-slate-600 mt-1">
                    Party: <span className="font-semibold">{historyTarget.party?.name || "Cash Sale"}</span>
                  </p>
                  <p className="text-slate-600">
                    Grand Total: <span className="font-semibold">{formatInr(historyTarget.grandTotal)}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setHistoryTarget(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-xl animate-in slide-in-from-bottom-2 duration-150 border border-slate-800">
          <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
'''

with open("src/app/sales/returns/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated src/app/sales/returns/page.tsx successfully!")
