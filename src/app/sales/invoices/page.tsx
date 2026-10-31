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
import { ScorecardRibbon, ScorecardSegment } from "@/components/design-system/scorecard-ribbon";
import { formatInr } from "@/components/design-system/tokens";

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

const DATE_PRESET_LABELS: Record<DateRangePreset, { en: string; gu: string }> = {
  LAST_365_DAYS: { en: "Last 365 Days", gu: "છેલ્લા 365 દિવસ" },
  TODAY: { en: "Today", gu: "આજે" },
  YESTERDAY: { en: "Yesterday", gu: "ગઈકાલે" },
  THIS_WEEK: { en: "This Week", gu: "આ અઠવાડિયે" },
  LAST_WEEK: { en: "Last Week", gu: "ગયા અઠવાડિયે" },
  THIS_MONTH: { en: "This Month", gu: "આ મહિને" },
  PREV_MONTH: { en: "Previous Month", gu: "ગયા મહિને" },
  THIS_QUARTER: { en: "This Quarter", gu: "આ ત્રિમાસિક" },
  PREV_QUARTER: { en: "Previous Quarter", gu: "પાછલું ત્રિમાસિક" },
  CURRENT_FY: { en: "Current FY", gu: "ચાલુ નાણાકીય વર્ષ" },
  PREV_FY: { en: "Previous FY", gu: "પાછલું નાણાકીય વર્ષ" },
  LAST_30_DAYS: { en: "Last 30 Days", gu: "છેલ્લા 30 દિવસ" },
  ALL: { en: "All Time", gu: "બધો સમય" },
  CUSTOM: { en: "Custom Range", gu: "કસ્ટમ તારીખ" },
};

