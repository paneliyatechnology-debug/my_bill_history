import React from "react";
import { Check } from "lucide-react";
import { DropdownOption, DropdownSize } from "./dropdown-types";

export interface DropdownOptionItemProps<T = string> {
  option: DropdownOption<T>;
  isSelected: boolean;
  isFocused?: boolean;
  size?: DropdownSize;
  onSelect: (option: DropdownOption<T>) => void;
  renderOption?: (option: DropdownOption<T>, isSelected: boolean) => React.ReactNode;
  className?: string;
}

export function DropdownOptionItem<T = string>({
  option,
  isSelected,
  isFocused = false,
  size = "md",
  onSelect,
  renderOption,
  className = "",
}: DropdownOptionItemProps<T>) {
  const minHeightClass =
    size === "sm" ? "min-h-[34px] py-1.5" : size === "lg" ? "min-h-[42px] py-2.5" : "min-h-[38px] py-2";

  if (renderOption) {
    return (
      <div
        role="option"
        aria-selected={isSelected}
        aria-disabled={option.disabled}
        onMouseDown={(e) => {
          e.preventDefault();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!option.disabled) onSelect(option);
        }}
        className={`px-3 rounded-lg transition-colors cursor-pointer select-none ${
          option.disabled ? "opacity-40 cursor-not-allowed" : ""
        } ${className}`}
      >
        {renderOption(option, isSelected)}
      </div>
    );
  }

  return (
    <div
      role="option"
      aria-selected={isSelected}
      aria-disabled={option.disabled}
      onMouseDown={(e) => {
        e.preventDefault();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!option.disabled) onSelect(option);
      }}
      className={`px-3 flex items-center justify-between gap-2.5 text-[13px] rounded-lg transition-colors cursor-pointer select-none ${minHeightClass} ${
        option.disabled
          ? "opacity-40 cursor-not-allowed text-slate-400"
          : isSelected
          ? "bg-[#EFF6FF] text-[#2563EB] font-medium"
          : isFocused
          ? "bg-[#F1F5F9] text-[#1E293B]"
          : "text-[#263445] hover:bg-[#F1F5F9]"
      } ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {option.icon && (
          <span className="shrink-0 flex items-center justify-center text-slate-500">
            {option.icon}
          </span>
        )}

        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate">{option.label}</span>
            {option.code && (
              <span className="font-mono text-[10.5px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                {option.code}
              </span>
            )}
          </div>

          {(option.sublabel || option.secondaryText) && (
            <span className="text-[11px] text-[#64748B] truncate leading-tight mt-0.5">
              {option.sublabel || option.secondaryText}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 ml-1">
        {option.badge && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
            {option.badge}
          </span>
        )}
        {isSelected && (
          <Check className="w-4 h-4 text-[#2563EB] shrink-0" strokeWidth={2.2} />
        )}
      </div>
    </div>
  );
}
