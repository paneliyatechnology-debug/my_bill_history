"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { apiClient } from "@/lib/api-client";
import { Modal } from "@/components/ui/modal";

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
  voucherType: "PAYMENT" | "RECEIPT" | "JOURNAL" | "CONTRA";
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

export default function ExpenseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { lang, currentCompany } = useAuth();

  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchVoucher = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get(`/vouchers/${id}`);
      const data = res.data || res;
      setVoucher(data);
    } catch (err: any) {
      setError(err.message || "Failed to load expense details.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchVoucher();
  }, [fetchVoucher]);

  // Extract parsed details from narration and lines
  const parsedDetails = useMemo(() => {
    if (!voucher) return null;

    const lines = voucher.journalEntries || voucher.lines || [];
    const expenseLine = lines.find((l) => Number(l.debitAmount) > 0);
    const paymentLine = lines.find((l) => Number(l.creditAmount) > 0);

    let partyName = "-";
    let notes = "-";
    let placeOfSupply = currentCompany?.stateCode ? `Gujarat (${currentCompany.stateCode})` : "Gujarat";
    let itemsParsed: Array<{
      name: string;
      hsn: string;
      qty: number;
      price: number;
      discount: number;
      tax: number;
      itc: boolean;
      total: number;
    }> = [];

    const narration = voucher.narration || "";

    // Parse Party
    if (narration.includes("Party:")) {
      const match = narration.match(/Party:\s*([^;|,\n]+)/);
      if (match) partyName = match[1].trim();
    }

    // Parse Note
    if (narration.includes("Note:")) {
      const match = narration.match(/Note:\s*([^;|,\n]+)/);
      if (match) notes = match[1].trim();
    }

    // Parse items from narration or default to single item
    // Formats like: "Raw Material | Party: X | Office Supplies (Qty: 2 @ ₹500) | [GST INCLUDED: ...]"
    const itemMatch = narration.match(/\b([A-Za-z0-9\s&]+)\s*\(Qty:\s*(\d+(?:\.\d+)?)\s*@\s*₹?(\d+(?:\.\d+)?)\)/);
    if (itemMatch) {
      const itemName = itemMatch[1].trim();
      const qty = parseFloat(itemMatch[2]) || 1;
      const price = parseFloat(itemMatch[3]) || 0;
      const subtotal = qty * price;
      const totalAmount = Number(voucher.totalAmount) || subtotal;
      const taxAmount = Math.max(0, totalAmount - subtotal);

      itemsParsed.push({
        name: itemName,
        hsn: "-",
        qty: qty,
        price: price,
        discount: 0,
        tax: Number(taxAmount.toFixed(2)),
        itc: true,
        total: totalAmount,
      });
    } else {
      // General item from expense account
      itemsParsed.push({
        name: expenseLine?.account?.name || "Daily Office Expense",
        hsn: "-",
        qty: 1,
        price: Number(voucher.totalAmount),
        discount: 0,
        tax: 0,
        itc: true,
        total: Number(voucher.totalAmount),
      });
    }

    const categoryName = expenseLine?.account?.name || "General Expense";
    const paymentMode =
      paymentLine?.account?.name?.toLowerCase().includes("cash")
        ? "Cash"
        : paymentLine?.account?.name?.toLowerCase().includes("bank")
        ? "Bank Transfer"
        : "UPI";

    return {
      partyName,
      placeOfSupply,
      categoryName,
      paymentMode,
      notes,
      items: itemsParsed,
      totalAmount: Number(voucher.totalAmount),
      expenseLine,
      paymentLine,
    };
  }, [voucher, currentCompany]);

  // Handle Delete / Reversal
  const handleDeleteExpense = async () => {
    if (!voucher) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await apiClient.post(`/vouchers/${voucher.id}/reverse`, {
        reason: "Deleted by user",
        reversalDate: new Date().toISOString().split("T")[0],
      });
      setIsDeleteModalOpen(false);
      router.push("/finance/expenses");
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete expense voucher.");
      setIsDeleting(false);
    }
  };

  // Download PDF
  const handleDownloadPDF = async () => {
    if (!voucher || !parsedDetails) return;
    try {
      const { jsPDF } = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = (autoTableModule as any).default || autoTableModule;

      const doc = new jsPDF();
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, 210, 25, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`EXPENSE VOUCHER #${voucher.voucherNumber}`, 14, 16);

      doc.setTextColor(50, 50, 50);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Date: ${voucher.voucherDate ? voucher.voucherDate.split("T")[0] : "-"}`, 14, 35);
      doc.text(`Party Name: ${parsedDetails.partyName}`, 14, 42);
      doc.text(`Place of Supply: ${parsedDetails.placeOfSupply}`, 14, 49);

      doc.text(`Category: ${parsedDetails.categoryName}`, 120, 35);
      doc.text(`Payment Mode: ${parsedDetails.paymentMode}`, 120, 42);
      doc.text(`Notes: ${parsedDetails.notes}`, 120, 49);

      const tableData = parsedDetails.items.map((i) => [
        i.name,
        i.hsn,
        i.qty,
        `Rs. ${i.price.toFixed(2)}`,
        `Rs. ${i.discount.toFixed(2)}`,
        `Rs. ${i.tax.toFixed(2)}`,
        i.itc ? "Eligible" : "-",
        `Rs. ${i.total.toFixed(2)}`,
      ]);

      autoTable(doc, {
        head: [["Item Name", "HSN", "Qty", "Price/Item", "Discount", "Tax", "ITC", "Total Amount"]],
        body: tableData,
        startY: 56,
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8 },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`Total Expense Amount: Rs. ${parsedDetails.totalAmount.toFixed(2)}`, 14, finalY);

      doc.save(`expense_${voucher.voucherNumber}.pdf`);
    } catch (err: any) {
      alert("Failed to export PDF: " + err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block animate-spin w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full mb-3"></div>
        <p className="text-xs font-semibold text-slate-500">Loading expense details...</p>
      </div>
    );
  }

  if (error || !voucher || !parsedDetails) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <p className="text-sm font-semibold text-rose-600 mb-4">{error || "Expense not found."}</p>
        <Link
          href="/finance/expenses"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
        >
          ← Back to Expenses
        </Link>
      </div>
    );
  }

  // Display number like "Expense #1" or "Expense #EXP-9"
  const cleanNumber = voucher.voucherNumber?.replace(/^EXP-/, "") || "1";

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-16 font-sans">
      {/* Top Header matching MyBillBook screenshot */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/finance/expenses"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Back to Expenses"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">
            Expense #{cleanNumber}
          </h1>
          {voucher.isCancelled && (
            <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-md">
              CANCELLED
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {/* PDF Download Button */}
          <button
            type="button"
            onClick={handleDownloadPDF}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>📄</span>
            <span>PDF</span>
          </button>

          {/* Edit Button */}
          {!voucher.isCancelled && (
            <Link
              href={`/finance/expenses/create?id=${voucher.id}`}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              <span>Edit</span>
            </Link>
          )}

          {/* Delete Button */}
          {!voucher.isCancelled && (
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="p-1.5 text-rose-600 hover:text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-lg shadow-sm transition-all cursor-pointer"
              title="Delete Expense"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Main Details Card matching MyBillBook screenshot */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          {/* 4-Column Metadata Grid matching MyBillBook screenshot */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs border-b border-slate-100 pb-6">
            {/* Column 1 */}
            <div className="space-y-4">
              <div>
                <span className="text-slate-400 font-medium block mb-1">Party Name</span>
                <span className="text-slate-900 font-bold text-sm block">
                  {parsedDetails.partyName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block mb-1">Date</span>
                <span className="text-slate-800 font-semibold block font-mono">
                  {voucher.voucherDate ? voucher.voucherDate.split("T")[0] : "-"}
                </span>
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-4">
              <div>
                <span className="text-slate-400 font-medium block mb-1">Place of Supply</span>
                <span className="text-slate-800 font-semibold block">
                  {parsedDetails.placeOfSupply}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block mb-1">Notes</span>
                <span className="text-slate-700 block">{parsedDetails.notes}</span>
              </div>
            </div>

            {/* Column 3 */}
            <div className="space-y-4">
              <div>
                <span className="text-slate-400 font-medium block mb-1">Expense category</span>
                <span className="text-slate-900 font-bold block">{parsedDetails.categoryName}</span>
              </div>
            </div>

            {/* Column 4 */}
            <div className="space-y-4">
              <div>
                <span className="text-slate-400 font-medium block mb-1">Payment Mode</span>
                <span className="text-slate-900 font-bold block">{parsedDetails.paymentMode}</span>
              </div>
            </div>
          </div>

          {/* Items Table matching MyBillBook screenshot */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#EDF2F7] text-slate-600 font-bold text-[11px] border-b border-slate-200">
                  <th className="py-3 px-4 min-w-[200px]">Item Name</th>
                  <th className="py-3 px-3 w-28">HSN</th>
                  <th className="py-3 px-3 w-24">QTY</th>
                  <th className="py-3 px-3 w-32">PRICE/ITEM(₹)</th>
                  <th className="py-3 px-3 w-28">DISCOUNT(₹)</th>
                  <th className="py-3 px-3 w-28">TAX(₹)</th>
                  <th className="py-3 px-3 w-32">ITC Applicable</th>
                  <th className="py-3 px-4 text-right w-36">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsedDetails.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{item.name}</td>
                    <td className="py-3.5 px-3 font-mono text-slate-600">{item.hsn}</td>
                    <td className="py-3.5 px-3 font-semibold text-slate-800">{item.qty}</td>
                    <td className="py-3.5 px-3 font-mono text-slate-800">
                      ₹ {item.price.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-600">₹ {item.discount}</td>
                    <td className="py-3.5 px-3 font-mono text-slate-800">
                      ₹ {item.tax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-bold text-[10px]">
                        Eligible
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                      ₹ {item.total.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Summary matching MyBillBook screenshot */}
          <div className="flex flex-col items-end border-t border-slate-100 pt-4 space-y-2 text-xs">
            <div className="flex items-center justify-between w-64 text-slate-600">
              <span>Total Discount</span>
              <span className="font-mono">₹ 0</span>
            </div>
            <div className="flex items-center justify-between w-64 text-slate-900 font-bold text-sm pt-1 border-t border-slate-100">
              <span>Total Expense Amount</span>
              <span className="font-mono text-base">
                ₹ {parsedDetails.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>

        {/* Double Entry Accounting Transparency */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
            General Ledger Journal Entries (Double Entry)
          </span>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Account</th>
                  <th className="py-2.5 px-3">Account Group</th>
                  <th className="py-2.5 px-3 text-right">Debit (₹)</th>
                  <th className="py-2.5 px-3 text-right">Credit (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {(voucher.journalEntries || voucher.lines || []).map((l, i) => (
                  <tr key={l.id || i}>
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">
                      {l.account?.name || "Ledger Account"}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-500">
                      {l.account?.group?.name || "-"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {Number(l.debitAmount) > 0 ? Number(l.debitAmount).toFixed(2) : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {Number(l.creditAmount) > 0 ? Number(l.creditAmount).toFixed(2) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title={`Delete Expense #${cleanNumber}`}
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Are you sure you want to delete this expense? This will cancel the voucher and reverse
              all its ledger entries.
            </p>

            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteExpense}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-all"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
