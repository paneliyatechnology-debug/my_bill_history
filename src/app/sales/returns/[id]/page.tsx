"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../context/auth-context";
import { apiClient } from "../../../../lib/api-client";
import { mailResultMessage, sendAppEmail } from "../../../../lib/send-app-email";
import { useActiveInvoiceTheme } from "@/lib/use-active-invoice-theme";
import {
  DynamicThemedInvoice,
  DynamicInvoiceData,
  DynamicCompanyData,
} from "@/components/invoice/dynamic-themed-invoice";
import { getStateDisplayName } from "@/shared-types";
import { Zap, Link2, Mail, Printer, Receipt, MessageSquare } from "lucide-react";
import { CustomSelect } from "@/components/ui/dropdown-system";
import { formatDate } from "@/lib/date-utils";

// Helper: Indian Rupee Formatter
function formatInr(val: number | string | undefined): string {
  const num = Number(val) || 0;
  return (
    "₹ " +
    num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

// Helper: Format Date
function formatDisplayDate(val?: string): string {
  return formatDate(val, "—");
}

interface SalesReturnDetail {
  id: string;
  returnNumber: string;
  returnDate: string;
  placeOfSupply?: string;
  docType?: string;
  creditNoteType?: string;
  gstCategory?: string;
  disposition?: string;
  warehouseId?: string;
  warehouse?: {
    id: string;
    name: string;
  };
  linkedReturnId?: string;
  settlementMode?: string;
  refundAmount?: number;
  allocatedAmount?: number;
  remainingCredit?: number;
  taxableAmount: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  grandTotal: number;
  status: string;
  reason?: string;
  notes?: string;
  createdAt?: string;
  party?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    gstin?: string;
    billingAddress?: any;
    stateCode?: string;
  };
  salesInvoice?: {
    id: string;
    invoiceNumber: string;
    invoiceDate?: string;
    grandTotal?: number;
  };
  items?: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    taxableAmount: number;
    cgstAmount?: number;
    sgstAmount?: number;
    igstAmount?: number;
    totalAmount: number;
    disposition?: string;
    item?: {
      id: string;
      name: string;
      sku?: string;
      hsnCode?: string;
      primaryUom?: { code: string };
    };
  }>;
}

