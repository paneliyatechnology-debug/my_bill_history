"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { apiClient, extractList } from "@/lib/api-client";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/badge";
import { DataTable, ColumnDef } from "@/components/ui/data-table";

interface LedgerAccount {
  id: string;
  code: string;
  name: string;
  nameGujarati?: string;
  groupId: string;
  group?: {
    name: string;
    nature?: string;
    classification?: string;
  };
  openingBalance: number;
  openingBalanceType: "DEBIT" | "CREDIT";
  currentBalance?: number;
  isActive: boolean;
  isBankLedger?: boolean;
  isCashLedger?: boolean;
}

interface GroupOption {
  id: string;
  name: string;
  nature?: string;
  classification?: string;
}

export default function FinanceLedgersPage() {
  const { lang, tenantContext } = useAuth();
  const [ledgers, setLedgers] = useState<LedgerAccount[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "BANK" | "CASH" | "EXPENSE" | "INCOME" | "CUSTOMERS_SUPPLIERS">("ALL");
  const [groupFilter, setGroupFilter] = useState("ALL");

  // Create Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    nameGujarati: "",
    groupId: "",
    openingBalance: 0,
    openingBalanceType: "DEBIT" as "DEBIT" | "CREDIT",
  });

  // Edit Modal
  const [editingLedger, setEditingLedger] = useState<LedgerAccount | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    nameGujarati: "",
    isActive: true,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ledgersRes, groupsRes]: any = await Promise.all([
        apiClient.get("/ledgers"),
        apiClient.get("/ledger-groups").catch(() => []),
      ]);
      setLedgers(extractList<LedgerAccount>(ledgersRes));
      setGroups(extractList<GroupOption>(groupsRes));
    } catch (err: any) {
      setError(err.message || "Failed to load ledger accounts.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchData();
    }
  }, [tenantContext.companyId, fetchData]);

  // Seed COA if empty
  const [isSeeding, setIsSeeding] = useState(false);
  const handleSeedCOA = async () => {
    setIsSeeding(true);
    try {
      await apiClient.post("/ledger-groups/seed", {});
      setToastMessage(lang === "gu" ? "પ્રમાણભૂત ખાતાવહી સફળતાપૂર્વક તૈયાર થઈ ગઈ!" : "Standard Chart of Accounts seeded!");
      setTimeout(() => setToastMessage(null), 4000);
      await fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to seed accounts.");
    } finally {
      setIsSeeding(false);
    }
  };

  // KPIs
  const kpis = useMemo(() => {
    let cashTotal = 0;
    let bankTotal = 0;

    ledgers.forEach((l) => {
      const gName = l.group?.name?.toLowerCase() || "";
      const isCash = l.isCashLedger || gName.includes("cash") || l.name.toLowerCase().includes("cash") || l.name.includes("રોકડ");
      const isBank = l.isBankLedger || gName.includes("bank") || l.name.toLowerCase().includes("bank") || l.name.includes("બેંક");

      const bal = Number(l.currentBalance || l.openingBalance || 0);

      if (isCash) cashTotal += bal;
      if (isBank) bankTotal += bal;
    });

    return {
      cashTotal,
      bankTotal,
      totalCount: ledgers.length,
      activeCount: ledgers.filter((l) => l.isActive).length,
    };
  }, [ledgers]);

  // Filtered List
  const filteredLedgers = useMemo(() => {
    return ledgers.filter((l) => {
      const gName = l.group?.name?.toLowerCase() || "";
      const gNature = l.group?.nature || "";
      const accName = l.name.toLowerCase();

      // Tab filter
      if (activeTab === "BANK") {
        const isBank = l.isBankLedger || gName.includes("bank") || accName.includes("bank") || l.name.includes("બેંક");
        if (!isBank) return false;
      } else if (activeTab === "CASH") {
        const isCash = l.isCashLedger || gName.includes("cash") || accName.includes("cash") || l.name.includes("રોકડ");
        if (!isCash) return false;
      } else if (activeTab === "EXPENSE") {
        const isExp = gNature === "EXPENSE" || gName.includes("expense");
        if (!isExp) return false;
      } else if (activeTab === "INCOME") {
        const isInc = gNature === "INCOME" || gName.includes("income") || gName.includes("sales");
        if (!isInc) return false;
      } else if (activeTab === "CUSTOMERS_SUPPLIERS") {
        const isParty = gName.includes("debtor") || gName.includes("creditor") || gName.includes("party") || gName.includes("customer") || gName.includes("supplier");
        if (!isParty) return false;
      }

      // Group dropdown filter
      if (groupFilter !== "ALL" && l.groupId !== groupFilter) return false;

      // Search term
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const matchesCode = l.code?.toLowerCase().includes(s);
        const matchesName = l.name?.toLowerCase().includes(s);
        const matchesGu = l.nameGujarati?.toLowerCase().includes(s);
        const matchesGroup = l.group?.name?.toLowerCase().includes(s);
        if (!matchesCode && !matchesName && !matchesGu && !matchesGroup) return false;
      }

      return true;
    });
  }, [ledgers, activeTab, groupFilter, searchTerm]);

  // Handle Create
  const handleCreateLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (!formData.name.trim()) {
        throw new Error(lang === "gu" ? "ખાતાનું નામ જરૂરી છે." : "Account name is required.");
      }

      const gid = formData.groupId || (groups[0]?.id as string);
      if (!gid) {
        throw new Error(lang === "gu" ? "લેજર ગ્રૂપ પસંદ કરો." : "Please select a ledger group.");
      }

      await apiClient.post("/ledgers", {
        code: formData.code.trim(),
        name: formData.name.trim(),
        nameGujarati: formData.nameGujarati.trim() || undefined,
        groupId: gid,
        openingBalance: Number(formData.openingBalance) || 0,
        openingBalanceType: formData.openingBalanceType,
      });

      setIsCreateModalOpen(false);
      setToastMessage(lang === "gu" ? "ખાતું સફળતાપૂર્વક ઉમેરાયું છે!" : "Ledger account created successfully!");
      setTimeout(() => setToastMessage(null), 4000);
      await fetchData();
    } catch (err: any) {
      setFormError(err.message || "Failed to create ledger account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit
  const handleUpdateLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLedger) return;

    setEditError(null);
    setIsEditing(true);

    try {
      await apiClient.patch(`/ledgers/${editingLedger.id}`, {
        name: editFormData.name.trim(),
        nameGujarati: editFormData.nameGujarati.trim() || undefined,
        isActive: editFormData.isActive,
      });

      setEditingLedger(null);
      setToastMessage(lang === "gu" ? "ખાતાની વિગતો અપડેટ થઈ ગઈ!" : "Ledger account updated successfully!");
      setTimeout(() => setToastMessage(null), 4000);
      await fetchData();
    } catch (err: any) {
      setEditError(err.message || "Failed to update ledger account.");
    } finally {
      setIsEditing(false);
    }
  };

  // Toggle active status
  const handleToggleStatus = async (ledger: LedgerAccount) => {
    try {
      if (ledger.isActive) {
        await apiClient.delete(`/ledgers/${ledger.id}`);
      } else {
        await apiClient.patch(`/ledgers/${ledger.id}`, { isActive: true });
      }
      setToastMessage(lang === "gu" ? "સ્થિતિ અપડેટ થઈ ગઈ!" : "Status updated!");
      setTimeout(() => setToastMessage(null), 3000);
      await fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to change status.");
    }
  };

  const columns: ColumnDef<LedgerAccount>[] = [
    {
      header: lang === "gu" ? "ખાતા કોડ" : "Account Code",
      accessorKey: "code",
      sortable: true,
      cell: (l) => (
        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">
          {l.code}
        </span>
      ),
    },
    {
      header: lang === "gu" ? "ખાતાનું નામ" : "Account Name",
      accessorKey: "name",
      sortable: true,
      cell: (l) => (
        <div>
          <div className="font-bold text-slate-900">{l.name}</div>
          {l.nameGujarati && (
            <div className="text-[11px] font-medium text-slate-500">
              {l.nameGujarati}
            </div>
          )}
        </div>
      ),
    },
    {
      header: lang === "gu" ? "જૂથ / વર્ગ" : "Ledger Group",
      accessorKey: "groupId",
      sortable: true,
      cell: (l) => (
        <div>
          <div className="font-semibold text-slate-700 text-xs">
            {l.group?.name || "Standard Group"}
          </div>
          {l.group?.nature && (
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              {l.group.nature}
            </span>
          )}
        </div>
      ),
    },
    {
      header: lang === "gu" ? "શરૂઆતની સિલક (₹)" : "Opening Balance",
      accessorKey: "openingBalance",
      sortable: true,
      className: "text-right",
      cell: (l) => (
        <span className="font-mono text-slate-700 text-xs">
          ₹{Number(l.openingBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}{" "}
          <span className="text-[10px] text-slate-400 font-sans">
            ({l.openingBalanceType === "DEBIT" ? "Dr" : "Cr"})
          </span>
        </span>
      ),
    },
    {
      header: lang === "gu" ? "વર્તમાન સિલક (Live Balance)" : "Current Balance",
      accessorKey: "currentBalance",
      sortable: true,
      className: "text-right",
      cell: (l) => {
        const bal = Number(l.currentBalance ?? l.openingBalance ?? 0);
        const isPos = bal >= 0;
        return (
          <span
            className={`font-mono font-bold text-sm ${
              isPos ? "text-emerald-700" : "text-rose-600"
            }`}
          >
            ₹{Math.abs(bal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}{" "}
            <span className="text-[10px] font-sans font-semibold">
              {bal >= 0 ? "Dr" : "Cr"}
            </span>
          </span>
        );
      },
    },
    {
      header: lang === "gu" ? "સ્થિતિ" : "Status",
      accessorKey: "isActive",
      cell: (l) => (
        <StatusBadge status={l.isActive ? "ACTIVE" : "INACTIVE"} />
      ),
    },
    {
      header: lang === "gu" ? "ક્રિયા" : "Action",
      className: "text-right",
      cell: (l) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            href={`/reports?tab=party-ledger&partyId=${l.id}`}
            className="p-1.5 text-xs text-primary hover:bg-primary/10 rounded-lg font-semibold transition-colors"
            title="View Ledger Statement"
          >
            {lang === "gu" ? "ખાતાવહી" : "Statement"}
          </Link>
          <button
            onClick={() => {
              setEditingLedger(l);
              setEditFormData({
                name: l.name,
                nameGujarati: l.nameGujarati || "",
                isActive: l.isActive,
              });
              setEditError(null);
            }}
            className="p-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-semibold transition-colors"
            title="Edit Ledger"
          >
            {lang === "gu" ? "સુધારો" : "Edit"}
          </button>
          <button
            onClick={() => handleToggleStatus(l)}
            className={`p-1.5 text-xs rounded-lg font-semibold transition-colors ${
              l.isActive
                ? "text-rose-600 hover:bg-rose-50"
                : "text-emerald-600 hover:bg-emerald-50"
            }`}
            title={l.isActive ? "Deactivate" : "Activate"}
          >
            {l.isActive
              ? lang === "gu" ? "નિષ્ક્રિય" : "Disable"
              : lang === "gu" ? "સક્રિય" : "Enable"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in text-xs font-semibold">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-border shadow-subtle">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/finance/vouchers"
              className="text-xs font-semibold text-muted hover:text-primary flex items-center gap-1"
            >
              <span>←</span>
              <span>{lang === "gu" ? "રોજમેળ & વાઉચરો" : "Cash Book & Vouchers"}</span>
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {lang === "gu"
              ? "બેંક ખાતા અને ખાતાવહી (Bank & Ledger Accounts)"
              : "Bank & Ledger Accounts Register"}
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            {lang === "gu"
              ? "રોકડ, બેંક, ગ્રાહકો, સપ્લાયર્સ અને ખર્ચના ખાતાઓનું લાઈવ સિલક સંચાલન"
              : "Live balances, double-entry accounts, and chart of accounts management"}
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {ledgers.length === 0 && (
            <button
              onClick={handleSeedCOA}
              disabled={isSeeding}
              className="px-4 py-2.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all flex items-center gap-1.5"
            >
              {isSeeding ? "Seeding..." : "⚡ Seed Standard Chart of Accounts"}
            </button>
          )}

          <button
            onClick={() => {
              setFormData({
                code: `ACC-${Date.now().toString().slice(-4)}`,
                name: "",
                nameGujarati: "",
                groupId: groups[0]?.id || "",
                openingBalance: 0,
                openingBalanceType: "DEBIT",
              });
              setFormError(null);
              setIsCreateModalOpen(true);
            }}
            className="px-5 py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover active:bg-primary-pressed rounded-xl shadow-card hover:shadow-hover transition-all flex items-center gap-2"
          >
            <span>+</span>
            <span>{lang === "gu" ? "નવું ખાતું બનાવો" : "Create New Ledger"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <span>{lang === "gu" ? "કુલ રોકડ સિલક" : "Cash in Hand"}</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-sm">💵</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            ₹{kpis.cashTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            {lang === "gu" ? "રોકડ ખાતાઓની કુલ સિલક" : "Sum of all cash registers"}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <span>{lang === "gu" ? "કુલ બેંક સિલક" : "Total Bank Balances"}</span>
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm">🏦</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            ₹{kpis.bankTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            {lang === "gu" ? "તમામ બેંક ખાતાઓની સિલક" : "Sum across all active banks"}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <span>{lang === "gu" ? "કુલ સક્રિય ખાતાઓ" : "Active Ledgers"}</span>
            <span className="p-1.5 bg-violet-50 text-violet-600 rounded-lg text-sm">📑</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {kpis.activeCount} <span className="text-sm font-normal text-slate-400">/ {kpis.totalCount}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            {lang === "gu" ? "સંચાલનમાં રહેલ ખાતાઓ" : "Active ledger accounts"}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <span>{lang === "gu" ? "ખાતાવહી ગ્રૂપ્સ" : "Chart of Accounts Groups"}</span>
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg text-sm">📂</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {groups.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            {lang === "gu" ? "નામા પેટા જૂથો" : "Standard balance sheet groups"}
          </p>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {lang === "gu" ? "બધા (All)" : "All Ledgers"}
          </button>
          <button
            onClick={() => setActiveTab("BANK")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "BANK" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🏦 {lang === "gu" ? "બેંક ખાતા" : "Banks"}
          </button>
          <button
            onClick={() => setActiveTab("CASH")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "CASH" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            💵 {lang === "gu" ? "રોકડ ખાતા" : "Cash"}
          </button>
          <button
            onClick={() => setActiveTab("EXPENSE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "EXPENSE" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📋 {lang === "gu" ? "ખર્ચાઓ" : "Expenses"}
          </button>
          <button
            onClick={() => setActiveTab("INCOME")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "INCOME" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📈 {lang === "gu" ? "આવક / વેચાણ" : "Income"}
          </button>
          <button
            onClick={() => setActiveTab("CUSTOMERS_SUPPLIERS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "CUSTOMERS_SUPPLIERS" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            👥 {lang === "gu" ? "ગ્રાહક / સપ્લાયર" : "Parties"}
          </button>
        </div>

        {/* Search and Group Dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px]">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              🔍
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={lang === "gu" ? "ખાતું શોધો..." : "Search accounts..."}
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary outline-none"
            />
          </div>

          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none focus:bg-white focus:border-primary"
          >
            <option value="ALL">{lang === "gu" ? "બધા જૂથ (All Groups)" : "All Groups"}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Ledgers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredLedgers}
          isLoading={isLoading}
          searchPlaceholder={lang === "gu" ? "ખાતા કોડ અથવા નામ શોધો..." : "Search ledgers..."}
        />
      </div>

      {/* Create Ledger Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={lang === "gu" ? "નવું ખાતું બનાવો (Create Ledger)" : "Create Ledger Account"}
      >
        <form onSubmit={handleCreateLedger} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {lang === "gu" ? "ખાતા કોડ *" : "Account Code *"}
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:bg-white focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {lang === "gu" ? "લેજર જૂથ (Group) *" : "Ledger Group *"}
              </label>
              <select
                required
                value={formData.groupId}
                onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-primary outline-none"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.nature || "ASSET"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {lang === "gu" ? "ખાતાનું નામ (ઇંગ્લિશમાં) *" : "Account Name (English) *"}
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. HDFC Current A/c, State Bank of India, Office Rent"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {lang === "gu" ? "ખાતાનું નામ (ગુજરાતીમાં)" : "Account Name (Gujarati)"}
            </label>
            <input
              type="text"
              value={formData.nameGujarati}
              onChange={(e) => setFormData({ ...formData, nameGujarati: e.target.value })}
              placeholder="દા.ત. એચડીએફસી બેંક ખાતું, દુકાન ભાડું"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:border-primary outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {lang === "gu" ? "શરૂઆતની સિલક (₹)" : "Opening Balance (₹)"}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.openingBalance}
                onChange={(e) => setFormData({ ...formData, openingBalance: Number(e.target.value) })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:bg-white focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {lang === "gu" ? "સિલક પ્રકાર" : "Balance Type"}
              </label>
              <select
                value={formData.openingBalanceType}
                onChange={(e: any) => setFormData({ ...formData, openingBalanceType: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-primary outline-none"
              >
                <option value="DEBIT">{lang === "gu" ? "ઉધાર (Dr - મિલકત/બેંક/ખર્ચ)" : "DEBIT (Dr - Asset/Bank/Expense)"}</option>
                <option value="CREDIT">{lang === "gu" ? "જમા (Cr - દેવું/આવક)" : "CREDIT (Cr - Liability/Income)"}</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              {lang === "gu" ? "રદ કરો" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover active:bg-primary-pressed rounded-xl shadow-card transition-all flex items-center gap-2"
            >
              {isSubmitting && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{lang === "gu" ? "ખાતું સાચવો" : "Save Account"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Ledger Modal */}
      <Modal
        isOpen={!!editingLedger}
        onClose={() => setEditingLedger(null)}
        title={
          editingLedger
            ? `${lang === "gu" ? "ખાતામાં ફેરફાર" : "Edit Account"} - ${editingLedger.code}`
            : ""
        }
      >
        {editingLedger && (
          <form onSubmit={handleUpdateLedger} className="space-y-4">
            {editError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                <span>⚠️</span>
                <span>{editError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {lang === "gu" ? "ખાતાનું નામ (ઇંગ્લિશમાં) *" : "Account Name (English) *"}
              </label>
              <input
                type="text"
                required
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {lang === "gu" ? "ખાતાનું નામ (ગુજરાતીમાં)" : "Account Name (Gujarati)"}
              </label>
              <input
                type="text"
                value={editFormData.nameGujarati}
                onChange={(e) => setEditFormData({ ...editFormData, nameGujarati: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:border-primary outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="editIsActive"
                checked={editFormData.isActive}
                onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4"
              />
              <label htmlFor="editIsActive" className="text-xs font-semibold text-slate-800">
                {lang === "gu" ? "આ ખાતું સક્રિય છે (Active)" : "Account is active for transactions"}
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingLedger(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                {lang === "gu" ? "રદ કરો" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={isEditing}
                className="px-6 py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover active:bg-primary-pressed rounded-xl shadow-card transition-all flex items-center gap-2"
              >
                {isEditing && (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>{lang === "gu" ? "ફેરફાર સાચવો" : "Update Account"}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
