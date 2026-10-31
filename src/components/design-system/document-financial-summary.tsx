"use client";

import React from "react";
import { formatInr, numberToWordsINR } from "./tokens";

export interface TaxBreakdownRow {
  rate: number;
  taxable: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
}

export interface AdditionalChargeRow {
  id: string;
  name: string;
  amount: number;
}

export interface DocumentFinancialSummaryProps {
  subtotal: number;
  discountAmount?: number;
  discountPercent?: number;
  additionalCharges?: AdditionalChargeRow[];
  taxTotal?: number;
  cgstTotal?: number;
  sgstTotal?: number;
  igstTotal?: number;
  taxBreakdown?: TaxBreakdownRow[];
  autoRoundOff: boolean;
  onAutoRoundOffChange: (val: boolean) => void;
  roundOff: number;
  grandTotal: number;
  lang?: "en" | "gu";
  extraContent?: React.ReactNode;
}

export function DocumentFinancialSummary({
  subtotal,
  discountAmount = 0,
  additionalCharges = [],
  taxTotal = 0,
  cgstTotal,
  sgstTotal,
  igstTotal,
  taxBreakdown = [],
  autoRoundOff,
  onAutoRoundOffChange,
  roundOff,
  grandTotal,
  lang = "en",
  extraContent,
}: DocumentFinancialSummaryProps) {
  const totalAdditional = additionalCharges.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8E5] p-5 shadow-xs space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-[#E2E8E5] pb-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1A2E2B]">
          {lang === "gu" ? "નાણાકીય સારાંશ (Financial Summary)" : "Financial Summary"}
        </h3>
        <span className="text-[11px] font-semibold text-slate-500">
          GST Calculation Engine
        </span>
      </div>

      {/* Numerical Rows */}
      <div className="space-y-2 text-xs">
        {/* Subtotal */}
        <div className="flex justify-between items-center text-slate-700">
          <span>{lang === "gu" ? "કરપાત્ર રકમ (Taxable Amount)" : "Subtotal (Taxable)"}</span>
          <span className="font-mono font-bold text-slate-900">{formatInr(subtotal)}</span>
        </div>

        {/* Total Tax */}
        <div className="flex justify-between items-center text-slate-700">
          <span>{lang === "gu" ? "કુલ જીએસટી (Total GST)" : "Total Tax (GST)"}</span>
          <span className="font-mono font-bold text-[#174B43]">+{formatInr(taxTotal)}</span>
        </div>

        {/* CGST / SGST / IGST Details if provided */}
        {(cgstTotal !== undefined || sgstTotal !== undefined || igstTotal !== undefined) && (
          <div className="pl-3 py-1 border-l-2 border-[#26A58A]/30 space-y-1 text-[11px] text-slate-500">
            {cgstTotal !== undefined && cgstTotal > 0 && (
              <div className="flex justify-between items-center">
                <span>CGST</span>
                <span className="font-mono">{formatInr(cgstTotal)}</span>
              </div>
            )}
            {sgstTotal !== undefined && sgstTotal > 0 && (
              <div className="flex justify-between items-center">
                <span>SGST</span>
                <span className="font-mono">{formatInr(sgstTotal)}</span>
              </div>
            )}
            {igstTotal !== undefined && igstTotal > 0 && (
              <div className="flex justify-between items-center">
                <span>IGST (Inter-State)</span>
                <span className="font-mono">{formatInr(igstTotal)}</span>
              </div>
            )}
          </div>
        )}

        {/* Additional Charges */}
        {totalAdditional > 0 && (
          <div className="flex justify-between items-center text-slate-700">
            <span>{lang === "gu" ? "વધારાના ચાર્જ (Additional Charges)" : "Additional Charges"}</span>
            <span className="font-mono font-bold text-slate-900">+{formatInr(totalAdditional)}</span>
          </div>
        )}

        {/* Overall Discount */}
        {discountAmount > 0 && (
          <div className="flex justify-between items-center text-rose-600 font-medium">
            <span>{lang === "gu" ? "કુલ ડિસ્કાઉન્ટ (Discount)" : "Overall Discount"}</span>
            <span className="font-mono">-{formatInr(discountAmount)}</span>
          </div>
        )}

        {/* Auto Round Off */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 text-xs">
            <input
              type="checkbox"
              checked={autoRoundOff}
              onChange={(e) => onAutoRoundOffChange(e.target.checked)}
              className="rounded text-[#174B43] focus:ring-[#26A58A]"
            />
            <span>{lang === "gu" ? "ઓટો રાઉન્ડ ઑફ" : "Auto Round Off"}</span>
          </label>
          <span className="font-mono text-slate-600 text-xs">
            {roundOff >= 0 ? `+${roundOff.toFixed(2)}` : roundOff.toFixed(2)}
          </span>
        </div>
      </div>

      {extraContent}

      {/* Grand Total Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#174B43] to-[#1F5E54] text-white space-y-1.5 shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
            {lang === "gu" ? "કુલ ચૂકવવાપાત્ર રકમ" : "Grand Total"}
          </span>
          <span className="text-2xl font-black font-mono tracking-tight text-white">
            {formatInr(grandTotal)}
          </span>
        </div>
        <p className="text-[11px] text-emerald-100/90 italic truncate pt-1 border-t border-white/10">
          {numberToWordsINR(grandTotal, lang)}
        </p>
      </div>
    </div>
  );
}
