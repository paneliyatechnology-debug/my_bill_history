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
  transactions: TransactionRow[];
  isLoading?: boolean;
  lang?: "en" | "gu";
}

// Map transaction type to pastel badge colors matching reference image Section 2
function getTypeBadgeStyle(type: string) {
  const norm = type.toLowerCase();
  if (norm.includes("payment in") || norm.includes("receipt")) {
    return "bg-[#E7FAF3] text-[#08765C] border-[#B9EBDD]";
  }
  if (norm.includes("challan")) {
    return "bg-[#EEF4FF] text-[#172C55] border-[#D9E6FF]";
  }
  if (norm.includes("return") || norm.includes("credit note")) {
    return "bg-[#F5EEFD] text-[#6E389C] border-[#E6D5F7]";
  }
  if (norm.includes("sales") || norm.includes("invoice")) {
    return "bg-[#E8F8F4] text-[#064E4A] border-[#BFECE0]";
  }
  if (norm.includes("quotation") || norm.includes("estimate") || norm.includes("proforma")) {
    return "bg-[#FFF4DF] text-[#A85B0B] border-[#FFE3B2]";
  }
  return "bg-[#F1F5F9] text-[#334155] border-[#E2E8F0]";
}

export function DashboardTransactionsTable({
  transactions,
  isLoading = false,
  lang = "en",
}: DashboardTransactionsTableProps) {
  const router = useRouter();

  return (
    <div className="bg-white border border-[#E1EAF0] rounded-2xl shadow-[0_4px_18px_rgba(16,35,63,0.045)] overflow-hidden flex flex-col justify-between">
      <div>
        {/* Table Header Row */}
        <div className="px-5 py-4 border-b border-[#E1EAF0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#0CA678]" />
            <h3 className="text-sm font-extrabold text-[#10233F] tracking-tight">
              {lang === "gu" ? "તાજેતરના વ્યવહારો" : "Recent Transaction Stream"}
            </h3>
          </div>

          <Link
            href="/app/home/vouchers/all_transactions"
            className="text-xs font-bold text-[#08765C] hover:text-[#0CA678] transition-colors flex items-center gap-1"
          >
            <span>{lang === "gu" ? "બધા જુઓ" : "View All"}</span>
            <span>→</span>
          </Link>
        </div>

        {/* High-density Transaction Table matching Reference */}
        <div className="overflow-x-auto min-h-[290px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E1EAF0] bg-[#FAFBFD] text-[11px] font-bold text-[#526780] uppercase tracking-wider">
                <th className="px-5 py-3.5">{lang === "gu" ? "તારીખ" : "Date"}</th>
                <th className="px-4 py-3.5">{lang === "gu" ? "પ્રકાર" : "Type"}</th>
                <th className="px-4 py-3.5">{lang === "gu" ? "વાઉચર #" : "Voucher #"}</th>
                <th className="px-5 py-3.5">{lang === "gu" ? "પાર્ટી" : "Party"}</th>
                <th className="px-5 py-3.5 text-right">{lang === "gu" ? "રકમ" : "Amount"}</th>
                <th className="px-4 py-3.5 text-center">{lang === "gu" ? "સ્થિતિ" : "Status"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-[#10233F]">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-3.5"><div className="h-4 w-20 bg-slate-100 rounded" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-16 bg-slate-100 rounded-md" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-20 bg-slate-100 rounded" /></td>
                    <td className="px-5 py-3.5"><div className="h-4 w-32 bg-slate-100 rounded" /></td>
                    <td className="px-5 py-3.5 text-right"><div className="h-4 w-24 bg-slate-100 rounded ml-auto" /></td>
                    <td className="px-4 py-3.5 text-center"><div className="h-4 w-12 bg-slate-100 rounded-full mx-auto" /></td>
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-xs text-[#526780]">
                    <div className="w-12 h-12 rounded-2xl bg-[#E7FAF3] text-[#08765C] flex items-center justify-center mx-auto mb-2 shadow-inner">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="font-bold text-[#10233F]">No transactions recorded yet</p>
                    <p className="text-[11px] text-[#8293A8] mt-0.5">Start billing your clients to see live stream entries here.</p>
                    <Link
                      href="/sales/invoices/new"
                      className="inline-block mt-3 px-4 py-1.5 rounded-xl bg-[#004D40] hover:bg-[#003D35] text-white font-bold text-xs shadow-xs transition-colors"
                    >
                      + Create First Sales Invoice
                    </Link>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => tx.link && router.push(tx.link)}
                    className="hover:bg-[#F8FBFA] transition-colors cursor-pointer group"
                  >
                    {/* Date */}
                    <td className="px-5 py-3 whitespace-nowrap text-[#526780] font-medium">
                      {tx.date}
                    </td>

                    {/* Voucher Type Pastel Pill */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 font-bold text-[10px] px-2.5 py-0.5 rounded-md border ${getTypeBadgeStyle(
                          tx.type
                        )}`}
                      >
                        {tx.type}
                      </span>
                    </td>

                    {/* Voucher Number in Monospace */}
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-[#10233F] font-bold group-hover:text-[#0DAA8A] transition-colors">
                      {tx.txnNo}
                    </td>

                    {/* Party Name */}
                    <td className="px-5 py-3 whitespace-nowrap text-[#10233F] font-bold truncate max-w-[200px]">
                      {tx.partyName}
                    </td>

                    {/* Amount formatted */}
                    <td className="px-5 py-3 whitespace-nowrap text-right font-mono font-black text-[#10233F]">
                      ₹ {formatInr(tx.amount)}
                    </td>

                    {/* Status Pill Badge matching Section 2 Reference */}
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#E4FBF1] text-[#087A59] border border-[#B8EED8]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0CA678]" />
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

      {/* Footer Link matching Reference */}
      <div className="border-t border-[#E1EAF0] p-3 text-center bg-[#FAFBFD]">
        <Link
          href="/app/home/vouchers/all_transactions"
          className="text-xs font-bold text-[#08765C] hover:text-[#0CA678] transition-colors inline-block"
        >
          See All Detailed Transactions →
        </Link>
      </div>
    </div>
  );
}
