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
import { Search, ChevronDown, X, Plus } from "lucide-react";
import { BaseDropdownProps, DropdownOption } from "./dropdown-types";
import { DropdownOptionItem } from "./dropdown-option";
import { DropdownEmpty } from "./dropdown-empty";
import { DropdownLoading } from "./dropdown-loading";

export interface CustomComboboxProps<T = any> extends BaseDropdownProps<T> {
  value?: T;
  defaultValue?: T;
  options?: DropdownOption<T>[];
  onChange?: (value: any) => void;
  onSearch?: (query: string) => void;
  isLoading?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  tabs?: { id: string; label: string }[];
  selectedTab?: string;
  onTabChange?: (tabId: string) => void;
  filterFn?: (option: DropdownOption<T>, query: string) => boolean;
  minPanelWidth?: number;
  renderOption?: (option: DropdownOption<T>, isSelected: boolean) => React.ReactNode;
  allowCustomValue?: boolean;
  onCustomValueSelect?: (val: string) => void;
}

export const CustomCombobox = forwardRef<HTMLButtonElement, CustomComboboxProps<any>>(
  function CustomCombobox(
    {
      name,
      id,
      label,
      value: controlledValue,
      defaultValue,
      options = [],
      placeholder = "Select an option...",
      searchPlaceholder = "Type to search...",
      emptyMessage = "No matching options found",
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
      isLoading = false,
      tabs,
      selectedTab,
      onTabChange,
      filterFn,
      minPanelWidth,
      renderOption,
      allowCustomValue = false,
      onCustomValueSelect,
      onChange,
      onSearch,
    },
    forwardedRef
  ) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [internalValue, setInternalValue] = useState<any>(defaultValue ?? "");
    const [focusedIdx, setFocusedIdx] = useState<number>(-1);
    const [activeTab, setActiveTab] = useState<string>(selectedTab || (tabs && tabs[0]?.id) || "ALL");
    const [coords, setCoords] = useState<{
      top?: number;
      bottom?: number;
      left: number;
      width: number;
      maxHeight?: number;
      placement: "bottom" | "top";
    } | null>(null);

    const isControlled = controlledValue !== undefined;
    const rawVal = isControlled ? controlledValue : internalValue;

    // Normalize value in case an event object or object wrapper was passed
    const normalizedValue = useMemo(() => {
      if (rawVal === null || rawVal === undefined) return "";
      if (typeof rawVal === "object") {
        if ("target" in rawVal && rawVal.target && typeof rawVal.target === "object" && "value" in rawVal.target) {
          return String((rawVal as any).target.value ?? "");
        }
        if ("value" in rawVal) {
          return String((rawVal as any).value ?? "");
        }
      }
      return String(rawVal);
    }, [rawVal]);

    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const searchInputRef = useRef<HTMLInputElement | null>(null);

    // Selected option object
    const selectedOption = useMemo(
      () => options.find((opt) => String(opt.value) === normalizedValue),
      [options, normalizedValue]
    );

    // Filter options based on query & active tab
    const filteredOptions = useMemo(() => {
      let list = options;

      // Tab filtering if option.data has nature or group
      if (tabs && activeTab !== "ALL") {
        list = list.filter((opt) => {
          if (opt.group && opt.group === activeTab) return true;
          if (opt.data?.group?.nature === activeTab) return true;
          if (activeTab === "CASH_BANK") {
            const grp = (opt.group || opt.data?.group?.name || "").toLowerCase();
            return (
              opt.data?.isBankLedger ||
              opt.data?.isCashLedger ||
              grp.includes("bank") ||
              grp.includes("cash")
            );
          }
          return true;
        });
      }

      const q = query.trim().toLowerCase();
      if (!q) return list;

      if (filterFn) {
        return list.filter((opt) => filterFn(opt, q));
      }

      return list.filter((opt) => {
        const labelMatch = opt.label.toLowerCase().includes(q);
        const subMatch = (opt.sublabel || opt.secondaryText || "").toLowerCase().includes(q);
        const codeMatch = (opt.code || "").toLowerCase().includes(q);
        const groupMatch = (opt.group || "").toLowerCase().includes(q);
        return labelMatch || subMatch || codeMatch || groupMatch;
      });
    }, [options, query, tabs, activeTab, filterFn]);

    // Viewport-aware coordinate calculation
    const updateCoords = useCallback(() => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Prefer opening downwards if at least 220px available below, or if below has more room than above
      const placement: "bottom" | "top" =
        spaceBelow < 220 && spaceAbove > spaceBelow ? "top" : "bottom";

      const maxAvailableHeight = placement === "top" ? spaceAbove - 16 : spaceBelow - 16;
      const calculatedMaxHeight = Math.min(460, Math.max(220, maxAvailableHeight));

      const maxWidth = window.innerWidth - 16;
      const calculatedWidth = Math.min(maxWidth, Math.max(minPanelWidth || 280, rect.width));

      let left = rect.left;
      if (left + calculatedWidth > window.innerWidth - 8) {
        left = window.innerWidth - calculatedWidth - 8;
      }
      if (left < 8) left = 8;

      if (placement === "top") {
        const bottom = window.innerHeight - rect.top + 4;
        setCoords({
          bottom,
          left,
          width: calculatedWidth,
          maxHeight: calculatedMaxHeight,
          placement,
        });
      } else {
        const top = rect.bottom + 4;
        setCoords({
          top,
          left,
          width: calculatedWidth,
          maxHeight: calculatedMaxHeight,
          placement,
        });
      }
    }, [minPanelWidth]);

    // Keep floating panel strictly aligned on scroll / window resize
    useEffect(() => {
      if (!isOpen) return;
      const handleScrollOrResize = () => {
        updateCoords();
      };
      window.addEventListener("scroll", handleScrollOrResize, true);
      window.addEventListener("resize", handleScrollOrResize);
      return () => {
        window.removeEventListener("scroll", handleScrollOrResize, true);
        window.removeEventListener("resize", handleScrollOrResize);
      };
    }, [isOpen, updateCoords]);

    const handleOpen = () => {
      if (disabled || readOnly) return;
      updateCoords();
      setIsOpen(true);
      setQuery("");
      setFocusedIdx(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 30);
    };

    const handleClose = useCallback(() => {
      setIsOpen(false);
      setFocusedIdx(-1);
    }, []);

    const handleSelect = (option: DropdownOption<any>) => {
      if (option.disabled) return;
      if (!isControlled) {
        setInternalValue(option.value);
      }
      if (onChange) {
        onChange(option.value);
      }
      handleClose();
      triggerRef.current?.focus();
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isControlled) {
        setInternalValue("");
      }
      if (onChange) {
        onChange("" as any);
      }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newQuery = e.target.value;
      setQuery(newQuery);
      setFocusedIdx(0);
      if (onSearch) onSearch(newQuery);
    };

    const handleTabClick = (tabId: string) => {
      setActiveTab(tabId);
      if (onTabChange) onTabChange(tabId);
    };

    // Outside click & window events
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

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled || readOnly) return;

      if (!isOpen) {
        if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
          e.preventDefault();
          handleOpen();
        }
        return;
      }

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          handleClose();
          triggerRef.current?.focus();
          break;
        case "ArrowDown":
          e.preventDefault();
          setFocusedIdx((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIdx((prev) =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (focusedIdx >= 0 && focusedIdx < filteredOptions.length) {
            handleSelect(filteredOptions[focusedIdx]);
          }
          break;
        case "Tab":
          handleClose();
          break;
      }
    };

    const heightClass =
      size === "sm" ? "h-[34px] text-[12.5px]" : size === "lg" ? "h-[44px] text-[14px]" : "h-[40px] text-[13px]";

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
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={ariaLabel || label || placeholder}
          className={`w-full bg-white border rounded-lg px-3 flex items-center justify-between gap-2 font-normal transition-all outline-none select-none ${heightClass} ${
            disabled
              ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-75"
              : error
              ? "border-red-400 text-slate-900 focus:ring-2 focus:ring-red-500/15 focus:border-red-500"
              : isOpen
              ? "border-[#1677E8] ring-2 ring-[#1677E8]/15 bg-blue-50/10 text-slate-900"
              : "border-[#DCE3EC] text-[#263445] hover:border-slate-400 hover:bg-slate-50/40"
          } ${triggerClassName}`}
        >
          <div className="flex items-center gap-2 truncate min-w-0 flex-1 text-left">
            {selectedOption ? (
              <>
                {selectedOption.icon && (
                  <span className="shrink-0 flex items-center text-slate-500">
                    {selectedOption.icon}
                  </span>
                )}
                <span className="truncate font-medium text-[#263445]">
                  {selectedOption.label}
                </span>
                {selectedOption.code && (
                  <span className="font-mono text-[10.5px] text-slate-500 bg-slate-100 px-1 py-0.2 rounded shrink-0">
                    {selectedOption.code}
                  </span>
                )}
                {(selectedOption.sublabel || selectedOption.secondaryText) && (
                  <span className="text-[11px] text-slate-400 truncate max-w-[120px]">
                    {selectedOption.sublabel || selectedOption.secondaryText}
                  </span>
                )}
                {selectedOption.badge && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                    {selectedOption.badge}
                  </span>
                )}
              </>
            ) : (
              <span className="text-[#94A3B8] truncate">{placeholder}</span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-1">
            {clearable && normalizedValue && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                title="Clear"
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

        {/* Floating Searchable Panel via Portal */}
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
                    onChange={handleSearchChange}
                    onKeyDown={handleKeyDown}
                    placeholder={searchPlaceholder}
                    className="w-full text-xs pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/10 text-slate-900 placeholder:text-slate-400 h-9 transition-all"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        if (onSearch) onSearch("");
                      }}
                      className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Tabs if provided */}
                {tabs && tabs.length > 0 && (
                  <div className="flex items-center gap-1 overflow-x-auto text-[11px] pt-0.5">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => handleTabClick(tab.id)}
                        className={`px-2 py-0.5 rounded-md font-medium shrink-0 transition-colors cursor-pointer ${
                          activeTab === tab.id
                            ? "bg-slate-900 text-white"
                            : "bg-slate-200/60 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Options List */}
              <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 min-h-0">
                {allowCustomValue && query.trim() && !options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase()) && (
                  <button
                    type="button"
                    onClick={() => {
                      const customVal = query.trim();
                      if (onCustomValueSelect) {
                        onCustomValueSelect(customVal);
                      } else {
                        handleSelect({ value: customVal, label: customVal });
                      }
                    }}
                    className="w-full text-left p-2 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50/60 hover:bg-blue-100/70 transition-colors flex items-center gap-2 cursor-pointer mb-1 border border-blue-200/60"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span>Use &quot;{query.trim()}&quot; as custom item</span>
                  </button>
                )}
                {isLoading ? (
                  <DropdownLoading />
                ) : filteredOptions.length === 0 ? (
                  <DropdownEmpty message={emptyMessage} />
                ) : (
                  filteredOptions.map((opt, idx) => (
                    <DropdownOptionItem
                      key={String(opt.value)}
                      option={opt}
                      size={size}
                      isSelected={selectedOption ? String(opt.value) === String(selectedOption.value) : false}
                      isFocused={focusedIdx === idx}
                      renderOption={renderOption}
                      onSelect={handleSelect}
                    />
                  ))
                )}
              </div>
            </div>,
            document.body
          )}

        {/* Error message */}
        {typeof error === "string" && (
          <p className="text-[11px] text-red-500 mt-1">{error}</p>
        )}
      </div>
    );
  }
);
