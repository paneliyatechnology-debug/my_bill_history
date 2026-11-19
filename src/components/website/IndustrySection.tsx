"use client";

import React from "react";
import Link from "next/link";
import {
  Check,
  ArrowRight,
  Store,
  Building2,
  Truck,
  Factory,
  Briefcase,
  Barcode,
  Layers,
  FileCheck2,
  Calendar,
  CreditCard,
  QrCode,
  Sparkles,
} from "lucide-react";

export interface IndustrySectionProps {
  lang?: "en" | "gu";
}

export function IndustrySection({ lang = "en" }: IndustrySectionProps) {
  const gu = lang === "gu";

  const industries = [
    {
      id: "retail",
      icon: Store,
      badge: gu ? "રિટેલ & કાઉન્ટર" : "Retail & POS",
      title: gu ? "રિટેલ સ્ટોર્સ અને સુપરમાર્કેટ્સ" : "Retailers & Supermarkets",
      desc: gu
        ? "કાઉન્ટર પર ઝડપી બારકોડ સ્કેનિંગ, ૫૮mm/૮૦mm થર્મલ પ્રિન્ટ અને ગ્રાહક ખાતાવહી."
        : "High-speed barcode counter billing, thermal receipts, cash drawer tracking, and customer khata accounts.",
      preview: {
        headline: "POS Counter Checkout",
        tag: "Thermal 80mm",
        row1: { label: "Amul Butter 500g (x2)", val: "₹ 540.00" },
        row2: { label: "Fortune Sunflower 1L", val: "₹ 165.00" },
        metric: "₹ 705.00",
        metricLabel: "Total Tendered (Cash + UPI)",
        status: "Stock Auto-Deducted",
      },
      capabilities: [
        gu ? "બારકોડ સ્કેનર અને ઝડપી F2/F4 શૉર્ટકટ્સ" : "Barcode scanner & instant keyboard shortcuts",
        gu ? "૫૮mm / ૮૦mm થર્મલ રસીદ અને UPI QR" : "58mm / 80mm thermal print with UPI QR",
        gu ? "ગ્રાહક બાકી લેણી રકમ અને WhatsApp બિલ" : "Customer credit ledger & WhatsApp bills",
      ],
    },
    {
      id: "wholesale",
      icon: Building2,
      badge: gu ? "હોલસેલ & ટ્રેડર્સ" : "Wholesale & B2B",
      title: gu ? "હોલસેલ અને B2B ટ્રેડર્સ" : "Wholesalers & B2B Traders",
      desc: gu
        ? "મોટા જથ્થાના ઓર્ડર, પાર્ટી ક્રેડિટ મર્યાદા, e-Way બિલ અને ઓટોમેટિક પેમેન્ટ રિમાઇન્ડર્સ."
        : "Bulk multi-unit packaging, party-specific rates, credit limits, e-Way Bills, and payment reminders.",
      preview: {
        headline: "B2B Bulk Tax Invoice",
        tag: "Tiered Pricing",
        row1: { label: "Basmati Rice 25kg (50 Bags)", val: "₹ 92,500" },
        row2: { label: "ITC Eligible (CGST+SGST 5%)", val: "₹ 4,625" },
        metric: "₹ 97,125.00",
        metricLabel: "Grand Total (e-Way Bill Ready)",
        status: "GSTR-1 Auto-Prepared",
      },
      capabilities: [
        gu ? "પાર્ટી વાઇઝ સ્પેશિયલ રેટ્સ અને ડિસ્કાઉન્ટ" : "Party-wise tiered pricing & past price memory",
        gu ? "સરકારી e-Way Bill અને E-Invoice સપોર્ટ" : "Direct Government e-Way Bill & E-Invoice",
        gu ? "પાર્ટી બાકી લેણી રકમ અને ક્રેડિટ લિમિટ" : "Party credit limits with warning triggers",
      ],
    },
    {
      id: "distribution",
      icon: Truck,
      badge: gu ? "ડિસ્ટ્રિબ્યુશન & ગોડાઉન" : "Distribution & Logistics",
      title: gu ? "ડિસ્ટ્રિબ્યુશન અને ગોડાઉન ટ્રેડિંગ" : "Distributors & C&F Agencies",
      desc: gu
        ? "મલ્ટીપલ વેરહાઉસ વચ્ચે સ્ટોક ટ્રાન્સફર, ડિલિવરી ચલણ અને ડિસ્ટ્રિબ્યુટર નેટવર્ક."
        : "Multi-godown stock management, dispatch delivery challans, stock transfers and batch expiry tracking.",
      preview: {
        headline: "Warehouse Stock Transfer",
        tag: "Challan #DC-104",
        row1: { label: "Main Godown A → Van 02", val: "120 Units" },
        row2: { label: "Batch: #BAT-2026-88", val: "Exp: Nov 2027" },
        metric: "3 Godowns Synced",
        metricLabel: "Real-Time Stock Audit Trail",
        status: "Dispatch In-Transit",
      },
      capabilities: [
        gu ? "બહુ-ગોડાઉન સ્ટોક સિન્ક અને ટ્રાન્સફર ચલણ" : "Multi-warehouse real-time stock sync & transfer slips",
        gu ? "બેચ નંબર, મેન્યુફેક્ચરિંગ & એક્સપાયરી ટ્રેકિંગ" : "Batch & expiry tracking with damage logs",
        gu ? "ડિલિવરી ચલણથી સીધું ટેક્સ ઇન્વોઇસ કન્વર્ઝન" : "1-click delivery challan to tax invoice conversion",
      ],
    },
    {
      id: "manufacturing",
      icon: Factory,
      badge: gu ? "મેન્યુફેક્ચરિંગ" : "Manufacturing",
      title: gu ? "ઉત્પાદકો અને વર્કશોપ્સ" : "Manufacturers & Fabricators",
      desc: gu
        ? "કાચા માલનું બિલ ઓફ મટીરીયલ્સ (BOM), પ્રોડક્શન કોસ્ટિંગ અને ફિનિશ્ડ ગુડ્સ સ્ટોક."
        : "Bill of Materials (BOM), raw material tracking, production costing, and finished goods inventory.",
      preview: {
        headline: "Production Order & BOM",
        tag: "BOM #BOM-204",
        row1: { label: "Raw Steel 500kg Inward", val: "₹ 34,000" },
        row2: { label: "Overhead & Labor Cost", val: "₹ 6,500" },
        metric: "45 Finished Units",
        metricLabel: "Yield Cost: ₹ 900.00 / Unit",
        status: "Quality Checked ✓",
      },
      capabilities: [
        gu ? "બિલ ઓફ મટીરીયલ્સ (BOM) અને રેસિપી સેટઅપ" : "Multi-level Bill of Materials (BOM) setup",
        gu ? "કાચા માલનો વપરાશ અને ફિનિશ્ડ ગુડ્સ સ્ટોક" : "Automatic raw material consumption & FG in-stock",
        gu ? "પ્રોડક્શન બેચ કોસ્ટિંગ અને ઓવરહેડ ખર્ચ" : "Production batch costing & overhead allocation",
      ],
    },
    {
      id: "services",
      icon: Briefcase,
      badge: gu ? "સર્વિસ બિઝનેસ" : "Services & Agencies",
      title: gu ? "સર્વિસ બિઝનેસ અને એજન્સીઓ" : "Service Providers & Agencies",
      desc: gu
        ? "SAC કોડ સાથે સર્વિસ ઇન્વોઇસિંગ, માસિક રિકરિંગ બિલિંગ અને ક્લાયન્ટ પેમેન્ટ હિસાબ."
        : "SAC code invoicing, periodic retainer billing, client payment tracking, and milestone accounts.",
      preview: {
        headline: "Service Proforma & Retainer",
        tag: "SAC: 998311",
        row1: { label: "IT Consulting - Q3 Retainer", val: "₹ 45,000" },
        row2: { label: "TDS Deduction (10% 194J)", val: "- ₹ 4,500" },
        metric: "₹ 48,600.00",
        metricLabel: "With 18% GST (Payment Link Sent)",
        status: "Auto-Reminder Set",
      },
      capabilities: [
        gu ? "સર્વિસ SAC કોડ્સ અને પ્રોફેશનલ ફી બિલિંગ" : "SAC codes & official service tax calculations",
        gu ? "રિકરિંગ ઇન્વોઇસિંગ અને ઓટો-રિમાઇન્ડર્સ" : "Recurring invoices & dynamic client UPI payment QR",
        gu ? "ઓપરેશનલ ખર્ચ અને ચોખ્ખો નફો ટ્રેકિંગ" : "Operational overhead tracking & net service margins",
      ],
    },
  ];

  return (
    <section id="solutions" className="py-16 sm:py-24 bg-white border-b border-[#E5EAF1] scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 sm:mb-16 text-left">
          <span
            className="text-xs font-semibold text-[#2563EB] uppercase tracking-wider block mb-2"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            {gu ? "તમારા વ્યવસાય મુજબ તૈયાર" : "TAILORED INDUSTRY SOLUTIONS"}
          </span>
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-semibold text-[#172033] tracking-tight leading-tight"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            {gu ? (
              <>
                એક પ્લેટફોર્મ.
                <br />
                દરેક વેપારની જરૂરિયાતો.
              </>
            ) : (
              <>
                Built for Every Type of Indian Business.
              </>
            )}
          </h2>
          <p
            className="text-sm sm:text-base text-[#667085] mt-3 leading-relaxed max-w-2xl font-normal"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            {gu
              ? "ભલે તમે રિટેલ દુકાન ચલાવતા હોવ, હોલસેલ વેપાર કરતા હોવ, ડિસ્ટ્રિબ્યુશન નેટવર્ક હોય કે ફેક્ટરી — MyOwnBillBook તમારા ચોપડાને સંપૂર્ણપણે નિયંત્રણમાં રાખે છે."
              : "Tailored workflows designed specifically for your industry's billing, inventory and tax compliance requirements."}
          </p>
        </div>

        {/* 5 Industry Cards (Responsive Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {industries.map((ind) => {
            const Icon = ind.icon;
            return (
              <div
                key={ind.id}
                className="rounded-2xl bg-[#F7F9FC] border border-[#E5EAF1] shadow-2xs hover:border-[#2563EB]/40 hover:bg-white hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between group"
              >
                <div>
                  {/* Clean Visual Preview Card Header (Replaces Grainy Stock Photos) */}
                  <div className="p-4 sm:p-5 border-b border-[#E5EAF1] bg-white">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0 border border-[#2563EB]/20">
                          <Icon className="w-4 h-4" strokeWidth={1.75} />
                        </div>
                        <span className="text-[11px] font-semibold text-[#172033]">
                          {ind.preview.headline}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#F7F9FC] border border-[#E5EAF1] text-[#667085]">
                        {ind.preview.tag}
                      </span>
                    </div>

                    {/* Simulated Clean Data Rows */}
                    <div className="rounded-xl bg-[#F7F9FC] border border-[#E5EAF1] p-3 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-[#667085] text-[11px]">
                        <span>{ind.preview.row1.label}</span>
                        <span className="font-semibold text-[#172033] tabular-nums">
                          {ind.preview.row1.val}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[#667085] text-[11px]">
                        <span>{ind.preview.row2.label}</span>
                        <span className="font-semibold text-[#172033] tabular-nums">
                          {ind.preview.row2.val}
                        </span>
                      </div>
                      <div className="pt-1.5 border-t border-[#E5EAF1] flex items-center justify-between">
                        <div>
                          <span className="text-[9px] text-[#667085] block uppercase font-medium">
                            {ind.preview.metricLabel}
                          </span>
                          <span className="text-xs sm:text-sm font-semibold text-[#2563EB] tabular-nums">
                            {ind.preview.metric}
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {ind.preview.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 sm:p-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#2563EB]">
                        {ind.badge}
                      </span>
                    </div>

                    <h3
                      className="text-base font-semibold text-[#172033] group-hover:text-[#2563EB] transition-colors leading-snug"
                      style={{ fontFamily: "var(--font-manrope)" }}
                    >
                      {ind.title}
                    </h3>
                    <p
                      className="text-xs text-[#667085] leading-relaxed font-normal"
                      style={{ fontFamily: "var(--font-inter)" }}
                    >
                      {ind.desc}
                    </p>

                    {/* Capabilities Bullets */}
                    <div className="space-y-2 pt-3 border-t border-[#E5EAF1]">
                      {ind.capabilities.map((cap, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-[#172033] font-medium">
                          <Check className="w-3.5 h-3.5 text-[#2563EB] shrink-0 mt-0.5" strokeWidth={2.5} />
                          <span className="leading-tight">{cap}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Link */}
                <div className="p-5 sm:p-6 pt-0">
                  <Link
                    href="/features"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#172033] group-hover:text-[#2563EB] transition-colors"
                    style={{ fontFamily: "var(--font-inter)" }}
                  >
                    <span>{gu ? "વિગતો અને ફીચર્સ જુઓ" : "View Industry Modules"}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
