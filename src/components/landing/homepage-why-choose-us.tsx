"use client";

import React from "react";
import { Check, X, Sparkles, CheckCircle2 } from "lucide-react";

export interface HomepageWhyChooseUsProps {
  lang?: "en" | "gu";
}

export function HomepageWhyChooseUs({ lang = "en" }: HomepageWhyChooseUsProps) {
  const gu = lang === "gu";

  const rows = [
    {
      capability: gu ? "૧૦ સેકન્ડમાં GST બિલિંગ" : "10-Second Fast GST Invoicing",
      manual: gu ? "ધીમું, ગણતરીની ભૂલો" : "Slow, manual calculation errors",
      legacy: gu ? "જટિલ વિન્ડોઝ સોફ્ટવેર" : "Complicated multi-step forms",
      myown: gu ? "ઓટો ટેક્સ, HSN અને રાઉન્ડ-ઓફ" : "Instant auto-tax, HSN lookup & QR code",
    },
    {
      capability: gu ? "મોબાઈલ અને ડેસ્કટોપ ક્લાઉડ સિન્ક" : "Real-Time Cloud & Mobile Sync",
      manual: gu ? "શક્ય નથી (માત્ર કાગળ પર)" : "Impossible (Paper register bound)",
      legacy: gu ? "એક જ કમ્પ્યુટર પર સીમિત" : "Locked to one physical PC",
      myown: gu ? "ગમે ત્યાંથી રિયલ-ટાઇમ એક્સેસ" : "Anywhere access with auto cloud backup",
    },
    {
      capability: gu ? "ખરીદી બિલ કેમેરા સ્કેનર (OCR)" : "AI Purchase Bill OCR Scanner",
      manual: gu ? "હાથેથી લખવું પડે" : "Tedious manual line-item entry",
      legacy: gu ? "કોઈ સ્કેનર ઉપલબ્ધ નથી" : "Not supported in legacy software",
      myown: gu ? "ફોટો પાડો અને ૫ સેકન્ડમાં એન્ટ્રી" : "Scan paper bills directly into stock",
    },
    {
      capability: gu ? "ઓટોમેટિક WhatsApp પેમેન્ટ રિમાઇન્ડર્સ" : "Automated WhatsApp Reminders",
      manual: gu ? "ફોન કરીને યાદ કરાવવું પડે" : "Manual follow-up calls",
      legacy: gu ? "SMS ચાર્જીસ અથવા અલગ ટૂલ" : "Costly third-party SMS gateways",
      myown: gu ? "૧-ક્લિકમાં PDF સ્ટેટમેન્ટ મોકલો" : "1-Click branded PDF & payment links",
    },
    {
      capability: gu ? "દ્વિભાષી ગુજરાતી & અંગ્રેજી ઇન્ટરફેસ" : "Bilingual English & Gujarati",
      manual: gu ? "ગુજરાતી ખાતાવહી મર્યાદિત" : "Only Gujarati notebooks",
      legacy: gu ? "માત્ર અંગ્રેજી ભાષા" : "English-only rigid accounting codes",
      myown: gu ? "એક ક્લિકમાં ભાષા સ્વિચ કરો" : "Seamless 1-click bilingual switch",
    },
    {
      capability: gu ? "સરકારી GSTR-1 અને 3B પોર્ટલ રિપોર્ટ્સ" : "Audit-Ready GSTR-1 & 3B Reports",
      manual: gu ? "CA ને ફાઈલો પહોંચાડવામાં દિવસો" : "Days spent preparing Excel files",
      legacy: gu ? "મોંઘા વાર્ષિક રિન્યુઅલ" : "Heavy annual maintenance costs",
      myown: gu ? "ઓટો પોર્ટલ JSON & Excel એક્સપોર્ટ" : "Instant 1-click GST portal returns",
    },
  ];

  return (
    <section className="py-14 sm:py-20 bg-white border-b border-[#E5EAF1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <span className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider px-3 py-1 bg-[#EFF6FF] border border-[#BFDBFE] rounded-full">
            {gu ? "તુલનાત્મક ફાયદા" : "Why Modernize"}
          </span>
          <h2
            className="text-2xl sm:text-3xl font-semibold text-[#172033] tracking-tight mt-3"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            {gu
              ? "શા માટે ભારતીય વેપારીઓ જૂની પદ્ધતિઓ છોડીને MyOwn BillBook પસંદ કરે છે"
              : "Why Indian Businesses Choose MyOwn BillBook"}
          </h2>
          <p className="text-xs sm:text-sm text-[#667085] mt-2 font-normal">
            {gu
              ? "કાગળની ખાતાવહી અને જૂના જટિલ સોફ્ટવેરની સામે એક આધુનિક, સરળ અને ભરોસાપાત્ર વિકલ્પ."
              : "A clear comparison between manual registers, legacy single-PC software, and MyOwn BillBook."}
          </p>
        </div>

        {/* Comparison Table Frame */}
        <div className="overflow-x-auto rounded-2xl border border-[#E5EAF1] shadow-xs bg-white">
          <table className="w-full text-left text-xs min-w-[700px] border-collapse">
            <thead>
              <tr className="border-b border-[#E5EAF1] bg-[#F7F9FC]">
                <th className="py-4 px-5 text-xs font-semibold text-[#172033] w-1/4">
                  {gu ? "સુવિધા / કામગીરી" : "Capability"}
                </th>
                <th className="py-4 px-4 text-xs font-semibold text-[#667085] w-1/4">
                  {gu ? "કાગળ ખાતાવહી / એક્સેલ" : "Paper Registers & Excel"}
                </th>
                <th className="py-4 px-4 text-xs font-semibold text-[#667085] w-1/4">
                  {gu ? "જૂના વિન્ડોઝ ERPs" : "Legacy Desktop Software"}
                </th>
                <th className="py-4 px-5 text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] w-1/4 border-l border-[#BFDBFE]/60">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>MyOwn BillBook</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF1]">
              {rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  {/* Capability */}
                  <td className="py-3.5 px-5 font-semibold text-[#172033]">
                    {row.capability}
                  </td>

                  {/* Manual / Excel */}
                  <td className="py-3.5 px-4 text-[#667085]">
                    <div className="flex items-start gap-1.5">
                      <X className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span>{row.manual}</span>
                    </div>
                  </td>

                  {/* Legacy ERP */}
                  <td className="py-3.5 px-4 text-[#667085]">
                    <div className="flex items-start gap-1.5">
                      <X className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>{row.legacy}</span>
                    </div>
                  </td>

                  {/* MyOwn BillBook */}
                  <td className="py-3.5 px-5 font-medium text-[#172033] bg-[#EFF6FF]/40 border-l border-[#BFDBFE]/60">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#159B72] shrink-0 mt-0.5" />
                      <span className="font-semibold text-[#172033]">{row.myown}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
