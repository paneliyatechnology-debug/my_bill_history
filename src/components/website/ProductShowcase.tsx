"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ReceiptText,
  Package,
  Calculator,
  ChartNoAxesCombined,
  ArrowRight,
  Check,
} from "lucide-react";

export interface ProductShowcaseProps {
  lang?: "en" | "gu";
}

export function ProductShowcase({ lang = "en" }: ProductShowcaseProps) {
  const gu = lang === "gu";
  const [activeTab, setActiveTab] = useState<"dashboard" | "invoices" | "inventory" | "accounting" | "reports">("dashboard");

  const tabs = [
    {
      id: "dashboard" as const,
      label: gu ? "ડેશબોર્ડ" : "Dashboard",
      icon: <LayoutDashboard className="w-[18px] h-[18px]" strokeWidth={1.75} />,
      title: gu ? "લાઇવ એક્ઝિક્યુટિવ બિઝનેસ કંટ્રોલ સેન્ટર" : "Live Executive Business Command Center",
      description: gu
        ? "કુલ વેચાણ, ખરીદી, લેણાં, દેવાં, ઉપલબ્ધ બેંક બેલેન્સ અને આગામી પેમેન્ટ્સની વિગતો એક જ સ્ક્રીન પર જુઓ."
        : "Real-time visibility into your sales velocity, supplier payables, customer receivables, liquid treasury funds, and upcoming payment alerts.",
      image: "/themes/dashboard-current.png",
      bullets: [
        gu ? "૩૦-દિવસનું ઇન્ટરેક્ટિવ વેચાણ ચાર્ટ અને ગ્રોથ એનાલિસિસ" : "Interactive sales trend curve with 30-day velocity metrics",
        gu ? "લેણાં અને દેવાં બાકી રકમ માટે આગોતરા ડ્યુ એલર્ટ્સ" : "Actionable upcoming dues alert cards with instant collect/pay triggers",
        gu ? "કેટેગરી મુજબ વેચાણ વિતરણ અને બિઝનેસ સ્નેપશોટ" : "Category-wise sales donut distribution and key ledger balances",
      ],
      route: "/app/home",
    },
    {
      id: "invoices" as const,
      label: gu ? "ઇન્વોઇસિંગ" : "Invoices",
      icon: <ReceiptText className="w-[18px] h-[18px]" strokeWidth={1.75} />,
      title: gu ? "કાયદેસર GST કર ઇન્વોઇસિંગ અને બિલિંગ" : "Statutory GST Tax Invoicing & Inward Billing",
      description: gu
        ? "માત્ર ૧૦ સેકન્ડમાં HSN કોડ, CGST/SGST/IGST ટેક્સ ગણતરી અને રાઉન્ડ-ઓફ સાથે સંપૂર્ણ પાકું બિલ તૈયાર કરો."
        : "Draft, finalize, and print compliant GST tax invoices with 4 designer themes, instant WhatsApp sharing, and dynamic UPI QR payment codes.",
      image: "/themes/invoices-current.png",
      bullets: [
        gu ? "B2B અને B2C ઇન્વોઇસ માટે ૪ કસ્ટમાઇઝેબલ પ્રિન્ટ થીમ્સ" : "4 customizable print themes (Classic, Modern, Saffron, Emerald)",
        gu ? "ગ્રાહકનો GSTIN નાખતાં જ રાજ્ય અને ટેક્સ ઓટો-ડિટેક્ટ" : "Automatic state and IGST vs CGST/SGST detection from customer GSTIN",
        gu ? "પ્રિન્ટ પર UPI QR કોડ જેથી ગ્રાહક સીધા જ પેમેન્ટ કરી શકે" : "Dynamic UPI payment QR code generated on every invoice print",
      ],
      route: "/sales/invoices",
    },
    {
      id: "inventory" as const,
      label: gu ? "ઇન્વેન્ટરી" : "Inventory",
      icon: <Package className="w-[18px] h-[18px]" strokeWidth={1.75} />,
      title: gu ? "મલ્ટી-ગોડાઉન સ્ટોક અને બેચ કંટ્રોલ" : "Multi-Godown Stock & Batch Tracking",
      description: gu
        ? "દરેક ગોડાઉન અને દુકાનનો અલગ સ્ટોક ટ્રેક કરો. સ્ટોક ઘટતો હોય ત્યારે તાત્કાલિક રી-ઓર્ડર ચેતવણી મેળવો."
        : "Track items across multiple physical warehouses, shop floors, and vans with batch numbers, manufacturing dates, and reorder alerts.",
      image: "/themes/inventory-current.png",
      bullets: [
        gu ? "ગોડાઉન ટ્રાન્સફર ચલણ અને મુવમેન્ટ ઓડિટ હિસ્ટ્રી" : "Godown-to-godown transfer slips with complete audit trails",
        gu ? "બારકોડ સ્ટીકર જનરેશન અને લેબલ પ્રિન્ટિંગ" : "1-click barcode label printing for thermal and A4 sheets",
        gu ? "ઓટોમેટિક લો-સ્ટોક એલર્ટ્સ જેથી માલ અટકી ન પડે" : "Smart stock alerts preventing stockouts on fast-moving goods",
      ],
      route: "/inventory",
    },
    {
      id: "accounting" as const,
      label: gu ? "એકાઉન્ટિંગ" : "Accounting",
      icon: <Calculator className="w-[18px] h-[18px]" strokeWidth={1.75} />,
      title: gu ? "ડબલ-એન્ટ્રી ખાતાવહી અને રોજમેળ પદ્ધતિ" : "Double-Entry Accounting & Ledger Khatas",
      description: gu
        ? "તમામ વેચાણ, ખરીદી અને ખર્ચાઓ આપોઆપ ખાતાવહી, રોકડમેળ અને વાઉચર્સમાં નોંધાય છે."
        : "Complete ledger accounting where every invoice, voucher, and expense entry ties seamlessly to real double-entry books.",
      image: "/themes/accounting-current.png",
      bullets: [
        gu ? "પાર્ટી વાઇઝ ખાતાવહી સ્ટેટમેન્ટ અને WhatsApp પીડીએફ" : "Party ledger khata exportable as PDF and Excel spreadsheets",
        gu ? "કેશ અને બેંક રિકોન્સિલિએશન અને એક્સપેન્સ કેટેગરીઝ" : "Cash and bank balance tracking with categorized expense vouchers",
        gu ? "ચાર્ટ ઓફ એકાઉન્ટ્સ અને જર્નલ વાઉચર એન્ટ્રીઓ" : "Chart of Accounts with full debit/credit journal vouchers",
      ],
      route: "/finance/expenses",
    },
    {
      id: "reports" as const,
      label: gu ? "રિપોર્ટ્સ" : "Reports",
      icon: <ChartNoAxesCombined className="w-[18px] h-[18px]" strokeWidth={1.75} />,
      title: gu ? "ઓડિટ-રેડી નાણાકીય પત્રકો અને GST રિટર્ન્સ" : "Audit-Ready Financial Statements & GST Returns",
      description: gu
        ? "નફો-નુકસાન ખાતું, પાકું સરવૈયું, ડે બુક અને સરકારી GSTR ફાઈલો એક ક્લિકમાં મેળવો."
        : "Automated Profit & Loss, Balance Sheets, Day Book, and government portal-compliant GSTR-1 and GSTR-3B filings.",
      image: "/themes/reports-current.png",
      bullets: [
        gu ? "GSTR-1 અને 3B પોર્ટલ ફોર્મેટ JSON & Excel ડાઉનલોડ" : "Government GST portal ready JSON and Excel returns",
        gu ? "નફો-નુકસાન ખાતું અને સરવૈયું લાઈવ જુઓ" : "Real-time Profit & Loss and Balance Sheet generation",
        gu ? "આઇટમ-વાઇઝ પ્રોફિટ માર્જિન અને સેલ્સ એનાલિસિસ" : "Item-wise profitability and margin realization breakdown",
      ],
      route: "/reports",
    },
  ];

  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <section id="showcase" className="py-16 sm:py-24 bg-[#F7F9FC] border-b border-[#E5EAF1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-10 sm:mb-14 text-left">
          <span className="text-xs font-semibold text-[#2563EB] uppercase tracking-wider block mb-2">
            {gu ? "ઇન્ટરેક્ટિવ પ્રોડક્ટ ડેમો" : "Product Experience"}
          </span>
          <h2
            className="text-2xl sm:text-4xl lg:text-[42px] font-semibold text-[#172033] tracking-tight leading-[1.12]"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            {gu ? (
              <>
                શક્તિશાળી સોફ્ટવેર.
                <br />
                <span className="text-[#667085]">સરળ વેપાર સંચાલન.</span>
              </>
            ) : (
              <>
                Powerful Software.
                <br />
                <span className="text-[#667085]">Simple Business Management.</span>
              </>
            )}
          </h2>
          <p className="text-[15px] sm:text-base text-[#667085] mt-3 font-normal leading-relaxed max-w-2xl">
            {gu
              ? "ફ્રન્ટ કાઉન્ટરથી લઈને ગોડાઉન, ઓફિસ અને ઓડિટર સુધી તમામ વ્યવસાયિક પ્રક્રિયાઓ એકબીજા સાથે જોડાયેલી છે."
              : "Explore how MyOwn BillBook connects your front counter, back office, warehouse, and accounting in one cohesive system."}
          </p>
        </div>

        {/* Tab Selection Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 no-scrollbar">
          <div className="inline-flex items-center p-1 bg-white border border-[#E5EAF1] rounded-xl gap-1 shrink-0 shadow-2xs">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? "bg-[#2563EB] text-white shadow-xs"
                      : "text-[#667085] hover:text-[#172033] hover:bg-[#F7F9FC]"
                  }`}
                >
                  <span className={isActive ? "text-white" : "text-[#667085]"}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Tab Content with Smooth Transition */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl sm:rounded-3xl border border-[#E5EAF1] bg-white p-6 sm:p-8 lg:p-10 shadow-sm"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
              {/* Left Details */}
              <div className="lg:col-span-5 space-y-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
                  {currentTab.label}
                </span>

                <h3
                  className="text-xl sm:text-2xl font-semibold text-[#172033] leading-snug"
                  style={{ fontFamily: "var(--font-manrope)" }}
                >
                  {currentTab.title}
                </h3>

                <p className="text-sm text-[#667085] leading-relaxed font-normal">
                  {currentTab.description}
                </p>

                <div className="space-y-2.5 pt-1">
                  {currentTab.bullets.map((bullet, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs sm:text-[13px] text-[#172033] font-medium">
                      <Check className="w-4 h-4 text-[#159B72] shrink-0 mt-0.5" strokeWidth={2} />
                      <span className="leading-snug">{bullet}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-3">
                  <Link
                    href={currentTab.route}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E5EAF1] bg-[#F7F9FC] hover:bg-slate-100 text-xs sm:text-sm font-medium text-[#172033] hover:text-[#2563EB] transition-colors"
                  >
                    <span>{gu ? "લાઇવ મોડ્યુલ જુઓ" : "Open Live Module"}</span>
                    <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                  </Link>
                </div>
              </div>

              {/* Right: Actual Application Screenshot inside clean browser frame */}
              <div className="lg:col-span-7">
                <div className="relative rounded-2xl border border-[#E5EAF1] bg-[#F7F9FC] shadow-md overflow-hidden">
                  {/* Subtle Top Browser Chrome */}
                  <div className="h-7 bg-[#F7F9FC] border-b border-[#E5EAF1] px-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#CBD5E1]" />
                      <div className="w-2 h-2 rounded-full bg-[#CBD5E1]" />
                      <div className="w-2 h-2 rounded-full bg-[#CBD5E1]" />
                    </div>
                    <div className="text-[10px] text-[#667085] font-mono">
                      app.myownbillbook.com
                    </div>
                  </div>

                  {/* Real Screenshot */}
                  <div className="relative aspect-[16/10] w-full bg-[#F5F8FC] overflow-hidden">
                    <Image
                      src={currentTab.image}
                      alt={currentTab.title}
                      fill
                      sizes="(min-width: 1024px) 680px, 100vw"
                      className="object-cover object-top"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
