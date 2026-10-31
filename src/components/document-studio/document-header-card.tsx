"use client";

import React, { useState, useRef, useEffect } from "react";
import { DocumentHeaderCardProps } from "./types";

export function DocumentHeaderCard({
  title,
  subtitle = "Create and manage your document",
  status = "Draft",
  onPreview,
  onPrint,
  onSave,
  onSaveAsDraft,
  isSaving = false,
  moreMenuItems = [],
  saveButtonLabel = "Save Document",
}: DocumentHeaderCardProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    }
    if (isMoreOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMoreOpen]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Left: Document Icon, Title & Status */}
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-12 h-12 rounded-xl bg-[#E6F7F2] text-[#174B43] flex items-center justify-center shrink-0 border border-[#85D5C2]/40 shadow-2xs">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>

        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-[#1A2E2B] tracking-tight truncate">
              {title}
            </h1>
            {status && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide bg-[#E6F7F2] text-[#174B43] border border-[#85D5C2]/50">
                <span className="w-1.5 h-1.5 rounded-full bg-[#26A58A] animate-pulse" />
                <span>{status}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right: Actions Toolbar matching Reference Image */}
      <div className="flex items-center gap-2.5 flex-wrap shrink-0">
        {onPreview && (
          <button
            type="button"
            onClick={onPreview}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#F2FAF7] hover:border-[#85D5C2] text-slate-700 hover:text-[#174B43] border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            title="Preview document"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>Preview</span>
          </button>
        )}

        {onPrint && (
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#F2FAF7] hover:border-[#85D5C2] text-slate-700 hover:text-[#174B43] border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            title="Print document"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print</span>
          </button>
        )}

        {moreMenuItems.length > 0 && (
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className="inline-flex items-center gap-1 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <span>More</span>
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isMoreOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                {moreMenuItems.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setIsMoreOpen(false);
                      item.onClick();
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center gap-2 hover:bg-slate-50 transition-colors ${
                      item.danger ? "text-rose-600 hover:bg-rose-50" : "text-slate-700"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-5 py-2.5 bg-gradient-to-r from-[#174B43] to-[#26A58A] hover:from-[#133E37] hover:to-[#208E76] text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-950/15 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            {isSaving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>{saveButtonLabel}</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
