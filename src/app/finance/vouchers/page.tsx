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
  narration?: string;
  account?: {
    id: string;
    code: string;
    name: string;
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

interface LedgerOption {
  id: string;
  name: string;
  code?: string;
  currentBalance?: number;
  group?: { name: string; classification?: string; nature?: string };
}

interface PartyOption {
  id: string;
  name: string;
  type: string;
  phone?: string;
}

export default function FinanceVouchersPage() {
  const { lang, tenantContext } = useAuth();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [ledgers, setLedgers] = useState<LedgerOption[]>([]);
  const [parties, setParties] = useState<PartyOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL"); // ALL, TODAY, THIS_MONTH

  // Modals
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);

  // Reversal Modal
  const [reversalTarget, setReversalTarget] = useState<Voucher | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [isReversing, setIsReversing] = useState(false);
  const [reversalError, setReversalError] = useState<string | null>(null);

  // Quick Receipt Modal
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptForm, setReceiptForm] = useState({
    partyId: "",
    depositToAccountId: "",
    amount: "",
    voucherDate: new Date().toISOString().split("T")[0],
    referenceNo: "",
    narration: "",
  });
  const [isSubmittingReceipt, setIsSubmittingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  // Quick Payment/Expense Modal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
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

  // Quick Contra Modal (Cash <-> Bank Transfer)
  const [isContraModalOpen, setIsContraModalOpen] = useState(false);
  const [contraForm, setContraForm] = useState({
    fromAccountId: "",
    toAccountId: "",
    amount: "",
    voucherDate: new Date().toISOString().split("T")[0],
    narration: "",
  });
  const [isSubmittingContra, setIsSubmittingContra] = useState(false);
  const [contraError, setContraError] = useState<string | null>(null);

  // Success Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchVouchers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get("/vouchers", {
        search: searchTerm || undefined,
        voucherType: typeFilter !== "ALL" && typeFilter !== "CASH_BOOK" ? typeFilter : undefined,
      });
      const list = extractList<Voucher>(res);
      setVouchers(list);
    } catch (err: any) {
      setError(err.message || "Failed to load vouchers.");
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, typeFilter]);

  const fetchMetadata = useCallback(async () => {
    try {
      const [ledgersRes, partiesRes]: any = await Promise.all([
        apiClient.get("/ledgers").catch(() => []),
        apiClient.get("/parties").catch(() => []),
      ]);
      setLedgers(extractList<LedgerOption>(ledgersRes));
      setParties(extractList<PartyOption>(partiesRes));
    } catch (err) {
      console.error("Failed to load metadata:", err);
    }
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchVouchers();
      fetchMetadata();
    }
  }, [tenantContext.companyId, fetchVouchers, fetchMetadata]);

  // Derived KPI Metrics
  const cashAccounts = useMemo(() => {
    return ledgers.filter(
      (l) =>
        l.name.toLowerCase().includes("cash") ||
        l.group?.name?.toLowerCase().includes("cash"),
    );
  }, [ledgers]);

  const bankAccounts = useMemo(() => {
    return ledgers.filter(
      (l) =>
        l.name.toLowerCase().includes("bank") ||
        l.group?.name?.toLowerCase().includes("bank"),
    );
  }, [ledgers]);

  const expenseAccounts = useMemo(() => {
    return ledgers.filter(
      (l) =>
        l.group?.nature === "EXPENSE" ||
        l.group?.classification === "EXPENSE" ||
        l.group?.name?.toLowerCase().includes("expense") ||
        l.group?.name?.toLowerCase().includes("indirect") ||
        l.group?.name?.toLowerCase().includes("direct"),
    );
  }, [ledgers]);

  const totalCashBalance = useMemo(() => {
    return cashAccounts.reduce((sum, a) => sum + Number(a.currentBalance || 0), 0);
  }, [cashAccounts]);

  const totalBankBalance = useMemo(() => {
    return bankAccounts.reduce((sum, a) => sum + Number(a.currentBalance || 0), 0);
  }, [bankAccounts]);

  const totalReceipts = useMemo(() => {
    return vouchers
      .filter((v) => v.voucherType === "RECEIPT" && !v.isCancelled)
      .reduce((s, v) => s + Number(v.totalAmount || 0), 0);
  }, [vouchers]);

  const totalPayments = useMemo(() => {
    return vouchers
      .filter((v) => v.voucherType === "PAYMENT" && !v.isCancelled)
      .reduce((s, v) => s + Number(v.totalAmount || 0), 0);
  }, [vouchers]);

  // Filtered List
  const filteredVouchers = useMemo(() => {
    let result = [...vouchers];

    if (typeFilter === "CASH_BOOK") {
      result = result.filter((v) => {
        const lines = v.journalEntries || v.lines || [];
        return (
          lines.some((l) => l.account?.name?.toLowerCase().includes("cash")) ||
          ["RECEIPT", "PAYMENT", "CONTRA"].includes(v.voucherType)
        );
      });
    } else if (typeFilter !== "ALL") {
      result = result.filter((v) => v.voucherType === typeFilter);
    }

    if (dateFilter === "TODAY") {
      const todayStr = new Date().toISOString().split("T")[0];
      result = result.filter((v) => v.voucherDate?.startsWith(todayStr));
    } else if (dateFilter === "THIS_MONTH") {
      const curMonth = new Date().toISOString().substring(0, 7);
      result = result.filter((v) => v.voucherDate?.startsWith(curMonth));
    }

    return result;
  }, [vouchers, typeFilter, dateFilter]);

  // Handle Voucher Reversal
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
      await fetchVouchers();
    } catch (err: any) {
      setReversalError(err.message || "Failed to reverse voucher.");
    } finally {
      setIsReversing(false);
    }
  };

  // Handle Quick Expense Submission
  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingExpense(true);
    setExpenseError(null);

    try {
      const amt = Number(expenseForm.amount);
      if (!amt || amt <= 0) {
        throw new Error("Please enter a valid expense amount.");
      }
      if (!expenseForm.expenseAccountId) {
        throw new Error("Please select an expense account.");
      }

      await apiClient.post("/vouchers/expense", {
        expenseAccountId: expenseForm.expenseAccountId,
        paidFromAccountId: expenseForm.paidFromAccountId || undefined,
        amount: amt,
        voucherDate: expenseForm.voucherDate,
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
      setToastMessage(lang === "gu" ? "ખર્ચ વાઉચર સફળતાપૂર્વક નોંધાયું છે!" : "Expense voucher recorded successfully!");
      setTimeout(() => setToastMessage(null), 4000);
      await fetchVouchers();
      await fetchMetadata();
    } catch (err: any) {
      setExpenseError(err.message || "Failed to record expense.");
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // Handle Quick Contra Transfer Submission
  const handleRecordContra = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingContra(true);
    setContraError(null);

    try {
      const amt = Number(contraForm.amount);
      if (!amt || amt <= 0) {
        throw new Error("Please enter a valid transfer amount.");
      }
      if (!contraForm.fromAccountId || !contraForm.toAccountId) {
        throw new Error("Please select both source and destination accounts.");
      }
      if (contraForm.fromAccountId === contraForm.toAccountId) {
        throw new Error("Source and destination accounts must be different.");
      }

      const voucherNumber = `CONTRA-${Date.now().toString(36).toUpperCase()}`;

      await apiClient.post("/vouchers", {
        voucherType: "CONTRA",
        voucherNumber,
        voucherDate: contraForm.voucherDate,
        narration: contraForm.narration || "Cash/Bank transfer contra entry",
        lines: [
          {
            accountId: contraForm.toAccountId,
            debitAmount: amt,
            creditAmount: 0,
            lineNarration: "Deposit to account",
          },
          {
            accountId: contraForm.fromAccountId,
            debitAmount: 0,
            creditAmount: amt,
            lineNarration: "Withdrawal from account",
          },
        ],
      });

      setIsContraModalOpen(false);
      setContraForm({
        fromAccountId: "",
        toAccountId: "",
        amount: "",
        voucherDate: new Date().toISOString().split("T")[0],
        narration: "",
      });
      setToastMessage(lang === "gu" ? "કોન્ટ્રા વાઉચર સફળતાપૂર્વક નોંધાયું છે!" : "Contra transfer recorded successfully!");
      setTimeout(() => setToastMessage(null), 4000);
      await fetchVouchers();
      await fetchMetadata();
    } catch (err: any) {
      setContraError(err.message || "Failed to record contra voucher.");
    } finally {
      setIsSubmittingContra(false);
    }
  };

  const typeColor: Record<string, "info" | "success" | "warning" | "danger" | "purple"> = {
    JOURNAL: "purple",
    RECEIPT: "success",
    PAYMENT: "warning",
    CONTRA: "info",
    SALES: "info",
    PURCHASE: "danger",
  };

  const columns: ColumnDef<Voucher>[] = [
    {
      header: lang === "gu" ? "વાઉચર નંબર" : "Voucher No.",
      accessorKey: "voucherNumber",
      sortable: true,
      cell: (v) => (
        <button
          onClick={() => setSelectedVoucher(v)}
          className="font-mono font-bold text-slate-900 hover:text-primary transition-colors text-left"
        >
          {v.voucherNumber}
        </button>
      ),
    },
    {
      header: lang === "gu" ? "તારીખ" : "Date",
      accessorKey: "voucherDate",
      sortable: true,
      cell: (v) => (
        <span className="font-mono text-slate-600 text-xs">
          {new Date(v.voucherDate).toLocaleDateString("en-IN")}
        </span>
      ),
    },
    {
      header: lang === "gu" ? "પ્રકાર" : "Type",
      accessorKey: "voucherType",
      sortable: true,
      cell: (v) => (
        <Badge variant={typeColor[v.voucherType] || "neutral"}>
          {v.voucherType}
        </Badge>
      ),
    },
    {
      header: lang === "gu" ? "ખાતાઓ (Dr / Cr)" : "Accounts (Dr / Cr)",
      cell: (v) => {
        const lines = v.journalEntries || v.lines || [];
        if (!lines.length) return <span className="text-slate-400 text-xs">—</span>;
        const drLine = lines.find((l) => Number(l.debitAmount) > 0);
        const crLine = lines.find((l) => Number(l.creditAmount) > 0);
        return (
          <div className="text-xs space-y-0.5">
            {drLine && (
              <div className="text-slate-800">
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded mr-1">Dr</span>
                {drLine.account?.name || "Account"}
              </div>
            )}
            {crLine && (
              <div className="text-slate-600">
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded mr-1">Cr</span>
                {crLine.account?.name || "Account"}
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: lang === "gu" ? "વિગત / લખાણ" : "Narration",
      accessorKey: "narration",
      cell: (v) => (
        <span className="text-slate-600 text-xs max-w-xs truncate block" title={v.narration || ""}>
          {v.narration || "—"}
        </span>
      ),
    },
    {
      header: lang === "gu" ? "રકમ (₹)" : "Amount (₹)",
      accessorKey: "totalAmount",
      sortable: true,
      className: "text-right",
      cell: (v) => (
        <span className="font-mono font-bold text-slate-900 text-sm">
          ₹{Number(v.totalAmount).toFixed(2)}
        </span>
      ),
    },
    {
      header: lang === "gu" ? "સ્થિતિ" : "Status",
      accessorKey: "isCancelled",
      cell: (v) => (
        <StatusBadge status={v.isCancelled ? "REVERSED" : "POSTED"} />
      ),
    },
    {
      header: lang === "gu" ? "ક્રિયા" : "Action",
      className: "text-right",
      cell: (v) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setSelectedVoucher(v)}
            className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            {lang === "gu" ? "વિગત જુઓ" : "View Lines"}
          </button>
          {!v.isCancelled && (
            <button
              onClick={() => {
                setReversalTarget(v);
                setReversalReason("");
                setReversalError(null);
              }}
              className="px-2 py-1 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Reverse Voucher"
            >
              {lang === "gu" ? "રદ કરો" : "Reverse"}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-800 flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-600 font-bold">✕</button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-50 text-amber-700 rounded-xl text-lg">💰</span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {lang === "gu" ? "રોજમેળ & આવક-જાવક વાઉચર" : "Cash Book & Receipts Register"}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {lang === "gu"
              ? "રોકડ સિલક, બેંક ટ્રાન્સફર, દૈનિક આવક-ખર્ચ અને તમામ નામા વાઉચરોનું કેન્દ્ર"
              : "Comprehensive double-entry cash book, receipts, expenses, contra transfers, and journals"}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>💸</span>
            <span>{lang === "gu" ? "+ ખર્ચ / ચુકવણી" : "+ Record Payment"}</span>
          </button>

          <button
            onClick={() => setIsContraModalOpen(true)}
            className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>🔄</span>
            <span>{lang === "gu" ? "+ બેંક/રોકડ ફેરબદલ" : "+ Contra Transfer"}</span>
          </button>

          <Link
            href="/finance/vouchers/new"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <span>📝</span>
            <span>{lang === "gu" ? "+ નવું જર્નલ વાઉચર" : "+ New Journal"}</span>
          </Link>
        </div>
      </div>

      {/* Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cash in Hand */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {lang === "gu" ? "રોકડ સિલક (Cash in Hand)" : "Cash in Hand"}
            </p>
            <p className="text-xl font-black text-slate-900 font-mono mt-1">
              ₹{totalCashBalance.toFixed(2)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {cashAccounts.length} {lang === "gu" ? "રોકડ ખાતા" : "Cash accounts"}
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-xl text-emerald-600">
            💵
          </div>
        </div>

        {/* Bank Balance */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {lang === "gu" ? "બેંક સિલક (Bank Balance)" : "Bank Balance"}
            </p>
            <p className="text-xl font-black text-slate-900 font-mono mt-1">
              ₹{totalBankBalance.toFixed(2)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {bankAccounts.length} {lang === "gu" ? "બેંક ખાતા" : "Bank accounts"}
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-xl text-blue-600">
            🏦
          </div>
        </div>

        {/* Total Receipts */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {lang === "gu" ? "કુલ આવક (Total Receipts)" : "Total Receipts"}
            </p>
            <p className="text-xl font-black text-emerald-700 font-mono mt-1">
              ₹{totalReceipts.toFixed(2)}
            </p>
            <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">
              ↓ {lang === "gu" ? "જમા આવક પહોંચો" : "Inflow receipts"}
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-xl text-emerald-600">
            📥
          </div>
        </div>

        {/* Total Payments */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {lang === "gu" ? "કુલ જાવક (Total Payments)" : "Total Payments"}
            </p>
            <p className="text-xl font-black text-rose-700 font-mono mt-1">
              ₹{totalPayments.toFixed(2)}
            </p>
            <p className="text-[11px] text-rose-600 mt-0.5 font-medium">
              ↑ {lang === "gu" ? "ઉધાર ખર્ચ/ચુકવણી" : "Outflow payments"}
            </p>
          </div>
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-xl text-rose-600">
            📤
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">
          {error}
        </div>
      )}

      {/* Main DataTable with Toolbar and Filter Tabs */}
      <DataTable<Voucher>
        data={filteredVouchers}
        columns={columns}
        keyExtractor={(v) => v.id}
        searchPlaceholder={
          lang === "gu"
            ? "વાઉચર નંબર, લખાણ, રકમ દ્વારા શોધો..."
            : "Search voucher no, narration, amount..."
        }
        searchKeys={["voucherNumber", "narration", "voucherType"]}
        defaultPageSize={10}
        isLoading={isLoading}
        emptyMessage={
          lang === "gu"
            ? "કોઈ વાઉચર નોંધાયેલ નથી. ઉપરના બટનથી નવું વાઉચર ઉમેરો."
            : "No vouchers recorded. Click 'Record Payment' or 'New Journal' to begin."
        }
        exportFilename="cash_book_vouchers"
        themeColor="saffron"
        toolbarChildren={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs">
              {[
                { id: "ALL", label: lang === "gu" ? "બધા" : "All" },
                { id: "CASH_BOOK", label: lang === "gu" ? "રોજમેળ (Cash)" : "Cash Book" },
                { id: "RECEIPT", label: lang === "gu" ? "આવક" : "Receipt" },
                { id: "PAYMENT", label: lang === "gu" ? "ચુકવણી" : "Payment" },
                { id: "CONTRA", label: lang === "gu" ? "કોન્ટ્રા" : "Contra" },
                { id: "JOURNAL", label: lang === "gu" ? "જર્નલ" : "Journal" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTypeFilter(tab.id)}
                  className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                    typeFilter === tab.id
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Date Range Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL">{lang === "gu" ? "સમગ્ર સમયગાળો" : "All Dates"}</option>
              <option value="TODAY">{lang === "gu" ? "આજનો દિવસ (Today)" : "Today"}</option>
              <option value="THIS_MONTH">{lang === "gu" ? "ચાલુ મહિનો (This Month)" : "This Month"}</option>
            </select>
          </div>
        }
      />

      {/* Voucher Detail Modal */}
      {selectedVoucher && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedVoucher(null)}
          title={`Voucher: ${selectedVoucher.voucherNumber}`}
          titleGujarati={`નામા વાઉચર વિગતો (${selectedVoucher.voucherType})`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <div>
                <span className="font-semibold text-slate-500">Date: </span>
                <span className="font-mono font-bold text-slate-900">
                  {new Date(selectedVoucher.voucherDate).toLocaleDateString("en-IN")}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-500">Type: </span>
                <Badge variant={typeColor[selectedVoucher.voucherType] || "neutral"}>
                  {selectedVoucher.voucherType}
                </Badge>
              </div>
              <div>
                <span className="font-semibold text-slate-500">Total: </span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  ₹{Number(selectedVoucher.totalAmount).toFixed(2)}
                </span>
              </div>
            </div>

            {selectedVoucher.narration && (
              <p className="text-xs text-slate-700 bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">
                <span className="font-bold text-slate-500 uppercase text-[10px] block mb-0.5">Narration:</span>
                {selectedVoucher.narration}
              </p>
            )}

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200">
                    <th className="py-2.5 px-3">Account</th>
                    <th className="py-2.5 px-3">Line Narration</th>
                    <th className="py-2.5 px-3 text-right">Debit (Dr ₹)</th>
                    <th className="py-2.5 px-3 text-right">Credit (Cr ₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {(selectedVoucher.journalEntries || selectedVoucher.lines || []).map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-medium text-slate-900 font-sans">
                        {line.account?.name || "Account"}{" "}
                        {line.account?.code && <span className="text-slate-400 font-mono">({line.account.code})</span>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-sans">{line.narration || "—"}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {Number(line.debitAmount) > 0 ? `₹${Number(line.debitAmount).toFixed(2)}` : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {Number(line.creditAmount) > 0 ? `₹${Number(line.creditAmount).toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedVoucher(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                {lang === "gu" ? "બંધ કરો" : "Close"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Record Expense/Payment Modal */}
      {isExpenseModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsExpenseModalOpen(false)}
          title="Record Expense / Payment"
          titleGujarati="દૈનિક ખર્ચ / ચુકવણી વાઉચર"
          maxWidth="md"
        >
          <form onSubmit={handleRecordExpense} className="space-y-3.5">
            {expenseError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">
                {expenseError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === "gu" ? "ખર્ચ ખાતું (Expense Head) *" : "Expense Account *"}
              </label>
              <select
                required
                value={expenseForm.expenseAccountId}
                onChange={(e) => setExpenseForm({ ...expenseForm, expenseAccountId: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              >
                <option value="">-- {lang === "gu" ? "ખર્ચ ખાતું પસંદ કરો" : "Select Expense Account"} --</option>
                {expenseAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} {acc.code ? `(${acc.code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === "gu" ? "ચુકવણી ખાતું (Cash / Bank) *" : "Paid From Account *"}
              </label>
              <select
                value={expenseForm.paidFromAccountId}
                onChange={(e) => setExpenseForm({ ...expenseForm, paidFromAccountId: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              >
                <option value="">{lang === "gu" ? "રોકડ ખાતું (Cash Account) - ડિફોલ્ટ" : "Cash Account (Default)"}</option>
                {[...cashAccounts, ...bankAccounts].map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (Bal: ₹{Number(acc.currentBalance || 0).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === "gu" ? "રકમ (₹) *" : "Amount (₹) *"}
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === "gu" ? "તારીખ *" : "Date *"}
                </label>
                <input
                  required
                  type="date"
                  value={expenseForm.voucherDate}
                  onChange={(e) => setExpenseForm({ ...expenseForm, voucherDate: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === "gu" ? "લખાણ / વિગત (Narration)" : "Narration"}
              </label>
              <input
                type="text"
                value={expenseForm.narration}
                onChange={(e) => setExpenseForm({ ...expenseForm, narration: e.target.value })}
                placeholder="e.g. Office tea & snacks, delivery charges"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                {lang === "gu" ? "રદ કરો" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={isSubmittingExpense}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingExpense ? "Recording..." : lang === "gu" ? "ખર્ચ નોંધો" : "Record Expense"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Quick Contra (Cash <-> Bank Transfer) Modal */}
      {isContraModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsContraModalOpen(false)}
          title="Record Contra Transfer (Cash <-> Bank)"
          titleGujarati="બેંક - રોકડ ફેરબદલ વાઉચર (Contra)"
          maxWidth="md"
        >
          <form onSubmit={handleRecordContra} className="space-y-3.5">
            {contraError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">
                {contraError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === "gu" ? "આ ખાતામાંથી ઉપાડ્યા (From Account) *" : "From Account (Withdrawal) *"}
              </label>
              <select
                required
                value={contraForm.fromAccountId}
                onChange={(e) => setContraForm({ ...contraForm, fromAccountId: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              >
                <option value="">-- {lang === "gu" ? "ખાતું પસંદ કરો" : "Select Source Account"} --</option>
                {[...cashAccounts, ...bankAccounts].map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (Bal: ₹{Number(acc.currentBalance || 0).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === "gu" ? "આ ખાતામાં જમા કર્યા (To Account) *" : "To Account (Deposit) *"}
              </label>
              <select
                required
                value={contraForm.toAccountId}
                onChange={(e) => setContraForm({ ...contraForm, toAccountId: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              >
                <option value="">-- {lang === "gu" ? "ખાતું પસંદ કરો" : "Select Destination Account"} --</option>
                {[...cashAccounts, ...bankAccounts].map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (Bal: ₹{Number(acc.currentBalance || 0).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === "gu" ? "રકમ (₹) *" : "Amount (₹) *"}
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={contraForm.amount}
                  onChange={(e) => setContraForm({ ...contraForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === "gu" ? "તારીખ *" : "Date *"}
                </label>
                <input
                  required
                  type="date"
                  value={contraForm.voucherDate}
                  onChange={(e) => setContraForm({ ...contraForm, voucherDate: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === "gu" ? "વિગત / લખાણ" : "Narration"}
              </label>
              <input
                type="text"
                value={contraForm.narration}
                onChange={(e) => setContraForm({ ...contraForm, narration: e.target.value })}
                placeholder="e.g. Cash deposited in bank, ATM withdrawal"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsContraModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                {lang === "gu" ? "રદ કરો" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={isSubmittingContra}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingContra ? "Posting..." : lang === "gu" ? "ટ્રાન્સફર નોંધો" : "Record Transfer"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reversal Confirmation Modal */}
      {reversalTarget && (
        <Modal
          isOpen={true}
          onClose={() => setReversalTarget(null)}
          title={`Reverse Voucher: ${reversalTarget.voucherNumber}`}
          titleGujarati="વાઉચર રદ / ઉલટાવવું (Reversal Entry)"
          maxWidth="md"
        >
          <form onSubmit={handleReverseVoucher} className="space-y-4">
            <p className="text-xs text-slate-600">
              {lang === "gu"
                ? "આ વાઉચરને ઉલટાવવાથી એક પ્રતિ-વાઉચર (Contra Reversal) નોંધાશે જેથી તમામ ખાતાવહીની સિલક શૂન્ય થઈ જશે."
                : "This action will post an immutable contra reversal voucher that zeroes out the accounting balances of this transaction."}
            </p>

            {reversalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">
                {reversalError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === "gu" ? "રદ કરવાનું કારણ *" : "Reason for Reversal *"}
              </label>
              <textarea
                required
                rows={3}
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="e.g. Incorrect ledger allocation or cancelled transaction"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReversalTarget(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                {lang === "gu" ? "રદ કરો" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={isReversing}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isReversing ? "Reversing..." : lang === "gu" ? "ખાતરી કરો" : "Confirm Reversal"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
