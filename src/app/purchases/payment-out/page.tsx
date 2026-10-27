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

export interface PaymentOutRow {
  id: string;
  paymentNumber: string;
  voucherNumber?: string;
  paymentDate: string;
  partyName: string;
  partyId?: string;
  totalSettled: number;
  amountPaid: number;
  discount?: number;
  paymentMode: string;
  paymentModeLabel: string;
  narration?: string;
  referenceNo?: string;
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
    const day = now.getDay();
    const diff = (day + 6) % 7;
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
  } else if (preset === "LAST_WEEK") {
    const day = now.getDay();
    const diff = (day + 6) % 7;
    const prevSun = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff - 1);
    start = new Date(prevSun.getFullYear(), prevSun.getMonth(), prevSun.getDate() - 6);
    end = prevSun;
  } else if (preset === "THIS_MONTH") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (preset === "PREV_MONTH") {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0);
  } else if (preset === "THIS_QUARTER") {
    const q = Math.floor(now.getMonth() / 3);
    start = new Date(now.getFullYear(), q * 3, 1);
  } else if (preset === "PREV_QUARTER") {
    const q = Math.floor(now.getMonth() / 3) - 1;
    const y = q < 0 ? now.getFullYear() - 1 : now.getFullYear();
    const normQ = (q + 4) % 4;
    start = new Date(y, normQ * 3, 1);
    end = new Date(y, (normQ + 1) * 3, 0);
  } else if (preset === "CURRENT_FY") {
    const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    start = new Date(fyStartYear, 3, 1);
    end = new Date(fyStartYear + 1, 2, 31);
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
      startDate: customStart ? customStart : undefined,
      endDate: customEnd ? customEnd : undefined,
    };
  }

  return {
    startDate: start ? isoDate(start) : undefined,
    endDate: end ? isoDate(end) : undefined,
  };
}

