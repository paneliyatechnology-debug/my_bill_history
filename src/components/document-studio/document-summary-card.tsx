"use client";

import React from "react";
import { DocumentSummaryCardProps, DocumentPaymentCardProps } from "./types";

export function DocumentSummaryCard({
  title = "Document Summary",
  subtotal,
  discount,
  cgst,
  sgst,
  igst,
  roundOff,
  grandTotal,
  amountInWords,
  customRows = [],
}: DocumentSummaryCardProps) {
  const formatCur = (val: string | number | undefined) => {
    if (val === undefined || val === null || val === "") return "₹ 0.00";
    const num = typeof val === "number" ? val : parseFloat(val);
    if (isNaN(num)) return `₹ ${val}`;
    return `₹ ${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header matching Reference Image */}
      <div className="p-4 sm:px-5 sm:py-3.5 border-b border-slate-200/80 bg-[#FAFBF7] flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-[#E6F7F2] text-[#174B43] flex items-center justify-center shadow-2xs">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-xs sm:text-sm font-extrabold text-[#1A2E2B] tracking-tight">
          {title}
        </h3>
      </div>

      {/* Rows */}
      <div className="p-4 sm:p-5 space-y-2.5 text-xs">
        {/* Items Subtotal */}
        <div className="flex items-center justify-between text-slate-600 font-medium">
          <span>Items Subtotal</span>
          <span className="font-mono font-bold text-slate-800">{formatCur(subtotal)}</span>
        </div>

        {/* Discount */}
        {discount !== undefined && discount !== null && Number(discount) !== 0 && (
          <div className="flex items-center justify-between text-slate-600 font-medium">
            <span>Discount</span>
            <span className="font-mono font-bold text-rose-600">
              - {formatCur(discount)}
            </span>
          </div>
        )}

        {/* Taxes */}
        {cgst !== undefined && cgst !== null && Number(cgst) > 0 && (
          <div className="flex items-center justify-between text-slate-600 font-medium">
            <span>CGST</span>
            <span className="font-mono font-bold text-slate-800">{formatCur(cgst)}</span>
          </div>
        )}
        {sgst !== undefined && sgst !== null && Number(sgst) > 0 && (
          <div className="flex items-center justify-between text-slate-600 font-medium">
            <span>SGST</span>
            <span className="font-mono font-bold text-slate-800">{formatCur(sgst)}</span>
          </div>
        )}
        {igst !== undefined && igst !== null && Number(igst) > 0 && (
          <div className="flex items-center justify-between text-slate-600 font-medium">
            <span>IGST</span>
            <span className="font-mono font-bold text-slate-800">{formatCur(igst)}</span>
          </div>
        )}

        {/* Custom Rows */}
        {customRows.map((row, idx) => (
          <div key={idx} className={`flex items-center justify-between text-slate-600 font-medium ${row.className || ""}`}>
            <span>{row.label}</span>
            <span className={`font-mono font-bold ${row.isDeduction ? "text-rose-600" : "text-slate-800"}`}>
              {row.isDeduction ? "- " : ""}{typeof row.value === "number" ? formatCur(row.value) : row.value}
            </span>
          </div>
        ))}

        {/* Round Off */}
        {roundOff !== undefined && roundOff !== null && (
          <div className="flex items-center justify-between text-slate-500 font-medium pt-1 border-t border-slate-100">
            <span>Round Off</span>
            <span className="font-mono font-semibold text-slate-700">
              {Number(roundOff) >= 0 ? `+ ${formatCur(roundOff)}` : `- ${formatCur(Math.abs(Number(roundOff)))}`}
            </span>
          </div>
        )}

        {/* Grand Total */}
        <div className="pt-2 border-t-2 border-slate-100 flex items-baseline justify-between">
          <span className="text-sm font-black text-[#1A2E2B]">Grand Total</span>
          <span className="text-lg sm:text-xl font-black font-mono text-[#174B43]">
            {formatCur(grandTotal)}
          </span>
        </div>

        {/* Amount in words banner */}
        {amountInWords && (
          <div className="mt-3 p-2.5 bg-[#F2FAF7] border border-[#85D5C2]/40 rounded-xl text-center">
            <span className="text-[11px] font-bold text-[#174B43] tracking-wide block capitalize">
              {amountInWords}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function DocumentPaymentCard({
  amountReceived,
  onAmountReceivedChange,
  paymentMode,
  onPaymentModeChange,
  balanceDue,
  onPaidInFull,
}: DocumentPaymentCardProps) {
  const formatCur = (val: string | number | undefined) => {
    if (val === undefined || val === null || val === "") return "₹ 0.00";
    const num = typeof val === "number" ? val : parseFloat(val);
    if (isNaN(num)) return `₹ ${val}`;
    return `₹ ${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const isFullyPaid = Number(balanceDue) <= 0.01;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:px-5 sm:py-3.5 border-b border-slate-200/80 bg-[#FAFBF7] flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-[#E6F7F2] text-[#174B43] flex items-center justify-center shadow-2xs">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <h3 className="text-xs sm:text-sm font-extrabold text-[#1A2E2B] tracking-tight">
          Payment Details
        </h3>
      </div>

      <div className="p-4 sm:p-5 space-y-3.5 text-xs">
        {/* Amount Received Input + Paid in Full button */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-700 block">Amount Received</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
              <input
                type="number"
                min="0"
                step="any"
                value={amountReceived}
                onChange={(e) => onAmountReceivedChange(e.target.value === "" ? "" : parseFloat(e.target.value))}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-800 focus:outline-none focus:border-[#26A58A] shadow-2xs"
              />
            </div>
            {onPaidInFull && (
              <button
                type="button"
                onClick={onPaidInFull}
                className="px-3 py-2 bg-[#174B43] hover:bg-[#123B35] text-white rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <span>Paid In Full</span>
                <span className="text-emerald-300">✓</span>
              </button>
            )}
          </div>
        </div>

        {/* Payment Mode Selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-700 block">Payment Mode</label>
          <div className="relative">
            <select
              value={paymentMode}
              onChange={(e) => onPaymentModeChange(e.target.value)}
              className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#26A58A] shadow-2xs appearance-none pr-8 cursor-pointer"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer / NEFT</option>
              <option value="Cheque">Cheque</option>
              <option value="Credit">Credit / Due</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Balance Due Pill matching Reference Image */}
        <div className="pt-1">
          <div
            className={`p-2.5 rounded-xl border text-center font-bold text-xs flex items-center justify-center gap-2 ${
              isFullyPaid
                ? "bg-[#E6F7F2] border-[#85D5C2]/60 text-[#174B43]"
                : "bg-amber-50 border-amber-200 text-amber-800"
            }`}
          >
            <span>{isFullyPaid ? "✓" : "!"}</span>
            <span>Balance Due: {formatCur(balanceDue)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
