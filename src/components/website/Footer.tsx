"use client";

import React from "react";
import Link from "next/link";
import { BrandLogo } from "../ui/brand-logo";
import {
  MapPin,
  Mail,
  Phone,
  Globe,
  ShieldCheck,
  Lock,
  Zap,
  Clock,
  MessageSquare,
  Heart,
  ArrowUpRight,
} from "lucide-react";

export interface FooterProps {
  lang?: "en" | "gu";
  onToggleLang?: () => void;
}

export function Footer({ lang = "en", onToggleLang }: FooterProps) {
  const gu = lang === "gu";
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white text-[#172033] border-t border-[#E5EAF1] pt-12 pb-10 text-xs sm:text-[13px]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
        {/* Top Trust & Statutory Reassurance Strip */}
        <div className="bg-[#F7F9FC] border border-[#E5EAF1] rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* 1. Statutory GST */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#E5EAF1] flex items-center justify-center text-[#2563EB] shrink-0 shadow-2xs">
                <ShieldCheck className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <h4
                  className="text-xs sm:text-sm font-semibold text-[#172033] truncate"
                  style={{ fontFamily: "var(--font-manrope)" }}
                >
                  {gu ? "૧૦૦% કાયદેસર GST" : "100% Statutory GST"}
                </h4>
                <p className="text-[11px] text-[#667085] truncate font-normal">
                  {gu ? "B2B, B2C & ઇ-વે બિલ તૈયાર" : "B2B, B2C & E-Way Bill Ready"}
                </p>
              </div>
            </div>

         

            {/* 3. High Uptime */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#E5EAF1] flex items-center justify-center text-[#2563EB] shrink-0 shadow-2xs">
                <Zap className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <h4
                  className="text-xs sm:text-sm font-semibold text-[#172033] truncate"
                  style={{ fontFamily: "var(--font-manrope)" }}
                >
                  {gu ? "૯૯.૯% ક્લાઉડ અપટાઇમ" : "99.9% Cloud Uptime"}
                </h4>
                <p className="text-[11px] text-[#667085] truncate font-normal">
                  {gu ? "અતિ-ઝડપી કાઉન્ટર બિલિંગ" : "Fast Uninterrupted Billing"}
                </p>
              </div>
            </div>

            {/* 4. Local Priority Support */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#E5EAF1] flex items-center justify-center text-[#2563EB] shrink-0 shadow-2xs">
                <Clock className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <h4
                  className="text-xs sm:text-sm font-semibold text-[#172033] truncate"
                  style={{ fontFamily: "var(--font-manrope)" }}
                >
                  {gu ? "ડેડિકેટેડ હેલ્પડેસ્ક" : "Dedicated Support Desk"}
                </h4>
                <p className="text-[11px] text-[#667085] truncate font-normal">
                  {gu ? "સોમ-શનિ ૯:૦૦ થી ૨૦:૦૦" : "Mon-Sat 9AM-8PM IST"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main 5-Column Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-8 sm:gap-10">
          {/* Brand & Identity Column (2 cols on md/lg) */}
          <div className="md:col-span-2 space-y-3.5">
            <BrandLogo size="md" showSubtitle subtitle="Paneliya Technology" href="/" />

            <p className="text-xs text-[#667085] leading-relaxed max-w-sm font-normal">
              {gu
                ? "ભારતીય રિટેલર્સ, હોલસેલર્સ, ડિસ્ટ્રિબ્યુટર્સ અને ઉત્પાદકો માટે આધુનિક GST બિલિંગ, ઇન્વેન્ટરી અને એકાઉન્ટિંગ પ્લેટફોર્મ."
                : "Modern cloud accounting, GST tax invoicing, multi-godown inventory, and double-entry financial reporting engineered for Indian enterprises."}
            </p>

            <div className="space-y-1.5 pt-1 text-xs text-[#667085]">
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#2563EB] shrink-0 mt-0.5" strokeWidth={1.75} />
                <span>Paneliya Technology · Ahmedabad ,Gujarat</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#2563EB] shrink-0" strokeWidth={1.75} />
                <a
                  href="mailto:support@myownbillbook.com"
                  className="hover:text-[#2563EB] transition-colors"
                >
                  support@myownbillbook.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#2563EB] shrink-0" strokeWidth={1.75} />
                <a
                  href="tel:+917400199999"
                  className="hover:text-[#2563EB] transition-colors font-medium text-[#172033]"
                >
                  +91 74001 99999
                </a>
              </div>
            </div>

            <div className="pt-1">
              <a
                href="https://wa.me/917400199999?text=Hello%20MyOwnBillBook%2C%20I%20want%20to%20know%20more"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#159B72] text-xs font-medium border border-emerald-200 transition-colors shadow-2xs"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#159B72]" strokeWidth={1.75} />
                <span>{gu ? "WhatsApp હેલ્પડેસ્ક" : "WhatsApp Helpdesk"}</span>
              </a>
            </div>
          </div>

          {/* Column 1: Product */}
          <div className="space-y-3">
            <h4
              className="text-xs font-semibold text-[#172033] uppercase tracking-wider"
              style={{ fontFamily: "var(--font-manrope)" }}
            >
              {gu ? "પ્રોડક્ટ" : "Product"}
            </h4>
            <ul className="space-y-2 text-xs text-[#667085]">
              <li>
                <Link href="/features#sales-invoices" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "GST બિલિંગ & ઇન્વોઇસિંગ" : "GST Invoicing"}
                </Link>
              </li>
              <li>
                <Link href="/features#inventory-items" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "ગોડાઉન સ્ટોક મેનેજમેન્ટ" : "Godown Inventory"}
                </Link>
              </li>
              <li>
                <Link href="/features#accounting-ledgers" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "ડબલ-એન્ટ્રી ખાતાવહી" : "Double-Entry Ledgers"}
                </Link>
              </li>
              <li>
                <Link href="/features#pos-billing" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "બારકોડ POS કાઉન્ટર" : "POS Counter Checkout"}
                </Link>
              </li>
              <li>
                <Link href="/features#purchases-bills" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "ખરીદી OCR સ્કેનર" : "Purchase OCR Scanner"}
                </Link>
              </li>
              <li>
                <Link href="/features#accounting-ledgers" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "P&L અને બેલેન્સ શીટ" : "P&L & Balance Sheet"}
                </Link>
              </li>
              <li>
                <Link
                  href="/features"
                  className="inline-flex items-center gap-1 text-[#2563EB] font-medium hover:underline pt-0.5"
                >
                  <span>{gu ? "તમામ ૨૮ ફીચર્સ જુઓ" : "All 28 Core Features"}</span>
                  <ArrowUpRight className="w-3 h-3" strokeWidth={1.75} />
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Solutions */}
          <div className="space-y-3">
            <h4
              className="text-xs font-semibold text-[#172033] uppercase tracking-wider"
              style={{ fontFamily: "var(--font-manrope)" }}
            >
              {gu ? "સોલ્યુશન્સ" : "Solutions"}
            </h4>
            <ul className="space-y-2 text-xs text-[#667085]">
              <li>
                <a href="#solutions" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "રિટેલ સ્ટોર્સ & દુકાનો" : "Retailers & Shops"}
                </a>
              </li>
              <li>
                <a href="#solutions" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "હોલસેલર્સ & ટ્રેડર્સ" : "Wholesalers & Traders"}
                </a>
              </li>
              <li>
                <a href="#solutions" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "ડિસ્ટ્રિબ્યુટર્સ & એજન્સીઓ" : "Distributors & C&F"}
                </a>
              </li>
              <li>
                <a href="#solutions" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "ઉત્પાદકો & વર્કશોપ" : "Manufacturers"}
                </a>
              </li>
              <li>
                <a href="#solutions" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "સર્વિસ પ્રોવાઇડર્સ" : "Service Businesses"}
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "સબ્સ્ક્રિપ્શન પ્લાન્સ" : "Pricing Plans"}
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources & Support */}
          <div className="space-y-3">
            <h4
              className="text-xs font-semibold text-[#172033] uppercase tracking-wider"
              style={{ fontFamily: "var(--font-manrope)" }}
            >
              {gu ? "સંસાધનો" : "Resources"}
            </h4>
            <ul className="space-y-2 text-xs text-[#667085]">
              <li>
                <a href="#faq" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "પ્રશ્નોત્તરી (FAQ)" : "Help Center & FAQ"}
                </a>
              </li>
              <li>
                <a href="#showcase" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "ઇન્ટરેક્ટિવ પ્રોડક્ટ ડેમો" : "Interactive Product Demo"}
                </a>
              </li>
              <li>
                <a href="#trust" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "શા માટે MyOwnBillBook" : "Why Choose Us"}
                </a>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "એકાઉન્ટ સાઇન ઇન" : "Account Sign In"}
                </Link>
              </li>
              <li className="pt-1">
            
              </li>
            </ul>
          </div>

          {/* Column 4: Legal & Trust */}
          <div className="space-y-3">
            <h4
              className="text-xs font-semibold text-[#172033] uppercase tracking-wider"
              style={{ fontFamily: "var(--font-manrope)" }}
            >
              {gu ? "કાનૂની શરતો" : "Legal & Trust"}
            </h4>
            <ul className="space-y-2 text-xs text-[#667085]">
              <li>
                <a href="#faq" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "પ્રાઇવસી પોલિસી" : "Privacy Policy"}
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "નિયમો & શરતો" : "Terms & Conditions"}
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "રિફંડ પોલિસી" : "Refund Policy"}
                </a>
              </li>
              <li>
                <a href="#trust" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "સિક્યોરિટી અને બેકઅપ" : "Security & Privacy"}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright (Centered) */}
        <div className="pt-8 border-t border-[#E5EAF1] flex flex-col items-center justify-center text-center gap-4 text-xs text-[#667085]">
          <p>
            © {currentYear} MyOwnBillBook by Paneliya Technology. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
