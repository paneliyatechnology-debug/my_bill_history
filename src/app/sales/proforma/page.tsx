"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";
import { Modal } from "../../../components/ui/modal";
import { ExportDropdown } from "../../../components/ui/export-dropdown";
import { ExportColumn } from "../../../lib/export/export-types";
import { QuickSettingsModal, DEFAULT_QUICK_SETTINGS, QuickSettingsConfig } from "@/components/invoice/quick-settings-modal";
import { ShortcutsModal } from "@/components/invoice/shortcuts-modal";

interface ProformaInvoiceItem {
  id: string;
  itemId?: string;
  description?: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  totalAmount: number;
  item?: { id: string; name: string };
}

interface ProformaInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  status: "DRAFT" | "UNPAID" | "PARTIALLY_PAID" | "PAID" | "CANCELLED" | "CLOSED";
  category: "PROFORMA_INVOICE" | "TAX_INVOICE";
  partyId?: string;
  partyName?: string;
  party?: { id: string; name: string; gstin?: string; phone?: string };
  totalAmount: number;
  grandTotal?: number;
  items?: ProformaInvoiceItem[];
  notes?: string;
}

type DateRangePreset =
  | "LAST_365_DAYS"
  | "TODAY"
  | "YESTERDAY"
  | "THIS_WEEK"
  | "THIS_MONTH"
  | "LAST_30_DAYS"
  | "CURRENT_FY"
  | "PREVIOUS_FY"
  | "ALL";

const DATE_PRESET_LABELS: Record<DateRangePreset, string> = {
  LAST_365_DAYS: "Last 365 Days",
  TODAY: "Today",
  YESTERDAY: "Yesterday",
  THIS_WEEK: "This Week",
  THIS_MONTH: "This Month",
  LAST_30_DAYS: "Last 30 Days",
  CURRENT_FY: "Current FY",
  PREVIOUS_FY: "Previous FY",
  ALL: "All Time",
};

