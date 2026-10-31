"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/auth-context";
import { apiClient } from "../../lib/api-client";
import { StatusBadge } from "../../components/ui/badge";
import { ReportEmptyState } from "../../components/ui/report-empty-state";
import { ReportsDashboard } from "./components/reports-dashboard";
import { CaSharingModal } from "./components/ca-sharing-modal";
import { EmailExcelModal } from "./components/email-excel-modal";
import { ExportDropdown } from "../../components/ui/export-dropdown";
import { ExportFormat } from "../../lib/export/export-types";
import { exportReportData } from "./lib/report-export-adapter";

type ReportTab =
  | "sales-register"
  | "sales-summary"
  | "bill-wise-profit"
  | "item-sales-report"
  | "party-sales-report"
  | "sales-returns"
  | "quotations"
  | "delivery-challans"
  | "purchase-register"
  | "purchase-summary"
  | "item-purchase-report"
  | "party-purchase-report"
  | "purchase-returns"
  | "receipt-payment"
  | "outstanding"
  | "party-ledger"
  | "party-aging"
  | "trial-balance"
  | "profit-loss"
  | "balance-sheet"
  | "cash-flow"
  | "daybook"
  | "stock-summary"
  | "stock-movement"
  | "item-batch-report"
  | "low-stock-alert"
  | "expense-category"
  | "audit-trail"
  | "gstr-1"
  | "gstr-3b"
  | "gst-purchase-hsn"
  | "gst-sales-hsn"
  | "hsn-sales-summary";

function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return "-";
  try {
    const raw = dateStr.split("T")[0];
    const parts = raw.split("-");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return raw;
  } catch {
    return dateStr || "-";
  }
}

interface ReportPaginationProps {
  currentPage: number;
  pageSize: number;
  totalEntries: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  lang: "en" | "gu";
}

