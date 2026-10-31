"use client";

import React from "react";
import { DocumentItemsCardProps } from "./types";

export function DocumentItemsCard({
  title = "Items & Services",
  itemsCount,
  totalQty,
  itemsTotal,
  onScanItem,
  onImportItems,
  onAddItem,
  onAddBlankRow,
  addItemLabel = "+ Add Item",
  children,
}: DocumentItemsCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Card Header */}
      <div className="p-4 sm:px-6 sm:py-4 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 bg-[#FAFBF7]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-[#174B43] flex items-center justify-center shadow-2xs">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-[#1A2E2B] tracking-tight">
              {title}
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              {itemsCount} {itemsCount === 1 ? "line item" : "line items"} added
            </p>
          </div>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {onScanItem && (
            <button
              type="button"
              onClick={onScanItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F2FAF7] hover:border-[#85D5C2] text-slate-700 hover:text-[#174B43] border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <span>Scan Item</span>
            </button>
          )}

          {onImportItems && (
            <button
              type="button"
              onClick={onImportItems}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F2FAF7] hover:border-[#85D5C2] text-slate-700 hover:text-[#174B43] border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Import</span>
            </button>
          )}

          {onAddItem && (
            <button
              type="button"
              onClick={onAddItem}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#174B43] hover:bg-[#123B35] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <span>{addItemLabel}</span>
              <svg className="w-3.5 h-3.5 text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        {children}
      </div>

      {/* Card Footer */}
      <div className="p-3 sm:px-6 sm:py-3.5 border-t border-slate-200/80 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          {onAddBlankRow && (
            <button
              type="button"
              onClick={onAddBlankRow}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#F2FAF7] hover:bg-[#E6F7F2] text-[#174B43] border border-[#85D5C2]/40 rounded-xl font-bold transition-colors cursor-pointer"
            >
              <span className="font-black">+</span>
              <span>Add More Item</span>
            </button>
          )}
        </div>

        {(totalQty !== undefined || itemsTotal !== undefined) && (
          <div className="flex items-center gap-4 text-slate-600 font-mono font-medium">
            {totalQty !== undefined && (
              <span>Total Qty: <strong className="text-slate-900">{totalQty}</strong></span>
            )}
            {itemsTotal !== undefined && (
              <span>Items Total: <strong className="text-slate-900 text-sm">{itemsTotal}</strong></span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
