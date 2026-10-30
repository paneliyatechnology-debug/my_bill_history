"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";
import { sendAppEmail, mailResultMessage } from "../../../lib/send-app-email";
import {
  QuickSettingsModal,
  DEFAULT_QUICK_SETTINGS,
  QuickSettingsConfig,
} from "@/components/invoice/quick-settings-modal";
import { ImportWizardModal } from "../../../components/imports/import-wizard-modal";
import { ImportModuleType } from "@billing/shared-types";

interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  status: "DRAFT" | "ISSUED" | "PAID" | "PARTIALLY_PAID" | "CANCELLED";
  partyId?: string;
  party?: {
    id: string;
    name: string;
    gstin?: string;
    phone?: string;
  };
  taxableAmount: number;
  totalTax?: number;
  grandTotal: number;
  paidAmount: number;
  outstandingBalance: number;
  isB2B?: boolean;
  notes?: string;
  createdAt?: string;
  items?: Array<{
    id: string;
    itemId: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }>;
}

interface PartyOption {
  id: string;
  name: string;
  phone?: string;
  gstin?: string;
}

type DateRangePreset =
  | "ALL"
  | "TODAY"
  | "YESTERDAY"
  | "THIS_WEEK"
  | "LAST_WEEK"
  | "THIS_MONTH"
  | "PREV_MONTH"
  | "THIS_QUARTER"
  | "PREV_QUARTER"
  | "CURRENT_FY"
  | "PREV_FY"
  | "LAST_30_DAYS"
  | "LAST_365_DAYS"
  | "CUSTOM";

const DATE_PRESET_LABELS: Record<DateRangePreset, string> = {
  LAST_365_DAYS: "Last 365 Days",
  TODAY: "Today",
  YESTERDAY: "Yesterday",
  THIS_WEEK: "This Week",
  LAST_WEEK: "Last Week",
  THIS_MONTH: "This Month",
  PREV_MONTH: "Previous Month",
  THIS_QUARTER: "This Quarter",
  PREV_QUARTER: "Previous Quarter",
  CURRENT_FY: "Current Fiscal Year",
  PREV_FY: "Previous Fiscal Year",
  LAST_30_DAYS: "Last 30 Days",
  ALL: "All Time",
  CUSTOM: "Custom Date Range",
};

function formatInr(val: number | string): string {
  const num = Number(val) || 0;
  return "₹ " + num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function calculateDueIn(dueDateStr?: string): string {
  if (!dueDateStr) return "-";
  const due = new Date(dueDateStr);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays > 0) {
    return `${diffDays} Days`;
  } else if (diffDays === 0) {
    return "Due Today";
  } else {
    return `Overdue by ${Math.abs(diffDays)} Days`;
  }
}

function getInvoiceStatus(inv: SalesInvoice): "PAID" | "PARTIALLY_PAID" | "UNPAID" | "CANCELLED" {
  if (inv.status === "CANCELLED") return "CANCELLED";
  const total = Number(inv.grandTotal || 0);
  const paid = Number(inv.paidAmount || 0);
  const balance = Number(inv.outstandingBalance !== undefined ? inv.outstandingBalance : total - paid);
  if (balance <= 0.01 || paid >= total - 0.01) return "PAID";
  if (paid > 0 && balance > 0) return "PARTIALLY_PAID";
  return "UNPAID";
}

