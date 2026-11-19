"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, Package } from "lucide-react";

export interface InventorySectionProps {
  lang?: "en" | "gu";
}

export function InventorySection({ lang = "en" }: InventorySectionProps) {
  const gu = lang === "gu";

  return (
    <section className="py-16 sm:py-24 bg-[#F7F9FC] border-b border-[#E5EAF1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Real Inventory Screenshot */}
          <div className="lg:col-span-7 order-2 lg:order-1">
            <div className="rounded-2xl border border-[#E5EAF1] bg-white p-3 sm:p-4 shadow-lg">
              <div className="relative rounded-xl border border-[#E5EAF1] bg-[#F7F9FC] overflow-hidden aspect-[16/10]">
                <Image
                  src="/themes/inventory-current.png"
                  alt="MyOwn BillBook Inventory Management Screen"
                  fill
                  sizes="(min-width: 1024px) 680px, 100vw"
                  className="object-cover object-top"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Editorial Product Story */}
          <div className="lg:col-span-5 space-y-5 order-1 lg:order-2">
            <div className="flex items-center gap-2 text-[#2563EB]">
              <Package className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />
              <span className="text-xs font-semibold uppercase tracking-wider">
                {gu ? "ઇન્વેન્ટરી અને સ્ટોક કંટ્રોલ" : "Inventory & Godown Control"}
              </span>
            </div>

            <h2
              className="text-2xl sm:text-4xl font-semibold text-[#172033] tracking-tight leading-[1.12]"
              style={{ fontFamily: "var(--font-manrope)" }}
            >
              {gu
                ? "મલ્ટી-ગોડાઉન સ્ટોક અને બેચ નંબરનું સચોટ સંચાલન."
                : "Live Multi-Godown Stock & Batch Precision."}
            </h2>

            <p className="text-[15px] sm:text-base text-[#667085] leading-relaxed font-normal">
              {gu
                ? "દુકાન, સેન્ટ્રલ ગોડાઉન કે વાન વચ્ચે માલનું મુવમેન્ટ ટ્રેક કરો. બેચ નંબર, એક્સપાયરી ડેટ્સ અને લો-સ્ટોક એલર્ટ્સ સાથે ક્યારેય માલ ખૂટશે નહીં."
                : "Manage your physical inventory across retail shop counters, central godowns, and transport vans. Prevent stockouts with automated reorder warnings and track perishable goods by batch numbers and expiry dates."}
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#172033] font-medium">
                <Check className="w-4 h-4 text-[#159B72] shrink-0 mt-0.5" strokeWidth={2} />
                <span>
                  {gu
                    ? "મલ્ટી-ગોડાઉન સ્ટોક ટ્રાન્સફર સ્લિપ અને ઓડિટ હિસ્ટ્રી"
                    : "Godown-to-godown stock transfer challans with complete audit history"}
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#172033] font-medium">
                <Check className="w-4 h-4 text-[#159B72] shrink-0 mt-0.5" strokeWidth={2} />
                <span>
                  {gu
                    ? "બેચ વાઈઝ સ્ટોક, મેન્યુફેક્ચરિંગ અને એક્સપાયરી ડેટ્સ કંટ્રોલ"
                    : "Batch-wise stock with manufacturing and expiry tracking"}
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#172033] font-medium">
                <Check className="w-4 h-4 text-[#159B72] shrink-0 mt-0.5" strokeWidth={2} />
                <span>
                  {gu
                    ? "૧-ક્લિક બારકોડ લેબલ જનરેશન અને થર્મલ/A4 પ્રિન્ટિંગ"
                    : "1-Click barcode sticker printing for thermal rolls and A4 sheets"}
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#172033] font-medium">
                <Check className="w-4 h-4 text-[#159B72] shrink-0 mt-0.5" strokeWidth={2} />
                <span>
                  {gu
                    ? "સ્માર્ટ રી-ઓર્ડર લેવલ એલર્ટ્સ જેથી ફાસ્ટ મુવિંગ માલ અટકે નહીં"
                    : "Automated reorder alerts preventing stockouts on fast-moving goods"}
                </span>
              </div>
            </div>

            <div className="pt-3">
              <Link
                href="/features#inventory-items"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-medium transition-all shadow-xs"
              >
                <span>{gu ? "ઇન્વેન્ટરી સુવિધાઓ જુઓ" : "Explore Inventory"}</span>
                <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
