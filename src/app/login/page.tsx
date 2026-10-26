"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../context/auth-context";
import { apiClient } from "../../lib/api-client";
import { WaveBackground } from "../../components/ui/wave-background";
import Image from "next/image";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const reasonParam = searchParams.get("reason");
  const modeParam = searchParams.get("mode");
  const { login, lang, setLang, isAuthenticated, isLoading: authLoading, user } = useAuth();

  const [mode, setMode] = useState<"login" | "signup" | "forgot">(
    modeParam === "signup" ? "signup" : "login"
  );
  const [signupStep, setSignupStep] = useState<"details" | "otp">("details");
  const [signupOtp, setSignupOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetSent, setResetSent] = useState(false);

  // Login form state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Sign up form state
  const [signupData, setSignupData] = useState({
    fullName: "",
    phone: "",
    email: "",
    organizationName: "",
    gstin: "",
    password: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const otpParam = (searchParams.get("otp") || "").replace(/\D/g, "").slice(0, 6);
    if (modeParam === "signup" || (otpParam && modeParam !== "forgot")) {
      setMode("signup");
      if (otpParam.length === 6) {
        setSignupStep("otp");
        setSignupOtp(otpParam);
      }
    } else if (modeParam === "forgot") {
      setMode("forgot");
      if (otpParam.length === 6) {
        setResetSent(true);
        setResetOtp(otpParam);
      }
    } else if (modeParam === "login") {
      setMode("login");
    }
  }, [modeParam, searchParams]);

  // If already logged in, redirect accordingly — but never if redirected due to expired session
  useEffect(() => {
    if (!authLoading && isAuthenticated && user && !reasonParam) {
      const dest = redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("/superadmin") ? redirectParam : "/";
      router.replace(dest);
    }
  }, [authLoading, isAuthenticated, user, router, redirectParam, reasonParam]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

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

        const dest = redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("/superadmin") ? redirectParam : "/";
        router.push(dest);
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    const email = signupData.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setIsLoading(false);
      setError(lang === "gu" ? "નોંધણી માટે ઈમેલ જરૂરી છે." : "Email is required to register.");
      return;
    }

    try {
      if (signupStep === "details") {
        const otpRes: any = await apiClient.post("/auth/otp/send", {
          email,
          purpose: "REGISTER",
          phone: signupData.phone.trim(),
        });
        setSignupStep("otp");
        setDevOtp(otpRes?.devOtp || null);
        setSuccessMsg(
          otpRes?.delivered
            ? lang === "gu"
              ? "ચકાસણી કોડ ઈમેલ પર મોકલ્યો. કોડ દાખલ કરીને નોંધણી પૂર્ણ કરો."
              : "Verification code sent. Enter it to finish registration."
            : lang === "gu"
              ? "ઈમેલ સર્વર ગોઠવેલું નથી. નીચેનો કોડ વાપરીને નોંધણી પૂર્ણ કરો, અથવા SMTP સેટ કરો."
              : "Email server is not configured. Use the code shown below to finish, or set SMTP so codes arrive in the inbox."
        );
        return;
      }

      const res: any = await apiClient.post("/auth/register", {
        fullName: signupData.fullName.trim(),
        phone: signupData.phone.trim(),
        email,
        otp: signupOtp.trim(),
        organizationName: signupData.organizationName.trim(),
        gstin: signupData.gstin.trim() || undefined,
        password: signupData.password,
        preferredLang: lang,
        stateCode: "24",
      });

      if (res?.accessToken) {
        await login({
          accessToken: res.accessToken,
          user: res.user,
          defaultContext: res.defaultContext,
        });
        router.push("/");
      } else {
        setSuccessMsg(
          lang === "gu"
            ? "નોંધણી સફળ થઈ! કૃપા કરીને લોગિન કરો."
            : "Account created successfully! Please sign in."
        );
        setMode("login");
      }
    } catch (err: any) {
      setError(
        lang === "gu" && err.messageGujarati
          ? err.messageGujarati
          : err.message || (lang === "gu" ? "નોંધણી નિષ્ફળ ગઈ. કૃપા કરીને માહિતી તપાસો." : "Registration failed. Please check your details.")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const otpRes: any = await apiClient.post("/auth/otp/send", {
        email: resetEmail.trim().toLowerCase(),
        purpose: "PASSWORD_RESET",
      });
      setResetSent(true);
      setDevOtp(otpRes?.devOtp || null);
      setSuccessMsg(
        otpRes?.delivered
          ? lang === "gu"
            ? "જો આ ઈમેલનું ખાતું હોય તો કોડ મોકલાયો છે."
            : "If an account exists for this email, a code has been sent."
          : otpRes?.devOtp
            ? lang === "gu"
              ? "ઈમેલ સર્વર ગોઠવેલું નથી. નીચેનો કોડ વાપરો."
              : "Email server is not configured. Use the code shown below."
            : lang === "gu"
              ? "જો આ ઈમેલનું ખાતું હોય તો કોડ મોકલાયો છે."
              : "If an account exists for this email, a code has been sent."
      );
    } catch (err: any) {
      setError(
        lang === "gu" && err.messageGujarati
          ? err.messageGujarati
          : err.message || (lang === "gu" ? "કોડ મોકલી શકાયો નથી." : "Could not send the code.")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res: any = await apiClient.post("/auth/password/reset", {
        email: resetEmail.trim().toLowerCase(),
        otp: resetOtp.trim(),
        newPassword: resetPassword,
      });
      setMode("login");
      setResetSent(false);
      setResetOtp("");
      setResetPassword("");
      setDevOtp(null);
      setIdentifier(resetEmail.trim().toLowerCase());
      setPassword("");
      setSuccessMsg(
        lang === "gu" && res?.messageGujarati
          ? res.messageGujarati
          : res?.message || (lang === "gu" ? "પાસવર્ડ અપડેટ થયો." : "Password updated. Sign in with the new password.")
      );
    } catch (err: any) {
      setError(
        lang === "gu" && err.messageGujarati
          ? err.messageGujarati
          : err.message || (lang === "gu" ? "પાસવર્ડ રીસેટ નિષ્ફળ." : "Password reset failed.")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemoBusiness = () => {
    setMode("login");
    setIdentifier("9898990001");
    setPassword("Password123#");
    setError(null);
  };


  return (
    <div className="h-full min-h-[100dvh] w-full bg-[#F3EBDD] flex flex-col justify-center items-center p-4 relative overflow-y-auto">
      {/* Minimalist Abstract Wave Lines Background */}
      <WaveBackground variant="login" />

      {/* Back to Home / Landing link */}
      <div className="absolute top-5 left-5 z-10">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#FFF8F3] text-xs font-bold text-[#667085] hover:text-[#C24E1D] rounded-xl border border-[#E5E7EB] shadow-xs transition-all"
        >
          <span>←</span>
          <span>{lang === "gu" ? "મુખ્ય પૃષ્ઠ" : "Home"}</span>
        </button>
      </div>

      {/* Language Switcher in top corner */}
      <div className="absolute top-5 right-5 z-10 flex items-center bg-white p-1 rounded-xl border border-[#E5E7EB] shadow-xs">
        <button
          type="button"
          onClick={() => setLang("en")}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
            lang === "en" ? "bg-[#FFF3E8] text-[#C24E1D]" : "text-[#667085] hover:text-[#202124]"
          }`}
        >
          English
        </button>
        <button
          type="button"
          onClick={() => setLang("gu")}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all font-gujarati ${
            lang === "gu" ? "bg-[#FFF3E8] text-[#C24E1D]" : "text-[#667085] hover:text-[#202124]"
          }`}
        >
          ગુજરાતી
        </button>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#E5E7EB] p-6 sm:p-8 space-y-5 relative z-10 border-t-4 border-t-[#C24E1D] my-8">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 relative mx-auto flex items-center justify-center">
            <Image
              src="/logo-icon.png"
              alt="myownbillbook"
              width={64}
              height={64}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            <span className="text-[#1E589D]">myown</span>
            <span className="text-[#EA580C]">billbook</span>
          </h1>
          <p className="text-xs text-[#667085] font-medium max-w-xs mx-auto">
            {lang === "gu"
              ? "ભારતીય જીએસટી વેપાર અને દેશી નામા પ્લેટફોર્મ"
              : "Indian GST Billing, Inventory & Double-Entry Accounting"}
          </p>
        </div>

        {/* Tab Switcher: Sign In | Sign Up */}
        <div className="flex bg-[#F3F4F6] p-1 rounded-xl border border-[#E5E7EB]">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              mode === "login"
                ? "bg-white text-[#C24E1D] shadow-xs"
                : "text-[#667085] hover:text-[#202124]"
            }`}
          >
            {lang === "gu" ? "પ્રવેશ કરો (Sign In)" : "Sign In"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              mode === "signup"
                ? "bg-white text-[#C24E1D] shadow-xs"
                : "text-[#667085] hover:text-[#202124]"
            }`}
          >
            {lang === "gu" ? "નવું ખાતું બનાવો (Register)" : "Create Account"}
          </button>
        </div>

        {reasonParam === "session_expired" && !error && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-semibold flex items-center gap-2 animate-fadeIn">
            <span className="text-base">🔒</span>
            <span>
              {lang === "gu"
                ? "તમારું સત્ર સમાપ્ત થઈ ગયું છે. કૃપા કરીને ફરીથી લોગિન કરો."
                : "Your session has expired. Please sign in again."}
            </span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-fadeIn">
            <span className="text-base">✓</span>
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2 animate-fadeIn">
            <span className="text-base">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* 1. SIGN IN FORM */}
        {mode === "login" ? (
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
                  className="w-full pl-10 pr-3 py-2.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm font-medium text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#C24E1D] focus:border-transparent focus:outline-none transition-all"
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
                  className="w-full pl-10 pr-3 py-2.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm font-medium text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#C24E1D] focus:border-transparent focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex justify-end -mt-1">
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setResetSent(false);
                  setResetEmail(identifier.includes("@") ? identifier.trim() : "");
                  setError(null);
                  setSuccessMsg(null);
                  setDevOtp(null);
                }}
                className="text-[11px] font-semibold text-[#C24E1D] hover:underline"
              >
                {lang === "gu" ? "પાસવર્ડ ભૂલી ગયા?" : "Forgot password?"}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white shadow-saffron bg-[#C24E1D] hover:bg-[#D95F12] transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer"
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
        ) : mode === "forgot" ? (
          <form onSubmit={resetSent ? handleResetPassword : handleSendResetOtp} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-[#202124] uppercase mb-1 tracking-wider">
                {lang === "gu" ? "ખાતાનો ઈમેલ *" : "Account Email *"}
              </label>
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="business@gmail.com"
                className="w-full px-3 py-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm font-medium text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#C24E1D] focus:outline-none transition-all"
              />
            </div>
            {resetSent && (
              <>
                <div>
                  <label className="block text-xs font-bold text-[#202124] uppercase mb-1 tracking-wider">
                    {lang === "gu" ? "ઈમેલ કોડ *" : "Email Code *"}
                  </label>
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    maxLength={6}
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="w-full px-3 py-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm font-mono tracking-[0.3em] text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#C24E1D] focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#202124] uppercase mb-1 tracking-wider">
                    {lang === "gu" ? "નવો પાસવર્ડ *" : "New Password *"}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#C24E1D] focus:outline-none transition-all"
                  />
                </div>
              </>
            )}
            {devOtp && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                {lang === "gu" ? "સ્થાનિક કોડ (SMTP બંધ છે): " : "Local code (SMTP is off): "}
                <strong className="font-mono tracking-widest">{devOtp}</strong>
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white shadow-saffron bg-[#C24E1D] hover:bg-[#D95F12] transition-all disabled:opacity-50"
            >
              {isLoading
                ? lang === "gu" ? "રાહ જુઓ..." : "Please wait..."
                : resetSent
                  ? lang === "gu" ? "પાસવર્ડ અપડેટ કરો" : "Update Password"
                  : lang === "gu" ? "ઈમેલ પર કોડ મોકલો" : "Send Email Code"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setDevOtp(null);
                setError(null);
              }}
              className="w-full text-xs font-semibold text-[#667085] hover:text-[#202124]"
            >
              {lang === "gu" ? "પાછા સાઇન ઇન પર" : "Back to sign in"}
            </button>
          </form>
        ) : (
          /* 2. SIGN UP / REGISTRATION FORM */
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-[#202124] uppercase mb-1 tracking-wider">
                {lang === "gu" ? "તમારું પૂરું નામ *" : "Your Full Name *"}
              </label>
              <input
                type="text"
                required
                value={signupData.fullName}
                onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                placeholder={lang === "gu" ? "દા.ત. રમેશભાઈ પટેલ" : "e.g. Ramesh Patel"}
                className="w-full px-3 py-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm font-medium text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#C24E1D] focus:outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#202124] uppercase mb-1 tracking-wider">
                  {lang === "gu" ? "મોબાઇલ નંબર *" : "Phone Number *"}
                </label>
                <input
                  type="tel"
                  required
                  value={signupData.phone}
                  onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                  placeholder="98980 00000"
                  className="w-full px-3 py-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm font-mono text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#C24E1D] focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] uppercase mb-1 tracking-wider">
                  {lang === "gu" ? "ઈમેલ *" : "Email *"}
                </label>
                <input
                  type="email"
                  required
                  value={signupData.email}
                  onChange={(e) => {
                    setSignupData({ ...signupData, email: e.target.value });
                    setSignupStep("details");
                    setSignupOtp("");
                    setDevOtp(null);
                  }}
                  placeholder="business@gmail.com"
                  className="w-full px-3 py-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm font-medium text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#C24E1D] focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#202124] uppercase mb-1 tracking-wider">
                {lang === "gu" ? "પેઢી / બિઝનેસનું નામ *" : "Business / Store Name *"}
              </label>
              <input
                type="text"
                required
                value={signupData.organizationName}
                onChange={(e) => setSignupData({ ...signupData, organizationName: e.target.value })}
                placeholder={lang === "gu" ? "દા.ત. શ્રી ગણેશ ટ્રેડિંગ" : "e.g. Shree Ganesh Trading Co."}
                className="w-full px-3 py-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm font-medium text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#C24E1D] focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#202124] uppercase mb-1 tracking-wider">
                {lang === "gu" ? "જીએસટી નંબર (મરજિયાત)" : "GSTIN (Optional)"}
              </label>
              <input
                type="text"
                maxLength={15}
                value={signupData.gstin}
                onChange={(e) => setSignupData({ ...signupData, gstin: e.target.value.toUpperCase() })}
                placeholder="24AAAAA0000A1Z5"
                className="w-full px-3 py-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm font-mono uppercase text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#C24E1D] focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#202124] uppercase mb-1 tracking-wider">
                {lang === "gu" ? "પાસવર્ડ સેટ કરો *" : "Create Password *"}
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={signupData.password}
                onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#C24E1D] focus:outline-none transition-all"
              />
            </div>

            {signupStep === "otp" && (
              <div>
                <label className="block text-xs font-bold text-[#202124] uppercase mb-1 tracking-wider">
                  {lang === "gu" ? "ઈમેલ ચકાસણી કોડ *" : "Email Verification Code *"}
                </label>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={6}
                  value={signupOtp}
                  onChange={(e) => setSignupOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-3 py-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm font-mono tracking-[0.3em] text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#C24E1D] focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSignupStep("details");
                    setSignupOtp("");
                  }}
                  className="mt-1 text-[11px] font-semibold text-[#667085] hover:text-[#C24E1D]"
                >
                  {lang === "gu" ? "કોડ ફરી મોકલો" : "Send a new code"}
                </button>
              </div>
            )}

            {devOtp && mode === "signup" && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                {lang === "gu" ? "સ્થાનિક કોડ (SMTP બંધ છે): " : "Local code (SMTP is off): "}
                <strong className="font-mono tracking-widest">{devOtp}</strong>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white shadow-saffron bg-[#C24E1D] hover:bg-[#D95F12] transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer mt-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>
                    {signupStep === "otp"
                      ? lang === "gu" ? "ખાતું બની રહ્યું છે..." : "Creating Account..."
                      : lang === "gu" ? "કોડ મોકલાઈ રહ્યો છે..." : "Sending code..."}
                  </span>
                </>
              ) : (
                <span>
                  {signupStep === "otp"
                    ? lang === "gu" ? "કોડ ચકાસો અને નોંધણી પૂર્ણ કરો" : "Verify Code & Complete Registration"
                    : lang === "gu" ? "ઈમેલ પર કોડ મોકલો" : "Send Code to Email"}
                </span>
              )}
            </button>
          </form>
        )}

        {/* Development Demo Access Pill for Authorized Testers (Hidden on Public Landing Page) */}
        <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handleFillDemoBusiness}
            className="text-[11px] text-[#667085] hover:text-[#C24E1D] hover:underline font-semibold"
          >
            {lang === "gu" ? "ડેમો બિઝનેસ ભરો" : "Demo Business User"}
          </button>

        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F9FB] flex flex-col justify-center items-center p-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#C24E1D] to-[#FF9B50] flex items-center justify-center text-white font-bold text-3xl shadow-saffron animate-pulse">
            ₹
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
