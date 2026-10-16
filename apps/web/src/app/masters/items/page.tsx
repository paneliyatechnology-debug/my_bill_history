"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";
import { Modal } from "../../../components/ui/modal";
import { Badge, StatusBadge } from "../../../components/ui/badge";
import { HsnSelector } from "../../../components/ui/hsn-selector";
import { DataTable, ColumnDef } from "../../../components/ui/data-table";

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
  minStockLevel?: number;
  currentStock?: number;
  trackBatches?: boolean;
  trackSerialNo?: boolean;
  isActive: boolean;
  categoryId?: string | null;
  primaryUomId?: string;
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
  const { lang, tenantContext } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editFormData, setEditFormData] = useState({
    type: "PRODUCT" as "PRODUCT" | "SERVICE",
    name: "",
    nameGujarati: "",
    sku: "",
    barcode: "",
    hsnCode: "1006",
    primaryUomId: "",
    categoryId: "",
    taxRate: 5,
    retailPrice: 100,
    mrp: 100,
    purchaseRate: 80,
    minStockLevel: 10,
    trackBatches: false,
    isActive: true,
  });

  // Delete Confirmation Modal
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create Form State
  const [formData, setFormData] = useState({
    type: "PRODUCT" as "PRODUCT" | "SERVICE",
    name: "",
    nameGujarati: "",
    sku: "",
    barcode: "",
    hsnCode: "1006",
    primaryUomId: "",
    categoryId: "",
    taxRate: 5,
    retailPrice: 100,
    mrp: 100,
    purchaseRate: 80,
    minStockLevel: 10,
    openingStock: 0,
    warehouseId: "",
    openingBatchNumber: "",
    openingExpiryDate: "",
    openingMfgDate: "",
    trackBatches: false,
  });

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
    const defaultWh =
      warehouses.find((w) => w.isDefault)?.id || warehouses[0]?.id || "";
    setFormData({
      type: "PRODUCT",
      name: "",
      nameGujarati: "",
      sku: "",
      barcode: "",
      hsnCode: "1006",
      primaryUomId: units[0]?.id || "",
      categoryId: categories[0]?.id || "",
      taxRate: 5,
      retailPrice: 100,
      mrp: 100,
      purchaseRate: 80,
      minStockLevel: 10,
      openingStock: 0,
      warehouseId: defaultWh,
      openingBatchNumber: "",
      openingExpiryDate: "",
      openingMfgDate: "",
      trackBatches: false,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      let uomId = formData.primaryUomId;
      if (!uomId && units.length > 0) {
        uomId = units[0].id;
      }

      await apiClient.post("/items", {
        type: formData.type,
        name: formData.name,
        nameGujarati: formData.nameGujarati || undefined,
        sku: formData.sku || undefined,
        barcode: formData.barcode || undefined,
        hsnCode: formData.hsnCode,
        primaryUomId: uomId,
        categoryId: formData.categoryId || undefined,
        taxRate: Number(formData.taxRate) || 0,
        retailPrice: Number(formData.retailPrice) || 0,
        mrp: Number(formData.mrp) || Number(formData.retailPrice) || 0,
        purchaseRate: Number(formData.purchaseRate) || 0,
        minStockLevel: Number(formData.minStockLevel) || 0,
        openingStock:
          formData.type === "PRODUCT"
            ? Number(formData.openingStock) || 0
            : 0,
        warehouseId: formData.warehouseId || undefined,
        openingBatchNumber:
          formData.trackBatches && formData.openingBatchNumber
            ? formData.openingBatchNumber.trim()
            : undefined,
        openingExpiryDate:
          formData.trackBatches && formData.openingExpiryDate
            ? formData.openingExpiryDate
            : undefined,
        openingMfgDate:
          formData.trackBatches && formData.openingMfgDate
            ? formData.openingMfgDate
            : undefined,
        trackBatches:
          formData.type === "PRODUCT" ? Boolean(formData.trackBatches) : false,
      });

      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setFormError(
        lang === "gu" && err.messageGujarati
          ? err.messageGujarati
          : err.message || "Failed to create item.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (item: Item) => {
    setEditingItem(item);
    setEditFormData({
      type: item.type,
      name: item.name,
      nameGujarati: item.nameGujarati || "",
      sku: item.sku || "",
      barcode: item.barcode || "",
      hsnCode: item.hsnCode || "1006",
      primaryUomId:
        item.primaryUomId || item.primaryUom?.id || units[0]?.id || "",
      categoryId: item.categoryId || "",
      taxRate: Number(item.taxRate) || 0,
      retailPrice: Number(item.retailPrice) || 0,
      mrp: Number(item.mrp ?? item.retailPrice ?? 0),
      purchaseRate: Number(item.purchaseRate ?? 0),
      minStockLevel: Number(item.minStockLevel ?? 0),
      trackBatches: Boolean(item.trackBatches),
      isActive: item.isActive !== false,
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      await apiClient.put(`/items/${editingItem.id}`, {
        type: editFormData.type,
        name: editFormData.name,
        nameGujarati: editFormData.nameGujarati || undefined,
        sku: editFormData.sku || undefined,
        barcode: editFormData.barcode || undefined,
        hsnCode: editFormData.hsnCode,
        primaryUomId: editFormData.primaryUomId || undefined,
        categoryId: editFormData.categoryId || undefined,
        taxRate: Number(editFormData.taxRate) || 0,
        retailPrice: Number(editFormData.retailPrice) || 0,
        mrp: Number(editFormData.mrp) || Number(editFormData.retailPrice) || 0,
        purchaseRate: Number(editFormData.purchaseRate) || 0,
        minStockLevel: Number(editFormData.minStockLevel) || 0,
        trackBatches:
          editFormData.type === "PRODUCT"
            ? Boolean(editFormData.trackBatches)
            : false,
        isActive: Boolean(editFormData.isActive),
      });

      setIsEditModalOpen(false);
      setEditingItem(null);
      await fetchData();
    } catch (err: any) {
      setFormError(
        lang === "gu" && err.messageGujarati
          ? err.messageGujarati
          : err.message || "Failed to update item.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/items/${itemToDelete.id}`);
      setItemToDelete(null);
      await fetchData();
    } catch (err: any) {
      setError(
        lang === "gu" && err.messageGujarati
          ? err.messageGujarati
          : err.message || "Failed to delete item.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const displayItems = useMemo(() => {
    if (typeFilter === "ALL") return items;
    return items.filter((it) => it.type === typeFilter);
  }, [items, typeFilter]);

  const itemColumns = useMemo<ColumnDef<Item>[]>(
    () => [
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
        header: lang === "gu" ? "એસકેયુ / બારકોડ" : "SKU / Code",
        accessorFn: (it) => it.sku || it.barcode || "—",
        sortable: true,
        className: "font-mono text-slate-600",
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
    [lang]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-border shadow-subtle">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {lang === "gu"
              ? "વસ્તુઓની યાદી (Item Catalog)"
              : "Products & Item Catalog"}
          </h1>
          <p className="text-xs text-muted mt-1">
            {lang === "gu"
              ? "તમામ ઉત્પાદનો, સેવાઓ, બેચ ટ્રેકિંગ, એચએસએન કોડ અને જીએસટી દરોનું સંચાલન"
              : "Manage products, services, batch tracking, HSN/SAC codes, tax rates, and prices"}
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
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
              strokeWidth={2.5}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>{lang === "gu" ? "નવી વસ્તુ ઉમેરો" : "Add New Item"}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-xs text-rose-700 font-medium rounded-xl">
          {error}
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
          <div className="flex items-center gap-2">
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
          </div>
        }
        mobileCardRender={(it) => (
          <div key={it.id} className="p-3.5 hover:bg-slate-50 transition-colors space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-900 text-sm">{it.name}</span>
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

      {/* Create Item Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={lang === "gu" ? "નવી વસ્તુ ઉમેરો" : "Add New Item"}
        titleGujarati="ઉત્પાદન અથવા સેવાની વિગતો"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateItem} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700 font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "વસ્તુનો પ્રકાર *" : "Item Type *"}
              </label>
              <select
                value={formData.type}
                onChange={(e: any) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500"
              >
                <option value="PRODUCT">{lang === "gu" ? "ઉત્પાદન / માલસામાન (Product)" : "Product"}</option>
                <option value="SERVICE">{lang === "gu" ? "સેવા (Service)" : "Service"}</option>
              </select>
            </div>

            <div>
              <HsnSelector
                value={formData.hsnCode}
                onChange={(code, hsnOpt) => {
                  setFormData((prev) => ({
                    ...prev,
                    hsnCode: code,
                    taxRate: hsnOpt ? Number(hsnOpt.gstRate) : prev.taxRate,
                    type: hsnOpt?.type === "SAC" ? "SERVICE" : prev.type,
                  }));
                }}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              {lang === "gu" ? "વસ્તુનું નામ (અંગ્રેજી) *" : "Item Name *"}
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g. Basmati Rice 25kg Bag"
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              {lang === "gu" ? "નામ ગુજરાતીમાં" : "Name in Gujarati (Optional)"}
            </label>
            <input
              type="text"
              value={formData.nameGujarati}
              onChange={(e) =>
                setFormData({ ...formData, nameGujarati: e.target.value })
              }
              placeholder={lang === "gu" ? "દા.ત. બાસમતી ચોખા ૨૫ કિલો" : "e.g. Basmati Rice 25kg"}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "એકમ (UOM)" : "Unit of Measure"}
              </label>
              <select
                value={formData.primaryUomId}
                onChange={(e) =>
                  setFormData({ ...formData, primaryUomId: e.target.value })
                }
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "શ્રેણી (Category)" : "Category"}
              </label>
              <select
                value={formData.categoryId}
                onChange={(e) =>
                  setFormData({ ...formData, categoryId: e.target.value })
                }
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">None / General</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "એસકેયુ કોડ (SKU)" : "SKU Code"}
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) =>
                  setFormData({ ...formData, sku: e.target.value })
                }
                placeholder="RICE-BAS-25"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "જીએસટી સ્લેબ દર (%) *" : "GST Tax Rate (%) *"}
              </label>
              <select
                value={formData.taxRate}
                onChange={(e) =>
                  setFormData({ ...formData, taxRate: Number(e.target.value) })
                }
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-emerald-800"
              >
                <option value={0}>0% (Nil / Exempt)</option>
                <option value={5}>5% (Standard Essential)</option>
                <option value={12}>12% (Standard)</option>
                <option value={18}>18% (Standard Commercial)</option>
                <option value={28}>28% (Luxury / De-merit)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "વેચાણ ભાવ (₹) *" : "Retail Price (₹) *"}
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.retailPrice}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    retailPrice: Number(e.target.value),
                  })
                }
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "ખરીદ ભાવ (₹)" : "Purchase Rate (₹)"}
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.purchaseRate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    purchaseRate: Number(e.target.value),
                  })
                }
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "એમઆરપી (MRP ₹)" : "MRP (₹)"}
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.mrp}
                onChange={(e) =>
                  setFormData({ ...formData, mrp: Number(e.target.value) })
                }
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono"
              />
            </div>
          </div>

          {/* Stock & Inventory Section (Only for Products) */}
          {formData.type === "PRODUCT" && (
            <div className="p-4 bg-amber-50/40 border border-amber-200/80 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[#F47721]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  {lang === "gu" ? "સ્ટોક અને ઇન્વેન્ટરી વિગતો" : "Stock & Inventory Details"}
                </span>
                {Number(formData.openingStock) > 0 && (
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300 font-mono">
                    {lang === "gu" ? "મૂલ્યાંકન: " : "Valuation: "}
                    ₹{(Number(formData.openingStock) * Number(formData.purchaseRate || formData.retailPrice || 0)).toFixed(2)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    {lang === "gu" ? "શરૂઆતનો સ્ટોક (Opening Stock Qty)" : "Opening Stock Quantity"}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={formData.openingStock}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          openingStock: e.target.value === "" ? 0 : Number(e.target.value),
                        })
                      }
                      placeholder="0"
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded font-mono font-bold text-slate-900 focus:bg-white focus:ring-1 focus:ring-emerald-500 pr-14"
                    />
                    <span className="absolute right-2.5 top-2 text-[11px] font-semibold text-slate-400">
                      {units.find((u) => u.id === formData.primaryUomId)?.code || "Units"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {lang === "gu"
                      ? "હાલમાં તમારી પાસે ઉપલબ્ધ શરૂઆતનો જથ્થો"
                      : "Current available quantity on hand"}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    {lang === "gu" ? "લઘુત્તમ સ્ટોક એલર્ટ (Min Stock Level)" : "Low Stock Alert (Min Qty)"}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={formData.minStockLevel}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          minStockLevel: e.target.value === "" ? 0 : Number(e.target.value),
                        })
                      }
                      placeholder="10"
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded font-mono font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 pr-14"
                    />
                    <span className="absolute right-2.5 top-2 text-[11px] font-semibold text-slate-400">
                      {units.find((u) => u.id === formData.primaryUomId)?.code || "Units"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {lang === "gu"
                      ? "આ જથ્થાથી ઓછો સ્ટોક થાય ત્યારે ચેતવણી મળશે"
                      : "Alert when stock falls below this level"}
                  </p>
                </div>
              </div>

              {warehouses.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    {lang === "gu" ? "ગોડાઉન / વેરહાઉસ" : "Warehouse / Godown"}
                  </label>
                  <select
                    value={formData.warehouseId}
                    onChange={(e) =>
                      setFormData({ ...formData, warehouseId: e.target.value })
                    }
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded"
                  >
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name} {wh.isDefault ? "(Default)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.trackBatches && Number(formData.openingStock) > 0 && (
                <div className="pt-2 border-t border-amber-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      {lang === "gu" ? "શરૂઆતનો બેચ નંબર" : "Opening Batch Number"}
                    </label>
                    <input
                      type="text"
                      value={formData.openingBatchNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          openingBatchNumber: e.target.value,
                        })
                      }
                      placeholder="e.g. BATCH-01"
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      {lang === "gu" ? "એક્સપાયરી તારીખ" : "Expiry Date (Optional)"}
                    </label>
                    <input
                      type="date"
                      value={formData.openingExpiryDate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          openingExpiryDate: e.target.value,
                        })
                      }
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Batch Tracking Toggle (Only for Products) */}
          {formData.type === "PRODUCT" && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.trackBatches}
                  onChange={(e) =>
                    setFormData({ ...formData, trackBatches: e.target.checked })
                  }
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span className="text-xs font-semibold text-slate-800">
                  {lang === "gu"
                    ? "બેચ અને એક્સપાયરી ટ્રેકિંગ સક્ષમ કરો"
                    : "Enable Batch & Expiry Tracking"}
                </span>
              </label>
              <p className="text-[11px] text-slate-500 mt-1 pl-6">
                {lang === "gu"
                  ? "આ વસ્તુ માટે બેચ નંબર, ઉત્પાદન અને એક્સપાયરી તારીખનું સંચાલન કરવા માટે આ વિકલ્પ ચાલુ કરો."
                  : "Enable this to track batch numbers, manufacturing dates, and expiry dates for this item in Item Batches."}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#F47721] hover:bg-[#D95F12] disabled:bg-[#F47721]/50 rounded-lg shadow-sm"
            >
              {isSubmitting
                ? "Saving..."
                : lang === "gu"
                  ? "વસ્તુ સાચવો"
                  : "Save Item"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingItem(null);
        }}
        title={lang === "gu" ? "વસ્તુમાં ફેરફાર કરો" : "Edit Item Details"}
        titleGujarati={editingItem ? `${editingItem.name}` : ""}
        maxWidth="lg"
      >
        <form onSubmit={handleUpdateItem} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700 font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "વસ્તુનો પ્રકાર *" : "Item Type *"}
              </label>
              <select
                value={editFormData.type}
                onChange={(e: any) =>
                  setEditFormData({ ...editFormData, type: e.target.value })
                }
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500"
              >
                <option value="PRODUCT">{lang === "gu" ? "ઉત્પાદન / માલસામાન (Product)" : "Product"}</option>
                <option value="SERVICE">{lang === "gu" ? "સેવા (Service)" : "Service"}</option>
              </select>
            </div>

            <div>
              <HsnSelector
                value={editFormData.hsnCode}
                onChange={(code, hsnOpt) => {
                  setEditFormData((prev) => ({
                    ...prev,
                    hsnCode: code,
                    taxRate: hsnOpt ? Number(hsnOpt.gstRate) : prev.taxRate,
                    type: hsnOpt?.type === "SAC" ? "SERVICE" : prev.type,
                  }));
                }}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              {lang === "gu" ? "વસ્તુનું નામ (અંગ્રેજી) *" : "Item Name *"}
            </label>
            <input
              type="text"
              required
              value={editFormData.name}
              onChange={(e) =>
                setEditFormData({ ...editFormData, name: e.target.value })
              }
              placeholder="e.g. Basmati Rice 25kg Bag"
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              {lang === "gu" ? "નામ ગુજરાતીમાં" : "Name in Gujarati (Optional)"}
            </label>
            <input
              type="text"
              value={editFormData.nameGujarati}
              onChange={(e) =>
                setEditFormData({ ...editFormData, nameGujarati: e.target.value })
              }
              placeholder={lang === "gu" ? "દા.ત. બાસમતી ચોખા ૨૫ કિલો" : "e.g. Basmati Rice 25kg"}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "એકમ (UOM)" : "Unit of Measure"}
              </label>
              <select
                value={editFormData.primaryUomId}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, primaryUomId: e.target.value })
                }
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "શ્રેણી (Category)" : "Category"}
              </label>
              <select
                value={editFormData.categoryId}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, categoryId: e.target.value })
                }
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">None / General</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "એસકેયુ કોડ (SKU)" : "SKU Code"}
              </label>
              <input
                type="text"
                value={editFormData.sku}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, sku: e.target.value })
                }
                placeholder="RICE-BAS-25"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "જીએસટી સ્લેબ દર (%) *" : "GST Tax Rate (%) *"}
              </label>
              <select
                value={editFormData.taxRate}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, taxRate: Number(e.target.value) })
                }
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-emerald-800"
              >
                <option value={0}>0% (Nil / Exempt)</option>
                <option value={5}>5% (Standard Essential)</option>
                <option value={12}>12% (Standard)</option>
                <option value={18}>18% (Standard Commercial)</option>
                <option value={28}>28% (Luxury / De-merit)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "વેચાણ ભાવ (₹) *" : "Retail Price (₹) *"}
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={editFormData.retailPrice}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    retailPrice: Number(e.target.value),
                  })
                }
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "ખરીદ ભાવ (₹)" : "Purchase Rate (₹)"}
              </label>
              <input
                type="number"
                step="0.01"
                value={editFormData.purchaseRate}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    purchaseRate: Number(e.target.value),
                  })
                }
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "એમઆરપી (MRP ₹)" : "MRP (₹)"}
              </label>
              <input
                type="number"
                step="0.01"
                value={editFormData.mrp}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, mrp: Number(e.target.value) })
                }
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono"
              />
            </div>
          </div>

          {/* Stock & Low Stock Alert in Edit Modal */}
          {editFormData.type === "PRODUCT" && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[#F47721]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  {lang === "gu" ? "સ્ટોક નિયંત્રણ (Stock & Inventory)" : "Stock & Inventory Alert"}
                </span>
                {editingItem && (
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {lang === "gu" ? "હાલનો સ્ટોક: " : "Current Stock: "}
                    {Number(editingItem.currentStock || 0)} {editingItem.primaryUom?.code || editingItem.primaryUom?.symbol || ""}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  {lang === "gu" ? "લઘુત્તમ સ્ટોક એલર્ટ (Min Stock Level)" : "Low Stock Alert (Min Qty)"}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={editFormData.minStockLevel}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      minStockLevel: Number(e.target.value),
                    })
                  }
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded font-mono font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  {lang === "gu"
                    ? "જ્યારે સ્ટોક આ સ્તરથી નીચે જશે ત્યારે સિસ્ટમ ચેતવણી આપશે."
                    : "System alerts when on-hand stock falls below this quantity."}
                </p>
              </div>
            </div>
          )}

          {/* Batch Tracking Toggle & Active Toggle */}
          <div className="space-y-3 pt-2">
            {editFormData.type === "PRODUCT" && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFormData.trackBatches}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        trackBatches: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    {lang === "gu"
                      ? "બેચ અને એક્સપાયરી ટ્રેકિંગ સક્ષમ કરો (Batch Tracking Enabled)"
                      : "Enable Batch & Expiry Tracking (trackBatches)"}
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 mt-1 pl-6">
                  {lang === "gu"
                    ? "જ્યારે આ વિકલ્પ ચાલુ હોય ત્યારે આ વસ્તુ માટે બેચ બનાવી શકાશે."
                    : "When enabled, batches and expiry dates can be tracked for this product under Item Batches."}
                </p>
              </div>
            )}

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editFormData.isActive}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      isActive: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span className="text-xs font-semibold text-slate-800">
                  {lang === "gu" ? "સક્રિય સ્થિતિ (Active Item)" : "Active Item"}
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingItem(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#F47721] hover:bg-[#D95F12] disabled:bg-[#F47721]/50 rounded-lg shadow-sm"
            >
              {isSubmitting
                ? "Updating..."
                : lang === "gu"
                  ? "ફેરફાર સાચવો"
                  : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Item Confirmation Modal */}
      <Modal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        title={lang === "gu" ? "વસ્તુ કાઢી નાખવાની ખાતરી" : "Confirm Delete Item"}
        titleGujarati={itemToDelete ? `${itemToDelete.name}` : ""}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            {lang === "gu"
              ? `શું તમે ખરેખર "${itemToDelete?.name}" વસ્તુને કાઢી નાખવા અથવા આર્કાઇવ કરવા માંગો છો?`
              : `Are you sure you want to delete / archive "${itemToDelete?.name}"?`}
          </p>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setItemToDelete(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteItem}
              disabled={isDeleting}
              className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 rounded-lg shadow-sm"
            >
              {isDeleting
                ? "Deleting..."
                : lang === "gu"
                  ? "હા, કાઢી નાખો"
                  : "Confirm Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
