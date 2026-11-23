"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { formatDate, formatDateForInput, parseDateSafe, getTodayDate } from "@/lib/date-utils";

export interface GlobalDateRangePickerProps {
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  onChange?: (start: string, end: string) => void;
  className?: string;
  triggerClassName?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function GlobalDateRangePicker({
  startDate = "",
  endDate = "",
  onChange,
  className = "",
  triggerClassName = "",
  placeholder = "DD/MM/YYYY - DD/MM/YYYY",
  disabled = false,
}: GlobalDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);

  useEffect(() => {
    setTempStart(startDate);
    setTempEnd(endDate);
  }, [startDate, endDate]);

  const displayString = useMemo(() => {
    if (startDate && endDate) {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    }
    if (startDate) return `${formatDate(startDate)} - Select end`;
    return "";
  }, [startDate, endDate]);

  const handleApplyPreset = (type: "today" | "yesterday" | "this_week" | "this_month" | "this_fy") => {
    const now = new Date();
    let s = new Date();
    let e = new Date();

    if (type === "today") {
      // s and e are today
    } else if (type === "yesterday") {
      s.setDate(s.getDate() - 1);
      e.setDate(e.getDate() - 1);
    } else if (type === "this_week") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      s = new Date(now.setDate(diff));
      e = new Date();
    } else if (type === "this_month") {
      s = new Date(now.getFullYear(), now.getMonth(), 1);
      e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (type === "this_fy") {
      const currentMonth = now.getMonth(); // 0 is Jan
      const fyStartYear = currentMonth >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      s = new Date(fyStartYear, 3, 1); // 1st April
      e = new Date(fyStartYear + 1, 2, 31); // 31st March
    }

    const startIso = formatDateForInput(s);
    const endIso = formatDateForInput(e);
    onChange?.(startIso, endIso);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`h-9 px-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2 text-xs text-slate-800 hover:border-slate-300 font-medium transition-all ${
          isOpen ? "border-[#1677E8] ring-2 ring-[#1677E8]/10" : ""
        } ${triggerClassName}`}
      >
        <div className="flex items-center gap-2 tabular-nums">
          <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
          <span>{displayString || placeholder}</span>
        </div>
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          className="absolute z-50 left-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 w-64 space-y-2 text-xs"
        >
          <div className="font-semibold text-slate-700 px-1 pb-1 border-b border-slate-100">
            Quick Date Filter (DD/MM/YYYY)
          </div>
          <div className="grid grid-cols-1 gap-1">
            <button
              type="button"
              onClick={() => handleApplyPreset("today")}
              className="text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-medium transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("yesterday")}
              className="text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-medium transition-colors"
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("this_week")}
              className="text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-medium transition-colors"
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("this_month")}
              className="text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-medium transition-colors"
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("this_fy")}
              className="text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-medium transition-colors"
            >
              Financial Year (01/04 - 31/03)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
