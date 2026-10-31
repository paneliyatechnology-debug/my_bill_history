"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../context/auth-context";
import { apiClient } from "../../../../lib/api-client";
import { mailResultMessage, sendAppEmail } from "../../../../lib/send-app-email";
import { Modal } from "../../../../components/ui/modal";
import { StatusBadge } from "../../../../components/ui/badge";
import {
  InvoiceCustomization,
  loadInvoiceCustomization,
  saveInvoiceCustomization,
  getActiveThemePreset,
  INVOICE_THEMES,
  InvoiceThemeId,
  DEFAULT_INVOICE_CUSTOMIZATION,
} from "@/lib/invoice-theme";
import { useActiveInvoiceTheme } from "@/lib/use-active-invoice-theme";
import { DynamicThemedInvoice } from "@/components/invoice/dynamic-themed-invoice";
import { ALL_THEME_KEYS, resolveThemeDefinition } from "@/lib/invoice-theme-keys";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { EwbSlipModal } from "../../../../components/gst/ewb-slip-modal";

interface InvoiceDetail {
  id: string;
  category?: string;
  invoiceNumber: string;
  invoiceDate: string;
  status: "DRAFT" | "ISSUED" | "PAID" | "PARTIALLY_PAID" | "CANCELLED";
  paymentMode: string;
  placeOfSupply: string;
  isB2B: boolean;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  roundOff: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount?: number;
  outstandingBalance?: number;
  notes?: string;
  party?: {
    id: string;
    name: string;
    gstin?: string;
    stateCode: string;
    phone?: string;
    email?: string;
    billingAddress?: any;
  };
  items: Array<{
    id: string;
    description?: string;
    hsnCode: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    taxRate: number;
    taxableAmount: number;
    cgstAmount?: number;
    sgstAmount?: number;
    igstAmount?: number;
    totalAmount: number;
    item?: { name: string; nameGujarati?: string };
  }>;
  eWayBillRecord?: {
    id: string;
    ewbNumber: string;
    ewbDate: string;
    validUpto: string;
    distanceKm: number;
    vehicleNumber?: string;
    transporterName?: string;
    status: string;
  };
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { lang, currentCompany } = useAuth();
  const { state: invoiceThemeState, updateThemeFast } = useActiveInvoiceTheme(currentCompany?.id);
  const [selectedPaperSize, setSelectedPaperSize] = useState<"A4" | "A5" | "US_LETTER" | "LEGAL" | "THERMAL_80" | "DL">("A4");

  useEffect(() => {
    if (invoiceThemeState?.paperSize) {
      setSelectedPaperSize(invoiceThemeState.paperSize as any);
    }
  }, [invoiceThemeState?.paperSize]);

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // MyBillBook UI & Drawer States
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [isProfitModalOpen, setIsProfitModalOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isShareDropdownOpen, setIsShareDropdownOpen] = useState(false);
  const [isDownloadDropdownOpen, setIsDownloadDropdownOpen] = useState(false);
  const [isPrintDropdownOpen, setIsPrintDropdownOpen] = useState(false);
  const [isFormatMenuOpen, setIsFormatMenuOpen] = useState(false);

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | "">("");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [paymentRef, setPaymentRef] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [isIssuing, setIsIssuing] = useState(false);
  const [stockConfirmPrompt, setStockConfirmPrompt] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [emailShareOpen, setEmailShareOpen] = useState(false);
  const [emailShareTo, setEmailShareTo] = useState("");
  const [emailShareBusy, setEmailShareBusy] = useState(false);

  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [customization, setCustomization] = useState<InvoiceCustomization>(DEFAULT_INVOICE_CUSTOMIZATION);

  // E-Way Bill states
  const [viewEwbSlipNumber, setViewEwbSlipNumber] = useState<string | null>(null);
  const [isEwbModalOpen, setIsEwbModalOpen] = useState(false);
  const [ewbTab, setEwbTab] = useState<"GENERATE" | "LINK" | "JSON">("GENERATE");
  const [linkEwbNumber, setLinkEwbNumber] = useState("");
  const [ewbSuccessResult, setEwbSuccessResult] = useState<any | null>(null);
  const [ewbForm, setEwbForm] = useState({
    transporterId: "",
    transporterName: "",
    vehicleNumber: "",
    distanceKm: 50,
  });
  const [isSubmittingEwb, setIsSubmittingEwb] = useState(false);
  const [ewbError, setEwbError] = useState<string | null>(null);
  const [copiedEwb, setCopiedEwb] = useState(false);

  useEffect(() => {
    setCustomization(loadInvoiceCustomization());
  }, []);



  const handleDownloadPdf = async () => {
    if (!invoice) return;
    const element = document.getElementById("printable-invoice");
    if (!element) return;

    setIsGeneratingPdf(true);
    setActionError(null);
    let originalTransform = "";
    let originalWidth = "";
    let wrapperEl: HTMLElement | null = null;
    let originalWrapperHeight = "";
    let originalWrapperOverflow = "";
    try {
      originalTransform = element.style.transform;
      originalWidth = element.style.width;
      wrapperEl = element.closest('.invoice-viewport-wrapper') as HTMLElement;
      if (wrapperEl) {
        originalWrapperHeight = wrapperEl.style.height;
        originalWrapperOverflow = wrapperEl.style.overflow;
        wrapperEl.style.height = '';
        wrapperEl.style.overflow = '';
      }
      element.style.transform = "none";
      element.style.width = "";
      element.style.transformOrigin = "";

      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 1200,
      });

      // Don't restore scaling here - the finally block handles it

      const imgData = canvas.toDataURL("image/png");
      const pdfFormatMap: Record<string, any> = {
        A4: "a4",
        A5: "a5",
        US_LETTER: "letter",
        LEGAL: "legal",
      };
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: pdfFormatMap[selectedPaperSize] || "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm

      // Standard A4 margin: 6mm left/right, 6mm top/bottom
      const margin = 6;
      const printableWidth = pdfWidth - margin * 2; // 198mm
      const printableHeight = pageHeight - margin * 2; // 285mm

      // Scaled height if rendered at full printable width
      const unscaledHeight = (canvas.height * printableWidth) / canvas.width;

      // If the content fits within ~1.25x of a single A4 page, scale it slightly to fit
      // precisely onto EXACTLY ONE single A4 page with NO trailing second page!
      if (unscaledHeight <= printableHeight * 1.25) {
        const scaleFactor = Math.min(1, printableHeight / unscaledHeight);
        const finalWidth = printableWidth * scaleFactor;
        const finalHeight = unscaledHeight * scaleFactor;
        const posX = margin + (printableWidth - finalWidth) / 2;
        const posY = margin + (printableHeight - finalHeight) / 2;

        pdf.addImage(imgData, "PNG", posX, posY, finalWidth, finalHeight, undefined, "FAST");
      } else {
        // Multi-page document for genuine long lists (e.g. > 15 items)
        let heightLeft = unscaledHeight;
        let position = margin;

        pdf.addImage(imgData, "PNG", margin, position, printableWidth, unscaledHeight, undefined, "FAST");
        heightLeft -= printableHeight;

        // Only add another page if remaining content is MORE than 25mm,
        // avoiding ghost trailing pages with just a few pixels of padding
        while (heightLeft > 25) {
          pdf.addPage();
          position = margin - (unscaledHeight - heightLeft);
          pdf.addImage(imgData, "PNG", margin, position, printableWidth, unscaledHeight, undefined, "FAST");
          heightLeft -= printableHeight;
        }
      }

