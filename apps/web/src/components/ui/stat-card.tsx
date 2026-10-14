import React from "react";

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
  const borderVariants = {
    default: "border-[#E5E7EB] hover:border-[#D1D5DB] bg-white",
    primary: "border-[#FED7AA] bg-[#FFFAF5] hover:border-[#F47721]",
    saffron: "border-[#FED7AA] bg-[#FFFAF5] hover:border-[#F47721]",
    brand: "border-[#FED7AA] bg-[#FFFAF5] hover:border-[#F47721]",
    success: "border-emerald-200 bg-emerald-50/20 hover:border-emerald-300",
    warning: "border-amber-200 bg-amber-50/20 hover:border-amber-300",
    danger: "border-rose-200 bg-rose-50/20 hover:border-rose-300",
  };

  const iconBgVariants = {
    default: "bg-[#F3F4F6] text-[#667085]",
    primary: "bg-[#FFF3E8] text-[#F47721]",
    saffron: "bg-[#FFF3E8] text-[#F47721]",
    brand: "bg-[#FFF3E8] text-[#F47721]",
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
            {title}
            {titleGujarati && (
              <span className="text-[#98A2B3] font-normal ml-1">
                ({titleGujarati})
              </span>
            )}
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
