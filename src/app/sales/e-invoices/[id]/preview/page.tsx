"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { einvoiceApi, EInvoiceDetailsResponse } from "@/lib/einvoice";
import { OfficialGovernmentEInvoiceTemplate } from "@/components/invoice/official-government-einvoice-template";

export default function EInvoicePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { lang, currentCompany } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EInvoiceDetailsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Copy Type state (Original for Recipient, Duplicate for Transporter, Triplicate for Supplier)
  const [copyType, setCopyType] = useState<"ORIGINAL" | "DUPLICATE" | "TRIPLICATE">("ORIGINAL");

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const res = await einvoiceApi.getDetails(id);
        setData(res);
      } catch (err: any) {
        setError(err.message || "Failed to load invoice preview.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent"></div>
          <span className="text-sm font-semibold text-slate-600">
            {lang === "gu" ? "અધિકૃત ઈ-ઇનવોઇસ પૂર્વાવલોકન લોડ થઈ રહ્યું છે..." : "Rendering official statutory e-invoice preview..."}
          </span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-900">
          <h2 className="text-base font-bold">{lang === "gu" ? "પૂર્વાવલોકન લોડ થઈ શક્યું નથી" : "Could not load preview"}</h2>
          <p className="mt-1 text-xs">{error || "Invoice not found"}</p>
          <Link
            href="/sales/e-invoices"
            className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
          >
            ← {lang === "gu" ? "ઈ-ઇનવોઇસ યાદી પર પાછા જાઓ" : "Return to E-Invoices"}
          </Link>
        </div>
      </div>
    );
  }

  const { invoice, company, eInvoice } = data;
  const isRegistered = eInvoice && eInvoice.status === "ACT";

  // Build invoice data matching OfficialGovernmentEInvoiceTemplate
  const previewInvoiceData = {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    status: invoice.status,
    category: invoice.category,
    paymentMode: invoice.paymentMode,
    placeOfSupply: invoice.placeOfSupply,
    taxableAmount: invoice.taxableAmount,
    cgstAmount: invoice.cgstAmount,
    sgstAmount: invoice.sgstAmount,
    igstAmount: invoice.igstAmount,
    roundOff: invoice.roundOff,
    grandTotal: invoice.grandTotal,
    paidAmount: invoice.paidAmount,
    balanceAmount: invoice.balanceAmount,
    party: invoice.party,
    items: invoice.items,
    eInvoiceRecord: eInvoice,
    isEinvoiceDraft: !isRegistered,
  };

  return (
    <div className="min-h-screen bg-slate-100/70 p-4 sm:p-6 lg:p-8 print:p-0 print:bg-white">
      {/* Top Action Bar */}
      <div className="mx-auto max-w-4xl mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/sales/e-invoices" className="hover:text-emerald-700 transition">
              E-Invoices
            </Link>
            <span>/</span>
            <Link href={`/sales/e-invoices/${id}`} className="hover:text-emerald-700 transition font-mono">
              {invoice.invoiceNumber}
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800">
              {lang === "gu" ? "અધિકૃત પૂર્વાવલોકન" : "Official Preview"}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {lang === "gu" ? "અધિકૃત સરકારી ઈ-ઇનવોઇસ પૂર્વાવલોકન" : "Official Government E-Invoice Preview"}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-300">
              <svg className="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              NIC Standard Form GST INV-01
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            {lang === "gu"
              ? "CGST નિયમો, 2017 ના નિયમ 48(4) હેઠળ જારી કરાયેલ અધિકૃત ગવર્નમેન્ટ લેઆઉટ"
              : "Rule 48(4) of the CGST Rules, 2017 — Authorized Statutory Government Format"}
          </p>
        </div>

        {/* Controls Bar: Statutory Copy Selector & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Statutory Copy Selector */}
          <div className="flex items-center rounded-lg border border-slate-300 bg-white p-1 text-xs shadow-2xs">
            {[
              { id: "ORIGINAL", label: lang === "gu" ? "મૂળ (ગ્રાહક)" : "Original" },
              { id: "DUPLICATE", label: lang === "gu" ? "ટ્રાન્સપોર્ટર" : "Duplicate" },
              { id: "TRIPLICATE", label: lang === "gu" ? "વેચનાર" : "Triplicate" },
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => setCopyType(c.id as any)}
                className={`rounded-md px-2.5 py-1 font-semibold transition ${
                  copyType === c.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            {lang === "gu" ? "પ્રિન્ટ" : "Print"}
          </button>

          <a
            href={`/e-invoices/${id}/pdf?copy=${copyType}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {lang === "gu" ? "અધિકૃત PDF ડાઉનલોડ" : "Download Official PDF"}
          </a>
        </div>
      </div>

      {/* Draft Notification Banner before registration */}
      {!isRegistered && (
        <div className="mx-auto max-w-4xl mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs print:hidden">
          <div className="flex items-center gap-3">
            <span className="text-2xl">ℹ️</span>
            <div>
              <div className="font-bold text-amber-900">
                {lang === "gu"
                  ? "સૂચના: આ ઇન્વોઇસ ડ્રાફ્ટ / પૂર્વાવલોકન મોડમાં છે"
                  : "Notice: This Document is in Draft / Preview Mode"}
              </div>
              <div className="text-[11px] text-amber-800">
                {lang === "gu"
                  ? "IRP પર સત્તાવાર રજિસ્ટ્રેશન થયા બાદ અસલ સરકારી IRN અને ડિજિટલ સહી થયેલ QR કોડ અહીં દેખાશે."
                  : "Official Government IRN and IRP Signed QR code will appear on this official template after registration."}
              </div>
            </div>
          </div>
          <Link
            href={`/sales/e-invoices/${id}`}
            className="shrink-0 rounded-lg bg-emerald-600 px-3.5 py-1.5 font-bold text-white hover:bg-emerald-700 transition shadow-xs"
          >
            {lang === "gu" ? "તપાસો અને IRN જનરેટ કરો →" : "Review & Generate IRN →"}
          </Link>
        </div>
      )}

      {/* Render The Official Government Standard E-Invoice */}
      <div className="mx-auto max-w-4xl transition-all">
        <OfficialGovernmentEInvoiceTemplate
          invoice={previewInvoiceData}
          company={company}
          copyType={copyType}
        />
      </div>
    </div>
  );
}
