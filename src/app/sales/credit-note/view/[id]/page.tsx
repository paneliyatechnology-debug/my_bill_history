"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../../context/auth-context";
import { apiClient } from "../../../../../lib/api-client";
import { mailResultMessage, sendAppEmail } from "../../../../../lib/send-app-email";

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
  taxableAmount: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  grandTotal: number;
  status: string;
  reason?: string;
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
  function handlePrint() {
    setIsPrintMenuOpen(false);
    window.print();
  }

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
      const result = await sendAppEmail({
        to: to.trim(),
        subject: `Credit note ${data.returnNumber} from ${companyName}`,
        heading: `Credit note ${data.returnNumber}`,
        intro: `${companyName} shared this credit note with you.`,
        details: [
          { label: "Credit note", value: data.returnNumber },
          { label: "Party", value: data.party?.name || "—" },
          { label: "Date", value: formatDisplayDate(data.returnDate) },
          { label: "Amount", value: formatInr(data.grandTotal) },
        ],
        text: "Open the credit note in myownbillbook to print or download it.",
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
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#4F46E5] border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">Loading sales return voucher...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#F4F6F9] p-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-800">Sales Return Not Found</h2>
        <p className="mt-1 max-w-sm text-sm text-slate-500">{error || "The requested sales return voucher does not exist or has been removed."}</p>
        <Link
          href="/sales/credit-note"
          className="mt-6 rounded-lg bg-[#4F46E5] px-4 py-2 text-xs font-semibold text-white shadow hover:bg-[#4338CA]"
        >
          Back to Sales Returns
        </Link>
      </div>
    );
  }

  // Calculate totals
  const totalQty = (data.items || []).reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
  const totalTax =
    (Number(data.cgstAmount) || 0) +
    (Number(data.sgstAmount) || 0) +
    (Number(data.igstAmount) || 0);

  const companyName = currentCompany?.tradeName || currentCompany?.legalName || "MODI CHAI";
  const companyPhone = (currentCompany as any)?.phone || "9510442798";
  const companyGstin = currentCompany?.gstin || "24AAAAA0000A1Z5";
  const companyState = (currentCompany as any)?.state || "Gujarat";
  const companyStateCode = currentCompany?.stateCode || "24";

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-slate-800 flex flex-col font-sans">
      {/* 1. TOP HEADER / ACTION BAR (Hidden when printing) */}
      <header className="print:hidden sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        {/* Left: Back Arrow + Voucher Title + Status Pill */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/sales/credit-note")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            title="Back to Sales Returns"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>

          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-slate-900">
              Sales Return #{data.returnNumber}
            </h1>
            <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-600 border border-sky-200">
              Refunded
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Download PDF */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span>Download PDF</span>
          </button>

          {/* Print PDF Dropdown */}
          <div className="relative" ref={printRef}>
            <button
              type="button"
              onClick={() => setIsPrintMenuOpen(!isPrintMenuOpen)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24-1.077-.32-2.174-.32-3.329 0-4.636 3.764-8.5 8.4-8.5 4.636 0 8.4 3.864 8.4 8.5 0 1.155-.08 2.252-.32 3.329M6.72 13.829A9.953 9.953 0 014.8 10.5C4.8 5.864 8.564 2 13.2 2c4.636 0 8.4 3.864 8.4 8.5 0 1.155-.08 2.252-.32 3.329m-14.56 0h14.56m-14.56 0A2.25 2.25 0 004.5 16.08v3.67a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25v-3.67a2.25 2.25 0 00-2.22-2.251" />
              </svg>
              <span>Print PDF</span>
              <svg className="w-3 h-3 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>

            {isPrintMenuOpen && (
              <div className="absolute right-0 top-9 z-50 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-xl text-xs">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex w-full items-center gap-2 px-3.5 py-2 text-slate-700 hover:bg-slate-50"
                >
                  <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                    <path d="M6 14h12v8H6z" />
                  </svg>
                  <span>A4 Regular Print</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex w-full items-center gap-2 px-3.5 py-2 text-slate-700 hover:bg-slate-50 border-t border-slate-100"
                >
                  <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  <span>Thermal POS Slip</span>
                </button>
              </div>
            )}
          </div>

          {/* History Icon Button */}
          <button
            type="button"
            onClick={() => setIsHistoryModalOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 shadow-xs transition-colors"
            title="Edit History"
          >
            <svg className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Share Dropdown */}
          <div className="relative" ref={shareRef}>
            <button
              type="button"
              onClick={() => setIsShareOpen(!isShareOpen)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
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
                  className="flex w-full items-center gap-2 px-3.5 py-2 text-emerald-700 hover:bg-emerald-50"
                >
                  <svg className="w-4 h-4 text-emerald-600 fill-current" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.7c.974.553 1.838.835 2.791.835 3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.586-5.766-5.768-5.766zm3.376 8.204c-.149.42-.77.781-1.074.828-.304.047-.694.067-1.121-.069-.264-.084-.606-.208-1.041-.397-1.848-.802-3.045-2.67-3.137-2.796-.093-.126-.749-.997-.749-1.901 0-.905.474-1.349.643-1.533.169-.184.37-.23.493-.23.123 0 .247.001.354.006.113.005.265-.043.414.316.155.374.529 1.294.576 1.389.047.094.078.206.016.331-.063.125-.094.204-.187.313-.094.11-.197.246-.282.331-.094.094-.192.196-.083.383.11.187.487.804 1.045 1.302.72.641 1.327.84 1.514.934.187.093.296.078.406-.047.11-.125.468-.546.593-.733.125-.187.25-.156.42-.094.172.062 1.088.513 1.275.607.187.093.312.14.358.219.047.078.047.452-.102.872z" />
                  </svg>
                  <span>Share on WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex w-full items-center gap-2 px-3.5 py-2 text-slate-700 hover:bg-slate-50 border-t border-slate-100"
                >
                  <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-3.05a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364l1.757 1.757" />
                  </svg>
                  <span>Copy Link</span>
                </button>
                <button
                  type="button"
                  onClick={handleEmailCreditNote}
                  className="flex w-full items-center gap-2 px-3.5 py-2 text-slate-700 hover:bg-slate-50 border-t border-slate-100"
                >
                  <span>✉️</span>
                  <span>Email Credit Note</span>
                </button>
              </div>
            )}
          </div>

          {/* Generate e-Way Bill */}
          <button
            type="button"
            onClick={() => setIsEwayModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25V3.75a1.125 1.125 0 00-1.125-1.125H3.375A1.125 1.125 0 002.25 3.75v10.5c0 .621.504 1.125 1.125 1.125h1.5" />
            </svg>
            <span>Generate e-Way Bill</span>
          </button>

          {/* Generate e-Invoice */}
          <button
            type="button"
            onClick={() => setIsEinvoiceModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <span>Generate e-Invoice</span>
          </button>

          {/* Edit Button */}
          <Link
            href={`/sales/credit-note/create?edit=${data.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F46E5] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#4338CA] transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
            </svg>
            <span>Edit</span>
          </Link>
        </div>
      </header>

      {/* 2. MAIN VOUCHER CANVAS (A4 Format) */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center items-start print:p-0 print:m-0 print:overflow-visible bg-[#F4F6F9]">
        <div className="w-full max-w-[850px] bg-white rounded-lg shadow-sm border border-slate-200 p-8 print:p-6 print:border-none print:shadow-none print:max-w-none print:rounded-none">
          {/* Company Branding & Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-5">
            <div>
              <h2 className="text-2xl font-bold uppercase tracking-tight text-slate-900">
                {companyName}
              </h2>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                Mobile: <span className="text-slate-800">{companyPhone}</span>
              </p>
              <p className="text-xs text-slate-600">
                State: <span className="text-slate-800">{companyStateCode} - {companyState}</span>
              </p>
              {companyGstin && (
                <p className="text-xs text-slate-600">
                  GSTIN: <span className="font-mono text-slate-800">{companyGstin}</span>
                </p>
              )}
            </div>

            <div className="text-right">
              <div className="inline-block rounded-md bg-slate-100 px-4 py-1.5 text-sm font-bold tracking-wider text-slate-800 uppercase border border-slate-200">
                SALES RETURN
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Credit Note (u/s 34 of CGST Act)</p>
            </div>
          </div>

          {/* Details Grid (Bill To vs Voucher Metadata) */}
          <div className="grid grid-cols-2 gap-6 py-4 border-b border-slate-200 text-xs">
            {/* Bill To */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Bill To</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{data.party?.name || "Cash Sale"}</p>
              {data.party?.phone && (
                <p className="text-slate-600 mt-0.5">Mobile: {data.party.phone}</p>
              )}
              {data.party?.gstin && (
                <p className="text-slate-600 font-mono mt-0.5">GSTIN: {data.party.gstin}</p>
              )}
              {data.party?.billingAddress && (
                <p className="text-slate-600 mt-0.5">
                  {typeof data.party.billingAddress === "string"
                    ? data.party.billingAddress
                    : `${data.party.billingAddress.street || ""}, ${data.party.billingAddress.city || ""}`}
                </p>
              )}
            </div>

            {/* Voucher Metadata */}
            <div className="flex flex-col items-end text-right space-y-1">
              <div>
                <span className="text-slate-500 font-medium">Sales Return No.: </span>
                <span className="font-bold text-slate-900">{data.returnNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Return Date: </span>
                <span className="font-semibold text-slate-800">{formatDisplayDate(data.returnDate)}</span>
              </div>
              {data.salesInvoice?.invoiceNumber && (
                <div>
                  <span className="text-slate-500 font-medium">Original Invoice No.: </span>
                  <span className="font-mono font-semibold text-slate-800">#{data.salesInvoice.invoiceNumber}</span>
                </div>
              )}
              {data.salesInvoice?.invoiceDate && (
                <div>
                  <span className="text-slate-500 font-medium">Invoice Date: </span>
                  <span className="text-slate-700">{formatDisplayDate(data.salesInvoice.invoiceDate)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Items</th>
                  <th className="py-2.5 px-3 w-24">HSN No.</th>
                  <th className="py-2.5 px-3 w-20 text-right">Qty.</th>
                  <th className="py-2.5 px-3 w-24 text-right">Rate</th>
                  <th className="py-2.5 px-3 w-20 text-right">Tax</th>
                  <th className="py-2.5 px-3 w-28 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data.items || []).map((line, idx) => (
                  <tr key={line.id || idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {line.item?.name || "Item"}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {line.item?.hsnCode || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-800 whitespace-nowrap">
                      {Number(line.quantity).toFixed(2)} {line.item?.primaryUom?.code || "PCS"}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 whitespace-nowrap">
                      {formatInr(line.unitPrice)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 whitespace-nowrap">
                      {Number(line.taxRate) || 0}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                      {formatInr(line.totalAmount)}
                    </td>
                  </tr>
                ))}

                {/* Subtotal row */}
                <tr className="bg-slate-50/80 font-semibold text-slate-800 border-t border-slate-200">
                  <td colSpan={3} className="py-2 px-3 text-right text-[11px] uppercase tracking-wider text-slate-500">
                    Total
                  </td>
                  <td className="py-2 px-3 text-right font-bold whitespace-nowrap">
                    {totalQty.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-400">—</td>
                  <td className="py-2 px-3 text-right font-semibold text-slate-700 whitespace-nowrap">
                    {formatInr(totalTax)}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                    {formatInr(data.grandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bottom Financial & Terms Section */}
          <div className="mt-5 grid grid-cols-2 gap-6 pt-3 text-xs">
            {/* Left Column: Words, Terms, Notes */}
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Amount in Words</p>
                <p className="mt-1 font-semibold text-slate-800 italic">
                  {numberToWordsINR(Number(data.grandTotal) || 0)}
                </p>
              </div>

              {data.reason && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Return Reason / Notes</p>
                  <p className="mt-0.5 text-slate-700">{data.reason}</p>
                </div>
              )}

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Terms & Conditions</p>
                <ol className="mt-1 list-decimal list-inside space-y-0.5 text-slate-500 text-[11px]">
                  <li>Goods once sold will be accepted back only in original unused condition.</li>
                  <li>Credit note valid for adjustment against future purchases.</li>
                  <li>Subject to local state jurisdiction.</li>
                </ol>
              </div>
            </div>

            {/* Right Column: Tax Breakdown & Total */}
            <div className="flex flex-col justify-between">
              <div className="space-y-1.5 border-b border-slate-200 pb-3">
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Amount</span>
                  <span className="font-semibold text-slate-800">{formatInr(data.taxableAmount)}</span>
                </div>

                {Number(data.cgstAmount) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>CGST</span>
                    <span className="font-medium text-slate-800">{formatInr(data.cgstAmount)}</span>
                  </div>
                )}

                {Number(data.sgstAmount) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>SGST</span>
                    <span className="font-medium text-slate-800">{formatInr(data.sgstAmount)}</span>
                  </div>
                )}

                {Number(data.igstAmount) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>IGST</span>
                    <span className="font-medium text-slate-800">{formatInr(data.igstAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2">
                  <span>Total Amount</span>
                  <span>{formatInr(data.grandTotal)}</span>
                </div>

                <div className="flex justify-between text-slate-600 pt-1">
                  <span>Received / Refunded</span>
                  <span className="font-semibold text-slate-800">{formatInr(data.grandTotal)}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Balance</span>
                  <span className="font-semibold text-slate-800">₹ 0.00</span>
                </div>
              </div>

              {/* Signatory Box */}
              <div className="pt-6 text-right">
                <p className="text-[11px] font-semibold text-slate-600 uppercase">For {companyName}</p>
                <div className="h-12" />
                <p className="text-xs font-semibold text-slate-800 border-t border-slate-300 inline-block pt-1 px-4">
                  Authorized Signatory
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Edit History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Edit History</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
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
                className="rounded-lg bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
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
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-3">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25V3.75a1.125 1.125 0 00-1.125-1.125H3.375A1.125 1.125 0 002.25 3.75v10.5c0 .621.504 1.125 1.125 1.125h1.5" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Generate e-Way Bill</h3>
            <p className="mt-1 text-xs text-slate-500">
              e-Way Bill module is configured. The distance and transporter details will be synced with the GST portal.
            </p>
            <button
              type="button"
              onClick={() => setIsEwayModalOpen(false)}
              className="mt-4 w-full rounded-lg bg-[#4F46E5] py-2 text-xs font-semibold text-white hover:bg-[#4338CA]"
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
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-3">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Generate e-Invoice</h3>
            <p className="mt-1 text-xs text-slate-500">
              IRN and signed QR code generation ready for this Credit Note.
            </p>
            <button
              type="button"
              onClick={() => setIsEinvoiceModalOpen(false)}
              className="mt-4 w-full rounded-lg bg-[#4F46E5] py-2 text-xs font-semibold text-white hover:bg-[#4338CA]"
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
