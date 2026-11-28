"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  Suspense,
} from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../context/auth-context";
import { apiClient, extractList } from "../../../../lib/api-client";
import {
  AlertTriangle,
  Check,
  X,
  Info,
  Search,
  ChevronDown,
  Trash2,
  Plus,
  Landmark,
  Wallet,
  BookOpen,
} from "lucide-react";
import { CustomSelect, CustomCombobox, DropdownOption } from "@/components/ui/dropdown-system";
import { CustomDatePicker } from "@/components/ui/custom-datepicker";

export interface AccountOption {
  id: string;
  code?: string;
  name: string;
  nameGujarati?: string;
  currentBalance?: number | string;
  isBankLedger?: boolean;
  isCashLedger?: boolean;
  group?: { id: string; name: string; nature: string };
}

export interface VoucherLineState {
  id: string;
  accountId: string;
  debitAmount: string;
  creditAmount: string;
  lineNarration: string;
}

const VALID_VOUCHER_TYPES = ["JOURNAL", "RECEIPT", "PAYMENT", "CONTRA"] as const;
type ValidVoucherType = (typeof VALID_VOUCHER_TYPES)[number];

const TYPE_PREFIXES: Record<ValidVoucherType, string> = {
  JOURNAL: "JV-",
  RECEIPT: "RCP-",
  PAYMENT: "PMT-",
  CONTRA: "CTR-",
};

function toCents(val: string | number | undefined | null): number {
  if (val === undefined || val === null || val === "") return 0;
  const s = typeof val === "number" ? val.toString() : val;
  const num = parseFloat(s);
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.round(num * 100);
}

