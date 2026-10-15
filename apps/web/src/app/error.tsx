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

  useEffect(() => {
    console.error("[MyBill Page Error Caught]:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#FFF3E8] border border-[#FED7AA] flex items-center justify-center text-[#F47721] font-bold text-3xl mb-4 shadow-sm">
        ⚠️
      </div>

      <h1 className="text-xl sm:text-2xl font-bold text-[#202124] tracking-tight">
        {lang === "gu" ? "આ પેજ લોડ કરવામાં સમસ્યા આવી" : "Something went wrong on this page"}
      </h1>

      <p className="text-xs sm:text-sm text-[#667085] mt-1.5 max-w-md">
        {lang === "gu"
          ? "એક અણધારી ભૂલ આવી છે. કૃપા કરીને પુનઃ પ્રયાસ કરો અથવા મુખ્ય ડેશબોર્ડ પર પાછા ફરો."
          : "An unexpected error occurred while processing this page. You can try refreshing the page or return to the dashboard."}
      </p>

      {error?.message && (
        <div className="mt-4 max-w-md w-full">
          <button
            type="button"
            onClick={() => setShowTechnicalDetails((prev) => !prev)}
            className="text-[11px] text-[#98A2B3] hover:text-[#667085] underline font-mono"
          >
            {showTechnicalDetails ? "Hide technical diagnostic details" : "Show technical diagnostic details"}
          </button>
          {showTechnicalDetails && (
            <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs font-mono text-rose-600 break-words max-h-36 overflow-y-auto">
              <p className="font-bold">Error:</p>
              <p>{error.message}</p>
              {error.digest && <p className="text-[10px] text-slate-400 mt-1">Digest: {error.digest}</p>}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
        <button
          onClick={() => reset()}
          className="py-2.5 px-5 bg-[#F47721] hover:bg-[#D95F12] active:bg-[#B94B0A] text-white rounded-xl text-xs font-bold transition-all shadow-saffron"
        >
          {lang === "gu" ? "ફરીથી પ્રયાસ કરો (Retry)" : "Try Again"}
        </button>

        <Link
          href="/"
          className="py-2.5 px-5 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-[#344054] rounded-xl text-xs font-semibold transition-all shadow-subtle"
        >
          {lang === "gu" ? "મુખ્ય ડેશબોર્ડ (Dashboard)" : "Go to Dashboard"}
        </Link>
      </div>
    </div>
  );
}
