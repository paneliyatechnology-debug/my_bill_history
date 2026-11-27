"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { apiClient, extractList } from "@/lib/api-client";
import { formatInr } from "@/components/design-system/tokens";
import { CheckCircle2, Save, Scale, X } from "lucide-react";

interface LedgerRow {
  id: string;
  name: string;
  code?: string;
  openingBalance: number;
  openingType: "DR" | "CR";
  currentBalance: number;
  group?: { id: string; name: string; nature: string };
}

export default function OpeningBalancesPage() {
  const { tenantContext } = useAuth();
  const [ledgers, setLedgers] = useState<LedgerRow[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchLedgers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get("/accounting/ledgers", { limit: 500 });
      const list = extractList<any>(res).map((l) => ({
        id: l.id,
        name: l.name,
        code: l.code,
        openingBalance: Number(l.openingBalance || 0),
        openingType: (l.openingType === "CR" ? "CR" : "DR") as "DR" | "CR",
        currentBalance: Number(l.currentBalance || 0),
        group: l.group,
      }));
      setLedgers(list);
    } catch (err: any) {
      setError(err.message || "Failed to load ledger accounts.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchLedgers();
    }
  }, [fetchLedgers, tenantContext.companyId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ledgers;
    return ledgers.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.group?.name?.toLowerCase().includes(q) ||
        l.code?.toLowerCase().includes(q),
    );
  }, [ledgers, search]);

  const totals = useMemo(() => {
    let totalDr = 0;
    let totalCr = 0;
    for (const l of ledgers) {
      if (l.openingType === "CR") totalCr += Number(l.openingBalance || 0);
      else totalDr += Number(l.openingBalance || 0);
    }
    return {
      totalDr,
      totalCr,
      diff: Math.abs(totalDr - totalCr),
      diffSide: totalDr > totalCr ? "DR" : totalCr > totalDr ? "CR" : "BALANCED",
    };
  }, [ledgers]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await apiClient.patch("/accounting/opening-balances/bulk", {
        items: ledgers.map((l) => ({
          id: l.id,
          openingBalance: Number(l.openingBalance) || 0,
          openingType: l.openingType,
        })),
      });
      setToast("Opening balances saved successfully.");
      fetchLedgers();
    } catch (err: any) {
      setError(err.message || "Failed to save opening balances.");
    } finally {
      setIsSaving(false);
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
            ACCOUNTING &bull; CHART OF ACCOUNTS
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
            <Scale className="w-6 h-6 text-[#1677E8]" />
            <span>Opening Balances Setup</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Enter opening Debit/Credit balances across all ledgers. Total Dr and Cr should match for a balanced Trial Balance.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="h-9 px-4 bg-[#1677E8] hover:bg-[#1268D3] text-white rounded-xl text-[13px] font-semibold shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? "Saving..." : "Save Opening Balances"}</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Opening Debit (Dr)</p>
          <p className="text-xl font-bold text-[#0F172A] mt-1 tabular-nums">{formatInr(totals.totalDr)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Opening Credit (Cr)</p>
          <p className="text-xl font-bold text-[#0F172A] mt-1 tabular-nums">{formatInr(totals.totalCr)}</p>
        </div>
        <div className={`p-4 rounded-2xl border shadow-xs ${totals.diff === 0 ? "bg-emerald-50/70 border-emerald-200" : "bg-amber-50/70 border-amber-200"}`}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Opening Balance Difference</p>
          <p className={`text-xl font-bold mt-1 tabular-nums ${totals.diff === 0 ? "text-emerald-700" : "text-amber-700"}`}>
            {totals.diff === 0 ? "₹0.00 (Balanced)" : `${formatInr(totals.diff)} (${totals.diffSide})`}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ledger name or group..."
            className="w-full max-w-sm h-9 px-3 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1677E8]"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Ledger Account</th>
                <th className="px-4 py-3">Group / Nature</th>
                <th className="px-4 py-3 text-right">Opening Balance (₹)</th>
                <th className="px-4 py-3">Dr / Cr</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-400">Loading ledgers...</td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2.5 font-semibold text-[#0F172A]">{l.name}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">
                      {l.group?.name || "—"} {l.group?.nature ? `(${l.group.nature})` : ""}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={l.openingBalance}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          setLedgers((prev) => prev.map((row) => (row.id === l.id ? { ...row, openingBalance: val } : row)));
                        }}
                        className="w-36 h-8 px-2.5 text-right text-xs font-semibold border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#1677E8] tabular-nums"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
                        {(["DR", "CR"] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() =>
                              setLedgers((prev) => prev.map((row) => (row.id === l.id ? { ...row, openingType: t } : row)))
                            }
                            className={`px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                              l.openingType === t
                                ? t === "DR"
                                  ? "bg-blue-600 text-white"
                                  : "bg-emerald-600 text-white"
                                : "bg-white text-slate-500 hover:bg-slate-50"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
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
