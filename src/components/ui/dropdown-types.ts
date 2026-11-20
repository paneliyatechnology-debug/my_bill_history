import React from "react";

export interface DropdownOption<T = string> {
  value: T;
  label: string;
  sublabel?: string;
  secondaryText?: string;
  code?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  group?: string;
  badge?: string | React.ReactNode;
  color?: string;
  /** Custom data attachment */
  data?: any;
}

export interface DropdownGroup<T = string> {
  label: string;
  options: DropdownOption<T>[];
}

export type DropdownSize = "sm" | "md" | "lg";

export interface BaseDropdownProps<T = string> {
  name?: string;
  id?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  error?: string | boolean;
  size?: DropdownSize;
  className?: string;
  panelClassName?: string;
  triggerClassName?: string;
  clearable?: boolean;
  ariaLabel?: string;
  fullWidth?: boolean;
}
