"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";

interface SharedLedgerSummary {
  totalParties: number;
  connectedCount: number;
  invitedCount: number;
  unlinkedCount: number;
  autoPairedCount: number;
  totalReceivable: number;
  totalPayable: number;
  reconciliationRate: number;
}

interface SharedLedgerParty {
  id: string;
  name: string;
  nameGujarati?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  type: "CUSTOMER" | "SUPPLIER" | "BOTH";
  stateCode?: string;
  billingAddress?: any;
  balance: number;
  status: "CONNECTED" | "INVITED" | "NOT_LINKED";
  isAutoPaired: boolean;
  token: string;
  portalUrl: string;
  fullPortalUrl: string;
  whatsappUrl?: string | null;
  invitedAt?: string | null;
  lastViewedAt?: string | null;
  lastActivityDate?: string | null;
  totalInvoices: number;
}

interface VoucherItem {
  id: string;
  type: string;
  typeLabel: string;
  voucherNumber: string;
  date: string;
  debit: number;
  credit: number;
  amount: number;
  status?: string;
}

export default function SharedLedgerPage() {
  const [summary, setSummary] = useState<SharedLedgerSummary | null>(null);
  const [parties, setParties] = useState<SharedLedgerParty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "CUSTOMER" | "SUPPLIER" | "INVITED" | "CONNECTED">("ALL");
  const [lang] = useState<"en" | "gu">("en");

  // Drawer / Modals State
  const [selectedParty, setSelectedParty] = useState<SharedLedgerParty | null>(null);
  const [partyTransactions, setPartyTransactions] = useState<VoucherItem[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleParty, setSettleParty] = useState<SharedLedgerParty | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleMode, setSettleMode] = useState<"CASH" | "BANK_TRANSFER" | "UPI" | "CHEQUE">("UPI");
  const [settleNotes, setSettleNotes] = useState("");
  const [isSubmittingSettle, setIsSubmittingSettle] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [sumRes, partiesRes] = await Promise.all([
        apiClient.get<SharedLedgerSummary>("/shared-ledger/summary").catch(() => null),
        apiClient.get<{ items: SharedLedgerParty[] }>("/shared-ledger/parties?limit=100").catch(() => ({ items: [] })),
      ]);

      if (sumRes) setSummary(sumRes);
      if (partiesRes?.items) setParties(partiesRes.items);
    } catch {
      showToast("Failed to sync shared ledgers. Please retry.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load detailed transactions when drawer opens
  useEffect(() => {
    if (!selectedParty) {
      setPartyTransactions([]);
      return;
    }
    setIsLoadingTransactions(true);
    apiClient
      .get<{ transactions: VoucherItem[] }>(`/shared-ledger/public/${selectedParty.token}`)
      .then((res) => {
        setPartyTransactions(res.transactions || []);
      })
      .catch(() => {
        setPartyTransactions([]);
      })
      .finally(() => setIsLoadingTransactions(false));
  }, [selectedParty]);

  const handleCopyLink = (party: SharedLedgerParty) => {
    const fullUrl = `${window.location.origin}${party.portalUrl}`;
    navigator.clipboard.writeText(fullUrl);
    showToast(`✓ Copied live portal link for ${party.name}`);
  };

  const handleOpenSettle = (party: SharedLedgerParty) => {
    setSettleParty(party);
    setSettleAmount(Math.abs(party.balance));
    setSettleNotes(`SharedLedger balance settlement for ${party.name}`);
    setShowSettleModal(true);
  };

  const handleConfirmSettle = async () => {
    if (!settleParty || settleAmount <= 0) return;
    setIsSubmittingSettle(true);
    try {
      await apiClient.post("/shared-ledger/settle", {
        partyId: settleParty.id,
        amount: settleAmount,
        paymentMode: settleMode,
        notes: settleNotes,
      });
      showToast(`✓ Balance settlement of ₹${settleAmount.toLocaleString("en-IN")} recorded.`);
      setShowSettleModal(false);
      loadData(true);
    } catch {
      showToast("Failed to record settlement. Try again.");
    } finally {
      setIsSubmittingSettle(false);
    }
  };

  const filteredParties = useMemo(() => {
    return parties.filter((p) => {
      if (activeTab === "CUSTOMER" && p.type !== "CUSTOMER" && p.type !== "BOTH") return false;
      if (activeTab === "SUPPLIER" && p.type !== "SUPPLIER" && p.type !== "BOTH") return false;
      if (activeTab === "CONNECTED" && p.status !== "CONNECTED") return false;
      if (activeTab === "INVITED" && p.status !== "INVITED") return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.nameGujarati && p.nameGujarati.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q)) ||
        (p.gstin && p.gstin.toLowerCase().includes(q))
      );
    });
  }, [parties, activeTab, search]);

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 text-sm font-medium">
          <span className="text-emerald-400 font-bold">●</span>
          {toastMessage}
        </div>
      )}

      {/* Hero Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-700/50">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Live Connected
              </span>
              <span className="text-xs text-indigo-200 font-medium">
                Matching MyBillBook SharedLedger™ Ecosystem
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              {lang === "gu" ? "શેર્ડ લેજર (Shared Ledger)" : "Shared Ledger™ Live Sync"}
            </h1>
            <p className="text-sm sm:text-base text-indigo-100 font-normal leading-relaxed">
              {lang === "gu"
                ? "તમારા ગ્રાહકો અને વેપારીઓ સાથે લાઇવ બિલ અને પેમેન્ટ સિંક કરો. કોઈ પણ મિસમેચ વગર એક ક્લિકમાં લેણદેણની ચોખવટ."
                : "Real-time synchronization of invoices, bills, and payments between you and your parties. Zero disputes, instant statements, and transparent settlements."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setShowHowItWorks(true)}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold backdrop-blur border border-white/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>💡</span>
              {lang === "gu" ? "આ કેવી રીતે કામ કરે છે?" : "How It Works"}
            </button>

            <button
              type="button"
              disabled={isRefreshing}
              onClick={() => loadData(true)}
              className="px-4 py-2.5 rounded-2xl bg-white text-indigo-900 hover:bg-indigo-50 text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span className={isRefreshing ? "animate-spin" : ""}>🔄</span>
              {isRefreshing ? "Syncing..." : lang === "gu" ? "લાઇવ રિફ્રેશ" : "Refresh Live"}
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -top-20 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Connected Ledgers */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {lang === "gu" ? "જોડાયેલ ખાતાઓ" : "Connected Ledgers"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg font-bold">
              🔗
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {summary ? summary.connectedCount : "—"}
            </span>
            <span className="text-xs text-emerald-600 font-semibold flex items-center">
              ● Active Sync
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Out of {summary?.totalParties || 0} total registered parties
          </p>
        </div>

        {/* 2. Total Receivables */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {lang === "gu" ? "કુલ લેવાના (Receivable)" : "Live Receivables"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg font-bold">
              ₹
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
              ₹{summary ? summary.totalReceivable.toLocaleString("en-IN") : "0"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Pending dues from customer accounts
          </p>
        </div>

        {/* 3. Total Payables */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {lang === "gu" ? "કુલ આપવાના (Payable)" : "Live Payables"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg font-bold">
              💳
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600">
              ₹{summary ? summary.totalPayable.toLocaleString("en-IN") : "0"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Outstanding balance payable to suppliers
          </p>
        </div>

        {/* 4. Auto-Paired Rate */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {lang === "gu" ? "ઓટો-પેર થયેલ" : "Auto-Paired Rate"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg font-bold">
              ⚡
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-purple-600">
              {summary ? `${summary.reconciliationRate}%` : "—"}
            </span>
            <span className="text-xs text-slate-500">Reconciled</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {summary?.invitedCount || 0} invitations waiting for party open
          </p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Navigation Tabs and Search */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: "ALL", label: "All Ledgers", count: parties.length },
              {
                id: "CUSTOMER",
                label: "Customers",
                count: parties.filter((p) => p.type === "CUSTOMER" || p.type === "BOTH").length,
              },
              {
                id: "SUPPLIER",
                label: "Suppliers",
                count: parties.filter((p) => p.type === "SUPPLIER" || p.type === "BOTH").length,
              },
              {
                id: "CONNECTED",
                label: "Live Connected",
                count: parties.filter((p) => p.status === "CONNECTED").length,
              },
              {
                id: "INVITED",
                label: "Invited",
                count: parties.filter((p) => p.status === "INVITED").length,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                    activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px] sm:min-w-[300px]">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, GSTIN..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-20 text-center text-slate-500 text-xs sm:text-sm">
              <span className="inline-block animate-spin text-xl mb-2">⏳</span>
              <p>Connecting and loading live shared ledgers...</p>
            </div>
          ) : filteredParties.length === 0 ? (
            <div className="py-20 text-center">
              <div className="text-4xl mb-3">🤝</div>
              <h3 className="text-sm font-bold text-slate-800">
                {lang === "gu" ? "કોઈ પાર્ટી મળી નથી" : "No Shared Ledgers Found"}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {search
                  ? "Try adjusting your search criteria"
                  : "Invite your customers or suppliers to start live sync of bills & payments."}
              </p>
              <Link
                href="/masters/parties"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                + Add / Manage Parties
              </Link>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="p-4">Party Details</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Live Balance</th>
                  <th className="p-4">Shared Status</th>
                  <th className="p-4">Last Activity</th>
                  <th className="p-4 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredParties.map((p) => {
                  const isReceivable = p.balance > 0;
                  const isPayable = p.balance < 0;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-indigo-50/30 transition-colors group"
                    >
                      {/* Party Info */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-sm">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                              <span>{p.name}</span>
                              {p.nameGujarati && (
                                <span className="text-xs text-slate-400 font-normal">
                                  ({p.nameGujarati})
                                </span>
                              )}
                            </div>
                            <div className="text-slate-500 text-[11px] flex items-center gap-2 mt-0.5 font-mono">
                              {p.phone && <span>📞 {p.phone}</span>}
                              {p.gstin && (
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                  GST: {p.gstin}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Party Type */}
                      <td className="p-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            p.type === "CUSTOMER"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : p.type === "SUPPLIER"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-purple-50 text-purple-700 border border-purple-200"
                          }`}
                        >
                          {p.type}
                        </span>
                      </td>

                      {/* Balance */}
                      <td className="p-4">
                        <div className="font-extrabold text-sm">
                          {isReceivable && (
                            <span className="text-emerald-600">
                              ₹{p.balance.toLocaleString("en-IN")}{" "}
                              <span className="text-[10px] font-semibold text-emerald-500">
                                (You'll Get)
                              </span>
                            </span>
                          )}
                          {isPayable && (
                            <span className="text-rose-600">
                              ₹{Math.abs(p.balance).toLocaleString("en-IN")}{" "}
                              <span className="text-[10px] font-semibold text-rose-500">
                                (You'll Pay)
                              </span>
                            </span>
                          )}
                          {!isReceivable && !isPayable && (
                            <span className="text-slate-400 font-normal">
                              ₹0.00 (Settled)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {p.totalInvoices} total transactions recorded
                        </div>
                      </td>

                      {/* Shared Status */}
                      <td className="p-4">
                        {p.status === "CONNECTED" ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Live Connected
                          </div>
                        ) : p.status === "INVITED" ? (
                          <div className="flex items-center gap-1.5 text-amber-600 font-medium text-xs">
                            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                            Invitation Pending
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-400 font-normal text-xs">
                            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                            Not Linked
                          </div>
                        )}
                        {p.lastViewedAt && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Viewed: {new Date(p.lastViewedAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>

                      {/* Last Activity */}
                      <td className="p-4 text-slate-500 text-xs">
                        {p.lastActivityDate
                          ? new Date(p.lastActivityDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>

                      {/* Quick Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Live Portal */}
                          <Link
                            href={p.portalUrl}
                            target="_blank"
                            title="Open Customer Live Portal"
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors flex items-center gap-1"
                          >
                            <span>🔗</span>
                            <span className="hidden sm:inline">Portal</span>
                          </Link>

                          {/* WhatsApp Invite / Share */}
                          {p.whatsappUrl && (
                            <a
                              href={p.whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Share Live Statement on WhatsApp"
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition-colors flex items-center gap-1"
                            >
                              <span>💬</span>
                              <span className="hidden sm:inline">WhatsApp</span>
                            </a>
                          )}

                          {/* Copy Link */}
                          <button
                            type="button"
                            onClick={() => handleCopyLink(p)}
                            title="Copy Live Portal URL"
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                          >
                            📋
                          </button>

                          {/* Detailed Statement Drawer */}
                          <button
                            type="button"
                            onClick={() => setSelectedParty(p)}
                            title="View Full Ledger Statement"
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                          >
                            Statement →
                          </button>

                          {/* Settle */}
                          {p.balance !== 0 && (
                            <button
                              type="button"
                              onClick={() => handleOpenSettle(p)}
                              title="Record Settlement"
                              className="px-2 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs transition-colors cursor-pointer"
                            >
                              Settle
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* DRAWER: DETAILED PARTY LEDGER STATEMENT */}
      {selectedParty && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">
                  {selectedParty.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    {selectedParty.name}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                      {selectedParty.type}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {selectedParty.phone || "No phone"} • {selectedParty.gstin || "Unregistered"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedParty(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Live Balance Card */}
            <div className="p-5 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Current Live Statement Balance
                </span>
                <div className="text-2xl font-extrabold mt-0.5">
                  {selectedParty.balance > 0 ? (
                    <span className="text-emerald-600">
                      ₹{selectedParty.balance.toLocaleString("en-IN")}{" "}
                      <span className="text-xs font-semibold">(Receivable)</span>
                    </span>
                  ) : selectedParty.balance < 0 ? (
                    <span className="text-rose-600">
                      ₹{Math.abs(selectedParty.balance).toLocaleString("en-IN")}{" "}
                      <span className="text-xs font-semibold">(Payable)</span>
                    </span>
                  ) : (
                    <span className="text-slate-500">₹0.00 (Balanced)</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={selectedParty.portalUrl}
                  target="_blank"
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                >
                  🔗 Open Portal
                </Link>
                {selectedParty.whatsappUrl && (
                  <a
                    href={selectedParty.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                  >
                    💬 WhatsApp
                  </a>
                )}
              </div>
            </div>

            {/* Vouchers List */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Chronological Transaction History
                </h4>
                <span className="text-xs text-slate-400">
                  {partyTransactions.length} vouchers
                </span>
              </div>

              {isLoadingTransactions ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Loading vouchers and running balance...
                </div>
              ) : partyTransactions.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  No vouchers recorded for this party yet.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Voucher #</th>
                        <th className="p-3">Type</th>
                        <th className="p-3 text-right">Debit</th>
                        <th className="p-3 text-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {partyTransactions.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50/60">
                          <td className="p-3 text-slate-500 whitespace-nowrap">
                            {new Date(v.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-800">
                            {v.voucherNumber}
                          </td>
                          <td className="p-3 text-slate-600 text-[11px]">
                            {v.typeLabel || v.type}
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900">
                            {v.debit > 0 ? `₹${v.debit.toLocaleString("en-IN")}` : "—"}
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-600">
                            {v.credit > 0 ? `₹${v.credit.toLocaleString("en-IN")}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleCopyLink(selectedParty)}
                className="px-3.5 py-2 border border-slate-300 hover:bg-white text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                📋 Copy Portal Link
              </button>
              <button
                type="button"
                onClick={() => handleOpenSettle(selectedParty)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
              >
                ⚖️ Record Settlement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SETTLE BALANCE */}
      {showSettleModal && settleParty && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Record Balance Settlement
                </h3>
                <p className="text-xs text-slate-500">{settleParty.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSettleModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  Settlement Amount (₹)
                </label>
                <input
                  type="number"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-base focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  Payment Mode
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["UPI", "CASH", "BANK_TRANSFER", "CHEQUE"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSettleMode(m)}
                      className={`py-2 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
                        settleMode === m
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {m === "BANK_TRANSFER" ? "BANK" : m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  Notes / Reference
                </label>
                <input
                  type="text"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  placeholder="e.g. UTR / UPI reference number"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSettleModal(false)}
                className="px-4 py-2 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingSettle || settleAmount <= 0}
                onClick={handleConfirmSettle}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmittingSettle ? "Saving..." : "Confirm Settlement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: HOW IT WORKS */}
      {showHowItWorks && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🔗</span>
                <h3 className="font-extrabold text-slate-900 text-lg">
                  How SharedLedger™ Works
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHowItWorks(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <h4 className="font-bold text-slate-900 mb-0.5">Automatic Live Sync</h4>
                  <p className="text-xs text-slate-600">
                    Whenever you generate a sales invoice, payment receipt, or return, your party's statement updates instantly in real time.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <h4 className="font-bold text-slate-900 mb-0.5">Self-Service Customer Portal</h4>
                  <p className="text-xs text-slate-600">
                    Your parties can open their secure portal link anytime from WhatsApp or SMS to view outstanding dues, check itemized bills, and download invoices.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-purple-50/60 border border-purple-100">
                <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <h4 className="font-bold text-slate-900 mb-0.5">Instant Reconciliation & Payment</h4>
                  <p className="text-xs text-slate-600">
                    Parties can pay directly using your integrated UPI QR code or bank transfer, and balance reconciles automatically.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHowItWorks(false)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
            >
              Got it, let's connect!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
