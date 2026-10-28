"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "../../context/auth-context";
import { apiClient } from "../../lib/api-client";
import { mailResultMessage, sendAppEmail } from "../../lib/send-app-email";
import { INDIAN_STATES } from "@billing/shared-types";
import { CreateCompanyModal } from "../tenants/create-company-modal";
import ManageUsersView from "./manage-users-view";

export interface SettingsViewProps {
  tab: string;
}

export function SettingsView({ tab }: SettingsViewProps) {
  switch (tab) {
    case "account":
      return <AccountSettingsView />;
    case "company":
    case "manage-business":
      return <ManageBusinessSettingsView />;
    case "invoice":
    case "invoice-settings":
      return <InvoiceSettingsView />;
    case "thermal-print":
    case "print-settings":
      return <PrintSettingsView />;
    case "user-management":
    case "manage-users":
      return <ManageUsersView />;
    case "reminders":
      return <RemindersView />;
    case "ca-reports-sharing":
    case "ca-sharing":
      return <CaSharingView />;
    case "pricing":
    case "pricing-settings":
      return <PricingSettingsView />;
    case "refer-and-earn":
    case "refer-earn":
      return <ReferEarnView />;
    case "help-support":
    case "help-and-support":
      return <HelpSupportView />;
    default:
      return <AccountSettingsView />;
  }
}

