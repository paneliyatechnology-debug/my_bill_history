"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "../context/auth-context";
import { apiClient, extractList } from "../lib/api-client";
import { StatCard } from "../components/ui/stat-card";
import { StatusBadge } from "../components/ui/badge";
import { BillScannerModal } from "./purchases/components/bill-scanner-modal";

interface DashboardTransaction {
  id: string;
  date: string;
  rawDate: Date;
  type: string;
  txnNo: string;
  partyName: string;
  amount: number;
  url: string;
}

interface DaySalesData {
  day: string;
  fullDate: string;
  displayDate: string;
  sales: number;
  invoices: number;
}

export default function DashboardPage() {
  const { lang, tenantContext } = useAuth();

  const [metrics, setMetrics] = useState({
    totalSales: 0,
    totalInvoices: 0,
    totalOutstanding: 0,
    totalInventoryValue: 0,
  });

  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [latestTransactions, setLatestTransactions] = useState<DashboardTransaction[]>([]);
  const [allSalesInvoices, setAllSalesInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state for Sales Report (Daily, Weekly, Monthly)
  const [reportPeriod, setReportPeriod] = useState<"daily" | "weekly" | "monthly">("daily");

  // Chart tooltip state
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // Bill Scanner Modal state & support data
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [partiesList, setPartiesList] = useState<any[]>([]);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [warehousesList, setWarehousesList] = useState<any[]>([]);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        salesRes,
        outRes,
        stockRes,
        invListRes,
        itemsRes,
        partiesRes,
        warehousesRes,
        purchasesRes,
      ]: any = await Promise.all([
        apiClient.get("/reports/sales-register").catch(() => null),
        apiClient.get("/reports/outstanding-balances").catch(() => null),
        apiClient.get("/reports/stock-summary").catch(() => null),
        apiClient.get("/invoices", { limit: 20 }).catch(() => null),
        apiClient.get("/items").catch(() => null),
        apiClient.get("/parties").catch(() => null),
        apiClient.get("/tenants/warehouses").catch(() => null),
        apiClient.get("/purchases", { limit: 10 }).catch(() => null),
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

      // Store support lists for OCR scanner
      setPartiesList(extractList(partiesRes));
      setItemsList(allItems);
      setWarehousesList(extractList(warehousesRes));

      // Build Latest Transactions list
      const salesInvs = extractList(invListRes);
      setAllSalesInvoices(salesInvs);

      const purchaseInvs = extractList(purchasesRes);

      const transactions: DashboardTransaction[] = [
        ...salesInvs.map((inv: any) => ({
          id: inv.id,
          date: new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          rawDate: new Date(inv.invoiceDate || inv.createdAt),
          type: "Sales Invoices",
          txnNo: inv.invoiceNumber || "1",
          partyName:
            inv.party?.name ||
            inv.partyName ||
            (lang === "gu" ? "રોકડ ગ્રાહક (Walk-in)" : "Walk-in Customer"),
          amount: Number(inv.grandTotal || 0),
          url: `/sales/invoices/${inv.id}`,
        })),
        ...purchaseInvs.map((pur: any) => ({
          id: pur.id,
          date: new Date(pur.invoiceDate || pur.createdAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          rawDate: new Date(pur.invoiceDate || pur.createdAt),
          type: "Purchase Invoices",
          txnNo: pur.vendorInvoiceNumber || "1",
          partyName:
            pur.party?.name ||
            pur.partyName ||
            (lang === "gu" ? "વેપારી" : "Supplier"),
          amount: Number(pur.grandTotal || 0),
          url: `/purchases`,
        })),
      ].sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());

      setLatestTransactions(transactions.slice(0, 5));
    } catch {
      // Graceful fallback on network glitch
    } finally {
      setIsLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchDashboardData();
    }

    const handleSwitch = () => {
      fetchDashboardData();
    };

    window.addEventListener("billing_company_switched", handleSwitch);
    return () => {
      window.removeEventListener("billing_company_switched", handleSwitch);
    };
  }, [tenantContext.companyId, fetchDashboardData]);

  const formatInr = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  // -------------------------------------------------------------
  // Calculate Last 7 Days Sales Data & Date Range for the Report
  // -------------------------------------------------------------
  const { salesReportData, dateRangeString, last7DaysSales, last7DaysInvoicesCount } =
    useMemo(() => {
      const days: DaySalesData[] = [];
      const today = new Date();

      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const fullDate = `${yyyy}-${mm}-${dd}`;

        const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
        const displayDate = d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

        days.push({
          day: dayName,
          fullDate,
          displayDate,
          sales: 0,
          invoices: 0,
        });
      }

      // Match invoices with the 7 days
      allSalesInvoices.forEach((inv: any) => {
        const invDateObj = new Date(inv.invoiceDate || inv.createdAt);
        const yyyy = invDateObj.getFullYear();
        const mm = String(invDateObj.getMonth() + 1).padStart(2, "0");
        const dd = String(invDateObj.getDate()).padStart(2, "0");
        const invDateStr = `${yyyy}-${mm}-${dd}`;

        const matchedDay = days.find((d) => d.fullDate === invDateStr);
        if (matchedDay) {
          matchedDay.sales += Number(inv.grandTotal || 0);
          matchedDay.invoices += 1;
        }
      });

      const total7DaysSales = days.reduce((sum, d) => sum + d.sales, 0);
      const total7DaysInvoices = days.reduce((sum, d) => sum + d.invoices, 0);

      const firstDateStr = days[0]?.displayDate || "";
      const lastDateStr = days[days.length - 1]?.displayDate || "";
      const rangeStr = `${firstDateStr} to ${lastDateStr}`;

      return {
        salesReportData: days,
        dateRangeString: rangeStr,
        last7DaysSales: total7DaysSales,
        last7DaysInvoicesCount: total7DaysInvoices,
      };
    }, [allSalesInvoices]);

  // -------------------------------------------------------------
  // Responsive SVG Line Chart Parameters
  // -------------------------------------------------------------
  const chartConfig = useMemo(() => {
    const width = 540;
    const height = 210;
    const paddingLeft = 58;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    const maxSales = Math.max(...salesReportData.map((d) => d.sales), 0);

    // If all values are 0 (like in the reference screenshot)
    // Ticks: 1, 0.8, 0.6, 0.4, 0.2, 0, -0.2, -0.4, -0.6, -0.8, -1
    if (maxSales === 0) {
      const zeroTicks = [1, 0.8, 0.6, 0.4, 0.2, 0, -0.2, -0.4, -0.6, -0.8, -1];
      const yZero = paddingTop + plotHeight / 2;

      const points = salesReportData.map((d, index) => {
        const x = paddingLeft + (index * plotWidth) / (salesReportData.length - 1);
        const y = yZero;
        return { x, y, ...d };
      });

      const pathD = points
        .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
        .join(" ");

      return {
        width,
        height,
        paddingLeft,
        paddingRight,
        paddingTop,
        paddingBottom,
        plotWidth,
        plotHeight,
        ticks: zeroTicks.map((val, idx) => ({
          label: `₹ ${val}`,
          y: paddingTop + (idx * plotHeight) / (zeroTicks.length - 1),
        })),
        points,
        pathD,
      };
    }

    // Dynamic positive scale if sales exist
    const niceMax = Math.ceil(maxSales * 1.25);
    const tickValues = [
      niceMax,
      Math.round(niceMax * 0.75),
      Math.round(niceMax * 0.5),
      Math.round(niceMax * 0.25),
      0,
    ];

    const points = salesReportData.map((d, index) => {
      const x = paddingLeft + (index * plotWidth) / (salesReportData.length - 1);
      const ratio = d.sales / niceMax;
      const y = paddingTop + plotHeight - ratio * plotHeight;
      return { x, y, ...d };
    });

    const pathD = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");

    return {
      width,
      height,
      paddingLeft,
      paddingRight,
      paddingTop,
      paddingBottom,
      plotWidth,
      plotHeight,
      ticks: tickValues.map((val) => ({
        label: `₹ ${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`,
        y: paddingTop + plotHeight - (val / niceMax) * plotHeight,
      })),
      points,
      pathD,
    };
  }, [salesReportData]);

  return (
    <div className="space-y-6">
      {/* 1. TOP PROMINENT ACTION BANNER */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-border shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4 min-w-0">
        <div className="space-y-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-[#202124] tracking-tight truncate">
            {lang === "gu"
              ? "વેપાર ડેશબોર્ડ (Business Overview)"
              : "Business Dashboard"}
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] break-words">
            {lang === "gu"
              ? "આજના બિલ, ઉઘરાણી બાકી અને વેચાણ રિપોર્ટ એક જ નજરે જુઓ."
              : "Real-time summary of sales, customer dues, and transactions overview."}
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

      {/* 3. TWO-COLUMN OPERATIONAL DASHBOARD LAYOUT (MATCHING REFERENCE UI) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT COLUMN: Latest Transactions & Sales Report (lg:col-span-2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* CARD A: LATEST TRANSACTIONS */}
          <div className="bg-white rounded-card border border-[#E5E7EB] shadow-card overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#E5E7EB] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#202124]">
                {lang === "gu" ? "છેલ્લા વ્યવહારો (Latest Transactions)" : "Latest Transactions"}
              </h3>
            </div>

            {/* Desktop & Mobile Table View */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FBFBFB] text-[#667085] uppercase tracking-wider font-semibold border-b border-[#E5E7EB]">
                  <tr>
                    <th className="px-4 py-3">{lang === "gu" ? "તારીખ" : "DATE"}</th>
                    <th className="px-4 py-3">{lang === "gu" ? "પ્રકાર" : "TYPE"}</th>
                    <th className="px-4 py-3">{lang === "gu" ? "નંબર" : "TXN NO"}</th>
                    <th className="px-4 py-3">{lang === "gu" ? "પાર્ટી નામ" : "PARTY NAME"}</th>
                    <th className="px-4 py-3">{lang === "gu" ? "રકમ" : "AMOUNT"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-[#667085]">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-[#F47721] border-t-transparent rounded-full animate-spin" />
                          <span>Loading transactions...</span>
                        </div>
                      </td>
                    </tr>
                  ) : latestTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-[#667085]">
                        {lang === "gu" ? "હજુ સુધી કોઈ વ્યવહાર થયેલ નથી." : "No transactions recorded yet."}
                      </td>
                    </tr>
                  ) : (
                    latestTransactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-[#FFFAF5] transition-colors">
                        <td className="px-4 py-3.5 text-[#344054] whitespace-nowrap">
                          {txn.date}
                        </td>
                        <td className="px-4 py-3.5 text-[#344054] whitespace-nowrap">
                          {txn.type}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-[#202124] whitespace-nowrap">
                          <Link href={txn.url} className="hover:text-[#F47721] hover:underline">
                            {txn.txnNo}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 font-medium text-[#202124] uppercase truncate max-w-[200px]">
                          {txn.partyName}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-[#202124] whitespace-nowrap">
                          ₹ {txn.amount.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Link: See All Transactions */}
            <div className="p-3 border-t border-[#E5E7EB] text-center bg-white">
              <Link
                href="/sales/invoices"
                className="text-xs sm:text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8] hover:underline transition-colors inline-flex items-center gap-1"
              >
                <span>{lang === "gu" ? "બધા વ્યવહારો જુઓ" : "See All Transactions"}</span>
              </Link>
            </div>
          </div>

          {/* CARD B: SALES REPORT */}
          <div className="bg-white rounded-card border border-[#E5E7EB] shadow-card overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-bold text-sm sm:text-base text-[#202124]">
                Sales Report - {dateRangeString}
              </h3>

              <div className="flex items-center gap-2">
                <div className="relative inline-block text-left">
                  <select
                    value={reportPeriod}
                    onChange={(e: any) => setReportPeriod(e.target.value)}
                    className="block appearance-none bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] px-3 py-1.5 pr-8 rounded-lg text-xs font-semibold text-[#374151] shadow-xs focus:outline-none focus:ring-1 focus:ring-[#F47721] cursor-pointer"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#667085]">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart + 7 Days Metric Overview */}
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
              {/* Interactive Vector Line Chart (md:col-span-3) */}
              <div className="md:col-span-3 relative w-full overflow-hidden">
                <svg
                  viewBox={`0 0 ${chartConfig.width} ${chartConfig.height}`}
                  className="w-full h-auto overflow-visible select-none"
                >
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22C55E" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#22C55E" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Gridlines and Y-Axis Labels */}
                  {chartConfig.ticks.map((tick, idx) => (
                    <g key={`y-tick-${idx}`}>
                      <line
                        x1={chartConfig.paddingLeft}
                        y1={tick.y}
                        x2={chartConfig.width - chartConfig.paddingRight}
                        y2={tick.y}
                        stroke="#F1F3F5"
                        strokeWidth="1"
                      />
                      <text
                        x={chartConfig.paddingLeft - 8}
                        y={tick.y + 3.5}
                        textAnchor="end"
                        fontSize="10"
                        fill="#868E96"
                        fontFamily="inherit"
                      >
                        {tick.label}
                      </text>
                    </g>
                  ))}

                  {/* Vertical Day Lines & X-Axis Day Labels */}
                  {chartConfig.points.map((p, idx) => (
                    <g key={`x-tick-${idx}`}>
                      <line
                        x1={p.x}
                        y1={chartConfig.paddingTop}
                        x2={p.x}
                        y2={chartConfig.height - chartConfig.paddingBottom}
                        stroke="#F8F9FA"
                        strokeWidth="1"
                      />
                      <text
                        x={p.x}
                        y={chartConfig.height - 10}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="500"
                        fill="#6B7280"
                      >
                        {p.day}
                      </text>
                    </g>
                  ))}

                  {/* Green Trend Line */}
                  <path
                    d={chartConfig.pathD}
                    fill="none"
                    stroke="#22C55E"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Data Points with Hover Interaction */}
                  {chartConfig.points.map((p, idx) => (
                    <g
                      key={`point-${idx}`}
                      className="cursor-pointer group"
                      onMouseEnter={() => setHoveredPointIndex(idx)}
                      onMouseLeave={() => setHoveredPointIndex(null)}
                    >
                      {/* Invisible wider hit target */}
                      <circle cx={p.x} cy={p.y} r="14" fill="transparent" />

                      {/* Visible dot */}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={hoveredPointIndex === idx ? 5 : 3.5}
                        fill="#FFFFFF"
                        stroke="#22C55E"
                        strokeWidth={hoveredPointIndex === idx ? 2.5 : 2}
                        className="transition-all duration-150"
                      />
                    </g>
                  ))}
                </svg>

                {/* Floating Tooltip when hovering over a chart point */}
                {hoveredPointIndex !== null && chartConfig.points[hoveredPointIndex] && (
                  <div
                    className="absolute bg-[#1F2937] text-white px-2.5 py-1.5 rounded-md text-[11px] shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 z-10 whitespace-nowrap"
                    style={{
                      left: `${(chartConfig.points[hoveredPointIndex].x / chartConfig.width) * 100}%`,
                      top: `${(chartConfig.points[hoveredPointIndex].y / chartConfig.height) * 100}%`,
                    }}
                  >
                    <div className="font-semibold">{chartConfig.points[hoveredPointIndex].displayDate}</div>
                    <div className="text-[#86EFAC]">
                      Sales: ₹ {chartConfig.points[hoveredPointIndex].sales.toLocaleString("en-IN")}
                    </div>
                    <div className="text-gray-300">
                      Invoices: {chartConfig.points[hoveredPointIndex].invoices}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side 7-day Summary Metrics */}
              <div className="space-y-6 md:border-l md:border-[#F1F3F5] md:pl-6 text-left">
                <div>
                  <p className="text-xs text-[#667085] font-medium">Last 7 days sales</p>
                  <p className="text-2xl font-bold text-[#202124] tracking-tight mt-1">
                    ₹ {last7DaysSales.toLocaleString("en-IN")}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-[#667085] font-medium">Invoices Made</p>
                  <p className="text-2xl font-bold text-[#202124] tracking-tight mt-1">
                    {last7DaysInvoicesCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Scan & Record Bills (lg:col-span-1) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-card border border-[#E5E7EB] shadow-card p-5">
            {/* Header: Icon + Title */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#F47721] flex items-center justify-center text-white shadow-saffron shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7V5a2 2 0 012-2h2m10 0h2a2 2 0 012 2v2m0 10v2a2 2 0 01-2 2h-2m-10 0H5a2 2 0 01-2-2v-2M9 9h6m-6 3h6m-6 3h4"
                  />
                </svg>
              </div>

              <div className="min-w-0">
                <h3 className="font-bold text-base text-[#202124] truncate">
                  Scan & Record Bills
                </h3>
                <p className="text-xs text-[#667085] font-medium mt-0.5">
                  {lang === "gu" ? "ઝડપી બિલ સ્કેનિંગ અને રેકોર્ડ" : "Quick Bill Scanning & Recording"}
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5 mt-5">
              <Link
                href="/sales/invoices/new"
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#F9FAFB] hover:bg-[#F3F4F6] text-[#344054] rounded-lg text-xs font-semibold border border-[#E5E7EB] transition-colors shadow-xs"
              >
                <svg className="w-4 h-4 text-[#667085]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Create Sales</span>
              </Link>

              <Link
                href="/purchases"
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#FFF8F3] hover:bg-[#FFF3E8] text-[#F47721] rounded-lg text-xs font-semibold border border-[#FDBA74] transition-colors shadow-xs"
              >
                <svg className="w-4 h-4 text-[#F47721]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span>Create Purchase</span>
              </Link>
            </div>

            {/* Peach Drag & Drop Upload Zone */}
            <div
              onClick={() => setIsScannerOpen(true)}
              className="mt-4 p-8 rounded-xl border-2 border-dashed border-[#F59E0B] bg-[#FFF6EE] hover:bg-[#FEEDDC] transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2.5 group"
            >
              <div className="w-12 h-12 rounded-full bg-[#FFE8D6] text-[#EA580C] flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>

              <div>
                <p className="text-sm font-bold text-[#C2410C]">
                  Drag & Drop or Upload file
                </p>
                <p className="text-[11px] text-[#667085] mt-0.5">
                  (PDF, JPG, JPEG & PNG file supported, max 5MB)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. BILL SCANNER MODAL (LAUNCHABLE FROM DASHBOARD) */}
      {isScannerOpen && (
        <BillScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onSuccess={() => {
            setIsScannerOpen(false);
            fetchDashboardData();
          }}
          lang={lang}
          parties={partiesList}
          itemsList={itemsList}
          warehouses={warehousesList}
        />
      )}
    </div>
  );
}
