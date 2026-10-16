"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/auth-context";
import { WaveBackground } from "../ui/wave-background";

export function IntroductionPage() {
  const router = useRouter();
  const { lang, setLang } = useAuth();
  const [activeTheme, setActiveTheme] = useState<"saffron" | "blue" | "emerald" | "purple">("saffron");

  const themeColors = {
    saffron: {
      primary: "#F47721",
      name: lang === "gu" ? "કેસરી (Saffron)" : "Saffron Elegance",
      badgeBg: "bg-orange-50 text-[#F47721] border-[#FED7AA]",
    },
    blue: {
      primary: "#1E40AF",
      name: lang === "gu" ? "કોર્પોરેટ બ્લુ (Corporate)" : "Classic Corporate",
      badgeBg: "bg-blue-50 text-blue-700 border-blue-200",
    },
    emerald: {
      primary: "#059669",
      name: lang === "gu" ? "વેપારી ગ્રીન (Emerald)" : "Emerald Merchant",
      badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    purple: {
      primary: "#7C3AED",
      name: lang === "gu" ? "રોયલ પર્પલ (Royal)" : "Royal Modern",
      badgeBg: "bg-purple-50 text-purple-700 border-purple-200",
    },
  };

  return (
    <div className="min-h-screen w-full bg-[#FAFBFD] text-[#202124] relative overflow-x-hidden selection:bg-[#FFF3E8] selection:text-[#F47721]">
      {/* Background Ambience */}
      <WaveBackground variant="dashboard" />

      {/* ================= 1. TOP ANNOUNCEMENT BAR ================= */}
      <div className="relative z-50 bg-gradient-to-r from-[#F47721] via-[#E05D06] to-[#C2410C] text-white text-[11px] sm:text-xs py-2 px-4 text-center font-medium shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 flex-wrap">
          <span className="bg-white/20 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider">
            {lang === "gu" ? "નવી સુવિધા" : "New"}
          </span>
          <span>
            {lang === "gu"
              ? "✨ Google Gemini AI બિલ સ્કેનર અને ઓટોમેટિક જીએસટી રિકન્સિલેશન હવે લાઇવ છે!"
              : "✨ Gemini AI Purchase Bill Scanner & Automatic GST Invoicing is now Live!"}
          </span>
          <Link
            href="/login"
            className="underline font-bold hover:text-white/80 transition-colors ml-1"
          >
            {lang === "gu" ? "શરૂ કરો →" : "Get Started →"}
          </Link>
        </div>
      </div>

      {/* ================= 2. STICKY GLASSMORPHIC NAVBAR ================= */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-[#E5E7EB] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 shrink-0 group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-[#F47721] to-[#FF9343] flex items-center justify-center text-white font-extrabold text-xl shadow-saffron group-hover:scale-105 transition-transform">
              ₹
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg sm:text-xl text-[#202124] tracking-tight leading-tight">
                MyBill <span className="text-[#F47721]">History</span>
              </span>
              <span className="text-[10px] text-[#667085] tracking-wider uppercase font-semibold">
                Paneliya Technology
              </span>
            </div>
          </Link>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-[#475467]">
            <a href="#features" className="hover:text-[#F47721] transition-colors">
              {lang === "gu" ? "સુવિધાઓ" : "Features"}
            </a>
            <a href="#billing" className="hover:text-[#F47721] transition-colors">
              {lang === "gu" ? "જીએસટી બિલિંગ" : "GST Invoicing"}
            </a>
            <a href="#ai-scanner" className="hover:text-[#F47721] transition-colors flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {lang === "gu" ? "AI બિલ સ્કેનર" : "Gemini AI Scanner"}
            </a>
            <a href="#accounting" className="hover:text-[#F47721] transition-colors">
              {lang === "gu" ? "નામા પદ્ધતિ" : "Accounting"}
            </a>
            <a href="#how-it-works" className="hover:text-[#F47721] transition-colors">
              {lang === "gu" ? "કેવી રીતે કાર્ય કરે છે" : "How It Works"}
            </a>
          </nav>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Bilingual Switcher (EN | ગુજ) */}
            <div className="flex items-center bg-[#F3F4F6] p-0.5 rounded-xl border border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  lang === "en" ? "bg-white text-[#F47721] shadow-xs" : "text-[#667085] hover:text-[#202124]"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang("gu")}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all font-gujarati ${
                  lang === "gu" ? "bg-white text-[#F47721] shadow-xs" : "text-[#667085] hover:text-[#202124]"
                }`}
              >
                ગુજ
              </button>
            </div>

            {/* Login Button */}
            <Link
              href="/login"
              className="px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold text-[#475467] hover:text-[#F47721] hover:bg-[#FFF3E8] rounded-xl transition-all border border-transparent hover:border-[#FED7AA]"
            >
              {lang === "gu" ? "લોગિન" : "Login"}
            </Link>

            {/* Sign Up Button (Mobile/Desktop) */}
            <Link
              href="/login"
              className="hidden sm:inline-flex px-3.5 py-2 text-xs sm:text-sm font-bold text-[#F47721] bg-white border border-[#FED7AA] hover:bg-[#FFF3E8] rounded-xl transition-all shadow-xs"
            >
              {lang === "gu" ? "સાઇન અપ" : "Sign Up"}
            </Link>

            {/* Get Started Button */}
            <Link
              href="/login"
              className="px-3.5 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-[#F47721] to-[#E05D06] hover:from-[#E05D06] hover:to-[#C2410C] text-white text-xs sm:text-sm font-bold rounded-xl shadow-saffron transition-all flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
            >
              <span>{lang === "gu" ? "શરૂ કરો" : "Get Started"}</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* ================= 3. HERO SECTION ================= */}
      <section className="relative pt-10 sm:pt-16 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-5 sm:space-y-6">
          {/* Hero Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF3E8] border border-[#FED7AA] text-[#C2410C] text-xs font-bold shadow-2xs animate-fadeIn">
            <span className="w-2 h-2 rounded-full bg-[#F47721] animate-ping" />
            <span>
              {lang === "gu"
                ? "🚀 ગુજરાત અને ભારતના વેપાર માટે સ્માર્ટ જીએસટી ERP"
                : "🚀 Smart GST Billing & ERP Software for Gujarat & India"}
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#1D2939] tracking-tight leading-[1.15]">
            {lang === "gu" ? (
              <>
                વેપારનું સરળ બિલિંગ અને{" "}
                <span className="bg-gradient-to-r from-[#F47721] to-[#E05D06] bg-clip-text text-transparent">
                  જીએસટી એકાઉન્ટિંગ
                </span>
              </>
            ) : (
              <>
                Fast, Smart Billing &{" "}
                <span className="bg-gradient-to-r from-[#F47721] to-[#E05D06] bg-clip-text text-transparent">
                  GST Accounting
                </span>{" "}
                Simplified
              </>
            )}
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg text-[#667085] leading-relaxed max-w-2xl mx-auto font-normal">
            {lang === "gu"
              ? "૧૦ સેકન્ડમાં જીએસટી બિલ બનાવો, Google Gemini AI થી ખરીદીના બિલ સ્કેન કરો, સ્ટોક-ઇન્વેન્ટરી અને પાકી નામા પદ્ધતિને એક જ સોફ્ટવેરમાં સંભાળો."
              : "Generate statutory GST invoices in under 10 seconds, auto-extract purchase bills with Gemini AI, manage multi-warehouse inventory, and streamline accounting effortlessly."}
          </p>

          {/* Primary Action Buttons (Get Started, Sign Up, Login) */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-lg mx-auto">
            {/* Get Started Button */}
            <Link
              href="/login"
              className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-r from-[#F47721] to-[#E05D06] hover:from-[#E05D06] hover:to-[#C2410C] text-white text-sm sm:text-base font-bold rounded-2xl shadow-saffron hover:shadow-lg transition-all active:scale-95 group"
            >
              <span>{lang === "gu" ? "હમણાં મફત શરૂ કરો" : "Get Started Free"}</span>
              <svg
                className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>

            {/* Sign Up Button */}
            <Link
              href="/login"
              className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-[#FFF8F3] text-[#F47721] border-2 border-[#FED7AA] hover:border-[#F47721] text-sm sm:text-base font-bold rounded-2xl shadow-xs transition-all active:scale-95"
            >
              <span>{lang === "gu" ? "નવું એકાઉન્ટ (Sign Up)" : "Sign Up"}</span>
            </Link>

            {/* Login Button */}
            <Link
              href="/login"
              className="w-full sm:w-auto px-6 py-3.5 bg-[#F8F9FB] hover:bg-[#F3F4F6] text-[#344054] border border-[#E5E7EB] text-sm sm:text-base font-semibold rounded-2xl transition-all"
            >
              {lang === "gu" ? "લોગિન કરો" : "Login"}
            </Link>
          </div>

          {/* Quick Demo Pre-fill helper */}
          <div className="pt-1 flex items-center justify-center gap-3 text-xs text-[#667085]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {lang === "gu" ? "ડેમો ટ્રાય કરો:" : "Quick Demo Access:"}
            </span>
            <Link
              href="/login"
              className="text-[#F47721] font-bold hover:underline"
            >
              {lang === "gu" ? "ડેમો બિઝનેસ (9898990001)" : "Demo Business (9898990001)"}
            </Link>
            <span>•</span>
            <Link
              href="/login"
              className="text-purple-600 font-bold hover:underline"
            >
              SuperAdmin Demo
            </Link>
          </div>

          {/* Value Props Strip */}
          <div className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto text-left">
            <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-[#E5E7EB] shadow-2xs flex items-center gap-3">
              <span className="text-xl">⚡</span>
              <div>
                <p className="text-xs font-bold text-[#202124]">
                  {lang === "gu" ? "૧૦ સેકન્ડ બિલિંગ" : "10-Sec Fast Invoicing"}
                </p>
                <p className="text-[10px] text-[#667085]">
                  {lang === "gu" ? "F2 શૉર્ટકટ & બારકોડ" : "F2 Shortcut & Barcode"}
                </p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-[#E5E7EB] shadow-2xs flex items-center gap-3">
              <span className="text-xl">🤖</span>
              <div>
                <p className="text-xs font-bold text-[#202124]">
                  {lang === "gu" ? "AI બિલ સ્કેનર" : "Gemini AI Scanner"}
                </p>
                <p className="text-[10px] text-[#667085]">
                  {lang === "gu" ? "ઓટો પર્ચેઝ એન્ટ્રી" : "Auto Purchase Entry"}
                </p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-[#E5E7EB] shadow-2xs flex items-center gap-3">
              <span className="text-xl">🇮🇳</span>
              <div>
                <p className="text-xs font-bold text-[#202124]">
                  {lang === "gu" ? "૧૦૦% જીએસટી કાયદેસર" : "Statutory GST Ready"}
                </p>
                <p className="text-[10px] text-[#667085]">
                  {lang === "gu" ? "CGST, SGST & IGST" : "GSTR-1, 3B Registers"}
                </p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-[#E5E7EB] shadow-2xs flex items-center gap-3">
              <span className="text-xl">📦</span>
              <div>
                <p className="text-xs font-bold text-[#202124]">
                  {lang === "gu" ? "મલ્ટી ગોડાઉન સ્ટોક" : "Multi-Godown Stock"}
                </p>
                <p className="text-[10px] text-[#667085]">
                  {lang === "gu" ? "બેચ & એક્સપાયરી ટ્રેક" : "Batch & Expiry Track"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ================= 4. LIVE PRODUCT SHOWCASE MOCKUP ================= */}
        <div className="mt-12 sm:mt-16 relative max-w-5xl mx-auto">
          {/* Decorative backdrop glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-[#F47721]/30 via-[#FB923C]/20 to-[#6366F1]/20 rounded-3xl blur-2xl opacity-70" />

          {/* Interactive Card Container */}
          <div className="relative bg-white rounded-3xl border border-[#E5E7EB] shadow-2xl overflow-hidden">
            {/* Mock Window Top Bar */}
            <div className="bg-[#FAFBFD] px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="ml-2 text-xs font-bold text-[#667085] hidden sm:inline">
                  MyBill History ERP — Live Dashboard & Invoice Creator
                </span>
              </div>

              {/* Theme Switcher in Mockup */}
              <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-[#E5E7EB] text-xs">
                <span className="text-[10px] font-bold text-[#667085] px-1 uppercase hidden min-[480px]:inline">
                  {lang === "gu" ? "થીમ જુઓ:" : "Theme:"}
                </span>
                {(["saffron", "blue", "emerald", "purple"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setActiveTheme(t)}
                    className={`w-5 h-5 rounded-full border transition-all ${
                      activeTheme === t ? "ring-2 ring-offset-1 ring-[#202124] scale-110" : "opacity-70 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: themeColors[t].primary }}
                    title={themeColors[t].name}
                  />
                ))}
              </div>
            </div>

            {/* Mock Dashboard Body */}
            <div className="p-4 sm:p-7 space-y-6 bg-gradient-to-b from-white to-[#FAFBFD]">
              {/* Mock Metrics Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-[#FFF8F3] border border-[#FED7AA]">
                  <p className="text-xs font-bold text-[#C2410C] uppercase tracking-wider">
                    {lang === "gu" ? "આજનું વેચાણ" : "Today's Sales"}
                  </p>
                  <p className="text-xl sm:text-2xl font-black text-[#F47721] font-mono mt-1">
                    ₹1,48,920.00
                  </p>
                  <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
                    ↑ 18.4% vs yesterday
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-[#E5E7EB] shadow-2xs">
                  <p className="text-xs font-bold text-[#667085] uppercase tracking-wider">
                    {lang === "gu" ? "કુલ બિલ" : "Invoices Today"}
                  </p>
                  <p className="text-xl sm:text-2xl font-black text-[#202124] font-mono mt-1">
                    42 Bills
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                    Intra-State: 39 | Inter-State: 3
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-[#E5E7EB] shadow-2xs">
                  <p className="text-xs font-bold text-[#667085] uppercase tracking-wider">
                    {lang === "gu" ? "બાકી લેણું" : "Receivables"}
                  </p>
                  <p className="text-xl sm:text-2xl font-black text-[#1E40AF] font-mono mt-1">
                    ₹24,500.00
                  </p>
                  <p className="text-[10px] text-amber-600 font-bold mt-0.5">
                    3 Overdue invoices
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-[#E5E7EB] shadow-2xs">
                  <p className="text-xs font-bold text-[#667085] uppercase tracking-wider">
                    {lang === "gu" ? "સ્ટોક મૂલ્ય" : "Live Inventory"}
                  </p>
                  <p className="text-xl sm:text-2xl font-black text-emerald-700 font-mono mt-1">
                    ₹8,92,400.00
                  </p>
                  <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
                    2 Godowns Active
                  </p>
                </div>
              </div>

              {/* Mock Invoice Creation Panel */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F3F4F6]">
                  <div>
                    <span className="text-xs font-bold text-[#F47721] uppercase tracking-wider">
                      Tax Invoice Sample • #INV-2026-0042
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-[#202124]">
                      Shreeji Enterprise (Surat, Gujarat)
                    </h3>
                    <p className="text-xs text-[#667085]">
                      GSTIN: 24AAACP1234M1Z5 • Intra-State (CGST 9% + SGST 9%)
                    </p>
                  </div>

                  {/* Active theme badge */}
                  <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 self-start sm:self-auto ${themeColors[activeTheme].badgeBg}`}>
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: themeColors[activeTheme].primary }}
                    />
                    <span>{themeColors[activeTheme].name}</span>
                  </div>
                </div>

                {/* Items Mini Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E5E7EB] text-[#667085] font-semibold text-[11px] uppercase">
                        <th className="py-2 px-3">Item Description</th>
                        <th className="py-2 px-3">HSN</th>
                        <th className="py-2 px-3 text-right">Qty</th>
                        <th className="py-2 px-3 text-right">Rate</th>
                        <th className="py-2 px-3 text-right">Tax</th>
                        <th className="py-2 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3F4F6] font-medium text-[#202124]">
                      <tr>
                        <td className="py-2.5 px-3">
                          <span className="font-bold">24K Pure Gold Border Saree</span>
                          <span className="block text-[10px] text-[#667085]">Batch: SR-2026-A1</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">5208</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">10 Pcs</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹4,500.00</td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-600">5%</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">₹47,250.00</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3">
                          <span className="font-bold">Ceramic Glazed Floor Tiles (600x600)</span>
                          <span className="block text-[10px] text-[#667085]">Batch: TL-992-WH</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">6907</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">120 Box</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹720.00</td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-600">18%</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">₹1,01,670.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Footer Totals */}
                <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between pt-2 border-t border-[#F3F4F6] gap-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1">
                      <span>✓</span> 100% E-Way Bill Ready
                    </span>
                    <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold hidden sm:inline-flex items-center gap-1">
                      <span>🤖</span> Gemini AI OCR Verified
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-[#667085] font-semibold">Grand Total (Incl. GST):</span>
                    <span className="text-xl sm:text-2xl font-black text-[#F47721] font-mono ml-3">
                      ₹1,48,920.00
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 5. CORE CAPABILITIES (FEATURES GRID) ================= */}
      <section id="features" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#E5E7EB]">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <span className="text-xs font-bold text-[#F47721] uppercase tracking-wider">
            {lang === "gu" ? "સંપૂર્ણ વેપાર સોલ્યુશન" : "All-in-One ERP Platform"}
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1D2939] tracking-tight">
            {lang === "gu"
              ? "તમારા બિઝનેસને આગળ વધારતી અદ્યતન સુવિધાઓ"
              : "Everything You Need to Run & Scale Your Business"}
          </h2>
          <p className="text-xs sm:text-sm text-[#667085]">
            {lang === "gu"
              ? "રિટેલ, હોલસેલ, મેન્યુફેક્ચરિંગ અને સર્વિસ વ્યવસાયો માટે ખાસ તૈયાર કરાયેલ સિસ્ટમ."
              : "Built specifically for Indian manufacturers, wholesalers, and fast-paced retailers."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] hover:border-[#FED7AA] shadow-xs hover:shadow-md transition-all group">
            <div className="w-12 h-12 rounded-xl bg-[#FFF3E8] border border-[#FED7AA] flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              ⚡
            </div>
            <h3 className="text-base font-bold text-[#202124] mb-2">
              {lang === "gu" ? "ઝડપી જીએસટી બિલિંગ & કાઉન્ટર મોડ" : "Fast GST Invoicing & Counter POS"}
            </h3>
            <p className="text-xs text-[#667085] leading-relaxed">
              {lang === "gu"
                ? "F2 શૉર્ટકટ વડે ૧૦ સેકન્ડમાં બિલિંગ. બારકોડ સ્કેનર સપોર્ટ, પ્રોફોર્મા બિલ, થર્મલ અને A4 પ્રિન્ટિંગ, 4 કસ્ટમાઇઝેબલ થીમ્સ."
                : "Keyboard-friendly billing with F2 shortcut. Barcode scanner support, proforma invoices, A4 & thermal print, plus 4 customizable themes."}
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] hover:border-[#FED7AA] shadow-xs hover:shadow-md transition-all group">
            <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              🤖
            </div>
            <h3 className="text-base font-bold text-[#202124] mb-2">
              {lang === "gu" ? "Google Gemini AI સ્માર્ટ સ્કેનર" : "Gemini AI Purchase Bill OCR"}
            </h3>
            <p className="text-xs text-[#667085] leading-relaxed">
              {lang === "gu"
                ? "પેપર બિલનો ફોટો પાડો અથવા PDF અપલોડ કરો. Gemini 2.5 AI આપોઆપ વેન્ડર, વસ્તુઓ, HSN અને ટેક્સ વાંચીને સેવ કરી દેશે."
                : "Snap vendor bills or upload PDFs. Google Gemini AI automatically extracts items, rates, taxes, and vendor details in seconds."}
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] hover:border-[#FED7AA] shadow-xs hover:shadow-md transition-all group">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              📦
            </div>
            <h3 className="text-base font-bold text-[#202124] mb-2">
              {lang === "gu" ? "ગોડાઉન સ્ટોક & બેચ મેનેજમેન્ટ" : "Multi-Godown Stock & Batch Tracking"}
            </h3>
            <p className="text-xs text-[#667085] leading-relaxed">
              {lang === "gu"
                ? "દુકાન અને ગોડાઉન વચ્ચે માલ ટ્રાન્સફર, એક્સપાયરી ડેટ ટ્રેકિંગ, ઓછો સ્ટોક વોર્નિંગ, અને રીઅલ-ટાઇમ સ્ટોક વેલ્યુએશન."
                : "Inter-warehouse stock movements, expiry date tracking, low-stock warnings, and real-time inventory valuation (FIFO)."}
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] hover:border-[#FED7AA] shadow-xs hover:shadow-md transition-all group">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              📑
            </div>
            <h3 className="text-base font-bold text-[#202124] mb-2">
              {lang === "gu" ? "ડિલિવરી ચલણ & e-Way બિલ" : "Delivery Challans & e-Way Ready"}
            </h3>
            <p className="text-xs text-[#667085] leading-relaxed">
              {lang === "gu"
                ? "જોબવર્ક, સપ્લાય ઓન એપ્રુવલ અને ગોડાઉન ટ્રાન્સફર માટે પાકા ચલણ બનાવો અને 1-ક્લિકમાં ટેક્સ ઇન્વોઇસમાં કન્વર્ટ કરો."
                : "Generate official delivery challans with e-Way Bill tracking. Convert delivered challans into tax invoices with a single click."}
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] hover:border-[#FED7AA] shadow-xs hover:shadow-md transition-all group">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              📚
            </div>
            <h3 className="text-base font-bold text-[#202124] mb-2">
              {lang === "gu" ? "પાકી નામા પદ્ધતિ & વાઉચર્સ" : "Double-Entry Ledgers & Vouchers"}
            </h3>
            <p className="text-xs text-[#667085] leading-relaxed">
              {lang === "gu"
                ? "ચાર્ટ ઓફ એકાઉન્ટ્સ, પેમેન્ટ, રિસીપ્ટ, કોન્ટ્રા, જર્નલ વાઉચર્સ અને કસ્ટમર/વેન્ડર ખાતાવહી ઑટો અપડેટ."
                : "Automated Chart of Accounts, Payment, Receipt, Contra, Journal entries, Daybook, and live customer/vendor ledger balances."}
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] hover:border-[#FED7AA] shadow-xs hover:shadow-md transition-all group">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              🏢
            </div>
            <h3 className="text-base font-bold text-[#202124] mb-2">
              {lang === "gu" ? "મલ્ટી કંપની & શાખાઓ" : "Multi-Company & Branch Support"}
            </h3>
            <p className="text-xs text-[#667085] leading-relaxed">
              {lang === "gu"
                ? "એક જ એકાઉન્ટથી તમારા અનેક બિઝનેસ અને બ્રાન્ચિસ હેન્ડલ કરો. સ્ટાફ મેમ્બર્સ માટે સુરક્ષિત રોલ્સ અને પરમિશન્સ."
                : "Manage multiple business entities and branch offices under one roof with granular permissions for cashiers and accountants."}
            </p>
          </div>
        </div>
      </section>

      {/* ================= 6. HOW IT WORKS (3 SIMPLE STEPS) ================= */}
      <section id="how-it-works" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-gradient-to-b from-[#FAFBFD] to-white border-t border-[#E5E7EB]">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <span className="text-xs font-bold text-[#F47721] uppercase tracking-wider">
            {lang === "gu" ? "સરળ શરૂઆત" : "Easy Onboarding"}
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1D2939] tracking-tight">
            {lang === "gu" ? "૩ સરળ સ્ટેપ્સમાં શરૂ કરો" : "Get Started in 3 Simple Steps"}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Step 1 */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs relative text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-[#F47721] text-white font-extrabold flex items-center justify-center mx-auto text-base shadow-saffron">
              1
            </div>
            <h3 className="text-base font-bold text-[#202124]">
              {lang === "gu" ? "લોગિન અથવા સાઇન અપ કરો" : "Sign In or Create Account"}
            </h3>
            <p className="text-xs text-[#667085]">
              {lang === "gu"
                ? "તમારા રજિસ્ટર્ડ નંબર અથવા ડેમો ક્રેડેન્શિયલથી ૧ મિનિટમાં પોર્ટલમાં પ્રવેશ કરો."
                : "Log in with your registered phone number or try the pre-filled demo workspace instantly."}
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs relative text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-[#F47721] text-white font-extrabold flex items-center justify-center mx-auto text-base shadow-saffron">
              2
            </div>
            <h3 className="text-base font-bold text-[#202124]">
              {lang === "gu" ? "બિલ બનાવો અને સ્કેન કરો" : "Generate Invoices & Scan Bills"}
            </h3>
            <p className="text-xs text-[#667085]">
              {lang === "gu"
                ? "F2 શૉર્ટકટ વડે ફટાફટ વેચાણ બિલ આપો અને Gemini AI સ્કેનરથી ખરીદીના બીલ આપોઆપ ચડાવો."
                : "Issue professional GST invoices in seconds and upload vendor bills with automated AI parsing."}
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs relative text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-[#F47721] text-white font-extrabold flex items-center justify-center mx-auto text-base shadow-saffron">
              3
            </div>
            <h3 className="text-base font-bold text-[#202124]">
              {lang === "gu" ? "સ્ટોક ટ્રેક કરો અને ટેક્સ ફાઇલ કરો" : "Track Stock & Export GST Reports"}
            </h3>
            <p className="text-xs text-[#667085]">
              {lang === "gu"
                ? "CA ને મોકલવા માટે એક-ક્લિકમાં GSTR-1, 3B અને સેલ્સ રજિસ્ટર ડાઉનલોડ કરો."
                : "Export one-click Excel/CSV summaries for GSTR-1 and GSTR-3B tax compliance."}
            </p>
          </div>
        </div>
      </section>

      {/* ================= 7. BOTTOM CALL TO ACTION BANNER ================= */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="relative rounded-3xl bg-gradient-to-r from-[#F47721] via-[#E05D06] to-[#C2410C] p-8 sm:p-12 text-center text-white shadow-2xl overflow-hidden">
          {/* Subtle wave vectors inside banner */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0 50 Q 25 30, 50 50 T 100 50 L 100 100 L 0 100 Z" fill="white" />
            </svg>
          </div>

          <div className="relative z-10 max-w-2xl mx-auto space-y-5">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
              {lang === "gu"
                ? "આજે જ તમારા વ્યવસાયનું સ્માર્ટ બિલિંગ શરૂ કરો"
                : "Ready to Supercharge Your Business Invoicing?"}
            </h2>
            <p className="text-xs sm:text-base text-white/90">
              {lang === "gu"
                ? "MyBill History સાથે હજારો વેપારીઓ સમય બચાવી રહ્યા છે. કોઈ અઘરી ટેલી એન્ટ્રી વગર સરળતાથી બિલ બનાવો."
                : "Join hundreds of businesses simplifying billing, tax filing, and stock management."}
            </p>

            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-slate-50 text-[#F47721] font-extrabold text-sm sm:text-base rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-95"
              >
                {lang === "gu" ? "હમણાં શરૂ કરો (Get Started)" : "Get Started Now"}
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-7 py-3.5 bg-black/20 hover:bg-black/30 text-white font-bold text-sm sm:text-base rounded-2xl border border-white/30 transition-all"
              >
                {lang === "gu" ? "લોગિન કરો (Login)" : "Sign In to Portal"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 8. MODERN FOOTER ================= */}
      <footer className="border-t border-[#E5E7EB] bg-white py-10 px-4 sm:px-6 lg:px-8 text-xs text-[#667085]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#F47721] flex items-center justify-center text-white font-bold text-sm">
              ₹
            </div>
            <span className="font-bold text-[#202124]">
              MyBill History • Paneliya Technology
            </span>
          </div>

          <div className="flex items-center gap-5 font-semibold text-[#475467]">
            <Link href="/login" className="hover:text-[#F47721]">
              {lang === "gu" ? "લોગિન" : "Login"}
            </Link>
            <Link href="/login" className="hover:text-[#F47721]">
              {lang === "gu" ? "સાઇન અપ" : "Sign Up"}
            </Link>
            <Link href="/login" className="hover:text-[#F47721]">
              {lang === "gu" ? "શરૂ કરો" : "Get Started"}
            </Link>
          </div>

          <p className="text-[11px] text-[#98A2B3]">
            © {new Date().getFullYear()} Paneliya Technology. Made with ❤️ in Gujarat, India.
          </p>
        </div>
      </footer>
    </div>
  );
}
