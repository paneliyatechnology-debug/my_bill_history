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
  statusText,
  changesCount = 0,
}: DocumentBottomBarProps) {
  const formatCur = (val: string | number | undefined) => {
    if (val === undefined || val === null || val === "") return "₹ 0.00";
    const num = typeof val === "number" ? val : parseFloat(val);
    if (isNaN(num)) return `₹ ${val}`;
    return `₹ ${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="fixed bottom-0 right-0 left-0 lg:left-[240px] z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-4 sm:px-6 lg:px-8 py-3 transition-[left] duration-200">
      <div className="w-full flex flex-wrap items-center justify-between gap-3">
        {/* Left: Status Indicator matching Reference Image */}
        <div className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span>{statusText || `Ready to save • ${changesCount} changes`}</span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {backHref && (
            <Link
              href={backHref}
              className="h-9 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-[13px] font-medium transition-colors cursor-pointer flex items-center justify-center"
            >
              Cancel
            </Link>
          )}

          {onSaveAsDraft && (
            <button
              type="button"
              onClick={onSaveAsDraft}
              disabled={isSaving}
              className="h-9 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-[13px] font-medium shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              Save as Draft
            </button>
          )}

          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 h-9 px-4 bg-[#1677E8] hover:bg-[#1268D3] text-white rounded-xl text-[13px] font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50 active:scale-95"
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
                <span className="text-white font-bold">→</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
