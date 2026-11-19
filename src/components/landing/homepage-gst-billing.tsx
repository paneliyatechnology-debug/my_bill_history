"use client";

import React, { useState } from "react";
import {
  Receipt,
  CheckCircle2,
  Share2,
  QrCode,
  Printer,
  Sparkles,
  FileCheck,
  Percent,
} from "lucide-react";

export interface HomepageGstBillingProps {
  lang?: "en" | "gu";
}

export function HomepageGstBilling({ lang = "en" }: HomepageGstBillingProps) {
  const gu = lang === "gu";
  const [taxType, setTaxType] = useState<"intrastate" | "interstate">("intrastate");
  const [activeTheme, setActiveTheme] = useState<"blue" | "emerald" | "saffron" | "navy">("blue");

  // Sample realistic line items
  const items = [
    { name: "Dell Inspiron 15 Core i5", hsn: "8471", qty: 2, rate: 45000, taxRate: 18 },
    { name: "Samsung 43\" Smart 4K TV", hsn: "8528", qty: 1, rate: 32000, taxRate: 18 },
    { name: "Logitech Wireless Combo MK240", hsn: "8471", qty: 5, rate: 1450, taxRate: 18 },
  ];

  const subTotal = items.reduce((acc, it) => acc + it.qty * it.rate, 0); // 90000 + 32000 + 7250 = 129250
  const taxAmount = (subTotal * 18) / 100; // 23265
  const cgst = taxType === "intrastate" ? taxAmount / 2 : 0; // 11632.50
  const sgst = taxType === "intrastate" ? taxAmount / 2 : 0; // 11632.50
  const igst = taxType === "interstate" ? taxAmount : 0; // 23265
  const grandTotal = subTotal + taxAmount; // 152515

  const themeColors = {
    blue: { primary: "#2563EB", light: "#EFF6FF", border: "#BFDBFE" },
    emerald: { primary: "#159B72", light: "#E6FBF5", border: "#A7F3D0" },
    saffron: { primary: "#C2410C", light: "#FFF7ED", border: "#FED7AA" },
    navy: { primary: "#1E293B", light: "#F1F5F9", border: "#CBD5E1" },
  };

  const selectedTheme = themeColors[activeTheme];

  return (
    <section className="py-14 sm:py-20 bg-[#F7F9FC] border-b border-[#E5EAF1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <span className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider px-3 py-1 bg-[#EFF6FF] border border-[#BFDBFE] rounded-full">
            {gu ? "ટેક્સ કમ્પ્લાયન્સ" : "Statutory Tax Invoicing"}
          </span>
          <h2
            className="text-2xl sm:text-3xl font-semibold text-[#172033] tracking-tight mt-3"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            {gu
              ? "સેકન્ડોમાં પ્રોફેશનલ GST ઇન્વોઇસ બનાવો"
              : "Professional GST Invoices in Seconds"}
          </h2>
          <p className="text-xs sm:text-sm text-[#667085] mt-2 font-normal">
            {gu
              ? "ગ્રાહકનો GSTIN નાખો અને સિસ્ટમ આપોઆપ CGST/SGST કે આંતરરાજ્ય IGST નક્કી કરીને ૧૦૦% સાચું બિલ બનાવશે."
              : "Generate statutory GST tax invoices with automatic HSN lookup, CGST/SGST/IGST breakdown, and instant sharing."}
          </p>
        </div>

        {/* Interactive Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Realistic Invoice Editor Preview */}
          <div className="lg:col-span-8 bg-white rounded-2xl sm:rounded-3xl border border-[#E5EAF1] shadow-md p-5 sm:p-7">
            {/* Top Toolbar: Switch Intra vs Inter-State & Theme Picker */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-[#E5EAF1]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#172033]">
                  {gu ? "ટેક્સ પ્રકાર:" : "Supply Type:"}
                </span>
                <div className="inline-flex items-center bg-[#F7F9FC] border border-[#E5EAF1] rounded-lg p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setTaxType("intrastate")}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                      taxType === "intrastate"
                        ? "bg-white text-[#2563EB] shadow-2xs"
                        : "text-[#667085] hover:text-[#172033]"
                    }`}
                  >
                    Intra-State (CGST + SGST)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxType("interstate")}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                      taxType === "interstate"
                        ? "bg-white text-[#2563EB] shadow-2xs"
                        : "text-[#667085] hover:text-[#172033]"
                    }`}
                  >
                    Inter-State (IGST 18%)
                  </button>
                </div>
              </div>

              {/* Theme color selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[#667085] font-medium mr-1">
                  {gu ? "પ્રિન્ટ થીમ:" : "Theme:"}
                </span>
                {(["blue", "emerald", "saffron", "navy"] as const).map((thm) => (
                  <button
                    key={thm}
                    type="button"
                    onClick={() => setActiveTheme(thm)}
                    className={`w-5 h-5 rounded-full border-2 transition-transform ${
                      activeTheme === thm ? "scale-110 border-slate-900" : "border-white"
                    }`}
                    style={{ backgroundColor: themeColors[thm].primary }}
                    title={`Theme ${thm}`}
                  />
                ))}
              </div>
            </div>

            {/* Simulated Live Invoice Sheet */}
            <div
              className="p-4 sm:p-6 rounded-xl border transition-colors duration-200"
              style={{
                borderColor: selectedTheme.border,
                backgroundColor: "#FFFFFF",
              }}
            >
              {/* Invoice Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#E5EAF1]">
                <div>
                  <div className="text-base sm:text-lg font-semibold text-[#172033]">
                    Shree Hari Electronics Pvt. Ltd.
                  </div>
                  <div className="text-[11px] text-[#667085] mt-0.5">
                    GSTIN: <span className="font-mono font-medium text-[#172033]">24AAACS1234F1Z8</span> · State: Gujarat (24)
                  </div>
                  <div className="text-[11px] text-[#667085]">
                    Ahmedabad, Gujarat · Mobile: +91 98765 43210
                  </div>
                </div>

                <div className="sm:text-right">
                  <span
                    className="inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold text-white tracking-wider uppercase mb-1"
                    style={{ backgroundColor: selectedTheme.primary }}
                  >
                    TAX INVOICE
                  </span>
                  <div className="text-xs font-mono font-semibold text-[#172033]">
                    INV/26-27/0048
                  </div>
                  <div className="text-[11px] text-[#667085]">Date: 19 Nov 2026</div>
                </div>
              </div>

              {/* Bill To Party */}
              <div className="py-3 text-xs border-b border-[#E5EAF1] grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-[#667085] uppercase tracking-wider block">Billed To (Customer):</span>
                  <span className="font-semibold text-[#172033]">Jaydeep Traders & Technology</span>
                  <span className="block text-[11px] font-mono text-[#667085]">GSTIN: 24AAACP4921K1ZW</span>
                </div>
                <div className="sm:text-right">
                  <span className="text-[10px] text-[#667085] uppercase tracking-wider block">Place of Supply:</span>
                  <span className="font-medium text-[#172033]">
                    {taxType === "intrastate" ? "24 - Gujarat (Intra-State)" : "27 - Maharashtra (Inter-State)"}
                  </span>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="overflow-x-auto my-3">
                <table className="w-full text-left text-xs min-w-[440px]">
                  <thead>
                    <tr
                      className="text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: selectedTheme.primary }}
                    >
                      <th className="py-2 pr-2">Item Description</th>
                      <th className="py-2 px-2">HSN</th>
                      <th className="py-2 px-2 text-center">Qty</th>
                      <th className="py-2 px-2 text-right">Rate</th>
                      <th className="py-2 pl-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAF1] text-[#172033]">
                    {items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 pr-2 font-medium">{it.name}</td>
                        <td className="py-2.5 px-2 font-mono text-[11px] text-[#667085]">{it.hsn}</td>
                        <td className="py-2.5 px-2 text-center tabular-nums">{it.qty}</td>
                        <td className="py-2.5 px-2 text-right tabular-nums">₹{it.rate.toLocaleString("en-IN")}</td>
                        <td className="py-2.5 pl-2 text-right font-semibold tabular-nums">
                          ₹{(it.qty * it.rate).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Summary Breakdown */}
              <div className="pt-3 border-t border-[#E5EAF1] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-[#F7F9FC] border border-[#E5EAF1] rounded-lg flex items-center justify-center shrink-0 p-1">
                    <QrCode className="w-10 h-10 text-[#172033]" />
                  </div>
                  <div className="text-[11px] text-[#667085] leading-tight">
                    <span className="font-semibold text-[#172033] block">Scan UPI to Pay</span>
                    Instant payment into verified bank account
                  </div>
                </div>

                <div className="w-full sm:w-60 space-y-1.5 text-xs text-[#172033]">
                  <div className="flex justify-between text-[#667085]">
                    <span>Taxable Amount:</span>
                    <span className="tabular-nums font-medium">₹{subTotal.toLocaleString("en-IN")}</span>
                  </div>

                  {taxType === "intrastate" ? (
                    <>
                      <div className="flex justify-between text-[#667085]">
                        <span>CGST (9.0%):</span>
                        <span className="tabular-nums font-medium">₹{cgst.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between text-[#667085]">
                        <span>SGST (9.0%):</span>
                        <span className="tabular-nums font-medium">₹{sgst.toLocaleString("en-IN")}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-[#667085]">
                      <span>IGST (18.0%):</span>
                      <span className="tabular-nums font-medium">₹{igst.toLocaleString("en-IN")}</span>
                    </div>
                  )}

                  <div className="pt-1.5 border-t border-[#E5EAF1] flex justify-between font-semibold text-sm">
                    <span style={{ color: selectedTheme.primary }}>Grand Total:</span>
                    <span className="tabular-nums" style={{ color: selectedTheme.primary }}>
                      ₹{grandTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Key Feature Highlights */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl border border-[#E5EAF1] p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-semibold text-[#172033]">
                {gu ? "ઇન્વોઇસિંગ ક્ષમતાઓ" : "Statutory GST Features"}
              </h3>

              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5">
                    <FileCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#172033] block">
                      {gu ? "B2B અને B2C ટેક્સ ઇન્વોઇસિંગ" : "B2B & B2C Compliant"}
                    </span>
                    <span className="text-[11px] text-[#667085]">
                      {gu ? "સત્તાવાર GSTIN ફોર્મેટ અને HSN કોડ સાથે તૈયાર." : "Full statutory compliance with HSN lookup and reverse charges."}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5">
                    <Share2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#172033] block">
                      {gu ? "વોટ્સએપ અને પીડીએફ શેરિંગ" : "WhatsApp & PDF Sharing"}
                    </span>
                    <span className="text-[11px] text-[#667085]">
                      {gu ? "ગ્રાહકના વોટ્સએપ પર સીધી પીડીએફ મોકલો." : "Dispatch bills directly to customer phones in 1-click."}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5">
                    <Printer className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#172033] block">
                      {gu ? "A4 અને થર્મલ પ્રિન્ટિંગ" : "A4 & Thermal Print Modes"}
                    </span>
                    <span className="text-[11px] text-[#667085]">
                      {gu ? "લેસર, ઇંકજેટ કે POS થર્મલ પ્રિન્ટર સપોર્ટ." : "Works seamlessly with laser, deskjet, and thermal printers."}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5">
                    <Percent className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#172033] block">
                      {gu ? "ઓટોમેટિક ટેક્સ અને રાઉન્ડ-ઓફ" : "Smart Round-Off & Discounts"}
                    </span>
                    <span className="text-[11px] text-[#667085]">
                      {gu ? "ગણતરીની કોઈ ભૂલ નહીં, સંપૂર્ણ પારદર્શક." : "Automated paise round-off and line-item cash discounts."}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Callout Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#EFF6FF] to-white border border-[#BFDBFE] shadow-2xs">
              <span className="text-xs font-semibold text-[#2563EB] block">
                {gu ? "સરકારી પોર્ટલ સાથે સુસંગત" : "Government Portal Ready"}
              </span>
              <p className="text-[11px] text-[#667085] mt-1 leading-relaxed">
                {gu
                  ? "તમામ બિલોનું વેચાણ સીધું GSTR-1 અને 3B ફાઈલોમાં જમા થાય છે જેથી સીએ અને ઓડિટર્સનું કામ સરળ બને."
                  : "All invoice entries automatically flow into your GSTR-1 and 3B returns for hassle-free tax filing."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
