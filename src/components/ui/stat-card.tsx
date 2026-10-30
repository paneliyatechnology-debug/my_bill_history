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
    default: "border-[#E2E8E5] hover:border-[#CBD5E1] bg-white",
    primary: "border-[#85D5C2] bg-[#F2FAF7] hover:border-[#26A58A]",
    saffron: "border-[#85D5C2] bg-[#F2FAF7] hover:border-[#26A58A]",
    brand: "border-[#85D5C2] bg-[#F2FAF7] hover:border-[#26A58A]",
    success: "border-emerald-200 bg-emerald-50/20 hover:border-emerald-300",
    warning: "border-amber-200 bg-amber-50/20 hover:border-amber-300",
    danger: "border-rose-200 bg-rose-50/20 hover:border-rose-300",
  };

  const iconBgVariants = {
    default: "bg-[#EEF1E8] text-[#5A6B66]",
    primary: "bg-[#E6F7F2] text-[#26A58A]",
    saffron: "bg-[#E6F7F2] text-[#26A58A]",
    brand: "bg-[#E6F7F2] text-[#26A58A]",
    success: "bg-emerald-100/60 text-emerald-700",
    warning: "bg-amber-100/60 text-amber-700",
    danger: "bg-rose-100/60 text-rose-700",
  };

  return (
    <div
      className={`rounded-card p-4 sm:p-5 border shadow-card transition-all duration-200 hover:shadow-md min-w-0 w-full overflow-hidden ${borderVariants[variant]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-xs font-semibold text-[#667085] uppercase tracking-wider truncate">
            {isGu && titleGujarati ? titleGujarati : title}
          </p>
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-[#202124] font-mono truncate">
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
        <div className="mt-3 flex items-center justify-between text-xs text-[#667085] pt-2 border-t border-[#E5E7EB] min-w-0 flex-wrap gap-1">
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
