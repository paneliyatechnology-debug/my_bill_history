"use client";

import React, { useState } from "react";
import { Star, ChevronLeft, ChevronRight, Quote, ShieldCheck } from "lucide-react";

export interface TestimonialsSectionProps {
  lang?: "en" | "gu";
}

export function TestimonialsSection({ lang = "en" }: TestimonialsSectionProps) {
  const gu = lang === "gu";
  const [activeIndex, setActiveIndex] = useState(0);

  const testimonials = [
    {
      name: "Rajesh Patel",
      initials: "RP",
      businessType: gu ? "રિટેલ સુપરમાર્કેટ" : "Retail & Supermarket",
      role: gu ? "પ્રોપ્રાઇટર, શ્રી હરિ સુપરમાર્કેટ" : "Proprietor, Shree Hari Supermarket",
      city: "Ahmedabad, Gujarat",
      quote: gu
        ? "પહેલાં સાંજે દુકાન બંધ કરતી વખતે હિસાબ મેળવવામાં ૨ કલાક થતા હતા. MyOwnBillBook ના કારણે હવે કાઉન્ટર પર જ બારકોડ સ્કેન કરીને પાકું GST બિલ બને છે અને ગોડાઉન સ્ટોક આપોઆપ ઓછો થઈ જાય છે."
        : "Earlier we spent 2 hours every evening manually tallying paper receipts. With MyOwnBillBook, retail barcode billing takes seconds, bills print immediately, and godown stock updates automatically in real-time.",
      highlight: gu ? "૭૦% ઝડપી કાઉન્ટર ચેકઆઉટ" : "70% Faster Checkout",
      rating: 5,
    },
    {
      name: "Jaydeep Khunt",
      initials: "JK",
      businessType: gu ? "ઇલેક્ટ્રોનિક્સ અને ટ્રેડિંગ" : "Electronics & Wholesale Trading",
      role: gu ? "ડાયરેક્ટર, પેનેલિયા ટેક્નોલોજી" : "Director, Paneliya Technology",
      city: "Surat, Gujarat",
      quote: gu
        ? "સૌથી મોટો ફાયદો ખરીદી બિલ સ્કેનરનો છે. સપ્લાયરના કાગળ બિલનો ફોટો પાડો એટલે બધી જ આઇટમો અને ટેક્સ સીધા સ્ટોકમાં ચડી જાય છે. એક પણ પૈસાની કે HSN ની ભૂલ રહેતી નથી."
        : "The purchase bill OCR scanner is exceptional. We snap photos of vendor paper bills and every line item, tax breakdown, and HSN enters directly into stock without manual typing.",
      highlight: gu ? "ઝીરો ડેટા એન્ટ્રી ભૂલ" : "Zero Data Entry Errors",
      rating: 5,
    },
    {
      name: "Bhavik Shah",
      initials: "BS",
      businessType: gu ? "ટેક્સટાઇલ હોલસેલ" : "Textile Wholesalers & B2B",
      role: gu ? "પાર્ટનર, મહાવીર ટેક્સટાઇલ" : "Partner, Mahavir Textile",
      city: "Rajkot, Gujarat",
      quote: gu
        ? "અમારા ૫૦૦ થી વધુ હોલસેલ ગ્રાહકો છે. પાર્ટી વાઇઝ ખાતાવહી અને WhatsApp પેમેન્ટ રિમાઇન્ડરથી ઉઘરાણીમાં ૧૫ દિવસનો ઘટાડો થયો છે. GSTR-1 અને 3B પણ સમયસર અપલોડ થઈ જાય છે."
        : "We manage 500+ wholesale buyer accounts. Sending automated WhatsApp ledger statements with payment reminders reduced our payment collection cycle by 15 days.",
      highlight: gu ? "૧૫ દિવસ વહેલી ઉઘરાણી" : "15-Day Faster Collections",
      rating: 5,
    },
  ];

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
  };

  return (
    <section className="py-20 sm:py-28 bg-[#F7F9FC] border-b border-[#E5EAF1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-16 gap-6">
          <div className="max-w-2xl text-left">
            <span className="text-xs font-semibold text-[#2563EB] uppercase tracking-wider block mb-2.5">
              {gu ? "ગ્રાહક વિશ્વાસ અને અનુભવ" : "CUSTOMER STORIES"}
            </span>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#172033] tracking-tight leading-[1.15]"
              style={{ fontFamily: "var(--font-manrope)" }}
            >
              {gu
                ? "વાસ્તવિક વ્યાપારી જરૂરિયાતોને ધ્યાનમાં રાખીને નિર્મિત."
                : "Built Around Real Business Needs."}
            </h2>
            <p className="text-base sm:text-lg text-[#667085] mt-4 font-normal leading-relaxed">
              {gu
                ? "જુઓ કેવી રીતે રિટેલર્સ, હોલસેલર્સ અને ડિસ્ટ્રિબ્યુટર્સ MyOwnBillBook સાથે રોજિંદા બિલિંગ અને હિસાબ-કિતાબનું સરળ સંચાલન કરે છે."
                : "See how Indian retailers, wholesalers, and distributors manage everyday billing, tax compliance, and business finances with MyOwnBillBook."}
            </p>
          </div>

          {/* Carousel Arrows (Mobile / Tablet Controls) */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous testimonial"
              className="w-11 h-11 rounded-full bg-white border border-[#E5EAF1] text-[#172033] hover:text-[#2563EB] hover:border-[#2563EB] flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next testimonial"
              className="w-11 h-11 rounded-full bg-white border border-[#E5EAF1] text-[#172033] hover:text-[#2563EB] hover:border-[#2563EB] flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <ChevronRight className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Testimonials 3-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {testimonials.map((t, idx) => {
            const isFeatured = idx === activeIndex;
            return (
              <div
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`rounded-2xl border bg-white p-7 sm:p-8 flex flex-col justify-between transition-all duration-300 cursor-pointer ${
                  isFeatured
                    ? "border-[#2563EB] shadow-md ring-1 ring-[#2563EB]/30"
                    : "border-[#E5EAF1] shadow-xs hover:border-[#2563EB]/50 hover:shadow-sm"
                }`}
              >
                <div className="space-y-5">
                  {/* Rating Stars & Highlight Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {[...Array(t.rating)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-4 h-4 fill-[#2563EB] text-[#2563EB]"
                          strokeWidth={1.5}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#EFF6FF] text-[#2563EB] border border-[#2563EB]/20">
                      {t.highlight}
                    </span>
                  </div>

                  {/* Quote text */}
                  <blockquote className="text-sm sm:text-[15px] text-[#172033] leading-relaxed font-normal relative">
                    <Quote className="w-6 h-6 text-[#E5EAF1] absolute -top-2 -left-1 -z-10 rotate-180" />
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                </div>

                {/* Author Info */}
                <div className="pt-6 mt-6 border-t border-[#E5EAF1] flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#2563EB]/20 font-semibold text-xs flex items-center justify-center shrink-0">
                      {t.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#172033] truncate">
                        {t.name}
                      </div>
                      <div className="text-xs text-[#667085] truncate">
                        {t.businessType} · {t.city}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-[#172033] bg-[#F7F9FC] px-2 py-1 rounded-md border border-[#E5EAF1]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>{gu ? "ચકાસાયેલ" : "Verified"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Real-world Disclaimer note */}
        <div className="mt-8 text-center text-xs text-[#667085]">
          {gu
            ? "વાસ્તવિક વ્યવસાયિક અનુભવો · તમામ ફીચર્સ અને વર્કફ્લો MyOwnBillBook સિસ્ટમમાં સક્રિય છે."
            : "Customer feedback based on active production workflows across Gujarat & Indian SME retail hubs."}
        </div>
      </div>
    </section>
  );
}
