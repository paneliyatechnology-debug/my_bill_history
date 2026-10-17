"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";
import { Modal } from "../../../components/ui/modal";
import { Badge, StatusBadge } from "../../../components/ui/badge";
import { HsnSelector } from "../../../components/ui/hsn-selector";
import { DataTable, ColumnDef } from "../../../components/ui/data-table";
import { ItemStepModal, ItemFormData } from "./components/item-step-modal";
import { ItemBarcodeModal } from "./components/item-barcode-modal";

interface Item {
  id: string;
  type: "PRODUCT" | "SERVICE";
  name: string;
  nameGujarati?: string;
  sku?: string;
  barcode?: string;
  hsnCode: string;
  taxRate: number;
  retailPrice: number;
  mrp?: number;
  purchaseRate?: number;
  wholesalePrice?: number;
  minStockLevel?: number;
  currentStock?: number;
  trackBatches?: boolean;
  trackSerialNo?: boolean;
  isActive: boolean;
  categoryId?: string | null;
  primaryUomId?: string;
  secondaryUomId?: string | null;
  conversionFactor?: number | null;
  primaryUom?: {
    id: string;
    name: string;
    code: string;
    symbol?: string;
  };
}

interface Unit {
  id: string;
  name: string;
  code: string;
}

interface Category {
  id: string;
  name: string;
}

interface Warehouse {
  id: string;
  name: string;
  isDefault?: boolean;
}

