"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { apiClient, extractList } from "@/lib/api-client";

interface AccountOption {
  id: string;
  code: string;
  name: string;
  nameGujarati?: string;
  group?: { name: string };
}

interface VoucherLineInput {
  accountId: string;
  debitAmount: number | "";
  creditAmount: number | "";
  lineNarration?: string;
}

export default function FinanceNewVoucherPage() {
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
            debitAmount: "",
            creditAmount: "",
            lineNarration: "",
          },
          {
            accountId: accList[1].id,
            debitAmount: "",
            creditAmount: "",
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
        lang === "gu"
          ? "દ્વિનોંધી નામા નિયમ મુજબ: કુલ ઉધાર અને કુલ જમા રકમ સરખી હોવી આવશ્યક છે."
          : "Double-entry rule violation: Total debits must equal total credits.",
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

      router.push("/finance/vouchers");
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
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-border shadow-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href="/finance/vouchers"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5"
            >
              <span>←</span>
              <span>{lang === "gu" ? "પાછા વાઉચરો પર જાઓ" : "Back to Vouchers & Cash Book"}</span>
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {lang === "gu"
              ? "નવું દ્વિનોંધી વાઉચર લખો (New Journal Voucher)"
              : "Record New Journal Voucher"}
          </h1>
          <p className="text-xs text-muted mt-1">
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
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {lang === "gu" ? "વાઉચર પ્રકાર *" : "Voucher Type *"}
            </label>
            <select
              value={voucherType}
              onChange={(e: any) => setVoucherType(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              <option value="JOURNAL">{lang === "gu" ? "જર્નલ નોંધ (JOURNAL)" : "JOURNAL"}</option>
              <option value="RECEIPT">{lang === "gu" ? "પહોંચ / આવક (RECEIPT)" : "RECEIPT"}</option>
              <option value="PAYMENT">{lang === "gu" ? "ચૂકવણી (PAYMENT)" : "PAYMENT"}</option>
              <option value="CONTRA">{lang === "gu" ? "બેંક ⇄ રોકડ (CONTRA)" : "CONTRA"}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {lang === "gu" ? "વાઉચર નંબર *" : "Voucher Number *"}
            </label>
            <input
              type="text"
              required
              value={voucherNumber}
              onChange={(e) => setVoucherNumber(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {lang === "gu" ? "તારીખ *" : "Voucher Date *"}
            </label>
            <input
              type="date"
              required
              value={voucherDate}
              onChange={(e) => setVoucherDate(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {lang === "gu" ? "ચેક / રેફરન્સ નં." : "Reference / Cheque No."}
            </label>
            <input
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="CHQ-104928"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
        </div>

        {/* Journal Lines Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {lang === "gu"
                ? "નામા લાઈનો (Journal Lines)"
                : "Journal Lines (Double-Entry Debit / Credit)"}
            </h2>
            <button
              type="button"
              onClick={handleAddLine}
              className="text-xs text-primary hover:text-primary-hover font-bold flex items-center gap-1 bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-xl border border-primary/20 transition-all"
            >
              <span>+ {lang === "gu" ? "નવી લાઇન ઉમેરો" : "Add Row"}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3 px-3 w-10">#</th>
                  <th className="py-3 px-3 w-64">
                    {lang === "gu" ? "ખાતું (Ledger Account)" : "Ledger Account"}
                  </th>
                  <th className="py-3 px-3">
                    {lang === "gu" ? "શેરો / વિગત (Line Narration)" : "Line Narration"}
                  </th>
                  <th className="py-3 px-3 w-36 text-right">
                    {lang === "gu" ? "ઉધાર રકમ (Dr ₹)" : "Debit (Dr ₹)"}
                  </th>
                  <th className="py-3 px-3 w-36 text-right">
                    {lang === "gu" ? "જમા રકમ (Cr ₹)" : "Credit (Cr ₹)"}
                  </th>
                  <th className="py-3 px-3 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-slate-400 font-mono text-center">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={line.accountId}
                        onChange={(e) =>
                          handleLineChange(idx, "accountId", e.target.value)
                        }
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-primary outline-none"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} {acc.code ? `(${acc.code})` : ""}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={line.lineNarration || ""}
                        onChange={(e) =>
                          handleLineChange(idx, "lineNarration", e.target.value)
                        }
                        placeholder={lang === "gu" ? "વિગત..." : "Line narration..."}
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-primary outline-none"
                      />
                    </td>
                    <td className="py-3 px-3 text-right">
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
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-xl text-right font-mono font-semibold text-slate-900 focus:bg-white focus:border-primary outline-none"
                      />
                    </td>
                    <td className="py-3 px-3 text-right">
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
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-xl text-right font-mono font-semibold text-slate-900 focus:bg-white focus:border-primary outline-none"
                      />
                    </td>
                    <td className="py-3 px-3 text-center">
                      {lines.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Remove row"
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
                <tr className="bg-slate-50/90 font-mono font-bold border-t border-slate-200">
                  <td
                    colSpan={3}
                    className="py-3.5 px-4 text-right uppercase text-slate-600 tracking-wider text-xs"
                  >
                    {lang === "gu" ? "કુલ સરવાળો (Totals):" : "Totals:"}
                  </td>
                  <td className="py-3.5 px-3 text-right text-slate-900 font-bold text-sm">
                    ₹{totalDebit.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-3 text-right text-slate-900 font-bold text-sm">
                    ₹{totalCredit.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Balance status banner */}
          <div
            className={`px-5 py-3.5 border-t flex items-center justify-between text-xs font-semibold ${
              isBalanced
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-amber-50 text-amber-800 border-amber-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{isBalanced ? "✓" : "⚠️"}</span>
              <span>
                {isBalanced
                  ? lang === "gu"
                    ? "વાઉચર સંતુલિત છે (કુલ ઉધાર == કુલ જમા)"
                    : "Voucher is balanced (Total Debits == Total Credits)"
                  : lang === "gu"
                    ? `રૂ. ${difference.toFixed(2)} નો તફાવત છે. કૃપા કરીને ઉધાર અને જમા સરખા કરો.`
                    : `Out of balance by ₹${difference.toFixed(2)}. Adjust lines before posting.`}
              </span>
            </div>
            <div>
              {lang === "gu" ? "તફાવત: " : "Difference: "}
              <span className="font-mono font-bold">₹{difference.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Global Narration */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            {lang === "gu" ? "સામાન્ય વિગત / શેરો (General Narration)" : "General Narration"}
          </label>
          <textarea
            rows={2}
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            placeholder={
              lang === "gu"
                ? "વાઉચરની મુખ્ય વિગત જેમકે બેંક ટ્રાન્સફર અથવા વેચાણ જમા ખાતાવહી..."
                : "Enter general narration or transaction remarks..."
            }
            className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-primary outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/finance/vouchers"
            className="px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 bg-slate-100 rounded-xl transition-all"
          >
            {lang === "gu" ? "રદ કરો" : "Cancel"}
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
                ? lang === "gu"
                  ? "વાઉચર પોસ્ટ થઈ રહ્યું છે..."
                  : "Posting Voucher..."
                : lang === "gu"
                  ? "વાઉચર સેવ કરો (Post Voucher)"
                  : "Post Double-Entry Voucher"}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
