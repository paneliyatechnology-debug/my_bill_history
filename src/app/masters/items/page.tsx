"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";
import { Modal } from "../../../components/ui/modal";
import { Badge } from "../../../components/ui/badge";
import { DataTable, ColumnDef } from "../../../components/ui/data-table";
import { ItemStepModal, ItemFormData, PartyOption } from "./components/item-step-modal";
import { ItemBarcodeModal } from "./components/item-barcode-modal";
import { AdjustStockModal } from "./components/adjust-stock-modal";
import { getItemPartyPrices, setItemPartyPrices } from "../../../lib/party-item-pricing";
import { ImportWizardModal } from "../../../components/imports/import-wizard-modal";
import { ImportModuleType } from "@billing/shared-types";

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

function ItemActionMenu({
  item,
  isOpen,
  openUpward,
  onToggle,
  onClose,
  lang,
  onEdit,
  onAdjustStock,
  onBarcode,
  onDelete,
}: {
  item: Item;
  isOpen: boolean;
  openUpward: boolean;
  onToggle: (shouldOpenUp: boolean) => void;
  onClose: () => void;
  lang: "en" | "gu";
  onEdit: () => void;
  onAdjustStock: () => void;
  onBarcode: () => void;
  onDelete: () => void;
}) {
  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isOpen) {
      onClose();
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const spaceBelowViewport = window.innerHeight - rect.bottom;
      const spaceAboveViewport = rect.top;

      const table = e.currentTarget.closest("table");
      const tableRect = table?.getBoundingClientRect();
      const spaceBelowTable = tableRect ? tableRect.bottom - rect.bottom : 999;
      const spaceAboveTable = tableRect ? rect.top - tableRect.top : 999;

      // Menu is ~180px tall. If space below in viewport is tight (< 220px) OR space below in table is tight (< 190px),
      // and we have sufficient space above (either in table >= 160 or in viewport >= 220), open UPWARD.
      const shouldOpenUp =
        (spaceBelowViewport < 220 || spaceBelowTable < 190) &&
        (spaceAboveTable >= 160 || spaceAboveViewport >= 220);

      onToggle(shouldOpenUp);
    }
  };

  return (
    <div
      data-action-menu="true"
      className={`relative inline-block text-left ${isOpen ? "z-30" : ""}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={handleToggle}
        className={`w-8 h-8 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer text-base font-bold ${
          isOpen ? "bg-slate-100 text-slate-800 shadow-2xs" : ""
        }`}
        title="Options"
      >
        ⋮
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 ${
            openUpward
              ? "bottom-full mb-1 origin-bottom-right"
              : "top-full mt-1 origin-top-right"
          } w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 text-xs divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit();
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 cursor-pointer font-medium transition-colors"
            >
              <span className="text-slate-500">✏️</span>
              <span>{lang === "gu" ? "સુધારો (Edit)" : "Edit Item"}</span>
            </button>
            {item.type === "PRODUCT" && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAdjustStock();
                }}
                className="w-full text-left px-3 py-2 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 flex items-center gap-2 cursor-pointer font-medium transition-colors"
              >
                <span className="text-indigo-600">📦</span>
                <span>{lang === "gu" ? "સ્ટોક એડજસ્ટ કરો" : "Adjust Stock"}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onClose();
                onBarcode();
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 cursor-pointer font-medium transition-colors"
            >
              <span className="text-slate-500">🏷️</span>
              <span>{lang === "gu" ? "બારકોડ સ્ટીકર" : "Barcode Sticker"}</span>
            </button>
          </div>
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onDelete();
              }}
              className="w-full text-left px-3 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer font-medium transition-colors"
            >
              <span>🗑️</span>
              <span>{lang === "gu" ? "કાઢી નાખો" : "Delete"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


export default function ItemsPage() {
  const { lang, tenantContext, currentCompany } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [parties, setParties] = useState<PartyOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE");
  const [showPromoBanner, setShowPromoBanner] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [isBulkMenuOpen, setIsBulkMenuOpen] = useState(false);

  // Modals & Action States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [adjustStockItem, setAdjustStockItem] = useState<Item | null>(null);
  const [barcodeModalItem, setBarcodeModalItem] = useState<Item | null>(null);
  const [activeActionMenu, setActiveActionMenu] = useState<{ id: string; openUp: boolean } | null>(null);

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

  // Close row action dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-action-menu="true"]')) {
        return;
      }
      setActiveActionMenu(null);
      setIsBulkMenuOpen(false);
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

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
      const [itemsRes, unitsRes, catsRes, whRes, partiesRes]: any = await Promise.all([
        apiClient.get("/masters/items", {
          search: searchTerm || undefined,
          type: typeFilter !== "ALL" ? typeFilter : undefined,
        }),
        apiClient.get("/masters/units"),
        apiClient.get("/masters/categories"),
        apiClient.get("/masters/warehouses").catch(() => []),
        apiClient.get("/masters/parties").catch(() => []),
      ]);

      setItems(extractList(itemsRes));
      setUnits(extractList(unitsRes));
      setCategories(extractList(catsRes));
      setWarehouses(extractList(whRes));
      setParties(extractList(partiesRes));
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

    const createdRes: any = await apiClient.post("/masters/items", {
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
      minStockLevel: data.enableLowStockWarning ? (Number(data.minStockLevel) || 0) : 0,
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

    const createdItem = createdRes?.data || createdRes;
    if (createdItem?.id && data.partyWisePrices && data.partyWisePrices.length > 0) {
      setItemPartyPrices(createdItem.id, data.partyWisePrices, data.name);
    }

    setIsModalOpen(false);
    setSuccessMessage(
      lang === "gu"
        ? "આઇટમ સફળતાપૂર્વક સાચવવામાં આવી છે!"
        : "Item created successfully!"
    );
    await fetchData();
  };

  const handleOpenEditModal = (item: Item) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const editInitialData = useMemo<Partial<ItemFormData> | undefined>(() => {
    if (!editingItem) return undefined;
    const defaultWh =
      warehouses.find((w) => w.isDefault)?.id || warehouses[0]?.id || "";
    return {
      id: editingItem.id,
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
      openingStock:
        editingItem.currentStock !== undefined
          ? Number(editingItem.currentStock)
          : 0,
      asOfDate: new Date().toISOString().split("T")[0],
      warehouseId: defaultWh,
      minStockLevel: Number(editingItem.minStockLevel ?? 10),
      enableLowStockWarning: Number(editingItem.minStockLevel || 0) > 0,
      trackBatches: Boolean(editingItem.trackBatches),
      trackSerialNo: Boolean(editingItem.trackSerialNo),
      isActive: editingItem.isActive !== false,
      partyWisePrices: getItemPartyPrices(editingItem.id),
    };
  }, [editingItem, units, warehouses]);

  const handleUpdateItemStep = async (data: ItemFormData) => {
    if (!editingItem) return;

    await apiClient.put(`/masters/items/${editingItem.id}`, {
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
      openingStock:
        data.openingStock !== undefined && data.openingStock !== ""
          ? Number(data.openingStock)
          : undefined,
      openingStockDate: data.asOfDate || undefined,
      warehouseId: data.warehouseId || undefined,
      minStockLevel: data.enableLowStockWarning ? (Number(data.minStockLevel) || 0) : 0,
      trackBatches: data.type === "PRODUCT" ? Boolean(data.trackBatches) : false,
      trackSerialNo: Boolean(data.trackSerialNo),
      isActive: Boolean(data.isActive),
    });

    if (data.partyWisePrices) {
      setItemPartyPrices(editingItem.id, data.partyWisePrices, editingItem.name);
    }

    setIsEditModalOpen(false);
    setEditingItem(null);
    setSuccessMessage(
      lang === "gu"
        ? "આઇટમ અને સ્ટોક સફળતાપૂર્વક સુધારવામાં આવી છે!"
        : "Item and stock updated successfully!"
    );
    await fetchData();
  };

  const handleAddNewCategory = async (catName: string) => {
    const res: any = await apiClient.post("/masters/categories", {
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
        `/items/${itemToDelete.id}?force=${shouldForce ? "true" : "false"}`
      );

      setItems((prev) => prev.filter((it) => it.id !== itemToDelete.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(itemToDelete.id);
        return next;
      });

      const msg =
        lang === "gu" && res?.messageGujarati
          ? res.messageGujarati
          : res?.message ||
            (lang === "gu"
              ? "આઇટમ સફળતાપૂર્વક કાઢી નાખવામાં આવી."
              : "Item deleted successfully.");

      setSuccessMessage(msg);
      setItemToDelete(null);
      setForceDelete(false);
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
      const res: any = await apiClient.post("/masters/items/bulk-delete", {
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

  const totalStockValue = useMemo(() => {
    return items.reduce((acc, it) => {
      if (it.type !== "PRODUCT") return acc;
      const qty = Number(it.currentStock || 0);
      const rate = Number(it.purchaseRate || it.retailPrice || 0);
      return acc + (qty * rate);
    }, 0);
  }, [items]);

  const lowStockCount = useMemo(() => {
    return items.filter(
      (it) =>
        it.type === "PRODUCT" &&
        Number(it.minStockLevel || 0) > 0 &&
        Number(it.currentStock || 0) <= Number(it.minStockLevel || 0)
    ).length;
  }, [items]);

  const displayItems = useMemo(() => {
    return items.filter((it) => {
      if (typeFilter !== "ALL" && it.type !== typeFilter) return false;
      if (statusFilter === "ACTIVE" && !it.isActive) return false;
      if (statusFilter === "INACTIVE" && it.isActive) return false;
      if (categoryFilter !== "ALL" && it.categoryId !== categoryFilter) return false;
      if (
        lowStockOnly &&
        (it.type !== "PRODUCT" ||
          Number(it.minStockLevel || 0) === 0 ||
          Number(it.currentStock || 0) > Number(it.minStockLevel || 0))
      ) {
        return false;
      }
      return true;
    });
  }, [items, typeFilter, statusFilter, categoryFilter, lowStockOnly]);

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
  const isSomeSelected = selectedIds.size > 0 && !isAllSelected;

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
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
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
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
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
          <div
            className="cursor-pointer group py-1"
            onClick={() => handleOpenEditModal(it)}
          >
            <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
              {it.name}
            </div>
            {it.nameGujarati && (
              <div className="text-[11px] font-normal text-slate-500">
                {it.nameGujarati}
              </div>
            )}
          </div>
        ),
      },
      {
        id: "sku",
        header: lang === "gu" ? "આઇટમ કોડ" : "Item Code",
        accessorFn: (it) => it.sku || it.barcode || "-",
        sortable: true,
        className: "font-mono text-slate-600",
        cell: (it) => {
          const code = it.sku || it.barcode;
          if (!code) return <span className="text-slate-400">-</span>;
          return <span className="font-mono text-xs text-slate-700">{code}</span>;
        },
      },
      {
        id: "stock",
        header: lang === "gu" ? "સ્ટોક જથ્થો" : "Stock QTY",
        sortable: true,
        accessorFn: (it) => (it.type === "PRODUCT" ? Number(it.currentStock || 0) : -1),
        cell: (it) => {
          if (it.type === "SERVICE") {
            return <span className="text-slate-400 font-mono">-</span>;
          }
          const stock = Number(it.currentStock || 0);
          const min = Number(it.minStockLevel || 0);
          const uom = (
            it.primaryUom?.code ||
            it.primaryUom?.symbol ||
            "PCS"
          ).toUpperCase();
          const isLow = min > 0 && stock <= min;

          return (
            <div className="inline-flex items-center gap-1.5 font-medium text-xs">
              <span
                className={`font-mono ${
                  isLow ? "text-amber-600 font-bold" : "text-slate-800 font-semibold"
                }`}
              >
                {stock} {uom}
              </span>
              {isLow && (
                <span
                  className="text-[10px] text-amber-500 font-bold"
                  title={`Low stock alert (Min: ${min} ${uom})`}
                >
                  ⚠️
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: "retailPrice",
        header: lang === "gu" ? "વેચાણ ભાવ" : "Selling Price",
        accessorKey: "retailPrice",
        sortable: true,
        cell: (it) => {
          const price = Number(it.retailPrice);
          if (!price) return <span className="text-slate-400">-</span>;
          return (
            <span className="font-mono text-xs font-semibold text-slate-800">
              ₹ {price.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
          );
        },
      },
      {
        id: "purchaseRate",
        header: lang === "gu" ? "ખરીદ ભાવ" : "Purchase Price",
        accessorKey: "purchaseRate",
        sortable: true,
        cell: (it) => {
          const price = Number(it.purchaseRate);
          if (!price) return <span className="text-slate-400">-</span>;
          return (
            <span className="font-mono text-xs font-semibold text-slate-800">
              ₹ {price.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        className: "w-12 text-center",
        cell: (it) => {
          const isOpen = activeActionMenu?.id === it.id;
          const openUpward = Boolean(isOpen && activeActionMenu?.openUp);
          return (
            <ItemActionMenu
              item={it}
              isOpen={isOpen}
              openUpward={openUpward}
              onToggle={(shouldOpenUp) =>
                setActiveActionMenu(
                  isOpen ? null : { id: it.id, openUp: shouldOpenUp }
                )
              }
              onClose={() => setActiveActionMenu(null)}
              lang={lang}
              onEdit={() => handleOpenEditModal(it)}
              onAdjustStock={() => setAdjustStockItem(it)}
              onBarcode={() => setBarcodeModalItem(it)}
              onDelete={() => setItemToDelete(it)}
            />
          );
        },
      },
    ],
    [
      lang,
      selectedIds,
      isAllSelected,
      isSomeSelected,
      activeActionMenu,
    ]
  );

  return (
    <div className="space-y-4">
      {/* ============================================================ */}
      {/* 1. TOP HEADER BAR matching MyBillBook                         */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          {lang === "gu" ? "વસ્તુઓ (Items)" : "Items"}
        </h1>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPromoBanner(!showPromoBanner)}
            className="px-3 py-1.5 border border-indigo-600 text-indigo-600 hover:bg-indigo-50 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>🚫</span>
            <span>{lang === "gu" ? "ઑફર્સ મેનેજ કરો" : "Manage Offer"}</span>
          </button>
          <button
            type="button"
            onClick={() => alert("Items Reports: Stock Summary, Item Sales, Low Stock Report")}
            className="px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>📊</span>
            <span>{lang === "gu" ? "રિપોર્ટ્સ" : "Reports"}</span>
            <span className="text-[10px]">▼</span>
          </button>
          <button
            type="button"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 cursor-pointer"
            title="Settings"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            type="button"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 cursor-pointer"
            title="Full view"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium rounded-xl shadow-xs">
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

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
          {error}
        </div>
      )}

      {/* Promo Offer Banner */}
      {showPromoBanner && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎁</span>
            <div>
              <p className="font-bold text-slate-900 text-xs sm:text-sm">
                {lang === "gu" ? "તમારા માલ પર ઑફર્સ અને ડિસ્કાઉન્ટ સ્કીમ શરૂ કરો" : "Launch Offers on Your Items"}
              </p>
              <p className="text-[11px] sm:text-xs text-slate-600">
                {lang === "gu" ? "ગ્રાહકોને આકર્ષવા માટે જથ્થાબંધ ડિસ્કાઉન્ટ અને સ્કીમ ભાવ સેટ કરો" : "Boost sales with volume discounts, seasonal prices and wholesale customer rates"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleOpenCreateModal()}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-lg border border-slate-200 shadow-2xs transition-all cursor-pointer"
            >
              Create Offer Now
            </button>
            <button
              onClick={() => setShowPromoBanner(false)}
              className="text-slate-400 hover:text-slate-600 p-1 text-sm rounded-lg cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. TOP STOCK KPI CARDS matching MyBillBook                   */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Stock Value Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <svg className="w-4 h-4 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span>{lang === "gu" ? "સ્ટોક કિંમત" : "Stock Value"}</span>
              <span className="cursor-help text-slate-400" title="Total stock valuation based on purchase rates">ⓘ</span>
            </div>
            <p className="text-2xl font-mono font-bold text-slate-900 mt-2">
              ₹ {totalStockValue.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
            </p>
          </div>
          <span className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer text-sm">↗</span>
        </div>

        {/* Low Stock Card */}
        <div
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className={`p-5 rounded-xl border shadow-xs flex items-center justify-between cursor-pointer transition-all ${
            lowStockOnly
              ? "bg-amber-50/60 border-amber-300 ring-2 ring-amber-400/40"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
              <span className="text-amber-500">📦</span>
              <span>{lang === "gu" ? "ઓછો સ્ટોક (Low Stock)" : "Low Stock"}</span>
            </div>
            <p className={`text-2xl font-mono font-bold mt-2 ${lowStockCount > 0 ? "text-amber-600" : "text-slate-900"}`}>
              {lowStockCount}
            </p>
          </div>
          <span className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer text-sm">↗</span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. ITEMS CATALOG DATA TABLE matching MyBillBook UI           */}
      {/* ============================================================ */}
      <DataTable<Item>
        data={displayItems}
        columns={itemColumns}
        keyExtractor={(it) => it.id}
        searchPlaceholder={
          lang === "gu"
            ? "સીરીયલ નંબર અથવા નામ દ્વારા શોધો..."
            : "Search by Serial No."
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
        themeColor="purple"
        exportable
        exportFileName="items_catalog"
        filtersSlot={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Dropdown */}
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs bg-white border border-slate-300 text-slate-700 rounded-lg px-3 py-1.5 font-medium focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer appearance-none pr-6 shadow-2xs"
              >
                <option value="ALL">Search Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-slate-400 text-[10px]">
                ▼
              </div>
            </div>

            {/* Low Stock Toggle Pill */}
            <button
              type="button"
              onClick={() => setLowStockOnly(!lowStockOnly)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                lowStockOnly
                  ? "bg-amber-100 text-amber-900 border-amber-300 font-bold"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span>📦</span>
              <span>Low Stock</span>
            </button>
          </div>
        }
        actionsSlot={
          <div className="flex items-center gap-2">
            {/* Bulk Actions Dropdown */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setIsBulkMenuOpen(!isBulkMenuOpen)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <span>🗂️</span>
                <span>Bulk Actions</span>
                <span className="text-[10px]">▼</span>
              </button>
              {isBulkMenuOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 text-xs divide-y divide-slate-100">
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsBulkMenuOpen(false);
                        handleSelectAll(true);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <span>✓</span> Select All Items
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsBulkMenuOpen(false);
                        handleSelectAll(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <span>✕</span> Deselect All
                    </button>
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsBulkMenuOpen(false);
                        if (selectedIds.size === 0) {
                          alert(lang === "gu" ? "કૃપા કરીને પહેલાં વસ્તુઓ પસંદ કરો" : "Please select items first");
                          return;
                        }
                        setIsBulkDeleteModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <span>🗑️</span> Delete Selected ({selectedIds.size})
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Import Excel Button */}
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>{lang === "gu" ? "એક્સેલ ઈમ્પોર્ટ" : "Import Excel"}</span>
            </button>

            {/* Create Item Button */}
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-1.5 bg-[#5c56df] hover:bg-[#4d47d4] text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>Create Item</span>
            </button>
          </div>
        }
        mobileCardRender={(it) => (
          <div key={it.id} className="p-3.5 hover:bg-slate-50 transition-colors space-y-2 border-b border-slate-100 last:border-b-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <input
                  type="checkbox"
                  checked={selectedIds.has(it.id)}
                  onChange={() => handleToggleSelect(it.id)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0 accent-indigo-600"
                />
                <span
                  onClick={() => handleOpenEditModal(it)}
                  className="font-semibold text-slate-900 text-sm truncate cursor-pointer hover:text-indigo-600"
                >
                  {it.name}
                </span>
              </div>
              <Badge variant={it.type === "PRODUCT" ? "info" : "purple"}>{it.type}</Badge>
            </div>
            {it.nameGujarati && <p className="text-xs text-slate-500">{it.nameGujarati}</p>}
            <div className="flex items-center justify-between text-xs text-slate-600 font-mono">
              <span>Code: {it.sku || it.barcode || "—"}</span>
              <span>HSN: {it.hsnCode}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">
                  {lang === "gu" ? "વેચાણ ભાવ" : "Selling Price"}
                </span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{Number(it.retailPrice).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="text-right">
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
                    : `${Number(it.currentStock || 0)} ${it.primaryUom?.code || it.primaryUom?.symbol || "PCS"}`}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              {it.type === "PRODUCT" && (
                <button
                  type="button"
                  onClick={() => setAdjustStockItem(it)}
                  className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg cursor-pointer flex items-center gap-1"
                >
                  <span>📦</span>
                  <span>Adjust</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleOpenEditModal(it)}
                className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer"
              >
                {lang === "gu" ? "સુધારો" : "Edit"}
              </button>
              <button
                type="button"
                onClick={() => setItemToDelete(it)}
                className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer"
              >
                {lang === "gu" ? "કાઢી નાખો" : "Delete"}
              </button>
            </div>
          </div>
        )}
      />

      {/* ============================================================ */}
      {/* 4. BOTTOM MIGRATION & BULK UPLOAD BANNER                     */}
      {/* ============================================================ */}
      <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-200/80 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-xl shrink-0 shadow-xs">
            📦
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">
              {lang === "gu" ? "એક સાથે ઘણી વસ્તુઓ ઉમેરો (Bulk Upload)" : "Add Multiple items at once"}
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              {lang === "gu"
                ? "પ્રોડક્ટ લાયબ્રેરી અથવા વ્યાપાર, ટેલી, માર્ગ અને બીઝી સોફ્ટવેર માંથી સીધો ડેટા ઇમ્પોર્ટ કરો"
                : "Bulk Upload items from Product Library or Other Software like Vyapar, Tally, Marg & Busy"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => alert("Product Library: 50,000+ FMCG, Grocery, Hardware & Pharmacy items ready to import!")}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>📚</span>
            <span>Product Library</span>
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>{lang === "gu" ? "એક્સેલ થી અપલોડ કરો" : "Upload Excel / CSV"}</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. CREATE ITEM STEP MODAL                                    */}
      {/* ============================================================ */}
      <ItemStepModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateItemStep}
        units={units}
        categories={categories}
        warehouses={warehouses}
        parties={parties}
        companyName={currentCompany?.tradeName || currentCompany?.legalName || "myownbillbook"}
        lang={lang}
        onAddCategory={handleAddNewCategory}
      />

      {/* ============================================================ */}
      {/* 6. EDIT ITEM STEP MODAL (Live Stock Sync)                    */}
      {/* ============================================================ */}
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
        parties={parties}
        companyName={currentCompany?.tradeName || currentCompany?.legalName || "myownbillbook"}
        lang={lang}
        onAddCategory={handleAddNewCategory}
      />

      {/* ============================================================ */}
      {/* 7. ADJUST STOCK MODAL matching MyBillBook                    */}
      {/* ============================================================ */}
      <AdjustStockModal
        isOpen={!!adjustStockItem}
        onClose={() => setAdjustStockItem(null)}
        item={adjustStockItem}
        warehouses={warehouses}
        onSuccess={async () => {
          await fetchData();
          setSuccessMessage(
            lang === "gu"
              ? "સ્ટોક જથ્થો સફળતાપૂર્વક સુધારવામાં આવ્યો છે!"
              : "Stock quantity adjusted successfully!"
          );
        }}
        lang={lang}
      />

      {/* ============================================================ */}
      {/* 8. BARCODE STICKER PREVIEW MODAL                             */}
      {/* ============================================================ */}
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
        companyName={currentCompany?.tradeName || currentCompany?.legalName || "myownbillbook"}
        lang={lang}
      />

      {/* ============================================================ */}
      {/* 9. DELETE ITEM CONFIRMATION MODAL                            */}
      {/* ============================================================ */}
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

      {/* ============================================================ */}
      {/* 10. BULK DELETE CONFIRMATION MODAL                           */}
      {/* ============================================================ */}
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

      {/* Excel / CSV Import Wizard Modal */}
      <ImportWizardModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        preselectedModule={ImportModuleType.ITEMS}
        onSuccess={fetchData}
      />
    </div>
  );
}
