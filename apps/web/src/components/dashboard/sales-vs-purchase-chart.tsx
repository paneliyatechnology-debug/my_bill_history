"use client";

import React, { useMemo } from "react";
import { useAuth } from "../../context/auth-context";

export interface DailyChartPoint {
  date: string;
  label: string;
  sales: number;
  purchase: number;
}

interface SalesVsPurchaseProps {
  salesTotal?: number;
  purchasesTotal?: number;
  dailyData?: DailyChartPoint[];
  isLoading?: boolean;
}

export function SalesVsPurchaseChart({
  salesTotal = 0,
  purchasesTotal = 0,
  dailyData,
  isLoading = false,
}: SalesVsPurchaseProps) {
  const { lang } = useAuth();

  // If daily data is not provided, build 7 days with zero values (no fake randomized data)
  const chartDays = useMemo(() => {
    if (dailyData && dailyData.length > 0) return dailyData;

    const days: DailyChartPoint[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const label = d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      });

      days.push({
        date: d.toISOString().split("T")[0],
        label,
        sales: 0,
        purchase: 0,
      });
    }
    return days;
  }, [dailyData]);

  const maxVal = useMemo(() => {
    const highest = Math.max(
      ...chartDays.map((d) => Math.max(d.sales, d.purchase)),
      0
    );
    return highest > 0 ? highest : 1000;
  }, [chartDays]);

  const formatInr = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 sm:p-5 shadow-xs space-y-3.5 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-sm font-bold text-[#111827]">
            {lang === "gu" ? "વેચાણ વિરુદ્ધ ખરીદી" : "Sales vs Purchase"}
          </h2>
        </div>

        {/* Filter Indicator Pill */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-[#E5E7EB] text-xs font-semibold text-[#4B5563]">
          <span>{lang === "gu" ? "છેલ્લા ૭ દિવસ" : "Last 7 Days"}</span>
        </div>
      </div>

      {/* Summary Row */}
      <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
          <span className="font-mono font-bold text-xs sm:text-sm text-[#111827]">
            {isLoading ? "..." : formatInr(salesTotal)}
          </span>
          <span className="text-[11px] sm:text-xs text-[#6B7280]">
            {lang === "gu" ? "કુલ વેચાણ" : "Total Sales"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F97316]"></span>
          <span className="font-mono font-bold text-xs sm:text-sm text-[#111827]">
            {isLoading ? "..." : formatInr(purchasesTotal)}
          </span>
          <span className="text-[11px] sm:text-xs text-[#6B7280]">
            {lang === "gu" ? "કુલ ખરીદી" : "Total Purchase"}
          </span>
        </div>
      </div>

      {/* Dual Bar Chart */}
      <div className="pt-2 overflow-x-auto scrollbar-none">
        <div className="h-40 sm:h-44 flex items-end justify-between gap-1 sm:gap-2 border-b border-[#F1F5F9] pb-2 px-1 min-w-[270px]">
          {chartDays.map((d, idx) => {
            const salesHeightPct =
              d.sales > 0 ? Math.min(100, Math.max(6, Math.round((d.sales / maxVal) * 100))) : 0;
            const purchHeightPct =
              d.purchase > 0 ? Math.min(100, Math.max(6, Math.round((d.purchase / maxVal) * 100))) : 0;

            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                <div className="flex items-end gap-1 w-full justify-center h-full">
                  {/* Sales Bar (Green) */}
                  <div
                    style={{ height: `${salesHeightPct}%` }}
                    className={`w-2 sm:w-3.5 bg-[#10B981] group-hover:bg-[#059669] rounded-t-sm transition-all duration-300 relative ${
                      salesHeightPct === 0 ? "opacity-20 bg-slate-200 h-1" : ""
                    }`}
                    title={`Sales: ${formatInr(d.sales)}`}
                  />
                  {/* Purchase Bar (Orange) */}
                  <div
                    style={{ height: `${purchHeightPct}%` }}
                    className={`w-2 sm:w-3.5 bg-[#F97316] group-hover:bg-[#EA580C] rounded-t-sm transition-all duration-300 relative ${
                      purchHeightPct === 0 ? "opacity-20 bg-slate-200 h-1" : ""
                    }`}
                    title={`Purchase: ${formatInr(d.purchase)}`}
                  />
                </div>
                <span className="text-[9px] sm:text-[10px] text-[#6B7280] font-medium whitespace-nowrap mt-1 group-hover:text-[#111827]">
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 pt-3 text-xs text-[#6B7280]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
            <span>{lang === "gu" ? "વેચાણ (Sales)" : "Sales"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#F97316]"></span>
            <span>{lang === "gu" ? "ખરીદી (Purchase)" : "Purchase"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
