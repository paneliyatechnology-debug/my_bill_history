"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { apiClient, extractList } from "@/lib/api-client";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/badge";

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

interface LedgerGroup {
  id: string;
  name: string;
  nature: string;
}

interface Party {
  id: string;
  name: string;
  nameGujarati?: string;
  mobile?: string;
}

export default function ExpensesPage() {
  const { lang, tenantContext } = useAuth();

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [ledgers, setLedgers] = useState<LedgerAccount[]>([]);
  const [groups, setGroups] = useState<LedgerGroup[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters matching MyBillBook video (expense_frame18.jpg)
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRangeFilter, setDateRangeFilter] = useState<
    "LAST_365" | "TODAY" | "THIS_MONTH" | "LAST_30" | "ALL"
  >("LAST_365");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
  const [isReportsMenuOpen, setIsReportsMenuOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [actionMenuVoucherId, setActionMenuVoucherId] = useState<string | null>(null);
  const [actionMenuOpenUp, setActionMenuOpenUp] = useState(false);

  // Reversal Modal
  const [reversalTarget, setReversalTarget] = useState<Voucher | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [isReversing, setIsReversing] = useState(false);
  const [reversalError, setReversalError] = useState<string | null>(null);

  // Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    expenseAccountId: "",
    paidFromAccountId: "",
    amount: "",
    voucherDate: new Date().toISOString().split("T")[0],
    partyName: "",
    referenceNo: "",
    narration: "",
  });
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [expenseError, setExpenseError] = useState<string | null>(null);

  // Quick Category Form State
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    nameGujarati: "",
    groupId: "",
  });
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [vouchersRes, ledgersRes, groupsRes, partiesRes]: any = await Promise.all([
        apiClient.get("/vouchers", { voucherType: "PAYMENT" }),
        apiClient.get("/ledgers"),
        apiClient.get("/ledger-groups").catch(() => []),
        apiClient.get("/parties").catch(() => []),
      ]);

      const vList = extractList<Voucher>(vouchersRes);
      const lList = extractList<LedgerAccount>(ledgersRes);
      const gList = extractList<LedgerGroup>(groupsRes);
      const pList = extractList<Party>(partiesRes);

      setVouchers(vList);
      setLedgers(lList);
      setGroups(gList);
      setParties(pList);
    } catch (err: any) {
      setError(err.message || "Failed to load expenses data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchData();
    }
  }, [tenantContext.companyId, fetchData]);

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
        l.name.toLowerCase().includes("tea"),
    );
  }, [ledgers]);

  // Cash and Bank accounts for payments
  const cashAccounts = useMemo(() => {
    return ledgers.filter(
      (l) =>
        l.group?.name?.toLowerCase().includes("cash") ||
        l.name.toLowerCase().includes("cash") ||
        l.name.includes("રોકડ"),
    );
  }, [ledgers]);

  const bankAccounts = useMemo(() => {
    return ledgers.filter(
      (l) =>
        l.group?.name?.toLowerCase().includes("bank") ||
        l.name.toLowerCase().includes("bank") ||
        l.name.includes("બેંક"),
    );
  }, [ledgers]);

  const paymentAccounts = useMemo(() => {
    return [...cashAccounts, ...bankAccounts];
  }, [cashAccounts, bankAccounts]);

  // Helper to extract voucher details
  const getVoucherDetails = (v: Voucher) => {
    const lines = v.journalEntries || v.lines || [];
    const expenseLine = lines.find((l) => Number(l.debitAmount) > 0);
    const paymentLine = lines.find((l) => Number(l.creditAmount) > 0);

    const isCash =
      paymentLine?.account?.name?.toLowerCase().includes("cash") ||
      paymentLine?.account?.name?.includes("રોકડ") ||
      false;

    const isBank =
      paymentLine?.account?.name?.toLowerCase().includes("bank") ||
      paymentLine?.account?.name?.includes("બેંક") ||
      (!isCash && !!paymentLine);

    // Extract party name from narration or reference if recorded
    let partyName = "-";
    if (v.narration && v.narration.includes("Party:")) {
      const match = v.narration.match(/Party:\s*([^;,\n]+)/);
      if (match) partyName = match[1].trim();
    }

    return {
      expenseAccount: expenseLine?.account,
      paymentAccount: paymentLine?.account,
      isCash,
      isBank,
      partyName,
      amount: expenseLine ? Number(expenseLine.debitAmount) : v.totalAmount,
    };
  };

  // Filtered expense vouchers
  const filteredVouchers = useMemo(() => {
    const now = new Date();

    return vouchers.filter((v) => {
      if (v.voucherType !== "PAYMENT") return false;

      const details = getVoucherDetails(v);

      // Search
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const matchesNo = v.voucherNumber?.toLowerCase().includes(s);
        const matchesNarration = v.narration?.toLowerCase().includes(s);
        const matchesRef = v.referenceNo?.toLowerCase().includes(s);
        const matchesCategory = details.expenseAccount?.name?.toLowerCase().includes(s);
        const matchesParty = details.partyName?.toLowerCase().includes(s);
        if (!matchesNo && !matchesNarration && !matchesRef && !matchesCategory && !matchesParty) {
          return false;
        }
      }

      // Date Range Filter
      if (v.voucherDate) {
        const vDate = new Date(v.voucherDate);
        if (dateRangeFilter === "TODAY") {
          const todayStr = now.toISOString().split("T")[0];
          if (!v.voucherDate.startsWith(todayStr)) return false;
        } else if (dateRangeFilter === "THIS_MONTH") {
          const curMonth = now.toISOString().substring(0, 7);
          if (!v.voucherDate.startsWith(curMonth)) return false;
        } else if (dateRangeFilter === "LAST_30") {
          const diffDays = (now.getTime() - vDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 30 || diffDays < 0) return false;
        } else if (dateRangeFilter === "LAST_365") {
          const diffDays = (now.getTime() - vDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 365 || diffDays < 0) return false;
        }
      }

      // Category filter
      if (categoryFilter !== "ALL") {
        if (details.expenseAccount?.id !== categoryFilter) return false;
      }

      return true;
    });
  }, [vouchers, searchTerm, dateRangeFilter, categoryFilter]);

  // Totals & KPIs
  const summary = useMemo(() => {
    let totalAmt = 0;
    let cashAmt = 0;
    let bankAmt = 0;
    let count = 0;

    filteredVouchers.forEach((v) => {
      if (v.isCancelled) return;
      const details = getVoucherDetails(v);
      totalAmt += details.amount;
      count += 1;
      if (details.isCash) cashAmt += details.amount;
      else bankAmt += details.amount;
    });

    return { totalAmt, cashAmt, bankAmt, count };
  }, [filteredVouchers]);

  // Submit Expense
  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingExpense(true);
    setExpenseError(null);

    try {
      const amt = Number(expenseForm.amount);
      if (!amt || amt <= 0) {
        throw new Error(lang === "gu" ? "કૃપા કરીને માન્ય રકમ દાખલ કરો." : "Please enter a valid expense amount.");
      }
      if (!expenseForm.expenseAccountId) {
        throw new Error(lang === "gu" ? "કૃપા કરીને ખર્ચનું ખાતું પસંદ કરો." : "Please select an expense account.");
      }

      // Format narration with optional party name
      let fullNarration = expenseForm.narration || "";
      if (expenseForm.partyName.trim()) {
        fullNarration = fullNarration
          ? `Party: ${expenseForm.partyName.trim()} | ${fullNarration}`
          : `Party: ${expenseForm.partyName.trim()}`;
      }

      await apiClient.post("/vouchers/expense", {
        expenseAccountId: expenseForm.expenseAccountId,
        paidFromAccountId: expenseForm.paidFromAccountId || undefined,
        amount: amt,
        voucherDate: expenseForm.voucherDate,
        referenceNo: expenseForm.referenceNo || undefined,
        narration: fullNarration || undefined,
      });

      setIsExpenseModalOpen(false);
      setExpenseForm({
        expenseAccountId: "",
        paidFromAccountId: "",
        amount: "",
        voucherDate: new Date().toISOString().split("T")[0],
        partyName: "",
        referenceNo: "",
        narration: "",
      });

      setToastMessage(lang === "gu" ? "ખર્ચ સફળતાપૂર્વક નોંધાયો!" : "Expense recorded successfully!");
      setTimeout(() => setToastMessage(null), 4000);

      await fetchData();
    } catch (err: any) {
      setExpenseError(err.message || "Failed to record expense.");
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // Submit New Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCategory(true);
    setCategoryError(null);

    try {
      if (!categoryForm.name.trim()) {
        throw new Error(lang === "gu" ? "ખાતાનું નામ જરૂરી છે." : "Account name is required.");
      }

      let gid = categoryForm.groupId;
      if (!gid) {
        const expGroup = groups.find((g) => g.nature === "EXPENSE" || g.name.toLowerCase().includes("expense"));
        gid = expGroup ? expGroup.id : (groups[0]?.id || "");
      }

      const newAccountRes: any = await apiClient.post("/ledgers", {
        code: `EXP-${Date.now().toString().slice(-4)}`,
        name: categoryForm.name.trim(),
        nameGujarati: categoryForm.nameGujarati.trim() || undefined,
        groupId: gid,
        openingBalance: 0,
        openingBalanceType: "DEBIT",
      });

      setIsNewCategoryModalOpen(false);
      setCategoryForm({ name: "", nameGujarati: "", groupId: "" });

      if (newAccountRes?.id) {
        setExpenseForm((prev) => ({ ...prev, expenseAccountId: newAccountRes.id }));
      }

      setToastMessage(lang === "gu" ? "નવો ખર્ચ કેટેગરી ઉમેરાઈ ગઈ!" : "Expense category created!");
      setTimeout(() => setToastMessage(null), 4000);

      await fetchData();
    } catch (err: any) {
      setCategoryError(err.message || "Failed to create category.");
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  // Reversal
  const handleReverseVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalTarget) return;

    setIsReversing(true);
    setReversalError(null);

    try {
      await apiClient.post(`/vouchers/${reversalTarget.id}/reverse`, {
        reason: reversalReason,
        reversalDate: new Date().toISOString().split("T")[0],
      });

      setReversalTarget(null);
      setReversalReason("");
      setToastMessage(lang === "gu" ? "વાઉચર રદ (રિવર્સ) થયું છે!" : "Voucher reversed successfully!");
      setTimeout(() => setToastMessage(null), 4000);
      await fetchData();
    } catch (err: any) {
      setReversalError(err.message || "Failed to reverse voucher.");
    } finally {
      setIsReversing(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["Date", "Expense Number", "Party Name", "Category", "Amount", "Status"];
    const rows = filteredVouchers.map((v) => {
      const d = getVoucherDetails(v);
      return [
        v.voucherDate ? new Date(v.voucherDate).toLocaleDateString("en-IN") : "",
        v.voucherNumber,
        d.partyName !== "-" ? d.partyName : "",
        d.expenseAccount?.name || "General Expense",
        d.amount,
        v.isCancelled ? "CANCELLED" : "ACTIVE",
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `expenses_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsReportsMenuOpen(false);
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

      {/* Top Header matching MyBillBook video (expense_frame18.jpg) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {lang === "gu" ? "ખર્ચા (Expenses)" : "Expenses"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === "gu"
              ? "તમારા વ્યવસાયના તમામ દૈનિક ખર્ચા અને ચુકવણીઓની યાદી"
              : "Track daily office, travel, salary & business expenditures"}
          </p>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Reports Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsReportsMenuOpen(!isReportsMenuOpen)}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 shadow-sm flex items-center gap-1.5 transition-all"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{lang === "gu" ? "રિપોર્ટ્સ" : "Reports"}</span>
              <svg className="w-3.5 h-3.5 text-slate-400 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  <span>{lang === "gu" ? "એક્સેલ / CSV ડાઉનલોડ" : "Export to Excel / CSV"}</span>
                </button>
                <Link
                  href="/reports/day-book"
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2 block"
                >
                  <span>📅</span>
                  <span>{lang === "gu" ? "ડે-બુક રિપોર્ટ (Day Book)" : "Day-wise Expense Report"}</span>
                </Link>
                <Link
                  href="/reports/general-ledger"
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2 block"
                >
                  <span>📑</span>
                  <span>{lang === "gu" ? "ખાતાવહી રિપોર્ટ (Ledger GL)" : "General Ledger Report"}</span>
                </Link>
              </div>
            )}
          </div>

          {/* Settings / Manage Category Button */}
          <button
            onClick={() => {
              setIsNewCategoryModalOpen(true);
              setCategoryError(null);
            }}
            title={lang === "gu" ? "નવી ખર્ચ કેટેગરી ઉમેરો" : "Add Expense Category"}
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-300 shadow-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Primary Create Expense Button */}
          <button
            onClick={() => {
              setIsExpenseModalOpen(true);
              setExpenseError(null);
            }}
            className="px-5 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] active:bg-[#3730A3] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            style={{ backgroundColor: "#4F46E5" }}
          >
            <span>+</span>
            <span>{lang === "gu" ? "ખર્ચ ઉમેરો (Create Expense)" : "Create Expense"}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar exactly like expense_frame18.jpg */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
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
            placeholder={lang === "gu" ? "શોધો (વાઉચર નં., કેટેગરી, પાર્ટી)..." : "Search by expense #, category or party..."}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
          />
        </div>

        {/* Date Filter matching video 'Last 365 Days' */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative">
            <select
              value={dateRangeFilter}
              onChange={(e: any) => setDateRangeFilter(e.target.value)}
              className="text-xs py-2 pl-8 pr-7 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none hover:border-slate-300 focus:ring-2 focus:ring-indigo-100 cursor-pointer appearance-none"
            >
              <option value="LAST_365">{lang === "gu" ? "છેલ્લા ૩૬૫ દિવસ (Last 365 Days)" : "Last 365 Days"}</option>
              <option value="TODAY">{lang === "gu" ? "આજે (Today)" : "Today"}</option>
              <option value="THIS_MONTH">{lang === "gu" ? "ચાલુ મહિને (This Month)" : "This Month"}</option>
              <option value="LAST_30">{lang === "gu" ? "છેલ્લા ૩૦ દિવસ (Last 30 Days)" : "Last 30 Days"}</option>
              <option value="ALL">{lang === "gu" ? "તમામ સમય (All Time)" : "All Time"}</option>
            </select>
            <span className="absolute left-2.5 top-2.5 pointer-events-none text-slate-400 text-xs">
              📅
            </span>
            <span className="absolute right-2.5 top-2.5 pointer-events-none text-slate-400 text-[10px]">
              ▼
            </span>
          </div>

          {/* Category Dropdown matching video 'All Expenses Categories' */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs py-2 px-3 pr-7 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none hover:border-slate-300 focus:ring-2 focus:ring-indigo-100 cursor-pointer appearance-none"
            >
              <option value="ALL">
                {lang === "gu" ? "બધી કેટેગરીઝ (All Expenses Categories)" : "All Expenses Categories"}
              </option>
              {expenseAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} {acc.nameGujarati ? `(${acc.nameGujarati})` : ""}
                </option>
              ))}
            </select>
            <span className="absolute right-2.5 top-2.5 pointer-events-none text-slate-400 text-[10px]">
              ▼
            </span>
          </div>
        </div>
      </div>

      {/* KPI Chips Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 shadow-sm flex items-center gap-2">
          <span className="text-slate-400">Total Entries:</span>
          <span className="font-bold text-slate-900 font-mono">{summary.count}</span>
        </div>
        <div className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 shadow-sm flex items-center gap-2">
          <span className="text-slate-400">{lang === "gu" ? "કુલ ખર્ચ:" : "Total Expense:"}</span>
          <span className="font-bold text-rose-600 font-mono">
            ₹{summary.totalAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 shadow-sm flex items-center gap-2">
          <span>💵 Cash:</span>
          <span className="font-bold font-mono">
            ₹{summary.cashAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="px-3.5 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-xs font-semibold text-blue-800 shadow-sm flex items-center gap-2">
          <span>🏦 Bank / UPI:</span>
          <span className="font-bold font-mono">
            ₹{summary.bankAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Expenses Table matching Columns of expense_frame18.jpg */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-32">
                  <div className="flex items-center gap-1 cursor-pointer">
                    <span>{lang === "gu" ? "તારીખ" : "Date"}</span>
                    <span className="text-slate-400 text-[10px]">⇅</span>
                  </div>
                </th>
                <th className="py-3 px-4 w-36">
                  {lang === "gu" ? "ખર્ચ નંબર" : "Expense Number"}
                </th>
                <th className="py-3 px-4">
                  {lang === "gu" ? "પાર્ટી નામ" : "Party Name"}
                </th>
                <th className="py-3 px-4">
                  {lang === "gu" ? "કેટેગરી" : "Category"}
                </th>
                <th className="py-3 px-4 text-right w-36">
                  <div className="flex items-center justify-end gap-1 cursor-pointer">
                    <span>{lang === "gu" ? "રકમ" : "Amount"}</span>
                    <span className="text-slate-400 text-[10px]">⇅</span>
                  </div>
                </th>
                <th className="py-3 px-4 text-center w-16">
                  {lang === "gu" ? "ક્રિયા" : ""}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <p>{lang === "gu" ? "ખર્ચા લોડ થઈ રહ્યા છે..." : "Loading expenses..."}</p>
                  </td>
                </tr>
              ) : filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="text-3xl mb-2">🧾</div>
                    <p className="font-semibold text-slate-700">
                      {lang === "gu" ? "કોઈ ખર્ચ મળ્યો નથી" : "No expenses found"}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {lang === "gu"
                        ? "નવા ખર્ચની નોંધ કરવા માટે 'Create Expense' બટન પર ક્લિક કરો."
                        : "Click '+ Create Expense' to record your first daily expense."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((v) => {
                  const details = getVoucherDetails(v);
                  return (
                    <tr
                      key={v.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        v.isCancelled ? "bg-rose-50/30 opacity-70" : ""
                      }`}
                    >
                      {/* Date */}
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {v.voucherDate
                          ? new Date(v.voucherDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </td>

                      {/* Expense Number */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {v.voucherNumber}
                        {v.referenceNo && (
                          <span className="block text-[10px] font-normal text-slate-400">
                            Ref: {v.referenceNo}
                          </span>
                        )}
                      </td>

                      {/* Party Name */}
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {details.partyName}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900">
                          {details.expenseAccount?.name || "General Expense"}
                        </span>
                        {details.expenseAccount?.nameGujarati && (
                          <span className="text-[10px] text-slate-400 block">
                            {details.expenseAccount.nameGujarati}
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                        ₹
                        {Number(details.amount).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center relative">
                        <div className="relative inline-block text-left">
                          <button
                            onClick={(e) => {
                              if (actionMenuVoucherId === v.id) {
                                setActionMenuVoucherId(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const spaceBelowViewport = window.innerHeight - rect.bottom;
                                const spaceAboveViewport = rect.top;
                                const table = e.currentTarget.closest("table");
                                const tableRect = table?.getBoundingClientRect();
                                const spaceBelowTable = tableRect ? tableRect.bottom - rect.bottom : 999;
                                const spaceAboveTable = tableRect ? rect.top - tableRect.top : 999;
                                const shouldOpenUp =
                                  (spaceBelowViewport < 200 || spaceBelowTable < 180) &&
                                  (spaceAboveTable >= 140 || spaceAboveViewport >= 200);
                                setActionMenuOpenUp(shouldOpenUp);
                                setActionMenuVoucherId(v.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>

                          {actionMenuVoucherId === v.id && (
                            <div className={`absolute right-0 ${
                              actionMenuOpenUp ? "bottom-full mb-1 origin-bottom-right" : "top-full mt-1 origin-top-right"
                            } w-40 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1 text-xs animate-in fade-in zoom-in-95 duration-100`}>
                              <button
                                onClick={() => {
                                  setSelectedVoucher(v);
                                  setActionMenuVoucherId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2"
                              >
                                <span>👁️</span>
                                <span>{lang === "gu" ? "વિગતો જુઓ" : "View Details"}</span>
                              </button>
                              {!v.isCancelled && (
                                <button
                                  onClick={() => {
                                    setReversalTarget(v);
                                    setReversalReason("");
                                    setReversalError(null);
                                    setActionMenuVoucherId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 font-medium flex items-center gap-2"
                                >
                                  <span>↩️</span>
                                  <span>{lang === "gu" ? "વાઉચર રદ કરો" : "Reverse / Cancel"}</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Expense Modal matching MyBillBook */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title={lang === "gu" ? "નવો ખર્ચ ઉમેરો (Create Expense)" : "Create Expense"}
        titleGujarati="નવો દૈનિક ખર્ચ નોંધો"
        maxWidth="md"
      >
        <form onSubmit={handleRecordExpense} className="space-y-4">
          {expenseError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{expenseError}</span>
            </div>
          )}

          {/* Category with inline Add Head button */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {lang === "gu" ? "ખર્ચ કેટેગરી (Expense Category) *" : "Expense Category *"}
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsExpenseModalOpen(false);
                  setIsNewCategoryModalOpen(true);
                }}
                className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
              >
                <span>+</span>
                <span>{lang === "gu" ? "નવી કેટેગરી ઉમેરો" : "Add New Category"}</span>
              </button>
            </div>
            <select
              required
              value={expenseForm.expenseAccountId}
              onChange={(e) => setExpenseForm({ ...expenseForm, expenseAccountId: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
            >
              <option value="">
                {lang === "gu" ? "-- કેટેગરી પસંદ કરો --" : "-- Select Expense Category --"}
              </option>
              {expenseAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} {acc.nameGujarati ? `(${acc.nameGujarati})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {lang === "gu" ? "રકમ (₹) *" : "Amount (₹) *"}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 font-bold text-slate-500">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full text-xs pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {lang === "gu" ? "તારીખ *" : "Date *"}
              </label>
              <input
                type="date"
                required
                value={expenseForm.voucherDate}
                onChange={(e) => setExpenseForm({ ...expenseForm, voucherDate: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Paid From Account */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {lang === "gu" ? "ચુકવણી મોડ / ખાતું (Paid From)" : "Payment Mode / Paid From"}
            </label>
            <select
              value={expenseForm.paidFromAccountId}
              onChange={(e) => setExpenseForm({ ...expenseForm, paidFromAccountId: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
            >
              <option value="">
                {lang === "gu" ? "💵 રોકડ ખાતું (Default Cash Account)" : "💵 Cash in Hand (Default)"}
              </option>
              {paymentAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} {acc.nameGujarati ? `(${acc.nameGujarati})` : ""} - ₹
                  {Number(acc.currentBalance || 0).toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          {/* Party Name / Vendor (matching Party Name column in video) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {lang === "gu" ? "પાર્ટી / વેન્ડર નામ (Party Name)" : "Party Name / Vendor (Optional)"}
              </label>
              <input
                type="text"
                value={expenseForm.partyName}
                onChange={(e) => setExpenseForm({ ...expenseForm, partyName: e.target.value })}
                placeholder={lang === "gu" ? "દા.ત. શર્મા ટ્રાન્સપોર્ટ, રમેશભાઈ" : "e.g. Sharma Transport, Tea vendor"}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {lang === "gu" ? "બિલ / રસીદ નં." : "Bill / Invoice / Ref No."}
              </label>
              <input
                type="text"
                value={expenseForm.referenceNo}
                onChange={(e) => setExpenseForm({ ...expenseForm, referenceNo: e.target.value })}
                placeholder="e.g. PETROL-101, RENT-OCT"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Narration */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {lang === "gu" ? "વિગત / શેરો (Remarks)" : "Remarks / Narration"}
            </label>
            <textarea
              rows={2}
              value={expenseForm.narration}
              onChange={(e) => setExpenseForm({ ...expenseForm, narration: e.target.value })}
              placeholder={lang === "gu" ? "વધારાની વિગતો લખો..." : "Add any specific note about this expense..."}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              {lang === "gu" ? "રદ કરો" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmittingExpense}
              className="px-6 py-2.5 text-xs font-bold text-white bg-[#4F46E5] hover:bg-[#4338CA] active:bg-[#3730A3] rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              {isSubmittingExpense && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{lang === "gu" ? "ખર્ચ સાચવો (Save Expense)" : "Save Expense"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Add New Expense Category Modal */}
      <Modal
        isOpen={isNewCategoryModalOpen}
        onClose={() => setIsNewCategoryModalOpen(false)}
        title={lang === "gu" ? "નવી ખર્ચ કેટેગરી બનાવો" : "Create Expense Category"}
        titleGujarati="નવું ખર્ચ ખાતું"
        maxWidth="sm"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4">
          {categoryError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{categoryError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {lang === "gu" ? "કેટેગરી નામ (ઇંગ્લિશમાં) *" : "Category Name (English) *"}
            </label>
            <input
              type="text"
              required
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              placeholder="e.g. Fuel Charges, Office Stationery, Tea Expenses"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {lang === "gu" ? "કેટેગરી નામ (ગુજરાતીમાં)" : "Category Name (Gujarati)"}
            </label>
            <input
              type="text"
              value={categoryForm.nameGujarati}
              onChange={(e) => setCategoryForm({ ...categoryForm, nameGujarati: e.target.value })}
              placeholder="દા.ત. ઇંધણ ખર્ચ, ચા-નાસ્તો, ઓફિસ ખર્ચ"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {lang === "gu" ? "લેજર ગ્રૂપ (Ledger Group)" : "Ledger Group"}
            </label>
            <select
              value={categoryForm.groupId}
              onChange={(e) => setCategoryForm({ ...categoryForm, groupId: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
            >
              {groups
                .filter((g) => g.nature === "EXPENSE" || g.name.toLowerCase().includes("expense"))
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewCategoryModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              {lang === "gu" ? "રદ કરો" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmittingCategory}
              className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              {isSubmittingCategory && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{lang === "gu" ? "બનાવો (Create)" : "Create"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Drilldown Voucher Details Modal */}
      <Modal
        isOpen={!!selectedVoucher}
        onClose={() => setSelectedVoucher(null)}
        title={
          selectedVoucher
            ? `${lang === "gu" ? "ખર્ચ વાઉચર વિગત" : "Expense Details"} - ${selectedVoucher.voucherNumber}`
            : ""
        }
        titleGujarati="વાઉચર વિગતો"
        maxWidth="md"
      >
        {selectedVoucher && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 font-semibold block">
                  {lang === "gu" ? "તારીખ" : "Date"}:
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedVoucher.voucherDate
                    ? new Date(selectedVoucher.voucherDate).toLocaleDateString("en-IN")
                    : "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">
                  {lang === "gu" ? "કુલ રકમ" : "Amount"}:
                </span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  ₹
                  {Number(selectedVoucher.totalAmount).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              {selectedVoucher.referenceNo && (
                <div>
                  <span className="text-slate-500 font-semibold block">
                    {lang === "gu" ? "રેફરન્સ / બિલ નં." : "Reference No."}:
                  </span>
                  <span className="font-mono text-slate-800">{selectedVoucher.referenceNo}</span>
                </div>
              )}
              <div>
                <span className="text-slate-500 font-semibold block">
                  {lang === "gu" ? "સ્થિતિ" : "Status"}:
                </span>
                <StatusBadge status={selectedVoucher.isCancelled ? "CANCELLED" : "PAID"} />
              </div>
            </div>

            {selectedVoucher.narration && (
              <div className="text-xs bg-white p-3 rounded-xl border border-slate-200">
                <span className="font-semibold text-slate-500 block mb-1">
                  {lang === "gu" ? "વિગત / શેરો:" : "Narration:"}
                </span>
                <span className="text-slate-800">{selectedVoucher.narration}</span>
              </div>
            )}

            {/* Journal Entries Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                {lang === "gu" ? "ખાતાવહી પ્રવેશો (Journal Postings)" : "Double-Entry Postings"}
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">{lang === "gu" ? "ખાતું" : "Account"}</th>
                      <th className="py-2.5 px-3 text-right">{lang === "gu" ? "ઉધાર (Dr ₹)" : "Debit (₹)"}</th>
                      <th className="py-2.5 px-3 text-right">{lang === "gu" ? "જમા (Cr ₹)" : "Credit (₹)"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {(selectedVoucher.journalEntries || selectedVoucher.lines || []).map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 text-slate-800 font-sans">
                          <div className="font-semibold">{line.account?.name || "Account"}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{line.account?.code}</div>
                        </td>
                        <td className="py-2 px-3 text-right text-slate-900">
                          {Number(line.debitAmount) > 0 ? `₹${Number(line.debitAmount).toFixed(2)}` : "-"}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-900">
                          {Number(line.creditAmount) > 0 ? `₹${Number(line.creditAmount).toFixed(2)}` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedVoucher(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                {lang === "gu" ? "બંધ કરો" : "Close"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reversal Confirmation Modal */}
      <Modal
        isOpen={!!reversalTarget}
        onClose={() => setReversalTarget(null)}
        title={
          reversalTarget
            ? `${lang === "gu" ? "વાઉચર રદ કરો" : "Reverse Voucher"} - ${reversalTarget.voucherNumber}`
            : ""
        }
        titleGujarati="વાઉચર રદ કરવાની ખાતરી"
        maxWidth="sm"
      >
        {reversalTarget && (
          <form onSubmit={handleReverseVoucher} className="space-y-4">
            <p className="text-xs text-slate-600">
              {lang === "gu"
                ? "આ ખર્ચ વાઉચર રદ કરવાથી સંબંધિત ખાતાઓમાં રિવર્સલ જર્નલ એન્ટ્રી બનશે અને બેલેન્સ અપડેટ થશે."
                : "Reversing this expense voucher will create an atomic contra reversal journal voucher."}
            </p>

            {reversalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                <span>⚠️</span>
                <span>{reversalError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {lang === "gu" ? "રદ કરવાનું કારણ *" : "Reversal Reason *"}
              </label>
              <textarea
                required
                rows={2}
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder={lang === "gu" ? "દા.ત. ડુપ્લિકેટ અથવા ખોટી રકમ..." : "e.g. Duplicate or incorrect amount entered..."}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:border-rose-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReversalTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                {lang === "gu" ? "રદ ન કરો" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={isReversing || !reversalReason.trim()}
                className="px-6 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                {isReversing && (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>{lang === "gu" ? "રદ કરો" : "Confirm Reversal"}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
