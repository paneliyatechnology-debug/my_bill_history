"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../context/auth-context";
import { apiClient } from "../../../../lib/api-client";
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

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 1200,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
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
      console.error("PDF generation failed:", err);
      setActionError(
        lang === "gu"
          ? "PDF બનાવવામાં સમસ્યા આવી. કૃપા કરીને પ્રિન્ટ ઓપ્શન વાપરો."
          : `Failed to generate PDF: ${err.message || "Unknown error"}`,
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const fetchInvoice = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [invRes, allocRes, retRes, compRes]: any = await Promise.all([
        apiClient.get(`/invoices/sales/${id}`),
        apiClient.get(`/invoices/sales/${id}/allocations`).catch(() => []),
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
        `/invoices/sales/${invoice.id}/issue`,
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
        `/invoices/sales/${invoice.id}/payments`,
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
        `/invoices/sales/${invoice.id}/cancel`,
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
        <div className="inline-block w-8 h-8 border-2 border-[#F47721] border-t-transparent rounded-full animate-spin mb-3" />
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto print:space-y-0 print:max-w-none print:w-full print:m-0 print:p-0">
      {/* Top Action Bar (Hidden on Print) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3.5 print:hidden">
        {/* Row 1: Invoice Identity, Status & Operational Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/sales/invoices"
              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all flex items-center gap-1 border border-slate-200"
            >
              <span>←</span>
              <span>{lang === "gu" ? "બિલો" : "Invoices"}</span>
            </Link>
            <span className="text-slate-300 font-light">/</span>
            <span className="font-mono font-bold text-slate-900 text-sm tracking-tight">
              {invoice.invoiceNumber}
            </span>
            <StatusBadge status={invoice.status} />
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 bg-slate-100 text-slate-800 rounded-md border border-slate-200">
              ₹{Number(invoice.grandTotal).toFixed(2)}
            </span>
          </div>

          {/* Quick Management Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {invoice.status === "DRAFT" && (
              <button
                onClick={() => handleIssueInvoice(false)}
                disabled={isIssuing}
                className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover active:bg-primary-pressed text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
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
                      ? (lang === "gu" ? "પાકું બિલ બનાવો (Tax Invoice)" : "Convert to Tax Invoice")
                      : "Issue Tax Invoice"}
                </span>
              </button>
            )}

            {["ISSUED", "PARTIALLY_PAID"].includes(invoice.status) && (
              <button
                onClick={() => {
                  const bal = invoice.balanceAmount !== undefined ? Number(invoice.balanceAmount) : Number(invoice.outstandingBalance || 0);
                  setPaymentAmount(bal);
                  setPaymentError(null);
                  setIsPaymentModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>💳</span>
                <span>{lang === "gu" ? "ચુકવણી નોંધો" : "Record Payment"}</span>
              </button>
            )}

            {invoice.status !== "DRAFT" && invoice.status !== "CANCELLED" && (
              invoice.eWayBillRecord?.ewbNumber && invoice.eWayBillRecord.status === "ACT" ? (
                <button
                  onClick={() => setViewEwbSlipNumber(invoice.eWayBillRecord!.ewbNumber)}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  title="View & Print Official Form GST EWB-01 Slip"
                >
                  <span>🚚</span>
                  <span>EWB: {invoice.eWayBillRecord.ewbNumber}</span>
                </button>
              ) : (
                <button
                  onClick={() => {
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
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                    invoice.grandTotal >= 50000
                      ? "bg-orange-500 hover:bg-orange-600 text-white"
                      : "bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200"
                  }`}
                  title={
                    invoice.grandTotal >= 50000
                      ? "Mandatory Rule 138 E-Way Bill (> ₹50,000)"
                      : "Generate or Link E-Way Bill"
                  }
                >
                  <span>🚚</span>
                  <span>{lang === "gu" ? "+ ઈ-વે બિલ" : "+ E-Way Bill"}</span>
                </button>
              )
            )}

            {invoice.status !== "CANCELLED" && (
              <Link
                href={`/sales/invoices/${invoice.id}/edit`}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
              >
                <span>✏️</span>
                <span>{lang === "gu" ? "સુધારો (Edit)" : "Edit Invoice"}</span>
              </Link>
            )}

            {!["CANCELLED", "DRAFT"].includes(invoice.status) && (
              <Link
                href={`/sales/returns?invoiceId=${invoice.id}`}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
              >
                <span>↩</span>
                <span>{lang === "gu" ? "ક્રેડિટ નોટ" : "Credit Note"}</span>
              </Link>
            )}

            {!["CANCELLED", "DRAFT"].includes(invoice.status) && (
              <button
                onClick={() => {
                  setCancelReason("");
                  setCancelError(null);
                  setIsCancelModalOpen(true);
                }}
                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                {lang === "gu" ? "બિલ રદ કરો" : "Cancel Invoice"}
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Theme Customization & Export / Print Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-0.5">
          {/* Left: Theme Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              {lang === "gu" ? "ઇન્વોઇસ થીમ:" : "Theme:"}
            </span>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs hover:border-slate-300 transition-colors">
              <span
                className="w-3 h-3 rounded-full shrink-0 border border-black/10 shadow-xs"
                style={{ backgroundColor: primaryColor }}
              />
              <select
                value={customization.themeId}
                onChange={(e) => {
                  const themeId = e.target.value as InvoiceThemeId;
                  const preset = INVOICE_THEMES[themeId];
                  const updated: InvoiceCustomization = {
                    ...customization,
                    themeId,
                    customPrimaryColor: undefined,
                    headerLayout: preset.headerLayout,
                    fontFamily: preset.fontFamily,
                  };
                  setCustomization(updated);
                  saveInvoiceCustomization(updated);
                }}
                className="bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer"
              >
                {(Object.keys(INVOICE_THEMES) as InvoiceThemeId[]).map((tk) => (
                  <option key={tk} value={tk}>
                    {lang === "gu" ? INVOICE_THEMES[tk].nameGujarati : INVOICE_THEMES[tk].name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right: Primary Sharing & Print Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                if (!invoice) return;
                const companyName =
                  currentCompany?.tradeName ||
                  currentCompany?.legalName ||
                  "MyBill History";
                const bal = Number(invoice.balanceAmount !== undefined ? invoice.balanceAmount : (invoice.outstandingBalance || 0)).toFixed(2);
                const text = `*Invoice from ${companyName}*\nInvoice No: ${invoice.invoiceNumber}\nDate: ${new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}\nGrand Total: ₹${Number(invoice.grandTotal).toFixed(2)}\nOutstanding Balance: ₹${bal}\n\nThank you for your business!`;
                const phone = invoice.party?.phone
                  ? invoice.party.phone.replace(/[^0-9]/g, "")
                  : "";
                const waUrl = phone
                  ? `https://wa.me/${phone.startsWith("91") ? phone : "91" + phone}?text=${encodeURIComponent(text)}`
                  : `https://wa.me/?text=${encodeURIComponent(text)}`;
                window.open(waUrl, "_blank");
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Share via WhatsApp"
            >
              <span>💬</span>
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 active:bg-black text-white text-xs font-bold rounded-xl shadow-card flex items-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
              title="Download clean single-page PDF"
            >
              {isGeneratingPdf ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{lang === "gu" ? "PDF બની રહ્યું છે..." : "Generating PDF..."}</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>{lang === "gu" ? "PDF ડાઉનલોડ કરો" : "Download PDF"}</span>
                </>
              )}
            </button>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Print A4 Format"
            >
              <svg
                className="w-4 h-4 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              <span>{lang === "gu" ? "પ્રિન્ટ (A4)" : "Print (A4)"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Action Feedback Messages */}
      {actionError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between shadow-sm print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-500 hover:text-rose-700 font-bold px-2 py-0.5 rounded"
          >
            ✕
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between shadow-sm print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-base">✓</span>
            <span className="font-semibold">{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-500 hover:text-emerald-700 font-bold px-2 py-0.5 rounded"
          >
            ✕
          </button>
        </div>
      )}

      {/* A4 Tax Invoice Container */}
      <div
        id="printable-invoice"
        className={`bg-white p-6 sm:p-8 rounded-2xl border ${
          customization.themeId === "modern-saffron"
            ? "border-orange-200"
            : customization.themeId === "classic-corporate"
              ? "border-slate-300"
              : customization.themeId === "emerald-trade"
                ? "border-emerald-300"
                : customization.themeId === "royal-violet"
                  ? "border-indigo-200"
                  : "border-slate-300"
        } shadow-lg text-slate-900 ${customization.fontFamily || "font-sans"} printable-invoice print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:max-w-none print:rounded-none relative`}
      >
        {/* HEADER: Theme 1 - Modern Saffron (Warm Vibrant Banner) */}
        {customization.themeId === "modern-saffron" && (
          <div
            className="rounded-2xl p-5 mb-4 text-white shadow-sm relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #F47721 0%, #D95F12 100%)" }}
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
              <div className="space-y-1">
                <div className="inline-block px-2.5 py-0.5 bg-white/20 backdrop-blur-xs rounded-full text-[10px] font-bold uppercase tracking-widest text-amber-100 mb-1">
                  ★ GST Tax Compliant Invoice
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-white drop-shadow-xs">
                  {activeComp?.tradeName || activeComp?.legalName || currentCompany?.tradeName || "MyBill History Enterprise"}
                </h2>
                {activeComp?.addressLine1 && (
                  <p className="text-xs text-orange-100 max-w-sm">
                    {activeComp.addressLine1}
                    {activeComp.addressLine2 ? `, ${activeComp.addressLine2}` : ""}
                    {activeComp.city ? `, ${activeComp.city}` : ""}
                    {activeComp.pincode ? ` - ${activeComp.pincode}` : ""}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-orange-50 font-mono pt-0.5">
                  {(activeComp?.gstin || currentCompany?.gstin) && (
                    <span className="bg-black/20 px-2 py-0.5 rounded font-bold">
                      GSTIN: {activeComp?.gstin || currentCompany?.gstin}
                    </span>
                  )}
                  {activeComp?.pan && (
                    <span className="bg-black/20 px-2 py-0.5 rounded font-bold">
                      PAN: {activeComp.pan}
                    </span>
                  )}
                  <span>State: Gujarat (24)</span>
                </div>
                {(activeComp?.phone || activeComp?.email) && (
                  <p className="text-[11px] text-orange-100 pt-0.5 font-mono">
                    {activeComp?.phone && <span>📞 {activeComp.phone}</span>}
                    {activeComp?.phone && activeComp?.email && <span className="mx-2">•</span>}
                    {activeComp?.email && <span>✉️ {activeComp.email}</span>}
                  </p>
                )}
              </div>

              <div className="bg-white/15 backdrop-blur-md px-4 py-3 rounded-xl border border-white/25 text-right sm:text-right shrink-0 shadow-xs min-w-[200px]">
                <span className="block text-lg font-black uppercase tracking-wider text-white">
                  {getDocTitle()}
                </span>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-amber-200 mt-0.5">
                  ORIGINAL FOR RECIPIENT
                </span>
                <div className="mt-2 pt-2 border-t border-white/20 text-xs space-y-0.5 font-mono">
                  <div className="bg-white text-orange-950 font-bold px-2 py-0.5 rounded text-xs inline-block">
                    #{invoice.invoiceNumber}
                  </div>
                  <div className="text-orange-100 mt-1">
                    Date: <strong className="text-white">{new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}</strong>
                  </div>
                  <div className="text-orange-100">
                    POS: <strong className="text-white">{invoice.placeOfSupply}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HEADER: Theme 2 - Classic Corporate (Executive Split with Navy Top Stripe) */}
        {customization.themeId === "classic-corporate" && (
          <div className="border-b-2 border-slate-300 pb-4 mb-4">
            <div className="h-2 rounded-t-xl bg-[#1E3A8A] -mt-6 -mx-6 sm:-mt-8 sm:-mx-8 mb-4" />
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 border border-blue-200 rounded-md text-[10px] font-bold uppercase tracking-widest text-[#1E3A8A] mb-1.5">
                  <span>🏢</span> Corporate Tax Invoice
                </div>
                <h2 className="text-2xl font-black tracking-tight uppercase text-[#1E3A8A]">
                  {activeComp?.tradeName || activeComp?.legalName || currentCompany?.tradeName || "MyBill History Enterprise"}
                </h2>
                {activeComp?.addressLine1 && (
                  <p className="text-xs text-slate-600 mt-1 max-w-sm">
                    {activeComp.addressLine1}
                    {activeComp.addressLine2 ? `, ${activeComp.addressLine2}` : ""}
                    {activeComp.city ? `, ${activeComp.city}` : ""}
                    {activeComp.pincode ? ` - ${activeComp.pincode}` : ""}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-700 mt-2 font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500 font-sans text-[11px] block">GSTIN:</span>
                    <span className="font-bold text-[#1E3A8A]">{activeComp?.gstin || currentCompany?.gstin || "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans text-[11px] block">PAN:</span>
                    <span className="font-bold text-slate-900">{activeComp?.pan || "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans text-[11px] block">State:</span>
                    <span className="font-semibold text-slate-800">Gujarat (24)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans text-[11px] block">Contact:</span>
                    <span className="text-slate-800 font-semibold">{activeComp?.phone || "-"}</span>
                  </div>
                </div>
              </div>

              <div className="text-right sm:text-right shrink-0">
                <div className="bg-[#1E3A8A] text-white px-4 py-2 rounded-lg inline-block text-right shadow-xs">
                  <h1 className="text-xl font-black uppercase tracking-wider leading-none">
                    {getDocTitle()}
                  </h1>
                  <p className="text-[9px] font-bold tracking-widest text-blue-200 uppercase mt-1">
                    ORIGINAL FOR RECIPIENT
                  </p>
                </div>
                <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 space-y-1 font-mono text-right">
                  <p>
                    <span className="text-slate-500 font-sans">Invoice No:</span>{" "}
                    <strong className="text-[#1E3A8A] font-bold">{invoice.invoiceNumber}</strong>
                  </p>
                  <p>
                    <span className="text-slate-500 font-sans">Date:</span>{" "}
                    <strong className="text-slate-900">{new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}</strong>
                  </p>
                  <p>
                    <span className="text-slate-500 font-sans">Place of Supply:</span>{" "}
                    <strong className="text-slate-900">{invoice.placeOfSupply}</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HEADER: Theme 3 - Emerald Trade (Framed Box with Mint Accents) */}
        {customization.themeId === "emerald-trade" && (
          <div className="rounded-2xl border-2 border-emerald-600 p-4 sm:p-5 mb-4 bg-[#F0FDF4]/70 shadow-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-600 text-white rounded-md text-[10px] font-bold uppercase tracking-widest mb-1.5 shadow-2xs">
                  <span>🌿</span> Emerald Trade Certified
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-emerald-950">
                  {activeComp?.tradeName || activeComp?.legalName || currentCompany?.tradeName || "MyBill History Enterprise"}
                </h2>
                {activeComp?.addressLine1 && (
                  <p className="text-xs text-emerald-900/80 mt-1 max-w-sm">
                    {activeComp.addressLine1}
                    {activeComp.addressLine2 ? `, ${activeComp.addressLine2}` : ""}
                    {activeComp.city ? `, ${activeComp.city}` : ""}
                    {activeComp.pincode ? ` - ${activeComp.pincode}` : ""}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-900 mt-2 font-mono">
                  {(activeComp?.gstin || currentCompany?.gstin) && (
                    <span className="bg-white border border-emerald-300 px-2.5 py-0.5 rounded-full font-bold shadow-2xs">
                      GSTIN: {activeComp?.gstin || currentCompany?.gstin}
                    </span>
                  )}
                  {activeComp?.pan && (
                    <span className="bg-white border border-emerald-300 px-2.5 py-0.5 rounded-full font-bold shadow-2xs">
                      PAN: {activeComp.pan}
                    </span>
                  )}
                  <span className="bg-white border border-emerald-300 px-2 py-0.5 rounded-full">
                    State: 24 (Gujarat)
                  </span>
                </div>
              </div>

              <div className="text-right sm:text-right shrink-0">
                <div className="bg-emerald-600 text-white px-4 py-2 rounded-xl inline-block text-right shadow-xs">
                  <h1 className="text-xl font-black uppercase tracking-wider leading-none">
                    {getDocTitle()}
                  </h1>
                  <p className="text-[9px] font-bold tracking-widest text-emerald-100 uppercase mt-1">
                    ORIGINAL FOR RECIPIENT
                  </p>
                </div>
                <div className="mt-2.5 bg-white border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-900 space-y-1 font-mono text-right shadow-2xs">
                  <p>
                    <span className="text-emerald-700 font-sans">Invoice No:</span>{" "}
                    <strong className="text-emerald-950 font-bold">{invoice.invoiceNumber}</strong>
                  </p>
                  <p>
                    <span className="text-emerald-700 font-sans">Date:</span>{" "}
                    <strong className="text-emerald-950">{new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}</strong>
                  </p>
                  <p>
                    <span className="text-emerald-700 font-sans">Place of Supply:</span>{" "}
                    <strong className="text-emerald-950">{invoice.placeOfSupply}</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HEADER: Theme 4 - Royal Violet (Modern Luxe Gradient Ribbon) */}
        {customization.themeId === "royal-violet" && (
          <div
            className="rounded-2xl p-5 mb-4 text-white shadow-md relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #4338CA 0%, #6366F1 50%, #7C3AED 100%)" }}
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
              <div className="space-y-1">
                <div className="inline-block px-2.5 py-0.5 bg-white/20 backdrop-blur-xs rounded-full text-[10px] font-bold uppercase tracking-widest text-indigo-100 mb-1">
                  ✨ Premium Enterprise Billing
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-white drop-shadow-xs">
                  {activeComp?.tradeName || activeComp?.legalName || currentCompany?.tradeName || "MyBill History Enterprise"}
                </h2>
                {activeComp?.addressLine1 && (
                  <p className="text-xs text-indigo-100 max-w-sm">
                    {activeComp.addressLine1}
                    {activeComp.addressLine2 ? `, ${activeComp.addressLine2}` : ""}
                    {activeComp.city ? `, ${activeComp.city}` : ""}
                    {activeComp.pincode ? ` - ${activeComp.pincode}` : ""}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-indigo-100 font-mono pt-0.5">
                  {(activeComp?.gstin || currentCompany?.gstin) && (
                    <span className="bg-black/25 px-2.5 py-0.5 rounded-md font-bold">
                      GSTIN: {activeComp?.gstin || currentCompany?.gstin}
                    </span>
                  )}
                  {activeComp?.pan && (
                    <span className="bg-black/25 px-2.5 py-0.5 rounded-md font-bold">
                      PAN: {activeComp.pan}
                    </span>
                  )}
                  <span>State: Gujarat (24)</span>
                </div>
              </div>

              <div className="bg-white/20 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/30 text-right sm:text-right shrink-0 shadow-sm min-w-[200px]">
                <span className="block text-lg font-black uppercase tracking-wider text-white">
                  {getDocTitle()}
                </span>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-indigo-200 mt-0.5">
                  ORIGINAL FOR RECIPIENT
                </span>
                <div className="mt-2 pt-2 border-t border-white/20 text-xs space-y-0.5 font-mono">
                  <div className="bg-white text-indigo-950 font-bold px-2 py-0.5 rounded text-xs inline-block">
                    #{invoice.invoiceNumber}
                  </div>
                  <div className="text-indigo-100 mt-1">
                    Date: <strong className="text-white">{new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}</strong>
                  </div>
                  <div className="text-indigo-100">
                    POS: <strong className="text-white">{invoice.placeOfSupply}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HEADER: Theme 5 - Charcoal Minimal & Default (Architectural High-Contrast Monochrome) */}
        {(customization.themeId === "charcoal-minimal" ||
          !["modern-saffron", "classic-corporate", "emerald-trade", "royal-violet"].includes(
            customization.themeId,
          )) && (
          <div className="border-b-4 border-slate-900 pb-4 mb-4 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight uppercase text-slate-900">
                {activeComp?.tradeName ||
                  activeComp?.legalName ||
                  currentCompany?.tradeName ||
                  "MyBill History Enterprise"}
              </h2>
              {activeComp?.addressLine1 && (
                <p className="text-xs text-slate-600 mt-1 max-w-sm">
                  {activeComp.addressLine1}
                  {activeComp.addressLine2 ? `, ${activeComp.addressLine2}` : ""}
                  {activeComp.city ? `, ${activeComp.city}` : ""}
                  {activeComp.pincode ? ` - ${activeComp.pincode}` : ""}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-slate-600 mt-1.5 font-mono">
                {(activeComp?.gstin || currentCompany?.gstin) && (
                  <p>
                    <span className="font-sans font-semibold text-slate-500">GSTIN:</span>{" "}
                    <span className="font-bold text-slate-900">
                      {activeComp?.gstin || currentCompany?.gstin}
                    </span>
                  </p>
                )}
                {activeComp?.pan && (
                  <p>
                    <span className="font-sans font-semibold text-slate-500">PAN:</span>{" "}
                    <span className="font-bold text-slate-900">{activeComp.pan}</span>
                  </p>
                )}
                <p>
                  <span className="font-sans font-semibold text-slate-500">State:</span>{" "}
                  <span className="font-semibold text-slate-800">
                    Gujarat (Code: {activeComp?.stateCode || currentCompany?.stateCode || "24"})
                  </span>
                </p>
              </div>
            </div>

            <div className="text-right sm:text-right shrink-0">
              <h1 className="text-3xl font-black uppercase tracking-wider text-slate-900 leading-none">
                {getDocTitle()}
              </h1>
              <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mt-1">
                ORIGINAL FOR RECIPIENT
              </p>
              <div className="text-xs text-slate-700 space-y-1 mt-2 font-mono">
                <div className="bg-slate-900 text-white font-bold px-2 py-0.5 rounded text-xs inline-block">
                  #{invoice.invoiceNumber}
                </div>
                <p>
                  <span className="text-slate-500 font-sans font-medium">Date:</span>{" "}
                  <span className="font-bold text-slate-900">
                    {new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}
                  </span>
                </p>
                <p>
                  <span className="text-slate-500 font-sans font-medium">Place of Supply:</span>{" "}
                  <span className="font-bold text-slate-900">{invoice.placeOfSupply}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Billed To / Customer Information */}
        <div
          className={`p-4 rounded-xl mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs ${
            customization.themeId === "modern-saffron"
              ? "bg-[#FFF8F3] border border-[#FED7AA] border-l-4 border-l-[#F47721]"
              : customization.themeId === "classic-corporate"
                ? "bg-[#F8FAFC] border-2 border-slate-300 border-l-4 border-l-[#1E3A8A]"
                : customization.themeId === "emerald-trade"
                  ? "bg-[#F0FDF4] border-2 border-emerald-300"
                  : customization.themeId === "royal-violet"
                    ? "bg-[#EEF2FF] border border-[#C7D2FE] border-l-4 border-l-indigo-600 rounded-2xl"
                    : "bg-white border-2 border-slate-900"
          }`}
        >
          <div>
            <p
              className={`font-bold uppercase tracking-wider mb-1 text-[11px] ${
                customization.themeId === "modern-saffron"
                  ? "text-[#D95F12]"
                  : customization.themeId === "classic-corporate"
                    ? "text-[#1E3A8A]"
                    : customization.themeId === "emerald-trade"
                      ? "text-emerald-800"
                      : customization.themeId === "royal-violet"
                        ? "text-indigo-800"
                        : "text-slate-800"
              }`}
            >
              {customization.themeId === "classic-corporate"
                ? "Consignee & Details of Receiver:"
                : customization.themeId === "emerald-trade"
                  ? "Buyer / Details of Receiver:"
                  : customization.themeId === "royal-violet"
                    ? "Valued Client / Details of Receiver:"
                    : "Details of Receiver (Billed To):"}
            </p>
            <p className="font-bold text-slate-900 text-sm">
              {invoice.party?.name || "Walk-in Cash Customer"}
            </p>
            {invoice.party?.gstin && (
              <p className="font-mono font-semibold text-emerald-800 mt-0.5">
                GSTIN: {invoice.party.gstin}
              </p>
            )}
            <p className="text-slate-600 mt-1">
              State Code:{" "}
              <span className="font-mono font-semibold">
                {invoice.party?.stateCode || invoice.placeOfSupply}
              </span>
            </p>
          </div>

          <div className="sm:text-right">
            <p className="font-bold text-slate-500 uppercase tracking-wider mb-1 text-[11px]">
              Invoice Status:
            </p>
            <StatusBadge status={invoice.status} />
            <p className="text-slate-600 mt-2">
              Payment Terms:{" "}
              <span className="font-semibold">{invoice.paymentMode}</span>
            </p>
          </div>
        </div>

        {/* Itemized Table */}
        <div
          className={`overflow-hidden mb-4 ${
            customization.themeId === "modern-saffron"
              ? "border border-[#FED7AA] rounded-xl"
              : customization.themeId === "classic-corporate"
                ? "border-2 border-slate-300 rounded-xl"
                : customization.themeId === "emerald-trade"
                  ? "border-2 border-emerald-300 rounded-xl"
                  : customization.themeId === "royal-violet"
                    ? "border border-[#C7D2FE] rounded-2xl"
                    : "border-2 border-slate-900 rounded-xl"
          }`}
        >
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr
                className="border-b text-xs uppercase tracking-wider font-bold"
                style={{
                  backgroundColor:
                    customization.themeId === "modern-saffron"
                      ? "#FFF7ED"
                      : customization.themeId === "classic-corporate"
                        ? "#1E3A8A"
                        : customization.themeId === "emerald-trade"
                          ? "#059669"
                          : customization.themeId === "royal-violet"
                            ? "#4F46E5"
                            : "#111827",
                  color:
                    customization.themeId === "modern-saffron"
                      ? "#7C2D12"
                      : "#FFFFFF",
                  borderBottom:
                    customization.themeId === "modern-saffron"
                      ? "2px solid #F47721"
                      : undefined,
                }}
              >
                <th className="py-2.5 px-3 w-8">#</th>
                <th className="py-2.5 px-3">Description of Goods / Services</th>
                <th className="py-2.5 px-3 w-20">HSN/SAC</th>
                <th className="py-2.5 px-3 w-16 text-right">Qty</th>
                <th className="py-2.5 px-3 w-24 text-right">Rate (₹)</th>
                <th className="py-2.5 px-3 w-16 text-right">Disc %</th>
                <th className="py-2.5 px-3 w-24 text-right">Taxable (₹)</th>
                <th className="py-2.5 px-3 w-24 text-right">GST % & Tax</th>
                <th className="py-2.5 px-3 w-28 text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y ${
                customization.themeId === "modern-saffron"
                  ? "divide-orange-100"
                  : customization.themeId === "classic-corporate"
                    ? "divide-slate-200"
                    : customization.themeId === "emerald-trade"
                      ? "divide-emerald-100"
                      : customization.themeId === "royal-violet"
                        ? "divide-indigo-100"
                        : "divide-slate-200"
              }`}
            >
              {invoice.items.map((item, idx) => {
                const itemTax =
                  Number(item.cgstAmount || 0) +
                  Number(item.sgstAmount || 0) +
                  Number(item.igstAmount || 0);
                return (
                  <tr
                    key={idx}
                    className={
                      customization.themeId === "modern-saffron"
                        ? "hover:bg-orange-50/50"
                        : customization.themeId === "classic-corporate"
                          ? "hover:bg-blue-50/40 even:bg-slate-50/60"
                          : customization.themeId === "emerald-trade"
                            ? "hover:bg-emerald-50/50"
                            : customization.themeId === "royal-violet"
                              ? "hover:bg-indigo-50/40"
                              : "hover:bg-slate-50"
                    }
                  >
                    <td className="py-2.5 px-3 text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {item.item?.name || item.description || "Product"}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {item.hsnCode}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      ₹{Number(item.unitPrice).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {item.discountPercent || 0}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold">
                      ₹{Number(item.taxableAmount).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      <div className="font-medium text-slate-800">{item.taxRate}%</div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        +₹{itemTax.toFixed(2)}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      ₹{Number(item.totalAmount).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Statutory GST Tax Summary Table */}
        {(() => {
          const isInterState = Number(invoice.igstAmount || 0) > 0;
          const hsnMap = new Map<string, any>();
          for (const itm of invoice.items || []) {
            const hsn = itm.hsnCode || "OTHER";
            const rate = Number(itm.taxRate) || 0;
            const key = `${hsn}_${rate}`;
            const existing = hsnMap.get(key) || {
              hsn,
              rate,
              taxable: 0,
              cgst: 0,
              sgst: 0,
              igst: 0,
              totalTax: 0,
            };
            existing.taxable += Number(itm.taxableAmount || 0);
            existing.cgst += Number(itm.cgstAmount || 0);
            existing.sgst += Number(itm.sgstAmount || 0);
            existing.igst += Number(itm.igstAmount || 0);
            existing.totalTax +=
              Number(itm.cgstAmount || 0) +
              Number(itm.sgstAmount || 0) +
              Number(itm.igstAmount || 0);
            hsnMap.set(key, existing);
          }
          const hsnList = Array.from(hsnMap.values());

          return (
            <div
              className={`overflow-hidden mb-4 bg-white ${
                customization.themeId === "modern-saffron"
                  ? "border border-[#FED7AA] rounded-xl"
                  : customization.themeId === "classic-corporate"
                    ? "border-2 border-slate-300 rounded-xl"
                    : customization.themeId === "emerald-trade"
                      ? "border-2 border-emerald-300 rounded-xl"
                      : customization.themeId === "royal-violet"
                        ? "border border-[#C7D2FE] rounded-2xl"
                        : "border-2 border-slate-900 rounded-xl"
              }`}
            >
              <div
                className={`px-3.5 py-2 border-b flex justify-between items-center ${
                  customization.themeId === "modern-saffron"
                    ? "bg-[#FFF7ED] border-[#FED7AA] text-amber-950"
                    : customization.themeId === "classic-corporate"
                      ? "bg-[#1E3A8A] border-slate-300 text-white"
                      : customization.themeId === "emerald-trade"
                        ? "bg-emerald-100/90 border-emerald-300 text-emerald-950"
                        : customization.themeId === "royal-violet"
                          ? "bg-indigo-100/90 border-[#C7D2FE] text-indigo-950"
                          : "bg-slate-900 border-slate-900 text-white font-mono"
                }`}
              >
                <span className="font-bold text-xs uppercase tracking-wide">
                  {lang === "gu"
                    ? "જીએસટી કર વિગત સમરી (GST Tax Breakdown)"
                    : "Statutory GST Tax Summary"}
                </span>
                <span
                  className={`text-[11px] font-medium ${
                    customization.themeId === "classic-corporate" ||
                    customization.themeId === "charcoal-minimal"
                      ? "text-slate-200"
                      : "text-slate-600"
                  }`}
                >
                  {isInterState
                    ? "Inter-State Supply (IGST Applicable)"
                    : "Intra-State Supply (CGST + SGST Applicable)"}
                </span>
              </div>
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-sans">
                    <th className="py-2 px-3">HSN / SAC</th>
                    <th className="py-2 px-3 text-right">Taxable Amount (₹)</th>
                    {!isInterState ? (
                      <>
                        <th className="py-2 px-3 text-right">CGST Rate</th>
                        <th className="py-2 px-3 text-right">CGST Amt (₹)</th>
                        <th className="py-2 px-3 text-right">SGST Rate</th>
                        <th className="py-2 px-3 text-right">SGST Amt (₹)</th>
                      </>
                    ) : (
                      <>
                        <th className="py-2 px-3 text-right">IGST Rate</th>
                        <th className="py-2 px-3 text-right">IGST Amt (₹)</th>
                      </>
                    )}
                    <th className="py-2 px-3 text-right">Total Tax (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {hsnList.map((h, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-semibold text-slate-900">{h.hsn}</td>
                      <td className="py-2 px-3 text-right">₹{h.taxable.toFixed(2)}</td>
                      {!isInterState ? (
                        <>
                          <td className="py-2 px-3 text-right text-slate-600">{(h.rate / 2)}%</td>
                          <td className="py-2 px-3 text-right font-medium">₹{h.cgst.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right text-slate-600">{(h.rate / 2)}%</td>
                          <td className="py-2 px-3 text-right font-medium">₹{h.sgst.toFixed(2)}</td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 px-3 text-right text-slate-600">{h.rate}%</td>
                          <td className="py-2 px-3 text-right font-medium">₹{h.igst.toFixed(2)}</td>
                        </>
                      )}
                      <td className="py-2 px-3 text-right font-bold text-slate-900">
                        ₹{h.totalTax.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/80 border-t border-slate-300 font-bold text-slate-900 text-xs">
                    <td className="py-2 px-3 font-sans">{lang === "gu" ? "કુલ કર:" : "Total Tax:"}</td>
                    <td className="py-2 px-3 text-right">
                      ₹{hsnList.reduce((s, x) => s + x.taxable, 0).toFixed(2)}
                    </td>
                    {!isInterState ? (
                      <>
                        <td className="py-2 px-3 text-right">-</td>
                        <td className="py-2 px-3 text-right">
                          ₹{hsnList.reduce((s, x) => s + x.cgst, 0).toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right">-</td>
                        <td className="py-2 px-3 text-right">
                          ₹{hsnList.reduce((s, x) => s + x.sgst, 0).toFixed(2)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 px-3 text-right">-</td>
                        <td className="py-2 px-3 text-right">
                          ₹{hsnList.reduce((s, x) => s + x.igst, 0).toFixed(2)}
                        </td>
                      </>
                    )}
                    <td className="py-2 px-3 text-right text-emerald-800">
                      ₹{hsnList.reduce((s, x) => s + x.totalTax, 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })()}

        {/* Totals & Tax Calculation Breakdown */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-t border-slate-200 pt-4 text-xs">
          <div className="space-y-3 sm:max-w-xs">
            {invoice.notes && (
              <div>
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Notes:
                </p>
                <p className="text-slate-600">{invoice.notes}</p>
              </div>
            )}
            
            {/* Rich Bank Details & Barcode / Payment QR */}
            {(() => {
              const activeComp = companyDetails || currentCompany;
              const bankBarcodeValue = activeComp?.bankAccountBarcode || activeComp?.bankAccountNo;
              const bal = invoice.balanceAmount !== undefined ? Number(invoice.balanceAmount) : Number(invoice.outstandingBalance || 0);
              const isFullyPaid = invoice.status === "PAID" || bal <= 0.001;

              return (
                <div
                  className={`p-3 space-y-2 ${
                    customization.themeId === "modern-saffron"
                      ? "bg-[#FFF8F3] border border-[#FED7AA] rounded-xl"
                      : customization.themeId === "classic-corporate"
                        ? "bg-[#F8FAFC] border-2 border-slate-300 rounded-xl"
                        : customization.themeId === "emerald-trade"
                          ? "bg-[#F0FDF4] border-2 border-emerald-300 rounded-xl"
                          : customization.themeId === "royal-violet"
                            ? "bg-[#EEF2FF] border border-[#C7D2FE] rounded-2xl"
                            : "bg-white border-2 border-slate-900 rounded-xl"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <span>🏦</span>
                      <span>{lang === "gu" ? "બેંક અને ચુકવણી વિગતો:" : "Bank & Payment Details:"}</span>
                    </p>
                    {bankBarcodeValue && (
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
                        🏷️ {bankBarcodeValue}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-700 space-y-0.5">
                    {activeComp?.bankName && (
                      <p><span className="font-semibold text-slate-500">Bank:</span> {activeComp.bankName}</p>
                    )}
                    {activeComp?.bankAccountNo && (
                      <p><span className="font-semibold text-slate-500">A/C No:</span> <span className="font-mono font-bold">{activeComp.bankAccountNo}</span></p>
                    )}
                    {activeComp?.bankIfsc && (
                      <p><span className="font-semibold text-slate-500">IFSC:</span> <span className="font-mono font-bold uppercase">{activeComp.bankIfsc}</span></p>
                    )}
                    {activeComp?.bankBranch && (
                      <p><span className="font-semibold text-slate-500">Branch:</span> {activeComp.bankBranch}</p>
                    )}
                    {activeComp?.tradeName && (
                      <p><span className="font-semibold text-slate-500">A/C Name:</span> {activeComp.tradeName}</p>
                    )}
                    {activeComp?.upiVpa && (
                      <p><span className="font-semibold text-slate-500">UPI ID:</span> <span className="font-mono text-indigo-700 font-bold">{activeComp.upiVpa}</span></p>
                    )}
                    {!activeComp?.bankName && !activeComp?.bankAccountNo && !activeComp?.upiVpa && (
                      <p className="text-slate-500 text-[11px]">Please settle via Cash, NEFT or UPI to registered account.</p>
                    )}
                  </div>

                  {/* Scannable Barcode & Payment QR */}
                  <div className="pt-2 border-t border-slate-200/60 space-y-2">
                    {/* Bank Account Barcode (Record & Verification) */}
                    {bankBarcodeValue && (
                      <div className="flex flex-col items-start bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                        <span className="text-[10px] text-slate-500 font-semibold mb-0.5">
                          {lang === "gu" ? "બેંક એકાઉન્ટ બારકોડ:" : "Bank Account Barcode:"}
                        </span>
                        <svg
                          ref={(el) => {
                            if (el && bankBarcodeValue) {
                              try {
                                JsBarcode(el, bankBarcodeValue, {
                                  format: "CODE128",
                                  width: 1.3,
                                  height: 36,
                                  displayValue: true,
                                  fontSize: 11,
                                  margin: 2,
                                });
                              } catch {
                                // ignore
                              }
                            }
                          }}
                          className="max-w-[200px]"
                        />
                      </div>
                    )}

                    {/* Conditional UPI Payment Scanner: ONLY if balance is pending (> 0) and not fully paid! */}
                    {!isFullyPaid && activeComp?.upiVpa ? (
                      <div className="flex items-center gap-2.5 bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                        <canvas
                          ref={(canvas) => {
                            if (canvas && activeComp?.upiVpa) {
                              const upiUrl = `upi://pay?pa=${encodeURIComponent(
                                activeComp.upiVpa,
                              )}&pn=${encodeURIComponent(
                                activeComp.tradeName || activeComp.legalName || "Merchant",
                              )}&am=${bal.toFixed(2)}&cu=INR`;
                              QRCode.toCanvas(canvas, upiUrl, {
                                width: 60,
                                margin: 1,
                              }).catch(() => {});
                            }
                          }}
                          className="rounded shrink-0"
                        />
                        <div className="text-[10.5px] leading-tight min-w-0">
                          <p className="font-bold text-slate-800">Scan to Pay via UPI</p>
                          <p className="text-emerald-700 font-bold text-[11px]">Pay Balance: ₹{bal.toFixed(2)}</p>
                          <p className="text-slate-500 text-[10px]">GPay / PhonePe / Paytm</p>
                          <p className="font-mono text-indigo-700 font-bold truncate mt-0.5">{activeComp.upiVpa}</p>
                        </div>
                      </div>
                    ) : isFullyPaid ? (
                      /* If PAID: Hide the payment QR and show a clear PAID IN FULL stamp/badge */
                      <div className="flex items-center gap-2.5 bg-emerald-50/90 border border-emerald-300 p-2.5 rounded-lg text-emerald-800">
                        <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                          ✓
                        </div>
                        <div>
                          <p className="font-bold text-xs uppercase tracking-wide text-emerald-900">
                            {lang === "gu" ? "આ બિલ સંપૂર્ણ ચૂકતે છે (PAID)" : "INVOICE FULLY PAID"}
                          </p>
                          <p className="text-[10px] text-emerald-700 font-medium">
                            {lang === "gu" ? "કોઈ બાકી રકમ નથી. પેમેન્ટ સ્કેનર બંધ કરેલ છે." : "No balance due. Payment QR scanner disabled."}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })()}
          </div>

          <div
            className={`w-full sm:w-80 space-y-2 p-4 ${
              customization.themeId === "modern-saffron"
                ? "bg-[#FFF8F3] border border-[#FED7AA] rounded-xl"
                : customization.themeId === "classic-corporate"
                  ? "bg-[#F8FAFC] border-2 border-slate-300 rounded-xl"
                  : customization.themeId === "emerald-trade"
                    ? "bg-[#F0FDF4] border-2 border-emerald-300 rounded-xl"
                    : customization.themeId === "royal-violet"
                      ? "bg-[#EEF2FF] border border-[#C7D2FE] rounded-2xl"
                      : "bg-white border-2 border-slate-900 rounded-xl"
            }`}
          >
            <div className="flex justify-between text-slate-700">
              <span>{lang === "gu" ? "કરપાત્ર રકમ (Taxable Value):" : "Taxable Value:"}</span>
              <span className="font-mono font-semibold text-slate-900">
                ₹{Number(invoice.taxableAmount).toFixed(2)}
              </span>
            </div>
            {Number(invoice.cgstAmount) > 0 && (
              <div className="flex justify-between text-slate-700">
                <span>{lang === "gu" ? "સેન્ટ્રલ ટેક્સ (CGST):" : "Central Tax (CGST):"}</span>
                <span className="font-mono text-slate-900">
                  ₹{Number(invoice.cgstAmount).toFixed(2)}
                </span>
              </div>
            )}
            {Number(invoice.sgstAmount) > 0 && (
              <div className="flex justify-between text-slate-700">
                <span>{lang === "gu" ? "સ્ટેટ ટેક્સ (SGST):" : "State Tax (SGST):"}</span>
                <span className="font-mono text-slate-900">
                  ₹{Number(invoice.sgstAmount).toFixed(2)}
                </span>
              </div>
            )}
            {Number(invoice.igstAmount) > 0 && (
              <div className="flex justify-between text-slate-700">
                <span>{lang === "gu" ? "ઇન્ટિગ્રેટેડ ટેક્સ (IGST):" : "Integrated Tax (IGST):"}</span>
                <span className="font-mono text-slate-900">
                  ₹{Number(invoice.igstAmount).toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-slate-800 font-semibold pt-1 border-t border-slate-200">
              <span>{lang === "gu" ? "કુલ જીએસટી કર (Total Tax):" : "Total GST Tax:"}</span>
              <span className="font-mono text-slate-900">
                ₹{(Number(invoice.cgstAmount || 0) + Number(invoice.sgstAmount || 0) + Number(invoice.igstAmount || 0)).toFixed(2)}
              </span>
            </div>
            {Number(invoice.roundOff) !== 0 && (
              <div className="flex justify-between text-slate-700">
                <span>Sec 170 Round-off:</span>
                <span className="font-mono text-slate-900">
                  ₹{Number(invoice.roundOff).toFixed(2)}
                </span>
              </div>
            )}
            <div
              className={`p-2.5 rounded-lg flex justify-between font-bold text-sm shadow-xs ${
                customization.themeId === "modern-saffron"
                  ? "bg-[#F47721] text-white"
                  : customization.themeId === "classic-corporate"
                    ? "bg-[#1E3A8A] text-white"
                    : customization.themeId === "emerald-trade"
                      ? "bg-[#059669] text-white"
                      : customization.themeId === "royal-violet"
                        ? "bg-[#4F46E5] text-white rounded-xl"
                        : "bg-slate-900 text-white font-mono"
              }`}
            >
              <span>{lang === "gu" ? "કુલ બિલ રકમ (Grand Total):" : "Invoice Grand Total:"}</span>
              <span className="font-mono text-base font-black">
                ₹{Number(invoice.grandTotal).toFixed(2)}
              </span>
            </div>
            {((returns || []).reduce((s: number, r: any) => s + Number(r.grandTotal || 0), 0) > 0) && (
              <div className="flex justify-between text-rose-600 pt-1">
                <span>{lang === "gu" ? "બાદ: ક્રેડિટ નોટ / પરત માલ:" : "Less: Returns / Credit Notes:"}</span>
                <span className="font-mono font-semibold">
                  -₹{(returns || []).reduce((s: number, r: any) => s + Number(r.grandTotal || 0), 0).toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-slate-600 pt-1">
              <span>{lang === "gu" ? "બાદ: મળેલી રકમ (Paid):" : "Less: Paid Amount:"}</span>
              <span className="font-mono font-semibold text-emerald-700">
                -₹{Number(invoice.paidAmount).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between font-bold pt-1 border-t border-slate-200">
              <span>{lang === "gu" ? "ચોખ્ખી બાકી રકમ (Balance):" : "Outstanding Balance:"}</span>
              <span className="font-mono text-amber-800">
                ₹{Number(invoice.balanceAmount !== undefined ? invoice.balanceAmount : (invoice.outstandingBalance || 0)).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Signatory Footer */}
        <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-end text-xs">
          <p className="text-slate-400">
            Electronic generated tax invoice. Subject to Ahmedabad jurisdiction.
          </p>
          <div className="text-right space-y-1.5 min-w-[200px]">
            <p className="font-bold text-slate-900 uppercase text-[11px]">
              For {activeComp?.tradeName || activeComp?.legalName || currentCompany?.tradeName || "MyBill History Enterprise"}
            </p>
            
            {/* Signature Preview / Stamp */}
            <div className="min-h-[46px] flex flex-col items-end justify-end py-1">
              {activeComp?.signatureUrl ? (
                <img
                  src={activeComp.signatureUrl}
                  alt="Authorised Signature"
                  className="max-h-14 max-w-[170px] object-contain block"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="h-10" />
              )}
            </div>

            <div className="border-t border-slate-400 pt-1 text-right">
              {activeComp?.signatoryName && (
                <p className="font-semibold text-slate-800 text-[11.5px] leading-tight">
                  {activeComp.signatoryName}
                </p>
              )}
              <p className="text-[10px] text-slate-600 font-medium">
                {activeComp?.signatoryDesignation || (lang === "gu" ? "અધિકૃત સહી કરનાર (Authorised Signatory)" : "Authorised Signatory")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bill-by-Bill Payment Allocations History */}
      {allocations.length > 0 && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 print:hidden">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Bill-by-Bill Payment Allocation History
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Voucher No</th>
                  <th className="py-2 px-3">Payment Mode</th>
                  <th className="py-2 px-3 text-right">Allocated Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allocations.map((a, i) => (
                  <tr key={i}>
                    <td className="py-2 px-3 font-mono">
                      {new Date(
                        a.createdAt || a.voucher?.voucherDate,
                      ).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-2 px-3 font-mono font-semibold text-slate-900">
                      {a.voucher?.voucherNumber || "VCH-RCPT"}
                    </td>
                    <td className="py-2 px-3">{a.paymentMode || "CASH"}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                      ₹{Number(a.allocatedAmount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#F47721] flex items-center justify-center shrink-0 shadow-xs">
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
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                    ewbTab === "GENERATE"
                      ? "bg-white text-orange-700 shadow-sm border border-orange-200/60 font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
                >
                  <svg className="w-3.5 h-3.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>1. Generate E-Way Bill (સિસ્ટમ જનરેશન)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEwbTab("LINK")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                    ewbTab === "LINK"
                      ? "bg-white text-indigo-700 shadow-sm border border-indigo-200/60 font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
                >
                  <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span>2. Link Govt Portal EWB (પોર્ટલ નંબર જોડો)</span>
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
                      className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-[#F47721] hover:from-orange-600 hover:to-[#D95F12] text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
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
