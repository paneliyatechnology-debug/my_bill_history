"use client";

import { formatDate } from "@/lib/date-utils";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/auth-context";
import { apiClient, extractList } from "../lib/api-client";
import { IntroductionPage } from "../components/landing/introduction-page";
import { BillScannerModal } from "./purchases/components/bill-scanner-modal";
import { DashboardKpiCard } from "@/components/dashboard/dashboard-kpi-card";
import {
  DashboardWelcomeBanner,
  isoToDDMMYYYY,
} from "@/components/dashboard/dashboard-welcome-banner";
import {
  DashboardTransactionsTable,
  TransactionRow,
} from "@/components/dashboard/dashboard-transactions-table";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import { DashboardScannerCard } from "@/components/dashboard/dashboard-scanner-card";
import { type DailySalesPoint } from "@/components/dashboard/dashboard-sales-chart";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity-feed";
import { UpcomingDuesAlertCard } from "@/components/dashboard/upcoming-dues-alert-card";
import { aggregateItemSalesByCategory, periodToRange } from "@/lib/sales-by-category";
import { Calendar, RotateCcw, X, Gift } from "lucide-react";

function DashboardContent() {
  const router = useRouter();
  const { lang, tenantContext, user, currentCompany, currentFY, hasPermission } = useAuth();

  // Metrics State
  const [toCollect, setToCollect] = useState<number>(0);
  const [toPay, setToPay] = useState<number>(0);
  const [cashBankBalance, setCashBankBalance] = useState<number>(0);

  // Transactions State
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isChartLoading, setIsChartLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  // Scan & Record Bills Tab state
  const [isScannerModalOpen, setIsScannerModalOpen] = useState<boolean>(false);
  const [parties, setParties] = useState<any[]>([]);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  // Modals state
  const [activeModal, setActiveModal] = useState<
    "desktop" | "announcements" | "gift" | "support" | "sales" | null
  >(null);

  // Date Range Filter State for Historical / Past Data
  const [dateFilter, setDateFilter] = useState<{
    startDate: string;
    endDate: string;
    preset: string;
  } | null>(null);

  // Sales Report Area Chart
  const [chartDays, setChartDays] = useState<DailySalesPoint[]>([]);
  const [chartPeriod, setChartPeriod] = useState<string>("30");
  const [sevenDaysSales, setSevenDaysSales] = useState<number>(0);
  const [invoicesCount, setInvoicesCount] = useState<number>(0);
  const [categorySplit, setCategorySplit] = useState<
    { label: string; percentage: number; color: string }[]
  >([]);
  const [categoryError, setCategoryError] = useState<string>("");
  const [snapshot, setSnapshot] = useState<{
    totalParties: number | null;
    totalItems: number | null;
    totalInvoices: number | null;
    pendingBills: number | null;
  }>({
    totalParties: null,
    totalItems: null,
    totalInvoices: null,
    pendingBills: null,
  });

  // Update current timestamp string
  const updateTimestamp = useCallback(() => {
    const now = new Date();
    const dateFormatted = formatDate(now);
    const timeFormatted = now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    setLastUpdate(`${dateFormatted}, ${timeFormatted}`);
  }, []);

  const readCount = (res: any): number | null => {
    if (!res || typeof res !== "object") return null;
    const candidates = [
      res.total,
      res.totalCount,
      res.count,
      res.meta?.total,
      res.meta?.totalCount,
      res.pagination?.total,
      res.pagination?.totalCount,
    ];
    for (const value of candidates) {
      if (typeof value === "number" && Number.isFinite(value)) return value;
    }
    return null;
  };

  const fetchDashboardData = useCallback(
    async (customStart?: string, customEnd?: string) => {
      setIsRefreshing(true);
      updateTimestamp();

      try {
        const activeFyId = tenantContext?.financialYearId || currentFY?.id;
        const effStart = customStart !== undefined ? (customStart || undefined) : dateFilter?.startDate;
        const effEnd = customEnd !== undefined ? (customEnd || undefined) : dateFilter?.endDate;

        const summaryParams: any = { financialYearId: activeFyId };
        if (effEnd) {
          summaryParams.asOfDate = effEnd;
        }

        const txnsParams: any = {
          page: 1,
          limit: 10,
          sortBy: "date",
          sortOrder: "desc",
          financialYearId: activeFyId,
        };
        if (effStart) txnsParams.startDate = effStart;
        if (effEnd) txnsParams.endDate = effEnd;

        const [finRes, txnsRes]: any =
          await Promise.all([
            apiClient
              .get("/dashboard/summary", summaryParams)
              .catch(() => null),
            apiClient
              .get("/dashboard/all-transactions", txnsParams)
              .catch(() => null),
          ]);

        // 1. Process Financial Summary
        let coll = 0;
        let pay = 0;
        let cb = 0;

        if (finRes) {
          if (finRes.toCollect !== undefined && finRes.toCollect !== null) {
            coll = Number(finRes.toCollect);
          }
          if (finRes.toPay !== undefined && finRes.toPay !== null) {
            pay = Number(finRes.toPay);
          }
          if (
            finRes.totalCashBankBalance !== undefined &&
            finRes.totalCashBankBalance !== null
          ) {
            cb = Number(finRes.totalCashBankBalance);
          }
        }

        setToCollect(coll);
        setToPay(pay);
        setCashBankBalance(cb);

        const pendingFromSummary =
          typeof finRes?.pendingBills === "number"
            ? finRes.pendingBills
            : typeof finRes?.unpaidInvoices === "number"
              ? finRes.unpaidInvoices
              : null;
        setSnapshot({
          totalParties:
            typeof finRes?.totalParties === "number"
              ? finRes.totalParties
              : 0,
          totalItems:
            typeof finRes?.totalItems === "number"
              ? finRes.totalItems
              : 0,
          totalInvoices:
            typeof finRes?.totalInvoices === "number"
              ? finRes.totalInvoices
              : typeof finRes?.invoicesCount === "number"
                ? finRes.invoicesCount
                : 0,
          pendingBills: pendingFromSummary,
        });

        // 2. Process Transactions (Latest 10 for period)
        const txnList = txnsRes?.items || txnsRes?.transactions || [];
        if (Array.isArray(txnList) && txnList.length > 0) {
          setTransactions(
            txnList.slice(0, 10).map((t: any, idx: number) => {
              const d = new Date(t.date || t.rawDate);
              return {
                id: t.id || `txn-${idx}`,
                rawDate: d,
                date: formatDate(d),
                type: t.type || "Sales Invoice",
                txnNo: t.transactionNumber || t.txnNo || "-",
                partyName: t.partyName || "-",
                amount: Number(t.amount || 0),
                link: t.link || "/app/home/vouchers/all_transactions",
                status: t.status || "Paid",
              };
            })
          );
        } else {
          setTransactions([]);
        }
      } catch (err) {
        console.error("[Dashboard] Error fetching dashboard data:", err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [updateTimestamp, tenantContext?.financialYearId, currentFY?.id, dateFilter?.startDate, dateFilter?.endDate]
  );

  const fetchSalesChart = useCallback(
    async (customStart?: string, customEnd?: string) => {
      setIsChartLoading(true);
      setCategoryError("");
      const effStart = customStart !== undefined ? (customStart || undefined) : dateFilter?.startDate;
      const effEnd = customEnd !== undefined ? (customEnd || undefined) : dateFilter?.endDate;

      let range: { startDate: string; endDate: string; days: number };
      if (effStart && effEnd) {
        const sTime = new Date(effStart).getTime();
        const eTime = new Date(effEnd).getTime();
        const diffDays = Math.max(1, Math.round(Math.abs(eTime - sTime) / 86400000) + 1);
        range = { startDate: effStart, endDate: effEnd, days: diffDays };
      } else {
        range = periodToRange(chartPeriod);
      }

      const activeFyId = tenantContext?.financialYearId || currentFY?.id;
      try {
        const [chartRes, itemSalesRes, returnsRes, salesRegRes]: any = await Promise.all([
          apiClient
            .get("/dashboard/sales-overview", {
              days: Math.min(30, range.days),
              financialYearId: activeFyId,
            })
            .catch(() => null),
          apiClient
            .get("/reports/item-sales-report", {
              startDate: range.startDate,
              endDate: range.endDate,
              fromDate: range.startDate,
              toDate: range.endDate,
            })
            .catch(() => null),
          apiClient
            .get("/reports/sales-returns", {
              startDate: range.startDate,
              endDate: range.endDate,
              fromDate: range.startDate,
              toDate: range.endDate,
            })
            .catch(() => null),
          effStart && effEnd
            ? apiClient
                .get("/reports/sales-register", {
                  startDate: range.startDate,
                  endDate: range.endDate,
                  fromDate: range.startDate,
                  toDate: range.endDate,
                })
                .catch(() => null)
            : Promise.resolve(null),
        ]);

        if (chartRes?.chartDays) {
          setChartDays(chartRes.chartDays);
        } else {
          setChartDays([]);
        }

        if (effStart && effEnd && salesRegRes) {
          const totalFromReg = Number(
            salesRegRes?.totals?.totalGrandTotal ??
            salesRegRes?.summary?.totalGrandTotal ??
            salesRegRes?.summary?.grandTotal ??
            0
          );
          setSevenDaysSales(totalFromReg);
          if (salesRegRes?.totalCount != null) {
            setInvoicesCount(Number(salesRegRes.totalCount));
          }
        } else if (chartPeriod === "7" && chartRes) {
          setSevenDaysSales(Number(chartRes.sevenDaysSales || chartRes.totalSales || 0));
        } else if (chartRes?.sevenDaysSales != null) {
          setSevenDaysSales(Number(chartRes.sevenDaysSales));
        }

        if (chartRes && (!effStart || !effEnd)) {
          setInvoicesCount(Number(chartRes.invoicesCount || 0));
        }

        const salesRows = itemSalesRes?.items || itemSalesRes?.data || [];
        const returnRows = returnsRes?.returns || returnsRes?.items || [];
        const categoryByItemId = new Map<string, string>();

        if (!itemSalesRes) {
          setCategorySplit([]);
          setCategoryError("Category sales could not be loaded.");
        } else {
          setCategorySplit(
            aggregateItemSalesByCategory(
              Array.isArray(salesRows) ? salesRows : [],
              categoryByItemId,
              Array.isArray(returnRows) ? returnRows : []
            )
          );
        }
      } catch (err) {
        console.error("[Dashboard] Category sales failed:", err);
        setCategorySplit([]);
        setCategoryError("Category sales could not be loaded.");
      } finally {
        setIsChartLoading(false);
      }
    },
    [chartPeriod, tenantContext?.financialYearId, currentFY?.id, dateFilter?.startDate, dateFilter?.endDate]
  );

  const handleDateRangeChange = useCallback(
    (start: string, end: string, presetLabel: string) => {
      const today = new Date().toISOString().split("T")[0];
      if (
        (presetLabel === "Today" || presetLabel === "આજે" || presetLabel === "Live") &&
        start === today &&
        end === today
      ) {
        setDateFilter(null);
        fetchDashboardData("", "");
        fetchSalesChart("", "");
        return;
      }

      const filter = { startDate: start, endDate: end, preset: presetLabel };
      setDateFilter(filter);
      fetchDashboardData(start, end);
      fetchSalesChart(start, end);
    },
    [fetchDashboardData, fetchSalesChart]
  );

  const handleResetDateRange = useCallback(() => {
    setDateFilter(null);
    fetchDashboardData("", "");
    fetchSalesChart("", "");
  }, [fetchDashboardData, fetchSalesChart]);

  useEffect(() => {
    if (!tenantContext.companyId) return;
    fetchDashboardData();
  }, [fetchDashboardData, tenantContext.companyId, tenantContext?.financialYearId, currentFY?.id]);

  useEffect(() => {
    if (!tenantContext.companyId) return;
    fetchSalesChart();
  }, [fetchSalesChart, tenantContext.companyId, tenantContext?.financialYearId, currentFY?.id]);

  useEffect(() => {
    const handleFyChanged = () => {
      fetchDashboardData();
      fetchSalesChart();
    };

    window.addEventListener("financial-year-changed", handleFyChanged);
    window.addEventListener("tenant-context-updated", handleFyChanged);

    return () => {
      window.removeEventListener("financial-year-changed", handleFyChanged);
      window.removeEventListener("tenant-context-updated", handleFyChanged);
    };
  }, [fetchDashboardData, fetchSalesChart]);

  // Lazy-load scanner masters dependencies only when scanner modal is opened
  useEffect(() => {
    if (!isScannerModalOpen) return;
    if (parties.length > 0 && itemsList.length > 0) return;
    Promise.all([
      apiClient.get("/masters/parties", { limit: 100 }).catch(() => null),
      apiClient.get("/masters/items", { limit: 100 }).catch(() => null),
      apiClient.get("/masters/warehouses").catch(() => null),
    ]).then(([p, it, wh]) => {
      if (p) setParties(extractList(p));
      if (it) setItemsList(extractList(it));
      if (wh) setWarehouses(extractList(wh));
    });
  }, [isScannerModalOpen, parties.length, itemsList.length]);

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-5 pb-16 font-sans">
      {/* 1. TOP WELCOME & EXECUTIVE COMMAND HEADER */}
      <DashboardWelcomeBanner
        userName={user?.fullName || user?.name || ""}
        companyName={currentCompany?.tradeName || currentCompany?.legalName || ""}
        lastUpdated={lastUpdate || ""}
        financialYear={currentFY?.name || ""}
        isRefreshing={isRefreshing}
        onRefresh={() => {
          if (dateFilter) {
            fetchDashboardData(dateFilter.startDate, dateFilter.endDate);
            fetchSalesChart(dateFilter.startDate, dateFilter.endDate);
          } else {
            fetchDashboardData();
            fetchSalesChart();
          }
        }}
        onOpenAnnouncements={() => setActiveModal("announcements")}
        onOpenScanner={() => setIsScannerModalOpen(true)}
        onOpenDesktopModal={() => setActiveModal("desktop")}
        lang={lang}
        startDate={dateFilter?.startDate}
        endDate={dateFilter?.endDate}
        selectedPreset={dateFilter?.preset}
        onDateRangeChange={handleDateRangeChange}
        onResetDateRange={handleResetDateRange}
      />

      {/* Historical Data Filter Active Banner */}
      {dateFilter && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 bg-blue-50/90 border border-blue-200/90 rounded-2xl text-blue-900 shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-xs sm:text-sm text-blue-950">
                  {lang === "gu" ? "ઐતિહાસિક ડેટા જોઈ રહ્યા છો:" : "Viewing Historical Data:"}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-200/70 text-blue-900 text-xs font-semibold">
                  {dateFilter.preset}
                </span>
                <span className="text-xs text-blue-800 font-medium tabular-nums">
                  ({isoToDDMMYYYY(dateFilter.startDate)} to {isoToDDMMYYYY(dateFilter.endDate)})
                </span>
              </div>
              <p className="text-[11px] text-blue-700/90 mt-0.5">
                {lang === "gu"
                  ? "લેવાના/આપવાના બાકી અને બેલેન્સ આપેલ તારીખ સુધીના તથા વ્યવહારો આ સમયગાળા મુજબ દર્શાવેલ છે."
                  : "Receivables, payables & balances calculated as of cutoff date; transactions filtered for this period."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetDateRange}
            className="self-start sm:self-auto px-3 py-1.5 bg-white hover:bg-blue-100 text-blue-700 hover:text-blue-900 border border-blue-300 rounded-xl text-xs font-semibold cursor-pointer shadow-2xs whitespace-nowrap transition-all active:scale-95 flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{lang === "gu" ? "આજનો લાઈવ ડેટા જુઓ" : "Return to Live Today"}</span>
          </button>
        </div>
      )}

      {/* 2. 4 FINANCIAL KPI CARDS IN ONE MODULAR HORIZONTAL ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: To Collect (Receivables) */}
        {hasPermission("dashboard", "view_financial") && (
          <DashboardKpiCard
            id="collect"
            variant="receivable"
            title="To Collect (Receivables)"
            titleGujarati="ઉઘરાણી (લેવાના બાકી)"
            amount={toCollect}
            lang={lang}
            onClick={() => router.push("/masters/parties?filter=receivable")}
          />
        )}

        {/* Card 2: To Pay (Payables) */}
        {hasPermission("dashboard", "view_financial") && (
          <DashboardKpiCard
            id="pay"
            variant="payable"
            title="To Pay (Payables)"
            titleGujarati="ચૂકવવાના બાકી (દેવાના)"
            amount={toPay}
            lang={lang}
            onClick={() => router.push("/masters/parties?filter=payable")}
          />
        )}

        {/* Card 3: Cash & Bank Balance */}
        {hasPermission("dashboard", "view_cash_bank") && (
          <DashboardKpiCard
            id="cash-bank"
            variant="cash-bank"
            title="Cash & Bank Balance"
            titleGujarati="રોકડ અને બેંક સિલક"
            amount={cashBankBalance}
            lang={lang}
            onClick={() => router.push("/finance/cash-bank")}
          />
        )}

        {/* Card 4: Sales */}
        {hasPermission("dashboard", "view_financial") && (
          <DashboardKpiCard
            id="sales-7d"
            variant="sales"
            title={dateFilter ? `Sales (${dateFilter.preset})` : "Sales (Last 7 Days)"}
            titleGujarati={dateFilter ? `વેચાણ (${dateFilter.preset})` : "વેચાણ (છેલ્લા 7 દિવસ)"}
            amount={sevenDaysSales}
            sparkline={chartDays.map((point) => point.sales)}
            lang={lang}
            onClick={() => router.push(dateFilter ? `/reports/sales-register?startDate=${dateFilter.startDate}&endDate=${dateFilter.endDate}` : "/sales/invoices")}
          />
        )}
      </div>

      {/* 3. UPCOMING DUES - IMPORTANT SECTION */}
      <UpcomingDuesAlertCard />

      {/* 4. MAIN CONTENT ROW: RECENT TRANSACTIONS (8-col) | QUICK ACTIONS (4-col) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Detailed Recent Transactions Stream */}
        <div className="lg:col-span-8 flex flex-col min-w-0">
          <DashboardTransactionsTable
            transactions={transactions}
            isLoading={isLoading}
            lang={lang}
            limit={10}
            title={dateFilter ? (lang === "gu" ? `વ્યવહારો (${dateFilter.preset})` : `Transactions (${dateFilter.preset})`) : undefined}
            subtitle={dateFilter ? (lang === "gu" ? `તારીખ ${isoToDDMMYYYY(dateFilter.startDate)} થી ${isoToDDMMYYYY(dateFilter.endDate)} વચ્ચેના વ્યવહારો` : `Transactions from ${isoToDDMMYYYY(dateFilter.startDate)} to ${isoToDDMMYYYY(dateFilter.endDate)}`) : undefined}
          />
        </div>

        {/* Right: Quick Actions Grid */}
        <div className="lg:col-span-4 flex flex-col min-w-0">
          <DashboardQuickActions lang={lang} />
        </div>
      </div>

      {/* 6. REAL-TIME BUSINESS ACTIVITY FEED */}
      <RecentActivityFeed />

      {/* 5. MODALS INTEGRATION PRESERVED 100% */}
      <BillScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        onSuccess={() => {
          setIsScannerModalOpen(false);
          fetchDashboardData();
        }}
        lang={lang}
        parties={parties}
        itemsList={itemsList}
        warehouses={warehouses}
      />

      {/* Desktop App Modal */}
      {activeModal === "desktop" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="typo-modal-title text-slate-900">
                myownbillbook Desktop App
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="typo-modal-desc text-slate-600 leading-relaxed">
              Experience ultra-fast offline billing, thermal printer driver
              support, barcode scanner pairing, and automatic background data
              backup.
            </p>
            <div className="pt-2 flex gap-3">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 bg-[#1677E8] text-white typo-btn-primary rounded-xl hover:bg-[#1268D3] transition-colors cursor-pointer"
              >
                Download for Windows (x64)
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2.5 border border-slate-300 typo-btn-secondary text-slate-700 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Announcements Modal */}
      {activeModal === "announcements" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="typo-modal-title text-slate-900">
                What&apos;s New in myownbillbook
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 typo-modal-desc text-slate-600">
              <div className="p-3 bg-[#E6FBF5] border border-[#B9EBDD] rounded-xl">
                <span className="font-semibold text-[#1677E8] block">
                  Automated Payment Reminders
                </span>
                Automatic WhatsApp and SMS follow-ups for outstanding customer
                balances.
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="font-semibold text-emerald-800 block">
                  Digital Bill Scanner
                </span>
                Snap vendor paper bills or upload PDFs to auto-extract items and
                HSN codes into purchases.
              </div>
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2 bg-[#1677E8] text-white typo-btn-primary rounded-xl hover:bg-[#1268D3] transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Refer & Earn Modal */}
      {activeModal === "gift" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <Gift className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="typo-modal-title text-slate-900">
              Refer & Earn ₹500
            </h3>
            <p className="typo-modal-desc text-slate-600">
              Invite your fellow business owners to myownbillbook. When they
              subscribe to an annual plan, both of you receive ₹500 in credit.
            </p>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl typo-invoice-no text-slate-800 select-all">
              MYOWN-{user?.id?.slice(0, 6)?.toUpperCase() || "BILL500"}
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 bg-[#1677E8] text-white typo-btn-primary rounded-xl hover:bg-[#1268D3] transition-colors cursor-pointer"
            >
              Copy Referral Link
            </button>
          </div>
        </div>
      )}

      {/* Support Modal */}
      {activeModal === "support" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="typo-modal-title text-slate-900">
                Priority Support & Assistance
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="typo-modal-desc text-slate-600">
              Our accounting and billing specialists are available 7 days a
              week (9 AM to 8 PM).
            </p>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900 block">
                    Customer Care Hotline
                  </span>
                  <span className="text-slate-500 typo-tx-id">+91 98765 43210</span>
                </div>
                <a
                  href="tel:+919876543210"
                  className="px-3 py-1 bg-[#1677E8] text-white rounded-lg typo-badge"
                >
                  Call Now
                </a>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-semibold text-emerald-900 block">
                    WhatsApp Support Desk
                  </span>
                  <span className="text-emerald-700 typo-badge">
                    Instant response
                  </span>
                </div>
                <a
                  href="https://wa.me/919876543210"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-[#1677E8] text-white rounded-lg typo-badge"
                >
                  Chat
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Talk to Sales Modal */}
      {activeModal === "sales" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="typo-modal-title text-slate-900">
                Upgrade to Annual Plan (Save 65%)
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="typo-modal-desc text-slate-600">
              Get unlimited GST invoices, multi-branch access, automated
              WhatsApp reminders, and dedicated account manager support.
            </p>
            <div className="bg-gradient-to-r from-[#E6FBF5] to-white p-4 border border-[#B9EBDD] rounded-xl space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-[#1677E8]">
                  Enterprise Annual Suite
                </span>
                <span className="font-semibold text-[#1677E8] typo-amount-secondary tabular-nums">
                  ₹4,999 / year
                </span>
              </div>
              <p className="typo-card-desc text-[#526780]">
                Includes all modules with zero setup fee.
              </p>
            </div>
            <div className="flex gap-2">
              <a
                href="https://wa.me/919876543210?text=I%20want%20to%20upgrade%20to%20Annual%20Plan%20with%2065%25%20discount"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 bg-[#1677E8] text-white text-center typo-btn-primary rounded-xl hover:bg-[#1268D3] transition-colors"
              >
                Connect with Sales
              </a>
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2.5 border border-slate-300 typo-btn-secondary text-slate-700 rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const { isAuthenticated, isLoading, lang } = useAuth();
  const [showTimeoutFallback, setShowTimeoutFallback] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      timer = setTimeout(() => {
        setShowTimeoutFallback(true);
      }, 7000);
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
      <div className="h-screen w-full flex items-center justify-center bg-[#F4F7FA] p-4 text-center">
        <div className="flex flex-col items-center gap-3 max-w-sm">
          <div className="w-9 h-9 border-3 border-[#1677E8] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-[#1677E8] tracking-tight">
            Loading myownbillbook...
          </span>
          {showTimeoutFallback && (
            <div className="mt-4 p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
              <p className="text-xs text-[#526780] mb-3">
                {lang === "gu"
                  ? "લોડિંગ સામાન્ય કરતાં વધુ સમય લઈ રહ્યું છે."
                  : "Loading is taking longer than expected."}
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => window.location.reload()}
                  className="px-3 py-1.5 text-xs font-semibold bg-[#1677E8] text-white rounded-lg hover:bg-[#0CA678] transition-colors cursor-pointer"
                >
                  {lang === "gu" ? "રીફ્રેશ કરો" : "Reload"}
                </button>
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-xs font-semibold border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
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

  // If authenticated, render executive business operational dashboard
  return <DashboardContent />;
}
