"use client";

import React from "react";
import Link from "next/link";

export interface DashboardQuickActionsProps {
  lang?: "en" | "gu";
}

export function DashboardQuickActions({ lang = "en" }: DashboardQuickActionsProps) {
  const actions = [
    {
      id: "sales-bill",
      title: lang === "gu" ? "વેચાણ બિલ" : "Sales Bill",
      subtitle: lang === "gu" ? "ટેક્સ ઇનવોઇસ →" : "Tax Invoice →",
      href: "/sales/invoices/new",
      bg: "bg-[#E7FAF3] hover:bg-[#D7F5EB]",
      border: "border-[#B9EBDD]",
      iconBg: "bg-[#0DAA8A]",
      textColor: "text-[#08765C]",
      subColor: "text-[#0CA678]",
      icon: (
        <span className="text-sm font-black text-white">+</span>
      ),
    },
    {
      id: "purchase-bill",
      title: lang === "gu" ? "ખરીદી બિલ" : "Purchase Bill",
      subtitle: lang === "gu" ? "સ્ટોક ઇનવર્ડ →" : "Inward Stock →",
      href: "/purchases/new",
      bg: "bg-[#EEF4FF] hover:bg-[#E0ECFF]",
      border: "border-[#D9E6FF]",
      iconBg: "bg-[#43A7F5]",
      textColor: "text-[#172C55]",
      subColor: "text-[#4388F5]",
      icon: (
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      id: "payment-in",
      title: lang === "gu" ? "પેમેન્ટ ઇન" : "Payment In",
      subtitle: lang === "gu" ? "રસીદ વાઉચર →" : "Receipt Voucher →",
      href: "/sales/payment-in/new",
      bg: "bg-[#FFF3E7] hover:bg-[#FFE8D1]",
      border: "border-[#FFE0BF]",
      iconBg: "bg-[#F18B21]",
      textColor: "text-[#C75B0A]",
      subColor: "text-[#F18B21]",
      icon: (
        <span className="text-xs font-black text-white">₹</span>
      ),
    },
    {
      id: "quotation",
      title: lang === "gu" ? "કોટેશન" : "Quotation",
      subtitle: lang === "gu" ? "અંદાજ અને પ્રોફોર્મા →" : "Estimate & Proforma →",
      href: "/sales/quotations/new",
      bg: "bg-[#F5EEFD] hover:bg-[#EBDDFA]",
      border: "border-[#E6D5F7]",
      iconBg: "bg-[#A477F5]",
      textColor: "text-[#58258E]",
      subColor: "text-[#A477F5]",
      icon: (
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: "invoice",
      title: lang === "gu" ? "ઇનવોઇસ" : "Invoice",
      subtitle: lang === "gu" ? "ઇનવોઇસ બનાવો →" : "Create Invoice →",
      href: "/sales/invoices/new",
      bg: "bg-[#E8F8F4] hover:bg-[#D5F2EB]",
      border: "border-[#BFECE0]",
      iconBg: "bg-[#15B8AD]",
      textColor: "text-[#064E4A]",
      subColor: "text-[#15B8AD]",
      icon: (
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m0 0l-6-6m6 6H3" />
        </svg>
      ),
    },
    {
      id: "reports",
      title: lang === "gu" ? "અહેવાલો" : "View Reports",
      subtitle: lang === "gu" ? "વેપાર વિશ્લેષણ →" : "Business Reports →",
      href: "/reports",
      bg: "bg-[#F6FAE9] hover:bg-[#EEF5D8]",
      border: "border-[#E3EEBF]",
      iconBg: "bg-[#8DBE36]",
      textColor: "text-[#496515]",
      subColor: "text-[#8DBE36]",
      icon: (
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="bg-white border border-[#E1EAF0] rounded-2xl shadow-[0_4px_18px_rgba(16,35,63,0.045)] p-4 sm:p-5 space-y-3.5">
      {/* Header with Lightning Bolt Icon */}
      <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#10233F]">
        <svg className="w-4 h-4 text-[#4388F5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span>{lang === "gu" ? "ઝડપી ક્રિયાઓ" : "Quick Actions"}</span>
      </div>

      {/* 2-Column, 3-Row Quick Action Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {actions.map((act) => (
          <Link
            key={act.id}
            href={act.href}
            className={`p-3 rounded-xl border ${act.bg} ${act.border} text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs active:translate-y-0 group block`}
          >
            <div
              className={`w-7 h-7 rounded-lg ${act.iconBg} flex items-center justify-center font-bold text-xs mb-2 shadow-2xs group-hover:scale-105 transition-transform`}
            >
              {act.icon}
            </div>
            <div className={`text-xs font-bold ${act.textColor} truncate`}>
              {act.title}
            </div>
            <div className={`text-[10px] font-semibold ${act.subColor} mt-0.5 truncate`}>
              {act.subtitle}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

