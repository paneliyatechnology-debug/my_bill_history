"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "../../../lib/api-client";
import { useAuth } from "../../../context/auth-context";
import { DataTable, GstFrame, Panel, useGstPeriod, DataTablePagination } from "../../../components/gst/gst-kit";
import { CustomSelect } from "@/components/ui/dropdown-system";
import { Download, Search, FileText, ArrowUpDown } from "lucide-react";

function formatInr(val: string | number | undefined | null): string {
  const num = Number(val) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
}

export default function SalesRegisterPage() {
  return (
    <GstFrame
      title="Sales Register (Outward GST Supplies)"
      notice="Displays all outward supplies and tax liabilities posted in accounting books. These values form the basis of Table 4 (B2B) and Table 5/7 (B2C) of GSTR-1 and Table 3.1(a) of GSTR-3B."
    >
      <Body />
    </GstFrame>
  );
}

function Body() {
  const { tenantContext, currentCompany } = useAuth();
  const period = useGstPeriod();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [data, setData] = useState<any>(null);
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
      const res = await apiClient.get<any>("/reports/sales-register", {
        fromDate: period.fromDate,
        toDate: period.toDate,
        limit: 100,
        category: category || undefined,
        status: status || undefined,
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || "Sales register could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [tenantContext.companyId, period.fromDate, period.toDate, category, status]);

  useEffect(() => {
    load();
  }, [load]);

  const items = (data?.items || []).filter((row: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const invNo = (row.invoiceNumber || "").toLowerCase();
    const partyName = (row.party?.name || row.partyName || "").toLowerCase();
    const gstin = (row.party?.gstin || row.partyGstin || "").toLowerCase();
    return invNo.includes(q) || partyName.includes(q) || gstin.includes(q);
  });

  const summary = data?.summary || {};

  const handleExportCsv = async () => {
    try {
      const params = new URLSearchParams({
        fromDate: period.fromDate,
        toDate: period.toDate,
      });
      const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/v1/reports/sales-register/export?${params.toString()}`;
      window.open(url, "_blank");
    } catch (e: any) {
      alert("Failed to export CSV: " + (e.message || "Unknown error"));
    }
  };

  return (
    <Panel
      loading={loading}
      error={error}
      onRetry={load}
      empty={
        !tenantContext.companyId
          ? "Sign in and select a company to see the sales register."
          : items.length === 0
          ? "No posted sales invoices in this period."
          : null
      }
    >
      <div className="space-y-4">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Taxable Value</span>
            <p className="text-base font-bold text-slate-900 mt-0.5">{formatInr(summary.totalTaxable)}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Output CGST</span>
            <p className="text-base font-bold text-emerald-700 mt-0.5">{formatInr(summary.totalCgst)}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Output SGST</span>
            <p className="text-base font-bold text-emerald-700 mt-0.5">{formatInr(summary.totalSgst)}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Output IGST</span>
            <p className="text-base font-bold text-blue-700 mt-0.5">{formatInr(summary.totalIgst)}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Gross Sales Total</span>
            <p className="text-base font-bold text-slate-900 mt-0.5">{formatInr(summary.totalGrandTotal)}</p>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap gap-2.5 items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center flex-1">
            <div className="relative w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="w-full pl-9 pr-3 border border-slate-300 rounded-xl text-[13px] h-10 bg-white focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8]"
                placeholder="Search Invoice #, Party, GSTIN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="w-44">
              <CustomSelect
                size="sm"
                value={category}
                onChange={(val: any) => setCategory(val)}
                options={[
                  { value: "", label: "All Categories" },
                  { value: "TAX_INVOICE", label: "Tax Invoice" },
                  { value: "BILL_OF_SUPPLY", label: "Bill of Supply" },
                ]}
                triggerClassName="rounded-xl border-slate-300 h-10"
              />
            </div>

            <div className="w-36">
              <CustomSelect
                size="sm"
                value={status}
                onChange={(val: any) => setStatus(val)}
                options={[
                  { value: "", label: "All Statuses" },
                  { value: "PAID", label: "Paid" },
                  { value: "PARTIALLY_PAID", label: "Partially Paid" },
                  { value: "SENT", label: "Unpaid / Sent" },
                  { value: "OVERDUE", label: "Overdue" },
                ]}
                triggerClassName="rounded-xl border-slate-300 h-10"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-[13px] font-semibold text-slate-700 shadow-sm transition-all"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Sales Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3.5">Invoice #</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Customer / GSTIN</th>
                <th className="py-3 px-3">POS</th>
                <th className="py-3 px-3 text-right">Taxable</th>
                <th className="py-3 px-3 text-right">CGST</th>
                <th className="py-3 px-3 text-right">SGST</th>
                <th className="py-3 px-3 text-right">IGST</th>
                <th className="py-3 px-3 text-right">Invoice Total</th>
                <th className="py-3 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {items.slice((page - 1) * pageSize, page * pageSize).map((row: any) => {
                const partyName = row.party?.name || row.partyName || "Cash Sale";
                const gstin = row.party?.gstin || row.partyGstin || "";
                const isB2B = Boolean(gstin);

                return (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3.5 font-medium text-[#1677E8]">
                      <Link href={`/sales/invoices/${row.id}`} className="hover:underline">
                        {row.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-slate-600 tabular-nums">
                      {row.invoiceDate ? new Date(row.invoiceDate).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-900">{partyName}</div>
                      {isB2B ? (
                        <div className="text-[11px] text-[#1677E8] font-mono font-medium">{gstin}</div>
                      ) : (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">B2C</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {row.placeOfSupply || currentCompany?.stateCode || "—"}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-800 tabular-nums">
                      {formatInr(row.taxableAmount)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700 tabular-nums">
                      {Number(row.cgstAmount) > 0 ? formatInr(row.cgstAmount) : "—"}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700 tabular-nums">
                      {Number(row.sgstAmount) > 0 ? formatInr(row.sgstAmount) : "—"}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700 tabular-nums">
                      {Number(row.igstAmount) > 0 ? formatInr(row.igstAmount) : "—"}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 tabular-nums">
                      {formatInr(row.grandTotal)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          row.status === "PAID"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : row.status === "PARTIALLY_PAID"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : row.status === "CANCELLED"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {row.status}
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