function formatCents(cents: number): string {
  const absVal = Math.abs(cents) / 100;
  return absVal.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function isCashOrBankAccount(acc?: AccountOption): boolean {
  if (!acc) return false;
  if (acc.isBankLedger || acc.isCashLedger) return true;
  const groupName = acc.group?.name?.toLowerCase() || "";
  return groupName.includes("bank") || groupName.includes("cash");
}

/**
 * High-performance, unclipped Searchable Account Combobox
 * Uses createPortal(..., document.body) to ensure it is never cut off by tables or containers
 */
function SearchableAccountSelect({
  accounts,
  selectedId,
  voucherType,
  lang,
  onSelect,
}: {
  accounts: AccountOption[];
  selectedId: string;
  voucherType: ValidVoucherType;
  lang: string;
  onSelect: (id: string) => void;
}) {
  const [selectedNature, setSelectedNature] = useState<string>(
    voucherType === "CONTRA" ? "CASH_BANK" : "ALL"
  );

  useEffect(() => {
    if (voucherType === "CONTRA") {
      setSelectedNature("CASH_BANK");
    }
  }, [voucherType]);

  const tabs = useMemo(() => {
    if (voucherType === "CONTRA") {
      return [{ id: "CASH_BANK", label: "Cash & Bank" }];
    }
    return [
      { id: "ALL", label: "All" },
      { id: "CASH_BANK", label: "Cash & Bank" },
      { id: "EXPENSE", label: "Expenses" },
      { id: "INCOME", label: "Income" },
      { id: "ASSET", label: "Assets" },
      { id: "LIABILITY", label: "Liabilities" },
    ];
  }, [voucherType]);

  const options: DropdownOption[] = useMemo(() => {
    return accounts.map((acc) => {
      let icon = <BookOpen className="w-3.5 h-3.5" />;
      if (acc.isBankLedger) {
        icon = <Landmark className="w-3.5 h-3.5 text-blue-600" />;
      } else if (acc.isCashLedger) {
        icon = <Wallet className="w-3.5 h-3.5 text-emerald-600" />;
      }

      return {
        value: acc.id,
        label: acc.name,
        code: acc.code,
        sublabel: acc.code ? `Code: ${acc.code}` : undefined,
        secondaryText: acc.group?.name,
        badge: acc.group?.name,
        group: acc.group?.nature || "General",
        icon,
        data: acc,
      };
    });
  }, [accounts]);

  const filterFn = useCallback(
    (opt: DropdownOption, q: string) => {
      const acc: AccountOption = opt.data;
      if (voucherType === "CONTRA" && !isCashOrBankAccount(acc)) {
        return false;
      }
      if (selectedNature === "CASH_BANK" && !isCashOrBankAccount(acc)) {
        return false;
      }
      if (
        selectedNature !== "ALL" &&
        selectedNature !== "CASH_BANK" &&
        acc.group?.nature !== selectedNature
      ) {
        return false;
      }
      if (!q) return true;
      const nameMatch = acc.name.toLowerCase().includes(q);
      const gujMatch = acc.nameGujarati?.toLowerCase().includes(q);
      const codeMatch = acc.code?.toLowerCase().includes(q);
      const groupMatch = acc.group?.name?.toLowerCase().includes(q);
      return Boolean(nameMatch || gujMatch || codeMatch || groupMatch);
    },
    [voucherType, selectedNature]
  );

  return (
    <CustomCombobox
      value={selectedId}
      onChange={(val: any) => onSelect(val || "")}
      options={options}
      tabs={tabs}
      selectedTab={selectedNature}
      onTabChange={setSelectedNature}
      filterFn={filterFn}
      placeholder={
        lang === "gu"
          ? "-- ખાતું પસંદ કરો --"
          : "-- Select Ledger Account --"
      }
      searchPlaceholder={
        voucherType === "CONTRA"
          ? lang === "gu"
            ? "રોકડ અથવા બેંક ખાતું શોધો..."
            : "Search Cash or Bank account..."
          : lang === "gu"
          ? "ખાતાનું નામ, કોડ અથવા ગ્રૂપ શોધો..."
          : "Search account name, code, group..."
      }
      emptyMessage={
        lang === "gu"
          ? "કોઈ ખાતું મળ્યું નથી."
          : "No matching accounts found"
      }
      minPanelWidth={440}
      triggerClassName="rounded-xl h-10 border-slate-300"
      renderOption={(opt, isSelected) => {
        const acc: AccountOption = opt.data;
        const isCash = acc.isCashLedger;
        const isBank = acc.isBankLedger;
        return (
          <div
            className={`w-full py-2 flex items-center justify-between transition-colors ${
              isSelected ? "text-[#1677E8] font-medium" : "text-slate-800"
            }`}
          >
            <div className="flex flex-col min-w-0 pr-2">
              <div className="flex items-center gap-2">
                {isBank ? (
                  <span className="p-1 rounded bg-blue-100 text-blue-700 shrink-0">
                    <Landmark className="w-3.5 h-3.5" />
                  </span>
                ) : isCash ? (
                  <span className="p-1 rounded bg-emerald-100 text-emerald-700 shrink-0">
                    <Wallet className="w-3.5 h-3.5" />
                  </span>
                ) : (
                  <span className="p-1 rounded bg-slate-100 text-slate-500 shrink-0">
                    <BookOpen className="w-3.5 h-3.5" />
                  </span>
                )}
                <span className="font-semibold text-[13px] text-slate-900 truncate">
                  {acc.name}
                </span>
                {acc.code && (
                  <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                    {acc.code}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1 ml-6 text-[11px] text-slate-500">
                {acc.group?.name && (
                  <span className="truncate max-w-[140px] font-medium text-slate-600">
                    {acc.group.name}
                  </span>
                )}
                {acc.group?.nature && (
                  <span
                    className={`ml-1 text-[9.5px] uppercase font-bold px-1.5 py-0.2 rounded ${
                      acc.group.nature === "ASSET"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : acc.group.nature === "LIABILITY"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : acc.group.nature === "EXPENSE"
                        ? "bg-purple-50 text-purple-700 border border-purple-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {acc.group.nature}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              {acc.currentBalance !== undefined && (
                <div className="font-mono font-medium text-[12px] text-slate-800">
                  ₹{Math.abs(Number(acc.currentBalance)).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                  <span
                    className={`ml-1 text-[10px] font-bold ${
                      Number(acc.currentBalance) >= 0
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }`}
                  >
                    {Number(acc.currentBalance) >= 0 ? "Dr" : "Cr"}
                  </span>
                </div>
              )}
              {isSelected && (
                <div className="flex items-center justify-end gap-1 mt-0.5 text-[#1677E8] text-[11px] font-semibold">
                  <Check className="w-3.5 h-3.5" />
                  <span>Selected</span>
                </div>
              )}
            </div>
          </div>
        );
      }}
    />
  );
}

function NewVoucherForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang, tenantContext } = useAuth();

  const paramType = searchParams.get("type")?.toUpperCase();
  const paramNarration = searchParams.get("narration") || "";
  const paramAccountName = searchParams.get("accountName") || "";

  const initialType: ValidVoucherType = VALID_VOUCHER_TYPES.includes(paramType as any)
    ? (paramType as ValidVoucherType)
    : "JOURNAL";

  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [voucherType, setVoucherType] = useState<ValidVoucherType>(initialType);
  const [voucherNumber, setVoucherNumber] = useState("");
  const [voucherDate, setVoucherDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [narration, setNarration] = useState(paramNarration);
  const [referenceNo, setReferenceNo] = useState("");

  // Journal Lines with stable keys
  const [lines, setLines] = useState<VoucherLineState[]>([
    {
      id: "line-init-1",
      accountId: "",
      debitAmount: "",
      creditAmount: "",
      lineNarration: "",
    },
    {
      id: "line-init-2",
      accountId: "",
      debitAmount: "",
      creditAmount: "",
      lineNarration: "",
    },
  ]);

  // Load Accounts from Authoritative Chart of Accounts
  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get(
        "/accounting/ledgers?limit=500&isActive=true",
      );
      const accList: AccountOption[] = extractList<AccountOption>(res);
      setAccounts(accList);

      let firstAccId = "";
      if (paramAccountName && accList.length > 0) {
        const exactMatch = accList.find(
          (a) =>
            a.name.toLowerCase() === paramAccountName.toLowerCase() ||
            a.code?.toLowerCase() === paramAccountName.toLowerCase(),
        );
        if (exactMatch) {
          firstAccId = exactMatch.id;
        } else {
          const prefixMatch = accList.find(
            (a) =>
              a.name.toLowerCase().startsWith(paramAccountName.toLowerCase()) ||
              (a.group?.name &&
                a.group.name
                  .toLowerCase()
                  .includes(paramAccountName.toLowerCase())),
          );
          if (prefixMatch) {
            firstAccId = prefixMatch.id;
          }
        }
      }

      setLines([
        {
          id: "line-init-1",
          accountId: firstAccId,
          debitAmount: "",
          creditAmount: "",
          lineNarration: "",
        },
        {
          id: "line-init-2",
          accountId: "",
          debitAmount: "",
          creditAmount: "",
          lineNarration: "",
        },
      ]);

      const prefix = TYPE_PREFIXES[initialType] || "VCH-";
      setVoucherNumber(`${prefix}${Date.now().toString().slice(-6)}`);
    } catch (err: any) {
      setError(err.message || "Failed to load ledger accounts.");
    } finally {
      setIsLoading(false);
    }
  }, [paramAccountName, initialType]);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchAccounts();
    }
  }, [tenantContext.companyId, fetchAccounts]);

  // Handle Voucher Type switch
  const handleVoucherTypeChange = (newType: ValidVoucherType) => {
    setVoucherType(newType);
    const prefix = TYPE_PREFIXES[newType] || "VCH-";
    setVoucherNumber((prev) => {
      const isAutoNumber = /^(JV-|RCP-|PMT-|CTR-|VCH-)\d+$/.test(prev);
      if (isAutoNumber || !prev) {
        return `${prefix}${Date.now().toString().slice(-6)}`;
      }
      return prev;
    });

    if (newType === "CONTRA") {
      setLines((prev) =>
        prev.map((line) => {
          const acc = accounts.find((a) => a.id === line.accountId);
          if (acc && !isCashOrBankAccount(acc)) {
            return { ...line, accountId: "" };
          }
          return line;
        }),
      );
    }
  };

  const handleAddLine = () => {
    const newId = `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setLines((prev) => [
      ...prev,
      {
        id: newId,
        accountId: "",
        debitAmount: "",
        creditAmount: "",
        lineNarration: "",
      },
    ]);
  };

  const handleRemoveLine = (rowId: string) => {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((l) => l.id !== rowId));
  };

  const handleSelectAccount = (rowId: string, accountId: string) => {
    setLines((prev) =>
      prev.map((line) => (line.id === rowId ? { ...line, accountId } : line)),
    );
  };

  const handleLineNarrationChange = (rowId: string, text: string) => {
    setLines((prev) =>
      prev.map((line) =>
        line.id === rowId ? { ...line, lineNarration: text } : line,
      ),
    );
  };

  const handleAmountChange = (
    rowId: string,
    side: "debit" | "credit",
    rawVal: string,
  ) => {
    let sanitized = rawVal.replace(/[^0-9.]/g, "");
    const dotIndex = sanitized.indexOf(".");
    if (dotIndex !== -1) {
      const before = sanitized.slice(0, dotIndex);
      const after = sanitized.slice(dotIndex + 1).replace(/\./g, "").slice(0, 2);
      sanitized = `${before}.${after}`;
    }

    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== rowId) return line;

        if (side === "debit") {
          return {
            ...line,
            debitAmount: sanitized,
            creditAmount: sanitized !== "" ? "" : line.creditAmount,
          };
        } else {
          return {
            ...line,
            creditAmount: sanitized,
            debitAmount: sanitized !== "" ? "" : line.debitAmount,
          };
        }
      }),
    );
  };

  const totalDebitCents = useMemo(
    () => lines.reduce((sum, l) => sum + toCents(l.debitAmount), 0),
    [lines],
  );

  const totalCreditCents = useMemo(
    () => lines.reduce((sum, l) => sum + toCents(l.creditAmount), 0),
    [lines],
  );

  const differenceCents = Math.abs(totalDebitCents - totalCreditCents);
  const isBalanced =
    totalDebitCents > 0 && totalCreditCents > 0 && differenceCents === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (lines.length < 2) {
      setError("Double-entry voucher requires at least two journal lines.");
      return;
    }

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.accountId || l.accountId.trim() === "") {
        setError(`Line ${i + 1}: Please select a ledger account.`);
        return;
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const dr = toCents(l.debitAmount);
      const cr = toCents(l.creditAmount);
      if (dr === 0 && cr === 0) {
        setError(
          `Line ${i + 1}: Please enter a positive Debit or Credit amount.`,
        );
        return;
      }
      if (dr > 0 && cr > 0) {
        setError(
          `Line ${i + 1}: A line cannot contain both Debit and Credit amounts.`,
        );
        return;
      }
    }

    const hasDebit = lines.some((l) => toCents(l.debitAmount) > 0);
    const hasCredit = lines.some((l) => toCents(l.creditAmount) > 0);
    if (!hasDebit || !hasCredit) {
      setError(
        "Voucher must contain at least one Debit line and one Credit line.",
      );
      return;
    }

    if (!isBalanced) {
      setError(
        `Double-entry rule violation: Total debits (₹${formatCents(
          totalDebitCents,
        )}) must equal total credits (₹${formatCents(
          totalCreditCents,
        )}). Difference: ₹${formatCents(differenceCents)}.`,
      );
      return;
    }

    if (voucherType === "CONTRA") {
      const hasCashOrBank = lines.some((l) => {
        const acc = accounts.find((a) => a.id === l.accountId);
        return isCashOrBankAccount(acc);
      });
      if (!hasCashOrBank) {
        setError(
          "Contra vouchers must involve at least one Cash or Bank account.",
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await apiClient.post(
        "/accounting/vouchers",
        {
          voucherType,
          voucherNumber: voucherNumber.trim(),
          voucherDate,
          narration: narration.trim() || undefined,
          referenceNo: referenceNo.trim() || undefined,
          lines: lines.map((l, i) => ({
            accountId: l.accountId,
            debitAmount: toCents(l.debitAmount) / 100,
            creditAmount: toCents(l.creditAmount) / 100,
            lineNarration: l.lineNarration.trim() || undefined,
            sequenceOrder: i + 1,
          })),
        },
        undefined,
        `voucher-${voucherType}-${voucherNumber.trim()}-${voucherDate}-${Date.now()}`,
      );

      router.push("/accounting/vouchers");
    } catch (err: any) {
      setError(
        lang === "gu" && err.messageGujarati
          ? err.messageGujarati
          : err.message || "Failed to post voucher.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/accounting/vouchers"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
            >
              <span>←</span>
              <span>{lang === "gu" ? "વાઉચરોની યાદી" : "Back to Vouchers"}</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {lang === "gu"
                ? "દ્વિનોંધી નામા વાઉચર લખો (New Double-Entry Voucher)"
                : "Record New Journal / Voucher"}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {lang === "gu"
              ? "ઉધાર અને જમા સરખા હોવા આવશ્યક છે (Total Debits == Total Credits)"
              : "Strict double-entry accounting invariants enforced on client and authoritative server"}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {voucherType === "CONTRA" && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 font-medium flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            {lang === "gu"
              ? "કોન્ટ્રા વાઉચર: ફક્ત રોકડ અને બેંક ખાતાઓ વચ્ચેના વ્યવહારો માટે."
              : "Contra Voucher: Restricted to internal transfers involving Cash and Bank accounts."}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Voucher Meta Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Voucher Type *
            </label>
            <CustomSelect
              value={voucherType}
              onChange={(val: any) =>
                handleVoucherTypeChange(val as ValidVoucherType)
              }
              options={[
                {
                  value: "JOURNAL",
                  label: lang === "gu" ? "જર્નલ નોંધ (JOURNAL)" : "Journal Voucher",
                  sublabel: "General adjusting entries",
                  icon: <BookOpen className="w-4 h-4 text-slate-500" />,
                },
                {
                  value: "RECEIPT",
                  label: lang === "gu" ? "પહોંચ / આવક (RECEIPT)" : "Receipt Voucher",
                  sublabel: "Cash or bank received",
                  icon: <Wallet className="w-4 h-4 text-emerald-600" />,
                },
                {
                  value: "PAYMENT",
                  label: lang === "gu" ? "ચૂકવણી (PAYMENT)" : "Payment Voucher",
                  sublabel: "Cash or bank paid",
                  icon: <Landmark className="w-4 h-4 text-amber-600" />,
                },
                {
                  value: "CONTRA",
                  label: lang === "gu" ? "બેંક ⇄ રોકડ (CONTRA)" : "Contra Voucher",
                  sublabel: "Bank deposit, withdrawal, transfer",
                  icon: <Landmark className="w-4 h-4 text-blue-600" />,
                },
              ]}
              triggerClassName="rounded-xl h-10 border-slate-300 font-semibold text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Voucher Number *
            </label>
            <input
              type="text"
              required
              value={voucherNumber}
              onChange={(e) => setVoucherNumber(e.target.value)}
              className="w-full font-mono text-xs font-semibold p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/15 h-10 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Voucher Date *
            </label>
            <CustomDatePicker
              value={voucherDate}
              onChange={(val) => setVoucherDate(val)}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Reference / Cheque No.
            </label>
            <input
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="CHQ-991202"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl tabular-nums text-slate-900 focus:bg-white focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/15 h-10 outline-none transition-all"
            />
          </div>
        </div>

        {/* Journal Lines Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {lang === "gu"
                  ? "નામા લાઈનો (Journal Lines)"
                  : "Journal Lines (Double-Entry Debit / Credit)"}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Each row records an account debit or credit
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddLine}
              className="text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100/80 px-3.5 py-1.5 rounded-xl border border-emerald-200 transition-colors font-semibold text-xs cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{lang === "gu" ? "+ લાઇન ઉમેરો" : "+ Add Row"}</span>
            </button>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th className="py-3 px-3 w-[380px] min-w-[320px]">
                    {lang === "gu" ? "ખાતું" : "Ledger Account *"}
                  </th>
                  <th className="py-3 px-3 min-w-[200px]">
                    {lang === "gu" ? "વિગત" : "Line Narration"}
                  </th>
                  <th className="py-3 px-3 w-44 text-right">
                    {lang === "gu" ? "ઉધાર રકમ (Dr ₹)" : "Debit (Dr ₹)"}
                  </th>
                  <th className="py-3 px-3 w-44 text-right">
                    {lang === "gu" ? "જમા રકમ (Cr ₹)" : "Credit (Cr ₹)"}
                  </th>
                  <th className="py-3 px-3 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((line, idx) => (
                  <tr
                    key={line.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3 px-3 text-center text-slate-400 font-semibold tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3">
                      <SearchableAccountSelect
                        accounts={accounts}
                        selectedId={line.accountId}
                        voucherType={voucherType}
                        lang={lang}
                        onSelect={(accId) =>
                          handleSelectAccount(line.id, accId)
                        }
                      />
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={line.lineNarration}
                        onChange={(e) =>
                          handleLineNarrationChange(line.id, e.target.value)
                        }
                        placeholder={
                          lang === "gu"
                            ? "શેરો / વિગત..."
                            : "Line narration (optional)..."
                        }
                        className="w-full text-[13px] px-3 py-2 bg-white border border-slate-200 rounded-xl h-10 focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/10 outline-none transition-all placeholder:text-slate-400 shadow-2xs"
                      />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-xs pointer-events-none">
                          ₹
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={line.debitAmount}
                          onChange={(e) =>
                            handleAmountChange(line.id, "debit", e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.preventDefault();
                          }}
                          placeholder="0.00"
                          className="w-full text-[13px] pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-right tabular-nums font-mono font-semibold text-slate-900 focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/15 outline-none h-10 transition-all shadow-2xs placeholder:text-slate-300"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-xs pointer-events-none">
                          ₹
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={line.creditAmount}
                          onChange={(e) =>
                            handleAmountChange(line.id, "credit", e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.preventDefault();
                          }}
                          placeholder="0.00"
                          className="w-full text-[13px] pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-right tabular-nums font-mono font-semibold text-slate-900 focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/15 outline-none h-10 transition-all shadow-2xs placeholder:text-slate-300"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {lines.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(line.id)}
                          className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-all mx-auto cursor-pointer"
                          title="Remove row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Footer Totals */}
              <tfoot>
                <tr className="bg-slate-50/90 tabular-nums border-t border-slate-200">
                  <td
                    colSpan={3}
                    className="py-3.5 px-4 text-right uppercase text-slate-600 font-bold text-xs tracking-wider"
                  >
                    {lang === "gu" ? "કુલ સરવાળો (TOTALS):" : "TOTALS:"}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <span className="font-mono font-bold text-[14px] text-slate-900">
                      ₹{formatCents(totalDebitCents)}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <span className="font-mono font-bold text-[14px] text-slate-900">
                      ₹{formatCents(totalCreditCents)}
                    </span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Balance Status Banner */}
          {(() => {
            const hasAmounts = totalDebitCents > 0 || totalCreditCents > 0;
            if (isBalanced) {
              return (
                <div className="px-5 py-3.5 border-t flex items-center justify-between text-xs font-semibold bg-emerald-50 text-emerald-900 border-emerald-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-200/80 flex items-center justify-center text-emerald-800">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                    <span>
                      {lang === "gu"
                        ? "વાઉચર સંપૂર્ણ સંતુલિત છે (કુલ ઉધાર == કુલ જમા)"
                        : "Voucher is fully balanced (Total Debits == Total Credits)"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700 uppercase tracking-wider text-[11px] font-bold">
                      {lang === "gu" ? "તફાવત:" : "Difference:"}
                    </span>
                    <span className="tabular-nums font-mono font-bold text-sm bg-white px-2.5 py-0.5 rounded-lg border border-emerald-300 text-emerald-800 shadow-2xs">
                      ₹0.00
                    </span>
                  </div>
                </div>
              );
            }
            if (hasAmounts && differenceCents > 0) {
              return (
                <div className="px-5 py-3.5 border-t flex items-center justify-between text-xs font-semibold bg-amber-50 text-amber-900 border-amber-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-amber-200/80 flex items-center justify-center text-amber-800">
                      <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                    <span>
                      {lang === "gu"
                        ? `રૂ. ${formatCents(
                            differenceCents,
                          )} નો તફાવત છે. કૃપા કરીને ઉધાર અને જમા સરખા કરો.`
                        : `Out of balance by ₹${formatCents(
                            differenceCents,
                          )}. Adjust lines before posting.`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-700 uppercase tracking-wider text-[11px] font-bold">
                      {lang === "gu" ? "તફાવત:" : "Difference:"}
                    </span>
                    <span className="tabular-nums font-mono font-bold text-sm bg-white px-2.5 py-0.5 rounded-lg border border-amber-300 text-amber-800 shadow-2xs">
                      ₹{formatCents(differenceCents)}
                    </span>
                  </div>
                </div>
              );
            }
            return (
              <div className="px-5 py-3.5 border-t flex items-center justify-between text-xs font-medium bg-slate-50 text-slate-600 border-slate-200">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    {lang === "gu"
                      ? "કૃપા કરીને દરેક લાઇન માટે ઉધાર અથવા જમા રકમ દાખલ કરો (કુલ ઉધાર અને જમા સરખા હોવા જોઈએ)."
                      : "Enter debit and credit amounts for each line (must be > ₹0 and balanced)."}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 uppercase tracking-wider text-[11px] font-bold">
                    {lang === "gu" ? "તફાવત:" : "Difference:"}
                  </span>
                  <span className="tabular-nums font-mono font-medium text-slate-500">
                    ₹0.00
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Global Narration */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
            {lang === "gu"
              ? "શેરો / વિગત (General Narration)"
              : "General Narration"}
          </label>
          <textarea
            rows={2}
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            placeholder={
              lang === "gu"
                ? "વાઉચરની સામાન્ય વિગત અહીં લખો..."
                : "Being payment received towards sales invoice or general journal adjustment..."
            }
            className="w-full text-[13px] p-3 bg-white border border-slate-200 rounded-xl focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/10 outline-none transition-all placeholder:text-slate-400 shadow-2xs"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/accounting/vouchers"
            className="h-10 px-5 text-[13px] font-semibold text-slate-600 hover:bg-slate-200/70 bg-slate-100 rounded-xl transition-all flex items-center justify-center cursor-pointer"
          >
            {lang === "gu" ? "રદ કરો (Cancel)" : "Cancel"}
          </Link>
          <button
            type="submit"
            disabled={!isBalanced || isSubmitting}
            className={`px-6 py-2.5 text-[13px] font-semibold rounded-xl transition-all flex items-center gap-2 ${
              isBalanced && !isSubmitting
                ? "bg-[#1677E8] text-white hover:bg-blue-600 active:bg-blue-700 shadow-sm cursor-pointer"
                : "bg-slate-200 text-slate-400 cursor-not-allowed opacity-75 shadow-none"
            }`}
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : null}
            <span>
              {isSubmitting
                ? lang === "gu"
                  ? "વાઉચર નોંધાઈ રહ્યું છે..."
                  : "Posting Voucher..."
                : lang === "gu"
                  ? "વાઉચર નોંધો (Post Voucher)"
                  : "Post Double-Entry Voucher"}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewVoucherPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400 text-sm">
          Loading voucher form...
        </div>
      }
    >
      <NewVoucherForm />
    </Suspense>
  );
}
