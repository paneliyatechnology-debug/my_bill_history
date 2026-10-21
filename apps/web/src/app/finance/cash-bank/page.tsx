"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { apiClient, extractList } from "@/lib/api-client";
import { Modal } from "@/components/ui/modal";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ExportDropdown } from "@/components/ui/export-dropdown";

interface LedgerGroup {
  id: string;
  name: string;
  nature: string;
}

interface LedgerAccount {
  id: string;
  code?: string;
  name: string;
  nameGujarati?: string;
  groupId: string;
  currentBalance?: number;
  openingBalance?: number;
  openingType?: string;
  isBankLedger?: boolean;
  isCashLedger?: boolean;
  isActive?: boolean;
  bankAccountNo?: string;
  bankIfsc?: string;
  bankBranch?: string;
  group?: {
    id: string;
    name: string;
    nature: string;
  };
}

interface TransactionItem {
  id: string;
  date: string;
  type: string;
  txnNo: string;
  partyName: string;
  mode: string;
  paid: number;
  received: number;
  balance: number;
  narration?: string;
}

const COMMON_BANKS = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Bank of Baroda",
  "Punjab National Bank",
  "Kotak Mahindra Bank",
  "Canara Bank",
  "Union Bank of India",
  "Central Bank of India",
  "IndusInd Bank",
  "IDBI Bank",
  "Yes Bank",
  "Other Bank",
];

