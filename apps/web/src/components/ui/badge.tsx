import React from "react";

export type BadgeVariant =
  "success" | "warning" | "danger" | "info" | "neutral" | "purple";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({
  children,
  variant = "neutral",
  className = "",
}: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    success:
      "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/20",
    warning: "bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/20",
    danger: "bg-rose-50 text-rose-700 border-rose-200 ring-rose-600/20",
    info: "bg-sky-50 text-sky-700 border-sky-200 ring-sky-600/20",
    purple: "bg-purple-50 text-purple-700 border-purple-200 ring-purple-600/20",
    neutral: "bg-slate-100 text-slate-700 border-slate-200 ring-slate-600/10",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  if (
    [
      "ISSUED",
      "PAID",
      "ACTIVE",
      "COMPLETED",
      "VERIFIED",
      "RECEIVED",
      "BALANCED",
    ].includes(s)
  ) {
    return <Badge variant="success">{s.replace("_", " ")}</Badge>;
  }
  if (
    [
      "DRAFT",
      "PENDING",
      "PARTIALLY_PAID",
      "SYNCING",
      "PLANNED",
      "DISPATCHED",
      "SHORTAGE",
    ].includes(s)
  ) {
    return <Badge variant="warning">{s.replace("_", " ")}</Badge>;
  }
  if (
    [
      "CANCELLED",
      "OVERDUE",
      "FAILED",
      "INACTIVE",
      "REVERSED",
      "DAMAGE",
      "VARIANCE",
    ].includes(s)
  ) {
    return <Badge variant="danger">{s.replace("_", " ")}</Badge>;
  }
  if (
    [
      "B2B",
      "RECEIPT",
      "PAYMENT",
      "JOURNAL",
      "IN_PROGRESS",
      "JOB_WORK",
      "BRANCH_TRANSFER",
    ].includes(s)
  ) {
    return <Badge variant="info">{s.replace("_", " ")}</Badge>;
  }
  return <Badge variant="neutral">{s.replace("_", " ")}</Badge>;
}
