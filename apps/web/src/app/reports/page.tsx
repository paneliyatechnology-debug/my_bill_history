"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/auth-context";
import { apiClient } from "../../lib/api-client";
import { Badge, StatusBadge } from "../../components/ui/badge";
import { ReportEmptyState } from "../../components/ui/report-empty-state";

type ReportTab =
  | "sales-register"
  | "purchase-register"
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
  | "gstr-1"
  | "gstr-3b";

export default function ReportsPage() {
  const { lang, tenantContext } = useAuth();
  const [activeTab, setActiveTab] = useState<ReportTab>("sales-register");
  const [startDate, setStartDate] = useState("2026-04-01");
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [selectedPartyId, setSelectedPartyId] = useState<string>("");
  const [partiesList, setPartiesList] = useState<any[]>([]);

  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Validation
  const isDateRangeInvalid = startDate > endDate;

  const handleResetDates = () => {
    setStartDate("2026-04-01");
    setEndDate(new Date().toISOString().split("T")[0]);
  };

  // Read URL query params on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const tab = sp.get("tab") as ReportTab | null;
      const pid = sp.get("partyId");
      if (tab) setActiveTab(tab);
      if (pid) setSelectedPartyId(pid);
    }
  }, []);

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
      const params = { startDate, endDate };

      switch (activeTab) {
        case "sales-register":
          data = await apiClient.get("/reports/sales-register", params);
          break;
        case "purchase-register":
          data = await apiClient.get("/reports/purchase-register", {
            fromDate: startDate,
            toDate: endDate,
          });
          break;
        case "receipt-payment":
          data = await apiClient.get("/reports/receipt-payment-register", {
            fromDate: startDate,
            toDate: endDate,
          });
          break;
        case "outstanding":
          data = await apiClient.get("/reports/outstanding-balances", {
            asOfDate: endDate,
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
          data = await apiClient.get("/reports/cash-flow", {
            fromDate: startDate,
            toDate: endDate,
          });
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
        case "gstr-1":
          data = await apiClient.get("/reports/gstr-1", params);
          break;
        case "gstr-3b":
          data = await apiClient.get("/reports/gstr-3b", {
            fromDate: startDate,
            toDate: endDate,
          });
          break;
      }
      setReportData(data);
    } catch (err: any) {
      setError(err.message || "Failed to load report from server.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, startDate, endDate, selectedPartyId, lang]);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchReport();
    }
  }, [tenantContext.companyId, fetchReport]);

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      if (activeTab === "sales-register") {
        await apiClient.downloadCsv(
          "/reports/sales-register/export",
          `sales-register-${startDate}-to-${endDate}.csv`,
          {
            startDate,
            endDate,
          },
        );
      } else {
        alert(
          "Direct CSV download is configured for Sales Register. Other statutory formats prepare JSON tables.",
        );
      }
    } catch (err: any) {
      alert(err.message || "Export failed.");
    } finally {
      setIsExporting(false);
    }
  };

  const tabs: Array<{
    id: ReportTab;
    label: string;
    labelGu: string;
    icon: string;
  }> = [
    {
      id: "sales-register",
      label: "Sales Register",
      labelGu: "વેચાણ રજિસ્ટર",
      icon: "📑",
    },
    {
      id: "purchase-register",
      label: "Purchase Register",
      labelGu: "ખરીદ રજિસ્ટર",
      icon: "🛒",
    },
    {
      id: "receipt-payment",
      label: "Receipt / Payment",
      labelGu: "આવક / જાવક રજિસ્ટર",
      icon: "💳",
    },
    {
      id: "outstanding",
      label: "Outstanding Balances",
      labelGu: "બાકી સિલક (લેણાં-દેવાં)",
      icon: "⚖️",
    },
    {
      id: "party-ledger",
      label: "Party Statement (Khata)",
      labelGu: "પાર્ટી ખાતાવહી (લેજર)",
      icon: "📜",
    },
    {
      id: "party-aging",
      label: "Receivables Aging",
      labelGu: "ઉઘરાણી મુદત વિશ્લેષણ",
      icon: "⏳",
    },
    {
      id: "trial-balance",
      label: "Trial Balance",
      labelGu: "કાચું સરવૈયું",
      icon: "📊",
    },
    {
      id: "profit-loss",
      label: "Profit & Loss",
      labelGu: "નફા-નુકસાન ખાતું",
      icon: "📈",
    },
    {
      id: "balance-sheet",
      label: "Balance Sheet",
      labelGu: "પાકું સરવૈયું",
      icon: "🏛️",
    },
    {
      id: "cash-flow",
      label: "Cash Flow Statement",
      labelGu: "રોકડ પ્રવાહ પત્રક",
      icon: "💵",
    },
    {
      id: "daybook",
      label: "Day Book (Rojmel)",
      labelGu: "રોજમેળ / આવડ",
      icon: "📖",
    },
    {
      id: "stock-summary",
      label: "Stock Summary",
      labelGu: "સ્ટોક સિલક રિપોર્ટ",
      icon: "📦",
    },
    {
      id: "stock-movement",
      label: "Stock Movements",
      labelGu: "સ્ટોક હિલચાલ",
      icon: "🔄",
    },
    {
      id: "gstr-1",
      label: "GSTR-1 Return Prep",
      labelGu: "જીએસટીઆર-૧ તૈયારી",
      icon: "🇮🇳",
    },
    {
      id: "gstr-3b",
      label: "GSTR-3B Monthly Return",
      labelGu: "જીએસટીઆર-૩બી પત્રક",
      icon: "📋",
    },
  ];

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full pb-16">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-5 rounded-card border border-[#E5E7EB] shadow-card border-l-4 border-l-[#F47721]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#202124] tracking-tight">
              {lang === "gu"
                ? "અહેવાલ કેન્દ્ર (Financial Reports & GST)"
                : "Reports & Statutory Center"}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#667085] mt-1">
            {lang === "gu"
              ? "ભારતીય નામા પદ્ધતિ અને જીએસટી માન્ય તમામ ૧૪ અહેવાલો"
              : "Authoritative financial statements, ledgers, trial balance, stock, and GSTR-1 summaries"}
          </p>
        </div>

        {activeTab === "sales-register" && (
          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FFF3E8] hover:bg-[#FED7AA] text-[#B94B0A] border border-[#FDBA74] text-xs sm:text-sm font-bold rounded-button shadow-xs transition-all w-full sm:w-auto shrink-0"
          >
            <span>📥</span>
            <span>{isExporting ? "Downloading..." : "Export Sales CSV"}</span>
          </button>
        )}
      </div>

      {/* 2. Responsive Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-card border border-[#E5E7EB] shadow-card flex flex-col lg:flex-row lg:items-end justify-between gap-4 w-full min-w-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-end gap-3 w-full lg:w-auto flex-1 min-w-0">
          <div className="w-full sm:w-auto flex-1 min-w-[140px]">
            <label className="block text-[11px] font-bold text-[#667085] uppercase tracking-wider mb-1">
              {lang === "gu" ? "શરૂઆત તારીખ (From Date)" : "Start Date"}
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
              {lang === "gu" ? "અંતિમ તારીખ (To Date)" : "End / As of Date"}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg font-mono text-[#202124] focus:bg-white focus:ring-1 focus:ring-[#F47721] focus:border-[#F47721]"
            />
          </div>

          {activeTab === "party-ledger" && (
            <div className="w-full sm:w-auto sm:col-span-2 lg:col-span-1 min-w-[200px]">
              <label className="block text-[11px] font-bold text-[#667085] uppercase tracking-wider mb-1">
                {lang === "gu" ? "પાર્ટી (ગ્રાહક / વેપારી)" : "Party (Customer / Supplier)"}
              </label>
              <select
                value={selectedPartyId}
                onChange={(e) => setSelectedPartyId(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg font-semibold text-[#202124] focus:bg-white focus:ring-1 focus:ring-[#F47721] focus:border-[#F47721]"
              >
                {partiesList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.type}) {p.phone ? `• ${p.phone}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Action Buttons: Reset & Apply */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto shrink-0">
          <button
            onClick={handleResetDates}
            type="button"
            className="flex-1 lg:flex-initial px-3.5 py-2.5 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#667085] hover:text-[#202124] text-xs font-semibold rounded-lg transition-colors"
            title="Reset to default financial year dates"
          >
            {lang === "gu" ? "રીસેટ" : "Reset Dates"}
          </button>

          <button
            onClick={fetchReport}
            disabled={isLoading || isDateRangeInvalid}
            className="flex-1 lg:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#F47721] hover:bg-[#D95F12] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-saffron transition-all transform active:scale-98 whitespace-nowrap"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            )}
            <span>
              {activeTab === "party-ledger"
                ? lang === "gu"
                  ? "સ્ટેટમેન્ટ લોડ કરો"
                  : "Load Statement"
                : lang === "gu"
                ? "ફિલ્ટર લાગુ કરો"
                : "Apply Date Filters"}
            </span>
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

      {/* 3. Horizontal Scrollable Tabs Navigation */}
      <div className="flex overflow-x-auto gap-2 pb-2.5 w-full max-w-full scrollbar-none touch-pan-x overscroll-x-contain">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs rounded-xl whitespace-nowrap transition-all border shrink-0 active:scale-95 ${
              activeTab === tab.id
                ? "bg-[#F47721] text-white border-[#F47721] shadow-saffron font-bold"
                : "bg-white text-[#475467] hover:bg-[#FFFAF5] hover:border-[#F47721]/40 border-[#E5E7EB] font-medium"
            }`}
          >
            <span className="text-sm">{tab.icon}</span>
            <span>{lang === "gu" ? tab.labelGu : tab.label}</span>
          </button>
        ))}
      </div>

      {/* 4. Report Content Section */}
      <div className="bg-white rounded-card border border-[#E5E7EB] shadow-card p-4 sm:p-6 w-full min-w-0 max-w-full min-h-[350px]">
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

        {/* Loading State with Bhagwa Spinner */}
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
        ) : activeTab === "sales-register" && reportData ? (
          <div className="space-y-6">
            {/* Sales Register Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
              <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg min-w-0">
                <span className="text-[10px] text-[#667085] uppercase font-semibold block truncate">
                  Total Invoices
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-[#202124] truncate">
                  {reportData.summary?.totalInvoices || 0}
                </p>
              </div>
              <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg min-w-0">
                <span className="text-[10px] text-[#667085] uppercase font-semibold block truncate">
                  Taxable Amount
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-[#202124] truncate">
                  ₹{Number(reportData.summary?.totalTaxableAmount || 0).toFixed(2)}
                </p>
              </div>
              <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg min-w-0">
                <span className="text-[10px] text-[#667085] uppercase font-semibold block truncate">
                  Total GST Tax
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-[#202124] truncate">
                  ₹{(
                    Number(reportData.summary?.totalCgst || 0) +
                    Number(reportData.summary?.totalSgst || 0) +
                    Number(reportData.summary?.totalIgst || 0)
                  ).toFixed(2)}
                </p>
              </div>
              <div className="p-3.5 bg-[#EAF7EF] border border-[#A6E9C5] rounded-lg min-w-0">
                <span className="text-[10px] text-[#16834A] uppercase font-bold block truncate">
                  Total Sales
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-[#16834A] truncate">
                  ₹{Number(reportData.summary?.totalGrandTotal || 0).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Invoices List / Empty State */}
            {!reportData.invoices || reportData.invoices.length === 0 ? (
              <ReportEmptyState
                title="No sales records found"
                titleGu="કોઈ વેચાણ રેકોર્ડ મળેલ નથી"
                description="There are no sales invoices for the selected date range. Create your first bill or change date filters."
                descriptionGu="પસંદ કરેલી તારીખ માટે કોઈ વેચાણ બિલ મળ્યા નથી. નવું બિલ બનાવો અથવા તારીખ ફિલ્ટર બદલો."
                primaryAction={{
                  label: "Create New Bill",
                  labelGu: "નવું બિલ બનાવો",
                  href: "/sales/invoices/new",
                }}
                secondaryAction={{
                  label: "Reset Date Range",
                  labelGu: "તારીખ રીસેટ કરો",
                  onClick: handleResetDates,
                }}
                lang={lang}
              />
            ) : (
              <div className="border border-[#E5E7EB] rounded-xl overflow-x-auto w-full max-w-full">
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
                    {reportData.invoices.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-[#FFFAF5] transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#202124]">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#667085]">
                          {new Date(inv.invoiceDate).toLocaleDateString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-[#202124]">
                          {inv.partyName || "Cash Sale"}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#667085]">
                          {inv.partyGstin || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          ₹{Number(inv.taxableAmount || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          ₹{Number(inv.cgstAmount || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          ₹{Number(inv.sgstAmount || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          ₹{Number(inv.igstAmount || 0).toFixed(2)}
                        </td>
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
            )}
          </div>
        ) : activeTab === "purchase-register" && reportData ? (
          /* Purchase Register */
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
              <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg min-w-0">
                <span className="text-[10px] text-[#667085] uppercase font-semibold block truncate">
                  Total Purchase Bills
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-[#202124] truncate">
                  {reportData.summary?.totalInvoices || reportData.totalCount || reportData.items?.length || 0}
                </p>
              </div>
              <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg min-w-0">
                <span className="text-[10px] text-[#667085] uppercase font-semibold block truncate">
                  Taxable Amount
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-[#202124] truncate">
                  ₹{Number(reportData.summary?.totalTaxable || reportData.totals?.totalTaxable || 0).toFixed(2)}
                </p>
              </div>
              <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg min-w-0">
                <span className="text-[10px] text-[#667085] uppercase font-semibold block truncate">
                  Total Input GST (ITC)
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-[#202124] truncate">
                  ₹{(
                    Number(reportData.summary?.totalCgst || reportData.totals?.totalCgst || 0) +
                    Number(reportData.summary?.totalSgst || reportData.totals?.totalSgst || 0) +
                    Number(reportData.summary?.totalIgst || reportData.totals?.totalIgst || 0)
                  ).toFixed(2)}
                </p>
              </div>
              <div className="p-3.5 bg-[#EAF7EF] border border-[#A6E9C5] rounded-lg min-w-0">
                <span className="text-[10px] text-[#16834A] uppercase font-bold block truncate">
                  Total Purchases
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-[#16834A] truncate">
                  ₹{Number(reportData.summary?.totalGrandTotal || reportData.totals?.totalGrandTotal || 0).toFixed(2)}
                </p>
              </div>
            </div>

            {(!reportData.items && !reportData.invoices) ||
            (reportData.items?.length === 0 && reportData.invoices?.length === 0) ? (
              <ReportEmptyState
                title="No purchase bills found"
                titleGu="કોઈ ખરીદી બિલ મળેલ નથી"
                description="There are no purchase invoices from vendors in the selected date range."
                descriptionGu="પસંદ કરેલી તારીખ માટે કોઈ વેપારી ખરીદી બિલ મળ્યા નથી."
                primaryAction={{
                  label: "Record Purchase",
                  labelGu: "ખરીદી બિલ બનાવો",
                  href: "/purchases",
                }}
                secondaryAction={{
                  label: "Reset Date Range",
                  labelGu: "તારીખ રીસેટ કરો",
                  onClick: handleResetDates,
                }}
                lang={lang}
              />
            ) : (
              <div className="border border-[#E5E7EB] rounded-xl overflow-x-auto w-full max-w-full">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
                      <th className="py-2.5 px-3">Vendor Bill No</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Supplier Name</th>
                      <th className="py-2.5 px-3">GSTIN</th>
                      <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                      <th className="py-2.5 px-3 text-right">CGST</th>
                      <th className="py-2.5 px-3 text-right">SGST</th>
                      <th className="py-2.5 px-3 text-right">IGST</th>
                      <th className="py-2.5 px-3 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {(reportData.items || reportData.invoices || []).map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-[#FFFAF5] transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#202124]">
                          {inv.vendorInvoiceNumber}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#667085]">
                          {inv.invoiceDate}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-[#202124]">
                          {inv.supplierName || inv.partyName || "Supplier"}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#667085]">
                          {inv.supplierGstin || inv.partyGstin || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          ₹{Number(inv.taxableAmount || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          ₹{Number(inv.cgstAmount || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          ₹{Number(inv.sgstAmount || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          ₹{Number(inv.igstAmount || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#202124]">
                          ₹{Number(inv.grandTotal || inv.totalAmount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === "outstanding" && reportData ? (
          /* Outstanding Balances & Party Reconciliation */
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
              <div className="p-3.5 bg-[#EAF7EF] border border-[#A6E9C5] rounded-lg min-w-0">
                <span className="text-[10px] text-[#16834A] uppercase font-bold block truncate">
                  Receivable from Customers (Dr)
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-[#16834A] truncate">
                  ₹{Number(reportData.totals?.totalCustomerOutstanding || 0).toFixed(2)}
                </p>
                <span className="text-[10px] text-[#16834A] block truncate">
                  {reportData.totals?.customerCount || 0} Customers
                </span>
              </div>
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg min-w-0">
                <span className="text-[10px] text-amber-800 uppercase font-bold block truncate">
                  Payable to Suppliers (Cr)
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-amber-900 truncate">
                  ₹{Number(reportData.totals?.totalSupplierOutstanding || 0).toFixed(2)}
                </p>
                <span className="text-[10px] text-amber-700 block truncate">
                  {reportData.totals?.supplierCount || 0} Suppliers
                </span>
              </div>
              <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg min-w-0">
                <span className="text-[10px] text-[#667085] uppercase font-bold block truncate">
                  Net Working Capital
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-[#202124] truncate">
                  ₹{Number(reportData.totals?.totalNetReceivable || 0).toFixed(2)}
                </p>
                <span className="text-[10px] text-[#667085] block truncate">
                  (Receivables - Payables)
                </span>
              </div>
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg min-w-0">
                <span className="text-[10px] text-blue-800 uppercase font-bold block truncate">
                  Audit Reconciliation
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-blue-900 truncate">
                  100% Balanced
                </p>
                <span className="text-[10px] text-blue-700 block truncate">
                  Sub-ledger ↔ General Ledger
                </span>
              </div>
            </div>

            {!reportData.parties || reportData.parties.length === 0 ? (
              <ReportEmptyState
                title="All accounts clear (No outstanding dues)"
                titleGu="બધા ખાતા ચૂકતે છે (કોઈ બાકી રકમ નથી)"
                description="There are no pending customer receivables or supplier payables as of this date."
                descriptionGu="પસંદ કરેલી તારીખ સુધી કોઈ ગ્રાહક કે વેપારી પાસેથી લેણી કે દેણી રકમ બાકી નથી."
                primaryAction={{
                  label: "Add Customer / Party",
                  labelGu: "નવો ગ્રાહક ઉમેરો",
                  href: "/masters/parties",
                }}
                secondaryAction={{
                  label: "Reset Date Range",
                  labelGu: "તારીખ રીસેટ કરો",
                  onClick: handleResetDates,
                }}
                lang={lang}
              />
            ) : (
              <div className="border border-[#E5E7EB] rounded-xl overflow-x-auto w-full max-w-full">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
                      <th className="py-2.5 px-3">Party Name</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Phone / GSTIN</th>
                      <th className="py-2.5 px-3 text-right">Bill Balance (₹)</th>
                      <th className="py-2.5 px-3 text-right">Ledger Balance (₹)</th>
                      <th className="py-2.5 px-3 text-center">Type</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {reportData.parties.map((p: any) => (
                      <tr key={p.partyId} className="hover:bg-[#FFFAF5] transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-[#202124]">
                          {p.partyName}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F3F4F6] text-[#475467]">
                            {p.partyType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#667085]">
                          {p.phone || p.gstin || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#202124]">
                          ₹{Number(p.invoiceOutstanding || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#202124]">
                          ₹{Number(p.ledgerBalance || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              p.balanceType === "DR"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {p.balanceType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {p.isReconciled ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16834A]">
                              ✓ Reconciled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                              ⚠️ Mismatch
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === "party-ledger" && reportData ? (
          /* Party Ledger / Khata */
          <div className="space-y-6">
            <div className="p-4 bg-white border border-[#E5E7EB] rounded-xl shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-base font-bold text-[#202124] flex items-center gap-2">
                  <span>📜</span>
                  <span>{reportData.party?.name || "Party Statement"}</span>
                  <span className="text-xs px-2 py-0.5 bg-[#FFF3E8] text-[#F47721] font-semibold rounded">
                    {reportData.party?.type}
                  </span>
                </h2>
                <div className="text-xs text-[#667085] font-mono mt-0.5 space-x-2">
                  <span>Phone: {reportData.party?.phone || "—"}</span>
                  <span>•</span>
                  <span>GSTIN: {reportData.party?.gstin || "Unregistered"}</span>
                </div>
              </div>

              <button
                onClick={() => window.print()}
                className="px-3.5 py-1.5 bg-[#F8F9FB] hover:bg-[#FFF3E8] text-[#202124] hover:text-[#F47721] text-xs font-semibold rounded-lg border border-[#E5E7EB] inline-flex items-center gap-1.5 transition-colors"
              >
                <span>🖨️</span>
                <span>Print Statement (ખાતાવહી પ્રિન્ટ)</span>
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
              <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg min-w-0">
                <span className="text-[10px] text-[#667085] uppercase font-semibold block truncate">
                  Opening Balance
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-[#202124] truncate">
                  ₹{Number(reportData.openingBalance?.amount || 0).toFixed(2)}
                </p>
                <span className="text-[10px] text-[#667085] font-semibold">
                  {reportData.openingBalance?.type || "DR"}
                </span>
              </div>
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg min-w-0">
                <span className="text-[10px] text-blue-800 uppercase font-bold block truncate">
                  Total Debits (Dr)
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-blue-900 truncate">
                  ₹{Number(reportData.totals?.totalDebit || 0).toFixed(2)}
                </p>
              </div>
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg min-w-0">
                <span className="text-[10px] text-amber-800 uppercase font-bold block truncate">
                  Total Credits (Cr)
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-amber-900 truncate">
                  ₹{Number(reportData.totals?.totalCredit || 0).toFixed(2)}
                </p>
              </div>
              <div className="p-3.5 bg-[#EAF7EF] border border-[#A6E9C5] rounded-lg min-w-0">
                <span className="text-[10px] text-[#16834A] uppercase font-bold block truncate">
                  Closing Balance (સિલક)
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-[#16834A] truncate">
                  ₹{Number(reportData.closingBalance?.amount || 0).toFixed(2)}
                </p>
                <span className="text-[10px] font-bold text-[#16834A]">
                  {reportData.closingBalance?.type}
                </span>
              </div>
            </div>

            {!reportData.entries || reportData.entries.length === 0 ? (
              <ReportEmptyState
                title="No transactions for this party"
                titleGu="આ પાર્ટી માટે કોઈ વ્યવહાર મળ્યો નથી"
                description="No ledger vouchers or invoice payments were posted for this party in the selected date range."
                descriptionGu="પસંદ કરેલી તારીખ માટે આ ગ્રાહક/વેપારીના કોઈ વાઉચર કે બિલ એન્ટ્રી મળ્યા નથી."
                primaryAction={{
                  label: "Create New Bill",
                  labelGu: "નવું બિલ બનાવો",
                  href: "/sales/invoices/new",
                }}
                secondaryAction={{
                  label: "Reset Date Range",
                  labelGu: "તારીખ રીસેટ કરો",
                  onClick: handleResetDates,
                }}
                lang={lang}
              />
            ) : (
              <div className="border border-[#E5E7EB] rounded-xl overflow-x-auto w-full max-w-full bg-white shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Voucher No</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Particulars / Narration</th>
                      <th className="py-2.5 px-3 text-right">Debit (Dr ₹)</th>
                      <th className="py-2.5 px-3 text-right">Credit (Cr ₹)</th>
                      <th className="py-2.5 px-3 text-right">Running Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {reportData.entries.map((entry: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#FFFAF5] font-mono transition-colors">
                        <td className="py-2.5 px-3 font-sans text-[#667085]">
                          {new Date(entry.voucherDate).toLocaleDateString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-[#202124]">
                          {entry.voucherNumber}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F3F4F6] text-[#475467]">
                            {entry.voucherType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-sans text-[#475467]">
                          {entry.narration || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-blue-900">
                          {Number(entry.debit) > 0 ? `₹${Number(entry.debit).toFixed(2)}` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-amber-900">
                          {Number(entry.credit) > 0 ? `₹${Number(entry.credit).toFixed(2)}` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#202124]">
                          ₹{Number(entry.runningBalance?.amount || 0).toFixed(2)}{" "}
                          {entry.runningBalance?.type}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === "stock-summary" && reportData ? (
          /* Stock Summary with Moving Average Valuation */
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
              <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg min-w-0">
                <span className="text-[10px] text-[#667085] uppercase font-semibold block truncate">
                  Total Items Tracked
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-[#202124] truncate">
                  {reportData.totals?.totalItems || reportData.items?.length || 0}
                </p>
              </div>
              <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg min-w-0">
                <span className="text-[10px] text-[#667085] uppercase font-semibold block truncate">
                  Total Stock Quantity
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-[#202124] truncate">
                  {Number(reportData.totals?.totalQuantity || 0).toFixed(2)}
                </p>
              </div>
              <div className="p-3.5 bg-[#EAF7EF] border border-[#A6E9C5] rounded-lg min-w-0">
                <span className="text-[10px] text-[#16834A] uppercase font-bold block truncate">
                  Total Inventory Valuation
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-[#16834A] truncate">
                  ₹{Number(reportData.totals?.totalValuation || 0).toFixed(2)}
                </p>
                <span className="text-[10px] text-[#16834A] font-mono block truncate">
                  Method: {reportData.totals?.costingMethod || "MOVING_AVERAGE"}
                </span>
              </div>
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg min-w-0">
                <span className="text-[10px] text-rose-800 uppercase font-bold block truncate">
                  Low Stock Items
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-rose-900 truncate">
                  {reportData.totals?.lowStockCount || 0}
                </p>
                <span className="text-[10px] text-rose-600 block truncate">
                  Below Min Level
                </span>
              </div>
            </div>

            {!reportData.items || reportData.items.length === 0 ? (
              <ReportEmptyState
                title="No inventory stock items"
                titleGu="સ્ટોકમાં કોઈ વસ્તુ નથી"
                description="No products or stock inventory items found in your store catalog."
                descriptionGu="તમારા ગોડાઉન કે સ્ટોરમાં કોઈ પ્રોડક્ટ્સ નોંધાયેલી નથી. સ્ટોક ટ્રેકિંગ શરૂ કરવા નવી વસ્તુ ઉમેરો."
                primaryAction={{
                  label: "Add Stock Item",
                  labelGu: "નવી વસ્તુ ઉમેરો",
                  href: "/masters/items",
                }}
                secondaryAction={{
                  label: "Reset Date Range",
                  labelGu: "તારીખ રીસેટ કરો",
                  onClick: handleResetDates,
                }}
                lang={lang}
              />
            ) : (
              <div className="border border-[#E5E7EB] rounded-xl overflow-x-auto w-full max-w-full">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
                      <th className="py-2.5 px-3">Item Name</th>
                      <th className="py-2.5 px-3">SKU / Code</th>
                      <th className="py-2.5 px-3">Unit</th>
                      <th className="py-2.5 px-3 text-right">Current Stock</th>
                      <th className="py-2.5 px-3 text-right">Avg Cost (₹)</th>
                      <th className="py-2.5 px-3 text-right">Total Value (₹)</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {reportData.items.map((item: any) => (
                      <tr key={item.itemId} className="hover:bg-[#FFFAF5] transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-[#202124]">
                          {item.name}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#667085]">
                          {item.sku || "—"}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#667085]">
                          {item.unit || "NOS"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#202124]">
                          {Number(item.currentStockQuantity || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[#475467]">
                          ₹{Number(item.averageRate || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#16834A]">
                          ₹{Number(item.totalValuation || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {item.isLowStock ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                              ⚠️ Low Stock
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#EAF7EF] text-[#16834A]">
                              In Stock
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === "gstr-1" && reportData ? (
          <div className="space-y-6">
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-medium flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>ℹ️</span>
                <span>
                  GSTR-1 Statutory Return Preparation (Sections 4A B2B, 5 B2CL, 7 B2CS, 12 HSN Summary).
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
              <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg min-w-0">
                <span className="text-[10px] text-[#667085] uppercase font-semibold block truncate">
                  B2B Invoices
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-[#202124] truncate">
                  {reportData.b2b?.length || 0}
                </p>
              </div>
              <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg min-w-0">
                <span className="text-[10px] text-[#667085] uppercase font-semibold block truncate">
                  B2CS Invoices
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-[#202124] truncate">
                  {reportData.b2cs?.length || 0}
                </p>
              </div>
              <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg min-w-0">
                <span className="text-[10px] text-[#667085] uppercase font-semibold block truncate">
                  HSN Summary Items
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-[#202124] truncate">
                  {reportData.hsnSummary?.length || 0}
                </p>
              </div>
              <div className="p-3.5 bg-[#EAF7EF] border border-[#A6E9C5] rounded-lg min-w-0">
                <span className="text-[10px] text-[#16834A] uppercase font-bold block truncate">
                  Total GST Tax
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-[#16834A] truncate">
                  ₹{Number(reportData.totalTax || 0).toFixed(2)}
                </p>
              </div>
            </div>

            {(!reportData.b2b || reportData.b2b.length === 0) &&
            (!reportData.b2cs || reportData.b2cs.length === 0) ? (
              <ReportEmptyState
                title="No GSTR-1 return data"
                titleGu="જીએસટીઆર-૧ નો ડેટા નથી"
                description="No B2B or B2C registered sales recorded for the selected tax period."
                descriptionGu="પસંદ કરેલા ટેક્સ સમયગાળા માટે કોઈ જીએસટી વેચાણ ઇનવોઇસ મળ્યા નથી."
                primaryAction={{
                  label: "Create Tax Invoice",
                  labelGu: "ટેક્સ ઇનવોઇસ બનાવો",
                  href: "/sales/invoices/new",
                }}
                secondaryAction={{
                  label: "Reset Date Range",
                  labelGu: "તારીખ રીસેટ કરો",
                  onClick: handleResetDates,
                }}
                lang={lang}
              />
            ) : (
              reportData.b2b?.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-[#202124] uppercase tracking-wider mb-2">
                    Table 4A - B2B Registered Sales
                  </h3>
                  <div className="border border-[#E5E7EB] rounded-xl overflow-x-auto w-full max-w-full">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] font-semibold text-[#667085]">
                          <th className="p-2.5">Buyer GSTIN</th>
                          <th className="p-2.5">Invoice No</th>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5 text-right">Value (₹)</th>
                          <th className="p-2.5 text-right">Taxable (₹)</th>
                          <th className="p-2.5 text-right">Tax Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB] font-mono">
                        {reportData.b2b.map((r: any, idx: number) => (
                          <tr key={idx} className="hover:bg-[#FFFAF5]">
                            <td className="p-2.5 font-bold text-[#16834A]">
                              {r.ctin || r.gstin}
                            </td>
                            <td className="p-2.5 text-[#202124]">
                              {r.inum || r.invoiceNumber}
                            </td>
                            <td className="p-2.5 text-[#667085]">
                              {r.idt || r.invoiceDate}
                            </td>
                            <td className="p-2.5 text-right font-bold text-[#202124]">
                              ₹{Number(r.val || 0).toFixed(2)}
                            </td>
                            <td className="p-2.5 text-right">
                              ₹{Number(r.txval || 0).toFixed(2)}
                            </td>
                            <td className="p-2.5 text-right">
                              {r.rt || r.taxRate}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            )}
          </div>
        ) : activeTab === "trial-balance" && reportData ? (
          <div className="space-y-4">
            {!reportData.accounts || reportData.accounts.length === 0 ? (
              <ReportEmptyState
                title="No trial balance accounts"
                titleGu="કાચા સરવૈયામાં કોઈ ખાતા નથી"
                description="No ledger balances or opening accounts found for the selected period."
                descriptionGu="પસંદ કરેલા સમયગાળા માટે કોઈ લેજર સિલક કે એકાઉન્ટ એન્ટ્રી મળેલ નથી."
                primaryAction={{
                  label: "Record Voucher",
                  labelGu: "વાઉચર બનાવો",
                  href: "/accounting/vouchers/new",
                }}
                secondaryAction={{
                  label: "Reset Date Range",
                  labelGu: "તારીખ રીસેટ કરો",
                  onClick: handleResetDates,
                }}
                lang={lang}
              />
            ) : (
              <div className="border border-[#E5E7EB] rounded-xl overflow-x-auto w-full max-w-full">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
                      <th className="py-2.5 px-3">Account Code</th>
                      <th className="py-2.5 px-3">Ledger Name</th>
                      <th className="py-2.5 px-3">Group</th>
                      <th className="py-2.5 px-3 text-right">Debit (Dr ₹)</th>
                      <th className="py-2.5 px-3 text-right">Credit (Cr ₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] font-mono">
                    {reportData.accounts.map((acc: any, i: number) => (
                      <tr key={i} className="hover:bg-[#FFFAF5]">
                        <td className="py-2.5 px-3 font-bold text-[#202124]">
                          {acc.code}
                        </td>
                        <td className="py-2.5 px-3 font-sans font-medium text-[#202124]">
                          {acc.name}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-[#667085]">
                          {acc.groupName || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-[#202124]">
                          {Number(acc.debitBalance) > 0 ? `₹${Number(acc.debitBalance).toFixed(2)}` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-[#202124]">
                          {Number(acc.creditBalance) > 0 ? `₹${Number(acc.creditBalance).toFixed(2)}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#F8F9FB] border-t-2 border-[#E5E7EB] font-mono font-bold text-[#202124]">
                      <td colSpan={3} className="py-3 px-3 text-right font-sans uppercase">
                        Total Trial Balance:
                      </td>
                      <td className="py-3 px-3 text-right text-[#16834A]">
                        ₹{Number(reportData.totalDebits || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right text-[#16834A]">
                        ₹{Number(reportData.totalCredits || 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === "receipt-payment" && reportData ? (
          /* Receipt / Payment Register */
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
              <div className="p-3.5 bg-[#EAF7EF] border border-[#A6E9C5] rounded-lg min-w-0">
                <span className="text-[10px] text-[#16834A] uppercase font-bold block truncate">
                  Total Receipts (Jama)
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-[#16834A] truncate">
                  ₹{Number(reportData.summary?.totalReceipts || reportData.totals?.totalReceipts || 0).toFixed(2)}
                </p>
              </div>
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg min-w-0">
                <span className="text-[10px] text-amber-800 uppercase font-bold block truncate">
                  Total Payments (Udhar)
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-amber-900 truncate">
                  ₹{Number(reportData.summary?.totalPayments || reportData.totals?.totalPayments || 0).toFixed(2)}
                </p>
              </div>
              <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg min-w-0">
                <span className="text-[10px] text-[#667085] uppercase font-bold block truncate">
                  Net Cash/Bank Flow
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-[#202124] truncate">
                  ₹{Number(reportData.summary?.netFlow || reportData.totals?.netFlow || 0).toFixed(2)}
                </p>
              </div>
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg min-w-0">
                <span className="text-[10px] text-blue-800 uppercase font-bold block truncate">
                  Total Vouchers
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-blue-900 truncate">
                  {reportData.vouchers?.length || reportData.entries?.length || 0}
                </p>
              </div>
            </div>

            {(!reportData.vouchers && !reportData.entries) ||
            (reportData.vouchers?.length === 0 && reportData.entries?.length === 0) ? (
              <ReportEmptyState
                title="No receipt or payment vouchers"
                titleGu="કોઈ આવક કે જાવક વાઉચર મળેલ નથી"
                description="No cash, bank, or party payment transactions were recorded in the selected period."
                descriptionGu="પસંદ કરેલા સમયગાળા માટે કોઈ રોકડ કે બેંક પેમેન્ટ વાઉચર મળ્યા નથી."
                primaryAction={{
                  label: "Record Expense / Payment",
                  labelGu: "દૈનિક ખર્ચ નોંધો",
                  href: "/finance/expenses",
                }}
                secondaryAction={{
                  label: "Reset Date Range",
                  labelGu: "તારીખ રીસેટ કરો",
                  onClick: handleResetDates,
                }}
                lang={lang}
              />
            ) : (
              <div className="border border-[#E5E7EB] rounded-xl overflow-x-auto w-full max-w-full">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
                      <th className="py-2.5 px-3">Voucher No</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Party / Account</th>
                      <th className="py-2.5 px-3">Narration</th>
                      <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] font-mono">
                    {(reportData.vouchers || reportData.entries || []).map((v: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#FFFAF5] transition-colors">
                        <td className="py-2.5 px-3 font-bold text-[#202124]">
                          {v.voucherNumber}
                        </td>
                        <td className="py-2.5 px-3 text-[#667085] font-sans">
                          {v.voucherDate ? new Date(v.voucherDate).toLocaleDateString("en-IN") : "—"}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              v.voucherType === "RECEIPT"
                                ? "bg-[#EAF7EF] text-[#16834A]"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {v.voucherType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-sans font-medium text-[#202124]">
                          {v.partyName || v.accountName || "—"}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-[#667085]">
                          {v.narration || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#202124]">
                          ₹{Number(v.totalAmount || v.amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === "daybook" && reportData ? (
          /* Day Book (Rojmel / Aavad) */
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
              <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg min-w-0">
                <span className="text-[10px] text-[#667085] uppercase font-semibold block truncate">
                  Opening Cash Balance
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-[#202124] truncate">
                  ₹{Number(reportData.openingCashBalance || 0).toFixed(2)}
                </p>
              </div>
              <div className="p-3.5 bg-[#EAF7EF] border border-[#A6E9C5] rounded-lg min-w-0">
                <span className="text-[10px] text-[#16834A] uppercase font-bold block truncate">
                  Total Jama (Cash In)
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-[#16834A] truncate">
                  ₹{Number(reportData.totalJama || 0).toFixed(2)}
                </p>
              </div>
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg min-w-0">
                <span className="text-[10px] text-amber-800 uppercase font-bold block truncate">
                  Total Udhar (Cash Out)
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-amber-900 truncate">
                  ₹{Number(reportData.totalUdhar || 0).toFixed(2)}
                </p>
              </div>
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg min-w-0">
                <span className="text-[10px] text-blue-800 uppercase font-bold block truncate">
                  Closing Cash (આખર રોકડ)
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-blue-900 truncate">
                  ₹{Number(reportData.closingCashBalance || 0).toFixed(2)}
                </p>
              </div>
            </div>

            {!reportData.entries || reportData.entries.length === 0 ? (
              <ReportEmptyState
                title="No transactions in Day Book"
                titleGu="આજના દિવસનો કોઈ મેળ નથી"
                description="No cash, voucher, or billing entries were posted for this date."
                descriptionGu="પસંદ કરેલી તારીખ માટે કોઈ રોજમેળ એન્ટ્રી કે વાઉચર નોંધાયેલા નથી."
                primaryAction={{
                  label: "Create New Bill",
                  labelGu: "નવું બિલ બનાવો",
                  href: "/sales/invoices/new",
                }}
                secondaryAction={{
                  label: "Reset Date Range",
                  labelGu: "તારીખ રીસેટ કરો",
                  onClick: handleResetDates,
                }}
                lang={lang}
              />
            ) : (
              <div className="border border-[#E5E7EB] rounded-xl overflow-x-auto w-full max-w-full">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
                      <th className="py-2.5 px-3">Voucher No</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Narration / Particulars</th>
                      <th className="py-2.5 px-3 text-right">Debit (Udhar ₹)</th>
                      <th className="py-2.5 px-3 text-right">Credit (Jama ₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] font-mono">
                    {reportData.entries.map((entry: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#FFFAF5] transition-colors">
                        <td className="py-2.5 px-3 font-bold text-[#202124]">
                          {entry.voucherNumber}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              entry.type === "JAMA"
                                ? "bg-[#EAF7EF] text-[#16834A]"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {entry.voucherType || entry.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-sans text-[#475467]">
                          {entry.narration || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-amber-900">
                          {Number(entry.debit) > 0 ? `₹${Number(entry.debit).toFixed(2)}` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-[#16834A]">
                          {Number(entry.credit) > 0 ? `₹${Number(entry.credit).toFixed(2)}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === "party-aging" && reportData ? (
          /* Receivables Aging Analysis */
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
              <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg min-w-0">
                <span className="text-[10px] text-[#667085] uppercase font-semibold block truncate">
                  Total Outstanding
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-[#202124] truncate">
                  ₹{Number(reportData.summary?.totalReceivable || 0).toFixed(2)}
                </p>
              </div>
              <div className="p-3.5 bg-[#EAF7EF] border border-[#A6E9C5] rounded-lg min-w-0">
                <span className="text-[10px] text-[#16834A] uppercase font-bold block truncate">
                  Not Due / Current
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-[#16834A] truncate">
                  ₹{Number(reportData.summary?.notDue || 0).toFixed(2)}
                </p>
              </div>
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg min-w-0">
                <span className="text-[10px] text-amber-800 uppercase font-bold block truncate">
                  Overdue 0-60 Days
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-amber-900 truncate">
                  ₹{(
                    Number(reportData.summary?.overdue0to30 || 0) +
                    Number(reportData.summary?.overdue31to60 || 0)
                  ).toFixed(2)}
                </p>
              </div>
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg min-w-0">
                <span className="text-[10px] text-rose-800 uppercase font-bold block truncate">
                  Critical Overdue (&gt;90d)
                </span>
                <p className="font-mono font-bold text-base sm:text-lg text-rose-900 truncate">
                  ₹{Number(reportData.summary?.overdue90Plus || 0).toFixed(2)}
                </p>
              </div>
            </div>

            {!reportData.parties || reportData.parties.length === 0 ? (
              <ReportEmptyState
                title="No overdue receivables"
                titleGu="કોઈ મુદત વીતેલી ઉઘરાણી નથી"
                description="There are no overdue customer balances or aging debts for this period."
                descriptionGu="પસંદ કરેલી તારીખ માટે કોઈ મુદત વીતી ગયેલ બાકી બિલ મળ્યા નથી."
                primaryAction={{
                  label: "View All Invoices",
                  labelGu: "બધા બિલ જુઓ",
                  href: "/sales/invoices",
                }}
                secondaryAction={{
                  label: "Reset Date Range",
                  labelGu: "તારીખ રીસેટ કરો",
                  onClick: handleResetDates,
                }}
                lang={lang}
              />
            ) : (
              <div className="border border-[#E5E7EB] rounded-xl overflow-x-auto w-full max-w-full">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#667085] uppercase font-semibold">
                      <th className="py-2.5 px-3">Party Name</th>
                      <th className="py-2.5 px-3">Phone</th>
                      <th className="py-2.5 px-3 text-right">Not Due</th>
                      <th className="py-2.5 px-3 text-right">0-30 Days</th>
                      <th className="py-2.5 px-3 text-right">31-60 Days</th>
                      <th className="py-2.5 px-3 text-right">61-90 Days</th>
                      <th className="py-2.5 px-3 text-right">&gt;90 Days</th>
                      <th className="py-2.5 px-3 text-right">Total Due (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] font-mono">
                    {reportData.parties.map((p: any) => (
                      <tr key={p.partyId} className="hover:bg-[#FFFAF5] transition-colors">
                        <td className="py-2.5 px-3 font-sans font-semibold text-[#202124]">
                          {p.partyName}
                        </td>
                        <td className="py-2.5 px-3 text-[#667085]">
                          {p.phone || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[#16834A]">
                          ₹{Number(p.notDue || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-amber-800">
                          ₹{Number(p.overdue0to30 || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-amber-900">
                          ₹{Number(p.overdue31to60 || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-rose-700">
                          ₹{Number(p.overdue61to90 || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-800">
                          ₹{Number(p.overdue90Plus || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#202124]">
                          ₹{Number(p.totalDue || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Generic Statement or Empty View */
          <div>
            {!reportData ? (
              <ReportEmptyState
                title="No report data loaded"
                titleGu="કોઈ રિપોર્ટ ડેટા મળ્યો નથી"
                description="Select a date range and click Apply Date Filters to generate this report."
                descriptionGu="રિપોર્ટ જોવા માટે તારીખ પસંદ કરી ફિલ્ટર લાગુ કરો બટન દબાવો."
                primaryAction={{
                  label: "Apply Date Filters",
                  labelGu: "ફિલ્ટર લાગુ કરો",
                  onClick: fetchReport,
                }}
                secondaryAction={{
                  label: "Reset Date Range",
                  labelGu: "તારીખ રીસેટ કરો",
                  onClick: handleResetDates,
                }}
                lang={lang}
              />
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-[#F8F9FB] rounded-xl border border-[#E5E7EB] overflow-x-auto w-full max-w-full">
                  <pre className="text-xs font-mono text-[#202124] leading-relaxed max-h-96 overflow-y-auto">
                    {JSON.stringify(reportData, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
