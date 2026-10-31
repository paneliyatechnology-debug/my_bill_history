"use client";

import React from "react";
import { formatInr } from "./tokens";

export interface ScorecardSegment {
  id: string;
  label: string;
  labelGujarati?: string;
  value: number | string;
  isCurrency?: boolean;
  subtext?: string;
  subtextGujarati?: string;
  badge?: string;
  variant?: "primary" | "success" | "warning" | "danger" | "neutral";
  isActive?: boolean;
  onClick?: () => void;
  count?: number;
}

export interface ScorecardRibbonProps {
  segments: ScorecardSegment[];
  lang?: "en" | "gu";
  className?: string;
}

export function ScorecardRibbon({
  segments,
  lang = "en",
  className = "",
}: ScorecardRibbonProps) {
  return (
    <div
      className={`grid grid-cols-2 lg:grid-cols-4 bg-white border border-[#E2E8E5] rounded-2xl shadow-xs overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-[#E2E8E5] ${className}`}
    >
      {segments.map((seg) => {
        const displayValue =
          seg.isCurrency !== false && typeof seg.value === "number"
            ? formatInr(seg.value)
            : seg.value;

        // Active segment styling
        const activeClass = seg.isActive
          ? "bg-[#F2FAF7] ring-2 ring-inset ring-[#26A58A] shadow-inner"
          : "hover:bg-slate-50/80";

        // Dot color based on variant
        const dotColor =
          seg.variant === "success"
            ? "bg-emerald-500"
            : seg.variant === "warning"
            ? "bg-amber-500"
            : seg.variant === "danger"
            ? "bg-rose-500"
            : seg.variant === "primary"
            ? "bg-[#26A58A]"
            : "bg-slate-400";

        const textColor =
          seg.variant === "success"
            ? "text-emerald-700"
            : seg.variant === "warning"
            ? "text-amber-700"
            : seg.variant === "danger"
            ? "text-rose-700"
            : seg.variant === "primary"
            ? "text-[#174B43]"
            : "text-slate-800";

        return (
          <button
            key={seg.id}
            type="button"
            onClick={seg.onClick}
            disabled={!seg.onClick}
            className={`text-left p-4 sm:p-5 flex flex-col justify-between transition-all group min-w-0 ${activeClass} ${
              seg.onClick ? "cursor-pointer" : "cursor-default"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2 w-full">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                <span className="text-[11px] sm:text-xs font-bold text-[#5A6B66] uppercase tracking-wider truncate">
                  {lang === "gu" && seg.labelGujarati ? seg.labelGujarati : seg.label}
                </span>
              </div>
              {seg.badge && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                  {seg.badge}
                </span>
              )}
            </div>

            <div className="space-y-1 w-full">
              <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight truncate ${textColor}`}>
                {displayValue}
              </div>

              {(seg.subtext || seg.subtextGujarati || seg.count !== undefined) && (
                <p className="text-[11px] text-[#8E9F9A] font-medium truncate flex items-center justify-between">
                  <span>
                    {lang === "gu" && seg.subtextGujarati
                      ? seg.subtextGujarati
                      : seg.subtext}
                  </span>
                  {seg.count !== undefined && (
                    <span className="font-mono text-slate-500 font-bold ml-1">
                      ({seg.count})
                    </span>
                  )}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
