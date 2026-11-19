"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Zap, Check } from "lucide-react";

export interface FinalCTAProps {
  lang?: "en" | "gu";
  onOpenDemo?: () => void;
}

export function FinalCTA({ lang = "en", onOpenDemo }: FinalCTAProps) {
  const gu = lang === "gu";

  return (
    <section className="py-16 sm:py-24 bg-white border-b border-[#E5EAF1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl sm:rounded-3xl bg-[#F7F9FC] border border-[#E5EAF1] p-8 sm:p-14 lg:p-18 text-center max-w-4xl mx-auto">
          <span className="text-xs font-semibold text-[#2563EB] uppercase tracking-wider block mb-3">
            {gu ? "આજે જ શરૂ કરો" : "Start in Under 2 Minutes"}
          </span>

          <h2
            className="text-2xl sm:text-4xl lg:text-5xl font-semibold text-[#172033] tracking-tight leading-[1.12] max-w-2xl mx-auto"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            {gu
              ? "MyOwn BillBook સાથે તમારા વેપારનું સંપૂર્ણ નિયંત્રણ મેળવો."
              : "Take Control of Your Business with MyOwn BillBook."}
          </h2>

          <p className="text-[15px] sm:text-base text-[#667085] leading-relaxed font-normal max-w-xl mx-auto mt-4">
            {gu
              ? "બિલિંગ, ઇન્વેન્ટરી, ખરીદી અને ખાતાવહી — તમામ કામગીરી હવે એક જ આધુનિક અને સુરક્ષિત પ્લેટફોર્મ પર."
              : "Everything you need to manage GST tax invoicing, godown stock, vendor purchases, and double-entry accounts in one platform."}
          </p>

          {/* Action CTAs */}
          <div className="pt-6 flex flex-col xs:flex-row items-stretch xs:items-center justify-center gap-3">
            <Link
              href="/login?mode=signup"
              className="h-11 px-7 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-medium rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98"
            >
              <span>{gu ? "મફત શરૂ કરો" : "Get Started Free"}</span>
              <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
            </Link>

            {onOpenDemo && (
              <button
                type="button"
                onClick={onOpenDemo}
                className="h-11 px-6 border border-[#E5EAF1] bg-white hover:bg-slate-50 text-[#172033] text-xs sm:text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
              >
                <Zap className="w-4 h-4 text-[#2563EB]" strokeWidth={1.75} />
                <span>{gu ? "ડેમો બુક કરો" : "Book a Demo"}</span>
              </button>
            )}
          </div>

          {/* Reassurance text */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-[#667085]">
            <div className="flex items-center gap-1.5 font-medium">
              <Check className="w-4 h-4 text-[#159B72]" strokeWidth={2} />
              <span>14-Day Free Access Trial</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <Check className="w-4 h-4 text-[#159B72]" strokeWidth={2} />
              <span>Zero Credit Card Required</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <Check className="w-4 h-4 text-[#159B72]" strokeWidth={2} />
              <span>Instant Cloud Setup</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
