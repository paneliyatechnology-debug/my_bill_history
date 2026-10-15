"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";
import { StatusBadge } from "../../../components/ui/badge";

interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  status: "DRAFT" | "ISSUED" | "PAID" | "PARTIALLY_PAID" | "CANCELLED";
  party?: {
    id: string;
    name: string;
    gstin?: string;
  };
  taxableAmount: number;
  totalTax: number;
  grandTotal: number;
  paidAmount: number;
  outstandingBalance: number;
  isB2B: boolean;
}

export default function SalesInvoicesPage() {
  const { lang, tenantContext } = useAuth();
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get("/invoices/sales", {
        search: searchTerm || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
      });
      setInvoices(extractList(res));
    } catch (err: any) {
      setError(err.message || "Failed to load sales invoices.");
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchInvoices();
    }
  }, [tenantContext.companyId, fetchInvoices]);

  const filtered = invoices.filter((inv) => {
    if (statusFilter !== "ALL" && inv.status !== statusFilter) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(term) ||
      (inv.party?.name && inv.party.name.toLowerCase().includes(term))
    );
  });

  // Calculate high-level summary metrics
  const totalSalesValue = invoices.reduce(
    (sum, inv) => sum + Number(inv.grandTotal || 0),
    0
  );
  const totalOutstanding = invoices.reduce(
    (sum, inv) => sum + Number(inv.outstandingBalance || 0),
    0
  );
  const totalPaid = invoices.reduce(
    (sum, inv) => sum + Number(inv.paidAmount || 0),
    0
  );

  const formatCurrency = (val: number) => {
    return (
      "₹" +
      Number(val || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full min-w-0">
      {/* 1. Header with Title and Primary Saffron Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-[#E5E7EB] shadow-xs min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-6 bg-[#F47721] rounded-full inline-block shrink-0" />
            <h1 className="text-lg sm:text-2xl font-bold text-[#202124] tracking-tight truncate">
              {lang === "gu"
                ? "વેચાણ બિલોની યાદી (Sales Invoices)"
                : "Sales Invoices & Billing"}
            </h1>
          </div>
          <p className="text-xs text-[#667085] mt-1 ml-4.5 truncate">
            {lang === "gu"
              ? "ટેક્સ ઇન્વોઇસ, બિલ-બાય-બિલ ચુકવણી અને ગ્રાહકની બાકી રકમનું સંચાલન"
              : "GST Tax Invoices, bill-by-bill receivables, and payment allocations"}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 w-full sm:w-auto">
          <Link
            href="/sales/pos"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 bg-[#FFF3E8] hover:bg-[#FFE6D0] text-[#F47721] border border-[#F47721]/30 text-xs font-bold rounded-xl transition-all shadow-xs"
          >
            <span>⚡ {lang === "gu" ? "પીઓએસ કાઉન્ટર" : "POS Counter"}</span>
          </Link>
          <Link
            href="/sales/invoices/new"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 py-2 sm:px-5 sm:py-2.5 bg-[#F47721] hover:bg-[#D95F12] active:bg-[#B94B0A] text-white text-xs sm:text-sm font-bold rounded-xl shadow-saffron transition-all"
          >
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="truncate">
              {lang === "gu" ? "નવું બિલ બનાવો (F2)" : "Create New Bill (F2)"}
            </span>
          </Link>
        </div>
      </div>

      {/* 2. Responsive Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 min-w-0">
        {/* Total Invoices */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#E5E7EB] shadow-xs min-w-0 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider truncate">
              {lang === "gu" ? "કુલ બિલો" : "Total Invoices"}
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#FFF3E8] text-[#F47721] flex items-center justify-center shrink-0">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-2 min-w-0">
            {isLoading ? (
              <div className="h-7 w-16 bg-slate-100 animate-pulse rounded my-0.5" />
            ) : (
              <p className="text-lg sm:text-2xl font-bold font-mono text-[#202124] tracking-tight truncate">
                {invoices.length}
              </p>
            )}
            <span className="text-[10px] text-[#667085] truncate block mt-0.5">
              {invoices.filter((i) => i.status === "PAID").length}{" "}
              {lang === "gu" ? "ચૂકતે થયેલ" : "paid fully"}
            </span>
          </div>
        </div>

        {/* Total Sales Value */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#E5E7EB] shadow-xs min-w-0 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider truncate">
              {lang === "gu" ? "કુલ વેચાણ રકમ" : "Total Sales Value"}
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-[#475569] flex items-center justify-center shrink-0">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
          </div>
          <div className="mt-2 min-w-0">
            {isLoading ? (
              <div className="h-7 w-24 bg-slate-100 animate-pulse rounded my-0.5" />
            ) : (
              <p
                className="text-base sm:text-xl lg:text-2xl font-bold font-mono text-[#202124] tracking-tight truncate"
                title={formatCurrency(totalSalesValue)}
              >
                {formatCurrency(totalSalesValue)}
              </p>
            )}
            <span className="text-[10px] text-emerald-600 font-semibold truncate block mt-0.5">
              {lang === "gu" ? "તમામ ઇશ્યુ કરેલ બિલો" : "Gross billed revenue"}
            </span>
          </div>
        </div>

        {/* Received Payments */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#E5E7EB] shadow-xs min-w-0 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider truncate">
              {lang === "gu" ? "મળેલી રોકડ / રકમ" : "Received Payments"}
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-2 min-w-0">
            {isLoading ? (
              <div className="h-7 w-24 bg-slate-100 animate-pulse rounded my-0.5" />
            ) : (
              <p
                className="text-base sm:text-xl lg:text-2xl font-bold font-mono text-emerald-700 tracking-tight truncate"
                title={formatCurrency(totalPaid)}
              >
                {formatCurrency(totalPaid)}
              </p>
            )}
            <span className="text-[10px] text-[#667085] truncate block mt-0.5">
              {lang === "gu" ? "ખાતામાં જમા થયેલ" : "Settled collections"}
            </span>
          </div>
        </div>

        {/* Outstanding Due */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#E5E7EB] shadow-xs min-w-0 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider truncate">
              {lang === "gu" ? "કુલ બાકી ઉઘરાણી" : "Outstanding Due"}
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-2 min-w-0">
            {isLoading ? (
              <div className="h-7 w-24 bg-slate-100 animate-pulse rounded my-0.5" />
            ) : (
              <p
                className="text-base sm:text-xl lg:text-2xl font-bold font-mono text-amber-700 tracking-tight truncate"
                title={formatCurrency(totalOutstanding)}
              >
                {formatCurrency(totalOutstanding)}
              </p>
            )}
            <span className="text-[10px] text-amber-600 font-semibold truncate block mt-0.5">
              {invoices.filter((i) => Number(i.outstandingBalance) > 0).length}{" "}
              {lang === "gu" ? "બિલ બાકી" : "pending invoices"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Search and Status Filter */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="relative w-full flex-1 min-w-0">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#667085]">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              lang === "gu"
                ? "બિલ નંબર અથવા ગ્રાહક શોધો..."
                : "Search invoice no. or customer..."
            }
            className="w-full pl-10 pr-9 py-2.5 h-10 text-xs sm:text-sm bg-slate-50 border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 focus:border-[#F47721] focus:bg-white text-[#202124] transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#667085] hover:text-[#202124]"
              title="Clear search"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        <div className="w-full sm:w-56 shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by invoice status"
            className="w-full h-10 text-xs sm:text-sm bg-slate-50 border border-[#E5E7EB] text-[#202124] rounded-xl px-3.5 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 focus:border-[#F47721] focus:bg-white transition-all cursor-pointer"
          >
            <option value="ALL">All Statuses (તમામ સ્થિતિ)</option>
            <option value="ISSUED">ISSUED (ઇશ્યુ કરેલ)</option>
            <option value="PAID">PAID (ચૂકતે થયેલ)</option>
            <option value="PARTIALLY_PAID">PARTIALLY PAID (અંશતઃ બાકી)</option>
            <option value="DRAFT">DRAFT (કાચું બિલ)</option>
            <option value="CANCELLED">CANCELLED (રદ થયેલ)</option>
          </select>
        </div>
      </div>

      {/* 4. Error Message Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-xs sm:text-sm text-rose-800">
          <div className="flex items-center gap-2 min-w-0">
            <svg
              className="w-5 h-5 text-rose-500 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="truncate">{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchInvoices}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs shrink-0 transition-colors shadow-xs"
          >
            {lang === "gu" ? "ફરી પ્રયાસ કરો (Retry)" : "Retry"}
          </button>
        </div>
      )}

      {/* 5. Invoices Section Container */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden min-w-0">
        <div className="p-3.5 sm:p-4 border-b border-[#E5E7EB] flex items-center justify-between flex-wrap gap-2">
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-[#202124] uppercase tracking-wider truncate">
              {lang === "gu" ? "વેચાણ બિલો" : "Invoices List"}
              <span className="ml-2 font-mono text-xs font-semibold text-[#667085] bg-slate-100 px-2 py-0.5 rounded-full">
                {filtered.length} {filtered.length === 1 ? "invoice" : "invoices"}
              </span>
            </h2>
          </div>
          {(searchTerm || statusFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("ALL");
              }}
              className="text-xs font-semibold text-[#F47721] hover:text-[#D95F12] hover:underline"
            >
              {lang === "gu" ? "ફિલ્ટર્સ સાફ કરો" : "Reset Filters"}
            </button>
          )}
        </div>

        {/* State A: Loading State */}
        {isLoading ? (
          <div className="p-6">
            {/* Desktop Skeleton */}
            <div className="hidden md:block space-y-3">
              {[...Array(5)].map((_, idx) => (
                <div
                  key={idx}
                  className="h-11 bg-slate-100 animate-pulse rounded-lg"
                />
              ))}
            </div>
            {/* Mobile Skeleton */}
            <div className="block md:hidden space-y-3">
              {[...Array(3)].map((_, idx) => (
                <div
                  key={idx}
                  className="p-4 border border-[#E5E7EB] rounded-xl space-y-2.5 animate-pulse"
                >
                  <div className="flex justify-between items-center">
                    <div className="h-4 bg-slate-100 rounded w-1/3" />
                    <div className="h-4 bg-slate-100 rounded w-16" />
                  </div>
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                  <div className="h-6 bg-slate-100 rounded w-full" />
                </div>
              ))}
            </div>
          </div>
        ) : invoices.length === 0 ? (
          /* State B: Professional Empty State - No sales invoices yet */
          <div className="p-6 sm:p-10 text-center my-2 max-w-lg mx-auto w-full">
            <div className="w-14 h-14 rounded-full bg-[#FFF3E8] border border-[#FED7AA] flex items-center justify-center text-[#F47721] mx-auto shadow-inner mb-4">
              <svg
                className="w-7 h-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#202124] tracking-tight">
              {lang === "gu"
                ? "હજુ કોઈ વેચાણ બિલ નથી"
                : "No sales invoices yet"}
            </h3>
            <p className="text-xs sm:text-sm text-[#667085] mt-1.5 max-w-sm mx-auto leading-relaxed">
              {lang === "gu"
                ? "વેચાણ અને ગ્રાહકોની ચુકવણીનો હિસાબ રાખવા માટે તમારું પ્રથમ બિલ બનાવો."
                : "Create your first bill to start tracking sales and customer payments."}
            </p>
            <div className="mt-5">
              <Link
                href="/sales/invoices/new"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#F47721] hover:bg-[#D95F12] text-white text-xs sm:text-sm font-bold rounded-xl shadow-saffron transition-all transform active:scale-98"
              >
                <svg
                  className="w-4 h-4 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span>
                  {lang === "gu" ? "નવું બિલ બનાવો" : "Create New Bill"}
                </span>
              </Link>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          /* State C: Search/Filter Empty State */
          <div className="p-6 sm:p-10 text-center my-2 max-w-md mx-auto w-full">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mx-auto mb-3">
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-[#202124]">
              {lang === "gu"
                ? "કોઈ મેળ ખાતું બિલ મળ્યું નથી"
                : "No matching invoices found"}
            </h3>
            <p className="text-xs text-[#667085] mt-1 max-w-xs mx-auto">
              {lang === "gu"
                ? "તમારી શોધ ફિલ્ટર સાથે મેળ ખાતા કોઈ બિલ નથી. ફિલ્ટર સાફ કરી ફરી તપાસ કરો."
                : "No invoices match your current search or filter criteria. Try resetting them."}
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("ALL");
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#202124] text-xs font-semibold rounded-lg transition-colors"
              >
                {lang === "gu" ? "બધા ફિલ્ટર્સ સાફ કરો" : "Clear All Filters"}
              </button>
            </div>
          </div>
        ) : (
          /* State D: Populated Invoices - Dual Responsive Presentation */
          <>
            {/* Desktop Table View (>= md: 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-[#E5E7EB] text-[#667085] uppercase tracking-wider font-bold text-[11px]">
                    <th className="py-3 px-4">
                      {lang === "gu" ? "બિલ નંબર" : "Invoice No."}
                    </th>
                    <th className="py-3 px-4">
                      {lang === "gu" ? "તારીખ" : "Date"}
                    </th>
                    <th className="py-3 px-4">
                      {lang === "gu" ? "ગ્રાહક" : "Customer / Party"}
                    </th>
                    <th className="py-3 px-4 text-right">
                      {lang === "gu" ? "કરપાત્ર (₹)" : "Taxable (₹)"}
                    </th>
                    <th className="py-3 px-4 text-right">
                      {lang === "gu" ? "કુલ બિલ (₹)" : "Grand Total (₹)"}
                    </th>
                    <th className="py-3 px-4 text-right">
                      {lang === "gu" ? "બાકી રકમ (₹)" : "Balance (₹)"}
                    </th>
                    <th className="py-3 px-4 text-center">
                      {lang === "gu" ? "સ્થિતિ" : "Status"}
                    </th>
                    <th className="py-3 px-4 text-right">
                      {lang === "gu" ? "કાર્ય" : "Action"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-[#FFFAF5] transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#202124]">
                        <Link
                          href={`/sales/invoices/${inv.id}`}
                          className="text-[#F47721] hover:text-[#D95F12] hover:underline"
                        >
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#667085]">
                        {new Date(inv.invoiceDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4 font-medium text-[#202124]">
                        <div className="font-semibold">
                          {inv.party?.name ||
                            (lang === "gu"
                              ? "રોકડા ગ્રાહક"
                              : "Walk-in Cash Customer")}
                        </div>
                        {inv.party?.gstin && (
                          <div className="text-[10px] font-mono text-[#F47721] font-bold">
                            {inv.party.gstin}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {formatCurrency(inv.taxableAmount || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#202124]">
                        {formatCurrency(inv.grandTotal)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">
                        {Number(inv.outstandingBalance) > 0 ? (
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                            {formatCurrency(inv.outstandingBalance)}
                          </span>
                        ) : (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            ₹0.00
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/sales/invoices/${inv.id}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#F47721] hover:text-[#D95F12] px-2.5 py-1 rounded-lg hover:bg-[#FFF3E8] transition-all"
                        >
                          <span>View / Print</span>
                          <span>→</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List (< md: 768px) */}
            <div className="block md:hidden divide-y divide-[#E5E7EB]">
              {filtered.map((inv) => (
                <div
                  key={inv.id}
                  className="p-3.5 hover:bg-[#FFFAF5] transition-colors space-y-2.5"
                >
                  {/* Card Header: Invoice # & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/sales/invoices/${inv.id}`}
                      className="font-mono font-bold text-sm text-[#F47721] hover:underline truncate"
                    >
                      {inv.invoiceNumber}
                    </Link>
                    <StatusBadge status={inv.status} />
                  </div>

                  {/* Customer Details & Date */}
                  <div className="flex items-start justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#202124] truncate">
                        {inv.party?.name ||
                          (lang === "gu"
                            ? "રોકડા ગ્રાહક (Walk-in)"
                            : "Walk-in Cash Customer")}
                      </p>
                      {inv.party?.gstin && (
                        <p className="text-[10px] font-mono text-[#F47721] font-bold truncate">
                          GST: {inv.party.gstin}
                        </p>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-[#667085] shrink-0 mt-0.5">
                      {new Date(inv.invoiceDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  {/* Financial Metrics Strip */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <span className="text-[10px] text-[#667085] uppercase tracking-wider block">
                        {lang === "gu" ? "કુલ બિલ" : "Grand Total"}
                      </span>
                      <span className="font-mono font-bold text-sm text-[#202124] truncate block">
                        {formatCurrency(inv.grandTotal)}
                      </span>
                    </div>

                    <div className="text-right min-w-0">
                      <span className="text-[10px] text-[#667085] uppercase tracking-wider block">
                        {lang === "gu" ? "બાકી રકમ" : "Due Balance"}
                      </span>
                      {Number(inv.outstandingBalance) > 0 ? (
                        <span className="font-mono font-bold text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                          {formatCurrency(inv.outstandingBalance)}
                        </span>
                      ) : (
                        <span className="font-mono font-semibold text-xs text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          ₹0.00 Paid
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Link Button */}
                  <div className="pt-0.5">
                    <Link
                      href={`/sales/invoices/${inv.id}`}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-[#FFF3E8] hover:bg-[#FFE6D0] active:bg-[#FED7AA] text-[#F47721] border border-[#F47721]/20 rounded-xl text-xs font-bold transition-all shadow-xs"
                    >
                      <span>
                        {lang === "gu"
                          ? "બિલ જુઓ / પ્રિન્ટ કરો"
                          : "View / Print Bill"}
                      </span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
