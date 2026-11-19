"use client";

import React from "react";
import Image from "next/image";
import { Clock, FolderCheck, ShieldCheck, TrendingUp, CheckCircle2 } from "lucide-react";

export interface WhyUsSectionProps {
  lang?: "en" | "gu";
}

export function WhyUsSection({ lang = "en" }: WhyUsSectionProps) {
  const gu = lang === "gu";

  const benefits = [
    {
      title: gu ? "સમય બચાવો (Save Time)" : "Save Time",
      desc: gu
        ? "ઝડપથી ઇન્વોઇસ બનાવો, નિયમિત બિલિંગ કાર્યો સ્વચાલિત કરો અને પુનરાવર્તિત ડેટા એન્ટ્રી ઘટાડો."
        : "Create invoices quickly, automate routine billing tasks and reduce repetitive data entry.",
      icon: <Clock className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
    },
    {
      title: gu ? "સુવ્યવસ્થિત રહો (Stay Organized)" : "Stay Organized",
      desc: gu
        ? "વેચાણ, ખરીદી, સ્ટોક અને એકાઉન્ટિંગ રેકોર્ડ્સને એક જ જોડાયેલી જગ્યાએ સુરક્ષિત રાખો."
        : "Keep sales, purchases, inventory and accounting records connected in one place.",
      icon: <FolderCheck className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
    },
    {
      title: gu ? "GST માટે સદાય તૈયાર (Stay GST Ready)" : "Stay GST Ready",
      desc: gu
        ? "જીએસટી ઇન્વોઇસ, HSN વિગતો, સાચી કર ગણતરી અને તૈયાર GST રિપોર્ટ્સ સરળતાથી સંભાળો."
        : "Manage GST invoices, HSN details, tax calculations and GST reports without calculation errors.",
      icon: <ShieldCheck className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
    },
    {
      title: gu ? "યોગ્ય નિર્ણયો લો (Make Better Decisions)" : "Make Better Decisions",
      desc: gu
        ? "સ્પષ્ટ નફા-નુકસાન, વેચાણ, ખર્ચ અને પાર્ટી લેણાંના રિપોર્ટ્સ દ્વારા વ્યવસાયમાં નફો વધારો."
        : "Understand your sales, expenses, receivables, payables and profitability through clear reports.",
      icon: <TrendingUp className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
    },
  ];

  return (
    <section id="why-us" className="py-16 sm:py-24 bg-[#F7F9FC] border-b border-[#E5EAF1] scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 sm:mb-16 text-left">
          <span
            className="text-xs font-semibold text-[#2563EB] uppercase tracking-wider block mb-2"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            {gu ? "શા માટે MYOWNBILLBOOK" : "WHY MYOWNBILLBOOK"}
          </span>
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-semibold text-[#172033] tracking-tight leading-tight"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            {gu ? (
              <>
                ઓછી ચોપડાપટ્ટી.
                <br />
                વેપાર વધારવા માટે વધુ સમય.
              </>
            ) : (
              <>
                Less Bookkeeping.
                <br />
                More Time to Grow.
              </>
            )}
          </h2>
          <p
            className="text-sm sm:text-base text-[#667085] mt-3 leading-relaxed max-w-2xl font-normal"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            {gu
              ? "વેપાર ચલાવવો પહેલેથી જ જવાબદારીભર્યો છે. તમારું બિલિંગ અને એકાઉન્ટિંગ સોફ્ટવેર કામ સરળ બનાવવું જોઈએ, જટિલ નહીં."
              : "Running a business is already demanding. Your billing and accounting software should make things easier, not more complicated."}
          </p>
        </div>

        {/* Content Grid: Photo on Left, 4 Benefit Blocks on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left: Indian Merchant Photo & Trust Card */}
          <div className="lg:col-span-5 relative">
            <div className="rounded-2xl overflow-hidden border border-[#E5EAF1] shadow-md bg-white aspect-[4/5] relative">
              <Image
                src="/landing/shopkeeper.jpg"
                alt="Indian business owner using MyOwnBillBook"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 40vw"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#172033]/80 via-transparent to-transparent" />

              {/* Photo Caption Overlay */}
              <div className="absolute bottom-5 left-5 right-5 text-white">
                <span className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider block">
                  {gu ? "વિશ્વાસપાત્ર સાથી" : "Trusted by Traders"}
                </span>
                <p className="text-sm sm:text-base font-semibold text-white mt-0.5 leading-snug">
                  {gu
                    ? "ગુજરાત અને ભારતના હજારો વેપારીઓનો રોજિંદો હિસાબ"
                    : "Empowering Indian Retailers, Wholesalers & Distributors"}
                </p>
              </div>
            </div>

            {/* Floating Trust Badge */}
            <div className="absolute -bottom-4 -right-4 sm:right-6 bg-white rounded-xl p-3 shadow-lg border border-[#E5EAF1] flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-[#172033] block">100% Statutory Compliant</span>
                <span className="text-[10px] text-[#667085] block">GST Act & Double-Entry Standards</span>
              </div>
            </div>
          </div>

          {/* Right: 4 Detailed Benefit Cards */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {benefits.map((b, i) => (
              <div
                key={i}
                className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E5EAF1] shadow-xs hover:border-[#2563EB]/40 hover:shadow-sm transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#F7F9FC] border border-[#E5EAF1] flex items-center justify-center mb-3.5">
                    {b.icon}
                  </div>
                  <h3
                    className="text-base font-semibold text-[#172033] mb-2"
                    style={{ fontFamily: "var(--font-manrope)" }}
                  >
                    {b.title}
                  </h3>
                  <p
                    className="text-xs sm:text-[13px] text-[#667085] leading-relaxed font-normal"
                    style={{ fontFamily: "var(--font-inter)" }}
                  >
                    {b.desc}
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
