"use client";

import React, { useState, useEffect, useMemo, use } from "react";
import { apiClient } from "@/lib/api-client";

interface PublicPortalData {
  company: {
    id: string;
    name: string;
    legalName?: string;
    tradeName?: string;
    phone?: string;
    email?: string;
    gstin?: string;
    stateCode?: string;
    address?: string;
    bankDetails?: {
      bankName?: string;
      accountNo?: string;
      ifsc?: string;
      branch?: string;
      upiVpa?: string;
    };
    upiId?: string;
    theme?: {
      accentColor?: string;
      logoUrl?: string | null;
    };
  };
  party: {
    id: string;
    name: string;
    nameGujarati?: string;
    phone?: string;
    email?: string;
    gstin?: string;
    type?: string;
    billingAddress?: any;
  };
  balance: number;
  balanceType: "RECEIVABLE" | "PAYABLE";
  totalTransactions: number;
  transactions: Array<{
    id: string;
    type: string;
    typeLabel: string;
    voucherNumber: string;
    date: string;
    debit: number;
    credit: number;
    amount: number;
    paidAmount?: number;
    status?: string;
  }>;
  syncTime: string;
  verifiedSecure: boolean;
}

export default function PublicSharedLedgerPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [data, setData] = useState<PublicPortalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<"ALL" | "30DAYS" | "90DAYS">("ALL");

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  useEffect(() => {
    setIsLoading(true);
    apiClient
      .get<PublicPortalData>(`/shared-ledger/public/${token}`)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        setError(
          err?.message || "Invalid or expired SharedLedger statement link.",
        );
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  // Filter transactions by period
  const filteredTransactions = useMemo(() => {
    if (!data?.transactions) return [];
    if (filterPeriod === "ALL") return data.transactions;

    const days = filterPeriod === "30DAYS" ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return data.transactions.filter((t) => new Date(t.date) >= cutoff);
  }, [data?.transactions, filterPeriod]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold animate-bounce mb-4 shadow-lg shadow-indigo-500/20">
          🔗
        </div>
        <p className="text-slate-600 font-semibold text-sm">
          Loading verified live ledger statement...
        </p>
        <span className="text-xs text-slate-400 mt-1">
          Secured by SharedLedger™
        </span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center text-3xl mb-4 border border-rose-200">
          ⚠️
        </div>
        <h2 className="text-lg font-bold text-slate-800">Statement Not Found</h2>
        <p className="text-xs text-slate-500 max-w-sm mt-1">{error}</p>
        <p className="text-[11px] text-slate-400 mt-4">
          Please contact the vendor or business owner to request a fresh statement link.
        </p>
      </div>
    );
  }

  const { company, party, balance, balanceType } = data;
  const isPendingPay = balance > 0;
  const isAdvance = balance < 0;

  const upiPayUrl = company.upiId
    ? `upi://pay?pa=${encodeURIComponent(company.upiId)}&pn=${encodeURIComponent(
        company.name,
      )}&am=${encodeURIComponent(Math.max(0, balance))}&cu=INR`
    : null;

  return (
    <div className="min-h-screen bg-slate-100/70 pb-16">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-2xl font-bold shadow-lg">
                {company.theme?.logoUrl ? (
                  <img
                    src={company.theme.logoUrl}
                    alt={company.name}
                    className="w-full h-full object-contain rounded-2xl"
                  />
                ) : (
                  company.name.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight">
                    {company.name}
                  </h1>
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Verified
                  </span>
                </div>
                <div className="text-xs text-indigo-200 mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono">
                  {company.gstin && <span>GSTIN: {company.gstin}</span>}
                  {company.phone && <span>📞 {company.phone}</span>}
                  {company.address && <span>📍 {company.address}</span>}
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-white/10 border border-white/20 text-indigo-100">
                SharedLedger™ Portal
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-4 space-y-5">
        {/* Statement Summary Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-lg border border-slate-200/80 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Statement Issued For
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                {party.name}
                <span className="text-xs font-semibold px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                  {party.type || "CUSTOMER"}
                </span>
              </h2>
              <div className="text-xs text-slate-500 mt-1 font-mono">
                {party.phone && <span>Registered Mobile: {party.phone}</span>}
                {party.gstin && <span> • GST: {party.gstin}</span>}
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Current Net Balance
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold mt-0.5">
                {isPendingPay ? (
                  <span className="text-emerald-600">
                    ₹{balance.toLocaleString("en-IN")}{" "}
                    <span className="text-xs font-bold text-emerald-500 block sm:inline">
                      (Outstanding Due)
                    </span>
                  </span>
                ) : isAdvance ? (
                  <span className="text-rose-600">
                    ₹{Math.abs(balance).toLocaleString("en-IN")}{" "}
                    <span className="text-xs font-bold text-rose-500 block sm:inline">
                      (Advance Balance)
                    </span>
                  </span>
                ) : (
                  <span className="text-slate-600">₹0.00 (All Cleared)</span>
                )}
              </div>
            </div>
          </div>

          {/* Instant Payment / Settlement Box (If balance is due) */}
          {isPendingPay && (
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 rounded-2xl p-5 border border-emerald-200/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Instant Online Settlement
                  </h3>
                </div>
                <p className="text-xs text-slate-600 max-w-md">
                  Pay directly to <strong>{company.name}</strong> using any UPI App
                  (GPay, PhonePe, Paytm, BHIM) or Bank Transfer.
                </p>
                {company.upiId && (
                  <div className="flex items-center gap-2 mt-2 pt-1">
                    <span className="text-[11px] font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-bold text-slate-800">
                      UPI ID: {company.upiId}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(company.upiId!, "upi")}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                    >
                      {copiedKey === "upi" ? "✓ Copied!" : "Copy"}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {upiPayUrl && (
                  <a
                    href={upiPayUrl}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-1.5"
                  >
                    <span>📱</span> Pay ₹{balance.toLocaleString("en-IN")} via UPI
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Bank Transfer Details (Collapsible or visible) */}
          {company.bankDetails?.accountNo && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <span>🏦</span> Bank Transfer (NEFT/RTGS/IMPS):
              </div>
              <div className="flex flex-wrap items-center gap-3 font-mono">
                <span>
                  <strong>A/C:</strong> {company.bankDetails.accountNo}
                </span>
                <span>
                  <strong>IFSC:</strong> {company.bankDetails.ifsc || "—"}
                </span>
                <span>
                  <strong>Bank:</strong> {company.bankDetails.bankName || "—"}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    `Account: ${company.bankDetails?.accountNo}
IFSC: ${company.bankDetails?.ifsc}
Bank: ${company.bankDetails?.bankName}`,
                    "bank",
                  )
                }
                className="text-indigo-600 font-bold hover:underline cursor-pointer"
              >
                {copiedKey === "bank" ? "✓ Details Copied" : "Copy Bank Details"}
              </button>
            </div>
          )}
        </div>

        {/* Transactions Table Section */}
        <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-200/80 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Transaction History & Ledger Statement
              </h3>
              <p className="text-xs text-slate-500">
                All invoices, purchases, payments, and credit notes
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                {[
                  { id: "ALL", label: "All Time" },
                  { id: "30DAYS", label: "Last 30 Days" },
                  { id: "90DAYS", label: "Last 90 Days" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilterPeriod(f.id as any)}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      filterPeriod === f.id
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1"
                title="Print or Save as PDF"
              >
                🖨️ Print
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            {filteredTransactions.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No transactions found for this period.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Voucher Number</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5 text-right">Debit (₹)</th>
                    <th className="p-3.5 text-right">Credit (₹)</th>
                    <th className="p-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 text-slate-600 whitespace-nowrap">
                        {new Date(t.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-slate-900">
                        {t.voucherNumber}
                      </td>
                      <td className="p-3.5 text-slate-700">
                        {t.typeLabel || t.type}
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-900">
                        {t.debit > 0 ? `₹${t.debit.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="p-3.5 text-right font-bold text-emerald-600">
                        {t.credit > 0 ? `₹${t.credit.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="p-3.5 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700"
                              : t.status === "PARTIAL"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {t.status || "CONFIRMED"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Sync Timestamp Footer */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
            <div>
              Synchronized live: {new Date(data.syncTime).toLocaleString("en-IN")}
            </div>
            {company.phone && (
              <div>
                Have a question?{" "}
                <a
                  href={`https://wa.me/91${company.phone.replace(/[^0-9]/g, "").slice(-10)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 font-bold hover:underline"
                >
                  💬 Chat with {company.name} on WhatsApp
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
