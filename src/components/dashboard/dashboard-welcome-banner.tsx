"use client";

import React, { useMemo } from "react";

export interface DashboardWelcomeBannerProps {
  userName?: string;
  companyName?: string;
  financialYear?: string;
  lastUpdated?: string;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onOpenAnnouncements?: () => void;
  onOpenScanner?: () => void;
  onOpenDesktopModal?: () => void;
  lang?: "en" | "gu";
}

export function DashboardWelcomeBanner({
  userName = "",
  financialYear = "",
  lastUpdated = "",
  isRefreshing = false,
  onRefresh,
  lang = "en",
}: DashboardWelcomeBannerProps) {
  // Determine greeting based on current local hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return lang === "gu" ? "સુપ્રભાત" : "Good Morning";
    }
    if (hour < 17) {
      return lang === "gu" ? "શુભ બપોર" : "Good Afternoon";
    }
    return lang === "gu" ? "શુભ સાંજ" : "Good Evening";
  }, [lang]);

  const displayName = userName ? userName.split(" ")[0] : "";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-1">
      {/* Left: Heading & Subtitle */}
      <div>
        <h1 className="typo-page-title text-[#1E293B] flex items-center gap-2">
          <span>{greeting}{displayName ? `, ${displayName}` : ""}!</span>
          <span className="inline-block text-xl select-none">👋</span>
        </h1>
        <p className="typo-page-subtitle text-[#64748B] mt-0.5">
          {lang === "gu"
            ? `${financialYear || "ચાલુ નાણાકીય વર્ષ"} માટે તમારા વેપારનો સારાંશ.`
            : `Here's your business summary for ${financialYear || "the current financial year"}.`}
        </p>
      </div>

      {/* Right: Last Updated pill + Refresh button */}
      <div className="flex items-center gap-2 self-start sm:self-auto">
        <div className="flex items-center gap-2 h-9 px-3 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs typo-btn-secondary text-[#1E293B]">
          <svg
            className="w-4 h-4 text-[#64748B] shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="font-normal text-[#64748B]">Last Updated:</span>
          <span className="font-medium text-[#1E293B] tabular-nums">{lastUpdated || "—"}</span>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh dashboard data"
          title="Refresh dashboard data"
          className="w-9 h-9 flex items-center justify-center bg-white hover:bg-slate-50 border border-[#E2E8F0] hover:border-slate-300 rounded-xl shadow-2xs text-[#64748B] hover:text-[#1E293B] transition-all cursor-pointer disabled:opacity-50 active:scale-95"
        >
          <svg
            className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#2563EB]" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
