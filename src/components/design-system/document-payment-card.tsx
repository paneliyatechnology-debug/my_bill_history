"use client";

import React from "react";
import { formatInr } from "./tokens";

export interface DocumentPaymentCardProps {
  amountReceived: number;
  onAmountReceivedChange: (val: number) => void;
  paymentMode: string;
  onPaymentModeChange: (val: string) => void;
  isFullyPaid: boolean;
  onIsFullyPaidChange: (val: boolean) => void;
  balanceAmount: number;
  grandTotal: number;
  onOpenSplitPayment?: () => void;
  isPurchase?: boolean;
  lang?: "en" | "gu";
}

export function DocumentPaymentCard({
  amountReceived,
  onAmountReceivedChange,
  paymentMode,
  onPaymentModeChange,
  isFullyPaid,
  onIsFullyPaidChange,
  balanceAmount,
  grandTotal,
  onOpenSplitPayment,
  isPurchase = false,
  lang = "en",
}: DocumentPaymentCardProps) {
  const isSettled = balanceAmount <= 0.01;

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8E5] p-5 shadow-xs space-y-3.5">
      <div className="flex items-center justify-between border-b border-[#E2E8E5] pb-2.5">
        <span className="text-xs font-semibold text-[#1A2E2B] uppercase tracking-wider">
          {isPurchase
            ? (lang === "gu" ? "ચુકવણી નિકાલ (Payment Settlement)" : "Payment Settlement")
            : (lang === "gu" ? "રકમ પ્રાપ્તિ (Payment Received)" : "Payment Settlement")}
        </span>
        <span className="text-xs tabular-nums font-bold text-slate-900">
          {isPurchase ? "Paid: " : "Recv: "}{formatInr(isFullyPaid ? grandTotal : amountReceived)}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
        <div className="sm:col-span-7 flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
          <span className="text-slate-400 font-bold text-xs">₹</span>
          <input
            type="number"
            value={isFullyPaid ? grandTotal : amountReceived}
            disabled={isFullyPaid}
            onChange={(e) => onAmountReceivedChange(Number(e.target.value) || 0)}
            placeholder="0.00"
            className="w-full text-[13px] bg-transparent tabular-nums font-normal text-slate-900 focus:outline-none disabled:text-slate-500 h-10"
          />
        </div>

        <div className="sm:col-span-5">
          <select
            value={paymentMode}
            onChange={(e) => onPaymentModeChange(e.target.value)}
            className="w-full text-[13px] p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-normal text-slate-800 focus:outline-none focus:border-[#1677E8] h-10"
          >
            <option value="CASH">{lang === "gu" ? "રોકડ (Cash)" : "Cash"}</option>
            <option value="BANK_TRANSFER">{lang === "gu" ? "બેંક ટ્રાન્સફર (Bank)" : "Bank Transfer"}</option>
            <option value="UPI_QR">{lang === "gu" ? "યુપીઆઈ (UPI)" : "UPI"}</option>
            <option value="CHEQUE">{lang === "gu" ? "ચેક (Cheque)" : "Cheque"}</option>
            <option value="UNPAID_CREDIT">{lang === "gu" ? "શાખ (Credit / Unpaid)" : "Credit (Unpaid)"}</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs pt-1">
        <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
          <input
            type="checkbox"
            checked={isFullyPaid}
            onChange={(e) => {
              onIsFullyPaidChange(e.target.checked);
              if (e.target.checked) {
                onAmountReceivedChange(grandTotal);
              }
            }}
            className="rounded text-[#0F172A] focus:ring-[#1677E8]"
          />
          <span>{isPurchase ? "Mark as fully paid" : "Mark as fully paid"}</span>
        </label>

        {onOpenSplitPayment && (
          <button
            type="button"
            onClick={onOpenSplitPayment}
            className="text-[#0F172A] hover:text-[#1677E8] font-bold underline cursor-pointer text-xs"
          >
            + Split Payment
          </button>
        )}
      </div>

      {/* Balance Indicator Banner */}
      <div
        className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
          isSettled
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-amber-50 border-amber-200 text-amber-900"
        }`}
      >
        <span className="text-xs font-bold flex items-center gap-1.5">
          {isSettled ? (
            <>
              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>{lang === "gu" ? "સંપૂર્ણ ચૂકતે થયેલ" : "Fully Settled"}</span>
            </>
          ) : (
            <>
              <span className="text-amber-600">⏳</span>
              <span>{lang === "gu" ? "બાકી રકમ" : "Balance Due"}</span>
            </>
          )}
        </span>
        <span className="text-sm font-semibold tabular-nums">
          {formatInr(balanceAmount)}
        </span>
      </div>
    </div>
  );
}
