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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res: any = await apiClient.post("/auth/login", {
        phone,
        password,
      });

      if (res?.accessToken) {
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
          : err.message || "Login failed. Please check your credentials."
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
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col justify-center items-center p-4">
      {/* Language Switcher in top corner */}
      <div className="absolute top-4 right-4 flex items-center bg-white p-1 rounded-lg border border-[#E5E7EB] shadow-subtle">
        <button
          type="button"
          onClick={() => setLang("en")}
          className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
            lang === "en" ? "bg-[#FFF3E8] text-[#F47721]" : "text-[#667085]"
          }`}
        >
          English
        </button>
        <button
          type="button"
          onClick={() => setLang("gu")}
          className={`px-3 py-1 text-xs font-bold rounded-md transition-all font-gujarati ${
            lang === "gu" ? "bg-[#FFF3E8] text-[#F47721]" : "text-[#667085]"
          }`}
        >
          ગુજરાતી
        </button>
      </div>

      <div className="w-full max-w-md bg-white rounded-card shadow-card border border-[#E5E7EB] p-8 space-y-6 border-t-4 border-t-[#F47721]">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[#F47721] flex items-center justify-center text-white font-bold text-2xl shadow-saffron mx-auto">
            ₹
          </div>
          <h1 className="text-2xl font-bold text-[#202124] tracking-tight">
            MyBill History
          </h1>
          <p className="text-xs text-[#667085] font-medium">
            {lang === "gu"
              ? "ભારતીય જીએસટી વેપાર અને દેશી નામા પ્લેટફોર્મ"
              : "Indian GST Compliant Billing & Double-Entry Accounting"}
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-semibold flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#202124] uppercase mb-1">
              {lang === "gu" ? "મોબાઇલ નંબર (Mobile Phone) *" : "Phone Number *"}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-semibold text-[#98A2B3]">
                +91
              </span>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98989 90001"
                className="w-full pl-11 pr-3 py-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-button text-sm font-mono text-[#202124] focus:bg-white focus:ring-1 focus:ring-[#F47721] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202124] uppercase mb-1">
              {lang === "gu" ? "પાસવર્ડ (Password) *" : "Password *"}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-button text-sm text-[#202124] focus:bg-white focus:ring-1 focus:ring-[#F47721] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-[#F47721] hover:bg-[#D95F12] disabled:opacity-50 text-white rounded-button text-sm font-bold shadow-saffron transition-all"
          >
            {isLoading
              ? (lang === "gu" ? "ચકાસી રહ્યું છે..." : "Signing in...")
              : (lang === "gu" ? "પ્રવેશ કરો (Sign In)" : "Sign In")}
          </button>
        </form>

        {/* Demo credentials helper for quick testing */}
        <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
          <button
            type="button"
            onClick={handleDemoCredentials}
            className="text-xs text-[#F47721] hover:text-[#D95F12] hover:underline font-semibold"
          >
            {lang === "gu" ? "ડેમો વિગતો ભરો (Demo User)" : "Fill Demo Credentials"}
          </button>
          <span className="text-[10px] text-[#98A2B3] font-mono">
            Tenant Secured (RLS)
          </span>
        </div>
      </div>
    </div>
  );
}
