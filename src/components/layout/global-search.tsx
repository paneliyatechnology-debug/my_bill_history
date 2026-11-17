"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/auth-context";
import { apiClient } from "../../lib/api-client";

export interface GlobalSearchResultItem {
  id: string;
  entityType: "PARTY" | "SALES_INVOICE" | "PURCHASE_INVOICE" | "ITEM" | "VOUCHER";
  name?: string;
  nameGujarati?: string;
  type?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  city?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  status?: string;
  paymentMode?: string;
  grandTotal?: number;
  paidAmount?: number;
  balanceAmount?: number;
  partyName?: string;
  partyPhone?: string;
  sku?: string;
  barcode?: string;
  hsnCode?: string;
  retailPrice?: number;
  purchaseRate?: number;
  voucherNumber?: string;
  voucherType?: string;
  voucherDate?: string;
  totalAmount?: number;
  referenceNo?: string;
  narration?: string;
  link: string;
}

export interface GlobalSearchResponse {
  query: string;
  totalMatches: number;
  parties: GlobalSearchResultItem[];
  salesInvoices: GlobalSearchResultItem[];
  purchaseInvoices: GlobalSearchResultItem[];
  items: GlobalSearchResultItem[];
  vouchers: GlobalSearchResultItem[];
}

type FilterTab = "ALL" | "PARTIES" | "SALES" | "PURCHASES" | "ITEMS" | "VOUCHERS";

interface GlobalSearchProps {
  isMobileDrawer?: boolean;
  onCloseMobileDrawer?: () => void;
}

