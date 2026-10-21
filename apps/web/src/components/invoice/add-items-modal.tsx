"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";

export interface CatalogItem {
  id: string;
  name: string;
  hsnCode?: string;
  taxRate?: number;
  retailPrice: number;
  purchasePrice?: number;
  stockQuantity?: number;
  category?: string;
  unit?: string;
  isPartyRate?: boolean;
  baseRetailPrice?: number;
}

interface AddItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CatalogItem[];
  onAddSelectedItems: (
    selected: Array<{
      item: CatalogItem;
      quantity: number;
      unitPrice: number;
    }>
  ) => void;
  onCreateNewItem?: () => void;
}

export function AddItemsModal({
  isOpen,
  onClose,
  items = [],
  onAddSelectedItems,
  onCreateNewItem,
}: AddItemsModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-focus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      setSearchTerm("");
      setQuantities({});
      setFocusedIndex(0);
    }
  }, [isOpen]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    (items || []).forEach((it) => {
      if (it.category) set.add(it.category);
    });
    return ["ALL", ...Array.from(set)];
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const matchesCategory =
        selectedCategory === "ALL" || it.category === selectedCategory;
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        it.name.toLowerCase().includes(q) ||
        (it.hsnCode && it.hsnCode.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [items, selectedCategory, searchTerm]);

  // Increment / Decrement
  const handleQuantityChange = (itemId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const handleDirectInput = (itemId: string, value: string) => {
    const val = Number(value);
    setQuantities((prev) => {
      if (isNaN(val) || val <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: val };
    });
  };

  // Selected totals
  const selectedEntries = useMemo(() => {
    return Object.entries(quantities)
      .map(([id, qty]) => {
        const it = items.find((i) => i.id === id);
        return it ? { item: it, quantity: qty, unitPrice: it.retailPrice } : null;
      })
      .filter((entry): entry is { item: CatalogItem; quantity: number; unitPrice: number } => entry !== null);
  }, [quantities, items]);

  const totalItemsCount = selectedEntries.length;
  const totalQuantity = selectedEntries.reduce((sum, e) => sum + e.quantity, 0);
  const totalAmount = selectedEntries.reduce(
    (sum, e) => sum + e.quantity * e.unitPrice,
    0
  );

  const handleApply = () => {
    if (selectedEntries.length > 0) {
      onAddSelectedItems(selectedEntries);
    }
    setQuantities({});
    onClose();
  };

  // Keyboard Navigation & Shortcuts (ESC to close, F7 to apply, Enter on barcode)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "F7") {
        e.preventDefault();
        handleApply();
      } else if (e.key === "ArrowDown") {
        setFocusedIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
      } else if (e.key === "ArrowUp") {
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedEntries, filteredItems.length, onClose]);

  // Handle barcode scanned / Enter key in search box
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && filteredItems.length > 0) {
      e.preventDefault();
      const targetItem = filteredItems[focusedIndex] || filteredItems[0];
      if (targetItem) {
        handleQuantityChange(targetItem.id, 1);
        setSearchTerm("");
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
        
        {/* Header (Exact MyBillBook style) */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white">
          <h2 className="text-base font-bold text-slate-900">
            Add Items to Bill
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            title="Close [ESC]"
            aria-label="Close"
          >
            <span className="text-base font-bold leading-none">✕</span>
          </button>
        </div>

        {/* Search & Category Filter Strip (Matching Screenshot 2) */}
        <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap items-center gap-3">
          {/* Search Input with Barcode icon */}
          <div className="relative flex-1 min-w-[280px]">
            <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm">
              🔍
            </span>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by Item/ Serial no./ HSN code/ SKU/ Custom Field / Category"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-9 pr-10 py-2.5 bg-white border-2 border-indigo-500 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none shadow-xs font-medium"
            />
            {/* Barcode scanner icon on the right inside input */}
            <div
              className="absolute right-3 top-2.5 text-slate-500 cursor-pointer hover:text-indigo-600"
              title="Barcode Scanner Active"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5v14" />
                <path d="M8 5v14" />
                <path d="M12 5v14" />
                <path d="M17 5v14" />
                <path d="M21 5v14" />
              </svg>
            </div>
          </div>

          {/* Select Category Dropdown */}
          <div className="relative min-w-[160px]">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">Select Category</option>
              {categories.filter((c) => c !== "ALL").map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Create New Item Button */}
          <button
            type="button"
            onClick={onCreateNewItem}
            className="px-4 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-lg text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer active:scale-95"
          >
            Create New Item
          </button>
        </div>

        {/* Table Content (Matching Screenshot 2 Columns) */}
        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {filteredItems.length === 0 ? (
            <div className="py-24 text-center text-slate-400">
              <p className="text-xs font-medium text-slate-400">
                Scan Items to add them to your invoice
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-[#F8F9FA] border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                <tr>
                  <th className="py-2.5 px-4 font-bold">Item Name</th>
                  <th className="py-2.5 px-3 font-bold text-center">Item Code</th>
                  <th className="py-2.5 px-3 font-bold text-center">Stock</th>
                  <th className="py-2.5 px-3 font-bold text-right">Sales Price</th>
                  <th className="py-2.5 px-3 font-bold text-right">Purchase Price</th>
                  <th className="py-2.5 px-4 font-bold text-center w-36">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((it, idx) => {
                  const qty = quantities[it.id] || 0;
                  const isSelected = qty > 0;
                  const isFocused = idx === focusedIndex;
                  const stock = it.stockQuantity ?? 0;

                  return (
                    <tr
                      key={it.id}
                      onClick={() => setFocusedIndex(idx)}
                      className={`transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-indigo-50/50"
                          : isFocused
                          ? "bg-slate-50"
                          : "hover:bg-slate-50/80"
                      }`}
                    >
                      {/* Item Name */}
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{it.name}</p>
                        {it.category && (
                          <span className="text-[10px] text-slate-500">
                            {it.category}
                          </span>
                        )}
                      </td>

                      {/* Item Code (or HSN) */}
                      <td className="py-3 px-3 text-center font-mono text-slate-600">
                        {it.hsnCode || "-"}
                      </td>

                      {/* Stock */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            stock > 5
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : stock > 0
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {stock > 0 ? `${stock} ${it.unit || "PCS"}` : "-"}
                        </span>
                      </td>

                      {/* Sales Price */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        <div className="flex flex-col items-end">
                          <span>₹{Number(it.retailPrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                          {it.isPartyRate && (
                            <span className="text-[9px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-1 rounded inline-block mt-0.5">
                              🏷️ Party Rate
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Purchase Price */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {it.purchasePrice ? `₹${Number(it.purchasePrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                      </td>

                      {/* Quantity Stepper */}
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(it.id, -1)}
                            disabled={qty === 0}
                            className="w-7 h-7 rounded-lg border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-colors"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={qty > 0 ? qty : ""}
                            placeholder="0"
                            onChange={(e) =>
                              handleDirectInput(it.id, e.target.value)
                            }
                            className="w-12 h-7 text-center font-mono font-bold text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(it.id, 1)}
                            className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Summary & Keyboard Shortcuts Toolbar (Matching Screenshot 2) */}
        <div className="px-6 py-3 bg-[#F8F9FA] border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
          {/* Left: Selected count & totals */}
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
            <span>{totalItemsCount} Item(s) Selected</span>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-slate-900 font-bold">
              ₹ {totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-slate-900">{totalQuantity}</span>
          </div>

          {/* Center: Keyboard Shortcuts Hint */}
          <div className="hidden md:flex items-center gap-4 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-600">Keyboard Shortcuts :</span>
            <span className="flex items-center gap-1">
              <span>Change Quantity</span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono text-slate-700 shadow-2xs">Enter</kbd>
            </span>
            <span className="flex items-center gap-1">
              <span>Move between Items</span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono text-slate-700 shadow-2xs">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono text-slate-700 shadow-2xs">↓</kbd>
            </span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 transition-colors shadow-2xs"
            >
              Cancel [ESC]
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={totalItemsCount === 0}
              className="px-5 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-lg text-xs font-bold shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 active:scale-95"
            >
              <span>Add to Bill [F7]</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
