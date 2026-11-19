"use client";

import React from "react";
import {
  FileText,
  Package,
  ShoppingCart,
  BookOpen,
  Receipt,
  BarChart3,
  ArrowRight,
} from "lucide-react";

export interface TrustSectionProps {
  lang?: "en" | "gu";
}

export function TrustSection({ lang = "en", }: TrustSectionProps) {
  const gu = lang === "gu";

  const capabilities = [
    {
      title: gu ? "GST ઇન્વોઇસિંગ" : "GST Invoicing",
      desc: gu ? "B2B, B2C, e-Way & e-Invoice" : "B2B, B2C, e-Way Bill & E-Invoice",
      icon: <FileText className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
      href: "#features",
    },
    {
      title: gu ? "સ્માર્ટ ઇન્વેન્ટરી" : "Inventory",
      desc: gu ? "મલ્ટી-ગોડાઉન, સ્ટોક & બેચ" : "Multi-Godown, Stock & Batches",
      icon: <Package className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
      href: "#features",
    },
    {
      title: gu ? "વેચાણ & ખરીદી" : "Sales & Purchases",
      desc: gu ? "ઓર્ડર્સ, બિલ સ્કેનર & રિટર્ન" : "Orders, Bill OCR Scanner & Returns",
      icon: <ShoppingCart className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
      href: "#features",
    },
    {
      title: gu ? "ડબલ-એન્ટ્રી ખાતાવહી" : "Accounting",
      desc: gu ? "રોજમેળ, લેજર & જર્નલ એન્ટ્રી" : "Double-Entry, Daybook & Ledgers",
      icon: <BookOpen className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
      href: "#features",
    },
    {
      title: gu ? "ઝડપી POS બિલિંગ" : "POS Billing",
      desc: gu ? "બારકોડ સ્કેન & થર્મલ પ્રિન્ટ" : "Barcode Scan & Thermal Receipts",
      icon: <Receipt className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
      href: "#features",
    },
    {
      title: gu ? "નાણાકીય રિપોર્ટ્સ" : "Financial Reports",
      desc: gu ? "P&L, બેલેન્સ શીટ & GSTR" : "P&L, Balance Sheet & GSTR Returns",
      icon: <BarChart3 className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
      href: "#features",
    },
  ];

  return (
    <section className="bg-white py-8 sm:py-10 border-b border-[#E5EAF1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {capabilities.map((cap, i) => (
            <a
              key={i}
              href={cap.href}
              className="p-4 rounded-xl bg-[#F7F9FC] border border-[#E5EAF1] hover:border-[#2563EB]/40 hover:bg-white transition-all duration-200 group flex flex-col justify-between"
            >
              <div className="w-10 h-10 rounded-lg bg-white border border-[#E5EAF1] flex items-center justify-center mb-3 shadow-2xs group-hover:scale-105 transition-transform">
                {cap.icon}
              </div>

              <div>
                <h4
                  className="text-xs sm:text-sm font-semibold text-[#172033] group-hover:text-[#2563EB] transition-colors leading-tight"
                  style={{ fontFamily: "var(--font-manrope)" }}
                >
                  {cap.title}
                </h4>
                <p className="text-[11px] text-[#667085] mt-1 line-clamp-1">
                  {cap.desc}
                </p>
              </div>

              <div className="mt-2.5 pt-2 border-t border-[#E5EAF1]/60 flex items-center gap-1 text-[10px] font-semibold text-[#2563EB] opacity-0 group-hover:opacity-100 transition-opacity">
                <span>{gu ? "જુઓ" : "Explore"}</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
