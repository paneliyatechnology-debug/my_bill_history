"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../context/auth-context";
import { GstFrame, Panel, useGstPeriod, DataTablePagination } from "../../../components/gst/gst-kit";
import { einvoiceApi, EInvoiceListItem } from "../../../lib/einvoice";
import { CustomSelect } from "@/components/ui/dropdown-system";
import {
  QrCode,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  ExternalLink,
  RefreshCw,
  Ban,
  FileCheck,
} from "lucide-react";

function formatInr(val: string | number | undefined | null): string {
  const num = Number(val) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
}

export default function EinvoiceManagementPage() {
  return (
    <GstFrame
      title="E-Invoice (IRN Management)"
      notice="Statutory Invoice Registration Portal (IRP) integration per Rule 48(4) of the CGST Rules. Generates 64-character Invoice Reference Numbers (IRN), digitally signed QR codes, and keeps an immutable audit log."
    >
      <Body />
    </GstFrame>
  );
}

function Body() {
  const { tenantContext, currentCompany } = useAuth();
  const period = useGstPeriod();
  const [items, setItems] = useState<EInvoiceListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // QR Modal
  const [qrModalItem, setQrModalItem] = useState<EInvoiceListItem | null>(null);

  // Action status
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!tenantContext.companyId) {
      setLoading(false);
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await einvoiceApi.list({
        fromDate: period.fromDate,
        toDate: period.toDate,
        search: search || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        limit: 50,
      });
      setItems(res.items || []);
    } catch (err: any) {
      setError(err.message || "Failed to load E-Invoices.");
    } finally {
      setLoading(false);
    }
  }, [tenantContext.companyId, period.fromDate, period.toDate, search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleGenerateIrn = async (inv: EInvoiceListItem) => {
    setActionLoading(inv.id);
    setActionMessage(null);
    try {
      const res = await einvoiceApi.generate(inv.id);
      if (res.outcome === "SUCCEEDED") {
        setActionMessage({
          type: "success",
          text: `IRN generated successfully for invoice ${inv.invoiceNumber}! Ack No: ${res.record?.ackNo || "Stored"}`,
        });
        await load();
      } else {
        setActionMessage({
          type: "error",
          text: `IRN Generation failed: ${res.errorMessage || res.errorCode || "IRP Error"}`,
        });
      }
    } catch (e: any) {
      setActionMessage({ type: "error", text: e.message || "Generation error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelIrn = async (inv: EInvoiceListItem) => {
    if (!confirm(`Are you sure you want to cancel the IRN for invoice ${inv.invoiceNumber}? This action is irreversible on the IRP portal.`)) {
      return;
    }
    setActionLoading(inv.id);
    setActionMessage(null);
    try {
      const res = await einvoiceApi.cancel(inv.id, "2", "Cancelled by accountant request");
      if (res.outcome === "SUCCEEDED" || res.status === "CNL") {
        setActionMessage({
          type: "success",
          text: `IRN for ${inv.invoiceNumber} successfully cancelled.`,
        });
        await load();
      } else {
        setActionMessage({
          type: "error",
          text: `Cancellation failed: ${res.errorMessage || "Unknown error"}`,
        });
      }
    } catch (e: any) {
      setActionMessage({ type: "error", text: e.message || "Cancellation failed" });
    } finally {
      setActionLoading(null);
    }
  };

  // Metrics (5 Statutory Summary Cards)
  const totalB2b = items.length;
  const registeredCount = items.filter((i) => i.einvoiceStatus === "REGISTERED").length;
  const readyPendingCount = items.filter((i) => i.einvoiceStatus === "READY" || i.einvoiceStatus === "DRAFT").length;
  const failedCount = items.filter((i) => (i.einvoiceStatus as string) === "REJECTED" || (i.einvoiceStatus as string) === "FAILED").length;
  const cancelledCount = items.filter((i) => i.einvoiceStatus === "CANCELLED").length;

  return (
    <Panel
      loading={loading}
      error={error}
      onRetry={load}
      empty={
        !tenantContext.companyId
          ? "Sign in and select a company."
          : items.length === 0
          ? "No B2B invoices found in this period. E-Invoicing applies to outward B2B supplies with registered buyer GSTINs."
          : null
      }
    >
      <div className="space-y-4">
        {actionMessage && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
              actionMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            <span>{actionMessage.text}</span>
            <button type="button" onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-2">
              ✕
            </button>
          </div>
        )}

        {/* 5 Statutory Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Eligible Invoices</span>
            <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{totalB2b}</p>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs">
            <span className="text-[11px] font-bold uppercase text-emerald-700 tracking-wider">Generated IRNs</span>
            <p className="text-xl font-bold text-emerald-700 mt-1 tabular-nums">{registeredCount}</p>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs">
            <span className="text-[11px] font-bold uppercase text-amber-700 tracking-wider">Pending Generation</span>
            <p className="text-xl font-bold text-amber-700 mt-1 tabular-nums">{readyPendingCount}</p>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs">
            <span className="text-[11px] font-bold uppercase text-rose-700 tracking-wider">Failed Requests</span>
            <p className="text-xl font-bold text-rose-700 mt-1 tabular-nums">{failedCount}</p>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Cancelled IRNs</span>
            <p className="text-xl font-bold text-slate-800 mt-1 tabular-nums">{cancelledCount}</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-2.5 items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center flex-1">
            <div className="relative w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="w-full pl-9 pr-3 border border-slate-300 rounded-xl text-[13px] h-10 bg-white focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 focus:border-[#F47721]"
                placeholder="Search Invoice #, Buyer, GSTIN, IRN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="w-48">
              <CustomSelect
                size="sm"
                value={statusFilter}
                onChange={(val: any) => setStatusFilter(val)}
                options={[
                  { value: "ALL", label: "All Statuses" },
                  { value: "REGISTERED", label: "Registered (Active IRN)" },
                  { value: "READY", label: "Ready to Submit" },
                  { value: "DRAFT", label: "Draft / Incomplete" },
                  { value: "CANCELLED", label: "Cancelled" },
                ]}
                triggerClassName="rounded-xl border-slate-300 h-10"
              />
            </div>
          </div>

          <Link
            href="/sales/e-invoices"
            className="inline-flex items-center gap-1.5 h-10 px-3.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-[13px] font-semibold text-slate-700 shadow-sm transition-all"
          >
            <span>Open Bulk E-Invoice Workbench</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </Link>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3.5">Invoice # & Date</th>
                <th className="py-3 px-3">Buyer / GSTIN</th>
                <th className="py-3 px-3 text-right">Taxable</th>
                <th className="py-3 px-3 text-right">Grand Total</th>
                <th className="py-3 px-3 text-center">IRN Status</th>
                <th className="py-3 px-3">IRN / Ack Details</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {items.slice((page - 1) * pageSize, page * pageSize).map((row) => {
                const hasIrn = row.einvoiceStatus === "REGISTERED" && Boolean(row.eInvoice?.irn);
                const isCancelled = row.einvoiceStatus === "CANCELLED";
                const isWorking = actionLoading === row.id;

                return (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3.5">
                      <Link href={`/sales/invoices/${row.id}`} className="font-semibold text-[#1677E8] hover:underline">
                        {row.invoiceNumber}
                      </Link>
                      <div className="text-[11px] text-slate-500 tabular-nums">
                        {row.invoiceDate ? new Date(row.invoiceDate).toLocaleDateString("en-IN") : "—"}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-900">{row.party?.name || "Cash Customer"}</div>
                      <div className="text-[11px] text-[#1677E8] font-mono font-medium">
                        {row.party?.gstin || "Unregistered (URP)"}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-800 tabular-nums">
                      {formatInr(row.taxableAmount)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 tabular-nums">
                      {formatInr(row.grandTotal)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          hasIrn
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : isCancelled
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : row.einvoiceStatus === "READY"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {hasIrn && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {isCancelled && <XCircle className="w-3 h-3 text-rose-600" />}
                        {row.einvoiceStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {hasIrn ? (
                        <div className="space-y-0.5">
                          <div className="font-mono text-[11px] text-slate-700 truncate max-w-[180px]" title={row.eInvoice?.irn}>
                            IRN: {row.eInvoice?.irn?.slice(0, 10)}...{row.eInvoice?.irn?.slice(-8)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Ack: {row.eInvoice?.ackNo} · {row.eInvoice?.ackDate ? new Date(row.eInvoice.ackDate).toLocaleDateString("en-IN") : ""}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">No IRN generated</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {hasIrn && (
                          <button
                            type="button"
                            onClick={() => setQrModalItem(row)}
                            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-700"
                            title="View QR Code"
                          >
                            <QrCode className="w-3.5 h-3.5 text-slate-600" />
                            <span>QR</span>
                          </button>
                        )}

                        {!hasIrn && !isCancelled && (
                          <button
                            type="button"
                            disabled={isWorking}
                            onClick={() => handleGenerateIrn(row)}
                            className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-[#1677E8] hover:bg-[#1268D3] text-white text-[11px] font-semibold disabled:opacity-50 shadow-xs"
                          >
                            {isWorking ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FileCheck className="w-3 h-3" />}
                            <span>Generate</span>
                          </button>
                        )}

                        {hasIrn && (
                          <button
                            type="button"
                            disabled={isWorking}
                            onClick={() => handleCancelIrn(row)}
                            className="inline-flex items-center gap-1 h-8 px-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-semibold disabled:opacity-50"
                            title="Cancel IRN"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Standardized Pagination */}
          <div className="border-t border-slate-100 px-4 py-2">
            <DataTablePagination
              currentPage={page}
              pageSize={pageSize}
              totalRecords={items.length}
              onPageChange={(p) => setPage(p)}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
              pageSizeOptions={[10, 25, 50, 100]}
            />
          </div>
        </div>

        {/* QR Code Modal */}
        {qrModalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-900">E-Invoice Signed QR Code</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setQrModalItem(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <p><span className="text-slate-500 font-medium">Invoice:</span> <span className="font-bold">{qrModalItem.invoiceNumber}</span></p>
                <p><span className="text-slate-500 font-medium">Ack No:</span> <span className="font-mono font-bold">{qrModalItem.eInvoice?.ackNo}</span></p>
                <p><span className="text-slate-500 font-medium">Ack Date:</span> {qrModalItem.eInvoice?.ackDate}</p>
                <p className="break-all font-mono text-[10px] bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-slate-500 block font-sans font-semibold mb-1">IRN:</span>
                  {qrModalItem.eInvoice?.irn}
                </p>
              </div>

              {qrModalItem.eInvoice?.signedQrCode ? (
                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      qrModalItem.eInvoice.signedQrCode
                    )}`}
                    alt="E-Invoice QR Code"
                    className="w-44 h-44 rounded"
                  />
                  <span className="text-[10px] text-slate-500 mt-2">Government IRP Signed Digital Token</span>
                </div>
              ) : (
                <p className="text-center text-xs text-slate-500 py-6">Signed QR code payload not available for preview.</p>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setQrModalItem(null)}
                  className="h-9 px-4 rounded-xl border border-slate-300 font-semibold text-xs text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