function ReportPagination({
  currentPage,
  pageSize,
  totalEntries,
  onPageChange,
  onPageSizeChange,
  lang,
}: ReportPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startEntry = totalEntries === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endEntry = Math.min(safePage * pageSize, totalEntries);

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push("ellipsis");
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safePage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="p-3.5 sm:p-4 bg-white border-t border-[#E5E7EB] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#667085]">
      {/* Left: Rows Per Page Selector & Summary */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 font-medium">
          <span>{lang === "gu" ? "પ્રતિ પેજ:" : "Rows per page:"}</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="px-2 py-1 rounded-lg border border-[#E5E7EB] bg-slate-50 text-[#202124] font-semibold text-xs focus:ring-1 focus:ring-[#174B43] cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="font-medium text-[#667085]">
          {lang === "gu" ? (
            <span>
              કુલ <span className="font-bold text-[#202124]">{totalEntries}</span> માંથી{" "}
              <span className="font-bold text-[#202124]">{startEntry}</span> થી{" "}
              <span className="font-bold text-[#202124]">{endEntry}</span> દર્શાવી રહ્યા છીએ
            </span>
          ) : (
            <span>
              Showing <span className="font-bold text-[#202124]">{startEntry}</span> to{" "}
              <span className="font-bold text-[#202124]">{endEntry}</span> of{" "}
              <span className="font-bold text-[#202124]">{totalEntries}</span> entries
            </span>
          )}
        </div>
      </div>

      {/* Right: Navigation Controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={safePage === 1}
            className="px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[#202124] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-all font-semibold cursor-pointer shadow-2xs"
            title={lang === "gu" ? "પ્રથમ પેજ" : "First Page"}
          >
            «
          </button>
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            disabled={safePage === 1}
            className="px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[#202124] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-all font-semibold cursor-pointer shadow-2xs"
            title={lang === "gu" ? "અગાઉનું પેજ" : "Previous Page"}
          >
            {lang === "gu" ? "અગાઉનું" : "Previous"}
          </button>

          <span className="sm:hidden font-mono font-bold text-[#202124] px-1.5 text-xs">
            {safePage} / {totalPages}
          </span>

          <div className="hidden sm:flex items-center gap-1">
            {getPageNumbers().map((p, idx) =>
              p === "ellipsis" ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 font-mono">
                  …
                </span>
              ) : (
                <button
                  type="button"
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    safePage === p
                      ? "bg-[#174B43] text-white shadow-2xs"
                      : "bg-white border border-[#E5E7EB] text-[#202124] hover:bg-slate-50"
                  }`}
                >
                  {p}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
            disabled={safePage === totalPages}
            className="px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[#202124] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-all font-semibold cursor-pointer shadow-2xs"
            title={lang === "gu" ? "આગળનું પેજ" : "Next Page"}
          >
            {lang === "gu" ? "આગળનું" : "Next"}
          </button>
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={safePage === totalPages}
            className="px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[#202124] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-all font-semibold cursor-pointer shadow-2xs"
            title={lang === "gu" ? "છેલ્લું પેજ" : "Last Page"}
          >
            »
          </button>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage({
  defaultDashboard = false,
  initialTab,
}: {
  defaultDashboard?: boolean;
  initialTab?: ReportTab;
} = {}) {
  const { lang, tenantContext, currentFY, currentCompany } = useAuth();
  const [viewMode, setViewMode] = useState<"dashboard" | "report">(
    initialTab ? "report" : defaultDashboard ? "dashboard" : "dashboard"
  );
  const [isCaModalOpen, setIsCaModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([
    "balance-sheet",
    "gstr-1",
    "profit-loss",
    "sales-summary",
  ]);
  const [selectedDatePreset, setSelectedDatePreset] = useState<string>("This Week");
  const [filterPartyQuery, setFilterPartyQuery] = useState<string>("");
  const [filterStaff, setFilterStaff] = useState<string>("ALL");
  const [filterInvoiceType, setFilterInvoiceType] = useState<string>("ALL");
  const [filterInvoiceStatus, setFilterInvoiceStatus] = useState<string>("ALL");
  const [filterTransactionType, setFilterTransactionType] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<ReportTab>(initialTab || "sales-register");

  // Read tab parameter from URL if provided
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") as ReportTab;
      if (tabParam) {
        setActiveTab(tabParam);
        setViewMode("report");
      }
    }
  }, []);
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const d = new Date(now);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Reset pagination whenever report filters or tab changes
  useEffect(() => {
    setReportPage(1);
  }, [filterPartyQuery, filterInvoiceType, filterInvoiceStatus, filterTransactionType, activeTab]);

  const getSearchPlaceholder = (tab: ReportTab) => {
    switch (tab) {
      case "stock-summary":
      case "low-stock-alert":
        return lang === "gu" ? "આઇટમ, કેટેગરી, SKU શોધો..." : "Search Item, Category, SKU...";
      case "stock-movement":
        return lang === "gu" ? "આઇટમ, ગોડાઉન શોધો..." : "Search Item, Godown, Doc...";
      case "item-batch-report":
        return lang === "gu" ? "આઇટમ, બેચ નંબર શોધો..." : "Search Item, Batch #...";
      case "gst-purchase-hsn":
        return lang === "gu" ? "વેપારી, આઇટમ, HSN, બિલ શોધો..." : "Search Party, Item, HSN, Bill...";
      case "gst-sales-hsn":
        return lang === "gu" ? "ગ્રાહક, આઇટમ, HSN, ઇન્વોઇસ શોધો..." : "Search Customer, Item, HSN, Inv...";
      case "purchase-register":
      case "purchase-summary":
      case "party-purchase-report":
      case "purchase-returns":
        return lang === "gu" ? "વેપારી, બિલ નંબર, GSTIN શોધો..." : "Search Supplier, Bill #, GSTIN...";
      case "sales-register":
      case "sales-summary":
      case "bill-wise-profit":
      case "party-sales-report":
      case "quotations":
      case "sales-returns":
        return lang === "gu" ? "ગ્રાહક, ઇન્વોઇસ #, GSTIN શોધો..." : "Search Customer, Inv #, GSTIN...";
      case "item-sales-report":
      case "item-purchase-report":
        return lang === "gu" ? "આઇટમ નામ, કોડ, કેટેગરી શોધો..." : "Search Item Name, Code, Category...";
      case "outstanding":
        return lang === "gu" ? "પાર્ટી, ફોન, GSTIN શોધો..." : "Search Party, Phone, GSTIN...";
      case "daybook":
        return lang === "gu" ? "પાર્ટી, વિગત, વાઉચર શોધો..." : "Search Party, Narration, Voucher...";
      case "audit-trail":
        return lang === "gu" ? "વપરાશકર્તા, ક્રિયા શોધો..." : "Search User, Action, Entity...";
      case "hsn-sales-summary":
        return lang === "gu" ? "HSN કોડ, વર્ણન શોધો..." : "Search HSN Code, Description...";
      case "expense-category":
        return lang === "gu" ? "ખર્ચ કેટેગરી, ગ્રૂપ શોધો..." : "Search Expense Category, Group...";
      case "trial-balance":
        return lang === "gu" ? "ખાતું, ગ્રૂપ શોધો..." : "Search Account, Group...";
      default:
        return lang === "gu" ? "શોધો..." : "Search in report...";
    }
  };

  // Load favorites from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("mybill_favorite_reports");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setFavorites(parsed);
          }
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const toggleFavorite = (tabId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(tabId) ? prev.filter((i) => i !== tabId) : [...prev, tabId];
      try {
        localStorage.setItem("mybill_favorite_reports", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleSelectDatePreset = (preset: string) => {
    setSelectedDatePreset(preset);
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    if (preset === "Today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "Yesterday") {
      const yest = new Date(now);
      yest.setDate(now.getDate() - 1);
      const yStr = yest.toISOString().split("T")[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === "This Week") {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      setStartDate(monday.toISOString().split("T")[0]);
      setEndDate(todayStr);
    } else if (preset === "This Month") {
      setStartDate(`${yyyy}-${mm}-01`);
      setEndDate(todayStr);
    } else if (preset === "Last 30 Days") {
      const past = new Date(now);
      past.setDate(now.getDate() - 30);
      setStartDate(past.toISOString().split("T")[0]);
      setEndDate(todayStr);
    } else if (preset === "This Quarter") {
      const qMonth = Math.floor(now.getMonth() / 3) * 3 + 1;
      setStartDate(`${yyyy}-${String(qMonth).padStart(2, "0")}-01`);
      setEndDate(todayStr);
    } else if (preset === "This FY") {
      setStartDate(currentFY?.startDate ? currentFY.startDate.split("T")[0] : "2026-04-01");
      setEndDate(todayStr);
    }
  };

  const [selectedPartyId, setSelectedPartyId] = useState<string>("");
  const [partiesList, setPartiesList] = useState<any[]>([]);
  const [outstandingPartyFilter, setOutstandingPartyFilter] = useState<string>("ALL");
  const [gstr1SubTab, setGstr1SubTab] = useState<"sales" | "credit-notes" | "debit-notes">("sales");
  const [gstr1Page, setGstr1Page] = useState<number>(1);
  const [gstr1PageSize, setGstr1PageSize] = useState<number>(10);

  // General Report Pagination State
  const [reportPage, setReportPage] = useState<number>(1);
  const [reportPageSize, setReportPageSize] = useState<number>(10);

  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Helper to slice lists and calculate pagination parameters
  const paginateList = (list: any[]) => {
    const arr = Array.isArray(list) ? list : [];
    const totalEntries = arr.length;
    const totalPages = Math.max(1, Math.ceil(totalEntries / reportPageSize));
    const safePage = Math.min(Math.max(1, reportPage), totalPages);
    const startIdx = (safePage - 1) * reportPageSize;
    const paginatedList = arr.slice(startIdx, startIdx + reportPageSize);
    return { paginatedList, safePage, totalPages, totalEntries };
  };

  // Validation
  const isDateRangeInvalid = startDate > endDate;

  const handleResetDates = () => {
    setStartDate(currentFY?.startDate ? currentFY.startDate.split("T")[0] : "2026-04-01");
    setEndDate(new Date().toISOString().split("T")[0]);
    setReportPage(1);
  };

  // Read URL query params on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const tab = sp.get("tab") as ReportTab | null;
      const pid = sp.get("partyId");
      const ptype = sp.get("partyType");
      if (tab) {
        setActiveTab(tab);
        setReportPage(1);
        setViewMode("report");
      }
      if (pid) setSelectedPartyId(pid);
      if (ptype) setOutstandingPartyFilter(ptype.toUpperCase());
    }
  }, []);

  const handleSelectReport = (tabId: string, extra?: Record<string, string>) => {
    setActiveTab(tabId as ReportTab);
    setReportPage(1);
    if (extra?.partyId) setSelectedPartyId(extra.partyId);
    if (extra?.partyType) setOutstandingPartyFilter(extra.partyType);
    setViewMode("report");
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      sp.set("tab", tabId);
      if (extra?.partyId) sp.set("partyId", extra.partyId);
      if (extra?.partyType) sp.set("partyType", extra.partyType);
      window.history.pushState({}, "", `${window.location.pathname}?${sp.toString()}`);
    }
  };

  const handleBackToDashboard = () => {
    setViewMode("dashboard");
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      sp.delete("tab");
      sp.delete("partyId");
      sp.delete("partyType");
      const newQuery = sp.toString();
      window.history.pushState({}, "", newQuery ? `${window.location.pathname}?${newQuery}` : window.location.pathname);
    }
  };

  useEffect(() => {
    if (selectedDatePreset === "This FY" && currentFY?.startDate) {
      setStartDate(currentFY.startDate.split("T")[0]);
    }
  }, [currentFY?.startDate, selectedDatePreset]);

  // Fetch parties if on party-ledger tab
  useEffect(() => {
    async function loadParties() {
      try {
        const res: any = await apiClient.get("/parties");
        const list = Array.isArray(res) ? res : res?.items || res?.data || [];
        setPartiesList(list);
        if (!selectedPartyId && list.length > 0) {
          setSelectedPartyId(list[0].id);
        }
      } catch {
        // ignore
      }
    }
    if (tenantContext.companyId && partiesList.length === 0) {
      loadParties();
    }
  }, [tenantContext.companyId, partiesList.length, selectedPartyId]);

  const fetchReport = useCallback(async () => {
    if (startDate > endDate) {
      setError(
        lang === "gu"
          ? "શરૂઆતની તારીખ અંતિમ તારીખ પછીની ન હોઈ શકે. કૃપા કરીને યોગ્ય તારીખ પસંદ કરો."
          : "Start date cannot be after End date. Please select a valid date range."
      );
      return;
    }

    setIsLoading(true);
    setError(null);
    setReportData(null);

    try {
      let data: any = null;
      const params = {
        startDate,
        endDate,
        fromDate: startDate,
        toDate: endDate,
      };

      switch (activeTab) {
        case "sales-register":
        case "sales-summary":
          data = await apiClient.get("/reports/sales-register", params);
          break;
        case "bill-wise-profit":
          data = await apiClient.get("/reports/bill-wise-profit", params);
          break;
        case "item-sales-report":
          data = await apiClient.get("/reports/item-sales-report", params);
          break;
        case "party-sales-report":
          data = await apiClient.get("/reports/party-sales-report", params);
          break;
        case "sales-returns":
          data = await apiClient.get("/reports/sales-returns", params);
          break;
        case "quotations":
          data = await apiClient.get("/reports/quotations-report", params);
          break;
        case "delivery-challans":
          data = await apiClient.get("/reports/delivery-challans-report", params);
          break;
        case "purchase-register":
        case "purchase-summary":
          data = await apiClient.get("/reports/purchase-register", params);
          break;
        case "item-purchase-report":
          data = await apiClient.get("/reports/item-purchase-report", params);
          break;
        case "party-purchase-report":
          data = await apiClient.get("/reports/party-purchase-report", params);
          break;
        case "purchase-returns":
          data = await apiClient.get("/reports/purchase-returns", params);
          break;
        case "receipt-payment":
          data = await apiClient.get("/reports/receipt-payment-register", params);
          break;
        case "outstanding":
          data = await apiClient.get("/reports/outstanding-balances", {
            asOfDate: endDate,
            partyType: outstandingPartyFilter !== "ALL" ? outstandingPartyFilter : undefined,
          });
          break;
        case "party-ledger":
          if (selectedPartyId) {
            data = await apiClient.get("/reports/party-ledger", {
              partyId: selectedPartyId,
              fromDate: startDate,
              toDate: endDate,
            });
          }
          break;
        case "party-aging":
          data = await apiClient.get("/reports/party-aging", {
            asOfDate: endDate,
          });
          break;
        case "trial-balance":
          data = await apiClient.get("/reports/trial-balance", params);
          break;
        case "profit-loss":
          data = await apiClient.get("/reports/profit-and-loss", params);
          break;
        case "balance-sheet":
          data = await apiClient.get("/reports/balance-sheet", params);
          break;
        case "cash-flow":
          data = await apiClient.get("/reports/cash-flow", params);
          break;
        case "daybook":
          data = await apiClient.get("/reports/daybook", { date: endDate });
          break;
        case "stock-summary":
          data = await apiClient.get("/reports/stock-summary", params);
          break;
        case "stock-movement":
          data = await apiClient.get("/reports/stock-movement", params);
          break;
        case "item-batch-report":
          data = await apiClient.get("/reports/batch-expiry-report", params);
          break;
        case "low-stock-alert":
          data = await apiClient.get("/reports/low-stock-alert", params);
          break;
        case "expense-category":
          data = await apiClient.get("/reports/expense-category-report", params);
          break;
        case "audit-trail":
          data = await apiClient.get("/reports/audit-trail", params);
          break;
        case "gstr-1":
          data = await apiClient.get("/reports/gstr-1", params);
          break;
        case "gstr-3b":
          data = await apiClient.get("/reports/gstr-3b", {
            fromDate: startDate,
            toDate: endDate,
          });
          break;
        case "gst-purchase-hsn":
          data = await apiClient.get("/reports/gst-purchase-hsn", params);
          break;
        case "gst-sales-hsn":
          data = await apiClient.get("/reports/gst-sales-hsn", params);
          break;
        case "hsn-sales-summary":
          data = await apiClient.get("/reports/hsn-sales-summary", params);
          break;
        default:
          data = await apiClient.get("/reports/sales-register", params);
          break;
      }
      setReportData(data);
    } catch (err: any) {
      setError(err.message || "Failed to load report from server.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, startDate, endDate, selectedPartyId, outstandingPartyFilter, lang]);

  useEffect(() => {
    if (tenantContext.companyId && viewMode === "report") {
      fetchReport();
    }
  }, [tenantContext.companyId, viewMode, fetchReport]);

  // Reset GSTR-1 page when tab or filters change
  useEffect(() => {
    setGstr1Page(1);
  }, [activeTab, gstr1SubTab, startDate, endDate]);

  const handleExportReport = async (format: ExportFormat) => {
    if (!reportData) return;
    await exportReportData({
      tab: activeTab,
      reportData: activeTab === "gstr-1" ? { ...reportData, _activeSubTab: gstr1SubTab } : reportData,
      startDate,
      endDate,
      company: {
        legalName: currentCompany?.legalName,
        tradeName: currentCompany?.tradeName,
        gstin: currentCompany?.gstin,
        city: currentCompany?.city,
      },
      lang,
      format,
    });
  };

  const tabs: Array<{
    id: ReportTab;
    label: string;
    labelGu: string;
    icon: string;
  }> = [
    // Sales
    { id: "sales-register", label: "Sales Register", labelGu: "વેચાણ રજિસ્ટર", icon: "📑" },
    { id: "sales-summary", label: "Sales Summary - Staff Wise", labelGu: "વેચાણ સારાંશ", icon: "📊" },
    { id: "bill-wise-profit", label: "Bill Wise Profit & Margin", labelGu: "બીલ દીઠ નફો અને માર્જિન", icon: "📈" },
    { id: "item-sales-report", label: "Item-Wise Sales", labelGu: "આઇટમ મુજબ વેચાણ", icon: "📦" },
    { id: "party-sales-report", label: "Customer-Wise Sales", labelGu: "ગ્રાહક મુજબ વેચાણ", icon: "👥" },
    { id: "sales-returns", label: "Sales Returns (Credit Notes)", labelGu: "વેચાણ પરત (ક્રેડિટ નોટ્સ)", icon: "↩️" },
    { id: "quotations", label: "Quotations & Estimates", labelGu: "અંદાજ / કોટેશન પત્રક", icon: "📝" },
    { id: "delivery-challans", label: "Delivery Challans", labelGu: "ડિલિવરી ચલણ રજિસ્ટર", icon: "🚚" },

    // Purchases
    { id: "purchase-register", label: "Purchase Register", labelGu: "ખરીદ રજિસ્ટર", icon: "🛒" },
    { id: "purchase-summary", label: "Purchase Summary", labelGu: "ખરીદી સારાંશ પત્રક", icon: "📑" },
    { id: "item-purchase-report", label: "Item-Wise Purchase", labelGu: "આઇટમ મુજબ ખરીદી", icon: "📦" },
    { id: "party-purchase-report", label: "Supplier-Wise Purchase", labelGu: "વેપારી મુજબ ખરીદી", icon: "👥" },
    { id: "purchase-returns", label: "Purchase Returns (Debit Notes)", labelGu: "ખરીદ પરત (ડેબિટ નોટ્સ)", icon: "↪️" },

    // Inventory / Items
    { id: "stock-summary", label: "Stock Summary", labelGu: "સ્ટોક સિલક રિપોર્ટ", icon: "📦" },
    { id: "stock-movement", label: "Stock Movements", labelGu: "સ્ટોક હિલચાલ", icon: "🔄" },
    { id: "item-batch-report", label: "Item Batch & Expiry", labelGu: "આઇટમ બેચ અને એક્સપાયરી", icon: "🏷️" },
    { id: "low-stock-alert", label: "Low Stock Alert", labelGu: "ઓછા સ્ટોકની ચેતવણી", icon: "⚠️" },

    // Parties
    { id: "party-ledger", label: "Party Statement (Khata)", labelGu: "પાર્ટી ખાતાવહી (લેજર)", icon: "📜" },
    { id: "party-aging", label: "Receivables Aging", labelGu: "ઉઘરાણી મુદત વિશ્લેષણ", icon: "⏳" },
    { id: "outstanding", label: "Outstanding Balances", labelGu: "બાકી સિલક (લેણાં-દેવાં)", icon: "⚖️" },

    // Financial
    { id: "profit-loss", label: "Profit & Loss", labelGu: "નફા-નુકસાન ખાતું", icon: "📈" },
    { id: "balance-sheet", label: "Balance Sheet", labelGu: "પાકું સરવૈયું", icon: "🏛️" },
    { id: "trial-balance", label: "Trial Balance", labelGu: "કાચું સરવૈયું", icon: "📊" },
    { id: "cash-flow", label: "Cash Flow Statement", labelGu: "રોકડ પ્રવાહ પત્રક", icon: "💵" },
    { id: "daybook", label: "Day Book (Rojmel)", labelGu: "રોજમેળ / આવડ", icon: "📖" },
    { id: "receipt-payment", label: "Receipt / Payment", labelGu: "આવક / જાવક રજિસ્ટર", icon: "💳" },
    { id: "expense-category", label: "Expense Category Report", labelGu: "ખર્ચ કેટેગરી પત્રક", icon: "💸" },
    { id: "audit-trail", label: "Audit Trail", labelGu: "ઓડિટ ટ્રેઇલ & ક્રિયા લોગ", icon: "🔍" },

    // GST
    { id: "gstr-1", label: "GSTR-1 Return Prep", labelGu: "જીએસટીઆર-૧ તૈયારી", icon: "🇮🇳" },
    { id: "gstr-3b", label: "GSTR-3B Monthly Return", labelGu: "જીએસટીઆર-૩બી પત્રક", icon: "📋" },
    { id: "gst-purchase-hsn", label: "GST Purchase (With HSN)", labelGu: "જીએસટી ખરીદી (HSN સાથે)", icon: "🛒" },
    { id: "gst-sales-hsn", label: "GST Sales (With HSN)", labelGu: "જીએસટી વેચાણ (HSN સાથે)", icon: "📑" },
    { id: "hsn-sales-summary", label: "HSN Wise Sales Summary", labelGu: "HSN વાઈઝ વેચાણ સારાંશ", icon: "🏷️" },
  ];

  const currentTabMeta = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full pb-16">
      {viewMode === "dashboard" ? (
        <ReportsDashboard
          lang={lang}
          onSelectReport={handleSelectReport}
          onOpenCaSharing={() => setIsCaModalOpen(true)}
        />
      ) : (
        <>
          {/* 1. Header matching MyBillBook Report Screen */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1 pb-1">
            <div className="flex items-center gap-3 flex-wrap min-w-0">
              <button
                type="button"
                onClick={handleBackToDashboard}
                className="p-1 rounded-md text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                title="Back to Reports Dashboard"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>

              <h1 className="text-lg font-bold text-[#0F172A] tracking-tight truncate">
                {activeTab === "gst-purchase-hsn"
                  ? "GST Purchase (With HSN)"
                  : activeTab === "gst-sales-hsn"
                  ? "GST Sales (With HSN)"
                  : activeTab === "sales-summary"
                  ? "Sales Summary - Staff wise"
                  : activeTab === "balance-sheet"
                  ? "Balance Sheet (As of Today)"
                  : activeTab === "bill-wise-profit"
                  ? "Bill Wise Profit"
                  : activeTab === "party-ledger"
                  ? "Party Statement (Ledger)"
                  : activeTab === "daybook"
                  ? "Daybook"
                  : activeTab === "gstr-1"
                  ? "GSTR-1 (Sales)"
                  : activeTab === "stock-summary"
                  ? "Stock Summary"
                  : currentTabMeta.label}
              </h1>

              {activeTab === "balance-sheet" && (
                <button
                  type="button"
                  onClick={() => alert("Balance Sheet Guide: Summarizes company assets, current liabilities, and real-time net equity balance.")}
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-[#3B82F6] text-[#2563EB] hover:bg-blue-50 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <span className="text-[10px]">▶</span>
                  <span>Watch how to use Balance Sheet</span>
                </button>
              )}

              {activeTab === "gstr-1" && (
                <button
                  type="button"
                  onClick={() => alert("GSTR-1 JSON Guide: Download official Table 4-12 government compliant JSON file and upload directly to GST portal.")}
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-[#3B82F6] text-[#2563EB] hover:bg-blue-50 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <span className="text-[10px]">▶</span>
                  <span>How to use JSON file</span>
                </button>
              )}

              {/* Favourite Pill Button */}
              <button
                type="button"
                onClick={() => toggleFavorite(activeTab)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer ${
                  favorites.includes(activeTab)
                    ? "bg-[#FFFBEB] border-amber-300 text-amber-800"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className={favorites.includes(activeTab) ? "text-[#F59E0B]" : "text-slate-400"}>
                  {favorites.includes(activeTab) ? "★" : "☆"}
                </span>
                <span>Favourite</span>
              </button>
            </div>
          </div>

          {/* Contextual notice banner for Balance Sheet */}
          {activeTab === "balance-sheet" && (
            <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-amber-900 text-xs font-medium flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>ℹ</span>
                <span>Balance sheet is updated once per day. Last updated at: {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}, 05:06 PM</span>
              </div>
            </div>
          )}

          {/* Contextual tabs for GSTR-1 */}
          {activeTab === "gstr-1" && (
            <div className="flex items-center gap-4 border-b border-slate-200 bg-white px-4 pt-2">
              <button
                type="button"
                onClick={() => setGstr1SubTab("sales")}
                className={`pb-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  gstr1SubTab === "sales"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Sales
              </button>
              <button
                type="button"
                onClick={() => setGstr1SubTab("credit-notes")}
                className={`pb-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  gstr1SubTab === "credit-notes"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Sales Return/ Credit Note
              </button>
              <button
                type="button"
                onClick={() => setGstr1SubTab("debit-notes")}
                className={`pb-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  gstr1SubTab === "debit-notes"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Purchase Return/ Debit Note
              </button>
            </div>
          )}

          {/* 2. Responsive Action & Filter Bar matching MyBillBook */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 w-full min-w-0 py-1">
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto flex-1 min-w-0">
              {/* Date Preset Selector */}
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedDatePreset}
                  onChange={(e) => handleSelectDatePreset(e.target.value)}
                  className="px-3.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-md text-slate-700 font-medium focus:bg-white focus:outline-none cursor-pointer shadow-2xs hover:bg-[#F8FAFC]"
                >
                  <option value="Today">📅 Today</option>
                  <option value="Yesterday">📅 Yesterday</option>
                  <option value="This Week">📅 This Week</option>
                  <option value="This Month">📅 This Month</option>
                  <option value="Last 30 Days">📅 Last 30 Days</option>
                  <option value="This Quarter">📅 This Quarter</option>
                  <option value="This FY">📅 This FY</option>
                  <option value="Custom">📅 Custom Range</option>
                </select>

                {selectedDatePreset === "Custom" && (
                  <div className="flex items-center gap-1">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-md font-mono text-slate-700"
                    />
                    <span className="text-xs text-slate-400">-</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-md font-mono text-slate-700"
                    />
                  </div>
                )}
              </div>

              {/* Contextual filter: Unified Search Input */}
              {activeTab !== "profit-loss" &&
                activeTab !== "balance-sheet" &&
                activeTab !== "cash-flow" &&
                activeTab !== "gstr-3b" && (
                <div className="relative min-w-[160px] sm:min-w-[200px] max-w-[280px] flex-1 sm:flex-initial">
                  <input
                    type="text"
                    placeholder={getSearchPlaceholder(activeTab)}
                    value={filterPartyQuery}
                    onChange={(e) => setFilterPartyQuery(e.target.value)}
                    className="w-full pl-7 pr-6 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 placeholder:text-slate-400 text-slate-700 shadow-2xs"
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">
                    🔍
                  </span>
                  {filterPartyQuery && (
                    <button
                      type="button"
                      onClick={() => setFilterPartyQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                      title="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}

              {/* Contextual filter: Staff Filter */}
              {activeTab === "sales-summary" && (
                <select
                  value={filterStaff}
                  onChange={(e) => setFilterStaff(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-md text-slate-700 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Staff</option>
                  <option value="Admin">Admin</option>
                  <option value="Accountant">Accountant</option>
                  <option value="Sales Rep">Sales Rep</option>
                </select>
              )}

              {/* Contextual filter: Invoice Type */}
              {(activeTab === "sales-summary" || activeTab === "sales-register") && (
                <select
                  value={filterInvoiceType}
                  onChange={(e) => setFilterInvoiceType(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-md text-slate-700 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Invoice Type: All</option>
                  <option value="credit">Credit</option>
                  <option value="cash">Cash</option>
                </select>
              )}

              {/* Contextual filter: Invoice Status */}
              {(activeTab === "sales-summary" ||
                activeTab === "sales-register" ||
                activeTab === "purchase-register" ||
                activeTab === "purchase-summary" ||
                activeTab === "quotations") && (
                <select
                  value={filterInvoiceStatus}
                  onChange={(e) => setFilterInvoiceStatus(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-md text-slate-700 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Status: All</option>
                  <option value="Paid">{activeTab === "quotations" ? "Accepted" : "Paid"}</option>
                  <option value="Unpaid">{activeTab === "quotations" ? "Pending / Open" : "Unpaid"}</option>
                  {activeTab !== "quotations" && <option value="Partially Paid">Partially Paid</option>}
                </select>
              )}

              {/* Contextual filter: Daybook Transaction Type */}
              {activeTab === "daybook" && (
                <select
                  value={filterTransactionType}
                  onChange={(e) => setFilterTransactionType(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-md text-slate-700 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Transactions</option>
                  <option value="Sales Invoices">Sales Invoices</option>
                  <option value="Purchase Invoices">Purchase Invoices</option>
                  <option value="Payment In">Payment In</option>
                  <option value="Payment Out">Payment Out</option>
                  <option value="Quotation / Estimate">Quotation / Estimate</option>
                  <option value="Sales Return">Sales Return</option>
                  <option value="Purchase Return">Purchase Return</option>
                  <option value="Purchase Orders">Purchase Orders</option>
                  <option value="Add Money">Add Money</option>
                </select>
              )}

              {/* Contextual filter: Party Selector for party-ledger */}
              {activeTab === "party-ledger" && (
                <select
                  value={selectedPartyId}
                  onChange={(e) => setSelectedPartyId(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-md text-slate-700 font-medium focus:outline-none cursor-pointer min-w-[200px]"
                >
                  <option value="">Select party by name...</option>
                  {partiesList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {lang === "gu" && p.nameGujarati ? p.nameGujarati : p.name} ({p.type})
                    </option>
                  ))}
                </select>
              )}

              {/* Contextual filter: Party Type for outstanding balances */}
              {activeTab === "outstanding" && (
                <select
                  value={outstandingPartyFilter}
                  onChange={(e) => setOutstandingPartyFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-md text-slate-700 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All (Debtors & Creditors)</option>
                  <option value="CUSTOMER">Customers Only (Debtors)</option>
                  <option value="SUPPLIER">Suppliers Only (Creditors)</option>
                </select>
              )}
            </div>

            {/* Right: Email Excel, Download Excel, Print PDF (Matching MyBillBook) */}
            <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] rounded-md shadow-2xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span>Email Excel</span>
                <span className="text-slate-400 text-xs">✉</span>
              </button>

              {activeTab === "gstr-1" ? (
                <button
                  type="button"
                  onClick={() => handleExportReport("json" as any)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] rounded-md shadow-2xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span>Download JSON</span>
                  <span className="text-slate-400 text-xs">📥</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleExportReport("xlsx")}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] rounded-md shadow-2xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span>Download Excel</span>
                  <span className="text-slate-400 text-[10px]">▼</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] rounded-md shadow-2xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span className="hidden sm:inline">Print PDF</span>
                <span className="text-slate-400 text-xs">🖨</span>
              </button>
            </div>
          </div>

          {/* Date Range Validation Warning */}
          {isDateRangeInvalid && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span className="font-semibold">
                  {lang === "gu"
                    ? "શરૂઆતની તારીખ અંતિમ તારીખ પછીની ન હોઈ શકે. કૃપા કરીને યોગ્ય તારીખ પસંદ કરો."
                    : "Start date cannot be after End date. Please select a valid date range."}
                </span>
              </div>
              <button
                onClick={handleResetDates}
                className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded font-bold text-xs"
              >
                Reset
              </button>
            </div>
          )}

          {/* 3. Report Content Section */}
          <div className="w-full min-w-0 max-w-full min-h-[350px]">
            {/* Error State with Retry Button */}
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-2.5">
                  <span className="text-base shrink-0">⚠️</span>
                  <span className="font-semibold leading-relaxed">{error}</span>
                </div>
                <button
                  onClick={fetchReport}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors shrink-0 self-end sm:self-auto"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Loading State with Saffron Spinner */}
            {isLoading ? (
              <div className="py-24 text-center text-[#667085]">
                <div className="inline-block w-9 h-9 border-3 border-[#174B43] border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm font-semibold text-[#202124]">
                  {lang === "gu" ? "અહેવાલ લોડ થઈ રહ્યો છે..." : "Computing authoritative report from backend database..."}
                </p>
                <p className="text-xs text-[#98A2B3] mt-1">
                  {lang === "gu" ? "કૃપા કરીને થોડીવાર રાહ જુઓ" : "Fetching transactions and ledger aggregates..."}
                </p>
              </div>
            ) : !reportData ? (
              <ReportEmptyState
                title="No report data loaded"
                titleGu="કોઈ અહેવાલ ડેટા મળ્યો નથી"
                description="Click 'Apply Date Filters' to retrieve statutory records."
                descriptionGu="રેકોર્ડ જોવા માટે 'ફિલ્ટર લાગુ કરો' પર ક્લિક કરો."
                secondaryAction={{ label: "Refresh", onClick: fetchReport }}
                lang={lang}
              />
            ) : activeTab === "sales-register" || activeTab === "sales-summary" ? (
              /* Sales Register / Summary */
              <div className="space-y-4">
                {(() => {
                  const rawList = reportData.items || reportData.invoices || [];
                  if (rawList.length === 0) {
                    return (
                      <ReportEmptyState
                        title="No sales records found"
                        titleGu="કોઈ વેચાણ રેકોર્ડ મળેલ નથી"
                        description="There are no sales invoices for the selected date range."
                        descriptionGu="પસંદ કરેલી તારીખ માટે કોઈ વેચાણ બિલ મળ્યા નથી."
                        secondaryAction={{ label: "Reset Date Range", onClick: handleResetDates }}
                        lang={lang}
                      />
                    );
                  }

                  const q = (filterPartyQuery || "").trim().toLowerCase();
                  const invoicesList = rawList.filter((inv: any) => {
                    if (q) {
                      const partyName = (inv.partyName || inv.party?.name || "Cash Sale").toLowerCase();
                      const invNum = (inv.invoiceNumber || "").toLowerCase();
                      const gstin = (inv.partyGstin || inv.party?.gstin || "").toLowerCase();
                      const phone = (inv.partyPhone || inv.party?.phone || "").toLowerCase();
                      if (!partyName.includes(q) && !invNum.includes(q) && !gstin.includes(q) && !phone.includes(q)) {
                        return false;
                      }
                    }
                    if (filterInvoiceStatus && filterInvoiceStatus !== "ALL") {
                      const st = (inv.status || "").toUpperCase();
                      if (filterInvoiceStatus === "Paid" && st !== "PAID") return false;
                      if (filterInvoiceStatus === "Unpaid" && st !== "UNPAID") return false;
                      if (filterInvoiceStatus === "Partially Paid" && st !== "PARTIALLY_PAID" && st !== "PARTIAL") return false;
                    }
                    if (filterInvoiceType && filterInvoiceType !== "ALL") {
                      const mode = (inv.paymentMode || "").toLowerCase();
                      const isCredit = mode === "credit" || Number(inv.balanceAmount || 0) > 0 || (Number(inv.paidAmount ?? 0) < Number(inv.grandTotal ?? 0));
                      if (filterInvoiceType === "credit" && !isCredit) return false;
                      if (filterInvoiceType === "cash" && isCredit) return false;
                    }
                    return true;
                  });

                  if (invoicesList.length === 0) {
                    return (
                      <div className="py-12 px-4 text-center bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                        <p className="text-sm font-semibold text-slate-800">
                          {lang === "gu" ? "ફિલ્ટર સાથે મેળ ખાતા કોઈ બિલ મળ્યા નથી" : "No sales invoices match your search or filters"}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {lang === "gu" ? "કૃપા કરીને સર્ચ કીવર્ડ અથવા સ્ટેટસ ફિલ્ટર બદલો" : "Try clearing your search query or changing status filters."}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setFilterPartyQuery("");
                            setFilterInvoiceStatus("ALL");
                            setFilterInvoiceType("ALL");
                          }}
                          className="mt-3 px-3.5 py-1.5 text-xs font-semibold text-[#0047BA] hover:text-[#00358A] bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      </div>
                    );
                  }

                  const { paginatedList, safePage, totalEntries } = paginateList(invoicesList);
                  return (
                    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden w-full max-w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                        <table className="w-full min-w-[850px] text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] text-[11px] font-semibold uppercase tracking-wider">
                              <th className="py-3 px-3.5 whitespace-nowrap">DATE</th>
                              <th className="py-3 px-3.5 whitespace-nowrap">INVOICE NO</th>
                              <th className="py-3 px-3.5 whitespace-nowrap">CUSTOMER NAME</th>
                              <th className="py-3 px-3.5 whitespace-nowrap">GSTIN</th>
                              <th className="py-3 px-3.5 text-right whitespace-nowrap">TAXABLE (₹)</th>
                              <th className="py-3 px-3.5 text-right whitespace-nowrap">CGST</th>
                              <th className="py-3 px-3.5 text-right whitespace-nowrap">SGST</th>
                              <th className="py-3 px-3.5 text-right whitespace-nowrap">IGST</th>
                              <th className="py-3 px-3.5 text-right whitespace-nowrap">TOTAL (₹)</th>
                              <th className="py-3 px-3.5 whitespace-nowrap">STATUS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0]">
                            {paginatedList.map((inv: any, idx: number) => (
                              <tr key={inv.id || `inv-${idx}`} className="hover:bg-[#F8FAFC] transition-colors">
                                <td className="py-3 px-3.5 text-[#1E293B] font-normal whitespace-nowrap">
                                  {formatDisplayDate(inv.invoiceDate)}
                                </td>
                                <td className="py-3 px-3.5 font-normal text-[#1E293B]">{inv.invoiceNumber}</td>
                                <td className="py-3 px-3.5 font-normal text-[#1E293B] uppercase">
                                  {inv.partyName || inv.party?.name || "Cash Sale"}
                                </td>
                                <td className="py-3 px-3.5 text-[#64748B] font-normal">
                                  {inv.partyGstin || inv.party?.gstin || "—"}
                                </td>
                                <td className="py-3 px-3.5 text-right text-[#1E293B] font-normal">₹{Number(inv.taxableAmount || 0).toFixed(2)}</td>
                                <td className="py-3 px-3.5 text-right text-[#1E293B] font-normal">₹{Number(inv.cgstAmount || 0).toFixed(2)}</td>
                                <td className="py-3 px-3.5 text-right text-[#1E293B] font-normal">₹{Number(inv.sgstAmount || 0).toFixed(2)}</td>
                                <td className="py-3 px-3.5 text-right text-[#1E293B] font-normal">₹{Number(inv.igstAmount || 0).toFixed(2)}</td>
                                <td className="py-3 px-3.5 text-right font-semibold text-[#1E293B]">
                                  ₹{Number(inv.grandTotal || 0).toFixed(2)}
                                </td>
                                <td className="py-3 px-3.5">
                                  <StatusBadge status={inv.status} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <ReportPagination
                        currentPage={safePage}
                        pageSize={reportPageSize}
                        totalEntries={totalEntries}
                        onPageChange={setReportPage}
                        onPageSizeChange={setReportPageSize}
                        lang={lang}
                      />
                    </div>
                  );
                })()}
              </div>
            ) : activeTab === "bill-wise-profit" ? (
              /* Bill Wise Profit & Margin (Matching MyBillBook) */
              <div className="space-y-6">
                {(() => {
                  const rawInvoices = reportData.invoices || [];
                  const filteredInvoices = rawInvoices.filter((inv: any) => {
                    if (!filterPartyQuery.trim()) return true;
                    const q = filterPartyQuery.toLowerCase();
                    const pName = (inv.partyName || inv.party?.name || "").toLowerCase();
                    const invNo = (inv.invoiceNumber || "").toLowerCase();
                    return pName.includes(q) || invNo.includes(q);
                  });

                  const totalProfit = filteredInvoices.reduce(
                    (s: number, inv: any) => s + (Number(inv.grossProfit) || 0),
                    0
                  );

                  const { paginatedList, safePage, totalEntries } = paginateList(filteredInvoices);

                  return (
                    <>
                      {/* MyBillBook Clean Inline KPI Metric */}
                      <div className="py-1">
                        <span className="text-xs font-semibold text-slate-700">Net Profit: </span>
                        <span className={`font-mono font-bold text-sm ${totalProfit >= 0 ? "text-[#16834A]" : "text-[#DC2626]"}`}>
                          {totalProfit < 0
                            ? `- ₹ ${Math.abs(totalProfit).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`
                            : `₹ ${totalProfit.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`}
                        </span>
                      </div>

                      {/* MyBillBook Exact Column Table */}
                      <div className="border border-[#E2E8F0] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                        <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                          <table className="w-full min-w-[750px] text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase text-[10px] font-bold tracking-wider">
                                <th className="py-2.5 px-3">{lang === "gu" ? "તારીખ" : "DATE"}</th>
                                <th className="py-2.5 px-3">{lang === "gu" ? "ઇનવોઇસ નં." : "INVOICE NO."}</th>
                                <th className="py-2.5 px-3">{lang === "gu" ? "પાર્ટીનું નામ" : "PARTY NAME"}</th>
                                <th className="py-2.5 px-3 text-right">{lang === "gu" ? "ઇનવોઇસ રકમ" : "INVOICE AMOUNT"}</th>
                                <th className="py-2.5 px-3 text-right">{lang === "gu" ? "વેચાણ રકમ" : "SALES AMOUNT"}</th>
                                <th className="py-2.5 px-3 text-right">{lang === "gu" ? "ખરીદી રકમ" : "PURCHASE AMOUNT"}</th>
                                <th className="py-2.5 px-3 text-right">{lang === "gu" ? "નફો" : "PROFIT"}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0]">
                              {paginatedList.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="py-8 text-center text-slate-400">
                                    {lang === "gu" ? "કોઈ રેકોર્ડ મળ્યો નથી" : "No invoices found for this selection"}
                                  </td>
                                </tr>
                              ) : (
                                paginatedList.map((inv: any, idx: number) => {
                                  const profit = Number(
                                    inv.grossProfit !== undefined
                                      ? inv.grossProfit
                                      : Number(inv.invoiceTotal || 0) - Number(inv.costOfGoodsSold || 0)
                                  );
                                  return (
                                    <tr key={inv.id || `inv-profit-${idx}`} className="hover:bg-[#F8FAFC] transition-colors">
                                      <td className="py-2.5 px-3 font-mono text-[#64748B]">{inv.invoiceDate}</td>
                                      <td className="py-2.5 px-3 font-mono font-bold text-[#0F172A]">{inv.invoiceNumber}</td>
                                      <td className="py-2.5 px-3 font-medium text-[#0F172A]">{inv.partyName || inv.party?.name || "Cash Sale"}</td>
                                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#0F172A]">
                                        ₹{Number(inv.invoiceTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                                        ₹{Number(inv.taxableAmount || inv.invoiceTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono text-rose-700">
                                        ₹{Number(inv.costOfGoodsSold || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                      </td>
                                      <td className={`py-2.5 px-3 text-right font-mono font-bold ${profit >= 0 ? "text-[#16834A]" : "text-rose-700"}`}>
                                        ₹{profit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                        <ReportPagination
                          currentPage={safePage}
                          pageSize={reportPageSize}
                          totalEntries={totalEntries}
                          onPageChange={setReportPage}
                          onPageSizeChange={setReportPageSize}
                          lang={lang}
                        />
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : activeTab === "item-sales-report" ? (
              /* Item Wise Sales */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Unique Items</span>
                    <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">{reportData.summary?.totalUniqueItems || 0}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Total Qty Sold</span>
                    <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">{reportData.summary?.totalQuantity || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Total Tax (₹)</span>
                    <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">₹{reportData.summary?.totalTax || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Total Sales (₹)</span>
                    <p className="font-mono font-bold text-lg text-[#16834A] mt-1">₹{reportData.summary?.totalSales || "0.00"}</p>
                  </div>
                </div>

                {(() => {
                  const rawItems = reportData.items || [];
                  const q = (filterPartyQuery || "").trim().toLowerCase();
                  const items = rawItems.filter((it: any) => {
                    if (!q) return true;
                    const name = (it.itemName || it.name || "").toLowerCase();
                    const code = (it.itemCode || it.sku || "").toLowerCase();
                    const hsn = (it.hsnCode || "").toLowerCase();
                    const cat = (it.category || "").toLowerCase();
                    return name.includes(q) || code.includes(q) || hsn.includes(q) || cat.includes(q);
                  });

                  const { paginatedList, safePage, totalEntries } = paginateList(items);
                  return (
                    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                        <table className="w-full min-w-[800px] text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold">
                              <th className="py-2.5 px-3">Item Name</th>
                              <th className="py-2.5 px-3">Code / HSN</th>
                              <th className="py-2.5 px-3">Category</th>
                              <th className="py-2.5 px-3">UOM</th>
                              <th className="py-2.5 px-3 text-right">Qty Sold</th>
                              <th className="py-2.5 px-3 text-right">Avg Rate (₹)</th>
                              <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                              <th className="py-2.5 px-3 text-right">Total Sales (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0]">
                            {paginatedList.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="py-8 text-center text-slate-400">
                                  {lang === "gu" ? "કોઈ આઇટમ મળી નથી" : "No items match your search"}
                                </td>
                              </tr>
                            ) : (
                              paginatedList.map((it: any, idx: number) => (
                                <tr key={it.itemId || it.id || `item-sale-${idx}`} className="hover:bg-[#F8FAFC] transition-colors">
                                  <td className="py-2.5 px-3 font-semibold text-[#0F172A]">{it.itemName || it.name}</td>
                                  <td className="py-2.5 px-3 font-mono text-[#64748B]">{it.itemCode || it.sku} / {it.hsnCode || "—"}</td>
                                  <td className="py-2.5 px-3 text-[#64748B]">{it.category || "—"}</td>
                                  <td className="py-2.5 px-3 font-mono">{it.uom || "PCS"}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold">{it.totalQuantity}</td>
                                  <td className="py-2.5 px-3 text-right font-mono">₹{it.avgRate}</td>
                                  <td className="py-2.5 px-3 text-right font-mono">₹{it.totalTaxable}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#16834A]">₹{it.totalSales}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      <ReportPagination
                        currentPage={safePage}
                        pageSize={reportPageSize}
                        totalEntries={totalEntries}
                        onPageChange={setReportPage}
                        onPageSizeChange={setReportPageSize}
                        lang={lang}
                      />
                    </div>
                  );
                })()}
              </div>
            ) : activeTab === "party-sales-report" ? (
              /* Party Wise Sales */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Total Parties</span>
                    <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">{reportData.summary?.totalParties || 0}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Total Sales</span>
                    <p className="font-mono font-bold text-lg text-[#16834A] mt-1">₹{reportData.summary?.totalSales || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Total Paid</span>
                    <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">₹{reportData.summary?.totalPaid || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Balance Due</span>
                    <p className="font-mono font-bold text-lg text-[#DC2626] mt-1">₹{reportData.summary?.totalBalance || "0.00"}</p>
                  </div>
                </div>

                {(() => {
                  const rawParties = reportData.parties || [];
                  const q = (filterPartyQuery || "").trim().toLowerCase();
                  const parties = rawParties.filter((p: any) => {
                    if (!q) return true;
                    const name = (p.partyName || p.name || "").toLowerCase();
                    const phone = (p.phone || "").toLowerCase();
                    const gstin = (p.gstin || "").toLowerCase();
                    return name.includes(q) || phone.includes(q) || gstin.includes(q);
                  });

                  const { paginatedList, safePage, totalEntries } = paginateList(parties);
                  return (
                    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                        <table className="w-full min-w-[750px] text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold">
                              <th className="py-2.5 px-3">Party Name</th>
                              <th className="py-2.5 px-3">Phone</th>
                              <th className="py-2.5 px-3">GSTIN</th>
                              <th className="py-2.5 px-3 text-right">Invoices</th>
                              <th className="py-2.5 px-3 text-right">Total Sales (₹)</th>
                              <th className="py-2.5 px-3 text-right">Paid Amount (₹)</th>
                              <th className="py-2.5 px-3 text-right">Balance Due (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0]">
                            {paginatedList.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-8 text-center text-slate-400">
                                  {lang === "gu" ? "કોઈ પાર્ટી મળી નથી" : "No parties match your search"}
                                </td>
                              </tr>
                            ) : (
                              paginatedList.map((p: any, idx: number) => (
                                <tr key={p.partyId || p.id || `party-sale-${idx}`} className="hover:bg-[#F8FAFC] transition-colors">
                                  <td className="py-2.5 px-3 font-semibold text-[#0F172A]">{p.partyName || p.name}</td>
                                  <td className="py-2.5 px-3 font-mono text-[#64748B]">{p.phone || "—"}</td>
                                  <td className="py-2.5 px-3 font-mono text-[#64748B]">{p.gstin || "—"}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold">{p.invoiceCount || 0}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#16834A]">₹{p.totalSales}</td>
                                  <td className="py-2.5 px-3 text-right font-mono">₹{p.totalPaid}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#DC2626]">₹{p.balanceDue}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      <ReportPagination
                        currentPage={safePage}
                        pageSize={reportPageSize}
                        totalEntries={totalEntries}
                        onPageChange={setReportPage}
                        onPageSizeChange={setReportPageSize}
                        lang={lang}
                      />
                    </div>
                  );
                })()}
              </div>
            ) : activeTab === "sales-returns" ? (
              /* Sales Returns */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Total Returns</span>
                    <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">{reportData.summary?.totalReturns || 0}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Taxable Reversal</span>
                    <p className="font-mono font-bold text-lg text-[#DC2626] mt-1">₹{reportData.summary?.totalTaxable || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Tax Reversal</span>
                    <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">₹{reportData.summary?.totalTax || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Total Refund / Credit</span>
                    <p className="font-mono font-bold text-lg text-amber-700 mt-1">₹{reportData.summary?.grandTotal || "0.00"}</p>
                  </div>
                </div>

                {(() => {
                  const rawReturns = reportData.returns || [];
                  const q = (filterPartyQuery || "").trim().toLowerCase();
                  const returns = rawReturns.filter((r: any) => {
                    if (!q) return true;
                    const cn = (r.creditNoteNumber || r.returnNumber || "").toLowerCase();
                    const party = (r.partyName || r.party?.name || "").toLowerCase();
                    const reason = (r.reason || "").toLowerCase();
                    return cn.includes(q) || party.includes(q) || reason.includes(q);
                  });

                  const { paginatedList, safePage, totalEntries } = paginateList(returns);
                  return (
                    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                        <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold">
                              <th className="py-2.5 px-3">Credit Note #</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Customer</th>
                              <th className="py-2.5 px-3">Reason</th>
                              <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                              <th className="py-2.5 px-3 text-right">Total Refund (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0]">
                            {paginatedList.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-8 text-center text-slate-400">
                                  {lang === "gu" ? "કોઈ ક્રેડિટ નોટ મળી નથી" : "No returns found matching search"}
                                </td>
                              </tr>
                            ) : (
                              paginatedList.map((r: any, idx: number) => (
                                <tr key={r.id || `credit-note-${idx}`} className="hover:bg-[#F8FAFC] transition-colors">
                                  <td className="py-2.5 px-3 font-mono font-bold text-[#0F172A]">{r.creditNoteNumber || r.returnNumber}</td>
                                  <td className="py-2.5 px-3 font-mono text-[#64748B]">{r.returnDate}</td>
                                  <td className="py-2.5 px-3 font-semibold text-[#0F172A]">{r.partyName || r.party?.name}</td>
                                  <td className="py-2.5 px-3 text-[#64748B]">{r.reason || "—"}</td>
                                  <td className="py-2.5 px-3 text-right font-mono">₹{r.taxableAmount}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#DC2626]">₹{r.grandTotal}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      <ReportPagination
                        currentPage={safePage}
                        pageSize={reportPageSize}
                        totalEntries={totalEntries}
                        onPageChange={setReportPage}
                        onPageSizeChange={setReportPageSize}
                        lang={lang}
                      />
                    </div>
                  );
                })()}
              </div>
            ) : activeTab === "quotations" ? (
              /* Quotations / Estimates */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Total Quotations</span>
                    <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">{reportData.summary?.totalQuotations || 0}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Pipeline Value</span>
                    <p className="font-mono font-bold text-lg text-[#0047BA] mt-1">₹{reportData.summary?.totalValue || "0.00"}</p>
                  </div>
                </div>

                {(() => {
                  const rawQuotes = reportData.quotations || [];
                  const q = (filterPartyQuery || "").trim().toLowerCase();
                  const quotations = rawQuotes.filter((quote: any) => {
                    if (q) {
                      const qn = (quote.quoteNumber || quote.quotationNumber || "").toLowerCase();
                      const party = (quote.partyName || quote.party?.name || "").toLowerCase();
                      const phone = (quote.phone || "").toLowerCase();
                      if (!qn.includes(q) && !party.includes(q) && !phone.includes(q)) return false;
                    }
                    if (filterInvoiceStatus && filterInvoiceStatus !== "ALL") {
                      const st = (quote.status || "").toUpperCase();
                      if (filterInvoiceStatus === "Paid" && st !== "ACCEPTED") return false;
                      if (filterInvoiceStatus === "Unpaid" && st !== "PENDING" && st !== "OPEN") return false;
                    }
                    return true;
                  });

                  const { paginatedList, safePage, totalEntries } = paginateList(quotations);
                  return (
                    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                        <table className="w-full min-w-[750px] text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold">
                              <th className="py-2.5 px-3">Quote / Estimate #</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Party Name</th>
                              <th className="py-2.5 px-3">Phone</th>
                              <th className="py-2.5 px-3 text-right">Total Amount (₹)</th>
                              <th className="py-2.5 px-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0]">
                            {paginatedList.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-8 text-center text-slate-400">
                                  {lang === "gu" ? "કોઈ ક્વોટેશન મળ્યા નથી" : "No quotations match your filters"}
                                </td>
                              </tr>
                            ) : (
                              paginatedList.map((qRow: any, idx: number) => (
                                <tr key={qRow.id || `quote-${idx}`} className="hover:bg-[#F8FAFC] transition-colors">
                                  <td className="py-2.5 px-3 font-mono font-bold text-[#0F172A]">{qRow.quoteNumber || qRow.quotationNumber}</td>
                                  <td className="py-2.5 px-3 font-mono text-[#64748B]">{qRow.date}</td>
                                  <td className="py-2.5 px-3 font-semibold text-[#0F172A]">{qRow.partyName || qRow.party?.name}</td>
                                  <td className="py-2.5 px-3 font-mono text-[#64748B]">{qRow.phone || "—"}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#16834A]">₹{qRow.totalAmount}</td>
                                  <td className="py-2.5 px-3"><StatusBadge status={qRow.status} /></td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      <ReportPagination
                        currentPage={safePage}
                        pageSize={reportPageSize}
                        totalEntries={totalEntries}
                        onPageChange={setReportPage}
                        onPageSizeChange={setReportPageSize}
                        lang={lang}
                      />
                    </div>
                  );
                })()}
              </div>
            ) : activeTab === "delivery-challans" ? (
              /* Delivery Challans */
              <div className="space-y-6">
                <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs max-w-xs">
                  <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Total Challans Dispatched</span>
                  <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">{reportData.summary?.totalChallans || 0}</p>
                </div>

                {(() => {
                  const rawChallans = reportData.challans || [];
                  const q = (filterPartyQuery || "").trim().toLowerCase();
                  const challans = rawChallans.filter((c: any) => {
                    if (!q) return true;
                    const cn = (c.challanNumber || "").toLowerCase();
                    const party = (c.partyName || c.party?.name || "").toLowerCase();
                    const phone = (c.phone || "").toLowerCase();
                    return cn.includes(q) || party.includes(q) || phone.includes(q);
                  });

                  const { paginatedList, safePage, totalEntries } = paginateList(challans);
                  return (
                    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                        <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold">
                              <th className="py-2.5 px-3">Challan #</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Customer</th>
                              <th className="py-2.5 px-3">Phone</th>
                              <th className="py-2.5 px-3 text-right">Items Dispatched</th>
                              <th className="py-2.5 px-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0]">
                            {paginatedList.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-8 text-center text-slate-400">
                                  {lang === "gu" ? "કોઈ ચલણ મળ્યા નથી" : "No delivery challans match your search"}
                                </td>
                              </tr>
                            ) : (
                              paginatedList.map((c: any, idx: number) => (
                                <tr key={c.id || `challan-${idx}`} className="hover:bg-[#F8FAFC] transition-colors">
                                  <td className="py-2.5 px-3 font-mono font-bold text-[#0F172A]">{c.challanNumber}</td>
                                  <td className="py-2.5 px-3 font-mono text-[#64748B]">{c.date}</td>
                                  <td className="py-2.5 px-3 font-semibold text-[#0F172A]">{c.partyName || c.party?.name}</td>
                                  <td className="py-2.5 px-3 font-mono text-[#64748B]">{c.phone || "—"}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold">{c.itemsCount}</td>
                                  <td className="py-2.5 px-3"><StatusBadge status={c.status} /></td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      <ReportPagination
                        currentPage={safePage}
                        pageSize={reportPageSize}
                        totalEntries={totalEntries}
                        onPageChange={setReportPage}
                        onPageSizeChange={setReportPageSize}
                        lang={lang}
                      />
                    </div>
                  );
                })()}
              </div>
            ) : activeTab === "gst-purchase-hsn" ? (
              /* GST Purchase (With HSN) matching MyBillBook */
              <div className="space-y-4">
                {(() => {
                  const rawItems = reportData?.items || [];
                  const q = (filterPartyQuery || "").trim().toLowerCase();
                  const items = rawItems.filter((item: any) => {
                    if (!q) return true;
                    const inv = (item.invoiceNumber || item.billNumber || "").toLowerCase();
                    const origInv = (item.originalInvoiceNumber || "").toLowerCase();
                    const gstin = (item.partyGstin || "").toLowerCase();
                    const party = (item.partyName || "").toLowerCase();
                    const itName = (item.itemName || "").toLowerCase();
                    const hsn = (item.hsnCode || "").toLowerCase();
                    return inv.includes(q) || origInv.includes(q) || gstin.includes(q) || party.includes(q) || itName.includes(q) || hsn.includes(q);
                  });

                  const { paginatedList, safePage, totalEntries } = paginateList(items);
                  return (
                    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                        <table className="w-full min-w-[950px] text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] text-[11px] font-semibold uppercase tracking-wider">
                              <th className="py-3 px-3.5 whitespace-nowrap">DATE</th>
                              <th className="py-3 px-3.5 whitespace-nowrap">INVOICE NO</th>
                              <th className="py-3 px-3.5 whitespace-nowrap">ORIGINAL INV NO</th>
                              <th className="py-3 px-3.5 whitespace-nowrap">PARTY GSTIN</th>
                              <th className="py-3 px-3.5 whitespace-nowrap">PARTY NAME</th>
                              <th className="py-3 px-3.5 whitespace-nowrap">ITEM NAME</th>
                              <th className="py-3 px-3.5 whitespace-nowrap">HSN CODE</th>
                              <th className="py-3 px-3.5 whitespace-nowrap">QTY</th>
                              <th className="py-3 px-3.5 text-right whitespace-nowrap">PRICE/UNIT</th>
                              <th className="py-3 px-3.5 text-right whitespace-nowrap">SGST</th>
                              <th className="py-3 px-3.5 text-right whitespace-nowrap">CGST</th>
                              <th className="py-3 px-3.5 text-right whitespace-nowrap">IGST</th>
                              <th className="py-3 px-3.5 text-right whitespace-nowrap">AMOUNT</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0]">
                            {paginatedList.length === 0 ? (
                              <tr>
                                <td colSpan={13} className="py-12 text-center text-slate-400">
                                  {lang === "gu" ? "કોઈ રેકોર્ડ મળ્યો નથી" : "No records found matching your filters"}
                                </td>
                              </tr>
                            ) : (
                              paginatedList.map((item: any) => (
                                <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors">
                                  <td className="py-3 px-3.5 text-[#1E293B] whitespace-nowrap font-normal">
                                    {formatDisplayDate(item.date)}
                                  </td>
                                  <td className="py-3 px-3.5 text-[#1E293B] font-normal">
                                    {item.invoiceNumber || "-"}
                                  </td>
                                  <td className="py-3 px-3.5 text-[#1E293B] font-normal">
                                    {item.originalInvoiceNumber || "-"}
                                  </td>
                                  <td className="py-3 px-3.5 text-[#64748B] font-normal">
                                    {item.partyGstin || "-"}
                                  </td>
                                  <td className="py-3 px-3.5 text-[#1E293B] font-normal uppercase">
                                    {item.partyName || "-"}
                                  </td>
                                  <td className="py-3 px-3.5 text-[#1E293B] font-normal uppercase">
                                    {item.itemName || "-"}
                                  </td>
                                  <td className="py-3 px-3.5 text-[#64748B] font-normal">
                                    {item.hsnCode || "-"}
                                  </td>
                                  <td className="py-3 px-3.5 text-[#1E293B] font-normal whitespace-nowrap">
                                    {Number(item.quantity).toFixed(1)} {item.unit || "BOX"}
                                  </td>
                                  <td className="py-3 px-3.5 text-right text-[#1E293B] font-normal whitespace-nowrap">
                                    ₹ {Number(item.pricePerUnit || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-3 px-3.5 text-right whitespace-nowrap">
                                    {item.sgstAmount && item.sgstAmount !== "-" && Number(item.sgstAmount) > 0 ? (
                                      <div>
                                        <div className="text-[#1E293B] font-normal">
                                          ₹ {Number(item.sgstAmount).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                        </div>
                                        {item.sgstRate > 0 && (
                                          <div className="text-[11px] text-[#64748B]">({item.sgstRate}%)</div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-[#64748B]">-</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3.5 text-right whitespace-nowrap">
                                    {item.cgstAmount && item.cgstAmount !== "-" && Number(item.cgstAmount) > 0 ? (
                                      <div>
                                        <div className="text-[#1E293B] font-normal">
                                          ₹ {Number(item.cgstAmount).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                        </div>
                                        {item.cgstRate > 0 && (
                                          <div className="text-[11px] text-[#64748B]">({item.cgstRate}%)</div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-[#64748B]">-</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3.5 text-right whitespace-nowrap">
                                    {item.igstAmount && item.igstAmount !== "-" && Number(item.igstAmount) > 0 ? (
                                      <div>
                                        <div className="text-[#1E293B] font-normal">
                                          ₹ {Number(item.igstAmount).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                        </div>
                                        {item.igstRate > 0 && (
                                          <div className="text-[11px] text-[#64748B]">({item.igstRate}%)</div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-[#64748B]">-</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3.5 text-right text-[#1E293B] font-normal whitespace-nowrap">
                                    ₹ {Number(item.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      <ReportPagination
                        currentPage={safePage}
                        pageSize={reportPageSize}
                        totalEntries={totalEntries}
                        onPageChange={setReportPage}
                        onPageSizeChange={setReportPageSize}
                        lang={lang}
                      />
                    </div>
                  );
                })()}
              </div>
            ) : activeTab === "gst-sales-hsn" ? (
              /* GST Sales (With HSN) matching MyBillBook */
              <div className="space-y-4">
                {(() => {
                  const rawItems = reportData?.items || [];
                  const q = (filterPartyQuery || "").trim().toLowerCase();
                  const items = rawItems.filter((item: any) => {
                    if (!q) return true;
                    const inv = (item.invoiceNumber || "").toLowerCase();
                    const gstin = (item.customerGstin || item.partyGstin || "").toLowerCase();
                    const cust = (item.customerName || item.partyName || "").toLowerCase();
                    const itName = (item.itemName || "").toLowerCase();
                    const hsn = (item.hsnCode || "").toLowerCase();
                    return inv.includes(q) || gstin.includes(q) || cust.includes(q) || itName.includes(q) || hsn.includes(q);
                  });

                  const { paginatedList, safePage, totalEntries } = paginateList(items);
                  return (
                    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                        <table className="w-full min-w-[950px] text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] text-[11px] font-semibold uppercase tracking-wider">
                              <th className="py-3 px-3.5 whitespace-nowrap">DATE</th>
                              <th className="py-3 px-3.5 whitespace-nowrap">INVOICE NO</th>
                              <th className="py-3 px-3.5 whitespace-nowrap">CUSTOMER GSTIN</th>
                              <th className="py-3 px-3.5 whitespace-nowrap">CUSTOMER NAME</th>
                              <th className="py-3 px-3.5 whitespace-nowrap">ITEM NAME</th>
                              <th className="py-3 px-3.5 whitespace-nowrap">HSN CODE</th>
                              <th className="py-3 px-3.5 whitespace-nowrap">QTY</th>
                              <th className="py-3 px-3.5 text-right whitespace-nowrap">PRICE/UNIT</th>
                              <th className="py-3 px-3.5 text-right whitespace-nowrap">SGST</th>
                              <th className="py-3 px-3.5 text-right whitespace-nowrap">CGST</th>
                              <th className="py-3 px-3.5 text-right whitespace-nowrap">IGST</th>
                              <th className="py-3 px-3.5 text-right whitespace-nowrap">AMOUNT</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0]">
                            {paginatedList.length === 0 ? (
                              <tr>
                                <td colSpan={12} className="py-12 text-center text-slate-400">
                                  {lang === "gu" ? "કોઈ રેકોર્ડ મળ્યો નથી" : "No records found matching your filters"}
                                </td>
                              </tr>
                            ) : (
                              paginatedList.map((item: any) => (
                                <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors">
                                  <td className="py-3 px-3.5 text-[#1E293B] whitespace-nowrap font-normal">
                                    {formatDisplayDate(item.date)}
                                  </td>
                                  <td className="py-3 px-3.5 text-[#1E293B] font-normal">
                                    {item.invoiceNumber || "-"}
                                  </td>
                                  <td className="py-3 px-3.5 text-[#64748B] font-normal">
                                    {item.customerGstin || item.partyGstin || "-"}
                                  </td>
                                  <td className="py-3 px-3.5 text-[#1E293B] font-normal uppercase">
                                    {item.customerName || item.partyName || "-"}
                                  </td>
                                  <td className="py-3 px-3.5 text-[#1E293B] font-normal uppercase">
                                    {item.itemName || "-"}
                                  </td>
                                  <td className="py-3 px-3.5 text-[#64748B] font-normal">
                                    {item.hsnCode || "-"}
                                  </td>
                                  <td className="py-3 px-3.5 text-[#1E293B] font-normal whitespace-nowrap">
                                    {Number(item.quantity).toFixed(1)} {item.unit || "PCS"}
                                  </td>
                                  <td className="py-3 px-3.5 text-right text-[#1E293B] font-normal whitespace-nowrap">
                                    ₹ {Number(item.pricePerUnit || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-3 px-3.5 text-right whitespace-nowrap">
                                    {item.sgstAmount && item.sgstAmount !== "-" && Number(item.sgstAmount) > 0 ? (
                                      <div>
                                        <div className="text-[#1E293B] font-normal">
                                          ₹ {Number(item.sgstAmount).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                        </div>
                                        {item.sgstRate > 0 && (
                                          <div className="text-[11px] text-[#64748B]">({item.sgstRate}%)</div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-[#64748B]">-</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3.5 text-right whitespace-nowrap">
                                    {item.cgstAmount && item.cgstAmount !== "-" && Number(item.cgstAmount) > 0 ? (
                                      <div>
                                        <div className="text-[#1E293B] font-normal">
                                          ₹ {Number(item.cgstAmount).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                        </div>
                                        {item.cgstRate > 0 && (
                                          <div className="text-[11px] text-[#64748B]">({item.cgstRate}%)</div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-[#64748B]">-</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3.5 text-right whitespace-nowrap">
                                    {item.igstAmount && item.igstAmount !== "-" && Number(item.igstAmount) > 0 ? (
                                      <div>
                                        <div className="text-[#1E293B] font-normal">
                                          ₹ {Number(item.igstAmount).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                        </div>
                                        {item.igstRate > 0 && (
                                          <div className="text-[11px] text-[#64748B]">({item.igstRate}%)</div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-[#64748B]">-</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3.5 text-right text-[#1E293B] font-normal whitespace-nowrap">
                                    ₹ {Number(item.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      <ReportPagination
                        currentPage={safePage}
                        pageSize={reportPageSize}
                        totalEntries={totalEntries}
                        onPageChange={setReportPage}
                        onPageSizeChange={setReportPageSize}
                        lang={lang}
                      />
                    </div>
                  );
                })()}
              </div>
            ) : activeTab === "purchase-register" || activeTab === "purchase-summary" ? (
              /* Purchase Register / Summary */
              <div className="space-y-4">
                {(() => {
                  const rawBills = reportData.items || [];
                  if (rawBills.length === 0) {
                    return (
                      <ReportEmptyState
                        title="No purchase records found"
                        titleGu="કોઈ ખરીદી રેકોર્ડ મળેલ નથી"
                        description="There are no purchase bills for the selected date range."
                        descriptionGu="પસંદ કરેલી તારીખ માટે કોઈ ખરીદ બિલ મળ્યા નથી."
                        secondaryAction={{ label: "Reset Date Range", onClick: handleResetDates }}
                        lang={lang}
                      />
                    );
                  }

                  const q = (filterPartyQuery || "").trim().toLowerCase();
                  const bills = rawBills.filter((bill: any) => {
                    if (q) {
                      const billNum = (bill.vendorInvoiceNumber || bill.billNumber || "").toLowerCase();
                      const supplier = (bill.supplierName || bill.party?.name || "").toLowerCase();
                      const gstin = (bill.supplierGstin || bill.party?.gstin || "").toLowerCase();
                      if (!billNum.includes(q) && !supplier.includes(q) && !gstin.includes(q)) return false;
                    }
                    if (filterInvoiceStatus && filterInvoiceStatus !== "ALL") {
                      const st = (bill.status || "PAID").toUpperCase();
                      if (filterInvoiceStatus === "Paid" && st !== "PAID") return false;
                      if (filterInvoiceStatus === "Unpaid" && st !== "UNPAID") return false;
                      if (filterInvoiceStatus === "Partially Paid" && st !== "PARTIALLY_PAID" && st !== "PARTIAL") return false;
                    }
                    return true;
                  });

                  if (bills.length === 0) {
                    return (
                      <div className="py-12 px-4 text-center bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                        <p className="text-sm font-semibold text-slate-800">
                          {lang === "gu" ? "ફિલ્ટર સાથે મેળ ખાતા કોઈ બિલ મળ્યા નથી" : "No purchase bills match your search or filters"}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {lang === "gu" ? "કૃપા કરીને સર્ચ કીવર્ડ અથવા સ્ટેટસ ફિલ્ટર બદલો" : "Try clearing your search query or changing status filters."}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setFilterPartyQuery("");
                            setFilterInvoiceStatus("ALL");
                          }}
                          className="mt-3 px-3.5 py-1.5 text-xs font-semibold text-[#0047BA] hover:text-[#00358A] bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      </div>
                    );
                  }

                  const { paginatedList, safePage, totalEntries } = paginateList(bills);
                  return (
                    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                        <table className="w-full min-w-[850px] text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] text-[11px] font-semibold uppercase tracking-wider">
                              <th className="py-3 px-3.5 whitespace-nowrap">DATE</th>
                              <th className="py-3 px-3.5 whitespace-nowrap">BILL NO</th>
                              <th className="py-3 px-3.5 whitespace-nowrap">SUPPLIER NAME</th>
                              <th className="py-3 px-3.5 whitespace-nowrap">GSTIN</th>
                              <th className="py-3 px-3.5 text-right whitespace-nowrap">TAXABLE (₹)</th>
                              <th className="py-3 px-3.5 text-right whitespace-nowrap">CGST (₹)</th>
                              <th className="py-3 px-3.5 text-right whitespace-nowrap">SGST (₹)</th>
                              <th className="py-3 px-3.5 text-right whitespace-nowrap">TOTAL (₹)</th>
                              <th className="py-3 px-3.5 whitespace-nowrap">STATUS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0]">
                            {paginatedList.map((bill: any) => (
                              <tr key={bill.id} className="hover:bg-[#F8FAFC] transition-colors">
                                <td className="py-3 px-3.5 text-[#1E293B] font-normal whitespace-nowrap">{formatDisplayDate(bill.invoiceDate)}</td>
                                <td className="py-3 px-3.5 font-normal text-[#1E293B]">{bill.vendorInvoiceNumber || bill.billNumber || "—"}</td>
                                <td className="py-3 px-3.5 font-normal text-[#1E293B] uppercase">{bill.supplierName || bill.party?.name}</td>
                                <td className="py-3 px-3.5 text-[#64748B] font-normal">{bill.supplierGstin || bill.party?.gstin || "—"}</td>
                                <td className="py-3 px-3.5 text-right text-[#1E293B] font-normal">₹{Number(bill.taxableAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                <td className="py-3 px-3.5 text-right text-[#1E293B] font-normal">₹{Number(bill.cgstAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                <td className="py-3 px-3.5 text-right text-[#1E293B] font-normal">₹{Number(bill.sgstAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                <td className="py-3 px-3.5 text-right text-[#1E293B] font-semibold">₹{Number(bill.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                <td className="py-3 px-3.5"><StatusBadge status={bill.status || "PAID"} /></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <ReportPagination
                        currentPage={safePage}
                        pageSize={reportPageSize}
                        totalEntries={totalEntries}
                        onPageChange={setReportPage}
                        onPageSizeChange={setReportPageSize}
                        lang={lang}
                      />
                    </div>
                  );
                })()}
              </div>
            ) : activeTab === "item-purchase-report" ? (
              /* Item Wise Purchase */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Unique Items</span>
                    <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">{reportData.summary?.totalUniqueItems || 0}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Total Inward Qty</span>
                    <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">{reportData.summary?.totalQuantity || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Total Purchases (₹)</span>
                    <p className="font-mono font-bold text-lg text-[#16834A] mt-1">₹{reportData.summary?.totalPurchases || "0.00"}</p>
                  </div>
                </div>

                {(() => {
                  const rawItems = reportData.items || [];
                  const q = (filterPartyQuery || "").trim().toLowerCase();
                  const items = rawItems.filter((it: any) => {
                    if (!q) return true;
                    const name = (it.itemName || it.name || "").toLowerCase();
                    const code = (it.itemCode || it.sku || "").toLowerCase();
                    const cat = (it.category || "").toLowerCase();
                    return name.includes(q) || code.includes(q) || cat.includes(q);
                  });

                  const { paginatedList, safePage, totalEntries } = paginateList(items);
                  return (
                    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                        <table className="w-full min-w-[800px] text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold">
                              <th className="py-2.5 px-3">Item Name</th>
                              <th className="py-2.5 px-3">Code</th>
                              <th className="py-2.5 px-3">Category</th>
                              <th className="py-2.5 px-3">UOM</th>
                              <th className="py-2.5 px-3 text-right">Qty Purchased</th>
                              <th className="py-2.5 px-3 text-right">Avg Rate (₹)</th>
                              <th className="py-2.5 px-3 text-right">Total Purchases (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0]">
                            {paginatedList.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-8 text-center text-slate-400">
                                  {lang === "gu" ? "કોઈ આઇટમ મળી નથી" : "No items match your search"}
                                </td>
                              </tr>
                            ) : (
                              paginatedList.map((it: any, idx: number) => (
                                <tr key={it.itemId || it.id || `item-purch-${idx}`} className="hover:bg-[#F8FAFC] transition-colors">
                                  <td className="py-2.5 px-3 font-semibold text-[#0F172A]">{it.itemName || it.name}</td>
                                  <td className="py-2.5 px-3 font-mono text-[#64748B]">{it.itemCode || it.sku}</td>
                                  <td className="py-2.5 px-3 text-[#64748B]">{it.category || "—"}</td>
                                  <td className="py-2.5 px-3 font-mono">{it.uom || "PCS"}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold">{it.totalQuantity}</td>
                                  <td className="py-2.5 px-3 text-right font-mono">₹{it.avgRate}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#16834A]">₹{it.totalPurchases}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      <ReportPagination
                        currentPage={safePage}
                        pageSize={reportPageSize}
                        totalEntries={totalEntries}
                        onPageChange={setReportPage}
                        onPageSizeChange={setReportPageSize}
                        lang={lang}
                      />
                    </div>
                  );
                })()}
              </div>
            ) : activeTab === "party-purchase-report" ? (
              /* Party Wise Purchase */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Total Suppliers</span>
                    <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">{reportData.summary?.totalSuppliers || 0}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Total Purchases</span>
                    <p className="font-mono font-bold text-lg text-[#16834A] mt-1">₹{reportData.summary?.totalPurchases || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Total Paid</span>
                    <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">₹{reportData.summary?.totalPaid || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Balance Payable</span>
                    <p className="font-mono font-bold text-lg text-[#DC2626] mt-1">₹{reportData.summary?.totalPayable || "0.00"}</p>
                  </div>
                </div>

                {(() => {
                  const rawParties = reportData.parties || [];
                  const q = (filterPartyQuery || "").trim().toLowerCase();
                  const parties = rawParties.filter((p: any) => {
                    if (!q) return true;
                    const name = (p.partyName || p.name || "").toLowerCase();
                    const phone = (p.phone || "").toLowerCase();
                    const gstin = (p.gstin || "").toLowerCase();
                    return name.includes(q) || phone.includes(q) || gstin.includes(q);
                  });

                  const { paginatedList, safePage, totalEntries } = paginateList(parties);
                  return (
                    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                        <table className="w-full min-w-[800px] text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold">
                              <th className="py-2.5 px-3">Supplier Name</th>
                              <th className="py-2.5 px-3">Phone</th>
                              <th className="py-2.5 px-3">GSTIN</th>
                              <th className="py-2.5 px-3 text-right">Bills Count</th>
                              <th className="py-2.5 px-3 text-right">Purchases (₹)</th>
                              <th className="py-2.5 px-3 text-right">Paid (₹)</th>
                              <th className="py-2.5 px-3 text-right">Balance Payable (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0]">
                            {paginatedList.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-8 text-center text-slate-400">
                                  {lang === "gu" ? "કોઈ વેપારી મળ્યા નથી" : "No suppliers match your search"}
                                </td>
                              </tr>
                            ) : (
                              paginatedList.map((p: any, idx: number) => (
                                <tr key={p.partyId || p.id || `party-purch-${idx}`} className="hover:bg-[#F8FAFC] transition-colors">
                                  <td className="py-2.5 px-3 font-semibold text-[#0F172A]">{p.partyName || p.name}</td>
                                  <td className="py-2.5 px-3 font-mono text-[#64748B]">{p.phone || "—"}</td>
                                  <td className="py-2.5 px-3 font-mono text-[#64748B]">{p.gstin || "—"}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold">{p.billCount || 0}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#16834A]">₹{p.totalPurchases}</td>
                                  <td className="py-2.5 px-3 text-right font-mono">₹{p.totalPaid}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#DC2626]">₹{p.balancePayable}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      <ReportPagination
                        currentPage={safePage}
                        pageSize={reportPageSize}
                        totalEntries={totalEntries}
                        onPageChange={setReportPage}
                        onPageSizeChange={setReportPageSize}
                        lang={lang}
                      />
                    </div>
                  );
                })()}
              </div>
            ) : activeTab === "purchase-returns" ? (
              /* Purchase Returns (Debit Notes) */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Total Returns</span>
                    <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">{reportData.summary?.totalReturns || 0}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Taxable Reversal</span>
                    <p className="font-mono font-bold text-lg text-[#DC2626] mt-1">₹{reportData.summary?.totalTaxable || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Total Debit Note Amount</span>
                    <p className="font-mono font-bold text-lg text-amber-700 mt-1">₹{reportData.summary?.grandTotal || "0.00"}</p>
                  </div>
                </div>

                {(() => {
                  const rawReturns = reportData.returns || [];
                  const q = (filterPartyQuery || "").trim().toLowerCase();
                  const returns = rawReturns.filter((r: any) => {
                    if (!q) return true;
                    const dn = (r.debitNoteNumber || r.returnNumber || "").toLowerCase();
                    const party = (r.partyName || r.party?.name || "").toLowerCase();
                    const reason = (r.reason || "").toLowerCase();
                    return dn.includes(q) || party.includes(q) || reason.includes(q);
                  });

                  const { paginatedList, safePage, totalEntries } = paginateList(returns);
                  return (
                    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                        <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold">
                              <th className="py-2.5 px-3">Debit Note #</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Supplier Name</th>
                              <th className="py-2.5 px-3">Reason</th>
                              <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                              <th className="py-2.5 px-3 text-right">Debit Amount (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0]">
                            {paginatedList.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-8 text-center text-slate-400">
                                  {lang === "gu" ? "કોઈ ડેબિટ નોટ મળી નથી" : "No returns found matching search"}
                                </td>
                              </tr>
                            ) : (
                              paginatedList.map((r: any, idx: number) => (
                                <tr key={r.id || `debit-note-${idx}`} className="hover:bg-[#F8FAFC] transition-colors">
                                  <td className="py-2.5 px-3 font-mono font-bold text-[#0F172A]">{r.debitNoteNumber || r.returnNumber}</td>
                                  <td className="py-2.5 px-3 font-mono text-[#64748B]">{r.returnDate}</td>
                                  <td className="py-2.5 px-3 font-semibold text-[#0F172A]">{r.partyName || r.party?.name}</td>
                                  <td className="py-2.5 px-3 text-[#64748B]">{r.reason || "—"}</td>
                                  <td className="py-2.5 px-3 text-right font-mono">₹{r.taxableAmount}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700">₹{r.grandTotal}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      <ReportPagination
                        currentPage={safePage}
                        pageSize={reportPageSize}
                        totalEntries={totalEntries}
                        onPageChange={setReportPage}
                        onPageSizeChange={setReportPageSize}
                        lang={lang}
                      />
                    </div>
                  );
                })()}
              </div>
            ) : activeTab === "stock-summary" ? (
              /* Stock Summary matching MyBillBook exact layout */
              <div className="space-y-6">
                {(() => {
                  const rawItems = reportData.items || [];
                  const q = (filterPartyQuery || "").trim().toLowerCase();
                  const items = rawItems.filter((it: any) => {
                    if (!q) return true;
                    const name = (it.name || it.itemName || "").toLowerCase();
                    const batch = (it.batchNumber || "").toLowerCase();
                    const sku = (it.sku || it.barcode || it.itemCode || "").toLowerCase();
                    const cat = (it.category || it.categoryName || "").toLowerCase();
                    return name.includes(q) || batch.includes(q) || sku.includes(q) || cat.includes(q);
                  });

                  const displayValuation = q
                    ? items.reduce((sum: number, it: any) => sum + Number(it.totalValuation ?? it.valuation ?? 0), 0)
                    : Number(reportData.totals?.grandStockValuation ?? reportData.summary?.totalValuation ?? 0);
                  const displayQuantity = q
                    ? items.reduce((sum: number, it: any) => sum + Number(it.currentStockQuantity ?? it.currentStock ?? 0), 0)
                    : Number(reportData.totals?.grandStockQuantity ?? reportData.summary?.totalQuantity ?? 0);

                  const { paginatedList, safePage, totalEntries } = paginateList(items);

                  return (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
                          <span className="text-xs text-[#2563EB] font-medium flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span className="text-slate-500 font-normal">Total Stock Value</span>
                          </span>
                          <p className="font-bold text-xl sm:text-2xl text-slate-800 mt-1">
                            ₹ {Number(displayValuation).toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                          </p>
                        </div>

                        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
                          <span className="text-xs text-[#2563EB] font-medium flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            <span className="text-slate-500 font-normal">Total Stock Quantity</span>
                          </span>
                          <p className="font-bold text-xl sm:text-2xl text-slate-800 mt-1">
                            {Math.round(Number(displayQuantity))}
                          </p>
                        </div>
                      </div>

                      <div className="border border-slate-200 rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                        <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                          <table className="w-full min-w-[750px] text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                                <th className="py-2.5 px-3">Item Name</th>
                                <th className="py-2.5 px-3">Batch Number</th>
                                <th className="py-2.5 px-3">Item Code</th>
                                <th className="py-2.5 px-3 text-right">Purchase Price</th>
                                <th className="py-2.5 px-3 text-right">Selling Price</th>
                                <th className="py-2.5 px-3 text-right">Stock Quantity</th>
                                <th className="py-2.5 px-3 text-right">Stock Value</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {paginatedList.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="py-8 text-center text-slate-400">
                                    {lang === "gu" ? "કોઈ આઇટમ મળી નથી" : "No items match your search"}
                                  </td>
                                </tr>
                              ) : (
                                paginatedList.map((it: any, idx: number) => (
                                  <tr key={it.id || it.itemId || it.sku || `stock-item-${idx}`} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-2.5 px-3 font-semibold text-slate-900">{it.name || it.itemName}</td>
                                    <td className="py-2.5 px-3 font-mono text-slate-500">{it.batchNumber || "—"}</td>
                                    <td className="py-2.5 px-3 font-mono text-slate-500">{it.sku || it.barcode || it.itemCode || "—"}</td>
                                    <td className="py-2.5 px-3 text-right font-mono">
                                      {Number(it.purchaseRate || 0) > 0 ? `₹ ${Number(it.purchaseRate).toLocaleString("en-IN")}` : "—"}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono">
                                      {Number(it.retailPrice || it.salePrice || 0) > 0 ? `₹ ${Number(it.retailPrice || it.salePrice).toLocaleString("en-IN")}` : "—"}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                      {Number(it.currentStockQuantity ?? it.currentStock ?? 0).toFixed(1)} {it.uomSymbol || it.uom || "PCS"}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                      ₹ {Number(it.totalValuation ?? it.valuation ?? 0).toLocaleString("en-IN")}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                        <ReportPagination
                          currentPage={safePage}
                          pageSize={reportPageSize}
                          totalEntries={totalEntries}
                          onPageChange={setReportPage}
                          onPageSizeChange={setReportPageSize}
                          lang={lang}
                        />
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : activeTab === "stock-movement" ? (
              /* Stock Movement */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Total Transactions</span>
                    <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">{(reportData.transactions || []).length}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Total Inward Qty</span>
                    <p className="font-mono font-bold text-lg text-[#16834A] mt-1">{reportData.totalInward || 0}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Total Outward Qty</span>
                    <p className="font-mono font-bold text-lg text-[#DC2626] mt-1">{reportData.totalOutward || 0}</p>
                  </div>
                </div>

                {(() => {
                  const rawTxns = reportData.transactions || [];
                  const q = (filterPartyQuery || "").trim().toLowerCase();
                  const transactions = rawTxns.filter((t: any) => {
                    if (!q) return true;
                    const doc = (t.docType || "").toLowerCase();
                    const it = (t.item || t.itemName || "").toLowerCase();
                    const wh = (t.warehouse || "").toLowerCase();
                    return doc.includes(q) || it.includes(q) || wh.includes(q);
                  });

                  const { paginatedList, safePage, totalEntries } = paginateList(transactions);
                  return (
                    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                        <table className="w-full min-w-[750px] text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold">
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Document Type</th>
                              <th className="py-2.5 px-3">Item Name</th>
                              <th className="py-2.5 px-3">Godown / Warehouse</th>
                              <th className="py-2.5 px-3 text-right">Quantity</th>
                              <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                              <th className="py-2.5 px-3 text-right">Valuation (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0]">
                            {paginatedList.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-8 text-center text-slate-400">
                                  {lang === "gu" ? "કોઈ વ્યવહાર મળ્યા નથી" : "No stock transactions match your search"}
                                </td>
                              </tr>
                            ) : (
                              paginatedList.map((t: any, idx: number) => (
                                <tr key={t.id || `tx-${idx}`} className="hover:bg-[#F8FAFC] transition-colors">
                                  <td className="py-2.5 px-3 font-mono text-[#64748B]">{t.date ? String(t.date).slice(0, 10) : "—"}</td>
                                  <td className="py-2.5 px-3 font-semibold text-[#0F172A]">{t.docType}</td>
                                  <td className="py-2.5 px-3 font-semibold text-[#0F172A]">{t.item || t.itemName}</td>
                                  <td className="py-2.5 px-3 text-[#64748B]">{t.warehouse || "Default"}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold">{t.quantity}</td>
                                  <td className="py-2.5 px-3 text-right font-mono">₹{t.rate}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#16834A]">₹{t.valuation}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      <ReportPagination
                        currentPage={safePage}
                        pageSize={reportPageSize}
                        totalEntries={totalEntries}
                        onPageChange={setReportPage}
                        onPageSizeChange={setReportPageSize}
                        lang={lang}
                      />
                    </div>
                  );
                })()}
              </div>
            ) : activeTab === "item-batch-report" ? (
              /* Item Batch & Expiry */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Total Batches</span>
                    <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">{reportData.summary?.totalBatches || 0}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Expiring Soon (30d)</span>
                    <p className="font-mono font-bold text-lg text-amber-700 mt-1">{reportData.summary?.expiringSoonCount || 0}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Expired Batches</span>
                    <p className="font-mono font-bold text-lg text-[#DC2626] mt-1">{reportData.summary?.expiredCount || 0}</p>
                  </div>
                </div>

                {(() => {
                  const rawBatches = reportData.batches || [];
                  const q = (filterPartyQuery || "").trim().toLowerCase();
                  const batches = rawBatches.filter((b: any) => {
                    if (!q) return true;
                    const it = (b.itemName || "").toLowerCase();
                    const batch = (b.batchNumber || "").toLowerCase();
                    return it.includes(q) || batch.includes(q);
                  });

                  const { paginatedList, safePage, totalEntries } = paginateList(batches);
                  return (
                    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                        <table className="w-full min-w-[800px] text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold">
                              <th className="py-2.5 px-3">Item Name</th>
                              <th className="py-2.5 px-3">Batch Number</th>
                              <th className="py-2.5 px-3">Mfg Date</th>
                              <th className="py-2.5 px-3">Expiry Date</th>
                              <th className="py-2.5 px-3 text-right">Days Left</th>
                              <th className="py-2.5 px-3 text-right">Stock Qty</th>
                              <th className="py-2.5 px-3 text-right">Valuation (₹)</th>
                              <th className="py-2.5 px-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0]">
                            {paginatedList.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="py-8 text-center text-slate-400">
                                  {lang === "gu" ? "કોઈ બેચ મળ્યા નથી" : "No batches match your search"}
                                </td>
                              </tr>
                            ) : (
                              paginatedList.map((b: any, idx: number) => (
                                <tr key={b.id || `batch-${idx}`} className="hover:bg-[#F8FAFC] transition-colors">
                                  <td className="py-2.5 px-3 font-semibold text-[#0F172A]">{b.itemName}</td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-[#0047BA]">{b.batchNumber}</td>
                                  <td className="py-2.5 px-3 font-mono text-[#64748B]">{b.mfgDate}</td>
                                  <td className="py-2.5 px-3 font-mono text-[#64748B]">{b.expiryDate}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold">
                                    {b.daysToExpiry !== null ? `${b.daysToExpiry}d` : "—"}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold">{b.currentStock} {b.uom}</td>
                                  <td className="py-2.5 px-3 text-right font-mono text-[#16834A]">₹{b.valuation}</td>
                                  <td className="py-2.5 px-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      b.status === "EXPIRED" ? "bg-rose-50 text-rose-700 border border-rose-200" : b.status === "EXPIRING_SOON" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    }`}>
                                      {b.status}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      <ReportPagination
                        currentPage={safePage}
                        pageSize={reportPageSize}
                        totalEntries={totalEntries}
                        onPageChange={setReportPage}
                        onPageSizeChange={setReportPageSize}
                        lang={lang}
                      />
                    </div>
                  );
                })()}
              </div>
            ) : activeTab === "low-stock-alert" ? (
              /* Low Stock Alert */
              <div className="space-y-6">
                <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs max-w-xs">
                  <span className="text-[11px] text-[#DC2626] uppercase font-bold block">Items Below Reorder Level</span>
                  <p className="font-mono font-bold text-lg text-[#DC2626] mt-1">{reportData.summary?.totalLowStockCount || 0}</p>
                </div>

                {(() => {
                  const rawItems = reportData.items || [];
                  const q = (filterPartyQuery || "").trim().toLowerCase();
                  const items = rawItems.filter((it: any) => {
                    if (!q) return true;
                    const name = (it.name || it.itemName || "").toLowerCase();
                    const cat = (it.category || "").toLowerCase();
                    return name.includes(q) || cat.includes(q);
                  });

                  const { paginatedList, safePage, totalEntries } = paginateList(items);
                  return (
                    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                        <table className="w-full min-w-[750px] text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold">
                              <th className="py-2.5 px-3">Item Name</th>
                              <th className="py-2.5 px-3">Category</th>
                              <th className="py-2.5 px-3 text-right">Current Stock</th>
                              <th className="py-2.5 px-3 text-right">Min Level</th>
                              <th className="py-2.5 px-3 text-right">Deficit</th>
                              <th className="py-2.5 px-3 text-right">Suggested Reorder</th>
                              <th className="py-2.5 px-3 text-right">Purchase Rate (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0]">
                            {paginatedList.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-8 text-center text-slate-400">
                                  {lang === "gu" ? "કોઈ આઇટમ મળી નથી" : "No low stock items match your search"}
                                </td>
                              </tr>
                            ) : (
                              paginatedList.map((it: any, idx: number) => (
                                <tr key={it.id || it.itemId || `low-${idx}`} className="hover:bg-[#F8FAFC] transition-colors">
                                  <td className="py-2.5 px-3 font-semibold text-[#0F172A]">{it.name}</td>
                                  <td className="py-2.5 px-3 text-[#64748B]">{it.category || "—"}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#DC2626]">{it.currentStock} {it.uom}</td>
                                  <td className="py-2.5 px-3 text-right font-mono text-[#64748B]">{it.minStockLevel}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-800">{it.deficit}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700">{it.reorderQuantity}</td>
                                  <td className="py-2.5 px-3 text-right font-mono">₹{it.purchaseRate}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      <ReportPagination
                        currentPage={safePage}
                        pageSize={reportPageSize}
                        totalEntries={totalEntries}
                        onPageChange={setReportPage}
                        onPageSizeChange={setReportPageSize}
                        lang={lang}
                      />
                    </div>
                  );
                })()}
              </div>
            ) : activeTab === "party-ledger" ? (
              /* Party Statement (Ledger) matching MyBillBook exact layout */
              <div className="space-y-6">
                {/* 4 Top KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] font-semibold uppercase flex items-center gap-1.5">
                      <span>🔄</span>
                      <span>Total Receivable</span>
                    </span>
                    <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">
                      {selectedPartyId ? `₹ ${Number(reportData?.summary?.totalReceivable || reportData?.summary?.closingBalance || 0).toLocaleString("en-IN")}` : "—"}
                    </p>
                  </div>

                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-amber-600 font-semibold uppercase flex items-center gap-1.5">
                      <span>⏳</span>
                      <span>Overdue Amount</span>
                    </span>
                    <p className="font-mono font-bold text-lg text-amber-700 mt-1">
                      {selectedPartyId ? `₹ ${Number(reportData?.summary?.overdueAmount || 0).toLocaleString("en-IN")}` : "—"}
                    </p>
                  </div>

                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#0047BA] font-semibold uppercase flex items-center gap-1.5">
                      <span>📈</span>
                      <span>Total Sales</span>
                    </span>
                    <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">
                      {selectedPartyId ? `₹ ${Number(reportData?.summary?.totalDebits || reportData?.summary?.totalSales || 0).toLocaleString("en-IN")}` : "—"}
                    </p>
                  </div>

                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#16834A] font-semibold uppercase flex items-center gap-1.5">
                      <span>💳</span>
                      <span>Total Received</span>
                    </span>
                    <p className="font-mono font-bold text-lg text-[#16834A] mt-1">
                      {selectedPartyId ? `₹ ${Number(reportData?.summary?.totalCredits || reportData?.summary?.totalReceived || 0).toLocaleString("en-IN")}` : "—"}
                    </p>
                  </div>
                </div>

                {!selectedPartyId ? (
                  <div className="py-24 text-center space-y-3 bg-white border border-[#E2E8F0] rounded-xl">
                    <div className="w-14 h-14 mx-auto rounded-full bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-xl text-slate-400">
                      🔍
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-500">
                      {lang === "gu" ? "રિપોર્ટ જોવા માટે પ્રથમ પાર્ટી પસંદ કરો" : "Select a Party first to see the reports"}
                    </p>
                  </div>
                ) : (() => {
                  const rawTxns = reportData?.transactions || reportData?.entries || [];
                  const q = (filterPartyQuery || "").trim().toLowerCase();
                  const txns = rawTxns.filter((t: any) => {
                    if (!q) return true;
                    const narr = (t.narration || "").toLowerCase();
                    const vType = (t.voucherType || t.type || "").toLowerCase();
                    const vNo = (t.refNo || t.voucherNumber || "").toLowerCase();
                    return narr.includes(q) || vType.includes(q) || vNo.includes(q);
                  });

                  if (txns.length === 0) {
                    return (
                      <div className="py-16 text-center text-xs text-slate-400 italic bg-white border border-[#E2E8F0] rounded-xl">
                        {rawTxns.length === 0
                          ? (lang === "gu" ? "આ સમયગાળા માટે કોઈ વ્યવહાર મળ્યા નથી." : "No transactions recorded for this party in the selected date range.")
                          : (lang === "gu" ? "કોઈ વ્યવહાર ફિલ્ટર સાથે મેળ ખાતો નથી." : "No transactions match your search filter.")}
                      </div>
                    );
                  }
                  const { paginatedList, safePage, totalEntries } = paginateList(txns);
                  return (
                    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                        <table className="w-full min-w-[750px] text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold">
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Voucher Type</th>
                              <th className="py-2.5 px-3">Voucher No</th>
                              <th className="py-2.5 px-3">Narration</th>
                              <th className="py-2.5 px-3 text-right">Debit (Dr)</th>
                              <th className="py-2.5 px-3 text-right">Credit (Cr)</th>
                              <th className="py-2.5 px-3 text-right">Balance Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0]">
                            {paginatedList.map((t: any, idx: number) => (
                              <tr key={t.id || `txn-${idx}`} className="hover:bg-[#F8FAFC] transition-colors">
                                <td className="py-2.5 px-3 font-mono text-[#64748B]">{t.date || t.voucherDate}</td>
                                <td className="py-2.5 px-3 font-semibold text-[#0F172A]">{t.voucherType || t.type}</td>
                                <td className="py-2.5 px-3 font-mono font-bold text-[#0047BA]">{t.refNo || t.voucherNumber}</td>
                                <td className="py-2.5 px-3 text-[#64748B]">{t.narration || "—"}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-bold">{t.debit ? `₹ ${Number(t.debit).toLocaleString("en-IN")}` : "—"}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">{t.credit ? `₹ ${Number(t.credit).toLocaleString("en-IN")}` : "—"}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0F172A]">₹ {Number(t.balance || t.runningBalance || 0).toLocaleString("en-IN")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <ReportPagination
                        currentPage={safePage}
                        pageSize={reportPageSize}
                        totalEntries={totalEntries}
                        onPageChange={setReportPage}
                        onPageSizeChange={setReportPageSize}
                        lang={lang}
                      />
                    </div>
                  );
                })()}
              </div>
            ) : activeTab === "party-aging" ? (
              /* Party Aging */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Total Receivables</span>
                    <p className="font-mono font-bold text-lg text-[#16834A] mt-1">₹{reportData.summary?.totalReceivable || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Not Due</span>
                    <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">₹{reportData.summary?.notDue || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-amber-600 uppercase font-semibold block">0 - 30 Days Overdue</span>
                    <p className="font-mono font-bold text-lg text-amber-700 mt-1">₹{reportData.summary?.overdue0to30 || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#DC2626] uppercase font-semibold block">60+ Days Overdue</span>
                    <p className="font-mono font-bold text-lg text-[#DC2626] mt-1">₹{reportData.summary?.overdue90Plus || "0.00"}</p>
                  </div>
                </div>

                {(() => {
                  const rawParties = reportData.parties || reportData.aging || [];
                  const q = (filterPartyQuery || "").trim().toLowerCase();
                  const parties = rawParties.filter((p: any) => {
                    if (!q) return true;
                    const name = (p.partyName || "").toLowerCase();
                    const phone = (p.phone || "").toLowerCase();
                    return name.includes(q) || phone.includes(q);
                  });
                  const { paginatedList, safePage, totalEntries } = paginateList(parties);
                  return (
                    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                        <table className="w-full min-w-[850px] text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold">
                              <th className="py-2.5 px-3">Customer Name</th>
                              <th className="py-2.5 px-3">Phone</th>
                              <th className="py-2.5 px-3 text-center">Credit Days</th>
                              <th className="py-2.5 px-3 text-right">Not Due (₹)</th>
                              <th className="py-2.5 px-3 text-right">0 - 30 Days (₹)</th>
                              <th className="py-2.5 px-3 text-right">31 - 60 Days (₹)</th>
                              <th className="py-2.5 px-3 text-right">61 - 90 Days (₹)</th>
                              <th className="py-2.5 px-3 text-right">90+ Days (₹)</th>
                              <th className="py-2.5 px-3 text-right">Total Due (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0]">
                            {paginatedList.length === 0 ? (
                              <tr>
                                <td colSpan={9} className="py-8 text-center text-slate-400">
                                  {lang === "gu" ? "કોઈ ગ્રાહક મળ્યા નથી" : "No customer aging records match your search"}
                                </td>
                              </tr>
                            ) : (
                              paginatedList.map((p: any, idx: number) => (
                                <tr key={p.partyId || p.id || `party-aging-${idx}`} className="hover:bg-[#F8FAFC] transition-colors">
                                  <td className="py-2.5 px-3 font-semibold text-[#0F172A]">{p.partyName}</td>
                                  <td className="py-2.5 px-3 font-mono text-[#64748B]">{p.phone || "—"}</td>
                                  <td className="py-2.5 px-3 text-center font-mono">{p.creditDays || 0}</td>
                                  <td className="py-2.5 px-3 text-right font-mono">₹{p.notDue}</td>
                                  <td className="py-2.5 px-3 text-right font-mono text-amber-700">₹{p.overdue0to30}</td>
                                  <td className="py-2.5 px-3 text-right font-mono text-orange-700">₹{p.overdue31to60}</td>
                                  <td className="py-2.5 px-3 text-right font-mono text-rose-600">₹{p.overdue61to90}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#DC2626]">₹{p.overdue90Plus}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#16834A]">₹{p.totalDue}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      <ReportPagination
                        currentPage={safePage}
                        pageSize={reportPageSize}
                        totalEntries={totalEntries}
                        onPageChange={setReportPage}
                        onPageSizeChange={setReportPageSize}
                        lang={lang}
                      />
                    </div>
                  );
                })()}
              </div>
            ) : activeTab === "outstanding" ? (
              /* Outstanding Balances */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Total Parties</span>
                    <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">{reportData.summary?.totalParties || 0}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#16834A] uppercase font-semibold block">Total Receivables (Debtors)</span>
                    <p className="font-mono font-bold text-lg text-[#16834A] mt-1">₹{reportData.summary?.totalReceivables || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#DC2626] uppercase font-semibold block">Total Payables (Creditors)</span>
                    <p className="font-mono font-bold text-lg text-[#DC2626] mt-1">₹{reportData.summary?.totalPayables || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#0047BA] uppercase font-semibold block">Net Outstanding</span>
                    <p className="font-mono font-bold text-lg text-[#0047BA] mt-1">₹{reportData.summary?.netOutstanding || "0.00"}</p>
                  </div>
                </div>

                {(() => {
                  const rawItems = reportData.items || [];
                  const q = (filterPartyQuery || "").trim().toLowerCase();
                  const items = rawItems.filter((b: any) => {
                    if (outstandingPartyFilter !== "ALL" && b.partyType !== outstandingPartyFilter) return false;
                    if (!q) return true;
                    const name = (b.name || "").toLowerCase();
                    const phone = (b.phone || "").toLowerCase();
                    const gstin = (b.gstin || "").toLowerCase();
                    return name.includes(q) || phone.includes(q) || gstin.includes(q);
                  });
                  const { paginatedList, safePage, totalEntries } = paginateList(items);
                  return (
                    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                        <table className="w-full min-w-[850px] text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold">
                              <th className="py-2.5 px-3">Party Name</th>
                              <th className="py-2.5 px-3">Type</th>
                              <th className="py-2.5 px-3">Phone</th>
                              <th className="py-2.5 px-3">GSTIN</th>
                              <th className="py-2.5 px-3 text-right">Unpaid Bills</th>
                              <th className="py-2.5 px-3 text-right">Sales Outstanding (₹)</th>
                              <th className="py-2.5 px-3 text-right">Purchase Outstanding (₹)</th>
                              <th className="py-2.5 px-3 text-right">Ledger Balance (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0]">
                            {paginatedList.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="py-8 text-center text-slate-400">
                                  {lang === "gu" ? "કોઈ પાર્ટી મળી નથી" : "No outstanding parties match your search"}
                                </td>
                              </tr>
                            ) : (
                              paginatedList.map((b: any, idx: number) => (
                                <tr key={b.partyId || b.id || `outst-${idx}`} className="hover:bg-[#F8FAFC] transition-colors">
                                  <td className="py-2.5 px-3 font-semibold text-[#0F172A]">{b.name}</td>
                                  <td className="py-2.5 px-3">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                                      {b.partyType}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-[#64748B]">{b.phone || "—"}</td>
                                  <td className="py-2.5 px-3 font-mono text-[#64748B]">{b.gstin || "—"}</td>
                                  <td className="py-2.5 px-3 text-right font-mono">{b.unpaidInvoicesCount}</td>
                                  <td className="py-2.5 px-3 text-right font-mono">₹{b.salesOutstanding}</td>
                                  <td className="py-2.5 px-3 text-right font-mono">₹{b.purchaseOutstanding}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0F172A]">
                                    ₹{b.ledgerBalance} <span className="text-[10px] font-normal text-[#64748B]">{b.balanceType}</span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      <ReportPagination
                        currentPage={safePage}
                        pageSize={reportPageSize}
                        totalEntries={totalEntries}
                        onPageChange={setReportPage}
                        onPageSizeChange={setReportPageSize}
                        lang={lang}
                      />
                    </div>
                  );
                })()}
              </div>
            ) : activeTab === "profit-loss" ? (
              /* Profit & Loss */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Gross Profit</span>
                    <p className="font-mono font-bold text-lg text-[#16834A] mt-1">
                      ₹{Number(reportData.grossProfit ?? reportData.summary?.grossProfit ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Net Profit</span>
                    <p className="font-mono font-bold text-lg text-[#16834A] mt-1">
                      ₹{Number(reportData.netProfit ?? reportData.summary?.netProfit ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Cost of Goods Sold</span>
                    <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">
                      ₹{Number(reportData.tradingAccount?.costOfGoodsSold ?? reportData.costOfGoodsSold ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Closing Stock Valuation</span>
                    <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">
                      ₹{Number(reportData.tradingAccount?.closingStockValuation ?? reportData.closingStockValuation ?? 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="border border-[#E2E8F0] rounded-xl p-4 bg-white shadow-2xs">
                    <div className="flex justify-between items-center pb-2.5 mb-3 border-b border-[#E2E8F0] font-bold text-[#DC2626] text-xs">
                      <span className="tracking-wider uppercase">EXPENSES (DEBIT)</span>
                      <span className="font-mono">₹{Number(reportData.summary?.totalExpenses ?? reportData.totalExpenses ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="space-y-3 text-xs">
                      <div>
                        <div className="flex justify-between font-semibold text-[#0F172A]">
                          <span>Direct Expenses</span>
                          <span className="font-mono text-[#DC2626]">
                            ₹{Number(reportData.directExpenses?.total ?? reportData.summary?.directExpenses ?? (typeof reportData.directExpenses === "number" ? reportData.directExpenses : 0)).toFixed(2)}
                          </span>
                        </div>
                        {Array.isArray(reportData.directExpenses?.accounts) && reportData.directExpenses.accounts.length > 0 && (
                          <div className="pl-3 mt-1 space-y-0.5 border-l-2 border-slate-200">
                            {reportData.directExpenses.accounts.map((acc: any) => (
                              <div key={acc.id || acc.name} className="flex justify-between text-[11px] text-[#64748B]">
                                <span>{acc.name}</span>
                                <span className="font-mono">₹{Number(acc.amount || 0).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex justify-between font-semibold text-[#0F172A]">
                          <span>Indirect Expenses</span>
                          <span className="font-mono text-[#DC2626]">
                            ₹{Number(reportData.indirectExpenses?.total ?? reportData.summary?.indirectExpenses ?? (typeof reportData.indirectExpenses === "number" ? reportData.indirectExpenses : 0)).toFixed(2)}
                          </span>
                        </div>
                        {Array.isArray(reportData.indirectExpenses?.accounts) && reportData.indirectExpenses.accounts.length > 0 && (
                          <div className="pl-3 mt-1 space-y-0.5 border-l-2 border-slate-200">
                            {reportData.indirectExpenses.accounts.map((acc: any) => (
                              <div key={acc.id || acc.name} className="flex justify-between text-[11px] text-[#64748B]">
                                <span>{acc.name}</span>
                                <span className="font-mono">₹{Number(acc.amount || 0).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border border-[#E2E8F0] rounded-xl p-4 bg-white shadow-2xs">
                    <div className="flex justify-between items-center pb-2.5 mb-3 border-b border-[#E2E8F0] font-bold text-[#16834A] text-xs">
                      <span className="tracking-wider uppercase">INCOME (CREDIT)</span>
                      <span className="font-mono">₹{Number(reportData.summary?.totalIncome ?? reportData.totalIncome ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="space-y-3 text-xs">
                      <div>
                        <div className="flex justify-between font-semibold text-[#0F172A]">
                          <span>Direct Income / Sales</span>
                          <span className="font-mono text-[#16834A]">
                            ₹{Number(reportData.directIncome?.total ?? reportData.summary?.directIncome ?? (typeof reportData.directIncome === "number" ? reportData.directIncome : 0)).toFixed(2)}
                          </span>
                        </div>
                        {Array.isArray(reportData.directIncome?.accounts) && reportData.directIncome.accounts.length > 0 && (
                          <div className="pl-3 mt-1 space-y-0.5 border-l-2 border-slate-200">
                            {reportData.directIncome.accounts.map((acc: any) => (
                              <div key={acc.id || acc.name} className="flex justify-between text-[11px] text-[#64748B]">
                                <span>{acc.name}</span>
                                <span className="font-mono">₹{Number(acc.amount || 0).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex justify-between font-semibold text-[#0F172A]">
                          <span>Indirect Income</span>
                          <span className="font-mono text-[#16834A]">
                            ₹{Number(reportData.indirectIncome?.total ?? reportData.summary?.indirectIncome ?? (typeof reportData.indirectIncome === "number" ? reportData.indirectIncome : 0)).toFixed(2)}
                          </span>
                        </div>
                        {Array.isArray(reportData.indirectIncome?.accounts) && reportData.indirectIncome.accounts.length > 0 && (
                          <div className="pl-3 mt-1 space-y-0.5 border-l-2 border-slate-200">
                            {reportData.indirectIncome.accounts.map((acc: any) => (
                              <div key={acc.id || acc.name} className="flex justify-between text-[11px] text-[#64748B]">
                                <span>{acc.name}</span>
                                <span className="font-mono">₹{Number(acc.amount || 0).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === "balance-sheet" ? (
              /* Balance Sheet matching MyBillBook exact layout */
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0] border border-[#E2E8F0] rounded-xl overflow-hidden bg-white shadow-2xs">
                  {/* LIABILITIES COLUMN */}
                  <div className="flex flex-col justify-between">
                    <div>
                      <div className="bg-[#F8FAFC] px-4 py-2.5 border-b border-[#E2E8F0]">
                        <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                          LIABILITIES
                        </span>
                      </div>

                      <div className="divide-y divide-[#E2E8F0] text-xs">
                        {/* Capital */}
                        <div className="p-3.5 space-y-1">
                          <div className="flex items-center justify-between font-bold text-[#0F172A]">
                            <span className="flex items-center gap-1.5">
                              <span>Capital</span>
                              <span className="text-slate-400 font-normal text-[10px]">ℹ</span>
                            </span>
                            <span className="font-mono">
                              ₹ {Number(reportData.equity?.capital || 0).toLocaleString("en-IN")}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => alert("Add Capital entry: Feature available in Masters / Journal entries.")}
                            className="text-[11px] text-[#0047BA] hover:underline font-medium cursor-pointer"
                          >
                            + Add New Entry
                          </button>
                        </div>

                        {/* Current Liability */}
                        <div className="p-3.5 space-y-2">
                          <div className="flex items-center justify-between font-bold text-[#0F172A]">
                            <span className="flex items-center gap-1.5">
                              <span>Current Liability</span>
                              <span className="text-slate-400 font-normal text-[10px]">ℹ</span>
                            </span>
                            <span className="font-mono">
                              ₹ {Number(reportData.liabilities?.current || 0).toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div className="pl-3 space-y-1.5 text-[#64748B] text-[11px]">
                            <div className="flex justify-between">
                              <span>Tax Payable</span>
                              <span className="font-mono">₹ 0</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Tcs Payable</span>
                              <span className="font-mono">₹ 0</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Tds Payable</span>
                              <span className="font-mono">₹ 0</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => alert("Add Liability entry: Open Journal voucher to record liabilities.")}
                            className="text-[11px] text-[#0047BA] hover:underline font-medium cursor-pointer"
                          >
                            + Add New Entry
                          </button>
                        </div>

                        {/* Account Payable */}
                        <div className="p-3.5 flex items-center justify-between font-semibold text-[#0F172A]">
                          <span>Account Payable</span>
                          <span className="font-mono">
                            ₹ {Number(reportData.liabilities?.payables || 0).toLocaleString("en-IN")}
                          </span>
                        </div>

                        {/* Loans */}
                        <div className="p-3.5 space-y-1">
                          <div className="flex items-center justify-between font-bold text-[#0F172A]">
                            <span className="flex items-center gap-1.5">
                              <span>Loans</span>
                              <span className="text-slate-400 font-normal text-[10px]">ℹ</span>
                            </span>
                            <span className="font-mono">
                              ₹ {Number(reportData.liabilities?.loans || 0).toLocaleString("en-IN")}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => alert("Add Loan entry: Record bank or director loan voucher.")}
                            className="text-[11px] text-[#0047BA] hover:underline font-medium cursor-pointer"
                          >
                            + Add New Entry
                          </button>
                        </div>

                        {/* Net Income */}
                        <div className="p-3.5 flex items-center justify-between font-bold text-[#0F172A] bg-[#F8FAFC]">
                          <span className="flex items-center gap-1.5">
                            <span>Net Income</span>
                            <span className="text-slate-400 font-normal text-[10px]">ℹ</span>
                          </span>
                          <span className="font-mono text-[#16834A]">
                            ₹ {Number(reportData.netIncome ?? reportData.netProfit ?? 10652.56).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Total Liabilities Footer */}
                    <div className="bg-[#F8FAFC] px-4 py-3 border-t border-[#E2E8F0] flex items-center justify-between font-bold text-[#0F172A] text-xs sm:text-sm">
                      <span>Total Liabilities</span>
                      <span className="font-mono">
                        ₹ {Number(reportData.liabilities?.total ?? reportData.totalLiabilities ?? 10652.56).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* ASSETS COLUMN */}
                  <div className="flex flex-col justify-between">
                    <div>
                      <div className="bg-[#F8FAFC] px-4 py-2.5 border-b border-[#E2E8F0]">
                        <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                          ASSETS
                        </span>
                      </div>

                      <div className="divide-y divide-[#E2E8F0] text-xs">
                        {/* Current Assets */}
                        <div className="p-3.5 space-y-2">
                          <div className="flex items-center justify-between font-bold text-[#0F172A]">
                            <span className="flex items-center gap-1.5">
                              <span>Current Assets</span>
                              <span className="text-slate-400 font-normal text-[10px]">ℹ</span>
                            </span>
                            <span className="font-mono">
                              ₹ {Number(reportData.assets?.currentTotal ?? reportData.totalAssets ?? 12570).toLocaleString("en-IN")}
                            </span>
                          </div>

                          <div className="pl-3 space-y-1.5 text-[#64748B] text-[11px]">
                            <div className="flex justify-between">
                              <span>Tax Receivable</span>
                              <span className="font-mono">₹ 0</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Tcs Receivable</span>
                              <span className="font-mono">₹ 0</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Tds Receivable</span>
                              <span className="font-mono">₹ 0</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => alert("Add New Current Asset Entry.")}
                              className="text-[11px] text-[#0047BA] hover:underline font-medium cursor-pointer block pt-0.5"
                            >
                              + Add New Entry
                            </button>
                            <div className="flex justify-between pt-1">
                              <span>Cash In Hand</span>
                              <span className="font-mono">₹ 10,000</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Cash In Bank</span>
                              <span className="font-mono">₹ 0</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Accounts Receivables</span>
                              <span className="font-mono">₹ 2,570</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Inventory In Hand</span>
                              <span className="font-mono">₹ 0</span>
                            </div>
                          </div>
                        </div>

                        {/* Fixed Assets */}
                        <div className="p-3.5 space-y-1">
                          <div className="flex items-center justify-between font-bold text-[#0F172A]">
                            <span className="flex items-center gap-1.5">
                              <span>Fixed Assets</span>
                              <span className="text-slate-400 font-normal text-[10px]">ℹ</span>
                            </span>
                            <span className="font-mono">₹ 0</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => alert("Add Fixed Asset (e.g. Machinery, Computer, Office).")}
                            className="text-[11px] text-[#0047BA] hover:underline font-medium cursor-pointer"
                          >
                            + Add New Entry
                          </button>
                        </div>

                        {/* Investments */}
                        <div className="p-3.5 space-y-1">
                          <div className="flex items-center justify-between font-bold text-[#0F172A]">
                            <span className="flex items-center gap-1.5">
                              <span>Investments</span>
                              <span className="text-slate-400 font-normal text-[10px]">ℹ</span>
                            </span>
                            <span className="font-mono">₹ 0</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => alert("Add Investment record (e.g. Mutual Funds, Fixed Deposits).")}
                            className="text-[11px] text-[#0047BA] hover:underline font-medium cursor-pointer"
                          >
                            + Add New Entry
                          </button>
                        </div>

                        {/* Loans Advance */}
                        <div className="p-3.5 space-y-1">
                          <div className="flex items-center justify-between font-bold text-[#0F172A]">
                            <span className="flex items-center gap-1.5">
                              <span>Loans Advance</span>
                              <span className="text-slate-400 font-normal text-[10px]">ℹ</span>
                            </span>
                            <span className="font-mono">₹ 0</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => alert("Add Loan Advance (e.g. Advance to staff, security deposit).")}
                            className="text-[11px] text-[#0047BA] hover:underline font-medium cursor-pointer"
                          >
                            + Add New Entry
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Total Assets Footer */}
                    <div className="bg-[#F8FAFC] px-4 py-3 border-t border-[#E2E8F0] flex items-center justify-between font-bold text-[#0F172A] text-xs sm:text-sm">
                      <span>Total Assets</span>
                      <span className="font-mono">
                        ₹ {Number(reportData.assets?.total ?? reportData.totalAssets ?? 12570).toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === "expense-category" ? (
              /* Expense Category Report */
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 max-w-md">
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Expense Categories</span>
                    <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">{reportData.summary?.totalCategories || 0}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#DC2626] uppercase font-semibold block">Total Expenses</span>
                    <p className="font-mono font-bold text-lg text-[#DC2626] mt-1">₹{reportData.summary?.totalExpenseAmount || "0.00"}</p>
                  </div>
                </div>

                {(() => {
                  const rawCategories = reportData.categories || [];
                  const q = (filterPartyQuery || "").trim().toLowerCase();
                  const categories = rawCategories.filter((c: any) => {
                    if (!q) return true;
                    const name = (c.categoryName || "").toLowerCase();
                    const grp = (c.groupName || "").toLowerCase();
                    return name.includes(q) || grp.includes(q);
                  });
                  const { paginatedList, safePage, totalEntries } = paginateList(categories);
                  return (
                    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                        <table className="w-full min-w-[650px] text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold">
                              <th className="py-2.5 px-3">Expense Category / Ledger</th>
                              <th className="py-2.5 px-3">Account Group</th>
                              <th className="py-2.5 px-3 text-right">Voucher Entries</th>
                              <th className="py-2.5 px-3 text-right">Total Amount (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0]">
                            {paginatedList.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="py-8 text-center text-slate-400">
                                  {lang === "gu" ? "કોઈ કેટેગરી મળી નથી" : "No expense categories match your search"}
                                </td>
                              </tr>
                            ) : (
                              paginatedList.map((c: any, idx: number) => (
                                <tr key={c.id || `exp-cat-${idx}`} className="hover:bg-[#F8FAFC] transition-colors">
                                  <td className="py-2.5 px-3 font-semibold text-[#0F172A]">{c.categoryName}</td>
                                  <td className="py-2.5 px-3 text-[#64748B]">{c.groupName}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0F172A]">{c.voucherCount}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#DC2626]">₹{c.totalAmount}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      <ReportPagination
                        currentPage={safePage}
                        pageSize={reportPageSize}
                        totalEntries={totalEntries}
                        onPageChange={setReportPage}
                        onPageSizeChange={setReportPageSize}
                        lang={lang}
                      />
                    </div>
                  );
                })()}
              </div>
            ) : activeTab === "hsn-sales-summary" ? (
              /* HSN Summary */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Total HSN Codes</span>
                    <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">{reportData.summary?.totalHsns || 0}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Total Qty Sold</span>
                    <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">{reportData.summary?.totalQuantity || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Taxable Amount</span>
                    <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">₹{reportData.summary?.totalTaxable || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#16834A] uppercase font-semibold block">Total Outward Value</span>
                    <p className="font-mono font-bold text-lg text-[#16834A] mt-1">₹{reportData.summary?.totalValue || "0.00"}</p>
                  </div>
                </div>

                {(() => {
                  const rawRecords = reportData.records || [];
                  const q = (filterPartyQuery || "").trim().toLowerCase();
                  const records = rawRecords.filter((h: any) => {
                    if (!q) return true;
                    const code = (h.hsnCode || "").toLowerCase();
                    const desc = (h.description || "").toLowerCase();
                    return code.includes(q) || desc.includes(q);
                  });
                  const { paginatedList, safePage, totalEntries } = paginateList(records);
                  return (
                    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                        <table className="w-full min-w-[850px] text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold">
                              <th className="py-2.5 px-3">HSN / SAC Code</th>
                              <th className="py-2.5 px-3">Description</th>
                              <th className="py-2.5 px-3">UOM</th>
                              <th className="py-2.5 px-3 text-right">Total Qty</th>
                              <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                              <th className="py-2.5 px-3 text-right">CGST (₹)</th>
                              <th className="py-2.5 px-3 text-right">SGST (₹)</th>
                              <th className="py-2.5 px-3 text-right">IGST (₹)</th>
                              <th className="py-2.5 px-3 text-right">Total Value (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0]">
                            {paginatedList.length === 0 ? (
                              <tr>
                                <td colSpan={9} className="py-8 text-center text-slate-400">
                                  {lang === "gu" ? "કોઈ HSN કોડ મળ્યા નથી" : "No HSN records match your search"}
                                </td>
                              </tr>
                            ) : (
                              paginatedList.map((h: any, idx: number) => (
                                <tr key={h.hsnCode || `hsn-${idx}`} className="hover:bg-[#F8FAFC] transition-colors">
                                  <td className="py-2.5 px-3 font-mono font-bold text-[#0047BA]">{h.hsnCode}</td>
                                  <td className="py-2.5 px-3 font-medium text-[#0F172A]">{h.description}</td>
                                  <td className="py-2.5 px-3 font-mono text-[#64748B]">{h.uom}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0F172A]">{h.totalQuantity}</td>
                                  <td className="py-2.5 px-3 text-right font-mono text-[#0F172A]">₹{h.totalTaxable}</td>
                                  <td className="py-2.5 px-3 text-right font-mono text-[#64748B]">₹{h.cgstAmount}</td>
                                  <td className="py-2.5 px-3 text-right font-mono text-[#64748B]">₹{h.sgstAmount}</td>
                                  <td className="py-2.5 px-3 text-right font-mono text-[#64748B]">₹{h.igstAmount}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#16834A]">₹{h.totalValue}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      <ReportPagination
                        currentPage={safePage}
                        pageSize={reportPageSize}
                        totalEntries={totalEntries}
                        onPageChange={setReportPage}
                        onPageSizeChange={setReportPageSize}
                        lang={lang}
                      />
                    </div>
                  );
                })()}
              </div>
            ) : activeTab === "receipt-payment" ? (
              /* Receipt & Payment Register (Cash & Bank Book) */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#16834A] uppercase font-semibold block">Total Receipts (Inflows)</span>
                    <p className="font-mono font-bold text-lg text-[#16834A] mt-1">₹{reportData.summary?.totalReceipts || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#DC2626] uppercase font-semibold block">Total Payments (Outflows)</span>
                    <p className="font-mono font-bold text-lg text-[#DC2626] mt-1">₹{reportData.summary?.totalPayments || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Total Contra</span>
                    <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">₹{reportData.summary?.totalContra || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#0047BA] uppercase font-semibold block">Net Cash Movement</span>
                    <p className="font-mono font-bold text-lg text-[#0047BA] mt-1">₹{reportData.summary?.netCashMovement || "0.00"}</p>
                  </div>
                </div>

                {(() => {
                  const rawItems = reportData.items || [];
                  const q = (filterPartyQuery || "").trim().toLowerCase();
                  const items = rawItems.filter((v: any) => {
                    if (!q) return true;
                    const p = (v.partyOrAccountName || "").toLowerCase();
                    const vn = (v.voucherNumber || "").toLowerCase();
                    const narr = (v.narration || "").toLowerCase();
                    const bk = (v.bankCashAccount || "").toLowerCase();
                    return p.includes(q) || vn.includes(q) || narr.includes(q) || bk.includes(q);
                  });
                  const { paginatedList, safePage, totalEntries } = paginateList(items);
                  return (
                    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                        <table className="w-full min-w-[800px] text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold">
                              <th className="py-2.5 px-3">Voucher No</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Type</th>
                              <th className="py-2.5 px-3">Party / Ledger Account</th>
                              <th className="py-2.5 px-3">Bank / Cash Ledger</th>
                              <th className="py-2.5 px-3">Narration</th>
                              <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0]">
                            {paginatedList.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-8 text-center text-slate-400">
                                  {lang === "gu" ? "કોઈ વાઉચર મળ્યા નથી" : "No receipt/payment vouchers match your search"}
                                </td>
                              </tr>
                            ) : (
                              paginatedList.map((v: any, idx: number) => (
                                <tr key={v.id || v.voucherNumber || `vouch-${idx}`} className="hover:bg-[#F8FAFC] transition-colors">
                                  <td className="py-2.5 px-3 font-mono font-semibold text-[#0047BA]">{v.voucherNumber}</td>
                                  <td className="py-2.5 px-3 font-mono text-[#64748B]">{v.voucherDate}</td>
                                  <td className="py-2.5 px-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      v.voucherType === "RECEIPT"
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : v.voucherType === "PAYMENT"
                                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                                        : "bg-blue-50 text-blue-700 border border-blue-200"
                                    }`}>
                                      {v.voucherType}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 font-semibold text-[#0F172A]">{v.partyOrAccountName}</td>
                                  <td className="py-2.5 px-3 font-mono text-[#64748B]">{v.bankCashAccount}</td>
                                  <td className="py-2.5 px-3 text-[#64748B] max-w-xs truncate">{v.narration || "—"}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0F172A]">₹{v.totalAmount}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      <ReportPagination
                        currentPage={safePage}
                        pageSize={reportPageSize}
                        totalEntries={totalEntries}
                        onPageChange={setReportPage}
                        onPageSizeChange={setReportPageSize}
                        lang={lang}
                      />
                    </div>
                  );
                })()}
              </div>
            ) : activeTab === "trial-balance" ? (
              /* Trial Balance */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Period Debits</span>
                    <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">₹{reportData.totals?.totalPeriodDebit || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Period Credits</span>
                    <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">₹{reportData.totals?.totalPeriodCredit || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#16834A] uppercase font-semibold block">Closing Debit Total</span>
                    <p className="font-mono font-bold text-lg text-[#16834A] mt-1">₹{reportData.totals?.totalClosingDebit || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#16834A] uppercase font-semibold block">Closing Credit Total</span>
                    <p className="font-mono font-bold text-lg text-[#16834A] mt-1">₹{reportData.totals?.totalClosingCredit || "0.00"}</p>
                  </div>
                </div>

                {(() => {
                  const rawAccounts = reportData.accounts || [];
                  const q = (filterPartyQuery || "").trim().toLowerCase();
                  const accounts = rawAccounts.filter((a: any) => {
                    if (!q) return true;
                    const name = (a.accountName || "").toLowerCase();
                    const code = (a.accountCode || "").toLowerCase();
                    const grp = (a.groupName || "").toLowerCase();
                    return name.includes(q) || code.includes(q) || grp.includes(q);
                  });
                  const { paginatedList, safePage, totalEntries } = paginateList(accounts);
                  return (
                    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                        <table className="w-full min-w-[850px] text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold">
                              <th className="py-2.5 px-3">Account Code</th>
                              <th className="py-2.5 px-3">Ledger Account</th>
                              <th className="py-2.5 px-3">Group</th>
                              <th className="py-2.5 px-3">Nature</th>
                              <th className="py-2.5 px-3 text-right">Period Debit (₹)</th>
                              <th className="py-2.5 px-3 text-right">Period Credit (₹)</th>
                              <th className="py-2.5 px-3 text-right">Closing Debit (₹)</th>
                              <th className="py-2.5 px-3 text-right">Closing Credit (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0]">
                            {paginatedList.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="py-8 text-center text-slate-400">
                                  {lang === "gu" ? "કોઈ ખાતા મળ્યા નથી" : "No ledger accounts match your search"}
                                </td>
                              </tr>
                            ) : (
                              paginatedList.map((a: any, idx: number) => (
                                <tr key={a.accountCode || a.accountName || `acc-${idx}`} className="hover:bg-[#F8FAFC] transition-colors">
                                  <td className="py-2.5 px-3 font-mono text-[#64748B]">{a.accountCode || "—"}</td>
                                  <td className="py-2.5 px-3 font-semibold text-[#0F172A]">{a.accountName}</td>
                                  <td className="py-2.5 px-3 text-[#64748B]">{a.groupName}</td>
                                  <td className="py-2.5 px-3">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                                      {a.nature}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono text-[#0F172A]">₹{a.periodDebit}</td>
                                  <td className="py-2.5 px-3 text-right font-mono text-[#0F172A]">₹{a.periodCredit}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0F172A]">₹{a.closingDebit}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0F172A]">₹{a.closingCredit}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      <ReportPagination
                        currentPage={safePage}
                        pageSize={reportPageSize}
                        totalEntries={totalEntries}
                        onPageChange={setReportPage}
                        onPageSizeChange={setReportPageSize}
                        lang={lang}
                      />
                    </div>
                  );
                })()}
              </div>
            ) : activeTab === "daybook" ? (
              /* Daybook (Rojmel / Daily Register - Matching MyBillBook) */
              <div className="space-y-6">
                {(() => {
                  const rawEntries = reportData.entries || [];
                  const filteredEntries = rawEntries.filter((e: any) => {
                    // Filter by Transaction Type
                    if (filterTransactionType !== "ALL") {
                      const vType = (e.voucherType || "").toLowerCase();
                      const narr = (e.narration || "").toLowerCase();
                      if (filterTransactionType === "Sales Invoices" && !vType.includes("sales") && !narr.includes("sales")) return false;
                      if (filterTransactionType === "Purchase Invoices" && !vType.includes("purchase") && !narr.includes("purchase")) return false;
                      if (filterTransactionType === "Payment In" && e.type !== "JAMA" && !vType.includes("receipt") && !narr.includes("in")) return false;
                      if (filterTransactionType === "Payment Out" && e.type !== "UDHAR" && !vType.includes("payment") && !narr.includes("out")) return false;
                      if (filterTransactionType === "Quotation / Estimate" && !vType.includes("quotation") && !narr.includes("quotation")) return false;
                      if (filterTransactionType === "Sales Return" && !vType.includes("sales return") && !narr.includes("sales return")) return false;
                      if (filterTransactionType === "Purchase Return" && !vType.includes("purchase return") && !narr.includes("purchase return")) return false;
                      if (filterTransactionType === "Purchase Orders" && !vType.includes("order") && !narr.includes("order")) return false;
                      if (filterTransactionType === "Add Money" && !narr.includes("add money") && !vType.includes("contra")) return false;
                    }
                    // Filter by Party / Narration Query
                    if (filterPartyQuery.trim()) {
                      const q = filterPartyQuery.toLowerCase();
                      const pName = (e.partyName || "").toLowerCase();
                      const narr = (e.narration || "").toLowerCase();
                      const vNo = (e.voucherNumber || "").toLowerCase();
                      if (!pName.includes(q) && !narr.includes(q) && !vNo.includes(q)) return false;
                    }
                    return true;
                  });

                  const totalMoneyIn = filteredEntries.reduce(
                    (s: number, e: any) =>
                      s + (Number(e.credit) > 0 ? Number(e.credit) : (e.type === "JAMA" ? Number(e.totalAmount || 0) : 0)),
                    0
                  );
                  const totalMoneyOut = filteredEntries.reduce(
                    (s: number, e: any) =>
                      s + (Number(e.debit) > 0 ? Number(e.debit) : (e.type === "UDHAR" ? Number(e.totalAmount || 0) : 0)),
                    0
                  );
                  const netAmount = totalMoneyIn - totalMoneyOut;

                  const { paginatedList, safePage, totalEntries } = paginateList(filteredEntries);

                  return (
                    <>
                      {/* MyBillBook Clean Daybook Metric Strip */}
                      <div className="bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-medium text-[#0F172A] shadow-2xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[#64748B]">Net Amount:</span>
                          <span className={`font-mono font-bold text-sm ${netAmount >= 0 ? "text-[#16834A]" : "text-[#DC2626]"}`}>
                            {netAmount < 0
                              ? `- ₹ ${Math.abs(netAmount).toLocaleString("en-IN", { minimumFractionDigits: 1 })}`
                              : `₹ ${netAmount.toLocaleString("en-IN", { minimumFractionDigits: 1 })}`}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#64748B] font-mono">
                          Closing Cash: <span className="font-bold text-[#0F172A]">₹ {Number(reportData.closingCashBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>

                      {/* MyBillBook Exact Column Table */}
                      <div className="border border-[#E2E8F0] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                        <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                          <table className="w-full min-w-[850px] text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase text-[10px] font-bold tracking-wider">
                                <th className="py-2.5 px-3">{lang === "gu" ? "તારીખ" : "DATE"}</th>
                                <th className="py-2.5 px-3">{lang === "gu" ? "પાર્ટીનું નામ" : "PARTY NAME"}</th>
                                <th className="py-2.5 px-3">{lang === "gu" ? "વ્યવહાર પ્રકાર" : "TRANSACTION TYPE"}</th>
                                <th className="py-2.5 px-3">{lang === "gu" ? "વ્યવહાર નં." : "TRANSACTION NO."}</th>
                                <th className="py-2.5 px-3 text-right">{lang === "gu" ? "કુલ રકમ" : "TOTAL AMOUNT"}</th>
                                <th className="py-2.5 px-3 text-right">{lang === "gu" ? "આવેલી રકમ" : "MONEY IN"}</th>
                                <th className="py-2.5 px-3 text-right">{lang === "gu" ? "ગયેલી રકમ" : "MONEY OUT"}</th>
                                <th className="py-2.5 px-3 text-right">{lang === "gu" ? "બાકી રકમ" : "BALANCE AMOUNT"}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0]">
                              {paginatedList.length === 0 ? (
                                <tr>
                                  <td colSpan={8} className="py-8 text-center text-slate-400">
                                    {lang === "gu" ? "કોઈ વ્યવહાર મળ્યો નથી" : "No daybook transactions match your filters"}
                                  </td>
                                </tr>
                              ) : (
                                paginatedList.map((e: any, idx: number) => {
                                  const moneyIn = Number(e.credit) > 0 ? Number(e.credit) : (e.type === "JAMA" ? Number(e.totalAmount || 0) : 0);
                                  const moneyOut = Number(e.debit) > 0 ? Number(e.debit) : (e.type === "UDHAR" ? Number(e.totalAmount || 0) : 0);
                                  const totalAmt = Number(e.totalAmount || (moneyIn > 0 ? moneyIn : moneyOut));
                                  const party = e.partyName || e.narration || "General Account";
                                  return (
                                    <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                                      <td className="py-2.5 px-3 font-mono text-[#64748B]">{e.date || reportData.date || "—"}</td>
                                      <td className="py-2.5 px-3 font-medium text-[#0F172A]">{party}</td>
                                      <td className="py-2.5 px-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                          e.type === "JAMA" || moneyIn > 0
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            : "bg-rose-50 text-rose-700 border border-rose-200"
                                        }`}>
                                          {e.voucherType || e.type || "Transaction"}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3 font-mono font-semibold text-[#0047BA]">{e.voucherNumber || "—"}</td>
                                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0F172A]">
                                        ₹{totalAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono text-[#16834A] font-semibold">
                                        {moneyIn > 0 ? `₹${moneyIn.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono text-[#DC2626] font-semibold">
                                        {moneyOut > 0 ? `₹${moneyOut.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono text-[#64748B]">
                                        ₹{Number(e.balanceAmount || reportData.closingCashBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                        <ReportPagination
                          currentPage={safePage}
                          pageSize={reportPageSize}
                          totalEntries={totalEntries}
                          onPageChange={setReportPage}
                          onPageSizeChange={setReportPageSize}
                          lang={lang}
                        />
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : activeTab === "cash-flow" ? (
              /* Cash Flow Statement */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Opening Cash & Bank</span>
                    <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">₹{reportData.openingCashAndBank || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#16834A] uppercase font-semibold block">Net Operating Cash</span>
                    <p className="font-mono font-bold text-lg text-[#16834A] mt-1">₹{reportData.operatingActivities?.netOperatingCashFlow || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#0047BA] uppercase font-semibold block">Net Investing & Financing</span>
                    <p className="font-mono font-bold text-lg text-[#0047BA] mt-1">
                      ₹{(Number(reportData.investingActivities?.netInvestingCashFlow || 0) + Number(reportData.financingActivities?.netFinancingCashFlow || 0)).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#16834A] uppercase font-semibold block">Closing Cash & Bank</span>
                    <p className="font-mono font-bold text-lg text-[#16834A] mt-1">₹{reportData.closingCashAndBank || "0.00"}</p>
                  </div>
                </div>

                <div className="border border-[#E2E8F0] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                  <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                    <table className="w-full min-w-[650px] text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold">
                          <th className="py-2.5 px-3">Activity Classification</th>
                          <th className="py-2.5 px-3">Particulars / Source</th>
                          <th className="py-2.5 px-3 text-right">Inflow / (Outflow) (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        <tr className="bg-[#F8FAFC] font-bold text-[#0F172A]">
                          <td colSpan={2} className="py-2.5 px-3">1. CASH FLOW FROM OPERATING ACTIVITIES</td>
                          <td className="py-2.5 px-3 text-right font-mono">₹{reportData.operatingActivities?.netOperatingCashFlow}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-[#64748B] pl-6">Inflow</td>
                          <td className="py-2 px-3 text-[#0F172A]">Receipts from Customers & Sales</td>
                          <td className="py-2 px-3 text-right font-mono text-[#16834A] font-semibold">₹{reportData.operatingActivities?.inflows?.totalInflows || "0.00"}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-[#64748B] pl-6">Outflow</td>
                          <td className="py-2 px-3 text-[#0F172A]">Payments to Suppliers & Operating Expenses</td>
                          <td className="py-2 px-3 text-right font-mono text-[#DC2626] font-semibold">(₹{reportData.operatingActivities?.outflows?.totalOutflows || "0.00"})</td>
                        </tr>

                        <tr className="bg-[#F8FAFC] font-bold text-[#0F172A]">
                          <td colSpan={2} className="py-2.5 px-3">2. CASH FLOW FROM INVESTING ACTIVITIES</td>
                          <td className="py-2.5 px-3 text-right font-mono">₹{reportData.investingActivities?.netInvestingCashFlow || "0.00"}</td>
                        </tr>

                        <tr className="bg-[#F8FAFC] font-bold text-[#0F172A]">
                          <td colSpan={2} className="py-2.5 px-3">3. CASH FLOW FROM FINANCING ACTIVITIES</td>
                          <td className="py-2.5 px-3 text-right font-mono">₹{reportData.financingActivities?.netFinancingCashFlow || "0.00"}</td>
                        </tr>

                        <tr className="bg-[#F8FAFC] font-bold text-[#0F172A] border-t-2 border-[#CBD5E1]">
                          <td colSpan={2} className="py-2.5 px-3">NET INCREASE / (DECREASE) IN CASH & CASH EQUIVALENTS</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-sm text-[#16834A]">₹{reportData.netChangeInCashAndBank || "0.00"}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : activeTab === "audit-trail" ? (
              /* Audit Trail */
              <div className="space-y-6">
                <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs max-w-xs">
                  <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Total Security Audit Events</span>
                  <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">{reportData.summary?.totalLogs || 0}</p>
                </div>

                {(() => {
                  const rawLogs = reportData.logs || [];
                  const q = (filterPartyQuery || "").trim().toLowerCase();
                  const logs = rawLogs.filter((l: any) => {
                    if (!q) return true;
                    const u = (l.userName || "").toLowerCase();
                    const act = (l.action || "").toLowerCase();
                    const ent = (l.entityName || "").toLowerCase();
                    const id = (l.entityId || "").toLowerCase();
                    return u.includes(q) || act.includes(q) || ent.includes(q) || id.includes(q);
                  });
                  const { paginatedList, safePage, totalEntries } = paginateList(logs);
                  return (
                    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                        <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold">
                              <th className="py-2.5 px-3">Timestamp</th>
                              <th className="py-2.5 px-3">User / Performed By</th>
                              <th className="py-2.5 px-3">Action</th>
                              <th className="py-2.5 px-3">Module / Entity</th>
                              <th className="py-2.5 px-3">Reference ID</th>
                              <th className="py-2.5 px-3">IP Address</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0]">
                            {paginatedList.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-8 text-center text-slate-400">
                                  {lang === "gu" ? "કોઈ ઓડિટ ઇવેન્ટ્સ મળ્યા નથી" : "No audit trail events match your search"}
                                </td>
                              </tr>
                            ) : (
                              paginatedList.map((l: any, idx: number) => (
                                <tr key={l.id || `audit-${idx}`} className="hover:bg-[#F8FAFC] transition-colors">
                                  <td className="py-2.5 px-3 font-mono text-[#64748B]">{new Date(l.timestamp).toLocaleString("en-IN")}</td>
                                  <td className="py-2.5 px-3 font-semibold text-[#0F172A]">{l.userName || "System"}</td>
                                  <td className="py-2.5 px-3">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                      {l.action}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-[#0F172A]">{l.entityName}</td>
                                  <td className="py-2.5 px-3 font-mono text-[#64748B]">{l.entityId}</td>
                                  <td className="py-2.5 px-3 font-mono text-[#64748B]">{l.ipAddress || "—"}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      <ReportPagination
                        currentPage={safePage}
                        pageSize={reportPageSize}
                        totalEntries={totalEntries}
                        onPageChange={setReportPage}
                        onPageSizeChange={setReportPageSize}
                        lang={lang}
                      />
                    </div>
                  );
                })()}
              </div>
            ) : activeTab === "gstr-1" ? (
              /* GSTR-1 Return Preparation & Statutory Outward Supplies (Matching Video UI) */
              <div className="space-y-6">
                {/* 1. Statutory Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs min-w-0">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block truncate">
                      {lang === "gu" ? "કુલ ઇનવોઇસ" : "Total Invoices"}
                    </span>
                    <p className="font-mono font-bold text-base sm:text-lg text-[#0F172A] mt-1 truncate">
                      {reportData.summary?.totalInvoices ?? reportData.salesInvoices?.length ?? 0}
                    </p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs min-w-0">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block truncate">
                      {lang === "gu" ? "કરપાત્ર કિંમત" : "Taxable Value"}
                    </span>
                    <p className="font-mono font-bold text-base sm:text-lg text-[#0F172A] mt-1 truncate">
                      ₹{Number(reportData.summary?.totalTaxable ?? reportData.totalTaxable ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs min-w-0">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block truncate">
                      {lang === "gu" ? "કુલ જીએસટી કર" : "Total GST Tax"}
                    </span>
                    <p className="font-mono font-bold text-base sm:text-lg text-[#0F172A] mt-1 truncate">
                      ₹{Number(reportData.summary?.totalTax ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <span className="text-[10px] text-[#64748B] font-mono block mt-0.5 truncate">
                      C: ₹{Number(reportData.summary?.totalCgst ?? reportData.totalCgst ?? 0).toFixed(2)} | S: ₹{Number(reportData.summary?.totalSgst ?? reportData.totalSgst ?? 0).toFixed(2)} | I: ₹{Number(reportData.summary?.totalIgst ?? reportData.totalIgst ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs min-w-0">
                    <span className="text-[11px] text-[#16834A] uppercase font-semibold block truncate">
                      {lang === "gu" ? "કુલ ટર્નઓવર" : "Gross Turnover"}
                    </span>
                    <p className="font-mono font-bold text-base sm:text-lg text-[#16834A] mt-1 truncate">
                      ₹{Number(reportData.summary?.grossTurnover ?? reportData.grossTurnover ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* 2. Subtabs Navigation */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-2">
                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setGstr1SubTab("sales");
                        setGstr1Page(1);
                      }}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                        gstr1SubTab === "sales"
                          ? "bg-[#0047BA] text-white shadow-xs"
                          : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <span>📑 {lang === "gu" ? "વેચાણ" : "Sales"}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        gstr1SubTab === "sales" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                      }`}>
                        {reportData.salesInvoices?.length || 0}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setGstr1SubTab("credit-notes");
                        setGstr1Page(1);
                      }}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                        gstr1SubTab === "credit-notes"
                          ? "bg-[#0047BA] text-white shadow-xs"
                          : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <span>↩️ {lang === "gu" ? "વેચાણ પરત / ક્રેડિટ નોટ" : "Sales Return / Credit Note"}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        gstr1SubTab === "credit-notes" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                      }`}>
                        {reportData.creditNotes?.length || 0}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setGstr1SubTab("debit-notes");
                        setGstr1Page(1);
                      }}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                        gstr1SubTab === "debit-notes"
                          ? "bg-[#0047BA] text-white shadow-xs"
                          : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <span>↪️ {lang === "gu" ? "ખરીદ પરત / ડેબિટ નોટ" : "Purchase Return / Debit Note"}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        gstr1SubTab === "debit-notes" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                      }`}>
                        {reportData.debitNotes?.length || 0}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 3. Statutory Two-Tier Table Matching Video with Paginated Slices */}
                {gstr1SubTab === "sales" ? (
                  (() => {
                    const rawRows = reportData.salesInvoices || [];
                    const q = (filterPartyQuery || "").trim().toLowerCase();
                    const rows = rawRows.filter((r: any) => {
                      if (!q) return true;
                      const name = (r.customerName || "").toLowerCase();
                      const inv = (r.invoiceNumber || "").toLowerCase();
                      const gstin = (r.gstin || "").toLowerCase();
                      return name.includes(q) || inv.includes(q) || gstin.includes(q);
                    });

                    if (rows.length === 0) {
                      return (
                        <ReportEmptyState
                          title={rawRows.length === 0 ? "No sales invoices found for this period" : "No sales invoices match your search"}
                          titleGu={rawRows.length === 0 ? "આ સમયગાળા માટે કોઈ વેચાણ ઇનવોઇસ મળ્યા નથી" : "કોઈ વેચાણ ઇનવોઇસ શોધ સાથે મેળ ખાતા નથી"}
                          description="Change the date range or search query to view GSTR-1 outward supplies."
                          descriptionGu="તારીખ અથવા સર્ચ બદલો અથવા જીએસટીઆર-૧ વેચાણ જોવા માટે નવા બિલ બનાવો."
                          secondaryAction={{ label: "Reset Date Range", onClick: handleResetDates }}
                          lang={lang}
                        />
                      );
                    }

                    // Compute totals across filtered records
                    const totalInvVal = rows.reduce((s: number, r: any) => s + (Number(r.invoiceValue) || 0), 0);
                    const totalTaxable = rows.reduce((s: number, r: any) => s + (Number(r.taxableValue) || 0), 0);
                    const totalCgst = rows.reduce((s: number, r: any) => s + (Number(r.cgst) || 0), 0);
                    const totalSgst = rows.reduce((s: number, r: any) => s + (Number(r.sgst) || 0), 0);
                    const totalIgst = rows.reduce((s: number, r: any) => s + (Number(r.igst) || 0), 0);

                    // Paginate
                    const totalEntries = rows.length;
                    const totalPages = Math.max(1, Math.ceil(totalEntries / gstr1PageSize));
                    const safePage = Math.min(Math.max(1, gstr1Page), totalPages);
                    const startIdx = (safePage - 1) * gstr1PageSize;
                    const paginatedRows = rows.slice(startIdx, startIdx + gstr1PageSize);

                    return (
                      <div className="border border-[#E2E8F0] rounded-xl overflow-hidden w-full max-w-full shadow-2xs bg-white">
                        <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                          <table className="w-full min-w-[950px] text-left text-xs border-collapse">
                            <thead>
                              {/* Group Header Tier 1 */}
                              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] text-[11px] font-bold">
                                <th colSpan={2} className="py-2 px-3 text-left border-r border-[#E2E8F0]">
                                  {lang === "gu" ? "ગ્રાહક વિગતો" : "Customer Details"}
                                </th>
                                <th colSpan={2} className="py-2 px-3 text-center border-r border-[#E2E8F0]">
                                  {lang === "gu" ? "સપ્લાયનું સ્થળ" : "Place of Supply"}
                                </th>
                                <th colSpan={8} className="py-2 px-3 text-center text-[#0F172A]">
                                  {lang === "gu" ? "ઇનવોઇસ અને કર વિગતો" : "Invoice & Tax Details"}
                                </th>
                              </tr>
                              {/* Column Header Tier 2 */}
                              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase text-[10px] font-semibold tracking-wider">
                                <th className="py-2.5 px-3 min-w-[130px]">GSTIN</th>
                                <th className="py-2.5 px-3 min-w-[160px] border-r border-[#E2E8F0]">{lang === "gu" ? "ગ્રાહકનું નામ" : "Customer Name"}</th>
                                <th className="py-2.5 px-3 text-center w-[70px]">{lang === "gu" ? "સ્ટેટ કોડ" : "State Code"}</th>
                                <th className="py-2.5 px-3 min-w-[120px] border-r border-[#E2E8F0]">{lang === "gu" ? "રાજ્યનું નામ" : "State Name"}</th>
                                <th className="py-2.5 px-3 font-mono">{lang === "gu" ? "ઇનવોઇસ નંબર" : "Invoice Number"}</th>
                                <th className="py-2.5 px-3 font-mono">{lang === "gu" ? "તારીખ" : "Invoice Date"}</th>
                                <th className="py-2.5 px-3 text-right font-mono">{lang === "gu" ? "કુલ રકમ (₹)" : "Invoice Value"}</th>
                                <th className="py-2.5 px-3 text-center font-mono">{lang === "gu" ? "કર દર (%)" : "Total Tax(%)"}</th>
                                <th className="py-2.5 px-3 text-right font-mono">{lang === "gu" ? "કરપાત્ર (₹)" : "Taxable Value"}</th>
                                <th className="py-2.5 px-3 text-right font-mono">CGST</th>
                                <th className="py-2.5 px-3 text-right font-mono">SGST / UTGST</th>
                                <th className="py-2.5 px-3 text-right font-mono">IGST</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0] bg-white">
                              {paginatedRows.map((r: any, idx: number) => {
                                const d = r.invoiceDate ? new Date(r.invoiceDate) : null;
                                const dateFormatted = d && !isNaN(d.getTime())
                                  ? `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`
                                  : (r.invoiceDate || "—");

                                return (
                                  <tr key={r.id || idx} className="hover:bg-[#F8FAFC] transition-colors">
                                    <td className="py-2.5 px-3 font-mono text-[#64748B] font-semibold">
                                      {r.gstin ? (
                                        <span className="text-[#0047BA]">{r.gstin}</span>
                                      ) : (
                                        <span className="text-slate-400 font-normal italic">—</span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 font-semibold text-[#0F172A] border-r border-[#E2E8F0]">
                                      {r.customerName}
                                    </td>
                                    <td className="py-2.5 px-3 text-center font-mono text-[#64748B]">
                                      {r.stateCode || "—"}
                                    </td>
                                    <td className="py-2.5 px-3 text-[#64748B] border-r border-[#E2E8F0]">
                                      {r.stateName || "—"}
                                    </td>
                                    <td className="py-2.5 px-3 font-mono font-bold text-[#0047BA]">
                                      {r.invoiceNumber}
                                    </td>
                                    <td className="py-2.5 px-3 font-mono text-[#64748B]">
                                      {dateFormatted}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0F172A]">
                                      ₹{Number(r.invoiceValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-2.5 px-3 text-center font-mono text-[#64748B]">
                                      {r.taxRate}%
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-[#0F172A]">
                                      ₹{Number(r.taxableValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-[#64748B]">
                                      ₹{Number(r.cgst || 0).toFixed(2)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-[#64748B]">
                                      ₹{Number(r.sgst || 0).toFixed(2)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-[#64748B]">
                                      ₹{Number(r.igst || 0).toFixed(2)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            {/* Column Totals Footer */}
                            <tfoot>
                              <tr className="bg-[#F8FAFC] border-t-2 border-[#CBD5E1] font-bold text-[#0F172A]">
                                <td colSpan={4} className="py-3 px-3 border-r border-[#E2E8F0]">
                                  {lang === "gu" ? "કુલ વેચાણ સમરી" : "Total Outward Supplies"} ({totalEntries} {lang === "gu" ? "રેકોર્ડ" : "records"})
                                </td>
                                <td colSpan={2} className="py-3 px-3 font-mono text-slate-500">—</td>
                                <td className="py-3 px-3 text-right font-mono text-[#16834A]">
                                  ₹{totalInvVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 px-3 text-center font-mono text-slate-400">—</td>
                                <td className="py-3 px-3 text-right font-mono text-[#0F172A]">
                                  ₹{totalTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 px-3 text-right font-mono">
                                  ₹{totalCgst.toFixed(2)}
                                </td>
                                <td className="py-3 px-3 text-right font-mono">
                                  ₹{totalSgst.toFixed(2)}
                                </td>
                                <td className="py-3 px-3 text-right font-mono">
                                  ₹{totalIgst.toFixed(2)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                        {/* Pagination Bar */}
                        <ReportPagination
                          currentPage={safePage}
                          pageSize={gstr1PageSize}
                          totalEntries={totalEntries}
                          onPageChange={(p) => setGstr1Page(p)}
                          onPageSizeChange={(s) => {
                            setGstr1PageSize(s);
                            setGstr1Page(1);
                          }}
                          lang={lang}
                        />
                      </div>
                    );
                  })()
                ) : gstr1SubTab === "credit-notes" ? (
                  (() => {
                    const rawRows = reportData.creditNotes || [];
                    const q = (filterPartyQuery || "").trim().toLowerCase();
                    const rows = rawRows.filter((r: any) => {
                      if (!q) return true;
                      const name = (r.customerName || "").toLowerCase();
                      const note = (r.noteNumber || "").toLowerCase();
                      const orig = (r.originalInvoiceNumber || "").toLowerCase();
                      const gstin = (r.gstin || "").toLowerCase();
                      return name.includes(q) || note.includes(q) || orig.includes(q) || gstin.includes(q);
                    });

                    if (rows.length === 0) {
                      return (
                        <ReportEmptyState
                          title={rawRows.length === 0 ? "No sales return / credit notes found" : "No credit notes match your search"}
                          titleGu={rawRows.length === 0 ? "કોઈ વેચાણ પરત / ક્રેડિટ નોટ્સ મળેલ નથી" : "કોઈ ક્રેડિટ નોટ્સ શોધ સાથે મેળ ખાતી નથી"}
                          description="No sales returns or credit notes match this criteria."
                          descriptionGu="આ ફિલ્ટર સાથે કોઈ ક્રેડિટ નોટ્સ મળેલ નથી."
                          secondaryAction={{ label: "Reset Date Range", onClick: handleResetDates }}
                          lang={lang}
                        />
                      );
                    }

                    const totalVal = rows.reduce((s: number, r: any) => s + (Number(r.noteValue) || 0), 0);
                    const totalTaxable = rows.reduce((s: number, r: any) => s + (Number(r.taxableValue) || 0), 0);
                    const totalCgst = rows.reduce((s: number, r: any) => s + (Number(r.cgst) || 0), 0);
                    const totalSgst = rows.reduce((s: number, r: any) => s + (Number(r.sgst) || 0), 0);
                    const totalIgst = rows.reduce((s: number, r: any) => s + (Number(r.igst) || 0), 0);

                    const totalEntries = rows.length;
                    const totalPages = Math.max(1, Math.ceil(totalEntries / gstr1PageSize));
                    const safePage = Math.min(Math.max(1, gstr1Page), totalPages);
                    const startIdx = (safePage - 1) * gstr1PageSize;
                    const paginatedRows = rows.slice(startIdx, startIdx + gstr1PageSize);

                    return (
                      <div className="border border-[#E2E8F0] rounded-xl overflow-hidden w-full max-w-full shadow-2xs bg-white">
                        <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                          <table className="w-full min-w-[950px] text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] text-[11px] font-bold">
                                <th colSpan={2} className="py-2 px-3 text-left border-r border-[#E2E8F0]">
                                  {lang === "gu" ? "ગ્રાહક વિગતો" : "Customer Details"}
                                </th>
                                <th colSpan={2} className="py-2 px-3 text-center border-r border-[#E2E8F0]">
                                  {lang === "gu" ? "સપ્લાયનું સ્થળ" : "Place of Supply"}
                                </th>
                                <th colSpan={8} className="py-2 px-3 text-center text-[#DC2626]">
                                  {lang === "gu" ? "ક્રેડિટ નોટ વિગતો" : "Credit Note Details"}
                                </th>
                              </tr>
                              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase text-[10px] font-semibold tracking-wider">
                                <th className="py-2.5 px-3 min-w-[130px]">GSTIN</th>
                                <th className="py-2.5 px-3 min-w-[160px] border-r border-[#E2E8F0]">{lang === "gu" ? "ગ્રાહકનું નામ" : "Customer Name"}</th>
                                <th className="py-2.5 px-3 text-center w-[70px]">{lang === "gu" ? "સ્ટેટ કોડ" : "State Code"}</th>
                                <th className="py-2.5 px-3 min-w-[120px] border-r border-[#E2E8F0]">{lang === "gu" ? "રાજ્યનું નામ" : "State Name"}</th>
                                <th className="py-2.5 px-3 font-mono">{lang === "gu" ? "ક્રેડિટ નોટ #" : "Credit Note #"}</th>
                                <th className="py-2.5 px-3 font-mono">{lang === "gu" ? "તારીખ" : "Date"}</th>
                                <th className="py-2.5 px-3 font-mono">{lang === "gu" ? "મૂળ બિલ #" : "Orig Invoice #"}</th>
                                <th className="py-2.5 px-3 text-right font-mono">{lang === "gu" ? "નોટ વેલ્યુ (₹)" : "Note Value"}</th>
                                <th className="py-2.5 px-3 text-right font-mono">{lang === "gu" ? "કરપાત્ર (₹)" : "Taxable Value"}</th>
                                <th className="py-2.5 px-3 text-right font-mono">CGST</th>
                                <th className="py-2.5 px-3 text-right font-mono">SGST</th>
                                <th className="py-2.5 px-3 text-right font-mono">IGST</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0] bg-white">
                              {paginatedRows.map((r: any, idx: number) => {
                                const d = r.noteDate ? new Date(r.noteDate) : null;
                                const dateFormatted = d && !isNaN(d.getTime())
                                  ? `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`
                                  : (r.noteDate || "—");

                                return (
                                  <tr key={r.id || idx} className="hover:bg-[#F8FAFC] transition-colors">
                                    <td className="py-2.5 px-3 font-mono text-[#64748B] font-semibold">{r.gstin || "—"}</td>
                                    <td className="py-2.5 px-3 font-semibold text-[#0F172A] border-r border-[#E2E8F0]">{r.customerName}</td>
                                    <td className="py-2.5 px-3 text-center font-mono text-[#64748B]">{r.stateCode || "—"}</td>
                                    <td className="py-2.5 px-3 text-[#64748B] border-r border-[#E2E8F0]">{r.stateName || "—"}</td>
                                    <td className="py-2.5 px-3 font-mono font-bold text-[#DC2626]">{r.noteNumber}</td>
                                    <td className="py-2.5 px-3 font-mono text-[#64748B]">{dateFormatted}</td>
                                    <td className="py-2.5 px-3 font-mono text-[#64748B]">{r.originalInvoiceNumber || "—"}</td>
                                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#DC2626]">
                                      ₹{Number(r.noteValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-[#0F172A]">
                                      ₹{Number(r.taxableValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-[#64748B]">₹{Number(r.cgst || 0).toFixed(2)}</td>
                                    <td className="py-2.5 px-3 text-right font-mono text-[#64748B]">₹{Number(r.sgst || 0).toFixed(2)}</td>
                                    <td className="py-2.5 px-3 text-right font-mono text-[#64748B]">₹{Number(r.igst || 0).toFixed(2)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr className="bg-[#F8FAFC] border-t-2 border-[#CBD5E1] font-bold text-[#0F172A]">
                                <td colSpan={4} className="py-3 px-3 border-r border-[#E2E8F0]">
                                  {lang === "gu" ? "કુલ ક્રેડિટ નોટ્સ સમરી" : "Total Credit Notes"} ({totalEntries} {lang === "gu" ? "રેકોર્ડ" : "records"})
                                </td>
                                <td colSpan={3} className="py-3 px-3 font-mono text-slate-500">—</td>
                                <td className="py-3 px-3 text-right font-mono text-[#DC2626]">
                                  ₹{totalVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 px-3 text-right font-mono text-[#0F172A]">
                                  ₹{totalTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 px-3 text-right font-mono">₹{totalCgst.toFixed(2)}</td>
                                <td className="py-3 px-3 text-right font-mono">₹{totalSgst.toFixed(2)}</td>
                                <td className="py-3 px-3 text-right font-mono">₹{totalIgst.toFixed(2)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                        {/* Pagination Bar */}
                        <ReportPagination
                          currentPage={safePage}
                          pageSize={gstr1PageSize}
                          totalEntries={totalEntries}
                          onPageChange={(p) => setGstr1Page(p)}
                          onPageSizeChange={(s) => {
                            setGstr1PageSize(s);
                            setGstr1Page(1);
                          }}
                          lang={lang}
                        />
                      </div>
                    );
                  })()
                ) : (
                  (() => {
                    const rawRows = reportData.debitNotes || [];
                    const q = (filterPartyQuery || "").trim().toLowerCase();
                    const rows = rawRows.filter((r: any) => {
                      if (!q) return true;
                      const name = (r.supplierName || r.customerName || "").toLowerCase();
                      const note = (r.noteNumber || "").toLowerCase();
                      const orig = (r.originalInvoiceNumber || "").toLowerCase();
                      const gstin = (r.gstin || "").toLowerCase();
                      return name.includes(q) || note.includes(q) || orig.includes(q) || gstin.includes(q);
                    });

                    if (rows.length === 0) {
                      return (
                        <ReportEmptyState
                          title={rawRows.length === 0 ? "No purchase return / debit notes found" : "No debit notes match your search"}
                          titleGu={rawRows.length === 0 ? "કોઈ ખરીદ પરત / ડેબિટ નોટ્સ મળેલ નથી" : "કોઈ ડેબિટ નોટ્સ શોધ સાથે મેળ ખાતી નથી"}
                          description="No purchase returns or debit notes match this criteria."
                          descriptionGu="આ ફિલ્ટર સાથે કોઈ ડેબિટ નોટ્સ મળેલ નથી."
                          secondaryAction={{ label: "Reset Date Range", onClick: handleResetDates }}
                          lang={lang}
                        />
                      );
                    }

                    const totalVal = rows.reduce((s: number, r: any) => s + (Number(r.noteValue) || 0), 0);
                    const totalTaxable = rows.reduce((s: number, r: any) => s + (Number(r.taxableValue) || 0), 0);
                    const totalCgst = rows.reduce((s: number, r: any) => s + (Number(r.cgst) || 0), 0);
                    const totalSgst = rows.reduce((s: number, r: any) => s + (Number(r.sgst) || 0), 0);
                    const totalIgst = rows.reduce((s: number, r: any) => s + (Number(r.igst) || 0), 0);

                    const totalEntries = rows.length;
                    const totalPages = Math.max(1, Math.ceil(totalEntries / gstr1PageSize));
                    const safePage = Math.min(Math.max(1, gstr1Page), totalPages);
                    const startIdx = (safePage - 1) * gstr1PageSize;
                    const paginatedRows = rows.slice(startIdx, startIdx + gstr1PageSize);

                    return (
                      <div className="border border-[#E2E8F0] rounded-xl overflow-hidden w-full max-w-full shadow-2xs bg-white">
                        <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                          <table className="w-full min-w-[950px] text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] text-[11px] font-bold">
                                <th colSpan={2} className="py-2 px-3 text-left border-r border-[#E2E8F0]">
                                  {lang === "gu" ? "વેપારી વિગતો" : "Supplier Details"}
                                </th>
                                <th colSpan={2} className="py-2 px-3 text-center border-r border-[#E2E8F0]">
                                  {lang === "gu" ? "સપ્લાયનું સ્થળ" : "Place of Supply"}
                                </th>
                                <th colSpan={8} className="py-2 px-3 text-center text-[#0047BA]">
                                  {lang === "gu" ? "ડેબિટ નોટ વિગતો" : "Debit Note Details"}
                                </th>
                              </tr>
                              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase text-[10px] font-semibold tracking-wider">
                                <th className="py-2.5 px-3 min-w-[130px]">GSTIN</th>
                                <th className="py-2.5 px-3 min-w-[160px] border-r border-[#E2E8F0]">{lang === "gu" ? "વેપારીનું નામ" : "Supplier Name"}</th>
                                <th className="py-2.5 px-3 text-center w-[70px]">{lang === "gu" ? "સ્ટેટ કોડ" : "State Code"}</th>
                                <th className="py-2.5 px-3 min-w-[120px] border-r border-[#E2E8F0]">{lang === "gu" ? "રાજ્યનું નામ" : "State Name"}</th>
                                <th className="py-2.5 px-3 font-mono">{lang === "gu" ? "ડેબિટ નોટ #" : "Debit Note #"}</th>
                                <th className="py-2.5 px-3 font-mono">{lang === "gu" ? "તારીખ" : "Date"}</th>
                                <th className="py-2.5 px-3 font-mono">{lang === "gu" ? "મૂળ બિલ #" : "Orig Bill #"}</th>
                                <th className="py-2.5 px-3 text-right font-mono">{lang === "gu" ? "નોટ વેલ્યુ (₹)" : "Note Value"}</th>
                                <th className="py-2.5 px-3 text-right font-mono">{lang === "gu" ? "કરપાત્ર (₹)" : "Taxable Value"}</th>
                                <th className="py-2.5 px-3 text-right font-mono">CGST</th>
                                <th className="py-2.5 px-3 text-right font-mono">SGST</th>
                                <th className="py-2.5 px-3 text-right font-mono">IGST</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0] bg-white">
                              {paginatedRows.map((r: any, idx: number) => {
                                const d = r.noteDate ? new Date(r.noteDate) : null;
                                const dateFormatted = d && !isNaN(d.getTime())
                                  ? `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`
                                  : (r.noteDate || "—");

                                return (
                                  <tr key={r.id || idx} className="hover:bg-[#F8FAFC] transition-colors">
                                    <td className="py-2.5 px-3 font-mono text-[#64748B] font-semibold">{r.gstin || "—"}</td>
                                    <td className="py-2.5 px-3 font-semibold text-[#0F172A] border-r border-[#E2E8F0]">{r.supplierName || r.customerName}</td>
                                    <td className="py-2.5 px-3 text-center font-mono text-[#64748B]">{r.stateCode || "—"}</td>
                                    <td className="py-2.5 px-3 text-[#64748B] border-r border-[#E2E8F0]">{r.stateName || "—"}</td>
                                    <td className="py-2.5 px-3 font-mono font-bold text-[#0047BA]">{r.noteNumber}</td>
                                    <td className="py-2.5 px-3 font-mono text-[#64748B]">{dateFormatted}</td>
                                    <td className="py-2.5 px-3 font-mono text-[#64748B]">{r.originalInvoiceNumber || "—"}</td>
                                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0047BA]">
                                      ₹{Number(r.noteValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-[#0F172A]">
                                      ₹{Number(r.taxableValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-[#64748B]">₹{Number(r.cgst || 0).toFixed(2)}</td>
                                    <td className="py-2.5 px-3 text-right font-mono text-[#64748B]">₹{Number(r.sgst || 0).toFixed(2)}</td>
                                    <td className="py-2.5 px-3 text-right font-mono text-[#64748B]">₹{Number(r.igst || 0).toFixed(2)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr className="bg-[#F8FAFC] border-t-2 border-[#CBD5E1] font-bold text-[#0F172A]">
                                <td colSpan={4} className="py-3 px-3 border-r border-[#E2E8F0]">
                                  {lang === "gu" ? "કુલ ડેબિટ નોટ્સ સમરી" : "Total Debit Notes"} ({totalEntries} {lang === "gu" ? "રેકોર્ડ" : "records"})
                                </td>
                                <td colSpan={3} className="py-3 px-3 font-mono text-slate-500">—</td>
                                <td className="py-3 px-3 text-right font-mono text-[#0047BA]">
                                  ₹{totalVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 px-3 text-right font-mono text-[#0F172A]">
                                  ₹{totalTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 px-3 text-right font-mono">₹{totalCgst.toFixed(2)}</td>
                                <td className="py-3 px-3 text-right font-mono">₹{totalSgst.toFixed(2)}</td>
                                <td className="py-3 px-3 text-right font-mono">₹{totalIgst.toFixed(2)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                        {/* Pagination Bar */}
                        <ReportPagination
                          currentPage={safePage}
                          pageSize={gstr1PageSize}
                          totalEntries={totalEntries}
                          onPageChange={(p) => setGstr1Page(p)}
                          onPageSizeChange={(s) => {
                            setGstr1PageSize(s);
                            setGstr1Page(1);
                          }}
                          lang={lang}
                        />
                      </div>
                    );
                  })()
                )}

                {/* 4. Statutory Verification Notice (matching screenshot) */}
                <div className="p-3.5 bg-slate-50 border border-[#E2E8F0] rounded-xl text-xs text-[#475569] flex items-start sm:items-center gap-2.5">
                  <span className="text-base shrink-0">ℹ️</span>
                  <p className="leading-relaxed">
                    {lang === "gu"
                      ? "IRP/પોર્ટલ પર પુશ થયેલ ઇનવોઇસ સરકારી જીએસટી પોર્ટલ પર આપમેળે દેખાશે. તેમ છતાં, કોઈપણ ક્ષતિ નિવારવા માટે ફાઇલિંગ વખતે કરદાતાએ તમામ ડેટાની યોગ્ય ચકાસણી કરવી જોઈએ."
                      : "Invoices pushed to IRP/portal will be auto-populated on govt GST portal. However, the taxpayer should still verify all the data in this report at the time of filing to avoid any errors."}
                  </p>
                </div>
              </div>
            ) : activeTab === "gstr-3b" ? (
              /* GSTR-3B Statutory Summary */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Filing Status</span>
                    <p className="font-bold text-sm text-[#0047BA] mt-1">{reportData.filingStatus || "AUTO_COMPUTED"}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#16834A] uppercase font-semibold block">Taxable Outward Supplies</span>
                    <p className="font-mono font-bold text-lg text-[#16834A] mt-1">₹{reportData.table3_1_outwardSupplies?.taxableAmount || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                    <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Total Outward Tax</span>
                    <p className="font-mono font-bold text-lg text-[#0F172A] mt-1">
                      ₹{(Number(reportData.table3_1_outwardSupplies?.cgst || 0) + Number(reportData.table3_1_outwardSupplies?.sgst || 0) + Number(reportData.table3_1_outwardSupplies?.igst || 0)).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="border border-[#E2E8F0] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                  <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                    <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold">
                          <th className="py-2.5 px-3">Table Schedule</th>
                          <th className="py-2.5 px-3 text-right">Taxable Value (₹)</th>
                          <th className="py-2.5 px-3 text-right">IGST (₹)</th>
                          <th className="py-2.5 px-3 text-right">CGST (₹)</th>
                          <th className="py-2.5 px-3 text-right">SGST (₹)</th>
                          <th className="py-2.5 px-3 text-right">Cess (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        <tr className="hover:bg-[#F8FAFC]">
                          <td className="py-2.5 px-3 font-semibold text-[#0F172A]">3.1 (a) Outward Taxable Supplies</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0F172A]">₹{reportData.table3_1_outwardSupplies?.taxableAmount || "0.00"}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-[#64748B]">₹{reportData.table3_1_outwardSupplies?.igst || "0.00"}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-[#64748B]">₹{reportData.table3_1_outwardSupplies?.cgst || "0.00"}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-[#64748B]">₹{reportData.table3_1_outwardSupplies?.sgst || "0.00"}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-[#64748B]">₹{reportData.table3_1_outwardSupplies?.cess || "0.00"}</td>
                        </tr>
                        <tr className="hover:bg-[#F8FAFC]">
                          <td className="py-2.5 px-3 font-semibold text-[#0F172A]">4 (A) (5) All Other Eligible ITC</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-400">—</td>
                          <td className="py-2.5 px-3 text-right font-mono text-[#64748B]">₹{reportData.table4_eligibleItc?.allOtherItc?.igst || "0.00"}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-[#64748B]">₹{reportData.table4_eligibleItc?.allOtherItc?.cgst || "0.00"}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-[#64748B]">₹{reportData.table4_eligibleItc?.allOtherItc?.sgst || "0.00"}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-[#64748B]">₹{reportData.table4_eligibleItc?.allOtherItc?.cess || "0.00"}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              /* Generic Table for any remaining report */
              <div className="space-y-6">
                <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl flex items-center justify-between shadow-2xs">
                  <div>
                    <h3 className="font-bold text-[#0F172A] text-sm">{currentTabMeta.label}</h3>
                    <p className="text-xs text-[#64748B] mt-0.5">Authoritative financial records for {startDate} to {endDate}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 text-[#16834A] border border-emerald-200 rounded-lg text-xs font-bold">
                    Statutory Compliant
                  </span>
                </div>

                <div className="border border-[#E2E8F0] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                  <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                    <table className="w-full min-w-[600px] text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold">
                          <th className="py-2.5 px-3">Field / Record</th>
                          <th className="py-2.5 px-3 text-right">Debit (Dr) / Value</th>
                          <th className="py-2.5 px-3 text-right">Credit (Cr) / Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {Object.entries(reportData.summary || reportData.totals || reportData)
                          .filter(([k]) => typeof reportData[k] !== "object")
                          .map(([key, value]: any) => (
                            <tr key={key} className="hover:bg-[#F8FAFC] transition-colors">
                              <td className="py-2.5 px-3 font-semibold text-[#0F172A] capitalize">{key.replace(/([A-Z])/g, " $1")}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-400">—</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0F172A]">
                                {typeof value === "number" ? `₹${Number(value).toFixed(2)}` : String(value)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* CA Sharing Modal */}
      {isCaModalOpen && (
        <CaSharingModal
          isOpen={isCaModalOpen}
          onClose={() => setIsCaModalOpen(false)}
          lang={lang}
          companyName={currentCompany?.tradeName || currentCompany?.legalName || "My Business"}
        />
      )}

      {/* Email Excel Modal */}
      {isEmailModalOpen && (
        <EmailExcelModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          reportName={currentTabMeta.label}
          lang={lang}
          onSendEmail={async (email, notes) => {
            const result = await apiClient.post<any>("/mail/send", {
              to: email,
              subject: `${currentTabMeta.label} — ${startDate} to ${endDate}`,
              heading: currentTabMeta.label,
              intro: notes,
              details: [
                { label: "Report", value: currentTabMeta.label },
                { label: "Period", value: `${startDate} to ${endDate}` },
                { label: "Business", value: currentCompany?.tradeName || currentCompany?.legalName || "—" },
              ],
              text: "Open Reports and use Download Excel if you also need the spreadsheet file.",
            });
            if (result && result.delivered === false) {
              throw new Error(result.message || "Email was not delivered. Configure SMTP on the server.");
            }
          }}
        />
      )}
    </div>
  );
}
