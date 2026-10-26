"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { apiClient, extractList } from "@/lib/api-client";
import { Modal } from "@/components/ui/modal";

const DEFAULT_EXPENSE_CATEGORIES = [
  "Bank Fee and Charges",
  "Employee Salaries & Advances",
  "Printing and Stationery",
  "Raw Material",
  "Rent Expense",
  "Repair & Maintenance",
  "Telephone & Internet Expense",
  "Travel Expense",
  "Office Expenses",
  "Tea & Refreshment",
  "Advertising & Marketing",
  "Freight & Cartage",
  "Electricity & Power",
  "Legal & Professional Fees",
  "Miscellaneous Expenses",
];

interface JournalLine {
  id: string;
  debitAmount: number;
  creditAmount: number;
  lineNarration?: string;
  account?: {
    id: string;
    code: string;
    name: string;
    nameGujarati?: string;
    group?: {
      name: string;
      nature: string;
    };
  };
}

interface Voucher {
  id: string;
  voucherType: "JOURNAL" | "RECEIPT" | "PAYMENT" | "CONTRA" | "SALES" | "PURCHASE";
  voucherNumber: string;
  voucherDate: string;
  totalAmount: number;
  narration?: string;
  referenceNo?: string;
  isCancelled: boolean;
  cancelledReason?: string;
  journalEntries?: JournalLine[];
  lines?: JournalLine[];
}

interface LedgerAccount {
  id: string;
  code: string;
  name: string;
  nameGujarati?: string;
  groupId: string;
  currentBalance?: number;
  group?: {
    name: string;
    nature: string;
  };
}

interface Party {
  id: string;
  name: string;
  nameGujarati?: string;
  mobile?: string;
}

