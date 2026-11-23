"use client";

import React, { useState, useEffect } from "react";

/**
 * Global utility to format any zero, empty, null or undefined value as an empty string,
 * preventing sticky zeroes in inputs and allowing clean placeholders.
 */
export function cleanZero(val: number | string | undefined | null): string {
  if (val === 0 || val === "0" || val === "" || val === null || val === undefined) {
    return "";
  }
  return String(val);
}

/**
 * Global onChange handler for raw numeric inputs that allows completely clearing the field (empty string)
 * without immediately resetting to 0.
 */
export function handleNumericChange(
  e: React.ChangeEvent<HTMLInputElement>,
  onChange: (val: number | "") => void,
) {
  const val = e.target.value;
  if (val === "" || val === "-") {
    onChange("");
  } else {
    const num = parseFloat(val);
    onChange(isNaN(num) ? "" : num);
  }
}

export interface CleanNumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "prefix"> {
  value: number | string | undefined | null;
  onChange: (val: any) => void;
  placeholder?: string;
  suffix?: React.ReactNode;
  prefix?: React.ReactNode;
  containerClassName?: string;
  selectOnFocus?: boolean;
}

/**
 * Centralized, bulletproof CleanNumberInput component for discount, tax, price, qty, and currency inputs.
 * - Displays empty string with subtle placeholder when value is 0 (or empty).
 * - Never traps the user with a permanent or sticky '0'.
 * - Backspacing completely clears the field.
 * - Auto-selects content on focus so typing immediately replaces existing values.
 */
export const CleanNumberInput = React.forwardRef<HTMLInputElement, CleanNumberInputProps>(
  (
    {
      value,
      onChange,
      placeholder = "0",
      suffix,
      prefix,
      containerClassName = "",
      className = "",
      selectOnFocus = true,
      onFocus,
      onBlur,
      type = "text",
      inputMode = "decimal",
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [localStr, setLocalStr] = useState<string>(() => cleanZero(value));

    // Synchronize external value only when the input is NOT actively being typed into
    useEffect(() => {
      if (!isFocused) {
        setLocalStr(cleanZero(value));
      }
    }, [value, isFocused]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      if (selectOnFocus && e.target.value) {
        e.target.select();
      }
      onFocus?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      // Allow only numbers and at most one decimal point (or empty)
      if (raw !== "" && !/^-?\d*\.?\d*$/.test(raw)) {
        return;
      }
      setLocalStr(raw);

      if (raw === "" || raw === "-") {
        onChange("");
      } else {
        const num = parseFloat(raw);
        onChange(isNaN(num) ? "" : num);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      if (localStr === "" || localStr === "0" || localStr === "-") {
        setLocalStr("");
        onChange(0);
      } else {
        const num = parseFloat(localStr);
        if (!isNaN(num)) {
          setLocalStr(String(num));
          onChange(num);
        }
      }
      onBlur?.(e);
    };

    const inputElement = (
      <input
        ref={ref}
        type={type}
        inputMode={inputMode}
        value={localStr}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={className}
        {...props}
      />
    );

    if (prefix || suffix || containerClassName) {
      return (
        <div className={`relative flex items-center ${containerClassName}`}>
          {prefix && <span className="shrink-0">{prefix}</span>}
          {inputElement}
          {suffix && <span className="shrink-0">{suffix}</span>}
        </div>
      );
    }

    return inputElement;
  },
);

CleanNumberInput.displayName = "CleanNumberInput";
