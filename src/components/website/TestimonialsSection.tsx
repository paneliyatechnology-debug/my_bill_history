"use client";

import React from "react";
import { Star } from "lucide-react";

export interface TestimonialsSectionProps {
  lang?: "en" | "gu";
}

export function TestimonialsSection({ lang = "en" }: TestimonialsSectionProps) {
  const gu = lang === "gu";

  const testimonials = [
    {
      name: "Rajesh Patel",
      initials: "RP",
      role: gu ? "પ્રોપ્રાઇટર, શ્રી હરિ સુપરમાર્કેટ" : "Proprietor, Shree Hari Supermarket",
      city: "Ahmedabad, Gujarat",
      quote: gu
        ? "પહેલાં સાંજે દુકાન બંધ કરતી વખતે હિસાબ મેળવવામાં ૨ કલાક થતા હતા. MyOwn BillBook ના કારણે હવે કાઉન્ટર પર જ બારકોડ સ્કેન કરીને પાકું બિલ બને છે અને સ્ટોક આપોઆપ ઓછો થઈ જાય છે."
        : "Earlier we spent 2 hours every evening manually tallying paper receipts. With MyOwn BillBook, retail barcode billing takes 5 seconds and godown stock updates automatically in real-time.",
      metric: gu ? "૭૦% સમયની બચત" : "70% Faster Checkout",
    },
    {
      name: "Jaydeep Khunt",
      initials: "JK",
      role: gu ? "ડાયરેક્ટર, પેનેલિયા ટેક્નોલોજી & ઇલેક્ટ્રોનિક્સ" : "Director, Paneliya Technology & Electronics",
      city: "Surat, Gujarat",
      quote: gu
        ? "સૌથી મોટો ફાયદો ખરીદી બિલ સ્કેનરનો છે. સપ્લાયરના કાગળ બિલનો ફોટો પાડો એટલે બધી જ આઇટમો અને ટેક્સ સીધા સ્ટોકમાં ચડી જાય છે. એક પણ પૈસાની કે HSN ની ભૂલ રહેતી નથી."
        : "The AI purchase OCR scanner is phenomenal. We snap photos of vendor paper bills and every line item and HSN code enters directly into stock without manual typing.",
      metric: gu ? "૧૦૦% સચોટ સ્ટોક" : "Zero Data Entry Errors",
    },
    {
      name: "Bhavik Shah",
      initials: "BS",
      role: gu ? "પાર્ટનર, મહાવીર ટેક્સટાઇલ હોલસેલર્સ" : "Partner, Mahavir Textile Wholesalers",
      city: "Rajkot, Gujarat",
      quote: gu
        ? "અમારા ૫૦૦ થી વધુ હોલસેલ ગ્રાહકો છે. પાર્ટી વાઇઝ ખાતાવહી અને WhatsApp પેમેન્ટ રિમાઇન્ડરથી ઉઘરાણીમાં ૧૫ દિવસનો ઘટાડો થયો છે. GSTR-1 પણ સમયસર અપલોડ થઈ જાય છે."
        : "We manage 500+ wholesale buyer accounts. Sending automated WhatsApp ledger statements with payment links reduced our payment collection cycle by 15 days.",
      metric: gu ? "૧૫ દિવસ વહેલી ઉઘરાણી" : "15-Day Faster Collections",
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-[#F7F9FC] border-b border-[#E5EAF1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 sm:mb-16 text-left">
          <span className="text-xs font-semibold text-[#2563EB] uppercase tracking-wider block mb-2">
            {gu ? "ગ્રાહક વિશ્વાસ અને અનુભવ" : "Customer Trust"}
          </span>
          <h2
            className="text-2xl sm:text-4xl lg:text-[42px] font-semibold text-[#172033] tracking-tight leading-[1.12]"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            {gu
              ? "ભારતીય વેપારીઓનો સાચો વિશ્વાસ."
              : "Trusted by Indian Traders & Retailers."}
          </h2>
          <p className="text-[15px] sm:text-base text-[#667085] mt-3 font-normal leading-relaxed max-w-2xl">
            {gu
              ? "સુપરમાર્કેટ્સ, હોલસેલર્સ અને ડિસ્ટ્રિબ્યુટર્સ MyOwn BillBook સાથે દૈનિક વેપારનું સરળ સંચાલન કરે છે."
              : "Read real stories from business owners who transformed their counter billing, inventory accuracy, and financial recovery."}
          </p>
        </div>

        {/* 3-Column Editorial Testimonial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-[#E5EAF1] bg-white p-6 sm:p-7 shadow-xs hover:border-[#2563EB]/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* 5-Star Rating & Metric Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 fill-amber-400 text-amber-400"
                        strokeWidth={1.5}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#159B72] border border-emerald-200">
                    {t.metric}
                  </span>
                </div>

                {/* Quote */}
                <blockquote className="text-xs sm:text-sm text-[#172033] leading-relaxed font-normal italic">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
              </div>

              {/* Author info */}
              <div className="pt-5 mt-5 border-t border-[#E5EAF1] flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] font-semibold text-xs flex items-center justify-center shrink-0">
                  {t.initials}
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-[13px] font-semibold text-[#172033] truncate">
                    {t.name}
                  </div>
                  <div className="text-[11px] text-[#667085] truncate mt-0.5">
                    {t.role} · {t.city}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
