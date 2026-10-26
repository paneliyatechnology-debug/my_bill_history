"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "../../context/auth-context";
import { BrandLogo } from "../ui/brand-logo";

export const ease = [0.22, 1, 0.36, 1] as const;
export const serif = { fontFamily: "var(--font-playfair), var(--font-noto-gujarati), Georgia, serif" } as const;
export const mono = { fontFamily: "var(--font-dm-mono), ui-monospace, monospace" } as const;

export const MARKETING_NAV = [
  { href: "/intro#why", hash: "#why", en: "Why myownbillbook", gu: "શા માટે", testId: "nav-why" },
  { href: "/intro#modules", hash: "#modules", en: "Features", gu: "સુવિધાઓ", testId: "nav-features" },
  { href: "/intro#business-types", hash: "#business-types", en: "For your business", gu: "તમારા વેપાર માટે", testId: "nav-solutions" },
  { href: "/intro#pricing", hash: "#pricing", en: "Pricing", gu: "કિંમત", testId: "nav-pricing" },
  { href: "/intro#faq", hash: "#faq", en: "Questions", gu: "પ્રશ્નોત્તરી", testId: "nav-faq" },
] as const;

export function Arrow() {
  return (
    <span aria-hidden className="inline-block transition-transform duration-300 group-hover:translate-x-1">
      →
    </span>
  );
}

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: reduce ? 0 : 0.75, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

