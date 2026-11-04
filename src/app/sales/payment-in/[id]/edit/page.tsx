"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../../../context/auth-context";
import { apiClient, extractList } from "../../../../../lib/api-client";

interface PartyOption {
  id: string;
  name: string;
  phone?: string;
  type?: string;
  currentBalance?: number;
  balance?: number;
}

interface LedgerOption {
  id: string;
  name: string;
  isCashLedger?: boolean;
  isBankLedger?: boolean;
}

interface PendingSalesInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  grandTotal: number;
  balanceAmount: number;
  settle: string;
  discount: string;
  isSelected: boolean;
}

const PAYMENT_MODES = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHEQUE", label: "Cheque" },
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

export default function EditPaymentInPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { lang, tenantContext } = useAuth();
  const voucherId = params?.id;

  // Reference data
  const [parties, setParties] = useState<PartyOption[]>([]);
  const [ledgers, setLedgers] = useState<LedgerOption[]>([]);

  // Form State
  const [partyId, setPartyId] = useState("");
  const [partyName, setPartyName] = useState("");
  const [partyBalance, setPartyBalance] = useState(0);

  const [paymentNumber, setPaymentNumber] = useState("1");
  const [voucherDate, setVoucherDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [depositToAccountId, setDepositToAccountId] = useState("");
  const [amountReceived, setAmountReceived] = useState("");
  const [paymentInDiscount, setPaymentInDiscount] = useState("0");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");

  // Invoices & Allocations
  const [invoices, setInvoices] = useState<PendingSalesInvoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");

  // Status
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load existing voucher and reference data
  useEffect(() => {
    if (!voucherId || !tenantContext.companyId) return;

    async function loadInitial() {
      setIsLoadingInitial(true);
      try {
        const [existingVoucher, partiesRes, ledgersRes] = await Promise.all([
          apiClient.get<any>(`/sales/payment-in/${voucherId}`),
          apiClient.get<any>("/masters/parties", { type: "CUSTOMER", limit: 100 }),
          apiClient.get<any>("/accounting/accounts", { limit: 100 }).catch(() => ({ data: [] })),
        ]);

        const partyList = extractList<PartyOption>(partiesRes);
        setParties(partyList);

        const rawLedgers = extractList<LedgerOption>(ledgersRes);
        const cashBank = rawLedgers.filter(
          (l) =>
            l.isCashLedger ||
            l.isBankLedger ||
            l.name.toLowerCase().includes("cash") ||
            l.name.toLowerCase().includes("bank"),
        );
        setLedgers(cashBank.length > 0 ? cashBank : rawLedgers);

        if (existingVoucher) {
          setPartyId(existingVoucher.partyId || "");
          setPartyName(existingVoucher.partyName || "");
          setPaymentNumber(existingVoucher.paymentNumber || existingVoucher.voucherNumber || "1");
          if (existingVoucher.paymentDate || existingVoucher.voucherDate) {
            setVoucherDate(
              new Date(existingVoucher.paymentDate || existingVoucher.voucherDate)
                .toISOString()
                .slice(0, 10),
            );
          }
          setPaymentMode(existingVoucher.paymentMode || "CASH");
          setAmountReceived(String(existingVoucher.amountReceived ?? existingVoucher.amount ?? ""));
          setPaymentInDiscount(String(existingVoucher.discount || "0"));
          setReferenceNo(existingVoucher.referenceNo || "");
          setNotes(existingVoucher.narration || existingVoucher.notes || "");

          const partyObj = partyList.find((p) => p.id === existingVoucher.partyId);
          if (partyObj) {
            setPartyBalance(partyObj.currentBalance || partyObj.balance || 0);
          }

          // Load sales invoices for this party and merge with existing allocations
          let allInvoices: any[] = [];
          if (existingVoucher.partyId) {
            const salesRes = await apiClient.get<any>("/sales/invoices", {
              partyId: existingVoucher.partyId,
              limit: 100,
            });
            allInvoices = extractList<any>(salesRes);
          }

          const existingAllocations = existingVoucher.allocations || [];
          const allocMap = new Map<string, { allocatedAmount: number; cashDiscount: number }>();
          for (const a of existingAllocations) {
            const sid = a.salesInvoiceId || a.salesInvoice?.id;
            if (sid) {
              allocMap.set(sid, {
                allocatedAmount: Number(a.allocatedAmount) || 0,
                cashDiscount: Number(a.cashDiscount) || 0,
              });
            }
          }

          // If an invoice from existing allocations isn't in allInvoices, include it
          const existingIds = new Set(allInvoices.map((i) => i.id));
          for (const a of existingAllocations) {
            const inv = a.salesInvoice;
            if (inv && inv.id && !existingIds.has(inv.id)) {
              allInvoices.push(inv);
              existingIds.add(inv.id);
            }
          }

          const mergedInvoices: PendingSalesInvoice[] = allInvoices
            .map((inv) => {
              const prev = allocMap.get(inv.id);
              const grandTotal = Number(inv.grandTotal) || 0;
              const paid = Number(inv.paidAmount) || 0;
              const currentBal =
                inv.balanceAmount !== undefined ? Number(inv.balanceAmount) : Math.max(0, grandTotal - paid);
              // Add back previous allocation to pending balance so user sees available balance
              const pendingBal = currentBal + (prev ? prev.allocatedAmount + prev.cashDiscount : 0);
              const isAllocated = !!prev && (prev.allocatedAmount > 0 || prev.cashDiscount > 0);

              return {
                id: inv.id,
                invoiceNumber: inv.invoiceNumber || "—",
                invoiceDate: inv.invoiceDate,
                dueDate: inv.dueDate || inv.invoiceDate,
                grandTotal,
                balanceAmount: pendingBal,
                settle: prev && prev.allocatedAmount > 0 ? String(prev.allocatedAmount) : "",
                discount: prev && prev.cashDiscount > 0 ? String(prev.cashDiscount) : "",
                isSelected: isAllocated,
              };
            })
            .filter((inv) => inv.balanceAmount > 0.01 || inv.isSelected);

          setInvoices(mergedInvoices);
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to load payment details.");
      } finally {
        setIsLoadingInitial(false);
      }
    }
    loadInitial();
  }, [voucherId, tenantContext.companyId]);

  // Handle Amount Received change
  const handleAmountReceivedChange = (newVal: string) => {
    setAmountReceived(newVal);
    const totalNumeric = parseFloat(newVal) || 0;
    if (totalNumeric <= 0) {
      setInvoices((prev) => prev.map((inv) => ({ ...inv, settle: "", isSelected: false })));
      return;
    }

    let remaining = totalNumeric;
    setInvoices((prev) =>
      prev.map((inv) => {
        const disc = parseFloat(inv.discount) || 0;
        const maxCanSettle = Math.max(0, inv.balanceAmount - disc);
        if (remaining > 0 && maxCanSettle > 0) {
          const alloc = Math.min(remaining, maxCanSettle);
          remaining -= alloc;
          return {
            ...inv,
            settle: alloc > 0 ? alloc.toFixed(2) : "",
            isSelected: alloc > 0,
          };
        }
        return {
          ...inv,
          settle: "",
          isSelected: false,
        };
      }),
    );
  };

  // Toggle single invoice selection
  const toggleInvoiceSelect = (index: number) => {
    setInvoices((prev) => {
      const updated = [...prev];
      const target = { ...updated[index] };
      const currentlySelected = target.isSelected;

      if (!currentlySelected) {
        target.isSelected = true;
        const disc = parseFloat(target.discount) || 0;
        const pending = Math.max(0, target.balanceAmount - disc);
        target.settle = pending.toFixed(2);
      } else {
        target.isSelected = false;
        target.settle = "";
        target.discount = "";
      }
      updated[index] = target;

      const newTotal = updated.reduce((sum, inv) => sum + (parseFloat(inv.settle) || 0), 0);
      setAmountReceived(newTotal > 0 ? newTotal.toFixed(2) : "");
      return updated;
    });
  };

  // Toggle select all invoices
  const toggleSelectAllInvoices = () => {
    const allSelected = invoices.length > 0 && invoices.every((i) => i.isSelected);
    setInvoices((prev) => {
      const updated = prev.map((inv) => {
        if (!allSelected) {
          const disc = parseFloat(inv.discount) || 0;
          const pending = Math.max(0, inv.balanceAmount - disc);
          return { ...inv, isSelected: true, settle: pending.toFixed(2) };
        }
        return { ...inv, isSelected: false, settle: "", discount: "" };
      });
      const newTotal = updated.reduce((sum, inv) => sum + (parseFloat(inv.settle) || 0), 0);
      setAmountReceived(newTotal > 0 ? newTotal.toFixed(2) : "");
      return updated;
    });
  };

  const handleInvoiceSettleChange = (index: number, val: string) => {
    setInvoices((prev) => {
      const updated = [...prev];
      const target = { ...updated[index] };
      target.settle = val;
      target.isSelected = (parseFloat(val) || 0) > 0;
      updated[index] = target;

      const newTotal = updated.reduce((sum, inv) => sum + (parseFloat(inv.settle) || 0), 0);
      setAmountReceived(newTotal > 0 ? newTotal.toFixed(2) : "");
      return updated;
    });
  };

  const handleInvoiceDiscountChange = (index: number, val: string) => {
    setInvoices((prev) => {
      const updated = [...prev];
      const target = { ...updated[index] };
      target.discount = val;
      const discNum = parseFloat(val) || 0;
      const pendingAfterDisc = Math.max(0, target.balanceAmount - discNum);
      const curSettle = parseFloat(target.settle) || 0;
      if (curSettle > pendingAfterDisc) {
        target.settle = pendingAfterDisc > 0 ? pendingAfterDisc.toFixed(2) : "";
      }
      updated[index] = target;

      const newTotal = updated.reduce((sum, inv) => sum + (parseFloat(inv.settle) || 0), 0);
      setAmountReceived(newTotal > 0 ? newTotal.toFixed(2) : "");

      const totalDisc = updated.reduce((sum, inv) => sum + (parseFloat(inv.discount) || 0), 0);
      setPaymentInDiscount(totalDisc > 0 ? totalDisc.toFixed(2) : "0");

      return updated;
    });
  };

  // Filtered invoices
  const displayedInvoices = useMemo(() => {
    if (!invoiceSearchQuery.trim()) return invoices;
    const q = invoiceSearchQuery.toLowerCase();
    return invoices.filter((i) => i.invoiceNumber.toLowerCase().includes(q));
  }, [invoices, invoiceSearchQuery]);

  const selectedInvoicesCount = useMemo(() => {
    return invoices.filter((i) => i.isSelected).length;
  }, [invoices]);

  const totalGrandTotal = useMemo(() => {
    return displayedInvoices.reduce((sum, i) => sum + i.grandTotal, 0);
  }, [displayedInvoices]);

  const totalDiscountSum = useMemo(() => {
    return displayedInvoices.reduce((sum, i) => sum + (parseFloat(i.discount) || 0), 0);
  }, [displayedInvoices]);

  const totalAmountReceivedSum = useMemo(() => {
    return displayedInvoices.reduce((sum, i) => sum + (parseFloat(i.settle) || 0), 0);
  }, [displayedInvoices]);

  // Form Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    const receivedNum = parseFloat(amountReceived);
    if (!receivedNum || receivedNum <= 0) {
      setErrorMessage("Please enter a valid amount received.");
      return;
    }

    if (!partyId) {
      setErrorMessage("Please select a valid customer.");
      return;
    }

    const discNum = parseFloat(paymentInDiscount) || 0;

    const allocationsPayload = invoices
      .filter((inv) => inv.isSelected && (parseFloat(inv.settle) > 0 || parseFloat(inv.discount) > 0))
      .map((inv) => ({
        salesInvoiceId: inv.id,
        amount: parseFloat(inv.settle) || 0,
        cashDiscount: parseFloat(inv.discount) || 0,
      }));

    setIsSubmitting(true);
    try {
      await apiClient.put<any>(`/sales/payment-in/${voucherId}`, {
        partyId,
        voucherDate,
        amount: receivedNum,
        discount: discNum,
        depositToAccountId: depositToAccountId || undefined,
        paymentMode,
        paymentNumber: paymentNumber.trim() || undefined,
        referenceNo: referenceNo.trim() || undefined,
        narration: notes.trim() || undefined,
        allocations: allocationsPayload.length > 0 ? allocationsPayload : undefined,
      });

      router.push(`/sales/payment-in/${voucherId}`);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update payment in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingInitial) {
    return (
      <div className="flex h-96 items-center justify-center font-sans bg-[#F4F5F7]">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0F172A] border-t-transparent" />
          <span>Loading payment for editing...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] font-sans pb-24">
      <form onSubmit={handleSubmit}>
        {/* 1. Top Header Bar: matches Payment Out edit layout */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <Link
              href={`/sales/payment-in/${voucherId}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M9.707 14.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 9H16a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </Link>
            <h1 className="text-[15px] font-semibold text-[#182230]">
              Record Payment In #{paymentNumber}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            >
              ⌨
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white h-9 px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
            >
              <span>⚙</span>
              <span>Settings</span>
            </button>
            <button
              type="button"
              onClick={() => router.push(`/sales/payment-in/${voucherId}`)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-[#0F172A] px-5 py-1.5 text-[13px] font-medium text-white shadow-xs hover:bg-[#1268D3] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-500 hover:text-rose-700"
            >
              ✕
            </button>
          </div>
        )}

        <div className="max-w-[1600px] mx-auto px-6 py-5 space-y-4">
          {/* 2. Top Card: Split Grid into Left & Right Panels matching screenshot */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Box: Party Name, Current Balance, Amount Received, Discount */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-slate-500 mb-1">
                  Party Name
                </label>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800">
                  {partyName || "—"}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Current Balance: ₹ {partyBalance.toLocaleString("en-IN")}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[12px] font-medium text-slate-500 mb-1">
                    Amount Received
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={amountReceived}
                    onChange={(e) => handleAmountReceivedChange(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-normal text-slate-900 focus:border-[#1677E8] focus:outline-none h-10"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <span>Payment In Discount</span>
                    <span className="text-slate-400">ⓘ</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={paymentInDiscount}
                    onChange={(e) => setPaymentInDiscount(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 focus:border-[#1677E8] focus:outline-none h-10"
                  />
                </div>
              </div>
            </div>

            {/* Right Box: Payment Date, Mode, Number, Notes */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-slate-500 mb-1">
                    Payment Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={voucherDate}
                      onChange={(e) => setVoucherDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 focus:border-[#1677E8] focus:outline-none h-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-slate-500 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 focus:border-[#1677E8] focus:outline-none h-10"
                  >
                    {PAYMENT_MODES.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-slate-500 mb-1">
                    Payment In Number
                  </label>
                  <input
                    type="text"
                    value={paymentNumber}
                    onChange={(e) => setPaymentNumber(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 focus:border-[#1677E8] focus:outline-none h-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate-500 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter Notes"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 focus:border-[#1677E8] focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* 3. Lower Section: Settle invoices with this payment matching screenshot */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-[#182230]">
                Settle invoices with this payment
              </h2>

              <div className="flex items-center gap-2">
                {selectedInvoicesCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                    <span>{selectedInvoicesCount} Invoice Selected</span>
                    <button
                      type="button"
                      onClick={toggleSelectAllInvoices}
                      className="text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  </span>
                )}

                <div className="relative w-36">
                  <input
                    type="text"
                    value={invoiceSearchQuery}
                    onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                    placeholder="Search invoice..."
                    className="w-full rounded-lg border border-slate-200 bg-white py-1 pl-7 pr-2 text-[13px] text-slate-800 focus:border-[#1677E8] focus:outline-none h-10"
                  />
                  <span className="absolute left-2.5 top-1.5 text-xs text-slate-400">🔍</span>
                </div>

                <button
                  type="button"
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  <span>Select Date Range</span>
                  <span className="text-xs">📅</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-left text-xs border-collapse">
                <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-4 py-2.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={invoices.length > 0 && invoices.every((i) => i.isSelected)}
                        onChange={toggleSelectAllInvoices}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                    </th>
                    <th className="px-4 py-2.5 whitespace-nowrap">Date ↕</th>
                    <th className="px-4 py-2.5 whitespace-nowrap">Due Date ↕</th>
                    <th className="px-4 py-2.5 whitespace-nowrap">Invoice #</th>
                    <th className="px-4 py-2.5 whitespace-nowrap">Invoice Amount</th>
                    <th className="px-4 py-2.5 text-right whitespace-nowrap">Discount</th>
                    <th className="px-4 py-2.5 text-right whitespace-nowrap">Amount Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {displayedInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                        No pending sales invoices found for this customer.
                      </td>
                    </tr>
                  ) : (
                    displayedInvoices.map((inv, idx) => {
                      return (
                        <tr
                          key={inv.id}
                          className={`hover:bg-slate-50/60 ${inv.isSelected ? "bg-teal-50/20" : ""}`}
                        >
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={inv.isSelected}
                              onChange={() => toggleInvoiceSelect(idx)}
                              className="rounded border-slate-300 text-teal-600 focus:ring-[#1677E8]"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                            {formatPaymentDate(inv.invoiceDate)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                            {inv.dueDate ? formatPaymentDate(inv.dueDate) : ""}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">
                            {inv.invoiceNumber}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-900">
                            <span>{formatInr(inv.grandTotal)}</span>
                            <span className="text-rose-500 text-[11px] ml-1.5 font-medium">
                              ({formatInr(inv.balanceAmount)} pending)
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <input
                              type="number"
                              step="any"
                              value={inv.discount}
                              onChange={(e) => handleInvoiceDiscountChange(idx, e.target.value)}
                              placeholder="Apply Discount"
                              className="w-24 rounded border border-slate-200 px-2 py-1 text-right text-[13px] focus:border-[#1677E8] focus:outline-none h-10"
                            />
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <input
                              type="number"
                              step="any"
                              value={inv.settle}
                              onChange={(e) => handleInvoiceSettleChange(idx, e.target.value)}
                              placeholder="0.00"
                              className="w-24 rounded border border-slate-200 px-2 py-1 text-right text-[13px] font-normal text-slate-900 focus:border-[#1677E8] focus:outline-none h-10"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot className="bg-white border-t border-slate-200 font-semibold text-xs text-slate-800">
                  <tr>
                    <td colSpan={4} className="px-4 py-3">
                      Total
                    </td>
                    <td className="px-4 py-3">
                      {totalGrandTotal > 0 ? formatInr(totalGrandTotal) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatInr(totalDiscountSum)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatInr(totalAmountReceivedSum)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

