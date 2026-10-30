"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/auth-context";
import { apiClient, extractList } from "../lib/api-client";
import { IntroductionPage } from "../components/landing/introduction-page";
import { BillScannerModal } from "./purchases/components/bill-scanner-modal";

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

function formatInr(val: number | string): string {
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "0";
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(num);
}

function DashboardContent() {
  const router = useRouter();
  const { lang, tenantContext, user } = useAuth();

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
  const [scanType, setScanType] = useState<"sales" | "purchase">("purchase");
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
      // Clean, single-purpose Dashboard APIs (unified all-transactions with limit: 5, sortBy: "date", sortOrder: "desc")
      const [finRes, txnsRes, chartRes]: any = await Promise.all([
        apiClient.get("/dashboard/summary").catch(() => null),
        apiClient.get("/dashboard/all-transactions", { page: 1, limit: 5, sortBy: "date", sortOrder: "desc" }).catch(() => null),
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

      // 2. Process Transactions (from unified /dashboard/all-transactions endpoint)
      const txnList = txnsRes?.items || txnsRes?.transactions || [];
      if (Array.isArray(txnList) && txnList.length > 0) {
        setTransactions(
          txnList.slice(0, 5).map((t: any, idx: number) => {
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

      // 3. Process 7-day Sales Report chart (from /dashboard/sales-overview)
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

  return (
    <div className="space-y-4 sm:space-y-5 pb-8 min-w-0 max-w-full">
      {/* ─────────────────────────────────────────────────────────────
          1. DASHBOARD TOP HEADER BAR
      ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-1 gap-2">
        <h1 className="text-base sm:text-lg md:text-xl font-bold text-slate-800 tracking-tight shrink-0">
          Dashboard
        </h1>

        {/* Action Icons Matching MyBillBook Topbar */}
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 text-slate-500">
          {/* Desktop App (hidden on small mobile screens since it's an .exe installer) */}
          <button
            type="button"
            onClick={() => setActiveModal("desktop")}
            className="hidden sm:inline-flex p-1.5 sm:p-2 rounded-lg hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Desktop App"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>

          {/* Announcements / Megaphone */}
          <button
            type="button"
            onClick={() => setActiveModal("announcements")}
            className="p-1.5 sm:p-2 rounded-lg hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Announcements & Updates"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </button>

          {/* Gift Box / Rewards */}
          <button
            type="button"
            onClick={() => setActiveModal("gift")}
            className="p-1.5 sm:p-2 rounded-lg hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Refer & Earn"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V6a2 2 0 10-2 2h2zm0 0h8.4a.6.6 0 01.6.6v3.8a.6.6 0 01-.6.6H3.6a.6.6 0 01-.6-.6V8.6a.6.6 0 01.6-.6H12zm-8.4 5H20.4M5 13v7.4a.6.6 0 00.6.6h12.8a.6.6 0 00.6-.6V13" />
            </svg>
          </button>

          {/* Headset / Support */}
          <button
            type="button"
            onClick={() => setActiveModal("support")}
            className="p-1.5 sm:p-2 rounded-lg hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Help & Support"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </button>

          {/* WhatsApp Support */}
          <a
            href="https://wa.me/919510442798?text=Hello%20Support%20myownbillbook"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 sm:p-2 rounded-lg hover:text-emerald-600 hover:bg-slate-100 transition-colors"
            title="WhatsApp Support"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.031 2C6.494 2 2 6.494 2 12.031c0 1.808.48 3.518 1.319 5.008L2 22l5.12-1.309c1.442.793 3.096 1.24 4.911 1.24 5.538 0 10.031-4.494 10.031-10.031S17.569 2 12.031 2zm5.82 14.28c-.244.686-1.42 1.314-1.956 1.37-.506.052-1.15.074-3.321-.822-2.775-1.144-4.54-3.957-4.678-4.143-.138-.186-1.12-1.492-1.12-2.846s.707-2.02.959-2.296c.244-.268.532-.336.71-.336.177 0 .355.002.51.01.164.009.384-.062.6.457.222.533.754 1.84.82 1.974.066.134.11.29.022.468-.088.177-.132.288-.266.443-.133.155-.28.347-.399.466-.134.133-.273.278-.118.544.155.266.69 1.137 1.48 1.84 1.016.906 1.874 1.186 2.14 1.319.266.133.422.11.577-.067.155-.177.666-.776.844-1.042.177-.266.355-.222.6-.133.244.089 1.554.733 1.82 1.022.266.289.444.422.51.533.067.11.067.644-.177 1.33z" />
            </svg>
          </a>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. BUSINESS OVERVIEW SECTION & 4 METRIC SUMMARY CARDS
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0">
          <h2 className="text-sm font-bold text-[#1A2E2B] tracking-tight">
            Business Overview
          </h2>
          <div className="flex items-center gap-2 text-xs text-[#5A6B66]">
            <span>Last Update: {lastUpdate || "23 Oct 2026 | 05:42 PM"}</span>
            <button
              type="button"
              onClick={fetchDashboardData}
              disabled={isRefreshing}
              className="p-1 hover:text-[#174B43] transition-colors cursor-pointer"
              title="Refresh Dashboard"
            >
              <svg
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#26A58A]" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* 4 Metric Summary Cards matching reference design */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: To Collect */}
          <Link
            href="/masters/parties?filter=receivable"
            className="bg-white border border-[#E2E8E5] rounded-2xl p-4 sm:p-5 hover:border-[#26A58A]/60 hover:shadow-xs transition-all block group relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#E6F7F2] text-[#174B43] flex items-center justify-center font-bold text-xs shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-[#5A6B66]">To Collect</span>
              </div>
              <span className="text-[#8E9F9A] group-hover:text-[#174B43] transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7m0 0H7m10 0v10" />
                </svg>
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-[#1A2E2B] mt-2.5 tracking-tight font-mono">
              ₹ {formatInr(toCollect)}
            </div>
            <div className="mt-2 text-[11px] text-[#5A6B66] font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#26A58A]"></span>
              <span>Open receivables</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#26A58A] opacity-80" />
          </Link>

          {/* Card 2: To Pay */}
          <Link
            href="/masters/parties?filter=payable"
            className="bg-white border border-[#E2E8E5] rounded-2xl p-4 sm:p-5 hover:border-amber-400/60 hover:shadow-xs transition-all block group relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center font-bold text-xs shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-[#5A6B66]">To Pay</span>
              </div>
              <span className="text-[#8E9F9A] group-hover:text-amber-600 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7m0 0H7m10 0v10" />
                </svg>
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-[#1A2E2B] mt-2.5 tracking-tight font-mono">
              ₹ {formatInr(toPay)}
            </div>
            <div className="mt-2 text-[11px] text-[#5A6B66] font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span>Pending payables</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-400 opacity-80" />
          </Link>

          {/* Card 3: Total Cash + Bank Balance */}
          <Link
            href="/finance/cash-bank"
            className="bg-white border border-[#E2E8E5] rounded-2xl p-4 sm:p-5 hover:border-[#174B43]/50 hover:shadow-xs transition-all block group relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#E6F7F2] text-[#174B43] flex items-center justify-center font-bold text-xs shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-[#5A6B66] truncate">Cash + Bank Balance</span>
              </div>
              <span className="text-[#8E9F9A] group-hover:text-[#174B43] transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7m0 0H7m10 0v10" />
                </svg>
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-[#1A2E2B] mt-2.5 tracking-tight font-mono">
              ₹ {formatInr(cashBankBalance)}
            </div>
            <div className="mt-2 text-[11px] text-[#174B43] font-semibold flex items-center gap-1 group-hover:underline">
              <span>View details</span>
              <span>→</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#174B43] opacity-80" />
          </Link>

          {/* Card 4: Total Sales (7 Days) */}
          <div className="bg-white border border-[#E2E8E5] rounded-2xl p-4 sm:p-5 hover:border-[#26A58A]/60 hover:shadow-xs transition-all block group relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#E6F7F2] text-[#26A58A] flex items-center justify-center font-bold text-xs shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-[#5A6B66] truncate">Total Sales (7 Days)</span>
              </div>
              {/* Mini Sparkline SVG */}
              <svg className="w-14 h-5 text-[#26A58A]" viewBox="0 0 56 20" fill="none">
                <path d="M 2 16 Q 14 14, 24 8 T 40 10 T 54 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-xl sm:text-2xl font-black text-[#1A2E2B] mt-2.5 tracking-tight font-mono">
              ₹ {formatInr(sevenDaysSales)}
            </div>
            <div className="mt-2 text-[11px] text-[#26A58A] font-semibold flex items-center gap-1">
              <span>↑ +12% from last week</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#26A58A] opacity-80" />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MIDDLE SECTION: LATEST TRANSACTIONS & SCAN & RECORD BILLS
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4.5 items-start">
        {/* Left Column: Latest Transactions (col-span-8) */}
        <div className="lg:col-span-8 bg-white border border-[#E2E8E5] rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-[#E2E8E5] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#1A2E2B]">Latest Transactions</h3>
              <Link
                href="/app/home/vouchers/all_transactions"
                className="text-xs font-semibold text-[#174B43] hover:text-[#26A58A] transition-colors flex items-center gap-1"
              >
                <span>View All</span>
                <span>→</span>
              </Link>
            </div>

            {/* Mobile View (< sm): Clean Touch-friendly Card List */}
            <div className="divide-y divide-[#E2E8E5] sm:hidden">
              {transactions.slice(0, 5).map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => tx.link && router.push(tx.link)}
                  className="p-3.5 active:bg-[#F6F7F1] transition-colors flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-bold text-[#1A2E2B] truncate">
                        {tx.partyName}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#E6F7F2] text-[#174B43] whitespace-nowrap">
                        {tx.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#5A6B66] font-mono">
                      <span>{tx.txnNo}</span>
                      <span>•</span>
                      <span>{tx.date}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold font-mono text-[#1A2E2B] block">
                      ₹ {formatInr(tx.amount)}
                    </span>
                    <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#E6F7F2] text-[#15805E]">
                      Paid
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View (>= sm): Full Data Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8E5] bg-[#F8FAF9] text-[11px] font-bold text-[#5A6B66] uppercase tracking-wider">
                    <th className="px-5 py-3 font-bold">DATE</th>
                    <th className="px-5 py-3 font-bold">TYPE</th>
                    <th className="px-5 py-3 font-bold">TXN NO</th>
                    <th className="px-5 py-3 font-bold">PARTY NAME</th>
                    <th className="px-5 py-3 font-bold text-right">AMOUNT</th>
                    <th className="px-5 py-3 font-bold text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8E5] text-[#1A2E2B]">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-xs text-[#8E9F9A]">
                        No transactions recorded yet
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        onClick={() => tx.link && router.push(tx.link)}
                        className="hover:bg-[#F6F7F1]/80 transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-3 whitespace-nowrap text-[#1A2E2B] font-medium">
                          {tx.date}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-md bg-[#E6F7F2] text-[#174B43]">
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap font-mono text-[#5A6B66]">
                          {tx.txnNo}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-[#1A2E2B] font-semibold truncate max-w-[180px]">
                          {tx.partyName}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-right font-mono font-bold text-[#1A2E2B]">
                          ₹ {formatInr(tx.amount)}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-center">
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E6F7F2] text-[#15805E] border border-[#85D5C2]/40">
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

          <div className="border-t border-[#E2E8E5] p-2.5 text-center hidden sm:block">
            <Link
              href="/app/home/vouchers/all_transactions"
              className="text-xs font-semibold text-[#174B43] hover:text-[#26A58A] transition-colors inline-block py-1"
            >
              See All Transactions →
            </Link>
          </div>
        </div>

        {/* Right Column: Scan & Record Bills + Promo Card (col-span-4) */}
        <div className="lg:col-span-4 space-y-3.5 sm:space-y-4">
          {/* Card A: Scan & Record Bills */}
          <div className="bg-white border border-[#E2E8E5] rounded-2xl shadow-xs p-4 sm:p-5 flex flex-col justify-between space-y-3.5 sm:space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#174B43] text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1A2E2B] leading-tight">
                    Scan & Record Bills
                  </h3>
                  <p className="text-[11px] text-[#26A58A] font-medium flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#26A58A] inline-block" /> High-Accuracy OCR Engine
                  </p>
                </div>
              </div>

              <span className="bg-[#B69A61] text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1 shadow-xs">
                <span>✦</span> FREE • 3D Left
              </span>
            </div>

            {/* Toggle Pills: Create Sales | Create Purchase */}
            <div className="bg-[#F6F7F1] p-1 rounded-xl flex items-center gap-1 border border-[#E2E8E5]">
              <button
                type="button"
                onClick={() => setScanType("sales")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${scanType === "sales"
                    ? "bg-white text-[#174B43] border border-[#26A58A]/50 shadow-2xs font-bold"
                    : "text-[#5A6B66] hover:text-[#174B43]"
                  }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Create Sales</span>
              </button>

              <button
                type="button"
                onClick={() => setScanType("purchase")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${scanType === "purchase"
                    ? "bg-white text-[#174B43] border border-[#26A58A]/50 shadow-2xs font-bold"
                    : "text-[#5A6B66] hover:text-[#174B43]"
                  }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span>Create Purchase</span>
              </button>
            </div>

            {/* Drag & Drop / Tap Upload Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => setIsScannerModalOpen(true)}
              className={`border-2 border-dashed rounded-xl p-5 sm:p-7 text-center transition-all cursor-pointer flex flex-col items-center justify-center group active:scale-[0.99] ${isDragging
                  ? "border-[#26A58A] bg-[#E6F7F2]"
                  : "border-[#85D5C2] bg-[#F7FBF9] hover:bg-[#EBF7F4] hover:border-[#26A58A]"
                }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
              />
              <div className="w-10 h-10 rounded-full bg-[#E6F7F2] text-[#26A58A] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="font-bold text-xs text-[#174B43] tracking-tight">
                Tap to Upload or Drag & Drop
              </p>
              <p className="text-[10px] text-[#5A6B66] mt-0.5">
                (PDF, JPG, JPEG & PNG supported, max 5MB)
              </p>
            </div>
          </div>

          {/* Card B: Grow Your Business With MyOwnBillBook (matching reference design) */}
          <div className="bg-white border border-[#E2E8E5] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
            <h4 className="font-bold text-xs text-[#1A2E2B] tracking-tight">
              Grow Your Business With MyOwnBillBook
            </h4>
            <ul className="space-y-1.5 text-[11px] text-[#5A6B66]">
              <li className="flex items-center gap-1.5">
                <span className="text-[#26A58A] font-bold">✓</span>
                <span>GST Ready Billing & E-Way Bills</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-[#26A58A] font-bold">✓</span>
                <span>Inventory & Low Stock Alerts</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-[#26A58A] font-bold">✓</span>
                <span>Accounting & Profit Reports</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-[#26A58A] font-bold">✓</span>
                <span>Multi-User & Multi-Branch Access</span>
              </li>
            </ul>
            <button
              type="button"
              onClick={() => setActiveModal("sales")}
              className="w-full py-2 px-4 rounded-xl bg-[#B69A61] hover:bg-[#9E824B] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer mt-1"
            >
              <span>Upgrade Now</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. BOTTOM SECTION: SALES REPORT (AREA CHART & METRICS)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#E2E8E5] rounded-2xl shadow-xs p-4 sm:p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs sm:text-sm font-bold text-[#1A2E2B] truncate">
            Sales Report (Last 7 Days)
          </h3>

          <select
            value={chartPeriod}
            onChange={(e) => setChartPeriod(e.target.value as any)}
            className="text-xs bg-[#F6F7F1] border border-[#E2E8E5] rounded-lg px-2.5 py-1 font-semibold text-[#174B43] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#26A58A] shrink-0"
          >
            <option value="Daily">Daily</option>
            <option value="Weekly">Weekly</option>
            <option value="Monthly">Monthly</option>
          </select>
        </div>

        {/* Content: 75% Area Chart + 25% Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-center">
          {/* Chart Left Column (lg:col-span-9) */}
          <div className="lg:col-span-9 relative w-full overflow-hidden">
            {/* SVG Chart */}
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
                        stroke="#EBF0EE"
                        strokeWidth="1"
                        strokeDasharray={val === 0 ? "none" : "3 3"}
                      />
                      <text
                        x="48"
                        y={y + 3.5}
                        textAnchor="end"
                        className="text-[10px] fill-[#8E9F9A] font-mono"
                      >
                        ₹ {formatInr(val)}
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
                    {/* X-axis Day Label */}
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

              {/* Tooltip on Hover / Touch */}
              {hoveredPoint && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#174B43] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-lg pointer-events-none z-10 flex items-center gap-2">
                  <span>{hoveredPoint.dayLabel} ({hoveredPoint.dateIso}):</span>
                  <span className="text-[#85D5C2] font-mono">₹ {formatInr(hoveredPoint.sales)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats Right Column (lg:col-span-3) - Responsive 2-col on mobile */}
          <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4 border-t lg:border-t-0 lg:border-l border-[#E2E8E5] pt-3.5 lg:pt-0 lg:pl-6">
            <div className="bg-[#F6F7F1] lg:bg-transparent p-3 lg:p-0 rounded-xl border border-[#E2E8E5] lg:border-0">
              <p className="text-xs text-[#5A6B66] font-medium">Last 7 days sales</p>
              <div className="text-lg sm:text-2xl lg:text-3xl font-black text-[#1A2E2B] tracking-tight mt-0.5 sm:mt-1 font-mono">
                ₹ {formatInr(sevenDaysSales)}
              </div>
            </div>

            <div className="bg-[#F6F7F1] lg:bg-transparent p-3 lg:p-0 rounded-xl border border-[#E2E8E5] lg:border-0">
              <p className="text-xs text-[#5A6B66] font-medium">Invoices Made</p>
              <div className="text-lg sm:text-2xl lg:text-3xl font-black text-[#1A2E2B] tracking-tight mt-0.5 sm:mt-1 font-mono">
                {invoicesCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. BOTTOM TRUST & RELIABILITY STRIP (Reference Design Footer)
      ───────────────────────────────────────────────────────────── */}
      <div className="pt-2 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-[#5A6B66] border-t border-[#E2E8E5]">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-[#26A58A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="font-semibold">Secure & Reliable</span>
          </div>

          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-[#26A58A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold">GST Compliant</span>
          </div>

          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-[#26A58A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="font-semibold">Fast & Responsive</span>
          </div>

          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-[#26A58A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="font-semibold">Works on All Devices</span>
          </div>
        </div>

        <div className="text-[13px] font-serif italic text-[#174B43] tracking-wide">
          Your Business, Our Priority
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          6. MODALS INTEGRATION
      ───────────────────────────────────────────────────────────── */}
      {/* Bill Scanner Modal */}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
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
                className="flex-1 py-2.5 bg-[#26A58A] text-white text-xs font-bold rounded-xl hover:bg-[#208E76] transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
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
              className="w-full py-2.5 bg-[#26A58A] text-white text-xs font-bold rounded-xl hover:bg-[#208E76] transition-colors"
            >
              Copy Referral Link
            </button>
          </div>
        </div>
      )}

      {/* Support Modal */}
      {activeModal === "support" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
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
                  <span className="font-bold text-slate-900 block">Toll-Free Customer Care</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
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
                className="flex-1 py-2.5 bg-[#26A58A] text-white text-center text-xs font-bold rounded-xl hover:bg-[#208E76] transition-colors"
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

  // If authenticated, render standard business operational dashboard
  return <DashboardContent />;
}
