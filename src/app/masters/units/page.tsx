"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "../../../context/auth-context";
import { apiClient } from "../../../lib/api-client";
import { Modal } from "../../../components/ui/modal";
import { ImportWizardModal } from "../../../components/imports/import-wizard-modal";
import { ExportDropdown } from "../../../components/ui/export-dropdown";
import { ExportColumn, ExportMetadata } from "../../../lib/export/export-types";
import { ImportModuleType } from "@billing/shared-types";
import { DataTablePagination } from "../../../components/ui/data-table-pagination";
import { CustomSelect } from "@/components/ui/dropdown-system";
import {
  Scale,
  Droplets,
  Ruler,
  Package,
  Tag,
  Sparkles,
  AlertTriangle,
  X,
  Check,
  Info,
  AlertCircle,
} from "lucide-react";

export interface Unit {
  id: string;
  name: string;
  code: string;
  symbol?: string;
  uqcCode?: string;
  decimalPlaces: number;
  itemCount?: number;
  createdAt?: string;
}

// Official GST UQC Master list recommended by CBIC / GSTN
export interface GstPreset {
  name: string;
  nameGu: string;
  code: string;
  decimalPlaces: number;
  category: "weight" | "count" | "length" | "volume" | "packaging";
  description: string;
}

export const STANDARD_GST_PRESETS: GstPreset[] = [
  { name: "Pieces", nameGu: "નંગ (Pieces)", code: "PCS", decimalPlaces: 0, category: "count", description: "Standard piece count (garments, mobiles, items)" },
  { name: "Numbers", nameGu: "સંખ્યા (Numbers)", code: "NOS", decimalPlaces: 0, category: "count", description: "Numbered units (appliances, hardware)" },
  { name: "Boxes", nameGu: "બોક્સ (Boxes)", code: "BOX", decimalPlaces: 0, category: "packaging", description: "Carton/box packing (FMCG, medicines)" },
  { name: "Kilograms", nameGu: "કિલોગ્રામ (Kilograms)", code: "KGS", decimalPlaces: 2, category: "weight", description: "Standard metric weight (groceries, metals, grains)" },
  { name: "Grams", nameGu: "ગ્રામ (Grams)", code: "GMS", decimalPlaces: 2, category: "weight", description: "Small metric weight (spices, chemicals, jewelry)" },
  { name: "Quintal", nameGu: "ક્વિન્ટલ (Quintal)", code: "QTL", decimalPlaces: 2, category: "weight", description: "100 Kilograms (grains, agriculture commodities)" },
  { name: "Tonnes", nameGu: "ટન (Tonnes)", code: "TON", decimalPlaces: 2, category: "weight", description: "1000 Kilograms metric ton (industrial)" },
  { name: "Meters", nameGu: "મીટર (Meters)", code: "MTR", decimalPlaces: 2, category: "length", description: "Linear length (textiles, wires, pipes)" },
  { name: "Square Feet", nameGu: "સ્ક્વેર ફીટ (Sq. Feet)", code: "SQF", decimalPlaces: 2, category: "length", description: "Area measurement (tiles, ply, marble, glass)" },
  { name: "Square Meters", nameGu: "સ્ક્વેર મીટર (Sq. Meters)", code: "SQM", decimalPlaces: 2, category: "length", description: "Standard metric area" },
  { name: "Litres", nameGu: "લીટર (Litres)", code: "LTR", decimalPlaces: 2, category: "volume", description: "Liquid volume (oils, paints, chemicals)" },
  { name: "Millilitre", nameGu: "મિલીલીટર (Millilitre)", code: "MLT", decimalPlaces: 2, category: "volume", description: "Small liquid volume (syrups, perfume)" },
  { name: "Bags", nameGu: "થેલી / બેગ (Bags)", code: "BAG", decimalPlaces: 0, category: "packaging", description: "Sack/bag packing (cement, fertilizer, flour)" },
  { name: "Cartons", nameGu: "કાર્ટન (Cartons)", code: "CTN", decimalPlaces: 0, category: "packaging", description: "Corrugated boxes (bulk logistics)" },
  { name: "Bottles", nameGu: "બોટલ (Bottles)", code: "BTL", decimalPlaces: 0, category: "packaging", description: "Glass/plastic bottles" },
  { name: "Dozens", nameGu: "ડઝન (Dozens)", code: "DOZ", decimalPlaces: 0, category: "count", description: "12 units set" },
  { name: "Packs", nameGu: "પેકેટ્સ (Packs)", code: "PAC", decimalPlaces: 0, category: "packaging", description: "Retail packets and pouches" },
  { name: "Pairs", nameGu: "જોડી (Pairs)", code: "PRS", decimalPlaces: 0, category: "count", description: "Footwear, socks, gloves" },
  { name: "Sets", nameGu: "સેટ (Sets)", code: "SET", decimalPlaces: 0, category: "count", description: "Combo packs, dinner sets" },
  { name: "Rolls", nameGu: "રોલ્સ (Rolls)", code: "ROL", decimalPlaces: 0, category: "packaging", description: "Paper, plastic, foil rolls" },
];

