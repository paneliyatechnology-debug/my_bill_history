content = '''"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";
import { Modal } from "../../../components/ui/modal";
import { EwbSlipModal } from "../../../components/gst/ewb-slip-modal";
import { ExportDropdown } from "../../../components/ui/export-dropdown";
import { ExportColumn } from "../../../lib/export/export-types";
import { QuickSettingsModal, DEFAULT_QUICK_SETTINGS, QuickSettingsConfig } from "@/components/invoice/quick-settings-modal";
import { ShortcutsModal } from "@/components/invoice/shortcuts-modal";
import { ScorecardRibbon, ScorecardSegment } from "@/components/design-system/scorecard-ribbon";
import { formatInr } from "@/components/design-system/tokens";

interface DeliveryChallanItem {
  id: string;
  itemId: string;
  description?: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  taxableAmount: number;
  taxRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  item?: { id: string; name: string; sku?: string };
}

interface DeliveryChallan {
  id: string;
  companyId: string;
  challanNumber: string;
  challanDate: string;
  dueDate?: string;
  challanType: "JOB_WORK" | "SUPPLY_ON_APPROVAL" | "BRANCH_TRANSFER" | "OTHER";
  status: "DRAFT" | "ISSUED" | "CLOSED" | "CANCELLED";
  eWayBillNumber?: string;
  placeOfSupply?: string;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  partyId?: string;
  warehouseId: string;
  party?: { id: string; name: string; gstin?: string; phone?: string };
  warehouse?: { id: string; name: string };
  items: DeliveryChallanItem[];
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

export default function DeliveryChallanListingPage() {
  const router = useRouter();
  const { lang, tenantContext, currentCompany } = useAuth();

  const [challans, setChallans] = useState<DeliveryChallan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("LAST_365_DAYS");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "CLOSED" | "CANCELLED">("ALL");

  // Actions dropdown
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  // Modals
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [selectedChallan, setSelectedChallan] = useState<DeliveryChallan | null>(null);
  const [viewEwbSlipNumber, setViewEwbSlipNumber] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [challanToDelete, setChallanToDelete] = useState<DeliveryChallan | null>(null);

  // Settings & Shortcuts
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [quickSettings, setQuickSettings] = useState<QuickSettingsConfig>(DEFAULT_QUICK_SETTINGS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Keyboard shortcut F2: New Challan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        router.push("/sales/delivery-challan/create");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  useEffect(() => {
    function handleClickOutside() {
      setActiveActionMenuId(null);
    }
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const fetchChallans = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get("/sales/delivery-challan", {
        limit: 150,
      });
      const list = extractList<DeliveryChallan>(res);
      setChallans(list);
    } catch (err: any) {
      setError(err.message || "Failed to load delivery challans.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchChallans();
    }
  }, [tenantContext.companyId, fetchChallans]);

  // KPI Calculations
  const kpis = useMemo(() => {
    let totalValue = 0;
    let openCount = 0;
    let openValue = 0;
    let closedCount = 0;
    let closedValue = 0;
    let cancelledCount = 0;

    challans.forEach((ch) => {
      const amt = Number(ch.totalAmount || 0);
      totalValue += amt;

      if (ch.status === "CANCELLED") {
        cancelledCount += 1;
      } else if (ch.status === "CLOSED") {
        closedCount += 1;
        closedValue += amt;
      } else {
        openCount += 1;
        openValue += amt;
      }
    });

    return {
      totalCount: challans.length,
      totalValue,
      openCount,
      openValue,
      closedCount,
      closedValue,
      cancelledCount,
    };
  }, [challans]);

  // Filtered List
  const filteredChallans = useMemo(() => {
    return challans.filter((ch) => {
      const isClosed = ch.status === "CLOSED";

      // Status filter
      if (statusFilter === "OPEN" && (isClosed || ch.status === "CANCELLED")) return false;
      if (statusFilter === "CLOSED" && !isClosed) return false;
      if (statusFilter === "CANCELLED" && ch.status !== "CANCELLED") return false;

      // Date filter
      if (dateRangePreset === "THIS_MONTH") {
        const curMonth = new Date().toISOString().substring(0, 7);
        if (!ch.challanDate?.startsWith(curMonth)) return false;
      }

      // Search
      if (searchQuery.trim()) {
        const s = searchQuery.toLowerCase();
        const matchesNo = ch.challanNumber?.toLowerCase().includes(s);
        const matchesParty = (ch.party?.name || ch.warehouse?.name || "").toLowerCase().includes(s);
        const matchesEwb = ch.eWayBillNumber?.toLowerCase().includes(s);
        if (!matchesNo && !matchesParty && !matchesEwb) return false;
      }

      return true;
    });
  }, [challans, statusFilter, dateRangePreset, searchQuery]);

  // Scorecard segments for ribbon
  const scorecardSegments: ScorecardSegment[] = [
    {
      id: "all",
      label: "Total Challans Dispatched",
      labelGujarati: "કુલ ચલણ",
      value: kpis.totalValue,
      isCurrency: true,
      subtext: `${challans.length} Challans On Record`,
      subtextGujarati: `${challans.length} ચલણ નોંધાયેલ`,
      badge: DATE_PRESET_LABELS[dateRangePreset],
      variant: "primary",
      isActive: statusFilter === "ALL",
      onClick: () => setStatusFilter("ALL"),
    },
    {
      id: "closed",
      label: "Converted / Closed",
      labelGujarati: "પાકા બિલમાં બદલાયેલ",
      value: kpis.closedValue,
      isCurrency: true,
      subtext: `${kpis.closedCount} Invoices Billed`,
      subtextGujarati: `${kpis.closedCount} પૂર્ણ ચલણ`,
      variant: "success",
      isActive: statusFilter === "CLOSED",
      onClick: () => setStatusFilter("CLOSED"),
    },
    {
      id: "open",
      label: "Open / Goods In Transit",
      labelGujarati: "બાકી / માલ મોકલેલ",
      value: kpis.openValue,
      isCurrency: true,
      subtext: `${kpis.openCount} Awaiting Billing`,
      subtextGujarati: `${kpis.openCount} પેન્ડિંગ ચલણ`,
      variant: "warning",
      isActive: statusFilter === "OPEN",
      onClick: () => setStatusFilter("OPEN"),
    },
    {
      id: "cancelled",
      label: "Cancelled / Void",
      labelGujarati: "રદ થયેલ ચલણ",
      value: kpis.cancelledCount,
      isCurrency: false,
      subtext: "Voided Challans",
      subtextGujarati: "રદ થયેલ",
      variant: "neutral",
      isActive: statusFilter === "CANCELLED",
      onClick: () => setStatusFilter("CANCELLED"),
    },
  ];

  // Convert to Tax Invoice handler
  const handleConvertToTaxInvoice = async (ch: DeliveryChallan) => {
    setActiveActionMenuId(null);
    try {
      const res: any = await apiClient.post(
        `/sales/delivery-challan/${ch.id}/convert-to-invoice`,
        {},
        undefined,
        `conv_challan_${Date.now()}`,
      );
      setToastMessage(`Challan #${ch.challanNumber} converted to Tax Invoice #${res?.invoiceNumber || ""}!`);
      setTimeout(() => setToastMessage(null), 5000);
      await fetchChallans();
    } catch (err: any) {
      setToastMessage(err.message || "Failed to convert delivery challan.");
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Cancel Submit
  const handleCancelSubmit = async () => {
    if (!selectedChallan) return;
    try {
      await apiClient.post(`/sales/delivery-challan/${selectedChallan.id}/cancel`, {
        reason: cancelReason || "Customer cancelled delivery",
      });
      setIsCancelModalOpen(false);
      setSelectedChallan(null);
      setCancelReason("");
      setToastMessage("Delivery challan cancelled.");
      setTimeout(() => setToastMessage(null), 3000);
      await fetchChallans();
    } catch (err: any) {
      alert(err.message || "Failed to cancel delivery challan.");
    }
  };

  // Delete Challan
  const handleDeleteChallan = async () => {
    if (!challanToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/sales/delivery-challan/${challanToDelete.id}`);
      setChallanToDelete(null);
      setToastMessage("Delivery challan deleted.");
      setTimeout(() => setToastMessage(null), 3000);
      await fetchChallans();
    } catch (err: any) {
      alert(err.message || "Failed to delete delivery challan.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Export Columns definition
  const exportColumns: ExportColumn[] = [
    { key: "challanDate", header: "Date", width: 12 },
    { key: "challanNumber", header: "Challan #", width: 15 },
    { key: "partyName", header: "Customer / Destination", width: 25 },
    { key: "amount", header: "Amount", width: 15, align: "right" },
    { key: "eWayBillNumber", header: "e-Way Bill", width: 15 },
    { key: "status", header: "Status", width: 15 },
  ];

  const exportData = useMemo(() => {
    return filteredChallans.map((ch) => ({
      challanDate: ch.challanDate ? new Date(ch.challanDate).toLocaleDateString("en-GB") : "",
      challanNumber: ch.challanNumber,
      partyName: ch.party?.name || ch.warehouse?.name || "Direct / Self",
      amount: formatInr(ch.totalAmount || 0),
      eWayBillNumber: ch.eWayBillNumber || "—",
      status: ch.status,
    }));
  }, [filteredChallans]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto min-w-0 pb-16 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-xl animate-in slide-in-from-bottom-2 duration-150 border border-slate-800">
          <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. TOP UNIFIED COMMAND STRIP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:px-6 sm:py-3.5 rounded-2xl border border-[#E2E8E5] shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#26A58A]">
              {lang === "gu" ? "ડિલિવરી અને ટ્રાન્સપોર્ટ" : "LOGISTICS & DISPATCH"}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[10px] font-bold text-slate-500 font-mono">
              {filteredChallans.length} {lang === "gu" ? "ચલણ" : "Challans"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-[#1A2E2B] tracking-tight">
              {lang === "gu" ? "ડિલિવરી ચલણ (Delivery Challan)" : "Delivery Challans"}
            </h1>
            <button
              type="button"
              onClick={fetchChallans}
              title="Refresh Challans"
              className="p-1 text-slate-400 hover:text-[#174B43] rounded-md transition-colors"
            >
              <svg className={`w-4 h-4 ${isLoading ? "animate-spin text-[#26A58A]" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <ExportDropdown
            columns={exportColumns}
            data={exportData}
            metadata={{
              title: "Delivery Challans Register",
              fileName: "delivery_challans_register",
              companyName: currentCompany?.tradeName || currentCompany?.legalName || "My Business",
              filterDescription: DATE_PRESET_LABELS[dateRangePreset],
              totalCount: filteredChallans.length,
            }}
            lang={lang}
            themeColor="purple"
            buttonVariant="compact"
          />

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E2E8E5] bg-white text-xs font-semibold text-[#1A2E2B] hover:bg-[#F2FAF7] hover:border-[#85D5C2] transition-colors shadow-2xs cursor-pointer"
            title="Print Register"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print</span>
          </button>

          <Link
            href="/sales/delivery-challan/create"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#174B43] hover:bg-[#123B35] text-white text-xs font-bold shadow-md shadow-[#174B43]/20 hover:shadow-lg hover:shadow-[#174B43]/30 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>{lang === "gu" ? "+ નવું ચલણ" : "+ Create Challan"}</span>
          </Link>
        </div>
      </div>

      {/* 2. SCORECARD RIBBON */}
      <ScorecardRibbon segments={scorecardSegments} lang={lang} />

      {/* 3. CONTROLS BAR: SEARCH, DATE SELECTOR & STATUS SEGMENTS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E2E8E5] shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* Omni Search Box */}
          <div className="relative w-full sm:w-72">
            <span className="absolute left-3 top-2.5 text-slate-400">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === "gu" ? "શોધો: ચલણ નં, ગ્રાહક, EWB..." : "Search challan #, customer, EWB..."}
              className="w-full rounded-xl border border-[#E2E8E5] bg-[#F6F7F1] py-2 pl-9 pr-8 text-xs text-[#1A2E2B] placeholder-slate-400 focus:bg-white focus:border-[#26A58A] focus:ring-1 focus:ring-[#26A58A] focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            )}
          </div>

          {/* Date Range Selector */}
          <select
            value={dateRangePreset}
            onChange={(e) => setDateRangePreset(e.target.value as DateRangePreset)}
            className="pl-3 pr-8 py-2 border border-[#E2E8E5] rounded-xl text-xs font-medium text-[#1A2E2B] bg-white focus:outline-none focus:border-[#26A58A] cursor-pointer"
          >
            {Object.entries(DATE_PRESET_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Status segment pills switcher */}
        <div className="flex items-center gap-1 bg-[#F6F7F1] p-1 rounded-xl border border-[#E2E8E5] self-start sm:self-auto">
          {(
            [
              { key: "ALL", label: "All" },
              { key: "OPEN", label: "Open" },
              { key: "CLOSED", label: "Converted" },
              { key: "CANCELLED", label: "Void" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                statusFilter === tab.key
                  ? "bg-white text-[#174B43] shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 flex items-center justify-between shadow-2xs">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">✕</button>
        </div>
      )}

      {/* 4. ENTERPRISE DATA GRID */}
      <div className="overflow-visible rounded-2xl border border-[#E2E8E5] bg-white shadow-xs">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="min-w-full text-left text-xs border-collapse">
            <thead className="bg-[#F8FAF9] border-b border-[#E2E8E5] text-[#5A6B66] font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3.5 whitespace-nowrap font-bold">Date & Type</th>
                <th className="px-4 py-3.5 whitespace-nowrap font-bold">Challan #</th>
                <th className="px-4 py-3.5 whitespace-nowrap font-bold">Customer / Warehouse</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap font-bold">Amount</th>
                <th className="px-4 py-3.5 text-center whitespace-nowrap font-bold">e-Way Bill</th>
                <th className="px-4 py-3.5 text-center whitespace-nowrap font-bold">Status</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E5]">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-xs text-[#5A6B66]">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#26A58A] border-t-transparent" />
                      <span>{lang === "gu" ? "લોડ થઈ રહ્યું છે..." : "Loading delivery challans..."}</span>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading && filteredChallans.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-20 text-center text-[#5A6B66]">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-[#174B43] mb-3 shadow-inner">
                        <svg className="w-7 h-7 text-[#26A58A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                      </div>
                      <p className="text-base font-bold text-[#1A2E2B]">
                        {lang === "gu" ? "કોઈ ડિલિવરી ચલણ મળ્યા નથી." : "No delivery challans found"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {searchQuery
                          ? "No transactions match your current search filters."
                          : "Issue delivery challans for goods transfer, job work, or approval and convert to invoice anytime."}
                      </p>
                      <Link
                        href="/sales/delivery-challan/create"
                        className="mt-4 rounded-xl bg-[#174B43] px-4 py-2 text-xs font-bold text-white shadow-jade hover:bg-[#123B35] transition-colors"
                      >
                        {lang === "gu" ? "+ નવું ચલણ" : "+ Create Challan"}
                      </Link>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading &&
                filteredChallans.map((ch) => {
                  const isClosed = ch.status === "CLOSED";
                  const amt = ch.totalAmount || 0;
                  return (
                    <tr
                      key={ch.id}
                      className={`hover:bg-[#F2FAF7]/70 transition-colors group ${
                        ch.status === "CANCELLED" ? "opacity-60 bg-slate-50/50" : ""
                      }`}
                    >
                      {/* Date & Type */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-[#1A2E2B]">
                        <div>
                          {ch.challanDate
                            ? new Date(ch.challanDate).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 capitalize">
                          {ch.challanType ? ch.challanType.toLowerCase().replace(/_/g, " ") : "Challan"}
                        </div>
                      </td>

                      {/* Challan Number */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/sales/invoices/${ch.id}`}
                            className="font-mono font-bold text-[#174B43] hover:text-[#26A58A] hover:underline transition-colors text-xs"
                          >
                            {ch.challanNumber}
                          </Link>
                        </div>
                      </td>

                      {/* Customer / Warehouse */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-[#1A2E2B] text-xs">
                          {ch.party?.name || ch.warehouse?.name || "Direct / Self"}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                          {ch.party?.phone && <span>📞 {ch.party.phone}</span>}
                          {ch.party?.gstin && <span>GST: {ch.party.gstin}</span>}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-right font-bold text-[#1A2E2B] whitespace-nowrap font-mono text-[13px]">
                        {formatInr(amt)}
                      </td>

                      {/* e-Way Bill */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {ch.eWayBillNumber ? (
                          <button
                            type="button"
                            onClick={() => setViewEwbSlipNumber(ch.eWayBillNumber!)}
                            className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-[#174B43] hover:text-[#26A58A] hover:underline cursor-pointer"
                          >
                            <span>🚚 {ch.eWayBillNumber}</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {isClosed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Converted</span>
                          </span>
                        ) : ch.status === "CANCELLED" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                            Void
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span>Open</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isClosed && ch.status !== "CANCELLED" && (
                            <button
                              type="button"
                              onClick={() => handleConvertToTaxInvoice(ch)}
                              className="px-2.5 py-1 text-xs font-bold text-white bg-[#174B43] hover:bg-[#123B35] rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                              title="Convert this challan to legal Tax Invoice"
                            >
                              <svg className="w-3.5 h-3.5 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              <span>Convert</span>
                            </button>
                          )}

                          <Link
                            href={`/sales/invoices/${ch.id}`}
                            className="p-1.5 text-xs text-[#174B43] hover:bg-[#F2FAF7] rounded-lg font-semibold transition-colors border border-[#E2E8E5]"
                            title="View / Print PDF"
                          >
                            View
                          </Link>

                          {!isClosed && ch.status !== "CANCELLED" && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedChallan(ch);
                                setIsCancelModalOpen(true);
                              }}
                              className="p-1.5 text-xs text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="Cancel Challan"
                            >
                              ✕
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setChallanToDelete(ch)}
                            className="p-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Challan"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      <QuickSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={quickSettings}
        onSave={(newCfg) => setQuickSettings(newCfg)}
        initialTab="invoice"
      />

      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />

      {viewEwbSlipNumber && (
        <EwbSlipModal
          isOpen={Boolean(viewEwbSlipNumber)}
          onClose={() => setViewEwbSlipNumber(null)}
          ewbNumber={viewEwbSlipNumber}
        />
      )}

      {/* Cancel Challan Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Delivery Challan"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Are you sure you want to cancel delivery challan{" "}
            <strong>#{selectedChallan?.challanNumber}</strong>?
          </p>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Cancellation Reason</label>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Returned goods, order cancelled"
              className="w-full p-2.5 border border-[#E2E8E5] rounded-xl text-xs bg-[#F6F7F1] focus:bg-white focus:border-[#26A58A] focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(false)}
              className="px-3.5 py-1.5 border border-[#E2E8E5] rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleCancelSubmit}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
            >
              Cancel Challan
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(challanToDelete)}
        onClose={() => setChallanToDelete(null)}
        title="Delete Delivery Challan"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Are you sure you want to permanently delete delivery challan{" "}
            <strong>#{challanToDelete?.challanNumber}</strong>?
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setChallanToDelete(null)}
              className="px-3.5 py-1.5 border border-[#E2E8E5] rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDeleteChallan}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
'''

with open("src/app/sales/delivery-challan/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated src/app/sales/delivery-challan/page.tsx successfully!")
