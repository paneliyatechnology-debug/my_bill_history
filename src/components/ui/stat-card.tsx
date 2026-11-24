import React, { useContext } from "react";
import { AuthContext } from "../../context/auth-context";

interface StatCardProps {
  title: string;
  titleGujarati?: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  variant?: "default" | "success" | "warning" | "danger" | "brand" | "saffron" | "primary";
}

export function StatCard({
  title,
  titleGujarati,
  value,
  subtext,
  icon,
  trend,
  variant = "default",
}: StatCardProps) {
  const auth = useContext(AuthContext);
  const isGu = auth?.lang === "gu";

  const borderVariants = {
    default: "border-slate-200 bg-white hover:border-slate-300",
    primary: "border-slate-200 bg-white hover:border-slate-300",
    saffron: "border-slate-200 bg-white hover:border-slate-300",
    brand: "border-slate-200 bg-white hover:border-slate-300",
    success: "border-slate-200 bg-white hover:border-slate-300",
    warning: "border-slate-200 bg-white hover:border-slate-300",
    danger: "border-slate-200 bg-white hover:border-slate-300",
  };

  const iconBgVariants = {
    default: "bg-slate-50 text-slate-600 border border-slate-100",
    primary: "bg-slate-50 text-slate-700 border border-slate-100",
    saffron: "bg-slate-50 text-slate-700 border border-slate-100",
    brand: "bg-slate-50 text-slate-700 border border-slate-100",
    success: "bg-slate-50 text-slate-700 border border-slate-100",
    warning: "bg-slate-50 text-slate-700 border border-slate-100",
    danger: "bg-slate-50 text-slate-700 border border-slate-100",
  };

  return (
    <div
      className={`rounded-card p-4 sm:p-5 border shadow-card transition-all duration-200 hover:shadow-md min-w-0 w-full overflow-hidden ${borderVariants[variant]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="typo-card-heading text-[#667085] uppercase tracking-wider truncate">
            {isGu && titleGujarati ? titleGujarati : title}
          </p>
          <div className="typo-kpi text-[#202124] truncate">
            {value}
          </div>
        </div>
        {icon && (
          <div className={`p-2 sm:p-2.5 rounded-lg shrink-0 ${iconBgVariants[variant]}`}>
            {icon}
          </div>
        )}
      </div>

      {(subtext || trend) && (
        <div className="mt-3 flex items-center justify-between typo-card-desc pt-2 border-t border-[#E5E7EB] min-w-0 flex-wrap gap-1">
          {subtext && <span className="truncate">{subtext}</span>}
          {trend && (
            <span
              className={`font-semibold shrink-0 ${
                trend.isPositive ? "text-[#16834A]" : "text-[#DC3545]"
              }`}
            >
              {trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
