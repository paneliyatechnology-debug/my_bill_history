"use client";

import React from "react";
import Link from "next/link";
import { BrandLogo } from "../ui/brand-logo";
import { MessageSquare, Globe } from "lucide-react";

export interface FooterProps {
  lang?: "en" | "gu";
  onToggleLang?: () => void;
}

export function Footer({ lang = "en", onToggleLang }: FooterProps) {
  const gu = lang === "gu";

  return (
    <footer className="bg-white pt-14 pb-10 text-xs text-[#667085]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Top 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 sm:gap-10">
          {/* Brand Info Column */}
          <div className="md:col-span-2 space-y-3">
            <BrandLogo size="md" showSubtitle subtitle="Paneliya Technology" href="/" />
            <p className="text-xs text-[#667085] leading-relaxed max-w-sm font-normal">
              {gu
                ? "ભારતીય રિટેલર્સ, હોલસેલર્સ, ડિસ્ટ્રિબ્યુટર્સ અને ઉત્પાદકો માટે અદ્યતન GST બિલિંગ, ઇન્વેન્ટરી અને એકાઉન્ટિંગ પ્લેટફોર્મ."
                : "Modern GST tax invoicing, barcode POS counter, purchase bill OCR, multi-godown stock, and double-entry accounting software for Indian businesses."}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-[#172033] font-medium pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              <span>Paneliya Technology · Surat & Ahmedabad, Gujarat</span>
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
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/features" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "તમામ ૨૮ મોડ્યુલ્સ" : "All 28 Core Features"}
                </Link>
              </li>
              <li>
                <Link href="/features#sales-invoices" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "GST બિલિંગ અને ટેક્સ" : "GST Tax Invoicing"}
                </Link>
              </li>
              <li>
                <Link href="/features#inventory-items" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "ગોડાઉન સ્ટોક મેનેજમેન્ટ" : "Godown Stock Management"}
                </Link>
              </li>
              <li>
                <Link href="/features#accounting-ledgers" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "રોજમેળ & ડબલ-એન્ટ્રી" : "Double-Entry Ledgers"}
                </Link>
              </li>
              <li>
                <Link href="/features#pos-billing" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "બારકોડ POS કાઉન્ટર" : "POS Counter Checkout"}
                </Link>
              </li>
              <li>
                <Link href="/features#purchases-bills" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "ખરીદી બિલ AI સ્કેનર" : "Purchase Bill OCR"}
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
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#solutions" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "રિટેલ સ્ટોર્સ" : "Retailers & Kirana"}
                </a>
              </li>
              <li>
                <a href="#solutions" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "હોલસેલર્સ અને વેપારીઓ" : "Wholesalers & Traders"}
                </a>
              </li>
              <li>
                <a href="#solutions" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "ડિસ્ટ્રિબ્યુટર્સ" : "Distributors & C&F"}
                </a>
              </li>
              <li>
                <a href="#solutions" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "મેન્યુફેક્ચરિંગ" : "Manufacturers & Fabricators"}
                </a>
              </li>
              <li>
                <a href="#solutions" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "સર્વિસ પ્રોવાઇડર્સ" : "Service Businesses"}
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "સબ્સ્ક્રિપ્શન પ્લાન્સ" : "Subscription Pricing"}
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
              {gu ? "સપોર્ટ અને હેલ્પ" : "Support"}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#faq" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "પ્રશ્નોત્તરી (FAQ)" : "Frequently Asked Questions"}
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/917400199999"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#159B72] transition-colors flex items-center gap-1.5 font-medium text-[#159B72]"
                >
                  <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>WhatsApp Helpdesk</span>
                </a>
              </li>
              <li>
                <span className="text-[#667085]">Mon - Sat · 9am - 8pm IST</span>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "એકાઉન્ટ સાઇન ઇન" : "Sign In to Account"}
                </Link>
              </li>
              <li>
                <a href="#trust" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "સુરક્ષા ધોરણો" : "Security & 256-Bit SSL"}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright, Language Switcher, India reassurance */}
        <div className="pt-8 border-t border-[#E5EAF1] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#667085]">
          <p>© {new Date().getFullYear()} Paneliya Technology. All rights reserved.</p>

          <div className="flex items-center gap-4">
            <span className="font-medium text-[#172033]">
              Engineered for Indian businesses 🇮🇳
            </span>

            {onToggleLang && (
              <>
                <span>·</span>
                <button
                  type="button"
                  onClick={onToggleLang}
                  className="flex items-center gap-1 text-[#172033] hover:text-[#2563EB] font-medium cursor-pointer"
                >
                  <Globe className="w-3 h-3 text-[#667085]" strokeWidth={1.75} />
                  <span>{gu ? "Switch to English" : "ગુજરાતીમાં જુઓ"}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
