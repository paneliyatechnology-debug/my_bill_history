"use client";

import React from "react";
import Link from "next/link";

export interface DashboardQuickActionsProps {
  lang?: "en" | "gu";
}

export function DashboardQuickActions({ lang = "en" }: DashboardQuickActionsProps) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col justify-between h-full">
      {/* Header: Lightning icon & Title */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]/60 flex items-center justify-center shrink-0 shadow-2xs">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h2 className="typo-section-heading text-[#1E293B]">
          {lang === "gu" ? "ઝડપી ક્રિયાઓ" : "Quick Actions"}
        </h2>
      </div>

      {/* 2x2 Grid of Actions matching Reference Image */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* 1. Create Invoice */}
        <Link
          href="/sales/invoices/new"
          className="min-h-[88px] p-3 rounded-xl bg-white hover:bg-[#F8FBFF] border border-[#E2E8F0] hover:border-[#2563EB] text-[#1E293B] flex flex-col items-center justify-center text-center gap-1.5 transition-all shadow-2xs hover:shadow-xs group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="typo-btn-secondary leading-tight text-[#1E293B]">
            {lang === "gu" ? "નવું ઇનવોઇસ" : "Create Invoice"}
          </span>
        </Link>

        {/* 2. Create Purchase */}
        <Link
          href="/purchases/new"
          className="min-h-[88px] p-3 rounded-xl bg-white hover:bg-[#F8FBFF] border border-[#E2E8F0] hover:border-[#2563EB] text-[#1E293B] flex flex-col items-center justify-center text-center gap-1.5 transition-all shadow-2xs hover:shadow-xs group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <span className="typo-btn-secondary leading-tight text-[#1E293B]">
            {lang === "gu" ? "ખરીદી બિલ" : "Create Purchase"}
          </span>
        </Link>

        {/* 3. Payment In */}
        <Link
          href="/sales/payment-in/new"
          className="min-h-[88px] p-3 rounded-xl bg-white hover:bg-[#F8FBFF] border border-[#E2E8F0] hover:border-[#2563EB] text-[#1E293B] flex flex-col items-center justify-center text-center gap-1.5 transition-all shadow-2xs hover:shadow-xs group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <span className="typo-btn-secondary leading-tight text-[#1E293B]">
            {lang === "gu" ? "પેમેન્ટ ઇન" : "Payment In"}
          </span>
        </Link>

        {/* 4. Quotation */}
        <Link
          href="/sales/quotations/new"
          className="min-h-[88px] p-3 rounded-xl bg-white hover:bg-[#F8FBFF] border border-[#E2E8F0] hover:border-[#2563EB] text-[#1E293B] flex flex-col items-center justify-center text-center gap-1.5 transition-all shadow-2xs hover:shadow-xs group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs font-mono text-[14px] font-semibold">
            66
          </div>
          <span className="typo-btn-secondary leading-tight text-[#1E293B]">
            {lang === "gu" ? "કોટેશન" : "Quotation"}
          </span>
        </Link>
      </div>
    </div>
  );
}
