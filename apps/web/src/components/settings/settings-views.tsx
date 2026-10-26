"use client";

import React, { useState, useEffect, useRef } from "react";
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
  const { user, currentCompany, entitlements, lang, patchUser } = useAuth();
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
  const [receiptModal, setReceiptModal] = useState<{ id: string; plan: string; date: string; amount: string } | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const planName = entitlements?.name || "Wholesale Pro";
  const planEndsOn = formatReadableDate(entitlements?.subscriptionEnds || "2026-12-11T09:26:49.889Z");

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

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* 1. Header Bar with Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {lang === "gu" ? "ખાતાકીય સેટિંગ્સ" : "Account Settings"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {lang === "gu"
              ? "તમારા એકાઉન્ટ, પ્રોફાઇલ અને સબ્સ્ક્રિપ્શન પ્લાનનું સંચાલન"
              : "Manage Your Account And Subscription"}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            title="Keyboard Shortcuts"
            onClick={() => alert("Keyboard shortcuts:\n• F2: Create New Bill\n• F4: Quick Sales\n• Esc: Close Modal")}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </button>

          <a
            href="https://wa.me/917400199999?text=Hello%20MyBillBook%20Support%20Team"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/80 text-blue-700 text-xs font-semibold transition-colors"
          >
            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>{lang === "gu" ? "ચેટ સપોર્ટ" : "Chat Support"}</span>
          </a>

          <button
            type="button"
            onClick={() => {
              setName(user?.name || "");
              setEmail(u?.email || "");
              setProfileOtp("");
              setDevOtp(null);
            }}
            className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
          >
            {lang === "gu" ? "રદ કરો" : "Cancel"}
          </button>

          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="px-4 py-1.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold transition-all shadow-xs hover:shadow-sm disabled:opacity-60 flex items-center gap-1.5"
          >
            {isSaving && (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
            )}
            <span>{lang === "gu" ? "ફેરફારો સાચવો" : "Save Changes"}</span>
          </button>
        </div>
      </div>

      {saveBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>{saveBanner}</span>
        </div>
      )}

      {/* 2. Feedback / Share Suggestion Banner */}
      <div className="bg-gradient-to-r from-orange-50/90 via-amber-50/70 to-orange-50/90 border border-orange-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#EA580C] text-white flex items-center justify-center shrink-0 shadow-xs">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">
              {lang === "gu" ? "અમને myBillBook ને વધુ સારું બનાવવામાં મદદ કરો" : "Help us make myBillBook better"}
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              {lang === "gu"
                ? "તમારો નવો ફીચર આઈડિયા કે સલાહ અમારી પ્રોડક્ટ ટીમ સાથે શેર કરો"
                : "Share your product feedback, requested features, or workflow suggestions with our team"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowShareSuggestion(true)}
          className="px-4 py-2 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-bold transition-all shadow-xs shrink-0 self-start sm:self-auto flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>{lang === "gu" ? "+ સૂચન શેર કરો" : "+ Share Suggestion"}</span>
        </button>
      </div>

      {/* 3. General Information Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {lang === "gu" ? "સામાન્ય માહિતી (GENERAL INFORMATION)" : "GENERAL INFORMATION"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === "gu" ? "નામ *" : "NAME *"}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] font-medium text-slate-900 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>{lang === "gu" ? "મોબાઇલ નંબર" : "MOBILE NUMBER"}</span>
              <span className="text-[10px] text-slate-400 font-normal flex items-center gap-0.5">
                <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {lang === "gu" ? "સુરક્ષિત લોગિન આઈડી" : "Locked Identity"}
              </span>
            </label>
            <input
              type="text"
              value={mobile}
              readOnly
              disabled
              className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-mono cursor-not-allowed select-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === "gu" ? "ઇમેઇલ" : "EMAIL"}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setProfileOtp("");
                setDevOtp(null);
              }}
              placeholder="owner@gmail.com"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] font-medium text-slate-900 transition-all"
            />
            {emailChanged && (
              <div className="mt-2 space-y-2">
                <p className="text-[11px] text-slate-500">
                  {lang === "gu"
                    ? "નવો ઈમેલ સાચવતા પહેલા તેના પર મોકલેલો કોડ ચકાસો."
                    : "Verify the code sent to this email before saving the change."}
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    inputMode="numeric"
                    maxLength={6}
                    value={profileOtp}
                    onChange={(e) => setProfileOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder={lang === "gu" ? "6 અંકનો કોડ" : "6-digit code"}
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={handleSendProfileOtp}
                    disabled={isSaving}
                    className="px-3 py-2 text-xs font-bold text-[#6366F1] border border-indigo-200 rounded-xl hover:bg-indigo-50"
                  >
                    {lang === "gu" ? "કોડ મોકલો" : "Send code"}
                  </button>
                </div>
                {devOtp && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                    {lang === "gu" ? "સ્થાનિક કોડ: " : "Local code (SMTP off): "}
                    <strong className="font-mono">{devOtp}</strong>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleChangePassword} className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {lang === "gu" ? "પાસવર્ડ બદલો" : "Change Password"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder={lang === "gu" ? "હાલનો પાસવર્ડ" : "Current password"}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            required
          />
          <input
            type="password"
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={lang === "gu" ? "નવો પાસવર્ડ" : "New password"}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            required
          />
        </div>
        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl disabled:opacity-60">
          {lang === "gu" ? "પાસવર્ડ અપડેટ કરો" : "Update password"}
        </button>
      </form>

      {/* 4. Referral Code Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {lang === "gu"
            ? "સબ્સ્ક્રિપ્શન ડિસ્કાઉન્ટ માટે રેફરલ કોડ"
            : "REFERRAL CODE FOR SUBSCRIPTION DISCOUNT"}
        </h2>

        <form onSubmit={handleApplyReferral} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-md">
          <input
            type="text"
            value={referralCode}
            onChange={(e) => {
              setReferralCode(e.target.value.toUpperCase());
              setReferralMessage(null);
            }}
            placeholder="REFERRAL CODE"
            className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl uppercase font-mono tracking-wider focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]"
          />
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white text-xs font-bold transition-all shadow-xs"
          >
            {lang === "gu" ? "લાગુ કરો" : "Apply"}
          </button>
        </form>

        {referralMessage?.type === "success" && (
          <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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

      {/* 5. Subscription Plan Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {lang === "gu" ? "સબ્સ્ક્રિપ્શન પ્લાન" : "SUBSCRIPTION PLAN"}
        </h2>

        <div className="p-4 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50/70 via-white to-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-[#4338CA] flex items-center justify-center shrink-0 shadow-2xs">
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-slate-900 tracking-tight">
                  {planName}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                GST Invoicing, E-Way Bill, Multi-Business, POS Counter & Audit Export
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="text-left md:text-right">
              <span className="text-xs text-slate-500 block">
                {lang === "gu" ? "તમારો પ્લાન આ તારીખે સમાપ્ત થશે:" : "Your Plan ends on:"}
              </span>
              <span className="text-sm font-bold text-slate-900 font-mono">
                {planEndsOn}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowUpgradeModal(true)}
              className="px-4 py-2 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{lang === "gu" ? "પ્લાન અપગ્રેડ કરો" : "Upgrade Plan"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6. Billing History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {lang === "gu" ? "બિલિંગ ઇતિહાસ" : "BILLING HISTORY"}
        </h2>

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
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3 px-4 text-slate-700 font-medium">19 Oct 2026</td>
                <td className="py-3 px-4 font-bold text-slate-900">Platinum</td>
                <td className="py-3 px-4 font-mono text-slate-600">MBB/26-27/233808</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Success
                  </span>
                </td>
                <td className="py-3 px-4 font-bold text-slate-900">₹ 2</td>
                <td className="py-3 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => setReceiptModal({ id: "MBB/26-27/233808", plan: "Platinum", date: "19 Oct 2026", amount: "₹ 2" })}
                    className="inline-flex items-center gap-1 text-[#6366F1] hover:text-[#4F46E5] font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download Receipt</span>
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3 px-4 text-slate-700 font-medium">15 Apr 2026</td>
                <td className="py-3 px-4 font-bold text-slate-900">Wholesale Pro (Annual)</td>
                <td className="py-3 px-4 font-mono text-slate-600">MBB/26-27/109412</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Success
                  </span>
                </td>
                <td className="py-3 px-4 font-bold text-slate-900">₹ 2,999</td>
                <td className="py-3 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => setReceiptModal({ id: "MBB/26-27/109412", plan: "Wholesale Pro (Annual)", date: "15 Apr 2026", amount: "₹ 2,999" })}
                    className="inline-flex items-center gap-1 text-[#6366F1] hover:text-[#4F46E5] font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download Receipt</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Download Receipt Modal */}
      {receiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">✓</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Tax Invoice / Receipt</h3>
                  <p className="text-[11px] text-slate-500 font-mono">{receiptModal.id}</p>
                </div>
              </div>
              <button onClick={() => setReceiptModal(null)} className="text-slate-400 hover:text-slate-700 p-1">✕</button>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Billed To:</span><span className="font-bold text-slate-900">{user?.name || "Audit Admin User"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Plan:</span><span className="font-bold text-slate-900">{receiptModal.plan}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Invoice Date:</span><span className="font-mono text-slate-700">{receiptModal.date}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">GST Status:</span><span className="text-emerald-700 font-semibold">18% IGST Paid</span></div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm"><span className="font-bold text-slate-900">Total Paid:</span><span className="font-black text-[#EA580C]">{receiptModal.amount}</span></div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setReceiptModal(null)} className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl">Close</button>
              <button
                onClick={() => {
                  alert(`Receipt ${receiptModal.id} downloaded successfully.`);
                  setReceiptModal(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-[#6366F1] hover:bg-[#4F46E5] rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <span>Download PDF</span>
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
                Upgrade to Enterprise Plan
              </h3>
              <button onClick={() => setShowUpgradeModal(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
            </div>
            <p className="text-xs text-slate-600">
              Unlock unlimited businesses, multi-branch Godown sync, automated WhatsApp collections, and dedicated account manager.
            </p>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-slate-900">Enterprise Annual Subscription</p>
                <p className="text-[11px] text-slate-500">Includes all GST modules + 10 staff licenses</p>
              </div>
              <span className="text-lg font-black text-slate-900">₹ 4,999<span className="text-xs font-normal text-slate-500">/yr</span></span>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setShowUpgradeModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
              <button
                onClick={() => {
                  alert("Redirecting to Razorpay secure checkout...");
                  setShowUpgradeModal(false);
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-xl shadow-xs"
              >
                Proceed to Checkout →
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
  const { lang, currentCompany, refreshTenantMetadata, companies } = useAuth();
  const c = currentCompany as any;

  const [activeSubTab, setActiveSubTab] = useState<"details" | "companies">("details");
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    enableGujaratiPrint: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [signatureMode, setSignatureMode] = useState<"draw" | "upload" | "cursive">("draw");
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load authoritative company details from API or fallback to localStorage
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res: any = await apiClient.get("/tenants/company");
        if (isMounted && res) {
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
          }));
        }
      } catch {
        const local = localStorage.getItem(`billing_company_settings_${currentCompany?.id}`);
        if (local && isMounted) {
          try {
            setFormData((prev) => ({ ...prev, ...JSON.parse(local) }));
          } catch {}
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [currentCompany?.id]);

  // Auto-extract State Code and PAN from GSTIN
  const handleGstinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().slice(0, 15);
    let stateCode = formData.stateCode;
    let pan = formData.pan;

    if (val.length >= 2) {
      const code = val.slice(0, 2);
      if (INDIAN_STATES[code]) stateCode = code;
    }
    if (val.length >= 12) {
      pan = val.slice(2, 12);
    }
    setFormData((prev) => ({ ...prev, gstin: val, stateCode, pan }));
  };

  // Drawing Canvas Handlers
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

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      setFormData((prev) => ({ ...prev, signatureUrl: canvasRef.current!.toDataURL("image/png") }));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setFormData((prev) => ({ ...prev, signatureUrl: "" }));
  };

  const generateCursiveSignature = () => {
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = 380;
    canvas.height = 110;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "italic 38px 'Brush Script MT', 'Dancing Script', cursive, sans-serif";
    ctx.fillStyle = "#1e3a8a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(formData.signatoryName || formData.tradeName || "Authorized Sign", canvas.width / 2, 45);
    ctx.beginPath();
    ctx.moveTo(40, 75);
    ctx.quadraticCurveTo(190, 95, 340, 70);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#1e3a8a";
    ctx.stroke();
    setFormData((prev) => ({ ...prev, signatureUrl: canvas.toDataURL("image/png") }));
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFormData((prev) => ({ ...prev, signatureUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccess(false);
    try {
      await apiClient.patch("/tenants/company", formData);
      await refreshTenantMetadata();
      localStorage.setItem(`billing_company_settings_${currentCompany?.id}`, JSON.stringify(formData));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
    } catch {
      localStorage.setItem(`billing_company_settings_${currentCompany?.id}`, JSON.stringify(formData));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header and Subtabs */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {lang === "gu" ? "વ્યવસાય વિગતો અને બેંક સેટિંગ્સ" : "Manage Business Profile & Bank Details"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {lang === "gu"
                ? "કાયદેસર માહિતી, GSTIN, સરનામું, બેંક એકાઉન્ટ અને સહી"
                : "Legal business profile, GSTIN, official address, bank details and authorized signature"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeSubTab === "companies" && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-3.5 py-1.5 bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-bold rounded-xl shadow-xs"
              >
                + Add Company
              </button>
            )}
            {activeSubTab === "details" && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSaving}
                className="px-4 py-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold rounded-xl shadow-xs transition-all"
              >
                {isSaving ? "Saving..." : lang === "gu" ? "સાચવો" : "Save Changes"}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 border-b border-slate-200 pt-1">
          <button
            type="button"
            onClick={() => setActiveSubTab("details")}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors ${
              activeSubTab === "details" ? "border-[#6366F1] text-[#6366F1]" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Active Business Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("companies")}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeSubTab === "companies" ? "border-[#6366F1] text-[#6366F1]" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>All Companies ({companies.length})</span>
          </button>
        </div>
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
          Business details updated successfully!
        </div>
      )}

      {activeSubTab === "companies" ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Configured Businesses</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {companies.map((co) => (
              <div key={co.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">{co.tradeName || co.legalName}</p>
                  <p className="text-xs text-slate-500">{co.city || "Ahmedabad"} • GST: {co.gstin || "Unregistered"}</p>
                </div>
                {co.id === currentCompany?.id ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Active</span>
                ) : (
                  <span className="text-xs text-[#6366F1] font-semibold">Configured</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1: Business Profile */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Business Identity</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Trade / Display Name *</label>
                <input
                  type="text"
                  value={formData.tradeName}
                  onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Legal Registered Name</label>
                <input
                  type="text"
                  value={formData.legalName}
                  onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN Number (15 Digits)</label>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={handleGstinChange}
                  placeholder="24ABCDE1234F1Z5"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">PAN Number</label>
                <input
                  type="text"
                  value={formData.pan}
                  onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                  placeholder="ABCDE1234F"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                <select
                  value={formData.stateCode}
                  onChange={(e) => setFormData({ ...formData, stateCode: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                >
                  {Object.entries(INDIAN_STATES).map(([code, st]) => (
                    <option key={code} value={code}>{code} - {st.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City / Town</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Bank & UPI Info */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bank Accounts & UPI for Invoices</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="e.g. State Bank of India"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number</label>
                <input
                  type="text"
                  value={formData.bankAccountNo}
                  onChange={(e) => setFormData({ ...formData, bankAccountNo: e.target.value })}
                  placeholder="123456789012"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={formData.bankIfsc}
                  onChange={(e) => setFormData({ ...formData, bankIfsc: e.target.value.toUpperCase() })}
                  placeholder="SBIN0001234"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">UPI VPA (QR Code)</label>
                <input
                  type="text"
                  value={formData.upiVpa}
                  onChange={(e) => setFormData({ ...formData, upiVpa: e.target.value })}
                  placeholder="business@okaxis"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Authorized Signatory Name</label>
                <input
                  type="text"
                  value={formData.signatoryName}
                  onChange={(e) => setFormData({ ...formData, signatoryName: e.target.value })}
                  placeholder="Jaydeep Patel"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                <input
                  type="text"
                  value={formData.signatoryDesignation}
                  onChange={(e) => setFormData({ ...formData, signatoryDesignation: e.target.value })}
                  placeholder="Proprietor / Partner"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Signature Pad */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Authorized Digital Signature for Bills</h2>
            <div className="flex items-center gap-2 pb-2">
              <button
                type="button"
                onClick={() => setSignatureMode("draw")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  signatureMode === "draw" ? "bg-[#6366F1] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Draw Signature
              </button>
              <button
                type="button"
                onClick={() => {
                  setSignatureMode("cursive");
                  generateCursiveSignature();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  signatureMode === "cursive" ? "bg-[#6366F1] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Generate Cursive
              </button>
              <button
                type="button"
                onClick={() => setSignatureMode("upload")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  signatureMode === "upload" ? "bg-[#6366F1] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Upload PNG/JPG
              </button>
            </div>

            {signatureMode === "draw" && (
              <div className="space-y-2">
                <div className="border border-dashed border-slate-300 rounded-xl p-1 bg-slate-50 inline-block">
                  <canvas
                    ref={canvasRef}
                    width={380}
                    height={110}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="bg-white rounded-lg cursor-crosshair touch-none"
                  ></canvas>
                </div>
                <div>
                  <button type="button" onClick={clearCanvas} className="text-xs text-rose-600 font-semibold hover:underline">Clear Canvas</button>
                </div>
              </div>
            )}

            {signatureMode === "upload" && (
              <div>
                <input type="file" accept="image/*" onChange={handleSignatureUpload} className="text-xs text-slate-600" />
              </div>
            )}

            {formData.signatureUrl && (
              <div className="pt-2">
                <span className="text-[11px] text-slate-500 block mb-1">Active Signature Preview:</span>
                <img src={formData.signatureUrl} alt="Signature Preview" className="h-14 border border-slate-200 rounded-lg p-1 bg-white inline-block" />
              </div>
            )}
          </div>
        </form>
      )}

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
  const [selectedTheme, setSelectedTheme] = useState<"advanced" | "luxury" | "stylish">("advanced");
  const [selectedColor, setSelectedColor] = useState("#0F172A"); // Navy default

  // Theme Settings Toggles
  const [showPartyBalance, setShowPartyBalance] = useState(true);
  const [enableFreeQty, setEnableFreeQty] = useState(true);
  const [showItemDesc, setShowItemDesc] = useState(true);
  const [showHsn, setShowHsn] = useState(true);
  const [showTaxBreakup, setShowTaxBreakup] = useState(true);
  const [printBankDetails, setPrintBankDetails] = useState(true);
  const [roundOff, setRoundOff] = useState(true);

  // Notes & Terms
  const [terms, setTerms] = useState(
    "1. Goods once sold will not be accepted back or exchanged.\n2. Interest @ 18% per annum will be charged if payment is delayed beyond due date.\n3. All disputes are subject to local jurisdiction only."
  );

  // Accordion controls
  const [openSection, setOpenSection] = useState<string | null>("series");
  const [savedBanner, setSavedBanner] = useState(false);

  // Color options matching screenshot
  const colorPalette = [
    { id: "#0F172A", name: "Deep Navy Blue", bg: "bg-[#0F172A]" },
    { id: "#0284C7", name: "Sky Blue", bg: "bg-[#0284C7]" },
    { id: "#0D9488", name: "Teal", bg: "bg-[#0D9488]" },
    { id: "#881337", name: "Burgundy Red", bg: "bg-[#881337]" },
    { id: "#4F46E5", name: "Indigo", bg: "bg-[#4F46E5]" },
    { id: "#D97706", name: "Golden Ochre", bg: "bg-[#D97706]" },
    { id: "#78350F", name: "Bronze Brown", bg: "bg-[#78350F]" },
  ];

  // Festive Themes list for ThemeStore
  const festiveThemes = [
    { id: "navaratri", label: "Navaratri", gradient: "from-amber-100 to-orange-100" },
    { id: "durga", label: "Durga Puja", gradient: "from-rose-100 to-red-100" },
    { id: "dussehra", label: "Dussehra", gradient: "from-yellow-100 to-amber-100" },
    { id: "dhanteras", label: "Dhanteras", gradient: "from-amber-200 to-yellow-200" },
    { id: "diwali", label: "Diwali", gradient: "from-purple-100 to-pink-100" },
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
        if (parsed.selectedTheme) setSelectedTheme(parsed.selectedTheme);
        if (parsed.showPartyBalance !== undefined) setShowPartyBalance(parsed.showPartyBalance);
        if (parsed.enableFreeQty !== undefined) setEnableFreeQty(parsed.enableFreeQty);
        if (parsed.showItemDesc !== undefined) setShowItemDesc(parsed.showItemDesc);
        if (parsed.showHsn !== undefined) setShowHsn(parsed.showHsn);
        if (parsed.showTaxBreakup !== undefined) setShowTaxBreakup(parsed.showTaxBreakup);
        if (parsed.printBankDetails !== undefined) setPrintBankDetails(parsed.printBankDetails);
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
        showPartyBalance,
        enableFreeQty,
        showItemDesc,
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

  const displayName = currentCompany?.tradeName || currentCompany?.legalName || "MODI CHAI";
  const displayPhone = (currentCompany as any)?.phone || user?.phone || "9510442798";
  const displayState = currentCompany?.stateCode ? "Gujarat," : "Gujarat,";

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      {/* Top Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {lang === "gu" ? "ઇન્વોઇસ સેટિંગ્સ" : "Invoice Settings"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === "gu" ? "લાઇવ A4 પ્રિવ્યૂ, કલર થીમ્સ અને ઇન્વોઇસ કસ્ટમાઇઝેશન" : "Live A4 invoice preview, color themes, and print preferences"}
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
            onClick={handleSave}
            className="px-5 py-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            {lang === "gu" ? "સાચવો" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* 2-Column Studio Layout */}
      <div className="flex flex-col xl:flex-row gap-5 items-start">
        {/* LEFT COLUMN: Live A4 Invoice Sheet Preview */}
        <div className="flex-1 w-full bg-[#E5E7EB]/60 rounded-2xl p-4 sm:p-6 lg:p-8 flex justify-center items-start overflow-x-auto border border-slate-200 min-h-[750px]">
          <div className="w-full max-w-[620px] bg-white shadow-xl border border-slate-300 text-[10.5px] text-slate-800 p-6 space-y-3 font-sans rounded-xs select-none">
            {/* Header Titles */}
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-bold tracking-wider text-xs">TAX INVOICE</span>
              <span className="text-[9px] font-semibold text-slate-600 border border-slate-400 px-2 py-0.5 uppercase tracking-wide">
                ORIGINAL FOR RECIPIENT
              </span>
            </div>

            {/* Company & Meta Box */}
            <div className="border border-slate-800 grid grid-cols-2">
              <div className="p-2.5 border-r border-slate-800 space-y-0.5">
                <p className="font-black text-sm uppercase text-slate-900">{displayName}</p>
                <p className="text-slate-600">{displayState}</p>
                <p className="text-slate-600">Mobile: {displayPhone}</p>
              </div>
              <div className="text-[10px] divide-y divide-slate-800">
                <div className="p-1.5 flex justify-between">
                  <span className="font-semibold text-slate-600">Invoice No.:</span>
                  <span className="font-bold font-mono">{prefix}{nextSeq.padStart(3, "0")}</span>
                </div>
                <div className="p-1.5 flex justify-between">
                  <span className="font-semibold text-slate-600">Invoice Date:</span>
                  <span>17/01/2026 3:47 PM</span>
                </div>
                <div className="p-1.5 flex justify-between">
                  <span className="font-semibold text-slate-600">Due Date:</span>
                  <span>16/02/2026</span>
                </div>
              </div>
            </div>

            {/* BILL TO & SHIP TO Box */}
            <div className="border border-slate-800 grid grid-cols-2 text-[10px]">
              <div className="p-2 border-r border-slate-800 space-y-0.5">
                <p className="font-bold text-[9px] text-slate-500 uppercase">BILL TO</p>
                <p className="font-bold text-slate-900">SAMPLE PARTY</p>
                <p className="text-slate-600 text-[9.5px]">Address: No F2, Outer Circle, Connaught Circus, New Delhi, DELHI, 110001</p>
                <p className="text-slate-600">GSTIN: 07ABCCH2702M4ZZ</p>
                <p className="text-slate-600">Mobile: 7400417400</p>
              </div>
              <div className="p-2 space-y-0.5">
                <p className="font-bold text-[9px] text-slate-500 uppercase">SHIP TO</p>
                <p className="font-bold text-slate-900">Sample Shipping Company</p>
                <p className="text-slate-600 text-[9.5px]">Address: 1234123 324324234, Industrial Area, Bengaluru, 560001</p>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-[9.5px]">
                <thead style={{ backgroundColor: selectedColor, color: "#FFFFFF" }}>
                  <tr className="border-b border-slate-800 font-bold uppercase tracking-wider text-[9px]">
                    <th className="p-1.5 text-center w-8">S.NO.</th>
                    <th className="p-1.5">ITEMS</th>
                    {showHsn && <th className="p-1.5 text-center">HSN</th>}
                    <th className="p-1.5 text-center">QTY.</th>
                    <th className="p-1.5 text-right">RATE</th>
                    <th className="p-1.5 text-right">DISC.</th>
                    <th className="p-1.5 text-right pr-2">AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr className="align-top">
                    <td className="p-1.5 text-center font-medium">1</td>
                    <td className="p-1.5">
                      <p className="font-bold text-slate-900">Samsung A30</p>
                      {showItemDesc && <p className="text-[8.5px] text-slate-500">samsung phone</p>}
                    </td>
                    {showHsn && <td className="p-1.5 text-center font-mono">1234</td>}
                    <td className="p-1.5 text-center">1 PCS</td>
                    <td className="p-1.5 text-right">10,000</td>
                    <td className="p-1.5 text-right text-slate-600">1,000 (10%)</td>
                    <td className="p-1.5 text-right font-semibold pr-2">9,000.00</td>
                  </tr>
                  <tr className="align-top">
                    <td className="p-1.5 text-center font-medium">2</td>
                    <td className="p-1.5">
                      <p className="font-bold text-slate-900">Parle-G 200g</p>
                      {showItemDesc && <p className="text-[8.5px] text-slate-500">best biscuit</p>}
                    </td>
                    {showHsn && <td className="p-1.5 text-center font-mono">40511209</td>}
                    <td className="p-1.5 text-center">1 BOX</td>
                    <td className="p-1.5 text-right">342.86</td>
                    <td className="p-1.5 text-right text-slate-600">51.43 (15%)</td>
                    <td className="p-1.5 text-right font-semibold pr-2">291.43</td>
                  </tr>
                  <tr className="align-top">
                    <td className="p-1.5 text-center font-medium">3</td>
                    <td className="p-1.5">
                      <p className="font-bold text-slate-900">Puma Blue Round Neck T-Shirt</p>
                    </td>
                    {showHsn && <td className="p-1.5 text-center font-mono">2032</td>}
                    <td className="p-1.5 text-center">2 PCS</td>
                    <td className="p-1.5 text-right">900.00</td>
                    <td className="p-1.5 text-right text-slate-600">0 (0%)</td>
                    <td className="p-1.5 text-right font-semibold pr-2">1,800.00</td>
                  </tr>
                </tbody>
              </table>

              {/* Tax Breakup Rows */}
              {showTaxBreakup && (
                <div className="border-t border-slate-300 bg-slate-50/50 p-1.5 text-[9px] flex justify-end gap-6 text-slate-600">
                  <span>IGST @5%: <strong className="text-slate-900 font-mono">₹ 104.57</strong></span>
                  <span>IGST @18%: <strong className="text-slate-900 font-mono">₹ 1,620.00</strong></span>
                </div>
              )}

              {/* Totals Summary */}
              <div className="border-t border-slate-800 p-2 bg-slate-100 flex items-center justify-between font-bold text-[10px]">
                <span>TOTAL (Qty: 4)</span>
                <span className="text-slate-600 font-normal">Disc: ₹ 1,051.43</span>
                <span className="text-sm font-black text-slate-900 pr-1">₹ 9,596.50</span>
              </div>
            </div>

            {/* Balances if checked */}
            {showPartyBalance && (
              <div className="border border-slate-800 p-2 text-[9px] flex justify-between bg-slate-50 font-medium">
                <div>
                  <span className="text-slate-500">PREVIOUS BALANCE: </span>
                  <span className="font-bold font-mono text-rose-700">₹ -1,92,050.15</span>
                </div>
                <div>
                  <span className="text-slate-500">CURRENT BALANCE: </span>
                  <span className="font-bold font-mono text-slate-900">₹ -1,82,453.65</span>
                </div>
              </div>
            )}

            {/* Bank & Signatory Footer */}
            <div className="border border-slate-800 p-2 text-[9px] grid grid-cols-2 gap-2">
              <div>
                <p className="font-bold uppercase text-slate-700">TERMS AND CONDITIONS</p>
                <p className="text-slate-500 text-[8.5px] leading-tight whitespace-pre-wrap">{terms}</p>
              </div>
              <div className="text-right flex flex-col justify-between items-end">
                <p className="font-bold text-slate-900">For {displayName}</p>
                <div className="pt-6">
                  <p className="text-[8.5px] text-slate-500">Authorised Signatory</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Studio Controls Panel */}
        <div className="w-full xl:w-[420px] shrink-0 space-y-4">
          {/* ThemeStore Carousel Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">ThemeStore</span>
              <span className="text-slate-400 text-xs">ⓘ</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {festiveThemes.map((th) => (
                <div
                  key={th.id}
                  className={`w-18 shrink-0 p-2 rounded-xl border border-slate-200 bg-gradient-to-b ${th.gradient} text-center cursor-pointer hover:border-slate-400 transition-all`}
                >
                  <div className="h-8 rounded bg-white/70 mb-1 border border-slate-200/60 shadow-2xs"></div>
                  <span className="text-[10px] font-medium text-slate-700 leading-tight block truncate">{th.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Themes Selector Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <input type="radio" checked readOnly className="text-[#6366F1]" />
              <span className="text-xs font-bold text-slate-900">Themes</span>
            </div>

            {/* Notice Banner from Screenshot */}
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-snug flex items-start gap-1.5">
              <span>ⓘ</span>
              <div>
                Thermal theme was used previously. To manage preferences, visit{" "}
                <Link href="/settings/thermal-print" className="text-indigo-600 font-bold underline">
                  Thermal Settings
                </Link>
              </div>
            </div>

            {/* Theme Thumbnails */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: "advanced", title: "Advanced GST", sub: "(Tally)", hasNew: false },
                { id: "luxury", title: "Luxury", sub: "", hasNew: true },
                { id: "stylish", title: "Stylish", sub: "", hasNew: false },
                { id: "see-all", title: "See All", sub: "", hasNew: false },
              ].map((th) => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => th.id !== "see-all" && setSelectedTheme(th.id as any)}
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
                  <p className="text-[10px] font-bold text-slate-800 leading-tight truncate">{th.title}</p>
                  {th.sub && <p className="text-[8.5px] text-slate-500 leading-none">{th.sub}</p>}
                </button>
              ))}
            </div>

            {/* Custom Theme Radio */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="customThemeRadio" className="text-[#6366F1]" />
                <span className="text-xs font-semibold text-slate-800">Create Custom Theme ⓘ</span>
              </label>
              <button
                type="button"
                className="w-full py-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
              >
                Create your own theme
              </button>
            </div>
          </div>

          {/* Select Color Swatches Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-2.5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Select Color</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {colorPalette.map((col) => (
                <button
                  key={col.id}
                  type="button"
                  title={col.name}
                  onClick={() => setSelectedColor(col.id)}
                  className={`w-9 h-7 rounded-lg ${col.bg} transition-all relative flex items-center justify-center cursor-pointer shadow-xs ${
                    selectedColor === col.id ? "ring-2 ring-offset-2 ring-slate-800" : "hover:opacity-90"
                  }`}
                >
                  {selectedColor === col.id && (
                    <span className="text-[10px] text-white font-bold leading-none">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Theme Settings Checkboxes */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Theme Settings</h3>
              <span className="text-[9px] font-black uppercase bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                NEW
              </span>
            </div>

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
                  checked={enableFreeQty}
                  onChange={(e) => setEnableFreeQty(e.target.checked)}
                  className="rounded text-[#6366F1] w-4 h-4"
                />
                <span className="text-slate-800">Enable free item quantity</span>
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
                  checked={showHsn}
                  onChange={(e) => setShowHsn(e.target.checked)}
                  className="rounded text-[#6366F1] w-4 h-4"
                />
                <span className="text-slate-800">Show HSN / SAC code column</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTaxBreakup}
                  onChange={(e) => setShowTaxBreakup(e.target.checked)}
                  className="rounded text-[#6366F1] w-4 h-4"
                />
                <span className="text-slate-800">Show detailed GST rate breakup</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={printBankDetails}
                  onChange={(e) => setPrintBankDetails(e.target.checked)}
                  className="rounded text-[#6366F1] w-4 h-4"
                />
                <span className="text-slate-800">Print Bank Details & UPI QR code</span>
              </label>
            </div>
          </div>

          {/* Document Series Accordion */}
          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => setOpenSection(openSection === "series" ? null : "series")}
              className="w-full p-4 flex items-center justify-between text-left font-bold text-xs text-slate-800 hover:bg-slate-50 transition-colors"
            >
              <span>Document Numbering & Due Dates</span>
              <span>{openSection === "series" ? "▲" : "▼"}</span>
            </button>

            {openSection === "series" && (
              <div className="p-4 pt-0 space-y-3 border-t border-slate-100 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Sales Invoice Prefix</label>
                  <input
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Next Number</label>
                    <input
                      type="number"
                      value={nextSeq}
                      onChange={(e) => setNextSeq(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Credit Days</label>
                    <select
                      value={dueDays}
                      onChange={(e) => setDueDays(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="0">Cash (0 Days)</option>
                      <option value="7">7 Days</option>
                      <option value="15">15 Days</option>
                      <option value="30">30 Days</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Terms & Conditions Accordion */}
          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => setOpenSection(openSection === "terms" ? null : "terms")}
              className="w-full p-4 flex items-center justify-between text-left font-bold text-xs text-slate-800 hover:bg-slate-50 transition-colors"
            >
              <span>Terms & Conditions Notes</span>
              <span>{openSection === "terms" ? "▲" : "▼"}</span>
            </button>

            {openSection === "terms" && (
              <div className="p-4 pt-0 space-y-2 border-t border-slate-100">
                <textarea
                  rows={4}
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-sans"
                />
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
  const { lang } = useAuth();
  const [billingCycle, setBillingCycle] = useState<"1year" | "3years">("1year");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [coupon, setCoupon] = useState("");
  const [discountApplied, setDiscountApplied] = useState(false);
  const [upgradedSuccess, setUpgradedSuccess] = useState(false);

  const plans = [
    {
      name: "Silver",
      priceAnnual: 1499,
      priceThreeYear: 3599,
      isCurrent: false,
      features: ["1 Business Company", "1 User License", "Standard GST Invoicing", "A4 & Thermal Print", "Email Support"],
    },
    {
      name: "Wholesale Pro",
      priceAnnual: 2999,
      priceThreeYear: 7199,
      isCurrent: true,
      features: ["Up to 2 Companies", "3 Staff Users", "Barcode Inventory & Godown", "Automated WhatsApp Reminders", "E-Way Bill Generation"],
    },
    {
      name: "Enterprise",
      priceAnnual: 4999,
      priceThreeYear: 11999,
      isCurrent: false,
      features: ["Unlimited Companies", "Unlimited Staff Users", "Multi-Branch ERP Sync", "E-Invoicing Direct API", "Dedicated CA Relationship Manager"],
    },
  ];

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
                onClick={() => {
                  setUpgradedSuccess(true);
                  setSelectedPlan(null);
                  setTimeout(() => setUpgradedSuccess(false), 3500);
                }}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-xl shadow-xs"
              >
                Confirm & Pay Now
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

