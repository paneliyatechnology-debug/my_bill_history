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
    <>
      {/* Reserved spacer so page content can scroll completely clear of the fixed bottom bar */}
      <div className="h-24 sm:h-28 w-full shrink-0 pointer-events-none" aria-hidden="true" />

      <div className="fixed bottom-0 right-0 left-0 lg:left-[var(--sidebar-width,240px)] z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-4 sm:px-6 lg:px-8 py-3 transition-[left] duration-300">
        <div className="w-full max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left: Status Indicator matching Reference Image */}
          <div className="flex items-center gap-2.5 typo-card-desc text-slate-700 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span>{statusText || `Ready to save • ${changesCount} changes`}</span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
            {backHref && (
              <Link
                href={backHref}
                className="h-9 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl typo-btn-secondary transition-colors cursor-pointer flex items-center justify-center shrink-0"
              >
                Cancel
              </Link>
            )}

            {onSaveAsDraft && (
              <button
                type="button"
                onClick={onSaveAsDraft}
                disabled={isSaving}
                className="h-9 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl typo-btn-secondary shadow-2xs transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                Save as Draft
              </button>
            )}

            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 h-9 px-4 bg-[#1677E8] hover:bg-[#1268D3] text-white rounded-xl typo-btn-primary shadow-md transition-all cursor-pointer disabled:opacity-50 active:scale-95 shrink-0"
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
                  <span className="text-white font-semibold">→</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
