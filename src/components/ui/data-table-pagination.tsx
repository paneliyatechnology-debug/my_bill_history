"use client";

import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export interface DataTablePaginationProps {
  currentPage: number;
  pageSize: number;
  totalRecords?: number;
  totalItems?: number;
  totalPages?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  lang?: "en" | "gu";
  loading?: boolean;
  className?: string;
  showPageSize?: boolean;
  showFirstLast?: boolean;
}

export function DataTablePagination({
  currentPage,
  pageSize,
  totalRecords,
  totalItems,
  totalPages: propTotalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  lang = "en",
  loading = false,
  className = "",
  showPageSize = true,
  showFirstLast = false,
}: DataTablePaginationProps) {
  const effectiveTotalRecords = totalRecords ?? totalItems ?? (propTotalPages ? propTotalPages * pageSize : 0);
  const totalPages = propTotalPages ?? Math.max(1, Math.ceil(effectiveTotalRecords / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startRecord = effectiveTotalRecords === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endRecord = Math.min(safePage * pageSize, effectiveTotalRecords);

  // Generate pagination items with ellipses
  const getPageNumbers = (): (number | "ellipsis")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safePage <= 4) {
      return [1, 2, 3, 4, 5, "ellipsis", totalPages];
    }
    if (safePage >= totalPages - 3) {
      return [
        1,
        "ellipsis",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }
    return [
      1,
      "ellipsis",
      safePage - 1,
      safePage,
      safePage + 1,
      "ellipsis",
      totalPages,
    ];
  };

  const pages = getPageNumbers();

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-1 py-3 text-[13px] text-slate-600 select-none ${className}`}
    >
      {/* Left side: Showing X–Y of Z entries */}
      <div className="flex items-center gap-2 text-slate-600 font-normal">
        {lang === "gu" ? (
          <span>
            કુલ <span className="font-semibold text-slate-800">{effectiveTotalRecords}</span> માંથી{" "}
            <span className="font-semibold text-slate-800 tabular-nums">
              {startRecord}–{endRecord}
            </span>{" "}
            દર્શાવે છે
          </span>
        ) : (
          <span>
            Showing{" "}
            <span className="font-semibold text-slate-800 tabular-nums">
              {startRecord}–{endRecord}
            </span>{" "}
            of <span className="font-semibold text-slate-800 tabular-nums">{effectiveTotalRecords}</span> entries
          </span>
        )}
      </div>

      {/* Right side: Rows per page + Controls */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Rows per page selector */}
        {showPageSize && onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="hidden sm:inline">
              {lang === "gu" ? "પ્રતિ પૃષ્ઠ:" : "Rows per page:"}
            </span>
            <div className="relative">
              <select
                aria-label={lang === "gu" ? "પ્રતિ પૃષ્ઠ પંક્તિઓ" : "Rows per page"}
                value={pageSize}
                onChange={(e) => {
                  const newSize = Number(e.target.value);
                  onPageSizeChange(newSize);
                  onPageChange(1);
                }}
                disabled={loading}
                className="h-[36px] bg-white border border-[#E2E8F0] hover:border-slate-300 text-slate-700 text-xs font-medium rounded-lg px-2.5 pr-7 focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] transition-colors cursor-pointer disabled:opacity-50 appearance-none shadow-2xs"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Page Buttons Container */}
        <div className="flex items-center gap-1">
          {showFirstLast && (
            <button
              type="button"
              onClick={() => onPageChange(1)}
              disabled={safePage === 1 || loading}
              className="h-[36px] w-[36px] flex items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
              title={lang === "gu" ? "પ્રથમ પૃષ્ઠ" : "First Page"}
              aria-label="First Page"
            >
              <ChevronsLeft className="w-4 h-4" strokeWidth={1.75} />
            </button>
          )}

          {/* Previous Page Button [‹] */}
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            disabled={safePage === 1 || loading}
            className="h-[36px] px-2.5 sm:px-3 flex items-center justify-center gap-1 rounded-lg border border-[#E2E8F0] bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
            title={lang === "gu" ? "અગાઉનું પૃષ્ઠ" : "Previous Page"}
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
            <span className="hidden md:inline">{lang === "gu" ? "અગાઉનું" : "Prev"}</span>
          </button>

          {/* Numbered Page Buttons with Ellipsis */}
          <div className="flex items-center gap-1">
            {pages.map((pageNum, idx) =>
              pageNum === "ellipsis" ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="h-[36px] w-[28px] flex items-center justify-center text-slate-400 text-xs font-medium"
                >
                  …
                </span>
              ) : (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  disabled={loading}
                  className={`min-w-[36px] h-[36px] px-2.5 rounded-lg text-xs transition-all cursor-pointer font-medium tabular-nums shadow-2xs ${
                    safePage === pageNum
                      ? "bg-[#2563EB] text-white border border-[#2563EB] font-semibold shadow-xs"
                      : "bg-white border border-[#E2E8F0] text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300"
                  }`}
                  aria-label={`Page ${pageNum}`}
                  aria-current={safePage === pageNum ? "page" : undefined}
                >
                  {pageNum}
                </button>
              )
            )}
          </div>

          {/* Next Page Button [›] */}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
            disabled={safePage === totalPages || loading}
            className="h-[36px] px-2.5 sm:px-3 flex items-center justify-center gap-1 rounded-lg border border-[#E2E8F0] bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
            title={lang === "gu" ? "આગળનું પૃષ્ઠ" : "Next Page"}
            aria-label="Next Page"
          >
            <span className="hidden md:inline">{lang === "gu" ? "આગળનું" : "Next"}</span>
            <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
          </button>

          {showFirstLast && (
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              disabled={safePage === totalPages || loading}
              className="h-[36px] w-[36px] flex items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
              title={lang === "gu" ? "છેલ્લું પૃષ્ઠ" : "Last Page"}
              aria-label="Last Page"
            >
              <ChevronsRight className="w-4 h-4" strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
