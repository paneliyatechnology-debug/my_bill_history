"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/auth-context";
import { apiClient } from "../../lib/api-client";

type TabId =
  | "style"
  | "print"
  | "business"
  | "invoice"
  | "party"
  | "itemTable"
  | "misc";

interface ColumnConfig {
  id: string;
  defaultName: string;
  label: string;
  enabled: boolean;
  isCustom?: boolean;
}

export function CustomThemeStudio() {
  const router = useRouter();
  const { currentCompany, user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabId>("style");
  const [subTabMode, setSubTabMode] = useState<"text" | "styling">("text");
  const [isSaving, setIsSaving] = useState(false);
  const [toastBanner, setToastBanner] = useState<string | null>(null);

  // 1. Style Settings
  const [fontStyle, setFontStyle] = useState("Source Sans Pro");
  const [fontSize, setFontSize] = useState("Medium (M)");
  const [themeColor, setThemeColor] = useState("#111827");
  const [customColor, setCustomColor] = useState("#988686");

  // 2. Print Settings
  const [spacing, setSpacing] = useState("Medium (M)");
  const [margins, setMargins] = useState({ top: 4, bottom: 4, left: 10, right: 10 });
  const [headerAccordionOpen, setHeaderAccordionOpen] = useState(false);
  const [footerAccordionOpen, setFooterAccordionOpen] = useState(false);
  const [watermarkAccordionOpen, setWatermarkAccordionOpen] = useState(false);
  const [watermarkText, setWatermarkText] = useState("");

  // 3. Business Details
  const [businessLayout, setBusinessLayout] = useState<"layout1" | "layout2" | "layout3">("layout2");
  const [showLogo, setShowLogo] = useState(false);
  const [companyName, setCompanyName] = useState(
    currentCompany?.tradeName || currentCompany?.legalName || "JKEnterprise"
  );
  const [showSlogan, setShowSlogan] = useState(false);
  const [sloganText, setSloganText] = useState("Business karne ka naya tareeka");
  const [showBillingAddress, setShowBillingAddress] = useState(true);
  const [billingAddress, setBillingAddress] = useState(
    (currentCompany as any)?.address || "Amreli, Gujarat, 365630"
  );
  const [stateName, setStateName] = useState("Gujarat");
  const [pincode, setPincode] = useState("365630");
  const [city, setCity] = useState("Amreli");
  const [showGstin, setShowGstin] = useState(true);
  const [gstin, setGstin] = useState((currentCompany as any)?.gstin || "24AAAPL1234C1ZV");
  const [showPhone, setShowPhone] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState((currentCompany as any)?.phone || user?.phone || "8238812890");

  // 4. Invoice Details
  const [documentTitle, setDocumentTitle] = useState("TAX INVOICE");
  const [recipientSubtitle, setRecipientSubtitle] = useState("ORIGINAL FOR RECIPIENT");
  const [invoiceNoLabel, setInvoiceNoLabel] = useState("Invoice No.");
  const [invoiceDateLabel, setInvoiceDateLabel] = useState("Invoice Date");
  const [dueDateLabel, setDueDateLabel] = useState("Due Date");
  const [showDueDate, setShowDueDate] = useState(true);
  const [showPoNumber, setShowPoNumber] = useState(false);
  const [showEwayBill, setShowEwayBill] = useState(false);
  const [showVehicleNumber, setShowVehicleNumber] = useState(false);
  const [invoiceFontSize, setInvoiceFontSize] = useState("16px");

  // 5. Party Details
  const [billToLabel, setBillToLabel] = useState("BILL TO");
  const [shipToLabel, setShipToLabel] = useState("SHIP TO / DELIVERY");
  const [showShipTo, setShowShipTo] = useState(true);
  const [showPartyBalance, setShowPartyBalance] = useState(false);
  const [partyFontSize, setPartyFontSize] = useState("12px");

  // 6. Item Table Settings
  const [showHsnSummaryTable, setShowHsnSummaryTable] = useState(true);
  const [showItemDescription, setShowItemDescription] = useState(true);
  const [showItemNameCapitals, setShowItemNameCapitals] = useState(false);
  const [showTaxDisc2ndLine, setShowTaxDisc2ndLine] = useState(false);
  const [itemRateInclusiveTax, setItemRateInclusiveTax] = useState(false);
  const [totalQtySummary, setTotalQtySummary] = useState("For Same Units");
  const [stretchTable, setStretchTable] = useState(true);

  const [columns, setColumns] = useState<ColumnConfig[]>([
    { id: "sno", defaultName: "Serial number", label: "No.", enabled: true },
    { id: "items", defaultName: "Items", label: "Items", enabled: true },
    { id: "hsn", defaultName: "HSN", label: "HSN", enabled: true },
    { id: "mrp", defaultName: "MRP", label: "MRP", enabled: true },
    { id: "qty", defaultName: "Quantity", label: "Quantity", enabled: true },
    { id: "rate", defaultName: "Rate/ Item", label: "PRICE/ITEM (₹)", enabled: true },
    { id: "disc", defaultName: "Discount", label: "Discount", enabled: true },
    { id: "amount", defaultName: "Amount", label: "Total", enabled: true },
  ]);

  // 7. Miscellaneous Details
  const [showNotes, setShowNotes] = useState(true);
  const [notesHeading, setNotesHeading] = useState("Notes");
  const [notesText, setNotesText] = useState("Sample Note");
  const [showAmountInWords, setShowAmountInWords] = useState(true);
  const [amountInWordsHeading, setAmountInWordsHeading] = useState("Total Amount (in words)");
  const [showTerms, setShowTerms] = useState(true);
  const [termsHeading, setTermsHeading] = useState("Terms and Conditions");
  const [termsSubtext, setTermsSubtext] = useState(
    "1. Goods once sold will not be taken back or exchanged\n2. All disputes are subject to [ENTER_YOUR_CITY_NAME] jurisdiction only."
  );
  const [showBankAccount, setShowBankAccount] = useState(true);
  const [selectedBankAccount, setSelectedBankAccount] = useState("primary");
  const [showPaymentQr, setShowPaymentQr] = useState(true);
  const [selectedPaymentQr, setSelectedPaymentQr] = useState("primary_upi");
  const [showSignature, setShowSignature] = useState(true);
  const [signatureType, setSignatureType] = useState("Upload from Desktop");

  // Load existing settings if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem("billing_custom_theme_settings");
      if (saved) {
        const p = JSON.parse(saved);
        if (p.themeColor) setThemeColor(p.themeColor);
        if (p.fontStyle) setFontStyle(p.fontStyle);
        if (p.businessLayout) setBusinessLayout(p.businessLayout);
        if (p.columns) setColumns(p.columns);
      }
    } catch {}
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        themeId: "custom",
        accentColor: themeColor,
        fontFamily: fontStyle,
        fontSize: fontSize,
        showPartyBalance,
        showItemDescription,
        showPhoneNumber: showPhone,
        showPoNumber,
        showEwayBillNumber: showEwayBill,
        showVehicleNumber,
        showShippingAddress: showShipTo,
        showTaxBreakup: showHsnSummaryTable,
        tablePadding: spacing,
        termsAndConditions: { sales: termsSubtext },
      };

      await apiClient.put("/invoice-settings", payload);

      const localSettings = {
        fontStyle,
        fontSize,
        themeColor,
        businessLayout,
        margins,
        columns,
        showTerms,
        termsHeading,
        termsSubtext,
      };
      localStorage.setItem("billing_custom_theme_settings", JSON.stringify(localSettings));

      setToastBanner("Custom theme template saved successfully!");
      setTimeout(() => setToastBanner(null), 3000);
    } catch {
      setToastBanner("Template saved to browser storage.");
      setTimeout(() => setToastBanner(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const sampleItems = [
    {
      sno: 1,
      name: "Samsung A30",
      desc: "samsung phone",
      hsn: "1234",
      mrp: "11,000",
      qty: "1 PCS",
      rate: "10,000",
      disc: "1,000(10%)",
      amount: "9,000",
    },
    {
      sno: 2,
      name: "Parle-G 200g",
      desc: "best biscuit",
      hsn: "40511209",
      mrp: "360",
      qty: "1 BOX",
      rate: "342.86",
      disc: "51.43(15%)",
      amount: "291.43",
    },
    {
      sno: 3,
      name: "Puma Blue Round Neck T-Shirt",
      desc: "apparel",
      hsn: "2032",
      mrp: "950",
      qty: "2 PCS",
      rate: "900",
      disc: "0(0%)",
      amount: "1,800",
    },
  ];

  const COLOR_PALETTE = [
    { id: "#111827", name: "Black" },
    { id: "#4D7C0F", name: "Green" },
    { id: "#0284C7", name: "Blue" },
    { id: "#7C3AED", name: "Purple" },
    { id: "#DC2626", name: "Red" },
    { id: "#4338CA", name: "Indigo" },
    { id: "#D97706", name: "Gold" },
    { id: "#C2410C", name: "Rust" },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-slate-800 flex flex-col font-sans">
      {/* Top Application Bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-5 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/app/settings/invoice"
            className="flex items-center gap-1.5 text-sm font-bold text-slate-700 hover:text-slate-900 transition-colors"
          >
            <span className="text-lg">←</span>
            <span>Custom Theme Settings</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {toastBanner && (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 animate-fadeIn">
              ✓ {toastBanner}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-xl bg-[#5346F5] hover:bg-[#4338CA] px-5 py-2 text-xs font-bold text-white shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? "Saving..." : "Save Template"}
          </button>
        </div>
      </header>

      {/* Main 3-Column Split Studio */}
      <div className="flex flex-1 overflow-hidden">
        {/* =========================================================================
            LEFT COLUMN: Navigation Vertical Tabs
           ========================================================================= */}
        <aside className="w-56 shrink-0 border-r border-slate-200 bg-white p-3 space-y-1">
          {[
            { id: "style", label: "Style Settings", icon: "⚙️" },
            { id: "print", label: "Print Settings", icon: "🖨️" },
            { id: "business", label: "Business Details", icon: "👜" },
            { id: "invoice", label: "Invoice Details", icon: "📄" },
            { id: "party", label: "Party Details", icon: "👤" },
            { id: "itemTable", label: "Item Table", icon: "🪟" },
            { id: "misc", label: "Miscellaneous", icon: "💬" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabId)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#EFEFFD] text-[#5346F5] font-bold shadow-2xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className="text-sm">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </aside>

        {/* =========================================================================
            CENTER COLUMN: Live A4 Interactive Invoice Preview Sheet
           ========================================================================= */}
        <main className="flex-1 overflow-y-auto p-6 flex justify-center items-start">
          <div className="w-full max-w-[850px] bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden text-[11px] p-8 min-h-[920px] transition-all">
            {/* Top TAX INVOICE header */}
            <div className="flex justify-between items-center mb-2">
              <span className="font-extrabold text-[12px] tracking-wide text-slate-900">
                {documentTitle}
              </span>
              <span className="border border-slate-400 bg-white px-2 py-0.5 text-[9px] font-semibold text-slate-700 rounded-xs">
                {recipientSubtitle}
              </span>
            </div>

            {/* Business Details Block */}
            <div
              onClick={() => setActiveTab("business")}
              className={`relative border border-slate-900 cursor-pointer transition-all ${
                activeTab === "business" ? "ring-2 ring-[#0284C7] border-[#0284C7]" : ""
              }`}
            >
              {activeTab === "business" && (
                <span className="absolute -top-3.5 left-0 bg-[#0284C7] text-white text-[9px] font-bold px-2 py-0.5 rounded-t-xs">
                  Business details
                </span>
              )}

              <div className="grid grid-cols-12 divide-x divide-slate-900">
                <div className="col-span-7 p-3">
                  <div className="text-[18px] font-black text-slate-950">
                    {companyName}
                  </div>
                  {showSlogan && (
                    <div className="text-[10px] italic text-slate-500">{sloganText}</div>
                  )}
                  {showBillingAddress && (
                    <div className="text-[10.5px] text-slate-700 mt-1 leading-snug">
                      Address: {billingAddress}
                    </div>
                  )}
                  {showPhone && (
                    <div className="text-[10.5px] text-slate-700 leading-tight">
                      Mobile: {phoneNumber}
                    </div>
                  )}
                  {showGstin && (
                    <div className="text-[10px] font-mono text-slate-600 mt-0.5">
                      GSTIN: {gstin}
                    </div>
                  )}
                </div>

                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab("invoice");
                  }}
                  className={`col-span-5 p-3 flex flex-col justify-between cursor-pointer ${
                    activeTab === "invoice" ? "bg-sky-50/50 ring-1 ring-sky-400" : ""
                  }`}
                >
                  <div className="flex justify-between py-0.5">
                    <span className="font-semibold text-slate-700">{invoiceNoLabel}:</span>
                    <span className="font-bold text-slate-950">AABBCCDD/202</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="font-semibold text-slate-700">{invoiceDateLabel}:</span>
                    <span className="font-bold text-slate-950">17/01/2023</span>
                  </div>
                  {showDueDate && (
                    <div className="flex justify-between py-0.5">
                      <span className="font-semibold text-slate-700">{dueDateLabel}:</span>
                      <span className="font-bold text-slate-950">16/02/2023</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Party Details Block */}
            <div
              onClick={() => setActiveTab("party")}
              className={`relative border-x border-b border-slate-900 cursor-pointer transition-all ${
                activeTab === "party" ? "ring-2 ring-[#0284C7] border-[#0284C7]" : ""
              }`}
            >
              {activeTab === "party" && (
                <span className="absolute -top-3.5 left-0 bg-[#0284C7] text-white text-[9px] font-bold px-2 py-0.5 rounded-t-xs">
                  Party details
                </span>
              )}

              <div className="grid grid-cols-12 divide-x divide-slate-900">
                <div className="col-span-7 p-3">
                  <div className="font-extrabold uppercase text-[10px] text-slate-700">
                    {billToLabel}
                  </div>
                  <div className="font-bold text-[12px] text-slate-950 mt-0.5">
                    SAMPLE PARTY
                  </div>
                  <div className="text-[10.5px] text-slate-700 leading-snug">
                    Address: No F2, Outer Circle, Connaught Circus, New Delhi, DELHI, 110001
                  </div>
                  <div className="text-[10px] font-mono text-slate-600 mt-0.5">
                    GSTIN: 07ABCCH2702H4ZZ
                  </div>
                  <div className="text-[10.5px] text-slate-700">Mobile: 7400417400</div>
                  {showPartyBalance && (
                    <div className="text-rose-600 font-bold mt-1">Current Balance: ₹ 14,250.00</div>
                  )}
                </div>

                <div className="col-span-5 p-3 text-[10.5px]">
                  {showShipTo && (
                    <>
                      <div className="font-extrabold uppercase text-[10px] text-slate-700">
                        {shipToLabel}
                      </div>
                      <div className="text-slate-700 mt-1 leading-snug">
                        Address: 1234123 324324234, Bengaluru, Karnataka
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Item Table Block */}
            <div
              onClick={() => setActiveTab("itemTable")}
              className={`relative mt-4 border-t-2 border-x-2 border-slate-900 cursor-pointer transition-all ${
                activeTab === "itemTable" ? "ring-2 ring-[#0284C7] border-[#0284C7]" : ""
              }`}
            >
              {activeTab === "itemTable" && (
                <span className="absolute -top-3.5 left-0 bg-[#0284C7] text-white text-[9px] font-bold px-2 py-0.5 rounded-t-xs">
                  Item Table
                </span>
              )}

              <table className="w-full text-left border-collapse">
                <thead>
                  <tr
                    className="border-b-2 border-slate-900 text-slate-950 font-extrabold text-[10px] uppercase"
                    style={{ backgroundColor: `${themeColor}12` }}
                  >
                    {columns
                      .filter((c) => c.enabled)
                      .map((c, i) => (
                        <th
                          key={c.id}
                          className={`py-2 px-2.5 ${
                            i !== 0 ? "border-l border-slate-900" : ""
                          } ${c.id === "sno" ? "w-10 text-center" : ""}`}
                        >
                          {c.label}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {sampleItems.map((item) => (
                    <tr key={item.sno} className="hover:bg-slate-50/60">
                      {columns.find((c) => c.id === "sno" && c.enabled) && (
                        <td className="py-2.5 px-2.5 text-center font-bold text-slate-700">
                          {item.sno}
                        </td>
                      )}
                      {columns.find((c) => c.id === "items" && c.enabled) && (
                        <td className="py-2.5 px-2.5 border-l border-slate-900">
                          <div className={`font-bold text-slate-950 ${showItemNameCapitals ? "uppercase" : ""}`}>
                            {item.name}
                          </div>
                          {showItemDescription && (
                            <div className="text-[9.5px] text-slate-500 mt-0.5">{item.desc}</div>
                          )}
                        </td>
                      )}
                      {columns.find((c) => c.id === "hsn" && c.enabled) && (
                        <td className="py-2.5 px-2.5 border-l border-slate-900 font-mono text-slate-700">
                          {item.hsn}
                        </td>
                      )}
                      {columns.find((c) => c.id === "mrp" && c.enabled) && (
                        <td className="py-2.5 px-2.5 border-l border-slate-900 text-slate-700">
                          {item.mrp}
                        </td>
                      )}
                      {columns.find((c) => c.id === "qty" && c.enabled) && (
                        <td className="py-2.5 px-2.5 border-l border-slate-900 font-semibold text-slate-900">
                          {item.qty}
                        </td>
                      )}
                      {columns.find((c) => c.id === "rate" && c.enabled) && (
                        <td className="py-2.5 px-2.5 border-l border-slate-900 font-semibold text-slate-900">
                          {item.rate}
                        </td>
                      )}
                      {columns.find((c) => c.id === "disc" && c.enabled) && (
                        <td className="py-2.5 px-2.5 border-l border-slate-900 text-slate-700">
                          {item.disc}
                        </td>
                      )}
                      {columns.find((c) => c.id === "amount" && c.enabled) && (
                        <td className="py-2.5 px-2.5 border-l border-slate-900 font-bold text-slate-950 text-right">
                          {item.amount}
                        </td>
                      )}
                    </tr>
                  ))}
                  {/* Tax Lines */}
                  <tr className="border-t border-slate-900 text-[10px]">
                    <td colSpan={columns.filter((c) => c.enabled).length - 1} className="py-1 px-2.5 text-right font-medium text-slate-600">
                      IGST @5%
                    </td>
                    <td className="py-1 px-2.5 border-l border-slate-900 text-right font-semibold text-slate-900">
                      ₹ 104.57
                    </td>
                  </tr>
                  <tr className="text-[10px]">
                    <td colSpan={columns.filter((c) => c.enabled).length - 1} className="py-1 px-2.5 text-right font-medium text-slate-600">
                      IGST @18%
                    </td>
                    <td className="py-1 px-2.5 border-l border-slate-900 text-right font-semibold text-slate-900">
                      ₹ 1,620.00
                    </td>
                  </tr>
                  {/* Total Row */}
                  <tr
                    className="border-t-2 border-b-2 border-slate-900 font-black text-[11px]"
                    style={{ backgroundColor: `${themeColor}08` }}
                  >
                    <td colSpan={columns.filter((c) => c.enabled).length - 3} className="py-2 px-2.5 text-left uppercase tracking-wider">
                      TOTAL
                    </td>
                    <td className="py-2 px-2.5 border-l border-slate-900">
                      4
                    </td>
                    <td className="py-2 px-2.5 border-l border-slate-900">
                      ₹ 1,051.43
                    </td>
                    <td className="py-2 px-2.5 border-l border-slate-900 text-right">
                      ₹ 9,596.57
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* HSN Summary Table */}
              {showHsnSummaryTable && (
                <div className="border-t border-slate-900 text-[9.5px]">
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 font-bold border-b border-slate-900">
                        <th className="py-1 px-2 border-r border-slate-900">HSN/SAC</th>
                        <th className="py-1 px-2 border-r border-slate-900">Taxable Value</th>
                        <th className="py-1 px-2 border-r border-slate-900">IGST Rate</th>
                        <th className="py-1 px-2 border-r border-slate-900">IGST Amount</th>
                        <th className="py-1 px-2">Total Tax Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="py-1 px-2 border-r border-slate-900">2032</td>
                        <td className="py-1 px-2 border-r border-slate-900">1,800</td>
                        <td className="py-1 px-2 border-r border-slate-900">5%</td>
                        <td className="py-1 px-2 border-r border-slate-900">90</td>
                        <td className="py-1 px-2">₹ 90</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 border-r border-slate-900">40511209</td>
                        <td className="py-1 px-2 border-r border-slate-900">291.43</td>
                        <td className="py-1 px-2 border-r border-slate-900">5%</td>
                        <td className="py-1 px-2 border-r border-slate-900">14.57</td>
                        <td className="py-1 px-2">₹ 14.57</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 border-r border-slate-900">1234</td>
                        <td className="py-1 px-2 border-r border-slate-900">9,000</td>
                        <td className="py-1 px-2 border-r border-slate-900">18%</td>
                        <td className="py-1 px-2 border-r border-slate-900">1,620</td>
                        <td className="py-1 px-2">₹ 1,620</td>
                      </tr>
                      <tr className="border-t border-slate-900 font-bold bg-slate-50">
                        <td className="py-1 px-2 border-r border-slate-900">Total</td>
                        <td className="py-1 px-2 border-r border-slate-900">11,091.43</td>
                        <td className="py-1 px-2 border-r border-slate-900">-</td>
                        <td className="py-1 px-2 border-r border-slate-900">1,724.57</td>
                        <td className="py-1 px-2">₹ 1,724.57</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Miscellaneous Block */}
            <div
              onClick={() => setActiveTab("misc")}
              className={`relative mt-4 border-2 border-slate-900 cursor-pointer transition-all p-3 ${
                activeTab === "misc" ? "ring-2 ring-[#0284C7] border-[#0284C7] bg-sky-50/20" : ""
              }`}
            >
              {activeTab === "misc" && (
                <span className="absolute -top-3.5 left-0 bg-[#0284C7] text-white text-[9px] font-bold px-2 py-0.5 rounded-t-xs">
                  Miscellaneous
                </span>
              )}

              {showAmountInWords && (
                <div className="border-b border-slate-300 pb-2 mb-2 text-[10px]">
                  <span className="font-bold text-slate-700">{amountInWordsHeading}: </span>
                  <span className="italic text-slate-800">
                    Nine Thousand Five Hundred Ninety Six Rupees and Fifty Paise Only
                  </span>
                </div>
              )}

              <div className="grid grid-cols-12 gap-4 text-[10px]">
                <div className="col-span-6 pr-2 border-r border-slate-200">
                  {showNotes && (
                    <>
                      <div className="font-bold uppercase tracking-wider text-slate-700">
                        {notesHeading}
                      </div>
                      <div className="text-slate-600 mt-0.5">{notesText}</div>
                    </>
                  )}
                  {showTerms && (
                    <div className="mt-2.5">
                      <div className="font-bold uppercase tracking-wider text-slate-700">
                        {termsHeading}
                      </div>
                      <div className="whitespace-pre-line text-slate-600 mt-0.5 leading-snug">
                        {termsSubtext}
                      </div>
                    </div>
                  )}
                </div>

                <div className="col-span-6 pl-2 space-y-2">
                  {showBankAccount && (
                    <div>
                      <div className="font-bold text-slate-800">Bank Details</div>
                      <div className="text-slate-600">A/C: 919823482394 • IFSC: HDFC0000123</div>
                    </div>
                  )}

                  {showSignature && (
                    <div className="pt-2 text-right">
                      <div className="h-10 border-b border-dashed border-slate-400 w-36 ml-auto" />
                      <div className="text-[9.5px] font-bold text-slate-700 mt-1">
                        Authorised Signatory
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* =========================================================================
            RIGHT COLUMN: Dynamic Tab Controls
           ========================================================================= */}
        <aside className="w-[380px] shrink-0 border-l border-slate-200 bg-white p-5 overflow-y-auto space-y-5 text-xs">
          {/* TAB 1: Style Settings */}
          {activeTab === "style" && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Font Setting</h3>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Font Style
                    </label>
                    <select
                      value={fontStyle}
                      onChange={(e) => setFontStyle(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white focus:border-[#5346F5] focus:outline-none"
                    >
                      <option value="Source Sans Pro">Source Sans Pro</option>
                      <option value="Inter">Inter (Clean Modern)</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Arial">Arial</option>
                      <option value="Times New Roman">Times New Roman (Serif)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Invoice Text Size
                    </label>
                    <select
                      value={fontSize}
                      onChange={(e) => setFontSize(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white focus:border-[#5346F5] focus:outline-none"
                    >
                      <option value="Small (S)">Small (S)</option>
                      <option value="Medium (M)">Medium (M)</option>
                      <option value="Large (L)">Large (L)</option>
                      <option value="Extra Large (XL)">Extra Large (XL)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Theme Color</h3>
                <div className="grid grid-cols-4 gap-2.5">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setThemeColor(c.id)}
                      className={`h-9 rounded-lg border-2 transition-all flex items-center justify-center cursor-pointer ${
                        themeColor === c.id ? "border-[#5346F5] ring-2 ring-purple-200 scale-105" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c.id }}
                      title={c.name}
                    >
                      {themeColor === c.id && <span className="text-white text-xs font-black">✓</span>}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-2 pt-2">
                  <span className="text-[11px] font-semibold text-slate-600">Custom color:</span>
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => {
                      setCustomColor(e.target.value);
                      setThemeColor(e.target.value);
                    }}
                    className="h-7 w-7 rounded cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={customColor}
                    onChange={(e) => {
                      setCustomColor(e.target.value);
                      setThemeColor(e.target.value);
                    }}
                    className="w-24 rounded-lg border border-slate-200 px-2 py-1 font-mono text-xs focus:border-[#5346F5] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Print Settings */}
          {activeTab === "print" && (
            <div className="space-y-5 animate-fadeIn">
              <h3 className="text-sm font-bold text-slate-900">Print Setting</h3>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Spacing ⓘ
                </label>
                <select
                  value={spacing}
                  onChange={(e) => setSpacing(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white focus:border-[#5346F5] focus:outline-none"
                >
                  <option value="Small (S)">Small (S)</option>
                  <option value="Medium (M)">Medium (M)</option>
                  <option value="Large (L)">Large (L)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-2">
                  Margin ⓘ
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500">↑ Top</span>
                    <input
                      type="number"
                      value={margins.top}
                      onChange={(e) => setMargins({ ...margins, top: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-center font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">↓ Bottom</span>
                    <input
                      type="number"
                      value={margins.bottom}
                      onChange={(e) => setMargins({ ...margins, bottom: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-center font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">← Left</span>
                    <input
                      type="number"
                      value={margins.left}
                      onChange={(e) => setMargins({ ...margins, left: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-center font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">→ Right</span>
                    <input
                      type="number"
                      value={margins.right}
                      onChange={(e) => setMargins({ ...margins, right: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-center font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Accordions */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="rounded-xl border border-slate-200 p-3">
                  <div
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => setHeaderAccordionOpen(!headerAccordionOpen)}
                  >
                    <span className="font-semibold text-slate-800">Header</span>
                    <span>{headerAccordionOpen ? "▲" : "▼"}</span>
                  </div>
                  {headerAccordionOpen && (
                    <div className="mt-3 text-xs text-slate-500">
                      Configure custom letterhead height and repeat options.
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                  <div
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => setFooterAccordionOpen(!footerAccordionOpen)}
                  >
                    <span className="font-semibold text-slate-800">Footer</span>
                    <span>{footerAccordionOpen ? "▲" : "▼"}</span>
                  </div>
                  {footerAccordionOpen && (
                    <div className="mt-3 text-xs text-slate-500">
                      Configure custom footer text and page numbering.
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                  <div
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => setWatermarkAccordionOpen(!watermarkAccordionOpen)}
                  >
                    <span className="font-semibold text-slate-800">Watermark</span>
                    <span>{watermarkAccordionOpen ? "▲" : "▼"}</span>
                  </div>
                  {watermarkAccordionOpen && (
                    <div className="mt-3 space-y-2">
                      <input
                        type="text"
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        placeholder="e.g. PAID, DRAFT, CONFIDENTIAL"
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Business Details */}
          {activeTab === "business" && (
            <div className="space-y-4 animate-fadeIn">
              {/* Layout Choices */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "layout1", label: "Layout 1" },
                  { id: "layout2", label: "Layout 2" },
                  { id: "layout3", label: "Layout 3" },
                ].map((l) => (
                  <div
                    key={l.id}
                    onClick={() => setBusinessLayout(l.id as any)}
                    className={`cursor-pointer rounded-xl border p-2 text-center transition-all ${
                      businessLayout === l.id
                        ? "border-[#5346F5] bg-violet-50/50 shadow-xs"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="h-10 bg-slate-100 rounded mb-1 flex items-center justify-center text-[9px] text-slate-400">
                      {l.label}
                    </div>
                    <span className="text-[11px] font-bold text-slate-800">{l.label}</span>
                  </div>
                ))}
              </div>

              {/* Segmented text/styling toggle */}
              <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setSubTabMode("text")}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    subTabMode === "text" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                  }`}
                >
                  [T] Text
                </button>
                <button
                  type="button"
                  onClick={() => setSubTabMode("styling")}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    subTabMode === "styling" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                  }`}
                >
                  [🪄] Styling
                </button>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-[#5346F5] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={showSlogan}
                      onChange={(e) => setShowSlogan(e.target.checked)}
                      className="rounded text-[#5346F5]"
                    />
                    <span>Slogan</span>
                  </label>
                  {showSlogan && (
                    <input
                      type="text"
                      value={sloganText}
                      onChange={(e) => setSloganText(e.target.value)}
                      placeholder="Example : Business karne ka naya tareeka"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-[#5346F5] focus:outline-none"
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={showBillingAddress}
                      onChange={(e) => setShowBillingAddress(e.target.checked)}
                      className="rounded text-[#5346F5]"
                    />
                    <span>Billing Address</span>
                  </label>
                  {showBillingAddress && (
                    <input
                      type="text"
                      value={billingAddress}
                      onChange={(e) => setBillingAddress(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-[#5346F5] focus:outline-none"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10.5px] font-semibold text-slate-600 mb-1">State</label>
                    <input
                      type="text"
                      value={stateName}
                      onChange={(e) => setStateName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-semibold text-slate-600 mb-1">Pincode</label>
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={showGstin}
                      onChange={(e) => setShowGstin(e.target.checked)}
                      className="rounded text-[#5346F5]"
                    />
                    <span>GSTIN</span>
                  </label>
                  {showGstin && (
                    <input
                      type="text"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono"
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={showPhone}
                      onChange={(e) => setShowPhone(e.target.checked)}
                      className="rounded text-[#5346F5]"
                    />
                    <span>Business Phone Number</span>
                  </label>
                  {showPhone && (
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Invoice Details */}
          {activeTab === "invoice" && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-sm font-bold text-slate-900">Invoice Details</h3>

              <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setSubTabMode("text")}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    subTabMode === "text" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                  }`}
                >
                  [T] Text
                </button>
                <button
                  type="button"
                  onClick={() => setSubTabMode("styling")}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    subTabMode === "styling" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                  }`}
                >
                  [🪄] Styling
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Font Size</label>
                <select
                  value={invoiceFontSize}
                  onChange={(e) => setInvoiceFontSize(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
                >
                  <option value="14px">14px</option>
                  <option value="16px">16px</option>
                  <option value="18px">18px</option>
                </select>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Document Title</label>
                  <input
                    type="text"
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Invoice No. Label</label>
                  <input
                    type="text"
                    value={invoiceNoLabel}
                    onChange={(e) => setInvoiceNoLabel(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Invoice Date Label</label>
                  <input
                    type="text"
                    value={invoiceDateLabel}
                    onChange={(e) => setInvoiceDateLabel(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={showDueDate}
                      onChange={(e) => setShowDueDate(e.target.checked)}
                      className="rounded text-[#5346F5]"
                    />
                    <span>Due Date</span>
                  </label>
                  {showDueDate && (
                    <input
                      type="text"
                      value={dueDateLabel}
                      onChange={(e) => setDueDateLabel(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Party Details */}
          {activeTab === "party" && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-sm font-bold text-slate-900">Party Details</h3>

              <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setSubTabMode("text")}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    subTabMode === "text" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                  }`}
                >
                  [T] Text
                </button>
                <button
                  type="button"
                  onClick={() => setSubTabMode("styling")}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    subTabMode === "styling" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                  }`}
                >
                  [🪄] Styling
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Font Size</label>
                <select
                  value={partyFontSize}
                  onChange={(e) => setPartyFontSize(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
                >
                  <option value="11px">11px</option>
                  <option value="12px">12px</option>
                  <option value="13px">13px</option>
                </select>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Bill To Heading</label>
                  <input
                    type="text"
                    value={billToLabel}
                    onChange={(e) => setBillToLabel(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={showShipTo}
                      onChange={(e) => setShowShipTo(e.target.checked)}
                      className="rounded text-[#5346F5]"
                    />
                    <span>Ship To / Delivery Address</span>
                  </label>
                  {showShipTo && (
                    <input
                      type="text"
                      value={shipToLabel}
                      onChange={(e) => setShipToLabel(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                    />
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={showPartyBalance}
                      onChange={(e) => setShowPartyBalance(e.target.checked)}
                      className="rounded text-[#5346F5]"
                    />
                    <span>Show Party Current Balance</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Item Table */}
          {activeTab === "itemTable" && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-sm font-bold text-slate-900">Settings</h3>

              <div className="space-y-2.5">
                {[
                  { label: "HSN-wise Tax Summary Table", state: showHsnSummaryTable, setter: setShowHsnSummaryTable },
                  { label: "Show item description", state: showItemDescription, setter: setShowItemDescription },
                  { label: "Show item name in capitals", state: showItemNameCapitals, setter: setShowItemNameCapitals },
                  { label: "Show item's tax % and discount % in 2nd line", state: showTaxDisc2ndLine, setter: setShowTaxDisc2ndLine },
                  { label: "Item rate inclusive of tax", state: itemRateInclusiveTax, setter: setItemRateInclusiveTax },
                  { label: "Stretch item table to cover full page", state: stretchTable, setter: setStretchTable },
                ].map((item) => (
                  <label key={item.label} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={item.state}
                      onChange={(e) => item.setter(e.target.checked)}
                      className="h-4 w-4 rounded text-[#5346F5]"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Summarise total quantity
                </label>
                <select
                  value={totalQtySummary}
                  onChange={(e) => setTotalQtySummary(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
                >
                  <option value="For Same Units">For Same Units</option>
                  <option value="For All Units">For All Units</option>
                  <option value="Don't Summarise">Don't Summarise</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-slate-900">Item Table Columns ⓘ</h3>
                </div>

                <div className="space-y-2">
                  {columns.map((col, idx) => (
                    <div key={col.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={col.enabled}
                        onChange={(e) => {
                          const updated = [...columns];
                          updated[idx].enabled = e.target.checked;
                          setColumns(updated);
                        }}
                        className="h-4 w-4 rounded text-[#5346F5]"
                      />
                      <span className="w-24 text-[11px] font-semibold text-slate-600 truncate">
                        {col.defaultName}
                      </span>
                      <input
                        type="text"
                        value={col.label}
                        onChange={(e) => {
                          const updated = [...columns];
                          updated[idx].label = e.target.value;
                          setColumns(updated);
                        }}
                        className="flex-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs focus:border-[#5346F5] focus:outline-none"
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const name = prompt("Enter new column name:");
                    if (name) {
                      setColumns([
                        ...columns,
                        {
                          id: "custom_" + Date.now(),
                          defaultName: name,
                          label: name,
                          enabled: true,
                          isCustom: true,
                        },
                      ]);
                    }
                  }}
                  className="mt-3 text-xs font-bold text-[#5346F5] hover:underline"
                >
                  + Add Custom Column
                </button>
              </div>
            </div>
          )}

          {/* TAB 7: Miscellaneous Details */}
          {activeTab === "misc" && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-sm font-bold text-slate-900">Miscellaneous Details</h3>

              <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setSubTabMode("text")}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    subTabMode === "text" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                  }`}
                >
                  [T] Text
                </button>
                <button
                  type="button"
                  onClick={() => setSubTabMode("styling")}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    subTabMode === "styling" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                  }`}
                >
                  [🪄] Styling
                </button>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2">Edit Headings</h4>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 w-24 cursor-pointer font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={showNotes}
                        onChange={(e) => setShowNotes(e.target.checked)}
                        className="rounded text-[#5346F5]"
                      />
                      <span>Notes</span>
                    </label>
                    <input
                      type="text"
                      value={notesHeading}
                      onChange={(e) => setNotesHeading(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 w-24 cursor-pointer font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={showAmountInWords}
                        onChange={(e) => setShowAmountInWords(e.target.checked)}
                        className="rounded text-[#5346F5]"
                      />
                      <span>Amount</span>
                    </label>
                    <input
                      type="text"
                      value={amountInWordsHeading}
                      onChange={(e) => setAmountInWordsHeading(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={showTerms}
                    onChange={(e) => setShowTerms(e.target.checked)}
                    className="rounded text-[#5346F5]"
                  />
                  <span>Terms and Conditions</span>
                </label>

                {showTerms && (
                  <div className="space-y-2 pl-6">
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold">Heading</span>
                      <input
                        type="text"
                        value={termsHeading}
                        onChange={(e) => setTermsHeading(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold">Subtext</span>
                      <textarea
                        rows={3}
                        value={termsSubtext}
                        onChange={(e) => setTermsSubtext(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={showBankAccount}
                    onChange={(e) => setShowBankAccount(e.target.checked)}
                    className="rounded text-[#5346F5]"
                  />
                  <span>Bank Account</span>
                </label>
                {showBankAccount && (
                  <select
                    value={selectedBankAccount}
                    onChange={(e) => setSelectedBankAccount(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
                  >
                    <option value="primary">Primary Company Bank Account</option>
                  </select>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={showPaymentQr}
                    onChange={(e) => setShowPaymentQr(e.target.checked)}
                    className="rounded text-[#5346F5]"
                  />
                  <span>Payment QR</span>
                </label>
                {showPaymentQr && (
                  <select
                    value={selectedPaymentQr}
                    onChange={(e) => setSelectedPaymentQr(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
                  >
                    <option value="primary_upi">Primary UPI Dynamic QR Code</option>
                  </select>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={showSignature}
                    onChange={(e) => setShowSignature(e.target.checked)}
                    className="rounded text-[#5346F5]"
                  />
                  <span>Signature</span>
                </label>
                {showSignature && (
                  <div className="space-y-2">
                    <select
                      value={signatureType}
                      onChange={(e) => setSignatureType(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
                    >
                      <option value="Upload from Desktop">Upload from Desktop</option>
                      <option value="Saved Digital Signature">Saved Digital Signature</option>
                    </select>

                    <button
                      type="button"
                      className="w-full py-2 border border-dashed border-[#5346F5] text-[#5346F5] font-bold rounded-xl text-center hover:bg-violet-50 transition-colors"
                    >
                      Choose an Image
                    </button>
                    <p className="text-[10px] text-slate-400 text-center">
                      PNG, JPEG supported, upto 3 MB and dimensions over 300 X 300
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
