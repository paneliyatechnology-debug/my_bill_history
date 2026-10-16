"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "../../context/auth-context";
import { apiClient } from "../../lib/api-client";
import type { FinancialSummaryDto } from "@billing/shared-types";

/**
 * Formats numeric values to Indian Rupee (INR) representation:
 * e.g., 18727734.00 -> ₹1,87,27,734.00
 * Handles genuine negative balances without clamping: -5000.00 -> -₹5,000.00
 */
export function formatInrCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "₹0.00";

  const isNegative = num < 0;
  const absValue = Math.abs(num);

  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absValue);

  return `${isNegative ? "-" : ""}₹${formatted}`;
}

// Mini waveform bar component for the 3 cards
function SparklineBars({ colorClass }: { colorClass: string }) {
  const heights = [10, 16, 12, 22, 18, 26, 20, 28, 24, 30, 22, 26, 20, 24];
  return (
    <div className="flex items-end gap-1 h-8 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
      {heights.map((h, i) => (
        <span
          key={i}
          style={{ height: `${h}px` }}
          className={`w-1 rounded-full ${colorClass} transition-all duration-300 group-hover:scale-y-105`}
        />
      ))}
    </div>
  );
}

export interface FinancialSummaryCardsProps {
  asOfDate?: string;
}

export function FinancialSummaryCards({ asOfDate }: FinancialSummaryCardsProps = {}) {
  const { lang, tenantContext } = useAuth();

  const [summary, setSummary] = useState<FinancialSummaryDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!tenantContext.companyId) return;

    setIsLoading(true);
    setError(null);

    try {
      const queryParams = asOfDate ? { asOfDate } : undefined;
      const data: any = await apiClient
        .get("/reports/financial-summary", queryParams)
        .catch(() => apiClient.get("/reports/dashboard-summary", queryParams));

      if (data && typeof data.toCollect !== "undefined") {
        setSummary(data);
      } else {
        throw new Error("Invalid financial summary payload received.");
      }
    } catch (err: any) {
      console.error("[FinancialSummaryCards] Failed to fetch financial summary:", err);
      setError(
        lang === "gu"
          ? "નાણાકીય વિગતો લોડ કરવામાં નિષ્ફળ. કૃપા કરીને ફરી પ્રયાસ કરો."
          : "Unable to load live financial summary. Please check connection and retry."
      );
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, [tenantContext.companyId, lang, asOfDate]);

  useEffect(() => {
    fetchSummary();

    const handleRefresh = () => {
      fetchSummary();
    };

    window.addEventListener("billing_company_switched", handleRefresh);
    window.addEventListener("billing_transaction_posted", handleRefresh);
    window.addEventListener("billing_invoice_created", handleRefresh);
    window.addEventListener("billing_payment_posted", handleRefresh);
    window.addEventListener("focus", handleRefresh);

    return () => {
      window.removeEventListener("billing_company_switched", handleRefresh);
      window.removeEventListener("billing_transaction_posted", handleRefresh);
      window.removeEventListener("billing_invoice_created", handleRefresh);
      window.removeEventListener("billing_payment_posted", handleRefresh);
      window.removeEventListener("focus", handleRefresh);
    };
  }, [fetchSummary]);

  // Loading skeleton state
  if (isLoading && !summary) {
    return (
      <div
        data-testid="financial-summary-skeleton"
        className="grid grid-cols-1 md:grid-cols-3 gap-5 min-w-0"
      >
        <div className="bg-[#F0FDF4]/70 border border-[#BBF7D0] rounded-2xl p-5 shadow-xs flex flex-col justify-between animate-pulse min-h-[175px]">
          <div className="flex items-center justify-between">
            <div className="h-5 bg-[#BBF7D0] rounded w-36"></div>
            <div className="w-8 h-8 rounded-lg bg-[#BBF7D0]/60"></div>
          </div>
          <div className="my-3 h-10 bg-[#BBF7D0] rounded w-52"></div>
          <div className="h-4 bg-[#BBF7D0]/60 rounded w-44"></div>
        </div>

        <div className="bg-[#FEF2F2]/70 border border-[#FECDD3] rounded-2xl p-5 shadow-xs flex flex-col justify-between animate-pulse min-h-[175px]">
          <div className="flex items-center justify-between">
            <div className="h-5 bg-[#FECDD3] rounded w-32"></div>
            <div className="w-8 h-8 rounded-lg bg-[#FECDD3]/60"></div>
          </div>
          <div className="my-3 h-10 bg-[#FECDD3] rounded w-48"></div>
          <div className="h-4 bg-[#FECDD3]/60 rounded w-40"></div>
        </div>

        <div className="bg-[#F0F9FF]/70 border border-[#BAE6FD] rounded-2xl p-5 shadow-xs flex flex-col justify-between animate-pulse min-h-[175px]">
          <div className="flex items-center justify-between">
            <div className="h-5 bg-[#BAE6FD] rounded w-40"></div>
            <div className="w-8 h-8 rounded-lg bg-[#BAE6FD]/60"></div>
          </div>
          <div className="my-3 h-10 bg-[#BAE6FD] rounded w-56"></div>
          <div className="h-4 bg-[#BAE6FD]/60 rounded w-48"></div>
        </div>
      </div>
    );
  }

  // Error / Retry state
  if (error && !summary) {
    return (
      <div
        data-testid="financial-summary-error"
        className="p-5 bg-rose-50 border border-rose-200 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-rose-800"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-100 rounded-xl text-rose-600 shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-sm sm:text-base">
              {lang === "gu" ? "નાણાકીય સારાંશ લોડ થઈ શક્યો નથી" : "Financial Summary Unavailable"}
            </div>
            <div className="text-xs text-rose-600 mt-0.5">{error}</div>
          </div>
        </div>

        <button
          onClick={fetchSummary}
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{lang === "gu" ? "ફરી પ્રયાસ કરો (Retry)" : "Retry"}</span>
        </button>
      </div>
    );
  }

  const toCollect = summary?.toCollect ?? "0.00";
  const toPay = summary?.toPay ?? "0.00";
  const cashBalance = summary?.cashBalance ?? "0.00";
  const bankBalance = summary?.bankBalance ?? "0.00";
  const totalCashBank = summary?.totalCashBankBalance ?? "0.00";

  return (
    <div
      data-testid="financial-summary-cards"
      className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-5 min-w-0"
    >
      {/* 1. CUSTOMER RECEIVABLES (Green Card) */}
      <Link
        href="/reports?tab=outstanding&partyType=CUSTOMER"
        className="group relative bg-[#F0FDF4] hover:bg-[#DCFCE7]/70 border border-[#BBF7D0] hover:border-[#86EFAC] rounded-2xl p-4 sm:p-5 lg:p-6 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden min-h-[160px] sm:min-h-[175px]"
        title={lang === "gu" ? "ગ્રાહકો પાસેથી ઉઘરાણી બાકી જુઓ" : "View Customer Outstanding Balances"}
      >
        {/* Top: Icon + Label + Secondary Icon */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center shrink-0 shadow-xs">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-[#14532D] truncate">
                {lang === "gu" ? "ઉઘરાણી બાકી (Receivables)" : "Customer Receivables"}
              </div>
              <div className="text-xs text-[#16A34A] font-medium truncate">
                {lang === "gu" ? "ગ્રાહકો પાસેથી લેવાના બાકી" : "Amount to be collected"}
              </div>
            </div>
          </div>

          <div className="p-1.5 rounded-lg bg-[#DCFCE7] text-[#16A34A] shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>

        {/* Middle: Huge Amount */}
        <div className="my-2 sm:my-2.5">
          <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-mono text-[#15803D] tracking-tight truncate">
            {formatInrCurrency(toCollect)}
          </div>
        </div>

        {/* Lower Middle: Trend Badge & Mini Bar Sparkline */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] text-xs font-bold shrink-0">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span>12%</span>
            <span className="text-[10px] font-normal text-[#16A34A]">vs last month</span>
          </span>

          <SparklineBars colorClass="bg-[#86EFAC]" />
        </div>

        {/* Footer: View Details Link */}
        <div className="pt-2.5 border-t border-[#BBF7D0]/70 flex items-center justify-end text-xs font-bold text-[#15803D] group-hover:text-[#166534]">
          <span className="group-hover:underline flex items-center gap-1">
            {lang === "gu" ? "વિગતો જુઓ" : "View Details"}
            <span aria-hidden="true">&rarr;</span>
          </span>
        </div>
      </Link>

      {/* 2. SUPPLIER PAYABLES (Light Red Card) */}
      <Link
        href="/reports?tab=outstanding&partyType=SUPPLIER"
        className="group relative bg-[#FEF2F2] hover:bg-[#FEE2E2]/70 border border-[#FECDD3] hover:border-[#FCA5A5] rounded-2xl p-4 sm:p-5 lg:p-6 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden min-h-[160px] sm:min-h-[175px]"
        title={lang === "gu" ? "વેપારીઓને ચૂકવવાના બાકી નાણાં જુઓ" : "View Supplier Outstanding Payables"}
      >
        {/* Top: Icon + Label + Secondary Icon */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0 shadow-xs">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-[#7F1D1D] truncate">
                {lang === "gu" ? "ચૂકવવાના બાકી (Payables)" : "Supplier Payables"}
              </div>
              <div className="text-xs text-[#DC2626] font-medium truncate">
                {lang === "gu" ? "સપ્લાયર્સને આપવાના બાકી" : "Amount to be paid"}
              </div>
            </div>
          </div>

          <div className="p-1.5 rounded-lg bg-[#FEE2E2] text-[#DC2626] shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
            </svg>
          </div>
        </div>

        {/* Middle: Huge Amount */}
        <div className="my-2 sm:my-2.5">
          <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-mono text-[#DC2626] tracking-tight truncate">
            {formatInrCurrency(toPay)}
          </div>
        </div>

        {/* Lower Middle: Trend Badge & Mini Bar Sparkline */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FEE2E2] text-[#B91C1C] text-xs font-bold shrink-0">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span>8%</span>
            <span className="text-[10px] font-normal text-[#DC2626]">vs last month</span>
          </span>

          <SparklineBars colorClass="bg-[#FCA5A5]" />
        </div>

        {/* Footer: View Details Link */}
        <div className="pt-2.5 border-t border-[#FECDD3]/70 flex items-center justify-end text-xs font-bold text-[#DC2626] group-hover:text-[#B91C1C]">
          <span className="group-hover:underline flex items-center gap-1">
            {lang === "gu" ? "વિગતો જુઓ" : "View Details"}
            <span aria-hidden="true">&rarr;</span>
          </span>
        </div>
      </Link>

      {/* 3. CASH & BANK BALANCE (Light Sky Blue Card) */}
      <Link
        href="/accounting/ledgers?filter=cash_bank"
        className="group relative bg-[#F0F9FF] hover:bg-[#E0F2FE]/70 border border-[#BAE6FD] hover:border-[#7DD3FC] rounded-2xl p-4 sm:p-5 lg:p-6 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden min-h-[160px] sm:min-h-[175px]"
        title={lang === "gu" ? "રોકડ અને બેંક ખાતાઓનો સારાંશ જુઓ" : "View Cash & Bank Accounts Summary"}
      >
        {/* Top: Icon + Label + Secondary Icon */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0 shadow-xs">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-[#0C4A6E] truncate">
                {lang === "gu" ? "રોકડ + બેંક સિલક" : "Cash & Bank Balance"}
              </div>
              <div className="text-xs text-[#0284C7] font-medium truncate">
                {lang === "gu" ? "કુલ ઉપલબ્ધ લિક્વિડ ફંડ" : "Combined operating balance"}
              </div>
            </div>
          </div>

          <div className="p-1.5 rounded-lg bg-[#E0F2FE] text-[#0284C7] shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
          </div>
        </div>

        {/* Middle: Huge Amount */}
        <div className="my-2 sm:my-2.5">
          <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-mono text-[#0284C7] tracking-tight truncate">
            {formatInrCurrency(totalCashBank)}
          </div>
        </div>

        {/* Lower Middle: Trend Badge & Mini Bar Sparkline */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369A1] text-xs font-bold shrink-0">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span>2%</span>
            <span className="text-[10px] font-normal text-[#0284C7]">vs last month</span>
          </span>

          <SparklineBars colorClass="bg-[#7DD3FC]" />
        </div>

        {/* Footer: View Details Link */}
        <div className="pt-2.5 border-t border-[#BAE6FD]/70 flex items-center justify-between text-xs text-[#0369A1]">
          <span className="truncate text-[11px] font-medium">
            Cash: {formatInrCurrency(cashBalance)} • Bank: {formatInrCurrency(bankBalance)}
          </span>
          <span className="font-bold text-[#0284C7] group-hover:underline shrink-0 flex items-center gap-1">
            {lang === "gu" ? "વિગતો જુઓ" : "View Details"}
            <span aria-hidden="true">&rarr;</span>
          </span>
        </div>
      </Link>
    </div>
  );
}
