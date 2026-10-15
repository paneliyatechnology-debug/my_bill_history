"use client";

import React, { useState, useMemo } from "react";

export interface ColumnDef<T> {
  id?: string;
  header: string | React.ReactNode;
  accessorKey?: keyof T | string;
  accessorFn?: (row: T) => any;
  cell?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor?: (row: T, index?: number) => string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: (keyof T | string)[];
  customSearchFn?: (row: T, query: string) => boolean;
  initialPageSize?: number;
  pageSize?: number;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  emptyMessage?: string;
  emptyMessageGujarati?: string;
  emptyState?: React.ReactNode;
  lang?: "en" | "gu";
  filtersSlot?: React.ReactNode;
  toolbarChildren?: React.ReactNode;
  actionsSlot?: React.ReactNode;
  isLoading?: boolean;
  defaultSortKey?: string;
  defaultSortOrder?: "asc" | "desc";
  onRowClick?: (row: T) => void;
  exportable?: boolean;
  exportFileName?: string;
  exportFilename?: string;
  themeColor?: "saffron" | "purple";
  mobileCardRender?: (row: T, index: number) => React.ReactNode;
}

function getCellValue<T>(row: T, col: ColumnDef<T>): any {
  if (col.accessorFn) return col.accessorFn(row);
  if (col.accessorKey) {
    const keyStr = String(col.accessorKey);
    if (keyStr.includes(".")) {
      return keyStr.split(".").reduce((acc: any, part) => (acc ? acc[part] : undefined), row);
    }
    return (row as any)[col.accessorKey];
  }
  return undefined;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  searchable = true,
  searchPlaceholder,
  searchKeys,
  customSearchFn,
  initialPageSize = 10,
  pageSize: pageSizeProp,
  defaultPageSize,
  pageSizeOptions = [10, 25, 50, 100],
  emptyMessage = "No records found.",
  emptyMessageGujarati = "કોઈ રેકોર્ડ મળ્યા નથી.",
  emptyState,
  lang = "en",
  filtersSlot,
  toolbarChildren,
  actionsSlot,
  isLoading = false,
  defaultSortKey,
  defaultSortOrder = "asc",
  onRowClick,
  exportable = false,
  exportFileName = "table_export",
  exportFilename,
  themeColor = "saffron",
  mobileCardRender,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const startingPageSize = pageSizeProp ?? defaultPageSize ?? initialPageSize ?? 10;
  const [pageSize, setPageSize] = useState(startingPageSize);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey || null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(defaultSortOrder);

  const activeExportFileName = exportFilename || exportFileName;
  const resolveKey = keyExtractor 
    ? ((row: T, idx?: number) => keyExtractor(row, idx)) 
    : ((row: any, idx?: number) => row?.id || row?.key || row?.code || row?.transferId || String(idx));

  // 1. FILTERING
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const query = searchQuery.trim().toLowerCase();

    return data.filter((row) => {
      if (customSearchFn) {
        return customSearchFn(row, query);
      }

      // If specific searchKeys provided
      if (searchKeys && searchKeys.length > 0) {
        return searchKeys.some((k) => {
          const val = String(k).includes(".")
            ? String(k).split(".").reduce((acc: any, part) => (acc ? acc[part] : undefined), row)
            : (row as any)[k];
          return val !== null && val !== undefined && String(val).toLowerCase().includes(query);
        });
      }

      // Default: search all columns
      return columns.some((col) => {
        const val = getCellValue(row, col);
        return val !== null && val !== undefined && String(val).toLowerCase().includes(query);
      });
    });
  }, [data, searchQuery, customSearchFn, searchKeys, columns]);

  // Reset to page 1 on search
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  // 2. SORTING
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    const targetCol = columns.find(
      (c) => (c.id && c.id === sortKey) || (c.accessorKey && String(c.accessorKey) === sortKey)
    );
    if (!targetCol) return filteredData;

    return [...filteredData].sort((a, b) => {
      const valA = getCellValue(a, targetCol);
      const valB = getCellValue(b, targetCol);

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      // Handle numbers
      if (typeof valA === "number" && typeof valB === "number") {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }

      // Handle Dates
      const dateA = new Date(valA).getTime();
      const dateB = new Date(valB).getTime();
      if (!isNaN(dateA) && !isNaN(dateB) && typeof valA !== "boolean") {
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      }

      // String comparison
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      const comp = strA.localeCompare(strB);
      return sortOrder === "asc" ? comp : -comp;
    });
  }, [filteredData, sortKey, sortOrder, columns]);

  // 3. PAGINATION
  const totalEntries = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const startIdx = (safePage - 1) * pageSize;
    return sortedData.slice(startIdx, startIdx + pageSize);
  }, [sortedData, safePage, pageSize]);

  const startEntry = totalEntries === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endEntry = Math.min(safePage * pageSize, totalEntries);

  // Sorting handler
  const handleSort = (col: ColumnDef<T>) => {
    if (!col.sortable) return;
    const colKey = col.id || (col.accessorKey ? String(col.accessorKey) : null);
    if (!colKey) return;

    if (sortKey === colKey) {
      if (sortOrder === "asc") {
        setSortOrder("desc");
      } else {
        setSortKey(null);
        setSortOrder("asc");
      }
    } else {
      setSortKey(colKey);
      setSortOrder("asc");
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    if (sortedData.length === 0) return;
    const exportHeaders = columns
      .filter((c) => typeof c.header === "string")
      .map((c) => `"${c.header}"`)
      .join(",");

    const rows = sortedData.map((row) =>
      columns
        .filter((c) => typeof c.header === "string")
        .map((c) => {
          const val = getCellValue(row, c);
          if (val === null || val === undefined) return '""';
          const cleanStr = String(val).replace(/"/g, '""');
          return `"${cleanStr}"`;
        })
        .join(",")
    );

    const csvContent = "data:text/csv;charset=utf-8," + [exportHeaders, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeExportFileName}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate pagination page numbers
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push("ellipsis");
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (safePage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  const isSaffron = themeColor === "saffron";
  const focusRingClass = isSaffron ? "focus:ring-[#F47721]" : "focus:ring-purple-500";
  const activePageClass = isSaffron ? "bg-[#F47721] text-white shadow-sm" : "bg-[#7C3AED] text-white shadow-sm";
  const sortedHeaderClass = isSaffron ? "bg-[#FFF3E8] text-[#F47721]" : "bg-purple-50/70 text-purple-700";
  const spinnerClass = isSaffron ? "border-[#F47721]" : "border-purple-600";

  return (
    <div className="w-full space-y-4">
      {/* ================= CONTROLS TOOLBAR ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
        {/* Left: Page Size Selector & Search */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full md:w-auto">
          {/* Page size dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
            <span>{lang === "gu" ? "દર્શાવો" : "Show"}</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className={`bg-white border border-[#E2E8F0] text-xs font-semibold rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-1 ${focusRingClass} transition-all cursor-pointer shadow-2xs`}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <span className="hidden sm:inline">{lang === "gu" ? "એન્ટ્રીઝ" : "entries"}</span>
          </div>

          {/* Quick Search */}
          {searchable && (
            <div className="relative flex-1 sm:w-72 md:w-80">
              <span className="absolute left-3 top-2.5 text-slate-400 pointer-events-none">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder={
                  searchPlaceholder ||
                  (lang === "gu" ? "શોધો (Search)..." : "Search in table...")
                }
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className={`w-full pl-8 pr-7 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 ${focusRingClass} transition-all`}
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearchChange("")}
                  className="absolute right-2.5 top-2.5 text-xs text-[#98A2B3] hover:text-[#202124]"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Custom Filters Slot & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          {filtersSlot}
          {toolbarChildren}

          {exportable && (
            <button
              onClick={handleExportCsv}
              disabled={sortedData.length === 0}
              className="py-2 px-3.5 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 border border-[#E2E8F0] rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              title="Export as CSV"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="hidden sm:inline">{lang === "gu" ? "CSV એક્સપોર્ટ" : "CSV"}</span>
            </button>
          )}

          {actionsSlot}
        </div>
      </div>

      {/* ================= TABLE CONTAINER ================= */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-xs relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-10">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-md border border-[#E5E7EB]">
              <div className={`w-4 h-4 border-2 ${spinnerClass} border-t-transparent rounded-full animate-spin`} />
              <span className="text-xs font-bold text-[#202124]">
                {lang === "gu" ? "ડેટા લોડ થઈ રહ્યો છે..." : "Loading records..."}
              </span>
            </div>
          </div>
        )}

        {/* Optional Mobile Card Presentation if mobileCardRender is provided */}
        {mobileCardRender && (
          <div className="block md:hidden divide-y divide-[#E5E7EB]">
            {paginatedData.length === 0 ? (
              emptyState ? (
                <div className="p-4">{emptyState}</div>
              ) : (
                <div className="py-12 text-center text-[#98A2B3] px-4">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="text-3xl">📄</span>
                    <p className="text-xs font-bold text-[#667085]">
                      {lang === "gu" ? emptyMessageGujarati : emptyMessage}
                    </p>
                    {searchQuery && (
                      <p className="text-[11px] text-[#98A2B3]">
                        {lang === "gu"
                          ? `"${searchQuery}" માટે કોઈ પરિણામ મળ્યું નથી.`
                          : `No results matching "${searchQuery}".`}
                      </p>
                    )}
                  </div>
                </div>
              )
            ) : (
              paginatedData.map((row, idx) => mobileCardRender(row, (safePage - 1) * pageSize + idx))
            )}
          </div>
        )}

        {/* Desktop Table Presentation (or all screen sizes if mobileCardRender is not supplied) */}
        <div className={`${mobileCardRender ? "hidden md:block" : "block"} overflow-x-auto min-h-[160px]`}>
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFBFD] border-b border-[#E2E8F0] text-[#64748B] uppercase font-bold text-[11px] tracking-wider select-none">
              <tr>
                {columns.map((col, idx) => {
                  const colKey = col.id || (col.accessorKey ? String(col.accessorKey) : null);
                  const isSorted = colKey && sortKey === colKey;
                  const alignFlex = col.align === "right" ? "justify-end" : col.align === "center" ? "justify-center" : "justify-start";
                  const alignText = col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left";

                  return (
                    <th
                      key={colKey || idx}
                      onClick={() => handleSort(col)}
                      className={`py-3.5 px-4 font-bold ${alignText} ${col.headerClassName || ""} ${
                        col.sortable ? "cursor-pointer hover:bg-slate-100/70 transition-colors" : ""
                      } ${isSorted ? sortedHeaderClass : ""}`}
                    >
                      <div className={`flex items-center gap-1.5 ${alignFlex}`}>
                        <span>{col.header}</span>
                        {col.sortable && (
                          <span className="text-[10px] text-slate-400 font-normal">
                            {isSorted ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#F1F5F9] text-slate-900">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-[#98A2B3]">
                    {emptyState ? (
                      emptyState
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="text-3xl">📄</span>
                        <p className="text-xs font-bold text-[#667085]">
                          {lang === "gu" ? emptyMessageGujarati : emptyMessage}
                        </p>
                        {searchQuery && (
                          <p className="text-[11px] text-[#98A2B3]">
                            {lang === "gu"
                              ? `"${searchQuery}" માટે કોઈ પરિણામ મળ્યું નથી.`
                              : `No results matching "${searchQuery}".`}
                          </p>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, rowIdx) => (
                  <tr
                    key={resolveKey(row, (safePage - 1) * pageSize + rowIdx)}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`hover:bg-[#FAFBFD] transition-colors ${
                      onRowClick ? "cursor-pointer" : ""
                    }`}
                  >
                    {columns.map((col, colIdx) => {
                      const cellAlign = col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left";
                      return (
                        <td
                          key={col.id || (col.accessorKey ? String(col.accessorKey) : colIdx)}
                          className={`py-3.5 px-4 ${cellAlign} ${col.className || ""}`}
                        >
                          {col.cell
                            ? col.cell(row, (safePage - 1) * pageSize + rowIdx)
                            : String(getCellValue(row, col) ?? "—")}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ================= PAGINATION FOOTER ================= */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
          {/* Entries summary */}
          <div className="font-medium text-center sm:text-left">
            {lang === "gu" ? (
              <span>
                કુલ <span className="font-bold text-[#202124]">{totalEntries}</span> માંથી{" "}
                <span className="font-bold text-[#202124]">{startEntry}</span> થી{" "}
                <span className="font-bold text-[#202124]">{endEntry}</span> દર્શાવી રહ્યા છીએ
                {filteredData.length !== data.length && (
                  <span className="text-[#98A2B3] ml-1">
                    (કુલ {data.length} માંથી ફિલ્ટર થયેલ)
                  </span>
                )}
              </span>
            ) : (
              <span>
                Showing <span className="font-bold text-[#202124]">{startEntry}</span> to{" "}
                <span className="font-bold text-[#202124]">{endEntry}</span> of{" "}
                <span className="font-bold text-[#202124]">{totalEntries}</span> entries
                {filteredData.length !== data.length && (
                  <span className="text-[#98A2B3] ml-1">
                    (filtered from {data.length} total entries)
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Navigation Controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              {/* First Page */}
              <button
                onClick={() => setCurrentPage(1)}
                disabled={safePage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[#202124] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F3F4F6] transition-all font-semibold cursor-pointer"
                title="First Page"
              >
                «
              </button>

              {/* Prev Page */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[#202124] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F3F4F6] transition-all font-semibold cursor-pointer"
                title="Previous Page"
              >
                {lang === "gu" ? "અગાઉનું" : "Previous"}
              </button>

              {/* Page Number Buttons */}
              <div className="hidden md:flex items-center gap-1">
                {getPageNumbers().map((pageNum, idx) =>
                  pageNum === "ellipsis" ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-[#98A2B3]">
                      …
                    </span>
                  ) : (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        safePage === pageNum
                          ? activePageClass
                          : "bg-white border border-[#E5E7EB] text-[#202124] hover:bg-[#F3F4F6]"
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                )}
              </div>

              {/* Next Page */}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[#202124] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F3F4F6] transition-all font-semibold cursor-pointer"
                title="Next Page"
              >
                {lang === "gu" ? "આગળનું" : "Next"}
              </button>

              {/* Last Page */}
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={safePage === totalPages}
                className="px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[#202124] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F3F4F6] transition-all font-semibold cursor-pointer"
                title="Last Page"
              >
                »
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
