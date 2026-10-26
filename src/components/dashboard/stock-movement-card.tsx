"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "../../context/auth-context";

export interface StockMovementItem {
  id?: string;
  type: "IN" | "OUT";
  title: string;
  dateStr: string;
  refNo: string;
  quantityStr: string;
  itemName: string;
}

interface StockMovementCardProps {
  movements?: StockMovementItem[];
  isLoading?: boolean;
}

export function StockMovementCard({ movements = [], isLoading = false }: StockMovementCardProps) {
  const { lang } = useAuth();

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 sm:p-5 shadow-xs flex flex-col justify-between space-y-3.5 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#111827]">
              {lang === "gu" ? "સ્ટોક હલનચલન" : "Stock Movement"}
            </h2>
            <p className="text-[11px] text-[#6B7280]">
              {lang === "gu" ? "તાજેતરની આવક/જાવક વિગત" : "Recent stock in/out activity"}
            </p>
          </div>
        </div>

        <Link
          href="/inventory/stock"
          className="text-xs font-semibold text-[#F47721] hover:text-[#D95F12] flex items-center gap-1 hover:underline shrink-0"
        >
          <span>{lang === "gu" ? "બધા જુઓ" : "View All"}</span>
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>

      {/* Movement List */}
      {isLoading ? (
        <div className="space-y-2 py-4">
          <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      ) : movements.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          {lang === "gu"
            ? "હાલ કોઈ સ્ટોક વ્યવહાર નોંધાયેલ નથી."
            : "No stock movements recorded for this period."}
        </div>
      ) : (
        <div className="space-y-2.5 sm:space-y-3">
          {movements.map((it, idx) => (
            <div
              key={it.id || idx}
              className="p-2.5 sm:p-3 bg-slate-50/70 hover:bg-slate-50 border border-[#F1F5F9] rounded-xl flex items-center justify-between gap-2.5 sm:gap-3 transition-colors"
            >
              {/* Left badge + details */}
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                <span
                  className={`px-1.5 sm:px-2 py-0.5 rounded-md font-bold text-[11px] sm:text-xs shrink-0 ${
                    it.type === "IN"
                      ? "bg-[#DCFCE7] text-[#16A34A]"
                      : "bg-[#FEE2E2] text-[#DC2626]"
                  }`}
                >
                  {it.type}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-[#111827] truncate">
                    {it.title}
                  </div>
                  <div className="text-[11px] text-[#6B7280] truncate">
                    {it.dateStr} • {it.refNo}
                  </div>
                </div>
              </div>

              {/* Right quantity & item */}
              <div className="text-right shrink-0">
                <div
                  className={`font-mono font-bold text-xs ${
                    it.type === "IN" ? "text-[#16A34A]" : "text-[#DC2626]"
                  }`}
                >
                  {it.quantityStr}
                </div>
                <div className="text-[11px] text-[#6B7280] truncate max-w-[100px] sm:max-w-[140px]">
                  {it.itemName}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
