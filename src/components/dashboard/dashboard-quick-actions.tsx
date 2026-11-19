"use client";

import React from "react";
import Link from "next/link";
import { FilePlus, ShoppingCart, CreditCard, FileText } from "lucide-react";

export interface DashboardQuickActionsProps {
  lang?: "en" | "gu";
}

export function DashboardQuickActions({ lang = "en" }: DashboardQuickActionsProps) {
  const actions = [
    {
      href: "/sales/invoices/new",
      icon: <FilePlus className="w-4 h-4" />,
      label: lang === "gu" ? "નવું ઇનવોઇસ" : "Create Invoice",
    },
    {
      href: "/purchases/new",
      icon: <ShoppingCart className="w-4 h-4" />,
      label: lang === "gu" ? "ખરીદી બિલ" : "Create Purchase",
    },
    {
      href: "/sales/payment-in/new",
      icon: <CreditCard className="w-4 h-4" />,
      label: lang === "gu" ? "પેમેન્ટ ઇન" : "Payment In",
    },
    {
      href: "/sales/quotations/new",
      icon: <FileText className="w-4 h-4" />,
      label: lang === "gu" ? "કોટેશન" : "Quotation",
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]/60 flex items-center justify-center shrink-0 shadow-2xs">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h2 className="typo-section-heading text-[#1E293B]">
            {lang === "gu" ? "ઝડપી ક્રિયાઓ" : "Quick Actions"}
          </h2>
          <p className="typo-card-desc text-[#64748B] leading-tight">
            {lang === "gu" ? "સામાન્ય કાર્યો ઝડપથી કરો." : "Common tasks to manage your business."}
          </p>
        </div>
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-2 gap-2.5 mt-3">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="min-h-[88px] p-3 rounded-xl bg-white hover:bg-[#F8FBFF] border border-[#E2E8F0] hover:border-[#2563EB] text-[#1E293B] flex flex-col items-center justify-center text-center gap-1.5 transition-all shadow-2xs hover:shadow-xs group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
              {action.icon}
            </div>
            <span className="typo-btn-secondary leading-tight text-[#1E293B]">
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