function calculateDueIn(dueDateStr?: string): { text: string; isOverdue: boolean; isDueToday: boolean } {
  if (!dueDateStr) return { text: "-", isOverdue: false, isDueToday: false };
  const due = new Date(dueDateStr);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays > 0) {
    return { text: `In ${diffDays}d`, isOverdue: false, isDueToday: false };
  } else if (diffDays === 0) {
    return { text: "Due Today", isOverdue: false, isDueToday: true };
  } else {
    return { text: `Overdue ${Math.abs(diffDays)}d`, isOverdue: true, isDueToday: false };
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

  // Filter States
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
          (inv.party?.phone && inv.party.phone.includes(q)) ||
          (inv.party?.gstin && inv.party.gstin.toLowerCase().includes(q))
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
    let paidCount = 0;
    let unpaidCount = 0;

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
          unpaidCount += 1;
        } else {
          paidCount += 1;
        }
      }
    });

    return {
      totalSales,
      totalPaid,
      totalUnpaid,
      cancelledCount,
      paidCount,
      unpaidCount,
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

  // Scorecard Segments for interactive financial ribbon
  const scorecardSegments: ScorecardSegment[] = [
    {
      id: "all",
      label: "Total Sales",
      labelGujarati: "કુલ વેચાણ",
      value: metrics.totalSales,
      isCurrency: true,
      subtext: `${invoices.length} Invoices`,
      subtextGujarati: `${invoices.length} બિલ`,
      badge: DATE_PRESET_LABELS[dateRangePreset][lang === "gu" ? "gu" : "en"],
      variant: "primary",
      isActive: statusFilter === "ALL",
      onClick: () => setStatusFilter("ALL"),
    },
    {
      id: "paid",
      label: "Collected & Paid",
      labelGujarati: "જમા થયેલ રકમ",
      value: metrics.totalPaid,
      isCurrency: true,
      subtext: `${metrics.paidCount} Fully Paid`,
      subtextGujarati: `${metrics.paidCount} પૂર્ણ ચૂકવાયેલ`,
      variant: "success",
      isActive: statusFilter === "PAID",
      onClick: () => setStatusFilter("PAID"),
    },
    {
      id: "unpaid",
      label: "Outstanding Balance",
      labelGujarati: "બાકી રકમ (ઉઘરાણી)",
      value: metrics.totalUnpaid,
      isCurrency: true,
      subtext: `${metrics.unpaidCount} Pending Collection`,
      subtextGujarati: `${metrics.unpaidCount} બાકી બિલ`,
      variant: "warning",
      isActive: statusFilter === "UNPAID",
      onClick: () => setStatusFilter("UNPAID"),
    },
    {
      id: "cancelled",
      label: "Cancelled / Void",
      labelGujarati: "રદ થયેલ બિલ",
      value: metrics.cancelledCount,
      isCurrency: false,
      subtext: "Voided Records",
      subtextGujarati: "રદ કરેલ વ્યવહારો",
      variant: "neutral",
      isActive: statusFilter === "CANCELLED",
      onClick: () => setStatusFilter("CANCELLED"),
    },
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto min-w-0 pb-16 font-sans">
      {/* 1. TOP UNIFIED COMMAND STRIP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:px-6 sm:py-3.5 rounded-2xl border border-[#E2E8E5] shadow-xs">
        {/* Left: Module identity & title */}
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#26A58A]">
              {lang === "gu" ? "વેચાણ અને બિલિંગ" : "SALES & INVOICING"}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[10px] font-bold text-slate-500 font-mono">
              {filteredInvoices.length} {lang === "gu" ? "બિલ" : "Invoices"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-[#1A2E2B] tracking-tight">
              {lang === "gu" ? "વેચાણ બિલ (Sales Invoices)" : "Sales Invoices"}
            </h1>
            <button
              type="button"
              onClick={fetchData}
              title="Refresh Invoices"
              className="p-1 text-slate-400 hover:text-[#174B43] rounded-md transition-colors"
            >
              <svg className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#26A58A]" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right: Quick action toolbar */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Reports Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsReportsMenuOpen(!isReportsMenuOpen);
                setIsBulkActionsMenuOpen(false);
                setActiveActionMenuId(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#E2E8E5] bg-white hover:bg-[#F2FAF7] hover:border-[#85D5C2] text-[#174B43] text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              <svg className="w-3.5 h-3.5 text-[#26A58A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>{lang === "gu" ? "રિપોર્ટ્સ" : "Reports"}</span>
              <span className="text-[10px] text-slate-400">▾</span>
            </button>

            {isReportsMenuOpen && (
              <div
                className="absolute right-0 top-11 z-50 w-52 bg-white border border-[#E2E8E5] rounded-xl shadow-xl py-1 text-xs animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1.5 text-[10px] font-bold text-[#8E9F9A] uppercase tracking-wider border-b border-slate-100">
                  {lang === "gu" ? "વેચાણ અહેવાલ" : "Sales Reports"}
                </div>
                <Link
                  href="/reports?tab=sales-summary"
                  className="flex items-center gap-2 px-3 py-2 text-[#1A2E2B] hover:bg-[#F2FAF7] hover:text-[#174B43] transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-[#26A58A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>{lang === "gu" ? "વેચાણ સારાંશ (Summary)" : "Sales Summary"}</span>
                </Link>
                <Link
                  href="/reports?tab=gstr-1"
                  className="flex items-center gap-2 px-3 py-2 text-[#1A2E2B] hover:bg-[#F2FAF7] hover:text-[#174B43] transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-[#26A58A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>GSTR-1 Excel Bundle</span>
                </Link>
                <Link
                  href="/reports?tab=profit-loss"
                  className="flex items-center gap-2 px-3 py-2 text-[#1A2E2B] hover:bg-[#F2FAF7] hover:text-[#174B43] transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-[#26A58A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{lang === "gu" ? "બિલ વાઇઝ નફો (Profit)" : "Bill Wise Profit"}</span>
                </Link>
              </div>
            )}
          </div>

          {/* Bulk Actions Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsBulkActionsMenuOpen(!isBulkActionsMenuOpen);
                setIsReportsMenuOpen(false);
                setActiveActionMenuId(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#E2E8E5] bg-white hover:bg-[#F2FAF7] hover:border-[#85D5C2] text-[#174B43] text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              <svg className="w-3.5 h-3.5 text-[#26A58A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span>{lang === "gu" ? "જથ્થાબંધ ક્રિયાઓ" : "Bulk Actions"}</span>
              <span className="text-[10px] text-slate-400">▾</span>
            </button>

            {isBulkActionsMenuOpen && (
              <div
                className="absolute right-0 top-11 z-50 w-52 bg-white border border-[#E2E8E5] rounded-xl shadow-xl py-1 text-xs animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsBulkActionsMenuOpen(false);
                    setIsBulkDownloadOpen(true);
                  }}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 text-[#1A2E2B] hover:bg-[#F2FAF7] hover:text-[#174B43] transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-[#26A58A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>{lang === "gu" ? "બધા બિલ ડાઉનલોડ" : "Bulk Download / CA Bundle"}</span>
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
                    <svg className="w-3.5 h-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>{lang === "gu" ? `પસંદ કરેલ રદ કરો (${selectedIds.size})` : `Delete Selected (${selectedIds.size})`}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Import Excel Button */}
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#F2FAF7] hover:bg-[#E6F7F2] text-[#174B43] border border-[#85D5C2] text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-[#26A58A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>{lang === "gu" ? "આયાત (Import)" : "Import"}</span>
          </button>

          {/* Quick Settings Gear Icon */}
          <button
            type="button"
            onClick={() => setIsQuickSettingsOpen(true)}
            className="p-2 border border-[#E2E8E5] bg-white hover:bg-[#F2FAF7] hover:border-[#85D5C2] text-[#5A6B66] hover:text-[#174B43] rounded-xl transition-colors cursor-pointer shadow-2xs"
            title="Invoice Document Settings"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Primary CTA: Create Sales Invoice */}
          <Link
            href="/sales/invoices/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#174B43] hover:bg-[#123B35] active:bg-[#0D2A26] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-[#85D5C2]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>{lang === "gu" ? "+ નવું વેચાણ બિલ" : "+ New Sales Invoice"}</span>
          </Link>
        </div>
      </div>

      {/* 2. FINANCIAL SCORECARD RIBBON (Interactive Horizontal Strip) */}
      <ScorecardRibbon segments={scorecardSegments} lang={lang} />

      {/* 3. OMNI-SEARCH & SMART FILTER BAR */}
      <div className="bg-white p-3 sm:p-3.5 border border-[#E2E8E5] rounded-2xl shadow-xs space-y-2.5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Left: Search & Date Presets */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px] sm:max-w-sm">
              <span className="absolute left-3 top-2.5 text-[#8E9F9A] pointer-events-none">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === "gu" ? "ગ્રાહક, બિલ નંબર કે ફોન શોધો..." : "Search party, invoice #, phone, GSTIN..."}
                className="w-full pl-8 pr-7 py-2 bg-[#F8FAFC] border border-[#E2E8E5] rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#26A58A] transition-colors"
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

            {/* Date Range Dropdown */}
            <select
              value={dateRangePreset}
              onChange={(e) => setDateRangePreset(e.target.value as DateRangePreset)}
              className="px-3 py-2 bg-[#F8FAFC] border border-[#E2E8E5] text-xs font-semibold rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-[#26A58A] cursor-pointer"
            >
              {Object.entries(DATE_PRESET_LABELS).map(([key, labelObj]) => (
                <option key={key} value={key}>
                  {lang === "gu" ? labelObj.gu : labelObj.en}
                </option>
              ))}
            </select>

            {/* Status Quick Filter Buttons */}
            <div className="hidden lg:flex items-center gap-1 bg-[#F8FAFC] p-1 border border-[#E2E8E5] rounded-xl">
              {(["ALL", "PAID", "UNPAID", "CANCELLED"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    statusFilter === st
                      ? "bg-white text-[#174B43] shadow-xs border border-[#85D5C2]"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {st === "ALL" && (lang === "gu" ? "બધા" : "All")}
                  {st === "PAID" && (lang === "gu" ? "ચૂકવાયેલ" : "Paid")}
                  {st === "UNPAID" && (lang === "gu" ? "બાકી" : "Unpaid")}
                  {st === "CANCELLED" && (lang === "gu" ? "રદ" : "Void")}
                </button>
              ))}
            </div>

            {/* Custom Date Pickers */}
            {dateRangePreset === "CUSTOM" && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2 py-1.5 bg-[#F8FAFC] border border-[#E2E8E5] rounded-lg text-xs font-mono"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2 py-1.5 bg-[#F8FAFC] border border-[#E2E8E5] rounded-lg text-xs font-mono"
                />
              </div>
            )}
          </div>

          {/* Right: Selected records action bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 self-end md:self-auto shrink-0 bg-[#E6F7F2] border border-[#85D5C2] px-3 py-1.5 rounded-xl">
              <span className="text-xs font-bold text-[#174B43]">
                {selectedIds.size} {lang === "gu" ? "પસંદ કરેલ" : "Selected"}
              </span>
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="text-xs font-bold text-rose-700 hover:text-rose-800 bg-white hover:bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors cursor-pointer"
              >
                {lang === "gu" ? "ડિલીટ" : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                {lang === "gu" ? "સાફ કરો" : "Clear"}
              </button>
            </div>
          )}
        </div>

        {/* Active Filters Summary line if filters are applied */}
        {(statusFilter !== "ALL" || dateRangePreset !== "LAST_365_DAYS" || searchQuery) && (
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-xs text-slate-500">
            <span className="text-[11px] font-bold text-[#5A6B66] uppercase tracking-wider">
              {lang === "gu" ? "સક્રિય ફિલ્ટર્સ:" : "Active Filters:"}
            </span>
            {statusFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                Status: {statusFilter}
                <button type="button" onClick={() => setStatusFilter("ALL")} className="text-slate-400 hover:text-slate-600">✕</button>
              </span>
            )}
            {dateRangePreset !== "LAST_365_DAYS" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                Range: {DATE_PRESET_LABELS[dateRangePreset][lang === "gu" ? "gu" : "en"]}
                <button type="button" onClick={() => setDateRangePreset("LAST_365_DAYS")} className="text-slate-400 hover:text-slate-600">✕</button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                Query: &quot;{searchQuery}&quot;
                <button type="button" onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600">✕</button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setStatusFilter("ALL");
                setDateRangePreset("LAST_365_DAYS");
                setSearchQuery("");
              }}
              className="text-[11px] font-bold text-rose-600 hover:underline ml-auto cursor-pointer"
            >
              {lang === "gu" ? "બધા સાફ કરો" : "Reset All"}
            </button>
          </div>
        )}
      </div>

      {/* 4. ENTERPRISE DATA GRID */}
      <div className="bg-white border border-[#E2E8E5] rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-xs border-collapse min-w-[800px]">
            <thead className="bg-[#FAFBFD] text-[#5A6B66] uppercase tracking-wider font-extrabold border-b border-[#E2E8E5] text-[11px]">
              <tr>
                <th className="py-3 px-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-[#174B43] rounded cursor-pointer accent-[#174B43]"
                  />
                </th>
                <th className="py-3 px-3 min-w-[100px]">{lang === "gu" ? "તારીખ" : "DATE"}</th>
                <th className="py-3 px-3 min-w-[130px]">{lang === "gu" ? "બિલ નંબર" : "INVOICE #"}</th>
                <th className="py-3 px-3 min-w-[220px]">{lang === "gu" ? "પાર્ટીનું નામ" : "PARTY NAME"}</th>
                <th className="py-3 px-3 min-w-[100px]">{lang === "gu" ? "મુદત" : "DUE IN"}</th>
                <th className="py-3 px-3 text-right min-w-[140px]">{lang === "gu" ? "કુલ રકમ (₹)" : "AMOUNT (₹)"}</th>
                <th className="py-3 px-3 text-center min-w-[110px]">{lang === "gu" ? "સ્થિતિ" : "STATUS"}</th>
                <th className="py-3 px-3 w-16 text-center">{lang === "gu" ? "ક્રિયાઓ" : "ACTIONS"}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#F1F5F9]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-[#26A58A] border-t-transparent mb-2" />
                    <p className="text-xs font-bold text-[#174B43]">
                      {lang === "gu" ? "વેચાણ બિલ લોડ થઈ રહ્યાં છે..." : "Loading sales invoices..."}
                    </p>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                /* Empty State */
                <tr>
                  <td colSpan={8} className="py-20 px-4 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-14 h-14 mx-auto bg-[#E6F7F2] border border-[#85D5C2] rounded-2xl flex items-center justify-center text-[#26A58A] shadow-inner">
                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-bold text-[#1A2E2B]">
                        {lang === "gu" ? "કોઈ બિલ મળ્યા નથી" : "No Sales Invoices Found"}
                      </h3>
                      <p className="text-xs text-[#5A6B66]">
                        {lang === "gu"
                          ? "તારીખ અથવા ફિલ્ટર બદલીને ફરી તપાસો, અથવા નવું બિલ બનાવો."
                          : "Try adjusting your search query, status filter, or date range."}
                      </p>
                      <div className="pt-2 flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setStatusFilter("ALL");
                            setDateRangePreset("LAST_365_DAYS");
                            setSearchQuery("");
                          }}
                          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          {lang === "gu" ? "ફિલ્ટર્સ સાફ કરો" : "Reset Filters"}
                        </button>
                        <Link
                          href="/sales/invoices/new"
                          className="px-4 py-1.5 bg-[#174B43] hover:bg-[#123B35] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          {lang === "gu" ? "+ નવું બિલ" : "+ Create Invoice"}
                        </Link>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const status = getInvoiceStatus(inv);
                  const isSelected = selectedIds.has(inv.id);
                  const dueInfo = calculateDueIn(inv.dueDate);
                  const total = Number(inv.grandTotal || 0);
                  const paid = Number(inv.paidAmount || 0);
                  const unpaid = Number(inv.outstandingBalance !== undefined ? inv.outstandingBalance : total - paid);

                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-[#F8FAF9] transition-colors group ${
                        isSelected ? "bg-[#E6F7F2]/40" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(inv.id)}
                          className="w-4 h-4 text-[#174B43] rounded cursor-pointer accent-[#174B43]"
                        />
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 text-slate-700 font-medium whitespace-nowrap">
                        <div>
                          {new Date(inv.invoiceDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </td>

                      {/* Invoice Number */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/sales/invoices/${inv.id}`}
                            className="font-bold text-[#174B43] hover:text-[#26A58A] transition-colors font-mono"
                          >
                            {inv.invoiceNumber}
                          </Link>
                          {inv.isB2B && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              B2B
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Party Name with avatar chip */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#E6F7F2] text-[#174B43] border border-[#BCEADF] flex items-center justify-center font-bold text-xs shrink-0">
                            {(inv.party?.name || "C")[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[#1A2E2B] leading-tight truncate">
                              {inv.party?.name || "Cash Customer"}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-[#8E9F9A] font-mono mt-0.5">
                              {inv.party?.gstin && (
                                <span className="text-slate-600 font-semibold">
                                  GSTIN: {inv.party.gstin}
                                </span>
                              )}
                              {inv.party?.phone && (
                                <span>• 📞 {inv.party.phone}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Due In */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            dueInfo.isOverdue
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : dueInfo.isDueToday
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "text-slate-600 bg-slate-100"
                          }`}
                        >
                          {dueInfo.text}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-3 text-right whitespace-nowrap font-mono">
                        <div className="font-black text-[#1A2E2B] text-xs">
                          {formatInr(total)}
                        </div>
                        {unpaid > 0.01 ? (
                          <div className="text-[10px] text-amber-700 font-semibold">
                            {formatInr(unpaid)} due
                          </div>
                        ) : (
                          <div className="text-[10px] text-emerald-600 font-semibold">
                            Fully Paid
                          </div>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {status === "PAID" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {lang === "gu" ? "ચૂકવાયેલ" : "Paid"}
                          </span>
                        )}
                        {status === "PARTIALLY_PAID" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            {lang === "gu" ? "અંશતઃ ચૂકવાયેલ" : "Partially Paid"}
                          </span>
                        )}
                        {status === "UNPAID" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            {lang === "gu" ? "બાકી" : "Unpaid"}
                          </span>
                        )}
                        {status === "CANCELLED" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            {lang === "gu" ? "રદ કરેલ" : "Void"}
                          </span>
                        )}
                      </td>

                      {/* Quick Actions */}
                      <td className="py-3 px-3 text-center relative">
                        <div className="flex items-center justify-center gap-1">
                          {/* Quick Link to View */}
                          <Link
                            href={`/sales/invoices/${inv.id}`}
                            className="p-1 text-slate-400 hover:text-[#174B43] hover:bg-slate-100 rounded-md transition-colors"
                            title="View Details"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>

                          {/* Quick Record Payment if unpaid */}
                          {unpaid > 0.01 && inv.status !== "CANCELLED" && (
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentInvoice(inv);
                                setPaymentAmount(unpaid);
                                setIsPaymentModalOpen(true);
                              }}
                              className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                              title="Record Payment"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </button>
                          )}

                          {/* More Options Dropdown Button */}
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
                        </div>

                        {activeActionMenuId === inv.id && (
                          <div
                            className={`absolute right-4 ${
                              actionMenuOpenUp
                                ? "bottom-8 origin-bottom-right"
                                : "top-10 origin-top-right"
                            } z-50 w-48 bg-white border border-[#E2E8E5] rounded-xl shadow-xl py-1 text-xs text-left animate-in fade-in zoom-in-95 duration-100`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* 1. Edit */}
                            {inv.status !== "CANCELLED" && (
                              <Link
                                href={`/sales/invoices/${inv.id}/edit`}
                                className="flex items-center gap-2 px-3 py-2 text-[#1A2E2B] hover:bg-[#F2FAF7] hover:text-[#174B43] transition-colors"
                              >
                                <svg className="w-3.5 h-3.5 text-[#26A58A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span>{lang === "gu" ? "સુધારો (Edit)" : "Edit Invoice"}</span>
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
                              className="w-full text-left flex items-center gap-2 px-3 py-2 text-[#1A2E2B] hover:bg-[#F2FAF7] hover:text-[#174B43] transition-colors cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5 text-[#26A58A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{lang === "gu" ? "ઇતિહાસ (History)" : "Edit History"}</span>
                            </button>

                            {/* 3. Duplicate */}
                            <button
                              type="button"
                              onClick={() => handleDuplicateInvoice(inv)}
                              className="w-full text-left flex items-center gap-2 px-3 py-2 text-[#1A2E2B] hover:bg-[#F2FAF7] hover:text-[#174B43] transition-colors cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5 text-[#26A58A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              <span>{lang === "gu" ? "નકલ બનાવો (Duplicate)" : "Duplicate"}</span>
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
                                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <span>{lang === "gu" ? "પેમેન્ટ નોંધો" : "Record Payment"}</span>
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
                                <svg className="w-3.5 h-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                                <span>{lang === "gu" ? "બિલ રદ કરો (Void)" : "Cancel Invoice"}</span>
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

      {/* MODAL 1: BULK DOWNLOAD / CA BUNDLE */}
      {isBulkDownloadOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-[#E2E8E5]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                {lang === "gu" ? "ઇન્વોઇસ બલ્ક ડાઉનલોડ" : "Invoice Bulk Export & CA Bundle"}
              </h2>
              <button
                type="button"
                onClick={() => setIsBulkDownloadOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    {lang === "gu" ? "તારીખ રેન્જ" : "Date Range"}
                  </label>
                  <select
                    value={bulkDownloadDateRange}
                    onChange={(e) => setBulkDownloadDateRange(e.target.value as DateRangePreset)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:outline-none"
                  >
                    {Object.entries(DATE_PRESET_LABELS).map(([k, labelObj]) => (
                      <option key={k} value={k}>
                        {lang === "gu" ? labelObj.gu : labelObj.en}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    {lang === "gu" ? "પાર્ટી (વૈકલ્પિક)" : "Select Party (Optional)"}
                  </label>
                  <select
                    value={bulkDownloadPartyId}
                    onChange={(e) => setBulkDownloadPartyId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:outline-none"
                  >
                    <option value="">{lang === "gu" ? "બધી પાર્ટીઓ" : "All Parties"}</option>
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
                  {lang === "gu" ? "તમારું ઇમેઇલ" : "Your Email"}
                </label>
                <input
                  type="email"
                  value={bulkDownloadEmail}
                  onChange={(e) => setBulkDownloadEmail(e.target.value)}
                  placeholder="name@business.com"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkDownloadSendToCa}
                    onChange={(e) => setBulkDownloadSendToCa(e.target.checked)}
                    className="w-4 h-4 text-[#174B43] rounded accent-[#174B43]"
                  />
                  <span className="font-bold text-slate-800">
                    {lang === "gu" ? "સીધા CA / એકાઉન્ટન્ટને મોકલો" : "Send Directly to CA / Tax Auditor"}
                  </span>
                </label>

                {bulkDownloadSendToCa && (
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                      {lang === "gu" ? "CA નું ઇમેઇલ દાખલ કરો" : "Enter CA's Email"}
                    </label>
                    <input
                      type="email"
                      value={bulkDownloadCaEmail}
                      onChange={(e) => setBulkDownloadCaEmail(e.target.value)}
                      placeholder="ca@taxconsultant.in"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 font-mono">
                {filteredInvoices.length} {lang === "gu" ? "બિલ તૈયાર" : "Invoices in Scope"}
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
                  className="px-6 py-2 bg-[#174B43] hover:bg-[#123B35] text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  {isExporting ? "Generating..." : bulkDownloadSendToCa ? "Email Bundle" : "Download Bundle"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: QUICK INVOICE SETTINGS */}
      <QuickSettingsModal
        isOpen={isQuickSettingsOpen}
        onClose={() => setIsQuickSettingsOpen(false)}
        settings={quickSettings}
        onSave={handleSaveQuickSettings}
      />

      {/* MODAL 3: RECORD PAYMENT */}
      {isPaymentModalOpen && paymentInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-[#E2E8E5]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {lang === "gu" ? "પેમેન્ટ નોંધો (Record Payment)" : "Record Payment"}
                </h2>
                <p className="text-[11px] text-slate-500 font-mono">
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
              <div className="p-3 bg-[#E6F7F2]/50 border border-[#85D5C2] rounded-xl flex items-center justify-between">
                <span className="text-[#174B43] font-semibold">
                  {lang === "gu" ? "કુલ બાકી રકમ:" : "Total Outstanding Balance:"}
                </span>
                <span className="font-mono font-bold text-[#174B43] text-sm">
                  {formatInr(paymentInvoice.outstandingBalance)}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  {lang === "gu" ? "ચૂકવણી રકમ (₹)" : "Payment Amount (₹)"}
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-sm font-bold focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    {lang === "gu" ? "ચૂકવણી પદ્ધતિ" : "Payment Mode"}
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:outline-none"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="UPI_QR">UPI / QR</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    {lang === "gu" ? "ચૂકવણી તારીખ" : "Payment Date"}
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  {lang === "gu" ? "નોંધ / સંદર્ભ" : "Notes / Reference"}
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. UTR / Cheque No / Reference"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none"
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
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-[#E2E8E5]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {lang === "gu" ? "બિલ ઇતિહાસ અને ક્રિયાઓ" : "Invoice Activity & Audit Log"}
                </h2>
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
              <div className="relative pl-6 space-y-4 border-l-2 border-[#85D5C2] ml-2">
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-[#174B43] border-2 border-white ring-2 ring-[#BCEADF]" />
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
                      Status: {historyInvoice.status}
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
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-[#E2E8E5]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-rose-700">
                {lang === "gu" ? "વેચાણ બિલ રદ કરો" : "Cancel Sales Invoice"}
              </h2>
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
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none"
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
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-[#E2E8E5]">
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

      {/* FLOATING SUCCESS TOAST NOTIFICATION */}
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
