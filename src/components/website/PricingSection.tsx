"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, Loader2, ShieldCheck, X, Zap, CreditCard, Sparkles, AlertTriangle } from "lucide-react";
import { useAuth } from "../../context/auth-context";
import { apiClient } from "../../lib/api-client";
import { openRazorpayCheckout } from "../../lib/razorpay";

export interface PricingSectionProps {
  lang?: "en" | "gu";
  onOpenDemo?: () => void;
}

export function PricingSection({ lang = "en", onOpenDemo }: PricingSectionProps) {
  const gu = lang === "gu";
  const router = useRouter();
  const { user, entitlements, login, refreshTenantMetadata } = useAuth();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");

  // Dynamic Plans from Superadmin Backend
  const [dynamicPlans, setDynamicPlans] = useState<any[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);

  // Interactive checkout modal state
  const [checkoutPlan, setCheckoutPlan] = useState<any | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<"payment" | "register" | "success">("payment");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Customer Contact for Payment (Step 1)
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // Verified Payment Data (Passed to Step 2)
  const [verifiedPayment, setVerifiedPayment] = useState<{
    orderId: string;
    paymentId: string;
    signature: string;
    tier: string;
    billingCycle: "monthly" | "yearly";
    amountRupees: number;
  } | null>(null);

  // Account Registration Fields (Step 2)
  const [businessName, setBusinessName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gstin, setGstin] = useState("");

  // Fetch configured tiers live from Superadmin backend
  useEffect(() => {
    let isMounted = true;
    apiClient
      .get<any[]>("/subscriptions/plans")
      .then((res) => {
        if (isMounted && Array.isArray(res) && res.length > 0) {
          setDynamicPlans(res);
        }
      })
      .catch((err) => {
        console.warn("Falling back to default plans:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingPlans(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Map dynamic plans strictly from live backend API
  const plans = useMemo(() => {
    return dynamicPlans.map((p) => {
      const features =
        gu && Array.isArray(p.featuresGujarati) && p.featuresGujarati.length > 0
          ? p.featuresGujarati
          : Array.isArray(p.features)
          ? p.features
          : [];

      const isPop = Boolean(p.isPopular ?? p.popular);

      return {
        id: p.id || p.tier?.toLowerCase(),
        tier: p.tier,
        name: gu ? p.nameGujarati || p.name : p.name,
        subtitle: gu ? p.subtitleGujarati || p.subtitle : p.subtitle,
        monthlyPrice: Number(p.monthlyPrice) || 0,
        yearlyPrice: Number(p.yearlyPrice) || 0,
        annualTotal: Number(p.annualTotal) || (Number(p.yearlyPrice) || 0) * 12,
        popular: isPop,
        badge: p.badge || (isPop ? (gu ? "સૌથી લોકપ્રિય" : "Most Popular") : null),
        features,
        ctaText:
          p.ctaText ||
          (isPop
            ? gu
              ? "સૌથી લોકપ્રિય — શરૂ કરો"
              : "Get Started Free"
            : gu
            ? "પ્લાન શરૂ કરો"
            : "Start Free Trial"),
      };
    });
  }, [dynamicPlans, gu]);

  const handlePlanClick = (plan: (typeof plans)[0]) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setCheckoutPlan(plan);
    setCheckoutStep("payment");

    if (user) {
      setCustomerName(user.fullName || user.name || "");
      setCustomerPhone(user.phone || "");
      setCustomerEmail(user.email || "");
    }
  };

  // STEP 1: Process Razorpay Payment
  const handleInitiatePayment = async () => {
    if (!checkoutPlan) return;
    setErrorMsg(null);

    // Validation for new users
    if (!user) {
      if (!customerName.trim()) {
        setErrorMsg(gu ? "કૃપા કરીને તમારું પૂરું નામ દાખલ કરો." : "Please enter your full name.");
        return;
      }
      const cleanPhone = customerPhone.replace(/\D/g, "");
      if (!cleanPhone || cleanPhone.length < 10) {
        setErrorMsg(gu ? "કૃપા કરીને માન્ય ૧૦-અંકનો મોબાઇલ નંબર દાખલ કરો." : "Please enter a valid 10-digit mobile number.");
        return;
      }
      const cleanEmail = customerEmail.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes("@")) {
        setErrorMsg(gu ? "કૃપા કરીને માન્ય ઈમેલ દાખલ કરો." : "Please enter a valid email address.");
        return;
      }

      // Check whether user already exists BEFORE payment to prevent post-payment conflicts
      setIsProcessing(true);
      try {
        const checkRes: any = await apiClient.post("/auth/check-availability", {
          email: cleanEmail,
          phone: cleanPhone,
        });

        if (checkRes && !checkRes.available) {
          setErrorMsg(
            gu
              ? (checkRes.messageGujarati || "આ ફોન નંબર અથવા ઈમેલ ધરાવતો એકાઉન્ટ પહેલેથી હાજર છે. પ્લાન અપગ્રેડ કરવા માટે કૃપા કરીને લોગિન કરો.")
              : (checkRes.message || "An account with this phone number or email already exists. Please Sign In to upgrade your existing plan, or use a different phone/email.")
          );
          setIsProcessing(false);
          return;
        }
      } catch (err: any) {
        if (err?.status === 409 || err?.statusCode === 409) {
          setErrorMsg(
            err?.message ||
              (gu
                ? "આ ફોન નંબર અથવા ઈમેલ ધરાવતો એકાઉન્ટ પહેલેથી હાજર છે. પ્લાન અપગ્રેડ કરવા માટે કૃપા કરીને લોગિન કરો."
                : "An account with this phone number or email already exists. Please Sign In to upgrade your account, or use a different phone/email.")
          );
          setIsProcessing(false);
          return;
        }
      }
    }

    setIsProcessing(true);

    try {
      let orderRes: any;

      if (user) {
        // Authenticated user upgrade
        orderRes = await apiClient.post<any>("/subscriptions/create-order", {
          tier: checkoutPlan.tier,
          billingCycle,
        });
      } else {
        // Unauthenticated user public order before registration
        orderRes = await apiClient.post<any>("/subscriptions/public-order", {
          tier: checkoutPlan.tier,
          billingCycle,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim().toLowerCase(),
        });
      }

      if (!orderRes || !orderRes.orderId) {
        throw new Error(orderRes?.message || "Failed to create subscription payment order.");
      }

      const opened = await openRazorpayCheckout({
        orderId: orderRes.orderId,
        amount: orderRes.amount,
        keyId: orderRes.keyId,
        currency: orderRes.currency || "INR",
        name: "MyOwnBillBook",
        description: `${checkoutPlan.name} (${billingCycle === "yearly" ? "Annual" : "Monthly"})`,
        prefill: {
          name: customerName || user?.fullName || "",
          email: customerEmail || user?.email || "",
          contact: customerPhone || user?.phone || "",
        },
        notes: {
          tier: checkoutPlan.tier,
          billingCycle,
        },
        onSuccess: async (response) => {
          if (user) {
            // Existing user: direct verification & instant upgrade
            try {
              const verifyRes = await apiClient.post<any>("/subscriptions/verify-payment", {
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                tier: checkoutPlan.tier,
                billingCycle,
              });

              if (refreshTenantMetadata) {
                await refreshTenantMetadata();
              }

              setSuccessMsg(
                verifyRes?.message ||
                  (gu
                    ? `તમારો ${checkoutPlan.name} સફળતાપૂર્વક સક્રિય થયો છે!`
                    : `Successfully upgraded to ${checkoutPlan.name}! All tier features are now active.`),
              );
              setCheckoutStep("success");
            } catch (err: any) {
              setErrorMsg(err?.message || "Payment verification failed. Please contact support.");
            }
          } else {
            // New user: Save payment verification token and advance to Step 2 (Registration)
            setVerifiedPayment({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              tier: checkoutPlan.tier,
              billingCycle,
              amountRupees: orderRes.amountRupees || Math.round(orderRes.amount / 100),
            });
            if (!businessName.trim() && customerName.trim()) {
              setBusinessName(`${customerName.trim()} Enterprises`);
            }
            setCheckoutStep("register");
          }
          setIsProcessing(false);
        },
        onError: (err) => {
          setErrorMsg(err?.message || "Payment was cancelled or could not be completed.");
          setIsProcessing(false);
        },
        onDismiss: () => {
          setIsProcessing(false);
        },
      });

      if (!opened) {
        setIsProcessing(false);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Could not initiate payment. Please try again.");
      setIsProcessing(false);
    }
  };

  // STEP 2: Complete Registration with Verified Payment
  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedPayment) {
      setErrorMsg("Payment verification required before registration.");
      return;
    }

    const finalBusinessName = businessName.trim() || `${customerName.trim() || "My"} Enterprises`;

    if (password.length < 6) {
      setErrorMsg(gu ? "પાસવર્ડ ઓછામાં ઓછો ૬ અક્ષરનો હોવો જોઈએ." : "Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg(gu ? "પાસવર્ડ મેળ ખાતો નથી." : "Passwords do not match.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const regRes: any = await apiClient.post("/auth/register", {
        fullName: customerName.trim(),
        phone: customerPhone.trim(),
        email: customerEmail.trim().toLowerCase(),
        password,
        organizationName: finalBusinessName,
        companyLegalName: finalBusinessName,
        stateCode: "24",
        gstin: gstin.trim().toUpperCase() || undefined,
        preferredLang: lang,
        paymentDetails: verifiedPayment,
      });

      if (regRes?.accessToken) {
        await login({
          accessToken: regRes.accessToken,
          refreshToken: regRes.refreshToken,
          user: regRes.user,
          defaultContext: regRes.defaultContext,
        });

        setCheckoutPlan(null);
        router.push("/dashboard");
      } else {
        setSuccessMsg(
          gu
            ? "નોંધણી સફળ થઈ! તમારા એકાઉન્ટમાં લોગિન કરો."
            : "Registration complete! Redirecting to your business dashboard...",
        );
        setTimeout(() => {
          setCheckoutPlan(null);
          router.push("/dashboard");
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Registration failed. Please try again or contact support.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section id="pricing" className="py-20 sm:py-28 bg-[#F7F9FC] border-b border-[#E5EAF1] scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 sm:mb-16 text-left">
          <span className="text-xs font-semibold text-[#2563EB] uppercase tracking-wider block mb-2.5">
            {gu ? "સબ્સ્ક્રિપ્શન પ્લાન" : "PRICING PLANS"}
          </span>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#172033] tracking-tight leading-[1.15]"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            {gu
              ? "વધતા વ્યવસાયો માટે સરળ અને સ્પષ્ટ પ્લાન."
              : "Simple Plans for Growing Businesses."}
          </h2>
          <p className="text-base sm:text-lg text-[#667085] mt-4 font-normal leading-relaxed">
            {gu
              ? "તમારા વ્યવસાયના કામકાજને અનુરૂપ પ્લાન પસંદ કરો. કોઈ હિડન ચાર્જ નહીં."
              : "Choose a plan that fits the way you work. All plans include 30-day free access and real customer support."}
          </p>

          {/* Billing Cycle Toggle with Framer Motion Animation */}
          <div className="mt-8 inline-flex items-center p-1.5 bg-slate-100/90 border border-slate-200/80 rounded-2xl shadow-2xs">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`relative px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                billingCycle === "monthly"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {gu ? "માસિક બિલિંગ" : "Monthly Billing"}
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`relative px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                billingCycle === "yearly"
                  ? "bg-[#2563EB] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>{gu ? "વાર્ષિક બિલિંગ" : "Yearly Billing"}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  billingCycle === "yearly"
                    ? "bg-white/20 text-white"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {gu ? "૨૦% બચત" : "Save 20%"}
              </span>
            </button>
          </div>
        </div>

        {/* Dynamic Compact Animated Pricing Cards Grid */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.08 },
            },
          }}
          className={`grid grid-cols-1 sm:grid-cols-2 ${
            plans.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
          } gap-4 sm:gap-5 items-stretch`}
        >
          {plans.map((p) => {
            const price = billingCycle === "yearly" ? p.yearlyPrice : p.monthlyPrice;
            const isEnterprise = p.id === "enterprise";
            const isCurrentPlan = user && entitlements?.tier === p.tier;

            return (
              <motion.div
                key={p.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
                }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className={`rounded-2xl border p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 relative ${
                  p.popular
                    ? "bg-white border-[#2563EB] shadow-lg shadow-blue-500/10 ring-2 ring-[#2563EB]/25"
                    : "bg-white border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-md"
                }`}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 sm:left-6 sm:translate-x-0 px-3 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold tracking-wider uppercase shadow-xs flex items-center gap-1.5">
                    <Sparkles className="w-2.5 h-2.5 fill-white" />
                    <span>{p.badge || (gu ? "સૌથી લોકપ્રિય" : "Most Popular")}</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className="text-base sm:text-lg font-bold text-[#172033]"
                      style={{ fontFamily: "var(--font-manrope)" }}
                    >
                      {p.name}
                    </h3>
                    {isCurrentPlan && (
                      <span className="text-[10px] font-bold text-white bg-slate-900 px-2 py-0.5 rounded-full shrink-0">
                        {gu ? "હાલનો પ્લાન" : "Current Active"}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#667085] mt-1.5 mb-4 line-clamp-2 min-h-[32px] leading-relaxed">
                    {p.subtitle}
                  </p>

                  {/* Compact Price Block */}
                  <div className="pb-4 mb-4 border-b border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-[34px] font-black text-[#172033] tabular-nums tracking-tight">
                        ₹{price}
                      </span>
                      <span className="text-[11px] sm:text-xs text-[#667085] font-medium">
                        {billingCycle === "yearly"
                          ? gu ? "/ મહિને (વાર્ષિક)" : "/ month (annual)"
                          : gu ? "/ મહિને" : "/ month"}
                      </span>
                    </div>
                    {billingCycle === "yearly" && p.annualTotal > 0 && (
                      <span className="text-[11px] font-medium text-emerald-600 block mt-0.5">
                        {gu ? `વાર્ષિક બિલ: ₹${p.annualTotal}` : `Billed ₹${p.annualTotal} annually`}
                      </span>
                    )}
                  </div>

                  {/* Compact Feature Bullets */}
                  <div className="space-y-2">
                    {p.features.map((feat: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                        <div className="w-4 h-4 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span className="leading-snug">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Action */}
                <div className="pt-5 mt-5 border-t border-slate-100 space-y-2">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => handlePlanClick(p)}
                    className={`w-full h-10 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                      p.popular
                        ? "bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-md shadow-[#2563EB]/20"
                        : isCurrentPlan
                          ? "bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100"
                          : "bg-slate-900 hover:bg-slate-800 text-white"
                    }`}
                  >
                    <span>{isCurrentPlan ? (gu ? "પ્લાન રિન્યૂ કરો" : "Renew Plan") : p.ctaText}</span>
                    <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </motion.button>
                  {isEnterprise && onOpenDemo && (
                    <button
                      type="button"
                      onClick={onOpenDemo}
                      className="w-full text-center text-[11px] font-semibold text-slate-500 hover:text-[#2563EB] py-0.5 transition-colors cursor-pointer"
                    >
                      {gu ? "૧-ઓન-૧ ડેમો કૉલ બુક કરો" : "Book a 1-on-1 personalized demo"}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* RAZORPAY PAYMENT FIRST -> THEN REGISTRATION MODAL */}
      {checkoutPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#172033]/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#E5EAF1] space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E5EAF1]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#172033]">
                    {checkoutPlan.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-medium text-[#667085]">
                      {billingCycle === "yearly" ? "Annual Billing (Save 20%)" : "Monthly Billing"}
                    </span>
                    <span className="text-[#E5EAF1]">•</span>
                    <span className="text-xs font-semibold text-[#2563EB]">
                      {checkoutStep === "payment"
                        ? "Step 1:  Payment"
                        : checkoutStep === "register"
                          ? "Step 2: Business Registration"
                          : "Completed"}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCheckoutPlan(null);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                  setVerifiedPayment(null);
                }}
                className="text-[#667085] hover:text-[#172033] p-1.5 rounded-lg hover:bg-[#F7F9FC] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message Box */}
            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
                {errorMsg.toLowerCase().includes("already exists") && (
                  <div className="pt-1 flex items-center gap-2">
                    <Link
                      href={`/login?redirect=pricing&tier=${checkoutPlan?.tier}&cycle=${billingCycle}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                      <span>{gu ? "હાલના એકાઉન્ટમાં લોગિન કરો" : "Sign In to Existing Account"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* SUCCESS SCREEN */}
            {checkoutStep === "success" && (
              <div className="space-y-4 py-4 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="w-7 h-7 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-[#172033]">Payment Captured & Plan Active!</h4>
                  <p className="text-xs text-[#667085] mt-1.5 max-w-sm mx-auto">
                    {successMsg || "Your subscription is now active with full features and entitlements unlocked."}
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCheckoutPlan(null);
                      router.push("/dashboard");
                    }}
                    className="w-full h-11 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Open Dashboard & Access App
                  </button>
                </div>
              </div>
            )}

            {/* STEP 1: PAYMENT FIRST */}
            {checkoutStep === "payment" && (
              <div className="space-y-4">
                {/* Notice Banner */}
                <div className="p-3.5 bg-[#EFF6FF] border border-[#2563EB]/30 rounded-xl flex items-center gap-3 text-xs text-[#172033] font-medium">
                  <CreditCard className="w-4 h-4 shrink-0 text-[#2563EB]" />
                  <span>
                    {gu
                      ? "પ્રથમ પેમેન્ટ: રેઝરપે દ્વારા પેમેન્ટ સફળ થયા બાદ તરત જ તમારું બિઝનેસ રજીસ્ટ્રેશન થશે."
                      : "First Payment, Then Access: Complete payment via Razorpay to unlock instant business account registration."}
                  </span>
                </div>

                {/* Pre-fill Contact Inputs if unauthenticated */}
                {!user && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-[#172033] uppercase mb-1 tracking-wider">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g. Rajesh Patel"
                        className="w-full px-3.5 py-2.5 bg-[#F7F9FC] border border-[#E5EAF1] rounded-xl text-xs sm:text-sm font-medium text-[#172033] focus:bg-white focus:ring-2 focus:ring-[#2563EB] focus:outline-none transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#172033] uppercase mb-1 tracking-wider">
                          Mobile Number *
                        </label>
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ""))}
                          placeholder="98980 00000"
                          className="w-full px-3.5 py-2.5 bg-[#F7F9FC] border border-[#E5EAF1] rounded-xl text-xs sm:text-sm tabular-nums font-medium text-[#172033] focus:bg-white focus:ring-2 focus:ring-[#2563EB] focus:outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#172033] uppercase mb-1 tracking-wider">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="business@example.com"
                          className="w-full px-3.5 py-2.5 bg-[#F7F9FC] border border-[#E5EAF1] rounded-xl text-xs sm:text-sm font-medium text-[#172033] focus:bg-white focus:ring-2 focus:ring-[#2563EB] focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Price Summary Card */}
                <div className="p-4 rounded-xl bg-[#F7F9FC] border border-[#E5EAF1] space-y-2.5 text-xs">
                  <div className="flex justify-between text-[#667085]">
                    <span>Plan Duration:</span>
                    <span className="font-semibold text-[#172033]">
                      {billingCycle === "yearly" ? "12 Months (1 Year Access)" : "1 Month Access"}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#667085]">
                    <span>Base Subscription Amount:</span>
                    <span className="font-semibold text-[#172033] tabular-nums">
                      ₹ {billingCycle === "yearly" ? checkoutPlan.annualTotal.toLocaleString("en-IN") : checkoutPlan.monthlyPrice.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#667085]">
                    <span>GST (18% SAC 998314):</span>
                    <span className="font-semibold text-[#172033] tabular-nums">
                      ₹ {Math.round((billingCycle === "yearly" ? checkoutPlan.annualTotal : checkoutPlan.monthlyPrice) * 0.18).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="pt-2.5 border-t border-[#E5EAF1] flex justify-between text-sm font-semibold text-[#172033]">
                    <span>Total Amount Payable:</span>
                    <span className="text-[#2563EB] tabular-nums font-semibold text-base">
                      ₹ {Math.round((billingCycle === "yearly" ? checkoutPlan.annualTotal : checkoutPlan.monthlyPrice) * 1.18).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Action CTA */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleInitiatePayment}
                    className="w-full sm:w-auto h-11 px-7 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Opening Razorpay...</span>
                      </>
                    ) : (
                      <>
                        <span>Pay via Razorpay & Continue</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: REGISTRATION FORM (UNLOCKED AFTER PAYMENT) */}
            {checkoutStep === "register" && verifiedPayment && (
              <form onSubmit={handleCompleteRegistration} className="space-y-4">
                {/* Verified Payment Ribbon */}
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold text-emerald-900 block">
                      Payment Verified! (Order #{verifiedPayment.orderId.slice(-8)})
                    </span>
                    <span className="text-emerald-700 text-[11px]">
                      {checkoutPlan.name} is reserved. Complete registration below to access your account.
                    </span>
                  </div>
                </div>

                <div className="space-y-3 text-left">
                  <div>
                    <label className="block text-xs font-semibold text-[#172033] uppercase mb-1 tracking-wider">
                      Your Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#F7F9FC] border border-[#E5EAF1] rounded-xl text-xs sm:text-sm font-medium text-[#172033] focus:bg-white focus:ring-2 focus:ring-[#2563EB] focus:outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#172033] uppercase mb-1 tracking-wider">
                        Mobile Number *
                      </label>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ""))}
                        className="w-full px-3.5 py-2.5 bg-[#F7F9FC] border border-[#E5EAF1] rounded-xl text-xs sm:text-sm tabular-nums font-medium text-[#172033] focus:bg-white focus:ring-2 focus:ring-[#2563EB] focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#172033] uppercase mb-1 tracking-wider">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#F7F9FC] border border-[#E5EAF1] rounded-xl text-xs sm:text-sm font-medium text-[#172033] focus:bg-white focus:ring-2 focus:ring-[#2563EB] focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-[#667085] leading-relaxed">
                    {gu
                      ? "નોંધ: જો આ ઈમેલ વાળો એકાઉન્ટ પહેલેથી હાજર હોય, તો નીચે તમારો જૂનો પાસવર્ડ દાખલ કરો જેથી પ્લાન તમારા એકાઉન્ટ સાથે લિંક થઈ જશે, અથવા ઉપર નવો ઈમેલ દાખલ કરો."
                      : "Note: If an account already exists with this email, enter your existing password below to link this subscription, or edit the email above to register a new account."}
                  </p>

                  <div>
                    <label className="block text-xs font-semibold text-[#172033] uppercase mb-1 tracking-wider">
                      Business / Store Name *
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Shree Ganesh Enterprises"
                      className="w-full px-3.5 py-2.5 bg-[#F7F9FC] border border-[#E5EAF1] rounded-xl text-xs sm:text-sm font-medium text-[#172033] focus:bg-white focus:ring-2 focus:ring-[#2563EB] focus:outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#172033] uppercase mb-1 tracking-wider">
                        Create Password *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 bg-[#F7F9FC] border border-[#E5EAF1] rounded-xl text-xs sm:text-sm font-medium text-[#172033] focus:bg-white focus:ring-2 focus:ring-[#2563EB] focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#172033] uppercase mb-1 tracking-wider">
                        Confirm Password *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 bg-[#F7F9FC] border border-[#E5EAF1] rounded-xl text-xs sm:text-sm font-medium text-[#172033] focus:bg-white focus:ring-2 focus:ring-[#2563EB] focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#172033] uppercase mb-1 tracking-wider">
                      GSTIN (Optional)
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      placeholder="24AAAAA0000A1Z5"
                      className="w-full px-3.5 py-2.5 bg-[#F7F9FC] border border-[#E5EAF1] rounded-xl text-xs sm:text-sm tabular-nums uppercase font-medium text-[#172033] focus:bg-white focus:ring-2 focus:ring-[#2563EB] focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Submit Registration Button */}
                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full h-12 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating Business Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Complete Registration & Access App</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