export function GlobalSearch({ isMobileDrawer, onCloseMobileDrawer }: GlobalSearchProps) {
  const router = useRouter();
  const { lang, tenantContext } = useAuth();

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [results, setResults] = useState<GlobalSearchResponse>({
    query: "",
    totalMatches: 0,
    parties: [],
    salesInvoices: [],
    purchaseInvoices: [],
    items: [],
    vouchers: [],
  });
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Global keyboard shortcut: Ctrl+K or Cmd+K focuses search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Dismiss dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search API caller
  const performSearch = useCallback(
    async (searchTerm: string) => {
      const trimmed = searchTerm.trim();
      if (!trimmed) {
        setIsLoading(false);
        setResults({
          query: "",
          totalMatches: 0,
          parties: [],
          salesInvoices: [],
          purchaseInvoices: [],
          items: [],
          vouchers: [],
        });
        return;
      }

      setIsLoading(true);
      try {
        const res: any = await apiClient.get("/dashboard/search", { q: trimmed, limit: 6 });
        const data: GlobalSearchResponse = res?.data || res;
        setResults({
          query: data?.query || trimmed,
          totalMatches: Number(data?.totalMatches || 0),
          parties: Array.isArray(data?.parties) ? data.parties : [],
          salesInvoices: Array.isArray(data?.salesInvoices) ? data.salesInvoices : [],
          purchaseInvoices: Array.isArray(data?.purchaseInvoices) ? data.purchaseInvoices : [],
          items: Array.isArray(data?.items) ? data.items : [],
          vouchers: Array.isArray(data?.vouchers) ? data.vouchers : [],
        });
        setHighlightedIndex(0);
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [tenantContext.companyId]
  );

  // Handle typing with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val.trim()) {
      setIsLoading(false);
      setResults({
        query: "",
        totalMatches: 0,
        parties: [],
        salesInvoices: [],
        purchaseInvoices: [],
        items: [],
        vouchers: [],
      });
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = setTimeout(() => {
      performSearch(val);
    }, 250);
  };

  const handleClear = () => {
    setQuery("");
    setResults({
      query: "",
      totalMatches: 0,
      parties: [],
      salesInvoices: [],
      purchaseInvoices: [],
      items: [],
      vouchers: [],
    });
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Build flattened list of items matching active tab for keyboard navigation
  const visibleItems = useMemo(() => {
    const list: GlobalSearchResultItem[] = [];
    if (activeTab === "ALL" || activeTab === "PARTIES") {
      list.push(...results.parties);
    }
    if (activeTab === "ALL" || activeTab === "SALES") {
      list.push(...results.salesInvoices);
    }
    if (activeTab === "ALL" || activeTab === "PURCHASES") {
      list.push(...results.purchaseInvoices);
    }
    if (activeTab === "ALL" || activeTab === "ITEMS") {
      list.push(...results.items);
    }
    if (activeTab === "ALL" || activeTab === "VOUCHERS") {
      list.push(...results.vouchers);
    }
    return list;
  }, [activeTab, results]);

  const handleSelectRecord = (item: GlobalSearchResultItem) => {
    setIsOpen(false);
    if (onCloseMobileDrawer) {
      onCloseMobileDrawer();
    }
    router.push(item.link);
  };

  // Keyboard navigation inside dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (visibleItems.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % visibleItems.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (visibleItems.length > 0) {
        setHighlightedIndex((prev) => (prev - 1 + visibleItems.length) % visibleItems.length);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (visibleItems.length > 0 && visibleItems[highlightedIndex]) {
        handleSelectRecord(visibleItems[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const formatCurrency = (val?: number) => {
    return "₹" + Number(val || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input Box */}
      <div className="relative w-full flex items-center">
        <svg
          className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={
            lang === "gu"
              ? "પાર્ટી, ઇનવોઇસ, વસ્તુઓ શોધો... (Ctrl+K)"
              : "Search parties, invoices, items... (Ctrl+K)"
          }
          className="w-full h-10 pl-9 pr-14 bg-[#F8FBFF] hover:bg-white border border-[#E2E8F0] rounded-[10px] text-[13px] font-normal text-[#182230] placeholder:text-[#94A3B8] focus:bg-white focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/20 transition-all outline-none"
        />

        {/* Right side icons: Loading spinner, Clear button, Keyboard shortcut badge */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-auto">
          {isLoading ? (
            <svg
              className="animate-spin w-4 h-4 text-[#1677E8]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              ></path>
            </svg>
          ) : query ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              title="Clear search"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-slate-400 bg-white border border-slate-200 rounded shadow-xs">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Dropdown Results Card */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 sm:right-auto sm:w-[540px] mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden z-50 text-[#182230] animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Tabs Filter Bar (if query exists) */}
          {query.trim().length > 0 && results.totalMatches > 0 && (
            <div className="flex items-center gap-1 px-3 py-2 bg-slate-50/80 border-b border-slate-100 overflow-x-auto text-[11px] font-medium text-slate-600">
              <button
                type="button"
                onClick={() => setActiveTab("ALL")}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer shrink-0 ${
                  activeTab === "ALL"
                    ? "bg-white text-[#1677E8] font-semibold shadow-xs"
                    : "hover:bg-slate-200/60"
                }`}
              >
                {lang === "gu" ? "બધા" : "All"} ({results.totalMatches})
              </button>

              {results.parties.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("PARTIES")}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer shrink-0 ${
                    activeTab === "PARTIES"
                      ? "bg-white text-[#1677E8] font-semibold shadow-xs"
                      : "hover:bg-slate-200/60"
                  }`}
                >
                  {lang === "gu" ? "પાર્ટીઓ" : "Parties"} ({results.parties.length})
                </button>
              )}

              {results.salesInvoices.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("SALES")}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer shrink-0 ${
                    activeTab === "SALES"
                      ? "bg-white text-[#1677E8] font-semibold shadow-xs"
                      : "hover:bg-slate-200/60"
                  }`}
                >
                  {lang === "gu" ? "સેલ્સ બિલ" : "Sales"} ({results.salesInvoices.length})
                </button>
              )}

              {results.purchaseInvoices.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("PURCHASES")}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer shrink-0 ${
                    activeTab === "PURCHASES"
                      ? "bg-white text-[#1677E8] font-semibold shadow-xs"
                      : "hover:bg-slate-200/60"
                  }`}
                >
                  {lang === "gu" ? "પર્ચેઝ બિલ" : "Purchases"} ({results.purchaseInvoices.length})
                </button>
              )}

              {results.items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("ITEMS")}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer shrink-0 ${
                    activeTab === "ITEMS"
                      ? "bg-white text-[#1677E8] font-semibold shadow-xs"
                      : "hover:bg-slate-200/60"
                  }`}
                >
                  {lang === "gu" ? "વસ્તુઓ" : "Items"} ({results.items.length})
                </button>
              )}

              {results.vouchers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("VOUCHERS")}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer shrink-0 ${
                    activeTab === "VOUCHERS"
                      ? "bg-white text-[#1677E8] font-semibold shadow-xs"
                      : "hover:bg-slate-200/60"
                  }`}
                >
                  {lang === "gu" ? "વાઉચર" : "Vouchers"} ({results.vouchers.length})
                </button>
              )}
            </div>
          )}

          {/* Body Content */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 p-1.5">
            {/* Empty Query State: Quick Guidance */}
            {query.trim().length === 0 && (
              <div className="p-4 text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-[#1677E8] mb-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h4 className="text-[13px] font-semibold text-slate-800">
                  {lang === "gu" ? "શોધો" : "Instant Global Search"}
                </h4>
                <p className="text-[12px] text-slate-500 mt-1 max-w-xs mx-auto">
                  {lang === "gu"
                    ? "ગ્રાહકનું નામ, ફોન નંબર, GSTIN, ઇનવોઇસ નંબર અથવા વસ્તુનું નામ ટાઈપ કરો."
                    : "Search across parties, sales invoices, purchase bills, inventory items, and vouchers."}
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-600 font-medium">
                    INV/...
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-600 font-medium">
                    Customer Name
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-600 font-medium">
                    Mobile No
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-600 font-medium">
                    Item SKU / HSN
                  </span>
                </div>
              </div>
            )}

            {/* No Results Found State */}
            {query.trim().length > 0 && !isLoading && results.totalMatches === 0 && (
              <div className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-50 text-amber-600 mb-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="text-[13px] font-medium text-slate-800">
                  {lang === "gu" ? "કોઈ રેકોર્ડ મળ્યો નથી" : "No records found"}
                </p>
                <p className="text-[12px] text-slate-500 mt-1">
                  {lang === "gu"
                    ? `"${query}" માટે કોઈ પાર્ટી, ઇનવોઇસ કે આઇટમ મળી નથી.`
                    : `No matches found for "${query}". Try checking your spelling or search by contact number.`}
                </p>
              </div>
            )}

            {/* 1. Parties Section */}
            {(activeTab === "ALL" || activeTab === "PARTIES") && results.parties.length > 0 && (
              <div className="py-1">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>{lang === "gu" ? "પાર્ટીઓ" : "Parties & Customers"}</span>
                  <span className="font-semibold text-slate-500">{results.parties.length}</span>
                </div>
                {results.parties.map((p) => {
                  const itemIndex = visibleItems.findIndex((it) => it.id === p.id);
                  const isHighlighted = itemIndex === highlightedIndex;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectRecord(p)}
                      onMouseEnter={() => setHighlightedIndex(itemIndex)}
                      className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                        isHighlighted ? "bg-blue-50/80 text-blue-900" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-bold text-[13px]">
                          {(p.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-slate-900 truncate">
                              {p.name}
                            </span>
                            {p.nameGujarati && (
                              <span className="text-[11px] text-slate-500 font-gujarati truncate">
                                ({p.nameGujarati})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 truncate mt-0.5">
                            {p.phone && <span>📞 {p.phone}</span>}
                            {p.city && <span>📍 {p.city}</span>}
                            {p.gstin && <span className="font-mono">GST: {p.gstin}</span>}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase shrink-0 ${
                          p.type === "CUSTOMER"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : p.type === "SUPPLIER"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {p.type || "PARTY"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. Sales Invoices Section */}
            {(activeTab === "ALL" || activeTab === "SALES") && results.salesInvoices.length > 0 && (
              <div className="py-1">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>{lang === "gu" ? "સેલ્સ ઇનવોઇસ" : "Sales Invoices"}</span>
                  <span className="font-semibold text-slate-500">{results.salesInvoices.length}</span>
                </div>
                {results.salesInvoices.map((s) => {
                  const itemIndex = visibleItems.findIndex((it) => it.id === s.id);
                  const isHighlighted = itemIndex === highlightedIndex;
                  return (
                    <div
                      key={s.id}
                      onClick={() => handleSelectRecord(s)}
                      onMouseEnter={() => setHighlightedIndex(itemIndex)}
                      className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                        isHighlighted ? "bg-blue-50/80 text-blue-900" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1677E8] flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-bold text-slate-900 font-mono">
                              {s.invoiceNumber}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                s.status === "PAID"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : s.status === "CANCELLED"
                                  ? "bg-rose-50 text-rose-700"
                                  : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {s.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 truncate mt-0.5">
                            {s.partyName && <span>👤 {s.partyName}</span>}
                            {s.invoiceDate && <span>📅 {s.invoiceDate}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[13px] font-bold text-slate-900">
                          {formatCurrency(s.grandTotal)}
                        </div>
                        {s.balanceAmount !== undefined && s.balanceAmount > 0 && (
                          <div className="text-[10px] font-medium text-rose-600">
                            Due: {formatCurrency(s.balanceAmount)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. Purchase Invoices Section */}
            {(activeTab === "ALL" || activeTab === "PURCHASES") && results.purchaseInvoices.length > 0 && (
              <div className="py-1">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>{lang === "gu" ? "પર્ચેઝ બિલ" : "Purchase Bills"}</span>
                  <span className="font-semibold text-slate-500">{results.purchaseInvoices.length}</span>
                </div>
                {results.purchaseInvoices.map((p) => {
                  const itemIndex = visibleItems.findIndex((it) => it.id === p.id);
                  const isHighlighted = itemIndex === highlightedIndex;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectRecord(p)}
                      onMouseEnter={() => setHighlightedIndex(itemIndex)}
                      className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                        isHighlighted ? "bg-blue-50/80 text-blue-900" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                            />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-bold text-slate-900 font-mono">
                              {p.invoiceNumber}
                            </span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">
                              Bill
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 truncate mt-0.5">
                            {p.partyName && <span>🏢 {p.partyName}</span>}
                            {p.invoiceDate && <span>📅 {p.invoiceDate}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[13px] font-bold text-slate-900">
                          {formatCurrency(p.grandTotal)}
                        </div>
                        {p.balanceAmount !== undefined && p.balanceAmount > 0 && (
                          <div className="text-[10px] font-medium text-amber-600">
                            Bal: {formatCurrency(p.balanceAmount)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 4. Items / Inventory Section */}
            {(activeTab === "ALL" || activeTab === "ITEMS") && results.items.length > 0 && (
              <div className="py-1">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>{lang === "gu" ? "વસ્તુઓ અને સ્ટોક" : "Items & Products"}</span>
                  <span className="font-semibold text-slate-500">{results.items.length}</span>
                </div>
                {results.items.map((it) => {
                  const itemIndex = visibleItems.findIndex((item) => item.id === it.id);
                  const isHighlighted = itemIndex === highlightedIndex;
                  return (
                    <div
                      key={it.id}
                      onClick={() => handleSelectRecord(it)}
                      onMouseEnter={() => setHighlightedIndex(itemIndex)}
                      className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                        isHighlighted ? "bg-blue-50/80 text-blue-900" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                            />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-slate-900 truncate">
                              {it.name}
                            </span>
                            {it.nameGujarati && (
                              <span className="text-[11px] text-slate-500 font-gujarati truncate">
                                ({it.nameGujarati})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 truncate mt-0.5">
                            {it.sku && <span>SKU: {it.sku}</span>}
                            {it.hsnCode && <span>HSN: {it.hsnCode}</span>}
                            {it.barcode && <span>Bar: {it.barcode}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[13px] font-bold text-slate-900">
                          {formatCurrency(it.retailPrice)}
                        </div>
                        <div className="text-[10px] font-medium text-slate-400">
                          {it.type || "PRODUCT"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 5. Vouchers Section */}
            {(activeTab === "ALL" || activeTab === "VOUCHERS") && results.vouchers.length > 0 && (
              <div className="py-1">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>{lang === "gu" ? "વાઉચર્સ" : "Vouchers & Transactions"}</span>
                  <span className="font-semibold text-slate-500">{results.vouchers.length}</span>
                </div>
                {results.vouchers.map((v) => {
                  const itemIndex = visibleItems.findIndex((item) => item.id === v.id);
                  const isHighlighted = itemIndex === highlightedIndex;
                  return (
                    <div
                      key={v.id}
                      onClick={() => handleSelectRecord(v)}
                      onMouseEnter={() => setHighlightedIndex(itemIndex)}
                      className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                        isHighlighted ? "bg-blue-50/80 text-blue-900" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                            />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-bold text-slate-900 font-mono">
                              {v.voucherNumber}
                            </span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700">
                              {v.voucherType}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 truncate mt-0.5">
                            {v.voucherDate && <span>📅 {v.voucherDate}</span>}
                            {v.paymentMode && <span>💳 {v.paymentMode}</span>}
                            {v.referenceNo && <span>Ref: {v.referenceNo}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[13px] font-bold text-slate-900">
                          {formatCurrency(v.totalAmount)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer with Tips */}
          <div className="px-3.5 py-2 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-mono">
                  ↑
                </kbd>
                <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-mono">
                  ↓
                </kbd>
                to navigate
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-mono">
                  ↵
                </kbd>
                to select
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-mono">
                  esc
                </kbd>
                to close
              </span>
            </div>
            {results.totalMatches > 0 && (
              <span className="font-medium text-slate-600">
                {results.totalMatches} total {results.totalMatches === 1 ? "result" : "results"}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
