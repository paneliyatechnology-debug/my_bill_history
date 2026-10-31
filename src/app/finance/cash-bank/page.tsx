"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { apiClient, extractList } from "@/lib/api-client";
import { Modal } from "@/components/ui/modal";
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
  upiId?: string;
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

// Bank Brand Identification & Authentic Logo SVGs
function getBankBrandInfo(bankNameOrIfsc?: string) {
  const str = (bankNameOrIfsc || "").toLowerCase().trim();
  if (str.includes("sbi") || str.includes("state bank") || str.startsWith("sbin")) {
    return { name: "State Bank of India", code: "SBIN", type: "sbi", color: "#0072bc" };
  }
  if (str.includes("hdfc") || str.startsWith("hdfc")) {
    return { name: "HDFC Bank", code: "HDFC", type: "hdfc", color: "#004c8f" };
  }
  if (str.includes("icici") || str.startsWith("icic")) {
    return { name: "ICICI Bank", code: "ICIC", type: "icici", color: "#b32e18" };
  }
  if (str.includes("axis") || str.startsWith("utib")) {
    return { name: "Axis Bank", code: "UTIB", type: "axis", color: "#97144d" };
  }
  if (str.includes("kotak") || str.startsWith("kkbk")) {
    return { name: "Kotak Mahindra Bank", code: "KKBK", type: "kotak", color: "#ed1c24" };
  }
  if (str.includes("baroda") || str.includes("bob") || str.startsWith("barb")) {
    return { name: "Bank of Baroda", code: "BARB", type: "bob", color: "#f26522" };
  }
  if (str.includes("punjab") || str.includes("pnb") || str.startsWith("punb")) {
    return { name: "Punjab National Bank", code: "PUNB", type: "pnb", color: "#a20e23" };
  }
  if (str.includes("canara") || str.startsWith("cnrb")) {
    return { name: "Canara Bank", code: "CNRB", type: "canara", color: "#0093d8" };
  }
  if (str.includes("union") || str.startsWith("ubin")) {
    return { name: "Union Bank of India", code: "UBIN", type: "union", color: "#0047ba" };
  }
  if (str.includes("indusind") || str.startsWith("indb")) {
    return { name: "IndusInd Bank", code: "INDB", type: "indusind", color: "#8c1d40" };
  }
  if (str.includes("yes") || str.startsWith("yesb")) {
    return { name: "Yes Bank", code: "YESB", type: "yes", color: "#003366" };
  }
  return { name: bankNameOrIfsc || "Bank", code: "BNK", type: "generic", color: "#475569" };
}

function BankLogo({ bankNameOrIfsc, className = "w-8 h-8" }: { bankNameOrIfsc?: string; className?: string }) {
  const brand = getBankBrandInfo(bankNameOrIfsc);

  switch (brand.type) {
    case "sbi":
      return (
        <svg viewBox="0 0 40 40" className={`${className} shrink-0`}>
          <circle cx="20" cy="20" r="19" fill="#0072bc" />
          <circle cx="20" cy="18" r="6" fill="#ffffff" />
          <rect x="18.5" y="18" width="3" height="13" fill="#ffffff" />
        </svg>
      );
    case "hdfc":
      return (
        <svg viewBox="0 0 40 40" className={`${className} shrink-0`}>
          <rect width="40" height="40" rx="20" fill="#004c8f" />
          <rect x="9" y="9" width="22" height="22" fill="#ffffff" rx="2" />
          <rect x="12" y="12" width="16" height="16" fill="#004c8f" />
          <rect x="17" y="9" width="6" height="22" fill="#ed2128" />
          <rect x="9" y="17" width="22" height="6" fill="#ed2128" />
          <rect x="15" y="15" width="10" height="10" fill="#ffffff" />
        </svg>
      );
    case "icici":
      return (
        <svg viewBox="0 0 40 40" className={`${className} shrink-0`}>
          <rect width="40" height="40" rx="20" fill="#b32e18" />
          <circle cx="20" cy="12" r="3" fill="#f58220" />
          <path d="M14 28c0-5 5-9 11-9" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          <circle cx="20" cy="20" r="2" fill="#ffffff" />
        </svg>
      );
    case "axis":
      return (
        <svg viewBox="0 0 40 40" className={`${className} shrink-0`}>
          <rect width="40" height="40" rx="20" fill="#97144d" />
          <path d="M12 28L20 12L28 28H23L20 20L17 28H12Z" fill="#ffffff" />
        </svg>
      );
    case "kotak":
      return (
        <svg viewBox="0 0 40 40" className={`${className} shrink-0`}>
          <rect width="40" height="40" rx="20" fill="#ed1c24" />
          <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" fill="#ffffff" fontFamily="sans-serif" fontWeight="900" fontSize="16">K</text>
        </svg>
      );
    case "bob":
      return (
        <svg viewBox="0 0 40 40" className={`${className} shrink-0`}>
          <rect width="40" height="40" rx="20" fill="#f26522" />
          <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" fill="#ffffff" fontFamily="sans-serif" fontWeight="900" fontSize="12">BOB</text>
        </svg>
      );
    case "pnb":
      return (
        <svg viewBox="0 0 40 40" className={`${className} shrink-0`}>
          <rect width="40" height="40" rx="20" fill="#a20e23" />
          <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" fill="#fed100" fontFamily="sans-serif" fontWeight="900" fontSize="12">PNB</text>
        </svg>
      );
    case "canara":
      return (
        <svg viewBox="0 0 40 40" className={`${className} shrink-0`}>
          <rect width="40" height="40" rx="20" fill="#0093d8" />
          <path d="M13 27L20 13L27 27Z" fill="#ffcb05" />
        </svg>
      );
    case "union":
      return (
        <svg viewBox="0 0 40 40" className={`${className} shrink-0`}>
          <rect width="40" height="40" rx="20" fill="#0047ba" />
          <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" fill="#ffffff" fontFamily="sans-serif" fontWeight="900" fontSize="12">UBI</text>
        </svg>
      );
    case "indusind":
      return (
        <svg viewBox="0 0 40 40" className={`${className} shrink-0`}>
          <rect width="40" height="40" rx="20" fill="#8c1d40" />
          <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" fill="#ffffff" fontFamily="sans-serif" fontWeight="900" fontSize="11">INDB</text>
        </svg>
      );
    default:
      return (
        <div className={`${className} rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 border border-slate-200`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10zm4 4v3m4-3v3m4-3v3" />
          </svg>
        </div>
      );
  }
}

function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return "-";
  try {
    const raw = dateStr.split("T")[0];
    const parts = raw.split("-");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return raw;
  } catch {
    return dateStr || "-";
  }
}

