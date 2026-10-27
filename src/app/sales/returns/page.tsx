"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";

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
  CUSTOM: "Custom Date Range",
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

function formatInr(val: number | string): string {
  const num = Number(val) || 0;
  return (
    "₹ " +
    num.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  );
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
  const isCreditNote =
    pathname.includes("/credit-note") ||
    searchParams?.get("type") === "credit-note";
  const { lang, tenantContext } = useAuth();

  const [rows, setRows] = useState<SalesReturnRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Date range filter defaults to "Last 365 Days"
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>(() => {
    const key = searchParams?.get("date_range_key");
    if (key === "last-365-days") return "LAST_365_DAYS";
    if (key === "last-30-days") return "LAST_30_DAYS";
    if (key === "today") return "TODAY";
    return "LAST_365_DAYS";
  });

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(() => searchParams?.get("start_date") || "");
  const [customEndDate, setCustomEndDate] = useState(() => searchParams?.get("end_date") || "");

  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [selectedReturnForView, setSelectedReturnForView] = useState<SalesReturnRow | null>(null);
  const [historyTarget, setHistoryTarget] = useState<SalesReturnRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SalesReturnRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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
        limit: 100,
      });
      const list = extractList<SalesReturnRow>(res);
      setRows(list);
    } catch (err: any) {
      setError(err.message || "Failed to load sales returns.");
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

  // Click outside listener for date picker and action menus
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

  // Client search filter
  const displayedRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase().trim();
    return rows.filter(
      (r) =>
        (r.returnNumber && r.returnNumber.toLowerCase().includes(q)) ||
        (r.party?.name && r.party.name.toLowerCase().includes(q)) ||
        (r.salesInvoice?.invoiceNumber && r.salesInvoice.invoiceNumber.toLowerCase().includes(q)),
    );
  }, [rows, searchQuery]);

  return (
    <div className="space-y-4 px-6 py-4 min-w-0 max-w-[1600px] mx-auto pb-16 font-sans">
      {/* 1. TOP HEADER: Sales Return Title & Settings/Print Icons */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          {pathname.includes("/debit-note")
            ? lang === "gu"
              ? "ડેબિટ નોટ (Debit Note)"
              : "Debit Note"
            : isCreditNote
            ? lang === "gu"
              ? "ક્રેડિટ નોટ (Credit Note)"
              : "Credit Note"
            : lang === "gu"
              ? "વેચાણ પરત (Sales Return)"
              : "Sales Return"}
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Settings"
            onClick={() => router.push("/settings")}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            type="button"
            title="Print"
            onClick={() => window.print()}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 2. FILTER & ACTION ROW: Search, Date Filter, and Create Sales Return button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box with 🔍 inside */}
          <div className="relative w-64">
            <span className="absolute left-3 top-2.5 text-slate-400">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === "gu" ? "શોધો" : "Search"}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
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
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>{DATE_PRESET_LABELS[dateRangePreset]}</span>
              <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </button>

            {isDatePickerOpen && (
              <div
                className="absolute left-0 z-30 mt-1 w-56 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl text-xs"
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
                      className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50 ${
                        dateRangePreset === key ? "font-semibold text-[#4F46E5] bg-indigo-50/50" : "text-slate-700"
                      }`}
                    >
                      <span>{label}</span>
                      {dateRangePreset === key && <span>✓</span>}
                    </button>
                  ))}
                </div>

                {dateRangePreset === "CUSTOM" && (
                  <div className="border-t border-slate-100 p-3 space-y-2 bg-slate-50/60 rounded-b-xl">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Start Date</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">End Date</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsDatePickerOpen(false)}
                      className="w-full mt-1 rounded bg-[#4F46E5] py-1 text-center font-semibold text-white"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Create Sales Return / Credit Note Purple Button */}
        <Link
          href={pathname.includes("/debit-note") ? "/sales/debit-note/create" : "/sales/credit-note/create"}
          className="inline-flex items-center justify-center rounded-lg bg-[#4F46E5] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#4338CA] transition-colors"
        >
          {pathname.includes("/debit-note")
            ? lang === "gu"
              ? "ડેબિટ નોટ બનાવો"
              : "Create Debit Note"
            : isCreditNote
            ? lang === "gu"
              ? "ક્રેડિટ નોટ બનાવો"
              : "Create Credit Note"
            : lang === "gu"
              ? "વેચાણ પરત બનાવો"
              : "Create Sales Return"}
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">✕</button>
        </div>
      )}

      {/* 3. TABLE: Matching myBillBook exact columns */}
      <div className="overflow-visible rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="min-w-full text-left text-xs border-collapse">
            <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span>{lang === "gu" ? "તારીખ" : "Date"}</span>
                    <span className="text-slate-400 text-[10px]">⇅</span>
                  </div>
                </th>
                <th className="px-4 py-3 whitespace-nowrap">
                  {pathname.includes("/debit-note")
                    ? lang === "gu"
                      ? "ડેબિટ નોટ નંબર"
                      : "Debit Note Number"
                    : isCreditNote
                    ? lang === "gu"
                      ? "ક્રેડિટ નોટ નંબર"
                      : "Credit Note Number"
                    : lang === "gu"
                      ? "વેચાણ પરત નંબર"
                      : "Sales Return Number"}
                </th>
                <th className="px-4 py-3 whitespace-nowrap">{lang === "gu" ? "પાર્ટીનું નામ" : "Party Name"}</th>
                <th className="px-4 py-3 whitespace-nowrap">{lang === "gu" ? "ઇન્વોઇસ નં." : "Invoice No"}</th>
                <th className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span>{lang === "gu" ? "રકમ" : "Amount"}</span>
                    <span className="text-slate-400 text-[10px]">⇅</span>
                  </div>
                </th>
                <th className="px-4 py-3 whitespace-nowrap">{lang === "gu" ? "સ્થિતિ" : "Status"}</th>
                <th className="px-4 py-3 w-10 text-center whitespace-nowrap" />
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-xs text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                      <span>{lang === "gu" ? "લોડ થઈ રહ્યું છે..." : "Loading sales returns..."}</span>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading && displayedRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-20 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-slate-700">
                        {isCreditNote
                          ? lang === "gu"
                            ? "કોઈ ક્રેડિટ નોટ મળી નથી."
                            : "No Credit Notes found"
                          : lang === "gu"
                            ? "કોઈ વેચાણ પરત મળી નથી."
                            : "No sales returns found"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        {isCreditNote
                          ? lang === "gu"
                            ? "વેચાણ બિલ સામે અથવા ગ્રાહક ખાતામાં ક્રેડિટ નોટ બનાવો."
                            : "Issue credit notes against posted sales invoices or adjust customer ledger balances."
                          : lang === "gu"
                            ? "વેચાણ બિલ સામે માલ પરત સ્વીકારો અને ક્રેડિટ નોટ બનાવો."
                            : "Issue credit notes against posted sales invoices to reverse taxes and credit customers."}
                      </p>
                      <Link
                        href="/sales/credit-note/create"
                        className="mt-4 rounded-lg bg-[#4F46E5] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#4338CA]"
                      >
                        {isCreditNote
                          ? lang === "gu"
                            ? "ક્રેડિટ નોટ બનાવો"
                            : "Create Credit Note"
                          : lang === "gu"
                            ? "વેચાણ પરત બનાવો"
                            : "Create Sales Return"}
                      </Link>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading &&
                displayedRows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap font-normal">
                      {formatDisplayDate(row.returnDate)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                      <Link
                        href={`/sales/credit-note/view/${row.id}`}
                        className="hover:text-[#4F46E5] hover:underline transition-colors font-semibold"
                      >
                        {row.returnNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                      {row.party?.name || "Cash Sale"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {row.salesInvoice?.invoiceNumber ? (
                        <span className="font-mono text-slate-700">#{row.salesInvoice.invoiceNumber}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      {formatInr(row.grandTotal)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-600 border border-sky-200">
                        Refunded
                      </span>
                    </td>

                    {/* 3-dots action menu with fixed popover to eliminate scroll issue */}
                    <td className="relative px-4 py-3 text-center whitespace-nowrap overflow-visible">
                      <button
                        type="button"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveActionMenuId(activeActionMenuId === row.id ? null : row.id);
                        }}
                      >
                        <span className="text-base font-bold leading-none">⋮</span>
                      </button>

                      {activeActionMenuId === row.id && (
                        <div
                          className="absolute right-3 top-8 z-50 w-36 rounded-xl border border-slate-200 bg-white py-1 text-left text-xs shadow-xl animate-in fade-in zoom-in-95 duration-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
                            onClick={() => {
                              setActiveActionMenuId(null);
                              router.push(`/sales/credit-note/create?edit=${row.id}`);
                            }}
                          >
                            <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                            </svg>
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
                            onClick={() => {
                              setActiveActionMenuId(null);
                              setHistoryTarget(row);
                            }}
                          >
                            <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Edit History</span>
                          </button>

                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
                            onClick={() => {
                              setActiveActionMenuId(null);
                              router.push(`/sales/credit-note/create?duplicate=${row.id}`);
                            }}
                          >
                            <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Duplicate</span>
                          </button>

                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 transition-colors border-t border-slate-100"
                            onClick={() => {
                              setActiveActionMenuId(null);
                              setDeleteTarget(row);
                            }}
                          >
                            <svg className="w-3.5 h-3.5 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View / Print Modal */}
      {selectedReturnForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Sales Return #{selectedReturnForView.returnNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  Date: {formatDisplayDate(selectedReturnForView.returnDate)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReturnForView(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div>
                <p className="text-slate-500 font-semibold">Customer:</p>
                <p className="font-bold text-slate-900">{selectedReturnForView.party?.name || "Cash Sale"}</p>
                {selectedReturnForView.party?.phone && (
                  <p className="text-slate-600">Ph: {selectedReturnForView.party.phone}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-slate-500 font-semibold">Original Invoice:</p>
                <p className="font-bold text-slate-900">
                  {selectedReturnForView.salesInvoice?.invoiceNumber
                    ? `#${selectedReturnForView.salesInvoice.invoiceNumber}`
                    : "Direct Return"}
                </p>
                <p className="text-slate-600 font-semibold mt-1">
                  Total: {formatInr(selectedReturnForView.grandTotal)}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Print
              </button>
              <button
                type="button"
                onClick={() => setSelectedReturnForView(null)}
                className="rounded-lg bg-[#4F46E5] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4338CA]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete / Cancel Return Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-base font-bold text-slate-900">
              Delete Sales Return #{deleteTarget.returnNumber}?
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              This will remove this sales return and restore any inventory/accounting balances.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 shadow-xs"
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await apiClient.delete(`/sales/credit-notes/${deleteTarget.id}`);
                    setRows((curr) => curr.filter((r) => r.id !== deleteTarget.id));
                    setDeleteTarget(null);
                    setToast("Sales return deleted successfully.");
                  } catch (err: any) {
                    alert(err.message || "Could not delete sales return.");
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Edit History — #{historyTarget.returnNumber}</span>
              </h3>
              <button
                type="button"
                onClick={() => setHistoryTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-bold text-slate-800">Sales Return Created</p>
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

              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-bold text-slate-800">Voucher Issued & Balance Adjusted</p>
                  <p className="text-slate-500 text-[11px]">Status: Refunded</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setHistoryTarget(null)}
                className="rounded-lg bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-xl animate-in slide-in-from-bottom-2 duration-150">
          <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
