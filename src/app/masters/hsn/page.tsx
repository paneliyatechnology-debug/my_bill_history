"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../../context/auth-context";
import { apiClient } from "../../../lib/api-client";
import { Modal } from "../../../components/ui/modal";
import { StatCard } from "../../../components/ui/stat-card";
import { ExportDropdown } from "../../../components/ui/export-dropdown";
import { ExportColumn, ExportFormat, ExportMetadata } from "../../../lib/export/export-types";
import { executeExport } from "../../../lib/export/export-engine";
import { DataTablePagination } from "../../../components/ui/data-table-pagination";
import { CustomSelect } from "@/components/ui/dropdown-system";
import { ImportWizardModal } from "../../../components/imports/import-wizard-modal";
import { ImportModuleType } from "@billing/shared-types";
import {
  FileSpreadsheet,
  Trash2,
  Edit2,
  Eye,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
} from "lucide-react";

interface HsnMasterItem {
  id: string;
  code: string;
  type: "HSN" | "SAC";
  description: string;
  descriptionGujarati?: string | null;
  chapter?: string | null;
  gstRate: number;
  cessRate?: number | null;
  isSystem: boolean;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount?: number;
}

interface HsnResponse {
  items: HsnMasterItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts?: {
    total: number;
    hsn: number;
    sac: number;
    active: number;
  };
}

const STATUTORY_GST_RATES = [0, 0.1, 0.25, 3, 5, 12, 18, 28];

