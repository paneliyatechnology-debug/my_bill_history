"use client";

import React, { useState } from "react";
import Image from "next/image";
import { BrandLogo } from "./brand-logo";

export interface WorkspaceErrorStateProps {
  errorMessage?: string | null;
  onRetry?: () => Promise<void> | void;
  onLogout?: () => void;
  lang?: "en" | "gu";
  onToggleLang?: (lang: "en" | "gu") => void;
  title?: string;
  description?: string;
}

export function WorkspaceErrorState({
  errorMessage = "Internal Server Error",
  onRetry,
  onLogout,
  lang = "en",
  onToggleLang,
  title,
  description,
}: WorkspaceErrorStateProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [copied, setCopied] = useState(false);
  const isGu = lang === "gu";

  const handleRetry = async () => {
    if (!onRetry || isRetrying) return;
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      // Small delay so user sees tactile feedback even on quick responses
      setTimeout(() => setIsRetrying(false), 600);
    }
  };

  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  const handleCopyDiagnostics = () => {
    const details = [
      `App: MyOwnBillBook ERP`,
      `Time: ${new Date().toISOString()}`,
      `Error: ${errorMessage || "Internal Server Error"}`,
      `Language: ${lang}`,
      `URL: ${typeof window !== "undefined" ? window.location.href : "unknown"}`,
      `User Agent: ${typeof navigator !== "undefined" ? navigator.userAgent : "unknown"}`,
    ].join("\n");

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(details);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      className="min-h-[100dvh] w-full relative flex flex-col items-center justify-between p-4 sm:p-6 overflow-x-hidden selection:bg-[#26A58A]/20"
      style={{
        backgroundColor: "#F8FAFC",
        fontFamily: isGu
          ? "var(--font-noto-gujarati), var(--font-inter), sans-serif"
          : "var(--font-inter), sans-serif",
      }}
    >
      {/* Ambient background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Soft radial glow orbs */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[650px] h-[400px] bg-gradient-to-b from-[#26A58A]/10 via-[#174B43]/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-28 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-20 w-[450px] h-[350px] bg-emerald-600/5 rounded-full blur-3xl" />

        {/* Subtle grid pattern overlay */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.035]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="error-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#0F172A" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#error-grid)" />
        </svg>
      </div>

      {/* Top Navigation & Status Bar */}
      <header className="relative z-10 w-full max-w-4xl mx-auto flex items-center justify-between py-3 px-2 sm:px-4">
        <BrandLogo size="md" />

        <div className="flex items-center gap-3">
          {/* Pulsing Server Status Pill */}
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/70 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span>{isGu ? "સર્વર કનેક્શન સ્થગિત" : "Connection Paused"}</span>
          </div>

          {/* Optional Language Switcher */}
          {onToggleLang && (
            <button
              type="button"
              onClick={() => onToggleLang(isGu ? "en" : "gu")}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              {isGu ? "English" : "ગુજરાતી"}
            </button>
          )}
        </div>
      </header>

      {/* Center Main Elevated Card */}
      <main className="relative z-10 my-auto py-6 sm:py-8 w-full max-w-lg mx-auto flex flex-col items-center">
        <div className="w-full bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl sm:rounded-3xl shadow-[0_20px_50px_-15px_rgba(15,23,42,0.08),0_0_1px_1px_rgba(15,23,42,0.02)] p-6 sm:p-9 text-center transition-all">
          {/* Modern Visual Hero Icon */}
          <div className="relative mx-auto mb-5 w-20 h-20 flex items-center justify-center">
            {/* Pulsing ambient halo */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-amber-400/20 to-orange-400/20 animate-pulse blur-md" />
            
            {/* Outer box */}
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-b from-[#FFFDF9] to-[#FEF3C7]/60 border border-amber-200 flex items-center justify-center shadow-inner">
              {/* Animated disconnect / alert SVG vector */}
              <svg
                className="w-10 h-10 text-amber-600 drop-shadow-xs"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* Server/Cloud outline with alert */}
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                <line x1="6" y1="6" x2="6.01" y2="6" strokeWidth="2.5" />
                <line x1="6" y1="18" x2="6.01" y2="18" strokeWidth="2.5" />
                <path
                  d="M14 6l4 0"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="opacity-40"
                />
                <circle cx="16" cy="18" r="2.5" fill="#DC2626" stroke="#DC2626" />
                <path d="M16 17v1.5" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
              </svg>

              {/* Little status badge overlay */}
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center text-white shadow-xs">
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Headline Title */}
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {title || (isGu ? "વર્કસ્પેસ લોડ કરવામાં સમસ્યા" : "Unable to Load Workspace")}
          </h1>

          {/* Helpful Subtitle */}
          <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-sm mx-auto leading-relaxed">
            {description ||
              (isGu
                ? "બિલિંગ સર્વર સાથે જોડાણ સ્થાપિત થઈ શક્યું નથી. આપનો બિઝનેસ ડેટા સુરક્ષિત છે."
                : "We couldn't connect to your billing workspace. Your business data remains safe and protected.")}
          </p>

          {/* Error Details Highlight Pill */}
          {errorMessage && (
            <div className="mt-4 inline-flex items-center gap-2 max-w-full px-3.5 py-1.5 rounded-lg bg-rose-50/80 border border-rose-200/80 text-rose-700 text-xs font-mono font-medium truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span className="truncate">{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5 w-full">
            {/* Primary Retry Button */}
            {onRetry && (
              <button
                type="button"
                onClick={handleRetry}
                disabled={isRetrying}
                className="w-full sm:w-auto min-w-[150px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-[#174B43] to-[#26A58A] hover:from-[#133E37] hover:to-[#208E76] active:scale-[0.98] transition-all shadow-md shadow-emerald-950/15 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {/* Spinning icon during retry */}
                <svg
                  className={`w-4 h-4 shrink-0 ${isRetrying ? "animate-spin" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                </svg>
                <span>
                  {isRetrying
                    ? isGu
                      ? "જોડાઈ રહ્યું છે..."
                      : "Connecting..."
                    : isGu
                    ? "પુનઃ પ્રયાસ કરો (Retry)"
                    : "Retry Connection"}
                </span>
              </button>
            )}

            {/* Return to Login */}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 transition-all cursor-pointer shadow-2xs"
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
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>{isGu ? "લોગિન પર પાછા જાઓ" : "Return to Login"}</span>
              </button>
            )}

            {/* Reload Page Button */}
            <button
              type="button"
              onClick={handleReload}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-medium text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100/70 transition-colors cursor-pointer"
              title={isGu ? "પેજ રીલોડ કરો" : "Reload current page"}
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{isGu ? "રીલોડ" : "Reload"}</span>
            </button>
          </div>

          {/* Technical Diagnostics Collapsible Drawer */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowDiagnostics((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors font-medium group cursor-pointer"
            >
              <svg
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  showDiagnostics ? "rotate-90" : ""
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span>
                {showDiagnostics
                  ? isGu
                    ? "તકનીકી વિગતો છુપાવો"
                    : "Hide Technical Diagnostics"
                  : isGu
                  ? "તકનીકી વિગતો જુઓ (Diagnostics)"
                  : "View Technical Diagnostics"}
              </span>
            </button>

            {showDiagnostics && (
              <div className="mt-3 p-3.5 bg-slate-50/90 rounded-xl border border-slate-200/80 text-left text-xs text-slate-600 font-mono transition-all">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200/60">
                  <span className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">
                    Diagnostic Report
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyDiagnostics}
                    className="inline-flex items-center gap-1 text-[11px] font-sans font-medium text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <svg className="w-3 h-3 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>{isGu ? "કોપી થઈ ગયું!" : "Copied!"}</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        <span>{isGu ? "વિગતો કોપી કરો" : "Copy Details"}</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-1 text-[11px]">
                  <div>
                    <span className="text-slate-400">Status: </span>
                    <span className="text-rose-600 font-semibold">{errorMessage || "500 Internal Server Error"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Timestamp: </span>
                    <span>{new Date().toLocaleTimeString()} ({Intl.DateTimeFormat().resolvedOptions().timeZone})</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Endpoint: </span>
                    <span className="text-slate-700">/tenants/companies</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Troubleshoot: </span>
                    <span className="text-slate-600">Ensure Billing_backend is started on port 3001 and connected to database.</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Help Tips Pills below card */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-slate-500 text-[11px]">
          <span className="inline-flex items-center gap-1">
            <svg className="w-3 h-3 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            {isGu ? "ડેટા સંપૂર્ણ સુરક્ષિત છે" : "Data 100% Encrypted & Safe"}
          </span>
          <span className="text-slate-300">•</span>
          <span>
            {isGu ? "ઓટોમેટિક પુનઃ કનેક્ટ સપોર્ટ" : "Auto-reconnect support"}
          </span>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="relative z-10 w-full max-w-4xl mx-auto py-3 text-center">
        <p className="text-[11px] text-slate-400">
          MyOwnBillBook Cloud Accounting • Paneliya Technology
        </p>
      </footer>
    </div>
  );
}
