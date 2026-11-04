"use client";

import React from "react";
import Link from "next/link";

export interface ReportEmptyStateProps {
  title?: string;
  titleGu?: string;
  description?: string;
  descriptionGu?: string;
  icon?: React.ReactNode;
  primaryAction?: {
    label: string;
    labelGu?: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    labelGu?: string;
    onClick: () => void;
  };
  lang?: string;
}

export function ReportEmptyState({
  title = "No data available",
  titleGu = "કોઈ ડેટા ઉપલબ્ધ નથી",
  description = "There are no records for the selected date range. Try changing the dates or create your first transaction.",
  descriptionGu = "પસંદ કરેલી તારીખ માટે કોઈ રેકોર્ડ મળ્યો નથી. તારીખ બદલો અથવા નવી એન્ટ્રી બનાવો.",
  icon,
  primaryAction,
  secondaryAction,
  lang = "en",
}: ReportEmptyStateProps) {
  const isGu = lang === "gu";

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xs p-6 sm:p-10 text-center my-4 max-w-lg mx-auto w-full transition-all">
      {/* Forest Teal & Jade Icon Circle */}
      <div className="w-14 h-14 rounded-full bg-[#EFF6FF] border border-[#93C5FD] flex items-center justify-center text-[#1677E8] mx-auto text-2xl shadow-inner mb-4">
        {icon || (
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        )}
      </div>

      {/* Heading */}
      <h3 className="text-[15px] sm:text-[15px] font-semibold text-[#182230] tracking-tight">
        {isGu ? titleGu : title}
      </h3>

      {/* Description */}
      <p className="text-xs sm:text-sm text-[#5A6B66] mt-1.5 max-w-sm mx-auto leading-relaxed">
        {isGu ? descriptionGu : description}
      </p>

      {/* Action Buttons */}
      {(primaryAction || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 mt-5">
          {primaryAction &&
            (primaryAction.href ? (
              <Link
                href={primaryAction.href}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-9 px-3 bg-[#1677E8] hover:bg-[#1268D3] text-white text-[13px] font-medium rounded-lg shadow-blue-500/20 transition-all transform active:scale-98"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
                </svg>
                <span>{isGu ? primaryAction.labelGu || primaryAction.label : primaryAction.label}</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={primaryAction.onClick}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-9 px-3 bg-[#1677E8] hover:bg-[#1268D3] text-white text-[13px] font-medium rounded-lg shadow-blue-500/20 transition-all transform active:scale-98"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
                </svg>
                <span>{isGu ? primaryAction.labelGu || primaryAction.label : primaryAction.label}</span>
              </button>
            ))}

          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 h-9 px-3 bg-[#F0F5F4] hover:bg-[#F1F5F9] text-[#0F172A] border border-[#BFDBFE] text-[13px] font-medium rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{isGu ? secondaryAction.labelGu || secondaryAction.label : secondaryAction.label}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
