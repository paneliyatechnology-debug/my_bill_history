"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../../context/auth-context";
import { apiClient } from "../../../../../lib/api-client";
import { mailResultMessage, sendAppEmail } from "../../../../../lib/send-app-email";
import { useActiveInvoiceTheme } from "@/lib/use-active-invoice-theme";
import {
  DynamicThemedInvoice,
  DynamicInvoiceData,
  DynamicCompanyData,
} from "@/components/invoice/dynamic-themed-invoice";
import { getStateDisplayName } from "@/shared-types";
import { Zap, Link2, Mail, X, Printer, Receipt, MessageSquare } from "lucide-react";
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

// Helper: Number to Words in INR
function numberToWordsINR(amount: number): string {
  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ",
    "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen ",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(num: number): string {
    if ((num = num.toString().length > 9 ? parseFloat(num.toString().substring(0, 9)) : num) === 0) return "";
    const n = ("000000000" + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return "";
    let str = "";
    str += Number(n[1]) !== 0 ? (a[Number(n[1])] || b[Number(n[1][0])] + " " + a[Number(n[1][1])]) + "Crore " : "";
    str += Number(n[2]) !== 0 ? (a[Number(n[2])] || b[Number(n[2][0])] + " " + a[Number(n[2][1])]) + "Lakh " : "";
    str += Number(n[3]) !== 0 ? (a[Number(n[3])] || b[Number(n[3][0])] + " " + a[Number(n[3][1])]) + "Thousand " : "";
    str += Number(n[4]) !== 0 ? (a[Number(n[4])] || b[Number(n[4][0])] + " " + a[Number(n[4][1])]) + "Hundred " : "";
    str += Number(n[5]) !== 0 ? ((str !== "") ? "and " : "") + (a[Number(n[5])] || b[Number(n[5][0])] + " " + a[Number(n[5][1])]) : "";
    return str.trim();
  }

  const whole = Math.floor(amount);
  const paise = Math.round((amount - whole) * 100);
  let res = whole === 0 ? "Zero Rupees" : inWords(whole) + " Rupees";
  if (paise > 0) {
    res += " and " + inWords(paise) + " Paise";
  }
  return res + " Only";
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
      hsnCode?: string;
      primaryUom?: { code: string };
    };
  }>;
}

