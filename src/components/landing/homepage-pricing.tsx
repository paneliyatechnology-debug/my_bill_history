"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

export interface HomepagePricingProps {
  lang?: "en" | "gu";
  onOpenDemo?: () => void;
}

export function HomepagePricing({ lang = "en", onOpenDemo }: HomepagePricingProps) {
  const gu = lang === "gu";
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");

  const plans = [
    {
      id: "starter",
      name: gu ? "સ્ટાર્ટર પ્લાન (Starter)" : "Starter Plan",
      subtitle: gu ? "નાની દુકાનો અને કાઉન્ટર માટે" : "For single retail counters & small shops",
      monthlyPrice: 499,
      yearlyPrice: 399,
      popular: false,
      features: [
        gu ? "૧ કંપની અથવા દુકાન" : "1 Business Company Profile",
        gu ? "વર્ષે ૩,૦૦૦ ઇન્વૉઇસ સુધી" : "Up to 3,000 Invoices per year",
        gu ? "સ્ટાન્ડર્ડ GST અને નોન-GST બિલિંગ" : "Standard B2B & B2C GST Invoicing",
        gu ? "A4 અને ૫૮mm/૮૦mm થર્મલ પ્રિન્ટ" : "A4 Laser & 58/80mm Thermal Print",
        gu ? "લાઇવ વેચાણ ચાર્ટ અને રિપોર્ટ્સ" : "Basic Sales & Cash Reports",
        gu ? "ઇમેઇલ અને ચેટ હેલ્પડેસ્ક" : "Standard Chat & Email Support",
      ],
      ctaText: gu ? "સ્ટાર્ટર પ્લાન શરૂ કરો" : "Start Free Trial",
    },
    {
      id: "professional",
      name: gu ? "પ્રોફેશનલ પ્લાન (Professional)" : "Professional Plan",
      subtitle: gu ? "હોલસેલર્સ અને વધતા વેપાર માટે" : "For growing wholesalers, traders & multi-counter shops",
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
    },
    {
      id: "enterprise",
      name: gu ? "એન્ટરપ્રાઇઝ પ્લાન (Enterprise)" : "Enterprise Plan",
      subtitle: gu ? "મોટા ડિસ્ટ્રિબ્યુટર્સ અને ફેક્ટરીઓ માટે" : "For large distributors, factories & multiple branches",
      monthlyPrice: 1999,
      yearlyPrice: 1599,
      popular: false,
      features: [
        gu ? "અનલિમિટેડ કંપનીઓ અને ગોડાઉન" : "Unlimited Companies, Warehouses & Branches",
        gu ? "અનલિમિટેડ સ્ટાફ યુઝર્સ અને રોલ એક્સેસ" : "Unlimited Staff Logins with Role Permissions",
        gu ? "સરકારી e-Invoice સીધો API ઇન્ટિગ્રેશન" : "Direct Government E-Invoicing API Integration",
        gu ? "મલ્ટી-બ્રાન્ચ ERP ડેટા સિન્ક" : "Real-time Multi-Branch Cloud Data Sync",
        gu ? "ડેડિકેટેડ CA મેનેજર સપોર્ટ" : "Dedicated CA Relationship Support Manager",
        gu ? "કસ્ટમ પ્રિન્ટ થીમ્સ અને બિલ ફોર્મેટ" : "Custom Branded Print Templates & Ledgers",
        gu ? "૨૪/૭ પ્રાયોરિટી ઇન્સ્ટન્ટ હેલ્પ" : "24/7 Priority Dedicated Helpline",
      ],
      ctaText: gu ? "એન્ટરપ્રાઇઝ શરૂ કરો" : "Contact for Enterprise",
    },
  ];

  return (
    <section id="pricing" className="py-14 sm:py-20 bg-white border-b border-[#E5EAF1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <span className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider px-3 py-1 bg-[#EFF6FF] border border-[#BFDBFE] rounded-full">
            {gu ? "પારદર્શક કિંમત" : "Simple & Transparent Pricing"}
          </span>
          <h2
            className="text-2xl sm:text-3xl font-semibold text-[#172033] tracking-tight mt-3"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            {gu
              ? "તમારા વેપારના કદ મુજબ અનુકૂળ પ્લાન પસંદ કરો"
              : "Flexible Plans for Every Stage of Growth"}
          </h2>
          <p className="text-xs sm:text-sm text-[#667085] mt-2 font-normal">
            {gu
              ? "કોઈ પણ હિડન ચાર્જ નહીં. ૧૪ દિવસની ફ્રી ટ્રાયલ સાથે આજે જ શરૂ કરો."
              : "No setup fees. Free software updates. 14-day free trial on all plans."}
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-6 inline-flex items-center p-1 bg-[#F7F9FC] border border-[#E5EAF1] rounded-xl">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                billingCycle === "monthly"
                  ? "bg-white text-[#172033] shadow-2xs"
                  : "text-[#667085] hover:text-[#172033]"
              }`}
            >
              {gu ? "માસિક (Monthly)" : "Monthly Billing"}
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                billingCycle === "yearly"
                  ? "bg-[#2563EB] text-white shadow-2xs"
                  : "text-[#667085] hover:text-[#172033]"
              }`}
            >
              <span>{gu ? "વાર્ષિક (Yearly)" : "Yearly Billing"}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                  billingCycle === "yearly" ? "bg-white text-[#2563EB]" : "bg-[#EFF6FF] text-[#2563EB]"
                }`}
              >
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {plans.map((p) => {
            const price = billingCycle === "yearly" ? p.yearlyPrice : p.monthlyPrice;

            return (
              <div
                key={p.id}
                className={`rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 relative ${
                  p.popular
                    ? "bg-white border-2 border-[#2563EB] shadow-lg lg:-translate-y-2"
                    : "bg-[#F7F9FC] border border-[#E5EAF1] shadow-2xs hover:bg-white hover:shadow-xs"
                }`}
              >
                {/* Popular Pill */}
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#2563EB] text-white text-[11px] font-semibold px-3 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>{gu ? "સૌથી લોકપ્રિય પસંદગી" : "Most Popular"}</span>
                  </div>
                )}

                <div>
                  <h3 className="text-base font-semibold text-[#172033] mb-1">
                    {p.name}
                  </h3>
                  <p className="text-xs text-[#667085] mb-5">
                    {p.subtitle}
                  </p>

                  {/* Price */}
                  <div className="flex items-baseline gap-1.5 pb-5 mb-5 border-b border-[#E5EAF1]">
                    <span className="text-3xl sm:text-4xl font-semibold text-[#172033] tabular-nums">
                      ₹{price.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-[#667085]">
                      / month {billingCycle === "yearly" ? "(billed annually)" : ""}
                    </span>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-3 mb-8">
                    <span className="text-[11px] font-semibold text-[#172033] uppercase tracking-wider block mb-2">
                      {gu ? "પ્લાનમાં શું મળશે:" : "What's Included:"}
                    </span>
                    {p.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-[#172033]">
                        <Check className="w-4 h-4 text-[#159B72] shrink-0 mt-0.5" />
                        <span className="leading-snug">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Button */}
                <div className="pt-2">
                  <Link
                    href="/login?mode=signup"
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      p.popular
                        ? "bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs"
                        : "bg-white hover:bg-slate-100 text-[#172033] border border-[#E5EAF1]"
                    }`}
                  >
                    <span>{p.ctaText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <div className="mt-3 text-center">
                    <span className="text-[10px] text-[#667085] flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-[#159B72]" />
                      <span>14-day free trial · Cancel anytime</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
