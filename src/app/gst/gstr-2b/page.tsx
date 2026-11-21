"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../../lib/api-client";
import { useAuth } from "../../../context/auth-context";
import { GstFrame, Panel, useCanWriteGst, useGstPeriod, DataTablePagination } from "../../../components/gst/gst-kit";
import { CustomSelect } from "@/components/ui/dropdown-system";
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Download,
  Filter,
  FileText,
  Search,
  Check,
  X,
  Clock,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "MATCHED", label: "Matched" },
  { value: "PARTIAL_MATCH", label: "Partial Match" },
  { value: "MISSING_IN_BOOKS", label: "Missing in Books" },
  { value: "MISSING_IN_GSTR2B", label: "Missing in GSTR-2B" },
  { value: "MISMATCH", label: "Mismatch" },
  { value: "DUPLICATE", label: "Duplicate" },
];

function formatInr(val: string | number | undefined | null): string {
  const num = Number(val) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
}

export default function Gstr2bReconciliationPage() {
  return (
    <GstFrame
      title="GSTR-2B Purchase ITC Reconciliation"
      notice="Automated matching of supplier filings against internal purchase register. Claiming ITC requires matching and an explicit authorized review decision per CGST Act Section 16(2)(aa)."
    >
      <Gstr2bBody />
    </GstFrame>
  );
}

