"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/auth-context";
import { apiClient, extractList } from "../../lib/api-client";
import { Modal } from "../../components/ui/modal";
import { BillScannerModal } from "./components/bill-scanner-modal";
import { ExportDropdown } from "../../components/ui/export-dropdown";
import { ExportColumn } from "../../lib/export/export-types";

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

interface PurchaseLine {
  itemId: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
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

function calculateDueIn(dueDateStr?: string, invoiceDateStr?: string, isPaid?: boolean): string {
  if (isPaid) return "Paid";
  if (!dueDateStr) {
    if (!invoiceDateStr) return "-";
    // default 30 days credit period
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

  // Tabs: "ALL" | "INCOMPLETE_SCANS"
  const [activeTab, setActiveTab] = useState<"ALL" | "INCOMPLETE_SCANS">("ALL");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PAID" | "UNPAID">("ALL");
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("LAST_365_DAYS");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Multi-Selection and Dropdowns
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [isReportsMenuOpen, setIsReportsMenuOpen] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [parties, setParties] = useState<any[]>([]);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  // Manual Form State
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [vendorInvoiceNumber, setVendorInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [lines, setLines] = useState<PurchaseLine[]>([
    { itemId: "", quantity: 1, unitPrice: 0, taxRate: 18 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Payment Recording State
  const [payBill, setPayBill] = useState<PurchaseInvoice | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payMode, setPayMode] = useState("CASH");
  const [payAccountId, setPayAccountId] = useState("");
  const [payReference, setPayReference] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [payError, setPayError] = useState<string | null>(null);
  const [payHistory, setPayHistory] = useState<any[]>([]);
  const [payAccounts, setPayAccounts] = useState<any[]>([]);
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payKey, setPayKey] = useState("");

  // Deletion States
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<PurchaseInvoice | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);

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
      const res: any = await apiClient.get("/purchases", {
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
        apiClient.get("/parties", { type: "SUPPLIER" }).catch(() => apiClient.get("/parties")),
        apiClient.get("/items"),
        apiClient.get("/tenants/warehouses"),
      ]);
      setParties(
        Array.isArray(partiesRes) ? partiesRes : partiesRes?.items || [],
      );
      setItemsList(Array.isArray(itemsRes) ? itemsRes : itemsRes?.items || []);
      setWarehouses(Array.isArray(whRes) ? whRes : []);
      if (Array.isArray(whRes) && whRes.length > 0) {
        const def = whRes.find((w: any) => w.isDefault) || whRes[0];
        setSelectedWarehouseId(def.id);
      }
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

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    let result = invoices;

    // 1. Status Filter
    if (statusFilter !== "ALL") {
      result = result.filter((inv) => {
        const status = getPurchaseStatus(inv);
        if (statusFilter === "PAID") return status === "PAID";
        if (statusFilter === "UNPAID") return status === "UNPAID" || status === "PARTIAL";
        return true;
      });
    }

    // 2. Date Range Filter
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
          inv.vendorInvoiceNumber?.toLowerCase().includes(q) ||
          inv.party?.name?.toLowerCase().includes(q) ||
          inv.party?.nameGujarati?.toLowerCase().includes(q) ||
          inv.party?.gstin?.toLowerCase().includes(q) ||
          inv.itcEligibility?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [invoices, statusFilter, dateRangePreset, customStartDate, customEndDate, searchQuery]);

  // Metrics Calculations (Matching Reference Cards)
  const metrics = useMemo(() => {
    let totalPurchases = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;

    for (const inv of filteredInvoices) {
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
      count: filteredInvoices.length,
    };
  }, [filteredInvoices]);

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
      const [history, ledger] = await Promise.all([
        apiClient.get<any>(`/purchases/${invoice.id}/payments`).catch(() => ({ payments: [] })),
        apiClient.get<any>("/ledgers", { nature: "ASSET", limit: 100 }).catch(() => ({ data: [] })),
      ]);
      setPayHistory(history.payments || []);
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

  // Duplicate Purchase Bill
  const handleDuplicatePurchase = async (inv: PurchaseInvoice) => {
    setActiveActionMenuId(null);
    try {
      const res: any = await apiClient.get(`/purchases/${inv.id}`);
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

  // Delete Handlers
  const handleDeleteSinglePurchase = async () => {
    if (!purchaseToDelete) return;
    setIsDeletingSingle(true);
    setError(null);
    try {
      await apiClient.delete(`/purchases/${purchaseToDelete.id}`);
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

  const handleBulkDeletePurchases = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    setError(null);
    try {
      await apiClient.post("/purchases/bulk-delete", {
        ids: Array.from(selectedIds),
      });
      setSuccessBanner(
        lang === "gu"
          ? `પસંદ કરેલ ${selectedIds.size} ખરીદી બિલો સફળતાપૂર્વક કાઢી નાખવામાં આવ્યા.`
          : `${selectedIds.size} purchase bills deleted successfully.`
      );
      setSelectedIds(new Set());
      setIsBulkDeleteModalOpen(false);
      await fetchPurchases();
    } catch (err: any) {
      setError(
        lang === "gu" && err.messageGujarati
          ? err.messageGujarati
          : err.message || "Failed to delete selected purchase bills."
      );
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Quick manual create form totals
  const calculatedTotals = useMemo(() => {
    let taxable = 0;
    let tax = 0;
    lines.forEach((l) => {
      const base = Number(l.quantity) * Number(l.unitPrice);
      taxable += base;
      tax += base * (Number(l.taxRate) / 100);
    });
    return {
      taxable,
      tax,
      grandTotal: taxable + tax,
    };
  }, [lines]);

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartyId || !vendorInvoiceNumber || lines.length === 0) {
      setFormError("Please fill all required fields and at least one item line.");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      await apiClient.post("/purchases", {
        partyId: selectedPartyId,
        vendorInvoiceNumber,
        invoiceDate: new Date(invoiceDate).toISOString(),
        warehouseId: selectedWarehouseId || undefined,
        items: lines.map((l) => ({
          itemId: l.itemId,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          taxRate: Number(l.taxRate),
        })),
      });
      setIsModalOpen(false);
      setSuccessBanner("Purchase bill recorded successfully!");
      await fetchPurchases();
    } catch (err: any) {
      setFormError(err.message || "Failed to save purchase bill.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export Columns definition
  const exportColumns: ExportColumn[] = useMemo(
    () => [
      { key: "vendorInvoiceNumber", header: "Bill Number" },
      { key: "invoiceDate", header: "Date" },
      { key: "partyName", header: "Supplier Name" },
      { key: "partyGstin", header: "GSTIN" },
      { key: "taxableAmount", header: "Taxable (₹)" },
      { key: "cgstAmount", header: "CGST (₹)" },
      { key: "sgstAmount", header: "SGST (₹)" },
      { key: "igstAmount", header: "IGST (₹)" },
      { key: "grandTotal", header: "Grand Total (₹)" },
      { key: "paidAmount", header: "Paid (₹)" },
      { key: "balanceAmount", header: "Balance (₹)" },
      { key: "status", header: "Status" },
      { key: "itcEligibility", header: "ITC Status" },
    ],
    []
  );

  const exportData = useMemo(() => {
    return filteredInvoices.map((inv) => ({
      vendorInvoiceNumber: inv.vendorInvoiceNumber,
      invoiceDate: new Date(inv.invoiceDate).toLocaleDateString("en-IN"),
      partyName: inv.party?.name || "",
      partyGstin: inv.party?.gstin || "",
      taxableAmount: Number(inv.taxableAmount || 0).toFixed(2),
      cgstAmount: Number(inv.cgstAmount || 0).toFixed(2),
      sgstAmount: Number(inv.sgstAmount || 0).toFixed(2),
      igstAmount: Number(inv.igstAmount || 0).toFixed(2),
      grandTotal: Number(inv.grandTotal || 0).toFixed(2),
      paidAmount: Number(inv.paidAmount || 0).toFixed(2),
      balanceAmount: Number(inv.balanceAmount ?? (inv.grandTotal - (inv.paidAmount || 0))).toFixed(2),
      status: getPurchaseStatus(inv),
      itcEligibility: inv.itcEligibility || "INPUT",
    }));
  }, [filteredInvoices]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* 1. TOP TABS: All Invoices | Incomplete Scans (Exact myBillBook layout) */}
      <div className="flex items-center gap-6 border-b border-slate-200 px-1 pt-1">
        <button
          type="button"
          onClick={() => setActiveTab("ALL")}
          className={`pb-3 text-sm font-bold transition-all relative cursor-pointer ${
            activeTab === "ALL"
              ? "text-[#4F46E5] border-b-2 border-[#4F46E5]"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>{lang === "gu" ? "બધા ખરીદી બિલો" : "All Invoices"}</span>
          <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700">
            {invoices.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("INCOMPLETE_SCANS");
            setIsScannerModalOpen(true);
          }}
          className={`pb-3 text-sm font-bold transition-all relative cursor-pointer flex items-center gap-1.5 ${
            activeTab === "INCOMPLETE_SCANS"
              ? "text-[#4F46E5] border-b-2 border-[#4F46E5]"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>📷</span>
          <span>{lang === "gu" ? "અપૂર્ણ સ્કેન (OCR Bills)" : "Incomplete Scans"}</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
            Smart OCR
          </span>
        </button>
      </div>

      {/* 2. TOP ACTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>{lang === "gu" ? "ખરીદી ઇનવોઇસ" : "Purchase Invoices"}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              GST Inward Stock
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === "gu"
              ? "વેપારી ખરીદી, ઇનપુટ ટેક્સ ક્રેડિટ (ITC) અને ચૂકવણી બાકી ટ્રેકિંગ"
              : "Track vendor invoices, Input Tax Credit (ITC), payments and supplier dues"}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quick Reports Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsReportsMenuOpen(!isReportsMenuOpen);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              <span>📊</span>
              <span>Reports</span>
              <span className="text-[10px] text-slate-400">▾</span>
            </button>

            {isReportsMenuOpen && (
              <div
                className="absolute right-0 top-10 z-50 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-xs animate-in fade-in zoom-in-95 duration-100"
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

          {/* Smart Bill Scanner CTA */}
          <button
            type="button"
            onClick={() => setIsScannerModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <span>📷</span>
            <span>{lang === "gu" ? "સ્કેન બિલ (OCR)" : "Scan Bill (Auto-Entry)"}</span>
          </button>

          {/* Primary CTA: Create Purchase Invoice */}
          <Link
            href="/purchases/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] active:bg-[#3730A3] text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <span>+</span>
            <span>{lang === "gu" ? "+ નવું ખરીદી બિલ" : "+ Create Purchase Invoice"}</span>
          </Link>
        </div>
      </div>

      {/* Success Banner */}
      {successBanner && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-xs font-medium shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-700 font-bold hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center justify-between text-xs font-medium shadow-2xs">
          <span>{error}</span>
          <button onClick={fetchPurchases} className="text-rose-700 font-bold underline ml-2">
            Retry
          </button>
        </div>
      )}

      {/* 3. KPI SUMMARY METRIC CARDS (Exact myBillBook Layout & Active State) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Card 1: Total Purchases */}
        <div
          onClick={() => setStatusFilter("ALL")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs flex flex-col justify-between ${
            statusFilter === "ALL"
              ? "bg-indigo-50/40 border-[#4F46E5] ring-2 ring-[#4F46E5]/15"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-slate-500">
              {lang === "gu" ? "કુલ ખરીદી (Total Purchases)" : "Total Purchases"}
            </span>
            <span className="text-[11px] font-semibold text-indigo-600">
              {DATE_PRESET_LABELS[dateRangePreset]}
            </span>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black font-mono text-slate-900 tracking-tight">
              {formatInr(metrics.totalPurchases)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {metrics.count} {lang === "gu" ? "બિલો" : "Invoices"}
            </p>
          </div>
        </div>

        {/* Card 2: Paid */}
        <div
          onClick={() => setStatusFilter("PAID")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs flex flex-col justify-between ${
            statusFilter === "PAID"
              ? "bg-emerald-50/40 border-emerald-500 ring-2 ring-emerald-500/15"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-slate-500">
              {lang === "gu" ? "ચૂકવેલ (Paid)" : "Paid"}
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black font-mono text-emerald-700 tracking-tight">
              {formatInr(metrics.totalPaid)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {lang === "gu" ? "વેપારીને ચૂકવેલ રકમ" : "Settled supplier amount"}
            </p>
          </div>
        </div>

        {/* Card 3: Unpaid */}
        <div
          onClick={() => setStatusFilter("UNPAID")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs flex flex-col justify-between ${
            statusFilter === "UNPAID"
              ? "bg-rose-50/40 border-rose-500 ring-2 ring-rose-500/15"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-slate-500">
              {lang === "gu" ? "બાકી (Unpaid)" : "Unpaid"}
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black font-mono text-rose-700 tracking-tight">
              {formatInr(metrics.totalUnpaid)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {lang === "gu" ? "વેપારીને ચૂકવવાની બાકી રકમ" : "Outstanding payable balance"}
            </p>
          </div>
        </div>
      </div>

      {/* 4. FILTER BAR & ACTIONS */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Search input */}
          <div className="relative flex-1 min-w-[240px]">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none text-sm">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                lang === "gu"
                  ? "બિલ નંબર, વેપારી અથવા GSTIN શોધો..."
                  : "Search by Invoice No, Supplier Name, GSTIN..."
              }
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Right: Date Presets & Export */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Date Preset Dropdown */}
            <select
              value={dateRangePreset}
              onChange={(e) => setDateRangePreset(e.target.value as DateRangePreset)}
              className="px-3 py-2 border border-slate-200 bg-white text-slate-700 text-xs font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shadow-2xs"
            >
              {Object.entries(DATE_PRESET_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            {/* Custom Date Pickers */}
            {dateRangePreset === "CUSTOM" && (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Bulk Delete Selected Button */}
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer"
              >
                <span>🗑️</span>
                <span>
                  {lang === "gu"
                    ? `પસંદ કરેલ કાઢી નાખો (${selectedIds.size})`
                    : `Delete Selected (${selectedIds.size})`}
                </span>
              </button>
            )}

            {/* Universal Export Dropdown */}
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
        </div>

        {/* Filter Badges Row: Status selector pills */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold mr-1">Status:</span>
            {(["ALL", "PAID", "UNPAID"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === st
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st === "ALL" ? "All" : st === "PAID" ? "Paid" : "Unpaid"}
              </button>
            ))}
          </div>

          <div className="text-slate-400 font-medium text-[11px]">
            Showing <strong className="text-slate-700">{filteredInvoices.length}</strong> of{" "}
            <strong>{invoices.length}</strong> purchase bills
          </div>
        </div>
      </div>

      {/* 5. PURCHASES DATA TABLE (Matching Reference Columns) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                {/* Select All Checkbox */}
                <th className="py-3 px-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3.5 whitespace-nowrap">
                  <span>{lang === "gu" ? "તારીખ" : "Date"}</span>
                  <span className="text-slate-400 ml-1">⇅</span>
                </th>
                <th className="py-3 px-3.5 whitespace-nowrap">
                  {lang === "gu" ? "ખરીદી બિલ નંબર" : "Purchase Invoice Number"}
                </th>
                <th className="py-3 px-3.5">{lang === "gu" ? "વેપારીનું નામ" : "Party Name"}</th>
                <th className="py-3 px-3.5 whitespace-nowrap">{lang === "gu" ? "બાકી મુદત" : "Due In"}</th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap">
                  {lang === "gu" ? "રકમ (₹)" : "Amount (₹)"}
                </th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">
                  {lang === "gu" ? "સ્થિતિ" : "Status"}
                </th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap w-16">
                  {lang === "gu" ? "ક્રિયા" : "Action"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-indigo-600 border-t-transparent" />
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      Loading purchase bills...
                    </p>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <div className="text-4xl mb-2">🧾</div>
                    <p className="text-sm font-bold text-slate-800">
                      {lang === "gu" ? "કોઈ ખરીદી બિલ મળ્યું નથી" : "No Purchase Invoices Found"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {lang === "gu"
                        ? "તમે નવું ખરીદી બિલ દાખલ કરી શકો છો અથવા સ્માર્ટ OCR સ્કેનરથી ઓટોમેટિક બિલ બનાવી શકો છો."
                        : "Record inward inventory and vendor bills manually or use Smart OCR Scanner for instant entry."}
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsScannerModalOpen(true)}
                        className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl"
                      >
                        📷 Scan Bill
                      </button>
                      <Link
                        href="/purchases/new"
                        className="px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold rounded-xl shadow-xs"
                      >
                        + Create Purchase Invoice
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
                  const isSelected = selectedIds.has(inv.id);

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => router.push(`/purchases/${inv.id}`)}
                      className={`hover:bg-indigo-50/20 transition-colors cursor-pointer ${
                        isSelected ? "bg-indigo-50/40" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(inv.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-slate-600 font-medium">
                        {new Date(inv.invoiceDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      {/* Purchase Invoice Number */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <Link
                          href={`/purchases/${inv.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono font-bold text-slate-900 hover:text-indigo-600 hover:underline flex items-center gap-1 group"
                        >
                          <span>{inv.vendorInvoiceNumber}</span>
                          <span className="text-[10px] text-slate-400 group-hover:text-indigo-600">↗</span>
                        </Link>
                      </td>

                      {/* Party Name */}
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-slate-900">
                          {lang === "gu" && inv.party?.nameGujarati
                            ? inv.party.nameGujarati
                            : inv.party?.name || "Direct Vendor"}
                        </div>
                        {inv.party?.gstin && (
                          <div className="text-[10px] text-indigo-600 font-bold font-mono">
                            GST: {inv.party.gstin}
                          </div>
                        )}
                      </td>

                      {/* Due In */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            status === "PAID"
                              ? "bg-slate-100 text-slate-600"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {calculateDueIn(inv.dueDate, inv.invoiceDate, status === "PAID")}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap font-mono">
                        <div className="font-bold text-slate-900">
                          ₹ {total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                        {balance > 0.01 && (
                          <div className="text-[10px] text-rose-600 font-medium">
                            (₹ {balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })} unpaid)
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                            status === "PAID"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : status === "UNPAID"
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {status}
                        </span>
                      </td>

                      {/* Action Menu (3-dots ⋮) */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveActionMenuId(activeActionMenuId === inv.id ? null : inv.id)
                          }
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors cursor-pointer text-sm font-bold"
                          title="Actions"
                        >
                          ⋮
                        </button>

                        {/* 3-dots Dropdown Menu */}
                        {activeActionMenuId === inv.id && (
                          <div
                            className="absolute right-3 top-10 z-50 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-xs text-left animate-in fade-in zoom-in-95 duration-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link
                              href={`/purchases/${inv.id}`}
                              className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                            >
                              <span>👁️</span>
                              <span>View Bill</span>
                            </Link>

                            {canPay && balance > 0.01 && (
                              <button
                                type="button"
                                onClick={() => openPayment(inv)}
                                className="w-full text-left flex items-center gap-2 px-3 py-2 text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer font-bold"
                              >
                                <span>💳</span>
                                <span>Record Payment</span>
                              </button>
                            )}

                            <Link
                              href={`/purchases/${inv.id}`}
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

      {/* 6. MODALS */}

      {/* Record Payment Modal */}
      <Modal
        isOpen={Boolean(payBill)}
        onClose={() => setPayBill(null)}
        title={lang === "gu" ? "વેપારીને ચુકવણી (Supplier Payment)" : "Pay Supplier"}
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
                {lang === "gu" ? "ચુકવણી રકમ (₹) *" : "Amount to Pay (₹) *"}
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
                {lang === "gu" ? "તારીખ *" : "Payment Date *"}
                <input
                  type="date"
                  required
                  className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </label>

              <label className="text-slate-600 font-semibold">
                {lang === "gu" ? "ચુકવણી મોડ" : "Payment Mode"}
                <select
                  className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                >
                  <option value="CASH">{lang === "gu" ? "રોકડ (Cash)" : "Cash"}</option>
                  <option value="BANK_TRANSFER">{lang === "gu" ? "બેંક ટ્રાન્સફર (Bank)" : "Bank Transfer"}</option>
                  <option value="UPI_QR">UPI</option>
                  <option value="CHEQUE">{lang === "gu" ? "ચેક (Cheque)" : "Cheque"}</option>
                </select>
              </label>

              <label className="text-slate-600 font-semibold">
                {lang === "gu" ? "ખાતું (Account)" : "Paid From Account"}
                <select
                  className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={payAccountId}
                  onChange={(e) => setPayAccountId(e.target.value)}
                >
                  <option value="">{lang === "gu" ? "મૂળભૂત રોકડ ખાતું" : "Default Cash Account"}</option>
                  {payAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block text-xs text-slate-600 font-semibold">
              {lang === "gu" ? "સંદર્ભ / UTR / Cheque No." : "Reference / UTR / Cheque No."}
              <input
                className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
                placeholder="e.g. UTR-9928120"
              />
            </label>

            <label className="block text-xs text-slate-600 font-semibold">
              {lang === "gu" ? "નોંધ" : "Notes"}
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
        title={lang === "gu" ? "ખરીદી બિલ કાઢી નાખવાની ખાતરી" : "Confirm Delete Purchase Bill"}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            {lang === "gu"
              ? `શું તમે ખરેખર ખરીદી બિલ "${purchaseToDelete?.vendorInvoiceNumber}" કાઢી નાખવા માંગો છો? આ બિલથી સ્ટોકમાં આવેલ ઇન્વેન્ટરી પણ પાછી ખેંચી લેવામાં આવશે.`
              : `Are you sure you want to delete purchase bill "${purchaseToDelete?.vendorInvoiceNumber}"? The stock received will also be rolled back.`}
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

      {/* Bulk Delete Purchases Modal */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        title={lang === "gu" ? "પસંદ કરેલ ખરીદી બિલો કાઢી નાખો" : "Bulk Delete Purchase Bills"}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            {lang === "gu"
              ? `તમે ${selectedIds.size} ખરીદી બિલો કાઢી નાખવા માટે પસંદ કર્યા છે. આ બિલોની ઇન્વેન્ટરી અને ટેક્સ રિવર્સ થઈ જશે. શું તમે આગળ વધવા માંગો છો?`
              : `You have selected ${selectedIds.size} purchase bills to delete. Associated stock and tax entries will be removed. Are you sure?`}
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBulkDeletePurchases}
              disabled={isBulkDeleting}
              className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 rounded-lg shadow-sm cursor-pointer"
            >
              {isBulkDeleting ? "Deleting..." : `Confirm Delete (${selectedIds.size})`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