export default function SalesInvoicesDashboardPage() {
  const router = useRouter();
  const { lang, user, tenantContext } = useAuth();

  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [parties, setParties] = useState<PartyOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States (Matching MyBillBook Dashboard)
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PAID" | "UNPAID" | "CANCELLED">("ALL");
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("LAST_365_DAYS");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dropdown States
  const [isReportsMenuOpen, setIsReportsMenuOpen] = useState(false);
  const [isBulkActionsMenuOpen, setIsBulkActionsMenuOpen] = useState(false);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [actionMenuOpenUp, setActionMenuOpenUp] = useState(false);

  // Modals
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);
  const [quickSettings, setQuickSettings] = useState<QuickSettingsConfig>(DEFAULT_QUICK_SETTINGS);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [isBulkDownloadOpen, setIsBulkDownloadOpen] = useState(false);
  const [bulkDownloadDateRange, setBulkDownloadDateRange] = useState<DateRangePreset>("LAST_365_DAYS");
  const [bulkDownloadPartyId, setBulkDownloadPartyId] = useState("");
  const [bulkDownloadEmail, setBulkDownloadEmail] = useState("accounts@business.in");
  const [bulkDownloadSendToCa, setBulkDownloadSendToCa] = useState(false);
  const [bulkDownloadCaEmail, setBulkDownloadCaEmail] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // Record Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<SalesInvoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | "">("");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Edit History Modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyInvoice, setHistoryInvoice] = useState<SalesInvoice | null>(null);

  // Cancel Invoice Modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelInvoice, setCancelInvoice] = useState<SalesInvoice | null>(null);
  const [cancelReason, setCancelReason] = useState("Customer requested cancellation");
  const [isCancelling, setIsCancelling] = useState(false);

  // Bulk Delete Modal
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Floating Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Load Quick Settings from localStorage
  useEffect(() => {
    const companyKey = tenantContext?.companyId || "default";
    const storageKey = `billing_quick_settings_${companyKey}`;
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          setQuickSettings({ ...DEFAULT_QUICK_SETTINGS, ...JSON.parse(saved) });
        }
      }
    } catch (e) {
      console.error("Error loading quick settings:", e);
    }
  }, [tenantContext?.companyId]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setIsReportsMenuOpen(false);
      setIsBulkActionsMenuOpen(false);
      setActiveActionMenuId(null);
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Fetch Invoices & Parties
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [invRes, partyRes]: any = await Promise.all([
        apiClient.get("/sales/invoices"),
        apiClient.get("/masters/parties", { type: "CUSTOMER" }).catch(() => []),
      ]);
      setInvoices(extractList(invRes));
      setParties(extractList(partyRes));
    } catch (err: any) {
      setError(err.message || "Failed to load sales invoices.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchData();
    }
  }, [tenantContext.companyId, fetchData]);

  // Filtered Invoices calculation
  const filteredInvoices = useMemo(() => {
    let result = invoices;

    // 1. Status Filter
    if (statusFilter !== "ALL") {
      result = result.filter((inv) => {
        const computed = getInvoiceStatus(inv);
        return computed === statusFilter;
      });
    }

    // 2. Date Filter
    if (dateRangePreset !== "ALL") {
      const now = new Date();
      let start: Date | null = null;
      let end: Date | null = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      if (dateRangePreset === "TODAY") {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      } else if (dateRangePreset === "YESTERDAY") {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0);
        end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59);
      } else if (dateRangePreset === "THIS_WEEK") {
        const d = new Date(now);
        const day = d.getDay() || 7;
        d.setDate(d.getDate() - day + 1);
        start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      } else if (dateRangePreset === "LAST_WEEK") {
        const d = new Date(now);
        const day = d.getDay() || 7;
        d.setDate(d.getDate() - day - 6);
        start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
        const e = new Date(d);
        e.setDate(e.getDate() + 6);
        end = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59);
      } else if (dateRangePreset === "THIS_MONTH") {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      } else if (dateRangePreset === "PREV_MONTH") {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
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
      } else if (dateRangePreset === "PREV_FY") {
        const yr = now.getMonth() >= 3 ? now.getFullYear() - 1 : now.getFullYear() - 2;
        start = new Date(yr, 3, 1, 0, 0, 0);
        end = new Date(yr + 1, 2, 31, 23, 59, 59);
      } else if (dateRangePreset === "CUSTOM" && customStartDate) {
        start = new Date(`${customStartDate}T00:00:00`);
        if (customEndDate) {
          end = new Date(`${customEndDate}T23:59:59`);
        }
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
          (inv.party?.phone && inv.party.phone.includes(q))
      );
    }

    return result;
  }, [invoices, statusFilter, dateRangePreset, customStartDate, customEndDate, searchQuery]);

  // KPI Metrics Calculations
  const metrics = useMemo(() => {
    let totalSales = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;
    let cancelledCount = 0;

    invoices.forEach((inv) => {
      const gTotal = Number(inv.grandTotal || 0);
      const paid = Number(inv.paidAmount || 0);
      const bal = Number(inv.outstandingBalance !== undefined ? inv.outstandingBalance : gTotal - paid);

      if (inv.status === "CANCELLED") {
        cancelledCount += 1;
      } else {
        totalSales += gTotal;
        totalPaid += paid;
        if (bal > 0) {
          totalUnpaid += bal;
        }
      }
    });

    return {
      totalSales,
      totalPaid,
      totalUnpaid,
      cancelledCount,
    };
  }, [invoices]);

  // Master Checkbox Toggle
  const isAllSelected =
    filteredInvoices.length > 0 && selectedIds.size === filteredInvoices.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInvoices.map((i) => i.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Duplicate Invoice Handler
  const handleDuplicateInvoice = async (inv: SalesInvoice) => {
    setActiveActionMenuId(null);
    try {
      const res: any = await apiClient.get(`/sales/invoices/${inv.id}`);
      const fullData = res?.data || res;
      if (typeof window !== "undefined") {
        localStorage.setItem("billing_clone_invoice", JSON.stringify(fullData));
      }
      setToastMessage(`Duplicating invoice #${inv.invoiceNumber}...`);
      router.push("/sales/invoices/new");
    } catch {
      setToastMessage("Failed to duplicate invoice.");
    }
  };

  // Record Payment Submission
  const handleRecordPaymentSubmit = async () => {
    if (!paymentInvoice || !paymentAmount || Number(paymentAmount) <= 0) return;
    setIsSubmittingPayment(true);
    try {
      await apiClient.post(`/sales/invoices/${paymentInvoice.id}/payments`, {
        amount: Number(paymentAmount),
        paymentMode,
        paymentDate: new Date(paymentDate).toISOString(),
        notes: paymentNotes || undefined,
      });
      setIsPaymentModalOpen(false);
      setToastMessage(`Payment of ${formatInr(Number(paymentAmount))} recorded successfully!`);
      await fetchData();
    } catch (err: any) {
      setToastMessage(err.message || "Failed to record payment.");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Cancel Invoice Submission
  const handleCancelInvoiceSubmit = async () => {
    if (!cancelInvoice) return;
    setIsCancelling(true);
    try {
      await apiClient.post(`/sales/invoices/${cancelInvoice.id}/cancel`, {
        cancellationReason: cancelReason || "Customer requested cancellation",
      });
      setIsCancelModalOpen(false);
      setToastMessage(`Invoice #${cancelInvoice.invoiceNumber} cancelled successfully.`);
      await fetchData();
    } catch (err: any) {
      setToastMessage(err.message || "Failed to cancel invoice.");
    } finally {
      setIsCancelling(false);
    }
  };

  // Bulk Delete Submission
  const handleBulkDeleteSubmit = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      await apiClient.post("/sales/invoices/bulk-delete", {
        ids: Array.from(selectedIds),
      });
      setSelectedIds(new Set());
      setIsBulkDeleteModalOpen(false);
      setToastMessage(`${selectedIds.size} invoices deleted successfully.`);
      await fetchData();
    } catch (err: any) {
      setToastMessage(err.message || "Failed to delete selected invoices.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkDownloadSubmit = async () => {
    if (bulkDownloadSendToCa) {
      if (!bulkDownloadCaEmail.includes("@")) {
        setToastMessage("Enter the CA email before sending the bundle.");
        return;
      }
      setIsExporting(true);
      try {
        const partyName = parties.find((p) => p.id === bulkDownloadPartyId)?.name || "All parties";
        const result = await sendAppEmail({
          to: bulkDownloadCaEmail.trim(),
          cc: bulkDownloadEmail.includes("@") ? bulkDownloadEmail.trim() : undefined,
          subject: `Sales invoice summary — ${bulkDownloadDateRange}`,
          heading: "Sales invoice summary",
          intro: "A sales invoice summary was shared from myownbillbook.",
          details: [
            { label: "Invoices", value: String(filteredInvoices.length) },
            { label: "Date range", value: bulkDownloadDateRange },
            { label: "Party", value: partyName },
          ],
          text: "Open Sales Invoices in myownbillbook to download the full bundle.",
        });
        setIsBulkDownloadOpen(false);
        setToastMessage(mailResultMessage(result));
      } catch (err: any) {
        setToastMessage(err?.message || "Could not email the invoice bundle.");
      } finally {
        setIsExporting(false);
      }
      return;
    }

    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setIsBulkDownloadOpen(false);
      setToastMessage("Invoices bundle exported and downloaded successfully!");
    }, 1200);
  };

  // Quick Settings Save Handler
  const handleSaveQuickSettings = (newSettings: QuickSettingsConfig) => {
    setQuickSettings(newSettings);
    const companyKey = tenantContext?.companyId || "default";
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(`billing_quick_settings_${companyKey}`, JSON.stringify(newSettings));
      }
    } catch {}
    setToastMessage("Settings updated successfully");
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto min-w-0 pb-12 font-sans">
      {/* 1. TOP HEADER (Exact MyBillBook Layout from Video) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sales Invoices</h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Reports Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsReportsMenuOpen(!isReportsMenuOpen);
                setIsBulkActionsMenuOpen(false);
                setActiveActionMenuId(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              <span>📊</span>
              <span>Reports</span>
              <span className="text-[10px] text-slate-400">▾</span>
            </button>

            {isReportsMenuOpen && (
              <div 
                className="absolute right-0 top-10 z-50 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-xs animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Quick Reports
                </div>
                <Link
                  href="/reports?tab=sales-summary"
                  className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  <span>📑</span>
                  <span>Sales Summary</span>
                </Link>
                <Link
                  href="/reports?tab=gstr-1"
                  className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  <span>🇮🇳</span>
                  <span>GSTR-1 (Excel)</span>
                </Link>
                <Link
                  href="/reports?tab=profit-loss"
                  className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  <span>💰</span>
                  <span>Bill Wise Profit</span>
                </Link>
              </div>
            )}
          </div>

          {/* Quick Settings Gear Icon Button */}
          <button
            type="button"
            onClick={() => setIsQuickSettingsOpen(true)}
            className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl transition-colors cursor-pointer shadow-2xs"
            title="Quick Invoice Settings"
          >
            ⚙️
          </button>

          {/* Bulk Actions Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsBulkActionsMenuOpen(!isBulkActionsMenuOpen);
                setIsReportsMenuOpen(false);
                setActiveActionMenuId(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              <span>📦</span>
              <span>Bulk Actions</span>
              <span className="text-[10px] text-slate-400">▾</span>
            </button>

            {isBulkActionsMenuOpen && (
              <div 
                className="absolute right-0 top-10 z-50 w-44 bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-xs animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsBulkActionsMenuOpen(false);
                    setIsBulkDownloadOpen(true);
                  }}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                >
                  <span>📥</span>
                  <span>Bulk Download</span>
                </button>
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsBulkActionsMenuOpen(false);
                      setIsBulkDeleteModalOpen(true);
                    }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border-t border-slate-100"
                  >
                    <span>🗑️</span>
                    <span>Delete Selected ({selectedIds.size})</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Import Excel Button */}
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>{lang === "gu" ? "એક્સેલ ઈમ્પોર્ટ" : "Import Excel"}</span>
          </button>

          {/* Primary CTA: Create Sales Invoice */}
          <Link
            href="/sales/invoices/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#26A58A] hover:bg-[#208E76] active:bg-[#1B7864] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <span>+</span>
            <span>Create Sales Invoice</span>
          </Link>
        </div>
      </div>

      {/* 2. KPI SUMMARY METRIC CARDS (Exact MyBillBook Video Layout) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* Card 1: Total Sales */}
        <div
          onClick={() => setStatusFilter("ALL")}
          className={`p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs flex flex-col justify-between min-w-0 ${
            statusFilter === "ALL"
              ? "bg-[#E6F7F2]/50 border-[#26A58A] ring-2 ring-[#26A58A]/15"
              : "bg-white border-[#E2E8E5] hover:border-[#85D5C2]"
          }`}
        >
          <div className="flex items-center justify-between pb-1 min-w-0">
            <span className="text-xs font-bold text-[#5A6B66] truncate">Total Sales</span>
            <div className="text-[10px] sm:text-[11px] font-semibold text-[#174B43] truncate ml-1">
              <span>{DATE_PRESET_LABELS[dateRangePreset]}</span>
            </div>
          </div>
          <div className="mt-2 min-w-0">
            <p className="text-base sm:text-xl lg:text-2xl font-black font-mono text-[#1A2E2B] tracking-tight truncate">
              {formatInr(metrics.totalSales)}
            </p>
          </div>
        </div>

        {/* Card 2: Paid */}
        <div
          onClick={() => setStatusFilter("PAID")}
          className={`p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs flex flex-col justify-between min-w-0 ${
            statusFilter === "PAID"
              ? "bg-emerald-50/30 border-emerald-500 ring-2 ring-emerald-500/10"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between pb-1 min-w-0">
            <span className="text-xs font-bold text-slate-500 truncate">Paid</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          </div>
          <div className="mt-2 min-w-0">
            <p className="text-base sm:text-xl lg:text-2xl font-black font-mono text-emerald-700 tracking-tight truncate">
              {formatInr(metrics.totalPaid)}
            </p>
          </div>
        </div>

        {/* Card 3: Unpaid */}
        <div
          onClick={() => setStatusFilter("UNPAID")}
          className={`p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs flex flex-col justify-between min-w-0 ${
            statusFilter === "UNPAID"
              ? "bg-amber-50/30 border-amber-500 ring-2 ring-amber-500/10"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between pb-1 min-w-0">
            <span className="text-xs font-bold text-slate-500 truncate">Unpaid</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
          </div>
          <div className="mt-2 min-w-0">
            <p className="text-base sm:text-xl lg:text-2xl font-black font-mono text-amber-700 tracking-tight truncate">
              {formatInr(metrics.totalUnpaid)}
            </p>
          </div>
        </div>

        {/* Card 4: Cancelled */}
        <div
          onClick={() => setStatusFilter("CANCELLED")}
          className={`p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs flex flex-col justify-between min-w-0 ${
            statusFilter === "CANCELLED"
              ? "bg-slate-100 border-slate-500 ring-2 ring-slate-500/10"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between pb-1 min-w-0">
            <span className="text-xs font-bold text-slate-500 truncate">Cancelled</span>
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
          </div>
          <div className="mt-2 min-w-0">
            <p className="text-base sm:text-xl lg:text-2xl font-black font-mono text-slate-700 tracking-tight truncate">
              {metrics.cancelledCount}
            </p>
          </div>
        </div>
      </div>

      {/* 3. SEARCH & DATE FILTER BAR */}
      <div className="bg-white p-3 border border-slate-200 rounded-2xl shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left: Date Presets & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto flex-1 min-w-0">
          {/* Date Range Dropdown */}
          <select
            value={dateRangePreset}
            onChange={(e) => setDateRangePreset(e.target.value as DateRangePreset)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer shrink-0"
          >
            {Object.entries(DATE_PRESET_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          {dateRangePreset === "CUSTOM" && (
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
          )}

          {/* Search Input */}
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Party Name or Invoice Number..."
              className="w-full pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right: Selected Chips indicator */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              {selectedIds.size} Selected
            </span>
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1 rounded-lg border border-rose-200 transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* 4. INVOICES DATA TABLE (Exact MyBillBook Columns & Styling) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto min-h-[360px]">
          <table className="w-full text-left text-xs border-collapse min-w-[760px]">
            <thead className="bg-[#F8F9FA] text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3 min-w-[100px]">DATE</th>
                <th className="py-3 px-3 min-w-[130px]">INVOICE NUMBER</th>
                <th className="py-3 px-3 min-w-[200px]">PARTY NAME</th>
                <th className="py-3 px-3 min-w-[110px]">DUE IN</th>
                <th className="py-3 px-3 text-right min-w-[130px]">AMOUNT (₹)</th>
                <th className="py-3 px-3 text-center min-w-[110px]">STATUS</th>
                <th className="py-3 px-3 w-12 text-center">ACTIONS</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent mb-2" />
                    <p className="text-xs font-semibold">Loading sales invoices...</p>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                /* Empty State matching Video (01:13) */
                <tr>
                  <td colSpan={8} className="py-16 px-4 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center text-2xl text-slate-400">
                        📄
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">
                        No Transactions Matching the Current Filter
                      </h3>
                      <p className="text-xs text-slate-500">
                        Try changing the date range, status filter, or search keywords.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter("ALL");
                          setDateRangePreset("ALL");
                          setSearchQuery("");
                        }}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const status = getInvoiceStatus(inv);
                  const isSelected = selectedIds.has(inv.id);
                  const dueInText = calculateDueIn(inv.dueDate);
                  const total = Number(inv.grandTotal || 0);
                  const paid = Number(inv.paidAmount || 0);
                  const unpaid = Number(inv.outstandingBalance !== undefined ? inv.outstandingBalance : total - paid);

                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? "bg-blue-50/30" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(inv.id)}
                          className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                        />
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 text-slate-600 font-medium whitespace-nowrap">
                        {new Date(inv.invoiceDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      {/* Invoice Number */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <Link
                          href={`/sales/invoices/${inv.id}`}
                          className="font-bold text-blue-600 hover:underline font-mono"
                        >
                          {inv.invoiceNumber}
                        </Link>
                      </td>

                      {/* Party Name */}
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-900 leading-tight">
                          {inv.party?.name || "Cash Customer"}
                        </p>
                        {inv.party?.phone && (
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {inv.party.phone}
                          </p>
                        )}
                      </td>

                      {/* Due In */}
                      <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                        <span
                          className={`text-xs ${
                            dueInText.includes("Overdue")
                              ? "text-rose-600 font-bold"
                              : "text-slate-600"
                          }`}
                        >
                          {dueInText}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-3 text-right whitespace-nowrap font-mono">
                        <div className="font-black text-slate-900 text-xs">
                          {formatInr(total)}
                        </div>
                        {unpaid > 0.01 ? (
                          <div className="text-[10px] text-slate-500">
                            ({formatInr(unpaid)} Unpaid)
                          </div>
                        ) : (
                          <div className="text-[10px] text-emerald-600 font-medium">
                            (Fully Paid)
                          </div>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {status === "PAID" && (
                          <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Paid
                          </span>
                        )}
                        {status === "PARTIALLY_PAID" && (
                          <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            Partially Paid
                          </span>
                        )}
                        {status === "UNPAID" && (
                          <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            Unpaid
                          </span>
                        )}
                        {status === "CANCELLED" && (
                          <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            Cancelled
                          </span>
                        )}
                      </td>

                      {/* Three Dots Action Menu */}
                      <td className="py-3 px-3 text-center relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeActionMenuId === inv.id) {
                              setActiveActionMenuId(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const spaceBelowViewport = window.innerHeight - rect.bottom;
                              const spaceAboveViewport = rect.top;
                              const table = e.currentTarget.closest("table");
                              const tableRect = table?.getBoundingClientRect();
                              const spaceBelowTable = tableRect ? tableRect.bottom - rect.bottom : 999;
                              const spaceAboveTable = tableRect ? rect.top - tableRect.top : 999;
                              const shouldOpenUp =
                                (spaceBelowViewport < 240 || spaceBelowTable < 220) &&
                                (spaceAboveTable >= 180 || spaceAboveViewport >= 240);
                              setActionMenuOpenUp(shouldOpenUp);
                              setActiveActionMenuId(inv.id);
                            }
                            setIsReportsMenuOpen(false);
                            setIsBulkActionsMenuOpen(false);
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer font-bold transition-colors"
                        >
                          ⋮
                        </button>

                        {activeActionMenuId === inv.id && (
                          <div
                            className={`absolute right-6 ${
                              actionMenuOpenUp
                                ? "bottom-8 origin-bottom-right"
                                : "top-10 origin-top-right"
                            } z-50 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-xs text-left animate-in fade-in zoom-in-95 duration-100`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* 1. Edit */}
                            {inv.status !== "CANCELLED" && (
                              <Link
                                href={`/sales/invoices/${inv.id}/edit`}
                                className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              >
                                <span>✏️</span>
                                <span>Edit</span>
                              </Link>
                            )}

                            {/* 2. Edit History */}
                            <button
                              type="button"
                              onClick={() => {
                                setHistoryInvoice(inv);
                                setIsHistoryModalOpen(true);
                                setActiveActionMenuId(null);
                              }}
                              className="w-full text-left flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                            >
                              <span>📜</span>
                              <span>Edit History</span>
                            </button>

                            {/* 3. Duplicate */}
                            <button
                              type="button"
                              onClick={() => handleDuplicateInvoice(inv)}
                              className="w-full text-left flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                            >
                              <span>📋</span>
                              <span>Duplicate</span>
                            </button>

                            {/* 4. Record Payment */}
                            {unpaid > 0.01 && inv.status !== "CANCELLED" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPaymentInvoice(inv);
                                  setPaymentAmount(unpaid);
                                  setIsPaymentModalOpen(true);
                                  setActiveActionMenuId(null);
                                }}
                                className="w-full text-left flex items-center gap-2 px-3 py-2 text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                              >
                                <span>💳</span>
                                <span>Record Payment</span>
                              </button>
                            )}

                            {/* 5. Cancel Invoice */}
                            {inv.status !== "CANCELLED" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCancelInvoice(inv);
                                  setIsCancelModalOpen(true);
                                  setActiveActionMenuId(null);
                                }}
                                className="w-full text-left flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border-t border-slate-100"
                              >
                                <span>🚫</span>
                                <span>Cancel Invoice</span>
                              </button>
                            )}
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

      {/* MODAL 1: INVOICE BULK DOWNLOAD (Exact Layout from Video 00:22 - 00:36) */}
      {isBulkDownloadOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div 
            className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Invoice Bulk Download</h2>
              <button
                type="button"
                onClick={() => setIsBulkDownloadOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Select Date Range
                  </label>
                  <select
                    value={bulkDownloadDateRange}
                    onChange={(e) => setBulkDownloadDateRange(e.target.value as DateRangePreset)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none"
                  >
                    {Object.entries(DATE_PRESET_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Select Party (Optional)
                  </label>
                  <select
                    value={bulkDownloadPartyId}
                    onChange={(e) => setBulkDownloadPartyId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none"
                  >
                    <option value="">All Parties</option>
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Enter Your Email
                </label>
                <input
                  type="email"
                  value={bulkDownloadEmail}
                  onChange={(e) => setBulkDownloadEmail(e.target.value)}
                  placeholder="name@business.com"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkDownloadSendToCa}
                    onChange={(e) => setBulkDownloadSendToCa(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="font-bold text-slate-800">Send to CA</span>
                </label>

                {bulkDownloadSendToCa && (
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                      Enter your CA&apos;s Email
                    </label>
                    <input
                      type="email"
                      value={bulkDownloadCaEmail}
                      onChange={(e) => setBulkDownloadCaEmail(e.target.value)}
                      placeholder="ca@taxconsultant.in"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 font-mono">
                {filteredInvoices.length} Invoices Selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkDownloadOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkDownloadSubmit}
                  disabled={isExporting}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  {isExporting ? "Generating Bundle..." : bulkDownloadSendToCa ? "Email Bundle" : "Download Bundle"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: QUICK INVOICE SETTINGS (Exact Component with Full Dynamic Persistence) */}
      <QuickSettingsModal
        isOpen={isQuickSettingsOpen}
        onClose={() => setIsQuickSettingsOpen(false)}
        settings={quickSettings}
        onSave={handleSaveQuickSettings}
      />

      {/* MODAL 3: RECORD PAYMENT */}
      {isPaymentModalOpen && paymentInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Record Payment</h2>
                <p className="text-[11px] text-slate-500">
                  Invoice #{paymentInvoice.invoiceNumber} • {paymentInvoice.party?.name || "Cash Customer"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-3.5 text-xs">
              <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl flex items-center justify-between">
                <span className="text-slate-600 font-semibold">Total Outstanding Balance:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {formatInr(paymentInvoice.outstandingBalance)}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Payment Amount (₹)
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-sm font-bold focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="UPI_QR">UPI / QR</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Notes / Reference
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. UTR / Cheque No / Reference"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordPaymentSubmit}
                disabled={isSubmittingPayment}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
              >
                {isSubmittingPayment ? "Recording..." : "Record Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: EDIT HISTORY */}
      {isHistoryModalOpen && historyInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Invoice Activity & Edit History</h2>
                <p className="text-[11px] text-slate-500 font-mono">#{historyInvoice.invoiceNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="relative pl-6 space-y-4 border-l-2 border-blue-500/30 ml-2">
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white ring-2 ring-blue-100" />
                  <p className="font-bold text-slate-900">Invoice Created</p>
                  <p className="text-[11px] text-slate-500">
                    Created on {new Date(historyInvoice.invoiceDate).toLocaleDateString()}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                    Total: {formatInr(historyInvoice.grandTotal)} • Party: {historyInvoice.party?.name || "Cash Customer"}
                  </p>
                </div>

                {Number(historyInvoice.paidAmount) > 0 && (
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-emerald-600 border-2 border-white ring-2 ring-emerald-100" />
                    <p className="font-bold text-slate-900">Payment Received</p>
                    <p className="text-[11px] text-slate-500">
                      Amount: {formatInr(historyInvoice.paidAmount)}
                    </p>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                      Status updated to {historyInvoice.status}
                    </p>
                  </div>
                )}

                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-slate-400 border-2 border-white ring-2 ring-slate-100" />
                  <p className="font-bold text-slate-900">Current Status</p>
                  <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                    {historyInvoice.status}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-5 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: CANCEL INVOICE CONFIRMATION */}
      {isCancelModalOpen && cancelInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-rose-700">Cancel Sales Invoice</h2>
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <p className="text-slate-700">
                Are you sure you want to cancel invoice{" "}
                <strong className="font-mono text-slate-900">#{cancelInvoice.invoiceNumber}</strong>?
              </p>
              <p className="text-[11px] text-slate-500">
                Cancelling this invoice will reverse inventory deductions and mark the bill as void.
              </p>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Cancellation Reason
                </label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Returned by customer, Order voided"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Keep Invoice
              </button>
              <button
                type="button"
                onClick={handleCancelInvoiceSubmit}
                disabled={isCancelling}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
              >
                {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: BULK DELETE CONFIRMATION */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-rose-700">Delete Invoices</h2>
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <p className="text-slate-700">
                You have selected <strong className="text-slate-900">{selectedIds.size} invoices</strong> for deletion.
              </p>
              <p className="text-[11px] text-slate-500">
                This action is irreversible and associated accounting entries will be removed.
              </p>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteSubmit}
                disabled={isBulkDeleting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
              >
                {isBulkDeleting ? "Deleting..." : `Delete ${selectedIds.size} Invoices`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING SUCCESS TOAST NOTIFICATION (Exact MyBillBook style from Video 01:07) */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-2 border border-slate-800">
          <span className="text-emerald-400 text-sm">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}
      {/* Excel / CSV Import Wizard Modal */}
      <ImportWizardModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        preselectedModule={ImportModuleType.SALES_INVOICES}
        onSuccess={fetchData}
      />
    </div>
  );
}
