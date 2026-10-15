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
  const { lang, tenantContext, currentCompany, currentBranch, currentFY } = useAuth();

  const [metrics, setMetrics] = useState({
    totalSales: 0,
    totalInvoices: 0,
    totalOutstanding: 0,
    totalInventoryValue: 0,
  });

  const [recentInvoices, setRecentInvoices] = useState<InvoiceItem[]>([]);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [salesRes, outRes, stockRes, invListRes, itemsRes]: any = await Promise.all([
        apiClient.get("/reports/sales-register").catch(() => null),
        apiClient.get("/reports/outstanding-balances").catch(() => null),
        apiClient.get("/reports/stock-summary").catch(() => null),
        apiClient.get("/invoices", { limit: 6 }).catch(() => null),
        apiClient.get("/items").catch(() => null),
      ]);

      const totalSales = Number(
        salesRes?.summary?.totalGrandTotal || salesRes?.totalSales || 0
      );
      const totalInvoices = Number(
        salesRes?.summary?.totalInvoices || salesRes?.invoices?.length || 0
      );
      const totalOutstanding = Number(
        outRes?.totals?.totalCustomerOutstanding ||
          outRes?.totalCustomerOutstanding ||
          outRes?.totalOutstanding ||
          0
      );

      const stockItems = stockRes?.items || (Array.isArray(stockRes) ? stockRes : []);
      const totalInventoryValue = Number(
        stockRes?.totals?.totalValuation ||
          stockItems.reduce(
            (sum: number, it: any) => sum + (Number(it.totalValuation || it.closingValue) || 0),
            0
          )
      );

      // Low stock count
      const allItems = extractList(itemsRes);
      const lowCount = allItems.filter(
        (it: any) => Number(it.stockQuantity || 0) <= Number(it.minStockAlert || 5)
      ).length;

      setMetrics({
        totalSales,
        totalInvoices,
        totalOutstanding,
        totalInventoryValue,
      });
      setLowStockCount(lowCount);

      const invs = extractList(invListRes);
      setRecentInvoices(invs.slice(0, 6));
    } catch {
      // Graceful fallback on network glitch
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchDashboardData();
    }
  }, [tenantContext.companyId, fetchDashboardData]);

  const formatInr = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP PROMINENT ACTION BANNER */}
      <div className="bg-white rounded-card p-4 sm:p-6 border border-[#E5E7EB] shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-[#F47721] min-w-0">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[#F47721] bg-[#FFF3E8] border border-[#FED7AA] px-2.5 py-0.5 rounded-full truncate max-w-full">
              {currentCompany?.tradeName ||
                currentCompany?.legalName ||
                (isLoading ? "Loading..." : "No Company Selected")}
            </span>
            <span className="text-xs text-[#667085] hidden sm:inline">
              • {currentBranch?.name || "Main Branch"} • {currentFY?.name || (isLoading ? "Loading..." : "No Active FY")}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#202124] tracking-tight truncate">
            {lang === "gu"
              ? "વેપાર ડેશબોર્ડ (Business Overview)"
              : "Business Dashboard"}
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] break-words">
            {lang === "gu"
              ? "આજના બિલ, ઉઘરાણી બાકી અને સ્ટોકની સ્થિતિ એક જ નજરે જુઓ."
              : "Real-time summary of sales, customer dues, and inventory value."}
          </p>
        </div>

        {/* Primary Action Button (Create Bill) & Secondary Shortcuts */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap w-full md:w-auto">
          <Link
            href="/sales/invoices/new"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-[#F47721] hover:bg-[#D95F12] text-white rounded-button font-bold text-sm shadow-saffron transition-all transform active:scale-98 whitespace-nowrap"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>{lang === "gu" ? "નવું વેચાણ બિલ (F2)" : "Create New Bill"}</span>
          </Link>

          <Link
            href="/sales/pos"
            className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2.5 bg-[#FFF3E8] hover:bg-[#FED7AA] text-[#B94B0A] rounded-button font-semibold text-xs sm:text-sm border border-[#FDBA74] transition-colors whitespace-nowrap"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>{lang === "gu" ? "ઝડપી POS" : "POS Counter"}</span>
          </Link>
        </div>
      </div>

      {/* 2. REAL-TIME BUSINESS METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
        {/* Total Sales */}
        <StatCard
          title="Total Sales"
          titleGujarati="કુલ વેચાણ"
          value={isLoading ? "..." : formatInr(metrics.totalSales)}
          subtext={`${metrics.totalInvoices} Invoices Issued`}
          variant="primary"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />

        {/* Customer Receivables (Udhar) */}
        <StatCard
          title="Receivables"
          titleGujarati="ઉઘરાણી બાકી (લેણું)"
          value={isLoading ? "..." : formatInr(metrics.totalOutstanding)}
          subtext={lang === "gu" ? "ગ્રાહકો પાસેથી લેવાના બાકી" : "Customer balance to collect"}
          variant={metrics.totalOutstanding > 0 ? "warning" : "default"}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        {/* Total Stock Valuation */}
        <StatCard
          title="Stock Valuation"
          titleGujarati="કુલ સ્ટોકની કિંમત"
          value={isLoading ? "..." : formatInr(metrics.totalInventoryValue)}
          subtext={lang === "gu" ? "ગોડાઉન માલસામાન કિંમત (AS-2)" : "Closing stock at cost"}
          variant="default"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />

        {/* Low Stock Items Alert */}
        <StatCard
          title="Low Stock Alert"
          titleGujarati="ઓછો સ્ટોક ચેતવણી"
          value={isLoading ? "..." : `${lowStockCount} Items`}
          subtext={lowStockCount > 0 ? (lang === "gu" ? "તરત ઓર્ડર આપવો જરૂરી" : "Needs reorder soon") : (lang === "gu" ? "સ્ટોક પૂરતો છે" : "Stock is healthy")}
          variant={lowStockCount > 0 ? "danger" : "success"}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
      </div>

      {/* 3. QUICK SHORTCUTS STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 min-w-0">
        <Link
          href="/masters/items"
          className="p-3 bg-white rounded-card border border-[#E5E7EB] hover:border-[#F47721] hover:bg-[#FFFAF5] transition-all flex items-center gap-2.5 sm:gap-3 shadow-subtle group min-w-0 overflow-hidden"
        >
          <div className="p-2 bg-[#F3F4F6] group-hover:bg-[#FFF3E8] rounded-lg text-[#F47721] transition-colors shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-[#202124] truncate">{lang === "gu" ? "+ નવી વસ્તુ" : "+ Add Item"}</div>
            <div className="text-[10px] text-[#667085] truncate">{lang === "gu" ? "પ્રોડક્ટ માસ્ટર" : "Item Master"}</div>
          </div>
        </Link>

        <Link
          href="/masters/parties"
          className="p-3 bg-white rounded-card border border-[#E5E7EB] hover:border-[#F47721] hover:bg-[#FFFAF5] transition-all flex items-center gap-2.5 sm:gap-3 shadow-subtle group min-w-0 overflow-hidden"
        >
          <div className="p-2 bg-[#F3F4F6] group-hover:bg-[#FFF3E8] rounded-lg text-[#F47721] transition-colors shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-[#202124] truncate">{lang === "gu" ? "+ નવો ગ્રાહક" : "+ Add Customer"}</div>
            <div className="text-[10px] text-[#667085] truncate">{lang === "gu" ? "ખાતું ખોલો" : "Parties Ledger"}</div>
          </div>
        </Link>

        <Link
          href="/purchases"
          className="p-3 bg-white rounded-card border border-[#E5E7EB] hover:border-[#F47721] hover:bg-[#FFFAF5] transition-all flex items-center gap-2.5 sm:gap-3 shadow-subtle group min-w-0 overflow-hidden"
        >
          <div className="p-2 bg-[#F3F4F6] group-hover:bg-[#FFF3E8] rounded-lg text-[#F47721] transition-colors shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-[#202124] truncate">{lang === "gu" ? "+ ખરીદી બિલ" : "+ Purchase Bill"}</div>
            <div className="text-[10px] text-[#667085] truncate">{lang === "gu" ? "ઇનવોઇસ સ્કેનર" : "Bill Scanner"}</div>
          </div>
        </Link>

        <Link
          href="/finance/expenses"
          className="p-3 bg-white rounded-card border border-[#E5E7EB] hover:border-[#F47721] hover:bg-[#FFFAF5] transition-all flex items-center gap-2.5 sm:gap-3 shadow-subtle group min-w-0 overflow-hidden"
        >
          <div className="p-2 bg-[#F3F4F6] group-hover:bg-[#FFF3E8] rounded-lg text-[#F47721] transition-colors shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-[#202124] truncate">{lang === "gu" ? "+ દૈનિક ખર્ચ" : "+ Record Expense"}</div>
            <div className="text-[10px] text-[#667085] truncate">{lang === "gu" ? "રોકડ / બેંક જાવક" : "Payment Out"}</div>
          </div>
        </Link>
      </div>

      {/* 4. RECENT INVOICES & QUICK RECONCILIATION TABLE / MOBILE CARD LIST */}
      <div className="bg-white rounded-card border border-[#E5E7EB] shadow-card overflow-hidden min-w-0">
        <div className="p-4 sm:p-5 border-b border-[#E5E7EB] flex items-center justify-between flex-wrap gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[#202124] uppercase tracking-wider truncate">
              {lang === "gu" ? "તાજેતરના વેચાણ બિલ (Recent Invoices)" : "Recent Sales Invoices"}
            </h2>
            <p className="text-xs text-[#667085] truncate">
              {lang === "gu" ? "આજના નવા બિલ અને તેમની પેમેન્ટ સ્થિતિ" : "Latest customer transactions and payment tracking"}
            </p>
          </div>
          <Link
            href="/sales/invoices"
            className="text-xs font-bold text-[#F47721] hover:text-[#D95F12] flex items-center gap-1 hover:underline shrink-0"
          >
            <span>{lang === "gu" ? "બધા બિલ જુઓ" : "View All Invoices"}</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Content Body: Loading, Empty State, or Desktop Table + Mobile Cards */}
        {isLoading ? (
          <div className="p-8 text-center text-[#667085]">
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-[#F47721] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">
                {lang === "gu" ? "માહિતી લોડ થઈ રહી છે..." : "Loading dashboard data..."}
              </span>
            </div>
          </div>
        ) : recentInvoices.length === 0 ? (
          /* Proper Responsive Empty State decoupled from 7-column table */
          <div className="p-8 sm:p-12 text-center">
            <div className="max-w-sm mx-auto space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#FFF3E8] text-[#F47721] flex items-center justify-center mx-auto font-bold text-xl shadow-inner">
                ₹
              </div>
              <p className="text-base font-bold text-[#202124]">
                {lang === "gu" ? "હજુ સુધી કોઈ બિલ બનેલ નથી" : "No invoices issued yet"}
              </p>
              <p className="text-xs sm:text-sm text-[#667085] leading-relaxed">
                {lang === "gu"
                  ? "તમારા ગ્રાહક માટે પહેલું બિલ બનાવવા નીચેના બટન પર ક્લિક કરો."
                  : "Click below to generate your first invoice in seconds and track payments."}
              </p>
              <div className="pt-2">
                <Link
                  href="/sales/invoices/new"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#F47721] hover:bg-[#D95F12] text-white rounded-button text-xs sm:text-sm font-bold shadow-saffron transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>{lang === "gu" ? "પહેલું બિલ બનાવો" : "Create First Bill"}</span>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= md: 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F9FB] text-[#667085] uppercase tracking-wider font-semibold border-b border-[#E5E7EB]">
                  <tr>
                    <th className="px-4 py-3">{lang === "gu" ? "બિલ નંબર" : "Invoice No"}</th>
                    <th className="px-4 py-3">{lang === "gu" ? "તારીખ" : "Date"}</th>
                    <th className="px-4 py-3">{lang === "gu" ? "ગ્રાહકનું નામ" : "Customer Name"}</th>
                    <th className="px-4 py-3 text-right">{lang === "gu" ? "કુલ રકમ" : "Grand Total"}</th>
                    <th className="px-4 py-3 text-right">{lang === "gu" ? "બાકી રકમ" : "Due Balance"}</th>
                    <th className="px-4 py-3 text-center">{lang === "gu" ? "સ્થિતિ" : "Status"}</th>
                    <th className="px-4 py-3 text-center">{lang === "gu" ? "ક્રિયા" : "Action"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-[#FFFAF5] transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-[#202124]">
                        <Link href={`/sales/invoices/${inv.id}`} className="hover:text-[#F47721]">
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[#667085]">
                        {new Date(inv.invoiceDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#202124]">
                        {inv.partyName || (lang === "gu" ? "રોકડા ગ્રાહક (Walk-in)" : "Walk-in Customer")}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-[#202124]">
                        {formatInr(inv.grandTotal)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {inv.outstandingBalance > 0 ? (
                          <span className="text-[#DC3545]">{formatInr(inv.outstandingBalance)} Dr</span>
                        ) : (
                          <span className="text-[#16834A]">₹0.00</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/sales/invoices/${inv.id}`}
                          className="p-1.5 text-[#667085] hover:text-[#F47721] hover:bg-[#FFF3E8] rounded-md transition-colors inline-block"
                          title="View & Print"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List (< md: 768px) */}
            <div className="block md:hidden divide-y divide-[#E5E7EB]">
              {recentInvoices.map((inv) => (
                <div key={inv.id} className="p-3.5 hover:bg-[#FFFAF5] transition-colors space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/sales/invoices/${inv.id}`}
                      className="font-mono font-bold text-sm text-[#202124] hover:text-[#F47721] truncate"
                    >
                      {inv.invoiceNumber}
                    </Link>
                    <StatusBadge status={inv.status} />
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#667085]">
                    <span className="font-medium text-[#344054] truncate max-w-[180px]">
                      {inv.partyName || (lang === "gu" ? "રોકડા ગ્રાહક (Walk-in)" : "Walk-in Customer")}
                    </span>
                    <span className="shrink-0">
                      {new Date(inv.invoiceDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#F3F4F6] text-xs">
                    <div>
                      <span className="text-[#667085]">{lang === "gu" ? "કુલ: " : "Total: "}</span>
                      <span className="font-mono font-bold text-[#202124]">{formatInr(inv.grandTotal)}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div>
                        {inv.outstandingBalance > 0 ? (
                          <span className="font-mono font-semibold text-[#DC3545]">
                            {formatInr(inv.outstandingBalance)} Dr
                          </span>
                        ) : (
                          <span className="font-mono font-semibold text-[#16834A]">₹0.00 Due</span>
                        )}
                      </div>
                      <Link
                        href={`/sales/invoices/${inv.id}`}
                        className="p-1 text-[#F47721] hover:bg-[#FFF3E8] rounded transition-colors"
                        title="View Invoice"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
