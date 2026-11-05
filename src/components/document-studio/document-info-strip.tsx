"use client";

import React from "react";
import { DocumentInfoStripProps } from "./types";

export function DocumentInfoStrip({ fields }: DocumentInfoStripProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-3.5 shadow-xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5 items-end">
        {fields.map((field) => (
          <div key={field.id} className="space-y-1 min-w-0">
            <label className="block text-[11px] font-medium text-slate-700 tracking-wide truncate">
              {field.label} {field.required && <span className="text-rose-500 font-bold">*</span>}
            </label>

            {field.customRender ? (
              field.customRender
            ) : field.type === "select" ? (
              <div className="relative">
                <select
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange?.(e.target.value)}
                  className="w-full py-1 px-2 text-xs font-normal bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/10 shadow-2xs appearance-none pr-6 cursor-pointer h-8.5 truncate"
                >
                  {field.placeholder && <option value="">{field.placeholder}</option>}
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            ) : field.type === "date" ? (
              <div className="relative">
                <input
                  type="date"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange?.(e.target.value)}
                  className="w-full py-1 px-1.5 text-[11px] sm:text-xs tabular-nums font-normal bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/10 shadow-2xs cursor-pointer h-8.5"
                />
              </div>
            ) : (
              <input
                type="text"
                value={field.value ?? ""}
                onChange={(e) => field.onChange?.(e.target.value)}
                placeholder={field.placeholder}
                className="w-full py-1 px-2 text-xs font-normal bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 placeholder:text-[11px] focus:outline-none focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/10 shadow-2xs h-8.5 truncate"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