export function BluePhoto({
  src,
  alt,
  className = "",
  sizes = "(min-width: 1024px) 560px, 100vw",
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <div className={`overflow-hidden bg-[#102033] ${className.includes("absolute") ? "" : "relative"} ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover scale-[1.02]"
        style={{
          filter: "grayscale(18%) contrast(1.08) saturate(0.72) sepia(18%) hue-rotate(188deg)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[#1E589D]/28 mix-blend-multiply" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#102033]/45 via-transparent to-[#102033]/10" />
    </div>
  );
}

export function MarketingHeader({
  mode = "site",
  onHash,
}: {
  mode?: "landing" | "site";
  onHash?: (href: string) => void;
}) {
  const { lang, setLang } = useAuth();
  const gu = lang === "gu";
  const [openNav, setOpenNav] = useState(false);

  useEffect(() => {
    document.body.style.overflow = openNav ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [openNav]);

  const go = (item: (typeof MARKETING_NAV)[number]) => {
    setOpenNav(false);
    if (mode === "landing" && onHash) {
      onHash(item.hash);
      return;
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#102033]/10 bg-[#F3EBDD]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-3 px-4 sm:h-[4.25rem] sm:px-8">
          <div data-testid="nav-logo" className="min-w-0 shrink-0">
            <BrandLogo size="md" showSubtitle subtitle="Paneliya Technology" />
          </div>
          <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
            {MARKETING_NAV.map((item) => (
              <Link
                key={item.testId}
                href={mode === "landing" ? item.hash : item.href}
                data-testid={item.testId}
                onClick={(e) => {
                  if (mode === "landing") {
                    e.preventDefault();
                    go(item);
                  }
                }}
                className="text-[0.92rem] text-[#102033]/80 transition-colors hover:text-[#102033]"
              >
                {gu ? item.gu : item.en}
              </Link>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              data-testid="lang-toggle"
              aria-label={gu ? "Switch to English" : "Switch to Gujarati"}
              onClick={() => setLang(gu ? "en" : "gu")}
              className="rounded-full border border-[#102033]/15 px-2.5 py-1.5 text-[0.68rem] tracking-[0.12em] sm:px-3 sm:text-[0.72rem]"
              style={mono}
            >
              {gu ? "ગુજ/ EN" : "EN / ગુજ"}
            </button>
            <Link href="/login" data-testid="nav-sign-in" className="hidden text-sm font-medium md:inline">
              {gu ? "લોગિન" : "Sign In"}
            </Link>
            <Link
              href="/login?mode=signup"
              data-testid="nav-get-started"
              className="group hidden items-center gap-2 rounded-full bg-[#102033] px-4 py-2 text-sm font-semibold text-[#F3EBDD] transition-transform hover:-translate-y-0.5 sm:inline-flex"
            >
              {gu ? "મફત શરૂ કરો" : "Start free"} <Arrow />
            </Link>
            <button
              type="button"
              data-testid="mobile-menu-button"
              aria-expanded={openNav}
              aria-label={openNav ? "Close menu" : "Open menu"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#102033]/15 lg:hidden"
              onClick={() => setOpenNav((value) => !value)}
            >
              <span className="sr-only">Menu</span>
              <span className="flex w-4 flex-col gap-1.5">
                <span className={`h-px bg-[#102033] transition ${openNav ? "translate-y-[3.5px] rotate-45" : ""}`} />
                <span className={`h-px bg-[#102033] transition ${openNav ? "-translate-y-[3.5px] -rotate-45" : ""}`} />
              </span>
            </button>
          </div>
        </div>
      </header>

      {openNav && (
        <div data-testid="mobile-drawer" className="fixed inset-0 z-30 overflow-y-auto bg-[#F3EBDD] px-6 pb-10 pt-24 lg:hidden">
          <nav className="flex flex-col gap-5" aria-label="Mobile">
            {MARKETING_NAV.map((item) =>
              mode === "landing" ? (
                <button
                  key={item.testId}
                  type="button"
                  data-testid={`mobile-${item.testId.replace("nav-", "")}`}
                  onClick={() => go(item)}
                  className="text-left text-4xl"
                  style={serif}
                >
                  {gu ? item.gu : item.en}
                </button>
              ) : (
                <Link
                  key={item.testId}
                  href={item.href}
                  data-testid={`mobile-${item.testId.replace("nav-", "")}`}
                  onClick={() => setOpenNav(false)}
                  className="text-4xl"
                  style={serif}
                >
                  {gu ? item.gu : item.en}
                </Link>
              ),
            )}
            <Link href="/features" data-testid="mobile-all-features" className="text-lg" onClick={() => setOpenNav(false)}>
              {gu ? "તમામ ૨૮+ સુવિધાઓ વિગતવાર જુઓ" : "View All 28+ Features"}
            </Link>
            <Link href="/login" data-testid="mobile-sign-in" className="text-lg" onClick={() => setOpenNav(false)}>
              {gu ? "લોગિન" : "Sign In"}
            </Link>
            <Link
              href="/login?mode=signup"
              data-testid="mobile-get-started"
              className="mt-2 inline-flex w-fit rounded-full bg-[#102033] px-5 py-3 text-[#F3EBDD]"
              onClick={() => setOpenNav(false)}
            >
              {gu ? "ખાતું બનાવો" : "Get Started"}
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}

export function MarketingFooter() {
  const { lang } = useAuth();
  const gu = lang === "gu";
  return (
    <footer data-testid="marketing-footer" className="border-t border-[#102033]/10 bg-[#F3EBDD]">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-12 sm:px-8 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <BrandLogo size="md" />
          <p className="max-w-xs text-sm leading-relaxed text-[#102033]/70">
            {gu
              ? "આધુનિક ભારતીય જીએસટી બિલિંગ, ખરીદી સ્કેનર અને પાકી નામા પદ્ધતિ ERP."
              : "Indian GST Billing, Purchase Bill Scanner & Double-Entry Accounting ERP."}
          </p>
          <p className="text-xs tracking-[0.12em] text-[#8A7056]" style={mono}>
            {gu ? "પનેલિયા ટેકનોલોજી, ગુજરાત" : "Paneliya Technology, Gujarat"}
          </p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="text-[0.72rem] uppercase tracking-[0.16em] text-[#8A7056]" style={mono}>
            {gu ? "મુખ્ય મોડ્યુલ્સ" : "Product"}
          </p>
          <Link href="/features" className="block text-[#C24E1D]">
            {gu ? "તમામ ૨૮+ સુવિધાઓ વિગતવાર જુઓ" : "Explore All 28+ Features"}
          </Link>
          <Link href="/intro#sales-billing" className="block hover:text-[#C24E1D]">
            {gu ? "જીએસટી ટેક્સ ઇન્વોઇસિંગ & POS" : "GST Tax Invoicing & POS"}
          </Link>
          <Link href="/intro#purchases-inventory" className="block hover:text-[#C24E1D]">
            {gu ? "ખરીદી બિલ સ્કેનર (OCR)" : "Bill Scanner (OCR)"}
          </Link>
          <Link href="/intro#accounting-ledgers" className="block hover:text-[#C24E1D]">
            {gu ? "રોજમેળ & રોકડ ખાતાવહી" : "Daybook & Cash Book"}
          </Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="text-[0.72rem] uppercase tracking-[0.16em] text-[#8A7056]" style={mono}>
            {gu ? "વેપારી ઉકેલો" : "Solutions"}
          </p>
          <Link href="/intro#business-types" className="block hover:text-[#C24E1D]">
            {gu ? "રિટેલ સ્ટોર્સ અને POS કાઉન્ટર" : "Retail Shops & POS Counters"}
          </Link>
          <Link href="/intro#business-types" className="block hover:text-[#C24E1D]">
            {gu ? "હોલસેલ અને B2B ટ્રેડિંગ" : "Wholesale & B2B Trading"}
          </Link>
          <Link href="/intro#business-types" className="block hover:text-[#C24E1D]">
            {gu ? "ડિસ્ટ્રિબ્યુટર્સ અને સ્ટોકિસ્ટ" : "Distributors & Stockists"}
          </Link>
          <Link href="/intro#business-types" className="block hover:text-[#C24E1D]">
            {gu ? "લઘુ ઉદ્યોગ અને ઉત્પાદકો" : "Small Scale Manufacturers"}
          </Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="text-[0.72rem] uppercase tracking-[0.16em] text-[#8A7056]" style={mono}>
            {gu ? "પોર્ટલ પ્રવેશ" : "Company"}
          </p>
          <Link href="/login" data-testid="footer-sign-in" className="block underline decoration-[#102033]/30 underline-offset-4">
            {gu ? "ડેશબોર્ડમાં પ્રવેશ કરો (Sign In)" : "Sign In to Dashboard"}
          </Link>
          <Link href="/login?mode=signup" data-testid="footer-sign-up" className="block hover:text-[#C24E1D]">
            {gu ? "મફત એકાઉન્ટ બનાવો (Sign Up)" : "Create Free Account (Sign Up)"}
          </Link>
          <Link href="/intro#voices" className="block hover:text-[#C24E1D]">
            {gu ? "વેપારીઓના અનુભવો" : "Customer stories"}
          </Link>
          <Link href="/intro#faq" className="block hover:text-[#C24E1D]">
            {gu ? "સામાન્ય પ્રશ્નોત્તરી (FAQ)" : "Frequently Asked Questions"}
          </Link>
        </div>
      </div>
      <div className="border-t border-[#102033]/10">
        <p className="mx-auto max-w-[1240px] px-5 py-5 text-xs text-[#8A7056] sm:px-8" style={mono}>
          © 2026 myownbillbook · Paneliya Technology
        </p>
      </div>
    </footer>
  );
}
