import React from "react";
import { SearchX } from "lucide-react";

export interface DropdownEmptyProps {
  message?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function DropdownEmpty({
  message = "No options found",
  icon,
  className = "",
}: DropdownEmptyProps) {
  return (
    <div
      className={`px-4 py-6 flex flex-col items-center justify-center text-center text-[#94A3B8] select-none ${className}`}
    >
      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center mb-1.5 text-slate-400">
        {icon || <SearchX className="w-4 h-4" />}
      </div>
      <p className="text-[12px] font-medium text-[#64748B]">{message}</p>
    </div>
  );
}
