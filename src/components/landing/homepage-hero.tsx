"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  TrendingUp,
  Receipt,
  FileCheck2,
  Sparkles,
} from "lucide-react";

export interface HomepageHeroProps {
  lang?: "en" | "gu";
  onOpenDemo?: () => void;
}

export function HomepageHero({ lang = "en", onOpenDemo }: HomepageHeroProps) {
  const gu = lang === "gu";

  return (
    <section className="relative overflow-hidden pt-6 sm:pt-12 lg:pt-16 pb-12 sm:pb-18 lg:pb-22 bg-gradient-to-b from-[#F7F9FC] via-[#F7F9FC] to-white border-b border-[#E5EAF1]">
      {/* Subtle ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[360px] bg-blue-500/6 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
          {/* Left Column: Heading & CTAs */}
          <div className="lg:col-span-6 space-y-4 sm:space-y-5 text-left">
            {/* Small Badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] text-[10px] sm:text-[11px] font-semibold tracking-wide uppercase"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
              <span className="truncate">GST BILLING • ACCOUNTING • INVENTORY • POS</span>
            </motion.div>

            {/* Main Editorial Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 }}
              className="text-2xl xs:text-3xl sm:text-4xl lg:text-[44px] xl:text-[50px] font-semibold text-[#172033] tracking-tight leading-[1.14]"
              style={{ fontFamily: "var(--font-manrope)" }}
            >
              {gu ? (
                <>
                  તમારા વેપારને બનાવો{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#1D4ED8]">
                    સ્માર્ટ
                  </span>
                  . બિલ બનાવો{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#1D4ED8]">
                    ઝડપથી
                  </span>
                  . વધારો તમારો{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#1D4ED8]">
                    નફો
                  </span>
                  .
                </>
              ) : (
                <>
                  Run Your Business{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#1D4ED8]">
                    Smarter
                  </span>
                  . Bill{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#1D4ED8]">
                    Faster
                  </span>
                  . Grow{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#1D4ED8]">
                    Bigger
                  </span>
                  .
                </>
              )}
            </motion.h1>

            {/* Subtitle Description */}
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="text-xs sm:text-sm lg:text-base text-[#667085] leading-relaxed max-w-xl font-normal"
            >
              {gu
                ? "GST બિલિંગ, ઇન્વેન્ટરી, ખરીદી, પેમેન્ટ્સ અને રોજમેળ ખાતાવહી મેનેજ કરવા માટેનું સંપૂર્ણ સોલ્યુશન — તમામ એક જ સુરક્ષિત પ્લેટફોર્મ પર."
                : "Everything you need to manage GST billing, inventory, purchases, payments and business accounts — all in one powerful platform."}
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="pt-2 flex flex-col xs:flex-row items-stretch xs:items-center gap-2.5 sm:gap-3.5"
            >
              <Link
                href="/login?mode=signup"
                className="h-11 px-5 sm:px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98"
              >
                <span>{gu ? "મફત શરૂ કરો" : "Get Started Free"}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              {onOpenDemo && (
                <button
                  type="button"
                  onClick={onOpenDemo}
                  className="h-11 px-4 sm:px-5 border border-[#E5EAF1] bg-white hover:bg-[#F7F9FC] text-[#172033] text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
                >
                  <Zap className="w-4 h-4 text-[#2563EB]" />
                  <span>{gu ? "લાઇવ ડેમો બુક કરો" : "Book a Demo"}</span>
                </button>
              )}
            </motion.div>

            {/* 4 Trust Indicators below CTAs */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="pt-3 sm:pt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 border-t border-[#E5EAF1]/70"
            >
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-[#172033]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#159B72] shrink-0" />
                <span>GST Billing</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-[#172033]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#159B72] shrink-0" />
                <span>Easy to Use</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-[#172033]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#159B72] shrink-0" />
                <span>Business Control</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-[#172033]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#159B72] shrink-0" />
                <span>Web & Desktop</span>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Premium Realistic Product Showcase */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="lg:col-span-6 relative mt-4 lg:mt-0"
          >
            {/* Outer Browser Mockup Frame */}
            <div className="relative rounded-2xl border border-[#E5EAF1] bg-white shadow-xl overflow-hidden group">
              {/* Browser Top Window Chrome */}
              <div className="h-7 sm:h-8 bg-[#F7F9FC] border-b border-[#E5EAF1] px-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#CBD5E1]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#CBD5E1]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#CBD5E1]" />
                </div>
                <div className="px-2.5 py-0.5 rounded-md bg-white border border-[#E5EAF1] text-[10px] text-[#667085] font-mono flex items-center gap-1.5 truncate max-w-[160px] sm:max-w-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                  <span className="truncate">app.myownbillbook.com</span>
                </div>
                <div className="text-[10px] text-[#667085] font-medium hidden sm:block">FY 2026-27</div>
              </div>

              {/* Real Dashboard Image */}
              <div className="relative aspect-[16/10] w-full bg-[#F5F8FC] overflow-hidden">
                <Image
                  src="/themes/dashboard-current.png"
                  alt="MyOwn BillBook Dashboard"
                  fill
                  priority
                  sizes="(min-width: 1024px) 600px, 100vw"
                  className="object-cover object-top"
                />
              </div>
            </div>

            {/* Floating Card 1: Today's Sales KPI with Spline */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.3 }}
              className="absolute -bottom-3 sm:-bottom-5 left-1 sm:-left-6 bg-white/95 backdrop-blur-md rounded-xl border border-[#E5EAF1] p-2.5 sm:p-3 shadow-lg select-none z-10 max-w-[170px] sm:max-w-[210px]"
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[9px] sm:text-[10px] font-semibold text-[#667085]">Total Sales (FY)</span>
                <span className="inline-flex items-center text-[9px] sm:text-[10px] font-semibold text-[#159B72]">
                  <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5" />
                  +18.6%
                </span>
              </div>
              <div className="text-xs sm:text-base font-semibold text-[#172033] tabular-nums mt-0.5">
                ₹ 15,92,688.65
              </div>
              <div className="text-[9px] sm:text-[10px] text-[#667085] mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                <span>30-Day Growth</span>
              </div>
            </motion.div>

            {/* Floating Card 2: Live Activity Ping */}
            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.35 }}
              className="absolute -top-3 sm:-top-4 right-1 sm:-right-4 bg-white/95 backdrop-blur-md rounded-xl border border-[#E5EAF1] p-2 sm:p-2.5 shadow-lg select-none z-10 flex items-center gap-2 max-w-[190px] sm:max-w-[230px]"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-[#159B72] border border-emerald-200 flex items-center justify-center shrink-0">
                <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs font-semibold text-[#172033] truncate">
                  ₹24,580 GST Bill
                </div>
                <div className="text-[9px] sm:text-[10px] text-[#667085] flex items-center gap-1 truncate">
                  <span>Jaydeep Traders</span>
                  <span>·</span>
                  <span className="text-[#159B72] font-medium">B2B Paid</span>
                </div>
              </div>
            </motion.div>

            {/* Floating Card 3: Instant GST Compliance Pill (desktop/tablet) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, delay: 0.4 }}
              className="hidden md:flex absolute top-1/2 -right-6 translate-y-2 bg-white/95 backdrop-blur-md rounded-xl border border-[#E5EAF1] py-1.5 px-3 shadow-md items-center gap-2 z-10"
            >
              <FileCheck2 className="w-4 h-4 text-[#2563EB]" />
              <span className="text-xs font-semibold text-[#172033]">100% Statutory GST</span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
