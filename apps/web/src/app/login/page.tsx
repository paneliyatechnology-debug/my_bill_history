"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/auth-context";
import { apiClient } from "../../lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const { login, lang, setLang, isAuthenticated, isLoading: authLoading, user } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, redirect accordingly
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      if (user.role === "SUPER_ADMIN") {
        router.replace("/superadmin");
      } else {
        router.replace("/");
      }
    }
  }, [authLoading, isAuthenticated, user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res: any = await apiClient.post("/auth/login", {
        identifier: identifier.trim(),
        password,
      });

      if (res?.accessToken) {
        await login({
          accessToken: res.accessToken,
          user: res.user,
          defaultContext: res.defaultContext,
        });

        // Server-dictated role routing
        if (res.user?.role === "SUPER_ADMIN") {
          router.push("/superadmin");
        } else {
          router.push("/");
        }
      } else {
        setError(
          lang === "gu"
            ? "સર્વર તરફથી અમાન્ય પ્રતિસાદ મળ્યો."
            : "Invalid response from authentication server."
        );
      }
    } catch (err: any) {
      setError(
        lang === "gu" && err.messageGujarati
          ? err.messageGujarati
          : err.message || (lang === "gu" ? "લોગિન નિષ્ફળ ગયું. ઓળખપત્ર ચકાસો." : "Login failed. Please check your credentials.")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemoBusiness = () => {
    setIdentifier("9898990001");
    setPassword("Password123#");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Decorative background grid and warm saffron glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#E5E7EB_1px,transparent_1px)] [background-size:16px_16px] opacity-60 pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#F47721]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Language Switcher in top corner */}
      <div className="absolute top-5 right-5 z-10 flex items-center bg-white p-1 rounded-xl border border-[#E5E7EB] shadow-xs">
        <button
          type="button"
          onClick={() => setLang("en")}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
            lang === "en" ? "bg-[#FFF3E8] text-[#F47721]" : "text-[#667085] hover:text-[#202124]"
          }`}
        >
          English
        </button>
        <button
          type="button"
          onClick={() => setLang("gu")}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all font-gujarati ${
            lang === "gu" ? "bg-[#FFF3E8] text-[#F47721]" : "text-[#667085] hover:text-[#202124]"
          }`}
        >
          ગુજરાતી
        </button>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#E5E7EB] p-8 space-y-6 relative z-10 border-t-4 border-t-[#F47721]">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#F47721] to-[#FF9B50] flex items-center justify-center text-white font-bold text-3xl shadow-saffron mx-auto ring-4 ring-orange-50">
            ₹
          </div>
          <h1 className="text-2xl font-black text-[#202124] tracking-tight">
            MyBill History
          </h1>
          <p className="text-xs text-[#667085] font-medium max-w-xs mx-auto">
            {lang === "gu"
              ? "ભારતીય જીએસટી વેપાર અને દેશી નામા પ્લેટફોર્મ"
              : "Indian GST Billing, Inventory & Double-Entry Accounting"}
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2.5 animate-fadeIn">
            <span className="text-base">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#202124] uppercase mb-1.5 tracking-wider">
              {lang === "gu" ? "મોબાઇલ નંબર અથવા ઇમેઇલ *" : "Phone Number or Email *"}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-semibold text-[#98A2B3]">
                📱
              </span>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={lang === "gu" ? "98989 90001 અથવા email" : "98989 90001 or email@domain.com"}
                className="w-full pl-10 pr-3 py-2.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm font-medium text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#F47721] focus:border-transparent focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[#202124] uppercase tracking-wider">
                {lang === "gu" ? "પાસવર્ડ *" : "Password *"}
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] font-semibold text-[#667085] hover:text-[#202124]"
              >
                {showPassword ? (lang === "gu" ? "છુપાવો" : "Hide") : (lang === "gu" ? "બતાવો" : "Show")}
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-semibold text-[#98A2B3]">
                🔒
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-3 py-2.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm font-medium text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#F47721] focus:border-transparent focus:outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white shadow-md bg-[#F47721] hover:bg-[#D95F12] shadow-orange-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>{lang === "gu" ? "ચકાસી રહ્યું છે..." : "Signing in..."}</span>
              </>
            ) : (
              <span>{lang === "gu" ? "પ્રવેશ કરો (Sign In)" : "Sign In"}</span>
            )}
          </button>
        </form>

        {/* Demo Business Credentials Helper for Testing */}
        <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
          <button
            type="button"
            onClick={handleFillDemoBusiness}
            className="text-xs text-[#F47721] hover:text-[#D95F12] hover:underline font-bold"
          >
            {lang === "gu" ? "ડેમો વિગતો ભરો (Demo User)" : "Fill Demo Business User"}
          </button>
        </div>
      </div>
    </div>
  );
}
