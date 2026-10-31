"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useAuth } from "../../context/auth-context";

export interface CustomerRank {
  id?: string;
  name: string;
  amount: number;
}

interface TopCustomersCardProps {
  customers?: CustomerRank[];
  recentInvoices?: any[];
  isLoading?: boolean;
}

export function TopCustomersCard({
  customers,
  recentInvoices = [],
  isLoading = false,
}: TopCustomersCardProps) {
  const { lang } = useAuth();

  const colorThemes = [
    { bg: "bg-[#E9D5FF]", text: "text-[#7E22CE]", bar: "bg-[#9333EA]" },
    { bg: "bg-[#FFE4E6]", text: "text-[#E11D48]", bar: "bg-[#F43F5E]" },
    { bg: "bg-[#FFEDD5]", text: "text-[#C2410C]", bar: "bg-[#F97316]" },
    { bg: "bg-[#DBEAFE]", text: "text-[#1D4ED8]", bar: "bg-[#3B82F6]" },
    { bg: "bg-[#CCFBF1]", text: "text-[#0F766E]", bar: "bg-[#14B8A6]" },
  ];

  // Derive top 5 customers from real invoices
  const topList = useMemo(() => {
    if (customers && customers.length > 0) return customers.slice(0, 5);

    const map: Record<string, { name: string; amount: number }> = {};
    for (const inv of recentInvoices) {
      const partyName = inv.partyName || inv.party?.name || (lang === "gu" ? "રોકડા ગ્રાહક (Walk-in)" : "Walk-in Retail Cash Customer");
      if (!map[partyName]) {
        map[partyName] = { name: partyName, amount: 0 };
      }
      map[partyName].amount += Number(inv.grandTotal || 0);
    }

    const aggregated = Object.values(map).sort((a, b) => b.amount - a.amount);
    return aggregated.slice(0, 5);
  }, [customers, recentInvoices, lang]);

  const maxAmount = useMemo(() => {
    return Math.max(...topList.map((c) => c.amount), 1);
  }, [topList]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const formatInr = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 sm:p-5 shadow-xs space-y-3.5 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-sm font-bold text-[#111827]">
            {lang === "gu" ? "ટોપ ૫ ગ્રાહકો" : "Top 5 Customers"}
          </h2>
        </div>

        {/* Filter Pill */}
        <Link
          href="/parties/customers"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-[#E5E7EB] text-xs font-semibold text-[#4B5563] hover:bg-slate-100 transition-colors"
        >
          <span>{lang === "gu" ? "વેચાણ મુજબ" : "By Sales"}</span>
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>

      {/* Customer List */}
      {isLoading ? (
        <div className="space-y-3 py-2">
          <div className="h-9 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-9 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-9 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      ) : topList.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          {lang === "gu"
            ? "આ સમયગાળા માટે કોઈ ગ્રાહક વેચાણ નોંધાયેલ નથી."
            : "No customer sales recorded for this period."}
        </div>
      ) : (
        <div className="divide-y divide-[#F1F5F9] -my-1">
          {topList.map((cust, idx) => {
            const theme = colorThemes[idx % colorThemes.length];
            const pct = Math.min(100, Math.max(10, Math.round((cust.amount / maxAmount) * 100)));

            return (
              <div key={idx} className="py-2 sm:py-2.5 flex items-center justify-between gap-2.5 sm:gap-3 group">
                {/* Left: Avatar Initials */}
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${theme.bg} ${theme.text} flex items-center justify-center font-bold text-[11px] sm:text-xs shrink-0 shadow-2xs`}
                >
                  {getInitials(cust.name)}
                </div>

                {/* Middle: Name + Progress Bar */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="text-xs font-semibold text-[#111827] truncate group-hover:text-[#174B43] transition-colors">
                    {cust.name}
                  </div>
                  {/* Horizontal Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-1 sm:h-1.5 overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full ${theme.bar} transition-all duration-300`}
                    />
                  </div>
                </div>

                {/* Right: Amount */}
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-xs text-[#111827]">
                    {formatInr(cust.amount)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
