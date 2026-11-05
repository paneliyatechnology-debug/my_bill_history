"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/auth-context";

export function UserProfileDropdown() {
  const router = useRouter();
  const { user, currentCompany, entitlements, lang, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const userName =
    user?.fullName ||
    user?.name ||
    (user as any)?.email?.split("@")[0] ||
    "Jack";

  const initial = userName.charAt(0).toUpperCase() || "J";

  const formatRole = (role?: string) => {
    if (!role) return "User";
    return role
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const navigateTo = (path: string) => {
    setIsOpen(false);
    router.push(path);
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Trigger Button matching the Reference UI */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 pl-2 border-l border-slate-200 hover:opacity-90 transition-opacity cursor-pointer select-none group"
        aria-haspopup="true"
        aria-expanded={isOpen}
        title={lang === "gu" ? "વપરાશકર્તા પ્રોફાઇલ અને સેટિંગ્સ" : "User Profile & Settings"}
      >
        <div className="w-8 h-8 rounded-full bg-[#1677E8] text-white flex items-center justify-center font-bold text-xs shadow-2xs uppercase group-hover:ring-2 group-hover:ring-blue-200 transition-all">
          {initial}
        </div>
        <div className="hidden lg:flex items-center gap-1 text-[13px] font-medium text-[#182230]">
          <span className="truncate max-w-[120px]">{userName}</span>
          <svg
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200/80 z-50 py-2 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* User Header Card */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1677E8] to-[#1258AF] text-white flex items-center justify-center font-bold text-sm shadow-xs uppercase shrink-0">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900 truncate">
                {userName}
              </div>
              <div className="text-xs text-slate-500 truncate">
                {user?.email || user?.phone || currentCompany?.tradeName || ""}
              </div>
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="inline-block text-[10px] font-semibold bg-blue-50 text-[#1677E8] px-2 py-0.5 rounded-md border border-blue-100">
                  {formatRole(user?.role)}
                </span>
                {entitlements?.tier && (
                  <span className="inline-block text-[10px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200">
                    {entitlements.name || entitlements.tier}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="py-1.5 px-1 space-y-0.5 text-xs font-medium text-slate-700">
            {/* 1. Account & Profile */}
            <button
              type="button"
              onClick={() => navigateTo("/settings/account")}
              className="w-full px-3 py-2 rounded-xl text-left flex items-center gap-2.5 hover:bg-slate-50 hover:text-[#1677E8] transition-colors cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-800">
                  {lang === "gu" ? "મારું એકાઉન્ટ અને પ્રોફાઇલ" : "My Profile & Account"}
                </div>
                <div className="text-[11px] text-slate-400">
                  {lang === "gu" ? "પ્રોફાઇલ વિગતો, પાસવર્ડ અને સેટિંગ્સ" : "Profile details, credentials & security"}
                </div>
              </div>
              <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* 2. Company / Business Settings */}
            <button
              type="button"
              onClick={() => navigateTo("/settings/company")}
              className="w-full px-3 py-2 rounded-xl text-left flex items-center gap-2.5 hover:bg-slate-50 hover:text-[#1677E8] transition-colors cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-800">
                  {lang === "gu" ? "પેઢીની સેટિંગ્સ" : "Company & Business"}
                </div>
                <div className="text-[11px] text-slate-400">
                  {lang === "gu" ? "GSTIN, સરનામું અને બેંક વિગતો" : "GSTIN, addresses & bank accounts"}
                </div>
              </div>
              <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* 3. Manage Users */}
            <button
              type="button"
              onClick={() => navigateTo("/settings/user-management")}
              className="w-full px-3 py-2 rounded-xl text-left flex items-center gap-2.5 hover:bg-slate-50 hover:text-[#1677E8] transition-colors cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-800">
                  {lang === "gu" ? "વપરાશકર્તા સંચાલન" : "Manage Staff & Users"}
                </div>
                <div className="text-[11px] text-slate-400">
                  {lang === "gu" ? "સ્ટાફ અને રોલ પરવાનગીઓ" : "Staff access and role permissions"}
                </div>
              </div>
              <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* 4. Plans & Pricing */}
            <button
              type="button"
              onClick={() => navigateTo("/settings/pricing")}
              className="w-full px-3 py-2 rounded-xl text-left flex items-center gap-2.5 hover:bg-slate-50 hover:text-[#1677E8] transition-colors cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-800">
                  {lang === "gu" ? "પ્લાન અને સબ્સ્ક્રિપ્શન" : "Plans & Subscription"}
                </div>
                <div className="text-[11px] text-slate-400">
                  {lang === "gu" ? "અપગ્રેડ, પ્લાન અને બિલિંગ વિગતો" : "Upgrade tier & manage subscription"}
                </div>
              </div>
              <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Divider */}
          <div className="my-1 border-t border-slate-100" />

          {/* Logout Action */}
          <div className="px-1 pt-0.5">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full px-3 py-2 rounded-xl text-left flex items-center gap-2.5 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer font-semibold text-xs"
            >
              <div className="w-6 h-6 rounded-lg bg-rose-100/70 text-rose-600 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </div>
              <span>{lang === "gu" ? "લોગઆઉટ" : "Logout"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