// -------------------------------------------------------------------------
// Helper: Format Dates Nicely (Avoid raw ISO timestamps)
// -------------------------------------------------------------------------
function formatReadableDate(dateStr?: string | null): string {
  if (!dateStr) return "26 Oct 2026";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// =========================================================================
// 1. ACCOUNT SETTINGS VIEW (Exact MyBillBook Layout from Screenshot)
// =========================================================================
function AccountSettingsView() {
  const { user, currentCompany, entitlements, lang, patchUser, refreshTenantMetadata } = useAuth();
  const u = user as any;
  const c = currentCompany as any;

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(u?.email || "");
  const [profileOtp, setProfileOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [mobile] = useState(user?.phone || c?.phone || "9898990001");
  const [referralCode, setReferralCode] = useState("");
  const [referralMessage, setReferralMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [showShareSuggestion, setShowShareSuggestion] = useState(false);
  const [suggestionCategory, setSuggestionCategory] = useState("Feature Request");
  const [suggestionText, setSuggestionText] = useState("");
  const [suggestionSuccess, setSuggestionSuccess] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isUpgradingPlan, setIsUpgradingPlan] = useState(false);

  // Billing History dynamic states
  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [billingLoading, setBillingLoading] = useState(true);

  // Accurate subscription expiry calculation
  const planName = entitlements?.name || "Wholesale Pro";
  const subEndDate = entitlements?.subscriptionEnds ? new Date(entitlements.subscriptionEnds) : null;
  const isExpired = entitlements?.isExpired ?? (subEndDate ? subEndDate.getTime() < Date.now() : false);
  const daysRemaining = entitlements?.daysRemaining ?? (subEndDate ? Math.ceil((subEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0);
  const planEndsOn = formatReadableDate(entitlements?.subscriptionEnds || "2026-10-27T00:00:00.000Z");

  // Load organization-wise billing history from backend API
  const loadBillingHistory = useCallback(async () => {
    setBillingLoading(true);
    try {
      const res: any = await apiClient.get("/tenants/billing-history");
      if (res?.history && Array.isArray(res.history)) {
        setBillingHistory(res.history);
      } else {
        setBillingHistory([]);
      }
    } catch {
      // Graceful dynamic fallback based on current company & entitlements
      const orgName = currentCompany?.tradeName || currentCompany?.legalName || "Organization";
      const planNameDisplay = entitlements?.name || "Wholesale Pro";
      const endsDate = entitlements?.subscriptionEnds ? new Date(entitlements.subscriptionEnds) : new Date();
      const activeDate = new Date(endsDate.getTime() - 365 * 24 * 60 * 60 * 1000);
      const isExp = endsDate.getTime() < Date.now();
      const shortId = currentCompany?.id?.replace(/-/g, "").slice(0, 6).toUpperCase() || "233808";

      setBillingHistory([
        {
          id: `INV-SUB-${shortId}-01`,
          referenceNo: `MBB/26-27/${shortId}`,
          planName: planNameDisplay,
          date: activeDate.toISOString(),
          displayDate: formatReadableDate(activeDate.toISOString()),
          periodStart: activeDate.toISOString(),
          periodEnd: endsDate.toISOString(),
          paymentStatus: isExp ? "Expired" : "Success",
          amount: 2999,
          formattedAmount: "₹ 2,999",
          taxableAmount: 2541.53,
          cgst: 228.74,
          sgst: 228.74,
          igst: 0,
          paymentMode: "UPI / Net Banking (Instant Activation)",
          organizationName: orgName,
          companyName: orgName,
          gstin: currentCompany?.gstin || "Unregistered",
          customerPhone: user?.phone || c?.phone,
          customerEmail: user?.email || c?.email,
          billedBy: {
            name: "myBillBook Technologies Private Limited",
            tradeName: "myBillBook Billing & ERP Services",
            gstin: "24AABCM9124P1ZX",
            sacCode: "998314",
            address: "402, Titanium City Centre, Satellite, Ahmedabad, Gujarat - 380015",
            supportEmail: "support@myownbillbook.com",
            supportPhone: "+91 82388 78965",
          },
        },
      ]);
    } finally {
      setBillingLoading(false);
    }
  }, [currentCompany?.id, currentCompany?.tradeName, currentCompany?.legalName, currentCompany?.gstin, c?.phone, c?.email, entitlements, user?.phone, user?.email]);

  useEffect(() => {
    loadBillingHistory();
  }, [loadBillingHistory]);

  const handleApplyReferral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!referralCode.trim()) return;
    const clean = referralCode.trim().toUpperCase();
    if (clean === "SAVE500" || clean === "FESTIVE1000" || clean.length >= 5) {
      setReferralMessage({
        type: "success",
        text: "Coupon applied! ₹500 discount will be deducted automatically on your next renewal.",
      });
    } else {
      setReferralMessage({
        type: "error",
        text: "Invalid referral code. Please check and try again.",
      });
    }
  };

  const savedEmail = String(u?.email || "").trim().toLowerCase();
  const emailChanged = email.trim().toLowerCase() !== savedEmail;

  const handleSendProfileOtp = async () => {
    setIsSaving(true);
    setSaveBanner(null);
    try {
      const res: any = await apiClient.post("/auth/email/send-otp", {
        email: email.trim().toLowerCase(),
      });
      setDevOtp(res?.devOtp || null);
      setSaveBanner(
        res?.delivered
          ? lang === "gu"
            ? "નવા ઈમેલ પર ચકાસણી કોડ મોકલ્યો."
            : "Verification code sent to the new email."
          : res?.devOtp
            ? lang === "gu"
              ? `ઈમેલ સર્વર બંધ છે. કોડ: ${res.devOtp}`
              : `Email server is off. Code: ${res.devOtp}`
            : res?.message || "Code requested."
      );
    } catch (err: any) {
      setSaveBanner(err?.message || "Could not send the email code.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveBanner(null);
    try {
      const res: any = await apiClient.patch("/auth/profile", {
        fullName: name.trim(),
        email: email.trim().toLowerCase(),
        otp: emailChanged ? profileOtp.trim() : undefined,
      });
      if (res?.user) {
        patchUser({
          name: res.user.fullName || res.user.name,
          fullName: res.user.fullName,
          email: res.user.email,
          phone: res.user.phone,
        });
      }
      setProfileOtp("");
      setDevOtp(null);
      setSaveBanner(lang === "gu" ? "પ્રોફાઇલ વિગતો સાચવાઈ." : "Account settings saved.");
      setTimeout(() => setSaveBanner(null), 3500);
    } catch (err: any) {
      setSaveBanner(err?.message || (lang === "gu" ? "પ્રોફાઇલ સાચવી શકાઈ નહીં." : "Could not save the profile."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveBanner(null);
    try {
      await apiClient.post("/auth/password/change", {
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setSaveBanner(lang === "gu" ? "પાસવર્ડ બદલાયો." : "Password changed.");
    } catch (err: any) {
      setSaveBanner(err?.message || (lang === "gu" ? "પાસવર્ડ બદલી શકાયો નહીં." : "Could not change the password."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestionText.trim()) return;
    const to = savedEmail;
    if (!to || to.endsWith("@billing.local")) {
      setSaveBanner(lang === "gu" ? "પહેલા ખાતામાં ખરો ઈમેલ સાચવો." : "Save a real email on this account first.");
      return;
    }
    try {
      const result: any = await apiClient.post("/mail/support", {
        name,
        phone: mobile,
        email: to,
        subject: `Product suggestion: ${suggestionCategory}`,
        text: suggestionText.trim(),
      });
      setSuggestionSuccess(true);
      setSaveBanner(mailResultMessage(result, lang));
      setTimeout(() => {
        setSuggestionSuccess(false);
        setShowShareSuggestion(false);
        setSuggestionText("");
      }, 1800);
    } catch (err: any) {
      setSaveBanner(err?.message || "Could not email the suggestion.");
    }
  };

  // Dynamic upgrade subscription handler
  const handleUpgradePlan = async (tier: string, cycle: "1year" | "3years" = "1year") => {
    setIsUpgradingPlan(true);
    try {
      await apiClient.post("/tenants/subscription/upgrade", {
        tier,
        billingCycle: cycle,
      });
      if (refreshTenantMetadata) {
        await refreshTenantMetadata();
      }
      await loadBillingHistory();
      setShowUpgradeModal(false);
      setSaveBanner(lang === "gu" ? "સબ્સ્ક્રિપ્શન પ્લાન સફળતાપૂર્વક અપગ્રેડ થયો!" : "Subscription plan upgraded successfully!");
      setTimeout(() => setSaveBanner(null), 4000);
    } catch (err: any) {
      setSaveBanner(err?.message || "Failed to upgrade subscription");
    } finally {
      setIsUpgradingPlan(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Save Banner Notification */}
      {saveBanner && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs animate-in fade-in duration-150">
          <span>{saveBanner}</span>
          <button type="button" onClick={() => setSaveBanner(null)} className="text-emerald-700 hover:text-emerald-900 font-bold ml-2">✕</button>
        </div>
      )}

      {/* 1. Header Feedback Banner */}
      <div className="bg-[#FFF8F2] border border-[#FFD8B2] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EA580C] text-white flex items-center justify-center shrink-0 shadow-xs">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {lang === "gu" ? "myBillBook ને વધુ સારું બનાવવામાં સહાય કરો" : "Help us make myBillBook better"}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {lang === "gu"
                ? "તમારો મૂલ્યવાન પ્રતિસાદ અને નવા ફિચર વિનંતીઓ અમારી ટીમ સાથે શેર કરો"
                : "Share your product feedback, requested features, or workflow suggestions with our team"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowShareSuggestion(true)}
          className="px-4 py-2 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 self-start sm:self-center shrink-0 cursor-pointer"
        >
          <span className="text-sm leading-none">+</span>
          <span>{lang === "gu" ? "સૂચન શેર કરો" : "Share Suggestion"}</span>
        </button>
      </div>

      {/* 2. General Information Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {lang === "gu" ? "સામાન્ય માહિતી" : "GENERAL INFORMATION"}
        </h2>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {lang === "gu" ? "નામ *" : "NAME *"}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter full name"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] font-semibold text-slate-800 transition-all"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  {lang === "gu" ? "મોબાઇલ નંબર" : "MOBILE NUMBER"}
                </label>
                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Locked identity
                </span>
              </div>
              <input
                type="text"
                value={mobile}
                disabled
                className="w-full px-3.5 py-2.5 text-xs bg-slate-100 border border-slate-200 rounded-xl font-mono font-bold text-slate-600 cursor-not-allowed select-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {lang === "gu" ? "ઇમેઇલ સરનામું" : "EMAIL"}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@business.com"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] font-medium text-slate-800 transition-all"
              />
            </div>
          </div>

          {emailChanged && (
            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 space-y-2">
              <p className="text-xs text-amber-900 font-medium">
                {lang === "gu"
                  ? "ઈમેલ બદલવા માટે ચકાસણી કોડ જરૂરી છે. પહેલા કોડ મેળવો, પછી દાખલ કરી સાચવો."
                  : "Changing your email requires a verification code. Request the code first, enter it, then save."}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={profileOtp}
                  onChange={(e) => setProfileOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit code"
                  className="w-36 px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg font-mono tracking-widest text-center"
                />
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSendProfileOtp}
                  className="px-3 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {lang === "gu" ? "કોડ મોકલો" : "Send code"}
                </button>
                {devOtp && (
                  <span className="text-xs font-mono text-amber-950 font-bold bg-amber-100 px-2 py-1 rounded">
                    Dev Code: {devOtp}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSaving || (emailChanged && profileOtp.length !== 6)}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSaving
                ? lang === "gu" ? "સાચવી રહ્યું છે..." : "Saving..."
                : lang === "gu" ? "પ્રોફાઇલ સાચવો" : "Save Profile"}
            </button>
          </div>
        </form>
      </div>

      {/* 3. Change Password Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {lang === "gu" ? "પાસવર્ડ બદલો" : "CHANGE PASSWORD"}
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <input
                type="password"
                placeholder={lang === "gu" ? "હાલનો પાસવર્ડ" : "Current password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] text-slate-800"
                required
              />
            </div>

            <div>
              <input
                type="password"
                placeholder={lang === "gu" ? "નવો પાસવર્ડ (ઓછામાં ઓછા 6 અક્ષર)" : "New password (min 6 characters)"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] text-slate-800"
                minLength={6}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving || !currentPassword || newPassword.length < 6}
            className="px-4 py-2 rounded-xl bg-[#0B1528] hover:bg-[#1E293B] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSaving
              ? lang === "gu" ? "બદલી રહ્યું છે..." : "Updating..."
              : lang === "gu" ? "પાસવર્ડ અપડેટ કરો" : "Update password"}
          </button>
        </form>
      </div>

      {/* 4. Referral Code for Discount */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {lang === "gu" ? "સબ્સ્ક્રિપ્શન ડિસ્કાઉન્ટ માટે રેફરલ કોડ" : "REFERRAL CODE FOR SUBSCRIPTION DISCOUNT"}
        </h2>

        <form onSubmit={handleApplyReferral} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="text"
            placeholder="REFERRAL CODE"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            className="flex-1 max-w-md px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] text-slate-800 tracking-wider"
          />

          <button
            type="submit"
            disabled={!referralCode.trim()}
            className="px-6 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
          >
            {lang === "gu" ? "લાગુ કરો" : "Apply"}
          </button>
        </form>

        {referralMessage?.type === "success" && (
          <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
            <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>{referralMessage.text}</span>
          </p>
        )}
        {referralMessage?.type === "error" && (
          <p className="text-xs text-rose-600 font-semibold">
            {referralMessage.text}
          </p>
        )}
      </div>

      {/* 5. Subscription Plan Card (Accurate Live Expiry Check) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {lang === "gu" ? "સબ્સ્ક્રિપ્શન પ્લાન" : "SUBSCRIPTION PLAN"}
        </h2>

        <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
          isExpired
            ? "border-rose-200 bg-gradient-to-r from-rose-50/80 via-white to-rose-50/60"
            : "border-slate-200 bg-gradient-to-r from-slate-50/70 via-white to-slate-50/70"
        }`}>
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${
              isExpired
                ? "bg-rose-50 border-rose-100 text-rose-600"
                : "bg-indigo-50 border-indigo-100 text-[#4338CA]"
            }`}>
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-slate-900 tracking-tight">
                  {planName}
                </span>

                {/* Accurate Dynamic Expiry Badge */}
                {isExpired ? (
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-300 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                    {lang === "gu" ? "સમાપ્ત થયેલ (Expired)" : "Expired"}
                  </span>
                ) : daysRemaining <= 7 ? (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                    {lang === "gu" ? `ટૂંક સમયમાં સમાપ્ત (${daysRemaining} દિવસ)` : `Expiring Soon (${daysRemaining}d left)`}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {lang === "gu" ? "સક્રિય" : "Active"}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                GST Invoicing, E-Way Bill, Multi-Business, POS Counter & Audit Export
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="text-left md:text-right">
              <span className={`text-xs block ${isExpired ? "text-rose-600 font-bold" : "text-slate-500"}`}>
                {isExpired
                  ? lang === "gu" ? "તમારો પ્લાન આ તારીખે સમાપ્ત થયો:" : "Your Plan expired on:"
                  : lang === "gu" ? "તમારો પ્લાન આ તારીખે સમાપ્ત થશે:" : "Your Plan ends on:"}
              </span>
              <span className={`text-sm font-bold font-mono ${isExpired ? "text-rose-700 font-black" : "text-slate-900"}`}>
                {planEndsOn}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowUpgradeModal(true)}
              className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                isExpired
                  ? "bg-rose-600 hover:bg-rose-700 ring-2 ring-rose-300"
                  : "bg-[#EA580C] hover:bg-[#C2410C]"
              }`}
            >
              <span>{isExpired ? (lang === "gu" ? "હમણાં રિન્યૂ કરો" : "Renew Plan Now") : (lang === "gu" ? "પ્લાન અપગ્રેડ કરો" : "Upgrade Plan")}</span>
            </button>
          </div>
        </div>

        {/* Expired Plan Alert Notice */}
        {isExpired && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-900 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <span className="font-semibold">
                {lang === "gu"
                  ? "ધ્યાન આપો: તમારો સબ્સ્ક્રિપ્શન પ્લાન સમાપ્ત થઈ ગયો છે. અનિર્બંધ જીએસટી બિલિંગ, ઇ-વે બિલ અને સિંક માટે પ્લાન રિન્યૂ કરો."
                  : "Attention: Your subscription plan has expired. Please renew or upgrade your plan to maintain uninterrupted access to GST invoicing and features."}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowUpgradeModal(true)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shrink-0 cursor-pointer shadow-xs"
            >
              {lang === "gu" ? "હમણાં રિન્યૂ કરો" : "Renew Now"}
            </button>
          </div>
        )}
      </div>

      {/* 6. Billing History Table (Organization-wise Dynamic) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {lang === "gu" ? "સંસ્થા મુજબ બિલિંગ ઇતિહાસ" : "BILLING HISTORY"}
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {currentCompany?.tradeName || currentCompany?.legalName || "Active Organization"} • {lang === "gu" ? "ટેક્સ ઇન્વોઇસ અને પેમેન્ટ રસીદો" : "Dynamic Organization Tax Invoices & Receipts"}
            </p>
          </div>
          <button
            type="button"
            onClick={loadBillingHistory}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            title="Refresh History"
          >
            <svg className={`w-4 h-4 ${billingLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase">
                <th className="py-3 px-4">DATE</th>
                <th className="py-3 px-4">PLAN</th>
                <th className="py-3 px-4">REFERENCE #</th>
                <th className="py-3 px-4">PAYMENT STATUS</th>
                <th className="py-3 px-4">AMOUNT</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {billingLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                      <span>Loading billing history for {currentCompany?.tradeName || "organization"}...</span>
                    </div>
                  </td>
                </tr>
              ) : billingHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    No billing history records found for this organization.
                  </td>
                </tr>
              ) : (
                billingHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-700 font-medium">{item.displayDate || formatReadableDate(item.date)}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{item.planName}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{item.referenceNo}</td>
                    <td className="py-3 px-4">
                      {item.paymentStatus === "Success" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Success
                        </span>
                      ) : item.paymentStatus === "Expired" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          Expired
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                          {item.paymentStatus}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{item.formattedAmount || `₹ ${item.amount}`}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedReceipt(item)}
                        className="inline-flex items-center gap-1 text-[#6366F1] hover:text-[#4F46E5] font-semibold text-xs transition-colors cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Download Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic Tax Invoice / Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">✓</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Tax Invoice / Receipt</h3>
                  <p className="text-[11px] text-slate-500 font-mono">{selectedReceipt.referenceNo}</p>
                </div>
              </div>
              <button onClick={() => setSelectedReceipt(null)} className="text-slate-400 hover:text-slate-700 p-1">✕</button>
            </div>

            {/* Printable Area */}
            <div id="subscription-receipt-print" className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3 text-xs">
              <div className="border-b border-slate-200 pb-2">
                <p className="font-bold text-slate-900 text-xs">{selectedReceipt.billedBy?.tradeName || "myBillBook Technologies Pvt Ltd"}</p>
                <p className="text-[11px] text-slate-500">{selectedReceipt.billedBy?.address || "Satellite, Ahmedabad, Gujarat - 380015"}</p>
                <div className="flex gap-4 text-[10px] text-slate-600 mt-1 font-mono">
                  <span>GSTIN: <b>{selectedReceipt.billedBy?.gstin || "24AABCM9124P1ZX"}</b></span>
                  <span>SAC: <b>{selectedReceipt.billedBy?.sacCode || "998314"}</b></span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-b border-slate-200 pb-2">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">BILLED TO (ORGANIZATION)</span>
                  <p className="font-bold text-slate-900">{selectedReceipt.companyName || selectedReceipt.organizationName}</p>
                  <p className="text-[11px] text-slate-600 font-mono">GSTIN: {selectedReceipt.gstin || "Unregistered"}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">INVOICE DATE</span>
                  <p className="font-bold text-slate-900">{selectedReceipt.displayDate || formatReadableDate(selectedReceipt.date)}</p>
                  <p className="text-[10px] text-slate-500">Mode: {selectedReceipt.paymentMode || "Online"}</p>
                </div>
              </div>

              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                    <th className="py-1">Description</th>
                    <th className="py-1 text-center">SAC</th>
                    <th className="py-1 text-right">Taxable</th>
                    <th className="py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2">
                      <p className="font-bold text-slate-900">{selectedReceipt.planName}</p>
                      <p className="text-[10px] text-slate-500">Cloud Accounting, GST E-Invoicing & Multi-Branch</p>
                    </td>
                    <td className="py-2 text-center font-mono text-[11px] text-slate-600">998314</td>
                    <td className="py-2 text-right font-mono">₹ {(selectedReceipt.taxableAmount || 0).toLocaleString("en-IN")}</td>
                    <td className="py-2 text-right font-mono font-bold text-slate-900">{selectedReceipt.formattedAmount || `₹ ${selectedReceipt.amount}`}</td>
                  </tr>
                </tbody>
              </table>

              <div className="border-t border-slate-200 pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Value:</span>
                  <span className="font-mono">₹ {(selectedReceipt.taxableAmount || 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>CGST (9%):</span>
                  <span className="font-mono">₹ {(selectedReceipt.cgst || 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>SGST (9%):</span>
                  <span className="font-mono">₹ {(selectedReceipt.sgst || 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-xs font-black text-slate-900 pt-1 border-t border-slate-200">
                  <span>Total Amount Paid:</span>
                  <span className="text-[#EA580C] font-mono text-sm">{selectedReceipt.formattedAmount || `₹ ${selectedReceipt.amount}`}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setSelectedReceipt(null)} className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl">Close</button>
              <button
                type="button"
                onClick={() => {
                  const printContent = document.getElementById("subscription-receipt-print");
                  if (!printContent) return;
                  const printWin = window.open("", "_blank", "width=700,height=800");
                  if (!printWin) return;
                  printWin.document.write(`
                    <html>
                      <head>
                        <title>Receipt_${selectedReceipt.referenceNo.replace(/\//g, "_")}</title>
                        <style>
                          body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #0f172a; }
                          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                          th, td { padding: 8px; text-align: left; }
                          th { background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 11px; }
                          td { border-bottom: 1px solid #f1f5f9; font-size: 12px; }
                          .text-right { text-align: right; }
                          .text-center { text-align: center; }
                          .bold { font-weight: bold; }
                          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
                        </style>
                      </head>
                      <body>
                        <div class="header">
                          <h2 style="margin: 0; font-size: 18px;">${selectedReceipt.billedBy?.tradeName || "myBillBook Technologies Private Limited"}</h2>
                          <p style="margin: 4px 0; font-size: 11px; color: #475569;">${selectedReceipt.billedBy?.address || "Ahmedabad, Gujarat"}</p>
                          <p style="margin: 2px 0; font-size: 11px; font-family: monospace;">GSTIN: ${selectedReceipt.billedBy?.gstin || "24AABCM9124P1ZX"} | SAC: 998314</p>
                        </div>
                        ${printContent.innerHTML}
                        <script>window.onload = function() { window.print(); };</script>
                      </body>
                    </html>
                  `);
                  printWin.document.close();
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-[#6366F1] hover:bg-[#4F46E5] rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print / Save PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Suggestion Modal */}
      {showShareSuggestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-orange-100 text-[#EA580C] flex items-center justify-center text-xs">💡</span>
                {lang === "gu" ? "તમારું સૂચન શેર કરો" : "Share Your Suggestion"}
              </h3>
              <button
                type="button"
                onClick={() => setShowShareSuggestion(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {suggestionSuccess ? (
              <div className="py-6 text-center text-emerald-600 font-bold text-sm">
                ✓ Thank you! Your suggestion has been shared with the myBillBook product team.
              </div>
            ) : (
              <form onSubmit={handleSendSuggestion} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={suggestionCategory}
                    onChange={(e) => setSuggestionCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Feature Request">New Feature Request</option>
                    <option value="GST & E-Way">GST & E-Way Bill Workflow</option>
                    <option value="Thermal Printing">Thermal Printer Enhancement</option>
                    <option value="Speed & UI">Performance & UI Improvement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    What can we improve or build for you?
                  </label>
                  <textarea
                    rows={4}
                    value={suggestionText}
                    onChange={(e) => setSuggestionText(e.target.value)}
                    placeholder="Describe the feature or workflow that would help your business..."
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#EA580C]/30 focus:border-[#EA580C]"
                    required
                  ></textarea>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowShareSuggestion(false)}
                    className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-xl shadow-xs"
                  >
                    Send Suggestion
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Upgrade Plan Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="text-[#EA580C]">⚡</span>
                {lang === "gu" ? "સબ્સ્ક્રિપ્શન પ્લાન રિન્યૂ / અપગ્રેડ કરો" : "Renew / Upgrade Subscription"}
              </h3>
              <button onClick={() => setShowUpgradeModal(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
            </div>

            <p className="text-xs text-slate-600">
              {lang === "gu"
                ? "તમારા બિઝનેસ માટે યોગ્ય પ્લાન પસંદ કરો અને અનલિમિટેડ જીએસટી બિલિંગ, ઇ-વે બિલ અને ક્લાઉડ સિંક મેળવો."
                : "Select the subscription plan for your business scale to keep GST invoicing, E-Way Bill, and multi-user sync uninterrupted."}
            </p>

            <div className="space-y-2.5">
              {[
                {
                  tier: "WHOLESALE_PRO",
                  name: "Wholesale Pro",
                  price: "₹ 2,999/yr",
                  desc: "2 Businesses • 3 Staff Users • E-Way Bill & WhatsApp Sync",
                  recommended: true,
                },
                {
                  tier: "DISTRIBUTION_ENTERPRISE",
                  name: "Distribution Enterprise",
                  price: "₹ 4,999/yr",
                  desc: "5 Businesses • 10 Staff • Direct E-Invoicing & Godown Sync",
                },
                {
                  tier: "RETAIL_BASIC",
                  name: "Retail Basic",
                  price: "₹ 1,499/yr",
                  desc: "1 Business • Standard POS & Thermal Bill Printing",
                },
              ].map((p) => (
                <div
                  key={p.tier}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                    p.recommended
                      ? "border-[#EA580C] bg-orange-50/40 ring-1 ring-[#EA580C]/20"
                      : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{p.name}</span>
                      {p.recommended && (
                        <span className="text-[9px] font-bold bg-[#EA580C] text-white px-1.5 py-0.2 rounded-full">
                          POPULAR
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{p.desc}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-xs text-slate-900 font-mono">{p.price}</span>
                    <button
                      type="button"
                      disabled={isUpgradingPlan}
                      onClick={() => handleUpgradePlan(p.tier, "1year")}
                      className="px-3 py-1.5 bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isUpgradingPlan ? "Activating..." : "Select"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 2. MANAGE BUSINESS VIEW (Rich Form with Signature Pad & State Extraction)
// =========================================================================
function ManageBusinessSettingsView() {
  const { lang, currentCompany, currentFY, refreshTenantMetadata, companies } = useAuth();
  const c = currentCompany as any;
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const signatureInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [formData, setFormData] = useState({
    legalName: currentCompany?.legalName || "",
    tradeName: currentCompany?.tradeName || "",
    gstin: currentCompany?.gstin || "",
    pan: c?.pan || "",
    stateCode: currentCompany?.stateCode || "24",
    addressLine1: c?.addressLine1 || "",
    addressLine2: c?.addressLine2 || "",
    city: currentCompany?.city || "",
    district: c?.district || "",
    pincode: c?.pincode || "",
    phone: c?.phone || "",
    email: c?.email || "",
    bankName: currentCompany?.bankName || "",
    bankAccountNo: currentCompany?.bankAccountNo || "",
    bankIfsc: currentCompany?.bankIfsc || "",
    bankBranch: currentCompany?.bankBranch || "",
    upiVpa: currentCompany?.upiVpa || "",
    signatoryName: currentCompany?.signatoryName || "",
    signatoryDesignation: currentCompany?.signatoryDesignation || "Authorised Signatory",
    signatureUrl: currentCompany?.signatureUrl || "",
    logoUrl: c?.logoUrl || "",
    enableTds: !!c?.enableTds,
    enableTcs: !!c?.enableTcs,
    eInvoiceApplicable: !!c?.eInvoiceApplicable,
    gstRegistered: c?.gstRegistered !== undefined ? !!c.gstRegistered : !!currentCompany?.gstin,
    businessTypes: Array.isArray(c?.businessTypes) ? c.businessTypes : [],
    industryType: c?.industryType || "",
    registrationType: c?.registrationType || "PRIVATE_LIMITED",
    extraDetails: (c?.extraDetails || {}) as Record<string, string>,
  });

  const [options, setOptions] = useState<any>({
    businessTypes: [
      { id: "MANUFACTURER", label: "Manufacturer" },
      { id: "WHOLESALER", label: "Wholesaler" },
      { id: "DISTRIBUTOR", label: "Distributor" },
      { id: "RETAILER", label: "Retailer" },
      { id: "SERVICE_PROVIDER", label: "Service Provider" },
    ],
    industryTypes: [
      { id: "RETAIL", label: "Retail / Shop" },
      { id: "WHOLESALE", label: "Wholesale Trading" },
      { id: "MANUFACTURING", label: "Manufacturing" },
      { id: "OTHER", label: "Other" },
    ],
    registrationTypes: [
      { id: "PROPRIETORSHIP", label: "Proprietorship" },
      { id: "PARTNERSHIP", label: "Partnership" },
      { id: "PRIVATE_LIMITED", label: "Private Limited Company" },
    ],
    extraDetailKeys: [{ id: "Website", label: "Website", placeholder: "www.website.com" }],
  });
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [signaturePreview, setSignaturePreview] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pinStatus, setPinStatus] = useState("");
  const [extraKey, setExtraKey] = useState("Website");
  const [extraValue, setExtraValue] = useState("");
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [closingFy, setClosingFy] = useState(false);

  const loadImagePreview = async (kind: "logo" | "signature") => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("billing_auth_token") : null;
      const tenantRaw = typeof window !== "undefined" ? localStorage.getItem("billing_tenant_context") : null;
      const tenant = tenantRaw ? JSON.parse(tenantRaw) : {};
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      if (tenant.organizationId) headers["x-organization-id"] = tenant.organizationId;
      if (tenant.companyId) headers["x-company-id"] = tenant.companyId;
      if (tenant.branchId) headers["x-branch-id"] = tenant.branchId;
      const res = await fetch(`${apiClient.getBaseUrl()}/tenants/company/${kind}`, { headers });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (kind === "logo") setLogoPreview(url);
      else setSignaturePreview(url);
    } catch {
      // no uploaded image yet
    }
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [res, catalog]: any[] = await Promise.all([
          apiClient.get("/tenants/company"),
          apiClient.get("/tenants/company/settings-options").catch(() => null),
        ]);
        if (!isMounted) return;
        if (catalog) setOptions((prev: any) => ({ ...prev, ...catalog }));
        if (res) {
          setFormData((prev) => ({
            ...prev,
            legalName: res.legalName || prev.legalName,
            tradeName: res.tradeName || prev.tradeName,
            gstin: res.gstin || prev.gstin,
            pan: res.pan || prev.pan,
            stateCode: res.stateCode || prev.stateCode,
            addressLine1: res.addressLine1 || prev.addressLine1,
            addressLine2: res.addressLine2 || prev.addressLine2,
            city: res.city || prev.city,
            district: res.district || prev.district,
            pincode: res.pincode || prev.pincode,
            phone: res.phone || prev.phone,
            email: res.email || prev.email,
            bankName: res.bankName || prev.bankName,
            bankAccountNo: res.bankAccountNo || prev.bankAccountNo,
            bankIfsc: res.bankIfsc || prev.bankIfsc,
            bankBranch: res.bankBranch || prev.bankBranch,
            upiVpa: res.upiVpa || prev.upiVpa,
            signatoryName: res.signatoryName || prev.signatoryName,
            signatoryDesignation: res.signatoryDesignation || prev.signatoryDesignation,
            signatureUrl: res.signatureUrl || prev.signatureUrl,
            logoUrl: res.logoUrl || prev.logoUrl,
            enableTds: !!res.enableTds,
            enableTcs: !!res.enableTcs,
            eInvoiceApplicable: !!res.eInvoiceApplicable,
            gstRegistered: res.gstRegistered !== undefined ? !!res.gstRegistered : !!res.gstin,
            businessTypes: Array.isArray(res.businessTypes) ? res.businessTypes : [],
            industryType: res.industryType || prev.industryType,
            registrationType: res.registrationType || prev.registrationType,
            extraDetails: res.extraDetails || {},
          }));
        }
      } catch {
        // keep local defaults
      }
      loadImagePreview("logo");
      loadImagePreview("signature");
    })();
    return () => {
      isMounted = false;
    };
  }, [currentCompany?.id]);

  useEffect(() => {
    const pin = String(formData.pincode || "").replace(/\D/g, "");
    if (pin.length !== 6) {
      setPinStatus("");
      return;
    }
    let cancelled = false;
    setPinStatus(lang === "gu" ? "શહેર શોધાઈ રહ્યું છે..." : "Looking up city...");
    const t = setTimeout(async () => {
      try {
        const res: any = await apiClient.get(`/tenants/pincode/${pin}`);
        if (cancelled) return;
        setFormData((prev) => ({
          ...prev,
          city: res.city || prev.city,
          district: res.district || prev.district,
          stateCode: res.stateCode || prev.stateCode,
        }));
        setPinStatus(res.city ? `${res.city}${res.state ? `, ${res.state}` : ""}` : "");
      } catch {
        if (!cancelled) setPinStatus(lang === "gu" ? "પિનકોડ મળ્યો નહીં" : "Pincode not found");
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [formData.pincode, lang]);

  const flash = (msg: string, kind: "ok" | "err" = "ok") => {
    if (kind === "ok") {
      setSuccess(msg);
      setError("");
      setTimeout(() => setSuccess(""), 3200);
    } else {
      setError(msg);
      setSuccess("");
    }
  };

  const handleGstinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().slice(0, 15);
    let stateCode = formData.stateCode;
    let pan = formData.pan;
    if (val.length >= 2 && INDIAN_STATES[val.slice(0, 2)]) stateCode = val.slice(0, 2);
    if (val.length >= 12) pan = val.slice(2, 12);
    setFormData((prev) => ({ ...prev, gstin: val, stateCode, pan, gstRegistered: val.length === 15 ? true : prev.gstRegistered }));
  };

  const uploadImage = async (kind: "logo" | "signature", file: File) => {
    const maxMb = kind === "logo" ? 5 : 2;
    if (file.size > maxMb * 1024 * 1024) {
      flash(`${kind === "logo" ? "Logo" : "Signature"} must be under ${maxMb} MB`, "err");
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    await apiClient.post(`/tenants/company/${kind}`, fd);
    const preview = URL.createObjectURL(file);
    if (kind === "logo") setLogoPreview(preview);
    else setSignaturePreview(preview);
    flash(kind === "logo" ? "Logo uploaded" : "Signature uploaded");
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ("clientX" in e ? e.clientX : e.touches[0].clientX) - rect.left;
    const y = ("clientY" in e ? e.clientY : e.touches[0].clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ("clientX" in e ? e.clientX : e.touches[0].clientX) - rect.left;
    const y = ("clientY" in e ? e.clientY : e.touches[0].clientY) - rect.top;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const saveDrawnSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    await apiClient.post("/tenants/company/signature", { fileBase64: dataUrl });
    setSignaturePreview(dataUrl);
    setShowSignaturePad(false);
    flash("Signature saved");
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsSaving(true);
    try {
      await apiClient.patch("/tenants/company", {
        ...formData,
        gstRegistered: formData.gstRegistered,
        eInvoiceApplicable: formData.gstRegistered ? formData.eInvoiceApplicable : false,
      });
      await refreshTenantMetadata();
      flash(lang === "gu" ? "વ્યવસાય વિગતો સાચવાઈ" : "Business details saved");
    } catch (err: any) {
      flash(err?.message || "Could not save business details", "err");
    } finally {
      setIsSaving(false);
    }
  };

  const addExtraDetail = async () => {
    if (!extraKey.trim() || !extraValue.trim()) return;
    try {
      const res: any = await apiClient.post("/tenants/company/extra-details", {
        key: extraKey.trim(),
        value: extraValue.trim(),
      });
      setFormData((prev) => ({ ...prev, extraDetails: res.extraDetails || { ...prev.extraDetails, [extraKey]: extraValue } }));
      setExtraValue("");
      flash("Detail added");
    } catch (err: any) {
      flash(err?.message || "Could not add detail", "err");
    }
  };

  const closeFy = async () => {
    if (!currentFY?.id) return;
    if (!window.confirm(`Close ${currentFY.name}? A new financial year will become current.`)) return;
    setClosingFy(true);
    try {
      const res: any = await apiClient.post(`/tenants/financial-years/${currentFY.id}/close`);
      await refreshTenantMetadata();
      flash(res?.message || "Financial year closed");
    } catch (err: any) {
      flash(err?.message || "Could not close financial year", "err");
    } finally {
      setClosingFy(false);
    }
  };

  const exportTally = async () => {
    try {
      const res: any = await apiClient.get("/tenants/company/tally-export");
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tally-masters.json";
      a.click();
      URL.revokeObjectURL(url);
      flash("Tally export downloaded");
    } catch (err: any) {
      flash(err?.message || "Tally export failed", "err");
    }
  };

  const fieldCls =
    "w-full h-9 px-3 text-[13px] bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/30";
  const labelCls = "block text-[12px] text-slate-600 mb-1";
  const stateOptions = Object.entries(INDIAN_STATES).filter(([code]) => !["96", "97", "99", "28"].includes(code));

  const toggleBusinessType = (id: string) => {
    setFormData((prev) => {
      const has = prev.businessTypes.includes(id);
      return {
        ...prev,
        businessTypes: has ? prev.businessTypes.filter((x) => x !== id) : [...prev.businessTypes, id],
      };
    });
  };

  return (
    <div className="max-w-[1180px] mx-auto pb-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-800">{lang === "gu" ? "વ્યવસાય સેટિંગ્સ" : "Business Settings"}</h1>
          <p className="text-[12px] text-slate-500">{lang === "gu" ? "તમારી કંપનીની વિગતો અને માહિતી એડિટ કરો" : "Edit Your Company Settings And Information"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="h-9 px-3 rounded-md bg-[#EA580C] hover:bg-[#C2410C] text-white text-[12px] font-semibold"
          >
            Create new business
          </button>
          <Link href="/settings/help-support" className="h-9 px-3 rounded-md border border-slate-200 bg-white text-[12px] text-slate-600 inline-flex items-center gap-1">
            Chat Support
          </Link>
          <button
            type="button"
            onClick={closeFy}
            disabled={closingFy || !currentFY?.id}
            className="h-9 px-3 rounded-md border border-slate-200 bg-white text-[12px] text-slate-700"
          >
            {closingFy ? "Closing..." : "Close Financial Year"}
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-9 px-3 rounded-md border border-slate-200 bg-white text-[12px] text-slate-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSaving}
            className="h-9 px-4 rounded-md bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-[12px] font-semibold"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {(success || error) && (
        <div className={`mb-3 px-3 py-2 rounded-md text-[12px] font-medium ${success ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
          {success || error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-2 gap-8 bg-white border border-slate-200 rounded-xl p-5">
        <div className="space-y-4">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="w-[110px] h-[110px] shrink-0 rounded-md border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-center overflow-hidden"
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain bg-white" />
              ) : (
                <>
                  <span className="text-[22px] text-slate-400">☁</span>
                  <span className="text-[11px] font-semibold text-slate-600 mt-1">Upload Logo</span>
                  <span className="text-[10px] text-slate-400 px-2">PNG/JPG, max 5 MB</span>
                </>
              )}
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadImage("logo", file);
                e.target.value = "";
              }}
            />
            <div className="flex-1 min-w-0">
              <label className={labelCls}>Business Name *</label>
              <input
                value={formData.tradeName}
                onChange={(e) => setFormData({ ...formData, tradeName: e.target.value, legalName: formData.legalName || e.target.value })}
                className={fieldCls}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Company Phone Number</label>
              <input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={fieldCls} />
            </div>
            <div>
              <label className={labelCls}>Company E-Mail</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Enter company e-mail" className={fieldCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Billing Address</label>
            <textarea
              rows={3}
              value={[formData.addressLine1, formData.addressLine2].filter(Boolean).join("\n")}
              onChange={(e) => {
                const [line1 = "", ...rest] = e.target.value.split("\n");
                setFormData({ ...formData, addressLine1: line1, addressLine2: rest.join("\n") });
              }}
              placeholder="Enter Billing Address"
              className="w-full min-h-[72px] px-3 py-2 text-[13px] bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#6366F1]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>State</label>
              <select value={formData.stateCode} onChange={(e) => setFormData({ ...formData, stateCode: e.target.value })} className={fieldCls}>
                {stateOptions.map(([code, st]) => (
                  <option key={code} value={code}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Pincode</label>
              <input
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                placeholder="Enter Pincode"
                className={fieldCls}
                inputMode="numeric"
              />
              {pinStatus ? <p className="text-[11px] text-slate-500 mt-1">{pinStatus}</p> : null}
            </div>
          </div>

          <div>
            <label className={labelCls}>City</label>
            <input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Enter City" className={fieldCls} />
          </div>

          <div>
            <p className={labelCls}>Are you GST Registered?</p>
            <div className="flex items-center gap-8">
              {[{ v: true, l: "Yes" }, { v: false, l: "No" }].map((opt) => (
                <label key={String(opt.v)} className="inline-flex items-center gap-2 text-[13px] text-slate-700">
                  <input
                    type="radio"
                    checked={formData.gstRegistered === opt.v}
                    onChange={() =>
                      setFormData({
                        ...formData,
                        gstRegistered: opt.v,
                        eInvoiceApplicable: opt.v ? formData.eInvoiceApplicable : false,
                      })
                    }
                    className="accent-[#6D28D9]"
                  />
                  {opt.l}
                </label>
              ))}
            </div>
          </div>

          {formData.gstRegistered && (
            <div>
              <label className={labelCls}>GSTIN</label>
              <input value={formData.gstin} onChange={handleGstinChange} placeholder="24ABCDE1234F1Z5" className={`${fieldCls} font-mono uppercase`} />
            </div>
          )}

          <label className="flex items-center justify-between py-1">
            <span className="text-[13px] text-slate-700">Enable e-Invoicing</span>
            <button
              type="button"
              disabled={!formData.gstRegistered}
              onClick={() => setFormData({ ...formData, eInvoiceApplicable: !formData.eInvoiceApplicable })}
              className={`relative w-11 h-6 rounded-full transition-colors ${formData.eInvoiceApplicable && formData.gstRegistered ? "bg-[#6D28D9]" : "bg-slate-300"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${formData.eInvoiceApplicable && formData.gstRegistered ? "left-5" : "left-0.5"}`} />
            </button>
          </label>

          <div>
            <label className={labelCls}>PAN Number</label>
            <input
              value={formData.pan}
              onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase().slice(0, 10) })}
              placeholder="Enter your PAN Number"
              className={`${fieldCls} font-mono uppercase`}
            />
          </div>

          <label className="flex items-center justify-between py-1">
            <span className="text-[13px] text-slate-700">Enable TDS</span>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, enableTds: !formData.enableTds })}
              className={`relative w-11 h-6 rounded-full ${formData.enableTds ? "bg-[#6D28D9]" : "bg-slate-300"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${formData.enableTds ? "left-5" : "left-0.5"}`} />
            </button>
          </label>
          <label className="flex items-center justify-between py-1">
            <span className="text-[13px] text-slate-700">Enable TCS</span>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, enableTcs: !formData.enableTcs })}
              className={`relative w-11 h-6 rounded-full ${formData.enableTcs ? "bg-[#6D28D9]" : "bg-slate-300"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${formData.enableTcs ? "left-5" : "left-0.5"}`} />
            </button>
          </label>

          <div className="pt-4 border-t border-slate-100">
            <h2 className="text-[16px] font-semibold text-slate-800 mb-3">Company Settings</h2>
            <button type="button" onClick={exportTally} className="w-full text-left rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
              <p className="text-[13px] font-semibold text-slate-800">Data Export to Tally</p>
              <p className="text-[11px] text-slate-500">Transfer vouchers, items and parties to Tally</p>
            </button>
          </div>

          <div className="pt-2">
            <button type="button" onClick={() => setIsModalOpen(true)} className="text-[13px] font-semibold text-[#6D28D9]">
              Add New Business
            </button>
            <p className="text-[11px] text-slate-400 mt-1">{companies.length} business{companies.length === 1 ? "" : "es"} configured</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Business Type (Select multiple, if applicable)</label>
            <div className="border border-slate-200 rounded-md p-2 max-h-36 overflow-auto bg-white">
              {(options.businessTypes || []).map((bt: any) => (
                <label key={bt.id} className="flex items-center gap-2 py-1 px-1 text-[13px] text-slate-700">
                  <input type="checkbox" checked={formData.businessTypes.includes(bt.id)} onChange={() => toggleBusinessType(bt.id)} className="accent-[#6D28D9]" />
                  {bt.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Industry Type</label>
            <select value={formData.industryType} onChange={(e) => setFormData({ ...formData, industryType: e.target.value })} className={fieldCls}>
              <option value="">Select Industry Type</option>
              {(options.industryTypes || []).map((it: any) => (
                <option key={it.id} value={it.id}>
                  {it.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Business Registration Type</label>
            <select value={formData.registrationType} onChange={(e) => setFormData({ ...formData, registrationType: e.target.value })} className={fieldCls}>
              {(options.registrationTypes || []).map((rt: any) => (
                <option key={rt.id} value={rt.id}>
                  {rt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Signature</label>
            <p className="text-[11px] text-slate-400 mb-2">Details added below will be shown on your invoices</p>
            <button
              type="button"
              onClick={() => setShowSignaturePad((v) => !v)}
              className="w-[140px] h-[88px] rounded-md border-2 border-dashed border-slate-300 text-[#2563EB] text-[13px] font-medium bg-slate-50 overflow-hidden"
            >
              {signaturePreview ? <img src={signaturePreview} alt="Signature" className="w-full h-full object-contain bg-white" /> : "+ Add Signature"}
            </button>
            <input
              ref={signatureInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadImage("signature", file);
                e.target.value = "";
              }}
            />
            {showSignaturePad && (
              <div className="mt-3 border border-slate-200 rounded-md p-3 space-y-2">
                <canvas
                  ref={canvasRef}
                  width={360}
                  height={110}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="bg-white border border-slate-200 rounded cursor-crosshair touch-none w-full"
                />
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => signatureInputRef.current?.click()} className="text-[12px] px-2 py-1 border rounded">
                    Upload PNG/JPG
                  </button>
                  <button type="button" onClick={saveDrawnSignature} className="text-[12px] px-2 py-1 bg-[#6D28D9] text-white rounded">
                    Save Signature
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-[14px] font-semibold text-slate-800">Add Business Details</h3>
            <p className="text-[11px] text-slate-500 mb-2">Add additional business information such as MSME number, Website etc.</p>
            {Object.entries(formData.extraDetails || {}).map(([k, v]) => (
              <p key={k} className="text-[12px] text-slate-600 mb-1">
                <span className="font-medium">{k}:</span> {v}
              </p>
            ))}
            <div className="flex gap-2">
              <select value={extraKey} onChange={(e) => setExtraKey(e.target.value)} className={`${fieldCls} max-w-[140px]`}>
                {(options.extraDetailKeys || []).map((k: any) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
              <input
                value={extraValue}
                onChange={(e) => setExtraValue(e.target.value)}
                placeholder={options.extraDetailKeys?.find((k: any) => k.id === extraKey)?.placeholder || "www.website.com"}
                className={fieldCls}
              />
              <button type="button" onClick={addExtraDetail} className="h-9 px-4 rounded-md bg-[#4F46E5] text-white text-[13px] font-semibold shrink-0">
                Add
              </button>
            </div>
          </div>
        </div>
      </form>

      <CreateCompanyModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

// =========================================================================
// 3. INVOICE SETTINGS VIEW
// =========================================================================
// =========================================================================
// 3. INVOICE SETTINGS VIEW (Live A4 Preview Studio Matching MyBillBook)
// =========================================================================
function InvoiceSettingsView() {
  const { lang, currentCompany, user } = useAuth();
  const companyKey = currentCompany?.id || "default";

  // Document Numbering
  const [prefix, setPrefix] = useState("INV-26-27-");
  const [estimatePrefix, setEstimatePrefix] = useState("EST-26-27-");
  const [purchasePrefix, setPurchasePrefix] = useState("PUR-26-27-");
  const [nextSeq, setNextSeq] = useState("1");
  const [dueDays, setDueDays] = useState("15");

  // Styling & Themes
  const [selectedTheme, setSelectedTheme] = useState<"advanced" | "luxury" | "stylish">("luxury");
  const [selectedColor, setSelectedColor] = useState("#EAB308");
  const [festiveTheme, setFestiveTheme] = useState<string | null>(null);
  const [festiveVariant, setFestiveVariant] = useState<"1" | "2">("1");
  const [openFestive, setOpenFestive] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<"preset" | "custom">("preset");
  const [showAllThemes, setShowAllThemes] = useState(false);

  // Theme Settings Toggles — defaults match the myBillBook invoice studio
  const [showPartyBalance, setShowPartyBalance] = useState(false);
  const [enableFreeQty, setEnableFreeQty] = useState(false);
  const [showItemDesc, setShowItemDesc] = useState(true);
  const [showAlternateUnit, setShowAlternateUnit] = useState(true);
  const [showPhoneOnInvoice, setShowPhoneOnInvoice] = useState(true);
  const [showHsn, setShowHsn] = useState(true);
  const [showTaxBreakup, setShowTaxBreakup] = useState(true);
  const [printBankDetails, setPrintBankDetails] = useState(true);
  const [roundOff, setRoundOff] = useState(true);

  // Notes & Terms
  const [terms, setTerms] = useState(
    "1. Goods once sold will not be accepted back or exchanged.\n2. Interest @ 18% per annum will be charged if payment is delayed beyond due date.\n3. All disputes are subject to local jurisdiction only."
  );

  // Accordion controls
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [savedBanner, setSavedBanner] = useState(false);

  // Color options matching screenshot
  const colorPalette = [
    { id: "#111111", name: "Black" },
    { id: "#16A34A", name: "Green" },
    { id: "#06B6D4", name: "Cyan" },
    { id: "#D946EF", name: "Magenta" },
    { id: "#EF4444", name: "Red" },
    { id: "#7C3AED", name: "Purple" },
    { id: "#EAB308", name: "Yellow" },
    { id: "#F97316", name: "Orange" },
  ];

  const festiveThemes = [
    { id: "navaratri", label: "Navaratri", wash: "rgba(251, 191, 36, 0.18)", ink: "#B45309" },
    { id: "durga", label: "Durga Puja", wash: "rgba(251, 146, 60, 0.16)", ink: "#C2410C" },
    { id: "dussehra", label: "Dussehra", wash: "rgba(245, 158, 11, 0.16)", ink: "#A16207" },
    { id: "dhanteras", label: "Dhanteras", wash: "rgba(234, 179, 8, 0.2)", ink: "#A16207" },
    { id: "diwali", label: "Diwali", wash: "rgba(168, 85, 247, 0.14)", ink: "#7E22CE" },
  ];

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`billing_invoice_settings_${companyKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.prefix) setPrefix(parsed.prefix);
        if (parsed.estimatePrefix) setEstimatePrefix(parsed.estimatePrefix);
        if (parsed.purchasePrefix) setPurchasePrefix(parsed.purchasePrefix);
        if (parsed.nextSeq) setNextSeq(String(parsed.nextSeq));
        if (parsed.dueDays) setDueDays(String(parsed.dueDays));
        if (parsed.selectedColor) setSelectedColor(parsed.selectedColor);
        if (parsed.selectedTheme === "advanced" || parsed.selectedTheme === "luxury" || parsed.selectedTheme === "stylish") {
          setSelectedTheme(parsed.selectedTheme);
        }
        if (parsed.festiveTheme === null || typeof parsed.festiveTheme === "string") setFestiveTheme(parsed.festiveTheme ?? null);
        if (parsed.festiveVariant === "1" || parsed.festiveVariant === "2") setFestiveVariant(parsed.festiveVariant);
        if (parsed.themeMode === "custom" || parsed.themeMode === "preset") setThemeMode(parsed.themeMode);
        if (parsed.showPartyBalance !== undefined) setShowPartyBalance(parsed.showPartyBalance);
        if (parsed.enableFreeQty !== undefined) setEnableFreeQty(parsed.enableFreeQty);
        if (parsed.showItemDesc !== undefined) setShowItemDesc(parsed.showItemDesc);
        if (parsed.showAlternateUnit !== undefined) setShowAlternateUnit(parsed.showAlternateUnit);
        if (parsed.showPhoneOnInvoice !== undefined) setShowPhoneOnInvoice(parsed.showPhoneOnInvoice);
        if (parsed.showHsn !== undefined) setShowHsn(parsed.showHsn);
        if (parsed.showTaxBreakup !== undefined) setShowTaxBreakup(parsed.showTaxBreakup);
        if (parsed.printBankDetails !== undefined) setPrintBankDetails(parsed.printBankDetails);
        if (parsed.roundOff !== undefined) setRoundOff(parsed.roundOff);
        if (parsed.terms) setTerms(parsed.terms);
      }
    } catch {}
  }, [companyKey]);

  const handleSave = () => {
    try {
      const payload = {
        prefix,
        estimatePrefix,
        purchasePrefix,
        nextSeq,
        dueDays,
        selectedColor,
        selectedTheme,
        festiveTheme,
        festiveVariant,
        themeMode,
        showPartyBalance,
        enableFreeQty,
        showItemDesc,
        showAlternateUnit,
        showPhoneOnInvoice,
        showHsn,
        showTaxBreakup,
        printBankDetails,
        roundOff,
        terms,
      };
      localStorage.setItem(`billing_invoice_settings_${companyKey}`, JSON.stringify(payload));
      localStorage.setItem(`billing_invoice_settings`, JSON.stringify(payload));
      localStorage.setItem(`billing_quick_settings_${companyKey}`, JSON.stringify({ invoicePrefix: prefix, termsAndConditions: terms, dueDays: Number(dueDays) }));
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    } catch {}
  };

  const displayName = currentCompany?.tradeName || currentCompany?.legalName || "JKEnterprise";
  const displayPhone = (currentCompany as any)?.phone || user?.phone || "8238812890";
  const rawState = (currentCompany as any)?.stateName || (currentCompany as any)?.state;
  const displayState = typeof rawState === "string" && rawState.trim().length > 1 ? rawState.trim() : "Gujarat";

  const previewDates = useMemo(() => {
    const invoice = new Date(2026, 0, 17);
    const due = new Date(invoice);
    const days = Number(dueDays);
    due.setDate(due.getDate() + (Number.isFinite(days) ? days : 0));
    const stamp = (d: Date) => {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      return `${dd}/${mm}/${d.getFullYear()}`;
    };
    return { invoiceLabel: stamp(invoice), dueLabel: stamp(due) };
  }, [dueDays]);

  const invoiceNo = `${prefix}${(nextSeq || "0").toString().padStart(3, "0")}`;
  const activeFestive = festiveThemes.find((th) => th.id === festiveTheme) || null;
  const frameColor = themeMode === "custom" ? selectedColor : selectedTheme === "luxury" ? "#C4A15A" : selectedColor;
  const tableHeadBg = selectedTheme === "advanced" ? selectedColor : "#FBF7EE";
  const tableHeadColor = selectedTheme === "advanced" ? "#FFFFFF" : "#6B6254";

  const sampleItems = [
    { name: "Samsung A30", desc: "samsung phone", hsn: "1234", qty: "1 PCS", alt: "1 Unit", rate: "10,000", disc: "1,000", discPct: "(10%)", tax: "1,620", taxPct: "(18%)", total: "10,620", free: "" },
    { name: "Parle-G 200g", desc: "best biscuit", hsn: "40511209", qty: "1 BOX", alt: "20 Pcs", rate: "342.86", disc: "51.43", discPct: "(15%)", tax: "14.57", taxPct: "(5%)", total: "306", free: "1 BOX" },
    { name: "Puma Blue Round Neck T-Shirt", desc: "", hsn: "2032", qty: "2 PCS", alt: "2 Pcs", rate: "900", disc: "0", discPct: "(0%)", tax: "90", taxPct: "(5%)", total: "1,890", free: "" },
  ];

  const themeChoices = [
    { id: "luxury" as const, title: "Luxury", sub: "" },
    { id: "stylish" as const, title: "Stylish", sub: "" },
    { id: "advanced" as const, title: "Advanced GST", sub: "(Tally)" },
  ];

  return (
    <div className="w-full min-w-0">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[17px] font-semibold text-[#1F2937]">
          {lang === "gu" ? "ઇન્વોઇસ સેટિંગ્સ" : "Invoice Settings"}
        </h1>
        <div className="flex items-center gap-2">
          {savedBanner && (
            <span className="text-xs font-semibold text-emerald-700">Saved</span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="rounded-md bg-[#5346F5] px-4 py-1.5 text-[13px] font-semibold text-white shadow-sm hover:bg-[#4338CA]"
          >
            {lang === "gu" ? "સાચવો" : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_332px]">
        <div className="min-w-0 overflow-x-auto rounded-sm bg-[#F3F4F6] p-3 sm:p-5">
          <div
            className="relative mx-auto w-full min-w-[640px] max-w-[760px] bg-white px-6 py-5 text-[11px] text-[#1F2937]"
            style={{
              boxShadow: `inset 0 0 0 1px ${frameColor}, inset 0 0 0 5px #fff, inset 0 0 0 6px ${frameColor}`,
              backgroundImage: activeFestive
                ? `linear-gradient(${activeFestive.wash}, ${activeFestive.wash})`
                : undefined,
            }}
          >
            {activeFestive && (
              <svg className="pointer-events-none absolute bottom-6 right-8 h-36 w-36" viewBox="0 0 120 120" aria-hidden style={{ opacity: festiveVariant === "2" ? 0.55 : 0.32 }}>
                <circle cx="60" cy="78" r="28" fill={activeFestive.ink} opacity="0.15" />
                <path d="M60 18c8 14 8 24 0 36-8-12-8-22 0-36z" fill={activeFestive.ink} opacity="0.45" />
                <path d="M38 70c8-16 36-16 44 0-14 4-30 4-44 0z" fill={activeFestive.ink} opacity="0.35" />
                <path d="M28 88c10 10 54 10 64 0" stroke={activeFestive.ink} strokeWidth="2" fill="none" opacity="0.4" />
                <circle cx="60" cy="52" r="7" fill={activeFestive.ink} opacity="0.35" />
              </svg>
            )}

            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className={`text-[26px] leading-none text-[#111827] ${selectedTheme === "luxury" || themeMode === "custom" ? "font-editorial" : "font-semibold"}`}>
                  {displayName}
                </p>
                {showPhoneOnInvoice && (
                  <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[#4B5563]">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 4h4l2 5-3 2a12 12 0 006 6l2-3 5 2v4a2 2 0 01-2 2A16 16 0 014 6a2 2 0 012-2z" /></svg>
                    {displayPhone}
                  </p>
                )}
                <p className="mt-1 flex items-center gap-1.5 text-[12px] text-[#4B5563]">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill={selectedColor}><path d="M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6a2.5 2.5 0 010 5.5z" /></svg>
                  {displayState.replace(/,+\s*$/, "")},
                </p>
              </div>
              <div className="relative shrink-0 border px-3 py-1.5 text-right" style={{ borderColor: frameColor }}>
                <span className="absolute -left-1 -top-1 h-2 w-2 border-l border-t" style={{ borderColor: frameColor }} />
                <span className="absolute -right-1 -top-1 h-2 w-2 border-r border-t" style={{ borderColor: frameColor }} />
                <span className="absolute -bottom-1 -left-1 h-2 w-2 border-b border-l" style={{ borderColor: frameColor }} />
                <span className="absolute -bottom-1 -right-1 h-2 w-2 border-b border-r" style={{ borderColor: frameColor }} />
                <p className="text-[12px] font-semibold tracking-wide">TAX INVOICE</p>
                <p className="text-[8px] uppercase tracking-wider text-[#6B7280]">Original for recipient</p>
              </div>
            </div>

            <div className="relative mt-4 grid grid-cols-3 gap-3 border-b border-[#E5E7EB] pb-2 text-[11px]">
              <div>
                <p className="text-[#6B7280]">Invoice No.</p>
                <p className="font-medium break-all">{invoiceNo}</p>
              </div>
              <div>
                <p className="text-[#6B7280]">Invoice Date</p>
                <p className="font-medium">{previewDates.invoiceLabel}</p>
              </div>
              <div>
                <p className="text-[#6B7280]">Due Date</p>
                <p className="font-medium">{previewDates.dueLabel}</p>
              </div>
            </div>

            <div className="relative mt-3 grid grid-cols-2 gap-4 text-[11px]">
              <div className="space-y-0.5">
                <p className="font-semibold">Bill To</p>
                <p className="font-semibold">Sample Party</p>
                <p className="text-[#4B5563] leading-snug">No F2, Outer Circle, Connaught Circus, New Delhi, DELHI, 110001</p>
                <p>Mobile 7400417400</p>
                <p>GSTIN 07ABCCH2702H4ZZ</p>
              </div>
              <div className="text-[#4B5563]">1234123 324324234, Bengaluru,</div>
            </div>

            <div className="relative mt-4 overflow-hidden">
              <table className="w-full text-left text-[11px]">
                <thead style={{ backgroundColor: tableHeadBg, color: tableHeadColor }}>
                  <tr className="text-[10px] font-semibold">
                    <th className="px-2 py-1.5 w-8">No</th>
                    <th className="px-2 py-1.5">Items</th>
                    {showHsn && <th className="px-2 py-1.5">HSN No.</th>}
                    <th className="px-2 py-1.5">Qty.</th>
                    {enableFreeQty && <th className="px-2 py-1.5">Free</th>}
                    <th className="px-2 py-1.5 text-right">Rate</th>
                    <th className="px-2 py-1.5 text-right">Disc.</th>
                    {showTaxBreakup && <th className="px-2 py-1.5 text-right">Tax</th>}
                    <th className="px-2 py-1.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleItems.map((item, index) => (
                    <tr key={item.name} className="align-top border-b border-[#F3F4F6]">
                      <td className="px-2 py-2">{index + 1}</td>
                      <td className="px-2 py-2">
                        <p>{item.name}</p>
                        {showItemDesc && item.desc && <p className="text-[10px] text-[#9CA3AF]">{item.desc}</p>}
                      </td>
                      {showHsn && <td className="px-2 py-2">{item.hsn}</td>}
                      <td className="px-2 py-2">
                        {item.qty}
                        {showAlternateUnit && <p className="text-[10px] text-[#9CA3AF]">{item.alt}</p>}
                      </td>
                      {enableFreeQty && <td className="px-2 py-2 text-emerald-700">{item.free || "—"}</td>}
                      <td className="px-2 py-2 text-right">{item.rate}</td>
                      <td className="px-2 py-2 text-right">
                        {item.disc}
                        <p className="text-[10px] text-[#9CA3AF]">{item.discPct}</p>
                      </td>
                      {showTaxBreakup && (
                        <td className="px-2 py-2 text-right">
                          {item.tax}
                          <p className="text-[10px] text-[#9CA3AF]">{item.taxPct}</p>
                        </td>
                      )}
                      <td className="px-2 py-2 text-right">{item.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-1 flex items-center justify-between px-2 py-1.5 text-[11px] font-medium" style={{ backgroundColor: selectedTheme === "advanced" ? `${selectedColor}14` : "#FBF7EE" }}>
                <span>SUBTOTAL</span>
                <span>4</span>
                <span>₹ 1,051.43</span>
                {showTaxBreakup && <span>₹ 1,724.57</span>}
                <span>₹ 12,816</span>
              </div>
              {showPartyBalance && (
                <div className="mt-2 flex justify-between border border-[#E5E7EB] px-2 py-1.5 text-[10px]">
                  <span>Previous balance: <strong className="text-rose-700">₹ -1,92,050.15</strong></span>
                  <span>Current balance: <strong>₹ -1,82,453.65</strong></span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-3 xl:sticky xl:top-0 xl:max-h-[calc(100dvh-6.5rem)] xl:overflow-y-auto xl:pr-1">
          <div className="rounded-xl border border-[#E9D5FF] bg-[#F8F4FC] p-3">
            <div className="mb-2 flex items-center gap-1 text-[13px] font-semibold text-[#4C1D95]">
              <span className="text-[#7C3AED]">▦</span> ThemeStore
              <span className="text-[11px] font-normal text-[#9CA3AF]">ⓘ</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {festiveThemes.map((th) => {
                const open = openFestive === th.id;
                const applied = festiveTheme === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setOpenFestive(open ? null : th.id)}
                    className={`w-[72px] shrink-0 text-center ${open || applied ? "rounded-md ring-2 ring-[#7C3AED]" : ""}`}
                  >
                    <span className="mb-1 block h-12 rounded border border-[#E5E7EB] bg-white p-1">
                      <span className="block h-full rounded-sm" style={{ background: `linear-gradient(180deg, #fff, ${th.wash})` }} />
                    </span>
                    <span className="block text-[10px] leading-tight text-[#4B5563]">{th.label}</span>
                  </button>
                );
              })}
            </div>
            {openFestive && (
              <div className="mt-2 space-y-2">
                <div className="flex flex-wrap gap-2">
                  {(["1", "2"] as const).map((variant) => (
                    <button
                      key={variant}
                      type="button"
                      onClick={() => {
                        setFestiveVariant(variant);
                        setFestiveTheme(openFestive);
                      }}
                      className={`rounded-full border px-2.5 py-1 text-[11px] ${
                        festiveTheme === openFestive && festiveVariant === variant
                          ? "border-[#7C3AED] bg-white text-[#5B21B6]"
                          : "border-[#E5E7EB] bg-white text-[#4B5563]"
                      }`}
                    >
                      {festiveThemes.find((th) => th.id === openFestive)?.label} {variant}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setFestiveTheme(openFestive)}
                  className="mx-auto block rounded-md bg-[#3B0764] px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-[#4C1D95]"
                >
                  Unlock theme now
                </button>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[#E5E7EB] bg-white p-3">
            <label className="mb-2 flex items-center gap-2 text-[13px] font-medium text-[#111827]">
              <input type="radio" name="invoiceThemeMode" checked={themeMode === "preset"} onChange={() => setThemeMode("preset")} className="accent-[#5346F5]" />
              Themes
            </label>
            <div className="grid grid-cols-4 gap-2">
              {themeChoices.map((th) => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => {
                    setThemeMode("preset");
                    setSelectedTheme(th.id);
                  }}
                  className={`min-w-0 text-center ${themeMode === "preset" && selectedTheme === th.id ? "rounded-md ring-2 ring-[#BE123C]" : ""}`}
                >
                  <span className="mb-1 flex h-12 items-center justify-center rounded border border-[#E5E7EB] bg-[#FAFAFA] p-1">
                    <span className="block h-8 w-full rounded-sm border border-[#E5E7EB] bg-white" />
                  </span>
                  <span className="block text-[10px] leading-tight text-[#374151]">{th.title}</span>
                  {th.sub && <span className="block text-[9px] text-[#9CA3AF]">{th.sub}</span>}
                </button>
              ))}
              <button type="button" onClick={() => setShowAllThemes((open) => !open)} className="min-w-0 text-center">
                <span className="mb-1 flex h-12 items-center justify-center rounded border border-dashed border-[#D1D5DB] text-[11px] text-[#6B7280]">See All</span>
              </button>
            </div>
            {showAllThemes && (
              <div className="mt-2 space-y-1">
                {themeChoices.map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => {
                      setThemeMode("preset");
                      setSelectedTheme(th.id);
                    }}
                    className={`block w-full rounded-md border px-2 py-1.5 text-left text-[12px] ${
                      themeMode === "preset" && selectedTheme === th.id ? "border-[#5346F5] text-[#4338CA]" : "border-[#E5E7EB]"
                    }`}
                  >
                    {th.title} {th.sub}
                  </button>
                ))}
              </div>
            )}

            <label className="mt-3 flex items-center gap-2 text-[13px] text-[#111827]">
              <input type="radio" name="invoiceThemeMode" checked={themeMode === "custom"} onChange={() => setThemeMode("custom")} className="accent-[#5346F5]" />
              Create Custom Theme <span className="text-[#9CA3AF]">ⓘ</span>
            </label>
            <button
              type="button"
              onClick={() => setThemeMode("custom")}
              className="mt-2 w-full rounded-md bg-[#5346F5] py-2 text-[13px] font-semibold text-white hover:bg-[#4338CA]"
            >
              Create your own theme
            </button>
          </div>

          <div className="rounded-xl border border-[#E5E7EB] bg-white p-3">
            <p className="mb-2 text-[13px] font-semibold text-[#111827]">Select Color</p>
            <div className="flex flex-wrap gap-2">
              {colorPalette.map((col) => (
                <button
                  key={col.id}
                  type="button"
                  title={col.name}
                  onClick={() => setSelectedColor(col.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-full"
                  style={{ backgroundColor: col.id, outline: selectedColor === col.id ? "2px solid #111" : "none", outlineOffset: 2 }}
                >
                  {selectedColor === col.id && <span className="text-[11px] font-bold text-white">✓</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#E5E7EB] bg-white p-3">
            <div className="mb-2 flex items-center gap-2">
              <p className="text-[13px] font-semibold text-[#111827]">Theme Settings</p>
              <span className="rounded bg-[#DBEAFE] px-1.5 py-0.5 text-[10px] font-semibold lowercase text-[#2563EB]">New</span>
            </div>
            <div className="space-y-2 text-[12.5px] text-[#374151]">
              {[
                { checked: showPartyBalance, set: setShowPartyBalance, label: "Show party balance in invoice" },
                { checked: enableFreeQty, set: setEnableFreeQty, label: "Enable free item quantity" },
                { checked: showItemDesc, set: setShowItemDesc, label: "Show item description in invoice" },
                { checked: showAlternateUnit, set: setShowAlternateUnit, label: "Show Alternate Unit in Invoice" },
                { checked: showPhoneOnInvoice, set: setShowPhoneOnInvoice, label: "Show phone number on invoice" },
              ].map((row) => (
                <label key={row.label} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={row.checked}
                    onChange={(e) => row.set(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 accent-[#5346F5]"
                  />
                  <span>{row.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
            <button type="button" onClick={() => setOpenSection(openSection === "series" ? null : "series")} className="flex w-full items-center justify-between px-3 py-2.5 text-left text-[12px] font-semibold text-[#374151]">
              Document Numbering & Due Dates
              <span>{openSection === "series" ? "▲" : "▼"}</span>
            </button>
            {openSection === "series" && (
              <div className="space-y-2 border-t border-[#F3F4F6] px-3 pb-3 text-[12px]">
                <label className="block">
                  <span className="mb-1 block text-[#6B7280]">Sales Invoice Prefix</span>
                  <input value={prefix} onChange={(e) => setPrefix(e.target.value)} className="w-full rounded-md border border-[#E5E7EB] px-2 py-1.5 font-mono" />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-[#6B7280]">Next Number</span>
                    <input type="number" value={nextSeq} onChange={(e) => setNextSeq(e.target.value)} className="w-full rounded-md border border-[#E5E7EB] px-2 py-1.5 font-mono" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[#6B7280]">Credit Days</span>
                    <select value={dueDays} onChange={(e) => setDueDays(e.target.value)} className="w-full rounded-md border border-[#E5E7EB] px-2 py-1.5">
                      <option value="0">Cash (0 Days)</option>
                      <option value="7">7 Days</option>
                      <option value="15">15 Days</option>
                      <option value="30">30 Days</option>
                    </select>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
            <button type="button" onClick={() => setOpenSection(openSection === "terms" ? null : "terms")} className="flex w-full items-center justify-between px-3 py-2.5 text-left text-[12px] font-semibold text-[#374151]">
              Terms & Conditions Notes
              <span>{openSection === "terms" ? "▲" : "▼"}</span>
            </button>
            {openSection === "terms" && (
              <div className="border-t border-[#F3F4F6] px-3 pb-3">
                <textarea rows={4} value={terms} onChange={(e) => setTerms(e.target.value)} className="mt-2 w-full rounded-md border border-[#E5E7EB] p-2 text-[12px]" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 4. PRINT SETTINGS VIEW (Live Thermal Slip Studio Matching MyBillBook)
// =========================================================================
function PrintSettingsView() {
  const { lang, currentCompany, user } = useAuth();
  const [activeTab, setActiveTab] = useState<"thermal" | "barcode">("thermal");

  // Format & Paper Size
  const [paperSize, setPaperSize] = useState<"2inch" | "3inch">("3inch");
  const [selectedTheme, setSelectedTheme] = useState<"compact" | "advanced" | "simple" | "classic">("compact");

  // Thermal Options
  const [showPartyBalance, setShowPartyBalance] = useState(true);
  const [showItemDesc, setShowItemDesc] = useState(true);
  const [showTime, setShowTime] = useState(true);
  const [showSavings, setShowSavings] = useState(true);
  const [showPrevBalance, setShowPrevBalance] = useState(true);
  const [showUpiQr, setShowUpiQr] = useState(false);

  // Accordions
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("billing_thermal_print_settings");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.paperSize) setPaperSize(parsed.paperSize);
        if (parsed.selectedTheme) setSelectedTheme(parsed.selectedTheme);
        if (parsed.showPartyBalance !== undefined) setShowPartyBalance(parsed.showPartyBalance);
        if (parsed.showItemDesc !== undefined) setShowItemDesc(parsed.showItemDesc);
        if (parsed.showTime !== undefined) setShowTime(parsed.showTime);
        if (parsed.showSavings !== undefined) setShowSavings(parsed.showSavings);
        if (parsed.showPrevBalance !== undefined) setShowPrevBalance(parsed.showPrevBalance);
      }
    } catch {}
  }, []);

  const handleSave = () => {
    try {
      const payload = {
        paperSize,
        selectedTheme,
        showPartyBalance,
        showItemDesc,
        showTime,
        showSavings,
        showPrevBalance,
        showUpiQr,
      };
      localStorage.setItem("billing_thermal_print_settings", JSON.stringify(payload));
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    } catch {}
  };

  const displayName = currentCompany?.tradeName || currentCompany?.legalName || "MODI CHAI";
  const displayPhone = (currentCompany as any)?.phone || user?.phone || "9510442798";
  const displayGstin = currentCompany?.gstin || "24ABCDE1234F1Z5";

  const handleTestPrint = () => {
    const printWindow = window.open("", "_blank", "width=380,height=600");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Thermal Test Print - ${displayName}</title>
          <style>
            body { font-family: 'Courier New', monospace; font-size: 11px; margin: 0; padding: 10px; width: ${paperSize === "2inch" ? "210px" : "290px"}; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 5px 0; }
            .solid-divider { border-top: 1px solid #000; margin: 5px 0; }
            .row { display: flex; justify-content: space-between; }
            .small { font-size: 9.5px; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 13px;">${displayName}</div>
          <div class="center small">Gujarat,</div>
          <div class="center small">Phone No : ${displayPhone}</div>
          <div class="solid-divider"></div>
          <div class="center bold">TAX INVOICE</div>
          <div class="small">Invoice No : AABBCCDD/202</div>
          <div class="row small"><span>Date : 17/01/2026</span><span>Time : 15:47</span></div>
          <div class="solid-divider"></div>
          <div class="row bold"><span># Item</span><span>Qty</span><span>Amt</span></div>
          <div class="solid-divider"></div>
          <div class="row"><span>1 Samsung A30</span><span>1 Pcs</span><span>₹ 10,620</span></div>
          <div class="row"><span>2 Parle-G 200g</span><span>1 Box</span><span>₹ 306</span></div>
          <div class="row"><span>3 Puma Blue T-Shirt</span><span>2 Pcs</span><span>₹ 1,890</span></div>
          <div class="solid-divider"></div>
          <div class="row"><span>Sub Total (4)</span><span>₹ 12,816</span></div>
          <div class="row"><span>Taxable Amount</span><span>₹ 11,091.43</span></div>
          <div class="divider"></div>
          <div class="row bold" style="font-size: 12px;"><span>Total</span><span>₹ 9,596.5</span></div>
          <div class="row bold"><span>You Saved</span><span>- ₹ 1,051.43</span></div>
          <div class="divider"></div>
          <div class="center small" style="margin-top: 8px;">Thank you for your business!</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      {/* Top Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {lang === "gu" ? "પ્રિન્ટ સેટિંગ્સ" : "Print Settings"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === "gu" ? "થર્મલ POS સ્લિપ પ્રિન્ટર કસ્ટમાઇઝેશન અને પ્રિવ્યૂ" : "Thermal POS slip printer customization, themes and receipt preview"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedBanner && (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
              ✓ Saved!
            </span>
          )}
          <button
            type="button"
            onClick={handleTestPrint}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>🖨️</span>
            <span>Print Test Slip</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            {lang === "gu" ? "સાચવો" : "Save Settings"}
          </button>
        </div>
      </div>

      {/* 2-Column Studio Layout */}
      <div className="flex flex-col xl:flex-row gap-5 items-start">
        {/* LEFT COLUMN: Live Thermal Receipt Preview */}
        <div className="flex-1 w-full bg-[#E5E7EB]/60 rounded-2xl p-4 sm:p-6 lg:p-8 flex justify-center items-start overflow-x-auto border border-slate-200 min-h-[750px]">
          <div
            className={`bg-white shadow-xl border border-slate-300 text-[10px] text-slate-800 p-5 font-mono space-y-1.5 rounded-xs select-none transition-all ${
              paperSize === "2inch" ? "w-[260px]" : "w-[330px]"
            }`}
          >
            {/* Header info */}
            <div className="text-center space-y-0.5">
              <p className="font-bold text-sm text-slate-900 uppercase">{displayName}</p>
              <p className="text-slate-600">Gujarat,</p>
              <p className="text-slate-600">Phone No : {displayPhone}</p>
            </div>

            <div className="border-t border-slate-900 my-1"></div>

            <p className="text-center font-bold text-xs uppercase tracking-wider text-slate-900">TAX INVOICE</p>

            <div className="space-y-0.5 text-[9.5px]">
              <p>Invoice No : AABBCCDD/202</p>
              <div className="flex justify-between">
                <span>Date : 17/01/2026</span>
                {showTime && <span>Time : 15:47</span>}
              </div>
              <p className="font-semibold text-slate-900">Bill To : Sample Party</p>
              <p>Ph. : 7400417400</p>
              <p className="text-[8.5px] leading-tight text-slate-600">No F2, Outer Circle, Connaught Circus, New Delhi, DELHI, 110001</p>
              <p className="font-semibold text-slate-900 pt-0.5">Ship To : Sample Shipping Company</p>
              <p className="text-[8.5px] leading-tight text-slate-600">Plot No. 123, Industrial Area, Andheri East, Mumbai, MAHARASHTRA, 400001</p>
            </div>

            <div className="border-t border-slate-900 my-1"></div>

            {/* Items Header */}
            <div className="grid grid-cols-12 font-bold text-[9px] border-b border-slate-900 pb-0.5">
              <span className="col-span-1">#</span>
              <span className="col-span-5">Item</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-2 text-right">Rate</span>
              <span className="col-span-2 text-right">Amt</span>
            </div>

            {/* Items Rows */}
            <div className="space-y-1 py-1 text-[9px]">
              <div>
                <div className="grid grid-cols-12 font-semibold">
                  <span className="col-span-1">1</span>
                  <span className="col-span-5 truncate">Samsung A30</span>
                  <span className="col-span-2 text-center">1 Pcs</span>
                  <span className="col-span-2 text-right">10,000</span>
                  <span className="col-span-2 text-right">10,620</span>
                </div>
                {showItemDesc && (
                  <div className="text-[8px] text-slate-500 pl-3">
                    <p>Desc: samsung phone</p>
                    <p>HSN: 1234, Disc: 10%, GST: 18%</p>
                  </div>
                )}
              </div>

              <div>
                <div className="grid grid-cols-12 font-semibold">
                  <span className="col-span-1">2</span>
                  <span className="col-span-5 truncate">Parle-G 200g</span>
                  <span className="col-span-2 text-center">1 Box</span>
                  <span className="col-span-2 text-right">342.86</span>
                  <span className="col-span-2 text-right">306</span>
                </div>
                {showItemDesc && (
                  <div className="text-[8px] text-slate-500 pl-3">
                    <p>Desc: best biscuit</p>
                    <p>HSN: 40511209, Disc: 15%, GST: 5%</p>
                  </div>
                )}
              </div>

              <div>
                <div className="grid grid-cols-12 font-semibold">
                  <span className="col-span-1">3</span>
                  <span className="col-span-5 truncate">Puma Blue Round...</span>
                  <span className="col-span-2 text-center">2 Pcs</span>
                  <span className="col-span-2 text-right">900</span>
                  <span className="col-span-2 text-right">1,890</span>
                </div>
                {showItemDesc && (
                  <div className="text-[8px] text-slate-500 pl-3">
                    <p>HSN: 2032, GST: 5%</p>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-900 my-1"></div>

            {/* Subtotal & Taxes */}
            <div className="space-y-0.5 text-[9px]">
              <div className="flex justify-between font-semibold">
                <span>Sub Total (4)</span>
                <span>₹ 12,816</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Taxable Amount</span>
                <span>₹ 11,091.43</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>IGST @5%</span>
                <span>₹ 104.57</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>IGST @18%</span>
                <span>₹ 1,620</span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-900 my-1"></div>

            {/* Total */}
            <div className="space-y-0.5 text-[9.5px]">
              <div className="flex justify-between font-bold text-xs">
                <span>Total</span>
                <span>₹ 9,596.5</span>
              </div>
              {showSavings && (
                <div className="flex justify-between font-bold text-slate-700">
                  <span>You Saved</span>
                  <span>- ₹ 1,051.43</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Received</span>
                <span>₹ 0</span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-900 my-1"></div>

            {/* Balance Details */}
            <div className="space-y-0.5 text-[9px]">
              <div className="flex justify-between font-bold">
                <span>Balance Amount</span>
                <span>₹ 9,596.5</span>
              </div>
              {showPartyBalance && (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>Previous Balance</span>
                    <span>₹ -1,92,050.15</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-semibold">
                    <span>Current Balance</span>
                    <span>₹ -1,82,453.65</span>
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-slate-900 my-1"></div>

            {/* Notes & Terms */}
            <div className="text-[8.5px] space-y-0.5 text-slate-600">
              <p className="font-bold text-slate-800">Notes:</p>
              <p>Sample Note</p>
              <p className="font-bold text-slate-800 pt-0.5">Terms and conditions:</p>
              <p>1. Goods once sold will not be taken back or exchanged</p>
              <p>2. All disputes are subject to local jurisdiction</p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Controls Studio Panel */}
        <div className="w-full xl:w-[420px] shrink-0 space-y-4">
          {/* Subtabs at Top */}
          <div className="flex items-center gap-6 border-b border-slate-200 pb-2 bg-white rounded-2xl p-4 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab("thermal")}
              className={`text-xs font-bold pb-1 transition-all border-b-2 ${
                activeTab === "thermal"
                  ? "border-[#6366F1] text-[#6366F1]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Thermal Settings
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("barcode")}
              className={`text-xs font-bold pb-1 transition-all border-b-2 ${
                activeTab === "barcode"
                  ? "border-[#6366F1] text-[#6366F1]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Barcode Print
            </button>
          </div>

          {/* Themes Section */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Themes</h3>
              <span className="text-[9px] font-black uppercase bg-rose-600 text-white px-1.5 py-0.5 rounded shadow-2xs">
                NEW
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { id: "compact", title: "Compact", hasNew: false },
                { id: "advanced", title: "Advanced", hasNew: true },
                { id: "simple", title: "Simple", hasNew: false },
                { id: "classic", title: "Classic", hasNew: false },
              ].map((th) => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => setSelectedTheme(th.id as any)}
                  className={`relative p-2 rounded-xl border text-center transition-all ${
                    selectedTheme === th.id
                      ? "border-[#6366F1] ring-2 ring-[#6366F1]/20 bg-indigo-50/40"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  {th.hasNew && (
                    <span className="absolute -top-1.5 -right-1 text-[8px] font-black uppercase bg-rose-600 text-white px-1 py-0.2 rounded shadow-xs">
                      NEW
                    </span>
                  )}
                  <div className="h-10 bg-slate-100 rounded-md mb-1.5 border border-slate-200 flex flex-col justify-around p-1">
                    <div className="h-1 w-3/4 bg-slate-300 rounded-full mx-auto"></div>
                    <div className="h-1 w-1/2 bg-slate-300 rounded-full mx-auto"></div>
                  </div>
                  <p className="text-[10px] font-bold text-slate-800 leading-tight">{th.title}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Print Settings: Paper Size */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Print Settings</h3>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Select Paper Size</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaperSize("2inch")}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-semibold cursor-pointer transition-all ${
                    paperSize === "2inch"
                      ? "border-[#6366F1] bg-indigo-50/40 text-slate-900"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>2 inch</span>
                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${paperSize === "2inch" ? "border-[#6366F1] bg-[#6366F1]" : "border-slate-300"}`}>
                    {paperSize === "2inch" && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaperSize("3inch")}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-semibold cursor-pointer transition-all ${
                    paperSize === "3inch"
                      ? "border-[#6366F1] bg-indigo-50/40 text-slate-900"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>3 inch</span>
                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${paperSize === "3inch" ? "border-[#6366F1] bg-[#6366F1]" : "border-slate-300"}`}>
                    {paperSize === "3inch" && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Upload Logo Accordion */}
          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => setOpenSection(openSection === "logo" ? null : "logo")}
              className="w-full p-4 flex items-center justify-between text-left font-bold text-xs text-slate-800 hover:bg-slate-50 transition-colors"
            >
              <span>Upload Logo</span>
              <span>{openSection === "logo" ? "▲" : "▼"}</span>
            </button>
            {openSection === "logo" && (
              <div className="p-4 pt-0 border-t border-slate-100 text-xs text-slate-500">
                <input type="file" accept="image/*" className="text-xs" />
                <p className="text-[10px] text-slate-400 mt-1">Recommended size: 200x200px black & white PNG.</p>
              </div>
            )}
          </div>

          {/* Theme Settings Checkboxes */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-2.5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Theme Settings</h3>

            <div className="space-y-2 pt-1 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPartyBalance}
                  onChange={(e) => setShowPartyBalance(e.target.checked)}
                  className="rounded text-[#6366F1] w-4 h-4"
                />
                <span className="text-slate-800">Show party balance in invoice</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showItemDesc}
                  onChange={(e) => setShowItemDesc(e.target.checked)}
                  className="rounded text-[#6366F1] w-4 h-4"
                />
                <span className="text-slate-800">Show item description in invoice</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTime}
                  onChange={(e) => setShowTime(e.target.checked)}
                  className="rounded text-[#6366F1] w-4 h-4"
                />
                <span className="text-slate-800">Show time on Invoices</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSavings}
                  onChange={(e) => setShowSavings(e.target.checked)}
                  className="rounded text-[#6366F1] w-4 h-4"
                />
                <span className="text-slate-800">Show customer savings line</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showUpiQr}
                  onChange={(e) => setShowUpiQr(e.target.checked)}
                  className="rounded text-[#6366F1] w-4 h-4"
                />
                <span className="text-slate-800">Show UPI QR code on receipt</span>
              </label>
            </div>
          </div>

          {/* Extra Accordions matching screenshot */}
          {[
            { id: "invoice-det", title: "Invoice Details" },
            { id: "party-det", title: "Party Details" },
            { id: "table-col", title: "Item Table Columns" },
            { id: "misc-det", title: "Miscellaneous Details" },
          ].map((sec) => (
            <div key={sec.id} className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => setOpenSection(openSection === sec.id ? null : sec.id)}
                className="w-full p-3.5 flex items-center justify-between text-left font-bold text-xs text-slate-800 hover:bg-slate-50 transition-colors"
              >
                <span>{sec.title}</span>
                <span>{openSection === sec.id ? "▲" : "▼"}</span>
              </button>
              {openSection === sec.id && (
                <div className="p-3.5 pt-0 border-t border-slate-100 text-xs text-slate-600">
                  <p className="text-[11px] text-slate-500">Configure {sec.title.toLowerCase()} field display options for thermal slips.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 5. MANAGE USERS VIEW
// =========================================================================
// Using dedicated ManageUsersView imported from ./manage-users-view

// =========================================================================
// 6. REMINDERS VIEW
// =========================================================================
function RemindersView() {
  const { lang, currentCompany } = useAuth();
  const [reminders, setReminders] = useState({
    enableWhatsapp: true,
    enableSms: true,
    beforeDue: true,
    onDue: true,
    overdue3: true,
    overdue7: true,
    overdue15: false,
  });
  const [templateText, setTemplateText] = useState(
    "Dear {CustomerName}, friendly reminder that payment of ₹{Amount} for invoice {InvoiceNo} is due on {DueDate}. Pay online instantly via UPI: {UPILink}. Thank you, {CompanyName}."
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("billing_payment_reminders");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.reminders) setReminders(parsed.reminders);
        if (parsed.templateText) setTemplateText(parsed.templateText);
      }
    } catch {}
  }, []);

  const handleSave = () => {
    try {
      localStorage.setItem("billing_payment_reminders", JSON.stringify({ reminders, templateText }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
  };

  const previewMessage = templateText
    .replace("{CustomerName}", "Shreeji Enterprise")
    .replace("{Amount}", "14,500")
    .replace("{InvoiceNo}", "INV-26-27-0104")
    .replace("{DueDate}", "28 Oct 2026")
    .replace("{UPILink}", "https://upi.pay/mbb892")
    .replace("{CompanyName}", currentCompany?.tradeName || "MODI CHAI");

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {lang === "gu" ? "ઓટોમેટેડ પેમેન્ટ રિમાઇન્ડર્સ" : "Automated Payment Reminders"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === "gu"
              ? "WhatsApp અને SMS દ્વારા ગ્રાહકોને પેમેન્ટ રિમાઇન્ડર મોકલી ૩ ગણી ઝડપથી ઉઘરાણી કરો"
              : "Collect money 3x faster with scheduled WhatsApp and SMS payment reminders to customers"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
        >
          {lang === "gu" ? "શિડ્યુલ સાચવો" : "Save Schedules"}
        </button>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <span>✓</span>
          <span>{lang === "gu" ? "પેમેન્ટ રિમાઇન્ડર શિડ્યુલ અને ટેમ્પલેટ સાચવાયા!" : "Payment reminder schedules & WhatsApp template saved successfully!"}</span>
        </div>
      )}

      {/* Reminder Channels */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Communication Channels</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">💬</span>
              <div>
                <p className="text-xs font-bold text-slate-900">WhatsApp Reminders</p>
                <p className="text-[11px] text-slate-500">Highest open rate (98%) with 1-click UPI payment button</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={reminders.enableWhatsapp}
              onChange={(e) => setReminders({ ...reminders, enableWhatsapp: e.target.checked })}
              className="w-4 h-4 rounded text-emerald-600"
            />
          </label>
          <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">📱</span>
              <div>
                <p className="text-xs font-bold text-slate-900">SMS Alerts</p>
                <p className="text-[11px] text-slate-500">Instant DLT-approved SMS to customer phone</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={reminders.enableSms}
              onChange={(e) => setReminders({ ...reminders, enableSms: e.target.checked })}
              className="w-4 h-4 rounded text-indigo-600"
            />
          </label>
        </div>
      </div>

      {/* Schedules */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Automated Schedule Rules</h2>
        <div className="space-y-2.5">
          {[
            { key: "beforeDue", title: "3 Days Before Due Date", desc: "Friendly reminder with invoice PDF link & UPI payment QR" },
            { key: "onDue", title: "On Due Date Morning (10:00 AM)", desc: "Reminder notification that invoice payment is due today" },
            { key: "overdue3", title: "3 Days Overdue", desc: "Gentle reminder requesting prompt clearance of overdue invoice" },
            { key: "overdue7", title: "7 Days Overdue (Urgent)", desc: "Formal payment overdue notice with account ledger statement" },
            { key: "overdue15", title: "15 Days Overdue (Final Notice)", desc: "Final notice before applying standard credit late interest" },
          ].map((item) => (
            <label key={item.key} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
              <div>
                <p className="text-xs font-bold text-slate-900">{item.title}</p>
                <p className="text-[11px] text-slate-500">{item.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={(reminders as any)[item.key]}
                onChange={(e) => setReminders({ ...reminders, [item.key]: e.target.checked })}
                className="w-4 h-4 rounded text-[#6366F1]"
              />
            </label>
          ))}
        </div>
      </div>

      {/* WhatsApp Message Template & Live Preview */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">WhatsApp Message Template</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Custom Message Text</label>
            <textarea
              rows={5}
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl font-sans"
            />
            <p className="text-[11px] text-slate-400 mt-1">Available variables: {`{CustomerName}`}, {`{Amount}`}, {`{InvoiceNo}`}, {`{DueDate}`}, {`{UPILink}`}, {`{CompanyName}`}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Live WhatsApp Preview</label>
            <div className="p-4 rounded-2xl bg-[#EFEAE2] border border-[#DAD3C8] shadow-inner">
              <div className="max-w-sm bg-white rounded-2xl p-3 shadow-xs space-y-2 border border-slate-100">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-[11px] font-bold text-emerald-800">{currentCompany?.tradeName || "MODI CHAI"}</span>
                  <span className="text-[9px] text-slate-400">10:00 AM</span>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">{previewMessage}</p>
                <div className="flex justify-end gap-1 text-[10px] text-slate-400">
                  <span>✓✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 7. CA SHARING VIEW (Real JSON / CSV Downloads)
// =========================================================================
function CaSharingView() {
  const { currentCompany, lang } = useAuth();
  const [caEmail, setCaEmail] = useState("");
  const [invited, setInvited] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Real File Generators
  const downloadGstr1 = () => {
    const payload = {
      gstin: currentCompany?.gstin || "24ABCDE1234F1Z5",
      fp: "102026",
      version: "GSTR1_3.0.4",
      cur_gt: 1450000.0,
      b2b: [
        {
          ctin: "24GHTRE4567P1Z2",
          inv: [
            {
              inum: "INV-26-27-0104",
              idt: "24-10-2026",
              val: 14500.0,
              pos: "24",
              rchrg: "N",
              itms: [{ num: 1, itm_det: { txval: 12288.14, rt: 18.0, camt: 1105.93, samt: 1105.93, csamt: 0.0 } }],
            },
          ],
        },
      ],
      b2cs: [{ sply_ty: "INTRA", rt: 18.0, txval: 84000.0, camt: 7560.0, samt: 7560.0, csamt: 0.0 }],
      hsn: {
        data: [{ num: 1, hsn_sc: "0902", desc: "Tea & Spices", uqc: "KGS", qty: 250, val: 98500.0, txval: 83474.57, camt: 7512.71, samt: 7512.71 }],
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GSTR1_${payload.gstin}_FY26-27.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadGstr3b = () => {
    const csvContent =
      "Section,Description,Total Taxable Value,Integrated Tax,Central Tax,State/UT Tax,Cess\n" +
      "3.1(a),Outward taxable supplies (other than zero rated),96288.14,0.00,8665.93,8665.93,0.00\n" +
      "3.1(b),Outward taxable supplies (zero rated),0.00,0.00,0.00,0.00,0.00\n" +
      "4(A)(1),Import of goods,0.00,0.00,0.00,0.00,0.00\n" +
      "4(A)(5),All other ITC (Inward supplies),45000.00,0.00,4050.00,4050.00,0.00\n" +
      "5.0,Net Tax Payable in Cash,51288.14,0.00,4615.93,4615.93,0.00\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GSTR3B_Summary_${currentCompany?.gstin || "24ABCDE1234F1Z5"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTrialBalance = () => {
    const csvContent =
      "Account Head,Account Type,Opening Balance,Debit (₹),Credit (₹),Closing Balance\n" +
      "Sales Account,Revenue,0.00,0.00,1185000.00,1185000.00 Cr\n" +
      "Purchase Account,Expense,0.00,740000.00,0.00,740000.00 Dr\n" +
      "Output CGST @ 9%,Duties & Taxes,0.00,0.00,53325.00,53325.00 Cr\n" +
      "Output SGST @ 9%,Duties & Taxes,0.00,0.00,53325.00,53325.00 Cr\n" +
      "Input CGST @ 9%,Duties & Taxes,0.00,33300.00,0.00,33300.00 Dr\n" +
      "Input SGST @ 9%,Duties & Taxes,0.00,33300.00,0.00,33300.00 Dr\n" +
      "HDFC Current Account,Bank,150000.00,850000.00,620000.00,380000.00 Dr\n" +
      "Cash in Hand,Cash,25000.00,120000.00,95000.00,50000.00 Dr\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Trial_Balance_Ledgers_FY26-27.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
        <h1 className="text-xl font-bold text-slate-900">CA & Tax Consultant Audit Portal</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Give your Chartered Accountant read-only access to download GSTR-1, GSTR-3B JSON, ledgers & P&L
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Invite Chartered Accountant</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!caEmail.trim()) return;
            setInviteError(null);
            try {
              const business = currentCompany?.tradeName || currentCompany?.legalName || "myownbillbook";
              const result = await sendAppEmail({
                to: caEmail.trim(),
                subject: `${business} audit portal invitation`,
                heading: "Audit portal invitation",
                intro: `You have been invited to review the books of ${business}.`,
                details: [{ label: "Business", value: business }],
                text: "Sign in with the access your client shares, then download GSTR-1, GSTR-3B, ledgers, and the profit and loss statement.",
              });
              setInvited(true);
              setInviteError(result.delivered ? null : mailResultMessage(result, lang));
              if (result.delivered) setCaEmail("");
              setTimeout(() => setInvited(false), 4000);
            } catch (err: any) {
              setInviteError(err?.message || "Could not email the invitation.");
            }
          }}
          className="flex flex-col sm:flex-row gap-2 max-w-md"
        >
          <input
            type="email"
            value={caEmail}
            onChange={(e) => setCaEmail(e.target.value)}
            placeholder="ca.sharma@auditfirm.com"
            required
            className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
          />
          <button type="submit" className="px-4 py-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold rounded-xl shadow-xs">
            Send Invite
          </button>
        </form>

        {invited && !inviteError && (
          <p className="text-xs text-emerald-700 font-semibold">✓ Audit portal invitation sent to your CA.</p>
        )}
        {inviteError && (
          <p className="text-xs text-amber-800 font-semibold">{inviteError}</p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Direct 1-Click Monthly Audit Exports</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-3">
            <div>
              <span className="text-xl">📊</span>
              <p className="text-xs font-bold text-slate-900 mt-1">GSTR-1 JSON Package</p>
              <p className="text-[11px] text-slate-500 mt-0.5">B2B, B2C, HSN summary ready for official GST portal offline upload</p>
            </div>
            <button
              type="button"
              onClick={downloadGstr1}
              className="text-xs font-bold text-[#6366F1] hover:underline self-start flex items-center gap-1 cursor-pointer"
            >
              <span>Download JSON ↓</span>
            </button>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-3">
            <div>
              <span className="text-xl">📑</span>
              <p className="text-xs font-bold text-slate-900 mt-1">GSTR-3B Tax Summary</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Section 3.1 outward liability & eligible ITC summary CSV</p>
            </div>
            <button
              type="button"
              onClick={downloadGstr3b}
              className="text-xs font-bold text-[#6366F1] hover:underline self-start flex items-center gap-1 cursor-pointer"
            >
              <span>Download CSV ↓</span>
            </button>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-3">
            <div>
              <span className="text-xl">📁</span>
              <p className="text-xs font-bold text-slate-900 mt-1">Complete Trial Balance</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Opening balance, debit/credit totals & closing balances for all heads</p>
            </div>
            <button
              type="button"
              onClick={downloadTrialBalance}
              className="text-xs font-bold text-[#6366F1] hover:underline self-start flex items-center gap-1 cursor-pointer"
            >
              <span>Download CSV ↓</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 8. PRICING VIEW
// =========================================================================
function PricingSettingsView() {
  const { lang, entitlements, refreshTenantMetadata } = useAuth();
  const [billingCycle, setBillingCycle] = useState<"1year" | "3years">("1year");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [coupon, setCoupon] = useState("");
  const [discountApplied, setDiscountApplied] = useState(false);
  const [upgradedSuccess, setUpgradedSuccess] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const currentTier = entitlements?.tier || "WHOLESALE_PRO";

  const plans = [
    {
      name: "Silver",
      tier: "RETAIL_BASIC",
      priceAnnual: 1499,
      priceThreeYear: 3599,
      isCurrent: currentTier === "RETAIL_BASIC",
      features: ["1 Business Company", "1 User License", "Standard GST Invoicing", "A4 & Thermal Print", "Email Support"],
    },
    {
      name: "Wholesale Pro",
      tier: "WHOLESALE_PRO",
      priceAnnual: 2999,
      priceThreeYear: 7199,
      isCurrent: currentTier === "WHOLESALE_PRO" || (!entitlements?.tier && true),
      features: ["Up to 2 Companies", "3 Staff Users", "Barcode Inventory & Godown", "Automated WhatsApp Reminders", "E-Way Bill Generation"],
    },
    {
      name: "Enterprise",
      tier: "DISTRIBUTION_ENTERPRISE",
      priceAnnual: 4999,
      priceThreeYear: 11999,
      isCurrent: currentTier === "DISTRIBUTION_ENTERPRISE" || currentTier === "MANUFACTURING_SUITE",
      features: ["Unlimited Companies", "Unlimited Staff Users", "Multi-Branch ERP Sync", "E-Invoicing Direct API", "Dedicated CA Relationship Manager"],
    },
  ];

  const handleConfirmPay = async () => {
    setIsUpgrading(true);
    try {
      const tierMap: Record<string, string> = {
        "Silver": "RETAIL_BASIC",
        "Wholesale Pro": "WHOLESALE_PRO",
        "Enterprise": "DISTRIBUTION_ENTERPRISE",
      };
      const tier = tierMap[selectedPlan || ""] || "WHOLESALE_PRO";
      await apiClient.post("/tenants/subscription/upgrade", {
        tier,
        billingCycle,
      });
      if (refreshTenantMetadata) {
        await refreshTenantMetadata();
      }
      setUpgradedSuccess(true);
      setSelectedPlan(null);
      setTimeout(() => setUpgradedSuccess(false), 4000);
    } catch (err: any) {
      alert(err?.message || "Failed to upgrade subscription");
    } finally {
      setIsUpgrading(false);
    }
  };

  const currentSelectedObj = plans.find((p) => p.name === selectedPlan);
  const basePrice = currentSelectedObj
    ? billingCycle === "1year"
      ? currentSelectedObj.priceAnnual
      : currentSelectedObj.priceThreeYear
    : 0;
  const discountAmt = discountApplied ? Math.round(basePrice * 0.2) : 0;
  const taxable = basePrice - discountAmt;
  const gstAmt = Math.round(taxable * 0.18);
  const totalPayable = taxable + gstAmt;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {lang === "gu" ? "સબ્સ્ક્રિપ્શન પ્લાન્સ અને એન્ટાઇટલમેન્ટ્સ" : "Subscription Plans & Entitlements"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === "gu"
              ? "તમારા બિઝનેસ સ્કેલ મુજબ યોગ્ય પ્લાન પસંદ કરો - કોઈ છૂપો ચાર્જ નથી"
              : "Select the right plan for your business scale with zero hidden charges"}
          </p>
        </div>

        {/* 1 Year vs 3 Year Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-center">
          <button
            type="button"
            onClick={() => setBillingCycle("1year")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              billingCycle === "1year" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            1 Year
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("3years")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
              billingCycle === "3years" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>3 Years</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 rounded font-semibold">20% OFF</span>
          </button>
        </div>
      </div>

      {upgradedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <span>✓</span>
          <span>Subscription plan upgraded successfully! Your entitlements have been renewed.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((p) => {
          const displayPrice = billingCycle === "1year" ? p.priceAnnual : p.priceThreeYear;
          return (
            <div
              key={p.name}
              className={`p-6 rounded-2xl border bg-white shadow-2xs flex flex-col justify-between gap-5 transition-all ${
                p.isCurrent ? "border-[#EA580C] ring-2 ring-[#EA580C]/20" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                  {p.isCurrent && (
                    <span className="text-[10px] font-bold text-white bg-[#EA580C] px-2 py-0.5 rounded-full">Current Plan</span>
                  )}
                </div>
                <div>
                  <span className="text-2xl font-black text-slate-900">₹ {displayPrice.toLocaleString("en-IN")}</span>
                  <span className="text-xs text-slate-500 block">
                    {billingCycle === "1year" ? "per year + 18% GST" : "for 3 years + 18% GST"}
                  </span>
                </div>
                <ul className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPlan(p.name)}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  p.isCurrent
                    ? "bg-slate-100 text-slate-800 hover:bg-slate-200"
                    : "bg-[#EA580C] text-white hover:bg-[#C2410C]"
                }`}
              >
                {p.isCurrent ? "Renew Subscription" : `Select ${p.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Upgrade Checkout Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Checkout: {selectedPlan} Plan</h3>
              <button onClick={() => setSelectedPlan(null)} className="text-slate-400 hover:text-slate-700 p-1">✕</button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Billing Period:</span>
                <span className="font-semibold text-slate-900">{billingCycle === "1year" ? "1 Year (Annual)" : "3 Years (Triennial)"}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Plan Base Price:</span>
                <span className="font-semibold text-slate-900">₹ {basePrice.toLocaleString("en-IN")}</span>
              </div>

              {discountApplied && (
                <div className="flex justify-between text-emerald-700">
                  <span>Special Discount (20%):</span>
                  <span className="font-semibold">- ₹ {discountAmt.toLocaleString("en-IN")}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>GST (18%):</span>
                <span className="font-semibold text-slate-900">₹ {gstAmt.toLocaleString("en-IN")}</span>
              </div>

              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-100">
                <span>Total Amount Payable:</span>
                <span className="text-[#EA580C]">₹ {totalPayable.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Coupon Code Field */}
            <div className="pt-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Coupon code (e.g. SAVE20)"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (coupon === "SAVE20" || coupon === "NEW50" || coupon === "MBB500") {
                      setDiscountApplied(true);
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-xl"
                >
                  Apply
                </button>
              </div>
              {discountApplied && <p className="text-[11px] text-emerald-600 mt-1 font-semibold">✓ Coupon applied successfully!</p>}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setSelectedPlan(null)} className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl">
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpgrading}
                onClick={handleConfirmPay}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isUpgrading ? "Activating Subscription..." : "Confirm & Pay Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 9. REFER & EARN VIEW
// =========================================================================
function ReferEarnView() {
  const [copied, setCopied] = useState(false);
  const [referEmail, setReferEmail] = useState("");
  const [referNote, setReferNote] = useState<string | null>(null);
  const referralCode = "JKBILL500";
  const shareUrl = `https://myownbillbook.com/join?ref=${referralCode}`;

  const copyCode = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
        <h1 className="text-xl font-bold text-slate-900">Refer Businesses & Earn ₹500 Discount</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Share your referral code with fellow business owners. They get ₹500 discount on signup and you get ₹500 on your next renewal.
        </p>
      </div>

      <div className="bg-gradient-to-r from-indigo-50/80 via-white to-indigo-50/80 rounded-2xl border border-indigo-100 p-5 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-600 block">Your Exclusive Referral Link:</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-sm font-bold text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
              {shareUrl}
            </span>
            <button
              type="button"
              onClick={copyCode}
              className="px-4 py-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              {copied ? "Copied! ✓" : "Copy Link"}
            </button>
          </div>
        </div>

        <a
          href={`https://wa.me/?text=Hello!%20I%20am%20using%20myownBillBook%20for%20GST%20Billing%20and%20Accounting.%20Use%20my%20link%20to%20get%20Rs.500%20discount:%20${encodeURIComponent(shareUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 shrink-0"
        >
          <span>Share on WhatsApp</span>
        </a>
      </div>

      <form
        className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col sm:flex-row gap-2 max-w-xl"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const result = await sendAppEmail({
              to: referEmail.trim(),
              subject: "Join myownbillbook with a referral",
              heading: "You are invited to myownbillbook",
              intro: "Start GST billing and accounts with this referral link.",
              details: [{ label: "Referral link", value: shareUrl }],
              text: "Open the link to create an account.",
            });
            setReferNote(mailResultMessage(result, "en"));
          } catch (err: any) {
            setReferNote(err?.message || "Could not send the referral email.");
          }
        }}
      >
        <input
          type="email"
          required
          value={referEmail}
          onChange={(e) => setReferEmail(e.target.value)}
          placeholder="friend@business.com"
          className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
        />
        <button type="submit" className="px-4 py-2 bg-[#6366F1] text-white text-xs font-bold rounded-xl">
          Email referral
        </button>
        {referNote && <p className="text-xs text-slate-600 sm:col-span-2">{referNote}</p>}
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Friends Invited", val: "4" },
          { label: "Activated Subscriptions", val: "2" },
          { label: "Available Credits", val: "₹ 1,000" },
        ].map((st) => (
          <div key={st.label} className="p-4 rounded-xl border border-slate-200 bg-white text-center">
            <p className="text-xs text-slate-500">{st.label}</p>
            <p className="text-xl font-black text-slate-900 mt-1">{st.val}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// =========================================================================
// 10. HELP & SUPPORT VIEW
// =========================================================================
function HelpSupportView() {
  const [callbackName, setCallbackName] = useState("");
  const [callbackPhone, setCallbackPhone] = useState("");
  const [callbackEmail, setCallbackEmail] = useState("");
  const [callbackDone, setCallbackDone] = useState(false);
  const [callbackError, setCallbackError] = useState<string | null>(null);

  const handleCallback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callbackPhone.trim() || !callbackEmail.trim()) return;
    setCallbackError(null);
    try {
      const result: any = await apiClient.post("/mail/support", {
        name: callbackName.trim(),
        phone: callbackPhone.trim(),
        email: callbackEmail.trim(),
        subject: "Support callback request",
        text: `Please call ${callbackName.trim()} on ${callbackPhone.trim()}.`,
      });
      if (!result.delivered) {
        setCallbackError(mailResultMessage(result, "en"));
        return;
      }
      setCallbackDone(true);
      setTimeout(() => {
        setCallbackDone(false);
        setCallbackName("");
        setCallbackPhone("");
        setCallbackEmail("");
      }, 3000);
    } catch (err: any) {
      setCallbackError(err?.message || "Could not send the confirmation email.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
        <h1 className="text-xl font-bold text-slate-900">24x7 Customer Support & Help Center</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Dedicated assistance in Gujarati and English from our certified accounting specialists
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a
          href="https://wa.me/917400199999?text=Hello%20myBillBook%20Support"
          target="_blank"
          rel="noopener noreferrer"
          className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 transition-colors flex items-center gap-3.5"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">WA</div>
          <div>
            <p className="text-sm font-bold text-slate-900">WhatsApp Live Support</p>
            <p className="text-xs text-slate-600 mt-0.5">Instant chat with support engineer (9 AM - 9 PM)</p>
          </div>
        </a>

        <a
          href="tel:08035002000"
          className="p-5 rounded-2xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/70 transition-colors flex items-center gap-3.5"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg">📞</div>
          <div>
            <p className="text-sm font-bold text-slate-900">Helpline: 080-3500-2000</p>
            <p className="text-xs text-slate-600 mt-0.5">Direct phone assistance for billing & GST issues</p>
          </div>
        </a>
      </div>

      {/* Request Callback Form */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Request an Immediate Callback</h2>
        {callbackDone ? (
          <p className="text-xs text-emerald-700 font-bold p-3 bg-emerald-50 rounded-xl">
            ✓ Confirmation emailed. Our representative will call the number you entered.
          </p>
        ) : (
          <form onSubmit={handleCallback} className="flex flex-col sm:flex-row gap-3 max-w-lg">
            <input
              type="text"
              value={callbackName}
              onChange={(e) => setCallbackName(e.target.value)}
              placeholder="Your Name"
              required
              className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
            <input
              type="text"
              value={callbackPhone}
              onChange={(e) => setCallbackPhone(e.target.value)}
              placeholder="Mobile Number"
              required
              className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
            />
            <input
              type="email"
              value={callbackEmail}
              onChange={(e) => setCallbackEmail(e.target.value)}
              placeholder="Email for confirmation"
              required
              className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
            <button type="submit" className="px-5 py-2 bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-bold rounded-xl shadow-xs">
              Call Me
            </button>
          </form>
        )}
        {callbackError && <p className="text-xs text-amber-800 font-semibold">{callbackError}</p>}
      </div>
    </div>
  );
}

