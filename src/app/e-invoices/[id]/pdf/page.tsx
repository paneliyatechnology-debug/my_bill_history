"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { einvoiceApi, EInvoiceDetailsResponse } from "@/lib/einvoice";
import { OfficialGovernmentEInvoiceTemplate } from "@/components/invoice/official-government-einvoice-template";

export default function EInvoicePdfViewerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params?.id as string;
  const { lang } = useAuth();

  const rawCopy = searchParams?.get("copy")?.toUpperCase();
  const copyType = rawCopy === "DUPLICATE" ? "DUPLICATE" : rawCopy === "TRIPLICATE" ? "TRIPLICATE" : "ORIGINAL";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EInvoiceDetailsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const res = await einvoiceApi.getDetails(id);
        setData(res);
      } catch (err: any) {
        setError(err.message || "Failed to load e-invoice.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const el = document.getElementById("printable-official-einvoice");
    if (!el) {
      window.print();
      return;
    }
    setIsDownloadingPdf(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 5;
      const printableWidth = pdfWidth - margin * 2;
      const imgHeight = (canvas.height * printableWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", margin, margin, printableWidth, Math.min(imgHeight, pageHeight - margin * 2));
      pdf.save(`EInvoice-${data?.invoice?.invoiceNumber || "Document"}.pdf`);
    } catch (err) {
      console.warn("Client PDF generation fallback to print:", err);
      window.print();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8 bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent"></div>
          <span className="text-sm font-semibold text-slate-600">
            {lang === "gu" ? "અધિકૃત સરકારી ઈ-ઇનવોઇસ PDF લોડ થઈ રહ્યું છે..." : "Loading official statutory e-invoice document..."}
          </span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-900">
          <h2 className="text-[15px] font-semibold">{lang === "gu" ? "દસ્તાવેજ મળ્યો નથી" : "Document Not Found"}</h2>
          <p className="mt-1 text-xs">{error || "Could not load the requested e-invoice."}</p>
          <Link
            href="/sales/e-invoices"
            className="mt-4 inline-block rounded-lg bg-[#1677E8] h-9 px-3 text-[13px] font-medium text-white hover:bg-[#1268D3]"
          >
            ← {lang === "gu" ? "ઈ-ઇનવોઇસ યાદી પર પાછા જાઓ" : "Return to E-Invoices"}
          </Link>
        </div>
      </div>
    );
  }

  const { invoice, company, eInvoice } = data;

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
    isEinvoiceDraft: !Boolean(eInvoice && eInvoice.status === "ACT"),
  };

  return (
    <div className="min-h-screen bg-slate-100/80 p-4 sm:p-6 lg:p-8 print:p-0 print:bg-white">
      {/* Action Bar */}
      <div className="mx-auto max-w-4xl mb-4 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2 text-xs">
          <Link
            href={`/sales/e-invoices/${id}`}
            className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-emerald-700 transition"
          >
            ← {lang === "gu" ? "વિગતો પર પાછા જાઓ" : "Back to E-Invoice Details"}
          </Link>
          <span className="text-slate-300">|</span>
          <span className="tabular-nums font-bold text-slate-900">{invoice.invoiceNumber}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white h-9 px-3 text-[13px] font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition cursor-pointer"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            {lang === "gu" ? "પ્રિન્ટ" : "Print A4"}
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1677E8] px-4 py-1.5 text-[13px] font-medium text-white shadow-xs hover:bg-[#1268D3] transition disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {isDownloadingPdf
              ? (lang === "gu" ? "PDF જનરેટ થઈ રહ્યું છે..." : "Generating...")
              : (lang === "gu" ? "PDF ડાઉનલોડ" : "Save PDF")}
          </button>
        </div>
      </div>

      {/* Official Government Template */}
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

