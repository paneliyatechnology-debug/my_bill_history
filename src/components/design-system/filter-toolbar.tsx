"use client";

import React from "react";

export interface FilterToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  datePreset?: string;
  onDatePresetChange?: (preset: string) => void;
  datePresetOptions?: Array<{ value: string; label: string; labelGujarati?: string }>;
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
  statusOptions?: Array<{ value: string; label: string; labelGujarati?: string }>;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
  extraFilters?: React.ReactNode;
  lang?: "en" | "gu";
}

export function FilterToolbar({
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  datePreset,
  onDatePresetChange,
  datePresetOptions = [
    { value: "ALL", label: "All Time", labelGujarati: "બધો સમય" },
    { value: "TODAY", label: "Today", labelGujarati: "આજે" },
    { value: "THIS_WEEK", label: "This Week", labelGujarati: "આ અઠવાડિયે" },
    { value: "THIS_MONTH", label: "This Month", labelGujarati: "આ મહિને" },
    { value: "CURRENT_FY", label: "Current FY", labelGujarati: "ચાલુ નાણાકીય વર્ષ" },
  ],
  statusFilter,
  onStatusFilterChange,
  statusOptions,
  onClearFilters,
  hasActiveFilters = false,
  extraFilters,
  lang = "en",
}: FilterToolbarProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E2E8E5] shadow-xs">
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
          <span className="absolute left-3 top-2.5 text-slate-400 pointer-events-none">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder={
              searchPlaceholder ||
              (lang === "gu" ? "શોધો (Search)..." : "Search records...")
            }
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-7 py-2 bg-[#F8FAFC] border border-[#E2E8E5] rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#26A58A] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-700"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Date Preset Dropdown */}
        {onDatePresetChange && (
          <select
            value={datePreset}
            onChange={(e) => onDatePresetChange(e.target.value)}
            className="bg-[#F8FAFC] border border-[#E2E8E5] text-xs font-semibold rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-[#26A58A] transition-colors cursor-pointer"
          >
            {datePresetOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {lang === "gu" && opt.labelGujarati ? opt.labelGujarati : opt.label}
              </option>
            ))}
          </select>
        )}

        {/* Status Dropdown */}
        {onStatusFilterChange && statusOptions && (
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="bg-[#F8FAFC] border border-[#E2E8E5] text-xs font-semibold rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-[#26A58A] transition-colors cursor-pointer"
          >
            <option value="ALL">{lang === "gu" ? "બધા સ્ટેટસ (All Status)" : "All Status"}</option>
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {lang === "gu" && opt.labelGujarati ? opt.labelGujarati : opt.label}
              </option>
            ))}
          </select>
        )}

        {extraFilters}

        {/* Clear Filters Button */}
        {hasActiveFilters && onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline px-2 py-1 cursor-pointer"
          >
            {lang === "gu" ? "ફિલ્ટર્સ સાફ કરો" : "Clear Filters"}
          </button>
        )}
      </div>
    </div>
  );
}
