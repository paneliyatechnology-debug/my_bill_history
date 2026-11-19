"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
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

  // Cross-browser scroll position detector for reliable header transition
  useEffect(() => {
    const checkScroll = () => {
      const scrollY =
        window.pageYOffset ||
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;
      setIsScrolled(scrollY > 15);
    };

    checkScroll();
    window.addEventListener("scroll", checkScroll, { passive: true });
    document.addEventListener("scroll", checkScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", checkScroll);
      document.removeEventListener("scroll", checkScroll);
    };
  }, []);

  const navLinks = [
    {
      title: gu ? "શા માટે MyOwnBillBook" : "Why MyOwnBillBook",
      href: "#why-us",
    },
    {
      title: gu ? "ફીચર્સ" : "Features",
      href: "#features",
    },
    {
      title: gu ? "સોલ્યુશન્સ" : "Solutions",
      href: "#solutions",
    },
    {
      title: gu ? "કિંમત & પ્લાન્સ" : "Pricing",
      href: "#pricing",
    },
    {
      title: gu ? "સહાય & પ્રશ્નો" : "Resources",
      href: "#faq",
    },
  ];

  // Offset-aware smooth scrolling to anchors
  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (href.startsWith("#")) {
        e.preventDefault();
        const targetId = href.substring(1);
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          const navHeight = 80;
          const rect = targetEl.getBoundingClientRect();
          const currentScroll =
            window.pageYOffset || document.documentElement.scrollTop || 0;
          const targetY = rect.top + currentScroll - navHeight;

          window.scrollTo({
            top: Math.max(0, targetY),
            behavior: "smooth",
          });

          if (window.history && window.history.pushState) {
            window.history.pushState(null, "", href);
          }
        }
        setMobileMenuOpen(false);
      }
    },
    []
  );

  return (
    <>
      {/* Pinned Fixed Top Navigation Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-200 ${
          isScrolled
            ? "bg-white/95 backdrop-blur-md shadow-xs border-b border-[#E5EAF1]"
            : "bg-[#F7F9FC] border-b border-[#E5EAF1]/70"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Left: Brand Logo & Tagline */}
            <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-[#E5EAF1] shadow-2xs flex items-center justify-center p-1.5 transition-transform group-hover:scale-105 shrink-0">
                <Image
                  src="/logo-icon.png"
                  alt="MyOwnBillBook Logo"
                  width={30}
                  height={30}
                  className="object-contain"
                  priority
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span
                  className="text-base sm:text-xl font-semibold tracking-tight text-[#172033] leading-none truncate"
                  style={{ fontFamily: "var(--font-manrope)" }}
                >
                  MyOwn<span className="text-[#2563EB]">BillBook</span>
                </span>
                <span className="text-[10px] sm:text-[11px] font-medium text-[#667085] tracking-wide mt-1 truncate">
                  {gu ? "સ્માર્ટ બિલિંગ અને એકાઉન્ટિંગ" : "Smart Billing & Accounting"}
                </span>
              </div>
            </Link>

            {/* Center Navigation Links (Desktop) */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="px-3 xl:px-3.5 py-2 text-[13px] xl:text-[14px] font-medium text-[#172033] hover:text-[#2563EB] rounded-lg transition-colors cursor-pointer"
                  style={{ fontFamily: "var(--font-inter)" }}
                >
                  {link.title}
                </a>
              ))}
            </nav>

            {/* Right Action CTAs */}
            <div className="hidden lg:flex items-center gap-2.5 xl:gap-3">
              {onToggleLang && (
                <button
                  type="button"
                  onClick={onToggleLang}
                  className="h-10 px-3 rounded-xl border border-[#E5EAF1] bg-white hover:bg-[#F7F9FC] text-xs font-semibold text-[#172033] flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  title="Switch Language / ભાષા બદલો"
                >
                  <Globe className="w-3.5 h-3.5 text-[#2563EB]" strokeWidth={1.75} />
                  <span>{gu ? "English" : "ગુજરાતી"}</span>
                </button>
              )}

              {/* Sign In */}
              <Link
                href="/login"
                className="h-10 px-3.5 xl:px-4 rounded-xl text-sm font-semibold text-[#172033] hover:text-[#2563EB] hover:bg-white/60 transition-colors flex items-center"
                style={{ fontFamily: "var(--font-inter)" }}
              >
                {gu ? "પ્રવેશ કરો" : "Sign In"}
              </Link>

              {/* Start Free CTA */}
              <a
                href="#pricing"
                onClick={(e) => handleNavClick(e, "#pricing")}
                className="h-10 sm:h-11 px-4 xl:px-5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold flex items-center gap-2 transition-all shadow-xs active:scale-98 cursor-pointer"
                style={{ fontFamily: "var(--font-inter)" }}
              >
                <span>{gu ? "મફત શરૂ કરો" : "Start Free"}</span>
                <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
              </a>
            </div>

            {/* Mobile Hamburger & Controls */}
            <div className="flex items-center gap-2 lg:hidden">
              {onToggleLang && (
                <button
                  type="button"
                  onClick={onToggleLang}
                  className="px-2.5 py-1.5 rounded-lg border border-[#E5EAF1] bg-white text-xs font-semibold text-[#172033]"
                >
                  {gu ? "EN" : "ગુજ"}
                </button>
              )}

              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl border border-[#E5EAF1] bg-white text-[#172033] hover:text-[#2563EB] focus:outline-none transition-colors"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" strokeWidth={1.75} />
                ) : (
                  <Menu className="w-5 h-5" strokeWidth={1.75} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-[#E5EAF1] px-4 pt-3 pb-6 space-y-3 shadow-lg animate-in fade-in duration-150">
            <nav className="flex flex-col space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="px-3 py-2.5 rounded-lg text-sm font-medium text-[#172033] hover:bg-[#F7F9FC] hover:text-[#2563EB] transition-colors"
                >
                  {link.title}
                </a>
              ))}
            </nav>

            <div className="pt-3 border-t border-[#E5EAF1] flex flex-col gap-2.5">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full h-10 rounded-xl border border-[#E5EAF1] bg-white text-sm font-semibold text-[#172033] flex items-center justify-center transition-colors"
              >
                {gu ? "પ્રવેશ કરો (Sign In)" : "Sign In"}
              </Link>

              <a
                href="#pricing"
                onClick={(e) => handleNavClick(e, "#pricing")}
                className="w-full h-11 rounded-xl bg-[#2563EB] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-xs"
              >
                <span>{gu ? "મફત શરૂ કરો (Start Free)" : "Start Free"}</span>
                <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
              </a>

              {onOpenDemo && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenDemo();
                  }}
                  className="w-full py-2 text-xs font-semibold text-[#667085] hover:text-[#172033] text-center"
                >
                  {gu ? "ડેમો બુક કરો (Book a Free Demo)" : "Book a Free Demo"}
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Natural Height Spacer: Prevents content jump and guarantees no header overlap */}
      <div className="h-16 sm:h-20 w-full pointer-events-none" aria-hidden="true" />
    </>
  );
}
