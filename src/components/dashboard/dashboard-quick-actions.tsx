"use client";

import React from "react";
import Link from "next/link";

export interface DashboardQuickActionsProps {
  lang?: "en" | "gu";
}

export function DashboardQuickActions({ lang = "en" }: DashboardQuickActionsProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between h-full">
      {/* Header: Lightning icon & Title */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h2 className="text-[15px] font-semibold text-[#182230] tracking-tight">
          {lang === "gu" ? "ઝડપી ક્રિયાઓ" : "Quick Actions"}
        </h2>
      </div>

      {/* 2x2 Grid of Actions matching Reference Image */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* 1. Create Invoice - Primary Solid Blue */}
        <Link
          href="/sales/invoices/new"
          className="min-h-[88px] p-3 rounded-xl bg-[#1677E8] hover:bg-[#1268D3] text-white flex flex-col items-center justify-center text-center gap-1.5 transition-colors"
        >
          <div className="w-7 h-7 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="text-[12px] font-medium leading-tight">
            {lang === "gu" ? "નવું ઇનવોઇસ" : "Create Invoice"}
          </span>
        </Link>

        {/* 2. Create Purchase - White card */}
        <Link
          href="/purchases/new"
          className="min-h-[88px] p-3 rounded-xl bg-white hover:bg-[#F8FBFF] border border-[#E2E8F0] text-[#182230] flex flex-col items-center justify-center text-center gap-1.5 hover:border-[#1677E8] transition-colors"
        >
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <span className="text-[12px] font-medium leading-tight">
            {lang === "gu" ? "ખરીદી બિલ" : "Create Purchase"}
          </span>
        </Link>

        {/* 3. Payment In - White card */}
        <Link
          href="/sales/payment-in/new"
          className="min-h-[88px] p-3 rounded-xl bg-white hover:bg-[#F8FBFF] border border-[#E2E8F0] text-[#182230] flex flex-col items-center justify-center text-center gap-1.5 hover:border-[#1677E8] transition-colors"
        >
          <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <span className="text-[12px] font-medium leading-tight">
            {lang === "gu" ? "પેમેન્ટ ઇન" : "Payment In"}
          </span>
        </Link>

        {/* 4. Quotation - White card */}
        <Link
          href="/sales/quotations/new"
          className="min-h-[88px] p-3 rounded-xl bg-white hover:bg-[#F8FBFF] border border-[#E2E8F0] text-[#182230] flex flex-col items-center justify-center text-center gap-1.5 hover:border-[#1677E8] transition-colors"
        >
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
          </div>
          <span className="text-[12px] font-medium leading-tight">
            {lang === "gu" ? "કોટેશન" : "Quotation"}
          </span>
        </Link>
      </div>
    </div>
  );
}
