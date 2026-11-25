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
  ArrowLeft,
  Clock,
  KeyRound,
} from "lucide-react";

export interface SettingsSidebarProps {
  activeTab?: string;
  onCloseMobile?: () => void;
}

interface NavItemConfig {
  id: string;
  href: string;
  label: string;
  labelGujarati: string;
  badge?: string;
  icon: React.ReactNode;
}

interface NavGroupConfig {
  title: string;
  titleGujarati: string;
  items: NavItemConfig[];
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

  const cleanPath = pathname.replace(/^\//, "");
  const normalizedPath = cleanPath.replace(/^app\//, "");
  const rawTab =
    normalizedPath === "settings" || normalizedPath === "settings/account"
      ? "account"
      : normalizedPath.replace(/^settings\/?/, "").split("?")[0];

  const currentTab =
    activeTab ||
    (() => {
      if (rawTab === "company" || rawTab === "manage-business") return "company";
      if (rawTab === "invoice" || rawTab === "invoice-settings") return "invoice";
      if (rawTab === "e-invoice" || rawTab === "einvoice" || rawTab === "e-invoices")
        return "e-invoice";
      if (rawTab === "thermal-print" || rawTab === "print-settings") return "thermal-print";
      if (rawTab === "user-management" || rawTab === "manage-users") return "user-management";
      if (
        rawTab === "roles" ||
        rawTab === "role-and-permissions" ||
        rawTab === "roles-and-permissions"
      )
        return "roles";
      if (rawTab === "activity-logs" || rawTab === "activities" || rawTab === "audit-logs")
        return "activity-logs";
      if (rawTab === "reminders") return "reminders";
      if (rawTab === "ca-reports-sharing" || rawTab === "ca-sharing")
        return "ca-reports-sharing";
      if (rawTab === "pricing" || rawTab === "pricing-settings") return "pricing";
      if (rawTab === "refer-and-earn" || rawTab === "refer-earn") return "refer-and-earn";
      if (rawTab === "help-support" || rawTab === "help-and-support") return "help-support";
      return rawTab || "account";
    })();

  const navGroups: NavGroupConfig[] = [
    {
      title: "Business",
      titleGujarati: "વ્યવસાય અને ખાતું",
      items: [
        {
          id: "account",
          href: "/settings/account",
          label: "Account",
          labelGujarati: "ખાતું અને સબ્સ્ક્રિપ્શન",
          icon: <User className="w-4 h-4 shrink-0" strokeWidth={1.8} />,
        },
        {
          id: "company",
          href: "/settings/company",
          label: "Company Settings",
          labelGujarati: "કંપની સેટિંગ્સ",
          icon: <Building2 className="w-4 h-4 shrink-0" strokeWidth={1.8} />,
        },
      ],
    },
    {
      title: "Billing & Printing",
      titleGujarati: "બિલિંગ અને પ્રિન્ટ",
      items: [
        {
          id: "invoice",
          href: "/settings/invoice",
          label: "Invoice Settings",
          labelGujarati: "ઇન્વોઇસ સેટિંગ્સ",
          icon: <FileText className="w-4 h-4 shrink-0" strokeWidth={1.8} />,
        },
        {
          id: "e-invoice",
          href: "/settings/e-invoice",
          label: "E-Invoice Settings",
          labelGujarati: "ઈ-ઇનવોઇસ સેટિંગ્સ",
          badge: currentCompany?.eInvoiceApplicable
            ? "Active"
            : !currentCompany?.gstin
              ? ""
              : undefined,
          icon: <ShieldCheck className="w-4 h-4 shrink-0" strokeWidth={1.8} />,
        },
        {
          id: "thermal-print",
          href: "/settings/thermal-print",
          label: "Thermal Print",
          labelGujarati: "થર્મલ પ્રિન્ટ સેટિંગ્સ",
          badge: "",
          icon: <Printer className="w-4 h-4 shrink-0" strokeWidth={1.8} />,
        },
        {
          id: "reminders",
          href: "/settings/reminders",
          label: "Reminders",
          labelGujarati: "પેમેન્ટ રિમાઇન્ડર્સ",
          icon: <Bell className="w-4 h-4 shrink-0" strokeWidth={1.8} />,
        },
      ],
    },
    {
      title: "Team & Security",
      titleGujarati: "ટીમ અને સુરક્ષા",
      items: [
        {
          id: "user-management",
          href: "/settings/user-management",
          label: "Manage Users",
          labelGujarati: "યુઝર્સ મેનેજમેન્ટ",
          icon: <Users className="w-4 h-4 shrink-0" strokeWidth={1.8} />,
        },
        {
          id: "roles",
          href: "/settings/roles",
          label: "Role & Permissions",
          labelGujarati: "રોલ અને પરવાનગીઓ",
          icon: <KeyRound className="w-4 h-4 shrink-0" strokeWidth={1.8} />,
        },
      ],
    },
    {
      title: "Plan & Support",
      titleGujarati: "પ્લાન અને સહાય",
      items: [
        {
          id: "ca-reports-sharing",
          href: "/settings/ca-reports-sharing",
          label: "CA Reports Sharing",
          labelGujarati: "CA રિપોર્ટ શેરિંગ",
          icon: <Share2 className="w-4 h-4 shrink-0" strokeWidth={1.8} />,
        },
        {
          id: "pricing",
          href: "/settings/pricing",
          label: "Pricing",
          labelGujarati: "પ્લાન અને પ્રાઇસિંગ",
          icon: <CreditCard className="w-4 h-4 shrink-0" strokeWidth={1.8} />,
        },
        {
          id: "refer-and-earn",
          href: "/settings/refer-and-earn",
          label: "Refer & Earn",
          labelGujarati: "રેફર અને કમાઓ",
          icon: <Gift className="w-4 h-4 shrink-0" strokeWidth={1.8} />,
        },
        {
          id: "help-support",
          href: "/settings/help-support",
          label: "Help & Support",
          labelGujarati: "સહાય અને સપોર્ટ",
          icon: <HelpCircle className="w-4 h-4 shrink-0" strokeWidth={1.8} />,
        },
      ],
    },
  ];

  const isVisible = (id: string) => {
    if (id === "company") return hasPermission("settings", "edit_company");
    if (id === "user-management") return hasPermission("settings", "edit_users");
    if (id === "help-support") return true;
    return hasPermission("settings", "view");
  };

  return (
    <>
      <aside className="w-60 shrink-0 h-full bg-white border-r border-[#E2E8F0] flex flex-col justify-between select-none z-30">
        {/* Top Section */}
        <div className="flex flex-col min-h-0 flex-1">
          {/* Back to Dashboard + Company Pill */}
          <div className="p-3 border-b border-[#E2E8F0] space-y-2.5 bg-[#F8FAFC]/70 shrink-0">
            <Link
              href="/"
              onClick={onCloseMobile}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B] hover:text-[#0F172A] transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>{lang === "gu" ? "મુખ્ય ડેશબોર્ડ પર જાઓ" : "Back to Dashboard"}</span>
            </Link>

            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-[#E2E8F0]">
              <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#1677E8] font-semibold text-xs flex items-center justify-center shrink-0 uppercase border border-[#BFDBFE]">
                {initialLetter}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-[#0F172A] truncate leading-tight">
                  {displayName}
                </span>
                {displayPhone && (
                  <span className="text-[11px] text-[#64748B] tabular-nums truncate mt-0.5">
                    {displayPhone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Grouped Navigation */}
          <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
            {navGroups.map((group) => {
              const items = group.items.filter((it) => isVisible(it.id));
              if (items.length === 0) return null;

              return (
                <div key={group.title} className="space-y-1">
                  <div className="px-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                    {lang === "gu" ? group.titleGujarati : group.title}
                  </div>

                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const isActive = currentTab === item.id;

                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          onClick={onCloseMobile}
                          className={`group w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                            isActive
                              ? "bg-[#EFF6FF] text-[#1677E8] font-semibold"
                              : "text-[#475569] font-medium hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={
                                isActive
                                  ? "text-[#1677E8]"
                                  : "text-[#94A3B8] group-hover:text-[#475569]"
                              }
                            >
                              {item.icon}
                            </span>
                            <span className="truncate">
                              {lang === "gu" ? item.labelGujarati : item.label}
                            </span>
                          </div>

                          {item.badge && (
                            <span
                              className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide shrink-0 ${
                                item.badge === "Active"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : item.badge === "Setup"
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-blue-50 text-[#1677E8] border border-blue-200"
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Footer: Logout + Brand */}
        <div className="p-2.5 border-t border-[#E2E8F0] bg-[#F8FAFC]/60 space-y-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#475569] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-[#94A3B8] shrink-0" strokeWidth={1.8} />
            <span>{lang === "gu" ? "લોગઆઉટ" : "Logout"}</span>
          </button>

          <div className="px-2.5 pt-1 border-t border-[#E2E8F0]/70 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
            <Image
              src="/logo-icon.png"
              alt="MyOwnBillBook"
              width={15}
              height={15}
              className="object-contain shrink-0"
            />
            <span className="text-[#0F172A]">MyOwn</span>
            <span className="text-[#1677E8]">BillBook</span>
          </div>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <LogOut className="w-5 h-5" />
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
                className="flex-1 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
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
                className="flex-1 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs cursor-pointer"
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
