"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "../../lib/api-client";
import { useAuth } from "../../context/auth-context";
import { GstFrame, Panel, useGstPeriod } from "../../components/gst/gst-kit";
import {
  TrendingUp,
  Receipt,
  Scale,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  Truck,
  QrCode,
  CreditCard,
  Percent,
} from "lucide-react";

function formatInr(val: string | number | undefined | null): string {
  const num = Number(val) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
}

function formatLakhs(val: number | string | undefined | null): string {
  const num = Number(val) || 0;
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)} Cr`;
  }
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(2)} L`;
  }
  return formatInr(num);
}

export default function GstDashboardPage() {
  return (
    <GstFrame title="GST Dashboard">
      <DashboardBody />
    </GstFrame>
  );
}

function DashboardBody() {
  const { tenantContext } = useAuth();
  const period = useGstPeriod();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        returnPeriod: period.returnPeriod,
      };

      const summary = await apiClient.get<any>("/gst/dashboard-summary", params);
      setData(summary);
    } catch (err: any) {
      setError(err.message || "The GST dashboard summary could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [tenantContext.companyId, period.fromDate, period.toDate, period.month, period.year, period.returnPeriod]);

  useEffect(() => {
    load();
  }, [load]);

  const reconCounts = data?.complianceStatuses?.reconciliationCounts || {};
  const cashBreakup = data?.cashPayableBreakup || {};

  // 8 Statutory KPI figures
  const salesTaxable = Number(data?.kpi?.totalSalesTaxable ?? data?.salesTaxableValue ?? 0);
  const outCgst = Number(data?.kpi?.outputCgst ?? data?.outputCgst ?? 0);
  const outSgst = Number(data?.kpi?.outputSgst ?? (Number(data?.outputSgst || 0) + Number(data?.outputUtgst || 0)));
  const outIgst = Number(data?.kpi?.outputIgst ?? data?.outputIgst ?? 0);
  const purchaseTax = Number(data?.kpi?.totalPurchaseTax ?? data?.totalPurchaseGst ?? 0);
  const eligibleItc = Number(data?.kpi?.eligibleItc ?? data?.eligibleItc ?? 0);
  const netGstLiability = Number(data?.kpi?.netGstLiability ?? data?.estimatedCashPayable ?? 0);

  // Filing status
  const filingTotal = data?.filingStatus?.total ?? 2;
  const filingFiled = data?.filingStatus?.filed ?? 0;
  const filingOverdue = data?.filingStatus?.overdue ?? 0;
  const filingPending = data?.filingStatus?.pending ?? (filingTotal - filingFiled - filingOverdue);
  const pendingReturns = Number(data?.kpi?.pendingReturns ?? (filingOverdue + filingPending));

  // Monthly trend for chart (Derived strictly from real database records)
  const monthlyTrend: Array<{ periodLabel: string; taxLiability: number; itcClaimed: number }> =
    data?.monthlyTrend && Array.isArray(data.monthlyTrend) ? data.monthlyTrend : [];

  const maxTrendVal = monthlyTrend.length > 0
    ? Math.max(...monthlyTrend.map((t) => Math.max(t.taxLiability, t.itcClaimed)), 1000)
    : 1000;

  return (
    <Panel
      loading={loading}
      error={error}
      onRetry={load}
      empty={
        !tenantContext.companyId
          ? "Sign in and select a company. Figures stay empty until that company and period are loaded."
          : null
      }
    >
      <div className="space-y-6">
        {/* ── COMMAND HEADER (Quick Actions) ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">GST Overview & Compliance</h2>
            <p className="text-xs text-slate-500">Overview of GST compliance, tax liability, and reconciliation status</p>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              href="/gst/gstr-2b"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-all"
            >
              <span>Run Reconciliation</span>
            </Link>
            <Link
              href="/gst/gstr-3b"
              className="inline-flex items-center gap-1.5 h-9 px-4 bg-[#1677E8] hover:bg-[#1268D3] text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
            >
              <span>File GSTR-3B</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* ── 8 STATUTORY KPI CARDS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* 1. Total Sales Taxable Value */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Sales Taxable Value</span>
              <p className="text-xl font-bold text-slate-900 mt-1.5 tabular-nums">
                {formatInr(salesTaxable)}
              </p>
            </div>
            <Link
              href="/gst/sales"
              className="mt-2.5 text-[11px] text-[#1677E8] hover:underline font-semibold inline-flex items-center gap-1"
            >
              <span>Sales Register</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* 2. Output CGST */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Output CGST</span>
              <p className="text-xl font-bold text-slate-900 mt-1.5 tabular-nums">
                {formatInr(outCgst)}
              </p>
            </div>
            <Link
              href="/gst/gstr-1"
              className="mt-2.5 text-[11px] text-[#1677E8] hover:underline font-semibold inline-flex items-center gap-1"
            >
              <span>GSTR-1 Details</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* 3. Output SGST */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Output SGST / UTGST</span>
              <p className="text-xl font-bold text-slate-900 mt-1.5 tabular-nums">
                {formatInr(outSgst)}
              </p>
            </div>
            <Link
              href="/gst/gstr-1"
              className="mt-2.5 text-[11px] text-[#1677E8] hover:underline font-semibold inline-flex items-center gap-1"
            >
              <span>GSTR-1 Details</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* 4. Output IGST */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Output IGST</span>
              <p className="text-xl font-bold text-slate-900 mt-1.5 tabular-nums">
                {formatInr(outIgst)}
              </p>
            </div>
            <Link
              href="/gst/gstr-1"
              className="mt-2.5 text-[11px] text-[#1677E8] hover:underline font-semibold inline-flex items-center gap-1"
            >
              <span>Inter-State Details</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* 5. Total Purchase Tax */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Purchase Tax</span>
              <p className="text-xl font-bold text-slate-900 mt-1.5 tabular-nums">
                {formatInr(purchaseTax)}
              </p>
            </div>
            <Link
              href="/gst/purchases"
              className="mt-2.5 text-[11px] text-[#1677E8] hover:underline font-semibold inline-flex items-center gap-1"
            >
              <span>Purchase Register</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* 6. Eligible Input Tax Credit */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">Eligible ITC</span>
              <p className="text-xl font-bold text-emerald-700 mt-1.5 tabular-nums">
                {formatInr(eligibleItc)}
              </p>
            </div>
            <Link
              href="/gst/gstr-2b"
              className="mt-2.5 text-[11px] text-[#1677E8] hover:underline font-semibold inline-flex items-center gap-1"
            >
              <span>2B Reconciliation</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* 7. Net GST Liability */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Net Cash Liability</span>
              <p className={`text-xl font-bold mt-1.5 tabular-nums ${netGstLiability > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                {formatInr(netGstLiability)}
              </p>
            </div>
            <Link
              href="/gst/gstr-3b"
              className="mt-2.5 text-[11px] text-[#1677E8] hover:underline font-semibold inline-flex items-center gap-1"
            >
              <span>GSTR-3B Table 6.1</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* 8. Pending GST Returns */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Pending Returns</span>
              <p className="text-xl font-bold text-amber-700 mt-1.5 tabular-nums">
                {pendingReturns}
              </p>
            </div>
            <Link
              href="/gst/reports"
              className="mt-2.5 text-[11px] text-[#1677E8] hover:underline font-semibold inline-flex items-center gap-1"
            >
              <span>Compliance Status</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* ── C. TWO ANALYTICS CHARTS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Donut Chart: Filing Status */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <h3 className="text-sm font-bold text-slate-900">GST Filing Status</h3>

            <div className="relative flex items-center justify-center my-5">
              <svg className="w-44 h-44 -rotate-90 transform" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" stroke="#F1F5F9" strokeWidth="12" fill="transparent" />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#10B981"
                  strokeWidth="12"
                  strokeDasharray={`${(filingFiled / filingTotal) * 238.76} 238.76`}
                  strokeDashoffset="0"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#EF4444"
                  strokeWidth="12"
                  strokeDasharray={`${(filingOverdue / filingTotal) * 238.76} 238.76`}
                  strokeDashoffset={`-${(filingFiled / filingTotal) * 238.76}`}
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#F59E0B"
                  strokeWidth="12"
                  strokeDasharray={`${(filingPending / filingTotal) * 238.76} 238.76`}
                  strokeDashoffset={`-${((filingFiled + filingOverdue) / filingTotal) * 238.76}`}
                  fill="transparent"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total</span>
                <span className="text-2xl font-bold text-slate-900">{filingTotal}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-5 text-xs font-medium text-slate-600 border-t border-slate-100 pt-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                <span>Filed ({filingFiled})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                <span>Overdue ({filingOverdue})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                <span>Pending ({filingPending})</span>
              </div>
            </div>
          </div>

          {/* Bar Chart: Monthly Tax Liability vs ITC */}
          <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900">Monthly Tax Liability vs ITC</h3>
              <span className="text-[11px] text-slate-500 font-medium">Statutory Ledger Trend</span>
            </div>

            {monthlyTrend.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-4">
                <Receipt className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">No monthly transaction data available</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Post sales and purchase invoices to visualize monthly tax comparison.</p>
              </div>
            ) : (
              <div className="my-3 space-y-3">
                <div className="relative h-44 flex items-end justify-around gap-6 pt-5 border-b border-slate-200">
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-slate-400">
                    <div className="border-b border-dashed border-slate-100 w-full flex justify-between">
                      <span>{formatLakhs(maxTrendVal)}</span>
                    </div>
                    <div className="border-b border-dashed border-slate-100 w-full flex justify-between">
                      <span>{formatLakhs(maxTrendVal * 0.5)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>₹0</span>
                    </div>
                  </div>

                  {monthlyTrend.map((m) => {
                    const liabilityHeight = Math.min(100, Math.round((m.taxLiability / maxTrendVal) * 100));
                    const itcHeight = Math.min(100, Math.round((m.itcClaimed / maxTrendVal) * 100));

                    return (
                      <div key={m.periodLabel} className="flex flex-col items-center z-10 w-24">
                        <div className="flex items-end gap-2 h-36">
                          <div
                            style={{ height: `${Math.max(liabilityHeight, 4)}%` }}
                            className="w-7 rounded-t bg-[#1677E8] transition-all hover:opacity-90 relative group"
                          >
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-20">
                              {formatInr(m.taxLiability)}
                            </div>
                          </div>

                          <div
                            style={{ height: `${Math.max(itcHeight, 4)}%` }}
                            className="w-7 rounded-t bg-[#10B981] transition-all hover:opacity-90 relative group"
                          >
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-20">
                              {formatInr(m.itcClaimed)}
                            </div>
                          </div>
                        </div>

                        <span className="text-xs font-semibold text-slate-600 mt-2">{m.periodLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-6 text-xs font-medium border-t border-slate-100 pt-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#10B981]" />
                <span className="text-slate-700">ITC Claimed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#1677E8]" />
                <span className="text-slate-700">Output Tax Liability</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── D. GST SUMMARY SECTIONS ── */}
        <div className="space-y-5">
          {/* 1. Outward Supplies */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  1. Outward Supplies (Sales)
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/gst/sales"
                  className="text-xs text-[#1677E8] hover:underline font-semibold flex items-center gap-1"
                >
                  <span>Sales Register</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/gst/gstr-1"
                  className="text-xs text-slate-600 hover:text-slate-900 hover:underline font-semibold flex items-center gap-1"
                >
                  <span>GSTR-1 Preparation</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <StatItem label="Taxable Value" value={formatInr(data?.salesTaxableValue)} />
              <StatItem label="Output CGST" value={formatInr(data?.outputCgst)} />
              <StatItem
                label="Output SGST/UTGST"
                value={formatInr(Number(data?.outputSgst || 0) + Number(data?.outputUtgst || 0))}
              />
              <StatItem label="Output IGST" value={formatInr(data?.outputIgst)} />
              <StatItem
                label="Total Output Tax"
                value={formatInr(data?.estimatedGstLiability)}
                highlight="blue"
              />
            </div>
          </div>

          {/* 2. Inward Supplies & ITC */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  2. Inward Supplies & Input Tax Credit (ITC)
                </h3>
              </div>
              <Link
                href="/gst/purchases"
                className="text-xs text-[#1677E8] hover:underline font-semibold flex items-center gap-1"
              >
                <span>Purchase Register</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <StatItem label="Total Purchase GST" value={formatInr(data?.totalPurchaseGst)} />
              <StatItem label="Eligible ITC" value={formatInr(data?.eligibleItc)} highlight="emerald" />
              <StatItem label="Ineligible ITC (Sec 17(5))" value={formatInr(data?.ineligibleItc)} />
              <StatItem label="ITC Pending Review" value={formatInr(data?.itcPendingReview)} highlight="amber" />
              <StatItem label="ITC Reversed" value={formatInr(data?.itcReversed)} />
            </div>
          </div>

          {/* 3. Tax Settlement */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  3. Tax Settlement (Rule 88A)
                </h3>
              </div>
              <Link
                href="/gst/gstr-3b"
                className="text-xs text-[#1677E8] hover:underline font-semibold flex items-center gap-1"
              >
                <span>GSTR-3B Table 6.1</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <StatItem label="Available ITC" value={formatInr(data?.availableItc)} highlight="emerald" />
              <StatItem label="CGST Cash Payable" value={formatInr(cashBreakup.cgst)} />
              <StatItem
                label="SGST Cash Payable"
                value={formatInr(Number(cashBreakup.sgst || 0) + Number(cashBreakup.utgst || 0))}
              />
              <StatItem label="IGST Cash Payable" value={formatInr(cashBreakup.igst)} />
              <StatItem
                label="Net Cash Payable"
                value={formatInr(data?.estimatedCashPayable)}
                highlight="rose"
              />
            </div>
          </div>

          {/* 4. GSTR-2B Reconciliation */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  4. GSTR-2B Reconciliation
                </h3>
              </div>
              <Link
                href="/gst/gstr-2b"
                className="text-xs text-[#1677E8] hover:underline font-semibold flex items-center gap-1"
              >
                <span>Reconciliation Console</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              <ReconBadge label="Matched" count={reconCounts.MATCHED || 0} color="emerald" />
              <ReconBadge label="Partial Match" count={reconCounts.PARTIAL_MATCH || 0} color="amber" />
              <ReconBadge label="Missing in Books" count={reconCounts.MISSING_IN_BOOKS || 0} color="blue" />
              <ReconBadge label="Missing in GSTR-2B" count={reconCounts.MISSING_IN_GSTR2B || 0} color="rose" />
              <ReconBadge label="Mismatch" count={reconCounts.MISMATCH || 0} color="orange" />
              <ReconBadge label="Duplicate" count={reconCounts.DUPLICATE || 0} color="purple" />
            </div>
          </div>

          {/* 5. E-Invoice & E-Way Bill */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  5. E-Invoice & E-Way Bill
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/gst/einvoice"
                  className="text-xs text-[#1677E8] hover:underline font-semibold flex items-center gap-1"
                >
                  <span>E-Invoice IRNs</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/gst/eway"
                  className="text-xs text-slate-600 hover:text-slate-900 hover:underline font-semibold flex items-center gap-1"
                >
                  <span>E-Way Bills</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-medium">Generated IRNs</span>
                  <p className="text-xl font-bold text-slate-900 mt-0.5 tabular-nums">
                    {data?.complianceStatuses?.eInvoiceCount || 0}
                  </p>
                </div>
                <QrCode className="w-6 h-6 text-slate-300" />
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-medium">Active E-Way Bills</span>
                  <p className="text-xl font-bold text-slate-900 mt-0.5 tabular-nums">
                    {data?.complianceStatuses?.eWayBillCount || 0}
                  </p>
                </div>
                <Truck className="w-6 h-6 text-slate-300" />
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-medium">Missing Recipient GSTINs</span>
                  <p className="text-xl font-bold text-amber-600 mt-0.5 tabular-nums">
                    {data?.complianceStatuses?.missingRecipientGstinCount || 0}
                  </p>
                </div>
                <AlertTriangle className="w-6 h-6 text-amber-300" />
              </div>
            </div>
          </div>

          {/* 6. Recent GST Activity */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2.5">
              <Clock className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                6. Recent GST Activity & Audit Trail
              </h3>
            </div>
            {(!data?.recentAudit || data.recentAudit.length === 0) ? (
              <p className="text-xs text-slate-500 py-2">No recent audit log entries in this company ledger.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Operation</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal">
                    {data.recentAudit.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 text-slate-500 tabular-nums">
                          {new Date(log.createdAt).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{log.operation}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              log.outcome === "SUCCEEDED"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {log.outcome}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 truncate max-w-sm">{log.errorMessage || "Completed successfully"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function StatItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "emerald" | "rose" | "blue" | "amber";
}) {
  const highlightStyles = {
    emerald: "text-emerald-700 font-bold",
    rose: "text-rose-700 font-bold",
    blue: "text-[#1677E8] font-bold",
    amber: "text-amber-700 font-bold",
  };

  return (
    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/40">
      <span className="text-[11px] font-semibold text-slate-500 block truncate">{label}</span>
      <p className={`text-sm mt-1 tabular-nums ${highlight ? highlightStyles[highlight] : "font-bold text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}

function ReconBadge({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: "emerald" | "amber" | "blue" | "rose" | "orange" | "purple";
}) {
  const badgeClasses = {
    emerald: "text-emerald-700 bg-emerald-50 border-emerald-200",
    amber: "text-amber-700 bg-amber-50 border-amber-200",
    blue: "text-blue-700 bg-blue-50 border-blue-200",
    rose: "text-rose-700 bg-rose-50 border-rose-200",
    orange: "text-orange-700 bg-orange-50 border-orange-200",
    purple: "text-purple-700 bg-purple-50 border-purple-200",
  };

  return (
    <div className="p-3 rounded-xl border border-slate-200 bg-white">
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${badgeClasses[color]}`}>
        {label}
      </span>
      <p className="text-lg font-bold text-slate-900 mt-1.5 tabular-nums">{count}</p>
    </div>
  );
}
