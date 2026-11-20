"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
} from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, X, Check } from "lucide-react";
import { BaseDropdownProps, DropdownOption } from "./dropdown-types";
import { DropdownEmpty } from "./dropdown-empty";

export interface CustomMultiSelectProps<T = string> extends BaseDropdownProps<T> {
  values?: T[];
  defaultValues?: T[];
  options?: DropdownOption<T>[];
  onChange?: (values: T[]) => void;
  maxDisplayedTags?: number;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

export const CustomMultiSelect = forwardRef<HTMLButtonElement, CustomMultiSelectProps<any>>(
  function CustomMultiSelect(
    {
      name,
      id,
      label,
      values: controlledValues,
      defaultValues = [],
      options = [],
      placeholder = "Select options...",
      searchPlaceholder = "Search...",
      emptyMessage = "No matching options",
      disabled = false,
      readOnly = false,
      required = false,
      error,
      size = "md",
      className = "",
      panelClassName = "",
      triggerClassName = "",
      clearable = true,
      ariaLabel,
      fullWidth = true,
      maxDisplayedTags = 2,
      onChange,
    },
    forwardedRef
  ) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [internalValues, setInternalValues] = useState<any[]>(defaultValues);
    const [coords, setCoords] = useState<{
      top?: number;
      bottom?: number;
      left: number;
      width: number;
      maxHeight?: number;
      placement: "bottom" | "top";
    } | null>(null);

    const isControlled = controlledValues !== undefined;
    const values = isControlled ? controlledValues : internalValues;

    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const searchInputRef = useRef<HTMLInputElement | null>(null);

    const selectedOptions = useMemo(
      () => options.filter((opt) => values.includes(opt.value)),
      [options, values]
    );

    const filteredOptions = useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) return options;
      return options.filter((opt) => {
        const labelMatch = opt.label.toLowerCase().includes(q);
        const subMatch = (opt.sublabel || opt.secondaryText || "").toLowerCase().includes(q);
        return labelMatch || subMatch;
      });
    }, [options, query]);

    const updateCoords = useCallback(() => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Prefer opening downwards unless space below is tight (< 200px) and there's more space above
      const placement: "bottom" | "top" =
        spaceBelow < 200 && spaceAbove > spaceBelow ? "top" : "bottom";

      let left = rect.left;
      const width = Math.max(300, rect.width);
      if (left + width > window.innerWidth - 8) {
        left = window.innerWidth - width - 8;
      }
      if (left < 8) left = 8;

      if (placement === "top") {
        const bottom = window.innerHeight - rect.top + 4;
        const maxHeight = Math.min(320, Math.max(160, rect.top - 16));
        setCoords({
          bottom,
          left,
          width,
          maxHeight,
          placement,
        });
      } else {
        const top = rect.bottom + 4;
        const maxHeight = Math.min(320, Math.max(160, spaceBelow - 16));
        setCoords({
          top,
          left,
          width,
          maxHeight,
          placement,
        });
      }
    }, []);

    const handleOpen = () => {
      if (disabled || readOnly) return;
      updateCoords();
      setIsOpen(true);
      setQuery("");
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 30);
    };

    const handleClose = useCallback(() => {
      setIsOpen(false);
    }, []);

    const handleToggleOption = (val: any) => {
      let next: any[];
      if (values.includes(val)) {
        next = values.filter((v) => v !== val);
      } else {
        next = [...values, val];
      }
      if (!isControlled) {
        setInternalValues(next);
      }
      if (onChange) onChange(next);
    };

    const handleSelectAll = () => {
      const allVals = options.filter((opt) => !opt.disabled).map((opt) => opt.value);
      if (!isControlled) {
        setInternalValues(allVals);
      }
      if (onChange) onChange(allVals);
    };

    const handleClearAll = (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (!isControlled) {
        setInternalValues([]);
      }
      if (onChange) onChange([]);
    };

    useEffect(() => {
      if (!isOpen) return;

      function handleMouseDown(e: MouseEvent) {
        const target = e.target as Node;
        if (
          triggerRef.current?.contains(target) ||
          panelRef.current?.contains(target)
        ) {
          return;
        }
        handleClose();
      }

      function handleScrollOrResize() {
        updateCoords();
      }

      document.addEventListener("mousedown", handleMouseDown);
      window.addEventListener("scroll", handleScrollOrResize, true);
      window.addEventListener("resize", handleScrollOrResize);

      return () => {
        document.removeEventListener("mousedown", handleMouseDown);
        window.removeEventListener("scroll", handleScrollOrResize, true);
        window.removeEventListener("resize", handleScrollOrResize);
      };
    }, [isOpen, handleClose, updateCoords]);

    const minHeightClass =
      size === "sm" ? "min-h-[34px] text-[12.5px]" : size === "lg" ? "min-h-[44px] text-[14px]" : "min-h-[40px] text-[13px]";

    return (
      <div className={`relative ${fullWidth ? "w-full" : "inline-block"} ${className}`}>
        {label && (
          <label
            htmlFor={id}
            className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5"
          >
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}

        {/* Trigger Button */}
        <button
          ref={(node) => {
            triggerRef.current = node;
            if (typeof forwardedRef === "function") forwardedRef(node);
            else if (forwardedRef) forwardedRef.current = node;
          }}
          id={id}
          name={name}
          type="button"
          disabled={disabled}
          onClick={isOpen ? handleClose : handleOpen}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={ariaLabel || label || placeholder}
          className={`w-full bg-white border rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2 font-normal transition-all outline-none select-none ${minHeightClass} ${
            disabled
              ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-75"
              : error
              ? "border-red-400 text-slate-900 focus:ring-2 focus:ring-red-500/15 focus:border-red-500"
              : isOpen
              ? "border-[#1677E8] ring-2 ring-[#1677E8]/15 bg-blue-50/10 text-slate-900"
              : "border-[#DCE3EC] text-[#263445] hover:border-slate-400 hover:bg-slate-50/40"
          } ${triggerClassName}`}
        >
          <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1 text-left">
            {selectedOptions.length === 0 ? (
              <span className="text-[#94A3B8] text-[13px]">{placeholder}</span>
            ) : (
              <>
                {selectedOptions.slice(0, maxDisplayedTags).map((opt) => (
                  <span
                    key={String(opt.value)}
                    className="inline-flex items-center gap-1 text-[11.5px] font-medium bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]/60 px-2 py-0.5 rounded-md"
                  >
                    <span className="truncate max-w-[100px]">{opt.label}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleOption(opt.value);
                      }}
                      className="hover:bg-blue-200/50 rounded p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </span>
                  </span>
                ))}
                {selectedOptions.length > maxDisplayedTags && (
                  <span className="text-[11.5px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md">
                    +{selectedOptions.length - maxDisplayedTags} more
                  </span>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-1">
            {clearable && selectedOptions.length > 0 && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClearAll}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                title="Clear all"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-150 ${
                isOpen ? "rotate-180 text-[#1677E8]" : ""
              }`}
            />
          </div>
        </button>

        {/* Floating Panel via Portal */}
        {isOpen &&
          coords &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              ref={panelRef}
              role="listbox"
              style={{
                position: "fixed",
                ...(coords.placement === "top"
                  ? { bottom: `${coords.bottom}px` }
                  : { top: `${coords.top}px` }),
                left: `${coords.left}px`,
                width: `${coords.width}px`,
                maxHeight: `${coords.maxHeight}px`,
                zIndex: 99999,
              }}
              className={`bg-white border border-[#E2E8F0] rounded-[10px] shadow-xl overflow-hidden flex flex-col animate-in fade-in-50 zoom-in-95 duration-100 select-none ${panelClassName}`}
            >
              {/* Search Header */}
              <div className="p-2.5 border-b border-slate-100 bg-slate-50/70 space-y-2">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full text-xs pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/10 text-slate-900 placeholder:text-slate-400 h-9 transition-all"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] px-1 text-slate-500">
                  <span>{selectedOptions.length} of {options.length} selected</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-[#1677E8] hover:underline font-medium"
                    >
                      Select all
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => handleClearAll()}
                      className="text-slate-500 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {/* Options List with Checkboxes */}
              <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 min-h-0">
                {filteredOptions.length === 0 ? (
                  <DropdownEmpty message={emptyMessage} />
                ) : (
                  filteredOptions.map((opt) => {
                    const isSelected = values.includes(opt.value);
                    return (
                      <div
                        key={String(opt.value)}
                        onClick={() => {
                          if (!opt.disabled) handleToggleOption(opt.value);
                        }}
                        className={`px-3 py-2 flex items-center justify-between gap-2.5 text-[13px] rounded-lg transition-colors cursor-pointer select-none ${
                          opt.disabled
                            ? "opacity-40 cursor-not-allowed"
                            : isSelected
                            ? "bg-[#EFF6FF] text-[#2563EB] font-medium"
                            : "text-[#263445] hover:bg-[#F1F5F9]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? "bg-[#1677E8] border-[#1677E8] text-white"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                          </div>
                          <span className="truncate">{opt.label}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>,
            document.body
          )}

        {typeof error === "string" && (
          <p className="text-[11px] text-red-500 mt-1">{error}</p>
        )}
      </div>
    );
  }
);
