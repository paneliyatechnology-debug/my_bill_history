"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface HomepageFaqProps {
  lang?: "en" | "gu";
}

export function HomepageFaq({ lang = "en" }: HomepageFaqProps) {
  const gu = lang === "gu";
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: gu
        ? "શું MyOwn BillBook સંપૂર્ણપણે સરકારી GST નિયમોનું પાલન કરે છે?"
        : "Is MyOwn BillBook fully compliant with Indian GST statutory rules?",
      a: gu
        ? "હા, 100%. MyOwn BillBook B2B, B2C, SEZ, નિકાસ અને આંતરરાજ્ય IGST ગણતરીઓને પૂર્ણપણે સમર્થન આપે છે. તમારા વેચાણ અને ખરીદીના આધારે GSTR-1, GSTR-3B અને 2B રિકોન્સિલિએશન ફાઇલો સીધી પોર્ટલ ફોર્મેટમાં તૈયાર થાય છે."
        : "Yes, 100%. MyOwn BillBook supports B2B, B2C, SEZ, exports, and multi-state IGST calculations. GSTR-1, GSTR-3B and e-Way Bill JSON files export in official government portal format ready for your CA.",
    },
    {
      q: gu
        ? "શું હું સોફ્ટવેર અને બિલ પ્રિન્ટ ગુજરાતી અને અંગ્રેજી બંનેમાં વાપરી શકું?"
        : "Can I use the software and print invoices in Gujarati and English together?",
      a: gu
        ? "ચોક્કસ. તમે પાર્ટીના નામ, આઇટમનું વર્ણન અને બિલના મથાળા બંને ભાષામાં રાખી શકો છો. આખી ટીમ માત્ર એક ક્લિકથી અંગ્રેજી અને ગુજરાતી વચ્ચે સ્વિચ કરી શકે છે."
        : "Absolutely. You can maintain party names, item descriptions, and print invoices with bilingual headers. Team members can switch between languages with one click.",
    },
    {
      q: gu
        ? "ખરીદી બિલનું AI કેમેરા સ્કેનર (OCR) કેવી રીતે કામ કરે છે?"
        : "How does the purchase bill AI camera OCR scanner work?",
      a: gu
        ? "કોઈપણ સપ્લાયર કે વેપારીના કાગળ બિલનો ફોટો પાડો અથવા PDF અપલોડ કરો. અમારું OCR સ્કેનર વેન્ડરનો GSTIN, ઇન્વોઇસ નંબર, તારીખ, તમામ આઇટમ્સ અને ટેક્સ રેટ આપોઆપ વાંચીને ગોડાઉન સ્ટોકમાં જમા કરી દે છે."
        : "Simply take a photo or upload a PDF of any vendor bill. Our optical scanner automatically extracts vendor GSTIN, invoice date, line items, tax rates, and enters them into your stock ledger.",
    },
    {
      q: gu
        ? "શું હું એકથી વધુ ગોડાઉન અને સ્ટોક ટ્રાન્સફર મેનેજ કરી શકું?"
        : "Can I manage multiple godowns, warehouse floors, and stock transfers?",
      a: gu
        ? "હા. દરેક ગોડાઉન, દુકાન કાઉન્ટર કે વાનનો અલગ સ્ટોક ટ્રેક કરો. ગોડાઉન વચ્ચે માલ મોકલવા માટે સત્તાવાર સ્ટોક ટ્રાન્સફર ચલણ બનાવો અને લો-સ્ટોક એલર્ટ્સ મેળવો."
        : "Yes. Track stock counts individually per godown, shop floor, or vehicle van. Transfer items between godowns with instant stock-movement slips and set automated reorder warnings.",
    },
    {
      q: gu
        ? "મારો વ્યવસાયિક અને નાણાકીય ડેટા કેટલો સુરક્ષિત છે?"
        : "How secure is my financial data and accounting records?",
      a: gu
        ? "તમારો તમામ ડેટા 256-બીટ બેંક-ગ્રેડ એન્ક્રિપ્શન સાથે સુરક્ષિત છે અને રોજિંદો ઓટોમેટિક ક્લાઉડ બેકઅપ થાય છે. ફક્ત તમારી પરવાનગી ધરાવતા ઓથોરાઇઝ્ડ સ્ટાફ જ એન્ટ્રીઓ જોઈ શકે છે."
        : "Your data is protected with 256-bit bank-grade encryption and automated daily cloud backups. Role-based permissions ensure staff only access authorized screens.",
    },
    {
      q: gu
        ? "શું આ સોફ્ટવેર સાથે થર્મલ બિલ પ્રિન્ટર અને બારકોડ સ્કેનર ચાલે છે?"
        : "Does MyOwn BillBook work with thermal receipt printers and barcode scanners?",
      a: gu
        ? "હા. રિટેલ કાઉન્ટર માટે USB, બ્લૂટૂથ કે વાઇફાઇ થર્મલ પ્રિન્ટર્સ (58mm અને 80mm) તથા તમામ સ્ટાન્ડર્ડ બારકોડ સ્કેનર્સ સાથે સીધું કામ કરે છે. કોઈ વધારાના ડ્રાઈવરની જરૂર નથી."
        : "Yes. Compatible with standard USB, Bluetooth, and network thermal receipt printers (58mm and 80mm), cash drawers, and barcode guns with zero complex setup.",
    },
    {
      q: gu
        ? "શું હું એક એકાઉન્ટમાં મલ્ટીપલ કંપનીઓ અને બ્રાન્ચ મેનેજ કરી શકું?"
        : "Can I manage multiple companies and branches under one account?",
      a: gu
        ? "હા. પ્રોફેશનલ અને એન્ટરપ્રાઇઝ પ્લાનમાં તમે એક જ લોગિનથી અલગ અલગ પેઢીઓ, જીએસટી નંબર્સ અને બ્રાન્ચિસ વચ્ચે સરળતાથી સ્વિચ કરી શકો છો."
        : "Yes. Professional and Enterprise plans allow managing multiple business entities, GSTIN registrations, and godown locations under a single centralized dashboard.",
    },
    {
      q: gu
        ? "ટ્રાયલ પિરિયડ પૂરો થયા પછી શું થાય છે?"
        : "What happens after my 14-day free trial ends?",
      a: gu
        ? "૧૪ દિવસની ફ્રી ટ્રાયલ દરમિયાન કોઈ ક્રેડિટ કાર્ડની જરૂર નથી. ટ્રાયલ પૂરી થયા પછી તમે તમારી પસંદગીનો પ્લાન પસંદ કરીને વ્યવસાય ચાલુ રાખી શકો છો — તમારો ડેટા સંપૂર્ણ સુરક્ષિત રહેશે."
        : "You can test all premium features for 14 days without a credit card. At the end of the trial, simply select your desired subscription plan; your data and invoices remain completely intact.",
    },
  ];

  return (
    <section id="faq" className="py-14 sm:py-20 bg-[#F7F9FC] border-b border-[#E5EAF1]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-10 sm:mb-12">
          <span className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider px-3 py-1 bg-[#EFF6FF] border border-[#BFDBFE] rounded-full">
            {gu ? "પ્રશ્નોત્તરી" : "Help & Clarifications"}
          </span>
          <h2
            className="text-2xl sm:text-3xl font-semibold text-[#172033] tracking-tight mt-3"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            {gu
              ? "વારંવાર પૂછાતા પ્રશ્નો (FAQ)"
              : "Frequently Asked Questions"}
          </h2>
          <p className="text-xs sm:text-sm text-[#667085] mt-2 font-normal">
            {gu
              ? "GST બિલિંગ, ઇન્વેન્ટરી, પ્રિન્ટિંગ અને સિક્યુરિટી સંબંધિત તમારા તમામ પ્રશ્નોના જવાબો."
              : "Everything you need to know about GST invoicing, data security, thermal printing, and onboarding."}
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-[#E5EAF1] overflow-hidden transition-all shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-semibold text-xs sm:text-sm text-[#172033] hover:text-[#2563EB] cursor-pointer transition-colors"
                >
                  <span className="leading-snug">{faq.q}</span>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center bg-[#F7F9FC] border border-[#E5EAF1] shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]" : "text-[#667085]"
                    }`}
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-4 sm:px-5 pb-5 text-xs text-[#667085] leading-relaxed border-t border-[#E5EAF1]/60 pt-3">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* WhatsApp Helpdesk Callout */}
        <div className="mt-8 p-4 rounded-xl bg-white border border-[#E5EAF1] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#159B72] border border-emerald-200 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[#172033] block">
                {gu ? "કોઈ અન્ય પ્રશ્ન છે?" : "Have more specific questions?"}
              </span>
              <span className="text-[11px] text-[#667085]">
                {gu ? "અમારી ટેકનિકલ ટીમ સાથે WhatsApp પર સીધી વાત કરો." : "Connect directly with our support team on WhatsApp."}
              </span>
            </div>
          </div>

          <a
            href="https://wa.me/917400199999"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-[#159B72] hover:bg-[#128360] text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs shrink-0"
          >
            {gu ? "વોટ્સએપ હેલ્પડેસ્ક" : "Chat on WhatsApp"}
          </a>
        </div>
      </div>
    </section>
  );
}