export default function SalesReturnViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { lang, currentCompany } = useAuth();

  const [data, setData] = useState<SalesReturnDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { state: invoiceThemeState } = useActiveInvoiceTheme(currentCompany?.id);
  const [selectedPaperSize, setSelectedPaperSize] = useState<
    "A4" | "A5" | "US_LETTER" | "LEGAL" | "THERMAL_80" | "DL"
  >("A4");

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPrintMenuOpen, setIsPrintMenuOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCreatingCN, setIsCreatingCN] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (printRef.current && !printRef.current.contains(e.target as Node)) {
        setIsPrintMenuOpen(false);
      }
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setIsShareOpen(false);
      }
    }
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Fetch sales return
  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    apiClient
      .get(`/sales-returns/${id}`)
      .then((res: any) => {
        const item = res?.data || res;
        setData(item);
      })
      .catch((err: any) => {
        setError(err.message || "Failed to load sales return details.");
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  // 1-Click Create Credit Note from Sales Return
  const handleCreateCreditNote = async () => {
    if (!data?.id) return;
    setIsCreatingCN(true);
    try {
      const res: any = await apiClient.post(`/sales-returns/${data.id}/create-credit-note`, {});
      const cnId = res?.creditNote?.id || res?.id;
      showToast("Credit Note created successfully!");
      if (cnId) {
        router.push(`/sales/credit-note/view/${cnId}`);
      }
    } catch (err: any) {
      alert(err?.message || "Failed to create Credit Note from Sales Return.");
    } finally {
      setIsCreatingCN(false);
    }
  };

  // Cancel / Delete Return
  const handleDeleteReturn = async () => {
    if (!confirm("Are you sure you want to cancel and reverse this physical sales return? Stock will be reversed.")) {
      return;
    }
    try {
      await apiClient.delete(`/sales-returns/${id}`);
      alert("Sales return cancelled and stock reversed successfully.");
      router.push("/sales/returns");
    } catch (err: any) {
      alert(err.message || "Failed to cancel sales return.");
    }
  };

  // Handle PDF Print / Download
  const handleDownloadPdf = async () => {
    const element = document.getElementById("printable-sales-return");
    if (!element) {
      window.print();
      return;
    }
    setIsGeneratingPdf(true);
    let originalTransform = "";
    let originalWidth = "";
    let wrapperEl: HTMLElement | null = null;
    try {
      originalTransform = element.style.transform;
      originalWidth = element.style.width;
      wrapperEl = element.closest(".invoice-viewport-wrapper") as HTMLElement;
      if (wrapperEl) {
        wrapperEl.style.height = "";
        wrapperEl.style.overflow = "";
      }
      element.style.transform = "none";
      element.style.width = "";

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
        format:
          selectedPaperSize === "A5"
            ? "a5"
            : selectedPaperSize === "THERMAL_80"
            ? [80, 200]
            : "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();

      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Sales-Return-${data?.returnNumber || "voucher"}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      window.print();
    } finally {
      if (element) {
        element.style.transform = originalTransform;
        element.style.width = originalWidth;
      }
      setIsGeneratingPdf(false);
    }
  };

  const handlePrintDocument = (paperSize: "A4" | "THERMAL_80" = "A4") => {
    setSelectedPaperSize(paperSize);
    setIsPrintMenuOpen(false);
    if (paperSize === "THERMAL_80") {
      setTimeout(() => {
        window.print();
      }, 150);
    } else {
      window.print();
    }
  };

  function handleShareWhatsApp() {
    setIsShareOpen(false);
    if (!data) return;
    const text = encodeURIComponent(
      `Sales Return #${data.returnNumber} for ${data.party?.name || "Customer"}\nAmount: ${formatInr(data.grandTotal)}\nDate: ${formatDisplayDate(data.returnDate)}\nView: ${window.location.href}`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  function handleCopyLink() {
    setIsShareOpen(false);
    navigator.clipboard.writeText(window.location.href);
    showToast("Link copied to clipboard!");
  }

  async function handleEmailReturn() {
    setIsShareOpen(false);
    if (!data) return;
    const to = window.prompt("Email this sales return to:", data.party?.email || "");
    if (!to) return;
    try {
      const companyName = currentCompany?.tradeName || currentCompany?.legalName || "myownbillbook";
      const viewUrl = typeof window !== "undefined" ? window.location.href : "";
      const result = await sendAppEmail({
        to: to.trim(),
        subject: `Sales return ${data.returnNumber} from ${companyName}`,
        heading: `Sales return ${data.returnNumber}`,
        intro: `${companyName} shared this sales return with you.`,
        actionUrl: viewUrl,
        actionLabel: "View Sales Return →",
        companyName,
        details: [
          { label: "Return Number", value: data.returnNumber },
          { label: "Party", value: data.party?.name || "—" },
          { label: "Date", value: formatDisplayDate(data.returnDate) },
          { label: "Total Amount", value: formatInr(data.grandTotal) },
        ],
        text: `Open the sales return in myownbillbook to print or download it: ${viewUrl}`,
      });
      showToast(mailResultMessage(result, lang === "gu" ? "gu" : "en"));
    } catch (err: any) {
      showToast(err?.message || "Could not email this sales return.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F4F6F9]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#0F172A] border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">Loading sales return details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-slate-200/80 p-6 sm:p-8 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 shadow-xs">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 mb-2">
            Record Not Found
          </span>
          <h2 className="text-[15px] font-semibold text-[#182230]">Sales Return Not Found</h2>
          <p className="text-xs font-semibold text-[#0F172A] mt-0.5">
            વેચાણ પરત મળેલ નથી
          </p>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
            {error || "The requested sales return does not exist or has been deleted."}
          </p>
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2">
            <Link
              href="/sales/returns"
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#0F172A] h-9 px-3.5 text-[13px] font-medium text-white shadow-xs hover:bg-[#1268D3] transition-colors"
            >
              <span>Back to Sales Returns (વેચાણ પરત યાદી)</span>
            </Link>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <Link
                href="/sales/invoices"
                className="flex items-center justify-center py-2 px-3 rounded-lg text-[13px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <span>Sales Invoices</span>
              </Link>
              <Link
                href="/sales/returns/new"
                className="flex items-center justify-center py-2 px-3 rounded-lg text-[13px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              >
                <span>+ Create Return</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const compData: DynamicCompanyData = {
    id: currentCompany?.id,
    tradeName: currentCompany?.tradeName || currentCompany?.legalName || "My Company",
    legalName: currentCompany?.legalName || currentCompany?.tradeName || "My Company",
    gstin: currentCompany?.gstin || "",
    phone: (currentCompany as any)?.phone || (currentCompany as any)?.mobile || "",
    email: currentCompany?.email || "",
    addressLine1: (currentCompany as any)?.addressLine1 || (currentCompany as any)?.address || "",
    city: currentCompany?.city || "",
    pincode: (currentCompany as any)?.pincode || "",
    stateCode: currentCompany?.stateCode || "24",
    logoUrl: (currentCompany as any)?.logoUrl,
    signatureUrl: (currentCompany as any)?.signatureUrl,
    pan: (currentCompany as any)?.pan,
  };

  const themedInvoiceData: DynamicInvoiceData = {
    id: data.id,
    category: "SALES_RETURN",
    invoiceNumber: data.returnNumber,
    invoiceDate: data.returnDate?.split("T")[0] || new Date().toISOString().split("T")[0],
    status: data.status === "CANCELLED" ? "CANCELLED" : "ISSUED",
    placeOfSupply: data.placeOfSupply
      ? getStateDisplayName(data.placeOfSupply)
      : data.party?.stateCode
      ? getStateDisplayName(data.party.stateCode)
      : currentCompany?.stateCode
      ? getStateDisplayName(currentCompany.stateCode)
      : "Gujarat (24)",
    isB2B: !!data.party?.gstin,
    taxableAmount: Number(data.taxableAmount || 0),
    cgstAmount: Number(data.cgstAmount || 0),
    sgstAmount: Number(data.sgstAmount || 0),
    igstAmount: Number(data.igstAmount || 0),
    grandTotal: Number(data.grandTotal || 0),
    paidAmount: Number(data.grandTotal || 0),
    balanceAmount: 0,
    notes: [
      data.reason ? `Return Reason: ${data.reason}` : "",
      data.salesInvoice?.invoiceNumber ? `Original Invoice: #${data.salesInvoice.invoiceNumber}` : "",
      data.warehouse?.name ? `Warehouse: ${data.warehouse.name}` : "",
      data.disposition ? `Disposition: ${data.disposition}` : "",
      data.notes || "",
    ]
      .filter(Boolean)
      .join(" • "),
    party: {
      id: data.party?.id,
      name: data.party?.name || "Customer",
      phone: data.party?.phone,
      email: data.party?.email,
      gstin: data.party?.gstin,
      stateCode: data.party?.stateCode,
      billingAddress: data.party?.billingAddress,
    },
    items: (data.items || []).map((it, idx) => {
      const qty = Number(it.quantity || 1);
      const unitPrice = Number(it.unitPrice || 0);
      const taxable = Number(it.taxableAmount || qty * unitPrice);
      const taxRate = Number(it.taxRate || 0);
      const taxAmt = Number(
        (it.cgstAmount !== undefined || it.sgstAmount !== undefined)
          ? Number(it.cgstAmount || 0) + Number(it.sgstAmount || 0) + Number(it.igstAmount || 0)
          : (taxable * taxRate) / 100
      );
      return {
        id: it.id || `item-${idx}`,
        description: it.item?.name || (it as any).description || `Item #${idx + 1}`,
        hsnCode: it.item?.hsnCode || (it as any).hsnCode,
        quantity: qty,
        unitPrice: unitPrice,
        taxRate: taxRate,
        taxableAmount: taxable,
        cgstAmount: Number(it.cgstAmount || 0),
        sgstAmount: Number(it.sgstAmount || 0),
        igstAmount: Number(it.igstAmount || 0),
        totalAmount: Number(it.totalAmount || taxable + taxAmt),
        unit: it.item?.primaryUom?.code || (it as any).unit || "PCS",
      };
    }),
  };

  const isCancelled = data.status === "CANCELLED";

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-slate-800 flex flex-col font-sans">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold animate-in fade-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}

      {/* 1. TOP HEADER / ACTION BAR (Clean Unified Document Header) */}
      <header className="print:hidden sticky top-0 z-40 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        {/* Left: Back Link, Document Title, Financial Summary */}
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <Link
            href="/sales/returns"
            className="inline-flex items-center gap-1.5 h-9 px-3 text-[13px] font-medium text-slate-700 hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded-xl border border-slate-200 transition-colors shadow-2xs"
            title="Back to Sales Returns"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>{lang === "gu" ? "પાછા જાઓ" : "Sales Returns"}</span>
          </Link>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          <div className="min-w-0">
            <h1 className="font-semibold text-slate-900 text-base sm:text-lg tracking-tight truncate">
              Sales Return #{data.returnNumber}
            </h1>
          </div>

          {/* Financial Summary Pill */}
          <div className="hidden md:flex items-center gap-2.5 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200/90 text-xs shadow-2xs">
            <span className="text-slate-500 font-medium">{lang === "gu" ? "કુલ પરત:" : "Total Return:"}</span>
            <span className="tabular-nums font-semibold text-slate-900">
              ₹{Number(data.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
            {isCancelled && (
              <>
                <span className="text-slate-300">|</span>
                <span className="font-semibold text-rose-600">
                  {lang === "gu" ? "રદ કરેલ" : "Cancelled"}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: Consolidated Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* 1-Click Create Credit Note from Sales Return */}
          {!data.linkedReturnId && !isCancelled && (
            <button
              type="button"
              onClick={handleCreateCreditNote}
              disabled={isCreatingCN}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-600 bg-blue-600 h-9 px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isCreatingCN ? "Generating..." : "Create Credit Note"}</span>
            </button>
          )}

          {data.linkedReturnId && (
            <Link
              href={`/sales/credit-note/view/${data.linkedReturnId}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 h-9 px-3.5 text-xs font-semibold text-purple-800 hover:bg-purple-100 transition-colors shadow-2xs"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>View Linked Credit Note</span>
            </Link>
          )}

          {/* Download PDF */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white h-9 px-3.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isGeneratingPdf ? (
              <span className="inline-block w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            <span>{isGeneratingPdf ? "Generating..." : (lang === "gu" ? "પીડીએફ" : "PDF")}</span>
          </button>

          {/* Print Dropdown */}
          <div className="relative" ref={printRef}>
            <button
              type="button"
              onClick={() => setIsPrintMenuOpen(!isPrintMenuOpen)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white h-9 px-3.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>{lang === "gu" ? "પ્રિન્ટ" : "Print"}</span>
              <svg
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  isPrintMenuOpen ? "rotate-180 text-slate-700" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isPrintMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-52 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl text-xs z-40 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsPrintMenuOpen(false);
                    handlePrintDocument("A4");
                  }}
                  className="flex w-full items-center gap-2.5 h-9 px-3.5 text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Standard A4 Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPrintMenuOpen(false);
                    handlePrintDocument("THERMAL_80");
                  }}
                  className="flex w-full items-center gap-2.5 h-9 px-3.5 text-slate-700 hover:bg-slate-50 font-medium border-t border-slate-100 cursor-pointer"
                >
                  <Receipt className="w-3.5 h-3.5 text-slate-500" />
                  <span>Thermal Slip (80mm)</span>
                </button>
              </div>
            )}
          </div>

          {/* Share Dropdown */}
          <div className="relative" ref={shareRef}>
            <button
              type="button"
              onClick={() => setIsShareOpen(!isShareOpen)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white h-9 px-3.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-[#1677E8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span>{lang === "gu" ? "શેર કરો" : "Share"}</span>
              <svg
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  isShareOpen ? "rotate-180 text-slate-700" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isShareOpen && (
              <div className="absolute right-0 mt-1.5 w-52 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl text-xs z-40 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsShareOpen(false);
                    handleShareWhatsApp();
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-emerald-800 hover:bg-emerald-50 font-semibold cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>Share on WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsShareOpen(false);
                    handleCopyLink();
                  }}
                  className="flex w-full items-center gap-2.5 h-9 px-3.5 text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  <Link2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Link</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsShareOpen(false);
                    handleEmailReturn();
                  }}
                  className="flex w-full items-center gap-2.5 h-9 px-3.5 text-slate-700 hover:bg-slate-50 font-medium border-t border-slate-100 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>Email Sales Return</span>
                </button>
              </div>
            )}
          </div>

          {/* Cancel Return Button */}
          {!isCancelled && (
            <button
              type="button"
              onClick={handleDeleteReturn}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 h-9 px-3.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer shadow-2xs"
            >
              <span>Cancel Return</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. MAIN VOUCHER CANVAS (Unified Themed Dynamic Invoice) */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center items-start print:p-0 print:m-0 print:overflow-visible bg-[#F4F6F9]">
        <div className="w-full max-w-4xl mx-auto min-w-0 invoice-viewport-wrapper print:block print:max-w-none print:w-full">
          <DynamicThemedInvoice
            invoice={themedInvoiceData}
            settings={{ ...invoiceThemeState, paperSize: selectedPaperSize }}
            company={compData}
            printableId="printable-sales-return"
          />
        </div>
      </main>
    </div>
  );
}
