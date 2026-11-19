"use client";

import React from "react";
import {
  TrendingUp,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Scale,
} from "lucide-react";

export interface AccountingSectionProps {
  lang?: "en" | "gu";
}

export function AccountingSection({ lang = "en" }: AccountingSectionProps) {
  const gu = lang === "gu";

  return (
    <section className="py-16 sm:py-24 bg-[#F7F9FC] border-b border-[#E5EAF1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 sm:mb-16 text-left">
          <span
            className="text-xs font-semibold text-[#2563EB] uppercase tracking-wider block mb-2"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            {gu ? "સચોટ નાણાકીય પારદર્શિતા" : "FINANCIAL VISIBILITY"}
          </span>
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-semibold text-[#172033] tracking-tight leading-tight"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            {gu ? (
              <>
                તમારા આંકડા સમજો.
                <br />
                વેપાર પર સંપૂર્ણ નિયંત્રણ રાખો.
              </>
            ) : (
              <>
                Know Your Numbers.
                <br />
                Control Your Business.
              </>
            )}
          </h2>
          <p
            className="text-sm sm:text-base text-[#667085] mt-3 leading-relaxed max-w-2xl font-normal"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            {gu
              ? "તમારા વ્યવસાયના નાણાકીય સ્વાસ્થ્યનું સ્પષ્ટ ચિત્ર મેળવો — કનેક્ટેડ ડબલ-એન્ટ્રી એકાઉન્ટિંગ અને તૈયાર નાણાકીય રિપોર્ટ્સ સાથે."
              : "Get a clear picture of your business finances with connected accounting and detailed financial reports."}
          </p>
        </div>

        {/* Realistic Accounting Report Dashboard Card */}
        <div className="rounded-2xl bg-white border border-[#E5EAF1] shadow-md p-6 sm:p-8 space-y-6">
          {/* Top Bar with Demonstration Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#E5EAF1]">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
                <Scale className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div>
                <h3
                  className="text-base sm:text-lg font-semibold text-[#172033] leading-none"
                  style={{ fontFamily: "var(--font-manrope)" }}
                >
                  {gu ? "નાણાકીય પરિણામો & સરવૈયું" : "Annual Financial Statement & Balances"}
                </h3>
                <span className="text-xs text-[#667085] mt-0.5 block">
                  Accounting Period: 01 Apr 2026 – 31 Mar 2027 • Double-Entry Standard
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-[#667085] px-2.5 py-1 rounded-full bg-[#F7F9FC] border border-[#E5EAF1]">
                Sample Demonstration Data
              </span>
            </div>
          </div>

          {/* 6 Top Accounting Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="p-3.5 rounded-xl bg-[#F7F9FC] border border-[#E5EAF1]">
              <span className="text-[10px] font-semibold text-[#667085] uppercase block">
                {gu ? "કુલ વેચાણ" : "Total Sales"}
              </span>
              <span className="text-base sm:text-lg font-semibold text-[#172033] tabular-nums mt-1 block">
                ₹ 18,45,200
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                +18.4% YoY
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F7F9FC] border border-[#E5EAF1]">
              <span className="text-[10px] font-semibold text-[#667085] uppercase block">
                {gu ? "કુલ ખરીદી" : "Total Purchases"}
              </span>
              <span className="text-base sm:text-lg font-semibold text-[#172033] tabular-nums mt-1 block">
                ₹ 11,20,800
              </span>
              <span className="text-[10px] text-[#667085] font-medium block mt-0.5">
                COGS Direct
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F7F9FC] border border-[#E5EAF1]">
              <span className="text-[10px] font-semibold text-[#667085] uppercase block">
                {gu ? "કાચો નફો" : "Gross Profit"}
              </span>
              <span className="text-base sm:text-lg font-semibold text-emerald-700 tabular-nums mt-1 block">
                ₹ 7,24,400
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                39.2% Margin
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F7F9FC] border border-[#E5EAF1]">
              <span className="text-[10px] font-semibold text-[#667085] uppercase block">
                {gu ? "ચોખ્ખો નફો" : "Net Profit"}
              </span>
              <span className="text-base sm:text-lg font-semibold text-[#2563EB] tabular-nums mt-1 block">
                ₹ 4,89,600
              </span>
              <span className="text-[10px] text-[#2563EB] font-semibold block mt-0.5">
                26.5% Net Margin
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F7F9FC] border border-[#E5EAF1]">
              <span className="text-[10px] font-semibold text-[#667085] uppercase block">
                {gu ? "લેણી રકમ" : "Receivables"}
              </span>
              <span className="text-base sm:text-lg font-semibold text-[#172033] tabular-nums mt-1 block">
                ₹ 2,34,500
              </span>
              <span className="text-[10px] text-[#667085] font-medium block mt-0.5">
                Sundry Debtors
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F7F9FC] border border-[#E5EAF1]">
              <span className="text-[10px] font-semibold text-[#667085] uppercase block">
                {gu ? "દેણી રકમ" : "Payables"}
              </span>
              <span className="text-base sm:text-lg font-semibold text-[#172033] tabular-nums mt-1 block">
                ₹ 1,12,000
              </span>
              <span className="text-[10px] text-[#667085] font-medium block mt-0.5">
                Sundry Creditors
              </span>
            </div>
          </div>

          {/* 2 Tables: Profit & Loss Preview + Balance Sheet Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* Table 1: Profit & Loss Statement */}
            <div className="p-5 rounded-xl bg-[#F7F9FC] border border-[#E5EAF1] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E5EAF1]">
                <span className="text-xs font-semibold text-[#172033] uppercase tracking-wide">
                  {gu ? "નફા-નુકસાન ખાતું (Profit & Loss)" : "Profit & Loss Account"}
                </span>
                <span className="text-[10px] font-semibold text-[#2563EB]">Trading & Operating</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#E5EAF1]/60">
                  <span className="text-[#172033] font-medium">Sales Revenue (Net of GST)</span>
                  <span className="font-semibold text-[#172033] tabular-nums">₹ 18,45,200</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E5EAF1]/60 text-[#667085]">
                  <span>Less: Cost of Goods Sold (Purchases + Opening Stock)</span>
                  <span className="tabular-nums">- ₹ 11,20,800</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#E5EAF1] font-semibold text-emerald-700 bg-white/60 px-2 rounded">
                  <span>Gross Profit (કાચો નફો)</span>
                  <span className="tabular-nums font-semibold">₹ 7,24,400</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E5EAF1]/60 text-[#667085]">
                  <span>Less: Operational & Administrative Overheads</span>
                  <span className="tabular-nums">- ₹ 2,34,800</span>
                </div>
                <div className="flex justify-between py-2 border-t-2 border-[#172033] text-sm font-semibold text-[#172033] px-2 rounded bg-white">
                  <span>Net Profit Transferred to Capital</span>
                  <span className="text-[#2563EB] tabular-nums">₹ 4,89,600</span>
                </div>
              </div>
            </div>

            {/* Table 2: Balance Sheet Preview */}
            <div className="p-5 rounded-xl bg-[#F7F9FC] border border-[#E5EAF1] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E5EAF1]">
                <span className="text-xs font-semibold text-[#172033] uppercase tracking-wide">
                  {gu ? "સરવૈયું (Balance Sheet)" : "Balance Sheet Statement"}
                </span>
                <span className="text-[10px] font-semibold text-emerald-700">Balanced (100%)</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#E5EAF1]/60">
                  <span className="text-[#172033] font-medium">Proprietor Capital & Retained Earnings</span>
                  <span className="font-semibold text-[#172033] tabular-nums">₹ 8,50,000</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E5EAF1]/60 text-[#667085]">
                  <span>Current Liabilities (Sundry Creditors & Taxes)</span>
                  <span className="tabular-nums">₹ 1,12,000</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E5EAF1]/60 text-[#667085]">
                  <span>Fixed Assets (Counter, Computer, Furniture)</span>
                  <span className="tabular-nums">₹ 4,20,000</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E5EAF1]/60">
                  <span className="text-[#172033] font-medium">Current Assets (Stock in Hand & Debtors)</span>
                  <span className="font-semibold text-[#172033] tabular-nums">₹ 5,42,000</span>
                </div>
                <div className="flex justify-between py-2 border-t-2 border-[#172033] text-sm font-semibold text-[#172033] px-2 rounded bg-white">
                  <span>Total Assets / Liabilities (સરવૈયું)</span>
                  <span className="text-[#172033] tabular-nums">₹ 9,62,000</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Action CTA & Note */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#E5EAF1]">
            <div className="flex items-center gap-2 text-xs text-[#667085]">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {gu
                  ? "દરેક બિલ અને વાઉચર બનાવતાં જ નફા-નુકસાન અને બેલેન્સ શીટ ઓટોમેટિક અપડેટ થાય છે."
                  : "All accounts and ledgers update automatically upon each invoice and purchase voucher."}
              </span>
            </div>

            <a
              href="#pricing"
              className="h-11 px-6 rounded-xl bg-[#172033] hover:bg-[#1a2d45] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              <span>{gu ? "એકાઉન્ટિંગ ફીચર્સ જુઓ" : "Explore Accounting Features"}</span>
              <ArrowRight className="w-4 h-4 text-[#2563EB]" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
