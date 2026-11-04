"use client";

import React from "react";
import Link from "next/link";
import { formatInr } from "@/components/design-system/tokens";

export interface TransactionRow {
  id: string;
  date: string;
  rawDate: Date;
  type: string;
  txnNo: string;
  partyName: string;
  amount: number;
  link?: string;
  status?: string;
}

export interface DashboardTransactionsTableProps {
  transactions?: TransactionRow[];
  isLoading?: boolean;
  lang?: "en" | "gu";
}

// Color badges matching reference design
function getTypeBadge(type: string) {
  const norm = (type || "").toLowerCase();
  if (norm.includes("payment in") || norm.includes("receipt")) {
    return {
      label: "Payment In",
      className: "bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]",
    };
  }
  if (norm.includes("sales invoice") || (norm.includes("sales") && !norm.includes("return"))) {
    return {
      label: "Sales Invoice",
      className: "bg-[#DBEAFE] text-[#1677E8] border border-[#BFDBFE]",
    };
  }
  if (norm.includes("purchase return") || norm.includes("debit memo")) {
    return {
      label: "Purchase Return",
      className: "bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]",
    };
  }
  if (norm.includes("sales return") || norm.includes("credit note")) {
    return {
      label: "Sales Return",
      className: "bg-[#FFEDD5] text-[#EA580C] border border-[#FED7AA]",
    };
  }
  if (norm.includes("purchase invoice") || norm.includes("purchase")) {
    return {
      label: "Purchase Invoice",
      className: "bg-[#E0E7FF] text-[#4F46E5] border border-[#C7D2FE]",
    };
  }
  if (norm.includes("expense")) {
    return {
      label: "Expenses",
      className: "bg-[#F3E8FF] text-[#7E22CE] border border-[#E9D5FF]",
    };
  }
  return {
    label: type || "Transaction",
    className: "bg-slate-100 text-slate-700 border border-slate-200",
  };
}

export function DashboardTransactionsTable({
  transactions,
  isLoading = false,
  lang = "en",
}: DashboardTransactionsTableProps) {
  const rows = transactions ?? [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col justify-between h-full">
      <div>
        {/* Table Header: Clock Icon, Title, and View All link */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-[15px] font-semibold text-[#182230] tracking-tight">
              {lang === "gu" ? "તાજેતરના વ્યવહારો" : "Recent Transactions"}
            </h2>
          </div>

          <Link
            href="/app/home/vouchers/all_transactions"
            className="text-xs font-bold text-[#1677E8] hover:text-[#125CC0] flex items-center gap-1 group transition-colors"
          >
            <span>{lang === "gu" ? "બધા વ્યવહારો જુઓ" : "View All Transactions"}</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </Link>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto min-h-[260px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-[#FAFBFD] text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3.5 whitespace-nowrap">{lang === "gu" ? "તારીખ" : "Date"}</th>
                <th className="px-4 py-3.5 whitespace-nowrap">{lang === "gu" ? "પ્રકાર" : "Type"}</th>
                <th className="px-4 py-3.5 whitespace-nowrap">{lang === "gu" ? "વાઉચર #" : "Voucher No."}</th>
                <th className="px-5 py-3.5 whitespace-nowrap">{lang === "gu" ? "પાર્ટી" : "Party"}</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">{lang === "gu" ? "રકમ" : "Amount"}</th>
                <th className="px-5 py-3.5 text-center whitespace-nowrap">{lang === "gu" ? "સ્થિતિ" : "Status"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-3.5"><div className="h-4 w-20 bg-slate-100 rounded" /></td>
                    <td className="px-4 py-3.5"><div className="h-5 w-24 bg-slate-100 rounded-full" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-20 bg-slate-100 rounded" /></td>
                    <td className="px-5 py-3.5"><div className="h-4 w-28 bg-slate-100 rounded" /></td>
                    <td className="px-5 py-3.5 text-right"><div className="h-4 w-20 bg-slate-100 rounded ml-auto" /></td>
                    <td className="px-5 py-3.5 text-center"><div className="h-5 w-14 bg-slate-100 rounded-full mx-auto" /></td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-[13px] text-[#94A3B8]">
                    {lang === "gu" ? "હજુ કોઈ વ્યવહાર નથી." : "No transactions yet."}
                  </td>
                </tr>
              ) : (
                rows.slice(0, 5).map((row) => {
                  const badge = getTypeBadge(row.type);
                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      {/* Date */}
                      <td className="px-5 py-3.5 text-slate-600 font-medium whitespace-nowrap">
                        {row.date}
                      </td>

                      {/* Type Badge */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold shadow-2xs ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>

                      {/* Voucher No. */}
                      <td className="px-4 py-3.5 font-medium text-slate-700 whitespace-nowrap">
                        {row.txnNo}
                      </td>

                      {/* Party */}
                      <td className="px-5 py-3.5 font-semibold text-slate-900 whitespace-nowrap">
                        {row.partyName}
                      </td>

                      {/* Amount */}
                      <td className="px-5 py-3 text-right bb-amount text-[13px] text-[#182230] whitespace-nowrap">
                        {formatInr(row.amount)}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <span className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]">
                          <svg className="w-3 h-3 text-[#16A34A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>{row.status || (lang === "gu" ? "ચૂકવેલ" : "Paid")}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
