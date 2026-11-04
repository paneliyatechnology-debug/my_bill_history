"use client";

import React, { useState, useMemo } from "react";
import { formatInr, formatInrCompact } from "@/components/design-system/tokens";

export interface DailySalesPoint {
  dayLabel: string;
  dateIso: string;
  sales: number;
}

export interface DashboardSalesChartProps {
  chartDays?: DailySalesPoint[];
  sevenDaysSales?: number;
  invoicesCount?: number;
  period?: string;
  onPeriodChange?: (period: string) => void;
  isLoading?: boolean;
  lang?: "en" | "gu";
}

export function DashboardSalesChart({
  chartDays,
  period = "30",
  onPeriodChange,
  isLoading = false,
  lang = "en",
}: DashboardSalesChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const dataPoints = useMemo(() => chartDays ?? [], [chartDays]);

  const width = 640;
  const height = 240;
  const paddingLeft = 45;
  const paddingRight = 25;
  const paddingTop = 45;
  const paddingBottom = 28;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  // Calculate dynamic ceiling so the curve gracefully utilizes chart height
  const maxVal = useMemo(() => {
    if (dataPoints.length === 0) return 1000;
    const rawMax = Math.max(...dataPoints.map((d) => d.sales), 1000);
    if (rawMax <= 20000) return 20000;
    if (rawMax <= 50000) return 50000;
    if (rawMax <= 100000) return 100000;
    if (rawMax <= 300000) return 300000;
    if (rawMax <= 600000) return 600000;
    const pow = Math.pow(10, Math.floor(Math.log10(rawMax)));
    return Math.ceil((rawMax * 1.15) / pow) * pow;
  }, [dataPoints]);

  const yLabels = useMemo(() => {
    const steps = 4;
    const labels: string[] = [];
    for (let i = steps; i >= 0; i--) {
      const val = (maxVal / steps) * i;
      if (val >= 100000) {
        labels.push(`${(val / 100000).toFixed(val % 100000 === 0 ? 0 : 1)}L`);
      } else if (val >= 1000) {
        labels.push(`${Math.round(val / 1000)}K`);
      } else {
        labels.push(String(Math.round(val)));
      }
    }
    return labels;
  }, [maxVal]);

  const labelIndexes = useMemo(() => {
    const count = dataPoints.length;
    if (count <= 7) return dataPoints.map((_, index) => index);
    const ticks = 6;
    const indexes = new Set<number>();
    for (let i = 0; i < ticks; i++) {
      indexes.add(Math.round((i * (count - 1)) / (ticks - 1)));
    }
    return Array.from(indexes);
  }, [dataPoints]);

  const formatAxisDate = (point: DailySalesPoint) => {
    if (point.dateIso) {
      const parsed = new Date(point.dateIso);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      }
    }
    return point.dayLabel;
  };

  // Compute coordinate points
  const points = useMemo(() => {
    return dataPoints.map((d, i) => {
      const x = paddingLeft + (i / Math.max(dataPoints.length - 1, 1)) * plotWidth;
      const y = height - paddingBottom - (d.sales / maxVal) * plotHeight;
      return { x, y, data: d, index: i };
    });
  }, [dataPoints, maxVal, plotWidth, plotHeight]);

  // Find peak point for the permanent callout badge if not hovering
  const peakIndex = useMemo(() => {
    let maxIdx = dataPoints.length - 1;
    let maxS = -1;
    dataPoints.forEach((p, idx) => {
      if (p.sales > maxS) {
        maxS = p.sales;
        maxIdx = idx;
      }
    });
    return maxIdx;
  }, [dataPoints]);

  // Construct smooth spline path
  const { pathD, areaD } = useMemo(() => {
    if (points.length < 2) return { pathD: "", areaD: "" };

    let dStr = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? i : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      dStr += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const baselineY = height - paddingBottom;
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    const aStr = `${dStr} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;

    return { pathD: dStr, areaD: aStr };
  }, [points]);

  const activePointIndex = hoveredIndex !== null ? hoveredIndex : peakIndex;
  const activePoint = points[activePointIndex] || points[points.length - 1];

  // Badge layout clamping to prevent boundary overflow
  const badgeWidth = 78;
  const badgeHalf = badgeWidth / 2;
  const badgeCenterX = activePoint
    ? Math.max(paddingLeft + badgeHalf, Math.min(width - paddingRight - badgeHalf, activePoint.x))
    : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between h-full">
      {/* Header: Title with Bar chart icon & Dropdown period selector */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-[15px] font-semibold text-[#182230] tracking-tight">
            {lang === "gu" ? "વેચાણ ટ્રેન્ડ" : "Sales Trend"}
          </h2>
        </div>

        {/* Period Selector Dropdown */}
        <div className="relative inline-flex items-center">
          <select
            value={period}
            onChange={(e) => onPeriodChange?.(e.target.value)}
            className="text-[13px] font-normal text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 pr-7 appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs h-10"
          >
            <option value="7">{lang === "gu" ? "છેલ્લા 7 દિવસ" : "Last 7 Days"}</option>
            <option value="30">{lang === "gu" ? "છેલ્લા 30 દિવસ" : "Last 30 Days"}</option>
            <option value="month">{lang === "gu" ? "આ મહિનો" : "This Month"}</option>
            <option value="last-month">{lang === "gu" ? "ગયો મહિનો" : "Last Month"}</option>
            <option value="fy">{lang === "gu" ? "આ નાણાકીય વર્ષ" : "This Financial Year"}</option>
          </select>
          <svg
            className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {dataPoints.length === 0 ? (
        <div className="flex flex-1 items-center justify-center min-h-[220px] text-[13px] text-[#94A3B8]">
          {isLoading
            ? lang === "gu"
              ? "વેચાણ ટ્રેન્ડ લોડ થઈ રહ્યો છે..."
              : "Loading sales trend..."
            : lang === "gu"
              ? "આ સમયગાળા માટે વેચાણ નથી."
              : "No sales recorded for this period."}
        </div>
      ) : null}

      {/* Responsive SVG Chart */}
      <div className={`relative w-full aspect-[640/250] min-h-[220px] select-none ${dataPoints.length === 0 ? "hidden" : ""}`}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id="salesBlueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1677E8" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#1677E8" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid Lines & Y-Axis Labels */}
          {yLabels.map((lbl, idx) => {
            const yPos = paddingTop + (idx / (yLabels.length - 1)) * plotHeight;
            return (
              <g key={`${lbl}-${idx}`}>
                {idx % 2 === 0 ? (
                  <line
                    x1={paddingLeft}
                    y1={yPos}
                    x2={width - paddingRight}
                    y2={yPos}
                    stroke="#EEF3F9"
                    strokeWidth={1}
                  />
                ) : null}
                <text
                  x={paddingLeft - 8}
                  y={yPos + 3.5}
                  textAnchor="end"
                  fill="#94A3B8"
                  fontSize="11"
                  fontWeight="500"
                  fontFamily="Inter, sans-serif"
                >
                  {lbl}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          {areaD && <path d={areaD} fill="url(#salesBlueGradient)" />}

          {/* Smooth Blue Spline Curve */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#1677E8"
              strokeWidth={2.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Interactive Data Dots */}
          {points.map((pt, idx) => {
            const isActive = idx === activePointIndex;
            const showDot = isActive || points.length <= 14 || labelIndexes.includes(idx);
            return (
              <g
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <circle cx={pt.x} cy={pt.y} r={12} fill="transparent" />
                {showDot ? (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isActive ? 4.5 : 2.5}
                    fill="#FFFFFF"
                    stroke="#1677E8"
                    strokeWidth={isActive ? 2.2 : 1.6}
                  />
                ) : null}
              </g>
            );
          })}

          {/* Floating Peak / Active Value Badge Pill matching Reference */}
          {activePoint && (
            <g
              className="pointer-events-none transition-all duration-200"
            >
              {/* Badge Container */}
              <rect
                x={badgeCenterX - badgeHalf}
                y={activePoint.y - 36}
                width={badgeWidth}
                height="22"
                rx="6"
                fill="#1677E8"
                filter="drop-shadow(0 2px 5px rgba(30,107,255,0.35))"
              />
              {/* Downward Pointer Triangle pointing to dot */}
              <polygon
                points={`${activePoint.x - 4},${activePoint.y - 14} ${activePoint.x + 4},${activePoint.y - 14} ${activePoint.x},${activePoint.y - 8}`}
                fill="#1677E8"
              />
              {/* Value Text */}
              <text
                x={badgeCenterX}
                y={activePoint.y - 21}
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="10"
                fontWeight="800"
                fontFamily="sans-serif"
              >
                ₹ {activePoint.data.sales.toLocaleString("en-IN")}
              </text>
            </g>
          )}

          {/* X-Axis Date Labels */}
          {points.map((pt, idx) => (
            labelIndexes.includes(idx) ? (
              <text
                key={idx}
                x={pt.x}
                y={height - 8}
                textAnchor="middle"
                fill={idx === activePointIndex ? "#182230" : "#64748B"}
                fontSize="11"
                fontWeight="500"
                fontFamily="Inter, sans-serif"
              >
                {formatAxisDate(pt.data)}
              </text>
            ) : null
          ))}
        </svg>
      </div>
    </div>
  );
}
