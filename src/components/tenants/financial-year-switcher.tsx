"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth, FinancialYearInfo } from "../../context/auth-context";

export function FinancialYearSwitcher() {
  const {
    financialYears,
    currentFY,
    switchFinancialYear,
    lang,
  } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or escape key
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

  const handleSelect = async (fyId: string) => {
    if (fyId === currentFY?.id) {
      setIsOpen(false);
      return;
    }

    setIsSwitching(fyId);
    try {
      await switchFinancialYear(fyId);
      setIsOpen(false);
    } catch (err) {
      console.error("[FinancialYearSwitcher] Failed to switch financial year:", err);
    } finally {
      setIsSwitching(null);
    }
  };

  const displayName = currentFY?.name || "FY 2026-27";

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="hidden sm:flex items-center gap-1.5 h-9 px-3 bg-white hover:bg-slate-50 border border-[#E2E8F0] hover:border-slate-300 rounded-[10px] text-[13px] font-medium text-[#182230] cursor-pointer transition-colors shadow-2xs select-none active:scale-[0.98]"
        title={lang === "gu" ? "નાણાકીય વર્ષ બદલો" : "Switch Financial Year"}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <svg
          className="w-3.5 h-3.5 text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span>{displayName}</span>
        {isSwitching ? (
          <svg className="w-3 h-3 text-[#1677E8] animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
        ) : (
          <svg
            className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {lang === "gu" ? "નાણાકીય વર્ષ પસંદ કરો" : "Select Financial Year"}
            </span>
            <span className="text-[10px] bg-blue-50 text-[#1677E8] font-semibold px-2 py-0.5 rounded-full">
              {financialYears.length} {lang === "gu" ? "વર્ષો" : "Years"}
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {financialYears.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500 text-center">
                {displayName}
              </div>
            ) : (
              financialYears.map((fy: FinancialYearInfo) => {
                const isSelected = fy.id === currentFY?.id;
                const isItemSwitching = isSwitching === fy.id;

                return (
                  <button
                    key={fy.id}
                    type="button"
                    onClick={() => handleSelect(fy.id)}
                    disabled={Boolean(isSwitching)}
                    className={`w-full px-3 py-2.5 text-left flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-blue-50/80 text-[#1677E8] font-semibold"
                        : "hover:bg-slate-50 text-slate-700 font-medium"
                    }`}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span>{fy.name}</span>
                        {fy.isCurrent && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                            {lang === "gu" ? "ચાલુ" : "Current"}
                          </span>
                        )}
                        {fy.isLocked && (
                          <span className="text-[10px] bg-slate-100 text-slate-500 font-medium px-1.5 py-0.5 rounded">
                            🔒
                          </span>
                        )}
                      </div>
                      {fy.startDate && fy.endDate && (
                        <span className="text-[10px] text-slate-400 mt-0.5 font-normal">
                          {new Date(fy.startDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}{" "}
                          -{" "}
                          {new Date(fy.endDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </div>

                    {isItemSwitching ? (
                      <svg className="w-4 h-4 text-[#1677E8] animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                    ) : isSelected ? (
                      <svg
                        className="w-4 h-4 text-[#1677E8] shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
