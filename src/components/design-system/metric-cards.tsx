"use client";

import React from "react";
import { formatInr } from "./tokens";

export interface MetricItem {
  id: string;
  title: string;
  titleGujarati?: string;
  value: number | string;
  isCurrency?: boolean;
  subtext?: string;
  subtextGujarati?: string;
  variant?: "primary" | "success" | "warning" | "danger" | "neutral";
  icon?: React.ReactNode;
}

export interface MetricCardsGroupProps {
  metrics: MetricItem[];
  lang?: "en" | "gu";
  columns?: 2 | 3 | 4;
}

export function MetricCardsGroup({
  metrics,
  lang = "en",
  columns = 4,
}: MetricCardsGroupProps) {
  const getVariantStyles = (variant: MetricItem["variant"]) => {
    switch (variant) {
      case "success":
        return {
          bg: "bg-emerald-50/60",
          border: "border-emerald-200",
          text: "text-emerald-800",
          iconBg: "bg-emerald-100 text-emerald-700",
        };
      case "warning":
        return {
          bg: "bg-amber-50/60",
          border: "border-amber-200",
          text: "text-amber-800",
          iconBg: "bg-amber-100 text-amber-700",
        };
      case "danger":
        return {
          bg: "bg-rose-50/60",
          border: "border-rose-200",
          text: "text-rose-800",
          iconBg: "bg-rose-100 text-rose-700",
        };
      case "primary":
        return {
          bg: "bg-[#F2FAF7]",
          border: "border-[#BCEADF]",
          text: "text-[#174B43]",
          iconBg: "bg-[#E6F7F2] text-[#174B43]",
        };
      default:
        return {
          bg: "bg-white",
          border: "border-[#E2E8E5]",
          text: "text-[#1A2E2B]",
          iconBg: "bg-slate-100 text-slate-600",
        };
    }
  };

  const colClass =
    columns === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : columns === 3
      ? "grid-cols-1 sm:grid-cols-3"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={`grid ${colClass} gap-3 sm:gap-4`}>
      {metrics.map((m) => {
        const styles = getVariantStyles(m.variant);
        const displayValue =
          m.isCurrency !== false && typeof m.value === "number"
            ? formatInr(m.value)
            : m.value;

        return (
          <div
            key={m.id}
            className={`${styles.bg} ${styles.border} p-4 rounded-2xl border shadow-2xs space-y-2`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#5A6B66] uppercase tracking-wider">
                {lang === "gu" && m.titleGujarati ? m.titleGujarati : m.title}
              </span>
              {m.icon && (
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${styles.iconBg}`}>
                  {m.icon}
                </div>
              )}
            </div>

            <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${styles.text}`}>
              {displayValue}
            </div>

            {(m.subtext || m.subtextGujarati) && (
              <p className="text-[11px] text-slate-500 font-medium">
                {lang === "gu" && m.subtextGujarati ? m.subtextGujarati : m.subtext}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
