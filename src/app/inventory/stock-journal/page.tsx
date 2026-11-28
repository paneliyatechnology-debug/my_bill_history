"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { apiClient, extractList } from "@/lib/api-client";
import { formatInr } from "@/components/design-system/tokens";
import { formatDate, getTodayDate } from "@/lib/date-utils";
import { CustomSelect } from "@/components/ui/dropdown-system";
import { ArrowRightLeft, Plus, Trash2, CheckCircle2, X } from "lucide-react";

interface ItemOption {
  id: string;
  name: string;
  purchaseRate?: number;
  primaryUom?: { symbol?: string; uqcCode?: string };
}

interface JournalLine {
  itemId: string;
  quantity: number;
  rate: number;
}

export default function StockJournalPage() {
  const { tenantContext } = useAuth();
  const [items, setItems] = useState<ItemOption[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [journalNumber, setJournalNumber] = useState(`SJ-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`);
  const [date, setDate] = useState(() => getTodayDate());
  const [sources, setSources] = useState<JournalLine[]>([{ itemId: "", quantity: 1, rate: 0 }]);
  const [destinations, setDestinations] = useState<JournalLine[]>([{ itemId: "", quantity: 1, rate: 0 }]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [itemsRes, journalsRes]: any = await Promise.all([
        apiClient.get("/masters/items", { limit: 500 }),
        apiClient.get("/inventory/stock/stock-journal").catch(() => ({ data: [] })),
      ]);
      setItems(extractList<ItemOption>(itemsRes).filter((i: any) => i.type !== "SERVICE"));
      setJournals(extractList<any>(journalsRes));
    } catch (err: any) {
      setError(err.message || "Failed to load stock journal data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchData();
    }
  }, [fetchData, tenantContext.companyId]);

  const itemOptions = items.map((i) => ({
    value: i.id,
    label: `${i.name} (${i.primaryUom?.uqcCode || i.primaryUom?.symbol || "PCS"})`,
  }));

  const handleItemChange = (listType: "source" | "dest", idx: number, itemId: string) => {
    const found = items.find((i) => i.id === itemId);
    const rate = Number(found?.purchaseRate || 0);
    if (listType === "source") {
      setSources((prev) => prev.map((r, i) => (i === idx ? { ...r, itemId, rate } : r)));
    } else {
      setDestinations((prev) => prev.map((r, i) => (i === idx ? { ...r, itemId, rate } : r)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const validSources = sources.filter((s) => s.itemId && s.quantity > 0);
    const validDests = destinations.filter((d) => d.itemId && d.quantity > 0);
    if (validSources.length === 0 && validDests.length === 0) {
      setError("Please add at least one valid Source (Consumption) or Destination (Production) item.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post(
        "/inventory/stock/stock-journal",
        {
          journalNumber,
          date,
          sources: validSources,
          destinations: validDests,
        },
        undefined,
        `stock-journal-${journalNumber}-${date}-${Date.now()}`,
      );
      setToast(`Stock Journal ${journalNumber} posted successfully.`);
      setJournalNumber(`SJ-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`);
      setSources([{ itemId: "", quantity: 1, rate: 0 }]);
      setDestinations([{ itemId: "", quantity: 1, rate: 0 }]);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to post stock journal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sourceTotal = sources.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.rate) || 0), 0);
  const destTotal = destinations.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.rate) || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
          <button type="button" onClick={() => setToast(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div>
        <p className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
          INVENTORY &bull; TALLY STOCK JOURNAL (ALT+F7)
        </p>
        <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
          <ArrowRightLeft className="w-6 h-6 text-[#1677E8]" />
          <span>Stock Journal Voucher</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Record raw material consumption (Source) and finished goods production or stock conversion (Destination).
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Journal No.</label>
            <input
              type="text"
              value={journalNumber}
              onChange={(e) => setJournalNumber(e.target.value)}
              className="w-full h-9 px-3 text-[13px] border border-slate-200 rounded-xl focus:outline-none focus:border-[#1677E8]"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Voucher Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-9 px-3 text-[13px] border border-slate-200 rounded-xl focus:outline-none focus:border-[#1677E8]"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Source / Consumption */}
          <div className="border border-rose-200/80 bg-rose-50/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-rose-800">Source (Consumption / Outward)</h2>
              <span className="text-xs font-semibold text-rose-700">Total: {formatInr(sourceTotal)}</span>
            </div>
            <div className="space-y-2.5">
              {sources.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-6">
                    <CustomSelect
                      size="sm"
                      value={row.itemId}
                      onChange={(val) => handleItemChange("source", idx, String(val))}
                      options={itemOptions}
                      placeholder="Select Item..."
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={row.quantity}
                      onChange={(e) =>
                        setSources((prev) => prev.map((r, i) => (i === idx ? { ...r, quantity: Number(e.target.value) || 0 } : r)))
                      }
                      placeholder="Qty"
                      className="w-full h-9 px-2 text-right text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={row.rate}
                      onChange={(e) =>
                        setSources((prev) => prev.map((r, i) => (i === idx ? { ...r, rate: Number(e.target.value) || 0 } : r)))
                      }
                      placeholder="Rate"
                      className="w-full h-9 px-2 text-right text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSources((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSources((prev) => [...prev, { itemId: "", quantity: 1, rate: 0 }])}
              className="text-xs font-semibold text-rose-700 hover:text-rose-800 inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Source Item</span>
            </button>
          </div>

          {/* Destination / Production */}
          <div className="border border-emerald-200/80 bg-emerald-50/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-emerald-800">Destination (Production / Inward)</h2>
              <span className="text-xs font-semibold text-emerald-700">Total: {formatInr(destTotal)}</span>
            </div>
            <div className="space-y-2.5">
              {destinations.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-6">
                    <CustomSelect
                      size="sm"
                      value={row.itemId}
                      onChange={(val) => handleItemChange("dest", idx, String(val))}
                      options={itemOptions}
                      placeholder="Select Item..."
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={row.quantity}
                      onChange={(e) =>
                        setDestinations((prev) => prev.map((r, i) => (i === idx ? { ...r, quantity: Number(e.target.value) || 0 } : r)))
                      }
                      placeholder="Qty"
                      className="w-full h-9 px-2 text-right text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={row.rate}
                      onChange={(e) =>
                        setDestinations((prev) => prev.map((r, i) => (i === idx ? { ...r, rate: Number(e.target.value) || 0 } : r)))
                      }
                      placeholder="Rate"
                      className="w-full h-9 px-2 text-right text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setDestinations((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setDestinations((prev) => [...prev, { itemId: "", quantity: 1, rate: 0 }])}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Destination Item</span>
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-9 px-5 bg-[#1677E8] hover:bg-[#1268D3] text-white rounded-xl text-[13px] font-semibold shadow-xs cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? "Posting..." : "Post Stock Journal"}
          </button>
        </div>
      </form>

      {/* History */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100">
          <h3 className="text-sm font-bold text-[#0F172A]">Recent Stock Journals</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Journal #</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Consumed (Source)</th>
                <th className="px-4 py-3">Produced (Destination)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">Loading...</td>
                </tr>
              ) : journals.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">No stock journals posted yet.</td>
                </tr>
              ) : (
                journals.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-[#0F172A]">{j.journalNumber}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(j.date)}</td>
                    <td className="px-4 py-3 text-rose-700 text-xs">
                      {j.sources?.map((s: any) => `${s.itemName} (-${s.quantity} ${s.uom})`).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-emerald-700 text-xs">
                      {j.destinations?.map((d: any) => `${d.itemName} (+${d.quantity} ${d.uom})`).join(", ") || "—"}
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
