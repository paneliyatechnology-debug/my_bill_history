"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

export interface PricingSectionProps {
  lang?: "en" | "gu";
  onOpenDemo?: () => void;
}

export function PricingSection({ lang = "en", onOpenDemo }: PricingSectionProps) {
  const gu = lang === "gu";
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");

  const plans = [
    {
      id: "starter",
      name: gu ? "સ્ટાર્ટર પ્લાન (Starter)" : "Starter Plan",
      subtitle: gu ? "નાની દુકાનો અને સિંગલ કાઉન્ટર માટે" : "For single retail counters & independent shops",
      monthlyPrice: 499,
      yearlyPrice: 399,
      popular: false,
      features: [
        gu ? "૧ કંપની અથવા દુકાન પ્રોફાઇલ" : "1 Business Company Profile",
        gu ? "વર્ષે ૩,૦૦૦ ઇન્વૉઇસ સુધી" : "Up to 3,000 Invoices per year",
        gu ? "સ્ટાન્ડર્ડ B2B અને B2C GST બિલિંગ" : "Standard B2B & B2C GST Invoicing",
        gu ? "A4 લેસર અને ૫૮mm/૮૦mm થર્મલ પ્રિન્ટ" : "A4 Laser & 58/80mm Thermal Print",
        gu ? "લાઇવ વેચાણ ચાર્ટ અને રોકડ રિપોર્ટ્સ" : "Basic Sales & Cash Reports",
        gu ? "સ્ટાન્ડર્ડ ચેટ અને ઇમેઇલ હેલ્પડેસ્ક" : "Standard Chat & Email Support",
      ],
      ctaText: gu ? "સ્ટાર્ટર શરૂ કરો" : "Start Free Trial",
      ctaHref: "/login?mode=signup",
    },
    {
      id: "professional",
      name: gu ? "પ્રોફેશનલ પ્લાન (Professional)" : "Professional Plan",
      subtitle: gu ? "હોલસેલર્સ અને વધતા વ્યવસાયો માટે" : "For growing wholesalers, traders & multi-counter shops",
      monthlyPrice: 999,
      yearlyPrice: 799,
      popular: true,
      features: [
        gu ? "૩ કંપનીઓ અથવા બ્રાન્ચ સુધી" : "Up to 3 Business Companies",
        gu ? "અનલિમિટેડ ઇન્વૉઇસ અને e-Way Bills" : "Unlimited Invoices & E-Way Bills",
        gu ? "ખરીદી બિલ AI કેમેરા સ્કેનર (OCR)" : "Purchase Bill AI Camera Scanner (OCR)",
        gu ? "બહુ-ગોડાઉન સ્ટોક સિન્ક & ટ્રાન્સફર" : "Multi-Godown Stock Sync & Transfer Slips",
        gu ? "WhatsApp ઓટોમેટિક રિમાઇન્ડર્સ" : "Automated WhatsApp Reminders & Statements",
        gu ? "GSTR-1, 3B અને 2B તૈયાર ફાઈલો" : "GSTR-1, 3B & 2B Return Preparation",
        gu ? "પ્રાથમિક ફોન અને રિમોટ સપોર્ટ" : "Priority Phone & Remote Support",
      ],
      ctaText: gu ? "સૌથી લોકપ્રિય — શરૂ કરો" : "Get Started Free",
      ctaHref: "/login?mode=signup",
    },
    {
      id: "enterprise",
      name: gu ? "એન્ટરપ્રાઇઝ પ્લાન (Enterprise)" : "Enterprise Plan",
      subtitle: gu ? "મોટા ડિસ્ટ્રિબ્યુટર્સ અને ફેક્ટરીઓ માટે" : "For large distributors, factories & multi-branch enterprises",
      monthlyPrice: 1999,
      yearlyPrice: 1599,
      popular: false,
      features: [
        gu ? "અનલિમિટેડ કંપનીઓ અને ગોડાઉન" : "Unlimited Companies, Warehouses & Branches",
        gu ? "અનલિમિટેડ સ્ટાફ લોગિન & રોલ પરમિશન" : "Unlimited Staff Logins with Role Permissions",
        gu ? "સરકારી e-Invoice સીધો API ઇન્ટિગ્રેશન" : "Direct Government E-Invoicing API Integration",
        gu ? "મલ્ટી-બ્રાન્ચ રિયલ-ટાઇમ ક્લાઉડ સિન્ક" : "Real-time Multi-Branch Cloud Data Sync",
        gu ? "ડેડિકેટેડ એકાઉન્ટિંગ મેનેજર સપોર્ટ" : "Dedicated Relationship Support Manager",
        gu ? "કસ્ટમ પ્રિન્ટ થીમ્સ અને બિલ ફોર્મેટ્સ" : "Custom Branded Print Templates & Ledgers",
        gu ? "૨૪/૭ પ્રાથમિક હેલ્પલાઇન સપોર્ટ" : "24/7 Priority Dedicated Helpline",
      ],
      ctaText: gu ? "એન્ટરપ્રાઇઝ ડેમો બુક કરો" : "Book Enterprise Demo",
      ctaHref: "/login?mode=signup",
    },
  ];

  return (
    <section id="pricing" className="py-16 sm:py-24 bg-white border-b border-[#E5EAF1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-10 sm:mb-14 text-left">
          <span className="text-xs font-semibold text-[#2563EB] uppercase tracking-wider block mb-2">
            {gu ? "પારદર્શક સબ્સ્ક્રિપ્શન" : "Transparent Pricing"}
          </span>
          <h2
            className="text-2xl sm:text-4xl lg:text-[42px] font-semibold text-[#172033] tracking-tight leading-[1.12]"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            {gu
              ? "તમારા વેપારના કદ મુજબ અનુકૂળ પ્લાન પસંદ કરો."
              : "Flexible Plans for Every Stage of Growth."}
          </h2>
          <p className="text-[15px] sm:text-base text-[#667085] mt-3 font-normal leading-relaxed max-w-2xl">
            {gu
              ? "કોઈ પણ હિડન ચાર્જ નહીં. ૧૪ દિવસની ફ્રી ટ્રાયલ સાથે તમામ પ્લાન ઉપલબ્ધ છે."
              : "No hidden setup fees. Free software updates included. 14-day free trial on all plans."}
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-6 inline-flex items-center p-1 bg-[#F7F9FC] border border-[#E5EAF1] rounded-xl">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                billingCycle === "monthly"
                  ? "bg-white text-[#172033] shadow-2xs font-semibold"
                  : "text-[#667085] hover:text-[#172033]"
              }`}
            >
              {gu ? "માસિક બિલિંગ" : "Monthly Billing"}
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                billingCycle === "yearly"
                  ? "bg-[#2563EB] text-white shadow-2xs font-semibold"
                  : "text-[#667085] hover:text-[#172033]"
              }`}
            >
              <span>{gu ? "વાર્ષિક બિલિંગ" : "Yearly Billing"}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                  billingCycle === "yearly" ? "bg-white text-[#2563EB]" : "bg-[#EFF6FF] text-[#2563EB]"
                }`}
              >
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
          {plans.map((p) => {
            const price = billingCycle === "yearly" ? p.yearlyPrice : p.monthlyPrice;
            const isEnterprise = p.id === "enterprise";

            return (
              <div
                key={p.id}
                className={`rounded-2xl border p-6 sm:p-8 flex flex-col justify-between transition-all duration-200 ${
                  p.popular
                    ? "bg-[#F7F9FC] border-[#2563EB] shadow-md ring-1 ring-[#2563EB]/30 relative"
                    : "bg-white border-[#E5EAF1] shadow-xs hover:border-[#2563EB]/40"
                }`}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-6 px-3 py-0.5 rounded-full bg-[#2563EB] text-white text-[11px] font-semibold tracking-wide uppercase">
                    {gu ? "સૌથી લોકપ્રિય" : "Most Popular"}
                  </div>
                )}

                <div>
                  <h3
                    className="text-lg font-semibold text-[#172033]"
                    style={{ fontFamily: "var(--font-manrope)" }}
                  >
                    {p.name}
                  </h3>
                  <p className="text-xs text-[#667085] mt-1 mb-4 font-normal">
                    {p.subtitle}
                  </p>

                  {/* Price Block */}
                  <div className="pb-5 mb-5 border-b border-[#E5EAF1] flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl font-semibold text-[#172033] tabular-nums">
                      ₹{price}
                    </span>
                    <span className="text-xs text-[#667085] font-normal">
                      {gu ? "/ મહિને (વાર્ષિક બિલ)" : "/ month (billed annually)"}
                    </span>
                  </div>

                  {/* Feature Bullets */}
                  <div className="space-y-2.5">
                    {p.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs sm:text-[13px] text-[#172033] font-medium">
                        <Check className="w-4 h-4 text-[#159B72] shrink-0 mt-0.5" strokeWidth={2} />
                        <span className="leading-snug">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Action */}
                <div className="pt-6 mt-6 border-t border-[#E5EAF1]">
                  {isEnterprise && onOpenDemo ? (
                    <button
                      type="button"
                      onClick={onOpenDemo}
                      className="w-full h-11 rounded-xl border border-[#E5EAF1] bg-white hover:bg-slate-50 text-xs sm:text-sm font-medium text-[#172033] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <span>{p.ctaText}</span>
                      <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                    </button>
                  ) : (
                    <Link
                      href={p.ctaHref}
                      className={`w-full h-11 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-98 ${
                        p.popular
                          ? "bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                          : "bg-white hover:bg-slate-50 border border-[#E5EAF1] text-[#172033]"
                      }`}
                    >
                      <span>{p.ctaText}</span>
                      <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
