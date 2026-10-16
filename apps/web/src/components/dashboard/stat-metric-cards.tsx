"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "../../context/auth-context";

interface StatMetricCardsProps {
  totalSales: number;
  totalInvoices: number;
  totalReceivables: number;
  stockValuation: number;
  lowStockCount: number;
  isLoading?: boolean;
}

function formatInr(val: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(val || 0);
}

// Wave Area Sparklines for bottom right of stat cards
function WaveSparkline({
  strokeColor,
  gradientId,
  startColor,
  stopColor,
}: {
  strokeColor: string;
  gradientId: string;
  startColor: string;
  stopColor: string;
}) {
  return (
    <div className="absolute right-0 bottom-0 w-24 sm:w-32 h-10 sm:h-14 pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
      <svg viewBox="0 0 120 50" preserveAspectRatio="none" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={startColor} stopOpacity="0.4" />
            <stop offset="100%" stopColor={stopColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path
          d="M0,45 C20,38 40,42 60,30 C80,18 100,24 120,8 L120,50 L0,50 Z"
          fill={`url(#${gradientId})`}
        />
        <path
          d="M0,45 C20,38 40,42 60,30 C80,18 100,24 120,8"
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function StatMetricCards({
  totalSales,
  totalInvoices,
  totalReceivables,
  stockValuation,
  lowStockCount,
  isLoading,
}: StatMetricCardsProps) {
  const { lang } = useAuth();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5 min-w-0">
      {/* 1. TOTAL SALES */}
      <Link
        href="/reports?tab=sales"
        className="group relative bg-white hover:bg-slate-50/60 border border-[#E5E7EB] hover:border-[#F47721]/60 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between min-h-[125px] sm:min-h-[135px]"
      >
        <div className="flex items-start justify-between gap-3 z-10">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#FFF3E8] text-[#F47721] flex items-center justify-center shrink-0 shadow-xs">
            <span className="font-bold text-base sm:text-lg">₹</span>
          </div>
          <span className="text-xs text-[#9CA3AF] group-hover:text-[#F47721] transition-colors">↗</span>
        </div>

        <div className="mt-2 z-10">
          <div className="text-[11px] sm:text-xs font-semibold text-[#6B7280] uppercase tracking-wider truncate">
            {lang === "gu" ? "કુલ વેચાણ (Sales)" : "Total Sales"}
          </div>
          <div className="text-xl sm:text-2xl lg:text-[1.65rem] font-extrabold font-mono text-[#111827] tracking-tight truncate my-0.5">
            {isLoading ? "..." : formatInr(totalSales)}
          </div>
          <div className="text-xs text-[#6B7280] font-medium truncate">
            {totalInvoices} {lang === "gu" ? "બિલ બનેલા છે" : "Invoices Issued"}
          </div>
        </div>

        <WaveSparkline
          strokeColor="#F47721"
          gradientId="salesWave"
          startColor="#F47721"
          stopColor="#FED7AA"
        />
      </Link>

      {/* 2. RECEIVABLES */}
      <Link
        href="/reports?tab=outstanding&partyType=CUSTOMER"
        className="group relative bg-white hover:bg-slate-50/60 border border-[#E5E7EB] hover:border-[#3B82F6]/60 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between min-h-[125px] sm:min-h-[135px]"
      >
        <div className="flex items-start justify-between gap-3 z-10">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center shrink-0 shadow-xs">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-xs text-[#9CA3AF] group-hover:text-[#3B82F6] transition-colors">↗</span>
        </div>

        <div className="mt-2 z-10">
          <div className="text-[11px] sm:text-xs font-semibold text-[#6B7280] uppercase tracking-wider truncate">
            {lang === "gu" ? "ઉઘરાણી બાકી (લેણું)" : "Receivables"}
          </div>
          <div className="text-xl sm:text-2xl lg:text-[1.65rem] font-extrabold font-mono text-[#111827] tracking-tight truncate my-0.5">
            {isLoading ? "..." : formatInr(totalReceivables)}
          </div>
          <div className="text-xs text-[#6B7280] font-medium truncate">
            {lang === "gu" ? "ગ્રાહકો પાસેથી બાકી રકમ" : "Customer balance"}
          </div>
        </div>

        <WaveSparkline
          strokeColor="#3B82F6"
          gradientId="recWave"
          startColor="#3B82F6"
          stopColor="#BFDBFE"
        />
      </Link>

      {/* 3. STOCK VALUATION */}
      <Link
        href="/reports?tab=stock"
        className="group relative bg-white hover:bg-slate-50/60 border border-[#E5E7EB] hover:border-[#9333EA]/60 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between min-h-[125px] sm:min-h-[135px]"
      >
        <div className="flex items-start justify-between gap-3 z-10">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#FAF5FF] text-[#9333EA] flex items-center justify-center shrink-0 shadow-xs">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <span className="text-xs text-[#9CA3AF] group-hover:text-[#9333EA] transition-colors">↗</span>
        </div>

        <div className="mt-2 z-10">
          <div className="text-[11px] sm:text-xs font-semibold text-[#6B7280] uppercase tracking-wider truncate">
            {lang === "gu" ? "સ્ટોકની કુલ કિંમત" : "Stock Valuation"}
          </div>
          <div className="text-xl sm:text-2xl lg:text-[1.65rem] font-extrabold font-mono text-[#111827] tracking-tight truncate my-0.5">
            {isLoading ? "..." : formatInr(stockValuation)}
          </div>
          <div className="text-xs text-[#6B7280] font-medium truncate">
            {lang === "gu" ? "ગોડાઉન સ્ટોક પડતર ભાવે" : "Closing stock at cost"}
          </div>
        </div>

        <WaveSparkline
          strokeColor="#9333EA"
          gradientId="stockWave"
          startColor="#9333EA"
          stopColor="#E9D5FF"
        />
      </Link>

      {/* 4. LOW STOCK ALERT */}
      <Link
        href="/inventory/stock?filter=low"
        className="group relative bg-white hover:bg-rose-50/40 border border-[#E5E7EB] hover:border-rose-300 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between min-h-[125px] sm:min-h-[135px]"
      >
        <div className="flex items-start justify-between gap-3 z-10">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#FEF2F2] text-[#EF4444] flex items-center justify-center shrink-0 shadow-xs">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M9 5l7 7-7 7" />
          </svg>
        </div>

        <div className="mt-2 z-10">
          <div className="text-[11px] sm:text-xs font-semibold text-[#6B7280] uppercase tracking-wider truncate">
            {lang === "gu" ? "ઓછો સ્ટોક ચેતવણી" : "Low Stock Alert"}
          </div>
          <div className="text-xl sm:text-2xl lg:text-[1.65rem] font-extrabold font-mono text-[#111827] tracking-tight truncate my-0.5">
            {isLoading ? "..." : `${lowStockCount} Items`}
          </div>
          <div className="text-xs text-rose-600 font-medium truncate">
            {lowStockCount > 0 ? (lang === "gu" ? "તરત ઓર્ડર આપવો જરૂરી" : "Needs reorder soon") : (lang === "gu" ? "સ્ટોક પૂરતો છે" : "Stock is healthy")}
          </div>
        </div>
      </Link>
    </div>
  );
}
