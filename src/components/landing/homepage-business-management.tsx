"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  ShoppingBag,
  CreditCard,
  Landmark,
  Users,
  Clock,
  PieChart,
  Check,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export interface HomepageBusinessManagementProps {
  lang?: "en" | "gu";
}

export function HomepageBusinessManagement({ lang = "en" }: HomepageBusinessManagementProps) {
  const gu = lang === "gu";
  const [selectedPillar, setSelectedPillar] = useState(0);

  const pillars = [
    {
      id: "sales",
      icon: <TrendingUp className="w-5 h-5 text-[#2563EB]" />,
      title: gu ? "વેચાણ સંચાલન (Sales Management)" : "Sales Management",
      desc: gu
        ? "કોટેશન, પ્રોફોર્મા, ડિલિવરી ચલણ અને પાકા જીએસટી બિલ — તમામ ક્રિયાઓ એક જ વર્કફ્લોમાં."
        : "Seamless end-to-end sales lifecycle: Quotations, Proforma Invoices, Delivery Challans, Tax Invoices, and Credit Notes.",
      highlight: gu ? "ચલણમાંથી માત્ર ૧-ક્લિકમાં પાકું બિલ બનાવો" : "1-Click convert quotations & challans to final tax invoices",
      stats: "3,000+ Invoices/mo",
      route: "/sales/invoices",
    },
    {
      id: "purchases",
      icon: <ShoppingBag className="w-5 h-5 text-[#2563EB]" />,
      title: gu ? "ખરીદી અને વેન્ડર બિલિંગ (Purchases)" : "Purchase & Vendor Bills",
      desc: gu
        ? "સપ્લાયર બિલની એન્ટ્રી કરો અથવા કેમેરાથી OCR સ્કેન કરો. સ્ટોક અને ઇનપુટ ટેક્સ ક્રેડિટ (ITC) આપોઆપ જમા થશે."
        : "Record supplier bills or scan paper bills with AI OCR camera. Instant stock inward and Input Tax Credit (ITC) reconciliation.",
      highlight: gu ? "કાગળ બિલ સ્કેન કરીને ૫ સેકન્ડમાં એન્ટ્રી" : "AI optical scanning with 94%+ automated data capture",
      stats: "Auto ITC Input",
      route: "/purchases",
    },
    {
      id: "expenses",
      icon: <CreditCard className="w-5 h-5 text-[#2563EB]" />,
      title: gu ? "ખર્ચ હિસાબ (Expenses Tracking)" : "Expense Classification",
      desc: gu
        ? "દુકાનનું ભાડું, ટ્રાન્સપોર્ટ, વીજળી, સ્ટાફ પગાર અને અન્ય રોજિંદા ખર્ચાઓનું ચોક્કસ વર્ગીકરણ રાખો."
        : "Track operational overheads, freight, transport, rent, office supplies and utilities with clean category ledgers.",
      highlight: gu ? "P&L માં ચોખ્ખો નફો ગણવામાં મદદરૂપ" : "Direct & indirect expense calculation into real net profit",
      stats: "Categorized Khata",
      route: "/finance/expenses",
    },
    {
      id: "cash-bank",
      icon: <Landmark className="w-5 h-5 text-[#2563EB]" />,
      title: gu ? "રોકડ અને બેંક વ્યવહારો (Cash & Bank)" : "Cash & Bank Accounts",
      desc: gu
        ? "બહુવિધ બેંક ખાતાઓ અને રોકડ ગલ્લાનું રિયલ-ટાઇમ બેલેન્સ. કોન્ટ્રા ટ્રાન્સફર અને બેંક રિકોન્સિલિએશન."
        : "Manage multiple bank accounts and physical cash counter drawers with real-time balance tracking and contra transfers.",
      highlight: gu ? "બેંક ટ્રાન્સફર અને કેશ વિડ્રોલનો ચોખ્ખો હિસાબ" : "Track multi-bank accounts, UPI QR receipts and petty cash",
      stats: "Real-time Balance",
      route: "/finance/cash-bank",
    },
    {
      id: "parties",
      icon: <Users className="w-5 h-5 text-[#2563EB]" />,
      title: gu ? "ગ્રાહક અને વેપારી ખાતાવહી (Parties Khata)" : "Parties & Ledger Accounts",
      desc: gu
        ? "દરેક પાર્ટીની ક્રેડિટ લિમિટ, પેન્ડિંગ બેલેન્સ, સ્ટેટમેન્ટ અને રેટ હિસ્ટ્રી — ક્યારેય પૈસા અટવાશે નહીં."
        : "Comprehensive party ledgers with credit limits, payment terms, opening balances, and customized item price history.",
      highlight: gu ? "પાર્ટી વાઇઝ ખાતાવહી WhatsApp પર મોકલો" : "Send automated WhatsApp statements & payment reminders",
      stats: "Complete Khata",
      route: "/masters/parties",
    },
    {
      id: "dues",
      icon: <Clock className="w-5 h-5 text-[#2563EB]" />,
      title: gu ? "બાકી લેણાં અને દેવાં (Receivables & Payables)" : "Receivables & Payables Control",
      desc: gu
        ? "કોની પાસેથી કેટલા પૈસા લેવાના છે અને વેપારીને ક્યારે ચૂકવવાના છે તેની સ્પષ્ટ સમયમર્યાદા."
        : "Live aging analysis of receivables and payables. Know exactly when bills are due to optimize daily cash flow.",
      highlight: gu ? "સમયસર પેમેન્ટ મેળવીને કેશ ફ્લો મજબૂત કરો" : "3-Day and 7-Day smart upcoming dues notifications",
      stats: "Zero Bad Debts",
      route: "/reports",
    },
  ];

  const current = pillars[selectedPillar];

  return (
    <section className="py-14 sm:py-20 bg-white border-b border-[#E5EAF1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <span className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider px-3 py-1 bg-[#EFF6FF] border border-[#BFDBFE] rounded-full">
            {gu ? "ઓપરેશનલ કંટ્રોલ" : "360° Operations"}
          </span>
          <h2
            className="text-2xl sm:text-3xl font-semibold text-[#172033] tracking-tight mt-3"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            {gu
              ? "તમારા વ્યવસાયના દરેક વ્યવહાર પર રાખો સંપૂર્ણ નિયંત્રણ"
              : "Stay in Control of Every Business Transaction"}
          </h2>
          <p className="text-xs sm:text-sm text-[#667085] mt-2 font-normal">
            {gu
              ? "વેચાણ, ખરીદી, ખર્ચ, બેંક અને પાર્ટી ખાતાવહી — તમામ આર્થિક પ્રક્રિયાઓનું એકીકૃત સંચાલન."
              : "Manage every rupee coming in and going out of your business with complete operational transparency."}
          </p>
        </div>

        {/* Split Interactive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Left Column: List of 6 Pillars */}
          <div className="lg:col-span-5 space-y-2.5">
            {pillars.map((pillar, idx) => {
              const isSelected = selectedPillar === idx;
              return (
                <div
                  key={pillar.id}
                  onClick={() => setSelectedPillar(idx)}
                  className={`p-3.5 sm:p-4 rounded-xl border transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-[#EFF6FF] border-[#2563EB] shadow-2xs"
                      : "bg-[#F7F9FC] border-[#E5EAF1] hover:bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? "bg-[#2563EB] text-white"
                          : "bg-white text-[#2563EB] border border-[#E5EAF1]"
                      }`}
                    >
                      {pillar.icon}
                    </div>
                    <div className="min-w-0">
                      <h3
                        className={`text-xs sm:text-sm font-semibold truncate ${
                          isSelected ? "text-[#2563EB]" : "text-[#172033]"
                        }`}
                      >
                        {pillar.title}
                      </h3>
                      <p className="text-[11px] text-[#667085] truncate font-normal mt-0.5">
                        {pillar.highlight}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      isSelected
                        ? "bg-[#2563EB] text-white"
                        : "bg-white text-[#667085] border border-[#E5EAF1]"
                    }`}
                  >
                    {pillar.stats}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Right Column: Deep-Dive Card of Active Pillar */}
          <div className="lg:col-span-7 bg-[#F7F9FC] rounded-2xl sm:rounded-3xl border border-[#E5EAF1] p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shadow-xs shrink-0">
                {current.icon}
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider block">
                  Core Management Pillar
                </span>
                <h3 className="text-lg sm:text-xl font-semibold text-[#172033]">
                  {current.title}
                </h3>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#667085] leading-relaxed font-normal mb-6">
              {current.desc}
            </p>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <div className="p-3.5 bg-white rounded-xl border border-[#E5EAF1] shadow-2xs space-y-1">
                <span className="text-xs font-semibold text-[#172033] block">
                  {gu ? "ઓટોમેટિક ડબલ-એન્ટ્રી" : "Double-Entry Ready"}
                </span>
                <span className="text-[11px] text-[#667085]">
                  {gu ? "બિલ બનતાં જ ડેબિટ-ક્રેડિટ ખાતાવહીમાં ઓટો-પોસ્ટિંગ." : "Every invoice auto-updates ledger accounts with zero manual work."}
                </span>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-[#E5EAF1] shadow-2xs space-y-1">
                <span className="text-xs font-semibold text-[#172033] block">
                  {gu ? "સુરક્ષિત બેકઅપ & ઓડિટ ટ્રેઇલ" : "Audit Trail & Logs"}
                </span>
                <span className="text-[11px] text-[#667085]">
                  {gu ? "કોણે, ક્યારે એન્ટ્રી કરી તેનો સમય સાથે રેકોર્ડ." : "Complete user activity logs ensuring total accountability."}
                </span>
              </div>
            </div>

            {/* CTA to that module */}
            <div className="flex items-center justify-between pt-4 border-t border-[#E5EAF1]">
              <span className="text-xs text-[#159B72] font-semibold flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>{gu ? "તમામ પ્લાનમાં સમાવિષ્ટ" : "Included in all plans"}</span>
              </span>

              <Link
                href={current.route}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs"
              >
                <span>{gu ? "મોડ્યુલ ઓપન કરો" : "Open Module"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
