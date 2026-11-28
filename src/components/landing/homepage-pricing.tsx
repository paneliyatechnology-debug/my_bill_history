"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { apiClient } from "@/lib/api-client";

export interface HomepagePricingProps {
  lang?: "en" | "gu";
  onOpenDemo?: () => void;
}

export function HomepagePricing({ lang = "en", onOpenDemo }: HomepagePricingProps) {
  const gu = lang === "gu";
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [plans, setPlans] = useState<
    Array<{
      id: string;
      name: string;
      subtitle: string;
      monthlyPrice: number;
      yearlyPrice: number;
      popular: boolean;
      features: string[];
      ctaText: string;
    }>
  >([]);

  useEffect(() => {
    apiClient
      .get<any[]>("/subscriptions/plans")
      .then((res) => {
        if (Array.isArray(res)) {
          setPlans(
            res.map((p) => ({
              id: p.id || p.tier?.toLowerCase(),
              name: gu ? p.nameGujarati || p.name : p.name,
              subtitle: gu ? p.subtitleGujarati || p.subtitle : p.subtitle,
              monthlyPrice: Number(p.monthlyPrice) || 0,
              yearlyPrice: Number(p.yearlyPrice) || 0,
              popular: Boolean(p.isPopular ?? p.popular),
              features:
                gu && Array.isArray(p.featuresGujarati) && p.featuresGujarati.length > 0
                  ? p.featuresGujarati
                  : Array.isArray(p.features)
                  ? p.features
                  : [],
              ctaText: p.ctaText || (gu ? "પ્લાન શરૂ કરો" : "Get Started"),
            })),
          );
        }
      })
      .catch(() => {});
  }, [gu]);

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
