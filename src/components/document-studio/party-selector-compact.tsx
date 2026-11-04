"use client";

import React, { useRef, useEffect } from "react";

export interface PartySelectorCompactProps {
  label?: string;
  required?: boolean;
  selectedParty?: {
    id: string;
    name: string;
    phone?: string;
    gstin?: string;
    address?: string;
  } | null;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  filteredParties: Array<{
    id: string;
    name: string;
    phone?: string;
    gstin?: string;
    outstandingBalance?: number;
  }>;
  onSelectParty: (partyId: string) => void;
  onClearParty: () => void;
  onAddNew?: () => void;
  placeholder?: string;
}

export function PartySelectorCompact({
  selectedParty,
  searchTerm,
  onSearchChange,
  isOpen,
  onOpenChange,
  filteredParties,
  onSelectParty,
  onClearParty,
  onAddNew,
  placeholder = "Search customer...",
}: PartySelectorCompactProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onOpenChange]);

  return (
    <div className="relative min-w-0" ref={containerRef}>
      {selectedParty ? (
        /* Selected Party Chip */
        <div className="flex items-center justify-between py-1.5 px-2.5 bg-[#F8FAFC] border border-[#93C5FD]/60 rounded-xl shadow-2xs">
          <div className="min-w-0 pr-1">
            <p className="text-xs font-bold text-[#0F172A] truncate">
              {selectedParty.name}
            </p>
            {(selectedParty.phone || selectedParty.gstin) && (
              <p className="text-[10px] text-slate-500 tabular-nums truncate">
                {selectedParty.gstin ? `GST: ${selectedParty.gstin}` : selectedParty.phone}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClearParty}
            className="w-5 h-5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center text-[13px] shrink-0 cursor-pointer"
            title="Change party"
          >
            ✕
          </button>
        </div>
      ) : (
        /* Search Box with Search Icon and Quick Add Button */
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1 min-w-0">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                onSearchChange(e.target.value);
                onOpenChange(true);
              }}
              onFocus={() => onOpenChange(true)}
              placeholder={placeholder}
              className="w-full py-2 pl-8 pr-2 text-[13px] font-normal bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/10 shadow-2xs h-10"
            />
          </div>

          {onAddNew && (
            <button
              type="button"
              onClick={onAddNew}
              className="w-8 h-8 rounded-xl bg-[#EFF6FF] hover:bg-[#D4F1E8] border border-[#93C5FD]/50 text-[#0F172A] flex items-center justify-center shrink-0 transition-colors cursor-pointer shadow-2xs"
              title="Add New Party"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Autocomplete Dropdown */}
      {isOpen && !selectedParty && (
        <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-64 flex flex-col animate-in fade-in slide-in-from-top-1">
          <div className="p-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Select Party</span>
            {onAddNew && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onOpenChange(false);
                  onAddNew();
                }}
                onClick={() => {
                  onOpenChange(false);
                  onAddNew();
                }}
                className="text-[#0F172A] hover:underline font-bold"
              >
                + Add New
              </button>
            )}
          </div>
          <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
            {filteredParties.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-500">
                <p>No matches found</p>
                {onAddNew && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onOpenChange(false);
                      onAddNew();
                    }}
                    onClick={() => {
                      onOpenChange(false);
                      onAddNew();
                    }}
                    className="mt-1 text-xs text-[#0F172A] font-bold hover:underline"
                  >
                    Create &quot;{searchTerm}&quot;
                  </button>
                )}
              </div>
            ) : (
              filteredParties.map((p) => (
                <div
                  key={p.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelectParty(p.id);
                    onOpenChange(false);
                  }}
                  onClick={() => {
                    onSelectParty(p.id);
                    onOpenChange(false);
                  }}
                  className="p-2.5 hover:bg-[#F8FAFC] cursor-pointer transition-colors text-xs flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-slate-900 truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-500 tabular-nums truncate">
                      {p.phone || p.gstin || "No contact info"}
                    </p>
                  </div>
                  {p.outstandingBalance !== undefined && p.outstandingBalance !== 0 && (
                    <span className="text-[10px] tabular-nums font-bold text-slate-600 shrink-0">
                      ₹{p.outstandingBalance.toFixed(0)}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
