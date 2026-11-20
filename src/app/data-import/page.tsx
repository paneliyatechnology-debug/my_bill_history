"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../context/auth-context";
import { importApi } from "../../lib/import-api";
import { ImportWizardModal } from "../../components/imports/import-wizard-modal";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  Search,
  Loader2,
  FileSpreadsheet,
  FileText,
  Upload,
  RefreshCw,
  Download,
  Check,
} from "lucide-react";
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

  // Jobs pagination
  const [jobsPage, setJobsPage] = useState<number>(1);
  const [jobsPageSize, setJobsPageSize] = useState<number>(10);

  const paginatedJobs = useMemo(() => {
    const start = (jobsPage - 1) * jobsPageSize;
    return jobs.slice(start, start + jobsPageSize);
  }, [jobs, jobsPage, jobsPageSize]);

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

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case "MASTERS":
        return "bg-blue-50/80 text-blue-700 border border-blue-100";
      case "INVENTORY":
        return "bg-teal-50/80 text-teal-700 border border-teal-100";
      case "SALES":
        return "bg-emerald-50/80 text-emerald-700 border border-emerald-100";
      case "PURCHASES":
        return "bg-amber-50/80 text-amber-700 border border-amber-100";
      case "ACCOUNTING":
        return "bg-purple-50/80 text-purple-700 border border-purple-100";
      case "MANUFACTURING":
        return "bg-slate-100 text-slate-700 border border-slate-200";
      default:
        return "bg-slate-100 text-slate-600 border border-slate-200";
    }
  };

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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto animate-fadeIn">
        
        {/* HEADER BANNER - Theme-based light surface (No AI badges or harsh colors) */}
        <div className="bg-white rounded-2xl p-5 sm:p-7 border border-slate-200/90 shadow-2xs relative">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-medium">
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                <span>{lang === "gu" ? "ડેટા આયાત કેન્દ્ર" : "Data Import Center"}</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {lang === "gu"
                  ? "એક્સેલ અને CSV માંથી ડેટા આયાત કરો"
                  : "Import Excel / CSV Data into MyOwnBillBook"}
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {lang === "gu"
                  ? "ટેલી (Tally), માર્ગ (Marg), બીઝી (Busy) અથવા સ્પ્રેડશીટમાંથી એક્સેલ/CSV ફાઇલો અપલોડ કરીને તમારા ખાતાઓ, સ્ટોક અને વાઉચર્સ સરળતાથી ઇમ્પોર્ટ કરો."
                  : "Upload existing Excel or CSV spreadsheets from Tally, Marg, Busy, Vyapar, or templates to import master records, inventory, and transactions."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => openImportForModule(undefined)}
                className="inline-flex items-center justify-center gap-2 h-10 px-5 whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[13px] font-semibold transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Upload className="w-4 h-4 text-white" />
                <span>{lang === "gu" ? "નવી આયાત શરૂ કરો" : "Start New Data Import"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* SEARCH & CATEGORY FILTER */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs"
                      : "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200/80 shadow-2xs"
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
              );
            })}
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === "gu" ? "મોડ્યુલ શોધો..." : "Search modules..."}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs h-10 transition-all"
            />
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          </div>
        </div>

        {/* MODULE CARDS GRID */}
        {isLoading ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
            <div>Loading import modules...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModules.map((m) => (
              <div
                key={m.module}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${getCategoryBadgeClass(m.category)}`}>
                      {m.category}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {m.fields.length} {lang === "gu" ? "ફીલ્ડ્સ" : "fields"}
                    </span>
                  </div>

                  <h3 className="text-[15px] font-semibold text-slate-900 group-hover:text-blue-600 transition-colors mb-1">
                    {lang === "gu" ? m.titleGujarati : m.title}
                  </h3>

                  <p className="text-xs text-slate-500 leading-relaxed mb-4 line-clamp-2">
                    {lang === "gu" ? m.descriptionGujarati : m.description}
                  </p>
                </div>

                <div className="pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => importApi.downloadTemplate(m.module, "xlsx")}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      title="Download sample Excel template"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> .XLSX
                    </button>
                    <button
                      type="button"
                      onClick={() => importApi.downloadTemplate(m.module, "csv")}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      title="Download sample CSV template"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" /> .CSV
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => openImportForModule(m.module)}
                    className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/90 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                    <span>{lang === "gu" ? "આયાત કરો" : "Import"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RECENT IMPORT JOBS AUDIT HISTORY */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">
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
              className="h-9 px-3 border border-slate-200 hover:bg-slate-50 rounded-lg text-[13px] font-medium text-slate-600 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
              <span>{lang === "gu" ? "રીફ્રેશ" : "Refresh"}</span>
            </button>
          </div>

          {jobs.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              {lang === "gu" ? "હજી સુધી કોઈ આયાત ઇતિહાસ નથી." : "No import jobs have been executed yet."}
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
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
                    {paginatedJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 tabular-nums font-medium text-slate-700">{job.id.slice(0, 8)}</td>
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
                        <td className="p-3 text-right tabular-nums">{job.totalRows}</td>
                        <td className="p-3 text-right tabular-nums text-emerald-700 font-medium">{job.importedRows}</td>
                        <td className="p-3 text-right tabular-nums text-blue-700 font-medium">{job.updatedRows}</td>
                        <td className="p-3 text-right tabular-nums text-rose-700 font-medium">{job.failedRows}</td>
                        <td className="p-3 text-slate-500">
                          {new Date(job.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-center">
                          {job.failedRows > 0 ? (
                            <button
                              type="button"
                              onClick={() => importApi.downloadErrorReport(job.id, "xlsx")}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded text-[11px] font-medium cursor-pointer transition-colors inline-flex items-center gap-1"
                            >
                              <Download className="w-3 h-3 text-amber-700" />
                              <span>Error Report</span>
                            </button>
                          ) : (
                            <span className="text-emerald-600 font-medium text-[11px] inline-flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              <span>Clean</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <DataTablePagination
                currentPage={jobsPage}
                totalPages={Math.max(1, Math.ceil(jobs.length / jobsPageSize))}
                pageSize={jobsPageSize}
                totalItems={jobs.length}
                onPageChange={setJobsPage}
                onPageSizeChange={(sz) => {
                  setJobsPageSize(sz);
                  setJobsPage(1);
                }}
              />
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
