"use client";

import React, { useState, useMemo } from "react";

export interface ColumnDef<T> {
  id?: string;
  header: string | React.ReactNode;
  accessorKey?: keyof T | string;
  accessorFn?: (row: T) => any;
  cell?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (row: T) => string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: (keyof T | string)[];
  customSearchFn?: (row: T, query: string) => boolean;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  emptyMessage?: string;
  emptyMessageGujarati?: string;
  lang?: "en" | "gu";
  filtersSlot?: React.ReactNode;
  actionsSlot?: React.ReactNode;
  isLoading?: boolean;
  defaultSortKey?: string;
  defaultSortOrder?: "asc" | "desc";
  onRowClick?: (row: T) => void;
  exportable?: boolean;
  exportFileName?: string;
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
  pageSizeOptions = [10, 25, 50, 100],
  emptyMessage = "No records found.",
  emptyMessageGujarati = "કોઈ રેકોર્ડ મળ્યા નથી.",
  lang = "en",
  filtersSlot,
  actionsSlot,
  isLoading = false,
  defaultSortKey,
  defaultSortOrder = "asc",
  onRowClick,
  exportable = false,
  exportFileName = "table_export",
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey || null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(defaultSortOrder);

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
    link.setAttribute("download", `${exportFileName}_${new Date().toISOString().slice(0, 10)}.csv`);
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

  return (
    <div className="w-full space-y-3">
      {/* ================= CONTROLS TOOLBAR ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E5E7EB] shadow-xs">
        {/* Left: Page Size Selector & Search */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full md:w-auto">
          {/* Page size dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-[#667085]">
            <span>{lang === "gu" ? "દર્શાવો" : "Show"}</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-[#F8F9FB] border border-[#E5E7EB] text-xs font-semibold rounded-xl px-2.5 py-1.5 text-[#202124] focus:outline-none focus:bg-white focus:ring-1 focus:ring-purple-500 transition-all cursor-pointer"
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
            <div className="relative flex-1 sm:w-64 md:w-72">
              <span className="absolute left-3 top-2 text-xs text-[#98A2B3]">🔍</span>
              <input
                type="text"
                placeholder={
                  searchPlaceholder ||
                  (lang === "gu" ? "શોધો (Search)..." : "Search in table...")
                }
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-xs text-[#202124] placeholder-[#98A2B3] focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearchChange("")}
                  className="absolute right-2.5 top-2 text-xs text-[#98A2B3] hover:text-[#202124]"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Custom Filters Slot & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {filtersSlot}

          {exportable && (
            <button
              onClick={handleExportCsv}
              disabled={sortedData.length === 0}
              className="py-1.5 px-3 bg-white hover:bg-[#F8F9FB] disabled:opacity-50 text-[#202124] border border-[#E5E7EB] rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              title="Export as CSV"
            >
              <span>📥</span>
              <span className="hidden sm:inline">{lang === "gu" ? "CSV એક્સપોર્ટ" : "CSV"}</span>
            </button>
          )}

          {actionsSlot}
        </div>
      </div>

      {/* ================= TABLE CONTAINER ================= */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto min-h-[160px] relative">
          {isLoading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-10">
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-md border border-[#E5E7EB]">
                <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-bold text-[#202124]">
                  {lang === "gu" ? "ડેટા લોડ થઈ રહ્યો છે..." : "Loading records..."}
                </span>
              </div>
            </div>
          )}

          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFBFD] border-b border-[#E5E7EB] text-[#667085] uppercase font-mono tracking-wider select-none">
              <tr>
                {columns.map((col, idx) => {
                  const colKey = col.id || (col.accessorKey ? String(col.accessorKey) : null);
                  const isSorted = colKey && sortKey === colKey;

                  return (
                    <th
                      key={colKey || idx}
                      onClick={() => handleSort(col)}
                      className={`py-3.5 px-4 font-semibold ${col.headerClassName || ""} ${
                        col.sortable ? "cursor-pointer hover:bg-[#F3F4F6] transition-colors" : ""
                      } ${isSorted ? "bg-purple-50/70 text-purple-700" : ""}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{col.header}</span>
                        {col.sortable && (
                          <span className="text-[10px] text-[#98A2B3]">
                            {isSorted ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E5E7EB] text-[#202124]">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-[#98A2B3]">
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
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, rowIdx) => (
                  <tr
                    key={keyExtractor(row)}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`hover:bg-[#FAFBFD] transition-colors ${
                      onRowClick ? "cursor-pointer" : ""
                    }`}
                  >
                    {columns.map((col, colIdx) => (
                      <td
                        key={col.id || (col.accessorKey ? String(col.accessorKey) : colIdx)}
                        className={`py-3.5 px-4 ${col.className || ""}`}
                      >
                        {col.cell
                          ? col.cell(row, rowIdx)
                          : String(getCellValue(row, col) ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ================= PAGINATION FOOTER ================= */}
        <div className="p-3.5 sm:p-4 bg-[#FAFBFD] border-t border-[#E5E7EB] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#667085]">
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
                className="px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[#202124] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F3F4F6] transition-all font-semibold"
                title="First Page"
              >
                «
              </button>

              {/* Prev Page */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[#202124] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F3F4F6] transition-all font-semibold"
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
                      className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all ${
                        safePage === pageNum
                          ? "bg-purple-600 text-white shadow-sm"
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
                className="px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[#202124] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F3F4F6] transition-all font-semibold"
                title="Next Page"
              >
                {lang === "gu" ? "આગળનું" : "Next"}
              </button>

              {/* Last Page */}
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={safePage === totalPages}
                className="px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[#202124] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F3F4F6] transition-all font-semibold"
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
