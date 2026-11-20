"use client";

import React from "react";
import { DocumentInfoStripProps } from "./types";
import { CustomSelect } from "@/components/ui/dropdown-system";

export function DocumentInfoStrip({ fields }: DocumentInfoStripProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-3.5 shadow-xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5 items-end">
        {fields.map((field) => (
          <div key={field.id} className="space-y-1 min-w-0">
            <label className="block typo-label text-slate-700 truncate">
              {field.label} {field.required && <span className="text-rose-500 font-semibold">*</span>}
            </label>

            {field.customRender ? (
              field.customRender
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
              <div className="relative">
                <input
                  type="date"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange?.(e.target.value)}
                  className="w-full py-1 px-1.5 typo-input tabular-nums bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/10 shadow-2xs cursor-pointer h-8.5"
                />
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
