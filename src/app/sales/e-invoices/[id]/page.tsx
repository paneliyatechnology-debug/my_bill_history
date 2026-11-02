"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useAuth } from "@/context/auth-context";
import {
  einvoiceApi,
  EInvoiceDetailsResponse,
} from "@/lib/einvoice";
import { formatInr } from "@/components/design-system/tokens";

function formatAddress(addr: any): string {
  if (!addr) return "";
  if (typeof addr === "string") return addr;
  if (typeof addr !== "object") return String(addr);
  const parts = [
    addr.addressLine1 || addr.line1 || addr.street,
    addr.addressLine2 || addr.line2,
    addr.city,
    addr.state,
    addr.pincode || addr.postalCode,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "";
}

export default function EInvoiceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { lang } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EInvoiceDetailsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cancellation modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReasonCode, setCancelReasonCode] = useState("2");
  const [cancelRemarks, setCancelRemarks] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Raw JSON Modal
  const [showRawPayload, setShowRawPayload] = useState(false);

  // Feedback Toast
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const res = await einvoiceApi.getDetails(id);
        setData(res);
      } catch (err: any) {
        setError(err.message || "Failed to load e-invoice details.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // Render QR Code Canvas
  useEffect(() => {
    if (qrCanvasRef.current && data?.eInvoice?.signedQrCode) {
      QRCode.toCanvas(qrCanvasRef.current, data.eInvoice.signedQrCode, {
        width: 140,
        margin: 1,
        errorCorrectionLevel: "M",
      }).catch((err) => {
        console.warn("Failed to render QR", err);
      });
    }
  }, [data?.eInvoice?.signedQrCode]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setToast({ type: "info", text: "Copied to clipboard!" });
  };

  const handleConfirmCancel = async () => {
    if (!cancelRemarks || cancelRemarks.trim().length < 10) {
      setCancelError("Please provide remarks of at least 10 characters.");
      return;
    }
    setIsCancelling(true);
    setCancelError(null);
    try {
      const res = await einvoiceApi.cancel(id, cancelReasonCode, cancelRemarks.trim());
      if (res.cancelled || res.outcome === "SUCCEEDED" || res.status === "CNL") {
        setToast({ type: "success", text: "E-Invoice successfully cancelled on IRP." });
        setShowCancelModal(false);
        // Reload details
        const updated = await einvoiceApi.getDetails(id);
        setData(updated);
      } else {
        setCancelError(res.message || "IRP did not accept cancellation.");
      }
    } catch (err: any) {
      setCancelError(err.message || "Cancellation failed.");
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent"></div>
          <span className="text-sm font-semibold text-slate-600">Loading statutory e-invoice data...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-900">
          <h2 className="text-base font-bold">Could not load E-Invoice</h2>
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

  const { invoice, company, eInvoice, auditLogs, validation } = data;
  const isRegistered = eInvoice && eInvoice.status === "ACT";
  const isCancelled = eInvoice && eInvoice.status === "CNL";

  // Check 24-hr cancellation window
  const ackTimestamp = eInvoice?.ackDate ? new Date(eInvoice.ackDate).getTime() : 0;
  const hoursElapsed = ackTimestamp ? (Date.now() - ackTimestamp) / (1000 * 60 * 60) : 999;
  const canCancel = isRegistered && hoursElapsed <= 24;

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-900 shadow-lg">
          <span className="text-sm font-medium">{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-xs font-bold text-slate-400 hover:text-slate-800">
            ✕
          </button>
        </div>
      )}

      {/* Header Breadcrumbs & Action Bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/sales/e-invoices" className="hover:text-emerald-700 transition">
              E-Invoices
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800">{invoice.invoiceNumber}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900">{invoice.invoiceNumber}</h1>
            {isRegistered && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
                IRP Registered
              </span>
            )}
            {isCancelled && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800 line-through">
                Cancelled on IRP
              </span>
            )}
            {!eInvoice && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                Draft / Unregistered
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/sales/e-invoices/${id}/preview`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            Live Preview
          </Link>

          <Link
            href={`/e-invoices/${id}/pdf`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {lang === "gu" ? "અધિકૃત PDF" : "Download PDF"}
          </Link>

          {canCancel && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3.5 py-2 text-xs font-semibold text-rose-700 shadow-xs hover:bg-rose-50 transition"
            >
              Cancel IRN
            </button>
          )}
        </div>
      </div>

      {/* Official IRN & Acknowledgement Banner */}
      {isRegistered && eInvoice && (
        <div className="mb-6 rounded-2xl border-2 border-emerald-500/80 bg-linear-to-br from-emerald-50/90 via-white to-emerald-50/40 p-5 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <span className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                  STATUTORY IRN ISSUED
                </span>
                <span className="text-xs text-slate-500">
                  Environment: <b className="uppercase">{eInvoice.environment || "SANDBOX"}</b> · Provider: <b>{eInvoice.providerName || "NIC"}</b>
                </span>
              </div>

              {/* IRN Display */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Invoice Reference Number (IRN)
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs font-bold text-slate-900 break-all select-all shadow-2xs">
                    {eInvoice.irn}
                  </span>
                  <button
                    onClick={() => copyToClipboard(eInvoice.irn)}
                    title="Copy IRN"
                    className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-100 hover:text-emerald-700 transition"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Ack info */}
              <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-3">
                <div>
                  <span className="text-slate-500">Ack Number:</span>
                  <div className="font-mono font-bold text-slate-900">{eInvoice.ackNo}</div>
                </div>
                <div>
                  <span className="text-slate-500">Ack Date & Time:</span>
                  <div className="font-mono font-bold text-slate-900">
                    {new Date(eInvoice.ackDate).toLocaleString("en-IN")}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Cancellation Window:</span>
                  <div className={`font-semibold ${hoursElapsed <= 24 ? "text-emerald-700" : "text-slate-500"}`}>
                    {hoursElapsed <= 24
                      ? `${(24 - hoursElapsed).toFixed(1)} hours remaining`
                      : "Window expired (>24 hrs)"}
                  </div>
                </div>
              </div>
            </div>

            {/* Signed QR Code Preview */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-emerald-300 bg-white p-3 shadow-xs shrink-0">
              <canvas ref={qrCanvasRef} className="rounded" />
              <span className="mt-1 text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                IRP Digital Signature QR
              </span>
              <span className="text-[9px] text-slate-400">Scannable by GST e-Invoice app</span>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Notice Banner */}
      {isCancelled && eInvoice && (
        <div className="mb-6 rounded-xl border-2 border-dashed border-rose-400 bg-rose-50 p-4 text-xs text-rose-950">
          <div className="font-bold text-rose-900 text-sm flex items-center gap-2">
            <span>⚠️</span> THIS E-INVOICE HAS BEEN OFFICIALLY CANCELLED ON IRP
          </div>
          <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-rose-900">
            <div>
              <b>Cancelled At:</b> {eInvoice.cancelledAt ? new Date(eInvoice.cancelledAt).toLocaleString("en-IN") : "Recorded"}
            </div>
            <div>
              <b>Reason:</b> {eInvoice.cancelReason || "Not provided"}
            </div>
          </div>
        </div>
      )}

      {/* Document & Party Details Grid */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Supplier Box */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Supplier (Seller)
          </div>
          <div className="text-base font-bold text-slate-900">{company?.legalName || company?.name || "Company Name"}</div>
          {company?.tradeName && company.tradeName !== company.legalName && (
            <div className="text-xs text-slate-500">{company.tradeName}</div>
          )}
          <div className="mt-2 space-y-1 text-xs text-slate-600">
            <div>
              <span className="font-semibold text-slate-700">GSTIN:</span>{" "}
              <span className="font-mono font-bold text-emerald-800">{company?.gstin || "—"}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">State:</span> Code {company?.stateCode || "24"}
            </div>
            <div>
              {formatAddress(company?.billingAddress) ||
                formatAddress({
                  addressLine1: company?.addressLine1,
                  city: company?.city,
                  pincode: company?.pincode,
                }) ||
                "Registered Office Address"}
            </div>
          </div>
        </div>

        {/* Recipient Box */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Recipient (Buyer)
          </div>
          <div className="text-base font-bold text-slate-900">{invoice.party?.name || "Cash Customer"}</div>
          <div className="mt-2 space-y-1 text-xs text-slate-600">
            <div>
              <span className="font-semibold text-slate-700">GSTIN:</span>{" "}
              {invoice.party?.gstin ? (
                <span className="font-mono font-bold text-slate-900">{invoice.party.gstin}</span>
              ) : (
                <span className="text-amber-700 font-semibold">Unregistered (URP)</span>
              )}
            </div>
            <div>
              <span className="font-semibold text-slate-700">Place of Supply:</span>{" "}
              <span className="font-mono font-semibold">Code {String(invoice.placeOfSupply || "24")}</span>
            </div>
            <div>
              {formatAddress(invoice.billingAddress) ||
                formatAddress(invoice.party?.billingAddress) ||
                formatAddress(invoice.party?.address) ||
                "Billing Address"}
            </div>
          </div>
        </div>

        {/* Invoice Metadata Box */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Invoice Summary
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Document Type:</span>
              <span className="font-bold text-slate-900 uppercase">
                {String(invoice.category || "TAX_INVOICE").replace("_", " ")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Invoice Date:</span>
              <span className="font-mono font-semibold text-slate-900">{invoice.invoiceDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Mode:</span>
              <span className="font-semibold text-slate-800">{invoice.paymentMode || "Cash / Bank"}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 font-mono">
              <span className="text-slate-500 font-sans">Taxable Amount:</span>
              <span className="font-semibold text-slate-900">₹{formatInr(invoice.taxableAmount)}</span>
            </div>
            <div className="flex justify-between font-mono font-bold text-slate-900 text-sm">
              <span className="font-sans">Grand Total:</span>
              <span className="text-emerald-700">₹{formatInr(invoice.grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Item Lines Table */}
      <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-700">
          Line Items ({invoice.items?.length || 0})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-semibold text-slate-600">
              <tr>
                <th className="py-2.5 px-4">#</th>
                <th className="py-2.5 px-4">Item & Description</th>
                <th className="py-2.5 px-4">HSN/SAC</th>
                <th className="py-2.5 px-4 text-right">Qty</th>
                <th className="py-2.5 px-4 text-right">Unit Rate</th>
                <th className="py-2.5 px-4 text-right">Taxable</th>
                <th className="py-2.5 px-4 text-right">GST Rate</th>
                <th className="py-2.5 px-4 text-right">Taxes</th>
                <th className="py-2.5 px-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(invoice.items || []).map((item: any, i: number) => {
                const tax = Number(item.cgstAmount || 0) + Number(item.sgstAmount || 0) + Number(item.igstAmount || 0);
                return (
                  <tr key={item.id || i} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 text-slate-400 font-mono">{i + 1}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {item.description || item.item?.name}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">{item.hsnCode || "-"}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{item.quantity}</td>
                    <td className="py-2.5 px-4 text-right font-mono">₹{formatInr(item.unitPrice)}</td>
                    <td className="py-2.5 px-4 text-right font-mono">₹{formatInr(item.taxableAmount)}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{item.taxRate}%</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-700">₹{formatInr(tax)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                      ₹{formatInr(item.totalAmount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit & Submission History Timeline */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
          <h3 className="font-bold text-slate-900 text-sm">
            Statutory Audit & Submission History
          </h3>
          <button
            onClick={() => setShowRawPayload(true)}
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            View Raw Response JSON
          </button>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-xs text-slate-400">No submission attempts recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3 text-xs">
                <div
                  className={`mt-0.5 h-2.5 w-2.5 rounded-full shrink-0 ${
                    log.outcome === "SUCCEEDED"
                      ? "bg-emerald-600"
                      : log.outcome === "FAILED" || log.outcome === "VALIDATION_FAILED"
                      ? "bg-rose-600"
                      : "bg-amber-500"
                  }`}
                />
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{log.operation}</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(log.createdAt).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Outcome: <span className="font-semibold uppercase">{log.outcome}</span> · Env: {log.environment}
                  </div>
                  {log.errorMessage && (
                    <div className="text-[11px] text-rose-700 font-medium">
                      {log.errorCode ? `[${log.errorCode}] ` : ""}{log.errorMessage}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400 font-mono">
                    Idempotency Key: {log.idempotencyKey}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Raw Payload Modal */}
      {showRawPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
              <h3 className="font-bold text-slate-900 text-sm">
                IRP Registration Raw Response
              </h3>
              <button onClick={() => setShowRawPayload(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-5 font-mono text-[11px] bg-slate-900 text-emerald-400">
              <pre>{JSON.stringify(eInvoice || { message: "No stored record" }, null, 2)}</pre>
            </div>
            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-3">
              <button
                onClick={() => setShowRawPayload(false)}
                className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="border-b border-slate-200 bg-rose-50/50 px-5 py-4">
              <h3 className="font-bold text-rose-950 text-sm">
                Cancel Registered E-Invoice (IRN)
              </h3>
              <p className="text-[11px] text-slate-500">
                Invoice {invoice.invoiceNumber}
              </p>
            </div>

            <div className="p-5 text-xs text-slate-700 space-y-3">
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-900">
                <p className="font-semibold">⚠️ 24-Hour Cancellation Window:</p>
                <p className="mt-1 text-[11px]">
                  IRN cancellation is subject to the IRP&apos;s statutory 24-hour window. Once cancelled, this invoice number cannot be reused for a new IRN under GST rules.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Cancellation Reason Code *
                </label>
                <select
                  value={cancelReasonCode}
                  onChange={(e) => setCancelReasonCode(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-rose-500 focus:outline-none"
                >
                  <option value="1">1 - Duplicate Invoice</option>
                  <option value="2">2 - Data Entry Mistake</option>
                  <option value="3">3 - Order Cancelled</option>
                  <option value="4">4 - Others</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Cancellation Remarks (min 10 characters) *
                </label>
                <textarea
                  value={cancelRemarks}
                  onChange={(e) => setCancelRemarks(e.target.value)}
                  rows={3}
                  placeholder="Explain why this e-invoice is being cancelled..."
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-rose-500 focus:outline-none"
                />
              </div>

              {cancelError && (
                <div className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-rose-900 font-medium">
                  {cancelError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
                className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
              >
                Close
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition disabled:opacity-50 shadow-xs"
              >
                {isCancelling ? "Cancelling..." : "Confirm IRP Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

