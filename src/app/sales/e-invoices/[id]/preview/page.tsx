"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { einvoiceApi, EInvoiceDetailsResponse } from "@/lib/einvoice";
import { DynamicThemedInvoice } from "@/components/invoice/dynamic-themed-invoice";
import { DEFAULT_INVOICE_STUDIO_STATE, InvoiceStudioState } from "@/components/invoice/invoice-settings-studio";

export default function EInvoicePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { lang, currentCompany } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EInvoiceDetailsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Theme settings
  const [settings, setSettings] = useState<InvoiceStudioState>({
    ...DEFAULT_INVOICE_STUDIO_STATE,
    themeId: "stylish",
    accentColor: "#059669",
  });

  const [activeTheme, setActiveTheme] = useState("stylish");

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

  const handleThemeChange = (themeId: string) => {
    setActiveTheme(themeId);
    setSettings((prev) => ({
      ...prev,
      themeId,
      accentColor:
        themeId === "luxury"
          ? "#d97706"
          : themeId === "tally"
          ? "#1e293b"
          : themeId === "festival"
          ? "#b91c1c"
          : "#059669",
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent"></div>
          <span className="text-sm font-semibold text-slate-600">Rendering themed e-invoice preview...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-900">
          <h2 className="text-base font-bold">Could not load preview</h2>
          <p className="mt-1 text-xs">{error || "Invoice not found"}</p>
          <Link
            href="/sales/e-invoices"
            className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
          >
            ← Return to E-Invoices
          </Link>
        </div>
      </div>
    );
  }

  const { invoice, company, eInvoice } = data;
  const isRegistered = eInvoice && eInvoice.status === "ACT";

  // Build invoice data matching DynamicInvoiceData
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
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/sales/e-invoices" className="hover:text-emerald-700 transition">
              E-Invoices
            </Link>
            <span>/</span>
            <Link href={`/sales/e-invoices/${id}`} className="hover:text-emerald-700 transition">
              {invoice.invoiceNumber}
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800">Preview</span>
          </div>
          <h1 className="text-xl font-black text-slate-900">
            {lang === "gu" ? "થીમ આધારીત ઇન્વોઇસ પૂર્વાવલોકન" : "Live Themed E-Invoice Preview"}
          </h1>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Theme selector pills */}
          <div className="flex items-center rounded-lg border border-slate-300 bg-white p-1 text-xs shadow-2xs">
            {[
              { id: "stylish", label: "Modern GST" },
              { id: "tally", label: "Tally GST" },
              { id: "luxury", label: "Executive" },
              { id: "festival", label: "Festive" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => handleThemeChange(t.id)}
                className={`rounded-md px-2.5 py-1 font-semibold transition ${
                  activeTheme === t.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t.label}
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
            Print
          </button>

          <a
            href={`/e-invoices/${id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Official PDF
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
                Notice: This Invoice is in Draft / Preview Mode
              </div>
              <div className="text-[11px] text-amber-800">
                Official Government IRN and IRP Signed QR code will appear on this invoice after registration.
              </div>
            </div>
          </div>
          <Link
            href={`/sales/e-invoices/${id}`}
            className="shrink-0 rounded-lg bg-emerald-600 px-3.5 py-1.5 font-bold text-white hover:bg-emerald-700 transition"
          >
            Review & Generate IRN →
          </Link>
        </div>
      )}

      {/* Render The Themed Invoice */}
      <div className="mx-auto max-w-4xl transition-all">
        <DynamicThemedInvoice
          invoice={previewInvoiceData}
          settings={settings}
          company={company}
        />
      </div>
    </div>
  );
}
