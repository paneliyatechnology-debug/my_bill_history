"use client";

import React from "react";
import Link from "next/link";
import { BrandLogo } from "../ui/brand-logo";
import { MessageSquare, ShieldCheck, Heart } from "lucide-react";

export interface HomepageFooterProps {
  lang?: "en" | "gu";
  onToggleLang?: () => void;
}

export function HomepageFooter({ lang = "en", onToggleLang }: HomepageFooterProps) {
  const gu = lang === "gu";

  return (
    <footer className="bg-white border-t border-[#E5EAF1] pt-14 pb-10 text-xs text-[#667085]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Top 5-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 sm:gap-10">
          {/* Brand Info Column */}
          <div className="md:col-span-2 space-y-3.5">
            <BrandLogo size="md" showSubtitle subtitle="Paneliya Technology" href="/" />
            <p className="text-xs text-[#667085] leading-relaxed max-w-sm font-normal">
              {gu
                ? "ભારતીય રિટેલર્સ, હોલસેલર્સ, ડિસ્ટ્રિબ્યુટર્સ અને ઉત્પાદકો માટે અદ્યતન GST બિલિંગ, ઇન્વેન્ટરી અને એકાઉન્ટિંગ પ્લેટફોર્મ."
                : "Modern GST billing, POS counter, purchase OCR, multi-godown inventory, and double-entry accounting ERP for Indian businesses."}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-[#172033] font-medium pt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>Paneliya Technology · Surat & Ahmedabad, Gujarat</span>
            </div>
          </div>

          {/* Column 1: Product */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[#172033] uppercase tracking-wider">
              {gu ? "પ્રોડક્ટ" : "Product"}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/features" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "તમામ સુવિધાઓ (Overview)" : "All 28 Core Features"}
                </Link>
              </li>
              <li>
                <Link href="/features#sales-invoices" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "GST બિલિંગ & ઇન્વોઇસિંગ" : "GST Invoicing"}
                </Link>
              </li>
              <li>
                <Link href="/features#inventory-items" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "ગોડાઉન સ્ટોક & ઇન્વેન્ટરી" : "Godown Inventory"}
                </Link>
              </li>
              <li>
                <Link href="/features#accounting-ledgers" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "રોજમેળ & એકાઉન્ટિંગ" : "Accounting & P&L"}
                </Link>
              </li>
              <li>
                <Link href="/features#pos-billing" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "બારકોડ POS કાઉન્ટર" : "POS Counter Billing"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Solutions */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[#172033] uppercase tracking-wider">
              {gu ? "સોલ્યુશન્સ" : "Solutions"}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#solutions" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "રિટેલ સ્ટોર્સ" : "Retailers & Shops"}
                </a>
              </li>
              <li>
                <a href="#solutions" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "હોલસેલર્સ" : "Wholesalers & Traders"}
                </a>
              </li>
              <li>
                <a href="#solutions" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "ડિસ્ટ્રિબ્યુટર્સ" : "Distributors & C&F"}
                </a>
              </li>
              <li>
                <a href="#solutions" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "મેન્યુફેક્ચરિંગ" : "Manufacturers"}
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
            <h4 className="text-xs font-semibold text-[#172033] uppercase tracking-wider">
              {gu ? "સપોર્ટ & હેલ્પ" : "Resources"}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#faq" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "પ્રશ્નોત્તરી (FAQ)" : "FAQ & Answers"}
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/917400199999"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#159B72] transition-colors flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#159B72]" />
                  <span>WhatsApp Helpdesk</span>
                </a>
              </li>
              <li>
                <span className="text-[#667085]">Mon - Sat · 9am - 8pm IST</span>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#2563EB] transition-colors">
                  {gu ? "એકાઉન્ટ સાઇન ઇન" : "Account Sign In"}
                </Link>
              </li>
              <li>
            
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright, Language, India Reassurance */}
        <div className="pt-8 border-t border-[#E5EAF1] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#667085]">
          <p>© {new Date().getFullYear()} Paneliya Technology. All rights reserved.</p>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 font-medium text-[#172033]">
              <span>Made with</span>
              <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
              <span>for Indian businesses 🇮🇳</span>
            </span>

            {onToggleLang && (
              <>
                <span>·</span>
                <button
                  type="button"
                  onClick={onToggleLang}
                  className="hover:text-[#2563EB] font-medium cursor-pointer"
                >
                  {gu ? "Switch to English" : "ગુજરાતીમાં જુઓ"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
