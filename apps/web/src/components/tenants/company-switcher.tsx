"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useAuth, CompanyInfo } from "../../context/auth-context";
import { CreateCompanyModal } from "./create-company-modal";

export function CompanySwitcher() {
  const {
    companies,
    currentCompany,
    switchCompany,
    entitlements,
    user,
    lang,
  } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSwitching, setIsSwitching] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside or touch outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSwitchError(null);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Filtered companies based on search
  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const q = searchQuery.toLowerCase().trim();
    return companies.filter(
      (c) =>
        c.tradeName?.toLowerCase().includes(q) ||
        c.legalName?.toLowerCase().includes(q) ||
        c.gstin?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q),
    );
  }, [companies, searchQuery]);

  const handleSelectCompany = async (company: CompanyInfo) => {
    if (company.id === currentCompany?.id) {
      setIsOpen(false);
      return;
    }

    setIsSwitching(company.id);
    setSwitchError(null);

    try {
      await switchCompany(company.id);
      setIsOpen(false);
    } catch (err: any) {
      setSwitchError(
        err?.messageGujarati ||
          err?.message ||
          (lang === "gu"
            ? "પેઢી બદલવામાં નિષ્ફળતા મળી. કૃપા કરીને ફરી પ્રયાસ કરો."
            : "Failed to switch company. Please try again."),
      );
    } finally {
      setIsSwitching(null);
    }
  };

  const displayName =
    currentCompany?.tradeName ||
    currentCompany?.legalName ||
    (lang === "gu" ? "વેપાર પસંદ કરો" : "Select Business");

  const canAdd =
    entitlements?.canAddCompany ??
    (companies.length < (entitlements?.maxCompanies || 1));
  const planName = entitlements?.name || "Standard";
  const usedCount = entitlements?.currentCount ?? companies.length;
  const maxLimit = entitlements?.maxCompanies ?? 1;

  // Helper to generate initials from company name
  const getInitials = (name?: string) => {
    if (!name) return "CO";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div
      className="relative inline-flex items-center min-w-0"
      ref={containerRef}
    >
      {/* Switcher Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Current business: ${displayName}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="group flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border border-orange-200/90 bg-gradient-to-r from-orange-50/70 to-amber-50/40 hover:from-orange-50 hover:to-amber-50 hover:border-[#E87536]/50 text-left transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#E87536]/30 max-w-[150px] min-[390px]:max-w-[190px] sm:max-w-[280px] md:max-w-[340px] shadow-xs select-none shrink min-w-0"
      >
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#E87536] text-white flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 shadow-xs uppercase">
          {getInitials(displayName)}
        </div>

        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="block text-xs min-[400px]:text-sm font-bold text-slate-900 truncate group-hover:text-[#E87536] transition-colors leading-tight">
              {displayName}
            </span>
            {currentCompany?.gstin && (
              <span className="text-[10px] font-mono text-slate-600 bg-white border border-slate-200 px-1 py-0.2 rounded hidden lg:inline shrink-0 font-medium">
                {currentCompany.gstin.slice(0, 2)}
              </span>
            )}
          </div>
          {currentCompany?.city && (
            <p className="text-[11px] text-slate-500 truncate leading-tight mt-0.5 hidden sm:block">
              {currentCompany.city}
            </p>
          )}
        </div>

        <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md flex items-center justify-center text-slate-400 group-hover:text-[#E87536] shrink-0 transition-colors">
          <svg
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-[#E87536]" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] z-40 sm:hidden animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          className="fixed inset-x-3 top-[3.75rem] sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:mt-2 w-auto sm:w-[390px] max-w-[calc(100vw-1.5rem)] rounded-2xl bg-white shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          role="dialog"
          aria-label="Switch Business Dropdown"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-orange-50/80 via-amber-50/40 to-white border-b border-orange-100/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-[#F47721] flex items-center justify-center shrink-0">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  {lang === "gu" ? "વેપાર / પેઢી પસંદ કરો" : "Switch Business / Company"}
                </p>
                <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                  {usedCount} of {maxLimit} {lang === "gu" ? "પેઢીઓ" : "Companies"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-full shadow-2xs">
                {planName}
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors sm:hidden"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Search Bar (visible if companies > 1) */}
          {companies.length > 1 && (
            <div className="p-2.5 border-b border-slate-100 bg-slate-50/50">
              <div className="relative flex items-center">
                <svg
                  className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none"
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
                  ref={searchInputRef}
                  type="text"
                  placeholder={
                    lang === "gu"
                      ? "પેઢી નામ, GSTIN અથવા શહેરથી શોધો..."
                      : "Search business, GSTIN, city..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F47721]/30 focus:border-[#F47721] text-slate-800 placeholder:text-slate-400 transition-all shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                    title="Clear search"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Error Banner */}
          {switchError && (
            <div className="px-3.5 py-2.5 bg-rose-50 text-xs text-rose-700 border-b border-rose-100 flex items-center gap-2">
              <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="flex-1 font-medium">{switchError}</span>
              <button
                type="button"
                onClick={() => setSwitchError(null)}
                className="text-rose-400 hover:text-rose-700 p-0.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Company List */}
          <div className="max-h-[300px] overflow-y-auto p-2 space-y-1.5 divide-y-0">
            {filteredCompanies.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="text-xs font-semibold text-slate-700">
                  {lang === "gu" ? "કોઈ પેઢી મળી નથી" : "No matching businesses found"}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {lang === "gu"
                    ? "બીજા નામ અથવા GSTIN થી શોધો"
                    : "Try searching with a different term"}
                </p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="mt-2.5 text-xs text-[#F47721] font-semibold hover:underline"
                  >
                    {lang === "gu" ? "શોધ સાફ કરો" : "Clear search"}
                  </button>
                )}
              </div>
            ) : (
              filteredCompanies.map((c) => {
                const isSelected = c.id === currentCompany?.id;
                const isLoadingThis = isSwitching === c.id;
                const companyName = c.tradeName || c.legalName || "Company";
                const initials = getInitials(companyName);

                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={isSwitching !== null}
                    onClick={() => handleSelectCompany(c)}
                    className={`w-full group flex items-start gap-3 p-2.5 rounded-xl text-left transition-all duration-150 border ${
                      isSelected
                        ? "bg-gradient-to-r from-orange-50/90 to-amber-50/60 border-orange-200/90 shadow-2xs"
                        : "bg-white hover:bg-slate-50/90 border-transparent hover:border-slate-200/80"
                    } disabled:opacity-60 cursor-pointer`}
                  >
                    {/* Company Avatar */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs uppercase ${
                        isSelected
                          ? "bg-gradient-to-br from-[#F47721] to-[#D95F12] text-white"
                          : "bg-slate-100 text-slate-700 group-hover:bg-[#F47721] group-hover:text-white transition-colors"
                      }`}
                    >
                      {initials}
                    </div>

                    {/* Company Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-[#F47721] transition-colors leading-tight">
                          {companyName}
                        </span>
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full leading-tight">
                            <svg className="w-2.5 h-2.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            {lang === "gu" ? "સક્રિય" : "Active"}
                          </span>
                        )}
                      </div>

                      {c.legalName && c.legalName !== c.tradeName && (
                        <p className="text-[11px] text-slate-500 truncate mt-0.5 leading-tight">
                          {c.legalName}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 flex-wrap">
                        {c.gstin && (
                          <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200 font-medium">
                            GST: {c.gstin}
                          </span>
                        )}
                        {c.city && (
                          <span className="inline-flex items-center gap-0.5 text-slate-500">
                            <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {c.city}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Action / State */}
                    <div className="shrink-0 flex items-center self-center pl-1">
                      {isLoadingThis ? (
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#F47721]">
                          <svg className="w-4 h-4 animate-spin text-[#F47721]" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                          </svg>
                        </div>
                      ) : isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full text-slate-300 group-hover:text-[#F47721] group-hover:bg-orange-50 flex items-center justify-center transition-all">
                          <svg className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Action */}
          <div className="p-3 bg-slate-50/80 border-t border-slate-100">
            {canAdd ? (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-white bg-gradient-to-r from-[#F47721] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] rounded-xl transition-all shadow-xs hover:shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>
                  {lang === "gu" ? "+ નવી પેઢી / વેપાર ઉમેરો" : "+ Add New Business / Company"}
                </span>
              </button>
            ) : (
              <div className="p-2.5 bg-gradient-to-r from-amber-50/90 to-orange-50/60 rounded-xl border border-amber-200/80">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-amber-900 leading-tight">
                      {lang === "gu"
                        ? `પ્લાન મર્યાદા પૂર્ણ (${usedCount}/${maxLimit})`
                        : `Plan Limit Reached (${usedCount}/${maxLimit})`}
                    </p>
                    <p className="text-[10px] text-amber-800/90 leading-tight mt-0.5">
                      {lang === "gu"
                        ? "વધુ પેઢીઓ ઉમેરવા માટે Wholesale Pro અથવા Enterprise પ્લાન પસંદ કરો."
                        : `You are on ${planName} plan. Upgrade to Wholesale Pro or Enterprise to add more companies.`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Company Creation Modal */}
      <CreateCompanyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
        }}
      />
    </div>
  );
}
