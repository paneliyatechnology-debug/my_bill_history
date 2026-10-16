"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";
import { Modal } from "../../../components/ui/modal";
import { DataTable, ColumnDef } from "../../../components/ui/data-table";

interface Batch {
  id: string;
  batchNumber: string;
  itemId: string;
  item?: { name: string; sku?: string };
  mfgDate?: string;
  expiryDate?: string;
  purchaseRate?: number;
  mrp?: number;
  salePrice?: number;
  saleRate?: number;
  currentStock?: number;
}

interface ItemOption {
  id: string;
  name: string;
  purchaseRate?: number;
  retailPrice?: number;
  mrp?: number;
  trackBatches?: boolean;
}

export default function BatchesPage() {
  const { lang, tenantContext } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    itemId: "",
    batchNumber: "",
    mfgDate: "",
    expiryDate: "",
    purchaseRate: 80,
    mrp: 100,
    saleRate: 90,
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [batchesRes, itemsRes]: any = await Promise.all([
        apiClient.get("/batches"),
        apiClient.get("/items"),
      ]);
      const allItems = extractList<ItemOption>(itemsRes);
      const productItems = allItems.filter((it: any) => it.type !== "SERVICE");
      setBatches(extractList<Batch>(batchesRes));
      setItems(productItems.length > 0 ? productItems : allItems);
    } catch (err: any) {
      setError(err.message || "Failed to load batches.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchData();
    }
  }, [tenantContext.companyId, fetchData]);

  const handleOpenModal = () => {
    const defaultItem = items[0];
    setFormData({
      itemId: defaultItem?.id || "",
      batchNumber: `BATCH-${Date.now().toString().slice(-4)}`,
      mfgDate: new Date().toISOString().split("T")[0],
      expiryDate: new Date(Date.now() + 180 * 86400000)
        .toISOString()
        .split("T")[0],
      purchaseRate: Number(defaultItem?.purchaseRate ?? 80),
      mrp: Number(defaultItem?.mrp ?? 100),
      saleRate: Number(defaultItem?.retailPrice ?? 90),
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleItemSelect = (selectedId: string) => {
    const selected = items.find((it) => it.id === selectedId);
    setFormData((prev) => ({
      ...prev,
      itemId: selectedId,
      purchaseRate:
        selected?.purchaseRate !== undefined && selected?.purchaseRate !== null
          ? Number(selected.purchaseRate)
          : prev.purchaseRate,
      mrp:
        selected?.mrp !== undefined && selected?.mrp !== null
          ? Number(selected.mrp)
          : prev.mrp,
      saleRate:
        selected?.retailPrice !== undefined && selected?.retailPrice !== null
          ? Number(selected.retailPrice)
          : prev.saleRate,
    }));
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const purchaseRateNum = Number(formData.purchaseRate);
    if (isNaN(purchaseRateNum) || purchaseRateNum < 0) {
      setFormError(
        lang === "gu"
          ? "માન્ય ખરીદ કિંમત (Purchase Rate) દાખલ કરો."
          : "Valid purchase rate is required."
      );
      return;
    }

    const saleRateNum = Number(formData.saleRate);
    if (isNaN(saleRateNum) || saleRateNum < 0) {
      setFormError(
        lang === "gu"
          ? "માન્ય વેચાણ કિંમત (Sale Rate) દાખલ કરો."
          : "Valid sale price is required."
      );
      return;
    }

    const mrpNum = Number(formData.mrp);
    if (isNaN(mrpNum) || mrpNum < 0) {
      setFormError(
        lang === "gu"
          ? "માન્ય એમઆરપી (MRP) દાખલ કરો."
          : "Valid MRP is required."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient.post("/batches", {
        itemId: formData.itemId || (items[0]?.id as string),
        batchNumber: formData.batchNumber,
        mfgDate: formData.mfgDate
          ? new Date(formData.mfgDate).toISOString()
          : undefined,
        expiryDate: formData.expiryDate
          ? new Date(formData.expiryDate).toISOString()
          : undefined,
        purchaseRate: purchaseRateNum,
        mrp: mrpNum,
        salePrice: saleRateNum,
        saleRate: saleRateNum,
      });

      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setFormError(err.message || "Failed to create batch.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-border shadow-subtle">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {lang === "gu"
              ? "વસ્તુ બેચ વ્યવસ્થા (Item Batches)"
              : "Item Batches & Expiry"}
          </h1>
          <p className="text-xs text-muted mt-1">
            {lang === "gu"
              ? "દવાઓ, ખાદ્યપદાર્થો અને એક્સપાયરી તારીખ મુજબ બેચ ટ્રેકિંગ અને ખરીદ/વેચાણ કિંમત"
              : "Track batch numbers, manufacturing dates, expiry, purchase rates, and batch MRPs"}
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-pressed text-white text-xs sm:text-sm font-bold rounded-xl shadow-card hover:shadow-hover transition-all"
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
          <span>{lang === "gu" ? "નવો બેચ ઉમેરો" : "Add Batch"}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-medium">
          {error}
        </div>
      )}

      {/* Main DataTable */}
      <DataTable<Batch>
        data={batches}
        columns={[
          {
            header: lang === "gu" ? "બેચ નંબર" : "Batch Number",
            accessorKey: "batchNumber",
            sortable: true,
            cell: (b) => (
              <span className="font-mono font-bold text-slate-900">
                {b.batchNumber}
              </span>
            ),
          },
          {
            header: lang === "gu" ? "વસ્તુ" : "Item",
            accessorKey: "itemId",
            sortable: true,
            cell: (b) => (
              <span className="font-medium text-slate-800">
                {b.item?.name || "—"}
              </span>
            ),
          },
          {
            header: lang === "gu" ? "બનાવટ તારીખ" : "Mfg Date",
            accessorKey: "mfgDate",
            sortable: true,
            cell: (b) => (
              <span className="font-mono text-slate-600">
                {b.mfgDate
                  ? new Date(b.mfgDate).toLocaleDateString("en-IN")
                  : "—"}
              </span>
            ),
          },
          {
            header: lang === "gu" ? "એક્સપાયરી તારીખ" : "Expiry Date",
            accessorKey: "expiryDate",
            sortable: true,
            cell: (b) => (
              <span className="font-mono text-amber-700">
                {b.expiryDate
                  ? new Date(b.expiryDate).toLocaleDateString("en-IN")
                  : "—"}
              </span>
            ),
          },
          {
            header: lang === "gu" ? "ખરીદ કિંમત (₹)" : "Purchase Rate (₹)",
            accessorKey: "purchaseRate",
            sortable: true,
            className: "text-right font-mono text-slate-600",
            cell: (b) => <span>₹{Number(b.purchaseRate || 0).toFixed(2)}</span>,
          },
          {
            header: lang === "gu" ? "એમઆરપી (₹)" : "MRP (₹)",
            accessorKey: "mrp",
            sortable: true,
            className: "text-right font-mono text-slate-800",
            cell: (b) => <span>₹{Number(b.mrp || 0).toFixed(2)}</span>,
          },
          {
            header: lang === "gu" ? "વેચાણ દર (₹)" : "Sale Rate (₹)",
            accessorKey: "salePrice",
            sortable: true,
            className: "text-right font-mono font-bold text-emerald-700",
            cell: (b) => (
              <span>₹{Number(b.salePrice ?? b.saleRate ?? 0).toFixed(2)}</span>
            ),
          },
        ]}
        keyExtractor={(b) => b.id}
        searchPlaceholder={
          lang === "gu"
            ? "બેચ નંબર અથવા વસ્તુના નામથી શોધો..."
            : "Search by batch number or item..."
        }
        searchKeys={["batchNumber"]}
        defaultPageSize={10}
        isLoading={isLoading}
        emptyMessage={
          lang === "gu"
            ? "કોઈ બેચ મળ્યા નથી. ઉપર 'નવો બેચ ઉમેરો' પર ક્લિક કરો."
            : "No batches found. Click 'Add Batch' to track item batches."
        }
        exportFilename="batches_master"
        themeColor="saffron"
        mobileCardRender={(b) => (
          <div key={b.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-slate-900">
                {b.batchNumber}
              </span>
              <span className="font-mono font-bold text-emerald-700 text-xs">
                Sale: ₹{Number(b.salePrice ?? b.saleRate ?? 0).toFixed(2)}
              </span>
            </div>
            <div className="text-xs font-medium text-slate-800">
              {b.item?.name || "—"}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
              <span>
                Mfg: {b.mfgDate ? new Date(b.mfgDate).toLocaleDateString("en-IN") : "—"}
              </span>
              <span className="text-amber-700">
                Exp: {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString("en-IN") : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-100 font-mono">
              <span>Pur: ₹{Number(b.purchaseRate || 0).toFixed(2)}</span>
              <span>MRP: ₹{Number(b.mrp || 0).toFixed(2)}</span>
            </div>
          </div>
        )}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={lang === "gu" ? "નવો બેચ ઉમેરો" : "Add Item Batch"}
        titleGujarati="બેચ નંબર, ખરીદ/વેચાણ કિંમત અને એક્સપાયરી વિગતો"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateBatch} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700 font-medium">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              {lang === "gu" ? "વસ્તુ પસંદ કરો *" : "Select Item *"}
            </label>
            <select
              value={formData.itemId}
              onChange={(e) => handleItemSelect(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500"
            >
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              {lang === "gu" ? "બેચ નંબર *" : "Batch Number *"}
            </label>
            <input
              type="text"
              required
              value={formData.batchNumber}
              onChange={(e) =>
                setFormData({ ...formData, batchNumber: e.target.value })
              }
              placeholder="BATCH-2026-A1"
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono uppercase focus:bg-white focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "બનાવટ તારીખ (Mfg Date)" : "Mfg Date"}
              </label>
              <input
                type="date"
                value={formData.mfgDate}
                onChange={(e) =>
                  setFormData({ ...formData, mfgDate: e.target.value })
                }
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "એક્સપાયરી તારીખ (Expiry Date)" : "Expiry Date"}
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) =>
                  setFormData({ ...formData, expiryDate: e.target.value })
                }
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono focus:bg-white"
              />
            </div>
          </div>

          {/* Pricing Grid: Purchase Rate, MRP, and Sale Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "ખરીદ કિંમત (₹) *" : "Purchase Rate (₹) *"}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.purchaseRate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    purchaseRate: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="80.00"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono font-medium focus:bg-white focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "એમઆરપી (₹) *" : "Batch MRP (₹) *"}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.mrp}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    mrp: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="100.00"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono focus:bg-white focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "વેચાણ દર (₹) *" : "Batch Sale Rate (₹) *"}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.saleRate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    saleRate: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="90.00"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-emerald-700 focus:bg-white focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              {lang === "gu" ? "રદ કરો" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#F47721] hover:bg-[#D95F12] disabled:bg-[#F47721]/50 rounded-lg shadow-sm transition-colors"
            >
              {isSubmitting
                ? lang === "gu"
                  ? "સેવ થઈ રહ્યું છે..."
                  : "Saving..."
                : lang === "gu"
                ? "બેચ સેવ કરો"
                : "Save Batch"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