function getCategoryInfo(code: string) {
  const c = code.toUpperCase();
  if (["KGS", "GMS", "QTL", "TON", "MTS"].includes(c)) {
    return {
      label: "Weight & Mass",
      labelGu: "વજન (Weight)",
      icon: <Scale className="w-4 h-4 text-[#1677E8]" />,
      badgeClass: "bg-blue-50 text-[#1677E8] border-[#BFDBFE]",
    };
  }
  if (["LTR", "MLT", "KLR", "CBM", "CCM", "UGS"].includes(c)) {
    return {
      label: "Volume & Liquid",
      labelGu: "પ્રવાહી (Volume)",
      icon: <Droplets className="w-4 h-4 text-cyan-700" />,
      badgeClass: "bg-cyan-50 text-cyan-700 border-cyan-200",
    };
  }
  if (["MTR", "CMS", "SQF", "SQM", "SQY", "YDS", "KME"].includes(c)) {
    return {
      label: "Length & Area",
      labelGu: "લંબાઈ / વિસ્તાર (Length)",
      icon: <Ruler className="w-4 h-4 text-emerald-700" />,
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }
  if (["BOX", "BAG", "CTN", "BTL", "PAC", "ROL", "CAN", "DRM", "TUB", "BDL"].includes(c)) {
    return {
      label: "Packaging",
      labelGu: "પેકેજિંગ (Packaging)",
      icon: <Package className="w-4 h-4 text-amber-700" />,
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    };
  }
  return {
    label: "Count & Unit",
    labelGu: "સંખ્યા (Count)",
    icon: <Tag className="w-4 h-4 text-purple-700" />,
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
  };
}

export default function UnitsPage() {
  const { lang, tenantContext, currentCompany } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<keyof Unit>("name");
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    code: "",
    decimalPlaces: 2,
  });

  // Delete Modal
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    decimalPlaces: 2,
  });

  const fetchUnits = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get("/masters/units");
      setUnits(
        Array.isArray(res)
          ? res.map((u: any) => ({
              ...u,
              code: u.symbol || u.code || u.uqcCode,
              itemCount: u.itemCount ?? ((u._count?.itemsPrimary || 0) + (u._count?.itemsSecondary || 0)),
            }))
          : [],
      );
    } catch (err: any) {
      setError(err.message || "Failed to load units.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchUnits();
    }
  }, [tenantContext.companyId, fetchUnits]);

  // Quick preset selection helper
  const handleSelectPreset = (p: GstPreset) => {
    setFormData({
      name: p.name,
      code: p.code,
      decimalPlaces: p.decimalPlaces,
    });
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await apiClient.post("/masters/units", {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        symbol: formData.code.trim().toUpperCase(),
        uqcCode: formData.code.trim().toUpperCase(),
        decimalPlaces: Number(formData.decimalPlaces) || 0,
      });

      setIsModalOpen(false);
      setFormData({ name: "", code: "", decimalPlaces: 2 });
      await fetchUnits();
    } catch (err: any) {
      setFormError(
        lang === "gu" && err.messageGujarati
          ? err.messageGujarati
          : err.message || "Failed to create unit."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAddPreset = async (p: GstPreset) => {
    setIsSubmitting(true);
    try {
      await apiClient.post("/masters/units", {
        name: p.name,
        code: p.code,
        symbol: p.code,
        uqcCode: p.code,
        decimalPlaces: p.decimalPlaces,
      });
      await fetchUnits();
    } catch (err: any) {
      setError(
        lang === "gu" && err.messageGujarati
          ? err.messageGujarati
          : err.message || `Failed to add ${p.name}.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (u: Unit) => {
    setEditingUnit(u);
    setEditFormData({
      name: u.name,
      code: u.code,
      decimalPlaces: u.decimalPlaces,
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      await apiClient.put(`/masters/units/${editingUnit.id}`, {
        name: editFormData.name.trim(),
        symbol: editFormData.code.trim().toUpperCase(),
        uqcCode: editFormData.code.trim().toUpperCase(),
        decimalPlaces: Number(editFormData.decimalPlaces) || 0,
      });

      setIsEditModalOpen(false);
      setEditingUnit(null);
      await fetchUnits();
    } catch (err: any) {
      setFormError(
        lang === "gu" && err.messageGujarati
          ? err.messageGujarati
          : err.message || "Failed to update unit."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUnit = async () => {
    if (!unitToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/masters/units/${unitToDelete.id}`);
      setUnitToDelete(null);
      await fetchUnits();
    } catch (err: any) {
      setError(
        lang === "gu" && err.messageGujarati
          ? err.messageGujarati
          : err.message || "Failed to delete unit."
      );
      setUnitToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDeleteUnits = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    setError(null);
    try {
      await apiClient.post("/masters/units/bulk-delete", {
        ids: Array.from(selectedIds),
      });
      setSelectedIds(new Set());
      setIsBulkDeleteModalOpen(false);
      await fetchUnits();
    } catch (err: any) {
      setError(
        lang === "gu" && err.messageGujarati
          ? err.messageGujarati
          : err.message || "Failed to delete selected units."
      );
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Selection helpers
  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredUnits.length && filteredUnits.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredUnits.map((u) => u.id)));
    }
  };

  const handleToggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Filtered and Sorted list
  const filteredUnits = useMemo(() => {
    let list = units.filter((u) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.code.toLowerCase().includes(q) ||
        (u.uqcCode && u.uqcCode.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (categoryFilter === "ALL") return true;
      const cat = getCategoryInfo(u.code);
      if (categoryFilter === "WEIGHT" && cat.label.includes("Weight")) return true;
      if (categoryFilter === "COUNT" && cat.label.includes("Count")) return true;
      if (categoryFilter === "PACKAGING" && cat.label.includes("Packaging")) return true;
      if (categoryFilter === "LENGTH" && cat.label.includes("Length")) return true;
      if (categoryFilter === "VOLUME" && cat.label.includes("Volume")) return true;
      return false;
    });

    list.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];
      if (typeof valA === "string") {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? Number(valA || 0) - Number(valB || 0) : Number(valB || 0) - Number(valA || 0);
    });

    return list;
  }, [units, searchQuery, categoryFilter, sortField, sortAsc]);

  // Pagination calculation
  const totalEntries = filteredUnits.length;
  const totalPages = Math.ceil(totalEntries / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedUnits = filteredUnits.slice(startIndex, startIndex + pageSize);

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = units.length;
    const decimalCount = units.filter((u) => u.decimalPlaces > 0).length;
    const wholeCount = units.filter((u) => u.decimalPlaces === 0).length;
    const totalItems = units.reduce((acc, u) => acc + (u.itemCount || 0), 0);
    return { total, decimalCount, wholeCount, totalItems };
  }, [units]);

  // Export metadata
  const exportColumns: ExportColumn[] = [
    { header: "Unit Name", key: "name", width: 25 },
    { header: "GST UQC Code", key: "code", width: 16 },
    { header: "Decimal Places", key: "decimalPlaces", type: "number", width: 16 },
    { header: "Assigned Items", key: "itemCount", type: "number", width: 16 },
  ];

  const exportMetadata: ExportMetadata = {
    title: "Units of Measurement (UOM) Master",
    titleGu: "માપનના એકમો યાદી",
    fileName: "units_of_measurement",
    sheetName: "Units",
    companyName: currentCompany?.legalName || currentCompany?.tradeName || "My Business",
  };

  const handleSort = (field: keyof Unit) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-6 max-w-[1720px] mx-auto pb-12">
      {/* ========================================================================= */}
      {/* 1. PAGE HEADER & QUICK ACTIONS */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
            <Link href="/masters/items" className="hover:text-[#1677E8] transition-colors">
              Inventory & Items
            </Link>
            <span>/</span>
            <span className="text-[#1677E8] font-semibold">Units of Measurement (UOM)</span>
          </div>
          <h1 className="text-[22px] font-semibold text-[#182230] tracking-tight">
            {lang === "gu" ? "માપનના એકમો (Units of Measurement)" : "Units of Measurement (UOM)"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {lang === "gu"
              ? "જીએસટી અને ઇ-ઇન્વોઇસિંગ માટે પ્રમાણિત યુનિટ કોડ્સ (KGS, BOX, NOS, PCS, MTR) મેનેજ કરો"
              : "Manage CBIC / GSTN compliant measurement units with decimal precision for invoices, stock and e-Invoicing."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick GST Presets button */}
          <button
            type="button"
            onClick={() => setIsPresetsModalOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1677E8] border border-[#BFDBFE] text-[13px] font-semibold rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#1677E8]" />
            <span>{lang === "gu" ? "જીએસટી પ્રીસેટ્સ" : "GST Presets"}</span>
          </button>

          {/* Import Excel button */}
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-[13px] font-medium rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>{lang === "gu" ? "એક્સેલ ઈમ્પોર્ટ" : "Import Excel"}</span>
          </button>

          {/* Add Custom Unit button */}
          <button
            type="button"
            onClick={() => {
              setFormData({ name: "", code: "", decimalPlaces: 0 });
              setFormError(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 bg-[#1677E8] hover:bg-[#1268D3] active:bg-[#0E5BB8] text-white text-[13px] font-medium rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
            </svg>
            <span>{lang === "gu" ? "નવો એકમ ઉમેરો" : "Add Custom Unit"}</span>
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 p-0.5 rounded cursor-pointer" aria-label="Dismiss error">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. EXECUTIVE KPI SUMMARY CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Units */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1677E8] flex items-center justify-center text-xl shrink-0 font-bold">
            <Ruler className="w-5 h-5 text-[#1677E8]" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {lang === "gu" ? "કુલ માપન એકમો" : "Total Units"}
            </p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums mt-0.5">{metrics.total}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Active in inventory master</p>
          </div>
        </div>

        {/* Fractional / Decimal Units */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-[#1677E8] flex items-center justify-center text-xl shrink-0 font-bold">
            <Scale className="w-5 h-5 text-[#1677E8]" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {lang === "gu" ? "દશાંશ વાળા એકમો" : "Weighable / Decimal"}
            </p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums mt-0.5">{metrics.decimalCount}</p>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">KGS, MTR, LTR (Precision &gt; 0)</p>
          </div>
        </div>

        {/* Discrete / Whole Units */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center text-xl shrink-0 font-bold">
            <Package className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {lang === "gu" ? "આખા એકમો (0 દશાંશ)" : "Whole / Countable"}
            </p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums mt-0.5">{metrics.wholeCount}</p>
            <p className="text-[11px] text-amber-600 font-medium mt-0.5">BOX, PCS, NOS (0 Decimals)</p>
          </div>
        </div>

        {/* Linked Products */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center text-xl shrink-0 font-bold">
            <Tag className="w-5 h-5 text-purple-700" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {lang === "gu" ? "જોડાયેલ પ્રોડક્ટ્સ" : "Linked Products"}
            </p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums mt-0.5">{metrics.totalItems}</p>
            <p className="text-[11px] text-purple-700 font-medium mt-0.5">Items currently assigned</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODERN UNITS TABLE CONTAINER */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Category Filter Chips Bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center gap-2 overflow-x-auto bg-slate-50/50">
          {[
            { id: "ALL", label: lang === "gu" ? "બધા એકમો" : "All Units", count: units.length },
            { id: "WEIGHT", label: lang === "gu" ? "વજન (Weight)" : "Weight & Mass", count: units.filter(u => getCategoryInfo(u.code).label.includes("Weight")).length },
            { id: "COUNT", label: lang === "gu" ? "સંખ્યા (Count)" : "Count & Discrete", count: units.filter(u => getCategoryInfo(u.code).label.includes("Count")).length },
            { id: "PACKAGING", label: lang === "gu" ? "પેકેજિંગ (Packaging)" : "Packaging & Boxes", count: units.filter(u => getCategoryInfo(u.code).label.includes("Packaging")).length },
            { id: "LENGTH", label: lang === "gu" ? "લંબાઈ / વિસ્તાર" : "Length & Area", count: units.filter(u => getCategoryInfo(u.code).label.includes("Length")).length },
            { id: "VOLUME", label: lang === "gu" ? "પ્રવાહી (Volume)" : "Volume & Liquid", count: units.filter(u => getCategoryInfo(u.code).label.includes("Volume")).length },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setCategoryFilter(cat.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                categoryFilter === cat.id
                  ? "bg-[#1677E8] text-white shadow-2xs"
                  : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200"
              }`}
            >
              <span>{cat.label}</span>
              <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                categoryFilter === cat.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
              }`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* Toolbar: Search, Bulk selection, Page Size & Export */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-3 flex-1 max-w-lg">
            {/* Search Box */}
            <div className="relative w-full">
              <svg
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={
                  lang === "gu"
                    ? "એકમનું નામ અથવા UQC કોડથી શોધો (e.g. KGS, BOX)..."
                    : "Search unit name, code, or decimals (e.g. Kilograms, BOX, KGS)..."
                }
                className="w-full pl-9 pr-8 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] focus:bg-white h-10 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 shrink-0 text-xs text-slate-500">
              <span className="hidden sm:inline">Show</span>
              <div className="w-20">
                <CustomSelect
                  size="sm"
                  value={String(pageSize)}
                  onChange={(val: any) => {
                    setPageSize(Number(val));
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: "10", label: "10" },
                    { value: "25", label: "25" },
                    { value: "50", label: "50" },
                    { value: "100", label: "100" },
                  ]}
                  triggerClassName="rounded-xl border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            {/* Bulk Selection Action Button */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 animate-in fade-in">
                <span className="text-xs font-semibold text-[#1677E8] bg-[#EFF6FF] px-2.5 py-1.5 rounded-xl border border-[#BFDBFE]">
                  {selectedIds.size} {lang === "gu" ? "પસંદ કરેલ" : "Selected"}
                </span>
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(true)}
                  className="h-10 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>{lang === "gu" ? "કાઢી નાખો" : "Delete Selected"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="h-10 px-2.5 text-xs text-slate-500 hover:text-slate-800"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Export Dropdown */}
            <ExportDropdown
              columns={exportColumns}
              data={filteredUnits}
              metadata={exportMetadata}
              lang={lang}
              buttonVariant="default"
              totalCount={filteredUnits.length}
            />
          </div>
        </div>

        {/* ================= TABLE ================= */}
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider select-none">
                {/* Checkbox */}
                <th className="py-3 px-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredUnits.length && filteredUnits.length > 0}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 accent-[#1677E8] focus:ring-[#1677E8] cursor-pointer"
                  />
                </th>

                {/* Unit Name */}
                <th
                  onClick={() => handleSort("name")}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{lang === "gu" ? "એકમનું નામ (Unit Name)" : "Unit Name"}</span>
                    <span className="text-slate-400 font-normal text-[10px]">
                      {sortField === "name" ? (sortAsc ? "▲" : "▼") : "↕"}
                    </span>
                  </div>
                </th>

                {/* UQC Code */}
                <th
                  onClick={() => handleSort("code")}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{lang === "gu" ? "જીએસટી UQC કોડ" : "GST UQC Code"}</span>
                    <span className="text-slate-400 font-normal text-[10px]">
                      {sortField === "code" ? (sortAsc ? "▲" : "▼") : "↕"}
                    </span>
                  </div>
                </th>

                {/* Decimal Precision */}
                <th
                  onClick={() => handleSort("decimalPlaces")}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{lang === "gu" ? "દશાંશ ચોકસાઈ" : "Decimal Precision"}</span>
                    <span className="text-slate-400 font-normal text-[10px]">
                      {sortField === "decimalPlaces" ? (sortAsc ? "▲" : "▼") : "↕"}
                    </span>
                  </div>
                </th>

                {/* Products Linked */}
                <th
                  onClick={() => handleSort("itemCount" as any)}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{lang === "gu" ? "જોડાયેલ આઇટમ્સ" : "Linked Items"}</span>
                    <span className="text-slate-400 font-normal text-[10px]">
                      {sortField === ("itemCount" as any) ? (sortAsc ? "▲" : "▼") : "↕"}
                    </span>
                  </div>
                </th>

                {/* Actions */}
                <th className="py-3.5 px-4 text-right pr-6">
                  <span>{lang === "gu" ? "ક્રિયાઓ (Actions)" : "Actions"}</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-[13px] text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-7 h-7 border-3 border-[#1677E8] border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-semibold text-slate-600">Loading measurement units...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedUnits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                      <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] text-[#1677E8] flex items-center justify-center">
                        <Ruler className="w-7 h-7" />
                      </div>
                      <p className="text-sm font-bold text-slate-900">
                        {searchQuery
                          ? `No units found matching "${searchQuery}"`
                          : lang === "gu"
                          ? "કોઈ માપન એકમો મળ્યા નથી"
                          : "No measurement units configured yet"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {searchQuery
                          ? "Try a different search term or reset the category filter above."
                          : "Click 'GST Presets' to add standard units or click 'Add Custom Unit'."}
                      </p>
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsPresetsModalOpen(true)}
                          className="px-3.5 py-2 bg-[#1677E8] text-white rounded-xl text-xs font-semibold shadow-xs hover:bg-[#1268D3] transition-colors cursor-pointer"
                        >
                          + Add Standard GST Units
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedUnits.map((u) => {
                  const cat = getCategoryInfo(u.code);
                  const isSelected = selectedIds.has(u.id);

                  return (
                    <tr
                      key={u.id}
                      onClick={() => handleOpenEditModal(u)}
                      className={`hover:bg-[#F8FAFC] transition-colors group cursor-pointer ${
                        isSelected ? "bg-[#EFF6FF]/60" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td
                        className="py-3.5 px-4 text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleRow(u.id);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(u.id)}
                          className="w-4 h-4 rounded border-slate-300 accent-[#1677E8] focus:ring-[#1677E8] cursor-pointer"
                        />
                      </td>

                      {/* Unit Name & Details */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-base shrink-0 font-bold ${cat.badgeClass}`}>
                            {cat.icon}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-2">
                              <span>{u.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono font-normal">
                                ({u.code})
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>{cat.label}</span>
                              <span>•</span>
                              <span>{u.decimalPlaces === 0 ? "Whole Items" : `${u.decimalPlaces} Decimals`}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* GST UQC Code */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-800 font-mono font-bold text-xs rounded-lg border border-slate-200 tabular-nums shadow-2xs">
                            {u.code}
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded inline-flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" />
                            <span>GST Approved</span>
                          </span>
                        </div>
                      </td>

                      {/* Decimal Precision */}
                      <td className="py-3.5 px-4 tabular-nums">
                        {u.decimalPlaces === 0 ? (
                          <div className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            <span className="font-semibold">0 Decimals</span>
                            <span className="text-[11px] text-slate-400">(Whole: 1, 2, 5...)</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            <span className="font-semibold">{u.decimalPlaces} Decimals</span>
                            <span className="text-[11px] text-slate-400">
                              ({u.decimalPlaces === 1 ? "1.5" : u.decimalPlaces === 2 ? "1.25" : "1.005"}...)
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Linked Products */}
                      <td className="py-3.5 px-4 tabular-nums">
                        {u.itemCount && u.itemCount > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <Package className="w-3.5 h-3.5 text-emerald-700" />
                            <span>{u.itemCount} {u.itemCount === 1 ? "Item" : "Items"}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">
                            0 Items (Unused)
                          </span>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td
                        className="py-3.5 px-4 text-right pr-6"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(u)}
                            className="h-8 px-2.5 text-xs font-semibold text-[#1677E8] bg-[#EFF6FF] hover:bg-[#1677E8] hover:text-white border border-[#BFDBFE] rounded-lg transition-all inline-flex items-center gap-1 cursor-pointer"
                            title="Edit Unit Properties"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            <span>{lang === "gu" ? "સુધારો" : "Edit"}</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => setUnitToDelete(u)}
                            className="h-8 px-2.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200 rounded-lg transition-all inline-flex items-center gap-1 cursor-pointer"
                            title={u.itemCount && u.itemCount > 0 ? "Unit is used by items" : "Delete Unit"}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>{lang === "gu" ? "કાઢી નાખો" : "Delete"}</span>
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
            currentPage={safePage}
            pageSize={pageSize}
            totalRecords={totalEntries}
            onPageChange={(p) => setCurrentPage(p)}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            pageSizeOptions={[10, 25, 50, 100]}
            lang={lang}
            showFirstLast
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL: STANDARD GST PRESETS QUICK-ADD */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isPresetsModalOpen}
        onClose={() => setIsPresetsModalOpen(false)}
        title={lang === "gu" ? "જીએસટી માન્ય સ્ટાન્ડર્ડ માપન એકમો" : "Official GST Standard Units (UQC)"}
        titleGujarati="CBIC / GSTN અધિકૃત યાદી"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            {lang === "gu"
              ? "ભારતીય જીએસટી અને ઈ-ઇન્વોઇસિંગ પોર્ટલ દ્વારા માન્ય પ્રમાણભૂત યુનિટ્સ. કોઈપણ યુનિટને 1-ક્લિકમાં તમારી કંપનીમાં ઉમેરો:"
              : "Official Indian GST Unique Quantity Codes (UQC). 1-click add any standard measurement unit to your business inventory:"}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[55vh] overflow-y-auto p-1">
            {STANDARD_GST_PRESETS.map((preset) => {
              const alreadyExists = units.some((u) => u.code.toUpperCase() === preset.code);
              const cat = getCategoryInfo(preset.code);

              return (
                <div
                  key={preset.code}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                    alreadyExists
                      ? "bg-emerald-50/40 border-emerald-200/80"
                      : "bg-white border-slate-200 hover:border-[#1677E8] hover:shadow-2xs"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg shrink-0">{cat.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {lang === "gu" ? preset.nameGu : preset.name}
                        </span>
                        <span className="px-1.5 py-0.2 bg-slate-100 border border-slate-200 rounded font-mono font-bold text-[10px] text-slate-800">
                          {preset.code}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {preset.decimalPlaces === 0 ? "0 Decimals (Whole)" : `${preset.decimalPlaces} Decimals`} • {preset.description}
                      </p>
                    </div>
                  </div>

                  {alreadyExists ? (
                    <span className="shrink-0 px-2 py-1 text-[11px] font-bold text-emerald-700 bg-white border border-emerald-200 rounded-lg shadow-2xs inline-flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Added</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleQuickAddPreset(preset)}
                      className="shrink-0 h-8 px-2.5 text-xs font-semibold text-white bg-[#1677E8] hover:bg-[#1268D3] rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      + Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => setIsPresetsModalOpen(false)}
              className="h-9 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* 5. MODAL: CREATE CUSTOM UNIT */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={lang === "gu" ? "નવો માપન એકમ ઉમેરો" : "Add Measurement Unit"}
        titleGujarati="જીએસટી સ્ટાન્ડર્ડ યુનિટ કોડ"
        maxWidth="md"
      >
        <form onSubmit={handleCreateUnit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {formError}
            </div>
          )}

          {/* Quick Preset Selector Chips */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Quick 1-Click GST Presets
            </label>
            <div className="flex flex-wrap gap-1.5">
              {STANDARD_GST_PRESETS.slice(0, 8).map((p) => (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    formData.code.toUpperCase() === p.code
                      ? "bg-[#1677E8] text-white border-[#1677E8] shadow-2xs"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                  }`}
                >
                  {p.name} ({p.code})
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1">
              Unit Full Name * (e.g. Kilograms, Pieces, Bags)
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Kilograms, Boxes, Meters"
              className="w-full text-[13px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] focus:bg-white h-10 transition-all"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1">
              GST UQC / Symbol Code * (e.g. KGS, PCS, BOX, MTR)
            </label>
            <input
              type="text"
              required
              maxLength={10}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g. KGS"
              className="w-full text-[13px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] focus:bg-white h-10 transition-all"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Required for GST Portal e-Way Bill and e-Invoice validation.
            </p>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1">
              Decimal Places Precision (0 to 4)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((dp) => (
                <button
                  key={dp}
                  type="button"
                  onClick={() => setFormData({ ...formData, decimalPlaces: dp })}
                  className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    Number(formData.decimalPlaces) === dp
                      ? "border-[#1677E8] bg-[#EFF6FF] text-[#1677E8] ring-1 ring-[#1677E8]/20"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div>{dp} Decimals</div>
                  <div className="text-[10px] font-normal text-slate-400 mt-0.5">
                    {dp === 0 ? "e.g. 1, 2" : dp === 1 ? "e.g. 1.5" : dp === 2 ? "e.g. 1.25" : "e.g. 1.005"}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">
              Use <strong>0</strong> for discrete items (Mobiles, Shirts, Boxes). Use <strong>2</strong> for groceries, chemicals, textiles (1.50 kg, 2.75 m).
            </p>
          </div>

          {/* Live Preview Box */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Invoice line item preview: </span>
            <div className="mt-1 font-mono text-[11px] text-[#1677E8] font-bold">
              Qty: {(10).toFixed(formData.decimalPlaces || 0)} {formData.code || "UNIT"} × Rate: ₹ 150.00 / {formData.code || "UNIT"} = ₹ {(10 * 150).toLocaleString("en-IN")}.00
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="h-9 px-3.5 text-[13px] font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.name || !formData.code}
              className="h-9 px-4 text-[13px] font-semibold text-white bg-[#1677E8] hover:bg-[#1268D3] disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {isSubmitting ? "Saving..." : "Save Unit"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* 6. MODAL: EDIT MEASUREMENT UNIT */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingUnit(null);
        }}
        title={lang === "gu" ? "માપન એકમ સુધારો" : "Edit Measurement Unit"}
        titleGujarati={editingUnit ? `${editingUnit.name} (${editingUnit.code})` : ""}
        maxWidth="md"
      >
        <form onSubmit={handleUpdateUnit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1">
              Unit Name *
            </label>
            <input
              type="text"
              required
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              className="w-full text-[13px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] focus:bg-white h-10 transition-all"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1">
              GST UQC Code *
            </label>
            <input
              type="text"
              required
              maxLength={10}
              value={editFormData.code}
              onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value.toUpperCase() })}
              className="w-full text-[13px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] focus:bg-white h-10 transition-all"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1">
              Decimal Precision
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((dp) => (
                <button
                  key={dp}
                  type="button"
                  onClick={() => setEditFormData({ ...editFormData, decimalPlaces: dp })}
                  className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    Number(editFormData.decimalPlaces) === dp
                      ? "border-[#1677E8] bg-[#EFF6FF] text-[#1677E8] ring-1 ring-[#1677E8]/20"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div>{dp} Decimals</div>
                  <div className="text-[10px] font-normal text-slate-400 mt-0.5">
                    {dp === 0 ? "Whole (1, 2)" : dp === 1 ? "1.5" : dp === 2 ? "1.25" : "1.005"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Usage Alert if used by items */}
          {editingUnit && editingUnit.itemCount && editingUnit.itemCount > 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>This unit is currently used by <strong>{editingUnit.itemCount} items</strong> in inventory. Changes will automatically reflect in those item records.</span>
            </div>
          ) : null}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingUnit(null);
              }}
              className="h-9 px-3.5 text-[13px] font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !editFormData.name || !editFormData.code}
              className="h-9 px-4 text-[13px] font-semibold text-white bg-[#1677E8] hover:bg-[#1268D3] disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {isSubmitting ? "Updating..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* 7. MODAL: DELETE CONFIRMATION WITH USAGE GUARD */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!unitToDelete}
        onClose={() => setUnitToDelete(null)}
        title={lang === "gu" ? "એકમ કાઢી નાખવાની ખાતરી" : "Confirm Delete Unit"}
        titleGujarati={unitToDelete ? `${unitToDelete.name} (${unitToDelete.code})` : ""}
        maxWidth="sm"
      >
        <div className="space-y-4">
          {unitToDelete && unitToDelete.itemCount && unitToDelete.itemCount > 0 ? (
            <div className="space-y-3">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                <p className="font-bold text-sm flex items-center gap-1.5 text-rose-900">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>Cannot Delete Unit</span>
                </p>
                <p>
                  Unit <strong>{unitToDelete.name} ({unitToDelete.code})</strong> is currently assigned to <strong>{unitToDelete.itemCount} item(s)</strong> in your inventory.
                </p>
                <p className="text-[11px] text-rose-700">
                  Deleting a unit assigned to active items is prohibited to prevent corrupting previous bills, purchases, and GST reports. Reassign those items to another unit first.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setUnitToDelete(null)}
                  className="h-9 px-4 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                {lang === "gu"
                  ? `શું તમે ખરેખર "${unitToDelete?.name}" (${unitToDelete?.code}) એકમને હંમેશા માટે કાઢી નાખવા માંગો છો? આ એકમ કોઈ આઇટમ સાથે જોડાયેલ નથી.`
                  : `Are you sure you want to delete unit "${unitToDelete?.name}" (${unitToDelete?.code})? This unit is not linked to any items and will be permanently removed.`}
              </p>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUnitToDelete(null)}
                  className="h-9 px-3.5 text-[13px] font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUnit}
                  disabled={isDeleting}
                  className="h-9 px-4 text-[13px] font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {isDeleting ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* 8. MODAL: BULK DELETE CONFIRMATION */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        title={lang === "gu" ? "પસંદ કરેલ એકમો કાઢી નાખો" : "Bulk Delete Units"}
        titleGujarati={`${selectedIds.size} ${lang === "gu" ? "એકમો પસંદ કરેલ છે" : "units selected"}`}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            {lang === "gu"
              ? `તમે ${selectedIds.size} એકમો કાઢી નાખવા માટે પસંદ કર્યા છે. જે એકમો કોઈપણ વસ્તુ સાથે જોડાયેલ હશે તે આપમેળે સુરક્ષિત રહેશે. શું તમે આગળ વધવા માંગો છો?`
              : `You have selected ${selectedIds.size} unit(s) for deletion. Any units actively assigned to items in your inventory will be protected. Are you sure you want to proceed?`}
          </p>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(false)}
              className="h-9 px-3.5 text-[13px] font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBulkDeleteUnits}
              disabled={isBulkDeleting}
              className="h-9 px-4 text-[13px] font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {isBulkDeleting
                ? "Deleting..."
                : lang === "gu"
                ? `હા, પસંદ કરેલ (${selectedIds.size}) કાઢી નાખો`
                : `Confirm Delete (${selectedIds.size})`}
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* 9. EXCEL / CSV IMPORT WIZARD MODAL */}
      {/* ========================================================================= */}
      <ImportWizardModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        preselectedModule={ImportModuleType.UNITS}
        onSuccess={fetchUnits}
      />
    </div>
  );
}
