"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../../context/auth-context";
import { apiClient } from "../../../../lib/api-client";

interface AllocationRow {
  id: string;
  allocatedAmount: number | string;
  cashDiscount: number | string;
  purchaseInvoice?: {
    id: string;
    vendorInvoiceNumber: string;
    invoiceDate: string;
    grandTotal: number | string;
    balanceAmount: number | string;
  } | null;
}

interface PaymentOutDetail {
  id: string;
  paymentNumber?: string;
  voucherNumber?: string;
  paymentDate?: string;
  voucherDate?: string;
  partyName?: string;
  partyId?: string;
  totalSettled?: number;
  amountPaid?: number;
  discount?: number;
  paymentMode?: string;
  paymentModeLabel?: string;
  narration?: string | null;
  referenceNo?: string | null;
  isCancelled?: boolean;
  allocations?: AllocationRow[];
}

function formatInr(val: number | string): string {
  const num = Number(val) || 0;
  return (
    "₹ " +
    num.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  );
}

function formatPaymentDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function formatTableDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function numberToWordsINR(amount: number): string {
  if (!amount || amount === 0) return "Zero Rupees Only";
  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ",
    "Ten ", "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen ",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertTwoDigits(num: number): string {
    if (num < 20) return a[num];
    return b[Math.floor(num / 10)] + (num % 10 !== 0 ? " " + a[num % 10] : " ");
  }

  function convertThreeDigits(num: number): string {
    let str = "";
    if (Math.floor(num / 100) > 0) {
      str += a[Math.floor(num / 100)] + "Hundred ";
    }
    const rem = num % 100;
    if (rem > 0) {
      str += convertTwoDigits(rem);
    }
    return str;
  }

  const rounded = Math.round(Math.abs(amount) * 100) / 100;
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  let result = "";
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const hundred = rupees % 1000;

  if (crore > 0) result += convertThreeDigits(crore) + "Crore ";
  if (lakh > 0) result += convertThreeDigits(lakh) + "Lakh ";
  if (thousand > 0) result += convertThreeDigits(thousand) + "Thousand ";
  if (hundred > 0) result += convertThreeDigits(hundred);

  result = result.trim() + " Rupees";
  if (paise > 0) {
    result += " and " + convertTwoDigits(paise).trim() + " Paise";
  }
  result += " Only";
  return result;
}

