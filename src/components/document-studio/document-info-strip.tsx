"use client";

import React from "react";
import { DocumentInfoStripProps } from "./types";
import { CustomSelect, CustomCombobox } from "@/components/ui/dropdown-system";
import { CustomDatePicker } from "@/components/ui/custom-datepicker";

export function DocumentInfoStrip({ fields }: DocumentInfoStripProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-3.5 shadow-xs">
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${
          fields.length >= 6 ? "lg:grid-cols-6" : "lg:grid-cols-5"
        } gap-2 sm:gap-2.5 items-end`}
      >
        {fields.map((field) => (
          <div key={field.id} className="space-y-1 min-w-0">
            <label className="block typo-label text-slate-700 truncate">
              {field.label} {field.required && <span className="text-rose-500 font-semibold">*</span>}
            </label>

            {field.customRender ? (
              field.customRender
            ) : field.type === "combobox" ? (
              <CustomCombobox
                size="sm"
                value={field.value ?? ""}
                onChange={(val: any) => field.onChange?.(val)}
                placeholder={field.placeholder || "Select..."}
                options={field.options?.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                  sublabel: opt.sublabel,
                })) || []}
                triggerClassName="rounded-xl border-slate-200 bg-white h-8.5"
              />
            ) : field.type === "select" ? (
              <CustomSelect
                size="sm"
                value={field.value ?? ""}
                onChange={(val: any) => field.onChange?.(val)}
                placeholder={field.placeholder}
                options={field.options?.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                })) || []}
                triggerClassName="rounded-xl border-slate-200 bg-white"
              />
            ) : field.type === "date" ? (
              <CustomDatePicker
                size="sm"
                value={String(field.value ?? "")}
                onChange={(val) => field.onChange?.(val)}
                placeholder={field.placeholder || "DD/MM/YYYY"}
                triggerClassName="rounded-xl border-slate-200 bg-white h-8.5"
              />
            ) : field.readOnly ? (
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value={field.value ?? ""}
                  placeholder={field.placeholder || "Auto-generated"}
                  className="w-full py-1 pl-2.5 pr-14 typo-input bg-slate-50 border border-slate-200/90 rounded-xl text-slate-800 font-mono text-[12px] font-semibold tracking-wide cursor-default select-all focus:outline-none focus:ring-0 focus:border-slate-300 shadow-none h-8.5 truncate"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-200/60 px-1.5 py-0.5 rounded pointer-events-none">
                  {field.badge || "Auto"}
                </span>
              </div>
            ) : (
              <input
                type="text"
                value={field.value ?? ""}
                onChange={(e) => field.onChange?.(e.target.value)}
                placeholder={field.placeholder}
                className="w-full py-1 px-2 typo-input bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 placeholder:text-[11px] focus:outline-none focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/10 shadow-2xs h-8.5 truncate"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
