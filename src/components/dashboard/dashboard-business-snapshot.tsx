"use client";

import React from "react";
import Link from "next/link";

export interface SnapshotMetrics {
  totalParties?: number | null;
  partiesChange?: string | null;
  totalItems?: number | null;
  itemsChange?: string | null;
  totalInvoices?: number | null;
  invoicesChange?: string | null;
  pendingBills?: number | null;
  pendingBillsChange?: string | null;
}

export interface DashboardBusinessSnapshotProps {
  metrics?: SnapshotMetrics;
  lang?: "en" | "gu";
}

export function DashboardBusinessSnapshot({
  metrics,
  lang = "en",
}: DashboardBusinessSnapshotProps) {
  const data = {
    totalParties: metrics?.totalParties ?? null,
    partiesChange: metrics?.partiesChange ?? null,
    totalItems: metrics?.totalItems ?? null,
    itemsChange: metrics?.itemsChange ?? null,
    totalInvoices: metrics?.totalInvoices ?? null,
    invoicesChange: metrics?.invoicesChange ?? null,
    pendingBills: metrics?.pendingBills ?? null,
    pendingBillsChange: metrics?.pendingBillsChange ?? null,
  };

  const blocks = [
    {
      id: "parties",
      href: "/masters/parties",
      label: lang === "gu" ? "કુલ પાર્ટીઓ" : "Total Parties",
      value: data.totalParties == null ? "—" : data.totalParties.toLocaleString("en-IN"),
      change: data.partiesChange,
      isPositive: true,
      icon: (
        <svg className="w-4 h-4 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      id: "items",
      href: "/masters/items",
      label: lang === "gu" ? "કુલ વસ્તુઓ" : "Total Items",
      value: data.totalItems == null ? "—" : data.totalItems.toLocaleString("en-IN"),
      change: data.itemsChange,
      isPositive: true,
      icon: (
        <svg className="w-4 h-4 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      id: "invoices",
      href: "/sales/invoices",
      label: lang === "gu" ? "કુલ ઇનવોઇસ (FY)" : "Total Sales (FY)",
      value: data.totalInvoices == null ? "—" : data.totalInvoices.toLocaleString("en-IN"),
      change: data.invoicesChange,
      isPositive: true,
      icon: (
        <svg className="w-4 h-4 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: "pending",
      href: "/purchases?status=unpaid",
      label: lang === "gu" ? "બાકી બિલ્સ" : "Pending Bills",
      value: data.pendingBills == null ? "—" : data.pendingBills.toLocaleString("en-IN"),
      change: data.pendingBillsChange,
      isPositive: false,
      icon: (
        <svg className="w-4 h-4 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]/60 flex items-center justify-center shrink-0 shadow-2xs">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-[16px] font-semibold text-[#1E293B] tracking-tight leading-tight">
            {lang === "gu" ? "વેપારની સ્થિતિ" : "Business Snapshot"}
          </h2>
          <p className="typo-card-desc text-[#64748B] leading-tight mt-0.5">
            {lang === "gu" ? "મુખ્ય વ્યવસાય રેકોર્ડ." : "Key business records at a glance."}
          </p>
        </div>
      </div>

      {/* 2x2 Metric Blocks Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {blocks.map((block) => (
          <Link
            key={block.id}
            href={block.href}
            className="p-3 rounded-xl border border-[#E2E8F0] bg-white min-h-[92px] shadow-2xs hover:shadow-xs hover:border-[#2563EB]/30 hover:bg-[#F8FBFF] transition-all group cursor-pointer"
          >
            {/* Icon + Label */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]/60 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                {block.icon}
              </div>
              <span className="text-xs font-semibold text-[#64748B] leading-tight truncate">
                {block.label}
              </span>
            </div>

            {/* Value + Change Badge */}
            <div className="mt-2.5 flex items-baseline justify-between gap-1">
              <span className="text-[20px] font-semibold text-[#1E293B] tabular-nums tracking-tight">
                {block.value}
              </span>
              {block.change ? (
                <span
                  className={`text-xs font-semibold ${
                    block.isPositive ? "text-[#39866A]" : "text-[#D45B5B]"
                  }`}
                >
                  {block.change}
                </span>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
