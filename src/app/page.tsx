"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/auth-context";
import { apiClient, extractList } from "../lib/api-client";
import { IntroductionPage } from "../components/landing/introduction-page";
import { BillScannerModal } from "./purchases/components/bill-scanner-modal";
import { ScorecardRibbon, ScorecardSegment } from "@/components/design-system/scorecard-ribbon";
import { formatInr } from "@/components/design-system/tokens";

interface TransactionRow {
  id: string;
  date: string;
  rawDate: Date;
  type: string;
  typeColor?: string;
  txnNo: string;
  partyName: string;
  amount: number;
  link?: string;
}

interface DailySalesPoint {
  dayLabel: string;
  dateIso: string;
  sales: number;
}

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
  const [activeModal, setActiveModal] = useState<"desktop" | "announcements" | "gift" | "support" | "sales" | null>(null);

  // Sales Report Area Chart
  const [chartPeriod, setChartPeriod] = useState<"Daily" | "Weekly" | "Monthly">("Daily");
  const [chartDays, setChartDays] = useState<DailySalesPoint[]>([]);
  const [sevenDaysSales, setSevenDaysSales] = useState<number>(0);
  const [invoicesCount, setInvoicesCount] = useState<number>(0);
  const [hoveredPoint, setHoveredPoint] = useState<DailySalesPoint | null>(null);

  // Drag & drop state for scanner
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    setLastUpdate(`${dateFormatted} | ${timeFormatted}`);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setIsRefreshing(true);
    updateTimestamp();

    try {
      const [finRes, txnsRes, chartRes]: any = await Promise.all([
        apiClient.get("/dashboard/summary").catch(() => null),
        apiClient.get("/dashboard/all-transactions", { page: 1, limit: 6, sortBy: "date", sortOrder: "desc" }).catch(() => null),
        apiClient.get("/dashboard/sales-overview", { days: 7 }).catch(() => null),
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
        if (finRes.totalCashBankBalance !== undefined && finRes.totalCashBankBalance !== null) {
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
              type: t.type,
              txnNo: t.transactionNumber || t.txnNo || "-",
              partyName: t.partyName || "-",
              amount: Number(t.amount || 0),
              link: t.link || "/app/home/vouchers/all_transactions",
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

  // Generate SVG path for the smooth area chart
  const { pathD, areaD, points, maxVal } = useMemo(() => {
    if (chartDays.length === 0) {
      return { pathD: "", areaD: "", points: [], maxVal: 14000 };
    }

    const width = 660;
    const height = 220;
    const paddingLeft = 65;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 25;
    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    const highest = Math.max(...chartDays.map((d) => d.sales), 14000);
    const calculatedMax = Math.ceil(highest / 2000) * 2000;

    const computedPoints = chartDays.map((d, i) => {
      const x = paddingLeft + (i / (chartDays.length - 1)) * plotWidth;
      const y = height - paddingBottom - (d.sales / calculatedMax) * plotHeight;
      return { x, y, data: d };
    });

    if (computedPoints.length < 2) {
      return { pathD: "", areaD: "", points: computedPoints, maxVal: calculatedMax };
    }

    // Generate smooth cubic bezier curve
    let dStr = `M ${computedPoints[0].x} ${computedPoints[0].y}`;
    for (let i = 0; i < computedPoints.length - 1; i++) {
      const p0 = computedPoints[i === 0 ? i : i - 1];
      const p1 = computedPoints[i];
      const p2 = computedPoints[i + 1];
      const p3 = computedPoints[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      dStr += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const baselineY = height - paddingBottom;
    const firstX = computedPoints[0].x;
    const lastX = computedPoints[computedPoints.length - 1].x;
    const aStr = `${dStr} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;

    return { pathD: dStr, areaD: aStr, points: computedPoints, maxVal: calculatedMax };
  }, [chartDays]);

  // Handle file drop/upload for Bill Scanner
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setIsScannerModalOpen(true);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsScannerModalOpen(true);
    }
  };

  // Executive Scorecard segments for horizontal financial ribbon
  const executiveSegments: ScorecardSegment[] = [
    {
      id: "collect",
      label: "To Collect (Receivables)",
      labelGujarati: "ઉઘરાણી (લેવાના બાકી)",
      value: toCollect,
      isCurrency: true,
      subtext: "Open customer balances",
      subtextGujarati: "ગ્રાહક પાસેથી લેવાના બાકી",
      badge: "Receivable",
      variant: "success",
      onClick: () => router.push("/masters/parties?filter=receivable"),
    },
    {
      id: "pay",
      label: "To Pay (Payables)",
      labelGujarati: "ચૂકવવાના બાકી (દેવાના)",
      value: toPay,
      isCurrency: true,
      subtext: "Pending supplier bills",
      subtextGujarati: "સપ્લાયરને ચૂકવવાના બાકી",
      badge: "Payable",
      variant: "warning",
      onClick: () => router.push("/masters/parties?filter=payable"),
    },
    {
      id: "cash-bank",
      label: "Cash & Bank Balance",
      labelGujarati: "રોકડ અને બેંક સિલક",
      value: cashBankBalance,
      isCurrency: true,
      subtext: "Liquid Treasury Funds",
      subtextGujarati: "કુલ ઉપલબ્ધ બેંક ફંડ",
      variant: "primary",
      onClick: () => router.push("/finance/cash-bank"),
    },
    {
      id: "sales-7d",
      label: "Sales (Last 7 Days)",
      labelGujarati: "વેચાણ (છેલ્લા 7 દિવસ)",
      value: sevenDaysSales,
      isCurrency: true,
      subtext: `${invoicesCount} Invoices Created`,
      subtextGujarati: `${invoicesCount} બિલ બનાવ્યા`,
      badge: "+12% Growth",
      variant: "neutral",
      onClick: () => router.push("/sales/invoices"),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-5 pb-16 min-w-0 max-w-7xl mx-auto font-sans">
      {/* 1. TOP EXECUTIVE COMMAND STRIP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:px-6 sm:py-3.5 rounded-2xl border border-[#E2E8E5] shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#26A58A]">
              {lang === "gu" ? "નાણાકીય કમાન્ડ સેન્ટર" : "EXECUTIVE COMMAND CENTER"}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[10px] font-bold text-slate-500 font-mono">
              {currentCompany?.tradeName || currentCompany?.legalName || "My Company"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-[#1A2E2B] tracking-tight">
              {lang === "gu" ? "ડેશબોર્ડ (Dashboard)" : "Dashboard Overview"}
            </h1>
            <button
              type="button"
              onClick={fetchDashboardData}
              disabled={isRefreshing}
              title="Refresh Accounting Feeds"
              className="p-1 text-slate-400 hover:text-[#174B43] rounded-md transition-colors cursor-pointer"
            >
              <svg className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#26A58A]" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Action Suite & Quick Links */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Announcements */}
          <button
            type="button"
            onClick={() => setActiveModal("announcements")}
            className="p-2 border border-[#E2E8E5] bg-white hover:bg-[#F2FAF7] hover:border-[#85D5C2] text-[#5A6B66] hover:text-[#174B43] rounded-xl transition-colors cursor-pointer shadow-2xs"
            title="Announcements & Product Updates"
          >
            <svg className="w-4 h-4 text-[#26A58A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </button>

          {/* AI Bill Scanner */}
          <button
            type="button"
            onClick={() => setIsScannerModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer"
            title="Scan Bills with AI OCR"
          >
            <svg className="w-3.5 h-3.5 text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span>{lang === "gu" ? "બિલ સ્કેનર" : "Scan Bill"}</span>
          </button>

          {/* Desktop App */}
          <button
            type="button"
            onClick={() => setActiveModal("desktop")}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 border border-[#E2E8E5] bg-white hover:bg-[#F2FAF7] hover:border-[#85D5C2] text-[#174B43] text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-2xs"
            title="Download Offline Desktop App"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Desktop</span>
          </button>

          {/* Create Sales Invoice CTA */}
          <Link
            href="/sales/invoices/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#174B43] hover:bg-[#123B35] active:bg-[#0D2A26] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-[#85D5C2]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>{lang === "gu" ? "+ નવું બિલ" : "+ Create Sales Bill"}</span>
          </Link>
        </div>
      </div>

      {/* 2. EXECUTIVE TREASURY & FINANCIAL SCORECARD RIBBON */}
      <ScorecardRibbon segments={executiveSegments} lang={lang} />

      {/* 3. MIDDLE SECTION: LIVE TRANSACTION STREAM & QUICK ACTION HUB */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column (8-col): Latest Transactions */}
        <div className="lg:col-span-8 bg-white border border-[#E2E8E5] rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-5 py-3.5 border-b border-[#E2E8E5] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#26A58A]" />
                <h3 className="text-sm font-extrabold text-[#1A2E2B]">
                  {lang === "gu" ? "તાજેતરના વ્યવહારો (Live Stream)" : "Recent Transaction Stream"}
                </h3>
              </div>
              <Link
                href="/app/home/vouchers/all_transactions"
                className="text-xs font-bold text-[#174B43] hover:text-[#26A58A] transition-colors flex items-center gap-1"
              >
                <span>{lang === "gu" ? "બધા જુઓ" : "View All"}</span>
                <span>→</span>
              </Link>
            </div>

            {/* Desktop Table View */}
            <div className="overflow-x-auto min-h-[280px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8E5] bg-[#FAFBFD] text-[11px] font-extrabold text-[#5A6B66] uppercase tracking-wider">
                    <th className="px-5 py-3">{lang === "gu" ? "તારીખ" : "DATE"}</th>
                    <th className="px-4 py-3">{lang === "gu" ? "પ્રકાર" : "TYPE"}</th>
                    <th className="px-4 py-3">{lang === "gu" ? "નંબર" : "VOUCHER #"}</th>
                    <th className="px-5 py-3">{lang === "gu" ? "પાર્ટી" : "PARTY"}</th>
                    <th className="px-5 py-3 text-right">{lang === "gu" ? "રકમ" : "AMOUNT"}</th>
                    <th className="px-4 py-3 text-center">{lang === "gu" ? "સ્થિતિ" : "STATUS"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-[#1A2E2B]">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-5 py-3.5"><div className="h-4 w-20 bg-slate-100 rounded" /></td>
                        <td className="px-4 py-3.5"><div className="h-4 w-14 bg-slate-100 rounded-md" /></td>
                        <td className="px-4 py-3.5"><div className="h-4 w-16 bg-slate-100 rounded" /></td>
                        <td className="px-5 py-3.5"><div className="h-4 w-32 bg-slate-100 rounded" /></td>
                        <td className="px-5 py-3.5 text-right"><div className="h-4 w-20 bg-slate-100 rounded ml-auto" /></td>
                        <td className="px-4 py-3.5 text-center"><div className="h-4 w-12 bg-slate-100 rounded-full mx-auto" /></td>
                      </tr>
                    ))
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-xs text-[#5A6B66]">
                        <div className="w-12 h-12 rounded-2xl bg-[#E6F7F2] text-[#26A58A] flex items-center justify-center mx-auto mb-2 shadow-inner">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <p className="font-bold text-[#1A2E2B]">No transactions recorded yet</p>
                        <p className="text-[11px] text-[#8E9F9A] mt-0.5">Start billing your clients to see live entries here.</p>
                        <Link href="/sales/invoices/new" className="inline-block mt-3 px-4 py-1.5 rounded-xl bg-[#174B43] hover:bg-[#123B35] text-white font-bold text-xs shadow-xs transition-colors">
                          + Create First Sales Invoice
                        </Link>
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        onClick={() => tx.link && router.push(tx.link)}
                        className="hover:bg-[#F8FAF9] transition-colors cursor-pointer group"
                      >
                        <td className="px-5 py-3 whitespace-nowrap text-slate-700 font-medium">
                          {tx.date}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-md bg-[#E6F7F2] text-[#174B43] border border-[#BCEADF]">
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-[#174B43] font-bold group-hover:text-[#26A58A]">
                          {tx.txnNo}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-[#1A2E2B] font-bold truncate max-w-[200px]">
                          {tx.partyName}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-right font-mono font-black text-[#1A2E2B]">
                          {formatInr(tx.amount)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Paid
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t border-[#E2E8E5] p-3 text-center bg-[#FAFBFD]">
            <Link
              href="/app/home/vouchers/all_transactions"
              className="text-xs font-bold text-[#174B43] hover:text-[#26A58A] transition-colors inline-block"
            >
              See All Detailed Transactions →
            </Link>
          </div>
        </div>

        {/* Right Column (4-col): Quick Launchers & OCR Dropzone */}
        <div className="lg:col-span-4 space-y-4">
          {/* Quick Launcher Card */}
          <div className="bg-white border border-[#E2E8E5] rounded-2xl shadow-xs p-4 sm:p-5 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#5A6B66]">
              {lang === "gu" ? "ઝડપી શોર્ટકટ્સ" : "Quick Actions"}
            </h3>

            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/sales/invoices/new"
                className="p-3 rounded-xl bg-[#F2FAF7] hover:bg-[#E6F7F2] border border-[#BCEADF] text-left transition-all group block"
              >
                <div className="w-7 h-7 rounded-lg bg-[#26A58A] text-white flex items-center justify-center font-bold text-xs mb-1.5 shadow-2xs">
                  +
                </div>
                <div className="text-xs font-bold text-[#174B43] group-hover:text-[#123B35]">
                  Sales Bill
                </div>
                <div className="text-[10px] text-[#5A6B66]">Tax Invoice</div>
              </Link>

              <Link
                href="/purchases/new"
                className="p-3 rounded-xl bg-[#F8FAFC] hover:bg-slate-100 border border-[#E2E8E5] text-left transition-all group block"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-xs mb-1.5 shadow-2xs">
                  📦
                </div>
                <div className="text-xs font-bold text-slate-800">
                  Purchase Bill
                </div>
                <div className="text-[10px] text-slate-500">Inward Stock</div>
              </Link>

              <Link
                href="/sales/payment-in/new"
                className="p-3 rounded-xl bg-emerald-50/60 hover:bg-emerald-100/60 border border-emerald-200 text-left transition-all group block"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs mb-1.5 shadow-2xs">
                  ₹
                </div>
                <div className="text-xs font-bold text-emerald-800">
                  Payment In
                </div>
                <div className="text-[10px] text-emerald-600">Receipt Voucher</div>
              </Link>

              <Link
                href="/sales/quotations/new"
                className="p-3 rounded-xl bg-amber-50/60 hover:bg-amber-100/60 border border-amber-200 text-left transition-all group block"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-xs mb-1.5 shadow-2xs">
                  📄
                </div>
                <div className="text-xs font-bold text-amber-800">
                  Quotation
                </div>
                <div className="text-[10px] text-amber-600">Estimate & Proforma</div>
              </Link>
            </div>
          </div>

          {/* AI Bill Scanner Dropzone */}
          <div
            onClick={() => setIsScannerModalOpen(true)}
            className="bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 border border-amber-200 rounded-2xl p-5 text-center cursor-pointer hover:border-amber-400 transition-all shadow-xs group"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-xl shadow-inner mb-3 group-hover:scale-105 transition-transform">
              📷
            </div>
            <h4 className="text-xs font-bold text-slate-900">
              AI Vendor Bill Scanner
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 max-w-[220px] mx-auto">
              Snap a paper bill or drop a PDF invoice. Our AI automatically extracts line items and taxes.
            </p>
            <span className="inline-block mt-3 px-3.5 py-1 bg-amber-600 text-white rounded-lg text-[11px] font-bold shadow-2xs group-hover:bg-amber-700 transition-colors">
              Scan Document
            </span>
          </div>
        </div>
      </div>

      {/* 4. SALES REPORT & REVENUE TRENDS (AREA CHART & METRICS) */}
      <div className="bg-white border border-[#E2E8E5] rounded-2xl shadow-xs p-4 sm:p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#26A58A]" />
            <h3 className="text-xs sm:text-sm font-extrabold text-[#1A2E2B]">
              {lang === "gu" ? "વેચાણ અહેવાલ અને પ્રવાહ (Sales Trend)" : "Sales Performance Matrix (Last 7 Days)"}
            </h3>
          </div>

          <select
            value={chartPeriod}
            onChange={(e) => setChartPeriod(e.target.value as any)}
            className="text-xs bg-[#F8FAFC] border border-[#E2E8E5] rounded-xl px-3 py-1 font-bold text-[#174B43] cursor-pointer focus:outline-none focus:border-[#26A58A] shrink-0"
          >
            <option value="Daily">Daily Breakdown</option>
            <option value="Weekly">Weekly Summary</option>
            <option value="Monthly">Monthly Rollup</option>
          </select>
        </div>

        {/* Content: 75% Area Chart + 25% Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-center">
          {/* Chart Left Column (9-col) */}
          <div className="lg:col-span-9 relative w-full overflow-hidden">
            <div className="relative w-full h-[180px] sm:h-[220px]">
              <svg
                viewBox="0 0 660 220"
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="salesTealGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#26A58A" stopOpacity="0.35" />
                    <stop offset="70%" stopColor="#26A58A" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#26A58A" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Gridlines & Y-Axis Ticks */}
                {[0, 2000, 4000, 6000, 8000, 10000, 12000, 14000].map((val) => {
                  const y = 195 - (val / 14000) * 175;
                  return (
                    <g key={val}>
                      <line
                        x1="55"
                        y1={y}
                        x2="650"
                        y2={y}
                        stroke="#F1F5F9"
                        strokeWidth="1"
                        strokeDasharray={val === 0 ? "none" : "3 3"}
                      />
                      <text
                        x="48"
                        y={y + 3.5}
                        textAnchor="end"
                        className="text-[10px] fill-[#8E9F9A] font-mono"
                      >
                        ₹{val.toLocaleString("en-IN")}
                      </text>
                    </g>
                  );
                })}

                {/* Filled Area Under Curve */}
                {areaD && <path d={areaD} fill="url(#salesTealGrad)" />}

                {/* Curved Stroke Line */}
                {pathD && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#26A58A"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Data Points */}
                {points.map((pt, idx) => (
                  <g key={idx}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={pt.data.sales > 0 ? "4" : "2.5"}
                      fill="#26A58A"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      className="cursor-pointer hover:r-6 transition-all"
                      onMouseEnter={() => setHoveredPoint(pt.data)}
                      onMouseLeave={() => setHoveredPoint(null)}
                      onTouchStart={() => setHoveredPoint(pt.data)}
                    />
                    <text
                      x={pt.x}
                      y="216"
                      textAnchor="middle"
                      className="text-[10px] fill-[#5A6B66] font-medium"
                    >
                      {pt.data.dayLabel}
                    </text>
                  </g>
                ))}
              </svg>

              {/* Tooltip on Hover */}
              {hoveredPoint && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#174B43] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-lg pointer-events-none z-10 flex items-center gap-2">
                  <span>{hoveredPoint.dayLabel} ({hoveredPoint.dateIso}):</span>
                  <span className="text-[#85D5C2] font-mono">{formatInr(hoveredPoint.sales)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats Right Column (3-col) */}
          <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4 border-t lg:border-t-0 lg:border-l border-[#E2E8E5] pt-3.5 lg:pt-0 lg:pl-6">
            <div className="bg-[#F8FAF9] p-3.5 rounded-xl border border-[#E2E8E5]">
              <p className="text-xs text-[#5A6B66] font-bold">7-Day Sales Volume</p>
              <div className="text-xl sm:text-2xl font-black text-[#1A2E2B] tracking-tight mt-1 font-mono">
                {formatInr(sevenDaysSales)}
              </div>
            </div>

            <div className="bg-[#F8FAF9] p-3.5 rounded-xl border border-[#E2E8E5]">
              <p className="text-xs text-[#5A6B66] font-bold">Invoices Generated</p>
              <div className="text-xl sm:text-2xl font-black text-[#174B43] tracking-tight mt-1 font-mono">
                {invoicesCount} Bills
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. BOTTOM RELIABILITY BANNER */}
      <div className="pt-2 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-[#5A6B66] border-t border-[#E2E8E5]">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-[#26A58A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="font-semibold">Secure Cloud Ledgers</span>
          </div>

          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-[#26A58A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold">GST & E-Way Compliant</span>
          </div>

          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-[#26A58A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="font-semibold">Realtime Analytics</span>
          </div>
        </div>

        <div className="text-[12px] font-bold text-[#174B43]">
          MyOwnBillBook Enterprise Suite
        </div>
      </div>

      {/* 6. MODALS INTEGRATION */}
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
              <h3 className="font-bold text-base text-slate-900">myownbillbook Desktop App</h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Experience ultra-fast offline billing, thermal printer driver support, barcode scanner pairing, and automatic background data backup.
            </p>
            <div className="pt-2 flex gap-3">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 bg-[#174B43] text-white text-xs font-bold rounded-xl hover:bg-[#123B35] transition-colors"
              >
                Download for Windows (x64)
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2.5 border border-slate-300 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
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
              <h3 className="font-bold text-base text-slate-900">What&apos;s New in myownbillbook</h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-[#E6F7F2] border border-[#85D5C2]/40 rounded-xl">
                <span className="font-bold text-[#174B43] block">Automated Payment Reminders</span>
                Automatic WhatsApp and SMS follow-ups for outstanding customer balances.
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="font-bold text-emerald-800 block">Digital Bill Scanner</span>
                Snap vendor paper bills or upload PDFs to auto-extract items and HSN codes into purchases.
              </div>
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2 bg-[#174B43] text-white text-xs font-bold rounded-xl hover:bg-[#133E37] transition-colors"
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
            <h3 className="font-bold text-base text-slate-900">Refer & Earn ₹500</h3>
            <p className="text-xs text-slate-600">
              Invite your fellow business owners to myownbillbook. When they subscribe to an annual plan, both of you receive ₹500 in credit.
            </p>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl font-mono text-xs font-bold text-slate-800 select-all">
              MYOWN-{user?.id?.slice(0, 6)?.toUpperCase() || "BILL500"}
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 bg-[#174B43] text-white text-xs font-bold rounded-xl hover:bg-[#123B35] transition-colors"
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
              <h3 className="font-bold text-base text-slate-900">Priority Support & Assistance</h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Our accounting and billing specialists are available 7 days a week (9 AM to 8 PM).
            </p>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Customer Care Hotline</span>
                  <span className="text-slate-500 font-mono">+91 9510442798</span>
                </div>
                <a
                  href="tel:+919510442798"
                  className="px-3 py-1 bg-[#174B43] text-white rounded-lg font-bold text-[11px]"
                >
                  Call Now
                </a>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-emerald-900 block">WhatsApp Support Desk</span>
                  <span className="text-emerald-700 text-[11px]">Instant response</span>
                </div>
                <a
                  href="https://wa.me/919510442798"
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
              <h3 className="font-bold text-base text-slate-900">Upgrade to Annual Plan (Save 65%)</h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Get unlimited GST invoices, multi-branch access, automated WhatsApp reminders, and dedicated account manager support.
            </p>
            <div className="bg-gradient-to-r from-[#E6F7F2] to-white p-4 border border-[#85D5C2]/50 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#174B43]">Enterprise Annual Suite</span>
                <span className="font-bold text-[#26A58A] text-sm font-mono">₹4,999 / year</span>
              </div>
              <p className="text-[11px] text-[#5A6B66]">Includes all modules with zero setup fee.</p>
            </div>
            <div className="flex gap-2">
              <a
                href="https://wa.me/919510442798?text=I%20want%20to%20upgrade%20to%20Annual%20Plan%20with%2065%25%20discount"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 bg-[#174B43] text-white text-center text-xs font-bold rounded-xl hover:bg-[#123B35] transition-colors"
              >
                Connect with Sales
              </a>
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2.5 border border-slate-300 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-50"
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
      <div className="h-screen w-full flex items-center justify-center bg-[#F6F7F1] p-4 text-center">
        <div className="flex flex-col items-center gap-3 max-w-sm">
          <div className="w-9 h-9 border-3 border-[#26A58A] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-[#174B43] tracking-tight">Loading myownbillbook...</span>
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
                  className="px-3 py-1.5 text-xs font-semibold bg-[#26A58A] text-white rounded-lg hover:bg-[#208E76] transition-colors"
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

  // If authenticated, render executive business operational dashboard
  return <DashboardContent />;
}
