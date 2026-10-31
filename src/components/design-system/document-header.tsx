"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { formatInr } from "./tokens";

export interface HeaderAction {
  id: string;
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  title?: string;
}

export interface HeaderMoreAction {
  id: string;
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
}

export interface DocumentHeaderProps {
  backHref: string;
  backLabel?: string;
  title: string;
  documentNumber?: string;
  status?: "PAID" | "PARTIALLY_PAID" | "UNPAID" | "DRAFT" | "CANCELLED" | "ISSUED";
  totalAmount?: number;
  balanceDue?: number;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    disabled?: boolean;
    loading?: boolean;
  };
  secondaryActions?: HeaderAction[];
  moreActions?: HeaderMoreAction[];
  lang?: "en" | "gu";
  extraChildren?: React.ReactNode;
}

export function DocumentHeader({
  backHref,
  backLabel,
  title,
  documentNumber,
  status,
  totalAmount,
  balanceDue,
  primaryAction,
  secondaryActions = [],
  moreActions = [],
  lang = "en",
  extraChildren,
}: DocumentHeaderProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    }
    if (isMoreOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMoreOpen]);

  const getStatusBadge = () => {
    if (!status) return null;
    switch (status) {
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{lang === "gu" ? "ચૂકવેલ" : "Paid"}</span>
          </span>
        );
      case "PARTIALLY_PAID":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>{lang === "gu" ? "અંશતઃ ચૂકવેલ" : "Partially Paid"}</span>
          </span>
        );
      case "UNPAID":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-rose-50 text-rose-800 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>{lang === "gu" ? "બાકી" : "Unpaid"}</span>
          </span>
        );
      case "DRAFT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-slate-100 text-slate-700 border border-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>{lang === "gu" ? "ડ્રાફ્ટ" : "Draft"}</span>
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-slate-100 text-slate-500 border border-slate-200 line-through">
            <span>{lang === "gu" ? "રદ કરેલ" : "Cancelled"}</span>
          </span>
        );
      case "ISSUED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-teal-50 text-[#174B43] border border-teal-200">
            <span className="w-1.5 h-1.5 rounded-full bg-[#26A58A]" />
            <span>{lang === "gu" ? "ઇશ્યૂ કરેલ" : "Issued"}</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="bg-white px-4 py-3 sm:px-6 sm:py-3.5 rounded-2xl border border-[#E2E8E5] shadow-xs space-y-3 print:hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Back Link, Title, Document #, Status, Financial Pill */}
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-[#174B43] hover:bg-[#F2FAF7] rounded-xl border border-[#E2E8E5] transition-colors shadow-2xs shrink-0"
            title={backLabel || "Back"}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>{backLabel || (lang === "gu" ? "પાછા જાઓ" : "Back")}</span>
          </Link>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-extrabold text-[#1A2E2B] text-base sm:text-lg tracking-tight truncate">
                {title}
              </h1>

              {documentNumber && (
                <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  {documentNumber}
                </span>
              )}

              {getStatusBadge()}
            </div>
          </div>

          {/* Quick Financial Summary Pill (when provided) */}
          {totalAmount !== undefined && (
            <div className="hidden md:flex items-center gap-2 bg-[#F6F8F7] px-3 py-1 rounded-xl border border-[#E2E8E5] text-xs shadow-2xs">
              <span className="text-slate-500 font-medium">{lang === "gu" ? "કુલ:" : "Total:"}</span>
              <span className="font-mono font-bold text-slate-900">{formatInr(totalAmount)}</span>
              {balanceDue !== undefined && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500 font-medium">{lang === "gu" ? "બાકી:" : "Due:"}</span>
                  <span className={`font-mono font-bold ${balanceDue > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                    {formatInr(balanceDue)}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions Toolbar */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {extraChildren}

          {/* Secondary Actions */}
          {secondaryActions.map((act) => (
            <button
              key={act.id}
              type="button"
              onClick={act.onClick}
              disabled={act.disabled}
              title={act.title || act.label}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#F2FAF7] hover:border-[#85D5C2] text-slate-700 hover:text-[#174B43] border border-[#E2E8E5] rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {act.icon}
              <span>{act.label}</span>
            </button>
          ))}

          {/* More Actions Dropdown */}
          {moreActions.length > 0 && (
            <div className="relative" ref={moreRef}>
              <button
                type="button"
                onClick={() => setIsMoreOpen(!isMoreOpen)}
                className="p-2 bg-white hover:bg-[#F2FAF7] hover:border-[#85D5C2] text-slate-600 hover:text-[#174B43] border border-[#E2E8E5] rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0"
                title="More Actions"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>

              {isMoreOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white border border-[#E2E8E5] rounded-xl shadow-lg py-1 z-50 animate-fadeIn">
                  {moreActions.map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => {
                        setIsMoreOpen(false);
                        act.onClick();
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2 hover:bg-[#F2FAF7] transition-colors cursor-pointer ${
                        act.danger ? "text-rose-600 hover:bg-rose-50" : "text-slate-700"
                      }`}
                    >
                      {act.icon}
                      <span>{act.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Primary Action Button */}
          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled || primaryAction.loading}
              className="px-4 py-2 bg-[#174B43] hover:bg-[#123B35] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {primaryAction.loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{lang === "gu" ? "સાચવી રહ્યું છે..." : "Saving..."}</span>
                </>
              ) : (
                <>
                  {primaryAction.icon || (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  <span>{primaryAction.label}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
