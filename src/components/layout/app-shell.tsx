"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../context/auth-context";
import { apiClient } from "../../lib/api-client";
import { resolveActiveNavigation } from "../../lib/sidebar-navigation";
import { CompanySwitcher } from "../tenants/company-switcher";
import { WaveBackground } from "../ui/wave-background";
import { BrandLogo } from "../ui/brand-logo";
import { SettingsSidebar } from "../settings/settings-sidebar";
import { WorkspaceErrorState } from "../ui/workspace-error-state";
import { NotificationCenter } from "../notifications/notification-center";
const SIDEBAR_BG = "#FFFFFF";
const ACTIVE_MENU_BG = "#1677E8";
const TEXT_COLOR = "#FFFFFF";
const CTA_ACCENT = "#1677E8";
import Image from "next/image";

interface SubNavItem {
  name: string;
  nameGujarati: string;
  href: string;
}

interface NavSection {
  id: string;
  name: string;
  nameGujarati: string;
  group?: string;
  icon: React.ReactNode;
  href?: string; // If single-item direct link like Dashboard
  items?: SubNavItem[];
  badge?: string;
  roles?: string[];
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading,
    workspaceError,
    retryWorkspace,
    lang,
    setLang,
    companies,
    branches,
    financialYears,
    currentCompany,
    currentBranch,
    currentFY,
    switchCompany,
    switchBranch,
    switchFinancialYear,
    logout,
  } = useAuth();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loadingWatchdogTriggered, setLoadingWatchdogTriggered] =
    useState(false);

  // Safety watchdog: If loading takes longer than 3.5 seconds, show graceful recovery options
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isLoading) {
      timer = setTimeout(() => {
        setLoadingWatchdogTriggered(true);
      }, 3500);
    } else {
      setLoadingWatchdogTriggered(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLoading]);
  const activeNav = useMemo(() => resolveActiveNavigation(pathname), [pathname]);

  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    sales: false,
    purchases: false,
    items: false,
    parties: false,
    vouchers: false,
    cash_bank: false,
    reports: false,
    advanced: false,
    settings: false,
  });

  // Automatically expand the active parent section when page loads or route changes
  useEffect(() => {
    if (activeNav.activeSectionId) {
      setExpandedSections((prev) => {
        if (prev[activeNav.activeSectionId!]) return prev;
        const next = { ...prev, [activeNav.activeSectionId!]: true };
        try {
          localStorage.setItem("sidebar_expanded_sections", JSON.stringify(next));
        } catch { }
        return next;
      });
    }
  }, [activeNav.activeSectionId]);

  const [supportSession, setSupportSession] = useState<{
    isSupportSession: boolean;
    companyName?: string;
    companyId?: string;
  } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("billing_support_session");
      if (raw) {
        setSupportSession(JSON.parse(raw));
      } else {
        setSupportSession(null);
      }
    } catch {
      setSupportSession(null);
    }
  }, [pathname]);

  const handleExitSupportSession = async () => {
    try {
      if (supportSession?.companyId) {
        await apiClient.post("/super-admin/impersonate/exit", {
          companyId: supportSession.companyId,
          sessionId: (supportSession as any)?.sessionId,
        });
      }
    } catch {
      // ignore
    } finally {
      const orig = (supportSession as any)?.originalToken;
      if (orig) {
        localStorage.setItem("billing_auth_token", orig);
      }
      localStorage.removeItem("billing_support_session");
      localStorage.removeItem("billing_tenant_context");
      router.push("/");
    }
  };

  // Load persisted sidebar state from localStorage
  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem("sidebar_collapsed");
      if (savedCollapsed !== null) {
        setIsSidebarCollapsed(savedCollapsed === "true");
      }
      const savedSections = localStorage.getItem("sidebar_expanded_sections");
      if (savedSections) {
        setExpandedSections((prev) => ({
          ...prev,
          ...JSON.parse(savedSections),
        }));
      }
    } catch {
      // ignore storage access error
    }
  }, []);

  // Save expanded states
  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = { ...prev, [sectionId]: !prev[sectionId] };
      try {
        localStorage.setItem("sidebar_expanded_sections", JSON.stringify(next));
      } catch { }
      return next;
    });
  };

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar_collapsed", String(next));
      } catch { }
      return next;
    });
  };

  // Close mobile drawer on route change & reset main scroll position to top
  useEffect(() => {
    setIsMobileMenuOpen(false);
    const mainEl = document.getElementById("main-content");
    if (mainEl) {
      mainEl.scrollTop = 0;
    }
  }, [pathname]);

  // Lock scrolling when mobile drawer is open and restore when closed
  useEffect(() => {
    const mainEl = document.getElementById("main-content");
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
      if (mainEl) {
        mainEl.style.overflow = "hidden";
      }
    } else {
      document.body.style.overflow = "";
      if (mainEl) {
        mainEl.style.overflow = "";
      }
    }
    return () => {
      document.body.style.overflow = "";
      if (mainEl) {
        mainEl.style.overflow = "";
      }
    };
  }, [isMobileMenuOpen]);

  // If unauthenticated and finished loading, automatically redirect to login page (except for public pages like intro, features, landing)
  useEffect(() => {
    if (
      !isLoading &&
      !isAuthenticated &&
      pathname !== "/login" &&
      pathname !== "/" &&
      pathname !== "/intro" &&
      pathname !== "/features" &&
      pathname !== "/Myownbillbook" &&
      pathname !== "/copy-code"
    ) {
      const redirectParam = pathname
        ? `?redirect=${encodeURIComponent(pathname)}`
        : "";
      router.replace(`/login${redirectParam}`);
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  // If on public pages (login, intro, features, Myownbillbook, unauthenticated home), dedicated superadmin portal, or dedicated fullscreen POS counter, render children cleanly without standard business shell
  if (
    pathname === "/login" ||
    pathname === "/copy-code" ||
    pathname === "/intro" ||
    pathname === "/features" ||
    pathname === "/rojmek" ||
    pathname === "/Myownbillbook" ||
    pathname.toLowerCase() === "/rojmek" ||
        pathname === "/pos" ||
    pathname === "/sales/pos" ||
    (!isAuthenticated && pathname === "/")
  ) {
    return <>{children}</>;
  }

  // Workspace Error Screen — If companies cannot be loaded and error occurred
  if (
    !isLoading &&
    isAuthenticated &&
    workspaceError &&
    companies.length === 0
  ) {
    return (
      <WorkspaceErrorState
        errorMessage={workspaceError}
        onRetry={() => retryWorkspace()}
        onLogout={() => logout()}
        lang={lang}
        onToggleLang={setLang}
      />
    );
  }

  // Elegant loading screen during initial authentication hydration
  if (isLoading) {
    return (
      <div
        className="h-full min-h-[100dvh] w-full bg-[#F6F7F1] flex flex-col items-center justify-center p-4 text-center"
        style={{
          minHeight: "100vh",
          backgroundColor: "#F6F7F1",
          fontFamily: "var(--font-inter), sans-serif",
        }}
      >
        <div
          className="w-16 h-16 flex items-center justify-center mb-3 animate-pulse relative"
          style={{
            width: "4rem",
            height: "4rem",
          }}
        >
          <Image
            src="/logo-icon.png"
            alt="myownbillbook"
            width={64}
            height={64}
            className="object-contain"
            priority
          />
        </div>
        <p className="text-lg font-semibold tracking-tight">
          <span className="text-[#0F172A]">MyOwn</span>
          <span className="text-[#1677E8]">BillBook</span>
        </p>
        <p
          className="text-xs text-[#98A2B3] mt-1 tabular-nums"
          style={{ color: "#98A2B3" }}
        >
          {lang === "gu"
            ? "વર્કસ્પેસ તૈયાર થઈ રહ્યું છે..."
            : "Loading workspace..."}
        </p>

        {/* Watchdog recovery options if loading is delayed */}
        {loadingWatchdogTriggered && (
          <div
            className="mt-6 p-4 max-w-sm bg-white rounded-2xl border border-[#BFDBFE] shadow-sm flex flex-col items-center"
            style={{
              maxWidth: "24rem",
              backgroundColor: "#FFFFFF",
              border: "1px solid #BFDBFE",
              borderRadius: "1rem",
              padding: "1rem",
            }}
          >
            <p className="text-xs text-[#667085] mb-3">
              {lang === "gu"
                ? "સર્વર પ્રતિસાદ આપવા માટે સામાન્ય કરતાં વધુ સમય લઈ રહ્યું છે."
                : "Workspace connection is taking longer than usual."}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.location.reload()}
                className="py-1.5 px-4 bg-[#1677E8] hover:bg-[#1268D3] text-white rounded-lg text-[13px] font-medium transition-all shadow-blue-500/20"
                style={{
                  backgroundColor: "#1677E8",
                  color: "#FFFFFF",
                  padding: "6px 16px",
                  borderRadius: "8px",
                  fontWeight: "bold",
                }}
              >
                {lang === "gu" ? "રિફ્રેશ કરો" : "Reload"}
              </button>
              <button
                onClick={() => logout()}
                className="py-1.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[13px] font-medium transition-all"
                style={{
                  backgroundColor: "#F1F5F9",
                  color: "#334155",
                  padding: "6px 16px",
                  borderRadius: "8px",
                }}
              >
                {lang === "gu" ? "લોગિન" : "Login"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Guard against unauthenticated flash before redirect
  if (!isAuthenticated) {
    return null;
  }



  // Exact MyBillBook Hierarchical Menu Structure
  const navigationSections: NavSection[] = [
    // --- MAIN NAVIGATION ---
    {
      id: "dashboard",
      name: "Dashboard",
      nameGujarati: "મુખ્ય ડેશબોર્ડ",
      group: "",
      href: "/",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      id: "parties",
      name: "Parties",
      nameGujarati: "પાર્ટીઝ (ગ્રાહકો / વેપારીઓ)",
      group: "",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
      items: [
        {
          name: "All Parties",
          nameGujarati: "બધી પાર્ટીઓ (ખાતાવહી)",
          href: "/masters/parties",
        },
        {
          name: "Shared Ledger",
          nameGujarati: "શેર્ડ લેજર (Live Sync)",
          href: "/app/home/shared-ledger",
        },
      ],
    },
    {
      id: "items",
      name: "Items / Inventory",
      nameGujarati: "માલસામાન (Items)",
      group: "",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      ),
      items: [
        {
          name: "Inventory",
          nameGujarati: "સ્ટોક / વસ્તુઓની યાદી",
          href: "/masters/items",
        },
        {
          name: "Godown (Warehouse)",
          nameGujarati: "ગોડાઉન / વેરહાઉસ",
          href: "/masters/warehouses",
        },
        {
          name: "Categories",
          nameGujarati: "કેટેગરીઝ",
          href: "/masters/categories",
        },
        {
          name: "Units (UOM)",
          nameGujarati: "એકમો (UOM)",
          href: "/masters/units",
        },
        {
          name: "HSN / SAC Codes",
          nameGujarati: "HSN કોડ્સ",
          href: "/masters/hsn",
        },
      ],
    },
    {
      id: "sales",
      name: "Sales",
      nameGujarati: "વેચાણ (Sales)",
      group: "",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
          />
        </svg>
      ),
      items: [
        {
          name: "Sales Invoices",
          nameGujarati: "વેચાણ બિલ (Invoices)",
          href: "/sales/invoices",
        },
        {
          name: "E-Invoices",
          nameGujarati: "ઈ-ઇનવોઇસ (E-Invoices)",
          href: "/sales/e-invoices",
        },
        {
          name: "Quotation / Estimate",
          nameGujarati: "કાચું બિલ / એસ્ટીમેટ",
          href: "/sales/quotations",
        },
        {
          name: "Payment In",
          nameGujarati: "આવક ચૂકવણી (Payment In)",
          href: "/sales/payment-in",
        },
        {
          name: "Sales Return",
          nameGujarati: "વેચાણ પરત (Sales Return)",
          href: "/sales/returns",
        },
        {
          name: "Credit Note",
          nameGujarati: "ક્રેડિટ નોટ",
          href: "/sales/credit-note",
        },
        {
          name: "Debit Note",
          nameGujarati: "ડેબિટ નોટ",
          href: "/sales/debit-note",
        },
        {
          name: "Delivery Challan",
          nameGujarati: "ડિલિવરી ચલણ",
          href: "/sales/delivery-challan",
        },
        {
          name: "Proforma Invoice",
          nameGujarati: "પ્રોફોર્મા ઇન્વોઇસ",
          href: "/sales/proforma",
        },
      ],
    },
    {
      id: "purchases",
      name: "Purchases",
      nameGujarati: "ખરીદી (Purchases)",
      group: "",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      ),
      items: [
        {
          name: "Purchase Invoices",
          nameGujarati: "ખરીદી બિલ & સ્કેનર",
          href: "/purchases",
        },
        {
          name: "Payment Out",
          nameGujarati: "જાવક ચૂકવણી (Payment Out)",
          href: "/purchases/payment-out",
        },
        {
          name: "Purchase Return",
          nameGujarati: "ખરીદી પરત",
          href: "/purchases/returns",
        },
        {
          name: "Debit Memo",
          nameGujarati: "ડેબિટ મેમો",
          href: "/purchases/debit-memo",
        },
        {
          name: "Purchase Orders",
          nameGujarati: "ખરીદી ઓર્ડર",
          href: "/purchases/orders",
        },
      ],
    },
    {
      id: "expenses",
      name: "Expenses",
      nameGujarati: "દૈનિક ખર્ચા (Expenses)",
      group: "",
      href: "/finance/expenses",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
      ),
    },
    {
      id: "reports",
      name: "Reports",
      nameGujarati: "રિપોર્ટ્સ (Reports)",
      group: "",
      href: "/reports",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },

    // --- ACCOUNTING ---
    {
      id: "vouchers",
      name: "Vouchers",
      nameGujarati: "વાઉચર્સ (Vouchers)",
      group: "ACCOUNTING",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      ),
      items: [
        {
          name: "Voucher List",
          nameGujarati: "વાઉચર લિસ્ટ (All Vouchers)",
          href: "/accounting/vouchers",
        },
        {
          name: "Create Voucher",
          nameGujarati: "નવું વાઉચર (Create Voucher)",
          href: "/accounting/vouchers/new",
        },
        {
          name: "All Transactions",
          nameGujarati: "બધા વ્યવહારો (All Transactions)",
          href: "/vouchers/all_transactions",
        },
        {
          name: "Account Ledgers",
          nameGujarati: "ખાતાવહી (Ledgers)",
          href: "/accounting/ledgers",
        },
        {
          name: "Chart of Accounts",
          nameGujarati: "ખાતાની યાદી (Chart of Accounts)",
          href: "/accounting/chart-of-accounts",
        },
      ],
    },
    {
      id: "cash_bank",
      name: "Cash & Bank",
      nameGujarati: "રોકડ અને બેંક",
      group: "ACCOUNTING",
      href: "/finance/cash-bank",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
          />
        </svg>
      ),
    },
    {
      id: "gst_returns",
      name: "GST & Tax Filing",
      nameGujarati: "જીએસટી અને રિટર્ન (GST & Returns)",
      group: "ACCOUNTING",
      href: "/gst",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      id: "automated_bills",
      name: "Automated Bills",
      nameGujarati: "ઓટોમેટેડ બિલ્સ",
      group: "ACCOUNTING",
      href: "/sales/automated-billing",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      ),
    },
    {
      id: "pos",
      name: "POS Billing",
      nameGujarati: "ઝડપી કાઉન્ટર POS",
      group: "ACCOUNTING",
      href: "/sales/pos",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      id: "settings",
      name: "Settings",
      nameGujarati: "સેટિંગ્સ",
      group: "ACCOUNTING",
      href: "/settings",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    },

    // --- GROUP 3: BUSINESS TOOLS ---
    {
      id: "data_import",
      name: "Data Import (Excel / CSV)",
      nameGujarati: "ડેટા આયાત (Excel / CSV)",
      group: "BUSINESS TOOLS",
      badge: "Excel/CSV",
      href: "/app/data-import",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
      ),
    },
    {
      id: "ai_collections",
      name: "Payment Reminders",
      nameGujarati: "ઓટો ઉઘરાણી (Follow-ups)",
      group: "BUSINESS TOOLS",
      badge: "Smart",
      href: "/finance/ai-collections",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
    // Temporarily commented out as requested (keep for future use)
    /*
    {
      id: "sms_marketing",
      name: "SMS Marketing",
      nameGujarati: "એસએમએસ માર્કેટિંગ",
      group: "BUSINESS TOOLS",
      href: "/home/sms-marketing",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      ),
    },
    */
    {
      id: "payroll",
      name: "Staff Attendance & Payroll",
      nameGujarati: "સ્ટાફ હાજરી અને પગાર",
      group: "BUSINESS TOOLS",
      href: "/app/sam",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      id: "users",
      name: "Manage Users",
      nameGujarati: "વપરાશકર્તા સંચાલન",
      group: "BUSINESS TOOLS",
      href: "/settings/user-management",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
    },
    {
      id: "orders",
      name: "Online Orders",
      nameGujarati: "ઓનલાઇન ઓર્ડર્સ",
      group: "BUSINESS TOOLS",
      href: "/sales/invoices",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      ),
    },
  ];

  const isSettingsPage = pathname.startsWith("/settings") || pathname.startsWith("/pricing-settings");

  return (
    <div className="h-[100dvh] h-screen w-full flex overflow-hidden bg-[#F5F8FC] print:h-auto print:min-h-0 print:overflow-visible print:bg-white print:block">
      {/* 1. DEDICATED MYBILLBOOK SETTINGS SIDEBAR (When in Settings mode) */}
      {isSettingsPage && (
        <div className="hidden lg:flex shrink-0 h-full print:hidden">
          <SettingsSidebar />
        </div>
      )}

      {/* 2. REGULAR DESKTOP MYBILLBOOK SIDEBAR (When in dashboard mode) */}
      {!isSettingsPage && (
        <aside
          className={`hidden lg:flex flex-col shrink-0 h-full border-r border-slate-200/90 bg-white text-slate-800 transition-all duration-300 z-30 select-none print:hidden ${
            isSidebarCollapsed ? "w-[72px]" : "w-[240px]"
          }`}
        >
          {/* Top Brand Logo matching Reference Image */}
          <div className="shrink-0 flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
            <Link href="/" className="flex items-center gap-2.5 overflow-hidden group">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none">
                  {/* Back document */}
                  <rect x="7" y="3" width="16" height="20" rx="3" fill="#38BDF8" />
                  <path d="M11 8h8M11 12h5" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
                  {/* Front document */}
                  <rect x="3" y="9" width="16" height="20" rx="3" fill="#1677E8" />
                  <path d="M7 14h8M7 18h6M7 22h4" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              {!isSidebarCollapsed && (
                <div className="flex flex-col leading-tight">
                  <span className="text-[14px] font-semibold tracking-tight text-slate-900">MyOwn</span>
                  <span className="text-xs font-bold text-slate-900 -mt-0.5">BillBook</span>
                </div>
              )}
            </Link>

            <button
              onClick={toggleSidebarCollapse}
              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <svg className={`w-4 h-4 transition-transform duration-200 ${isSidebarCollapsed ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Navigation Item Tree */}
          <nav
            aria-label="Sidebar Navigation"
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-2.5 space-y-1 scrollbar-thin scrollbar-thumb-slate-200"
          >
            {(() => {
              let lastGroup = "";
              return navigationSections.map((section) => {
                const showGroupHeader =
                  !isSidebarCollapsed &&
                  section.group &&
                  section.group !== lastGroup;
                if (section.group) {
                  lastGroup = section.group;
                }

                // Direct Link (Dashboard, Cash & Bank, Expenses, Reports, etc.)
                if (
                  section.href &&
                  (!section.items || section.items.length === 0)
                ) {
                  const isActive = activeNav.isDirectLinkActive(section.id, section.href);
                  return (
                    <React.Fragment key={section.id}>
                      {showGroupHeader && (
                        <div className="px-3.5 pt-3.5 pb-1 text-[10.5px] font-bold tracking-wider text-slate-400 uppercase">
                          {section.group}
                        </div>
                      )}
                      <Link
                        href={section.href}
                        className={`flex items-center transition-all ${isSidebarCollapsed
                            ? `w-11 h-11 mx-auto justify-center rounded-xl ${isActive
                              ? "text-white font-bold shadow-xs bg-[#1677E8]"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                            }`
                            : `gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold ${isActive
                              ? "text-white shadow-xs font-bold bg-[#1677E8]"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                            }`
                          }`}
                        title={
                          lang === "gu" ? section.nameGujarati : section.name
                        }
                      >
                        <span
                          className={isActive ? "text-white" : "text-slate-500"}
                        >
                          {section.icon}
                        </span>
                        {!isSidebarCollapsed && (
                          <span className="truncate flex-1">
                            {lang === "gu" ? section.nameGujarati : section.name}
                          </span>
                        )}
                        {!isSidebarCollapsed && section.badge && (
                          <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[9px] font-bold rounded">
                            {section.badge}
                          </span>
                        )}
                      </Link>
                    </React.Fragment>
                  );
                }

                // Accordion Section with Submenu (Sales, Purchases, Items, Parties, Vouchers)
                const hasActiveChild = activeNav.activeSectionId === section.id;
                const isExpanded = expandedSections[section.id] || hasActiveChild;

                if (isSidebarCollapsed) {
                  // Collapsed mode: Icon button with hover flyout menu
                  return (
                    <div key={section.id} className="relative group my-0.5">
                      <Link
                        href={section.items?.[0]?.href || "#"}
                        className={`w-11 h-11 mx-auto flex items-center justify-center rounded-xl text-xs font-medium transition-all ${hasActiveChild
                            ? "text-white font-bold shadow-xs bg-[#1677E8]"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                          }`}
                        title={
                          lang === "gu" ? section.nameGujarati : section.name
                        }
                      >
                        <span
                          className={
                            hasActiveChild ? "text-white" : "text-slate-500"
                          }
                        >
                          {section.icon}
                        </span>
                      </Link>

                      {/* Floating Flyout Menu on Hover when Collapsed */}
                      <div
                        className="hidden group-hover:block absolute left-full top-0 ml-2 w-56 rounded-xl shadow-2xl border border-slate-200 bg-white py-2 z-50 animate-fadeIn"
                      >
                        <div className="px-3.5 py-1.5 border-b border-slate-100 mb-1">
                          <p className="text-xs font-bold text-slate-900">
                            {section.name}
                          </p>
                          {lang === "gu" && (
                            <p className="text-[10px] text-slate-500 font-gujarati">
                              {section.nameGujarati}
                            </p>
                          )}
                        </div>
                        <div className="space-y-0.5 px-1.5">
                          {section.items?.map((item) => {
                            const isSubActive = activeNav.isSubItemActive(item.href);
                            return (
                              <Link
                                key={`${item.name}-${item.href}`}
                                href={item.href}
                                className={`block px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isSubActive
                                    ? "text-white font-bold bg-[#1677E8]"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                  }`}
                              >
                                <div className="truncate">{item.name}</div>
                                {lang === "gu" && (
                                  <div className="text-[10px] text-slate-400 font-gujarati truncate">
                                    {item.nameGujarati}
                                  </div>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                }

                // Expanded mode: Standard MyBillBook accordion item
                return (
                  <React.Fragment key={section.id}>
                    {showGroupHeader && (
                      <div className="px-3.5 pt-3.5 pb-1 text-[10.5px] font-bold tracking-wider text-slate-400 uppercase">
                        {section.group}
                      </div>
                    )}
                    <div className="space-y-0.5">
                      <button
                        type="button"
                        onClick={() => toggleSection(section.id)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${hasActiveChild
                            ? "text-[#1677E8] font-bold bg-blue-50/70"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                          }`}
                        title={section.name}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <span
                            className={
                              hasActiveChild ? "text-[#1677E8]" : "text-slate-500"
                            }
                          >
                            {section.icon}
                          </span>
                          <span className="truncate">
                            {lang === "gu" ? section.nameGujarati : section.name}
                          </span>
                        </div>
                        <svg
                          className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${isExpanded ? "rotate-180 text-slate-700" : "text-slate-400"
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
                      </button>

                      {/* Submenu Items with Vertical Navigation History Tree Line */}
                      {isExpanded && (
                        <div className="relative ml-[19px] pl-3.5 py-1 space-y-1">
                          {/* Continuous vertical connector line */}
                          <div
                            className="absolute left-0 top-1.5 bottom-2.5 w-[1.5px] bg-slate-200 rounded-full pointer-events-none"
                            aria-hidden="true"
                          />

                          {section.items?.map((item) => {
                            const isItemActive = activeNav.isSubItemActive(item.href);
                            return (
                              <Link
                                key={`${item.name}-${item.href}`}
                                href={item.href}
                                className={`group relative flex items-center justify-between py-2 px-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${isItemActive
                                    ? "text-white font-bold shadow-xs bg-[#1677E8]"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                  }`}
                              >
                                <div className="flex items-center gap-2 truncate min-w-0">
                                  {isItemActive && (
                                    <span
                                      aria-hidden="true"
                                      className="w-1 h-3.5 bg-white/95 rounded-full shrink-0 -ml-0.5 shadow-2xs"
                                    />
                                  )}
                                  <span className="truncate">
                                    {lang === "gu" ? item.nameGujarati : item.name}
                                  </span>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                );
              });
            })()}
          </nav>

          {/* Sidebar Footer: Upgrade to Pro Promotional Card */}
          <div className="shrink-0 p-3 border-t border-slate-100 bg-white flex flex-col gap-1.5">
            {!isSidebarCollapsed && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-b from-[#EBF3FF] to-[#F5F8FF] border border-[#BFDBFE]/80 shadow-2xs text-left space-y-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#1677E8] flex items-center justify-center text-sm shadow-2xs">
                  <svg className="w-4 h-4 text-[#1677E8]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5m14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
                  </svg>
                </div>
                <div className="text-xs font-semibold text-slate-900">Upgrade to Pro</div>
                <div className="space-y-1.5 text-[11px] font-semibold text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#1677E8] font-bold">✓</span>
                    <span>Multi-User Access</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#1677E8] font-bold">✓</span>
                    <span>Advanced Reports</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#1677E8] font-bold">✓</span>
                    <span>Priority Support</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/settings/billing")}
                  className="w-full py-2 px-3 rounded-xl bg-[#1677E8] hover:bg-[#1268D3] text-white font-medium text-[13px] shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                >
                  <span>Upgrade Now</span>
                  <span>→</span>
                </button>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* 2. MAIN APPLICATION CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden print:h-auto print:min-h-0 print:overflow-visible print:block print:w-full relative bg-[#F5F8FC]">
        {/* Background treatment: subtle neutral for inner pages, elegant branded depth for dashboard */}
        <WaveBackground variant={pathname === "/" ? "dashboard" : "inner"} />

        {/* SuperAdmin Active Support Session Banner */}
        {supportSession?.isSupportSession && (
          <div className="shrink-0 bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-900 text-white px-4 py-2 text-xs flex items-center justify-between z-30 shadow-md print:hidden">
            <div className="flex items-center gap-2">
              <span className="bg-amber-400 text-purple-950 font-bold px-2 py-0.5 rounded text-[10px] uppercase tabular-nums tracking-wider">
                Support Session
              </span>
              <span className="font-medium text-slate-100">
                Operating in authorized context of{" "}
                <strong className="text-white underline">
                  {supportSession.companyName || "Client Tenant"}
                </strong>{" "}
                as Platform SuperAdmin.
              </span>
            </div>
            <button
              onClick={handleExitSupportSession}
              className="px-3 py-1 bg-white text-purple-950 hover:bg-purple-100 rounded-lg font-medium text-[13px] transition-all shadow-xs shrink-0"
            >
              Exit Support Mode & Return to Console →
            </button>
          </div>
        )}

        {/* TOPBAR HEADER: In Settings mode, show mobile header with Back to Dashboard; in regular mode, show regular topbar */}
        {isSettingsPage ? (
          <header className="lg:hidden shrink-0 h-14 bg-white border-b border-[#E5E7EB] px-3 flex items-center justify-between z-20 shadow-xs print:hidden">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-[13px] font-medium text-slate-800 hover:text-slate-900 h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors shadow-2xs"
            >
              <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>{lang === "gu" ? "ડેશબોર્ડ" : "Dashboard"}</span>
            </Link>

            <span className="text-xs font-bold text-slate-800 truncate px-2">
              {lang === "gu" ? "સેટિંગ્સ" : "Settings"}
            </span>

            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg flex items-center gap-1"
              title="Settings Menu"
            >
              <span className="text-[11px] font-semibold text-slate-500">Menu</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </header>
        ) : (
          <header className="shrink-0 h-14 bg-white border-b border-[#E3EAF3] px-3 sm:px-5 flex items-center justify-between z-20 max-w-full min-w-0 print:hidden sticky top-0">
            {/* Left: Active Company Context & Financial Year */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
              {/* Menu Drawer Toggle Button (Visible on mobile) */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden flex items-center justify-center p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
                title={lang === "gu" ? "મેનૂ ખોલો" : "Open Navigation Menu"}
                aria-label="Navigation Menu"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Company Switcher */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <CompanySwitcher />

                {/* Financial Year Selector Pill matching Reference */}
                <div className="hidden sm:flex items-center gap-1.5 h-9 px-3 bg-white border border-[#E2E8F0] rounded-[10px] text-[13px] font-medium text-[#182230] select-none">
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{currentFY?.name || "FY 2026-27"}</span>
                  <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Center: Prominent Search Bar matching Reference Image */}
            <div className="hidden md:flex items-center flex-1 max-w-md mx-4 lg:mx-8">
              <div className="relative w-full">
                <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder={lang === "gu" ? "પાર્ટી, ઇનવોઇસ, વસ્તુઓ શોધો..." : "Search parties, invoices, items..."}
                  className="w-full h-10 pl-9 pr-4 bg-[#F8FBFF] hover:bg-white border border-[#E2E8F0] rounded-[10px] text-[13px] font-normal text-[#182230] placeholder:text-[#94A3B8] focus:bg-white focus:border-[#1677E8] focus:ring-1 focus:ring-[#1677E8] transition-all outline-none"
                />
              </div>
            </div>

            {/* Right: Notifications, Help, User Profile matching Reference Image */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto pl-1 sm:pl-2">
              {/* Notification Bell Center */}
              <NotificationCenter />

              {/* Help Circle Icon */}
              <button
                type="button"
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="Help & Support"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {/* User Profile Pill matching Reference */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-[#1677E8] text-white flex items-center justify-center font-bold text-xs shadow-2xs uppercase">
                  {user?.fullName
                    ? user.fullName[0]
                    : "J"}
                </div>
                <div className="hidden lg:flex items-center gap-1 text-[13px] font-medium text-[#182230]">
                  <span className="truncate max-w-[120px]">
                    {user?.fullName || user?.name || "Jaydeep"}
                  </span>
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Logout button (when not on dashboard) */}
              {pathname !== "/" && (
                <button
                  onClick={logout}
                  className="hidden md:inline-flex items-center justify-center p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                  title={lang === "gu" ? "લોગઆઉટ" : "Logout"}
                  aria-label="Logout"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </button>
              )}
            </div>
          </header>
        )}

        {/* 3. SCROLLABLE PAGE BODY */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden relative z-10 p-3 sm:p-4 lg:px-5 lg:py-4 pb-24 lg:pb-5 overscroll-y-contain focus:outline-none print:p-0 print:m-0 print:overflow-visible print:h-auto print:w-full print:block"
        >
          <div
            className="w-full min-w-0 max-w-none print:max-w-none print:w-full print:p-0 print:m-0"
          >
            {children}
          </div>
        </main>
      </div>

      {/* 4. MOBILE DRAWER OVERLAY */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex print:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation drawer"
        >
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[85vw] bg-white text-slate-800 h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {isSettingsPage ? (
              <div className="h-full flex flex-col bg-white text-slate-800">
                <div className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-slate-100 bg-slate-50">
                  <span className="text-xs font-bold text-slate-800">
                    {lang === "gu" ? "સેટિંગ્સ મેનૂ" : "Settings Menu"}
                  </span>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg text-[13px] transition-colors"
                    aria-label="Close settings drawer"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <SettingsSidebar onCloseMobile={() => setIsMobileMenuOpen(false)} />
                </div>
              </div>
            ) : (
              <>
                {/* Mobile Header with visible close button */}
                <div className="h-16 shrink-0 flex items-center justify-between px-4 border-b border-slate-100 bg-white">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none">
                        <rect x="7" y="3" width="16" height="20" rx="3" fill="#38BDF8" />
                        <path d="M11 8h8M11 12h5" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
                        <rect x="3" y="9" width="16" height="20" rx="3" fill="#1677E8" />
                        <path d="M7 14h8M7 18h6M7 22h4" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm font-semibold tracking-tight text-slate-900">MyOwn</span>
                      <span className="text-xs font-bold text-slate-900 -mt-0.5">BillBook</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                    aria-label="Close navigation drawer"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Mobile Nav Items */}
                <nav
                  aria-label="Mobile Navigation"
                  className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-3 space-y-1"
                >
                  {navigationSections.map((sec) => (
                    <div key={sec.id} className="space-y-0.5">
                      {sec.href ? (
                        <Link
                          href={sec.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeNav.isDirectLinkActive(sec.id, sec.href)
                              ? "bg-[#1677E8] text-white font-bold shadow-xs"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                            }`}
                        >
                          <span className={activeNav.isDirectLinkActive(sec.id, sec.href) ? "text-white" : "text-slate-500"}>
                            {sec.icon}
                          </span>
                          <span>{lang === "gu" ? sec.nameGujarati : sec.name}</span>
                        </Link>
                      ) : (
                        <div>
                          <div className="px-3 pt-3 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            {lang === "gu" ? sec.nameGujarati : sec.name}
                          </div>
                          <div className="relative ml-[19px] pl-3.5 py-1 space-y-1">
                            {/* Continuous vertical connector line */}
                            <div
                              className="absolute left-0 top-1.5 bottom-2.5 w-[1.5px] bg-slate-200 rounded-full pointer-events-none"
                              aria-hidden="true"
                            />
                            {sec.items?.map((item) => {
                              const isItemActive = activeNav.isSubItemActive(item.href);
                              return (
                                <Link
                                  key={`${item.name}-${item.href}`}
                                  href={item.href}
                                  onClick={() => setIsMobileMenuOpen(false)}
                                  className={`group relative flex items-center justify-between py-2 px-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${isItemActive
                                      ? "bg-[#1677E8] text-white font-bold shadow-xs"
                                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                    }`}
                                >
                                  <div className="flex items-center gap-2 truncate min-w-0">
                                    <span className="truncate">
                                      {lang === "gu" ? item.nameGujarati : item.name}
                                    </span>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </nav>

                {/* Mobile Drawer Footer: Branch switch & user profile & logout */}
                <div className="p-3 border-t border-slate-100 bg-slate-50/70 space-y-2 shrink-0">
                  {branches.length > 1 && (
                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                        {lang === "gu" ? "શાખા" : "Current Branch"}
                      </label>
                      <select
                        value={currentBranch?.id || ""}
                        onChange={(e) => switchBranch(e.target.value)}
                        className="w-full text-[13px] font-medium bg-white text-slate-800 border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none h-10"
                        aria-label="Select branch"
                      >
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-8 h-8 rounded-full bg-[#1677E8] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        {user?.fullName?.charAt(0) || "J"}
                      </div>
                      <div className="flex flex-col truncate">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {user?.fullName || user?.name || "Jaydeep"}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate">
                          {currentFY?.name || "FY 2026-27"}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={logout}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-[13px] font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      title={lang === "gu" ? "લોગઆઉટ" : "Logout"}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      <span>{lang === "gu" ? "લોગઆઉટ" : "Logout"}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 5. MOBILE BOTTOM NAVIGATION BAR (Hidden in Settings mode) */}
      {!isSettingsPage && (
        <nav
          aria-label="Mobile Navigation Bar"
          className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 px-2 py-1.5 flex items-center justify-around shadow-lg no-print print:hidden print-hide"
          data-print-hide="true"
        >
          <Link
            href="/"
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-bold transition-colors ${pathname === "/"
                ? "text-[#1677E8]"
                : "text-slate-500 hover:text-slate-900"
              }`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span>{lang === "gu" ? "ડેશબોર્ડ" : "Dashboard"}</span>
          </Link>

          <Link
            href="/sales/invoices"
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-bold transition-colors ${pathname.startsWith("/sales/invoices")
                ? "text-[#1677E8]"
                : "text-slate-500 hover:text-slate-900"
              }`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>{lang === "gu" ? "વેચાણ" : "Sales"}</span>
          </Link>

          <Link
            href="/sales/pos"
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-bold transition-colors ${pathname === "/sales/pos"
                ? "text-[#1677E8]"
                : "text-[#667085] hover:text-[#202124]"
              }`}
          >
            <div className="w-8 h-8 -mt-3 rounded-full bg-[#1677E8] text-white flex items-center justify-center shadow-blue-500/20">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <span>{lang === "gu" ? "ઝડપી POS" : "POS"}</span>
          </Link>

          <Link
            href="/purchases"
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-bold transition-colors ${pathname.startsWith("/purchases")
                ? "text-[#1677E8]"
                : "text-[#667085] hover:text-[#202124]"
              }`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <span>{lang === "gu" ? "ખરીદી" : "Purchase"}</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-medium text-[#667085] hover:text-[#182230] transition-colors"
            aria-label="Open full navigation menu"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
            <span>{lang === "gu" ? "મેનૂ" : "Menu"}</span>
          </button>
        </nav>
      )}
    </div>
  );
}
