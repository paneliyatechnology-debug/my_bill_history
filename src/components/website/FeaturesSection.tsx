"use client";

import React from "react";
import {
  ReceiptText,
  Files,
  Package,
  ShoppingCart,
  Calculator,
  ShieldCheck,
  Receipt,
  BarChart3,
  Check,
  ArrowRight,
} from "lucide-react";

export interface FeaturesSectionProps {
  lang?: "en" | "gu";
}

export function FeaturesSection({ lang = "en" }: FeaturesSectionProps) {
  const gu = lang === "gu";

  const features = [
    {
      id: "gst-invoicing",
      icon: <ReceiptText className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
      title: gu ? "૧. GST ઇન્વોઇસિંગ (GST Invoicing)" : "GST Invoicing",
      desc: gu
        ? "સરકારી નિયમો મુજબ ૧૦ સેકન્ડમાં પ્રોફેશનલ GST અને નોન-GST ટેક્સ બિલ બનાવો."
        : "Generate statutory compliant B2B and B2C GST invoices with accurate HSN and tax calculations.",
      capabilities: [
        gu ? "GST & નોન-GST, B2B અને B2C બિલિંગ" : "GST & non-GST, B2B and B2C billing",
        gu ? "કસ્ટમ થીમ્સ, A4 લેસર અને થર્મલ પ્રિન્ટ" : "Custom invoice templates & thermal print",
        gu ? "E-Way Bill & E-Invoice સીધા વર્કફ્લોઝ" : "E-Way Bill & direct E-Invoice workflows",
      ],
      linkText: gu ? "ઇન્વોઇસિંગ સમજો" : "Explore Feature",
    },
    {
      id: "purchase-management",
      icon: <Files className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
      title: gu ? "૨. ખરીદી મેનેજમેન્ટ (Purchases)" : "Purchase Management",
      desc: gu
        ? "વેપારીઓના બિલ સ્કેન કરો, ખરીદી રેકોર્ડ કરો અને બાકી ચુકવણીઓ પર નજર રાખો."
        : "Record purchase invoices, track supplier bills, manage purchase returns and vendor balances.",
      capabilities: [
        gu ? "ખરીદી બિલ AI કેમેરા સ્કેનર (OCR)" : "Purchase OCR & paper bill optical scan",
        gu ? "વેપારી લેણી-દેણી અને પેમેન્ટ ટ્રેકિંગ" : "Vendor outstanding balances & bill history",
        gu ? "ડેબિટ નોટ અને પરત ખરીદી એન્ટ્રી" : "Debit notes & supplier purchase returns",
      ],
      linkText: gu ? "ખરીદી ફીચર્સ જુઓ" : "Explore Feature",
    },
    {
      id: "inventory-management",
      icon: <Package className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
      title: gu ? "૩. ઇન્વેન્ટરી મેનેજમેન્ટ (Inventory)" : "Inventory Management",
      desc: gu
        ? "દરેક પ્રોડક્ટ અને ગોડાઉનનો સાચો સ્ટોક લાઈવ રાખો અને માલ ખૂટે તે પહેલા એલર્ટ મેળવો."
        : "Complete product catalogue, multi-godown stock movements, transfer slips and low-stock alerts.",
      capabilities: [
        gu ? "મલ્ટીપલ ગોડાઉન્સ અને સ્ટોક ટ્રાન્સફર" : "Multiple godowns & branch stock transfers",
        gu ? "ઓટોમેટિક લો-સ્ટોક ચેતવણીઓ" : "Automated low-stock threshold alerts",
        gu ? "બેચ નંબર, એક્સપાયરી & સીરીયલ ટ્રેકિંગ" : "Batch, expiry & barcode SKU tracking",
      ],
      linkText: gu ? "ઇન્વેન્ટરી જુઓ" : "Explore Feature",
    },
    {
      id: "sales-management",
      icon: <ShoppingCart className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
      title: gu ? "૪. વેચાણ મેનેજમેન્ટ (Sales)" : "Sales Management",
      desc: gu
        ? "ક્વોટેશન, સેલ્સ ઓર્ડર, ડિલિવરી ચલણ અને ક્રેડિટ નોટ્સ એક જ સરળ ફ્લોમાં મેનેજ કરો."
        : "Manage sales orders, proforma quotations, delivery challans and customer payment histories.",
      capabilities: [
        gu ? "ક્વોટેશન અને સેલ્સ ઓર્ડર્સથી સીધું બિલ" : "Quotations, sales orders & delivery challans",
        gu ? "ગ્રાહક ખાતાવહી અને ક્રેડિટ લિમિટ્સ" : "Customer balance tracking & credit limits",
        gu ? "ઓટોમેટિક WhatsApp પેમેન્ટ રિમાઇન્ડર્સ" : "Automated WhatsApp payment reminders",
      ],
      linkText: gu ? "વેચાણ ટૂલ્સ જુઓ" : "Explore Feature",
    },
    {
      id: "accounting-ledgers",
      icon: <Calculator className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
      title: gu ? "૫. ડબલ-એન્ટ્રી એકાઉન્ટિંગ (Ledgers)" : "Accounting & Ledgers",
      desc: gu
        ? "ભારતીય દેશી નામા અને સ્ટાન્ડર્ડ ડબલ-એન્ટ્રી પદ્ધતિ મુજબ રોકડ, બેંક અને જર્નલ સંભાળો."
        : "Double-entry accounting, cash and bank accounts, party ledgers, journal entries and daybook.",
      capabilities: [
        gu ? "રોજમેળ, રોકડમેળ અને બેંક રિકન્સિલિયેશન" : "Daybook, cashbook & bank reconciliation",
        gu ? "પાર્ટી લેજર્સ અને જર્નલ વાઉચર્સ" : "Party ledgers & standard journal vouchers",
        gu ? "ક્રેડિટ નોટ અને ડેબિટ નોટ હિસાબ" : "Credit notes, debit notes & adjust entries",
      ],
      linkText: gu ? "એકાઉન્ટિંગ સમજો" : "Explore Feature",
    },
    {
      id: "gst-reports",
      icon: <ShieldCheck className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
      title: gu ? "૬. GST રિપોર્ટ્સ (Tax Returns)" : "GST Reports",
      desc: gu
        ? "GSTR-1, GSTR-3B અને 2B મિલાન માટે એક ક્લિકમાં સરકારી ફોર્મેટમાં રિપોર્ટ મેળવો."
        : "Prepare GSTR-1, GSTR-3B summaries, tax liability reports and purchase reconciliation.",
      capabilities: [
        gu ? "GSTR-1 B2B, B2C, HSN અને દસ્તાવેજ સમરી" : "GSTR-1 ready JSON & Excel export",
        gu ? "GSTR-3B કર જવાબદારી અને ITC સમરી" : "GSTR-3B tax liability & input tax credit",
        gu ? "GSTR-2B ખરીદી મિલાન (Reconciliation)" : "GSTR-2B supplier invoice reconciliation",
      ],
      linkText: gu ? "GST રિપોર્ટ્સ જુઓ" : "Explore Feature",
    },
    {
      id: "pos-billing",
      icon: <Receipt className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
      title: gu ? "૭. POS કાઉન્ટર બિલિંગ (Point of Sale)" : "POS Billing",
      desc: gu
        ? "કાઉન્ટર પર ગ્રાહકોની લાંબી લાઈનો દૂર કરો — બારકોડ સ્કેનિંગ અને સુપરફાસ્ટ ચેકઆઉટ."
        : "Fast counter billing with barcode scanning, thermal printing and multi-mode payment options.",
      capabilities: [
        gu ? "બારકોડ સ્કેનર અને ટચ-સ્ક્રીન પ્રોડક્ટ્સ" : "Barcode scanner & touch screen shortcuts",
        gu ? "૫૮mm / ૮૦mm થર્મલ રસીદ પ્રિન્ટિંગ" : "58mm & 80mm thermal receipt printing",
        gu ? "રોકડ, UPI QR અને કાર્ડ સ્પ્લિટ પેમેન્ટ" : "Cash, UPI QR code & split payments",
      ],
      linkText: gu ? "POS કાઉન્ટર જુઓ" : "Explore Feature",
    },
    {
      id: "financial-reports",
      icon: <BarChart3 className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />,
      title: gu ? "૮. નાણાકીય રિપોર્ટ્સ (Financials)" : "Financial Reports",
      desc: gu
        ? "તમારા વ્યવસાયનો સાચો નફો, મૂડી અને ખર્ચ જાણો — CA અને ઓડિટ માટે સચોટ આંકડા."
        : "Comprehensive Profit & Loss, Balance Sheet, Trial Balance, Cash Flow and Stock Valuation.",
      capabilities: [
        gu ? "નફા-નુકસાન ખાતું (Profit & Loss Account)" : "Trading & Profit & Loss Statement",
        gu ? "બેલેન્સ શીટ અને સરવૈયું (Balance Sheet)" : "Balance Sheet & capital movement",
        gu ? "સ્ટોક વેલ્યુએશન અને ટ્રાયલ બેલેન્સ" : "Trial Balance & FIFO stock valuation",
      ],
      linkText: gu ? "રિપોર્ટ્સ એક્સપ્લોર કરો" : "Explore Feature",
    },
  ];

  return (
    <section id="features" className="py-16 sm:py-24 bg-white border-b border-[#E5EAF1] scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 sm:mb-16 text-left">
          <span
            className="text-xs font-semibold text-[#2563EB] uppercase tracking-wider block mb-2"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            {gu ? "સંપૂર્ણ MYOWNBILLBOOK ટૂલકીટ" : "THE MYOWNBILLBOOK TOOLKIT"}
          </span>
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-semibold text-[#172033] tracking-tight leading-tight"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            {gu ? (
              <>
                વેપાર માટે જરૂરી તમામ સાધનો.
                <br />
                બધું એક જ સ્થાને.
              </>
            ) : (
              <>
                Every Tool Your Business Needs.
                <br />
                All in One Place.
              </>
            )}
          </h2>
          <p
            className="text-sm sm:text-base text-[#667085] mt-3 leading-relaxed max-w-2xl font-normal"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            {gu
              ? "તમારા પ્રથમ ઇન્વોઇસથી લઈને વાર્ષિક બેલેન્સ શીટ સુધી — બહુવિધ સોફ્ટવેર બદલ્યા વિના એક જ જગ્યાએથી કામગીરી સંભાળો."
              : "From your first invoice to your final financial report, manage your everyday business operations without switching between multiple tools."}
          </p>
        </div>

        {/* 8 Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {features.map((feat) => (
            <div
              key={feat.id}
              className="p-6 rounded-2xl bg-[#F7F9FC] border border-[#E5EAF1] shadow-xs hover:border-[#2563EB]/40 hover:bg-white hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
            >
              <div>
                {/* Icon */}
                <div className="w-11 h-11 rounded-xl bg-white border border-[#E5EAF1] flex items-center justify-center mb-4 shadow-2xs group-hover:scale-105 transition-transform">
                  {feat.icon}
                </div>

                {/* Title */}
                <h3
                  className="text-base font-semibold text-[#172033] group-hover:text-[#2563EB] transition-colors mb-2 leading-snug"
                  style={{ fontFamily: "var(--font-manrope)" }}
                >
                  {feat.title}
                </h3>

                {/* Description */}
                <p
                  className="text-xs text-[#667085] leading-relaxed mb-4 font-normal"
                  style={{ fontFamily: "var(--font-inter)" }}
                >
                  {feat.desc}
                </p>

                {/* 3 Capabilities Bullets */}
                <div className="space-y-2 pt-3 border-t border-[#E5EAF1]/70 mb-5">
                  {feat.capabilities.map((cap, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-[#172033] font-medium">
                      <Check className="w-3.5 h-3.5 text-[#2563EB] shrink-0 mt-0.5" strokeWidth={2.5} />
                      <span className="leading-tight">{cap}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Explore Feature Action */}
              <a
                href="#demo"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#172033] group-hover:text-[#2563EB] transition-colors pt-2 border-t border-[#E5EAF1]/40"
                style={{ fontFamily: "var(--font-inter)" }}
              >
                <span>{feat.linkText}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
