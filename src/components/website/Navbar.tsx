"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { BrandLogo } from "../ui/brand-logo";
import {
  ChevronDown,
  ReceiptText,
  Package,
  ShoppingCart,
  Calculator,
  Files,
  Building2,
  Truck,
  Factory,
  Briefcase,
  Store,
  HelpCircle,
  MessageSquare,
  ShieldCheck,
  Menu,
  X,
  ArrowRight,
  Globe,
} from "lucide-react";

export interface NavbarProps {
  lang?: "en" | "gu";
  onToggleLang?: () => void;
  onOpenDemo?: () => void;
}

export function Navbar({ lang = "en", onToggleLang, onOpenDemo }: NavbarProps) {
  const gu = lang === "gu";
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Scroll detection for clean sticky header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const productItems = [
    {
      title: gu ? "GST બિલિંગ અને ટેક્સ ઇન્વોઇસિંગ" : "GST Billing & Tax Invoicing",
      desc: gu ? "૧૦ સેકન્ડમાં B2B/B2C પાકા બિલ બનાવો" : "Create statutory compliant B2B & B2C tax invoices in seconds",
      href: "/features#sales-invoices",
      icon: <ReceiptText className="w-[18px] h-[18px] text-[#2563EB]" strokeWidth={1.75} />,
    },
    {
      title: gu ? "બારકોડ POS કાઉન્ટર બિલિંગ" : "Barcode POS Counter Checkout",
      desc: gu ? "રિટેલ કાઉન્ટર અને થર્મલ 58/80mm પ્રિન્ટિંગ" : "High-speed retail counter with thermal receipts and barcode pairing",
      href: "/features#pos-billing",
      icon: <ShoppingCart className="w-[18px] h-[18px] text-[#2563EB]" strokeWidth={1.75} />,
    },
    {
      title: gu ? "ગોડાઉન સ્ટોક અને ઇન્વેન્ટરી" : "Godown Stock & Inventory",
      desc: gu ? "મલ્ટી-ગોડાઉન સ્ટોક, બેચ અને લો-સ્ટોક એલર્ટ" : "Multi-warehouse tracking, batch expiry & low-stock alerts",
      href: "/features#inventory-items",
      icon: <Package className="w-[18px] h-[18px] text-[#2563EB]" strokeWidth={1.75} />,
    },
    {
      title: gu ? "ખરીદી બિલ AI સ્કેનર" : "Purchase Bill OCR Scanner",
      desc: gu ? "વેપારી બિલ સ્કેન કરીને સીધી એન્ટ્રી કરો" : "Automatic optical scanning of supplier paper bills into stock",
      href: "/features#purchases-bills",
      icon: <Files className="w-[18px] h-[18px] text-[#2563EB]" strokeWidth={1.75} />,
    },
    {
      title: gu ? "રોજમેળ અને ડબલ-એન્ટ્રી ખાતાવહી" : "Double-Entry Accounting Ledgers",
      desc: gu ? "P&L, બેલેન્સ શીટ, પાર્ટી ખાતા અને ટ્રાયલ બેલેન્સ" : "Real-time Profit & Loss, Balance Sheet & party ledger khatas",
      href: "/features#accounting-ledgers",
      icon: <Calculator className="w-[18px] h-[18px] text-[#2563EB]" strokeWidth={1.75} />,
    },
  ];

  const solutionItems = [
    {
      title: gu ? "રિટેલ સ્ટોર્સ અને સુપરમાર્કેટ્સ" : "Retailers & Kirana Stores",
      desc: gu ? "બારકોડ સ્કેનિંગ, ઝડપી કેશ/UPI અને ગ્રાહક ખાતાવહી" : "Barcode checkout, cash tender calculation & customer khata",
      href: "#solutions",
      icon: <Store className="w-[18px] h-[18px] text-[#2563EB]" strokeWidth={1.75} />,
    },
    {
      title: gu ? "હોલસેલર્સ અને વેપારીઓ" : "Wholesalers & Bulk Traders",
      desc: gu ? "બલ્ક રેટ, ઉધાર ક્રેડિટ મર્યાદા અને પાર્ટી ખાતાવહી" : "Tiered pricing, credit limit enforcement & party ledgers",
      href: "#solutions",
      icon: <Building2 className="w-[18px] h-[18px] text-[#2563EB]" strokeWidth={1.75} />,
    },
    {
      title: gu ? "ડિસ્ટ્રિબ્યુટર્સ અને એજન્સીઓ" : "Distributors & C&F Agents",
      desc: gu ? "ડિલિવરી ચલણ, વાન સેલ્સ અને ગોડાઉન ટ્રાન્સફર" : "Delivery challans, route dispatch & godown transfers",
      href: "#solutions",
      icon: <Truck className="w-[18px] h-[18px] text-[#2563EB]" strokeWidth={1.75} />,
    },
    {
      title: gu ? "મેન્યુફેક્ચરિંગ અને વર્કશોપ્સ" : "Manufacturers & Fabricators",
      desc: gu ? "કાચો માલ, જોબ વર્ક, બેચ ટ્રેકિંગ અને તૈયાર માલ" : "Raw materials, batch numbers, BOM & finished goods",
      href: "#solutions",
      icon: <Factory className="w-[18px] h-[18px] text-[#2563EB]" strokeWidth={1.75} />,
    },
    {
      title: gu ? "સર્વિસ પ્રોવાઇડર્સ અને એજન્સીઝ" : "Service Providers & Agencies",
      desc: gu ? "SAC કોડ્સ, પ્રોફોર્મા ઇન્વોઇસ અને TDS રેકોર્ડ્સ" : "SAC code billing, proforma estimates & TDS tracking",
      href: "#solutions",
      icon: <Briefcase className="w-[18px] h-[18px] text-[#2563EB]" strokeWidth={1.75} />,
    },
  ];

  const resourceItems = [
    {
      title: gu ? "ફીચર્સ ગાઈડ અને મોડ્યુલ્સ" : "Complete Features Guide",
      desc: gu ? "તમામ ૨૮ સત્તાવાર મોડ્યુલ્સની વિગતવાર માહિતી" : "Detailed breakdown of all 28 core business modules",
      href: "/features",
      icon: <Files className="w-[18px] h-[18px] text-[#2563EB]" strokeWidth={1.75} />,
    },
    {
      title: gu ? "વારંવાર પૂછાતા પ્રશ્નો (FAQ)" : "Frequently Asked Questions",
      desc: gu ? "GST, સુરક્ષા, પ્રિન્ટર્સ અને ડેટા બેકઅપ વિશે" : "Answers on GST rules, offline sync, thermal printers & backups",
      href: "#faq",
      icon: <HelpCircle className="w-[18px] h-[18px] text-[#2563EB]" strokeWidth={1.75} />,
    },
    {
      title: gu ? "વોટ્સએપ હેલ્પડેસ્ક" : "WhatsApp Direct Support",
      desc: gu ? "સોમ-શનિ સવારે ૯ થી રાત્રે ૮ સુધી લાઈવ સપોર્ટ" : "Instant chat support with our technical engineering team",
      href: "https://wa.me/917400199999",
      icon: <MessageSquare className="w-[18px] h-[18px] text-[#159B72]" strokeWidth={1.75} />,
    },
    {
      title: gu ? "સુરક્ષા અને બેંક-ગ્રેડ એન્ક્રિપ્શન" : "Security & Privacy Standard",
      desc: gu ? "256-બીટ એન્ક્રિપ્શન અને ડેઇલી ક્લાઉડ બેકઅપ" : "Bank-grade 256-bit encryption & role-based access logs",
      href: "#trust",
      icon: <ShieldCheck className="w-[18px] h-[18px] text-[#2563EB]" strokeWidth={1.75} />,
    },
  ];

  return (
    <header
      ref={navRef}
      className={`sticky top-0 left-0 right-0 z-40 transition-all duration-200 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-xs border-b border-[#E5EAF1]"
          : "bg-white border-b border-[#E5EAF1]/70"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-17 flex items-center justify-between gap-4">
        {/* Left: Brand Logo */}
        <div className="shrink-0 flex items-center">
          <BrandLogo size="md" showSubtitle subtitle="Paneliya Technology" href="/" />
        </div>

        {/* Center: Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-[13px] sm:text-sm font-medium">
          {/* 1. Product Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === "product" ? null : "product")}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                activeDropdown === "product"
                  ? "text-[#2563EB] bg-[#F7F9FC]"
                  : "text-[#172033] hover:text-[#2563EB] hover:bg-slate-50"
              }`}
            >
              <span>{gu ? "પ્રોડક્ટ" : "Product"}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  activeDropdown === "product" ? "rotate-180 text-[#2563EB]" : "text-[#667085]"
                }`}
                strokeWidth={1.75}
              />
            </button>

            {activeDropdown === "product" && (
              <div className="absolute top-full left-0 mt-2 w-84 bg-white rounded-xl border border-[#E5EAF1] shadow-xl p-2 z-50 animate-in fade-in duration-150">
                {productItems.map((item, idx) => (
                  <Link
                    key={idx}
                    href={item.href}
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[#F7F9FC] transition-colors group"
                  >
                    <div className="shrink-0 mt-0.5">{item.icon}</div>
                    <div>
                      <div className="text-xs font-semibold text-[#172033] group-hover:text-[#2563EB] transition-colors">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-[#667085] leading-snug mt-0.5">
                        {item.desc}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 2. Features */}
          <Link
            href="/features"
            className="px-3 py-2 rounded-lg text-[#172033] hover:text-[#2563EB] hover:bg-slate-50 transition-colors"
          >
            {gu ? "સુવિધાઓ" : "Features"}
          </Link>

          {/* 3. Solutions Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === "solutions" ? null : "solutions")}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                activeDropdown === "solutions"
                  ? "text-[#2563EB] bg-[#F7F9FC]"
                  : "text-[#172033] hover:text-[#2563EB] hover:bg-slate-50"
              }`}
            >
              <span>{gu ? "સોલ્યુશન્સ" : "Solutions"}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  activeDropdown === "solutions" ? "rotate-180 text-[#2563EB]" : "text-[#667085]"
                }`}
                strokeWidth={1.75}
              />
            </button>

            {activeDropdown === "solutions" && (
              <div className="absolute top-full left-0 mt-2 w-84 bg-white rounded-xl border border-[#E5EAF1] shadow-xl p-2 z-50 animate-in fade-in duration-150">
                {solutionItems.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.href}
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[#F7F9FC] transition-colors group"
                  >
                    <div className="shrink-0 mt-0.5">{item.icon}</div>
                    <div>
                      <div className="text-xs font-semibold text-[#172033] group-hover:text-[#2563EB] transition-colors">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-[#667085] leading-snug mt-0.5">
                        {item.desc}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* 4. Pricing */}
          <a
            href="#pricing"
            className="px-3 py-2 rounded-lg text-[#172033] hover:text-[#2563EB] hover:bg-slate-50 transition-colors"
          >
            {gu ? "કિંમતો" : "Pricing"}
          </a>

          {/* 5. Resources Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === "resources" ? null : "resources")}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                activeDropdown === "resources"
                  ? "text-[#2563EB] bg-[#F7F9FC]"
                  : "text-[#172033] hover:text-[#2563EB] hover:bg-slate-50"
              }`}
            >
              <span>{gu ? "રિસોર્સિસ" : "Resources"}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  activeDropdown === "resources" ? "rotate-180 text-[#2563EB]" : "text-[#667085]"
                }`}
                strokeWidth={1.75}
              />
            </button>

            {activeDropdown === "resources" && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl border border-[#E5EAF1] shadow-xl p-2 z-50 animate-in fade-in duration-150">
                {resourceItems.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.href}
                    target={item.href.startsWith("http") ? "_blank" : undefined}
                    rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[#F7F9FC] transition-colors group"
                  >
                    <div className="shrink-0 mt-0.5">{item.icon}</div>
                    <div>
                      <div className="text-xs font-semibold text-[#172033] group-hover:text-[#2563EB] transition-colors">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-[#667085] leading-snug mt-0.5">
                        {item.desc}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Right: Actions & Language Selector */}
        <div className="hidden lg:flex items-center gap-2.5">
          {/* Language Toggle */}
          {onToggleLang && (
            <button
              type="button"
              onClick={onToggleLang}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E5EAF1] text-xs font-medium text-[#172033] hover:bg-[#F7F9FC] transition-colors cursor-pointer"
              title={gu ? "Switch to English" : "ગુજરાતીમાં જુઓ"}
            >
              <Globe className="w-3.5 h-3.5 text-[#667085]" strokeWidth={1.75} />
              <span>{gu ? "English" : "ગુજરાતી"}</span>
            </button>
          )}

          {/* Sign In */}
          <Link
            href="/login"
            className="px-3.5 py-2 text-xs sm:text-sm font-medium text-[#172033] hover:text-[#2563EB] transition-colors"
          >
            {gu ? "પ્રવેશ કરો" : "Sign In"}
          </Link>

          {/* Book a Demo */}
          {onOpenDemo && (
            <button
              type="button"
              onClick={onOpenDemo}
              className="px-3.5 py-2 rounded-lg border border-[#E5EAF1] bg-white text-xs sm:text-sm font-medium text-[#172033] hover:bg-[#F7F9FC] transition-colors cursor-pointer shadow-2xs"
            >
              {gu ? "ડેમો બુક કરો" : "Book a Demo"}
            </button>
          )}

          {/* Get Started Free CTA */}
          <Link
            href="/login?mode=signup"
            className="h-9 px-4 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-all shadow-xs active:scale-98"
          >
            <span>{gu ? "મફત શરૂ કરો" : "Get Started Free"}</span>
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 lg:hidden">
          {onToggleLang && (
            <button
              type="button"
              onClick={onToggleLang}
              className="px-2 py-1 rounded-md border border-[#E5EAF1] text-[11px] font-medium text-[#172033]"
            >
              {gu ? "EN" : "ગુજ"}
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-[#172033] hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-[#172033]" strokeWidth={1.75} />
            ) : (
              <Menu className="w-5 h-5 text-[#172033]" strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#E5EAF1] bg-white px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-150 max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="space-y-1">
            <Link
              href="/features"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-[#172033] rounded-lg hover:bg-[#F7F9FC]"
            >
              {gu ? "સુવિધાઓ (Features)" : "Features Overview"}
            </Link>
            <a
              href="#solutions"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-[#172033] rounded-lg hover:bg-[#F7F9FC]"
            >
              {gu ? "ઇન્ડસ્ટ્રી સોલ્યુશન્સ" : "Industry Solutions"}
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-[#172033] rounded-lg hover:bg-[#F7F9FC]"
            >
              {gu ? "કિંમતો (Pricing)" : "Subscription Pricing"}
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-[#172033] rounded-lg hover:bg-[#F7F9FC]"
            >
              {gu ? "પ્રશ્નોત્તરી (FAQ)" : "FAQ"}
            </a>
            <a
              href="https://wa.me/917400199999"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-2 text-sm font-medium text-[#159B72] rounded-lg hover:bg-emerald-50"
            >
              WhatsApp Support (9am - 8pm)
            </a>
          </div>

          <div className="pt-3 border-t border-[#E5EAF1] space-y-2">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full py-2.5 text-center text-sm font-medium text-[#172033] border border-[#E5EAF1] rounded-xl"
            >
              {gu ? "પ્રવેશ કરો (Sign In)" : "Sign In to Account"}
            </Link>

            {onOpenDemo && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenDemo();
                }}
                className="block w-full py-2.5 text-center text-sm font-medium text-[#172033] bg-[#F7F9FC] border border-[#E5EAF1] rounded-xl cursor-pointer"
              >
                {gu ? "ડેમો બુક કરો" : "Book a Live Demo"}
              </button>
            )}

            <Link
              href="/login?mode=signup"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full py-2.5 text-center text-sm font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl shadow-xs"
            >
              {gu ? "મફત શરૂ કરો" : "Get Started Free"}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