export default function ProformaInvoiceListingPage() {
  const router = useRouter();
  const { lang, tenantContext, currentCompany } = useAuth();

  const [invoices, setInvoices] = useState<ProformaInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters - Exact myBillBook layout
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("LAST_365_DAYS");
  const [statusFilter, setStatusFilter] = useState<"OPEN" | "ALL" | "CLOSED">("OPEN");

  // Sorting
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Actions dropdown
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  // Modals
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<ProformaInvoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<ProformaInvoice | null>(null);

  // Settings & Shortcuts
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [quickSettings, setQuickSettings] = useState<QuickSettingsConfig>(DEFAULT_QUICK_SETTINGS);

  // Keyboard shortcut F2: New Proforma Invoice
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        router.push("/sales/proforma/create");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveActionMenuId(null);
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get("/sales/invoices", {
        category: "PROFORMA_INVOICE",
        limit: 200,
      });
      setInvoices(extractList(res));
    } catch (err: any) {
      setError(err?.message || "Failed to load proforma invoices.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [tenantContext.companyId, fetchData]);

  // Date Filtering & Search
  const filteredInvoices = useMemo(() => {
    let result = [...invoices];

    // 1. Status Filter (Show Open Invoices vs All vs Closed)
    if (statusFilter === "OPEN") {
      result = result.filter(
        (inv) => inv.status !== "CANCELLED" && inv.status !== "CLOSED" && inv.status !== "PAID"
      );
    } else if (statusFilter === "CLOSED") {
      result = result.filter(
        (inv) => inv.status === "CANCELLED" || inv.status === "CLOSED" || inv.status === "PAID"
      );
    }

    // 2. Date Filter
    if (dateRangePreset !== "ALL") {
      const now = new Date();
      let start: Date | null = null;
      const end: Date | null = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      if (dateRangePreset === "TODAY") {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      } else if (dateRangePreset === "YESTERDAY") {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0);
      } else if (dateRangePreset === "THIS_WEEK") {
        const d = new Date(now);
        const day = d.getDay() || 7;
        d.setDate(d.getDate() - day + 1);
        start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      } else if (dateRangePreset === "THIS_MONTH") {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      } else if (dateRangePreset === "LAST_30_DAYS") {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      } else if (dateRangePreset === "LAST_365_DAYS") {
        const d = new Date(now);
        d.setDate(d.getDate() - 365);
        start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      } else if (dateRangePreset === "CURRENT_FY") {
        const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        start = new Date(yr, 3, 1, 0, 0, 0);
      } else if (dateRangePreset === "PREVIOUS_FY") {
        const yr = now.getMonth() >= 3 ? now.getFullYear() - 1 : now.getFullYear() - 2;
        start = new Date(yr, 3, 1, 0, 0, 0);
      }

      if (start) {
        result = result.filter((inv) => {
          const invDate = new Date(inv.invoiceDate);
          return invDate >= start! && (!end || invDate <= end);
        });
      }
    }

    // 3. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(q) ||
          (inv.party?.name && inv.party.name.toLowerCase().includes(q)) ||
          (inv.partyName && inv.partyName.toLowerCase().includes(q))
      );
    }

    // Sort by Date
    result.sort((a, b) => {
      const timeA = new Date(a.invoiceDate).getTime();
      const timeB = new Date(b.invoiceDate).getTime();
      return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [invoices, statusFilter, dateRangePreset, searchQuery, sortOrder]);

  // Convert Proforma Invoice to Tax Invoice
  const handleConvertToTaxInvoice = async (inv: ProformaInvoice) => {
    setActiveActionMenuId(null);
    try {
      await apiClient.post(`/sales/invoices/${inv.id}/convert-to-tax-invoice`, {});
      await fetchData();
      router.push(`/sales/invoices/${inv.id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to convert proforma invoice.");
    }
  };

  // Cancel Proforma Invoice
  const handleCancelSubmit = async () => {
    if (!selectedInvoice) return;
    try {
      await apiClient.post(`/sales/invoices/${selectedInvoice.id}/cancel`, {
        reason: cancelReason || "Cancelled by user",
      });
      setIsCancelModalOpen(false);
      setSelectedInvoice(null);
      await fetchData();
    } catch (err: any) {
      setError(err?.message || "Failed to cancel proforma invoice.");
    }
  };

  // Delete Proforma Invoice
  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/sales/invoices/${invoiceToDelete.id}`);
      setInvoiceToDelete(null);
      await fetchData();
    } catch (err: any) {
      setError(err?.message || "Failed to delete proforma invoice.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate Due In string
  const formatDueIn = (dueDate?: string) => {
    if (!dueDate) return "-";
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Due today";
    if (diffDays > 0) return `Due in ${diffDays} days`;
    return `Overdue by ${Math.abs(diffDays)} days`;
  };

  // Export Columns definition
  const exportColumns: ExportColumn[] = useMemo(
    () => [
      { key: "invoiceNumber", header: "Performa Invoice Number" },
      { key: "invoiceDate", header: "Date" },
      { key: "partyName", header: "Party Name" },
      { key: "dueIn", header: "Due In" },
      { key: "totalAmount", header: "Amount (₹)" },
      { key: "status", header: "Status" },
    ],
    []
  );

  const exportData = useMemo(() => {
    return filteredInvoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: new Date(inv.invoiceDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      partyName: inv.party?.name || inv.partyName || "Direct / Cash Customer",
      dueIn: formatDueIn(inv.dueDate),
      totalAmount: Number(inv.grandTotal ?? inv.totalAmount ?? 0).toFixed(2),
      status: inv.status,
    }));
  }, [filteredInvoices]);

  return (
    <div className="w-full flex-1 flex flex-col min-h-[calc(100vh-5.5rem)]">
      {/* Unified Canvas Card matching exact myBillBook UI */}
      <div className="bg-white rounded-lg border border-slate-200/90 shadow-2xs overflow-hidden flex-1 flex flex-col w-full">
        {/* 1. TOP HEADER: Proforma Invoice title on left, settings & shortcuts on right */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-transparent">
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">
            Proforma Invoice
          </h1>

          <div className="flex items-center gap-2">
            {/* Settings button with red notification dot */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="relative p-2 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Settings"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full" />
            </button>

            {/* Keyboard shortcut button */}
            <button
              type="button"
              onClick={() => setIsShortcutsOpen(true)}
              className="p-2 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Keyboard Shortcuts"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
                <line x1="6" y1="8" x2="6.01" y2="8"></line>
                <line x1="10" y1="8" x2="10.01" y2="8"></line>
                <line x1="14" y1="8" x2="14.01" y2="8"></line>
                <line x1="18" y1="8" x2="18.01" y2="8"></line>
                <line x1="6" y1="12" x2="6.01" y2="12"></line>
                <line x1="18" y1="12" x2="18.01" y2="12"></line>
                <line x1="8" y1="16" x2="16" y2="16"></line>
              </svg>
            </button>
          </div>
        </div>

        {/* 2. FILTER TOOLBAR (Search icon, Date filter, Show Open Invoices dropdown, and Create button) */}
        <div className="px-5 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Left filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input Box */}
            <div className="relative flex items-center">
              <span className="absolute left-3 text-slate-400 pointer-events-none">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-xs text-slate-800 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 w-44 sm:w-56"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Date Range Dropdown with Calendar Icon */}
            <div className="relative flex items-center">
              <span className="absolute left-2.5 text-slate-500 pointer-events-none">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </span>
              <select
                value={dateRangePreset}
                onChange={(e) => setDateRangePreset(e.target.value as DateRangePreset)}
                className="pl-8 pr-8 py-1.5 border border-slate-200 rounded-md text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none"
              >
                {Object.entries(DATE_PRESET_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <span className="absolute right-2.5 text-slate-400 pointer-events-none">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </span>
            </div>

            {/* Status Dropdown: Show Open Invoices */}
            <div className="relative flex items-center">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="pl-3 pr-7 py-1.5 border border-slate-200 rounded-md text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none"
              >
                <option value="ALL">Show All Invoices</option>
                <option value="OPEN">Show Open Invoices</option>
                <option value="CLOSED">Show Closed Invoices</option>
              </select>
              <span className="absolute right-2 text-slate-400 pointer-events-none text-[10px]">
                ▼
              </span>
            </div>

            {/* Export Dropdown */}
            <ExportDropdown
              columns={exportColumns}
              data={exportData}
              metadata={{
                title: "Proforma Invoices Register",
                fileName: "proforma_invoices_register",
                companyName: currentCompany?.tradeName || currentCompany?.legalName || "My Business",
                filterDescription: DATE_PRESET_LABELS[dateRangePreset],
                totalCount: filteredInvoices.length,
              }}
              lang={lang}
              themeColor="purple"
              buttonVariant="compact"
            />
          </div>

          {/* Right: Create Proforma Invoice button */}
          <Link
            href="/sales/proforma/create"
            className="inline-flex items-center justify-center px-4 py-2 bg-[#4338CA] hover:bg-[#3730A3] active:bg-[#312E81] text-white rounded-md text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer"
          >
            Create Proforma Invoice
          </Link>
        </div>

        {/* Error Alert if any */}
        {error && (
          <div className="mx-5 my-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-medium flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchData} className="text-rose-700 underline font-bold ml-2">
              Retry
            </button>
          </div>
        )}

        {/* 3. TABLE: Date ⇅ | Performa Invoice Number | Party Name | Due In | Amount | Status */}
        <div className="flex-1 overflow-x-auto mt-2">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#EDF2F7] border-y border-slate-200 text-slate-700 font-semibold text-xs">
                <th
                  onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
                  className="py-3 px-5 whitespace-nowrap cursor-pointer select-none hover:text-slate-900 w-36"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <span>Date</span>
                    <span className="text-slate-400 font-normal">⇅</span>
                  </span>
                </th>
                <th className="py-3 px-5 whitespace-nowrap">
                  Performa Invoice Number
                </th>
                <th className="py-3 px-5">Party Name</th>
                <th className="py-3 px-5 whitespace-nowrap">Due In</th>
                <th className="py-3 px-5 whitespace-nowrap">Amount</th>
                <th className="py-3 px-5 whitespace-nowrap">Status</th>
                <th className="py-3 px-5 text-right w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
                    <p className="mt-2 text-xs font-medium text-slate-500">Loading proforma invoices...</p>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                /* Empty state matching exact myBillBook screenshot */
                <tr>
                  <td colSpan={7} className="py-28 text-center">
                    <div className="inline-flex items-center justify-center mb-3">
                      {/* Signature myBillBook Voucher Empty State SVG */}
                      <svg
                        className="w-14 h-14 text-slate-400"
                        viewBox="0 0 48 48"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        {/* Document sheet */}
                        <path d="M12 6h24a2 2 0 0 1 2 2v32a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
                        {/* 3 lines on left */}
                        <line x1="16" y1="17" x2="22" y2="17" />
                        <line x1="16" y1="23" x2="22" y2="23" />
                        <line x1="16" y1="29" x2="22" y2="29" />
                        {/* Rupee icon with crossed out mark */}
                        <path d="M26 17h6M26 21h6M26 17v12M26 25h4a3 3 0 0 0 0-6h-4M26 25l5 6" />
                        <line x1="31" y1="12" x2="37" y2="18" strokeWidth="2.5" />
                        <line x1="37" y1="12" x2="31" y2="18" strokeWidth="2.5" />
                      </svg>
                    </div>
                    <p className="text-xs sm:text-sm font-normal text-slate-500">
                      No Transactions Matching the current filter
                    </p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isClosed = inv.status === "CLOSED" || inv.status === "CANCELLED" || inv.status === "PAID";
                  const total = Number(inv.grandTotal ?? inv.totalAmount ?? 0);

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => router.push(`/sales/invoices/${inv.id}`)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-5 whitespace-nowrap text-slate-700 font-medium">
                        {new Date(inv.invoiceDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      {/* Proforma Number */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {inv.invoiceNumber}
                        </span>
                      </td>

                      {/* Party Name */}
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-slate-900">
                          {inv.party?.name || inv.partyName || "Direct / Cash Customer"}
                        </div>
                        {inv.party?.gstin && (
                          <div className="text-[10px] text-indigo-600 font-mono">
                            GST: {inv.party.gstin}
                          </div>
                        )}
                      </td>

                      {/* Due In */}
                      <td className="py-3.5 px-5 whitespace-nowrap text-slate-600">
                        {formatDueIn(inv.dueDate)}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-5 whitespace-nowrap font-medium text-slate-900">
                        ₹ {total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                            isClosed
                              ? "bg-slate-100 text-slate-600 border border-slate-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {isClosed ? inv.status : "OPEN"}
                        </span>
                      </td>

                      {/* 3-dots action menu */}
                      <td
                        className="py-3.5 px-5 text-right whitespace-nowrap relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setActiveActionMenuId(activeActionMenuId === inv.id ? null : inv.id)
                          }
                          className="p-1.5 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-colors cursor-pointer text-sm font-bold"
                          title="Actions"
                        >
                          ⋮
                        </button>

                        {activeActionMenuId === inv.id && (
                          <div
                            className="absolute right-5 top-10 z-50 w-52 bg-white border border-slate-200 rounded-lg shadow-lg py-1 text-xs text-left"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleConvertToTaxInvoice(inv)}
                              className="w-full text-left flex items-center gap-2 px-3 py-2 text-indigo-700 hover:bg-indigo-50 font-semibold transition-colors cursor-pointer"
                            >
                              <span>🚀</span>
                              <span>Convert to Tax Invoice</span>
                            </button>

                            <Link
                              href={`/sales/invoices/${inv.id}`}
                              className="w-full text-left flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              <span>👁️</span>
                              <span>View / Print Proforma</span>
                            </Link>

                            {!isClosed && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveActionMenuId(null);
                                  setSelectedInvoice(inv);
                                  setIsCancelModalOpen(true);
                                }}
                                className="w-full text-left flex items-center gap-2 px-3 py-2 text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                              >
                                <span>✕</span>
                                <span>Cancel Proforma</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setActiveActionMenuId(null);
                                setInvoiceToDelete(inv);
                              }}
                              className="w-full text-left flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border-t border-slate-100"
                            >
                              <span>🗑️</span>
                              <span>Delete Proforma</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      {/* Quick Settings Modal */}
      <QuickSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={quickSettings}
        onSave={(newCfg) => setQuickSettings(newCfg)}
        initialTab="invoice"
      />

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />

      {/* Cancel Proforma Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Proforma Invoice"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Are you sure you want to cancel proforma invoice{" "}
            <strong>#{selectedInvoice?.invoiceNumber}</strong>?
          </p>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Cancellation Reason</label>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Quotation rejected or deal cancelled"
              className="w-full p-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(false)}
              className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleCancelSubmit}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
            >
              Cancel Proforma
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(invoiceToDelete)}
        onClose={() => setInvoiceToDelete(null)}
        title="Delete Proforma Invoice"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Are you sure you want to permanently delete proforma invoice{" "}
            <strong>#{invoiceToDelete?.invoiceNumber}</strong>?
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setInvoiceToDelete(null)}
              className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDeleteInvoice}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
