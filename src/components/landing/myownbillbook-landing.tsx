"use client";

import React, { useState, useEffect } from "react";
import Lenis from "lenis";
import { useAuth } from "../../context/auth-context";

// Premium Human-Designed Website Components (V2)
import { Navbar } from "../website/Navbar";
import { HeroSection } from "../website/HeroSection";
import { TrustSection } from "../website/TrustSection";
import { FeaturesSection } from "../website/FeaturesSection";
import { ProductShowcase } from "../website/ProductShowcase";
import { InvoicingSection } from "../website/InvoicingSection";
import { InventorySection } from "../website/InventorySection";
import { AccountingSection } from "../website/AccountingSection";
import { IndustrySection } from "../website/IndustrySection";
import { BenefitsSection } from "../website/BenefitsSection";
import { TestimonialsSection } from "../website/TestimonialsSection";
import { PricingSection } from "../website/PricingSection";
import { FAQSection } from "../website/FAQSection";
import { FinalCTA } from "../website/FinalCTA";
import { Footer } from "../website/Footer";
import { BookDemoModal } from "./book-demo-modal";

export function MyownbillbookLanding() {
  const { lang, setLang } = useAuth();
  const gu = lang === "gu";
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  // Initialize smooth scrolling with Lenis
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      anchors: true,
      lerp: 0.09,
      respectReducedMotion: true,
    });
    return () => lenis.destroy();
  }, []);

  const handleToggleLang = () => {
    setLang(gu ? "en" : "gu");
  };

  const handleOpenDemo = () => {
    setIsDemoModalOpen(true);
  };

  return (
    <div
      className="min-h-screen bg-white text-[#172033] selection:bg-[#2563EB]/20 selection:text-[#172033] overflow-x-hidden"
      style={{
        fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* 1. EDITORIAL HEADER & NAVIGATION */}
      <Navbar
        lang={lang}
        onToggleLang={handleToggleLang}
        onOpenDemo={handleOpenDemo}
      />

      <main>
        {/* 2. EDITORIAL HERO SECTION */}
        <HeroSection
          lang={lang}
          onOpenDemo={handleOpenDemo}
        />

        {/* 3. MINIMAL TEXT-FIRST TRUST & CAPABILITIES STRIP */}
        <TrustSection lang={lang} />

        {/* 4. ASYMMETRIC EDITORIAL FEATURES SECTION */}
        <FeaturesSection lang={lang} />

        {/* 5. INTERACTIVE PRODUCT EXPERIENCE & REAL SCREENSHOTS */}
        <ProductShowcase lang={lang} />

        {/* 6. STATUTORY GST INVOICING SECTION */}
        <InvoicingSection lang={lang} />

        {/* 7. LIVE MULTI-GODOWN INVENTORY SECTION */}
        <InventorySection lang={lang} />

        {/* 8. DOUBLE-ENTRY ACCOUNTING & P&L SECTION */}
        <AccountingSection lang={lang} />

        {/* 9. TAILORED INDUSTRY SOLUTIONS (PHOTOGRAPHY-DRIVEN) */}
        <IndustrySection lang={lang} />

        {/* 10. WHY MYOWN BILLBOOK (5 CORE PILLARS) */}
        <BenefitsSection lang={lang} />

        {/* 11. VERIFIED CUSTOMER TESTIMONIALS */}
        <TestimonialsSection lang={lang} />

        {/* 12. TRANSPARENT PRICING & SUBSCRIPTIONS */}
        <PricingSection
          lang={lang}
          onOpenDemo={handleOpenDemo}
        />

        {/* 13. FREQUENTLY ASKED QUESTIONS (TEXT-FIRST ACCORDION) */}
        <FAQSection lang={lang} />

        {/* 14. POWERFUL CLOSING CTA */}
        <FinalCTA
          lang={lang}
          onOpenDemo={handleOpenDemo}
        />
      </main>

      {/* 15. MINIMAL MULTI-COLUMN FOOTER */}
      <Footer
        lang={lang}
        onToggleLang={handleToggleLang}
      />

      {/* 16. BOOK A DEMO MODAL */}
      <BookDemoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        lang={lang}
      />
    </div>
  );
}