export default function HsnMasterPage() {
  const { lang } = useAuth();

  // Listing State
  const [data, setData] = useState<HsnMasterItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [catalogCounts, setCatalogCounts] = useState<{ total: number; hsn: number; sac: number; active: number }>({
    total: 0,
    hsn: 0,
    sac: 0,
    active: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "HSN" | "SAC">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Bulk Delete Modal State
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    type: "HSN" as "HSN" | "SAC",
    description: "",
    descriptionGujarati: "",
    chapter: "",
    gstRate: 18,
    cessRate: 0,
    notes: "",
  });

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HsnMasterItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    code: "",
    type: "HSN" as "HSN" | "SAC",
    description: "",
    descriptionGujarati: "",
    chapter: "",
    gstRate: 18,
    cessRate: 0,
    notes: "",
  });

  // View Details Modal
  const [viewingItem, setViewingItem] = useState<HsnMasterItem | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  // Delete Modal State (Single)
  const [deletingItem, setDeletingItem] = useState<HsnMasterItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Success Notification Banner
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchHsnList = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (search.trim()) params.set("search", search.trim());
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      if (statusFilter === "ACTIVE") params.set("isActive", "true");
      if (statusFilter === "INACTIVE") params.set("isActive", "false");

      const res: HsnResponse = (await apiClient.get(`/masters/hsn?${params.toString()}`)) as any;
      setData(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
      if (res.counts) {
        setCatalogCounts(res.counts);
      } else {
        setCatalogCounts({
          total: res.total || 0,
          hsn: (res.items || []).filter((i) => i.type === "HSN").length,
          sac: (res.items || []).filter((i) => i.type === "SAC").length,
          active: (res.items || []).filter((i) => i.isActive).length,
        });
      }
    } catch (err: any) {
      setError(err.message || "Failed to load HSN/SAC master records.");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, typeFilter, statusFilter]);

  useEffect(() => {
    fetchHsnList();
  }, [fetchHsnList]);

  // Debounce search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
    setSelectedIds(new Set());
  };

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Selection handlers
  const isAllPageSelected = useMemo(() => {
    return data.length > 0 && data.every((item) => selectedIds.has(item.id));
  }, [data, selectedIds]);

  const isSomePageSelected = useMemo(() => {
    return data.some((item) => selectedIds.has(item.id)) && !isAllPageSelected;
  }, [data, selectedIds, isAllPageSelected]);

  const handleToggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (isAllPageSelected) {
      data.forEach((item) => next.delete(item.id));
    } else {
      data.forEach((item) => next.add(item.id));
    }
    setSelectedIds(next);
  };

  const handleToggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Create Custom HSN/SAC
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const code = formData.code.trim();
    if (!/^\d{2,8}$/.test(code)) {
      setFormError(
        lang === "gu"
          ? "કોડ ૨ થી ૮ અંકોનો આંકડાકીય નંબર હોવો જોઈએ (દા.ત. 1006 અથવા 998311)"
          : "Code must be a 2 to 8 digit number (e.g. 1006 or 998311).",
      );
      return;
    }
    if (!formData.description.trim()) {
      setFormError(
        lang === "gu"
          ? "વિગત (Description) આપવી ફરજિયાત છે."
          : "Description is required.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post("/masters/hsn", {
        code,
        type: formData.type,
        description: formData.description.trim(),
        descriptionGujarati: formData.descriptionGujarati.trim() || undefined,
        chapter: formData.chapter.trim() || undefined,
        gstRate: Number(formData.gstRate),
        cessRate: Number(formData.cessRate) || 0,
        notes: formData.notes.trim() || undefined,
      });

      setIsCreateOpen(false);
      setFormData({
        code: "",
        type: "HSN",
        description: "",
        descriptionGujarati: "",
        chapter: "",
        gstRate: 18,
        cessRate: 0,
        notes: "",
      });
      showNotification(
        lang === "gu"
          ? `નવો કોડ ${code} સફળતાપૂર્વક ઉમેરાયો.`
          : `HSN code ${code} created successfully.`,
      );
      await fetchHsnList();
    } catch (err: any) {
      setFormError(err.message || "Failed to create HSN code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item: HsnMasterItem) => {
    setEditingItem(item);
    setEditFormData({
      code: item.code,
      type: item.type,
      description: item.description,
      descriptionGujarati: item.descriptionGujarati || "",
      chapter: item.chapter || "",
      gstRate: Number(item.gstRate),
      cessRate: Number(item.cessRate || 0),
      notes: item.notes || "",
    });
    setFormError(null);
    setIsEditOpen(true);
  };

  // Update HSN/SAC
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setFormError(null);

    setIsSubmitting(true);
    try {
      await apiClient.put(`/masters/hsn/${editingItem.id}`, {
        type: editFormData.type,
        description: editFormData.description.trim(),
        descriptionGujarati: editFormData.descriptionGujarati.trim() || undefined,
        chapter: editFormData.chapter.trim() || undefined,
        gstRate: Number(editFormData.gstRate),
        cessRate: Number(editFormData.cessRate) || 0,
        notes: editFormData.notes.trim() || undefined,
      });

      setIsEditOpen(false);
      showNotification(
        lang === "gu"
          ? `કોડ ${editingItem.code} અપડેટ થયો.`
          : `Code ${editingItem.code} updated successfully.`,
      );
      await fetchHsnList();
    } catch (err: any) {
      setFormError(err.message || "Failed to update HSN code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Active Status
  const handleToggleStatus = async (item: HsnMasterItem) => {
    const nextStatus = !item.isActive;
    try {
      await apiClient.patch(`/masters/hsn/${item.id}/status`, { isActive: nextStatus });
      setData((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isActive: nextStatus } : i)),
      );
      showNotification(
        nextStatus
          ? `Code ${item.code} is now Active.`
          : `Code ${item.code} marked Inactive.`,
      );
    } catch (err: any) {
      setError(err.message || "Failed to change status.");
    }
  };

  // View Details with item reference count
  const handleViewDetails = async (item: HsnMasterItem) => {
    setViewingItem(item);
    setIsDetailsLoading(true);
    try {
      const full: any = await apiClient.get(`/masters/hsn/${item.id}`);
      setViewingItem(full);
    } catch (err) {
      console.warn("Could not fetch full HSN details:", err);
    } finally {
      setIsDetailsLoading(false);
    }
  };

  // Delete Single HSN/SAC
  const handleDeleteSubmit = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await apiClient.delete(`/masters/hsn/${deletingItem.id}`);
      const deletedCode = deletingItem.code;
      setDeletingItem(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deletingItem.id);
        return next;
      });
      showNotification(`Code ${deletedCode} deleted successfully.`);
      await fetchHsnList();
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete HSN code.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk Delete Selected HSN/SAC Codes
  const handleBulkDeleteSubmit = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    setBulkDeleteError(null);

    try {
      const res: any = await apiClient.post("/masters/hsn/bulk-delete", {
        ids: Array.from(selectedIds),
      });
      setIsBulkDeleteModalOpen(false);
      setSelectedIds(new Set());
      showNotification(`${res.deletedCount || selectedIds.size} HSN code(s) deleted successfully.`);
      await fetchHsnList();
    } catch (err: any) {
      setBulkDeleteError(err.message || "Failed to delete selected HSN codes.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleExportHsn = async (format: ExportFormat) => {
    if (data.length === 0) return;

    const columns: ExportColumn[] = [
      { header: "HSN / SAC Code", key: "code", type: "string" },
      { header: "Type", key: "type", type: "string" },
      { header: "Description", key: "description", type: "string" },
      { header: "GST Rate (%)", key: "gstRate", type: "number", align: "right" },
      { header: "Cess Rate (%)", key: "cessRate", type: "number", align: "right" },
      {
        header: "Status",
        type: "string",
        format: (_v, r) => (r.isActive ? "Active" : "Inactive"),
      },
    ];

    const metadata: ExportMetadata = {
      title: "HSN and SAC Code Master Catalog",
      fileName: "hsn_sac_codes_catalog",
      filterDescription: `Type: ${typeFilter}, Status: ${statusFilter}${search ? `, Search: "${search}"` : ""}`,
      totalCount: data.length,
      generatedAt: new Date().toLocaleString("en-IN"),
    };

    await executeExport(format, columns, data, metadata);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {lang === "gu" ? "એચએસએન અને એસએસી કોડ માસ્ટર" : "HSN & SAC Code Master"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {lang === "gu"
              ? "કેન્દ્રીય જીએસટી વર્ગીકરણ અને માન્ય કર સ્લેબ"
              : "Centralized GST goods & services classification and statutory tax slabs."}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Export Dropdown */}
          <ExportDropdown
            onExport={handleExportHsn}
            totalCount={data.length}
            disabled={data.length === 0 || isLoading}
            lang={lang}
            themeColor="saffron"
          />

          {/* Import Excel / CSV Button */}
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 h-9 px-3.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[13px] font-medium rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>{lang === "gu" ? "એક્સેલ ઈમ્પોર્ટ" : "Import Excel / CSV"}</span>
          </button>

          {/* Add HSN / SAC Code */}
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 h-9 px-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-[13px] font-medium rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>{lang === "gu" ? "નવો એચએસએન ઉમેરો" : "Add HSN/SAC Code"}</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-800 flex items-center justify-between shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Codes"
          titleGujarati="કુલ કોડ"
          value={catalogCounts.total || total}
          subtext="Catalogue entries"
          variant="brand"
          icon={
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
          }
        />
        <StatCard
          title="Goods (HSN)"
          titleGujarati="માલસામાન કોડ"
          value={catalogCounts.hsn}
          subtext="Commodities & products"
          variant="success"
          icon={
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />
        <StatCard
          title="Services (SAC)"
          titleGujarati="સેવા કોડ"
          value={catalogCounts.sac}
          subtext="Chapter 99 services"
          variant="default"
          icon={
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          title="Active Codes"
          titleGujarati="સક્રિય કોડ"
          value={catalogCounts.active}
          subtext="Ready for billing"
          variant="success"
          icon={
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          }
        />
      </div>

      {/* Bulk Action Bar (Visible when rows are selected) */}
      {selectedIds.size > 0 && (
        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-md flex items-center justify-between text-xs font-medium animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="bg-blue-600 text-white px-2 py-0.5 rounded-md font-bold text-[11px]">
              {selectedIds.size}
            </span>
            <span>
              {selectedIds.size === 1
                ? "1 HSN/SAC code selected"
                : `${selectedIds.size} HSN/SAC codes selected`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setBulkDeleteError(null);
                setIsBulkDeleteModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors cursor-pointer text-xs font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.size})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer text-xs"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Toolbar / Search / Filters */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder={
              lang === "gu"
                ? "કોડ અથવા વિગત શોધો (દા.ત. 1006, Rice, Software, 9983)..."
                : "Search by code or description (e.g. 1006, Rice, Software, 9983)..."
            }
            className="w-full px-3 py-2 pl-9 rounded-lg border border-slate-300 text-[13px] text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors h-10"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setTypeFilter("ALL");
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                typeFilter === "ALL"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => {
                setTypeFilter("HSN");
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                typeFilter === "HSN"
                  ? "bg-white text-emerald-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Goods (HSN)
            </button>
            <button
              type="button"
              onClick={() => {
                setTypeFilter("SAC");
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                typeFilter === "SAC"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Services (SAC)
            </button>
          </div>

          <div className="w-36">
            <CustomSelect
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val as any);
                setPage(1);
              }}
              options={[
                { value: "ALL", label: lang === "gu" ? "તમામ સ્ટેટસ" : "All Status" },
                { value: "ACTIVE", label: lang === "gu" ? "માત્ર સક્રિય" : "Active Only" },
                { value: "INACTIVE", label: lang === "gu" ? "માત્ર ઇન-એક્ટિવ" : "Inactive Only" },
              ]}
              triggerClassName="rounded-lg border-slate-200 bg-white text-slate-700 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {error && (
          <div className="p-4 bg-rose-50 border-b border-rose-100 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                {/* Select All Checkbox */}
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomePageSelected;
                    }}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                    title="Select all on this page"
                  />
                </th>
                <th className="py-3 px-4 w-32">
                  {lang === "gu" ? "કોડ (Code)" : "HSN/SAC Code"}
                </th>
                <th className="py-3 px-3 w-24">
                  {lang === "gu" ? "પ્રકાર" : "Type"}
                </th>
                <th className="py-3 px-4">
                  {lang === "gu" ? "વર્ણન (Description)" : "Description"}
                </th>
                <th className="py-3 px-3 text-center w-24">
                  {lang === "gu" ? "જીએસટી સ્લેબ" : "GST Rate"}
                </th>
                <th className="py-3 px-3 text-center w-28">
                  {lang === "gu" ? "સ્ટેટસ" : "Status"}
                </th>
                <th className="py-3 px-4 text-center w-32">
                  {lang === "gu" ? "ક્રિયાઓ" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="font-medium">Loading HSN / SAC catalogue...</p>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Search className="w-6 h-6" />
                    </div>
                    <p className="font-medium text-slate-700 text-sm mb-1">
                      No HSN / SAC codes match your search
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      Try adjusting the search query, clearing filters, or click
                      &quot;Add HSN/SAC Code&quot; to define a new entry.
                    </p>
                  </td>
                </tr>
              ) : (
                data.map((item) => {
                  const isChecked = selectedIds.has(item.id);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleViewDetails(item)}
                      className={`cursor-pointer hover:bg-slate-50/70 transition-colors ${
                        isChecked ? "bg-blue-50/40" : !item.isActive ? "opacity-60 bg-slate-50/30" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td
                        className="py-3 px-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectRow(item.id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                        />
                      </td>

                      {/* Code */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-slate-900 bg-slate-100 font-semibold text-xs px-2 py-0.5 rounded border border-slate-200">
                            {item.code}
                          </span>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-3 px-3">
                        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          {item.type}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 text-xs">
                          {item.description}
                        </div>
                        {lang === "gu" && item.descriptionGujarati && (
                          <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                            {item.descriptionGujarati}
                          </div>
                        )}
                        {item.chapter && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Chapter {item.chapter}
                          </div>
                        )}
                      </td>

                      {/* GST Rate */}
                      <td className="py-3 px-3 text-center">
                        <span className="tabular-nums font-semibold text-xs text-slate-900">
                          {Number(item.gstRate)}%
                        </span>
                        {item.cessRate && Number(item.cessRate) > 0 ? (
                          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                            +{Number(item.cessRate)}% Cess
                          </div>
                        ) : null}
                      </td>

                      {/* Status */}
                      <td
                        className="py-3 px-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                          title={item.isActive ? "Click to deactivate" : "Click to activate"}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.isActive ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          <span>{item.isActive ? "Active" : "Inactive"}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {/* View */}
                          <button
                            type="button"
                            onClick={() => handleViewDetails(item)}
                            title="View details"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit - Enabled for all */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit HSN/SAC"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete - Enabled for all */}
                          <button
                            type="button"
                            onClick={() => {
                              setDeletingItem(item);
                              setDeleteError(null);
                            }}
                            title="Delete HSN/SAC"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* STANDARDIZED GLOBAL PAGINATION COMPONENT */}
        <div className="bg-white border-t border-slate-200 px-4 py-1">
          <DataTablePagination
            currentPage={page}
            pageSize={limit}
            totalRecords={total}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(newSize) => {
              setLimit(newSize);
              setPage(1);
            }}
            pageSizeOptions={[10, 25, 50, 100]}
            loading={isLoading}
            lang={lang}
            showFirstLast
          />
        </div>
      </div>

      {/* CREATE MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={lang === "gu" ? "નવો એચએસએન / એસએસી કોડ ઉમેરો" : "Add HSN / SAC Code"}
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Code */}
            <div>
              <label className="block text-[12px] font-medium text-slate-700 mb-1">
                HSN / SAC Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={8}
                value={formData.code}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    code: e.target.value.replace(/\D/g, "").slice(0, 8),
                  })
                }
                placeholder="e.g. 1006 or 998311"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 h-10 font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                2 to 8 numeric digits
              </span>
            </div>

            {/* Type */}
            <div>
              <label className="block text-[12px] font-medium text-slate-700 mb-1">
                Classification Type <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "HSN" })}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    formData.type === "HSN"
                      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  HSN (Goods)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "SAC" })}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    formData.type === "SAC"
                      ? "bg-indigo-50 border-indigo-300 text-indigo-800"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  SAC (Services)
                </button>
              </div>
            </div>
          </div>

          {/* Description (English) */}
          <div>
            <label className="block text-[12px] font-medium text-slate-700 mb-1">
              Description (English) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Official statutory description of the goods or services"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 h-10"
            />
          </div>

          {/* Rates Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-slate-700 mb-1">
                GST Rate (%) <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.gstRate}
                onChange={(e) =>
                  setFormData({ ...formData, gstRate: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 h-10"
              >
                {STATUTORY_GST_RATES.map((rate) => (
                  <option key={rate} value={rate}>
                    {rate}%
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-slate-700 mb-1">
                Compensation Cess (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={formData.cessRate}
                onChange={(e) =>
                  setFormData({ ...formData, cessRate: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 h-10"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-slate-700 mb-1">
                Chapter / Section
              </label>
              <input
                type="text"
                value={formData.chapter}
                onChange={(e) =>
                  setFormData({ ...formData, chapter: e.target.value })
                }
                placeholder="e.g. 10 or 99"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 h-10"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[12px] font-medium text-slate-700 mb-1">
              Internal Business Notes
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Optional notes for invoicing or billing staff..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="h-9 px-4 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-xs disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Saving..." : "Save HSN Code"}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Code: ${editingItem?.code || ""}`}
        maxWidth="lg"
      >
        <form onSubmit={handleUpdateSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {formError}
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500">Classification:</span>{" "}
              <strong className="font-mono text-slate-900">{editingItem?.code}</strong>{" "}
              ({editingItem?.type})
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[12px] font-medium text-slate-700 mb-1">
              Description (English) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={editFormData.description}
              onChange={(e) =>
                setEditFormData({ ...editFormData, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 h-10"
            />
          </div>

          {/* GST and Cess */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-slate-700 mb-1">
                GST Rate (%) <span className="text-rose-500">*</span>
              </label>
              <select
                value={editFormData.gstRate}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    gstRate: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 h-10"
              >
                {STATUTORY_GST_RATES.map((rate) => (
                  <option key={rate} value={rate}>
                    {rate}%
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-slate-700 mb-1">
                Compensation Cess (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={editFormData.cessRate}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    cessRate: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 h-10"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-slate-700 mb-1">
                Chapter
              </label>
              <input
                type="text"
                value={editFormData.chapter}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, chapter: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 h-10"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[12px] font-medium text-slate-700 mb-1">
              Internal Notes
            </label>
            <textarea
              rows={2}
              value={editFormData.notes}
              onChange={(e) =>
                setEditFormData({ ...editFormData, notes: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="h-9 px-4 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-xs disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Updating..." : "Update Code"}
            </button>
          </div>
        </form>
      </Modal>

      {/* VIEW DETAILS MODAL */}
      <Modal
        isOpen={!!viewingItem}
        onClose={() => setViewingItem(null)}
        title={`Details: ${viewingItem?.code || ""}`}
        maxWidth="md"
      >
        {viewingItem && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-base font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded border border-slate-200">
                  {viewingItem.code}
                </span>
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  {viewingItem.type}
                </span>
              </div>
              <p className="text-slate-800 text-xs font-medium">
                {viewingItem.description}
              </p>
              {viewingItem.chapter && (
                <p className="text-[11px] text-slate-500">
                  Chapter: {viewingItem.chapter}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 block text-[11px]">GST Rate</span>
                <span className="text-base font-bold tabular-nums text-emerald-700 mt-0.5 block">
                  {Number(viewingItem.gstRate)}%
                </span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 block text-[11px]">Cess Rate</span>
                <span className="text-base font-bold tabular-nums text-slate-900 mt-0.5 block">
                  {Number(viewingItem.cessRate || 0)}%
                </span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 block text-[11px]">Status</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {viewingItem.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 block text-[11px]">
                  Linked Catalog Items
                </span>
                <span className="text-base font-bold tabular-nums text-slate-900 mt-0.5 block">
                  {isDetailsLoading
                    ? "..."
                    : viewingItem.itemCount !== undefined
                    ? `${viewingItem.itemCount} items`
                    : "0 items"}
                </span>
              </div>
            </div>

            {viewingItem.notes && (
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg">
                <span className="text-amber-800 font-semibold block text-[11px]">
                  Notes:
                </span>
                <p className="text-amber-900 mt-0.5">{viewingItem.notes}</p>
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 flex justify-between">
              <button
                type="button"
                onClick={() => {
                  const it = viewingItem;
                  setViewingItem(null);
                  handleOpenEdit(it);
                }}
                className="h-8 px-3 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Edit Code
              </button>
              <button
                type="button"
                onClick={() => setViewingItem(null)}
                className="h-8 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* SINGLE DELETE MODAL */}
      <Modal
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        title="Delete HSN / SAC Code"
        maxWidth="sm"
      >
        <div className="space-y-3 text-xs">
          {deleteError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{deleteError}</span>
            </div>
          )}

          <p className="text-slate-600">
            Are you sure you want to delete HSN/SAC code{" "}
            <strong className="font-mono text-slate-900">
              {deletingItem?.code}
            </strong>{" "}
            ({deletingItem?.description})?
          </p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]">
            If this code is linked to any active item in your catalog, the system will prevent deletion to preserve statutory transaction integrity.
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeletingItem(null)}
              className="h-9 px-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDeleteSubmit}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isDeleting ? "Deleting..." : "Delete Code"}
            </button>
          </div>
        </div>
      </Modal>

      {/* BULK DELETE MODAL */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        title="Delete Selected HSN / SAC Codes"
        maxWidth="sm"
      >
        <div className="space-y-3 text-xs">
          {bulkDeleteError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{bulkDeleteError}</span>
            </div>
          )}

          <p className="text-slate-600">
            Are you sure you want to permanently delete{" "}
            <strong className="text-slate-900">{selectedIds.size}</strong> selected HSN/SAC code(s)?
          </p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]">
            Any code currently linked to items in your catalog will be skipped or protected to maintain billing integrity.
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(false)}
              className="h-9 px-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isBulkDeleting}
              onClick={handleBulkDeleteSubmit}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isBulkDeleting ? "Deleting..." : `Delete ${selectedIds.size} Codes`}
            </button>
          </div>
        </div>
      </Modal>

      {/* EXCEL / CSV IMPORT WIZARD MODAL */}
      <ImportWizardModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        preselectedModule={ImportModuleType.HSN_MASTERS}
        onSuccess={() => {
          fetchHsnList();
          showNotification("HSN / SAC codes imported successfully!");
        }}
      />
    </div>
  );
}
