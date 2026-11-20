"use client";

import React from "react";
import Link from "next/link";
import {
  Check,
  ArrowRight,
  Receipt,
  Smartphone,
  ShieldCheck,
  Calendar,
  Share2,
} from "lucide-react";

export interface HeroSectionProps {
  lang?: "en" | "gu";
  onOpenDemo?: () => void;
}

export function HeroSection({ lang = "en", onOpenDemo }: HeroSectionProps) {
  const gu = lang === "gu";

  const benefits = [
    gu ? "ઝડપી GST & થર્મલ POS બિલિંગ" : "10-Second GST & Thermal POS Invoicing",
    gu ? "મલ્ટી-ગોડાઉન સ્ટોક & બારકોડ સપોર્ટ" : "Multi-Godown Stock & Barcode Billing",
    gu ? "ગ્રાહક ખાતાવહી & WhatsApp રિમાઇન્ડર" : "Party Ledgers & WhatsApp Reminders",
    gu ? "P&L રિપોર્ટ્સ, રોજમેળ & બેલેન્સ શીટ" : "Real-Time Balance Sheet & P&L",
  ];

  return (
    <section className="relative overflow-hidden bg-[#F8FAFC] pt-10 pb-16 sm:pt-14 sm:pb-24 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Column: Value Proposition & CTAs */}
          <div className="lg:col-span-6 space-y-6 text-left">
            {/* Authentic Trust Badge (Zero Emoji, Zero Blink, Clean & Professional) */}
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-medium text-slate-700">
                {gu
                  ? "ભારતીય રિટેલર્સ, હોલસેલર્સ અને ડિસ્ટ્રિબ્યુટર્સ માટે ખાસ"
                  : "Designed for Indian Retailers, Wholesalers & Distributors"}
              </span>
            </div>

            {/* Main Heading (Solid, Executive, Restful on the Eyes) */}
            <h1
              className="text-3xl sm:text-4xl md:text-5xl lg:text-[46px] font-bold text-slate-900 tracking-tight leading-[1.18]"
              style={{ fontFamily: "var(--font-manrope)" }}
            >
              {gu
                ? "સરળ GST બિલિંગ, ગોડાઉન સ્ટોક અને સંપૂર્ણ એકાઉન્ટિંગ સોફ્ટવેર"
                : "Complete GST Billing, Inventory & Accounting Software"}
            </h1>

            {/* Subtitle Description */}
            <p
              className="text-base sm:text-[17px] text-slate-600 leading-relaxed max-w-xl font-normal"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              {gu
                ? "માત્ર ૧૦ સેકન્ડમાં પાકા GST ઇન્વોઇસ બનાવો, ગોડાઉન વાઇઝ સ્ટોક મેનેજ કરો, પાર્ટીઓની ઉધારી ખાતાવહી સાચવો અને WhatsApp પર બિલ મોકલો. ભારતના નાના-મોટા વેપાર માટે તૈયાર."
                : "Generate statutory GST tax invoices in seconds, manage multi-godown inventory, track customer udhari ledgers, and share instant bills on WhatsApp. Built for fast counter billing and error-free books."}
            </p>

            {/* 4 Supporting Feature Checkpoints (Neutral Slate Icons) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {benefits.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 text-slate-700" strokeWidth={2.5} />
                  </div>
                  <span className="text-xs sm:text-[13px] font-medium text-slate-600">
                    {b}
                  </span>
                </div>
              ))}
            </div>

            {/* Action CTAs (Executive Dark Slate, No Eye Glare) */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              <a
                href="#pricing"
                className="h-11 sm:h-12 px-7 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer"
                style={{ fontFamily: "var(--font-inter)" }}
              >
                <span>{gu ? "૩૦ દિવસ મફત ટ્રાયલ શરૂ કરો" : "Start 30-Day Free Trial"}</span>
                <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </a>

              {onOpenDemo && (
                <button
                  type="button"
                  onClick={onOpenDemo}
                  className="h-11 sm:h-12 px-6 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-2xs cursor-pointer"
                  style={{ fontFamily: "var(--font-inter)" }}
                >
                  <Calendar className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
                  <span>{gu ? "લાઇવ ડેમો બુક કરો" : "Schedule Live Demo"}</span>
                </button>
              )}
            </div>

            {/* Reassurance text */}
            <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
              <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={1.75} />
              <span>
                {gu
                  ? "કોઈ ક્રેડિટ કાર્ડ જરૂરી નથી · માત્ર ૨ મિનિટમાં સેટઅપ · ૧૦૦% સુરક્ષિત ક્લાઉડ"
                  : "No credit card required · Setup in 2 minutes · 100% secure cloud"}
              </span>
            </div>
          </div>

          {/* Right Column: Realistic Software Dashboard + Mobile UI Mockup */}
          <div className="lg:col-span-6 relative">
            {/* Desktop Dashboard Card */}
            <div className="rounded-2xl bg-white border border-[#E5EAF1] shadow-lg p-5 sm:p-6 space-y-4">
              {/* App Window Top Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-[#E5EAF1]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] font-semibold text-xs flex items-center justify-center border border-[#2563EB]/20">
                    SG
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-[#172033] leading-none">
                      Shree Ganesh Trading Co.
                    </h4>
                    <span className="text-[10px] text-[#667085] mt-0.5 block">
                      GSTIN: 24ABCDE1234F1Z5 • FY 2026-27
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    GST Active
                  </span>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#2563EB]/30">
                    Pro Edition
                  </span>
                </div>
              </div>

              {/* 4 Financial KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-[#F7F9FC] border border-[#E5EAF1]">
                  <span className="text-[10px] font-medium text-[#667085] block">
                    {gu ? "આજનું વેચાણ" : "Today's Sales"}
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-[#172033] tabular-nums mt-0.5 block">
                    ₹ 4,82,500
                  </span>
                  <span className="text-[9px] font-semibold text-emerald-600 mt-0.5 block">
                    +14.2% vs last wk
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#F7F9FC] border border-[#E5EAF1]">
                  <span className="text-[10px] font-medium text-[#667085] block">
                    {gu ? "કુલ ખરીદી" : "Total Purchases"}
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-[#172033] tabular-nums mt-0.5 block">
                    ₹ 2,94,100
                  </span>
                  <span className="text-[9px] font-medium text-[#667085] mt-0.5 block">
                    18 vendor bills
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#F7F9FC] border border-[#E5EAF1]">
                  <span className="text-[10px] font-medium text-[#667085] block">
                    {gu ? "લેણી રકમ (ઉધારી)" : "Receivables"}
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-[#2563EB] tabular-nums mt-0.5 block">
                    ₹ 1,18,400
                  </span>
                  <span className="text-[9px] font-medium text-[#2563EB] mt-0.5 block">
                    3 parties pending
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#F7F9FC] border border-[#E5EAF1]">
                  <span className="text-[10px] font-medium text-[#667085] block">
                    {gu ? "દેણી રકમ" : "Payables"}
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-[#172033] tabular-nums mt-0.5 block">
                    ₹ 62,800
                  </span>
                  <span className="text-[9px] font-medium text-[#667085] mt-0.5 block">
                    Due in 4 days
                  </span>
                </div>
              </div>

              {/* Middle Row: Trend Chart & Category Split */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Sales Trend Chart */}
                <div className="sm:col-span-2 p-3.5 rounded-xl bg-[#F7F9FC] border border-[#E5EAF1] space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#172033]">
                    <span>{gu ? "વેચાણ ટ્રેન્ડ (છેલ્લા ૭ દિવસ)" : "Weekly Sales Trend"}</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">₹ 1,48,200 avg/wk</span>
                  </div>
                  {/* Bar Chart */}
                  <div className="h-16 flex items-end justify-between gap-1.5 pt-2">
                    {[
                      { day: "Mon", h: "45%", val: "₹18k" },
                      { day: "Tue", h: "60%", val: "₹24k" },
                      { day: "Wed", h: "52%", val: "₹21k" },
                      { day: "Thu", h: "78%", val: "₹31k" },
                      { day: "Fri", h: "68%", val: "₹27k" },
                      { day: "Sat", h: "92%", val: "₹37k" },
                      { day: "Sun", h: "40%", val: "₹16k" },
                    ].map((bar, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                        <div
                          className="w-full rounded-t-sm transition-all duration-300"
                          style={{
                            height: bar.h,
                            backgroundColor: idx === 5 ? "#2563EB" : "#172033",
                            opacity: idx === 5 ? 1 : 0.8,
                          }}
                        />
                        <span className="text-[9px] text-[#667085] font-medium">{bar.day}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Category Split */}
                <div className="p-3.5 rounded-xl bg-[#F7F9FC] border border-[#E5EAF1] flex flex-col justify-between">
                  <span className="text-[11px] font-semibold text-[#172033]">
                    {gu ? "કેટેગરી વાઇઝ વેચાણ" : "Revenue by Category"}
                  </span>
                  <div className="space-y-1.5 py-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[#667085]">Groceries</span>
                      <span className="font-semibold text-[#172033]">48%</span>
                    </div>
                    <div className="w-full bg-[#E5EAF1] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#2563EB] h-full w-[48%]" />
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[#667085]">FMCG Goods</span>
                      <span className="font-semibold text-[#172033]">32%</span>
                    </div>
                    <div className="w-full bg-[#E5EAF1] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#172033] h-full w-[32%]" />
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[#667085]">Packaging</span>
                      <span className="font-semibold text-[#172033]">20%</span>
                    </div>
                    <div className="w-full bg-[#E5EAF1] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-slate-400 h-full w-[20%]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom: Recent Transaction Table Row */}
              <div className="pt-2 border-t border-[#E5EAF1]">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#667085] mb-2">
                  <span>{gu ? "તાજેતરના ઇન્વોઇસ" : "Today's Invoices"}</span>
                  <span className="text-[#2563EB] text-[10px] font-medium">All Branches</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#F7F9FC] text-[11px]">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span className="font-semibold text-[#172033]">INV-2026-089</span>
                      <span className="text-[#667085] truncate max-w-[120px]">Krishna Supermarket</span>
                    </div>
                    <div className="flex items-center gap-2 font-medium">
                      <span className="tabular-nums font-semibold text-[#172033]">₹ 14,850</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold">PAID</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#F7F9FC] text-[11px]">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-3.5 h-3.5 text-[#172033]" />
                      <span className="font-semibold text-[#172033]">INV-2026-088</span>
                      <span className="text-[#667085] truncate max-w-[120px]">Patel Traders (B2B)</span>
                    </div>
                    <div className="flex items-center gap-2 font-medium">
                      <span className="tabular-nums font-semibold text-[#172033]">₹ 42,600</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold">DUE 15D</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Mobile App Preview Card (Beside / Overlap) */}
            <div className="hidden sm:flex absolute -bottom-6 -right-3 w-56 rounded-2xl bg-white text-[#172033] p-3.5 shadow-xl border border-[#E5EAF1] flex-col gap-2.5 animate-in slide-in-from-bottom duration-300">
              <div className="flex items-center justify-between border-b border-[#E5EAF1] pb-2">
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span className="text-[11px] font-semibold text-[#172033] tracking-wide">POS Mobile Billing</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">Ready</span>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] text-[#667085]">Quick Counter Bill #412</div>
                <div className="text-base font-semibold text-[#172033] tabular-nums">₹ 1,450.00</div>
                <div className="text-[9px] text-emerald-600 font-medium">✓ Cash Tendered & Stock Updated</div>
              </div>

              <div className="pt-1.5 border-t border-[#E5EAF1] flex items-center justify-between text-[10px]">
                <span className="text-[#667085] flex items-center gap-1">
                  <Share2 className="w-3 h-3 text-[#2563EB]" />
                  WhatsApp Bill
                </span>
                <span className="text-[#2563EB] font-semibold">Sent ✓</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}