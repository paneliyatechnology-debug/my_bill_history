"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../context/auth-context";
import { Calendar, AlertCircle, RefreshCw } from "lucide-react";
import { CustomSelect } from "@/components/ui/dropdown-system";
export { DataTablePagination } from "@/components/ui/data-table-pagination";

const LINKS = [
  { href: "/gst", label: "GST Dashboard" },
  { href: "/gst/gstr-1", label: "GSTR-1" },
  { href: "/gst/gstr-3b", label: "GSTR-3B" },
  { href: "/gst/gstr-2b", label: "GSTR-2B Reconciliation" },
  { href: "/gst/purchases", label: "Purchase Register" },
  { href: "/gst/sales", label: "Sales Register" },
  { href: "/gst/einvoice", label: "E-Invoice" },
  { href: "/gst/eway", label: "E-Way Bill" },
  { href: "/gst/reports", label: "GST Reports" },
  { href: "/gst/settings", label: "GST Settings" },
];

const WRITERS = new Set(["SUPER_ADMIN", "ORG_ADMIN", "COMPANY_ADMIN", "ACCOUNTANT"]);

const GstPeriodContext = React.createContext<ReturnType<typeof buildPeriod> | null>(null);

function buildPeriod(month: number, year: number, save: (month: number, year: number) => void) {
  const fromDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const toDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return {
    month,
    year,
    setMonth: (value: number) => save(value, year),
    setYear: (value: number) => save(month, value),
    fromDate,
    toDate,
    returnPeriod: `${String(month).padStart(2, "0")}${year}`,
  };
}

export function useGstPeriod() {
  const context = React.useContext(GstPeriodContext);
  if (context) return context;
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const fromDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const toDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return {
    month,
    year,
    setMonth: () => {},
    setYear: () => {},
    fromDate,
    toDate,
    returnPeriod: `${String(month).padStart(2, "0")}${year}`,
  };
}

function useGstPeriodState() {
  const [month, setMonthState] = useState(() => {
    if (typeof window !== "undefined") {
      const raw = sessionStorage.getItem("gst-period");
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.month) return parsed.month;
        } catch {}
      }
    }
    return new Date().getMonth() + 1;
  });

  const [year, setYearState] = useState(() => {
    if (typeof window !== "undefined") {
      const raw = sessionStorage.getItem("gst-period");
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.year) return parsed.year;
        } catch {}
      }
    }
    return new Date().getFullYear();
  });

  const save = (nextMonth: number, nextYear: number) => {
    setMonthState(nextMonth);
    setYearState(nextYear);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("gst-period", JSON.stringify({ month: nextMonth, year: nextYear }));
    }
  };
  return buildPeriod(month, year, save);
}

export function useCanWriteGst() {
  const { user } = useAuth();
  if (!user?.role) return true;
  return WRITERS.has(user.role);
}

