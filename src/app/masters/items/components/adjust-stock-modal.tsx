"use client";

import React, { useState, useEffect, useMemo } from "react";
import { apiClient } from "../../../../lib/api-client";

interface WarehouseOption {
  id: string;
  name: string;
  isDefault?: boolean;
}

interface ItemSummary {
  id: string;
  name: string;
  nameGujarati?: string;
  currentStock?: number;
  primaryUom?: {
    code: string;
    symbol?: string;
  };
}

interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ItemSummary | null;
  warehouses: WarehouseOption[];
  onSuccess: () => Promise<void>;
  lang?: "en" | "gu";
}

export function AdjustStockModal({
  isOpen,
  onClose,
  item,
  warehouses,
  onSuccess,
  lang = "en",
}: AdjustStockModalProps) {
  const [date, setDate] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [adjustType, setAdjustType] = useState<"ADD" | "REDUCE">("ADD");
  const [quantity, setQuantity] = useState<string>("");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      const today = new Date().toISOString().split("T")[0];
      setDate(today);
      const defaultWh =
        warehouses.find((w) => w.isDefault)?.id || warehouses[0]?.id || "";
      setWarehouseId(defaultWh);
      setAdjustType("ADD");
      setQuantity("");
      setRemarks("");
      setErrorMsg(null);
    }
  }, [isOpen, item, warehouses]);

  const currentStock = Number(item?.currentStock || 0);
  const uom = item?.primaryUom?.code || item?.primaryUom?.symbol || "PCS";
  const numQty = Math.abs(Number(quantity) || 0);

  const finalStock = useMemo(() => {
    if (adjustType === "ADD") {
      return currentStock + numQty;
    } else {
      return currentStock - numQty;
    }
  }, [currentStock, numQty, adjustType]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numQty || numQty <= 0) {
      setErrorMsg(
        lang === "gu"
          ? "કૃપા કરીને માન્ય જથ્થો દાખલ કરો."
          : "Please enter a valid adjustment quantity greater than 0."
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await apiClient.post(`/masters/items/${item.id}/adjust-stock`, {
        quantity: numQty,
        type: adjustType,
        warehouseId: warehouseId || undefined,
        date: date || undefined,
        remarks: remarks?.trim() || undefined,
      });

      await onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(
        lang === "gu" && err?.messageGujarati
          ? err.messageGujarati
          : err?.message || "Failed to adjust stock."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <h2 className="text-base font-bold text-slate-800 tracking-tight">
            {lang === "gu" ? "સ્ટોક જથ્થામાં ફેરફાર (Adjust Stock Quantity)" : "Adjust Stock Quantity"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer text-lg"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl flex items-center gap-2">
              <span className="font-bold text-rose-600">✕</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left Column: Form Controls */}
            <div className="md:col-span-7 space-y-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {lang === "gu" ? "તારીખ (Date)" : "Date"}
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-xs py-2 px-3 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-medium cursor-pointer"
                  />
                </div>
              </div>

              {/* Godown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {lang === "gu" ? "ગોડાઉન (Godown) *" : "Godown *"}
                </label>
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full text-xs py-2 px-3 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-medium cursor-pointer"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} {w.isDefault ? "(Default)" : ""}
                    </option>
                  ))}
                  {warehouses.length === 0 && (
                    <option value="">Main Warehouse (Default)</option>
                  )}
                </select>
              </div>

              {/* Add or Reduce Stock & Quantity Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {lang === "gu" ? "સ્ટોક ઉમેરો કે ઘટાડો" : "Add or Reduce Stock"}
                  </label>
                  <select
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value as "ADD" | "REDUCE")}
                    className="w-full text-xs py-2 px-3 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-medium cursor-pointer"
                  >
                    <option value="ADD">Add (+)</option>
                    <option value="REDUCE">Reduce (-)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {lang === "gu" ? "જથ્થો (Adjust quantity)" : "Adjust quantity"}
                  </label>
                  <div className="flex rounded-lg border border-slate-300 bg-white overflow-hidden focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="0"
                      className="w-full text-xs py-2 px-3 font-semibold text-slate-900 focus:outline-none"
                    />
                    <span className="px-2.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 border-l border-slate-200 flex items-center shrink-0">
                      {uom}
                    </span>
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {lang === "gu" ? "નોંધ (Remarks - Optional)" : "Remarks (Optional)"}
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter remarks"
                  rows={3}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-none font-medium placeholder-slate-400"
                />
              </div>
            </div>

            {/* Right Column: Item Info & Stock Calculation */}
            <div className="md:col-span-5 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Item Name */}
                <div className="pb-3 border-b border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                    {lang === "gu" ? "વસ્તુનું નામ" : "Item Name"}
                  </span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">
                    {item.name}
                  </p>
                  {lang === "gu" && item.nameGujarati && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.nameGujarati}
                    </p>
                  )}
                </div>

                {/* Stock Calculation Preview */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
                    <span>🧮</span>
                    <span>{lang === "gu" ? "સ્ટોક ગણતરી (Stock Calculation)" : "Stock Calculation"}</span>
                  </div>

                  {numQty <= 0 ? (
                    <div className="p-4 bg-white border border-slate-200 rounded-lg text-center text-xs text-slate-400 italic">
                      Adjustment will be shown here
                    </div>
                  ) : (
                    <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Current Stock:</span>
                        <span className="font-mono font-semibold">
                          {currentStock} {uom}
                        </span>
                      </div>
                      <div className="flex items-center justify-between font-semibold">
                        <span>Adjustment:</span>
                        <span
                          className={`font-mono ${
                            adjustType === "ADD" ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {adjustType === "ADD" ? "+" : "-"} {numQty} {uom}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold text-slate-900">
                        <span>Final Stock:</span>
                        <span
                          className={`font-mono text-sm ${
                            finalStock < 0 ? "text-rose-600" : "text-slate-900"
                          }`}
                        >
                          {finalStock} {uom}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-slate-400 italic mt-4 pt-2 border-t border-slate-200/60">
                Audited stock transaction will be recorded for accounting trail.
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSubmitting || numQty <= 0}
              className="px-5 py-2 text-xs font-bold text-white bg-[#5c56df] hover:bg-[#4d47d4] disabled:bg-slate-300 rounded-lg shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
