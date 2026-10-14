"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/auth-context";
import { apiClient } from "../../lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const { login, lang, setLang } = useAuth();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res: any = await apiClient.post("/auth/login", {
        identifier: phone,
        password,
      });

      if (res && res.accessToken) {
        await login({
          accessToken: res.accessToken,
          user: res.user,
          defaultContext: res.defaultContext,
        });
        router.push("/");
      } else {
        setError("Invalid response from authentication server.");
      }
    } catch (err: any) {
      setError(
        lang === "gu" && err.messageGujarati
          ? err.messageGujarati
          : err.message || "Login failed. Please check your credentials.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoCredentials = () => {
    setPhone("9898990001");
    setPassword("Password123#");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <img
            src="/logo.png"
            alt="MyBill History"
            className="h-16 w-auto object-contain mx-auto"
          />
          <p className="text-xs text-slate-500 font-medium">
            {lang === "gu"
              ? "ભારતીય જીએસટી વેપાર અને નામું પ્લેટફોર્મ"
              : "Indian GST Compliant Billing & Double-Entry Accounting"}
          </p>
        </div>

        {/* Language switcher */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setLang(lang === "en" ? "gu" : "en")}
            className="text-xs text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-md font-medium transition-colors"
          >
            {lang === "en" ? "ગુજરાતી માં જુઓ" : "View in English"}
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium flex items-center gap-2">
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1 tracking-wider">
              {lang === "gu" ? "મોબાઇલ નંબર" : "Mobile Phone"}
            </label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+919876543210"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF9933] focus:bg-white text-slate-900 transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1 tracking-wider">
              {lang === "gu" ? "પાસવર્ડ" : "Password"}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF9933] focus:bg-white text-slate-900 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-[#FF9933] hover:bg-[#E67E17] disabled:bg-amber-200 text-slate-950 font-bold text-sm rounded-lg shadow-md transition-all duration-200 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            ) : null}
            <span>
              {lang === "gu"
                ? isLoading
                  ? "ચકાસણી ચાલુ છે..."
                  : "પ્રવેશ કરો (Sign In)"
                : isLoading
                  ? "Authenticating..."
                  : "Sign In"}
            </span>
          </button>
        </form>

        {/* Demo credentials helper (development only) */}
        {(process.env.NODE_ENV !== "production" ||
          process.env.NEXT_PUBLIC_ENABLE_DEMO_CREDENTIALS === "true") && (
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleDemoCredentials}
              className="text-xs text-slate-600 hover:text-amber-700 hover:underline font-medium"
            >
              {lang === "gu"
                ? "ડેમો વિગતો ભરો (Demo User)"
                : "Fill Demo Credentials"}
            </button>
            <span className="text-[10px] text-slate-400 font-mono">
              Tenant Secured
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
