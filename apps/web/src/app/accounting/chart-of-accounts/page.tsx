"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/auth-context";
import { apiClient } from "../../../lib/api-client";
import { Modal } from "../../../components/ui/modal";
import { Badge } from "../../../components/ui/badge";

interface LedgerGroup {
  id: string;
  code: string;
  name: string;
  nameGujarati?: string;
  classification: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  isPrimary: boolean;
  parentId?: string;
  accounts?: any[];
}

export default function ChartOfAccountsPage() {
  const { lang, tenantContext } = useAuth();
  const [groups, setGroups] = useState<LedgerGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    nameGujarati: "",
    classification: "ASSET" as LedgerGroup["classification"],
  });

  const fetchGroups = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get("/ledger-groups");
      setGroups(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setError(err.message || "Failed to load ledger groups.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchGroups();
    }
  }, [tenantContext.companyId, fetchGroups]);

  const handleSeedStandard = async () => {
    setSeeding(true);
    setSeedSuccess(null);
    setError(null);
    try {
      await apiClient.post("/ledger-groups/seed");
      setSeedSuccess(
        lang === "gu"
          ? "ભારતીય SME સ્ટાન્ડર્ડ ખાતાવહી સફળતાપૂર્વક તૈયાર થઈ ગઈ!"
          : "Standard Indian SME Chart of Accounts seeded successfully!",
      );
      await fetchGroups();
    } catch (err: any) {
      setError(err.message || "Failed to seed chart of accounts.");
    } finally {
      setSeeding(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      await apiClient.post("/ledger-groups", {
        code: formData.code,
        name: formData.name,
        nameGujarati: formData.nameGujarati || undefined,
        classification: formData.classification,
      });
      setIsModalOpen(false);
      await fetchGroups();
    } catch (err: any) {
      setFormError(err.message || "Failed to create ledger group.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const classificationColor: Record<
    string,
    "info" | "warning" | "success" | "danger" | "purple"
  > = {
    ASSET: "info",
    LIABILITY: "warning",
    EQUITY: "purple",
    REVENUE: "success",
    EXPENSE: "danger",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-border shadow-subtle">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-6 bg-primary rounded-full inline-block"></span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {lang === "gu"
                ? "ખાતાવહી માળખું (Chart of Accounts)"
                : "Chart of Accounts (COA)"}
            </h1>
          </div>
          <p className="text-xs text-muted mt-1 ml-4.5">
            {lang === "gu"
              ? "મિલકતો, દેવા, આવક અને ખર્ચના ખાતા જૂથો"
              : "Standard double-entry accounting hierarchy: Assets, Liabilities, Equity, Revenue, Expenses"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSeedStandard}
            disabled={seeding}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-saffron-light hover:bg-[#FFE6D0] text-primary border border-primary/25 text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            {seeding ? (
              <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>🌱</span>
            )}
            <span>
              {lang === "gu"
                ? "સ્ટાન્ડર્ડ ખાતા સ્થાપિત કરો"
                : "Seed Indian SME Accounts"}
            </span>
          </button>

          <button
            onClick={() => {
              setFormData({
                code: `GRP-${Date.now().toString().slice(-4)}`,
                name: "",
                nameGujarati: "",
                classification: "ASSET",
              });
              setFormError(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-pressed text-white text-xs sm:text-sm font-bold rounded-xl shadow-card hover:shadow-hover transition-all"
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
            <span>{lang === "gu" ? "નવું ખાતા જૂથ" : "+ Add Group"}</span>
          </button>
        </div>
      </div>

      {seedSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <span>✓</span>
          <span>{seedSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      {/* Group Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">
                  {lang === "gu" ? "જૂથ કોડ" : "Group Code"}
                </th>
                <th className="py-3 px-4">
                  {lang === "gu" ? "જૂથનું નામ" : "Group Name"}
                </th>
                <th className="py-3 px-4">
                  {lang === "gu" ? "નામા વર્ગીકરણ" : "Classification"}
                </th>
                <th className="py-3 px-4">
                  {lang === "gu" ? "પ્રાથમિક જૂથ" : "Level"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <div className="inline-block w-6 h-6 border-2 border-[#F47721] border-t-transparent rounded-full animate-spin mb-2" />
                    <p>Loading chart of accounts...</p>
                  </td>
                </tr>
              ) : groups.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-700 mb-1">
                      No Ledger Groups Seeded
                    </p>
                    <p className="text-[11px] mb-3">
                      Click &apos;Seed Indian SME Accounts&apos; above to
                      automatically populate standard Indian accounting ledger
                      groups.
                    </p>
                  </td>
                </tr>
              ) : (
                groups.map((g) => (
                  <tr
                    key={g.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {g.code}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{g.name}</div>
                      {g.nameGujarati && (
                        <div className="text-[11px] font-normal text-slate-500">
                          {g.nameGujarati}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          classificationColor[g.classification] || "neutral"
                        }
                      >
                        {g.classification}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {g.isPrimary ? "Primary Group" : "Sub Group"}
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
        title={lang === "gu" ? "નવું ખાતા જૂથ ઉમેરો" : "Add Ledger Group"}
        titleGujarati="નામાનું વર્ગીકરણ"
        maxWidth="md"
      >
        <form onSubmit={handleCreateGroup} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Group Code *
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
              Group Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g. Current Assets"
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
              placeholder="ચાલુ મિલકતો"
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Accounting Classification *
            </label>
            <select
              value={formData.classification}
              onChange={(e: any) =>
                setFormData({ ...formData, classification: e.target.value })
              }
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white"
            >
              <option value="ASSET">ASSET (મિલકત)</option>
              <option value="LIABILITY">LIABILITY (દેવું)</option>
              <option value="EQUITY">EQUITY (મૂડી)</option>
              <option value="REVENUE">REVENUE (આવક)</option>
              <option value="EXPENSE">EXPENSE (ખર્ચ)</option>
            </select>
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
              {isSubmitting ? "Saving..." : "Save Group"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
