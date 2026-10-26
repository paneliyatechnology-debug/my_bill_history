"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { apiClient, extractList } from "@/lib/api-client";
import { Modal } from "@/components/ui/modal";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { DataTable, ColumnDef } from "@/components/ui/data-table";

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
      // Fetch all proforma invoices / quotations
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

  // KPIs
  const kpis = useMemo(() => {
    let totalEstimatedValue = 0;
    let openCount = 0;
    let convertedCount = 0;
    let convertedValue = 0;

    quotations.forEach((q) => {
      const amt = Number(q.grandTotal || 0);
      totalEstimatedValue += amt;

      const isConverted = q.status === "ISSUED" || q.status === "PAID" || q.category === "TAX_INVOICE";
      if (isConverted) {
        convertedCount += 1;
        convertedValue += amt;
      } else if (q.status === "DRAFT") {
        openCount += 1;
      }
    });

    return {
      totalCount: quotations.length,
      totalEstimatedValue,
      openCount,
      convertedCount,
      convertedValue,
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

  const columns: ColumnDef<Quotation>[] = [
    {
      header: lang === "gu" ? "કવોટેશન નં." : "Quotation No.",
      accessorKey: "invoiceNumber",
      sortable: true,
      cell: (q) => (
        <div>
          <span className="font-mono font-bold text-slate-900 bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded text-xs">
            {q.invoiceNumber}
          </span>
          <div className="text-[10px] text-slate-400 font-sans mt-0.5">
            {lang === "gu" ? "અંદાજપત્ર / કાચું બિલ" : "Estimate / Quote"}
          </div>
        </div>
      ),
    },
    {
      header: lang === "gu" ? "તારીખ / માન્યતા" : "Date & Validity",
      accessorKey: "invoiceDate",
      sortable: true,
      cell: (q) => (
        <div>
          <div className="font-mono text-xs text-slate-800">
            {q.invoiceDate ? new Date(q.invoiceDate).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }) : "-"}
          </div>
          {q.dueDate && (
            <div className="text-[11px] text-slate-500 font-medium">
              {lang === "gu" ? "માન્યતા: " : "Valid: "}
              {new Date(q.dueDate).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
              })}
            </div>
          )}
        </div>
      ),
    },
    {
      header: lang === "gu" ? "ગ્રાહક (Customer / Party)" : "Customer / Party",
      accessorKey: "party",
      cell: (q) => (
        <div>
          <div className="font-bold text-slate-900">{q.party?.name || "Cash Customer"}</div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
            {q.party?.phone && <span>📞 {q.party.phone}</span>}
            {q.party?.gstin && <span>GST: {q.party.gstin}</span>}
          </div>
        </div>
      ),
    },
    {
      header: lang === "gu" ? "અંદાજિત રકમ (₹)" : "Amount (₹)",
      accessorKey: "grandTotal",
      sortable: true,
      className: "text-right",
      cell: (q) => (
        <span className="font-mono font-bold text-slate-900 text-sm">
          ₹{Number(q.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: lang === "gu" ? "સ્થિતિ" : "Status",
      accessorKey: "status",
      cell: (q) => {
        const isConverted = q.status === "ISSUED" || q.status === "PAID" || q.category === "TAX_INVOICE";
        if (isConverted) {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span>✓</span>
              <span>{lang === "gu" ? "પાકું બિલ બન્યું (Converted)" : "Converted to Invoice"}</span>
            </span>
          );
        }
        if (q.status === "CANCELLED") {
          return <StatusBadge status="CANCELLED" />;
        }
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <span>📝</span>
            <span>{lang === "gu" ? "ખુલ્લું (Open / Quote)" : "Open Quotation"}</span>
          </span>
        );
      },
    },
    {
      header: lang === "gu" ? "ક્રિયાઓ" : "Actions",
      className: "text-right",
      cell: (q) => {
        const isConverted = q.status === "ISSUED" || q.status === "PAID" || q.category === "TAX_INVOICE";
        return (
          <div className="flex items-center justify-end gap-1.5">
            {!isConverted && q.status !== "CANCELLED" && (
              <button
                onClick={() => {
                  setConvertingTarget(q);
                  setConversionError(null);
                  setStockConfirmPrompt(null);
                }}
                className="px-2.5 py-1 text-xs font-bold text-white bg-primary hover:bg-primary-hover active:bg-primary-pressed rounded-lg shadow-sm transition-all flex items-center gap-1"
                title="Convert this quotation to legal Tax Invoice"
              >
                <span>🚀</span>
                <span>{lang === "gu" ? "પાકું બિલ બનાવો" : "Convert to Invoice"}</span>
              </button>
            )}

            <Link
              href={`/sales/invoices/${q.id}`}
              className="p-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-lg font-semibold transition-colors border border-slate-200"
              title="View Quotation"
            >
              {lang === "gu" ? "જુઓ / PDF" : "View / PDF"}
            </Link>

            {!isConverted && (
              <button
                onClick={() => setDeletingTarget(q)}
                className="p-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Delete Quotation"
              >
                ✕
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in text-xs font-semibold">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-border shadow-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/sales/invoices"
              className="text-xs font-semibold text-muted hover:text-primary flex items-center gap-1"
            >
              <span>←</span>
              <span>{lang === "gu" ? "વેચાણ બિલ રજિસ્ટર" : "Sales Invoices"}</span>
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {lang === "gu"
              ? "કવોટેશન અને અંદાજપત્ર (Quotations / Estimates)"
              : "Quotations & Estimates Register"}
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            {lang === "gu"
              ? "ગ્રાહકો માટે કાચા બિલ / ભાવપત્રક બનાવો અને સ્વીકારાય ત્યારે ૧-ક્લિકમાં પાકા બિલ (Tax Invoice) માં બદલો"
              : "Create professional quotations & estimates, and convert them to GST Tax Invoices in 1-click"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/sales/quotations/new"
            className="px-5 py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover active:bg-primary-pressed rounded-xl shadow-card hover:shadow-hover transition-all flex items-center gap-2"
          >
            <span>+</span>
            <span>{lang === "gu" ? "નવું કવોટેશન બનાવો" : "Create New Quotation"}</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <span>{lang === "gu" ? "કુલ કવોટેશન્સ" : "Total Quotations"}</span>
            <span className="p-1.5 bg-amber-50 text-amber-700 rounded-lg text-sm">📋</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {kpis.totalCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            {lang === "gu" ? "કુલ નોંધાયેલ અંદાજપત્રો" : "All quotations on record"}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <span>{lang === "gu" ? "કુલ અંદાજિત રકમ" : "Total Estimated Value"}</span>
            <span className="p-1.5 bg-sky-50 text-sky-700 rounded-lg text-sm">💰</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            ₹{kpis.totalEstimatedValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            {lang === "gu" ? "તમામ કવોટેશન્સની સરવાળા રકમ" : "Sum of all estimates"}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <span>{lang === "gu" ? "પાકા બિલમાં રૂપાંતરિત" : "Converted to Invoice"}</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm">🚀</span>
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-mono">
            {kpis.convertedCount}{" "}
            <span className="text-xs font-sans text-slate-500">
              (₹{kpis.convertedValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })})
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            {lang === "gu" ? "સફળતાપૂર્વક પાકા બિલ બનેલ" : "Approved & issued invoices"}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <span>{lang === "gu" ? "બાકી કવોટેશન્સ" : "Open / Pending Quotes"}</span>
            <span className="p-1.5 bg-violet-50 text-violet-700 rounded-lg text-sm">⏳</span>
          </div>
          <div className="text-2xl font-bold text-amber-700 font-mono">
            {kpis.openCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            {lang === "gu" ? "હજુ પાકા બિલમાં ફેરવવાના બાકી" : "Awaiting customer approval"}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            🔍
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              lang === "gu"
                ? "કવોટેશન નં., ગ્રાહકનું નામ અથવા GSTIN શોધો..."
                : "Search quotation #, customer name, GSTIN..."
            }
            className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary outline-none transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === "ALL"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {lang === "gu" ? "બધા (All)" : "All"}
            </button>
            <button
              onClick={() => setStatusFilter("DRAFT")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === "DRAFT"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              📝 {lang === "gu" ? "ખુલ્લા (Open)" : "Open"}
            </button>
            <button
              onClick={() => setStatusFilter("CONVERTED")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === "CONVERTED"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ✓ {lang === "gu" ? "પાકા બિલ બન્યા" : "Converted"}
            </button>
            <button
              onClick={() => setStatusFilter("CANCELLED")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === "CANCELLED"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {lang === "gu" ? "રદ થયેલ" : "Cancelled"}
            </button>
          </div>

          {/* Date Range Dropdown */}
          <select
            value={dateFilter}
            onChange={(e: any) => setDateFilter(e.target.value)}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none focus:bg-white focus:border-primary"
          >
            <option value="ALL">{lang === "gu" ? "તમામ તારીખો (All Time)" : "All Time"}</option>
            <option value="THIS_MONTH">{lang === "gu" ? "આ મહિને (This Month)" : "This Month"}</option>
            <option value="THIS_YEAR">{lang === "gu" ? "આ નાણાકીય વર્ષ (This FY)" : "This FY"}</option>
          </select>
        </div>
      </div>

      {/* Main Quotations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredQuotations}
          isLoading={isLoading}
          searchPlaceholder={lang === "gu" ? "કવોટેશન શોધો..." : "Search quotations..."}
        />
      </div>

      {/* Convert to Tax Invoice Confirmation Modal */}
      <Modal
        isOpen={!!convertingTarget}
        onClose={() => {
          setConvertingTarget(null);
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
                    className="px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl shadow-sm transition-all"
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
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  {lang === "gu" ? "રદ કરો" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={() => handleConvertQuotation(false)}
                  disabled={isConverting}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover active:bg-primary-pressed rounded-xl shadow-card transition-all flex items-center gap-2"
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
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                {lang === "gu" ? "રદ કરો" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleDeleteQuotation}
                disabled={isDeleting}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-all"
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
