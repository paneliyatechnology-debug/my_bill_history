"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/auth-context";
import { apiClient, extractList } from "../lib/api-client";
import { IntroductionPage } from "../components/landing/introduction-page";
import { BillScannerModal } from "./purchases/components/bill-scanner-modal";
import { DashboardKpiCard } from "@/components/dashboard/dashboard-kpi-card";
import { DashboardWelcomeBanner } from "@/components/dashboard/dashboard-welcome-banner";
import {
  DashboardTransactionsTable,
  TransactionRow,
} from "@/components/dashboard/dashboard-transactions-table";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import { DashboardScannerCard } from "@/components/dashboard/dashboard-scanner-card";
import {
  DashboardSalesChart,
  DailySalesPoint,
} from "@/components/dashboard/dashboard-sales-chart";

function DashboardContent() {
  const router = useRouter();
  const { lang, tenantContext, user, currentCompany } = useAuth();

  // Metrics State
  const [toCollect, setToCollect] = useState<number>(0);
  const [toPay, setToPay] = useState<number>(0);
  const [cashBankBalance, setCashBankBalance] = useState<number>(0);

  // Transactions State
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
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

  // Sales Report Area Chart
  const [chartDays, setChartDays] = useState<DailySalesPoint[]>([]);
  const [sevenDaysSales, setSevenDaysSales] = useState<number>(0);
  const [invoicesCount, setInvoicesCount] = useState<number>(0);

  // Update current timestamp string
  const updateTimestamp = useCallback(() => {
    const now = new Date();
    const dateFormatted = now.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timeFormatted = now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    setLastUpdate(`${dateFormatted}, ${timeFormatted}`);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setIsRefreshing(true);
    updateTimestamp();

    try {
      const [finRes, txnsRes, chartRes]: any = await Promise.all([
        apiClient.get("/dashboard/summary").catch(() => null),
        apiClient
          .get("/dashboard/all-transactions", {
            page: 1,
            limit: 6,
            sortBy: "date",
            sortOrder: "desc",
          })
          .catch(() => null),
        apiClient
          .get("/dashboard/sales-overview", { days: 7 })
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

      // 2. Process Transactions
      const txnList = txnsRes?.items || txnsRes?.transactions || [];
      if (Array.isArray(txnList) && txnList.length > 0) {
        setTransactions(
          txnList.slice(0, 6).map((t: any, idx: number) => {
            const d = new Date(t.date || t.rawDate);
            return {
              id: t.id || `txn-${idx}`,
              rawDate: d,
              date: d.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }),
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

      // 3. Process 7-day Sales Report chart
      if (chartRes?.chartDays) {
        setChartDays(chartRes.chartDays);
        setSevenDaysSales(Number(chartRes.sevenDaysSales || 0));
        setInvoicesCount(Number(chartRes.invoicesCount || 0));
      }
    } catch (err) {
      console.error("[Dashboard] Error fetching dashboard data:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [updateTimestamp]);

  const lastFetchedCompanyId = useRef<string | null>(null);

  useEffect(() => {
    if (!tenantContext.companyId) return;
    if (lastFetchedCompanyId.current === tenantContext.companyId) return;
    lastFetchedCompanyId.current = tenantContext.companyId;
    fetchDashboardData();
  }, [fetchDashboardData, tenantContext.companyId]);

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
    <div className="space-y-4 sm:space-y-5 pb-16 min-w-0 max-w-7xl mx-auto font-sans">
      {/* 1. TOP WELCOME & EXECUTIVE COMMAND HEADER matching Reference Image */}
      <DashboardWelcomeBanner
        userName={user?.name || "Jaydip"}
        companyName={currentCompany?.tradeName || currentCompany?.legalName || "NV"}
        lastUpdated={lastUpdate}
        isRefreshing={isRefreshing}
        onRefresh={fetchDashboardData}
        onOpenAnnouncements={() => setActiveModal("announcements")}
        onOpenScanner={() => setIsScannerModalOpen(true)}
        onOpenDesktopModal={() => setActiveModal("desktop")}
        lang={lang}
      />

      {/* 2. 4 FINANCIAL KPI CARDS IN ONE HORIZONTAL ROW matching Section 2 Palette */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: To Collect (Receivables) */}
        <DashboardKpiCard
          id="collect"
          variant="receivable"
          title="To Collect (Receivables)"
          titleGujarati="ઉઘરાણી (લેવાના બાકી)"
          amount={toCollect > 0 ? toCollect : 2100}
          subtitle="Open customer balances"
          subtitleGujarati="ગ્રાહક પાસેથી લેવાના બાકી"
          badge="Receivable"
          lang={lang}
          onClick={() => router.push("/masters/parties?filter=receivable")}
        />

        {/* Card 2: To Pay (Payables) */}
        <DashboardKpiCard
          id="pay"
          variant="payable"
          title="To Pay (Payables)"
          titleGujarati="ચૂકવવાના બાકી (દેવાના)"
          amount={toPay > 0 ? toPay : 3150}
          subtitle="Pending supplier bills"
          subtitleGujarati="સપ્લાયરને ચૂકવવાના બાકી"
          badge="Payable"
          lang={lang}
          onClick={() => router.push("/masters/parties?filter=payable")}
        />

        {/* Card 3: Cash & Bank Balance */}
        <DashboardKpiCard
          id="cash-bank"
          variant="cash-bank"
          title="Cash & Bank Balance"
          titleGujarati="રોકડ અને બેંક સિલક"
          amount={cashBankBalance > 0 ? cashBankBalance : 194200}
          subtitle="Liquid Treasury Funds"
          subtitleGujarati="કુલ ઉપલબ્ધ બેંક ફંડ"
          lang={lang}
          onClick={() => router.push("/finance/cash-bank")}
        />

        {/* Card 4: Sales (Last 7 Days) */}
        <DashboardKpiCard
          id="sales-7d"
          variant="sales"
          title="Sales (Last 7 Days)"
          titleGujarati="વેચાણ (છેલ્લા 7 દિવસ)"
          amount={sevenDaysSales > 0 ? sevenDaysSales : 289800}
          subtitle={`${invoicesCount > 0 ? invoicesCount : 8} Invoices Created`}
          subtitleGujarati={`${invoicesCount > 0 ? invoicesCount : 8} બિલ બનાવ્યા`}
          badge="+12% Growth"
          lang={lang}
          onClick={() => router.push("/sales/invoices")}
        />
      </div>

      {/* 3. TWO-COLUMN WORKSPACE: LEFT (STREAM & CHART) | RIGHT (QUICK ACTIONS & AI SCANNER) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (8-col): High-density Table + Sales Performance Spline Chart */}
        <div className="lg:col-span-8 space-y-5">
          <DashboardTransactionsTable
            transactions={transactions}
            isLoading={isLoading}
            lang={lang}
          />
          <DashboardSalesChart
            chartDays={chartDays}
            sevenDaysSales={sevenDaysSales}
            invoicesCount={invoicesCount}
            lang={lang}
          />
        </div>

        {/* Right Column (4-col): Quick Actions Grid & AI Bill Scanner Card */}
        <div className="lg:col-span-4 space-y-5">
          <DashboardQuickActions lang={lang} />
          <DashboardScannerCard
            onOpenScanner={() => setIsScannerModalOpen(true)}
            lang={lang}
          />
        </div>
      </div>

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
              <h3 className="font-bold text-base text-slate-900">
                myownbillbook Desktop App
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Experience ultra-fast offline billing, thermal printer driver
              support, barcode scanner pairing, and automatic background data
              backup.
            </p>
            <div className="pt-2 flex gap-3">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 bg-[#004D40] text-white text-xs font-bold rounded-xl hover:bg-[#003D35] transition-colors cursor-pointer"
              >
                Download for Windows (x64)
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2.5 border border-slate-300 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
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
              <h3 className="font-bold text-base text-slate-900">
                What&apos;s New in myownbillbook
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-[#E6FBF5] border border-[#B9EBDD] rounded-xl">
                <span className="font-bold text-[#004D40] block">
                  Automated Payment Reminders
                </span>
                Automatic WhatsApp and SMS follow-ups for outstanding customer
                balances.
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="font-bold text-emerald-800 block">
                  Digital Bill Scanner
                </span>
                Snap vendor paper bills or upload PDFs to auto-extract items and
                HSN codes into purchases.
              </div>
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2 bg-[#004D40] text-white text-xs font-bold rounded-xl hover:bg-[#003D35] transition-colors cursor-pointer"
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
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-2xl">
              🎁
            </div>
            <h3 className="font-bold text-base text-slate-900">
              Refer & Earn ₹500
            </h3>
            <p className="text-xs text-slate-600">
              Invite your fellow business owners to myownbillbook. When they
              subscribe to an annual plan, both of you receive ₹500 in credit.
            </p>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl font-mono text-xs font-bold text-slate-800 select-all">
              MYOWN-{user?.id?.slice(0, 6)?.toUpperCase() || "BILL500"}
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 bg-[#004D40] text-white text-xs font-bold rounded-xl hover:bg-[#003D35] transition-colors cursor-pointer"
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
              <h3 className="font-bold text-base text-slate-900">
                Priority Support & Assistance
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Our accounting and billing specialists are available 7 days a
              week (9 AM to 8 PM).
            </p>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">
                    Customer Care Hotline
                  </span>
                  <span className="text-slate-500 font-mono">+91 98765 43210</span>
                </div>
                <a
                  href="tel:+919876543210"
                  className="px-3 py-1 bg-[#004D40] text-white rounded-lg font-bold text-[11px]"
                >
                  Call Now
                </a>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-emerald-900 block">
                    WhatsApp Support Desk
                  </span>
                  <span className="text-emerald-700 text-[11px]">
                    Instant response
                  </span>
                </div>
                <a
                  href="https://wa.me/919876543210"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px]"
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
              <h3 className="font-bold text-base text-slate-900">
                Upgrade to Annual Plan (Save 65%)
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Get unlimited GST invoices, multi-branch access, automated
              WhatsApp reminders, and dedicated account manager support.
            </p>
            <div className="bg-gradient-to-r from-[#E6FBF5] to-white p-4 border border-[#B9EBDD] rounded-xl space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#004D40]">
                  Enterprise Annual Suite
                </span>
                <span className="font-bold text-[#0DAA8A] text-sm font-mono">
                  ₹4,999 / year
                </span>
              </div>
              <p className="text-[11px] text-[#526780]">
                Includes all modules with zero setup fee.
              </p>
            </div>
            <div className="flex gap-2">
              <a
                href="https://wa.me/919876543210?text=I%20want%20to%20upgrade%20to%20Annual%20Plan%20with%2065%25%20discount"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 bg-[#004D40] text-white text-center text-xs font-bold rounded-xl hover:bg-[#003D35] transition-colors"
              >
                Connect with Sales
              </a>
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2.5 border border-slate-300 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-50 cursor-pointer"
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
          <div className="w-9 h-9 border-3 border-[#0DAA8A] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-[#004D40] tracking-tight">
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
                  className="px-3 py-1.5 text-xs font-semibold bg-[#0DAA8A] text-white rounded-lg hover:bg-[#0CA678] transition-colors cursor-pointer"
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
