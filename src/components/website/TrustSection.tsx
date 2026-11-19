"use client";

import React from "react";
import { ReceiptText, ShoppingCart, Package, Files, Calculator, ShieldCheck } from "lucide-react";

export interface TrustSectionProps {
  lang?: "en" | "gu";
}

export function TrustSection({ lang = "en" }: TrustSectionProps) {
  const gu = lang === "gu";

  const capabilities = [
    {
      icon: <ReceiptText className="w-[18px] h-[18px] text-[#2563EB]" strokeWidth={1.75} />,
      title: gu ? "100% GST અને ઇ-વે બિલ" : "Statutory GST & E-Way Bills",
      desc: gu
        ? "B2B/B2C ઇન્વોઇસિંગ, HSN લુકઅપ અને ૧-ક્લિક GSTR-1 & 3B ફોર્મેટ્સ."
        : "Compliant B2B & B2C invoicing with auto-tax and 1-click GSTR returns.",
    },
    {
      icon: <ShoppingCart className="w-[18px] h-[18px] text-[#2563EB]" strokeWidth={1.75} />,
      title: gu ? "હાઇ-સ્પીડ બારકોડ POS" : "High-Speed Barcode POS",
      desc: gu
        ? "કાઉન્ટર પર ૫ સેકન્ડમાં બિલિંગ અને ૫૮/૮૦mm થર્મલ પ્રિન્ટિંગ."
        : "5-second retail checkout with thermal receipts & keyboard shortcuts.",
    },
    {
      icon: <Package className="w-[18px] h-[18px] text-[#2563EB]" strokeWidth={1.75} />,
      title: gu ? "મલ્ટી-ગોડાઉન સ્ટોક" : "Multi-Godown Stock",
      desc: gu
        ? "દરેક ગોડાઉનનો અલગ સ્ટોક, બેચ ટ્રેકિંગ અને લો-સ્ટોક ચેતવણી."
        : "Live warehouse tracking, batch dates and smart reorder alerts.",
    },
    {
      icon: <Files className="w-[18px] h-[18px] text-[#2563EB]" strokeWidth={1.75} />,
      title: gu ? "ખરીદી બિલ AI સ્કેનર" : "Purchase Bill OCR Scanner",
      desc: gu
        ? "સપ્લાયરના બિલનો ફોટો પાડો — તમામ આઇટમો સીધી સ્ટોકમાં જમા."
        : "Instant optical scan of vendor paper bills with auto-stock entry.",
    },
    {
      icon: <Calculator className="w-[18px] h-[18px] text-[#2563EB]" strokeWidth={1.75} />,
      title: gu ? "ડબલ-એન્ટ્રી ખાતાવહી" : "Double-Entry Ledgers",
      desc: gu
        ? "P&L, બેલેન્સ શીટ, પાર્ટી ખાતા અને ઓડિટ રિપોર્ટ્સ આપોઆપ."
        : "Real-time P&L, balance sheets & party ledger khata accounts.",
    },
    {
      icon: <ShieldCheck className="w-[18px] h-[18px] text-[#2563EB]" strokeWidth={1.75} />,
      title: gu ? "256-બીટ બેંક સુરક્ષા" : "256-Bit Cloud Security",
      desc: gu
        ? "રોજિંદો ઓટોમેટિક બેકઅપ અને સુરક્ષિત સ્ટાફ રોલ કંટ્રોલ."
        : "Bank-grade data encryption, audit trails & staff permission rules.",
    },
  ];

  return (
    <section id="trust" className="py-8 sm:py-10 bg-[#F7F9FC] border-b border-[#E5EAF1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 sm:gap-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E5EAF1]">
          {capabilities.map((item, idx) => (
            <div
              key={idx}
              className={`flex flex-col justify-start pt-4 sm:pt-0 ${
                idx !== 0 ? "sm:pl-4 xl:pl-4" : ""
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {item.icon}
                <h3
                  className="text-xs sm:text-[13px] font-semibold text-[#172033] leading-snug"
                  style={{ fontFamily: "var(--font-manrope)" }}
                >
                  {item.title}
                </h3>
              </div>
              <p className="text-[11px] sm:text-xs text-[#667085] leading-relaxed font-normal">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
