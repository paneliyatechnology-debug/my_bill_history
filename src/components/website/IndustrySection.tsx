"use client";

import React from "react";
import Image from "next/image";
import { Store, Building2, Truck, Factory, Briefcase, Check } from "lucide-react";

export interface IndustrySectionProps {
  lang?: "en" | "gu";
}

export function IndustrySection({ lang = "en" }: IndustrySectionProps) {
  const gu = lang === "gu";

  const industries = [
    {
      id: "retail",
      title: gu ? "રિટેલ સ્ટોર્સ અને સુપરમાર્કેટ્સ" : "Retailers & Kirana Stores",
      desc: gu
        ? "કાઉન્ટર પર ૫ સેકન્ડમાં બારકોડ સ્કેનિંગ, કેશ ટેન્ડર ગણતરી અને થર્મલ રિસિપ્ટ પ્રિન્ટિંગ."
        : "Fast retail checkout with barcode scanning, instant cash change calculations, and 58mm/80mm thermal receipts.",
      image: "/landing/shopkeeper.jpg",
      icon: <Store className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
      points: [
        gu ? "બારકોડ સ્કેનર અને F2/F4 શોર્ટકટ્સ" : "Barcode scanner & F2/F4 keyboard shortcuts",
        gu ? "58mm/80mm થર્મલ રિસિપ્ટ સપોર્ટ" : "58mm and 80mm thermal receipt printing",
        gu ? "ગ્રાહક ફોન નંબર આધારિત ઉધાર ખાતું" : "Customer phone number-linked credit khata",
      ],
    },
    {
      id: "wholesale",
      title: gu ? "હોલસેલર્સ અને બલ્ક ટ્રેડર્સ" : "Wholesalers & Bulk Traders",
      desc: gu
        ? "પાર્ટી વાઇઝ સ્પેશિયલ રેટ્સ, ઉધાર ક્રેડિટ લિમિટ કંટ્રોલ અને વોટ્સએપ સ્ટેટમેન્ટ્સ."
        : "Tiered party pricing, past price memory, strict credit limit warnings, and automated WhatsApp balance reminders.",
      image: "/landing/wholesale.jpg",
      icon: <Building2 className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
      points: [
        gu ? "પાર્ટી મુજબ અગાઉના રેટ્સ આપોઆપ યાદ રાખે" : "Automatic memory of custom party prices",
        gu ? "ઉધાર મર્યાદા વટાવી જાય ત્યારે ચેતવણી" : "Credit limit warnings preventing bad debts",
        gu ? "૧-ક્લિકમાં WhatsApp લેજર સ્ટેટમેન્ટ પીડીએફ" : "1-Click WhatsApp payment reminders & ledger PDF",
      ],
    },
    {
      id: "distribution",
      title: gu ? "ડિસ્ટ્રિબ્યુટર્સ અને એજન્સીઓ" : "Distributors & C&F Agents",
      desc: gu
        ? "ગોડાઉન-ટુ-ગોડાઉન સ્ટોક ટ્રાન્સફર ચલણ, વાન સેલ્સ ડિસ્પેચ અને સપ્લાયર POs."
        : "Multi-godown stock movement, dispatch delivery challans, vendor purchase orders, and sales rep route tracking.",
      image: "/landing/godown.jpg",
      icon: <Truck className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
      points: [
        gu ? "ગોડાઉન ટ્રાન્સફર ચલણ અને ટ્રાન્ઝિટ ટ્રેકિંગ" : "Godown-to-godown stock transfer slips",
        gu ? "ચલણને ૧-ક્લિકમાં પાકા બિલમાં ફેરવો" : "Convert dispatch challan to tax invoice in 1 click",
        gu ? "સપ્લાયર ખરીદી બિલ કેમેરાથી OCR સ્કેન" : "Scan vendor invoices with camera OCR",
      ],
    },
    {
      id: "manufacturing",
      title: gu ? "મેન્યુફેક્ચરિંગ અને વર્કશોપ્સ" : "Manufacturers & Fabricators",
      desc: gu
        ? "કાચો માલ ટ્રેકિંગ, બિલ ઓફ મટિરિયલ્સ (BOM), બેચ નંબરિંગ અને તૈયાર માલનું બિલિંગ."
        : "Raw material tracking, batch manufacturing numbers, Bill of Materials (BOM), job work challans, and finished goods invoicing.",
      image: "/landing/workshop.jpg",
      icon: <Factory className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
      points: [
        gu ? "કાચો માલ vs તૈયાર માલ વર્ગીકરણ" : "Raw material vs finished goods classification",
        gu ? "બેચ ટ્રેકિંગ અને ક્વોલિટી ઇન્સ્પેક્શન લોગ" : "Batch tracking with quality inspection logs",
        gu ? "જોબ વર્ક ચલણ અને આઉટવર્ડ ડિસ્પેચ" : "Job work inward/outward delivery challans",
      ],
    },
    {
      id: "services",
      title: gu ? "સર્વિસ પ્રોવાઇડર્સ અને એજન્સીઝ" : "Service Providers & Agencies",
      desc: gu
        ? "SAC કોડ આધારિત પ્રોફેશનલ બિલિંગ, પ્રોફોર્મા કોટેશન્સ, TDS ટ્રેકિંગ અને ઓડિટ રિપોર્ટ્સ."
        : "SAC code billing, professional proforma invoices, milestone billing, TDS deduction tracking, and audit sheets.",
      image: "/landing/gst-desk.jpg",
      icon: <Briefcase className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
      points: [
        gu ? "સત્તાવાર SAC કોડ્સની રેડી ડિરેક્ટરી" : "Pre-loaded official statutory SAC code list",
        gu ? "પ્રોફોર્મા અને એસ્ટિમેટ ઇન્વોઇસિંગ" : "Milestone estimates convertible to tax invoices",
        gu ? "TDS ટેક્સ કપાત ટ્રેકિંગ અને રિકોન્સિલિએશન" : "TDS receivable tracking & reconciliation",
      ],
    },
  ];

  return (
    <section id="solutions" className="py-16 sm:py-24 bg-[#F7F9FC] border-b border-[#E5EAF1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 sm:mb-16 text-left">
          <span className="text-xs font-semibold text-[#2563EB] uppercase tracking-wider block mb-2">
            {gu ? "ઉદ્યોગ-વિશિષ્ટ વર્કફ્લો" : "Tailored Industry Solutions"}
          </span>
          <h2
            className="text-2xl sm:text-4xl lg:text-[42px] font-semibold text-[#172033] tracking-tight leading-[1.12]"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            {gu
              ? "દરેક પ્રકારના ભારતીય વેપાર માટે ખાસ તૈયાર."
              : "Built for Every Type of Indian Business."}
          </h2>
          <p className="text-[15px] sm:text-base text-[#667085] mt-3 font-normal leading-relaxed max-w-2xl">
            {gu
              ? "રિટેલર હોય, હોલસેલર હોય કે મેન્યુફેક્ચરિંગ વર્કશોપ — તમારી જરૂરિયાતો મુજબ સોફ્ટવેર એકદમ સરળતાથી સેટ થઈ જાય છે."
              : "Tailored workflows for your industry's specific billing, inventory control, and statutory ledger compliance."}
          </p>
        </div>

        {/* 5 Editorial Industry Blocks with Photography */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {industries.map((ind) => (
            <div
              key={ind.id}
              className="bg-white rounded-2xl border border-[#E5EAF1] overflow-hidden shadow-xs hover:border-[#2563EB]/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
            >
              <div>
                {/* Real High-Quality Photography Frame */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                  <Image
                    src={ind.image}
                    alt={ind.title}
                    fill
                    sizes="(min-width: 1024px) 400px, 100vw"
                    className="object-cover group-hover:scale-102 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 left-3 text-white flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white/90 backdrop-blur-xs text-[#2563EB] flex items-center justify-center">
                      {ind.icon}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 sm:p-6 space-y-3">
                  <h3
                    className="text-base sm:text-lg font-semibold text-[#172033] leading-snug group-hover:text-[#2563EB] transition-colors"
                    style={{ fontFamily: "var(--font-manrope)" }}
                  >
                    {ind.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#667085] leading-relaxed font-normal">
                    {ind.desc}
                  </p>

                  <div className="space-y-2 pt-2 border-t border-[#E5EAF1]">
                    {ind.points.map((pt, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-[#172033] font-medium">
                        <Check className="w-3.5 h-3.5 text-[#159B72] shrink-0 mt-0.5" strokeWidth={2} />
                        <span className="leading-snug">{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
