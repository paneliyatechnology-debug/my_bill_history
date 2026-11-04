"use client";

import React from "react";

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
      label: lang === "gu" ? "કુલ પાર્ટીઓ" : "Total Parties",
      value: data.totalParties == null ? "—" : data.totalParties.toLocaleString("en-IN"),
      change: data.partiesChange,
      isPositive: true,
      icon: (
        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      id: "items",
      label: lang === "gu" ? "કુલ વસ્તુઓ" : "Total Items",
      value: data.totalItems == null ? "—" : data.totalItems.toLocaleString("en-IN"),
      change: data.itemsChange,
      isPositive: true,
      icon: (
        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      id: "invoices",
      label: lang === "gu" ? "કુલ ઇનવોઇસ" : "Total Invoices",
      value: data.totalInvoices == null ? "—" : data.totalInvoices.toLocaleString("en-IN"),
      change: data.invoicesChange,
      isPositive: true,
      icon: (
        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: "pending",
      label: lang === "gu" ? "બાકી બિલ્સ" : "Pending Bills",
      value: data.pendingBills == null ? "—" : data.pendingBills.toLocaleString("en-IN"),
      change: data.pendingBillsChange,
      isPositive: false,
      icon: (
        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between h-full">
      {/* Header: Bar Chart Icon & Title */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h2 className="text-[15px] font-semibold text-[#182230] tracking-tight">
          {lang === "gu" ? "વેપારની સ્થિતિ" : "Business Snapshot"}
        </h2>
      </div>

      {/* 2x2 Metric Blocks Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {blocks.map((block) => (
          <div
            key={block.id}
            className="p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FBFF] min-h-[92px]"
          >
            {/* Icon + Label */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                {block.icon}
              </div>
              <span className="text-xs font-semibold text-slate-600 leading-tight truncate">
                {block.label}
              </span>
            </div>

            {/* Value + Change Badge */}
            <div className="mt-2.5 flex items-baseline justify-between gap-1">
              <span className="bb-amount text-[22px] text-[#182230]">
                {block.value}
              </span>
              {block.change ? (
                <span
                  className={`text-xs font-semibold ${
                    block.isPositive ? "text-emerald-600" : "text-rose-500"
                  }`}
                >
                  {block.change}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