function formatINR(val?: number) {
  const n = Number(val || 0);
  const formatted = Math.abs(n).toLocaleString("en-IN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
  if (n < 0) {
    return `- ₹ ${formatted}`;
  }
  return `₹ ${formatted}`;
}

const getBankMetaStorageKey = (companyId?: string) =>
  `bank_accounts_meta_${companyId || "default"}`;

function getStoredBankMeta(
  companyId?: string
): Record<
  string,
  {
    bankAccountNo?: string;
    bankIfsc?: string;
    bankBranch?: string;
    upiId?: string;
    accountHolderName?: string;
  }
> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(getBankMetaStorageKey(companyId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredBankMeta(
  companyId: string | undefined,
  accountId: string,
  meta: {
    bankAccountNo?: string;
    bankIfsc?: string;
    bankBranch?: string;
    upiId?: string;
    accountHolderName?: string;
  }
) {
  if (typeof window === "undefined") return;
  try {
    const all = getStoredBankMeta(companyId);
    all[accountId] = { ...(all[accountId] || {}), ...meta };
    localStorage.setItem(getBankMetaStorageKey(companyId), JSON.stringify(all));
  } catch {
    // ignore
  }
}

export default function CashAndBankPage() {
  const { lang, tenantContext, currentFY } = useAuth();

  const [ledgers, setLedgers] = useState<LedgerAccount[]>([]);
  const [groups, setGroups] = useState<LedgerGroup[]>([]);
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected account ID ('cash_in_hand', 'unlinked', or a specific ledger account ID)
  const [selectedAccountId, setSelectedAccountId] = useState<string>("cash_in_hand");

  // Filter state
  const [dateFilter, setDateFilter] = useState<
    "LAST_30_DAYS" | "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "THIS_YEAR" | "ALL"
  >("LAST_30_DAYS");
  const [searchTerm, setSearchTerm] = useState("");
  const [txnTypeFilter, setTxnTypeFilter] = useState("ALL");

  // Transactions list
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoadingTxns, setIsLoadingTxns] = useState(false);

  // Pagination for transactions
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // ================= MODAL 1: Add Bank Account (Matching MyBillBook) =================
  const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false);
  const [isBankDetailsToggled, setIsBankDetailsToggled] = useState(true);
  const [bankForm, setBankForm] = useState({
    accountName: "",
    openingBalance: "",
    asOfDate: new Date().toISOString().split("T")[0],
    accountNumber: "",
    reAccountNumber: "",
    accountHolderName: "",
    ifscCode: "",
    bankName: "",
    branchName: "",
    upiId: "",
  });
  const [ifscLoading, setIfscLoading] = useState(false);
  const [ifscVerified, setIfscVerified] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);
  const [isSubmittingBank, setIsSubmittingBank] = useState(false);

  // ================= MODAL 2: Adjust Balance (Add/Reduce Money - Matching MyBillBook) =================
  const [isAddReduceModalOpen, setIsAddReduceModalOpen] = useState(false);
  const [addReduceMode, setAddReduceMode] = useState<"ADD" | "REDUCE">("ADD");
  const [addReduceForm, setAddReduceForm] = useState({
    accountId: "cash_in_hand",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    remarks: "",
  });
  const [showAddReduceRemarks, setShowAddReduceRemarks] = useState(false);
  const [isSubmittingAddReduce, setIsSubmittingAddReduce] = useState(false);
  const [addReduceError, setAddReduceError] = useState<string | null>(null);

  // ================= MODAL 3: Transfer Balance (Transfer Money - Matching MyBillBook) =================
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({
    fromAccountId: "cash_in_hand",
    toAccountId: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    remarks: "",
  });
  const [showTransferRemarks, setShowTransferRemarks] = useState(false);
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // ================= MODAL 4: Edit Bank Account Details =================
  const [isUpdateBankModalOpen, setIsUpdateBankModalOpen] = useState(false);
  const [updateBankForm, setUpdateBankForm] = useState({
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    branchName: "",
    upiId: "",
  });
  const [isSubmittingUpdateBank, setIsSubmittingUpdateBank] = useState(false);
  const [updateBankError, setUpdateBankError] = useState<string | null>(null);

  // ================= MODAL 5: Share Bank Account Details (Matching MyBillBook) =================
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text || text === "-") return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getFullShareText = () => {
    const holder = companyDetails?.tradeName || companyDetails?.legalName || "Account Holder";
    const bankName = selectedAccount?.name || "Bank";
    const accNo = selectedAccount?.bankAccountNo || companyDetails?.bankAccountNo || selectedAccount?.code || "-";
    const ifsc = selectedAccount?.bankIfsc || companyDetails?.bankIfsc || "-";
    const branch = selectedAccount?.bankBranch || companyDetails?.bankBranch || "-";
    const upi = selectedAccount?.upiId || companyDetails?.upiVpa || "";

    let text = `*Bank Account Details*\nAccount Holder Name: ${holder}\nBank Name: ${bankName}\nAccount Number: ${accNo}\nIFSC Code: ${ifsc}\nBranch: ${branch}`;
    if (upi) {
      text += `\nUPI ID: ${upi}`;
    }
    return text;
  };

  const handleNativeShare = async () => {
    const text = getFullShareText();
    const title = `${selectedAccount?.name || "Bank"} Details`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text });
        setIsShareModalOpen(false);
        return;
      } catch (err: any) {
        if (err.name === "AbortError") return;
      }
    }
    navigator.clipboard.writeText(text);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    setIsShareModalOpen(false);
    setToastMessage(lang === "gu" ? "વિગતો કોપી કરીને WhatsApp ખોલ્યું!" : "Details copied and opening WhatsApp!");
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Accordion for deleted accounts
  const [showDeletedAccounts, setShowDeletedAccounts] = useState(false);

  // Fetch initial ledger accounts, groups & company details
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ledgersRes, groupsRes, compRes]: any = await Promise.all([
        apiClient.get("/accounting/ledgers"),
        apiClient.get("/accounting/groups").catch(() => []),
        apiClient.get("/tenants/company").catch(() => null),
      ]);

      const lList = extractList<LedgerAccount>(ledgersRes);
      const gList = extractList<LedgerGroup>(groupsRes);

      const bankMeta = getStoredBankMeta(tenantContext?.companyId);
      const mappedList = lList.map((a) => {
        const extra = bankMeta[a.id];
        if (extra) {
          return {
            ...a,
            bankAccountNo: extra.bankAccountNo || a.bankAccountNo || a.code,
            bankIfsc: extra.bankIfsc || a.bankIfsc,
            bankBranch: extra.bankBranch || a.bankBranch,
            upiId: extra.upiId || a.upiId,
          };
        }
        return {
          ...a,
          bankAccountNo: a.bankAccountNo || a.code,
        };
      });

      setLedgers(mappedList);
      setGroups(gList);
      if (compRes) setCompanyDetails(compRes);
    } catch (err: any) {
      setError(err.message || "Failed to load Cash & Bank accounts.");
    } finally {
      setIsLoading(false);
    }
  }, [tenantContext?.companyId]);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchData();
    }
  }, [tenantContext.companyId, fetchData]);

  // Segregate accounts
  const {
    cashAccounts,
    bankAccounts,
    inactiveAccounts,
    totalBalance,
    cashInHandBalance,
    totalBankBalance,
  } = useMemo(() => {
    const cashList: LedgerAccount[] = [];
    const bankList: LedgerAccount[] = [];
    const inactiveList: LedgerAccount[] = [];

    let total = 0;
    let cashBal = 0;
    let bankBal = 0;

    ledgers.forEach((l) => {
      if (l.isActive === false) {
        inactiveList.push(l);
        return;
      }

      const gName = l.group?.name?.toLowerCase() || "";
      const isCash =
        l.isCashLedger ||
        gName.includes("cash") ||
        l.name.toLowerCase().includes("cash") ||
        l.name.includes("રોકડ");
      const isBank =
        l.isBankLedger ||
        gName.includes("bank") ||
        l.name.toLowerCase().includes("bank") ||
        l.name.includes("બેંક");

      const bal = Number(
        l.currentBalance !== undefined ? l.currentBalance : l.openingBalance || 0
      );

      if (isCash) {
        cashList.push(l);
        cashBal += bal;
        total += bal;
      } else if (isBank) {
        bankList.push(l);
        bankBal += bal;
        total += bal;
      }
    });

    return {
      cashAccounts: cashList,
      bankAccounts: bankList,
      inactiveAccounts: inactiveList,
      totalBalance: total,
      cashInHandBalance: cashBal,
      totalBankBalance: bankBal,
    };
  }, [ledgers]);

  // Identify currently selected account
  const selectedAccount = useMemo(() => {
    if (selectedAccountId === "cash_in_hand") {
      return cashAccounts[0] || null;
    }
    if (selectedAccountId === "unlinked") {
      return null;
    }
    return ledgers.find((l) => l.id === selectedAccountId) || null;
  }, [selectedAccountId, cashAccounts, ledgers]);

  const isSelectedAccountBank = useMemo(() => {
    if (!selectedAccount) return selectedAccountId === "unlinked";
    const gName = selectedAccount.group?.name?.toLowerCase() || "";
    return (
      selectedAccount.isBankLedger ||
      gName.includes("bank") ||
      selectedAccount.name.toLowerCase().includes("bank") ||
      selectedAccount.name.includes("બેંક")
    );
  }, [selectedAccount, selectedAccountId]);

  // Handle IFSC auto-fetch from Razorpay IFSC public API
  const handleIfscLookup = async (ifsc: string) => {
    const cleanIfsc = ifsc.trim().toUpperCase();
    setBankForm((prev) => ({ ...prev, ifscCode: cleanIfsc }));

    // Instant offline fallback detection from prefix
    const brand = getBankBrandInfo(cleanIfsc);
    if (brand.type !== "generic" && !bankForm.bankName) {
      setBankForm((prev) => ({ ...prev, bankName: brand.name }));
    }

    if (cleanIfsc.length === 11) {
      setIfscLoading(true);
      setIfscVerified(false);
      try {
        const res = await fetch(`https://ifsc.razorpay.com/${cleanIfsc}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.BANK) {
            setBankForm((prev) => ({
              ...prev,
              bankName: data.BANK || brand.name,
              branchName: data.BRANCH || "",
              accountName: prev.accountName ? prev.accountName : `${data.BANK} Account`,
            }));
            setIfscVerified(true);
            setBankError(null);
          }
        } else {
          // If 404 or invalid IFSC, keep fallback brand if matched
          if (brand.type !== "generic") {
            setBankForm((prev) => ({ ...prev, bankName: brand.name }));
          }
        }
      } catch (err) {
        console.warn("IFSC API lookup error:", err);
      } finally {
        setIfscLoading(false);
      }
    }
  };

  // Fetch transactions for selected account
  const fetchTransactions = useCallback(async () => {
    setIsLoadingTxns(true);
    try {
      let fromDate: string | undefined = undefined;
      const today = new Date();
      const toDate = today.toISOString().split("T")[0];

      if (dateFilter === "TODAY") {
        fromDate = toDate;
      } else if (dateFilter === "THIS_WEEK") {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        fromDate = d.toISOString().split("T")[0];
      } else if (dateFilter === "LAST_30_DAYS") {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        fromDate = d.toISOString().split("T")[0];
      } else if (dateFilter === "THIS_MONTH") {
        fromDate = new Date(today.getFullYear(), today.getMonth(), 1)
          .toISOString()
          .split("T")[0];
      } else if (dateFilter === "THIS_YEAR") {
        fromDate = new Date(today.getFullYear(), 0, 1).toISOString().split("T")[0];
      }

      if (selectedAccountId === "unlinked") {
        setTransactions([]);
        setIsLoadingTxns(false);
        return;
      }

      const accId =
        selectedAccount?.id ||
        (selectedAccountId === "cash_in_hand" ? cashAccounts[0]?.id : undefined);

      if (!accId) {
        setTransactions([]);
        setIsLoadingTxns(false);
        return;
      }

      // Try fetching General Ledger statement from API
      try {
        const glRes: any = await apiClient.get("/reports/general-ledger", {
          accountId: accId,
          fromDate,
          toDate,
        });

        if (glRes?.lines && Array.isArray(glRes.lines)) {
          let runningBal = Number(glRes.openingBalance || 0);
          const mapped: TransactionItem[] = glRes.lines.map((l: any, i: number) => {
            const debit = Number(l.debitAmount || 0);
            const credit = Number(l.creditAmount || 0);
            runningBal += debit - credit;

            let typeStr = l.voucherType || "Voucher";
            const narrationLower = (l.narration || "").toLowerCase();
            const refLower = (l.referenceNo || "").toLowerCase();

            if (
              narrationLower.includes("add money") ||
              narrationLower.includes("balance addition") ||
              (refLower.includes("balance adjustment") && debit > 0)
            ) {
              typeStr = "Add Money";
            } else if (
              narrationLower.includes("reduce money") ||
              narrationLower.includes("balance reduction") ||
              (refLower.includes("balance adjustment") && credit > 0)
            ) {
              typeStr = "Reduce Money";
            } else if (l.voucherType === "CONTRA" || refLower.includes("fund transfer")) {
              typeStr = "Transfer";
            } else if (l.voucherType === "PAYMENT") {
              typeStr = "Payment Out";
            } else if (l.voucherType === "RECEIPT") {
              typeStr = "Payment In";
            } else if (l.voucherType === "SALES") {
              typeStr = "Sales";
            } else if (l.voucherType === "PURCHASE") {
              typeStr = "Purchase";
            }

            return {
              id: l.id || `txn_${i}`,
              date: l.voucherDate || l.date || toDate,
              type: typeStr,
              txnNo: l.voucherNumber || "-",
              partyName: l.partyName || l.contraAccountName || l.narration || "-",
              mode: l.paymentMode || (isSelectedAccountBank ? "Bank Transfer" : "Cash"),
              paid: credit,
              received: debit,
              balance: Number(l.balance !== undefined ? l.balance : runningBal),
              narration: l.narration,
            };
          });
          setTransactions(mapped);
          return;
        }
      } catch {
        // Fallback to vouchers query
      }

      // Fallback: Fetch payment / receipt / contra vouchers directly
      const vRes: any = await apiClient.get("/accounting/vouchers", {
        limit: 100,
        startDate: fromDate,
        endDate: toDate,
      });
      const vList = extractList<any>(vRes);

      let runningBal = Number(
        selectedAccount?.currentBalance || selectedAccount?.openingBalance || 0
      );
      const filtered: TransactionItem[] = [];

      for (const v of vList) {
        const matchingLine = (v.journalEntries || []).find(
          (j: any) => j.accountId === accId
        );
        if (
          matchingLine ||
          v.voucherType === "PAYMENT" ||
          v.voucherType === "RECEIPT"
        ) {
          const debit = Number(
            matchingLine?.debitAmount ||
              (v.voucherType === "RECEIPT" || v.voucherType === "SALES" ? v.totalAmount : 0)
          );
          const credit = Number(
            matchingLine?.creditAmount ||
              (v.voucherType === "PAYMENT" || v.voucherType === "PURCHASE" ? v.totalAmount : 0)
          );
          runningBal += debit - credit;

          let typeStr = v.voucherType || "Voucher";
          const narrationLower = (v.narration || "").toLowerCase();
          const refLower = (v.referenceNo || "").toLowerCase();

          if (
            narrationLower.includes("add money") ||
            narrationLower.includes("balance addition") ||
            (refLower.includes("balance adjustment") && debit > 0)
          ) {
            typeStr = "Add Money";
          } else if (
            narrationLower.includes("reduce money") ||
            narrationLower.includes("balance reduction") ||
            (refLower.includes("balance adjustment") && credit > 0)
          ) {
            typeStr = "Reduce Money";
          } else if (v.voucherType === "CONTRA" || refLower.includes("fund transfer")) {
            typeStr = "Transfer";
          } else if (v.voucherType === "PAYMENT") {
            typeStr = "Payment Out";
          } else if (v.voucherType === "RECEIPT") {
            typeStr = "Payment In";
          } else if (v.voucherType === "SALES") {
            typeStr = "Sales";
          } else if (v.voucherType === "PURCHASE") {
            typeStr = "Purchase";
          }

          filtered.push({
            id: v.id,
            date: v.voucherDate
              ? new Date(v.voucherDate).toISOString().split("T")[0]
              : toDate,
            type: typeStr,
            txnNo: v.voucherNumber || "-",
            partyName: v.referenceNo || v.narration || "General Transaction",
            mode: isSelectedAccountBank ? "Bank Transfer" : "Cash",
            paid: credit,
            received: debit,
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
  }, [selectedAccount, selectedAccountId, dateFilter, isSelectedAccountBank, cashAccounts]);

  useEffect(() => {
    fetchTransactions();
    setCurrentPage(1);
  }, [fetchTransactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (
        txnTypeFilter !== "ALL" &&
        !t.type.toLowerCase().includes(txnTypeFilter.toLowerCase())
      ) {
        return false;
      }
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const matchesParty = t.partyName.toLowerCase().includes(s);
        const matchesNo = t.txnNo.toLowerCase().includes(s);
        const matchesType = t.type.toLowerCase().includes(s);
        const matchesMode = t.mode.toLowerCase().includes(s);
        if (!matchesParty && !matchesNo && !matchesType && !matchesMode)
          return false;
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

  // Paginated list
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredTransactions.length / pageSize) || 1;

  // Selected account current balance helper for modals
  const getAccountBalance = (accId: string) => {
    if (accId === "cash_in_hand") return cashInHandBalance;
    const acc = ledgers.find((l) => l.id === accId);
    return Number(acc?.currentBalance !== undefined ? acc.currentBalance : acc?.openingBalance || 0);
  };

  // Live calculated new balance for Adjust Balance Modal
  const adjustedNewBalance = useMemo(() => {
    const current = getAccountBalance(addReduceForm.accountId);
    const amt = Number(addReduceForm.amount) || 0;
    if (addReduceMode === "ADD") return current + amt;
    return current - amt;
  }, [addReduceForm.accountId, addReduceForm.amount, addReduceMode, cashInHandBalance, ledgers]);

  // Handle Add/Reduce Money (Adjust Balance)
  const handleAddReduceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddReduceError(null);
    setIsSubmittingAddReduce(true);

    try {
      const amt = Number(addReduceForm.amount);
      if (!amt || amt <= 0) {
        throw new Error(
          lang === "gu"
            ? "રકમ ૦ થી વધુ હોવી જરૂરી છે."
            : "Amount must be greater than zero."
        );
      }

      let accId = addReduceForm.accountId;
      if (accId === "cash_in_hand") {
        accId = cashAccounts[0]?.id || "";
      }
      if (!accId) {
        accId = selectedAccount?.id || bankAccounts[0]?.id || "";
      }
      if (!accId) {
        throw new Error(
          lang === "gu" ? "ખાતું પસંદ કરો." : "Please select an account."
        );
      }

      // Find balancing double-entry offset account (Proprietor Capital / Equity / Adjustment)
      const offsetAcc =
        ledgers.find(
          (l) =>
            l.name.toLowerCase().includes("proprietor capital") ||
            l.name.toLowerCase().includes("capital account") ||
            l.group?.name?.toLowerCase().includes("capital") ||
            l.group?.nature === "EQUITY"
        ) ||
        ledgers.find((l) => l.name.toLowerCase().includes("adjustment")) ||
        ledgers.find((l) => !l.isBankLedger && !l.isCashLedger && l.name !== "Cash Account") ||
        ledgers[0];

      if (!offsetAcc) {
        throw new Error(
          lang === "gu"
            ? "સંતુલન ખાતું મળ્યું નથી."
            : "Balancing ledger account not found."
        );
      }

      const voucherType = addReduceMode === "ADD" ? "RECEIPT" : "PAYMENT";
      const narration =
        addReduceForm.remarks.trim() ||
        `${
          addReduceMode === "ADD" ? "Add Money" : "Reduce Money"
        }: Manual Balance Adjustment`;

      // Perfectly balanced double-entry lines:
      // When ADD: Debit Cash/Bank (increases asset), Credit Capital/Offset
      // When REDUCE: Debit Capital/Offset, Credit Cash/Bank (decreases asset)
      const lines =
        addReduceMode === "ADD"
          ? [
              {
                accountId: accId,
                debitAmount: amt,
                creditAmount: 0,
                lineNarration: narration,
              },
              {
                accountId: offsetAcc.id,
                debitAmount: 0,
                creditAmount: amt,
                lineNarration: narration,
              },
            ]
          : [
              {
                accountId: offsetAcc.id,
                debitAmount: amt,
                creditAmount: 0,
                lineNarration: narration,
              },
              {
                accountId: accId,
                debitAmount: 0,
                creditAmount: amt,
                lineNarration: narration,
              },
            ];

      await apiClient.post("/accounting/vouchers", {
        voucherType,
        voucherNumber: `ADJ-${Date.now().toString().slice(-6)}`,
        voucherDate: addReduceForm.date,
        financialYearId: currentFY?.id,
        narration,
        referenceNo: "Balance Adjustment",
        lines,
      });

      setIsAddReduceModalOpen(false);
      setToastMessage(
        lang === "gu"
          ? `રકમ સફળતાપૂર્વક ${
              addReduceMode === "ADD" ? "ઉમેરાઈ ગઈ" : "બાદ થઈ ગઈ"
            }!`
          : `Amount ${
              addReduceMode === "ADD" ? "added" : "reduced"
            } successfully!`
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

  // Handle Transfer Money (Transfer Balance)
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError(null);
    setIsSubmittingTransfer(true);

    try {
      const amt = Number(transferForm.amount);
      if (!amt || amt <= 0) {
        throw new Error(
          lang === "gu"
            ? "રકમ ૦ થી વધુ હોવી જરૂરી છે."
            : "Amount must be greater than zero."
        );
      }

      let fromId = transferForm.fromAccountId;
      let toId = transferForm.toAccountId;
      if (fromId === "cash_in_hand") fromId = cashAccounts[0]?.id || "";
      if (toId === "cash_in_hand") toId = cashAccounts[0]?.id || "";

      if (!fromId || !toId) {
        throw new Error(
          lang === "gu"
            ? "ક્યાંથી અને ક્યાં ટ્રાન્સફર કરવું તે બંને ખાતા પસંદ કરો."
            : "Please select both Source and Destination accounts."
        );
      }
      if (fromId === toId) {
        throw new Error(
          lang === "gu"
            ? "સોર્સ અને ડેસ્ટિનેશન ખાતું સરખું ન હોઈ શકે."
            : "Source and Destination accounts cannot be the same."
        );
      }

      const fromAcc = ledgers.find((l) => l.id === fromId);
      const toAcc = ledgers.find((l) => l.id === toId);

      const narration =
        transferForm.remarks.trim() ||
        `Transfer from ${fromAcc?.name} to ${toAcc?.name}`;

      await apiClient.post("/accounting/vouchers", {
        voucherType: "CONTRA",
        voucherNumber: `TRF-${Date.now().toString().slice(-6)}`,
        voucherDate: transferForm.date,
        financialYearId: currentFY?.id,
        narration,
        referenceNo: "Fund Transfer",
        lines: [
          {
            accountId: toId,
            debitAmount: amt,
            creditAmount: 0,
            lineNarration: `Received from ${fromAcc?.name}`,
          },
          {
            accountId: fromId,
            debitAmount: 0,
            creditAmount: amt,
            lineNarration: `Transferred to ${toAcc?.name}`,
          },
        ],
      });

      setIsTransferModalOpen(false);
      setToastMessage(
        lang === "gu"
          ? "રકમ સફળતાપૂર્વક ટ્રાન્સફર થઈ ગઈ!"
          : "Money transferred successfully!"
      );
      setTimeout(() => setToastMessage(null), 4000);
      await fetchData();
      await fetchTransactions();
    } catch (err: any) {
      setTransferError(err.message || "Transfer failed.");
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  // Handle Add New Bank Account (with Auto IFSC & Logo)
  const handleAddBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBankError(null);
    setIsSubmittingBank(true);

    try {
      const accName = bankForm.accountName.trim();
      if (!accName) {
        throw new Error(lang === "gu" ? "એકાઉન્ટનું નામ દાખલ કરો." : "Please enter the Account Name.");
      }

      if (isBankDetailsToggled) {
        if (!bankForm.accountNumber.trim()) {
          throw new Error("Please enter Bank Account Number.");
        }
        if (bankForm.reAccountNumber.trim() && bankForm.accountNumber.trim() !== bankForm.reAccountNumber.trim()) {
          throw new Error("Bank Account Number and Re-entered Number do not match.");
        }
      }

      let bankGroup = groups.find((g) =>
        g.name.toLowerCase().includes("bank account")
      );
      if (!bankGroup) {
        bankGroup = groups.find((g) => g.nature === "ASSET");
      }
      if (!bankGroup) {
        throw new Error("Bank Accounts ledger group not found.");
      }

      const created: any = await apiClient.post("/accounting/ledgers", {
        name: accName,
        code: bankForm.accountNumber ? bankForm.accountNumber.trim() : `BNK-${Date.now().toString().slice(-4)}`,
        groupId: bankGroup.id,
        openingBalance: Number(bankForm.openingBalance || 0),
        openingType: "DR",
        isBankLedger: true,
        isActive: true,
        bankAccountNo: bankForm.accountNumber.trim(),
        bankIfsc: bankForm.ifscCode.trim().toUpperCase(),
        bankBranch: bankForm.branchName.trim(),
      });

      if (created?.id) {
        saveStoredBankMeta(tenantContext?.companyId, created.id, {
          accountHolderName: bankForm.accountHolderName.trim(),
          bankAccountNo: bankForm.accountNumber.trim(),
          bankIfsc: bankForm.ifscCode.trim().toUpperCase(),
          bankBranch: bankForm.branchName.trim(),
          upiId: bankForm.upiId.trim(),
        });
      }

      setIsAddBankModalOpen(false);
      setToastMessage(
        lang === "gu"
          ? "બેંક ખાતું સફળતાપૂર્વક ઉમેરાઈ ગયું!"
          : "Bank account added successfully!"
      );
      setTimeout(() => setToastMessage(null), 4000);
      await fetchData();
      if (created?.id) {
        setSelectedAccountId(created.id);
      }
    } catch (err: any) {
      setBankError(err.message || "Failed to create bank account.");
    } finally {
      setIsSubmittingBank(false);
    }
  };

  // Export columns for Excel & PDF
  const exportColumns = useMemo(
    () => [
      { header: "Date", key: "date", width: 14, align: "center" as const },
      { header: "Type", key: "type", width: 16, align: "left" as const },
      { header: "Txn No", key: "txnNo", width: 18, align: "left" as const },
      { header: "Party / Description", key: "partyName", width: 32, align: "left" as const },
      { header: "Payment Mode", key: "mode", width: 14, align: "center" as const },
      {
        header: "Paid (₹)",
        key: "paid",
        width: 16,
        align: "right" as const,
        type: "currency" as const,
        format: (val: any) =>
          val > 0 ? `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-",
      },
      {
        header: "Received (₹)",
        key: "received",
        width: 16,
        align: "right" as const,
        type: "currency" as const,
        format: (val: any) =>
          val > 0 ? `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-",
      },
      {
        header: "Balance (₹)",
        key: "balance",
        width: 18,
        align: "right" as const,
        type: "currency" as const,
        format: (val: any) =>
          `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      },
    ],
    []
  );

  // Dedicated direct PDF statement download (AutoTable + Company Branding + KPI Cards)
  const handleDownloadStatement = async () => {
    if (!selectedAccount) return;
    setIsDownloadingPdf(true);
    try {
      const { exportToPdf } = await import("@/lib/export/export-engine");

      const accHolder =
        companyDetails?.tradeName ||
        companyDetails?.legalName ||
        "Audit Traders Ahmedabad";
      const bankName = selectedAccount.name || "Bank Account";
      const accNumber =
        selectedAccount.bankAccountNo ||
        companyDetails?.bankAccountNo ||
        selectedAccount.code ||
        "-";
      const ifsc =
        selectedAccount.bankIfsc || companyDetails?.bankIfsc || "-";
      const branch =
        selectedAccount.bankBranch || companyDetails?.bankBranch || "-";
      const closingBal =
        selectedAccount.currentBalance ?? selectedAccount.openingBalance ?? 0;

      const filterDesc = [
        `Account: ${bankName}`,
        accNumber !== "-" ? `A/C: ${accNumber}` : null,
        ifsc !== "-" ? `IFSC: ${ifsc}` : null,
        branch !== "-" ? `Branch: ${branch}` : null,
        `Period: ${dateFilter.replace(/_/g, " ")} (${txnTypeFilter})`,
      ]
        .filter(Boolean)
        .join(" | ");

      await exportToPdf(
        exportColumns,
        filteredTransactions,
        {
          title: `${bankName} - Account Statement`,
          fileName: `Statement_${bankName.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
          companyName: accHolder,
          companyGstin: companyDetails?.gstin || "",
          companyAddress: [
            companyDetails?.addressLine1,
            companyDetails?.city,
            companyDetails?.state,
            companyDetails?.pincode,
          ]
            .filter(Boolean)
            .join(", "),
          filterDescription: filterDesc,
          orientation: "landscape",
          summaryCards: [
            {
              label: "Total Paid (Outflow)",
              value: `₹${totalPaid.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}`,
              color: "danger",
            },
            {
              label: "Total Received (Inflow)",
              value: `₹${totalReceived.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}`,
              color: "success",
            },
            {
              label: "Closing Balance",
              value: `₹${closingBal.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}`,
              color: closingBal >= 0 ? "default" : "danger",
            },
          ],
          totals: {
            "Paid (₹)": totalPaid,
            "Received (₹)": totalReceived,
            "Balance (₹)": closingBal,
          },
        }
      );

      setToastMessage(
        lang === "gu"
          ? "સ્ટેટમેન્ટ PDF સફળતાપૂર્વક ડાઉનલોડ થઈ ગઈ!"
          : "Account statement PDF downloaded successfully!"
      );
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      console.error("Failed to generate PDF statement:", err);
      setToastMessage(
        lang === "gu"
          ? "PDF બનાવવામાં ભૂલ આવી."
          : "Failed to generate statement PDF."
      );
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-4 max-w-full">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F172A] text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header matching MyBillBook */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
            {lang === "gu" ? "રોકડ અને બેંક (Cash and Bank)" : "Cash and Bank"}
          </h1>
        </div>

        {/* 3 Top Action Buttons Matching MyBillBook Screenshot Exactly - Responsive Grid on Mobile */}
        <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center sm:gap-2 w-full sm:w-auto">
          {/* Button 1: + Add/Reduce Money */}
          <button
            onClick={() => {
              setAddReduceForm({
                accountId: selectedAccountId === "unlinked" ? "cash_in_hand" : selectedAccountId,
                amount: "",
                date: new Date().toISOString().split("T")[0],
                remarks: "",
              });
              setAddReduceError(null);
              setShowAddReduceRemarks(false);
              setIsAddReduceModalOpen(true);
            }}
            className="px-2 sm:px-3.5 py-2 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-[#CBD5E1] rounded-lg sm:rounded-md transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer shadow-2xs hover:border-slate-400"
          >
            <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="truncate">{lang === "gu" ? "ઉમેરો/બાદ કરો" : "Add/Reduce"}</span>
          </button>

          {/* Button 2: ⇄ Transfer Money */}
          <button
            onClick={() => {
              setTransferForm({
                fromAccountId: "cash_in_hand",
                toAccountId: bankAccounts[0]?.id || "",
                amount: "",
                date: new Date().toISOString().split("T")[0],
                remarks: "",
              });
              setTransferError(null);
              setShowTransferRemarks(false);
              setIsTransferModalOpen(true);
            }}
            className="px-2 sm:px-3.5 py-2 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-[#CBD5E1] rounded-lg sm:rounded-md transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer shadow-2xs hover:border-slate-400"
          >
            <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span className="truncate">{lang === "gu" ? "ટ્રાન્સફર" : "Transfer"}</span>
          </button>

          {/* Button 3: + Add New Account */}
          <button
            onClick={() => {
              setBankForm({
                accountName: "",
                openingBalance: "",
                asOfDate: new Date().toISOString().split("T")[0],
                accountNumber: "",
                reAccountNumber: "",
                accountHolderName: companyDetails?.tradeName || companyDetails?.legalName || "",
                ifscCode: "",
                bankName: "",
                branchName: "",
                upiId: "",
              });
              setIfscVerified(false);
              setBankError(null);
              setIsAddBankModalOpen(true);
            }}
            className="px-2 sm:px-4 py-2 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-white bg-[#5850EC] hover:bg-[#123B35] active:bg-[#0F322C] rounded-lg sm:rounded-md transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer shadow-xs"
          >
            <svg className="w-3.5 h-3.5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="truncate">{lang === "gu" ? "નવી બેંક" : "+ New Bank"}</span>
          </button>
        </div>
      </div>

      {/* Main Dual-Panel Layout: Matching MyBillBook Screenshot Exactly */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs overflow-hidden flex flex-col lg:flex-row min-h-[580px]">
        {/* MOBILE VIEW (< lg): Compact Horizontal Account Chips Bar */}
        <div className="block lg:hidden border-b border-[#E2E8F0] bg-white">
          {/* Total Balance Strip on Mobile */}
          <div className="px-3.5 py-2.5 bg-slate-50 border-b border-[#E2E8F0] flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">
              {lang === "gu" ? "કુલ સિલક (Total Balance):" : "Total Balance:"}
            </span>
            <span className="text-sm font-bold text-slate-900 font-mono">
              {formatINR(totalBalance)}
            </span>
          </div>

          {/* Horizontal Scrolling Chips on Mobile */}
          <div className="p-2 overflow-x-auto scrollbar-none flex items-center gap-2">
            {/* Cash In Hand Chip */}
            <button
              onClick={() => setSelectedAccountId("cash_in_hand")}
              className={`shrink-0 px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 transition-all cursor-pointer ${
                selectedAccountId === "cash_in_hand"
                  ? "bg-[#EEF0FF] border-[#174B43] text-[#174B43] font-semibold shadow-2xs"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                💵
              </div>
              <span>{lang === "gu" ? "હાથ પર રોકડ" : "Cash in hand"}</span>
              <span className="font-mono text-[11px] font-bold">
                {formatINR(cashInHandBalance)}
              </span>
            </button>

            {/* Bank Account Chips */}
            {bankAccounts.map((b) => {
              const isSelected = selectedAccountId === b.id;
              const bal = Number(
                b.currentBalance !== undefined
                  ? b.currentBalance
                  : b.openingBalance || 0
              );
              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedAccountId(b.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#EEF0FF] border-[#174B43] text-[#174B43] font-semibold shadow-2xs"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <BankLogo bankNameOrIfsc={b.bankIfsc || b.name} className="w-5 h-5" />
                  <span className="truncate max-w-[120px]">{b.name}</span>
                  <span className="font-mono text-[11px] font-bold">
                    {formatINR(bal)}
                  </span>
                </button>
              );
            })}

            {/* Unlinked Transactions Chip */}
            <button
              onClick={() => setSelectedAccountId("unlinked")}
              className={`shrink-0 px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 transition-all cursor-pointer ${
                selectedAccountId === "unlinked"
                  ? "bg-[#EEF0FF] border-[#174B43] text-[#174B43] font-semibold shadow-2xs"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span>{lang === "gu" ? "અનલિંક્ડ" : "Unlinked"}</span>
              <span className="font-mono text-[11px] font-bold">₹ 0</span>
            </button>

            {/* Add New Bank Button Chip */}
            <button
              onClick={() => {
                setBankForm({
                  accountName: "",
                  openingBalance: "",
                  asOfDate: new Date().toISOString().split("T")[0],
                  accountNumber: "",
                  reAccountNumber: "",
                  accountHolderName: companyDetails?.tradeName || companyDetails?.legalName || "",
                  ifscCode: "",
                  bankName: "",
                  branchName: "",
                  upiId: "",
                });
                setIfscVerified(false);
                setBankError(null);
                setIsAddBankModalOpen(true);
              }}
              className="shrink-0 px-2.5 py-1.5 rounded-lg border border-dashed border-[#174B43] text-[#174B43] hover:bg-[#EEF0FF] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>+</span>
              <span>{lang === "gu" ? "નવી બેંક" : "Add Bank"}</span>
            </button>
          </div>
        </div>

        {/* DESKTOP LEFT COLUMN: Accounts List (~340px) */}
        <div className="hidden lg:flex w-full lg:w-[320px] xl:w-[350px] shrink-0 border-b lg:border-b-0 lg:border-r border-[#E2E8F0] bg-white flex-col">
          {/* Total Balance Strip */}
          <div className="px-4 py-3.5 flex items-center justify-between border-b border-[#E2E8F0]">
            <span className="text-xs font-medium text-slate-700">
              {lang === "gu" ? "કુલ સિલક:" : "Total Balance:"}
            </span>
            <span className="text-sm font-bold text-slate-900 font-mono">
              {formatINR(totalBalance)}
            </span>
          </div>

          {/* Section: Cash */}
          <div className="border-b border-[#E2E8F0]">
            <div className="px-4 pt-3 pb-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {lang === "gu" ? "રોકડ (Cash)" : "Cash"}
            </div>
            <div className="px-2 pb-2">
              <button
                onClick={() => setSelectedAccountId("cash_in_hand")}
                className={`w-full px-3 py-2.5 rounded-lg flex items-center justify-between transition-all text-left cursor-pointer ${
                  selectedAccountId === "cash_in_hand"
                    ? "bg-[#EEF0FF] text-[#174B43] font-semibold"
                    : "hover:bg-slate-50 text-slate-800 font-medium"
                }`}
              >
                <span className="text-xs">
                  {lang === "gu" ? "હાથ પર રોકડ (Cash in hand)" : "Cash in hand"}
                </span>
                <span className="text-xs font-mono font-medium">
                  {formatINR(cashInHandBalance)}
                </span>
              </button>
            </div>
          </div>

          {/* Section: Bank Accounts */}
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {lang === "gu" ? "બેંક એકાઉન્ટ્સ" : "Bank Accounts"}
                </span>
                <button
                  onClick={() => {
                    setBankForm({
                      accountName: "",
                      openingBalance: "",
                      asOfDate: new Date().toISOString().split("T")[0],
                      accountNumber: "",
                      reAccountNumber: "",
                      accountHolderName: companyDetails?.tradeName || companyDetails?.legalName || "",
                      ifscCode: "",
                      bankName: "",
                      branchName: "",
                      upiId: "",
                    });
                    setIfscVerified(false);
                    setBankError(null);
                    setIsAddBankModalOpen(true);
                  }}
                  className="text-xs font-semibold text-[#174B43] hover:text-[#0F322C] hover:underline cursor-pointer"
                >
                  {lang === "gu" ? "+ નવી બેંક ઉમેરો" : "+ Add New Bank"}
                </button>
              </div>

              {/* Bank Accounts List (Scrollable on mobile) */}
              <div className="px-2 space-y-0.5 max-h-[260px] lg:max-h-none overflow-y-auto">
                {/* Default Unlinked Transactions Item */}
                <button
                  onClick={() => setSelectedAccountId("unlinked")}
                  className={`w-full px-3 py-2.5 rounded-lg flex items-center justify-between transition-all text-left cursor-pointer ${
                    selectedAccountId === "unlinked"
                      ? "bg-[#EEF0FF] text-[#174B43] font-semibold"
                      : "hover:bg-slate-50 text-slate-800 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 border border-slate-200">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10zm4 4v3m4-3v3m4-3v3" />
                      </svg>
                    </div>
                    <span className="text-xs truncate font-medium">
                      {lang === "gu" ? "અનલિંક્ડ વ્યવહારો" : "Unlinked Transactions"}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-medium pl-2">
                    ₹ 0
                  </span>
                </button>

                {/* Dynamic Bank Accounts with Real Official Bank Logos */}
                {bankAccounts.map((b) => {
                  const isSelected = selectedAccountId === b.id;
                  const bal = Number(
                    b.currentBalance !== undefined
                      ? b.currentBalance
                      : b.openingBalance || 0
                  );

                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedAccountId(b.id)}
                      className={`w-full px-3 py-2.5 rounded-lg flex items-center justify-between transition-all text-left cursor-pointer ${
                        isSelected
                          ? "bg-[#EEF0FF] text-[#174B43] font-semibold"
                          : "hover:bg-slate-50 text-slate-800 font-medium"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate min-w-0">
                        {/* Bank Logo */}
                        <BankLogo bankNameOrIfsc={b.bankIfsc || b.name} className="w-8 h-8" />
                        <div className="truncate">
                          <p className="text-xs truncate font-medium">{b.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono truncate">
                            {b.bankAccountNo || b.code || "••••"}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-medium pl-2 shrink-0">
                        {formatINR(bal)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Deleted Accounts Accordion (If Any) */}
            {inactiveAccounts.length > 0 && (
              <div className="border-t border-[#E2E8F0] mt-4">
                <button
                  onClick={() => setShowDeletedAccounts(!showDeletedAccounts)}
                  className="w-full px-4 py-2.5 text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center justify-between bg-slate-50/60"
                >
                  <span>Deleted Accounts ({inactiveAccounts.length})</span>
                  <span className="text-[10px]">{showDeletedAccounts ? "▲" : "▼"}</span>
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

        {/* RIGHT COLUMN: Transactions Pane & Details */}
        <div className="flex-1 flex flex-col bg-white min-w-0">
          {/* Top Tab Bar: Matching MyBillBook Screenshot ('Transactions' Tab) */}
          <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-white px-2 pt-2">
            <div className="flex items-center gap-1">
              <button className="px-5 py-2.5 text-xs font-semibold text-[#174B43] bg-[#EEF0FF] border-b-2 border-[#174B43] rounded-t-lg transition-colors cursor-pointer">
                {lang === "gu" ? "વ્યવહારો (Transactions)" : "Transactions"}
              </button>
            </div>
          </div>

          {/* Bank Details Header Card (Shown when a Bank Account is selected) */}
          {isSelectedAccountBank && selectedAccount && (
            <div className="p-3 sm:p-4 border-b border-[#E2E8F0] bg-white">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-4">
                <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                  <BankLogo
                    bankNameOrIfsc={selectedAccount.bankIfsc || selectedAccount.name}
                    className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 mt-0.5"
                  />
                  <div className="space-y-1 text-xs min-w-0 flex-1">
                    <div className="flex flex-col sm:grid sm:grid-cols-[140px_12px_1fr] text-slate-700">
                      <span className="text-slate-500 text-[11px] sm:text-xs">Account Holder</span>
                      <span className="hidden sm:inline text-slate-400">:</span>
                      <span className="font-semibold sm:font-medium text-slate-900 truncate">
                        {companyDetails?.tradeName || companyDetails?.legalName || "Owner"}
                      </span>
                    </div>
                    <div className="flex flex-col sm:grid sm:grid-cols-[140px_12px_1fr] text-slate-700">
                      <span className="text-slate-500 text-[11px] sm:text-xs">Account Name</span>
                      <span className="hidden sm:inline text-slate-400">:</span>
                      <span className="font-semibold sm:font-medium text-slate-900 truncate">{selectedAccount.name}</span>
                    </div>
                    <div className="flex flex-col sm:grid sm:grid-cols-[140px_12px_1fr] text-slate-700">
                      <span className="text-slate-500 text-[11px] sm:text-xs">Account Number</span>
                      <span className="hidden sm:inline text-slate-400">:</span>
                      <span className="font-mono font-semibold sm:font-medium text-slate-900">
                        {selectedAccount.bankAccountNo || companyDetails?.bankAccountNo || selectedAccount.code || "-"}
                      </span>
                    </div>
                    <div className="flex flex-col sm:grid sm:grid-cols-[140px_12px_1fr] text-slate-700">
                      <span className="text-slate-500 text-[11px] sm:text-xs">IFSC Code</span>
                      <span className="hidden sm:inline text-slate-400">:</span>
                      <span className="font-mono font-semibold sm:font-medium text-slate-900 uppercase">
                        {selectedAccount.bankIfsc || companyDetails?.bankIfsc || "-"}
                      </span>
                    </div>
                    <div className="flex flex-col sm:grid sm:grid-cols-[140px_12px_1fr] text-slate-700">
                      <span className="text-slate-500 text-[11px] sm:text-xs">Bank & Branch</span>
                      <span className="hidden sm:inline text-slate-400">:</span>
                      <span className="font-semibold sm:font-medium text-slate-900">
                        {selectedAccount.bankBranch || companyDetails?.bankBranch || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3 Action Buttons - Responsive Grid on Mobile */}
                <div className="grid grid-cols-3 md:flex md:flex-col gap-1.5 sm:gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <button
                    onClick={() => {
                      setUpdateBankForm({
                        accountHolderName: companyDetails?.tradeName || "",
                        bankName: selectedAccount.name,
                        accountNumber: selectedAccount.bankAccountNo || companyDetails?.bankAccountNo || "",
                        ifscCode: selectedAccount.bankIfsc || companyDetails?.bankIfsc || "",
                        branchName: selectedAccount.bankBranch || companyDetails?.bankBranch || "",
                        upiId: selectedAccount.upiId || "",
                      });
                      setIsUpdateBankModalOpen(true);
                    }}
                    className="px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors flex items-center justify-center sm:justify-between gap-1 sm:gap-3 shadow-2xs hover:border-slate-400 cursor-pointer"
                  >
                    <span className="truncate">{lang === "gu" ? "સુધારો" : "Update"}</span>
                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>

                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors flex items-center justify-center sm:justify-between gap-1 sm:gap-3 shadow-2xs hover:border-slate-400 cursor-pointer"
                  >
                    <span className="truncate">{lang === "gu" ? "શેર કરો" : "Share"}</span>
                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>

                  <button
                    onClick={handleDownloadStatement}
                    disabled={isDownloadingPdf}
                    className="px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors flex items-center justify-center sm:justify-between gap-1 sm:gap-3 shadow-2xs hover:border-slate-400 cursor-pointer disabled:opacity-60"
                  >
                    <span className="truncate">
                      {isDownloadingPdf
                        ? (lang === "gu" ? "PDF..." : "PDF...")
                        : (lang === "gu" ? "સ્ટેટમેન્ટ" : "Statement")}
                    </span>
                    {isDownloadingPdf ? (
                      <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-[#5850EC] rounded-full animate-spin shrink-0" />
                    ) : (
                      <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Filter Bar Below Tab */}
          <div className="p-2.5 sm:p-3 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
              {/* Date Filter Dropdown */}
              <div className="relative col-span-1 sm:col-span-auto">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className="w-full appearance-none pl-7 sm:pl-8 pr-6 sm:pr-7 py-1.5 bg-white border border-[#CBD5E1] rounded-md text-[11px] sm:text-xs font-medium text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-[#174B43] cursor-pointer"
                >
                  <option value="LAST_30_DAYS">{lang === "gu" ? "છેલ્લા ૩૦ દિવસ" : "Last 30 Days"}</option>
                  <option value="TODAY">{lang === "gu" ? "આજે" : "Today"}</option>
                  <option value="THIS_WEEK">{lang === "gu" ? "આ અઠવાડિયે" : "This Week"}</option>
                  <option value="THIS_MONTH">{lang === "gu" ? "આ મહિનો" : "This Month"}</option>
                  <option value="THIS_YEAR">{lang === "gu" ? "આ નાણાકીય વર્ષ" : "This Financial Year"}</option>
                  <option value="ALL">{lang === "gu" ? "તમામ તારીખો" : "All Time"}</option>
                </select>
                <svg className="w-3.5 h-3.5 text-slate-500 absolute left-2 sm:left-2.5 top-2 sm:top-2.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <svg className="w-3 h-3 text-slate-400 absolute right-2 sm:right-2.5 top-2.5 sm:top-3 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Type Filter */}
              <div className="col-span-1 sm:col-span-auto">
                <select
                  value={txnTypeFilter}
                  onChange={(e) => setTxnTypeFilter(e.target.value)}
                  className="w-full py-1.5 px-2.5 sm:px-3 text-[11px] sm:text-xs bg-white border border-[#CBD5E1] rounded-md font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#174B43] cursor-pointer"
                >
                  <option value="ALL">All Types</option>
                  <option value="Payment In">Payment In (Receipt)</option>
                  <option value="Payment Out">Payment Out</option>
                  <option value="Sales Invoice">Sales Invoices</option>
                  <option value="Purchase Invoice">Purchase Invoices</option>
                  <option value="Transfer">Transfers (Contra)</option>
                </select>
              </div>

              {/* Search Filter Input (Full width on mobile) */}
              <div className="relative col-span-2 sm:col-span-auto sm:min-w-[190px]">
                <input
                  type="text"
                  placeholder={lang === "gu" ? "શોધો (પાર્ટી, વાઉચર, વર્ણન)..." : "Search party, txn no, narration..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 text-[11px] sm:text-xs bg-white border border-[#CBD5E1] rounded-md focus:outline-none focus:ring-1 focus:ring-[#174B43] text-slate-800 placeholder-slate-400"
                />
                <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Export Dropdown */}
            <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
              <div className="text-[11px] text-slate-400 sm:hidden">
                {filteredTransactions.length} {lang === "gu" ? "વ્યવહારો" : "txns"}
              </div>
              <ExportDropdown
                columns={exportColumns}
                data={filteredTransactions}
                metadata={{
                  title: `${selectedAccount?.name || "Cash & Bank"} Statement`,
                  fileName: `statement_${selectedAccount?.name || "cash_and_bank"}`,
                  companyName: companyDetails?.tradeName || "myownbillbook",
                  companyGstin: companyDetails?.gstin || "24AAAAA0000A1Z5",
                }}
                lang={lang}
                buttonVariant="outline"
                align="auto"
              />
            </div>
          </div>

          {/* Transactions Content Area */}
          <div className="flex-1 flex flex-col justify-between">
            {isLoadingTxns ? (
              <div className="py-24 text-center text-xs text-slate-400">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-[#174B43] mb-2" />
                <p>{lang === "gu" ? "વ્યવહારો લોડ થઈ રહ્યા છે..." : "Loading transactions..."}</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              /* EMPTY STATE: Matches MyBillBook Screenshot Exactly */
              <div className="py-24 px-4 flex flex-col items-center justify-center text-center">
                <svg className="w-20 h-20 text-slate-300" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="16" y="20" width="48" height="42" rx="6" stroke="currentColor" strokeWidth="2.5" />
                  <path d="M16 32h48" stroke="currentColor" strokeWidth="2.5" />
                  <rect x="24" y="44" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
                  <path d="M46 49h10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <h3 className="mt-4 text-base font-bold text-slate-800">
                  {lang === "gu" ? "કોઈ વ્યવહાર મળ્યા નથી" : "No Transactions"}
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  {lang === "gu"
                    ? "પસંદ કરેલા સમયગાળા માટે કોઈ વ્યવહાર મળ્યો નથી."
                    : "Your don't have any transaction in selected period"}
                </p>
              </div>
            ) : (
              <div>
                {/* MOBILE VIEW (< md): Responsive Transaction Cards */}
                <div className="block md:hidden divide-y divide-[#E2E8F0]">
                  {paginatedTransactions.map((t) => {
                    const isTransfer = t.type.toLowerCase().includes("transfer");
                    const isPaymentIn =
                      t.type.toLowerCase().includes("in") ||
                      t.type.toLowerCase().includes("receipt") ||
                      t.type.toLowerCase().includes("add") ||
                      (!isTransfer && t.received > 0);

                    return (
                      <div key={t.id} className="p-3 hover:bg-slate-50 transition-colors">
                        {/* Row 1: Party Name & Paid/Received Amount */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {t.partyName}
                            </h4>
                            {t.narration && t.narration !== t.partyName && (
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                {t.narration}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            {t.received > 0 ? (
                              <span className="text-xs font-bold font-mono text-emerald-700">
                                +₹{t.received.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                            ) : t.paid > 0 ? (
                              <span className="text-xs font-bold font-mono text-rose-600">
                                -₹{t.paid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-xs font-mono text-slate-400">-</span>
                            )}
                          </div>
                        </div>

                        {/* Row 2: Badges, Date, Txn No, Balance */}
                        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                isTransfer
                                  ? "bg-teal-50 text-teal-700"
                                  : isPaymentIn
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {t.type}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="font-mono text-slate-600 text-[10px]">{t.txnNo}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-[10px]">{formatDisplayDate(t.date)}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] text-slate-400 mr-1">Bal:</span>
                            <span className="font-mono font-semibold text-slate-800 text-[11px]">
                              ₹{t.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Mobile Total Summary Strip */}
                  <div className="p-3 bg-[#F8FAFC] border-t-2 border-[#CBD5E1] flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-600 uppercase text-[11px]">Total:</span>
                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="text-rose-600">
                        Paid: ₹{totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-emerald-700">
                        Rec: ₹{totalReceived.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* DESKTOP VIEW (>= md): Full Responsive Table */}
                <div className="hidden md:block overflow-x-auto w-full -webkit-overflow-scrolling-touch">
                  <table className="w-full min-w-[780px] text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] text-[11px] font-semibold uppercase tracking-wider">
                        <th className="py-2.5 px-3 whitespace-nowrap">DATE</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">TYPE</th>
                        <th className="py-2.5 px-2.5 font-mono whitespace-nowrap">TXN NO</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">PARTY / DESCRIPTION</th>
                        <th className="py-2.5 px-2.5 whitespace-nowrap">MODE</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">PAID (₹)</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">RECEIVED (₹)</th>
                        <th className="py-2.5 px-3 text-right font-mono whitespace-nowrap">BALANCE (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {paginatedTransactions.map((t) => {
                        const isTransfer = t.type.toLowerCase().includes("transfer");
                        const isPaymentIn =
                          t.type.toLowerCase().includes("in") ||
                          t.type.toLowerCase().includes("receipt") ||
                          t.type.toLowerCase().includes("add") ||
                          (!isTransfer && t.received > 0);
                        return (
                          <tr key={t.id} className="hover:bg-[#F8FAFC] transition-colors">
                            <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap font-normal">
                              {formatDisplayDate(t.date)}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                                  isTransfer
                                    ? "bg-teal-50 text-teal-700"
                                    : isPaymentIn
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-rose-50 text-rose-700"
                                }`}
                              >
                                {t.type}
                              </span>
                            </td>
                            <td className="py-2.5 px-2.5 font-mono text-slate-700 whitespace-nowrap">
                              {t.txnNo}
                            </td>
                            <td className="py-2.5 px-3 text-slate-800 font-normal">
                              <div className="font-medium text-slate-900">{t.partyName}</div>
                              {t.narration && t.narration !== t.partyName && (
                                <div className="text-[11px] text-slate-400 truncate max-w-[240px]">
                                  {t.narration}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-2.5 text-slate-500 whitespace-nowrap">
                              {t.mode}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-rose-600 whitespace-nowrap">
                              {t.paid > 0
                                ? `₹${t.paid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                                : "-"}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-700 whitespace-nowrap font-medium">
                              {t.received > 0
                                ? `₹${t.received.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                                : "-"}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-900 whitespace-nowrap font-medium">
                              ₹{t.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    {/* Table Total Summary Footer */}
                    <tfoot>
                      <tr className="bg-[#F8FAFC] border-t-2 border-[#CBD5E1] font-bold text-slate-900 text-xs">
                        <td colSpan={5} className="py-2.5 px-3 text-right uppercase text-[11px] tracking-wide text-slate-600">
                          Total:
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-600 whitespace-nowrap">
                          ₹{totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-700 whitespace-nowrap">
                          ₹{totalReceived.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                          -
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Bottom Pagination Strip */}
            {filteredTransactions.length > 0 && (
              <div className="p-2.5 sm:p-3 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-600 bg-white">
                <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] sm:text-xs text-slate-500">Rows:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="border border-[#CBD5E1] rounded px-1.5 py-0.5 bg-white text-[11px] sm:text-xs text-slate-800"
                    >
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                  <span className="text-[11px] sm:text-xs text-slate-500">
                    {Math.min((currentPage - 1) * pageSize + 1, filteredTransactions.length)}-{Math.min(currentPage * pageSize, filteredTransactions.length)} of {filteredTransactions.length}
                  </span>
                </div>

                <div className="flex items-center justify-center w-full sm:w-auto gap-1">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 text-xs border border-[#CBD5E1] rounded text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="px-2 py-1 text-xs text-slate-700 font-semibold">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 text-xs border border-[#CBD5E1] rounded text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= MODAL 1: Add Bank Account (Matching MyBillBook Screenshot Exactly) ================= */}
      <Modal
        isOpen={isAddBankModalOpen}
        onClose={() => setIsAddBankModalOpen(false)}
        title={lang === "gu" ? "બેંક ખાતું ઉમેરો" : "Add Bank Account"}
      >
        <form onSubmit={handleAddBankSubmit} className="space-y-4 pt-1">
          {bankError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              {bankError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Account Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="ex: Personal Account"
              value={bankForm.accountName}
              onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5850EC] bg-white text-slate-900 placeholder-slate-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Opening Balance</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-slate-500 font-medium">₹</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="ex: 10,000"
                  value={bankForm.openingBalance}
                  onChange={(e) => setBankForm({ ...bankForm, openingBalance: e.target.value })}
                  className="w-full pl-7 pr-3 py-2 text-xs border border-slate-300 rounded-md font-mono focus:outline-none focus:ring-1 focus:ring-[#5850EC] bg-white text-slate-900 placeholder-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">As of Date</label>
              <input
                type="date"
                value={bankForm.asOfDate}
                onChange={(e) => setBankForm({ ...bankForm, asOfDate: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5850EC] bg-white text-slate-900"
              />
            </div>
          </div>

          {/* Toggle Switch: Add Bank Details */}
          <div className="flex items-center justify-between py-2 border-t border-b border-slate-100">
            <span className="text-xs font-medium text-slate-800">Add Bank Details</span>
            <button
              type="button"
              onClick={() => setIsBankDetailsToggled(!isBankDetailsToggled)}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                isBankDetailsToggled ? "bg-[#5850EC]" : "bg-slate-300"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  isBankDetailsToggled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Collapsible Bank Details Section */}
          {isBankDetailsToggled && (
            <div className="space-y-3 pt-1 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Bank Account Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={isBankDetailsToggled}
                    placeholder="ex: 123456789157950"
                    value={bankForm.accountNumber}
                    onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md font-mono focus:outline-none focus:ring-1 focus:ring-[#5850EC] bg-white text-slate-900 placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Re-Enter Bank Account Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={isBankDetailsToggled}
                    placeholder="ex: 123456789157950"
                    value={bankForm.reAccountNumber}
                    onChange={(e) => setBankForm({ ...bankForm, reAccountNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md font-mono focus:outline-none focus:ring-1 focus:ring-[#5850EC] bg-white text-slate-900 placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Account Holders Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={isBankDetailsToggled}
                    placeholder="ex: Elisa wolf"
                    value={bankForm.accountHolderName}
                    onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5850EC] bg-white text-slate-900 placeholder-slate-400"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-700">
                      IFSC Code <span className="text-rose-500">*</span>
                    </label>
                    {ifscLoading && (
                      <span className="text-[10px] text-[#5850EC] font-medium flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#5850EC] animate-ping" />
                        Fetching Bank...
                      </span>
                    )}
                    {ifscVerified && !ifscLoading && (
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                        ✓ Verified
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required={isBankDetailsToggled}
                    placeholder="ex: HDFC000075"
                    value={bankForm.ifscCode}
                    onChange={(e) => handleIfscLookup(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md font-mono uppercase focus:outline-none focus:ring-1 focus:ring-[#5850EC] bg-white text-slate-900 placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Bank Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      required={isBankDetailsToggled}
                      placeholder="ex: HDFC"
                      value={bankForm.bankName}
                      onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5850EC] bg-white text-slate-900 placeholder-slate-400"
                    />
                    <div className="absolute left-2.5 top-2">
                      <BankLogo bankNameOrIfsc={bankForm.ifscCode || bankForm.bankName} className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Branch Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={isBankDetailsToggled}
                    placeholder="ex: Old Madras"
                    value={bankForm.branchName}
                    onChange={(e) => setBankForm({ ...bankForm, branchName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5850EC] bg-white text-slate-900 placeholder-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">UPI ID</label>
                <input
                  type="text"
                  placeholder="ex: elisa@okhdfc"
                  value={bankForm.upiId}
                  onChange={(e) => setBankForm({ ...bankForm, upiId: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5850EC] bg-white text-slate-900 placeholder-slate-400"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddBankModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer border border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingBank}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#5850EC] hover:bg-[#123B35] active:bg-[#0F322C] rounded-md shadow-xs cursor-pointer transition-colors disabled:opacity-50"
            >
              {isSubmittingBank ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL 2: Adjust Balance (+ Add/Reduce Money - Matching MyBillBook) ================= */}
      <Modal
        isOpen={isAddReduceModalOpen}
        onClose={() => setIsAddReduceModalOpen(false)}
        title="Adjust Balance"
      >
        <form onSubmit={handleAddReduceSubmit} className="space-y-4 pt-1">
          {addReduceError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              {addReduceError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Adjust money in</label>
            <select
              value={addReduceForm.accountId}
              onChange={(e) => setAddReduceForm({ ...addReduceForm, accountId: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5850EC] bg-white text-slate-900"
            >
              <option value="cash_in_hand">Cash</option>
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Add or Reduce</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAddReduceMode("ADD")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-full cursor-pointer transition-all ${
                  addReduceMode === "ADD"
                    ? "bg-[#EEF0FF] border border-[#5850EC] text-[#5850EC]"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent"
                }`}
              >
                + Add Money
              </button>
              <button
                type="button"
                onClick={() => setAddReduceMode("REDUCE")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-full cursor-pointer transition-all ${
                  addReduceMode === "REDUCE"
                    ? "bg-rose-50 border border-rose-500 text-rose-600"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent"
                }`}
              >
                - Reduce Money
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-center pt-1">
            <div>
              <span className="block text-[11px] text-slate-500">Current Balance</span>
              <span className="text-sm font-bold text-slate-900 font-mono">
                {formatINR(getAccountBalance(addReduceForm.accountId))}
              </span>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-0.5">Date</label>
              <input
                type="date"
                value={addReduceForm.date}
                onChange={(e) => setAddReduceForm({ ...addReduceForm, date: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5850EC] bg-white text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Enter Amount</label>
            <div className="relative">
              <span className={`absolute left-3 top-2.5 text-sm font-bold ${addReduceMode === "ADD" ? "text-emerald-600" : "text-rose-600"}`}>
                {addReduceMode === "ADD" ? "+ ₹" : "- ₹"}
              </span>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={addReduceForm.amount}
                onChange={(e) => setAddReduceForm({ ...addReduceForm, amount: e.target.value })}
                className="w-full pl-10 pr-3 py-2 text-sm font-bold font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5850EC] bg-white text-slate-900"
              />
            </div>
          </div>

          {/* Real-time Dynamic New Balance */}
          <div className="py-1">
            <span className="text-xs text-slate-500">New balance: </span>
            <span className="text-xs font-bold text-slate-900 font-mono">
              {formatINR(adjustedNewBalance)}
            </span>
          </div>

          {/* Add Remarks Toggle */}
          <div>
            {!showAddReduceRemarks ? (
              <button
                type="button"
                onClick={() => setShowAddReduceRemarks(true)}
                className="text-xs font-semibold text-[#5850EC] hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>+</span> Add Remarks
              </button>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Enter remarks or reason for adjustment"
                  value={addReduceForm.remarks}
                  onChange={(e) => setAddReduceForm({ ...addReduceForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5850EC] bg-white text-slate-900"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddReduceModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer border border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingAddReduce}
              className="px-6 py-2 text-xs font-semibold text-white bg-[#5850EC] hover:bg-[#123B35] active:bg-[#0F322C] rounded-md shadow-xs cursor-pointer transition-colors disabled:opacity-50"
            >
              {isSubmittingAddReduce ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL 3: Transfer Balance (Transfer Money - Matching MyBillBook) ================= */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Transfer Balance"
      >
        <form onSubmit={handleTransferSubmit} className="space-y-4 pt-1">
          {transferError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              {transferError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Transfer money from</label>
            <select
              value={transferForm.fromAccountId}
              onChange={(e) => setTransferForm({ ...transferForm, fromAccountId: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5850EC] bg-white text-slate-900"
            >
              <option value="cash_in_hand">Cash</option>
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Transfer money to</label>
            <select
              value={transferForm.toAccountId}
              onChange={(e) => setTransferForm({ ...transferForm, toAccountId: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5850EC] bg-white text-slate-900"
            >
              <option value="">Select account</option>
              <option value="cash_in_hand">Cash</option>
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 items-center pt-1">
            <div>
              <span className="block text-[11px] text-slate-500">Current Balance</span>
              <span className="text-sm font-bold text-slate-900 font-mono">
                {formatINR(getAccountBalance(transferForm.fromAccountId))}
              </span>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-0.5">Date</label>
              <input
                type="date"
                value={transferForm.date}
                onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5850EC] bg-white text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Enter Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-600">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={transferForm.amount}
                onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                className="w-full pl-8 pr-3 py-2 text-sm font-bold font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5850EC] bg-white text-slate-900"
              />
            </div>
          </div>

          {/* Add Remarks Toggle */}
          <div>
            {!showTransferRemarks ? (
              <button
                type="button"
                onClick={() => setShowTransferRemarks(true)}
                className="text-xs font-semibold text-[#5850EC] hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>+</span> Add Remarks
              </button>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Enter remarks, UTR, or Cheque number"
                  value={transferForm.remarks}
                  onChange={(e) => setTransferForm({ ...transferForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5850EC] bg-white text-slate-900"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer border border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingTransfer}
              className="px-6 py-2 text-xs font-semibold text-white bg-[#5850EC] hover:bg-[#123B35] active:bg-[#0F322C] rounded-md shadow-xs cursor-pointer transition-colors disabled:opacity-50"
            >
              {isSubmittingTransfer ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL 4: Update Bank Details ================= */}
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
                saveStoredBankMeta(tenantContext?.companyId, selectedAccount.id, {
                  bankAccountNo: updateBankForm.accountNumber.trim(),
                  bankIfsc: updateBankForm.ifscCode.trim().toUpperCase(),
                  bankBranch: updateBankForm.branchName.trim(),
                });
                await apiClient
                  .patch(`/ledgers/${selectedAccount.id}`, {
                    name: updateBankForm.bankName.trim(),
                    code: updateBankForm.accountNumber.trim() || undefined,
                  })
                  .catch(() => {});
              }
              await apiClient
                .patch(`/tenants/company`, {
                  bankName: updateBankForm.bankName.trim(),
                  bankAccountNo: updateBankForm.accountNumber.trim(),
                  bankIfsc: updateBankForm.ifscCode.trim().toUpperCase(),
                  bankBranch: updateBankForm.branchName.trim(),
                })
                .catch(() => {});

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
          className="space-y-4 pt-1"
        >
          {updateBankError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              {updateBankError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Account Display Name</label>
            <input
              type="text"
              required
              value={updateBankForm.bankName}
              onChange={(e) => setUpdateBankForm({ ...updateBankForm, bankName: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white text-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Account Number</label>
              <input
                type="text"
                value={updateBankForm.accountNumber}
                onChange={(e) => setUpdateBankForm({ ...updateBankForm, accountNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md font-mono bg-white text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">IFSC Code</label>
              <input
                type="text"
                value={updateBankForm.ifscCode}
                onChange={(e) => setUpdateBankForm({ ...updateBankForm, ifscCode: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md font-mono uppercase bg-white text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Branch Name</label>
            <input
              type="text"
              value={updateBankForm.branchName}
              onChange={(e) => setUpdateBankForm({ ...updateBankForm, branchName: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white text-slate-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsUpdateBankModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer border border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingUpdateBank}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#5850EC] hover:bg-[#123B35] rounded-md shadow-xs cursor-pointer transition-colors"
            >
              {isSubmittingUpdateBank ? "Updating..." : "Update Details"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL 5: Share Account Details (Matching MyBillBook) ================= */}
      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={lang === "gu" ? "બેંક ખાતાની વિગતો શેર કરો" : "Share Account Details"}
        maxWidth="md"
      >
        <div className="space-y-4 pt-1">
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden bg-white shadow-2xs">
            {/* Account Holder Name */}
            <div className="p-3.5">
              <span className="text-[11px] font-medium text-slate-500 block mb-1">
                {lang === "gu" ? "ખાતાધારકનું નામ" : "Account Holder Name"}
              </span>
              <span className="font-semibold text-slate-900 text-sm">
                {companyDetails?.tradeName || companyDetails?.legalName || "Audit Traders Ahmedabad"}
              </span>
            </div>

            {/* Account Number */}
            <div className="p-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[11px] font-medium text-slate-500 block mb-1">
                  {lang === "gu" ? "ખાતા નંબર" : "Account Number"}
                </span>
                <span className="font-semibold text-slate-900 text-sm font-mono tracking-wide">
                  {selectedAccount?.bankAccountNo || companyDetails?.bankAccountNo || selectedAccount?.code || "-"}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    selectedAccount?.bankAccountNo || companyDetails?.bankAccountNo || selectedAccount?.code || "",
                    "accountNumber"
                  )
                }
                className={`px-3 py-1 text-xs font-semibold rounded border transition-all cursor-pointer ${
                  copiedField === "accountNumber"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : "bg-white text-[#5850EC] border-slate-300 hover:bg-slate-50 hover:border-slate-400"
                }`}
              >
                {copiedField === "accountNumber" ? "COPIED!" : "COPY"}
              </button>
            </div>

            {/* IFSC Code */}
            <div className="p-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[11px] font-medium text-slate-500 block mb-1">
                  {lang === "gu" ? "IFSC કોડ" : "IFSC Code"}
                </span>
                <span className="font-semibold text-slate-900 text-sm font-mono uppercase">
                  {selectedAccount?.bankIfsc || companyDetails?.bankIfsc || "-"}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    selectedAccount?.bankIfsc || companyDetails?.bankIfsc || "",
                    "ifsc"
                  )
                }
                className={`px-3 py-1 text-xs font-semibold rounded border transition-all cursor-pointer ${
                  copiedField === "ifsc"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : "bg-white text-[#5850EC] border-slate-300 hover:bg-slate-50 hover:border-slate-400"
                }`}
              >
                {copiedField === "ifsc" ? "COPIED!" : "COPY"}
              </button>
            </div>

            {/* Bank & Branch */}
            <div className="p-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[11px] font-medium text-slate-500 block mb-1">
                  {lang === "gu" ? "બેંક અને શાખા" : "Bank & Branch"}
                </span>
                <span className="font-semibold text-slate-900 text-sm">
                  {selectedAccount?.bankBranch || companyDetails?.bankBranch || selectedAccount?.name || "-"}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    selectedAccount?.bankBranch || companyDetails?.bankBranch || selectedAccount?.name || "",
                    "branch"
                  )
                }
                className={`px-3 py-1 text-xs font-semibold rounded border transition-all cursor-pointer ${
                  copiedField === "branch"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : "bg-white text-[#5850EC] border-slate-300 hover:bg-slate-50 hover:border-slate-400"
                }`}
              >
                {copiedField === "branch" ? "COPIED!" : "COPY"}
              </button>
            </div>

            {/* UPI ID (if present) */}
            {(selectedAccount?.upiId || companyDetails?.upiVpa) && (
              <div className="p-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[11px] font-medium text-slate-500 block mb-1">
                    UPI ID
                  </span>
                  <span className="font-semibold text-slate-900 text-sm font-mono">
                    {selectedAccount?.upiId || companyDetails?.upiVpa}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      selectedAccount?.upiId || companyDetails?.upiVpa || "",
                      "upi"
                    )
                  }
                  className={`px-3 py-1 text-xs font-semibold rounded border transition-all cursor-pointer ${
                    copiedField === "upi"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : "bg-white text-[#5850EC] border-slate-300 hover:bg-slate-50 hover:border-slate-400"
                  }`}
                >
                  {copiedField === "upi" ? "COPIED!" : "COPY"}
                </button>
              </div>
            )}
          </div>

          {/* Quick share actions - Mobile Responsive */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-3 border-t border-slate-100 gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(getFullShareText());
                setToastMessage(lang === "gu" ? "તમામ વિગતો કોપી થઈ ગઈ!" : "All bank details copied to clipboard!");
                setTimeout(() => setToastMessage(null), 3000);
              }}
              className="w-full sm:w-auto px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>{lang === "gu" ? "બધું કોપી કરો" : "Copy All Details"}</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer border border-slate-300 transition-colors text-center"
              >
                {lang === "gu" ? "રદ કરો" : "Cancel"}
              </button>

              <button
                type="button"
                onClick={handleNativeShare}
                className="flex-1 sm:flex-initial px-5 py-2 text-xs font-semibold text-white bg-[#5850EC] hover:bg-[#123B35] rounded-md shadow-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5 text-center"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span>{lang === "gu" ? "વિગતો શેર કરો" : "Share Details"}</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