function Gstr2bBody() {
  const { tenantContext, currentCompany } = useAuth();
  const period = useGstPeriod();
  const canWrite = useCanWriteGst();

  const [status, setStatus] = useState("");
  const [fileText, setFileText] = useState("");
  const [fileName, setFileName] = useState("gstr2b.json");
  const [preview, setPreview] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [decision, setDecision] = useState("ACCEPTED");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [importing, setImporting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
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
      const listed = await apiClient.get<any>("/gst/gstr-2b/reconciliations", {
        returnPeriod: period.returnPeriod,
        status: status || undefined,
      });
      setRows(listed.rows || []);
    } catch (err: any) {
      setError(err.message || "Reconciliation could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [tenantContext.companyId, period.returnPeriod, status]);

  useEffect(() => {
    load();
  }, [load]);

  const onFileSelect = async (file: File) => {
    setFileName(file.name);
    const text = await file.text();
    setFileText(text);
    try {
      const parsed = JSON.parse(text);
      const count = JSON.stringify(parsed).match(/inum/g)?.length || 0;
      setPreview(`JSON file ready: contains ~${count} invoice records. Validates GSTIN & period upon upload.`);
    } catch {
      setPreview(`Text/CSV file loaded (${text.split(/\r?\n/).length} lines). Server will match document headers.`);
    }
  };

  const importFile = async () => {
    if (!fileText) return;
    setImporting(true);
    setMessage(null);
    try {
      const result = await apiClient.post<any>("/gst/gstr-2b/imports", {
        fileName,
        content: fileText,
        returnPeriod: period.returnPeriod,
      });
      setMessage({
        type: "success",
        text: result.duplicateFile
          ? "This file was already imported. No duplicate records were created."
          : `GSTR-2B imported successfully! Parsed ${result.linesCount || "all"} lines for period ${period.returnPeriod}.`,
      });
      setFileText("");
      setPreview(null);
      await load();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to import GSTR-2B." });
    } finally {
      setImporting(false);
    }
  };

  const handleReview = async () => {
    if (!selected) return;
    if (reason.trim().length < 10) {
      alert("Please provide an accountant audit remark of at least 10 characters.");
      return;
    }
    setReviewing(true);
    setMessage(null);
    try {
      const result = await apiClient.post<any>(`/gst/gstr-2b/reconciliations/${selected.id}/review`, {
        itcDecision: decision,
        reason,
      });
      setMessage({
        type: "success",
        text: `Review decision saved as ${decision}. ${result.message || ""}`,
      });
      setSelected(null);
      setReason("");
      await load();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Review submission rejected." });
    } finally {
      setReviewing(false);
    }
  };

  const handleExportCsv = () => {
    apiClient.downloadCsv("/gst/gstr-2b/export", `GSTR2B_Reconciliation_${period.returnPeriod}.csv`, {
      returnPeriod: period.returnPeriod,
    });
  };

  // Filtered rows
  const filteredRows = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const gstin = (r.supplierGstin || "").toLowerCase();
    const bDoc = (r.books?.documentNumber || "").toLowerCase();
    const pDoc = (r.portal?.invoiceNumber || "").toLowerCase();
    return gstin.includes(q) || bDoc.includes(q) || pDoc.includes(q);
  });

  // 7 Statutory KPI Breakdown
  const portalCount = rows.filter((r) => r.portal).length;
  const matchedCount = rows.filter((r) => r.status === "MATCHED").length;
  const partialCount = rows.filter((r) => r.status === "PARTIAL_MATCH").length;
  const missingBooksCount = rows.filter((r) => r.status === "MISSING_IN_BOOKS").length;
  const missing2bCount = rows.filter((r) => r.status === "MISSING_IN_GSTR2B").length;
  const mismatchCount = rows.filter((r) => r.status === "MISMATCH").length;
  const duplicateCount = rows.filter((r) => r.status === "DUPLICATE").length;

  const totalDifference = rows.reduce((acc, r) => {
    const bGst = Number(r.books?.cgst || 0) + Number(r.books?.sgst || 0) + Number(r.books?.igst || 0);
    const pGst = Number(r.portal?.cgst || 0) + Number(r.portal?.sgst || 0) + Number(r.portal?.igst || 0);
    return acc + Math.abs(bGst - pGst);
  }, 0);

  return (
    <Panel
      loading={loading}
      error={error}
      onRetry={load}
      empty={!tenantContext.companyId ? "Sign in and select a company to reconcile GSTR-2B." : null}
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

        {/* ── 7 STATUTORY KPI CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Portal Records</span>
            <p className="text-lg font-bold text-slate-900 mt-1 tabular-nums">{portalCount || rows.length}</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.2 rounded">
              Matched
            </span>
            <p className="text-lg font-bold text-emerald-700 mt-1 tabular-nums">{matchedCount}</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded">
              Partial Match
            </span>
            <p className="text-lg font-bold text-amber-700 mt-1 tabular-nums">{partialCount}</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-1 py-0.2 rounded">
              Missing In Books
            </span>
            <p className="text-lg font-bold text-blue-700 mt-1 tabular-nums">{missingBooksCount}</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 px-1 py-0.2 rounded">
              Missing in 2B
            </span>
            <p className="text-lg font-bold text-rose-700 mt-1 tabular-nums">{missing2bCount}</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-200 px-1 py-0.2 rounded">
              Duplicate
            </span>
            <p className="text-lg font-bold text-purple-700 mt-1 tabular-nums">{duplicateCount}</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">ITC Difference</span>
            <p className={`text-lg font-bold mt-1 tabular-nums ${totalDifference > 0 ? "text-rose-700" : "text-emerald-700"}`}>
              {formatInr(totalDifference)}
            </p>
          </div>
        </div>

        {/* ── IMPORT GSTR-2B FILE BOX ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Import GSTR-2B Statement</h3>
              <p className="text-xs text-slate-500">
                Upload the JSON or Excel/CSV downloaded from the GST portal for return period{" "}
                <span className="font-mono font-bold text-slate-800">{period.returnPeriod}</span>.
              </p>
            </div>

            {canWrite && (
              <div className="flex items-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 h-9 px-3.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs font-semibold text-slate-700 shadow-xs transition-all">
                  <UploadCloud className="w-4 h-4 text-slate-500" />
                  <span>Choose File</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".json,.csv,text/csv,application/json"
                    onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
                  />
                </label>

                <button
                  type="button"
                  disabled={!fileText || importing}
                  onClick={importFile}
                  className="inline-flex items-center justify-center h-9 px-4 bg-[#1677E8] hover:bg-[#1268D3] text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-40 transition-all"
                >
                  {importing ? "Importing..." : "Process Auto-Match"}
                </button>
              </div>
            )}
          </div>

          {preview && (
            <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-xl p-2.5 font-medium">
              {preview}
            </p>
          )}
        </div>

        {/* ── FILTERS & EXPORT ROW ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="w-full pl-8 pr-3 border border-slate-300 rounded-xl text-xs h-9 bg-white focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8]"
                placeholder="Search Supplier GSTIN, Invoice #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="w-44">
              <CustomSelect
                size="sm"
                value={status}
                onChange={(val: any) => setStatus(val)}
                options={STATUSES}
                triggerClassName="rounded-xl border-slate-300 h-9 font-medium"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-all"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Reconciliation CSV</span>
          </button>
        </div>

        {/* ── RECONCILIATION TABLE ── */}
        <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3">Supplier GSTIN</th>
                  <th className="py-3 px-3">Books Document</th>
                  <th className="py-3 px-3">Portal Invoice</th>
                  <th className="py-3 px-3 text-right">Taxable (Books / 2B)</th>
                  <th className="py-3 px-3 text-right">GST (Books / 2B)</th>
                  <th className="py-3 px-3 text-right">Difference</th>
                  <th className="py-3 px-3 text-center">ITC Review</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-slate-400 text-xs">
                      No reconciliation records found for period {period.returnPeriod}. Upload a GSTR-2B file to start auto-matching.
                    </td>
                  </tr>
                ) : (
                  filteredRows.slice((page - 1) * pageSize, page * pageSize).map((row) => {
                    const badgeClasses: Record<string, string> = {
                      MATCHED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
                      PARTIAL_MATCH: "bg-amber-50 text-amber-700 border border-amber-200",
                      MISSING_IN_BOOKS: "bg-blue-50 text-blue-700 border border-blue-200",
                      MISSING_IN_GSTR2B: "bg-rose-50 text-rose-700 border border-rose-200",
                      MISMATCH: "bg-orange-50 text-orange-700 border border-orange-200",
                      DUPLICATE: "bg-purple-50 text-purple-700 border border-purple-200",
                    };

                    const bTaxable = Number(row.books?.taxableValue || 0);
                    const pTaxable = Number(row.portal?.taxableValue || 0);
                    const bGst = Number(row.books?.cgst || 0) + Number(row.books?.sgst || 0) + Number(row.books?.igst || 0);
                    const pGst = Number(row.portal?.cgst || 0) + Number(row.portal?.sgst || 0) + Number(row.portal?.igst || 0);
                    const diffGst = Math.abs(bGst - pGst);

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              badgeClasses[row.status] || "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {row.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                          {row.supplierGstin || "—"}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {row.books?.documentNumber || "—"}
                          {row.books?.documentDate && (
                            <div className="text-[10px] text-slate-400">{row.books.documentDate}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {row.portal?.invoiceNumber || "—"}
                          {row.portal?.invoiceDate && (
                            <div className="text-[10px] text-slate-400">{row.portal.invoiceDate}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums">
                          <span className="font-semibold text-slate-800">{bTaxable > 0 ? formatInr(bTaxable) : "—"}</span>
                          <span className="text-slate-400 mx-1">/</span>
                          <span className="text-slate-600">{pTaxable > 0 ? formatInr(pTaxable) : "—"}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums">
                          <span className="font-semibold text-slate-800">{bGst > 0 ? formatInr(bGst) : "—"}</span>
                          <span className="text-slate-400 mx-1">/</span>
                          <span className="text-slate-600">{pGst > 0 ? formatInr(pGst) : "—"}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums">
                          <span className={diffGst > 0.01 ? "font-bold text-rose-600" : "font-medium text-emerald-700"}>
                            {formatInr(diffGst)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              row.itcDecision === "ACCEPTED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : row.itcDecision === "REJECTED"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {row.itcDecision || "UNREVIEWED"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelected(row);
                              setDecision(row.itcDecision || "ACCEPTED");
                            }}
                            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all"
                          >
                            <span>Review</span>
                          </button>
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

        {/* ── REVIEW MODAL ── */}
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#1677E8]" />
                  <h3 className="font-bold text-slate-900">Review ITC Eligibility Decision</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Supplier GSTIN:</span>
                  <span className="font-mono font-bold text-slate-900">{selected.supplierGstin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Match Status:</span>
                  <span className="font-bold text-slate-900">{selected.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Books Document:</span>
                  <span className="font-medium text-slate-900">{selected.books?.documentNumber || "Not recorded"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Portal GSTR-2B Line:</span>
                  <span className="font-medium text-slate-900">{selected.portal?.invoiceNumber || "Not reported"}</span>
                </div>
              </div>

              {canWrite ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ITC Decision</label>
                    <CustomSelect
                      size="sm"
                      value={decision}
                      onChange={(val: any) => setDecision(val)}
                      options={[
                        { value: "ACCEPTED", label: "ACCEPTED (Eligible for GSTR-3B Table 4)" },
                        { value: "REJECTED", label: "REJECTED (Disputed / Ineligible)" },
                        { value: "DEFERRED", label: "DEFERRED (Hold for Vendor Confirmation)" },
                      ]}
                      triggerClassName="rounded-xl border-slate-300 h-10 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Accountant Remarks (At least 10 characters)
                    </label>
                    <textarea
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8]"
                      rows={3}
                      placeholder="e.g. Verified goods received in factory; eligible for standard input tax credit."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
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
                      disabled={reviewing || reason.trim().length < 10}
                      onClick={handleReview}
                      className="h-9 px-5 rounded-xl bg-[#1677E8] hover:bg-[#1268D3] text-white font-semibold text-xs shadow-xs disabled:opacity-40"
                    >
                      {reviewing ? "Saving..." : "Save Audit Decision"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Your role cannot record ITC decisions.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
