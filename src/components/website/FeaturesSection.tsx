"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ReceiptText,
  Package,
  ShoppingCart,
  Calculator,
  Files,
  Wallet,
  FileCheck,
  ChartLine,
  ArrowRight,
  Check,
  AlertTriangle,
  QrCode,
} from "lucide-react";

export interface FeaturesSectionProps {
  lang?: "en" | "gu";
}

export function FeaturesSection({ lang = "en" }: FeaturesSectionProps) {
  const gu = lang === "gu";

  return (
    <section id="features" className="py-16 sm:py-24 bg-white border-b border-[#E5EAF1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 sm:mb-16 text-left">
          <span className="text-xs font-semibold text-[#2563EB] uppercase tracking-wider block mb-2">
            {gu ? "સંપૂર્ણ પ્લેટફોર્મ ક્ષમતાઓ" : "Core Platform Capabilities"}
          </span>
          <h2
            className="text-2xl sm:text-4xl lg:text-[42px] font-semibold text-[#172033] tracking-tight leading-[1.12]"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            {gu ? (
              <>
                તમારા વેપાર માટે જરૂરી તમામ સુવિધાઓ.
                <br />
                <span className="text-[#667085]">બિનજરૂરી કશું નહીં.</span>
              </>
            ) : (
              <>
                Everything Your Business Needs.
                <br />
                <span className="text-[#667085]">Nothing You Don&apos;t.</span>
              </>
            )}
          </h2>
          <p className="text-[15px] sm:text-base text-[#667085] mt-3 font-normal leading-relaxed max-w-2xl">
            {gu
              ? "રિટેલ કાઉન્ટર, ગોડાઉન, ઓફિસ કે એકાઉન્ટિંગ — તમામ કામગીરી હવે એક જ સરળ પ્લેટફોર્મ પર."
              : "Streamline your daily trade operations with modern, high-precision tools built specifically for Indian businesses."}
          </p>
        </div>

        {/* Varied Asymmetric Layout */}
        <div className="space-y-6 sm:space-y-8">
          {/* 1. Large Horizontal Showcase Block: GST Invoicing */}
          <div className="rounded-2xl border border-[#E5EAF1] bg-[#F7F9FC] p-6 sm:p-8 lg:p-10 transition-all hover:border-[#2563EB]/40">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center gap-2 text-[#2563EB]">
                  <ReceiptText className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {gu ? "જીએસટી બિલિંગ" : "GST Invoicing"}
                  </span>
                </div>
                <h3
                  className="text-xl sm:text-2xl font-semibold text-[#172033] leading-snug"
                  style={{ fontFamily: "var(--font-manrope)" }}
                >
                  {gu
                    ? "૧૦ સેકન્ડમાં કાયદેસર B2B અને B2C ઇન્વોઇસિંગ"
                    : "Statutory B2B & B2C Tax Invoicing in Under 10 Seconds"}
                </h3>
                <p className="text-sm text-[#667085] leading-relaxed font-normal">
                  {gu
                    ? "ગ્રાહકનો GSTIN નાખતાં જ રાજ્ય અને CGST/SGST કે IGST આપોઆપ નક્કી થાય છે. ૪ પ્રિન્ટ થીમ્સ અને ડાયનેમિક UPI QR કોડ સાથે."
                    : "Generate 100% compliant GST tax invoices with auto-state detection, HSN lookup, round-offs, 4 customizable print color themes, and dynamic UPI QR payment codes."}
                </p>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-[#172033]">
                    <Check className="w-4 h-4 text-[#159B72]" strokeWidth={2} />
                    <span>Auto-detect IGST vs CGST/SGST from customer GSTIN</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-[#172033]">
                    <Check className="w-4 h-4 text-[#159B72]" strokeWidth={2} />
                    <span>Dynamic UPI payment QR code generated on invoice print</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-[#172033]">
                    <Check className="w-4 h-4 text-[#159B72]" strokeWidth={2} />
                    <span>Instant WhatsApp sharing with PDF statements</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href="/features#sales-invoices"
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8]"
                  >
                    <span>{gu ? "ઇન્વોઇસિંગ સુવિધાઓ જુઓ" : "Explore Invoicing Features"}</span>
                    <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                  </Link>
                </div>
              </div>

              {/* Live Invoice Graphic Preview */}
              <div className="lg:col-span-7 bg-white rounded-xl border border-[#E5EAF1] p-4 sm:p-6 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF1]">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#2563EB]">
                      TAX INVOICE · B2B
                    </span>
                    <div className="text-xs font-mono font-semibold text-[#172033] mt-0.5">
                      INV/26-27/0048
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#667085] block font-medium">Grand Total</span>
                    <span className="text-sm sm:text-base font-semibold text-[#2563EB] tabular-nums">
                      ₹ 1,52,515.00
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 rounded-lg bg-[#F7F9FC] border border-[#E5EAF1]">
                  <div>
                    <span className="text-[10px] text-[#667085] block">Customer</span>
                    <span className="font-semibold text-[#172033]">Jaydeep Traders & Tech</span>
                    <span className="block text-[10px] font-mono text-[#667085]">24AAACP4921K1ZW</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#667085] block">Supply Type</span>
                    <span className="font-medium text-[#172033]">24 - Gujarat (Intra-State)</span>
                    <span className="text-[10px] font-semibold text-[#159B72] block mt-0.5">
                      ● CGST 9% + SGST 9%
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-[#E5EAF1] text-[#667085]">
                        <th className="py-1.5 font-medium">Item Description</th>
                        <th className="py-1.5 text-center font-medium">HSN</th>
                        <th className="py-1.5 text-center font-medium">Qty</th>
                        <th className="py-1.5 text-right font-medium">Rate</th>
                        <th className="py-1.5 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5EAF1] text-[#172033]">
                      <tr>
                        <td className="py-2 font-medium">Dell Inspiron 15 Core i5</td>
                        <td className="py-2 text-center font-mono text-[10px] text-[#667085]">8471</td>
                        <td className="py-2 text-center tabular-nums">2</td>
                        <td className="py-2 text-right tabular-nums">₹45,000</td>
                        <td className="py-2 text-right font-semibold tabular-nums">₹90,000</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-medium">Samsung 43&quot; 4K Smart TV</td>
                        <td className="py-2 text-center font-mono text-[10px] text-[#667085]">8528</td>
                        <td className="py-2 text-center tabular-nums">1</td>
                        <td className="py-2 text-right tabular-nums">₹32,000</td>
                        <td className="py-2 text-right font-semibold tabular-nums">₹32,000</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-medium">Logitech Wireless Combo</td>
                        <td className="py-2 text-center font-mono text-[10px] text-[#667085]">8471</td>
                        <td className="py-2 text-center tabular-nums">5</td>
                        <td className="py-2 text-right tabular-nums">₹1,450</td>
                        <td className="py-2 text-right font-semibold tabular-nums">₹7,250</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="pt-2 border-t border-[#E5EAF1] flex items-center justify-between text-[11px] text-[#667085]">
                  <div className="flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-[#172033]" strokeWidth={1.75} />
                    <span>Dynamic UPI QR Embedded</span>
                  </div>
                  <div className="text-right">
                    <span>CGST: ₹11,632.50 · SGST: ₹11,632.50</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Asymmetric 2-Column Split: Inventory (60%) & AI OCR Scanner (40%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
            {/* Inventory Management */}
            <div className="lg:col-span-7 rounded-2xl border border-[#E5EAF1] bg-[#F7F9FC] p-6 sm:p-8 flex flex-col justify-between transition-all hover:border-[#2563EB]/40">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[#2563EB]">
                  <Package className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {gu ? "ઇન્વેન્ટરી અને સ્ટોક" : "Inventory & Godowns"}
                  </span>
                </div>
                <h3
                  className="text-lg sm:text-xl font-semibold text-[#172033]"
                  style={{ fontFamily: "var(--font-manrope)" }}
                >
                  {gu
                    ? "મલ્ટી-ગોડાઉન સ્ટોક, બેચ ટ્રેકિંગ અને ઓટોમેટિક લો-સ્ટોક એલર્ટ્સ"
                    : "Multi-Godown Stock, Batches & Automated Reorder Warnings"}
                </h3>
                <p className="text-xs sm:text-sm text-[#667085] leading-relaxed font-normal">
                  {gu
                    ? "દરેક ગોડાઉન અને દુકાનનો અલગ સ્ટોક ટ્રેક કરો. સ્ટોક ઘટતો હોય ત્યારે આપોઆપ એલર્ટ મળે છે જેથી વેચાણમાં અટકાવ ન આવે."
                    : "Track items across multiple physical warehouses, shop floors, and delivery vans with batch numbers, manufacturing dates, and smart reorder points."}
                </p>

                {/* Stock Table Preview */}
                <div className="bg-white rounded-xl border border-[#E5EAF1] p-3 shadow-2xs mt-4">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-[#E5EAF1]">
                    <span className="font-semibold text-[#172033]">Surat Central Godown</span>
                    <span className="text-[11px] text-[#159B72] font-medium">● 4,890 Items Active</span>
                  </div>
                  <div className="divide-y divide-[#E5EAF1] text-xs pt-1">
                    <div className="py-1.5 flex items-center justify-between">
                      <span className="font-medium text-[#172033]">Lenovo ThinkPad E14</span>
                      <span className="text-[#159B72] font-medium tabular-nums">48 BOX (In Stock)</span>
                    </div>
                    <div className="py-1.5 flex items-center justify-between">
                      <span className="font-medium text-[#172033]">Samsung 55&quot; 4K TV</span>
                      <span className="text-amber-600 font-medium flex items-center gap-1 tabular-nums">
                        <AlertTriangle className="w-3 h-3" strokeWidth={1.75} />
                        3 PCS (Low Stock)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Link
                  href="/features#inventory-items"
                  className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8]"
                >
                  <span>{gu ? "સ્ટોક ફીચર્સ જુઓ" : "Explore Inventory"}</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                </Link>
              </div>
            </div>

            {/* AI Purchase OCR Scanner */}
            <div className="lg:col-span-5 rounded-2xl border border-[#E5EAF1] bg-[#F7F9FC] p-6 sm:p-8 flex flex-col justify-between transition-all hover:border-[#2563EB]/40">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[#2563EB]">
                  <Files className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {gu ? "ખરીદી સ્કેનર" : "Purchase Bill OCR"}
                  </span>
                </div>
                <h3
                  className="text-lg sm:text-xl font-semibold text-[#172033]"
                  style={{ fontFamily: "var(--font-manrope)" }}
                >
                  {gu
                    ? "વેન્ડર કાગળ બિલનો ફોટો પાડો — સીધી એન્ટ્રી"
                    : "Instant Optical Reading of Vendor Paper Bills"}
                </h3>
                <p className="text-xs sm:text-sm text-[#667085] leading-relaxed font-normal">
                  {gu
                    ? "સપ્લાયરના બિલનો કેમેરાથી ફોટો પાડો. આઇટમો, HSN કોડ, દર અને જીએસટી સીધા જ સ્ટોક લેજરમાં ઉમેરાઈ જાય છે."
                    : "Snap a photo of any vendor invoice. Our optical OCR parser extracts line items, GSTIN, and tax rates directly into your purchase ledger."}
                </p>

                <div className="p-3 bg-white rounded-xl border border-[#E5EAF1] text-xs space-y-1.5 shadow-2xs mt-4">
                  <div className="flex justify-between text-[#667085] text-[11px]">
                    <span>Camera Scanned Bill</span>
                    <span className="text-[#159B72] font-medium">99.8% Accuracy ✓</span>
                  </div>
                  <div className="font-semibold text-[#172033]">Shree Ambica Steels Pvt Ltd</div>
                  <div className="text-[11px] text-[#667085]">
                    Invoice #PUR-8921 · ₹ 84,200 ITC Claimable
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Link
                  href="/features#purchases-bills"
                  className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8]"
                >
                  <span>{gu ? "સ્કેનર વિગતો જુઓ" : "Explore Bill Scanner"}</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                </Link>
              </div>
            </div>
          </div>

          {/* 3. Three-Column Editorial Row: POS Checkout, Accounting Ledgers, Payment Tracking */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* POS Billing */}
            <div className="rounded-2xl border border-[#E5EAF1] bg-[#F7F9FC] p-6 flex flex-col justify-between transition-all hover:border-[#2563EB]/40">
              <div className="space-y-3">
                <ShoppingCart className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />
                <h3
                  className="text-base sm:text-lg font-semibold text-[#172033]"
                  style={{ fontFamily: "var(--font-manrope)" }}
                >
                  {gu ? "ઝડપી POS કાઉન્ટર બિલિંગ" : "High-Speed POS Counter Checkout"}
                </h3>
                <p className="text-xs sm:text-sm text-[#667085] leading-relaxed font-normal">
                  {gu
                    ? "રિટેલ કાઉન્ટર પર બારકોડ સ્કેનિંગ, F2/F4 કીબોર્ડ શૉર્ટકટ્સ અને 58mm/80mm થર્મલ પ્રિન્ટિંગ."
                    : "Accelerate retail checkout with barcode scanner pairing, instant cash tender change calculations, and thermal receipts."}
                </p>
              </div>
              <div className="pt-4">
                <Link
                  href="/features#pos-billing"
                  className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8]"
                >
                  <span>{gu ? "વિગતવાર જુઓ" : "Learn More"}</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                </Link>
              </div>
            </div>

            {/* Accounting Ledgers */}
            <div className="rounded-2xl border border-[#E5EAF1] bg-[#F7F9FC] p-6 flex flex-col justify-between transition-all hover:border-[#2563EB]/40">
              <div className="space-y-3">
                <Calculator className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />
                <h3
                  className="text-base sm:text-lg font-semibold text-[#172033]"
                  style={{ fontFamily: "var(--font-manrope)" }}
                >
                  {gu ? "રોજમેળ & ડબલ-એન્ટ્રી ખાતાવહી" : "Double-Entry Accounting & P&L"}
                </h3>
                <p className="text-xs sm:text-sm text-[#667085] leading-relaxed font-normal">
                  {gu
                    ? "નફો-નુકસાન ખાતું, પાકું સરવૈયું, ટ્રાયલ બેલેન્સ અને તમામ પાર્ટી ખાતાઓ આપોઆપ તૈયાર."
                    : "Automatic Profit & Loss, Balance Sheets, Cash Flow, and party ledger statements compliant with statutory standards."}
                </p>
              </div>
              <div className="pt-4">
                <Link
                  href="/features#accounting-ledgers"
                  className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8]"
                >
                  <span>{gu ? "વિગતવાર જુઓ" : "Learn More"}</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                </Link>
              </div>
            </div>

            {/* Payment Tracking */}
            <div className="rounded-2xl border border-[#E5EAF1] bg-[#F7F9FC] p-6 flex flex-col justify-between transition-all hover:border-[#2563EB]/40">
              <div className="space-y-3">
                <Wallet className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />
                <h3
                  className="text-base sm:text-lg font-semibold text-[#172033]"
                  style={{ fontFamily: "var(--font-manrope)" }}
                >
                  {gu ? "પેમેન્ટ ટ્રેકિંગ & WhatsApp રીમાઇન્ડર" : "Receivables & WhatsApp Reminders"}
                </h3>
                <p className="text-xs sm:text-sm text-[#667085] leading-relaxed font-normal">
                  {gu
                    ? "ગ્રાહકો પાસેથી લેણાં અને વેપારીઓને દેવાં રકમ પર નજર રાખો. ૧-ક્લિકમાં WhatsApp પર સ્ટેટમેન્ટ મોકલો."
                    : "Monitor overdue balances, payment receipts, and dispatch 1-click branded WhatsApp reminder notices with ledger PDFs."}
                </p>
              </div>
              <div className="pt-4">
                <Link
                  href="/features#accounting-payments"
                  className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8]"
                >
                  <span>{gu ? "વિગતવાર જુઓ" : "Learn More"}</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                </Link>
              </div>
            </div>
          </div>

          {/* 4. Two-Column Balanced Split: GST Returns & Business Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* GST & Tax Filing */}
            <div className="rounded-2xl border border-[#E5EAF1] bg-[#F7F9FC] p-6 sm:p-8 flex flex-col justify-between transition-all hover:border-[#2563EB]/40">
              <div className="space-y-3">
                <FileCheck className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />
                <h3
                  className="text-lg sm:text-xl font-semibold text-[#172033]"
                  style={{ fontFamily: "var(--font-manrope)" }}
                >
                  {gu ? "સરકારી GSTR-1 & 3B પોર્ટલ રિપોર્ટ્સ" : "Audit-Ready GSTR-1 & 3B Tax Returns"}
                </h3>
                <p className="text-xs sm:text-sm text-[#667085] leading-relaxed font-normal">
                  {gu
                    ? "GSTR-1, GSTR-3B અને 2B રિકોન્સિલિએશન ફાઇલો સરકારી પોર્ટલ માટે સીધા JSON કે Excel ફોર્મેટમાં તૈયાર."
                    : "Prepare government portal-compliant JSON and Excel files with comprehensive B2B, B2C, HSN, and document summaries."}
                </p>
              </div>
              <div className="pt-4">
                <Link
                  href="/features#gst-tax"
                  className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8]"
                >
                  <span>{gu ? "ટેક્સ રિપોર્ટ્સ જુઓ" : "Explore Tax Reports"}</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                </Link>
              </div>
            </div>

            {/* Business Analytics */}
            <div className="rounded-2xl border border-[#E5EAF1] bg-[#F7F9FC] p-6 sm:p-8 flex flex-col justify-between transition-all hover:border-[#2563EB]/40">
              <div className="space-y-3">
                <ChartLine className="w-5 h-5 text-[#2563EB]" strokeWidth={1.75} />
                <h3
                  className="text-lg sm:text-xl font-semibold text-[#172033]"
                  style={{ fontFamily: "var(--font-manrope)" }}
                >
                  {gu ? "લાઇવ બિઝનેસ એનાલિટિક્સ ડેશબોર્ડ" : "Live Executive Business Intelligence"}
                </h3>
                <p className="text-xs sm:text-sm text-[#667085] leading-relaxed font-normal">
                  {gu
                    ? "વેચાણ ટ્રેન્ડ, ટોપ આઇટમો, કેટેગરી વિતરણ અને નફાકારકતાના આધારે વ્યવસાયમાં સાચા નિર્ણયો લો."
                    : "Interactive KPI scorecards, visual 30-day sales curves, category distributions, and growth analytics for confident decision-making."}
                </p>
              </div>
              <div className="pt-4">
                <Link
                  href="/features#business-tools"
                  className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8]"
                >
                  <span>{gu ? "એનાલિટિક્સ જુઓ" : "Explore Analytics"}</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
