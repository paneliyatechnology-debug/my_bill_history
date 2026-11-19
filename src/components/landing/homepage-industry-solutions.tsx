"use client";

import React from "react";
import {
  Store,
  Building,
  Truck,
  Factory,
  Briefcase,
  CheckCircle2,
  Barcode,
  Receipt,
  QrCode,
  Layers,
  ArrowRight,
  TrendingUp,
  Percent,
  FileCheck,
  Package,
} from "lucide-react";

export interface HomepageIndustrySolutionsProps {
  lang?: "en" | "gu";
}

export function HomepageIndustrySolutions({ lang = "en" }: HomepageIndustrySolutionsProps) {
  const gu = lang === "gu";

  return (
    <section id="solutions" className="py-12 sm:py-18 lg:py-20 bg-[#F7F9FC] border-b border-[#E5EAF1] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12 lg:mb-14">
          <span className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider px-3 py-1 bg-[#EFF6FF] border border-[#BFDBFE] rounded-full">
            {gu ? "ઇન્ડસ્ટ્રી સોલ્યુશન્સ" : "Tailored Solutions"}
          </span>
          <h2
            className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#172033] tracking-tight mt-3"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            {gu
              ? "દરેક પ્રકારના વેપાર માટે ખાસ બનાવેલું"
              : "Built for Every Type of Business"}
          </h2>
          <p className="text-xs sm:text-sm text-[#667085] mt-2 font-normal leading-relaxed">
            {gu
              ? "રિટેલર હોય, હોલસેલર હોય કે ફેક્ટરી — તમારી જરૂરિયાતો મુજબ સોફ્ટવેર અનુકૂળ રહે છે."
              : "Tailored workflows for your industry's specific billing and stock management requirements."}
          </p>
        </div>

        {/* 5 Industry Cards Grid with Professional SaaS UI Visuals instead of stock photos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {/* 1. Retailers & Kirana Stores */}
          <div className="bg-white rounded-2xl border border-[#E5EAF1] overflow-hidden shadow-xs hover:shadow-md hover:border-[#2563EB]/40 transition-all duration-200 flex flex-col justify-between group">
            <div>
              {/* Professional SaaS UI Graphic Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-br from-[#EFF6FF] via-[#F8FBFF] to-white border-b border-[#E5EAF1]">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shadow-xs">
                    <Store className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-[#159B72] border border-emerald-200">
                    5-Sec POS Ready
                  </span>
                </div>

                {/* Micro Visual Card */}
                <div className="bg-white rounded-xl border border-[#E5EAF1] p-3 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[#172033] flex items-center gap-1.5">
                      <Barcode className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>Barcode Scan & Checkout</span>
                    </span>
                    <span className="font-mono text-[#2563EB] font-semibold">₹1,450.00</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#667085] bg-[#F7F9FC] p-1.5 rounded-lg border border-[#E5EAF1]">
                    <span>58mm/80mm Thermal Print</span>
                    <span className="text-[#159B72] font-semibold">UPI QR Paid ✓</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="text-base font-semibold text-[#172033] mb-2 leading-snug">
                  {gu ? "રિટેલ સ્ટોર્સ અને સુપરમાર્કેટ્સ" : "Retailers & Kirana Stores"}
                </h3>
                <p className="text-xs text-[#667085] leading-relaxed font-normal mb-4">
                  {gu
                    ? "કાઉન્ટર પર ઝડપી બારકોડ સ્કેનિંગ, ૫ સેકન્ડમાં થર્મલ પ્રિન્ટ, કેશ ટેન્ડરિંગ અને કસ્ટમર ડેટાબેઝ મેનેજમેન્ટ."
                    : "Fast barcode checkout, cash tender calculations, 58mm/80mm thermal receipts, customer phone khata, and instant stock deduction."}
                </p>

                {/* Bullet points */}
                <div className="space-y-2 pt-2 border-t border-[#E5EAF1]/70">
                  <div className="flex items-start gap-2 text-xs text-[#172033] font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#159B72] shrink-0 mt-0.5" />
                    <span>{gu ? "બારકોડ સ્કેનર કનેક્ટિવિટી" : "Barcode scanner & F2/F4 keyboard shortcuts"}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-[#172033] font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#159B72] shrink-0 mt-0.5" />
                    <span>{gu ? "૫ સેકન્ડમાં થર્મલ બિલ પ્રિન્ટ" : "58/80mm thermal receipt & cash drawer support"}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-[#172033] font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#159B72] shrink-0 mt-0.5" />
                    <span>{gu ? "રોકડ અને UPI ઓટોમેટિક કેલ્ક્યુલેશન" : "Instant change calculation preventing cash errors"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Wholesalers & Traders */}
          <div className="bg-white rounded-2xl border border-[#E5EAF1] overflow-hidden shadow-xs hover:shadow-md hover:border-[#2563EB]/40 transition-all duration-200 flex flex-col justify-between group">
            <div>
              {/* Professional SaaS UI Graphic Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-br from-[#EFF6FF] via-[#F8FBFF] to-white border-b border-[#E5EAF1]">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shadow-xs">
                    <Building className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                    Bulk Pricing & Khata
                  </span>
                </div>

                {/* Micro Visual Card */}
                <div className="bg-white rounded-xl border border-[#E5EAF1] p-3 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[#172033]">Party Credit Limit</span>
                    <span className="text-[10px] font-semibold text-[#2563EB]">₹3.5L / ₹5.0L</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#EDF0F4] rounded-full overflow-hidden">
                    <div className="bg-[#2563EB] h-full rounded-full" style={{ width: "70%" }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#667085]">
                    <span>Tier: 50+ BOX (₹1,050/box)</span>
                    <span className="text-[#159B72] font-semibold">WhatsApp Sent ✓</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="text-base font-semibold text-[#172033] mb-2 leading-snug">
                  {gu ? "હોલસેલર્સ અને વેપારીઓ" : "Wholesalers & Traders"}
                </h3>
                <p className="text-xs text-[#667085] leading-relaxed font-normal mb-4">
                  {gu
                    ? "પાર્ટી વાઇઝ સ્પેશિયલ રેટ, ઉધાર ક્રેડિટ લિમિટ, બલ્ક ઇન્વોઇસિંગ અને WhatsApp પેમેન્ટ રિમાઇન્ડર્સ."
                    : "Party-wise tiered pricing, credit limits, bulk packing units (BOX, PCS, KG), outstanding payment reminders, and auto-generated GSTR-1."}
                </p>

                {/* Bullet points */}
                <div className="space-y-2 pt-2 border-t border-[#E5EAF1]/70">
                  <div className="flex items-start gap-2 text-xs text-[#172033] font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#159B72] shrink-0 mt-0.5" />
                    <span>{gu ? "ગ્રાહક દીઠ અલગ રેટ હિસ્ટ્રી" : "Custom party rates & past price memory"}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-[#172033] font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#159B72] shrink-0 mt-0.5" />
                    <span>{gu ? "ઉધાર મર્યાદા (Credit Limit) ચેક" : "Credit limit warnings preventing bad debts"}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-[#172033] font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#159B72] shrink-0 mt-0.5" />
                    <span>{gu ? "ઓટોમેટિક WhatsApp સ્ટેટમેન્ટ્સ" : "1-Click WhatsApp payment reminders & ledger PDF"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Distributors & C&F Agents */}
          <div className="bg-white rounded-2xl border border-[#E5EAF1] overflow-hidden shadow-xs hover:shadow-md hover:border-[#2563EB]/40 transition-all duration-200 flex flex-col justify-between group">
            <div>
              {/* Professional SaaS UI Graphic Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-br from-[#EFF6FF] via-[#F8FBFF] to-white border-b border-[#E5EAF1]">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shadow-xs">
                    <Truck className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-[#159B72] border border-emerald-200">
                    Multi-Godown Sync
                  </span>
                </div>

                {/* Micro Visual Card */}
                <div className="bg-white rounded-xl border border-[#E5EAF1] p-3 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[#172033]">Dispatch Challan</span>
                    <span className="font-mono text-[#2563EB] font-semibold">DC/26-27/0082</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#667085] bg-[#F7F9FC] p-1.5 rounded-lg border border-[#E5EAF1]">
                    <span>Surat Main → Rajkot Van</span>
                    <span className="text-emerald-700 font-semibold font-mono">180 BOX</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="text-base font-semibold text-[#172033] mb-2 leading-snug">
                  {gu ? "ડિસ્ટ્રિબ્યુટર્સ અને એજન્સીઝ" : "Distributors & C&F Agents"}
                </h3>
                <p className="text-xs text-[#667085] leading-relaxed font-normal mb-4">
                  {gu
                    ? "મલ્ટી-ગોડાઉન સ્ટોક, ડિલિવરી ચલણ, વાન સેલ્સ ડિસ્પેચ અને સપ્લાયર પર્ચેઝ ઓર્ડર મેનેજમેન્ટ."
                    : "Multi-godown stock management, dispatch delivery challans, stock movement slips, vendor purchase orders, and sales rep tracking."}
                </p>

                {/* Bullet points */}
                <div className="space-y-2 pt-2 border-t border-[#E5EAF1]/70">
                  <div className="flex items-start gap-2 text-xs text-[#172033] font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#159B72] shrink-0 mt-0.5" />
                    <span>{gu ? "ગોડાઉન વચ્ચે સ્ટોક ટ્રાન્સફર સ્લિપ" : "Godown-to-godown stock transfer challans"}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-[#172033] font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#159B72] shrink-0 mt-0.5" />
                    <span>{gu ? "ચલણમાંથી સીધું પાકું બિલ" : "Convert dispatch challan to tax invoice in 1-click"}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-[#172033] font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#159B72] shrink-0 mt-0.5" />
                    <span>{gu ? "સપ્લાયર પર્ચેઝ OCR સ્કેનર" : "Scan vendor invoices with camera OCR"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Manufacturers & Fabricators */}
          <div className="bg-white rounded-2xl border border-[#E5EAF1] overflow-hidden shadow-xs hover:shadow-md hover:border-[#2563EB]/40 transition-all duration-200 flex flex-col justify-between group">
            <div>
              {/* Professional SaaS UI Graphic Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-br from-[#EFF6FF] via-[#F8FBFF] to-white border-b border-[#E5EAF1]">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shadow-xs">
                    <Factory className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    Raw Material & Batch
                  </span>
                </div>

                {/* Micro Visual Card */}
                <div className="bg-white rounded-xl border border-[#E5EAF1] p-3 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[#172033]">Batch Production</span>
                    <span className="font-mono text-[#2563EB] font-semibold">#BATCH-26B</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#667085] bg-[#F7F9FC] p-1.5 rounded-lg border border-[#E5EAF1]">
                    <span>Raw Steel Inward → Finished Parts</span>
                    <span className="text-[#159B72] font-semibold">Job Work OK ✓</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="text-base font-semibold text-[#172033] mb-2 leading-snug">
                  {gu ? "મેન્યુફેક્ચરિંગ અને વર્કશોપ્સ" : "Manufacturers & Fabricators"}
                </h3>
                <p className="text-xs text-[#667085] leading-relaxed font-normal mb-4">
                  {gu
                    ? "કાચો માલ (Raw Material) ઇન્વેન્ટરી, બેચ નંબર ટ્રેકિંગ, જોબ વર્ક ચલણ અને તૈયાર માલનું વેચાણ."
                    : "Raw material tracking, batch manufacturing numbers, expiry dates, job work challans, and finished goods invoicing."}
                </p>

                {/* Bullet points */}
                <div className="space-y-2 pt-2 border-t border-[#E5EAF1]/70">
                  <div className="flex items-start gap-2 text-xs text-[#172033] font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#159B72] shrink-0 mt-0.5" />
                    <span>{gu ? "કાચા માલ અને તૈયાર માલનો અલગ સ્ટોક" : "Raw material vs finished goods classification"}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-[#172033] font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#159B72] shrink-0 mt-0.5" />
                    <span>{gu ? "બેચ નંબર અને મેન્યુફેક્ચરિંગ તારીખ" : "Batch tracking with quality inspection logs"}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-[#172033] font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#159B72] shrink-0 mt-0.5" />
                    <span>{gu ? "જોબવર્ક ડિલિવરી ચલણ" : "Statutory job work challans for third-party processing"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Service Providers & Consultants */}
          <div className="bg-white rounded-2xl border border-[#E5EAF1] overflow-hidden shadow-xs hover:shadow-md hover:border-[#2563EB]/40 transition-all duration-200 flex flex-col justify-between group md:col-span-2 lg:col-span-1">
            <div>
              {/* Professional SaaS UI Graphic Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-br from-[#EFF6FF] via-[#F8FBFF] to-white border-b border-[#E5EAF1]">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shadow-xs">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                    SAC Billing & TDS
                  </span>
                </div>

                {/* Micro Visual Card */}
                <div className="bg-white rounded-xl border border-[#E5EAF1] p-3 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[#172033]">SAC Code 998311</span>
                    <span className="font-mono text-[#2563EB] font-semibold">TDS (10%)</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#667085] bg-[#F7F9FC] p-1.5 rounded-lg border border-[#E5EAF1]">
                    <span>Professional Consultancy</span>
                    <span className="text-[#159B72] font-semibold">Milestone Invoice ✓</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="text-base font-semibold text-[#172033] mb-2 leading-snug">
                  {gu ? "સર્વિસ પ્રોવાઇડર્સ અને કન્સલ્ટન્ટ્સ" : "Service Providers & Agencies"}
                </h3>
                <p className="text-xs text-[#667085] leading-relaxed font-normal mb-4">
                  {gu
                    ? "SAC કોડ આધારિત પ્રોફેશનલ બિલિંગ, પ્રોફોર્મા કોટેશન્સ, TDS ટ્રેકિંગ અને ઓડિટ રિપોર્ટ્સ."
                    : "SAC code billing, professional proforma invoices, milestone billing, TDS deduction tracking, and chartered accountant audit sheets."}
                </p>

                {/* Bullet points */}
                <div className="space-y-2 pt-2 border-t border-[#E5EAF1]/70">
                  <div className="flex items-start gap-2 text-xs text-[#172033] font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#159B72] shrink-0 mt-0.5" />
                    <span>{gu ? "સત્તાવાર SAC કોડ્સ ડિરેક્ટરી" : "Pre-loaded official statutory SAC code list"}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-[#172033] font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#159B72] shrink-0 mt-0.5" />
                    <span>{gu ? "પ્રોફોર્મા અને એસ્ટિમેટ ઇન્વોઇસિંગ" : "Milestone estimates convertible to final invoices"}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-[#172033] font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#159B72] shrink-0 mt-0.5" />
                    <span>{gu ? "TDS ટેક્સ કપાત ટ્રેકિંગ" : "TDS receivable tracking & reconciliation"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
