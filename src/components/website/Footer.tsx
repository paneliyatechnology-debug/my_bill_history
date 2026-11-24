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

            <div className="pt-2 flex items-center gap-2">
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

            {/* Social Media Profiles Strip (For SEO Verification & Trust) */}
            <div className="pt-3">
              <span className="text-[11px] font-semibold text-[#172033] block mb-2 uppercase tracking-wider">
                {gu ? "સોશિયલ મીડિયા પર જોડાઓ" : "Connect With Us"}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href="https://www.facebook.com/myownbillbook"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook Page"
                  className="w-8 h-8 rounded-lg bg-[#F7F9FC] border border-[#E5EAF1] flex items-center justify-center text-[#667085] hover:text-[#2563EB] hover:border-[#2563EB] transition-colors"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a
                  href="https://twitter.com/myownbillbook"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="X Profile"
                  className="w-8 h-8 rounded-lg bg-[#F7F9FC] border border-[#E5EAF1] flex items-center justify-center text-[#667085] hover:text-[#2563EB] hover:border-[#2563EB] transition-colors"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a
                  href="https://www.linkedin.com/company/myownbillbook"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn Profile"
                  className="w-8 h-8 rounded-lg bg-[#F7F9FC] border border-[#E5EAF1] flex items-center justify-center text-[#667085] hover:text-[#2563EB] hover:border-[#2563EB] transition-colors"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                </a>
                <a
                  href="https://www.instagram.com/myownbillbook"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram Profile"
                  className="w-8 h-8 rounded-lg bg-[#F7F9FC] border border-[#E5EAF1] flex items-center justify-center text-[#667085] hover:text-[#2563EB] hover:border-[#2563EB] transition-colors"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a
                  href="https://www.youtube.com/@myownbillbook"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube Channel"
                  className="w-8 h-8 rounded-lg bg-[#F7F9FC] border border-[#E5EAF1] flex items-center justify-center text-[#667085] hover:text-[#DC2626] hover:border-[#DC2626] transition-colors"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
              </div>
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
