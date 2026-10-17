"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { apiClient, extractList } from "@/lib/api-client";
import { Modal } from "@/components/ui/modal";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { DataTable, ColumnDef } from "@/components/ui/data-table";

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

export default function DailyExpensesPage() {
  const { lang, tenantContext } = useAuth();

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [ledgers, setLedgers] = useState<LedgerAccount[]>([]);
  const [groups, setGroups] = useState<LedgerGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<"ALL" | "TODAY" | "THIS_MONTH">("THIS_MONTH");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [modeFilter, setModeFilter] = useState<"ALL" | "CASH" | "BANK">("ALL");

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);

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
      const [vouchersRes, ledgersRes, groupsRes]: any = await Promise.all([
        apiClient.get("/vouchers", { voucherType: "PAYMENT" }),
        apiClient.get("/ledgers"),
        apiClient.get("/ledger-groups").catch(() => []),
      ]);

      const vList = extractList<Voucher>(vouchersRes);
      const lList = extractList<LedgerAccount>(ledgersRes);
      const gList = extractList<LedgerGroup>(groupsRes);

      setVouchers(vList);
      setLedgers(lList);
      setGroups(gList);
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

  // Derived expense ledgers (groups with nature EXPENSE or containing Expense in name)
  const expenseAccounts = useMemo(() => {
    return ledgers.filter(
      (l) =>
        l.group?.nature === "EXPENSE" ||
        l.group?.name?.toLowerCase().includes("expense"),
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

  // Helper to get expense account and payment mode from voucher
  const getVoucherDetails = (v: Voucher) => {
    const lines = v.journalEntries || v.lines || [];
    // Debit line is the expense account
    const expenseLine = lines.find((l) => Number(l.debitAmount) > 0);
    // Credit line is the cash/bank account
    const paymentLine = lines.find((l) => Number(l.creditAmount) > 0);

    const isCash =
      paymentLine?.account?.name?.toLowerCase().includes("cash") ||
      paymentLine?.account?.name?.includes("રોકડ") ||
      false;

    const isBank =
      paymentLine?.account?.name?.toLowerCase().includes("bank") ||
      paymentLine?.account?.name?.includes("બેંક") ||
      (!isCash && !!paymentLine);

    return {
      expenseAccount: expenseLine?.account,
      paymentAccount: paymentLine?.account,
      isCash,
      isBank,
      amount: expenseLine ? Number(expenseLine.debitAmount) : v.totalAmount,
    };
  };

  // Filtered expense vouchers
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      // Must be a PAYMENT voucher
      if (v.voucherType !== "PAYMENT") return false;

      const details = getVoucherDetails(v);

      // Search
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const matchesNo = v.voucherNumber?.toLowerCase().includes(s);
        const matchesNarration = v.narration?.toLowerCase().includes(s);
        const matchesRef = v.referenceNo?.toLowerCase().includes(s);
        const matchesAccount = details.expenseAccount?.name?.toLowerCase().includes(s);
        if (!matchesNo && !matchesNarration && !matchesRef && !matchesAccount) return false;
      }

      // Date Filter
      if (dateFilter === "TODAY") {
        const todayStr = new Date().toISOString().split("T")[0];
        if (!v.voucherDate?.startsWith(todayStr)) return false;
      } else if (dateFilter === "THIS_MONTH") {
        const curMonth = new Date().toISOString().substring(0, 7);
        if (!v.voucherDate?.startsWith(curMonth)) return false;
      }

      // Category filter
      if (categoryFilter !== "ALL") {
        if (details.expenseAccount?.id !== categoryFilter) return false;
      }

      // Mode Filter
      if (modeFilter === "CASH" && !details.isCash) return false;
      if (modeFilter === "BANK" && !details.isBank) return false;

      return true;
    });
  }, [vouchers, searchTerm, dateFilter, categoryFilter, modeFilter]);

  // KPI calculations
  const kpis = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const thisMonthStr = new Date().toISOString().substring(0, 7);

    let todayTotal = 0;
    let thisMonthTotal = 0;
    let cashTotal = 0;
    let bankTotal = 0;

    vouchers.forEach((v) => {
      if (v.isCancelled) return;
      const details = getVoucherDetails(v);
      const amt = details.amount;

      if (v.voucherDate?.startsWith(todayStr)) {
        todayTotal += amt;
      }
      if (v.voucherDate?.startsWith(thisMonthStr)) {
        thisMonthTotal += amt;
        if (details.isCash) cashTotal += amt;
        else bankTotal += amt;
      }
    });

    return { todayTotal, thisMonthTotal, cashTotal, bankTotal };
  }, [vouchers]);

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

      await apiClient.post("/vouchers/expense", {
        expenseAccountId: expenseForm.expenseAccountId,
        paidFromAccountId: expenseForm.paidFromAccountId || undefined,
        amount: amt,
        voucherDate: expenseForm.voucherDate,
        referenceNo: expenseForm.referenceNo || undefined,
        narration: expenseForm.narration || undefined,
      });

      setIsExpenseModalOpen(false);
      setExpenseForm({
        expenseAccountId: "",
        paidFromAccountId: "",
        amount: "",
        voucherDate: new Date().toISOString().split("T")[0],
        referenceNo: "",
        narration: "",
      });

      setToastMessage(lang === "gu" ? "ખર્ચ સફળતાપૂર્વક નોંધાયો છે!" : "Expense recorded successfully!");
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

      // Find an expense group if none selected
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

      // Automatically select this new category in expenseForm
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
      setToastMessage(lang === "gu" ? "વાઉચર સફળતાપૂર્વક રદ (રિવર્સ) થયું છે!" : "Voucher reversed successfully!");
      setTimeout(() => setToastMessage(null), 4000);
      await fetchData();
    } catch (err: any) {
      setReversalError(err.message || "Failed to reverse voucher.");
    } finally {
      setIsReversing(false);
    }
  };

  const columns: ColumnDef<Voucher>[] = [
    {
      header: lang === "gu" ? "વાઉચર નં." : "Voucher #",
      accessorKey: "voucherNumber",
      sortable: true,
      cell: (v) => (
        <div>
          <span className="font-mono font-bold text-slate-900">{v.voucherNumber}</span>
          {v.referenceNo && (
            <div className="text-[11px] font-mono text-slate-500">
              Ref: {v.referenceNo}
            </div>
          )}
        </div>
      ),
    },
    {
      header: lang === "gu" ? "તારીખ" : "Date",
      accessorKey: "voucherDate",
      sortable: true,
      cell: (v) => (
        <span className="font-mono text-slate-700 text-xs">
          {v.voucherDate ? new Date(v.voucherDate).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }) : "-"}
        </span>
      ),
    },
    {
      header: lang === "gu" ? "ખર્ચ ખાતું / કેટેગરી" : "Expense Head / Category",
      accessorKey: "journalEntries",
      cell: (v) => {
        const details = getVoucherDetails(v);
        return (
          <div>
            <div className="font-semibold text-slate-900">
              {details.expenseAccount?.name || "General Expense"}
            </div>
            {details.expenseAccount?.nameGujarati && (
              <div className="text-[11px] text-slate-500">
                {details.expenseAccount.nameGujarati}
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: lang === "gu" ? "ચૂકવણી મોડ" : "Paid Through",
      cell: (v) => {
        const details = getVoucherDetails(v);
        if (details.isCash) {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span>💵</span>
              <span>{lang === "gu" ? "રોકડ (Cash)" : "Cash"}</span>
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span>🏦</span>
            <span>{details.paymentAccount?.name || (lang === "gu" ? "બેંક (Bank)" : "Bank")}</span>
          </span>
        );
      },
    },
    {
      header: lang === "gu" ? "શેરો / વિગત" : "Narration",
      accessorKey: "narration",
      cell: (v) => (
        <span className="text-xs text-slate-600 line-clamp-2 max-w-xs" title={v.narration}>
          {v.narration || "-"}
        </span>
      ),
    },
    {
      header: lang === "gu" ? "ખર્ચ રકમ (₹)" : "Amount (₹)",
      accessorKey: "totalAmount",
      sortable: true,
      className: "text-right",
      cell: (v) => (
        <span className="font-mono font-bold text-slate-900 text-sm">
          ₹{Number(v.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: lang === "gu" ? "સ્થિતિ" : "Status",
      accessorKey: "isCancelled",
      cell: (v) => (
        <StatusBadge status={v.isCancelled ? "CANCELLED" : "PAID"} />
      ),
    },
    {
      header: lang === "gu" ? "ક્રિયા" : "Action",
      className: "text-right",
      cell: (v) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => setSelectedVoucher(v)}
            className="p-1.5 text-xs text-primary hover:bg-primary/10 rounded-lg font-semibold transition-colors"
            title="View Details"
          >
            {lang === "gu" ? "જુઓ" : "View"}
          </button>
          {!v.isCancelled && (
            <button
              onClick={() => {
                setReversalTarget(v);
                setReversalReason("");
                setReversalError(null);
              }}
              className="p-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-semibold transition-colors"
              title="Reverse Expense"
            >
              {lang === "gu" ? "રદ કરો" : "Reverse"}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in text-xs font-semibold">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-border shadow-subtle flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/finance/vouchers"
              className="text-xs font-semibold text-muted hover:text-primary flex items-center gap-1"
            >
              <span>←</span>
              <span>{lang === "gu" ? "રોજમેળ અને વાઉચરો" : "Cash Book & Vouchers"}</span>
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {lang === "gu"
              ? "દૈનિક ખર્ચા નોંધ (Daily Expenses Entry)"
              : "Daily Expenses Register & Entry"}
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            {lang === "gu"
              ? "દુકાન, ઓફિસ અને અન્ય રોજિંદા ખર્ચાઓની સરળ રોકડ / બેંક ચૂકવણી"
              : "Track day-to-day business expenses with instant double-entry ledger posting"}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => {
              setIsNewCategoryModalOpen(true);
              setCategoryError(null);
            }}
            className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5 border border-slate-200"
          >
            <span>📁</span>
            <span>{lang === "gu" ? "+ નવો ખર્ચ કેટેગરી" : "+ New Expense Head"}</span>
          </button>
          <button
            onClick={() => {
              setIsExpenseModalOpen(true);
              setExpenseError(null);
            }}
            className="px-5 py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover active:bg-primary-pressed rounded-xl shadow-card hover:shadow-hover transition-all flex items-center gap-2"
          >
            <span>+</span>
            <span>{lang === "gu" ? "નવો ખર્ચ નોંધો (Record Expense)" : "Record New Expense"}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <span>{lang === "gu" ? "આજના ખર્ચા" : "Today's Expenses"}</span>
            <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg text-sm">📅</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            ₹{kpis.todayTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            {lang === "gu" ? "આજની તારીખે થયેલ ખર્ચ" : "Expenses posted today"}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <span>{lang === "gu" ? "ચાલુ મહિનાના ખર્ચા" : "This Month's Total"}</span>
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg text-sm">📊</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            ₹{kpis.thisMonthTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            {lang === "gu" ? "ચાલુ માસમાં કુલ થયેલ ખર્ચ" : "Total month-to-date expenses"}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <span>{lang === "gu" ? "રોકડ ખર્ચા (આ માસે)" : "Cash Expenses"}</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-sm">💵</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            ₹{kpis.cashTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            {lang === "gu" ? "રોકડેથી ચૂકવાયેલ ખર્ચાઓ" : "Paid from Cash in Hand"}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <span>{lang === "gu" ? "બેંક / UPI ખર્ચા" : "Bank / Online Expenses"}</span>
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm">🏦</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            ₹{kpis.bankTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            {lang === "gu" ? "બેંક ટ્રાન્સફર / ચેક દ્વારા" : "Paid via Bank / Online"}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            🔍
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              lang === "gu"
                ? "વાઉચર નં., વિગત અથવા ખર્ચ નામ શોધો..."
                : "Search by voucher #, category, narration..."
            }
            className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary outline-none transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Range Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setDateFilter("TODAY")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dateFilter === "TODAY"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {lang === "gu" ? "આજે" : "Today"}
            </button>
            <button
              onClick={() => setDateFilter("THIS_MONTH")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dateFilter === "THIS_MONTH"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {lang === "gu" ? "આ મહિને" : "This Month"}
            </button>
            <button
              onClick={() => setDateFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dateFilter === "ALL"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {lang === "gu" ? "બધા" : "All"}
            </button>
          </div>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none focus:bg-white focus:border-primary"
          >
            <option value="ALL">{lang === "gu" ? "બધા ખર્ચાઓ (All Categories)" : "All Categories"}</option>
            {expenseAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} {acc.nameGujarati ? `(${acc.nameGujarati})` : ""}
              </option>
            ))}
          </select>

          {/* Mode Dropdown */}
          <select
            value={modeFilter}
            onChange={(e: any) => setModeFilter(e.target.value)}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none focus:bg-white focus:border-primary"
          >
            <option value="ALL">{lang === "gu" ? "બધા મોડ (All Modes)" : "All Modes"}</option>
            <option value="CASH">{lang === "gu" ? "💵 રોકડ (Cash Only)" : "💵 Cash Only"}</option>
            <option value="BANK">{lang === "gu" ? "🏦 બેંક (Bank Only)" : "🏦 Bank Only"}</option>
          </select>
        </div>
      </div>

      {/* Main Expense Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredVouchers}
          isLoading={isLoading}
          searchPlaceholder={
            lang === "gu" ? "શોધો..." : "Search expenses..."
          }
        />
      </div>

      {/* Quick Record Expense Modal */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title={
          lang === "gu"
            ? "નવો દૈનિક ખર્ચ નોંધો (Record Expense Voucher)"
            : "Record New Daily Expense"
        }
      >
        <form onSubmit={handleRecordExpense} className="space-y-4">
          {expenseError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{expenseError}</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {lang === "gu" ? "ખર્ચ ખાતું (Expense Head) *" : "Expense Head / Account *"}
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsExpenseModalOpen(false);
                  setIsNewCategoryModalOpen(true);
                }}
                className="text-[11px] font-bold text-primary hover:underline"
              >
                + {lang === "gu" ? "નવું ખાતું ઉમેરો" : "Add New Head"}
              </button>
            </div>
            <select
              required
              value={expenseForm.expenseAccountId}
              onChange={(e) => setExpenseForm({ ...expenseForm, expenseAccountId: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-primary outline-none"
            >
              <option value="">{lang === "gu" ? "-- ખર્ચ ખાતું પસંદ કરો --" : "-- Select Expense Account --"}</option>
              {expenseAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} {acc.nameGujarati ? `(${acc.nameGujarati})` : ""} {acc.code ? `[${acc.code}]` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {lang === "gu" ? "ખર્ચની રકમ (₹) *" : "Amount (₹) *"}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                placeholder="0.00"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:bg-white focus:border-primary outline-none"
              />
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
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:border-primary outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {lang === "gu" ? "ચૂકવણી ક્યાંથી કરી? (Paid From)" : "Paid From Account"}
            </label>
            <select
              value={expenseForm.paidFromAccountId}
              onChange={(e) => setExpenseForm({ ...expenseForm, paidFromAccountId: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-primary outline-none"
            >
              <option value="">
                {lang === "gu" ? "રોકડ ખાતું (Default Cash Account)" : "Cash in Hand (Default)"}
              </option>
              {paymentAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} {acc.nameGujarati ? `(${acc.nameGujarati})` : ""} - ₹{Number(acc.currentBalance || 0).toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {lang === "gu" ? "બિલ / વાઉચર નં." : "Bill / Receipt / Ref No."}
            </label>
            <input
              type="text"
              value={expenseForm.referenceNo}
              onChange={(e) => setExpenseForm({ ...expenseForm, referenceNo: e.target.value })}
              placeholder={lang === "gu" ? "દા.ત. PETROL-01" : "e.g. PETROL-9921, RENT-OCT"}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {lang === "gu" ? "શેરો / વિગત (Narration)" : "Narration / Remarks"}
            </label>
            <textarea
              rows={2}
              value={expenseForm.narration}
              onChange={(e) => setExpenseForm({ ...expenseForm, narration: e.target.value })}
              placeholder={
                lang === "gu"
                  ? "દા.ત. ઓફિસ ચા-નાસ્તો અને મહેમાન ખર્ચ..."
                  : "e.g. Office tea snacks and guest refreshment..."
              }
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:border-primary outline-none"
            />
          </div>

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
              className="px-6 py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover active:bg-primary-pressed rounded-xl shadow-card transition-all flex items-center gap-2"
            >
              {isSubmittingExpense && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{lang === "gu" ? "ખર્ચ નોંધો (Save Expense)" : "Record Expense"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Add Expense Category Modal */}
      <Modal
        isOpen={isNewCategoryModalOpen}
        onClose={() => setIsNewCategoryModalOpen(false)}
        title={
          lang === "gu"
            ? "નવો ખર્ચ કેટેગરી બનાવો (New Expense Head)"
            : "Create New Expense Head"
        }
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
              {lang === "gu" ? "ખાતાનું નામ (ઇંગ્લિશમાં) *" : "Account Name (English) *"}
            </label>
            <input
              type="text"
              required
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              placeholder="e.g. Office Stationery, Electricity Bill, Staff Lunch"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {lang === "gu" ? "ખાતાનું નામ (ગુજરાતીમાં)" : "Account Name (Gujarati)"}
            </label>
            <input
              type="text"
              value={categoryForm.nameGujarati}
              onChange={(e) => setCategoryForm({ ...categoryForm, nameGujarati: e.target.value })}
              placeholder="દા.ત. ઓફિસ સ્ટેશનરી, લાઇટ બિલ, સ્ટાફ ભોજન ખર્ચ"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {lang === "gu" ? "લેજર ગ્રૂપ (Ledger Group)" : "Ledger Group"}
            </label>
            <select
              value={categoryForm.groupId}
              onChange={(e) => setCategoryForm({ ...categoryForm, groupId: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-primary outline-none"
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
              className="px-6 py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover active:bg-primary-pressed rounded-xl shadow-card transition-all flex items-center gap-2"
            >
              {isSubmittingCategory && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{lang === "gu" ? "ખાતું બનાવો (Create)" : "Create Head"}</span>
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
            ? `${lang === "gu" ? "ખર્ચ વાઉચર વિગત" : "Expense Voucher Details"} - ${selectedVoucher.voucherNumber}`
            : ""
        }
      >
        {selectedVoucher && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 font-semibold block">
                  {lang === "gu" ? "તારીખ" : "Voucher Date"}:
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedVoucher.voucherDate ? new Date(selectedVoucher.voucherDate).toLocaleDateString("en-IN") : "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">
                  {lang === "gu" ? "કુલ રકમ" : "Total Amount"}:
                </span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  ₹{Number(selectedVoucher.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
                <StatusBadge status={selectedVoucher.isCancelled ? "CANCELLED" : "ACTIVE"} />
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
                {lang === "gu" ? "ખાતાવહી પ્રવેશો (Journal Lines)" : "Double-Entry Postings"}
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">
                        {lang === "gu" ? "ખાતું" : "Account"}
                      </th>
                      <th className="py-2.5 px-3 text-right">
                        {lang === "gu" ? "ઉધાર (Dr ₹)" : "Debit (₹)"}
                      </th>
                      <th className="py-2.5 px-3 text-right">
                        {lang === "gu" ? "જમા (Cr ₹)" : "Credit (₹)"}
                      </th>
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
            ? `${lang === "gu" ? "ખર્ચ વાઉચર રદ (રિવર્સ) કરો" : "Reverse Expense Voucher"} - ${reversalTarget.voucherNumber}`
            : ""
        }
      >
        {reversalTarget && (
          <form onSubmit={handleReverseVoucher} className="space-y-4">
            <p className="text-xs text-slate-600">
              {lang === "gu"
                ? "આ વાઉચર રદ કરવાથી સંબંધિત ખાતાઓમાં આપોઆપ રિવર્સલ જર્નલ નોંધ બનશે અને સિલક પુનઃસ્થાપિત થશે."
                : "Reversing this voucher will create an atomic contra reversal journal voucher and restore account balances."}
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
                placeholder={
                  lang === "gu"
                    ? "દા.ત. ખોટી રકમ લખાઈ ગઈ હતી..."
                    : "e.g. Wrong amount entered or duplicate entry..."
                }
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
                className="px-6 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 rounded-xl shadow-card transition-all flex items-center gap-2"
              >
                {isReversing && (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>{lang === "gu" ? "વાઉચર રદ કરો" : "Confirm Reversal"}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
