"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../context/auth-context";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { lang } = useAuth();
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const isGu = lang === "gu";

  useEffect(() => {
    console.error("[MyBill Page Error Caught]:", error);
  }, [error]);

  const handleCopyDiagnostics = () => {
    const details = [
      `Error Message: ${error?.message || "Unknown"}`,
      `Digest: ${error?.digest || "N/A"}`,
      `Time: ${new Date().toISOString()}`,
    ].join("\n");
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(details);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-[75vh] w-full flex flex-col items-center justify-center p-4 sm:p-8 text-center select-none">
      <div className="max-w-lg w-full bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.08)] p-6 sm:p-9 text-center">
        {/* Modern Vector Icon with Ambient Glow */}
        <div className="relative mx-auto mb-5 w-18 h-18 sm:w-20 sm:h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-amber-400/20 to-orange-400/20 animate-pulse blur-md" />
          <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-amber-50/90 to-amber-100/60 border border-amber-200 flex items-center justify-center shadow-inner">
            <svg
              className="w-9 h-9 sm:w-10 sm:h-10 text-amber-600 drop-shadow-xs"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" />
              <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2.5" />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          {isGu ? "આ પેજ લોડ કરવામાં સમસ્યા આવી" : "Something went wrong on this page"}
        </h1>

        {/* Description */}
        <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-sm mx-auto leading-relaxed">
          {isGu
            ? "એક અણધારી ભૂલ આવી છે. કૃપા કરીને પુનઃ પ્રયાસ કરો અથવા મુખ્ય ડેશબોર્ડ પર પાછા ફરો."
            : "An unexpected error occurred while processing this page. You can try refreshing the page or return to the dashboard."}
        </p>

        {/* Technical Error Notice */}
        {error?.message && (
          <div className="mt-4 inline-flex items-center gap-2 max-w-full px-3.5 py-1.5 rounded-lg bg-rose-50/80 border border-rose-200/80 text-rose-700 text-xs font-mono font-medium truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            <span className="truncate">{error.message}</span>
          </div>
        )}

        {/* Diagnostic Accordion */}
        {error?.message && (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowTechnicalDetails((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors font-medium cursor-pointer"
            >
              <svg
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  showTechnicalDetails ? "rotate-90" : ""
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span>
                {showTechnicalDetails
                  ? isGu
                    ? "તકનીકી વિગતો છુપાવો"
                    : "Hide technical diagnostic details"
                  : isGu
                  ? "તકનીકી વિગતો જુઓ"
                  : "Show technical diagnostic details"}
              </span>
            </button>

            {showTechnicalDetails && (
              <div className="mt-3 p-3 bg-slate-50/90 rounded-xl border border-slate-200/80 text-left text-xs font-mono text-slate-700 break-words">
                <div className="flex items-center justify-between mb-1 pb-1 border-b border-slate-200/60">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Diagnostics</span>
                  <button
                    type="button"
                    onClick={handleCopyDiagnostics}
                    className="text-[11px] font-sans text-emerald-700 hover:underline cursor-pointer"
                  >
                    {copied ? (isGu ? "કોપી થઈ ગયું!" : "Copied!") : isGu ? "કોપી કરો" : "Copy"}
                  </button>
                </div>
                <p className="text-rose-600 font-semibold">{error.message}</p>
                {error.digest && (
                  <p className="text-[10px] text-slate-400 mt-1">Digest: {error.digest}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 mt-6 w-full">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto min-w-[140px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-[#174B43] to-[#26A58A] hover:from-[#133E37] hover:to-[#208E76] active:scale-[0.98] transition-all shadow-md shadow-emerald-950/15 cursor-pointer"
          >
            <svg
              className="w-4 h-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
            <span>{isGu ? "ફરીથી પ્રયાસ કરો (Retry)" : "Try Again"}</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 transition-all shadow-2xs"
          >
            <svg
              className="w-4 h-4 text-slate-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span>{isGu ? "મુખ્ય ડેશબોર્ડ (Dashboard)" : "Go to Dashboard"}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
