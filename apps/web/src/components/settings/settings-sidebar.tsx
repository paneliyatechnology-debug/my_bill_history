"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../context/auth-context";

export interface SettingsSidebarProps {
  activeTab?: string;
  onCloseMobile?: () => void;
}

export function SettingsSidebar({ activeTab, onCloseMobile }: SettingsSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentCompany, user, lang, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const displayName =
    currentCompany?.tradeName ||
    currentCompany?.legalName ||
    "MODI CHAI";
  const displayPhone =
    user?.phone ||
    (currentCompany as any)?.phone ||
    currentCompany?.gstin ||
    "9510442798";
  const initialLetter = displayName.charAt(0).toUpperCase() || "M";

  // Derive active tab from pathname if not directly provided
  const cleanPath = pathname.replace(/^\//, "");
  const rawTab = (cleanPath === "settings" || cleanPath === "settings/account")
    ? "account"
    : cleanPath.replace(/^settings\/?/, "").split("?")[0];

  const currentTab = activeTab || (() => {
    if (rawTab === "company" || rawTab === "manage-business") return "company";
    if (rawTab === "invoice" || rawTab === "invoice-settings") return "invoice";
    if (rawTab === "thermal-print" || rawTab === "print-settings") return "thermal-print";
    if (rawTab === "user-management" || rawTab === "manage-users") return "user-management";
    if (rawTab === "reminders") return "reminders";
    if (rawTab === "ca-reports-sharing" || rawTab === "ca-sharing") return "ca-reports-sharing";
    if (rawTab === "pricing" || rawTab === "pricing-settings") return "pricing";
    if (rawTab === "refer-and-earn" || rawTab === "refer-earn") return "refer-and-earn";
    if (rawTab === "help-support" || rawTab === "help-and-support") return "help-support";
    return rawTab || "account";
  })();

  const navItems = [
    {
      id: "account",
      href: "/settings/account",
      label: "Account",
      labelGujarati: "ખાતું અને સબ્સ્ક્રિપ્શન",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      id: "company",
      href: "/settings/company",
      label: "Company Settings",
      labelGujarati: "કંપની સેટિંગ્સ",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: "invoice",
      href: "/settings/invoice",
      label: "Invoice Settings",
      labelGujarati: "ઇન્વોઇસ સેટિંગ્સ",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: "thermal-print",
      href: "/settings/thermal-print",
      label: "Thermal Print",
      labelGujarati: "થર્મલ પ્રિન્ટ સેટિંગ્સ",
      badge: "New",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
      ),
    },
    {
      id: "user-management",
      href: "/settings/user-management",
      label: "Manage Users",
      labelGujarati: "યુઝર્સ મેનેજમેન્ટ",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      id: "reminders",
      href: "/settings/reminders",
      label: "Reminders",
      labelGujarati: "પેમેન્ટ રિમાઇન્ડર્સ",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: "ca-reports-sharing",
      href: "/settings/ca-reports-sharing",
      label: "CA Reports Sharing",
      labelGujarati: "CA રિપોર્ટ શેરિંગ",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      ),
    },
    {
      id: "pricing",
      href: "/settings/pricing",
      label: "Pricing",
      labelGujarati: "પ્લાન અને પ્રાઇસિંગ",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 8h6m-5 3h4m-4 3h2m-6 4h10a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: "refer-and-earn",
      href: "/settings/refer-and-earn",
      label: "Refer & Earn",
      labelGujarati: "રેફર અને કમાઓ",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
        </svg>
      ),
    },
    {
      id: "help-support",
      href: "/settings/help-support",
      label: "Help And Support",
      labelGujarati: "સહાય અને સપોર્ટ",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <aside className="w-64 shrink-0 h-full bg-white border-r border-[#E5E7EB] flex flex-col justify-between select-none z-30">
        {/* Top Section */}
        <div className="flex flex-col min-h-0 flex-1">
          {/* Company Profile Header */}
          <div className="p-4 border-b border-[#F1F3F5] flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EA580C] text-white font-extrabold text-base flex items-center justify-center shrink-0 shadow-xs uppercase">
              {initialLetter}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-slate-900 truncate tracking-tight leading-tight">
                {displayName}
              </span>
              <span className="text-xs text-slate-500 font-mono tracking-wide mt-0.5 truncate">
                {displayPhone}
              </span>
            </div>
          </div>

          {/* Back to Dashboard Button */}
          <div className="px-3 pt-3 pb-1">
            <Link
              href="/"
              onClick={onCloseMobile}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-full bg-[#0B1528] hover:bg-[#1E293B] text-white text-xs font-bold transition-all shadow-xs group"
              title={lang === "gu" ? "મુખ્ય ડેશબોર્ડ પર પાછા જાઓ" : "Back to Dashboard"}
            >
              <svg
                className="w-3.5 h-3.5 text-slate-300 group-hover:-translate-x-0.5 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>{lang === "gu" ? "મુખ્ય ડેશબોર્ડ" : "Back to Dashboard"}</span>
            </Link>
          </div>

          {/* Navigation Items List */}
          <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[#3B404A] text-[#F1F3F5] shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={isActive ? "text-[#F1F3F5]" : "text-slate-400 group-hover:text-slate-600"}>
                      {item.icon}
                    </span>
                    <span className="truncate">
                      {lang === "gu" ? item.labelGujarati : item.label}
                    </span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-rose-100 text-rose-600"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Divider */}
            <div className="pt-2 pb-1">
              <hr className="border-slate-200" />
            </div>

            {/* Logout Trigger */}
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>{lang === "gu" ? "લોગઆઉટ" : "Logout"}</span>
            </button>
          </nav>
        </div>

        {/* Footer Security Badges */}
        <div className="p-3 border-t border-[#F1F3F5] bg-slate-50/60 flex flex-col gap-1.5 shrink-0">
          {/* <div className="text-[10px] text-slate-400 font-medium">
            App Version : 9.25.1
          </div> */}
          {/* <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              100% Secure
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              ISO Certified
            </span>
          </div> */}
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 mt-1">
            <span className="text-[#1E589D]">my</span>
            <span className="text-[#EA580C]">BillBook</span>
            <span className="text-[9px] text-slate-400 font-normal">by Paneliyatechnology</span>
          </div>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">
                {lang === "gu" ? "લોગઆઉટ કરવા માંગો છો?" : "Confirm Logout?"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {lang === "gu"
                  ? "શું તમે ખરેખર સિસ્ટમમાંથી બહાર નીકળવા માંગો છો?"
                  : "Are you sure you want to log out of your billing session?"}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                {lang === "gu" ? "રદ કરો" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
                  logout();
                  router.push("/auth/login");
                }}
                className="flex-1 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs"
              >
                {lang === "gu" ? "લોગઆઉટ" : "Logout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
