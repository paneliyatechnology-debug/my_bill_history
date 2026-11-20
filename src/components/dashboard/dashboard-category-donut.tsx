"use client";

import React, { useState } from "react";
import { formatInr } from "@/components/design-system/tokens";

export interface CategoryData {
  label: string;
  percentage: number;
  amount?: number;
  color: string;
}

export interface DashboardCategoryDonutProps {
  totalSales?: number;
  data?: CategoryData[];
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
  lang?: "en" | "gu";
}

function splitInr(val: number | string | undefined | null): { intPart: string; decPart: string } {
  const formatted = formatInr(val);
  const clean = formatted.replace(/^₹\s*/, "").trim();
  const lastDot = clean.lastIndexOf(".");
  if (lastDot !== -1) {
    return {
      intPart: clean.slice(0, lastDot),
      decPart: clean.slice(lastDot + 1),
    };
  }
  return { intPart: clean || "0", decPart: "00" };
}

function getAmountFontSize(len: number): string {
  if (len <= 7) return "text-[16px] sm:text-[17px]";
  if (len <= 10) return "text-[14px] sm:text-[15px]";
  if (len <= 12) return "text-[12.5px] sm:text-[13.5px]";
  return "text-[11px] sm:text-[12px]";
}

export function DashboardCategoryDonut({
  totalSales = 0,
  data,
  isLoading = false,
  error = "",
  onRetry,
  lang = "en",
}: DashboardCategoryDonutProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const categories: CategoryData[] = data && data.length > 0 ? data : [];

  // SVG Donut calculation - optimized radius & strokeWidth for sleek aesthetics & ample center space
  const size = 160;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Compute stroke offsets
  let accumulatedPercent = 0;
  const slices = categories.map((cat, idx) => {
    const strokeDasharray = `${(cat.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += cat.percentage;
    return {
      ...cat,
      index: idx,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const totalCalculatedSales =
    categories.reduce((sum, cat) => sum + Number(cat.amount || 0), 0) || totalSales;

  const activeSlice =
    hoveredIdx !== null && categories[hoveredIdx] ? categories[hoveredIdx] : null;

  const activeAmount = activeSlice ? Number(activeSlice.amount || 0) : totalCalculatedSales;
  const { intPart, decPart } = splitInr(activeAmount);

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col justify-between h-full">
      {/* Header: Layers / Category Icon & Title */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]/60 flex items-center justify-center shrink-0 shadow-2xs">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <div>
          <h2 className="typo-section-heading text-[#1E293B] leading-tight">
            {lang === "gu" ? "કેટેગરી મુજબ વેચાણ" : "Sales by Category"}
          </h2>
          <p className="typo-card-desc text-[#64748B] leading-tight mt-0.5">
            {lang === "gu" ? "કેટેગરી-વાઇઝ વેચાણ વિતરણ." : "Category-wise sales distribution."}
          </p>
        </div>
      </div>

      {isLoading && categories.length === 0 ? (
        <div className="flex flex-1 items-center justify-center min-h-[180px] text-[13px] text-[#94A3B8]">
          {lang === "gu" ? "કેટેગરી વેચાણ લોડ થઈ રહ્યું છે..." : "Loading category sales..."}
        </div>
      ) : error && categories.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center px-4 py-8 min-h-[180px]">
          <p className="text-[13px] font-medium text-[#1E293B]">
            {lang === "gu" ? "કેટેગરી વેચાણ લોડ થઈ શક્યું નહીં" : "Category sales could not be loaded"}
          </p>
          <p className="mt-1 text-[12px] text-[#94A3B8] max-w-[240px]">{error}</p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 h-8 px-3 rounded-lg bg-[#2563EB] text-white text-[12px] font-medium hover:bg-[#1D4ED8] transition-colors"
            >
              {lang === "gu" ? "ફરી પ્રયત્ન કરો" : "Retry"}
            </button>
          ) : null}
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center px-4 py-8 min-h-[180px]">
          <div className="w-14 h-14 rounded-full border-[10px] border-[#EFF6FF] mb-3" />
          <p className="text-[13px] font-medium text-[#1E293B]">
            {lang === "gu" ? "આ સમયગાળામાં કેટેગરી વેચાણ નથી" : "No category sales in this period"}
          </p>
          <p className="mt-1 text-[12px] text-[#94A3B8] max-w-[240px]">
            {lang === "gu"
              ? "ઇનવોઇસ લાઇન આઇટમ નોંધાયા પછી અહીં દેખાશે. કેટેગરી વગરની વસ્તુઓ Uncategorized હેઠળ રહેશે."
              : "This uses invoice line items from Item-Wise Sales. Items without a category stay under Uncategorized."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-around gap-4 my-auto py-2">
          {/* Donut Chart with Centered Total/Active Sales */}
          <div className="relative w-[156px] h-[156px] shrink-0 flex items-center justify-center select-none">
            <svg
              className="w-full h-full -rotate-90 transform overflow-visible"
              viewBox={`0 0 ${size} ${size}`}
            >
              {/* Background Track */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke="#F1F5F9"
                strokeWidth={strokeWidth}
              />

              {/* Slices */}
              {slices.map((slice) => {
                const isHovered = hoveredIdx === slice.index;
                const isOnlySlice = slices.length === 1;
                return (
                  <circle
                    key={slice.label}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth={isHovered ? strokeWidth + 2.5 : strokeWidth}
                    strokeDasharray={isOnlySlice ? undefined : slice.strokeDasharray}
                    strokeDashoffset={isOnlySlice ? undefined : slice.strokeDashoffset}
                    className="transition-all duration-200 cursor-pointer"
                    style={{
                      filter: isHovered
                        ? "drop-shadow(0 2px 8px rgba(37,99,235,0.35))"
                        : undefined,
                    }}
                    onMouseEnter={() => setHoveredIdx(slice.index)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    <title>{`${slice.label}: ${formatInr(slice.amount || 0)} (${slice.percentage.toFixed(1)}%)`}</title>
                  </circle>
                );
              })}

              {/* Inner Hole reset trigger */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius - strokeWidth / 2}
                fill="transparent"
                className="pointer-events-auto cursor-default"
                onMouseEnter={() => setHoveredIdx(null)}
              />
            </svg>

            {/* Center Cutout Text - Strictly centered, fits without overflow */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none z-10 px-2 select-none"
              title={formatInr(activeAmount)}
            >
              {/* Context Label */}
              <span
                className={`text-[10.5px] font-semibold uppercase tracking-wider max-w-[110px] truncate leading-none mb-1 transition-colors ${
                  activeSlice ? "text-[#2563EB]" : "text-[#64748B]"
                }`}
              >
                {activeSlice
                  ? activeSlice.label
                  : lang === "gu"
                  ? "કુલ વેચાણ"
                  : "Total Sales"}
              </span>

              {/* Amount Display - never breaks, dynamically sized */}
              <div className="flex items-baseline justify-center whitespace-nowrap tabular-nums leading-tight max-w-[120px]">
                <span className="text-[11px] sm:text-[12px] font-semibold text-[#64748B] mr-0.5 select-none">
                  ₹
                </span>
                <span
                  className={`font-bold tracking-tight text-[#0F172A] ${getAmountFontSize(
                    intPart.length
                  )}`}
                >
                  {intPart}
                </span>
                {decPart ? (
                  <span className="text-[10px] sm:text-[11px] font-medium text-[#64748B]">
                    .{decPart}
                  </span>
                ) : null}
              </div>

              {/* Sub-label / Percentage Badge */}
              <div className="mt-1">
                {activeSlice ? (
                  <span className="inline-flex items-center text-[10px] sm:text-[10.5px] font-semibold text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.5 rounded-full leading-none">
                    {activeSlice.percentage.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-[10px] sm:text-[10.5px] font-medium text-[#94A3B8] leading-none">
                    {categories.length}{" "}
                    {categories.length === 1
                      ? lang === "gu"
                        ? "કેટેગરી"
                        : "Category"
                      : lang === "gu"
                      ? "કેટેગરીઓ"
                      : "Categories"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Legend List with Clean Badges & Interactive Hover */}
          <div className="flex flex-col gap-1.5 min-w-0 flex-1 max-w-[240px] max-h-[190px] overflow-y-auto pr-1">
            {categories.map((cat, idx) => {
              const isHovered = hoveredIdx === idx;
              return (
                <div
                  key={cat.label}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  title={`${cat.label}: ${formatInr(cat.amount || 0)} · ${cat.percentage.toFixed(1)}%`}
                  className={`flex items-center justify-between gap-2.5 text-[12px] px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    isHovered
                      ? "bg-[#EFF6FF] border border-[#BFDBFE]/70 shadow-2xs"
                      : "hover:bg-[#F8FAFC] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform"
                      style={{
                        backgroundColor: cat.color,
                        transform: isHovered ? "scale(1.2)" : "scale(1)",
                      }}
                    />
                    <span
                      className={`truncate text-[12.5px] ${
                        isHovered
                          ? "font-semibold text-[#1D4ED8]"
                          : "font-medium text-[#1E293B]"
                      }`}
                    >
                      {cat.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 tabular-nums ml-2">
                    <span className="text-[12px] text-[#64748B]">
                      {formatInr(cat.amount || 0)}
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-1.5 py-0.5 rounded transition-colors ${
                        isHovered
                          ? "bg-[#DBEAFE] text-[#1E40AF]"
                          : "bg-[#F1F5F9] text-[#475569]"
                      }`}
                    >
                      {cat.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
