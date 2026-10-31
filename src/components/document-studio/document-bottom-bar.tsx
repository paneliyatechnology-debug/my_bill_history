"use client";

import React from "react";
import Link from "next/link";
import { DocumentBottomBarProps } from "./types";

export function DocumentBottomBar({
  totalItems,
  totalAmount,
  onSaveAsDraft,
  onSave,
  isSaving = false,
  saveButtonLabel = "Save Document",
  backHref,
}: DocumentBottomBarProps) {
  const formatCur = (val: string | number | undefined) => {
    if (val === undefined || val === null || val === "") return "₹ 0.00";
    const num = typeof val === "number" ? val : parseFloat(val);
    if (isNaN(num)) return `₹ ${val}`;
    return `₹ ${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-4 sm:px-6 lg:px-8 py-3">
      <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Summary Metric pill */}
        <div className="flex items-center gap-2.5 bg-slate-100/80 px-3.5 py-2 rounded-xl border border-slate-200/60">
          <div className="w-5 h-5 rounded-md bg-[#E6F7F2] text-[#174B43] flex items-center justify-center">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
            <span>Total Items: <strong className="text-slate-900 font-mono">{totalItems}</strong></span>
            <span className="text-slate-300">|</span>
            <span>Total Amount: <strong className="text-[#174B43] font-mono text-sm">{formatCur(totalAmount)}</strong></span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {backHref && (
            <Link
              href={backHref}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </Link>
          )}

          {onSaveAsDraft && (
            <button
              type="button"
              onClick={onSaveAsDraft}
              disabled={isSaving}
              className="px-4 py-2 bg-white hover:bg-[#F2FAF7] hover:border-[#85D5C2] text-slate-700 hover:text-[#174B43] border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              Save as Draft
            </button>
          )}

          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#174B43] hover:bg-[#123B35] text-white rounded-xl text-xs font-extrabold shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>{saveButtonLabel}</span>
                <span className="text-emerald-300">✓</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
