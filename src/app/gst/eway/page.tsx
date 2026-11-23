"use client";

import { formatDate } from "@/lib/date-utils";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "../../../lib/api-client";
import { useAuth } from "../../../context/auth-context";
import { GstFrame, Panel, useCanWriteGst, useGstPeriod, DataTablePagination } from "../../../components/gst/gst-kit";
import {
  Truck,
  ArrowRight,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Ban,
} from "lucide-react";

function formatInr(val: string | number | undefined | null): string {
  const num = Number(val) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
}

export default function EwayPage() {
  return (
    <GstFrame
      title="E-Way Bill Management (Rule 138)"
      notice="Statutory electronic waybill management for consignment movements exceeding ₹50,000. Tracks Part-A consignment declaration, Part-B transport vehicle details, and validity timelines."
    >
      <EwayBody />
    </GstFrame>
  );
}

function EwayBody() {
  const { tenantContext, currentCompany } = useAuth();
  const period = useGstPeriod();
  const canWrite = useCanWriteGst();

  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [distance, setDistance] = useState("25");
  const [vehicle, setVehicle] = useState("");
  const [transporterId, setTransporterId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenantContext.companyId) {
      setLoading(false);
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<any[]>("/gst/documents", {
        fromDate: period.fromDate,
        toDate: period.toDate,
      });
      setRows(res || []);
    } catch (err: any) {
      setError(err.message || "Failed to load E-Way Bill records.");
    } finally {
      setLoading(false);
    }
  }, [tenantContext.companyId, period.fromDate, period.toDate]);

  useEffect(() => {
    load();
  }, [load]);

  const handleGenerate = async (doc: any) => {
    if (!vehicle && !transporterId) {
      alert("Please provide either a vehicle registration number or a Transporter ID.");
      return;
    }
    setActionLoading(doc.id);
    setMessage(null);
    try {
      const result = await apiClient.post<any>(
        `/gst/eway-bills/invoices/${doc.id}/generate`,
        {
          distanceKm: Number(distance) || 25,
          vehicleNumber: vehicle ? vehicle.toUpperCase().replace(/\s+/g, "") : undefined,
          transporterId: transporterId || undefined,
        },
        undefined,
        `ui-ewb-${doc.id}-${Date.now()}`
      );
      if (result.ewbNumber) {
        setMessage({
          type: "success",
          text: `E-Way Bill #${result.ewbNumber} generated successfully! Valid until ${result.validUpto || "stored"}.`,
        });
        setSelected(null);
        await load();
      } else {
        setMessage({
          type: "error",
          text: result.message || "E-Way Bill generation returned an error from the NIC portal.",
        });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "E-Way Bill generation failed." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelEwb = async (doc: any) => {
    if (!doc.eWayBill?.ewbNumber) return;
    if (!confirm(`Are you sure you want to cancel E-Way Bill #${doc.eWayBill.ewbNumber}?`)) return;

    setActionLoading(doc.id);
    setMessage(null);
    try {
      const result = await apiClient.post<any>(`/gst/eway-bills/${doc.eWayBill.ewbNumber}/cancel`, {
        cancelReasonCode: 1,
        cancelRemarks: "Cancelled by consignor request",
      });
      setMessage({
        type: "success",
        text: `E-Way Bill #${doc.eWayBill.ewbNumber} cancelled successfully.`,
      });
      await load();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Cancellation failed." });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredRows = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const docNum = (r.documentNumber || "").toLowerCase();
    const ewbNum = (r.eWayBill?.ewbNumber || "").toLowerCase();
    return docNum.includes(q) || ewbNum.includes(q);
  });

  const totalDocuments = rows.length;
  const activeEwbCount = rows.filter((r) => r.eWayBill?.ewbNumber && r.eWayBill?.status !== "CNL").length;
  const pendingEwbCount = rows.filter((r) => !r.eWayBill?.ewbNumber && Number(r.grandTotal || 0) >= 50000).length;
  const failedCount = rows.filter((r) => r.eWayBill?.status === "FAILED").length;
  const cancelledCount = rows.filter((r) => r.eWayBill?.status === "CNL").length;

  return (
    <Panel
      loading={loading}
      error={error}
      onRetry={load}
      empty={!tenantContext.companyId ? "Sign in and select a company." : null}
    >
      <div className="space-y-5">
        {message && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            <span>{message.text}</span>
            <button type="button" onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-2">
              ✕
            </button>
          </div>
        )}

        {/* ── 5 STATUTORY KPI METRICS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Eligible Documents</span>
            <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{totalDocuments}</p>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs">
            <span className="text-[11px] font-bold uppercase text-emerald-700 tracking-wider">Generated EWBs</span>
            <p className="text-xl font-bold text-emerald-700 mt-1 tabular-nums">{activeEwbCount}</p>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs">
            <span className="text-[11px] font-bold uppercase text-amber-700 tracking-wider">Pending (&gt;₹50K)</span>
            <p className="text-xl font-bold text-amber-700 mt-1 tabular-nums">{pendingEwbCount}</p>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs">
            <span className="text-[11px] font-bold uppercase text-rose-700 tracking-wider">Failed Requests</span>
            <p className="text-xl font-bold text-rose-700 mt-1 tabular-nums">{failedCount}</p>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Cancelled EWBs</span>
            <p className="text-xl font-bold text-slate-800 mt-1 tabular-nums">{cancelledCount}</p>
          </div>
        </div>

        {/* ── SEARCH & WORKBENCH LINK ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="w-full pl-8 pr-3 border border-slate-300 rounded-xl text-xs h-9 bg-white focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8]"
              placeholder="Search Invoice #, E-Way Bill #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Link
            href="/sales/eway-bills"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs font-semibold text-slate-700 shadow-xs transition-all"
          >
            <span>Open Advanced EWB Workbench</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </Link>
        </div>

        {/* ── E-WAY BILLS TABLE ── */}
        <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3.5">Invoice #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3 text-right">Invoice Value</th>
                  <th className="py-3 px-3">E-Way Bill #</th>
                  <th className="py-3 px-3">Vehicle / Transporter</th>
                  <th className="py-3 px-3">Validity</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400 text-xs">
                      No invoices found in this period.
                    </td>
                  </tr>
                ) : (
                  filteredRows.slice((page - 1) * pageSize, page * pageSize).map((row) => {
                    const hasEwb = Boolean(row.eWayBill?.ewbNumber);
                    const isCancelled = row.eWayBill?.status === "CNL";
                    const isOver50k = Number(row.grandTotal || 0) >= 50000;
                    const isWorking = actionLoading === row.id;

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3.5 font-medium text-[#1677E8]">
                          <Link href={row.href || `/sales/invoices/${row.id}`} className="hover:underline">
                            {row.documentNumber}
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 tabular-nums">{row.documentDate}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                          {formatInr(row.grandTotal)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                          {hasEwb ? row.eWayBill.ewbNumber : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {hasEwb && row.eWayBill?.vehicleNumber ? (
                            <span className="font-mono font-semibold">{row.eWayBill.vehicleNumber}</span>
                          ) : hasEwb && row.eWayBill?.transporterId ? (
                            <span className="font-mono text-slate-500">{row.eWayBill.transporterId}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {hasEwb && row.eWayBill?.validUpto ? (
                            <span>{formatDate(row.eWayBill.validUpto)}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              hasEwb && !isCancelled
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : isCancelled
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : isOver50k
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-slate-50 text-slate-600 border-slate-200"
                            }`}
                          >
                            {hasEwb && !isCancelled
                              ? "ACTIVE"
                              : isCancelled
                              ? "CANCELLED"
                              : isOver50k
                              ? "REQUIRED"
                              : "OPTIONAL"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!hasEwb && !isCancelled && canWrite && (
                              <button
                                type="button"
                                onClick={() => setSelected(row)}
                                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-[#1677E8] hover:bg-[#1268D3] text-white text-xs font-semibold shadow-xs"
                              >
                                <span>Generate</span>
                              </button>
                            )}

                            {hasEwb && !isCancelled && canWrite && (
                              <button
                                type="button"
                                disabled={isWorking}
                                onClick={() => handleCancelEwb(row)}
                                className="inline-flex items-center gap-1 h-7 px-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold"
                                title="Cancel E-Way Bill"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
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

          {/* Standardized Pagination */}
          <div className="border-t border-slate-100 px-4 py-2">
            <DataTablePagination
              currentPage={page}
              pageSize={pageSize}
              totalRecords={filteredRows.length}
              onPageChange={(p) => setPage(p)}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
              pageSizeOptions={[10, 25, 50, 100]}
            />
          </div>
        </div>

        {/* ── GENERATE EWB MODAL ── */}
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-[#1677E8]" />
                  <h3 className="font-bold text-slate-900">Generate E-Way Bill (Part-A & B)</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice:</span>
                  <span className="font-bold text-slate-900">{selected.documentNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice Amount:</span>
                  <span className="font-bold text-slate-900">{formatInr(selected.grandTotal)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Approximate Distance (Kilometres)
                  </label>
                  <input
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] h-9"
                    type="number"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    placeholder="e.g. 25"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vehicle Registration Number (Part-B)
                  </label>
                  <input
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-medium uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] h-9"
                    value={vehicle}
                    onChange={(e) => setVehicle(e.target.value)}
                    placeholder="e.g. GJ01AB1234"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transporter ID / GSTIN (Optional if Vehicle is provided)
                  </label>
                  <input
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] h-9"
                    value={transporterId}
                    onChange={(e) => setTransporterId(e.target.value)}
                    placeholder="e.g. 24ABCDE1234F1Z5"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="h-9 px-4 rounded-xl border border-slate-300 font-semibold text-xs text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(actionLoading)}
                    onClick={() => handleGenerate(selected)}
                    className="h-9 px-5 rounded-xl bg-[#1677E8] hover:bg-[#1268D3] text-white font-semibold text-xs shadow-xs disabled:opacity-50"
                  >
                    {actionLoading ? "Submitting..." : "Submit to NIC Portal"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
