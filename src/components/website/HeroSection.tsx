"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Check, Zap, FileText, TrendingUp } from "lucide-react";

export interface HeroSectionProps {
  lang?: "en" | "gu";
  onOpenDemo?: () => void;
}

export function HeroSection({ lang = "en", onOpenDemo }: HeroSectionProps) {
  const gu = lang === "gu";

  return (
    <section className="relative overflow-hidden pt-8 sm:pt-14 lg:pt-20 pb-16 sm:pb-22 lg:pb-26 bg-white border-b border-[#E5EAF1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Editorial Headline & Actions */}
          <div className="lg:col-span-6 space-y-5 sm:space-y-6 text-left">
            {/* Small Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#2563EB] tracking-wider uppercase"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
              <span>GST BILLING • ACCOUNTING • INVENTORY • POS</span>
            </motion.div>

            {/* Main Editorial Headline: 58-68px Desktop */}
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.06 }}
              className="text-3xl xs:text-4xl sm:text-5xl lg:text-[56px] xl:text-[64px] font-semibold text-[#172033] tracking-tight leading-[1.08]"
              style={{ fontFamily: "var(--font-manrope)" }}
            >
              {gu ? (
                <>
                  તમારા વેપારને બનાવો{" "}
                  <span className="text-[#2563EB]">સ્માર્ટ</span>.{" "}
                  બિલ બનાવો{" "}
                  <span className="text-[#2563EB]">ઝડપથી</span>.{" "}
                  વધારો તમારો{" "}
                  <span className="text-[#2563EB]">નફો</span>.
                </>
              ) : (
                <>
                  Run Your Business{" "}
                  <span className="text-[#2563EB]">Smarter</span>.{" "}
                  Bill <span className="text-[#2563EB]">Faster</span>.{" "}
                  Grow <span className="text-[#2563EB]">Bigger</span>.
                </>
              )}
            </motion.h1>

            {/* Description: 15-16px */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.12 }}
              className="text-[15px] sm:text-base text-[#667085] leading-relaxed max-w-xl font-normal"
            >
              {gu
                ? "GST બિલિંગ, ઇન્વેન્ટરી, ખરીદી, પેમેન્ટ્સ અને રોજમેળ ખાતાવહી મેનેજ કરવા માટેનું સંપૂર્ણ સોલ્યુશન — તમામ એક જ શક્તિશાળી પ્લેટફોર્મ પર."
                : "Everything you need to manage GST billing, inventory, purchases, payments and business accounts — all in one powerful platform."}
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.18 }}
              className="pt-2 flex flex-col xs:flex-row items-stretch xs:items-center gap-3"
            >
              <Link
                href="/login?mode=signup"
                className="h-11 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98"
              >
                <span>{gu ? "મફત શરૂ કરો" : "Get Started Free"}</span>
                <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
              </Link>

              {onOpenDemo && (
                <button
                  type="button"
                  onClick={onOpenDemo}
                  className="h-11 px-5 border border-[#E5EAF1] bg-white hover:bg-[#F7F9FC] text-[#172033] text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
                >
                  <Zap className="w-4 h-4 text-[#2563EB]" strokeWidth={1.75} />
                  <span>{gu ? "ડેમો બુક કરો" : "Book a Demo"}</span>
                </button>
              )}
            </motion.div>

            {/* 4 Trust Indicators below CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.24 }}
              className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 border-t border-[#E5EAF1]"
            >
              <div className="flex items-center gap-1.5 text-xs sm:text-[13px] font-medium text-[#172033]">
                <Check className="w-4 h-4 text-[#159B72] shrink-0" strokeWidth={2} />
                <span>GST Billing</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs sm:text-[13px] font-medium text-[#172033]">
                <Check className="w-4 h-4 text-[#159B72] shrink-0" strokeWidth={2} />
                <span>Easy to Use</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs sm:text-[13px] font-medium text-[#172033]">
                <Check className="w-4 h-4 text-[#159B72] shrink-0" strokeWidth={2} />
                <span>Business Control</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs sm:text-[13px] font-medium text-[#172033]">
                <Check className="w-4 h-4 text-[#159B72] shrink-0" strokeWidth={2} />
                <span>Web & Desktop</span>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Real Software Interface Showcase */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="lg:col-span-6 relative mt-4 lg:mt-0"
          >
            {/* Main Application Window Frame */}
            <div className="relative rounded-2xl border border-[#E5EAF1] bg-white shadow-xl overflow-hidden group">
              {/* Window Chrome Header */}
              <div className="h-8 bg-[#F7F9FC] border-b border-[#E5EAF1] px-3.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#CBD5E1]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#CBD5E1]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#CBD5E1]" />
                </div>
                <div className="px-3 py-0.5 rounded-md bg-white border border-[#E5EAF1] text-[11px] text-[#667085] font-mono flex items-center gap-1.5 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  <span>app.myownbillbook.com</span>
                </div>
                <div className="text-[11px] text-[#667085] font-medium hidden sm:block">
                  FY 2026-27
                </div>
              </div>

              {/* Actual Project Dashboard Screenshot */}
              <div className="relative aspect-[16/10] w-full bg-[#F5F8FC] overflow-hidden">
                <Image
                  src="/themes/dashboard-current.png"
                  alt="MyOwn BillBook Dashboard Interface"
                  fill
                  priority
                  sizes="(min-width: 1024px) 640px, 100vw"
                  className="object-cover object-top"
                />
              </div>
            </div>

            {/* Secondary Realistic Layered Detail: Live Invoice Preview Snippet */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.3 }}
              className="hidden sm:flex absolute -bottom-6 -left-6 bg-white rounded-xl border border-[#E5EAF1] p-3 shadow-xl z-10 items-center gap-3 max-w-[260px]"
            >
              <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 text-left">
                <div className="text-xs font-semibold text-[#172033] truncate">
                  ₹ 1,52,515.00 GST Bill
                </div>
                <div className="text-[11px] text-[#667085] flex items-center gap-1 truncate mt-0.5">
                  <span className="truncate">Jaydeep Traders</span>
                  <span>·</span>
                  <span className="text-[#159B72] font-medium">B2B Paid</span>
                </div>
              </div>
            </motion.div>

            {/* Small Sales Analytics Detail: Growth Metric */}
            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.35 }}
              className="hidden sm:flex absolute -top-4 -right-4 bg-white rounded-xl border border-[#E5EAF1] py-2 px-3 shadow-lg z-10 items-center gap-2"
            >
              <div className="w-7 h-7 rounded-md bg-emerald-50 text-[#159B72] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <div className="text-left">
                <span className="text-[10px] text-[#667085] block font-medium">Sales Growth</span>
                <span className="text-xs font-semibold text-[#172033] tabular-nums">+18.6% vs Last Month</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
