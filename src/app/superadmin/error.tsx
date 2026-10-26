"use client";

import React, { useEffect } from "react";
import Link from "next/link";

export default function SuperAdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[SuperAdmin Console Error]:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-bold text-3xl mb-4 shadow-sm">
        🛡️
      </div>

      <h1 className="text-2xl font-bold text-[#202124] tracking-tight">
        SuperAdmin Operation Error
      </h1>

      <p className="text-xs text-[#667085] mt-1.5 max-w-md">
        An error occurred while executing an administrative operations view. You can retry the operation or return to the business dashboard.
      </p>

      {error?.message && (
        <div className="mt-4 p-3 bg-white border border-[#E5E7EB] rounded-xl text-left text-xs font-mono text-rose-600 max-w-md w-full break-words">
          {error.message}
        </div>
      )}

      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={() => reset()}
          className="py-2.5 px-5 bg-[#F47721] hover:bg-[#D95F12] text-white rounded-xl text-xs font-bold transition-all shadow-saffron"
        >
          Retry Operation
        </button>

        <Link
          href="/"
          className="py-2.5 px-5 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-[#344054] rounded-xl text-xs font-semibold transition-all"
        >
          ← Business Dashboard
        </Link>
      </div>
    </div>
  );
}