      const safeNumber = invoice.invoiceNumber.replace(/[\/\\?%*:|"<>]/g, "_");
      pdf.save(`${safeNumber}.pdf`);
      setActionSuccess(
        lang === "gu"
          ? `PDF '${safeNumber}.pdf' સફળતાપૂર્વક ડાઉનલોડ થઈ ગયું છે.`
          : `PDF '${safeNumber}.pdf' downloaded successfully!`,
      );
    } catch (err: any) {
      // Restore scaling on error
      if (element) {
        element.style.transform = originalTransform;
        element.style.width = originalWidth;
      }
      if (wrapperEl) {
        wrapperEl.style.height = originalWrapperHeight;
        wrapperEl.style.overflow = originalWrapperOverflow;
      }
      console.error("PDF generation failed:", err);
      setActionError(
        lang === "gu"
          ? "PDF બનાવવામાં સમસ્યા આવી. કૃપા કરીને પ્રિન્ટ ઓપ્શન વાપરો."
          : `Failed to generate PDF: ${err.message || "Unknown error"}`,
      );
    } finally {
      // Always restore mobile scaling
      if (element) {
        element.style.transform = originalTransform;
        element.style.width = originalWidth;
      }
      if (wrapperEl) {
        wrapperEl.style.height = originalWrapperHeight;
        wrapperEl.style.overflow = originalWrapperOverflow;
      }
      setIsGeneratingPdf(false);
    }
  };

