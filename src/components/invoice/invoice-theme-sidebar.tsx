"use client";

import React, { useState } from "react";
import {
  InvoiceCustomization,
  InvoiceThemeId,
  INVOICE_THEMES,
  COLOR_PALETTE_SWATCHES,
  InvoiceFontFamily,
  InvoiceHeaderLayout,
  saveInvoiceCustomization,
  DEFAULT_INVOICE_CUSTOMIZATION,
  getActiveThemePreset,
} from "@/lib/invoice-theme";

interface InvoiceThemeSidebarProps {
  customization: InvoiceCustomization;
  onChange: (updated: InvoiceCustomization) => void;
  lang: string;
  onOpenPreview: () => void;
}

export function InvoiceThemeSidebar({
  customization,
  onChange,
  lang,
  onOpenPreview,
}: InvoiceThemeSidebarProps) {
  const [activeTab, setActiveTab] = useState<"themes" | "customize">("themes");

  const currentPreset = getActiveThemePreset(customization);
  const activeColor = customization.customPrimaryColor || currentPreset.primaryColor;

  const handleSelectTheme = (themeId: InvoiceThemeId) => {
    const preset = INVOICE_THEMES[themeId];
    const updated: InvoiceCustomization = {
      ...customization,
      themeId,
      customPrimaryColor: undefined, // Reset custom color when switching preset
      headerLayout: preset.headerLayout,
      fontFamily: preset.fontFamily,
    };
    onChange(updated);
    saveInvoiceCustomization(updated);
  };

  const handleUpdate = (patch: Partial<InvoiceCustomization>) => {
    const updated = {
      ...customization,
      ...patch,
    };
    onChange(updated);
    saveInvoiceCustomization(updated);
  };

  const handleResetToDefault = () => {
    const preset = INVOICE_THEMES[customization.themeId];
    const updated: InvoiceCustomization = {
      ...DEFAULT_INVOICE_CUSTOMIZATION,
      themeId: customization.themeId,
      headerLayout: preset.headerLayout,
      fontFamily: preset.fontFamily,
      customPrimaryColor: undefined,
    };
    onChange(updated);
    saveInvoiceCustomization(updated);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden flex flex-col h-fit sticky top-4">
      {/* 1. Header with Saffron Pill */}
      <div className="p-4 border-b border-[#E5E7EB] bg-[#FAFBFD] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <h2 className="text-xs font-bold text-[#202124] uppercase tracking-wider">
              {lang === "gu" ? "બિલ થીમ અને ડિઝાઇન" : "Invoice Theme & Style"}
            </h2>
            <p className="text-[11px] text-[#667085]">
              {lang === "gu" ? "૫ થીમ્સ અથવા કસ્ટમ કલર" : "5 GST themes & custom studio"}
            </p>
          </div>
        </div>

        {/* Live Preview Button */}
        <button
          type="button"
          onClick={onOpenPreview}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF3E8] hover:bg-[#FFE6D0] text-[#F47721] border border-[#F47721]/30 text-xs font-bold rounded-lg transition-all shadow-xs"
          title={lang === "gu" ? "લાઇવ બિલ પ્રિવ્યૂ જુઓ" : "Open Live Preview"}
        >
          <span>👁️</span>
          <span>{lang === "gu" ? "પ્રિવ્યૂ" : "Preview"}</span>
        </button>
      </div>

      {/* 2. Segmented Mode Tabs */}
      <div className="p-3 border-b border-[#E5E7EB] bg-[#F8F9FB] flex gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab("themes")}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "themes"
              ? "bg-white text-[#202124] shadow-xs border border-[#E5E7EB]"
              : "text-[#667085] hover:text-[#202124]"
          }`}
        >
          <span>🎨</span>
          <span>{lang === "gu" ? "૫ થીમ્સ (Themes)" : "5 Themes"}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("customize")}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "customize"
              ? "bg-white text-[#F47721] shadow-xs border border-[#E5E7EB]"
              : "text-[#667085] hover:text-[#202124]"
          }`}
        >
          <span>⚙️</span>
          <span>{lang === "gu" ? "કસ્ટમાઇઝ (Customise)" : "Customise"}</span>
        </button>
      </div>

      {/* 3. Content Area */}
      <div className="p-4 space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto">
        {/* ================= TAB 1: 5 PRESET THEMES ================= */}
        {activeTab === "themes" && (
          <div className="space-y-3">
            <p className="text-[11px] text-[#667085]">
              {lang === "gu"
                ? "તમારા વ્યવસાયને અનુરૂપ થીમ પસંદ કરો. આ થીમ પ્રિન્ટ અને પીડીએફ બંનેમાં લાગુ થશે:"
                : "Select an authoritative GST template. Applied live to PDF and printer output:"}
            </p>

            <div className="space-y-2.5">
              {(Object.keys(INVOICE_THEMES) as InvoiceThemeId[]).map((themeKey) => {
                const item = INVOICE_THEMES[themeKey];
                const isSelected = customization.themeId === themeKey && !customization.customPrimaryColor;

                return (
                  <div
                    key={themeKey}
                    onClick={() => handleSelectTheme(themeKey)}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer relative flex items-start gap-3 ${
                      isSelected
                        ? "border-[#F47721] bg-[#FFF8F3] shadow-xs"
                        : "border-[#E5E7EB] hover:border-slate-300 bg-white"
                    }`}
                  >
                    {/* Realistic Mini Invoice Thumbnail */}
                    <div className="w-14 h-18 bg-white border border-slate-300 rounded shadow-xs overflow-hidden shrink-0 flex flex-col justify-between p-1">
                      {/* Top colored band */}
                      <div
                        className="h-3 rounded-xs w-full flex items-center px-1"
                        style={{ backgroundColor: item.primaryColor }}
                      >
                        <div className="w-3 h-0.5 bg-white/70 rounded-xs" />
                      </div>
                      {/* Middle mock lines */}
                      <div className="space-y-1 my-1">
                        <div className="w-3/4 h-1 bg-slate-200 rounded-xs" />
                        <div className="w-full h-1 bg-slate-100 rounded-xs" />
                        <div className="w-5/6 h-1 bg-slate-100 rounded-xs" />
                      </div>
                      {/* Bottom mini total band */}
                      <div className="flex justify-between items-center pt-0.5 border-t border-slate-200">
                        <div className="w-3 h-1 bg-slate-200 rounded-xs" />
                        <div
                          className="w-4 h-1 rounded-xs"
                          style={{ backgroundColor: item.primaryColor }}
                        />
                      </div>
                    </div>

                    {/* Theme Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-[#202124] truncate">
                          {lang === "gu" ? item.nameGujarati : item.name}
                        </h4>
                        {isSelected && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 bg-[#F47721] text-white rounded-md shrink-0">
                            ✓ {lang === "gu" ? "પસંદ કરેલ" : "Active"}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#667085] mt-0.5 line-clamp-2">
                        {lang === "gu" ? item.taglineGujarati : item.tagline}
                      </p>

                      {/* Swatch indicator */}
                      <div className="flex items-center gap-1.5 mt-2">
                        <span
                          className="w-3 h-3 rounded-full border border-black/10 inline-block"
                          style={{ backgroundColor: item.primaryColor }}
                        />
                        <span className="text-[10px] font-mono text-[#667085]">
                          {item.primaryColor}
                        </span>
                        <span className="text-[10px] text-slate-300">•</span>
                        <span className="text-[10px] text-[#667085] capitalize">
                          {item.headerLayout} header
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= TAB 2: CUSTOMISE THEME ================= */}
        {activeTab === "customize" && (
          <div className="space-y-4">
            {/* 1. Color Customization */}
            <div>
              <label className="block text-xs font-bold text-[#202124] uppercase mb-2">
                {lang === "gu" ? "૧. મુખ્ય રંગ પસંદ કરો (Primary Color)" : "1. Accent Brand Color"}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_PALETTE_SWATCHES.map((swatch) => {
                  const isActive = activeColor.toLowerCase() === swatch.hex.toLowerCase();
                  return (
                    <button
                      key={swatch.hex}
                      type="button"
                      onClick={() => handleUpdate({ customPrimaryColor: swatch.hex })}
                      className={`p-1.5 rounded-lg border text-center transition-all flex flex-col items-center gap-1 ${
                        isActive
                          ? "border-[#202124] bg-slate-50 ring-1 ring-[#202124]"
                          : "border-[#E5E7EB] hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded-full border border-black/10 inline-block shadow-xs"
                        style={{ backgroundColor: swatch.hex }}
                      />
                      <span className="text-[10px] font-semibold text-[#202124] truncate w-full text-center">
                        {swatch.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Hex Color Picker */}
              <div className="mt-2.5 flex items-center gap-2 p-2 rounded-lg bg-[#F8F9FB] border border-[#E5E7EB]">
                <input
                  type="color"
                  value={activeColor}
                  onChange={(e) => handleUpdate({ customPrimaryColor: e.target.value })}
                  className="w-7 h-7 rounded border border-slate-300 cursor-pointer p-0 bg-transparent"
                />
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-[#667085] uppercase block">
                    {lang === "gu" ? "કસ્ટમ કલર કોડ" : "Custom Hex Color"}
                  </span>
                  <input
                    type="text"
                    value={activeColor}
                    onChange={(e) => handleUpdate({ customPrimaryColor: e.target.value })}
                    className="font-mono text-xs font-bold text-[#202124] bg-transparent outline-none uppercase w-full"
                  />
                </div>
              </div>
            </div>

            {/* 2. Header Layout Selection */}
            <div>
              <label className="block text-xs font-bold text-[#202124] uppercase mb-2">
                {lang === "gu" ? "૨. હેડર શૈલી (Header Layout)" : "2. Header Layout Style"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "banner", label: "Banner (બેનર)", icon: "🏷️" },
                  { id: "split", label: "Split (સ્પ્લિટ)", icon: "⚖️" },
                  { id: "boxed", label: "Boxed (બોક્સ્ડ)", icon: "📦" },
                  { id: "minimal", label: "Minimal (મિનિમલ)", icon: "📄" },
                ].map((hl) => (
                  <button
                    key={hl.id}
                    type="button"
                    onClick={() => handleUpdate({ headerLayout: hl.id as InvoiceHeaderLayout })}
                    className={`p-2 rounded-lg border text-left text-xs font-bold transition-all flex items-center gap-2 ${
                      customization.headerLayout === hl.id
                        ? "border-[#F47721] bg-[#FFF8F3] text-[#F47721]"
                        : "border-[#E5E7EB] hover:bg-slate-50 text-[#202124]"
                    }`}
                  >
                    <span>{hl.icon}</span>
                    <span className="truncate">{hl.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Typography / Font Family */}
            <div>
              <label className="block text-xs font-bold text-[#202124] uppercase mb-2">
                {lang === "gu" ? "૩. ફોન્ટ શૈલી (Typography)" : "3. Invoice Typography"}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "font-sans", label: "Modern Sans" },
                  { id: "font-serif", label: "Formal Serif" },
                  { id: "font-mono", label: "Clean Mono" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleUpdate({ fontFamily: f.id as InvoiceFontFamily })}
                    className={`py-1.5 px-2 rounded-lg border text-center text-[11px] font-bold transition-all truncate ${
                      customization.fontFamily === f.id
                        ? "border-[#F47721] bg-[#FFF8F3] text-[#F47721]"
                        : "border-[#E5E7EB] hover:bg-slate-50 text-[#667085]"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Display Toggles (Show / Hide elements) */}
            <div>
              <label className="block text-xs font-bold text-[#202124] uppercase mb-2">
                {lang === "gu" ? "૪. બિલ પર શું દર્શાવવું (Display Options)" : "4. Optional Bill Elements"}
              </label>
              <div className="space-y-2 bg-[#F8F9FB] p-3 rounded-xl border border-[#E5E7EB]">
                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <span className="text-[#202124] font-medium flex items-center gap-1.5">
                    <span>⚡</span> {lang === "gu" ? "UPI QR કોડ (Pay via UPI)" : "UPI Payment QR Code"}
                  </span>
                  <input
                    type="checkbox"
                    checked={customization.showUpiQr}
                    onChange={(e) => handleUpdate({ showUpiQr: e.target.checked })}
                    className="w-4 h-4 rounded text-[#F47721] focus:ring-[#F47721] cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <span className="text-[#202124] font-medium flex items-center gap-1.5">
                    <span>🏦</span> {lang === "gu" ? "બેંક વિગતો (Bank Details)" : "Bank Transfer Details"}
                  </span>
                  <input
                    type="checkbox"
                    checked={customization.showBankDetails}
                    onChange={(e) => handleUpdate({ showBankDetails: e.target.checked })}
                    className="w-4 h-4 rounded text-[#F47721] focus:ring-[#F47721] cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <span className="text-[#202124] font-medium flex items-center gap-1.5">
                    <span>✍️</span> {lang === "gu" ? "સહી / સિક્કો બોક્સ (Signatory Stamp)" : "Authorized Signatory Box"}
                  </span>
                  <input
                    type="checkbox"
                    checked={customization.showSignature}
                    onChange={(e) => handleUpdate({ showSignature: e.target.checked })}
                    className="w-4 h-4 rounded text-[#F47721] focus:ring-[#F47721] cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <span className="text-[#202124] font-medium flex items-center gap-1.5">
                    <span>🏷️</span> {lang === "gu" ? "HSN કોડ કોલમ (HSN Column)" : "HSN/SAC Code Column"}
                  </span>
                  <input
                    type="checkbox"
                    checked={customization.showHsn}
                    onChange={(e) => handleUpdate({ showHsn: e.target.checked })}
                    className="w-4 h-4 rounded text-[#F47721] focus:ring-[#F47721] cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <span className="text-[#202124] font-medium flex items-center gap-1.5">
                    <span>💰</span> {lang === "gu" ? "વટાવ કોલમ (Discount %)" : "Discount % Column"}
                  </span>
                  <input
                    type="checkbox"
                    checked={customization.showDiscount}
                    onChange={(e) => handleUpdate({ showDiscount: e.target.checked })}
                    className="w-4 h-4 rounded text-[#F47721] focus:ring-[#F47721] cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* 5. Watermark and Tagline */}
            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-bold text-[#667085] uppercase mb-1">
                  {lang === "gu" ? "વોટરમાર્ક લખાણ (Watermark Text)" : "Watermark Text"}
                </label>
                <input
                  type="text"
                  value={customization.watermarkText}
                  onChange={(e) => handleUpdate({ watermarkText: e.target.value })}
                  placeholder="TAX INVOICE / ORIGINAL"
                  className="w-full text-xs p-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg font-mono text-[#202124] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#667085] uppercase mb-1">
                  {lang === "gu" ? "ટેગલાઇન (Company Tagline)" : "Company Tagline"}
                </label>
                <input
                  type="text"
                  value={customization.companyTagline}
                  onChange={(e) => handleUpdate({ companyTagline: e.target.value })}
                  placeholder="Quality & Trust Guaranteed"
                  className="w-full text-xs p-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg text-[#202124] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Reset Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleResetToDefault}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-[#667085] hover:text-[#202124] text-xs font-semibold rounded-lg transition-colors"
              >
                ↺ {lang === "gu" ? "મૂળભૂત સેટિંગ્સ ફરી લાવો" : "Reset Customizations"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Bottom Footer Info & Action */}
      <div className="p-3 bg-[#FAFBFD] border-t border-[#E5E7EB] flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 text-[#667085]">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ backgroundColor: activeColor }}
          />
          <span className="font-semibold">{currentPreset.name}</span>
        </div>

        <button
          type="button"
          onClick={onOpenPreview}
          className="text-xs font-bold text-[#F47721] hover:underline flex items-center gap-1"
        >
          <span>{lang === "gu" ? "પ્રિવ્યૂ જુઓ →" : "View Preview →"}</span>
        </button>
      </div>
    </div>
  );
}
