"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
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

interface CreditNoteRow {
  id: string;
  returnNumber: string;
  returnDate: string;
  docType?: string;
  creditNoteType?: string; // "ITEM_BASED" | "AMOUNT_BASED"
  gstCategory?: string; // "SECTION_34" | "COMMERCIAL"
  disposition?: string;
  warehouseId?: string;
  linkedReturnId?: string;
  settlementMode?: string;
  refundAmount?: number;
  allocatedAmount?: number;
  remainingCredit?: number;
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
  const now = new Date();
  switch (preset) {
    case "TODAY": {
      const today = isoDate(now);
      return { startDate: today, endDate: today };
    }
    case "YESTERDAY": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const str = isoDate(y);
      return { startDate: str, endDate: str };
    }
    case "THIS_WEEK": {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      return { startDate: isoDate(start), endDate: isoDate(now) };
    }
    case "THIS_MONTH": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: isoDate(start), endDate: isoDate(now) };
    }
    case "LAST_30_DAYS": {
      const start = new Date(now);
      start.setDate(now.getDate() - 30);
      return { startDate: isoDate(start), endDate: isoDate(now) };
    }
    case "LAST_365_DAYS": {
      const start = new Date(now);
      start.setDate(now.getDate() - 365);
      return { startDate: isoDate(start), endDate: isoDate(now) };
    }
    case "CUSTOM": {
      return {
        startDate: customStart || undefined,
        endDate: customEnd || undefined,
      };
    }
    default:
      return {};
  }
}

function CreditNoteListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang, tenantContext } = useAuth();

  const [rows, setRows] = useState<CreditNoteRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "SETTLED" | "CANCELLED">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "SECTION_34" | "COMMERCIAL">("ALL");

  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("LAST_365_DAYS");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const dateRange = useMemo(
    () => rangeForPreset(dateRangePreset, customStartDate, customEndDate),
    [dateRangePreset, customStartDate, customEndDate],
  );

  const fetchCreditNotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get("/sales/credit-notes", {
        docType: "CREDIT_NOTE",
        gstCategory: categoryFilter !== "ALL" ? categoryFilter : undefined,
        search: searchQuery.trim() || undefined,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        limit: 150,
      });
      setRows(extractList<CreditNoteRow>(res));
    } catch (err: any) {
      setError(err.message || "Failed to load credit notes.");
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, searchQuery, dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    if (!tenantContext.companyId) return;
    const timer = setTimeout(() => {
      fetchCreditNotes();
    }, 200);
    return () => clearTimeout(timer);
  }, [tenantContext.companyId, fetchCreditNotes]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    }
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Metrics
  const metrics = useMemo(() => {
    let totalIssued = 0;
    let sec34GstAdjusted = 0;
    let commercialDiscount = 0;
    let remainingCredit = 0;

    rows.forEach((r) => {
      if (r.status === "CANCELLED") return;
      const amt = Number(r.grandTotal || 0);
      totalIssued += amt;

      if (r.gstCategory === "COMMERCIAL") {
        commercialDiscount += amt;
      } else {
        const tax = Number(r.cgstAmount || 0) + Number(r.sgstAmount || 0) + Number(r.igstAmount || 0);
        sec34GstAdjusted += tax;
      }

      remainingCredit += Number(r.remainingCredit !== undefined ? r.remainingCredit : amt);
    });

    return {
      totalIssued,
      sec34GstAdjusted,
      commercialDiscount,
      remainingCredit,
      totalCount: rows.length,
    };
  }, [rows]);

  const scorecardSegments: ScorecardSegment[] = useMemo(
    () => [
      {
        id: "total_issued",
        label: lang === "gu" ? "કુલ ક્રેડિટ આપેલ" : "Total Credit Issued",
        value: formatInr(metrics.totalIssued),
        hint: `${metrics.totalCount} ${lang === "gu" ? "ક્રેડિટ નોટ્સ" : "Credit Notes"}`,
        tone: "accent",
      },
      {
        id: "sec34_tax",
        label: lang === "gu" ? "GST Sec 34 ટેક્સ રિવર્સલ" : "GST Tax Reversal (Sec 34)",
        value: formatInr(metrics.sec34GstAdjusted),
        hint: lang === "gu" ? "સરકારી GST લાયબિલિટી ઘટાડો" : "Eligible Output GST Reduction",
        tone: "positive",
      },
      {
        id: "commercial_rebate",
        label: lang === "gu" ? "કોમર્શિયલ ડિસ્કાઉન્ટ" : "Commercial Rebates",
        value: formatInr(metrics.commercialDiscount),
        hint: lang === "gu" ? "ટેક્સ સિવાય વેપારી ડિસ્કાઉન્ટ" : "Discount without GST Adjustment",
        tone: "neutral",
      },
      {
        id: "remaining_credit",
        label: lang === "gu" ? "બાકી ગ્રાહક ક્રેડિટ" : "Available Customer Credit",
        value: formatInr(metrics.remainingCredit),
        hint: lang === "gu" ? "ભવિષ્યના બિલમાં એડજસ્ટ કરવા પાત્ર" : "Unallocated credit on account",
        tone: "warning",
      },
    ],
    [metrics, lang],
  );

  const displayedRows = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter === "OPEN" && (r.status === "CLOSED" || r.status === "CANCELLED")) return false;
      if (statusFilter === "SETTLED" && r.status !== "CLOSED" && r.status !== "REFUNDED" && r.status !== "PAID") return false;
      if (statusFilter === "CANCELLED" && r.status !== "CANCELLED") return false;
      return true;
    });
  }, [rows, statusFilter]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto min-w-0 pb-16 font-sans">
      {/* 1. TOP HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:px-6 sm:py-3.5 rounded-2xl border border-[#E2E8E5] shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#1677E8]">
              {lang === "gu" ? "વેચાણ અને ક્રેડિટ એડજસ્ટમેન્ટ" : "SALES & CREDIT ADJUSTMENTS"}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[10px] font-bold text-slate-500 tabular-nums">
              {displayedRows.length} {lang === "gu" ? "રેકોર્ડ" : "Records"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-semibold text-[#182230] tracking-tight">
              {lang === "gu" ? "ક્રેડિટ નોટ રજિસ્ટર (Credit Notes)" : "Credit Notes Register"}
            </h1>
            <button
              type="button"
              onClick={fetchCreditNotes}
              title="Refresh Records"
              className="p-1 text-slate-400 hover:text-[#0F172A] rounded-md transition-colors"
            >
              <svg className={`w-4 h-4 ${isLoading ? "animate-spin text-[#1677E8]" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white text-[13px] font-medium text-[#182230] hover:bg-[#F8FAFC] transition-colors shadow-2xs cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print</span>
          </button>

          <Link
            href="/sales/credit-note/create"
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl bg-[#1677E8] hover:bg-[#1268D3] text-white text-[13px] font-medium shadow-md shadow-[#0F172A]/20 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>{lang === "gu" ? "+ નવી ક્રેડિટ નોટ" : "+ Create Credit Note"}</span>
          </Link>
        </div>
      </div>

      {/* 2. SCORECARD RIBBON */}
      <ScorecardRibbon segments={scorecardSegments} lang={lang} />

      {/* 3. CONTROLS: SEARCH, DATES, CATEGORY & STATUS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E2E8E5] shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* Search Box */}
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
              placeholder={lang === "gu" ? "શોધો: ક્રેડિટ નોટ #, ગ્રાહક..." : "Search credit note #, customer..."}
              className="w-full rounded-xl border border-[#E2E8F0] bg-[#F6F7F1] py-2 pl-9 pr-8 text-[13px] text-[#182230] placeholder-slate-400 focus:bg-white focus:border-[#1677E8] focus:outline-none transition-colors h-10"
            />
          </div>

          {/* GST Category Filter */}
          <div className="flex items-center gap-1 bg-[#F6F7F1] p-1 rounded-xl border border-[#E2E8E5]">
            <button
              type="button"
              onClick={() => setCategoryFilter("ALL")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                categoryFilter === "ALL" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All Types
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter("SECTION_34")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                categoryFilter === "SECTION_34" ? "bg-white text-blue-700 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              GST Sec 34
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter("COMMERCIAL")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                categoryFilter === "COMMERCIAL" ? "bg-white text-purple-700 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Commercial
            </button>
          </div>
        </div>

        {/* Status switcher */}
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
                statusFilter === tab.key ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"
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
          <button type="button" onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 font-bold">✕</button>
        </div>
      )}

      {/* 4. DATA GRID */}
      <div className="overflow-visible rounded-2xl border border-[#E2E8E5] bg-white shadow-xs">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="min-w-full text-left text-xs border-collapse">
            <thead className="bg-[#F8FAF9] border-b border-[#E2E8E5] text-[#5A6B66] font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3.5 whitespace-nowrap font-medium">Date</th>
                <th className="px-4 py-3.5 whitespace-nowrap font-medium">Credit Note #</th>
                <th className="px-4 py-3.5 whitespace-nowrap font-medium">Customer Name</th>
                <th className="px-4 py-3.5 whitespace-nowrap font-medium">Original Invoice</th>
                <th className="px-4 py-3.5 whitespace-nowrap font-medium">Type & Category</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap font-medium">Taxable Amount</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap font-medium">GST Tax</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap font-medium">Credit Total</th>
                <th className="px-4 py-3.5 text-center whitespace-nowrap font-medium">Status</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E5]">
              {isLoading && (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-[13px] text-[#5A6B66]">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#1677E8] border-t-transparent" />
                      <span>Loading credit notes...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading && displayedRows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-20 text-center text-[#5A6B66]">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3 shadow-inner">
                        <svg className="w-7 h-7 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-base font-bold text-[#1A2E2B]">
                        {lang === "gu" ? "કોઈ ક્રેડિટ નોટ મળી નથી." : "No credit notes found"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Issue financial adjustments, Section 34 tax credits, or post-sale rebates.
                      </p>
                      <Link
                        href="/sales/credit-note/create"
                        className="mt-4 rounded-xl bg-[#1677E8] h-9 px-3.5 text-[13px] font-medium text-white shadow-xs hover:bg-[#1268D3] transition-colors"
                      >
                        + Create Credit Note
                      </Link>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading &&
                displayedRows.map((row) => {
                  const tax = Number(row.cgstAmount || 0) + Number(row.sgstAmount || 0) + Number(row.igstAmount || 0);
                  const isCommercial = row.gstCategory === "COMMERCIAL";
                  const isSettled = row.status === "CLOSED" || row.status === "REFUNDED" || row.status === "PAID";

                  return (
                    <tr
                      key={row.id}
                      onClick={() => router.push(`/sales/credit-note/view/${row.id}`)}
                      className={`hover:bg-[#F8FAFC]/70 transition-colors cursor-pointer ${
                        row.status === "CANCELLED" ? "opacity-60 bg-slate-50/50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-[13px] text-slate-800 font-medium">
                        {formatDisplayDate(row.returnDate)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="tabular-nums font-bold text-[#0F172A] hover:text-[#1677E8] text-xs">
                          {row.returnNumber}
                        </span>
                        {row.linkedReturnId && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200" title="Linked to Physical Sales Return">
                            Return Linked
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 text-xs">
                          {row.party?.name || "Customer"}
                        </div>
                        {row.party?.phone && (
                          <div className="text-[10px] text-slate-400 tabular-nums">
                            {row.party.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {row.salesInvoice?.invoiceNumber ? (
                          <span className="tabular-nums font-medium text-slate-800">
                            #{row.salesInvoice.invoiceNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400">Direct Note</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              row.creditNoteType === "AMOUNT_BASED"
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {row.creditNoteType === "AMOUNT_BASED" ? "Amount-Based" : "Item-Based"}
                          </span>
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isCommercial
                                ? "bg-orange-50 text-orange-700 border border-orange-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {isCommercial ? "Commercial Rebate" : "GST Sec 34"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800 tabular-nums text-[13px]">
                        {formatInr(row.taxableAmount)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-[13px]">
                        {isCommercial ? (
                          <span className="text-slate-400 text-[11px]">— Commercial —</span>
                        ) : (
                          <span className="text-emerald-700 font-semibold">{formatInr(tax)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 tabular-nums text-[13px]">
                        {formatInr(row.grandTotal)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {isSettled ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Settled
                          </span>
                        ) : row.status === "CANCELLED" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Void
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span>Open Credit</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => router.push(`/sales/credit-note/view/${row.id}`)}
                            className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function CreditNotePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F4F5F7] p-8 text-center text-slate-500 text-sm">
          Loading credit notes...
        </div>
      }
    >
      <CreditNoteListPage />
    </Suspense>
  );
}
