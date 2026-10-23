import React from "react";

export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white p-5 rounded-2xl border border-border shadow-subtle space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-7 w-36" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function TableSkeleton({
  rows = 5,
  cols = 6,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="bg-white rounded-card border border-border shadow-subtle overflow-hidden w-full min-w-0">
      {/* Header Bar */}
      <div className="p-3.5 sm:p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Skeleton className="h-8 sm:h-9 w-44 sm:w-64 max-w-full rounded-xl" />
        <Skeleton className="h-8 sm:h-9 w-28 sm:w-32 max-w-full rounded-xl" />
      </div>
      {/* Table Head (desktop) */}
      <div className="hidden sm:flex bg-slate-50/80 border-b border-border px-4 py-3 gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Table Rows (responsive) */}
      <div className="divide-y divide-slate-100 p-2 space-y-2">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-3 sm:gap-4 py-2.5 px-2 items-center">
            {Array.from({ length: Math.min(cols, 4) }).map((_, c) => (
              <Skeleton key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse min-w-0">
      {/* Header skeleton */}
      <div className="bg-white p-4 sm:p-6 rounded-card border border-border shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <Skeleton className="h-6 sm:h-7 w-48 sm:w-56 max-w-full" />
          <Skeleton className="h-4 w-36 sm:w-40 max-w-full" />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Skeleton className="h-9 sm:h-10 flex-1 sm:w-28 sm:flex-none rounded-xl" />
          <Skeleton className="h-9 sm:h-10 flex-1 sm:w-36 sm:flex-none rounded-xl" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      {/* Quick Actions Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 min-w-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white p-3 rounded-card border border-border flex items-center gap-2.5">
            <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-2.5 w-12" />
            </div>
          </div>
        ))}
      </div>

      {/* Recent Invoices Skeleton */}
      <TableSkeleton rows={4} cols={5} />
    </div>
  );
}

export function InitialAppLoader({
  message = "Loading your business...",
}: {
  message?: string;
}) {
  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-4">
        {/* Brand Icon with Saffron Pulse Ring */}
        <div className="relative inline-block">
          <div className="w-16 h-16 rounded-2xl bg-[#FFF3E8] border border-[#FDBA74] flex items-center justify-center text-3xl shadow-saffron">
            <span className="select-none">🧾</span>
          </div>
          <div className="absolute -inset-1 rounded-2xl border-2 border-[#F47721] opacity-40 animate-ping pointer-events-none" />
        </div>

        <div>
          <h2 className="text-lg font-black tracking-tight">
            <span className="text-[#1E589D]">myown</span>
            <span className="text-[#EA580C]">billbook</span>
          </h2>
          <p className="text-xs text-[#667085] mt-1">{message}</p>
        </div>

        {/* Bhagwa Spinner */}
        <div className="flex justify-center">
          <div className="w-6 h-6 border-2 border-[#F47721] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    </div>
  );
}
