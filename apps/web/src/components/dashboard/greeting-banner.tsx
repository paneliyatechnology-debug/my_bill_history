"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../context/auth-context";

export interface DateRangeState {
  startDate: string;
  endDate: string;
  label: string;
}

interface GreetingBannerProps {
  startDate?: string;
  endDate?: string;
  selectedLabel?: string;
  onDateRangeChange?: (range: DateRangeState) => void;
}

export function formatDateToLocalYmd(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateDisplay(dateStr?: string) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const dateObj = new Date(y, m, d);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function GreetingBanner({
  startDate = formatDateToLocalYmd(),
  endDate = formatDateToLocalYmd(),
  selectedLabel = "Today",
  onDateRangeChange,
}: GreetingBannerProps) {
  const { user, lang } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Custom range inputs
  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);

  // Sync custom inputs when props change
  useEffect(() => {
    if (startDate) setCustomStart(startDate);
    if (endDate) setCustomEnd(endDate);
  }, [startDate, endDate]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return lang === "gu" ? "શુભ સવાર" : "Good Morning";
    if (hour < 17) return lang === "gu" ? "શુભ બપોર" : "Good Afternoon";
    return lang === "gu" ? "શુભ સાંજ" : "Good Evening";
  }, [lang]);

  const userName = user?.name ? user.name.split(" ")[0] : "Admin";

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Formatted date pill label
  const displayRangeStr = useMemo(() => {
    if (!startDate && !endDate) {
      return lang === "gu" ? "બધો સમય (All Time)" : "All Time";
    }
    if (startDate === endDate) {
      const formatted = formatDateDisplay(startDate);
      return `${formatted} - ${formatted}`;
    }
    return `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`;
  }, [startDate, endDate, lang]);

  const handleSelectPreset = (preset: string) => {
    const today = new Date();
    const todayYmd = formatDateToLocalYmd(today);

    let start = todayYmd;
    let end = todayYmd;
    let label = "Today";

    if (preset === "today") {
      start = todayYmd;
      end = todayYmd;
      label = "Today";
    } else if (preset === "yesterday") {
      const y = new Date(today);
      y.setDate(today.getDate() - 1);
      const yYmd = formatDateToLocalYmd(y);
      start = yYmd;
      end = yYmd;
      label = "Yesterday";
    } else if (preset === "last7") {
      const d7 = new Date(today);
      d7.setDate(today.getDate() - 6);
      start = formatDateToLocalYmd(d7);
      end = todayYmd;
      label = "Last 7 Days";
    } else if (preset === "thisMonth") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      start = formatDateToLocalYmd(firstDay);
      end = todayYmd;
      label = "This Month";
    } else if (preset === "thisFY") {
      // Indian Financial Year: 01 Apr to 31 Mar
      const currentYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
      start = `${currentYear}-04-01`;
      end = `${currentYear + 1}-03-31`;
      label = "This FY";
    } else if (preset === "all") {
      start = "";
      end = "";
      label = "All Time";
    }

    setCustomStart(start || todayYmd);
    setCustomEnd(end || todayYmd);
    setIsOpen(false);

    if (onDateRangeChange) {
      onDateRangeChange({ startDate: start, endDate: end, label });
    }
  };

  const handleApplyCustom = () => {
    if (!customStart || !customEnd) return;
    let s = customStart;
    let e = customEnd;
    if (s > e) {
      const tmp = s;
      s = e;
      e = tmp;
    }
    setIsOpen(false);
    if (onDateRangeChange) {
      onDateRangeChange({
        startDate: s,
        endDate: e,
        label: "Custom Range",
      });
    }
  };

  const presets = [
    { key: "today", en: "Today", gu: "આજે", label: "Today" },
    { key: "yesterday", en: "Yesterday", gu: "ગઈકાલે", label: "Yesterday" },
    { key: "last7", en: "Last 7 Days", gu: "છેલ્લા ૭ દિવસ", label: "Last 7 Days" },
    { key: "thisMonth", en: "This Month", gu: "આ મહિને", label: "This Month" },
    { key: "thisFY", en: "This FY", gu: "આ નાણાકીય વર્ષ", label: "This FY" },
    { key: "all", en: "All Time", gu: "બધો સમય", label: "All Time" },
  ];

  return (
    <div className="relative z-30 overflow-visible bg-gradient-to-r from-white via-[#FFF9F5] to-[#F0F7FF] border border-[#E5E7EB] rounded-2xl p-3.5 sm:p-5 lg:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4">
      {/* Subtle background glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#F47721]/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 right-48 w-40 h-40 bg-sky-400/5 rounded-full blur-2xl pointer-events-none" />

      {/* Left Greeting & Titles */}
      <div className="space-y-1 z-10 min-w-0">
        <div className="text-xs sm:text-sm font-semibold text-[#6B7280] flex items-center gap-1.5">
          <span>
            {greeting}, {userName}!
          </span>
          <span className="inline-block animate-wave origin-bottom-right">👋</span>
        </div>
        <h1 className="text-lg sm:text-2xl lg:text-3xl font-extrabold text-[#111827] tracking-tight">
          {lang === "gu" ? "તમારો વેપાર એક નજરે" : "Your Business at a Glance"}
        </h1>
        <p className="text-xs sm:text-sm text-[#6B7280] max-w-xl">
          {lang === "gu"
            ? "વેચાણ, ખરીદી, સ્ટોક અને રોકડ પ્રવાહ — બધું જ એક જગ્યાએ ટ્રૅક કરો."
            : "Track sales, purchases, stock, and cash flow — all in one place."}
        </p>
      </div>

      {/* Right Controls & Illustration */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto z-20 shrink-0">
        {/* Modern 3D Business Illustration SVG (Desktop only) */}
        <div className="hidden xl:flex items-center justify-center mr-2 relative w-24 h-16 pointer-events-none">
          <svg viewBox="0 0 120 80" className="w-full h-full drop-shadow-md" fill="none">
            {/* Sheet / Document */}
            <rect x="25" y="10" width="45" height="55" rx="6" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
            <rect x="33" y="20" width="28" height="3" rx="1.5" fill="#CBD5E1" />
            <rect x="33" y="27" width="20" height="3" rx="1.5" fill="#CBD5E1" />
            <rect x="33" y="34" width="24" height="3" rx="1.5" fill="#CBD5E1" />

            {/* Growth Graph Card */}
            <rect x="52" y="26" width="46" height="38" rx="6" fill="url(#chartGrad)" />
            <path d="M58 54 L66 46 L74 50 L88 34" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="88" cy="34" r="2.5" fill="#F47721" stroke="#FFFFFF" strokeWidth="1" />

            {/* Golden Coins */}
            <ellipse cx="44" cy="58" rx="10" ry="10" fill="#F59E0B" />
            <ellipse cx="44" cy="56" rx="8" ry="8" fill="#FBBF24" />
            <text x="41.5" y="60" fontSize="9" fontWeight="bold" fill="#78350F">₹</text>

            <ellipse cx="34" cy="62" rx="8" ry="8" fill="#D97706" />
            <ellipse cx="34" cy="60" rx="6.5" ry="6.5" fill="#F59E0B" />
            <text x="32" y="63" fontSize="7" fontWeight="bold" fill="#78350F">₹</text>

            <defs>
              <linearGradient id="chartGrad" x1="52" y1="26" x2="98" y2="64" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366F1" />
                <stop offset="1" stopColor="#4F46E5" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Interactive Clickable Date Filter Dropdown */}
        <div className="relative w-full sm:w-auto" ref={dropdownRef}>
          <button
            id="dashboard-date-range-filter-btn"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen((prev) => !prev);
            }}
            className="w-full sm:w-auto inline-flex items-center justify-between sm:justify-start gap-2.5 px-3 sm:px-3.5 py-2.5 bg-white hover:bg-slate-50 active:bg-slate-100 border border-[#E5E7EB] hover:border-[#D1D5DB] rounded-xl text-xs sm:text-sm font-semibold text-[#374151] shadow-xs transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#F47721]/30 select-none"
            title={lang === "gu" ? "તારીખ ફિલ્ટર બદલવા ક્લિક કરો" : "Click to select date range"}
          >
            <div className="flex items-center gap-2 min-w-0 truncate">
              <svg className="w-4 h-4 text-[#6B7280] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="truncate">
                {displayRangeStr}
              </span>
            </div>
            <svg
              className={`w-3.5 h-3.5 text-[#9CA3AF] shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Date Range Dropdown Popover (Fully Responsive - Never clipped) */}
          {isOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 right-0 sm:left-0 sm:right-auto lg:left-auto lg:right-0 mt-2 w-full sm:w-80 max-w-[calc(100vw-2rem)] bg-white border border-[#E5E7EB] rounded-2xl shadow-xl z-50 p-3 sm:p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="text-xs font-bold text-[#111827] uppercase tracking-wider px-1 pt-1">
                {lang === "gu" ? "તારીખ ગાળો પસંદ કરો" : "Select Date Range"}
              </div>

              {/* Preset buttons */}
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                {presets.map((p) => {
                  const isActive = selectedLabel === p.label;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => handleSelectPreset(p.key)}
                      className={`px-2.5 sm:px-3 py-2 text-xs font-semibold rounded-xl text-left transition-colors flex items-center justify-between ${
                        isActive
                          ? "bg-[#FFF3E8] text-[#F47721] font-bold"
                          : "text-[#374151] hover:bg-slate-50 active:bg-slate-100"
                      }`}
                    >
                      <span className="truncate">{lang === "gu" ? p.gu : p.en}</span>
                      {isActive && <span className="text-[#F47721] shrink-0">&bull;</span>}
                    </button>
                  );
                })}
              </div>

              {/* Custom Date Inputs */}
              <div className="pt-2 border-t border-[#F1F5F9] space-y-2">
                <div className="text-[11px] font-bold text-[#6B7280] uppercase px-1">
                  {lang === "gu" ? "કસ્ટમ તારીખ (Custom Range)" : "Custom Date Range"}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#6B7280] font-semibold block mb-0.5">
                      {lang === "gu" ? "શરૂઆત" : "From"}
                    </label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full text-xs font-mono p-1.5 bg-slate-50 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#F47721]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#6B7280] font-semibold block mb-0.5">
                      {lang === "gu" ? "અંત" : "To"}
                    </label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full text-xs font-mono p-1.5 bg-slate-50 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#F47721]"
                    />
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-[#6B7280] hover:text-[#111827] active:bg-slate-100 rounded-lg transition-colors"
                  >
                    {lang === "gu" ? "રદ કરો" : "Cancel"}
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyCustom}
                    className="px-4 py-1.5 bg-[#F47721] hover:bg-[#D95F12] text-white text-xs font-bold rounded-lg shadow-xs transition-colors active:scale-95"
                  >
                    {lang === "gu" ? "લાગુ કરો" : "Apply"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
