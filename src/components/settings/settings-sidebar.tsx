"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../context/auth-context";
import {
  User,
  Building2,
  FileText,
  ShieldCheck,
  Printer,
  Users,
  Bell,
  Share2,
  CreditCard,
  Gift,
  HelpCircle,
  LogOut,
  ChevronLeft,
  Clock,
} from "lucide-react";

export interface SettingsSidebarProps {
  activeTab?: string;
  onCloseMobile?: () => void;
}

export function SettingsSidebar({ activeTab, onCloseMobile }: SettingsSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentCompany, user, lang, logout, hasPermission } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const displayName =
    currentCompany?.tradeName ||
    currentCompany?.legalName ||
    (lang === "gu" ? "મારી કંપની" : "My Business");
  const displayPhone =
    user?.phone ||
    (currentCompany as any)?.phone ||
    currentCompany?.gstin ||
    "";
  const initialLetter = displayName.charAt(0).toUpperCase() || "M";

  // Derive active tab from pathname if not directly provided
  const cleanPath = pathname.replace(/^\//, "");
  const normalizedPath = cleanPath.replace(/^app\//, "");
  const rawTab = (normalizedPath === "settings" || normalizedPath === "settings/account")
    ? "account"
    : normalizedPath.replace(/^settings\/?/, "").split("?")[0];

  const currentTab = activeTab || (() => {
    if (rawTab === "company" || rawTab === "manage-business") return "company";
    if (rawTab === "invoice" || rawTab === "invoice-settings") return "invoice";
    if (rawTab === "e-invoice" || rawTab === "einvoice" || rawTab === "e-invoices") return "e-invoice";
    if (rawTab === "thermal-print" || rawTab === "print-settings") return "thermal-print";
    if (rawTab === "user-management" || rawTab === "manage-users") return "user-management";
    if (rawTab === "roles" || rawTab === "role-and-permissions" || rawTab === "roles-and-permissions") return "roles";
    if (rawTab === "activity-logs" || rawTab === "activities" || rawTab === "audit-logs") return "activity-logs";
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
      icon: <User className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
    },
    {
      id: "company",
      href: "/settings/company",
      label: "Company Settings",
      labelGujarati: "કંપની સેટિંગ્સ",
      icon: <Building2 className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
    },
    {
      id: "invoice",
      href: "/settings/invoice",
      label: "Invoice Settings",
      labelGujarati: "ઇન્વોઇસ સેટિંગ્સ",
      icon: <FileText className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
    },
    {
      id: "e-invoice",
      href: "/settings/e-invoice",
      label: "E-Invoice Settings",
      labelGujarati: "ઈ-ઇનવોઇસ સેટિંગ્સ",
      badge: currentCompany?.eInvoiceApplicable ? "Active" : (!currentCompany?.gstin ? "Setup" : undefined),
      icon: <ShieldCheck className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
    },
    {
      id: "thermal-print",
      href: "/settings/thermal-print",
      label: "Thermal Print",
      labelGujarati: "થર્મલ પ્રિન્ટ સેટિંગ્સ",
      badge: "New",
      icon: <Printer className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
    },
    {
      id: "user-management",
      href: "/settings/user-management",
      label: "Manage Users",
      labelGujarati: "યુઝર્સ મેનેજમેન્ટ",
      icon: <Users className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
    },
    {
      id: "roles",
      href: "/settings/roles",
      label: "Role & Permissions",
      labelGujarati: "રોલ અને પરવાનગીઓ",
      icon: <ShieldCheck className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
    },
    {
      id: "activity-logs",
      href: "/settings/activity-logs",
      label: "Activity Logs",
      labelGujarati: "પ્રવૃત્તિ લૉગ્સ",
      icon: <Clock className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
    },
    {
      id: "reminders",
      href: "/settings/reminders",
      label: "Reminders",
      labelGujarati: "પેમેન્ટ રિમાઇન્ડર્સ",
      icon: <Bell className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
    },
    {
      id: "ca-reports-sharing",
      href: "/settings/ca-reports-sharing",
      label: "CA Reports Sharing",
      labelGujarati: "CA રિપોર્ટ શેરિંગ",
      icon: <Share2 className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
    },
    {
      id: "pricing",
      href: "/settings/pricing",
      label: "Pricing",
      labelGujarati: "પ્લાન અને પ્રાઇસિંગ",
      icon: <CreditCard className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
    },
    {
      id: "refer-and-earn",
      href: "/settings/refer-and-earn",
      label: "Refer & Earn",
      labelGujarati: "રેફર અને કમાઓ",
      icon: <Gift className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
    },
    {
      id: "help-support",
      href: "/settings/help-support",
      label: "Help And Support",
      labelGujarati: "સહાય અને સપોર્ટ",
      icon: <HelpCircle className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
    },
  ];

  const visibleNavItems = navItems.filter((item) => {
    if (item.id === "company") return hasPermission("settings", "edit_company");
    if (item.id === "user-management") return hasPermission("settings", "edit_users");
    if (item.id === "help-support") return true;
    return hasPermission("settings", "view");
  });

  return (
    <>
      <aside className="w-64 shrink-0 h-full bg-white border-r border-[#E5E7EB] flex flex-col justify-between select-none z-30">
        {/* Top Section */}
        <div className="flex flex-col min-h-0 flex-1">
          {/* Company Profile Header */}
          <div className="h-[60px] px-4 border-b border-slate-200/80 flex items-center gap-3 bg-white shrink-0">
            <div className="w-9 h-9 rounded-xl bg-[#1677E8] text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs uppercase">
              {initialLetter}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-slate-900 truncate tracking-tight leading-tight">
                {displayName}
              </span>
              {displayPhone && (
                <span className="text-xs text-slate-500 tabular-nums tracking-wide mt-0.5 truncate">
                  {displayPhone}
                </span>
              )}
            </div>
          </div>

          {/* Back to Dashboard Button */}
          <div className="px-3 pt-3 pb-1">
            <Link
              href="/"
              onClick={onCloseMobile}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#1677E8] hover:bg-[#1268D3] text-white text-[13px] font-medium transition-all shadow-xs group"
              title={lang === "gu" ? "મુખ્ય ડેશબોર્ડ પર પાછા જાઓ" : "Back to Dashboard"}
            >
              <ChevronLeft className="w-4 h-4 text-blue-100 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2} />
              <span>{lang === "gu" ? "મુખ્ય ડેશબોર્ડ" : "Back to Dashboard"}</span>
            </Link>
          </div>

          {/* Navigation Items List */}
          <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
            {visibleNavItems.map((item) => {
              const isActive = currentTab === item.id;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[#1677E8] text-white shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"}>
                      {item.icon}
                    </span>
                    <span className="truncate">
                      {lang === "gu" ? item.labelGujarati : item.label}
                    </span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                        isActive
                          ? "bg-white/20 text-white"
                          : item.badge === "Active"
                          ? "bg-emerald-100 text-emerald-800"
                          : item.badge === "Setup"
                          ? "bg-amber-100 text-amber-800"
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
              className="w-full flex items-center gap-2.5 h-9 px-3 rounded-xl text-[13px] font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-[18px] h-[18px] text-slate-400 group-hover:text-rose-600 shrink-0" strokeWidth={1.75} />
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
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 mt-1">
            <Image
              src="/logo-icon.png"
              alt="MyOwnBillBook"
              width={16}
              height={16}
              className="object-contain shrink-0"
            />
            <span className="text-[#0F172A]">MyOwn</span>
            <span className="text-[#1677E8]">BillBook</span>
            <span className="text-[9px] text-[#8E9F9A] font-normal">by Paneliya Technology</span>
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
              <h3 className="text-[15px] font-semibold text-slate-900">
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
                className="flex-1 py-2 text-[13px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
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
                className="flex-1 py-2 text-[13px] font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs"
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
