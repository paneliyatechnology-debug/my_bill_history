"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "../../../lib/api-client";
import { useAuth } from "../../../context/auth-context";
import { GstFrame, Panel, useGstPeriod, DataTablePagination } from "../../../components/gst/gst-kit";
import { CustomSelect } from "@/components/ui/dropdown-system";
import { Download, Search, FileText, ArrowRight } from "lucide-react";

function formatInr(val: string | number | undefined | null): string {
  const num = Number(val) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
}

export default function PurchaseRegisterPage() {
  return (
    <GstFrame
      title="Purchase Register (Inward GST Details)"
      notice="Displays all inward bills, debit notes, and purchase returns recorded in accounting books with statutory Section 17(5) ITC classifications."
    >
      <PurchaseRegisterBody />
    </GstFrame>
  );
}

function PurchaseRegisterBody() {
  const { tenantContext } = useAuth();
  const period = useGstPeriod();
  const [supplier, setSupplier] = useState("");
  const [kind, setKind] = useState("");
  const [itc, setItc] = useState("");
  const [data, setData] = useState<any>(null);
  const [recon, setRecon] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const load = useCallback(async () => {
    if (!tenantContext.companyId) {
      setLoading(false);
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [register, listed] = await Promise.all([
        apiClient.get<any>("/reports/purchase-register", { fromDate: period.fromDate, toDate: period.toDate }),
        apiClient.get<any>("/gst/gstr-2b/reconciliations", { returnPeriod: period.returnPeriod }).catch(() => ({ rows: [] })),
      ]);
      setData(register);
      setRecon(listed.rows || []);
    } catch (err: any) {
      setError(err.message || "Purchase register could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [tenantContext.companyId, period.fromDate, period.toDate, period.returnPeriod]);

  useEffect(() => {
    load();
  }, [load]);

  const items = (data?.items || []).filter((row: any) => {
    if (supplier) {
      const q = supplier.toLowerCase();
      const sup = `${row.supplierName} ${row.supplierGstin || ""} ${row.vendorInvoiceNumber || ""}`.toLowerCase();
      if (!sup.includes(q)) return false;
    }
    if (kind && row.documentType !== kind) return false;
    if (itc && row.itcEligibility !== itc) return false;
    return true;
  });

  const totals = data?.totals || {};
  const totalTaxable = Number(totals.totalTaxable || 0);
  const totalCgst = Number(totals.totalCgst || 0);
  const totalSgst = Number(totals.totalSgst || 0);
  const totalIgst = Number(totals.totalIgst || 0);
  const totalGross = Number(totals.totalGrandTotal || (totalTaxable + totalCgst + totalSgst + totalIgst));

  // Statutory ITC eligibility breakdown
  const eligibleItc = items
    .filter((i: any) => i.itcEligibility !== "INELIGIBLE" && i.itcEligibility !== "BLOCKED")
    .reduce((sum: number, r: any) => sum + Number(r.cgstAmount || 0) + Number(r.sgstAmount || 0) + Number(r.igstAmount || 0), 0);

  const ineligibleItc = items
    .filter((i: any) => i.itcEligibility === "INELIGIBLE" || i.itcEligibility === "BLOCKED")
    .reduce((sum: number, r: any) => sum + Number(r.cgstAmount || 0) + Number(r.sgstAmount || 0) + Number(r.igstAmount || 0), 0);

  // Pagination
  const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);

  const handleExportCsv = () => {
    try {
      const headers = "Bill Number,Date,Supplier,Supplier GSTIN,Document Type,Taxable Value,CGST,SGST,UTGST,IGST,Total Amount,ITC Eligibility\n";
      const csvRows = items
        .map(
          (r: any) =>
            `"${r.vendorInvoiceNumber}","${r.invoiceDate}","${r.supplierName}","${r.supplierGstin || "URP"}","${
              r.documentType
            }",${r.taxableAmount},${r.cgstAmount},${r.sgstAmount},${r.utgstAmount || 0},${r.igstAmount},${r.grandTotal},"${r.itcEligibility}"`
        )
        .join("\n");

      const blob = new Blob([headers + csvRows], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Purchase_Register_${period.returnPeriod}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("Export failed: " + e.message);
    }
  };

  return (
    <Panel
      loading={loading}
      error={error}
      onRetry={load}
      empty={
        !tenantContext.companyId
          ? "Sign in and select a company to view the purchase register."
          : items.length === 0
          ? "No posted purchase bills or returns in this period."
          : null
      }
    >
      <div className="space-y-4">
        {/* 7 Statutory KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Gross Purchases</span>
            <p className="text-sm font-bold text-slate-900 mt-1 tabular-nums">{formatInr(totalGross)}</p>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Purchase Taxable</span>
            <p className="text-sm font-bold text-slate-900 mt-1 tabular-nums">{formatInr(totalTaxable)}</p>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Input CGST</span>
            <p className="text-sm font-bold text-emerald-700 mt-1 tabular-nums">{formatInr(totalCgst)}</p>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Input SGST</span>
            <p className="text-sm font-bold text-emerald-700 mt-1 tabular-nums">{formatInr(totalSgst)}</p>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Input IGST</span>
            <p className="text-sm font-bold text-blue-700 mt-1 tabular-nums">{formatInr(totalIgst)}</p>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-emerald-700 tracking-wider">Eligible ITC</span>
            <p className="text-sm font-bold text-emerald-700 mt-1 tabular-nums">{formatInr(eligibleItc)}</p>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-rose-700 tracking-wider">Ineligible ITC (17(5))</span>
            <p className="text-sm font-bold text-rose-700 mt-1 tabular-nums">{formatInr(ineligibleItc)}</p>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap gap-2.5 items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center flex-1">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="w-full pl-8 pr-3 border border-slate-300 rounded-xl text-xs h-9 bg-white focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8]"
                placeholder="Search Bill #, Supplier, GSTIN..."
                value={supplier}
                onChange={(e) => {
                  setSupplier(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="w-40">
              <CustomSelect
                size="sm"
                value={kind}
                onChange={(val: any) => {
                  setKind(val);
                  setPage(1);
                }}
                options={[
                  { value: "", label: "All Documents" },
                  { value: "PURCHASE_INVOICE", label: "Purchase Bills" },
                  { value: "PURCHASE_RETURN", label: "Debit Notes / Returns" },
                ]}
                triggerClassName="rounded-xl border-slate-300 h-9 font-medium"
              />
            </div>

            <div className="w-44">
              <CustomSelect
                size="sm"
                value={itc}
                onChange={(val: any) => {
                  setItc(val);
                  setPage(1);
                }}
                options={[
                  { value: "", label: "All ITC Types" },
                  { value: "INPUT", label: "Input Goods" },
                  { value: "INPUT_SERVICES", label: "Input Services" },
                  { value: "CAPITAL_GOODS", label: "Capital Goods" },
                  { value: "INELIGIBLE", label: "Ineligible / Blocked" },
                ]}
                triggerClassName="rounded-xl border-slate-300 h-9 font-medium"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs font-semibold text-slate-700 shadow-xs transition-all"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Purchase Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3.5">Bill #</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Supplier / Vendor</th>
                <th className="py-3 px-3">Supplier GSTIN</th>
                <th className="py-3 px-3 text-right">Taxable</th>
                <th className="py-3 px-3 text-right">CGST</th>
                <th className="py-3 px-3 text-right">SGST</th>
                <th className="py-3 px-3 text-right">IGST</th>
                <th className="py-3 px-3 text-right">Total Amount</th>
                <th className="py-3 px-3 text-center">ITC Eligibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {paginatedItems.map((row: any, i: number) => {
                const isBlocked = row.itcEligibility === "INELIGIBLE" || row.itcEligibility === "BLOCKED";

                return (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-3.5 font-medium text-[#1677E8]">
                      {row.vendorInvoiceNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 tabular-nums">{row.invoiceDate}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{row.supplierName}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {row.supplierGstin || <span className="text-[10px] text-slate-400">URP</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-800 tabular-nums">
                      {formatInr(row.taxableAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 tabular-nums">
                      {Number(row.cgstAmount) > 0 ? formatInr(row.cgstAmount) : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 tabular-nums">
                      {Number(row.sgstAmount || row.utgstAmount) > 0
                        ? formatInr(Number(row.sgstAmount || 0) + Number(row.utgstAmount || 0))
                        : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 tabular-nums">
                      {Number(row.igstAmount) > 0 ? formatInr(row.igstAmount) : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                      {formatInr(row.grandTotal)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                          isBlocked
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {row.itcEligibility || "INPUT"}
                      </span>
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
      </div>
    </Panel>
  );
}
