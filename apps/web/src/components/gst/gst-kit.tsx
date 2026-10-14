"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../context/auth-context";

const LINKS = [
  { href: "/gst", label: "GST Dashboard" },
  { href: "/gst/gstr-1", label: "GSTR-1" },
  { href: "/gst/gstr-3b", label: "GSTR-3B" },
  { href: "/gst/gstr-2b", label: "GSTR-2B Reconciliation" },
  { href: "/gst/purchases", label: "Purchase Register" },
  { href: "/gst/einvoice", label: "E-Invoice / IRN" },
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
  if (!context) throw new Error("GST period is available inside the GST workspace.");
  return context;
}

function useGstPeriodState() {
  const [month, setMonthState] = useState(4);
  const [year, setYearState] = useState(2026);
  useEffect(() => {
    const raw = sessionStorage.getItem("gst-period");
    if (!raw) return;
    const parsed = JSON.parse(raw) as { month?: number; year?: number };
    if (parsed.month) setMonthState(parsed.month);
    if (parsed.year) setYearState(parsed.year);
  }, []);
  const save = (nextMonth: number, nextYear: number) => {
    setMonthState(nextMonth);
    setYearState(nextYear);
    sessionStorage.setItem("gst-period", JSON.stringify({ month: nextMonth, year: nextYear }));
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
  const { currentCompany, currentFY } = useAuth();
  const period = useGstPeriodState();
  return (
    <GstPeriodContext.Provider value={period}>
    <div className="p-4 sm:p-6 space-y-4">
      <div className="bg-white p-5 rounded-2xl border border-border shadow-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-6 bg-primary rounded-full inline-block"></span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          </div>
          <p className="text-xs text-muted mt-1 ml-4.5">
            {currentCompany?.tradeName || currentCompany?.legalName || "No company selected"} · GSTIN:{" "}
            <span className="font-mono font-bold text-primary">{currentCompany?.gstin || "Not configured"}</span> · {currentFY?.name || "Financial Year"}
          </p>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold border transition-all ${
                active ? "bg-primary text-white border-primary shadow-card font-bold" : "bg-white text-slate-700 border-border hover:border-primary/40 hover:bg-saffron-very-light"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
      <div className="bg-white border border-border rounded-2xl p-4 shadow-subtle flex flex-wrap gap-4 items-end">
        <label className="text-xs font-bold text-slate-700">
          Month (મહિનો)
          <select
            className="mt-1 block border border-border rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
            value={period.month}
            onChange={(event) => period.setMonth(Number(event.target.value))}
          >
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                Month {index + 1} ({new Date(2026, index, 1).toLocaleString('en', { month: 'short' })})
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-slate-700">
          Year (વર્ષ)
          <input
            className="mt-1 block w-24 border border-border rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            type="number"
            value={period.year}
            onChange={(event) => period.setYear(Number(event.target.value))}
          />
        </label>
        <p className="text-xs text-muted flex items-center gap-1.5 pb-1">
          <span>📅 Period:</span>
          <span className="font-mono font-bold text-slate-800">{period.fromDate}</span>
          <span>to</span>
          <span className="font-mono font-bold text-slate-800">{period.toDate}</span>
          <span className="text-[11px] bg-saffron-light text-primary font-bold px-2 py-0.5 rounded-md ml-1">
            GSTR Period: {period.returnPeriod}
          </span>
        </p>
      </div>
      {notice ? <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 shadow-subtle">{notice}</p> : null}
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
  if (loading) return <p className="text-sm text-slate-500">Loading company data…</p>;
  if (error) {
    const denied = /forbidden|403/i.test(error);
    return (
      <div className="bg-white border border-red-200 rounded-xl p-4 space-y-2">
        <p className="text-sm text-red-700">{denied ? "You do not have access to this GST screen for the selected company." : error}</p>
        <button className="text-sm underline" onClick={onRetry} type="button">
          Retry
        </button>
      </div>
    );
  }
  if (empty) return <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-xl p-4">{empty}</p>;
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
          className="w-full sm:w-72 border border-slate-300 rounded px-2 py-1 text-sm"
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