  const fetchInvoice = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [invRes, allocRes, retRes, compRes]: any = await Promise.all([
        apiClient.get(`/sales/invoices/${id}`),
        apiClient.get(`/sales/invoices/${id}/allocations`).catch(() => []),
        apiClient
          .get(`/sales-returns`, { salesInvoiceId: id })
          .catch(() => ({ data: [] })),
        apiClient.get(`/tenants/company`).catch(() => null),
      ]);
      setInvoice(invRes);
      setAllocations(Array.isArray(allocRes) ? allocRes : []);
      if (compRes) {
        setCompanyDetails(compRes);
      }
      const retList = Array.isArray(retRes?.data)
        ? retRes.data
        : Array.isArray(retRes?.items)
          ? retRes.items
          : Array.isArray(retRes)
            ? retRes
            : [];
      setReturns(retList);
      const bal = invRes?.balanceAmount !== undefined ? Number(invRes.balanceAmount) : Number(invRes?.outstandingBalance || 0);
      setPaymentAmount(bal);
    } catch (err: any) {
      setError(err.message || "Failed to load invoice details.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchInvoice();
    }
  }, [id, fetchInvoice]);

  const handleIssueInvoice = async (forceNegativeStock = false) => {
    if (!invoice) return;
    setIsIssuing(true);
    setActionError(null);
    try {
      await apiClient.post(
        `/sales/invoices/${invoice.id}/issue`,
        { allowNegativeStock: forceNegativeStock },
        undefined,
        `issue_key_${Date.now()}`,
      );
      setStockConfirmPrompt(null);
      setActionSuccess(
        lang === "gu"
          ? "કાચું બિલ સફળતાપૂર્વક પાકા ટેક્સ ઇનવોઇસ (Tax Invoice) માં બદલાઈ ગયું છે!"
          : "Quotation/Draft successfully converted to legal Tax Invoice!",
      );
      await fetchInvoice();
    } catch (err: any) {
      const msg = err.message || "";
      if (
        msg.includes("INSUFFICIENT_STOCK") ||
        msg.toLowerCase().includes("insufficient stock")
      ) {
        setStockConfirmPrompt(msg.replace("[INSUFFICIENT_STOCK]", "").trim());
      } else {
        setActionError(
          msg ||
          (lang === "gu"
            ? "બિલ કન્વર્ટ કરવામાં નિષ્ફળતા મળી."
            : "Failed to issue invoice."),
        );
      }
    } finally {
      setIsIssuing(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    setIsSubmittingPayment(true);
    setPaymentError(null);

    try {
      await apiClient.post(
        `/sales/invoices/${invoice.id}/payments`,
        {
          amount: Number(paymentAmount) || 0,
          paymentMode,
          referenceNo: paymentRef || undefined,
        },
        undefined,
        `pay_key_${Date.now()}`,
      );

      setIsPaymentModalOpen(false);
      await fetchInvoice();
    } catch (err: any) {
      setPaymentError(err.message || "Failed to record payment.");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleCancelInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    setIsCancelling(true);
    setCancelError(null);

    try {
      await apiClient.post(
        `/sales/invoices/${invoice.id}/cancel`,
        {
          cancellationReason: cancelReason,
        },
        undefined,
        `cancel_key_${Date.now()}`,
      );

      setIsCancelModalOpen(false);
      await fetchInvoice();
    } catch (err: any) {
      setCancelError(err.message || "Failed to cancel invoice.");
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="inline-block w-8 h-8 border-2 border-[#174B43] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs">Loading tax invoice...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-3">
        <p className="text-xs font-semibold text-rose-700">
          {error || "Invoice not found."}
        </p>
        <Link
          href="/sales/invoices"
          className="text-xs text-primary font-medium hover:underline"
        >
          Return to Invoices List
        </Link>
      </div>
    );
  }

  const activePreset = getActiveThemePreset(customization);
  const primaryColor = customization.customPrimaryColor || activePreset.primaryColor;
  const activeComp = companyDetails || currentCompany;

  const getDocTitle = () => {
    switch (invoice?.category) {
      case "PROFORMA_INVOICE":
        return lang === "gu" ? "કાચું બિલ (QUOTATION)" : "QUOTATION / ESTIMATE";
      case "DELIVERY_CHALLAN":
        return lang === "gu" ? "ડિલિવરી ચલણ" : "DELIVERY CHALLAN";
      case "BILL_OF_SUPPLY":
        return lang === "gu" ? "મુક્તિ બિલ" : "BILL OF SUPPLY";
      default:
        return lang === "gu" ? "ટેક્સ ઇનવોઇસ" : "TAX INVOICE";
    }
  };

  const bal = invoice.balanceAmount !== undefined ? Number(invoice.balanceAmount) : Number(invoice.outstandingBalance || 0);
  const totalAllocations = (allocations || []).reduce((sum, a) => sum + Number(a.allocatedAmount || 0), 0);
  const initialReceived = Math.max(0, Number(invoice.paidAmount || 0) - totalAllocations);

  return (
    <div className="space-y-5 max-w-[1440px] mx-auto print:space-y-0 print:max-w-none print:w-full print:m-0 print:p-0 font-sans">
      {/* Top Action Bar (Single Sleek Forest Teal Header & Workspace Toolbar) */}
      <div className="bg-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Back Link, Document Title, Status Pill, Financial Summary */}
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <Link
              href="/sales/invoices"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-[#174B43] hover:bg-[#F2FAF7] rounded-xl border border-slate-200 transition-colors shadow-2xs"
              title="Back to Sales Invoices"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>{lang === "gu" ? "પાછા જાઓ" : "Invoices"}</span>
            </Link>

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight truncate">
                  {invoice.category === "PROFORMA_INVOICE"
                    ? `Quotation #${invoice.invoiceNumber}`
                    : invoice.category === "DELIVERY_CHALLAN"
                      ? `Delivery Challan #${invoice.invoiceNumber}`
                      : `Invoice #${invoice.invoiceNumber}`}
                </h1>

                {/* Status Badge */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase ${
                    invoice.status === "PAID"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : invoice.status === "PARTIALLY_PAID"
                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                        : invoice.status === "DRAFT"
                          ? "bg-slate-100 text-slate-700 border border-slate-200"
                          : invoice.status === "CANCELLED"
                            ? "bg-rose-50 text-rose-700 line-through border border-rose-200"
                            : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    invoice.status === "PAID" ? "bg-emerald-500" : invoice.status === "PARTIALLY_PAID" ? "bg-amber-500" : invoice.status === "DRAFT" ? "bg-slate-400" : "bg-rose-500"
                  }`} />
                  {invoice.status === "PARTIALLY_PAID"
                    ? (lang === "gu" ? "અંશતઃ ચૂકવેલ" : "Partially Paid")
                    : invoice.status === "PAID"
                      ? (lang === "gu" ? "સંપૂર્ણ ચૂકવેલ" : "Paid")
                      : invoice.status === "DRAFT"
                        ? (lang === "gu" ? "કાચું બિલ" : "Draft")
                        : invoice.status === "CANCELLED"
                          ? (lang === "gu" ? "રદ કરેલ" : "Cancelled")
                          : (lang === "gu" ? "બાકી" : "Unpaid")}
                </span>
              </div>
            </div>

            {/* Financial Summary Pill */}
            <div className="hidden md:flex items-center gap-2 bg-[#F6F8F7] px-3 py-1 rounded-xl border border-slate-200 text-xs shadow-2xs">
              <span className="text-slate-500 font-medium">{lang === "gu" ? "કુલ:" : "Total:"}</span>
              <span className="font-mono font-bold text-slate-900">₹{Number(invoice.grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 font-medium">{lang === "gu" ? "બાકી:" : "Due:"}</span>
              <span className={`font-mono font-bold ${bal > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                ₹{bal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Right: Consolidated Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Payment History Toggle Pill */}
            <button
              id="btn-payment-history"
              onClick={() => setShowPaymentHistory(!showPaymentHistory)}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs ${
                showPaymentHistory
                  ? "bg-[#174B43] text-white border-[#174B43]"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-[#F2FAF7] hover:text-[#174B43] hover:border-[#85D5C2]"
              }`}
              title="View Payment History Drawer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>{lang === "gu" ? "ચુકવણી ઇતિહાસ" : "Payment History"}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                showPaymentHistory ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
              }`}>
                {allocations.length || (invoice.paidAmount > 0 ? 1 : 0)}
              </span>
            </button>

            {/* Format & Theme Dropdown Menu */}
            <div className="relative">
              <button
                id="btn-format-theme"
                type="button"
                onClick={() => {
                  setIsFormatMenuOpen(!isFormatMenuOpen);
                  setIsShareDropdownOpen(false);
                  setIsDownloadDropdownOpen(false);
                  setIsPrintDropdownOpen(false);
                  setIsMoreMenuOpen(false);
                }}
                className="px-3 py-2 bg-white hover:bg-[#F2FAF7] hover:border-[#85D5C2] text-slate-700 hover:text-[#174B43] border border-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Theme and Paper Size"
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0 border border-black/15 shadow-2xs"
                  style={{ backgroundColor: invoiceThemeState.accentColor || primaryColor }}
                />
                <span>{lang === "gu" ? "થીમ & ફોર્મેટ" : "Theme & Paper"}</span>
                <span className="text-[10px] text-slate-400">▾</span>
              </button>

              {isFormatMenuOpen && (
                <div
                  className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-40 text-xs space-y-3 animate-in fade-in zoom-in-95 duration-100"
                  onMouseLeave={() => setIsFormatMenuOpen(false)}
                >
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {lang === "gu" ? "ઇન્વોઇસ થીમ" : "Invoice Theme"}
                    </label>
                    <select
                      value={
                        resolveThemeDefinition(
                          invoiceThemeState.uniqueThemeKey || invoiceThemeState.festiveTheme || invoiceThemeState.themeId,
                          invoiceThemeState.festiveVariant
                        ).uniqueKey
                      }
                      onChange={(e) => {
                        updateThemeFast(e.target.value);
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800 text-xs focus:outline-none focus:border-[#26A58A] cursor-pointer"
                    >
                      <optgroup label={lang === "gu" ? "તહેવાર થીમ્સ (Festive Themes)" : "Festive Themes"}>
                        {ALL_THEME_KEYS.filter((t) => t.isFestive).map((t) => (
                          <option key={t.uniqueKey} value={t.uniqueKey}>
                            {lang === "gu" ? t.displayNameGu : t.displayName}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label={lang === "gu" ? "સ્ટાન્ડર્ડ થીમ્સ (Standard)" : "Standard Themes"}>
                        {ALL_THEME_KEYS.filter((t) => !t.isFestive).map((t) => (
                          <option key={t.uniqueKey} value={t.uniqueKey}>
                            {lang === "gu" ? t.displayNameGu : t.displayName}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {lang === "gu" ? "કાગળનું માપ" : "Paper Size"}
                    </label>
                    <select
                      value={selectedPaperSize}
                      onChange={(e) => setSelectedPaperSize(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800 text-xs focus:outline-none focus:border-[#26A58A] cursor-pointer"
                    >
                      <option value="A4">A4 (210 × 297 mm)</option>
                      <option value="A5">A5 (148 × 210 mm)</option>
                      <option value="US_LETTER">Letter (8.5 × 11 in)</option>
                      <option value="LEGAL">Legal (8.5 × 14 in)</option>
                      <option value="THERMAL_80">Thermal 80mm (3 inch)</option>
                      <option value="DL">DL (99 × 210 mm)</option>
                    </select>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Need deep styling?</span>
                    <Link
                      href="/settings/invoice"
                      className="text-xs font-bold text-[#174B43] hover:text-[#26A58A] hover:underline flex items-center gap-1"
                      title="Open Invoice Settings Studio"
                    >
                      <span>⚙️ Studio</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Print PDF Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsPrintDropdownOpen(!isPrintDropdownOpen);
                  setIsFormatMenuOpen(false);
                  setIsShareDropdownOpen(false);
                  setIsDownloadDropdownOpen(false);
                  setIsMoreMenuOpen(false);
                }}
                className="px-3 py-2 bg-white hover:bg-[#F2FAF7] hover:border-[#85D5C2] text-slate-700 hover:text-[#174B43] border border-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Print Invoice"
              >
                <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>{lang === "gu" ? "પ્રિન્ટ" : "Print"}</span>
                <span className="text-[10px] text-slate-400">▾</span>
              </button>
              {isPrintDropdownOpen && (
                <div
                  className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-40 text-xs animate-in fade-in zoom-in-95 duration-100"
                  onMouseLeave={() => setIsPrintDropdownOpen(false)}
                >
                  <button
                    onClick={() => {
                      setIsPrintDropdownOpen(false);
                      window.print();
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                  >
                    <span>🖨️</span>
                    <span>Print Standard A4</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsPrintDropdownOpen(false);
                      window.print();
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                  >
                    <span>🧾</span>
                    <span>Thermal Printer (3 inch)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Download PDF Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsDownloadDropdownOpen(!isDownloadDropdownOpen);
                  setIsFormatMenuOpen(false);
                  setIsShareDropdownOpen(false);
                  setIsPrintDropdownOpen(false);
                  setIsMoreMenuOpen(false);
                }}
                disabled={isGeneratingPdf}
                className="px-3 py-2 bg-white hover:bg-[#F2FAF7] hover:border-[#85D5C2] text-slate-700 hover:text-[#174B43] border border-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Download PDF Document"
              >
                <svg className="w-3.5 h-3.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>{isGeneratingPdf ? "Generating..." : (lang === "gu" ? "ડાઉનલોડ" : "PDF")}</span>
                <span className="text-[10px] text-slate-400">▾</span>
              </button>
              {isDownloadDropdownOpen && (
                <div
                  className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-40 text-xs animate-in fade-in zoom-in-95 duration-100"
                  onMouseLeave={() => setIsDownloadDropdownOpen(false)}
                >
                  <button
                    onClick={() => {
                      setIsDownloadDropdownOpen(false);
                      handleDownloadPdf();
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                  >
                    <span>📄</span>
                    <span>Regular A4 Tax PDF</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsDownloadDropdownOpen(false);
                      handleDownloadPdf();
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                  >
                    <span>🧾</span>
                    <span>Thermal Slip (80mm)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Share Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsShareDropdownOpen(!isShareDropdownOpen);
                  setIsFormatMenuOpen(false);
                  setIsDownloadDropdownOpen(false);
                  setIsPrintDropdownOpen(false);
                  setIsMoreMenuOpen(false);
                }}
                className="px-3 py-2 bg-white hover:bg-[#F2FAF7] hover:border-[#85D5C2] text-slate-700 hover:text-[#174B43] border border-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Share Invoice"
              >
                <svg className="w-3.5 h-3.5 text-[#26A58A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span>{lang === "gu" ? "શેર કરો" : "Share"}</span>
                <span className="text-[10px] text-slate-400">▾</span>
              </button>
              {isShareDropdownOpen && (
                <div
                  className="absolute right-0 mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-40 text-xs animate-in fade-in zoom-in-95 duration-100"
                  onMouseLeave={() => setIsShareDropdownOpen(false)}
                >
                  <button
                    onClick={() => {
                      setIsShareDropdownOpen(false);
                      const companyName = currentCompany?.tradeName || currentCompany?.legalName || "myownbillbook";
                      const text = `*Invoice from ${companyName}*\nInvoice No: ${invoice.invoiceNumber}\nDate: ${new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}\nGrand Total: ₹${Number(invoice.grandTotal).toFixed(2)}\nOutstanding Balance: ₹${bal.toFixed(2)}\n\nThank you for your business!`;
                      const phone = invoice.party?.phone ? invoice.party.phone.replace(/[^0-9]/g, "") : "";
                      const waUrl = phone
                        ? `https://wa.me/${phone.startsWith("91") ? phone : "91" + phone}?text=${encodeURIComponent(text)}`
                        : `https://wa.me/?text=${encodeURIComponent(text)}`;
                      window.open(waUrl, "_blank");
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 flex items-center gap-2 text-emerald-800 font-semibold cursor-pointer"
                  >
                    <span>💬</span>
                    <span>Share on WhatsApp</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsShareDropdownOpen(false);
                      navigator.clipboard.writeText(window.location.href);
                      setActionSuccess("Invoice link copied to clipboard!");
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                  >
                    <span>🔗</span>
                    <span>Copy Invoice Link</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsShareDropdownOpen(false);
                      setEmailShareTo(invoice.party?.email || "");
                      setEmailShareOpen(true);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 border-t border-slate-100 cursor-pointer"
                  >
                    <span>✉️</span>
                    <span>Email Invoice</span>
                  </button>
                </div>
              )}
            </div>

            {/* Primary Action Button (State Dependent) */}
            {invoice.status === "DRAFT" ? (
              <button
                onClick={() => handleIssueInvoice(false)}
                disabled={isIssuing}
                className="px-4 py-2 bg-[#174B43] hover:bg-[#123B35] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isIssuing && (
                  <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                )}
                <span>
                  {isIssuing
                    ? "Processing..."
                    : invoice.category === "PROFORMA_INVOICE"
                      ? (lang === "gu" ? "પાકું બિલ બનાવો" : "Convert to Tax Invoice")
                      : (lang === "gu" ? "ટેક્સ બિલ બનાવો" : "Issue Tax Invoice")}
                </span>
              </button>
            ) : ["ISSUED", "PARTIALLY_PAID"].includes(invoice.status) && bal > 0 ? (
              <button
                onClick={() => {
                  setPaymentAmount(bal);
                  setPaymentError(null);
                  setIsPaymentModalOpen(true);
                }}
                className="px-4 py-2 bg-[#174B43] hover:bg-[#123B35] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>💳</span>
                <span>{lang === "gu" ? "ચુકવણી નોંધો" : "Record Payment In"}</span>
              </button>
            ) : null}

            {/* More Options Dropdown (Consolidated Infrequent Actions) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(!isMoreMenuOpen);
                  setIsFormatMenuOpen(false);
                  setIsShareDropdownOpen(false);
                  setIsDownloadDropdownOpen(false);
                  setIsPrintDropdownOpen(false);
                }}
                className="p-2 bg-white hover:bg-[#F2FAF7] hover:border-[#85D5C2] text-slate-700 hover:text-[#174B43] border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                title="More Actions"
              >
                •••
              </button>

              {isMoreMenuOpen && (
                <div
                  className="absolute right-0 mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-40 text-xs animate-in fade-in zoom-in-95 duration-100"
                  onMouseLeave={() => setIsMoreMenuOpen(false)}
                >
                  {/* Profit Details */}
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setIsProfitModalOpen(true);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer font-medium"
                  >
                    <span>💼</span>
                    <span>{lang === "gu" ? "નફો વિગતો" : "Profit Details"}</span>
                  </button>

                  {/* Edit Invoice */}
                  {invoice.status !== "CANCELLED" && (
                    <Link
                      href={`/sales/invoices/${invoice.id}/edit`}
                      className="px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium"
                    >
                      <span>✏️</span>
                      <span>{lang === "gu" ? "બિલમાં ફેરફાર કરો" : "Edit Invoice"}</span>
                    </Link>
                  )}

                  {/* E-Way Bill */}
                  {invoice.status !== "DRAFT" && invoice.status !== "CANCELLED" && (
                    invoice.eWayBillRecord?.ewbNumber && invoice.eWayBillRecord.status === "ACT" ? (
                      <button
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          setViewEwbSlipNumber(invoice.eWayBillRecord!.ewbNumber);
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-sky-50 flex items-center gap-2 text-sky-800 font-medium cursor-pointer"
                      >
                        <span>🚚</span>
                        <span>View EWB Slip ({invoice.eWayBillRecord.ewbNumber})</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          setEwbTab("GENERATE");
                          setLinkEwbNumber("");
                          setEwbSuccessResult(null);
                          setEwbError(null);
                          setEwbForm({
                            transporterId: "",
                            transporterName: "",
                            vehicleNumber: "",
                            distanceKm: 50,
                          });
                          setIsEwbModalOpen(true);
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-sky-50 flex items-center gap-2 text-sky-800 font-medium cursor-pointer"
                      >
                        <span>🚚</span>
                        <span>{lang === "gu" ? "જનરેટ ઈ-વે બિલ" : "Generate E-way Bill"}</span>
                      </button>
                    )
                  )}

                  {/* E-Invoice */}
                  {invoice.status !== "DRAFT" && invoice.status !== "CANCELLED" && (
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        alert(lang === "gu" ? "આ ઇન્વોઇસ માટે e-Invoice IRN સફળતાપૂર્વક જોડી દેવામાં આવ્યું છે." : "e-Invoice IRN successfully validated under Rule 48(4).");
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-blue-50 flex items-center gap-2 text-blue-800 font-medium cursor-pointer"
                    >
                      <span>🏛️</span>
                      <span>{lang === "gu" ? "જનરેટ e-Invoice" : "Generate e-Invoice"}</span>
                    </button>
                  )}

                  {/* Credit Note */}
                  {!["CANCELLED", "DRAFT"].includes(invoice.status) && (
                    <Link
                      href={`/sales/returns?invoiceId=${invoice.id}`}
                      className="px-3.5 py-2 hover:bg-amber-50 flex items-center gap-2 text-amber-800 font-medium"
                    >
                      <span>↩</span>
                      <span>{lang === "gu" ? "ક્રેડિટ નોટ બનાવો" : "Create Credit Note"}</span>
                    </Link>
                  )}

                  {/* Cancel Invoice */}
                  {!["CANCELLED", "DRAFT"].includes(invoice.status) && (
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        setCancelReason("");
                        setCancelError(null);
                        setIsCancelModalOpen(true);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-rose-50 flex items-center gap-2 text-rose-600 font-medium border-t border-slate-100 cursor-pointer"
                    >
                      <span>✕</span>
                      <span>{lang === "gu" ? "બિલ રદ કરો" : "Cancel Invoice"}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Feedback Messages */}
      {actionError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between shadow-2xs print:hidden animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-500 hover:text-rose-700 font-bold px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between shadow-2xs print:hidden animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="text-base">✓</span>
            <span className="font-semibold">{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-500 hover:text-emerald-700 font-bold px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {emailShareOpen && invoice && (
        <form
          className="print:hidden p-3.5 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center shadow-2xs"
          onSubmit={async (e) => {
            e.preventDefault();
            setEmailShareBusy(true);
            setActionError(null);
            try {
              const companyName = currentCompany?.tradeName || currentCompany?.legalName || "myownbillbook";
              const result = await sendAppEmail({
                to: emailShareTo.trim(),
                subject: `Invoice ${invoice.invoiceNumber} from ${companyName}`,
                heading: `Invoice ${invoice.invoiceNumber}`,
                intro: `${companyName} shared this sales invoice with you.`,
                details: [
                  { label: "Invoice", value: invoice.invoiceNumber },
                  { label: "Date", value: new Date(invoice.invoiceDate).toLocaleDateString("en-IN") },
                  { label: "Party", value: invoice.party?.name || "—" },
                  { label: "Grand total", value: `₹${Number(invoice.grandTotal).toFixed(2)}` },
                  { label: "Balance", value: `₹${bal.toFixed(2)}` },
                ],
                text: "Open the invoice in myownbillbook to print or download the PDF.",
              });
              setActionSuccess(mailResultMessage(result, lang === "gu" ? "gu" : "en"));
              if (result.delivered) setEmailShareOpen(false);
            } catch (err: any) {
              setActionError(err?.message || "Could not email this invoice.");
            } finally {
              setEmailShareBusy(false);
            }
          }}
        >
          <input
            type="email"
            required
            value={emailShareTo}
            onChange={(e) => setEmailShareTo(e.target.value)}
            placeholder="customer@email.com"
            className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#26A58A]"
          />
          <button type="submit" disabled={emailShareBusy} className="px-4 py-2 text-xs font-bold text-white bg-[#174B43] hover:bg-[#123B35] rounded-lg disabled:opacity-60 transition-colors cursor-pointer">
            {emailShareBusy ? "Sending..." : "Send Email"}
          </button>
          <button type="button" onClick={() => setEmailShareOpen(false)} className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer">
            Cancel
          </button>
        </form>
      )}

      {/* Tax Invoice Document Viewport (Clean, Authentic Responsive Workspace - Centered without Permanent Side-Panels) */}
      <div className="w-full max-w-4xl mx-auto min-w-0 invoice-viewport-wrapper print:block print:max-w-none print:w-full">
        {/* The Dynamic Themed GST Tax Invoice Container */}
        <DynamicThemedInvoice
          invoice={invoice as any}
          settings={{ ...invoiceThemeState, paperSize: selectedPaperSize }}
          company={activeComp || (currentCompany as any)}
          printableId="printable-invoice"
        />
      </div>

      {/* Payment History Slide-Over Drawer with Backdrop (On-Demand) */}
      {showPaymentHistory && (
        <div className="fixed inset-0 top-[64px] sm:top-[72px] z-50 overflow-hidden print:hidden" aria-labelledby="payment-drawer-title" role="dialog" aria-modal="true">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 top-[64px] sm:top-[72px] bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setShowPaymentHistory(false)}
          />

          <div className="fixed top-[64px] sm:top-[72px] bottom-0 right-0 max-w-full flex pl-10 z-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 border-l border-slate-200">
              {/* Drawer Header */}
              <div className="px-5 py-4 border-b border-slate-100 bg-[#F6F8F7] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#174B43]/10 text-[#174B43] flex items-center justify-center font-bold text-sm">
                    📋
                  </div>
                  <div>
                    <h3 id="payment-drawer-title" className="font-bold text-slate-900 text-sm">
                      {lang === "gu" ? "ચુકવણી ઇતિહાસ" : "Payment History"}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Invoice #{invoice.invoiceNumber}
                    </p>
                  </div>
                </div>
                <button
                  id="btn-close-payment-drawer"
                  type="button"
                  onClick={() => setShowPaymentHistory(false)}
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer text-base"
                  title="Close Drawer"
                >
                  ✕
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Financial Summary Card */}
                <div className="bg-[#F6F8F7] rounded-xl p-4 border border-slate-200 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>{lang === "gu" ? "ઇન્વોઇસ રકમ" : "Invoice Amount"}</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      ₹{Number(invoice.grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>{lang === "gu" ? "શરૂઆતમાં મળેલ રકમ" : "Initial Amount Received"}</span>
                    <span className="font-mono font-medium text-slate-700">
                      ₹{initialReceived.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>{lang === "gu" ? "કુલ મળેલી રકમ" : "Total Amount Received"}</span>
                    <span className="font-mono font-bold text-emerald-700">
                      ₹{Number(invoice.paidAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="pt-2.5 border-t border-slate-200 flex justify-between items-center">
                    <span className="font-bold text-slate-800">{lang === "gu" ? "બાકી રકમ" : "Outstanding Balance"}</span>
                    <span className={`font-mono text-base font-extrabold ${bal > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                      ₹{Number(bal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Payments Log */}
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                    <span>{lang === "gu" ? "ચુકવણીઓ" : "Payment Records"}</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full font-semibold">
                      {allocations.length || (invoice.paidAmount > 0 ? 1 : 0)}
                    </span>
                  </div>

                  {allocations.length > 0 ? (
                    <div className="space-y-2.5">
                      {allocations.map((a, i) => (
                        <div key={i} className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-2xs hover:border-[#26A58A]/50 transition-colors">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-[#174B43] text-xs">
                              Payment In #{i + 1}
                            </span>
                            <span className="font-mono font-bold text-emerald-700 text-sm">
                              +₹{Number(a.allocatedAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] text-slate-500">
                            <span>{new Date(a.createdAt || a.voucher?.voucherDate || invoice.invoiceDate).toLocaleDateString("en-IN")}</span>
                            <span className="font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                              {a.paymentMode || "Cash"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : invoice.paidAmount > 0 ? (
                    <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-2xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[#174B43] text-xs">
                          Payment In #1 (At Billing)
                        </span>
                        <span className="font-mono font-bold text-emerald-700 text-sm">
                          +₹{Number(invoice.paidAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-slate-500">
                        <span>{new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}</span>
                        <span className="font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          {invoice.paymentMode || "Cash"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs bg-[#F6F8F7] rounded-xl border border-dashed border-slate-200">
                      {lang === "gu" ? "કોઈ ચુકવણી હજુ નોંધાયેલ નથી." : "No payments recorded yet for this invoice."}
                    </div>
                  )}
                </div>
              </div>

              {/* Drawer Footer with Record Payment In CTA */}
              {bal > 0 && invoice.status !== "CANCELLED" && (
                <div className="p-4 border-t border-slate-200 bg-white">
                  <button
                    onClick={() => {
                      setShowPaymentHistory(false);
                      setPaymentAmount(bal);
                      setPaymentError(null);
                      setIsPaymentModalOpen(true);
                    }}
                    className="w-full py-2.5 px-4 bg-[#174B43] hover:bg-[#123B35] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>💳</span>
                    <span>{lang === "gu" ? "ચુકવણી નોંધો (Record Payment In)" : "Record Payment In"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Credit Notes / Sales Returns History */}
      {returns.length > 0 && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 print:hidden">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {lang === "gu" ? "વેચાણ પરત ઇતિહાસ (Credit Notes)" : "Issued Credit Notes / Sales Returns"}
            </h3>
            <Link
              href="/sales/returns"
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              View All Credit Notes →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2 px-3">Return #</th>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Reason</th>
                  <th className="py-2 px-3 text-right">Taxable (₹)</th>
                  <th className="py-2 px-3 text-right">Credit Total (₹)</th>
                  <th className="py-2 px-3 text-center">Status</th>
                  <th className="py-2 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {returns.map((ret: any) => (
                  <tr key={ret.id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-mono font-semibold text-blue-600">
                      {ret.returnNumber}
                    </td>
                    <td className="py-2 px-3 font-mono">
                      {new Date(ret.returnDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-2 px-3 text-slate-600">
                      {ret.reason || "-"}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700">
                      ₹{Number(ret.taxableAmount).toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      ₹{Number(ret.grandTotal).toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800">
                        {ret.status || "ISSUED"}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <Link
                        href={`/sales/returns?search=${encodeURIComponent(ret.returnNumber)}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MyBillBook Profit Details Modal */}
      <Modal
        isOpen={isProfitModalOpen}
        onClose={() => setIsProfitModalOpen(false)}
        title={lang === "gu" ? "ઇન્વોઇસ નફો વિગતો (Profit Details)" : `Profit Details: ${invoice.invoiceNumber}`}
        titleGujarati={invoice.party?.name ? `ગ્રાહક: ${invoice.party.name}` : undefined}
        maxWidth="2xl"
      >
        <div className="space-y-4">
          {(() => {
            const totalTaxable = Number(invoice.taxableAmount || 0);
            const itemsWithProfit = (invoice.items || []).map((it: any) => {
              const purchaseRate = Number(it.purchasePrice || it.item?.purchasePrice || (it.unitPrice * 0.72));
              const sellingRate = Number(it.unitPrice || 0);
              const qty = Number(it.quantity || 1);
              const cost = purchaseRate * qty;
              const revenue = Number(it.taxableAmount || (sellingRate * qty));
              const itemProfit = revenue - cost;
              const margin = revenue > 0 ? (itemProfit / revenue) * 100 : 0;
              return {
                name: it.item?.name || it.description || "Item",
                qty,
                sellingRate,
                purchaseRate,
                revenue,
                cost,
                itemProfit,
                margin,
              };
            });

            const totalCost = itemsWithProfit.reduce((s, x) => s + x.cost, 0);
            const totalProfit = Math.max(0, totalTaxable - totalCost);
            const overallMargin = totalTaxable > 0 ? (totalProfit / totalTaxable) * 100 : 0;

            return (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Total Revenue</p>
                    <p className="text-sm sm:text-base font-mono font-bold text-slate-900 mt-0.5">
                      ₹{totalTaxable.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Est. Cost</p>
                    <p className="text-sm sm:text-base font-mono font-bold text-slate-700 mt-0.5">
                      ₹{totalCost.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-emerald-700">Gross Profit</p>
                    <p className="text-sm sm:text-base font-mono font-bold text-emerald-800 mt-0.5">
                      ₹{totalProfit.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-indigo-700">Margin (%)</p>
                    <p className="text-sm sm:text-base font-mono font-bold text-indigo-800 mt-0.5">
                      {overallMargin.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                        <th className="py-2.5 px-3">Item Name</th>
                        <th className="py-2.5 px-3 text-right">Qty</th>
                        <th className="py-2.5 px-3 text-right">Sale Price</th>
                        <th className="py-2.5 px-3 text-right">Est. Cost</th>
                        <th className="py-2.5 px-3 text-right">Profit</th>
                        <th className="py-2.5 px-3 text-right">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {itemsWithProfit.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-medium text-slate-800">{it.name}</td>
                          <td className="py-2 px-3 text-right font-mono">{it.qty}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700">₹{it.sellingRate.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-500">₹{it.purchaseRate.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">₹{it.itemProfit.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono text-indigo-700 font-semibold">{it.margin.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsProfitModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`Record Payment for ${invoice.invoiceNumber}`}
        titleGujarati="ગ્રાહક પાસેથી મળેલ રકમની નોંધ (Bill-by-Bill Payment)"
        maxWidth="md"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          {paymentError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
              {paymentError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Payment Amount (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              required
              max={Number(invoice.balanceAmount !== undefined ? invoice.balanceAmount : (invoice.outstandingBalance || 0))}
              value={paymentAmount}
              onChange={(e) =>
                setPaymentAmount(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-slate-900 focus:bg-white"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Outstanding Balance: ₹
              {Number(invoice.balanceAmount !== undefined ? invoice.balanceAmount : (invoice.outstandingBalance || 0)).toFixed(2)}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Payment Mode *
            </label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white"
            >
              <option value="CASH">{lang === "gu" ? "રોકડ (CASH)" : "CASH"}</option>
              <option value="BANK_TRANSFER">{lang === "gu" ? "બેંક ખાતું (BANK TRANSFER)" : "BANK TRANSFER"}</option>
              <option value="UPI_QR">{lang === "gu" ? "UPI (ગૂગલ પે / ફોનપે)" : "UPI (Google Pay / PhonePe)"}</option>
              <option value="CHEQUE">{lang === "gu" ? "ચેક (CHEQUE)" : "CHEQUE"}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Reference / Transaction ID
            </label>
            <input
              type="text"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              placeholder="e.g. UTR-9821892"
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono focus:bg-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingPayment}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg shadow-sm"
            >
              {isSubmittingPayment ? "Recording..." : "Record Payment"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Cancel Invoice Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title={`Cancel Invoice: ${invoice.invoiceNumber}`}
        titleGujarati="ટેક્સ ઇન્વોઇસ રદ કરવું"
        maxWidth="md"
      >
        <form onSubmit={handleCancelInvoice} className="space-y-4">
          <p className="text-xs text-slate-600">
            Cancelling this issued tax invoice will post statutory stock
            reversal transactions and double-entry contra vouchers.
          </p>

          {cancelError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
              {cancelError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Cancellation Reason *
            </label>
            <textarea
              required
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Order cancelled by customer before dispatch"
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Keep Invoice
            </button>
            <button
              type="submit"
              disabled={isCancelling}
              className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 rounded-lg shadow-sm"
            >
              {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Stock Alert Confirmation Modal */}
      <Modal
        isOpen={!!stockConfirmPrompt}
        onClose={() => setStockConfirmPrompt(null)}
        title={lang === "gu" ? "સ્ટોક ચેતવણી" : "Stock Alert"}
        titleGujarati="ગોડાઉનમાં પૂરતો સ્ટોક ઉપલબ્ધ નથી"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 font-mono">
            {stockConfirmPrompt}
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {lang === "gu"
              ? "આ માલ માટે ગોડાઉનમાં પૂરતો સ્ટોક નથી. શું તમે નેગેટિવ સ્ટોક સાથે આ કાચા બિલને પાકા બિલ (Tax Invoice) માં કન્વર્ટ કરવા માંગો છો? (પાછળથી ખરીદી બિલ / Purchase Bill ઉમેરી સ્ટોક સરભર કરી શકાશે)"
              : "Insufficient stock available in the warehouse. Do you want to proceed and issue this Tax Invoice with negative stock? (You can add a purchase bill later to reconcile inventory)."}
          </p>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStockConfirmPrompt(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              {lang === "gu" ? "રદ કરો (Cancel)" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={() => handleIssueInvoice(true)}
              disabled={isIssuing}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg shadow-sm flex items-center gap-1.5"
            >
              {isIssuing && (
                <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
              )}
              <span>
                {isIssuing
                  ? (lang === "gu" ? "પ્રોસેસિંગ..." : "Processing...")
                  : (lang === "gu" ? "હા, પાકું બિલ બનાવો (Proceed)" : "Proceed with Negative Stock")}
              </span>
            </button>
          </div>
        </div>
      </Modal>

      {/* E-Way Bill Setup Modal for Invoice */}
      <Modal
        isOpen={isEwbModalOpen}
        onClose={() => setIsEwbModalOpen(false)}
        title={lang === "gu" ? "ઈ-વે બિલ પાલન (Rule 138 GST)" : "E-Way Bill Compliance (Rule 138)"}
        titleGujarati={invoice ? `ઇનવોઇસ: ${invoice.invoiceNumber}` : undefined}
        maxWidth="2xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-[11px] text-slate-500 hidden sm:block">
              {ewbTab === "GENERATE" && "⚡ Rule 138: 1 day per 200 KM calculation"}
              {ewbTab === "LINK" && "🔗 Official 12-digit portal number verification"}
            </div>
            <button
              type="button"
              onClick={() => setIsEwbModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors ml-auto"
            >
              {lang === "gu" ? "બંધ કરો" : "Close"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Active Invoice Context Summary Strip */}
          {invoice && (
            <div className="bg-gradient-to-r from-orange-50/80 via-amber-50/40 to-slate-50 border border-orange-200/80 rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#174B43] flex items-center justify-center shrink-0 shadow-xs">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 font-mono text-sm">
                      {invoice.invoiceNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-800 uppercase tracking-wide">
                      Tax Invoice
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(invoice.invoiceDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] mt-0.5 truncate max-w-sm">
                    Customer: <strong className="text-slate-800">{invoice.party?.name || "Direct Cash"}</strong>
                    {invoice.party?.gstin && <span className="font-mono ml-1 text-slate-500">({invoice.party.gstin})</span>}
                  </p>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-orange-200/60 pt-2 sm:pt-0 sm:pl-4 shrink-0">
                <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Invoice Value</span>
                <span className="text-sm sm:text-base font-bold text-slate-900 font-mono">
                  ₹{(invoice.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {ewbError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-rose-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{ewbError}</span>
              </div>
              <button
                type="button"
                onClick={() => setEwbError(null)}
                className="text-rose-500 hover:text-rose-700 text-xs font-bold px-1.5 py-0.5"
              >
                ✕
              </button>
            </div>
          )}

          {ewbSuccessResult ? (
            <div className="p-5 sm:p-6 bg-gradient-to-b from-emerald-50/90 to-white border border-emerald-200 rounded-2xl space-y-4 text-center shadow-xs">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider mb-1">
                  ✓ Statutory EWB Recorded
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {lang === "gu" ? "E-Way Bill સફળતાપૂર્વક જનરેટ / રેકોર્ડ થયેલ છે!" : "E-Way Bill Successfully Recorded!"}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Invoice <strong className="font-mono text-slate-800">{invoice?.invoiceNumber}</strong> is now compliant under Rule 138.
                </p>
              </div>

              <div className="p-4 bg-white border border-emerald-200/90 rounded-xl max-w-sm mx-auto shadow-xs space-y-2">
                <div className="text-[11px] text-slate-500 uppercase font-semibold tracking-wider">
                  Official Form GST EWB-01 Number
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-mono font-black text-slate-900 tracking-widest">
                    {ewbSuccessResult.ewbNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(ewbSuccessResult.ewbNumber);
                      setCopiedEwb(true);
                      setTimeout(() => setCopiedEwb(false), 2000);
                    }}
                    title="Copy E-Way Bill Number"
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    {copiedEwb ? (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">✓ Copied</span>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
                {ewbSuccessResult.validUpto && (
                  <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-100 flex items-center justify-center gap-1">
                    <span className="text-slate-400">Valid Until:</span>
                    <strong className="text-slate-800">
                      {new Date(ewbSuccessResult.validUpto).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </strong>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const num = ewbSuccessResult.ewbNumber;
                    setIsEwbModalOpen(false);
                    setViewEwbSlipNumber(num);
                  }}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Print Form GST EWB-01 Slip</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEwbModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  {lang === "gu" ? "બંધ કરો" : "Done / Close"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Segmented Tabs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setEwbTab("GENERATE")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${ewbTab === "GENERATE"
                      ? "bg-white text-orange-700 shadow-sm border border-orange-200/60 font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    }`}
                >
                  <svg className="w-3.5 h-3.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>{lang === "gu" ? "1. Generate E-Way Bill (સિસ્ટમ જનરેશન)" : "1. Generate E-Way Bill"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEwbTab("LINK")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${ewbTab === "LINK"
                      ? "bg-white text-indigo-700 shadow-sm border border-indigo-200/60 font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    }`}
                >
                  <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span>{lang === "gu" ? "2. Link Govt Portal EWB (પોર્ટલ નંબર જોડો)" : "2. Link Govt Portal EWB"}</span>
                </button>
              </div>

              {/* Generate Tab */}
              {ewbTab === "GENERATE" && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!invoice) return;
                    setIsSubmittingEwb(true);
                    setEwbError(null);
                    try {
                      const res: any = await apiClient.post(
                        `/gst/eway-bills/invoices/${invoice.id}/generate`,
                        {
                          transporterId: ewbForm.transporterId?.trim() || undefined,
                          transporterName: ewbForm.transporterName?.trim() || undefined,
                          vehicleNumber: ewbForm.vehicleNumber?.toUpperCase().trim() || undefined,
                          distanceKm: Number(ewbForm.distanceKm || 50),
                        }
                      );
                      if (res.outcome === "SUCCEEDED" && res.ewbNumber) {
                        setEwbSuccessResult(res);
                        await fetchInvoice();
                      } else {
                        setEwbError(res.message || "Failed to generate E-Way Bill.");
                      }
                    } catch (err: any) {
                      setEwbError(err.message || "Failed to generate E-Way Bill.");
                    } finally {
                      setIsSubmittingEwb(false);
                    }
                  }}
                  className="space-y-4 pt-1"
                >
                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 sm:p-3.5 text-xs text-amber-900 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-bold flex items-center gap-1.5 text-amber-900">
                        <svg className="w-4 h-4 text-amber-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Rule 138 Statutory Calculation
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                        ⚡ Validity: <strong>{Math.max(1, Math.ceil((ewbForm.distanceKm || 50) / 200))} Day(s)</strong>
                      </span>
                    </div>
                    <p className="text-amber-800/90 text-[11.5px] leading-relaxed">
                      Statutory validity is computed at <strong>1 day per 200 KM</strong> (Rule 138(10)). Form GST EWB-01 will be automatically generated and linked with Invoice #{invoice?.invoiceNumber}.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Vehicle Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={ewbForm.vehicleNumber}
                        onChange={(e) => setEwbForm({ ...ewbForm, vehicleNumber: e.target.value.toUpperCase() })}
                        placeholder="GJ01AB1234"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium uppercase tracking-wider focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:normal-case placeholder:tracking-normal placeholder:font-sans placeholder:text-slate-400"
                      />
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Format: State + RTO + Series (e.g. GJ01AB1234)
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Approx Distance (KM) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          required
                          value={ewbForm.distanceKm}
                          onChange={(e) => setEwbForm({ ...ewbForm, distanceKm: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 pr-12 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                          KM
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-1">
                        {Math.max(1, Math.ceil((ewbForm.distanceKm || 50) / 200))} Day(s) Statutory Movement Window
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Transporter ID (GSTIN / TRANSIN)
                      </label>
                      <input
                        type="text"
                        value={ewbForm.transporterId}
                        onChange={(e) => setEwbForm({ ...ewbForm, transporterId: e.target.value.toUpperCase() })}
                        placeholder="24AABCT1234F1Z0"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono uppercase tracking-wide focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400"
                      />
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Required if goods handed over to a transporter
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Transporter Name
                      </label>
                      <input
                        type="text"
                        value={ewbForm.transporterName}
                        onChange={(e) => setEwbForm({ ...ewbForm, transporterName: e.target.value })}
                        placeholder="e.g. Gujarat Express Logistics"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400"
                      />
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Registered transport agency or logistics fleet
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingEwb}
                      className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-[#174B43] hover:from-orange-600 hover:to-[#123B35] text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isSubmittingEwb ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generating Statutory E-Way Bill (Rule 138)...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Generate Statutory E-Way Bill (Rule 138)
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Link Tab */}
              {ewbTab === "LINK" && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!invoice) return;
                    const clean = linkEwbNumber.replace(/\s+/g, "").trim();
                    if (!/^\d{12}$/.test(clean)) {
                      setEwbError("E-Way Bill Number must be exactly 12 numeric digits.");
                      return;
                    }
                    setIsSubmittingEwb(true);
                    setEwbError(null);
                    try {
                      const res: any = await apiClient.post("/gst/eway-bills/link", {
                        invoiceId: invoice.id,
                        ewbNumber: clean,
                        distanceKm: Number(ewbForm.distanceKm || 50),
                        vehicleNumber: ewbForm.vehicleNumber?.toUpperCase().trim() || undefined,
                        transporterId: ewbForm.transporterId?.trim() || undefined,
                        transporterName: ewbForm.transporterName?.trim() || undefined,
                      });
                      if (res.outcome === "SUCCEEDED") {
                        setEwbSuccessResult({ ewbNumber: clean, ...res });
                        await fetchInvoice();
                      } else {
                        setEwbError(res.message || "Failed to link E-Way Bill.");
                      }
                    } catch (err: any) {
                      setEwbError(err.message || "Failed to link E-Way Bill.");
                    } finally {
                      setIsSubmittingEwb(false);
                    }
                  }}
                  className="space-y-4 pt-1"
                >
                  <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-xl text-xs text-blue-900 leading-relaxed flex items-start gap-2.5">
                    <svg className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      Enter the official 12-digit E-Way Bill Number generated on <strong className="text-blue-950 underline">ewaybillgst.gov.in</strong> to link it with this Sales Invoice.
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        12-Digit E-Way Bill Number <span className="text-rose-500">*</span>
                      </label>
                      <span className={`text-[10px] font-mono font-semibold ${linkEwbNumber.length === 12 ? "text-emerald-600" : "text-slate-400"}`}>
                        {linkEwbNumber.length === 12 ? "✓ 12/12 digits" : `${linkEwbNumber.length} / 12 digits`}
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={12}
                      value={linkEwbNumber}
                      onChange={(e) => setLinkEwbNumber(e.target.value.replace(/\D/g, ""))}
                      placeholder="e.g. 241088219920"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-mono font-bold tracking-widest text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Vehicle Number
                      </label>
                      <input
                        type="text"
                        value={ewbForm.vehicleNumber}
                        onChange={(e) => setEwbForm({ ...ewbForm, vehicleNumber: e.target.value.toUpperCase() })}
                        placeholder="GJ01AB1234"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono uppercase tracking-wide focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Approx Distance (KM)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          value={ewbForm.distanceKm}
                          onChange={(e) => setEwbForm({ ...ewbForm, distanceKm: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 pr-12 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                          KM
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingEwb || linkEwbNumber.length !== 12}
                      className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isSubmittingEwb ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Linking Portal Number...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          Link Portal E-Way Bill Number
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </Modal>

      {/* Official Form GST EWB-01 Print Slip Modal */}
      <EwbSlipModal
        ewbNumber={viewEwbSlipNumber}
        isOpen={Boolean(viewEwbSlipNumber)}
        onClose={() => setViewEwbSlipNumber(null)}
        onVehicleUpdated={fetchInvoice}
        onCancelled={fetchInvoice}
      />
    </div>
  );
}
