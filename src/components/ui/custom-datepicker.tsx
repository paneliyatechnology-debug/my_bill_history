"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { formatDate, formatDateForInput, parseDateSafe } from "@/lib/date-utils";

export interface CustomDatePickerProps {
  value?: string; // Format: "YYYY-MM-DD"
  onChange?: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  className?: string;
  triggerClassName?: string;
  size?: "sm" | "md" | "lg";
  minDate?: string;
  maxDate?: string;
  clearable?: boolean;
  id?: string;
  name?: string;
}

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

const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseDate(str?: string): Date | null {
  return parseDateSafe(str);
}

function formatDateToIso(d: Date): string {
  return formatDateForInput(d);
}

function formatDisplayDate(val?: string): string {
  return formatDate(val, "");
}

export function CustomDatePicker({
  value = "",
  onChange,
  placeholder = "DD/MM/YYYY",
  disabled = false,
  readOnly = false,
  required = false,
  className = "",
  triggerClassName = "",
  size = "md",
  minDate,
  maxDate,
  clearable = true,
  id,
  name,
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Selected date parsed
  const selectedDate = useMemo(() => parseDate(value), [value]);

  // Current viewed month and year in calendar
  const [viewYear, setViewYear] = useState<number>(() => {
    return selectedDate ? selectedDate.getFullYear() : new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    return selectedDate ? selectedDate.getMonth() : new Date().getMonth();
  });

  // When value changes from outside, sync view if calendar is not currently open
  useEffect(() => {
    if (selectedDate && !isOpen) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [selectedDate, isOpen]);

  // Viewport-aware coordinate calculation
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    placement: "bottom" | "top";
  } | null>(null);

  const updateCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const popoverHeight = 330;

    const placement: "bottom" | "top" =
      spaceBelow < popoverHeight && spaceAbove > spaceBelow ? "top" : "bottom";

    // Align left, but ensure it doesn't overflow right edge of viewport
    let left = rect.left;
    const popoverWidth = 290;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - popoverWidth - 12);
    }

    if (placement === "bottom") {
      setCoords({
        top: rect.bottom + 6,
        left,
        placement: "bottom",
      });
    } else {
      setCoords({
        bottom: window.innerHeight - rect.top + 6,
        left,
        placement: "top",
      });
    }
  }, []);

  // Update coords on open, scroll, resize
  useEffect(() => {
    if (!isOpen) return;
    updateCoords();

    const handleScroll = (e: Event) => {
      if (panelRef.current && panelRef.current.contains(e.target as Node)) {
        return;
      }
      updateCoords();
    };

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", updateCoords);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [isOpen, updateCoords]);

  // Handle outside click & escape key
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Navigate months
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Quick Select Today
  const handleSelectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    const iso = formatDateToIso(today);
    onChange?.(iso);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setIsOpen(false);
  };

  // Clear Date
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.("");
    setIsOpen(false);
  };

  // Select day
  const handleSelectDay = (day: number) => {
    const selected = new Date(viewYear, viewMonth, day);
    const iso = formatDateToIso(selected);
    onChange?.(iso);
    setIsOpen(false);
  };

  // Calendar days grid computation
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  // Year options for quick select (10 years back, 10 years forward)
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const years = [];
    for (let y = currentYear - 10; y <= currentYear + 10; y++) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  // Sizing styles
  const heightClass =
    size === "sm"
      ? "h-[34px] text-[12.5px] px-2.5"
      : size === "lg"
      ? "h-[44px] text-[14px] px-3.5"
      : "h-[38px] text-[13px] px-3";

  const today = new Date();
  const isToday = (day: number) =>
    today.getDate() === day &&
    today.getMonth() === viewMonth &&
    today.getFullYear() === viewYear;

  const isSelected = (day: number) =>
    selectedDate !== null &&
    selectedDate.getDate() === day &&
    selectedDate.getMonth() === viewMonth &&
    selectedDate.getFullYear() === viewYear;

  const isDayDisabled = (day: number) => {
    const dStr = formatDateToIso(new Date(viewYear, viewMonth, day));
    if (minDate && dStr < minDate) return true;
    if (maxDate && dStr > maxDate) return true;
    return false;
  };

  return (
    <div className={`relative inline-block w-full ${className}`}>
      {/* Hidden input for form serialization */}
      {name && (
        <input
          type="hidden"
          id={id}
          name={name}
          value={value}
          required={required}
        />
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled && !readOnly) {
            setIsOpen((prev) => !prev);
          }
        }}
        className={`w-full bg-white border rounded-xl flex items-center justify-between gap-2 font-normal transition-all outline-none select-none ${heightClass} ${
          disabled
            ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-75"
            : readOnly
            ? "bg-slate-50 text-slate-700 border-slate-200 cursor-default"
            : isOpen
            ? "border-[#1677E8] ring-2 ring-[#1677E8]/15 bg-blue-50/5 text-slate-900"
            : "border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50/40"
        } ${triggerClassName}`}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0" />
          {value ? (
            <span className="font-medium text-slate-900 tabular-nums">
              {formatDisplayDate(value)}
            </span>
          ) : (
            <span className="text-slate-400 font-normal">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {clearable && value && !disabled && !readOnly && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
              title="Clear date"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </button>

      {/* Modern Popover Calendar in Portal */}
      {isOpen &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: "fixed",
              top: coords.top,
              bottom: coords.bottom,
              left: coords.left,
              width: "290px",
              zIndex: 99999,
            }}
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 text-slate-800 font-sans p-3"
          >
            {/* Header: Month & Year Selector + Prev/Next Controls */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <select
                  value={viewMonth}
                  onChange={(e) => setViewMonth(Number(e.target.value))}
                  className="bg-slate-50 hover:bg-slate-100 text-[13px] font-semibold text-slate-800 py-1 px-1.5 rounded-lg border border-slate-200 outline-none cursor-pointer"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={idx}>
                      {name}
                    </option>
                  ))}
                </select>

                <select
                  value={viewYear}
                  onChange={(e) => setViewYear(Number(e.target.value))}
                  className="bg-slate-50 hover:bg-slate-100 text-[13px] font-semibold text-slate-800 py-1 px-1.5 rounded-lg border border-slate-200 outline-none cursor-pointer"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekday Labels */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {DAYS_SHORT.map((day, idx) => (
                <div
                  key={day}
                  className={`text-[11px] font-bold py-1 ${
                    idx === 0 ? "text-rose-500" : "text-slate-400"
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {/* Previous month filler days */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => {
                const dayNum = daysInPrevMonth - firstDayOfWeek + i + 1;
                return (
                  <div
                    key={`prev-${i}`}
                    className="h-8 flex items-center justify-center text-[12px] text-slate-300 font-normal select-none"
                  >
                    {dayNum}
                  </div>
                );
              })}

              {/* Current month days */}
              {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
                const day = i + 1;
                const disabled = isDayDisabled(day);
                const active = isSelected(day);
                const current = isToday(day);

                return (
                  <button
                    key={`curr-${day}`}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleSelectDay(day)}
                    className={`h-8 w-8 mx-auto flex items-center justify-center text-[12.5px] rounded-xl font-medium transition-all cursor-pointer ${
                      active
                        ? "bg-[#1677E8] text-white font-semibold shadow-xs"
                        : current
                        ? "text-[#1677E8] font-bold bg-blue-50/80 ring-1 ring-[#1677E8]/30"
                        : disabled
                        ? "text-slate-300 cursor-not-allowed"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Footer with Today & Clear */}
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11.5px]">
              <button
                type="button"
                onClick={handleSelectToday}
                className="font-semibold text-[#1677E8] hover:text-blue-700 px-2 py-1 rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
              >
                Today
              </button>

              {clearable && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="font-medium text-slate-500 hover:text-slate-700 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

/**
 * Global component aliases as specified in the standardization requirements
 */
export const GlobalDatePicker = CustomDatePicker;

/**
 * Reusable Global Date Formatter Component: renders date in fixed DD/MM/YYYY format
 */
export function GlobalDateFormatter({
  date,
  fallback = "-",
  className = "",
}: {
  date: any;
  fallback?: string;
  className?: string;
}) {
  return <span className={`tabular-nums ${className}`}>{formatDate(date, fallback)}</span>;
}

/**
 * Reusable Global Date Input for forms that require text input with DD/MM/YYYY formatting
 */
export function GlobalDateInput({
  value,
  onChange,
  disabled = false,
  readOnly = false,
  className = "",
  placeholder = "DD/MM/YYYY",
}: {
  value?: string;
  onChange?: (isoDate: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
}) {
  return (
    <CustomDatePicker
      value={value}
      onChange={onChange}
      disabled={disabled}
      readOnly={readOnly}
      className={className}
      placeholder={placeholder}
    />
  );
}

