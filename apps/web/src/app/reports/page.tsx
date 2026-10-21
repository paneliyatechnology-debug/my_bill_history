"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/auth-context";
import { apiClient } from "../../lib/api-client";
import { StatusBadge } from "../../components/ui/badge";
import { ReportEmptyState } from "../../components/ui/report-empty-state";
import { ReportsDashboard } from "./components/reports-dashboard";
import { CaSharingModal } from "./components/ca-sharing-modal";
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
  | "hsn-sales-summary";

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
            className="px-2 py-1 rounded-lg border border-[#E5E7EB] bg-slate-50 text-[#202124] font-semibold text-xs focus:ring-1 focus:ring-[#F47721] cursor-pointer"
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
                      ? "bg-[#F47721] text-white shadow-2xs"
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

export default function ReportsPage() {
  const { lang, tenantContext, currentFY, currentCompany } = useAuth();
  const [viewMode, setViewMode] = useState<"dashboard" | "report">("dashboard");
  const [isCaModalOpen, setIsCaModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ReportTab>("sales-register");
  const [startDate, setStartDate] = useState(
    currentFY?.startDate ? currentFY.startDate.split("T")[0] : "2026-04-01",
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );

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
    if (currentFY?.startDate) {
      setStartDate(currentFY.startDate.split("T")[0]);
    }
  }, [currentFY?.startDate]);

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
          {/* 1. Header with back button, dropdown switcher, CA share & Export */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E7EB] shadow-subtle">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={handleBackToDashboard}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-[#F47721] px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-orange-50 border border-slate-200 transition-colors shadow-2xs active:scale-95"
                >
                  <span>←</span>
                  <span>{lang === "gu" ? "પાછા અહેવાલો પર" : "Reports Dashboard"}</span>
                </button>
                <span className="text-xs text-slate-300">/</span>
                <span className="text-xs font-semibold text-slate-500">
                  {lang === "gu" ? currentTabMeta.labelGu : currentTabMeta.label}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-2xl p-2 rounded-xl bg-orange-50 border border-orange-100 shrink-0">
                  {currentTabMeta.icon}
                </span>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-[#202124] tracking-tight leading-tight">
                    {lang === "gu" ? currentTabMeta.labelGu : currentTabMeta.label}
                  </h1>
                  <p className="text-xs text-[#667085] mt-0.5">
                    {lang === "gu"
                      ? "ભારતીય જીએસટી અને નામા પદ્ધતિ મુજબ પ્રમાણિત રિપોર્ટ"
                      : "Authoritative financial statements, statutory tax schedules & ledger aggregates"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Quick Switch Dropdown */}
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as ReportTab)}
                className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#F47721]/30 cursor-pointer"
              >
                {tabs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.icon} {lang === "gu" ? t.labelGu : t.label}
                  </option>
                ))}
              </select>

              {/* CA Sharing Button */}
              <button
                type="button"
                onClick={() => setIsCaModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
              >
                <span>💼</span>
                <span>{lang === "gu" ? "CA શેરિંગ" : "CA Reports Sharing"}</span>
              </button>

              {/* Export Dropdown (Excel .xlsx, CSV, PDF) */}
              <ExportDropdown
                onExport={handleExportReport}
                disabled={!reportData || isLoading}
                lang={lang}
                themeColor="saffron"
              />
            </div>
          </div>

          {/* 2. Responsive Filter Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E5E7EB] shadow-subtle flex flex-col lg:flex-row lg:items-end justify-between gap-4 w-full min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-end gap-3 w-full lg:w-auto flex-1 min-w-0">
              <div className="w-full sm:w-auto flex-1 min-w-[140px]">
                <label className="block text-[11px] font-bold text-[#667085] uppercase tracking-wider mb-1">
                  {lang === "gu" ? "શરૂઆત તારીખ" : "Start Date"}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg font-mono text-[#202124] focus:bg-white focus:ring-1 focus:ring-[#F47721] focus:border-[#F47721]"
                />
              </div>

              <div className="w-full sm:w-auto flex-1 min-w-[140px]">
                <label className="block text-[11px] font-bold text-[#667085] uppercase tracking-wider mb-1">
                  {lang === "gu" ? "અંતિમ તારીખ" : "End / As Of Date"}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg font-mono text-[#202124] focus:bg-white focus:ring-1 focus:ring-[#F47721] focus:border-[#F47721]"
                />
              </div>

              {/* Contextual filter: Party Selector for party-ledger */}
              {activeTab === "party-ledger" && (
                <div className="w-full sm:w-auto flex-1 min-w-[200px]">
                  <label className="block text-[11px] font-bold text-[#667085] uppercase tracking-wider mb-1">
                    {lang === "gu" ? "પાર્ટી પસંદ કરો" : "Select Party"}
                  </label>
                  <select
                    value={selectedPartyId}
                    onChange={(e) => setSelectedPartyId(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg text-[#202124] focus:bg-white focus:ring-1 focus:ring-[#F47721]"
                  >
                    {partiesList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {lang === "gu" && p.nameGujarati ? p.nameGujarati : p.name} ({p.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Contextual filter: Party Type for outstanding balances */}
              {activeTab === "outstanding" && (
                <div className="w-full sm:w-auto flex-1 min-w-[160px]">
                  <label className="block text-[11px] font-bold text-[#667085] uppercase tracking-wider mb-1">
                    {lang === "gu" ? "પાર્ટી પ્રકાર" : "Party Type"}
                  </label>
                  <select
                    value={outstandingPartyFilter}
                    onChange={(e) => setOutstandingPartyFilter(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg text-[#202124] focus:bg-white focus:ring-1 focus:ring-[#F47721]"
                  >
                    <option value="ALL">{lang === "gu" ? "તમામ (લેણાં & દેવાં)" : "All (Debtors & Creditors)"}</option>
                    <option value="CUSTOMER">{lang === "gu" ? "માત્ર ગ્રાહકો (Debtors)" : "Customers Only (Debtors)"}</option>
                    <option value="SUPPLIER">{lang === "gu" ? "માત્ર વેપારીઓ (Creditors)" : "Suppliers Only (Creditors)"}</option>
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0">
                <button
                  type="button"
                  onClick={handleResetDates}
                  className="px-3 py-2 text-xs font-semibold text-[#667085] hover:text-[#202124] hover:bg-[#F8F9FB] rounded-lg border border-[#E5E7EB] transition-colors"
                >
                  {lang === "gu" ? "તારીખ રીસેટ" : "Reset Dates"}
                </button>
                <button
                  type="button"
                  onClick={fetchReport}
                  disabled={isLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#F47721] hover:bg-orange-600 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <span>🔍</span>
                  <span>{lang === "gu" ? "ફિલ્ટર લાગુ કરો" : "Apply Date Filters"}</span>
                </button>
              </div>
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

          {/* 3. Report Content Section (NOTICE: Horizontal tabs strip removed per user instruction!) */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-subtle p-4 sm:p-6 w-full min-w-0 max-w-full min-h-[350px]">
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
                <div className="inline-block w-9 h-9 border-3 border-[#F47721] border-t-transparent rounded-full animate-spin mb-3" />
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
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg min-w-0">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block truncate">Total Invoices</span>
                    <p className="font-mono font-bold text-base sm:text-lg text-[#202124] truncate">
                      {reportData.summary?.totalInvoices || reportData.totalCount || 0}
                    </p>
                  </div>
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg min-w-0">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block truncate">Taxable Amount</span>
                    <p className="font-mono font-bold text-base sm:text-lg text-[#202124] truncate">
                      ₹{Number(reportData.summary?.totalTaxable ?? reportData.summary?.totalTaxableAmount ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg min-w-0">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block truncate">Total GST Tax</span>
                    <p className="font-mono font-bold text-base sm:text-lg text-[#202124] truncate">
                      ₹{(
                        Number(reportData.summary?.totalCgst || 0) +
                        Number(reportData.summary?.totalSgst || 0) +
                        Number(reportData.summary?.totalIgst || 0)
                      ).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3.5 bg-[#EAF7EF] border border-[#A6E9C5] rounded-lg min-w-0">
                    <span className="text-[10px] text-[#16834A] uppercase font-bold block truncate">Total Sales</span>
                    <p className="font-mono font-bold text-base sm:text-lg text-[#16834A] truncate">
                      ₹{Number(reportData.summary?.totalGrandTotal || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                {(() => {
                  const invoicesList = reportData.items || reportData.invoices || [];
                  if (invoicesList.length === 0) {
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
                  const { paginatedList, safePage, totalEntries } = paginateList(invoicesList);
                  return (
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden w-full max-w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
                              <th className="py-2.5 px-3">Invoice No</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Party Name</th>
                              <th className="py-2.5 px-3">GSTIN</th>
                              <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                              <th className="py-2.5 px-3 text-right">CGST</th>
                              <th className="py-2.5 px-3 text-right">SGST</th>
                              <th className="py-2.5 px-3 text-right">IGST</th>
                              <th className="py-2.5 px-3 text-right">Total (₹)</th>
                              <th className="py-2.5 px-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E7EB]">
                            {paginatedList.map((inv: any) => (
                              <tr key={inv.id} className="hover:bg-[#FFFAF5] transition-colors">
                                <td className="py-2.5 px-3 font-mono font-bold text-[#202124]">{inv.invoiceNumber}</td>
                                <td className="py-2.5 px-3 font-mono text-[#667085]">
                                  {new Date(inv.invoiceDate).toLocaleDateString("en-IN")}
                                </td>
                                <td className="py-2.5 px-3 font-medium text-[#202124]">
                                  {inv.partyName || inv.party?.name || "Cash Sale"}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-[#667085]">
                                  {inv.partyGstin || inv.party?.gstin || "—"}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono">₹{Number(inv.taxableAmount || 0).toFixed(2)}</td>
                                <td className="py-2.5 px-3 text-right font-mono">₹{Number(inv.cgstAmount || 0).toFixed(2)}</td>
                                <td className="py-2.5 px-3 text-right font-mono">₹{Number(inv.sgstAmount || 0).toFixed(2)}</td>
                                <td className="py-2.5 px-3 text-right font-mono">₹{Number(inv.igstAmount || 0).toFixed(2)}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-[#202124]">
                                  ₹{Number(inv.grandTotal || 0).toFixed(2)}
                                </td>
                                <td className="py-2.5 px-3">
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
              /* Bill Wise Profit & Margin */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Total Revenue</span>
                    <p className="font-mono font-bold text-lg text-[#202124]">₹{Number(reportData.summary?.totalRevenue || 0).toFixed(2)}</p>
                  </div>
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg">
                    <span className="text-[10px] text-rose-700 uppercase font-bold block">Cost of Goods (COGS)</span>
                    <p className="font-mono font-bold text-lg text-rose-900">₹{Number(reportData.summary?.totalCogs || 0).toFixed(2)}</p>
                  </div>
                  <div className="p-3.5 bg-[#EAF7EF] border border-[#A6E9C5] rounded-lg">
                    <span className="text-[10px] text-[#16834A] uppercase font-bold block">Gross Profit</span>
                    <p className="font-mono font-bold text-lg text-[#16834A]">₹{Number(reportData.summary?.totalGrossProfit || 0).toFixed(2)}</p>
                  </div>
                  <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <span className="text-[10px] text-indigo-700 uppercase font-bold block">Average Margin %</span>
                    <p className="font-mono font-bold text-lg text-indigo-900">{reportData.summary?.avgMarginPercentage || "0.00"}%</p>
                  </div>
                </div>

                {(() => {
                  const invoices = reportData.invoices || [];
                  const { paginatedList, safePage, totalEntries } = paginateList(invoices);
                  return (
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
                              <th className="py-2.5 px-3">Invoice No</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Party Name</th>
                              <th className="py-2.5 px-3 text-right">Invoice Total (₹)</th>
                              <th className="py-2.5 px-3 text-right">Item Cost / COGS (₹)</th>
                              <th className="py-2.5 px-3 text-right">Gross Profit (₹)</th>
                              <th className="py-2.5 px-3 text-right">Margin (%)</th>
                              <th className="py-2.5 px-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E7EB]">
                            {paginatedList.map((inv: any) => (
                              <tr key={inv.id} className="hover:bg-[#FFFAF5] transition-colors">
                                <td className="py-2.5 px-3 font-mono font-bold text-[#202124]">{inv.invoiceNumber}</td>
                                <td className="py-2.5 px-3 font-mono text-[#667085]">{inv.invoiceDate}</td>
                                <td className="py-2.5 px-3 font-medium text-[#202124]">{inv.partyName}</td>
                                <td className="py-2.5 px-3 text-right font-mono">₹{inv.invoiceTotal}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-rose-700">₹{inv.costOfGoodsSold}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">₹{inv.grossProfit}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700">{inv.marginPercentage}%</td>
                                <td className="py-2.5 px-3"><StatusBadge status={inv.status} /></td>
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
            ) : activeTab === "item-sales-report" ? (
              /* Item Wise Sales */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Unique Items</span>
                    <p className="font-mono font-bold text-lg text-[#202124]">{reportData.summary?.totalUniqueItems || 0}</p>
                  </div>
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Total Qty Sold</span>
                    <p className="font-mono font-bold text-lg text-[#202124]">{reportData.summary?.totalQuantity || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Total Tax (₹)</span>
                    <p className="font-mono font-bold text-lg text-[#202124]">₹{reportData.summary?.totalTax || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-[#EAF7EF] border border-[#A6E9C5] rounded-lg">
                    <span className="text-[10px] text-[#16834A] uppercase font-bold block">Total Sales (₹)</span>
                    <p className="font-mono font-bold text-lg text-[#16834A]">₹{reportData.summary?.totalSales || "0.00"}</p>
                  </div>
                </div>

                {(() => {
                  const items = reportData.items || [];
                  const { paginatedList, safePage, totalEntries } = paginateList(items);
                  return (
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
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
                          <tbody className="divide-y divide-[#E5E7EB]">
                            {paginatedList.map((it: any) => (
                              <tr key={it.itemId} className="hover:bg-[#FFFAF5] transition-colors">
                                <td className="py-2.5 px-3 font-semibold text-[#202124]">{it.itemName}</td>
                                <td className="py-2.5 px-3 font-mono text-[#667085]">{it.itemCode} / {it.hsnCode}</td>
                                <td className="py-2.5 px-3 text-[#667085]">{it.category}</td>
                                <td className="py-2.5 px-3 font-mono">{it.uom}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold">{it.totalQuantity}</td>
                                <td className="py-2.5 px-3 text-right font-mono">₹{it.avgRate}</td>
                                <td className="py-2.5 px-3 text-right font-mono">₹{it.totalTaxable}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-[#16834A]">₹{it.totalSales}</td>
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
            ) : activeTab === "party-sales-report" ? (
              /* Party Wise Sales */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Total Parties</span>
                    <p className="font-mono font-bold text-lg text-[#202124]">{reportData.summary?.totalParties || 0}</p>
                  </div>
                  <div className="p-3.5 bg-[#EAF7EF] border border-[#A6E9C5] rounded-lg">
                    <span className="text-[10px] text-[#16834A] uppercase font-bold block">Total Sales</span>
                    <p className="font-mono font-bold text-lg text-[#16834A]">₹{reportData.summary?.totalSales || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Total Paid</span>
                    <p className="font-mono font-bold text-lg text-[#202124]">₹{reportData.summary?.totalPaid || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg">
                    <span className="text-[10px] text-rose-700 uppercase font-bold block">Balance Due</span>
                    <p className="font-mono font-bold text-lg text-rose-900">₹{reportData.summary?.totalBalance || "0.00"}</p>
                  </div>
                </div>

                {(() => {
                  const parties = reportData.parties || [];
                  const { paginatedList, safePage, totalEntries } = paginateList(parties);
                  return (
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
                              <th className="py-2.5 px-3">Party Name</th>
                              <th className="py-2.5 px-3">Phone</th>
                              <th className="py-2.5 px-3">GSTIN</th>
                              <th className="py-2.5 px-3 text-right">Invoices</th>
                              <th className="py-2.5 px-3 text-right">Total Sales (₹)</th>
                              <th className="py-2.5 px-3 text-right">Paid Amount (₹)</th>
                              <th className="py-2.5 px-3 text-right">Balance Due (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E7EB]">
                            {paginatedList.map((p: any) => (
                              <tr key={p.partyId} className="hover:bg-[#FFFAF5] transition-colors">
                                <td className="py-2.5 px-3 font-semibold text-[#202124]">{p.partyName}</td>
                                <td className="py-2.5 px-3 font-mono text-[#667085]">{p.phone}</td>
                                <td className="py-2.5 px-3 font-mono text-[#667085]">{p.gstin}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold">{p.invoiceCount}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-[#16834A]">₹{p.totalSales}</td>
                                <td className="py-2.5 px-3 text-right font-mono">₹{p.totalPaid}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">₹{p.balanceDue}</td>
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
            ) : activeTab === "sales-returns" ? (
              /* Sales Returns */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Total Returns</span>
                    <p className="font-mono font-bold text-lg text-[#202124]">{reportData.summary?.totalReturns || 0}</p>
                  </div>
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg">
                    <span className="text-[10px] text-rose-700 uppercase font-bold block">Taxable Reversal</span>
                    <p className="font-mono font-bold text-lg text-rose-900">₹{reportData.summary?.totalTaxable || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Tax Reversal</span>
                    <p className="font-mono font-bold text-lg text-[#202124]">₹{reportData.summary?.totalTax || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="text-[10px] text-amber-800 uppercase font-bold block">Total Refund / Credit</span>
                    <p className="font-mono font-bold text-lg text-amber-900">₹{reportData.summary?.grandTotal || "0.00"}</p>
                  </div>
                </div>

                {(() => {
                  const returns = reportData.returns || [];
                  const { paginatedList, safePage, totalEntries } = paginateList(returns);
                  return (
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
                              <th className="py-2.5 px-3">Credit Note #</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Customer</th>
                              <th className="py-2.5 px-3">Reason</th>
                              <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                              <th className="py-2.5 px-3 text-right">Total Refund (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E7EB]">
                            {paginatedList.map((r: any) => (
                              <tr key={r.id} className="hover:bg-[#FFFAF5] transition-colors">
                                <td className="py-2.5 px-3 font-mono font-bold text-[#202124]">{r.creditNoteNumber}</td>
                                <td className="py-2.5 px-3 font-mono text-[#667085]">{r.returnDate}</td>
                                <td className="py-2.5 px-3 font-semibold text-[#202124]">{r.partyName}</td>
                                <td className="py-2.5 px-3 text-[#667085]">{r.reason}</td>
                                <td className="py-2.5 px-3 text-right font-mono">₹{r.taxableAmount}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">₹{r.grandTotal}</td>
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
            ) : activeTab === "quotations" ? (
              /* Quotations / Estimates */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Total Quotations</span>
                    <p className="font-mono font-bold text-lg text-[#202124]">{reportData.summary?.totalQuotations || 0}</p>
                  </div>
                  <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-[10px] text-blue-700 uppercase font-bold block">Pipeline Value</span>
                    <p className="font-mono font-bold text-lg text-blue-900">₹{reportData.summary?.totalValue || "0.00"}</p>
                  </div>
                </div>

                {(() => {
                  const quotations = reportData.quotations || [];
                  const { paginatedList, safePage, totalEntries } = paginateList(quotations);
                  return (
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
                              <th className="py-2.5 px-3">Quote / Estimate #</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Party Name</th>
                              <th className="py-2.5 px-3">Phone</th>
                              <th className="py-2.5 px-3 text-right">Total Amount (₹)</th>
                              <th className="py-2.5 px-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E7EB]">
                            {paginatedList.map((q: any) => (
                              <tr key={q.id} className="hover:bg-[#FFFAF5] transition-colors">
                                <td className="py-2.5 px-3 font-mono font-bold text-[#202124]">{q.quoteNumber}</td>
                                <td className="py-2.5 px-3 font-mono text-[#667085]">{q.date}</td>
                                <td className="py-2.5 px-3 font-semibold text-[#202124]">{q.partyName}</td>
                                <td className="py-2.5 px-3 font-mono text-[#667085]">{q.phone || "-"}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-[#16834A]">₹{q.totalAmount}</td>
                                <td className="py-2.5 px-3"><StatusBadge status={q.status} /></td>
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
            ) : activeTab === "delivery-challans" ? (
              /* Delivery Challans */
              <div className="space-y-6">
                <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg max-w-xs">
                  <span className="text-[10px] text-[#667085] uppercase font-semibold block">Total Challans Dispatched</span>
                  <p className="font-mono font-bold text-lg text-[#202124]">{reportData.summary?.totalChallans || 0}</p>
                </div>

                {(() => {
                  const challans = reportData.challans || [];
                  const { paginatedList, safePage, totalEntries } = paginateList(challans);
                  return (
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
                              <th className="py-2.5 px-3">Challan #</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Customer</th>
                              <th className="py-2.5 px-3">Phone</th>
                              <th className="py-2.5 px-3 text-right">Items Dispatched</th>
                              <th className="py-2.5 px-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E7EB]">
                            {paginatedList.map((c: any) => (
                              <tr key={c.id} className="hover:bg-[#FFFAF5] transition-colors">
                                <td className="py-2.5 px-3 font-mono font-bold text-[#202124]">{c.challanNumber}</td>
                                <td className="py-2.5 px-3 font-mono text-[#667085]">{c.date}</td>
                                <td className="py-2.5 px-3 font-semibold text-[#202124]">{c.partyName}</td>
                                <td className="py-2.5 px-3 font-mono text-[#667085]">{c.phone || "-"}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold">{c.itemsCount}</td>
                                <td className="py-2.5 px-3"><StatusBadge status={c.status} /></td>
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
            ) : activeTab === "purchase-register" || activeTab === "purchase-summary" ? (
              /* Purchase Register / Summary */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Total Bills</span>
                    <p className="font-mono font-bold text-lg text-[#202124]">{reportData.summary?.totalInvoices || reportData.items?.length || 0}</p>
                  </div>
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Taxable Amount</span>
                    <p className="font-mono font-bold text-lg text-[#202124]">₹{Number(reportData.summary?.totalTaxable || 0).toFixed(2)}</p>
                  </div>
                  <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-[10px] text-blue-700 uppercase font-bold block">Input Tax Credit (ITC)</span>
                    <p className="font-mono font-bold text-lg text-blue-900">
                      ₹{(Number(reportData.summary?.totalCgst || 0) + Number(reportData.summary?.totalSgst || 0) + Number(reportData.summary?.totalIgst || 0)).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3.5 bg-[#EAF7EF] border border-[#A6E9C5] rounded-lg">
                    <span className="text-[10px] text-[#16834A] uppercase font-bold block">Total Purchases</span>
                    <p className="font-mono font-bold text-lg text-[#16834A]">₹{Number(reportData.summary?.totalGrandTotal || 0).toFixed(2)}</p>
                  </div>
                </div>

                {(() => {
                  const bills = reportData.items || [];
                  const { paginatedList, safePage, totalEntries } = paginateList(bills);
                  return (
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
                              <th className="py-2.5 px-3">Bill No</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Supplier Name</th>
                              <th className="py-2.5 px-3">GSTIN</th>
                              <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                              <th className="py-2.5 px-3 text-right">Total (₹)</th>
                              <th className="py-2.5 px-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E7EB]">
                              {paginatedList.map((bill: any) => (
                              <tr key={bill.id} className="hover:bg-[#FFFAF5] transition-colors">
                                <td className="py-2.5 px-3 font-mono font-bold text-[#202124]">{bill.vendorInvoiceNumber || bill.billNumber || "—"}</td>
                                <td className="py-2.5 px-3 font-mono text-[#667085]">{bill.invoiceDate}</td>
                                <td className="py-2.5 px-3 font-medium text-[#202124]">{bill.supplierName || bill.party?.name}</td>
                                <td className="py-2.5 px-3 font-mono text-[#667085]">{bill.supplierGstin || bill.party?.gstin || "—"}</td>
                                <td className="py-2.5 px-3 text-right font-mono">₹{bill.taxableAmount}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-[#16834A]">₹{bill.grandTotal}</td>
                                <td className="py-2.5 px-3"><StatusBadge status={bill.status || "PAID"} /></td>
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
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Unique Items</span>
                    <p className="font-mono font-bold text-lg text-[#202124]">{reportData.summary?.totalUniqueItems || 0}</p>
                  </div>
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Total Inward Qty</span>
                    <p className="font-mono font-bold text-lg text-[#202124]">{reportData.summary?.totalQuantity || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-[#EAF7EF] border border-[#A6E9C5] rounded-lg">
                    <span className="text-[10px] text-[#16834A] uppercase font-bold block">Total Purchases (₹)</span>
                    <p className="font-mono font-bold text-lg text-[#16834A]">₹{reportData.summary?.totalPurchases || "0.00"}</p>
                  </div>
                </div>

                {(() => {
                  const items = reportData.items || [];
                  const { paginatedList, safePage, totalEntries } = paginateList(items);
                  return (
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
                              <th className="py-2.5 px-3">Item Name</th>
                              <th className="py-2.5 px-3">Code</th>
                              <th className="py-2.5 px-3">Category</th>
                              <th className="py-2.5 px-3">UOM</th>
                              <th className="py-2.5 px-3 text-right">Qty Purchased</th>
                              <th className="py-2.5 px-3 text-right">Avg Rate (₹)</th>
                              <th className="py-2.5 px-3 text-right">Total Purchases (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E7EB]">
                            {paginatedList.map((it: any) => (
                              <tr key={it.itemId} className="hover:bg-[#FFFAF5] transition-colors">
                                <td className="py-2.5 px-3 font-semibold text-[#202124]">{it.itemName}</td>
                                <td className="py-2.5 px-3 font-mono text-[#667085]">{it.itemCode}</td>
                                <td className="py-2.5 px-3 text-[#667085]">{it.category}</td>
                                <td className="py-2.5 px-3 font-mono">{it.uom}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold">{it.totalQuantity}</td>
                                <td className="py-2.5 px-3 text-right font-mono">₹{it.avgRate}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-[#16834A]">₹{it.totalPurchases}</td>
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
            ) : activeTab === "party-purchase-report" ? (
              /* Party Wise Purchase */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Total Suppliers</span>
                    <p className="font-mono font-bold text-lg text-[#202124]">{reportData.summary?.totalSuppliers || 0}</p>
                  </div>
                  <div className="p-3.5 bg-[#EAF7EF] border border-[#A6E9C5] rounded-lg">
                    <span className="text-[10px] text-[#16834A] uppercase font-bold block">Total Purchases</span>
                    <p className="font-mono font-bold text-lg text-[#16834A]">₹{reportData.summary?.totalPurchases || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Total Paid</span>
                    <p className="font-mono font-bold text-lg text-[#202124]">₹{reportData.summary?.totalPaid || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg">
                    <span className="text-[10px] text-rose-700 uppercase font-bold block">Balance Payable</span>
                    <p className="font-mono font-bold text-lg text-rose-900">₹{reportData.summary?.totalPayable || "0.00"}</p>
                  </div>
                </div>

                {(() => {
                  const parties = reportData.parties || [];
                  const { paginatedList, safePage, totalEntries } = paginateList(parties);
                  return (
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
                              <th className="py-2.5 px-3">Supplier Name</th>
                              <th className="py-2.5 px-3">Phone</th>
                              <th className="py-2.5 px-3">GSTIN</th>
                              <th className="py-2.5 px-3 text-right">Bills Count</th>
                              <th className="py-2.5 px-3 text-right">Purchases (₹)</th>
                              <th className="py-2.5 px-3 text-right">Paid (₹)</th>
                              <th className="py-2.5 px-3 text-right">Balance Payable (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E7EB]">
                            {paginatedList.map((p: any) => (
                              <tr key={p.partyId} className="hover:bg-[#FFFAF5] transition-colors">
                                <td className="py-2.5 px-3 font-semibold text-[#202124]">{p.partyName}</td>
                                <td className="py-2.5 px-3 font-mono text-[#667085]">{p.phone}</td>
                                <td className="py-2.5 px-3 font-mono text-[#667085]">{p.gstin}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold">{p.billCount}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-[#16834A]">₹{p.totalPurchases}</td>
                                <td className="py-2.5 px-3 text-right font-mono">₹{p.totalPaid}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">₹{p.balancePayable}</td>
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
            ) : activeTab === "purchase-returns" ? (
              /* Purchase Returns (Debit Notes) */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Total Returns</span>
                    <p className="font-mono font-bold text-lg text-[#202124]">{reportData.summary?.totalReturns || 0}</p>
                  </div>
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg">
                    <span className="text-[10px] text-rose-700 uppercase font-bold block">Taxable Reversal</span>
                    <p className="font-mono font-bold text-lg text-rose-900">₹{reportData.summary?.totalTaxable || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="text-[10px] text-amber-800 uppercase font-bold block">Total Debit Note Amount</span>
                    <p className="font-mono font-bold text-lg text-amber-900">₹{reportData.summary?.grandTotal || "0.00"}</p>
                  </div>
                </div>

                {(() => {
                  const returns = reportData.returns || [];
                  const { paginatedList, safePage, totalEntries } = paginateList(returns);
                  return (
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
                              <th className="py-2.5 px-3">Debit Note #</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Supplier Name</th>
                              <th className="py-2.5 px-3">Reason</th>
                              <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                              <th className="py-2.5 px-3 text-right">Debit Amount (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E7EB]">
                            {paginatedList.map((r: any) => (
                              <tr key={r.id} className="hover:bg-[#FFFAF5] transition-colors">
                                <td className="py-2.5 px-3 font-mono font-bold text-[#202124]">{r.debitNoteNumber || r.returnNumber}</td>
                                <td className="py-2.5 px-3 font-mono text-[#667085]">{r.returnDate}</td>
                                <td className="py-2.5 px-3 font-semibold text-[#202124]">{r.partyName}</td>
                                <td className="py-2.5 px-3 text-[#667085]">{r.reason}</td>
                                <td className="py-2.5 px-3 text-right font-mono">₹{r.taxableAmount}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700">₹{r.grandTotal}</td>
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
            ) : activeTab === "stock-summary" ? (
              /* Stock Summary */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Total Catalog Items</span>
                    <p className="font-mono font-bold text-lg text-[#202124]">{reportData.summary?.totalItems || 0}</p>
                  </div>
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg">
                    <span className="text-[10px] text-rose-700 uppercase font-bold block">Low Stock Items</span>
                    <p className="font-mono font-bold text-lg text-rose-900">{reportData.summary?.lowStockCount || 0}</p>
                  </div>
                  <div className="p-3.5 bg-[#EAF7EF] border border-[#A6E9C5] rounded-lg">
                    <span className="text-[10px] text-[#16834A] uppercase font-bold block">Total Stock Valuation</span>
                    <p className="font-mono font-bold text-lg text-[#16834A]">₹{Number(reportData.summary?.totalValuation || 0).toFixed(2)}</p>
                  </div>
                </div>

                {(() => {
                  const items = reportData.items || [];
                  const { paginatedList, safePage, totalEntries } = paginateList(items);
                  return (
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
                              <th className="py-2.5 px-3">Item Name</th>
                              <th className="py-2.5 px-3">SKU / Code</th>
                              <th className="py-2.5 px-3">Category</th>
                              <th className="py-2.5 px-3 text-right">Purchase Price (₹)</th>
                              <th className="py-2.5 px-3 text-right">Selling Price (₹)</th>
                              <th className="py-2.5 px-3 text-right">Stock Qty</th>
                              <th className="py-2.5 px-3 text-right">Stock Value (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E7EB]">
                            {paginatedList.map((it: any) => (
                              <tr key={it.id} className="hover:bg-[#FFFAF5] transition-colors">
                                <td className="py-2.5 px-3 font-semibold text-[#202124]">{it.name}</td>
                                <td className="py-2.5 px-3 font-mono text-[#667085]">{it.sku || it.itemCode || "—"}</td>
                                <td className="py-2.5 px-3 text-[#667085]">{it.category || "General"}</td>
                                <td className="py-2.5 px-3 text-right font-mono">₹{Number(it.purchaseRate || 0).toFixed(2)}</td>
                                <td className="py-2.5 px-3 text-right font-mono">₹{Number(it.retailPrice || 0).toFixed(2)}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-[#202124]">{it.currentStock} {it.uom}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-[#16834A]">₹{it.valuation}</td>
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
            ) : activeTab === "stock-movement" ? (
              /* Stock Movement */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Total Transactions</span>
                    <p className="font-mono font-bold text-lg text-[#202124]">{(reportData.transactions || []).length}</p>
                  </div>
                  <div className="p-3.5 bg-[#EAF7EF] border border-[#A6E9C5] rounded-lg">
                    <span className="text-[10px] text-[#16834A] uppercase font-bold block">Total Inward Qty</span>
                    <p className="font-mono font-bold text-lg text-[#16834A]">{reportData.totalInward || 0}</p>
                  </div>
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg">
                    <span className="text-[10px] text-rose-700 uppercase font-bold block">Total Outward Qty</span>
                    <p className="font-mono font-bold text-lg text-rose-900">{reportData.totalOutward || 0}</p>
                  </div>
                </div>

                {(() => {
                  const transactions = reportData.transactions || [];
                  const { paginatedList, safePage, totalEntries } = paginateList(transactions);
                  return (
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Document Type</th>
                              <th className="py-2.5 px-3">Item Name</th>
                              <th className="py-2.5 px-3">Godown / Warehouse</th>
                              <th className="py-2.5 px-3 text-right">Quantity</th>
                              <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                              <th className="py-2.5 px-3 text-right">Valuation (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E7EB]">
                            {paginatedList.map((t: any) => (
                              <tr key={t.id} className="hover:bg-[#FFFAF5] transition-colors">
                                <td className="py-2.5 px-3 font-mono text-[#667085]">{t.date ? String(t.date).slice(0, 10) : "—"}</td>
                                <td className="py-2.5 px-3 font-semibold text-[#202124]">{t.docType}</td>
                                <td className="py-2.5 px-3 font-semibold text-[#202124]">{t.item}</td>
                                <td className="py-2.5 px-3 text-[#667085]">{t.warehouse}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold">{t.quantity}</td>
                                <td className="py-2.5 px-3 text-right font-mono">₹{t.rate}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-[#16834A]">₹{t.valuation}</td>
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
            ) : activeTab === "item-batch-report" ? (
              /* Item Batch & Expiry */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Total Batches</span>
                    <p className="font-mono font-bold text-lg text-[#202124]">{reportData.summary?.totalBatches || 0}</p>
                  </div>
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="text-[10px] text-amber-800 uppercase font-bold block">Expiring Soon (30d)</span>
                    <p className="font-mono font-bold text-lg text-amber-900">{reportData.summary?.expiringSoonCount || 0}</p>
                  </div>
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg">
                    <span className="text-[10px] text-rose-700 uppercase font-bold block">Expired Batches</span>
                    <p className="font-mono font-bold text-lg text-rose-900">{reportData.summary?.expiredCount || 0}</p>
                  </div>
                </div>

                {(() => {
                  const batches = reportData.batches || [];
                  const { paginatedList, safePage, totalEntries } = paginateList(batches);
                  return (
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
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
                          <tbody className="divide-y divide-[#E5E7EB]">
                            {paginatedList.map((b: any) => (
                              <tr key={b.id} className="hover:bg-[#FFFAF5] transition-colors">
                                <td className="py-2.5 px-3 font-semibold text-[#202124]">{b.itemName}</td>
                                <td className="py-2.5 px-3 font-mono font-bold text-purple-700">{b.batchNumber}</td>
                                <td className="py-2.5 px-3 font-mono text-[#667085]">{b.mfgDate}</td>
                                <td className="py-2.5 px-3 font-mono text-[#667085]">{b.expiryDate}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold">
                                  {b.daysToExpiry !== null ? `${b.daysToExpiry}d` : "—"}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold">{b.currentStock} {b.uom}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-[#16834A]">₹{b.valuation}</td>
                                <td className="py-2.5 px-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    b.status === "EXPIRED" ? "bg-rose-100 text-rose-800" : b.status === "EXPIRING_SOON" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                                  }`}>
                                    {b.status}
                                  </span>
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
            ) : activeTab === "low-stock-alert" ? (
              /* Low Stock Alert */
              <div className="space-y-6">
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg max-w-xs">
                  <span className="text-[10px] text-rose-700 uppercase font-bold block">Items Below Reorder Level</span>
                  <p className="font-mono font-bold text-lg text-rose-900">{reportData.summary?.totalLowStockCount || 0}</p>
                </div>

                {(() => {
                  const items = reportData.items || [];
                  const { paginatedList, safePage, totalEntries } = paginateList(items);
                  return (
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
                              <th className="py-2.5 px-3">Item Name</th>
                              <th className="py-2.5 px-3">Category</th>
                              <th className="py-2.5 px-3 text-right">Current Stock</th>
                              <th className="py-2.5 px-3 text-right">Min Level</th>
                              <th className="py-2.5 px-3 text-right">Deficit</th>
                              <th className="py-2.5 px-3 text-right">Suggested Reorder</th>
                              <th className="py-2.5 px-3 text-right">Purchase Rate (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E7EB]">
                            {paginatedList.map((it: any) => (
                              <tr key={it.id} className="hover:bg-[#FFFAF5] transition-colors">
                                <td className="py-2.5 px-3 font-semibold text-[#202124]">{it.name}</td>
                                <td className="py-2.5 px-3 text-[#667085]">{it.category}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">{it.currentStock} {it.uom}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-[#667085]">{it.minStockLevel}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-800">{it.deficit}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700">{it.reorderQuantity}</td>
                                <td className="py-2.5 px-3 text-right font-mono">₹{it.purchaseRate}</td>
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
            ) : activeTab === "party-ledger" ? (
              /* Party Ledger */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Opening Balance</span>
                    <p className="font-mono font-bold text-base text-[#202124]">₹{reportData.summary?.openingBalance || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg">
                    <span className="text-[10px] text-rose-700 uppercase font-bold block">Total Debit (Udhar)</span>
                    <p className="font-mono font-bold text-base text-rose-900">₹{reportData.summary?.totalDebits || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-[#EAF7EF] border border-[#A6E9C5] rounded-lg">
                    <span className="text-[10px] text-[#16834A] uppercase font-bold block">Total Credit (Jama)</span>
                    <p className="font-mono font-bold text-base text-[#16834A]">₹{reportData.summary?.totalCredits || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <span className="text-[10px] text-indigo-700 uppercase font-bold block">Closing Balance</span>
                    <p className="font-mono font-bold text-base text-indigo-900">₹{reportData.summary?.closingBalance || "0.00"}</p>
                  </div>
                </div>

                {(() => {
                  const txns = reportData.transactions || reportData.entries || [];
                  const { paginatedList, safePage, totalEntries } = paginateList(txns);
                  return (
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Voucher Type</th>
                              <th className="py-2.5 px-3">Ref No</th>
                              <th className="py-2.5 px-3">Narration</th>
                              <th className="py-2.5 px-3 text-right">Debit (Dr)</th>
                              <th className="py-2.5 px-3 text-right">Credit (Cr)</th>
                              <th className="py-2.5 px-3 text-right">Running Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E7EB]">
                            {paginatedList.map((t: any, idx: number) => (
                              <tr key={idx} className="hover:bg-[#FFFAF5] transition-colors">
                                <td className="py-2.5 px-3 font-mono text-[#667085]">{t.date || t.voucherDate}</td>
                                <td className="py-2.5 px-3 font-semibold">{t.voucherType || t.type}</td>
                                <td className="py-2.5 px-3 font-mono text-purple-700">{t.refNo || t.voucherNumber}</td>
                                <td className="py-2.5 px-3 text-[#667085]">{t.narration || "—"}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-bold">{t.debit ? `₹${t.debit}` : "—"}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">{t.credit ? `₹${t.credit}` : "—"}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-[#202124]">₹{t.balance || t.runningBalance}</td>
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
                  <div className="p-3.5 bg-[#EAF7EF] border border-[#A6E9C5] rounded-lg">
                    <span className="text-[10px] text-[#16834A] uppercase font-bold block">Total Receivables</span>
                    <p className="font-mono font-bold text-lg text-[#16834A]">₹{reportData.summary?.totalReceivable || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Not Due</span>
                    <p className="font-mono font-bold text-lg text-[#202124]">₹{reportData.summary?.notDue || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="text-[10px] text-amber-800 uppercase font-bold block">0 - 30 Days Overdue</span>
                    <p className="font-mono font-bold text-lg text-amber-900">₹{reportData.summary?.overdue0to30 || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg">
                    <span className="text-[10px] text-rose-700 uppercase font-bold block">60+ Days Overdue</span>
                    <p className="font-mono font-bold text-lg text-rose-900">₹{reportData.summary?.overdue90Plus || "0.00"}</p>
                  </div>
                </div>

                {(() => {
                  const parties = reportData.parties || reportData.aging || [];
                  const { paginatedList, safePage, totalEntries } = paginateList(parties);
                  return (
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
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
                          <tbody className="divide-y divide-[#E5E7EB]">
                            {paginatedList.map((p: any) => (
                              <tr key={p.partyId} className="hover:bg-[#FFFAF5] transition-colors">
                                <td className="py-2.5 px-3 font-semibold text-[#202124]">{p.partyName}</td>
                                <td className="py-2.5 px-3 font-mono text-[#667085]">{p.phone || "—"}</td>
                                <td className="py-2.5 px-3 text-center font-mono">{p.creditDays || 0}</td>
                                <td className="py-2.5 px-3 text-right font-mono">₹{p.notDue}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-amber-700">₹{p.overdue0to30}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-orange-700">₹{p.overdue31to60}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-rose-600">₹{p.overdue61to90}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-800">₹{p.overdue90Plus}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-[#16834A]">₹{p.totalDue}</td>
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
            ) : activeTab === "outstanding" ? (
              /* Outstanding Balances */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Total Parties</span>
                    <p className="font-mono font-bold text-lg text-[#202124]">{reportData.summary?.totalParties || 0}</p>
                  </div>
                  <div className="p-3.5 bg-[#EAF7EF] border border-[#A6E9C5] rounded-lg">
                    <span className="text-[10px] text-[#16834A] uppercase font-bold block">Total Receivables (Debtors)</span>
                    <p className="font-mono font-bold text-lg text-[#16834A]">₹{reportData.summary?.totalReceivables || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg">
                    <span className="text-[10px] text-rose-700 uppercase font-bold block">Total Payables (Creditors)</span>
                    <p className="font-mono font-bold text-lg text-rose-900">₹{reportData.summary?.totalPayables || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <span className="text-[10px] text-indigo-700 uppercase font-bold block">Net Outstanding</span>
                    <p className="font-mono font-bold text-lg text-indigo-900">₹{reportData.summary?.netOutstanding || "0.00"}</p>
                  </div>
                </div>

                {(() => {
                  const items = reportData.items || [];
                  const { paginatedList, safePage, totalEntries } = paginateList(items);
                  return (
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
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
                          <tbody className="divide-y divide-[#E5E7EB]">
                            {paginatedList.map((b: any) => (
                              <tr key={b.partyId} className="hover:bg-[#FFFAF5] transition-colors">
                                <td className="py-2.5 px-3 font-semibold text-[#202124]">{b.name}</td>
                                <td className="py-2.5 px-3"><span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">{b.partyType}</span></td>
                                <td className="py-2.5 px-3 font-mono text-[#667085]">{b.phone || "—"}</td>
                                <td className="py-2.5 px-3 font-mono text-[#667085]">{b.gstin || "—"}</td>
                                <td className="py-2.5 px-3 text-right font-mono">{b.unpaidInvoicesCount}</td>
                                <td className="py-2.5 px-3 text-right font-mono">₹{b.salesOutstanding}</td>
                                <td className="py-2.5 px-3 text-right font-mono">₹{b.purchaseOutstanding}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">₹{b.ledgerBalance} <span className="text-[10px] font-normal text-[#667085]">{b.balanceType}</span></td>
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
            ) : activeTab === "profit-loss" ? (
              /* Profit & Loss */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-[#EAF7EF] border border-[#A6E9C5] rounded-lg">
                    <span className="text-[10px] text-[#16834A] uppercase font-bold block">Gross Profit</span>
                    <p className="font-mono font-bold text-lg text-[#16834A]">
                      ₹{Number(reportData.grossProfit ?? reportData.summary?.grossProfit ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3.5 bg-emerald-100 border border-emerald-300 rounded-lg">
                    <span className="text-[10px] text-emerald-800 uppercase font-bold block">Net Profit</span>
                    <p className="font-mono font-bold text-lg text-emerald-950">
                      ₹{Number(reportData.netProfit ?? reportData.summary?.netProfit ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Cost of Goods Sold</span>
                    <p className="font-mono font-bold text-lg text-[#202124]">
                      ₹{Number(reportData.tradingAccount?.costOfGoodsSold ?? reportData.costOfGoodsSold ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <span className="text-[10px] text-indigo-700 uppercase font-bold block">Closing Stock Valuation</span>
                    <p className="font-mono font-bold text-lg text-indigo-900">
                      ₹{Number(reportData.tradingAccount?.closingStockValuation ?? reportData.closingStockValuation ?? 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="border border-rose-200 rounded-xl p-4 bg-rose-50/30">
                    <div className="flex justify-between items-center pb-2 mb-3 border-b border-rose-200 font-bold text-rose-900 text-xs">
                      <span>EXPENSES (DEBIT)</span>
                      <span className="font-mono">₹{Number(reportData.summary?.totalExpenses ?? reportData.totalExpenses ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="space-y-3 text-xs">
                      <div>
                        <div className="flex justify-between font-semibold text-slate-800">
                          <span>Direct Expenses</span>
                          <span className="font-mono text-rose-700">
                            ₹{Number(reportData.directExpenses?.total ?? reportData.summary?.directExpenses ?? (typeof reportData.directExpenses === "number" ? reportData.directExpenses : 0)).toFixed(2)}
                          </span>
                        </div>
                        {Array.isArray(reportData.directExpenses?.accounts) && reportData.directExpenses.accounts.length > 0 && (
                          <div className="pl-3 mt-1 space-y-0.5 border-l-2 border-rose-200">
                            {reportData.directExpenses.accounts.map((acc: any) => (
                              <div key={acc.id || acc.name} className="flex justify-between text-[11px] text-[#667085]">
                                <span>{acc.name}</span>
                                <span className="font-mono">₹{Number(acc.amount || 0).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex justify-between font-semibold text-slate-800">
                          <span>Indirect Expenses</span>
                          <span className="font-mono text-rose-700">
                            ₹{Number(reportData.indirectExpenses?.total ?? reportData.summary?.indirectExpenses ?? (typeof reportData.indirectExpenses === "number" ? reportData.indirectExpenses : 0)).toFixed(2)}
                          </span>
                        </div>
                        {Array.isArray(reportData.indirectExpenses?.accounts) && reportData.indirectExpenses.accounts.length > 0 && (
                          <div className="pl-3 mt-1 space-y-0.5 border-l-2 border-rose-200">
                            {reportData.indirectExpenses.accounts.map((acc: any) => (
                              <div key={acc.id || acc.name} className="flex justify-between text-[11px] text-[#667085]">
                                <span>{acc.name}</span>
                                <span className="font-mono">₹{Number(acc.amount || 0).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50/30">
                    <div className="flex justify-between items-center pb-2 mb-3 border-b border-emerald-200 font-bold text-emerald-900 text-xs">
                      <span>INCOME (CREDIT)</span>
                      <span className="font-mono">₹{Number(reportData.summary?.totalIncome ?? reportData.totalIncome ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="space-y-3 text-xs">
                      <div>
                        <div className="flex justify-between font-semibold text-slate-800">
                          <span>Direct Income / Sales</span>
                          <span className="font-mono text-[#16834A]">
                            ₹{Number(reportData.directIncome?.total ?? reportData.summary?.directIncome ?? (typeof reportData.directIncome === "number" ? reportData.directIncome : 0)).toFixed(2)}
                          </span>
                        </div>
                        {Array.isArray(reportData.directIncome?.accounts) && reportData.directIncome.accounts.length > 0 && (
                          <div className="pl-3 mt-1 space-y-0.5 border-l-2 border-emerald-200">
                            {reportData.directIncome.accounts.map((acc: any) => (
                              <div key={acc.id || acc.name} className="flex justify-between text-[11px] text-[#667085]">
                                <span>{acc.name}</span>
                                <span className="font-mono">₹{Number(acc.amount || 0).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex justify-between font-semibold text-slate-800">
                          <span>Indirect Income</span>
                          <span className="font-mono text-[#16834A]">
                            ₹{Number(reportData.indirectIncome?.total ?? reportData.summary?.indirectIncome ?? (typeof reportData.indirectIncome === "number" ? reportData.indirectIncome : 0)).toFixed(2)}
                          </span>
                        </div>
                        {Array.isArray(reportData.indirectIncome?.accounts) && reportData.indirectIncome.accounts.length > 0 && (
                          <div className="pl-3 mt-1 space-y-0.5 border-l-2 border-emerald-200">
                            {reportData.indirectIncome.accounts.map((acc: any) => (
                              <div key={acc.id || acc.name} className="flex justify-between text-[11px] text-[#667085]">
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
              /* Balance Sheet */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-[10px] text-blue-800 uppercase font-bold block">Total Assets</span>
                    <p className="font-mono font-bold text-lg text-blue-900">
                      ₹{Number(reportData.assets?.total ?? reportData.totalAssets ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg">
                    <span className="text-[10px] text-rose-800 uppercase font-bold block">Total Liabilities</span>
                    <p className="font-mono font-bold text-lg text-rose-900">
                      ₹{Number(reportData.liabilities?.total ?? reportData.totalLiabilities ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <span className="text-[10px] text-emerald-800 uppercase font-bold block">Capital & Reserves</span>
                    <p className="font-mono font-bold text-lg text-emerald-900">
                      ₹{Number(reportData.equity?.total ?? reportData.capitalAndReserves ?? 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="border border-blue-200 rounded-xl p-4 bg-white">
                    <div className="flex justify-between items-center pb-2 mb-3 border-b border-blue-100 font-bold text-blue-900 text-xs uppercase">
                      <span>ASSETS</span>
                      <span className="font-mono">₹{Number(reportData.assets?.total ?? reportData.totalAssets ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      {Array.isArray(reportData.assets?.accounts) && reportData.assets.accounts.length > 0 ? (
                        reportData.assets.accounts.map((acc: any) => (
                          <div key={acc.id || acc.name} className="flex justify-between text-slate-700">
                            <span>{acc.name} <span className="text-[10px] text-[#98A2B3]">({acc.groupName})</span></span>
                            <span className="font-mono font-semibold">₹{Number(acc.amount || 0).toFixed(2)}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-400 italic">No asset ledger records found</div>
                      )}
                    </div>
                  </div>

                  <div className="border border-rose-200 rounded-xl p-4 bg-white">
                    <div className="flex justify-between items-center pb-2 mb-3 border-b border-rose-100 font-bold text-rose-900 text-xs uppercase">
                      <span>LIABILITIES & CAPITAL</span>
                      <span className="font-mono">₹{Number(reportData.liabilities?.total ?? reportData.totalLiabilities ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      {Array.isArray(reportData.liabilities?.accounts) && reportData.liabilities.accounts.length > 0 && (
                        reportData.liabilities.accounts.map((acc: any) => (
                          <div key={acc.id || acc.name} className="flex justify-between text-slate-700">
                            <span>{acc.name} <span className="text-[10px] text-[#98A2B3]">({acc.groupName})</span></span>
                            <span className="font-mono font-semibold">₹{Number(acc.amount || 0).toFixed(2)}</span>
                          </div>
                        ))
                      )}
                      {Array.isArray(reportData.equity?.accounts) && reportData.equity.accounts.length > 0 && (
                        reportData.equity.accounts.map((acc: any) => (
                          <div key={acc.id || acc.name} className="flex justify-between text-slate-700">
                            <span>{acc.name} <span className="text-[10px] text-emerald-600 font-bold">(Capital)</span></span>
                            <span className="font-mono font-semibold text-emerald-700">₹{Number(acc.amount || 0).toFixed(2)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === "expense-category" ? (
              /* Expense Category Report */
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 max-w-md">
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Expense Categories</span>
                    <p className="font-mono font-bold text-lg text-[#202124]">{reportData.summary?.totalCategories || 0}</p>
                  </div>
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg">
                    <span className="text-[10px] text-rose-700 uppercase font-bold block">Total Operating Expenses</span>
                    <p className="font-mono font-bold text-lg text-rose-900">₹{reportData.summary?.totalExpenseAmount || "0.00"}</p>
                  </div>
                </div>

                {(() => {
                  const categories = reportData.categories || [];
                  const { paginatedList, safePage, totalEntries } = paginateList(categories);
                  return (
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
                              <th className="py-2.5 px-3">Expense Category / Ledger</th>
                              <th className="py-2.5 px-3">Account Group</th>
                              <th className="py-2.5 px-3 text-right">Voucher Entries</th>
                              <th className="py-2.5 px-3 text-right">Total Amount (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E7EB]">
                            {paginatedList.map((c: any) => (
                              <tr key={c.id} className="hover:bg-[#FFFAF5] transition-colors">
                                <td className="py-2.5 px-3 font-semibold text-[#202124]">{c.categoryName}</td>
                                <td className="py-2.5 px-3 text-[#667085]">{c.groupName}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold">{c.voucherCount}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">₹{c.totalAmount}</td>
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
            ) : activeTab === "hsn-sales-summary" ? (
              /* HSN Summary */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Total HSN Codes</span>
                    <p className="font-mono font-bold text-lg text-[#202124]">{reportData.summary?.totalHsns || 0}</p>
                  </div>
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Total Qty Sold</span>
                    <p className="font-mono font-bold text-lg text-[#202124]">{reportData.summary?.totalQuantity || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Taxable Amount</span>
                    <p className="font-mono font-bold text-lg text-[#202124]">₹{reportData.summary?.totalTaxable || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-[#EAF7EF] border border-[#A6E9C5] rounded-lg">
                    <span className="text-[10px] text-[#16834A] uppercase font-bold block">Total Outward Value</span>
                    <p className="font-mono font-bold text-lg text-[#16834A]">₹{reportData.summary?.totalValue || "0.00"}</p>
                  </div>
                </div>

                {(() => {
                  const records = reportData.records || [];
                  const { paginatedList, safePage, totalEntries } = paginateList(records);
                  return (
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
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
                          <tbody className="divide-y divide-[#E5E7EB]">
                            {paginatedList.map((h: any) => (
                              <tr key={h.hsnCode} className="hover:bg-[#FFFAF5] transition-colors">
                                <td className="py-2.5 px-3 font-mono font-bold text-purple-700">{h.hsnCode}</td>
                                <td className="py-2.5 px-3 font-medium text-[#202124]">{h.description}</td>
                                <td className="py-2.5 px-3 font-mono">{h.uom}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold">{h.totalQuantity}</td>
                                <td className="py-2.5 px-3 text-right font-mono">₹{h.totalTaxable}</td>
                                <td className="py-2.5 px-3 text-right font-mono">₹{h.cgstAmount}</td>
                                <td className="py-2.5 px-3 text-right font-mono">₹{h.sgstAmount}</td>
                                <td className="py-2.5 px-3 text-right font-mono">₹{h.igstAmount}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-[#16834A]">₹{h.totalValue}</td>
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
            ) : activeTab === "receipt-payment" ? (
              /* Receipt & Payment Register (Cash & Bank Book) */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-[#EAF7EF] border border-[#A6E9C5] rounded-lg">
                    <span className="text-[10px] text-[#16834A] uppercase font-bold block">Total Receipts (Inflows)</span>
                    <p className="font-mono font-bold text-lg text-[#16834A]">₹{reportData.summary?.totalReceipts || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg">
                    <span className="text-[10px] text-rose-700 uppercase font-bold block">Total Payments (Outflows)</span>
                    <p className="font-mono font-bold text-lg text-rose-900">₹{reportData.summary?.totalPayments || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Total Contra</span>
                    <p className="font-mono font-bold text-lg text-[#202124]">₹{reportData.summary?.totalContra || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <span className="text-[10px] text-indigo-700 uppercase font-bold block">Net Cash Movement</span>
                    <p className="font-mono font-bold text-lg text-indigo-900">₹{reportData.summary?.netCashMovement || "0.00"}</p>
                  </div>
                </div>

                {(() => {
                  const items = reportData.items || [];
                  const { paginatedList, safePage, totalEntries } = paginateList(items);
                  return (
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
                              <th className="py-2.5 px-3">Voucher No</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Type</th>
                              <th className="py-2.5 px-3">Party / Ledger Account</th>
                              <th className="py-2.5 px-3">Bank / Cash Ledger</th>
                              <th className="py-2.5 px-3">Narration</th>
                              <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E7EB]">
                            {paginatedList.map((v: any) => (
                              <tr key={v.id || v.voucherNumber} className="hover:bg-[#FFFAF5] transition-colors">
                                <td className="py-2.5 px-3 font-mono font-semibold text-purple-700">{v.voucherNumber}</td>
                                <td className="py-2.5 px-3 font-mono text-[#667085]">{v.voucherDate}</td>
                                <td className="py-2.5 px-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    v.voucherType === "RECEIPT"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : v.voucherType === "PAYMENT"
                                      ? "bg-rose-100 text-rose-800"
                                      : "bg-blue-100 text-blue-800"
                                  }`}>
                                    {v.voucherType}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-[#202124]">{v.partyOrAccountName}</td>
                                <td className="py-2.5 px-3 font-mono text-[#667085]">{v.bankCashAccount}</td>
                                <td className="py-2.5 px-3 text-[#667085] max-w-xs truncate">{v.narration || "—"}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-[#202124]">₹{v.totalAmount}</td>
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
            ) : activeTab === "trial-balance" ? (
              /* Trial Balance */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Period Debits</span>
                    <p className="font-mono font-bold text-lg text-[#202124]">₹{reportData.totals?.totalPeriodDebit || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Period Credits</span>
                    <p className="font-mono font-bold text-lg text-[#202124]">₹{reportData.totals?.totalPeriodCredit || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-[#EAF7EF] border border-[#A6E9C5] rounded-lg">
                    <span className="text-[10px] text-[#16834A] uppercase font-bold block">Closing Debit Total</span>
                    <p className="font-mono font-bold text-lg text-[#16834A]">₹{reportData.totals?.totalClosingDebit || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-[#EAF7EF] border border-[#A6E9C5] rounded-lg">
                    <span className="text-[10px] text-[#16834A] uppercase font-bold block">Closing Credit Total</span>
                    <p className="font-mono font-bold text-lg text-[#16834A]">₹{reportData.totals?.totalClosingCredit || "0.00"}</p>
                  </div>
                </div>

                {(() => {
                  const accounts = reportData.accounts || [];
                  const { paginatedList, safePage, totalEntries } = paginateList(accounts);
                  return (
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
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
                          <tbody className="divide-y divide-[#E5E7EB]">
                            {paginatedList.map((a: any) => (
                              <tr key={a.accountCode || a.accountName} className="hover:bg-[#FFFAF5] transition-colors">
                                <td className="py-2.5 px-3 font-mono text-[#667085]">{a.accountCode || "—"}</td>
                                <td className="py-2.5 px-3 font-semibold text-[#202124]">{a.accountName}</td>
                                <td className="py-2.5 px-3 text-[#667085]">{a.groupName}</td>
                                <td className="py-2.5 px-3">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                                    {a.nature}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono">₹{a.periodDebit}</td>
                                <td className="py-2.5 px-3 text-right font-mono">₹{a.periodCredit}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">₹{a.closingDebit}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">₹{a.closingCredit}</td>
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
            ) : activeTab === "daybook" ? (
              /* Daybook (Rojmel) */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Opening Cash Balance</span>
                    <p className="font-mono font-bold text-lg text-[#202124]">₹{reportData.openingCashBalance || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg">
                    <span className="text-[10px] text-rose-700 uppercase font-bold block">Total Udhar (Outflow)</span>
                    <p className="font-mono font-bold text-lg text-rose-900">₹{reportData.totalUdhar || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-[#EAF7EF] border border-[#A6E9C5] rounded-lg">
                    <span className="text-[10px] text-[#16834A] uppercase font-bold block">Total Jama (Inflow)</span>
                    <p className="font-mono font-bold text-lg text-[#16834A]">₹{reportData.totalJama || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-lg">
                    <span className="text-[10px] text-emerald-800 uppercase font-bold block">Closing Cash Balance</span>
                    <p className="font-mono font-bold text-lg text-emerald-950">₹{reportData.closingCashBalance || "0.00"}</p>
                  </div>
                </div>

                {(() => {
                  const entries = reportData.entries || [];
                  const { paginatedList, safePage, totalEntries } = paginateList(entries);
                  return (
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
                              <th className="py-2.5 px-3">Voucher No</th>
                              <th className="py-2.5 px-3">Type</th>
                              <th className="py-2.5 px-3">Narration</th>
                              <th className="py-2.5 px-3 text-right">Debit / Udhar (₹)</th>
                              <th className="py-2.5 px-3 text-right">Credit / Jama (₹)</th>
                              <th className="py-2.5 px-3 text-center">Effect</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E7EB]">
                            {paginatedList.map((e: any, idx: number) => (
                              <tr key={idx} className="hover:bg-[#FFFAF5] transition-colors">
                                <td className="py-2.5 px-3 font-mono font-semibold text-purple-700">{e.voucherNumber}</td>
                                <td className="py-2.5 px-3 font-mono text-[#667085]">{e.voucherType}</td>
                                <td className="py-2.5 px-3 text-[#202124]">{e.narration || "—"}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-semibold">{Number(e.debit) > 0 ? `₹${e.debit}` : "—"}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-semibold">{Number(e.credit) > 0 ? `₹${e.credit}` : "—"}</td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    e.type === "JAMA" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                  }`}>
                                    {e.type}
                                  </span>
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
            ) : activeTab === "cash-flow" ? (
              /* Cash Flow Statement */
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block">Opening Cash & Bank</span>
                    <p className="font-mono font-bold text-lg text-[#202124]">₹{reportData.openingCashAndBank || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-[#EAF7EF] border border-[#A6E9C5] rounded-lg">
                    <span className="text-[10px] text-[#16834A] uppercase font-bold block">Net Operating Cash</span>
                    <p className="font-mono font-bold text-lg text-[#16834A]">₹{reportData.operatingActivities?.netOperatingCashFlow || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-[10px] text-blue-700 uppercase font-bold block">Net Investing & Financing</span>
                    <p className="font-mono font-bold text-lg text-blue-900">
                      ₹{(Number(reportData.investingActivities?.netInvestingCashFlow || 0) + Number(reportData.financingActivities?.netFinancingCashFlow || 0)).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-lg">
                    <span className="text-[10px] text-emerald-800 uppercase font-bold block">Closing Cash & Bank</span>
                    <p className="font-mono font-bold text-lg text-emerald-950">₹{reportData.closingCashAndBank || "0.00"}</p>
                  </div>
                </div>

                <div className="border border-[#E5E7EB] rounded-xl overflow-x-auto w-full">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
                        <th className="py-2.5 px-3">Activity Classification</th>
                        <th className="py-2.5 px-3">Particulars / Source</th>
                        <th className="py-2.5 px-3 text-right">Inflow / (Outflow) (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      <tr className="bg-slate-50 font-bold text-slate-800">
                        <td colSpan={2} className="py-2 px-3">1. CASH FLOW FROM OPERATING ACTIVITIES</td>
                        <td className="py-2 px-3 text-right font-mono">₹{reportData.operatingActivities?.netOperatingCashFlow}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-600 pl-6">Inflow</td>
                        <td className="py-2 px-3 text-slate-700">Receipts from Customers & Sales</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-700 font-semibold">₹{reportData.operatingActivities?.inflows?.totalInflows || "0.00"}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-600 pl-6">Outflow</td>
                        <td className="py-2 px-3 text-slate-700">Payments to Suppliers & Operating Expenses</td>
                        <td className="py-2 px-3 text-right font-mono text-rose-700 font-semibold">(₹{reportData.operatingActivities?.outflows?.totalOutflows || "0.00"})</td>
                      </tr>

                      <tr className="bg-slate-50 font-bold text-slate-800">
                        <td colSpan={2} className="py-2 px-3">2. CASH FLOW FROM INVESTING ACTIVITIES</td>
                        <td className="py-2 px-3 text-right font-mono">₹{reportData.investingActivities?.netInvestingCashFlow || "0.00"}</td>
                      </tr>

                      <tr className="bg-slate-50 font-bold text-slate-800">
                        <td colSpan={2} className="py-2 px-3">3. CASH FLOW FROM FINANCING ACTIVITIES</td>
                        <td className="py-2 px-3 text-right font-mono">₹{reportData.financingActivities?.netFinancingCashFlow || "0.00"}</td>
                      </tr>

                      <tr className="bg-emerald-50 font-bold text-emerald-900 border-t-2 border-emerald-300">
                        <td colSpan={2} className="py-2.5 px-3">NET INCREASE / (DECREASE) IN CASH & CASH EQUIVALENTS</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-sm">₹{reportData.netChangeInCashAndBank || "0.00"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeTab === "audit-trail" ? (
              /* Audit Trail */
              <div className="space-y-6">
                <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg max-w-xs">
                  <span className="text-[10px] text-[#667085] uppercase font-semibold block">Total Security Audit Events</span>
                  <p className="font-mono font-bold text-lg text-[#202124]">{reportData.summary?.totalLogs || 0}</p>
                </div>

                {(() => {
                  const logs = reportData.logs || [];
                  const { paginatedList, safePage, totalEntries } = paginateList(logs);
                  return (
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden w-full shadow-2xs bg-white">
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
                              <th className="py-2.5 px-3">Timestamp</th>
                              <th className="py-2.5 px-3">User / Performed By</th>
                              <th className="py-2.5 px-3">Action</th>
                              <th className="py-2.5 px-3">Module / Entity</th>
                              <th className="py-2.5 px-3">Reference ID</th>
                              <th className="py-2.5 px-3">IP Address</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E7EB]">
                            {paginatedList.map((l: any) => (
                              <tr key={l.id} className="hover:bg-[#FFFAF5] transition-colors">
                                <td className="py-2.5 px-3 font-mono text-[#667085]">{new Date(l.timestamp).toLocaleString("en-IN")}</td>
                                <td className="py-2.5 px-3 font-semibold text-[#202124]">{l.userName || "System"}</td>
                                <td className="py-2.5 px-3">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800">
                                    {l.action}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-mono text-slate-700">{l.entityName}</td>
                                <td className="py-2.5 px-3 font-mono text-[#667085]">{l.entityId}</td>
                                <td className="py-2.5 px-3 font-mono text-[#667085]">{l.ipAddress || "—"}</td>
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
            ) : activeTab === "gstr-1" ? (
              /* GSTR-1 Return Preparation & Statutory Outward Supplies (Matching Video UI) */
              <div className="space-y-6">
                {/* 1. Statutory Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg min-w-0">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block truncate">
                      {lang === "gu" ? "કુલ ઇનવોઇસ" : "Total Invoices"}
                    </span>
                    <p className="font-mono font-bold text-base sm:text-lg text-[#202124] truncate">
                      {reportData.summary?.totalInvoices ?? reportData.salesInvoices?.length ?? 0}
                    </p>
                  </div>
                  <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg min-w-0">
                    <span className="text-[10px] text-[#667085] uppercase font-semibold block truncate">
                      {lang === "gu" ? "કરપાત્ર કિંમત" : "Taxable Value"}
                    </span>
                    <p className="font-mono font-bold text-base sm:text-lg text-[#202124] truncate">
                      ₹{Number(reportData.summary?.totalTaxable ?? reportData.totalTaxable ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-lg min-w-0">
                    <span className="text-[10px] text-purple-700 uppercase font-bold block truncate">
                      {lang === "gu" ? "કુલ જીએસટી કર" : "Total GST Tax"}
                    </span>
                    <p className="font-mono font-bold text-base sm:text-lg text-purple-900 truncate">
                      ₹{Number(reportData.summary?.totalTax ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <span className="text-[10px] text-purple-600 font-mono block mt-0.5 truncate">
                      C: ₹{Number(reportData.summary?.totalCgst ?? reportData.totalCgst ?? 0).toFixed(2)} | S: ₹{Number(reportData.summary?.totalSgst ?? reportData.totalSgst ?? 0).toFixed(2)} | I: ₹{Number(reportData.summary?.totalIgst ?? reportData.totalIgst ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="p-3.5 bg-[#EAF7EF] border border-[#A6E9C5] rounded-lg min-w-0">
                    <span className="text-[10px] text-[#16834A] uppercase font-bold block truncate">
                      {lang === "gu" ? "કુલ ટર્નઓવર" : "Gross Turnover"}
                    </span>
                    <p className="font-mono font-bold text-base sm:text-lg text-[#16834A] truncate">
                      ₹{Number(reportData.summary?.grossTurnover ?? reportData.grossTurnover ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* 2. Subtabs Navigation */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7EB] pb-2">
                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setGstr1SubTab("sales");
                        setGstr1Page(1);
                      }}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                        gstr1SubTab === "sales"
                          ? "bg-[#F47721] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      <span>📑 {lang === "gu" ? "વેચાણ" : "Sales"}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        gstr1SubTab === "sales" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
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
                          ? "bg-[#F47721] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      <span>↩️ {lang === "gu" ? "વેચાણ પરત / ક્રેડિટ નોટ" : "Sales Return / Credit Note"}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        gstr1SubTab === "credit-notes" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
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
                          ? "bg-[#F47721] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      <span>↪️ {lang === "gu" ? "ખરીદ પરત / ડેબિટ નોટ" : "Purchase Return / Debit Note"}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        gstr1SubTab === "debit-notes" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                      }`}>
                        {reportData.debitNotes?.length || 0}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 3. Statutory Two-Tier Table Matching Video with Paginated Slices */}
                {gstr1SubTab === "sales" ? (
                  (() => {
                    const rows = reportData.salesInvoices || [];
                    if (rows.length === 0) {
                      return (
                        <ReportEmptyState
                          title="No sales invoices found for this period"
                          titleGu="આ સમયગાળા માટે કોઈ વેચાણ ઇનવોઇસ મળ્યા નથી"
                          description="Change the date range or create sales invoices to view GSTR-1 outward supplies."
                          descriptionGu="તારીખ બદલો અથવા જીએસટીઆર-૧ વેચાણ જોવા માટે નવા બિલ બનાવો."
                          secondaryAction={{ label: "Reset Date Range", onClick: handleResetDates }}
                          lang={lang}
                        />
                      );
                    }

                    // Compute totals across ALL records
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
                      <div className="border border-[#E5E7EB] rounded-xl overflow-hidden w-full max-w-full shadow-2xs bg-white">
                        <div className="overflow-x-auto w-full">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              {/* Group Header Tier 1 */}
                              <tr className="bg-[#F1F3F7] border-b border-[#DDE1E8] text-[#4B5563] text-[11px] font-bold">
                                <th colSpan={2} className="py-2 px-3 text-left border-r border-[#DDE1E8]">
                                  {lang === "gu" ? "ગ્રાહક વિગતો" : "Customer Details"}
                                </th>
                                <th colSpan={2} className="py-2 px-3 text-center border-r border-[#DDE1E8] bg-slate-100">
                                  {lang === "gu" ? "સપ્લાયનું સ્થળ" : "Place of Supply"}
                                </th>
                                <th colSpan={8} className="py-2 px-3 text-center bg-orange-50/60 text-[#C25409]">
                                  {lang === "gu" ? "ઇનવોઇસ અને કર વિગતો" : "Invoice & Tax Details"}
                                </th>
                              </tr>
                              {/* Column Header Tier 2 */}
                              <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase text-[10px] font-semibold tracking-wider">
                                <th className="py-2.5 px-3 min-w-[130px]">GSTIN</th>
                                <th className="py-2.5 px-3 min-w-[160px] border-r border-[#E5E7EB]">{lang === "gu" ? "ગ્રાહકનું નામ" : "Customer Name"}</th>
                                <th className="py-2.5 px-3 text-center w-[70px]">{lang === "gu" ? "સ્ટેટ કોડ" : "State Code"}</th>
                                <th className="py-2.5 px-3 min-w-[120px] border-r border-[#E5E7EB]">{lang === "gu" ? "રાજ્યનું નામ" : "State Name"}</th>
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
                            <tbody className="divide-y divide-[#E5E7EB] bg-white">
                              {paginatedRows.map((r: any, idx: number) => {
                                const d = r.invoiceDate ? new Date(r.invoiceDate) : null;
                                const dateFormatted = d && !isNaN(d.getTime())
                                  ? `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`
                                  : (r.invoiceDate || "—");

                                return (
                                  <tr key={r.id || idx} className="hover:bg-[#FFFAF5] transition-colors">
                                    <td className="py-2.5 px-3 font-mono text-slate-700 font-semibold">
                                      {r.gstin ? (
                                        <span className="text-[#1E40AF]">{r.gstin}</span>
                                      ) : (
                                        <span className="text-slate-400 font-normal italic">—</span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 font-semibold text-[#202124] border-r border-[#E5E7EB]">
                                      {r.customerName}
                                    </td>
                                    <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                                      {r.stateCode || "—"}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-700 border-r border-[#E5E7EB]">
                                      {r.stateName || "—"}
                                    </td>
                                    <td className="py-2.5 px-3 font-mono font-bold text-[#202124]">
                                      {r.invoiceNumber}
                                    </td>
                                    <td className="py-2.5 px-3 font-mono text-[#667085]">
                                      {dateFormatted}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#202124]">
                                      ₹{Number(r.invoiceValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                                      {r.taxRate}%
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-[#202124]">
                                      ₹{Number(r.taxableValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                                      ₹{Number(r.cgst || 0).toFixed(2)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                                      ₹{Number(r.sgst || 0).toFixed(2)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                                      ₹{Number(r.igst || 0).toFixed(2)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            {/* Column Totals Footer */}
                            <tfoot>
                              <tr className="bg-[#F8F9FB] border-t-2 border-[#DDE1E8] font-bold text-[#202124]">
                                <td colSpan={4} className="py-3 px-3 border-r border-[#E5E7EB]">
                                  {lang === "gu" ? "કુલ વેચાણ સમરી" : "Total Outward Supplies"} ({totalEntries} {lang === "gu" ? "રેકોર્ડ" : "records"})
                                </td>
                                <td colSpan={2} className="py-3 px-3 font-mono text-slate-500">—</td>
                                <td className="py-3 px-3 text-right font-mono text-[#16834A]">
                                  ₹{totalInvVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 px-3 text-center font-mono text-slate-400">—</td>
                                <td className="py-3 px-3 text-right font-mono text-[#202124]">
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
                    const rows = reportData.creditNotes || [];
                    if (rows.length === 0) {
                      return (
                        <ReportEmptyState
                          title="No sales return / credit notes found"
                          titleGu="કોઈ વેચાણ પરત / ક્રેડિટ નોટ્સ મળેલ નથી"
                          description="No sales returns or credit notes were issued during this date range."
                          descriptionGu="આ સમયગાળા દરમિયાન કોઈ ક્રેડિટ નોટ્સ જારી કરવામાં આવી નથી."
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
                      <div className="border border-[#E5E7EB] rounded-xl overflow-hidden w-full max-w-full shadow-2xs bg-white">
                        <div className="overflow-x-auto w-full">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-[#F1F3F7] border-b border-[#DDE1E8] text-[#4B5563] text-[11px] font-bold">
                                <th colSpan={2} className="py-2 px-3 text-left border-r border-[#DDE1E8]">
                                  {lang === "gu" ? "ગ્રાહક વિગતો" : "Customer Details"}
                                </th>
                                <th colSpan={2} className="py-2 px-3 text-center border-r border-[#DDE1E8] bg-slate-100">
                                  {lang === "gu" ? "સપ્લાયનું સ્થળ" : "Place of Supply"}
                                </th>
                                <th colSpan={8} className="py-2 px-3 text-center bg-rose-50/60 text-rose-800">
                                  {lang === "gu" ? "ક્રેડિટ નોટ વિગતો" : "Credit Note Details"}
                                </th>
                              </tr>
                              <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase text-[10px] font-semibold tracking-wider">
                                <th className="py-2.5 px-3 min-w-[130px]">GSTIN</th>
                                <th className="py-2.5 px-3 min-w-[160px] border-r border-[#E5E7EB]">{lang === "gu" ? "ગ્રાહકનું નામ" : "Customer Name"}</th>
                                <th className="py-2.5 px-3 text-center w-[70px]">{lang === "gu" ? "સ્ટેટ કોડ" : "State Code"}</th>
                                <th className="py-2.5 px-3 min-w-[120px] border-r border-[#E5E7EB]">{lang === "gu" ? "રાજ્યનું નામ" : "State Name"}</th>
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
                            <tbody className="divide-y divide-[#E5E7EB] bg-white">
                              {paginatedRows.map((r: any, idx: number) => {
                                const d = r.noteDate ? new Date(r.noteDate) : null;
                                const dateFormatted = d && !isNaN(d.getTime())
                                  ? `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`
                                  : (r.noteDate || "—");

                                return (
                                  <tr key={r.id || idx} className="hover:bg-[#FFFAF5] transition-colors">
                                    <td className="py-2.5 px-3 font-mono text-slate-700 font-semibold">{r.gstin || "—"}</td>
                                    <td className="py-2.5 px-3 font-semibold text-[#202124] border-r border-[#E5E7EB]">{r.customerName}</td>
                                    <td className="py-2.5 px-3 text-center font-mono text-slate-700">{r.stateCode || "—"}</td>
                                    <td className="py-2.5 px-3 text-slate-700 border-r border-[#E5E7EB]">{r.stateName || "—"}</td>
                                    <td className="py-2.5 px-3 font-mono font-bold text-rose-700">{r.noteNumber}</td>
                                    <td className="py-2.5 px-3 font-mono text-[#667085]">{dateFormatted}</td>
                                    <td className="py-2.5 px-3 font-mono text-slate-600">{r.originalInvoiceNumber || "—"}</td>
                                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                                      ₹{Number(r.noteValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-[#202124]">
                                      ₹{Number(r.taxableValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">₹{Number(r.cgst || 0).toFixed(2)}</td>
                                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">₹{Number(r.sgst || 0).toFixed(2)}</td>
                                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">₹{Number(r.igst || 0).toFixed(2)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr className="bg-[#F8F9FB] border-t-2 border-[#DDE1E8] font-bold text-[#202124]">
                                <td colSpan={4} className="py-3 px-3 border-r border-[#E5E7EB]">
                                  {lang === "gu" ? "કુલ ક્રેડિટ નોટ્સ સમરી" : "Total Credit Notes"} ({totalEntries} {lang === "gu" ? "રેકોર્ડ" : "records"})
                                </td>
                                <td colSpan={3} className="py-3 px-3 font-mono text-slate-500">—</td>
                                <td className="py-3 px-3 text-right font-mono text-rose-700">
                                  ₹{totalVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 px-3 text-right font-mono text-[#202124]">
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
                    const rows = reportData.debitNotes || [];
                    if (rows.length === 0) {
                      return (
                        <ReportEmptyState
                          title="No purchase return / debit notes found"
                          titleGu="કોઈ ખરીદ પરત / ડેબિટ નોટ્સ મળેલ નથી"
                          description="No purchase returns or debit notes were recorded during this date range."
                          descriptionGu="આ સમયગાળા દરમિયાન કોઈ ડેબિટ નોટ્સ નોંધાયેલ નથી."
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
                      <div className="border border-[#E5E7EB] rounded-xl overflow-hidden w-full max-w-full shadow-2xs bg-white">
                        <div className="overflow-x-auto w-full">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-[#F1F3F7] border-b border-[#DDE1E8] text-[#4B5563] text-[11px] font-bold">
                                <th colSpan={2} className="py-2 px-3 text-left border-r border-[#DDE1E8]">
                                  {lang === "gu" ? "વેપારી વિગતો" : "Supplier Details"}
                                </th>
                                <th colSpan={2} className="py-2 px-3 text-center border-r border-[#DDE1E8] bg-slate-100">
                                  {lang === "gu" ? "સપ્લાયનું સ્થળ" : "Place of Supply"}
                                </th>
                                <th colSpan={8} className="py-2 px-3 text-center bg-indigo-50/60 text-indigo-800">
                                  {lang === "gu" ? "ડેબિટ નોટ વિગતો" : "Debit Note Details"}
                                </th>
                              </tr>
                              <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase text-[10px] font-semibold tracking-wider">
                                <th className="py-2.5 px-3 min-w-[130px]">GSTIN</th>
                                <th className="py-2.5 px-3 min-w-[160px] border-r border-[#E5E7EB]">{lang === "gu" ? "વેપારીનું નામ" : "Supplier Name"}</th>
                                <th className="py-2.5 px-3 text-center w-[70px]">{lang === "gu" ? "સ્ટેટ કોડ" : "State Code"}</th>
                                <th className="py-2.5 px-3 min-w-[120px] border-r border-[#E5E7EB]">{lang === "gu" ? "રાજ્યનું નામ" : "State Name"}</th>
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
                            <tbody className="divide-y divide-[#E5E7EB] bg-white">
                              {paginatedRows.map((r: any, idx: number) => {
                                const d = r.noteDate ? new Date(r.noteDate) : null;
                                const dateFormatted = d && !isNaN(d.getTime())
                                  ? `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`
                                  : (r.noteDate || "—");

                                return (
                                  <tr key={r.id || idx} className="hover:bg-[#FFFAF5] transition-colors">
                                    <td className="py-2.5 px-3 font-mono text-slate-700 font-semibold">{r.gstin || "—"}</td>
                                    <td className="py-2.5 px-3 font-semibold text-[#202124] border-r border-[#E5E7EB]">{r.supplierName || r.customerName}</td>
                                    <td className="py-2.5 px-3 text-center font-mono text-slate-700">{r.stateCode || "—"}</td>
                                    <td className="py-2.5 px-3 text-slate-700 border-r border-[#E5E7EB]">{r.stateName || "—"}</td>
                                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{r.noteNumber}</td>
                                    <td className="py-2.5 px-3 font-mono text-[#667085]">{dateFormatted}</td>
                                    <td className="py-2.5 px-3 font-mono text-slate-600">{r.originalInvoiceNumber || "—"}</td>
                                    <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700">
                                      ₹{Number(r.noteValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-[#202124]">
                                      ₹{Number(r.taxableValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">₹{Number(r.cgst || 0).toFixed(2)}</td>
                                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">₹{Number(r.sgst || 0).toFixed(2)}</td>
                                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">₹{Number(r.igst || 0).toFixed(2)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr className="bg-[#F8F9FB] border-t-2 border-[#DDE1E8] font-bold text-[#202124]">
                                <td colSpan={4} className="py-3 px-3 border-r border-[#E5E7EB]">
                                  {lang === "gu" ? "કુલ ડેબિટ નોટ્સ સમરી" : "Total Debit Notes"} ({totalEntries} {lang === "gu" ? "રેકોર્ડ" : "records"})
                                </td>
                                <td colSpan={3} className="py-3 px-3 font-mono text-slate-500">—</td>
                                <td className="py-3 px-3 text-right font-mono text-indigo-700">
                                  ₹{totalVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 px-3 text-right font-mono text-[#202124]">
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
                <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start sm:items-center gap-2.5">
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
                  <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-[10px] text-blue-800 uppercase font-bold block">Filing Status</span>
                    <p className="font-bold text-sm text-blue-900 mt-1">{reportData.filingStatus || "AUTO_COMPUTED"}</p>
                  </div>
                  <div className="p-3.5 bg-[#EAF7EF] border border-[#A6E9C5] rounded-lg">
                    <span className="text-[10px] text-[#16834A] uppercase font-bold block">Taxable Outward Supplies</span>
                    <p className="font-mono font-bold text-lg text-[#16834A]">₹{reportData.table3_1_outwardSupplies?.taxableAmount || "0.00"}</p>
                  </div>
                  <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-lg">
                    <span className="text-[10px] text-purple-800 uppercase font-bold block">Total Outward Tax</span>
                    <p className="font-mono font-bold text-lg text-purple-900">
                      ₹{(Number(reportData.table3_1_outwardSupplies?.cgst || 0) + Number(reportData.table3_1_outwardSupplies?.sgst || 0) + Number(reportData.table3_1_outwardSupplies?.igst || 0)).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="border border-[#E5E7EB] rounded-xl overflow-x-auto w-full">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
                        <th className="py-2.5 px-3">Table Schedule</th>
                        <th className="py-2.5 px-3 text-right">Taxable Value (₹)</th>
                        <th className="py-2.5 px-3 text-right">IGST (₹)</th>
                        <th className="py-2.5 px-3 text-right">CGST (₹)</th>
                        <th className="py-2.5 px-3 text-right">SGST (₹)</th>
                        <th className="py-2.5 px-3 text-right">Cess (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      <tr className="hover:bg-[#FFFAF5]">
                        <td className="py-2.5 px-3 font-semibold text-[#202124]">3.1 (a) Outward Taxable Supplies</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">₹{reportData.table3_1_outwardSupplies?.taxableAmount || "0.00"}</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹{reportData.table3_1_outwardSupplies?.igst || "0.00"}</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹{reportData.table3_1_outwardSupplies?.cgst || "0.00"}</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹{reportData.table3_1_outwardSupplies?.sgst || "0.00"}</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹{reportData.table3_1_outwardSupplies?.cess || "0.00"}</td>
                      </tr>
                      <tr className="hover:bg-[#FFFAF5]">
                        <td className="py-2.5 px-3 font-semibold text-[#202124]">4 (A) (5) All Other Eligible ITC</td>
                        <td className="py-2.5 px-3 text-right font-mono text-[#667085]">—</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹{reportData.table4_eligibleItc?.allOtherItc?.igst || "0.00"}</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹{reportData.table4_eligibleItc?.allOtherItc?.cgst || "0.00"}</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹{reportData.table4_eligibleItc?.allOtherItc?.sgst || "0.00"}</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹{reportData.table4_eligibleItc?.allOtherItc?.cess || "0.00"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Generic Table for any remaining report */
              <div className="space-y-6">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{currentTabMeta.label}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Authoritative financial records for {startDate} to {endDate}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold">
                    Statutory Compliant
                  </span>
                </div>

                <div className="border border-[#E5E7EB] rounded-xl overflow-x-auto w-full">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
                        <th className="py-2.5 px-3">Field / Record</th>
                        <th className="py-2.5 px-3 text-right">Debit (Dr) / Value</th>
                        <th className="py-2.5 px-3 text-right">Credit (Cr) / Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {Object.entries(reportData.summary || reportData.totals || reportData)
                        .filter(([k]) => typeof reportData[k] !== "object")
                        .map(([key, value]: any) => (
                          <tr key={key} className="hover:bg-[#FFFAF5] transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-[#202124] capitalize">{key.replace(/([A-Z])/g, " $1")}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-[#667085]">—</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-[#202124]">
                              {typeof value === "number" ? `₹${Number(value).toFixed(2)}` : String(value)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
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
        />
      )}
    </div>
  );
}
