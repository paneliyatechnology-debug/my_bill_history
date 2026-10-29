"use client";

import React, { useEffect, useState } from "react";
import { useActiveInvoiceTheme } from "@/lib/use-active-invoice-theme";
import { DynamicThemedInvoice } from "@/components/invoice/dynamic-themed-invoice";
import { createPortal } from "react-dom";
import {
  InvoiceCustomization,
  DEFAULT_INVOICE_CUSTOMIZATION,
  loadInvoiceCustomization,
  getActiveThemePreset,
} from "@/lib/invoice-theme";

export interface LiveInvoiceItem {
  name: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  taxRate?: number;
  description?: string;
}

export interface NormalizedInvoiceItem {
  name: string;
  hsnCode: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxRate: number;
}

export interface LiveInvoiceParty {
  name?: string;
  gstin?: string;
  phone?: string;
  address?: string;
  billingAddress?: {
    line1?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
}

export interface LiveInvoiceData {
  category?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  paymentMode?: string;
  placeOfSupply?: string;
  partyName?: string;
  partyGstin?: string;
  partyPhone?: string;
  partyAddress?: string;
  party?: LiveInvoiceParty;
  companyName?: string;
  companyGstin?: string;
  companyState?: string;
  notes?: string;
  termsAndConditions?: string;
  items?: Array<LiveInvoiceItem>;
  totalTaxable?: number;
  subtotal?: number;
  totalCgst?: number;
  totalSgst?: number;
  totalIgst?: number;
  taxBreakup?: {
    cgst?: number;
    sgst?: number;
    igst?: number;
  };
  roundOff?: number;
  roundedGrandTotal?: number;
  grandTotal?: number;
  isTaxInclusive?: boolean;
  isInterState?: boolean;
}

export interface InvoiceLivePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  customization?: InvoiceCustomization;
  lang?: string;
  invoiceData?: LiveInvoiceData;
  data?: LiveInvoiceData;
}

export function InvoiceLivePreviewModal({
  isOpen,
  onClose,
  customization: propCustomization,
  lang = "en",
  invoiceData: propInvoiceData,
  data,
}: InvoiceLivePreviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const { state: activeThemeState } = useActiveInvoiceTheme();
  const [activeCustomization, setActiveCustomization] = useState<InvoiceCustomization>(
    propCustomization || DEFAULT_INVOICE_CUSTOMIZATION
  );

  useEffect(() => {
    setMounted(true);
    if (!propCustomization && typeof window !== "undefined") {
      setActiveCustomization(loadInvoiceCustomization());
    }
  }, [propCustomization]);

  useEffect(() => {
    if (propCustomization) {
      setActiveCustomization(propCustomization);
    }
  }, [propCustomization]);

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

  const customization = propCustomization || activeCustomization || DEFAULT_INVOICE_CUSTOMIZATION;
  const preset = getActiveThemePreset(customization);
  const primaryColor = customization?.customPrimaryColor || preset.primaryColor;

  const rawData: LiveInvoiceData = propInvoiceData || data || {};
  const invoiceData = {
    category: rawData.category || "TAX_INVOICE",
    invoiceNumber: rawData.invoiceNumber || "INV-0001",
    invoiceDate: rawData.invoiceDate || new Date().toISOString().split("T")[0],
    paymentMode: rawData.paymentMode || "Cash",
    placeOfSupply: rawData.placeOfSupply || "24 (Gujarat)",
    partyName: rawData.partyName || rawData.party?.name || "Cash Customer / Walk-in",
    partyGstin: rawData.partyGstin || rawData.party?.gstin,
    partyPhone: rawData.partyPhone || rawData.party?.phone,
    partyAddress: rawData.partyAddress || rawData.party?.address,
    companyName: rawData.companyName || "Paneliya Technology",
    companyGstin: rawData.companyGstin || "24AAAAA0000A1Z5",
    companyState: rawData.companyState || "Gujarat (24)",
    notes: rawData.notes,
    termsAndConditions: rawData.termsAndConditions,
    items: (Array.isArray(rawData.items)
      ? rawData.items.map((it: LiveInvoiceItem) => ({
          name: String(it.name || it.description || "Product / Item"),
          hsnCode: String(it.hsnCode || ""),
          quantity: Number(it.quantity) || 0,
          unitPrice: Number(it.unitPrice) || 0,
          discountPercent: Number(it.discountPercent) || 0,
          taxRate: Number(it.taxRate) || 0,
        }))
      : []) as NormalizedInvoiceItem[],
    totalTaxable: Number(rawData.totalTaxable ?? rawData.subtotal ?? 0),
    totalCgst: Number(rawData.totalCgst ?? rawData.taxBreakup?.cgst ?? 0),
    totalSgst: Number(rawData.totalSgst ?? rawData.taxBreakup?.sgst ?? 0),
    totalIgst: Number(rawData.totalIgst ?? rawData.taxBreakup?.igst ?? 0),
    roundOff: Number(rawData.roundOff ?? 0),
    roundedGrandTotal: Number(rawData.roundedGrandTotal ?? rawData.grandTotal ?? 0),
    isTaxInclusive: Boolean(rawData.isTaxInclusive),
    isInterState: Boolean(rawData.isInterState),
  };

  const formatInr = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const getDocTitle = () => {
    switch (invoiceData.category) {
      case "PURCHASE_INVOICE":
      case "PURCHASE":
        return lang === "gu" ? "ખરીદી બિલ (PURCHASE INVOICE)" : "PURCHASE INVOICE";
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
          <DynamicThemedInvoice
            invoice={{
              category: invoiceData.category,
              invoiceNumber: invoiceData.invoiceNumber,
              invoiceDate: invoiceData.invoiceDate,
              paymentMode: invoiceData.paymentMode,
              placeOfSupply: invoiceData.placeOfSupply,
              taxableAmount: invoiceData.totalTaxable,
              cgstAmount: invoiceData.totalCgst,
              sgstAmount: invoiceData.totalSgst,
              igstAmount: invoiceData.totalIgst,
              roundOff: invoiceData.roundOff,
              grandTotal: invoiceData.roundedGrandTotal,
              notes: invoiceData.notes,
              party: {
                name: invoiceData.partyName,
                gstin: invoiceData.partyGstin,
                phone: invoiceData.partyPhone,
                billingAddress: invoiceData.partyAddress,
              },
              items: (invoiceData.items || []).map((it: any) => ({
                description: it.name,
                hsnCode: it.hsnCode,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                discountPercent: it.discountPercent,
                taxRate: it.taxRate,
                taxableAmount: (it.quantity || 0) * (it.unitPrice || 0) * (1 - (it.discountPercent || 0) / 100),
                totalAmount: (it.quantity || 0) * (it.unitPrice || 0) * (1 - (it.discountPercent || 0) / 100) * (1 + (it.taxRate || 0) / 100),
                item: { name: it.name },
              })),
            }}
            settings={activeThemeState}
            company={{
              tradeName: invoiceData.companyName,
              gstin: invoiceData.companyGstin,
              stateCode: invoiceData.companyState?.includes('(') ? invoiceData.companyState.split('(')[1].replace(')', '') : '24',
            }}
            printableId="printable-invoice"
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
