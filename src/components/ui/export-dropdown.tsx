"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ExportColumn,
  ExportMetadata,
  ExportFormat,
} from "../../lib/export/export-types";
import { executeExport } from "../../lib/export/export-engine";

export interface ExportDropdownProps {
  /** If providing data directly to the dropdown */
  columns?: ExportColumn[];
  data?: any[];
  metadata?: ExportMetadata;

  /** Or custom export handler for specialized views */
  onExport?: (format: ExportFormat) => Promise<void> | void;

  /** Selection status */
  selectedCount?: number;
  totalCount?: number;

  /** UI Customization */
  lang?: "en" | "gu" | string;
  className?: string;
  disabled?: boolean;
  themeColor?: "saffron" | "purple";
  buttonVariant?: "default" | "outline" | "compact";
  align?: "left" | "right" | "auto";
}

export function ExportDropdown({
  columns,
  data,
  metadata,
  onExport,
  selectedCount = 0,
  totalCount,
  lang = "en",
  className = "",
  disabled = false,
  themeColor = "saffron",
  buttonVariant = "default",
  align = "auto",
}: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleExport = async (format: ExportFormat) => {
    if (isExporting || disabled) return;

    setIsOpen(false);
    setIsExporting(true);
    setExportingFormat(format);
    setToastMessage(null);

    const formatLabels: Record<ExportFormat, string> = {
      xlsx: "Excel (.xlsx)",
      csv: "CSV (.csv)",
      pdf: "PDF (.pdf)",
    };

    try {
      if (onExport) {
        await onExport(format);
      } else if (columns && data && metadata) {
        await executeExport(format, columns, data, metadata);
      } else {
        throw new Error("No export handler or dataset configured for this screen.");
      }

      setToastMessage({
        type: "success",
        text:
          lang === "gu"
            ? `${formatLabels[format]} ફાઇલ સફળતાપૂર્વક ડાઉનલોડ થઈ ગઈ છે!`
            : `${formatLabels[format]} exported successfully!`,
      });
    } catch (err: any) {
      console.error("Export error:", err);
      setToastMessage({
        type: "error",
        text:
          err.message ||
          (lang === "gu"
            ? `${formatLabels[format]} એક્સપોર્ટ કરવામાં ભૂલ આવી.`
            : `Failed to export ${formatLabels[format]}.`),
      });
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  const isSaffron = themeColor === "saffron";

  const buttonClasses = {
    default:
      "py-2 px-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-[#E2E8F0] rounded-xl text-xs font-bold transition-all shadow-2xs hover:border-slate-300 active:scale-95",
    outline:
      "py-1.5 px-3 bg-[#FFF3E8] hover:bg-[#FED7AA] text-[#B94B0A] border border-[#FDBA74] rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95",
    compact:
      "py-1.5 px-2.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-[11px] font-semibold transition-all active:scale-95",
  }[buttonVariant];

  const countBadge =
    selectedCount > 0 ? (
      <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-orange-100 text-[#F47721]">
        {selectedCount}
      </span>
    ) : null;

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold animate-slideUp ${
            toastMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <span>{toastMessage.type === "success" ? "✅" : "⚠️"}</span>
          <span>{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-slate-600 text-sm font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Export ▾ Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={disabled || isExporting}
        className={`flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${buttonClasses}`}
        title={lang === "gu" ? "ડેટા એક્સપોર્ટ કરો" : "Export data"}
      >
        {isExporting ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-[#F47721] border-t-transparent rounded-full animate-spin shrink-0" />
            <span>
              {lang === "gu"
                ? `${exportingFormat?.toUpperCase()}...`
                : `Exporting ${exportingFormat?.toUpperCase()}...`}
            </span>
          </>
        ) : (
          <>
            <svg
              className="w-3.5 h-3.5 text-slate-500 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>{lang === "gu" ? "એક્સપોર્ટ" : "Export"}</span>
            {countBadge}
            <svg
              className={`w-3 h-3 text-slate-400 transition-transform duration-200 shrink-0 ${
                isOpen ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute ${
            align === "left"
              ? "left-0"
              : align === "right"
              ? "right-0"
              : "left-0 sm:left-auto sm:right-0"
          } mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200/90 py-1.5 z-40 animate-fadeIn divide-y divide-slate-100`}
        >
          {/* Header Info */}
          <div className="px-3.5 py-2 text-[11px] text-slate-500 font-medium">
            {selectedCount > 0 ? (
              <span className="text-[#F47721] font-semibold">
                {lang === "gu"
                  ? `માત્ર પસંદ કરેલ ${selectedCount} રેકોર્ડ્સ એક્સપોર્ટ થશે`
                  : `Exporting ${selectedCount} selected row${selectedCount === 1 ? "" : "s"}`}
              </span>
            ) : totalCount !== undefined ? (
              <span>
                {lang === "gu"
                  ? `તમામ ${totalCount} ફિલ્ટર કરેલા રેકોર્ડ્સ`
                  : `Exporting all ${totalCount} filtered record${totalCount === 1 ? "" : "s"}`}
              </span>
            ) : (
              <span>{lang === "gu" ? "ફોર્મેટ પસંદ કરો:" : "Choose format:"}</span>
            )}
          </div>

          {/* Format Options */}
          <div className="py-1">
            {/* 1. Excel (.xlsx) */}
            <button
              type="button"
              onClick={() => handleExport("xlsx")}
              className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 transition-colors flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                  📊
                </span>
                <div>
                  <p className="font-semibold text-slate-800 group-hover:text-emerald-900">
                    {lang === "gu" ? "એક્સેલ પત્રક (Excel)" : "Excel (.xlsx)"}
                  </p>
                  <p className="text-[10px] text-slate-400 group-hover:text-emerald-700">
                    {lang === "gu" ? "સંપૂર્ણ ગાણિતિક ફોર્મ્યુલા સપોર્ટ" : "Spreadsheet with numeric cells"}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-400 group-hover:text-emerald-600 font-semibold">
                .xlsx
              </span>
            </button>

            {/* 2. CSV (.csv) */}
            <button
              type="button"
              onClick={() => handleExport("csv")}
              className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-sky-50 hover:text-sky-900 transition-colors flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-md bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                  📄
                </span>
                <div>
                  <p className="font-semibold text-slate-800 group-hover:text-sky-900">
                    {lang === "gu" ? "સીએસવી ફાઇલ (CSV)" : "CSV (.csv)"}
                  </p>
                  <p className="text-[10px] text-slate-400 group-hover:text-sky-700">
                    {lang === "gu" ? "યુનિકોડ UTF-8 ગુજરતી સપોર્ટ" : "UTF-8 BOM tabular data"}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-400 group-hover:text-sky-600 font-semibold">
                .csv
              </span>
            </button>

            {/* 3. PDF (.pdf) */}
            <button
              type="button"
              onClick={() => handleExport("pdf")}
              className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-rose-50 hover:text-rose-900 transition-colors flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                  📑
                </span>
                <div>
                  <p className="font-semibold text-slate-800 group-hover:text-rose-900">
                    {lang === "gu" ? "પીડીએફ દસ્તાવેજ (PDF)" : "PDF (.pdf)"}
                  </p>
                  <p className="text-[10px] text-slate-400 group-hover:text-rose-700">
                    {lang === "gu" ? "પ્રિન્ટિંગ & ઓડિટ રેકોર્ડ" : "Clean printable report"}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-400 group-hover:text-rose-600 font-semibold">
                .pdf
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
