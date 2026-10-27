"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/auth-context";
import { apiClient } from "../../lib/api-client";
import { Modal } from "../../components/ui/modal";
import { BillScannerModal } from "./components/bill-scanner-modal";
import { ExportDropdown } from "../../components/ui/export-dropdown";
import { ExportColumn } from "../../lib/export/export-types";
import {
  QuickSettingsModal,
  DEFAULT_PURCHASE_QUICK_SETTINGS,
  QuickSettingsConfig,
} from "../../components/invoice/quick-settings-modal";
import { ImportWizardModal } from "../../components/imports/import-wizard-modal";
import { ImportModuleType } from "@billing/shared-types";

interface PurchaseInvoice {
  id: string;
  vendorInvoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  itcEligibility: string;
  party: {
    id: string;
    name: string;
    nameGujarati?: string;
    gstin?: string;
    phone?: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    taxableAmount: number;
    totalAmount: number;
    item: {
      id: string;
      name: string;
      nameGujarati?: string;
    };
  }>;
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

function formatDisplayDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

function formatDisplayAmount(val: number | string): string {
  const num = Number(val) || 0;
  return "₹ " + num.toLocaleString("en-IN", {
    minimumFractionDigits: num % 1 !== 0 ? (Number.isInteger(num * 10) ? 1 : 2) : 0,
    maximumFractionDigits: 2,
  });
}

function calculateDueIn(dueDateStr?: string, invoiceDateStr?: string, isPaid?: boolean): string {
  if (isPaid) return "-";
  if (!dueDateStr) {
    if (!invoiceDateStr) return "-";
    const inv = new Date(invoiceDateStr);
    inv.setDate(inv.getDate() + 30);
    dueDateStr = inv.toISOString();
  }
  const due = new Date(dueDateStr);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays > 0) {
    return `Due in ${diffDays} Days`;
  } else if (diffDays === 0) {
    return "Due Today";
  } else {
    return `Overdue by ${Math.abs(diffDays)} Days`;
  }
}

function getPurchaseStatus(inv: PurchaseInvoice): "PAID" | "UNPAID" | "PARTIAL" {
  const total = Number(inv.grandTotal || 0);
  const paid = Number(inv.paidAmount || 0);
  const balance = Number(inv.balanceAmount !== undefined ? inv.balanceAmount : total - paid);
  if (balance <= 0.01 || paid >= total - 0.01) return "PAID";
  if (paid > 0 && balance > 0) return "PARTIAL";
  return "UNPAID";
}

