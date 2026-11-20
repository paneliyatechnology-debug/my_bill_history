"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { apiClient, extractList } from "@/lib/api-client";
import { Modal } from "@/components/ui/modal";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { CustomSelect } from "@/components/ui/custom-select";
import {
  Check,
  X,
  Download,
  FileSpreadsheet,
  Calendar,
  PieChart,
  BarChart2,
  Pencil,
  Trash2,
  FileText,
  Search,
  ChevronDown,
  ArrowUpDown,
  Banknote,
  CreditCard,
  Plus,
  Settings,
  MoreVertical,
  SlidersHorizontal,
  Tag,
  ArrowDownLeft,
  ShieldAlert,
} from "lucide-react";

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
  const { lang, tenantContext, currentCompany, hasPermission } = useAuth();

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
  const getVoucherDetails = useCallback(
    (v: Voucher) => {
      const lines = v.journalEntries || v.lines || [];
      const debitLine = lines.find((l) => Number(l.debitAmount) > 0);
      const creditLine = lines.find((l) => Number(l.creditAmount) > 0);

      const debitAccount = debitLine?.account;
      const creditAccount = creditLine?.account;

      // Extract Payment Mode (e.g. Cash, HDFC Bank)
      const paymentMode = creditAccount?.name || "Cash";

      // 1. Extract Party Name
      let partyName = "-";
      if (v.narration && v.narration.includes("Party:")) {
        const match = v.narration.match(/Party:\s*([^;|,\n]+)/);
        if (match) partyName = match[1].trim();
      }

      // Distinguish between expense ledger and party ledger
      const isExpenseLedger = Boolean(
        debitAccount &&
          (debitAccount.group?.nature === "EXPENSE" ||
            expenseAccounts.some((e) => e.id === debitAccount.id) ||
            debitAccount.name.toLowerCase().includes("expense") ||
            debitAccount.name.toLowerCase().includes("charge") ||
            debitAccount.name.toLowerCase().includes("salary") ||
            debitAccount.name.toLowerCase().includes("rent") ||
            debitAccount.name.toLowerCase().includes("tea") ||
            debitAccount.name.toLowerCase().includes("advertising"))
      );

      // Check if debit account is a Party (Vendor / Creditor / Debtor or non-expense)
      const isPartyAccount = Boolean(
        debitAccount &&
          (!isExpenseLedger ||
            debitAccount.group?.nature === "LIABILITY" ||
            debitAccount.group?.name?.toLowerCase().includes("creditor") ||
            debitAccount.group?.name?.toLowerCase().includes("debtor") ||
            parties.some((p) => p.name.toLowerCase() === debitAccount.name.toLowerCase()))
      );

      if (partyName === "-" && isPartyAccount && debitAccount?.name) {
        partyName = debitAccount.name;
      }

      // 2. Extract Category Name
      let categoryName = "General Expense";
      if (v.narration) {
        for (const cat of allCategories) {
          if (v.narration.toLowerCase().includes(cat.toLowerCase())) {
            categoryName = cat;
            break;
          }
        }
      }

      if (categoryName === "General Expense") {
        if (!isPartyAccount && debitAccount?.name) {
          categoryName = debitAccount.name;
        } else if (isPartyAccount) {
          categoryName = "Vendor Payment";
        }
      }

      return {
        expenseAccount: debitAccount,
        paymentAccount: creditAccount,
        partyName,
        categoryName,
        paymentMode,
        amount: debitLine ? Number(debitLine.debitAmount) : v.totalAmount,
      };
    },
    [allCategories, parties, expenseAccounts]
  );

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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, dateRangeFilter, searchTerm]);

  const totalVouchers = filteredVouchers.length;
  const paginatedVouchers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVouchers.slice(start, start + pageSize);
  }, [filteredVouchers, currentPage, pageSize]);

  // Summary Metrics for KPI cards
  const expenseMetrics = useMemo(() => {
    let total = 0;
    let activeCount = 0;
    const categoryTotals: Record<string, number> = {};

    filteredVouchers.forEach((v) => {
      const d = getVoucherDetails(v);
      const amt = Number(d.amount) || 0;
      total += amt;
      if (!v.isCancelled) activeCount++;
      const cat = d.categoryName || "Other";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
    });

    let topCatName = "-";
    let topCatAmt = 0;
    Object.entries(categoryTotals).forEach(([cat, amt]) => {
      if (amt > topCatAmt) {
        topCatAmt = amt;
        topCatName = cat;
      }
    });

    return {
      totalAmount: total,
      totalCount: filteredVouchers.length,
      activeCount,
      topCategory: topCatName,
      topCategoryAmount: topCatAmt,
    };
  }, [filteredVouchers, getVoucherDetails]);

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

  if (!hasPermission("expenses", "view")) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[50vh] bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center mb-4 shadow-xs">
          <ShieldAlert className="w-7 h-7" strokeWidth={1.8} />
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">
          {lang === "gu" ? "પ્રવેશ પ્રતિબંધિત છે" : "Access Restricted"}
        </h2>
        <p className="text-sm text-slate-500 max-w-md mb-6">
          {lang === "gu"
            ? "તમારી પાસે આ મોડ્યુલ ઍક્સેસ કરવાની પરવાનગી નથી. કૃપા કરીને તમારા વ્યવસાય એડમિનિસ્ટ્રેટરનો સંપર્ક કરો."
            : "You do not have permission to access this module. Please contact your organization administrator."}
        </p>
        <Link
          href="/"
          className="px-5 py-2.5 bg-[#1677E8] hover:bg-[#1268D3] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
        >
          {lang === "gu" ? "ડેશબોર્ડ પર પાછા જાઓ" : "Return to Dashboard"}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12 font-sans">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in text-xs font-semibold">
          <Check className="w-4 h-4 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Command Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#2563EB]">
              {lang === "gu" ? "નાણાકીય ખર્ચ" : "FINANCE & EXPENSES"}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-[#64748B]">
              {totalVouchers} {lang === "gu" ? "નોંધો" : "Records"}
            </span>
          </div>
          <h1 className="typo-page-title text-[#1E293B]">
            {lang === "gu" ? "ખર્ચાઓ (Expenses)" : "Expenses"}
          </h1>
          <p className="typo-page-subtitle text-[#64748B] mt-0.5">
            {lang === "gu"
              ? "તમામ ઓપરેશનલ ખર્ચા, વેન્ડર પેમેન્ટ અને કેટેગરી અનુસાર વિગતો જુઓ."
              : "Track operational expenses, vendor payments, and category-wise spending."}
          </p>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Reports Dropdown */}
          <div className="relative" ref={reportsMenuRef}>
            <button
              onClick={() => setIsReportsMenuOpen(!isReportsMenuOpen)}
              className="h-9 px-3.5 bg-white hover:bg-slate-50 text-[#1E293B] font-medium text-[13px] rounded-xl border border-[#E2E8F0] shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#2563EB]" />
              <span>{lang === "gu" ? "રિપોર્ટ્સ" : "Reports"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>

            {isReportsMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-56 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-30 py-1.5 text-xs animate-in fade-in duration-150">
                <button
                  onClick={handleExportCSV}
                  className="w-full text-left h-9 px-3 hover:bg-slate-50 text-[#1E293B] font-medium flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  <span>Export to Excel / CSV</span>
                </button>
                <button
                  onClick={handleExportPDF}
                  className="w-full text-left h-9 px-3 hover:bg-slate-50 text-[#1E293B] font-medium flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                  <span>Download PDF Statement</span>
                </button>
                <Link
                  href="/reports/day-book"
                  className="w-full text-left h-9 px-3 hover:bg-slate-50 text-[#1E293B] font-medium flex items-center gap-2 block"
                >
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span>Day Book Report</span>
                </Link>
                <Link
                  href="/reports/expense-category"
                  className="w-full text-left h-9 px-3 hover:bg-slate-50 text-[#1E293B] font-medium flex items-center gap-2 block"
                >
                  <PieChart className="w-4 h-4 text-slate-500" />
                  <span>Expense Category Report</span>
                </Link>
                <Link
                  href="/reports/general-ledger"
                  className="w-full text-left h-9 px-3 hover:bg-slate-50 text-[#1E293B] font-medium flex items-center gap-2 block"
                >
                  <BarChart2 className="w-4 h-4 text-slate-500" />
                  <span>General Ledger Report</span>
                </Link>
              </div>
            )}
          </div>

          {/* Manage Categories Button */}
          <button
            onClick={() => {
              setCategoryModalMode("list");
              setIsManageCategoryModalOpen(true);
            }}
            title="Manage Expense Categories"
            className="h-9 px-3 bg-white hover:bg-slate-50 text-[#1E293B] rounded-xl border border-[#E2E8F0] shadow-2xs transition-colors flex items-center gap-1.5 text-[13px] font-medium cursor-pointer"
          >
            <Tag className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">{lang === "gu" ? "કેટેગરી" : "Categories"}</span>
          </button>

          {/* Primary Create Expense Button */}
          {hasPermission("expenses", "create") && (
            <Link
              href="/finance/expenses/create"
              className="h-9 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white font-medium text-[13px] rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === "gu" ? "+ નવો ખર્ચ" : "Create Expense"}</span>
            </Link>
          )}
        </div>
      </div>

      {/* 3 Metric Summary Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Expenses */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#64748B] block">
              {lang === "gu" ? "કુલ ખર્ચ રકમ" : "Total Expenses"}
            </span>
            <div className="typo-kpi text-[#1E293B] tabular-nums mt-0.5">
              ₹ {expenseMetrics.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-[#64748B] mt-0.5 block">
              {expenseMetrics.activeCount} {lang === "gu" ? "સક્રિય વ્યવહારો" : "Active Transactions"}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE]/60 flex items-center justify-center shrink-0">
            <Banknote className="w-5 h-5 text-[#2563EB]" />
          </div>
        </div>

        {/* Total Transactions */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#64748B] block">
              {lang === "gu" ? "કુલ વ્યવહારો" : "Total Transactions"}
            </span>
            <div className="typo-kpi text-[#1E293B] tabular-nums mt-0.5">
              {expenseMetrics.totalCount}
            </div>
            <span className="text-[11px] text-[#64748B] mt-0.5 block">
              {lang === "gu" ? "ચૂકવણી વાઉચરો" : "Payment Vouchers"}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-[#64748B]" />
          </div>
        </div>

        {/* Top Expense Category */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <span className="text-xs font-medium text-[#64748B] block">
              {lang === "gu" ? "મુખ્ય કેટેગરી" : "Top Category"}
            </span>
            <div className="text-base font-semibold text-[#1E293B] truncate mt-0.5" title={expenseMetrics.topCategory}>
              {expenseMetrics.topCategory}
            </div>
            <span className="text-[11px] text-[#64748B] mt-0.5 block tabular-nums">
              ₹ {expenseMetrics.topCategoryAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} {lang === "gu" ? "ખર્ચ" : "spent"}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE]/60 flex items-center justify-center shrink-0">
            <Tag className="w-5 h-5 text-[#2563EB]" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-2xl border border-[#E2E8F0] shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#94A3B8]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={lang === "gu" ? "પાર્ટી, વાઉચર #, કેટેગરી શોધો..." : "Search party, voucher #, category..."}
              className="w-full pl-9 pr-8 py-2 text-[13px] bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all h-10 placeholder:text-[#94A3B8]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Date Filter */}
          <div className="w-full sm:w-[170px]">
            <CustomSelect
              size="md"
              value={dateRangeFilter}
              onChange={(val: any) => setDateRangeFilter(val)}
              options={[
                { value: "LAST_365", label: "Last 365 Days", icon: <Calendar className="w-3.5 h-3.5 text-slate-400" /> },
                { value: "TODAY", label: "Today", icon: <Calendar className="w-3.5 h-3.5 text-slate-400" /> },
                { value: "YESTERDAY", label: "Yesterday", icon: <Calendar className="w-3.5 h-3.5 text-slate-400" /> },
                { value: "THIS_WEEK", label: "This Week", icon: <Calendar className="w-3.5 h-3.5 text-slate-400" /> },
                { value: "THIS_MONTH", label: "This Month", icon: <Calendar className="w-3.5 h-3.5 text-slate-400" /> },
                { value: "THIS_QUARTER", label: "This Quarter", icon: <Calendar className="w-3.5 h-3.5 text-slate-400" /> },
                { value: "THIS_YEAR", label: "This Year", icon: <Calendar className="w-3.5 h-3.5 text-slate-400" /> },
                { value: "ALL", label: "All Time", icon: <Calendar className="w-3.5 h-3.5 text-slate-400" /> },
              ]}
              triggerClassName="rounded-xl h-10 border-[#E2E8F0]"
            />
          </div>

          {/* Category Dropdown */}
          <div className="w-full sm:w-[200px]">
            <CustomSelect
              size="md"
              value={categoryFilter}
              onChange={(val: any) => setCategoryFilter(val)}
              options={[
                { value: "ALL", label: "All Expense Categories" },
                ...allCategories.map((cat) => ({ value: cat, label: cat })),
              ]}
              triggerClassName="rounded-xl h-10 border-[#E2E8F0]"
            />
          </div>
        </div>

        {/* Clear Filters Button if any active */}
        {(searchTerm || categoryFilter !== "ALL" || dateRangeFilter !== "LAST_365") && (
          <button
            onClick={() => {
              setSearchTerm("");
              setCategoryFilter("ALL");
              setDateRangeFilter("LAST_365");
            }}
            className="text-xs font-medium text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Main Table / Empty State Card */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="py-24 text-center">
            <div className="inline-block animate-spin w-8 h-8 border-3 border-[#2563EB] border-t-transparent rounded-full mb-3"></div>
            <p className="text-xs font-semibold text-[#64748B]">Loading expenses...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-xs font-semibold">
            {error}
          </div>
        ) : filteredVouchers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center mb-3">
              <Banknote className="w-8 h-8 text-[#94A3B8]" />
            </div>
            <h3 className="typo-empty-heading text-[#1E293B] mb-1">
              No Transactions Matching the Current Filter
            </h3>
            <p className="typo-empty-desc text-[#64748B] mb-4">
              Try adjusting your search query, date range, or category filter.
            </p>
            {hasPermission("expenses", "create") && (
              <Link
                href="/finance/expenses/create"
                className="h-9 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium rounded-xl shadow-2xs transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create Expense</span>
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAFBFD] text-[#64748B] typo-table-th uppercase tracking-wider border-b border-[#E2E8F0]">
                    <th
                      onClick={() => {
                        if (sortField === "date") setSortAsc(!sortAsc);
                        else {
                          setSortField("date");
                          setSortAsc(false);
                        }
                      }}
                      className="py-3 px-4 cursor-pointer hover:text-[#2563EB] select-none w-36 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Date</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-[#94A3B8]" />
                      </div>
                    </th>
                    <th className="py-3 px-4 min-w-[140px]">Expense #</th>
                    <th className="py-3 px-4 min-w-[160px]">Party / Vendor</th>
                    <th className="py-3 px-4 min-w-[170px]">Category</th>
                    <th className="py-3 px-4 min-w-[130px]">Payment Mode</th>
                    <th
                      onClick={() => {
                        if (sortField === "amount") setSortAsc(!sortAsc);
                        else {
                          setSortField("amount");
                          setSortAsc(false);
                        }
                      }}
                      className="py-3 px-4 text-right cursor-pointer hover:text-[#2563EB] select-none w-36 transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Amount</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-[#94A3B8]" />
                      </div>
                    </th>
                    <th className="py-3 px-4 text-center w-14"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {paginatedVouchers.map((v) => {
                    const details = getVoucherDetails(v);
                    return (
                      <tr
                        key={v.id}
                        onClick={() => router.push(`/finance/expenses/${v.id}`)}
                        className={`hover:bg-[#F8FBFF] transition-colors cursor-pointer select-none group ${
                          v.isCancelled ? "opacity-60 bg-slate-50/50" : ""
                        }`}
                        title="Click to view expense details"
                      >
                        {/* Date */}
                        <td className="py-3 px-4 tabular-nums text-[#1E293B] text-[13px]">
                          {v.voucherDate
                            ? new Date(v.voucherDate).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "-"}
                        </td>

                        {/* Expense Number */}
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs font-semibold text-[#1E293B] group-hover:text-[#2563EB] transition-colors">
                            {v.voucherNumber}
                          </span>
                          {v.referenceNo && (
                            <span className="block text-[11px] font-normal text-[#64748B]">
                              Ref: {v.referenceNo}
                            </span>
                          )}
                        </td>

                        {/* Party / Vendor */}
                        <td className="py-3 px-4">
                          {details.partyName !== "-" ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-[#EFF6FF] text-[#2563EB] font-semibold text-[11px] flex items-center justify-center shrink-0">
                                {details.partyName.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-[#1E293B] text-[13px]">
                                {details.partyName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#F1F5F9] text-[#334155] border border-slate-200">
                            {details.categoryName}
                          </span>
                          {lang === "gu" && details.expenseAccount?.nameGujarati && (
                            <span className="text-[10px] text-[#94A3B8] block mt-0.5">
                              {details.expenseAccount.nameGujarati}
                            </span>
                          )}
                        </td>

                        {/* Payment Mode */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                            {details.paymentMode.toLowerCase().includes("cash") ? (
                              <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                            )}
                            <span className="font-medium text-[#1E293B]">{details.paymentMode}</span>
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-4 text-right tabular-nums font-semibold text-[#1E293B] text-[13px]">
                          ₹{" "}
                          {Number(details.amount).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center relative action-menu-container">
                          <div className="relative inline-block text-left">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuVoucherId(actionMenuVoucherId === v.id ? null : v.id);
                              }}
                              className="p-1.5 text-[#94A3B8] hover:text-[#1E293B] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="More options"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {actionMenuVoucherId === v.id && (
                              <div className="absolute right-0 mt-1 w-36 bg-white border border-[#E2E8F0] rounded-xl shadow-xl z-30 py-1 text-xs animate-in fade-in duration-100">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionMenuVoucherId(null);
                                    router.push(`/finance/expenses/create?id=${v.id}`);
                                  }}
                                  className="w-full text-left h-8 px-3 hover:bg-slate-50 text-[#1E293B] font-medium flex items-center gap-2 cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-slate-500" />
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
                                    className="w-full text-left h-8 px-3 hover:bg-rose-50 text-rose-600 font-medium flex items-center gap-2 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
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
            <div className="block md:hidden divide-y divide-[#E2E8F0]">
              {paginatedVouchers.map((v) => {
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
                      <span className="font-mono text-xs font-semibold text-[#1E293B]">
                        {v.voucherNumber}
                      </span>
                      <span className="tabular-nums text-xs text-[#64748B]">
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
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#F1F5F9] text-[#334155]">
                          {details.categoryName}
                        </span>
                        {details.partyName !== "-" && (
                          <span className="text-xs text-[#64748B] block mt-1">
                            Party: <span className="font-medium text-[#1E293B]">{details.partyName}</span>
                          </span>
                        )}
                      </div>
                      <span className="text-sm tabular-nums font-semibold text-[#1E293B]">
                        ₹{" "}
                        {Number(details.amount).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs text-[#64748B]">
                      <span>Mode: <span className="font-medium text-[#1E293B]">{details.paymentMode}</span></span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/finance/expenses/create?id=${v.id}`);
                          }}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5 text-slate-500" />
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
                            className="px-2.5 py-1 text-xs font-medium text-rose-600 bg-rose-50 border border-rose-100 rounded-lg hover:bg-rose-100 flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Docked Standard Pagination Container */}
            <div className="border-t border-[#E2E8F0] bg-white px-4 py-2">
              <DataTablePagination
                currentPage={currentPage}
                totalPages={Math.max(1, Math.ceil(totalVouchers / pageSize))}
                totalRecords={totalVouchers}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setCurrentPage(1);
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 right-6 block md:hidden z-30">
        <Link
          href="/finance/expenses/create"
          className="w-14 h-14 bg-[#1677E8] hover:bg-[#1268D3] text-white rounded-full shadow-lg flex items-center justify-center text-[22px] font-medium"
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
              <h2 className="text-[15px] font-semibold text-[#182230]">
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
                className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
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
                    className="w-full py-2.5 border border-dashed border-[#0F172A] text-[#0F172A] hover:bg-[#EFF6FF]/60 rounded-xl text-[13px] font-medium transition-colors flex items-center justify-center gap-1.5"
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
                            className="px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1"
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
                    <label className="block text-[12px] font-medium text-slate-700 mb-1">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      autoFocus
                      value={newCategoryNameInput}
                      onChange={(e) => setNewCategoryNameInput(e.target.value)}
                      placeholder="e.g. Courier & Postage"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-normal text-slate-900 outline-none focus:bg-white focus:border-[#1677E8] focus:ring-2 focus:ring-teal-100 h-10"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setCategoryModalMode("list")}
                      className="h-9 px-3 text-[13px] font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCategoryModal}
                      className="h-9 px-3.5 text-[13px] font-medium text-white bg-[#1677E8] hover:bg-[#1268D3] rounded-xl shadow-md transition-all"
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
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {selectedVoucher.voucherDate
                        ? new Date(selectedVoucher.voucherDate).toLocaleDateString("en-IN")
                        : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Category</span>
                    <span className="font-bold text-teal-700">{d.categoryName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Party</span>
                    <span className="font-semibold text-slate-900">{d.partyName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Amount</span>
                    <span className="font-bold text-slate-900 tabular-nums text-sm">
                      ₹ {Number(d.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {selectedVoucher.referenceNo && (
                  <div className="p-3 bg-teal-50/50 border border-teal-100 rounded-lg">
                    <span className="font-semibold text-indigo-900">Original Invoice / Ref No:</span>{" "}
                    <span className="tabular-nums">{selectedVoucher.referenceNo}</span>
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
                    <tbody className="divide-y divide-slate-100 text-xs tabular-nums">
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
                    className="h-9 px-3 bg-[#EFF6FF] text-[#1677E8] hover:bg-teal-100 font-medium rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#1677E8]" />
                    <span>Download PDF Receipt</span>
                  </button>
                  <button
                    onClick={() => setSelectedVoucher(null)}
                    className="h-9 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
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
                className="h-9 px-3 text-[13px] font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isReversing}
                onClick={handleConfirmReversal}
                className="h-9 px-3.5 text-[13px] font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-all cursor-pointer"
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
