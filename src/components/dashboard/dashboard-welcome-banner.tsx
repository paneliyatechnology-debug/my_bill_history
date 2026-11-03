"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { formatInr } from "@/components/design-system/tokens";

export interface DashboardWelcomeBannerProps {
  userName?: string;
  companyName?: string;
  lastUpdated?: string;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onOpenAnnouncements?: () => void;
  onOpenScanner?: () => void;
  onOpenDesktopModal?: () => void;
  lang?: "en" | "gu";
}

export function DashboardWelcomeBanner({
  userName,
  companyName = "My Business",
  lastUpdated,
  isRefreshing = false,
  onRefresh,
  onOpenAnnouncements,
  onOpenScanner,
  onOpenDesktopModal,
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

  const displayName = userName ? userName.split(" ")[0] : "Jaydip";

  return (
    <div className="space-y-3.5">
      {/* Upper Hero Welcome Card with 3D Illustration matching Reference */}
      <div className="relative overflow-hidden rounded-2xl border border-[#E1EAF0] bg-gradient-to-r from-[#FFFFFF] via-[#F8FCFA] to-[#E8F8F3] p-5 sm:p-6 shadow-[0_4px_18px_rgba(16,35,63,0.045)]">
        {/* Soft mint ambient glow in top right */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-[#20B99A]/10 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Left: 3D Bill Illustration + Greeting */}
          <div className="flex items-center gap-4 sm:gap-5 min-w-0">
            {/* 3D Decorative Invoice / Growth Graphic */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 select-none">
              <svg viewBox="0 0 88 88" className="w-full h-full drop-shadow-md overflow-visible">
                {/* Back document sheet */}
                <rect x="18" y="12" width="46" height="58" rx="7" fill="#E2F4EE" stroke="#A7E4D3" strokeWidth="1.5" />
                <line x1="26" y1="24" x2="44" y2="24" stroke="#71C9B3" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="26" y1="32" x2="52" y2="32" stroke="#A7E4D3" strokeWidth="2" strokeLinecap="round" />
                <line x1="26" y1="40" x2="48" y2="40" stroke="#A7E4D3" strokeWidth="2" strokeLinecap="round" />

                {/* Front prominent document sheet */}
                <g transform="translate(6, 6)">
                  <rect x="8" y="10" width="50" height="62" rx="8" fill="#FFFFFF" stroke="#C5ECE1" strokeWidth="1.5" />
                  
                  {/* INVOICE text tag */}
                  <rect x="16" y="18" width="28" height="6" rx="3" fill="#0DAA8A" />
                  <text x="20" y="23" fill="#FFFFFF" fontSize="4.5" fontWeight="900" fontFamily="sans-serif">INVOICE</text>

                  {/* Growth chart bars inside invoice */}
                  <rect x="16" y="52" width="5" height="10" rx="1.5" fill="#C5ECE1" />
                  <rect x="23" y="46" width="5" height="16" rx="1.5" fill="#8CE1CC" />
                  <rect x="30" y="38" width="5" height="24" rx="1.5" fill="#20B99A" />
                  <rect x="37" y="30" width="5" height="32" rx="1.5" fill="#0CA678" />

                  {/* Upward trending green arrow */}
                  <path d="M 16 50 Q 28 42, 38 24 L 46 16" fill="none" stroke="#0CA678" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M 40 16 L 46 16 L 46 22" fill="none" stroke="#0CA678" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </g>

                {/* Floating shiny coin/check shield */}
                <circle cx="68" cy="62" r="12" fill="#0CA678" stroke="#FFFFFF" strokeWidth="2" />
                <path d="M 64 62 L 67 65 L 73 59" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Personalized greeting copy */}
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-[#10233F] tracking-tight truncate flex items-center gap-1.5">
                <span>{greeting}, {displayName}!</span>
                <span className="inline-block text-xl sm:text-2xl animate-pulse">👋</span>
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-[#526780] font-medium leading-relaxed truncate">
                {lang === "gu"
                  ? "આ નાણાકીય વર્ષ માટે તમારા વેપારનું લાઇવ વિહંગાવલોકન."
                  : "Here's your business overview for this financial year."}
              </p>
            </div>
          </div>

          {/* Right: Last Updated Status & Refresh Trigger */}
          <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
            {lastUpdated && (
              <div className="flex items-center gap-1.5 text-xs text-[#526780] bg-white/80 border border-[#E1EAF0] px-3 py-1.5 rounded-full shadow-2xs font-medium">
                <span className="w-2 h-2 rounded-full bg-[#0DAA8A] shrink-0" />
                <span>Last Updated:</span>
                <span className="font-mono font-bold text-[#10233F]">{lastUpdated}</span>
              </div>
            )}

            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#D5E4DF] bg-white px-3.5 py-1.5 text-xs font-bold text-[#10233F] shadow-2xs hover:bg-[#F2FAF7] hover:border-[#0DAA8A] transition-all cursor-pointer disabled:opacity-60"
              title="Refresh all business metrics and tables"
            >
              <svg
                className={`w-3.5 h-3.5 text-[#0DAA8A] ${isRefreshing ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.4}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>{lang === "gu" ? "રીફ્રેશ" : "Refresh"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

