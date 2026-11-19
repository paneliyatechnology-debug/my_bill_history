"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, Copy } from "lucide-react";

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
    <div className="min-h-[100dvh] bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
        <div className="bg-[#0F172A] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[#2563EB] text-white font-bold text-sm flex items-center justify-center">
              M
            </div>
            <p className="text-lg font-bold tracking-tight text-white">
              myown<span className="text-[#38BDF8]">billbook</span>
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400">Security Verification</span>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Verification Code</h1>
            <p className="text-xs text-slate-500 mt-1">
              Copy your verification code and enter it on the verification screen to continue.
            </p>
          </div>
          <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg p-4 text-center">
            <p className="tabular-nums font-mono text-3xl font-bold tracking-[0.35em] text-slate-900 select-all cursor-text">
              {code || "------"}
            </p>
            <p className="text-[11px] text-slate-500 mt-2">Click or double-click to select</p>
          </div>
          <button
            type="button"
            onClick={copy}
            disabled={code.length !== 6}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Copied to Clipboard</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Code</span>
              </>
            )}
          </button>
          {error && <p className="text-xs font-semibold text-rose-600 text-center">{error}</p>}
          {copied && <p className="text-xs font-semibold text-emerald-600 text-center">Verification code copied successfully.</p>}
          <div className="pt-2 text-center">
            <Link href={nextHref} className="text-xs font-semibold text-[#2563EB] hover:underline">
              Continue to Login & Verify →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CopyCodePage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-[#F8FAFC]" />}>
      <CopyCodeContent />
    </Suspense>
  );
}