export default function ExpensesPage() {
  const router = useRouter();
  const { lang, tenantContext, currentCompany } = useAuth();

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [ledgers, setLedgers] = useState<LedgerAccount[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters matching MyBillBook
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRangeFilter, setDateRangeFilter] = useState<
    "LAST_365" | "TODAY" | "YESTERDAY" | "THIS_WEEK" | "THIS_MONTH" | "THIS_QUARTER" | "THIS_YEAR" | "ALL"
  >("LAST_365");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [sortField, setSortField] = useState<"date" | "amount">("date");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Menus and Modals
  const [isReportsMenuOpen, setIsReportsMenuOpen] = useState(false);
  const reportsMenuRef = useRef<HTMLDivElement>(null);
  const [isManageCategoryModalOpen, setIsManageCategoryModalOpen] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState<"list" | "add" | "edit">("list");
  const [editingCategoryOldName, setEditingCategoryOldName] = useState("");
  const [newCategoryNameInput, setNewCategoryNameInput] = useState("");

  // Action Menu & Modals
  const [actionMenuVoucherId, setActionMenuVoucherId] = useState<string | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [reversalTarget, setReversalTarget] = useState<Voucher | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [isReversing, setIsReversing] = useState(false);
  const [reversalError, setReversalError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load custom categories from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mybill_expense_categories");
      if (saved) {
        setCustomCategories(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const updateCustomCategories = (newList: string[]) => {
    setCustomCategories(newList);
    try {
      localStorage.setItem("mybill_expense_categories", JSON.stringify(newList));
    } catch {
      // ignore
    }
  };

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (reportsMenuRef.current && !reportsMenuRef.current.contains(e.target as Node)) {
        setIsReportsMenuOpen(false);
      }
      if (!(e.target as Element).closest(".action-menu-container")) {
        setActionMenuVoucherId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [vouchersRes, ledgersRes, partiesRes]: any = await Promise.all([
        apiClient.get("/vouchers", { voucherType: "PAYMENT" }).catch(() => []),
        apiClient.get("/ledgers").catch(() => []),
        apiClient.get("/parties").catch(() => []),
      ]);

      const vList = extractList<Voucher>(vouchersRes);
      const lList = extractList<LedgerAccount>(ledgersRes);
      const pList = extractList<Party>(partiesRes);

      setVouchers(vList);
      setLedgers(lList);
      setParties(pList);
    } catch (err: any) {
      setError(err.message || "Failed to load expenses data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived expense ledgers
  const expenseAccounts = useMemo(() => {
    return ledgers.filter(
      (l) =>
        l.group?.nature === "EXPENSE" ||
        l.group?.name?.toLowerCase().includes("expense") ||
        l.name.toLowerCase().includes("expense") ||
        l.name.toLowerCase().includes("charge") ||
        l.name.toLowerCase().includes("salary") ||
        l.name.toLowerCase().includes("rent") ||
        l.name.toLowerCase().includes("fuel") ||
        l.name.toLowerCase().includes("tea")
    );
  }, [ledgers]);

  // All combined categories
  const allCategories = useMemo(() => {
    const fromLedgers = expenseAccounts.map((a) => a.name);
    return Array.from(
      new Set([...DEFAULT_EXPENSE_CATEGORIES, ...fromLedgers, ...customCategories])
    ).sort();
  }, [expenseAccounts, customCategories]);

  // Helper to extract voucher details
  const getVoucherDetails = (v: Voucher) => {
    const lines = v.journalEntries || v.lines || [];
    const expenseLine = lines.find((l) => Number(l.debitAmount) > 0);
    const paymentLine = lines.find((l) => Number(l.creditAmount) > 0);

    // Extract party name from narration or reference
    let partyName = "-";
    if (v.narration && v.narration.includes("Party:")) {
      const match = v.narration.match(/Party:\s*([^;|,\n]+)/);
      if (match) partyName = match[1].trim();
    }

    let categoryName = expenseLine?.account?.name || "General Expense";
    if (v.narration) {
      // Check if narration starts with a category name
      for (const cat of allCategories) {
        if (v.narration.includes(cat)) {
          categoryName = cat;
          break;
        }
      }
    }

    return {
      expenseAccount: expenseLine?.account,
      paymentAccount: paymentLine?.account,
      partyName,
      categoryName,
      amount: expenseLine ? Number(expenseLine.debitAmount) : v.totalAmount,
    };
  };

  // Filter & sort vouchers
  const filteredVouchers = useMemo(() => {
    const now = new Date();

    return vouchers
      .filter((v) => {
        if (v.voucherType !== "PAYMENT") return false;

        const details = getVoucherDetails(v);

        // Search
        if (searchTerm.trim()) {
          const s = searchTerm.toLowerCase();
          const matchesNo = v.voucherNumber?.toLowerCase().includes(s);
          const matchesNarration = v.narration?.toLowerCase().includes(s);
          const matchesRef = v.referenceNo?.toLowerCase().includes(s);
          const matchesCategory = details.categoryName?.toLowerCase().includes(s);
          const matchesParty = details.partyName?.toLowerCase().includes(s);
          if (!matchesNo && !matchesNarration && !matchesRef && !matchesCategory && !matchesParty) {
            return false;
          }
        }

        // Category Filter
        if (categoryFilter !== "ALL") {
          if (
            details.categoryName !== categoryFilter &&
            details.expenseAccount?.id !== categoryFilter &&
            details.expenseAccount?.name !== categoryFilter
          ) {
            return false;
          }
        }

        // Date Range Filter
        if (v.voucherDate) {
          const vDate = new Date(v.voucherDate);
          if (dateRangeFilter === "TODAY") {
            const todayStr = now.toISOString().split("T")[0];
            const vStr = vDate.toISOString().split("T")[0];
            if (todayStr !== vStr) return false;
          } else if (dateRangeFilter === "YESTERDAY") {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            const yStr = yesterday.toISOString().split("T")[0];
            const vStr = vDate.toISOString().split("T")[0];
            if (yStr !== vStr) return false;
          } else if (dateRangeFilter === "THIS_WEEK") {
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            if (vDate < startOfWeek) return false;
          } else if (dateRangeFilter === "THIS_MONTH") {
            if (vDate.getMonth() !== now.getMonth() || vDate.getFullYear() !== now.getFullYear()) {
              return false;
            }
          } else if (dateRangeFilter === "THIS_QUARTER") {
            const currentQuarter = Math.floor(now.getMonth() / 3);
            const vQuarter = Math.floor(vDate.getMonth() / 3);
            if (currentQuarter !== vQuarter || vDate.getFullYear() !== now.getFullYear()) {
              return false;
            }
          } else if (dateRangeFilter === "THIS_YEAR") {
            if (vDate.getFullYear() !== now.getFullYear()) return false;
          } else if (dateRangeFilter === "LAST_365") {
            const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            if (vDate < oneYearAgo) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortField === "date") {
          const dateA = new Date(a.voucherDate).getTime() || 0;
          const dateB = new Date(b.voucherDate).getTime() || 0;
          return sortAsc ? dateA - dateB : dateB - dateA;
        } else {
          const amtA = Number(a.totalAmount) || 0;
          const amtB = Number(b.totalAmount) || 0;
          return sortAsc ? amtA - amtB : amtB - amtA;
        }
      });
  }, [vouchers, searchTerm, categoryFilter, dateRangeFilter, sortField, sortAsc, allCategories]);

  // Export CSV / Excel compatible with BOM
  const handleExportCSV = () => {
    const headers = [
      "Date",
      "Expense Number",
      "Original Invoice Ref",
      "Expense Category",
      "Party Name",
      "Paid From Account",
      "Amount (Rs)",
      "Narration / Notes",
      "Status",
    ];

    const rows = filteredVouchers.map((v) => {
      const d = getVoucherDetails(v);
      return [
        v.voucherDate ? new Date(v.voucherDate).toLocaleDateString("en-IN") : "",
        v.voucherNumber,
        v.referenceNo || "",
        d.categoryName,
        d.partyName !== "-" ? d.partyName : "",
        d.paymentAccount?.name || "Cash Account",
        d.amount,
        (v.narration || "").replace(/"/g, '""'),
        v.isCancelled ? "CANCELLED" : "ACTIVE",
      ];
    });

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Expenses_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsReportsMenuOpen(false);
    setToastMessage("Expenses report exported to Excel / CSV successfully!");
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Export PDF Statement
  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = (autoTableModule as any).default || autoTableModule;

      const doc = new jsPDF("portrait", "mm", "a4");
      const companyName =
        currentCompany?.tradeName || currentCompany?.legalName || "Audit Traders Ahmedabad";
      const gstin = currentCompany?.gstin || "";

      // Header Banner
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, 210, 26, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(companyName, 14, 11);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("EXPENSE TRANSACTIONS STATEMENT", 14, 18);
      if (gstin) {
        doc.text(`GSTIN: ${gstin}`, 14, 23);
      }

      doc.setFontSize(8);
      doc.text(
        `Generated: ${new Date().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        140,
        18
      );
      doc.text(`Filter: ${dateRangeFilter.replace(/_/g, " ")} | Category: ${categoryFilter}`, 140, 23);

      // Summary Metric Cards
      const totalAmount = filteredVouchers.reduce(
        (sum, v) => sum + Number(getVoucherDetails(v).amount),
        0
      );
      const activeCount = filteredVouchers.filter((v) => !v.isCancelled).length;

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 32, 88, 16, 2, 2, "F");
      doc.roundedRect(108, 32, 88, 16, 2, 2, "F");

      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.text("TOTAL EXPENSES AMOUNT", 18, 38);
      doc.text("TOTAL VOUCHERS / TRANSACTIONS", 112, 38);

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(
        `Rs. ${totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
        18,
        45
      );
      doc.text(`${filteredVouchers.length} (${activeCount} Active)`, 112, 45);

      // Data Table
      const tableData = filteredVouchers.map((v, idx) => {
        const d = getVoucherDetails(v);
        return [
          idx + 1,
          v.voucherDate
            ? new Date(v.voucherDate).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "-",
          v.voucherNumber,
          v.referenceNo || "-",
          d.categoryName,
          d.partyName !== "-" ? d.partyName : "-",
          d.paymentAccount?.name || "Cash",
          `Rs. ${Number(d.amount).toFixed(2)}`,
        ];
      });

      autoTable(doc, {
        head: [["#", "Date", "Expense #", "Ref Inv #", "Category", "Party", "Payment Mode", "Amount"]],
        body: tableData,
        startY: 53,
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [79, 70, 229], fontStyle: "bold" },
        columnStyles: {
          0: { cellWidth: 8, halign: "center" },
          1: { cellWidth: 22 },
          2: { cellWidth: 24, fontStyle: "bold" },
          3: { cellWidth: 20 },
          4: { cellWidth: 32 },
          5: { cellWidth: 28 },
          6: { cellWidth: 24 },
          7: { cellWidth: 26, halign: "right", fontStyle: "bold" },
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 12;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(140);
      doc.text(
        "This is an automated computer-generated expense statement.",
        14,
        finalY < 280 ? finalY : 280
      );

      doc.save(`Expenses_Statement_${new Date().toISOString().split("T")[0]}.pdf`);
      setIsReportsMenuOpen(false);
      setToastMessage("PDF Statement generated and downloaded successfully!");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      alert("Failed to generate PDF: " + err.message);
    }
  };

  // Single Voucher Receipt PDF
  const handleDownloadVoucherReceipt = async (v: Voucher) => {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = (autoTableModule as any).default || autoTableModule;

      const d = getVoucherDetails(v);
      const doc = new jsPDF();

      // Header Banner
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, 210, 25, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("PAYMENT / EXPENSE VOUCHER", 14, 16);

      // Voucher details
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");

      doc.text(`Voucher Number: ${v.voucherNumber}`, 14, 35);
      doc.text(
        `Date: ${
          v.voucherDate
            ? new Date(v.voucherDate).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "-"
        }`,
        14,
        42
      );
      if (v.referenceNo) {
        doc.text(`Original Inv #: ${v.referenceNo}`, 14, 49);
      }

      doc.text(`Category: ${d.categoryName}`, 120, 35);
      doc.text(`Party: ${d.partyName !== "-" ? d.partyName : "N/A"}`, 120, 42);
      doc.text(`Payment Mode: ${d.paymentAccount?.name || "Cash"}`, 120, 49);

      // Table
      const itemsData = [
        ["1", d.categoryName, v.narration || "-", `Rs. ${Number(d.amount).toFixed(2)}`],
      ];

      autoTable(doc, {
        head: [["S.No", "Particulars / Head", "Narration / Note", "Amount"]],
        body: itemsData,
        startY: 58,
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 9 },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`Total Amount Paid: Rs. ${Number(d.amount).toFixed(2)}`, 14, finalY);

      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(120);
      doc.text("This is a computer-generated voucher statement.", 14, finalY + 15);
      doc.text("Authorized Signatory ___________________", 130, finalY + 15);

      doc.save(`expense_${v.voucherNumber}.pdf`);
    } catch (err: any) {
      alert("Failed to export voucher PDF: " + err.message);
    }
  };

  // Reverse / Cancel Voucher
  const handleConfirmReversal = async () => {
    if (!reversalTarget) return;
    setIsReversing(true);
    setReversalError(null);

    try {
      await apiClient.post(`/vouchers/${reversalTarget.id}/reverse`, {
        reason: reversalReason || "Cancelled by user",
        reversalDate: new Date().toISOString().split("T")[0],
      });

      setReversalTarget(null);
      setReversalReason("");
      setToastMessage(lang === "gu" ? "વાઉચર રદ થયું છે!" : "Expense voucher cancelled successfully!");
      setTimeout(() => setToastMessage(null), 4000);
      await fetchData();
    } catch (err: any) {
      setReversalError(err.message || "Failed to reverse voucher.");
    } finally {
      setIsReversing(false);
    }
  };

  // Manage Category Modal Handlers
  const handleSaveCategoryModal = () => {
    const trimmed = newCategoryNameInput.trim();
    if (!trimmed) return;

    if (categoryModalMode === "add") {
      if (!allCategories.includes(trimmed)) {
        updateCustomCategories([...customCategories, trimmed]);
      }
    } else if (categoryModalMode === "edit" && editingCategoryOldName) {
      const updated = customCategories.map((c) => (c === editingCategoryOldName ? trimmed : c));
      updateCustomCategories(updated);
    }
    setCategoryModalMode("list");
    setNewCategoryNameInput("");
    setEditingCategoryOldName("");
  };

  const handleDeleteCategory = (catName: string) => {
    if (confirm(`Are you sure you want to delete category "${catName}"?`)) {
      updateCustomCategories(customCategories.filter((c) => c !== catName));
    }
  };

  return (
    <div className="space-y-4 pb-12 font-sans">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in text-xs font-semibold">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header matching MyBillBook screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Expenses</h1>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Reports Dropdown */}
          <div className="relative" ref={reportsMenuRef}>
            <button
              onClick={() => setIsReportsMenuOpen(!isReportsMenuOpen)}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-indigo-600 font-semibold text-xs rounded-lg border border-indigo-200 shadow-sm flex items-center gap-1.5 transition-all"
            >
              <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Reports</span>
              <svg className="w-3.5 h-3.5 text-indigo-400 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isReportsMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1.5 text-xs animate-in fade-in duration-150">
                <button
                  onClick={handleExportCSV}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2"
                >
                  <span>📥</span>
                  <span>Export to Excel / CSV</span>
                </button>
                <button
                  onClick={handleExportPDF}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2"
                >
                  <span>📑</span>
                  <span>Download PDF Statement</span>
                </button>
                <Link
                  href="/reports/day-book"
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2 block"
                >
                  <span>📅</span>
                  <span>Day Book Report</span>
                </Link>
                <Link
                  href="/reports/expense-category"
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2 block"
                >
                  <span>💸</span>
                  <span>Expense Category Report</span>
                </Link>
                <Link
                  href="/reports/general-ledger"
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2 block"
                >
                  <span>📊</span>
                  <span>General Ledger Report</span>
                </Link>
              </div>
            )}
          </div>

          {/* Settings / Manage Category Button */}
          <button
            onClick={() => {
              setCategoryModalMode("list");
              setIsManageCategoryModalOpen(true);
            }}
            title="Add/Manage Expense Categories"
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-lg border border-slate-200 shadow-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Shortcuts icon */}
          <button
            title="Keyboard Shortcuts"
            className="p-2 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg border border-slate-200 shadow-sm transition-all hidden sm:block"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>

          {/* Primary Create Expense Button */}
          <Link
            href="/finance/expenses/create"
            className="px-5 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] active:bg-[#3730A3] text-white font-bold text-xs rounded-lg shadow-md transition-all flex items-center gap-1.5"
            style={{ backgroundColor: "#4F46E5" }}
          >
            <span>Create Expense</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar exactly like MyBillBook */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <svg
              className="w-4 h-4 absolute left-3.5 top-3 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Party or Expense No..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          {/* Date Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={dateRangeFilter}
              onChange={(e: any) => setDateRangeFilter(e.target.value)}
              className="w-full sm:w-auto text-xs py-2 pl-8 pr-8 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 outline-none hover:border-slate-300 focus:ring-2 focus:ring-indigo-100 cursor-pointer appearance-none"
            >
              <option value="LAST_365">Last 365 Days</option>
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="THIS_QUARTER">This Quarter</option>
              <option value="THIS_YEAR">This Year</option>
              <option value="ALL">All Time</option>
            </select>
            <span className="absolute left-2.5 top-2.5 pointer-events-none text-slate-400 text-xs">
              📅
            </span>
            <span className="absolute right-2.5 top-2.5 pointer-events-none text-slate-400 text-xs">
              📅
            </span>
          </div>

          {/* Category Dropdown */}
          <div className="relative w-full sm:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full sm:w-auto text-xs py-2 px-3 pr-8 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 outline-none hover:border-slate-300 focus:ring-2 focus:ring-indigo-100 cursor-pointer appearance-none"
            >
              <option value="ALL">All Expenses Categories</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <span className="absolute right-2.5 top-2.5 pointer-events-none text-slate-400 text-[10px]">
              ▼
            </span>
          </div>
        </div>

        {/* Right side Create Expense button on filter bar */}
        {/* <div className="w-full md:w-auto hidden sm:block">
          <Link
            href="/finance/expenses/create"
            className="px-5 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5"
            style={{ backgroundColor: "#4F46E5" }}
          >
            Create Expense
          </Link>
        </div> */}
      </div>

      {/* Main Table / Empty State Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[460px] flex flex-col justify-between">
        {isLoading ? (
          <div className="py-24 text-center">
            <div className="inline-block animate-spin w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full mb-3"></div>
            <p className="text-xs font-semibold text-slate-500">Loading expenses...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-xs font-semibold">
            {error}
          </div>
        ) : filteredVouchers.length === 0 ? (
          /* Exact Empty State matching MyBillBook screenshot */
          <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center">
            {/* SVG Illustration matching MyBillBook */}
            <div className="w-20 h-24 mb-4 relative flex items-center justify-center">
              <svg
                className="w-16 h-20 text-slate-300"
                fill="none"
                viewBox="0 0 64 80"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M12 4h40a4 4 0 014 4v64l-8-4-8 4-8-4-8 4-8-4-8 4V8a4 4 0 014-4z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 18h24M20 28h16"
                />
              </svg>
              {/* Rupee & cross overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
                <span className="text-xl font-bold text-slate-400">₹</span>
              </div>
              <div className="absolute top-2 right-2 text-slate-400 font-bold text-sm">✕</div>
            </div>

            <p className="text-sm font-semibold text-slate-500 mb-4">
              No Transactions Matching the current filter
            </p>

            <Link
              href="/finance/expenses/create"
              className="px-5 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-xs rounded-lg shadow-sm transition-all"
              style={{ backgroundColor: "#4F46E5" }}
            >
              + Create Expense
            </Link>
          </div>
        ) : (
          /* Table View for Desktop & Responsive Cards for Mobile */
          <div className="w-full">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#EDF2F7] text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <th
                      onClick={() => {
                        if (sortField === "date") setSortAsc(!sortAsc);
                        else {
                          setSortField("date");
                          setSortAsc(false);
                        }
                      }}
                      className="py-3 px-4 cursor-pointer hover:text-indigo-600 select-none w-36"
                    >
                      <div className="flex items-center gap-1">
                        <span>Date</span>
                        <span className="text-slate-400 text-xs">⇅</span>
                      </div>
                    </th>
                    <th className="py-3 px-4 min-w-[140px]">Expense Number</th>
                    <th className="py-3 px-4 min-w-[160px]">Party Name</th>
                    <th className="py-3 px-4 min-w-[160px]">Category</th>
                    <th
                      onClick={() => {
                        if (sortField === "amount") setSortAsc(!sortAsc);
                        else {
                          setSortField("amount");
                          setSortAsc(false);
                        }
                      }}
                      className="py-3 px-4 text-right cursor-pointer hover:text-indigo-600 select-none w-36"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Amount</span>
                        <span className="text-slate-400 text-xs">⇅</span>
                      </div>
                    </th>
                    <th className="py-3 px-4 text-center w-14"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVouchers.map((v) => {
                    const details = getVoucherDetails(v);
                    return (
                      <tr
                        key={v.id}
                        onClick={() => router.push(`/finance/expenses/${v.id}`)}
                        className={`hover:bg-slate-50/90 transition-colors cursor-pointer select-none ${
                          v.isCancelled ? "opacity-60 bg-slate-50/40" : ""
                        }`}
                        title="Click to view expense details"
                      >
                        {/* Date */}
                        <td className="py-3.5 px-4 font-mono text-slate-700">
                          {v.voucherDate
                            ? new Date(v.voucherDate).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "-"}
                        </td>

                        {/* Expense Number */}
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {v.voucherNumber}
                          {v.referenceNo && (
                            <span className="block text-[10px] font-normal text-slate-400">
                              Ref: {v.referenceNo}
                            </span>
                          )}
                        </td>

                        {/* Party Name */}
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {details.partyName}
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-900">{details.categoryName}</span>
                          {details.expenseAccount?.nameGujarati && (
                            <span className="text-[10px] text-slate-400 block">
                              {details.expenseAccount.nameGujarati}
                            </span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                          ₹{" "}
                          {Number(details.amount).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </td>

                        {/* Actions (3 Dots Menu matching MyBillBook) */}
                        <td className="py-3.5 px-4 text-center relative action-menu-container">
                          <div className="relative inline-block text-left">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuVoucherId(actionMenuVoucherId === v.id ? null : v.id);
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="More options"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                                />
                              </svg>
                            </button>

                            {actionMenuVoucherId === v.id && (
                              <div className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 text-xs animate-in fade-in duration-100">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionMenuVoucherId(null);
                                    router.push(`/finance/expenses/create?id=${v.id}`);
                                  }}
                                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-2 cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                    />
                                  </svg>
                                  <span>Edit</span>
                                </button>
                                {!v.isCancelled && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setReversalTarget(v);
                                      setReversalReason("Deleted by user");
                                      setReversalError(null);
                                      setActionMenuVoucherId(null);
                                    }}
                                    className="w-full text-left px-3.5 py-2 hover:bg-rose-50 text-rose-600 font-semibold flex items-center gap-2 cursor-pointer"
                                  >
                                    <svg className="w-3.5 h-3.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                      />
                                    </svg>
                                    <span>Delete</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredVouchers.map((v) => {
                const details = getVoucherDetails(v);
                return (
                  <div
                    key={v.id}
                    onClick={() => router.push(`/finance/expenses/${v.id}`)}
                    className={`p-4 space-y-2 hover:bg-slate-50/80 transition-colors cursor-pointer ${
                      v.isCancelled ? "opacity-60 bg-slate-50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {v.voucherNumber}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {v.voucherDate
                          ? new Date(v.voucherDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-800 block">
                          {details.categoryName}
                        </span>
                        {details.partyName !== "-" && (
                          <span className="text-[11px] text-slate-500 block">
                            Party: {details.partyName}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-mono font-bold text-slate-900">
                        ₹{" "}
                        {Number(details.amount).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/finance/expenses/create?id=${v.id}`);
                        }}
                        className="px-3 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                      >
                        <span>✏️</span>
                        <span>Edit</span>
                      </button>
                      {!v.isCancelled && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReversalTarget(v);
                            setReversalReason("Deleted by user");
                            setReversalError(null);
                          }}
                          className="px-3 py-1 text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg hover:bg-rose-100 flex items-center gap-1 cursor-pointer"
                        >
                          <span>🗑️</span>
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 right-6 block md:hidden z-30">
        <Link
          href="/finance/expenses/create"
          className="w-14 h-14 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-full shadow-2xl flex items-center justify-center text-2xl font-bold"
          style={{ backgroundColor: "#4F46E5" }}
        >
          +
        </Link>
      </div>

      {/* Add/Manage Category Modal matching MyBillBook screenshot */}
      {isManageCategoryModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsManageCategoryModalOpen(false);
              setCategoryModalMode("list");
            }
          }}
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 cursor-default"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-800">
                {categoryModalMode === "add"
                  ? "New Expense Category"
                  : categoryModalMode === "edit"
                  ? "Edit Expense Category"
                  : "Add/Manage Category"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsManageCategoryModalOpen(false);
                  setCategoryModalMode("list");
                }}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 text-sm font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {categoryModalMode === "list" ? (
                <div className="space-y-4">
                  {/* + New Expense Category dashed button */}
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryModalMode("add");
                      setNewCategoryNameInput("");
                    }}
                    className="w-full py-2.5 border border-dashed border-[#4F46E5] text-[#4F46E5] hover:bg-indigo-50/60 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>+</span>
                    <span>New Expense Category</span>
                  </button>

                  {/* List of categories */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
                    {allCategories.map((cat) => (
                      <div
                        key={cat}
                        className="py-3 px-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-xs font-medium text-slate-800">{cat}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategoryOldName(cat);
                              setNewCategoryNameInput(cat);
                              setCategoryModalMode("edit");
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              />
                            </svg>
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            className="p-1 text-rose-500 hover:text-rose-700 border border-rose-200 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Category"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Add / Edit Form */
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      autoFocus
                      value={newCategoryNameInput}
                      onChange={(e) => setNewCategoryNameInput(e.target.value)}
                      placeholder="e.g. Courier & Postage"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setCategoryModalMode("list")}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCategoryModal}
                      className="px-5 py-2 text-xs font-bold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl shadow-md transition-all"
                    >
                      {categoryModalMode === "add" ? "Add Category" : "Update Category"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Voucher Details View Modal */}
      {selectedVoucher && (
        <Modal
          isOpen={!!selectedVoucher}
          onClose={() => setSelectedVoucher(null)}
          title={`Expense Voucher: ${selectedVoucher.voucherNumber}`}
          maxWidth="lg"
        >
          {(() => {
            const d = getVoucherDetails(selectedVoucher);
            return (
              <div className="space-y-5 text-xs text-slate-700">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Date</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {selectedVoucher.voucherDate
                        ? new Date(selectedVoucher.voucherDate).toLocaleDateString("en-IN")
                        : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Category</span>
                    <span className="font-bold text-indigo-700">{d.categoryName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Party</span>
                    <span className="font-semibold text-slate-900">{d.partyName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Amount</span>
                    <span className="font-bold text-slate-900 font-mono text-sm">
                      ₹ {Number(d.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {selectedVoucher.referenceNo && (
                  <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg">
                    <span className="font-semibold text-indigo-900">Original Invoice / Ref No:</span>{" "}
                    <span className="font-mono">{selectedVoucher.referenceNo}</span>
                  </div>
                )}

                {selectedVoucher.narration && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                      Narration / Breakdown
                    </span>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 whitespace-pre-wrap">
                      {selectedVoucher.narration}
                    </div>
                  </div>
                )}

                {/* Journal entries breakdown */}
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                    Accounting Entries (Double Entry)
                  </span>
                  <table className="w-full border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-600">
                      <tr>
                        <th className="p-2 text-left">Ledger Account</th>
                        <th className="p-2 text-right">Debit (Dr)</th>
                        <th className="p-2 text-right">Credit (Cr)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-mono">
                      {(selectedVoucher.journalEntries || selectedVoucher.lines || []).map((l, i) => (
                        <tr key={l.id || i}>
                          <td className="p-2 text-slate-800">
                            {l.account?.name || "Ledger Account"}
                            {l.lineNarration && (
                              <span className="block text-[10px] text-slate-400 font-sans">
                                {l.lineNarration}
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-right font-semibold text-slate-900">
                            {Number(l.debitAmount) > 0 ? `₹ ${Number(l.debitAmount).toFixed(2)}` : "-"}
                          </td>
                          <td className="p-2 text-right font-semibold text-slate-900">
                            {Number(l.creditAmount) > 0 ? `₹ ${Number(l.creditAmount).toFixed(2)}` : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    onClick={() => handleDownloadVoucherReceipt(selectedVoucher)}
                    className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <span>📄</span>
                    <span>Download PDF Receipt</span>
                  </button>
                  <button
                    onClick={() => setSelectedVoucher(null)}
                    className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* Delete Expense Modal matching MyBillBook */}
      {reversalTarget && (
        <Modal
          isOpen={!!reversalTarget}
          onClose={() => setReversalTarget(null)}
          title={`Delete Expense #${reversalTarget.voucherNumber.replace(/^EXP-/, "")}`}
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Are you sure you want to delete this expense? This will cancel the voucher and reverse
              all its entries in your accounts.
            </p>

            {reversalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold">
                {reversalError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReversalTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isReversing}
                onClick={handleConfirmReversal}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-all cursor-pointer"
              >
                {isReversing ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
