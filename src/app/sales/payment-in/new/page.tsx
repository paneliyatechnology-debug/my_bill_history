"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../../context/auth-context";
import { apiClient, extractList } from "../../../../lib/api-client";

interface PartyOption {
  id: string;
  name: string;
  phone?: string;
  type?: string;
  balance?: number;
}

interface LedgerOption {
  id: string;
  name: string;
  isCashLedger?: boolean;
  isBankLedger?: boolean;
}

interface PendingInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  grandTotal: number;
  balanceAmount: number;
  settle: string;
  discount: string;
  isDiscountOpen?: boolean;
}

const PAYMENT_MODES = [
  { value: "CASH", label: "Cash" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "UPI", label: "UPI" },
];

function formatInr(val: number | string): string {
  const num = Number(val) || 0;
  return (
    "₹ " +
    num.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  );
}

function formatPaymentDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function invoiceBalance(inv: any): number {
  if (inv.balanceAmount !== undefined && inv.balanceAmount !== null) {
    return Number(inv.balanceAmount) || 0;
  }
  if (inv.outstandingBalance !== undefined) return Number(inv.outstandingBalance) || 0;
  return Math.max(0, Number(inv.grandTotal || 0) - Number(inv.paidAmount || 0));
}

export default function CreatePaymentInPage() {
  const router = useRouter();
  const { lang, tenantContext } = useAuth();

  // Reference data
  const [parties, setParties] = useState<PartyOption[]>([]);
  const [ledgers, setLedgers] = useState<LedgerOption[]>([]);

  // Form State
  const [partyId, setPartyId] = useState("");
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const [partySearchQuery, setPartySearchQuery] = useState("");
  const partyDropdownRef = useRef<HTMLDivElement>(null);
  const partySearchInputRef = useRef<HTMLInputElement>(null);

  const [paymentNumber, setPaymentNumber] = useState("3");
  const [voucherDate, setVoucherDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [depositToAccountId, setDepositToAccountId] = useState("");
  const [amountReceived, setAmountReceived] = useState("");
  const [paymentInDiscount, setPaymentInDiscount] = useState("");
  const [notes, setNotes] = useState("");

  // Invoices & Allocations
  const [invoices, setInvoices] = useState<PendingInvoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const [isInvoiceSearchOpen, setIsInvoiceSearchOpen] = useState(false);

  // Operation states
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create Party Modal
  const [isCreatePartyModalOpen, setIsCreatePartyModalOpen] = useState(false);
  const [partyFormData, setPartyFormData] = useState({
    name: "",
    phone: "",
    gstin: "",
    billingLine1: "",
  });
  const [isCreatingParty, setIsCreatingParty] = useState(false);

  // Initial load
  useEffect(() => {
    if (!tenantContext.companyId) return;
    let cancelled = false;
    (async () => {
      try {
        const [partyRes, ledgerRes, receiptRes]: any = await Promise.all([
          apiClient.get("/parties", { limit: 200 }),
          apiClient.get("/ledgers", { limit: 200 }),
          apiClient.get("/vouchers/receipts", { limit: 1 }),
        ]);
        if (cancelled) return;

        const partyList = extractList<PartyOption>(partyRes).filter(
          (party) => !party.type || party.type === "CUSTOMER" || party.type === "BOTH",
        );
        setParties(partyList);

        const accounts = extractList<LedgerOption>(ledgerRes).filter(
          (ledger) =>
            ledger.isCashLedger ||
            ledger.isBankLedger ||
            /cash|bank/i.test(ledger.name || ""),
        );
        setLedgers(accounts);

        const cash = accounts.find((ledger) => ledger.isCashLedger) || accounts[0];
        if (cash) setDepositToAccountId(cash.id);

        if (receiptRes?.nextNumber) {
          setPaymentNumber(String(receiptRes.nextNumber));
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to load payment form data.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantContext.companyId]);

  // Click outside to close party dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(event.target as Node)) {
        setIsPartyDropdownOpen(false);
      }
    }
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const amountReceivedRef = useRef(amountReceived);
  useEffect(() => {
    amountReceivedRef.current = amountReceived;
  }, [amountReceived]);

  // Fetch pending invoices when party changes
  useEffect(() => {
    if (!partyId) {
      setInvoices([]);
      return;
    }
    let cancelled = false;
    setIsLoadingInvoices(true);
    (async () => {
      try {
        const res: any = await apiClient.get("/invoices/sales", {
          partyId,
          limit: 100,
        });
        if (cancelled) return;
        const pending: PendingInvoice[] = extractList<any>(res)
          .filter((inv) => {
            const status = inv.status;
            const balance = invoiceBalance(inv);
            return (
              balance > 0.009 &&
              (status === "ISSUED" || status === "PARTIALLY_PAID" || status === "OVERDUE")
            );
          })
          .sort(
            (a, b) =>
              new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime(),
          )
          .map((inv) => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            invoiceDate: inv.invoiceDate,
            dueDate: inv.dueDate || inv.invoiceDate,
            grandTotal: Number(inv.grandTotal) || 0,
            balanceAmount: invoiceBalance(inv),
            settle: "",
            discount: "",
            isDiscountOpen: false,
          }));

        // Apply FIFO settlement if amount received is already typed
        const rec = Number(amountReceivedRef.current) || 0;
        if (rec > 0) {
          let left = rec;
          pending.forEach((inv) => {
            const take = Math.min(inv.balanceAmount, Math.max(0, left));
            left -= take;
            if (take > 0) inv.settle = take.toString();
          });
        }

        setInvoices(pending);
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to load pending invoices.");
      } finally {
        if (!cancelled) setIsLoadingInvoices(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [partyId]);

  // Appropriate deposit account handling based on Cash vs Bank
  const depositAccounts = useMemo(() => {
    if (paymentMode === "CASH") {
      const cash = ledgers.filter((ledger) => ledger.isCashLedger || /cash/i.test(ledger.name));
      return cash.length > 0 ? cash : ledgers;
    }
    const banks = ledgers.filter((ledger) => ledger.isBankLedger || /bank/i.test(ledger.name));
    return banks.length > 0 ? banks : ledgers;
  }, [ledgers, paymentMode]);

  useEffect(() => {
    if (depositAccounts.length === 0) return;
    if (!depositAccounts.some((account) => account.id === depositToAccountId)) {
      setDepositToAccountId(depositAccounts[0].id);
    }
  }, [depositAccounts, depositToAccountId]);

  // Selected party details
  const selectedParty = useMemo(() => {
    return parties.find((p) => p.id === partyId) || null;
  }, [parties, partyId]);

  // Filtered party list for combobox
  const filteredParties = useMemo(() => {
    const q = partySearchQuery.trim().toLowerCase();
    if (!q) return parties;
    return parties.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.phone && p.phone.includes(q)),
    );
  }, [parties, partySearchQuery]);

  // FIFO auto-allocation when user changes Amount Received in Card 1
  function handleAmountReceivedChange(value: string) {
    setAmountReceived(value);
    const rec = Number(value) || 0;

    let left = rec;
    setInvoices((current) =>
      current.map((inv) => {
        const take = Math.min(inv.balanceAmount, Math.max(0, left));
        left -= take;
        return {
          ...inv,
          settle: take > 0 ? take.toString() : "",
        };
      }),
    );
  }

  // Row settlement update
  function updateInvoiceSettle(id: string, value: string) {
    setInvoices((current) => {
      const updated = current.map((inv) => (inv.id === id ? { ...inv, settle: value } : inv));
      const newTotal = updated.reduce((sum, item) => sum + (Number(item.settle) || 0), 0);
      setAmountReceived(newTotal > 0 ? newTotal.toString() : "");
      return updated;
    });
  }

  function updateInvoiceDiscount(id: string, value: string) {
    setInvoices((current) =>
      current.map((inv) => (inv.id === id ? { ...inv, discount: value } : inv)),
    );
  }

  function toggleInvoiceDiscount(id: string) {
    setInvoices((current) =>
      current.map((inv) =>
        inv.id === id ? { ...inv, isDiscountOpen: !inv.isDiscountOpen } : inv,
      ),
    );
  }

  // Row checkbox toggle
  function toggleInvoiceRow(inv: PendingInvoice) {
    const currentSettle = Number(inv.settle) || 0;
    if (currentSettle > 0) {
      // Uncheck & clear
      setInvoices((current) => {
        const updated = current.map((item) => (item.id === inv.id ? { ...item, settle: "" } : item));
        const newTotal = updated.reduce((sum, item) => sum + (Number(item.settle) || 0), 0);
        setAmountReceived(newTotal > 0 ? newTotal.toString() : "");
        return updated;
      });
      return;
    }

    // Check & fill
    const rec = Number(amountReceived) || 0;
    const usedByOthers = invoices.reduce(
      (sum, row) => sum + (row.id === inv.id ? 0 : Number(row.settle) || 0),
      0,
    );
    const room = Math.max(0, rec - usedByOthers);
    const take = rec > 0 && room > 0 ? Math.min(inv.balanceAmount, room) : inv.balanceAmount;

    setInvoices((current) => {
      const updated = current.map((item) => (item.id === inv.id ? { ...item, settle: take.toString() } : item));
      const newTotal = updated.reduce((sum, item) => sum + (Number(item.settle) || 0), 0);
      setAmountReceived(newTotal.toString());
      return updated;
    });
  }

  // Select / Deselect all
  const areAllSelected = useMemo(() => {
    return invoices.length > 0 && invoices.every((inv) => (Number(inv.settle) || 0) > 0);
  }, [invoices]);

  const selectedCount = useMemo(() => {
    return invoices.filter((inv) => (Number(inv.settle) || 0) > 0).length;
  }, [invoices]);

  function toggleAllInvoices() {
    if (areAllSelected) {
      // Deselect all
      setInvoices((curr) => curr.map((inv) => ({ ...inv, settle: "" })));
    } else {
      // Select all: allocate FIFO based on received amount, or full balance
      const rec = Number(amountReceived) || 0;
      let left = rec > 0 ? rec : Infinity;
      let totalAllocated = 0;

      setInvoices((curr) =>
        curr.map((inv) => {
          const take = Math.min(inv.balanceAmount, left);
          if (left !== Infinity) left -= take;
          totalAllocated += take;
          return {
            ...inv,
            settle: take > 0 ? take.toString() : inv.balanceAmount.toString(),
          };
        }),
      );

      if (rec <= 0) {
        const fullSum = invoices.reduce((s, i) => s + i.balanceAmount, 0);
        setAmountReceived(fullSum.toString());
      }
    }
  }

  function clearAllSelections() {
    setInvoices((curr) => curr.map((inv) => ({ ...inv, settle: "" })));
  }

  // Totals
  const totalInvoiceAmount = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  }, [invoices]);

  const totalDiscount = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + (Number(inv.discount) || 0), 0);
  }, [invoices]);

  const totalSettled = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + (Number(inv.settle) || 0), 0);
  }, [invoices]);

  const displayedInvoices = useMemo(() => {
    if (!invoiceSearchQuery.trim()) return invoices;
    const q = invoiceSearchQuery.toLowerCase().trim();
    return invoices.filter((inv) => inv.invoiceNumber.toLowerCase().includes(q));
  }, [invoices, invoiceSearchQuery]);

  // Create party modal submit
  async function handleCreateCustomerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!partyFormData.name.trim()) return;

    setIsCreatingParty(true);
    try {
      const res: any = await apiClient.post("/parties", {
        name: partyFormData.name.trim(),
        phone: partyFormData.phone.trim() || undefined,
        gstin: partyFormData.gstin.trim() || undefined,
        type: "CUSTOMER",
        billingAddress: partyFormData.billingLine1.trim()
          ? { line1: partyFormData.billingLine1.trim() }
          : undefined,
      });

      const newParty = {
        id: res.id,
        name: res.name,
        phone: res.phone,
        type: res.type,
        balance: 0,
      };

      setParties((prev) => [newParty, ...prev]);
      setPartyId(newParty.id);
      setIsCreatePartyModalOpen(false);
      setIsPartyDropdownOpen(false);
      setPartyFormData({ name: "", phone: "", gstin: "", billingLine1: "" });
    } catch (err: any) {
      alert(err.message || "Failed to create party.");
    } finally {
      setIsCreatingParty(false);
    }
  }

  // Save payment
  async function savePayment() {
    setError(null);
    if (!partyId) {
      setError(lang === "gu" ? "પાર્ટી પસંદ કરો." : "Please select a party.");
      return;
    }
    const rec = Number(amountReceived) || 0;
    if (rec <= 0) {
      setError(lang === "gu" ? "મળેલી રકમ દાખલ કરો." : "Please enter the amount received.");
      return;
    }

    // Validate allocations
    for (const inv of invoices) {
      const settle = Number(inv.settle) || 0;
      if (settle < 0) {
        setError("Settlement amount cannot be negative.");
        return;
      }
      if (settle - inv.balanceAmount > 0.009) {
        setError(`Settlement for invoice #${inv.invoiceNumber} exceeds the pending balance.`);
        return;
      }
    }

    if (totalSettled - rec > 0.009) {
      setError("Total settled amount cannot exceed the amount received.");
      return;
    }

    const allocations = invoices
      .filter((inv) => (Number(inv.settle) || 0) > 0)
      .map((inv) => ({
        invoiceId: inv.id,
        settledAmount: Number(inv.settle),
        cashDiscountGiven: Number(inv.discount) || 0,
      }));

    setIsSaving(true);
    try {
      await apiClient.post("/vouchers/receipt", {
        partyId,
        voucherDate,
        depositToAccountId: depositToAccountId || undefined,
        receivedAmount: rec,
        paymentMode,
        narration: notes || undefined,
        allocations,
      });
      router.push("/sales/payment-in");
    } catch (err: any) {
      setError(err.message || "Failed to record payment in.");
    } finally {
      setIsSaving(false);
    }
  }

  const isSaveEnabled = partyId && (Number(amountReceived) || 0) > 0 && !isSaving;

  return (
    <div className="min-w-0 max-w-[1600px] mx-auto px-6 py-4 space-y-4 pb-20 font-sans">
      {/* 1. Header Bar: ← Record Payment In #... | Settings | Cancel | Save */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <Link
            href="/sales/payment-in"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            {lang === "gu" ? "આવક ચૂકવણી રેકોર્ડ કરો" : "Record Payment In"} #{paymentNumber}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Keyboard shortcut icon */}
          <button
            type="button"
            title="Keyboard shortcuts"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <line x1="6" y1="8" x2="6" y2="8" />
              <line x1="10" y1="8" x2="10" y2="8" />
              <line x1="14" y1="8" x2="14" y2="8" />
              <line x1="18" y1="8" x2="18" y2="8" />
              <line x1="7" y1="12" x2="17" y2="12" />
              <line x1="7" y1="16" x2="17" y2="16" />
            </svg>
          </button>

          {/* Settings button */}
          <button
            type="button"
            onClick={() => router.push("/settings")}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Settings</span>
          </button>

          {/* Cancel */}
          <Link
            href="/sales/payment-in"
            className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            Cancel
          </Link>

          {/* Save button */}
          <button
            type="button"
            disabled={!isSaveEnabled}
            onClick={savePayment}
            className={`rounded-lg px-6 py-1.5 text-xs font-semibold shadow-xs transition-colors ${
              isSaveEnabled
                ? "bg-[#4F46E5] text-white hover:bg-[#4338CA] cursor-pointer"
                : "bg-[#4F46E5]/40 text-white/80 cursor-not-allowed"
            }`}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">✕</button>
        </div>
      )}

      {/* 2. Top Two Cards: Party & Amount (Left) + Date, Mode, Number & Notes (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CARD 1: Left */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3.5">
          {/* Party Name Searchable Dropdown */}
          <div className="relative" ref={partyDropdownRef}>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Party Name <span className="text-rose-500">*</span>
            </label>

            {selectedParty ? (
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs">
                <span className="font-semibold text-slate-900">{selectedParty.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setPartyId("");
                    setPartySearchQuery("");
                  }}
                  className="text-slate-400 hover:text-slate-600 font-bold px-1"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div
                onClick={() => {
                  setIsPartyDropdownOpen(true);
                  setTimeout(() => partySearchInputRef.current?.focus(), 50);
                }}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-400 cursor-pointer hover:border-slate-300 transition-colors"
              >
                <span>Search party by name or number</span>
                <svg className="w-4 h-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            )}

            {selectedParty && (
              <p className="text-[11px] text-slate-500 mt-1">
                Current Balance:{" "}
                <span className="font-medium text-slate-700">{formatInr(selectedParty.balance || 0)}</span>
              </p>
            )}

            {/* Custom Dropdown Modal */}
            {isPartyDropdownOpen && (
              <div
                className="absolute left-0 right-0 z-40 mt-1 rounded-xl border border-slate-200 bg-white shadow-xl py-1 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-2 border-b border-slate-100 flex items-center gap-2">
                  <span className="text-slate-400">🔍</span>
                  <input
                    ref={partySearchInputRef}
                    type="text"
                    value={partySearchQuery}
                    onChange={(e) => setPartySearchQuery(e.target.value)}
                    placeholder="Search party by name or number"
                    className="w-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                  />
                </div>

                <div className="p-2 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPartyDropdownOpen(false);
                      setIsCreatePartyModalOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg bg-indigo-50/70 px-3 py-2 text-xs font-semibold text-[#4F46E5] hover:bg-indigo-100/70 transition-colors"
                  >
                    <span>+</span>
                    <span>Create New Party</span>
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                  {filteredParties.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No parties found matching &quot;{partySearchQuery}&quot;
                    </div>
                  ) : (
                    filteredParties.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setPartyId(p.id);
                          setIsPartyDropdownOpen(false);
                        }}
                        className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{p.name}</p>
                          {p.phone && <p className="text-[10px] text-slate-400">{p.phone}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-slate-700">{formatInr(p.balance || 0)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Amount Received & Discount Inputs */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Amount Received <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amountReceived}
                  onChange={(e) => handleAmountReceivedChange(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                <span>Payment In Discount</span>
                <span title="Optional discount given on this payment" className="text-slate-400 hover:text-slate-600 cursor-help">ⓘ</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentInDiscount}
                  onChange={(e) => setPaymentInDiscount(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: Right */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3.5">
          {/* Row of 3 inputs: Date, Mode, Number */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Payment Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={voucherDate}
                  onChange={(e) => setVoucherDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none transition-colors"
              >
                {PAYMENT_MODES.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Payment In Number
              </label>
              <input
                type="text"
                value={paymentNumber}
                onChange={(e) => setPaymentNumber(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter Notes"
              rows={2}
              className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none transition-colors resize-none"
            />
          </div>
        </div>
      </div>

      {/* 3. Bottom Section: Settle Invoices With This Payment */}
      {!partyId ? (
        /* Empty State 1: No Party Selected (Exact illustration matching myBillBook screenshot) */
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-2xs">
          <div className="flex flex-col items-center justify-center">
            {/* Soft illustration SVG */}
            <div className="relative mb-3 flex items-center justify-center">
              <svg width="120" height="90" viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Calculator Background */}
                <rect x="15" y="15" width="40" height="60" rx="6" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="2" />
                <rect x="22" y="23" width="26" height="12" rx="2" fill="#E2E8F0" />
                <circle cx="26" cy="45" r="2.5" fill="#CBD5E1" />
                <circle cx="35" cy="45" r="2.5" fill="#CBD5E1" />
                <circle cx="44" cy="45" r="2.5" fill="#CBD5E1" />
                <circle cx="26" cy="55" r="2.5" fill="#CBD5E1" />
                <circle cx="35" cy="55" r="2.5" fill="#CBD5E1" />
                <circle cx="44" cy="55" r="2.5" fill="#CBD5E1" />
                <circle cx="26" cy="65" r="2.5" fill="#CBD5E1" />
                <circle cx="35" cy="65" r="2.5" fill="#CBD5E1" />
                <circle cx="44" cy="65" r="2.5" fill="#CBD5E1" />

                {/* Cash Notes at Right */}
                <rect x="68" y="35" width="42" height="24" rx="3" transform="rotate(15 68 35)" fill="#DCFCE7" stroke="#86EFAC" strokeWidth="1.5" />
                <rect x="62" y="42" width="42" height="24" rx="3" fill="#BBF7D0" stroke="#4ADE80" strokeWidth="1.5" />
                <circle cx="83" cy="54" r="5" fill="#86EFAC" />

                {/* Foreground Document */}
                <rect x="35" y="22" width="50" height="58" rx="4" fill="white" stroke="#CBD5E1" strokeWidth="2" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.05))" />
                <line x1="43" y1="32" x2="65" y2="32" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
                <line x1="43" y1="40" x2="77" y2="40" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
                {/* Rupee icon on document */}
                <text x="44" y="58" fill="#475569" fontSize="16" fontWeight="bold">₹</text>
                <line x1="58" y1="50" x2="77" y2="50" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
                <line x1="58" y1="56" x2="72" y2="56" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>

            <h3 className="text-sm font-bold text-slate-800">
              {lang === "gu" ? "કોઈ પાર્ટી પસંદ કરી નથી!" : "No party selected!"}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {lang === "gu"
                ? "ચુકવણી સેટલ કરવા માટે પાર્ટીનું નામ પસંદ કરો"
                : "Select Party Name to view transactions"}
            </p>
            <button
              type="button"
              onClick={() => {
                setIsPartyDropdownOpen(true);
                setTimeout(() => partySearchInputRef.current?.focus(), 50);
              }}
              className="mt-4 rounded-lg bg-[#4F46E5] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#4338CA] transition-colors"
            >
              {lang === "gu" ? "પાર્ટી પસંદ કરો" : "Select Party"}
            </button>
          </div>
        </div>
      ) : isLoadingInvoices ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-2xs">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            <span>Loading pending invoices...</span>
          </div>
        </div>
      ) : invoices.length === 0 ? (
        /* Empty State 2: Party selected but no invoices */
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-2xs">
          <div className="flex flex-col items-center justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-2">
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xs font-bold text-slate-800">
              No pending transactions found for this party
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              This payment will be recorded as an advance payment on the party account.
            </p>
          </div>
        </div>
      ) : (
        /* Invoices settlement table matching screenshot */
        <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-800">
                Settle invoices with this payment
              </span>
              {selectedCount > 0 && (
                <div className="flex items-center gap-1 rounded-md bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-medium text-[#4F46E5]">
                  <span>{selectedCount} Invoice Selected</span>
                  <button
                    type="button"
                    onClick={clearAllSelections}
                    className="ml-1 text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Search toggle / input */}
              <div className="relative">
                {isInvoiceSearchOpen ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      autoFocus
                      value={invoiceSearchQuery}
                      onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                      placeholder="Search Invoice #"
                      className="rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:border-indigo-500 w-36"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setInvoiceSearchQuery("");
                        setIsInvoiceSearchOpen(false);
                      }}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsInvoiceSearchOpen(true)}
                    className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Date Range filter pill */}
              <div className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 shadow-2xs">
                <span>Select Date Range</span>
                <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs border-collapse">
              <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="px-4 py-2.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={areAllSelected}
                      onChange={toggleAllInvoices}
                      className="h-4 w-4 rounded border-slate-300 text-[#4F46E5] focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span>Date</span>
                      <span className="text-slate-400 text-[10px]">⇅</span>
                    </div>
                  </th>
                  <th className="px-4 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span>Due Date</span>
                      <span className="text-slate-400 text-[10px]">⇅</span>
                    </div>
                  </th>
                  <th className="px-4 py-2.5 whitespace-nowrap">Invoice #</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">Invoice Amount</th>
                  <th className="px-4 py-2.5 text-center whitespace-nowrap">Discount</th>
                  <th className="px-4 py-2.5 text-right whitespace-nowrap">Amount Received</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {displayedInvoices.map((inv) => {
                  const isChecked = (Number(inv.settle) || 0) > 0;
                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-slate-50/60 transition-colors ${isChecked ? "bg-indigo-50/20" : ""}`}
                    >
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleInvoiceRow(inv)}
                          className="h-4 w-4 rounded border-slate-300 text-[#4F46E5] focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap font-normal">
                        {formatPaymentDate(inv.invoiceDate)}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-normal">
                        {formatPaymentDate(inv.dueDate)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-medium text-slate-800">{formatInr(inv.grandTotal)}</span>
                        <span className="text-rose-500 font-medium text-[11px] ml-1.5">
                          ({formatInr(inv.balanceAmount)} pending)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {inv.isDiscountOpen ? (
                          <div className="inline-flex items-center gap-1">
                            <span className="text-slate-400">₹</span>
                            <input
                              type="number"
                              min="0"
                              max={inv.balanceAmount}
                              value={inv.discount}
                              onChange={(e) => updateInvoiceDiscount(inv.id, e.target.value)}
                              placeholder="0"
                              className="w-16 rounded border border-slate-200 px-1 py-0.5 text-xs text-right"
                            />
                            <button
                              type="button"
                              onClick={() => toggleInvoiceDiscount(inv.id)}
                              className="text-[10px] text-slate-400 hover:text-slate-600"
                            >
                              ✕
                            </button>
                          </div>
                        ) : Number(inv.discount) > 0 ? (
                          <button
                            type="button"
                            onClick={() => toggleInvoiceDiscount(inv.id)}
                            className="font-medium text-[#4F46E5] hover:underline"
                          >
                            {formatInr(inv.discount)}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleInvoiceDiscount(inv.id)}
                            className="text-[#4F46E5] hover:underline font-medium"
                          >
                            Apply Discount
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {isChecked ? (
                          <div className="inline-flex items-center gap-1 justify-end">
                            <span className="text-slate-400">₹</span>
                            <input
                              type="number"
                              min="0"
                              max={inv.balanceAmount}
                              step="0.01"
                              value={inv.settle}
                              onChange={(e) => updateInvoiceSettle(inv.id, e.target.value)}
                              className="w-24 rounded border border-slate-200 px-1.5 py-0.5 text-xs font-semibold text-right text-slate-900 focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                        ) : (
                          <span className="text-slate-400">₹ 0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Total Footer Row matching screenshot */}
              <tfoot className="border-t border-slate-200 bg-white font-semibold text-slate-900">
                <tr>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3" colSpan={3}>
                    Total
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatInr(totalInvoiceAmount)}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {formatInr(totalDiscount)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap font-bold text-slate-900">
                    {formatInr(totalSettled)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Create Customer / Party Modal */}
      {isCreatePartyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                Create New Customer / Party
              </h3>
              <button
                type="button"
                onClick={() => setIsCreatePartyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomerSubmit} className="space-y-3 pt-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Customer / Business Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={partyFormData.name}
                  onChange={(e) => setPartyFormData({ ...partyFormData, name: e.target.value })}
                  placeholder="e.g. NIRAJBHAI"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mobile No.</label>
                  <input
                    type="tel"
                    value={partyFormData.phone}
                    onChange={(e) => setPartyFormData({ ...partyFormData, phone: e.target.value })}
                    placeholder="98XXXXXXXX"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={partyFormData.gstin}
                    onChange={(e) => setPartyFormData({ ...partyFormData, gstin: e.target.value.toUpperCase() })}
                    placeholder="24AAAAA0000A1Z5"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={partyFormData.billingLine1}
                  onChange={(e) => setPartyFormData({ ...partyFormData, billingLine1: e.target.value })}
                  placeholder="Address..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreatePartyModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingParty || !partyFormData.name.trim()}
                  className="px-5 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-lg font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingParty ? "Saving..." : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