export default function CashAndBankPage() {
  const { lang, tenantContext } = useAuth();

  const [ledgers, setLedgers] = useState<LedgerAccount[]>([]);
  const [groups, setGroups] = useState<LedgerGroup[]>([]);
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected account ID ('cash_in_hand' or a specific ledger account ID)
  const [selectedAccountId, setSelectedAccountId] = useState<string>("cash_in_hand");

  // Filter state
  const [dateFilter, setDateFilter] = useState<"LAST_30_DAYS" | "TODAY" | "THIS_MONTH" | "THIS_YEAR" | "ALL">("LAST_30_DAYS");
  const [searchTerm, setSearchTerm] = useState("");
  const [txnTypeFilter, setTxnTypeFilter] = useState("ALL");

  // Transactions list
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoadingTxns, setIsLoadingTxns] = useState(false);

  // Modals state
  const [isAddReduceModalOpen, setIsAddReduceModalOpen] = useState(false);
  const [addReduceMode, setAddReduceMode] = useState<"ADD" | "REDUCE">("ADD");
  const [addReduceForm, setAddReduceForm] = useState({
    accountId: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    reason: "",
    narration: "",
  });
  const [isSubmittingAddReduce, setIsSubmittingAddReduce] = useState(false);
  const [addReduceError, setAddReduceError] = useState<string | null>(null);

  // Transfer Modal (Contra)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({
    fromAccountId: "",
    toAccountId: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    referenceNo: "",
    narration: "",
  });
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Add Bank Modal
  const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false);
  const [bankForm, setBankForm] = useState({
    bankName: "State Bank of India",
    customBankName: "",
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    branchName: "",
    openingBalance: "",
    openingType: "DR" as "DR" | "CR",
  });
  const [isSubmittingBank, setIsSubmittingBank] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);

  // Edit / Update Bank Details Modal
  const [isUpdateBankModalOpen, setIsUpdateBankModalOpen] = useState(false);
  const [updateBankForm, setUpdateBankForm] = useState({
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    branchName: "",
  });
  const [isSubmittingUpdateBank, setIsSubmittingUpdateBank] = useState(false);
  const [updateBankError, setUpdateBankError] = useState<string | null>(null);

  // Accordion for deleted/inactive accounts
  const [showDeletedAccounts, setShowDeletedAccounts] = useState(false);

  // Fetch initial ledger accounts, groups & company details
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ledgersRes, groupsRes, compRes]: any = await Promise.all([
        apiClient.get("/ledgers"),
        apiClient.get("/ledger-groups").catch(() => []),
        apiClient.get("/tenants/company").catch(() => null),
      ]);

      const lList = extractList<LedgerAccount>(ledgersRes);
      const gList = extractList<LedgerGroup>(groupsRes);

      setLedgers(lList);
      setGroups(gList);
      if (compRes) setCompanyDetails(compRes);
    } catch (err: any) {
      setError(err.message || "Failed to load Cash & Bank accounts.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchData();
    }
  }, [tenantContext.companyId, fetchData]);

  // Segregate accounts
  const { cashAccounts, bankAccounts, inactiveAccounts, totalBalance, cashInHandBalance } = useMemo(() => {
    const cashList: LedgerAccount[] = [];
    const bankList: LedgerAccount[] = [];
    const inactiveList: LedgerAccount[] = [];

    let total = 0;
    let cashBal = 0;

    ledgers.forEach((l) => {
      if (l.isActive === false) {
        inactiveList.push(l);
        return;
      }

      const gName = l.group?.name?.toLowerCase() || "";
      const isCash = l.isCashLedger || gName.includes("cash") || l.name.toLowerCase().includes("cash") || l.name.includes("રોકડ");
      const isBank = l.isBankLedger || gName.includes("bank") || l.name.toLowerCase().includes("bank") || l.name.includes("બેંક");

      const bal = Number(l.currentBalance !== undefined ? l.currentBalance : l.openingBalance || 0);

      if (isCash) {
        cashList.push(l);
        cashBal += bal;
        total += bal;
      } else if (isBank) {
        bankList.push(l);
        total += bal;
      }
    });

    return {
      cashAccounts: cashList,
      bankAccounts: bankList,
      inactiveAccounts: inactiveList,
      totalBalance: total,
      cashInHandBalance: cashBal,
    };
  }, [ledgers]);

  // Identify currently selected account
  const selectedAccount = useMemo(() => {
    if (selectedAccountId === "cash_in_hand") {
      return cashAccounts[0] || null;
    }
    return ledgers.find((l) => l.id === selectedAccountId) || null;
  }, [selectedAccountId, cashAccounts, ledgers]);

  const isSelectedAccountBank = useMemo(() => {
    if (!selectedAccount) return false;
    const gName = selectedAccount.group?.name?.toLowerCase() || "";
    return (
      selectedAccount.isBankLedger ||
      gName.includes("bank") ||
      selectedAccount.name.toLowerCase().includes("bank") ||
      selectedAccount.name.includes("બેંક")
    );
  }, [selectedAccount]);

  // Fetch transactions for selected account
  const fetchTransactions = useCallback(async () => {
    if (!selectedAccount) {
      setTransactions([]);
      return;
    }

    setIsLoadingTxns(true);
    try {
      // 1. Calculate Date Range
      let fromDate: string | undefined = undefined;
      const today = new Date();
      const toDate = today.toISOString().split("T")[0];

      if (dateFilter === "TODAY") {
        fromDate = toDate;
      } else if (dateFilter === "LAST_30_DAYS") {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        fromDate = d.toISOString().split("T")[0];
      } else if (dateFilter === "THIS_MONTH") {
        fromDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
      } else if (dateFilter === "THIS_YEAR") {
        fromDate = new Date(today.getFullYear(), 0, 1).toISOString().split("T")[0];
      }

      // Try fetching General Ledger statement from API
      try {
        const glRes: any = await apiClient.get("/reports/general-ledger", {
          accountId: selectedAccount.id,
          fromDate,
          toDate,
        });

        if (glRes?.lines && Array.isArray(glRes.lines)) {
          let runningBal = Number(glRes.openingBalance || 0);
          const mapped: TransactionItem[] = glRes.lines.map((l: any, i: number) => {
            const debit = Number(l.debitAmount || 0);
            const credit = Number(l.creditAmount || 0);
            runningBal += (credit - debit);

            let typeStr = l.voucherType || "Voucher";
            if (l.voucherType === "PAYMENT") typeStr = "Payment Out";
            else if (l.voucherType === "RECEIPT") typeStr = "Payment In";
            else if (l.voucherType === "CONTRA") typeStr = "Transfer";
            else if (l.voucherType === "SALES") typeStr = "Sales Invoice";
            else if (l.voucherType === "PURCHASE") typeStr = "Purchase Invoice";

            return {
              id: l.id || `txn_${i}`,
              date: l.voucherDate || l.date || toDate,
              type: typeStr,
              txnNo: l.voucherNumber || "-",
              partyName: l.partyName || l.contraAccountName || l.narration || "-",
              mode: l.paymentMode || (isSelectedAccountBank ? "Bank / Online" : "Cash"),
              paid: debit,
              received: credit,
              balance: Number(l.balance !== undefined ? l.balance : runningBal),
              narration: l.narration,
            };
          });
          setTransactions(mapped);
          return;
        }
      } catch {
        // Fallback to voucher query if general-ledger report is not implemented for this account
      }

      // Fallback: Fetch payment / receipt / contra vouchers directly
      const vRes: any = await apiClient.get("/vouchers", {
        limit: 100,
        startDate: fromDate,
        endDate: toDate,
      });
      const vList = extractList<any>(vRes);

      let runningBal = Number(selectedAccount.currentBalance || selectedAccount.openingBalance || 0);
      const filtered: TransactionItem[] = [];

      for (const v of vList) {
        const matchingLine = (v.journalEntries || []).find((j: any) => j.accountId === selectedAccount.id);
        if (matchingLine || v.voucherType === "PAYMENT" || v.voucherType === "RECEIPT") {
          const debit = Number(matchingLine?.debitAmount || (v.voucherType === "PAYMENT" ? v.totalAmount : 0));
          const credit = Number(matchingLine?.creditAmount || (v.voucherType === "RECEIPT" ? v.totalAmount : 0));

          let typeStr = v.voucherType || "Voucher";
          if (v.voucherType === "PAYMENT") typeStr = "Payment Out";
          else if (v.voucherType === "RECEIPT") typeStr = "Payment In";
          else if (v.voucherType === "CONTRA") typeStr = "Transfer";

          filtered.push({
            id: v.id,
            date: v.voucherDate ? new Date(v.voucherDate).toISOString().split("T")[0] : toDate,
            type: typeStr,
            txnNo: v.voucherNumber || "-",
            partyName: v.referenceNo || v.narration || "General Transaction",
            mode: isSelectedAccountBank ? "Bank / Online" : "Cash",
            paid: debit,
            received: credit,
            balance: runningBal,
            narration: v.narration,
          });
        }
      }

      setTransactions(filtered);
    } catch (err: any) {
      console.warn("Could not fetch statement:", err);
      setTransactions([]);
    } finally {
      setIsLoadingTxns(false);
    }
  }, [selectedAccount, dateFilter, isSelectedAccountBank]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (txnTypeFilter !== "ALL" && !t.type.toLowerCase().includes(txnTypeFilter.toLowerCase())) {
        return false;
      }
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const matchesParty = t.partyName.toLowerCase().includes(s);
        const matchesNo = t.txnNo.toLowerCase().includes(s);
        const matchesType = t.type.toLowerCase().includes(s);
        const matchesMode = t.mode.toLowerCase().includes(s);
        if (!matchesParty && !matchesNo && !matchesType && !matchesMode) return false;
      }
      return true;
    });
  }, [transactions, txnTypeFilter, searchTerm]);

  // Totals of filtered transactions
  const { totalPaid, totalReceived } = useMemo(() => {
    let p = 0;
    let r = 0;
    filteredTransactions.forEach((t) => {
      p += t.paid;
      r += t.received;
    });
    return { totalPaid: p, totalReceived: r };
  }, [filteredTransactions]);

  // Handle Add/Reduce Money
  const handleAddReduceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddReduceError(null);
    setIsSubmittingAddReduce(true);

    try {
      const amt = Number(addReduceForm.amount);
      if (!amt || amt <= 0) {
        throw new Error(lang === "gu" ? "રકમ ૦ થી વધુ હોવી જરૂરી છે." : "Amount must be greater than zero.");
      }

      const accId = addReduceForm.accountId || selectedAccount?.id;
      if (!accId) {
        throw new Error(lang === "gu" ? "ખાતું પસંદ કરો." : "Please select an account.");
      }

      // If ADD: create a Receipt voucher. If REDUCE: create a Payment voucher.
      const voucherType = addReduceMode === "ADD" ? "RECEIPT" : "PAYMENT";
      const narration = addReduceForm.narration.trim() || `${addReduceMode === "ADD" ? "Cash/Bank Addition" : "Cash/Bank Reduction"}: ${addReduceForm.reason || "Adjustment"}`;

      await apiClient.post("/vouchers", {
        voucherType,
        voucherNumber: `ADJ-${Date.now().toString().slice(-6)}`,
        voucherDate: addReduceForm.date,
        narration,
        referenceNo: addReduceForm.reason || "Manual Adjustment",
        lines: [
          {
            accountId: accId,
            debitAmount: addReduceMode === "ADD" ? amt : 0,
            creditAmount: addReduceMode === "REDUCE" ? amt : 0,
            lineNarration: narration,
          },
        ],
      });

      setIsAddReduceModalOpen(false);
      setToastMessage(
        lang === "gu"
          ? `રકમ સફળતાપૂર્વક ${addReduceMode === "ADD" ? "ઉમેરાઈ ગઈ" : "બાદ થઈ ગઈ"}!`
          : `Amount ${addReduceMode === "ADD" ? "added" : "reduced"} successfully!`,
      );
      setTimeout(() => setToastMessage(null), 4000);
      await fetchData();
      await fetchTransactions();
    } catch (err: any) {
      setAddReduceError(err.message || "Failed to adjust balance.");
    } finally {
      setIsSubmittingAddReduce(false);
    }
  };

  // Handle Transfer Money (Contra)
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError(null);
    setIsSubmittingTransfer(true);

    try {
      const amt = Number(transferForm.amount);
      if (!amt || amt <= 0) {
        throw new Error(lang === "gu" ? "રકમ ૦ થી વધુ હોવી જરૂરી છે." : "Amount must be greater than zero.");
      }
      if (!transferForm.fromAccountId || !transferForm.toAccountId) {
        throw new Error(lang === "gu" ? "ક્યાંથી અને ક્યાં ટ્રાન્સફર કરવું તે બંને ખાતા પસંદ કરો." : "Please select both Source and Destination accounts.");
      }
      if (transferForm.fromAccountId === transferForm.toAccountId) {
        throw new Error(lang === "gu" ? "સોર્સ અને ડેસ્ટિનેશન ખાતું સરખું ન હોઈ શકે." : "Source and Destination accounts cannot be the same.");
      }

      const fromAcc = ledgers.find((l) => l.id === transferForm.fromAccountId);
      const toAcc = ledgers.find((l) => l.id === transferForm.toAccountId);

      const narration = transferForm.narration.trim() || `Transfer from ${fromAcc?.name} to ${toAcc?.name}`;

      await apiClient.post("/vouchers", {
        voucherType: "CONTRA",
        voucherNumber: `TRF-${Date.now().toString().slice(-6)}`,
        voucherDate: transferForm.date,
        narration,
        referenceNo: transferForm.referenceNo || "Fund Transfer",
        lines: [
          {
            accountId: transferForm.toAccountId,
            debitAmount: amt,
            creditAmount: 0,
            lineNarration: `Received from ${fromAcc?.name}`,
          },
          {
            accountId: transferForm.fromAccountId,
            debitAmount: 0,
            creditAmount: amt,
            lineNarration: `Transferred to ${toAcc?.name}`,
          },
        ],
      });

      setIsTransferModalOpen(false);
      setToastMessage(lang === "gu" ? "રકમ સફળતાપૂર્વક ટ્રાન્સફર થઈ ગઈ!" : "Money transferred successfully!");
      setTimeout(() => setToastMessage(null), 4000);
      await fetchData();
      await fetchTransactions();
    } catch (err: any) {
      setTransferError(err.message || "Transfer failed.");
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  // Handle Create Bank Account
  const handleAddBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBankError(null);
    setIsSubmittingBank(true);

    try {
      const bankName = bankForm.bankName === "Other Bank" ? bankForm.customBankName.trim() : bankForm.bankName;
      if (!bankName) {
        throw new Error(lang === "gu" ? "બેંકનું નામ દાખલ કરો." : "Please enter the bank name.");
      }

      // Find 'Bank Accounts' group
      let bankGroup = groups.find((g) => g.name.toLowerCase().includes("bank account"));
      if (!bankGroup) {
        bankGroup = groups.find((g) => g.nature === "ASSET");
      }

      if (!bankGroup) {
        throw new Error("Bank Accounts ledger group not found.");
      }

      const accNumberSuffix = bankForm.accountNumber ? ` (${bankForm.accountNumber.slice(-4)})` : "";
      const accountDisplayName = `${bankName}${accNumberSuffix}`;

      await apiClient.post("/ledgers", {
        name: accountDisplayName,
        code: `BNK-${Date.now().toString().slice(-4)}`,
        groupId: bankGroup.id,
        isBankLedger: true,
        openingBalance: Number(bankForm.openingBalance) || 0,
        openingBalanceType: bankForm.openingType,
      });

      setIsAddBankModalOpen(false);
      setToastMessage(lang === "gu" ? "નવું બેંક ખાતું ઉમેરાઈ ગયું!" : "New bank account added successfully!");
      setTimeout(() => setToastMessage(null), 4000);
      await fetchData();
    } catch (err: any) {
      setBankError(err.message || "Failed to create bank account.");
    } finally {
      setIsSubmittingBank(false);
    }
  };

  // Export Columns definition
  const exportColumns = useMemo(() => [
    { header: "Date", key: "date" },
    { header: "Type", key: "type" },
    { header: "Txn No", key: "txnNo" },
    { header: "Party / Narration", key: "partyName" },
    { header: "Mode", key: "mode" },
    { header: "Paid (Debit ₹)", key: "paid" },
    { header: "Received (Credit ₹)", key: "received" },
    { header: "Balance (₹)", key: "balance" },
  ], []);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-bounce">
          <span>✓</span>
          <span className="font-bold text-xs">{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Operational Actions (Matching MyBillBook) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black text-lg">
              🏦
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>{lang === "gu" ? "રોકડ અને બેંક ખાતાઓ" : "Cash and Bank"}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {lang === "gu" ? "મેનેજમેન્ટ" : "Accounting"}
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                {lang === "gu"
                  ? "રોકડ સિલક, બેંક એકાઉન્ટ્સ, મની ટ્રાન્સફર અને રિયલ-ટાઇમ ખાતાવહી સ્ટેટમેન્ટ"
                  : "Manage Cash in hand, Bank accounts, Fund transfers and Account statements"}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Matching Video */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setAddReduceMode("ADD");
              setAddReduceForm({
                accountId: selectedAccount?.id || "",
                amount: "",
                date: new Date().toISOString().split("T")[0],
                reason: "",
                narration: "",
              });
              setAddReduceError(null);
              setIsAddReduceModalOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <span>➕/➖</span>
            <span>{lang === "gu" ? "+ રકમ ઉમેરો/બાદ કરો" : "+ Add/Reduce Money"}</span>
          </button>

          <button
            onClick={() => {
              setTransferForm({
                fromAccountId: cashAccounts[0]?.id || "",
                toAccountId: bankAccounts[0]?.id || "",
                amount: "",
                date: new Date().toISOString().split("T")[0],
                referenceNo: "",
                narration: "",
              });
              setTransferError(null);
              setIsTransferModalOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <span>⇄</span>
            <span>{lang === "gu" ? "ટ્રાન્સફર (Transfer Money)" : "⇄ Transfer Money"}</span>
          </button>

          <button
            onClick={() => {
              setBankForm({
                bankName: "State Bank of India",
                customBankName: "",
                accountHolderName: companyDetails?.tradeName || companyDetails?.legalName || "",
                accountNumber: "",
                ifscCode: "",
                branchName: "",
                openingBalance: "",
                openingType: "DR",
              });
              setBankError(null);
              setIsAddBankModalOpen(true);
            }}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>+</span>
            <span>{lang === "gu" ? "+ નવું બેંક ખાતું ઉમેરો" : "+ Add New Account"}</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout: Left Sidebar (Accounts) + Right Main (Transactions & Details) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Accounts List (Width: 4 of 12) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Total Balance Card (Matching Video) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              {lang === "gu" ? "કુલ સિલક (Total Balance):" : "Total Balance:"}
            </span>
            <span className="text-lg sm:text-xl font-black font-mono text-slate-900">
              ₹{totalBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Cash Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
              {lang === "gu" ? "રોકડ (Cash)" : "Cash"}
            </div>
            <div className="p-2 space-y-1">
              <button
                onClick={() => setSelectedAccountId("cash_in_hand")}
                className={`w-full p-3 rounded-xl flex items-center justify-between transition-all text-left cursor-pointer ${
                  selectedAccountId === "cash_in_hand" || (cashAccounts[0] && selectedAccountId === cashAccounts[0].id)
                    ? "bg-amber-50/80 border-2 border-amber-500 shadow-xs text-amber-950 font-bold"
                    : "hover:bg-slate-50 border border-transparent text-slate-800"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                    💵
                  </span>
                  <div>
                    <p className="text-xs font-bold">{lang === "gu" ? "હાથ પર રોકડ (Cash in hand)" : "Cash in hand"}</p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {cashAccounts.length > 0 ? cashAccounts[0].name : "Primary Cash Drawer"}
                    </p>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <p className={`text-xs font-bold ${cashInHandBalance < 0 ? "text-rose-600" : "text-emerald-700"}`}>
                    ₹{cashInHandBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Bank Accounts Section (Matching Video) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {lang === "gu" ? "બેંક એકાઉન્ટ્સ (Bank Accounts)" : "Bank Accounts"}
              </span>
              <button
                onClick={() => {
                  setBankForm({
                    bankName: "State Bank of India",
                    customBankName: "",
                    accountHolderName: companyDetails?.tradeName || companyDetails?.legalName || "",
                    accountNumber: "",
                    ifscCode: "",
                    branchName: "",
                    openingBalance: "",
                    openingType: "DR",
                  });
                  setBankError(null);
                  setIsAddBankModalOpen(true);
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>+</span>
                <span>{lang === "gu" ? "+ નવી બેંક ઉમેરો" : "+ Add New Bank"}</span>
              </button>
            </div>

            <div className="p-2 space-y-1">
              {bankAccounts.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  <p>{lang === "gu" ? "હજી કોઈ બેંક ખાતું ઉમેરેલ નથી." : "No bank accounts added yet."}</p>
                  <button
                    onClick={() => setIsAddBankModalOpen(true)}
                    className="mt-2 text-indigo-600 font-bold hover:underline text-xs"
                  >
                    + Add your first bank account
                  </button>
                </div>
              ) : (
                bankAccounts.map((b) => {
                  const isSelected = selectedAccountId === b.id;
                  const bal = Number(b.currentBalance !== undefined ? b.currentBalance : b.openingBalance || 0);

                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedAccountId(b.id)}
                      className={`w-full p-3 rounded-xl flex items-center justify-between transition-all text-left cursor-pointer ${
                        isSelected
                          ? "bg-indigo-50/80 border-2 border-indigo-600 shadow-xs text-indigo-950 font-bold"
                          : "hover:bg-slate-50 border border-transparent text-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                          🏦
                        </span>
                        <div className="truncate">
                          <p className="text-xs font-bold truncate">{b.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono truncate">
                            {b.code || "A/C"} • {b.group?.name || "Bank Account"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right font-mono shrink-0 pl-2">
                        <p className={`text-xs font-bold ${bal < 0 ? "text-rose-600" : "text-slate-900"}`}>
                          ₹{bal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Deleted Accounts Accordion (Matching Video) */}
            {inactiveAccounts.length > 0 && (
              <div className="border-t border-slate-200">
                <button
                  onClick={() => setShowDeletedAccounts(!showDeletedAccounts)}
                  className="w-full px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-between bg-slate-50/50"
                >
                  <span>Deleted Accounts ({inactiveAccounts.length})</span>
                  <span>{showDeletedAccounts ? "▲" : "▼"}</span>
                </button>
                {showDeletedAccounts && (
                  <div className="p-2 space-y-1 bg-slate-50">
                    {inactiveAccounts.map((ia) => (
                      <div key={ia.id} className="p-2 text-xs text-slate-400 flex justify-between">
                        <span className="line-through">{ia.name}</span>
                        <span>₹{Number(ia.currentBalance || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Bank Details Card & Transactions Table (Width: 8 of 12) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Bank Details Card (Shown when Bank Account is Selected - Matching Video Frame 211) */}
          {isSelectedAccountBank && selectedAccount && (
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs relative">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1 text-xs">
                  <div className="grid grid-cols-[140px_1fr] gap-x-2 gap-y-1 text-slate-600">
                    <span className="text-slate-500 font-medium">Account Holder&apos;s Name :</span>
                    <span className="font-bold text-slate-900">
                      {companyDetails?.tradeName || companyDetails?.legalName || "Enterprise Account"}
                    </span>

                    <span className="text-slate-500 font-medium">Account Name :</span>
                    <span className="font-bold text-slate-900">{selectedAccount.name}</span>

                    <span className="text-slate-500 font-medium">Account Number :</span>
                    <span className="font-mono font-bold text-slate-900">
                      {companyDetails?.bankAccountNo || selectedAccount.code || "-"}
                    </span>

                    <span className="text-slate-500 font-medium">IFSC Code :</span>
                    <span className="font-mono font-semibold text-slate-800 uppercase">
                      {companyDetails?.bankIfsc || "SBIN0001234"}
                    </span>

                    <span className="text-slate-500 font-medium">Bank &amp; Branch :</span>
                    <span className="text-slate-800">
                      {companyDetails?.bankBranch || "Ahmedabad Central Branch"}
                    </span>
                  </div>
                </div>

                {/* Right Bank Action Buttons (Matching Video) */}
                <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setUpdateBankForm({
                        accountHolderName: companyDetails?.tradeName || "",
                        bankName: selectedAccount.name,
                        accountNumber: companyDetails?.bankAccountNo || "",
                        ifscCode: companyDetails?.bankIfsc || "",
                        branchName: companyDetails?.bankBranch || "",
                      });
                      setIsUpdateBankModalOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span>✏️</span>
                    <span>{lang === "gu" ? "વિગતો સુધારો" : "Update Bank Details"}</span>
                  </button>

                  <button
                    onClick={() => {
                      const shareText = `*Bank Account Details*\nAccount: ${selectedAccount.name}\nA/C No: ${companyDetails?.bankAccountNo || selectedAccount.code || ""}\nIFSC: ${companyDetails?.bankIfsc || ""}\nBranch: ${companyDetails?.bankBranch || ""}`;
                      navigator.clipboard.writeText(shareText);
                      setToastMessage(lang === "gu" ? "બેંક વિગતો કોપી થઈ ગઈ!" : "Bank details copied to clipboard!");
                      setTimeout(() => setToastMessage(null), 3000);
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span>📤</span>
                    <span>{lang === "gu" ? "શેર કરો" : "Share Bank Details"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Transactions Panel (Matching Video) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-3 p-4 sm:p-5">
            {/* Header: Title + Date Filter + Export */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>{lang === "gu" ? "વ્યવહારો (Transactions)" : "Transactions"}</span>
                <span className="text-xs font-normal text-slate-500 font-mono">
                  ({filteredTransactions.length})
                </span>
              </h2>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Date Dropdown Filter (Matching Video: 'Last 30 Days') */}
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                >
                  <option value="LAST_30_DAYS">{lang === "gu" ? "છેલ્લા ૩૦ દિવસ" : "Last 30 Days"}</option>
                  <option value="TODAY">{lang === "gu" ? "આજે" : "Today"}</option>
                  <option value="THIS_MONTH">{lang === "gu" ? "આ મહિનો" : "This Month"}</option>
                  <option value="THIS_YEAR">{lang === "gu" ? "આ વર્ષ" : "This Financial Year"}</option>
                  <option value="ALL">{lang === "gu" ? "તમામ તારીખો" : "All Time"}</option>
                </select>

                <ExportDropdown
                  columns={exportColumns}
                  data={filteredTransactions}
                  metadata={{
                    title: `${selectedAccount?.name || "Cash & Bank"} Statement`,
                    fileName: `statement_${selectedAccount?.name || "cash_and_bank"}`,
                    companyName: companyDetails?.tradeName || "MyBill History",
                    companyGstin: companyDetails?.gstin || "24AAAAA0000A1Z5",
                  }}
                  lang={lang}
                  buttonVariant="outline"
                />
              </div>
            </div>

            {/* Sub-Filters: Search input + Txn Type Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
                <input
                  type="text"
                  placeholder={lang === "gu" ? "શોધો (પાર્ટી, વાઉચર, વર્ણન)..." : "Search party, txn no, mode..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={txnTypeFilter}
                onChange={(e) => setTxnTypeFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Types</option>
                <option value="Payment In">Payment In (Receipt)</option>
                <option value="Payment Out">Payment Out</option>
                <option value="Sales Invoice">Sales Invoices</option>
                <option value="Purchase Invoice">Purchase Invoices</option>
                <option value="Transfer">Transfers (Contra)</option>
              </select>
            </div>

            {/* Transactions Table: Exact MyBillBook Column Schema */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3">DATE</th>
                    <th className="py-2.5 px-3">TYPE</th>
                    <th className="py-2.5 px-2.5 font-mono">TXN NO</th>
                    <th className="py-2.5 px-3">PARTY</th>
                    <th className="py-2.5 px-2.5">MODE</th>
                    <th className="py-2.5 px-3 text-right">PAID (₹)</th>
                    <th className="py-2.5 px-3 text-right">RECEIVED (₹)</th>
                    <th className="py-2.5 px-3 text-right font-mono">BALANCE (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingTxns ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
                        {lang === "gu" ? "સ્ટેટમેન્ટ લોડ થઈ રહ્યું છે..." : "Loading transaction statement..."}
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-xs text-slate-500">
                        {lang === "gu" ? "આ સમયગાળામાં કોઈ વ્યવહારો નથી." : "No transactions found for the selected period."}
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2 px-3 font-mono text-slate-700 whitespace-nowrap">
                          {t.date}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              t.type.includes("In") || t.type.includes("Receipt")
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : t.type.includes("Out") || t.type.includes("Payment")
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : t.type.includes("Transfer")
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {t.type}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 font-mono text-slate-800 font-semibold">
                          #{t.txnNo}
                        </td>
                        <td className="py-2 px-3 text-slate-900 font-medium max-w-[200px] truncate" title={t.partyName}>
                          {t.partyName}
                        </td>
                        <td className="py-2 px-2.5 text-slate-600">
                          {t.mode}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-medium text-rose-600">
                          {t.paid > 0 ? `₹${t.paid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-medium text-emerald-700">
                          {t.received > 0 ? `₹${t.received.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{t.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* Bottom Total Summary (Matching Video) */}
                {filteredTransactions.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900 text-xs">
                      <td colSpan={5} className="py-2.5 px-3 text-right uppercase">
                        Total:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-600">
                        ₹{totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                        ₹{totalReceived.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                        -
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Add / Reduce Money */}
      <Modal
        isOpen={isAddReduceModalOpen}
        onClose={() => setIsAddReduceModalOpen(false)}
        title={lang === "gu" ? "રકમ ઉમેરો અથવા બાદ કરો" : "Add / Reduce Money"}
      >
        <form onSubmit={handleAddReduceSubmit} className="space-y-4">
          {addReduceError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              {addReduceError}
            </div>
          )}

          {/* Toggle Type: Add or Reduce */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setAddReduceMode("ADD")}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                addReduceMode === "ADD"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              + {lang === "gu" ? "રકમ ઉમેરો (Add Money)" : "Add Money (Deposit)"}
            </button>
            <button
              type="button"
              onClick={() => setAddReduceMode("REDUCE")}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                addReduceMode === "REDUCE"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              - {lang === "gu" ? "રકમ બાદ કરો (Reduce Money)" : "Reduce Money (Withdrawal)"}
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Account</label>
            <select
              value={addReduceForm.accountId || selectedAccount?.id}
              onChange={(e) => setAddReduceForm({ ...addReduceForm, accountId: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
            >
              <optgroup label="Cash">
                {cashAccounts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Balance: ₹{Number(c.currentBalance || 0).toFixed(2)})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Bank Accounts">
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} (Balance: ₹{Number(b.currentBalance || 0).toFixed(2)})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={addReduceForm.amount}
                onChange={(e) => setAddReduceForm({ ...addReduceForm, amount: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={addReduceForm.date}
                onChange={(e) => setAddReduceForm({ ...addReduceForm, date: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason / Category</label>
            <input
              type="text"
              placeholder="e.g. Capital injection, Petty cash top-up, Owner drawing"
              value={addReduceForm.reason}
              onChange={(e) => setAddReduceForm({ ...addReduceForm, reason: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Remarks / Narration</label>
            <textarea
              rows={2}
              placeholder="Optional remarks"
              value={addReduceForm.narration}
              onChange={(e) => setAddReduceForm({ ...addReduceForm, narration: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddReduceModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingAddReduce}
              className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-all ${
                addReduceMode === "ADD" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {isSubmittingAddReduce ? "Saving..." : addReduceMode === "ADD" ? "Add Money" : "Reduce Money"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Transfer Money (Contra) */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title={lang === "gu" ? "ખાતાઓ વચ્ચે રકમ ટ્રાન્સફર (Fund Transfer)" : "Transfer Money Between Accounts"}
      >
        <form onSubmit={handleTransferSubmit} className="space-y-4">
          {transferError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              {transferError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Transfer From *</label>
              <select
                value={transferForm.fromAccountId}
                onChange={(e) => setTransferForm({ ...transferForm, fromAccountId: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Source Account</option>
                <optgroup label="Cash">
                  {cashAccounts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (₹{Number(c.currentBalance || 0).toFixed(2)})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Bank Accounts">
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (₹{Number(b.currentBalance || 0).toFixed(2)})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Transfer To *</label>
              <select
                value={transferForm.toAccountId}
                onChange={(e) => setTransferForm({ ...transferForm, toAccountId: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Destination Account</option>
                <optgroup label="Cash">
                  {cashAccounts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (₹{Number(c.currentBalance || 0).toFixed(2)})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Bank Accounts">
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (₹{Number(b.currentBalance || 0).toFixed(2)})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={transferForm.amount}
                onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={transferForm.date}
                onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reference / Cheque No.</label>
            <input
              type="text"
              placeholder="e.g. UTR123456 or Cheque #98765"
              value={transferForm.referenceNo}
              onChange={(e) => setTransferForm({ ...transferForm, referenceNo: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Narration</label>
            <textarea
              rows={2}
              placeholder="e.g. Cash deposited into bank account"
              value={transferForm.narration}
              onChange={(e) => setTransferForm({ ...transferForm, narration: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingTransfer}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
            >
              {isSubmittingTransfer ? "Transferring..." : "Confirm Transfer"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Add New Bank Account */}
      <Modal
        isOpen={isAddBankModalOpen}
        onClose={() => setIsAddBankModalOpen(false)}
        title={lang === "gu" ? "નવું બેંક ખાતું ઉમેરો" : "Add Bank Account"}
      >
        <form onSubmit={handleAddBankSubmit} className="space-y-4">
          {bankError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              {bankError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Bank Name *</label>
            <select
              value={bankForm.bankName}
              onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
            >
              {COMMON_BANKS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {bankForm.bankName === "Other Bank" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Enter Bank Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Federal Bank, Karur Vysya Bank"
                value={bankForm.customBankName}
                onChange={(e) => setBankForm({ ...bankForm, customBankName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Account Holder Name</label>
              <input
                type="text"
                placeholder="Enterprise Trade Name"
                value={bankForm.accountHolderName}
                onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Account Number</label>
              <input
                type="text"
                placeholder="e.g. 5697993361"
                value={bankForm.accountNumber}
                onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">IFSC Code</label>
              <input
                type="text"
                placeholder="e.g. SBIN0001234"
                value={bankForm.ifscCode}
                onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Branch Name</label>
              <input
                type="text"
                placeholder="e.g. C.G. Road Branch"
                value={bankForm.branchName}
                onChange={(e) => setBankForm({ ...bankForm, branchName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Opening Balance (₹)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={bankForm.openingBalance}
                onChange={(e) => setBankForm({ ...bankForm, openingBalance: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Balance Type</label>
              <select
                value={bankForm.openingType}
                onChange={(e) => setBankForm({ ...bankForm, openingType: e.target.value as any })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              >
                <option value="DR">Debit (Positive Balance)</option>
                <option value="CR">Credit (Overdraft / OD A/C)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddBankModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingBank}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
            >
              {isSubmittingBank ? "Saving..." : "Add Bank Account"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: Update Bank Details */}
      <Modal
        isOpen={isUpdateBankModalOpen}
        onClose={() => setIsUpdateBankModalOpen(false)}
        title={lang === "gu" ? "બેંક એકાઉન્ટ વિગતો સુધારો" : "Update Bank Details"}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setIsSubmittingUpdateBank(true);
            setUpdateBankError(null);
            try {
              if (selectedAccount) {
                await apiClient.patch(`/ledgers/${selectedAccount.id}`, {
                  name: updateBankForm.bankName.trim(),
                });
              }
              // Update tenant company bank fields if available
              await apiClient.patch(`/tenants/company`, {
                bankName: updateBankForm.bankName.trim(),
                bankAccountNo: updateBankForm.accountNumber.trim(),
                bankIfsc: updateBankForm.ifscCode.trim(),
                bankBranch: updateBankForm.branchName.trim(),
              }).catch(() => {});

              setIsUpdateBankModalOpen(false);
              setToastMessage(lang === "gu" ? "વિગતો સુધારી દેવાઈ છે!" : "Bank details updated!");
              setTimeout(() => setToastMessage(null), 3000);
              await fetchData();
            } catch (err: any) {
              setUpdateBankError(err.message || "Failed to update details.");
            } finally {
              setIsSubmittingUpdateBank(false);
            }
          }}
          className="space-y-4"
        >
          {updateBankError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              {updateBankError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Account Display Name</label>
            <input
              type="text"
              required
              value={updateBankForm.bankName}
              onChange={(e) => setUpdateBankForm({ ...updateBankForm, bankName: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Account Number</label>
              <input
                type="text"
                value={updateBankForm.accountNumber}
                onChange={(e) => setUpdateBankForm({ ...updateBankForm, accountNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">IFSC Code</label>
              <input
                type="text"
                value={updateBankForm.ifscCode}
                onChange={(e) => setUpdateBankForm({ ...updateBankForm, ifscCode: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Branch Name</label>
            <input
              type="text"
              value={updateBankForm.branchName}
              onChange={(e) => setUpdateBankForm({ ...updateBankForm, branchName: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsUpdateBankModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingUpdateBank}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
            >
              {isSubmittingUpdateBank ? "Updating..." : "Update Details"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
