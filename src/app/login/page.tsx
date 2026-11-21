"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../context/auth-context";
import { apiClient } from "../../lib/api-client";
import { WaveBackground } from "../../components/ui/wave-background";
import Image from "next/image";
import Link from "next/link";
import { Lock, Ban, Check, AlertTriangle, Smartphone, CreditCard, ShieldCheck, Zap, ArrowRight, Loader2 } from "lucide-react";
import { openRazorpayCheckout } from "../../lib/razorpay";

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
  const [confirmPassword, setConfirmPassword] = useState("");

  // Payment-First Signup States ("pela payment pachi access")
  const planParam = searchParams.get("plan");
  const cycleParam = searchParams.get("cycle");
  const [selectedTier, setSelectedTier] = useState<string>(
    planParam === "starter"
      ? "RETAIL_BASIC"
      : planParam === "enterprise"
        ? "DISTRIBUTION_ENTERPRISE"
        : "WHOLESALE_PRO",
  );
  const [signupCycle, setSignupCycle] = useState<"monthly" | "yearly">(
    cycleParam === "monthly" ? "monthly" : "yearly",
  );
  const [isPaying, setIsPaying] = useState(false);
  const [verifiedPayment, setVerifiedPayment] = useState<{
    orderId: string;
    paymentId: string;
    signature: string;
    tier: string;
    billingCycle: "monthly" | "yearly";
    amountRupees?: number;
    planName?: string;
  } | null>(null);

  const signupPlans = [
    {
      id: "starter",
      tier: "RETAIL_BASIC",
      name: "Starter Plan",
      nameGu: "સ્ટાર્ટર પ્લાન",
      monthlyPrice: 499,
      yearlyPrice: 399,
      annualTotal: 4788,
      desc: "1 Business • Up to 3,000 Invoices/yr",
      descGu: "૧ બિઝનેસ • વાર્ષિક ૩,૦૦૦ ઇન્વૉઇસ",
    },
    {
      id: "professional",
      tier: "WHOLESALE_PRO",
      name: "Professional Plan",
      nameGu: "પ્રોફેશનલ પ્લાન",
      monthlyPrice: 999,
      yearlyPrice: 799,
      annualTotal: 9588,
      popular: true,
      desc: "Up to 3 Businesses • AI OCR Scanner • WhatsApp",
      descGu: "૩ બિઝનેસ • AI કેમેરા સ્કેનર • WhatsApp",
    },
    {
      id: "enterprise",
      tier: "DISTRIBUTION_ENTERPRISE",
      name: "Enterprise Plan",
      nameGu: "એન્ટરપ્રાઇઝ પ્લાન",
      monthlyPrice: 1999,
      yearlyPrice: 1599,
      annualTotal: 19188,
      desc: "Unlimited Businesses • Govt E-Invoice API",
      descGu: "અનલિમિટેડ બિઝનેસ • સરકારી E-Invoice API",
    },
  ];

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [logoutNotice, setLogoutNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("billing_logout_notice");
      if (!raw) return;
      sessionStorage.removeItem("billing_logout_notice");
      const parsed = JSON.parse(raw);
      setLogoutNotice(
        lang === "gu"
          ? parsed.messageGujarati || parsed.message
          : parsed.message || parsed.messageGujarati,
      );
    } catch {
      // ignore
    }
  }, [lang]);

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
          refreshToken: res.refreshToken,
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

  // STEP 1: Pay via Razorpay before registration ("pela payment pachi access")
  const handlePayBeforeSignup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const name = signupData.fullName.trim();
    const phone = signupData.phone.replace(/\D/g, "");
    const email = signupData.email.trim().toLowerCase();

    if (!name) {
      setError(lang === "gu" ? "કૃપા કરીને તમારું પૂરું નામ દાખલ કરો." : "Please enter your full name.");
      return;
    }
    if (!phone || phone.length < 10) {
      setError(lang === "gu" ? "કૃપા કરીને ૧૦-અંકનો માન્ય મોબાઇલ નંબર દાખલ કરો." : "Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!email || !email.includes("@")) {
      setError(lang === "gu" ? "કૃપા કરીને માન્ય ઈમેલ દાખલ કરો." : "Please enter a valid email address.");
      return;
    }

    const currentPlan = signupPlans.find((p) => p.tier === selectedTier) || signupPlans[1];
    setIsPaying(true);

    try {
      // Validate that user does not already exist BEFORE opening Razorpay
      const checkRes: any = await apiClient.post("/auth/check-availability", {
        email,
        phone,
      });

      if (checkRes && !checkRes.available) {
        setError(
          lang === "gu"
            ? (checkRes.messageGujarati || "આ ફોન નંબર અથવા ઈમેલ ધરાવતો એકાઉન્ટ પહેલેથી હાજર છે. પ્લાન અપગ્રેડ કરવા માટે કૃપા કરીને સાઇન ઇન કરો.")
            : (checkRes.message || "An account with this phone number or email already exists. Please switch to Sign In to upgrade your account, or use a new phone/email.")
        );
        setIsPaying(false);
        return;
      }

      const orderRes: any = await apiClient.post("/subscriptions/public-order", {
        tier: selectedTier,
        billingCycle: signupCycle,
        customerName: name,
        customerPhone: phone,
        customerEmail: email,
      });

      if (!orderRes || !orderRes.orderId) {
        throw new Error(orderRes?.message || "Failed to create subscription payment order.");
      }

      const opened = await openRazorpayCheckout({
        orderId: orderRes.orderId,
        amount: orderRes.amount,
        keyId: orderRes.keyId,
        currency: orderRes.currency || "INR",
        name: "myBillBook Technologies",
        description: `${currentPlan.name} (${signupCycle === "yearly" ? "Annual" : "Monthly"})`,
        prefill: {
          name,
          email,
          contact: phone,
        },
        notes: {
          tier: selectedTier,
          billingCycle: signupCycle,
        },
        onSuccess: (response) => {
          setVerifiedPayment({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
            tier: selectedTier,
            billingCycle: signupCycle,
            amountRupees: orderRes.amountRupees || Math.round(orderRes.amount / 100),
            planName: currentPlan.name,
          });
          if (!signupData.organizationName.trim() && name) {
            setSignupData((prev) => ({
              ...prev,
              organizationName: `${name} Enterprises`,
            }));
          }
          setSuccessMsg(
            lang === "gu"
              ? "પેમેન્ટ સફળ થયું! હવે તમારો પાસવર્ડ અને પેઢીનું નામ સેટ કરીને સોફ્ટવેર શરૂ કરો."
              : "Payment verified successfully! Complete registration below to access your account.",
          );
          setIsPaying(false);
        },
        onError: (err) => {
          setError(err?.message || "Payment was cancelled or could not be completed.");
          setIsPaying(false);
        },
        onDismiss: () => {
          setIsPaying(false);
        },
      });

      if (!opened) {
        setIsPaying(false);
      }
    } catch (err: any) {
      setError(err?.message || "Could not initiate payment. Please try again.");
      setIsPaying(false);
    }
  };

  // STEP 2: Complete registration with verified payment
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedPayment) {
      setError(
        lang === "gu"
          ? "નોંધણી માટે પહેલા પેમેન્ટ જરૂરી છે."
          : "Payment verification required before registration.",
      );
      return;
    }

    const orgName =
      signupData.organizationName.trim() ||
      `${signupData.fullName.trim() || "My"} Enterprises`;

    if (!signupData.password || signupData.password.length < 6) {
      setError(lang === "gu" ? "પાસવર્ડ ઓછામાં ઓછો ૬ અક્ષરનો હોવો જોઈએ." : "Password must be at least 6 characters.");
      return;
    }

    if (signupData.password !== confirmPassword) {
      setError(lang === "gu" ? "પાસવર્ડ મેળ ખાતો નથી." : "Passwords do not match.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    const email = signupData.email.trim().toLowerCase();

    try {
      const res: any = await apiClient.post("/auth/register", {
        fullName: signupData.fullName.trim(),
        phone: signupData.phone.trim(),
        email,
        organizationName: orgName,
        companyLegalName: orgName,
        gstin: signupData.gstin.trim() || undefined,
        password: signupData.password,
        preferredLang: lang,
        stateCode: "24",
        paymentDetails: verifiedPayment,
      });

      if (res?.accessToken) {
        await login({
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
          user: res.user,
          defaultContext: res.defaultContext,
        });
        const dest = redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("/superadmin") ? redirectParam : "/";
        router.push(dest);
      } else {
        setSuccessMsg(
          lang === "gu"
            ? "નોંધણી સફળ થઈ! તમારા એકાઉન્ટમાં લોગિન કરી રહ્યાં છીએ..."
            : "Account created successfully! Launching your workspace...",
        );
        router.push("/dashboard");
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
    <div className="h-full min-h-[100dvh] w-full bg-[#F7F9FC] flex flex-col justify-center items-center p-4 relative overflow-y-auto">
      {/* Minimalist Abstract Wave Lines Background */}
      <WaveBackground variant="login" />

      {/* Back to Home / Landing link */}
      <div className="absolute top-5 left-5 z-10">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F8FAFC] text-xs font-semibold text-[#667085] hover:text-[#172033] rounded-xl border border-[#E5EAF1] shadow-xs transition-all"
        >
          <span>←</span>
          <span>{lang === "gu" ? "મુખ્ય પૃષ્ઠ" : "Home"}</span>
        </button>
      </div>

      {/* Language Switcher in top corner */}
      <div className="absolute top-5 right-5 z-10 flex items-center bg-white p-1 rounded-xl border border-[#E5EAF1] shadow-xs">
        <button
          type="button"
          onClick={() => setLang("en")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            lang === "en" ? "bg-[#EFF6FF] text-[#172033]" : "text-[#667085] hover:text-[#172033]"
          }`}
        >
          English
        </button>
        <button
          type="button"
          onClick={() => setLang("gu")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all font-gujarati ${
            lang === "gu" ? "bg-[#EFF6FF] text-[#172033]" : "text-[#667085] hover:text-[#172033]"
          }`}
        >
          ગુજરાતી
        </button>
      </div>

      <div className={`w-full ${mode === "signup" ? "max-w-xl" : "max-w-md"} bg-white rounded-2xl shadow-xl border border-[#E5EAF1] p-6 sm:p-8 space-y-5 relative z-10 border-t-4 border-t-[#2563EB] my-8 transition-all`}>
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block transition-transform hover:scale-[1.02]">
            <Image
              src="/logo-full.png"
              alt="myownbillbook"
              width={240}
              height={56}
              className="h-12 sm:h-14 w-auto mx-auto object-contain"
              priority
            />
          </Link>
          <p className="text-xs text-[#667085] font-medium max-w-xs mx-auto">
            {lang === "gu"
              ? "ભારતીય જીએસટી વેપાર અને દેશી નામા પ્લેટફોર્મ"
              : "Indian GST Billing, Inventory & Double-Entry Accounting"}
          </p>
        </div>

        {/* Tab Switcher: Sign In | Sign Up */}
        <div className="flex bg-[#F7F9FC] p-1 rounded-xl border border-[#E5EAF1]">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === "login"
                ? "bg-white text-[#172033] shadow-xs"
                : "text-[#667085] hover:text-[#172033]"
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
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === "signup"
                ? "bg-white text-[#172033] shadow-xs"
                : "text-[#667085] hover:text-[#172033]"
            }`}
          >
            {lang === "gu" ? "નવું ખાતું બનાવો (Register)" : "Create Account"}
          </button>
        </div>

        {reasonParam === "session_expired" && !error && !logoutNotice && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-semibold flex items-center gap-2 animate-fadeIn">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {lang === "gu"
                ? "તમારું સત્ર સમાપ્ત થઈ ગયું છે. કૃપા કરીને ફરીથી લોગિન કરો."
                : "Your session has expired. Please sign in again."}
            </span>
          </div>
        )}

        {reasonParam === "suspended" && !error && !logoutNotice && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2 animate-fadeIn">
            <Ban className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              {lang === "gu"
                ? "તમારું ટેનન્ટ સુપરએડમિન દ્વારા સસ્પેન્ડ કરવામાં આવ્યું છે."
                : "Your organization account has been suspended by the platform administrator."}
            </span>
          </div>
        )}

        {reasonParam === "session_revoked" && !error && !logoutNotice && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-semibold flex items-center gap-2 animate-fadeIn">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {lang === "gu"
                ? "સુરક્ષા ફેરફારને કારણે સત્ર બંધ કરવામાં આવ્યું છે. ફરી લોગિન કરો."
                : "Your session was closed because of a security change. Please sign in again."}
            </span>
          </div>
        )}

        {logoutNotice && !error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2 animate-fadeIn">
            <Ban className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{logoutNotice}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. SIGN IN FORM */}
        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#202124] uppercase mb-1.5 tracking-wider">
                {lang === "gu" ? "મોબાઇલ નંબર અથવા ઇમેઇલ *" : "Phone Number or Email *"}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-[#98A2B3]">
                  <Smartphone className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={lang === "gu" ? "98989 90001 અથવા email" : "98989 90001 or email@domain.com"}
                  className="w-full pl-10 pr-3 py-2.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm font-medium text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#2563EB] focus:border-transparent focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#202124] uppercase tracking-wider">
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
                <span className="absolute left-3.5 top-3 text-[#98A2B3]">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-3 py-2.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm font-medium text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#2563EB] focus:border-transparent focus:outline-none transition-all"
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
                className="text-[11px] font-semibold text-[#2563EB] hover:underline"
              >
                {lang === "gu" ? "પાસવર્ડ ભૂલી ગયા?" : "Forgot password?"}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white shadow-blue-500/20 bg-[#1677E8] hover:bg-[#1268D3] transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer"
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
              <label className="block text-xs font-semibold text-[#202124] uppercase mb-1 tracking-wider">
                {lang === "gu" ? "ખાતાનો ઈમેલ *" : "Account Email *"}
              </label>
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="business@gmail.com"
                className="w-full px-3 py-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm font-medium text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#2563EB] focus:outline-none transition-all"
              />
            </div>
            {resetSent && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[#202124] uppercase mb-1 tracking-wider">
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
                    className="w-full px-3 py-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm tabular-nums tracking-[0.3em] text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#2563EB] focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#202124] uppercase mb-1 tracking-wider">
                    {lang === "gu" ? "નવો પાસવર્ડ *" : "New Password *"}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#2563EB] focus:outline-none transition-all"
                  />
                </div>
              </>
            )}
            {devOtp && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                {lang === "gu" ? "સ્થાનિક કોડ (SMTP બંધ છે): " : "Local code (SMTP is off): "}
                <strong className="tabular-nums tracking-widest">{devOtp}</strong>
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white shadow-blue-500/20 bg-[#1677E8] hover:bg-[#1268D3] transition-all disabled:opacity-50"
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
          /* 2. SIGN UP / REGISTRATION FLOW: PAYMENT FIRST, THEN ACCESS ("pela payment pachi access") */
          <div className="space-y-4">
            {!verifiedPayment ? (
              /* STEP 1: SELECT PLAN & COMPLETE PAYMENT */
              <form onSubmit={handlePayBeforeSignup} className="space-y-4">
                {/* Notice Banner */}
                <div className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl flex items-center gap-2.5 text-xs text-[#1D4ED8] font-medium">
                  <CreditCard className="w-4 h-4 shrink-0 text-[#2563EB]" />
                  <span>
                    {lang === "gu"
                      ? "પ્રથમ પેમેન્ટ, પછી એક્સેસ: રેઝરપે દ્વારા પ્લાન ચુકવ્યા બાદ તમારું રજીસ્ટ્રેશન અનલોક થશે."
                      : "First Payment, Then Access: Complete plan payment via Razorpay to unlock your business registration."}
                  </span>
                </div>

                {/* Billing Cycle Toggle */}
                <div className="flex items-center justify-between bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSignupCycle("monthly")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      signupCycle === "monthly"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {lang === "gu" ? "માસિક બિલિંગ (Monthly)" : "Monthly Billing"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignupCycle("yearly")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      signupCycle === "yearly"
                        ? "bg-[#2563EB] text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <span>{lang === "gu" ? "વાર્ષિક (Yearly)" : "Yearly Billing"}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950">
                      -20%
                    </span>
                  </button>
                </div>

                {/* Plan Selection Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {signupPlans.map((p) => {
                    const isSelected = selectedTier === p.tier;
                    const price = signupCycle === "yearly" ? p.yearlyPrice : p.monthlyPrice;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedTier(p.tier)}
                        className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? "bg-[#F0F7FF] border-[#2563EB] ring-2 ring-[#2563EB]/20 shadow-xs"
                            : "bg-[#F8FAFC] border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {p.popular && (
                          <span className="absolute -top-2 right-2 bg-[#2563EB] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            POPULAR
                          </span>
                        )}
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            {lang === "gu" ? p.nameGu : p.name}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                            {lang === "gu" ? p.descGu : p.desc}
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-200/60">
                          <span className="text-sm font-bold text-slate-900 tabular-nums">
                            ₹{price}
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            /mo
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Plan Cost Summary */}
                {(() => {
                  const currentPlan =
                    signupPlans.find((p) => p.tier === selectedTier) || signupPlans[1];
                  const baseAmt =
                    signupCycle === "yearly"
                      ? currentPlan.annualTotal
                      : currentPlan.monthlyPrice;
                  const gst = Math.round(baseAmt * 0.18);
                  const total = baseAmt + gst;

                  return (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>
                          {lang === "gu" ? currentPlan.nameGu : currentPlan.name} (
                          {signupCycle === "yearly" ? "12 Months" : "1 Month"}):
                        </span>
                        <span className="font-semibold text-slate-900 tabular-nums">
                          ₹ {baseAmt.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>GST (18% SAC 998314):</span>
                        <span className="font-semibold text-slate-900 tabular-nums">
                          ₹ {gst.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-semibold text-slate-900">
                        <span>{lang === "gu" ? "કુલ રકમ (Total Payable):" : "Total Payable:"}</span>
                        <span className="text-[#2563EB] tabular-nums font-bold text-base">
                          ₹ {total.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Pre-payment Contact Inputs */}
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-[#202124] uppercase mb-1 tracking-wider">
                      {lang === "gu" ? "તમારું પૂરું નામ *" : "Your Full Name *"}
                    </label>
                    <input
                      type="text"
                      required
                      value={signupData.fullName}
                      onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                      placeholder={lang === "gu" ? "દા.ત. રમેશભાઈ પટેલ" : "e.g. Ramesh Patel"}
                      className="w-full px-3 py-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm font-medium text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#2563EB] focus:outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#202124] uppercase mb-1 tracking-wider">
                        {lang === "gu" ? "મોબાઇલ નંબર *" : "Phone Number *"}
                      </label>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={signupData.phone}
                        onChange={(e) => setSignupData({ ...signupData, phone: e.target.value.replace(/\D/g, "") })}
                        placeholder="98980 00000"
                        className="w-full px-3 py-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm tabular-nums text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#2563EB] focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#202124] uppercase mb-1 tracking-wider">
                        {lang === "gu" ? "ઈમેલ *" : "Email *"}
                      </label>
                      <input
                        type="email"
                        required
                        value={signupData.email}
                        onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                        placeholder="business@gmail.com"
                        className="w-full px-3 py-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm font-medium text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#2563EB] focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

               

                <button
                  type="submit"
                  disabled={isPaying}
                  className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white shadow-blue-500/20 bg-[#1677E8] hover:bg-[#1268D3] transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer mt-2"
                >
                  {isPaying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>{lang === "gu" ? "રેઝરપે ખુલી રહ્યું છે..." : "Opening Razorpay..."}</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {lang === "gu"
                          ? "રેઝરપે દ્વારા પેમેન્ટ કરો અને રજીસ્ટ્રેશન ખોલો"
                          : "Pay via Razorpay & Unlock Registration"}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* STEP 2: REGISTRATION UNLOCKED AFTER PAYMENT */
              <form onSubmit={handleRegister} className="space-y-3.5">
                {/* Verified Ribbon */}
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold text-emerald-900 block">
                      {lang === "gu" ? "પેમેન્ટ વેરિફાઇ થયું!" : "Payment Verified!"} (Order #{verifiedPayment.orderId.slice(-8)})
                    </span>
                    <span className="text-emerald-700 text-[11px]">
                      {verifiedPayment.planName || "Selected Plan"} (
                      {verifiedPayment.billingCycle === "yearly" ? "Yearly" : "Monthly"}) is reserved.
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#202124] uppercase mb-1 tracking-wider">
                      {lang === "gu" ? "તમારું નામ *" : "Your Name *"}
                    </label>
                    <input
                      type="text"
                      required
                      value={signupData.fullName}
                      onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                      className="w-full px-3 py-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm font-medium text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#2563EB] focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#202124] uppercase mb-1 tracking-wider">
                      {lang === "gu" ? "પેઢી / બિઝનેસનું નામ *" : "Business / Store Name *"}
                    </label>
                    <input
                      type="text"
                      value={signupData.organizationName}
                      onChange={(e) => setSignupData({ ...signupData, organizationName: e.target.value })}
                      placeholder={lang === "gu" ? "દા.ત. શ્રી ગણેશ ટ્રેડિંગ" : "e.g. Shree Ganesh Trading"}
                      className="w-full px-3 py-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm font-medium text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#2563EB] focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#202124] uppercase mb-1 tracking-wider">
                      {lang === "gu" ? "મોબાઇલ નંબર *" : "Phone *"}
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={signupData.phone}
                      onChange={(e) => setSignupData({ ...signupData, phone: e.target.value.replace(/\D/g, "") })}
                      className="w-full px-3 py-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm tabular-nums text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#2563EB] focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#202124] uppercase mb-1 tracking-wider">
                      {lang === "gu" ? "ઈમેલ *" : "Email *"}
                    </label>
                    <input
                      type="email"
                      required
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#2563EB] focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-[#667085] leading-relaxed">
                  {lang === "gu"
                    ? "નોંધ: જો આ ઈમેલ વાળો એકાઉન્ટ પહેલેથી હાજર હોય, તો નીચે તમારો જૂનો પાસવર્ડ દાખલ કરો જેથી પ્લાન તમારા એકાઉન્ટ સાથે લિંક થઈ જશે, અથવા ઉપર નવો ઈમેલ દાખલ કરો."
                    : "Note: If an account already exists with this email, enter your existing password below to link this subscription, or edit the email above to register a new account."}
                </p>

                <div>
                  <label className="block text-xs font-semibold text-[#202124] uppercase mb-1 tracking-wider">
                    {lang === "gu" ? "જીએસટી નંબર (મરજિયાત)" : "GSTIN (Optional)"}
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={signupData.gstin}
                    onChange={(e) => setSignupData({ ...signupData, gstin: e.target.value.toUpperCase() })}
                    placeholder="24AAAAA0000A1Z5"
                    className="w-full px-3 py-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm tabular-nums uppercase text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#2563EB] focus:outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#202124] uppercase mb-1 tracking-wider">
                      {lang === "gu" ? "પાસવર્ડ સેટ કરો *" : "Create Password *"}
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full px-3 py-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#2563EB] focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#202124] uppercase mb-1 tracking-wider">
                      {lang === "gu" ? "પાસવર્ડ કન્ફર્મ કરો *" : "Confirm Password *"}
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3 py-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#2563EB] focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white shadow-blue-500/20 bg-[#1677E8] hover:bg-[#1268D3] transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>{lang === "gu" ? "ખાતું બનાવી રહ્યાં છીએ..." : "Creating Account & Launching..."}</span>
                    </>
                  ) : (
                    <span>{lang === "gu" ? "નોંધણી પૂર્ણ કરો અને સોફ્ટવેર શરૂ કરો" : "Complete Registration & Access Workspace"}</span>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        <div className="pt-3 border-t border-[#E5EAF1] flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handleFillDemoBusiness}
            className="text-[11px] text-[#667085] hover:text-[#172033] hover:underline font-semibold"
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
        <div className="min-h-screen bg-[#F7F9FC] flex flex-col justify-center items-center p-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0F172A] to-[#1677E8] flex items-center justify-center text-white font-semibold text-3xl shadow-blue-500/20 animate-pulse">
            ₹
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
