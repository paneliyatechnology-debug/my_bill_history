"use client";

import React from "react";
import { Workflow, Calculator, ReceiptText, Package, ChartLine } from "lucide-react";

export interface BenefitsSectionProps {
  lang?: "en" | "gu";
}

export function BenefitsSection({ lang = "en" }: BenefitsSectionProps) {
  const gu = lang === "gu";

  const benefits = [
    {
      num: "01",
      icon: <Workflow className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
      title: gu ? "સરળ વ્યવસાયિક સંચાલન" : "Simplified Business Operations",
      desc: gu
        ? "કાઉન્ટર બિલિંગ, ગોડાઉન, ખરીદી અને એકાઉન્ટિંગ — તમામ પ્રક્રિયાઓ એક જ કેન્દ્રિય પ્લેટફોર્મ પર જોડાયેલી રહે છે જેથી સમયનો બગાડ થતો નથી."
        : "Replace fragmented spreadsheets, paper diaries, and disparate billing machines with one cohesive platform connecting front-counter checkout to the back office.",
    },
    {
      num: "02",
      icon: <Calculator className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
      title: gu ? "સુવ્યવસ્થિત નાણાકીય હિસાબો" : "Organized Financial Records",
      desc: gu
        ? "દરેક વેચાણ અને ખરીદી આપોઆપ ખાતાવહી અને રોજમેળમાં નોંધાય છે. નફો-નુકસાન ખાતું અને સરવૈયું હંમેશા આંગળીના ટેરવે ઉપલબ્ધ રહે છે."
        : "Every sale, vendor purchase, receipt, and payment automatically ties to standard double-entry ledgers with zero end-of-day tallying delays.",
    },
    {
      num: "03",
      icon: <ReceiptText className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
      title: gu ? "પ્રોફેશનલ બિલિંગ અનુભવ" : "Professional Billing Experience",
      desc: gu
        ? "તમારી કંપનીના બ્રાન્ડેડ કલર થીમ્સ અને ડાયનેમિક UPI QR કોડ સાથેના પાકા બિલ ગ્રાહકોને સમયસર પેમેન્ટ કરવા માટે પ્રેરિત કરે છે."
        : "Issue custom-branded GST tax invoices with dynamic UPI payment QR codes and automated WhatsApp sharing that accelerate payment collections.",
    },
    {
      num: "04",
      icon: <Package className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
      title: gu ? "ચોક્કસ સ્ટોક પારદર્શિતા" : "Complete Stock Visibility",
      desc: gu
        ? "કયા ગોડાઉનમાં કયો માલ કેટલો પડ્યો છે, કયો માલ જલ્દી વેચાય છે અને કયો બેચ એક્સપાયર થવાનો છે તેની ચોક્કસ માહિતી હંમેશા સામે રહે છે."
        : "Gain real-time clarity over exact inventory balances across multiple godowns, batch manufacturing numbers, expiry dates, and reorder alerts.",
    },
    {
      num: "05",
      icon: <ChartLine className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
      title: gu ? "વેપાર વૃદ્ધિ માટે સાચા નિર્ણયો" : "Business Performance Insights",
      desc: gu
        ? "વેચાણ ટ્રેન્ડ, કેટેગરી મુજબ નફો અને નિયમિત GSTR-1 & 3B રિપોર્ટ્સ સાથે વેપારને આત્મવિશ્વાસથી આગળ વધારો."
        : "Make confident financial decisions with live revenue curves, item profitability margins, and 1-click statutory GSTR-1 and 3B export returns.",
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-white border-b border-[#E5EAF1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 sm:mb-16 text-left">
          <span className="text-xs font-semibold text-[#2563EB] uppercase tracking-wider block mb-2">
            {gu ? "મૂળભૂત ફાયદા" : "Why MyOwn BillBook"}
          </span>
          <h2
            className="text-2xl sm:text-4xl lg:text-[42px] font-semibold text-[#172033] tracking-tight leading-[1.12]"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            {gu
              ? "તમારા વેપારને આધુનિક પદ્ધતિથી ચલાવવાના વાસ્તવિક ફાયદા."
              : "Clear Advantages for Modern Indian Enterprise."}
          </h2>
          <p className="text-[15px] sm:text-base text-[#667085] mt-3 font-normal leading-relaxed max-w-2xl">
            {gu
              ? "જૂની જટિલ પદ્ધતિઓ છોડીને એક સરળ, સચોટ અને ભરોસાપાત્ર સોલ્યુશન સાથે વ્યવસાયને નિયંત્રિત કરો."
              : "Eliminate repetitive paperwork and human errors with an accounting platform engineered specifically for Indian businesses."}
          </p>
        </div>

        {/* 5-Column Editorial Pillar Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8">
          {benefits.map((b, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl border border-[#E5EAF1] bg-[#F7F9FC] hover:bg-white hover:border-[#2563EB]/40 hover:shadow-xs transition-all duration-200 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-white border border-[#E5EAF1] text-[#2563EB] flex items-center justify-center shadow-2xs">
                    {b.icon}
                  </div>
                  <span className="text-xs font-mono font-semibold text-[#667085]">
                    {b.num}
                  </span>
                </div>

                <h3
                  className="text-base font-semibold text-[#172033] leading-snug"
                  style={{ fontFamily: "var(--font-manrope)" }}
                >
                  {b.title}
                </h3>

                <p className="text-xs sm:text-[13px] text-[#667085] leading-relaxed font-normal">
                  {b.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
