"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";
import { Modal } from "../../../components/ui/modal";
import { StatusBadge } from "../../../components/ui/badge";

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
    if (groupFilter !== "ALL" && l.groupId !== groupFilter) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      l.name.toLowerCase().includes(term) ||
      l.code.toLowerCase().includes(term) ||
      (l.group?.name && l.group.name.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {lang === "gu"
              ? "ખાતાઓનું રજિસ્ટર (Ledger Accounts)"
              : "Ledger Accounts Register"}
          </h1>
          <p className="text-xs text-slate-500">
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
          <span>{lang === "gu" ? "નવું ખાતું ખોલો" : "Create Ledger"}</span>
        </button>
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
            placeholder="Search ledger by name or code..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800"
          />
        </div>

        {groups.length > 0 && (
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="w-full sm:w-auto text-xs bg-slate-50 border border-slate-300 text-slate-700 rounded-lg px-3 py-2 font-medium"
          >
            <option value="ALL">All Ledger Groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        )}
      </div>

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
                  {lang === "gu" ? "ખાતા કોડ" : "Account Code"}
                </th>
                <th className="py-3 px-4">
                  {lang === "gu" ? "ખાતાનું નામ" : "Account Name"}
                </th>
                <th className="py-3 px-4">
                  {lang === "gu" ? "જૂથ" : "Ledger Group"}
                </th>
                <th className="py-3 px-4 text-right">
                  {lang === "gu" ? "શરૂઆતની સિલક (₹)" : "Opening Balance (₹)"}
                </th>
                <th className="py-3 px-4">
                  {lang === "gu" ? "સ્થિતિ" : "Status"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="inline-block w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <p>Loading ledger accounts...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <p className="font-medium text-slate-600 mb-1">
                      No ledger accounts found
                    </p>
                    <p className="text-[11px]">
                      Click &apos;Create Ledger&apos; to open an account or seed
                      Chart of Accounts first.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr
                    key={l.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {l.code}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{l.name}</div>
                      {l.nameGujarati && (
                        <div className="text-[11px] font-normal text-slate-500">
                          {l.nameGujarati}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {l.group?.name || "Standard Group"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                      ₹{Number(l.openingBalance || 0).toFixed(2)}{" "}
                      <span className="text-[10px] text-slate-500 font-normal">
                        ({l.openingBalanceType === "DEBIT" ? "Dr" : "Cr"})
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        status={l.isActive ? "ACTIVE" : "INACTIVE"}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
              placeholder="એચડીએફસી બેંક ખાતું"
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
                <option value="DEBIT">Debit (Dr - ઉધાર)</option>
                <option value="CREDIT">Credit (Cr - જમા)</option>
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
