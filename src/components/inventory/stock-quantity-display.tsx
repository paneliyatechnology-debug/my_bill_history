"use client";

import React from "react";
import { AlertTriangle, AlertCircle } from "lucide-react";

export interface StockQuantityDisplayProps {
  /** The actual ledger/database stock quantity (e.g. -142, 0, 500) */
  quantity: number | string | null | undefined;
  /** Unit of measurement symbol (e.g. "BOX", "PCS", "KG") */
  uom?: string;
  /** Unit alias for uom */
  unit?: string;
  /** Display size variant */
  size?: "sm" | "md" | "lg" | string;
  /** Minimum stock threshold for low-stock warning */
  minStockLevel?: number | string | null;
  /** Whether this is a service item (no physical stock) */
  isService?: boolean;
  /** Visual display layout: "inline" | "stacked" | "compact" */
  layout?: "inline" | "stacked" | "compact";
  /** Gujarati language toggle */
  lang?: "en" | "gu";
  /** Custom className */
  className?: string;
}

export function StockQuantityDisplay({
  quantity,
  uom,
  unit: propUnit,
  size,
  minStockLevel,
  isService = false,
  layout = "inline",
  lang = "en",
  className = "",
}: StockQuantityDisplayProps) {
  if (isService) {
    return <span className="text-slate-400 tabular-nums text-xs">—</span>;
  }

  const rawQty = Number(quantity || 0);
  const minQty = Number(minStockLevel || 0);
  const unit = (uom || propUnit || "PCS").toUpperCase();

  // Negative stock handling: Never present negative quantity as normal available stock
  const isNegative = rawQty < 0;
  const isZero = rawQty === 0;
  const isLowStock = !isNegative && !isZero && minQty > 0 && rawQty <= minQty;

  // Available stock shown to users is capped at 0 when negative
  const displayQty = isNegative ? 0 : rawQty;

  const tooltipText = isNegative
    ? lang === "gu"
      ? `સ્ટોક વિસંગતતા: ચોપડે નોંધાયેલ જથ્થો ${rawQty} ${unit} છે. ઉપલબ્ધ સ્ટોક 0 દર્શાવેલ છે. સ્ટોક સુધારણા જરૂરી છે.`
      : `Stock Discrepancy: Physical ledger records ${rawQty} ${unit}. Available stock is capped at 0. Stock adjustment required.`
    : isLowStock
    ? lang === "gu"
      ? `ઓછો સ્ટોક: લઘુત્તમ મર્યાદા ${minQty} ${unit}`
      : `Low Stock: Minimum threshold is ${minQty} ${unit}`
    : undefined;

  return (
    <div
      className={`inline-flex ${
        layout === "stacked" ? "flex-col items-start gap-1" : "items-center flex-wrap gap-1.5"
      } ${className}`}
      title={tooltipText}
    >
      {/* Main Stock Quantity Display */}
      <span
        className={`tabular-nums text-xs sm:text-[13px] ${
          isNegative
            ? "font-semibold text-rose-700"
            : isLowStock
            ? "font-semibold text-amber-600"
            : isZero
            ? "font-medium text-slate-500"
            : "font-medium text-slate-900"
        }`}
      >
        {displayQty.toLocaleString("en-IN")} {unit}
      </span>

      {/* Discrepancy Indicator: Visible when stock is negative in the ledger */}
      {isNegative && (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200/80 cursor-help"
          title={tooltipText}
        >
          <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" strokeWidth={2} />
          <span>
            {lang === "gu" ? "વિસંગતતા" : "Discrepancy"}{" "}
            <span className="tabular-nums font-mono text-[10px]">({rawQty})</span>
          </span>
        </span>
      )}

      {/* Low Stock Warning Indicator */}
      {isLowStock && (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-300/80 animate-pulse"
          title={tooltipText}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          <span>{lang === "gu" ? "ઓછો સ્ટોક" : "Low Stock"}</span>
        </span>
      )}

      {/* Out of Stock (Zero) Badge if not negative */}
      {isZero && !isNegative && layout !== "compact" && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
          {lang === "gu" ? "ખાલી સ્ટોક" : "Out of Stock"}
        </span>
      )}
    </div>
  );
}
