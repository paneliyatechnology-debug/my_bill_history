"use client";

import React from "react";
import {
  Building2,
  Users2,
  Receipt,
  LineChart,
  ArrowRight,
} from "lucide-react";

export interface HowItWorksSectionProps {
  lang?: "en" | "gu";
}

export function HowItWorksSection({ lang = "en" }: HowItWorksSectionProps) {
  const gu = lang === "gu";

  const steps = [
    {
      step: "01",
      icon: <Building2 className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
      title: gu ? "૧. વ્યવસાય પ્રોફાઇલ સેટ કરો" : "Set Up Your Business",
      desc: gu
        ? "તમારી પેઢીનું નામ, GSTIN, નાણાકીય વર્ષ, લોગો અને બિલિંગ પદ્ધતિ સેટ કરો."
        : "Add business details, GSTIN, financial year, logo and invoicing preferences.",
    },
    {
      step: "02",
      icon: <Users2 className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
      title: gu ? "૨. પ્રોડક્ટ્સ & વેપારીઓ ઉમેરો" : "Add Products & Parties",
      desc: gu
        ? "પ્રોડક્ટ્સ, કિંમત, HSN કોડ તેમજ ગ્રાહકો અને સપ્લાયર્સની વિગતો સરળતાથી દાખલ કરો."
        : "Create your product catalogue and manage customers and suppliers.",
    },
    {
      step: "03",
      icon: <Receipt className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
      title: gu ? "૩. બિલિંગ & હિસાબ શરૂ કરો" : "Start Billing & Tracking",
      desc: gu
        ? "ઇન્વોઇસ બનાવો, ખરીદી બિલ નોંધો, રોકડ/ઓનલાઇન પેમેન્ટ લો અને સ્ટોક ઓટો-અપડેટ કરો."
        : "Create invoices, record purchases, manage payments and update stock in real time.",
    },
    {
      step: "04",
      icon: <LineChart className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
      title: gu ? "૪. વ્યવસાયનો નફો સમજો" : "Understand Your Business",
      desc: gu
        ? "સ્પષ્ટ નફા-નુકસાન, બેલેન્સ શીટ અને બાકી લેણાંના રિપોર્ટ્સ સાથે વેપાર નિયંત્રિત કરો."
        : "View financial reports, track outstanding balances and monitor business performance.",
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
            {gu ? "શરૂ કરવું એકદમ સરળ છે" : "SIMPLE TO GET STARTED"}
          </span>
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-semibold text-[#172033] tracking-tight leading-tight"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            {gu ? (
              <>
                પ્રથમ ઇન્વોઇસથી લઈને
                <br />
                સંપૂર્ણ વ્યવસાય નિયંત્રણ સુધી.
              </>
            ) : (
              <>
                From First Invoice to Complete
                <br />
                Business Control.
              </>
            )}
          </h2>
          <p
            className="text-sm sm:text-base text-[#667085] mt-3 leading-relaxed max-w-2xl font-normal"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            {gu
              ? "સરળ ૪ સ્ટેપ્સમાં તમારા વ્યવસાયનું સંપૂર્ણ ડિજિટાઇઝેશન કરો. કોઈ જટિલ ટ્રેનિંગની જરૂર નથી."
              : "Four simple steps to transform how you invoice, record expenses, track stock and manage accounts."}
          </p>
        </div>

        {/* 4 Steps Timeline Grid */}
        <div className="relative">
          {/* Desktop Connecting Line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-[#E5EAF1] -translate-y-6 z-0" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            {steps.map((st, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-white border border-[#E5EAF1] shadow-xs hover:border-[#2563EB]/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Step Badge & Icon */}
                  <div className="flex items-center justify-between mb-5">
                    <span
                      className="text-2xl font-semibold text-[#2563EB] tracking-tight"
                      style={{ fontFamily: "var(--font-manrope)" }}
                    >
                      {st.step}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-[#F7F9FC] border border-[#E5EAF1] flex items-center justify-center">
                      {st.icon}
                    </div>
                  </div>

                  {/* Title */}
                  <h3
                    className="text-base font-semibold text-[#172033] mb-2 leading-snug"
                    style={{ fontFamily: "var(--font-manrope)" }}
                  >
                    {st.title}
                  </h3>

                  {/* Description */}
                  <p
                    className="text-xs sm:text-[13px] text-[#667085] leading-relaxed font-normal"
                    style={{ fontFamily: "var(--font-inter)" }}
                  >
                    {st.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
