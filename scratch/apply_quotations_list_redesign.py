content = '''"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { apiClient, extractList } from "@/lib/api-client";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/badge";
import { ScorecardRibbon, ScorecardSegment } from "@/components/design-system/scorecard-ribbon";
import { formatInr } from "@/components/design-system/tokens";

interface QuotationItem {
  id: string;
  itemId: string;
  description?: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  taxableAmount: number;
  taxRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  item?: { id: string; name: string; sku?: string };
}

interface Quotation {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  status: "DRAFT" | "ISSUED" | "PAID" | "PARTIALLY_PAID" | "CANCELLED";
  category: "PROFORMA_INVOICE" | "TAX_INVOICE";
  party?: {
    id: string;
    name: string;
    gstin?: string;
    phone?: string;
  };
  taxableAmount: number;
  totalTax?: number;
  grandTotal: number;
  paidAmount?: number;
  notes?: string;
  termsAndConditions?: string;
  items?: QuotationItem[];
}

export default function QuotationsPage() {
  const router = useRouter();
  const { lang, tenantContext } = useAuth();

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "DRAFT" | "CONVERTED" | "CANCELLED">("ALL");
  const [dateFilter, setDateFilter] = useState<"ALL" | "THIS_MONTH" | "THIS_YEAR">("ALL");

  // Conversion State
  const [convertingTarget, setConvertingTarget] = useState<Quotation | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [stockConfirmPrompt, setStockConfirmPrompt] = useState<string | null>(null);

  // Delete State
  const [deletingTarget, setDeletingTarget] = useState<Quotation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchQuotations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get("/invoices/sales", {
        category: "PROFORMA_INVOICE",
      });
      const list = extractList<Quotation>(res);
      setQuotations(list);
    } catch (err: any) {
      setError(err.message || "Failed to load quotations.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchQuotations();
    }
  }, [tenantContext.companyId, fetchQuotations]);

  // KPI Calculations
  const kpis = useMemo(() => {
    let totalEstimatedValue = 0;
    let openCount = 0;
    let openValue = 0;
    let convertedCount = 0;
    let convertedValue = 0;
    let cancelledCount = 0;

    quotations.forEach((q) => {
      const amt = Number(q.grandTotal || 0);
      totalEstimatedValue += amt;

      const isConverted = q.status === "ISSUED" || q.status === "PAID" || q.category === "TAX_INVOICE";
      if (q.status === "CANCELLED") {
        cancelledCount += 1;
      } else if (isConverted) {
        convertedCount += 1;
        convertedValue += amt;
      } else if (q.status === "DRAFT") {
        openCount += 1;
        openValue += amt;
      }
    });

    return {
      totalCount: quotations.length,
      totalEstimatedValue,
      openCount,
      openValue,
      convertedCount,
      convertedValue,
      cancelledCount,
    };
  }, [quotations]);

  // Filtered List
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      const isConverted = q.status === "ISSUED" || q.status === "PAID" || q.category === "TAX_INVOICE";

      // Status filter
      if (statusFilter === "DRAFT" && (isConverted || q.status === "CANCELLED")) return false;
      if (statusFilter === "CONVERTED" && !isConverted) return false;
      if (statusFilter === "CANCELLED" && q.status !== "CANCELLED") return false;

      // Date filter
      if (dateFilter === "THIS_MONTH") {
        const curMonth = new Date().toISOString().substring(0, 7);
        if (!q.invoiceDate?.startsWith(curMonth)) return false;
      } else if (dateFilter === "THIS_YEAR") {
        const curYear = new Date().getFullYear().toString();
        if (!q.invoiceDate?.startsWith(curYear)) return false;
      }

      // Search
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const matchesNo = q.invoiceNumber?.toLowerCase().includes(s);
        const matchesParty = q.party?.name?.toLowerCase().includes(s);
        const matchesPhone = q.party?.phone?.includes(s);
        const matchesGstin = q.party?.gstin?.toLowerCase().includes(s);
        if (!matchesNo && !matchesParty && !matchesPhone && !matchesGstin) return false;
      }

      return true;
    });
  }, [quotations, statusFilter, dateFilter, searchTerm]);

  // Scorecard segments for ribbon
  const scorecardSegments: ScorecardSegment[] = [
    {
      id: "all",
      label: "Total Quotations Recorded",
      labelGujarati: "કુલ કવોટેશન્સ",
      value: kpis.totalEstimatedValue,
      isCurrency: true,
      subtext: `${quotations.length} Quotations`,
      subtextGujarati: `${quotations.length} કવોટેશન`,
      variant: "primary",
      isActive: statusFilter === "ALL",
      onClick: () => setStatusFilter("ALL"),
    },
    {
      id: "converted",
      label: "Converted to Tax Invoices",
      labelGujarati: "પાકા બિલમાં રૂપાંતરિત",
      value: kpis.convertedValue,
      isCurrency: true,
      subtext: `${kpis.convertedCount} Invoices Created`,
      subtextGujarati: `${kpis.convertedCount} પાકા બિલ બનેલ`,
      variant: "success",
      isActive: statusFilter === "CONVERTED",
      onClick: () => setStatusFilter("CONVERTED"),
    },
    {
      id: "open",
      label: "Open / Pending Quotes",
      labelGujarati: "બાકી / ખુલ્લા કવોટેશન",
      value: kpis.openValue,
      isCurrency: true,
      subtext: `${kpis.openCount} Awaiting Approval`,
      subtextGujarati: `${kpis.openCount} મંજૂરી બાકી`,
      variant: "warning",
      isActive: statusFilter === "DRAFT",
      onClick: () => setStatusFilter("DRAFT"),
    },
    {
      id: "cancelled",
      label: "Cancelled / Void",
      labelGujarati: "રદ થયેલ કવોટેશન",
      value: kpis.cancelledCount,
      isCurrency: false,
      subtext: "Voided Estimates",
      subtextGujarati: "રદ થયેલ",
      variant: "neutral",
      isActive: statusFilter === "CANCELLED",
      onClick: () => setStatusFilter("CANCELLED"),
    },
  ];

  // Convert to Tax Invoice handler
  const handleConvertQuotation = async (forceNegativeStock = false) => {
    if (!convertingTarget) return;

    setIsConverting(true);
    setConversionError(null);

    try {
      const res: any = await apiClient.post(
        `/invoices/sales/${convertingTarget.id}/issue`,
        { allowNegativeStock: forceNegativeStock },
        undefined,
        `issue_qtn_${Date.now()}`,
      );

      setConvertingTarget(null);
      setStockConfirmPrompt(null);
      setToastMessage(
        lang === "gu"
          ? `કવોટેશન ${convertingTarget.invoiceNumber} સફળતાપૂર્વક પાકા ટેક્સ ઇનવોઇસ ${res?.invoiceNumber || ""} માં બદલાઈ ગયું છે!`
          : `Quotation ${convertingTarget.invoiceNumber} successfully converted to Tax Invoice ${res?.invoiceNumber || ""}!`,
      );
      setTimeout(() => setToastMessage(null), 5000);
      await fetchQuotations();
    } catch (err: any) {
      const msg = err.message || "";
      if (
        msg.includes("INSUFFICIENT_STOCK") ||
        msg.toLowerCase().includes("insufficient stock")
      ) {
        setStockConfirmPrompt(msg.replace("[INSUFFICIENT_STOCK]", "").trim());
      } else {
        setConversionError(
          msg ||
            (lang === "gu"
              ? "કવોટેશન કન્વર્ટ કરવામાં નિષ્ફળતા મળી."
              : "Failed to convert quotation to tax invoice."),
        );
      }
    } finally {
      setIsConverting(false);
    }
  };

  // Delete Quotation handler
  const handleDeleteQuotation = async () => {
    if (!deletingTarget) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/invoices/sales/${deletingTarget.id}`);
      setDeletingTarget(null);
      setToastMessage(
        lang === "gu" ? "કવોટેશન સફળતાપૂર્વક કાઢી નાખવામાં આવ્યું!" : "Quotation deleted successfully!",
      );
      setTimeout(() => setToastMessage(null), 3000);
      await fetchQuotations();
    } catch (err: any) {
      setError(err.message || "Failed to delete quotation.");
    } finally {
      setIsDeleting(false);
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    if (filteredQuotations.length === 0) return;
    const headers = ["Quotation No", "Date", "Validity", "Customer Name", "Customer Phone", "Grand Total", "Status"];
    const csvRows = filteredQuotations.map((q) => {
      const isConverted = q.status === "ISSUED" || q.status === "PAID" || q.category === "TAX_INVOICE";
      const statusLabel = isConverted ? "Converted" : q.status === "CANCELLED" ? "Cancelled" : "Open Quote";
      return [
        `"${q.invoiceNumber || ""}"`,
        q.invoiceDate ? new Date(q.invoiceDate).toLocaleDateString("en-GB") : "",
        q.dueDate ? new Date(q.dueDate).toLocaleDateString("en-GB") : "",
        `"${(q.party?.name || "").replace(/"/g, '""')}"`,
        `"${q.party?.phone || ""}"`,
        q.grandTotal || 0,
        statusLabel,
      ];
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `quotations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToastMessage("Quotations exported to CSV successfully!");
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto min-w-0 pb-16 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-xl animate-in slide-in-from-bottom-2 duration-150 border border-slate-800">
          <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. TOP UNIFIED COMMAND STRIP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:px-6 sm:py-3.5 rounded-2xl border border-[#E2E8E5] shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#26A58A]">
              {lang === "gu" ? "વેચાણ અને અંદાજપત્ર" : "SALES & ESTIMATES"}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[10px] font-bold text-slate-500 font-mono">
              {filteredQuotations.length} {lang === "gu" ? "કવોટેશન" : "Quotations"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-[#1A2E2B] tracking-tight">
              {lang === "gu" ? "કવોટેશન રજિસ્ટર (Quotations)" : "Quotations & Estimates"}
            </h1>
            <button
              type="button"
              onClick={fetchQuotations}
              title="Refresh Quotations"
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
            disabled={filteredQuotations.length === 0}
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
            title="Print Quotations Register"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print</span>
          </button>

          <Link
            href="/sales/quotations/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#174B43] hover:bg-[#123B35] text-white text-xs font-bold shadow-md shadow-[#174B43]/20 hover:shadow-lg hover:shadow-[#174B43]/30 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>{lang === "gu" ? "+ નવું કવોટેશન" : "+ Create Quotation"}</span>
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={lang === "gu" ? "શોધો: કવોટેશન નં, ગ્રાહક..." : "Search quotation #, customer..."}
              className="w-full rounded-xl border border-[#E2E8E5] bg-[#F6F7F1] py-2 pl-9 pr-8 text-xs text-[#1A2E2B] placeholder-slate-400 focus:bg-white focus:border-[#26A58A] focus:ring-1 focus:ring-[#26A58A] focus:outline-none transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            )}
          </div>

          {/* Date Range Quick Selector */}
          <div className="flex items-center gap-1 bg-[#F6F7F1] p-1 rounded-xl border border-[#E2E8E5]">
            {(
              [
                { key: "ALL", label: "All Time" },
                { key: "THIS_MONTH", label: "This Month" },
                { key: "THIS_YEAR", label: "This Year" },
              ] as const
            ).map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => setDateFilter(d.key)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  dateFilter === d.key
                    ? "bg-white text-[#174B43] shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status segment pills switcher */}
        <div className="flex items-center gap-1 bg-[#F6F7F1] p-1 rounded-xl border border-[#E2E8E5] self-start sm:self-auto">
          {(
            [
              { key: "ALL", label: "All" },
              { key: "DRAFT", label: "Open Quotes" },
              { key: "CONVERTED", label: "Converted" },
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
                <th className="px-4 py-3.5 whitespace-nowrap font-bold">{lang === "gu" ? "કવોટેશન નં." : "Quotation No."}</th>
                <th className="px-4 py-3.5 whitespace-nowrap font-bold">{lang === "gu" ? "તારીખ અને માન્યતા" : "Date & Validity"}</th>
                <th className="px-4 py-3.5 whitespace-nowrap font-bold">{lang === "gu" ? "ગ્રાહક (Party)" : "Customer / Party"}</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap font-bold">{lang === "gu" ? "અંદાજિત રકમ" : "Estimated Amount"}</th>
                <th className="px-4 py-3.5 text-center whitespace-nowrap font-bold">{lang === "gu" ? "સ્થિતિ" : "Status"}</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E5]">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-xs text-[#5A6B66]">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#26A58A] border-t-transparent" />
                      <span>{lang === "gu" ? "લોડ થઈ રહ્યું છે..." : "Loading quotations..."}</span>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading && filteredQuotations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-20 text-center text-[#5A6B66]">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-3 shadow-inner">
                        <svg className="w-7 h-7 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-base font-bold text-[#1A2E2B]">
                        {lang === "gu" ? "કોઈ કવોટેશન મળ્યા નથી." : "No quotations found"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {searchTerm
                          ? "No quotations match your current search filters."
                          : "Create professional sales quotations and convert them to GST Tax Invoices in 1-click."}
                      </p>
                      <Link
                        href="/sales/quotations/new"
                        className="mt-4 rounded-xl bg-[#174B43] px-4 py-2 text-xs font-bold text-white shadow-jade hover:bg-[#123B35] transition-colors"
                      >
                        {lang === "gu" ? "+ નવું કવોટેશન" : "+ Create Quotation"}
                      </Link>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading &&
                filteredQuotations.map((q) => {
                  const isConverted = q.status === "ISSUED" || q.status === "PAID" || q.category === "TAX_INVOICE";
                  return (
                    <tr
                      key={q.id}
                      className={`hover:bg-[#F2FAF7]/70 transition-colors group ${
                        q.status === "CANCELLED" ? "opacity-60 bg-slate-50/50" : ""
                      }`}
                    >
                      {/* Quotation No */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/sales/invoices/${q.id}`}
                            className="font-mono font-bold text-[#174B43] hover:text-[#26A58A] hover:underline transition-colors text-xs"
                          >
                            {q.invoiceNumber}
                          </Link>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/60">
                            Estimate
                          </span>
                        </div>
                      </td>

                      {/* Date & Validity */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-[#1A2E2B]">
                        <div>
                          {q.invoiceDate
                            ? new Date(q.invoiceDate).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </div>
                        {q.dueDate && (
                          <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                            Valid till: {new Date(q.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                          </div>
                        )}
                      </td>

                      {/* Customer / Party */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-[#1A2E2B] text-xs">
                          {q.party?.name || "Cash Customer"}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                          {q.party?.phone && <span>📞 {q.party.phone}</span>}
                          {q.party?.gstin && <span>GST: {q.party.gstin}</span>}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-right font-bold text-[#1A2E2B] whitespace-nowrap font-mono text-[13px]">
                        {formatInr(q.grandTotal)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {isConverted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Converted</span>
                          </span>
                        ) : q.status === "CANCELLED" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                            Void
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span>Open Quote</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isConverted && q.status !== "CANCELLED" && (
                            <button
                              type="button"
                              onClick={() => {
                                setConvertingTarget(q);
                                setConversionError(null);
                                setStockConfirmPrompt(null);
                              }}
                              className="px-2.5 py-1 text-xs font-bold text-white bg-[#174B43] hover:bg-[#123B35] rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                              title="Convert this quotation to legal Tax Invoice"
                            >
                              <svg className="w-3.5 h-3.5 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              <span>Convert</span>
                            </button>
                          )}

                          <Link
                            href={`/sales/invoices/${q.id}`}
                            className="p-1.5 text-xs text-[#174B43] hover:bg-[#F2FAF7] rounded-lg font-semibold transition-colors border border-[#E2E8E5]"
                            title="View / Print PDF"
                          >
                            View
                          </Link>

                          {!isConverted && (
                            <button
                              type="button"
                              onClick={() => setDeletingTarget(q)}
                              className="p-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Quotation"
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

      {/* Convert to Tax Invoice Modal */}
      <Modal
        isOpen={!!convertingTarget}
        onClose={() => {
          setConvertingTarget(null);
          setConversionError(null);
          setStockConfirmPrompt(null);
        }}
        title={
          convertingTarget
            ? `${lang === "gu" ? "પાકું બિલ (Tax Invoice) બનાવો" : "Convert to Tax Invoice"} - ${convertingTarget.invoiceNumber}`
            : ""
        }
      >
        {convertingTarget && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              {lang === "gu"
                ? `શું તમે કવોટેશન "${convertingTarget.invoiceNumber}" ને કાયદેસરના પાકા GST ટેક્સ ઇનવોઇસમાં રૂપાંતરિત કરવા માંગો છો? આનાથી ઓટોમેટિક ક્રમિક ઇનવોઇસ નંબર ફાળવવામાં આવશે અને સ્ટોક ડિસ્પેચ થશે.`
                : `Are you sure you want to convert quotation "${convertingTarget.invoiceNumber}" into a legal GST Tax Invoice? This will allocate the next sequential invoice number and dispatch items from inventory.`}
            </p>

            {conversionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                <span>⚠️</span>
                <span>{conversionError}</span>
              </div>
            )}

            {/* Stock Confirmation prompt if stock is insufficient */}
            {stockConfirmPrompt && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <span className="text-base">⚠️</span>
                  <span>{lang === "gu" ? "સ્ટોક ચેતવણી (Low Stock Warning)" : "Insufficient Stock Alert"}</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {stockConfirmPrompt}
                </p>
                <p className="text-xs text-amber-900 font-semibold">
                  {lang === "gu"
                    ? "શું તમે નકારાત્મક સ્ટોક (Negative Stock) મંજૂર કરીને બિલ ઇશ્યૂ કરવા માંગો છો?"
                    : "Do you want to override and issue the invoice allowing negative inventory?"}
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleConvertQuotation(true)}
                    disabled={isConverting}
                    className="px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    {isConverting ? "Converting..." : lang === "gu" ? "હા, છતાં પણ પાકું બિલ બનાવો" : "Yes, Force Issue with Negative Stock"}
                  </button>
                </div>
              </div>
            )}

            {!stockConfirmPrompt && (
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConvertingTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  {lang === "gu" ? "રદ કરો" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={() => handleConvertQuotation(false)}
                  disabled={isConverting}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-[#174B43] hover:bg-[#123B35] rounded-xl shadow-card transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isConverting && (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{lang === "gu" ? "કન્વર્ટ કરો (Confirm Convert)" : "Convert to Tax Invoice"}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingTarget}
        onClose={() => setDeletingTarget(null)}
        title={lang === "gu" ? "કવોટેશન કાઢી નાખો" : "Delete Quotation"}
      >
        {deletingTarget && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              {lang === "gu"
                ? `શું તમે ખરેખર કવોટેશન "${deletingTarget.invoiceNumber}" કાઢી નાખવા માંગો છો? આ ક્રિયા પૂર્વવત્ કરી શકાશે નહીં.`
                : `Are you sure you want to delete quotation "${deletingTarget.invoiceNumber}"? This action cannot be undone.`}
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                {lang === "gu" ? "રદ કરો" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleDeleteQuotation}
                disabled={isDeleting}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-all cursor-pointer"
              >
                {isDeleting ? "Deleting..." : lang === "gu" ? "કાઢી નાખો (Delete)" : "Delete"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
'''

with open("src/app/sales/quotations/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated src/app/sales/quotations/page.tsx successfully!")
