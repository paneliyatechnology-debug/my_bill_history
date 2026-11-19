"use client";

import React from "react";
import { Star, ShieldCheck, Quote } from "lucide-react";

export interface HomepageTestimonialsProps {
  lang?: "en" | "gu";
}

export function HomepageTestimonials({ lang = "en" }: HomepageTestimonialsProps) {
  const gu = lang === "gu";

  const testimonials = [
    {
      name: "Ramesh Patel",
      initials: "RP",
      bgClass: "bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]",
      role: gu ? "માલિક, શ્રી હરિ હાર્ડવેર & સેનિટરી" : "Proprietor, Shree Hari Hardware & Sanitary",
      city: "Ahmedabad, Gujarat",
      quote: gu
        ? "પહેલાં સાંજે દુકાન બંધ કરતી વખતે હિસાબ મેળવવામાં ૨ કલાક થતા હતા. MyOwn BillBook ના કારણે હવે કાઉન્ટર પર જ બારકોડ સ્કેન કરીને પાકું બિલ બને છે અને સ્ટોક આપોઆપ ઓછો થઈ જાય છે."
        : "Earlier we spent 2 hours every evening manually tallying bills. With MyOwn BillBook, barcode billing takes 5 seconds and godown stock updates automatically in real-time.",
      metric: gu ? "૭૦% સમયની બચત" : "70% Faster Checkout",
      rating: 5,
    },
    {
      name: "Jaydeep Khunt",
      initials: "JK",
      bgClass: "bg-[#E6FBF5] text-[#159B72] border-[#A7F3D0]",
      role: gu ? "ડાયરેક્ટર, પેનેલિયા ટેક્નોલોજી & ઇલેક્ટ્રોનિક્સ" : "Director, Paneliya Technology & Electronics",
      city: "Surat, Gujarat",
      quote: gu
        ? "સૌથી મોટો ફાયદો ખરીદી બિલ સ્કેનરનો છે. સપ્લાયરના કાગળ બિલનો ફોટો પાડો એટલે બધી જ આઇટમો અને ટેક્સ સીધા સ્ટોકમાં ચડી જાય છે. એક પણ પૈસાની ભૂલ રહેતી નથી."
        : "The AI purchase OCR scanner is phenomenal. We snap photos of vendor bills and every line item and HSN code enters directly into stock without manual typing.",
      metric: gu ? "૧૦૦% સચોટ સ્ટોક" : "Zero Data Entry Errors",
      rating: 5,
    },
    {
      name: "Bhavik Shah",
      initials: "BS",
      bgClass: "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]",
      role: gu ? "પાર્ટનર, મહાવીર ટેક્સટાઇલ ટ્રેડર્સ" : "Partner, Mahavir Textile Wholesalers",
      city: "Rajkot, Gujarat",
      quote: gu
        ? "અમારા ૫૦૦ થી વધુ હોલસેલ ગ્રાહકો છે. પાર્ટી વાઇઝ ખાતાવહી અને WhatsApp પેમેન્ટ રિમાઇન્ડરથી ઉઘરાણીમાં ૧૫ દિવસનો ઘટાડો થયો છે. GSTR-1 પણ સમયસર અપલોડ થઈ જાય છે."
        : "We manage 500+ wholesale buyer accounts. Sending automated WhatsApp ledger statements reduced our payment collection cycle by 15 days.",
      metric: gu ? "૧૫ દિવસ વહેલી ઉઘરાણી" : "15-Day Faster Collections",
      rating: 5,
    },
  ];

  return (
    <section className="py-12 sm:py-18 lg:py-20 bg-[#F7F9FC] border-b border-[#E5EAF1] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12 lg:mb-14">
          <span className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider px-3 py-1 bg-[#EFF6FF] border border-[#BFDBFE] rounded-full">
            {gu ? "ગ્રાહક અનુભવો" : "Customer Trust"}
          </span>
          <h2
            className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#172033] tracking-tight mt-3"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            {gu
              ? "ભારતીય વેપારીઓ અને એકાઉન્ટન્ટ્સનો અતૂટ વિશ્વાસ"
              : "Trusted by Indian Business Owners & Accountants"}
          </h2>
          <p className="text-xs sm:text-sm text-[#667085] mt-2 font-normal leading-relaxed">
            {gu
              ? "રિટેલ કાઉન્ટરથી લઈને મોટા ડિસ્ટ્રિબ્યુશન નેટવર્ક સુધી — સાંભળો વેપારીઓના પોતાના શબ્દોમાં."
              : "Real stories from retail shopkeepers, wholesale distributors, and accounting professionals."}
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-[#E5EAF1] p-5 sm:p-6 shadow-xs flex flex-col justify-between hover:border-[#2563EB]/40 hover:shadow-md transition-all duration-200 relative"
            >
              <div>
                {/* Rating Stars & Verified Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1 text-amber-400">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                    ))}
                  </div>

                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-[#159B72] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Verified User</span>
                  </span>
                </div>

                {/* Quote */}
                <p className="text-xs sm:text-sm text-[#172033] leading-relaxed font-normal mb-6 relative">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              {/* Author & Metric Footer */}
              <div className="pt-4 border-t border-[#E5EAF1] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 border ${t.bgClass}`}
                  >
                    {t.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#172033] truncate">
                      {t.name}
                    </div>
                    <div className="text-[10px] text-[#667085] truncate">
                      {t.city}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] sm:text-[11px] font-semibold text-[#2563EB] bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-0.5 rounded-md">
                    {t.metric}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
