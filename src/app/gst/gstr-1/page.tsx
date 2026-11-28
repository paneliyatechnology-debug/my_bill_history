"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiClient } from "../../../lib/api-client";
import { useAuth } from "../../../context/auth-context";
import { GstFrame, Panel, downloadJson, useGstPeriod, DataTablePagination } from "../../../components/gst/gst-kit";
import { Download, Search, FileText, ArrowRight, CheckCircle2 } from "lucide-react";

const GSTR1_TABS = [
  "B2B",
  "B2CL",
  "B2CS",
  "CDNR",
  "CDNUR",
  "Exports",
  "Nil Rated",
  "Exempt",
  "Non-GST",
  "HSN Summary",
  "Documents",
] as const;

type Gstr1Tab = (typeof GSTR1_TABS)[number];

function formatInr(val: string | number | undefined | null): string {
  const num = Number(val) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
}

export default function Gstr1PreparationPage() {
  return (
    <GstFrame
      title="GSTR-1 Preparation (Outward Supplies)"
      notice="Compiled from posted sales invoices, credit notes, and debit notes per Section 37 of the CGST Act. Downloading draft JSON allows import into the GST Offline Tool or direct GSP portal upload."
    >
      <Gstr1Body />
    </GstFrame>
  );
}

function Gstr1Body() {
  const { tenantContext, currentCompany } = useAuth();
  const period = useGstPeriod();
  const [activeTab, setActiveTab] = useState<Gstr1Tab>("B2B");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setPage(1);
  }, [activeTab, search]);

  const load = useCallback(async () => {
    if (!tenantContext.companyId) {
      setLoading(false);
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = {
        fromDate: period.fromDate,
        toDate: period.toDate,
        month: period.month,
        year: period.year,
      };
      const report = await apiClient.get<any>("/reports/gstr-1", params);
      setData(report);
    } catch (err: any) {
      setError(err.message || "Failed to prepare GSTR-1.");
    } finally {
      setLoading(false);
    }
  }, [tenantContext.companyId, period.fromDate, period.toDate, period.month, period.year]);

  useEffect(() => {
    load();
  }, [load]);

  // Extract sales rows
  const salesInvoices: any[] = useMemo(() => {
    if (!data) return [];
    if (data.salesInvoices && Array.isArray(data.salesInvoices)) {
      return data.salesInvoices;
    }
    // Fallback: parse b2b
    const list: any[] = [];
    if (data.b2b && Array.isArray(data.b2b)) {
      for (const party of data.b2b) {
        for (const inv of party.inv || []) {
          for (const itm of inv.itms || []) {
            list.push({
              id: `${inv.inum}-${itm.num}`,
              invoiceNumber: inv.inum,
              invoiceDate: inv.idt,
              gstin: party.ctin,
              customerName: party.tradeName || "Registered Buyer",
              taxRate: itm.itm_det?.rt || 18,
              taxableValue: Number(itm.itm_det?.txval || 0),
              cgst: Number(itm.itm_det?.camt || 0),
              sgst: Number(itm.itm_det?.samt || 0),
              igst: Number(itm.itm_det?.iamt || 0),
              invoiceValue: Number(inv.val || 0),
              invoiceType: "B2B",
            });
          }
        }
      }
    }
    return list;
  }, [data]);

  const creditNotes: any[] = data?.creditNotes || [];
  const debitNotes: any[] = data?.debitNotes || [];
  const allNotes = useMemo(() => [...creditNotes, ...debitNotes], [creditNotes, debitNotes]);

  // Tab rows calculation
  const rows = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase();

    switch (activeTab) {
      case "B2B": {
        return salesInvoices
          .filter((inv) => inv.invoiceType === "B2B" || Boolean(inv.gstin))
          .filter(
            (r) =>
              !q ||
              (r.invoiceNumber || "").toLowerCase().includes(q) ||
              (r.customerName || "").toLowerCase().includes(q) ||
              (r.gstin || "").toLowerCase().includes(q)
          );
      }
      case "B2CL": {
        return salesInvoices
          .filter((inv) => inv.invoiceType === "B2CL")
          .filter(
            (r) =>
              !q ||
              (r.invoiceNumber || "").toLowerCase().includes(q) ||
              (r.customerName || "").toLowerCase().includes(q)
          );
      }
      case "B2CS": {
        return salesInvoices
          .filter(
            (inv) =>
              inv.invoiceType === "B2CS" ||
              (!inv.gstin &&
                inv.invoiceType !== "B2CL" &&
                inv.invoiceType !== "EXP" &&
                !inv.isExport &&
                inv.supplyCategory !== "NIL_RATED" &&
                inv.supplyCategory !== "EXEMPT" &&
                inv.supplyCategory !== "NON_GST")
          )
          .filter(
            (r) =>
              !q ||
              (r.invoiceNumber || "").toLowerCase().includes(q) ||
              (r.customerName || "").toLowerCase().includes(q)
          );
      }
      case "CDNR": {
        return allNotes
          .filter((n) => Boolean(n.gstin))
          .filter(
            (r) =>
              !q ||
              (r.noteNumber || "").toLowerCase().includes(q) ||
              (r.customerName || "").toLowerCase().includes(q) ||
              (r.gstin || "").toLowerCase().includes(q)
          );
      }
      case "CDNUR": {
        return allNotes
          .filter((n) => !n.gstin)
          .filter(
            (r) =>
              !q ||
              (r.noteNumber || "").toLowerCase().includes(q) ||
              (r.customerName || "").toLowerCase().includes(q)
          );
      }
      case "Exports": {
        return salesInvoices
          .filter((inv) => inv.invoiceType === "EXP" || inv.isExport)
          .filter((r) => !q || (r.invoiceNumber || "").toLowerCase().includes(q));
      }
      case "Nil Rated": {
        return salesInvoices
          .filter((inv) => inv.taxRate === 0 && inv.supplyCategory === "NIL_RATED")
          .filter(
            (r) =>
              !q ||
              (r.invoiceNumber || "").toLowerCase().includes(q) ||
              (r.customerName || "").toLowerCase().includes(q)
          );
      }
      case "Exempt": {
        return salesInvoices
          .filter((inv) => inv.supplyCategory === "EXEMPT")
          .filter(
            (r) =>
              !q ||
              (r.invoiceNumber || "").toLowerCase().includes(q) ||
              (r.customerName || "").toLowerCase().includes(q)
          );
      }
      case "Non-GST": {
        return salesInvoices
          .filter((inv) => inv.supplyCategory === "NON_GST")
          .filter(
            (r) =>
              !q ||
              (r.invoiceNumber || "").toLowerCase().includes(q) ||
              (r.customerName || "").toLowerCase().includes(q)
          );
      }
      case "HSN Summary": {
        const hsnData = data?.hsn?.data || [];
        return hsnData.filter(
          (h: any) => !q || (h.hsn_sc || "").toLowerCase().includes(q) || (h.desc || "").toLowerCase().includes(q)
        );
      }
      case "Documents": {
        return data?.docSummary ? [data.docSummary] : [];
      }
      default:
        return [];
    }
  }, [activeTab, salesInvoices, allNotes, data, search]);

  const summary = data?.summary || {};

  const paginatedRows = useMemo(() => {
    return rows.slice((page - 1) * pageSize, page * pageSize);
  }, [rows, page, pageSize]);

  const handleDownloadDraftJson = () => {
    if (!data?.jsonPayload) {
      downloadJson(`gstr-1-${period.returnPeriod}-draft.json`, data);
      return;
    }
    downloadJson(`GSTR1_${period.returnPeriod}_${currentCompany?.gstin || "DRAFT"}.json`, data.jsonPayload);
  };

  const handleExportCsv = () => {
    try {
      const csvHeader = "Document Number,Date,Party,GSTIN,POS,Tax Rate,Taxable Amount,CGST,SGST,IGST,Total Value\n";
      const csvRows = salesInvoices
        .map(
          (inv) =>
            `"${inv.invoiceNumber}","${inv.invoiceDate}","${inv.customerName}","${inv.gstin || "URP"}","${
              inv.stateCode || ""
            }",${inv.taxRate}%,${inv.taxableValue},${inv.cgst},${inv.sgst},${inv.igst},${inv.invoiceValue}`
        )
        .join("\n");

      const blob = new Blob([csvHeader + csvRows], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `GSTR1_${period.returnPeriod}_Supplies.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("Failed to export CSV: " + e.message);
    }
  };

  return (
    <Panel
      loading={loading}
      error={error}
      onRetry={load}
      empty={!tenantContext.companyId ? "Sign in and select a company to prepare GSTR-1." : null}
    >
      <div className="space-y-4">
        {/* Top Summary Banner */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-6">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Filing Status</span>
              <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                {data?.filingStatus || "NOT_FILED"}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Invoices</span>
              <span className="text-base font-bold text-slate-900 mt-0.5 block tabular-nums">
                {summary.totalInvoices || salesInvoices.length}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Taxable Turnover</span>
              <span className="text-base font-bold text-slate-900 mt-0.5 block tabular-nums">
                {formatInr(summary.totalTaxable || data?.totalTaxable)}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">CGST</span>
              <span className="text-base font-bold text-emerald-700 mt-0.5 block tabular-nums">
                {formatInr(summary.totalCgst || data?.totalCgst)}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">SGST</span>
              <span className="text-base font-bold text-emerald-700 mt-0.5 block tabular-nums">
                {formatInr(summary.totalSgst || data?.totalSgst)}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">IGST</span>
              <span className="text-base font-bold text-blue-700 mt-0.5 block tabular-nums">
                {formatInr(summary.totalIgst || data?.totalIgst)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-all"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadDraftJson}
              className="inline-flex items-center gap-1.5 h-9 px-4 bg-[#1677E8] hover:bg-[#1268D3] text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Draft JSON</span>
            </button>
          </div>
        </div>

        {/* Tab Row & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {GSTR1_TABS.map((tab) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                    active
                      ? "bg-[#1677E8] text-white border-[#1677E8] shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <div className="relative w-64 self-end sm:self-auto">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="w-full pl-8 pr-3 border border-slate-300 rounded-xl text-xs h-9 bg-white focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8]"
              placeholder="Search table..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Dynamic Table Presentation */}
        <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xs">
          {activeTab === "HSN Summary" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3.5">#</th>
                    <th className="py-3 px-3">HSN/SAC</th>
                    <th className="py-3 px-3">Description</th>
                    <th className="py-3 px-3 text-center">UQC</th>
                    <th className="py-3 px-3 text-right">Qty</th>
                    <th className="py-3 px-3 text-right">Total Value</th>
                    <th className="py-3 px-3 text-right">Taxable Value</th>
                    <th className="py-3 px-3 text-right">IGST</th>
                    <th className="py-3 px-3 text-right">CGST</th>
                    <th className="py-3 px-3 text-right">SGST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-slate-400 text-xs">
                        No HSN items recorded in this return period.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3.5 text-slate-400">{(page - 1) * pageSize + i + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{row.hsn_sc}</td>
                        <td className="py-2.5 px-3 text-slate-700">{row.desc}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-600">{row.uqc || "NOS"}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{row.qty}</td>
                        <td className="py-2.5 px-3 text-right font-medium tabular-nums">{formatInr(row.val)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                          {formatInr(row.txval)}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{formatInr(row.iamt)}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{formatInr(row.camt)}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{formatInr(row.samt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === "Documents" ? (
            <div className="p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Table 13: Documents Issued During the Tax Period</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <span className="text-xs text-slate-500 font-medium">Outward Invoices Range</span>
                  <p className="text-base font-bold text-slate-900 mt-1">
                    {data?.docSummary?.fromInvoice || "INV-001"} — {data?.docSummary?.toInvoice || "INV-001"}
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <span className="text-xs text-slate-500 font-medium">Total Issued / Cancelled</span>
                  <p className="text-base font-bold text-slate-900 mt-1">
                    Issued: {data?.docSummary?.totalIssued || salesInvoices.length} · Cancelled:{" "}
                    {data?.docSummary?.cancelledCount || 0}
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <span className="text-xs text-slate-500 font-medium">Credit / Debit Notes Issued</span>
                  <p className="text-base font-bold text-slate-900 mt-1">{allNotes.length} Notes</p>
                </div>
              </div>
            </div>
          ) : activeTab === "CDNR" || activeTab === "CDNUR" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3.5">Note # & Date</th>
                    <th className="py-3 px-3">Orig. Invoice #</th>
                    <th className="py-3 px-3">Customer / GSTIN</th>
                    <th className="py-3 px-3">Note Type</th>
                    <th className="py-3 px-3 text-right">Taxable</th>
                    <th className="py-3 px-3 text-right">IGST</th>
                    <th className="py-3 px-3 text-right">CGST</th>
                    <th className="py-3 px-3 text-right">SGST</th>
                    <th className="py-3 px-3 text-right">Note Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-slate-400 text-xs">
                        No credit or debit notes recorded in this category.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3.5 font-medium text-slate-900">
                          {row.noteNumber}
                          <div className="text-[10px] text-slate-400">{row.noteDate}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{row.originalInvoiceNumber || "—"}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-800">{row.customerName}</div>
                          {row.gstin ? (
                            <div className="font-mono text-[10px] text-slate-500">{row.gstin}</div>
                          ) : (
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded">URP</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                            {row.noteType || "Credit Note"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium tabular-nums">{formatInr(row.taxableValue)}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{formatInr(row.igst)}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{formatInr(row.cgst)}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{formatInr(row.sgst)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                          {formatInr(row.noteValue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3.5">Invoice #</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Customer / GSTIN</th>
                    <th className="py-3 px-3">POS</th>
                    <th className="py-3 px-3 text-center">Rate</th>
                    <th className="py-3 px-3 text-right">Taxable</th>
                    <th className="py-3 px-3 text-right">CGST</th>
                    <th className="py-3 px-3 text-right">SGST</th>
                    <th className="py-3 px-3 text-right">IGST</th>
                    <th className="py-3 px-3 text-right">Invoice Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-slate-400 text-xs">
                        No supplies recorded in {activeTab} for this period.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3.5 font-medium text-[#1677E8]">
                          {row.invoiceId ? (
                            <Link href={`/sales/invoices/${row.invoiceId}`} className="hover:underline">
                              {row.invoiceNumber}
                            </Link>
                          ) : (
                            row.invoiceNumber
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 tabular-nums">{row.invoiceDate}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-800">{row.customerName}</div>
                          {row.gstin ? (
                            <div className="font-mono text-[10px] text-slate-500">{row.gstin}</div>
                          ) : (
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded">B2C</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{row.stateCode || row.stateName || "—"}</td>
                        <td className="py-2.5 px-3 text-center font-medium text-slate-700">{row.taxRate}%</td>
                        <td className="py-2.5 px-3 text-right font-medium tabular-nums">{formatInr(row.taxableValue)}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{Number(row.cgst) > 0 ? formatInr(row.cgst) : "—"}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{Number(row.sgst) > 0 ? formatInr(row.sgst) : "—"}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{Number(row.igst) > 0 ? formatInr(row.igst) : "—"}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                          {formatInr(row.invoiceValue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {rows.length > 0 && activeTab !== "Documents" && (
            <div className="border-t border-slate-200">
              <DataTablePagination
                currentPage={page}
                pageSize={pageSize}
                totalRecords={rows.length}
                onPageChange={setPage}
                onPageSizeChange={(sz) => {
                  setPageSize(sz);
                  setPage(1);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}
