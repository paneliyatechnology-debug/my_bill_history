"use client";

import React from "react";
import {
  FileText,
  Barcode,
  Boxes,
  ScanText,
  Languages,
  ShieldCheck,
  Check,
} from "lucide-react";

export interface HomepageTrustProps {
  lang?: "en" | "gu";
}

export function HomepageTrust({ lang = "en" }: HomepageTrustProps) {
  const gu = lang === "gu";

  const trustItems = [
    {
      icon: <FileText className="w-5 h-5 text-[#2563EB]" />,
      title: gu ? "100% GST & e-Way Bill સુસંગત" : "Statutory GST & E-Way Bill",
      desc: gu ? "B2B, B2C, SEZ અને મલ્ટી-સ્ટેટ IGST સાથે GSTR-1 & 3B રેડી ફોર્મેટ્સ." : "Full B2B, B2C, SEZ, export support & 1-click GSTR-1, 3B preparation.",
    },
    {
      icon: <Barcode className="w-5 h-5 text-[#2563EB]" />,
      title: gu ? "હાઈ-સ્પીડ POS & બારકોડ" : "High-Speed POS & Barcodes",
      desc: gu ? "કાઉન્ટર પર ૫ સેકન્ડમાં બિલિંગ અને 58mm/80mm થર્મલ પ્રિન્ટિંગ." : "Fast retail counter checkout with 58mm/80mm thermal receipts.",
    },
    {
      icon: <Boxes className="w-5 h-5 text-[#2563EB]" />,
      title: gu ? "મલ્ટી-ગોડાઉન સ્ટોક કંટ્રોલ" : "Multi-Godown Inventory",
      desc: gu ? "દરેક ગોડાઉન અને દુકાનનો અલગ સ્ટોક અને ટ્રાન્સફર ચલણ હિસાબ." : "Live warehouse tracking, batch numbers, expiry dates & low-stock alerts.",
    },
    {
      icon: <ScanText className="w-5 h-5 text-[#2563EB]" />,
      title: gu ? "ખરીદી બિલ AI સ્કેનર" : "Purchase Bill OCR Scanner",
      desc: gu ? "વેપારી બિલનો ફોટો પાડો — GSTIN, રકમ અને વસ્તુઓ આપોઆપ જમા." : "Instant optical reading of vendor paper bills with automatic stock ledger entry.",
    },
    {
      icon: <Languages className="w-5 h-5 text-[#2563EB]" />,
      title: gu ? "દ્વિભાષી અંગ્રેજી અને ગુજરાતી" : "Bilingual English & Gujarati",
      desc: gu ? "બિલ પ્રિન્ટ, પાર્ટી નામ અને સોફ્ટવેર બંને ભાષામાં વાપરો." : "Bilingual invoice printing, party accounts & seamless 1-click UI toggle.",
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-[#2563EB]" />,
      title: gu ? "256-બીટ બેંક સુરક્ષા & ક્લાઉડ" : "256-Bit Bank Security",
      desc: gu ? "રોજિંદો ઓટોમેટિક ક્લાઉડ બેકઅપ અને સુરક્ષિત સ્ટાફ રોલ એક્સેસ." : "Daily automated cloud backups, bank-grade encryption & staff permissions.",
    },
  ];

  return (
    <section id="trust" className="py-14 sm:py-18 bg-white border-b border-[#E5EAF1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <span className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider px-3 py-1 bg-[#EFF6FF] border border-[#BFDBFE] rounded-full">
            {gu ? "વિશ્વસનીય ટેકનોલોજી" : "Verified Enterprise Standards"}
          </span>
          <h2
            className="text-2xl sm:text-3xl font-semibold text-[#172033] tracking-tight mt-3"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            {gu
              ? "તમારા વેપાર માટે જરૂરી તમામ સુવિધાઓ, એક જ સ્થળે"
              : "Everything Your Business Needs, In One Place"}
          </h2>
          <p className="text-xs sm:text-sm text-[#667085] mt-2 font-normal">
            {gu
              ? "ભારતીય એમએસએમઇ અને એકાઉન્ટન્ટ્સની જરૂરિયાતોને ધ્યાનમાં રાખીને બનાવવામાં આવેલ આધુનિક સોફ્ટવેર."
              : "Built ground-up with statutory GST rules, multi-device reliability, and real-time ledger accounting."}
          </p>
        </div>

        {/* 6 Grid Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {trustItems.map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-xl border border-[#E5EAF1] bg-[#F7F9FC] hover:bg-white hover:border-[#2563EB]/40 hover:shadow-xs transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-xl bg-white border border-[#E5EAF1] flex items-center justify-center shrink-0 mb-4 group-hover:scale-105 transition-transform shadow-2xs">
                {item.icon}
              </div>
              <h3 className="text-sm font-semibold text-[#172033] mb-1.5 leading-snug">
                {item.title}
              </h3>
              <p className="text-xs text-[#667085] leading-relaxed font-normal">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
