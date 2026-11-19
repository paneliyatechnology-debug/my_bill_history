"use client";

import React, { useState } from "react";
import { useAuth } from "../../context/auth-context";

// Premium SAAS Website Components (Redesigned per Official Guidelines)
import { Navbar } from "../website/Navbar";
import { HeroSection } from "../website/HeroSection";
import { TrustSection } from "../website/TrustSection";
import { WhyUsSection } from "../website/WhyUsSection";
import { FeaturesSection } from "../website/FeaturesSection";
import { HowItWorksSection } from "../website/HowItWorksSection";
import { IndustrySection } from "../website/IndustrySection";
import { AccountingSection } from "../website/AccountingSection";
import { ProductShowcase } from "../website/ProductShowcase";
import { ComparisonSection } from "../website/ComparisonSection";
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

  const handleToggleLang = () => {
    setLang(gu ? "en" : "gu");
  };

  const handleOpenDemo = () => {
    setIsDemoModalOpen(true);
  };

  return (
    <div
      className="min-h-screen bg-[#F7F9FC] text-[#172033] selection:bg-[#2563EB]/20 selection:text-[#172033] overflow-x-clip"
      style={{
        fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* 2. HEADER & NAVIGATION */}
      <Navbar
        lang={lang}
        onToggleLang={handleToggleLang}
        onOpenDemo={handleOpenDemo}
      />

      <main>
        {/* 3. HERO SECTION */}
        <HeroSection
          lang={lang}
          onOpenDemo={handleOpenDemo}
        />

        {/* 4. PRODUCT TRUST STRIP */}
        <TrustSection lang={lang} />

        {/* 5. WHY MYOWNBILLBOOK SECTION */}
        <WhyUsSection lang={lang} />

        {/* 6. COMPLETE PRODUCT FEATURES (8 DETAILED CARDS) */}
        <FeaturesSection lang={lang} />

        {/* 7. HOW IT WORKS (4-STEP TIMELINE) */}
        <HowItWorksSection lang={lang} />

        {/* 8. BUSINESS SOLUTIONS (5 INDUSTRY CARDS WITH REAL PHOTOGRAPHY) */}
        <IndustrySection lang={lang} />

        {/* 9. ACCOUNTING & FINANCIAL VISIBILITY (STATEMENTS MOCKUP) */}
        <AccountingSection lang={lang} />

        {/* 10. INTERACTIVE PRODUCT DEMO (6 FUNCTIONAL TABS) */}
        <ProductShowcase lang={lang} />

        {/* 11. WHY BUSINESSES CHOOSE US (MANUAL VS MYOWNBILLBOOK) */}
        <ComparisonSection lang={lang} />

        {/* 12. CUSTOMER TESTIMONIALS */}
        <TestimonialsSection lang={lang} />

        {/* 13. PRICING SECTION (WITH WORKING RAZORPAY PAYMENT & REGISTRATION) */}
        <PricingSection
          lang={lang}
          onOpenDemo={handleOpenDemo}
        />

        {/* 14. FAQ SECTION (12 ACCORDION QUESTIONS) */}
        <FAQSection lang={lang} />

        {/* 15. FINAL CTA (PREMIUM DEEP NAVY BLOCK) */}
        <FinalCTA
          lang={lang}
          onOpenDemo={handleOpenDemo}
        />
      </main>

      {/* 16. FOOTER (DEEP NAVY 5-COLUMN FOOTER) */}
      <Footer
        lang={lang}
        onToggleLang={handleToggleLang}
      />

      {/* INTERACTIVE BOOK A DEMO MODAL */}
      <BookDemoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        lang={lang}
      />
    </div>
  );
}