export default function PaymentOutDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang, tenantContext } = useAuth();

  // Search and date filters
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>(() => {
    const preset = searchParams?.get("date_range_key");
    if (preset === "last-365-days") return "LAST_365_DAYS";
    return "LAST_365_DAYS";
  });
  const [customStartDate, setCustomStartDate] = useState(() => searchParams?.get("start_date") || "");
  const [customEndDate, setCustomEndDate] = useState(() => searchParams?.get("end_date") || "");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Table state & sorting
  const [rows, setRows] = useState<PaymentOutRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Actions menu
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  // Quick Settings modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsPrefix, setSettingsPrefix] = useState("PAY-");
  const [settingsSequence, setSettingsSequence] = useState("1");
  const [enablePrefix, setEnablePrefix] = useState(true);

  // Cancellation modal state
  const [cancelTarget, setCancelTarget] = useState<PaymentOutRow | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Load saved settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem("payment_out_quick_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.prefix !== undefined) setSettingsPrefix(parsed.prefix);
        if (parsed.sequence !== undefined) setSettingsSequence(parsed.sequence);
        if (parsed.enablePrefix !== undefined) setEnablePrefix(parsed.enablePrefix);
      }
    } catch {}
  }, []);

  function saveSettings() {
    try {
      localStorage.setItem(
        "payment_out_quick_settings",
        JSON.stringify({
          prefix: settingsPrefix,
          sequence: settingsSequence,
          enablePrefix,
        }),
      );
      setIsSettingsOpen(false);
      setToast(lang === "gu" ? "સેટિંગ્સ સાચવ્યા" : "Settings saved successfully.");
    } catch {}
  }

  const dateRange = useMemo(
    () => rangeForPreset(dateRangePreset, customStartDate, customEndDate),
    [dateRangePreset, customStartDate, customEndDate],
  );

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<any>("/purchases/payment-out", {
        search: searchQuery.trim() || undefined,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        limit: 100,
      });
      setRows(extractList<PaymentOutRow>(res));
    } catch (err: any) {
      setError(err.message || "Failed to load payment out entries.");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    if (!tenantContext.companyId) return;
    const timer = setTimeout(() => {
      fetchPayments();
    }, 200);
    return () => clearTimeout(timer);
  }, [tenantContext.companyId, fetchPayments]);

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

  async function confirmCancel() {
    if (!cancelTarget) return;
    setIsCancelling(true);
    try {
      await apiClient.delete(`/purchases/payment-out/${cancelTarget.id}`);
      setCancelTarget(null);
      setToast(lang === "gu" ? "ચુકવણી રદ કરી દીધી." : "Payment Out voucher cancelled successfully.");
      await fetchPayments();
    } catch (err: any) {
      setError(err.message || "Could not cancel this payment.");
    } finally {
      setIsCancelling(false);
    }
  }

  // Filtered & sorted rows
  const displayedRows = useMemo(() => {
    let result = [...rows];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          (r.partyName && r.partyName.toLowerCase().includes(q)) ||
          (r.paymentNumber && r.paymentNumber.toLowerCase().includes(q)) ||
          (r.paymentModeLabel && r.paymentModeLabel.toLowerCase().includes(q)) ||
          (r.referenceNo && r.referenceNo.toLowerCase().includes(q)),
      );
    }
    result.sort((a, b) => {
      const dateA = new Date(a.paymentDate).getTime();
      const dateB = new Date(b.paymentDate).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });
    return result;
  }, [rows, searchQuery, sortOrder]);

  const summary = useMemo(() => {
    let totalSettled = 0;
    let totalPaid = 0;
    for (const r of displayedRows) {
      if (r.isCancelled) continue;
      totalSettled += Number(r.totalSettled || 0);
      totalPaid += Number(r.amountPaid || 0);
    }
    return { totalSettled, totalPaid, count: displayedRows.length };
  }, [displayedRows]);

  return (
    <div className="space-y-4 px-6 py-4 min-w-0 max-w-[1600px] mx-auto pb-16 font-sans">
      {/* 1. Top Header: Title & Action Icons */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {lang === "gu" ? "જાવક ચૂકવણી" : "Payment Out"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === "gu"
              ? "વેપારીઓને ચૂકવેલી રકમ અને બિલ સેટલમેન્ટ મેનેજ કરો"
              : "Manage vendor payments, bill settlements, and supplier cash discounts"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Settings button */}
          <button
            type="button"
            title="Quick Payment Out Settings"
            onClick={() => setIsSettingsOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Print button */}
          <button
            type="button"
            title="Print Table"
            onClick={() => window.print()}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            {lang === "gu" ? "કુલ વ્યવહારો" : "Total Transactions"}
          </p>
          <p className="mt-1 text-xl font-bold text-slate-800">{summary.count}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            {lang === "gu" ? "ચુકવેલ કુલ રકમ" : "Total Amount Paid"}
          </p>
          <p className="mt-1 text-xl font-bold text-emerald-600">{formatInr(summary.totalPaid)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            {lang === "gu" ? "કુલ સેટલ રકમ" : "Total Amount Settled"}
          </p>
          <p className="mt-1 text-xl font-bold text-indigo-600">{formatInr(summary.totalSettled)}</p>
        </div>
      </div>

      {/* 3. Controls Bar: Search, Date Filter, and Create Payment Out button */}
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
              placeholder={lang === "gu" ? "શોધો પાર્ટી અથવા નંબર..." : "Search party or voucher #..."}
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

        {/* Create Payment Out Button */}
        <Link
          href="/purchases/payment-out/new"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#1D4ED8] transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          <span>{lang === "gu" ? "+ જાવક ચૂકવણી બનાવો" : "+ Create Payment Out"}</span>
        </Link>
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

      {/* 4. Table: Exact columns matching myBillBook screenshot */}
      <div className="overflow-visible rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto overflow-y-visible">
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
                  {lang === "gu" ? "ચુકવણી નંબર" : "Payment Number"}
                </th>
                <th className="px-4 py-3 whitespace-nowrap">
                  {lang === "gu" ? "વેપારીનું નામ" : "Party Name"}
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap">
                  {lang === "gu" ? "સેટલ રકમ" : "Total Amount Settled"}
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap">
                  {lang === "gu" ? "ચુકવેલ રકમ" : "Amount Paid"}
                </th>
                <th className="px-4 py-3 whitespace-nowrap">
                  {lang === "gu" ? "ચુકવણી મોડ" : "Payment Mode"}
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
                      <span>{lang === "gu" ? "લોડ કરી રહ્યું છે..." : "Loading payments..."}</span>
                    </div>
                  </td>
                </tr>
              ) : displayedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="mx-auto max-w-xs space-y-3">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                          <rect x="2" y="5" width="20" height="14" rx="2" />
                          <line x1="2" y1="10" x2="22" y2="10" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-slate-800">
                        {lang === "gu" ? "કોઈ જાવક ચૂકવણી મળી નથી" : "No payment out records found"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {lang === "gu"
                          ? "વેપારીઓને ચૂકવણી રેકોર્ડ કરવા માટે નીચે ક્લિક કરો."
                          : "Record supplier payments to settle pending purchase bills and manage cash flow."}
                      </p>
                      <Link
                        href="/purchases/payment-out/new"
                        className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#2563EB] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#1D4ED8]"
                      >
                        {lang === "gu" ? "+ નવી ચૂકવણી બનાવો" : "+ Record Payment Out"}
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedRows.map((row) => {
                  const isMenuOpen = activeActionMenuId === row.id;
                  return (
                    <tr
                      key={row.id}
                      onClick={() => router.push(`/purchases/payment-out/${row.id}`)}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                        row.isCancelled ? "opacity-60 bg-slate-50/50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {formatPaymentDate(row.paymentDate)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">
                        <span className="flex items-center gap-1.5">
                          <span>{row.paymentNumber || row.voucherNumber}</span>
                          {row.isCancelled && (
                            <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">
                              CANCELLED
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800">
                        {row.partyName}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-slate-600">
                        {formatInr(row.totalSettled)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-semibold text-slate-900">
                        {formatInr(row.amountPaid)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          {row.paymentModeLabel || row.paymentMode || "Cash"}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-center whitespace-nowrap relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveActionMenuId(isMenuOpen ? null : row.id)}
                          className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>

                        {isMenuOpen && (
                          <div
                            className="absolute right-4 top-10 z-40 w-40 rounded-xl border border-slate-200 bg-white py-1 text-left shadow-xl"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link
                              href={`/purchases/payment-out/${row.id}`}
                              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                            >
                              <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                              </svg>
                              <span>{lang === "gu" ? "વિગતો જુઓ" : "View Details"}</span>
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveActionMenuId(null);
                                window.open(`/purchases/payment-out/${row.id}?print=1`, "_blank");
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                            >
                              <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
                              </svg>
                              <span>{lang === "gu" ? "પ્રિન્ટ કરો" : "Print"}</span>
                            </button>
                            {!row.isCancelled && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveActionMenuId(null);
                                  setCancelTarget(row);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50"
                              >
                                <svg className="w-3.5 h-3.5 text-rose-500" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <span>{lang === "gu" ? "રદ કરો / Delete" : "Cancel / Delete"}</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Quick Payment Out Settings Modal matching screenshot */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Quick Payment Out Settings
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure prefix and automatic sequencing for vendor payments
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="py-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-800">
                    Payment Out Prefix & Sequence Number
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Automatically generate sequential voucher numbers
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enablePrefix}
                    onChange={(e) => setEnablePrefix(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                </label>
              </div>

              {enablePrefix && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Prefix
                    </label>
                    <input
                      type="text"
                      value={settingsPrefix}
                      onChange={(e) => setSettingsPrefix(e.target.value)}
                      placeholder="e.g. PAY-"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Sequence Number
                    </label>
                    <input
                      type="text"
                      value={settingsSequence}
                      onChange={(e) => setSettingsSequence(e.target.value)}
                      placeholder="e.g. 1"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveSettings}
                className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Cancel / Delete Confirmation Dialog */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl p-6">
            <h3 className="text-base font-bold text-slate-900">
              {lang === "gu" ? "ચુકવણી રદ કરો" : "Cancel Payment Out Voucher"}
            </h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel payment voucher{" "}
              <strong>#{cancelTarget.paymentNumber || cancelTarget.voucherNumber}</strong> for{" "}
              <strong>{cancelTarget.partyName}</strong> of{" "}
              <strong>{formatInr(cancelTarget.amountPaid)}</strong>?
              <br />
              <br />
              This will restore the unpaid balance on all associated purchase bills and reverse the accounting ledger entries.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setCancelTarget(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                No, Keep It
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={confirmCancel}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {isCancelling ? "Cancelling..." : "Yes, Cancel Voucher"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
