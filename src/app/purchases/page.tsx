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
import { ScorecardRibbon, ScorecardSegment } from "@/components/design-system/scorecard-ribbon";
import { formatInr } from "@/components/design-system/tokens";

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

function calculateDueIn(dueDateStr?: string, invoiceDateStr?: string, isPaid?: boolean): { text: string; isOverdue: boolean; isDueToday: boolean } {
  if (isPaid) return { text: "-", isOverdue: false, isDueToday: false };
  if (!dueDateStr) {
    if (!invoiceDateStr) return { text: "-", isOverdue: false, isDueToday: false };
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
    return { text: `In ${diffDays}d`, isOverdue: false, isDueToday: false };
  } else if (diffDays === 0) {
    return { text: "Due Today", isOverdue: false, isDueToday: true };
  } else {
    return { text: `Overdue ${Math.abs(diffDays)}d`, isOverdue: true, isDueToday: false };
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
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Dropdowns & Modals
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [actionMenuOpenUp, setActionMenuOpenUp] = useState(false);
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
      setLastRefreshedTime("Just now");
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

  // 1. Date Filtered Invoices
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
    let paidCount = 0;
    let unpaidCount = 0;

    for (const inv of dateFilteredInvoices) {
      const total = Number(inv.grandTotal || 0);
      const paid = Number(inv.paidAmount || 0);
      const balance = Number(inv.balanceAmount !== undefined ? inv.balanceAmount : total - paid);

      totalPurchases += total;
      totalPaid += paid;
      if (balance > 0.01) {
        totalUnpaid += balance;
        unpaidCount += 1;
      } else {
        paidCount += 1;
      }
    }

    return {
      totalPurchases,
      totalPaid,
      totalUnpaid,
      count: dateFilteredInvoices.length,
      paidCount,
      unpaidCount,
    };
  }, [dateFilteredInvoices]);

  // 2. Filtered Invoices
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
          inv.party?.phone?.includes(q) ||
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

  // Scorecard segments for Purchases
  const scorecardSegments: ScorecardSegment[] = [
    {
      id: "all",
      label: "Total Purchases",
      labelGujarati: "કુલ ખરીદી",
      value: metrics.totalPurchases,
      isCurrency: true,
      subtext: `${metrics.count} Purchase Bills`,
      subtextGujarati: `${metrics.count} બિલ`,
      badge: DATE_PRESET_LABELS[dateRangePreset][lang === "gu" ? "gu" : "en"],
      variant: "primary",
      isActive: statusFilter === "ALL",
      onClick: () => setStatusFilter("ALL"),
    },
    {
      id: "paid",
      label: "Settled & Paid",
      labelGujarati: "ચૂકવાયેલ રકમ",
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
      label: "Accounts Payable",
      labelGujarati: "બાકી દેવાની રકમ",
      value: metrics.totalUnpaid,
      isCurrency: true,
      subtext: `${metrics.unpaidCount} Pending Payment`,
      subtextGujarati: `${metrics.unpaidCount} બાકી ચુકવણીઓ`,
      variant: "warning",
      isActive: statusFilter === "UNPAID",
      onClick: () => setStatusFilter("UNPAID"),
    },
    {
      id: "itc",
      label: "Vendor Network",
      labelGujarati: "વેન્ડર નેટવર્ક",
      value: parties.length || filteredInvoices.length,
      isCurrency: false,
      subtext: "Active Suppliers",
      subtextGujarati: "સક્રિય સપ્લાયર્સ",
      variant: "neutral",
    },
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto min-w-0 pb-16 font-sans">
      {/* 1. TOP UNIFIED COMMAND STRIP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:px-6 sm:py-3.5 rounded-2xl border border-[#E2E8E5] shadow-xs">
        {/* Left: Identity, Title, and Segmented Tabs */}
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#26A58A]">
              {lang === "gu" ? "ખરીદી અને સ્ટોક ઈનવર્ડ" : "PURCHASES & EXPENSES"}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[10px] font-bold text-slate-500 font-mono">
              {filteredInvoices.length} {lang === "gu" ? "બિલ" : "Bills"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-[#1A2E2B] tracking-tight">
              {lang === "gu" ? "ખરીદી બિલ (Purchase Bills)" : "Purchase Invoices"}
            </h1>
            <button
              type="button"
              onClick={fetchPurchases}
              title="Refresh Purchases"
              className="p-1 text-slate-400 hover:text-[#174B43] rounded-md transition-colors"
            >
              <svg className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#26A58A]" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Center: Segmented View Switcher */}
        <div className="inline-flex items-center bg-[#F2FAF7] p-1 rounded-xl border border-[#BCEADF] self-start sm:self-center">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "ALL"
                ? "bg-white text-[#174B43] shadow-xs border border-[#85D5C2]/50 font-bold"
                : "text-[#5A6B66] hover:text-[#174B43]"
            }`}
          >
            <svg className="w-3.5 h-3.5 text-[#26A58A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span>{lang === "gu" ? "બધા બિલ" : "All Bills"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("INCOMPLETE_SCANS")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "INCOMPLETE_SCANS"
                ? "bg-white text-amber-800 shadow-xs border border-amber-300 font-bold"
                : "text-[#5A6B66] hover:text-[#174B43]"
            }`}
          >
            <svg className="w-3.5 h-3.5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7V4h3" />
              <path d="M20 7V4h-3" />
              <path d="M4 17v3h3" />
              <path d="M20 17v3h-3" />
              <line x1="4" y1="12" x2="20" y2="12" />
            </svg>
            <span>{lang === "gu" ? "અધૂરા સ્કેન (AI)" : "Incomplete Scans"}</span>
          </button>
        </div>

        {/* Right: Quick Action Suite */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Reports Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsReportsMenuOpen(!isReportsMenuOpen);
                setActiveActionMenuId(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#E2E8E5] bg-white hover:bg-[#F2FAF7] hover:border-[#85D5C2] text-[#174B43] text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              <svg className="w-3.5 h-3.5 text-[#26A58A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
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
                  {lang === "gu" ? "ખરીદી અહેવાલ" : "Purchase Reports"}
                </div>
                <Link
                  href="/reports?tab=purchase-summary"
                  className="flex items-center gap-2 px-3 py-2 text-[#1A2E2B] hover:bg-[#F2FAF7] hover:text-[#174B43] transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-[#26A58A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Purchase Summary</span>
                </Link>
                <Link
                  href="/reports?tab=gstr-2b"
                  className="flex items-center gap-2 px-3 py-2 text-[#1A2E2B] hover:bg-[#F2FAF7] hover:text-[#174B43] transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-[#26A58A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>GSTR-2B vs Purchases</span>
                </Link>
                <Link
                  href="/reports?tab=outstanding&partyType=SUPPLIER"
                  className="flex items-center gap-2 px-3 py-2 text-[#1A2E2B] hover:bg-[#F2FAF7] hover:text-[#174B43] transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-[#26A58A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Supplier Outstanding</span>
                </Link>
              </div>
            )}
          </div>

          {/* AI Bill Scanner trigger */}
          <button
            type="button"
            onClick={() => setIsScannerModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer"
            title="Scan Bills with AI OCR"
          >
            <svg className="w-3.5 h-3.5 text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span>{lang === "gu" ? "સ્કેનર" : "Scan Bill"}</span>
          </button>

          {/* Export Dropdown */}
          <ExportDropdown
            columns={exportColumns}
            data={exportData}
            metadata={{
              title: "Purchase Invoices Register",
              fileName: "purchase_invoices_register",
              companyName: currentCompany?.tradeName || currentCompany?.legalName || "My Business",
              filterDescription: DATE_PRESET_LABELS[dateRangePreset][lang === "gu" ? "gu" : "en"],
              totalCount: filteredInvoices.length,
            }}
            lang={lang}
            themeColor="purple"
            buttonVariant="compact"
          />

          {/* Import Excel */}
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#F2FAF7] hover:bg-[#E6F7F2] text-[#174B43] border border-[#85D5C2] text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-[#26A58A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>{lang === "gu" ? "આયાત" : "Import"}</span>
          </button>

          {/* Settings Gear */}
          <button
            type="button"
            onClick={() => setIsQuickSettingsOpen(true)}
            className="p-2 border border-[#E2E8E5] bg-white hover:bg-[#F2FAF7] hover:border-[#85D5C2] text-[#5A6B66] hover:text-[#174B43] rounded-xl transition-colors cursor-pointer shadow-2xs relative"
            title="Purchase Settings"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full border border-white" />
          </button>

          {/* Primary CTA */}
          <Link
            href="/purchases/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#174B43] hover:bg-[#123B35] active:bg-[#0D2A26] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-[#85D5C2]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>{lang === "gu" ? "+ નવું ખરીદી બિલ" : "+ New Purchase Bill"}</span>
          </Link>
        </div>
      </div>

      {/* Success / Error Banners */}
      {successBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-xs font-medium shadow-xs">
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
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center justify-between text-xs font-medium shadow-xs">
          <span>{error}</span>
          <button onClick={fetchPurchases} className="text-rose-700 font-bold underline ml-2 cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {activeTab === "ALL" ? (
        <>
          {/* 2. FINANCIAL SCORECARD RIBBON */}
          <ScorecardRibbon segments={scorecardSegments} lang={lang} />

          {/* 3. OMNI-SEARCH & SMART FILTER BAR */}
          <div className="bg-white p-3 sm:p-3.5 border border-[#E2E8E5] rounded-2xl shadow-xs space-y-2.5">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                {/* Search Box */}
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
                    placeholder={lang === "gu" ? "વેન્ડર, બિલ #, GSTIN કે ફોન શોધો..." : "Search vendor, bill #, GSTIN, phone..."}
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
                  {(["ALL", "PAID", "UNPAID"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        statusFilter === st
                          ? "bg-white text-[#174B43] shadow-xs border border-[#85D5C2]"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {st === "ALL" && (lang === "gu" ? "બધા" : "All Bills")}
                      {st === "PAID" && (lang === "gu" ? "ચૂકવાયેલ" : "Paid")}
                      {st === "UNPAID" && (lang === "gu" ? "બાકી (Payable)" : "Unpaid")}
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
            </div>

            {/* Active Filters Summary line */}
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
                    <th className="py-3 px-4 min-w-[110px]">{lang === "gu" ? "તારીખ" : "DATE"}</th>
                    <th className="py-3 px-4 min-w-[140px]">{lang === "gu" ? "વેન્ડર બિલ #" : "PURCHASE BILL #"}</th>
                    <th className="py-3 px-4 min-w-[220px]">{lang === "gu" ? "સપ્લાયર / પાર્ટી" : "SUPPLIER / PARTY"}</th>
                    <th className="py-3 px-4 min-w-[100px]">{lang === "gu" ? "મુદત" : "DUE IN"}</th>
                    <th className="py-3 px-4 text-right min-w-[140px]">{lang === "gu" ? "રકમ (₹)" : "AMOUNT (₹)"}</th>
                    <th className="py-3 px-4 text-center min-w-[110px]">{lang === "gu" ? "સ્થિતિ" : "STATUS"}</th>
                    <th className="py-3 px-4 w-16 text-center">{lang === "gu" ? "ક્રિયાઓ" : "ACTIONS"}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#F1F5F9]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-20 text-center text-slate-400">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-[#26A58A] border-t-transparent mb-2" />
                        <p className="text-xs font-bold text-[#174B43]">
                          {lang === "gu" ? "ખરીદી બિલ લોડ થઈ રહ્યાં છે..." : "Loading purchase bills..."}
                        </p>
                      </td>
                    </tr>
                  ) : filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-20 px-4 text-center">
                        <div className="max-w-sm mx-auto space-y-3">
                          <div className="w-14 h-14 mx-auto bg-[#E6F7F2] border border-[#85D5C2] rounded-2xl flex items-center justify-center text-[#26A58A] shadow-inner">
                            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-bold text-[#1A2E2B]">
                            {lang === "gu" ? "કોઈ ખરીદી બિલ મળ્યા નથી" : "No Purchase Invoices Found"}
                          </h3>
                          <p className="text-xs text-[#5A6B66]">
                            Record vendor purchases manually or use Smart OCR Scanner for automatic bill reading.
                          </p>
                          <div className="pt-2 flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setIsScannerModalOpen(true)}
                              className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold rounded-xl cursor-pointer"
                            >
                              📷 Scan Bill
                            </button>
                            <Link
                              href="/purchases/new"
                              className="px-4 py-1.5 bg-[#174B43] hover:bg-[#123B35] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                            >
                              {lang === "gu" ? "+ નવું ખરીદી બિલ" : "+ Create Purchase"}
                            </Link>
                          </div>
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
                      const dueInfo = calculateDueIn(inv.dueDate, inv.invoiceDate, status === "PAID");

                      return (
                        <tr
                          key={inv.id}
                          className="hover:bg-[#F8FAF9] transition-colors group"
                        >
                          {/* Date */}
                          <td className="py-3 px-4 text-slate-700 font-medium whitespace-nowrap">
                            {formatDisplayDate(inv.invoiceDate)}
                          </td>

                          {/* Purchase Invoice Number */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <Link
                              href={`/purchases/invoices/${inv.id}`}
                              className="font-bold text-[#174B43] hover:text-[#26A58A] transition-colors font-mono"
                            >
                              {inv.vendorInvoiceNumber}
                            </Link>
                          </td>

                          {/* Party Name with avatar chip */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-[#E6F7F2] text-[#174B43] border border-[#BCEADF] flex items-center justify-center font-bold text-xs shrink-0">
                                {(inv.party?.name || "V")[0].toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-[#1A2E2B] leading-tight truncate">
                                  {inv.party?.name || "Direct Vendor"}
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
                          <td className="py-3 px-4 whitespace-nowrap">
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
                          <td className="py-3 px-4 text-right whitespace-nowrap font-mono">
                            <div className="font-black text-[#1A2E2B] text-xs">
                              {formatInr(total)}
                            </div>
                            {balance > 0.01 ? (
                              <div className="text-[10px] text-amber-700 font-semibold">
                                {formatInr(balance)} due
                              </div>
                            ) : (
                              <div className="text-[10px] text-emerald-600 font-semibold">
                                Fully Paid
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {status === "PAID" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                {lang === "gu" ? "ચૂકવાયેલ" : "Paid"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                {lang === "gu" ? "બાકી" : "Unpaid"}
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center relative">
                            <div className="flex items-center justify-center gap-1">
                              {/* Quick View */}
                              <Link
                                href={`/purchases/invoices/${inv.id}`}
                                className="p-1 text-slate-400 hover:text-[#174B43] hover:bg-slate-100 rounded-md transition-colors"
                                title="View Details"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </Link>

                              {/* Quick Pay */}
                              {canPay && balance > 0.01 && (
                                <button
                                  type="button"
                                  onClick={() => openPayment(inv)}
                                  className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                                  title="Record Payment"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                  </svg>
                                </button>
                              )}

                              {/* More Options */}
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
                                <Link
                                  href={`/purchases/invoices/${inv.id}`}
                                  className="flex items-center gap-2 px-3 py-2 text-[#1A2E2B] hover:bg-[#F2FAF7] hover:text-[#174B43] transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5 text-[#26A58A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  <span>View Bill</span>
                                </Link>

                                {canPay && balance > 0.01 && (
                                  <button
                                    type="button"
                                    onClick={() => openPayment(inv)}
                                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                                  >
                                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <span>Record Payment</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleDuplicatePurchase(inv)}
                                  className="w-full text-left flex items-center gap-2 px-3 py-2 text-[#1A2E2B] hover:bg-[#F2FAF7] hover:text-[#174B43] transition-colors cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5 text-[#26A58A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
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
                                  <svg className="w-3.5 h-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
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
        /* INCOMPLETE SCANS VIEW (Modernized OCR Hub) */
        <div className="space-y-4">
          {showIncompleteNotice && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl px-4 py-3 flex items-center justify-between text-xs text-amber-900 shadow-xs">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>
                  The bills here are in incomplete status. Once reviewed and saved, they&apos;ll automatically sync to{" "}
                  <strong className="font-bold text-slate-900">All Bills & Stock</strong>.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowIncompleteNotice(false)}
                className="text-amber-800 hover:text-slate-900 font-bold ml-3 cursor-pointer text-xs p-1"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Last updated: {lastRefreshedTime}</span>
              <button
                type="button"
                onClick={() => {
                  setLastRefreshedTime("Just now");
                  fetchPurchases();
                }}
                className="text-[#26A58A] hover:text-[#174B43] transition-colors p-0.5 cursor-pointer"
                title="Refresh"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 4v6h-6" />
                  <path d="M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsScannerModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Upload Bill Document</span>
            </button>
          </div>

          <div className="flex flex-col items-center justify-center py-20 px-4 min-h-[460px] bg-white border border-[#E2E8E5] rounded-2xl shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-inner mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>

            <h2 className="text-lg font-bold text-slate-800">
              No Incomplete Scans in Queue
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-sm text-center">
              Upload vendor bills, PDFs, or photos. Our AI OCR engine will extract line items, taxes, and vendor details automatically.
            </p>

            <button
              type="button"
              onClick={() => setIsScannerModalOpen(true)}
              className="mt-5 inline-flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Scan Bill with AI</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. MODALS */}

      {/* Quick Settings Modal */}
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
        title="Record Supplier Payment"
      >
        {payBill ? (
          <form onSubmit={submitPayment} className="space-y-3.5">
            <div className="bg-[#E6F7F2]/50 p-3 rounded-xl border border-[#85D5C2] text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Vendor Bill #:</span>
                <strong className="text-slate-900 font-mono">{payBill.vendorInvoiceNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span>Original Total:</span>
                <span className="font-mono">{formatInr(payBill.grandTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Already Paid:</span>
                <span className="font-mono text-emerald-700">{formatInr(payBill.paidAmount || 0)}</span>
              </div>
              <div className="flex justify-between border-t border-[#85D5C2] pt-1 font-bold text-slate-900">
                <span>Remaining Due:</span>
                <span className="font-mono text-rose-700">
                  {formatInr(payBill.balanceAmount ?? payBill.grandTotal)}
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
                  className="mt-1 w-full border border-slate-300 rounded-xl px-2.5 py-2 text-sm font-mono font-bold focus:ring-2 focus:ring-[#26A58A] focus:outline-none"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
              </label>

              <label className="text-slate-600 font-semibold">
                Payment Date *
                <input
                  type="date"
                  required
                  className="mt-1 w-full border border-slate-300 rounded-xl px-2.5 py-2 text-sm focus:ring-2 focus:ring-[#26A58A] focus:outline-none"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </label>

              <label className="text-slate-600 font-semibold">
                Payment Mode
                <select
                  className="mt-1 w-full border border-slate-300 rounded-xl px-2.5 py-2 text-sm focus:ring-2 focus:ring-[#26A58A] focus:outline-none"
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                  <option value="UPI_QR">UPI / QR</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </label>

              <label className="text-slate-600 font-semibold">
                Paid From Account
                <select
                  className="mt-1 w-full border border-slate-300 rounded-xl px-2.5 py-2 text-sm focus:ring-2 focus:ring-[#26A58A] focus:outline-none"
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
                className="mt-1 w-full border border-slate-300 rounded-xl px-2.5 py-2 text-sm focus:ring-2 focus:ring-[#26A58A] focus:outline-none"
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
                placeholder="e.g. UTR-9928120"
              />
            </label>

            <label className="block text-xs text-slate-600 font-semibold">
              Notes
              <input
                className="mt-1 w-full border border-slate-300 rounded-xl px-2.5 py-2 text-sm focus:ring-2 focus:ring-[#26A58A] focus:outline-none"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="e.g. Paid in full against supplier voucher"
              />
            </label>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPayBill(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={paySubmitting}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
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
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteSinglePurchase}
              disabled={isDeletingSingle}
              className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 rounded-xl shadow-xs cursor-pointer"
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
