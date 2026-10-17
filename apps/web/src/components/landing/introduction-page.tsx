"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "../../context/auth-context";
import { WaveBackground } from "../ui/wave-background";

export function IntroductionPage() {
  const { lang, setLang } = useAuth();

  // Compact features dropdown and navigation state
  const [isFeaturesDropdownOpen, setIsFeaturesDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const featuresDropdownRef = useRef<HTMLDivElement>(null);
  const [activePreviewTab, setActivePreviewTab] = useState<"invoice" | "dashboard" | "scanner" | "ledger">("invoice");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [isScrolled, setIsScrolled] = useState(false);

  // Close dropdown on outside click, Escape key, or window scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsFeaturesDropdownOpen(false);
      setIsScrolled(window.scrollY > 20);
    };
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        featuresDropdownRef.current &&
        !featuresDropdownRef.current.contains(event.target as Node)
      ) {
        setIsFeaturesDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFeaturesDropdownOpen(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    // Enable normal document scrolling for marketing landing page
    const prevOverflow = document.body.style.overflow;
    const prevHeight = document.body.style.height;
    document.body.style.overflow = "auto";
    document.body.style.height = "auto";

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
      document.body.style.height = prevHeight;
    };
  }, []);

  // IntersectionObserver for true scroll-triggered element animations
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.querySelectorAll(".reveal-on-scroll, .reveal-from-left, .reveal-from-right, .reveal-scale-in").forEach((el) => {
        el.classList.add("revealed");
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            obs.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    const elements = document.querySelectorAll(
      ".reveal-on-scroll, .reveal-from-left, .reveal-from-right, .reveal-scale-in"
    );

    elements.forEach((el) => {
      // Elements already visible in initial viewport on page load should reveal immediately
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add("revealed");
      } else {
        observer.observe(el);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  // Re-synchronize revealed state whenever language changes without pre-revealing below-the-fold content
  useEffect(() => {
    if (typeof window === "undefined") return;
    const viewportHeight = window.innerHeight || 800;

    document.querySelectorAll<HTMLElement>(
      ".reveal-on-scroll, .reveal-from-left, .reveal-from-right, .reveal-scale-in"
    ).forEach((el) => {
      const rect = el.getBoundingClientRect();
      // Only keep elements revealed if they are already above or inside the current viewport
      if (rect.top <= viewportHeight) {
        el.classList.add("revealed");
      }
    });
  }, [lang]);



  const compactFeatureCategories = [
    {
      title: lang === "gu" ? "વેચાણ અને બિલિંગ" : "Sales & Billing",
      desc: lang === "gu" ? "જીએસટી ઇન્વોઇસિંગ, POS & ચલણ" : "Invoices, POS counter & challans",
      icon: "🧾",
      anchor: "#sales-billing",
      tag: lang === "gu" ? "POS & જીએસટી" : "POS & GST",
    },
    {
      title: lang === "gu" ? "ખરીદી વ્યવસ્થાપન" : "Purchases",
      desc: lang === "gu" ? "વેન્ડર બિલો & ડિજિટલ સ્કેનર" : "Vendor bills & digital scanner",
      icon: "📥",
      anchor: "#purchases-inventory",
      tag: lang === "gu" ? "બિલ & સ્કેનર" : "Bills & OCR",
    },
    {
      title: lang === "gu" ? "ઇન્વેન્ટરી અને સ્ટોક" : "Inventory & Stock",
      desc: lang === "gu" ? "લાઇવ સ્ટોક & ગોડાઉન ટ્રાન્સફર" : "Live stock ledger & godowns",
      icon: "📦",
      anchor: "#purchases-inventory",
      tag: lang === "gu" ? "ગોડાઉન" : "Godowns",
    },
    {
      title: lang === "gu" ? "નામા પદ્ધતિ (એકાઉન્ટિંગ)" : "Accounting",
      desc: lang === "gu" ? "ખાતાવહી, વાઉચર્સ & રોજમેળ" : "Party ledgers & double-entry",
      icon: "📚",
      anchor: "#accounting-ledgers",
      tag: lang === "gu" ? "નામા પદ્ધતિ" : "Nama",
    },
    {
      title: lang === "gu" ? "જીએસટી અને રિપોર્ટ્સ" : "GST & Reports",
      desc: lang === "gu" ? "GSTR-1, 3B & ૧૪+ રિપોર્ટ્સ" : "GSTR-1, 3B & 14+ registers",
      icon: "🇮🇳",
      anchor: "#gst-statutory",
      tag: lang === "gu" ? "GSTR-1/3B" : "GSTR-1/3B",
    },
    {
      title: lang === "gu" ? "વેપાર સંચાલન" : "Business Management",
      desc: lang === "gu" ? "પાર્ટી KYC, BOM & માસ્ટર્સ" : "Parties KYC, BOM & multi-user",
      icon: "🏢",
      anchor: "#business-types",
      tag: lang === "gu" ? "ઉત્પાદન & ERP" : "BOM & ERP",
    },
  ];

  const businessTypes = [
    {
      title: lang === "gu" ? "રિટેલ સ્ટોર્સ & સુપરમાર્કેટ" : "Retailers & Supermarkets",
      icon: "🛒",
      desc:
        lang === "gu"
          ? "ઝડપી કાઉન્ટર બિલિંગ (POS), બારકોડ સ્કેનિંગ, થર્મલ રસીદ પ્રિન્ટિંગ, અને દૈનિક રોકડ મેળવણી."
          : "Rapid counter checkout, barcode scanner support, 58mm/80mm thermal receipt printing, and daily cash reconciliation.",
      badge: lang === "gu" ? "ઝડપી બિલિંગ" : "Fast POS",
    },
    {
      title: lang === "gu" ? "હોલસેલ વેપારીઓ & ટ્રેડર્સ" : "Wholesalers & B2B Traders",
      icon: "🏢",
      desc:
        lang === "gu"
          ? "B2B જીએસટી ટેક્સ ઇન્વોઇસિંગ, ક્રેડિટ મર્યાદા ચેતવણી, પાર્ટી ખાતાવહી અને બિલ-બાય-બિલ પેમેન્ટ ટ્રેકિંગ."
          : "B2B GST tax invoices, credit limit enforcement, party ledger statements, and bill-by-bill payment settlements.",
      badge: lang === "gu" ? "ક્રેડિટ કંટ્રોલ" : "Credit Control",
    },
    {
      title: lang === "gu" ? "ડિસ્ટ્રિબ્યુટર્સ & સ્ટોકિસ્ટ" : "Distributors & Stockists",
      icon: "🚚",
      desc:
        lang === "gu"
          ? "મલ્ટી ગોડાઉન સ્ટોક ટ્રાન્સફર, ડિલિવરી ચલણ, બેચ નંબર અને એક્સપાયરી ટ્રેકિંગ, અને ઈ-વે બિલ પેલોડ."
          : "Inter-godown stock movements, delivery challans, batch numbers with expiry tracking, and e-Way bill JSON generation.",
      badge: lang === "gu" ? "ગોડાઉન સ્ટોક" : "Multi-Godown",
    },
    {
      title: lang === "gu" ? "લઘુ ઉદ્યોગ & ઉત્પાદકો" : "Small Manufacturers",
      icon: "⚙️",
      desc:
        lang === "gu"
          ? "બિલ ઓફ મટિરીયલ્સ (BOM), પ્રોડક્શન વર્ક ઓર્ડર, કાચા માલનો વપરાશ અને તૈયાર માલનું ઇન્વેન્ટરી ઉમેરણ."
          : "Bill of Materials (BOM) recipes, production work orders, raw material consumption, and finished goods inventory updates.",
      badge: lang === "gu" ? "પ્રોડક્શન ERP" : "BOM & Orders",
    },
    {
      title: lang === "gu" ? "સર્વિસ પ્રોવાઇડર્સ & એજન્સીઓ" : "Service Providers",
      icon: "💼",
      desc:
        lang === "gu"
          ? "SAC કોડ આધારિત સર્વિસ ઇન્વોઇસિંગ, ખર્ચાઓની ચોક્કસ નોંધણી, જીએસટી રિટર્ન ડેટા અને ચોખ્ખો નફો ટ્રેકિંગ."
          : "SAC-coded service invoicing, precise expense tracking, statutory GST return preparation, and net margin analytics.",
      badge: lang === "gu" ? "SAC સર્વિસ બિલ" : "SAC Ready",
    },
  ];

  const faqs = [
    {
      q:
        lang === "gu"
          ? "શું MyBill History અંગ્રેજી અને ગુજરાતી બંને ભાષાને સંપૂર્ણ સપોર્ટ કરે છે?"
          : "Does MyBill History provide complete bilingual English and Gujarati support?",
      a:
        lang === "gu"
          ? "હા! સમગ્ર સોફ્ટવેર (ડેશબોર્ડ, ઇન્વોઇસિંગ, રિપોર્ટ્સ, ખાતાવહી અને સેટિંગ્સ) અંગ્રેજી અને ગુજરાતી (Noto Sans Gujarati ફોન્ટ સાથે) બંનેમાં ઉપલબ્ધ છે. તમે ૧-ક્લિકમાં ભાષા બદલી શકો છો."
          : "Yes! The entire application—including navigation, invoice creation, reports, ledger registers, and settings—is natively available in English and Gujarati (rendered with crisp Noto Sans Gujarati typography). You can switch between languages instantly with a single click.",
    },
    {
      q:
        lang === "gu"
          ? "ખરીદી (Purchase) બિલ સ્કેનર કેવી રીતે કામ કરે છે?"
          : "How does the Purchase Bill Scanner work?",
      a:
        lang === "gu"
          ? "તમે સપ્લાયરના કાગળના બિલનો ફોટો પાડો અથવા PDF અપલોડ કરો. સ્માર્ટ સ્કેનર ઓટોમેટિકલી સપ્લાયરનું નામ, GSTIN, બિલ નંબર, તારીખ, દરેક આઇટમ, HSN કોડ, ભાવ અને જીએસટી દરો વાંચીને ખરીદી એન્ટ્રી ફોર્મમાં ભરી દે છે."
          : "Simply snap a photo of a vendor's paper bill or upload a PDF. The smart scanner extracts the vendor name, GSTIN, invoice number, invoice date, line items, HSN codes, unit rates, and GST taxes, automatically populating the purchase bill entry form.",
    },
    {
      q:
        lang === "gu"
          ? "શું સોફ્ટવેર પાકી નામા પદ્ધતિ (Double-Entry Accounting) જાળવે છે?"
          : "Does the software support true double-entry accounting (દેશી નામા પદ્ધતિ)?",
      a:
        lang === "gu"
          ? "હા! સોફ્ટવેરમાં ચાર્ટ ઓફ એકાઉન્ટ્સ, રોજમેળ (Daybook), રોકડ અને બેંક લેજર્સ, આવક (Receipt), જાવક (Payment), કોન્ટ્રા (Contra) અને જર્નલ (Journal) વાઉચર્સ જોડાયેલા છે. વેચાણ કે ખરીદીનું બિલ બનતા જ ખાતાવહી આપમેળે અપડેટ થાય છે."
          : "Yes! The software maintains a complete double-entry Chart of Accounts, Daybook (રોજમેળ), Cash Book, Bank Ledgers, and Receipt, Payment, Contra, and Journal vouchers. Ledger balances automatically post in real time upon creating sales or purchase bills.",
    },
    {
      q:
        lang === "gu"
          ? "શું હું A4 અને થર્મલ રસીદ બંને પ્રિન્ટ કરી શકું છું?"
          : "Can I print both standard A4 GST invoices and POS thermal receipts?",
      a:
        lang === "gu"
          ? "હા! MyBill History માં ઓફિશિયલ A4 જીએસટી ઇન્વોઇસ (૪ કસ્ટમ રંગ થીમ્સ સાથે) તેમજ રિટેલ કાઉન્ટર માટે 58mm / 80mm થર્મલ રસીદ પ્રિન્ટિંગ મોડ ઉપલબ્ધ છે."
          : "Yes! MyBill History supports official A4 GST Tax Invoices (with 4 elegant theme color variations) as well as 58mm/80mm POS thermal receipts for fast retail counters.",
    },
    {
      q:
        lang === "gu"
          ? "મલ્ટી-ગોડાઉન સ્ટોક ટ્રાન્સફર અને બેચ ટ્રેકિંગ કેવી રીતે કાર્ય કરે છે?"
          : "How do multi-godown stock transfers and batch tracking function?",
      a:
        lang === "gu"
          ? "તમે તમારી દુકાન અને મુખ્ય ગોડાઉન વચ્ચે માલની રવાનગી (Dispatch) અને પહોંચ (Receipt) ટ્રેક કરી શકો છો. દરેક આઇટમમાં બેચ નંબર અને એક્સપાયરી ડેટ સેટ કરી શકાય છે, જેનાથી જૂનો સ્ટોક અગાઉ વેચાય."
          : "You can transfer inventory between retail counters and storage warehouses with dual-phase dispatch and receipt verification. Items can also be tracked by batch numbers and expiry dates for accurate FIFO fulfillment.",
    },
    {
      q:
        lang === "gu"
          ? "શું GSTR-1 અને GSTR-3B રિપોર્ટ્સ જીએસટી પોર્ટલ માન્ય છે?"
          : "Are GSTR-1 and GSTR-3B summaries structured for official Indian GST compliance?",
      a:
        lang === "gu"
          ? "હા! GSTR-1 સેક્શન 4A (B2B), 5 (B2CL), 7 (B2CS) અને 12 (HSN સમરી) મુજબ તૈયાર થાય છે, અને GSTR-3B આઉટપુટ ટેક્સ સામે પાત્ર ITC ની સ્પષ્ટ ગણતરી આપે છે. તમે તેને એક્સેલ/CSV માં ડાઉનલોડ કરીને CA ને મોકલી શકો છો."
          : "Yes! GSTR-1 is categorized into Sections 4A (B2B), 5 (B2CL), 7 (B2CS), and Section 12 (HSN Summary), while GSTR-3B accurately calculates output liability offset against eligible input tax credits (ITC). Summaries export to CSV/Excel for immediate CA filing.",
    },
    {
      q:
        lang === "gu"
          ? "શું હું એક જ એકાઉન્ટમાં બહુવિધ કંપનીઓ અને શાખાઓ ચલાવી શકું છું?"
          : "Can I manage multiple companies and branch locations under one account?",
      a:
        lang === "gu"
          ? "હા! MyBill History માં મલ્ટી-કંપની અને મલ્ટી-બ્રાન્ચ આર્કિટેક્ચર છે. તમે ટોપબારમાંથી ૧ સેકન્ડમાં કંપની કે બ્રાન્ચ સ્વિચ કરી શકો છો, અને કર્મચારીઓ માટે કેશિયર, એકાઉન્ટન્ટ અથવા મેનેજરની પરમિશન્સ આપી શકો છો."
          : "Yes! The platform includes native multi-company and multi-branch support. Switch between legal entities or branches seamlessly from the topbar, and configure granular roles for cashiers, accountants, and branch managers.",
    },
    {
      q:
        lang === "gu"
          ? "મારો ડેટા કેટલો સુરક્ષિત છે?"
          : "How is my business financial data secured and isolated?",
      a:
        lang === "gu"
          ? "તમારો ડેટા ટેનન્ટ-આઇસોલેશન સાથે PostgreSQL ડેટાબેઝમાં સુરક્ષિત રહે છે. બેકઅપ આપમેળે લેવાય છે અને બિન-અધિકૃત વ્યક્તિ તમારા વ્યાપારની વિગતો જોઈ શકતી નથી."
          : "Your data is strictly isolated using database-level multi-tenant boundaries and encrypted with industry-standard protocols. Automatic backups ensure your transaction ledger and records remain permanently protected.",
    },
  ];

  return (
    <div
      lang={lang}
      className={`min-h-screen w-full bg-[#F7F8FA] text-[#202124] relative overflow-x-hidden selection:bg-[#FFF3E8] selection:text-[#F47721] ${
        lang === "gu" ? "font-gujarati" : "font-sans"
      }`}
    >
      {/* Background Ambience */}
      <WaveBackground variant="dashboard" />

      {/* ================= 1. STICKY MAIN HEADER & MEGA-MENU ================= */}
      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          isScrolled
            ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-[#E5E7EB]"
            : "bg-white/85 backdrop-blur-md border-b border-[#E5E7EB]/70"
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-5 xl:px-8 h-16 sm:h-20 flex items-center justify-between gap-2 lg:gap-3 xl:gap-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 shrink-0 group min-w-0 whitespace-nowrap">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-[#F47721] to-[#FF9343] flex items-center justify-center text-white font-extrabold text-lg sm:text-xl shadow-saffron group-hover:scale-105 transition-transform shrink-0">
              ₹
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-sm xs:text-base sm:text-xl text-[#202124] tracking-tight leading-tight whitespace-nowrap">
                MyBill <span className="text-[#F47721]">History</span>
              </span>
              <span className="text-[9px] sm:text-[10px] text-[#667085] tracking-wider uppercase font-semibold hidden xs:inline truncate">
                Paneliya Technology
              </span>
            </div>
          </Link>

          {/* Navigation Links with Features Dropdown (Desktop) */}
          <nav className="hidden lg:flex items-center gap-2.5 xl:gap-4 2xl:gap-6 text-xs font-semibold text-[#475467] shrink-0">
            {/* Compact Features Dropdown Trigger */}
            <div ref={featuresDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setIsFeaturesDropdownOpen(!isFeaturesDropdownOpen)}
                className={`group/btn flex items-center gap-1.5 py-1.5 px-2.5 xl:px-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F47721] whitespace-nowrap ${
                  isFeaturesDropdownOpen
                    ? "text-[#F47721] bg-[#FFF3E8] shadow-2xs border border-[#FED7AA]"
                    : "text-[#475467] hover:text-[#F47721] hover:bg-[#FFF8F3] border border-transparent"
                }`}
                aria-expanded={isFeaturesDropdownOpen}
                aria-haspopup="true"
              >
                <span className="whitespace-nowrap">{lang === "gu" ? "તમામ સુવિધાઓ" : "Features"}</span>
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-250 ease-out shrink-0 ${
                    isFeaturesDropdownOpen ? "rotate-180 text-[#F47721]" : "text-[#98A2B3] group-hover/btn:text-[#F47721]"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Smooth Features Dropdown Card */}
              <div
                aria-hidden={!isFeaturesDropdownOpen}
                className={`features-dropdown-panel absolute left-0 top-full mt-2.5 w-[350px] sm:w-[370px] rounded-2xl z-50 overflow-hidden border border-[#E5E7EB] ${
                  isFeaturesDropdownOpen ? "open" : "closed"
                }`}
              >
                {/* Header Row Inside Dropdown */}
                <div className="px-3.5 pt-3 pb-1.5 flex items-center justify-between text-[10px] font-bold tracking-wider uppercase text-[#98A2B3] border-b border-[#F2F4F7]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F47721] animate-pulse" />
                    {lang === "gu" ? "ઝડપી સુવિધાઓ" : "Core Modules"}
                  </span>
                  <span className="text-[#F47721] font-semibold text-[10px] font-mono">{lang === "gu" ? "૬ મોડ્યુલ્સ" : "6 Categories"}</span>
                </div>

                {/* Items List */}
                <div className="p-2 space-y-1">
                  {compactFeatureCategories.map((cat, idx) => (
                    <a
                      key={idx}
                      href={cat.anchor}
                      onClick={() => setIsFeaturesDropdownOpen(false)}
                      className="dropdown-item-smooth flex items-center gap-3 p-2 rounded-xl group relative overflow-hidden border border-transparent"
                    >
                      <div className="item-icon-box w-9 h-9 rounded-xl bg-[#FFF3E8] border border-[#FED7AA]/70 flex items-center justify-center text-sm shrink-0 transition-all duration-200">
                        {cat.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="item-title text-xs font-bold text-[#18263B] transition-colors leading-tight">
                            {cat.title}
                          </p>
                          {cat.tag && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-[#F2F4F7] text-[#667085] group-hover:bg-[#FFF3E8] group-hover:text-[#C2410C] transition-colors">
                              {cat.tag}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#667085] leading-tight truncate mt-0.5 group-hover:text-[#475467] transition-colors">
                          {cat.desc}
                        </p>
                      </div>
                      <svg
                        className="item-arrow w-3.5 h-3.5 text-[#D0D5DD] transition-all duration-200 shrink-0 opacity-60"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  ))}
                </div>

                {/* Bottom View All Features Action */}
                <div className="p-2 border-t border-[#FED7AA]/40 bg-gradient-to-r from-[#FFF6EE] via-[#FFFBF6] to-[#FFF6EE]">
                  <Link
                    href="/features"
                    onClick={() => setIsFeaturesDropdownOpen(false)}
                    className="flex items-center justify-between px-3 py-2 text-xs font-extrabold text-[#F47721] hover:text-[#D95F12] rounded-xl hover:bg-white hover:shadow-xs border border-transparent hover:border-[#FED7AA]/60 transition-all duration-200 group/all"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="text-sm">✨</span>
                      <span>{lang === "gu" ? "તમામ ૨૮+ સુવિધાઓ વિગતવાર જુઓ" : "View All 28+ Features"}</span>
                    </span>
                    <span className="w-5 h-5 rounded-lg bg-[#F47721] text-white flex items-center justify-center text-xs group-hover/all:translate-x-1 group-hover/all:bg-[#D95F12] transition-all duration-200 shadow-2xs font-mono">
                      →
                    </span>
                  </Link>
                </div>
              </div>
            </div>

            <a href="#sales-billing" className="hover:text-[#F47721] transition-colors whitespace-nowrap py-1">
              {lang === "gu" ? "જીએસટી બિલિંગ" : "Invoicing"}
            </a>
            <a href="#purchases-inventory" className="hover:text-[#F47721] transition-colors whitespace-nowrap py-1">
              {lang === "gu" ? "બિલ સ્કેનર" : "Bill Scanner"}
            </a>
            <a href="#accounting-ledgers" className="hover:text-[#F47721] transition-colors whitespace-nowrap py-1">
              {lang === "gu" ? "નામા પદ્ધતિ" : "Accounting"}
            </a>
            <a href="#gst-statutory" className="hover:text-[#F47721] transition-colors whitespace-nowrap py-1">
              {lang === "gu" ? "જીએસટી સેન્ટર" : "GST Center"}
            </a>
            <a href="#business-types" className="hover:text-[#F47721] transition-colors whitespace-nowrap py-1">
              {lang === "gu" ? "વેપારી ઉકેલો" : "Solutions"}
            </a>
            <a href="#faq" className="hover:text-[#F47721] transition-colors whitespace-nowrap py-1">
              {lang === "gu" ? "પ્રશ્નોત્તરી" : "FAQ"}
            </a>
          </nav>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Bilingual Switcher (EN | ગુજ) */}
            <div className="flex items-center bg-[#F3F4F6] p-0.5 rounded-xl border border-[#E5E7EB] shrink-0 whitespace-nowrap">
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-bold rounded-lg transition-all min-h-[32px] whitespace-nowrap ${
                  lang === "en" ? "bg-white text-[#F47721] shadow-xs" : "text-[#667085] hover:text-[#202124]"
                }`}
                aria-label="Switch to English"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang("gu")}
                className={`px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-bold rounded-lg transition-all font-gujarati min-h-[32px] whitespace-nowrap ${
                  lang === "gu" ? "bg-white text-[#F47721] shadow-xs" : "text-[#667085] hover:text-[#202124]"
                }`}
                aria-label="Switch to Gujarati"
              >
                <span className="hidden sm:inline whitespace-nowrap">ગુજરાતી</span>
                <span className="sm:hidden whitespace-nowrap">ગુજ</span>
              </button>
            </div>

            {/* Login Button (Hidden on < sm: because mobile drawer prominently presents it) */}
            <Link
              href="/login"
              className="hidden sm:inline-flex px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-bold text-[#475467] hover:text-[#F47721] hover:bg-[#FFF3E8] rounded-xl transition-all border border-transparent hover:border-[#FED7AA] active:scale-95 min-h-[40px] items-center whitespace-nowrap shrink-0"
            >
              {lang === "gu" ? "લોગિન" : "Sign In"}
            </Link>

            {/* Create Account / Sign Up Button */}
            <Link
              href="/login?mode=signup"
              className="hidden md:inline-flex px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-bold text-[#F47721] bg-white border border-[#FED7AA] hover:bg-[#FFF3E8] hover:border-[#F47721] rounded-xl transition-all shadow-xs hover:shadow-sm active:scale-95 min-h-[40px] items-center whitespace-nowrap shrink-0"
            >
              {lang === "gu" ? "સાઇન અપ" : "Sign Up"}
            </Link>

            {/* Get Started Button (Hidden on mobile < sm: screens, visible from sm: up) */}
            <Link
              href="/login?mode=signup"
              className="hidden sm:inline-flex px-3 sm:px-4 py-2 sm:py-2.5 bg-[#F47721] hover:bg-[#D95F12] text-white text-xs sm:text-sm font-bold rounded-xl btn-primary-glow items-center gap-1.5 whitespace-nowrap group cursor-pointer min-h-[40px] shrink-0"
            >
              <span className="whitespace-nowrap">{lang === "gu" ? "શરૂ કરો" : "Get Started"}</span>
              <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-[#667085] hover:text-[#202124] rounded-lg border border-[#E5E7EB] min-h-[38px] min-w-[38px] flex items-center justify-center shrink-0 cursor-pointer"
              aria-label="Toggle Navigation Menu"
              aria-expanded={isMobileMenuOpen}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-[#E5E7EB] bg-white p-4 space-y-4 max-h-[85vh] overflow-y-auto animate-fadeIn shadow-xl">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-[#667085] uppercase tracking-wider px-2">
                {lang === "gu" ? "મુખ્ય વિભાગો" : "Navigation"}
              </p>
              <Link
                href="/features"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-xs font-bold bg-[#FFF3E8] text-[#F47721] min-h-[40px] flex items-center justify-between border border-[#FED7AA]/60"
              >
                <span>✨ {lang === "gu" ? "તમામ ૨૮+ સુવિધાઓ (Features)" : "View All 28+ Features"}</span>
                <span>→</span>
              </Link>
              <a
                href="#sales-billing"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-xs font-semibold text-[#202124] hover:bg-[#FFF3E8] hover:text-[#F47721] min-h-[40px] flex items-center"
              >
                🧾 {lang === "gu" ? "વેચાણ અને જીએસટી બિલિંગ" : "Sales & Invoicing"}
              </a>
              <a
                href="#purchases-inventory"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-xs font-semibold text-[#202124] hover:bg-[#FFF3E8] hover:text-[#F47721] min-h-[40px] flex items-center"
              >
                📥 {lang === "gu" ? "ખરીદી અને બિલ સ્કેનર & સ્ટોક" : "Purchases & Bill Scanner"}
              </a>
              <a
                href="#accounting-ledgers"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-xs font-semibold text-[#202124] hover:bg-[#FFF3E8] hover:text-[#F47721] min-h-[40px] flex items-center"
              >
                📚 {lang === "gu" ? "નામા પદ્ધતિ & વાઉચર્સ" : "Accounting & Ledgers"}
              </a>
              <a
                href="#gst-statutory"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-xs font-semibold text-[#202124] hover:bg-[#FFF3E8] hover:text-[#F47721] min-h-[40px] flex items-center"
              >
                🇮🇳 {lang === "gu" ? "GSTR-1, 3B & ઈ-વે બિલ" : "GST Center & Compliance"}
              </a>
              <a
                href="#reports-analytics"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-xs font-semibold text-[#202124] hover:bg-[#FFF3E8] hover:text-[#F47721] min-h-[40px] flex items-center"
              >
                📊 {lang === "gu" ? "૧૪+ અધિકૃત રિપોર્ટ્સ" : "Business Reports"}
              </a>
              <a
                href="#business-types"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-xs font-semibold text-[#202124] hover:bg-[#FFF3E8] hover:text-[#F47721] min-h-[40px] flex items-center"
              >
                🏢 {lang === "gu" ? "વેપારી ઉકેલો (Solutions)" : "Business Solutions"}
              </a>
              <a
                href="#faq"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-xs font-semibold text-[#202124] hover:bg-[#FFF3E8] hover:text-[#F47721] min-h-[40px] flex items-center"
              >
                ❓ {lang === "gu" ? "પ્રશ્નોત્તરી (FAQ)" : "FAQ"}
              </a>
            </div>

            {/* Mobile Drawer Language Switcher */}
            <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between">
              <span className="text-xs font-semibold text-[#667085]">
                {lang === "gu" ? "ભાષા પસંદ કરો (Language)" : "Language"}
              </span>
              <div className="flex items-center bg-[#F3F4F6] p-1 rounded-xl border border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setLang("en")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    lang === "en" ? "bg-white text-[#F47721] shadow-xs" : "text-[#667085] hover:text-[#202124]"
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLang("gu")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all font-gujarati ${
                    lang === "gu" ? "bg-white text-[#F47721] shadow-xs" : "text-[#667085] hover:text-[#202124]"
                  }`}
                >
                  ગુજરાતી
                </button>
              </div>
            </div>

            <div className="pt-1 border-t border-[#E5E7EB] flex flex-col gap-2.5">
              <Link
                href="/login?mode=signup"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-3 text-center bg-[#F47721] text-white font-bold text-xs sm:text-sm rounded-xl shadow-saffron min-h-[44px] flex items-center justify-center cursor-pointer active:scale-98"
              >
                {lang === "gu" ? "મફત એકાઉન્ટ બનાવો (Sign Up)" : "Create Free Account"}
              </Link>
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-3 text-center bg-[#F8F9FB] border border-[#E5E7EB] text-[#202124] font-bold text-xs sm:text-sm rounded-xl min-h-[44px] flex items-center justify-center cursor-pointer active:scale-98"
              >
                {lang === "gu" ? "લોગિન કરો (Sign In)" : "Sign In to Workspace"}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ================= 3. HERO SECTION ================= */}
      <section className="relative pt-8 sm:pt-16 pb-12 sm:pb-20 px-3.5 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        {/* Subtle Warm Ambient Glow */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] xs:w-[340px] sm:w-[620px] h-[200px] sm:h-[360px] bg-gradient-to-tr from-[#F47721]/[0.08] via-[#FB923C]/[0.04] to-transparent rounded-full blur-3xl pointer-events-none animate-pulse-glow max-w-full"
          aria-hidden="true"
        />

        <div className="relative z-10 text-center max-w-3xl mx-auto space-y-4 sm:space-y-6">
          {/* Main Headline */}
          <h1
            data-hero="true"
            className={`hero-content text-2xl xs:text-3xl sm:text-5xl lg:text-6xl text-[#18263B] break-words ${
              lang === "gu"
                ? "font-extrabold tracking-normal leading-[1.3] font-gujarati"
                : "font-black tracking-tight leading-[1.15]"
            }`}
          >
            {lang === "gu" ? (
              <>
                વેપારનું સરળ બિલિંગ અને{" "}
                <span className="bg-gradient-to-r from-[#F47721] to-[#E05D06] bg-clip-text text-transparent inline-block pb-1">
                  જીએસટી એકાઉન્ટિંગ
                </span>
              </>
            ) : (
              <>
                Fast, Smart Billing &{" "}
                <span className="bg-gradient-to-r from-[#F47721] to-[#E05D06] bg-clip-text text-transparent inline-block pb-1">
                  GST Accounting
                </span>{" "}
                Simplified
              </>
            )}
          </h1>

          {/* Subtitle */}
          <p
            data-hero="true"
            className={`hero-content text-xs sm:text-base lg:text-lg text-[#667085] leading-relaxed max-w-2xl mx-auto font-normal break-words ${
              lang === "gu" ? "font-gujarati tracking-normal" : ""
            }`}
          >
            {lang === "gu"
              ? "૧૦ સેકન્ડમાં કાયદેસર જીએસટી બિલ બનાવો, ખરીદીના બિલ સરળતાથી નોંધો, મલ્ટી-ગોડાઉન સ્ટોક સંભાળો અને પાકી નામા પદ્ધતિ સાથે વ્યાપાર ચલાવો."
              : "Generate statutory GST invoices in under 10 seconds, quickly record vendor purchase bills, manage multi-godown inventory, and keep authoritative double-entry books."}
          </p>

          {/* Primary Action Buttons */}
          <div data-hero="true" className="hero-content pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 max-w-md sm:max-w-lg mx-auto w-full px-2 sm:px-0">
            <Link
              href="/login?mode=signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3.5 bg-[#F47721] hover:bg-[#D95F12] text-white text-sm sm:text-base font-bold rounded-2xl btn-primary-glow group cursor-pointer min-h-[46px] text-center"
            >
              <span>{lang === "gu" ? "હમણાં મફત શરૂ કરો" : "Get Started Free"}</span>
              <svg
                className="w-4 h-4 shrink-0 group-hover:translate-x-1.5 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>

            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 bg-white text-[#F47721] border-2 border-[#FED7AA] hover:border-[#F47721] text-sm sm:text-base font-bold rounded-2xl btn-secondary-interactive cursor-pointer min-h-[46px] text-center"
            >
              <span>{lang === "gu" ? "પ્રવેશ કરો (Sign In)" : "Sign In to Workspace"}</span>
            </Link>
          </div>

          {/* Value Props Strip */}
          <div data-hero="true" className="hero-content pt-6 grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 max-w-4xl mx-auto text-left w-full">
            <div className="saas-card-interactive bg-white p-3 sm:p-3.5 rounded-xl border border-[#E5E7EB] shadow-2xs flex items-center gap-2.5 sm:gap-3 group">
              <span className="text-xl group-hover:scale-110 transition-transform duration-200 shrink-0">⚡</span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#18263B] truncate">
                  {lang === "gu" ? "૧૦ સેકન્ડ બિલિંગ" : "10-Sec Fast Invoicing"}
                </p>
                <p className="text-[10px] text-[#667085] truncate">
                  {lang === "gu" ? "F2 શૉર્ટકટ & બારકોડ" : "F2 Shortcut & Barcode"}
                </p>
              </div>
            </div>

            <div className="saas-card-interactive bg-white p-3 sm:p-3.5 rounded-xl border border-[#E5E7EB] shadow-2xs flex items-center gap-2.5 sm:gap-3 group">
              <span className="text-xl group-hover:scale-110 transition-transform duration-200 shrink-0">📥</span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#18263B] truncate">
                  {lang === "gu" ? "ડિજિટલ બિલ સ્કેનર" : "Digital Bill Scanner"}
                </p>
                <p className="text-[10px] text-[#667085] truncate">
                  {lang === "gu" ? "ઓટો પર્ચેઝ એન્ટ્રી" : "Auto Purchase Extraction"}
                </p>
              </div>
            </div>

            <div className="saas-card-interactive bg-white p-3 sm:p-3.5 rounded-xl border border-[#E5E7EB] shadow-2xs flex items-center gap-2.5 sm:gap-3 group">
              <span className="text-xl group-hover:scale-110 transition-transform duration-200 shrink-0">🇮🇳</span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#18263B] truncate">
                  {lang === "gu" ? "૧૦૦% જીએસટી કાયદેસર" : "Statutory GST Ready"}
                </p>
                <p className="text-[10px] text-[#667085] truncate">
                  {lang === "gu" ? "GSTR-1, 3B, 2B રીકન્સાઇલ" : "GSTR-1, 3B & 2B Match"}
                </p>
              </div>
            </div>

            <div className="saas-card-interactive bg-white p-3 sm:p-3.5 rounded-xl border border-[#E5E7EB] shadow-2xs flex items-center gap-2.5 sm:gap-3 group">
              <span className="text-xl group-hover:scale-110 transition-transform duration-200 shrink-0">📦</span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#18263B] truncate">
                  {lang === "gu" ? "મલ્ટી ગોડાઉન સ્ટોક" : "Multi-Godown Stock"}
                </p>
                <p className="text-[10px] text-[#667085] truncate">
                  {lang === "gu" ? "બેચ & એક્સપાયરી ટ્રેક" : "Batch & Expiry Track"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ================= 4. INTERACTIVE APPLICATION SHOWCASE ================= */}
        <div id="preview" className="reveal-scale-in reveal-delay-2 mt-10 sm:mt-16 relative max-w-5xl mx-auto scroll-mt-20 sm:scroll-mt-24 w-full">
          {/* Showcase Tabs */}
          <div className="flex items-center justify-start sm:justify-center gap-2 mb-4 overflow-x-auto pb-2 -mx-3.5 px-3.5 sm:mx-0 sm:px-0 max-w-full scrollbar-none">
            <button
              type="button"
              onClick={() => setActivePreviewTab("invoice")}
              className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 cursor-pointer active:scale-95 min-h-[40px] whitespace-nowrap ${
                activePreviewTab === "invoice"
                  ? "bg-[#F47721] text-white shadow-saffron btn-primary-glow"
                  : "bg-white text-[#667085] hover:text-[#202124] hover:bg-[#FFF8F3] hover:border-[#FED7AA] border border-[#E5E7EB]"
              }`}
            >
              🧾 {lang === "gu" ? "જીએસટી ટેક્સ ઇન્વોઇસ મોડલ" : "GST Tax Invoice View"}
            </button>
            <button
              type="button"
              onClick={() => setActivePreviewTab("dashboard")}
              className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 cursor-pointer active:scale-95 min-h-[40px] whitespace-nowrap ${
                activePreviewTab === "dashboard"
                  ? "bg-[#F47721] text-white shadow-saffron btn-primary-glow"
                  : "bg-white text-[#667085] hover:text-[#202124] hover:bg-[#FFF8F3] hover:border-[#FED7AA] border border-[#E5E7EB]"
              }`}
            >
              📊 {lang === "gu" ? "નાણાકીય ડેશબોર્ડ & સિલક" : "Live Executive Dashboard"}
            </button>
            <button
              type="button"
              onClick={() => setActivePreviewTab("scanner")}
              className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 cursor-pointer active:scale-95 min-h-[40px] whitespace-nowrap ${
                activePreviewTab === "scanner"
                  ? "bg-[#F47721] text-white shadow-saffron btn-primary-glow"
                  : "bg-white text-[#667085] hover:text-[#202124] hover:bg-[#FFF8F3] hover:border-[#FED7AA] border border-[#E5E7EB]"
              }`}
            >
              📥 {lang === "gu" ? "ડિજિટલ બિલ સ્કેનર" : "Digital Bill Scanner"}
            </button>
            <button
              type="button"
              onClick={() => setActivePreviewTab("ledger")}
              className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 cursor-pointer active:scale-95 min-h-[40px] whitespace-nowrap ${
                activePreviewTab === "ledger"
                  ? "bg-[#F47721] text-white shadow-saffron btn-primary-glow"
                  : "bg-white text-[#667085] hover:text-[#202124] hover:bg-[#FFF8F3] hover:border-[#FED7AA] border border-[#E5E7EB]"
              }`}
            >
              📚 {lang === "gu" ? "પાકી ખાતાવહી & રોજમેળ" : "Double-Entry Ledgers"}
            </button>
          </div>

          {/* Interactive Card Container */}
          <div className="relative bg-white rounded-2xl sm:rounded-3xl border border-[#E5E7EB] shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-[#FED7AA]/80 w-full">
            {/* Mock Window Top Bar */}
            <div className="bg-[#FAFBFD] px-3 sm:px-4 py-2.5 sm:py-3 border-b border-[#E5E7EB] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-rose-400" />
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-400" />
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-400" />
                <span className="ml-1 sm:ml-2 text-xs font-bold text-[#667085] hidden md:inline">
                  MyBill History ERP — {
                    activePreviewTab === "invoice"
                      ? (lang === "gu" ? "જીએસટી ઇન્વોઇસ એન્જિન" : "Invoice Engine")
                      : activePreviewTab === "dashboard"
                      ? (lang === "gu" ? "નાણાકીય ડેશબોર્ડ" : "Financial Dashboard")
                      : activePreviewTab === "scanner"
                      ? (lang === "gu" ? "સ્માર્ટ બિલ સ્કેનર" : "Smart Bill OCR")
                      : (lang === "gu" ? "ખાતાવહી અને હિસાબ" : "Chart of Accounts")
                  }
                </span>
              </div>

              {activePreviewTab === "invoice" && (
                <div className="flex items-center gap-1.5 bg-[#FFF3E8] px-2.5 py-1 rounded-lg border border-[#FED7AA] text-xs shrink-0">
                  <span className="w-2 h-2 rounded-full bg-[#F47721] animate-pulse" />
                  <span className="text-[10px] sm:text-xs font-bold text-[#C2410C]">
                    {lang === "gu" ? "જીએસટી ટેક્સ ઇન્વોઇસ" : "GST Tax Invoice"}
                  </span>
                </div>
              )}
            </div>

            {/* TAB 1: INVOICE ENGINE PREVIEW */}
            {activePreviewTab === "invoice" && (
              <div className="p-3.5 sm:p-7 space-y-4 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#F3F4F6]">
                  <div>
                    <span className="text-[10px] sm:text-xs font-bold text-[#F47721] uppercase tracking-wider block">
                      {lang === "gu"
                        ? "જીએસટી ટેક્સ ઇન્વોઇસ • #INV-2026-0089 • મૂળ નકલ (ગ્રાહક માટે)"
                        : "Tax Invoice • #INV-2026-0089 • Original for Recipient"}
                    </span>
                    <h3 className="text-sm sm:text-lg font-bold text-[#202124] mt-0.5">
                      {lang === "gu" ? "શ્રીજી એન્ટરપ્રાઇઝ (સુરત, ગુજરાત)" : "Shreeji Enterprise (Surat, Gujarat)"}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-[#667085]">
                      {lang === "gu"
                        ? "GSTIN: 24AAACP1234M1Z5 • રાજ્યની અંદર વેચાણ (CGST 9% + SGST 9%)"
                        : "GSTIN: 24AAACP1234M1Z5 • Intra-State Supply (CGST 9% + SGST 9%)"}
                    </p>
                  </div>

                  <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-[#FED7AA] bg-[#FFF3E8] text-[#C2410C] text-xs font-bold flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <span className="w-2 h-2 rounded-full bg-[#F47721]" />
                    <span>{lang === "gu" ? "મૂળ નકલ (Original)" : "Original for Recipient"}</span>
                  </div>
                </div>

                {/* Contained Horizontal Scroll Region for Table */}
                <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
                  <table className="w-full min-w-[500px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E5E7EB] text-[#667085] font-semibold text-[10px] sm:text-[11px] uppercase bg-[#FAFBFD]">
                        <th className="py-2.5 px-2.5 sm:px-3">
                          {lang === "gu" ? "આઇટમ વિગત" : "Item Description"}
                        </th>
                        <th className="py-2.5 px-2 font-mono">{lang === "gu" ? "HSN કોડ" : "HSN"}</th>
                        <th className="py-2.5 px-2 text-right">
                          {lang === "gu" ? "જથ્થો" : "Qty"}
                        </th>
                        <th className="py-2.5 px-2 text-right">
                          {lang === "gu" ? "દર (₹)" : "Rate (₹)"}
                        </th>
                        <th className="py-2.5 px-2 text-right">
                          {lang === "gu" ? "જીએસટી %" : "Tax Rate"}
                        </th>
                        <th className="py-2.5 px-2.5 sm:px-3 text-right">
                          {lang === "gu" ? "કુલ રકમ (₹)" : "Total (₹)"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3F4F6] font-medium text-[#202124]">
                      <tr>
                        <td className="py-2.5 px-2.5 sm:px-3">
                          <span className="font-bold">
                            {lang === "gu" ? "૨૪K પ્યોર ગોલ્ડ બોર્ડર સાડી" : "24K Pure Gold Border Saree"}
                          </span>
                          <span className="block text-[10px] text-[#667085]">
                            {lang === "gu" ? "બેચ: SR-2026-A1 • એકમ: PCS" : "Batch: SR-2026-A1 • Unit: PCS"}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 font-mono text-[#667085]">5208</td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold">10 PCS</td>
                        <td className="py-2.5 px-2 text-right font-mono">₹4,500.00</td>
                        <td className="py-2.5 px-2 text-right font-mono text-emerald-600 font-semibold">5%</td>
                        <td className="py-2.5 px-2.5 sm:px-3 text-right font-mono font-bold">₹47,250.00</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-2.5 sm:px-3">
                          <span className="font-bold">
                            {lang === "gu" ? "સિરામિક ગ્લેઝ્ડ ફ્લોર ટાઇલ્સ (600x600)" : "Ceramic Glazed Floor Tiles (600x600)"}
                          </span>
                          <span className="block text-[10px] text-[#667085]">
                            {lang === "gu" ? "બેચ: TL-992-WH • એકમ: BOX" : "Batch: TL-992-WH • Unit: BOX"}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 font-mono text-[#667085]">6907</td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold">120 BOX</td>
                        <td className="py-2.5 px-2 text-right font-mono">₹720.00</td>
                        <td className="py-2.5 px-2 text-right font-mono text-emerald-600 font-semibold">18%</td>
                        <td className="py-2.5 px-2.5 sm:px-3 text-right font-mono font-bold">₹1,01,670.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-3 border-t border-[#F3F4F6] gap-3">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="px-2 sm:px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] sm:text-xs font-bold">
                      {lang === "gu" ? "✓ e-Way Bill JSON તૈયાર" : "✓ e-Way Bill JSON Ready"}
                    </span>
                    <span className="px-2 sm:px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[11px] sm:text-xs font-bold">
                      {lang === "gu" ? "થર્મલ અને A4 પ્રિન્ટ" : "Thermal & A4 Print"}
                    </span>
                  </div>

                  <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2">
                    <span className="text-xs text-[#667085] font-semibold">
                      {lang === "gu" ? "આખરી કુલ રકમ (જીએસટી સહિત):" : "Grand Total (Incl. GST):"}
                    </span>
                    <span className="text-lg sm:text-2xl font-black text-[#F47721] font-mono">
                      ₹1,48,920.00
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: LIVE DASHBOARD PREVIEW */}
            {activePreviewTab === "dashboard" && (
              <div className="p-3.5 sm:p-7 space-y-4 sm:space-y-5 bg-[#F7F8FA]">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0]">
                    <span className="text-[11px] sm:text-xs font-bold text-[#15803D] uppercase">
                      {lang === "gu" ? "ગ્રાહકો પાસેથી કુલ લેણાં" : "Customer Receivables"}
                    </span>
                    <p className="text-xl sm:text-2xl font-black font-mono text-[#15803D] mt-1">₹2,48,920.00</p>
                    <p className="text-[11px] text-[#16A34A] mt-0.5">
                      {lang === "gu" ? "૧૪ પાર્ટીઓ પાસેથી ઉઘરાણી બાકી" : "Amount to collect from 14 parties"}
                    </p>
                  </div>
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-[#FEF2F2] border border-[#FECDD3]">
                    <span className="text-[11px] sm:text-xs font-bold text-[#DC2626] uppercase">
                      {lang === "gu" ? "સપ્લાયરોને ચૂકવવાપાત્ર" : "Supplier Payables"}
                    </span>
                    <p className="text-xl sm:text-2xl font-black font-mono text-[#DC2626] mt-1">₹1,12,400.00</p>
                    <p className="text-[11px] text-[#B91C1C] mt-0.5">
                      {lang === "gu" ? "૬ વેન્ડરોને ચૂકવણી કરવાની બાકી" : "Amount to pay to 6 vendors"}
                    </p>
                  </div>
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F0F9FF] border border-[#BAE6FD] sm:col-span-2 md:col-span-1">
                    <span className="text-[11px] sm:text-xs font-bold text-[#0284C7] uppercase">
                      {lang === "gu" ? "રોકડ અને બેંક સિલક" : "Cash & Bank Balance"}
                    </span>
                    <p className="text-xl sm:text-2xl font-black font-mono text-[#0284C7] mt-1">₹3,84,500.00</p>
                    <p className="text-[11px] text-[#0369A1] mt-0.5">
                      {lang === "gu" ? "રોકડ: ₹42,500 • બેંક: ₹3,42,000" : "Cash: ₹42,500 • Bank: ₹3,42,000"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E5E7EB]">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#667085]">
                      {lang === "gu" ? "કુલ વેચાણ (નાણાકીય વર્ષ ૨૬-૨૭)" : "Total Sales (FY 26-27)"}
                    </span>
                    <p className="text-base sm:text-lg font-bold font-mono text-[#202124]">₹48,92,400.00</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#667085]">
                      {lang === "gu" ? "બનાવેલા બિલો" : "Invoices Issued"}
                    </span>
                    <p className="text-base sm:text-lg font-bold font-mono text-[#202124]">
                      {lang === "gu" ? "૪૮૨ બિલો" : "482 Bills"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#667085]">
                      {lang === "gu" ? "સ્ટોકનું મૂલ્યાંકન" : "Inventory Valuation"}
                    </span>
                    <p className="text-base sm:text-lg font-bold font-mono text-[#202124]">₹14,20,500.00</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#667085]">
                      {lang === "gu" ? "સક્રિય ગોડાઉનો" : "Active Godowns"}
                    </span>
                    <p className="text-base sm:text-lg font-bold font-mono text-[#202124]">
                      {lang === "gu" ? "૨ ગોડાઉન" : "2 Locations"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: DIGITAL BILL SCANNER PREVIEW */}
            {activePreviewTab === "scanner" && (
              <div className="p-3.5 sm:p-7 space-y-4 bg-white">
                <div className="p-3 sm:p-4 bg-purple-50 border border-purple-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-lg sm:text-xl shrink-0">
                      📥
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-purple-950">
                        {lang === "gu" ? "ડિજિટલ OCR સ્કેનર પાઇપલાઇન" : "Digital OCR Bill Pipeline"}
                      </h4>
                      <p className="text-[11px] sm:text-xs text-purple-700">
                        {lang === "gu"
                          ? "અપલોડ કરેલ: vendor_purchase_invoice_902.pdf (ચોકસાઈ: ૯૮.૪%)"
                          : "Uploaded: vendor_purchase_invoice_902.pdf (Confidence: 98.4%)"}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 sm:px-3 py-1 bg-white text-purple-800 rounded-md text-[10px] sm:text-xs font-bold border border-purple-200 shadow-2xs">
                    {lang === "gu" ? "✓ ૩ આઇટમ્સ આપમેળે સ્કેન થઈ" : "✓ 3 Items Extracted Automatically"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 text-xs">
                  <div className="p-3 bg-[#F8F9FB] rounded-xl border border-[#E5E7EB]">
                    <span className="text-[#667085] block font-semibold text-[11px]">
                      {lang === "gu" ? "ઓળખાયેલ વેન્ડર:" : "Vendor Extracted:"}
                    </span>
                    <span className="font-bold text-[#202124]">
                      {lang === "gu" ? "અંબિકા ટેક્સટાઇલ મિલ્સ" : "Ambica Textile Mills"}
                    </span>
                    <span className="block font-mono text-[10px] text-[#F47721]">GSTIN: 24AAACA5555M1Z9</span>
                  </div>
                  <div className="p-3 bg-[#F8F9FB] rounded-xl border border-[#E5E7EB]">
                    <span className="text-[#667085] block font-semibold text-[11px]">
                      {lang === "gu" ? "બિલ વિગતો:" : "Bill Details:"}
                    </span>
                    <span className="font-bold text-[#202124]">
                      {lang === "gu" ? "બિલ #ATM-4019" : "Invoice #ATM-4019"}
                    </span>
                    <span className="block text-[10px] text-[#667085]">
                      {lang === "gu" ? "તારીખ: ૧૪ ઓક્ટો ૨૦૨૬" : "Date: 14 Oct 2026"}
                    </span>
                  </div>
                  <div className="p-3 bg-[#F8F9FB] rounded-xl border border-[#E5E7EB]">
                    <span className="text-[#667085] block font-semibold text-[11px]">
                      {lang === "gu" ? "ટેક્સપાત્ર & ITC:" : "Taxable & ITC:"}
                    </span>
                    <span className="font-bold font-mono text-[#202124]">
                      {lang === "gu" ? "₹84,500.00 + ૫% જીએસટી" : "₹84,500.00 + 5% GST"}
                    </span>
                    <span className="block text-[10px] text-emerald-700 font-bold">
                      {lang === "gu" ? "ITC: કાયદેસર ઇનપુટ મળવાપાત્ર" : "ITC: Eligible Input"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: DOUBLE-ENTRY LEDGERS PREVIEW */}
            {activePreviewTab === "ledger" && (
              <div className="p-3.5 sm:p-7 space-y-4 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#E5E7EB] gap-2">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#202124]">
                      {lang === "gu" ? "ખાતાવહી: શ્રી રામ ટ્રેડર્સ (ગ્રાહક)" : "General Ledger: Shree Ram Traders (Customer)"}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-[#667085]">
                      {lang === "gu"
                        ? "ખાતા કોડ: ACC-2004 • ગ્રુપ: સનડ્રી દેવાદારો (Sundry Debtors)"
                        : "Account Code: ACC-2004 • Group: Sundry Debtors"}
                    </p>
                  </div>
                  <span className="px-2.5 sm:px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold self-start sm:self-auto">
                    {lang === "gu" ? "આખર બાકી: ₹34,500.00 ઉધાર" : "Closing Balance: ₹34,500.00 Dr"}
                  </span>
                </div>

                <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
                  <table className="w-full min-w-[500px] text-left text-xs font-mono">
                    <thead className="bg-[#FAFBFD] border-b border-[#E5E7EB] text-[#667085] uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-2.5 sm:px-3">
                          {lang === "gu" ? "તારીખ" : "Date"}
                        </th>
                        <th className="py-2 px-2.5 sm:px-3">
                          {lang === "gu" ? "વાઉચર પ્રકાર" : "Voucher Type"}
                        </th>
                        <th className="py-2 px-2.5 sm:px-3">
                          {lang === "gu" ? "સંદર્ભ / વાઉચર #" : "Ref / Voucher #"}
                        </th>
                        <th className="py-2 px-2.5 sm:px-3 text-right">
                          {lang === "gu" ? "ઉધાર (₹)" : "Debit (₹)"}
                        </th>
                        <th className="py-2 px-2.5 sm:px-3 text-right">
                          {lang === "gu" ? "જમા (₹)" : "Credit (₹)"}
                        </th>
                        <th className="py-2 px-2.5 sm:px-3 text-right">
                          {lang === "gu" ? "બાકી (₹)" : "Balance (₹)"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3F4F6] text-[#202124]">
                      <tr>
                        <td className="py-2 px-2.5 sm:px-3 font-sans">
                          {lang === "gu" ? "૦૧ ઓક્ટો ૨૦૨૬" : "01 Oct 2026"}
                        </td>
                        <td className="py-2 px-2.5 sm:px-3 font-sans font-semibold">
                          {lang === "gu" ? "શરૂઆતની બાકી (Opening Balance)" : "Opening Balance"}
                        </td>
                        <td className="py-2 px-2.5 sm:px-3 text-[#667085]">OP-01</td>
                        <td className="py-2 px-2.5 sm:px-3 text-right font-bold text-slate-800">10,000.00</td>
                        <td className="py-2 px-2.5 sm:px-3 text-right text-[#667085]">0.00</td>
                        <td className="py-2 px-2.5 sm:px-3 text-right font-bold text-slate-800">
                          {lang === "gu" ? "10,000.00 ઉધાર" : "10,000.00 Dr"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-2.5 sm:px-3 font-sans">
                          {lang === "gu" ? "૦૫ ઓક્ટો ૨૦૨૬" : "05 Oct 2026"}
                        </td>
                        <td className="py-2 px-2.5 sm:px-3 font-sans font-semibold text-[#F47721]">
                          {lang === "gu" ? "વેચાણ જીએસટી ટેક્સ ઇન્વોઇસ" : "Sales Tax Invoice"}
                        </td>
                        <td className="py-2 px-2.5 sm:px-3 text-[#667085]">INV-2026-0038</td>
                        <td className="py-2 px-2.5 sm:px-3 text-right font-bold text-slate-800">44,500.00</td>
                        <td className="py-2 px-2.5 sm:px-3 text-right text-[#667085]">0.00</td>
                        <td className="py-2 px-2.5 sm:px-3 text-right font-bold text-slate-800">
                          {lang === "gu" ? "54,500.00 ઉધાર" : "54,500.00 Dr"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-2.5 sm:px-3 font-sans">
                          {lang === "gu" ? "૧૦ ઓક્ટો ૨૦૨૬" : "10 Oct 2026"}
                        </td>
                        <td className="py-2 px-2.5 sm:px-3 font-sans font-semibold text-emerald-700">
                          {lang === "gu" ? "બેંક જમા પહોંચ (Receipt Voucher)" : "Bank Receipt Voucher"}
                        </td>
                        <td className="py-2 px-2.5 sm:px-3 text-[#667085]">REC-9021 (HDFC)</td>
                        <td className="py-2 px-2.5 sm:px-3 text-right text-[#667085]">0.00</td>
                        <td className="py-2 px-2.5 sm:px-3 text-right font-bold text-emerald-700">20,000.00</td>
                        <td className="py-2 px-2.5 sm:px-3 text-right font-bold text-[#F47721]">
                          {lang === "gu" ? "34,500.00 ઉધાર" : "34,500.00 Dr"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================= 5. SALES AND BILLING SECTION ================= */}
      <section id="sales-billing" className="py-12 sm:py-20 px-3.5 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#E5E7EB] scroll-mt-20 sm:scroll-mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 items-center">
          <div className="reveal-from-left space-y-4 sm:space-y-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#FFF3E8] border border-[#FED7AA] text-[#C2410C] text-xs font-bold">
              <span>🧾</span>
              <span>{lang === "gu" ? "વેચાણ અને બિલિંગ એન્જિન" : "Sales & Invoicing Module"}</span>
            </div>

            <h2 className="text-xl xs:text-2xl sm:text-4xl font-extrabold text-[#18263B] tracking-tight break-words">
              {lang === "gu"
                ? "ઝડપી જીએસટી બિલિંગ, પીઓએસ અને ડિલિવરી ચલણ"
                : "Lightning-Fast GST Invoicing, POS & Delivery Challans"}
            </h2>

            <p className="text-xs sm:text-sm text-[#667085] leading-relaxed break-words">
              {lang === "gu"
                ? "F2 શૉર્ટકટ વડે ૧૦ સેકન્ડમાં ટેક્સ ઇન્વોઇસ બનાવો. બારકોડ સ્કેનિંગ, ડિસ્કાઉન્ટ, પેમેન્ટ ટર્મ્સ, ક્રેડિટ નોટ (વેચાણ પરત) અને સરકારી e-Way બિલ JSON સપોર્ટ સાથે."
                : "Create compliant B2B and B2C tax invoices in seconds with keyboard-first shortcuts. Complete with barcode scanning, instant round-offs, delivery challans with 1-click invoice conversion, and output GST reversals via credit notes."}
            </p>

            <div className="space-y-3 pt-2">
              <div className="reveal-on-scroll reveal-delay-1 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#FFF3E8] text-[#F47721] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">✓</span>
                <div>
                  <h4 className="text-xs font-bold text-[#18263B]">
                    {lang === "gu" ? "B2B અને B2C ટેક્સ ઇન્વોઇસ" : "B2B & B2C Tax Invoices"}
                  </h4>
                  <p className="text-[11px] text-[#667085]">
                    {lang === "gu" ? "CGST, SGST અને IGST આપોઆપ ગણતરી સાથે" : "Automatic intra-state vs inter-state tax split"}
                  </p>
                </div>
              </div>

              <div className="reveal-on-scroll reveal-delay-2 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#FFF3E8] text-[#F47721] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">✓</span>
                <div>
                  <h4 className="text-xs font-bold text-[#18263B]">
                    {lang === "gu" ? "ક્વિક POS કાઉન્ટર બિલિંગ" : "Quick POS Counter Billing"}
                  </h4>
                  <p className="text-[11px] text-[#667085]">
                    {lang === "gu" ? "રિટેલ કાઉન્ટર માટે થર્મલ 58mm / 80mm રસીદ" : "Fast barcode reader support and thermal receipts"}
                  </p>
                </div>
              </div>

              <div className="reveal-on-scroll reveal-delay-3 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#FFF3E8] text-[#F47721] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">✓</span>
                <div>
                  <h4 className="text-xs font-bold text-[#18263B]">
                    {lang === "gu" ? "ડિલિવરી ચલણ & e-Way પેલોડ" : "Delivery Challans & e-Way Ready"}
                  </h4>
                  <p className="text-[11px] text-[#667085]">
                    {lang === "gu" ? "જોબવર્ક કે અપ્રૂવલ ચલણમાંથી સીધું બિલ બનાવો" : "One-click conversion of challans into invoices"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="reveal-from-right bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#E5E7EB] shadow-subtle space-y-4 saas-card-interactive w-full">
            <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6] gap-2">
              <span className="text-xs font-bold text-[#18263B]">
                {lang === "gu" ? "માન્ય ઇન્વોઇસ ફોર્મેટ્સ અને થીમ્સ" : "Supported Invoice Formats & Themes"}
              </span>
              <span className="text-xs text-[#F47721] font-bold shrink-0">
                {lang === "gu" ? "૪ કલર વિકલ્પો" : "4 Color Options"}
              </span>
            </div>
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 text-xs">
              <div className="reveal-on-scroll reveal-delay-1 p-3 bg-[#FFF8F3] rounded-xl border border-[#FED7AA] saas-card-interactive group">
                <span className="font-bold text-[#C2410C] block group-hover:text-[#F47721] transition-colors">
                  {lang === "gu" ? "A4 જીએસટી ટેક્સ ઇન્વોઇસ" : "A4 GST Tax Invoice"}
                </span>
                <span className="text-[10px] text-[#667085] leading-tight block mt-0.5">
                  {lang === "gu"
                    ? "ઓફિશિયલ વેપારી ટેમ્પલેટ - બેંક QR કોડ, શરતો અને HSN સમરી સાથે."
                    : "Official corporate template with bank QR, terms, and HSN summary."}
                </span>
              </div>
              <div className="reveal-on-scroll reveal-delay-2 p-3 bg-[#F8FAFC] rounded-xl border border-[#E5E7EB] saas-card-interactive group">
                <span className="font-bold text-[#18263B] block group-hover:text-[#F47721] transition-colors">
                  {lang === "gu" ? "POS થર્મલ રસીદ પ્રિન્ટ" : "POS Thermal Receipt"}
                </span>
                <span className="text-[10px] text-[#667085] leading-tight block mt-0.5">
                  {lang === "gu"
                    ? "કાઉન્ટર માટે 58mm/80mm થર્મલ રસીદ - આઇટમ્સ અને જીએસટી વિભાજન સાથે."
                    : "Compact 58mm/80mm receipt with item totals and GST split."}
                </span>
              </div>
            </div>
            <div className="reveal-on-scroll reveal-delay-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 saas-card-interactive">
              <p className="font-bold">
                {lang === "gu" ? "કીબોર્ડ આધારિત સ્પીડ ડિઝાઇન" : "Keyboard First Design"}
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                {lang === "gu"
                  ? "સોફ્ટવેરમાં ગમે ત્યાંથી F2 દબાવી નવું બિલ બનાવો અને F4 દબાવી પેમેન્ટ સ્વીકારો."
                  : "Press F2 anywhere in the app to open the invoice creator, and F4 to accept payment."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 6. PURCHASES AND INVENTORY SECTION ================= */}
      <section id="purchases-inventory" className="py-12 sm:py-20 px-3.5 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-gradient-to-b from-[#F7F8FA] to-white border-t border-[#E5E7EB] scroll-mt-20 sm:scroll-mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 items-center">
          <div className="reveal-from-left bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#E5E7EB] shadow-subtle space-y-4 order-2 lg:order-1 saas-card-interactive w-full">
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-2xl border border-purple-200">
              <span className="text-2xl shrink-0">📥</span>
              <div>
                <h4 className="text-xs font-bold text-purple-950">
                  {lang === "gu" ? "ઓટોમેટેડ ખરીદી બિલ સ્કેનિંગ" : "Automated Purchase Bill Parsing"}
                </h4>
                <p className="text-[10px] text-purple-700">
                  {lang === "gu"
                    ? "કાગળના બિલો, ફોટા અને PDF નું ઓટોમેટિક સ્કેનિંગ"
                    : "Automated OCR for physical vendor bills, scans, and PDFs"}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="reveal-on-scroll reveal-delay-1 flex justify-between items-center p-2.5 bg-[#F8F9FB] rounded-xl border border-[#E5E7EB] saas-card-interactive group gap-2">
                <span className="font-semibold text-[#667085] text-[11px]">
                  {lang === "gu" ? "વેન્ડરનું નામ અને GSTIN" : "Vendor Name & GSTIN"}
                </span>
                <span className="font-mono font-bold text-[#18263B] group-hover:text-[#F47721] transition-colors text-[11px] text-right">
                  {lang === "gu" ? "ઓટો-મેચ થયું" : "Auto-Matched"}
                </span>
              </div>
              <div className="reveal-on-scroll reveal-delay-2 flex justify-between items-center p-2.5 bg-[#F8F9FB] rounded-xl border border-[#E5E7EB] saas-card-interactive group gap-2">
                <span className="font-semibold text-[#667085] text-[11px]">
                  {lang === "gu" ? "આઇટમ વિગતો અને HSN" : "Item Descriptions & HSN"}
                </span>
                <span className="font-mono font-bold text-[#18263B] group-hover:text-[#F47721] transition-colors text-[11px] text-right">
                  {lang === "gu" ? "કેટલોગ મેપિંગ" : "Mapped Catalog"}
                </span>
              </div>
              <div className="reveal-on-scroll reveal-delay-3 flex justify-between items-center p-2.5 bg-[#F8F9FB] rounded-xl border border-[#E5E7EB] saas-card-interactive group gap-2">
                <span className="font-semibold text-[#667085] text-[11px]">
                  {lang === "gu" ? "ITC પાત્રતા સ્થિતિ" : "ITC Eligibility Status"}
                </span>
                <span className="font-mono font-bold text-emerald-600 text-[11px] text-right">
                  {lang === "gu" ? "ઇનપુટ / કેપિટલ" : "INPUT / CAPITAL"}
                </span>
              </div>
            </div>

            <div className="reveal-on-scroll reveal-delay-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 saas-card-interactive">
              <span className="font-bold">
                {lang === "gu" ? "મલ્ટી-ગોડાઉન સ્ટોક ટ્રાન્સફર:" : "Multi-Godown Stock Transfers:"}
              </span>
              <p className="text-[11px] text-amber-700 mt-0.5">
                {lang === "gu"
                  ? "મુખ્ય ગોડાઉનથી દુકાન કાઉન્ટર પર માલ રવાનગી, ઇન-ટ્રાન્ઝિટ સ્ટેટસ અને નુકસાની ટ્રેકિંગ સાથે ટ્રાન્સફર કરો."
                  : "Move items from Head Office Warehouse to Shop Counter with dispatch approval, in-transit status, and transit damage logging."}
              </p>
            </div>
          </div>

          <div className="reveal-from-right space-y-4 sm:space-y-5 order-1 lg:order-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold">
              <span>📥</span>
              <span>{lang === "gu" ? "ખરીદી અને સ્ટોક સિસ્ટમ" : "Purchases & Inventory Module"}</span>
            </div>

            <h2 className="text-xl xs:text-2xl sm:text-4xl font-extrabold text-[#18263B] tracking-tight break-words">
              {lang === "gu"
                ? "ઓટોમેટેડ બિલ સ્કેનર અને મલ્ટી-ગોડાઉન સ્ટોક"
                : "Automated Bill OCR & Multi-Godown Stock Transfers"}
            </h2>

            <p className="text-xs sm:text-sm text-[#667085] leading-relaxed break-words">
              {lang === "gu"
                ? "પેપર બિલ ટાઇપ કરવાનો કંટાળો હવે ભૂલી જાઓ! ડિજિટલ સ્કેનર આપોઆપ સપ્લાયર, આઇટમ્સ, HSN અને ટેક્સ વાંચીને ખરીદી એન્ટ્રી ભરી આપે છે. સાથે બેચ અને એક્સપાયરી મેનેજમેન્ટ."
                : "Eliminate manual data entry. Upload physical purchase bills or PDF invoices to auto-extract items, rates, taxes, and vendor details in seconds. Seamlessly paired with multi-godown transfers and batch tracking."}
            </p>

            <div className="space-y-3 pt-2">
              <div className="reveal-on-scroll reveal-delay-1 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">✓</span>
                <div>
                  <h4 className="text-xs font-bold text-[#18263B]">
                    {lang === "gu" ? "હાઇ-એક્યુરેસી OCR પાઇપલાઇન" : "High-Accuracy Bill OCR Engine"}
                  </h4>
                  <p className="text-[11px] text-[#667085]">
                    {lang === "gu" ? "PDF, JPEG, PNG અને HEIC ફોર્મેટ સપોર્ટ" : "High-accuracy bill extraction with Tesseract OCR fallback"}
                  </p>
                </div>
              </div>

              <div className="reveal-on-scroll reveal-delay-2 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">✓</span>
                <div>
                  <h4 className="text-xs font-bold text-[#18263B]">
                    {lang === "gu" ? "ગોડાઉન સ્ટોક & ટ્રાન્સફર મેનેજમેન્ટ" : "Inter-Godown Transfers & Transit"}
                  </h4>
                  <p className="text-[11px] text-[#667085]">
                    {lang === "gu" ? "દુકાન અને ગોડાઉન વચ્ચે સ્ટોક મુવમેન્ટ અને શોર્ટેજ ટ્રેક" : "Dual-phase transfer: dispatch, in-transit, and receipt"}
                  </p>
                </div>
              </div>

              <div className="reveal-on-scroll reveal-delay-3 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">✓</span>
                <div>
                  <h4 className="text-xs font-bold text-[#18263B]">
                    {lang === "gu" ? "બેચ, એક્સપાયરી & HSN માસ્ટર" : "Batches, Expiry & Central HSN Master"}
                  </h4>
                  <p className="text-[11px] text-[#667085]">
                    {lang === "gu" ? "FIFO પદ્ધતિથી સ્ટોક વેલ્યુએશન અને એક્સપાયરી ચેતવણી" : "Full batch tracking, low-stock alerts, and statutory HSN rates"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 7. ACCOUNTING AND LEDGERS SECTION ================= */}
      <section id="accounting-ledgers" className="py-12 sm:py-20 px-3.5 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#E5E7EB] scroll-mt-20 sm:scroll-mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 items-center">
          <div className="reveal-from-left space-y-4 sm:space-y-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <span>📚</span>
              <span>{lang === "gu" ? "દેશી નામા પદ્ધતિ અને હિસાબ" : "Double-Entry Accounting & Ledgers"}</span>
            </div>

            <h2 className="text-xl xs:text-2xl sm:text-4xl font-extrabold text-[#18263B] tracking-tight break-words">
              {lang === "gu"
                ? "રોજમેળ, ખાતાવહી અને સંપૂર્ણ વાઉચર વ્યવસ્થા"
                : "Double-Entry Ledgers, Daybook & Complete Vouchers"}
            </h2>

            <p className="text-xs sm:text-sm text-[#667085] leading-relaxed break-words">
              {lang === "gu"
                ? "ચોખ્ખો અને પાકો હિસાબ! ચાર્ટ ઓફ એકાઉન્ટ્સ સાથે આવક પહોંચ (Receipt), ચૂકવણી (Payment), કોન્ટ્રા (Contra) અને જર્નલ (Journal) વાઉચર્સ. રોજમેળ (Daybook) અને કેશ/બેંક સિલક આપોઆપ અપડેટ થાય છે."
                : "Engineered specifically for Indian business practices. Enjoy seamless double-entry accounting with real-time Daybook (રોજમેળ), Chart of Accounts, Cash Book, Bank Ledgers, and Receipt, Payment, Contra, and Journal vouchers."}
            </p>

            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2.5 sm:gap-3 pt-2 text-xs">
              <div className="reveal-on-scroll reveal-delay-1 p-3 bg-white rounded-xl border border-[#E5E7EB] shadow-2xs saas-card-interactive group">
                <span className="text-[#F47721] font-bold block mb-1 group-hover:translate-x-0.5 transition-transform">
                  {lang === "gu" ? "આવક પહોંચ (Receipt)" : "Receipt Voucher"}
                </span>
                <span className="text-[11px] text-[#667085]">
                  {lang === "gu" ? "ગ્રાહકો પાસેથી મળેલ રોકડ કે બેંક પેમેન્ટ" : "Cash and bank collections from customers"}
                </span>
              </div>
              <div className="reveal-on-scroll reveal-delay-2 p-3 bg-white rounded-xl border border-[#E5E7EB] shadow-2xs saas-card-interactive group">
                <span className="text-rose-600 font-bold block mb-1 group-hover:translate-x-0.5 transition-transform">
                  {lang === "gu" ? "ચૂકવણી વાઉચર (Payment)" : "Payment Voucher"}
                </span>
                <span className="text-[11px] text-[#667085]">
                  {lang === "gu" ? "વેપારીઓ અને દૈનિક ખર્ચની ચુકવણી" : "Vendor disbursements and day-to-day expenses"}
                </span>
              </div>
              <div className="reveal-on-scroll reveal-delay-3 p-3 bg-white rounded-xl border border-[#E5E7EB] shadow-2xs saas-card-interactive group">
                <span className="text-blue-600 font-bold block mb-1 group-hover:translate-x-0.5 transition-transform">
                  {lang === "gu" ? "બેંક ફેરબદલ (Contra)" : "Contra Voucher"}
                </span>
                <span className="text-[11px] text-[#667085]">
                  {lang === "gu" ? "રોકડ જમા/ઉપાડ અને બેંક-ટુ-બેંક ટ્રાન્સફર" : "Cash deposit/withdrawal and bank-to-bank transfer"}
                </span>
              </div>
              <div className="reveal-on-scroll reveal-delay-4 p-3 bg-white rounded-xl border border-[#E5E7EB] shadow-2xs saas-card-interactive group">
                <span className="text-purple-600 font-bold block mb-1 group-hover:translate-x-0.5 transition-transform">
                  {lang === "gu" ? "હવાલા વાઉચર (Journal)" : "Journal Voucher"}
                </span>
                <span className="text-[11px] text-[#667085]">
                  {lang === "gu" ? "એડજસ્ટમેન્ટ એન્ટ્રી અને ખાતા ફેરબદલ" : "Account adjustments, depreciation & closing entries"}
                </span>
              </div>
            </div>
          </div>

          <div className="reveal-from-right bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#E5E7EB] shadow-subtle space-y-4 saas-card-interactive w-full">
            <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6] gap-2">
              <span className="text-xs font-bold text-[#18263B]">
                {lang === "gu" ? "અધિકૃત ડબલ-એન્ટ્રી નામા પદ્ધતિ" : "Authoritative Double-Entry Framework"}
              </span>
              <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-md shrink-0">
                {lang === "gu" ? "ઓડિટેડ & પ્રમાણિત" : "Audited & Verified"}
              </span>
            </div>
            <div className="space-y-3 text-xs">
              <div className="reveal-on-scroll reveal-delay-1 p-3 bg-[#F8F9FB] rounded-xl border border-[#E5E7EB] saas-card-interactive group">
                <span className="font-bold text-[#18263B] block group-hover:text-[#F47721] transition-colors">
                  {lang === "gu" ? "ચાર્ટ ઓફ એકાઉન્ટ્સ (COA)" : "Chart of Accounts (COA)"}
                </span>
                <p className="text-[11px] text-[#667085] mt-0.5">
                  {lang === "gu"
                    ? "ભારતીય નામા પદ્ધતિ મુજબ વર્ગીકરણ: મિલકતો, દેવાં, આવક અને ખર્ચ."
                    : "Organized under Indian accounting heads: Assets, Liabilities, Incomes, and Expenses."}
                </p>
              </div>
              <div className="reveal-on-scroll reveal-delay-2 p-3 bg-[#F8F9FB] rounded-xl border border-[#E5E7EB] saas-card-interactive group">
                <span className="font-bold text-[#18263B] block group-hover:text-[#F47721] transition-colors">
                  {lang === "gu" ? "ચાલુ સિલક સાથે પાર્ટી ખાતાવહી" : "Running Balance Party Ledgers"}
                </span>
                <p className="text-[11px] text-[#667085] mt-0.5">
                  {lang === "gu"
                    ? "દરેક ગ્રાહક અને વેપારીનું અલગ ખાતું - ઉધાર, જમા અને ત્વરિત બાકી રકમ સાથે."
                    : "Every customer and supplier has a dedicated ledger with chronological debits, credits, and running net balances."}
                </p>
              </div>
              <div className="reveal-on-scroll reveal-delay-3 p-3 bg-[#F8F9FB] rounded-xl border border-[#E5E7EB] saas-card-interactive group">
                <span className="font-bold text-[#18263B] block group-hover:text-[#F47721] transition-colors">
                  {lang === "gu" ? "રોકડ મેળ અને દૈનિક રોજમેળ (Daybook)" : "Cash Book & Daily Daybook (રોજમેળ)"}
                </span>
                <p className="text-[11px] text-[#667085] mt-0.5">
                  {lang === "gu"
                    ? "રોજ સવારની શરૂઆતની સિલક, દિવસની આવક-જાવક અને ચોખ્ખી આખર સિલક તપાસો."
                    : "Review opening cash in hand, daily collections, daily expenses, and exact closing liquid balances."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 8. GST CENTER & STATUTORY COMPLIANCE ================= */}
      <section id="gst-statutory" className="py-12 sm:py-20 px-3.5 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-gradient-to-b from-[#FAFBFD] to-white border-t border-[#E5E7EB] scroll-mt-20 sm:scroll-mt-24">
        <div className="reveal-on-scroll text-center max-w-3xl mx-auto space-y-3 mb-8 sm:mb-12">
          <span className="text-xs font-bold text-[#F47721] uppercase tracking-wider">
            {lang === "gu" ? "જીએસટી અને સરકારી રિટર્ન" : "Statutory GST Center"}
          </span>
          <h2 className="text-xl xs:text-2xl sm:text-4xl font-extrabold text-[#18263B] tracking-tight break-words">
            {lang === "gu"
              ? "GSTR-1, GSTR-3B અને GSTR-2B રિકન્સિલેશન કેન્દ્ર"
              : "GSTR-1, GSTR-3B & Inward GSTR-2B Reconciliation"}
          </h2>
          <p className="text-xs sm:text-sm text-[#667085] break-words">
            {lang === "gu"
              ? "સરકારી જીએસટી પોર્ટલ મુજબના કોષ્ટકો સાથે તૈયાર રિપોર્ટ્સ. તમારા CA ને મોકલવા માટે એક્સેલ/CSV ડાઉનલોડ."
              : "Prepared strictly per Indian GST rules with Table-wise categorizations, ITC offset computations, and e-Way Bill JSON generation."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <div className="reveal-on-scroll reveal-delay-1 saas-card-interactive bg-white p-4.5 sm:p-5 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-2 group">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#F47721] flex items-center justify-center font-bold text-lg mb-2 group-hover:scale-110 transition-transform duration-200">
              📋
            </div>
            <h3 className="text-sm font-bold text-[#18263B] group-hover:text-[#F47721] transition-colors">
              {lang === "gu" ? "GSTR-1 રિટર્ન તૈયારી" : "GSTR-1 Return Prep"}
            </h3>
            <p className="text-[11px] text-[#667085] leading-relaxed">
              {lang === "gu"
                ? "સેક્શન 4A (B2B ઇન્વોઇસ), સેક્શન 5 (B2CL મોટા બિલો), સેક્શન 7 (B2CS નાના બિલો) અને સેક્શન 12 (HSN કોડ સમરી) નો સંપૂર્ણ સમાવેશ."
                : "Covers Section 4A (B2B Tax Invoices), Section 5 (B2CL Large Invoices), Section 7 (B2CS Small Intra-State), and Section 12 (HSN Code Summary)."}
            </p>
          </div>

          <div className="reveal-on-scroll reveal-delay-2 saas-card-interactive bg-white p-4.5 sm:p-5 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-2 group">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg mb-2 group-hover:scale-110 transition-transform duration-200">
              📊
            </div>
            <h3 className="text-sm font-bold text-[#18263B] group-hover:text-emerald-700 transition-colors">
              {lang === "gu" ? "GSTR-3B ટેક્સ ગણતરી" : "GSTR-3B Computation"}
            </h3>
            <p className="text-[11px] text-[#667085] leading-relaxed">
              {lang === "gu"
                ? "માસિક વેચાણ પર ટેક્સની જવાબદારી અને ખરીદી બિલમાંથી મળવાપાત્ર ઇનપુટ ટેક્સ ક્રેડિટ (ITC) નું ચોક્કસ સરવૈયું."
                : "Summarizes monthly outward taxable supplies and calculates net tax liability offset against eligible Input Tax Credit (ITC) from purchase books."}
            </p>
          </div>

          <div className="reveal-on-scroll reveal-delay-3 saas-card-interactive bg-white p-4.5 sm:p-5 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-2 group">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-lg mb-2 group-hover:scale-110 transition-transform duration-200">
              🔍
            </div>
            <h3 className="text-sm font-bold text-[#18263B] group-hover:text-blue-700 transition-colors">
              {lang === "gu" ? "GSTR-2B મેચિંગ & મેળવણી" : "GSTR-2B Matching"}
            </h3>
            <p className="text-[11px] text-[#667085] leading-relaxed">
              {lang === "gu"
                ? "તમારા ચોપડાની ખરીદીઓને પોર્ટલના GSTR-2B સાથે સરખાવી છૂટી ગયેલા બિલો શોધો અને ખોવાઈ જતી ટેક્સ ક્રેડિટ બચાવો."
                : "Compare inward vendor purchases recorded in your books with GSTR-2B data to detect missing vendor invoices and avoid lost tax credits."}
            </p>
          </div>

          <div className="reveal-on-scroll reveal-delay-4 saas-card-interactive bg-white p-4.5 sm:p-5 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-2 group">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-lg mb-2 group-hover:scale-110 transition-transform duration-200">
              🚚
            </div>
            <h3 className="text-sm font-bold text-[#18263B] group-hover:text-purple-700 transition-colors">
              {lang === "gu" ? "e-Way બિલ જનરેટર" : "e-Way Bill Generator"}
            </h3>
            <p className="text-[11px] text-[#667085] leading-relaxed">
              {lang === "gu"
                ? "સરકારી e-Way બિલ પોર્ટલ માટે માન્ય ડાયરેક્ટ JSON ફાઇલ બનાવો - ટ્રાન્સપોર્ટર ID અને વાહન નંબર સાથે."
                : "Generate direct JSON payloads compliant with the National e-Way Bill portal for fast consignment transit with transporter ID and vehicle info."}
            </p>
          </div>
        </div>
      </section>

      {/* ================= 9. BUSINESS REPORTS & INTELLIGENCE ================= */}
      <section id="reports-analytics" className="py-12 sm:py-20 px-3.5 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#E5E7EB] scroll-mt-20 sm:scroll-mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 items-center">
          <div className="reveal-from-left space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
              <span>📊</span>
              <span>{lang === "gu" ? "અધિકૃત અહેવાલ કેન્દ્ર" : "Reports & Statutory Center"}</span>
            </div>

            <h2 className="text-xl xs:text-2xl sm:text-4xl font-extrabold text-[#18263B] tracking-tight break-words">
              {lang === "gu"
                ? "૧૪+ વાસ્તવિક બિઝનેસ રિપોર્ટ્સ અને નફા-નુકસાન સ્ટેટમેન્ટ"
                : "14+ Authoritative Financial & Statutory Reports"}
            </h2>

            <p className="text-xs sm:text-sm text-[#667085] leading-relaxed break-words">
              {lang === "gu"
                ? "નફા-નુકસાન ખાતું (P&L), પાકું સરવૈયું (Balance Sheet), કાચું સરવૈયું (Trial Balance), સેલ્સ અને પર્ચેઝ રજિસ્ટર, સ્ટોક વેલ્યુએશન અને ઉઘરાણી બાકી રિપોર્ટ્સ એક જ ક્લિકમાં ડાઉનલોડ કરો."
                : "Authoritative financial statements computed directly from posted double-entry ledger transactions. Export one-click CSV and Excel reports for seamless auditing and review."}
            </p>

            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 text-xs">
              <span className="reveal-on-scroll reveal-delay-1 p-2 sm:p-2.5 bg-white rounded-lg border border-[#E5E7EB] font-semibold text-[#18263B] hover:border-[#FED7AA] hover:text-[#F47721] transition-colors cursor-default">
                {lang === "gu" ? "• વેચાણ રજિસ્ટર (Sales Register)" : "• Sales Register"}
              </span>
              <span className="reveal-on-scroll reveal-delay-2 p-2 sm:p-2.5 bg-white rounded-lg border border-[#E5E7EB] font-semibold text-[#18263B] hover:border-[#FED7AA] hover:text-[#F47721] transition-colors cursor-default">
                {lang === "gu" ? "• ખરીદી રજિસ્ટર (Purchase Register)" : "• Purchase Register"}
              </span>
              <span className="reveal-on-scroll reveal-delay-3 p-2 sm:p-2.5 bg-white rounded-lg border border-[#E5E7EB] font-semibold text-[#18263B] hover:border-[#FED7AA] hover:text-[#F47721] transition-colors cursor-default">
                {lang === "gu" ? "• નફા-નુકસાન ખાતું (Profit & Loss)" : "• Profit & Loss (P&L)"}
              </span>
              <span className="reveal-on-scroll reveal-delay-4 p-2 sm:p-2.5 bg-white rounded-lg border border-[#E5E7EB] font-semibold text-[#18263B] hover:border-[#FED7AA] hover:text-[#F47721] transition-colors cursor-default">
                {lang === "gu" ? "• પાકું સરવૈયું (Balance Sheet)" : "• Balance Sheet"}
              </span>
              <span className="reveal-on-scroll reveal-delay-5 p-2 sm:p-2.5 bg-white rounded-lg border border-[#E5E7EB] font-semibold text-[#18263B] hover:border-[#FED7AA] hover:text-[#F47721] transition-colors cursor-default">
                {lang === "gu" ? "• કાચું સરવૈયું (Trial Balance)" : "• Trial Balance"}
              </span>
              <span className="reveal-on-scroll reveal-delay-6 p-2 sm:p-2.5 bg-white rounded-lg border border-[#E5E7EB] font-semibold text-[#18263B] hover:border-[#FED7AA] hover:text-[#F47721] transition-colors cursor-default">
                {lang === "gu" ? "• ગ્રાહક લેણાં રજિસ્ટર (Receivables)" : "• Customer Receivables"}
              </span>
              <span className="reveal-on-scroll reveal-delay-7 p-2 sm:p-2.5 bg-white rounded-lg border border-[#E5E7EB] font-semibold text-[#18263B] hover:border-[#FED7AA] hover:text-[#F47721] transition-colors cursor-default">
                {lang === "gu" ? "• વેપારી દેવાં રજિસ્ટર (Payables)" : "• Vendor Payables"}
              </span>
              <span className="reveal-on-scroll reveal-delay-8 p-2 sm:p-2.5 bg-white rounded-lg border border-[#E5E7EB] font-semibold text-[#18263B] hover:border-[#FED7AA] hover:text-[#F47721] transition-colors cursor-default">
                {lang === "gu" ? "• સ્ટોક મૂલ્યાંકન (FIFO Stock)" : "• Stock Valuation (FIFO)"}
              </span>
            </div>
          </div>

          <div id="specialized-modules" className="reveal-from-right bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#E5E7EB] shadow-subtle space-y-4 scroll-mt-20 sm:scroll-mt-24 saas-card-interactive w-full">
            <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6] gap-2">
              <span className="text-xs font-bold text-[#18263B]">
                {lang === "gu" ? "વધારાના વિશિષ્ટ મોડ્યુલ્સ" : "Additional Specialized Modules"}
              </span>
              <span className="text-xs text-[#F47721] font-bold shrink-0">
                {lang === "gu" ? "સંપૂર્ણ સંકલિત" : "Integrated in Codebase"}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="reveal-on-scroll reveal-delay-1 p-3 bg-[#FFF8F3] rounded-xl border border-[#FED7AA] saas-card-interactive group">
                <h4 className="font-bold text-[#C2410C] group-hover:text-[#F47721] transition-colors">
                  {lang === "gu" ? "ઉત્પાદન અને પ્રોડક્શન (BOM)" : "Manufacturing & Production (BOM)"}
                </h4>
                <p className="text-[11px] text-[#667085] mt-0.5 leading-relaxed">
                  {lang === "gu"
                    ? "બિલ ઓફ મટિરીયલ્સ (BOM) રેસિપી બનાવો, કાચો માલ ઇશ્યૂ કરો, પ્રોડક્શન ઓર્ડર નોંધો અને તૈયાર માલનો સ્ટોક આપમેળે વધારો."
                    : "Define Bill of Materials recipes, issue raw materials, record production orders, and automatically update finished goods inventory."}
                </p>
              </div>

              <div className="reveal-on-scroll reveal-delay-2 p-3 bg-[#F8FAFC] rounded-xl border border-[#E5E7EB] saas-card-interactive group">
                <h4 className="font-bold text-[#18263B] group-hover:text-[#F47721] transition-colors">
                  {lang === "gu" ? "મલ્ટી-કંપની અને મલ્ટી-બ્રાન્ચ સંચાલન" : "Multi-Company & Multi-Branch Architecture"}
                </h4>
                <p className="text-[11px] text-[#667085] mt-0.5 leading-relaxed">
                  {lang === "gu"
                    ? "એક જ એકાઉન્ટ હેઠળ બહુવિધ કંપનીઓ અને શાખાઓ ચલાવો - ત્વરિત સ્વિચિંગ અને ભૂમિકા-આધારિત સુરક્ષા સાથે."
                    : "Operate multiple legal companies and branches under one account with instant context switching and role-based access control."}
                </p>
              </div>

              <div className="reveal-on-scroll reveal-delay-3 p-3 bg-purple-50 rounded-xl border border-purple-200 text-purple-900 saas-card-interactive group">
                <h4 className="font-bold text-purple-950 group-hover:text-purple-700 transition-colors">
                  {lang === "gu" ? "સુપરએડમિન કંટ્રોલ પોર્ટલ" : "SuperAdmin Master Control Portal"}
                </h4>
                <p className="text-[11px] text-purple-700 mt-0.5 leading-relaxed">
                  {lang === "gu"
                    ? "પ્લેટફોર્મ એડમિનિસ્ટ્રેશન અને ક્લાયન્ટ સપોર્ટ માટે અધિકૃત ટેનન્ટ સપોર્ટ સેશન."
                    : "Platform administration with authorized tenant impersonation support session for instant client assistance."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 10. BENEFITS FOR INDIAN BUSINESS TYPES ================= */}
      <section id="business-types" className="py-12 sm:py-20 px-3.5 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-gradient-to-b from-[#F7F8FA] to-white border-t border-[#E5E7EB] scroll-mt-20 sm:scroll-mt-24">
        <div className="reveal-on-scroll text-center max-w-3xl mx-auto space-y-3 mb-8 sm:mb-12">
          <span className="text-xs font-bold text-[#F47721] uppercase tracking-wider">
            {lang === "gu" ? "વેપારી ઉકેલો" : "Tailored Solutions"}
          </span>
          <h2 className="text-xl xs:text-2xl sm:text-4xl font-extrabold text-[#18263B] tracking-tight break-words">
            {lang === "gu"
              ? "દરેક પ્રકારના ભારતીય વેપાર માટે અનુકૂળ"
              : "Built for Every Type of Indian Business"}
          </h2>
          <p className="text-xs sm:text-sm text-[#667085] break-words">
            {lang === "gu"
              ? "તમારો વ્યવસાય ગમે તે ક્ષેત્રનો હોય, MyBill History સરળતાથી ગોઠવાઈ જાય છે."
              : "From fast-turnover retail shops to multi-godown distributors and fabricators."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {businessTypes.map((b, idx) => (
            <div
              key={idx}
              className={`reveal-on-scroll reveal-delay-${(idx % 3) + 1} saas-card-interactive bg-white p-4.5 sm:p-6 rounded-2xl border border-[#E5E7EB] hover:border-[#FED7AA] shadow-xs hover:shadow-md transition-all space-y-3 group`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl sm:text-3xl group-hover:scale-110 transition-transform duration-200">{b.icon}</span>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#FFF3E8] text-[#C2410C] border border-[#FED7AA]">
                  {b.badge}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-[#18263B] group-hover:text-[#F47721] transition-colors">{b.title}</h3>
              <p className="text-xs text-[#667085] leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= 11. HOW IT WORKS (4 SIMPLE STEPS) ================= */}
      <section id="how-it-works" className="py-12 sm:py-20 px-3.5 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#E5E7EB] scroll-mt-20 sm:scroll-mt-24">
        <div className="reveal-on-scroll text-center max-w-2xl mx-auto space-y-3 mb-8 sm:mb-12">
          <span className="text-xs font-bold text-[#F47721] uppercase tracking-wider">
            {lang === "gu" ? "સરળ શરૂઆત" : "How It Works"}
          </span>
          <h2 className="text-xl xs:text-2xl sm:text-4xl font-extrabold text-[#18263B] tracking-tight break-words">
            {lang === "gu" ? "૪ સરળ સ્ટેપ્સમાં શરૂ કરો" : "Get Started in 4 Simple Steps"}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="reveal-on-scroll reveal-delay-1 saas-card-interactive bg-white p-4.5 sm:p-6 rounded-2xl border border-[#E5E7EB] text-center space-y-2 shadow-xs group">
            <div className="w-10 h-10 rounded-full bg-[#F47721] text-white font-extrabold flex items-center justify-center mx-auto text-sm shadow-saffron group-hover:scale-110 group-hover:bg-[#D95F12] transition-all duration-200">
              1
            </div>
            <h3 className="text-sm font-bold text-[#18263B] group-hover:text-[#F47721] transition-colors">
              {lang === "gu" ? "કંપની સેટઅપ કરો" : "Setup Business & GSTIN"}
            </h3>
            <p className="text-xs text-[#667085] leading-relaxed">
              {lang === "gu" ? "તમારું નામ, પેઢી અને જીએસટી નંબર નોંધો." : "Register and configure your trade name, GSTIN, and financial year."}
            </p>
          </div>

          <div className="reveal-on-scroll reveal-delay-2 saas-card-interactive bg-white p-4.5 sm:p-6 rounded-2xl border border-[#E5E7EB] text-center space-y-2 shadow-xs group">
            <div className="w-10 h-10 rounded-full bg-[#F47721] text-white font-extrabold flex items-center justify-center mx-auto text-sm shadow-saffron group-hover:scale-110 group-hover:bg-[#D95F12] transition-all duration-200">
              2
            </div>
            <h3 className="text-sm font-bold text-[#18263B] group-hover:text-[#F47721] transition-colors">
              {lang === "gu" ? "બિલ બનાવો & નોંધો" : "Fast Invoicing & Purchase Entry"}
            </h3>
            <p className="text-xs text-[#667085] leading-relaxed">
              {lang === "gu" ? "F2 થી વેચાણ બિલ આપો અને ખરીદી બિલ સરળતાથી નોંધો." : "Issue sales invoices via F2 and record purchase bills seamlessly."}
            </p>
          </div>

          <div className="reveal-on-scroll reveal-delay-3 saas-card-interactive bg-white p-4.5 sm:p-6 rounded-2xl border border-[#E5E7EB] text-center space-y-2 shadow-xs group">
            <div className="w-10 h-10 rounded-full bg-[#F47721] text-white font-extrabold flex items-center justify-center mx-auto text-sm shadow-saffron group-hover:scale-110 group-hover:bg-[#D95F12] transition-all duration-200">
              3
            </div>
            <h3 className="text-sm font-bold text-[#18263B] group-hover:text-[#F47721] transition-colors">
              {lang === "gu" ? "સ્ટોક અને ખાતાવહી મેળવો" : "Auto-Sync Stock & Ledgers"}
            </h3>
            <p className="text-xs text-[#667085] leading-relaxed">
              {lang === "gu" ? "ગોડાઉન સ્ટોક અને પાર્ટી લેજર્સ આપોઆપ અપડેટ થશે." : "Inventory and party account ledger balances update instantaneously."}
            </p>
          </div>

          <div className="reveal-on-scroll reveal-delay-4 saas-card-interactive bg-white p-4.5 sm:p-6 rounded-2xl border border-[#E5E7EB] text-center space-y-2 shadow-xs group">
            <div className="w-10 h-10 rounded-full bg-[#F47721] text-white font-extrabold flex items-center justify-center mx-auto text-sm shadow-saffron group-hover:scale-110 group-hover:bg-[#D95F12] transition-all duration-200">
              4
            </div>
            <h3 className="text-sm font-bold text-[#18263B] group-hover:text-[#F47721] transition-colors">
              {lang === "gu" ? "રિપોર્ટ્સ & જીએસટી ફાઇલિંગ" : "1-Click GST Returns"}
            </h3>
            <p className="text-xs text-[#667085] leading-relaxed">
              {lang === "gu" ? "GSTR-1 અને 3B રિપોર્ટ્સ ડાઉનલોડ કરીને CA ને મોકલો." : "Download Excel/CSV statements for GSTR-1 and GSTR-3B tax compliance."}
            </p>
          </div>
        </div>
      </section>

      {/* ================= 12. FREQUENTLY ASKED QUESTIONS (FAQ) ================= */}
      <section id="faq" className="py-12 sm:py-20 px-3.5 sm:px-6 lg:px-8 max-w-4xl mx-auto border-t border-[#E5E7EB] scroll-mt-20 sm:scroll-mt-24">
        <div className="reveal-on-scroll text-center space-y-3 mb-8 sm:mb-12">
          <span className="text-xs font-bold text-[#F47721] uppercase tracking-wider">
            {lang === "gu" ? "સામાન્ય પ્રશ્નો" : "Frequently Asked Questions"}
          </span>
          <h2 className="text-xl xs:text-2xl sm:text-4xl font-extrabold text-[#18263B] tracking-tight break-words">
            {lang === "gu"
              ? "તમારા મનમાં મૂંઝવતા પ્રશ્નોના જવાબો"
              : "Clear Answers for Smart Business Owners"}
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className={`reveal-on-scroll reveal-delay-${(idx % 4) + 1} bg-white rounded-2xl border border-[#E5E7EB] hover:border-[#FED7AA] overflow-hidden transition-all shadow-xs`}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${idx}`}
                  className="w-full p-3.5 sm:p-5 text-left flex items-start sm:items-center justify-between gap-3 font-bold text-xs sm:text-sm text-[#18263B] hover:text-[#F47721] transition-colors cursor-pointer min-h-[44px]"
                >
                  <span className="break-words flex-1 leading-snug">{faq.q}</span>
                  <span
                    className={`text-base transition-transform duration-300 shrink-0 mt-0.5 sm:mt-0 ${
                      isOpen ? "rotate-180 text-[#F47721]" : "text-[#667085]"
                    }`}
                  >
                    ▼
                  </span>
                </button>
                {isOpen && (
                  <div
                    id={`faq-answer-${idx}`}
                    role="region"
                    className="px-3.5 sm:px-5 pb-5 text-xs text-[#667085] leading-relaxed border-t border-[#F3F4F6] pt-3 animate-fadeIn break-words"
                  >
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= 13. FINAL CALL TO ACTION BANNER ================= */}
      <section className="py-12 sm:py-16 px-3.5 sm:px-6 lg:px-8 max-w-6xl mx-auto reveal-scale-in">
        <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#F47721] via-[#E05D06] to-[#C2410C] p-6 sm:p-14 text-center text-white shadow-xl overflow-hidden border border-orange-400/30">
          {/* Subtle background ambient circles */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-black/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <h2 className="text-xl xs:text-2xl sm:text-4xl font-extrabold tracking-normal break-words">
              {lang === "gu"
                ? "આજે જ તમારા વ્યવસાયનું સ્માર્ટ બિલિંગ શરૂ કરો"
                : "Ready to Transform Your Business Invoicing?"}
            </h2>
            <p className="text-xs sm:text-sm text-white/95 leading-relaxed font-medium break-words">
              {lang === "gu"
                ? "સરળ જીએસટી બિલિંગ, ડિજિટલ બિલ સ્કેનર, ગોડાઉન સ્ટોક અને પાકી નામા પદ્ધતિ—તમામ સુવિધાઓ એક જ સુરક્ષિત સોફ્ટવેરમાં."
                : "Fast billing, smart purchase entry, multi-godown stock, and double-entry accounting in one unified platform."}
            </p>

            <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-md mx-auto w-full px-2 sm:px-0">
              <Link
                href="/login?mode=signup"
                className="w-full sm:w-auto px-6 sm:px-8 py-3.5 bg-white hover:bg-[#FFF8F3] text-[#F47721] font-extrabold text-sm sm:text-base rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer inline-flex items-center justify-center gap-2 min-h-[46px] text-center"
              >
                <span>{lang === "gu" ? "મફત નોંધણી કરો (Get Started)" : "Get Started Free (30-Day Trial)"}</span>
                <span className="shrink-0 transition-transform duration-200 group-hover:translate-x-1">→</span>
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-6 sm:px-7 py-3.5 bg-black/20 hover:bg-black/30 text-white font-bold text-sm sm:text-base rounded-2xl border border-white/35 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer min-h-[46px] inline-flex items-center justify-center text-center"
              >
                {lang === "gu" ? "લોગિન પોર્ટલ (Sign In)" : "Sign In to Workspace"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 14. COMPREHENSIVE FOOTER ================= */}
      <footer className="border-t border-[#E5E7EB] bg-white py-10 sm:py-12 px-3.5 sm:px-6 lg:px-8 text-xs text-[#667085]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Col 1: Brand Info */}
          <div className="reveal-on-scroll reveal-delay-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#F47721] flex items-center justify-center text-white font-bold text-base shadow-saffron shrink-0">
                ₹
              </div>
              <span className="font-extrabold text-base text-[#202124]">
                MyBill History
              </span>
            </div>
            <p className="text-xs text-[#667085] leading-relaxed">
              {lang === "gu"
                ? "આધુનિક ભારતીય જીએસટી બિલિંગ, સ્માર્ટ ખરીદી સ્કેનર અને પાકી નામા પદ્ધતિ ERP."
                : "Next-generation Indian GST Billing, Smart Purchase Scanner & Double-Entry Accounting ERP."}
            </p>
            <p className="text-[11px] font-semibold text-[#202124]">
              {lang === "gu"
                ? "પનેલિયા ટેકનોલોજી, ગુજરાત, ભારત દ્વારા નિર્મિત."
                : "Developed by Paneliya Technology, Gujarat, India."}
            </p>
          </div>

          {/* Col 2: Core Modules */}
          <div className="reveal-on-scroll reveal-delay-2 space-y-2">
            <p className="font-bold text-[#202124] uppercase text-[11px] tracking-wider mb-2">
              {lang === "gu" ? "મુખ્ય મોડ્યુલ્સ" : "Core Modules"}
            </p>
            <p>
              <Link href="/features" className="hover:text-[#F47721] font-bold text-[#F47721] transition-colors inline-block py-0.5">
                {lang === "gu" ? "તમામ ૨૮+ સુવિધાઓ વિગતવાર જુઓ →" : "Explore All 28+ Features Showcase →"}
              </Link>
            </p>
            <p>
              <a href="#sales-billing" className="hover:text-[#F47721] transition-colors inline-block py-0.5">
                {lang === "gu" ? "જીએસટી ટેક્સ ઇન્વોઇસિંગ & POS કાઉન્ટર" : "GST Tax Invoicing & POS Counter"}
              </a>
            </p>
            <p>
              <a href="#purchases-inventory" className="hover:text-[#F47721] transition-colors inline-block py-0.5">
                {lang === "gu" ? "સ્માર્ટ ખરીદી બિલ સ્કેનર (OCR)" : "Smart Bill Scanner (OCR)"}
              </a>
            </p>
            <p>
              <a href="#purchases-inventory" className="hover:text-[#F47721] transition-colors inline-block py-0.5">
                {lang === "gu" ? "મલ્ટી-ગોડાઉન સ્ટોક ટ્રાન્સફર" : "Multi-Godown Stock Transfers"}
              </a>
            </p>
            <p>
              <a href="#accounting-ledgers" className="hover:text-[#F47721] transition-colors inline-block py-0.5">
                {lang === "gu" ? "રોજમેળ & રોકડ ખાતાવહી (Cash Book)" : "Daybook & Cash Book (રોજમેળ)"}
              </a>
            </p>
            <p>
              <a href="#gst-statutory" className="hover:text-[#F47721] transition-colors inline-block py-0.5">
                {lang === "gu" ? "GSTR-1 & GSTR-3B રિટર્ન તૈયારી" : "GSTR-1 & GSTR-3B Filing Preparation"}
              </a>
            </p>
            <p>
              <a href="#reports-analytics" className="hover:text-[#F47721] transition-colors inline-block py-0.5">
                {lang === "gu" ? "ઉત્પાદન મેનેજમેન્ટ (BOM અને પ્રોડક્શન)" : "Manufacturing (BOM & Production)"}
              </a>
            </p>
          </div>

          {/* Col 3: Business Solutions */}
          <div className="reveal-on-scroll reveal-delay-3 space-y-2">
            <p className="font-bold text-[#202124] uppercase text-[11px] tracking-wider mb-2">
              {lang === "gu" ? "વેપારી ઉકેલો" : "Solutions"}
            </p>
            <p>
              <a href="#business-types" className="hover:text-[#F47721] transition-colors inline-block py-0.5">
                {lang === "gu" ? "રિટેલ સ્ટોર્સ અને POS કાઉન્ટર" : "Retail Shops & POS Counters"}
              </a>
            </p>
            <p>
              <a href="#business-types" className="hover:text-[#F47721] transition-colors inline-block py-0.5">
                {lang === "gu" ? "હોલસેલ અને B2B ટ્રેડિંગ" : "Wholesale & B2B Trading"}
              </a>
            </p>
            <p>
              <a href="#business-types" className="hover:text-[#F47721] transition-colors inline-block py-0.5">
                {lang === "gu" ? "ડિસ્ટ્રિબ્યુટર્સ અને ગોડાઉન નેટવર્ક" : "Distributors & Godown Networks"}
              </a>
            </p>
            <p>
              <a href="#business-types" className="hover:text-[#F47721] transition-colors inline-block py-0.5">
                {lang === "gu" ? "લઘુ ઉદ્યોગ અને ઉત્પાદકો" : "Small Scale Manufacturers"}
              </a>
            </p>
            <p>
              <a href="#business-types" className="hover:text-[#F47721] transition-colors inline-block py-0.5">
                {lang === "gu" ? "પ્રોફેશનલ સર્વિસ ઇન્વોઇસિંગ" : "Professional Service Invoicing"}
              </a>
            </p>
          </div>

          {/* Col 4: Quick Access & Authentication */}
          <div className="reveal-on-scroll reveal-delay-4 space-y-2">
            <p className="font-bold text-[#202124] uppercase text-[11px] tracking-wider mb-2">
              {lang === "gu" ? "પોર્ટલ પ્રવેશ" : "Portal Access"}
            </p>
            <p>
              <Link href="/login" className="hover:text-[#F47721] font-semibold transition-colors inline-flex items-center gap-1 py-0.5">
                {lang === "gu" ? "ડેશબોર્ડમાં પ્રવેશ કરો (Sign In) →" : "Sign In to Dashboard →"}
              </Link>
            </p>
            <p>
              <Link href="/login?mode=signup" className="hover:text-[#F47721] font-semibold transition-colors inline-flex items-center gap-1 py-0.5">
                {lang === "gu" ? "મફત એકાઉન્ટ બનાવો (Sign Up) →" : "Create Free Account (Sign Up) →"}
              </Link>
            </p>
            <p>
              <a href="#faq" className="hover:text-[#F47721] transition-colors inline-block py-0.5">
                {lang === "gu" ? "સામાન્ય પ્રશ્નોત્તરી (FAQ)" : "Frequently Asked Questions"}
              </a>
            </p>
            <div className="pt-2">
              <span className="text-[10px] bg-[#FFF3E8] text-[#C2410C] px-2.5 py-1 rounded-md font-bold border border-[#FED7AA] inline-block shadow-sm">
                {lang === "gu" ? "૧૦૦% ભારતીય જીએસટી અને દેશી નામા પદ્ધતિ" : "100% Indian GST & Nama Ready"}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Bottom Row */}
        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-[#F3F4F6] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#98A2B3] text-center sm:text-left reveal-on-scroll reveal-delay-2">
          <p>© {new Date().getFullYear()} MyBill History by Paneliya Technology. {lang === "gu" ? "સર્વાધિકાર સુરક્ષિત." : "All rights reserved."}</p>
          <p>{lang === "gu" ? "ગુજરાત, ભારતના વેપારીઓ અને MSME માટે પ્રેમથી નિર્મિત ❤️" : "Designed with ❤️ for Indian MSMEs & Retailers in Gujarat, India."}</p>
        </div>
      </footer>
    </div>
  );
}
