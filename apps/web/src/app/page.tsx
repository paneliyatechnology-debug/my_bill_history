"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useAuth } from "../context/auth-context";
import { apiClient, extractList } from "../lib/api-client";
import { GreetingBanner, DateRangeState, formatDateToLocalYmd } from "../components/dashboard/greeting-banner";
import { FinancialSummaryCards } from "../components/dashboard/financial-summary-cards";
import { StatMetricCards } from "../components/dashboard/stat-metric-cards";
import { QuickActionsBar } from "../components/dashboard/quick-actions-bar";
import { SalesVsPurchaseChart, DailyChartPoint } from "../components/dashboard/sales-vs-purchase-chart";
import { TopCustomersCard } from "../components/dashboard/top-customers-card";
import { StockMovementCard, StockMovementItem } from "../components/dashboard/stock-movement-card";
import { UpcomingActivitiesCard } from "../components/dashboard/upcoming-activities-card";
import { StatusBadge } from "../components/ui/badge";
import { IntroductionPage } from "../components/landing/introduction-page";

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  partyName?: string;
  grandTotal: number;
  outstandingBalance: number;
  status: string;
}

function DashboardContent() {
  const { lang, tenantContext, currentFY } = useAuth();

  // Date range state for dashboard filtering (defaults to Today in local time)
  const [dateRange, setDateRange] = useState<DateRangeState>(() => {
    const todayStr = formatDateToLocalYmd(new Date());
    return {
      startDate: todayStr,
      endDate: todayStr,
      label: "Today",
    };
  });

  const dateRangeRef = useRef<DateRangeState>(dateRange);
  dateRangeRef.current = dateRange;

  const [metrics, setMetrics] = useState({
    totalSales: 0,
    totalInvoices: 0,
    totalOutstanding: 0,
    totalInventoryValue: 0,
  });

  const [recentInvoices, setRecentInvoices] = useState<InvoiceItem[]>([]);
  const [purchasesTotal, setPurchasesTotal] = useState<number>(0);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [stockMovements, setStockMovements] = useState<StockMovementItem[]>([]);
  const [chartDailyData, setChartDailyData] = useState<DailyChartPoint[]>([]);
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async (customRange?: DateRangeState) => {
    setIsLoading(true);
    const activeRange = customRange || dateRangeRef.current;
    const fromDate = activeRange.startDate || undefined;
    const toDate = activeRange.endDate || undefined;

    try {
      // 7-day window for the Sales vs Purchase chart (ending on toDate or today)
      const chartEndDate = toDate ? new Date(toDate) : new Date();
      const chartStartDate = new Date(chartEndDate);
      chartStartDate.setDate(chartEndDate.getDate() - 6);
      const chartStartIso = formatDateToLocalYmd(chartStartDate);
      const chartEndIso = formatDateToLocalYmd(chartEndDate);

      const [salesRes, finRes, stockRes, invListRes, purchRes, movRes, chartSalesRes, chartPurchRes]: any =
        await Promise.all([
          apiClient.get("/reports/sales-register", { fromDate, toDate }).catch(() => null),
          apiClient.get("/reports/financial-summary", toDate ? { asOfDate: toDate } : undefined).catch(() => null),
          apiClient.get("/reports/stock-summary", toDate ? { asOfDate: toDate } : undefined).catch(() => null),
          apiClient.get("/invoices", { startDate: fromDate, endDate: toDate, limit: 10 }).catch(() => null),
          apiClient.get("/purchases", { startDate: fromDate, endDate: toDate, limit: 10 }).catch(() => null),
          apiClient.get("/invoices/stock/transactions", { startDate: fromDate, endDate: toDate, limit: 6 }).catch(() => null),
          apiClient.get("/invoices", { startDate: chartStartIso, endDate: chartEndIso, limit: 200 }).catch(() => null),
          apiClient.get("/purchases", { startDate: chartStartIso, endDate: chartEndIso, limit: 200 }).catch(() => null),
        ]);

      // Metrics calculation
      const totalSales = Number(
        salesRes?.summary?.totalGrandTotal ?? salesRes?.totalSales ?? 0
      );
      const totalInvoices = Number(
        salesRes?.summary?.totalInvoices ?? salesRes?.invoices?.length ?? 0
      );
      const isAllTime = !fromDate && !toDate;
      const periodBalance = Number(salesRes?.summary?.totalBalance ?? 0);
      const liveLedgerReceivables = Number(finRes?.toCollect ?? 0);
      const totalOutstanding = isAllTime ? liveLedgerReceivables : periodBalance;

      const stockItems = stockRes?.items || (Array.isArray(stockRes) ? stockRes : []);
      const totalInventoryValue = Number(
        stockRes?.totals?.grandStockValuation ??
        stockRes?.totals?.totalValuation ??
        (stockItems.length > 0
          ? stockItems.reduce(
              (sum: number, it: any) => sum + (Number(it.totalValuation || it.closingValue) || 0),
              0
            )
          : 0)
      );

      // Low stock count dynamically computed from stock items
      const calculatedLowCount = stockItems.filter((it: any) => {
        if (it.isLowStock !== undefined) return Boolean(it.isLowStock);
        const min = Number(it.minStockLevel || 0);
        const current = Number(it.currentStockQuantity ?? it.closingQty ?? 0);
        return min > 0 ? current <= min : current <= 0;
      }).length;

      // Purchases total
      const rawPurchases = extractList(purchRes);
      const pTotal = rawPurchases.reduce(
        (sum: number, p: any) => sum + Number(p.grandTotal || p.totalAmount || 0),
        0
      );

      // Recent invoices (100% dynamic from database - zero fallback arrays)
      const rawInvs = (salesRes?.items && Array.isArray(salesRes.items))
        ? salesRes.items
        : extractList(invListRes);

      const formattedInvoices: InvoiceItem[] = rawInvs.map((it: any) => ({
        id: it.id,
        invoiceNumber: it.invoiceNumber,
        invoiceDate: it.invoiceDate,
        partyName: it.party?.name || (it.partyName ? it.partyName : undefined),
        grandTotal: Number(it.grandTotal || 0),
        outstandingBalance: Number(it.balanceAmount ?? it.outstandingBalance ?? 0),
        status: it.status,
      }));

      // Stock movements (100% dynamic)
      const rawMovs = extractList(movRes);
      const formattedMovements: StockMovementItem[] = rawMovs.map((m: any) => {
        const qty = Number(m.quantity || 0);
        const isPositive = qty >= 0;
        return {
          id: m.id,
          type: isPositive ? "IN" : "OUT",
          title: isPositive ? "Stock In - Purchase Bill" : "Stock Out - Sale Invoice",
          dateStr: new Date(m.transactionDate || m.createdAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          refNo: m.referenceDocNumber || m.referenceDocType || "—",
          quantityStr: `${isPositive ? "+" : ""}${Math.abs(qty)} Pcs`,
          itemName: m.item?.name || m.itemName || "Item",
        };
      });

      // Daily 7-day breakdown for Sales vs Purchase chart (100% dynamic from database)
      const chartInvs = extractList(chartSalesRes);
      const chartPurchs = extractList(chartPurchRes);
      const daysPoints: DailyChartPoint[] = [];

      for (let i = 6; i >= 0; i--) {
        const dayDate = new Date(chartEndDate);
        dayDate.setDate(chartEndDate.getDate() - i);
        const dayIso = formatDateToLocalYmd(dayDate);
        const label = dayDate.toLocaleDateString(lang === "gu" ? "gu-IN" : "en-IN", {
          day: "2-digit",
          month: "short",
        });

        const daySales = chartInvs
          .filter((inv: any) => (inv.invoiceDate || "").startsWith(dayIso))
          .reduce((sum: number, inv: any) => sum + Number(inv.grandTotal || 0), 0);

        const dayPurchases = chartPurchs
          .filter((p: any) => (p.billDate || p.createdAt || "").startsWith(dayIso))
          .reduce((sum: number, p: any) => sum + Number(p.grandTotal || p.totalAmount || 0), 0);

        daysPoints.push({
          date: dayIso,
          label,
          sales: Math.round(daySales),
          purchase: Math.round(dayPurchases),
        });
      }

      setMetrics({
        totalSales,
        totalInvoices,
        totalOutstanding,
        totalInventoryValue,
      });
      setLowStockCount(calculatedLowCount);
      setPurchasesTotal(pTotal);
      setRecentInvoices(formattedInvoices);
      setStockMovements(formattedMovements);
      setChartDailyData(daysPoints);
      setPendingOrdersCount(rawPurchases.filter((p: any) => p.status === "PENDING" || p.status === "DRAFT").length);
    } catch (err) {
      console.error("[Dashboard] Error loading dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [tenantContext.companyId, tenantContext.branchId, currentFY?.id, lang]);

  const handleDateRangeChange = (newRange: DateRangeState) => {
    dateRangeRef.current = newRange;
    setDateRange(newRange);
    fetchDashboardData(newRange);
  };

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchDashboardData();
    }

    const handleRefresh = () => {
      fetchDashboardData();
    };

    window.addEventListener("billing_company_switched", handleRefresh);
    window.addEventListener("billing_branch_switched", handleRefresh);
    window.addEventListener("billing_fy_switched", handleRefresh);
    window.addEventListener("billing_transaction_posted", handleRefresh);
    window.addEventListener("billing_invoice_created", handleRefresh);
    window.addEventListener("billing_payment_posted", handleRefresh);
    window.addEventListener("focus", handleRefresh);

    return () => {
      window.removeEventListener("billing_company_switched", handleRefresh);
      window.removeEventListener("billing_branch_switched", handleRefresh);
      window.removeEventListener("billing_fy_switched", handleRefresh);
      window.removeEventListener("billing_transaction_posted", handleRefresh);
      window.removeEventListener("billing_invoice_created", handleRefresh);
      window.removeEventListener("billing_payment_posted", handleRefresh);
      window.removeEventListener("focus", handleRefresh);
    };
  }, [tenantContext.companyId, tenantContext.branchId, currentFY?.id, fetchDashboardData]);

  // Derived overdue statistics for activities
  const overdueStats = useMemo(() => {
    const overdueInvs = recentInvoices.filter((it) => it.outstandingBalance > 0);
    const sum = overdueInvs.reduce((acc, it) => acc + it.outstandingBalance, 0);
    return {
      count: overdueInvs.length,
      amount: sum,
    };
  }, [recentInvoices]);

  const formatInr = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  return (
    <div className="space-y-3.5 sm:space-y-5 lg:space-y-6">
      {/* 1. TOP GREETING & BUSINESS GLANCE BANNER WITH INTERACTIVE DATE FILTER */}
      <GreetingBanner
        startDate={dateRange.startDate}
        endDate={dateRange.endDate}
        selectedLabel={dateRange.label}
        onDateRangeChange={handleDateRangeChange}
      />

      {/* 2. THREE HERO FINANCIAL SUMMARY CARDS (Customer Receivables, Supplier Payables, Cash & Bank) */}
      <FinancialSummaryCards asOfDate={dateRange.endDate} />

      {/* 3. FOUR METRIC STAT CARDS (Total Sales, Receivables, Stock Valuation, Low Stock Alert) */}
      <StatMetricCards
        totalSales={metrics.totalSales}
        totalInvoices={metrics.totalInvoices}
        totalReceivables={metrics.totalOutstanding}
        stockValuation={metrics.totalInventoryValue}
        lowStockCount={lowStockCount}
        isLoading={isLoading}
      />

      {/* 4. QUICK ACTIONS STRIP (6 Daily Shortcuts) */}
      <QuickActionsBar />

      {/* 5. MAIN 2-COLUMN GRID (Left ~68% / Right ~32%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-5 min-w-0">
        {/* LEFT COLUMN (lg:col-span-8): Recent Invoices + Stock Movement + Upcoming Activities */}
        <div className="lg:col-span-8 space-y-3.5 sm:space-y-5 min-w-0">
          {/* Recent Sales Invoices Card */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-xs overflow-hidden min-w-0">
            {/* Header */}
            <div className="p-3.5 sm:p-5 border-b border-[#F1F5F9] flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#111827]">
                    {lang === "gu" ? "તાજેતરના વેચાણ બિલ" : "Recent Sales Invoices"}
                  </h2>
                  <p className="text-[11px] text-[#6B7280]">
                    {lang === "gu" ? "આ સમયગાળાના બિલ અને તેમની પેમેન્ટ સ્થિતિ" : "Customer transactions and payment tracking"}
                  </p>
                </div>
              </div>

              <Link
                href="/sales/invoices"
                className="text-xs font-semibold text-[#F47721] hover:text-[#D95F12] flex items-center gap-1 hover:underline shrink-0"
              >
                <span>{lang === "gu" ? "બધા બિલ જુઓ" : "View All Invoices"}</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[#64748B] uppercase tracking-wider font-bold border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-4 py-3">{lang === "gu" ? "બિલ નંબર" : "INVOICE NO"}</th>
                    <th className="px-4 py-3">{lang === "gu" ? "તારીખ" : "DATE"}</th>
                    <th className="px-4 py-3">{lang === "gu" ? "ગ્રાહકનું નામ" : "CUSTOMER NAME"}</th>
                    <th className="px-4 py-3 text-right">{lang === "gu" ? "કુલ રકમ" : "GRAND TOTAL"}</th>
                    <th className="px-4 py-3 text-right">{lang === "gu" ? "બાકી રકમ" : "DUE BALANCE"}</th>
                    <th className="px-4 py-3 text-center">{lang === "gu" ? "સ્થિતિ" : "STATUS"}</th>
                    <th className="px-4 py-3 text-center">{lang === "gu" ? "ક્રિયા" : "ACTION"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        {lang === "gu" ? "બિલ લોડ થઈ રહ્યા છે..." : "Loading invoices..."}
                      </td>
                    </tr>
                  ) : recentInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        {lang === "gu"
                          ? "આ સમયગાળા માટે કોઈ વેચાણ બિલ નોંધાયેલ નથી."
                          : "No sales invoices recorded for this period."}
                      </td>
                    </tr>
                  ) : (
                    recentInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-[#111827]">
                          <Link href={`/sales/invoices/${inv.id}`} className="hover:text-[#F47721]">
                            {inv.invoiceNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-[#4B5563]">
                          {new Date(inv.invoiceDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3 font-medium text-[#111827]">
                          {inv.partyName || (lang === "gu" ? "રોકડા ગ્રાહક (Walk-in)" : "Walk-in Retail Cash Customer")}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-[#111827]">
                          {formatInr(inv.grandTotal)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">
                          {inv.outstandingBalance > 0 ? (
                            <span className="text-[#DC2626] font-bold">
                              {formatInr(inv.outstandingBalance)} Dr
                            </span>
                          ) : (
                            <span className="text-[#16A34A]">₹0.00</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={inv.status} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Link
                              href={`/sales/invoices/${inv.id}`}
                              className="p-1.5 text-[#64748B] hover:text-[#F47721] hover:bg-[#FFF3E8] rounded-lg transition-colors inline-block"
                              title="View Invoice"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List (< md) */}
            <div className="block md:hidden divide-y divide-[#F1F5F9]">
              {isLoading ? (
                <div className="p-4 text-center text-slate-400 text-xs">
                  {lang === "gu" ? "બિલ લોડ થઈ રહ્યા છે..." : "Loading invoices..."}
                </div>
              ) : recentInvoices.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  {lang === "gu"
                    ? "આ સમયગાળા માટે કોઈ વેચાણ બિલ નોંધાયેલ નથી."
                    : "No sales invoices recorded for this period."}
                </div>
              ) : (
                recentInvoices.map((inv) => (
                  <div key={inv.id} className="p-3 sm:p-3.5 hover:bg-slate-50/60 transition-colors space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/sales/invoices/${inv.id}`}
                        className="font-mono font-bold text-xs sm:text-sm text-[#111827] hover:text-[#F47721] truncate"
                      >
                        {inv.invoiceNumber}
                      </Link>
                      <StatusBadge status={inv.status} />
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#6B7280]">
                      <span className="font-medium text-[#374151] truncate max-w-[160px] sm:max-w-[220px]">
                        {inv.partyName || (lang === "gu" ? "રોકડા ગ્રાહક (Walk-in)" : "Walk-in Retail Cash Customer")}
                      </span>
                      <span className="shrink-0 text-[11px] sm:text-xs">
                        {new Date(inv.invoiceDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-[#F1F5F9] text-xs">
                      <div>
                        <span className="text-[#6B7280]">{lang === "gu" ? "કુલ: " : "Total: "}</span>
                        <span className="font-mono font-bold text-xs sm:text-sm text-[#111827]">{formatInr(inv.grandTotal)}</span>
                      </div>

                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div>
                          {inv.outstandingBalance > 0 ? (
                            <span className="font-mono font-semibold text-xs text-[#DC2626]">
                              {formatInr(inv.outstandingBalance)} Dr
                            </span>
                          ) : (
                            <span className="font-mono font-semibold text-xs text-[#16A34A]">₹0.00</span>
                          )}
                        </div>
                        <Link
                          href={`/sales/invoices/${inv.id}`}
                          className="p-1 text-[#F47721] hover:bg-[#FFF3E8] rounded transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bottom Row: Stock Movement & Upcoming Activities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-5 min-w-0">
            <StockMovementCard movements={stockMovements} isLoading={isLoading} />
            <UpcomingActivitiesCard
              lowStockCount={lowStockCount}
              overdueInvoicesCount={overdueStats.count}
              overdueAmount={overdueStats.amount}
              pendingOrdersCount={pendingOrdersCount}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* RIGHT COLUMN (lg:col-span-4): Sales vs Purchase + Top 5 Customers */}
        <div className="lg:col-span-4 space-y-3.5 sm:space-y-5 min-w-0">
          <SalesVsPurchaseChart
            salesTotal={metrics.totalSales}
            purchasesTotal={purchasesTotal}
            dailyData={chartDailyData}
            isLoading={isLoading}
          />
          <TopCustomersCard recentInvoices={recentInvoices} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const { isAuthenticated, isLoading, lang } = useAuth();
  const [showTimeoutFallback, setShowTimeoutFallback] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isLoading) {
      timer = setTimeout(() => {
        setShowTimeoutFallback(true);
      }, 3000);
    } else {
      setShowTimeoutFallback(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLoading]);

  // Initial authentication hydration
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#FAFBFD] p-4 text-center">
        <div className="flex flex-col items-center gap-3 max-w-sm">
          <div className="w-9 h-9 border-3 border-[#F47721] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-[#667085] tracking-tight">Loading MyBill History...</span>
          {showTimeoutFallback && (
            <div className="mt-4 p-4 bg-white rounded-xl border border-border shadow-xs">
              <p className="text-xs text-[#475467] mb-3">
                {lang === "gu"
                  ? "લોડિંગ સામાન્ય કરતાં વધુ સમય લઈ રહ્યું છે."
                  : "Loading is taking longer than expected."}
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => window.location.reload()}
                  className="px-3 py-1.5 text-xs font-semibold bg-[#F47721] text-white rounded-lg hover:bg-[#D95F12] transition-colors"
                >
                  {lang === "gu" ? "રીફ્રેશ કરો" : "Reload"}
                </button>
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-xs font-semibold border border-border text-[#344054] rounded-lg hover:bg-slate-50 transition-colors"
                >
                  {lang === "gu" ? "લોગિન કરો" : "Go to Login"}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // If visitor is unauthenticated, show the rich introduction / landing page
  if (!isAuthenticated) {
    return <IntroductionPage />;
  }

  // If authenticated, render standard business operational dashboard
  return <DashboardContent />;
}

