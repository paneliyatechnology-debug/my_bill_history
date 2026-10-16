"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "../../context/auth-context";

export function QuickActionsBar() {
  const { lang } = useAuth();

  const actions = [
    {
      title: lang === "gu" ? "નવી વસ્તુ" : "Add Item",
      subtext: lang === "gu" ? "પ્રોડક્ટ માસ્ટર" : "Item Master",
      href: "/masters/items",
      iconBg: "bg-[#FFF3E8] text-[#F47721]",
      hoverBorder: "hover:border-[#F47721]",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      title: lang === "gu" ? "નવો ગ્રાહક" : "Add Customer",
      subtext: lang === "gu" ? "ખાતું ખોલો" : "Parties Ledger",
      href: "/masters/parties",
      iconBg: "bg-[#EFF6FF] text-[#2563EB]",
      hoverBorder: "hover:border-[#2563EB]",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
    },
    {
      title: lang === "gu" ? "ખરીદી બિલ" : "Purchase Bill",
      subtext: lang === "gu" ? "ઇનવોઇસ સ્કેનર" : "Bill Scanner",
      href: "/purchases",
      iconBg: "bg-[#F0FDF4] text-[#16A34A]",
      hoverBorder: "hover:border-[#16A34A]",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      title: lang === "gu" ? "દૈનિક ખર્ચ" : "Record Expense",
      subtext: lang === "gu" ? "રોકડ / બેંક જાવક" : "Payment Out",
      href: "/accounting/vouchers/new",
      iconBg: "bg-[#FDF2F8] text-[#DB2777]",
      hoverBorder: "hover:border-[#DB2777]",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      title: lang === "gu" ? "વેચાણ બિલ બનાવો" : "Create Sale Invoice",
      subtext: lang === "gu" ? "ઝડપી બિલિંગ" : "Quick Billing",
      href: "/sales/invoices/new",
      iconBg: "bg-[#FAF5FF] text-[#9333EA]",
      hoverBorder: "hover:border-[#9333EA]",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      title: lang === "gu" ? "સ્ટોક જુઓ" : "View Stock",
      subtext: lang === "gu" ? "ગોડાઉન સ્ટોક" : "Stock Overview",
      href: "/inventory/stock",
      iconBg: "bg-[#FFFBEB] text-[#D97706]",
      hoverBorder: "hover:border-[#D97706]",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
  ];

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 sm:p-5 shadow-xs space-y-3.5 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-bold text-[#111827]">
            {lang === "gu" ? "ઝડપી ક્રિયાઓ (Quick Actions)" : "Quick Actions"}
          </h2>
          <p className="text-[11px] sm:text-xs text-[#6B7280]">
            {lang === "gu" ? "એક ક્લિકમાં દૈનિક કામકાજ શરૂ કરો" : "Perform daily tasks with one click"}
          </p>
        </div>
      </div>

      {/* 6 Grid Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {actions.map((act, idx) => (
          <Link
            key={idx}
            href={act.href}
            className={`group p-2.5 sm:p-3.5 bg-white hover:bg-slate-50/70 border border-[#E5E7EB] ${act.hoverBorder} rounded-xl shadow-2xs hover:shadow-sm transition-all duration-150 flex items-center gap-2.5 sm:gap-3 min-w-0`}
          >
            <div className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${act.iconBg} group-hover:scale-105 transition-transform`}>
              {act.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-[#111827] truncate group-hover:text-[#F47721] transition-colors">
                {act.title}
              </div>
              <div className="text-[10px] text-[#6B7280] truncate font-medium">
                {act.subtext}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
