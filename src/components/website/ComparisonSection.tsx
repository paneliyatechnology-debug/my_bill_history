"use client";

import React from "react";
import { X, Check, ArrowRight, ShieldCheck, Zap } from "lucide-react";

export interface ComparisonSectionProps {
  lang?: "en" | "gu";
}

export function ComparisonSection({ lang = "en" }: ComparisonSectionProps) {
  const gu = lang === "gu";

  const rows = [
    {
      topic: gu ? "૧. બિલ બનાવવાની પદ્ધતિ" : "Invoice Creation & GST Rules",
      traditional: gu
        ? "કાગળના બિલ બુકમાં મેન્યુઅલ ગણતરી, HSN ભૂલો અને અસંગત કર દરો."
        : "Manual paper bills with handwriting errors, mismatched HSN codes and calculation mistakes.",
      mybillbook: gu
        ? "૧૦ સેકન્ડમાં કાયદેસર B2B/B2C GST ઇન્વોઇસ, ઓટોમેટિક ટેક્સ અને WhatsApp શેરિંગ."
        : "Automated 10-second GST invoices, auto tax calculations, custom themes and instant WhatsApp sharing.",
    },
    {
      topic: gu ? "૨. રેકોર્ડ્સ અને ડેટા સંગ્રહ" : "Business Records & Customer Khata",
      traditional: gu
        ? "છૂટાછવાયા કાગળો, ખોવાયેલી રસીદો અને કયા ગ્રાહક પાસે કેટલા બાકી છે તેની અસ્પષ્ટતા."
        : "Scattered paper files, misplaced receipts and confusion over customer outstanding dues.",
      mybillbook: gu
        ? "ગ્રાહક અને સપ્લાયરની સંપૂર્ણ ખાતાવહી અને ક્રેડિટ લિમિટ એક જ સુરક્ષિત ક્લાઉડ પર."
        : "Connected cloud workspace with real-time customer ledgers, payment history and credit alerts.",
    },
    {
      topic: gu ? "૩. સ્ટોક અને ગોડાઉન કંટ્રોલ" : "Inventory & Godown Tracking",
      traditional: gu
        ? "ગોડાઉનમાં રૂબરૂ ગણતરી, અજાણતાં માલ ખતમ થઈ જવો અને એક્સપાયરીમાં નુકસાન."
        : "Manual physical counts, stockouts during peak sales and unnoticed expiry losses.",
      mybillbook: gu
        ? "દરેક બિલ સાથે લાઈવ સ્ટોક અપડેટ, લો-સ્ટોક એલર્ટ્સ અને મલ્ટી-ગોડાઉન ટ્રાન્સફર."
        : "Live stock deduction with each bill, multi-warehouse sync, batch expiry alerts and transfer slips.",
    },
    {
      topic: gu ? "૪. નાણાકીય પરિણામો અને P&L" : "Financial Tracking & Profitability",
      traditional: gu
        ? "વર્ષના અંત સુધી ખબર ન પડે કે વેપારમાં સાચો નફો થયો કે નુકસાન."
        : "Unclear profit margins until year-end CA audit, leading to poor cash flow management.",
      mybillbook: gu
        ? "રોજેરોજ સાચો કાચો અને ચોખ્ખો નફો, બેલેન્સ શીટ અને રોકડમેળની ત્વરિત વિગત."
        : "Instant Profit & Loss statements, real-time balance sheets, daybooks and expense visibility.",
    },
    {
      topic: gu ? "૫. ડેટા મેનેજમેન્ટ" : "Spreadsheets vs Connected Workspace",
      traditional: gu
        ? "અલગ-અલગ એક્સેલ ફાઈલો, વાયરલ ભૂલો અને ડેટા કરપ્શનનું જોખમ."
        : "Multiple disconnected Excel spreadsheets prone to corruption and human errors.",
      mybillbook: gu
        ? "બિલિંગ, ખરીદી, સ્ટોક અને એકાઉન્ટિંગ એક જ જગ્યાએ જોડાયેલા — 100% સુરક્ષિત."
        : "Single centralized Indian ERP workspace designed specifically for traders and retail businesses.",
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-[#F7F9FC] border-b border-[#E5EAF1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 sm:mb-16 text-left">
          <span
            className="text-xs font-semibold text-[#2563EB] uppercase tracking-wider block mb-2"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            {gu ? "પરંપરાગત પદ્ધતિ વિરુદ્ધ આધુનિક વેપાર" : "WHY BUSINESSES CHOOSE US"}
          </span>
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-semibold text-[#172033] tracking-tight leading-tight"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            {gu ? (
              <>
                મેન્યુઅલ કામગીરીથી આગળ વધો.
                <br />
                વેપારને સ્માર્ટ બનાવો.
              </>
            ) : (
              <>
                Move Beyond Manual Business Management.
              </>
            )}
          </h2>
          <p
            className="text-sm sm:text-base text-[#667085] mt-3 leading-relaxed max-w-2xl font-normal"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            {gu
              ? "તપાસો કે કેવી રીતે MyOwnBillBook જૂની પદ્ધતિઓના સમયનો બગાડ અને ભૂલો અટકાવીને તમારા વ્યવસાયને સુરક્ષિત અને ઝડપી બનાવે છે."
              : "Compare traditional manual bookkeeping workflows with a structured, automated accounting system."}
          </p>
        </div>

        {/* Comparison Table / Cards Container */}
        <div className="rounded-2xl bg-white border border-[#E5EAF1] shadow-md overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-1 md:grid-cols-12 bg-[#F7F9FC] border-b border-[#E5EAF1] text-[#172033] p-4 sm:p-5 text-xs sm:text-sm font-semibold">
            <div className="md:col-span-4 uppercase tracking-wider text-[#667085]">
              {gu ? "વ્યવસાયિક કામગીરી" : "Business Operations"}
            </div>
            <div className="md:col-span-4 uppercase tracking-wider text-rose-600 hidden md:block">
              {gu ? "પરંપરાગત મેન્યુઅલ પદ્ધતિ" : "Traditional Manual Methods"}
            </div>
            <div className="md:col-span-4 uppercase tracking-wider text-[#2563EB] hidden md:block">
              MyOwnBillBook
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-[#E5EAF1]">
            {rows.map((row, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-12 p-4 sm:p-6 gap-3 sm:gap-4 hover:bg-[#F7F9FC]/50 transition-colors"
              >
                {/* Topic Title */}
                <div className="md:col-span-4">
                  <h4
                    className="text-sm font-semibold text-[#172033]"
                    style={{ fontFamily: "var(--font-manrope)" }}
                  >
                    {row.topic}
                  </h4>
                </div>

                {/* Traditional (Negative) */}
                <div className="md:col-span-4 p-3 rounded-xl bg-rose-50/60 border border-rose-100/80 md:bg-transparent md:border-0 md:p-0">
                  <div className="md:hidden text-[10px] font-semibold text-rose-700 uppercase mb-1">
                    {gu ? "જૂની પદ્ધતિ" : "Traditional Manual"}
                  </div>
                  <div className="flex items-start gap-2 text-xs text-[#667085] leading-relaxed">
                    <div className="w-4 h-4 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                      <X className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span>{row.traditional}</span>
                  </div>
                </div>

                {/* MyOwnBillBook (Positive) */}
                <div className="md:col-span-4 p-3 rounded-xl bg-[#EFF6FF]/70 border border-[#2563EB]/20 md:bg-transparent md:border-0 md:p-0">
                  <div className="md:hidden text-[10px] font-semibold text-[#2563EB] uppercase mb-1">
                    MyOwnBillBook
                  </div>
                  <div className="flex items-start gap-2 text-xs font-medium text-[#172033] leading-relaxed">
                    <div className="w-4 h-4 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span>{row.mybillbook}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Table Footer Reassurance */}
          <div className="p-4 sm:p-5 bg-[#F7F9FC] border-t border-[#E5EAF1] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#667085]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              {gu
                ? "૧૦૦% સુરક્ષિત ક્લાઉડ બેકઅપ અને ભારતીય GST કાયદા મુજબ માન્ય."
                : "100% cloud encrypted, audit ready and compliant with Indian GST standards."}
            </span>

            <a
              href="#pricing"
              className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1"
            >
              <span>{gu ? "આજે જ અપગ્રેડ કરો" : "Upgrade Your Business Today"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
