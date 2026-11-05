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
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface SalesReturnDetail {
  id: string;
  returnNumber: string;
  returnDate: string;
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
      const result = await sendAppEmail({
        to: to.trim(),
        subject: `Sales return ${data.returnNumber} from ${companyName}`,
        heading: `Sales return ${data.returnNumber}`,
        intro: `${companyName} shared this sales return with you.`,
        details: [
          { label: "Return Number", value: data.returnNumber },
          { label: "Party", value: data.party?.name || "—" },
          { label: "Date", value: formatDisplayDate(data.returnDate) },
          { label: "Amount", value: formatInr(data.grandTotal) },
        ],
        text: "Open the sales return in myownbillbook to print or download it.",
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
            Record Not Found · મળેલ નથી
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
    placeOfSupply: data.party?.stateCode
      ? `${data.party.stateCode}`
      : currentCompany?.stateCode || "24 (Gujarat)",
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

      {/* 1. TOP HEADER / ACTION BAR (Hidden when printing) */}
      <header className="print:hidden sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        {/* Left: Back Arrow + Voucher Title + Status Pill */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/sales/returns")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            title="Back to Sales Returns"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>

          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[20px] sm:text-[22px] font-semibold text-[#182230]">
              Sales Return #{data.returnNumber}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                isCancelled
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}
            >
              {isCancelled ? "Void / Cancelled" : "Issued / Restocked"}
            </span>
            {data.warehouse?.name && (
              <span className="hidden md:inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200">
                Godown: {data.warehouse.name}
              </span>
            )}
            {data.disposition && (
              <span className="hidden md:inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-200">
                {data.disposition}
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Paper Size Selector */}
          <select
            value={selectedPaperSize}
            onChange={(e) => setSelectedPaperSize(e.target.value as any)}
            className="px-2.5 py-1.5 text-[13px] font-normal text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer h-10"
          >
            <option value="A4">A4 (Standard)</option>
            <option value="A5">A5 (Half Page)</option>
            <option value="THERMAL_80">Thermal (80mm)</option>
            <option value="US_LETTER">Letter</option>
            <option value="LEGAL">Legal</option>
          </select>

          {/* Theme Settings Button */}
          <Link
            href="/app/settings/invoice/customize"
            className="inline-flex items-center gap-1.5 h-9 px-3 text-[13px] font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-2xs"
            title="Change Invoice Theme in Settings"
          >
            <span className="text-sm">🎨</span>
            <span className="hidden sm:inline">Theme</span>
          </Link>

          {/* 1-Click Create Credit Note from Sales Return */}
          {!data.linkedReturnId && !isCancelled && (
            <button
              type="button"
              onClick={handleCreateCreditNote}
              disabled={isCreatingCN}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600 bg-blue-600 h-9 px-3.5 text-[13px] font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>{isCreatingCN ? "Generating..." : "⚡ Create Credit Note"}</span>
            </button>
          )}

          {data.linkedReturnId && (
            <Link
              href={`/sales/credit-note/view/${data.linkedReturnId}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 h-9 px-3 text-[12px] font-bold text-purple-800 hover:bg-purple-100 transition-colors"
            >
              <span>🔗 View Linked Credit Note</span>
            </Link>
          )}

          {/* Download PDF */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white h-9 px-3 text-[13px] font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isGeneratingPdf ? (
              <span className="inline-block w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            )}
            <span>Download PDF</span>
          </button>

          {/* Print PDF Dropdown */}
          <div className="relative" ref={printRef}>
            <button
              type="button"
              onClick={() => setIsPrintMenuOpen(!isPrintMenuOpen)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white h-9 px-3 text-[13px] font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24-1.077-.32-2.174-.32-3.329 0-4.636 3.764-8.5 8.4-8.5 4.636 0 8.4 3.864 8.4 8.5 0 1.155-.08 2.252-.32 3.329M6.72 13.829A9.953 9.953 0 014.8 10.5C4.8 5.864 8.564 2 13.2 2c4.636 0 8.4 3.864 8.4 8.5 0 1.155-.08 2.252-.32 3.329m-14.56 0h14.56m-14.56 0A2.25 2.25 0 004.5 16.08v3.67a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25v-3.67a2.25 2.25 0 00-2.22-2.251" />
              </svg>
              <span>Print</span>
              <svg className="w-3 h-3 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>

            {isPrintMenuOpen && (
              <div className="absolute right-0 top-9 z-50 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-xl text-xs">
                <button
                  type="button"
                  onClick={() => handlePrintDocument("A4")}
                  className="flex w-full items-center gap-2 h-9 px-3 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                    <path d="M6 14h12v8H6z" />
                  </svg>
                  <span>A4 Regular Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintDocument("THERMAL_80")}
                  className="flex w-full items-center gap-2 h-9 px-3 text-slate-700 hover:bg-slate-50 border-t border-slate-100 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  <span>Thermal POS Slip</span>
                </button>
              </div>
            )}
          </div>

          {/* Share Dropdown */}
          <div className="relative" ref={shareRef}>
            <button
              type="button"
              onClick={() => setIsShareOpen(!isShareOpen)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white h-9 px-3 text-[13px] font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
              </svg>
              <span>Share</span>
              <svg className="w-3 h-3 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>

            {isShareOpen && (
              <div className="absolute right-0 top-9 z-50 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-xl text-xs">
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="flex w-full items-center gap-2 h-9 px-3 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                >
                  <svg className="w-4 h-4 text-emerald-600 fill-current" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.7c.974.553 1.838.835 2.791.835 3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.586-5.766-5.768-5.766zm3.376 8.204c-.149.42-.77.781-1.074.828-.304.047-.694.067-1.121-.069-.264-.084-.606-.208-1.041-.397-1.848-.802-3.045-2.67-3.137-2.796-.093-.126-.749-.997-.749-1.901 0-.905.474-1.349.643-1.533.169-.184.37-.23.493-.23.123 0 .247.001.354.006.113.005.265-.043.414.316.155.374.529 1.294.576 1.389.047.094.078.206.016.331-.063.125-.094.204-.187.313-.094.11-.197.246-.282.331-.094.094-.192.196-.083.383.11.187.487.804 1.045 1.302.72.641 1.327.84 1.514.934.187.093.296.078.406-.047.11-.125.468-.546.593-.733.125-.187.25-.156.42-.094.172.062 1.088.513 1.275.607.187.093.312.14.358.219.047.078.047.452-.102.872z" />
                  </svg>
                  <span>Share on WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex w-full items-center gap-2 h-9 px-3 text-slate-700 hover:bg-slate-50 border-t border-slate-100 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-3.05a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364l1.757 1.757" />
                  </svg>
                  <span>Copy Link</span>
                </button>
                <button
                  type="button"
                  onClick={handleEmailReturn}
                  className="flex w-full items-center gap-2 h-9 px-3 text-slate-700 hover:bg-slate-50 border-t border-slate-100 cursor-pointer"
                >
                  <span>✉️</span>
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 h-9 px-3 text-[12px] font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
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
