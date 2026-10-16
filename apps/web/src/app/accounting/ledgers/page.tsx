"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";
import { Modal } from "../../../components/ui/modal";
import { StatusBadge } from "../../../components/ui/badge";
import { DataTable, ColumnDef } from "../../../components/ui/data-table";

interface LedgerAccount {
  id: string;
  code: string;
  name: string;
  nameGujarati?: string;
  groupId: string;
  group?: { name: string; classification: string };
  openingBalance: number;
  openingBalanceType: "DEBIT" | "CREDIT";
  currentBalance?: number;
  isActive: boolean;
}

interface GroupOption {
  id: string;
  name: string;
}

export default function LedgersPage() {
  const { lang, tenantContext } = useAuth();
  const [ledgers, setLedgers] = useState<LedgerAccount[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [groupFilter, setGroupFilter] = useState("ALL");
  const [specialFilter, setSpecialFilter] = useState<string>("ALL");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const f = sp.get("filter") || sp.get("type");
      if (f) setSpecialFilter(f.toLowerCase());
    }
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ledgersRes, groupsRes]: any = await Promise.all([
        apiClient.get("/ledgers"),
        apiClient.get("/ledger-groups"),
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

  const handleCreateLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await apiClient.post("/ledgers", {
        code: formData.code,
        name: formData.name,
        nameGujarati: formData.nameGujarati || undefined,
        groupId: formData.groupId || (groups[0]?.id as string),
        openingBalance: Number(formData.openingBalance) || 0,
        openingBalanceType: formData.openingBalanceType,
      });

      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setFormError(err.message || "Failed to create ledger account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = ledgers.filter((l) => {
    if (specialFilter === "cash_bank") {
      const isCashOrBank =
        Boolean((l as any).isCashLedger) ||
        Boolean((l as any).isBankLedger) ||
        l.group?.name?.toLowerCase().includes("cash") ||
        l.group?.name?.toLowerCase().includes("bank");
      if (!isCashOrBank) return false;
    }
    if (groupFilter !== "ALL" && l.groupId !== groupFilter) return false;
    return true;
  });

  const columns: ColumnDef<LedgerAccount>[] = [
    {
      header: lang === "gu" ? "ખાતા કોડ" : "Account Code",
      accessorKey: "code",
      sortable: true,
      cell: (l) => (
        <span className="font-mono font-bold text-slate-800">{l.code}</span>
      ),
    },
    {
      header: lang === "gu" ? "ખાતાનું નામ" : "Account Name",
      accessorKey: "name",
      sortable: true,
      cell: (l) => (
        <div>
          <div className="font-semibold text-slate-900">{l.name}</div>
          {l.nameGujarati && (
            <div className="text-[11px] font-normal text-slate-500">
              {l.nameGujarati}
            </div>
          )}
        </div>
      ),
    },
    {
      header: lang === "gu" ? "જૂથ" : "Ledger Group",
      accessorKey: "groupId",
      sortable: true,
      cell: (l) => (
        <span className="text-slate-600">{l.group?.name || "Standard Group"}</span>
      ),
    },
    {
      header: lang === "gu" ? "શરૂઆતની સિલક (₹)" : "Opening Balance (₹)",
      accessorKey: "openingBalance",
      sortable: true,
      className: "text-right",
      cell: (l) => (
        <span className="font-mono font-semibold text-slate-800">
          ₹{Number(l.openingBalance || 0).toFixed(2)}{" "}
          <span className="text-[10px] text-slate-500 font-normal">
            ({l.openingBalanceType === "DEBIT" ? "Dr" : "Cr"})
          </span>
        </span>
      ),
    },
    {
      header: lang === "gu" ? "સ્થિતિ" : "Status",
      accessorKey: "isActive",
      cell: (l) => (
        <StatusBadge status={l.isActive ? "ACTIVE" : "INACTIVE"} />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-border shadow-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {lang === "gu"
                ? "ખાતાઓનું રજિસ્ટર (Ledger Accounts)"
                : "Ledger Accounts Register"}
            </h1>
          </div>
          <p className="text-xs text-muted mt-1">
            {lang === "gu"
              ? "રોકડ, બેંક, ગ્રાહકો, સપ્લાયર્સ અને ખર્ચના ખાતાઓ"
              : "Manage individual ledgers, opening balances, and double-entry postings"}
          </p>
        </div>

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
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-pressed text-white text-xs sm:text-sm font-bold rounded-xl shadow-card hover:shadow-hover transition-all"
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
              strokeWidth={2.5}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>{lang === "gu" ? "નવું ખાતું ખોલો" : "Create Ledger"}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-medium">
          {error}
        </div>
      )}

      {specialFilter === "cash_bank" && (
        <div className="flex items-center justify-between p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-800">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
            <span>
              {lang === "gu"
                ? "રોકડ અને બેંક ખાતા ફિલ્ટર સક્રિય છે (Cash & Bank Accounts Filter Active)"
                : "Filtered: Showing only Cash & Bank accounts"}
            </span>
          </div>
          <button
            onClick={() => setSpecialFilter("ALL")}
            className="text-xs font-bold text-sky-700 hover:text-sky-900 underline ml-2"
          >
            {lang === "gu" ? "બધા ખાતાઓ બતાવો" : "Show All Accounts"}
          </button>
        </div>
      )}

      {/* Main DataTable with Group Filter */}
      <DataTable<LedgerAccount>
        data={filtered}
        columns={columns}
        keyExtractor={(l) => l.id}
        searchPlaceholder={
          lang === "gu"
            ? "ખાતાનું નામ, કોડ થી શોધો..."
            : "Search ledger by name or code..."
        }
        searchKeys={["name", "code", "nameGujarati"]}
        defaultPageSize={10}
        isLoading={isLoading}
        emptyMessage={
          lang === "gu"
            ? "કોઈ ખાતા મળ્યા નથી"
            : "No ledger accounts found. Click 'Create Ledger' to open an account."
        }
        exportFilename="ledgers_chart_of_accounts"
        themeColor="saffron"
        toolbarChildren={
          groups.length > 0 ? (
            <div className="flex items-center gap-2">
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-border text-slate-700 rounded-xl px-3 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
              >
                <option value="ALL">{lang === "gu" ? "તમામ જૂથ (All Groups)" : "All Ledger Groups"}</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          ) : undefined
        }
        mobileCardRender={(l) => (
          <div key={l.id || l.code} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-slate-800">{l.code}</span>
              <StatusBadge status={l.isActive ? "ACTIVE" : "INACTIVE"} />
            </div>
            <div>
              <div className="font-semibold text-slate-900">{l.name}</div>
              {l.nameGujarati && (
                <div className="text-xs text-slate-500">{l.nameGujarati}</div>
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>{l.group?.name || "Standard Group"}</span>
              <span className="font-mono font-bold text-slate-900">
                ₹{Number(l.openingBalance || 0).toFixed(2)}{" "}
                <span className="text-[10px] text-slate-500">
                  ({l.openingBalanceType === "DEBIT" ? "Dr" : "Cr"})
                </span>
              </span>
            </div>
          </div>
        )}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={lang === "gu" ? "નવું ખાતું ખોલો" : "Create Ledger Account"}
        titleGujarati="નામાનું ખાતું"
        maxWidth="md"
      >
        <form onSubmit={handleCreateLedger} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Account Code *
            </label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value })
              }
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Account Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g. HDFC Bank Current A/c"
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Name in Gujarati (Optional)
            </label>
            <input
              type="text"
              value={formData.nameGujarati}
              onChange={(e) =>
                setFormData({ ...formData, nameGujarati: e.target.value })
              }
              placeholder={lang === "gu" ? "એચડીએફસી બેંક ખાતું" : "e.g. HDFC Bank Account"}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Parent Ledger Group *
            </label>
            <select
              value={formData.groupId}
              onChange={(e) =>
                setFormData({ ...formData, groupId: e.target.value })
              }
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Opening Balance (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.openingBalance}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    openingBalance: Number(e.target.value),
                  })
                }
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Balance Type
              </label>
              <select
                value={formData.openingBalanceType}
                onChange={(e: any) =>
                  setFormData({
                    ...formData,
                    openingBalanceType: e.target.value,
                  })
                }
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded"
              >
                <option value="DEBIT">{lang === "gu" ? "ઉધાર (Dr - Debit)" : "Debit (Dr)"}</option>
                <option value="CREDIT">{lang === "gu" ? "જમા (Cr - Credit)" : "Credit (Cr)"}</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg"
            >
              {isSubmitting ? "Saving..." : "Save Ledger"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
