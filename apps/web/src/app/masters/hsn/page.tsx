"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/auth-context";
import { apiClient } from "../../../lib/api-client";
import { Modal } from "../../../components/ui/modal";
import { StatCard } from "../../../components/ui/stat-card";
import { Badge } from "../../../components/ui/badge";

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
}

const STATUTORY_GST_RATES = [0, 0.1, 0.25, 3, 5, 12, 18, 28];

export default function HsnMasterPage() {
  const { lang, tenantContext } = useAuth();

  // Listing State
  const [data, setData] = useState<HsnMasterItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "HSN" | "SAC">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Summary counts
  const [goodsCount, setGoodsCount] = useState(0);
  const [servicesCount, setServicesCount] = useState(0);
  const [officialCount, setOfficialCount] = useState(0);

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

  // Delete Modal State
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

      const res: HsnResponse = (await apiClient.get(`/hsn?${params.toString()}`)) as any;
      setData(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);

      // Fast counts from stats or current dataset
      if (page === 1 && !search && typeFilter === "ALL" && statusFilter === "ALL") {
        setOfficialCount(res.items.filter((i) => i.isSystem).length);
        setGoodsCount(res.items.filter((i) => i.type === "HSN").length);
        setServicesCount(res.items.filter((i) => i.type === "SAC").length);
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
  };

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Create Custom HSN/SAC
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Frontend validation
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
      await apiClient.post("/hsn", {
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

  // Update Custom HSN/SAC
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setFormError(null);

    setIsSubmitting(true);
    try {
      await apiClient.put(`/hsn/${editingItem.id}`, {
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
      await apiClient.patch(`/hsn/${item.id}/status`, { isActive: nextStatus });
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
      const full: any = await apiClient.get(`/hsn/${item.id}`);
      setViewingItem(full);
    } catch (err) {
      console.warn("Could not fetch full HSN details:", err);
    } finally {
      setIsDetailsLoading(false);
    }
  };

  // Delete Custom HSN/SAC
  const handleDeleteSubmit = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await apiClient.delete(`/hsn/${deletingItem.id}`);
      setDeletingItem(null);
      showNotification(`Code ${deletingItem.code} deleted.`);
      await fetchHsnList();
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete HSN code.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-border shadow-subtle">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {lang === "gu"
              ? "એચએસએન અને એસએસી કોડ માસ્ટર"
              : "HSN & SAC Code Master"}
          </h1>
          <p className="text-xs text-muted mt-1">
            {lang === "gu"
              ? "કેન્દ્રીય જીએસટી વર્ગીકરણ, માન્ય કર સ્લેબ અને કંપની કસ્ટમ કોડ્સ"
              : "Centralized GST goods & services classification, statutory tax slabs & company custom codes."}
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setIsCreateOpen(true);
          }}
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
          <span>
            {lang === "gu" ? "નવો એચએસએન ઉમેરો" : "Add Custom HSN/SAC"}
          </span>
        </button>
      </div>

      {/* Notification Banner */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-emerald-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900"
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
          value={total}
          subtext="Centralized catalogue"
          variant="brand"
          icon={
            <svg
              className="w-5 h-5 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
              />
            </svg>
          }
        />
        <StatCard
          title="Goods (HSN)"
          titleGujarati="માલસામાન કોડ"
          value={data.filter((i) => i.type === "HSN").length}
          subtext="Commodities & products"
          variant="success"
          icon={
            <svg
              className="w-5 h-5 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          }
        />
        <StatCard
          title="Services (SAC)"
          titleGujarati="સેવા કોડ"
          value={data.filter((i) => i.type === "SAC").length}
          subtext="Chapter 99 services"
          variant="default"
          icon={
            <svg
              className="w-5 h-5 text-indigo-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          }
        />
        <StatCard
          title="Verified Schedule"
          titleGujarati="સત્તાવાર જીએસટી"
          value={data.filter((i) => i.isSystem).length}
          subtext="Official GST rates"
          variant="success"
          icon={
            <svg
              className="w-5 h-5 text-emerald-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM13.707 7.707a1 1 0 00-1.414-1.414L9 9.586 7.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          }
        />
      </div>

      {/* Toolbar / Search / Filters */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
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
            className="w-full px-3 py-2 pl-9 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              &times;
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
            <button
              type="button"
              onClick={() => {
                setTypeFilter("ALL");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                typeFilter === "ALL"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {lang === "gu" ? "બધા" : "All"}
            </button>
            <button
              type="button"
              onClick={() => {
                setTypeFilter("HSN");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                typeFilter === "HSN"
                  ? "bg-white text-emerald-800 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {lang === "gu" ? "માલસામાન (HSN)" : "Goods (HSN)"}
            </button>
            <button
              type="button"
              onClick={() => {
                setTypeFilter("SAC");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                typeFilter === "SAC"
                  ? "bg-white text-indigo-800 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {lang === "gu" ? "સેવાઓ (SAC)" : "Services (SAC)"}
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="ALL">{lang === "gu" ? "બધા સ્ટેટસ" : "All Status"}</option>
            <option value="ACTIVE">{lang === "gu" ? "માત્ર એક્ટિવ" : "Active Only"}</option>
            <option value="INACTIVE">
              {lang === "gu" ? "માત્ર ઇન-એક્ટિવ" : "Inactive Only"}
            </option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {error && (
          <div className="p-4 bg-rose-50 border-b border-rose-100 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
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
                <th className="py-3 px-3 w-32">
                  {lang === "gu" ? "સ્ત્રોત (Scope)" : "Scope"}
                </th>
                <th className="py-3 px-3 text-center w-24">
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
                    <div className="inline-block w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="font-medium">Loading HSN / SAC catalogue...</p>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <p className="font-medium text-slate-700 text-sm mb-1">
                      No HSN / SAC codes match your search
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      Try adjusting the search query, clearing filters, or click
                      &quot;Add Custom HSN/SAC&quot; to define a new entry.
                    </p>
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      !item.isActive ? "opacity-60 bg-slate-50/40" : ""
                    }`}
                  >
                    {/* Code */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {item.code}
                        </span>
                      </div>
                    </td>

                    {/* Type Badge */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          item.type === "SAC"
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {item.type}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 text-xs">
                        {item.description}
                      </div>
                      {item.descriptionGujarati && (
                        <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                          {item.descriptionGujarati}
                        </div>
                      )}
                      {item.chapter && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {item.chapter}
                        </div>
                      )}
                    </td>

                    {/* GST Rate */}
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-900 font-mono font-bold text-xs rounded border border-slate-200">
                        {Number(item.gstRate)}%
                      </span>
                      {item.cessRate && Number(item.cessRate) > 0 ? (
                        <div className="text-[10px] text-amber-600 font-medium mt-0.5">
                          +{Number(item.cessRate)}% Cess
                        </div>
                      ) : null}
                    </td>

                    {/* Scope */}
                    <td className="py-3 px-3">
                      {item.isSystem ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <svg
                            className="w-3 h-3 text-emerald-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM13.707 7.707a1 1 0 00-1.414-1.414L9 9.586 7.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Official GST
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                          <svg
                            className="w-3 h-3 text-sky-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                          </svg>
                          Company
                        </span>
                      )}
                    </td>

                    {/* Active Status Toggle */}
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                          item.isActive
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.isActive ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        {item.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center justify-center gap-1">
                        {/* View Details */}
                        <button
                          type="button"
                          onClick={() => handleViewDetails(item)}
                          title="View Details"
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
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
                              strokeWidth={1.8}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.8}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </button>

                        {/* Edit (only company codes) */}
                        {!item.isSystem ? (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Custom Code"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
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
                                strokeWidth={1.8}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            title="Official GST schedule cannot be modified"
                            className="p-1.5 text-slate-300 cursor-not-allowed"
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
                                strokeWidth={1.8}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                              />
                            </svg>
                          </button>
                        )}

                        {/* Delete (only company codes) */}
                        {!item.isSystem && (
                          <button
                            type="button"
                            onClick={() => {
                              setDeletingItem(item);
                              setDeleteError(null);
                            }}
                            title="Delete Custom Code"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
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
                                strokeWidth={1.8}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              {lang === "gu" ? "પ્રતિ પાનું દર્શાવો:" : "Rows per page:"}
            </span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 bg-white border border-slate-300 rounded text-slate-700 font-medium"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-slate-400">|</span>
            <span>
              Showing{" "}
              <strong className="text-slate-700">
                {total === 0 ? 0 : (page - 1) * limit + 1}
              </strong>{" "}
              to{" "}
              <strong className="text-slate-700">
                {Math.min(page * limit, total)}
              </strong>{" "}
              of <strong className="text-slate-700">{total}</strong> codes
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              &larr; Prev
            </button>
            <span className="px-2 font-mono font-semibold text-slate-700">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* CREATE MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={lang === "gu" ? "નવો એચએસએન / એસએસી કોડ ઉમેરો" : "Add Custom HSN / SAC Code"}
        titleGujarati="કંપની કસ્ટમ કોડ"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Classification Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as any })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="HSN">{lang === "gu" ? "માલસામાન (Goods - HSN)" : "Goods (HSN)"}</option>
                <option value="SAC">{lang === "gu" ? "સેવાઓ (Services - SAC)" : "Services (SAC)"}</option>
              </select>
            </div>

            {/* Code */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {formData.type} Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder={formData.type === "SAC" ? "e.g. 998311" : "e.g. 84799090"}
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.replace(/\D/g, "") })
                }
                maxLength={8}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold tracking-wider text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <span className="text-[10px] text-slate-400">
                2 to 8 numeric digits. Leading zeros are strictly preserved.
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description (English) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Industrial Automation Machinery Parts"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Description Gujarati */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === "gu" ? "ગુજરાતી વિગત" : "Description (Gujarati - Optional)"}
            </label>
            <input
              type="text"
              placeholder={lang === "gu" ? "દા.ત. ઔદ્યોગિક મશીનરી સ્પેરપાર્ટ્સ" : "e.g. Industrial Machinery Spare Parts"}
              value={formData.descriptionGujarati}
              onChange={(e) =>
                setFormData({ ...formData, descriptionGujarati: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* GST Rate */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Applicable GST Rate <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.gstRate}
                onChange={(e) =>
                  setFormData({ ...formData, gstRate: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {STATUTORY_GST_RATES.map((r) => (
                  <option key={r} value={r}>
                    {r}% Standard GST Slab
                  </option>
                ))}
              </select>
            </div>

            {/* Cess Rate */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Compensation Cess (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.cessRate}
                onChange={(e) =>
                  setFormData({ ...formData, cessRate: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Chapter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chapter / Tariff Heading
            </label>
            <input
              type="text"
              placeholder="e.g. Chapter 84 - Nuclear Reactors, Boilers, Machinery"
              value={formData.chapter}
              onChange={(e) =>
                setFormData({ ...formData, chapter: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Internal Classification Notes
            </label>
            <textarea
              rows={2}
              placeholder="Specific vendor or notification references..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Save HSN Code"}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Code: ${editingItem?.code || ""}`}
        titleGujarati="કોડમાં ફેરફાર કરો"
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
            <span className="text-[11px] text-sky-700 font-medium bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
              Company Custom Master
            </span>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description (English) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={editFormData.description}
              onChange={(e) =>
                setEditFormData({ ...editFormData, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Description Gujarati */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description (Gujarati)
            </label>
            <input
              type="text"
              value={editFormData.descriptionGujarati}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  descriptionGujarati: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* GST Rate */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {STATUTORY_GST_RATES.map((r) => (
                  <option key={r} value={r}>
                    {r}% Standard GST Slab
                  </option>
                ))}
              </select>
            </div>

            {/* Cess Rate */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Compensation Cess (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={editFormData.cessRate}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    cessRate: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Chapter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chapter / Heading
            </label>
            <input
              type="text"
              value={editFormData.chapter}
              onChange={(e) =>
                setEditFormData({ ...editFormData, chapter: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              value={editFormData.notes}
              onChange={(e) =>
                setEditFormData({ ...editFormData, notes: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
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
        title={`HSN/SAC Details: ${viewingItem?.code || ""}`}
        titleGujarati="વિગતો"
        maxWidth="md"
      >
        {viewingItem && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-base font-bold text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200">
                  {viewingItem.code}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                    viewingItem.type === "SAC"
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}
                >
                  {viewingItem.type === "SAC"
                    ? "Services (SAC)"
                    : "Goods (HSN)"}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                  Description
                </span>
                <p className="text-slate-900 font-medium mt-0.5 text-sm">
                  {viewingItem.description}
                </p>
                {viewingItem.descriptionGujarati && (
                  <p className="text-slate-600 mt-1">
                    {viewingItem.descriptionGujarati}
                  </p>
                )}
              </div>

              {viewingItem.chapter && (
                <div>
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                    Tariff Classification
                  </span>
                  <p className="text-slate-700 mt-0.5">{viewingItem.chapter}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 block text-[11px]">
                  Applicable GST Slab
                </span>
                <span className="text-base font-bold font-mono text-emerald-700 mt-0.5 block">
                  {Number(viewingItem.gstRate)}%
                </span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 block text-[11px]">
                  Compensation Cess
                </span>
                <span className="text-base font-bold font-mono text-slate-900 mt-0.5 block">
                  {Number(viewingItem.cessRate || 0)}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 block text-[11px]">Origin Scope</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {viewingItem.isSystem
                    ? "Official Statutory GST"
                    : "Company Specific"}
                </span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 block text-[11px]">
                  Linked Catalog Items
                </span>
                <span className="text-base font-bold font-mono text-slate-900 mt-0.5 block">
                  {isDetailsLoading
                    ? "..."
                    : viewingItem.itemCount !== undefined
                    ? `${viewingItem.itemCount} items`
                    : "—"}
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

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        title="Delete Custom HSN Code?"
        titleGujarati="કોડ દૂર કરો"
        maxWidth="sm"
      >
        <div className="space-y-3 text-xs">
          {deleteError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {deleteError}
            </div>
          )}

          <p className="text-slate-600">
            Are you sure you want to permanently delete custom HSN code{" "}
            <strong className="font-mono text-slate-900">
              {deletingItem?.code}
            </strong>
            ?
          </p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]">
            Codes linked to items in your catalog cannot be deleted to preserve
            audit and transaction integrity.
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeletingItem(null)}
              className="px-3 py-1.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDeleteSubmit}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete Code"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
