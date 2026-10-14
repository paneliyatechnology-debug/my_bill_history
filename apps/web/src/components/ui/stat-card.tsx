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
  variant?: "default" | "success" | "warning" | "danger" | "brand" | "saffron";
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
    default: "border-slate-200/80 hover:border-slate-300",
    success: "border-emerald-200/80 hover:border-emerald-300 bg-emerald-50/10",
    warning: "border-amber-200/80 hover:border-amber-300 bg-amber-50/10",
    danger: "border-rose-200/80 hover:border-rose-300 bg-rose-50/10",
    brand: "border-amber-200/80 hover:border-[#FF9933] bg-amber-50/20",
    saffron: "border-amber-300 hover:border-[#FF9933] bg-amber-50/30",
  };

  return (
    <div
      className={`bg-white rounded-xl p-5 border shadow-sm transition-all duration-200 hover:shadow-md ${borderVariants[variant]}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {title}
            {titleGujarati && (
              <span className="text-slate-400 font-normal ml-1">
                ({titleGujarati})
              </span>
            )}
          </p>
          <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
            {value}
          </div>
        </div>
        {icon && (
          <div className="p-2.5 bg-slate-100 rounded-lg text-slate-600">
            {icon}
          </div>
        )}
      </div>

      {(subtext || trend) && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          {subtext && <span>{subtext}</span>}
          {trend && (
            <span
              className={`font-medium ${
                trend.isPositive ? "text-emerald-600" : "text-rose-600"
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
