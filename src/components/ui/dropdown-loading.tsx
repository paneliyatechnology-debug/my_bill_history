import React from "react";
import { Loader2 } from "lucide-react";

export interface DropdownLoadingProps {
  message?: string;
  className?: string;
}

export function DropdownLoading({
  message = "Loading options...",
  className = "",
}: DropdownLoadingProps) {
  return (
    <div
      className={`px-4 py-5 flex items-center justify-center gap-2 text-[#64748B] text-[12px] font-medium select-none ${className}`}
    >
      <Loader2 className="w-4 h-4 animate-spin text-[#1677E8]" />
      <span>{message}</span>
    </div>
  );
}
