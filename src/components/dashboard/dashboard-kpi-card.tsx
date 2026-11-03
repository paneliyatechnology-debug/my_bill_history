"use client";

import React from "react";
import { formatInr } from "@/components/design-system/tokens";

export interface DashboardKpiCardProps {
  id: string;
  title: string;
  titleGujarati?: string;
  amount: number;
  subtitle: string;
  subtitleGujarati?: string;
  badge?: string;
  variant: "receivable" | "payable" | "cash-bank" | "sales";
  lang?: "en" | "gu";
  onClick?: () => void;
}

export function DashboardKpiCard({
  title,
  titleGujarati,
  amount,
  subtitle,
  subtitleGujarati,
  badge,
  variant,
  lang = "en",
  onClick,
}: DashboardKpiCardProps) {
  // Color configuration exactly matched to Section 2 Reference Palette
  const config = {
    receivable: {
      bg: "bg-[#E7FAF3]",
      border: "border-[#B9EBDD]",
      dot: "bg-[#0CA678]",
      amountColor: "text-[#08765C]",
      pillBg: "bg-[#D1F2E8]",
      pillText: "text-[#08765C]",
      pillBorder: "border-[#B9EBDD]",
      sparklineColor: "#0CA678",
      sparklinePath: "M 2 28 Q 18 20, 32 24 T 58 14 T 82 4",
      sparklineArea: "M 2 28 Q 18 20, 32 24 T 58 14 T 82 4 L 82 32 L 2 32 Z",
    },
    payable: {
      bg: "bg-[#FFF3E7]",
      border: "border-[#FFE0BF]",
      dot: "bg-[#F28C28]",
      amountColor: "text-[#C75B0A]",
      pillBg: "bg-[#FFEAD1]",
      pillText: "text-[#C75B0A]",
      pillBorder: "border-[#FFE0BF]",
      sparklineColor: "#F28C28",
      sparklinePath: "M 2 28 Q 18 24, 32 18 T 58 22 T 82 6",
      sparklineArea: "M 2 28 Q 18 24, 32 18 T 58 22 T 82 6 L 82 32 L 2 32 Z",
    },
    "cash-bank": {
      bg: "bg-[#E9F8F5]",
      border: "border-[#C7EEE5]",
      dot: "bg-[#079A80]",
      amountColor: "text-[#064E4A]",
      pillBg: "bg-[#D0F0E8]",
      pillText: "text-[#064E4A]",
      pillBorder: "border-[#C7EEE5]",
      sparklineColor: "#079A80",
      sparklinePath: "M 2 26 Q 16 14, 32 20 T 56 12 T 82 10",
      sparklineArea: "M 2 26 Q 16 14, 32 20 T 56 12 T 82 10 L 82 32 L 2 32 Z",
    },
    sales: {
      bg: "bg-[#EEF4FF]",
      border: "border-[#D9E6FF]",
      dot: "bg-[#4388F5]",
      amountColor: "text-[#172C55]",
      pillBg: "bg-[#E4FBF1]",
      pillText: "text-[#087A59]",
      pillBorder: "border-[#B8EED8]",
      sparklineColor: "#4388F5",
      sparklinePath: "M 2 28 Q 20 26, 36 16 T 62 18 T 82 4",
      sparklineArea: "M 2 28 Q 20 26, 36 16 T 62 18 T 82 4 L 82 32 L 2 32 Z",
    },
  }[variant];

  const displayTitle = lang === "gu" && titleGujarati ? titleGujarati : title;
  const displaySubtitle = lang === "gu" && subtitleGujarati ? subtitleGujarati : subtitle;

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
      className={`rounded-2xl p-3.5 sm:p-4 min-h-[136px] flex flex-col justify-between transition-all duration-200 border ${config.bg} ${config.border} ${
        onClick
          ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(16,35,63,0.08)] active:translate-y-0"
          : "cursor-default"
      } shadow-[0_2px_10px_rgba(16,35,63,0.03)]`}
    >
      {/* Top Header Row: Status Dot + Title + Pill Badge (No clipping, readable wrapping) */}
      <div className="flex items-start justify-between gap-1.5 mb-1.5 w-full">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className={`w-2 h-2 rounded-full shrink-0 ${config.dot}`} />
          <span className="text-[11px] sm:text-xs font-bold text-[#10233F] leading-snug">
            {displayTitle}
          </span>
        </div>

        {badge && (
          <span
            className={`text-[9.5px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 whitespace-nowrap leading-none ${config.pillBg} ${config.pillText} ${config.pillBorder}`}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Primary Currency Metric Amount */}
      <div className="my-0.5">
        <div
          className={`text-[22px] sm:text-[24px] xl:text-[26px] font-black font-mono tracking-tight truncate ${config.amountColor}`}
        >
          {formatInr(amount)}
        </div>
      </div>

      {/* Bottom Row: Subtitle + Floating Smooth SVG Sparkline */}
      <div className="flex items-end justify-between gap-2 mt-1">
        <p className="text-[11px] sm:text-xs text-[#526780] font-medium leading-tight flex-1 min-w-0">
          {displaySubtitle}
        </p>

        {/* Decorative Sparkline Chart Wave matching Reference */}
        <div className="w-[76px] h-[30px] shrink-0 overflow-hidden pointer-events-none select-none">
          <svg viewBox="0 0 84 32" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id={`grad-${variant}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={config.sparklineColor} stopOpacity="0.25" />
                <stop offset="100%" stopColor={config.sparklineColor} stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path d={config.sparklineArea} fill={`url(#grad-${variant})`} />
            <path
              d={config.sparklinePath}
              fill="none"
              stroke={config.sparklineColor}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

