"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface TransactionItem {
  id: string;
  rawType: string;
  type: string;
  transactionNumber: string;
  partyName: string;
  partyId?: string;
  amount: number;
  paidAmount: number;
  unpaidAmount: number;
  status: "Paid" | "Partial" | "Unpaid" | "Completed" | "Cancelled" | "Issued";
  date: string;
  rawDate: number;
  link: string;
  hasSharedLedgerBadge?: boolean;
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

export default function AllTransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");

  // Date Filter State
  const [dateFilter, setDateFilter] = useState<DateFilterOption>("Last 365 Days");
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showCustomModal, setShowCustomModal] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<"date" | "amount">("date");
  const [sortAsc, setSortAsc] = useState(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Reset page to 1 when filters change
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleDateFilterSelect = (opt: DateFilterOption) => {
    if (opt === "Custom Date") {
      setShowCustomModal(true);
    } else {
      setDateFilter(opt);
      setPage(1);
    }
    setShowDateDropdown(false);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  // Compute date range strings
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

  // Load Transactions from API
  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = new URLSearchParams();
      if (startDate) q.set("startDate", startDate);
      if (endDate) q.set("endDate", endDate);
      if (search) q.set("search", search);
      if (selectedType !== "ALL") q.set("type", selectedType);
      q.set("page", String(page));
      q.set("limit", String(pageSize));
      q.set("sortBy", sortField);
      q.set("sortOrder", sortAsc ? "asc" : "desc");

      const res = await apiClient.get<{
        items: TransactionItem[];
        total: number;
        totalPages?: number;
      }>(`/dashboard/all-transactions?${q.toString()}`);

      if (res?.items) {
        setTransactions(res.items);
        const totalCount = res.total ?? res.items.length;
        setTotal(totalCount);
        setTotalPages(res.totalPages ?? Math.max(1, Math.ceil(totalCount / pageSize)));
      }
    } catch {
      setTransactions([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, search, selectedType, page, pageSize, sortField, sortAsc]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const toggleSort = (field: "date" | "amount") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
    setPage(1);
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const data = transactions.map((t) => ({
        Date: t.date,
        "Transaction Number": t.transactionNumber,
        Type: t.type,
        "Party Name": t.partyName,
        Amount: t.amount,
        Unpaid: t.unpaidAmount > 0 ? t.unpaidAmount : 0,
        Status: t.status,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Transactions");
      XLSX.writeFile(wb, `All_Transactions_${startDate || "period"}.xlsx`);
    } catch (e) {
      console.error("Export Excel error", e);
    }
  };

  // Export to PDF
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF("p", "pt", "a4");

      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, 595.28, 50, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("ALL TRANSACTIONS STATEMENT", 30, 32);

      const head = [["Date", "Txn Number", "Type", "Party Name", "Amount (₹)", "Status"]];
      const body = transactions.map((t) => [
        t.date || "-",
        t.transactionNumber || "-",
        t.type,
        t.partyName || "-",
        `₹ ${t.amount.toLocaleString("en-IN")}`,
        t.status,
      ]);

      autoTable(doc, {
        startY: 70,
        head,
        body,
        theme: "striped",
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
        styles: { fontSize: 8, cellPadding: 5 },
      });

      doc.save(`All_Transactions_${startDate || "period"}.pdf`);
    } catch (e) {
      console.error("Export PDF error", e);
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

  // Pagination Page Number Helpers
  const renderPaginationButtons = () => {
    const buttons = [];
    const maxVisible = 5;
    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          type="button"
          onClick={() => setPage(i)}
          className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            page === i
              ? "bg-indigo-600 text-white shadow-xs"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {i}
        </button>
      );
    }
    return buttons;
  };

  const startRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(total, page * pageSize);

  return (
    <div className="min-h-screen bg-[#f4f7fc] p-4 sm:p-6 font-sans antialiased text-slate-800">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            All Transactions
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View, track and export complete sales, purchases, payments, and expense transactions.
          </p>
        </div>

        {/* Action Buttons: Export & New */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>PDF</span>
          </button>

          <Link
            href="/sales/invoices/new"
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <span>+ Create Invoice</span>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar (Matches MyBillBook Search + Date Dropdown) */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-xs mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by Txn No, Party Name, Type..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-3 text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Date Filter Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDateDropdown(!showDateDropdown)}
            className="flex items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer w-full sm:w-auto"
          >
            <div className="flex items-center gap-2">
              <svg className="h-3.5 w-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{dateFilter}</span>
            </div>
            <svg className="h-3 w-3 text-slate-400 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown Options */}
          {showDateDropdown && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowDateDropdown(false)} />
              <div className="absolute right-0 top-11 z-30 w-52 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl max-h-80 overflow-y-auto">
                {dateFilterOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleDateFilterSelect(opt)}
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
      </div>

      {/* Main Table (1:1 Exact Match to MyBillBook columns: Date, Transaction Number, Type, Party Name, Amount) */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-600">
                <th
                  onClick={() => toggleSort("date")}
                  className="cursor-pointer py-3.5 px-4 hover:bg-slate-100/70 transition-colors w-36"
                >
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    <span className="text-slate-400">↕</span>
                  </div>
                </th>
                <th className="py-3.5 px-4 w-44">Transaction Number</th>
                <th className="py-3.5 px-4 w-40">Type</th>
                <th className="py-3.5 px-4">Party Name</th>
                <th
                  onClick={() => toggleSort("amount")}
                  className="cursor-pointer py-3.5 px-4 text-right hover:bg-slate-100/70 transition-colors w-40"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Amount</span>
                    <span className="text-slate-400">↕</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                      <span>Loading transactions...</span>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400">
                    No transactions found for the selected period.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Date */}
                    <td className="py-3 px-4 font-medium text-slate-600 whitespace-nowrap">
                      {tx.date || "-"}
                    </td>

                    {/* Transaction Number with Shared Ledger Badge if connected */}
                    <td className="py-3 px-4 font-mono font-medium text-slate-800 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={tx.link}
                          className="text-indigo-600 hover:underline font-bold"
                        >
                          {tx.transactionNumber}
                        </Link>
                        {tx.hasSharedLedgerBadge && (
                          <span
                            title="Connected to Shared Ledger"
                            className="inline-flex items-center text-[11px] text-blue-500"
                          >
                            <svg className="w-3.5 h-3.5 fill-blue-500" viewBox="0 0 24 24">
                              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                      {tx.type}
                    </td>

                    {/* Party Name */}
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {tx.partyName || "-"}
                    </td>

                    {/* Amount & Unpaid Info (Matches MyBillBook exact pattern) */}
                    <td className="py-3 px-4 text-right whitespace-nowrap font-medium">
                      <div className="font-bold text-slate-900">
                        ₹ {tx.amount.toLocaleString("en-IN")}
                      </div>
                      {tx.unpaidAmount > 0 && (
                        <div className="text-[11px] text-slate-500 font-normal">
                          (₹ {tx.unpaidAmount.toLocaleString("en-IN")} unpaid)
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ========================================================================= */}
        {/* PAGINATION BAR: Exact & Clean with Rows Per Page & Page Navigation         */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 bg-slate-50/70 px-4 py-3 gap-3 text-xs text-slate-600">
          {/* Record Count info */}
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="text-slate-900">{startRecord}</strong> - <strong className="text-slate-900">{endRecord}</strong> of <strong className="text-slate-900">{total}</strong> transactions
            </span>

            {/* Rows Per Page Selector */}
            <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-3">
              <span className="text-[11px] text-slate-500">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {[10, 15, 25, 50, 100].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Page Buttons */}
          <div className="flex items-center gap-1.5">
            {/* First Page */}
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage(1)}
              className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer text-xs font-bold"
              title="First Page"
            >
              «
            </button>

            {/* Prev Page */}
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1"
            >
              <span>‹</span>
              <span className="hidden sm:inline">Prev</span>
            </button>

            {/* Numbered Page Buttons */}
            <div className="flex items-center gap-1">
              {renderPaginationButtons()}
            </div>

            {/* Next Page */}
            <button
              type="button"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1"
            >
              <span className="hidden sm:inline">Next</span>
              <span>›</span>
            </button>

            {/* Last Page */}
            <button
              type="button"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage(totalPages)}
              className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer text-xs font-bold"
              title="Last Page"
            >
              »
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Custom Date Range */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">Select Date Range</h3>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
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
                onClick={() => setShowCustomModal(false)}
                className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!customStartDate || !customEndDate}
                onClick={() => {
                  setDateFilter("Custom Date");
                  setPage(1);
                  setShowCustomModal(false);
                }}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
