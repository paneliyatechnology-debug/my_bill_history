"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function CopyCodeContent() {
  const searchParams = useSearchParams();
  const code = (searchParams.get("code") || "").replace(/\D/g, "").slice(0, 6);
  const mode = searchParams.get("mode") || "signup";
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = async () => {
    if (code.length !== 6) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setError(null);
    } catch {
      setCopied(false);
      setError("Copy was blocked by the browser. Select the code and copy it manually.");
    }
  };

  const nextHref =
    mode === "forgot"
      ? `/login?mode=forgot&otp=${code}`
      : `/login?mode=signup&otp=${code}`;

  return (
    <div className="min-h-[100dvh] bg-[#F8F9FB] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-[#1E589D] px-6 py-5">
          <p className="text-2xl font-black tracking-tight">
            <span className="text-white">myown</span>
            <span className="text-[#FFB067]">billbook</span>
          </p>
        </div>
        <div className="h-1 bg-[#EA580C]" />
        <div className="p-6 space-y-4">
          <h1 className="text-xl font-black text-slate-900">Copy verification code</h1>
          <p className="text-sm text-slate-600">કોડ કોપી કરો, પછી નોંધણી અથવા પાસવર્ડ સ્ક્રીન પર પેસ્ટ કરો.</p>
          <p className="font-mono text-3xl font-black tracking-[0.35em] text-[#C2410C] bg-[#FFF7ED] border border-dashed border-[#FDBA74] rounded-xl px-4 py-3 text-center">
            {code || "------"}
          </p>
          <button
            type="button"
            onClick={copy}
            disabled={code.length !== 6}
            className="w-full py-3 rounded-xl text-sm font-black text-white bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-50"
          >
            {copied ? "Copied" : "Copy code"}
          </button>
          {error && <p className="text-xs font-semibold text-rose-700">{error}</p>}
          {copied && <p className="text-xs font-semibold text-emerald-700">Code copied to the clipboard.</p>}
          <Link href={nextHref} className="block text-center text-xs font-bold text-[#1E589D] hover:underline">
            Continue in myownbillbook
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CopyCodePage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-[#F8F9FB]" />}>
      <CopyCodeContent />
    </Suspense>
  );
}
