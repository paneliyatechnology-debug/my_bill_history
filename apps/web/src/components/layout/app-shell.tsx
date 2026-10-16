"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../context/auth-context";
import { apiClient } from "../../lib/api-client";
import { CompanySwitcher } from "../tenants/company-switcher";
import { WaveBackground } from "../ui/wave-background";

interface SubNavItem {
  name: string;
  nameGujarati: string;
  href: string;
}

interface NavSection {
  id: string;
  name: string;
  nameGujarati: string;
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
  const [loadingWatchdogTriggered, setLoadingWatchdogTriggered] = useState(false);

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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
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
      router.push("/superadmin");
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
        setExpandedSections((prev) => ({ ...prev, ...JSON.parse(savedSections) }));
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
      } catch {}
      return next;
    });
  };

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar_collapsed", String(next));
      } catch {}
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

  // If unauthenticated and finished loading, automatically redirect to login page
  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== "/login") {
      const redirectParam = pathname && pathname !== "/" ? `?redirect=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${redirectParam}`);
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  // If on login page or dedicated superadmin portal, render children cleanly without standard business shell
  if (pathname === "/login" || pathname.startsWith("/superadmin")) {
    return <>{children}</>;
  }

  // Workspace Error Screen — If companies cannot be loaded and error occurred
  if (!isLoading && isAuthenticated && workspaceError && companies.length === 0) {
    return (
      <div
        className="h-full min-h-[100dvh] w-full bg-[#F8F9FB] flex flex-col items-center justify-center p-6 text-center"
        style={{ minHeight: "100vh", backgroundColor: "#F8F9FB", fontFamily: "var(--font-inter), sans-serif" }}
      >
        <div
          className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-bold text-2xl mb-4 shadow-sm"
          style={{ width: "4rem", height: "4rem", borderRadius: "1rem", backgroundColor: "#FFFBEB" }}
        >
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-[#202124] tracking-tight">
          {lang === "gu" ? "વર્કસ્પેસ લોડ કરવામાં સમસ્યા" : "Unable to Load Workspace"}
        </h2>
        <p className="text-xs text-[#667085] mt-1.5 max-w-md">
          {workspaceError}
        </p>
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={() => retryWorkspace()}
            className="py-2.5 px-5 bg-[#F47721] hover:bg-[#D95F12] active:bg-[#B94B0A] text-white rounded-xl text-xs font-bold transition-all shadow-saffron"
            style={{ backgroundColor: "#F47721", color: "#FFFFFF", padding: "10px 20px", borderRadius: "12px", fontWeight: "bold" }}
          >
            {lang === "gu" ? "પુનઃ પ્રયાસ કરો (Retry)" : "Retry Connection"}
          </button>
          <button
            onClick={() => logout()}
            className="py-2.5 px-5 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-[#344054] rounded-xl text-xs font-semibold transition-all"
            style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", padding: "10px 20px", borderRadius: "12px" }}
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
        className="h-full min-h-[100dvh] w-full bg-[#F8F9FB] flex flex-col items-center justify-center p-4 text-center"
        style={{ minHeight: "100vh", backgroundColor: "#F8F9FB", fontFamily: "var(--font-inter), sans-serif" }}
      >
        <div
          className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#F47721] to-[#FF9B50] flex items-center justify-center text-white font-bold text-3xl shadow-saffron animate-pulse mb-3"
          style={{ width: "4rem", height: "4rem", borderRadius: "1rem", backgroundColor: "#F47721", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.875rem" }}
        >
          ₹
        </div>
        <p className="text-base font-bold text-[#202124]" style={{ color: "#202124", fontWeight: 700 }}>
          MyBill History
        </p>
        <p className="text-xs text-[#98A2B3] mt-1 font-mono" style={{ color: "#98A2B3" }}>
          {lang === "gu" ? "વર્કસ્પેસ તૈયાર થઈ રહ્યું છે..." : "Loading workspace..."}
        </p>

        {/* Watchdog recovery options if loading is delayed */}
        {loadingWatchdogTriggered && (
          <div
            className="mt-6 p-4 max-w-sm bg-white rounded-2xl border border-[#FED7AA] shadow-sm flex flex-col items-center"
            style={{ maxWidth: "24rem", backgroundColor: "#FFFFFF", border: "1px solid #FED7AA", borderRadius: "1rem", padding: "1rem" }}
          >
            <p className="text-xs text-[#667085] mb-3">
              {lang === "gu"
                ? "સર્વર પ્રતિસાદ આપવા માટે સામાન્ય કરતાં વધુ સમય લઈ રહ્યું છે."
                : "Workspace connection is taking longer than usual."}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.location.reload()}
                className="py-1.5 px-4 bg-[#F47721] hover:bg-[#D95F12] text-white rounded-lg text-xs font-bold transition-all shadow-saffron"
                style={{ backgroundColor: "#F47721", color: "#FFFFFF", padding: "6px 16px", borderRadius: "8px", fontWeight: "bold" }}
              >
                {lang === "gu" ? "રિફ્રેશ કરો" : "Reload"}
              </button>
              <button
                onClick={() => logout()}
                className="py-1.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all"
                style={{ backgroundColor: "#F1F5F9", color: "#334155", padding: "6px 16px", borderRadius: "8px" }}
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

  // 9 Reorganized Navigation Groups specifically for Indian SMEs & Retailers
  const navigationSections: NavSection[] = [
    {
      id: "dashboard",
      name: "Dashboard",
      nameGujarati: "મુખ્ય ડેશબોર્ડ",
      href: "/",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: "sales",
      name: "Sales",
      nameGujarati: "વેચાણ (સેલ્સ)",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      items: [
        { name: "Sales Invoices", nameGujarati: "વેચાણ બિલ", href: "/sales/invoices" },
        { name: "Quick Billing / POS", nameGujarati: "ઝડપી કાઉન્ટર બિલિંગ (POS)", href: "/sales/pos" },
        { name: "Sales Returns (Credit Note)", nameGujarati: "વેચાણ પરત (ક્રેડિટ નોટ)", href: "/sales/returns" },
        { name: "Delivery Challans", nameGujarati: "ડિલિવરી ચલણ", href: "/sales/delivery-challans" },
      ],
    },
    {
      id: "purchase",
      name: "Purchase",
      nameGujarati: "ખરીદી (પરચેઝ)",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      items: [
        { name: "Purchase Bills", nameGujarati: "ખરીદી બિલ & સ્કેનર", href: "/purchases" },
        { name: "Purchase Returns (Debit Note)", nameGujarati: "ખરીદી પરત (ડેબિટ નોટ)", href: "/purchases/returns" },
      ],
    },
    {
      id: "items",
      name: "Items & Stock",
      nameGujarati: "માલસામાન અને સ્ટોક",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      items: [
        { name: "Items Catalog", nameGujarati: "વસ્તુઓની યાદી (Items)", href: "/masters/items" },
        { name: "Categories", nameGujarati: "કેટેગરીઝ", href: "/masters/categories" },
        { name: "Units (UOM)", nameGujarati: "એકમો (UOM)", href: "/masters/units" },
        { name: "Batches & Expiry", nameGujarati: "બેચ અને એક્સપાયરી", href: "/masters/batches" },
        { name: "HSN / SAC Codes", nameGujarati: "એચએસએન કોડ", href: "/masters/hsn" },
        { name: "Warehouses (Godowns)", nameGujarati: "ગોડાઉન / વેરહાઉસ", href: "/masters/warehouses" },
        { name: "Stock Transfers", nameGujarati: "ગોડાઉન સ્ટોક ટ્રાન્સફર", href: "/distribution/stock-transfers" },
        { name: "Manufacturing (BOM)", nameGujarati: "ઉત્પાદન રેસિપી (BOM)", href: "/manufacturing/bom" },
        { name: "Production Orders", nameGujarati: "પ્રોડક્શન વર્ક ઓર્ડર", href: "/manufacturing/orders" },
      ],
    },
    {
      id: "parties",
      name: "Parties",
      nameGujarati: "ગ્રાહકો / વેપારીઓ",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      items: [
        { name: "Customers & Suppliers", nameGujarati: "ગ્રાહક અને વેપારી ખાતાવહી", href: "/masters/parties" },
      ],
    },
    {
      id: "cash_bank",
      name: "Cash & Bank",
      nameGujarati: "રોકડ અને બેંક",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      items: [
        { name: "Cash Book & Receipts", nameGujarati: "રોજમેળ & આવક-જાવક વાઉચર", href: "/finance/vouchers" },
        { name: "Expenses Entry", nameGujarati: "દૈનિક ખર્ચા (Expenses)", href: "/finance/expenses" },
        { name: "Bank & Ledgers", nameGujarati: "બેંક ખાતા અને લેજર્સ", href: "/finance/ledgers" },
      ],
    },
    {
      id: "reports",
      name: "Reports",
      nameGujarati: "રિપોર્ટ્સ અને નફો",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      items: [
        { name: "Sales & Stock Reports", nameGujarati: "વેચાણ અને સ્ટોક રજીસ્ટર", href: "/reports" },
        { name: "P&L, Balance Sheet", nameGujarati: "નફાનુકસાન & પાકું સરવૈયું", href: "/finance/reports" },
      ],
    },
    {
      id: "advanced",
      name: "Advanced / GST",
      nameGujarati: "જીએસટી અને એકાઉન્ટિંગ",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 14l2 2 4-4M7 4h10a2 2 0 012 2v14l-4-2-3 2-3-2-4 2V6a2 2 0 012-2z" />
        </svg>
      ),
      items: [
        { name: "GST Center (GSTR 1/2B/3B)", nameGujarati: "જીએસટી કેન્દ્ર & e-Invoice", href: "/gst" },
        { name: "Detailed Ledgers", nameGujarati: "વિગતવાર ખાતાવહી (GL)", href: "/finance/ledgers" },
        { name: "Accounting Vouchers", nameGujarati: "જર્નલ / કોન્ટ્રા વાઉચર", href: "/finance/vouchers" },
      ],
    },
    {
      id: "settings",
      name: "Settings",
      nameGujarati: "સેટિંગ્સ",
      href: "/settings",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="h-[100dvh] h-screen w-full flex overflow-hidden bg-[#F8F9FB] print:h-auto print:min-h-0 print:overflow-visible print:bg-white print:block">
      {/* 1. DESKTOP COMPACT SIDEBAR */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 h-full border-r border-[#E5E7EB] bg-white transition-all duration-300 z-30 select-none print:hidden ${
          isSidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Brand Header */}
        <div
          className={`h-16 shrink-0 flex items-center border-b border-[#E5E7EB] bg-white transition-all relative ${
            isSidebarCollapsed ? "justify-center px-2" : "justify-between px-4"
          }`}
        >
          <Link
            href="/"
            className={`flex items-center gap-3 ${
              isSidebarCollapsed ? "justify-center" : "overflow-hidden"
            }`}
            title="MyBill History"
          >
            <div className="w-10 h-10 rounded-xl bg-[#F47721] flex items-center justify-center text-white font-bold text-lg shadow-saffron shrink-0">
              ₹
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col truncate">
                <span className="text-sm font-bold text-[#202124] tracking-tight leading-none">
                  MyBill History
                </span>
                <span className="text-[10px] text-[#F47721] font-semibold tracking-wider uppercase mt-1">
                  GST Billing & Nama
                </span>
              </div>
            )}
          </Link>

          {/* Floating Collapse / Expand Toggle Button on Sidebar Border */}
          <button
            onClick={toggleSidebarCollapse}
            className={`transition-colors ${
              isSidebarCollapsed
                ? "absolute -right-3 top-5 w-6 h-6 bg-white border border-[#E5E7EB] shadow-xs rounded-full flex items-center justify-center text-[#667085] hover:text-[#F47721] hover:border-[#FED7AA] z-40"
                : "p-1.5 text-[#98A2B3] hover:text-[#202124] hover:bg-[#FFF3E8] rounded-md"
            }`}
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isSidebarCollapsed ? "rotate-180 text-[#F47721]" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>


        {/* Navigation Item Tree */}
        <nav
          aria-label="Sidebar Navigation"
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-1"
        >
          {navigationSections.map((section) => {
            // Direct Link (Dashboard, Settings)
            if (section.href) {
              const isActive = pathname === section.href;
              return (
                <Link
                  key={section.id}
                  href={section.href}
                  className={`flex items-center transition-all ${
                    isSidebarCollapsed
                      ? `w-11 h-11 mx-auto justify-center rounded-xl ${
                          isActive
                            ? "bg-[#FFF3E8] text-[#F47721] font-bold shadow-xs ring-1 ring-[#FED7AA]"
                            : "text-[#667085] hover:text-[#202124] hover:bg-[#F8F9FB]"
                        }`
                      : `gap-3 px-3 py-2.5 rounded-button text-sm font-medium ${
                          isActive
                            ? "bg-[#FFF3E8] text-[#F47721] font-bold border-r-4 border-[#F47721] shadow-xs"
                            : "text-[#667085] hover:text-[#202124] hover:bg-[#F8F9FB]"
                        }`
                  }`}
                  title={lang === "gu" ? section.nameGujarati : section.name}
                >
                  <span className={isActive ? "text-[#F47721]" : "text-[#667085]"}>
                    {section.icon}
                  </span>
                  {!isSidebarCollapsed && (
                    <span className="truncate">
                      {lang === "gu" ? section.nameGujarati : section.name}
                    </span>
                  )}
                </Link>
              );
            }

            // Accordion Section with Submenu
            const isExpanded = expandedSections[section.id];
            const hasActiveChild = section.items?.some((sub) => pathname.startsWith(sub.href));

            if (isSidebarCollapsed) {
              // Collapsed mode: Icon button with hover flyout menu
              return (
                <div key={section.id} className="relative group">
                  <Link
                    href={section.items?.[0]?.href || "#"}
                    className={`w-11 h-11 mx-auto flex items-center justify-center rounded-xl text-sm font-medium transition-all ${
                      hasActiveChild
                        ? "bg-[#FFF3E8] text-[#F47721] font-bold shadow-xs ring-1 ring-[#FED7AA]"
                        : "text-[#667085] hover:text-[#202124] hover:bg-[#F8F9FB]"
                    }`}
                    title={lang === "gu" ? section.nameGujarati : section.name}
                  >
                    <span className={hasActiveChild ? "text-[#F47721]" : "text-[#667085]"}>
                      {section.icon}
                    </span>
                  </Link>

                  {/* Floating Flyout Menu on Hover when Collapsed */}
                  <div className="hidden group-hover:block absolute left-full top-0 ml-2 w-56 bg-white rounded-xl shadow-xl border border-[#E5E7EB] py-2 z-50 animate-fadeIn">
                    <div className="px-3.5 py-1.5 border-b border-[#F3F4F6] mb-1">
                      <p className="text-xs font-bold text-[#202124]">{section.name}</p>
                      {lang === "gu" && (
                        <p className="text-[10px] text-[#F47721] font-gujarati">{section.nameGujarati}</p>
                      )}
                    </div>
                    <div className="space-y-0.5 px-1.5">
                      {section.items?.map((item) => {
                        const isSubActive = pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`block px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              isSubActive
                                ? "bg-[#FFF3E8] text-[#F47721] font-bold"
                                : "text-[#667085] hover:text-[#202124] hover:bg-[#F8F9FB]"
                            }`}
                          >
                            <div className="truncate">{item.name}</div>
                            {lang === "gu" && (
                              <div className="text-[10px] text-[#98A2B3] font-gujarati truncate">
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

            // Expanded mode: Standard accordion
            return (
              <div key={section.id} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-button text-sm font-medium transition-all ${
                    hasActiveChild
                      ? "text-[#F47721] bg-[#FFFAF5] font-semibold"
                      : "text-[#667085] hover:text-[#202124] hover:bg-[#F8F9FB]"
                  }`}
                  title={section.name}
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className={hasActiveChild ? "text-[#F47721]" : "text-[#667085]"}>
                      {section.icon}
                    </span>
                    <span className="truncate">
                      {lang === "gu" ? section.nameGujarati : section.name}
                    </span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-[#98A2B3] transition-transform duration-200 shrink-0 ${
                      isExpanded ? "rotate-90 text-[#F47721]" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Submenu Items */}
                {isExpanded && (
                  <div className="pl-9 pr-1 py-1 space-y-0.5">
                    {section.items?.map((item) => {
                      const isItemActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`block py-1.5 px-2.5 rounded-md text-xs font-medium transition-colors ${
                            isItemActive
                              ? "bg-[#FFF3E8] text-[#F47721] font-bold"
                              : "text-[#667085] hover:text-[#202124] hover:bg-[#F8F9FB]"
                          }`}
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
            );
          })}
        </nav>

        {/* Sidebar Footer: Store & Role */}
        {isSidebarCollapsed ? (
          <div className="shrink-0 p-2 border-t border-[#E5E7EB] bg-[#FFFAF5] flex flex-col items-center gap-1.5">
            <div
              className="w-9 h-9 rounded-full bg-[#FFF3E8] border border-[#FED7AA] flex items-center justify-center text-[#F47721] font-bold text-xs shrink-0 cursor-pointer"
              title={`${user?.fullName || "User"} (${currentCompany?.tradeName || "Main Company"})`}
            >
              {user?.fullName?.charAt(0) || "U"}
            </div>
            <button
              onClick={toggleSidebarCollapse}
              className="p-1.5 text-[#98A2B3] hover:text-[#F47721] hover:bg-[#FFF3E8] rounded-md transition-colors"
              title="Expand sidebar"
            >
              <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="shrink-0 p-3 border-t border-[#E5E7EB] bg-[#FFFAF5] flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <div className="w-8 h-8 rounded-full bg-[#FFF3E8] border border-[#FED7AA] flex items-center justify-center text-[#F47721] font-bold text-xs shrink-0">
                {user?.fullName?.charAt(0) || "U"}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-bold text-[#202124] truncate">
                  {user?.fullName || "Cashier"}
                </span>
                <span className="text-[10px] text-[#667085] truncate">
                  {currentCompany?.tradeName || "Main Company"}
                </span>
              </div>
            </div>
            <button
              onClick={toggleSidebarCollapse}
              className="p-1 text-[#98A2B3] hover:text-[#F47721] hover:bg-[#FFF3E8] rounded-md transition-colors shrink-0"
              title="Collapse sidebar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
        )}
      </aside>

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
                Operating in authorized context of <strong className="text-white underline">{supportSession.companyName || "Client Tenant"}</strong> as Platform SuperAdmin.
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

        {/* TOPBAR HEADER */}
        <header className="shrink-0 h-16 bg-white border-b border-[#E5E7EB] px-3 sm:px-6 flex items-center justify-between z-20 shadow-xs max-w-full min-w-0 print:hidden">
          {/* Left: Active Company/Branch Context & Mobile Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
            {/* Mobile Brand Logo when desktop sidebar is hidden (< lg) */}
            <Link
              href="/"
              className="lg:hidden flex items-center gap-2 shrink-0 group mr-0.5"
              title="MyBill History"
              aria-label="MyBill History"
            >
              <div className="w-8 h-8 rounded-lg bg-[#F47721] flex items-center justify-center text-white font-bold text-base shadow-saffron group-hover:scale-105 transition-transform">
                ₹
              </div>
              <span className="hidden min-[480px]:inline font-bold text-xs sm:text-sm text-[#202124] tracking-tight">
                MyBill History
              </span>
            </Link>

            {/* Active Company & Branch Context Switchers */}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 sm:flex-initial">
              <CompanySwitcher />

              {/* Branch Pill */}
              {branches.length > 1 && (
                <select
                  value={currentBranch?.id || ""}
                  onChange={(e) => switchBranch(e.target.value)}
                  className="text-xs font-medium bg-[#F8F9FB] text-[#667085] border border-[#E5E7EB] rounded-md px-2 py-1 focus:outline-none cursor-pointer hidden md:block max-w-[120px] truncate"
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
              <span className="text-[11px] font-mono font-medium text-[#667085] bg-[#F3F4F6] px-2 py-0.5 rounded border border-[#E5E7EB] hidden lg:inline whitespace-nowrap">
                {currentFY?.name || "FY 2026-27"}
              </span>
            </div>
          </div>

          {/* Right: Quick Action, Language Toggle & User/Logout */}
          <div className="flex items-center gap-1 min-[360px]:gap-1.5 sm:gap-3 shrink-0 ml-auto pl-1 sm:pl-2">
            {/* SuperAdmin Portal shortcut if user has SUPER_ADMIN role */}
            {user?.role === "SUPER_ADMIN" && (
              <Link
                href="/superadmin"
                className="hidden min-[420px]:flex items-center gap-1 sm:gap-1.5 py-1 sm:py-1.5 px-2 sm:px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-button text-[11px] sm:text-xs font-bold transition-all shrink-0 shadow-xs"
                title="Open SuperAdmin Master Control Portal"
                aria-label="SuperAdmin Portal"
              >
                <svg className="w-3.5 h-3.5 shrink-0 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="hidden sm:inline">SuperAdmin Portal</span>
              </Link>
            )}

            {/* Primary Action Button: Create Bill */}
            <Link
              href="/sales/invoices/new"
              className="flex items-center gap-1 sm:gap-1.5 py-1.5 px-2 min-[360px]:px-2.5 sm:px-3.5 bg-[#F47721] hover:bg-[#D95F12] text-white rounded-button text-xs sm:text-sm font-semibold shadow-saffron transition-all shrink-0 whitespace-nowrap active:scale-95"
              title={lang === "gu" ? "નવું વેચાણ બિલ (F2)" : "Create New Bill (F2)"}
              aria-label={lang === "gu" ? "નવું બિલ બનાવો (Create New Bill)" : "Create New Bill"}
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
              </svg>
              {/* Short label on mobile screens, full label on tablets and desktop */}
              <span className="hidden sm:inline">
                {lang === "gu" ? "નવું બિલ બનાવો" : "Create New Bill"}
              </span>
              <span className="inline sm:hidden font-bold">
                {lang === "gu" ? "બિલ" : "Bill"}
              </span>
            </Link>

            {/* Bilingual Language Switcher (EN | ગુજ) */}
            <div className="flex items-center bg-[#F3F4F6] p-0.5 rounded-lg border border-[#E5E7EB] shrink-0">
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] min-[360px]:text-[11px] sm:text-xs font-bold rounded-md transition-all ${
                  lang === "en"
                    ? "bg-white text-[#F47721] shadow-xs"
                    : "text-[#667085] hover:text-[#202124]"
                }`}
                aria-label="Switch language to English"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang("gu")}
                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] min-[360px]:text-[11px] sm:text-xs font-bold rounded-md transition-all font-gujarati ${
                  lang === "gu"
                    ? "bg-white text-[#F47721] shadow-xs"
                    : "text-[#667085] hover:text-[#202124]"
                }`}
                aria-label="Switch language to Gujarati"
              >
                <span className="hidden sm:inline">ગુજરાતી</span>
                <span className="sm:hidden">ગુજ</span>
              </button>
            </div>

            {/* Logout / User Trigger: Hidden on mobile (< md), visible on desktop (>= md) */}
            <button
              onClick={logout}
              className="hidden md:inline-flex items-center justify-center p-1 sm:p-1.5 text-[#667085] hover:text-[#DC3545] hover:bg-rose-50 rounded-lg transition-colors shrink-0"
              title={lang === "gu" ? "લોગઆઉટ" : "Logout"}
              aria-label="Logout"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </header>

        {/* 3. SCROLLABLE PAGE BODY */}
        <main
          id="main-content"
          tabIndex={-1}
          className={`flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden relative z-10 ${
            pathname === "/" ? "p-3 sm:p-5 lg:p-6" : "p-3 sm:p-6 lg:p-8"
          } pb-24 lg:pb-8 overscroll-y-contain focus:outline-none print:p-0 print:m-0 print:overflow-visible print:h-auto print:w-full print:block`}
        >
          <div className={`${pathname === "/" ? "w-full min-w-0" : "max-w-7xl w-full min-w-0 mx-auto"} print:max-w-none print:w-full print:p-0 print:m-0`}>
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
          <div className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {/* Mobile Header with visible close button */}
            <div className="h-16 shrink-0 flex items-center justify-between px-4 border-b border-[#E5E7EB] bg-[#FFFAF5]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#F47721] flex items-center justify-center text-white font-bold text-base shadow-saffron">
                  ₹
                </div>
                <div>
                  <span className="font-bold text-sm text-[#202124] block">MyBill History</span>
                  <span className="text-[10px] text-[#F47721] font-semibold">{currentCompany?.tradeName || "Billing & Retail"}</span>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-[#667085] hover:text-[#202124] hover:bg-[#F3F4F6] rounded-md transition-colors"
                aria-label="Close navigation drawer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-button text-sm font-medium transition-colors ${
                        pathname === sec.href
                          ? "bg-[#FFF3E8] text-[#F47721] font-bold"
                          : "text-[#667085] hover:bg-[#F8F9FB]"
                      }`}
                    >
                      {sec.icon}
                      <span>{lang === "gu" ? sec.nameGujarati : sec.name}</span>
                    </Link>
                  ) : (
                    <div>
                      <div className="px-3 pt-3 pb-1 text-[11px] font-bold text-[#98A2B3] uppercase tracking-wider">
                        {lang === "gu" ? sec.nameGujarati : sec.name}
                      </div>
                      <div className="pl-4 space-y-1">
                        {sec.items?.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-button text-sm transition-colors ${
                              pathname === item.href
                                ? "bg-[#FFF3E8] text-[#F47721] font-bold"
                                : "text-[#667085] hover:bg-[#F8F9FB]"
                            }`}
                          >
                            <span>{lang === "gu" ? item.nameGujarati : item.name}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {/* Mobile Drawer Footer: Branch switch & user profile & logout */}
            <div className="p-3 border-t border-[#E5E7EB] bg-[#FFFAF5] space-y-2 shrink-0">
              {branches.length > 1 && (
                <div>
                  <label className="block text-[10px] font-bold text-[#667085] uppercase tracking-wider mb-1">
                    {lang === "gu" ? "શાખા" : "Current Branch"}
                  </label>
                  <select
                    value={currentBranch?.id || ""}
                    onChange={(e) => switchBranch(e.target.value)}
                    className="w-full text-xs font-medium bg-white text-[#202124] border border-[#E5E7EB] rounded-md px-2 py-1.5 focus:outline-none"
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

              {user?.role === "SUPER_ADMIN" && (
                <Link
                  href="/superadmin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between w-full px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-md text-xs font-bold transition-all"
                >
                  <span className="flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>SuperAdmin Portal</span>
                  </span>
                  <span>→</span>
                </Link>
              )}

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 truncate">
                  <div className="w-8 h-8 rounded-full bg-[#FFF3E8] border border-[#FED7AA] flex items-center justify-center text-[#F47721] font-bold text-xs shrink-0">
                    {user?.fullName?.charAt(0) || "U"}
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="text-xs font-bold text-[#202124] truncate">
                      {user?.fullName || "User"}
                    </span>
                    <span className="text-[10px] text-[#667085] truncate">
                      {currentFY?.name || "FY 2026-27"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#DC3545] hover:bg-rose-50 rounded-md transition-colors"
                  title={lang === "gu" ? "લોગઆઉટ" : "Logout"}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>{lang === "gu" ? "લોગઆઉટ" : "Logout"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. MOBILE BOTTOM NAVIGATION BAR */}
      <nav
        aria-label="Mobile Navigation Bar"
        className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-[#E5E7EB] z-40 px-2 py-1.5 flex items-center justify-around shadow-lg no-print print:hidden print-hide"
        data-print-hide="true"
      >
        <Link
          href="/"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-bold transition-colors ${
            pathname === "/" ? "text-[#F47721]" : "text-[#667085] hover:text-[#202124]"
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>{lang === "gu" ? "ડેશબોર્ડ" : "Dashboard"}</span>
        </Link>

        <Link
          href="/sales/invoices"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-bold transition-colors ${
            pathname.startsWith("/sales/invoices") ? "text-[#F47721]" : "text-[#667085] hover:text-[#202124]"
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>{lang === "gu" ? "વેચાણ" : "Sales"}</span>
        </Link>

        <Link
          href="/sales/pos"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-bold transition-colors ${
            pathname === "/sales/pos" ? "text-[#F47721]" : "text-[#667085] hover:text-[#202124]"
          }`}
        >
          <div className="w-8 h-8 -mt-3 rounded-full bg-[#F47721] text-white flex items-center justify-center shadow-saffron">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span>{lang === "gu" ? "ઝડપી POS" : "POS"}</span>
        </Link>

        <Link
          href="/purchases"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-bold transition-colors ${
            pathname.startsWith("/purchases") ? "text-[#F47721]" : "text-[#667085] hover:text-[#202124]"
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <span>{lang === "gu" ? "ખરીદી" : "Purchase"}</span>
        </Link>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-bold text-[#667085] hover:text-[#202124] transition-colors"
          aria-label="Open full navigation menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <span>{lang === "gu" ? "મેનૂ" : "Menu"}</span>
        </button>
      </nav>
    </div>
  );
}
