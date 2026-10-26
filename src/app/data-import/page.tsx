"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/auth-context";
import { importApi } from "../../lib/import-api";
import { ImportWizardModal } from "../../components/imports/import-wizard-modal";
import {
  ImportJobDto,
  ImportModuleSchema,
  ImportModuleType,
} from "@billing/shared-types";

export default function DataImportCenterPage() {
  const { lang, currentCompany } = useAuth();
  const [modules, setModules] = useState<ImportModuleSchema[]>([]);
  const [jobs, setJobs] = useState<ImportJobDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Wizard modal
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<string | undefined>(undefined);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [mods, recentJobs] = await Promise.all([
        importApi.getModules(),
        importApi.getJobs().catch(() => []),
      ]);
      setModules(mods);
      setJobs(recentJobs);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openImportForModule = (moduleKey?: string) => {
    setActiveModule(moduleKey);
    setIsWizardOpen(true);
  };

  const categories = ["ALL", "MASTERS", "INVENTORY", "SALES", "PURCHASES", "ACCOUNTING", "MANUFACTURING"];

  const filteredModules = modules.filter((m) => {
    const matchesCat = selectedCategory === "ALL" || m.category === selectedCategory;
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.titleGujarati.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto animate-fadeIn">
        
        {/* HERO BANNER */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-slate-700/60 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-orange-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-bold tracking-wide uppercase">
                <span>⚡</span> {lang === "gu" ? "સંપૂર્ણ એકાઉન્ટિંગ ડેટા માઈગ્રેશન" : "Production Data Import Center"}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {lang === "gu"
                  ? "એક્સેલ અને CSV માંથી ડેટા આયાત કરો"
                  : "Import Excel / CSV Data into MyOwnBill History"}
              </h1>

              <p className="text-sm text-slate-300 leading-relaxed">
                {lang === "gu"
                  ? "ટેલી (Tally), માર્ગ (Marg), બીઝી (Busy) અથવા કોઈપણ બિલિંગ સોફ્ટવેરમાંથી પાર્ટીઓ, વસ્તુઓ, સ્ટોક અને બિલો કોઈ મેન્યુઅલ એન્ટ્રી વગર સીધા લાવો."
                  : "Switch from Tally, Marg, Busy, Vyapar, or legacy spreadsheets seamlessly. Upload your existing files and let our intelligent column-mapping engine do the rest."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={() => openImportForModule(undefined)}
                className="px-6 py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
              >
                <span>🚀</span>
                <span>{lang === "gu" ? "નવી આયાત શરૂ કરો" : "Start New Data Import"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* SEARCH & CATEGORY FILTER */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? "bg-orange-600 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {cat === "ALL" && (lang === "gu" ? "બધા મોડ્યુલ્સ" : "All Modules")}
                {cat === "MASTERS" && (lang === "gu" ? "માસ્ટર્સ" : "Masters")}
                {cat === "INVENTORY" && (lang === "gu" ? "ઇન્વેન્ટરી" : "Inventory")}
                {cat === "SALES" && (lang === "gu" ? "વેચાણ" : "Sales")}
                {cat === "PURCHASES" && (lang === "gu" ? "ખરીદી" : "Purchases")}
                {cat === "ACCOUNTING" && (lang === "gu" ? "એકાઉન્ટિંગ" : "Accounting")}
                {cat === "MANUFACTURING" && (lang === "gu" ? "ઉત્પાદન (BOM)" : "Manufacturing")}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === "gu" ? "મોડ્યુલ શોધો..." : "Search modules..."}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-sm"
            />
            <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
          </div>
        </div>

        {/* MODULE CARDS GRID */}
        {isLoading ? (
          <div className="py-16 text-center text-slate-400">
            <span className="animate-spin inline-block text-2xl mb-2">⏳</span>
            <div>Loading import modules...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModules.map((m) => (
              <div
                key={m.module}
                className="bg-white rounded-2xl border border-slate-200 hover:border-orange-300 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {m.category}
                    </span>
                    <span className="text-xs text-slate-400">
                      {m.fields.length} {lang === "gu" ? "ફીલ્ડ્સ" : "fields"}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-orange-600 transition-colors mb-1">
                    {lang === "gu" ? m.titleGujarati : m.title}
                  </h3>

                  <p className="text-xs text-slate-500 leading-relaxed mb-4 line-clamp-2">
                    {lang === "gu" ? m.descriptionGujarati : m.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => importApi.downloadTemplate(m.module, "xlsx")}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Download sample Excel template"
                    >
                      <span>📗</span> .XLSX
                    </button>
                    <button
                      type="button"
                      onClick={() => importApi.downloadTemplate(m.module, "csv")}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Download sample CSV template"
                    >
                      <span>📄</span> .CSV
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => openImportForModule(m.module)}
                    className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>📥</span>
                    <span>{lang === "gu" ? "આયાત કરો" : "Import"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RECENT IMPORT JOBS AUDIT HISTORY */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {lang === "gu" ? "તાજેતરનો આયાત ઇતિહાસ" : "Recent Import History & Logs"}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === "gu"
                  ? "તમારી કંપનીમાં કરવામાં આવેલી તમામ આયાત પ્રક્રિયાઓ અને ડાઉનલોડેબલ ભૂલ રિપોર્ટ્સ."
                  : "Audit trail of historical import batches, commit statistics, and diagnostic error reports."}
              </p>
            </div>

            <button
              type="button"
              onClick={loadData}
              className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-600 flex items-center gap-1 cursor-pointer"
            >
              <span>🔄</span> {lang === "gu" ? "રીફ્રેશ" : "Refresh"}
            </button>
          </div>

          {jobs.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              {lang === "gu" ? "હજી સુધી કોઈ આયાત ઇતિહાસ નથી." : "No import jobs have been executed yet."}
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Job ID</th>
                    <th className="p-3">Module</th>
                    <th className="p-3">File</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-right">Created</th>
                    <th className="p-3 text-right">Updated</th>
                    <th className="p-3 text-right">Failed</th>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-700">{job.id.slice(0, 8)}</td>
                      <td className="p-3 font-semibold text-slate-900 uppercase">{job.module}</td>
                      <td className="p-3 text-slate-600 truncate max-w-[150px]">{job.fileName}</td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            job.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800"
                              : job.status === "FAILED"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono">{job.totalRows}</td>
                      <td className="p-3 text-right font-mono text-emerald-700 font-bold">{job.importedRows}</td>
                      <td className="p-3 text-right font-mono text-blue-700 font-bold">{job.updatedRows}</td>
                      <td className="p-3 text-right font-mono text-rose-700 font-bold">{job.failedRows}</td>
                      <td className="p-3 text-slate-500">
                        {new Date(job.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-center">
                        {job.failedRows > 0 ? (
                          <button
                            type="button"
                            onClick={() => importApi.downloadErrorReport(job.id, "xlsx")}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded text-[11px] font-bold cursor-pointer transition-colors"
                          >
                            📥 Error Report
                          </button>
                        ) : (
                          <span className="text-emerald-600 font-bold text-[11px]">✓ Clean</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* IMPORT WIZARD MODAL */}
        <ImportWizardModal
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          preselectedModule={activeModule}
          onSuccess={loadData}
        />
      </div>
  );
}
