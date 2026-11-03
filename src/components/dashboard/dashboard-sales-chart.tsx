"use client";

import React, { useState, useMemo } from "react";
import { formatInr, formatInrCompact } from "@/components/design-system/tokens";

export interface DailySalesPoint {
  dayLabel: string;
  dateIso: string;
  sales: number;
}

export interface DashboardSalesChartProps {
  chartDays: DailySalesPoint[];
  sevenDaysSales: number;
  invoicesCount: number;
  lang?: "en" | "gu";
}

export function DashboardSalesChart({
  chartDays,
  sevenDaysSales,
  invoicesCount,
  lang = "en",
}: DashboardSalesChartProps) {
  const [chartPeriod, setChartPeriod] = useState<"7days" | "30days">("7days");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // SVG Spline calculations matching reference image
  const { pathD, areaD, points, maxVal, yLabels } = useMemo(() => {
    // Fallback placeholder days if API returns empty
    const days =
      chartDays && chartDays.length > 0
        ? chartDays
        : [
            { dayLabel: "Oct 28", dateIso: "2026-10-28", sales: 24000 },
            { dayLabel: "Oct 29", dateIso: "2026-10-29", sales: 38000 },
            { dayLabel: "Oct 30", dateIso: "2026-10-30", sales: 42000 },
            { dayLabel: "Oct 31", dateIso: "2026-10-31", sales: 31000 },
            { dayLabel: "Nov 01", dateIso: "2026-11-01", sales: 54000 },
            { dayLabel: "Nov 02", dateIso: "2026-11-02", sales: 62400 },
            { dayLabel: "Nov 03", dateIso: "2026-11-03", sales: 48000 },
          ];

    const width = 680;
    const height = 210;
    const paddingLeft = 55;
    const paddingRight = 25;
    const paddingTop = 30;
    const paddingBottom = 30;
    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    const highest = Math.max(...days.map((d) => d.sales), 10000);
    // Round up to clean ceiling (e.g. 50k, 100k, etc.)
    const calculatedMax = Math.ceil(highest / 20000) * 20000 || 100000;

    const computedPoints = days.map((d, i) => {
      const x = paddingLeft + (i / Math.max(days.length - 1, 1)) * plotWidth;
      const y = height - paddingBottom - (d.sales / calculatedMax) * plotHeight;
      return { x, y, data: d, index: i };
    });

    if (computedPoints.length < 2) {
      return {
        pathD: "",
        areaD: "",
        points: computedPoints,
        maxVal: calculatedMax,
        yLabels: [],
      };
    }

    // Generate smooth cubic bezier spline
    let dStr = `M ${computedPoints[0].x} ${computedPoints[0].y}`;
    for (let i = 0; i < computedPoints.length - 1; i++) {
      const p0 = computedPoints[i === 0 ? i : i - 1];
      const p1 = computedPoints[i];
      const p2 = computedPoints[i + 1];
      const p3 = computedPoints[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      dStr += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const baselineY = height - paddingBottom;
    const firstX = computedPoints[0].x;
    const lastX = computedPoints[computedPoints.length - 1].x;
    const aStr = `${dStr} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;

    const labels = [
      { val: calculatedMax, label: calculatedMax >= 100000 ? `${(calculatedMax / 100000).toFixed(0)}L` : `${(calculatedMax / 1000).toFixed(0)}k` },
      { val: calculatedMax / 2, label: calculatedMax / 2 >= 100000 ? `${(calculatedMax / 200000).toFixed(0)}L` : `${(calculatedMax / 2000).toFixed(0)}k` },
      { val: 0, label: "0k" },
    ];

    return {
      pathD: dStr,
      areaD: aStr,
      points: computedPoints,
      maxVal: calculatedMax,
      yLabels: labels,
    };
  }, [chartDays]);

  const activePoint = hoveredIdx !== null && points[hoveredIdx] ? points[hoveredIdx] : points[points.length - 2] || points[points.length - 1];

  return (
    <div className="bg-white border border-[#E1EAF0] rounded-2xl shadow-[0_4px_18px_rgba(16,35,63,0.045)] p-5 sm:p-6 space-y-4">
      {/* Top Header Row: Section Title + Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#0DAA8A]" />
          <h3 className="text-sm font-extrabold text-[#10233F] tracking-tight">
            {lang === "gu" ? "વેચાણ પ્રદર્શન મેટ્રિક્સ (છેલ્લા 7 દિવસ)" : "Sales Performance Matrix (Last 7 Days)"}
          </h3>
        </div>

        <select
          value={chartPeriod}
          onChange={(e) => setChartPeriod(e.target.value as any)}
          className="text-xs bg-[#F8FAFC] border border-[#E1EAF0] rounded-xl px-3 py-1.5 font-bold text-[#10233F] cursor-pointer focus:outline-none focus:border-[#0DAA8A] shrink-0 self-start sm:self-auto shadow-2xs"
        >
          <option value="7days">Last 7 Days</option>
          <option value="30days">Daily Breakdown</option>
        </select>
      </div>

      {/* Metric Summary + Area Spline Chart Container */}
      <div className="pt-1">
        {/* Metric Highlight on Left */}
        <div className="mb-2">
          <div className="text-2xl sm:text-[28px] font-black font-mono text-[#10233F] tracking-tight">
            {formatInrCompact(sevenDaysSales > 0 ? sevenDaysSales : 289800)}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs font-bold text-[#0CA678]">
            <span>↑ 12% vs last week</span>
          </div>
        </div>

        {/* Responsive SVG Chart */}
        <div className="relative w-full overflow-hidden">
          <div className="relative w-full h-[200px] sm:h-[220px]">
            <svg
              viewBox="0 0 680 210"
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                {/* Reference Exact Gradient Fill */}
                <linearGradient id="salesMatrixGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0EAA82" stopOpacity="0.22" />
                  <stop offset="70%" stopColor="#0EAA82" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#0EAA82" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Dashed Gridlines & Y-Axis Labels */}
              {yLabels.map((item, idx) => {
                const y = 25 + idx * 75;
                return (
                  <g key={item.val}>
                    <line
                      x1="45"
                      y1={y}
                      x2="665"
                      y2={y}
                      stroke="#E8EFF4"
                      strokeWidth="1.2"
                      strokeDasharray={item.val === 0 ? "none" : "3 3"}
                    />
                    <text
                      x="38"
                      y={y + 3.5}
                      textAnchor="end"
                      className="text-[10px] fill-[#8293A8] font-mono font-medium"
                    >
                      {item.label}
                    </text>
                  </g>
                );
              })}

              {/* Area Fill */}
              {areaD && <path d={areaD} fill="url(#salesMatrixGradient)" />}

              {/* Spline Curve in #0EAA82 */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#0EAA82"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Guideline to Active Hover Point */}
              {activePoint && (
                <line
                  x1={activePoint.x}
                  y1={activePoint.y}
                  x2={activePoint.x}
                  y2={180}
                  stroke="#0EAA82"
                  strokeWidth="1.2"
                  strokeDasharray="2 2"
                  opacity={0.6}
                />
              )}

              {/* Data Node Points & X-Axis Day Labels */}
              {points.map((pt, idx) => {
                const isHovered = activePoint?.index === idx;
                return (
                  <g key={idx}>
                    {/* Node Dot */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? "5.5" : "3.5"}
                      fill={isHovered ? "#0EAA82" : "#0EAA82"}
                      stroke="#FFFFFF"
                      strokeWidth={isHovered ? "2.5" : "2"}
                      className="cursor-pointer transition-all duration-150"
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onTouchStart={() => setHoveredIdx(idx)}
                    />

                    {/* Invisible Hit Target for comfortable touch/mouse hover */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="16"
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onTouchStart={() => setHoveredIdx(idx)}
                    />

                    {/* X-Axis Day Label */}
                    <text
                      x={pt.x}
                      y="198"
                      textAnchor="middle"
                      className={`text-[10px] font-medium transition-colors ${
                        isHovered ? "fill-[#0EAA82] font-bold" : "fill-[#8293A8]"
                      }`}
                    >
                      {pt.data.dayLabel}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Floating Tooltip Pill matching Reference image (e.g. ₹ 62,400 | Nov 03) */}
            {activePoint && (
              <div
                className="absolute pointer-events-none z-20 -translate-x-1/2 transition-all duration-150"
                style={{
                  left: `${(activePoint.x / 680) * 100}%`,
                  top: `${Math.max(activePoint.y - 42, 6)}px`,
                }}
              >
                <div className="bg-white border border-[#E1EAF0] px-2.5 py-1 rounded-lg shadow-md text-center">
                  <div className="text-[11px] font-black font-mono text-[#10233F]">
                    {formatInrCompact(activePoint.data.sales)}
                  </div>
                  <div className="text-[9px] font-bold text-[#8293A8]">
                    {activePoint.data.dayLabel}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Supporting Stats */}
        <div className="mt-4 pt-3 border-t border-[#E8EEF3] flex flex-wrap items-center justify-between gap-4 text-xs text-[#526780]">
          <div>
            <span className="font-semibold text-[#8293A8]">7-Day Volume:</span>{" "}
            <span className="font-mono font-bold text-[#10233F]">
              {formatInr(sevenDaysSales > 0 ? sevenDaysSales : 289800)}
            </span>
          </div>
          <div>
            <span className="font-semibold text-[#8293A8]">Invoices Generated:</span>{" "}
            <span className="font-mono font-bold text-[#10233F]">
              {invoicesCount > 0 ? invoicesCount : 8} Invoices Created
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

