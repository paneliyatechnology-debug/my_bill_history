"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../context/auth-context";
import { apiClient } from "../../../../lib/api-client";
import { Modal } from "../../../../components/ui/modal";
import { StatusBadge } from "../../../../components/ui/badge";

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

  const fetchInvoice = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [invRes, allocRes, retRes]: any = await Promise.all([
        apiClient.get(`/invoices/sales/${id}`),
        apiClient.get(`/invoices/sales/${id}/allocations`).catch(() => []),
        apiClient
          .get(`/sales-returns`, { salesInvoiceId: id })
          .catch(() => ({ data: [] })),
      ]);
      setInvoice(invRes);
      setAllocations(Array.isArray(allocRes) ? allocRes : []);
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
        <div className="inline-block w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
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
          className="text-xs text-slate-600 underline"
        >
          Return to Invoices List
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Action Bar (Hidden on Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/sales/invoices"
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            ← Invoices
          </Link>
          <span className="text-slate-300">/</span>
          <span className="font-mono font-bold text-slate-900 text-sm">
            {invoice.invoiceNumber}
          </span>
          <StatusBadge status={invoice.status} />
        </div>

        <div className="flex items-center gap-2">
          {invoice.status === "DRAFT" && (
            <button
              onClick={() => handleIssueInvoice(false)}
              disabled={isIssuing}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
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
                    ? "Convert to Tax Invoice (પાકું બિલ)"
                    : "Issue Invoice"}
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
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              Record Payment (ચુકવણી નોંધો)
            </button>
          )}

          {!["CANCELLED", "DRAFT"].includes(invoice.status) && (
            <Link
              href={`/sales/returns?invoiceId=${invoice.id}`}
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold rounded-lg flex items-center gap-1.5"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
              <span>Credit Note / Return</span>
            </Link>
          )}

          {!["CANCELLED", "DRAFT"].includes(invoice.status) && (
            <button
              onClick={() => {
                setCancelReason("");
                setCancelError(null);
                setIsCancelModalOpen(true);
              }}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg"
            >
              Cancel Invoice
            </button>
          )}

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
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <span>💬 WhatsApp</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <svg
              className="w-4 h-4"
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
            <span>Print Invoice</span>
          </button>
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
      <div className="bg-white p-8 sm:p-12 rounded-2xl border border-slate-200 shadow-lg text-slate-900 font-sans print:shadow-none print:border-none print:p-0">
        {/* Header: Company & Tax Invoice Title */}
        <div className="border-b-2 border-slate-900 pb-6 mb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
              {currentCompany?.tradeName ||
                currentCompany?.legalName ||
                "MyBill History Enterprise"}
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              GSTIN:{" "}
              <span className="font-mono font-bold text-slate-900">
                {currentCompany?.gstin || "24AAAAA0000A1Z5"}
              </span>
            </p>
            <p className="text-xs text-slate-600">
              State:{" "}
              <span className="font-mono font-semibold">
                Gujarat (Code: {currentCompany?.stateCode || "24"})
              </span>
            </p>
          </div>

          <div className="text-right sm:text-right">
            <span className="inline-block bg-slate-900 text-white font-bold text-xs uppercase px-3 py-1 rounded tracking-wider mb-2">
              {invoice.category === "PROFORMA_INVOICE"
                ? "QUOTATION / ESTIMATE (કાચું બિલ)"
                : invoice.category === "DELIVERY_CHALLAN"
                  ? "DELIVERY CHALLAN (ચલણ)"
                  : invoice.category === "BILL_OF_SUPPLY"
                    ? "BILL OF SUPPLY (મુક્તિ બિલ)"
                    : "TAX INVOICE (પાકું બિલ)"}
            </span>
            <div className="text-xs text-slate-600 space-y-0.5">
              <p>
                Invoice No:{" "}
                <span className="font-mono font-bold text-slate-900">
                  {invoice.invoiceNumber}
                </span>
              </p>
              <p>
                Date:{" "}
                <span className="font-mono font-bold text-slate-900">
                  {new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}
                </span>
              </p>
              <p>
                Place of Supply:{" "}
                <span className="font-mono font-bold text-slate-900">
                  {invoice.placeOfSupply}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Billed To / Customer Information */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-bold text-slate-500 uppercase tracking-wider mb-1">
              Details of Receiver (Billed To):
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
            <p className="font-bold text-slate-500 uppercase tracking-wider mb-1">
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
        <div className="border border-slate-300 rounded-lg overflow-hidden mb-6">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase tracking-wider">
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
            <tbody className="divide-y divide-slate-200">
              {invoice.items.map((item, idx) => {
                const itemTax =
                  Number(item.cgstAmount || 0) +
                  Number(item.sgstAmount || 0) +
                  Number(item.igstAmount || 0);
                return (
                  <tr key={idx} className="hover:bg-slate-50">
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
            <div className="border border-slate-300 rounded-lg overflow-hidden mb-6 bg-white">
              <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-300 flex justify-between items-center">
                <span className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                  {lang === "gu"
                    ? "જીએસટી કર વિગત સમરી (GST Tax Breakdown)"
                    : "Statutory GST Tax Summary"}
                </span>
                <span className="text-[11px] text-slate-600 font-medium">
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
                    <td className="py-2 px-3 font-sans">Total / કુલ કર:</td>
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
            <div>
              <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Bank / Remittance Details:
              </p>
              <p className="text-slate-600">
                Please settle via Cash, NEFT or UPI to registered account.
              </p>
            </div>
          </div>

          <div className="w-full sm:w-80 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between text-slate-700">
              <span>{lang === "gu" ? "કરપાત્ર રકમ (Taxable Value):" : "Taxable Value (કરપાત્ર):"}</span>
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
            <div className="border-t-2 border-slate-300 pt-2 flex justify-between font-bold text-slate-900 text-sm">
              <span>{lang === "gu" ? "કુલ બિલ રકમ (Grand Total):" : "Invoice Grand Total:"}</span>
              <span className="font-mono text-emerald-800 text-base">
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
        <div className="mt-12 pt-8 border-t border-slate-200 flex justify-between items-end text-xs">
          <p className="text-slate-400">
            Electronic generated tax invoice. Subject to Ahmedabad jurisdiction.
          </p>
          <div className="text-right space-y-8">
            <p className="font-bold text-slate-900 uppercase">
              For {currentCompany?.tradeName || "MyBill History Enterprise"}
            </p>
            <p className="border-t border-slate-400 pt-1 text-[11px] text-slate-600 font-medium">
              Authorised Signatory
            </p>
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
              Issued Credit Notes / Sales Returns (વેચાણ પરત ઇતિહાસ)
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
              <option value="CASH">CASH (રોકડ)</option>
              <option value="BANK_TRANSFER">BANK TRANSFER (બેંક ખાતું)</option>
              <option value="UPI_QR">UPI (ગૂગલ પે / ફોનપે)</option>
              <option value="CHEQUE">CHEQUE (ચેક)</option>
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
        title="Stock Alert / સ્ટોક ચેતવણી"
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
    </div>
  );
}
