"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import {
  einvoiceApi,
  EInvoiceListItem,
  EInvoiceListResponse,
  EInvoiceStatus,
  EInvoiceValidationResult,
} from "@/lib/einvoice";
import { formatInr } from "@/components/design-system/tokens";

export default function EInvoicesListPage() {
  const router = useRouter();
  const { tenantContext, lang, currentCompany } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EInvoiceListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EInvoiceStatus>("ALL");
  const [page, setPage] = useState(1);
  const limit = 15;

  // Selected row for actions
  const [selectedInvoice, setSelectedInvoice] = useState<EInvoiceListItem | null>(null);

  // Validation Drawer State
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<EInvoiceValidationResult | null>(null);
  const [validationInvoice, setValidationInvoice] = useState<EInvoiceListItem | null>(null);

  // Generate Modal State
  const [generateInvoice, setGenerateInvoice] = useState<EInvoiceListItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Cancel Modal State
  const [cancelInvoice, setCancelInvoice] = useState<EInvoiceListItem | null>(null);
  const [cancelReasonCode, setCancelReasonCode] = useState("2");
  const [cancelRemarks, setCancelRemarks] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Reconcile State
  const [isReconciling, setIsReconciling] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const loadData = useCallback(async () => {
    if (!tenantContext.companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await einvoiceApi.list({
        page,
        limit,
        search: search.trim() || undefined,
        status: statusFilter,
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load e-invoices.");
    } finally {
      setLoading(false);
    }
  }, [tenantContext.companyId, page, limit, search, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers
  const handleValidate = async (inv: EInvoiceListItem) => {
    setValidationInvoice(inv);
    setIsValidating(true);
    setValidationResult(null);
    try {
      const res = await einvoiceApi.validate(inv.id);
      setValidationResult(res);
    } catch (err: any) {
      setValidationResult({
        valid: false,
        status: "DRAFT",
        errors: [{ field: "server", code: "SERVER_ERROR", message: err.message || "Validation failed", severity: "error" }],
        warnings: [],
        summary: {
          documentNumber: inv.invoiceNumber,
          documentDate: inv.invoiceDate,
          documentType: inv.category,
          partyName: inv.party?.name || "",
          partyGstin: inv.party?.gstin || "",
          placeOfSupply: inv.placeOfSupply,
          totalItems: 0,
          taxableAmount: inv.taxableAmount,
          cgstAmount: inv.cgstAmount,
          sgstAmount: inv.sgstAmount,
          igstAmount: inv.igstAmount,
          cessAmount: inv.cessAmount,
          roundOff: 0,
          grandTotal: inv.grandTotal,
        },
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmGenerate = async () => {
    if (!generateInvoice) return;
    setIsGenerating(true);
    setGenerateProgress("Validating schema and contacting IRP...");
    setGenerateError(null);
    try {
      const res = await einvoiceApi.generate(generateInvoice.id);
      if (res.outcome === "SUCCEEDED" || res.irn) {
        setFeedbackMessage({
          type: "success",
          text: `E-Invoice registered successfully! IRN: ${res.irn || res.record?.irn}`,
        });
        setGenerateInvoice(null);
        await loadData();
      } else {
        setGenerateError(res.message || "IRP submission did not return an IRN.");
      }
    } catch (err: any) {
      setGenerateError(err.message || "E-Invoice generation request failed.");
    } finally {
      setIsGenerating(false);
      setGenerateProgress(null);
    }
  };

  const handleReconcile = async (inv: EInvoiceListItem) => {
    setIsReconciling(inv.id);
    try {
      const res = await einvoiceApi.reconcile(inv.id);
      if (res.outcome === "RECOVERED" || res.outcome === "SUCCEEDED") {
        setFeedbackMessage({
          type: "success",
          text: res.message || "IRN status successfully reconciled and registered!",
        });
      } else if (res.outcome === "NOT_FOUND") {
        setFeedbackMessage({
          type: "info",
          text: "IRP confirms no registration exists for this invoice. You may submit again.",
        });
      } else {
        setFeedbackMessage({
          type: "error",
          text: res.message || "Reconciliation could not determine IRP status.",
        });
      }
      await loadData();
    } catch (err: any) {
      setFeedbackMessage({
        type: "error",
        text: err.message || "Failed to reconcile with IRP.",
      });
    } finally {
      setIsReconciling(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelInvoice) return;
    if (!cancelRemarks || cancelRemarks.trim().length < 10) {
      setCancelError("Please enter remarks with at least 10 characters.");
      return;
    }
    setIsCancelling(true);
    setCancelError(null);
    try {
      const res = await einvoiceApi.cancel(cancelInvoice.id, cancelReasonCode, cancelRemarks.trim());
      if (res.cancelled || res.outcome === "SUCCEEDED" || res.status === "CNL") {
        setFeedbackMessage({
          type: "success",
          text: `E-Invoice for ${cancelInvoice.invoiceNumber} has been officially cancelled on IRP.`,
        });
        setCancelInvoice(null);
        setCancelRemarks("");
        await loadData();
      } else {
        setCancelError(res.message || "IRP did not accept cancellation.");
      }
    } catch (err: any) {
      setCancelError(err.message || "Cancellation failed.");
    } finally {
      setIsCancelling(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setFeedbackMessage({ type: "info", text: "IRN copied to clipboard!" });
  };

  const summary = data?.summary || {
    total: 0,
    registered: 0,
    ready: 0,
    draft: 0,
    rejected: 0,
    reconcile: 0,
    cancelled: 0,
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8">
      {/* Toast Notification */}
      {feedbackMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg border transition-all ${
            feedbackMessage.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : feedbackMessage.type === "error"
              ? "bg-rose-50 border-rose-300 text-rose-900"
              : "bg-blue-50 border-blue-300 text-blue-900"
          }`}
        >
          <span className="text-sm font-medium">{feedbackMessage.text}</span>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs font-bold text-slate-500 hover:text-slate-900"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              {lang === "gu" ? "જીએસટી ઈ-ઇન્વોઇસિંગ (IRN)" : "GST E-Invoicing (IRN)"}
            </h1>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              NIC Standard v1.1
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
            {lang === "gu"
              ? "IRP પોર્ટલ પરથી IRN મેળવો, ડિજિટલ સહી કરેલો QR કોડ જનરેટ કરો અને સંચાલન કરો."
              : "Generate real IRNs, official signed QR codes, validate statutory schema, and reconcile IRP status."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/settings/e-invoice"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {lang === "gu" ? "સેટિંગ્સ" : "IRP Settings"}
          </Link>

          <Link
            href="/reports/e-invoice-reconciliation"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {lang === "gu" ? "ઓડિટ લોગ" : "Audit History"}
          </Link>

          <Link
            href="/sales/e-invoices/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            {lang === "gu" ? "+ નવું ઈ-ઇનવોઇસ" : "+ Create E-Invoice"}
          </Link>
        </div>
      </div>

      {/* Alert if no GSTIN on file */}
      {!currentCompany?.gstin && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-200 text-amber-800 shrink-0 font-bold">!</span>
            <div>
              <p className="font-bold text-amber-900">GST Registration Required</p>
              <p className="text-amber-700">Your company has no GSTIN on file. Add your GSTIN in Company Settings to register invoices on IRP.</p>
            </div>
          </div>
          <Link
            href="/settings/company"
            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs shrink-0 self-start sm:self-auto transition"
          >
            Add GSTIN in Settings &rarr;
          </Link>
        </div>
      )}

      {/* Summary Metrics Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Eligible</div>
          <div className="mt-1 text-2xl font-black text-slate-900">{summary.total}</div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Registered (IRN)</div>
          <div className="mt-1 text-2xl font-black text-emerald-800">{summary.registered}</div>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 shadow-xs">
          <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Ready to Submit</div>
          <div className="mt-1 text-2xl font-black text-blue-800">{summary.ready}</div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 shadow-xs">
          <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Incomplete Draft</div>
          <div className="mt-1 text-2xl font-black text-amber-800">{summary.draft}</div>
        </div>

        <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3.5 shadow-xs">
          <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Reconcile Pending</div>
          <div className="mt-1 text-2xl font-black text-purple-800">{summary.reconcile}</div>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 shadow-xs">
          <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Failed / Rejected</div>
          <div className="mt-1 text-2xl font-black text-rose-800">{summary.rejected}</div>
        </div>
      </div>

      {/* Filter Bar & Tabs */}
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            {[
              { id: "ALL", label: "All Documents" },
              { id: "REGISTERED", label: "Registered" },
              { id: "READY", label: "Ready to Submit" },
              { id: "DRAFT", label: "Incomplete Draft" },
              { id: "UNKNOWN_RECONCILE", label: "Needs Reconcile" },
              { id: "REJECTED", label: "Rejected" },
              { id: "CANCELLED", label: "Cancelled" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id as EInvoiceStatus);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 transition ${
                  statusFilter === tab.id
                    ? "bg-emerald-600 text-white shadow-xs font-bold"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search invoice, customer, GSTIN..."
                className="w-full rounded-lg border border-slate-300 bg-slate-50/50 py-1.5 pl-8 pr-3 text-xs focus:border-emerald-500 focus:bg-white focus:outline-none"
              />
              <svg
                className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <button
              onClick={loadData}
              title="Refresh"
              className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Document</th>
                <th className="py-3 px-4">Customer & GSTIN</th>
                <th className="py-3 px-4">Place of Supply</th>
                <th className="py-3 px-4 text-right">Taxable</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">IRN / Details</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"></div>
                      <span>Loading e-invoice records...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-rose-600">
                    <div>{error}</div>
                    <button
                      onClick={loadData}
                      className="mt-2 text-xs font-bold text-emerald-700 underline"
                    >
                      Try again
                    </button>
                  </td>
                </tr>
              ) : !data || data.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <svg className="mx-auto mb-2 h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="font-semibold text-slate-600">No e-invoice records found</p>
                    <p className="text-[11px] text-slate-400">Try changing filters or generate an e-invoice from sales.</p>
                  </td>
                </tr>
              ) : (
                data.items.map((row) => {
                  const isRegistered = row.einvoiceStatus === "REGISTERED";
                  const isCancelled = row.einvoiceStatus === "CANCELLED";
                  const isReady = row.einvoiceStatus === "READY";
                  const isDraft = row.einvoiceStatus === "DRAFT";
                  const isReconcile = row.einvoiceStatus === "UNKNOWN_RECONCILE";
                  const isRejected = row.einvoiceStatus === "REJECTED";

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Document Column */}
                      <td className="py-3 px-4">
                        <Link
                          href={`/sales/e-invoices/${row.id}`}
                          className="font-bold text-slate-900 hover:text-emerald-700 transition"
                        >
                          {row.invoiceNumber}
                        </Link>
                        <div className="text-[10px] text-slate-400">
                          {row.invoiceDate} · <span className="uppercase">{row.category.replace("_", " ")}</span>
                        </div>
                      </td>

                      {/* Customer Column */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{row.party?.name || "Cash Customer"}</div>
                        {row.party?.gstin ? (
                          <div className="font-mono text-[10.5px] text-slate-600">{row.party.gstin}</div>
                        ) : (
                          <span className="text-[10px] text-amber-700 font-semibold">Missing GSTIN</span>
                        )}
                      </td>

                      {/* POS */}
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {row.placeOfSupply ? `Code ${row.placeOfSupply}` : "-"}
                      </td>

                      {/* Taxable */}
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        ₹{formatInr(row.taxableAmount)}
                      </td>

                      {/* Grand Total */}
                      <td className="py-3 px-4 text-right font-bold font-mono text-slate-900">
                        ₹{formatInr(row.grandTotal)}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4 text-center">
                        {isRegistered && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                            Registered
                          </span>
                        )}
                        {isCancelled && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 line-through">
                            Cancelled
                          </span>
                        )}
                        {isReady && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800">
                            Ready
                          </span>
                        )}
                        {isDraft && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                            Incomplete
                          </span>
                        )}
                        {isReconcile && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-800 animate-pulse">
                            Reconcile
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-800">
                            Failed
                          </span>
                        )}
                      </td>

                      {/* IRN / Details */}
                      <td className="py-3 px-4">
                        {isRegistered && row.eInvoice ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10.5px] text-slate-800">
                              {row.eInvoice.irn.slice(0, 10)}...{row.eInvoice.irn.slice(-6)}
                            </span>
                            <button
                              onClick={() => copyToClipboard(row.eInvoice!.irn)}
                              title="Copy full IRN"
                              className="text-slate-400 hover:text-emerald-700 transition"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        ) : isRejected && row.lastAttempt ? (
                          <div className="text-[10px] text-rose-700 truncate max-w-[140px]" title={row.lastAttempt.errorMessage}>
                            {row.lastAttempt.errorCode || row.lastAttempt.errorMessage || "Submission rejected"}
                          </div>
                        ) : isReconcile ? (
                          <span className="text-[10px] text-purple-700">Timeout / Pending Check</span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Not generated</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isRegistered ? (
                            <>
                              <Link
                                href={`/sales/e-invoices/${row.id}`}
                                className="rounded px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition"
                              >
                                View
                              </Link>
                              <Link
                                href={`/sales/e-invoices/${row.id}/preview`}
                                className="rounded px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 transition"
                              >
                                Preview
                              </Link>
                              <button
                                onClick={() => setCancelInvoice(row)}
                                className="rounded px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 transition"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleValidate(row)}
                                className="rounded px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition"
                              >
                                Validate
                              </button>

                              {isReconcile ? (
                                <button
                                  onClick={() => handleReconcile(row)}
                                  disabled={isReconciling === row.id}
                                  className="rounded bg-purple-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-purple-700 transition disabled:opacity-50"
                                >
                                  {isReconciling === row.id ? "Checking..." : "Reconcile"}
                                </button>
                              ) : (
                                <button
                                  onClick={() => setGenerateInvoice(row)}
                                  className="rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition"
                                >
                                  Generate IRN
                                </button>
                              )}

                              <Link
                                href={`/sales/e-invoices/${row.id}/preview`}
                                className="rounded px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition"
                              >
                                Preview
                              </Link>
                            </>
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

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-600">
            <div>
              Showing page <span className="font-bold">{data.page}</span> of{" "}
              <span className="font-bold">{data.totalPages}</span> ({data.total} total records)
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded border border-slate-300 px-2.5 py-1 font-semibold disabled:opacity-40 hover:bg-slate-50 transition"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
                className="rounded border border-slate-300 px-2.5 py-1 font-semibold disabled:opacity-40 hover:bg-slate-50 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Validation Checklist Drawer / Modal */}
      {validationInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Statutory Pre-Validation Checklist
                </h3>
                <p className="text-[11px] text-slate-500">
                  Invoice {validationInvoice.invoiceNumber} · {validationInvoice.party?.name}
                </p>
              </div>
              <button
                onClick={() => setValidationInvoice(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-5 space-y-4">
              {isValidating ? (
                <div className="py-8 text-center text-slate-500">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent mb-2"></div>
                  <span>Running local schema validation...</span>
                </div>
              ) : validationResult ? (
                <>
                  {/* Status Banner */}
                  <div
                    className={`rounded-lg p-3 text-xs flex items-center gap-3 ${
                      validationResult.valid
                        ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
                        : "bg-rose-50 border border-rose-200 text-rose-900"
                    }`}
                  >
                    <span className="text-xl">{validationResult.valid ? "✓" : "⚠️"}</span>
                    <div>
                      <div className="font-bold">
                        {validationResult.valid
                          ? "All Mandatory GST E-Invoice Validations Passed!"
                          : "Validation Issues Detected — Action Required"}
                      </div>
                      <div className="text-[11px] opacity-90">
                        {validationResult.valid
                          ? "This document complies with NIC schema rules and is ready for IRP generation."
                          : "Fix the following issues before submitting to the Invoice Registration Portal."}
                      </div>
                    </div>
                  </div>

                  {/* Errors List */}
                  {validationResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-rose-800">
                        Errors ({validationResult.errors.length})
                      </div>
                      {validationResult.errors.map((err, i) => (
                        <div key={i} className="rounded-md border border-rose-200 bg-rose-50/50 p-2.5 text-xs text-rose-950 flex items-start gap-2">
                          <span className="text-rose-600 font-bold">•</span>
                          <div>
                            <div className="font-semibold text-rose-900">{err.message}</div>
                            <div className="text-[10px] font-mono text-rose-700">Field: {err.field}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Warnings List */}
                  {validationResult.warnings.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-amber-800">
                        Advisories & Warnings ({validationResult.warnings.length})
                      </div>
                      {validationResult.warnings.map((warn, i) => (
                        <div key={i} className="rounded-md border border-amber-200 bg-amber-50/50 p-2.5 text-xs text-amber-950 flex items-start gap-2">
                          <span className="text-amber-600 font-bold">•</span>
                          <div>
                            <div className="font-semibold text-amber-900">{warn.message}</div>
                            <div className="text-[10px] font-mono text-amber-700">Field: {warn.field}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Summary Breakdown */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-1 font-mono text-slate-700">
                    <div className="flex justify-between">
                      <span>Taxable Amount:</span>
                      <span>₹{formatInr(validationResult.summary.taxableAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxes (CGST+SGST+IGST):</span>
                      <span>₹{formatInr(validationResult.summary.cgstAmount + validationResult.summary.sgstAmount + validationResult.summary.igstAmount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1">
                      <span>Grand Total:</span>
                      <span>₹{formatInr(validationResult.summary.grandTotal)}</span>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
              <button
                onClick={() => setValidationInvoice(null)}
                className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Close
              </button>
              {validationResult?.valid && (
                <button
                  onClick={() => {
                    const inv = validationInvoice;
                    setValidationInvoice(null);
                    setGenerateInvoice(inv);
                  }}
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
                >
                  Proceed to Generate IRN
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Generate Confirmation Modal */}
      {generateInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
              <h3 className="font-bold text-slate-900 text-sm">
                Confirm Statutory E-Invoice Generation
              </h3>
              <p className="text-[11px] text-slate-500">
                This will submit the invoice to an authorized IRP.
              </p>
            </div>

            <div className="p-5 text-xs text-slate-700 space-y-3">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                <p className="font-semibold">⚠️ Legal Document Notice:</p>
                <p className="mt-1 text-[11px]">
                  Generating an E-Invoice registers this document with the Government Invoice Registration Portal (IRP). A 64-character hash (IRN) and signed digital QR code will be generated.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Document No:</span>
                  <span className="font-bold text-slate-900">{generateInvoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Date:</span>
                  <span>{generateInvoice.invoiceDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Recipient:</span>
                  <span className="truncate max-w-[180px]">{generateInvoice.party?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Buyer GSTIN:</span>
                  <span>{generateInvoice.party?.gstin || "URP"}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-slate-200 pt-1 text-slate-900">
                  <span className="font-sans">Grand Total:</span>
                  <span>₹{formatInr(generateInvoice.grandTotal)}</span>
                </div>
              </div>

              {generateProgress && (
                <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"></div>
                  <span>{generateProgress}</span>
                </div>
              )}

              {generateError && (
                <div className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-rose-900 font-medium">
                  {generateError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
              <button
                onClick={() => setGenerateInvoice(null)}
                disabled={isGenerating}
                className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmGenerate}
                disabled={isGenerating}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50 shadow-xs"
              >
                {isGenerating ? "Submitting..." : "Generate E-Invoice Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {cancelInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="border-b border-slate-200 bg-rose-50/50 px-5 py-4">
              <h3 className="font-bold text-rose-950 text-sm">
                Cancel Registered E-Invoice (IRN)
              </h3>
              <p className="text-[11px] text-slate-500">
                Invoice {cancelInvoice.invoiceNumber}
              </p>
            </div>

            <div className="p-5 text-xs text-slate-700 space-y-3">
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-900">
                <p className="font-semibold">⚠️ 24-Hour Cancellation Window:</p>
                <p className="mt-1 text-[11px]">
                  An IRN can only be cancelled on the IRP within 24 hours of generation. Once cancelled, this invoice number cannot be reused for a new IRN under GST rules.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Cancellation Reason Code *
                </label>
                <select
                  value={cancelReasonCode}
                  onChange={(e) => setCancelReasonCode(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-rose-500 focus:outline-none"
                >
                  <option value="1">1 - Duplicate Invoice</option>
                  <option value="2">2 - Data Entry Mistake</option>
                  <option value="3">3 - Order Cancelled</option>
                  <option value="4">4 - Others</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Cancellation Remarks (min 10 characters) *
                </label>
                <textarea
                  value={cancelRemarks}
                  onChange={(e) => setCancelRemarks(e.target.value)}
                  rows={3}
                  placeholder="Explain why this e-invoice is being cancelled..."
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-rose-500 focus:outline-none"
                />
              </div>

              {cancelError && (
                <div className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-rose-900 font-medium">
                  {cancelError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
              <button
                onClick={() => setCancelInvoice(null)}
                disabled={isCancelling}
                className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
              >
                Close
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition disabled:opacity-50 shadow-xs"
              >
                {isCancelling ? "Cancelling..." : "Confirm IRP Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