export function GstFrame({
  title,
  notice,
  children,
}: {
  title: string;
  notice?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { currentCompany, currentFY, lang } = useAuth();
  const period = useGstPeriodState();
  return (
    <GstPeriodContext.Provider value={period}>
    <div className="space-y-4">
      {/* ── UNIFIED GST HEADER (Company, GSTIN, FY & Period Selector) ── */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-600 font-medium">
            <span className="font-semibold text-slate-800">{currentCompany?.tradeName || currentCompany?.legalName || "My Business"}</span>
            <span>·</span>
            <span>
              GSTIN:{" "}
              {currentCompany?.gstin ? (
                <span className="font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded text-xs">
                  {currentCompany.gstin}
                </span>
              ) : (
                <Link
                  href="/gst/settings"
                  className="font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded text-xs hover:bg-amber-100 transition-colors inline-flex items-center gap-1"
                >
                  <span>Not configured</span>
                  <span className="text-[10px]">Configure →</span>
                </Link>
              )}
            </span>
            <span>·</span>
            <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-md border border-slate-200">
              {currentFY?.name || `FY ${period.year}-${(period.year + 1) % 100}`}
            </span>
            {(currentCompany as any)?.gstType && (
              <span className="bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-md border border-blue-200 text-[11px]">
                {(currentCompany as any).gstType}
              </span>
            )}
            {(currentCompany as any)?.eInvoiceApplicable && (
              <span className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                E-Invoice
              </span>
            )}
          </div>
        </div>

        {/* Centralized Period Controls */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          <div className="w-36">
            <CustomSelect
              size="sm"
              value={String(period.month)}
              onChange={(val: any) => period.setMonth(Number(val))}
              options={Array.from({ length: 12 }, (_, index) => ({
                value: String(index + 1),
                label: new Date(2026, index, 1).toLocaleString("en", { month: "short" }),
              }))}
              triggerClassName="rounded-xl border-slate-300 bg-white text-slate-800 h-9 font-medium"
            />
          </div>

          <input
            className="w-20 border border-slate-300 rounded-xl px-2.5 py-1 text-xs tabular-nums font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] transition-all h-9"
            type="number"
            value={period.year}
            onChange={(event) => period.setYear(Number(event.target.value))}
          />

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-800">
              {new Date(period.year, period.month - 1, 1).toLocaleString("en", { month: "short" })} {period.year}
            </span>
            <span className="text-slate-400">({period.fromDate} to {period.toDate})</span>
            <span className="font-mono font-bold text-[#1677E8] bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded text-[11px] ml-1">
              Period {period.returnPeriod}
            </span>
          </div>
        </div>
      </div>

      {/* ── ONE CENTRALIZED GST NAVIGATION BAR (10 Tabs Only) ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200/80">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold border transition-all ${
                active
                  ? "bg-[#1677E8] text-white border-[#1677E8] shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      {notice ? (
        <div className="text-xs text-slate-600 bg-blue-50/50 border border-blue-200/60 rounded-xl p-3 flex items-center gap-2">
          <span className="font-bold text-[#1677E8] shrink-0">Note:</span>
          <span>{notice}</span>
        </div>
      ) : null}

      {children}
    </div>
    </GstPeriodContext.Provider>
  );
}

export function Panel({
  loading,
  error,
  onRetry,
  empty,
  children,
}: {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  empty?: string | null;
  children: React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs space-y-3">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-[#1677E8]" />
        <p className="text-xs font-semibold text-slate-600">Loading statutory data…</p>
      </div>
    );
  }
  if (error) {
    const denied = /forbidden|403/i.test(error);
    return (
      <div className="bg-white border border-rose-200 rounded-2xl p-6 space-y-3 shadow-xs">
        <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{denied ? "Access Denied" : "Error Loading GST Data"}</span>
        </div>
        <p className="text-xs text-slate-600">
          {denied ? "You do not have required permissions to view this GST compliance screen." : error}
        </p>
        <button
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold hover:bg-rose-100 transition-colors"
          onClick={onRetry}
          type="button"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Request</span>
        </button>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center text-xs text-slate-600 shadow-xs">
        {empty}
      </div>
    );
  }
  return <>{children}</>;
}

export function DataTable({
  columns,
  rows,
  onRow,
}: {
  columns: string[];
  rows: Array<Array<React.ReactNode>>;
  onRow?: (index: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows
      .map((row, index) => ({ row, index }))
      .filter((entry) => !needle || entry.row.join(" ").toLowerCase().includes(needle));
  }, [query, rows]);
  const pageRows = filtered.slice(page * 20, page * 20 + 20);
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="p-3 border-b border-slate-100">
        <input
          className="w-full sm:w-72 border border-slate-300 rounded px-2 py-1 text-[13px] h-10"
          placeholder="Search this table"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(0);
          }}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-3 py-2 font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((entry) => (
              <tr
                key={entry.index}
                className={`border-t border-slate-100 ${onRow ? "cursor-pointer hover:bg-slate-50" : ""}`}
                onClick={() => onRow?.(entry.index)}
              >
                {entry.row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-3 py-2 align-top text-slate-800">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between p-3 text-xs text-slate-500">
        <span>
          {filtered.length} row{filtered.length === 1 ? "" : "s"}
        </span>
        <span className="space-x-2">
          <button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>
            Previous
          </button>
          <button type="button" disabled={(page + 1) * 20 >= filtered.length} onClick={() => setPage((value) => value + 1)}>
            Next
          </button>
        </span>
      </div>
    </div>
  );
}

export function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