export default function ItemsPage() {
  const { lang, tenantContext, currentCompany } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE"); // default to ACTIVE so inactive items do NOT clutter view

  // Create / Edit Step Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [barcodeModalItem, setBarcodeModalItem] = useState<Item | null>(null);

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkForceDelete, setBulkForceDelete] = useState(false);

  // Single Delete Confirmation Modal
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [forceDelete, setForceDelete] = useState(false);

  // Success Notification
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);



  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [itemsRes, unitsRes, catsRes, whRes]: any = await Promise.all([
        apiClient.get("/items", {
          search: searchTerm || undefined,
          type: typeFilter !== "ALL" ? typeFilter : undefined,
        }),
        apiClient.get("/units"),
        apiClient.get("/categories"),
        apiClient.get("/warehouses").catch(() => []),
      ]);

      setItems(extractList(itemsRes));
      setUnits(extractList(unitsRes));
      setCategories(extractList(catsRes));
      setWarehouses(extractList(whRes));
    } catch (err: any) {
      setError(err.message || "Failed to load item catalog.");
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, typeFilter]);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchData();
    }
  }, [tenantContext.companyId, fetchData]);

  const handleOpenCreateModal = () => {
    setIsModalOpen(true);
  };

  const handleCreateItemStep = async (data: ItemFormData) => {
    let uomId = data.primaryUomId;
    if (!uomId && units.length > 0) {
      uomId = units[0].id;
    }

    await apiClient.post("/items", {
      type: data.type,
      name: data.name.trim(),
      nameGujarati: data.nameGujarati?.trim() || undefined,
      sku: data.sku?.trim() || undefined,
      barcode: data.barcode?.trim() || undefined,
      hsnCode: data.hsnCode.trim(),
      primaryUomId: uomId,
      secondaryUomId: data.secondaryUomId || undefined,
      conversionFactor: data.conversionFactor ? Number(data.conversionFactor) : undefined,
      categoryId: data.categoryId || undefined,
      taxRate: Number(data.taxRate) || 0,
      retailPrice: Number(data.retailPrice) || 0,
      mrp: Number(data.mrp) || Number(data.retailPrice) || 0,
      purchaseRate: Number(data.purchaseRate) || 0,
      wholesalePrice: data.wholesalePrice ? Number(data.wholesalePrice) : undefined,
      minStockLevel: Number(data.minStockLevel) || 0,
      openingStock: data.type === "PRODUCT" ? Number(data.openingStock) || 0 : 0,
      openingStockDate: data.asOfDate || undefined,
      warehouseId: data.warehouseId || undefined,
      openingBatchNumber:
        data.trackBatches && data.openingBatchNumber
          ? data.openingBatchNumber.trim()
          : undefined,
      openingExpiryDate:
        data.trackBatches && data.openingExpiryDate
          ? data.openingExpiryDate
          : undefined,
      openingMfgDate:
        data.trackBatches && data.openingMfgDate
          ? data.openingMfgDate
          : undefined,
      trackBatches: data.type === "PRODUCT" ? Boolean(data.trackBatches) : false,
      trackSerialNo: Boolean(data.trackSerialNo),
    });

    setIsModalOpen(false);
    setSuccessMessage(
      lang === "gu"
        ? "આઇટમ અને બારકોડ સફળતાપૂર્વક સાચવવામાં આવી છે!"
        : "Item created successfully with barcode!"
    );
    await fetchData();
  };

  const handleOpenEditModal = (item: Item) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const editInitialData = useMemo<Partial<ItemFormData> | undefined>(() => {
    if (!editingItem) return undefined;
    return {
      type: editingItem.type,
      name: editingItem.name,
      nameGujarati: editingItem.nameGujarati || "",
      sku: editingItem.sku || "",
      barcode: editingItem.barcode || "",
      hsnCode: editingItem.hsnCode || "1006",
      primaryUomId:
        editingItem.primaryUomId || editingItem.primaryUom?.id || units[0]?.id || "",
      secondaryUomId: editingItem.secondaryUomId || "",
      conversionFactor: Number(editingItem.conversionFactor) || 1,
      categoryId: editingItem.categoryId || "",
      taxRate: Number(editingItem.taxRate) || 0,
      retailPrice: Number(editingItem.retailPrice) || "",
      mrp: Number(editingItem.mrp ?? editingItem.retailPrice ?? ""),
      purchaseRate: Number(editingItem.purchaseRate ?? ""),
      wholesalePrice: Number(editingItem.wholesalePrice ?? "") || "",
      minStockLevel: Number(editingItem.minStockLevel ?? 10),
      trackBatches: Boolean(editingItem.trackBatches),
      trackSerialNo: Boolean(editingItem.trackSerialNo),
      isActive: editingItem.isActive !== false,
    };
  }, [editingItem, units]);

  const handleUpdateItemStep = async (data: ItemFormData) => {
    if (!editingItem) return;

    await apiClient.put(`/items/${editingItem.id}`, {
      type: data.type,
      name: data.name.trim(),
      nameGujarati: data.nameGujarati?.trim() || undefined,
      sku: data.sku?.trim() || undefined,
      barcode: data.barcode?.trim() || undefined,
      hsnCode: data.hsnCode.trim(),
      primaryUomId: data.primaryUomId || undefined,
      secondaryUomId: data.secondaryUomId || undefined,
      conversionFactor: data.conversionFactor ? Number(data.conversionFactor) : undefined,
      categoryId: data.categoryId || undefined,
      taxRate: Number(data.taxRate) || 0,
      retailPrice: Number(data.retailPrice) || 0,
      mrp: Number(data.mrp) || Number(data.retailPrice) || 0,
      purchaseRate: Number(data.purchaseRate) || 0,
      wholesalePrice: data.wholesalePrice ? Number(data.wholesalePrice) : undefined,
      minStockLevel: Number(data.minStockLevel) || 0,
      trackBatches: data.type === "PRODUCT" ? Boolean(data.trackBatches) : false,
      trackSerialNo: Boolean(data.trackSerialNo),
      isActive: Boolean(data.isActive),
    });

    setIsEditModalOpen(false);
    setEditingItem(null);
    setSuccessMessage(
      lang === "gu"
        ? "આઇટમ સફળતાપૂર્વક સુધારવામાં આવી છે!"
        : "Item updated successfully!"
    );
    await fetchData();
  };

  const handleAddNewCategory = async (catName: string) => {
    const res: any = await apiClient.post("/categories", {
      name: catName,
    });
    const newCat = res?.data || res;
    const catItem: Category = {
      id: newCat.id,
      name: newCat.name,
    };
    setCategories((prev) => [...prev, catItem]);
    return catItem;
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const shouldForce = forceDelete || itemToDelete.isActive === false;
      const res: any = await apiClient.delete(
        `/items/${itemToDelete.id}${shouldForce ? "?force=true" : ""}`
      );
      const deletedId = itemToDelete.id;

      // Immediately remove from local state so UI updates instantly
      setItems((prev) => prev.filter((it) => it.id !== deletedId));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deletedId);
        return next;
      });

      const msg =
        lang === "gu" && res?.messageGujarati
          ? res.messageGujarati
          : res?.message ||
            (lang === "gu"
              ? "વસ્તુ સફળતાપૂર્વક કાઢી નાખવામાં આવી છે."
              : "Item deleted successfully.");

      setSuccessMessage(msg);
      setItemToDelete(null);
      setForceDelete(false);

      // Refresh catalog in background
      await fetchData();
    } catch (err: any) {
      setDeleteError(
        lang === "gu" && err.messageGujarati
          ? err.messageGujarati
          : err.message || "Failed to delete item."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    setDeleteError(null);
    try {
      const idsArray = Array.from(selectedIds);
      const res: any = await apiClient.post("/items/bulk-delete", {
        ids: idsArray,
        force: bulkForceDelete,
      });

      const deletedSet = new Set(idsArray);
      setItems((prev) => prev.filter((it) => !deletedSet.has(it.id)));
      setSelectedIds(new Set());
      setIsBulkDeleteModalOpen(false);
      setBulkForceDelete(false);

      const msg =
        lang === "gu" && res?.messageGujarati
          ? res.messageGujarati
          : res?.message ||
            (lang === "gu"
              ? `${idsArray.length} વસ્તુઓ સફળતાપૂર્વક કાઢી નાખવામાં આવી.`
              : `${idsArray.length} items deleted successfully.`);

      setSuccessMessage(msg);
      await fetchData();
    } catch (err: any) {
      setDeleteError(
        lang === "gu" && err.messageGujarati
          ? err.messageGujarati
          : err.message || "Failed to delete selected items."
      );
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const displayItems = useMemo(() => {
    return items.filter((it) => {
      if (typeFilter !== "ALL" && it.type !== typeFilter) return false;
      if (statusFilter === "ACTIVE" && !it.isActive) return false;
      if (statusFilter === "INACTIVE" && it.isActive) return false;
      return true;
    });
  }, [items, typeFilter, statusFilter]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(displayItems.map((it) => it.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const isAllSelected =
    displayItems.length > 0 &&
    displayItems.every((it) => selectedIds.has(it.id));
  const isSomeSelected =
    selectedIds.size > 0 && !isAllSelected;

  const itemColumns = useMemo<ColumnDef<Item>[]>(
    () => [
      {
        id: "select",
        header: (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={isAllSelected}
              ref={(el) => {
                if (el) el.indeterminate = isSomeSelected;
              }}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-[#F47721] focus:ring-[#F47721] cursor-pointer"
              title={lang === "gu" ? "બધા પસંદ કરો" : "Select All"}
            />
          </div>
        ),
        className: "w-10 text-center",
        cell: (it) => (
          <div
            className="flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={selectedIds.has(it.id)}
              onChange={() => handleToggleSelect(it.id)}
              className="w-4 h-4 rounded border-slate-300 text-[#F47721] focus:ring-[#F47721] cursor-pointer"
            />
          </div>
        ),
      },
      {
        id: "name",
        header: lang === "gu" ? "વસ્તુનું નામ" : "Item Name",
        accessorKey: "name",
        sortable: true,
        cell: (it) => (
          <div className="font-semibold text-slate-900">
            <div>{it.name}</div>
            {it.nameGujarati && (
              <div className="text-[11px] font-normal text-slate-500">
                {it.nameGujarati}
              </div>
            )}
          </div>
        ),
      },
      {
        id: "type",
        header: lang === "gu" ? "પ્રકાર" : "Type",
        accessorKey: "type",
        sortable: true,
        cell: (it) => (
          <Badge variant={it.type === "PRODUCT" ? "info" : "purple"}>
            {it.type}
          </Badge>
        ),
      },
      {
        id: "sku",
        header: lang === "gu" ? "એસકેયુ / બારકોડ" : "SKU / Barcode",
        accessorFn: (it) => it.barcode || it.sku || "—",
        sortable: true,
        className: "font-mono text-slate-600",
        cell: (it) => {
          const code = it.barcode || it.sku;
          if (!code) return <span className="text-slate-400">—</span>;
          return (
            <div className="inline-flex items-center gap-1.5">
              <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {code}
              </span>
              <button
                type="button"
                id={`barcode-btn-${it.id}`}
                onClick={() => setBarcodeModalItem(it)}
                className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors cursor-pointer text-xs"
                title={lang === "gu" ? "બારકોડ સ્ટીકર જુઓ / પ્રિન્ટ કરો" : "View / Print Barcode Sticker"}
              >
                🏷️
              </button>
            </div>
          );
        },
      },
      {
        id: "hsnCode",
        header: lang === "gu" ? "એચએસએન (HSN/SAC)" : "HSN/SAC",
        accessorKey: "hsnCode",
        sortable: true,
        className: "font-mono font-medium text-slate-800",
      },
      {
        id: "batches",
        header: lang === "gu" ? "બેચ ટ્રેકિંગ" : "Batches",
        cell: (it) =>
          it.type === "PRODUCT" ? (
            it.trackBatches ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                ✓ {lang === "gu" ? "સક્રિય" : "Enabled"}
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500">
                ✕ {lang === "gu" ? "નિષ્ક્રિય" : "Off"}
              </span>
            )
          ) : (
            <span className="text-[11px] text-slate-400 italic">N/A</span>
          ),
      },
      {
        id: "stock",
        header: lang === "gu" ? "સ્ટોક જથ્થો" : "Stock Qty",
        sortable: true,
        accessorFn: (it) => (it.type === "PRODUCT" ? Number(it.currentStock || 0) : -1),
        className: "text-center",
        cell: (it) => {
          if (it.type === "SERVICE") {
            return <span className="text-slate-400 text-xs font-mono">—</span>;
          }
          const stock = Number(it.currentStock || 0);
          const min = Number(it.minStockLevel || 0);
          const uom = it.primaryUom?.code || it.primaryUom?.symbol || "";
          const isLow = stock <= min;

          return (
            <span
              className={`inline-flex items-center gap-1 font-mono text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                isLow
                  ? "bg-amber-50 text-amber-700 border-amber-300"
                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
              }`}
              title={isLow ? `Low stock alert! (Min level: ${min})` : `In stock`}
            >
              {isLow && <span className="text-[10px]">⚠️</span>}
              {stock} {uom}
            </span>
          );
        },
      },
      {
        id: "taxRate",
        header: lang === "gu" ? "જીએસટી દર" : "GST Rate",
        accessorKey: "taxRate",
        sortable: true,
        cell: (it) => (
          <span className="inline-block bg-slate-100 font-mono font-semibold px-2 py-0.5 rounded text-slate-700">
            {it.taxRate}%
          </span>
        ),
      },
      {
        id: "retailPrice",
        header: lang === "gu" ? "વેચાણ ભાવ (₹)" : "Retail Price (₹)",
        accessorKey: "retailPrice",
        sortable: true,
        className: "text-right font-mono font-bold text-slate-900",
        cell: (it) => `₹${Number(it.retailPrice).toFixed(2)}`,
      },
      {
        id: "purchaseRate",
        header: lang === "gu" ? "ખરીદ ભાવ (₹)" : "Purchase Rate (₹)",
        accessorKey: "purchaseRate",
        sortable: true,
        className: "text-right font-mono text-slate-600",
        cell: (it) => `₹${Number(it.purchaseRate || 0).toFixed(2)}`,
      },
      {
        id: "status",
        header: lang === "gu" ? "સ્થિતિ" : "Status",
        accessorKey: "isActive",
        sortable: true,
        cell: (it) => <StatusBadge status={it.isActive ? "ACTIVE" : "INACTIVE"} />,
      },
      {
        id: "actions",
        header: lang === "gu" ? "ક્રિયાઓ" : "Actions",
        className: "text-center",
        cell: (it) => (
          <div className="inline-flex items-center justify-center gap-1.5">
            <button
              onClick={() => handleOpenEditModal(it)}
              className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors inline-flex items-center gap-1 cursor-pointer"
              title="Edit Item"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>{lang === "gu" ? "સુધારો" : "Edit"}</span>
            </button>
            <button
              onClick={() => setItemToDelete(it)}
              className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors inline-flex items-center gap-1 cursor-pointer"
              title="Delete Item"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>{lang === "gu" ? "કાઢી નાખો" : "Delete"}</span>
            </button>
          </div>
        ),
      },
    ],
    [lang, selectedIds, isAllSelected, isSomeSelected]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E7EB] shadow-subtle">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-[1.75rem] font-bold text-[#202124] tracking-tight leading-tight">
            {lang === "gu"
              ? "વસ્તુઓની યાદી (Item Catalog)"
              : "Products & Item Catalog"}
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] mt-1 leading-relaxed break-words font-normal">
            {lang === "gu"
              ? "તમામ ઉત્પાદનો, સેવાઓ, બેચ ટ્રેકિંગ, એચએસએન કોડ અને જીએસટી દરોનું સંચાલન"
              : "Manage products, services, batch tracking, HSN/SAC codes, tax rates, and prices"}
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
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
          <span>{lang === "gu" ? "નવી વસ્તુ ઉમેરો" : "Add New Item"}</span>
        </button>
      </div>

      {successMessage && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium rounded-xl shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 font-bold text-base">✓</span>
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 text-sm font-bold ml-3 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-xs text-rose-700 font-medium rounded-xl">
          {error}
        </div>
      )}

      {/* Bulk Actions Floating Bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 bg-amber-50/95 border border-amber-200 text-amber-950 rounded-2xl shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {selectedIds.size}
            </span>
            <span className="text-xs sm:text-sm font-semibold">
              {lang === "gu"
                ? `${selectedIds.size} વસ્તુઓ પસંદ કરેલ છે`
                : `${selectedIds.size} item${selectedIds.size > 1 ? "s" : ""} selected`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/70 rounded-xl transition-colors cursor-pointer"
            >
              {lang === "gu" ? "પસંદગી રદ કરો" : "Deselect All"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDeleteError(null);
                setBulkForceDelete(false);
                setIsBulkDeleteModalOpen(true);
              }}
              className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-sm inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>
                {lang === "gu"
                  ? `પસંદ કરેલ કાઢી નાખો (${selectedIds.size})`
                  : `Delete Selected (${selectedIds.size})`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Items Catalog DataTable */}
      <DataTable<Item>
        data={displayItems}
        columns={itemColumns}
        keyExtractor={(it) => it.id}
        searchPlaceholder={
          lang === "gu"
            ? "વસ્તુનું નામ, એસકેયુ અથવા એચએસએન કોડ દ્વારા શોધો..."
            : "Search by item name, SKU, or HSN code..."
        }
        searchKeys={["name", "sku", "barcode", "hsnCode"]}
        customSearchFn={(it, q) =>
          Boolean(
            it.name.toLowerCase().includes(q) ||
              (it.nameGujarati && it.nameGujarati.toLowerCase().includes(q)) ||
              (it.sku && it.sku.toLowerCase().includes(q)) ||
              (it.barcode && it.barcode.toLowerCase().includes(q)) ||
              (it.hsnCode && it.hsnCode.includes(q))
          )
        }
        isLoading={isLoading}
        lang={lang}
        themeColor="saffron"
        exportable
        exportFileName="items_catalog"
        filtersSlot={
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs bg-[#F8F9FB] border border-[#E5E7EB] text-[#202124] rounded-xl px-3 py-1.5 font-semibold focus:outline-none focus:bg-white cursor-pointer"
            >
              <option value="ALL">
                {lang === "gu" ? "તમામ પ્રકાર (All Types)" : "All Types"}
              </option>
              <option value="PRODUCT">
                {lang === "gu" ? "ઉત્પાદન (Product)" : "Products"}
              </option>
              <option value="SERVICE">
                {lang === "gu" ? "સેવા (Service)" : "Services"}
              </option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-[#F8F9FB] border border-[#E5E7EB] text-[#202124] rounded-xl px-3 py-1.5 font-semibold focus:outline-none focus:bg-white cursor-pointer"
            >
              <option value="ALL">
                {lang === "gu" ? "તમામ સ્થિતિ (All Statuses)" : "All Statuses"}
              </option>
              <option value="ACTIVE">
                {lang === "gu" ? "સક્રિય (Active Only)" : "Active Only"}
              </option>
              <option value="INACTIVE">
                {lang === "gu" ? "નિષ્ક્રિય / આર્કાઇવ (Archived)" : "Inactive / Archived"}
              </option>
            </select>
          </div>
        }
        mobileCardRender={(it) => (
          <div key={it.id} className="p-3.5 hover:bg-slate-50 transition-colors space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <input
                  type="checkbox"
                  checked={selectedIds.has(it.id)}
                  onChange={() => handleToggleSelect(it.id)}
                  className="w-4 h-4 rounded border-slate-300 text-[#F47721] focus:ring-[#F47721] cursor-pointer shrink-0"
                />
                <span className="font-semibold text-slate-900 text-sm truncate">{it.name}</span>
              </div>
              <Badge variant={it.type === "PRODUCT" ? "info" : "purple"}>{it.type}</Badge>
            </div>
            {it.nameGujarati && <p className="text-xs text-slate-500">{it.nameGujarati}</p>}
            <div className="flex items-center justify-between text-xs text-slate-600 font-mono">
              <span>SKU: {it.sku || it.barcode || "—"}</span>
              <span>HSN: {it.hsnCode}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">
                  {lang === "gu" ? "વેચાણ ભાવ" : "Retail Price"}
                </span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{Number(it.retailPrice).toFixed(2)}
                </span>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-slate-500 uppercase block">
                  {lang === "gu" ? "સ્ટોક" : "Stock"}
                </span>
                <span
                  className={`font-mono font-bold text-xs ${
                    it.type === "SERVICE"
                      ? "text-slate-400"
                      : Number(it.currentStock || 0) <= Number(it.minStockLevel || 0)
                      ? "text-amber-600"
                      : "text-emerald-700"
                  }`}
                >
                  {it.type === "SERVICE"
                    ? "—"
                    : `${Number(it.currentStock || 0)} ${it.primaryUom?.code || it.primaryUom?.symbol || ""}`}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase block">
                  {lang === "gu" ? "જીએસટી" : "Tax"}
                </span>
                <span className="font-mono font-semibold text-slate-700">{it.taxRate}%</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleOpenEditModal(it)}
                className="px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer"
              >
                {lang === "gu" ? "સુધારો" : "Edit"}
              </button>
              <button
                type="button"
                onClick={() => setItemToDelete(it)}
                className="px-3 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer"
              >
                {lang === "gu" ? "કાઢી નાખો" : "Delete"}
              </button>
            </div>
          </div>
        )}
      />

      {/* Create Item Step Form Modal matching Screencast Video */}
      <ItemStepModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateItemStep}
        units={units}
        categories={categories}
        warehouses={warehouses}
        companyName={currentCompany?.tradeName || currentCompany?.legalName || "MyBill History"}
        lang={lang}
        onAddCategory={handleAddNewCategory}
      />

      {/* Edit Item Step Form Modal */}
      <ItemStepModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleUpdateItemStep}
        initialData={editInitialData}
        isEditMode={true}
        units={units}
        categories={categories}
        warehouses={warehouses}
        companyName={currentCompany?.tradeName || currentCompany?.legalName || "MyBill History"}
        lang={lang}
        onAddCategory={handleAddNewCategory}
      />

      {/* Barcode Sticker Preview Modal (from Table Row or Barcode action) */}
      <ItemBarcodeModal
        isOpen={!!barcodeModalItem}
        onClose={() => setBarcodeModalItem(null)}
        barcode={barcodeModalItem?.barcode || barcodeModalItem?.sku || ""}
        itemName={
          (lang === "gu" && barcodeModalItem?.nameGujarati)
            ? barcodeModalItem.nameGujarati
            : barcodeModalItem?.name || ""
        }
        salesPrice={Number(barcodeModalItem?.retailPrice) || 0}
        companyName={currentCompany?.tradeName || currentCompany?.legalName || "MyBill History"}
        lang={lang}
      />

      {/* Delete Item Confirmation Modal */}
      <Modal
        isOpen={!!itemToDelete}
        onClose={() => {
          if (!isDeleting) {
            setItemToDelete(null);
            setDeleteError(null);
          }
        }}
        title={lang === "gu" ? "વસ્તુ કાઢી નાખવાની ખાતરી" : "Confirm Delete Item"}
        titleGujarati={itemToDelete ? `${itemToDelete.name}` : ""}
        maxWidth="sm"
      >
        <div className="space-y-4">
          {deleteError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
              {deleteError}
            </div>
          )}

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-900">{itemToDelete?.name}</span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  itemToDelete?.isActive
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {itemToDelete?.isActive ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>
            {itemToDelete?.nameGujarati && (
              <p className="text-[11px] text-slate-500">{itemToDelete.nameGujarati}</p>
            )}
            <div className="text-[11px] text-slate-500 font-mono flex gap-3">
              <span>{itemToDelete?.type}</span>
              {itemToDelete?.sku && <span>SKU: {itemToDelete.sku}</span>}
              {itemToDelete?.hsnCode && <span>HSN: {itemToDelete.hsnCode}</span>}
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {lang === "gu"
              ? itemToDelete?.isActive === false
                ? `આ વસ્તુ હાલમાં નિષ્ક્રિય છે. "હા, કાઢી નાખો" દબાવવાથી તે ડેટાબેઝમાંથી કાયમ માટે કાઢી નાખવામાં આવશે.`
                : `શું તમે ખરેખર "${itemToDelete?.name}" વસ્તુને કાઢી નાખવા માંગો છો? જો આ વસ્તુ કોઈ બિલમાં વપરાયેલ હશે, તો તે સલામત રીતે આર્કાઇવ થશે.`
              : itemToDelete?.isActive === false
                ? `This item is currently inactive. Confirming delete will permanently remove it from the catalog.`
                : `Are you sure you want to delete "${itemToDelete?.name}"? If unused in bills, it will be permanently removed. If used in invoices, it will be safely archived.`}
          </p>

          <label className="flex items-start gap-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={forceDelete}
              onChange={(e) => setForceDelete(e.target.checked)}
              className="w-4 h-4 mt-0.5 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
            />
            <div>
              <span className="text-xs font-semibold text-rose-700 block">
                {lang === "gu"
                  ? "કાયમ માટે કાઢી નાખો (Force Permanent Delete)"
                  : "Permanently delete & remove from database"}
              </span>
              <span className="text-[11px] text-slate-500 block">
                {lang === "gu"
                  ? "ટેસ્ટ વાઉચર્સ અને રેકોર્ડ્સ સાથેની લિંક સાફ કરી સંપૂર્ણપણે દૂર કરો."
                  : "Purges linked test line items so that item is completely wiped from system."}
              </span>
            </div>
          </label>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => {
                setItemToDelete(null);
                setDeleteError(null);
                setForceDelete(false);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteItem}
              disabled={isDeleting}
              className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 rounded-lg shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>{lang === "gu" ? "કાઢી રહ્યું છે..." : "Deleting..."}</span>
                </>
              ) : (
                <span>{lang === "gu" ? "હા, કાઢી નાખો" : "Confirm Delete"}</span>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => {
          if (!isBulkDeleting) {
            setIsBulkDeleteModalOpen(false);
            setDeleteError(null);
          }
        }}
        title={lang === "gu" ? "પસંદ કરેલ વસ્તુઓ કાઢી નાખવાની ખાતરી" : "Confirm Bulk Delete Items"}
        maxWidth="sm"
      >
        <div className="space-y-4">
          {deleteError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
              {deleteError}
            </div>
          )}

          <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
              <svg className="w-5 h-5 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>
                {lang === "gu"
                  ? `તમે ${selectedIds.size} વસ્તુઓ કાઢી નાખવા માટે પસંદ કરી છે.`
                  : `You have selected ${selectedIds.size} item${selectedIds.size > 1 ? "s" : ""} to delete.`}
              </span>
            </div>
            <p className="text-xs text-rose-700/90 leading-relaxed pl-7">
              {lang === "gu"
                ? `પસંદ કરેલી આઇટમ્સ કેટલોગમાંથી દૂર થશે. જો કોઈ આઇટમ બિલમાં વપરાયેલ હશે તો તે સુરક્ષિત રીતે આર્કાઇવ થશે.`
                : `Selected items will be removed from your catalog. Items used in billing records will be safely archived.`}
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={bulkForceDelete}
                onChange={(e) => setBulkForceDelete(e.target.checked)}
                className="w-4 h-4 mt-0.5 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  {lang === "gu"
                    ? "કાયમ માટે કાઢી નાખો (Force Permanent Delete)"
                    : "Force Permanent Delete & Purge"}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {lang === "gu"
                    ? "ટેસ્ટ વાઉચર્સ સાથેની લિંક સાફ કરી ડેટાબેઝમાંથી સંપૂર્ણ સાફ કરો."
                    : "Purges linked test line items so that test/junk items are 100% wiped from the database."}
                </span>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={isBulkDeleting}
              onClick={() => {
                setIsBulkDeleteModalOpen(false);
                setDeleteError(null);
                setBulkForceDelete(false);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 rounded-lg shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
            >
              {isBulkDeleting ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>{lang === "gu" ? "કાઢી રહ્યું છે..." : "Deleting..."}</span>
                </>
              ) : (
                <span>
                  {lang === "gu"
                    ? `હા, પસંદ કરેલ ${selectedIds.size} કાઢી નાખો`
                    : `Confirm Delete (${selectedIds.size})`}
                </span>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
