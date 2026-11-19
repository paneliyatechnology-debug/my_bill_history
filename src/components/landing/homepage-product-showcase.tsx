"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Receipt,
  Boxes,
  BarChart3,
  Store,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  QrCode,
  Printer,
  Sparkles,
  Search,
  Filter,
  Plus,
} from "lucide-react";
import Link from "next/link";

export interface HomepageProductShowcaseProps {
  lang?: "en" | "gu";
}

export function HomepageProductShowcase({ lang = "en" }: HomepageProductShowcaseProps) {
  const gu = lang === "gu";
  const [activeTab, setActiveTab] = useState<"dashboard" | "invoices" | "inventory" | "reports" | "pos">("dashboard");

  const tabs = [
    {
      id: "dashboard" as const,
      label: gu ? "ડેશબોર્ડ" : "Dashboard",
      icon: <LayoutDashboard className="w-4 h-4" />,
      title: gu ? "સંપૂર્ણ વેપારનું લાઇવ કંટ્રોલ સેન્ટર" : "Live Executive Business Command Center",
      description: gu
        ? "આજના કુલ વેચાણ, લેણાં, દેવાં, રોકડ સિલક અને તાજેતરના તમામ વ્યવહારો એક જ સ્ક્રીન પર જુઓ."
        : "Real-time visibility into your sales velocity, receivables, payables, available bank balance, and upcoming dues.",
      bullets: [
        gu ? "૩૦-દિવસનું વેચાણ ચાર્ટ અને ગ્રોથ એનાલિસિસ" : "Interactive sales trend spline with peak amount badge",
        gu ? "લેણાં અને દેવાં બાકી રકમ માટે આગોતરા એલર્ટ્સ" : "Upcoming dues alert cards with instant collect/pay triggers",
        gu ? "કેટેગરી મુજબ વેચાણ વિતરણ ડોનટ ચાર્ટ" : "Category-wise sales distribution with dynamic percentages",
      ],
      route: "/app/home",
    },
    {
      id: "invoices" as const,
      label: gu ? "GST ઇન્વોઇસિંગ" : "GST Invoices",
      icon: <Receipt className="w-4 h-4" />,
      title: gu ? "પ્રોફેશનલ સરકારી GST સુસંગત બિલિંગ" : "Statutory GST Compliant Tax Invoicing",
      description: gu
        ? "માત્ર ૧૦ સેકન્ડમાં HSN કોડ, CGST/SGST/IGST ટેક્સ ગણતરી અને રાઉન્ડ-ઓફ સાથે પાકું બિલ તૈયાર કરો."
        : "Draft, finalize and print compliant GST tax invoices with 4 designer themes, instant WhatsApp sharing, and QR payment codes.",
      bullets: [
        gu ? "B2B અને B2C ઇન્વોઇસ માટે 4 આકર્ષક પ્રિન્ટ થીમ્સ" : "4 customizable print themes (Classic, Modern, Saffron, Emerald)",
        gu ? "ગ્રાહકનો GSTIN નાખતાં જ રાજ્ય અને ટેક્સ ઓટો-ડિટેક્ટ" : "Auto state & IGST vs CGST/SGST detection from customer GSTIN",
        gu ? "UPI QR કોડ જેથી ગ્રાહક સીધા જ સ્કેન કરીને પેમેન્ટ કરે" : "Dynamic UPI payment QR code generated on every invoice print",
      ],
      route: "/sales/invoices",
    },
    {
      id: "inventory" as const,
      label: gu ? "ઇન્વેન્ટરી" : "Inventory",
      icon: <Boxes className="w-4 h-4" />,
      title: gu ? "મલ્ટી-ગોડાઉન સ્ટોક અને બેચ કંટ્રોલ" : "Multi-Godown Stock & Batch Tracking",
      description: gu
        ? "દરેક ગોડાઉન અને દુકાનનો અલગ સ્ટોક ટ્રેક કરો. માલ ઘટતો હોય ત્યારે તાત્કાલિક રી-ઓર્ડર એલર્ટ મેળવો."
        : "Track items across multiple physical warehouses, shop floors, and vans with batch numbers, manufacturing dates and reorder points.",
      bullets: [
        gu ? "ગોડાઉન ટ્રાન્સફર ચલણ અને મુવમેન્ટ હિસ્ટ્રી" : "Godown transfer slips with complete audit trails",
        gu ? "બારકોડ સ્ટીકર જનરેશન અને લેબલ પ્રિન્ટિંગ" : "1-click barcode label printing for thermal and A4 sheets",
        gu ? "લો-સ્ટોક એલર્ટ્સ જેથી માલ ખાલી ન થઈ જાય" : "Smart stock alerts preventing stockouts on fast-moving goods",
      ],
      route: "/inventory",
    },
    {
      id: "reports" as const,
      label: gu ? "રિપોર્ટ્સ અને એકાઉન્ટ્સ" : "Reports & Analytics",
      icon: <BarChart3 className="w-4 h-4" />,
      title: gu ? "નફો-નુકસાન અને નાણાકીય સ્થિતિ" : "Audit-Ready Financial Statements",
      description: gu
        ? "નફો-નુકસાન ખાતું, પાકું સરવૈયું, પાર્ટી વાઈઝ ખાતાવહી અને સરકારી GSTR ફાઈલો એક ક્લિકમાં મેળવો."
        : "Automated double-entry accounting ledgers, Trial Balance, Profit & Loss statements, and GSTR-1/3B tax filing sheets.",
      bullets: [
        gu ? "પાર્ટી લેજર સ્ટેટમેન્ટ પીડીએફ અને WhatsApp શેરિંગ" : "Party ledger khata exportable as PDF & Excel spreadsheet",
        gu ? "GSTR-1 અને 3B પોર્ટલ ફોર્મેટ ડાઉનલોડ" : "Government GST portal ready JSON and Excel returns",
        gu ? "આઇટમ-વાઇઝ પ્રોફિટ માર્જિન એનાલિસિસ" : "Item-wise profitability and margin realization breakdown",
      ],
      route: "/reports",
    },
    {
      id: "pos" as const,
      label: gu ? "POS કાઉન્ટર" : "POS Billing",
      icon: <Store className="w-4 h-4" />,
      title: gu ? "રિટેલ કાઉન્ટર માટે સુપરફાસ્ટ સ્કેન બિલિંગ" : "High-Speed Retail Counter Checkout",
      description: gu
        ? "ગ્રાહકોની લાંબી લાઇન માટે કીબોર્ડ શોર્ટકટ્સ અને થર્મલ રિસિપ્ટ સાથે વીજળીક ગતિએ બિલિંગ કરો."
        : "Built for high-volume retail checkout counters with instant barcode scanning, cash/UPI change calculation, and 58/80mm thermal receipts.",
      bullets: [
        gu ? "F2 (શોધો) અને F4 (ચૂકવણી) ફાસ્ટ કીબોર્ડ શોર્ટકટ્સ" : "Keyboard-first workflow (F2 Search, F4 Tender, Space Checkout)",
        gu ? "૫૮mm અને ૮૦mm થર્મલ રિસિપ્ટ પ્રિન્ટર સપોર્ટ" : "Direct USB, Bluetooth & Network thermal POS printer integration",
        gu ? "રોકડ ટેન્ડરિંગ અને છૂટા પૈસાની ગણતરી" : "Instant cash tendering with change calculation to prevent errors",
      ],
      route: "/sales/pos",
    },
  ];

  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <section className="py-12 sm:py-18 lg:py-20 bg-white border-b border-[#E5EAF1] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <span className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider px-3 py-1 bg-[#EFF6FF] border border-[#BFDBFE] rounded-full">
            {gu ? "લાઇવ પ્રોડક્ટ પ્રીવ્યૂ" : "Interactive Product Showcase"}
          </span>
          <h2
            className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#172033] tracking-tight mt-3"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            {gu
              ? "એક પ્લેટફોર્મ. સંપૂર્ણ વેપાર નિયંત્રણ."
              : "One Platform. Complete Business Control."}
          </h2>
          <p className="text-xs sm:text-sm text-[#667085] mt-2 font-normal leading-relaxed">
            {gu
              ? "ફ્રન્ટ કાઉન્ટરથી લઈને ગોડાઉન, ઓફિસ અને ઓડિટર સુધી તમામ વ્યવસાયિક પ્રક્રિયાઓ એકબીજા સાથે જોડાયેલી છે."
              : "Explore how MyOwn BillBook connects your front counter, back office, warehouse, and accounting."}
          </p>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto gap-2 pb-2 mb-6 sm:mb-8 no-scrollbar">
          <div className="inline-flex items-center p-1 sm:p-1.5 bg-[#F7F9FC] border border-[#E5EAF1] rounded-2xl gap-1 shrink-0">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer shrink-0 ${
                    isActive
                      ? "bg-[#2563EB] text-white shadow-2xs"
                      : "text-[#667085] hover:text-[#172033] hover:bg-white/80"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content Display Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="bg-[#F7F9FC] rounded-2xl sm:rounded-3xl border border-[#E5EAF1] p-4 sm:p-7 lg:p-9 shadow-xs"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
              {/* Left Details */}
              <div className="lg:col-span-5 space-y-3.5 sm:space-y-4">
                <span className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider">
                  {currentTab.label}
                </span>

                <h3
                  className="text-lg sm:text-2xl font-semibold text-[#172033] leading-snug"
                  style={{ fontFamily: "var(--font-manrope)" }}
                >
                  {currentTab.title}
                </h3>

                <p className="text-xs sm:text-sm text-[#667085] leading-relaxed font-normal">
                  {currentTab.description}
                </p>

                {/* Bullets */}
                <div className="space-y-2 pt-1 sm:pt-2">
                  {currentTab.bullets.map((bullet, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-[#172033] font-medium">
                      <CheckCircle2 className="w-4 h-4 text-[#159B72] shrink-0 mt-0.5" />
                      <span className="leading-snug">{bullet}</span>
                    </div>
                  ))}
                </div>

                {/* Module Link */}
                <div className="pt-2 sm:pt-3">
                  <Link
                    href={currentTab.route}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-[#E5EAF1] rounded-xl text-xs font-semibold text-[#172033] hover:text-[#2563EB] transition-colors shadow-2xs"
                  >
                    <span>{gu ? "લાઇવ મોડ્યુલ જુઓ" : "Open Module Preview"}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#2563EB]" />
                  </Link>
                </div>
              </div>

              {/* Right Media Frame — Professional SaaS UI Graphics for each tab */}
              <div className="lg:col-span-7">
                {activeTab === "dashboard" && (
                  <div className="relative rounded-2xl border border-[#E5EAF1] bg-white shadow-md overflow-hidden aspect-[16/10]">
                    <Image
                      src="/themes/dashboard-current.png"
                      alt="MyOwn BillBook Dashboard"
                      fill
                      priority
                      sizes="(min-width: 1024px) 680px, 100vw"
                      className="object-cover object-top"
                    />
                  </div>
                )}

                {activeTab === "invoices" && (
                  <div className="rounded-2xl border border-[#E5EAF1] bg-white p-4 sm:p-5 shadow-md space-y-3 font-sans">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF1]">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                          TAX INVOICE · B2B
                        </span>
                        <div className="text-sm font-semibold text-[#172033] mt-1 font-mono">
                          INV/26-27/0048
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-[#667085] block">Grand Total</span>
                        <span className="text-base font-semibold text-[#2563EB] tabular-nums">
                          ₹ 1,52,515.00
                        </span>
                      </div>
                    </div>

                    {/* Customer info */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 rounded-xl bg-[#F7F9FC] border border-[#E5EAF1]">
                      <div>
                        <span className="text-[10px] text-[#667085] block">Customer</span>
                        <span className="font-semibold text-[#172033]">Jaydeep Traders & Tech</span>
                        <span className="block text-[10px] font-mono text-[#667085]">GSTIN: 24AAACP4921K1ZW</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-[#667085] block">Date & Status</span>
                        <span className="font-medium text-[#172033]">19 Nov 2026</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#159B72] block mt-0.5">
                          ● Fully Paid
                        </span>
                      </div>
                    </div>

                    {/* Mini Item Table */}
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
                            <td className="py-1.5 font-medium">Dell Inspiron 15 Core i5</td>
                            <td className="py-1.5 text-center font-mono text-[10px] text-[#667085]">8471</td>
                            <td className="py-1.5 text-center tabular-nums">2</td>
                            <td className="py-1.5 text-right tabular-nums">₹45,000</td>
                            <td className="py-1.5 text-right font-semibold tabular-nums">₹90,000</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 font-medium">Samsung 43&quot; 4K Smart TV</td>
                            <td className="py-1.5 text-center font-mono text-[10px] text-[#667085]">8528</td>
                            <td className="py-1.5 text-center tabular-nums">1</td>
                            <td className="py-1.5 text-right tabular-nums">₹32,000</td>
                            <td className="py-1.5 text-right font-semibold tabular-nums">₹32,000</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 font-medium">Logitech Wireless Combo</td>
                            <td className="py-1.5 text-center font-mono text-[10px] text-[#667085]">8471</td>
                            <td className="py-1.5 text-center tabular-nums">5</td>
                            <td className="py-1.5 text-right tabular-nums">₹1,450</td>
                            <td className="py-1.5 text-right font-semibold tabular-nums">₹7,250</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Tax Footer */}
                    <div className="pt-2 border-t border-[#E5EAF1] flex items-center justify-between text-[11px] text-[#667085]">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-[#172033]" />
                        <span>UPI QR Code Attached</span>
                      </div>
                      <div className="text-right">
                        <span>CGST (9%): ₹11,632.50 · SGST (9%): ₹11,632.50</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "inventory" && (
                  <div className="rounded-2xl border border-[#E5EAF1] bg-white p-4 sm:p-5 shadow-md space-y-3 font-sans">
                    {/* Warehouse Header Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5EAF1]">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#172033]">Active Warehouse:</span>
                        <span className="px-2.5 py-1 rounded-lg bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] text-xs font-semibold">
                          Surat Central Godown
                        </span>
                      </div>
                      <span className="text-[11px] text-[#159B72] font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ● 4,890 Items In Stock
                      </span>
                    </div>

                    {/* Stock Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="border-b border-[#E5EAF1] text-[#667085]">
                            <th className="py-1.5 font-medium">Product / SKU</th>
                            <th className="py-1.5 font-medium">Category</th>
                            <th className="py-1.5 text-center font-medium">Available Qty</th>
                            <th className="py-1.5 text-right font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5EAF1] text-[#172033]">
                          <tr>
                            <td className="py-2">
                              <span className="font-semibold block">Lenovo ThinkPad E14</span>
                              <span className="text-[10px] text-[#667085] font-mono">SKU: LAP-LEN-04</span>
                            </td>
                            <td className="py-2 text-[#667085]">Laptops</td>
                            <td className="py-2 text-center font-semibold tabular-nums">48 BOX</td>
                            <td className="py-2 text-right">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-[#159B72] border border-emerald-200">
                                In Stock
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2">
                              <span className="font-semibold block">Samsung 55&quot; OLED TV</span>
                              <span className="text-[10px] text-[#667085] font-mono">SKU: TV-SAM-55</span>
                            </td>
                            <td className="py-2 text-[#667085]">Television</td>
                            <td className="py-2 text-center font-semibold tabular-nums text-amber-600">3 PCS</td>
                            <td className="py-2 text-right">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 justify-end">
                                <AlertTriangle className="w-3 h-3" />
                                Low Stock
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2">
                              <span className="font-semibold block">Sony WH-1000XM5 Headset</span>
                              <span className="text-[10px] text-[#667085] font-mono">SKU: AUD-SON-05</span>
                            </td>
                            <td className="py-2 text-[#667085]">Audio</td>
                            <td className="py-2 text-center font-semibold tabular-nums">120 PCS</td>
                            <td className="py-2 text-right">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-[#159B72] border border-emerald-200">
                                In Stock
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Stock Valuation Summary */}
                    <div className="pt-2 border-t border-[#E5EAF1] grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-[#F7F9FC] border border-[#E5EAF1]">
                        <span className="text-[10px] text-[#667085] block">Total Valuation</span>
                        <span className="text-xs font-semibold text-[#172033] tabular-nums">₹48,92,400</span>
                      </div>
                      <div className="p-2 rounded-lg bg-[#F7F9FC] border border-[#E5EAF1]">
                        <span className="text-[10px] text-[#667085] block">Godowns Synced</span>
                        <span className="text-xs font-semibold text-[#2563EB] tabular-nums">3 Active</span>
                      </div>
                      <div className="p-2 rounded-lg bg-[#F7F9FC] border border-[#E5EAF1]">
                        <span className="text-[10px] text-[#667085] block">Reorder Alerts</span>
                        <span className="text-xs font-semibold text-amber-600 tabular-nums">2 Items</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "reports" && (
                  <div className="rounded-2xl border border-[#E5EAF1] bg-white p-4 sm:p-5 shadow-md space-y-3 font-sans">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF1]">
                      <div>
                        <span className="text-[10px] text-[#667085] uppercase tracking-wider block">Financial Performance</span>
                        <span className="text-xs sm:text-sm font-semibold text-[#172033]">Profit & Loss Statement (FY 2026-27)</span>
                      </div>
                      <span className="text-[11px] font-semibold text-[#2563EB] bg-[#EFF6FF] border border-[#BFDBFE] px-2.5 py-0.5 rounded-full">
                        Audit Ready
                      </span>
                    </div>

                    {/* 3 Metric Scorecards */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2.5 rounded-xl bg-[#F7F9FC] border border-[#E5EAF1]">
                        <span className="text-[10px] text-[#667085] block">Total Revenue</span>
                        <span className="text-xs sm:text-sm font-semibold text-[#172033] tabular-nums">₹15,92,688</span>
                        <span className="text-[10px] text-[#159B72] font-semibold block mt-0.5">+18.6% growth</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#F7F9FC] border border-[#E5EAF1]">
                        <span className="text-[10px] text-[#667085] block">Gross Margin</span>
                        <span className="text-xs sm:text-sm font-semibold text-[#172033] tabular-nums">₹7,45,368</span>
                        <span className="text-[10px] text-[#2563EB] font-semibold block mt-0.5">46.8% margin</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE]">
                        <span className="text-[10px] text-[#2563EB] block">Net Profit</span>
                        <span className="text-xs sm:text-sm font-semibold text-[#2563EB] tabular-nums">₹5,32,411</span>
                        <span className="text-[10px] text-[#159B72] font-semibold block mt-0.5">33.4% realized</span>
                      </div>
                    </div>

                    {/* Visual Monthly Performance Bars */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-[11px] text-[#667085]">
                        <span>Monthly Sales Velocity vs Targets</span>
                        <span className="text-[#172033] font-semibold">104% Achieved</span>
                      </div>
                      <div className="w-full h-2.5 bg-[#EDF0F4] rounded-full overflow-hidden flex">
                        <div className="bg-[#2563EB] h-full rounded-full" style={{ width: "72%" }} />
                        <div className="bg-[#159B72] h-full rounded-full" style={{ width: "32%" }} />
                      </div>
                    </div>

                    {/* Statutory GST Filing Badges */}
                    <div className="pt-2 border-t border-[#E5EAF1] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <span className="text-[#667085]">Tax Filing Status:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[#159B72] font-semibold border border-emerald-200">
                          ✓ GSTR-1 Filed
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[#159B72] font-semibold border border-emerald-200">
                          ✓ GSTR-3B Ready
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "pos" && (
                  <div className="rounded-2xl border border-[#E5EAF1] bg-white p-4 sm:p-5 shadow-md space-y-3 font-sans">
                    {/* Counter Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF1]">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-[#2563EB]" />
                        <span className="text-xs font-semibold text-[#172033]">Counter POS #01 · Fast Billing</span>
                      </div>
                      <span className="text-[11px] font-semibold text-[#159B72] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Shift Active
                      </span>
                    </div>

                    {/* POS Active Cart Grid */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded-xl bg-[#F7F9FC] border border-[#E5EAF1] space-y-1">
                        <span className="text-[10px] text-[#667085] uppercase tracking-wider block">Scanned Item</span>
                        <span className="font-semibold text-[#172033] block">Wireless Barcode Scanner</span>
                        <span className="text-[10px] text-[#2563EB] font-mono">1 PCS × ₹1,850.00</span>
                      </div>
                      <div className="p-2 rounded-xl bg-[#F7F9FC] border border-[#E5EAF1] space-y-1">
                        <span className="text-[10px] text-[#667085] uppercase tracking-wider block">Scanned Item</span>
                        <span className="font-semibold text-[#172033] block">Thermal Paper 80mm (Box)</span>
                        <span className="text-[10px] text-[#2563EB] font-mono">3 BOX × ₹450.00</span>
                      </div>
                    </div>

                    {/* Total & Change Calculator */}
                    <div className="p-3 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#667085] block">Payable Total</span>
                        <span className="text-base sm:text-lg font-semibold text-[#2563EB] tabular-nums">
                          ₹ 3,200.00
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-[#667085] block">Tendered Cash [F4]</span>
                        <span className="text-xs font-semibold text-[#159B72] tabular-nums">
                          ₹4,000 → Change: ₹800
                        </span>
                      </div>
                    </div>

                    {/* Shortcuts Bar */}
                    <div className="pt-2 border-t border-[#E5EAF1] flex items-center justify-between text-[10px] text-[#667085]">
                      <span>Keyboard: [F2] Search · [F4] Tender · [Space] Checkout</span>
                      <span className="text-[#2563EB] font-semibold flex items-center gap-1">
                        <Printer className="w-3 h-3" />
                        <span>Thermal 80mm Ready</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
