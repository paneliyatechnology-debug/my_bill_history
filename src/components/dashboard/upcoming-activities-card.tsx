"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "../../context/auth-context";

interface UpcomingActivitiesCardProps {
  lowStockCount?: number;
  overdueInvoicesCount?: number;
  overdueAmount?: number;
  pendingOrdersCount?: number;
  isLoading?: boolean;
}

export function UpcomingActivitiesCard({
  lowStockCount = 0,
  overdueInvoicesCount = 0,
  overdueAmount = 0,
  pendingOrdersCount = 0,
  isLoading = false,
}: UpcomingActivitiesCardProps) {
  const { lang } = useAuth();

  const formatInr = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 sm:p-5 shadow-xs flex flex-col justify-between space-y-3.5 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#111827]">
              {lang === "gu" ? "આગામી પ્રવૃત્તિઓ" : "Upcoming Activities"}
            </h2>
            <p className="text-[11px] text-[#6B7280]">
              {lang === "gu" ? "મહત્વપૂર્ણ રીમાઇન્ડર અને ચેતવણીઓ" : "Important reminders and alerts"}
            </p>
          </div>
        </div>

        <Link
          href="/reports?tab=outstanding"
          className="text-xs font-semibold text-[#F47721] hover:text-[#D95F12] flex items-center gap-1 hover:underline shrink-0"
        >
          <span>{lang === "gu" ? "બધા જુઓ" : "View All"}</span>
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>

      {/* Activity List */}
      {isLoading ? (
        <div className="space-y-2 py-2">
          <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Item 1: Low Stock Alert */}
          <Link
            href="/inventory/stock?filter=low"
            className="p-2 sm:p-2.5 bg-slate-50/70 hover:bg-slate-50 border border-[#F1F5F9] rounded-xl flex items-center justify-between gap-2.5 sm:gap-3 transition-colors group"
          >
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-lg bg-[#FEF2F2] text-[#EF4444] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-[#111827] truncate group-hover:text-[#F47721] transition-colors">
                  {lang === "gu" ? "ઓછો સ્ટોક ચેતવણી" : "Low Stock Alert"}
                </div>
                <div className="text-[11px] text-[#6B7280] truncate">
                  {lowStockCount > 0
                    ? (lang === "gu"
                        ? `${lowStockCount} વસ્તુઓ લઘુત્તમ સ્તર નીચે છે`
                        : `${lowStockCount} items are below reorder level`)
                    : (lang === "gu"
                        ? "બધો સ્ટોક પૂરતા પ્રમાણમાં છે"
                        : "All items are in healthy stock")}
                </div>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg font-bold text-[11px] sm:text-xs shrink-0 font-mono ${
                lowStockCount > 0
                  ? "bg-[#FEF2F2] text-[#DC2626]"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {lowStockCount} Items
            </span>
          </Link>

          {/* Item 2: Payment Due */}
          <Link
            href="/reports?tab=outstanding&partyType=CUSTOMER"
            className="p-2 sm:p-2.5 bg-slate-50/70 hover:bg-slate-50 border border-[#F1F5F9] rounded-xl flex items-center justify-between gap-2.5 sm:gap-3 transition-colors group"
          >
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-lg bg-[#FFFBEB] text-[#D97706] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-[#111827] truncate group-hover:text-[#F47721] transition-colors">
                  {lang === "gu" ? "ચુકવણી બાકી (Due)" : "Payment Due"}
                </div>
                <div className="text-[11px] text-[#6B7280] truncate">
                  {overdueInvoicesCount > 0
                    ? (lang === "gu"
                        ? `${overdueInvoicesCount} ગ્રાહક બિલ મુદત વીતી ગયા છે`
                        : `${overdueInvoicesCount} customer invoices are overdue`)
                    : (lang === "gu"
                        ? "કોઈ મુદત વીતેલા બિલ નથી"
                        : "No overdue customer invoices")}
                </div>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg font-bold text-[11px] sm:text-xs shrink-0 font-mono ${
                overdueAmount > 0
                  ? "bg-[#FEF2F2] text-[#DC2626]"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {formatInr(overdueAmount)}
            </span>
          </Link>

          {/* Item 3: Purchase Order Pending */}
          <Link
            href="/purchases"
            className="p-2 sm:p-2.5 bg-slate-50/70 hover:bg-slate-50 border border-[#F1F5F9] rounded-xl flex items-center justify-between gap-2.5 sm:gap-3 transition-colors group"
          >
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-[#111827] truncate group-hover:text-[#F47721] transition-colors">
                  {lang === "gu" ? "ખરીદી ઓર્ડર બાકી" : "Purchase Order Pending"}
                </div>
                <div className="text-[11px] text-[#6B7280] truncate">
                  {pendingOrdersCount > 0
                    ? (lang === "gu"
                        ? `${pendingOrdersCount} ઓર્ડર માલ આવવાનો બાકી છે`
                        : `${pendingOrdersCount} orders pending receipt`)
                    : (lang === "gu"
                        ? "તમામ ઓર્ડર પૂર્ણ થયેલ છે"
                        : "All orders completed")}
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-[#EFF6FF] text-[#2563EB] font-bold text-[11px] sm:text-xs shrink-0 font-mono">
              {pendingOrdersCount} Orders
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}
