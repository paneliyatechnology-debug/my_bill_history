"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface SharedLedgerParty {
  id: string;
  name: string;
  nameGujarati?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  type: "CUSTOMER" | "SUPPLIER" | "BOTH";
  balance: number;
  status: "CONNECTED" | "INVITED" | "NOT_LINKED";
  token: string;
  portalUrl?: string;
}

interface TransactionItem {
  id: string;
  rawType: string;
  type: string;
  transactionNumber: string;
  date: string;
  rawDate: number;
  amount: number;
  debit: number;
  credit: number;
  paidAmount: number;
  status: "Completed" | "Partial" | "Unpaid" | "Cancelled";
  canConvertToPurchase: boolean;
  details?: {
    itemsCount?: number;
    dueDate?: string;
  };
}

interface SharedLedgerSettings {
  showSharedLedgersOfParties: boolean;
  allowPartiesToViewSharedLedger: boolean;
}

type DateFilterOption =
  | "Today"
  | "Yesterday"
  | "This Week"
  | "Last Week"
  | "Last 7 Days"
  | "This Month"
  | "Previous Month"
  | "This Quarter"
  | "Previous Quarter"
  | "This Financial Year"
  | "Previous Financial Year"
  | "Last 365 Days"
  | "Custom Date";

export default function SharedLedgerPage() {
  // Parties List state
  const [parties, setParties] = useState<SharedLedgerParty[]>([]);
  const [selectedParty, setSelectedParty] = useState<SharedLedgerParty | null>(null);
  const [searchParty, setSearchParty] = useState("");
  const [isLoadingParties, setIsLoadingParties] = useState(true);

  // Transactions state
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [sortField, setSortField] = useState<"date" | "amount">("date");
  const [sortAsc, setSortAsc] = useState(false);

  // Date Filter State
  const [dateFilter, setDateFilter] = useState<DateFilterOption>("Last 365 Days");
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);

  // Modals state
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showViewOnlyModal, setShowViewOnlyModal] = useState(false);
  const [showConvertToPurchaseModal, setShowConvertToPurchaseModal] = useState(false);
  const [selectedInvoiceToConvert, setSelectedInvoiceToConvert] = useState<TransactionItem | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // Settings
  const [settings, setSettings] = useState<SharedLedgerSettings>({
    showSharedLedgersOfParties: true,
    allowPartiesToViewSharedLedger: true,
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Fetch parties list
  const loadParties = useCallback(async () => {
    setIsLoadingParties(true);
    try {
      const res = await apiClient
        .get<{ items: SharedLedgerParty[] }>("/shared-ledger/parties", { limit: 100 })
        .catch(() => null);

      let items: SharedLedgerParty[] = res?.items || [];
      if (!items.length) {
        const fallbackRes: any = await apiClient
          .get("/masters/parties", { limit: 100 })
          .catch(() => apiClient.get("/parties").catch(() => null));
        const rawList = Array.isArray(fallbackRes)
          ? fallbackRes
          : fallbackRes?.items || fallbackRes?.data || [];
        items = rawList.map((p: any) => ({
          id: p.id,
          name: p.name,
          nameGujarati: p.nameGujarati,
          phone: p.phone,
          email: p.email,
          gstin: p.gstin,
          type: p.type || "CUSTOMER",
          balance: Number(p.balance || p.closingBalance || 0),
          status: "CONNECTED",
          token: p.id,
        }));
      }

      setParties(items);
      setSelectedParty((prev) => {
        if (prev) {
          const updated = items.find((it) => it.id === prev.id);
          return updated || prev;
        }
        return items[0] || null;
      });
    } catch {
      // silent fallback
    } finally {
      setIsLoadingParties(false);
    }
  }, []);

  // 2. Fetch settings
  const loadSettings = useCallback(async () => {
    try {
      const res = await apiClient.get<SharedLedgerSettings>("/shared-ledger/settings");
      if (res) {
        setSettings({
          showSharedLedgersOfParties: res.showSharedLedgersOfParties ?? true,
          allowPartiesToViewSharedLedger: res.allowPartiesToViewSharedLedger ?? true,
        });
      }
    } catch {
      // default kept
    }
  }, []);

  useEffect(() => {
    loadParties();
    loadSettings();
  }, [loadParties, loadSettings]);

  // Compute date range from selected filter
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const formatDateStr = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    switch (dateFilter) {
      case "Today":
        return { startDate: formatDateStr(today), endDate: formatDateStr(today) };
      case "Yesterday": {
        const yest = new Date(today.getTime() - 86400000);
        return { startDate: formatDateStr(yest), endDate: formatDateStr(yest) };
      }
      case "This Week": {
        const dayOfWeek = today.getDay();
        const startOfWeek = new Date(today.getTime() - dayOfWeek * 86400000);
        return { startDate: formatDateStr(startOfWeek), endDate: formatDateStr(today) };
      }
      case "Last Week": {
        const dayOfWeek = today.getDay();
        const endOfLastWeek = new Date(today.getTime() - (dayOfWeek + 1) * 86400000);
        const startOfLastWeek = new Date(endOfLastWeek.getTime() - 6 * 86400000);
        return { startDate: formatDateStr(startOfLastWeek), endDate: formatDateStr(endOfLastWeek) };
      }
      case "Last 7 Days": {
        const sevenAgo = new Date(today.getTime() - 7 * 86400000);
        return { startDate: formatDateStr(sevenAgo), endDate: formatDateStr(today) };
      }
      case "This Month": {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        return { startDate: formatDateStr(firstDay), endDate: formatDateStr(today) };
      }
      case "Previous Month": {
        const firstPrev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastPrev = new Date(today.getFullYear(), today.getMonth(), 0);
        return { startDate: formatDateStr(firstPrev), endDate: formatDateStr(lastPrev) };
      }
      case "This Quarter": {
        const currentQuarter = Math.floor(today.getMonth() / 3);
        const firstDay = new Date(today.getFullYear(), currentQuarter * 3, 1);
        return { startDate: formatDateStr(firstDay), endDate: formatDateStr(today) };
      }
      case "Previous Quarter": {
        const currentQuarter = Math.floor(today.getMonth() / 3);
        const firstPrev = new Date(today.getFullYear(), (currentQuarter - 1) * 3, 1);
        const lastPrev = new Date(today.getFullYear(), currentQuarter * 3, 0);
        return { startDate: formatDateStr(firstPrev), endDate: formatDateStr(lastPrev) };
      }
      case "This Financial Year": {
        const fyStartYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
        const fyStart = new Date(fyStartYear, 3, 1);
        return { startDate: formatDateStr(fyStart), endDate: formatDateStr(today) };
      }
      case "Previous Financial Year": {
        const fyStartYear = (today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1) - 1;
        const fyStart = new Date(fyStartYear, 3, 1);
        const fyEnd = new Date(fyStartYear + 1, 2, 31);
        return { startDate: formatDateStr(fyStart), endDate: formatDateStr(fyEnd) };
      }
      case "Custom Date":
        return { startDate: customStartDate, endDate: customEndDate };
      case "Last 365 Days":
      default: {
        const yearAgo = new Date(today.getTime() - 365 * 86400000);
        return { startDate: formatDateStr(yearAgo), endDate: formatDateStr(today) };
      }
    }
  }, [dateFilter, customStartDate, customEndDate]);

  // 3. Load transactions for selected party
  const loadTransactions = useCallback(async () => {
    if (!selectedParty) {
      setTransactions([]);
      return;
    }
    setIsLoadingTransactions(true);
    try {
      const q = new URLSearchParams();
      if (startDate) q.set("startDate", startDate);
      if (endDate) q.set("endDate", endDate);
      q.set("sortBy", sortField);
      q.set("sortOrder", sortAsc ? "asc" : "desc");

      const res = await apiClient.get<{
        party: SharedLedgerParty;
        transactions: TransactionItem[];
      }>(`/shared-ledger/parties/${selectedParty.id}/transactions?${q.toString()}`);

      if (res?.transactions) {
        setTransactions(res.transactions);
      }
    } catch {
      // fallback to public portal endpoint if specific route not loaded
      apiClient
        .get<{ transactions: any[] }>(`/shared-ledger/public/${selectedParty.token}`)
        .then((pubRes) => {
          const list = (pubRes?.transactions || []).map((t: any) => ({
            id: t.id,
            rawType: t.rawType || t.type,
            type:
              t.type === "SALES_INVOICE"
                ? "Sales Invoices"
                : t.type === "PURCHASE_INVOICE"
                ? "Purchase Invoices"
                : t.type === "DELIVERY_CHALLAN"
                ? "Delivery Challan"
                : t.type === "PAYMENT_IN"
                ? "Payment In"
                : "Transaction",
            transactionNumber: t.voucherNumber || t.id.slice(0, 8),
            date: t.date ? String(t.date).slice(0, 10) : "",
            rawDate: t.date ? new Date(t.date).getTime() : 0,
            amount: Number(t.amount || t.debit || t.credit || 0),
            debit: Number(t.debit || 0),
            credit: Number(t.credit || 0),
            paidAmount: Number(t.paidAmount || 0),
            status: (Number(t.paidAmount || 0) >= Number(t.amount || 0) ? "Completed" : Number(t.paidAmount || 0) > 0 ? "Partial" : "Unpaid") as "Completed" | "Partial" | "Unpaid",
            canConvertToPurchase: t.type === "SALES_INVOICE",
          }));
          setTransactions(list);
        })
        .catch(() => {
          setTransactions([]);
        });
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [selectedParty?.id, selectedParty?.token, startDate, endDate, sortField, sortAsc]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Filter parties by search
  const filteredParties = useMemo(() => {
    if (!searchParty.trim()) return parties;
    const s = searchParty.toLowerCase().trim();
    return parties.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        (p.phone && p.phone.includes(s)) ||
        (p.gstin && p.gstin.toLowerCase().includes(s))
    );
  }, [parties, searchParty]);

  // Handle Sort Toggle
  const toggleSort = (field: "date" | "amount") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Handle Save Settings
  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await apiClient.post("/shared-ledger/settings", settings);
      showToast("Settings updated successfully!");
      setShowSettingsModal(false);
    } catch {
      showToast("Failed to save settings. Please try again.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Handle Convert To Purchase
  const handleConfirmConvertToPurchase = async () => {
    if (!selectedInvoiceToConvert) return;
    setIsConverting(true);
    try {
      const res = await apiClient.post<{
        success: boolean;
        alreadyConverted?: boolean;
        message?: string;
        purchaseInvoiceId?: string;
      }>("/shared-ledger/convert-to-purchase", {
        invoiceId: selectedInvoiceToConvert.id,
      });

      if (res?.success) {
        showToast(res.message || "Invoice successfully converted to purchase!");
        setShowConvertToPurchaseModal(false);
        loadTransactions();
      } else {
        showToast("Could not convert invoice. Please try again.");
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to convert sales invoice to purchase.");
    } finally {
      setIsConverting(false);
    }
  };

  // Export PDF Ledger
  const handleDownloadPDF = () => {
    if (!selectedParty) return;
    try {
      const doc = new jsPDF("p", "pt", "a4");

      // Header
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, 595.28, 60, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("SHARED LEDGER STATEMENT", 40, 38);

      // Party Info
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`Party: ${selectedParty.name}`, 40, 85);
      doc.setFont("helvetica", "normal");
      doc.text(`Type: ${selectedParty.type}`, 40, 102);
      if (selectedParty.phone) doc.text(`Phone: ${selectedParty.phone}`, 40, 119);
      if (selectedParty.gstin) doc.text(`GSTIN: ${selectedParty.gstin}`, 40, 136);

      doc.setFont("helvetica", "bold");
      doc.text(`Date Range: ${dateFilter} (${startDate || "All"} to ${endDate || "Now"})`, 340, 85);
      doc.setTextColor(22, 163, 74);
      doc.text(
        `Closing Balance: ₹ ${selectedParty.balance.toLocaleString("en-IN")}`,
        340,
        105
      );
      doc.setTextColor(15, 23, 42);

      // Table
      const head = [["Date", "Transaction Type", "Number", "Amount (₹)", "Status"]];
      const body = transactions.map((t) => [
        t.date || "-",
        t.type,
        t.transactionNumber || "-",
        `₹ ${t.amount.toLocaleString("en-IN")}`,
        t.status,
      ]);

      autoTable(doc, {
        startY: 155,
        head,
        body,
        theme: "striped",
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 6 },
      });

      doc.save(`SharedLedger_${selectedParty.name.replace(/\s+/g, "_")}_${startDate}.pdf`);
      showToast("PDF Statement downloaded successfully!");
      setShowDownloadModal(false);
    } catch {
      showToast("Failed to generate PDF. Retrying...");
    }
  };

  // Export Excel / CSV Ledger
  const handleDownloadExcel = () => {
    if (!selectedParty) return;
    try {
      const data = transactions.map((t) => ({
        Date: t.date,
        "Transaction Type": t.type,
        "Transaction Number": t.transactionNumber,
        "Amount (INR)": t.amount,
        Status: t.status,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "SharedLedger");
      XLSX.writeFile(
        wb,
        `SharedLedger_${selectedParty.name.replace(/\s+/g, "_")}_${startDate}.xlsx`
      );
      showToast("Excel spreadsheet downloaded successfully!");
      setShowDownloadModal(false);
    } catch {
      showToast("Failed to generate Excel file.");
    }
  };

  const dateFilterOptions: DateFilterOption[] = [
    "Today",
    "Yesterday",
    "This Week",
    "Last Week",
    "Last 7 Days",
    "This Month",
    "Previous Month",
    "This Quarter",
    "Previous Quarter",
    "This Financial Year",
    "Previous Financial Year",
    "Last 365 Days",
    "Custom Date",
  ];

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#f4f7fc] font-sans antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-2xl transition-all">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEFT COLUMN: PARTY SELECTOR & SETTINGS (Matches MyBillBook Left Pane)      */}
      {/* ========================================================================= */}
      <div className="flex w-80 lg:w-[350px] shrink-0 flex-col border-r border-slate-200 bg-white shadow-xs">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 pb-3">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">SharedLedger</h2>

          <div className="flex items-center gap-2">
            {/* How it Works Button */}
            <button
              type="button"
              onClick={() => setShowHowItWorksModal(true)}
              className="flex items-center gap-1.5 rounded-full border border-blue-500 bg-blue-50/60 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100/70 transition-colors shadow-2xs cursor-pointer"
            >
              <svg className="h-3.5 w-3.5 fill-blue-600" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span>How it Works?</span>
            </button>

            {/* Settings Gear Button */}
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              title="SharedLedger Settings"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 pb-2 border-b border-slate-100">
          <div className="relative">
            <svg
              className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchParty}
              onChange={(e) => setSearchParty(e.target.value)}
              placeholder="Search by Party Name or Number"
              className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-3 text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Parties Scrollable List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoadingParties ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mb-2" />
              <span className="text-xs">Loading parties...</span>
            </div>
          ) : filteredParties.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No parties found.
            </div>
          ) : (
            filteredParties.map((party) => {
              const isSelected = selectedParty?.id === party.id;
              const isExpecting = party.type === "CUSTOMER";
              return (
                <div
                  key={party.id}
                  onClick={() => setSelectedParty(party)}
                  className={`relative cursor-pointer rounded-xl p-3.5 transition-all ${
                    isSelected
                      ? "border border-indigo-500 bg-indigo-50/40 shadow-xs"
                      : "border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {/* Party Name + Orange Plane Icon */}
                    <div className="flex items-center gap-1.5 overflow-hidden pr-2">
                      <span className="truncate text-xs font-bold text-slate-800">
                        {party.name}
                      </span>
                      {/* Orange paper plane badge */}
                      <svg
                        className="h-3.5 w-3.5 shrink-0 text-amber-500 fill-amber-500"
                        viewBox="0 0 24 24"
                      >
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                      </svg>
                    </div>

                    {/* Balance with Arrow */}
                    <div className="flex shrink-0 items-center gap-1 text-xs font-bold text-emerald-600">
                      <span>₹ {Math.round(party.balance).toLocaleString("en-IN")}</span>
                      <span className="text-[11px] font-extrabold">
                        {party.balance >= 0 ? "↓" : "↑"}
                      </span>
                    </div>
                  </div>

                  {/* Subtitle row */}
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>
                      {isExpecting
                        ? "Customer • you are expecting"
                        : "Supplier • is expecting"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT COLUMN: SHARED LEDGER DETAIL VIEW (Matches MyBillBook Right Pane)   */}
      {/* ========================================================================= */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {selectedParty ? (
          <>
            {/* Header Row */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-800">SharedLedger</h1>
                <div className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-600">
                  <svg
                    className="h-4 w-4 text-slate-700"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                  <span>
                    Ledger Created by {selectedParty.name} connecting to our business
                  </span>
                </div>
              </div>

              {/* View Only Mode Button */}
              <button
                type="button"
                onClick={() => setShowViewOnlyModal(true)}
                className="flex items-center gap-1.5 rounded bg-slate-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
              >
                <span>View Only Mode</span>
              </button>
            </div>

            {/* Party Details Card */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-700">
                <svg
                  className="h-4 w-4 text-slate-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span>Party Details</span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Party Name */}
                <div>
                  <div className="text-[11px] font-medium text-slate-500">Party Name</div>
                  <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-800">
                    <span>{selectedParty.name}</span>
                    <svg
                      className="h-3.5 w-3.5 shrink-0 text-amber-500 fill-amber-500"
                      viewBox="0 0 24 24"
                    >
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </div>
                </div>

                {/* Balance */}
                <div>
                  <div className="text-[11px] font-medium text-slate-500">Balance</div>
                  <div className="mt-1 flex items-center gap-1 text-sm font-bold text-emerald-600">
                    <span className="text-xs">↓</span>
                    <span>₹ {Math.round(selectedParty.balance).toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {/* Party Type */}
                <div>
                  <div className="text-[11px] font-medium text-slate-500">Party Type</div>
                  <div className="mt-1 text-sm font-semibold text-slate-700">
                    {selectedParty.type === "CUSTOMER"
                      ? "Customer"
                      : selectedParty.type === "SUPPLIER"
                      ? "Supplier"
                      : "Customer & Supplier"}
                  </div>
                </div>
              </div>
            </div>

            {/* Filter & Action Row */}
            <div className="relative flex items-center justify-between pt-1">
              {/* Date Filter Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDateDropdown(!showDateDropdown)}
                  className="flex items-center gap-2 rounded-lg border border-indigo-400 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
                >
                  <svg
                    className="h-3.5 w-3.5 text-indigo-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>{dateFilter}</span>
                  <svg
                    className="h-3 w-3 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showDateDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setShowDateDropdown(false)}
                    />
                    <div className="absolute left-0 top-10 z-30 w-52 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl max-h-80 overflow-y-auto">
                      {dateFilterOptions.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            if (opt === "Custom Date") {
                              setShowCustomDateModal(true);
                            } else {
                              setDateFilter(opt);
                            }
                            setShowDateDropdown(false);
                          }}
                          className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
                            dateFilter === opt
                              ? "bg-indigo-50 text-indigo-600 font-bold"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Download Ledger Button */}
              <button
                type="button"
                onClick={() => setShowDownloadModal(true)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
              >
                <svg
                  className="h-3.5 w-3.5 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span>Download Ledger</span>
              </button>
            </div>

            {/* Transactions Table */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-600">
                    <th
                      onClick={() => toggleSort("date")}
                      className="cursor-pointer py-3 px-4 hover:bg-slate-100/70 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Date</span>
                        <span className="text-slate-400">↕</span>
                      </div>
                    </th>
                    <th className="py-3 px-4">Transaction Type</th>
                    <th className="py-3 px-4">Transaction Number</th>
                    <th
                      onClick={() => toggleSort("amount")}
                      className="cursor-pointer py-3 px-4 hover:bg-slate-100/70 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Amount</span>
                        <span className="text-slate-400">↕</span>
                      </div>
                    </th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {isLoadingTransactions ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                          <span>Loading ledger transactions...</span>
                        </div>
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No transactions recorded in this period.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-slate-600">
                          {tx.date || "-"}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {tx.type}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                          {tx.transactionNumber || "-"}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          ₹ {tx.amount.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              tx.status === "Completed"
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                : tx.status === "Partial"
                                ? "bg-amber-50 text-amber-600 border border-amber-100"
                                : "bg-rose-50 text-rose-600 border border-rose-100"
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {tx.canConvertToPurchase ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedInvoiceToConvert(tx);
                                setShowConvertToPurchaseModal(true);
                              }}
                              className="inline-flex items-center gap-1.5 font-bold text-xs text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                            >
                              <svg
                                className="h-4 w-4 text-indigo-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                              <span>Convert to Purchase</span>
                            </button>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <svg
              className="h-12 w-12 text-slate-300 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="text-sm font-semibold text-slate-600">Select a party to view their SharedLedger</p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: SETTINGS (Exact 2 toggles from MyBillBook)                       */}
      {/* ========================================================================= */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                SharedLedger Settings
              </h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Toggle 1: Show SharedLedgers of my Parties */}
              <div className="flex items-start justify-between rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-indigo-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      Show SharedLedgers of my Parties
                    </h4>
                    <p className="mt-0.5 text-[11px] text-slate-500 leading-normal">
                      You will see SharedLedgers of all the parties in your account. Changes won't affect.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSettings((s) => ({
                      ...s,
                      showSharedLedgersOfParties: !s.showSharedLedgersOfParties,
                    }))
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.showSharedLedgersOfParties ? "bg-indigo-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.showSharedLedgersOfParties ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 2: Allow Parties to view your SharedLedger */}
              <div className="flex items-start justify-between rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-indigo-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      Allow Parties to view your SharedLedger
                    </h4>
                    <p className="mt-0.5 text-[11px] text-slate-500 leading-normal">
                      You parties can see your ledgers in relation to them in their account. Changes won't affect.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSettings((s) => ({
                      ...s,
                      allowPartiesToViewSharedLedger: !s.allowPartiesToViewSharedLedger,
                    }))
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.allowPartiesToViewSharedLedger ? "bg-indigo-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.allowPartiesToViewSharedLedger ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isSavingSettings ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: HOW IT WORKS (Exact Modal from MyBillBook)                       */}
      {/* ========================================================================= */}
      {showHowItWorksModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                How does SharedLedgers work?
              </h3>
              <button
                type="button"
                onClick={() => setShowHowItWorksModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Video Walkthrough Mockup / Player */}
            <div className="relative aspect-video w-full bg-slate-950 flex flex-col items-center justify-center text-white overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent" />

              <div className="relative z-10 text-center px-6">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600/90 text-white shadow-lg shadow-indigo-600/50 hover:scale-105 transition-transform cursor-pointer">
                  <svg className="h-8 w-8 fill-white ml-1" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold">Shared Ledger Web Walkthrough</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Watch how real-time bills, payments, and settlements keep books 100% matched.
                </p>
              </div>

              {/* Progress bar mock */}
              <div className="absolute bottom-3 left-4 right-4 flex items-center gap-3 text-[11px] text-slate-400">
                <span>0:00 / 2:15</span>
                <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div className="w-1/3 h-full bg-indigo-500 rounded-full" />
                </div>
              </div>
            </div>

            {/* Content & Checkpoints */}
            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  SharedLedger: One ledger. Seen by both you and your party.
                </h4>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  SharedLedger lets you and your customer or supplier view the same running ledger — invoices, payments, and balance — all in one place.
                </p>
              </div>

              <div className="space-y-2.5 pt-1">
                <div className="flex items-center gap-2.5 text-xs text-slate-700">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span>Maintain matching balance and ledger between you and your customer or supplier</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-slate-700">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span>Automatically sync updates in real time</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-slate-700">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span>Convert Sales Invoices to Purchases in a few easy steps</span>
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowHowItWorksModal(false)}
                  className="rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
                >
                  View SharedLedgers
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CONVERT TO PURCHASE (Exact Modal from MyBillBook)                 */}
      {/* ========================================================================= */}
      {showConvertToPurchaseModal && selectedInvoiceToConvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Turn your supplier's sales invoice into a purchase — instantly
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] font-semibold text-amber-600">✨ Powered by Mira AI</span>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      ● Live on Android
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                      Coming Soon on iOS
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowConvertToPurchaseModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              {/* Left Column: Phone mockup with QR Code */}
              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/50 p-6 text-center">
                <div className="rounded-2xl border-2 border-slate-800 bg-white p-4 shadow-md">
                  {/* QR Image Mock */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      "https://mybillbook.in/app/home/shared-ledger"
                    )}`}
                    alt="Scan QR to open SharedLedger in app"
                    className="h-44 w-44"
                  />
                </div>
                <h5 className="mt-4 text-xs font-bold text-slate-800">
                  Scan this code with your phone camera
                </h5>
                <p className="mt-1 text-[11px] text-slate-500">
                  Opens SharedLedger in your myBillBook app (or helps you install it)
                </p>

                {/* How it works steps */}
                <div className="mt-5 w-full rounded-xl bg-white p-3.5 border border-slate-200/80 text-left space-y-2">
                  <h6 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                    How it works?
                  </h6>
                  <div className="flex items-center gap-2 text-[11px] text-slate-600">
                    <span className="text-indigo-600 font-bold">1.</span>
                    <span>Select an invoice from SharedLedger and Convert</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-600">
                    <span className="text-indigo-600 font-bold">2.</span>
                    <span>Details filled automatically - no typing</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-600">
                    <span className="text-indigo-600 font-bold">3.</span>
                    <span>Review & save</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Benefits, Video Demo & Direct Web Conversion */}
              <div className="flex flex-col justify-between space-y-4">
                {/* 3 Metric cards */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                    <div className="text-indigo-600 font-extrabold text-sm">⚡ 3x Faster</div>
                    <div className="mt-1 text-[10px] text-slate-500">than Manual entry</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                    <div className="text-indigo-600 font-extrabold text-sm">⏱ ~30 mins</div>
                    <div className="mt-1 text-[10px] text-slate-500">Saved Per Invoice</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                    <div className="text-indigo-600 font-extrabold text-sm">📖 1 Ledger</div>
                    <div className="mt-1 text-[10px] text-slate-500">2 Books in Sync</div>
                  </div>
                </div>

                {/* Selected Invoice Details */}
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                  <div className="text-xs font-bold text-slate-800">
                    Converting Invoice #{selectedInvoiceToConvert.transactionNumber}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
                    <span>Date: {selectedInvoiceToConvert.date}</span>
                    <span className="font-bold text-slate-900">
                      Amount: ₹ {selectedInvoiceToConvert.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Web Conversion Action */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleConfirmConvertToPurchase}
                    disabled={isConverting}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <span>⚡ Convert on Web Now</span>
                    {isConverting && (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    )}
                  </button>
                  <p className="mt-2 text-center text-[10px] text-slate-400">
                    Creates an exact purchase entry with mapped line items & GST in your purchase ledger.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: VIEW ONLY MODE INFO                                              */}
      {/* ========================================================================= */}
      {showViewOnlyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔒</span>
                <h3 className="text-base font-bold text-slate-900">View Only Mode</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowViewOnlyModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This shared ledger is displayed in <strong>View Only Mode</strong> to ensure mutual integrity. Invoices, delivery challans, and payment receipts recorded in your standard billing reflect here automatically in real time.
            </p>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-emerald-600">✓</span>
                <span>Both parties always see identical balances</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-600">✓</span>
                <span>Zero unilateral invoice tampering</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-600">✓</span>
                <span>Direct 1-click conversion to purchase bills</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowViewOnlyModal(false)}
              className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: DOWNLOAD LEDGER (PDF / Excel)                                    */}
      {/* ========================================================================= */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Download Shared Ledger</h3>
              <button
                type="button"
                onClick={() => setShowDownloadModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Select your preferred export format for <strong>{selectedParty?.name}</strong> (Range: {dateFilter}):
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="flex flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50/50 p-4 hover:bg-rose-100/70 transition-colors cursor-pointer"
              >
                <span className="text-2xl mb-1">📄</span>
                <span className="text-xs font-bold text-rose-700">PDF Statement</span>
                <span className="text-[10px] text-slate-500">Official statement</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadExcel}
                className="flex flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 hover:bg-emerald-100/70 transition-colors cursor-pointer"
              >
                <span className="text-2xl mb-1">📊</span>
                <span className="text-xs font-bold text-emerald-700">Excel (.xlsx)</span>
                <span className="text-[10px] text-slate-500">Spreadsheet file</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: CUSTOM DATE RANGE SELECTOR                                       */}
      {/* ========================================================================= */}
      {showCustomDateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Custom Date Range</h3>
              <button
                type="button"
                onClick={() => setShowCustomDateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">From Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">To Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCustomDateModal(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!customStartDate || !customEndDate}
                onClick={() => {
                  setDateFilter("Custom Date");
                  setShowCustomDateModal(false);
                }}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
