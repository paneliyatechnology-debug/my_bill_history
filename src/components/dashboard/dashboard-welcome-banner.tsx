"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  X,
  Check,
  Zap,
  History,
  CalendarDays,
  CalendarRange,
  Clock,
  Briefcase,
  FolderArchive,
} from "lucide-react";

export interface DashboardWelcomeBannerProps {
  userName?: string;
  companyName?: string;
  financialYear?: string;
  lastUpdated?: string;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onOpenAnnouncements?: () => void;
  onOpenScanner?: () => void;
  onOpenDesktopModal?: () => void;
  lang?: "en" | "gu";
  startDate?: string;
  endDate?: string;
  selectedPreset?: string;
  onDateRangeChange?: (start: string, end: string, label: string) => void;
  onResetDateRange?: () => void;
}

/** Compute days remaining in a FY string like "FY 2026-27" */
function getDaysRemainingInFY(financialYear: string): number | null {
  const match = financialYear.match(/(\d{4})-(\d{2})/);
  if (!match) return null;
  const startYear = parseInt(match[1], 10);
  const fyEnd = new Date(`${startYear + 1}-03-31`);
  const now = new Date();
  const diff = Math.ceil((fyEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

export function toDateStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function isoToDDMMYYYY(iso?: string): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return iso;
}

export function parseDDMMYYYY(
  str: string
): { isoStr: string; formatted: string } | null {
  if (!str) return null;
  const cleaned = str.trim();
  let dd: number, mm: number, yyyy: number;

  const match4 = cleaned.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  const match2 = cleaned.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/);

  if (match4) {
    dd = parseInt(match4[1], 10);
    mm = parseInt(match4[2], 10);
    yyyy = parseInt(match4[3], 10);
  } else if (match2) {
    dd = parseInt(match2[1], 10);
    mm = parseInt(match2[2], 10);
    const y2 = parseInt(match2[3], 10);
    yyyy = y2 < 70 ? 2000 + y2 : 1900 + y2;
  } else {
    const digits = cleaned.replace(/\D/g, "");
    if (digits.length === 8) {
      dd = parseInt(digits.slice(0, 2), 10);
      mm = parseInt(digits.slice(2, 4), 10);
      yyyy = parseInt(digits.slice(4, 8), 10);
    } else if (digits.length === 6) {
      dd = parseInt(digits.slice(0, 2), 10);
      mm = parseInt(digits.slice(2, 4), 10);
      const y2 = parseInt(digits.slice(4, 6), 10);
      yyyy = y2 < 70 ? 2000 + y2 : 1900 + y2;
    } else {
      return null;
    }
  }

  if (mm < 1 || mm > 12) return null;
  if (dd < 1 || dd > 31) return null;
  if (yyyy < 1900 || yyyy > 2100) return null;

  const daysInMonth = new Date(yyyy, mm, 0).getDate();
  if (dd > daysInMonth) return null;

  const isoStr = `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  const formatted = `${String(dd).padStart(2, "0")}/${String(mm).padStart(2, "0")}/${yyyy}`;
  return { isoStr, formatted };
}

function formatRangeLabel(startDate?: string, endDate?: string): string {
  if (!startDate || !endDate) return "";
  if (startDate === endDate) {
    return isoToDDMMYYYY(startDate);
  }
  return `${isoToDDMMYYYY(startDate)} – ${isoToDDMMYYYY(endDate)}`;
}

export function calculatePresetRange(
  presetKey: string,
  financialYear?: string,
  now: Date = new Date()
): { start: string; end: string; labelEn: string; labelGu: string } {
  const todayStr = toDateStr(now);

  let startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  if (financialYear) {
    const match = financialYear.match(/(\d{4})/);
    if (match) {
      startYear = parseInt(match[1], 10);
    }
  }

  switch (presetKey) {
    case "today":
      return { start: todayStr, end: todayStr, labelEn: "Today", labelGu: "આજે" };

    case "yesterday": {
      const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const yStr = toDateStr(yest);
      return { start: yStr, end: yStr, labelEn: "Yesterday", labelGu: "ગઈકાલે" };
    }

    case "this-week": {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.getFullYear(), d.getMonth(), diff);
      return { start: toDateStr(monday), end: todayStr, labelEn: "This Week", labelGu: "આ અઠવાડિયે" };
    }

    case "this-month": {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: toDateStr(first), end: todayStr, labelEn: "This Month", labelGu: "આ મહિને" };
    }

    case "last-month": {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: toDateStr(first), end: toDateStr(last), labelEn: "Last Month", labelGu: "ગયા મહિને" };
    }

    case "last-30-days": {
      const past = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
      return { start: toDateStr(past), end: todayStr, labelEn: "Last 30 Days", labelGu: "છેલ્લા 30 દિવસ" };
    }

    case "this-fy": {
      const start = `${startYear}-04-01`;
      return { start, end: todayStr, labelEn: "This FY", labelGu: "આ નાણાકીય વર્ષ" };
    }

    case "last-fy": {
      const start = `${startYear - 1}-04-01`;
      const end = `${startYear}-03-31`;
      return { start, end, labelEn: "Last FY", labelGu: "ગયું નાણાકીય વર્ષ" };
    }

    default:
      return { start: todayStr, end: todayStr, labelEn: "Today", labelGu: "આજે" };
  }
}

const PRESET_OPTIONS: {
  id: string;
  labelEn: string;
  labelGu: string;
  Icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  { id: "today", labelEn: "Today / Live", labelGu: "આજે (લાઈવ)", Icon: Zap, color: "text-amber-500" },
  { id: "yesterday", labelEn: "Yesterday", labelGu: "ગઈકાલે", Icon: History, color: "text-slate-500" },
  { id: "this-week", labelEn: "This Week", labelGu: "આ અઠવાડિયે", Icon: CalendarDays, color: "text-emerald-500" },
  { id: "this-month", labelEn: "This Month", labelGu: "આ મહિને", Icon: Calendar, color: "text-blue-500" },
  { id: "last-month", labelEn: "Last Month", labelGu: "ગયા મહિને", Icon: CalendarRange, color: "text-indigo-500" },
  { id: "last-30-days", labelEn: "Last 30 Days", labelGu: "છેલ્લા 30 દિવસ", Icon: Clock, color: "text-cyan-600" },
  { id: "this-fy", labelEn: "This FY", labelGu: "આ નાણાકીય વર્ષ", Icon: Briefcase, color: "text-violet-500" },
  { id: "last-fy", labelEn: "Last FY", labelGu: "ગયું નાણાકીય વર્ષ", Icon: FolderArchive, color: "text-slate-500" },
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const YEAR_OPTIONS = [2022, 2023, 2024, 2025, 2026, 2027, 2028];

function getCalendarMonth(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  const days: { day: number; iso: string; isCurrentMonth: boolean }[] = [];

  // Prev month padding
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const dateObj = new Date(year, month - 1, d);
    const iso = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ day: d, iso, isCurrentMonth: false });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ day: d, iso, isCurrentMonth: true });
  }

  // Next month padding to fill out 35 or 42 cells
  const remaining = (7 - (days.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const dateObj = new Date(year, month + 1, d);
    const iso = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ day: d, iso, isCurrentMonth: false });
  }

  return days;
}

export function DashboardWelcomeBanner({
  userName = "",
  financialYear = "",
  lastUpdated = "",
  isRefreshing = false,
  onRefresh,
  lang = "en",
  startDate,
  endDate,
  selectedPreset,
  onDateRangeChange,
  onResetDateRange,
}: DashboardWelcomeBannerProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const todayIso = useMemo(() => toDateStr(new Date()), []);
  const [tempFrom, setTempFrom] = useState<string>(startDate || todayIso);
  const [tempTo, setTempTo] = useState<string>(endDate || todayIso);
  const [fromText, setFromText] = useState<string>(isoToDDMMYYYY(startDate || todayIso));
  const [toText, setToText] = useState<string>(isoToDDMMYYYY(endDate || todayIso));
  const [tempPreset, setTempPreset] = useState<string>(selectedPreset || "");

  // Tracks which endpoint the next calendar click sets: "from" or "to"
  const [pickingTarget, setPickingTarget] = useState<"from" | "to">("from");

  // Calendar View month & year
  const initialDate = useMemo(() => {
    return startDate ? new Date(startDate) : new Date();
  }, [startDate]);
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth());
  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());

  const isFiltered = Boolean(
    startDate &&
    endDate &&
    selectedPreset &&
    selectedPreset !== "Live" &&
    selectedPreset !== "Today" &&
    selectedPreset !== "આજે"
  );

  // Sync state when popover opens or filter props change
  useEffect(() => {
    if (isOpen) {
      const s = startDate || todayIso;
      const e = endDate || todayIso;
      setTempFrom(s);
      setTempTo(e);
      setFromText(isoToDDMMYYYY(s));
      setToText(isoToDDMMYYYY(e));
      setTempPreset(selectedPreset || "");
      setPickingTarget("from");

      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        setViewMonth(d.getMonth());
        setViewYear(d.getFullYear());
      }
    }
  }, [isOpen, startDate, endDate, selectedPreset, todayIso]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
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

  // Escape key listener
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return lang === "gu" ? "સુપ્રભાત" : "Good Morning";
    if (hour < 17) return lang === "gu" ? "શુભ બપોર" : "Good Afternoon";
    return lang === "gu" ? "શુભ સાંજ" : "Good Evening";
  }, [lang]);

  const displayName = userName ? userName.split(" ")[0] : "";

  const todayHumanStr = useMemo(() => {
    return new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, []);

  const daysRemaining = useMemo(() => {
    return financialYear ? getDaysRemainingInFY(financialYear) : null;
  }, [financialYear]);

  const rangeDisplay = useMemo(() => {
    return formatRangeLabel(startDate, endDate);
  }, [startDate, endDate]);

  const calendarDays = useMemo(() => {
    return getCalendarMonth(viewYear, viewMonth);
  }, [viewYear, viewMonth]);

  const selectedDaysCount = useMemo(() => {
    if (!tempFrom || !tempTo) return 0;
    const t1 = new Date(tempFrom).getTime();
    const t2 = new Date(tempTo).getTime();
    return Math.max(1, Math.round(Math.abs(t2 - t1) / 86400000) + 1);
  }, [tempFrom, tempTo]);

  // Handle Preset selection
  const handleSelectPreset = (presetId: string) => {
    const { start, end, labelEn, labelGu } = calculatePresetRange(
      presetId,
      financialYear
    );
    const label = lang === "gu" ? labelGu : labelEn;
    setTempFrom(start);
    setTempTo(end);
    setFromText(isoToDDMMYYYY(start));
    setToText(isoToDDMMYYYY(end));
    setTempPreset(label);
    setPickingTarget("from");

    // Move calendar view to preset start date
    const d = new Date(start);
    if (!isNaN(d.getTime())) {
      setViewMonth(d.getMonth());
      setViewYear(d.getFullYear());
    }

    if (presetId === "today") {
      if (onResetDateRange) {
        onResetDateRange();
      } else if (onDateRangeChange) {
        onDateRangeChange(start, end, label);
      }
      setIsOpen(false);
    }
  };

  // Calendar Day Click
  const handleDateClick = (clickedIso: string) => {
    if (pickingTarget === "from") {
      setTempFrom(clickedIso);
      setFromText(isoToDDMMYYYY(clickedIso));
      if (clickedIso > tempTo) {
        setTempTo(clickedIso);
        setToText(isoToDDMMYYYY(clickedIso));
      }
      setPickingTarget("to");
      setTempPreset(lang === "gu" ? "કસ્ટમ" : "Custom");
    } else {
      // picking target is "to"
      if (clickedIso < tempFrom) {
        setTempFrom(clickedIso);
        setFromText(isoToDDMMYYYY(clickedIso));
        setPickingTarget("to");
      } else {
        setTempTo(clickedIso);
        setToText(isoToDDMMYYYY(clickedIso));
        setPickingTarget("from");
      }
      setTempPreset(lang === "gu" ? "કસ્ટમ" : "Custom");
    }
  };

  // Direct Text Input Handlers for From & To
  const handleFromTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setFromText(raw);
    const parsed = parseDDMMYYYY(raw);
    if (parsed) {
      setTempFrom(parsed.isoStr);
      setTempPreset(lang === "gu" ? "કસ્ટમ" : "Custom");
      const d = new Date(parsed.isoStr);
      if (!isNaN(d.getTime())) {
        setViewMonth(d.getMonth());
        setViewYear(d.getFullYear());
      }
    }
  };

  const handleFromTextBlur = () => {
    const parsed = parseDDMMYYYY(fromText);
    if (parsed) {
      setFromText(parsed.formatted);
      setTempFrom(parsed.isoStr);
    } else {
      setFromText(isoToDDMMYYYY(tempFrom));
    }
  };

  const handleToTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setToText(raw);
    const parsed = parseDDMMYYYY(raw);
    if (parsed) {
      setTempTo(parsed.isoStr);
      setTempPreset(lang === "gu" ? "કસ્ટમ" : "Custom");
    }
  };

  const handleToTextBlur = () => {
    const parsed = parseDDMMYYYY(toText);
    if (parsed) {
      setToText(parsed.formatted);
      setTempTo(parsed.isoStr);
    } else {
      setToText(isoToDDMMYYYY(tempTo));
    }
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setViewMonth(now.getMonth());
    setViewYear(now.getFullYear());
  };

  const handleApplyRange = () => {
    if (!tempFrom || !tempTo) return;
    let finalFrom = tempFrom;
    let finalTo = tempTo;
    if (finalFrom > finalTo) {
      const swap = finalFrom;
      finalFrom = finalTo;
      finalTo = swap;
    }
    const label = tempPreset || (lang === "gu" ? "કસ્ટમ" : "Custom");
    if (onDateRangeChange) {
      onDateRangeChange(finalFrom, finalTo, label);
    }
    setIsOpen(false);
  };

  const handleResetToLive = () => {
    if (onResetDateRange) {
      onResetDateRange();
    }
    setTempFrom(todayIso);
    setTempTo(todayIso);
    setFromText(isoToDDMMYYYY(todayIso));
    setToText(isoToDDMMYYYY(todayIso));
    setTempPreset("");
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-1">
      {/* Left: Heading & Subtitle */}
      <div>
        <h1 className="typo-page-title text-[#1E293B] flex items-center gap-2">
          <span>{greeting}{displayName ? `, ${displayName}` : ""}!</span>
          <span className="inline-block text-xl select-none">👋</span>
        </h1>
        <p className="typo-page-subtitle text-[#64748B] mt-0.5">
          {lang === "gu"
            ? `${financialYear || "ચાલુ નાણાકીય વર્ષ"} — આ${todayHumanStr ? ` ${todayHumanStr}` : ""}ના તમારા વ્યવસાયમાં શું થઈ રહ્યું છે.`
            : `${todayHumanStr}${financialYear ? ` · ${financialYear}` : ""}${daysRemaining !== null ? ` · ${daysRemaining} days left` : ""}`}
        </p>
      </div>

      {/* Right: Interactive Last Updated / Date Filter pill + Refresh button */}
      <div className="flex items-center gap-2 self-start sm:self-auto relative" ref={popoverRef}>
        {/* Clickable Date Range Pill */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`flex items-center gap-2 h-9 px-3 rounded-xl border text-xs sm:text-sm font-medium transition-all cursor-pointer select-none shadow-2xs active:scale-[0.98] group ${
            isFiltered
              ? "bg-blue-50/90 hover:bg-blue-100/90 border-blue-300 text-blue-900"
              : "bg-white hover:bg-slate-50 border-[#E2E8F0] hover:border-slate-300 text-[#1E293B]"
          }`}
          title={
            isFiltered
              ? lang === "gu"
                ? "તારીખ ફિલ્ટર સક્રિય છે - બદલવા માટે ક્લિક કરો"
                : "Historical date filter active - click to change"
              : lang === "gu"
                ? "જૂનો ડેટા જોવા માટે ક્લિક કરો (તારીખ ફિલ્ટર)"
                : "Click to filter dashboard by past date range"
          }
        >
          {isFiltered ? (
            <div className="relative flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-blue-600 ring-1 ring-white" />
            </div>
          ) : (
            <Calendar className="w-4 h-4 text-[#64748B] group-hover:text-blue-600 shrink-0 transition-colors" />
          )}

          {isFiltered ? (
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-blue-800">{selectedPreset}:</span>
              <span className="font-medium text-blue-950 tabular-nums text-xs">
                {rangeDisplay}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="font-normal text-[#64748B]">
                {lang === "gu" ? "છેલ્લે અપડેટ:" : "Last Updated:"}
              </span>
              <span className="font-medium text-[#1E293B] tabular-nums">
                {lastUpdated || "—"}
              </span>
            </div>
          )}

          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${
              isOpen ? "rotate-180" : ""
            } ${isFiltered ? "text-blue-600" : "text-[#94A3B8] group-hover:text-[#475569]"}`}
          />
        </button>

        {/* Refresh button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh dashboard data"
          title={lang === "gu" ? "ડેટા રીફ્રેશ કરો" : "Refresh dashboard data"}
          className="w-9 h-9 flex items-center justify-center bg-white hover:bg-slate-50 border border-[#E2E8F0] hover:border-slate-300 rounded-xl shadow-2xs text-[#64748B] hover:text-[#1E293B] transition-all cursor-pointer disabled:opacity-50 active:scale-95 shrink-0"
        >
          <svg
            className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#2563EB]" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>

        {/* Modern SaaS-Grade Interactive Date Range Picker Popover */}
        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-[92vw] sm:w-[530px] max-w-[530px] bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150 select-none">
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 leading-tight">
                    {lang === "gu" ? "તારીખ અને સમયગાળો પસંદ કરો" : "Select Date Range"}
                  </h3>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                    {lang === "gu"
                      ? "જૂનો હિસાબ અને વ્યવહારો જોવા માટે સમયગાળો પસંદ કરો"
                      : "Pick preset or click any 2 dates on calendar"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-100 tabular-nums">
                  DD/MM/YYYY
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title={lang === "gu" ? "બંધ કરો" : "Close"}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Main Content: Left Presets Sidebar + Right Interactive Calendar */}
            <div className="flex flex-col sm:flex-row gap-3 pt-3">
              {/* Left Column: Quick Presets */}
              <div className="sm:w-[150px] shrink-0 sm:border-r border-slate-100 sm:pr-3 flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0 scrollbar-none">
                <div className="hidden sm:block text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 mb-0.5">
                  {lang === "gu" ? "પ્રીસેટ્સ" : "Presets"}
                </div>
                {PRESET_OPTIONS.map((p) => {
                  const isActive =
                    tempPreset === p.labelEn ||
                    tempPreset === p.labelGu ||
                    (!isFiltered && p.id === "today" && !tempPreset);

                  const IconComp = p.Icon;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPreset(p.id)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-xl text-left transition-all cursor-pointer whitespace-nowrap shrink-0 sm:w-full group ${
                        isActive
                          ? "bg-blue-50 text-blue-700 font-bold border border-blue-200/80 shadow-2xs"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                      }`}
                    >
                      <IconComp
                        className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                          isActive ? "text-blue-600" : p.color || "text-slate-400"
                        }`}
                      />
                      <span>{lang === "gu" ? p.labelGu : p.labelEn}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right Column: Custom Inputs + Interactive Calendar Grid */}
              <div className="flex-1 min-w-0">
                {/* Modern From - To Date Range Input Bar */}
                <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200/80 rounded-xl mb-3">
                  {/* From Box */}
                  <div
                    onClick={() => setPickingTarget("from")}
                    className={`flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      pickingTarget === "from"
                        ? "bg-white border-blue-500 shadow-xs ring-2 ring-blue-500/20"
                        : "bg-white/80 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <Calendar className={`w-3.5 h-3.5 shrink-0 ${pickingTarget === "from" ? "text-blue-600" : "text-slate-400"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider leading-none mb-0.5">
                        {lang === "gu" ? "તારીખથી" : "From"}
                      </div>
                      <input
                        type="text"
                        value={fromText}
                        onChange={handleFromTextChange}
                        onBlur={handleFromTextBlur}
                        placeholder="DD/MM/YYYY"
                        className="w-full bg-transparent text-xs font-semibold text-slate-800 focus:outline-none p-0 tracking-wide font-mono"
                      />
                    </div>
                  </div>

                  <span className="text-slate-300 shrink-0 font-medium select-none">→</span>

                  {/* To Box */}
                  <div
                    onClick={() => setPickingTarget("to")}
                    className={`flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      pickingTarget === "to"
                        ? "bg-white border-blue-500 shadow-xs ring-2 ring-blue-500/20"
                        : "bg-white/80 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <Calendar className={`w-3.5 h-3.5 shrink-0 ${pickingTarget === "to" ? "text-blue-600" : "text-slate-400"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider leading-none mb-0.5">
                        {lang === "gu" ? "તારીખ સુધી" : "To"}
                      </div>
                      <input
                        type="text"
                        value={toText}
                        onChange={handleToTextChange}
                        onBlur={handleToTextBlur}
                        placeholder="DD/MM/YYYY"
                        className="w-full bg-transparent text-xs font-semibold text-slate-800 focus:outline-none p-0 tracking-wide font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Calendar Navigation Bar */}
                <div className="flex items-center justify-between px-1 mb-2">
                  <div className="flex items-center gap-1">
                    {/* Month Selector */}
                    <select
                      value={viewMonth}
                      onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                      className="text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-lg px-2 py-1 cursor-pointer focus:outline-none"
                    >
                      {MONTH_NAMES.map((name, idx) => (
                        <option key={idx} value={idx}>
                          {name}
                        </option>
                      ))}
                    </select>

                    {/* Year Selector */}
                    <select
                      value={viewYear}
                      onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                      className="text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-lg px-2 py-1 cursor-pointer focus:outline-none"
                    >
                      {YEAR_OPTIONS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Previous month"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleJumpToToday}
                      className="px-2 py-0.5 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                      title="Jump to current month"
                    >
                      {lang === "gu" ? "આજે" : "Today"}
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Next month"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-0 mb-1 text-center">
                  {WEEKDAYS.map((wd, i) => (
                    <div key={i} className="text-[11px] font-semibold text-slate-400 py-1">
                      {wd}
                    </div>
                  ))}
                </div>

                {/* Interactive Calendar Days Grid */}
                <div className="grid grid-cols-7 gap-y-1 gap-x-0">
                  {calendarDays.map((cell, idx) => {
                    const isStart = cell.iso === tempFrom;
                    const isEnd = cell.iso === tempTo;
                    const isSingle = isStart && isEnd;
                    const isInRange = Boolean(
                      tempFrom && tempTo && cell.iso > tempFrom && cell.iso < tempTo
                    );
                    const isToday = cell.iso === todayIso;

                    let cellWrapperClass = "relative flex items-center justify-center h-8";
                    if (isInRange) {
                      cellWrapperClass += " bg-blue-50/80";
                    } else if (isStart && !isSingle) {
                      cellWrapperClass += " bg-gradient-to-r from-transparent to-blue-50/80 rounded-l-full";
                    } else if (isEnd && !isSingle) {
                      cellWrapperClass += " bg-gradient-to-l from-transparent to-blue-50/80 rounded-r-full";
                    }

                    let buttonClass =
                      "w-7 h-7 text-xs flex items-center justify-center relative transition-all cursor-pointer select-none font-medium";
                    if (isStart || isEnd) {
                      buttonClass += " rounded-full bg-blue-600 text-white font-bold shadow-xs";
                    } else if (isInRange) {
                      buttonClass += " text-blue-900 font-semibold hover:bg-blue-200/60 rounded-full";
                    } else if (cell.isCurrentMonth) {
                      buttonClass += " text-slate-800 hover:bg-slate-100 rounded-full";
                    } else {
                      buttonClass += " text-slate-300 hover:text-slate-500 rounded-full";
                    }

                    return (
                      <div key={idx} className={cellWrapperClass}>
                        <button
                          type="button"
                          onClick={() => handleDateClick(cell.iso)}
                          className={buttonClass}
                        >
                          {cell.day}
                          {isToday && !isStart && !isEnd && (
                            <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-blue-600" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Popover Action Footer */}
            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              {/* Left: Reset to live & Selected days count */}
              <div className="flex items-center gap-2 min-w-0">
                {isFiltered && (
                  <button
                    type="button"
                    onClick={handleResetToLive}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg font-medium cursor-pointer transition-colors shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                    <span>{lang === "gu" ? "આજનો લાઈવ ડેટા" : "Reset to Live"}</span>
                  </button>
                )}
                <span className="text-[11px] text-slate-500 font-medium truncate">
                  {selectedDaysCount > 1
                    ? lang === "gu"
                      ? `${selectedDaysCount} દિવસો પસંદ કરેલ`
                      : `${selectedDaysCount} days selected`
                    : lang === "gu"
                      ? "1 દિવસ પસંદ કરેલ"
                      : "1 day selected"}
                </span>
              </div>

              {/* Right: Cancel & Apply buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  {lang === "gu" ? "રદ કરો" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={handleApplyRange}
                  disabled={!tempFrom || !tempTo}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{lang === "gu" ? "ડેટા જુઓ" : "Apply Range"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
