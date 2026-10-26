"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { apiClient } from "../../lib/api-client";
import { useAuth } from "../../context/auth-context";

export interface HsnOption {
  id: string;
  code: string;
  type: "HSN" | "SAC";
  description: string;
  descriptionGujarati?: string | null;
  gstRate: number;
  cessRate?: number;
  chapter?: string | null;
  isSystem: boolean;
  isActive: boolean;
}

interface HsnSelectorProps {
  value: string;
  onChange: (code: string, hsnItem?: HsnOption) => void;
  label?: string;
  labelGujarati?: string;
  filterType?: "ALL" | "HSN" | "SAC";
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  error?: string | null;
  helpText?: string;
}

export function HsnSelector({
  value,
  onChange,
  label = "HSN / SAC Code",
  labelGujarati = "એચએસએન / એસએસી કોડ",
  filterType = "ALL",
  required = false,
  disabled = false,
  placeholder = "Search 2–8 digit HSN or description...",
  className = "",
  error,
  helpText,
}: HsnSelectorProps) {
  const { lang } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<HsnOption[]>([]);
  const [selectedHsn, setSelectedHsn] = useState<HsnOption | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search API call with debounce
  const searchCodes = useCallback(
    async (searchTerm: string) => {
      setIsLoading(true);
      try {
        const typeParam = filterType !== "ALL" ? `&type=${filterType}` : "";
        const res: any = await apiClient.get(
          `/hsn/search?q=${encodeURIComponent(searchTerm)}&limit=15${typeParam}`,
        );
        const list = Array.isArray(res) ? res : res?.items || [];
        setOptions(list);

        // If matching current value, preserve selected reference
        if (value) {
          const match = list.find((item: HsnOption) => item.code === value);
          if (match) setSelectedHsn(match);
        }
      } catch (err) {
        console.warn("Failed to search HSN codes:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [filterType, value],
  );

  // Load initial options or fetch selected item info
  useEffect(() => {
    if (value && (!selectedHsn || selectedHsn.code !== value)) {
      searchCodes(value);
    }
  }, [value, searchCodes, selectedHsn]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
    searchCodes(val);
  };

  const handleSelect = (option: HsnOption) => {
    setSelectedHsn(option);
    setQuery("");
    setIsOpen(false);
    onChange(option.code, option);
  };

  const handleManualInput = (val: string) => {
    onChange(val.trim());
    setSelectedHsn(null);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedHsn(null);
    setQuery("");
    onChange("");
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          {lang === "gu" ? labelGujarati : label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}

      {/* Selected Box or Search Input */}
      {selectedHsn && !isOpen ? (
        <div
          onClick={() => {
            if (!disabled) {
              setIsOpen(true);
              setQuery("");
              searchCodes("");
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }}
          className={`flex items-center justify-between p-2.5 rounded-lg border bg-white cursor-pointer transition-all ${
            disabled
              ? "bg-slate-50 border-slate-200 cursor-not-allowed opacity-80"
              : error
              ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-400"
              : "border-slate-300 hover:border-emerald-500 hover:ring-1 hover:ring-emerald-500/20"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                selectedHsn.type === "SAC"
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              {selectedHsn.type}
            </span>
            <span className="font-mono font-bold text-xs text-slate-900 tracking-wide">
              {selectedHsn.code}
            </span>
            <span className="text-xs text-slate-600 truncate max-w-[200px] sm:max-w-[260px]">
              {lang === "gu" && selectedHsn.descriptionGujarati
                ? selectedHsn.descriptionGujarati
                : selectedHsn.description}
            </span>
            <span className="hidden sm:inline-flex items-center px-1.5 py-0.2 bg-slate-100 rounded text-[10px] font-medium text-slate-600">
              GST {Number(selectedHsn.gstRate)}%
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {selectedHsn.isSystem && (
              <span
                title="Official GST Master Code"
                className="text-emerald-600"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM13.707 7.707a1 1 0 00-1.414-1.414L9 9.586 7.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            )}
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            disabled={disabled}
            value={query || (value && !selectedHsn ? value : "")}
            onChange={handleInputChange}
            onFocus={() => {
              setIsOpen(true);
              if (options.length === 0) searchCodes(query || value);
            }}
            placeholder={placeholder}
            className={`w-full px-3 py-2 pl-9 rounded-lg border text-xs text-slate-900 bg-white placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${
              error
                ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-400"
                : "border-slate-300"
            } ${disabled ? "bg-slate-50 cursor-not-allowed opacity-80" : ""}`}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            {isLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            ) : (
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            )}
          </div>
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden max-h-64 flex flex-col animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              {lang === "gu"
                ? "શોધ પરિણામો (HSN / SAC)"
                : "Centralized HSN/SAC Master"}
            </span>
            <span className="font-mono text-[10px]">
              {options.length} {options.length === 1 ? "match" : "matches"}
            </span>
          </div>

          <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
            {options.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                <p className="font-medium text-slate-700">No matching HSN code found</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  You can use custom code{" "}
                  <button
                    type="button"
                    onClick={() => {
                      if (query.trim()) {
                        handleManualInput(query);
                        setIsOpen(false);
                      }
                    }}
                    className="font-mono text-emerald-600 font-bold hover:underline"
                  >
                    &ldquo;{query || value}&rdquo;
                  </button>
                </p>
              </div>
            ) : (
              options.map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => handleSelect(opt)}
                  className={`px-3 py-2.5 flex items-start justify-between gap-3 cursor-pointer hover:bg-emerald-50/50 transition-colors ${
                    value === opt.code ? "bg-emerald-50/70" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          opt.type === "SAC"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {opt.type}
                      </span>
                      <span className="font-mono font-bold text-xs text-slate-900 tracking-wider">
                        {opt.code}
                      </span>
                      {opt.isSystem ? (
                        <span
                          title="Official GST Schedule"
                          className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 bg-emerald-50 px-1 rounded border border-emerald-200"
                        >
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM13.707 7.707a1 1 0 00-1.414-1.414L9 9.586 7.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Official
                        </span>
                      ) : (
                        <span className="text-[10px] text-sky-600 bg-sky-50 px-1 rounded border border-sky-200">
                          Custom
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 mt-1 line-clamp-1">
                      {lang === "gu" && opt.descriptionGujarati
                        ? opt.descriptionGujarati
                        : opt.description}
                    </p>
                    {opt.chapter && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {opt.chapter}
                      </p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-semibold text-xs font-mono">
                      {Number(opt.gstRate)}% GST
                    </span>
                    {opt.cessRate && Number(opt.cessRate) > 0 ? (
                      <p className="text-[10px] text-amber-600 mt-0.5 font-medium">
                        +{opt.cessRate}% Cess
                      </p>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {error && <p className="text-[11px] text-rose-600 mt-1">{error}</p>}
      {helpText && !error && (
        <p className="text-[11px] text-slate-400 mt-1">{helpText}</p>
      )}
    </div>
  );
}
