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

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
    const q = searchQuery.toLowerCase();
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
          "Failed to switch company. Please try again.",
      );
    } finally {
      setIsSwitching(null);
    }
  };

  const displayName =
    currentCompany?.tradeName ||
    currentCompany?.legalName ||
    "Select Business";

  const canAdd = entitlements?.canAddCompany ?? (companies.length < (entitlements?.maxCompanies || 1));
  const planName = entitlements?.name || "Standard";
  const usedCount = entitlements?.currentCount ?? companies.length;
  const maxLimit = entitlements?.maxCompanies ?? 1;

  // Single company view with add option if permitted
  const isOnlyOne = companies.length <= 1;

  return (
    <div className="relative inline-flex items-center min-w-0 max-w-full flex-1 sm:flex-initial" ref={containerRef}>
      {/* Switcher Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title={displayName}
        aria-label={`Current business: ${displayName}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="group flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border border-[#FED7AA] bg-[#FFFAF5] hover:bg-[#FFF5EB] hover:border-[#F47721]/50 text-left transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#F47721]/30 w-full min-w-0 sm:max-w-[280px] md:max-w-[340px] lg:max-w-[420px] shadow-2xs select-none"
      >
        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-[#F47721]/10 text-[#F47721] flex items-center justify-center shrink-0">
          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>

        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-1 min-w-0">
            <span className="block text-xs font-bold text-[#202124] truncate group-hover:text-[#F47721] transition-colors leading-tight">
              {displayName}
            </span>
            {currentCompany?.gstin && (
              <span className="text-[9px] font-mono text-[#667085] bg-white border border-[#E5E7EB] px-1 rounded hidden lg:inline shrink-0">
                {currentCompany.gstin.slice(0, 2)}
              </span>
            )}
          </div>
          {currentCompany?.city && (
            <p className="text-[10px] text-[#667085] truncate hidden sm:block leading-tight">
              {currentCompany.city}
            </p>
          )}
        </div>

        <svg
          className={`w-3.5 h-3.5 text-[#F47721] shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="fixed inset-x-2 top-16 mt-1 sm:absolute sm:inset-x-auto sm:left-0 sm:top-auto sm:mt-1.5 w-auto sm:w-96 max-w-sm rounded-xl bg-white shadow-2xl border border-[#E5E7EB] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Header & Plan Badge */}
          <div className="p-3 bg-gradient-to-r from-[#FFFAF5] to-white border-b border-[#FED7AA]/40 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#202124]">Switch Business / Company</p>
              <p className="text-[11px] text-[#667085]">
                {usedCount} of {maxLimit} Companies • {planName}
              </p>
            </div>
            <span className="text-[10px] font-semibold text-[#F47721] bg-[#FFFAF5] border border-[#FED7AA] px-2 py-0.5 rounded-md">
              {planName}
            </span>
          </div>

          {/* Search Bar */}
          {companies.length > 3 && (
            <div className="p-2 border-b border-[#F3F4F6]">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search company, GSTIN, city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#F47721] focus:bg-white"
                />
                <svg
                  className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {switchError && (
            <div className="p-2 bg-red-50 text-[11px] text-red-700 border-b border-red-100 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{switchError}</span>
            </div>
          )}

          {/* Company List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-[#F3F4F6] p-1">
            {filteredCompanies.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-500">
                No matching businesses found.
              </div>
            ) : (
              filteredCompanies.map((c) => {
                const isSelected = c.id === currentCompany?.id;
                const isLoadingThis = isSwitching === c.id;

                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={isSwitching !== null}
                    onClick={() => handleSelectCompany(c)}
                    className={`w-full flex items-start justify-between p-2.5 rounded-lg text-left transition-colors ${
                      isSelected
                        ? "bg-[#FFF7ED] border border-[#FED7AA]/60 text-[#202124]"
                        : "hover:bg-[#F9FAFB] text-[#374151]"
                    } disabled:opacity-60`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-[#111827] truncate">
                          {c.tradeName || c.legalName}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] font-bold text-[#F47721] bg-[#FFFAF5] border border-[#FED7AA] px-1.5 py-0.2 rounded">
                            Active
                          </span>
                        )}
                      </div>

                      {c.legalName && c.legalName !== c.tradeName && (
                        <p className="text-[11px] text-[#6B7280] truncate mt-0.5">
                          {c.legalName}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-1 text-[10px] text-[#9CA3AF]">
                        {c.gstin && (
                          <span className="font-mono bg-gray-100 px-1 rounded text-gray-700">
                            GST: {c.gstin}
                          </span>
                        )}
                        {c.city && <span>• {c.city}</span>}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center pt-0.5">
                      {isLoadingThis ? (
                        <svg className="w-4 h-4 animate-spin text-[#F47721]" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                        </svg>
                      ) : isSelected ? (
                        <svg className="w-4 h-4 text-[#F47721]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer: Add Company or Upgrade Action */}
          <div className="p-2.5 bg-[#FAFAFA] border-t border-[#E5E7EB]">
            {canAdd ? (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-[#F47721] bg-[#FFFAF5] border border-[#FED7AA] rounded-lg hover:bg-[#FFF5EB] transition-colors shadow-2xs"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>{lang === "gu" ? "બીજી પેઢી ઉમેરો" : "Add Another Company"}</span>
              </button>
            ) : (
              <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-center">
                <p className="text-[11px] font-semibold text-amber-800">
                  Plan Limit Reached ({usedCount}/{maxLimit})
                </p>
                <p className="text-[10px] text-amber-700 mt-0.5">
                  Upgrade to Wholesale Pro or Enterprise to add more companies.
                </p>
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
