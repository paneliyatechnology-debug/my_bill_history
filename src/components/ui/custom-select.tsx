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
import { ChevronDown, X } from "lucide-react";
import { BaseDropdownProps, DropdownOption } from "./dropdown-types";
import { DropdownOptionItem } from "./dropdown-option";
import { DropdownEmpty } from "./dropdown-empty";

export interface CustomSelectProps<T = any> extends BaseDropdownProps<T> {
  value?: T;
  defaultValue?: T;
  options?: (DropdownOption<T> | string | { value: T; label: string; [key: string]: any })[];
  children?: React.ReactNode;
  onChange?: (value: any) => void;
  onBlur?: () => void;
  autoFocus?: boolean;
}

export const CustomSelect = forwardRef<HTMLButtonElement, CustomSelectProps<any>>(
  function CustomSelect(
    {
      name,
      id,
      label,
      value: controlledValue,
      defaultValue,
      options: rawOptions = [],
      children,
      placeholder,
      disabled = false,
      readOnly = false,
      required = false,
      error,
      size = "md",
      className = "",
      panelClassName = "",
      triggerClassName = "",
      clearable = false,
      ariaLabel,
      fullWidth = true,
      onChange,
      onBlur,
      autoFocus = false,
    },
    forwardedRef
  ) {
    const displayPlaceholder = placeholder || "Select an option...";
    const [isOpen, setIsOpen] = useState(false);
    const [internalValue, setInternalValue] = useState<any>(defaultValue ?? "");
    const [focusedIdx, setFocusedIdx] = useState<number>(-1);
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

    // Normalize options from either options prop or children `<option>` tags
    const options: DropdownOption<any>[] = useMemo(() => {
      if (rawOptions && rawOptions.length > 0) {
        return rawOptions.map((opt) => {
          if (typeof opt === "string") {
            return { value: opt, label: opt };
          }
          return {
            value: opt.value,
            label: opt.label || String(opt.value),
            sublabel: opt.sublabel || opt.secondaryText,
            icon: opt.icon,
            disabled: opt.disabled,
            group: opt.group,
            badge: opt.badge,
            color: opt.color,
            data: opt.data,
          };
        });
      }

      // Parse from children if options not directly passed
      if (children) {
        const parsed: DropdownOption<any>[] = [];
        React.Children.forEach(children, (child) => {
          if (React.isValidElement(child)) {
            const props: any = child.props;
            if (child.type === "option") {
              parsed.push({
                value: props.value ?? props.children,
                label: typeof props.children === "string" ? props.children : String(props.value),
                disabled: props.disabled,
              });
            } else if (child.type === "optgroup") {
              const groupLabel = props.label || "Group";
              React.Children.forEach(props.children, (optChild) => {
                if (React.isValidElement(optChild) && optChild.type === "option") {
                  const optProps: any = optChild.props;
                  parsed.push({
                    value: optProps.value ?? optProps.children,
                    label:
                      typeof optProps.children === "string"
                        ? optProps.children
                        : String(optProps.value),
                    disabled: optProps.disabled,
                    group: groupLabel,
                  });
                }
              });
            }
          }
        });
        return parsed;
      }

      return [];
    }, [rawOptions, children]);

    // Selected option object
    const selectedOption = useMemo(() => {
      if (normalizedValue !== "") {
        const found = options.find((opt) => String(opt.value) === normalizedValue);
        if (found) return found;
      }

      // Check if an option has value === ""
      if (normalizedValue === "") {
        const emptyOpt = options.find((opt) => String(opt.value) === "");
        if (emptyOpt) return emptyOpt;
      }

      // If placeholder was not explicitly passed and options exist without any "" option,
      // fallback to the first option, matching HTML <select> default behavior
      if (
        placeholder === undefined &&
        options.length > 0 &&
        !options.some((opt) => String(opt.value) === "")
      ) {
        return options[0];
      }

      return undefined;
    }, [options, normalizedValue, placeholder]);

    // Group options if groups exist
    const groupedOptions = useMemo(() => {
      const hasGroups = options.some((opt) => Boolean(opt.group));
      if (!hasGroups) return null;

      const groups: { [key: string]: DropdownOption<any>[] } = {};
      options.forEach((opt) => {
        const g = opt.group || "Other";
        if (!groups[g]) groups[g] = [];
        groups[g].push(opt);
      });
      return groups;
    }, [options]);

    // Viewport-aware coordinate calculation
    const updateCoords = useCallback(() => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Prefer bottom unless space below is tight (< 260px) and there's more space above
      const placement: "bottom" | "top" =
        spaceBelow < 260 && spaceAbove > spaceBelow ? "top" : "bottom";

      let left = rect.left;
      const width = rect.width;
      if (left + width > window.innerWidth - 8) {
        left = window.innerWidth - width - 8;
      }
      if (left < 8) left = 8;

      if (placement === "top") {
        const bottom = window.innerHeight - rect.top + 4;
        const maxHeight = Math.min(380, Math.max(180, rect.top - 16));
        setCoords({
          bottom,
          left,
          width,
          maxHeight,
          placement,
        });
      } else {
        const top = rect.bottom + 4;
        const maxHeight = Math.min(380, Math.max(180, spaceBelow - 16));
        setCoords({
          top,
          left,
          width,
          maxHeight,
          placement,
        });
      }
    }, [options.length]);

    const handleOpen = () => {
      if (disabled || readOnly) return;
      updateCoords();
      setIsOpen(true);
      const selVal = selectedOption ? String(selectedOption.value) : normalizedValue;
      const selIdx = options.findIndex((opt) => String(opt.value) === selVal);
      setFocusedIdx(selIdx >= 0 ? selIdx : 0);
    };

    const handleClose = useCallback(() => {
      setIsOpen(false);
      setFocusedIdx(-1);
      if (onBlur) onBlur();
    }, [onBlur]);

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
          setFocusedIdx((prev) => (prev < options.length - 1 ? prev + 1 : 0));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIdx((prev) => (prev > 0 ? prev - 1 : options.length - 1));
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (focusedIdx >= 0 && focusedIdx < options.length) {
            handleSelect(options[focusedIdx]);
          }
          break;
        case "Tab":
          handleClose();
          break;
      }
    };

    // Height sizing
    const heightClass =
      size === "sm" ? "h-[34px] text-[12.5px]" : size === "lg" ? "h-[44px] text-[14px]" : "h-[40px] text-[13px]";

    const hasExplicitWidth = /\bw-(?:\d+|auto|fit|min|max|\[)/.test(className) && !/\bw-full\b/.test(className);
    const widthClass = fullWidth && !hasExplicitWidth ? "w-full" : hasExplicitWidth ? "inline-block" : "inline-block";

    return (
      <div className={`relative ${widthClass} ${className}`}>
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
                {selectedOption.badge && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                    {selectedOption.badge}
                  </span>
                )}
              </>
            ) : (
              <span className="text-[#94A3B8] truncate">{displayPlaceholder}</span>
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

        {/* Floating Dropdown Panel via Portal */}
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
              className={`bg-white border border-[#E2E8F0] rounded-[10px] shadow-lg max-h-[280px] overflow-y-auto p-1.5 animate-in fade-in-50 zoom-in-95 duration-100 select-none ${panelClassName}`}
            >
              {options.length === 0 ? (
                <DropdownEmpty />
              ) : groupedOptions ? (
                Object.entries(groupedOptions).map(([grp, items]) => (
                  <div key={grp} className="mb-1.5 last:mb-0">
                    <div className="px-3 py-1 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                      {grp}
                    </div>
                    {items.map((opt) => (
                      <DropdownOptionItem
                        key={String(opt.value)}
                        option={opt}
                        size={size}
                        isSelected={selectedOption ? String(opt.value) === String(selectedOption.value) : false}
                        isFocused={
                          focusedIdx >= 0 &&
                          options[focusedIdx] &&
                          String(options[focusedIdx].value) === String(opt.value)
                        }
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                ))
              ) : (
                options.map((opt, idx) => (
                  <DropdownOptionItem
                    key={String(opt.value)}
                    option={opt}
                    size={size}
                    isSelected={selectedOption ? String(opt.value) === String(selectedOption.value) : false}
                    isFocused={focusedIdx === idx}
                    onSelect={handleSelect}
                  />
                ))
              )}
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
