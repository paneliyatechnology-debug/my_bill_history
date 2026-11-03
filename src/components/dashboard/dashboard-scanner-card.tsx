"use client";

import React from "react";

export interface DashboardScannerCardProps {
  onOpenScanner: () => void;
  lang?: "en" | "gu";
}

export function DashboardScannerCard({
  onOpenScanner,
  lang = "en",
}: DashboardScannerCardProps) {
  return (
    <div
      onClick={onOpenScanner}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenScanner();
        }
      }}
      className="relative overflow-hidden rounded-2xl border border-[#B9EBDD] bg-gradient-to-br from-[#E6FBF5] via-[#EDFCF7] to-[#D5F5EB] p-5 shadow-[0_4px_18px_rgba(16,35,63,0.045)] cursor-pointer hover:border-[#0DAA8A] hover:shadow-[0_8px_24px_rgba(16,35,63,0.08)] transition-all duration-200 group"
    >
      <div className="flex items-center gap-4">
        {/* Left: 3D Paper Bill Illustration matching Reference */}
        <div className="relative w-20 h-24 shrink-0 select-none group-hover:scale-105 transition-transform">
          <svg viewBox="0 0 80 96" className="w-full h-full drop-shadow-sm overflow-visible">
            {/* Corner brackets indicating scanner view */}
            <path d="M 6 18 L 6 6 L 18 6" fill="none" stroke="#0CA678" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 62 6 L 74 6 L 74 18" fill="none" stroke="#0CA678" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 6 78 L 6 90 L 18 90" fill="none" stroke="#0CA678" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 62 90 L 74 90 L 74 78" fill="none" stroke="#0CA678" strokeWidth="2.5" strokeLinecap="round" />

            {/* Document sheet */}
            <rect x="12" y="10" width="56" height="76" rx="6" fill="#FFFFFF" stroke="#C5ECE1" strokeWidth="1.5" />
            
            {/* Header banner */}
            <rect x="18" y="18" width="28" height="6" rx="3" fill="#4388F5" />
            <text x="21" y="23" fill="#FFFFFF" fontSize="4.5" fontWeight="900" fontFamily="sans-serif">INVOICE</text>

            {/* Document lines */}
            <line x1="18" y1="32" x2="48" y2="32" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
            <line x1="18" y1="40" x2="58" y2="40" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
            <line x1="18" y1="48" x2="42" y2="48" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
            <line x1="18" y1="56" x2="54" y2="56" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
            <line x1="18" y1="64" x2="36" y2="64" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" />

            {/* Verification Green Tick Badge */}
            <circle cx="60" cy="72" r="11" fill="#0CA678" stroke="#FFFFFF" strokeWidth="2" />
            <path d="M 56 72 L 59 75 L 65 69" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Right: Copy & Scan Action Button */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm">📷</span>
            <h4 className="text-xs sm:text-sm font-extrabold text-[#10233F] tracking-tight truncate">
              {lang === "gu" ? "AI બિલ સ્કેનર" : "AI Vendor Bill Scanner"}
            </h4>
          </div>

          <p className="text-[11px] text-[#526780] leading-relaxed line-clamp-2">
            {lang === "gu"
              ? "કાગળનું બિલ સ્કેન કરો અથવા PDF અપલોડ કરો. અમારું AI આપમેળે વિગતો ભરી દેશે."
              : "Snap a paper bill or drop a PDF invoice. Our AI automatically extracts line items and taxes."}
          </p>

          <div className="mt-3">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#004D40] hover:bg-[#003D35] text-white text-[11px] font-bold shadow-2xs group-hover:scale-105 transition-all">
              <span>{lang === "gu" ? "દસ્તાવેજ સ્કેન કરો" : "Scan Document"}</span>
              <span>→</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

