"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  InvoiceCustomization,
  getActiveThemePreset,
} from "@/lib/invoice-theme";

interface InvoiceLivePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  customization: InvoiceCustomization;
  lang: string;
  invoiceData: {
    category: string;
    invoiceNumber: string;
    invoiceDate: string;
    paymentMode: string;
    placeOfSupply: string;
    partyName: string;
    partyGstin?: string;
    partyPhone?: string;
    partyAddress?: string;
    companyName: string;
    companyGstin: string;
    companyState: string;
    notes?: string;
    termsAndConditions?: string;
    items: Array<{
      name: string;
      hsnCode: string;
      quantity: number;
      unitPrice: number;
      discountPercent: number;
      taxRate: number;
    }>;
    totalTaxable: number;
    totalCgst: number;
    totalSgst: number;
    totalIgst: number;
    roundOff: number;
    roundedGrandTotal: number;
    isTaxInclusive: boolean;
    isInterState: boolean;
  };
}

export function InvoiceLivePreviewModal({
  isOpen,
  onClose,
  customization,
  lang,
  invoiceData,
}: InvoiceLivePreviewModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll and listen for Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const preset = getActiveThemePreset(customization);
  const primaryColor = customization.customPrimaryColor || preset.primaryColor;

  const formatInr = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const getDocTitle = () => {
    switch (invoiceData.category) {
      case "PROFORMA_INVOICE":
        return lang === "gu" ? "કાચું બિલ / અંદાજપત્ર (ESTIMATE)" : "PROFORMA INVOICE / ESTIMATE";
      case "DELIVERY_CHALLAN":
        return lang === "gu" ? "ડિલિવરી ચલણ (DELIVERY CHALLAN)" : "DELIVERY CHALLAN (RULE 55)";
      case "BILL_OF_SUPPLY":
        return lang === "gu" ? "મુક્તિ બિલ (BILL OF SUPPLY)" : "BILL OF SUPPLY";
      default:
        return lang === "gu" ? "પાકું કર બિલ (TAX INVOICE)" : "GST TAX INVOICE";
    }
  };

  const fontClass =
    customization.fontFamily === "font-serif"
      ? "font-serif"
      : customization.fontFamily === "font-mono"
      ? "font-mono"
      : "font-sans";

  return createPortal(
    <div
      id="invoice-live-preview-modal"
      className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 my-0 animate-fadeIn print:p-0 print:m-0 print:bg-white print:static print:overflow-visible print:block"
    >
      <div className="bg-[#F3F4F6] rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden relative print:max-w-none print:w-full print:max-h-none print:h-auto print:border-none print:shadow-none print:bg-white print:overflow-visible print:p-0 print:m-0 print:rounded-none">
        {/* Top Control Bar */}
        <div className="bg-white px-5 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 sticky top-0 z-30 print:hidden">
          <div className="flex items-center gap-2.5">
            <span
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: primaryColor }}
            />
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>{lang === "gu" ? "લાઇવ બિલ પ્રિવ્યૂ" : "Live Invoice Preview"}</span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  {preset.name}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                {lang === "gu"
                  ? "પસંદ કરેલી થીમ અને કસ્ટમાઇઝેશન મુજબ બિલનું પ્રિન્ટ સ્વરૂપ"
                  : "Preview how this invoice renders with your selected theme & custom layout"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <span>🖨️</span>
              <span>{lang === "gu" ? "પ્રિન્ટ" : "Print"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Scroll Area: Sheet of Paper */}
        <div className="p-4 sm:p-8 overflow-y-auto flex justify-center print:p-0 print:m-0 print:overflow-visible print:block">
          <div
            id="printable-invoice"
            className={`bg-white w-full max-w-[800px] min-h-[900px] p-6 sm:p-10 rounded-xl shadow-lg border border-slate-200 relative ${fontClass} text-slate-800 text-xs printable-invoice print:max-w-none print:w-full print:min-h-0 print:p-0 print:m-0 print:border-none print:shadow-none print:rounded-none`}
          >
            {/* HEADER LAYOUT: Banner */}
            {customization.headerLayout === "banner" && (
              <div
                className="rounded-xl p-3.5 sm:p-6 mb-5 text-white flex justify-between items-start gap-2.5 sm:gap-4 shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <h1 className="text-base sm:text-2xl font-black tracking-tight uppercase leading-tight">
                    {invoiceData.companyName || "Paneliya Technology"}
                  </h1>
                  <p className="text-[10px] sm:text-xs text-white/90 font-mono">
                    GSTIN: {invoiceData.companyGstin || "24AAAAA0000A1Z5"} • State: {invoiceData.companyState || "Gujarat (24)"}
                  </p>
                  {customization.companyTagline && (
                    <p className="text-[10px] sm:text-[11px] text-white/80 italic">
                      {customization.companyTagline}
                    </p>
                  )}
                </div>

                <div className="bg-white p-2 sm:px-4 sm:py-2.5 rounded-xl text-right shrink-0 shadow-md border border-slate-200 min-w-[125px] sm:min-w-[160px]">
                  <span
                    className="block text-xs sm:text-sm font-black uppercase tracking-wider leading-tight"
                    style={{ color: primaryColor }}
                  >
                    {getDocTitle()}
                  </span>
                  <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 block mt-0.5">
                    #{invoiceData.invoiceNumber || "INV-0001"}
                  </span>
                </div>
              </div>
            )}

            {/* HEADER LAYOUT: Split */}
            {customization.headerLayout === "split" && (
              <div
                className="pb-4 mb-5 flex justify-between items-start gap-2.5 sm:gap-4 border-b-2"
                style={{ borderColor: primaryColor }}
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <h1
                    className="text-base sm:text-2xl font-extrabold tracking-tight uppercase leading-tight"
                    style={{ color: primaryColor }}
                  >
                    {invoiceData.companyName || "Paneliya Technology"}
                  </h1>
                  <p className="text-[10px] sm:text-xs text-slate-600 font-mono">
                    GSTIN: <span className="font-bold text-slate-800">{invoiceData.companyGstin || "24AAAAA0000A1Z5"}</span>
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-600 font-mono">
                    Place of Supply: {invoiceData.placeOfSupply || "24 (Gujarat)"}
                  </p>
                  {customization.companyTagline && (
                    <p className="text-[10px] sm:text-[11px] text-slate-500 italic">
                      {customization.companyTagline}
                    </p>
                  )}
                </div>

                <div className="bg-white p-2 sm:px-4 sm:py-2.5 rounded-xl text-right shrink-0 shadow-xs border border-slate-200 min-w-[125px] sm:min-w-[160px]">
                  <h2 className="text-xs sm:text-base font-black uppercase tracking-wider text-slate-900 leading-tight">
                    {getDocTitle()}
                  </h2>
                  <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Original For Recipient
                  </p>
                  <div className="mt-1 text-[10px] sm:text-xs text-slate-600 space-y-0.5 font-mono">
                    <p>
                      Invoice #: <strong className="text-slate-900">{invoiceData.invoiceNumber || "INV-0001"}</strong>
                    </p>
                    <p>
                      Date: <strong className="text-slate-900">{invoiceData.invoiceDate}</strong>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* HEADER LAYOUT: Boxed */}
            {customization.headerLayout === "boxed" && (
              <div
                className="rounded-xl border-2 p-3.5 sm:p-5 mb-5 flex justify-between items-start gap-2.5 sm:gap-4"
                style={{ borderColor: primaryColor, backgroundColor: preset.accentBg }}
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <h1
                    className="text-base sm:text-xl font-black uppercase tracking-tight leading-tight"
                    style={{ color: primaryColor }}
                  >
                    {invoiceData.companyName || "Paneliya Technology"}
                  </h1>
                  <p className="text-[10px] sm:text-xs text-slate-700 font-mono">
                    GSTIN: <strong>{invoiceData.companyGstin || "24AAAAA0000A1Z5"}</strong>
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-600">
                    State: {invoiceData.companyState || "Gujarat (24)"}
                  </p>
                </div>
                <div className="bg-white p-2 sm:px-3 sm:py-2 rounded-lg text-right shrink-0 shadow-xs border border-slate-200 min-w-[125px] sm:min-w-[160px]">
                  <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 leading-tight">
                    {getDocTitle()}
                  </h2>
                  <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Original For Recipient
                  </p>
                  <p className="font-mono text-[10px] sm:text-xs font-bold text-slate-900 mt-1">
                    #{invoiceData.invoiceNumber || "INV-0001"}
                  </p>
                  <p className="text-[9px] sm:text-[11px] text-slate-600 font-mono">
                    Date: {invoiceData.invoiceDate}
                  </p>
                </div>
              </div>
            )}

            {/* HEADER LAYOUT: Minimal */}
            {customization.headerLayout === "minimal" && (
              <div className="pb-4 mb-5 border-b border-slate-300 flex justify-between items-start gap-2.5 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">Tax Document</span>
                  <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 uppercase leading-tight">
                    {invoiceData.companyName || "Paneliya Technology"}
                  </h1>
                  <p className="text-[10px] sm:text-xs text-slate-500 font-mono">
                    GSTIN: {invoiceData.companyGstin || "24AAAAA0000A1Z5"}
                  </p>
                </div>
                <div className="bg-slate-50 p-2 sm:px-3 sm:py-2 rounded-lg text-right shrink-0 font-mono border border-slate-200 min-w-[125px] sm:min-w-[160px]">
                  <span
                    className="text-xs sm:text-sm font-black block"
                    style={{ color: primaryColor }}
                  >
                    #{invoiceData.invoiceNumber || "INV-0001"}
                  </span>
                  <p className="text-[10px] sm:text-[11px] text-slate-500">{invoiceData.invoiceDate}</p>
                </div>
              </div>
            )}

            {/* BILL TO / CUSTOMER INFO SECTION */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 mb-5">
              <div>
                <span
                  className="text-[10px] uppercase font-bold tracking-wider block mb-1"
                  style={{ color: primaryColor }}
                >
                  {lang === "gu" ? "ગ્રાહકની વિગત (Bill To)" : "Billed To (Customer)"}:
                </span>
                <p className="font-bold text-slate-900 text-sm">
                  {invoiceData.partyName || "Cash Customer / Walk-in"}
                </p>
                {invoiceData.partyGstin && (
                  <p className="text-xs text-slate-600 font-mono mt-0.5">
                    GSTIN: <span className="font-semibold text-slate-800">{invoiceData.partyGstin}</span>
                  </p>
                )}
                {invoiceData.partyPhone && (
                  <p className="text-xs text-slate-600 mt-0.5">
                    Phone: {invoiceData.partyPhone}
                  </p>
                )}
              </div>

              <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/60">
                <span
                  className="text-[10px] uppercase font-bold tracking-wider block mb-1"
                  style={{ color: primaryColor }}
                >
                  {lang === "gu" ? "ચુકવણી અને સ્થળ" : "Invoice Terms"}:
                </span>
                <p className="text-xs text-slate-700">
                  Payment Mode: <strong className="uppercase">{invoiceData.paymentMode}</strong>
                </p>
                <p className="text-xs text-slate-700 font-mono">
                  Place of Supply: <strong>{invoiceData.placeOfSupply || "24 (Gujarat)"}</strong>
                </p>
                <p className="text-xs text-slate-600">
                  Supply Type:{" "}
                  <strong className="text-slate-800">
                    {invoiceData.isInterState ? "Inter-State (IGST)" : "Intra-State (CGST + SGST)"}
                  </strong>
                </p>
              </div>
            </div>

            {/* ITEMS TABLE */}
            <div className="rounded-xl overflow-hidden border border-slate-200 mb-5">
              <table className="w-full text-left text-xs border-collapse table-auto">
                <thead>
                  <tr
                    className="border-b text-xs uppercase tracking-wider font-bold"
                    style={{
                      backgroundColor: preset.tableHeaderBg,
                      color: preset.tableHeaderText,
                      borderColor: preset.borderColor,
                    }}
                  >
                    <th className="py-2 sm:py-2.5 px-1.5 sm:px-2 w-6 sm:w-8 text-center">#</th>
                    <th className="py-2 sm:py-2.5 px-2 sm:px-3">{lang === "gu" ? "વસ્તુનું નામ" : "Item Description"}</th>
                    {customization.showHsn && (
                      <th className="py-2.5 px-2 font-mono text-center hidden sm:table-cell print:table-cell">{lang === "gu" ? "HSN" : "HSN"}</th>
                    )}
                    <th className="py-2 sm:py-2.5 px-1.5 sm:px-2 text-right font-mono w-10 sm:w-12">{lang === "gu" ? "જથ્થો" : "Qty"}</th>
                    <th className="py-2 sm:py-2.5 px-1.5 sm:px-3 text-right font-mono w-14 sm:w-16">{lang === "gu" ? "દર (₹)" : "Rate (₹)"}</th>
                    {customization.showDiscount && (
                      <th className="py-2.5 px-2 text-right font-mono hidden sm:table-cell print:table-cell">{lang === "gu" ? "વટાવ %" : "Disc %"}</th>
                    )}
                    <th className="py-2.5 px-2 text-right font-mono hidden sm:table-cell print:table-cell">{lang === "gu" ? "જીએસટી" : "GST"}</th>
                    <th className="py-2 sm:py-2.5 px-2 sm:px-3 text-right font-mono w-16 sm:w-24">{lang === "gu" ? "કુલ રકમ (₹)" : "Amount (₹)"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoiceData.items.map((it, idx) => {
                    const qty = Number(it.quantity) || 0;
                    const rate = Number(it.unitPrice) || 0;
                    const disc = Number(it.discountPercent) || 0;
                    const gross = qty * rate;
                    const grossAfterDisc = gross - (gross * disc) / 100;
                    const lineTotal = invoiceData.isTaxInclusive
                      ? grossAfterDisc
                      : grossAfterDisc + (grossAfterDisc * it.taxRate) / 100;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-1.5 sm:px-3 text-slate-400 font-mono text-center text-[11px]">{idx + 1}</td>
                        <td className="py-2 px-2 sm:px-3 font-semibold text-slate-900">
                          <div className="leading-snug">{it.name}</div>
                          <div className="sm:hidden text-[10px] text-slate-500 font-normal font-mono mt-0.5 print:hidden">
                            {it.hsnCode ? `HSN: ${it.hsnCode} • ` : ""}{it.taxRate}% GST
                            {disc > 0 ? ` • Disc: ${disc}%` : ""}
                          </div>
                        </td>
                        {customization.showHsn && (
                          <td className="py-2 px-2 font-mono text-slate-500 text-center hidden sm:table-cell print:table-cell">{it.hsnCode || "-"}</td>
                        )}
                        <td className="py-2 px-1.5 sm:px-2 text-right font-mono font-bold text-slate-800">{qty}</td>
                        <td className="py-2 px-1.5 sm:px-3 text-right font-mono text-slate-700">{formatInr(rate)}</td>
                        {customization.showDiscount && (
                          <td className="py-2 px-2 text-right font-mono text-slate-500 hidden sm:table-cell print:table-cell">
                            {disc > 0 ? `${disc}%` : "-"}
                          </td>
                        )}
                        <td className="py-2 px-2 text-right font-mono text-slate-600 font-semibold hidden sm:table-cell print:table-cell">{it.taxRate}%</td>
                        <td className="py-2 px-2 sm:px-3 text-right font-mono font-bold text-slate-900">
                          {formatInr(lineTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* SUMMARY & TOTALS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              {/* Left Column: Bank Details & Terms */}
              <div className="space-y-4">
                {customization.showBankDetails && (
                  <div
                    className="p-3.5 rounded-xl border text-xs"
                    style={{ borderColor: preset.borderColor, backgroundColor: preset.accentBg }}
                  >
                    <span
                      className="font-bold uppercase tracking-wider text-[11px] block mb-1"
                      style={{ color: primaryColor }}
                    >
                      🏦 {lang === "gu" ? "બેંક ખાતાની વિગત" : "Bank Transfer Details"}:
                    </span>
                    <p className="text-slate-800 font-semibold">Bank: State Bank of India</p>
                    <p className="font-mono text-slate-700">A/C No: 12345678901234</p>
                    <p className="font-mono text-slate-700">IFSC: SBIN0001234 • Branch: Surat</p>
                  </div>
                )}

                {customization.showTerms && invoiceData.notes && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600">
                    <span className="font-bold text-slate-800 block mb-0.5">
                      {lang === "gu" ? "નોંધ / શરતો" : "Notes & Remarks"}:
                    </span>
                    <p>{invoiceData.notes}</p>
                  </div>
                )}

                {invoiceData.termsAndConditions && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[10px] text-slate-600">
                    <span className="font-bold text-slate-800 block mb-0.5">
                      {lang === "gu" ? "નિયમો અને શરતો" : "Terms & Conditions"}:
                    </span>
                    <p className="whitespace-pre-line text-slate-500">{invoiceData.termsAndConditions}</p>
                  </div>
                )}
              </div>

              {/* Right Column: Tax Breakdown Box */}
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50 space-y-2">
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>{lang === "gu" ? "કરપાત્ર કિંમત" : "Taxable Value"}:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {formatInr(invoiceData.totalTaxable)}
                  </span>
                </div>

                {!invoiceData.isInterState ? (
                  <>
                    <div className="flex justify-between text-slate-600 text-xs">
                      <span>CGST (50%):</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {formatInr(invoiceData.totalCgst)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600 text-xs">
                      <span>SGST (50%):</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {formatInr(invoiceData.totalSgst)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-slate-600 text-xs">
                    <span>IGST (100%):</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {formatInr(invoiceData.totalIgst)}
                    </span>
                  </div>
                )}

                {Math.abs(invoiceData.roundOff) > 0.001 && (
                  <div className="flex justify-between text-slate-400 text-xs font-mono">
                    <span>Round Off:</span>
                    <span>
                      {invoiceData.roundOff >= 0 ? `+${invoiceData.roundOff.toFixed(2)}` : invoiceData.roundOff.toFixed(2)}
                    </span>
                  </div>
                )}

                <div
                  className="pt-2 border-t-2 flex items-center justify-between"
                  style={{ borderColor: primaryColor }}
                >
                  <span className="text-sm font-bold text-slate-900 uppercase">
                    {lang === "gu" ? "કુલ રકમ (Grand Total)" : "Grand Total"}:
                  </span>
                  <span
                    className="text-xl sm:text-2xl font-black font-mono"
                    style={{ color: primaryColor }}
                  >
                    {formatInr(invoiceData.roundedGrandTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* FOOTER: Signature & UPI QR */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-4 items-end">
              <div>
                {customization.showUpiQr && (
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-white border border-slate-300 rounded-lg p-1 flex items-center justify-center text-center shadow-xs">
                      <div className="w-full h-full bg-slate-900 text-[8px] text-white flex items-center justify-center font-mono font-bold rounded">
                        UPI QR
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Scan to Pay via UPI
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-800">
                        {formatInr(invoiceData.roundedGrandTotal)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {customization.showSignature && (
                <div className="text-right">
                  <div className="h-12 flex items-end justify-end">
                    <span className="text-[10px] text-slate-400 font-mono italic">
                      [ Authorized Signatory Stamp ]
                    </span>
                  </div>
                  <div className="border-t border-slate-300 pt-1 inline-block min-w-[160px]">
                    <span className="text-xs font-bold text-slate-800 block">
                      For {invoiceData.companyName || "Paneliya Technology"}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Authorized Signatory
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
