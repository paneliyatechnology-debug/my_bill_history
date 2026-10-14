"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../context/auth-context";
import { apiClient, extractList } from "../../../../lib/api-client";

interface AccountOption {
  id: string;
  code: string;
  name: string;
}

interface VoucherLineInput {
  accountId: string;
  debitAmount: number | "";
  creditAmount: number | "";
  lineNarration?: string;
}

export default function NewVoucherPage() {
  const router = useRouter();
  const { lang, tenantContext } = useAuth();

  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [voucherType, setVoucherType] = useState<
    "JOURNAL" | "RECEIPT" | "PAYMENT" | "CONTRA"
  >("JOURNAL");
  const [voucherNumber, setVoucherNumber] = useState("");
  const [voucherDate, setVoucherDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [narration, setNarration] = useState("");
  const [referenceNo, setReferenceNo] = useState("");

  const [lines, setLines] = useState<VoucherLineInput[]>([
    { accountId: "", debitAmount: "", creditAmount: "", lineNarration: "" },
    { accountId: "", debitAmount: "", creditAmount: "", lineNarration: "" },
  ]);

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get("/ledgers");
      const accList: AccountOption[] = extractList<AccountOption>(res);
      setAccounts(accList);
      if (accList.length >= 2) {
        setLines([
          {
            accountId: accList[0].id,
            debitAmount: 1000,
            creditAmount: 0,
            lineNarration: "",
          },
          {
            accountId: accList[1].id,
            debitAmount: 0,
            creditAmount: 1000,
            lineNarration: "",
          },
        ]);
      }
      setVoucherNumber(`VCH-${Date.now().toString().slice(-6)}`);
    } catch (err: any) {
      setError(err.message || "Failed to load ledger accounts.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchAccounts();
    }
  }, [tenantContext.companyId, fetchAccounts]);

  const handleAddLine = () => {
    setLines([
      ...lines,
      {
        accountId: accounts[0]?.id || "",
        debitAmount: "",
        creditAmount: "",
        lineNarration: "",
      },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleLineChange = (
    idx: number,
    field: keyof VoucherLineInput,
    val: any,
  ) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: val };
    setLines(updated);
  };

  // Live Totals calculation
  const totalDebit = lines.reduce(
    (sum, l) => sum + (Number(l.debitAmount) || 0),
    0,
  );
  const totalCredit = lines.reduce(
    (sum, l) => sum + (Number(l.creditAmount) || 0),
    0,
  );
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = totalDebit > 0 && totalCredit > 0 && difference < 0.001;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isBalanced) {
      setError(
        "Double-entry rule violation: Total debits must equal total credits.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post("/vouchers", {
        voucherType,
        voucherNumber,
        voucherDate,
        narration: narration || undefined,
        referenceNo: referenceNo || undefined,
        lines: lines.map((l, i) => ({
          accountId: l.accountId,
          debitAmount: Number(l.debitAmount) || 0,
          creditAmount: Number(l.creditAmount) || 0,
          lineNarration: l.lineNarration || undefined,
          sequenceOrder: i + 1,
        })),
      });

      router.push("/accounting/vouchers");
    } catch (err: any) {
      setError(
        lang === "gu" && err.messageGujarati
          ? err.messageGujarati
          : err.message || "Failed to post voucher.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-border shadow-subtle flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/accounting/vouchers"
              className="text-xs font-semibold text-muted hover:text-slate-800 flex items-center gap-1"
            >
              <span>←</span>
              <span>{lang === "gu" ? "વાઉચરોની યાદી" : "Back to Vouchers"}</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-6 bg-primary rounded-full inline-block"></span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {lang === "gu"
                ? "દ્વિનોંધી નામા વાઉચર લખો (New Double-Entry Voucher)"
                : "Record New Journal / Voucher"}
            </h1>
          </div>
          <p className="text-xs text-muted mt-1 ml-4.5">
            {lang === "gu"
              ? "ઉધાર અને જમા સરખા હોવા આવશ્યક છે (Total Debits == Total Credits)"
              : "Strict double-entry accounting invariants enforced on client and authoritative server"}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Voucher Meta Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Voucher Type *
            </label>
            <select
              value={voucherType}
              onChange={(e: any) => setVoucherType(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-900 focus:bg-white focus:ring-1 focus:ring-emerald-500"
            >
              <option value="JOURNAL">JOURNAL (જર્નલ નોંધ)</option>
              <option value="RECEIPT">RECEIPT (પહોંચ / આવક)</option>
              <option value="PAYMENT">PAYMENT (ચૂકવણી)</option>
              <option value="CONTRA">CONTRA (બેંક ⇄ રોકડ)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Voucher Number *
            </label>
            <input
              type="text"
              required
              value={voucherNumber}
              onChange={(e) => setVoucherNumber(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Voucher Date *
            </label>
            <input
              type="date"
              required
              value={voucherDate}
              onChange={(e) => setVoucherDate(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Reference / Cheque No.
            </label>
            <input
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="CHQ-991202"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 focus:bg-white"
            />
          </div>
        </div>

        {/* Journal Lines Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {lang === "gu"
                ? "નામા લાઈનો (Journal Lines)"
                : "Journal Lines (Double-Entry Debit / Credit)"}
            </h2>
            <button
              type="button"
              onClick={handleAddLine}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200"
            >
              <span>+ Add Row</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2.5 px-3 w-10">#</th>
                  <th className="py-2.5 px-3 w-64">
                    {lang === "gu" ? "ખાતું" : "Ledger Account"}
                  </th>
                  <th className="py-2.5 px-3">
                    {lang === "gu" ? "વિગત" : "Line Narration"}
                  </th>
                  <th className="py-2.5 px-3 w-36 text-right">
                    {lang === "gu" ? "ઉધાર રકમ (Dr ₹)" : "Debit (Dr ₹)"}
                  </th>
                  <th className="py-2.5 px-3 w-36 text-right">
                    {lang === "gu" ? "જમા રકમ (Cr ₹)" : "Credit (Cr ₹)"}
                  </th>
                  <th className="py-2.5 px-3 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={line.accountId}
                        onChange={(e) =>
                          handleLineChange(idx, "accountId", e.target.value)
                        }
                        className="w-full text-xs p-1.5 bg-slate-50 border border-slate-300 rounded font-medium text-slate-800"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({acc.code})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={line.lineNarration}
                        onChange={(e) =>
                          handleLineChange(idx, "lineNarration", e.target.value)
                        }
                        placeholder="Narration..."
                        className="w-full text-xs p-1.5 bg-slate-50 border border-slate-300 rounded"
                      ></input>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.debitAmount}
                        onChange={(e) => {
                          const val =
                            e.target.value === "" ? "" : Number(e.target.value);
                          handleLineChange(idx, "debitAmount", val);
                          if (val !== 0 && val !== "")
                            handleLineChange(idx, "creditAmount", 0);
                        }}
                        placeholder="0.00"
                        className="w-full text-xs p-1.5 bg-slate-50 border border-slate-300 rounded text-right font-mono font-semibold"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.creditAmount}
                        onChange={(e) => {
                          const val =
                            e.target.value === "" ? "" : Number(e.target.value);
                          handleLineChange(idx, "creditAmount", val);
                          if (val !== 0 && val !== "")
                            handleLineChange(idx, "debitAmount", 0);
                        }}
                        placeholder="0.00"
                        className="w-full text-xs p-1.5 bg-slate-50 border border-slate-300 rounded text-right font-mono font-semibold"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {lines.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Footer Totals */}
              <tfoot>
                <tr className="bg-slate-50 font-mono font-bold border-t border-slate-200">
                  <td
                    colSpan={3}
                    className="py-3 px-4 text-right uppercase text-slate-600"
                  >
                    Totals:
                  </td>
                  <td className="py-3 px-3 text-right text-slate-900">
                    ₹{totalDebit.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-900">
                    ₹{totalCredit.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Balance status banner */}
          <div
            className={`px-4 py-3 border-t flex items-center justify-between text-xs font-semibold ${
              isBalanced
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-amber-50 text-amber-800 border-amber-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{isBalanced ? "✓" : "⚠️"}</span>
              <span>
                {isBalanced
                  ? "Voucher is balanced (Total Debits == Total Credits)"
                  : `Out of balance by ₹${difference.toFixed(2)}. Adjust lines before posting.`}
              </span>
            </div>
            <div>
              Difference:{" "}
              <span className="font-mono">₹{difference.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Global Narration */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            General Narration / શેરો
          </label>
          <textarea
            rows={2}
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            placeholder="Being payment received towards sales invoice or general journal adjustment..."
            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/accounting/vouchers"
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-all"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!isBalanced || isSubmitting}
            className="px-6 py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover active:bg-primary-pressed disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed rounded-xl shadow-card hover:shadow-hover transition-all flex items-center gap-2"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : null}
            <span>
              {isSubmitting
                ? "Posting Voucher..."
                : "Post Double-Entry Voucher"}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
