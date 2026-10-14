"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";
import { StatusBadge } from "../../../components/ui/badge";

interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  status: "DRAFT" | "ISSUED" | "PAID" | "PARTIALLY_PAID" | "CANCELLED";
  party?: {
    id: string;
    name: string;
    gstin?: string;
  };
  taxableAmount: number;
  totalTax: number;
  grandTotal: number;
  paidAmount: number;
  outstandingBalance: number;
  isB2B: boolean;
}

export default function SalesInvoicesPage() {
  const { lang, tenantContext } = useAuth();
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get("/invoices/sales", {
        search: searchTerm || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
      });
      setInvoices(extractList(res));
    } catch (err: any) {
      setError(err.message || "Failed to load sales invoices.");
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchInvoices();
    }
  }, [tenantContext.companyId, fetchInvoices]);

  const filtered = invoices.filter((inv) => {
    if (statusFilter !== "ALL" && inv.status !== statusFilter) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(term) ||
      (inv.party?.name && inv.party.name.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {lang === "gu"
              ? "વેચાણ બિલોની યાદી (Sales Invoices)"
              : "Sales Invoices & Billing"}
          </h1>
          <p className="text-xs text-slate-500">
            {lang === "gu"
              ? "ટેક્સ ઇન્વોઇસ, બિલ-બાય-બિલ ચુકવણી અને બાકી રકમ"
              : "GST Tax Invoices, bill-by-bill receivables, and payment allocations"}
          </p>
        </div>

        <Link
          href="/sales/invoices/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#FF9933] hover:bg-[#E67E17] text-slate-950 text-sm font-bold rounded-lg shadow-sm transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>{lang === "gu" ? "નવું બિલ બનાવો" : "Create Invoice"}</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <svg
            className="w-4 h-4 absolute left-3 top-3 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by invoice number or customer name..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF9933] focus:bg-white text-slate-800"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto text-xs bg-slate-50 border border-slate-300 text-slate-700 rounded-lg px-3 py-2 font-medium"
        >
          <option value="ALL">All Invoice Statuses</option>
          <option value="ISSUED">ISSUED (ઇશ્યુ કરેલ)</option>
          <option value="PAID">PAID (ચૂકતે)</option>
          <option value="PARTIALLY_PAID">PARTIALLY PAID (અંશતઃ ચૂકતે)</option>
          <option value="DRAFT">DRAFT (કાચું બિલ)</option>
          <option value="CANCELLED">CANCELLED (રદ થયેલ)</option>
        </select>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {error && (
          <div className="p-4 bg-rose-50 border-b border-rose-100 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">
                  {lang === "gu" ? "બિલ નંબર" : "Invoice No."}
                </th>
                <th className="py-3 px-4">
                  {lang === "gu" ? "તારીખ" : "Date"}
                </th>
                <th className="py-3 px-4">
                  {lang === "gu" ? "ગ્રાહક" : "Customer / Party"}
                </th>
                <th className="py-3 px-4 text-right">
                  {lang === "gu" ? "ટેક્સેબલ રકમ (₹)" : "Taxable (₹)"}
                </th>
                <th className="py-3 px-4 text-right">
                  {lang === "gu" ? "કુલ રકમ (₹)" : "Grand Total (₹)"}
                </th>
                <th className="py-3 px-4 text-right">
                  {lang === "gu" ? "બાકી સિલક (₹)" : "Balance (₹)"}
                </th>
                <th className="py-3 px-4">
                  {lang === "gu" ? "સ્થિતિ" : "Status"}
                </th>
                <th className="py-3 px-4 text-right">
                  {lang === "gu" ? "વિગત" : "Action"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="inline-block w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <p>Loading invoices...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-700 mb-1">
                      No sales invoices found
                    </p>
                    <p className="text-[11px]">
                      Click &apos;Create Invoice&apos; to raise your first GST
                      sales bill.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      <Link
                        href={`/sales/invoices/${inv.id}`}
                        className="hover:text-emerald-700 hover:underline"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {new Date(inv.invoiceDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <div>{inv.party?.name || "Walk-in Cash Customer"}</div>
                      {inv.party?.gstin && (
                        <div className="text-[10px] font-mono text-emerald-700">
                          {inv.party.gstin}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      ₹{Number(inv.taxableAmount || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ₹{Number(inv.grandTotal).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold">
                      {Number(inv.outstandingBalance) > 0 ? (
                        <span className="text-amber-700">
                          ₹{Number(inv.outstandingBalance).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-emerald-600">₹0.00</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/sales/invoices/${inv.id}`}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                      >
                        View / Print →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
