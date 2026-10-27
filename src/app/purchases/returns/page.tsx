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

export interface PurchaseReturnRow {
  id: string;
  returnNumber: string;
  returnDate: string;
  partyName: string;
  partyId?: string;
  purchaseNo?: string;
  purchaseInvoiceId?: string;
  amount: number;
  status: string;
  raw?: any;
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

function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
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
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  } else if (preset === "THIS_WEEK") {
    const day = now.getDay() || 7;
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
  } else if (preset === "LAST_WEEK") {
    const day = now.getDay() || 7;
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day - 6);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
  } else if (preset === "THIS_MONTH") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (preset === "PREV_MONTH") {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0);
  } else if (preset === "THIS_QUARTER") {
    const qMonth = Math.floor(now.getMonth() / 3) * 3;
    start = new Date(now.getFullYear(), qMonth, 1);
  } else if (preset === "PREV_QUARTER") {
    const qMonth = Math.floor(now.getMonth() / 3) * 3;
    start = new Date(now.getFullYear(), qMonth - 3, 1);
    end = new Date(now.getFullYear(), qMonth, 0);
  } else if (preset === "CURRENT_FY") {
    const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    start = new Date(fyStartYear, 3, 1);
  } else if (preset === "PREV_FY") {
    const fyStartYear = (now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1) - 1;
    start = new Date(fyStartYear, 3, 1);
    end = new Date(fyStartYear + 1, 2, 31);
  } else if (preset === "LAST_30_DAYS") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  } else if (preset === "LAST_365_DAYS") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 365);
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

