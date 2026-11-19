"use client";

import React, { useState } from "react";
import { ChevronDown, MessageSquare } from "lucide-react";

export interface FAQSectionProps {
  lang?: "en" | "gu";
}

export function FAQSection({ lang = "en" }: FAQSectionProps) {
  const gu = lang === "gu";
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: gu
        ? "MyOwn BillBook કયા પ્રકારના વેપાર માટે સૌથી વધુ અનુકૂળ છે?"
        : "What types of businesses is MyOwn BillBook designed for?",
      a: gu
        ? "આ સોફ્ટવેર ખાસ કરીને ભારતીય રિટેલ સ્ટોર્સ, સુપરમાર્કેટ્સ, હોલસેલર્સ, ડિસ્ટ્રિબ્યુટર્સ, C&F એજન્ટ્સ અને નાના ઉત્પાદકો માટે તૈયાર કરવામાં આવ્યું છે જ્યાં ઝડપી GST બિલિંગ, બારકોડ કાઉન્ટર, ગોડાઉન ઇન્વેન્ટરી અને પાકી ખાતાવહી જરૂરી હોય છે."
        : "MyOwn BillBook is engineered specifically for Indian retail shops, supermarkets, wholesale bulk traders, distributors, and manufacturing MSMEs requiring fast GST tax invoicing, POS barcode counters, multi-godown stock, and double-entry ledger khatas.",
    },
    {
      q: gu
        ? "શું આ સોફ્ટવેર સરકારી જીએસટી નિયમો અને ઇ-વે બિલ માટે ૧૦૦% માન્ય છે?"
        : "Is MyOwn BillBook 100% compliant with statutory Indian GST rules?",
      a: gu
        ? "હા. સિસ્ટમ ભારતીય GST કાઉન્સિલના તમામ નિયમો (B2B, B2C, SEZ, રિવર્સ ચાર્જ) મુજબ ગ્રાહકના GSTIN પરથી આપોઆપ CGST/SGST કે આંતરરાજ્ય IGST નક્કી કરે છે. તેમજ સરકારી પોર્ટલ માટે સીધા જ GSTR-1 અને GSTR-3B ફાઈલો બનાવે છે."
        : "Yes, 100%. The system complies with all statutory GST Council requirements. It automatically detects intra-state (CGST + SGST) vs inter-state (IGST) from customer GSTIN numbers, calculates HSN-wise tax rates, and exports portal-compliant GSTR-1 and GSTR-3B filings.",
    },
    {
      q: gu
        ? "બિલ બનાવવા માટે સતત ઇન્ટરનેટ કનેક્શન હોવું જરૂરી છે?"
        : "Does the software require continuous internet connectivity to generate bills?",
      a: gu
        ? "ના. સામાન્ય કાઉન્ટર બિલિંગ અને લોકલ પ્રિન્ટિંગ ઇન્ટરનેટ ધીમું હોય કે થોડો સમય બંધ હોય તો પણ અટક્યા વગર ચાલે છે. ઇન્ટરનેટ ઉપલબ્ધ થતાં જ તમામ વ્યવહારો ક્લાઉડ પર આપોઆપ સુરક્ષિત રીતે સિન્ક થઈ જાય છે."
        : "No. Counter billing and local printing remain operational even during temporary internet fluctuations. Once connectivity resumes, all transaction ledgers and stock balances synchronize securely to the cloud.",
    },
    {
      q: gu
        ? "કયા પ્રિન્ટર્સ અને બારકોડ સ્કેનર્સ સપોર્ટેડ છે?"
        : "Which hardware printers and barcode scanners are supported?",
      a: gu
        ? "કોઈપણ સામાન્ય USB કે વાયરલેસ બારકોડ સ્કેનર સીધું જ ચાલે છે. પ્રિન્ટિંગ માટે A4/A5 લેસર પ્રિન્ટર્સ તેમજ 58mm અને 80mm ના થર્મલ રિસિપ્ટ પ્રિન્ટર્સ કોઈપણ વધારાના ડ્રાઈવર વગર સીધા સપોર્ટેડ છે."
        : "All standard USB, Bluetooth, and wireless barcode scanners work plug-and-play. For printing, the software supports A4/A5 desktop laser printers as well as standard 58mm and 80mm thermal receipt roll printers.",
    },
    {
      q: gu
        ? "ખરીદી બિલ AI સ્કેનર (OCR) કેવી રીતે કામ કરે છે?"
        : "How does the AI purchase bill OCR scanner work?",
      a: gu
        ? "જ્યારે સપ્લાયર તરફથી કાગળનું બિલ આવે, ત્યારે તમે મોબાઈલ કે વેબકેમથી તેનો ફોટો પાડી શકો છો. અમારું ઓપ્ટિકલ સ્કેનર બિલમાંથી વેન્ડર GSTIN, આઇટમો, HSN અને દરો આપોઆપ ઓળખીને સીધા સ્ટોક લેજરમાં ઉમેરી દે છે."
        : "Simply snap a picture or upload a PDF of your supplier's paper purchase bill. The optical OCR engine automatically parses line items, HSN codes, tax rates, and purchase amounts directly into your stock ledger without manual typing.",
    },
    {
      q: gu
        ? "અમારો વ્યવસાયિક અને નાણાકીય ડેટા કેટલો સુરક્ષિત છે?"
        : "How secure is our financial and business accounting data?",
      a: gu
        ? "તમારો ડેટા 256-બીટ બેંક-ગ્રેડ SSL એન્ક્રિપ્શન સાથે સુરક્ષિત રહે છે. રોજિંદો ઓટોમેટિક ક્લાઉડ બેકઅપ થાય છે અને સ્ટાફ રોલ કંટ્રોલ દ્વારા તમે નક્કી કરી શકો છો કે કયો કર્મચારી કેટલો ડેટા જોઈ શકે."
        : "Your business records are protected with bank-grade 256-bit encryption. Automated daily cloud backups ensure zero data loss, while role-based staff access permissions restrict unauthorized views.",
    },
    {
      q: gu
        ? "જૂના એકાઉન્ટ્સ અથવા Tally / Excel માંથી ડેટા લાવી શકાય?"
        : "Can we import existing items, parties, and accounts from Excel or Tally?",
      a: gu
        ? "હા. MyOwn BillBook માં ઇનબિલ્ટ એક્સેલ/CSV ડેટા ઇમ્પોર્ટ ટૂલ છે જેના દ્વારા તમારી તમામ પ્રોડક્ટ્સ, કસ્ટમર ફોન નંબર્સ અને પ્રારંભિક સ્ટોક બેલેન્સ માત્ર ૨ મિનિટમાં અપલોડ કરી શકાય છે."
        : "Yes. Our built-in Excel/CSV data import utility allows you to seamlessly migrate existing inventory items, customer contacts, supplier records, and opening balances in under two minutes.",
    },
  ];

  return (
    <section id="faq" className="py-16 sm:py-24 bg-[#F7F9FC] border-b border-[#E5EAF1]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-10 sm:mb-14 text-left">
          <span className="text-xs font-semibold text-[#2563EB] uppercase tracking-wider block mb-2">
            {gu ? "પ્રશ્નોત્તરી અને માર્ગદર્શન" : "Frequently Asked Questions"}
          </span>
          <h2
            className="text-2xl sm:text-4xl font-semibold text-[#172033] tracking-tight leading-[1.12]"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            {gu
              ? "તમારા પ્રશ્નોના સ્પષ્ટ અને સાચા જવાબો."
              : "Clear Answers to Common Questions."}
          </h2>
          <p className="text-[15px] sm:text-base text-[#667085] mt-3 font-normal leading-relaxed">
            {gu
              ? "GST સુસંગતતા, બારકોડ સપોર્ટ, ઇન્ટરનેટ અને ડેટા સુરક્ષા સંબંધિત વારંવાર પૂછાતી માહિતી."
              : "Everything you need to know about GST compliance, printer hardware, data privacy, and daily operation."}
          </p>
        </div>

        {/* Clean Text-First Accordion */}
        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-[#E5EAF1] bg-white overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/60 transition-colors"
                >
                  <span
                    className="text-sm sm:text-base font-semibold text-[#172033]"
                    style={{ fontFamily: "var(--font-manrope)" }}
                  >
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#667085] shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-[#2563EB]" : ""
                    }`}
                    strokeWidth={1.75}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-[#667085] leading-relaxed font-normal border-t border-[#E5EAF1]/70 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Support Helpdesk Callout */}
        <div className="mt-10 p-5 rounded-xl border border-[#E5EAF1] bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs sm:text-sm font-semibold text-[#172033]">
              {gu ? "હજી કોઈ પ્રશ્ન બાકી છે?" : "Have a question not listed here?"}
            </div>
            <div className="text-xs text-[#667085] mt-0.5 font-normal">
              {gu
                ? "અમારી ટેકનિકલ સપોર્ટ ટીમ સોમથી શનિ સવારે ૯ થી રાત્રે ૮ વાગ્યા સુધી WhatsApp પર લાઈવ છે."
                : "Our dedicated technical team is available on WhatsApp Mon–Sat from 9am to 8pm IST."}
            </div>
          </div>
          <a
            href="https://wa.me/917400199999"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-50 text-[#159B72] border border-emerald-200 text-xs sm:text-sm font-medium hover:bg-emerald-100 transition-colors shrink-0"
          >
            <MessageSquare className="w-4 h-4" strokeWidth={1.75} />
            <span>{gu ? "WhatsApp પર વાત કરો" : "Chat on WhatsApp"}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
