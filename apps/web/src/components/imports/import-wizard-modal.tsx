"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/auth-context";
import { importApi } from "../../lib/import-api";
import {
  ImportErrorPolicy,
  ImportJobDto,
  ImportMode,
  ImportModuleSchema,
  ImportModuleType,
  ImportParseResult,
  ImportPreviewResult,
} from "@billing/shared-types";

interface ImportWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedModule?: ImportModuleType | string;
  onSuccess?: () => void;
}

type WizardStep = "MODULE" | "UPLOAD" | "MAPPING" | "CONFIGURE" | "PREVIEW" | "EXECUTING" | "REPORT";

export function ImportWizardModal({
  isOpen,
  onClose,
  preselectedModule,
  onSuccess,
}: ImportWizardModalProps) {
  const router = useRouter();
  const { lang, currentCompany } = useAuth();

  // State
  const [step, setStep] = useState<WizardStep>(preselectedModule ? "UPLOAD" : "MODULE");
  const [modules, setModules] = useState<ImportModuleSchema[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>(preselectedModule || "");
  const [currentSchema, setCurrentSchema] = useState<ImportModuleSchema | null>(null);

  // File & Parsing
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ImportParseResult | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>("");

  // Mapping & Config
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importMode, setImportMode] = useState<ImportMode>(ImportMode.SKIP_DUPLICATES);
  const [errorPolicy, setErrorPolicy] = useState<ImportErrorPolicy>(ImportErrorPolicy.IMPORT_VALID_ONLY);

  // Validation & Execution
  const [isValidating, setIsValidating] = useState(false);
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executionResult, setExecutionResult] = useState<ImportJobDto | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterPreviewStatus, setFilterPreviewStatus] = useState<string>("ALL");
  const [previewPage, setPreviewPage] = useState(1);
  const pageSize = 8;

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch available modules on mount & reset state
  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setParseResult(null);
      setPreviewResult(null);
      setColumnMapping({});
      setErrorMessage(null);
      setExecutionResult(null);
      setExecutionProgress(0);

      importApi
        .getModules()
        .then((mods) => {
          setModules(mods);
          const initial = preselectedModule || mods[0]?.module || "parties";
          setSelectedModule(initial);
          const found = mods.find((m) => m.module === initial);
          if (found) setCurrentSchema(found);
          setStep(preselectedModule ? "UPLOAD" : "MODULE");
        })
        .catch((err) => {
          setErrorMessage(err.message || "Failed to load import modules");
        });
    }
  }, [isOpen, preselectedModule]);

  // Update schema when module changes
  useEffect(() => {
    if (selectedModule && modules.length > 0) {
      const found = modules.find((m) => m.module === selectedModule);
      if (found) setCurrentSchema(found);
    }
  }, [selectedModule, modules]);

  if (!isOpen) return null;

  // Handle file selection
  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    setErrorMessage(null);
    setIsParsing(true);

    try {
      const res = await importApi.parseFile(selectedFile, selectedModule);
      setParseResult(res);
      setSelectedSheet(res.selectedWorksheet);
      setColumnMapping(res.detectedMapping || {});
      setStep("MAPPING");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to parse file");
    } finally {
      setIsParsing(false);
    }
  };

  // Change worksheet in multi-sheet Excel
  const handleSheetChange = async (sheetName: string) => {
    if (!file) return;
    setSelectedSheet(sheetName);
    setIsParsing(true);
    setErrorMessage(null);

    try {
      const res = await importApi.parseFile(file, selectedModule, sheetName);
      setParseResult(res);
      setColumnMapping(res.detectedMapping || {});
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to read worksheet");
    } finally {
      setIsParsing(false);
    }
  };

  // Run validation
  const handleRunValidation = async () => {
    if (!parseResult) return;
    setIsValidating(true);
    setErrorMessage(null);

    try {
      const preview = await importApi.validateMapping(
        parseResult.jobId,
        selectedModule,
        columnMapping,
        importMode,
      );
      setPreviewResult(preview);
      setStep("PREVIEW");
    } catch (err: any) {
      setErrorMessage(err.message || "Validation failed");
    } finally {
      setIsValidating(false);
    }
  };

  // Execute import
  const handleExecuteImport = async () => {
    if (!parseResult) return;
    setIsExecuting(true);
    setStep("EXECUTING");
    setExecutionProgress(20);

    const progressTimer = setInterval(() => {
      setExecutionProgress((prev) => (prev < 90 ? prev + 15 : prev));
    }, 400);

    try {
      const result = await importApi.executeImport(
        parseResult.jobId,
        selectedModule,
        columnMapping,
        importMode,
        errorPolicy,
      );
      clearInterval(progressTimer);
      setExecutionProgress(100);
      setExecutionResult(result);
      setStep("REPORT");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      clearInterval(progressTimer);
      setErrorMessage(err.message || "Import execution failed");
      setStep("PREVIEW");
    } finally {
      setIsExecuting(false);
    }
  };

  // Reset wizard
  const handleReset = () => {
    setFile(null);
    setParseResult(null);
    setPreviewResult(null);
    setExecutionResult(null);
    setColumnMapping({});
    setErrorMessage(null);
    setStep(preselectedModule ? "UPLOAD" : "MODULE");
  };

  // Download template
  const handleDownloadTemplate = (format: "xlsx" | "csv" = "xlsx") => {
    if (selectedModule) {
      importApi.downloadTemplate(selectedModule, format).catch((err) => {
        alert(err.message || "Could not download template");
      });
    }
  };

  // Filter preview rows
  const filteredRows = (previewResult?.rows || []).filter((r) => {
    if (filterPreviewStatus === "ALL") return true;
    return r.status === filterPreviewStatus;
  });

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = filteredRows.slice((previewPage - 1) * pageSize, previewPage * pageSize);

  // Missing required mappings check
  const unmappedRequiredFields = (currentSchema?.fields || [])
    .filter((f) => f.required && !Object.values(columnMapping).includes(f.key));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
        
        {/* HEADER */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-lg border border-orange-500/30">
              📊
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">
                  {lang === "gu" ? "એક્સેલ / CSV ડેટા આયાત સેન્ટર" : "Excel / CSV Data Import Center"}
                </h2>
                {modules.length > 0 && (
                  <select
                    value={selectedModule}
                    onChange={(e) => {
                      const newMod = e.target.value;
                      setSelectedModule(newMod);
                      const found = modules.find((m) => m.module === newMod);
                      if (found) {
                        setCurrentSchema(found);
                        if (parseResult) {
                          // Re-run mapping against new module
                          importApi.parseFile(file!, newMod, selectedSheet).then((res) => {
                            setColumnMapping(res.detectedMapping || {});
                          }).catch(() => {});
                        }
                      }
                    }}
                    className="text-xs bg-slate-800 text-orange-400 px-2.5 py-1 rounded-lg border border-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                  >
                    {modules.map((m) => (
                      <option key={m.module} value={m.module}>
                        {lang === "gu" ? m.titleGujarati : m.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {currentCompany?.tradeName || currentCompany?.legalName || "MyOwnBill History"} •{" "}
                {lang === "gu" ? "સરળ ડેટા માઈગ્રેશન" : "Seamless Data Migration Engine"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* STEP PROGRESS BAR */}
        <div className="bg-slate-100 px-6 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs overflow-x-auto scrollbar-none">
          {[
            { id: "MODULE", label: lang === "gu" ? "૧. મોડ્યુલ" : "1. Module" },
            { id: "UPLOAD", label: lang === "gu" ? "૨. ફાઇલ" : "2. File" },
            { id: "MAPPING", label: lang === "gu" ? "૩. મેપિંગ" : "3. Map Columns" },
            { id: "CONFIGURE", label: lang === "gu" ? "૪. સેટિંગ્સ" : "4. Options" },
            { id: "PREVIEW", label: lang === "gu" ? "૫. પ્રીવ્યૂ" : "5. Preview" },
            { id: "REPORT", label: lang === "gu" ? "૬. રિપોર્ટ" : "6. Report" },
          ].map((s, idx) => {
            const stepOrder: WizardStep[] = ["MODULE", "UPLOAD", "MAPPING", "CONFIGURE", "PREVIEW", "EXECUTING", "REPORT"];
            const currentIdx = stepOrder.indexOf(step);
            const thisIdx = stepOrder.indexOf(s.id as WizardStep);
            const isCompleted = currentIdx > thisIdx;
            const isCurrent = step === s.id || (step === "EXECUTING" && s.id === "PREVIEW");

            return (
              <div key={s.id} className="flex items-center gap-2 whitespace-nowrap">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isCurrent
                      ? "bg-orange-600 text-white"
                      : isCompleted
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-300 text-slate-600"
                  }`}
                >
                  {isCompleted ? "✓" : idx + 1}
                </span>
                <span className={`font-medium ${isCurrent ? "text-orange-700 font-bold" : isCompleted ? "text-slate-800" : "text-slate-500"}`}>
                  {s.label}
                </span>
                {idx < 5 && <span className="text-slate-300 mx-1">›</span>}
              </div>
            );
          })}
        </div>

        {/* ERROR NOTIFICATION BANNER */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between animate-shake">
            <div className="flex items-center gap-2">
              <span className="text-rose-600 font-bold text-sm">⚠️</span>
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-800 font-bold">
              ✕
            </button>
          </div>
        )}

        {/* BODY CONTAINER */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* STEP 1: MODULE SELECTION */}
          {step === "MODULE" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {lang === "gu" ? "આયાત કરવા માટેનું મોડ્યુલ પસંદ કરો" : "Select Target Module to Import"}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === "gu"
                    ? "તમારા જૂના સોફ્ટવેરમાંથી કયો ડેટા આયાત કરવો છે તે પસંદ કરો."
                    : "Choose the target data type exported from Tally, Busy, Marg, or custom Excel sheets."}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {modules.map((m) => {
                  const isSelected = selectedModule === m.module;
                  return (
                    <div
                      key={m.module}
                      onClick={() => {
                        setSelectedModule(m.module);
                        setCurrentSchema(m);
                      }}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "border-orange-500 bg-orange-50/60 shadow-md ring-2 ring-orange-500/20"
                          : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {m.category}
                        </span>
                        {isSelected && <span className="text-orange-600 font-bold text-sm">✓</span>}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mb-1">
                        {lang === "gu" ? m.titleGujarati : m.title}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {lang === "gu" ? m.descriptionGujarati : m.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setStep("UPLOAD")}
                  disabled={!selectedModule}
                  className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow transition-colors cursor-pointer"
                >
                  {lang === "gu" ? "આગળ વધો (ફાઇલ અપલોડ) ›" : "Next (Upload File) ›"}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: FILE UPLOAD */}
          {step === "UPLOAD" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {lang === "gu" ? "એક્સેલ અથવા CSV ફાઇલ અપલોડ કરો" : "Upload Excel (.xlsx, .xls) or CSV File"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lang === "gu"
                      ? "મહત્તમ ૧૫ MB અને ૫,૦૦૦ લાઇન સુધીની ફાઇલ સપોર્ટેડ છે."
                      : "Max file size: 15 MB. Supports up to 5,000 records per batch."}
                  </p>
                </div>

                {/* Template download pill buttons */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 hidden sm:inline">
                    {lang === "gu" ? "સેમ્પલ ટેમ્પલેટ:" : "Download Template:"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate("xlsx")}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <span>📗</span> .XLSX
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate("csv")}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <span>📄</span> .CSV
                  </button>
                </div>
              </div>

              {/* Drag and drop upload zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileChange(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-orange-500 rounded-2xl p-8 sm:p-12 text-center bg-slate-50/60 hover:bg-orange-50/20 transition-all cursor-pointer group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                  accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv"
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-4 text-2xl group-hover:scale-110 transition-transform">
                  📁
                </div>

                <h4 className="text-base font-bold text-slate-800 mb-1">
                  {lang === "gu" ? "ફાઇલ અહીં ખેંચી લાવો અથવા પસંદ કરવા ક્લિક કરો" : "Drag and drop your spreadsheet here, or browse"}
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                  {lang === "gu"
                    ? "ગુજરાતી અને અંગ્રેજી હેડરવાળી કોઈપણ એકાઉન્ટિંગ સ્પ્રેડશીટ આપોઆપ ઓળખાઈ જશે."
                    : "Intelligent auto-detection matches both English and Gujarati accounting terminology."}
                </p>

                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 shadow-sm group-hover:border-orange-400">
                  <span>📂</span> {lang === "gu" ? "કોમ્પ્યુટરમાંથી ફાઇલ પસંદ કરો" : "Choose File from Computer"}
                </div>
              </div>

              {isParsing && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-center gap-3 text-orange-800 text-sm">
                  <span className="animate-spin text-xl">⏳</span>
                  <span className="font-semibold">
                    {lang === "gu" ? "સ્પ્રેડશીટ અને કોલમ્સ તપાસી રહ્યા છીએ..." : "Parsing spreadsheet and auto-detecting columns..."}
                  </span>
                </div>
              )}

              {/* Back button */}
              {!preselectedModule && (
                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={() => setStep("MODULE")}
                    className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    ‹ {lang === "gu" ? "પાછળ (મોડ્યુલ)" : "Back (Change Module)"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: COLUMN MAPPING */}
          {step === "MAPPING" && parseResult && currentSchema && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {lang === "gu" ? "કોલમ મેપિંગ ચકાસો" : "Map Spreadsheet Columns"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {parseResult.fileName} • {parseResult.totalRows} {lang === "gu" ? "લાઈનો મળી" : "records detected"}
                  </p>
                </div>

                {/* Multi-sheet selector */}
                {parseResult.worksheets.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 font-semibold">
                      {lang === "gu" ? "વર્કશીટ:" : "Sheet:"}
                    </span>
                    <select
                      value={selectedSheet}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-medium"
                    >
                      {parseResult.worksheets.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Missing required warning */}
              {unmappedRequiredFields.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-center gap-2">
                  <span>⚠️</span>
                  <span>
                    {lang === "gu" ? "જરૂરી કોલમ બાકી છે: " : "Missing required mappings: "}
                    <strong>{unmappedRequiredFields.map((f) => f.label).join(", ")}</strong>
                  </span>
                </div>
              )}

              {/* Mapping table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3 w-1/3">{lang === "gu" ? "ફાઇલની કોલમ હેડર" : "Your Spreadsheet Column"}</th>
                      <th className="p-3 w-12 text-center">→</th>
                      <th className="p-3 w-1/2">{lang === "gu" ? "MyOwnBill History ફીલ્ડ" : "MyOwnBill History Field"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parseResult.headers.map((header) => {
                      const currentMappedKey = columnMapping[header] || "";
                      const mappedField = currentSchema.fields.find((f) => f.key === currentMappedKey);

                      return (
                        <tr key={header} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-semibold text-slate-800">
                            <div className="flex flex-col gap-1">
                              <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-900 font-bold inline-block w-fit">
                                {header}
                              </span>
                              {parseResult.sampleRows?.[0]?.[header] !== undefined && parseResult.sampleRows?.[0]?.[header] !== "" && (
                                <span className="text-[11px] text-slate-500 font-normal truncate max-w-xs">
                                  {lang === "gu" ? "નમૂનો:" : "Sample:"}{" "}
                                  <span className="font-medium text-slate-700 font-mono">
                                    {String(parseResult.sampleRows[0][header])}
                                  </span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center text-slate-400 font-bold">→</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <select
                                value={currentMappedKey}
                                onChange={(e) => {
                                  const newKey = e.target.value;
                                  setColumnMapping((prev) => ({
                                    ...prev,
                                    [header]: newKey,
                                  }));
                                }}
                                className={`w-full max-w-sm px-3 py-1.5 border rounded-lg text-xs bg-white text-slate-800 ${
                                  mappedField?.required
                                    ? "border-emerald-500 font-semibold ring-1 ring-emerald-500/20"
                                    : currentMappedKey
                                    ? "border-slate-300"
                                    : "border-slate-200 text-slate-400"
                                }`}
                              >
                                <option value="">-- {lang === "gu" ? "આ કોલમ અવગણો (Ignore)" : "Ignore this column"} --</option>
                                {currentSchema.fields.map((f) => (
                                  <option key={f.key} value={f.key}>
                                    {f.label} {f.required ? "*(Required)" : ""}
                                  </option>
                                ))}
                              </select>

                              {mappedField?.required && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold uppercase">
                                  Required
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep("UPLOAD")}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  ‹ {lang === "gu" ? "ફરીથી ફાઇલ પસંદ કરો" : "Change File"}
                </button>

                <button
                  type="button"
                  onClick={() => setStep("CONFIGURE")}
                  disabled={unmappedRequiredFields.length > 0}
                  className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow transition-colors cursor-pointer"
                >
                  {lang === "gu" ? "આગળ (આયાત સેટિંગ્સ) ›" : "Next (Configure Options) ›"}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: CONFIGURE OPTIONS */}
          {step === "CONFIGURE" && currentSchema && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {lang === "gu" ? "આયાત નીતિ અને ડુપ્લિકેટ હેન્ડલિંગ" : "Import Mode & Duplicate Policy"}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === "gu"
                    ? "જ્યારે ફાઇલમાંની માહિતી કંપનીમાં પહેલેથી હાજર હોય ત્યારે શું કરવું તે નક્કી કરો."
                    : "Define safe handling rules when imported records match existing database entries."}
                </p>
              </div>

              {/* Import Mode selection */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {lang === "gu" ? "ડુપ્લિકેટ રેકોર્ડ નીતિ:" : "Duplicate Handling Mode:"}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      mode: ImportMode.SKIP_DUPLICATES,
                      title: lang === "gu" ? "ડુપ્લિકેટ અવગણો (Skip)" : "Skip Existing",
                      desc: lang === "gu"
                        ? "નવા રેકોર્ડ્સ ઉમેરો, હાલના રેકોર્ડ્સમાં કોઈ ફેરફાર ન કરો (સૌથી સલામત)."
                        : "Create new records only. Leave matching existing entries untouched (Safest).",
                      badge: "Recommended",
                    },
                    {
                      mode: ImportMode.UPDATE_EXISTING,
                      title: lang === "gu" ? "હાલના અપડેટ કરો (Update)" : "Update Matching",
                      desc: lang === "gu"
                        ? "હાલના રેકોર્ડ્સમાં નવી વિગતો (જેમ કે ભાવ, સરનામું) અપડેટ કરો."
                        : "Overwrite fields on existing matching records with new spreadsheet values.",
                      badge: "Review Required",
                    },
                    {
                      mode: ImportMode.CREATE_ONLY,
                      title: lang === "gu" ? "ફક્ત નવા જ બનાવો" : "Create Only (Fail on Dup)",
                      desc: lang === "gu"
                        ? "જો કોઈપણ ડુપ્લિકેટ મળે તો તે રેકોર્ડ રિજેક્ટ કરો."
                        : "Fail or reject duplicate entries immediately without modifying anything.",
                      badge: "Strict",
                    },
                  ].map((opt) => (
                    <div
                      key={opt.mode}
                      onClick={() => setImportMode(opt.mode)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        importMode === opt.mode
                          ? "border-orange-500 bg-orange-50/70 shadow-sm ring-2 ring-orange-500/20"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {opt.badge}
                        </span>
                        {importMode === opt.mode && <span className="text-orange-600 font-bold">✓</span>}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mb-1">{opt.title}</h4>
                      <p className="text-xs text-slate-500">{opt.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error Policy selection */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {lang === "gu" ? "ભૂલ હેન્ડલિંગ નીતિ (Error Policy):" : "Row Error Policy:"}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setErrorPolicy(ImportErrorPolicy.IMPORT_VALID_ONLY)}
                    className={`p-4 rounded-xl border cursor-pointer ${
                      errorPolicy === ImportErrorPolicy.IMPORT_VALID_ONLY
                        ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="font-bold text-sm text-slate-900 mb-1">
                      {lang === "gu" ? "માન્ય રેકોર્ડ્સ આયાત કરો (સૂચિત)" : "Import Valid Rows Only (Recommended)"}
                    </div>
                    <p className="text-xs text-slate-500">
                      {lang === "gu"
                        ? "સાચી લાઈનો આયાત થશે, ભૂલવાળી લાઈનોનો ડાઉનલોડેબલ રિપોર્ટ મળશે."
                        : "Commits clean rows and provides a downloadable error spreadsheet for failed rows."}
                    </p>
                  </div>

                  <div
                    onClick={() => setErrorPolicy(ImportErrorPolicy.ABORT_ON_ERROR)}
                    className={`p-4 rounded-xl border cursor-pointer ${
                      errorPolicy === ImportErrorPolicy.ABORT_ON_ERROR
                        ? "border-rose-500 bg-rose-50/60 ring-2 ring-rose-500/20"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="font-bold text-sm text-slate-900 mb-1">
                      {lang === "gu" ? "એકપણ ભૂલ પર આખી ફાઇલ રદ કરો" : "Abort Entire Batch on Any Error"}
                    </div>
                    <p className="text-xs text-slate-500">
                      {lang === "gu"
                        ? "જો એકપણ લાઈનમાં ભૂલ હશે તો કંઈપણ આયાત થશે નહીં (સંપૂર્ણ રોલબેક)."
                        : "Rolls back entire transaction if any single row has a validation error."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep("MAPPING")}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  ‹ {lang === "gu" ? "પાછળ (મેપિંગ)" : "Back to Mapping"}
                </button>

                <button
                  type="button"
                  onClick={handleRunValidation}
                  disabled={isValidating}
                  className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow transition-colors cursor-pointer flex items-center gap-2"
                >
                  {isValidating ? (
                    <>
                      <span className="animate-spin text-sm">⏳</span>
                      <span>{lang === "gu" ? "ચકાસી રહ્યા છીએ..." : "Validating Dataset..."}</span>
                    </>
                  ) : (
                    <span>{lang === "gu" ? "ડેટા પ્રીવ્યૂ જુઓ ›" : "Validate & Preview Data ›"}</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: PREVIEW & DIAGNOSTICS */}
          {step === "PREVIEW" && previewResult && (
            <div className="space-y-6">
              {/* Summary stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-xs text-slate-500">{lang === "gu" ? "કુલ લાઈનો" : "Total Rows"}</div>
                  <div className="text-xl font-bold text-slate-900">{previewResult.totalRows}</div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="text-xs text-emerald-700 font-semibold">{lang === "gu" ? "માન્ય રેકોર્ડ્સ" : "Valid to Create"}</div>
                  <div className="text-xl font-bold text-emerald-800">{previewResult.summary.newRecords}</div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="text-xs text-blue-700 font-semibold">
                    {importMode === ImportMode.UPDATE_EXISTING
                      ? (lang === "gu" ? "અપડેટ થશે" : "To Update")
                      : (lang === "gu" ? "અવગણાશે (Skip)" : "Duplicates to Skip")}
                  </div>
                  <div className="text-xl font-bold text-blue-800">
                    {importMode === ImportMode.UPDATE_EXISTING
                      ? previewResult.summary.updateRecords
                      : previewResult.summary.skipRecords}
                  </div>
                </div>

                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <div className="text-xs text-rose-700 font-semibold">{lang === "gu" ? "અમાન્ય / ભૂલ" : "Invalid / Errors"}</div>
                  <div className="text-xl font-bold text-rose-800">{previewResult.invalidRows}</div>
                </div>
              </div>

              {/* Status filter tabs */}
              <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-2">
                <div className="flex items-center gap-1">
                  {["ALL", "VALID", "DUPLICATE", "INVALID"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setFilterPreviewStatus(st);
                        setPreviewPage(1);
                      }}
                      className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                        filterPreviewStatus === st
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {st === "ALL" && (lang === "gu" ? "બધા" : "All Rows")}
                      {st === "VALID" && (lang === "gu" ? "માન્ય" : "Valid")}
                      {st === "DUPLICATE" && (lang === "gu" ? "ડુપ્લિકેટ" : "Duplicates")}
                      {st === "INVALID" && (lang === "gu" ? "ભૂલવાળા" : "Invalid")}
                    </button>
                  ))}
                </div>

                <span className="text-slate-400 text-xs">
                  {lang === "gu" ? "પાનું" : "Page"} {previewPage} / {totalPages}
                </span>
              </div>

              {/* Preview table */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs min-w-[600px]">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 w-16">Row #</th>
                      <th className="p-2.5 w-24">Status</th>
                      <th className="p-2.5 w-24">Action</th>
                      <th className="p-2.5">Data Summary</th>
                      <th className="p-2.5">Diagnostics & Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedRows.map((r) => {
                      const identifierVal = r.data[currentSchema?.identifierField || "name"] || "—";

                      return (
                        <tr key={r.rowNumber} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 font-mono text-slate-500 font-bold">{r.rowNumber}</td>
                          <td className="p-2.5">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                r.status === "VALID"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : r.status === "DUPLICATE"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                r.action === "CREATE"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                                  : r.action === "UPDATE"
                                  ? "bg-amber-50 text-amber-700 border border-amber-300"
                                  : r.action === "SKIP"
                                  ? "bg-slate-100 text-slate-600 border border-slate-300"
                                  : "bg-rose-50 text-rose-700 border border-rose-300"
                              }`}
                            >
                              {r.action}
                            </span>
                          </td>
                          <td className="p-2.5 font-semibold text-slate-900">
                            <div>{identifierVal}</div>
                            {r.data.phone && <div className="text-[11px] text-slate-500 font-mono">Ph: {r.data.phone}</div>}
                            {r.data.gstin && <div className="text-[11px] text-slate-500 font-mono">GST: {r.data.gstin}</div>}
                          </td>
                          <td className="p-2.5 text-slate-600 text-[11px]">
                            {r.messages.length > 0 ? (
                              <ul className="list-disc list-inside space-y-0.5">
                                {r.messages.map((m, idx) => (
                                  <li key={idx} className={r.status === "INVALID" ? "text-rose-600 font-medium" : ""}>
                                    {m}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-emerald-600 font-medium">✓ Ready to import</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between text-xs pt-2">
                  <button
                    type="button"
                    onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                    disabled={previewPage === 1}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg disabled:opacity-50"
                  >
                    ‹ Previous
                  </button>
                  <span className="text-slate-500">
                    Showing {(previewPage - 1) * pageSize + 1} to {Math.min(previewPage * pageSize, filteredRows.length)} of {filteredRows.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewPage((p) => Math.min(totalPages, p + 1))}
                    disabled={previewPage === totalPages}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg disabled:opacity-50"
                  >
                    Next ›
                  </button>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStep("CONFIGURE")}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  ‹ {lang === "gu" ? "પાછળ (વિકલ્પો)" : "Back to Options"}
                </button>

                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={previewResult.validRows === 0 && previewResult.summary.updateRecords === 0}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg transition-colors cursor-pointer flex items-center gap-2"
                >
                  <span>✓</span>
                  <span>
                    {lang === "gu"
                      ? `${previewResult.summary.newRecords + previewResult.summary.updateRecords} રેકોર્ડ્સ આયાત કન્ફર્મ કરો`
                      : `Confirm & Import ${previewResult.summary.newRecords + previewResult.summary.updateRecords} Records`}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: EXECUTING SPINNER */}
          {step === "EXECUTING" && (
            <div className="py-16 text-center space-y-6">
              <div className="w-20 h-20 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin mx-auto" />
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  {lang === "gu" ? "ડેટાબેઝમાં આયાત થઈ રહી છે..." : "Importing Records into PostgreSQL..."}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {lang === "gu"
                    ? "એકાઉન્ટિંગ અને ઇન્વેન્ટરી બેલેન્સ નિયમો સાથે વ્યવહાર સુરક્ષિત રીતે નોંધાઈ રહ્યો છે."
                    : "Writing verified master and transaction records within your tenant-isolated database."}
                </p>
              </div>

              <div className="w-full max-w-md mx-auto bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-orange-600 h-full transition-all duration-300"
                  style={{ width: `${executionProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* STEP 7: FINAL REPORT */}
          {step === "REPORT" && executionResult && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-3xl font-bold">
                ✓
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">
                  {lang === "gu" ? "ડેટા આયાત સફળતાપૂર્વક પૂર્ણ થઈ!" : "Data Import Completed Successfully!"}
                </h3>
                <p className="text-xs text-slate-500">
                  Job ID: <span className="font-mono font-bold text-slate-700">{executionResult.id.slice(0, 13)}</span> • Duration: {executionResult.summary?.durationMs || 100}ms
                </p>
              </div>

              {/* Execution metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto text-left">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-xs text-slate-500">{lang === "gu" ? "કુલ પ્રોસેસ થયેલ" : "Total Rows"}</div>
                  <div className="text-xl font-bold text-slate-900">{executionResult.totalRows}</div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="text-xs text-emerald-700 font-semibold">{lang === "gu" ? "સફળ નવા" : "Newly Created"}</div>
                  <div className="text-xl font-bold text-emerald-800">{executionResult.importedRows}</div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="text-xs text-blue-700 font-semibold">{lang === "gu" ? "અપડેટ / અવગણ્યા" : "Updated / Skipped"}</div>
                  <div className="text-xl font-bold text-blue-800">{executionResult.updatedRows + executionResult.skippedRows}</div>
                </div>

                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <div className="text-xs text-rose-700 font-semibold">{lang === "gu" ? "નિષ્ફળ લાઈનો" : "Failed Rows"}</div>
                  <div className="text-xl font-bold text-rose-800">{executionResult.failedRows}</div>
                </div>
              </div>

              {/* Download error report if any failures */}
              {executionResult.failedRows > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs max-w-lg mx-auto flex items-center justify-between">
                  <div className="text-left">
                    <div className="font-bold">{executionResult.failedRows} {lang === "gu" ? "લાઈનોમાં ભૂલો હતી." : "rows failed validation."}</div>
                    <div>{lang === "gu" ? "ભૂલોની વિગતવાર એક્સેલ ફાઇલ ડાઉનલોડ કરો:" : "Download diagnostic error report:"}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => importApi.downloadErrorReport(executionResult.id, "xlsx")}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow"
                  >
                    📥 {lang === "gu" ? "ભૂલ રિપોર્ટ" : "Error Report"}
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-5 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  {lang === "gu" ? "બીજી ફાઇલ આયાત કરો" : "Import Another File"}
                </button>

                {currentSchema && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push(currentSchema.routeHref);
                    }}
                    className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold shadow cursor-pointer"
                  >
                    {lang === "gu" ? "રેકોર્ડ્સ લિસ્ટ જુઓ ›" : "View Imported Records ›"}
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
