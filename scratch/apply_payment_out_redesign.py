content = '''"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

export default function PaymentOutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang, tenantContext } = useAuth();

  const [rows, setRows] = useState<PaymentOutRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SETTLED" | "ADVANCE" | "CANCELLED">("ALL");

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

  // Actions & Reversal state
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [reverseTarget, setReverseTarget] = useState<PaymentOutRow | null>(null);
  const [reverseReason, setReverseReason] = useState("");
  const [isReversing, setIsReversing] = useState(false);
  const [reverseError, setReverseError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const datePickerRef = useRef<HTMLDivElement>(null);

  const dateRange = useMemo(
    () => rangeForPreset(dateRangePreset, customStartDate, customEndDate),
    [dateRangePreset, customStartDate, customEndDate],
  );

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get("/purchases/payment-out", {
        search: searchQuery.trim() || undefined,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        limit: 150,
      });
      setRows(extractList<PaymentOutRow>(res));
    } catch (err: any) {
      setError(err.message || "Failed to load payment out records.");
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
      await apiClient.post(`/purchases/payment-out/${reverseTarget.id}/reverse`, {
        reason: reverseReason.trim(),
      });
      setReverseTarget(null);
      setReverseReason("");
      setToast(lang === "gu" ? "વાઉચર રદ કરવામાં આવ્યું." : "Payment out voucher reversed successfully.");
      await fetchPayments();
    } catch (err: any) {
      setReverseError(err.message || "Could not reverse this payment voucher.");
    } finally {
      setIsReversing(false);
    }
  }

  // KPI Metrics Calculations
  const metrics = useMemo(() => {
    let totalPaid = 0;
    let totalSettled = 0;
    let totalAdvance = 0;
    let totalDiscount = 0;
    let settledCount = 0;
    let advanceCount = 0;
    let cancelledCount = 0;
    let activeCount = 0;

    rows.forEach((r) => {
      if (r.isCancelled) {
        cancelledCount += 1;
      } else {
        const paid = Number(r.amountPaid) || 0;
        const set = Number(r.totalSettled) || 0;
        const disc = Number(r.discount) || 0;
        totalPaid += paid;
        totalSettled += set;
        totalDiscount += disc;
        activeCount += 1;
        const adv = Math.max(0, paid - set);
        if (adv > 0.009) {
          totalAdvance += adv;
          advanceCount += 1;
        }
        if (set > 0 && adv <= 0.009) {
          settledCount += 1;
        }
      }
    });

    return {
      totalPaid,
      totalSettled,
      totalAdvance,
      totalDiscount,
      settledCount,
      advanceCount,
      cancelledCount,
      activeCount,
      totalCount: rows.length,
    };
  }, [rows]);

  // Filtered rows for client search query & status filter
  const displayedRows = useMemo(() => {
    let filtered = rows;

    if (statusFilter === "SETTLED") {
      filtered = filtered.filter(
        (r) => !r.isCancelled && (Number(r.amountPaid) || 0) <= (Number(r.totalSettled) || 0) + 0.009,
      );
    } else if (statusFilter === "ADVANCE") {
      filtered = filtered.filter(
        (r) => !r.isCancelled && (Number(r.amountPaid) || 0) > (Number(r.totalSettled) || 0) + 0.009,
      );
    } else if (statusFilter === "CANCELLED") {
      filtered = filtered.filter((r) => r.isCancelled);
    }

    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase().trim();
    return filtered.filter(
      (r) =>
        (r.partyName && r.partyName.toLowerCase().includes(q)) ||
        (r.paymentNumber && r.paymentNumber.toLowerCase().includes(q)) ||
        (r.voucherNumber && r.voucherNumber.toLowerCase().includes(q)) ||
        (r.paymentModeLabel && r.paymentModeLabel.toLowerCase().includes(q)) ||
        (r.referenceNo && r.referenceNo.toLowerCase().includes(q)),
    );
  }, [rows, statusFilter, searchQuery]);

  // Scorecard segments for ribbon
  const scorecardSegments: ScorecardSegment[] = [
    {
      id: "all",
      label: "Total Outflows / Paid",
      labelGujarati: "કુલ ચૂકવેલ રકમ",
      value: metrics.totalPaid,
      isCurrency: true,
      subtext: `${metrics.activeCount} Active Payments`,
      subtextGujarati: `${metrics.activeCount} સક્રિય વાઉચર`,
      badge: DATE_PRESET_LABELS[dateRangePreset],
      variant: "primary",
      isActive: statusFilter === "ALL",
      onClick: () => setStatusFilter("ALL"),
    },
    {
      id: "settled",
      label: "Bills Settled",
      labelGujarati: "સેટલ થયેલ ખરીદ બિલ",
      value: metrics.totalSettled,
      isCurrency: true,
      subtext: `${metrics.settledCount} Bills Cleared`,
      subtextGujarati: `${metrics.settledCount} બિલ ચૂકવાયેલ`,
      variant: "success",
      isActive: statusFilter === "SETTLED",
      onClick: () => setStatusFilter("SETTLED"),
    },
    {
      id: "advance",
      label: "Advance / Overpaid",
      labelGujarati: "અગાઉથી આપેલી રકમ",
      value: metrics.totalAdvance,
      isCurrency: true,
      subtext: `${metrics.advanceCount} Vendor Credit Balances`,
      subtextGujarati: `${metrics.advanceCount} વેપારી જમા`,
      variant: "warning",
      isActive: statusFilter === "ADVANCE",
      onClick: () => setStatusFilter("ADVANCE"),
    },
    {
      id: "cancelled",
      label: "Reversed / Void",
      labelGujarati: "રદ થયેલ વાઉચર",
      value: metrics.cancelledCount,
      isCurrency: false,
      subtext: "Voided Records",
      subtextGujarati: "રદ થયેલ વાઉચર",
      variant: "neutral",
      isActive: statusFilter === "CANCELLED",
      onClick: () => setStatusFilter("CANCELLED"),
    },
  ];

  // CSV Export
  const handleExportCsv = () => {
    if (displayedRows.length === 0) return;
    const headers = ["Date", "Payment Number", "Supplier Name", "Settled on Bills", "Amount Paid", "Payment Mode", "Reference No", "Status"];
    const csvRows = displayedRows.map((r) => [
      formatPaymentDate(r.paymentDate),
      `"${r.paymentNumber || r.voucherNumber || ""}"`,
      `"${(r.partyName || "").replace(/"/g, '""')}"`,
      r.totalSettled || 0,
      r.amountPaid || 0,
      `"${r.paymentModeLabel || ""}"`,
      `"${r.referenceNo || ""}"`,
      r.isCancelled ? "Reversed" : "Active",
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payment_out_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToast(lang === "gu" ? "CSV સફળતાપૂર્વક ડાઉનલોડ થયું!" : "Payment Out records exported to CSV!");
  };

  // Helper for Payment Mode pill badges
  const renderModeBadge = (modeLabel?: string) => {
    const ml = (modeLabel || "cash").toLowerCase();
    if (ml.includes("bank") || ml.includes("transfer") || ml.includes("neft") || ml.includes("rtgs")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
          <svg className="w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          {modeLabel || "Bank Transfer"}
        </span>
      );
    }
    if (ml.includes("upi") || ml.includes("gpay") || ml.includes("phonepe") || ml.includes("paytm")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
          <svg className="w-3 h-3 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          UPI
        </span>
      );
    }
    if (ml.includes("cheque") || ml.includes("check")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
          <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Cheque
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
        <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <circle cx="12" cy="12" r="2" />
        </svg>
        Cash
      </span>
    );
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto min-w-0 pb-16 font-sans">
      {/* 1. TOP UNIFIED COMMAND STRIP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:px-6 sm:py-3.5 rounded-2xl border border-[#E2E8E5] shadow-xs">
        {/* Left: Module identity & title */}
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#26A58A]">
              {lang === "gu" ? "ખરીદી અને ચુકવણી (DISBURSEMENTS)" : "PURCHASES & CASH OUTFLOW"}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[10px] font-bold text-slate-500 font-mono">
              {displayedRows.length} {lang === "gu" ? "વાઉચરો" : "Vouchers"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-[#1A2E2B] tracking-tight">
              {lang === "gu" ? "જાવક ચૂકવણી (Payment Out)" : "Payment Out Vouchers"}
            </h1>
            <button
              type="button"
              onClick={fetchPayments}
              title="Refresh Payments"
              className="p-1 text-slate-400 hover:text-[#174B43] rounded-md transition-colors"
            >
              <svg className={`w-4 h-4 ${isLoading ? "animate-spin text-[#26A58A]" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={displayedRows.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E2E8E5] bg-white text-xs font-semibold text-[#1A2E2B] hover:bg-[#F2FAF7] hover:border-[#85D5C2] disabled:opacity-50 transition-colors shadow-2xs"
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
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E2E8E5] bg-white text-xs font-semibold text-[#1A2E2B] hover:bg-[#F2FAF7] hover:border-[#85D5C2] transition-colors shadow-2xs"
            title="Print Ledger"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print</span>
          </button>

          <Link
            href="/purchases/payment-out/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#174B43] hover:bg-[#123B35] text-white text-xs font-bold shadow-md shadow-[#174B43]/20 hover:shadow-lg hover:shadow-[#174B43]/30 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>{lang === "gu" ? "+ નવી જાવક ચૂકવણી" : "+ Record Payment Out"}</span>
          </Link>
        </div>
      </div>

      {/* 2. SCORECARD RIBBON */}
      <ScorecardRibbon segments={scorecardSegments} lang={lang} />

      {/* 3. CONTROLS BAR: OMNI-SEARCH, STATUS FILTER & DATE PICKER */}
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
              placeholder={lang === "gu" ? "શોધો: સપ્લાયર, વાઉચર નંબર, સંદર્ભ..." : "Search supplier, voucher no, ref..."}
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
              { key: "SETTLED", label: "Settled" },
              { key: "ADVANCE", label: "Advance" },
              { key: "CANCELLED", label: "Void" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
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
                <th className="px-4 py-3.5 whitespace-nowrap font-bold">
                  <div className="flex items-center gap-1">
                    <span>{lang === "gu" ? "તારીખ" : "Date"}</span>
                    <span className="text-slate-300 text-[10px]">⇅</span>
                  </div>
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap font-bold">{lang === "gu" ? "વાઉચર નંબર" : "Voucher #"}</th>
                <th className="px-4 py-3.5 whitespace-nowrap font-bold">{lang === "gu" ? "સપ્લાયર નામ" : "Supplier / Vendor"}</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap font-bold">{lang === "gu" ? "સેટલ રકમ" : "Settled on Bills"}</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap font-bold">{lang === "gu" ? "ચૂકવેલ રકમ" : "Total Outflow"}</th>
                <th className="px-4 py-3.5 whitespace-nowrap font-bold">{lang === "gu" ? "ચુકવણી પદ્ધતિ" : "Payment Mode"}</th>
                <th className="px-4 py-3.5 text-center whitespace-nowrap font-bold">Status</th>
                <th className="px-4 py-3.5 w-10 text-center whitespace-nowrap font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E5]">
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-xs text-[#5A6B66]">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#26A58A] border-t-transparent" />
                      <span>{lang === "gu" ? "લોડ થઈ રહ્યું છે..." : "Loading payment records..."}</span>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading && displayedRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-20 text-center text-[#5A6B66]">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-3 shadow-inner">
                        <svg className="w-7 h-7 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                          <rect x="2" y="5" width="20" height="14" rx="2" />
                          <line x1="2" y1="10" x2="22" y2="10" />
                        </svg>
                      </div>
                      <p className="text-base font-bold text-[#1A2E2B]">
                        {lang === "gu" ? "કોઈ જાવક ચૂકવણી રેકોર્ડ મળી નથી." : "No payment out vouchers found"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {searchQuery
                          ? "No transactions matched your current search filters."
                          : "Record supplier payments to settle purchase bills and track cash disbursements."}
                      </p>
                      <Link
                        href="/purchases/payment-out/new"
                        className="mt-4 rounded-xl bg-[#174B43] px-4 py-2 text-xs font-bold text-white shadow-jade hover:bg-[#123B35] transition-colors"
                      >
                        {lang === "gu" ? "+ નવી જાવક ચૂકવણી" : "+ Record Payment Out"}
                      </Link>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading &&
                displayedRows.map((row) => (
                  <tr
                    key={row.id}
                    className={`hover:bg-[#F2FAF7]/70 transition-colors group ${
                      row.isCancelled ? "opacity-60 bg-slate-50/50" : ""
                    }`}
                  >
                    {/* Date */}
                    <td className="px-4 py-3 text-[#1A2E2B] whitespace-nowrap font-medium text-xs">
                      {formatPaymentDate(row.paymentDate)}
                    </td>

                    {/* Voucher Number */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        className="text-[#174B43] hover:text-[#26A58A] hover:underline transition-colors font-mono font-bold text-xs"
                        onClick={() => router.push(`/purchases/payment-out/${row.id}`)}
                      >
                        {row.paymentNumber || row.voucherNumber || "VOUCHER"}
                      </button>
                    </td>

                    {/* Party Name */}
                    <td className="px-4 py-3 font-semibold text-[#1A2E2B] whitespace-nowrap">
                      {row.partyId ? (
                        <Link
                          href={`/parties/${row.partyId}`}
                          className="hover:text-[#174B43] hover:underline transition-colors"
                        >
                          {row.partyName}
                        </Link>
                      ) : (
                        <span>{row.partyName}</span>
                      )}
                    </td>

                    {/* Total Settled on Bills */}
                    <td className="px-4 py-3 text-right font-medium text-slate-600 whitespace-nowrap font-mono">
                      {formatInr(row.totalSettled)}
                    </td>

                    {/* Total Outflow Paid */}
                    <td className="px-4 py-3 text-right font-bold text-[#1A2E2B] whitespace-nowrap font-mono text-[13px]">
                      {formatInr(row.amountPaid)}
                    </td>

                    {/* Payment Mode */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {renderModeBadge(row.paymentModeLabel)}
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {row.isCancelled ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                          Reversed
                        </span>
                      ) : Number(row.amountPaid) > Number(row.totalSettled) + 0.009 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                          Advance
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Settled
                        </span>
                      )}
                    </td>

                    {/* Action 3-dots */}
                    <td className="relative px-4 py-3 text-center whitespace-nowrap overflow-visible">
                      <button
                        type="button"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-[#F2FAF7] hover:text-[#174B43] transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveActionMenuId(activeActionMenuId === row.id ? null : row.id);
                        }}
                      >
                        <span className="text-base font-bold leading-none">⋮</span>
                      </button>

                      {activeActionMenuId === row.id && (
                        <div
                          className="absolute right-3 top-8 z-50 w-40 rounded-xl border border-[#E2E8E5] bg-white py-1.5 text-left text-xs shadow-xl animate-in fade-in zoom-in-95 duration-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-[#1A2E2B] hover:bg-[#F2FAF7] transition-colors cursor-pointer"
                            onClick={() => {
                              setActiveActionMenuId(null);
                              router.push(`/purchases/payment-out/${row.id}`);
                            }}
                          >
                            <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            <span>View Voucher</span>
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-[#1A2E2B] hover:bg-[#F2FAF7] transition-colors cursor-pointer"
                            onClick={() => {
                              setActiveActionMenuId(null);
                              router.push(`/purchases/payment-out/${row.id}?print=1`);
                            }}
                          >
                            <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            <span>Print Voucher</span>
                          </button>
                          {!row.isCancelled && (
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 transition-colors border-t border-slate-100 cursor-pointer"
                              onClick={() => {
                                setActiveActionMenuId(null);
                                setReverseTarget(row);
                                setReverseReason("");
                                setReverseError(null);
                              }}
                            >
                              <svg className="w-3.5 h-3.5 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                              </svg>
                              <span>Reverse Voucher</span>
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

      {/* REVERSE PAYMENT CONFIRMATION MODAL */}
      {reverseTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#E2E8E5] animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-[#1A2E2B]">
                  Reverse Payment #{reverseTarget.paymentNumber || reverseTarget.voucherNumber}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Supplier: <strong className="text-slate-800">{reverseTarget.partyName}</strong> • {formatInr(reverseTarget.amountPaid)}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-amber-50/70 p-3 rounded-xl border border-amber-200/60">
              ⚠️ This will reverse the payment voucher and restore the outstanding balance of all settled purchase bills.
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#1A2E2B] mb-1">
                Reversal Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
                placeholder="e.g. Incorrect disbursement amount, returned cheque, or duplicated record"
                className="w-full rounded-xl border border-[#E2E8E5] bg-[#F6F7F1] p-3 text-xs text-[#1A2E2B] placeholder-slate-400 focus:bg-white focus:border-[#26A58A] focus:ring-1 focus:ring-[#26A58A] focus:outline-none transition-colors"
                rows={3}
              />
            </div>

            {reverseError && (
              <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                {reverseError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                className="rounded-xl border border-[#E2E8E5] px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => setReverseTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isReversing || !reverseReason.trim()}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 shadow-xs transition-colors cursor-pointer"
                onClick={confirmReverse}
              >
                {isReversing ? "Reversing..." : "Confirm Reversal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
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

with open("src/app/purchases/payment-out/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated src/app/purchases/payment-out/page.tsx successfully!")
