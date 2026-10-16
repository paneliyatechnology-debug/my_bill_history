"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";
import { Modal } from "../../../components/ui/modal";
import { Badge, StatusBadge } from "../../../components/ui/badge";
import { DataTable, ColumnDef } from "../../../components/ui/data-table";

interface BomItem {
  id?: string;
  rawItemId: string;
  quantity: number;
  wastagePercent?: number;
  rawItem?: {
    id: string;
    name: string;
    sku?: string;
    primaryUom?: { name: string; code: string };
  };
}

interface BillOfMaterial {
  id: string;
  companyId: string;
  finishedItemId: string;
  bomName: string;
  batchYieldQty: number;
  laborCostEst?: number;
  overheadCostEst?: number;
  createdAt: string;
  finishedItem?: {
    id: string;
    name: string;
    sku?: string;
    primaryUom?: { name: string; code: string };
  };
  items: BomItem[];
}

interface ItemOption {
  id: string;
  name: string;
  sku?: string;
  type: string;
  primaryUom?: { name: string; code: string };
}

export default function BomPage() {
  const { lang, tenantContext } = useAuth();
  const [boms, setBoms] = useState<BillOfMaterial[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedBom, setSelectedBom] = useState<BillOfMaterial | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    finishedItemId: "",
    bomName: "",
    batchYieldQty: 1,
    laborCostEst: 0,
    overheadCostEst: 0,
    items: [{ rawItemId: "", quantity: 1, wastagePercent: 0 }] as Array<{
      rawItemId: string;
      quantity: number;
      wastagePercent: number;
    }>,
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [bomRes, itemRes]: any = await Promise.all([
        apiClient.get("/manufacturing/boms"),
        apiClient.get("/items"),
      ]);
      setBoms(extractList(bomRes));
      setItems(extractList(itemRes));
    } catch (err: any) {
      setError(err.message || "Failed to load Bill of Materials.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchData();
    }
  }, [tenantContext.companyId, fetchData]);

  const handleOpenCreate = () => {
    setFormData({
      finishedItemId: items[0]?.id || "",
      bomName: "",
      batchYieldQty: 1,
      laborCostEst: 0,
      overheadCostEst: 0,
      items: [{ rawItemId: items[1]?.id || items[0]?.id || "", quantity: 1, wastagePercent: 0 }],
    });
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (bom: BillOfMaterial) => {
    setSelectedBom(bom);
    setFormData({
      finishedItemId: bom.finishedItemId,
      bomName: bom.bomName,
      batchYieldQty: Number(bom.batchYieldQty),
      laborCostEst: Number(bom.laborCostEst || 0),
      overheadCostEst: Number(bom.overheadCostEst || 0),
      items: bom.items.map((it) => ({
        rawItemId: it.rawItemId,
        quantity: Number(it.quantity),
        wastagePercent: Number(it.wastagePercent || 0),
      })),
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleOpenView = (bom: BillOfMaterial) => {
    setSelectedBom(bom);
    setIsViewModalOpen(true);
  };

  const handleAddRawItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { rawItemId: items[0]?.id || "", quantity: 1, wastagePercent: 0 }],
    }));
  };

  const handleRemoveRawItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  const handleItemChange = (
    index: number,
    field: "rawItemId" | "quantity" | "wastagePercent",
    val: string | number
  ) => {
    setFormData((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, items: updated };
    });
  };

  const validateForm = (isEdit = false) => {
    if (!isEdit && !formData.finishedItemId) {
      return lang === "gu" ? "તૈયાર માલ પસંદ કરવો ફરજિયાત છે." : "Finished Item is required.";
    }
    if (!formData.bomName.trim()) {
      return lang === "gu" ? "BOM નું નામ આપવું ફરજિયાત છે." : "BOM Name is required.";
    }
    if (formData.batchYieldQty <= 0) {
      return lang === "gu" ? "બેચ ઉત્પાદન જથ્થો ૦ થી વધુ હોવો જોઈએ." : "Batch Yield Quantity must be > 0.";
    }
    if (formData.items.length === 0) {
      return lang === "gu" ? "ઓછામાં ઓછો એક કાચો માલ ઉમેરો." : "At least one raw material component is required.";
    }
    const rawIds = formData.items.map((i) => i.rawItemId);
    if (new Set(rawIds).size !== rawIds.length) {
      return lang === "gu"
        ? "BOM માં ડુપ્લિકેટ કાચો માલ ઉમેરી શકાય નહીં."
        : "Duplicate raw material components are not allowed.";
    }
    if (!isEdit && rawIds.includes(formData.finishedItemId)) {
      return lang === "gu"
        ? "તૈયાર માલ પોતે પોતાના BOM માં કાચા માલ તરીકે ન હોઈ શકે."
        : "Finished item cannot be a raw component in its own BOM.";
    }
    for (const it of formData.items) {
      if (it.quantity <= 0) {
        return lang === "gu" ? "તમામ કાચા માલનો જથ્થો ૦ થી વધુ હોવો જોઈએ." : "Component quantity must be > 0.";
      }
      if (it.wastagePercent < 0 || it.wastagePercent >= 100) {
        return lang === "gu"
          ? "બગાડની ટકાવારી ૦% થી ૯૯.૯૯% ની વચ્ચે હોવી જોઈએ."
          : "Wastage percent must be between 0% and 99.99%.";
      }
    }
    return null;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErr = validateForm(false);
    if (validationErr) {
      setFormError(validationErr);
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      await apiClient.post("/manufacturing/boms", {
        finishedItemId: formData.finishedItemId,
        bomName: formData.bomName,
        batchYieldQty: Number(formData.batchYieldQty),
        laborCostEst: Number(formData.laborCostEst || 0),
        overheadCostEst: Number(formData.overheadCostEst || 0),
        items: formData.items.map((it) => ({
          rawItemId: it.rawItemId,
          quantity: Number(it.quantity),
          wastagePercent: Number(it.wastagePercent || 0),
        })),
      });
      setIsCreateModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setFormError(err.message || "Failed to create Bill of Materials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBom) return;
    const validationErr = validateForm(true);
    if (validationErr) {
      setFormError(validationErr);
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      await apiClient.put(`/manufacturing/boms/${selectedBom.id}`, {
        bomName: formData.bomName,
        batchYieldQty: Number(formData.batchYieldQty),
        laborCostEst: Number(formData.laborCostEst || 0),
        overheadCostEst: Number(formData.overheadCostEst || 0),
        items: formData.items.map((it) => ({
          rawItemId: it.rawItemId,
          quantity: Number(it.quantity),
          wastagePercent: Number(it.wastagePercent || 0),
        })),
      });
      setIsEditModalOpen(false);
      setSelectedBom(null);
      await fetchData();
    } catch (err: any) {
      setFormError(err.message || "Failed to update Bill of Materials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/manufacturing/boms/${id}`);
      setDeleteConfirmId(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to delete BOM.");
    }
  };

  const columns: ColumnDef<BillOfMaterial>[] = [
    {
      id: "bomName",
      header: lang === "gu" ? "BOM નું નામ" : "BOM Name",
      accessorKey: "bomName",
      sortable: true,
      cell: (bom) => (
        <div className="font-medium text-slate-900">
          <div>{bom.bomName}</div>
          <span className="text-[11px] text-slate-400 font-mono">
            {new Date(bom.createdAt).toLocaleDateString()}
          </span>
        </div>
      ),
    },
    {
      id: "finishedItem",
      header: lang === "gu" ? "તૈયાર માલ (Finished Item)" : "Finished Item",
      accessorFn: (bom) => `${bom.finishedItem?.name || ""} ${bom.finishedItem?.sku || ""}`,
      sortable: true,
      cell: (bom) => (
        <div>
          <div className="font-medium text-slate-800">
            {bom.finishedItem?.name || "Item"}
          </div>
          {bom.finishedItem?.sku && (
            <span className="text-xs text-slate-400 font-mono">
              SKU: {bom.finishedItem.sku}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "batchYieldQty",
      header: lang === "gu" ? "બેચ આઉટપુટ (Yield Qty)" : "Yield Qty",
      accessorKey: "batchYieldQty",
      sortable: true,
      align: "right",
      cell: (bom) => (
        <div className="text-right font-mono font-semibold text-slate-700">
          {Number(bom.batchYieldQty).toLocaleString()}{" "}
          <span className="text-xs font-normal text-slate-500">
            {bom.finishedItem?.primaryUom?.code || "Unit"}
          </span>
        </div>
      ),
    },
    {
      id: "components",
      header: lang === "gu" ? "ઘટકો (Components)" : "Components",
      accessorFn: (bom) => bom.items.length,
      sortable: true,
      align: "center",
      cell: (bom) => (
        <div className="flex justify-center">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#FFF3E8] text-[#F47721] border border-[#F47721]/30">
            {bom.items.length}{" "}
            {lang === "gu" ? "કાચો માલ" : "Raw Materials"}
          </span>
        </div>
      ),
    },
    {
      id: "overhead",
      header: lang === "gu" ? "અંદાજિત ખર્ચ (Labor/OH)" : "Est. Overhead",
      accessorFn: (bom) => Number(bom.laborCostEst || 0) + Number(bom.overheadCostEst || 0),
      sortable: true,
      align: "right",
      cell: (bom) => (
        <div className="text-right font-mono text-slate-700">
          <div>₹{(Number(bom.laborCostEst || 0) + Number(bom.overheadCostEst || 0)).toFixed(2)}</div>
          <span className="text-[10px] text-slate-400 block">
            L: ₹{Number(bom.laborCostEst || 0).toFixed(0)} | OH: ₹{Number(bom.overheadCostEst || 0).toFixed(0)}
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      header: lang === "gu" ? "ક્રિયાઓ" : "Actions",
      align: "right",
      cell: (bom) => (
        <div className="flex items-center justify-end space-x-2 whitespace-nowrap">
          <button
            onClick={() => handleOpenView(bom)}
            className="text-xs text-slate-600 hover:text-[#F47721] font-medium px-2 py-1 rounded hover:bg-slate-100 transition-colors"
          >
            {lang === "gu" ? "વિગતો" : "View"}
          </button>
          <button
            onClick={() => handleOpenEdit(bom)}
            className="text-xs text-[#F47721] hover:text-[#D95F12] font-semibold px-2 py-1 rounded hover:bg-[#FFF3E8] transition-colors"
          >
            {lang === "gu" ? "સુધારો" : "Edit"}
          </button>
          <button
            onClick={() => setDeleteConfirmId(bom.id)}
            className="text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-1 rounded hover:bg-rose-50 transition-colors"
          >
            {lang === "gu" ? "કાઢી નાખો" : "Delete"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-border shadow-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {lang === "gu" ? "બિલ ઓફ મટિરીયલ્સ (BOM / સામગ્રી યાદી)" : "Bill of Materials (BOM)"}
            </h1>
          </div>
          <p className="text-xs text-muted mt-1">
            {lang === "gu"
              ? "તૈયાર માલનું ઉત્પાદન કરવા માટે જોઈતી કાચી સામગ્રી, બગાડ અને અંદાજિત ખર્ચનું માળખું"
              : "Standard multi-level formula recipes, raw material consumption ratios, wastage & cost estimates"}
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-pressed text-white text-xs sm:text-sm font-bold rounded-xl shadow-card hover:shadow-hover transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {lang === "gu" ? "નવું BOM બનાવો" : "Create New BOM"}
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchData}
            className="underline font-medium hover:text-rose-900 ml-4"
          >
            {lang === "gu" ? "ફરી પ્રયાસ કરો" : "Retry"}
          </button>
        </div>
      )}

      {/* Listing with DataTable */}
      <DataTable<BillOfMaterial>
        data={boms}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder={lang === "gu" ? "BOM અથવા તૈયાર માલના નામથી શોધો..." : "Search by BOM name or finished item..."}
        exportFileName="bill_of_materials"
        themeColor="saffron"
        pageSize={10}
        emptyState={
          <div className="p-12 text-center bg-white rounded-xl">
            <svg
              className="w-12 h-12 mx-auto text-slate-300 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h3 className="text-sm font-semibold text-slate-700">
              {lang === "gu" ? "કોઈ BOM મળ્યું નથી" : "No Bills of Materials found"}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {lang === "gu"
                ? "તમારા ઉત્પાદન કાર્યો માટે નવું BOM બનાવો."
                : "Create a BOM to start standardizing production formulas."}
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-[#FFF3E8] text-[#F47721] rounded-lg text-xs font-semibold hover:bg-[#F47721] hover:text-white transition-colors"
            >
              + {lang === "gu" ? "પ્રથમ BOM બનાવો" : "Create First BOM"}
            </button>
          </div>
        }
        mobileCardRender={(bom) => (
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-slate-900">{bom.bomName}</div>
                <div className="text-xs text-slate-500 font-medium">{bom.finishedItem?.name || "Item"}</div>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#FFF3E8] text-[#F47721] border border-[#F47721]/30">
                {bom.items.length} {lang === "gu" ? "કાચો માલ" : "Items"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
              <div>
                <span className="text-slate-400 block text-[10px]">{lang === "gu" ? "બેચ આઉટપુટ" : "Yield Qty"}</span>
                <span className="font-mono font-medium text-slate-700">
                  {Number(bom.batchYieldQty).toLocaleString()} {bom.finishedItem?.primaryUom?.code || "Unit"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">{lang === "gu" ? "અંદાજિત ઓવરહેડ" : "Est. Overhead"}</span>
                <span className="font-mono font-medium text-slate-700">
                  ₹{(Number(bom.laborCostEst || 0) + Number(bom.overheadCostEst || 0)).toFixed(2)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => handleOpenView(bom)}
                className="text-xs text-slate-600 hover:text-[#F47721] font-medium px-2 py-1 rounded hover:bg-slate-100 transition-colors"
              >
                {lang === "gu" ? "વિગતો" : "View"}
              </button>
              <button
                onClick={() => handleOpenEdit(bom)}
                className="text-xs text-[#F47721] hover:text-[#D95F12] font-semibold px-2 py-1 rounded hover:bg-[#FFF3E8] transition-colors"
              >
                {lang === "gu" ? "સુધારો" : "Edit"}
              </button>
              <button
                onClick={() => setDeleteConfirmId(bom.id)}
                className="text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-1 rounded hover:bg-rose-50 transition-colors"
              >
                {lang === "gu" ? "કાઢી નાખો" : "Delete"}
              </button>
            </div>
          </div>
        )}
      />

      {/* Create BOM Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={lang === "gu" ? "નવું BOM બનાવો" : "Create Bill of Materials"}
        titleGujarati="નવી ઉત્પાદન ફોર્મ્યુલા તૈયાર કરો"
        maxWidth="4xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {lang === "gu" ? "રદ કરો" : "Cancel"}
            </button>
            <button
              type="submit"
              form="create-bom-form"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#F47721] hover:bg-[#D95F12] text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting
                ? lang === "gu"
                  ? "સેવ થઈ રહ્યું છે..."
                  : "Saving..."
                : lang === "gu"
                ? "BOM સેવ કરો"
                : "Save BOM"}
            </button>
          </>
        }
      >
        <form id="create-bom-form" onSubmit={handleCreateSubmit} className="space-y-6">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "તૈયાર માલ (Finished Item) *" : "Finished Item *"}
              </label>
              <select
                value={formData.finishedItemId}
                onChange={(e) => setFormData({ ...formData, finishedItemId: e.target.value })}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">{lang === "gu" ? "-- પસંદ કરો --" : "-- Select Finished Item --"}</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name} {it.sku ? `(${it.sku})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "BOM રેસિપી નામ *" : "BOM Recipe Name *"}
              </label>
              <input
                type="text"
                value={formData.bomName}
                onChange={(e) => setFormData({ ...formData, bomName: e.target.value })}
                required
                placeholder="e.g. Standard 100KG Batch Recipe"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
              </input>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "બેચ ઉત્પાદન જથ્થો (Yield Qty) *" : "Batch Yield Quantity *"}
              </label>
              <input
                type="number"
                min="0.001"
                step="any"
                value={formData.batchYieldQty}
                onChange={(e) => setFormData({ ...formData, batchYieldQty: parseFloat(e.target.value) || 0 })}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === "gu" ? "મજૂરી ખર્ચ (₹)" : "Labor Cost (₹)"}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.laborCostEst}
                  onChange={(e) => setFormData({ ...formData, laborCostEst: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === "gu" ? "ઓવરહેડ ખર્ચ (₹)" : "Overhead Cost (₹)"}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.overheadCostEst}
                  onChange={(e) => setFormData({ ...formData, overheadCostEst: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Raw Material Components Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-slate-200">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {lang === "gu" ? "કાચો માલ અને ઘટકો (Raw Materials & Wastage)" : "Raw Materials & Wastage Ratios"}
              </span>
              <button
                type="button"
                onClick={handleAddRawItem}
                className="text-xs text-[#F47721] font-semibold hover:text-[#D95F12]"
              >
                + {lang === "gu" ? "કાચો માલ ઉમેરો" : "Add Component"}
              </button>
            </div>

            <div className="p-4 space-y-3">
              {formData.items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-12 sm:col-span-5">
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">
                      {lang === "gu" ? "કાચો માલ" : "Raw Component"}
                    </label>
                    <select
                      value={it.rawItemId}
                      onChange={(e) => handleItemChange(idx, "rawItemId", e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    >
                      {items.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name} {opt.sku ? `(${opt.sku})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-5 sm:col-span-3">
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">
                      {lang === "gu" ? "જથ્થો" : "Quantity"}
                    </label>
                    <input
                      type="number"
                      min="0.001"
                      step="any"
                      value={it.quantity}
                      onChange={(e) => handleItemChange(idx, "quantity", parseFloat(e.target.value) || 0)}
                      required
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono"
                    />
                  </div>

                  <div className="col-span-5 sm:col-span-3">
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">
                      {lang === "gu" ? "બગાડ (% Wastage)" : "Wastage (%)"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="99.99"
                      step="0.01"
                      value={it.wastagePercent}
                      onChange={(e) => handleItemChange(idx, "wastagePercent", parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1 flex justify-end pt-4 sm:pt-4">
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRawItem(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded"
                        title="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit BOM Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={lang === "gu" ? "BOM સુધારો" : "Edit Bill of Materials"}
        titleGujarati={selectedBom?.bomName}
        maxWidth="4xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {lang === "gu" ? "રદ કરો" : "Cancel"}
            </button>
            <button
              type="submit"
              form="edit-bom-form"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#F47721] hover:bg-[#D95F12] text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting
                ? lang === "gu"
                  ? "સેવ થઈ રહ્યું છે..."
                  : "Saving..."
                : lang === "gu"
                ? "સુધારો સેવ કરો"
                : "Update BOM"}
            </button>
          </>
        }
      >
        <form id="edit-bom-form" onSubmit={handleEditSubmit} className="space-y-6">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "તૈયાર માલ (Finished Item)" : "Finished Item"}
              </label>
              <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium">
                {selectedBom?.finishedItem?.name} ({selectedBom?.finishedItem?.sku || "SKU"})
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "BOM રેસિપી નામ *" : "BOM Recipe Name *"}
              </label>
              <input
                type="text"
                value={formData.bomName}
                onChange={(e) => setFormData({ ...formData, bomName: e.target.value })}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "બેચ ઉત્પાદન જથ્થો (Yield Qty) *" : "Batch Yield Quantity *"}
              </label>
              <input
                type="number"
                min="0.001"
                step="any"
                value={formData.batchYieldQty}
                onChange={(e) => setFormData({ ...formData, batchYieldQty: parseFloat(e.target.value) || 0 })}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === "gu" ? "મજૂરી ખર્ચ (₹)" : "Labor Cost (₹)"}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.laborCostEst}
                  onChange={(e) => setFormData({ ...formData, laborCostEst: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === "gu" ? "ઓવરહેડ ખર્ચ (₹)" : "Overhead Cost (₹)"}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.overheadCostEst}
                  onChange={(e) => setFormData({ ...formData, overheadCostEst: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Raw Material Components Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-slate-200">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {lang === "gu" ? "કાચો માલ અને ઘટકો" : "Raw Materials & Wastage Ratios"}
              </span>
              <button
                type="button"
                onClick={handleAddRawItem}
                className="text-xs text-[#F47721] font-semibold hover:text-[#D95F12]"
              >
                + {lang === "gu" ? "કાચો માલ ઉમેરો" : "Add Component"}
              </button>
            </div>

            <div className="p-4 space-y-3">
              {formData.items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-12 sm:col-span-5">
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">
                      {lang === "gu" ? "કાચો માલ" : "Raw Component"}
                    </label>
                    <select
                      value={it.rawItemId}
                      onChange={(e) => handleItemChange(idx, "rawItemId", e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    >
                      {items.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name} {opt.sku ? `(${opt.sku})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-5 sm:col-span-3">
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">
                      {lang === "gu" ? "જથ્થો" : "Quantity"}
                    </label>
                    <input
                      type="number"
                      min="0.001"
                      step="any"
                      value={it.quantity}
                      onChange={(e) => handleItemChange(idx, "quantity", parseFloat(e.target.value) || 0)}
                      required
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono"
                    />
                  </div>

                  <div className="col-span-5 sm:col-span-3">
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">
                      {lang === "gu" ? "બગાડ (% Wastage)" : "Wastage (%)"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="99.99"
                      step="0.01"
                      value={it.wastagePercent}
                      onChange={(e) => handleItemChange(idx, "wastagePercent", parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1 flex justify-end pt-4 sm:pt-4">
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRawItem(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded"
                        title="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      {/* View BOM Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={selectedBom?.bomName || "BOM Details"}
        titleGujarati={selectedBom?.finishedItem?.name}
        maxWidth="2xl"
        footer={
          <button
            onClick={() => setIsViewModalOpen(false)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            {lang === "gu" ? "બંધ કરો" : "Close"}
          </button>
        }
      >
        {selectedBom && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">
                  {lang === "gu" ? "તૈયાર માલ (Finished Item)" : "Finished Item"}
                </span>
                <span className="font-semibold text-slate-800">
                  {selectedBom.finishedItem?.name}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">
                  {lang === "gu" ? "બેચ આઉટપુટ (Yield Quantity)" : "Batch Yield"}
                </span>
                <span className="font-semibold font-mono text-slate-800">
                  {Number(selectedBom.batchYieldQty).toLocaleString()}{" "}
                  {selectedBom.finishedItem?.primaryUom?.code || "Unit"}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">
                  {lang === "gu" ? "અંદાજિત મજૂરી ખર્ચ" : "Est. Labor Cost"}
                </span>
                <span className="font-mono text-slate-700">
                  ₹{Number(selectedBom.laborCostEst || 0).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">
                  {lang === "gu" ? "અંદાજિત ઓવરહેડ ખર્ચ" : "Est. Overhead Cost"}
                </span>
                <span className="font-mono text-slate-700">
                  ₹{Number(selectedBom.overheadCostEst || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 uppercase">
                {lang === "gu" ? "કાચો માલ ઘટકો યાદી" : "Raw Material Formula Breakdown"}
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Item</th>
                    <th className="px-4 py-2 font-semibold text-right">Required Qty</th>
                    <th className="px-4 py-2 font-semibold text-right">Wastage %</th>
                    <th className="px-4 py-2 font-semibold text-right">Effective Consumption</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedBom.items.map((it, idx) => {
                    const reqQty = Number(it.quantity);
                    const waste = Number(it.wastagePercent || 0);
                    const effective = reqQty * (1 + waste / 100);
                    return (
                      <tr key={idx}>
                        <td className="px-4 py-2 font-medium text-slate-800">
                          {it.rawItem?.name || it.rawItemId}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-slate-700">
                          {reqQty}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-slate-600">
                          {waste}%
                        </td>
                        <td className="px-4 py-2 text-right font-mono font-semibold text-indigo-700">
                          {effective.toFixed(4)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Modal
        isOpen={Boolean(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
        title={lang === "gu" ? "BOM કાઢી નાખવાની ખાતરી" : "Confirm BOM Deletion"}
        maxWidth="sm"
        footer={
          <>
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {lang === "gu" ? "રદ કરો" : "Cancel"}
            </button>
            <button
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              {lang === "gu" ? "હા, કાઢી નાખો" : "Yes, Delete"}
            </button>
          </>
        }
      >
        <p className="text-xs text-slate-600">
          {lang === "gu"
            ? "શું તમે ખરેખર આ BOM રેસિપી કાઢી નાખવા માંગો છો? આ ક્રિયા પાછી ખેંચી શકાશે નહીં."
            : "Are you sure you want to delete this BOM recipe? This action cannot be undone."}
        </p>
      </Modal>
    </div>
  );
}
