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
  salesInvoice?: {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    grandTotal: number | string;
  } | null;
}

interface ReceiptDetail {
  id: string;
  paymentNumber?: string;
  voucherNumber?: string;
  paymentDate?: string;
  voucherDate?: string;
  partyName?: string;
  totalSettled?: number;
  amountReceived?: number;
  paymentModeLabel?: string;
  narration?: string | null;
  isCancelled?: boolean;
  allocations?: AllocationRow[];
}

function formatInr(val: number | string): string {
  const num = Number(val) || 0;
  return (
    "₹ " +
    num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function formatPaymentDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function PaymentInDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useAuth();
  const id = params?.id;
  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reverseReason, setReverseReason] = useState("");
  const [showReverse, setShowReverse] = useState(false);
  const [isReversing, setIsReversing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ReceiptDetail>(`/vouchers/${id}`);
      setReceipt(res);
    } catch (err: any) {
      setError(err.message || "Payment not found.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!receipt || typeof window === "undefined") return;
    const shouldPrint = new URLSearchParams(window.location.search).get("print") === "1";
    if (!shouldPrint) return;
    const timer = setTimeout(() => window.print(), 400);
    return () => clearTimeout(timer);
  }, [receipt]);

  async function reversePayment() {
    if (!receipt || !reverseReason.trim()) {
      setError("A reason is required.");
      return;
    }
    setIsReversing(true);
    setError(null);
    try {
      await apiClient.post(`/vouchers/${receipt.id}/reverse`, {
        reason: reverseReason.trim(),
      });
      router.push("/sales/payment-in");
    } catch (err: any) {
      setError(err.message || "Could not reverse this payment.");
    } finally {
      setIsReversing(false);
    }
  }

  const paymentNumber = receipt?.paymentNumber || receipt?.voucherNumber || "";
  const paymentDate = receipt?.paymentDate || receipt?.voucherDate;

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-16">
      <style>{`
        @media print {
          aside, nav, header { display: none !important; }
          body { background: white !important; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="no-print flex items-center justify-between">
        <Link href="/sales/payment-in" className="text-xs font-semibold text-slate-500 hover:text-slate-800">
          ← {lang === "gu" ? "આવક ચૂકવણી" : "Payment In"}
        </Link>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
          >
            Print
          </button>
          {receipt && !receipt.isCancelled && (
            <button
              type="button"
              onClick={() => setShowReverse(true)}
              className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600"
            >
              Reverse
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {isLoading && <p className="text-sm text-slate-500">Loading payment...</p>}

      {receipt && (
        <article className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Payment In</p>
              <h1 className="mt-1 text-2xl font-black text-slate-900">#{paymentNumber}</h1>
              <p className="mt-1 text-sm text-slate-600">{receipt.partyName || "—"}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">{formatPaymentDate(paymentDate)}</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {receipt.paymentModeLabel || "Cash"}
              </p>
              {receipt.isCancelled && (
                <p className="mt-2 text-xs font-bold uppercase text-rose-600">Reversed</p>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 border-y border-slate-100 py-4">
            <div>
              <p className="text-xs text-slate-500">Amount received</p>
              <p className="text-lg font-black text-slate-900">{formatInr(receipt.amountReceived || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total amount settled</p>
              <p className="text-lg font-black text-slate-900">{formatInr(receipt.totalSettled || 0)}</p>
            </div>
          </div>

          {receipt.narration && (
            <p className="mt-4 text-sm text-slate-600">{receipt.narration}</p>
          )}

          <h2 className="mt-6 text-sm font-bold text-slate-900">Settled invoices</h2>
          {(receipt.allocations || []).length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Saved on account. No invoice was settled.</p>
          ) : (
            <table className="mt-2 w-full text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr>
                  <th className="py-2">Invoice</th>
                  <th className="py-2">Date</th>
                  <th className="py-2 text-right">Settled</th>
                </tr>
              </thead>
              <tbody>
                {(receipt.allocations || []).map((alloc) => (
                  <tr key={alloc.id} className="border-t border-slate-100">
                    <td className="py-2 font-semibold">
                      {alloc.salesInvoice?.invoiceNumber || "—"}
                    </td>
                    <td className="py-2 text-slate-600">
                      {formatPaymentDate(alloc.salesInvoice?.invoiceDate)}
                    </td>
                    <td className="py-2 text-right">
                      {formatInr(
                        Number(alloc.allocatedAmount || 0) + Number(alloc.cashDiscount || 0),
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>
      )}

      {showReverse && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Reverse this payment</h2>
            <textarea
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
              rows={3}
              placeholder="Reason"
              className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="px-3 py-2 text-sm" onClick={() => setShowReverse(false)}>
                Cancel
              </button>
              <button
                type="button"
                disabled={isReversing}
                onClick={reversePayment}
                className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isReversing ? "Reversing..." : "Reverse"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
