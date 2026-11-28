"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  limit?: number;
  title?: string;
  subtitle?: string;
}

function getTypeLabel(type: string, lang: "en" | "gu" = "en") {
  const norm = (type || "").toLowerCase();

  if (norm.includes("sales invoice") || (norm.includes("sales") && !norm.includes("return"))) {
    return lang === "gu" ? "વેચાણ બિલ" : "Sales Invoice";
  }
  if (norm.includes("payment in") || norm.includes("receipt")) {
    return lang === "gu" ? "પેમેન્ટ ઇન" : "Payment In";
  }
  if (norm.includes("sales return") || norm.includes("credit note")) {
    return lang === "gu" ? "વેચાણ પરત" : "Sales Return";
  }
  if (norm.includes("purchase return") || norm.includes("debit memo")) {
    return lang === "gu" ? "ખરીદી પરત" : "Purchase Return";
  }
  if (norm.includes("purchase invoice") || norm.includes("purchase")) {
    return lang === "gu" ? "ખરીદી બિલ" : "Purchase Invoice";
  }
  if (norm.includes("expense")) {
    return lang === "gu" ? "ખર્ચ" : "Expenses";
  }
  return type || (lang === "gu" ? "વ્યવહાર" : "Transaction");
}

function getStatusDisplay(status?: string, lang: "en" | "gu" = "en") {
  const norm = (status || "").trim().toLowerCase();

  if (
    norm.includes("unpaid") ||
    norm.includes("બાકી") ||
    norm.includes("overdue") ||
    norm.includes("due")
  ) {
    return {
      label: lang === "gu" ? "બાકી" : (status || "Unpaid"),
      textColor: "text-[#DC2626]",
      dotColor: "bg-[#DC2626]",
    };
  }

  if (norm.includes("part")) {
    return {
      label: lang === "gu" ? "અંશતઃ ચૂકવેલ" : "Partial",
      textColor: "text-[#D97706]",
      dotColor: "bg-[#D97706]",
    };
  }

  if (norm.includes("cancel")) {
    return {
      label: lang === "gu" ? "રદ કરેલ" : "Cancelled",
      textColor: "text-[#64748B]",
      dotColor: "bg-[#94A3B8]",
    };
  }

  const isCompleted = norm.includes("complete");
  return {
    label: isCompleted
      ? (lang === "gu" ? "પૂર્ણ" : "Completed")
      : (lang === "gu" ? "ચૂકવેલ" : (status || "Paid")),
    textColor: "text-[#16A34A]",
    dotColor: "bg-[#16A34A]",
  };
}

export function DashboardTransactionsTable({
  transactions,
  isLoading = false,
  lang = "en",
  limit = 10,
  title,
  subtitle,
}: DashboardTransactionsTableProps) {
  const router = useRouter();
  const rows = (transactions ?? []).slice(0, limit);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col justify-between h-full">
      <div>
        {/* Table Header */}
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="typo-section-heading text-[#182230] leading-tight">
                {title || (lang === "gu" ? "તાજેતરના વ્યવહારો" : "Recent Transactions")}
              </h2>
              <p className="typo-card-desc text-[#64748B] leading-tight mt-0.5">
                {subtitle || (lang === "gu" ? "તમારા તાજેતરના વ્યવહારો." : "Your latest business transactions.")}
              </p>
            </div>
          </div>

          <Link
            href="/app/home/vouchers/all_transactions"
            className="typo-btn-secondary text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 group transition-colors shrink-0"
          >
            <span>{lang === "gu" ? "બધા જુઓ" : "View All"}</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </Link>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[260px] scrollbar-thin scrollbar-thumb-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-[#FAFBFD] typo-table-th text-slate-500 uppercase tracking-wider">
                <th className="px-3 py-3 whitespace-nowrap">{lang === "gu" ? "તારીખ" : "Date"}</th>
                <th className="px-2.5 py-3 whitespace-nowrap">{lang === "gu" ? "પ્રકાર" : "Type"}</th>
                <th className="px-2.5 py-3 whitespace-nowrap">{lang === "gu" ? "વાઉચર #" : "Voucher No."}</th>
                <th className="px-2.5 py-3 whitespace-nowrap">{lang === "gu" ? "પાર્ટી" : "Party"}</th>
                <th className="px-2.5 py-3 text-right whitespace-nowrap">{lang === "gu" ? "રકમ" : "Amount"}</th>
                <th className="px-3 py-3 text-right whitespace-nowrap">{lang === "gu" ? "સ્થિતિ" : "Status"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {isLoading ? (
                Array.from({ length: limit }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 sm:px-5 py-3.5"><div className="h-4 w-20 bg-slate-100 rounded" /></td>
                    <td className="px-3 sm:px-4 py-3.5"><div className="h-5 w-24 bg-slate-100 rounded-md" /></td>
                    <td className="px-3 sm:px-4 py-3.5"><div className="h-4 w-20 bg-slate-100 rounded" /></td>
                    <td className="px-4 sm:px-5 py-3.5"><div className="h-4 w-28 bg-slate-100 rounded" /></td>
                    <td className="px-4 sm:px-5 py-3.5 text-right"><div className="h-4 w-20 bg-slate-100 rounded ml-auto" /></td>
                    <td className="px-4 sm:px-5 py-3.5 text-center"><div className="h-4 w-16 bg-slate-100 rounded mx-auto" /></td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center typo-empty-desc text-slate-400">
                    {lang === "gu" ? "હજુ કોઈ વ્યવહાર નથી." : "No transactions yet."}
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const typeLabel = getTypeLabel(row.type, lang);
                  const statusInfo = getStatusDisplay(row.status, lang);

                  return (
                    <tr
                      key={row.id}
                      onClick={() => row.link && router.push(row.link)}
                      className="hover:bg-[#F8FBFF] transition-colors cursor-pointer group"
                    >
                      {/* Date */}
                      <td className="px-3 py-3 typo-table-td text-slate-600 whitespace-nowrap">
                        {row.date}
                      </td>

                      {/* Type */}
                      <td className="px-2.5 py-3 whitespace-nowrap typo-table-td text-slate-700">
                        {typeLabel}
                      </td>

                      {/* Voucher No. */}
                      <td className="px-2.5 py-3 typo-invoice-no text-slate-700 max-w-[140px] truncate whitespace-nowrap group-hover:text-[#2563EB] transition-colors" title={row.txnNo}>
                        {row.txnNo}
                      </td>

                      {/* Party */}
                      <td
                        className="px-2.5 py-3 typo-table-td font-medium text-slate-900 max-w-[115px] sm:max-w-[155px] truncate whitespace-nowrap"
                        title={row.partyName}
                      >
                        {row.partyName}
                      </td>

                      {/* Amount */}
                      <td className="px-2.5 py-3 text-right typo-table-amount text-[#182230] whitespace-nowrap tabular-nums">
                        {formatInr(row.amount)}
                      </td>

                      {/* Status — clean text with dot, no pastel badges */}
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                          {/* <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusInfo.dotColor}`} /> */}
                          <span className={statusInfo.textColor}>{statusInfo.label}</span>
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