export default function PurchasesPage() {
  const router = useRouter();
  const { lang, tenantContext, user, currentCompany } = useAuth();
  const canPay = ["SUPER_ADMIN", "ORG_ADMIN", "COMPANY_ADMIN", "ACCOUNTANT", "BRANCH_MANAGER"].includes(user?.role || "");

  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Tabs: "ALL" | "INCOMPLETE_SCANS"
  const [activeTab, setActiveTab] = useState<"ALL" | "INCOMPLETE_SCANS">("ALL");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PAID" | "UNPAID">("ALL");
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("LAST_365_DAYS");
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Dropdowns & Modals
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [isReportsMenuOpen, setIsReportsMenuOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [showIncompleteNotice, setShowIncompleteNotice] = useState(true);
  const [lastRefreshedTime, setLastRefreshedTime] = useState("Just now");

  // Dependencies for scanner & payment
  const [parties, setParties] = useState<any[]>([]);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  // Payment Recording State
  const [payBill, setPayBill] = useState<PurchaseInvoice | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payMode, setPayMode] = useState("CASH");
  const [payAccountId, setPayAccountId] = useState("");
  const [payReference, setPayReference] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [payError, setPayError] = useState<string | null>(null);
  const [payAccounts, setPayAccounts] = useState<any[]>([]);
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payKey, setPayKey] = useState("");

  // Deletion States
  const [purchaseToDelete, setPurchaseToDelete] = useState<PurchaseInvoice | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);

  // Quick Settings Persistence
  const companyKey = currentCompany?.id || "default";
  const purchaseStorageKey = `billing_purchase_quick_settings_${companyKey}`;
  const [quickSettings, setQuickSettings] = useState<QuickSettingsConfig>(DEFAULT_PURCHASE_QUICK_SETTINGS);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(purchaseStorageKey);
        if (saved) {
          setQuickSettings({ ...DEFAULT_PURCHASE_QUICK_SETTINGS, ...JSON.parse(saved) });
        }
      } catch (e) {
        console.error("Failed to load quick settings", e);
      }
    }
  }, [purchaseStorageKey]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setIsReportsMenuOpen(false);
      setIsDateMenuOpen(false);
      setActiveActionMenuId(null);
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const fetchPurchases = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get("/purchases/invoices", {
        limit: 200,
      });
      setInvoices(
        Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [],
      );
    } catch (err: any) {
      setError(err.message || "Failed to load purchase invoices.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchDependencies = async () => {
    try {
      const [partiesRes, itemsRes, whRes]: any = await Promise.all([
        apiClient.get("/masters/parties", { type: "SUPPLIER" }).catch(() => apiClient.get("/masters/parties")),
        apiClient.get("/masters/items"),
        apiClient.get("/masters/warehouses"),
      ]);
      setParties(Array.isArray(partiesRes) ? partiesRes : partiesRes?.items || []);
      setItemsList(Array.isArray(itemsRes) ? itemsRes : itemsRes?.items || []);
      setWarehouses(Array.isArray(whRes) ? whRes : []);
    } catch (err) {
      console.error("Failed to load purchase dependencies", err);
    }
  };

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchPurchases();
      fetchDependencies();
    }
  }, [tenantContext.companyId, fetchPurchases]);

  // 1. Date Filtered Invoices (Used for KPI Cards)
  const dateFilteredInvoices = useMemo(() => {
    let result = invoices;

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

    return result;
  }, [invoices, dateRangePreset, customStartDate, customEndDate]);

  // Metrics (Total Purchases, Paid, Unpaid)
  const metrics = useMemo(() => {
    let totalPurchases = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;

    for (const inv of dateFilteredInvoices) {
      const total = Number(inv.grandTotal || 0);
      const paid = Number(inv.paidAmount || 0);
      const balance = Number(inv.balanceAmount !== undefined ? inv.balanceAmount : total - paid);

      totalPurchases += total;
      totalPaid += paid;
      totalUnpaid += Math.max(0, balance);
    }

    return {
      totalPurchases,
      totalPaid,
      totalUnpaid,
      count: dateFilteredInvoices.length,
    };
  }, [dateFilteredInvoices]);

  // 2. Filtered Invoices (Filtered by Status and Search)
  const filteredInvoices = useMemo(() => {
    let result = dateFilteredInvoices;

    // Status Filter
    if (statusFilter !== "ALL") {
      result = result.filter((inv) => {
        const status = getPurchaseStatus(inv);
        if (statusFilter === "PAID") return status === "PAID";
        if (statusFilter === "UNPAID") return status === "UNPAID" || status === "PARTIAL";
        return true;
      });
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (inv) =>
          inv.vendorInvoiceNumber?.toLowerCase().includes(q) ||
          inv.party?.name?.toLowerCase().includes(q) ||
          inv.party?.nameGujarati?.toLowerCase().includes(q) ||
          inv.party?.gstin?.toLowerCase().includes(q) ||
          inv.itcEligibility?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [dateFilteredInvoices, statusFilter, searchQuery]);

  // Duplicate Bill
  const handleDuplicatePurchase = async (inv: PurchaseInvoice) => {
    setActiveActionMenuId(null);
    try {
      const res: any = await apiClient.get(`/purchases/invoices/${inv.id}`);
      const fullData = res?.data || res;
      if (typeof window !== "undefined") {
        localStorage.setItem("billing_clone_purchase", JSON.stringify(fullData));
      }
      setSuccessBanner(`Duplicating purchase bill #${inv.vendorInvoiceNumber}...`);
      router.push("/purchases/new");
    } catch {
      setSuccessBanner("Failed to duplicate purchase bill.");
    }
  };

  // Delete Single Bill
  const handleDeleteSinglePurchase = async () => {
    if (!purchaseToDelete) return;
    setIsDeletingSingle(true);
    setError(null);
    try {
      await apiClient.delete(`/purchases/invoices/${purchaseToDelete.id}`);
      setSuccessBanner(
        lang === "gu"
          ? `ખરીદી બિલ #${purchaseToDelete.vendorInvoiceNumber} સફળતાપૂર્વક કાઢી નાખવામાં આવ્યું.`
          : `Purchase bill #${purchaseToDelete.vendorInvoiceNumber} deleted successfully.`
      );
      setPurchaseToDelete(null);
      await fetchPurchases();
    } catch (err: any) {
      setError(
        lang === "gu" && err.messageGujarati
          ? err.messageGujarati
          : err.message || "Failed to delete purchase invoice."
      );
    } finally {
      setIsDeletingSingle(false);
    }
  };

  // Open Payment modal
  const openPayment = async (invoice: PurchaseInvoice) => {
    setActiveActionMenuId(null);
    setPayBill(invoice);
    const balance = Number(invoice.balanceAmount ?? invoice.grandTotal);
    setPayAmount(balance > 0 ? balance.toFixed(2) : "");
    setPayDate(new Date().toISOString().split("T")[0]);
    setPayMode("CASH");
    setPayReference("");
    setPayNotes("");
    setPayError(null);
    setPayKey(`pay-${invoice.id}-${Date.now()}`);
    try {
      const [ledger] = await Promise.all([
        apiClient.get<any>("/accounting/ledgers", { nature: "ASSET", limit: 100 }).catch(() => ({ data: [] })),
      ]);
      const rows = ledger.data || ledger.items || [];
      setPayAccounts(rows.filter((account: any) => /cash|bank/i.test(account.name || "")));
    } catch (err: any) {
      setPayError(err.message || "Payment details could not be loaded.");
    }
  };

  const submitPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!payBill) return;
    setPaySubmitting(true);
    setPayError(null);
    try {
      await apiClient.post(
        `/purchases/${payBill.id}/payments`,
        {
          amount: payAmount,
          paymentDate: payDate,
          paymentMode: payMode,
          paidFromAccountId: payAccountId || undefined,
          referenceNo: payReference || undefined,
          notes: payNotes || undefined,
        },
        undefined,
        payKey,
      );
      setSuccessBanner(lang === "gu" ? "ચુકવણી નોંધાઈ." : "Supplier payment recorded.");
      setPayBill(null);
      await fetchPurchases();
    } catch (err: any) {
      setPayError(err.message || "Payment was not recorded.");
    } finally {
      setPaySubmitting(false);
    }
  };

  // Export Columns definition
  const exportColumns: ExportColumn[] = useMemo(
    () => [
      { key: "vendorInvoiceNumber", header: "Purchase Invoice Number" },
      { key: "invoiceDate", header: "Date" },
      { key: "partyName", header: "Party Name" },
      { key: "partyGstin", header: "GSTIN" },
      { key: "taxableAmount", header: "Taxable (₹)" },
      { key: "grandTotal", header: "Amount (₹)" },
      { key: "paidAmount", header: "Paid (₹)" },
      { key: "balanceAmount", header: "Balance (₹)" },
      { key: "status", header: "Status" },
    ],
    []
  );

  const exportData = useMemo(() => {
    return filteredInvoices.map((inv) => ({
      vendorInvoiceNumber: inv.vendorInvoiceNumber,
      invoiceDate: formatDisplayDate(inv.invoiceDate),
      partyName: inv.party?.name || "",
      partyGstin: inv.party?.gstin || "",
      taxableAmount: Number(inv.taxableAmount || 0).toFixed(2),
      grandTotal: Number(inv.grandTotal || 0).toFixed(2),
      paidAmount: Number(inv.paidAmount || 0).toFixed(2),
      balanceAmount: Number(inv.balanceAmount ?? (inv.grandTotal - (inv.paidAmount || 0))).toFixed(2),
      status: getPurchaseStatus(inv) === "PAID" ? "Paid" : "Unpaid",
    }));
  }, [filteredInvoices]);

  return (
    <div className="w-full px-4 sm:px-6 py-4 space-y-4 max-w-[1600px] mx-auto text-slate-800">
      {/* 1. TOP HEADER (Exact myBillBook Layout) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Title */}
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">
          Purchase Invoices
        </h1>

        {/* Center: Segmented Tabs (All Invoices | Incomplete Scans) */}
        <div className="inline-flex items-center bg-[#f1f5f9] p-1 rounded-lg border border-slate-200/70">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "ALL"
                ? "bg-white text-[#4f46e5] shadow-xs border border-indigo-100"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <span>All Invoices</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("INCOMPLETE_SCANS")}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "INCOMPLETE_SCANS"
                ? "bg-white text-[#ea580c] shadow-xs border border-amber-200/80"
                : "text-slate-600 hover:text-slate-900 font-medium"
            }`}
          >
            <svg
              className={`w-3.5 h-3.5 ${
                activeTab === "INCOMPLETE_SCANS" ? "text-[#ea580c]" : "text-slate-400"
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 7V4h3" />
              <path d="M20 7V4h-3" />
              <path d="M4 17v3h3" />
              <path d="M20 17v3h-3" />
              <line x1="4" y1="12" x2="20" y2="12" />
            </svg>
            <span>Incomplete Scans</span>
          </button>
        </div>

        {/* Right: Actions (Reports, Settings Gear with Red Dot, Fullscreen) */}
        <div className="flex items-center gap-2">
          {/* Reports Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsReportsMenuOpen(!isReportsMenuOpen);
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 border border-indigo-200 text-[#4f46e5] text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <span>Reports</span>
              <span className="text-[10px]">▼</span>
            </button>

            {isReportsMenuOpen && (
              <div
                className="absolute right-0 top-9 z-50 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-xs animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Purchase Reports
                </div>
                <Link
                  href="/reports?tab=purchase-summary"
                  className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                >
                  <span>📑</span>
                  <span>Purchase Summary</span>
                </Link>
                <Link
                  href="/reports?tab=gstr-2b"
                  className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                >
                  <span>🇮🇳</span>
                  <span>GSTR-2B vs Purchases</span>
                </Link>
                <Link
                  href="/reports?tab=outstanding&partyType=SUPPLIER"
                  className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                >
                  <span>💳</span>
                  <span>Supplier Outstanding</span>
                </Link>
              </div>
            )}
          </div>

          {/* Quick Settings Gear with Red Dot Badge */}
          <button
            type="button"
            onClick={() => setIsQuickSettingsOpen(true)}
            className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-colors relative cursor-pointer shadow-2xs"
            title="Purchase Quick Settings"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full border border-white" />
          </button>

          {/* Keyboard / Shortcuts Icon Button */}
          <button
            type="button"
            onClick={() => setIsScannerModalOpen(true)}
            className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
            title="Scan Bills (Camera / OCR)"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <line x1="6" y1="8" x2="6.01" y2="8" />
              <line x1="10" y1="8" x2="10.01" y2="8" />
              <line x1="14" y1="8" x2="14.01" y2="8" />
              <line x1="18" y1="8" x2="18.01" y2="8" />
              <line x1="6" y1="12" x2="6.01" y2="12" />
              <line x1="18" y1="12" x2="18.01" y2="12" />
              <line x1="8" y1="16" x2="16" y2="16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Success / Error Banners */}
      {successBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center justify-between text-xs font-medium shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-700 font-bold hover:underline cursor-pointer">
            ✕
          </button>
        </div>
      )}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center justify-between text-xs font-medium shadow-2xs">
          <span>{error}</span>
          <button onClick={fetchPurchases} className="text-rose-700 font-bold underline ml-2 cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {activeTab === "ALL" ? (
        <>
          {/* 2. THREE SUMMARY CARDS (Total Purchases, Paid, Unpaid) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Total Purchases */}
        <div
          onClick={() => setStatusFilter("ALL")}
          className={`bg-white p-4 rounded-lg border transition-all cursor-pointer shadow-2xs ${
            statusFilter === "ALL"
              ? "border-[#4f46e5]/40 ring-1 ring-[#4f46e5]/30 bg-indigo-50/10"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-medium text-[#4f46e5]">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <span>Total Purchases</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-800 mt-2 tracking-tight">
            {formatDisplayAmount(metrics.totalPurchases)}
          </div>
        </div>

        {/* Card 2: Paid */}
        <div
          onClick={() => setStatusFilter("PAID")}
          className={`bg-white p-4 rounded-lg border transition-all cursor-pointer shadow-2xs ${
            statusFilter === "PAID"
              ? "border-emerald-500/40 ring-1 ring-emerald-500/30 bg-emerald-50/10"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-medium text-[#16a34a]">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <circle cx="12" cy="12" r="2" />
              <path d="M6 12h.01M18 12h.01" />
            </svg>
            <span>Paid</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-800 mt-2 tracking-tight">
            {formatDisplayAmount(metrics.totalPaid)}
          </div>
        </div>

        {/* Card 3: Unpaid */}
        <div
          onClick={() => setStatusFilter("UNPAID")}
          className={`bg-white p-4 rounded-lg border transition-all cursor-pointer shadow-2xs ${
            statusFilter === "UNPAID"
              ? "border-rose-500/40 ring-1 ring-rose-500/30 bg-rose-50/10"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-medium text-[#dc2626]">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>Unpaid</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-800 mt-2 tracking-tight">
            {formatDisplayAmount(metrics.totalUnpaid)}
          </div>
        </div>
      </div>

      {/* 3. SEARCH & DATE FILTER & CREATE ACTION ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Left: Search input and Date Filter Button */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search Box with Magnifying Glass */}
          <div className="relative w-56 sm:w-64">
            <span className="absolute inset-y-0 left-2.5 flex items-center text-slate-400 pointer-events-none text-xs">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Date Range Picker (Calendar Icon | Last 365 Days | Calendar Icon) */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsDateMenuOpen(!isDateMenuOpen);
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-medium text-slate-700 shadow-2xs transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>{DATE_PRESET_LABELS[dateRangePreset]}</span>
              <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </button>

            {/* Date Preset Dropdown Menu */}
            {isDateMenuOpen && (
              <div
                className="absolute left-0 top-9 z-50 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-xs animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Select Date Range
                </div>
                {Object.entries(DATE_PRESET_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setDateRangePreset(key as DateRangePreset);
                      if (key !== "CUSTOM") setIsDateMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 transition-colors flex items-center justify-between cursor-pointer ${
                      dateRangePreset === key
                        ? "bg-indigo-50 text-[#4f46e5] font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{label}</span>
                    {dateRangePreset === key && <span>✓</span>}
                  </button>
                ))}

                {/* Custom Date Pickers */}
                {dateRangePreset === "CUSTOM" && (
                  <div className="p-2 border-t border-slate-100 space-y-2">
                    <div>
                      <span className="text-[10px] text-slate-500">From Date:</span>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full mt-0.5 px-2 py-1 border border-slate-200 text-xs rounded-lg"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">To Date:</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full mt-0.5 px-2 py-1 border border-slate-200 text-xs rounded-lg"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsDateMenuOpen(false)}
                      className="w-full py-1 bg-[#4f46e5] text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Apply Filter
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Export Dropdown */}
          <ExportDropdown
            columns={exportColumns}
            data={exportData}
            metadata={{
              title: "Purchase Invoices Register",
              fileName: "purchase_invoices_register",
              companyName: currentCompany?.tradeName || currentCompany?.legalName || "My Business",
              filterDescription: DATE_PRESET_LABELS[dateRangePreset],
              totalCount: filteredInvoices.length,
            }}
            lang={lang}
            themeColor="purple"
            buttonVariant="compact"
          />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
          >
            <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>{lang === "gu" ? "એક્સેલ ઈમ્પોર્ટ" : "Import Excel"}</span>
          </button>

          <Link
            href="/purchases/new"
            className="inline-flex items-center justify-center px-4 py-2 bg-[#4c35de] hover:bg-[#4338ca] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Create Purchase Invoice
          </Link>
        </div>
      </div>

      {/* 4. PURCHASES DATA TABLE (Exact myBillBook Columns & Design) */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-slate-200 text-slate-600 font-medium text-xs">
                <th className="py-3 px-4 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    <span className="text-slate-400 text-[10px]">⇅</span>
                  </div>
                </th>
                <th className="py-3 px-4 whitespace-nowrap">Purchase Invoice Number</th>
                <th className="py-3 px-4">Party Name</th>
                <th className="py-3 px-4 whitespace-nowrap">Due In</th>
                <th className="py-3 px-4 whitespace-nowrap">Amount</th>
                <th className="py-3 px-4 whitespace-nowrap">Status</th>
                <th className="py-3 px-4 text-right w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-indigo-600 border-t-transparent" />
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      Loading purchase bills...
                    </p>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="text-3xl mb-2">🧾</div>
                    <p className="text-sm font-bold text-slate-800">
                      No Purchase Invoices Found
                    </p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Record vendor purchases manually or use Smart OCR Scanner for automatic bill reading.
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsScannerModalOpen(true)}
                        className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        📷 Scan Bill
                      </button>
                      <Link
                        href="/purchases/new"
                        className="px-4 py-1.5 bg-[#4c35de] hover:bg-[#4338ca] text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                      >
                        Create Purchase Invoice
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const status = getPurchaseStatus(inv);
                  const total = Number(inv.grandTotal || 0);
                  const paid = Number(inv.paidAmount || 0);
                  const balance = Number(
                    inv.balanceAmount !== undefined ? inv.balanceAmount : total - paid
                  );

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => router.push(`/purchases/invoices/${inv.id}`)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 font-normal">
                        {formatDisplayDate(inv.invoiceDate)}
                      </td>

                      {/* Purchase Invoice Number */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-800 font-normal">
                        {inv.vendorInvoiceNumber}
                      </td>

                      {/* Party Name */}
                      <td className="py-3.5 px-4 text-slate-800 font-medium uppercase">
                        {inv.party?.name || "DIRECT VENDOR"}
                      </td>

                      {/* Due In */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                        {calculateDueIn(inv.dueDate, inv.invoiceDate, status === "PAID")}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-900">
                        <div className="font-medium text-slate-800">
                          {formatDisplayAmount(total)}
                        </div>
                        {balance > 0.01 && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            ({formatDisplayAmount(balance)} unpaid)
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {status === "PAID" ? (
                          <span className="inline-block px-2.5 py-0.5 rounded text-xs font-medium bg-[#dcfce7] text-[#16a34a]">
                            Paid
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded text-xs font-medium bg-[#fee2e2] text-[#dc2626]">
                            Unpaid
                          </span>
                        )}
                      </td>

                      {/* Action Menu (3-dots ⋮) */}
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setActiveActionMenuId(activeActionMenuId === inv.id ? null : inv.id)
                          }
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors cursor-pointer text-sm font-bold"
                          title="Options"
                        >
                          ⋮
                        </button>

                        {/* 3-dots Dropdown Menu */}
                        {activeActionMenuId === inv.id && (
                          <div
                            className="absolute right-3 top-9 z-50 w-44 bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-xs text-left animate-in fade-in zoom-in-95 duration-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link
                              href={`/purchases/invoices/${inv.id}`}
                              className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                            >
                              <span>👁️</span>
                              <span>View Bill</span>
                            </Link>

                            {canPay && balance > 0.01 && (
                              <button
                                type="button"
                                onClick={() => openPayment(inv)}
                                className="w-full text-left flex items-center gap-2 px-3 py-2 text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer font-semibold"
                              >
                                <span>💳</span>
                                <span>Record Payment</span>
                              </button>
                            )}

                            <Link
                              href={`/purchases/invoices/${inv.id}`}
                              className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                            >
                              <span>✏️</span>
                              <span>Edit Details</span>
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleDuplicatePurchase(inv)}
                              className="w-full text-left flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                            >
                              <span>📋</span>
                              <span>Duplicate Bill</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveActionMenuId(null);
                                setPurchaseToDelete(inv);
                              }}
                              className="w-full text-left flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border-t border-slate-100"
                            >
                              <span>🗑️</span>
                              <span>Delete Bill</span>
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
    </>
  ) : (
        /* INCOMPLETE SCANS VIEW (Exact myBillBook Layout) */
        <div className="space-y-4">
          {/* Information Alert Banner */}
          {showIncompleteNotice && (
            <div className="bg-[#fffbeb] border border-[#fef3c7] rounded-lg px-4 py-2.5 flex items-center justify-between text-xs text-[#92400e] shadow-2xs">
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-[#b45309] shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>
                  The bills here are in incomplete status. Once reviewed and saved, they&apos;ll appear in{" "}
                  <strong className="font-bold text-slate-900">All Invoices</strong>.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowIncompleteNotice(false)}
                className="text-[#92400e] hover:text-slate-900 font-bold ml-3 cursor-pointer text-xs p-1"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          )}

          {/* Sub-header: Last updated + Upload a Bill button */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Last updated: {lastRefreshedTime}</span>
              <button
                type="button"
                onClick={() => {
                  setLastRefreshedTime("Just now");
                  fetchPurchases();
                }}
                className="text-blue-500 hover:text-blue-600 transition-colors p-0.5 cursor-pointer"
                title="Refresh"
              >
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M23 4v6h-6" />
                  <path d="M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsScannerModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Upload a Bill</span>
            </button>
          </div>

          {/* Empty State Illustration & CTA */}
          <div className="flex flex-col items-center justify-center py-20 px-4 min-h-[460px]">
            {/* The Two Documents Transformation Illustration */}
            <div className="relative w-72 h-44 flex items-center justify-center">
              {/* Left Bill Sheet (Sketch style) */}
              <div className="absolute left-6 w-32 h-40 bg-[#f8fafc] border-2 border-slate-200 rounded-lg shadow-2xs -rotate-6 p-3 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-400 font-mono tracking-wider">
                    BILL
                  </div>
                  <div className="mt-2.5 space-y-1.5">
                    <div className="h-1 bg-slate-200 rounded w-full"></div>
                    <div className="h-1 bg-slate-200 rounded w-5/6"></div>
                    <div className="h-1 bg-slate-200 rounded w-4/6"></div>
                  </div>
                  <div className="mt-3.5 border-t border-slate-200 pt-1.5 space-y-1.5">
                    <div className="h-1 bg-slate-200 rounded w-full"></div>
                    <div className="h-1 bg-slate-200 rounded w-3/4"></div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <svg
                    className="w-8 h-4 text-slate-300"
                    viewBox="0 0 50 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M2 15 Q 15 2, 25 10 T 48 5" />
                  </svg>
                </div>
              </div>

              {/* Center Sparkle and Dashed Arrow */}
              <div className="absolute z-10 flex flex-col items-center">
                <div className="text-[#ea580c] mb-1">
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                  </svg>
                </div>
                <svg
                  className="w-20 h-9 text-slate-300"
                  viewBox="0 0 60 30"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="3 3"
                >
                  <path d="M5 25 Q 30 5, 55 20" />
                  <polygon points="53,16 57,21 51,23" fill="currentColor" stroke="none" />
                </svg>
              </div>

              {/* Right Invoice Sheet (Clean with Orange Border) */}
              <div className="absolute right-6 w-32 h-40 bg-white border-2 border-[#ea580c] rounded-lg shadow-sm rotate-6 p-3 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-600 tracking-wider">
                    INVOICE
                  </div>
                  {/* Clean table grid */}
                  <div className="mt-2.5 border border-slate-200 rounded overflow-hidden">
                    <div className="h-2.5 bg-slate-100 border-b border-slate-200"></div>
                    <div className="h-2.5 border-b border-slate-100"></div>
                    <div className="h-2.5 border-b border-slate-100"></div>
                    <div className="h-2.5"></div>
                  </div>
                  <div className="mt-2.5 space-y-1.5">
                    <div className="h-1 bg-slate-200 rounded w-full"></div>
                    <div className="h-1 bg-slate-200 rounded w-2/3"></div>
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-1 flex justify-between items-center text-[9px] text-slate-400 font-mono">
                  <span>TOTAL</span>
                  <span className="font-bold text-slate-700">₹ ...</span>
                </div>
              </div>
            </div>

            {/* Heading and Subtitle */}
            <h2 className="text-lg font-bold text-slate-800 mt-5">
              No Incomplete Scans yet!
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Let &ldquo;Mira AI&rdquo; do it for you
            </p>

            {/* Upload Button */}
            <button
              type="button"
              onClick={() => setIsScannerModalOpen(true)}
              className="mt-5 inline-flex items-center gap-2 px-6 py-2.5 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Upload a Bill</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. MODALS */}

      {/* Quick Settings Modal (Wired from top gear icon) */}
      <QuickSettingsModal
        isOpen={isQuickSettingsOpen}
        onClose={() => setIsQuickSettingsOpen(false)}
        settings={quickSettings}
        voucherType="purchase"
        voucherTitle="Purchase Bill Settings"
        prefixLabel="Purchase Prefix"
        prefixPlaceholder="e.g. PUR-26-"
        storageKey={purchaseStorageKey}
        onSave={(newSettings) => {
          setQuickSettings(newSettings);
          setSuccessBanner("Purchase settings updated successfully!");
        }}
      />

      {/* Record Payment Modal */}
      <Modal
        isOpen={Boolean(payBill)}
        onClose={() => setPayBill(null)}
        title="Pay Supplier"
      >
        {payBill ? (
          <form onSubmit={submitPayment} className="space-y-3.5">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Vendor Bill #:</span>
                <strong className="text-slate-900 font-mono">{payBill.vendorInvoiceNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span>Original Total:</span>
                <span className="font-mono">₹{Number(payBill.grandTotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Already Paid:</span>
                <span className="font-mono text-emerald-700">₹{Number(payBill.paidAmount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-900">
                <span>Remaining Due:</span>
                <span className="font-mono text-rose-700">
                  ₹{Number(payBill.balanceAmount ?? payBill.grandTotal).toFixed(2)}
                </span>
              </div>
            </div>

            {payError && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
                {payError}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="text-slate-600 font-semibold">
                Amount to Pay (₹) *
                <input
                  type="number"
                  step="0.01"
                  required
                  className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-2 text-sm font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
              </label>

              <label className="text-slate-600 font-semibold">
                Payment Date *
                <input
                  type="date"
                  required
                  className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </label>

              <label className="text-slate-600 font-semibold">
                Payment Mode
                <select
                  className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="UPI_QR">UPI</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </label>

              <label className="text-slate-600 font-semibold">
                Paid From Account
                <select
                  className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={payAccountId}
                  onChange={(e) => setPayAccountId(e.target.value)}
                >
                  <option value="">Default Cash Account</option>
                  {payAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block text-xs text-slate-600 font-semibold">
              Reference / UTR / Cheque No.
              <input
                className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
                placeholder="e.g. UTR-9928120"
              />
            </label>

            <label className="block text-xs text-slate-600 font-semibold">
              Notes
              <input
                className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="e.g. Paid in full against supplier voucher"
              />
            </label>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPayBill(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={paySubmitting}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {paySubmitting ? "Saving..." : "Record Payment"}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>

      {/* Bill Scanner Modal */}
      <BillScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        onSuccess={(inv) => {
          setSuccessBanner(
            lang === "gu"
              ? `ખરીદી બિલ #${inv.vendorInvoiceNumber} સફળતાપૂર્વક કન્ફર્મ થયું અને સ્ટોકમાં ઉમેરાયું!`
              : `Purchase Invoice #${inv.vendorInvoiceNumber} successfully posted to stock & ledger!`,
          );
          fetchPurchases();
        }}
        lang={lang}
        parties={parties}
        itemsList={itemsList}
        warehouses={warehouses}
      />

      {/* Single Purchase Delete Modal */}
      <Modal
        isOpen={!!purchaseToDelete}
        onClose={() => setPurchaseToDelete(null)}
        title="Confirm Delete Purchase Bill"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to delete purchase bill &quot;{purchaseToDelete?.vendorInvoiceNumber}&quot;? The stock received will also be rolled back.
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setPurchaseToDelete(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteSinglePurchase}
              disabled={isDeletingSingle}
              className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 rounded-lg shadow-sm cursor-pointer"
            >
              {isDeletingSingle ? "Deleting..." : "Confirm Delete"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Excel / CSV Import Wizard Modal */}
      <ImportWizardModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        preselectedModule={ImportModuleType.PURCHASE_INVOICES}
        onSuccess={fetchPurchases}
      />
    </div>
  );
}
