"use client";

import React from "react";
import { formatInr } from "@/components/design-system/tokens";

function Sparkline({ values, color }: { values?: number[]; color: string }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = Math.max(max - min, 1);
  const d = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 88;
      const y = 26 - ((value - min) / span) * 22;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 88 30" className="w-20 h-7 shrink-0" aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export interface DashboardKpiCardProps {
  id: string;
  title: string;
  titleGujarati?: string;
  amount: number;
  subtitle?: string;
  subtitleGujarati?: string;
  trendText?: string;
  sparkline?: number[];
  trendType?: "up-green" | "up-red" | "down-red" | "down-green";
  variant: "receivable" | "payable" | "cash-bank" | "sales";
  lang?: "en" | "gu";
  onClick?: () => void;
}

export function DashboardKpiCard({
  title,
  titleGujarati,
  amount,
  trendText,
  sparkline,
  variant,
  lang = "en",
  onClick,
}: DashboardKpiCardProps) {
  const configs = {
    receivable: {
      bg: "bg-[#F0F6FF]",
      border: "border-[#BFDBFE]/80",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      trendColor: "text-emerald-600",
      sparkColor: "#3B82F6",
      sparkPath: "M 2 24 C 18 20, 28 30, 42 16 C 54 4, 68 18, 86 6",
      icon: (
        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    payable: {
      bg: "bg-[#FFF7ED]",
      border: "border-[#FED7AA]/80",
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      trendColor: "text-orange-600",
      sparkColor: "#F97316",
      sparkPath: "M 2 24 C 16 26, 30 18, 44 22 C 58 26, 70 12, 86 8",
      icon: (
        <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    "cash-bank": {
      bg: "bg-[#F0FDF4]",
      border: "border-[#BBF7D0]/80",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      trendColor: "text-emerald-600",
      sparkColor: "#10B981",
      sparkPath: "M 2 22 C 16 26, 30 12, 46 18 C 60 24, 72 10, 86 6",
      icon: (
        <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
        </svg>
      ),
    },
    sales: {
      bg: "bg-[#F5F3FF]",
      border: "border-[#DDD6FE]/80",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      trendColor: "text-emerald-600",
      sparkColor: "#8B5CF6",
      sparkPath: "M 2 24 C 18 20, 32 26, 46 14 C 60 4, 70 16, 86 6",
      icon: (
        <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  }[variant];

  const displayTitle = lang === "gu" && titleGujarati ? titleGujarati : title;
  const activeTrend = trendText || "";

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`rounded-2xl p-4 min-h-[132px] flex flex-col justify-between transition-all duration-200 border ${configs.bg} ${configs.border} ${
        onClick
          ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
          : "cursor-default"
      } shadow-2xs relative overflow-hidden group`}
    >
      {/* Top row: Icon and Title */}
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg ${configs.iconBg} flex items-center justify-center shrink-0`}>
          {configs.icon}
        </div>
        <span className="text-[13px] font-medium text-[#182230] truncate leading-snug">
          {displayTitle}
        </span>
      </div>

      {/* Main Metric Value */}
      <div className="mt-3">
        <div className="bb-amount text-[22px] text-[#182230]">
          {formatInr(amount)}
        </div>
      </div>

      {/* Bottom row: Trend indicator on left, Sparkline graph on right */}
      <div className="mt-2 flex items-center justify-between gap-2 min-h-[22px]">
        {activeTrend ? (
          <div className={`text-[11px] font-medium ${configs.trendColor}`}>
            {activeTrend}
          </div>
        ) : (
          <span />
        )}
        <Sparkline values={sparkline} color={configs.sparkColor} />
      </div>
    </div>
  );
}
