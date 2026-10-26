"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useInView,
} from "framer-motion";
import Lenis from "lenis";
import { useAuth } from "../../context/auth-context";
import { BrandLogo } from "../ui/brand-logo";

// ---------------------------------------------------------------------------
// ANIMATION & TYPOGRAPHY CONSTANTS
// ---------------------------------------------------------------------------
const easeCubic = [0.22, 1, 0.36, 1] as const;
const serifFont = { fontFamily: "var(--font-playfair), var(--font-noto-gujarati), Georgia, serif" };
const monoFont = { fontFamily: "var(--font-dm-mono), ui-monospace, monospace" };
const sansFont = { fontFamily: "var(--font-manrope), var(--font-inter), sans-serif" };

// ---------------------------------------------------------------------------
// COUNT-UP STAT COMPONENT
// ---------------------------------------------------------------------------
function CountUpNumber({
  value,
  prefix = "",
  suffix = "",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 1600;
    const steps = 40;
    const stepTime = duration / steps;
    const increment = value / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [isInView, value]);

  return (
    <span ref={ref}>
      {prefix}
      {count.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

// ---------------------------------------------------------------------------
// LIVE SALE PINGS COMPONENT
// ---------------------------------------------------------------------------
const LIVE_PINGS = [
  {
    id: 1,
    title: "₹24,580 invoice created",
    time: "2 min ago",
    icon: "📄",
  },
  {
    id: 2,
    title: "Payment received from Patel Traders",
    detail: "₹18,400 via UPI QR",
    time: "5 min ago",
    icon: "₹",
  },
  {
    id: 3,
    title: "New stock received — 120 BOX",
    detail: "Surat Godown · Batch #B26",
    time: "8 min ago",
    icon: "📦",
  },
  {
    id: 4,
    title: "GST bill scanned successfully",
    detail: "94% fields captured via OCR",
    time: "11 min ago",
    icon: "✨",
  },
];

function LiveSalePings({ gu }: { gu: boolean }) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % LIVE_PINGS.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="bg-white/95 backdrop-blur-md rounded-2xl border border-[#0C1827]/10 p-4 shadow-xl max-w-xs w-full select-none"
      data-testid="live-sale-pings"
    >
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#0C1827]/5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0C1827]/70" style={monoFont}>
            {gu ? "વેપારની જીવતી ગતિ" : "Businesses moving right now"}
          </span>
        </div>
      </div>

      <div className="space-y-2.5">
        {LIVE_PINGS.map((ping, i) => {
          const isActive = i === activeIdx;
          return (
            <motion.div
              key={ping.id}
              animate={{
                opacity: isActive ? 1 : 0.45,
                scale: isActive ? 1.02 : 0.98,
                y: isActive ? 0 : 2,
              }}
              transition={{ duration: 0.35, ease: easeCubic }}
              className={`p-2.5 rounded-xl border transition-colors ${isActive
                ? "bg-[#FAF7F2] border-[#E15A2B]/40 shadow-xs"
                : "bg-white border-transparent"
                }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span className="text-sm shrink-0 mt-0.5">{ping.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-[#0C1827] leading-snug">{ping.title}</p>
                    {ping.detail && (
                      <p className="text-[10px] text-[#0C1827]/60 leading-tight mt-0.5" style={monoFont}>
                        {ping.detail}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-[9px] text-[#0C1827]/50 whitespace-nowrap mt-0.5" style={monoFont}>
                  {ping.time}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TESTIMONIAL REVIEW SHUFFLE
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// TESTIMONIAL REVIEW AUTO-ROTATING SHUFFLE (14 Indian Trades)
// ---------------------------------------------------------------------------
const REVIEWS = [
  {
    id: 1,
    name: "Nirali Shah",
    business: "Shreeji Enterprise",
    city: "Rajkot",
    category: "Retail & Counter",
    avatar: "/landing/voice-1.jpg",
    quoteEn: "Myownbillbook reduced our invoice time from minutes to seconds. Cash counter moves 3x faster.",
    quoteGu: "રોજમેળથી અમારા બિલ બનાવવાનો સમય મિનિટોમાંથી સેકન્ડોમાં બદલાઈ ગયો. કાઉન્ટર પર ગ્રાહકોની લાઈન અટકતી નથી.",
  },
  {
    id: 2,
    name: "Ajay Patel",
    business: "Patel Traders",
    city: "Ahmedabad",
    category: "Wholesale & B2B",
    avatar: "/landing/voice-2.jpg",
    quoteEn: "Gujarati support makes it easy for our entire team. Books close on time every month.",
    quoteGu: "ગુજરાતી સપોર્ટથી ટીમ ખૂબ જ ઝડપથી હિસાબ લખી શકે છે. રોજમેળ અને ખાતાવહી બંને એકસાથે સમયસર પતી જાય છે.",
  },
  {
    id: 3,
    name: "Rajesh Desai",
    business: "Desai & Sons",
    city: "Surat",
    category: "Distribution & Godown",
    avatar: "/landing/voice-3.jpg",
    quoteEn: "Now I know exactly where every rupee and every item is across all 3 godowns.",
    quoteGu: "હવે મને બરાબર ખબર છે કે 3 ગોડાઉનમાં દરેક રૂપિયો અને દરેક વસ્તુ ક્યાં છે. સ્ટોકમાં ભૂલની કોઈ શક્યતા નથી.",
  },
  {
    id: 4,
    name: "Mansukhbhai Prajapati",
    business: "Shree Ganesh Ceramics",
    city: "Morbi",
    category: "Tiles & Sanitary",
    avatar: "/landing/voice-1.jpg",
    quoteEn: "Handling multi-vehicle e-Way bills and tile tonnage stock takes under 2 minutes now.",
    quoteGu: "મોરબીથી દેશભરમાં ટાઇલ્સ અને સેનિટરી સપ્લાયમાં e-Way બિલ અને ટેક્સ રિપોર્ટ હવે ૨ મિનિટમાં નીકળી જાય છે.",
  },
  {
    id: 5,
    name: "Hasmukh Vaghani",
    business: "Somnath Agro Inputs",
    city: "Junagadh",
    category: "Agro Seeds & Fertilizers",
    avatar: "/landing/voice-2.jpg",
    quoteEn: "Batch numbers, expiry tracking and farmer GST billing work completely seamlessly.",
    quoteGu: "ખાતર અને બિયારણના બેચ નંબર, એક્સપાયરી તારીખ અને ખેડૂતોનું પાકું બિલ એકદમ સરળતાથી બની જાય છે.",
  },
  {
    id: 6,
    name: "Chetan Mehta",
    business: "Mehta Electricals",
    city: "Vadodara",
    category: "Electrical Wholesale",
    avatar: "/landing/voice-3.jpg",
    quoteEn: "The purchase bill scanner saves us typing hundreds of supplier lines every single week.",
    quoteGu: "સપ્લાયરોના મોટા ખરીદ બિલો સ્કેન કરતા જ બધો માલ અને GST ડાયરેક્ટ સ્ટોકમાં નોંધાઈ જાય છે.",
  },
  {
    id: 7,
    name: "Bharatbhai Dholakiya",
    business: "Radhe Textile Mills",
    city: "Surat",
    category: "Textiles & Embroidery",
    avatar: "/landing/voice-1.jpg",
    quoteEn: "Job-work challans and fabric meter tracking are integrated right into the daily ledger.",
    quoteGu: "કાપડના જોબવર્ક ચલણ, મીટર-વાર હિસાબ અને પેમેન્ટ ઉઘરાણીનું ટ્રેકિંગ ખૂબ જ મજબૂત છે.",
  },
  {
    id: 8,
    name: "Jignesh Solanki",
    business: "Bhavani Auto Spares",
    city: "Bhavnagar",
    category: "Auto Parts & Hardware",
    avatar: "/landing/voice-2.jpg",
    quoteEn: "Barcoding and instant thermal receipts cut down counter queues during rush hours.",
    quoteGu: "ઓટો પાર્ટ્સના હજારો આઇટમ્સનું બારકોડ સ્કેનિંગ અને થર્મલ પ્રિન્ટિંગથી કાઉન્ટર એકદમ સ્પીડમાં ચાલે છે.",
  },
  {
    id: 9,
    name: "Ketanbhai Parikh",
    business: "Shree Krishna Mart",
    city: "Jamnagar",
    category: "Supermarket & FMCG",
    avatar: "/landing/voice-3.jpg",
    quoteEn: "Fast POS billing with weighing scale support made daily cashier balancing effortless.",
    quoteGu: "વજન કાંટો અને બારકોડથી સુપરમાર્કેટ બિલિંગ એટલું સરળ થઈ ગયું કે રોકડ મેળવવી એકદમ આસાન બની ગઈ.",
  },
  {
    id: 10,
    name: "Pareshbhai Panchal",
    business: "Shubh Plywood & Timber",
    city: "Ahmedabad",
    category: "Hardware & Plywood",
    avatar: "/landing/voice-1.jpg",
    quoteEn: "Sq.ft calculations, transport details and partial payments are tracked automatically.",
    quoteGu: "પ્લાયવુડના ચોરસ ફૂટ, ટ્રાન્સપોર્ટ ભાડું અને પાર્ટીના જમા-ઉધારનો ચોખ્ખો હિસાબ મોબાઈલ પર જ મળી રહે છે.",
  },
  {
    id: 11,
    name: "Dharmesh Shah",
    business: "Vardhman Surgical",
    city: "Mehsana",
    category: "Pharma Distribution",
    avatar: "/landing/voice-2.jpg",
    quoteEn: "100% GST-compliant medicine invoices with HSN, batch and doctor reference fields.",
    quoteGu: "દવાઓનું બિલિંગ, HSN કોડ અને એક્સપાયરી ડેટ વાઇઝ સ્ટોક રિપોર્ટિંગથી અમારું ઓડિટ ખૂબ સરળ થઈ ગયું.",
  },
  {
    id: 12,
    name: "Jayantilal Patel",
    business: "Gujarat Packaging",
    city: "Ankleshwar",
    category: "Manufacturing & Box",
    avatar: "/landing/voice-3.jpg",
    quoteEn: "Raw material to finished goods conversion in godowns is dead simple to monitor.",
    quoteGu: "કાચો માલ, બોક્સ ઉત્પાદન અને જીએસટી ઇ-ઇન્વોઇસિંગનું કામ હવે એક જ જગ્યાએથી કોઈપણ અડચણ વગર થાય છે.",
  },
  {
    id: 13,
    name: "Rameshwar Soni",
    business: "Ambica Jewellers",
    city: "Patan",
    category: "Jewellery & Bullion",
    avatar: "/landing/voice-1.jpg",
    quoteEn: "Gold purity, making charge breakdowns and hallmark numbers print accurately every time.",
    quoteGu: "સોના-ચાંદીના વજન, ઘડામણ ચાર્જ અને હોલમાર્ક સાથેનું પાકું બિલ જોઈને ગ્રાહકોનો વિશ્વાસ વધી ગયો છે.",
  },
  {
    id: 14,
    name: "Vinodbhai Savaliya",
    business: "Sardar Steel & Cement",
    city: "Navsari",
    category: "Building Materials",
    avatar: "/landing/voice-2.jpg",
    quoteEn: "Ton and quintal billing with lorry freight charges handles all our contractor dispatches.",
    quoteGu: "સ્ટીલ અને સિમેન્ટના ટન-ક્વિન્ટલ વાઇઝ ડિસ્પેચ અને ડ્રાઇવર બિલ હવે 10 સેકન્ડમાં તૈયાર થઈ જાય છે.",
  },
];

function ReviewShuffle({ gu }: { gu: boolean }) {
  const [startIndex, setStartIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-rotate every 4 seconds continuously
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setStartIndex((prev) => (prev + 1) % REVIEWS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const handleNext = () => {
    setStartIndex((prev) => (prev + 1) % REVIEWS.length);
  };

  const handlePrev = () => {
    setStartIndex((prev) => (prev - 1 + REVIEWS.length) % REVIEWS.length);
  };

  // Get 3 active reviews in rotation
  const visibleReviews = [
    REVIEWS[startIndex],
    REVIEWS[(startIndex + 1) % REVIEWS.length],
    REVIEWS[(startIndex + 2) % REVIEWS.length],
  ];

  return (
    <div
      className="relative max-w-5xl mx-auto py-6"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      data-testid="review-shuffle"
    >
      {/* Top Status & Carousel Controls Bar */}
      <div className="flex items-center justify-between gap-3 mb-6 px-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-[#0C1827]/80">
            {gu
              ? `૧૪ ચકાસાયેલી વેપારી સમીક્ષાઓ · સ્વચાલિત શફલ (${startIndex + 1}/૧૪)`
              : `14 Verified Merchant Stories · Live auto-shuffling (${startIndex + 1}/14)`}
          </span>
          {isPaused && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0C1827]/5 text-[#0C1827]/60 font-mono hidden sm:inline">
              {gu ? "વાંચવા માટે થોભેલું છે" : "Paused for reading"}
            </span>
          )}
        </div>

        {/* Prev & Next Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrev}
            className="w-8 h-8 rounded-full border border-[#0C1827]/15 bg-white text-xs font-bold text-[#0C1827] hover:border-[#E15A2B] hover:text-[#E15A2B] transition-colors flex items-center justify-center shadow-2xs cursor-pointer active:scale-95"
            aria-label="Previous Review"
          >
            ←
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="w-8 h-8 rounded-full border border-[#0C1827]/15 bg-white text-xs font-bold text-[#0C1827] hover:border-[#E15A2B] hover:text-[#E15A2B] transition-colors flex items-center justify-center shadow-2xs cursor-pointer active:scale-95"
            aria-label="Next Review"
          >
            →
          </button>
        </div>
      </div>

      {/* 3 Review Cards Grid with AnimatePresence */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
        <AnimatePresence mode="popLayout">
          {visibleReviews.map((rev, index) => {
            const isFeatured = index === 0;
            return (
              <motion.div
                key={`${rev.id}-${startIndex}-${index}`}
                layout
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{
                  opacity: 1,
                  scale: isFeatured ? 1.02 : 0.98,
                  y: 0,
                  zIndex: isFeatured ? 10 : 1,
                }}
                exit={{ opacity: 0, scale: 0.94, y: -12 }}
                transition={{ duration: 0.4, ease: easeCubic }}
                className={`rounded-2xl p-6 flex flex-col justify-between transition-shadow relative ${isFeatured
                    ? "bg-[#FAF7F2] border-2 border-[#E15A2B]/40 shadow-xl"
                    : "bg-white border border-[#0C1827]/10 shadow-xs"
                  }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#0C1827]/5 text-[#0C1827]/70"
                      style={monoFont}
                    >
                      {rev.category}
                    </span>
                    <div className="flex text-amber-400 text-xs tracking-tight">★★★★★</div>
                  </div>

                  <p
                    className="text-sm md:text-base text-[#0C1827] font-medium leading-relaxed italic mb-6 min-h-[72px]"
                    style={serifFont}
                  >
                    &ldquo;{gu ? rev.quoteGu : rev.quoteEn}&rdquo;
                  </p>
                </div>

                <div className="pt-4 border-t border-[#0C1827]/10 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#E15A2B]/15 border border-[#E15A2B]/30 flex items-center justify-center text-[#E15A2B] font-bold text-sm shrink-0">
                    {rev.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs font-bold text-[#0C1827] truncate">{rev.name}</h5>
                    <p className="text-[11px] text-[#0C1827]/60 truncate">
                      {rev.business} · {rev.city}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Pagination Dots */}
      <div className="flex items-center justify-center gap-1.5 mt-6">
        {REVIEWS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setStartIndex(i)}
            className={`h-1.5 rounded-full transition-all ${i === startIndex
                ? "w-6 bg-[#E15A2B]"
                : "w-1.5 bg-[#0C1827]/20 hover:bg-[#0C1827]/40"
              }`}
            aria-label={`Jump to review ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
// ---------------------------------------------------------------------------
// REDESIGNED HIGH-END REALISTIC PRODUCT WALKTHROUGH
// ---------------------------------------------------------------------------
function HighEndProductWalkthrough({ gu }: { gu: boolean }) {
  const [activeTab, setActiveTab] = useState<"invoice" | "ocr" | "godown" | "ledger" | "gst">("invoice");

  const tabs = [
    { id: "invoice", labelEn: "1. GST Invoicing Studio", labelGu: "૧. GST ઇન્વૉઇસિંગ સ્ટુડિયો", icon: "🧾" },
    { id: "ocr", labelEn: "2. Smart Purchase Bill OCR", labelGu: "૨. ખરીદ બિલ OCR સ્કેનર", icon: "📷" },
    { id: "godown", labelEn: "3. Multi-Godown Stock", labelGu: "૩. મલ્ટી-ગોડાઉન સ્ટોક", icon: "🏢" },
    { id: "ledger", labelEn: "4. Daybook (રોજમેળ)", labelGu: "૪. રોજમેળ અને ખાતાવહી", icon: "📖" },
    { id: "gst", labelEn: "5. GST Return Filing (GSTR-1)", labelGu: "૫. GST રિટર્ન ફાઇલિંગ", icon: "📊" },
  ] as const;

  return (
    <div className="bg-white rounded-3xl border border-[#0C1827]/15 p-5 sm:p-8 shadow-2xl relative overflow-hidden" data-testid="interactive-product-walkthrough">
      {/* Header & Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#0C1827]/10">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#E15A2B]" style={monoFont}>
            {gu ? "લાઇવ પ્રોડક્ટ સિમ્યુલેશન" : "Interactive Product Simulation"}
          </span>
          <h3 className="text-2xl md:text-3xl font-bold text-[#0C1827] mt-1" style={serifFont}>
            {gu ? "રોજમેળ વર્કસ્પેસ કેવી રીતે કામ કરે છે તે જુઓ" : "Experience the live Myownbillbook Workspace"}
          </h3>
          <p className="text-xs text-[#0C1827]/70 mt-1">
            {gu
              ? "ટેબ બદલીને જુઓ કે બિલિંગ, OCR, સ્ટોક અને રોજમેળ એકસાથે કેવી રીતે કાર્ય કરે છે."
              : "Click the modules below to test real invoice workflows, instant OCR bills, multi-godown transfers and ledgers."}
          </p>
        </div>

        {/* Action Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${activeTab === tab.id
                ? "bg-[#0C1827] text-white shadow-md ring-2 ring-[#E15A2B]/40"
                : "bg-[#FAF7F2] text-[#0C1827]/75 hover:bg-[#EFE9DF]"
                }`}
            >
              <span>{tab.icon}</span>
              <span>{gu ? tab.labelGu : tab.labelEn}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Realistic Software Window Chrome */}
      <div className="mt-6 rounded-2xl bg-[#F8F5EE] border border-[#0C1827]/15 overflow-hidden shadow-inner">
        {/* Window Topbar */}
        <div className="bg-[#FAF7F2] px-4 py-2.5 border-b border-[#0C1827]/10 flex items-center justify-between gap-4 select-none">
          {/* macOS traffic lights */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-400"></span>
            <span className="w-3 h-3 rounded-full bg-amber-400"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
            <span className="ml-2 text-[10px] font-bold text-[#0C1827]/60" style={monoFont}>
              Myownbillbook OS · Shreeji Enterprise (Surat)
            </span>
          </div>

          {/* Quick status pill */}
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-semibold text-[#0C1827]/70 bg-white px-3 py-1 rounded-full border border-[#0C1827]/10" style={monoFont}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>GSTIN: 24ABCDE1234F1Z5</span>
            <span>·</span>
            <span className="text-emerald-700 font-bold">100% Tax Compliant</span>
          </div>
        </div>

        {/* Dynamic Interactive Module Screen */}
        <div className="p-4 sm:p-6 min-h-[440px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {/* TAB 1: GST INVOICE STUDIO */}
            {activeTab === "invoice" && (
              <motion.div
                key="tab-invoice"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="bg-white rounded-xl p-4 sm:p-5 border border-[#0C1827]/10 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#0C1827]/10">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#E15A2B]" style={monoFont}>
                        TAX INVOICE · B2B GST
                      </span>
                      <h4 className="text-base font-bold text-[#0C1827]">
                        Invoice #INV-26-27-0104 · Patel Traders
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold">
                        Party Balance: ₹ 18,400.00
                      </span>
                      <span className="text-[11px] font-mono bg-slate-100 text-slate-800 px-2 py-1 rounded-lg">
                        18 Apr 2026
                      </span>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b text-[#0C1827]/60 uppercase tracking-wider text-[10px]" style={monoFont}>
                          <th className="py-2">Item Description</th>
                          <th className="py-2 text-center">HSN</th>
                          <th className="py-2 text-center">Qty</th>
                          <th className="py-2 text-right">Rate</th>
                          <th className="py-2 text-right">Tax (18%)</th>
                          <th className="py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        <tr>
                          <td className="py-2 font-sans font-semibold text-[#0C1827]">Wireless Fast Charger 15W</td>
                          <td className="py-2 text-center">8504</td>
                          <td className="py-2 text-center font-bold">10 Pcs</td>
                          <td className="py-2 text-right">₹ 450.00</td>
                          <td className="py-2 text-right text-slate-600">₹ 810.00</td>
                          <td className="py-2 text-right font-bold text-[#0C1827]">₹ 5,310.00</td>
                        </tr>
                        <tr>
                          <td className="py-2 font-sans font-semibold text-[#0C1827]">Type-C Braided Cable 2M</td>
                          <td className="py-2 text-center">8544</td>
                          <td className="py-2 text-center font-bold">25 Pcs</td>
                          <td className="py-2 text-right">₹ 120.00</td>
                          <td className="py-2 text-right text-slate-600">₹ 540.00</td>
                          <td className="py-2 text-right font-bold text-[#0C1827]">₹ 3,540.00</td>
                        </tr>
                        <tr>
                          <td className="py-2 font-sans font-semibold text-[#0C1827]">Extension Board 4-Way Spike</td>
                          <td className="py-2 text-center">8536</td>
                          <td className="py-2 text-center font-bold">8 Pcs</td>
                          <td className="py-2 text-right">₹ 720.00</td>
                          <td className="py-2 text-right text-slate-600">₹ 1,036.80</td>
                          <td className="py-2 text-right font-bold text-[#0C1827]">₹ 6,796.80</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Bar */}
                  <div className="pt-3 border-t border-[#0C1827]/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-800 rounded font-semibold text-[10px]">
                        ✓ e-Way Bill JSON Ready
                      </span>
                      <span className="px-2 py-1 bg-blue-50 text-blue-800 rounded font-semibold text-[10px]">
                        ✓ WhatsApp PDF Preview
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-[#0C1827]/60 mr-2">Grand Total (GST Incl.):</span>
                      <span className="text-lg font-black text-[#0C1827] font-mono">₹ 15,646.80</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2: AI PURCHASE BILL OCR */}
            {activeTab === "ocr" && (
              <motion.div
                key="tab-ocr"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {/* Left Scanned Bill Preview with AI Bounding Boxes */}
                <div className="bg-white rounded-xl p-4 border border-[#0C1827]/10 shadow-xs relative overflow-hidden">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b text-xs">
                    <span className="font-bold text-[#0C1827]">Camera Scanned Bill Preview</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      94% OCR Confidence
                    </span>
                  </div>
                  <div className="relative h-60 bg-slate-50 rounded-lg p-3 border border-dashed border-slate-300 font-mono text-[10px] space-y-2 select-none">
                    <div className="p-1.5 bg-emerald-50 border border-emerald-400 rounded text-emerald-900 flex justify-between">
                      <span>VENDOR: SHREE HARI ELECTRONICS</span>
                      <span className="font-bold">✓ MATCHED</span>
                    </div>
                    <div className="p-1.5 bg-emerald-50 border border-emerald-400 rounded text-emerald-900 flex justify-between">
                      <span>GSTIN: 24AAACH7890K1Z9</span>
                      <span className="font-bold">✓ VALID</span>
                    </div>
                    <div className="p-1.5 bg-emerald-50 border border-emerald-400 rounded text-emerald-900 flex justify-between">
                      <span>TOTAL: ₹ 48,200.00 (Tax: ₹ 7,352.54)</span>
                      <span className="font-bold">✓ VERIFIED</span>
                    </div>
                    <div className="p-2 bg-blue-50/70 border border-blue-300 rounded text-blue-900 text-[9.5px]">
                      4 Items Detected: 100x Type-C adaptors, 50x Bluetooth modules, 20x Batteries, 10x Soldering kits.
                    </div>
                  </div>
                </div>

                {/* Right Extracted Actions */}
                <div className="bg-white rounded-xl p-4 border border-[#0C1827]/10 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700" style={monoFont}>
                      SMART EXTRACTED PURCHASE DATA
                    </span>
                    <h4 className="text-base font-bold text-[#0C1827] mt-1">
                      Ready to Add into Inventory & Payables
                    </h4>
                    <p className="text-xs text-[#0C1827]/70 mt-1 leading-relaxed">
                      All line items and taxes matched with Surat Main Godown inventory master. Stock quantities will update automatically upon confirmation.
                    </p>

                    <div className="mt-4 space-y-2 text-xs font-mono">
                      <div className="flex justify-between p-2 rounded bg-slate-50">
                        <span>Vendor Ledger:</span>
                        <span className="font-bold text-[#0C1827]">Shree Hari Electronics</span>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-slate-50">
                        <span>Destination Godown:</span>
                        <span className="font-bold text-[#0C1827]">Surat Main Godown (Rack A)</span>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-slate-50">
                        <span>Input Tax Credit (ITC):</span>
                        <span className="font-bold text-emerald-700">₹ 7,352.54 Eligible</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="w-full mt-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>✓ Approve & Record in Books</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* TAB 3: MULTI-GODOWN INVENTORY */}
            {activeTab === "godown" && (
              <motion.div
                key="tab-godown"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-xl p-5 border border-[#0C1827]/10 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#0C1827]/10">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-700" style={monoFont}>
                      MULTI-GODOWN INVENTORY MATRIX
                    </span>
                    <h4 className="text-base font-bold text-[#0C1827]">
                      Live Stock Across Branches & Warehouses
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-blue-50 text-blue-800 text-xs font-bold rounded-lg font-mono">
                      3 Active Godowns
                    </span>
                    <button
                      type="button"
                      className="px-3 py-1 bg-[#0C1827] text-white text-xs font-bold rounded-lg cursor-pointer"
                    >
                      + Transfer Stock
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/50">
                    <p className="text-[11px] font-bold text-blue-900">Surat Main Godown</p>
                    <p className="text-lg font-black text-[#0C1827] mt-1 font-mono">842 Units</p>
                    <p className="text-[10px] text-blue-700 mt-0.5">Value: ₹ 4,12,000 · 14 Batches</p>
                  </div>
                  <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
                    <p className="text-[11px] font-bold text-emerald-900">Ring Road Shop Counter</p>
                    <p className="text-lg font-black text-[#0C1827] mt-1 font-mono">318 Units</p>
                    <p className="text-[10px] text-emerald-700 mt-0.5">Fast Moving · 0 Stockouts</p>
                  </div>
                  <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/50">
                    <p className="text-[11px] font-bold text-amber-900">Station Road Warehouse</p>
                    <p className="text-lg font-black text-[#0C1827] mt-1 font-mono">120 BOX</p>
                    <p className="text-[10px] text-amber-700 mt-0.5">Transit Shipment Arrived Today</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-mono">
                  <span>Last stock transfer: 50 Pcs Fast Chargers moved from Main Godown → Shop Counter</span>
                  <span className="text-emerald-700 font-bold">✓ Synced in 10 sec</span>
                </div>
              </motion.div>
            )}

            {/* TAB 4: DAYBOOK & LEDGERS (રોજમેળ) */}
            {activeTab === "ledger" && (
              <motion.div
                key="tab-ledger"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-xl p-5 border border-[#0C1827]/10 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#0C1827]/10">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#E15A2B]" style={monoFont}>
                      TRADITIONAL GUJARATI DAYBOOK · રોજમેળ
                    </span>
                    <h4 className="text-base font-bold text-[#0C1827]">
                      દૈનિક રોજમેળ — 18 Apr 2026 (ચૈત્ર સુદ 11)
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold rounded-lg font-mono">
                      Closing Cash: ₹ 48,250.00
                    </span>
                  </div>
                </div>

                {/* Double Entry Ledger Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                  {/* Jama Side */}
                  <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-2">
                    <p className="font-bold text-emerald-900 border-b border-emerald-200 pb-1 flex justify-between font-sans">
                      <span>જમા પક્ષ (JAMA / RECEIPTS)</span>
                      <span className="font-mono">AMOUNT</span>
                    </p>
                    <div className="flex justify-between text-slate-800">
                      <span>શરૂઆત રોકડ શિલક (Opening Cash)</span>
                      <span>₹ 24,000.00</span>
                    </div>
                    <div className="flex justify-between text-slate-800">
                      <span>રોકડ વેચાણ (Cash Sales Counter)</span>
                      <span>₹ 15,646.80</span>
                    </div>
                    <div className="flex justify-between text-slate-800">
                      <span>પટેલ ટ્રેડર્સ જમા (Patel Traders UPI)</span>
                      <span>₹ 18,400.00</span>
                    </div>
                    <div className="pt-2 border-t border-emerald-200 flex justify-between font-bold text-emerald-950">
                      <span>કુલ જમા (Total Jama)</span>
                      <span>₹ 58,046.80</span>
                    </div>
                  </div>

                  {/* Udhaar Side */}
                  <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/30 space-y-2">
                    <p className="font-bold text-rose-900 border-b border-rose-200 pb-1 flex justify-between font-sans">
                      <span>ઉધાર પક્ષ (UDHAAR / PAYMENTS)</span>
                      <span className="font-mono">AMOUNT</span>
                    </p>
                    <div className="flex justify-between text-slate-800">
                      <span>શ્રી હરિ ઇલેક્ટ્રોનિક્સ ચૂકવણી</span>
                      <span>₹ 8,200.00</span>
                    </div>
                    <div className="flex justify-between text-slate-800">
                      <span>દુકાન ખર્ચ અને ચા-પાણી</span>
                      <span>₹ 1,596.80</span>
                    </div>
                    <div className="flex justify-between text-slate-800 font-bold text-blue-900">
                      <span>આખર રોકડ શિલક (Closing Balance)</span>
                      <span>₹ 48,250.00</span>
                    </div>
                    <div className="pt-2 border-t border-rose-200 flex justify-between font-bold text-rose-950">
                      <span>કુલ ઉધાર (Total Udhaar)</span>
                      <span>₹ 58,046.80</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-[#0C1827]/70 font-sans border-t border-slate-100">
                  <span>✓ Books balanced with double-entry principles. Audit-ready for CA review.</span>
                  <button type="button" className="text-xs font-bold text-[#E15A2B] hover:underline cursor-pointer">
                    Export Excel / PDF Ledger →
                  </button>
                </div>
              </motion.div>
            )}

            {/* TAB 5: GST RETURN FILING */}
            {activeTab === "gst" && (
              <motion.div
                key="tab-gst"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-xl p-5 border border-[#0C1827]/10 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#0C1827]/10">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700" style={monoFont}>
                      GOVERNMENT PORTAL READY RETURN
                    </span>
                    <h4 className="text-base font-bold text-[#0C1827]">
                      GSTR-1 Monthly Return Filing Summary
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg font-mono">
                      ✓ 0 Errors Found
                    </span>
                    <button
                      type="button"
                      className="px-4 py-1.5 bg-[#E15A2B] hover:bg-[#d04b1e] text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-xs"
                    >
                      Download Portal JSON
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[#0C1827]/60">Total Taxable Value</p>
                    <p className="text-base font-black text-[#0C1827] mt-1">₹ 18,45,200</p>
                    <p className="text-[10px] text-emerald-700 mt-0.5">42 B2B Invoices</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[#0C1827]/60">CGST Amount</p>
                    <p className="text-base font-black text-[#0C1827] mt-1">₹ 1,66,068</p>
                    <p className="text-[10px] text-blue-700 mt-0.5">Intra-state sales</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[#0C1827]/60">SGST Amount</p>
                    <p className="text-base font-black text-[#0C1827] mt-1">₹ 1,66,068</p>
                    <p className="text-[10px] text-blue-700 mt-0.5">State tax credit</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[#0C1827]/60">IGST Amount</p>
                    <p className="text-base font-black text-[#0C1827] mt-1">₹ 42,100</p>
                    <p className="text-[10px] text-amber-700 mt-0.5">Inter-state sales</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                  <span className="text-emerald-950 font-semibold">
                    All HSN summaries, invoice numbering series, and credit notes verified for the current tax period.
                  </span>
                  <span className="font-mono text-emerald-800 font-bold">1-Click JSON Ready</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PRICE ROLL SECTION COMPONENT
// ---------------------------------------------------------------------------
function PriceRollSection({ gu }: { gu: boolean }) {
  const [cycle, setCycle] = useState<"monthly" | "yearly">("yearly");

  const plans = [
    {
      id: "starter",
      nameEn: "Starter",
      nameGu: "શરૂઆત પ્લાન",
      monthly: 499,
      yearly: 399,
      forEn: "For small retailers & shops",
      forGu: "નાની દુકાનો અને કાઉન્ટર માટે",
      featuresEn: [
        "1 Business Company",
        "Up to 3,000 Invoices/year",
        "Standard GST Invoicing",
        "A4 & Thermal POS Print",
        "Email & Chat Support",
      ],
      featuresGu: [
        "1 કંપની અથવા દુકાન",
        "વર્ષે 3,000 ઇન્વૉઇસ સુધી",
        "સ્ટાન્ડર્ડ GST બિલિંગ",
        "A4 અને થર્મલ POS પ્રિન્ટ",
        "ઇમેઇલ અને ચેટ સપોર્ટ",
      ],
    },
    {
      id: "professional",
      nameEn: "Professional",
      nameGu: "પ્રોફેશનલ (લોકપ્રિય)",
      popular: true,
      monthly: 999,
      yearly: 799,
      forEn: "For growing wholesalers & traders",
      forGu: "હોલસેલર્સ અને વધતા વેપાર માટે",
      featuresEn: [
        "Up to 3 Businesses",
        "Unlimited Invoices & E-Way Bills",
        "Purchase Bill OCR Scanner",
        "Multi-Godown Inventory Sync",
        "Automated WhatsApp Reminders",
        "GSTR-1, 3B & 2B Preparation",
        "Priority Phone & Remote Support",
      ],
      featuresGu: [
        "3 કંપનીઓ સુધી સપોર્ટ",
        "અનલિમિટેડ ઇન્વૉઇસ અને e-Way Bills",
        "ખરીદ બિલ OCR સ્કેનર",
        "બહુ-ગોડાઉન સ્ટોક સિન્ક",
        "WhatsApp ઓટોમેટિક રિમાઇન્ડર્સ",
        "GSTR-1, 3B અને 2B તૈયાર રિપોર્ટ",
        "ફોન અને રિમોટ પ્રાથમિક સપોર્ટ",
      ],
    },
    {
      id: "enterprise",
      nameEn: "Enterprise",
      nameGu: "એન્ટરપ્રાઇઝ",
      monthly: 1999,
      yearly: 1599,
      forEn: "For large distributors & factories",
      forGu: "મોટા ડિસ્ટ્રિબ્યુટર્સ અને ફેક્ટરીઓ માટે",
      featuresEn: [
        "Unlimited Companies & Branches",
        "Unlimited Staff Users & Roles",
        "Multi-Branch ERP Sync",
        "E-Invoicing Direct Government API",
        "Dedicated CA Relationship Manager",
        "Custom Print Themes & Ledgers",
      ],
      featuresGu: [
        "અનલિમિટેડ કંપનીઓ અને બ્રાન્ચ",
        "અનલિમિટેડ સ્ટાફ યુઝર્સ અને રોલ",
        "મલ્ટી-બ્રાન્ચ ERP સિન્ક",
        "સરકારી e-Invoice સીધો API",
        "ડેડિકેટેડ CA મેનેજર સપોર્ટ",
        "કસ્ટમ પ્રિન્ટ થીમ્સ અને રોજમેળ",
      ],
    },
  ];

  return (
    <div className="py-12" id="pricing" data-testid="price-roll-section">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="text-xs font-bold uppercase tracking-wider text-[#E15A2B]" style={monoFont}>
          {gu ? "સરળ અને પારદર્શક કિંમત" : "Simple & Transparent Pricing"}
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-[#0C1827] mt-2" style={serifFont}>
          {gu ? "વિકાસના દરેક તબક્કા માટે અનુકૂળ પ્લાન." : "Flexible plans for every stage of growth."}
        </h2>
        <p className="text-sm text-[#0C1827]/70 mt-2">
          {gu
            ? "કોઈ છૂપો ચાર્જ નથી. 30 દિવસ પૂરા ફીચર્સ સાથે મફત અજમાવો."
            : "No hidden charges. Try free for 30 days with full features."}
        </p>

        {/* Toggle */}
        <div className="inline-flex items-center gap-2 p-1.5 bg-[#FAF7F2] rounded-full border border-[#0C1827]/15 mt-6 shadow-2xs">
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${cycle === "monthly"
              ? "bg-[#0C1827] text-white shadow-xs"
              : "text-[#0C1827]/70 hover:text-[#0C1827]"
              }`}
          >
            {gu ? "માસિક (Monthly)" : "Monthly"}
          </button>
          <button
            type="button"
            onClick={() => setCycle("yearly")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${cycle === "yearly"
              ? "bg-[#0C1827] text-white shadow-xs"
              : "text-[#0C1827]/70 hover:text-[#0C1827]"
              }`}
          >
            <span>{gu ? "વાર્ષિક (Yearly)" : "Yearly"}</span>
            <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider">
              {gu ? "20% બચાવો" : "Save 20%"}
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {plans.map((p) => {
          const price = cycle === "yearly" ? p.yearly : p.monthly;
          return (
            <div
              key={p.id}
              className={`rounded-3xl p-7 flex flex-col justify-between transition-all ${p.popular
                ? "bg-[#0C1827] text-white shadow-2xl ring-2 ring-[#E15A2B] relative scale-[1.02]"
                : "bg-white text-[#0C1827] border border-[#0C1827]/10 shadow-xs"
                }`}
            >
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#E15A2B] text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                  {gu ? "સૌથી વધુ પસંદગી" : "Most Popular"}
                </span>
              )}

              <div>
                <h3 className="text-xl font-bold" style={serifFont}>
                  {gu ? p.nameGu : p.nameEn}
                </h3>
                <p className={`text-xs mt-1 ${p.popular ? "text-white/70" : "text-[#0C1827]/60"}`}>
                  {gu ? p.forGu : p.forEn}
                </p>

                {/* Price Display with Animated Odometer */}
                <div className="my-6 pb-6 border-b border-current/15 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold">₹</span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={price}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.25 }}
                      className="text-4xl md:text-5xl font-black tracking-tight"
                      style={serifFont}
                    >
                      {price.toLocaleString("en-IN")}
                    </motion.span>
                  </AnimatePresence>
                  <span className={`text-xs ${p.popular ? "text-white/70" : "text-[#0C1827]/60"}`} style={monoFont}>
                    / {gu ? "મહિને" : "month"}
                  </span>
                </div>

                {/* Features */}
                <ul className="space-y-3 text-xs mb-8">
                  {(gu ? p.featuresGu : p.featuresEn).map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className={`font-bold mt-0.5 ${p.popular ? "text-[#E15A2B]" : "text-emerald-600"}`}>
                        ✓
                      </span>
                      <span className={p.popular ? "text-white/90" : "text-[#0C1827]/85"}>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <Link
                  href="/login?mode=signup"
                  className={`w-full py-3 rounded-full text-xs font-bold flex items-center justify-center transition-all ${p.popular
                    ? "bg-[#E15A2B] hover:bg-[#d04b1e] text-white shadow-md"
                    : "bg-[#0C1827] hover:bg-[#1a2c42] text-white"
                    }`}
                >
                  {gu ? "30 દિવસ મફત શરૂ કરો" : "Start free for 30 days"}
                </Link>
                <p className={`text-[10px] text-center mt-2 ${p.popular ? "text-white/60" : "text-[#0C1827]/50"}`} style={monoFont}>
                  {gu ? "ક્રેડિટ કાર્ડ જરૂરી નથી" : "No card required"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DIRECT COMPARISON MATRIX
// ---------------------------------------------------------------------------
const COMPARISON_ROWS = [
  { feature: "GST-ready invoice workflows", Myownbillbook: true, others: "Basic PDF" },
  { feature: "Gujarati language support (ખાતાવહી & UI)", Myownbillbook: true, others: false },
  { feature: "Instant purchase bill OCR scanner", Myownbillbook: true, others: false },
  { feature: "Multi-godown live inventory & transfers", Myownbillbook: true, others: "Single store only" },
  { feature: "Double-entry ledger (રોજમેળ & Daybook)", Myownbillbook: true, others: false },
  { feature: "GSTR-1, 3B & 2B return preparation", Myownbillbook: true, others: "Paid Add-on" },
  { feature: "POS thermal receipts (2-inch & 3-inch)", Myownbillbook: true, others: true },
  { feature: "Batch number & expiry date tracking", Myownbillbook: true, others: "Enterprise only" },
  { feature: "Multi-company switching in one account", Myownbillbook: true, others: false },
];

function UsVsThemComparison({ gu }: { gu: boolean }) {
  return (
    <div className="py-12 max-w-4xl mx-auto" data-testid="us-vs-them">
      <div className="text-center mb-8">
        <span className="text-xs font-bold uppercase tracking-wider text-[#E15A2B]" style={monoFont}>
          {gu ? "તુલના" : "Direct Comparison"}
        </span>
        <h2 className="text-2xl md:text-3xl font-bold text-[#0C1827] mt-1" style={serifFont}>
          {gu
            ? "ભારતીય વેપારીઓની વાસ્તવિક જરૂરિયાત માટે બનેલું."
            : "Built for the way Indian businesses actually work."}
        </h2>
      </div>

      <div className="bg-white rounded-3xl border border-[#0C1827]/15 overflow-hidden shadow-xl">
        <div className="grid grid-cols-12 bg-[#FAF7F2] p-4 text-xs font-bold border-b border-[#0C1827]/10" style={monoFont}>
          <div className="col-span-6 md:col-span-7 text-[#0C1827]">
            {gu ? "સુવિધાઓ (Capabilities)" : "Capabilities"}
          </div>
          <div className="col-span-3 md:col-span-3 text-center text-[#E15A2B] font-black">Myownbillbook</div>
          <div className="col-span-3 md:col-span-2 text-center text-[#0C1827]/50">
            {gu ? "અન્ય સોફ્ટવેર" : "Generic Tools"}
          </div>
        </div>

        <div className="divide-y divide-[#0C1827]/5 text-xs">
          {COMPARISON_ROWS.map((row, idx) => (
            <div key={idx} className="grid grid-cols-12 p-3.5 items-center hover:bg-[#FAF7F2]/50 transition-colors">
              <div className="col-span-6 md:col-span-7 font-semibold text-[#0C1827]">
                {row.feature}
              </div>
              <div className="col-span-3 md:col-span-3 text-center">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                  ✓
                </span>
              </div>
              <div className="col-span-3 md:col-span-2 text-center text-[#0C1827]/60">
                {row.others === true ? (
                  <span className="text-emerald-700">✓</span>
                ) : row.others === false ? (
                  <span className="text-rose-400 font-bold">✗</span>
                ) : (
                  <span className="text-[10px] text-slate-500 italic">{row.others}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FINAL CTA & SUCCESS CELEBRATION
// ---------------------------------------------------------------------------
function FinalClickSuccessParty({ gu }: { gu: boolean }) {
  const [clicked, setClicked] = useState(false);
  const [sparks, setSparks] = useState<Array<{ id: number; x: number; y: number; color: string }>>([]);

  const handleStartTrial = () => {
    if (clicked) return;
    setClicked(true);

    const newSparks = Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 280,
      y: (Math.random() - 0.5) * 200 - 40,
      color: i % 2 === 0 ? "#E15A2B" : "#10B981",
    }));
    setSparks(newSparks);
  };

  return (
    <div
      className="relative rounded-3xl overflow-hidden bg-[#0C1827] text-white p-8 md:p-16 my-16 shadow-2xl border border-white/10"
      data-testid="final-cta-section"
    >
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <Image
          src="/landing/botanical.jpg"
          alt="Desk background"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0C1827] via-[#0C1827]/90 to-[#0C1827]"></div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto text-center space-y-4">
        <div className="inline-flex items-center justify-center mb-2">
          <BrandLogo size="lg" showSubtitle subtitle="Paneliya Technology" />
        </div>

        <h2 className="text-3xl md:text-5xl font-black text-white leading-tight" style={serifFont}>
          {gu ? "સારા કામ માટે " : "Make room for the "}
          <span className="text-[#E15A2B] italic">{gu ? "જગ્યા બનાવો." : "good work."}</span>
        </h2>

        <p className="text-sm md:text-base text-white/80 max-w-lg mx-auto leading-relaxed">
          {gu
            ? "30 દિવસની મફત અજમાયશ શરૂ કરો અને જુઓ કે રોજમેળ તમારા બિલિંગ, સ્ટોક અને હિસાબને કેવી રીતે સરળ બનાવે છે."
            : "Start your 30-day trial and see how Myownbillbook simplifies your invoices, inventory and ખાતાવહી."}
        </p>

        <div className="pt-4 relative flex flex-col items-center justify-center">
          <AnimatePresence>
            {sparks.map((sp) => (
              <motion.span
                key={sp.id}
                initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                animate={{ opacity: 0, scale: 1.5, x: sp.x, y: sp.y }}
                transition={{ duration: 1.2, ease: easeCubic }}
                className="absolute w-2.5 h-2.5 rounded-full pointer-events-none z-30"
                style={{ backgroundColor: sp.color }}
              />
            ))}
          </AnimatePresence>

          {!clicked ? (
            <button
              type="button"
              onClick={handleStartTrial}
              className="px-8 py-4 rounded-full bg-[#E15A2B] hover:bg-[#d04b1e] text-white text-base font-bold shadow-xl transition-all transform hover:-translate-y-0.5 cursor-pointer active:scale-95"
            >
              {gu ? "30 દિવસની મફત અજમાયશ શરૂ કરો →" : "Start your 30-day trial →"}
            </button>
          ) : (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-white flex items-center gap-3 shadow-xl"
            >
              <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                ✓
              </span>
              <div className="text-left">
                <p className="text-sm font-bold text-emerald-300">
                  {gu ? "તમે રસ્તા પર છો!" : "You're on your way!"}
                </p>
                <p className="text-xs text-white/80">
                  {gu
                    ? "તમારી રોજમેળ વર્કસ્પેસ તૈયાર થઈ રહી છે..."
                    : "Your Myownbillbook workspace is ready to begin."}
                </p>
              </div>
              <Link
                href="/login?mode=signup"
                className="ml-3 px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[#0C1827] text-xs font-bold"
              >
                {gu ? "આગળ વધો →" : "Open Workspace →"}
              </Link>
            </motion.div>
          )}

          <p className="text-xs text-white/60 mt-3" style={monoFont}>
            {gu ? "ક્રેડિટ કાર્ડ જરૂરી નથી · 5 મિનિટમાં સેટઅપ" : "No card required · Set up in under 5 minutes"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HOW IT WORKS: 4-STEP PROCESS
// ---------------------------------------------------------------------------
const PROCESS_STEPS = [
  {
    n: "01",
    titleEn: "Set up your GSTIN and business",
    titleGu: "તમારો GSTIN અને વેપાર સેટ કરો",
    descEn: "Add trade name, logo, bank details and multiple branches.",
    descGu: "પેઢીનું નામ, લોગો, બેંક ખાતું અને બ્રાન્ચ વિગતો ઉમેરો.",
  },
  {
    n: "02",
    titleEn: "Create invoices or scan purchase bills",
    titleGu: "ઇન્વૉઇસ બનાવો અથવા ખરીદ બિલ સ્કેન કરો",
    descEn: "Issue tax bills in 10 seconds or photograph incoming vendor receipts.",
    descGu: "10 સેકન્ડમાં બિલ કાઢો અથવા વેપારીની પાવતીનો ફોટો પાડો.",
  },
  {
    n: "03",
    titleEn: "Sync inventory and ledgers",
    titleGu: "સ્ટોક અને ખાતાવહી ઓટોમેટિક મેળવો",
    descEn: "Sale updates godown quantities and party balances in one stroke.",
    descGu: "વેચાણ થતાં જ ગોડાઉન સ્ટોક અને ઉધાર-જમા ખાતું એકસાથે લખાય.",
  },
  {
    n: "04",
    titleEn: "Export reports and file GST returns",
    titleGu: "રિપોર્ટ એક્સપોર્ટ કરો અને GST ફાઇલ કરો",
    descEn: "Ready-to-upload GSTR-1 & GSTR-3B JSON with zero errors.",
    descGu: "સરકારી પોર્ટલ પર અપલોડ માટે ભૂલ વગરનું GSTR-1 અને 3B તૈયાર.",
  },
];

function ProcessDrawSection({ gu }: { gu: boolean }) {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="py-12 max-w-5xl mx-auto" data-testid="process-draw-section">
      <div className="text-center mb-10">
        <span className="text-xs font-bold uppercase tracking-wider text-[#E15A2B]" style={monoFont}>
          {gu ? "કેવી રીતે કામ કરે છે" : "How it works"}
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-[#0C1827] mt-1" style={serifFont}>
          {gu ? "પહેલા બિલથી અંતિમ બેલેન્સ સુધી." : "From first bill to final balance."}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
        {PROCESS_STEPS.map((step, idx) => {
          const isActive = idx === activeStep;
          return (
            <div
              key={step.n}
              onClick={() => setActiveStep(idx)}
              className={`p-6 rounded-2xl border transition-all cursor-pointer ${isActive
                ? "bg-[#FAF7F2] border-[#E15A2B] shadow-md ring-2 ring-[#E15A2B]/20"
                : "bg-white border-[#0C1827]/10 hover:border-[#0C1827]/30"
                }`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-black text-[#E15A2B]" style={monoFont}>
                  {step.n}
                </span>
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? "bg-emerald-600 text-white" : "bg-[#0C1827]/10 text-[#0C1827]"
                    }`}
                >
                  ✓
                </span>
              </div>
              <h3 className="text-base font-bold text-[#0C1827] leading-snug" style={serifFont}>
                {gu ? step.titleGu : step.titleEn}
              </h3>
              <p className="text-xs text-[#0C1827]/70 mt-2 leading-relaxed">
                {gu ? step.descGu : step.descEn}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FAQ SECTION
// ---------------------------------------------------------------------------
const FAQS = [
  {
    qEn: "Is Myownbillbook fully GST-compliant?",
    qGu: "શું રોજમેળ સંપૂર્ણપણે GST-સુસંગત છે?",
    aEn: "Yes, 100%. Myownbillbook supports B2B, B2C, SEZ, exports, and multi-state IGST calculations. GSTR-1, GSTR-3B and e-Way Bill JSON files export in official government portal format.",
    aGu: "હા, 100%. રોજમેળ B2B, B2C, SEZ અને આંતરરાજ્ય IGST બધા જ કર નિયમોને અનુસરે છે. GSTR-1 અને 3B ફાઈલો સીધી પોર્ટલ ફોર્મેટમાં તૈયાર થાય છે.",
  },
  {
    qEn: "Can I use Myownbillbook in Gujarati and English together?",
    qGu: "શું હું એકસાથે ગુજરાતી અને અંગ્રેજી બંનેમાં ઉપયોગ કરી શકું?",
    aEn: "Absolutely. You can maintain party names, item descriptions, and print invoices with bilingual headers. Team members can switch between languages with one click.",
    aGu: "ચોક્કસ. તમે પાર્ટીના નામ, વસ્તુઓ અને બિલ બંને ભાષામાં રાખી શકો છો. આખી ટીમ એક ક્લિકથી ભાષા બદલી શકે છે.",
  },
  {
    qEn: "How does the purchase bill OCR work?",
    qGu: "ખરીદ બિલનું OCR સ્કેનર કેવી રીતે કામ કરે છે?",
    aEn: "Simply take a photo or upload a PDF of any vendor bill. Our OCR chip automatically extracts vendor GSTIN, invoice date, line items, tax rates, and enters them into stock.",
    aGu: "કોઈપણ ખરીદ બિલનો ફોટો પાડો. સિસ્ટમ આપમેળે વેપારીનો GSTIN, તારીખ, વસ્તુઓ અને રકમ વાંચીને સ્ટોકમાં જમા કરી દે છે.",
  },
  {
    qEn: "Can I manage multiple godowns and stock transfers?",
    qGu: "શું હું એકથી વધુ ગોડાઉન અને સ્ટોક ટ્રાન્સફર મેનેજ કરી શકું?",
    aEn: "Yes. Track stock counts individually per godown, shop floor, or vehicle van. Transfer items between godowns with instant stock-movement slips.",
    aGu: "હા. દુકાન અને અલગ અલગ ગોડાઉનનો સ્ટોક જુદો જુદો ટ્રેક કરો અને વચ્ચે થતા ટ્રાન્સફરની ચલણ પાકો હિસાબ રાખો.",
  },
  {
    qEn: "Is my financial data secure and backed up?",
    qGu: "શું મારો નાણાકીય ડેટા સુરક્ષિત અને બેકઅપ થાય છે?",
    aEn: "Your data is protected with 256-bit bank-grade encryption and automated daily cloud backups. Only authorized users with your permission can access the records.",
    aGu: "તમારો ડેટા 256-બીટ બેંક-ગ્રેડ એન્ક્રિપ્શન સાથે સુરક્ષિત છે અને રોજ ઓટોમેટિક ક્લાઉડ બેકઅપ થાય છે.",
  },
];

function FaqAccordion({ gu }: { gu: boolean }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="py-12 max-w-3xl mx-auto" id="questions" data-testid="faq-section">
      <div className="text-center mb-8">
        <span className="text-xs font-bold uppercase tracking-wider text-[#E15A2B]" style={monoFont}>
          {gu ? "પ્રશ્નોત્તરી" : "Frequently Asked Questions"}
        </span>
        <h2 className="text-3xl font-bold text-[#0C1827] mt-1" style={serifFont}>
          {gu ? "કાઉન્ટર પર પૂછાતા પ્રશ્નો." : "Asked at the counter."}
        </h2>
      </div>

      <div className="space-y-3">
        {FAQS.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-[#0C1827]/10 overflow-hidden transition-all shadow-2xs"
            >
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-[#0C1827] cursor-pointer hover:bg-[#FAF7F2]/60"
              >
                <span>{gu ? faq.qGu : faq.qEn}</span>
                <span className="text-base text-[#E15A2B] shrink-0 font-mono">
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              {isOpen && (
                <div className="px-5 pb-5 text-xs text-[#0C1827]/75 leading-relaxed border-t border-[#0C1827]/5 pt-3">
                  {gu ? faq.aGu : faq.aEn}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAIN Myownbillbook LANDING PAGE COMPONENT
// ---------------------------------------------------------------------------
export function MyownbillbookLanding() {
  const { lang, setLang } = useAuth();
  const gu = lang === "gu";
  const reduce = useReducedMotion();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  // Initialize Lenis smooth scroll
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      anchors: true,
      lerp: 0.085,
      respectReducedMotion: true,
    });
    return () => lenis.destroy();
  }, []);

  // Smart sticky header: hide on scroll down, show on upscroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 20);

      if (currentScrollY < 60) {
        setShowHeader(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 80) {
        // Scrolling DOWN: hide header
        setShowHeader(false);
        setMobileMenuOpen(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling UP anywhere on the page: show header smoothly
        setShowHeader(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <div
      className="min-h-screen bg-[#F8F5EE] text-[#0C1827] selection:bg-[#E15A2B]/20 selection:text-[#0C1827] overflow-x-hidden font-sans"
      style={sansFont}
    >
      {/* ===================================================================
          1. SMART STICKY HEADER (Taller height, hide on scroll down, show on upscroll)
      =================================================================== */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out ${showHeader ? "translate-y-0" : "-translate-y-full"
          } ${isScrolled
            ? "bg-[#F8F5EE]/95 backdrop-blur-md shadow-md border-b border-[#0C1827]/10"
            : "bg-[#F8F5EE] border-b border-[#0C1827]/10"
          }`}
      >
        <div className="max-w-[1340px] mx-auto px-3 sm:px-6 lg:px-8 h-18 sm:h-22 flex items-center justify-between gap-2 sm:gap-4">
          {/* User's original beloved BrandLogo with ample presence */}
          <div data-testid="nav-logo" className="shrink-0 flex items-center">
            <div className="block sm:hidden">
              <BrandLogo size="sm" showSubtitle subtitle="Paneliya Technology" />
            </div>
            <div className="hidden sm:block">
              <BrandLogo size="md" showSubtitle subtitle="Paneliya Technology" />
            </div>
          </div>

          {/* Navigation links with increased readable font size */}
          <nav className="hidden lg:flex items-center gap-8 text-[15px] font-semibold text-[#0C1827]/85 tracking-tight" aria-label="Main Navigation">
            <a href="#why" className="hover:text-[#E87536] transition-colors py-2 hover:font-bold">
              {gu ? "શા માટે રોજમેળ" : "Why Myownbillbook"}
            </a>
            <a href="#toolkit" className="hover:text-[#E87536] transition-colors py-2 hover:font-bold">
              {gu ? "સુવિધાઓ" : "Features"}
            </a>
            <a href="#trade" className="hover:text-[#E87536] transition-colors py-2 hover:font-bold">
              {gu ? "તમારા વેપાર માટે" : "For your business"}
            </a>
            <a href="#pricing" className="hover:text-[#E87536] transition-colors py-2 hover:font-bold">
              {gu ? "કિંમત" : "Pricing"}
            </a>
            <a href="#questions" className="hover:text-[#E87536] transition-colors py-2 hover:font-bold">
              {gu ? "પ્રશ્નોત્તરી" : "Questions"}
            </a>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Bilingual toggle */}
            <button
              type="button"
              onClick={() => setLang(gu ? "en" : "gu")}
              className="px-2.5 sm:px-3.5 py-1.5 rounded-full border border-[#0C1827]/15 bg-white text-xs font-bold text-[#0C1827] hover:border-[#E87536] transition-colors cursor-pointer shadow-2xs shrink-0"
              style={monoFont}
              aria-label="Switch Language"
            >
              {gu ? "EN | ગુજરાતી" : "En | ગુજરાતી"}
            </button>

            <Link
              href="/login"
              className="hidden sm:inline-block text-sm font-bold text-[#0C1827] hover:text-[#E87536] px-3.5 py-2 transition-colors"
            >
              {gu ? "સાઇન ઇન" : "Sign in"}
            </Link>

            {/* Start Free button - visible on sm+ (tablets/desktops), while mobile (<sm) uses the prominent button in mobile menu */}
            <Link
              href="/login?mode=signup"
              className="hidden sm:inline-flex px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-[#0C1827] hover:bg-[#1e2f47] text-white text-sm font-bold transition-all shadow-sm items-center gap-2 active:scale-95 shrink-0"
            >
              <span>{gu ? "શરૂ કરો" : "Start Free"}</span>
              <span className="text-[#E87536]">→</span>
            </Link>

            {/* Mobile menu trigger - ALWAYS VISIBLE on mobile & tablet (< lg) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-[#0C1827] bg-[#0C1827]/5 hover:bg-[#0C1827]/10 active:bg-[#0C1827]/15 border border-[#0C1827]/15 transition-all shrink-0 flex items-center justify-center cursor-pointer shadow-2xs"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6 text-[#0C1827]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-[#0C1827]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile slide-down drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="lg:hidden bg-[#FAF7F2] border-b border-[#0C1827]/15 px-5 py-5 shadow-2xl max-h-[calc(100vh-4.5rem)] overflow-y-auto"
            >
              <div className="space-y-1 pb-4 border-b border-[#0C1827]/10">
                <a
                  href="#why"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between text-base font-bold text-[#0C1827] py-3 px-3 rounded-xl hover:bg-[#0C1827]/5 hover:text-[#E87536] transition-colors"
                >
                  <span>{gu ? "શા માટે રોજમેળ" : "Why Myownbillbook"}</span>
                  <span className="text-xs text-[#0C1827]/40 font-mono">01</span>
                </a>
                <a
                  href="#toolkit"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between text-base font-bold text-[#0C1827] py-3 px-3 rounded-xl hover:bg-[#0C1827]/5 hover:text-[#E87536] transition-colors"
                >
                  <span>{gu ? "સુવિધાઓ અને ટૂલકિટ" : "Features & Toolkit"}</span>
                  <span className="text-xs text-[#0C1827]/40 font-mono">02</span>
                </a>
                <a
                  href="#trade"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between text-base font-bold text-[#0C1827] py-3 px-3 rounded-xl hover:bg-[#0C1827]/5 hover:text-[#E87536] transition-colors"
                >
                  <span>{gu ? "તમારા વેપાર માટે" : "For your business"}</span>
                  <span className="text-xs text-[#0C1827]/40 font-mono">03</span>
                </a>
                <a
                  href="#pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between text-base font-bold text-[#0C1827] py-3 px-3 rounded-xl hover:bg-[#0C1827]/5 hover:text-[#E87536] transition-colors"
                >
                  <span>{gu ? "કિંમત અને પ્લાન્સ" : "Pricing Plans"}</span>
                  <span className="text-xs text-[#0C1827]/40 font-mono">04</span>
                </a>
                <a
                  href="#questions"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between text-base font-bold text-[#0C1827] py-3 px-3 rounded-xl hover:bg-[#0C1827]/5 hover:text-[#E87536] transition-colors"
                >
                  <span>{gu ? "પ્રશ્નોત્તરી (FAQ)" : "Questions & Answers"}</span>
                  <span className="text-xs text-[#0C1827]/40 font-mono">05</span>
                </a>
              </div>

              <div className="pt-4 flex flex-col gap-2.5">
                <Link
                  href="/login?mode=signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-3.5 rounded-xl bg-[#E87536] hover:bg-[#D66527] text-white text-base font-bold shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>{gu ? "મફત શરૂ કરો (Start Free)" : "Start Free for 30 Days"}</span>
                  <span>→</span>
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-3 rounded-xl border border-[#0C1827]/20 text-sm font-bold text-[#0C1827] hover:bg-white transition-colors"
                >
                  {gu ? "પહેલેથી ખાતું છે? સાઇન ઇન (Sign in)" : "Already have an account? Sign in"}
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ===================================================================
          2. HERO SECTION & MASKED REVEAL
      =================================================================== */}
      <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-[#E15A2B]/8 rounded-full blur-3xl pointer-events-none -z-10"></div>
        <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -z-10"></div>

        <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-6 space-y-6">
              {/* Masked Headline: "Trade moves. Myownbillbook." */}
              <div className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#0C1827] leading-[1.08]">
                <div className="overflow-hidden">
                  <motion.div
                    initial={reduce ? false : { y: "100%" }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.7, delay: 0.1, ease: easeCubic }}
                    style={serifFont}
                  >
                    {gu ? "વેપાર " : "Trade "}
                  </motion.div>
                </div>
                <div className="overflow-hidden">
                  <motion.div
                    initial={reduce ? false : { y: "100%" }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.7, delay: 0.25, ease: easeCubic }}
                    style={serifFont}
                  >
                    {gu ? "ચાલે છે." : "moves."}
                  </motion.div>
                </div>
                <div className="overflow-hidden">
                  <motion.div
                    initial={reduce ? false : { y: "100%" }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.7, delay: 0.4, ease: easeCubic }}
                    className="text-[#E15A2B] italic"
                    style={serifFont}
                  >
                    {gu ? "મારી પોતાની બિલબુક." : "Myownbillbook."}
                  </motion.div>
                </div>
              </div>

              {/* Supporting Copy */}
              <motion.p
                initial={reduce ? false : { opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.55, ease: easeCubic }}
                className="text-base sm:text-lg text-[#0C1827]/75 max-w-lg leading-relaxed"
              >
                {gu
                  ? "ઝડપી GST બિલિંગ, ઇન્વેન્ટરી અને ખાતાવહી — ભારતને ગતિમાન રાખતા વેપારીઓ માટે."
                  : "Fast GST billing, inventory and ખાતાવહી for the people who keep India moving."}
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7, ease: easeCubic }}
                className="flex flex-wrap items-center gap-3 pt-2"
              >
                <Link
                  href="/login?mode=signup"
                  className="px-7 py-3.5 rounded-full bg-[#0C1827] hover:bg-[#1a2c42] text-white text-sm font-bold shadow-lg transition-transform hover:-translate-y-0.5 flex items-center gap-2 group"
                >
                  <span>{gu ? "30 દિવસ મફત શરૂ કરો" : "Start free for 30 days"}</span>
                  <span className="text-[#E15A2B] transition-transform group-hover:translate-x-1">→</span>
                </Link>

                <a
                  href="#toolkit"
                  className="px-6 py-3.5 rounded-full border border-[#0C1827]/20 hover:border-[#0C1827] text-sm font-bold text-[#0C1827] transition-colors"
                >
                  {gu ? "વર્કસ્પેસ જુઓ" : "Explore the workspace"}
                </a>
              </motion.div>

              {/* Trust Indicator */}
              <motion.div
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.9 }}
                className="flex items-center gap-3 pt-4 border-t border-[#0C1827]/10"
              >
                <div className="flex -space-x-2">
                  {["voice-1.jpg", "voice-2.jpg", "voice-3.jpg"].map((pic, i) => (
                    <div
                      key={i}
                      className="relative w-8 h-8 rounded-full border-2 border-[#F8F5EE] overflow-hidden"
                    >
                      <Image
                        src={`/landing/${pic}`}
                        alt="Indian business owner avatar"
                        fill
                        className="object-cover"
                        sizes="32px"
                      />
                    </div>
                  ))}
                </div>
                <span className="text-xs font-semibold text-[#0C1827]/75">
                  {gu ? "25,000+ ભારતીય વેપારીઓનો ભરોસો" : "Made for 25,000+ Indian businesses"}
                </span>
              </motion.div>
            </div>

            {/* Right Product Invoice Visual & Live Pings */}
            <div className="lg:col-span-6 relative">
              <div className="relative mx-auto max-w-[500px]">
                {/* Authentic Tax Invoice Card */}
                <div className="bg-white rounded-2xl border border-[#0C1827]/15 shadow-2xl p-6 text-[11px] text-[#0C1827] space-y-4 select-none relative">
                  {/* Floating Circular 'GST READY' Stamp */}
                  <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full border-2 border-dashed border-[#E15A2B] bg-[#FAF7F2] text-[#E15A2B] flex flex-col items-center justify-center font-black text-[9px] uppercase tracking-wider rotate-12 shadow-md">
                    <span>GST</span>
                    <span>READY</span>
                  </div>

                  {/* Floating OCR scanned pill */}
                  <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] font-bold flex items-center gap-1.5 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>{gu ? "બિલ સ્કેન થયું" : "Bill scanned"}</span>
                  </div>

                  {/* Invoice Header */}
                  <div className="flex justify-between items-start pt-2 border-b border-[#0C1827]/10 pb-3">
                    <div>
                      <p className="font-black text-sm uppercase tracking-wide text-[#0C1827]">
                        શ્રીજી એન્ટરપ્રાઇઝ · Shreeji Enterprise
                      </p>
                      <p className="text-[10px] text-[#0C1827]/60" style={monoFont}>
                        GSTIN: 24ABCDE1234F1Z5
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-xs uppercase" style={monoFont}>
                        TAX INVOICE
                      </p>
                      <p className="text-[9.5px] text-[#0C1827]/60" style={monoFont}>
                        INV-26-27-0104 · 18 Apr 2026
                      </p>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="overflow-hidden">
                    <table className="w-full text-left text-[10px]">
                      <thead>
                        <tr className="border-b border-[#0C1827]/10 text-[#0C1827]/60 uppercase tracking-wider" style={monoFont}>
                          <th className="py-1">Item</th>
                          <th className="py-1 text-center">Qty</th>
                          <th className="py-1 text-right">Rate</th>
                          <th className="py-1 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#0C1827]/5">
                        <tr>
                          <td className="py-1.5 font-medium">Wireless Fast Charger 15W</td>
                          <td className="py-1.5 text-center" style={monoFont}>10</td>
                          <td className="py-1.5 text-right" style={monoFont}>₹ 450.00</td>
                          <td className="py-1.5 text-right font-bold" style={monoFont}>₹ 4,500.00</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 font-medium">Type-C Braided Cable 2M</td>
                          <td className="py-1.5 text-center" style={monoFont}>25</td>
                          <td className="py-1.5 text-right" style={monoFont}>₹ 120.00</td>
                          <td className="py-1.5 text-right font-bold" style={monoFont}>₹ 3,000.00</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 font-medium">Extension Board 4-Way Spike</td>
                          <td className="py-1.5 text-center" style={monoFont}>8</td>
                          <td className="py-1.5 text-right" style={monoFont}>₹ 720.00</td>
                          <td className="py-1.5 text-right font-bold" style={monoFont}>₹ 5,760.00</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Totals & GST Summary */}
                  <div className="border-t border-[#0C1827]/10 pt-2 space-y-1 text-[10.5px]">
                    <div className="flex justify-between text-[#0C1827]/70">
                      <span>Taxable Supply</span>
                      <span style={monoFont}>₹ 13,260.00</span>
                    </div>
                    <div className="flex justify-between text-[#0C1827]/70">
                      <span>CGST (9%) + SGST (9%)</span>
                      <span style={monoFont}>₹ 2,386.80</span>
                    </div>
                    <div className="flex justify-between font-black text-sm text-[#0C1827] pt-1 border-t border-[#0C1827]/10">
                      <span>Grand Total</span>
                      <span className="text-[#0C1827]" style={monoFont}>
                        ₹ 15,646.80
                      </span>
                    </div>
                  </div>

                  {/* Footer E-way bill ready badge */}
                  <div className="pt-2 flex items-center justify-between text-[9px] text-[#0C1827]/60 border-t border-dashed border-[#0C1827]/15" style={monoFont}>
                    <span className="text-emerald-700 font-bold">✓ e-Way Bill JSON ready</span>
                    <span>Auth Signatory: Shreeji Enterprise</span>
                  </div>
                </div>

                {/* Floating Live Sale Pings Overlay */}
                <div className="mt-4 sm:absolute sm:-bottom-8 sm:-right-8 z-20">
                  <LiveSalePings gu={gu} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          INFINITE CONTINUOUS MARQUEE RIBBON (Runs continuously non-stop!)
      =================================================================== */}
      <div className="bg-[#0C1827] text-white py-3 overflow-hidden border-y border-[#E15A2B]/30 select-none">
        <div className="animate-marquee-infinite text-xs uppercase tracking-widest font-semibold flex items-center" style={monoFont}>
          {/* Segment 1 */}
          <div className="flex items-center gap-8 px-4 shrink-0">
            <span>રોજમેળ · GST BILLING</span>
            <span className="text-[#E15A2B]">★</span>
            <span>ખાતાવહી · INVENTORY THAT THINKS AHEAD</span>
            <span className="text-[#E15A2B]">★</span>
            <span>[012-924] · રોકડ મેળ</span>
            <span className="text-[#E15A2B]">★</span>
            <span>100% COMPLIANT WORKFLOWS</span>
            <span className="text-[#E15A2B]">★</span>
            <span>GST INVOICES · PURCHASE OCR</span>
            <span className="text-[#E15A2B]">★</span>
          </div>
          {/* Duplicate Segment 2 for 100% seamless infinite loop */}
          <div className="flex items-center gap-8 px-4 shrink-0">
            <span>રોજમેળ · GST BILLING</span>
            <span className="text-[#E15A2B]">★</span>
            <span>ખાતાવહી · INVENTORY THAT THINKS AHEAD</span>
            <span className="text-[#E15A2B]">★</span>
            <span>[012-924] · રોકડ મેળ</span>
            <span className="text-[#E15A2B]">★</span>
            <span>100% COMPLIANT WORKFLOWS</span>
            <span className="text-[#E15A2B]">★</span>
            <span>GST INVOICES · PURCHASE OCR</span>
            <span className="text-[#E15A2B]">★</span>
          </div>
        </div>
      </div>

      {/* ===================================================================
          3. SECTION 02: "Less bookkeeping. More business." (Clean, no clunky box)
      =================================================================== */}
      <section className="py-20 md:py-28" id="why">
        <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-bold uppercase tracking-wider text-[#E15A2B]" style={monoFont}>
                {gu ? "શા માટે રોજમેળ" : "Why Myownbillbook"}
              </span>
              <h2 className="text-4xl sm:text-5xl font-bold text-[#0C1827] leading-tight" style={serifFont}>
                {gu ? "ઓછું ખાતું." : "Less bookkeeping."}
                <br />
                <span className="text-[#E15A2B] italic">{gu ? "વધુ વેપાર." : "More business."}</span>
              </h2>
              <p className="text-base text-[#0C1827]/75 leading-relaxed">
                {gu
                  ? "તમારા ઇન્વૉઇસ, ગોડાઉન સ્ટોક અને ખાતાવહી એકબીજા સાથે સતત જોડાયેલા છે — જેથી તમે વેપાર વધારવા પર ધ્યાન આપી શકો."
                  : "Your invoices, stock and books work together — so you can focus on what really matters: growing your business."}
              </p>

              {/* Feature pills */}
              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-bold">
                    ✓
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0C1827]">
                      {gu ? "સમય બચાવો" : "Save time"}
                    </h3>
                    <p className="text-xs text-[#0C1827]/70">
                      {gu ? "રોજિંદી ગણતરીઓ આપમેળે થઈ જાય છે." : "Automate routine billing and eliminate manual errors."}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 font-bold">
                    ✓
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0C1827]">
                      {gu ? "નિયમોનું પાલન (GST Compliant)" : "Stay compliant"}
                    </h3>
                    <p className="text-xs text-[#0C1827]/70">
                      {gu ? "ગણતરી અને રિપોર્ટ સરકારી નિયમો મુજબ તૈયાર." : "GST-ready calculations, HSN codes and audit logs."}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 font-bold">
                    ✓
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0C1827]">
                      {gu ? "વિશ્વાસ સાથે આગળ વધો" : "Grow with confidence"}
                    </h3>
                    <p className="text-xs text-[#0C1827]/70">
                      {gu ? "દરેક રૂપિયો અને સ્ટોક ક્યાં છે તે સ્પષ્ટ દેખાય." : "Real-time ledger insights for sound business decisions."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Photo with Quote Tag */}
            <div className="lg:col-span-6 relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-[#0C1827]/15 h-[440px]">
                <Image
                  src="/landing/shopkeeper.jpg"
                  alt="Modern Indian retailer using POS software"
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 600px, 100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0C1827]/70 via-transparent to-transparent"></div>

                {/* Quote Badge Overlay */}
                <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-[#0C1827]/10 shadow-lg">
                  <p className="text-xs font-bold text-[#0C1827] italic" style={serifFont}>
                    &ldquo;{gu
                      ? "વાપરવામાં સાવ સહેલું અને વેપાર માટે અત્યંત તાકાતવાન સોફ્ટવેર છે."
                      : "Simple to use, powerful for business."}&rdquo;
                  </p>
                  <p className="text-[10px] text-[#0C1827]/60 mt-1" style={monoFont}>
                    — Ramesh Patel, Retailer, Surat
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          4. SECTION 03: THE TOOLKIT & REDESIGNED PRODUCT WALKTHROUGH
      =================================================================== */}
      <section className="py-20 bg-[#FAF7F2] border-y border-[#0C1827]/10" id="toolkit">
        <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-[#E15A2B]" style={monoFont}>
              {gu ? "સાધનો અને ટૂલકિટ" : "The Toolkit"}
            </span>
            <h2 className="text-4xl font-bold text-[#0C1827] mt-1" style={serifFont}>
              {gu ? "બધું જે તમને જોઈએ છે, " : "Everything you need, "}
              <span className="text-[#E15A2B] italic">{gu ? "એક જ જગ્યાએ." : "in one place."}</span>
            </h2>
            <p className="text-sm text-[#0C1827]/75 mt-2">
              {gu
                ? "બિલિંગથી લઈને બેલેન્સ શીટ સુધી, રોજમેળ તમારા સમગ્ર વેપારને એકસાથે જોડે છે."
                : "From billing to balance sheet, Myownbillbook brings all your business operations together."}
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Tile A: GST Invoicing */}
            <div className="rounded-3xl p-7 bg-white border border-[#0C1827]/10 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <span className="text-2xl mb-3 block">📄</span>
                <h3 className="text-xl font-bold text-[#0C1827]" style={serifFont}>
                  {gu ? "GST બિલિંગ અને ઇન્વૉઇસ" : "GST Invoicing"}
                </h3>
                <p className="text-xs text-[#0C1827]/70 mt-2 leading-relaxed">
                  {gu
                    ? "B2B અને B2C ઇન્વૉઇસ, A4 અને થર્મલ પ્રિન્ટ, e-Way બિલ સપોર્ટ."
                    : "B2B and B2C invoices, A4 and thermal print formats, e-Way Bill-ready exports."}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#0C1827]/5 flex items-center justify-between text-xs font-bold text-[#E15A2B]">
                <span>{gu ? "વધુ જુઓ" : "Learn more"}</span>
                <span>→</span>
              </div>
            </div>

            {/* Tile B: Purchase OCR */}
            <div className="rounded-3xl p-7 bg-white border border-[#0C1827]/10 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <span className="text-2xl mb-3 block">📷</span>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-[#0C1827]" style={serifFont}>
                    {gu ? "ખરીદ બિલ OCR સ્કેનર" : "Purchase OCR"}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800" style={monoFont}>
                    94% fields captured
                  </span>
                </div>
                <p className="text-xs text-[#0C1827]/70 mt-2 leading-relaxed">
                  {gu
                    ? "વેપારીનું બિલ ફોટો પાડો. રોજમેળ GSTIN, HSN અને લાઇન આઇટમ્સ ઓટોમેટિક વાંચી લે છે."
                    : "Photograph a vendor bill. Extract vendor details, GSTIN, HSN and line items into stock."}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#0C1827]/5 flex items-center justify-between text-xs font-bold text-[#E15A2B]">
                <span>{gu ? "વધુ જુઓ" : "Learn more"}</span>
                <span>→</span>
              </div>
            </div>

            {/* Tile C: Multi-Godown Inventory */}
            <div className="rounded-3xl p-7 bg-white border border-[#0C1827]/10 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <span className="text-2xl mb-3 block">🏢</span>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-[#0C1827]" style={serifFont}>
                    {gu ? "બહુ-ગોડાઉન ઇન્વેન્ટરી" : "Multi-Godown Inventory"}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800" style={monoFont}>
                    12 batches moving
                  </span>
                </div>
                <p className="text-xs text-[#0C1827]/70 mt-2 leading-relaxed">
                  {gu
                    ? "દુકાન, સુરત અને મુખ્ય વેરહાઉસનો જીવતો સ્ટોક. બેચ અને એક્સપાયરી ટ્રેકિંગ."
                    : "Track stock across Surat, shop floor and godowns. Batch and expiry date tracking."}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#0C1827]/5 flex items-center justify-between text-xs font-bold text-[#E15A2B]">
                <span>{gu ? "વધુ જુઓ" : "Learn more"}</span>
                <span>→</span>
              </div>
            </div>

            {/* Tile D: Double-Entry Ledgers (રોજમેળ) */}
            <div className="rounded-3xl p-7 bg-white border border-[#0C1827]/10 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <span className="text-2xl mb-3 block">📖</span>
                <h3 className="text-xl font-bold text-[#0C1827]" style={serifFont}>
                  {gu ? "પાકી ખાતાવહી (રોજમેળ)" : "Double-Entry Ledgers"}
                </h3>
                <p className="text-xs text-[#0C1827]/70 mt-2 leading-relaxed">
                  {gu
                    ? "રોજમેળ, રોકડ મેળ, વાઉચર્સ અને પાર્ટી બાકી જે CA સીધા સમજી શકે."
                    : "Party ledger previews, cashbook, daybook (રોજમેળ) and running balances."}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#0C1827]/5 flex items-center justify-between text-xs font-bold text-[#E15A2B]">
                <span>{gu ? "વધુ જુઓ" : "Learn more"}</span>
                <span>→</span>
              </div>
            </div>

            {/* Tile E: GST Reports */}
            <div className="rounded-3xl p-7 bg-white border border-[#0C1827]/10 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <span className="text-2xl mb-3 block">📊</span>
                <h3 className="text-xl font-bold text-[#0C1827]" style={serifFont}>
                  {gu ? "ઓટોમેટિક GST રિપોર્ટ્સ" : "GST Reports"}
                </h3>
                <p className="text-xs text-[#0C1827]/70 mt-2 leading-relaxed">
                  {gu
                    ? "GSTR-1, GSTR-3B અને 2B મેચિંગ સીધા પોર્ટલ ફોર્મેટમાં 1 ક્લિકથી એક્સપોર્ટ."
                    : "GSTR-1, GSTR-3B, GSTR-2B matching and live return reconciliation."}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#0C1827]/5 flex items-center justify-between text-xs font-bold text-[#E15A2B]">
                <span>{gu ? "વધુ જુઓ" : "Learn more"}</span>
                <span>→</span>
              </div>
            </div>

            {/* Tile F: POS Billing */}
            <div className="rounded-3xl p-7 bg-white border border-[#0C1827]/10 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <span className="text-2xl mb-3 block">🖨️</span>
                <h3 className="text-xl font-bold text-[#0C1827]" style={serifFont}>
                  {gu ? "ઝડપી POS કાઉન્ટર" : "POS Billing"}
                </h3>
                <p className="text-xs text-[#0C1827]/70 mt-2 leading-relaxed">
                  {gu
                    ? "રિટેલ કાઉન્ટર માટે થર્મલ પ્રિન્ટ અને બારકોડ સ્કેનિંગ સાથે ઝડપી બિલિંગ."
                    : "Fast & simple POS for retail counter with barcode scan and instant thermal slip."}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#0C1827]/5 flex items-center justify-between text-xs font-bold text-[#E15A2B]">
                <span>{gu ? "વધુ જુઓ" : "Learn more"}</span>
                <span>→</span>
              </div>
            </div>
          </div>

          {/* High-End Realistic Interactive Product Walkthrough */}
          <div className="pt-4">
            <HighEndProductWalkthrough gu={gu} />
          </div>
        </div>
      </section>

      {/* ===================================================================
          5. SECTION 04: "Built for real businesses." & PROCESS DRAW
      =================================================================== */}
      <section className="py-20 md:py-28">
        <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Photo */}
            <div className="lg:col-span-6 relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-[#0C1827]/15 h-[440px]">
                <Image
                  src="/landing/pos-counter.jpg"
                  alt="Shop counter POS billing"
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 600px, 100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0C1827]/50 via-transparent to-transparent"></div>

                <div className="absolute top-6 left-6 px-4 py-2 bg-amber-100 text-[#0C1827] font-bold text-xs uppercase tracking-wider rounded shadow-md -rotate-2 border border-amber-300">
                  {gu ? "દુકાનથી બેલેન્સ શીટ સુધી!" : "From shop floor to balance sheet!"}
                </div>
              </div>
            </div>

            {/* Right Features */}
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-bold uppercase tracking-wider text-[#E15A2B]" style={monoFont}>
                {gu ? "ફીચર્સ" : "Feature Highlights"}
              </span>
              <h2 className="text-4xl font-bold text-[#0C1827] leading-tight" style={serifFont}>
                {gu ? "વાસ્તવિક વેપાર માટે " : "Built for "}
                <span className="text-[#E15A2B] italic">{gu ? "બનેલું." : "real businesses."}</span>
              </h2>

              <div className="space-y-5 pt-3">
                <div className="p-4 rounded-2xl bg-white border border-[#0C1827]/10 flex items-start gap-4 shadow-2xs">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-bold text-sm">
                    10s
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0C1827]">
                      {gu ? "10 સેકન્ડમાં ઇન્વૉઇસ" : "Invoice in 10 seconds"}
                    </h3>
                    <p className="text-xs text-[#0C1827]/70 mt-0.5">
                      {gu
                        ? "ક્લીન ટેમ્પલેટ સાથે સેકન્ડોમાં GST ટેક્સ બિલ કાઢો."
                        : "Create GST invoices in seconds with clean, professional templates."}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-[#0C1827]/10 flex items-start gap-4 shadow-2xs">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 font-bold text-sm">
                    OCR
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0C1827]">
                      {gu ? "વેપારીના બિલનું OCR" : "OCR vendor bills"}
                    </h3>
                    <p className="text-xs text-[#0C1827]/70 mt-0.5">
                      {gu
                        ? "ફોટો પાડીને ખરીદ બિલની વિગતો સીધી ખાતામાં મેળવો."
                        : "Scan vendor purchase bills from images and update accounts instantly."}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-[#0C1827]/10 flex items-start gap-4 shadow-2xs">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 font-bold text-sm">
                    LIVE
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0C1827]">
                      {gu ? "ગોડાઉન વચ્ચે જીવતો સ્ટોક" : "Live stock across godowns"}
                    </h3>
                    <p className="text-xs text-[#0C1827]/70 mt-0.5">
                      {gu
                        ? "દરેક લોકેશન પર રીઅલ ટાઈમમાં ઇન્વેન્ટરી ટ્રેક કરો."
                        : "Track inventory in real time across all branches and locations."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8">
            <ProcessDrawSection gu={gu} />
          </div>
        </div>
      </section>

      {/* ===================================================================
          6. SECTION 05: "Built for every business." (Industries)
      =================================================================== */}
      <section className="py-20 bg-[#FAF7F2] border-t border-[#0C1827]/10" id="trade">
        <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-[#E15A2B]" style={monoFont}>
              {gu ? "તમારા વેપાર માટે" : "For Your Trade"}
            </span>
            <h2 className="text-4xl font-bold text-[#0C1827] mt-1" style={serifFont}>
              {gu ? "દરેક વેપાર માટે અનુકૂળ." : "Built for every business."}
            </h2>
            <p className="text-sm text-[#0C1827]/75 mt-2">
              {gu
                ? "તમે જે પણ વેચતા હોવ, રોજમેળ તમારી પ્રક્રિયાને સમજે છે."
                : "No matter what you sell, we've got you covered."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                titleEn: "Retail & POS",
                titleGu: "રિટેલ અને POS",
                descEn: "Shops, showrooms, retail chains & supermarkets",
                descGu: "દુકાનો, શોરૂમ અને સુપરમાર્કેટ",
                image: "shopkeeper.jpg",
              },
              {
                titleEn: "Wholesale & B2B",
                titleGu: "હોલસેલ અને B2B",
                descEn: "Bulk trade, alternate rates and dealer ledger",
                descGu: "જથ્થાબંધ વેપાર, રેટ લિસ્ટ અને ડીલર્સ",
                image: "wholesale.jpg",
              },
              {
                titleEn: "Distribution",
                titleGu: "ડિસ્ટ્રિબ્યુશન",
                descEn: "Channel expansion, field sales and logistics",
                descGu: "રૂટ સપ્લાય, ગોડાઉન અને લોજિસ્ટિક્સ",
                image: "godown.jpg",
              },
              {
                titleEn: "Small Manufacturing",
                titleGu: "નાનું ઉત્પાદન",
                descEn: "Production, job work and assembly units",
                descGu: "ઉત્પાદન, જોબ વર્ક અને એસેમ્બલી",
                image: "workshop.jpg",
              },
            ].map((ind, i) => (
              <div
                key={i}
                className="group rounded-3xl overflow-hidden bg-white border border-[#0C1827]/10 shadow-xs hover:shadow-xl transition-all"
              >
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={`/landing/${ind.image}`}
                    alt={ind.titleEn}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="300px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0C1827]/70 via-transparent to-transparent"></div>
                </div>
                <div className="p-5">
                  <h3 className="text-base font-bold text-[#0C1827]" style={serifFont}>
                    {gu ? ind.titleGu : ind.titleEn}
                  </h3>
                  <p className="text-xs text-[#0C1827]/70 mt-1">{gu ? ind.descGu : ind.descEn}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================================
          7. SECTION 06: COUNT-UP METRICS BANNER
      =================================================================== */}
      <section className="bg-[#0C1827] text-white py-14 border-y border-[#E15A2B]/20 select-none">
        <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-center items-center divide-y md:divide-y-0 md:divide-x divide-white/10">
            <div className="pt-4 md:pt-0">
              <p className="text-3xl md:text-4xl font-black text-white" style={serifFont}>
                <CountUpNumber value={10} suffix=" sec" />
              </p>
              <p className="text-xs text-[#E15A2B] uppercase tracking-wider mt-1" style={monoFont}>
                {gu ? "સરેરાશ ઇન્વૉઇસ સમય" : "Average invoice time"}
              </p>
            </div>

            <div className="pt-4 md:pt-0">
              <p className="text-3xl md:text-4xl font-black text-white" style={serifFont}>
                <CountUpNumber value={25000} suffix="+" />
              </p>
              <p className="text-xs text-[#E15A2B] uppercase tracking-wider mt-1" style={monoFont}>
                {gu ? "ભારતીય વેપારીઓ" : "Indian businesses"}
              </p>
            </div>

            <div className="pt-4 md:pt-0">
              <p className="text-3xl md:text-4xl font-black text-white" style={serifFont}>
                <CountUpNumber value={14} suffix="+" />
              </p>
              <p className="text-xs text-[#E15A2B] uppercase tracking-wider mt-1" style={monoFont}>
                {gu ? "નાણાકીય અને GST રિપોર્ટ્સ" : "Financial & GST reports"}
              </p>
            </div>

            <div className="pt-4 md:pt-0">
              <p className="text-3xl md:text-4xl font-black text-white" style={serifFont}>
                <CountUpNumber value={2} suffix="" />
              </p>
              <p className="text-xs text-[#E15A2B] uppercase tracking-wider mt-1" style={monoFont}>
                {gu ? "ભાષાઓ (English + ગુજ)" : "Languages (English + ગુજ)"}
              </p>
            </div>

            <div className="pt-4 md:pt-0 col-span-2 md:col-span-1">
              <p className="text-3xl md:text-4xl font-black text-emerald-400" style={serifFont}>
                <CountUpNumber value={100} suffix="%" />
              </p>
              <p className="text-xs text-emerald-400 uppercase tracking-wider mt-1" style={monoFont}>
                {gu ? "GST-સુસંગત વર્કફ્લો" : "GST-ready workflows"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          8. SECTION 07: REVIEW SHUFFLE (Testimonials)
      =================================================================== */}
      <section className="py-20 md:py-28">
        <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-[#E15A2B]" style={monoFont}>
              {gu ? "ગ્રાહક પ્રતિભાવ" : "Testimonials"}
            </span>
            <h2 className="text-4xl font-bold text-[#0C1827] mt-1" style={serifFont}>
              {gu ? "સાચા વેપારીઓ. સાચી વાતો." : "Real businesses. Real stories."}
            </h2>
          </div>

          <ReviewShuffle gu={gu} />
        </div>
      </section>

      {/* ===================================================================
          9. SECTION 08: PRICE ROLL (Pricing)
      =================================================================== */}
      <section className="bg-[#FAF7F2] border-y border-[#0C1827]/10">
        <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8">
          <PriceRollSection gu={gu} />
        </div>
      </section>

      {/* ===================================================================
          10. SECTION 09: US VS THEM COMPARISON
      =================================================================== */}
      <section className="py-16">
        <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8">
          <UsVsThemComparison gu={gu} />
        </div>
      </section>

      {/* ===================================================================
          11. SECTION 10: FAQ ACCORDION
      =================================================================== */}
      <section className="py-12 bg-[#FAF7F2] border-t border-[#0C1827]/10">
        <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8">
          <FaqAccordion gu={gu} />
        </div>
      </section>

      {/* ===================================================================
          12. SECTION 11: FINAL CTA & CELEBRATION
      =================================================================== */}
      <section className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8">
        <FinalClickSuccessParty gu={gu} />
      </section>

      {/* ===================================================================
          FOOTER (With the user's authentic BrandLogo!)
      =================================================================== */}
      <footer className="bg-[#F8F5EE] border-t border-[#0C1827]/10 pt-16 pb-12 text-[#0C1827]/80 text-xs">
        <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div className="md:col-span-2 space-y-3">
              <BrandLogo size="md" showSubtitle subtitle="Paneliya Technology" />
              <p className="text-xs text-[#0C1827]/70 max-w-sm leading-relaxed mt-2">
                {gu
                  ? "ભારતીય રિટેલર્સ, હોલસેલર્સ અને ડિસ્ટ્રિબ્યુટર્સ માટે આધુનિક GST બિલિંગ, ઇન્વેન્ટરી અને ખાતાવહી પ્લેટફોર્મ."
                  : "Modern GST billing, POS counter, purchase OCR, inventory and accounting ledgers for Indian retailers, wholesalers and distributors."}
              </p>
              <p className="text-[11px] text-[#E15A2B] font-bold" style={serifFont}>
                Trade. Moves. Together.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-[#0C1827] uppercase tracking-wider text-[11px] mb-3" style={monoFont}>
                {gu ? "પ્રોડક્ટ" : "Product"}
              </h4>
              <ul className="space-y-2">
                <li><a href="#why" className="hover:text-[#E15A2B]">Why Myownbillbook</a></li>
                <li><a href="#toolkit" className="hover:text-[#E15A2B]">Features & Toolkit</a></li>
                <li><a href="#trade" className="hover:text-[#E15A2B]">For your business</a></li>
                <li><a href="#pricing" className="hover:text-[#E15A2B]">Pricing Plans</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-[#0C1827] uppercase tracking-wider text-[11px] mb-3" style={monoFont}>
                {gu ? "કંપની" : "Company"}
              </h4>
              <ul className="space-y-2">
                <li><Link href="/" className="hover:text-[#E15A2B]">About</Link></li>
                <li><Link href="/login" className="hover:text-[#E15A2B]">Sign in</Link></li>
                <li><Link href="/login?mode=signup" className="hover:text-[#E15A2B]">Free Trial</Link></li>
                <li><Link href="/settings" className="hover:text-[#E15A2B]">Settings & Themes</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-[#0C1827] uppercase tracking-wider text-[11px] mb-3" style={monoFont}>
                {gu ? "સહાય અને સંપર્ક" : "Support"}
              </h4>
              <ul className="space-y-2">
                <li><a href="#questions" className="hover:text-[#E15A2B]">FAQ</a></li>
                <li><a href="https://wa.me/917400199999" target="_blank" rel="noopener noreferrer" className="hover:text-[#E15A2B]">WhatsApp Helpdesk</a></li>
                <li><span className="text-[#0C1827]/60">Mon-Sat · 9am-8pm</span></li>
                <li><span className="text-emerald-700 font-bold" style={monoFont}>Made in Gujarat 🇮🇳</span></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[#0C1827]/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#0C1827]/60">
            <p>© {new Date().getFullYear()} Paneliya Technology. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span>Made for Indian businesses 🇮🇳</span>
              <span>·</span>
              <button
                type="button"
                onClick={() => setLang(gu ? "en" : "gu")}
                className="hover:text-[#0C1827] font-semibold cursor-pointer"
              >
                {gu ? "English" : "ગુજરાતી"}
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export const RojmekLanding = MyownbillbookLanding;
