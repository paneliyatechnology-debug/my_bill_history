"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";
import { Modal } from "../../../components/ui/modal";
import { Badge, StatusBadge } from "../../../components/ui/badge";

interface JournalLine {
  id: string;
  debitAmount: number;
  creditAmount: number;
  narration?: string;
  account?: {
    id: string;
    code: string;
    name: string;
  };
}

interface Voucher {
  id: string;
  voucherType:
    "JOURNAL" | "RECEIPT" | "PAYMENT" | "CONTRA" | "SALES" | "PURCHASE";
  voucherNumber: string;
  voucherDate: string;
  totalAmount: number;
  narration?: string;
  isCancelled: boolean;
  cancelledReason?: string;
  lines: JournalLine[];
}

export default function VouchersPage() {
  const { lang, tenantContext } = useAuth();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Selected Voucher Modal
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);

  // Reversal Modal
  const [reversalTarget, setReversalTarget] = useState<Voucher | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [isReversing, setIsReversing] = useState(false);
  const [reversalError, setReversalError] = useState<string | null>(null);

  const fetchVouchers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get("/vouchers", {
        search: searchTerm || undefined,
        voucherType: typeFilter !== "ALL" ? typeFilter : undefined,
      });
      setVouchers(extractList<Voucher>(res));
    } catch (err: any) {
      setError(err.message || "Failed to load vouchers.");
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, typeFilter]);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchVouchers();
    }
  }, [tenantContext.companyId, fetchVouchers]);

  const handleReverseVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalTarget) return;

    setIsReversing(true);
    setReversalError(null);

    try {
      await apiClient.post(`/vouchers/${reversalTarget.id}/reverse`, {
        reason: reversalReason,
        reversalDate: new Date().toISOString().split("T")[0],
      });

      setReversalTarget(null);
      setReversalReason("");
      await fetchVouchers();
    } catch (err: any) {
      setReversalError(err.message || "Failed to reverse voucher.");
    } finally {
      setIsReversing(false);
    }
  };

  const typeColor: Record<
    string,
    "info" | "success" | "warning" | "danger" | "purple"
  > = {
    JOURNAL: "purple",
    RECEIPT: "success",
    PAYMENT: "warning",
    CONTRA: "info",
    SALES: "info",
    PURCHASE: "danger",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {lang === "gu"
              ? "નામા વાઉચર રજિસ્ટર (Vouchers Register)"
              : "Double-Entry Voucher Register"}
          </h1>
          <p className="text-xs text-slate-500">
            {lang === "gu"
              ? "રોજમેળ, જમા-ઉધાર, જર્નલ, બેંક અને રોકડ વાઉચરોનું રજિસ્ટર"
              : "Immutable journal entries, receipts, payments, and contra vouchers"}
          </p>
        </div>

        <Link
          href="/accounting/vouchers/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#FF9933] hover:bg-[#E67E17] text-slate-950 text-sm font-bold rounded-lg shadow-sm transition-colors"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>{lang === "gu" ? "નવું વાઉચર લખો" : "Record New Voucher"}</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <svg
            className="w-4 h-4 absolute left-3 top-3 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by voucher number, narration, or reference..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-full sm:w-auto text-xs bg-slate-50 border border-slate-300 text-slate-700 rounded-lg px-3 py-2 font-medium"
        >
          <option value="ALL">All Voucher Types</option>
          <option value="JOURNAL">JOURNAL (જર્નલ)</option>
          <option value="RECEIPT">RECEIPT (આવક પહોંચ)</option>
          <option value="PAYMENT">PAYMENT (ચૂકવણી વાઉચર)</option>
          <option value="CONTRA">CONTRA (બેંક-રોકડ ફેરબદલ)</option>
          <option value="SALES">SALES (વેચાણ નોંધ)</option>
        </select>
      </div>

      {/* Voucher Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {error && (
          <div className="p-4 bg-rose-50 border-b border-rose-100 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">
                  {lang === "gu" ? "વાઉચર નંબર" : "Voucher No."}
                </th>
                <th className="py-3 px-4">
                  {lang === "gu" ? "તારીખ" : "Date"}
                </th>
                <th className="py-3 px-4">
                  {lang === "gu" ? "પ્રકાર" : "Type"}
                </th>
                <th className="py-3 px-4">
                  {lang === "gu" ? "વિગત / લખાણ" : "Narration"}
                </th>
                <th className="py-3 px-4 text-right">
                  {lang === "gu" ? "રકમ (₹)" : "Amount (₹)"}
                </th>
                <th className="py-3 px-4">
                  {lang === "gu" ? "સ્થિતિ" : "Status"}
                </th>
                <th className="py-3 px-4 text-right">
                  {lang === "gu" ? "ક્રિયા" : "Action"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="inline-block w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <p>Loading vouchers...</p>
                  </td>
                </tr>
              ) : vouchers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-700 mb-1">
                      No vouchers recorded
                    </p>
                    <p className="text-[11px]">
                      Click &apos;Record New Voucher&apos; to enter journal
                      lines.
                    </p>
                  </td>
                </tr>
              ) : (
                vouchers.map((v) => (
                  <tr
                    key={v.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {v.voucherNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {new Date(v.voucherDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={typeColor[v.voucherType] || "neutral"}>
                        {v.voucherType}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {v.narration || "—"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ₹{Number(v.totalAmount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        status={v.isCancelled ? "REVERSED" : "POSTED"}
                      />
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedVoucher(v)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                      >
                        View Lines
                      </button>
                      {!v.isCancelled && (
                        <button
                          onClick={() => {
                            setReversalTarget(v);
                            setReversalReason("");
                            setReversalError(null);
                          }}
                          className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                        >
                          Reverse
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Voucher Detail Modal */}
      {selectedVoucher && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedVoucher(null)}
          title={`Voucher: ${selectedVoucher.voucherNumber}`}
          titleGujarati={`નામા વાઉચર વિગતો (${selectedVoucher.voucherType})`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-xs">
              <div>
                <span className="font-semibold text-slate-700">Date: </span>
                <span className="font-mono text-slate-900">
                  {new Date(selectedVoucher.voucherDate).toLocaleDateString(
                    "en-IN",
                  )}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Type: </span>
                <Badge
                  variant={typeColor[selectedVoucher.voucherType] || "neutral"}
                >
                  {selectedVoucher.voucherType}
                </Badge>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Total: </span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{Number(selectedVoucher.totalAmount).toFixed(2)}
                </span>
              </div>
            </div>

            {selectedVoucher.narration && (
              <p className="text-xs text-slate-600 italic px-1">
                Narration: {selectedVoucher.narration}
              </p>
            )}

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-2.5 px-3">Account</th>
                    <th className="py-2.5 px-3">Line Narration</th>
                    <th className="py-2.5 px-3 text-right">Debit (Dr ₹)</th>
                    <th className="py-2.5 px-3 text-right">Credit (Cr ₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedVoucher.lines?.map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {line.account?.name || "Account"} (
                        {line.account?.code || "—"})
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {line.narration || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                        {Number(line.debitAmount) > 0
                          ? `₹${Number(line.debitAmount).toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                        {Number(line.creditAmount) > 0
                          ? `₹${Number(line.creditAmount).toFixed(2)}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setSelectedVoucher(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reversal Confirmation Modal */}
      {reversalTarget && (
        <Modal
          isOpen={true}
          onClose={() => setReversalTarget(null)}
          title={`Reverse Voucher: ${reversalTarget.voucherNumber}`}
          titleGujarati="વાઉચર રદ / ઉલટાવવું (Reversal Entry)"
          maxWidth="md"
        >
          <form onSubmit={handleReverseVoucher} className="space-y-4">
            <p className="text-xs text-slate-600">
              This action will post an immutable contra reversal voucher that
              zeroes out the accounting balances of this transaction.
            </p>

            {reversalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700 font-medium">
                {reversalError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Reason for Reversal *
              </label>
              <textarea
                required
                rows={3}
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="e.g. Incorrect ledger allocation or cancelled transaction"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReversalTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isReversing}
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 rounded-lg shadow-sm"
              >
                {isReversing ? "Reversing..." : "Confirm Reversal"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
