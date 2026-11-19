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

  // SVG Donut calculation
  const size = 150;
  const strokeWidth = 20;
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

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col justify-between h-full">
      {/* Header: Layers / Category Icon & Title */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]/60 flex items-center justify-center shrink-0 shadow-2xs">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h2 className="typo-section-heading text-[#1E293B]">
          {lang === "gu" ? "કેટેગરી મુજબ વેચાણ" : "Sales by Category"}
        </h2>
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
            <button type="button" onClick={onRetry} className="mt-3 h-8 px-3 rounded-lg bg-[#2563EB] text-white text-[12px] font-medium hover:bg-[#1D4ED8] transition-colors">
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
        {/* Donut Chart with Centered Total Sales */}
        <div className="relative w-36 h-36 shrink-0 flex items-center justify-center select-none">
          <svg className="w-full h-full -rotate-90 transform overflow-visible" viewBox={`0 0 ${size} ${size}`}>
            {/* Background Track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#EDF0F4"
              strokeWidth={strokeWidth}
            />

            {/* Slices */}
            {slices.map((slice) => {
              const isHovered = hoveredIdx === slice.index;
              return (
                <circle
                  key={slice.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
                  strokeDasharray={slice.strokeDasharray}
                  strokeDashoffset={slice.strokeDashoffset}
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(slice.index)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })}
          </svg>

          {/* Center Cutout Text matching Reference Image */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
            <span className="typo-amount-secondary text-[#1E293B] leading-tight tabular-nums">
              {formatInr(
                categories.reduce((sum, cat) => sum + Number(cat.amount || 0), 0) || totalSales
              )}
            </span>
            <span className="typo-badge text-[#94A3B8] mt-0.5">
              Total Sales
            </span>
          </div>
        </div>

        {/* Legend List without any truncation */}
        <div className="flex flex-col gap-2.5 min-w-[130px] shrink-0">
          {categories.map((cat, idx) => {
            const isHovered = hoveredIdx === idx;
            return (
              <div
                key={cat.label}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                title={`${cat.label}: ${formatInr(cat.amount || 0)} · ${cat.percentage.toFixed(1)}%`}
                className={`flex items-center justify-between gap-3 text-[12px] px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  isHovered ? "bg-[#EFF6FF]" : ""
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-[#1E293B] font-medium truncate">{cat.label}</span>
                </div>
                <span className="text-[#64748B] shrink-0 tabular-nums ml-2">
                  {formatInr(cat.amount || 0)}
                  <span className="text-[#1E293B] font-semibold ml-1.5">{cat.percentage.toFixed(1)}%</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}
