"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { apiClient, extractList } from "@/lib/api-client";
import { formatInr } from "@/components/design-system/tokens";
import { formatDate } from "@/lib/date-utils";
import { CustomSelect } from "@/components/ui/dropdown-system";
import { Landmark, CheckCircle2, Clock, X } from "lucide-react";

export default function BankReconciliationPage() {
  const { tenantContext } = useAuth();
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [entries, setEntries] = useState<any[]>([]);
  const [summary, setSummary] = useState({ bookBalance: 0, reconciledBalance: 0, unreconciledAmount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadBanks = useCallback(async () => {
    try {
      const res: any = await apiClient.get("/bank-accounts");
      const list = extractList<any>(res).filter((a) => a.isBankLedger);
      setBankAccounts(list);
      if (list.length > 0 && !selectedBankId) {
        setSelectedBankId(list[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load bank accounts.");
    }
  }, [selectedBankId]);

  const loadReconciliation = useCallback(async () => {
    if (!selectedBankId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res: any = await apiClient.get(`/bank-accounts/${selectedBankId}/reconciliation`);
      setEntries(res?.entries || []);
      setSummary(res?.summary || { bookBalance: 0, reconciledBalance: 0, unreconciledAmount: 0 });
    } catch (err: any) {
      setError(err.message || "Failed to load reconciliation entries.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedBankId]);

  useEffect(() => {
    if (tenantContext.companyId) {
      loadBanks();
    }
  }, [loadBanks, tenantContext.companyId]);

  useEffect(() => {
    loadReconciliation();
  }, [loadReconciliation]);

  const handleToggleClear = async (entry: any, cleared: boolean, clearanceDate?: string) => {
    try {
      await apiClient.post(`/bank-accounts/${selectedBankId}/reconciliation`, {
        entryId: entry.id,
        cleared,
        clearanceDate: clearanceDate || new Date().toISOString().split("T")[0],
      });
      setToast(cleared ? `Marked ${entry.voucherNumber} as reconciled.` : `Unmarked ${entry.voucherNumber}.`);
      loadReconciliation();
    } catch (err: any) {
      setError(err.message || "Failed to update clearance status.");
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
          <button type="button" onClick={() => setToast(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
            BANKING &bull; TALLY BRS
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
            <Landmark className="w-6 h-6 text-[#1677E8]" />
            <span>Bank Reconciliation Statement (BRS)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Match book entries with bank statement clearance dates to track reconciled vs unreconciled cheques &amp; transfers.
          </p>
        </div>
        <div className="w-full sm:w-72">
          <CustomSelect
            value={selectedBankId}
            onChange={(val) => setSelectedBankId(String(val))}
            options={bankAccounts.map((b) => ({ value: b.id, label: b.name }))}
            placeholder="Select Bank Account..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Balance as per Books</p>
          <p className="text-xl font-bold text-[#0F172A] mt-1 tabular-nums">{formatInr(summary.bookBalance)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Unreconciled Difference</p>
          <p className="text-xl font-bold text-amber-600 mt-1 tabular-nums">{formatInr(summary.unreconciledAmount)}</p>
        </div>
        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Balance as per Bank (Reconciled)</p>
          <p className="text-xl font-bold text-emerald-800 mt-1 tabular-nums">{formatInr(summary.reconciledBalance)}</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Voucher #</th>
                <th className="px-4 py-3">Particulars / Narration</th>
                <th className="px-4 py-3 text-right">Deposit (Dr)</th>
                <th className="px-4 py-3 text-right">Withdrawal (Cr)</th>
                <th className="px-4 py-3">Bank Date</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">Loading bank transactions...</td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">No bank voucher entries found for this account.</td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-slate-600">{formatDate(e.voucherDate)}</td>
                    <td className="px-4 py-3 font-semibold text-[#0F172A]">{e.voucherNumber}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs max-w-xs truncate">{e.narration || e.voucherType}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700 tabular-nums">
                      {e.debitAmount > 0 ? formatInr(e.debitAmount) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-rose-700 tabular-nums">
                      {e.creditAmount > 0 ? formatInr(e.creditAmount) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        value={e.clearanceDate || ""}
                        onChange={(ev) => handleToggleClear(e, Boolean(ev.target.value), ev.target.value)}
                        className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleClear(e, !e.cleared)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer ${
                          e.cleared
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {e.cleared ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        <span>{e.cleared ? "Cleared" : "Pending"}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
