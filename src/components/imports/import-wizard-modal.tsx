"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
import {
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  Check,
  AlertTriangle,
  AlertCircle,
  X,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  RefreshCw,
  BarChart3,
  HelpCircle,
  Layers,
  Users,
  Package,
  Tag,
  Scale,
  Warehouse,
  Clock,
  Receipt,
  FileCheck,
  Loader2,
  Sparkles,
  FolderOpen,
  Info,
  ShieldAlert,
  ArrowUpRight,
} from "lucide-react";
import { CustomSelect } from "@/components/ui/dropdown-system";

export interface ImportWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedModule?: ImportModuleType | string;
  onSuccess?: () => void;
}

// 3 Streamlined Steps
export type ImportStep = "UPLOAD" | "MAPPING" | "PREVIEW" | "EXECUTING" | "REPORT";

export function ImportWizardModal({
  isOpen,
  onClose,
  preselectedModule,
  onSuccess,
}: ImportWizardModalProps) {
  const router = useRouter();
  const { lang, currentCompany } = useAuth();
  const isGu = lang === "gu";

  // Navigation & Step State
  const [step, setStep] = useState<ImportStep>("UPLOAD");
  const [modules, setModules] = useState<ImportModuleSchema[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>(preselectedModule || "parties");
  const [currentSchema, setCurrentSchema] = useState<ImportModuleSchema | null>(null);

  // File Upload State
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ImportParseResult | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mapping & Config State
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importMode, setImportMode] = useState<ImportMode>(ImportMode.SKIP_DUPLICATES);
  const [errorPolicy, setErrorPolicy] = useState<ImportErrorPolicy>(ImportErrorPolicy.IMPORT_VALID_ONLY);

  // Smart Module Detection Suggestion
  const [suggestedModule, setSuggestedModule] = useState<string | null>(null);

  // Validation & Execution State
  const [isValidating, setIsValidating] = useState(false);
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executionResult, setExecutionResult] = useState<ImportJobDto | null>(null);

  // UI helpers
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterPreviewStatus, setFilterPreviewStatus] = useState<string>("ALL");
  const [previewPage, setPreviewPage] = useState(1);
  const pageSize = 8;

  // Reset and Load Modules on Open
  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setParseResult(null);
      setPreviewResult(null);
      setExecutionResult(null);
      setColumnMapping({});
      setErrorMessage(null);
      setExecutionProgress(0);
      setSuggestedModule(null);
      setStep("UPLOAD");

      importApi
        .getModules()
        .then((mods) => {
          setModules(mods);
          const initial = preselectedModule || mods[0]?.module || "parties";
          setSelectedModule(initial);
          const found = mods.find((m) => m.module === initial);
          if (found) setCurrentSchema(found);
        })
        .catch((err) => {
          setErrorMessage(err.message || (isGu ? "મોડ્યુલ્સ લોડ કરવામાં ભૂલ થઈ" : "Failed to load import modules"));
        });
    }
  }, [isOpen, preselectedModule, isGu]);

  // Sync schema when selectedModule changes
  useEffect(() => {
    if (selectedModule && modules.length > 0) {
      const found = modules.find((m) => m.module === selectedModule);
      if (found) {
        setCurrentSchema(found);
      }
    }
  }, [selectedModule, modules]);

  // Smart Module Suggestion Detector based on file headers
  const detectSuggestedModule = (headers: string[], currentMod: string): string | null => {
    const lowerHeaders = headers.map((h) => h.toLowerCase().trim());
    const hasAny = (keywords: string[]) => keywords.some((k) => lowerHeaders.some((h) => h.includes(k)));

    // Detect Items
    const isItemLike = hasAny(["item name", "product name", "item", "product", "sku", "barcode", "hsn", "mrp", "sales price", "retail price", "purchase rate", "cost price", "qty sold"]);
    // Detect Parties
    const isPartyLike = hasAny(["party name", "customer name", "supplier name", "party", "customer", "supplier", "phone", "mobile", "gstin", "credit limit", "billing address"]);
    // Detect Invoices
    const isInvoiceLike = hasAny(["invoice no", "bill no", "invoice date", "bill date", "customer name", "grand total", "total amount"]);

    if (currentMod === "parties" && isItemLike && !isPartyLike) {
      return "items";
    }
    if (currentMod === "items" && isPartyLike && !isItemLike) {
      return "parties";
    }
    if (currentMod !== "sales_invoices" && isInvoiceLike && hasAny(["invoice no", "bill no"])) {
      return "sales_invoices";
    }
    return null;
  };

  // Handle File Upload and Parse
  const handleFileChange = async (selectedFile: File, targetModule = selectedModule) => {
    setFile(selectedFile);
    setErrorMessage(null);
    setIsParsing(true);
    setSuggestedModule(null);

    try {
      const res = await importApi.parseFile(selectedFile, targetModule);
      setParseResult(res);
      setSelectedSheet(res.selectedWorksheet);
      setColumnMapping(res.detectedMapping || {});

      // Check for smart module suggestion
      const suggestion = detectSuggestedModule(res.headers, targetModule);
      if (suggestion && suggestion !== targetModule) {
        setSuggestedModule(suggestion);
      }

      setStep("MAPPING");
    } catch (err: any) {
      setErrorMessage(err.message || (isGu ? "ફાઇલ વાંચવામાં નિષ્ફળતા મળી" : "Failed to parse file. Please verify file format."));
    } finally {
      setIsParsing(false);
    }
  };

  // Switch Module and Re-map
  const handleSwitchModule = async (newModule: string) => {
    setSelectedModule(newModule);
    const found = modules.find((m) => m.module === newModule);
    if (found) setCurrentSchema(found);
    setSuggestedModule(null);

    if (file) {
      setIsParsing(true);
      try {
        const res = await importApi.parseFile(file, newModule, selectedSheet);
        setParseResult(res);
        setColumnMapping(res.detectedMapping || {});
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to re-parse file for new module");
      } finally {
        setIsParsing(false);
      }
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
      setErrorMessage(err.message || (isGu ? "વર્કશીટ વાંચવામાં ભૂલ થઈ" : "Failed to read worksheet"));
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
      setFilterPreviewStatus("ALL");
      setPreviewPage(1);
    } catch (err: any) {
      setErrorMessage(err.message || (isGu ? "ડેટા ચકાસણી નિષ્ફળ રહી" : "Validation failed. Please check field mappings."));
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
    }, 350);

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
      setErrorMessage(err.message || (isGu ? "આયાત પ્રક્રિયા નિષ્ફળ રહી" : "Import execution failed."));
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
    setSuggestedModule(null);
    setStep("UPLOAD");
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

  // Module Icon Helper
  const getModuleIcon = (modKey: string) => {
    switch (modKey) {
      case "parties":
      case "customers":
      case "suppliers":
        return <Users className="w-4 h-4 text-blue-600" />;
      case "items":
      case "opening_stock":
        return <Package className="w-4 h-4 text-emerald-600" />;
      case "services":
        return <Sparkles className="w-4 h-4 text-teal-600" />;
      case "item_categories":
        return <Tag className="w-4 h-4 text-indigo-600" />;
      case "units_of_measure":
        return <Scale className="w-4 h-4 text-purple-600" />;
      case "warehouses":
        return <Warehouse className="w-4 h-4 text-amber-600" />;
      case "item_batches":
        return <Clock className="w-4 h-4 text-orange-600" />;
      case "sales_invoices":
      case "purchase_invoices":
      case "delivery_challans":
        return <Receipt className="w-4 h-4 text-cyan-600" />;
      default:
        return <FileSpreadsheet className="w-4 h-4 text-blue-600" />;
    }
  };

  // Badge class helper
  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case "MASTERS":
        return "bg-blue-50 text-blue-700 border border-blue-200/80";
      case "INVENTORY":
        return "bg-teal-50 text-teal-700 border border-teal-200/80";
      case "SALES":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200/80";
      case "PURCHASES":
        return "bg-amber-50 text-amber-700 border border-amber-200/80";
      case "ACCOUNTING":
        return "bg-purple-50 text-purple-700 border border-purple-200/80";
      default:
        return "bg-slate-100 text-slate-700 border border-slate-200";
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
        
        {/* HEADER */}
        <div className="px-5 sm:px-6 py-3.5 bg-white border-b border-slate-200 border-t-4 border-t-[#1677E8] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0 shadow-2xs">
              {getModuleIcon(selectedModule)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[15px] sm:text-base font-bold text-slate-900 tracking-tight">
                  {isGu
                    ? `${currentSchema?.titleGujarati || "ડેટા"} આયાત કરો`
                    : `Import ${currentSchema?.title || "Data"} from Spreadsheet`}
                </h2>
                {currentSchema && (
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${getCategoryBadgeClass(currentSchema.category)}`}>
                    {currentSchema.category}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {currentCompany?.tradeName || currentCompany?.legalName || "MyOwnBillBook"} • {isGu ? "સરળ ૩-સ્ટેપ એક્સેલ અને CSV આયાત" : "Simple 3-Step Excel & CSV Import"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3-STEP STREAMLINED STEPPER */}
        <div className="bg-slate-50 px-6 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs shrink-0 overflow-x-auto scrollbar-none">
          {[
            { id: "UPLOAD", label: isGu ? "૧. ફાઇલ અપલોડ" : "1. Upload File" },
            { id: "MAPPING", label: isGu ? "૨. કોલમ મેપિંગ" : "2. Map Columns" },
            { id: "PREVIEW", label: isGu ? "૩. પ્રીવ્યૂ અને આયાત" : "3. Preview & Import" },
          ].map((s, idx) => {
            const stepOrder = ["UPLOAD", "MAPPING", "PREVIEW", "EXECUTING", "REPORT"];
            const currentIdx = stepOrder.indexOf(step);
            const thisIdx = idx;
            const isCompleted = currentIdx > thisIdx || step === "REPORT";
            const isCurrent = (step === s.id) || (step === "EXECUTING" && s.id === "PREVIEW") || (step === "REPORT" && s.id === "PREVIEW");

            return (
              <div key={s.id} className="flex items-center gap-2 whitespace-nowrap">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    isCurrent
                      ? "bg-[#1677E8] text-white shadow-2xs ring-2 ring-blue-500/20"
                      : isCompleted
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {isCompleted ? <Check className="w-3 h-3" /> : idx + 1}
                </span>
                <span className={`font-semibold text-xs transition-colors ${isCurrent ? "text-[#1677E8]" : isCompleted ? "text-slate-800" : "text-slate-400"}`}>
                  {s.label}
                </span>
                {idx < 2 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 mx-2" />}
              </div>
            );
          })}
        </div>

        {/* ERROR NOTIFICATION BANNER */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between animate-shake">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-800 font-bold p-1 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* SMART MODULE SUGGESTION BANNER */}
        {suggestedModule && (
          <div className="mx-6 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                {isGu
                  ? `તમારી ફાઇલની કોલમ્સ ${modules.find((m) => m.module === suggestedModule)?.titleGujarati || suggestedModule} જેવી લાગે છે.`
                  : `Your spreadsheet headers match '${modules.find((m) => m.module === suggestedModule)?.title || suggestedModule}'.`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleSwitchModule(suggestedModule)}
              className="px-2.5 py-1 bg-[#1677E8] hover:bg-[#1268D3] text-white rounded-lg font-semibold text-[11px] cursor-pointer whitespace-nowrap shadow-2xs"
            >
              {isGu ? `ત્યાં બદલો (Switch)` : `Switch to ${modules.find((m) => m.module === suggestedModule)?.title || suggestedModule}`}
            </button>
          </div>
        )}

        {/* BODY CONTAINER */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">

          {/* ══════════════════════════════════════════════════════════ */}
          {/* STEP 1: UPLOAD FILE & SAMPLE TEMPLATE */}
          {/* ══════════════════════════════════════════════════════════ */}
          {step === "UPLOAD" && (
            <div className="space-y-6">
              
              {/* Target Module Picker if opened generically */}
              {!preselectedModule && modules.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      {isGu ? "કયો ડેટા આયાત કરવો છે તે પસંદ કરો:" : "Select Target Module to Import:"}
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {modules.length} {isGu ? "મોડ્યુલ્સ ઉપલબ્ધ" : "available"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {modules.slice(0, 8).map((m) => {
                      const isSelected = selectedModule === m.module;
                      return (
                        <button
                          key={m.module}
                          type="button"
                          onClick={() => {
                            setSelectedModule(m.module);
                            setCurrentSchema(m);
                          }}
                          className={`flex items-center gap-2 p-2 rounded-lg text-left text-xs font-medium border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-blue-50 border-blue-400 text-blue-900 shadow-2xs font-semibold"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                          }`}
                        >
                          <div className="shrink-0">{getModuleIcon(m.module)}</div>
                          <span className="truncate">{isGu ? m.titleGujarati : m.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sample Templates Card */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-[13px] text-slate-900">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>{isGu ? "સેમ્પલ ટેમ્પલેટ ડાઉનલોડ કરો" : "Download Standard Sample Template"}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {isGu
                      ? "તમારા ડેટાને સીધો કોપી-પેસ્ટ કરવા માટે પૂર્વ-તૈયાર એક્સેલ અથવા CSV ફાઇલ વાપરો."
                      : "Recommended: Use our pre-formatted spreadsheet template with sample rows for instant mapping."}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate("xlsx")}
                    className="h-9 px-3 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                    title="Download Excel format template"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>.XLSX</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate("csv")}
                    className="h-9 px-3 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                    title="Download CSV format template"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>.CSV</span>
                  </button>
                </div>
              </div>

              {/* File Upload Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileChange(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-[#1677E8] bg-slate-50/60 hover:bg-blue-50/30 rounded-2xl p-8 sm:p-10 text-center transition-all cursor-pointer group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                  accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv"
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-blue-100 text-[#1677E8] flex items-center justify-center mx-auto mb-3.5 group-hover:scale-105 transition-transform shadow-2xs">
                  <Upload className="w-7 h-7 text-[#1677E8]" />
                </div>

                <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1">
                  {isGu ? "ફાઇલ અહીં ખેંચી લાવો અથવા પસંદ કરવા ક્લિક કરો" : "Drag and drop your spreadsheet file here, or browse"}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-3">
                  {isGu
                    ? "ટેલી, માર્ગ, બીઝી અથવા એક્સેલમાંથી એક્સપોર્ટ કરેલી .xlsx, .xls કે .csv ફાઇલ અપલોડ કરો."
                    : "Supports Microsoft Excel (.xlsx, .xls) and CSV spreadsheets. Max 50 MB, up to 50,000 records."}
                </p>

                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs group-hover:border-[#1677E8] group-hover:text-[#1677E8] transition-colors">
                  <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
                  <span>{isGu ? "કોમ્પ્યુટરમાંથી ફાઇલ પસંદ કરો" : "Browse Files"}</span>
                </div>
              </div>

              {isParsing && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-center gap-3 text-blue-900 text-xs sm:text-sm">
                  <Loader2 className="w-5 h-5 text-[#1677E8] animate-spin" />
                  <span className="font-semibold">
                    {isGu ? "સ્પ્રેડશીટ ચકાસી રહ્યા છીએ અને કોલમ્સ મેપ કરી રહ્યા છીએ..." : "Reading spreadsheet and auto-detecting column mappings..."}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* STEP 2: COLUMN MAPPING & SETTINGS */}
          {/* ══════════════════════════════════════════════════════════ */}
          {step === "MAPPING" && parseResult && currentSchema && (
            <div className="space-y-6">

              {/* File Info & Sheet Switcher */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span className="truncate max-w-[220px] sm:max-w-xs">{parseResult.fileName}</span>
                      <span className="text-[11px] font-normal text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {parseResult.totalRows} {isGu ? "લાઈનો મળી" : "records detected"}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {parseResult.headers.length} {isGu ? "કોલમ્સ મળી" : "columns detected in file"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {parseResult.worksheets.length > 1 && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-500 font-medium">{isGu ? "શીટ:" : "Sheet:"}</span>
                      <div className="w-36">
                        <CustomSelect
                          size="sm"
                          value={selectedSheet}
                          onChange={(val: any) => handleSheetChange(val)}
                          options={parseResult.worksheets.map((s) => ({ value: s, label: s }))}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setParseResult(null);
                      setStep("UPLOAD");
                    }}
                    className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-lg font-medium cursor-pointer transition-colors"
                  >
                    {isGu ? "ફાઇલ બદલો" : "Change File"}
                  </button>
                </div>
              </div>

              {/* Status Alert: Required Fields Status */}
              {unmappedRequiredFields.length > 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <div>
                    <span className="font-bold">{isGu ? "જરૂરી ફીલ્ડ બાકી છે: " : "Missing required column mapping: "}</span>
                    <span>{unmappedRequiredFields.map((f) => (isGu ? f.labelGujarati : f.label)).join(", ")}.</span>
                    <span className="ml-1 text-amber-700">
                      {isGu ? "કૃપા કરીને નીચેના લિસ્ટમાંથી તે ફીલ્ડ સાથે યોગ્ય કોલમ જોડો." : "Please select the matching spreadsheet column below to proceed."}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">
                    {isGu ? "બધી જરૂરી ફીલ્ડ્સ સફળતાપૂર્વક મેપ થઈ ગઈ છે!" : "All required fields are mapped! You can review or adjust optional fields below."}
                  </span>
                </div>
              )}

              {/* Mapping Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="w-2/5">{isGu ? "તમારી ફાઇલની કોલમ (હેડર)" : "Your Spreadsheet Column"}</span>
                  <span className="w-8 text-center text-slate-400">→</span>
                  <span className="w-1/2">{isGu ? "સિસ્ટમ ફીલ્ડ" : "Software Target Field"}</span>
                </div>

                <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                  {parseResult.headers.map((header) => {
                    const currentMappedKey = columnMapping[header] || "";
                    const mappedField = currentSchema.fields.find((f) => f.key === currentMappedKey);
                    const sampleVal = parseResult.sampleRows?.[0]?.[header];

                    return (
                      <div key={header} className="p-3 hover:bg-slate-50/80 flex items-center justify-between gap-3 text-xs transition-colors">
                        {/* File Column */}
                        <div className="w-2/5 min-w-0">
                          <div className="font-bold text-slate-900 truncate">{header}</div>
                          {sampleVal !== undefined && sampleVal !== null && sampleVal !== "" && (
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                              <span className="text-slate-400">{isGu ? "સેમ્પલ: " : "Sample: "}</span>
                              <span className="font-medium text-slate-700 tabular-nums">{String(sampleVal)}</span>
                            </div>
                          )}
                        </div>

                        {/* Arrow */}
                        <div className="w-8 text-center text-slate-400 font-bold shrink-0">→</div>

                        {/* System Field Dropdown */}
                        <div className="w-1/2 flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <CustomSelect
                              size="sm"
                              value={currentMappedKey}
                              onChange={(val) => {
                                setColumnMapping((prev) => ({
                                  ...prev,
                                  [header]: val,
                                }));
                              }}
                              options={[
                                { value: "", label: `-- ${isGu ? "આ કોલમ અવગણો (Ignore)" : "Do Not Import (Ignore Column)"} --` },
                                ...currentSchema.fields.map((f) => ({
                                  value: f.key,
                                  label: `${isGu ? f.labelGujarati : f.label} ${f.required ? "*(Required)" : ""}`,
                                })),
                              ]}
                              triggerClassName={`rounded-lg border text-xs font-medium ${
                                mappedField?.required
                                  ? "border-emerald-300 bg-emerald-50/40 text-emerald-900 font-bold"
                                  : currentMappedKey
                                  ? "border-slate-300 bg-white text-slate-900"
                                  : "border-slate-200 bg-slate-50 text-slate-500"
                              }`}
                            />
                          </div>

                          {mappedField?.required && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
                              Required
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Inline Import Options & Duplicate Handling */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <ShieldAlert className="w-4 h-4 text-[#1677E8]" />
                  <span>{isGu ? "આયાત સેટિંગ્સ અને ડુપ્લિકેટ નીતિ" : "Import Options & Duplicate Policy"}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Duplicate Handling */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {isGu ? "ડુપ્લિકેટ રેકોર્ડ નીતિ:" : "Duplicate Records:"}
                    </label>
                    <CustomSelect
                      size="sm"
                      value={importMode}
                      onChange={(val: any) => setImportMode(val)}
                      options={[
                        {
                          value: ImportMode.SKIP_DUPLICATES,
                          label: isGu ? "ડુપ્લિકેટ અવગણો (Skip existing - સુરક્ષિત)" : "Skip Existing Records (Recommended)",
                        },
                        {
                          value: ImportMode.UPDATE_EXISTING,
                          label: isGu ? "હાલના રેકોર્ડ્સ અપડેટ કરો (Update)" : "Update Matching Existing Records",
                        },
                        {
                          value: ImportMode.CREATE_ONLY,
                          label: isGu ? "ફક્ત નવા બનાવો (Create Only)" : "Create Only (Fail on Duplicate)",
                        },
                      ]}
                      triggerClassName="rounded-lg border-slate-300 bg-white"
                    />
                  </div>

                  {/* Error Policy */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {isGu ? "ભૂલ હેન્ડલિંગ નીતિ:" : "If Rows Have Errors:"}
                    </label>
                    <CustomSelect
                      size="sm"
                      value={errorPolicy}
                      onChange={(val: any) => setErrorPolicy(val)}
                      options={[
                        {
                          value: ImportErrorPolicy.IMPORT_VALID_ONLY,
                          label: isGu ? "માન્ય રેકોર્ડ્સ આયાત કરો (સૂચિત)" : "Import Valid Rows Only (Recommended)",
                        },
                        {
                          value: ImportErrorPolicy.ABORT_ON_ERROR,
                          label: isGu ? "એકપણ ભૂલ પર આખી ફાઇલ રદ કરો" : "Abort Entire File on Any Error",
                        },
                      ]}
                      triggerClassName="rounded-lg border-slate-300 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep("UPLOAD")}
                  className="h-9 px-4 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-medium cursor-pointer transition-colors"
                >
                  ‹ {isGu ? "પાછળ (ફાઇલ અપલોડ)" : "Back to Upload"}
                </button>

                <button
                  type="button"
                  onClick={handleRunValidation}
                  disabled={unmappedRequiredFields.length > 0 || isValidating}
                  className="h-10 px-6 bg-[#1677E8] hover:bg-[#1268D3] disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                      <span>{isGu ? "ડેટા ચકાસી રહ્યા છીએ..." : "Validating Data..."}</span>
                    </>
                  ) : (
                    <span>{isGu ? "આગળ વધો: ડેટા પ્રીવ્યૂ જુઓ ›" : "Next: Preview & Validate Data ›"}</span>
                  )}
                </button>
              </div>

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* STEP 3: PREVIEW & CONFIRM IMPORT */}
          {/* ══════════════════════════════════════════════════════════ */}
          {step === "PREVIEW" && previewResult && (
            <div className="space-y-6">

              {/* Stat Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[11px] text-slate-500 font-medium">{isGu ? "કુલ લાઈનો" : "Total Rows"}</div>
                  <div className="text-xl font-bold text-slate-900">{previewResult.totalRows}</div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="text-[11px] text-emerald-700 font-semibold">{isGu ? "માન્ય (તૈયાર)" : "Ready to Import"}</div>
                  <div className="text-xl font-bold text-emerald-800">{previewResult.summary.newRecords}</div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="text-[11px] text-blue-700 font-semibold">
                    {importMode === ImportMode.UPDATE_EXISTING
                      ? (isGu ? "અપડેટ થશે" : "To Update")
                      : (isGu ? "અવગણાશે (Skip)" : "Duplicates to Skip")}
                  </div>
                  <div className="text-xl font-bold text-blue-800">
                    {importMode === ImportMode.UPDATE_EXISTING
                      ? previewResult.summary.updateRecords
                      : previewResult.summary.skipRecords}
                  </div>
                </div>

                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <div className="text-[11px] text-rose-700 font-semibold">{isGu ? "અમાન્ય / ભૂલ" : "Invalid / Errors"}</div>
                  <div className="text-xl font-bold text-rose-800">{previewResult.invalidRows}</div>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-2">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {[
                    { id: "ALL", label: isGu ? "બધા" : "All Rows", count: previewResult.totalRows },
                    { id: "VALID", label: isGu ? "માન્ય" : "Ready to Import", count: previewResult.validRows },
                    { id: "DUPLICATE", label: isGu ? "ડુપ્લિકેટ" : "Duplicates", count: previewResult.duplicateRows },
                    { id: "INVALID", label: isGu ? "ભૂલવાળા" : "Errors", count: previewResult.invalidRows },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setFilterPreviewStatus(tab.id);
                        setPreviewPage(1);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        filterPreviewStatus === tab.id
                          ? "bg-[#1677E8] text-white shadow-2xs"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </div>

                <span className="text-slate-400 text-xs shrink-0">
                  {isGu ? "પાનું" : "Page"} {previewPage} / {totalPages}
                </span>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                <table className="w-full text-left text-xs min-w-[620px]">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 w-14">#</th>
                      <th className="p-2.5 w-24">{isGu ? "સ્ટેટસ" : "Status"}</th>
                      <th className="p-2.5 w-24">{isGu ? "એક્શન" : "Action"}</th>
                      <th className="p-2.5">{isGu ? "ડેટા વિગત" : "Record Details"}</th>
                      <th className="p-2.5">{isGu ? "ચકાસણી નોંધ" : "Validation Notes"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400 text-xs">
                          {isGu ? "આ કેટેગરીમાં કોઈ લાઈન મળી નથી." : "No records match this filter."}
                        </td>
                      </tr>
                    ) : (
                      paginatedRows.map((r) => {
                        const identifierVal = r.data[currentSchema?.identifierField || "name"] || "—";

                        return (
                          <tr key={r.rowNumber} className="hover:bg-slate-50 transition-colors">
                            <td className="p-2.5 tabular-nums text-slate-500 font-medium">{r.rowNumber}</td>
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
                              {r.data.phone && <div className="text-[11px] text-slate-500 tabular-nums">Ph: {r.data.phone}</div>}
                              {r.data.gstin && <div className="text-[11px] text-slate-500 tabular-nums">GST: {r.data.gstin}</div>}
                              {r.data.retailPrice && <div className="text-[11px] text-slate-500 tabular-nums">Price: ₹{r.data.retailPrice}</div>}
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
                                <span className="text-emerald-600 font-medium flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Ready to import</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                    disabled={previewPage === 1}
                    className="h-8 px-3 border border-slate-300 hover:bg-slate-50 rounded-lg disabled:opacity-40 cursor-pointer font-medium"
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
                    className="h-8 px-3 border border-slate-300 hover:bg-slate-50 rounded-lg disabled:opacity-40 cursor-pointer font-medium"
                  >
                    Next ›
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStep("MAPPING")}
                  className="h-9 px-4 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-medium cursor-pointer transition-colors"
                >
                  ‹ {isGu ? "પાછળ (મેપિંગ બદલો)" : "Back to Mapping"}
                </button>

                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={previewResult.validRows === 0 && previewResult.summary.updateRecords === 0}
                  className="h-10 px-7 bg-[#1677E8] hover:bg-[#1268D3] disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isGu
                      ? `${previewResult.summary.newRecords + previewResult.summary.updateRecords} રેકોર્ડ્સ આયાત કન્ફર્મ કરો`
                      : `Confirm & Import ${previewResult.summary.newRecords + previewResult.summary.updateRecords} Records`}
                  </span>
                </button>
              </div>

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* STEP 4: EXECUTING SPINNER */}
          {/* ══════════════════════════════════════════════════════════ */}
          {step === "EXECUTING" && (
            <div className="py-16 text-center space-y-6">
              <div className="w-16 h-16 rounded-full border-4 border-blue-200 border-t-[#1677E8] animate-spin mx-auto" />
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  {isGu ? "ડેટાબેઝમાં આયાત થઈ રહી છે..." : "Importing Records into System..."}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {isGu
                    ? "એકાઉન્ટિંગ અને ઇન્વેન્ટરી નિયમો સાથે રેકોર્ડ્સ સુરક્ષિત રીતે નોંધાઈ રહ્યા છે."
                    : "Writing verified records within your isolated database environment."}
                </p>
              </div>

              <div className="w-full max-w-md mx-auto bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-[#1677E8] h-full transition-all duration-300"
                  style={{ width: `${executionProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* STEP 5: FINAL SUCCESS REPORT */}
          {/* ══════════════════════════════════════════════════════════ */}
          {step === "REPORT" && executionResult && (
            <div className="space-y-6 text-center py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl font-bold shadow-2xs">
                <Check className="w-7 h-7 text-emerald-600" />
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
                  {isGu ? "ડેટા આયાત સફળતાપૂર્વક પૂર્ણ થઈ!" : "Data Import Completed Successfully!"}
                </h3>
                <p className="text-xs text-slate-500">
                  Job ID: <span className="tabular-nums font-bold text-slate-700">{executionResult.id.slice(0, 12)}</span>
                </p>
              </div>

              {/* Execution Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto text-left">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[11px] text-slate-500 font-medium">{isGu ? "કુલ પ્રોસેસ થયેલ" : "Total Processed"}</div>
                  <div className="text-xl font-bold text-slate-900">{executionResult.totalRows}</div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="text-[11px] text-emerald-700 font-semibold">{isGu ? "નવા ઉમેરાયા" : "Newly Created"}</div>
                  <div className="text-xl font-bold text-emerald-800">{executionResult.importedRows}</div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="text-[11px] text-blue-700 font-semibold">{isGu ? "અપડેટ / અવગણ્યા" : "Updated / Skipped"}</div>
                  <div className="text-xl font-bold text-blue-800">{executionResult.updatedRows + executionResult.skippedRows}</div>
                </div>

                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <div className="text-[11px] text-rose-700 font-semibold">{isGu ? "નિષ્ફળ લાઈનો" : "Failed Rows"}</div>
                  <div className="text-xl font-bold text-rose-800">{executionResult.failedRows}</div>
                </div>
              </div>

              {/* Download Error Report if Failures */}
              {executionResult.failedRows > 0 && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs max-w-lg mx-auto flex items-center justify-between gap-3">
                  <div className="text-left">
                    <div className="font-bold">{executionResult.failedRows} {isGu ? "લાઈનોમાં ભૂલો હતી." : "rows failed validation."}</div>
                    <div className="text-slate-600">{isGu ? "ભૂલોની એક્સેલ ફાઇલ ડાઉનલોડ કરો:" : "Download diagnostic error report:"}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => importApi.downloadErrorReport(executionResult.id, "xlsx")}
                    className="h-8 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-xs cursor-pointer shadow-2xs flex items-center gap-1.5 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Error Report</span>
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="h-10 px-4 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer transition-colors"
                >
                  {isGu ? "બીજી ફાઇલ આયાત કરો" : "Import Another File"}
                </button>

                {currentSchema && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push(currentSchema.routeHref);
                    }}
                    className="h-10 px-6 bg-[#1677E8] hover:bg-[#1268D3] text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer active:scale-95 flex items-center gap-1.5"
                  >
                    <span>{isGu ? "લિસ્ટમાં જુઓ" : `View ${currentSchema.title}`}</span>
                    <ArrowRight className="w-4 h-4" />
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
