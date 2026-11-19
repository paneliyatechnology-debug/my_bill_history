"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, PhoneCall, Check } from "lucide-react";

export interface FinalCTAProps {
  lang?: "en" | "gu";
  onOpenDemo?: () => void;
}

export function FinalCTA({ lang = "en", onOpenDemo }: FinalCTAProps) {
  const gu = lang === "gu";

  return (
    <section className="py-14 sm:py-20 bg-white border-b border-[#E5EAF1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl sm:rounded-3xl bg-[#F7F9FC] border border-[#E5EAF1] p-8 sm:p-12 lg:p-16 text-center max-w-4xl mx-auto shadow-xs">
          {/* Eyebrow */}
          <span className="text-xs font-semibold text-[#2563EB] uppercase tracking-wider block mb-3">
            {gu ? "આજે જ શરૂ કરો" : "START TODAY"}
          </span>

          {/* Heading */}
          <h2
            className="text-2xl sm:text-4xl lg:text-[40px] font-semibold text-[#172033] tracking-tight leading-[1.15] max-w-2xl mx-auto"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            {gu
              ? "તમારા વ્યવસાય સંચાલનને સરળ બનાવવા તૈયાર છો?"
              : "Ready to Make Your Business Management Simpler?"}
          </h2>

          {/* Description */}
          <p className="text-sm sm:text-base text-[#667085] leading-relaxed font-normal max-w-xl mx-auto mt-3.5">
            {gu
              ? "બિલિંગ, ઇન્વેન્ટરી અને એકાઉન્ટિંગને એક જ સ્થળે લાવો — MyOwnBillBook સાથે."
              : "Bring billing, inventory, purchases, payments and accounting together with MyOwnBillBook."}
          </p>

          {/* Action CTAs */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              href="/login?mode=signup"
              className="w-full sm:w-auto h-11 px-7 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-medium rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98"
            >
              <span>{gu ? "તમારી મફત ટ્રાયલ શરૂ કરો" : "Start Your Free Trial"}</span>
              <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
            </Link>

            {onOpenDemo && (
              <button
                type="button"
                onClick={onOpenDemo}
                className="w-full sm:w-auto h-11 px-6 border border-[#E5EAF1] bg-white hover:bg-slate-50 text-[#172033] text-xs sm:text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
              >
                <PhoneCall className="w-4 h-4 text-[#2563EB]" strokeWidth={1.75} />
                <span>{gu ? "અમારી ટીમ સાથે વાત કરો" : "Talk to Our Team"}</span>
              </button>
            )}
          </div>

          {/* Reassurance points */}
          <div className="pt-7 mt-8 border-t border-[#E5EAF1] flex flex-wrap items-center justify-center gap-5 sm:gap-8 text-xs text-[#667085]">
            <div className="flex items-center gap-1.5 font-medium">
              <Check className="w-4 h-4 text-[#159B72]" strokeWidth={2} />
              <span>{gu ? "૧૪ દિવસ ફ્રી ટ્રાયલ" : "14-Day Free Access Trial"}</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <Check className="w-4 h-4 text-[#159B72]" strokeWidth={2} />
              <span>{gu ? "કોઈ ક્રેડિટ કાર્ડ જરૂરી નથી" : "No Credit Card Required"}</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <Check className="w-4 h-4 text-[#159B72]" strokeWidth={2} />
              <span>{gu ? "સરળ ડેટા સેટઅપ" : "Seamless Setup & Data Migration"}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
