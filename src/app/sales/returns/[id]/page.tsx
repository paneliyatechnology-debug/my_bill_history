"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../context/auth-context";
import { apiClient } from "../../../../lib/api-client";

// Helper: Indian Rupee Formatter
function formatInr(val: number | string | undefined): string {
  const num = Number(val) || 0;
  return (
    "₹ " +
    num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

// Helper: Format Date
function formatDisplayDate(val?: string): string {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface SalesReturnDetail {
  id: string;
  returnNumber: string;
  returnDate: string;
  docType?: string;
  creditNoteType?: string;
  gstCategory?: string;
  disposition?: string;
  warehouseId?: string;
  warehouse?: {
    id: string;
    name: string;
  };
  linkedReturnId?: string;
  settlementMode?: string;
  refundAmount?: number;
  allocatedAmount?: number;
  remainingCredit?: number;
  taxableAmount: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  grandTotal: number;
  status: string;
  reason?: string;
  notes?: string;
  createdAt?: string;
  party?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    gstin?: string;
    billingAddress?: any;
    stateCode?: string;
  };
  salesInvoice?: {
    id: string;
    invoiceNumber: string;
    invoiceDate?: string;
    grandTotal?: number;
  };
  items?: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    taxableAmount: number;
    cgstAmount?: number;
    sgstAmount?: number;
    igstAmount?: number;
    totalAmount: number;
    disposition?: string;
    item?: {
      id: string;
      name: string;
      sku?: string;
      hsnCode?: string;
      primaryUom?: { code: string };
    };
  }>;
}

export default function DedicatedSalesReturnDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { lang, currentCompany } = useAuth();

  const [data, setData] = useState<SalesReturnDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingCN, setIsCreatingCN] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch Sales Return
  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    apiClient
      .get(`/sales-returns/${id}`)
      .then((res: any) => {
        const item = res?.data || res;
        setData(item);
      })
      .catch((err: any) => {
        setError(err.message || "Failed to load sales return details.");
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  // 1-Click Convert to Credit Note
  const handleCreateCreditNote = async () => {
    if (!data?.id) return;
    setIsCreatingCN(true);
    try {
      const res: any = await apiClient.post(`/sales-returns/${data.id}/create-credit-note`, {});
      const cnId = res?.creditNote?.id || res?.id;
      setToastMessage("Credit Note issued successfully!");
      if (cnId) {
        router.push(`/sales/credit-note/view/${cnId}`);
      }
    } catch (err: any) {
      alert(err?.message || "Failed to create Credit Note from Sales Return.");
    } finally {
      setIsCreatingCN(false);
    }
  };

  // Cancel / Delete Return
  const handleDeleteReturn = async () => {
    if (!confirm("Are you sure you want to cancel and reverse this physical sales return? Stock will be reversed.")) {
      return;
    }
    try {
      await apiClient.delete(`/sales-returns/${id}`);
      alert("Sales return cancelled and stock reversed successfully.");
      router.push("/sales/returns");
    } catch (err: any) {
      alert(err.message || "Failed to cancel sales return.");
    }
  };

  // Native Print
  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-3 border-[#0047BA] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading sales return details...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 text-center">
          <p className="text-sm font-bold text-rose-700">{error || "Sales return not found."}</p>
          <Link
            href="/sales/returns"
            className="mt-4 inline-block px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700"
          >
            ← Back to Sales Returns
          </Link>
        </div>
      </div>
    );
  }

  const disposition = data.disposition || "SELLABLE";
  const warehouseName = data.warehouse?.name || "Main Godown";
  const isCancelled = data.status === "CANCELLED";

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold animate-in fade-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}

      {/* Top Header Bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-2xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Left Title & Status */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/sales/returns"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              title="Back to Sales Returns"
            >
              ←
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  Sales Return #{data.returnNumber}
                </h1>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                    isCancelled
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {data.status || "ISSUED"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Goods Return Inward • Return Date: {formatDisplayDate(data.returnDate)}
              </p>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 1-Click Create Credit Note */}
            {!data.linkedReturnId && !isCancelled && (
              <button
                type="button"
                onClick={handleCreateCreditNote}
                disabled={isCreatingCN}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600 bg-blue-600 h-9 px-3.5 text-[12px] font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                <span>{isCreatingCN ? "Generating..." : "⚡ Create Credit Note"}</span>
              </button>
            )}

            {/* View Linked Credit Note */}
            {data.linkedReturnId && (
              <Link
                href={`/sales/credit-note/view/${data.linkedReturnId}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 h-9 px-3 text-[12px] font-bold text-purple-800 hover:bg-purple-100 transition-colors"
              >
                <span>🔗 View Linked Credit Note</span>
              </Link>
            )}

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white h-9 px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <span>🖨️ Print Slip</span>
            </button>

            {/* Cancel Return */}
            {!isCancelled && (
              <button
                type="button"
                onClick={handleDeleteReturn}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 h-9 px-3 text-[12px] font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                <span>Cancel Return</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Document Body */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        <div ref={printRef} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
          {/* Header & Company Brand */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-200">
            <div>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block mb-2">
                Physical Inventory Return (Goods Inward)
              </span>
              <h2 className="text-xl font-bold text-slate-900">
                {currentCompany?.tradeName || currentCompany?.legalName || "My Business"}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {currentCompany?.address || ""} {currentCompany?.city ? `• ${currentCompany.city}` : ""}
              </p>
              {currentCompany?.gstin && (
                <p className="text-xs text-slate-600 font-mono mt-0.5">GSTIN: {currentCompany.gstin}</p>
              )}
            </div>

            <div className="sm:text-right space-y-1">
              <span className="text-xs uppercase font-bold text-slate-400 block">Return Document #</span>
              <p className="text-lg font-bold text-slate-900 font-mono">{data.returnNumber}</p>
              <p className="text-xs text-slate-600">Date: {formatDisplayDate(data.returnDate)}</p>
            </div>
          </div>

          {/* Customer & Original Invoice Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50/80 border border-slate-200">
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">Customer Details</span>
              <p className="font-bold text-sm text-slate-900">{data.party?.name || "Direct Customer"}</p>
              {data.party?.phone && <p className="text-xs text-slate-600 mt-0.5">Phone: {data.party.phone}</p>}
              {data.party?.gstin && (
                <p className="text-xs text-slate-600 font-mono mt-0.5">GSTIN: {data.party.gstin}</p>
              )}
            </div>

            <div>
              <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">Original Invoice Reference</span>
              {data.salesInvoice ? (
                <div>
                  <Link
                    href={`/sales/invoices/${data.salesInvoice.id}`}
                    className="font-bold text-sm text-blue-600 hover:underline"
                  >
                    #{data.salesInvoice.invoiceNumber}
                  </Link>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Invoice Date: {formatDisplayDate(data.salesInvoice.invoiceDate)}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Direct Sales Return (No linked invoice)</p>
              )}
            </div>
          </div>

          {/* Stock & Warehouse Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-emerald-50/40 border border-emerald-200 text-xs">
            <div>
              <span className="text-emerald-800 uppercase font-bold block">Target Godown / Warehouse</span>
              <p className="font-bold text-sm text-slate-900 mt-0.5">{warehouseName}</p>
            </div>
            <div>
              <span className="text-emerald-800 uppercase font-bold block">Stock Disposition</span>
              <span
                className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[11px] font-bold border ${
                  disposition === "DAMAGED"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : disposition === "SCRAPPED"
                    ? "bg-slate-100 text-slate-700 border-slate-300"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
              >
                {disposition}
              </span>
            </div>
            <div>
              <span className="text-emerald-800 uppercase font-bold block">Physical Stock Impact</span>
              <p className="text-slate-700 mt-0.5 font-medium">
                {disposition === "SELLABLE"
                  ? "✓ Inventory restocked in warehouse"
                  : "✗ Quarantined / Scrapped (No sellable stock added)"}
              </p>
            </div>
          </div>

          {/* Returned Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Item Name</th>
                  <th className="py-2.5 px-3">HSN/SAC</th>
                  <th className="py-2.5 px-3 text-right">Returned Qty</th>
                  <th className="py-2.5 px-3 text-right">Rate</th>
                  <th className="py-2.5 px-3 text-right">Taxable</th>
                  <th className="py-2.5 px-3 text-right">Tax Rate</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(data.items || []).map((line, idx) => (
                  <tr key={line.id || `line-${idx}`} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-slate-400 tabular-nums">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <p className="font-bold text-slate-900">{line.item?.name || "Returned Item"}</p>
                      {line.item?.sku && <p className="text-[10px] text-slate-400">SKU: {line.item.sku}</p>}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{line.item?.hsnCode || "—"}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-600 tabular-nums">
                      {line.quantity} {line.item?.primaryUom?.code || "Unit"}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{formatInr(line.unitPrice)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{formatInr(line.taxableAmount)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-500">{line.taxRate}%</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                      {formatInr(line.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Financial Reversal Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-4 border-t border-slate-200">
            <div className="space-y-1 text-xs text-slate-600 max-w-sm">
              <p className="font-bold text-slate-800">Return Reason:</p>
              <p className="text-slate-600">{data.reason || "Customer Return"}</p>
              {data.notes && (
                <div className="mt-2">
                  <p className="font-bold text-slate-800">Notes & Inspection:</p>
                  <p className="text-slate-600">{data.notes}</p>
                </div>
              )}
            </div>

            <div className="w-full sm:w-64 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Taxable Amount:</span>
                <span className="font-semibold text-slate-900 tabular-nums">{formatInr(data.taxableAmount)}</span>
              </div>
              {Number(data.cgstAmount || 0) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>CGST:</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{formatInr(data.cgstAmount)}</span>
                </div>
              )}
              {Number(data.sgstAmount || 0) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>SGST:</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{formatInr(data.sgstAmount)}</span>
                </div>
              )}
              {Number(data.igstAmount || 0) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>IGST:</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{formatInr(data.igstAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Value:</span>
                <span className="text-rose-600 tabular-nums">{formatInr(data.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