export default function PurchaseReturnsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { lang } = useAuth();

  const [rows, setRows] = useState<PurchaseReturnRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("LAST_365_DAYS");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [activeActionMenu, setActiveActionMenu] = useState<{ id: string; openUp: boolean } | null>(null);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  const isDebitMemo = useMemo(() => {
    return pathname?.includes("debit-memo") || searchParams?.get("type") === "debit-memo";
  }, [pathname, searchParams]);

  const isDebitNote = useMemo(() => {
    if (isDebitMemo || searchParams?.get("type") === "debit-note") {
      return true;
    }
    if (pathname) {
      return pathname.includes("debit-note") || pathname.includes("debit-memo");
    }
    return false;
  }, [isDebitMemo, pathname, searchParams]);

  const basePath = useMemo(() => {
    if (isDebitMemo) return "/purchases/debit-memo";
    if (isDebitNote) return "/purchases/debit-note";
    return "/purchases/returns";
  }, [isDebitMemo, isDebitNote]);

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const datePickerRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (datePickerRef.current && !datePickerRef.current.contains(target as Node)) {
        setIsDatePickerOpen(false);
      }
      if (target?.closest?.('[data-action-menu="true"]')) {
        return;
      }
      setActiveActionMenu(null);
    }
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const { startDate, endDate } = useMemo(
    () => rangeForPreset(dateRangePreset, customStartDate, customEndDate),
    [dateRangePreset, customStartDate, customEndDate],
  );

  const fetchReturns = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res: any = await apiClient.get("/purchases/debit-notes", params);
      const items = extractList<any>(res);

      const parsed: PurchaseReturnRow[] = items.map((r: any) => ({
        id: r.id,
        returnNumber: r.returnNumber || r.voucherNumber || r.noteNumber || String(r.id).slice(0, 8),
        returnDate: r.returnDate || r.createdAt,
        partyName:
          r.party?.name ||
          r.partyName ||
          r.purchaseInvoice?.party?.name ||
          "Unknown Party",
        partyId: r.partyId || r.party?.id,
        purchaseNo:
          r.purchaseInvoice?.vendorInvoiceNumber ||
          r.purchaseInvoice?.invoiceNumber ||
          r.purchaseNo ||
          "—",
        purchaseInvoiceId: r.purchaseInvoiceId || r.purchaseInvoice?.id,
        amount: Number(r.grandTotal || r.totalAmount || r.amount || 0),
        status: "Credited",
        raw: r,
      }));

      setRows(parsed);
    } catch (err: any) {
      setError(err?.message || "Failed to load purchase returns");
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, searchQuery]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  // Client-side filtering & sorting
  const displayedRows = useMemo(() => {
    let result = [...rows];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.returnNumber.toLowerCase().includes(q) ||
          r.partyName.toLowerCase().includes(q) ||
          String(r.purchaseNo).toLowerCase().includes(q) ||
          String(r.amount).includes(q),
      );
    }
    result.sort((a, b) => {
      const dateA = new Date(a.returnDate).getTime() || 0;
      const dateB = new Date(b.returnDate).getTime() || 0;
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });
    return result;
  }, [rows, searchQuery, sortOrder]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveActionMenu(null);
    if (!window.confirm("Are you sure you want to delete this purchase return?")) return;
    try {
      await apiClient.delete(`/purchases/invoices/debit-notes/${id}`);
      showToast("Purchase return deleted successfully");
      fetchReturns();
    } catch (err: any) {
      alert(err?.message || "Failed to delete purchase return");
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header matching myBillBook: Title left, Settings, Shortcuts, "Create Purchase Return" Button right */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {pathname?.includes("debit-memo")
              ? (lang === "gu" ? "ડેબિટ મેમો (Debit Memo)" : "Debit Memo")
              : isDebitNote
              ? (lang === "gu" ? "ડેબિટ નોટ (Debit Note)" : "Debit Note")
              : (lang === "gu" ? "ખરીદી પરત (Purchase Return)" : "Purchase Return")}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Settings Icon */}
          <button
            type="button"
            onClick={() => setSettingsModalOpen(true)}
            title="Settings"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {/* Keyboard Shortcuts Icon */}
          <button
            type="button"
            onClick={() => setShortcutsModalOpen(true)}
            title="Keyboard Shortcuts"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <line x1="6" y1="8" x2="6.01" y2="8" />
              <line x1="10" y1="8" x2="10.01" y2="8" />
              <line x1="14" y1="8" x2="14.01" y2="8" />
              <line x1="18" y1="8" x2="18.01" y2="8" />
              <line x1="6" y1="12" x2="6.01" y2="12" />
              <line x1="10" y1="12" x2="10.01" y2="12" />
              <line x1="14" y1="12" x2="14.01" y2="12" />
              <line x1="18" y1="12" x2="18.01" y2="12" />
              <line x1="8" y1="16" x2="16" y2="16" />
            </svg>
          </button>

          {/* Create Button */}
          <Link
            href={
              pathname?.includes("debit-memo")
                ? "/purchases/debit-memo/create"
                : isDebitNote
                ? "/purchases/debit-note/create"
                : "/purchases/returns/create"
            }
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#4338CA] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#3730A3] transition-colors"
          >
            <span>
              {pathname?.includes("debit-memo")
                ? (lang === "gu" ? "ડેબિટ મેમો બનાવો" : "Create Debit Memo")
                : isDebitNote
                ? (lang === "gu" ? "ડેબિટ નોટ બનાવો" : "Create Debit Note")
                : (lang === "gu" ? "ખરીદી પરત બનાવો" : "Create Purchase Return")}
            </span>
          </Link>
        </div>
      </div>

      {/* 2. Controls Row: Search Input + Date Range Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Box with Search Icon */}
          <div className="relative min-w-[240px] max-w-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 shadow-2xs"
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
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>{DATE_PRESET_LABELS[dateRangePreset]}</span>
              <svg className="w-4 h-4 text-slate-400 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
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
                        dateRangePreset === key ? "font-semibold text-[#4338CA] bg-indigo-50/50" : "text-slate-700"
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
                      className="w-full mt-1 rounded bg-[#4338CA] py-1 text-center font-semibold text-white"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">✕</button>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-xl animate-fade-in">
          {toast}
        </div>
      )}

      {/* 3. Table: Exact columns matching myBillBook screenshot */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs min-h-[380px]">
        <div className="overflow-x-auto min-h-[340px] pb-28">
          <table className="min-w-full text-left text-xs border-collapse">
            <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="px-4 py-3 whitespace-nowrap cursor-pointer select-none hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>{lang === "gu" ? "તારીખ" : "Date"}</span>
                    <span className="text-slate-400 text-[10px]">
                      {sortOrder === "asc" ? "▲" : "▼"}
                    </span>
                  </div>
                </th>
                <th className="px-4 py-3 whitespace-nowrap">
                  {pathname?.includes("debit-memo")
                    ? (lang === "gu" ? "ડેબિટ મેમો નંબર" : "Debit Memo Number")
                    : isDebitNote
                    ? (lang === "gu" ? "ડેબિટ નોટ નંબર" : "Debit Note Number")
                    : (lang === "gu" ? "ખરીદી પરત નંબર" : "Purchase Return Number")}
                </th>
                <th className="px-4 py-3 whitespace-nowrap">
                  {lang === "gu" ? "વેપારીનું નામ" : "Party Name"}
                </th>
                <th className="px-4 py-3 whitespace-nowrap">
                  {lang === "gu" ? "ખરીદી નંબર" : "Purchase No"}
                </th>
                <th className="px-4 py-3 whitespace-nowrap">
                  {lang === "gu" ? "રકમ" : "Amount"}
                </th>
                <th className="px-4 py-3 whitespace-nowrap">
                  {lang === "gu" ? "સ્થિતિ" : "Status"}
                </th>
                <th className="px-4 py-3 w-10 text-center whitespace-nowrap" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                      <span>{lang === "gu" ? "લોડ કરી રહ્યું છે..." : "Loading purchase returns..."}</span>
                    </div>
                  </td>
                </tr>
              ) : displayedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="mx-auto max-w-xs space-y-3">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                          <path d="M9 14l-4-4 4-4" />
                          <path d="M5 10h11a4 4 0 1 1 0 8h-1" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-slate-800">
                        {lang === "gu" ? "કોઈ ખરીદી પરત મળી નથી" : "No purchase return records found"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {lang === "gu"
                          ? "સપ્લાયરને માલ પરત કરવા માટે નીચે ક્લિક કરો."
                          : "Create a debit note / purchase return to return stock to vendors and manage credits."}
                      </p>
                      <Link
                        href="/purchases/returns/create"
                        className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#4338CA] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#3730A3]"
                      >
                        <span>{lang === "gu" ? "ખરીદી પરત બનાવો" : "Create Purchase Return"}</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedRows.map((row) => {
                  const isMenuOpen = activeActionMenu?.id === row.id;
                  return (
                    <tr
                      key={row.id}
                      onClick={() => router.push(`${basePath}/${row.id}`)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {formatDate(row.returnDate)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">
                        {row.returnNumber}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-800">
                        {row.partyName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {row.purchaseNo}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">
                        {formatInr(row.amount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#E0F2FE] text-[#0284C7]">
                          {row.status}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-center whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          data-action-menu="true"
                          className={`relative inline-block text-left ${isMenuOpen ? "z-30" : ""}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (isMenuOpen) {
                                setActiveActionMenu(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const spaceBelowViewport = window.innerHeight - rect.bottom;
                                const shouldOpenUp = spaceBelowViewport < 260;
                                setActiveActionMenu({ id: row.id, openUp: shouldOpenUp });
                              }
                            }}
                            className={`flex h-7 w-7 items-center justify-center rounded-md hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 mx-auto transition-colors cursor-pointer ${
                              isMenuOpen ? "bg-slate-200 text-slate-800 shadow-2xs" : ""
                            }`}
                            title="Actions"
                          >
                            <svg className="w-4 h-4 pointer-events-none" viewBox="0 0 24 24" fill="currentColor">
                              <circle cx="12" cy="5" r="1.5" />
                              <circle cx="12" cy="12" r="1.5" />
                              <circle cx="12" cy="19" r="1.5" />
                            </svg>
                          </button>

                          {isMenuOpen && (
                            <div
                              className={`absolute right-0 ${
                                activeActionMenu?.openUp
                                  ? "bottom-full mb-1 origin-bottom-right"
                                  : "top-full mt-1 origin-top-right"
                              } w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-2xl text-xs divide-y divide-slate-100 z-50 animate-in fade-in zoom-in-95 duration-100`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="py-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionMenu(null);
                                    router.push(`${basePath}/${row.id}`);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                  </svg>
                                  <span>View Details</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionMenu(null);
                                    router.push(`${basePath}/create?edit=${row.id}`);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                  </svg>
                                  <span>Edit Voucher</span>
                                </button>
                              </div>

                              <div className="py-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionMenu(null);
                                    window.open(`${basePath}/${row.id}?print=true`, "_blank");
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 6 2 18 2 18 9" />
                                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                    <rect x="6" y="14" width="12" height="8" />
                                  </svg>
                                  <span>Print</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionMenu(null);
                                    router.push(`${basePath}/${row.id}?download=true`);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                  </svg>
                                  <span>Download PDF</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionMenu(null);
                                    const text = encodeURIComponent(
                                      `Debit Memo #${row.returnNumber} for ${row.partyName}. Amount: ₹${row.amount.toLocaleString("en-IN")}. Status: ${row.status}`
                                    );
                                    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-emerald-700 hover:bg-emerald-50 font-medium cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                                  </svg>
                                  <span>Share WhatsApp</span>
                                </button>
                              </div>

                              <div className="py-1">
                                <button
                                  type="button"
                                  onClick={(e) => handleDelete(row.id, e)}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 font-medium cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  </svg>
                                  <span>Delete Voucher</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {shortcutsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-slate-900">Keyboard Shortcuts</h3>
              <button
                type="button"
                onClick={() => setShortcutsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-600">Create New Purchase Return</span>
                <kbd className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700">Alt + R</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-600">Search Invoices / Returns</span>
                <kbd className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700">Ctrl + /</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-600">Save Return</span>
                <kbd className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700">Ctrl + S</kbd>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShortcutsModalOpen(false)}
              className="w-full rounded-lg bg-slate-100 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {settingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-slate-900">Purchase Return Settings</h3>
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-600">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded border-slate-300 text-indigo-600" />
                <span>Auto-generate Purchase Return / Debit Note numbers</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded border-slate-300 text-indigo-600" />
                <span>Auto-adjust stock balance on return</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded border-slate-300 text-indigo-600" />
                <span>Enable tax credit notes for GST return reconciliation</span>
              </label>
            </div>
            <button
              type="button"
              onClick={() => {
                setSettingsModalOpen(false);
                showToast("Settings saved");
              }}
              className="w-full rounded-lg bg-[#4338CA] py-2 text-xs font-semibold text-white hover:bg-[#3730A3]"
            >
              Save Preferences
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
