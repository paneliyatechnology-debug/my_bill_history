import React from "react";

export type BadgeVariant =
  | "primary"
  | "saffron"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "purple";

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
  const dotStyles: Record<BadgeVariant, string> = {
    primary: "bg-blue-600",
    saffron: "bg-blue-600",
    success: "bg-emerald-600",
    warning: "bg-amber-500",
    danger: "bg-rose-600",
    info: "bg-sky-600",
    neutral: "bg-slate-400",
    purple: "bg-indigo-600",
  };

  const textStyles: Record<BadgeVariant, string> = {
    primary: "text-slate-800",
    saffron: "text-slate-800",
    success: "text-slate-800",
    warning: "text-slate-800",
    danger: "text-rose-700",
    info: "text-slate-800",
    neutral: "text-slate-700",
    purple: "text-slate-800",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotStyles[variant]}`} />
      <span className={textStyles[variant]}>{children}</span>
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  if (!status) return null;
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
    return <Badge variant="success">{s.replace(/_/g, " ")}</Badge>;
  }

  if (
    [
      "DRAFT",
      "PENDING",
      "PARTIALLY_PAID",
      "PARTIAL",
      "SYNCING",
      "PLANNED",
      "DISPATCHED",
      "SHORTAGE",
    ].includes(s)
  ) {
    return <Badge variant="warning">{s.replace(/_/g, " ")}</Badge>;
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
    return <Badge variant="danger">{s.replace(/_/g, " ")}</Badge>;
  }

  if (
    [
      "B2B",
      "B2C",
      "RECEIPT",
      "PAYMENT",
      "JOURNAL",
      "IN_PROGRESS",
      "JOB_WORK",
      "BRANCH_TRANSFER",
    ].includes(s)
  ) {
    return <Badge variant="info">{s.replace(/_/g, " ")}</Badge>;
  }

  return <Badge variant="neutral">{s.replace(/_/g, " ")}</Badge>;
}