export default function PaymentOutViewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { lang, currentCompany, user } = useAuth();
  const id = params?.id;

  const [payment, setPayment] = useState<PaymentOutDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [showThermalModal, setShowThermalModal] = useState(false);
  const [thermalMargins, setThermalMargins] = useState<{ left: number; right: number }>({ left: 0, right: 0 });

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<PaymentOutDetail>(`/vouchers/payment-out/${id}`);
      setPayment(res);
    } catch (err: any) {
      setError(err.message || "Payment voucher not found.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!payment || typeof window === "undefined") return;
    const shouldPrint = new URLSearchParams(window.location.search).get("print") === "1";
    if (!shouldPrint) return;
    const timer = setTimeout(() => window.print(), 400);
    return () => clearTimeout(timer);
  }, [payment]);

  async function handleDeletePayment() {
    if (!payment) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/vouchers/payment-out/${payment.id}`);
      setShowDeleteModal(false);
      setToast(lang === "gu" ? "ચુકવણી રદ થઈ ગઈ." : "Payment Out deleted successfully.");
      setTimeout(() => {
        router.push("/purchases/payment-out");
      }, 800);
    } catch (err: any) {
      setError(err.message || "Could not delete this payment.");
    } finally {
      setIsDeleting(false);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("thermal_print_margin_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        setThermalMargins({
          left: Number(parsed.left) || 0,
          right: Number(parsed.right) || 0,
        });
      }
    } catch {}
  }, []);

  function handleSaveThermalMargins() {
    if (typeof window !== "undefined") {
      localStorage.setItem("thermal_print_margin_settings", JSON.stringify(thermalMargins));
    }
    setShowThermalModal(false);
    setToast(lang === "gu" ? "થર્મલ પ્રિન્ટ માર્જિન સેટિંગ્સ સેવ થઈ ગયા." : "Thermal print margin settings saved successfully.");
    setTimeout(() => setToast(null), 2500);
  }

  async function handleDownloadPdf() {
    if (!payment) return;
    setIsDownloadingPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = autoTableModule.default || autoTableModule;

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
      const margin = 14;

      const vNum = payment.paymentNumber || payment.voucherNumber || "1";
      const pDate = payment.paymentDate || payment.voucherDate;
      const formattedDate = formatPaymentDate(pDate);
      const amountPaid = Number(payment.amountPaid) || 0;
      const discount = Number(payment.discount) || 0;
      const totalSettled = Number(payment.totalSettled) || amountPaid + discount;

      const companyName = currentCompany?.legalName || currentCompany?.tradeName || "MODI CHAI";
      const gstin = currentCompany?.gstin || "";
      const city = currentCompany?.city || "";
      const phone = user?.phone || "";

      // 1. Top Brand Accent Line
      doc.setFillColor(79, 70, 229); // #4F46E5 indigo
      doc.rect(margin, 10, pageWidth - margin * 2, 2.5, "F");

      // 2. Company Information (Left)
      let y = 19;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(companyName, margin, y);

      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105); // slate-600
      if (gstin) {
        doc.text(`GSTIN: ${gstin}`, margin, y);
        y += 4;
      }
      const locationParts = [city, phone ? `Phone: ${phone}` : ""].filter(Boolean).join(" | ");
      if (locationParts) {
        doc.text(locationParts, margin, y);
        y += 4;
      }

      // Voucher Header Badge (Right)
      const badgeWidth = 62;
      const badgeX = pageWidth - margin - badgeWidth;
      doc.setFillColor(79, 70, 229);
      doc.roundedRect(badgeX, 15, badgeWidth, 7, 1.5, 1.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text("PAYMENT OUT VOUCHER", badgeX + badgeWidth / 2, 19.5, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`Voucher No: #${vNum}`, badgeX + badgeWidth, 27, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Date: ${formattedDate}`, badgeX + badgeWidth, 31.5, { align: "right" });

      // Divider
      y = Math.max(y, 34);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageWidth - margin, y);

      // 3. Info Cards Box (Party Details & Payment Details)
      y += 4;
      const boxHeight = 22;
      const boxWidth = pageWidth - margin * 2;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, boxWidth, boxHeight, 2, 2, "FD");

      const halfWidth = boxWidth / 2;
      // Left Column: Supplier / Paid To
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("PAID TO (SUPPLIER)", margin + 4, y + 6);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(payment.partyName || "Supplier", margin + 4, y + 12);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(22, 101, 52); // green-700
      doc.text("Payment Status: Completed / Settled", margin + 4, y + 17);

      // Vertical Divider
      doc.setDrawColor(226, 232, 240);
      doc.line(margin + halfWidth, y + 3, margin + halfWidth, y + boxHeight - 3);

      // Right Column: Payment Details
      const rightColX = margin + halfWidth + 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("PAYMENT DETAILS", rightColX, y + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text("Payment Mode:", rightColX, y + 11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(payment.paymentModeLabel || payment.paymentMode || "Cash", rightColX + 28, y + 11);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("Payment Date:", rightColX, y + 16.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(formattedDate, rightColX + 28, y + 16.5);

      if (payment.referenceNo) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text(`Ref: ${payment.referenceNo}`, rightColX + 60, y + 16.5);
      }

      y += boxHeight + 6;

      // 4. Invoices Settled Table
      const allocations = payment.allocations || [];
      if (allocations.length > 0) {
        const head = [["Date", "Invoice Number", "Invoice Amount", "Discount", "Amount Paid", "Balance Amount"]];
        const body = allocations.map((alloc) => {
          const bill = alloc.purchaseInvoice;
          const paid = Number(alloc.allocatedAmount) || 0;
          const disc = Number(alloc.cashDiscount) || 0;
          const invTotal = Number(bill?.grandTotal) || 0;
          const bal =
            bill?.balanceAmount !== undefined
              ? Number(bill.balanceAmount)
              : Math.max(0, invTotal - paid - disc);

          return [
            formatTableDate(bill?.invoiceDate),
            bill?.vendorInvoiceNumber || "—",
            `Rs. ${invTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            `Rs. ${disc.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            `Rs. ${paid.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            `Rs. ${bal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          ];
        });

        const totalInvoiceAmt = allocations.reduce((sum, a) => sum + (Number(a.purchaseInvoice?.grandTotal) || 0), 0);
        const totalDisc = allocations.reduce((sum, a) => sum + (Number(a.cashDiscount) || 0), 0);
        const totalPaid = allocations.reduce((sum, a) => sum + (Number(a.allocatedAmount) || 0), 0);
        const totalBal = allocations.reduce((sum, a) => {
          const invTotal = Number(a.purchaseInvoice?.grandTotal) || 0;
          const paid = Number(a.allocatedAmount) || 0;
          const disc = Number(a.cashDiscount) || 0;
          const bal =
            a.purchaseInvoice?.balanceAmount !== undefined
              ? Number(a.purchaseInvoice.balanceAmount)
              : Math.max(0, invTotal - paid - disc);
          return sum + bal;
        }, 0);

        const foot = [[
          "",
          "Total",
          `Rs. ${totalInvoiceAmt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `Rs. ${totalDisc.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `Rs. ${totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `Rs. ${totalBal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        ]];

        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head,
          body,
          foot,
          theme: "grid",
          headStyles: {
            fillColor: [79, 70, 229],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 8.5,
            cellPadding: 2.5,
          },
          footStyles: {
            fillColor: [238, 242, 255],
            textColor: [55, 48, 163],
            fontStyle: "bold",
            fontSize: 8.5,
            cellPadding: 2.5,
          },
          styles: {
            fontSize: 8,
            cellPadding: 2.5,
            textColor: [30, 41, 59],
            lineColor: [226, 232, 240],
            lineWidth: 0.15,
          },
          columnStyles: {
            2: { halign: "right" },
            3: { halign: "right" },
            4: { halign: "right" },
            5: { halign: "right" },
          },
        });

        y = (doc as any).lastAutoTable.finalY + 5;
      } else {
        // Advance on-account note
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, y, boxWidth, 14, 2, 2, "FD");
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(
          "Note: This payment was recorded as an advance on-account payment to the supplier. No individual purchase bills were allocated.",
          margin + 4,
          y + 8.5,
        );
        y += 20;
      }

      // 5. Financial Summary & Amount in Words
      const summaryWidth = 80;
      const summaryX = pageWidth - margin - summaryWidth;
      const notesWidth = summaryX - margin - 6;

      // Left Notes & Amount in Words Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, notesWidth, 32, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("AMOUNT IN WORDS", margin + 4, y + 5.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      const words = numberToWordsINR(amountPaid);
      const splitWords = doc.splitTextToSize(words, notesWidth - 8);
      doc.text(splitWords, margin + 4, y + 10.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("NOTES / NARRATION", margin + 4, y + 21);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(payment.narration || "--", margin + 4, y + 26);

      // Right Summary Box
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(summaryX, y, summaryWidth, 32, 2, 2, "FD");

      let sumY = y + 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text("Total Settled Amount:", summaryX + 4, sumY);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(`Rs. ${totalSettled.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, summaryX + summaryWidth - 4, sumY, { align: "right" });

      sumY += 6;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("Discount Received:", summaryX + 4, sumY);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(`Rs. ${discount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, summaryX + summaryWidth - 4, sumY, { align: "right" });

      sumY += 4;
      doc.setDrawColor(226, 232, 240);
      doc.line(summaryX + 4, sumY, summaryX + summaryWidth - 4, sumY);

      sumY += 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(79, 70, 229); // Brand purple
      doc.text("Amount Paid:", summaryX + 4, sumY);
      doc.text(`Rs. ${amountPaid.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, summaryX + summaryWidth - 4, sumY, { align: "right" });

      // 6. Signatory & Bottom Footer
      y += 38;
      const signBoxY = y;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text("* This is a computer generated payment voucher.", margin, signBoxY + 16);
      doc.text(`Generated on: ${new Date().toLocaleString("en-IN")}`, margin, signBoxY + 20);

      // Signatory on the right
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`For ${companyName}`, pageWidth - margin, signBoxY + 2, { align: "right" });

      doc.setDrawColor(203, 213, 225);
      doc.line(pageWidth - margin - 50, signBoxY + 16, pageWidth - margin, signBoxY + 16);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Authorized Signatory", pageWidth - margin - 25, signBoxY + 20, { align: "center" });

      // 7. Save & Trigger Client-Side Download
      const fileName = `Payment_Out_${vNum}.pdf`;
      doc.save(fileName);

      setToast(lang === "gu" ? `PDF '${fileName}' સફળતાપૂર્વક ડાઉનલોડ થઈ ગયું છે.` : `PDF '${fileName}' downloaded successfully!`);
      setTimeout(() => setToast(null), 3500);
    } catch (err: any) {
      console.error("PDF download failed:", err);
      setError(err.message || "Failed to generate PDF");
    } finally {
      setIsDownloadingPdf(false);
    }
  }

  function handleShareCopy() {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setToast("Payment link copied to clipboard!");
      setTimeout(() => setToast(null), 2500);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center font-sans bg-[#F4F5F7]">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span>Loading payment details...</span>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-6 text-center font-sans bg-[#F4F5F7]">
        <h2 className="text-base font-bold text-slate-800">Payment Out Voucher Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">{error || "The requested voucher does not exist."}</p>
        <Link
          href="/purchases/payment-out"
          className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
        >
          Back to Payment Out
        </Link>
      </div>
    );
  }

  const vNum = payment.paymentNumber || payment.voucherNumber || "1";
  const pDate = payment.paymentDate || payment.voucherDate;
  const allocations = payment.allocations || [];

  return (
    <div className="min-h-screen bg-[#F4F5F7] font-sans pb-24">
      {/* 1. Top Header Bar: matches myBillBook screenshot */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href="/purchases/payment-out"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 9H16a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900">Payment Out #{vNum}</h1>
            {payment.isCancelled && (
              <span className="rounded bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                CANCELLED
              </span>
            )}
          </div>
        </div>

        {/* Top Right Buttons: Edit, Delete, Print */}
        <div className="flex items-center gap-2">
          {!payment.isCancelled && (
            <Link
              href={`/purchases/payment-out/${payment.id}/edit`}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <svg className="w-3.5 h-3.5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit</span>
            </Link>
          )}

          {!payment.isCancelled && (
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              title="Delete Payment"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-white text-red-500 hover:bg-red-50 transition-colors shadow-2xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowThermalModal(true)}
            title="Thermal Print Margin Settings"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <svg className="w-4 h-4 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-xl animate-fade-in">
          {toast}
        </div>
      )}

      {error && (
        <div className="mx-6 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">✕</button>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto px-6 py-4 space-y-4">
        {/* 2. Action Buttons Row: Download PDF, Print PDF, Info, Share */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isDownloadingPdf}
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors disabled:opacity-60 cursor-pointer"
          >
            {isDownloadingPdf ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            ) : (
              <svg className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            <span>{isDownloadingPdf ? (lang === "gu" ? "ડાઉનલોડ થઈ રહ્યું છે..." : "Downloading...") : "Download PDF"}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print PDF</span>
          </button>

          <div className="relative group">
            <button
              type="button"
              onClick={() => setShowThermalModal(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
            >
              <span className="text-xs font-bold">ⓘ</span>
            </button>
            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex w-64 rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] leading-tight text-white shadow-lg z-30">
              Customize the layout of your thermal print by clicking on thermal settings button.
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsShareOpen(!isShareOpen)}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
            >
              <svg className="w-3.5 h-3.5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span>Share</span>
              <span className="text-[10px] text-slate-400">▼</span>
            </button>

            {isShareOpen && (
              <div
                className="absolute left-0 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg z-20 text-xs"
                onClick={() => setIsShareOpen(false)}
              >
                <button
                  type="button"
                  onClick={handleShareCopy}
                  className="flex w-full items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50"
                >
                  <span>📋</span>
                  <span>Copy Link</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(window.location.href)}`, "_blank");
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50"
                >
                  <span>💬</span>
                  <span>WhatsApp</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 3. Card 1: Payment Details - exact match of myBillBook layout */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
          <div className="bg-[#F8FAFC] border-b border-slate-200 px-6 py-3">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Payment Details
            </h2>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
              <div>
                <p className="text-xs text-slate-500">Party Name</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{payment.partyName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Payment Date</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{formatPaymentDate(pDate)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Amount Paid</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{formatInr(payment.amountPaid || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Payment Out Discount</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{formatInr(payment.discount || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Payment Mode</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {payment.paymentModeLabel || payment.paymentMode || "Cash"}
                </p>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-xs text-slate-500">Notes</p>
              <p className="mt-1 text-xs text-slate-800">{payment.narration || "--"}</p>
            </div>
          </div>
        </div>

        {/* 4. Card 2: Invoices settled with this payment - exact match of myBillBook table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
          <div className="bg-[#F8FAFC] border-b border-slate-200 px-6 py-3">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Invoices settled with this payment
            </h2>
          </div>

          {allocations.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              This payment was recorded as an advance on-account payment to the supplier. No individual purchase bills were allocated.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs border-collapse">
                <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-6 py-3 whitespace-nowrap">Date</th>
                    <th className="px-6 py-3 whitespace-nowrap">Invoice Number</th>
                    <th className="px-6 py-3 whitespace-nowrap">Invoice Amount</th>
                    <th className="px-6 py-3 whitespace-nowrap">Discount</th>
                    <th className="px-6 py-3 whitespace-nowrap">Amount Paid</th>
                    <th className="px-6 py-3 whitespace-nowrap">Balance Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {allocations.map((alloc) => {
                    const bill = alloc.purchaseInvoice;
                    const paid = Number(alloc.allocatedAmount) || 0;
                    const disc = Number(alloc.cashDiscount) || 0;
                    const invoiceGrandTotal = Number(bill?.grandTotal) || 0;
                    const currentBalance =
                      bill?.balanceAmount !== undefined
                        ? Number(bill.balanceAmount)
                        : Math.max(0, invoiceGrandTotal - paid - disc);

                    return (
                      <tr key={alloc.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3.5 whitespace-nowrap text-slate-700">
                          {formatTableDate(bill?.invoiceDate)}
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap font-medium text-slate-900">
                          {bill?.vendorInvoiceNumber || "—"}
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-slate-900">
                          {formatInr(invoiceGrandTotal)}
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-slate-700">
                          {formatInr(disc)}
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap font-semibold text-slate-900">
                          {formatInr(paid)}
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-slate-700">
                          {formatInr(currentBalance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete / Cancel Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl p-6">
            <h3 className="text-base font-bold text-slate-900">Delete Payment Out</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete payment voucher <strong>#{vNum}</strong> of{" "}
              <strong>{formatInr(payment.amountPaid || 0)}</strong>?
              <br />
              <br />
              This will restore the unpaid balance on all associated purchase invoices.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeletePayment}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Print Margin Settings Modal */}
      {showThermalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <h3 className="text-sm font-semibold text-slate-800">Thermal Print Margin Settings</h3>
              <button
                type="button"
                onClick={() => setShowThermalModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">Spacing</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Left</label>
                    <div className="flex items-center rounded-lg border border-slate-300 bg-white overflow-hidden focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={thermalMargins.left}
                        onChange={(e) => setThermalMargins({ ...thermalMargins, left: Number(e.target.value) || 0 })}
                        className="w-full px-3 py-1.5 text-xs text-slate-800 outline-none"
                      />
                      <span className="bg-slate-50 border-l border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-500">
                        mm
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Right</label>
                    <div className="flex items-center rounded-lg border border-slate-300 bg-white overflow-hidden focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={thermalMargins.right}
                        onChange={(e) => setThermalMargins({ ...thermalMargins, right: Number(e.target.value) || 0 })}
                        className="w-full px-3 py-1.5 text-xs text-slate-800 outline-none"
                      />
                      <span className="bg-slate-50 border-l border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-500">
                        mm
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3">
              <button
                type="button"
                onClick={() => setShowThermalModal(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveThermalMargins}
                className="rounded-lg bg-[#4F46E5] px-5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
