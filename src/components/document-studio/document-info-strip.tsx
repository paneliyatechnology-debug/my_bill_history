"use client";

import React from "react";
import { DocumentInfoStripProps } from "./types";

export function DocumentInfoStrip({ fields }: DocumentInfoStripProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 items-end">
        {fields.map((field) => (
          <div key={field.id} className="space-y-1.5 min-w-0">
            <label className="block text-[11px] font-bold text-slate-700 tracking-wide">
              {field.label} {field.required && <span className="text-rose-500 font-bold">*</span>}
            </label>

            {field.customRender ? (
              field.customRender
            ) : field.type === "select" ? (
              <div className="relative">
                <select
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange?.(e.target.value)}
                  className="w-full py-2 px-3 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#26A58A] focus:ring-2 focus:ring-[#26A58A]/10 shadow-2xs appearance-none pr-8 cursor-pointer"
                >
                  {field.placeholder && <option value="">{field.placeholder}</option>}
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                  className="w-full py-2 px-3 text-xs font-mono font-semibold bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#26A58A] focus:ring-2 focus:ring-[#26A58A]/10 shadow-2xs cursor-pointer"
                />
              </div>
            ) : (
              <input
                type="text"
                value={field.value ?? ""}
                onChange={(e) => field.onChange?.(e.target.value)}
                placeholder={field.placeholder}
                className="w-full py-2 px-3 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#26A58A] focus:ring-2 focus:ring-[#26A58A]/10 shadow-2xs"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
