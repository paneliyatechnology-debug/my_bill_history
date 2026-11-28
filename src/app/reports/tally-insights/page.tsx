"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { apiClient } from "@/lib/api-client";
import { formatInr } from "@/components/design-system/tokens";
import { formatDate } from "@/lib/date-utils";
import { CustomDatePicker } from "@/components/ui/custom-datepicker";
import { TrendingUp, Users, Download, Percent } from "lucide-react";

type TabType = "pnl" | "salesperson" | "tds_tcs";

export default function TallyInsightsReportsPage() {
  const { tenantContext } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("pnl");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingXml, setIsExportingXml] = useState(false);
  const [pnlData, setPnlData] = useState<any>({ summary: {}, records: [] });
  const [salespersonData, setSalespersonData] = useState<any>({ summary: {}, records: [] });
  const [tdsTcsData, setTdsTcsData] = useState<any>({ summary: {}, records: [] });
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;

      if (activeTab === "pnl") {
        const res = await apiClient.get("/reports/invoice-pnl", params);
        setPnlData(res || { summary: {}, records: [] });
      } else if (activeTab === "salesperson") {
        const res = await apiClient.get("/reports/salesperson-summary", params);
        setSalespersonData(res || { summary: {}, records: [] });
      } else {
        const res = await apiClient.get("/reports/tds-tcs-summary", params);
        setTdsTcsData(res || { summary: {}, records: [] });
      }
    } catch (err: any) {
      setError(err.message || "Failed to load report.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, fromDate, toDate]);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchReport();
    }
  }, [fetchReport, tenantContext.companyId]);

  const handleDownloadTallyXml = async () => {
    setIsExportingXml(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
      await apiClient.downloadCsv(
        `/reports/tally-xml?${params.toString()}`,
        `tally-export-${fromDate || "all"}-${toDate || "all"}.xml`,
      );
    } catch (err: any) {
      setError(err.message || "Tally XML export failed.");
    } finally {
      setIsExportingXml(false);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
            REPORTS &amp; TALLY INTEROPERABILITY
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
            Profitability, Salesperson, TDS/TCS &amp; Tally XML
          </h1>
        </div>
        <button
          type="button"
          onClick={handleDownloadTallyXml}
          disabled={isExportingXml}
          className="h-9 px-4 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-[13px] font-semibold shadow-xs inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
        >
          <Download className="w-4 h-4" />
          <span>{isExportingXml ? "Exporting..." : "Export TallyPrime XML"}</span>
        </button>
      </div>

      {/* Tabs + Date Filter */}
      <div className="bg-white p-3 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("pnl")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
              activeTab === "pnl" ? "bg-[#1677E8] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Invoice-wise P&amp;L</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("salesperson")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
              activeTab === "salesperson" ? "bg-[#1677E8] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Sales by Salesperson</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tds_tcs")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
              activeTab === "tds_tcs" ? "bg-[#1677E8] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>TDS &amp; TCS Summary</span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="w-36">
            <CustomDatePicker
              size="sm"
              value={fromDate}
              onChange={(val) => setFromDate(val)}
              maxDate={toDate || undefined}
              placeholder="From Date"
            />
          </div>
          <span className="text-xs text-slate-400">to</span>
          <div className="w-36">
            <CustomDatePicker
              size="sm"
              value={toDate}
              onChange={(val) => setToDate(val)}
              minDate={fromDate || undefined}
              placeholder="To Date"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">{error}</div>
      )}

      {activeTab === "pnl" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
              <p className="text-[11px] font-bold uppercase text-slate-400">Total Revenue (Taxable)</p>
              <p className="text-lg font-bold text-[#0F172A] mt-1">{formatInr(pnlData.summary?.totalRevenue || 0)}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
              <p className="text-[11px] font-bold uppercase text-slate-400">Estimated COGS</p>
              <p className="text-lg font-bold text-slate-700 mt-1">{formatInr(pnlData.summary?.totalCost || 0)}</p>
            </div>
            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-xs">
              <p className="text-[11px] font-bold uppercase text-emerald-700">Gross Profit</p>
              <p className="text-lg font-bold text-emerald-800 mt-1">{formatInr(pnlData.summary?.totalProfit || 0)}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
              <p className="text-[11px] font-bold uppercase text-slate-400">Avg. Margin %</p>
              <p className="text-lg font-bold text-[#1677E8] mt-1">{pnlData.summary?.avgMarginPct ?? 0}%</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase text-slate-500">
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Salesperson</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-right">Cost</th>
                  <th className="px-4 py-3 text-right">Profit</th>
                  <th className="px-4 py-3 text-right">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px]">
                {isLoading ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
                ) : (pnlData.records || []).length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No invoices found.</td></tr>
                ) : (
                  (pnlData.records || []).map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-semibold text-[#0F172A]">{r.invoiceNumber}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(r.invoiceDate)}</td>
                      <td className="px-4 py-3 text-slate-800">{r.partyName}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{r.salespersonName}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatInr(r.revenue)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-500">{formatInr(r.cost)}</td>
                      <td className={`px-4 py-3 text-right font-semibold tabular-nums ${r.profit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                        {formatInr(r.profit)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{r.marginPct}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "salesperson" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase text-slate-500">
                <th className="px-4 py-3">Salesperson</th>
                <th className="px-4 py-3 text-right">Invoices</th>
                <th className="px-4 py-3 text-right">Total Sales</th>
                <th className="px-4 py-3 text-right">Collected Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {isLoading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
              ) : (salespersonData.records || []).length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No salesperson records found.</td></tr>
              ) : (
                (salespersonData.records || []).map((r: any) => (
                  <tr key={r.salespersonName} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-[#0F172A]">{r.salespersonName}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.invoiceCount}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatInr(r.totalSales)}</td>
                    <td className="px-4 py-3 text-right text-emerald-700 tabular-nums">{formatInr(r.collectedAmount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "tds_tcs" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
              <p className="text-[11px] font-bold uppercase text-slate-400">Total TDS Deducted (Purchases)</p>
              <p className="text-lg font-bold text-[#0F172A] mt-1">{formatInr(tdsTcsData.summary?.totalTds || 0)}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
              <p className="text-[11px] font-bold uppercase text-slate-400">Total TCS Collected (Sales)</p>
              <p className="text-lg font-bold text-[#1677E8] mt-1">{formatInr(tdsTcsData.summary?.totalTcs || 0)}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase text-slate-500">
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Section</th>
                  <th className="px-4 py-3">Doc #</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Party</th>
                  <th className="px-4 py-3">PAN</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                  <th className="px-4 py-3 text-right">Tax Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px]">
                {isLoading ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
                ) : (tdsTcsData.records || []).length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No TDS or TCS transactions recorded yet.</td></tr>
                ) : (
                  (tdsTcsData.records || []).map((r: any, i: number) => (
                    <tr key={`${r.documentNumber}-${i}`} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${r.type === "TDS" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                          {r.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{r.section}</td>
                      <td className="px-4 py-3 font-semibold text-[#0F172A]">{r.documentNumber}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(r.date)}</td>
                      <td className="px-4 py-3">{r.partyName}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.pan}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.rate}%</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatInr(r.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
