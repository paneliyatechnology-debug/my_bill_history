"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "../context/auth-context";
import { apiClient, extractList } from "../lib/api-client";
import { StatCard } from "../components/ui/stat-card";
import { StatusBadge } from "../components/ui/badge";

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  partyName?: string;
  grandTotal: number;
  outstandingBalance: number;
  status: string;
}

export default function DashboardPage() {
  const { lang, tenantContext, currentCompany, currentBranch, currentFY } =
    useAuth();

  const [metrics, setMetrics] = useState({
    totalSales: 0,
    totalInvoices: 0,
    totalOutstanding: 0,
    totalInventoryValue: 0,
  });

  const [recentInvoices, setRecentInvoices] = useState<InvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [salesRes, outRes, stockRes, invListRes]: any = await Promise.all([
        apiClient.get("/reports/sales-register").catch(() => null),
        apiClient.get("/reports/outstanding-balances").catch(() => null),
        apiClient.get("/reports/stock-summary").catch(() => null),
        apiClient.get("/invoices/sales", { limit: 5 }).catch(() => null),
      ]);

      const totalSales = Number(salesRes?.summary?.totalGrandTotal || 0);
      const totalInvoices = Number(salesRes?.summary?.totalInvoices || 0);
      const totalOutstanding = Number(outRes?.totalOutstanding || 0);

      const stockItems =
        stockRes?.items || (Array.isArray(stockRes) ? stockRes : []);
      const totalInventoryValue = stockItems.reduce(
        (sum: number, it: any) => sum + (Number(it.closingValue) || 0),
        0,
      );

      setMetrics({
        totalSales,
        totalInvoices,
        totalOutstanding,
        totalInventoryValue,
      });

      const invs = extractList(invListRes);
      setRecentInvoices(invs.slice(0, 5));
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchDashboardData();
    }
  }, [tenantContext.companyId, fetchDashboardData]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-zinc-900 border-l-4 border-l-[#FF9933] border border-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs bg-[#FF9933]/15 text-[#FF9933] border border-[#FF9933]/30 px-3 py-0.5 rounded-full font-mono uppercase tracking-wider font-semibold">
              {currentCompany?.tradeName ||
                currentCompany?.legalName ||
                "Trading Enterprise"}
            </span>
            {currentBranch && (
              <span className="text-xs text-slate-300">
                • {currentBranch.name} ({currentBranch.code})
              </span>
            )}
            {currentFY && (
              <span className="text-xs text-amber-400 font-mono font-medium">
                • FY {currentFY.name}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {lang === "gu"
              ? "વેપાર અને નામાનું સંચાલન બોર્ડ"
              : "Business Billing & Accounting Dashboard"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            {lang === "gu"
              ? "વિક્રમ સંવત અને જીએસટી નિયમો અનુસાર સ્વચાલિત દ્વિનોંધી નામું અને બિલિંગ પ્લેટફોર્મ."
              : "Indian SME GST billing, double-entry ledger bookkeeping, and inventory control engine."}
          </p>
        </div>
        <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 opacity-10 text-9xl font-bold font-mono text-[#FF9933]">
          ₹
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href="/sales/invoices/new"
          className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-[#FF9933] hover:shadow-md transition-all flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-[#E67E17] flex items-center justify-center font-bold text-lg group-hover:bg-[#FF9933] group-hover:text-slate-950 transition-colors">
            +
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 block">
              {lang === "gu" ? "નવું બિલ" : "New Invoice"}
            </span>
            <span className="text-[10px] text-slate-500">
              Tax Invoice Entry
            </span>
          </div>
        </Link>

        <Link
          href="/sales/pos"
          className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-[#FF9933] hover:shadow-md transition-all flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-lg bg-orange-50 text-[#E67E17] flex items-center justify-center font-bold text-lg group-hover:bg-[#FF9933] group-hover:text-slate-950 transition-colors">
            🛒
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 block">
              {lang === "gu" ? "પીઓએસ કાઉન્ટર" : "POS Checkout"}
            </span>
            <span className="text-[10px] text-slate-500">Touch Terminal</span>
          </div>
        </Link>

        <Link
          href="/accounting/vouchers/new"
          className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-amber-400 hover:shadow-md transition-all flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-lg group-hover:bg-[#E67E17] group-hover:text-white transition-colors">
            📖
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 block">
              {lang === "gu" ? "વાઉચર નોંધ" : "New Voucher"}
            </span>
            <span className="text-[10px] text-slate-500">Journal Dr = Cr</span>
          </div>
        </Link>

        <Link
          href="/masters/parties"
          className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
            👥
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 block">
              {lang === "gu" ? "વેપારીઓ (ખાતા)" : "Party Masters"}
            </span>
            <span className="text-[10px] text-slate-500">
              Customers & Vendors
            </span>
          </div>
        </Link>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Sales (વેચાણ)"
          titleGujarati="કુલ વેચાણ"
          value={
            isLoading
              ? "Loading..."
              : `₹${metrics.totalSales.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
          }
          subtext={`${metrics.totalInvoices} Invoices Issued`}
          variant="saffron"
          icon={<span className="text-[#E67E17] font-bold">₹</span>}
        />

        <StatCard
          title="Outstanding Receivables"
          titleGujarati="ઉઘરાણી બાકી"
          value={
            isLoading
              ? "Loading..."
              : `₹${metrics.totalOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
          }
          subtext="Bill-by-Bill Customer Due"
          variant="warning"
          icon={<span className="text-amber-600 font-bold">⏳</span>}
        />

        <StatCard
          title="Stock Valuation"
          titleGujarati="સ્ટોક મૂલ્ય"
          value={
            isLoading
              ? "Loading..."
              : `₹${metrics.totalInventoryValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
          }
          subtext="WAC/FIFO Inventory Value"
          variant="brand"
          icon={<span className="text-indigo-600 font-bold">📦</span>}
        />

        <StatCard
          title="Active Financial Year"
          titleGujarati="નાણાકીય વર્ષ"
          value={currentFY?.name || "2026-27"}
          subtext={
            currentFY?.isLocked ? "Period Locked 🔒" : "Active Period 🟢"
          }
          variant="default"
          icon={<span className="text-slate-600 font-bold">📅</span>}
        />
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {lang === "gu" ? "તાજેતરના વેચાણ બિલો" : "Recent Sales Invoices"}
            </h2>
            <p className="text-[11px] text-slate-500">
              Latest tax invoices created in active company context
            </p>
          </div>
          <Link
            href="/sales/invoices"
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold"
          >
            View All Invoices →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <th className="py-2.5 px-3">Invoice No</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3 text-right">Total (₹)</th>
                <th className="py-2.5 px-3 text-right">Balance (₹)</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No recent invoices recorded. Click &apos;New Invoice&apos;
                    above to create one.
                  </td>
                </tr>
              ) : (
                recentInvoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {new Date(inv.invoiceDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      {inv.party?.name || inv.partyName || "Cash Customer"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      ₹{Number(inv.grandTotal).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold">
                      {Number(inv.outstandingBalance) > 0 ? (
                        <span className="text-amber-700">
                          ₹{Number(inv.outstandingBalance).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-emerald-600">₹0.00</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link
                        href={`/sales/invoices/${inv.id}`}
                        className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold"
                      >
                        Details →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
