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
  companyName = "",
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
        <h1 className="text-[20px] sm:text-[22px] font-semibold text-[#182230] tracking-tight flex items-center gap-2">
          <span>{greeting}{displayName ? `, ${displayName}` : ""}!</span>
          <span className="inline-block text-xl sm:text-2xl select-none">👋</span>
        </h1>
        <p className="mt-0.5 text-xs sm:text-sm text-slate-500 font-medium">
          {lang === "gu"
            ? `${financialYear || "ચાલુ નાણાકીય વર્ષ"} માટે તમારા વેપારનો સારાંશ.`
            : `Here's your business summary for ${financialYear || "the current financial year"}.`}
        </p>
      </div>

      {/* Right: Last Updated pill + Refresh button */}
      <div className="flex items-center gap-2 self-start sm:self-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200/90 rounded-xl shadow-2xs text-xs font-semibold text-slate-700">
          <svg
            className="w-4 h-4 text-slate-500 shrink-0"
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
          <span className="font-normal text-slate-500">Last Updated:</span>
          <span className="font-bold text-slate-800">{lastUpdated || "—"}</span>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh dashboard data"
          title="Refresh dashboard data"
          className="p-2 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl shadow-2xs text-slate-600 hover:text-slate-900 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
        >
          <svg
            className={`w-4 h-4 ${isRefreshing ? "animate-spin text-blue-600" : ""}`}
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
