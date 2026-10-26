"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";
import { Modal } from "../../../components/ui/modal";
import { Badge, StatusBadge } from "../../../components/ui/badge";
import { DataTable, ColumnDef } from "../../../components/ui/data-table";

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

  const columns: ColumnDef<Voucher>[] = [
    {
      header: lang === "gu" ? "વાઉચર નંબર" : "Voucher No.",
      accessorKey: "voucherNumber",
      sortable: true,
      cell: (v) => (
        <span className="font-mono font-bold text-slate-900">
          {v.voucherNumber}
        </span>
      ),
    },
    {
      header: lang === "gu" ? "તારીખ" : "Date",
      accessorKey: "voucherDate",
      sortable: true,
      cell: (v) => (
        <span className="font-mono text-slate-600">
          {new Date(v.voucherDate).toLocaleDateString("en-IN")}
        </span>
      ),
    },
    {
      header: lang === "gu" ? "પ્રકાર" : "Type",
      accessorKey: "voucherType",
      sortable: true,
      cell: (v) => (
        <Badge variant={typeColor[v.voucherType] || "neutral"}>
          {v.voucherType}
        </Badge>
      ),
    },
    {
      header: lang === "gu" ? "વિગત / લખાણ" : "Narration",
      accessorKey: "narration",
      cell: (v) => (
        <span className="text-slate-600 max-w-xs truncate block">
          {v.narration || "—"}
        </span>
      ),
    },
    {
      header: lang === "gu" ? "રકમ (₹)" : "Amount (₹)",
      accessorKey: "totalAmount",
      sortable: true,
      className: "text-right",
      cell: (v) => (
        <span className="font-mono font-bold text-slate-900">
          ₹{Number(v.totalAmount).toFixed(2)}
        </span>
      ),
    },
    {
      header: lang === "gu" ? "સ્થિતિ" : "Status",
      accessorKey: "isCancelled",
      cell: (v) => (
        <StatusBadge status={v.isCancelled ? "REVERSED" : "POSTED"} />
      ),
    },
    {
      header: lang === "gu" ? "ક્રિયા" : "Action",
      className: "text-right",
      cell: (v) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setSelectedVoucher(v)}
            className="text-xs text-[#F47721] hover:text-[#D95F12] font-semibold"
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
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E7EB] shadow-subtle">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl lg:text-[1.75rem] font-bold text-[#202124] tracking-tight leading-tight">
              {lang === "gu"
                ? "નામા વાઉચર રજિસ્ટર (Vouchers Register)"
                : "Double-Entry Voucher Register"}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#667085] mt-1 leading-relaxed break-words font-normal">
            {lang === "gu"
              ? "રોજમેળ, જમા-ઉધાર, જર્નલ, બેંક અને રોકડ વાઉચરોનું રજિસ્ટર"
              : "Immutable journal entries, receipts, payments, and contra vouchers"}
          </p>
        </div>

        <Link
          href="/accounting/vouchers/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#F47721] hover:bg-[#D95F12] active:bg-[#B94B0A] text-white text-xs sm:text-sm font-bold rounded-xl shadow-saffron transition-all w-full sm:w-auto shrink-0"
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
              strokeWidth={2.5}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>{lang === "gu" ? "નવું વાઉચર લખો" : "Record New Voucher"}</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-medium">
          {error}
        </div>
      )}

      {/* Main DataTable with Type Filter */}
      <DataTable<Voucher>
        data={vouchers}
        columns={columns}
        keyExtractor={(v) => v.id}
        searchPlaceholder={
          lang === "gu"
            ? "વાઉચર નંબર, લખાણ થી શોધો..."
            : "Search by voucher number, narration..."
        }
        searchKeys={["voucherNumber", "narration", "voucherType"]}
        defaultPageSize={10}
        isLoading={isLoading}
        emptyMessage={
          lang === "gu"
            ? "કોઈ વાઉચર નોંધાયેલ નથી"
            : "No vouchers recorded. Click 'Record New Voucher' to start."
        }
        exportFilename="vouchers_daybook"
        themeColor="saffron"
        toolbarChildren={
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs bg-[#F8FAFC] border border-[#E5E7EB] text-[#202124] rounded-xl px-3 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 focus:border-[#F47721] transition-all cursor-pointer"
            >
              <option value="ALL">{lang === "gu" ? "તમામ વાઉચર (All Types)" : "All Voucher Types"}</option>
              <option value="JOURNAL">{lang === "gu" ? "જર્નલ (JOURNAL)" : "JOURNAL"}</option>
              <option value="RECEIPT">{lang === "gu" ? "આવક પહોંચ (RECEIPT)" : "RECEIPT"}</option>
              <option value="PAYMENT">{lang === "gu" ? "ચૂકવણી વાઉચર (PAYMENT)" : "PAYMENT"}</option>
              <option value="CONTRA">{lang === "gu" ? "બેંક-રોકડ ફેરબદલ (CONTRA)" : "CONTRA"}</option>
              <option value="SALES">{lang === "gu" ? "વેચાણ નોંધ (SALES)" : "SALES"}</option>
            </select>
          </div>
        }
        mobileCardRender={(v) => (
          <div key={v.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-slate-900">
                {v.voucherNumber}
              </span>
              <StatusBadge status={v.isCancelled ? "REVERSED" : "POSTED"} />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{new Date(v.voucherDate).toLocaleDateString("en-IN")}</span>
              <Badge variant={typeColor[v.voucherType] || "neutral"}>
                {v.voucherType}
              </Badge>
            </div>
            {v.narration && (
              <p className="text-xs text-slate-600 italic">{v.narration}</p>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">Total:</span>
              <span className="font-mono font-bold text-slate-900">
                ₹{Number(v.totalAmount).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedVoucher(v)}
                className="text-xs text-[#F47721] font-semibold"
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
                  className="text-xs text-rose-600 font-semibold"
                >
                  Reverse
                </button>
              )}
            </div>
          </div>
        )}
      />

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
