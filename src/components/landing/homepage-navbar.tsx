"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { BrandLogo } from "../ui/brand-logo";
import {
  ChevronDown,
  Receipt,
  Package,
  Layers,
  Calculator,
  Store,
  Building,
  Truck,
  Factory,
  Briefcase,
  HelpCircle,
  FileText,
  MessageSquare,
  ShieldCheck,
  Menu,
  X,
  ArrowRight,
} from "lucide-react";

export interface HomepageNavbarProps {
  lang?: "en" | "gu";
  onToggleLang?: () => void;
  onOpenDemo?: () => void;
}

export function HomepageNavbar({
  lang = "en",
  onToggleLang,
  onOpenDemo,
}: HomepageNavbarProps) {
  const gu = lang === "gu";
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdown on click outside
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
      desc: gu ? "૧૦ સેકન્ડમાં B2B/B2C પાકા બિલ બનાવો" : "Create 100% compliant B2B & B2C invoices in seconds",
      href: "/features#sales-invoices",
      icon: <Receipt className="w-4 h-4 text-[#2563EB]" />,
    },
    {
      title: gu ? "બારકોડ POS કાઉન્ટર બિલિંગ" : "Barcode POS Counter Billing",
      desc: gu ? "રિટેલ કાઉન્ટર અને થર્મલ 58/80mm પ્રિન્ટિંગ" : "High-speed retail counter with thermal receipts",
      href: "/features#pos-billing",
      icon: <Store className="w-4 h-4 text-[#2563EB]" />,
    },
    {
      title: gu ? "ગોડાઉન સ્ટોક અને ઇન્વેન્ટરી" : "Godown & Inventory Management",
      desc: gu ? "મલ્ટી-ગોડાઉન સ્ટોક, બેચ અને લો-સ્ટોક એલર્ટ" : "Multi-warehouse tracking, batches & stock alerts",
      href: "/features#inventory-items",
      icon: <Package className="w-4 h-4 text-[#2563EB]" />,
    },
    {
      title: gu ? "ખરીદી બિલ OCR સ્કેનર" : "Purchase Bill OCR Scanner",
      desc: gu ? "વેપારી બિલ સ્કેન કરીને સીધી એન્ટ્રી કરો" : "AI optical scanning of supplier paper bills",
      href: "/features#purchases-bills",
      icon: <Layers className="w-4 h-4 text-[#2563EB]" />,
    },
    {
      title: gu ? "રોજમેળ અને ડબલ-એન્ટ્રી ખાતાવહી" : "Accounting & Double-Entry Ledgers",
      desc: gu ? "P&L, બેલેન્સ શીટ, પાર્ટી ખાતા અને ટ્રાયલ બેલેન્સ" : "Real-time P&L, balance sheets & party khatas",
      href: "/features#accounting-ledgers",
      icon: <Calculator className="w-4 h-4 text-[#2563EB]" />,
    },
  ];

  const solutionItems = [
    {
      title: gu ? "રિટેલ સ્ટોર્સ અને સુપરમાર્કેટ્સ" : "Retailers & Kirana Stores",
      desc: gu ? "બારકોડ સ્કેનિંગ, ઝડપી કેશ/UPI અને ગ્રાહક લોયલ્ટી" : "Barcode scanning, instant counter bills & customer loyalty",
      href: "#solutions",
      icon: <Store className="w-4 h-4 text-[#2563EB]" />,
    },
    {
      title: gu ? "હોલસેલર્સ અને વેપારીઓ" : "Wholesalers & Bulk Traders",
      desc: gu ? "બલ્ક રેટ, ઉધાર ક્રેડિટ મર્યાદા અને પાર્ટી ખાતાવહી" : "Volume pricing, credit limits & party ledger accounts",
      href: "#solutions",
      icon: <Building className="w-4 h-4 text-[#2563EB]" />,
    },
    {
      title: gu ? "ડિસ્ટ્રિબ્યુટર્સ અને એજન્સીઓ" : "Distributors & C&F Agents",
      desc: gu ? "ડિલિવરી ચલણ, વાન સેલ્સ અને મલ્ટી-ગોડાઉન ડિસ્પેચ" : "Delivery challans, route dispatch & godown transfers",
      href: "#solutions",
      icon: <Truck className="w-4 h-4 text-[#2563EB]" />,
    },
    {
      title: gu ? "મેન્યુફેક્ચરિંગ અને વર્કશોપ્સ" : "Manufacturers & Fabricators",
      desc: gu ? "કાચો માલ, જોબ વર્ક, બેચ ટ્રેકિંગ અને તૈયાર માલ" : "Raw material tracking, batch numbers & finished goods",
      href: "#solutions",
      icon: <Factory className="w-4 h-4 text-[#2563EB]" />,
    },
    {
      title: gu ? "સર્વિસ પ્રોવાઇડર્સ અને એજન્સીઝ" : "Service Businesses & Consultants",
      desc: gu ? "SAC કોડ્સ, પ્રોફોર્મા ઇન્વોઇસ અને TDS રેકોર્ડ્સ" : "SAC billing, proforma estimates & TDS management",
      href: "#solutions",
      icon: <Briefcase className="w-4 h-4 text-[#2563EB]" />,
    },
  ];

  const resourceItems = [
    {
      title: gu ? "ફીચર્સ ગાઈડ અને મોડ્યુલ્સ" : "Complete Features Guide",
      desc: gu ? "તમામ ૨૮ સત્તાવાર મોડ્યુલ્સની વિગતો" : "Detailed breakdown of all 28 core capabilities",
      href: "/features",
      icon: <FileText className="w-4 h-4 text-[#2563EB]" />,
    },
    {
      title: gu ? "વારંવાર પૂછાતા પ્રશ્નો (FAQ)" : "Frequently Asked Questions",
      desc: gu ? "GST, સુરક્ષા, બેકઅપ અને પ્રિન્ટિંગ વિશે" : "Answers on GST, cloud backups, OCR & printers",
      href: "#faq",
      icon: <HelpCircle className="w-4 h-4 text-[#2563EB]" />,
    },
    {
      title: gu ? "વોટ્સએપ હેલ્પડેસ્ક" : "WhatsApp Direct Helpdesk",
      desc: gu ? "સોમ-શનિ સવારે ૯ થી રાત્રે ૮ સુધી લાઈવ સપોર્ટ" : "Instant chat support with our technical team",
      href: "https://wa.me/917400199999",
      icon: <MessageSquare className="w-4 h-4 text-[#159B72]" />,
    },
    {
      title: gu ? "સુરક્ષા અને બેંક-ગ્રેડ એન્ક્રિપ્શન" : "Security & Privacy Standard",
      desc: gu ? "256-બીટ સુરક્ષા અને ઓટો ક્લાઉડ બેકઅપ" : "Bank-grade 256-bit encryption & audit logs",
      href: "#trust",
      icon: <ShieldCheck className="w-4 h-4 text-[#2563EB]" />,
    },
  ];

  return (
    <header
      ref={navRef}
      className={`sticky top-0 left-0 right-0 z-40 transition-all duration-200 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-xs border-b border-[#E5EAF1]"
          : "bg-white/80 backdrop-blur-xs border-b border-[#E5EAF1]/70"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-4">
        {/* Left: Brand Logo */}
        <div className="shrink-0 flex items-center">
          <BrandLogo size="md" showSubtitle subtitle="Paneliya Technology" href="/" />
        </div>

        {/* Center: Desktop Navigation with Dropdowns */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {/* 1. Product Dropdown */}
          <div className="relative">
            <button
              onClick={() => setActiveDropdown(activeDropdown === "product" ? null : "product")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeDropdown === "product"
                  ? "text-[#2563EB] bg-[#EFF6FF]"
                  : "text-[#172033] hover:text-[#2563EB] hover:bg-slate-50"
              }`}
            >
              <span>{gu ? "પ્રોડક્ટ" : "Product"}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  activeDropdown === "product" ? "rotate-180 text-[#2563EB]" : "text-[#667085]"
                }`}
              />
            </button>

            {activeDropdown === "product" && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl border border-[#E5EAF1] shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                {productItems.map((item, idx) => (
                  <Link
                    key={idx}
                    href={item.href}
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[#F7F9FC] transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE]/60 flex items-center justify-center shrink-0 mt-0.5">
                      {item.icon}
                    </div>
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

          {/* 2. Features Link */}
          <Link
            href="/features"
            className="px-3 py-2 rounded-lg text-xs font-medium text-[#172033] hover:text-[#2563EB] hover:bg-slate-50 transition-colors"
          >
            {gu ? "સુવિધાઓ (Features)" : "Features"}
          </Link>

          {/* 3. Solutions Dropdown */}
          <div className="relative">
            <button
              onClick={() => setActiveDropdown(activeDropdown === "solutions" ? null : "solutions")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeDropdown === "solutions"
                  ? "text-[#2563EB] bg-[#EFF6FF]"
                  : "text-[#172033] hover:text-[#2563EB] hover:bg-slate-50"
              }`}
            >
              <span>{gu ? "સોલ્યુશન્સ" : "Solutions"}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  activeDropdown === "solutions" ? "rotate-180 text-[#2563EB]" : "text-[#667085]"
                }`}
              />
            </button>

            {activeDropdown === "solutions" && (
              <div className="absolute top-full left-0 mt-2 w-84 bg-white rounded-xl border border-[#E5EAF1] shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                {solutionItems.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.href}
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[#F7F9FC] transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE]/60 flex items-center justify-center shrink-0 mt-0.5">
                      {item.icon}
                    </div>
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

          {/* 4. Pricing Link */}
          <a
            href="#pricing"
            className="px-3 py-2 rounded-lg text-xs font-medium text-[#172033] hover:text-[#2563EB] hover:bg-slate-50 transition-colors"
          >
            {gu ? "કિંમત (Pricing)" : "Pricing"}
          </a>

          {/* 5. Resources Dropdown */}
          <div className="relative">
            <button
              onClick={() => setActiveDropdown(activeDropdown === "resources" ? null : "resources")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeDropdown === "resources"
                  ? "text-[#2563EB] bg-[#EFF6FF]"
                  : "text-[#172033] hover:text-[#2563EB] hover:bg-slate-50"
              }`}
            >
              <span>{gu ? "રિસોર્સીસ" : "Resources"}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  activeDropdown === "resources" ? "rotate-180 text-[#2563EB]" : "text-[#667085]"
                }`}
              />
            </button>

            {activeDropdown === "resources" && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl border border-[#E5EAF1] shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                {resourceItems.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.href}
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[#F7F9FC] transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE]/60 flex items-center justify-center shrink-0 mt-0.5">
                      {item.icon}
                    </div>
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

        {/* Right Actions: Lang Switch, Login, Book Demo, Start Free */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Language Toggle */}
          {onToggleLang && (
            <button
              type="button"
              onClick={onToggleLang}
              className="px-2.5 py-1.5 rounded-lg border border-[#E5EAF1] bg-white hover:bg-slate-50 text-[11px] font-medium text-[#172033] transition-colors cursor-pointer shrink-0"
              title="Switch Language"
            >
              {gu ? "English" : "ગુજરાતી"}
            </button>
          )}

          {/* Login Button */}
          <Link
            href="/login"
            className="hidden sm:inline-flex px-3.5 py-2 text-xs font-semibold text-[#172033] hover:text-[#2563EB] hover:bg-slate-50 rounded-lg transition-colors"
          >
            {gu ? "સાઇન ઇન" : "Sign In"}
          </Link>

          {/* Book a Demo Button */}
          {onOpenDemo && (
            <button
              type="button"
              onClick={onOpenDemo}
              className="hidden md:inline-flex px-3.5 py-2 text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] hover:bg-blue-100/70 border border-[#BFDBFE] rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              {gu ? "ડેમો બુક કરો" : "Book a Demo"}
            </button>
          )}

          {/* Get Started Free CTA */}
          <Link
            href="/login?mode=signup"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-xl transition-all shadow-xs active:scale-98 shrink-0"
          >
            <span>{gu ? "મફત શરૂ કરો" : "Get Started Free"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          {/* Mobile menu hamburger toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-[#172033] hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-[#E5EAF1] px-5 py-4 shadow-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[calc(100vh-4.5rem)] overflow-y-auto">
          <div className="space-y-1 pb-3 border-b border-[#E5EAF1]">
            <Link
              href="/features"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-2 text-xs font-semibold text-[#172033] hover:text-[#2563EB]"
            >
              <span>{gu ? "બધી સુવિધાઓ (All Features)" : "All 28 Core Features"}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#667085]" />
            </Link>
            <a
              href="#solutions"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-2 text-xs font-semibold text-[#172033] hover:text-[#2563EB]"
            >
              <span>{gu ? "વેપાર માટે સોલ્યુશન્સ (Industry Solutions)" : "Industry Solutions"}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#667085]" />
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-2 text-xs font-semibold text-[#172033] hover:text-[#2563EB]"
            >
              <span>{gu ? "પ્લાન અને કિંમત (Pricing Plans)" : "Pricing Plans"}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#667085]" />
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-2 text-xs font-semibold text-[#172033] hover:text-[#2563EB]"
            >
              <span>{gu ? "પ્રશ્નોત્તરી (FAQ)" : "FAQ & Help"}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#667085]" />
            </a>
          </div>

          <div className="pt-1 flex flex-col gap-2">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 text-center text-xs font-semibold text-[#172033] border border-[#E5EAF1] hover:bg-slate-50 rounded-xl"
            >
              {gu ? "સાઇન ઇન કરો (Sign In)" : "Sign In to Account"}
            </Link>

            {onOpenDemo && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenDemo();
                }}
                className="w-full py-2.5 text-center text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl"
              >
                {gu ? "ડેમો બુક કરો (Book a Demo)" : "Book a Free 1-on-1 Demo"}
              </button>
            )}

            <Link
              href="/login?mode=signup"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 text-center text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl shadow-xs"
            >
              {gu ? "નવું એકાઉન્ટ બનાવો (Get Started Free)" : "Get Started Free (No Card Needed)"}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
