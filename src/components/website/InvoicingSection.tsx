"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, ReceiptText } from "lucide-react";

export interface InvoicingSectionProps {
  lang?: "en" | "gu";
}

export function InvoicingSection({ lang = "en" }: InvoicingSectionProps) {
  const gu = lang === "gu";

  return (
    <section className="py-16 sm:py-24 bg-white border-b border-[#E5EAF1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Editorial Content */}
          <div className="lg:col-span-5 space-y-5">
            <div className="flex items-center gap-2 text-[#2563EB]">
              <ReceiptText className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />
              <span className="text-xs font-semibold uppercase tracking-wider">
                {gu ? "જીએસટી ટેક્સ ઇન્વોઇસિંગ" : "Statutory GST Invoicing"}
              </span>
            </div>

            <h2
              className="text-2xl sm:text-4xl font-semibold text-[#172033] tracking-tight leading-[1.12]"
              style={{ fontFamily: "var(--font-manrope)" }}
            >
              {gu
                ? "૧૦ સેકન્ડમાં કાયદેસર B2B અને B2C ટેક્સ બિલ બનાવો."
                : "Compliant B2B and B2C Invoicing in Under 10 Seconds."}
            </h2>

            <p className="text-[15px] sm:text-base text-[#667085] leading-relaxed font-normal">
              {gu
                ? "ગ્રાહકનો GSTIN નાખતાં જ રાજ્ય અને CGST/SGST કે IGST આપમેળે નક્કી થાય છે. મલ્ટી-રેટ ટેક્સ, રાઉન્ડ-ઓફ અને ૪ કસ્ટમ પ્રિન્ટ થીમ્સ સાથે સંપૂર્ણ માન્ય બિલ તૈયાર થાય છે."
                : "Eliminate tax errors entirely. Enter a customer GSTIN and the system automatically determines state of supply, maps applicable CGST/SGST or IGST, applies statutory round-offs, and embeds dynamic UPI payment QR codes on every invoice."}
            </p>

            {/* Three Concise Benefits */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#172033] font-medium">
                <Check className="w-4 h-4 text-[#159B72] shrink-0 mt-0.5" strokeWidth={2} />
                <span>
                  {gu
                    ? "ગ્રાહકના GSTIN પરથી આપોઆપ સ્ટેટ અને IGST/CGST ડિટેક્શન"
                    : "Automatic state & tax rule resolution from customer GSTIN"}
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#172033] font-medium">
                <Check className="w-4 h-4 text-[#159B72] shrink-0 mt-0.5" strokeWidth={2} />
                <span>
                  {gu
                    ? "પ્રિન્ટ પર ડાયનેમિક UPI QR કોડ જેથી ગ્રાહક ઝડપથી પેમેન્ટ કરે"
                    : "Dynamic UPI payment QR codes embedded on invoice prints"}
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#172033] font-medium">
                <Check className="w-4 h-4 text-[#159B72] shrink-0 mt-0.5" strokeWidth={2} />
                <span>
                  {gu
                    ? "૧-ક્લિકમાં WhatsApp પર PDF બિલ અને ખાતાવહી સ્ટેટમેન્ટ શેરિંગ"
                    : "Instant 1-click WhatsApp dispatch with customer ledger PDFs"}
                </span>
              </div>
            </div>

            {/* CTA */}
            <div className="pt-3">
              <Link
                href="/features#sales-invoices"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-medium transition-all shadow-xs"
              >
                <span>{gu ? "ઇન્વોઇસિંગ ફીચર્સ જુઓ" : "Explore Invoicing"}</span>
                <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
              </Link>
            </div>
          </div>

          {/* Right Column: Actual Real Invoicing Screenshot */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-[#E5EAF1] bg-[#F7F9FC] p-3 sm:p-4 shadow-lg">
              <div className="relative rounded-xl border border-[#E5EAF1] bg-white overflow-hidden aspect-[16/10]">
                <Image
                  src="/themes/invoices-current.png"
                  alt="MyOwn BillBook Invoicing Screen"
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
