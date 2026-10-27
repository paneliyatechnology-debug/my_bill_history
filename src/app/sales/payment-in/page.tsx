"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

interface PaymentInRow {
  id: string;
  paymentNumber: string;
  voucherNumber?: string;
  paymentDate: string;
  partyName: string;
  totalSettled: number;
  amountReceived: number;
  paymentModeLabel: string;
  isCancelled?: boolean;
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

function formatPaymentDate(value?: string): string {
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

export default function PaymentInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang, tenantContext } = useAuth();

  const [rows, setRows] = useState<PaymentInRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // URL Param checking for initial state (e.g. date_range_key=last-365-days)
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

  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [reverseTarget, setReverseTarget] = useState<PaymentInRow | null>(null);
  const [reverseReason, setReverseReason] = useState("");
  const [isReversing, setIsReversing] = useState(false);
  const [reverseError, setReverseError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const datePickerRef = useRef<HTMLDivElement>(null);

  const dateRange = useMemo(
    () => rangeForPreset(dateRangePreset, customStartDate, customEndDate),
    [dateRangePreset, customStartDate, customEndDate],
  );

  const fetchReceipts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get("/sales/payment-in", {
        search: searchQuery.trim() || undefined,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        limit: 100,
      });
      setRows(extractList<PaymentInRow>(res));
    } catch (err: any) {
      setError(err.message || "Failed to load payments.");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    if (!tenantContext.companyId) return;
    const timer = setTimeout(() => {
      fetchReceipts();
    }, 200);
    return () => clearTimeout(timer);
  }, [tenantContext.companyId, fetchReceipts]);

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

  async function confirmReverse() {
    if (!reverseTarget) return;
    if (!reverseReason.trim()) {
      setReverseError(lang === "gu" ? "કારણ જરૂરી છે." : "A reason is required.");
      return;
    }
    setIsReversing(true);
    setReverseError(null);
    try {
      await apiClient.post(`/sales/payment-in/${reverseTarget.id}/reverse`, {
        reason: reverseReason.trim(),
      });
      setReverseTarget(null);
      setReverseReason("");
      setToast(lang === "gu" ? "ચુકવણી ઉલટાવી." : "Payment reversed successfully.");
      await fetchReceipts();
    } catch (err: any) {
      setReverseError(err.message || "Could not reverse this payment.");
    } finally {
      setIsReversing(false);
    }
  }

  // Filtered rows for client search query if any
  const displayedRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase().trim();
    return rows.filter(
      (r) =>
        (r.partyName && r.partyName.toLowerCase().includes(q)) ||
        (r.paymentNumber && r.paymentNumber.toLowerCase().includes(q)) ||
        (r.paymentModeLabel && r.paymentModeLabel.toLowerCase().includes(q)),
    );
  }, [rows, searchQuery]);

  return (
    <div className="space-y-4 px-6 py-4 min-w-0 max-w-[1600px] mx-auto pb-16 font-sans">
      {/* 1. Top Header: Title & Settings/Print Buttons */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          {lang === "gu" ? "આવક ચૂકવણી" : "Payment In"}
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

      {/* 2. Tab Bar: Payment Received with purple bottom border */}
      <div className="border-b border-slate-200">
        <div className="inline-flex items-center gap-2 border-b-2 border-[#4F46E5] pb-2 text-xs font-semibold text-[#4F46E5]">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#EEF2FF] text-[#4F46E5]">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
            </svg>
          </span>
          {lang === "gu" ? "મળેલી ચુકવણી" : "Payment Received"}
        </div>
      </div>

      {/* 3. Controls Bar: Search, Date Filter, and Create Payment In button */}
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
              <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
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

        {/* Create Payment In Button */}
        <Link
          href="/sales/payment-in/new"
          className="inline-flex items-center justify-center rounded-lg bg-[#4F46E5] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#4338CA] transition-colors"
        >
          {lang === "gu" ? "ચૂકવણી બનાવો" : "Create Payment In"}
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">✕</button>
        </div>
      )}

      {/* 4. Table: Exact columns matching myBillBook screenshot */}
      <div className="overflow-visible rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="min-w-full text-left text-xs border-collapse">
            <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span>{lang === "gu" ? "તારીખ" : "Date"}</span>
                    <span className="text-slate-400 text-[10px]">⇅</span>
                  </div>
                </th>
                <th className="px-4 py-3 whitespace-nowrap">{lang === "gu" ? "ચુકવણી નંબર" : "Payment Number"}</th>
                <th className="px-4 py-3 whitespace-nowrap">{lang === "gu" ? "પાર્ટી" : "Party Name"}</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">{lang === "gu" ? "સેટલ રકમ" : "Total Amount Settled"}</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">{lang === "gu" ? "મળેલી રકમ" : "Amount Received"}</th>
                <th className="px-4 py-3 whitespace-nowrap">{lang === "gu" ? "મોડ" : "Payment Mode"}</th>
                <th className="px-4 py-3 w-10 text-center whitespace-nowrap" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-xs text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                      <span>{lang === "gu" ? "લોડ થઈ રહ્યું છે..." : "Loading payments..."}</span>
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
                          <rect x="2" y="5" width="20" height="14" rx="2" />
                          <line x1="2" y1="10" x2="22" y2="10" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-slate-700">
                        {lang === "gu" ? "કોઈ ચુકવણી રેકોર્ડ મળી નથી." : "No payment records found"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        {lang === "gu" ? "આ સમયગાળામાં કોઈ ચુકવણી નથી." : "Record incoming payments from customers to settle invoices."}
                      </p>
                      <Link
                        href="/sales/payment-in/new"
                        className="mt-4 rounded-lg bg-[#4F46E5] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#4338CA]"
                      >
                        {lang === "gu" ? "ચૂકવણી બનાવો" : "Create Payment In"}
                      </Link>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading &&
                displayedRows.map((row) => (
                  <tr
                    key={row.id}
                    className={`hover:bg-slate-50/80 transition-colors ${row.isCancelled ? "opacity-60 bg-slate-50/30" : ""}`}
                  >
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap font-normal">
                      {formatPaymentDate(row.paymentDate)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                      <button
                        type="button"
                        className="hover:text-[#4F46E5] hover:underline transition-colors"
                        onClick={() => router.push(`/sales/payment-in/${row.id}`)}
                      >
                        {row.paymentNumber || row.voucherNumber}
                      </button>
                      {row.isCancelled && (
                        <span className="ml-2 rounded-full bg-slate-200/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600">
                          Reversed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                      {row.partyName}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800 whitespace-nowrap">
                      {formatInr(row.totalSettled)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                      {formatInr(row.amountReceived)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap capitalize">
                      {row.paymentModeLabel?.toLowerCase() === "cash" ? "Cash" : row.paymentModeLabel}
                    </td>
                    {/* Action 3-dots: relative with immediate popover to fix scroll issue */}
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
                              router.push(`/sales/payment-in/${row.id}`);
                            }}
                          >
                            <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            <span>View</span>
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
                            onClick={() => {
                              setActiveActionMenuId(null);
                              router.push(`/sales/payment-in/${row.id}?print=1`);
                            }}
                          >
                            <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            <span>Print</span>
                          </button>
                          {!row.isCancelled && (
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 transition-colors border-t border-slate-100"
                              onClick={() => {
                                setActiveActionMenuId(null);
                                setReverseTarget(row);
                                setReverseReason("");
                                setReverseError(null);
                              }}
                            >
                              <svg className="w-3.5 h-3.5 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                              </svg>
                              <span>Reverse</span>
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reverse Payment Modal */}
      {reverseTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-base font-bold text-slate-900">
              Reverse payment #{reverseTarget.paymentNumber}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              This will atomically reverse the payment voucher and restore the outstanding balance of any settled invoices.
            </p>
            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reversal Reason *</label>
              <textarea
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
                placeholder="e.g. Customer requested refund or incorrect voucher entered"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                rows={3}
              />
            </div>
            {reverseError && <p className="mt-2 text-xs text-rose-600">{reverseError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                onClick={() => setReverseTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isReversing || !reverseReason.trim()}
                className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 shadow-xs"
                onClick={confirmReverse}
              >
                {isReversing ? "Reversing..." : "Confirm Reverse"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
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
