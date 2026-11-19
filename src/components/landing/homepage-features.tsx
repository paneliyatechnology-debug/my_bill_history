"use client";

import React from "react";
import Link from "next/link";
import {
  Receipt,
  Boxes,
  ShoppingBag,
  Calculator,
  Store,
  CreditCard,
  FileSpreadsheet,
  BarChart3,
  ArrowRight,
} from "lucide-react";

export interface HomepageFeaturesProps {
  lang?: "en" | "gu";
}

export function HomepageFeatures({ lang = "en" }: HomepageFeaturesProps) {
  const gu = lang === "gu";

  const features = [
    {
      id: "gst-billing",
      icon: <Receipt className="w-5 h-5 text-[#2563EB]" />,
      title: gu ? "GST બિલિંગ અને ઇન્વોઇસિંગ" : "GST Billing & Invoicing",
      desc: gu
        ? "B2B અને B2C પ્રોફેશનલ બિલ બનાવો. 4 કલર પ્રિન્ટ થીમ્સ, ઓટો ટેક્સ ગણતરી અને WhatsApp PDF શેરિંગ."
        : "Create professional GST & non-GST tax invoices in seconds. Includes multi-rate GST, round-offs, customizable themes & WhatsApp PDF sharing.",
      badges: ["B2B & B2C", "4 Print Themes", "WhatsApp PDF"],
      link: "/features#sales-invoices",
    },
    {
      id: "inventory",
      icon: <Boxes className="w-5 h-5 text-[#2563EB]" />,
      title: gu ? "ઇન્વેન્ટરી અને સ્ટોક મેનેજમેન્ટ" : "Inventory Management",
      desc: gu
        ? "તમામ પ્રોડક્ટ્સ, સ્ટોક જથ્થો, ગોડાઉન ટ્રાન્સફર અને લો-સ્ટોક એલર્ટ્સનું સંપૂર્ણ સંચાલન."
        : "Manage products, stock quantities, godowns, batches, barcode stickers and automated low-stock warnings with ease.",
      badges: ["Batch Tracking", "Multi-Godown", "Stock Alerts"],
      link: "/features#inventory-items",
    },
    {
      id: "sales-purchases",
      icon: <ShoppingBag className="w-5 h-5 text-[#2563EB]" />,
      title: gu ? "વેચાણ અને ખરીદી મેનેજમેન્ટ" : "Sales & Purchase Management",
      desc: gu
        ? "વેચાણ ઇન્વોઇસ, ખરીદી બિલ, કોટેશન, ડિલિવરી ચલણ અને ડેબિટ/ક્રેડિટ નોટ્સ એક જ જગ્યાએ."
        : "Organize sales invoices, vendor purchase bills, proforma quotations, delivery challans, and credit/debit notes.",
      badges: ["Quotations", "Delivery Challans", "Debit/Credit Notes"],
      link: "/features#purchases-bills",
    },
    {
      id: "accounting-reports",
      icon: <Calculator className="w-5 h-5 text-[#2563EB]" />,
      title: gu ? "એકાઉન્ટિંગ અને નાણાકીય રિપોર્ટ્સ" : "Accounting & Reports",
      desc: gu
        ? "પ્રોફિટ એન્ડ લોસ, બેલેન્સ શીટ, કેશ ફ્લો, ટ્રાયલ બેલેન્સ અને પાર્ટી વાઈઝ ખાતાવહી આપોઆપ તૈયાર."
        : "Monitor real financial performance with automatic Profit & Loss, Balance Sheets, Cash Flow, and party ledger statements.",
      badges: ["P&L Statement", "Balance Sheet", "Trial Balance"],
      link: "/features#accounting-ledgers",
    },
    {
      id: "pos-billing",
      icon: <Store className="w-5 h-5 text-[#2563EB]" />,
      title: gu ? "ઝડપી POS કાઉન્ટર બિલિંગ" : "POS Billing",
      desc: gu
        ? "રિટેલ સ્ટોર્સ માટે સુપરફાસ્ટ કાઉન્ટર બિલિંગ. બારકોડ સ્કેનર અને 58mm/80mm થર્મલ રિસિપ્ટ પ્રિન્ટિંગ."
        : "Simplify retail checkout workflows with barcode scanner pairing, keyboard shortcuts, and 58mm/80mm thermal receipt printing.",
      badges: ["Barcode Ready", "Thermal 58/80mm", "F2/F4 Shortcuts"],
      link: "/features#pos-billing",
    },
    {
      id: "payment-tracking",
      icon: <CreditCard className="w-5 h-5 text-[#2563EB]" />,
      title: gu ? "પેમેન્ટ ટ્રેકિંગ (લેણાં & દેવાં)" : "Payment Tracking",
      desc: gu
        ? "ગ્રાહકો પાસેથી લેવાની અને વેપારીઓને આપવાની બાકી રકમ પર નજર રાખો. ઓટોમેટિક પેમેન્ટ રિમાઇન્ડર્સ."
        : "Monitor receivables, payables, overdue balances, payment-in receipts, payment-out vouchers, and automated WhatsApp reminders.",
      badges: ["Receivables", "Payables", "Due Reminders"],
      link: "/features#accounting-payments",
    },
    {
      id: "gst-tax-reports",
      icon: <FileSpreadsheet className="w-5 h-5 text-[#2563EB]" />,
      title: gu ? "GST અને ટેક્સ રિપોર્ટ્સ" : "GST & Tax Reports",
      desc: gu
        ? "GSTR-1, GSTR-3B અને 2B રિકોન્સિલિએશન રિપોર્ટ્સ સરકારી પોર્ટલ ફોર્મેટમાં સીધા જ એક્સપોર્ટ કરો."
        : "Organize tax-related records with GSTR-1, GSTR-3B summaries, HSN code sales reports, and statutory JSON file exports.",
      badges: ["GSTR-1 & 3B", "HSN Reports", "Portal Ready"],
      link: "/features#gst-tax",
    },
    {
      id: "business-analytics",
      icon: <BarChart3 className="w-5 h-5 text-[#2563EB]" />,
      title: gu ? "બિઝનેસ એનાલિટિક્સ ડેશબોર્ડ" : "Business Analytics",
      desc: gu
        ? "લાઇવ વેચાણ ટ્રેન્ડ, બેસ્ટ-સેલિંગ પ્રોડક્ટ્સ, કેટેગરી વિતરણ અને ગ્રોથ એનાલિસિસથી વ્યવસાય સમજો."
        : "Understand business health with interactive KPI scorecards, visual sales curves, category distributions, and growth analytics.",
      badges: ["Live KPI Dashboards", "Sales Curves", "Top Items"],
      link: "/features#business-tools",
    },
  ];

  return (
    <section id="features" className="py-14 sm:py-20 bg-[#F7F9FC] border-b border-[#E5EAF1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <span className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider px-3 py-1 bg-[#EFF6FF] border border-[#BFDBFE] rounded-full">
            {gu ? "સંપૂર્ણ ક્ષમતાઓ" : "Comprehensive Platform"}
          </span>
          <h2
            className="text-2xl sm:text-3xl font-semibold text-[#172033] tracking-tight mt-3"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            {gu
              ? "તમારા વેપારને સરળ બનાવવા માટેના શક્તિશાળી ટૂલ્સ"
              : "Powerful Tools to Simplify Your Business"}
          </h2>
          <p className="text-xs sm:text-sm text-[#667085] mt-2 font-normal">
            {gu
              ? "દુકાન, ગોડાઉન, ઓફિસ કે એકાઉન્ટિંગ — તમામ કામગીરી હવે એક જ સરળ પ્લેટફોર્મ પર."
              : "Streamline your daily trade operations with modern tools built specifically for Indian businesses."}
          </p>
        </div>

        {/* 8 Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {features.map((feat) => (
            <div
              key={feat.id}
              className="bg-white rounded-2xl border border-[#E5EAF1] p-5 flex flex-col justify-between hover:border-[#2563EB]/40 hover:shadow-xs transition-all duration-200 group"
            >
              <div>
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE]/60 flex items-center justify-center shrink-0 mb-4 group-hover:scale-105 transition-transform shadow-2xs">
                  {feat.icon}
                </div>

                {/* Heading */}
                <h3 className="text-sm font-semibold text-[#172033] leading-snug mb-2">
                  {feat.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-[#667085] leading-relaxed font-normal mb-4">
                  {feat.desc}
                </p>

                {/* Capability Badges */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {feat.badges.map((b, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#F7F9FC] text-[#172033] border border-[#E5EAF1]"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Link */}
              <div className="pt-3 border-t border-[#E5EAF1]/70">
                <Link
                  href={feat.link}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] group-hover:translate-x-0.5 transition-all"
                >
                  <span>{gu ? "વિગતવાર જુઓ" : "Learn More"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
