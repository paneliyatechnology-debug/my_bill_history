"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { X, Search, Tag } from "lucide-react";
import { StockQuantityDisplay } from "../inventory/stock-quantity-display";
import { CustomCombobox } from "@/components/ui/dropdown-system";
import { apiClient, extractList } from "@/lib/api-client";
import { ItemStepModal, ItemFormData } from "@/app/masters/items/components/item-step-modal";

export interface CatalogItem {
  id: string;
  name: string;
  hsnCode?: string;
  taxRate?: number;
  retailPrice: number;
  purchasePrice?: number;
  stockQuantity?: number;
  minStockLevel?: number;
  category?: string;
  categoryId?: string;
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
  enforceStockLimit?: boolean;
}

export function AddItemsModal({
  isOpen,
  onClose,
  items = [],
  onAddSelectedItems,
  onCreateNewItem,
  enforceStockLimit = true,
}: AddItemsModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [localCreatedItems, setLocalCreatedItems] = useState<CatalogItem[]>([]);
  const [fetchedCategories, setFetchedCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [fetchedMinStockMap, setFetchedMinStockMap] = useState<Record<string, number>>({});
  const [fetchedUnits, setFetchedUnits] = useState<any[]>([]);
  const [fetchedWarehouses, setFetchedWarehouses] = useState<any[]>([]);
  const [isCreateItemOpen, setIsCreateItemOpen] = useState(false);
  const [stockLimitWarning, setStockLimitWarning] = useState<string | null>(null);

  // Auto-focus search input & load categories/minStockLevel when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      setSearchTerm("");
      setQuantities({});
      setFocusedIndex(0);

      apiClient.get("/masters/categories").then((res) => {
        setFetchedCategories(extractList<any>(res));
      }).catch(() => {});

      apiClient.get("/masters/items", { limit: 500 }).then((res) => {
        const list = extractList<any>(res);
        const map: Record<string, number> = {};
        list.forEach((it: any) => {
          if (it?.id && it.minStockLevel !== undefined && it.minStockLevel !== null) {
            map[it.id] = Number(it.minStockLevel) || 0;
          }
        });
        setFetchedMinStockMap(map);
      }).catch(() => {});
    }
  }, [isOpen]);

  const openBuiltInCreateItem = async () => {
    setIsCreateItemOpen(true);
    try {
      const [uRes, cRes, wRes] = await Promise.all([
        apiClient.get("/masters/units").catch(() => []),
        apiClient.get("/masters/categories").catch(() => []),
        apiClient.get("/masters/warehouses").catch(() => []),
      ]);
      setFetchedUnits(extractList<any>(uRes));
      setFetchedCategories(extractList<any>(cRes));
      setFetchedWarehouses(extractList<any>(wRes));
    } catch {
      // ignore
    }
  };

  const mergedItems = useMemo<CatalogItem[]>(() => {
    const catMap = new Map(fetchedCategories.map((c) => [c.id, c.name]));
    const combined = [...localCreatedItems, ...(items || [])];
    const seen = new Set<string>();
    return combined
      .filter((it) => {
        if (seen.has(it.id)) return false;
        seen.add(it.id);
        return true;
      })
      .map((it) => ({
        ...it,
        category: it.category || (it.categoryId ? catMap.get(it.categoryId) : undefined),
        minStockLevel: it.minStockLevel ?? fetchedMinStockMap[it.id] ?? 0,
      }));
  }, [items, localCreatedItems, fetchedCategories, fetchedMinStockMap]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    mergedItems.forEach((it) => {
      if (it.category) set.add(it.category);
    });
    fetchedCategories.forEach((c) => {
      if (c.name) set.add(c.name);
    });
    return ["ALL", ...Array.from(set)];
  }, [mergedItems, fetchedCategories]);

  // Filter items
  const filteredItems = useMemo(() => {
    return mergedItems.filter((it) => {
      const matchesCategory =
        selectedCategory === "ALL" || it.category === selectedCategory;
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        it.name.toLowerCase().includes(q) ||
        (it.hsnCode && it.hsnCode.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [mergedItems, selectedCategory, searchTerm]);

  // Increment / Decrement (clamped to available stock when enforceStockLimit is true)
  const handleQuantityChange = (itemId: string, delta: number) => {
    const targetItem = mergedItems.find((i) => i.id === itemId);
    const maxAvail = Math.max(0, Number(targetItem?.stockQuantity ?? 0));

    setQuantities((prev) => {
      const current = prev[itemId] || 0;
      let next = Math.max(0, current + delta);
      if (enforceStockLimit && delta > 0 && next > maxAvail) {
        next = maxAvail;
        setStockLimitWarning(
          maxAvail === 0
            ? `${targetItem?.name || "Item"} is out of stock.`
            : `Only ${maxAvail} ${targetItem?.unit || "PCS"} available in stock for ${targetItem?.name || "this item"}.`
        );
      } else {
        setStockLimitWarning(null);
      }
      if (next === 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const handleDirectInput = (itemId: string, value: string) => {
    const targetItem = mergedItems.find((i) => i.id === itemId);
    const maxAvail = Math.max(0, Number(targetItem?.stockQuantity ?? 0));
    let val = Number(value);

    if (enforceStockLimit && !isNaN(val) && val > maxAvail) {
      val = maxAvail;
      setStockLimitWarning(
        maxAvail === 0
          ? `${targetItem?.name || "Item"} is out of stock.`
          : `Only ${maxAvail} ${targetItem?.unit || "PCS"} available in stock for ${targetItem?.name || "this item"}.`
      );
    } else {
      setStockLimitWarning(null);
    }

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
        const it = mergedItems.find((i) => i.id === id);
        return it ? { item: it, quantity: qty, unitPrice: it.retailPrice } : null;
      })
      .filter((entry): entry is { item: CatalogItem; quantity: number; unitPrice: number } => entry !== null);
  }, [quantities, mergedItems]);

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
          <h2 className="typo-modal-title text-[#182230]">
            Add Items to Bill
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            title="Close [ESC]"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Category Filter Strip (Matching Screenshot 2) */}
        <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap items-center gap-3">
          {/* Search Input with Barcode icon */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by Item/ Serial no./ HSN code/ SKU/ Custom Field / Category"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-9 pr-10 py-2.5 bg-white border-2 border-indigo-500 rounded-lg typo-input text-slate-900 placeholder:text-slate-400 focus:outline-none shadow-xs h-10"
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
          <div className="min-w-[160px]">
            <CustomCombobox
              value={selectedCategory}
              onChange={(val: any) => setSelectedCategory(val)}
              options={[
                { value: "ALL", label: "Select Category" },
                ...categories.filter((c) => c !== "ALL").map((cat) => ({
                  value: cat,
                  label: cat,
                })),
              ]}
              placeholder="Select Category"
              triggerClassName="rounded-lg border-slate-300 bg-white text-slate-700"
            />
          </div>

          {/* Create New Item Button */}
          <button
            type="button"
            onClick={() => {
              if (onCreateNewItem) {
                onCreateNewItem();
              } else {
                openBuiltInCreateItem();
              }
            }}
            className="h-9 px-3.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-lg typo-btn-primary transition-all shadow-xs shrink-0 cursor-pointer active:scale-95"
          >
            Create New Item
          </button>
        </div>

        {/* Table Content (Matching Screenshot 2 Columns) */}
        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {filteredItems.length === 0 ? (
            <div className="py-24 text-center typo-card-desc text-slate-400">
              <p>
                Scan Items to add them to your invoice
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-[#F8F9FA] border-b border-slate-200 text-slate-600 typo-table-th">
                <tr>
                  <th className="py-2.5 px-4">Item Name</th>
                  <th className="py-2.5 px-3 text-center">Item Code</th>
                  <th className="py-2.5 px-3 text-center">Stock</th>
                  <th className="py-2.5 px-3 text-right">Sales Price</th>
                  <th className="py-2.5 px-3 text-right">Purchase Price</th>
                  <th className="py-2.5 px-4 text-center w-36">Quantity</th>
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
                        <p className="font-semibold text-slate-900 typo-table-td">{it.name}</p>
                        {it.category && (
                          <span className="typo-card-desc text-slate-500">
                            {it.category}
                          </span>
                        )}
                      </td>

                      {/* Item Code (or HSN) */}
                      <td className="py-3 px-3 text-center typo-invoice-no text-slate-600">
                        {it.hsnCode || "-"}
                      </td>

                      {/* Stock */}
                      <td className="py-3 px-3 text-center">
                        <StockQuantityDisplay
                          quantity={stock}
                          unit={it.unit || "PCS"}
                          minStockLevel={it.minStockLevel}
                          className="justify-center"
                        />
                      </td>

                      {/* Sales Price */}
                      <td className="py-3 px-3 text-right typo-table-amount text-slate-900">
                        <div className="flex flex-col items-end">
                          <span>₹{Number(it.retailPrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                          {it.isPartyRate && (
                            <span className="text-[9px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-1 rounded inline-flex items-center gap-0.5 mt-0.5">
                              <Tag className="w-2.5 h-2.5" />
                              <span>Party Rate</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Purchase Price */}
                      <td className="py-3 px-3 text-right typo-table-amount text-slate-600">
                        {it.purchasePrice ? `₹${Number(it.purchasePrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                      </td>

                      {/* Quantity Stepper */}
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(it.id, -1)}
                            disabled={qty === 0}
                            className="w-7 h-7 rounded-lg border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-medium text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed typo-btn-secondary transition-colors"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            max={enforceStockLimit ? Math.max(0, stock) : undefined}
                            disabled={enforceStockLimit && stock <= 0}
                            value={qty > 0 ? qty : ""}
                            placeholder="0"
                            onChange={(e) =>
                              handleDirectInput(it.id, e.target.value)
                            }
                            className="w-12 h-7 text-center typo-input typo-tabular bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
                          />
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(it.id, 1)}
                            disabled={enforceStockLimit && qty >= stock}
                            className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 flex items-center justify-center font-medium typo-btn-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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

        {stockLimitWarning && (
          <div className="px-6 py-2 bg-amber-50 border-t border-amber-200 text-amber-800 text-xs font-medium">
            {stockLimitWarning}
          </div>
        )}

        {/* Clean Summary & Actions Footer */}
        <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-900">{totalItemsCount} selected</span>
            <span className="text-slate-300">|</span>
            <span className="font-semibold tabular-nums text-slate-900">
              ₹ {totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
            {totalQuantity > 0 && (
              <>
                <span className="text-slate-300">|</span>
                <span className="tabular-nums text-slate-500">{totalQuantity} qty</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={totalItemsCount === 0}
              className="h-9 px-4 bg-[#1677E8] hover:bg-[#1268D3] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            >
              Add to Bill
            </button>
          </div>
        </div>

      </div>

      {isCreateItemOpen && (
        <ItemStepModal
          isOpen={isCreateItemOpen}
          onClose={() => setIsCreateItemOpen(false)}
          onSubmit={async (data: ItemFormData) => {
            let uomId = data.primaryUomId || fetchedUnits[0]?.id;
            if (!uomId) {
              const uRes = await apiClient.get("/masters/units").catch(() => []);
              const uList = extractList<any>(uRes);
              if (uList.length > 0) uomId = uList[0].id;
            }
            const createdRes: any = await apiClient.post("/masters/items", {
              type: data.type,
              name: data.name.trim(),
              nameGujarati: data.nameGujarati?.trim() || undefined,
              sku: data.sku?.trim() || undefined,
              barcode: data.barcode?.trim() || undefined,
              hsnCode: data.hsnCode?.trim() || "1001",
              primaryUomId: uomId,
              secondaryUomId: data.secondaryUomId || undefined,
              conversionFactor: data.secondaryUomId ? Number(data.conversionFactor) || 1 : undefined,
              categoryId: data.categoryId || undefined,
              taxRate: Number(data.taxRate) || 0,
              isTaxInclusive: data.isTaxInclusive,
              retailPrice: Number(data.retailPrice) || 0,
              purchaseRate: Number(data.purchaseRate) || 0,
              mrp: data.mrp ? Number(data.mrp) : undefined,
              wholesalePrice: data.wholesalePrice ? Number(data.wholesalePrice) : undefined,
              openingStock: data.type === "PRODUCT" && data.openingStock !== "" ? Number(data.openingStock) : 0,
              warehouseId: data.warehouseId || undefined,
              minStockLevel: data.enableLowStockWarning ? Number(data.minStockLevel) || 0 : 0,
              trackBatches: Boolean(data.trackBatches),
              trackSerialNo: Boolean(data.trackSerialNo),
            });
            const created = createdRes?.data || createdRes;
            if (created?.id) {
              const catName =
                created.category?.name ||
                fetchedCategories.find((c) => c.id === (created.categoryId || data.categoryId))?.name;
              const unitSymbol =
                created.primaryUom?.symbol ||
                fetchedUnits.find((u) => u.id === uomId)?.symbol ||
                "PCS";
              const newCatalogItem: CatalogItem = {
                id: created.id,
                name: created.name,
                hsnCode: created.hsnCode || "1001",
                taxRate: Number(created.taxRate ?? data.taxRate) || 0,
                retailPrice: Number(created.retailPrice ?? data.retailPrice) || 0,
                purchasePrice: Number(created.purchaseRate ?? data.purchaseRate) || 0,
                stockQuantity: Number(created.currentStock ?? (data.type === "PRODUCT" ? data.openingStock : 0)) || 0,
                category: catName,
                categoryId: created.categoryId || data.categoryId || undefined,
                unit: unitSymbol,
              };
              setLocalCreatedItems((prev) => [newCatalogItem, ...prev]);
              setQuantities((prev) => ({ ...prev, [created.id]: 1 }));
            }
            setIsCreateItemOpen(false);
          }}
          units={fetchedUnits}
          categories={fetchedCategories}
          warehouses={fetchedWarehouses}
          onAddCategory={async (name: string) => {
            try {
              const res: any = await apiClient.post("/masters/categories", { name });
              const created = res?.data || res;
              if (created?.id) {
                setFetchedCategories((prev) => [...prev, created]);
                return created;
              }
            } catch {
              // ignore
            }
            return null;
          }}
        />
      )}
    </div>
  );
}
