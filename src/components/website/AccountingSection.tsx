"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, Calculator } from "lucide-react";

export interface AccountingSectionProps {
  lang?: "en" | "gu";
}

export function AccountingSection({ lang = "en" }: AccountingSectionProps) {
  const gu = lang === "gu";

  return (
    <section className="py-16 sm:py-24 bg-white border-b border-[#E5EAF1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Editorial Product Story */}
          <div className="lg:col-span-5 space-y-5">
            <div className="flex items-center gap-2 text-[#2563EB]">
              <Calculator className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />
              <span className="text-xs font-semibold uppercase tracking-wider">
                {gu ? "રોજમેળ અને ડબલ-એન્ટ્રી ખાતાવહી" : "Double-Entry Accounting & P&L"}
              </span>
            </div>

            <h2
              className="text-2xl sm:text-4xl font-semibold text-[#172033] tracking-tight leading-[1.12]"
              style={{ fontFamily: "var(--font-manrope)" }}
            >
              {gu
                ? "સાચી ડબલ-એન્ટ્રી ખાતાવહી. હિસાબમાં શૂન્ય ભૂલો."
                : "True Double-Entry Books. Zero Accounting Headaches."}
            </h2>

            <p className="text-[15px] sm:text-base text-[#667085] leading-relaxed font-normal">
              {gu
                ? "દરેક વેચાણ, ખરીદી, પેમેન્ટ-ઇન કે ખર્ચાઓ આપોઆપ ખાતાવહી અને રોજમેળમાં નોંધાઈ જાય છે. CA ને આપવા માટે નફો-નુકસાન ખાતું અને સરવૈયું હંમેશા તૈયાર રહે છે."
                : "Every sale, purchase, voucher, and expense entry ties directly to standard double-entry debit and credit ledgers. Generate instant Profit & Loss statements, Balance Sheets, Trial Balance, and party ledger statements without manual reconciliation."}
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#172033] font-medium">
                <Check className="w-4 h-4 text-[#159B72] shrink-0 mt-0.5" strokeWidth={2} />
                <span>
                  {gu
                    ? "નફો-નુકસાન ખાતું (Profit & Loss) અને ગ્રોસ માર્જિન એનાલિસિસ"
                    : "Real-time Profit & Loss statement with item gross margin breakdown"}
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#172033] font-medium">
                <Check className="w-4 h-4 text-[#159B72] shrink-0 mt-0.5" strokeWidth={2} />
                <span>
                  {gu
                    ? "ઓડિટ-રેડી બેલેન્સ શીટ અને ટ્રાયલ બેલેન્સ રિપોર્ટ્સ"
                    : "Comprehensive Balance Sheet & Trial Balance ready for CA audit"}
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#172033] font-medium">
                <Check className="w-4 h-4 text-[#159B72] shrink-0 mt-0.5" strokeWidth={2} />
                <span>
                  {gu
                    ? "પાર્ટી વાઇઝ લેણાં-દેવાં સ્ટેટમેન્ટ અને WhatsApp રિમાઇન્ડર લિંક્સ"
                    : "Party khata statements with overdue aging and WhatsApp reminder links"}
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#172033] font-medium">
                <Check className="w-4 h-4 text-[#159B72] shrink-0 mt-0.5" strokeWidth={2} />
                <span>
                  {gu
                    ? "રોકડ સિલક, બેંક એકાઉન્ટ્સ અને કેટેગરી-વાઇઝ ખર્ચ વાઉચર્સ"
                    : "Liquid cash & bank reconciliation with categorized expense tracking"}
                </span>
              </div>
            </div>

            <div className="pt-3">
              <Link
                href="/features#accounting-ledgers"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-medium transition-all shadow-xs"
              >
                <span>{gu ? "ખાતાવહી ફીચર્સ જુઓ" : "Explore Accounting"}</span>
                <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
              </Link>
            </div>
          </div>

          {/* Right Column: Real Accounting Screenshot */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-[#E5EAF1] bg-[#F7F9FC] p-3 sm:p-4 shadow-lg">
              <div className="relative rounded-xl border border-[#E5EAF1] bg-white overflow-hidden aspect-[16/10]">
                <Image
                  src="/themes/accounting-current.png"
                  alt="MyOwn BillBook Accounting & Expenses Ledger Screen"
                  fill
                  sizes="(min-width: 1024px) 680px, 100vw"
                  className="object-cover object-top"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
