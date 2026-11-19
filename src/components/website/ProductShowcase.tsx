"use client";

import React, { useState } from "react";
import {
  FileText,
  Files,
  Package,
  BookOpen,
  BarChart3,
  Receipt,
  Check,
  Search,
  Plus,
  Printer,
  Download,
  Share2,
  Calendar,
  Building2,
  CheckCircle2,
} from "lucide-react";

export interface ProductShowcaseProps {
  lang?: "en" | "gu";
}

export function ProductShowcase({ lang = "en" }: ProductShowcaseProps) {
  const gu = lang === "gu";
  const [activeTab, setActiveTab] = useState<number>(0);

  const tabs = [
    {
      id: "gst-invoice",
      label: gu ? "GST ઇન્વોઇસ" : "GST Invoice",
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: "purchases",
      label: gu ? "ખરીદી મેનેજમેન્ટ" : "Purchase Management",
      icon: <Files className="w-4 h-4" />,
    },
    {
      id: "inventory",
      label: gu ? "ઇન્વેન્ટરી સ્ટોક" : "Inventory Management",
      icon: <Package className="w-4 h-4" />,
    },
    {
      id: "daybook",
      label: gu ? "રોજમેળ (Daybook)" : "Daybook",
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      id: "financial-reports",
      label: gu ? "નાણાકીય રિપોર્ટ્સ" : "Financial Reports",
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: "pos-billing",
      label: gu ? "POS કાઉન્ટર" : "POS Billing",
      icon: <Receipt className="w-4 h-4" />,
    },
  ];

  return (
    <section id="demo" className="py-16 sm:py-24 bg-white border-b border-[#E5EAF1] scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-10 sm:mb-14 text-left">
          <span
            className="text-xs font-semibold text-[#2563EB] uppercase tracking-wider block mb-2"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            {gu ? "લાઈવ ડેમો & વર્કફ્લોઝ" : "INTERACTIVE PRODUCT EXPERIENCE"}
          </span>
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-semibold text-[#172033] tracking-tight leading-tight"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            {gu ? (
              <>
                MyOwnBillBook લાઈવ જુઓ.
                <br />
                સરળતાથી કામગીરી સમજો.
              </>
            ) : (
              <>
                See MyOwnBillBook in Action.
              </>
            )}
          </h2>
          <p
            className="text-sm sm:text-base text-[#667085] mt-3 leading-relaxed max-w-2xl font-normal"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            {gu
              ? "તપાસો કે રોજિંદા બિલિંગ, ઇન્વેન્ટરી અને એકાઉન્ટિંગ વર્કફ્લોઝ એકબીજા સાથે કેવી રીતે સુમેળથી કામ કરે છે."
              : "Explore how everyday billing, inventory and accounting workflows work together."}
          </p>
        </div>

        {/* 6 Interactive Tabs Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-[#E5EAF1]">
          {tabs.map((tab, idx) => {
            const isActive = activeTab === idx;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(idx)}
                className={`flex items-center gap-2 px-4 py-3 rounded-t-xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer border-b-2 -mb-[2px] ${
                  isActive
                    ? "border-[#2563EB] text-[#2563EB] bg-[#F7F9FC]"
                    : "border-transparent text-[#667085] hover:text-[#172033] hover:bg-[#F7F9FC]/60"
                }`}
                style={{ fontFamily: "var(--font-inter)" }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Interactive Screen Preview Container */}
        <div className="mt-6 rounded-2xl bg-[#F7F9FC] border border-[#E5EAF1] shadow-md p-5 sm:p-7 min-h-[420px]">
          {/* TAB 0: GST INVOICE WORKFLOW */}
          {activeTab === 0 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5EAF1]">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-semibold text-[#172033]">Tax Invoice #INV-2026-104</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                    ORIGINAL FOR RECIPIENT
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#667085]">Date: 19 Nov 2026 • Due: 04 Dec 2026 (15 Days)</span>
                </div>
              </div>

              {/* Bill To & Ship To Boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white border border-[#E5EAF1]">
                  <span className="text-[10px] font-semibold text-[#667085] uppercase block">Billed By (Seller)</span>
                  <span className="font-semibold text-[#172033] text-sm block mt-0.5">Shree Ganesh Trading Co.</span>
                  <span className="text-[#667085] text-[11px] block mt-0.5">
                    GSTIN: 24ABCDE1234F1Z5 • Ahmedabad, Gujarat - 380001
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white border border-[#E5EAF1]">
                  <span className="text-[10px] font-semibold text-[#667085] uppercase block">Billed To (Customer - B2B)</span>
                  <span className="font-semibold text-[#172033] text-sm block mt-0.5">Krishna Supermarket & Wholesalers</span>
                  <span className="text-[#667085] text-[11px] block mt-0.5">
                    GSTIN: 24XYZPA9876Q1Z3 • Surat, Gujarat - 395002
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="rounded-xl bg-white border border-[#E5EAF1] overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-[#F7F9FC] text-[11px] font-semibold text-[#172033] border-b border-[#E5EAF1]">
                    <tr>
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-3">HSN</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3 text-right">Rate</th>
                      <th className="py-2.5 px-3 text-right">Taxable</th>
                      <th className="py-2.5 px-3 text-right">GST (18%)</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAF1] text-[#172033]">
                    <tr>
                      <td className="py-2 px-3 font-semibold">Basmati Rice Premium 25kg Bag</td>
                      <td className="py-2 px-3 text-[#667085]">100630</td>
                      <td className="py-2 px-3 text-right tabular-nums">20 Bags</td>
                      <td className="py-2 px-3 text-right tabular-nums">₹ 1,850.00</td>
                      <td className="py-2 px-3 text-right tabular-nums font-medium">₹ 37,000.00</td>
                      <td className="py-2 px-3 text-right tabular-nums text-[#667085]">₹ 1,850 (5%)</td>
                      <td className="py-2 px-3 text-right tabular-nums font-semibold text-[#172033]">₹ 38,850.00</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold">Refined Sunflower Oil 15L Tin</td>
                      <td className="py-2 px-3 text-[#667085]">151219</td>
                      <td className="py-2 px-3 text-right tabular-nums">15 Tins</td>
                      <td className="py-2 px-3 text-right tabular-nums">₹ 1,620.00</td>
                      <td className="py-2 px-3 text-right tabular-nums font-medium">₹ 24,300.00</td>
                      <td className="py-2 px-3 text-right tabular-nums text-[#667085]">₹ 1,215 (5%)</td>
                      <td className="py-2 px-3 text-right tabular-nums font-semibold text-[#172033]">₹ 25,515.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Total Calculation Footer */}
              <div className="flex flex-col sm:flex-row justify-between items-end gap-3 pt-2">
                <span className="text-[11px] text-[#667085]">
                  Amounts in Words: Sixty-Four Thousand Three Hundred Sixty-Five Rupees Only
                </span>
                <div className="w-full sm:w-64 p-3 rounded-xl bg-white border border-[#E5EAF1] space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#667085]">
                    <span>Taxable Amount:</span>
                    <span className="font-semibold text-[#172033] tabular-nums">₹ 61,300.00</span>
                  </div>
                  <div className="flex justify-between text-[#667085]">
                    <span>CGST + SGST (5%):</span>
                    <span className="font-semibold text-[#172033] tabular-nums">₹ 3,065.00</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-[#E5EAF1] font-semibold text-sm text-[#172033]">
                    <span>Grand Total:</span>
                    <span className="text-[#2563EB] tabular-nums">₹ 64,365.00</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: PURCHASE MANAGEMENT */}
          {activeTab === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF1]">
                <div>
                  <h4 className="text-sm font-semibold text-[#172033]">Vendor Bills & Purchases</h4>
                  <span className="text-xs text-[#667085]">Auto-scanned paper bills and verified input tax credit (ITC)</span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#EFF6FF] text-[#2563EB] border border-[#2563EB]/30">
                  OCR Scanner Ready
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-white border border-[#E5EAF1]">
                  <span className="text-[10px] text-[#667085] block">Total Monthly Inward</span>
                  <span className="text-base font-semibold text-[#172033] tabular-nums mt-0.5 block">₹ 3,42,800</span>
                  <span className="text-[10px] text-emerald-600 font-medium">32 verified bills</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-[#E5EAF1]">
                  <span className="text-[10px] text-[#667085] block">Eligible Input Tax Credit (ITC)</span>
                  <span className="text-base font-semibold text-emerald-700 tabular-nums mt-0.5 block">₹ 48,250</span>
                  <span className="text-[10px] text-emerald-600 font-medium">100% GSTR-2B matched</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-[#E5EAF1]">
                  <span className="text-[10px] text-[#667085] block">Pending Supplier Dues</span>
                  <span className="text-base font-semibold text-[#2563EB] tabular-nums mt-0.5 block">₹ 58,400</span>
                  <span className="text-[10px] text-[#2563EB] font-medium">2 payments due this week</span>
                </div>
              </div>

              {/* Purchase Bills Table */}
              <div className="rounded-xl bg-white border border-[#E5EAF1] overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-[#F7F9FC] text-[11px] font-semibold text-[#172033] border-b border-[#E5EAF1]">
                    <tr>
                      <th className="py-2.5 px-3">Bill #</th>
                      <th className="py-2.5 px-3">Supplier Name</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Scan Mode</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAF1] text-[#172033]">
                    <tr>
                      <td className="py-2 px-3 font-semibold">PB-2026-441</td>
                      <td className="py-2 px-3">Ambica Agro Commodities Ltd</td>
                      <td className="py-2 px-3 text-[#667085]">18 Nov 2026</td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] font-semibold text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.5 rounded">
                          AI Camera Scan
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums font-semibold">₹ 84,200.00</td>
                      <td className="py-2 px-3 text-right text-emerald-700 font-semibold">MATCHED 2B</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold">PB-2026-440</td>
                      <td className="py-2 px-3">Maruti Packaging Pvt Ltd</td>
                      <td className="py-2 px-3 text-[#667085]">16 Nov 2026</td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                          Manual Entry
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums font-semibold">₹ 26,450.00</td>
                      <td className="py-2 px-3 text-right text-emerald-700 font-semibold">PAID</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: INVENTORY MANAGEMENT */}
          {activeTab === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF1]">
                <div>
                  <h4 className="text-sm font-semibold text-[#172033]">Multi-Godown Stock & Inventory</h4>
                  <span className="text-xs text-[#667085]">Real-time item balances, godown locations and batch expiry tracking</span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white border border-[#E5EAF1] text-[#172033]">
                  Godowns: 3 Active
                </span>
              </div>

              {/* Items Inventory List */}
              <div className="rounded-xl bg-white border border-[#E5EAF1] overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-[#F7F9FC] text-[11px] font-semibold text-[#172033] border-b border-[#E5EAF1]">
                    <tr>
                      <th className="py-2.5 px-3">Item Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Godown</th>
                      <th className="py-2.5 px-3 text-right">In Stock</th>
                      <th className="py-2.5 px-3 text-right">Sale Price</th>
                      <th className="py-2.5 px-3 text-right">Stock Alert</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAF1] text-[#172033]">
                    <tr>
                      <td className="py-2.5 px-3 font-semibold">Wheat Sharbati (30kg Sack)</td>
                      <td className="py-2.5 px-3 text-[#667085]">Grains</td>
                      <td className="py-2.5 px-3 text-[#172033]">Main Godown A</td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold">142 Sacks</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">₹ 1,180.00</td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">OPTIMAL</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold">Tata Tea Gold 1kg Carton</td>
                      <td className="py-2.5 px-3 text-[#667085]">Beverages</td>
                      <td className="py-2.5 px-3 text-[#172033]">Shop Counter Rack</td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-[#2563EB]">8 Cartons</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">₹ 560.00</td>
                      <td className="py-2.5 px-3 text-right text-[#2563EB] font-semibold">LOW STOCK (Min 15)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold">Sugar Medium Crystal (50kg)</td>
                      <td className="py-2.5 px-3 text-[#667085]">Staples</td>
                      <td className="py-2.5 px-3 text-[#172033]">Warehouse B</td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold">88 Bags</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">₹ 2,150.00</td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">OPTIMAL</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: DAYBOOK (DESI NAMA) */}
          {activeTab === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF1]">
                <div>
                  <h4 className="text-sm font-semibold text-[#172033]">રોજમેળ / Daybook Journal</h4>
                  <span className="text-xs text-[#667085]">Daily chronological double-entry record of cash and bank receipts & payments</span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Cash Balance: ₹ 42,850
                </span>
              </div>

              {/* Daybook Table */}
              <div className="rounded-xl bg-white border border-[#E5EAF1] overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-[#F7F9FC] text-[11px] font-semibold text-[#172033] border-b border-[#E5EAF1]">
                    <tr>
                      <th className="py-2.5 px-3">Voucher #</th>
                      <th className="py-2.5 px-3">Party / Ledger Account</th>
                      <th className="py-2.5 px-3">Voucher Type</th>
                      <th className="py-2.5 px-3">Narration</th>
                      <th className="py-2.5 px-3 text-right">Debit (જમા)</th>
                      <th className="py-2.5 px-3 text-right">Credit (ઉધાર)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAF1] text-[#172033]">
                    <tr>
                      <td className="py-2.5 px-3 font-semibold">REC-2026-081</td>
                      <td className="py-2.5 px-3 font-semibold text-[#172033]">Jay Ganesh Kirana Store</td>
                      <td className="py-2.5 px-3"><span className="text-emerald-700 font-semibold">Payment In</span></td>
                      <td className="py-2.5 px-3 text-[#667085]">Received via GooglePay UPI for INV-092</td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-emerald-700">₹ 18,500.00</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-slate-400">-</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold">PAY-2026-042</td>
                      <td className="py-2.5 px-3 font-semibold text-[#172033]">Gujarat Freight Transport</td>
                      <td className="py-2.5 px-3"><span className="text-[#2563EB] font-semibold">Expense</span></td>
                      <td className="py-2.5 px-3 text-[#667085]">Goods inward lorry freight charges</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-slate-400">-</td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-[#2563EB]">₹ 3,200.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: FINANCIAL REPORTS */}
          {activeTab === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF1]">
                <div>
                  <h4 className="text-sm font-semibold text-[#172033]">Financial Statements & Profitability</h4>
                  <span className="text-xs text-[#667085]">Automated Profit & Loss, Trial Balance and Balance Sheet summaries</span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white border border-[#E5EAF1] text-[#172033]">
                  Net Profit: 26.5%
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-white border border-[#E5EAF1] space-y-2">
                  <span className="font-semibold text-[#172033] text-sm block">Profit & Loss Summary (YTD)</span>
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-[#667085]">
                      <span>Operating Revenue:</span>
                      <span className="font-semibold text-[#172033]">₹ 18,45,200</span>
                    </div>
                    <div className="flex justify-between text-[#667085]">
                      <span>Cost of Sales:</span>
                      <span className="font-semibold text-[#172033]">- ₹ 11,20,800</span>
                    </div>
                    <div className="flex justify-between text-[#667085]">
                      <span>Operating Expenses:</span>
                      <span className="font-semibold text-[#172033]">- ₹ 2,34,800</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-[#E5EAF1] text-sm font-semibold text-[#2563EB]">
                      <span>Net Business Profit:</span>
                      <span>₹ 4,89,600</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-[#E5EAF1] space-y-2">
                  <span className="font-semibold text-[#172033] text-sm block">Balance Sheet Highlights</span>
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-[#667085]">
                      <span>Proprietor Capital:</span>
                      <span className="font-semibold text-[#172033]">₹ 8,50,000</span>
                    </div>
                    <div className="flex justify-between text-[#667085]">
                      <span>Fixed Assets:</span>
                      <span className="font-semibold text-[#172033]">₹ 4,20,000</span>
                    </div>
                    <div className="flex justify-between text-[#667085]">
                      <span>Closing Inventory Valuation:</span>
                      <span className="font-semibold text-[#172033]">₹ 3,07,500</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-[#E5EAF1] text-sm font-semibold text-emerald-700">
                      <span>Total Working Capital:</span>
                      <span>₹ 4,30,000</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: POS BILLING */}
          {activeTab === 5 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF1]">
                <div>
                  <h4 className="text-sm font-semibold text-[#172033]">Fast POS Counter Billing</h4>
                  <span className="text-xs text-[#667085]">Instant barcode pairing, thermal receipt generation and split cash/UPI</span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#EFF6FF] text-[#2563EB] border border-[#2563EB]/30">
                  Barcode Scanner Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 text-xs">
                {/* Left: Quick Bill Cart */}
                <div className="sm:col-span-8 p-4 rounded-xl bg-white border border-[#E5EAF1] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E5EAF1]">
                    <span className="font-semibold text-[#172033]">Current Counter Order #214</span>
                    <span className="text-[#667085]">Walk-in Retail Customer</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-1 border-b border-[#E5EAF1]/60">
                      <div>
                        <span className="font-semibold text-[#172033]">Surf Excel Matic Top Load 2kg</span>
                        <span className="text-[10px] text-[#667085] block">Barcode: 8901030726194 • 1 pcs</span>
                      </div>
                      <span className="font-semibold text-[#172033] tabular-nums">₹ 420.00</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-[#E5EAF1]/60">
                      <div>
                        <span className="font-semibold text-[#172033]">Aashirvaad Shudh Chakki Atta 10kg</span>
                        <span className="text-[10px] text-[#667085] block">Barcode: 8901725131498 • 1 sack</span>
                      </div>
                      <span className="font-semibold text-[#172033] tabular-nums">₹ 480.00</span>
                    </div>
                  </div>
                </div>

                {/* Right: Payment Tender Box */}
                <div className="sm:col-span-4 p-4 rounded-xl bg-[#172033] text-white flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block uppercase">Total Payable</span>
                    <span className="text-2xl font-semibold text-white tabular-nums mt-1 block">₹ 900.00</span>
                    <div className="mt-3 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-300">
                        <span>Items:</span>
                        <span>2 items (2 pcs)</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Tax included:</span>
                        <span>₹ 58.50</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-700/80">
                    <button
                      type="button"
                      className="w-full h-10 rounded-xl bg-[#2563EB] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Thermal Receipt</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
