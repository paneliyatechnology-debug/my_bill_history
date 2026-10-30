"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../context/auth-context";
import { apiClient } from "../../lib/api-client";
import { CompanySwitcher } from "../tenants/company-switcher";
import { WaveBackground } from "../ui/wave-background";
import { BrandLogo } from "../ui/brand-logo";
import { SettingsSidebar } from "../settings/settings-sidebar";
const SIDEBAR_BG = "#174B43";
const ACTIVE_MENU_BG = "#26A58A";
const TEXT_COLOR = "#FFFFFF";
const CTA_ACCENT = "#26A58A";
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
  group?: "GENERAL" | "ACCOUNTING SOLUTIONS" | "BUSINESS TOOLS";
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
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    sales: true,
    purchase: false,
    items: false,
    parties: false,
    cash_bank: false,
    reports: false,
    advanced: false,
    settings: false,
  });

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
      <div
        className="h-full min-h-[100dvh] w-full bg-[#F6F7F1] flex flex-col items-center justify-center p-6 text-center"
        style={{
          minHeight: "100vh",
          backgroundColor: "#F6F7F1",
          fontFamily: "var(--font-inter), sans-serif",
        }}
      >
        <div
          className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-bold text-2xl mb-4 shadow-sm"
          style={{
            width: "4rem",
            height: "4rem",
            borderRadius: "1rem",
            backgroundColor: "#FFFBEB",
          }}
        >
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-[#202124] tracking-tight">
          {lang === "gu"
            ? "વર્કસ્પેસ લોડ કરવામાં સમસ્યા"
            : "Unable to Load Workspace"}
        </h2>
        <p className="text-xs text-[#667085] mt-1.5 max-w-md">
          {workspaceError}
        </p>
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={() => retryWorkspace()}
            className="py-2.5 px-5 bg-[#C24E1D] hover:bg-[#D95F12] active:bg-[#B94B0A] text-white rounded-xl text-xs font-bold transition-all shadow-saffron"
            style={{
              backgroundColor: "#C24E1D",
              color: "#FFFFFF",
              padding: "10px 20px",
              borderRadius: "12px",
              fontWeight: "bold",
            }}
          >
            {lang === "gu" ? "પુનઃ પ્રયાસ કરો (Retry)" : "Retry Connection"}
          </button>
          <button
            onClick={() => logout()}
            className="py-2.5 px-5 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-[#344054] rounded-xl text-xs font-semibold transition-all"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              padding: "10px 20px",
              borderRadius: "12px",
            }}
          >
            {lang === "gu" ? "લોગિન પર પાછા જાઓ" : "Return to Login"}
          </button>
        </div>
      </div>
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
        <p className="text-lg font-black tracking-tight">
          <span className="text-[#174B43]">MyOwn</span>
          <span className="text-[#26A58A]">BillBook</span>
        </p>
        <p
          className="text-xs text-[#98A2B3] mt-1 font-mono"
          style={{ color: "#98A2B3" }}
        >
          {lang === "gu"
            ? "વર્કસ્પેસ તૈયાર થઈ રહ્યું છે..."
            : "Loading workspace..."}
        </p>

        {/* Watchdog recovery options if loading is delayed */}
        {loadingWatchdogTriggered && (
          <div
            className="mt-6 p-4 max-w-sm bg-white rounded-2xl border border-[#BCEADF] shadow-sm flex flex-col items-center"
            style={{
              maxWidth: "24rem",
              backgroundColor: "#FFFFFF",
              border: "1px solid #BCEADF",
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
                className="py-1.5 px-4 bg-[#26A58A] hover:bg-[#208E76] text-white rounded-lg text-xs font-bold transition-all shadow-jade"
                style={{
                  backgroundColor: "#26A58A",
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
                className="py-1.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all"
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

  // Dedicated Full-Screen Voucher Creation & Editing (Exact MyBillBook Wide-Screen Experience)
  const isDedicatedInvoicePage =
    pathname === "/sales/invoices/new" ||
    (pathname.startsWith("/sales/invoices/") &&
      (pathname.endsWith("/edit") || pathname.endsWith("/new"))) ||
    pathname === "/sales/quotations/new" ||
    (pathname.startsWith("/sales/quotations/") &&
      (pathname.endsWith("/edit") || pathname.endsWith("/new"))) ||
    pathname === "/sales/returns/new" ||
    (pathname.startsWith("/sales/returns/") &&
      (pathname.endsWith("/edit") || pathname.endsWith("/new"))) ||
    pathname === "/purchases/returns/create" ||
    pathname === "/purchases/returns/new" ||
    (pathname.startsWith("/purchases/returns/") &&
      (pathname.endsWith("/edit") || pathname.endsWith("/new") || pathname.endsWith("/create"))) ||
    pathname.includes("/purchases/debit-note/create") ||
    pathname.includes("/purchases/debit-memo/create") ||
    pathname.includes("/purchases/returns/create") ||
    pathname === "/sales/credit-note/create" ||
    pathname === "/sales/credit-note/new" ||
    (pathname.startsWith("/sales/credit-note/") &&
      (pathname.endsWith("/edit") || pathname.endsWith("/new"))) ||
    pathname.includes("/sales/debit-note/create") ||
    pathname.includes("/sales/debit-note/new") ||
    (pathname.includes("delivery-challan") &&
      (pathname.includes("/create") || pathname.includes("/new") || pathname.includes("/edit"))) ||
    (pathname.includes("proforma") &&
      (pathname.includes("/create") || pathname.includes("/new") || pathname.includes("/edit"))) ||
    pathname.includes("/purchases/orders/create") ||
    pathname.includes("/purchases/orders/new") ||
    pathname.includes("/purchases/purchase_order/create") ||
    pathname.includes("/purchases/purchase-order/create") ||
    pathname.includes("/purchases/purchase-orders/create") ||
    (pathname.startsWith("/purchases/orders/") &&
      (pathname.endsWith("/edit") || pathname.endsWith("/new") || pathname.endsWith("/create")));

  if (isDedicatedInvoicePage) {
    return <>{children}</>;
  }

  // Exact MyBillBook Hierarchical Menu Structure with 3 Core Sections
  const navigationSections: NavSection[] = [
    // --- GROUP 1: GENERAL ---
    {
      id: "dashboard",
      name: "Dashboard",
      nameGujarati: "મુખ્ય ડેશબોર્ડ",
      group: "GENERAL",
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
      group: "GENERAL",
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
      name: "Items",
      nameGujarati: "માલસામાન (Items)",
      group: "GENERAL",
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
      group: "GENERAL",
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
      group: "GENERAL",
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
      id: "reports",
      name: "Reports",
      nameGujarati: "રિપોર્ટ્સ (Reports)",
      group: "GENERAL",
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

    // --- GROUP 2: ACCOUNTING SOLUTIONS ---
    {
      id: "cash_bank",
      name: "Cash & Bank",
      nameGujarati: "રોકડ અને બેંક",
      group: "ACCOUNTING SOLUTIONS",
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
      id: "e_invoicing",
      name: "E-Invoicing",
      nameGujarati: "ઈ-ઇન્વોઇસિંગ & GST",
      group: "ACCOUNTING SOLUTIONS",
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
      group: "ACCOUNTING SOLUTIONS",
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
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      ),
    },
    {
      id: "expenses",
      name: "Expenses",
      nameGujarati: "દૈનિક ખર્ચા (Expenses)",
      group: "ACCOUNTING SOLUTIONS",
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
      id: "pos",
      name: "POS Billing",
      nameGujarati: "ઝડપી કાઉન્ટર POS",
      group: "ACCOUNTING SOLUTIONS",
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
    {
      id: "marketing",
      name: "SMS Marketing",
      nameGujarati: "SMS માર્કેટિંગ",
      group: "BUSINESS TOOLS",
      href: "/marketing",
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
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      ),
    },
  ];

  const isSettingsPage = pathname.startsWith("/settings") || pathname.startsWith("/pricing-settings");
  const isStudioSettings =
    pathname.startsWith("/settings/invoice") ||
    pathname.startsWith("/settings/thermal-print");
  const isCashBankPage =
    pathname === "/finance/cash-bank" ||
    pathname === "/cash-bank";

  return (
    <div className="h-[100dvh] h-screen w-full flex overflow-hidden bg-[#F6F7F1] print:h-auto print:min-h-0 print:overflow-visible print:bg-white print:block">
      {/* 1. DEDICATED MYBILLBOOK SETTINGS SIDEBAR (When in Settings mode) */}
      {isSettingsPage && (
        <div className="hidden lg:flex shrink-0 h-full print:hidden">
          <SettingsSidebar />
        </div>
      )}

      {/* 2. REGULAR DESKTOP MYBILLBOOK DARK SIDEBAR (When in dashboard mode) */}
      {!isSettingsPage && (
        <aside
          style={{ backgroundColor: SIDEBAR_BG }}
          className={`${isCashBankPage ? "hidden" : "hidden lg:flex"
            } flex-col shrink-0 h-full border-r border-[#1F5E54] text-white transition-all duration-300 z-30 select-none print:hidden ${isSidebarCollapsed ? "w-20" : "w-64"
            }`}
        >
          {/* Brand / Company Profile Header */}
          <div
            style={{ backgroundColor: SIDEBAR_BG }}
            className={`shrink-0 flex items-center border-b border-[#1F5E54] transition-all relative ${isSidebarCollapsed
                ? "justify-center px-2 py-4"
                : "justify-between px-4 py-3.5"
              }`}
          >
            <Link
              href="/settings/account"
              className={`flex items-center gap-3 group hover:bg-white/5 rounded-xl p-1 transition-all ${isSidebarCollapsed ? "justify-center" : "overflow-hidden flex-1 min-w-0"
                }`}
              title={lang === "gu" ? "કંપની સેટિંગ્સ ખોલો" : "Open Company Settings"}
            >
              {/* Avatar Circle with First Letter using primaryColor */}
              <div
                style={{ backgroundColor: CTA_ACCENT }}
                className="w-10 h-10 rounded-full group-hover:scale-105 flex items-center justify-center text-white font-extrabold text-base shadow-sm shrink-0 uppercase transition-transform"
              >
                {currentCompany?.tradeName?.charAt(0) ||
                  currentCompany?.legalName?.charAt(0) ||
                  "B"}
              </div>
              {!isSidebarCollapsed && (
                <div className="flex flex-col truncate min-w-0 text-left">
                  <span className="text-sm font-bold text-white group-hover:text-[#85D5C2] tracking-tight leading-tight truncate transition-colors">
                    {currentCompany?.tradeName ||
                      currentCompany?.legalName ||
                      (lang === "gu" ? "કંપની" : "Company")}
                  </span>
                  {(user?.phone || currentCompany?.gstin) && (
                    <span className="text-xs text-[#A7C7C0] font-mono tracking-wide mt-0.5 truncate">
                      {user?.phone || currentCompany?.gstin}
                    </span>
                  )}
                </div>
              )}
            </Link>

            {/* Floating Collapse / Expand Toggle Button */}
            <button
              onClick={toggleSidebarCollapse}
              className={`transition-colors ${isSidebarCollapsed
                  ? "absolute -right-3 top-5 w-6 h-6 bg-[#133E37] border border-[#1F5E54] shadow-xs rounded-full flex items-center justify-center text-slate-300 hover:text-white z-40"
                  : "p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg shrink-0"
                }`}
              title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={
                isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${isSidebarCollapsed ? "rotate-180" : ""
                  }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            </button>
          </div>

          {/* Navigation Item Tree */}
          <nav
            aria-label="Sidebar Navigation"
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-700"
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
                  const isActive =
                    pathname === section.href ||
                    (section.href !== "/" && pathname.startsWith(section.href)) ||
                    (section.id === "payroll" && (pathname === "/payroll" || pathname.startsWith("/app/sam"))) ||
                    (section.id === "users" && (pathname === "/settings/user-management" || pathname.startsWith("/app/settings/user-management")));
                  return (
                    <React.Fragment key={section.id}>
                      {showGroupHeader && (
                        <div className="px-3 pt-3 pb-1 text-[10px] font-bold tracking-wider text-[#90B6AE] uppercase">
                          {section.group}
                        </div>
                      )}
                      <Link
                        href={section.href}
                        className={`flex items-center transition-all ${isSidebarCollapsed
                            ? `w-11 h-11 mx-auto justify-center rounded-xl ${isActive
                              ? "text-white font-bold shadow-xs bg-[#26A58A]"
                              : "text-[#C4DBD6] hover:text-white hover:bg-white/10"
                            }`
                            : `gap-3 px-3 py-2 rounded-xl text-xs font-semibold ${isActive
                              ? "text-white shadow-xs font-bold bg-[#26A58A]"
                              : "text-[#C4DBD6] hover:text-white hover:bg-white/10"
                            }`
                          }`}
                        style={{ backgroundColor: isActive ? ACTIVE_MENU_BG : undefined, color: isActive ? TEXT_COLOR : undefined }}
                        title={
                          lang === "gu" ? section.nameGujarati : section.name
                        }
                      >
                        <span
                          className={isActive ? "text-white" : "text-[#A7C7C0]"}
                        >
                          {section.icon}
                        </span>
                        {!isSidebarCollapsed && (
                          <span className="truncate flex-1">
                            {lang === "gu" ? section.nameGujarati : section.name}
                          </span>
                        )}
                        {!isSidebarCollapsed && section.badge && (
                          <span className="px-1.5 py-0.2 bg-[#EF4444] text-white text-[9px] font-bold rounded">
                            {section.badge}
                          </span>
                        )}
                      </Link>
                    </React.Fragment>
                  );
                }

                // Accordion Section with Submenu (Sales, Purchases, Items, Parties)
                const isExpanded = expandedSections[section.id];
                const hasActiveChild = section.items?.some((sub) =>
                  pathname.startsWith(sub.href),
                );

                if (isSidebarCollapsed) {
                  // Collapsed mode: Icon button with hover flyout menu
                  return (
                    <div key={section.id} className="relative group my-0.5">
                      <Link
                        href={section.items?.[0]?.href || "#"}
                        className={`w-11 h-11 mx-auto flex items-center justify-center rounded-xl text-xs font-medium transition-all ${hasActiveChild
                            ? "text-white font-bold shadow-xs bg-[#26A58A]"
                            : "text-[#C4DBD6] hover:text-white hover:bg-white/10"
                          }`}
                        style={{ backgroundColor: hasActiveChild ? ACTIVE_MENU_BG : undefined, color: hasActiveChild ? TEXT_COLOR : undefined }}
                        title={
                          lang === "gu" ? section.nameGujarati : section.name
                        }
                      >
                        <span
                          className={
                            hasActiveChild ? "text-white" : "text-[#A7C7C0]"
                          }
                        >
                          {section.icon}
                        </span>
                      </Link>

                      {/* Floating Flyout Menu on Hover when Collapsed */}
                      <div
                        style={{ backgroundColor: SIDEBAR_BG }}
                        className="hidden group-hover:block absolute left-full top-0 ml-2 w-56 rounded-xl shadow-2xl border border-[#1F5E54] py-2 z-50 animate-fadeIn"
                      >
                        <div className="px-3.5 py-1.5 border-b border-[#1F5E54] mb-1">
                          <p className="text-xs font-bold text-white">
                            {section.name}
                          </p>
                          {lang === "gu" && (
                            <p className="text-[10px] text-[#A7C7C0] font-gujarati">
                              {section.nameGujarati}
                            </p>
                          )}
                        </div>
                        <div className="space-y-0.5 px-1.5">
                          {section.items?.map((item) => {
                            const isSubActive =
                              pathname === item.href ||
                              (item.href === "/sales/payment-in" &&
                                pathname.startsWith("/sales/payment-in")) ||
                              (item.href === "/sales/credit-note" &&
                                pathname.startsWith("/sales/credit-note")) ||
                              (item.href === "/sales/delivery-challan" &&
                                (pathname.startsWith("/sales/delivery-challan") ||
                                  pathname.startsWith("/sales/delivery-challans"))) ||
                              (item.href === "/sales/proforma" &&
                                pathname.startsWith("/sales/proforma")) ||
                              (item.href === "/sales/returns" &&
                                pathname.startsWith("/sales/returns") &&
                                !pathname.includes("credit-note"));
                            return (
                              <Link
                                key={`${item.name}-${item.href}`}
                                href={item.href}
                                className={`block px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isSubActive
                                    ? "text-white font-bold"
                                    : "text-slate-300 hover:text-white hover:bg-white/10"
                                  }`}
                                style={{ backgroundColor: isSubActive ? ACTIVE_MENU_BG : undefined, color: isSubActive ? TEXT_COLOR : undefined }}
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
                      <div className="px-3 pt-3 pb-1 text-[10px] font-bold tracking-wider text-[#90B6AE] uppercase">
                        {section.group}
                      </div>
                    )}
                    <div className="space-y-0.5">
                      <button
                        type="button"
                        onClick={() => toggleSection(section.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${hasActiveChild
                            ? "text-white font-bold shadow-xs bg-[#26A58A]"
                            : "text-[#C4DBD6] hover:text-white hover:bg-white/10"
                          }`}
                        style={{ backgroundColor: hasActiveChild ? ACTIVE_MENU_BG : undefined, color: hasActiveChild ? TEXT_COLOR : undefined }}
                        title={section.name}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <span
                            className={
                              hasActiveChild ? "text-white" : "text-slate-400"
                            }
                          >
                            {section.icon}
                          </span>
                          <span className="truncate">
                            {lang === "gu" ? section.nameGujarati : section.name}
                          </span>
                        </div>
                        <svg
                          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isExpanded ? "rotate-90 text-white" : ""
                            }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>

                      {/* Submenu Items */}
                      {isExpanded && (
                        <div className="pl-9 pr-1 py-1 space-y-0.5">
                          {section.items?.map((item) => {
                            const isItemActive =
                              pathname === item.href ||
                              (item.href === "/sales/payment-in" &&
                                pathname.startsWith("/sales/payment-in")) ||
                              (item.href === "/sales/credit-note" &&
                                pathname.startsWith("/sales/credit-note")) ||
                              (item.href === "/sales/delivery-challan" &&
                                (pathname.startsWith("/sales/delivery-challan") ||
                                  pathname.startsWith("/sales/delivery-challans"))) ||
                              (item.href === "/sales/proforma" &&
                                pathname.startsWith("/sales/proforma")) ||
                              (item.href === "/sales/returns" &&
                                pathname.startsWith("/sales/returns") &&
                                !pathname.includes("credit-note")) ||
                              (item.href === "/purchases/orders" &&
                                (pathname.startsWith("/purchases/orders") ||
                                  pathname.startsWith("/purchases/purchase_order") ||
                                  pathname.startsWith("/purchases/purchase-order") ||
                                  pathname.startsWith("/purchases/purchase-orders")));
                            return (
                              <Link
                                key={`${item.name}-${item.href}`}
                                href={item.href}
                                className={`block py-1.5 px-2.5 rounded-lg text-xs font-medium transition-colors ${isItemActive
                                    ? "text-white font-bold shadow-2xs bg-[#26A58A]"
                                    : "text-[#A7C7C0] hover:text-white hover:bg-white/10"
                                  }`}
                                style={{ backgroundColor: isItemActive ? ACTIVE_MENU_BG : undefined, color: isItemActive ? TEXT_COLOR : undefined }}
                              >
                                <span className="truncate">
                                  {lang === "gu" ? item.nameGujarati : item.name}
                                </span>
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

          {/* Sidebar Footer: Theme Customizer, Settings & Security Badges */}
          <div
            style={{ backgroundColor: SIDEBAR_BG }}
            className="shrink-0 p-3 border-t border-slate-700/50 flex flex-col gap-1.5"
          >
            <Link
              href="/settings/account"
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${pathname.startsWith("/settings")
                  ? "text-white shadow-xs font-bold"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
                }`}
              style={{ backgroundColor: pathname.startsWith("/settings") ? ACTIVE_MENU_BG : undefined, color: pathname.startsWith("/settings") ? TEXT_COLOR : undefined }}
              title="Settings"
            >
              <svg
                className="w-4 h-4 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {!isSidebarCollapsed && (
                <span>{lang === "gu" ? "સેટિંગ્સ" : "Settings"}</span>
              )}
            </Link>

            {/* {!isSidebarCollapsed && (
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 px-1">
                <span className="flex items-center gap-1">
                  <span>🛡️</span> 100% Secure
                </span>
                <span className="flex items-center gap-1">
                  <span>✓</span> ISO Certified
                </span>
              </div>
            )} */}
          </div>
        </aside>
      )}

      {/* 2. MAIN APPLICATION CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden print:h-auto print:min-h-0 print:overflow-visible print:block print:w-full relative bg-[#F7F8FA]">
        {/* Background treatment: subtle neutral for inner pages, elegant branded depth for dashboard */}
        <WaveBackground variant={pathname === "/" ? "dashboard" : "inner"} />

        {/* SuperAdmin Active Support Session Banner */}
        {supportSession?.isSupportSession && (
          <div className="shrink-0 bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-900 text-white px-4 py-2 text-xs flex items-center justify-between z-30 shadow-md print:hidden">
            <div className="flex items-center gap-2">
              <span className="bg-amber-400 text-purple-950 font-bold px-2 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider">
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
              className="px-3 py-1 bg-white text-purple-950 hover:bg-purple-100 rounded-lg font-bold text-xs transition-all shadow-xs shrink-0"
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
              className="flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:text-slate-900 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors shadow-2xs"
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
          <header className="shrink-0 h-16 sm:h-18 bg-white border-b border-[#E5E7EB] px-3 sm:px-6 flex items-center justify-between z-20 shadow-xs max-w-full min-w-0 print:hidden">
            {/* Left: Active Company/Branch Context & Brand Logo */}
            <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
              {/* Menu Drawer Toggle Button (Visible on mobile, and on desktop when sidebar is hidden) */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className={`${isCashBankPage ? "flex" : "lg:hidden flex"
                  } items-center justify-center p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0`}
                title={lang === "gu" ? "મેનૂ ખોલો" : "Open Navigation Menu"}
                aria-label="Navigation Menu"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Brand Logo when desktop sidebar is hidden: compact icon on mobile (< sm), full horizontal logo on sm+ */}
              <div
                className={`${isCashBankPage ? "flex" : "lg:hidden flex"
                  } items-center shrink-0`}
              >
                <div className="hidden sm:block">
                  <BrandLogo size="md" variant="horizontal" />
                </div>
                <div className="block sm:hidden">
                  <BrandLogo size="sm" variant="icon" />
                </div>
              </div>

              {/* Active Company & Branch Context Switchers */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <CompanySwitcher />

                {/* Branch Pill */}
                {branches.length > 1 && (
                  <select
                    value={currentBranch?.id || ""}
                    onChange={(e) => switchBranch(e.target.value)}
                    className="text-xs sm:text-sm font-semibold bg-[#F8F9FB] text-[#4B5563] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer hidden md:block max-w-[130px] truncate"
                    title={`Branch: ${currentBranch?.name || ""}`}
                    aria-label="Select branch"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}

                {/* Financial Year Tag */}
                <span className="text-xs sm:text-[13px] font-mono font-bold text-[#4B5563] bg-[#F3F4F6] px-2.5 py-1 rounded-md border border-[#E5E7EB] hidden lg:inline whitespace-nowrap">
                  {currentFY?.name || "FY 2026-27"}
                </span>
              </div>
            </div>

            {/* Right: Quick Action, Language Toggle & User/Logout */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto pl-1 sm:pl-2">

              {/* Primary Action Button: Create Bill (hidden if already on new bill page) */}
              {pathname !== "/sales/invoices/new" && (
                <Link
                  href="/sales/invoices/new"
                  className="flex items-center gap-1.5 sm:gap-2 py-2 px-3 sm:px-4.5 text-white rounded-xl text-xs sm:text-[14px] font-bold shadow-xs transition-all shrink-0 whitespace-nowrap active:scale-95 bg-[#26A58A] hover:bg-[#208E76]"
                  title={
                    lang === "gu" ? "નવું વેચાણ બિલ (F2)" : "Create New Bill (F2)"
                  }
                  aria-label={
                    lang === "gu"
                      ? "નવું બિલ બનાવો (Create New Bill)"
                      : "Create New Bill"
                  }
                >
                  <svg
                    className="w-4 h-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.4}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  {/* Short label on mobile screens, full label on tablets and desktop */}
                  <span className="hidden sm:inline font-bold">
                    {lang === "gu" ? "નવું બિલ બનાવો" : "Create New Bill"}
                  </span>
                  <span className="inline sm:hidden font-bold">
                    {lang === "gu" ? "બિલ" : "Bill"}
                  </span>
                </Link>
              )}

              {/* Bilingual Language Switcher (EN | ગુજ) */}
              <div className="flex items-center bg-[#F3F4F6] p-0.5 rounded-lg border border-[#E5E7EB] shrink-0 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setLang("en")}
                  className={`px-2 py-1 text-xs sm:text-[13px] font-bold rounded-md transition-all ${
                    lang === "en"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLang("gu")}
                  className={`px-2 py-1 text-xs sm:text-[13px] font-bold rounded-md transition-all ${
                    lang === "gu"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  ગુજરાતી
                </button>
              </div>

              {/* Logout / User Trigger: Hidden on mobile (< md), visible on desktop (>= md) */}
              <button
                onClick={logout}
                className="hidden md:inline-flex items-center justify-center p-1 sm:p-1.5 text-[#667085] hover:text-[#DC3545] hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                title={lang === "gu" ? "લોગઆઉટ" : "Logout"}
                aria-label="Logout"
              >
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
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
            </div>
          </header>
        )}

        {/* 3. SCROLLABLE PAGE BODY */}
        <main
          id="main-content"
          tabIndex={-1}
          className={`flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden relative z-10 ${pathname === "/" ||
              pathname.startsWith("/purchases") ||
              pathname.startsWith("/sales") ||
              isCashBankPage ||
              isStudioSettings
              ? "p-2 sm:p-3 lg:p-4"
              : "p-3 sm:p-6 lg:p-8"
            } pb-24 lg:pb-8 overscroll-y-contain focus:outline-none print:p-0 print:m-0 print:overflow-visible print:h-auto print:w-full print:block`}
        >
          <div
            className={`${pathname === "/" ||
                pathname.startsWith("/purchases") ||
                pathname.startsWith("/sales") ||
                isCashBankPage ||
                isStudioSettings
                ? "w-full min-w-0 max-w-none"
                : "max-w-7xl w-full min-w-0 mx-auto"
              } print:max-w-none print:w-full print:p-0 print:m-0`}
          >
            {children}
          </div>
        </main>
      </div>

      {/* 4. MOBILE & DESKTOP FLYOUT DRAWER OVERLAY */}
      {isMobileMenuOpen && (
        <div
          className={`fixed inset-0 z-50 ${isCashBankPage ? "flex" : "lg:hidden flex"} print:hidden`}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation drawer"
        >
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[85vw] bg-[#174B43] text-white h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {isSettingsPage ? (
              <div className="h-full flex flex-col bg-[#174B43] text-white">
                <div className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-[#1F5E54] bg-[#133E37]">
                  <span className="text-xs font-bold text-white">
                    {lang === "gu" ? "સેટિંગ્સ મેનૂ" : "Settings Menu"}
                  </span>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1.5 text-[#A7C7C0] hover:text-white hover:bg-white/10 rounded-lg text-sm transition-colors"
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
                <div className="h-16 shrink-0 flex items-center justify-between px-4 border-b border-[#1F5E54] bg-[#133E37]">
                  <BrandLogo size="sm" showSubtitle subtitle={currentCompany?.tradeName || "Billing & Retail"} />
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 text-[#A7C7C0] hover:text-white hover:bg-white/10 rounded-md transition-colors"
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
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-button text-sm font-medium transition-colors ${pathname === sec.href ||
                              (sec.href !== "/" && pathname.startsWith(sec.href)) ||
                              (sec.id === "payroll" && (pathname === "/payroll" || pathname.startsWith("/app/sam"))) ||
                              (sec.id === "users" && (pathname === "/settings/user-management" || pathname.startsWith("/app/settings/user-management")))
                              ? "bg-[#26A58A] text-white font-bold"
                              : "text-[#C4DBD6] hover:text-white hover:bg-white/10"
                            }`}
                        >
                          {sec.icon}
                          <span>{lang === "gu" ? sec.nameGujarati : sec.name}</span>
                        </Link>
                      ) : (
                        <div>
                          <div className="px-3 pt-3 pb-1 text-[11px] font-bold text-[#90B6AE] uppercase tracking-wider">
                            {lang === "gu" ? sec.nameGujarati : sec.name}
                          </div>
                          <div className="pl-4 space-y-1">
                            {sec.items?.map((item) => (
                              <Link
                                key={`${item.name}-${item.href}`}
                                href={item.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-button text-sm transition-colors ${pathname === item.href ||
                                    (item.href === "/sales/payment-in" &&
                                      pathname.startsWith("/sales/payment-in")) ||
                                    (item.href === "/sales/delivery-challan" &&
                                      pathname.startsWith("/sales/delivery-challan")) ||
                                    (item.href === "/sales/proforma" &&
                                      pathname.startsWith("/sales/proforma")) ||
                                    (item.href === "/sales/returns" &&
                                      pathname.startsWith("/sales/returns") &&
                                      !pathname.includes("credit-note"))
                                    ? "bg-[#26A58A] text-white font-bold"
                                    : "text-[#C4DBD6] hover:text-white hover:bg-white/10"
                                  }`}
                              >
                                <span>
                                  {lang === "gu" ? item.nameGujarati : item.name}
                                </span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </nav>

                {/* Mobile Drawer Footer: Branch switch & user profile & logout */}
                <div className="p-3 border-t border-[#1F5E54] bg-[#133E37] space-y-2 shrink-0">
                  {branches.length > 1 && (
                    <div>
                      <label className="block text-[10px] font-bold text-[#90B6AE] uppercase tracking-wider mb-1">
                        {lang === "gu" ? "શાખા" : "Current Branch"}
                      </label>
                      <select
                        value={currentBranch?.id || ""}
                        onChange={(e) => switchBranch(e.target.value)}
                        className="w-full text-xs font-medium bg-[#174B43] text-white border border-[#1F5E54] rounded-md px-2 py-1.5 focus:outline-none"
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
                      <div className="w-8 h-8 rounded-full bg-[#26A58A] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        {user?.fullName?.charAt(0) || "U"}
                      </div>
                      <div className="flex flex-col truncate">
                        <span className="text-xs font-bold text-white truncate">
                          {user?.fullName || "User"}
                        </span>
                        <span className="text-[10px] text-[#A7C7C0] truncate">
                          {currentFY?.name || "FY 2026-27"}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={logout}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#C4DBD6] hover:text-[#26A58A] hover:bg-white/10 rounded-md transition-colors"
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
          className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-[#E5E7EB] z-40 px-2 py-1.5 flex items-center justify-around shadow-lg no-print print:hidden print-hide"
          data-print-hide="true"
        >
          <Link
            href="/"
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-bold transition-colors ${pathname === "/"
                ? "text-[#26A58A]"
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
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span>{lang === "gu" ? "ડેશબોર્ડ" : "Dashboard"}</span>
          </Link>

          <Link
            href="/sales/invoices"
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-bold transition-colors ${pathname.startsWith("/sales/invoices")
                ? "text-[#26A58A]"
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>{lang === "gu" ? "વેચાણ" : "Sales"}</span>
          </Link>

          <Link
            href="/sales/pos"
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-bold transition-colors ${pathname === "/sales/pos"
                ? "text-[#26A58A]"
                : "text-[#667085] hover:text-[#202124]"
              }`}
          >
            <div className="w-8 h-8 -mt-3 rounded-full bg-[#26A58A] text-white flex items-center justify-center shadow-jade">
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
                ? "text-[#26A58A]"
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
            className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-bold text-[#667085] hover:text-[#202124] transition-colors"
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
