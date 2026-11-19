"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle, MessageSquare } from "lucide-react";

export interface FAQSectionProps {
  lang?: "en" | "gu";
}

export function FAQSection({ lang = "en" }: FAQSectionProps) {
  const gu = lang === "gu";
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: gu
        ? "MyOwnBillBook શું છે?"
        : "What is MyOwnBillBook?",
      a: gu
        ? "MyOwnBillBook એ ભારતીય વેપારીઓ, રિટેલર્સ, હોલસેલર્સ અને ઉત્પાદકો માટે રચાયેલ સંપૂર્ણ GST બિલિંગ, ઇન્વેન્ટરી, ખરીદી અને ડબલ-એન્ટ્રી એકાઉન્ટિંગ સોફ્ટવેર છે. તે કાઉન્ટર સેલથી લઈને P&L રિપોર્ટ્સ સુધીના તમામ રોજિંદા વ્યાપારિક કાર્યોનું એક જ પ્લેટફોર્મ પરથી સરળ સંચાલન પૂરું પાડે છે."
        : "MyOwnBillBook is a comprehensive cloud-enabled accounting, GST billing, inventory, and POS platform engineered specifically for Indian SMEs, retailers, wholesalers, and manufacturers. It centralizes your counter billing, stock tracking, vendor purchases, and financial balance sheets in one intuitive workspace.",
    },
    {
      q: gu
        ? "શું હું GST અને નોન-GST (બિન-જીએસટી) બંને પ્રકારના ઇન્વૉઇસ બનાવી શકું?"
        : "Can I create GST and non-GST invoices?",
      a: gu
        ? "હા, ચોક્કસ. તમે નિયમિત GST કર ઇન્વૉઇસ (B2B, B2C, સેઝ, ઇન્ટ્રા-સ્ટેટ CGST+SGST અને ઇન્ટર-સ્ટેટ IGST) તેમજ નાના વ્યવસાયો માટે કમ્પોઝિશન બિલ ઓફ સપ્લાય અથવા નોન-GST સામાન્ય એસ્ટિમેટ બિલ બનાવી શકો છો."
        : "Yes, absolutely. You can generate full statutory GST tax invoices (B2B with customer GSTIN, B2C retail, SEZ, reverse charge) with automated CGST/SGST/IGST tax splits, as well as non-GST estimate slips, bill of supply for composition dealers, and cash memos.",
    },
    {
      q: gu
        ? "શું હું એક કરતાં વધુ ગોડાઉન (Multiple Godowns) નું સંચાલન કરી શકું?"
        : "Can I manage multiple godowns?",
      a: gu
        ? "હા. તમે મુખ્ય દુકાન અને વિવિધ ગોડાઉનો બનાવી શકો છો. દરેક ગોડાઉનનો આઇટમ વાઇઝ અલગ સ્ટોક ટ્રેક થાય છે અને ગોડાઉન-ટુ-ગોડાઉન ઇન્ટરનલ સ્ટોક ટ્રાન્સફર સ્લિપ બનાવીને વાસ્તવિક સ્ટોક મુવમેન્ટ મેન્ટેન કરી શકાય છે."
        : "Yes. You can configure multiple warehouses, store backrooms, or godowns. The system tracks item-level real-time stock per location and allows seamless internal stock transfer vouchers with delivery dispatch slips.",
    },
    {
      q: gu
        ? "શું MyOwnBillBook ખરીદી વ્યવસ્થાપન (Purchase Management) ને સપોર્ટ કરે છે?"
        : "Does MyOwnBillBook support purchase management?",
      a: gu
        ? "હા. તમે સપ્લાયર્સ પાસેથી મળેલા ખરીદી ઇન્વૉઇસ નોંધી શકો છો, પેપર બિલનો ફોટો પાડીને AI OCR દ્વારા સીધો સ્ટોક અપડેટ કરી શકો છો, પરચેઝ રિટર્ન (ડેબિટ નોટ) બનાવી શકો છો અને વેન્ડર વાઇઝ બાકી પેમેન્ટનું ટ્રેકિંગ કરી શકો છો."
        : "Yes. MyOwnBillBook offers full vendor purchase management: record supplier bills, capture paper invoices via AI camera OCR scanner to bypass typing, manage purchase returns (debit notes), and track supplier payment balances and credit periods.",
    },
    {
      q: gu
        ? "શું હું ગ્રાહકો અને સપ્લાયર્સના બાકી હિસાબ (Outstanding Balances) ટ્રેક કરી શકું?"
        : "Can I manage customer and supplier outstanding balances?",
      a: gu
        ? "હા. દરેક ગ્રાહક (Sundry Debtors) અને સપ્લાયર (Sundry Creditors) નું અલગ પાકું ખાતાવહી (Ledger) જળવાય છે. તમે બાકી રકમ પર નજર રાખી શકો છો, એક-ક્લિકમાં સ્ટેટમેન્ટ ડાઉનલોડ કરી શકો છો અને વોટ્સએપ પર પેમેન્ટ રિમાઇન્ડર મોકલી શકો છો."
        : "Yes. The platform provides detailed ledger khatas for every customer (receivables) and supplier (payables). You can set credit limits, view ageing balances, and send automated WhatsApp payment reminders with integrated UPI payment links.",
    },
    {
      q: gu
        ? "શું સિસ્ટમ પ્રોફિટ & લોસ (P&L) અને બેલેન્સ શીટ રિપોર્ટ્સ બનાવી આપે છે?"
        : "Can I generate Profit & Loss and Balance Sheet reports?",
      a: gu
        ? "હા. સિસ્ટમ સાચી ડબલ-એન્ટ્રી એકાઉન્ટિંગ પદ્ધતિ પર કામ કરે છે, જેથી ગ્રોસ પ્રોફિટ, નેટ પ્રોફિટ, ટ્રેડિંગ એકાઉન્ટ, પ્રોફિટ એન્ડ લોસ સ્ટેટમેન્ટ અને બેલેન્સ શીટ કોઈપણ તારીખ ગાળા માટે આપમેળે તૈયાર થાય છે."
        : "Yes. Operating on standard double-entry bookkeeping rules, MyOwnBillBook automatically compiles your Profit & Loss Statement, Balance Sheet, Trial Balance, Cash Flow, and Daybook in real time without manual tallying.",
    },
    {
      q: gu
        ? "શું આમાં POS કાઉન્ટર બિલિંગની સુવિધા છે?"
        : "Does it support POS billing?",
      a: gu
        ? "હા. સુપરમાર્કેટ અને રિટેલ કાઉન્ટર માટે ખાસ અતિ-ઝડપી POS મોડ આપવામાં આવ્યો છે. તેમાં બારકોડ સ્કેનિંગ, શોર્ટકટ કીઝ, ૫૮mm/૮૦mm થર્મલ પ્રિન્ટિંગ અને રોકડ/UPI મલ્ટિ-પેમેન્ટ મોડ્સ ઉપલબ્ધ છે."
        : "Yes. An ultra-fast Point of Sale (POS) counter interface is built-in. It supports plug-and-play barcode scanning, keyboard speed shortcuts, thermal roll printing (58mm/80mm), and split cash/UPI/card tender collection.",
    },
    {
      q: gu
        ? "શું હું જુદા જુદા ઉપકરણો (Devices) પરથી મારો વ્યવસાય ડેટા એક્સેસ કરી શકું?"
        : "Can I access my business data from different devices?",
      a: gu
        ? "હા. MyOwnBillBook ક્લાઉડ ટેકનોલોજી પર કાર્યરત હોવાથી તમે ડેસ્કટોપ કોમ્પ્યુટર, લેપટોપ, ટેબ્લેટ કે મોબાઇલ ફોન દ્વારા બ્રાઉઝર કે એપથી ગમે ત્યારે ગમે ત્યાંથી સુરક્ષિત લોગિન કરીને તમારો બિઝનેસ ડેટા જોઈ શકો છો."
        : "Yes. You can access your business workspace anytime from any web browser on desktop, laptop, tablet, or smartphone. Multi-user role permissions allow staff to bill on counter while owners inspect reports remotely.",
    },
    {
      q: gu
        ? "શું હું મારા ઇન્વૉઇસ અને નાણાકીય રિપોર્ટ્સ એક્સપોર્ટ (Export) કરી શકું?"
        : "Can I export my invoices and reports?",
      a: gu
        ? "હા. તમામ સેલ્સ ઇન્વૉઇસ, પરચેઝ બિલો અને લેજરો સુંદર PDF ફોર્મેટમાં પ્રિન્ટ કે શેર કરી શકાય છે. તેમજ એકાઉન્ટિંગ રિપોર્ટ્સ, સ્ટોક શીટ્સ અને GSTR ડેટા Excel (XLSX) અને JSON ફોર્મેટમાં એક્સપોર્ટ કરી શકાય છે."
        : "Yes. All invoices can be printed, downloaded as high-resolution PDFs, or shared instantly via WhatsApp and Email. Financial statements, stock registers, and GST returns export to Excel (XLSX), CSV, and portal JSON formats.",
    },
    {
      q: gu
        ? "શું આમાં ફ્રી ટ્રાયલ (Free Trial) ઉપલબ્ધ છે?"
        : "Is there a free trial?",
      a: gu
        ? "હા! દરેક નવા બિઝનેસ માટે ૩૦ દિવસની પૂર્ણ સુવિધાયુક્ત ફ્રી ટ્રાયલ ઉપલબ્ધ છે. કોઈ ક્રેડિટ કાર્ડની જરૂર નથી. તમે તમામ ફીચર્સનો ઉપયોગ કરીને તમારા વ્યાપારને સુવ્યવસ્થિત કરી શકો છો."
        : "Yes! We offer a full 30-day free trial on all plans. No credit card is required to explore features, test billing, scan purchases, and evaluate business reporting.",
    },
    {
      q: gu
        ? "શું MyOwnBillBook ગુજરાતી ભાષાને સપોર્ટ કરે છે?"
        : "Does MyOwnBillBook support Gujarati?",
      a: gu
        ? "હા! MyOwnBillBook સંપૂર્ણપણે દ્વિભાષી (English અને ગુજરાતી) છે. માત્ર એક ક્લિકથી તમે સમગ્ર વેબસાઇટ, બિલિંગ શરતો અને મેનૂ ગુજરાતીમાં ફેરવી શકો છો."
        : "Yes! MyOwnBillBook provides native bilingual support for English and Gujarati (ગુજરાતી). You can toggle languages anytime with the top navbar switcher to work in your preferred language.",
    },
    {
      q: gu
        ? "મને ટેકનિકલ સપોર્ટ (Technical Support) કેવી રીતે મળશે?"
        : "How can I get technical support?",
      a: gu
        ? "અમારી ટીમ ફોન કૉલ, WhatsApp સપોર્ટ, એનીડેસ્ક/ટીમવ્યુઅર રિમોટ ડેસ્કટોપ સહાય અને ડેડિકેટેડ હેલ્પડેસ્ક દ્વારા સોમવારથી શનિવાર ઉપલબ્ધ રહે છે. તેમજ મફત ટ્રેનિંગ અને ડેટા માઇગ્રેશન સપોર્ટ આપવામાં આવે છે."
        : "Our support team is available via direct phone, WhatsApp chat, email, and live remote desktop assistance (AnyDesk/TeamViewer). We also provide free onboarding, staff walkthroughs, and Excel data migration guidance.",
    },
  ];

  return (
    <section id="faq" className="py-20 sm:py-28 bg-[#F7F9FC] border-b border-[#E5EAF1] scroll-mt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-12 sm:mb-16 text-left">
          <span className="text-xs font-semibold text-[#2563EB] uppercase tracking-wider block mb-2.5">
            {gu ? "પ્રશ્નોત્તરી અને માર્ગદર્શન" : "FREQUENTLY ASKED QUESTIONS"}
          </span>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#172033] tracking-tight leading-[1.15]"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            {gu
              ? "પ્રશ્નો? અમારી પાસે છે સ્પષ્ટ જવાબો."
              : "Questions? We've Got Answers."}
          </h2>
          <p className="text-base sm:text-lg text-[#667085] mt-4 font-normal leading-relaxed">
            {gu
              ? "GST બિલિંગ, ઇન્વેન્ટરી, પ્રિન્ટર્સ અને ડેટા સિક્યોરિટી સંબંધિત વારંવાર પૂછાતી માહિતી."
              : "Clear, factual answers to help you understand how MyOwnBillBook works for your business."}
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3.5">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className={`rounded-2xl border bg-white overflow-hidden transition-all duration-200 ${
                  isOpen
                    ? "border-[#2563EB] shadow-sm ring-1 ring-[#2563EB]/20"
                    : "border-[#E5EAF1] hover:border-[#172033]/30"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-[#F7F9FC]/50 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className={`text-xs font-semibold w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                        isOpen
                          ? "bg-[#2563EB] text-white"
                          : "bg-[#F7F9FC] text-[#667085] border border-[#E5EAF1]"
                      }`}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span
                      className="text-base sm:text-lg font-semibold text-[#172033]"
                      style={{ fontFamily: "var(--font-manrope)" }}
                    >
                      {faq.q}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-[#2563EB]" : "text-[#667085]"
                    }`}
                    strokeWidth={2}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-1 text-sm sm:text-base text-[#667085] leading-relaxed border-t border-[#E5EAF1]/60 font-normal">
                    <p className="pl-9.5">{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Still Have Questions Box */}
        <div className="mt-12 p-6 rounded-2xl bg-white border border-[#E5EAF1] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#172033]">
                {gu ? "હજુ કંઈક પૂછવું છે?" : "Have a question not listed here?"}
              </div>
              <div className="text-xs text-[#667085] mt-0.5">
                {gu
                  ? "અમારી કસ્ટમર સપોર્ટ ટીમ તમને મદદ કરવા તૈયાર છે."
                  : "Our team in Gujarat is ready to assist you via phone or WhatsApp."}
              </div>
            </div>
          </div>
          <a
            href="tel:+919898000000"
            className="h-10 px-5 rounded-xl bg-[#172033] hover:bg-[#172033] text-white text-xs font-semibold flex items-center justify-center shrink-0 transition-colors shadow-2xs"
          >
            {gu ? "સપોર્ટ સંપર્ક કરો" : "Contact Support"}
          </a>
        </div>
      </div>
    </section>
  );
}
