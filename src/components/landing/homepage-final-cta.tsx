"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Zap, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

export interface HomepageFinalCtaProps {
  lang?: "en" | "gu";
  onOpenDemo?: () => void;
}

export function HomepageFinalCta({ lang = "en", onOpenDemo }: HomepageFinalCtaProps) {
  const gu = lang === "gu";

  return (
    <section className="py-14 sm:py-20 bg-white border-b border-[#E5EAF1] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-br from-[#EFF6FF] via-[#F7F9FC] to-white border border-[#BFDBFE] p-8 sm:p-12 lg:p-16 shadow-md overflow-hidden text-center">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

          <div className="max-w-2xl mx-auto space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#BFDBFE] rounded-full text-xs font-semibold text-[#2563EB] shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{gu ? "આજે જ શરૂ કરો" : "Ready in Under 2 Minutes"}</span>
            </span>

            <h2
              className="text-2xl sm:text-4xl font-semibold text-[#172033] tracking-tight leading-tight"
              style={{ fontFamily: "var(--font-manrope)" }}
            >
              {gu
                ? "તમારા વેપારનું ડિજિટલ બિલિંગ શરૂ કરવા માટે તૈયાર છો?"
                : "Ready to Simplify Your Business?"}
            </h2>

            <p className="text-xs sm:text-sm text-[#667085] leading-relaxed font-normal max-w-lg mx-auto">
              {gu
                ? "બિલિંગ, ઇન્વેન્ટરી, ખરીદી અને ખાતાવહી — તમામ કામગીરી MyOwn BillBook સાથે એક જ પ્લેટફોર્મ પર લાવો."
                : "Bring your billing, inventory, purchases, payments and accounting together with MyOwn BillBook."}
            </p>

            {/* CTAs */}
            <div className="pt-4 flex flex-col xs:flex-row items-stretch xs:items-center justify-center gap-3">
              <Link
                href="/login?mode=signup"
                className="h-11 px-7 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98"
              >
                <span>{gu ? "મફત શરૂ કરો (Get Started Free)" : "Get Started Free"}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              {onOpenDemo && (
                <button
                  type="button"
                  onClick={onOpenDemo}
                  className="h-11 px-6 border border-[#E5EAF1] bg-white hover:bg-slate-50 text-[#172033] text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
                >
                  <Zap className="w-4 h-4 text-[#2563EB]" />
                  <span>{gu ? "લાઇવ ડેમો બુક કરો" : "Book a Demo"}</span>
                </button>
              )}
            </div>

            {/* Trust reassurance pills */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-[#667085]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#159B72]" />
                <span>Zero Credit Card Required</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#159B72]" />
                <span>14-Day Full Access Trial</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#159B72]" />
                <span>Instant Setup</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
