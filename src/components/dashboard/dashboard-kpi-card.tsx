"use client";

import React from "react";
import { formatInr } from "@/components/design-system/tokens";

function MiniSparkline({ values, color }: { values?: number[]; color: string }) {
  // If values provided, compute spline; else render the signature smooth aesthetic wave
  const hasValues = Array.isArray(values) && values.length >= 2;
  const width = 88;
  const height = 28;

  let pathD = "";
  let areaD = "";

  if (hasValues) {
    const max = Math.max(...(values as number[]));
    const min = Math.min(...(values as number[]));
    const span = Math.max(max - min, 1);
    const pts = (values as number[]).map((v, i) => {
      const x = (i / ((values as number[]).length - 1)) * width;
      const y = height - 4 - ((v - min) / span) * (height - 8);
      return { x, y };
    });

    pathD = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? i : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      pathD += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;
  } else {
    // Elegant default wave matching reference design
    pathD = "M 0 24 C 20 22, 35 25, 50 15 C 65 5, 75 14, 88 6";
    areaD = `${pathD} L 88 28 L 0 28 Z`;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-20 h-7 shrink-0 overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id="kpiBlueSpark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#kpiBlueSpark)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
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
  sparkline,
  variant,
  lang = "en",
  onClick,
}: DashboardKpiCardProps) {
  const configs = {
    receivable: {
      iconBg: "bg-[#EFF6FF] border border-[#BFDBFE]/60 text-[#2563EB]",
      sparkColor: "#2563EB",
      tooltip: lang === "gu" ? "ગ્રાહકો પાસેથી કુલ લેવાની બાકી રકમ" : "Total outstanding receivable amount from all parties",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    payable: {
      iconBg: "bg-[#FFF7ED] border border-[#FED7AA]/60 text-[#E58A45]",
      sparkColor: "#E58A45",
      tooltip: lang === "gu" ? "વેપારીઓને કુલ ચૂકવવાની બાકી રકમ" : "Total outstanding payable amount to suppliers",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    "cash-bank": {
      iconBg: "bg-[#EFF6FF] border border-[#BFDBFE]/60 text-[#2563EB]",
      sparkColor: "#2563EB",
      tooltip: lang === "gu" ? "કુલ ઉપલબ્ધ રોકડ અને બેંક સિલક" : "Total available balance across all cash and bank accounts",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
        </svg>
      ),
    },
    sales: {
      iconBg: "bg-[#EFF6FF] border border-[#BFDBFE]/60 text-[#2563EB]",
      sparkColor: "#2563EB",
      tooltip: lang === "gu" ? "છેલ્લા 7 દિવસમાં કુલ નોંધાયેલ વેચાણ" : "Total invoice sales recorded in the last 7 days",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  }[variant];

  const displayTitle = lang === "gu" && titleGujarati ? titleGujarati : title;

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
      className={`bg-white rounded-xl border border-[#E2E8F0] p-4 sm:p-5 flex flex-col justify-between transition-all duration-150 shadow-2xs hover:shadow-xs hover:border-slate-300 ${
        onClick ? "cursor-pointer active:scale-[0.99]" : "cursor-default"
      } relative overflow-hidden group select-none min-h-[118px]`}
    >
      {/* Top row: Icon + Title on left, Info Tooltip icon on right */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-lg ${configs.iconBg} flex items-center justify-center shrink-0 shadow-2xs`}>
            {configs.icon}
          </div>
          <span className="typo-card-heading text-[#1E293B] truncate leading-tight">
            {displayTitle}
          </span>
        </div>

        {/* Info Tooltip Icon */}
        <div
          title={configs.tooltip}
          className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0 cursor-help typo-tooltip"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01" />
          </svg>
        </div>
      </div>

      {/* Bottom row: Large Financial Amount + Sparkline for Sales */}
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="typo-kpi text-[#1E293B] tabular-nums leading-none">
          {formatInr(amount)}
        </div>

        {/* Sales Sparkline Graph */}
        {variant === "sales" && (
          <div className="shrink-0 mb-0.5">
            <MiniSparkline values={sparkline} color={configs.sparkColor} />
          </div>
        )}
      </div>
    </div>
  );
}
