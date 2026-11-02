"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";
import { Modal } from "../../../components/ui/modal";
import { INDIAN_STATES } from "@billing/shared-types";
import {
  InvoiceQrCode,
  InvoiceBarcode,
  InvoiceBarcodeStickerModal,
} from "../components/invoice-barcode-qr";
import { useActiveInvoiceTheme } from "@/lib/use-active-invoice-theme";
import { DynamicThemedInvoice } from "@/components/invoice/dynamic-themed-invoice";

interface PurchaseInvoiceDetail {
  id: string;
  vendorInvoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  placeOfSupply: string;
  itcEligibility: string;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  utgstAmount: number;
  igstAmount: number;
  cessAmount?: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  notes?: string;
  party: {
    id: string;
    name: string;
    nameGujarati?: string;
    gstin?: string;
    stateCode: string;
    phone?: string;
    email?: string;
    billingAddress?: any;
  };
  warehouse?: {
    id: string;
    name: string;
  };
  branch?: {
    id: string;
    name: string;
    code?: string;
  };
  items: Array<{
    id: string;
    hsnCode: string;
    quantity: number;
    unitPrice: number;
    taxableAmount: number;
    taxRate: number;
    cgstAmount: number;
    sgstAmount: number;
    utgstAmount: number;
    igstAmount: number;
    totalAmount: number;
    item: {
      id: string;
      name: string;
      nameGujarati?: string;
      sku?: string;
      primaryUom?: {
        symbol: string;
        name: string;
      };
    };
  }>;
  returns?: Array<{
    id: string;
    returnNumber: string;
    returnDate: string;
    grandTotal: number;
    reason?: string;
    items?: any[];
  }>;
}

function PurchaseInvoiceDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const { lang, currentCompany, user } = useAuth();
  const canPay = ["SUPER_ADMIN", "ORG_ADMIN", "COMPANY_ADMIN", "ACCOUNTANT", "BRANCH_MANAGER"].includes(user?.role || "");

  // ─── Invoice Theme (same as Sales Invoice) ───────────────────────────────
  const { state: invoiceThemeState } = useActiveInvoiceTheme(currentCompany?.id);
  const [selectedPaperSize, setSelectedPaperSize] = useState<"A4" | "A5" | "US_LETTER" | "LEGAL" | "THERMAL_80" | "DL">("A4");

  useEffect(() => {
    if ((invoiceThemeState as any)?.paperSize) {
      setSelectedPaperSize((invoiceThemeState as any).paperSize as any);
    }
  }, [(invoiceThemeState as any)?.paperSize]);

  const [invoice, setInvoice] = useState<PurchaseInvoiceDetail | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Success Banner (shown when redirected from creation)
  const [showCreatedBanner, setShowCreatedBanner] = useState<boolean>(
    searchParams?.get("created") === "true"
  );

  // Payment Recording Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number | "">("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payMode, setPaymentMode] = useState("CASH");
  const [payAccountId, setPayAccountId] = useState("");
  const [payAccounts, setPayAccounts] = useState<any[]>([]);
  const [payReference, setPayReference] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  // Audit Info Modal
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Barcode & QR Sticker Modal
  const [isStickerModalOpen, setIsStickerModalOpen] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined" && id) {
      setInvoiceUrl(`${window.location.origin}/purchases/${id}`);
    }
  }, [id]);

  const fetchInvoice = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [invRes, payRes, ledgerRes]: any = await Promise.all([
        apiClient.get(`/purchases/invoices/${id}`),
        apiClient.get(`/purchases/invoices/${id}/payments`).catch(() => ({ payments: [] })),
        apiClient.get("/accounting/ledgers", { nature: "ASSET", limit: 100 }).catch(() => ({ data: [] })),
      ]);

      setInvoice(invRes);
      setPayments(payRes?.payments || []);

      const accounts = extractList<any>(ledgerRes);
      const cashBank = accounts.filter((a: any) => /cash|bank/i.test(a.name || ""));
      setPayAccounts(cashBank);
      if (cashBank.length > 0 && !payAccountId) {
        setPayAccountId(cashBank[0].id);
      }

      const bal = Number(invRes?.balanceAmount ?? invRes?.grandTotal ?? 0);
      setPayAmount(bal);
    } catch (err: any) {
      setError(err.message || "Failed to load purchase invoice details.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchInvoice();
    }
  }, [id, fetchInvoice]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    const amt = Number(payAmount);
    if (!amt || amt <= 0) {
      setPaymentError(lang === "gu" ? "માન્ય ચુકવણી રકમ દાખલ કરો." : "Please enter a valid payment amount.");
      return;
    }

    setIsSubmittingPayment(true);
    setPaymentError(null);
    try {
      await apiClient.post(
        `/purchases/${invoice.id}/payments`,
        {
          amount: amt.toFixed(2),
          paymentDate: payDate,
          paymentMode: payMode,
          paidFromAccountId: payAccountId || undefined,
          referenceNo: payReference || undefined,
          notes: payNotes || undefined,
        },
        undefined,
        `pay_detail_${invoice.id}_${Date.now()}`
      );

      setPaymentSuccess(
        lang === "gu" ? "ચુકવણી સફળતાપૂર્વક નોંધાઈ ગઈ છે!" : "Supplier payment recorded successfully!"
      );
      setIsPaymentModalOpen(false);
      await fetchInvoice();
    } catch (err: any) {
      setPaymentError(
        lang === "gu" && err.messageGujarati
          ? err.messageGujarati
          : err.message || "Failed to record payment."
      );
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const formatInr = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 border-3 border-[#174B43] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">
          {lang === "gu" ? "ખરીદી બિલ વિગતો લોડ થઈ રહી છે..." : "Loading purchase invoice..."}
        </p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-white rounded-2xl border border-rose-200 shadow-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-xl">
          ⚠️
        </div>
        <h2 className="text-base font-bold text-slate-900">
          {lang === "gu" ? "બિલ લોડ કરવામાં ભૂલ આવી" : "Failed to load purchase invoice"}
        </h2>
        <p className="text-xs text-rose-600">{error || "Invoice not found."}</p>
        <Link
          href="/purchases"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm"
        >
          ← {lang === "gu" ? "બધા ખરીદી બિલ પર પાછા જાઓ" : "Back to Purchase Bills"}
        </Link>
      </div>
    );
  }

  const isInterState = invoice.placeOfSupply !== (currentCompany?.stateCode || "24");
  const balance = Number(invoice.balanceAmount ?? (invoice.grandTotal - (invoice.paidAmount || 0)));
  const isPaid = balance <= 0.01;
  const isPartiallyPaid = !isPaid && Number(invoice.paidAmount) > 0;

  // ─── Build DynamicInvoiceData for the themed invoice renderer ────────────
  const themedInvoiceData = {
    id: invoice.id,
    category: "PURCHASE",
    invoiceNumber: invoice.vendorInvoiceNumber,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    status: isPaid ? "PAID" : isPartiallyPaid ? "PARTIALLY_PAID" : "ISSUED",
    placeOfSupply: invoice.placeOfSupply,
    isB2B: !!invoice.party?.gstin,
    taxableAmount: Number(invoice.taxableAmount),
    cgstAmount: Number(invoice.cgstAmount),
    sgstAmount: Number(invoice.sgstAmount),
    igstAmount: Number(invoice.igstAmount),
    grandTotal: Number(invoice.grandTotal),
    paidAmount: Number(invoice.paidAmount || 0),
    balanceAmount: balance,
    notes: invoice.notes,
    party: {
      id: invoice.party?.id,
      name: invoice.party?.name,
      nameGujarati: invoice.party?.nameGujarati,
      gstin: invoice.party?.gstin,
      stateCode: invoice.party?.stateCode,
      phone: invoice.party?.phone,
      email: invoice.party?.email,
      billingAddress: invoice.party?.billingAddress,
    },
    items: (invoice.items || []).map((row) => ({
      id: row.id,
      hsnCode: row.hsnCode,
      quantity: Number(row.quantity),
      unitPrice: Number(row.unitPrice),
      taxableAmount: Number(row.taxableAmount),
      taxRate: Number(row.taxRate),
      cgstAmount: Number(row.cgstAmount),
      sgstAmount: Number(row.sgstAmount),
      igstAmount: Number(row.igstAmount),
      totalAmount: Number(row.totalAmount),
      unit: row.item?.primaryUom?.symbol,
      item: { name: row.item?.name, nameGujarati: row.item?.nameGujarati, sku: row.item?.sku },
    })),
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 print:space-y-0 print:max-w-none print:w-full print:m-0 print:p-0">
      {/* ─────────────────────────────────────────────────────────────
          1. CREATION SUCCESS NOTIFICATION BANNER
         ───────────────────────────────────────────────────────────── */}
      {showCreatedBanner && (
        <div className="p-3.5 bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between shadow-md print:hidden animate-fadeIn">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span>
              {lang === "gu"
                ? "✓ ખરીદી બિલ સફળતાપૂર્વક સાચવવામાં આવ્યું છે (Purchase Invoice created successfully)"
                : "Purchase Invoice created successfully"}
            </span>
          </div>
          <button
            onClick={() => setShowCreatedBanner(false)}
            className="text-white hover:text-emerald-100 font-bold p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          PAYMENT SUCCESS BANNER
         ───────────────────────────────────────────────────────────── */}
      {paymentSuccess && (
        <div className="p-3.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-between shadow-md print:hidden">
          <span>✓ {paymentSuccess}</span>
          <button onClick={() => setPaymentSuccess(null)} className="text-white hover:text-emerald-100 p-1">✕</button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. TOP ACTION & NAVIGATION HEADER
         ───────────────────────────────────────────────────────────── */}
      <div className="bg-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Back Link, Document Title, Status Pill, Financial Summary */}
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <Link
              href="/purchases"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-[#174B43] hover:bg-[#F2FAF7] rounded-xl border border-slate-200 transition-colors shadow-2xs shrink-0"
              title={lang === "gu" ? "બધા ખરીદી બિલ પર પાછા જાઓ" : "Back to Purchase Invoices"}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>{lang === "gu" ? "પાછા જાઓ" : "Purchases"}</span>
            </Link>

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight truncate">
                  <span>Purchase #{invoice.vendorInvoiceNumber}</span>
                </h1>

                {/* Status Badge */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase ${
                    isPaid
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : isPartiallyPaid
                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                        : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? "bg-emerald-500" : isPartiallyPaid ? "bg-amber-500" : "bg-rose-500"}`} />
                  <span>
                    {isPaid
                      ? (lang === "gu" ? "ચૂકવેલ" : "Paid")
                      : isPartiallyPaid
                        ? (lang === "gu" ? "અડધી ચૂકવણી" : "Partially Paid")
                        : (lang === "gu" ? "બાકી" : "Unpaid")}
                  </span>
                </span>
              </div>
              {invoice.party?.name && (
                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                  {invoice.party.name} • {new Date(invoice.invoiceDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              )}
            </div>

            {/* Financial Summary Pill */}
            <div className="hidden md:flex items-center gap-2 bg-[#F6F8F7] px-3 py-1 rounded-xl border border-slate-200 text-xs shadow-2xs">
              <span className="text-slate-500 font-medium">{lang === "gu" ? "કુલ:" : "Total:"}</span>
              <span className="font-mono font-bold text-slate-900">₹{Number(invoice.grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 font-medium">{lang === "gu" ? "બાકી:" : "Due:"}</span>
              <span className={`font-mono font-bold ${balance > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                ₹{balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Print / PDF */}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#F2FAF7] hover:border-[#85D5C2] text-slate-700 hover:text-[#174B43] border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title={lang === "gu" ? "ઇન્વોઇસ પ્રિન્ટ અથવા PDF ડાઉનલોડ કરો" : "Print Invoice or Save as PDF"}
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>{lang === "gu" ? "પ્રિન્ટ PDF" : "Print PDF"}</span>
            </button>

            {/* Barcode & QR Sticker Modal Button */}
            <button
              onClick={() => setIsStickerModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#F2FAF7] hover:border-[#85D5C2] text-slate-700 hover:text-[#174B43] border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title={lang === "gu" ? "બારકોડ અને QR સ્ટીકર પ્રિન્ટ કરો" : "Print Barcode & QR Sticker"}
            >
              <span>🏷️</span>
              <span>{lang === "gu" ? "બારકોડ સ્ટીકર" : "Barcode Sticker"}</span>
            </button>

            {/* WhatsApp / Share */}
            <button
              onClick={() => {
                const comp = currentCompany?.tradeName || currentCompany?.legalName || "myownbillbook";
                const text = `*Purchase Invoice Record*\nVendor Bill No: ${invoice.vendorInvoiceNumber}\nSupplier: ${invoice.party?.name}\nDate: ${new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}\nGrand Total: ₹${Number(invoice.grandTotal).toFixed(2)}\nBalance Due: ₹${balance.toFixed(2)}\n\nRecorded by: ${comp}`;
                const phone = invoice.party?.phone ? invoice.party.phone.replace(/[^0-9]/g, "") : "";
                const waUrl = phone
                  ? `https://wa.me/${phone.startsWith("91") ? phone : "91" + phone}?text=${encodeURIComponent(text)}`
                  : `https://wa.me/?text=${encodeURIComponent(text)}`;
                window.open(waUrl, "_blank");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#F2FAF7] hover:border-[#85D5C2] text-slate-700 hover:text-[#174B43] border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title={lang === "gu" ? "વોટ્સએપ પર શેર કરો" : "Share via WhatsApp"}
            >
              <span>💬</span>
              <span>{lang === "gu" ? "શેર કરો" : "Share"}</span>
            </button>

            {/* Audit Info Button */}
            <button
              onClick={() => setShowInfoModal(true)}
              className="p-2 bg-white hover:bg-[#F2FAF7] hover:border-[#85D5C2] text-slate-600 hover:text-[#174B43] border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0"
              title={lang === "gu" ? "બિલ ઑડિટ વિગતો" : "Invoice Audit & Details"}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* Record Payment (if unpaid) */}
            {canPay && !isPaid && (
              <button
                onClick={() => {
                  setPayAmount(balance);
                  setPaymentError(null);
                  setIsPaymentModalOpen(true);
                }}
                className="px-4 py-2 bg-[#174B43] hover:bg-[#123B35] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>💳</span>
                <span>{lang === "gu" ? "ચુકવણી નોંધો" : "Record Payment"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. THEMED INVOICE DOCUMENT
             Uses the exact same DynamicThemedInvoice as Sales Invoices,
             so the user's saved theme applies here too.
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full max-w-4xl mx-auto min-w-0 invoice-viewport-wrapper print:block print:max-w-none print:w-full">
        <DynamicThemedInvoice
          invoice={themedInvoiceData as any}
          settings={{ ...invoiceThemeState, paperSize: selectedPaperSize }}
          company={currentCompany as any}
          printableId="printable-invoice"
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. PAYMENT ALLOCATIONS HISTORY & DEBIT NOTE LINK
         ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-6 space-y-4 print:hidden">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span>💳</span>
            <span>Supplier Payments & Debit Notes</span>
          </h3>
          <div className="flex items-center gap-2">
            <Link
              href={`/purchases/returns?invoiceId=${invoice.id}`}
              className="px-3 py-1.5 bg-[#F2FAF7] text-[#174B43] border border-[#BCEADF] rounded-xl text-xs font-bold"
            >
              + Create Debit Note
            </Link>
          </div>
        </div>

        {payments.length > 0 ? (
          <div className="overflow-x-auto border border-slate-200 rounded-xl text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Mode</th>
                  <th className="p-2.5">Reference</th>
                  <th className="p-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p, idx) => (
                  <tr key={idx}>
                    <td className="p-2.5 font-mono">{new Date(p.paymentDate).toLocaleDateString("en-IN")}</td>
                    <td className="p-2.5 font-bold">{p.paymentMode}</td>
                    <td className="p-2.5 font-mono text-slate-500">{p.referenceNo || "—"}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-emerald-700">₹{Number(p.amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400">No payment transactions recorded yet.</p>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          PAYMENT RECORDING MODAL
         ───────────────────────────────────────────────────────────── */}
      {isPaymentModalOpen && (
        <Modal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          title="Record Supplier Payment"
        >
          <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
            {paymentError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                {paymentError}
              </div>
            )}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Amount (₹) *</label>
              <input
                type="number"
                min="0.01"
                max={balance}
                step="any"
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Date *</label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Mode *</label>
                <select
                  value={payMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl font-semibold"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="UPI_QR">UPI / QR</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Paid From Account</label>
              <select
                value={payAccountId}
                onChange={(e) => setPayAccountId(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-xl"
              >
                <option value="">Default Cash Account</option>
                {payAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Reference / UTR / Cheque No.</label>
              <input
                type="text"
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
                placeholder="e.g. UTR-982341"
                className="w-full p-2 border border-slate-300 rounded-xl font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2 border rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingPayment}
                className="px-5 py-2 bg-[#174B43] hover:bg-[#123B35] text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {isSubmittingPayment ? "Recording..." : "Record Payment"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          AUDIT INFO MODAL
         ───────────────────────────────────────────────────────────── */}
      {showInfoModal && (
        <Modal
          isOpen={showInfoModal}
          onClose={() => setShowInfoModal(false)}
          title="Invoice Audit & Compliance Information"
        >
          <div className="p-4 space-y-3 text-xs text-slate-700">
            <div className="flex justify-between py-1 border-b">
              <span className="text-slate-500">Invoice ID:</span>
              <span className="font-mono">{invoice.id}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-slate-500">Place of Supply:</span>
              <span>{invoice.placeOfSupply} - {INDIAN_STATES[invoice.placeOfSupply]?.name || "State"}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-slate-500">ITC Eligibility:</span>
              <span className="font-bold text-emerald-700">{invoice.itcEligibility}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-slate-500">Receiving Godown:</span>
              <span>{invoice.warehouse?.name || "Main Godown"}</span>
            </div>
            <p className="text-slate-500 text-[11px] pt-2">
              This invoice was posted directly to the double-entry general ledger and automated inventory stock card.
            </p>
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          REAL SCANNABLE BARCODE & QR STICKER MODAL
         ───────────────────────────────────────────────────────────── */}
      {invoice && (
        <InvoiceBarcodeStickerModal
          isOpen={isStickerModalOpen}
          onClose={() => setIsStickerModalOpen(false)}
          invoice={invoice}
          company={currentCompany}
          lang={lang}
        />
      )}
    </div>
  );
}

export default function PurchaseInvoiceDetailPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-3 border-[#174B43] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-500">Loading purchase bill details...</p>
          </div>
        </div>
      }
    >
      <PurchaseInvoiceDetailContent />
    </React.Suspense>
  );
}
