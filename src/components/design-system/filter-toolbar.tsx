"use client";

import React from "react";
import { X } from "lucide-react";
import { CustomSelect } from "@/components/ui/dropdown-system";

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
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-card">
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
            className="w-full h-10 pl-8 pr-7 bg-[#F8FBFF] border border-[#E2E8F0] rounded-[10px] text-[13px] font-normal text-[#182230] placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:border-[#1677E8] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-700"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Date Preset Dropdown */}
        {onDatePresetChange && (
          <div className="w-[160px]">
            <CustomSelect
              size="sm"
              value={datePreset}
              onChange={(val: any) => onDatePresetChange(val)}
              options={datePresetOptions.map((opt) => ({
                value: opt.value,
                label: lang === "gu" && opt.labelGujarati ? opt.labelGujarati : opt.label,
              }))}
              triggerClassName="rounded-[10px] border-[#E2E8F0] bg-white text-[#182230]"
            />
          </div>
        )}

        {/* Status Dropdown */}
        {onStatusFilterChange && statusOptions && (
          <div className="w-[160px]">
            <CustomSelect
              size="sm"
              value={statusFilter}
              onChange={(val: any) => onStatusFilterChange(val)}
              options={[
                { value: "ALL", label: lang === "gu" ? "બધા સ્ટેટસ (All Status)" : "All Status" },
                ...statusOptions.map((opt) => ({
                  value: opt.value,
                  label: lang === "gu" && opt.labelGujarati ? opt.labelGujarati : opt.label,
                })),
              ]}
              triggerClassName="rounded-[10px] border-[#E2E8F0] bg-white text-[#182230]"
            />
          </div>
        )}

        {extraFilters}

        {/* Clear Filters Button */}
        {hasActiveFilters && onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="text-[13px] font-medium text-rose-600 hover:text-rose-700 hover:underline px-2 py-1 cursor-pointer"
          >
            {lang === "gu" ? "ફિલ્ટર્સ સાફ કરો" : "Clear Filters"}
          </button>
        )}
      </div>
    </div>
  );
}
