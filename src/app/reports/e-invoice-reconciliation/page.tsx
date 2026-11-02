"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { einvoiceApi } from "@/lib/einvoice";

export default function EInvoiceReconciliationPage() {
  const { tenantContext, lang } = useAuth();

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [outcomeFilter, setOutcomeFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const loadLogs = useCallback(async () => {
    if (!tenantContext.companyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await einvoiceApi.getAuditLogs({ limit: 100 });
      setLogs(res.rows || []);
    } catch (err: any) {
      setError(err.message || "Could not load audit log history.");
    } finally {
      setLoading(false);
    }
  }, [tenantContext.companyId]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleReconcile = async (documentId: string) => {
    if (!documentId) return;
    setReconcilingId(documentId);
    setActionMessage(null);
    try {
      const res = await einvoiceApi.reconcile(documentId);
      if (res.outcome === "RECOVERED" || res.outcome === "SUCCEEDED") {
        setActionMessage({
          type: "success",
          text: res.message || "IRN registration successfully recovered and saved from IRP!",
        });
      } else if (res.outcome === "NOT_FOUND") {
        setActionMessage({
          type: "info",
          text: "IRP confirms no IRN exists for this document. It is safe to resubmit.",
        });
      } else {
        setActionMessage({
          type: "error",
          text: res.message || "Status check could not be completed with IRP.",
        });
      }
      await loadLogs();
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: err.message || "Reconciliation request failed.",
      });
    } finally {
      setReconcilingId(null);
    }
  };

  // Filtered rows
  const filteredLogs = logs.filter((log) => {
    if (outcomeFilter !== "ALL" && log.outcome !== outcomeFilter) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchOp = log.operation?.toLowerCase().includes(q);
      const matchDoc = log.documentId?.toLowerCase().includes(q);
      const matchExt = log.externalDocumentNumber?.toLowerCase().includes(q);
      const matchErr = log.errorMessage?.toLowerCase().includes(q);
      const matchKey = log.idempotencyKey?.toLowerCase().includes(q);
      if (!matchOp && !matchDoc && !matchExt && !matchErr && !matchKey) return false;
    }
    return true;
  });

  const metrics = {
    total: logs.length,
    succeeded: logs.filter((l) => l.outcome === "SUCCEEDED").length,
    failed: logs.filter((l) => l.outcome === "FAILED" || l.outcome === "VALIDATION_FAILED").length,
    uncertain: logs.filter((l) => l.outcome === "UNKNOWN" || l.outcome === "PENDING").length,
  };

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 lg:p-8">
      {/* Toast */}
      {actionMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg text-sm font-medium ${
            actionMessage.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : actionMessage.type === "error"
              ? "bg-rose-50 border-rose-300 text-rose-900"
              : "bg-blue-50 border-blue-300 text-blue-900"
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="font-bold text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/sales/e-invoices" className="hover:text-emerald-700 transition">
              E-Invoices
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800">Reconciliation & Audit</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            {lang === "gu" ? "ઈ-ઇનવોઇસ રિકોન્સિલેશન અને ઓડિટ હિસ્ટ્રી" : "E-Invoice Reconciliation & Audit Logs"}
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Track all IRP submission attempts, verify uncertain or timed-out requests, and safely reconcile government registration status.
          </p>
        </div>

        <Link
          href="/sales/e-invoices"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs"
        >
          ← Back to E-Invoices
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Events Logged</div>
          <div className="mt-1 text-2xl font-black text-slate-900">{metrics.total}</div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Confirmed Success</div>
          <div className="mt-1 text-2xl font-black text-emerald-800">{metrics.succeeded}</div>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Failed / Rejected</div>
          <div className="mt-1 text-2xl font-black text-rose-800">{metrics.failed}</div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Pending / Uncertain</div>
          <div className="mt-1 text-2xl font-black text-amber-800">{metrics.uncertain}</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            {[
              { id: "ALL", label: "All Events" },
              { id: "SUCCEEDED", label: "Succeeded" },
              { id: "FAILED", label: "Failed / Rejected" },
              { id: "PENDING", label: "Pending" },
              { id: "UNKNOWN", label: "Uncertain / Timed-out" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setOutcomeFilter(tab.id)}
                className={`rounded-lg px-3 py-1.5 transition ${
                  outcomeFilter === tab.id
                    ? "bg-slate-900 text-white shadow-xs font-bold"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by operation, key, error..."
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
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Operation</th>
                <th className="py-3 px-4">Outcome</th>
                <th className="py-3 px-4">Document / IRN</th>
                <th className="py-3 px-4">Error / Safe Details</th>
                <th className="py-3 px-4">Correlation Key</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"></div>
                      <span>Loading audit entries...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-rose-600">
                    {error}
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No reconciliation or audit records match the current filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isSuccess = log.outcome === "SUCCEEDED";
                  const isFail = log.outcome === "FAILED" || log.outcome === "VALIDATION_FAILED";
                  const isUncertain = log.outcome === "UNKNOWN" || log.outcome === "PENDING";

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("en-IN")}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900">{log.operation}</span>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">{log.environment}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            isSuccess
                              ? "bg-emerald-100 text-emerald-800"
                              : isFail
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800 animate-pulse"
                          }`}
                        >
                          {log.outcome}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {log.documentId && (
                          <Link
                            href={`/sales/e-invoices/${log.documentId}`}
                            className="font-semibold text-emerald-700 hover:underline block"
                          >
                            View Invoice
                          </Link>
                        )}
                        {log.externalDocumentNumber && (
                          <div className="font-mono text-[10px] text-slate-600 truncate max-w-[120px]" title={log.externalDocumentNumber}>
                            IRN: {log.externalDocumentNumber.slice(0, 8)}...
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        {log.errorMessage ? (
                          <div className="text-[11px] text-rose-800 font-medium break-words">
                            {log.errorCode ? <span className="font-bold font-mono">[{log.errorCode}] </span> : null}
                            {log.errorMessage}
                          </div>
                        ) : isSuccess ? (
                          <span className="text-[11px] text-emerald-700">Processed successfully</span>
                        ) : (
                          <span className="text-[11px] text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-[10px] text-slate-500 truncate max-w-[140px]" title={log.idempotencyKey}>
                        {log.idempotencyKey}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {log.documentId && (isUncertain || isFail) && (
                          <button
                            onClick={() => handleReconcile(log.documentId)}
                            disabled={reconcilingId === log.documentId}
                            className="rounded bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50"
                          >
                            {reconcilingId === log.documentId ? "Checking..." : "Reconcile"}
                          </button>
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
    </div>
  );
}