export default function CreditNoteViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { lang, currentCompany, tenantContext } = useAuth();

  const [data, setData] = useState<SalesReturnDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pathname = usePathname();
  const isDebitNote = pathname?.includes("debit-note");
  const isSalesReturn = pathname?.includes("returns");
  const docCategory = isDebitNote ? "DEBIT_NOTE" : isSalesReturn ? "SALES_RETURN" : "CREDIT_NOTE";
  const docTitle = isDebitNote ? "Debit Note" : isSalesReturn ? "Sales Return" : "Credit Note";
  const backHref = isDebitNote ? "/sales/debit-note" : isSalesReturn ? "/sales/returns" : "/sales/credit-note";

  const { state: invoiceThemeState } = useActiveInvoiceTheme(currentCompany?.id);
  const [selectedPaperSize, setSelectedPaperSize] = useState<
    "A4" | "A5" | "US_LETTER" | "LEGAL" | "THERMAL_80" | "DL"
  >("A4");

  useEffect(() => {
    if ((invoiceThemeState as any)?.paperSize) {
      setSelectedPaperSize((invoiceThemeState as any).paperSize as any);
    }
  }, [(invoiceThemeState as any)?.paperSize]);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Dropdowns & Modals
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isPrintMenuOpen, setIsPrintMenuOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isEwayModalOpen, setIsEwayModalOpen] = useState(false);
  const [isEinvoiceModalOpen, setIsEinvoiceModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const shareRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setIsShareOpen(false);
      }
      if (printRef.current && !printRef.current.contains(e.target as Node)) {
        setIsPrintMenuOpen(false);
      }
    }
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const [isCreatingCN, setIsCreatingCN] = useState(false);
  const handleCreateCreditNote = async () => {
    if (!data?.id) return;
    setIsCreatingCN(true);
    try {
      const res: any = await apiClient.post(`/sales-returns/${data.id}/create-credit-note`, {});
      const cnId = res?.creditNote?.id || res?.id;
      setToastMessage("Credit Note created successfully!");
      if (cnId) {
        router.push(`/sales/credit-note/view/${cnId}`);
      }
    } catch (err: any) {
      alert(err?.message || "Failed to create Credit Note from Sales Return.");
    } finally {
      setIsCreatingCN(false);
    }
  };

  // Fetch sales return
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        const res: any = await apiClient.get(`/sales-returns/${id}`);
        if (!cancelled && res) {
          setData(res);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Failed to load sales return details.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  // Handle PDF Print / Download
  const handleDownloadPdf = async () => {
    const element = document.getElementById("printable-credit-note");
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

      pdf.save(`${docCategory}-${data?.returnNumber || "voucher"}.pdf`);
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

  async function handleEmailCreditNote() {
    setIsShareOpen(false);
    if (!data) return;
    const to = window.prompt("Email this credit note to:", data.party?.email || "");
    if (!to) return;
    try {
      const companyName = currentCompany?.tradeName || currentCompany?.legalName || "myownbillbook";
      const viewUrl = typeof window !== "undefined" ? window.location.href : "";
      const result = await sendAppEmail({
        to: to.trim(),
        subject: `Credit note ${data.returnNumber} from ${companyName}`,
        heading: `Credit note ${data.returnNumber}`,
        intro: `${companyName} shared this credit note with you.`,
        actionUrl: viewUrl,
        actionLabel: "View Credit Note →",
        companyName,
        details: [
          { label: "Credit Note Number", value: data.returnNumber },
          { label: "Party", value: data.party?.name || "—" },
          { label: "Date", value: formatDisplayDate(data.returnDate) },
          { label: "Total Amount", value: formatInr(data.grandTotal) },
        ],
        text: `Open the credit note in myownbillbook to print or download it: ${viewUrl}`,
      });
      showToast(mailResultMessage(result, lang === "gu" ? "gu" : "en"));
    } catch (err: any) {
      showToast(err?.message || "Could not email this credit note.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F4F6F9]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#0F172A] border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">Loading sales return voucher...</p>
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
          <h2 className="text-[15px] font-semibold text-[#182230]">{docTitle} Not Found</h2>
          <p className="text-xs font-semibold text-[#0F172A] mt-0.5">
            {isDebitNote ? "Debit Note not found" : "Sales Return / Credit Note not found"}
          </p>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
            {error || "The requested voucher does not exist or has been deleted. All linked ledgers and effects have been cleanly maintained."}
          </p>
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2">
            <Link
              href={backHref}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#0F172A] h-9 px-3.5 text-[13px] font-medium text-white shadow-xs hover:bg-[#1268D3] transition-colors"
            >
              <span>Back to {docTitle} List</span>
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
    category: docCategory,
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
    notes: data.reason || (data.salesInvoice?.invoiceNumber ? `Against Invoice #${data.salesInvoice.invoiceNumber}` : undefined),
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
      const rawUnitPrice = Number(it.unitPrice ?? (it as any).rate ?? 0);
      const taxable = Number(it.taxableAmount || qty * rawUnitPrice);
      const unitPrice =
        rawUnitPrice > 0 ? rawUnitPrice : qty > 0 && taxable > 0 ? taxable / qty : 0;
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

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-slate-800 flex flex-col font-sans">
      {/* 1. TOP HEADER / ACTION BAR (Hidden when printing) */}
      <header className="print:hidden sticky top-0 z-40 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        {/* Left: Back Link, Document Title, Financial Summary */}
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 h-9 px-3 text-[13px] font-medium text-slate-700 hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded-xl border border-slate-200 transition-colors shadow-2xs"
            title={`Back to ${docTitle}s`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>{lang === "gu" ? "પાછા જાઓ" : `${docTitle}s`}</span>
          </Link>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          <div className="min-w-0">
            <h1 className="font-semibold text-slate-900 text-base sm:text-lg tracking-tight truncate">
              {docTitle} #{data.returnNumber}
            </h1>
          </div>

          {/* Financial Summary Pill */}
          <div className="hidden md:flex items-center gap-2.5 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200/90 text-xs shadow-2xs">
            <span className="text-slate-500 font-medium">{lang === "gu" ? "કુલ:" : "Total:"}</span>
            <span className="tabular-nums font-semibold text-slate-900">
              ₹{Number(data.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
            {data.remainingCredit !== undefined && Number(data.remainingCredit) > 0 && (
              <>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500 font-medium">{lang === "gu" ? "બાકી ક્રેડિટ:" : "Remaining:"}</span>
                <span className="tabular-nums font-semibold text-emerald-700">
                  ₹{Number(data.remainingCredit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </>
            )}
            {data.status === "CANCELLED" && (
              <>
                <span className="text-slate-300">|</span>
                <span className="font-semibold text-rose-600">
                  {lang === "gu" ? "રદ કરેલ" : "Cancelled"}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">

          {/* 1-Click Create Credit Note from Sales Return */}
          {(isSalesReturn || data?.docType === "SALES_RETURN") && !data?.linkedReturnId && data?.status !== "CANCELLED" && (
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

          {data?.linkedReturnId && (
            <Link
              href={
                data.docType === "CREDIT_NOTE"
                  ? `/sales/returns/${data.linkedReturnId}`
                  : `/sales/credit-note/view/${data.linkedReturnId}`
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 h-9 px-3.5 text-xs font-semibold text-purple-800 hover:bg-purple-100 transition-colors shadow-2xs"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>{data.docType === "CREDIT_NOTE" ? "View Linked Sales Return" : "View Linked Credit Note"}</span>
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

          {/* Print PDF Dropdown */}
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

          {/* History Icon Button */}
          <button
            type="button"
            onClick={() => setIsHistoryModalOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
            title="Edit History"
          >
            <svg className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

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
                    handleEmailCreditNote();
                  }}
                  className="flex w-full items-center gap-2.5 h-9 px-3.5 text-slate-700 hover:bg-slate-50 font-medium border-t border-slate-100 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>Email {docTitle}</span>
                </button>
              </div>
            )}
          </div>

          {/* Generate e-Way Bill */}
          <button
            type="button"
            onClick={() => setIsEwayModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white h-9 px-3.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25V3.75a1.125 1.125 0 00-1.125-1.125H3.375A1.125 1.125 0 002.25 3.75v10.5c0 .621.504 1.125 1.125 1.125h1.5" />
            </svg>
            <span>e-Way Bill</span>
          </button>

          {/* Generate e-Invoice */}
          <button
            type="button"
            onClick={() => setIsEinvoiceModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white h-9 px-3.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <span>e-Invoice</span>
          </button>

          {/* Edit Button */}
          <Link
            href={`/sales/credit-note/create?edit=${data.id}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 h-9 px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-[#1268D3] transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
            </svg>
            <span>Edit</span>
          </Link>
        </div>
      </header>

      {/* 2. MAIN VOUCHER CANVAS (Unified Themed Dynamic Invoice) */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center items-start print:p-0 print:m-0 print:overflow-visible bg-[#F4F6F9]">
        <div className="w-full max-w-4xl mx-auto min-w-0 invoice-viewport-wrapper print:block print:max-w-none print:w-full">
          <DynamicThemedInvoice
            invoice={themedInvoiceData}
            settings={{ ...invoiceThemeState, paperSize: selectedPaperSize }}
            company={compData}
            printableId="printable-credit-note"
          />
        </div>
      </main>

      {/* Edit History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-[15px] font-semibold text-slate-900 flex items-center gap-2">
                <svg className="w-4 h-4 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Edit History</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-bold text-slate-800">Sales Return Created</p>
                  <p className="text-slate-500 text-[11px]">
                    {data.createdAt ? new Date(data.createdAt).toLocaleString("en-IN") : "21 Oct 2026, 04:10 PM"}
                  </p>
                  <p className="text-slate-600 mt-1">
                    Created by Admin with amount <span className="font-semibold">{formatInr(data.grandTotal)}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-bold text-slate-800">Voucher Issued & Stock Restored</p>
                  <p className="text-slate-500 text-[11px]">Status: Refunded</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="rounded-lg bg-slate-100 px-4 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* e-Way Bill Notification Modal */}
      {isEwayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-600 mb-3">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25V3.75a1.125 1.125 0 00-1.125-1.125H3.375A1.125 1.125 0 002.25 3.75v10.5c0 .621.504 1.125 1.125 1.125h1.5" />
              </svg>
            </div>
            <h3 className="text-[15px] font-semibold text-slate-900">Generate e-Way Bill</h3>
            <p className="mt-1 text-xs text-slate-500">
              e-Way Bill module is configured. The distance and transporter details will be synced with the GST portal.
            </p>
            <button
              type="button"
              onClick={() => setIsEwayModalOpen(false)}
              className="mt-4 w-full rounded-lg bg-[#0F172A] py-2 text-[13px] font-medium text-white hover:bg-[#1268D3]"
            >
              Okay
            </button>
          </div>
        </div>
      )}

      {/* e-Invoice Notification Modal */}
      {isEinvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-600 mb-3">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h3 className="text-[15px] font-semibold text-slate-900">Generate e-Invoice</h3>
            <p className="mt-1 text-xs text-slate-500">
              IRN and signed QR code generation ready for this Credit Note.
            </p>
            <button
              type="button"
              onClick={() => setIsEinvoiceModalOpen(false)}
              className="mt-4 w-full rounded-lg bg-[#0F172A] py-2 text-[13px] font-medium text-white hover:bg-[#1268D3]"
            >
              Okay
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-xl animate-in slide-in-from-bottom-2 duration-150">
          <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
