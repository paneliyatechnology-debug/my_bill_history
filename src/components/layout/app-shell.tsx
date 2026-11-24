"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../context/auth-context";
import { apiClient } from "../../lib/api-client";
import { resolveActiveNavigation } from "../../lib/sidebar-navigation";
import { CompanySwitcher } from "../tenants/company-switcher";
import { FinancialYearSwitcher } from "../tenants/financial-year-switcher";
import { UserProfileDropdown } from "./user-profile-dropdown";
import { WaveBackground } from "../ui/wave-background";
import { BrandLogo } from "../ui/brand-logo";
import { SettingsSidebar } from "../settings/settings-sidebar";
import { WorkspaceErrorState } from "../ui/workspace-error-state";
import { NotificationCenter } from "../notifications/notification-center";
import { GlobalSearch } from "./global-search";
import { CustomSelect } from "@/components/ui/dropdown-system";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  ShoppingBag,
  Receipt,
  BarChart3,
  FileText,
  Landmark,
  FileSpreadsheet,
  Repeat,
  Calculator,
  Settings,
  UploadCloud,
  BellRing,
  CalendarCheck,
  UserCheck,
  Globe,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
  ShieldAlert,
  Sparkles,
  History,
} from "lucide-react";
const SIDEBAR_BG = "#FFFFFF";
const ACTIVE_MENU_BG = "#1677E8";
const TEXT_COLOR = "#FFFFFF";
const CTA_ACCENT = "#1677E8";
import Image from "next/image";

interface SubNavItem {
  name: string;
  nameGujarati: string;
  href: string;
  module?: string;
  action?: string;
  planKey?: string;
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
  module?: string;
  action?: string;
  planKey?: string;
}

// Exact MyBillBook Hierarchical Menu Structure with Standardized Lucide Icon System
const navigationSections: NavSection[] = [
  // --- MAIN NAVIGATION ---
  {
    id: "dashboard",
    name: "Dashboard",
    nameGujarati: "મુખ્ય ડેશબોર્ડ",
    group: "",
    href: "/",
    module: "dashboard",
    action: "view",
    icon: <LayoutDashboard className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
  },
  {
    id: "parties",
    name: "Parties",
    nameGujarati: "પાર્ટીઝ (ગ્રાહકો / વેપારીઓ)",
    group: "",
    href: "/masters/parties",
    module: "parties",
    action: "view",
    icon: <Users className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
  },
  {
    id: "items",
    name: "Items / Inventory",
    nameGujarati: "માલસામાન (Items)",
    group: "",
    module: "items",
    action: "view",
    icon: <Package className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
    items: [
      {
        name: "Inventory",
        nameGujarati: "સ્ટોક / વસ્તુઓની યાદી",
        href: "/masters/items",
        module: "items",
        action: "view",
      },
      {
        name: "Godown (Warehouse)",
        nameGujarati: "ગોડાઉન / વેરહાઉસ",
        href: "/masters/warehouses",
        module: "items",
        action: "stock_transfer",
        planKey: "stockTransfers",
      },
      {
        name: "Categories",
        nameGujarati: "કેટેગરીઝ",
        href: "/masters/categories",
        module: "items",
        action: "view",
        planKey: "categoriesUnits",
      },
      {
        name: "Units (UOM)",
        nameGujarati: "એકમો (UOM)",
        href: "/masters/units",
        module: "items",
        action: "view",
        planKey: "categoriesUnits",
      },
      {
        name: "HSN / SAC Codes",
        nameGujarati: "HSN કોડ્સ",
        href: "/masters/hsn",
        module: "items",
        action: "view",
        planKey: "hsnSac",
      },
    ],
  },
  {
    id: "sales",
    name: "Sales",
    nameGujarati: "વેચાણ (Sales)",
    group: "",
    module: "sales_invoices",
    action: "view",
    icon: <ShoppingCart className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
    items: [
      {
        name: "Sales Invoices",
        nameGujarati: "વેચાણ બિલ (Invoices)",
        href: "/sales/invoices",
        module: "sales_invoices",
        action: "view",
        planKey: "salesInvoices",
      },
      {
        name: "E-Invoices",
        nameGujarati: "ઈ-ઇનવોઇસ (E-Invoices)",
        href: "/sales/e-invoices",
        module: "sales_invoices",
        action: "view",
        planKey: "eInvoiceEwaybill",
      },
      {
        name: "Quotation / Estimate",
        nameGujarati: "કાચું બિલ / એસ્ટીમેટ",
        href: "/sales/quotations",
        module: "quotations",
        action: "view",
        planKey: "quotations",
      },
      {
        name: "Payment In",
        nameGujarati: "આવક ચૂકવણી (Payment In)",
        href: "/sales/payment-in",
        module: "sales_invoices",
        action: "view",
        planKey: "paymentIn",
      },
      {
        name: "Sales Return",
        nameGujarati: "વેચાણ પરત (Sales Return)",
        href: "/sales/returns",
        module: "sales_returns",
        action: "view",
        planKey: "salesReturns",
      },
      {
        name: "Credit Note",
        nameGujarati: "ક્રેડિટ નોટ",
        href: "/sales/credit-note",
        module: "sales_returns",
        action: "view",
        planKey: "creditDebitNotes",
      },
      {
        name: "Debit Note",
        nameGujarati: "ડેબિટ નોટ",
        href: "/sales/debit-note",
        module: "sales_returns",
        action: "view",
        planKey: "creditDebitNotes",
      },
      {
        name: "Delivery Challan",
        nameGujarati: "ડિલિવરી ચલણ",
        href: "/sales/delivery-challan",
        module: "delivery_challans",
        action: "view",
        planKey: "deliveryChallan",
      },
      {
        name: "Proforma Invoice",
        nameGujarati: "પ્રોફોર્મા ઇન્વોઇસ",
        href: "/sales/proforma",
        module: "proforma_invoices",
        action: "view",
        planKey: "proformaInvoice",
      },
    ],
  },
  {
    id: "purchases",
    name: "Purchases",
    nameGujarati: "ખરીદી (Purchases)",
    group: "",
    module: "purchases",
    action: "view",
    icon: <ShoppingBag className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
    items: [
      {
        name: "Purchase Invoices",
        nameGujarati: "ખરીદી બિલ & સ્કેનર",
        href: "/purchases",
        module: "purchases",
        action: "view",
        planKey: "purchaseInvoices",
      },
      {
        name: "Payment Out",
        nameGujarati: "જાવક ચૂકવણી (Payment Out)",
        href: "/purchases/payment-out",
        module: "purchases",
        action: "view",
        planKey: "paymentOut",
      },
      {
        name: "Purchase Return",
        nameGujarati: "ખરીદી પરત",
        href: "/purchases/returns",
        module: "purchases",
        action: "view",
        planKey: "purchaseReturns",
      },
      {
        name: "Debit Memo",
        nameGujarati: "ડેબિટ મેમો",
        href: "/purchases/debit-memo",
        module: "purchases",
        action: "view",
        planKey: "creditDebitNotes",
      },
      {
        name: "Purchase Orders",
        nameGujarati: "ખરીદી ઓર્ડર",
        href: "/purchases/orders",
        module: "purchases",
        action: "view",
        planKey: "purchaseOrders",
      },
    ],
  },
  {
    id: "expenses",
    name: "Expenses",
    nameGujarati: "દૈનિક ખર્ચા (Expenses)",
    group: "",
    href: "/finance/expenses",
    module: "expenses",
    action: "view",
    planKey: "expenses",
    icon: <Receipt className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
  },
  {
    id: "reports",
    name: "Reports",
    nameGujarati: "રિપોર્ટ્સ (Reports)",
    group: "",
    href: "/reports",
    module: "reports",
    action: "view",
    planKey: "gstReports",
    icon: <BarChart3 className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
  },

  // --- ACCOUNTING ---
  {
    id: "vouchers",
    name: "Vouchers",
    nameGujarati: "વાઉચર્સ (Vouchers)",
    group: "ACCOUNTING",
    module: "accounting",
    action: "view",
    planKey: "doubleEntryLedgers",
    icon: <FileText className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
    items: [
      {
        name: "Voucher List",
        nameGujarati: "વાઉચર લિસ્ટ (All Vouchers)",
        href: "/accounting/vouchers",
        module: "accounting",
        action: "view",
        planKey: "doubleEntryLedgers",
      },
      {
        name: "Create Voucher",
        nameGujarati: "નવું વાઉચર (Create Voucher)",
        href: "/accounting/vouchers/new",
        module: "accounting",
        action: "create",
        planKey: "doubleEntryLedgers",
      },
      {
        name: "All Transactions",
        nameGujarati: "બધા વ્યવહારો (All Transactions)",
        href: "/vouchers/all_transactions",
        module: "accounting",
        action: "view",
        planKey: "doubleEntryLedgers",
      },
      {
        name: "Account Ledgers",
        nameGujarati: "ખાતાવહી (Ledgers)",
        href: "/accounting/ledgers",
        module: "accounting",
        action: "view_ledger",
        planKey: "doubleEntryLedgers",
      },
      {
        name: "Chart of Accounts",
        nameGujarati: "ખાતાની યાદી (Chart of Accounts)",
        href: "/accounting/chart-of-accounts",
        module: "accounting",
        action: "view",
        planKey: "doubleEntryLedgers",
      },
    ],
  },
  {
    id: "cash_bank",
    name: "Cash & Bank",
    nameGujarati: "રોકડ અને બેંક",
    group: "ACCOUNTING",
    href: "/finance/cash-bank",
    module: "cash_bank",
    action: "view",
    planKey: "cashBank",
    icon: <Landmark className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
  },
  {
    id: "gst_returns",
    name: "GST & Tax Filing",
    nameGujarati: "જીએસટી અને રિટર્ન (GST & Returns)",
    group: "ACCOUNTING",
    href: "/gst",
    module: "gst_tax",
    action: "view",
    planKey: "gstrReconciliation",
    icon: <FileSpreadsheet className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
  },
  {
    id: "automated_bills",
    name: "Automated Bills",
    nameGujarati: "ઓટોમેટેડ બિલ્સ",
    group: "ACCOUNTING",
    href: "/sales/automated-billing",
    module: "sales_invoices",
    action: "view",
    planKey: "automatedBills",
    icon: <Repeat className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
  },
  {
    id: "pos",
    name: "POS Billing",
    nameGujarati: "ઝડપી કાઉન્ટર POS",
    group: "ACCOUNTING",
    href: "/sales/pos",
    module: "sales_invoices",
    action: "view",
    planKey: "posBilling",
    icon: <Calculator className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
  },
  {
    id: "pos_orders",
    name: "POS Orders",
    nameGujarati: "પીઓએસ ઓર્ડર્સ",
    group: "ACCOUNTING",
    href: "/sales/pos/orders",
    module: "sales_invoices",
    action: "view",
    planKey: "posOrders",
    icon: <Receipt className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
  },
  {
    id: "settings",
    name: "Settings",
    nameGujarati: "સેટિંગ્સ",
    group: "ACCOUNTING",
    href: "/settings",
    module: "settings",
    action: "view",
    icon: <Settings className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
    items: [
      {
        name: "Company Settings",
        nameGujarati: "કંપની સેટિંગ્સ",
        href: "/settings/company",
        module: "settings",
        action: "view",
      },
      {
        name: "Invoice Settings",
        nameGujarati: "ઇન્વોઇસ સેટિંગ્સ",
        href: "/settings/invoice",
        module: "settings",
        action: "view",
      },
      {
        name: "E-Invoice Settings",
        nameGujarati: "ઈ-ઇનવોઇસ સેટિંગ્સ",
        href: "/settings/e-invoice",
        module: "settings",
        action: "view",
        planKey: "eInvoiceEwaybill",
      },
      {
        name: "User Management",
        nameGujarati: "કર્મચારી વ્યવસ્થાપન",
        href: "/settings/user-management",
        module: "settings",
        action: "view",
        planKey: "userManagementRbac",
      },
      {
        name: "Role & Permissions",
        nameGujarati: "રોલ અને પરવાનગીઓ",
        href: "/settings/roles",
        module: "settings",
        action: "view",
        planKey: "userManagementRbac",
      },
      {
        name: "Activity Logs",
        nameGujarati: "પ્રવૃત્તિ લૉગ્સ",
        href: "/settings/activity-logs",
        module: "settings",
        action: "view",
      },
      {
        name: "Branch Management",
        nameGujarati: "બ્રાન્ચ મેનેજમેન્ટ",
        href: "/settings/company",
        module: "settings",
        action: "view",
      },
      {
        name: "Financial Year",
        nameGujarati: "નાણાકીય વર્ષ",
        href: "/settings/financial-year",
        module: "settings",
        action: "view",
      },
    ],
  },

  // --- GROUP 3: BUSINESS TOOLS ---
  {
    id: "data_import",
    name: "Data Import (Excel / CSV)",
    nameGujarati: "ડેટા આયાત (Excel / CSV)",
    group: "BUSINESS TOOLS",
    badge: "",
    href: "/app/data-import",
    module: "settings",
    action: "view",
    planKey: "dataImport",
    icon: <UploadCloud className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
  },
  {
    id: "ai_collections",
    name: "Payment Reminders",
    nameGujarati: "ઓટો ઉઘરાણી (Follow-ups)",
    group: "BUSINESS TOOLS",
    badge: "",
    href: "/finance/ai-collections",
    module: "parties",
    action: "view",
    planKey: "whatsAppReminders",
    icon: <BellRing className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
  },
  {
    id: "payroll",
    name: "Staff Attendance & Payroll",
    nameGujarati: "સ્ટાફ હાજરી અને પગાર",
    group: "BUSINESS TOOLS",
    href: "/app/sam",
    module: "settings",
    action: "view",
    planKey: "payrollStaff",
    icon: <CalendarCheck className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
  },
  {
    id: "users",
    name: "Manage Users",
    nameGujarati: "વપરાશકર્તા સંચાલન",
    group: "BUSINESS TOOLS",
    href: "/settings/user-management",
    module: "settings",
    action: "edit_users",
    planKey: "userManagementRbac",
    icon: <UserCheck className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
  },
  {
    id: "activity_logs",
    name: "Activity Logs",
    nameGujarati: "પ્રવૃત્તિ લૉગ્સ (Audit Trail)",
    group: "BUSINESS TOOLS",
    href: "/activity-logs",
    module: "activity_logs",
    action: "view",
    icon: <History className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />,
  },
];

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
    entitlements,
    switchCompany,
    switchBranch,
    switchFinancialYear,
    logout,
    canAccessModule,
    hasPermission,
    isModuleEntitled,
  } = useAuth();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const isDashboard =
        window.location.pathname === "/" ||
        window.location.pathname === "/dashboard";
      return !isDashboard;
    }
    return false;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
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

  // Load persisted sidebar state from localStorage (only for dashboard; other pages auto-collapse)
  useEffect(() => {
    try {
      const isDashboard =
        pathname === "/" || pathname === "/dashboard";
      if (!isDashboard) {
        setIsSidebarCollapsed(true);
      } else {
        const savedCollapsed = localStorage.getItem("sidebar_collapsed");
        if (savedCollapsed !== null) {
          setIsSidebarCollapsed(savedCollapsed === "true");
        }
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
  }, [pathname]);

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

  // Close mobile drawer on route change, reset main scroll, and auto-collapse sidebar on non-dashboard pages
  useEffect(() => {
    setIsMobileMenuOpen(false);
    const mainEl = document.getElementById("main-content");
    if (mainEl) {
      mainEl.scrollTop = 0;
    }

    const isDashboard = pathname === "/" || pathname === "/dashboard";
    setIsSidebarCollapsed(!isDashboard);
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

  const visibleNavigationSections = useMemo(() => {
    return navigationSections
      .map((section) => {
        // Direct plan key check on top-level section if set
        if (section.planKey && !isModuleEntitled(section.planKey)) {
          return null;
        }

        // If this section has sub-menus (Sales, Purchases, Accounting, Items, Parties, Settings)
        if (section.items && section.items.length > 0) {
          const allowedItems = section.items.filter((item) => {
            const itemPlanKey = item.planKey || item.module || item.href;
            if (itemPlanKey && !isModuleEntitled(itemPlanKey)) {
              return false;
            }
            const itemMod = item.module || section.module || section.id;
            const itemAct = item.action || "view";
            return hasPermission(itemMod, itemAct);
          });

          // If no sub-items are allowed for this user, hide the entire section!
          if (allowedItems.length === 0) {
            return null;
          }

          return {
            ...section,
            items: allowedItems,
          };
        }

        // Direct top-level navigation item
        if (section.id === "activity_logs") {
          return section;
        }

        const secPlanKey = section.planKey || section.id || section.module || section.href || "";
        if (secPlanKey && !isModuleEntitled(secPlanKey)) {
          return null;
        }

        const secMod = section.module || section.id;
        const secAct = section.action || "view";
        if (hasPermission(secMod, secAct)) {
          return section;
        }

        return null;
      })
      .filter(Boolean) as NavSection[];
  }, [hasPermission, canAccessModule, isModuleEntitled, user]);

  // Route permission protection for authenticated staff
  const routePermissionDenied = useMemo(() => {
    if (!isAuthenticated || !user) return false;
    const r = (user.role || "").toUpperCase();
    if (
      r === "SUPER_ADMIN" ||
      r === "ORG_ADMIN" ||
      r === "COMPANY_ADMIN" ||
      r === "PARTNER" ||
      r === "ADMIN"
    ) {
      return false;
    }

    if (
      pathname === "/activity-logs" ||
      pathname.startsWith("/activity-logs/")
    ) {
      return false;
    }

    const ROUTE_RULES: Array<{ prefix: string; module: string; action?: string }> = [
      { prefix: "/sales/quotations", module: "quotations", action: "view" },
      { prefix: "/sales/proforma", module: "proforma_invoices", action: "view" },
      { prefix: "/sales/delivery-challan", module: "delivery_challans", action: "view" },
      { prefix: "/sales/returns", module: "sales_returns", action: "view" },
      { prefix: "/sales/credit-note", module: "sales_returns", action: "view" },
      { prefix: "/sales/debit-note", module: "sales_returns", action: "view" },
      { prefix: "/sales/invoices", module: "sales_invoices", action: "view" },
      { prefix: "/sales/e-invoices", module: "sales_invoices", action: "view" },
      { prefix: "/sales/payment-in", module: "sales_invoices", action: "view" },
      { prefix: "/purchases", module: "purchases", action: "view" },
      { prefix: "/finance/expenses", module: "expenses", action: "view" },
      { prefix: "/accounting/vouchers/new", module: "accounting", action: "create" },
      { prefix: "/accounting/vouchers", module: "accounting", action: "view" },
      { prefix: "/accounting/ledgers", module: "accounting", action: "view_ledger" },
      { prefix: "/accounting/chart-of-accounts", module: "accounting", action: "view" },
      { prefix: "/finance/cash-bank", module: "cash_bank", action: "view" },
      { prefix: "/gst", module: "gst_tax", action: "view" },
      { prefix: "/reports", module: "reports", action: "view" },
      { prefix: "/settings/user-management", module: "settings", action: "edit_users" },
      { prefix: "/settings", module: "settings", action: "view" },
      { prefix: "/masters/items", module: "items", action: "view" },
      { prefix: "/masters/parties", module: "parties", action: "view" },
    ];

    for (const rule of ROUTE_RULES) {
      if (pathname === rule.prefix || pathname.startsWith(rule.prefix + "/")) {
        return !hasPermission(rule.module, rule.action || "view");
      }
    }
    return false;
  }, [pathname, isAuthenticated, user, hasPermission]);

  // Route plan restriction guard (applies to all company admins/staff when bypass is off)
  const planRestrictionDenied = useMemo(() => {
    if (!isAuthenticated || !user) return null;
    if (user.role === "SUPER_ADMIN") return null;
    if (entitlements?.bypassPlanRestrictions) return null;

    const ROUTE_PLAN_RESTRICTIONS: Array<{
      prefix: string;
      planKey: string;
      title: string;
      titleGujarati: string;
      minTier: string;
    }> = [
      {
        prefix: "/sales/quotations",
        planKey: "quotations",
        title: "Quotation & Estimates",
        titleGujarati: "કાચું બિલ અને એસ્ટીમેટ",
        minTier: "Wholesale Pro",
      },
      {
        prefix: "/sales/proforma",
        planKey: "proformaInvoice",
        title: "Proforma Invoices",
        titleGujarati: "પ્રોફોર્મા ઇન્વોઇસ",
        minTier: "Wholesale Pro",
      },
      {
        prefix: "/sales/delivery-challan",
        planKey: "deliveryChallan",
        title: "Delivery Challans",
        titleGujarati: "ડિલિવરી ચલણ",
        minTier: "Wholesale Pro",
      },
      {
        prefix: "/sales/e-invoices",
        planKey: "eInvoiceEwaybill",
        title: "E-Invoices & E-Way Bills",
        titleGujarati: "ઈ-ઇનવોઇસ અને ઈ-વે બિલ",
        minTier: "Distribution Enterprise",
      },
      {
        prefix: "/sales/credit-note",
        planKey: "creditDebitNotes",
        title: "Credit Notes",
        titleGujarati: "ક્રેડિટ નોટ",
        minTier: "Wholesale Pro",
      },
      {
        prefix: "/sales/debit-note",
        planKey: "creditDebitNotes",
        title: "Debit Notes",
        titleGujarati: "ડેબિટ નોટ",
        minTier: "Wholesale Pro",
      },
      {
        prefix: "/sales/automated-billing",
        planKey: "automatedBills",
        title: "Automated Recurring Billing",
        titleGujarati: "ઓટોમેટેડ બિલિંગ",
        minTier: "Wholesale Pro",
      },
      {
        prefix: "/sales/pos/orders",
        planKey: "posOrders",
        title: "POS Counter Orders",
        titleGujarati: "પીઓએસ કાઉન્ટર ઓર્ડર્સ",
        minTier: "Retail Basic / Wholesale Pro",
      },
      {
        prefix: "/masters/warehouses",
        planKey: "stockTransfers",
        title: "Multi-Godown Warehouses",
        titleGujarati: "ગોડાઉન અને વેરહાઉસ મેનેજમેન્ટ",
        minTier: "Wholesale Pro",
      },
      {
        prefix: "/purchases/orders",
        planKey: "purchaseOrders",
        title: "Purchase Orders",
        titleGujarati: "ખરીદી ઓર્ડર",
        minTier: "Wholesale Pro",
      },
      {
        prefix: "/purchases/debit-memo",
        planKey: "creditDebitNotes",
        title: "Debit Memos",
        titleGujarati: "ડેબિટ મેમો",
        minTier: "Wholesale Pro",
      },
      {
        prefix: "/accounting",
        planKey: "doubleEntryLedgers",
        title: "Double-Entry Accounting & Vouchers",
        titleGujarati: "ડબલ-એન્ટ્રી ખાતાવહી અને વાઉચર્સ",
        minTier: "Wholesale Pro",
      },
      {
        prefix: "/vouchers",
        planKey: "doubleEntryLedgers",
        title: "Double-Entry Accounting & Vouchers",
        titleGujarati: "ડબલ-એન્ટ્રી ખાતાવહી અને વાઉચર્સ",
        minTier: "Wholesale Pro",
      },
      {
        prefix: "/finance/ai-collections",
        planKey: "whatsAppReminders",
        title: "WhatsApp Payment Reminders",
        titleGujarati: "WhatsApp ઓટો ઉઘરાણી",
        minTier: "Wholesale Pro",
      },
      {
        prefix: "/app/sam",
        planKey: "payrollStaff",
        title: "Staff Attendance & Payroll",
        titleGujarati: "સ્ટાફ હાજરી અને પગાર",
        minTier: "Wholesale Pro",
      },
      {
        prefix: "/settings/user-management",
        planKey: "userManagementRbac",
        title: "Staff Roles & User Management",
        titleGujarati: "સ્ટાફ રોલ્સ અને વપરાશકર્તા સંચાલન",
        minTier: "Wholesale Pro",
      },
      {
        prefix: "/settings/roles",
        planKey: "userManagementRbac",
        title: "Role & Permission Configuration",
        titleGujarati: "રોલ અને પરવાનગી રૂપરેખાંકન",
        minTier: "Wholesale Pro",
      },
    ];

    for (const rule of ROUTE_PLAN_RESTRICTIONS) {
      if (pathname === rule.prefix || pathname.startsWith(rule.prefix + "/")) {
        if (!isModuleEntitled(rule.planKey)) {
          return rule;
        }
      }
    }
    return null;
  }, [pathname, isAuthenticated, user, entitlements, isModuleEntitled]);

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
        {/* Brand Logo in Loading Screen */}
        <div className="flex justify-center mb-4">
          <Image
            src="/logo-full.png"
            alt="myownbillbook"
            width={200}
            height={46}
            className="h-10 w-auto object-contain animate-pulse"
            priority
          />
        </div>
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

  const isSettingsPage =
    pathname.startsWith("/settings") ||
    pathname.startsWith("/app/settings") ||
    pathname.startsWith("/pricing-settings");

  const isPurchaseBillPage =
    pathname === "/purchases/new" ||
    pathname === "/purchases/create" ||
    pathname === "/purchases/invoices/new" ||
    pathname.startsWith("/purchases/new/") ||
    pathname.startsWith("/purchases/create/") ||
    pathname.startsWith("/purchases/invoices/new/");

  const isStudioPage =
    isPurchaseBillPage ||
    pathname.includes("/new") ||
    pathname.includes("/create") ||
    pathname.includes("/edit");

  return (
    <div
      style={{
        ["--sidebar-width" as any]: isSidebarCollapsed ? "72px" : "240px",
      }}
      className="h-[100dvh] h-screen w-full flex overflow-hidden bg-[#F5F8FC] print:h-auto print:min-h-0 print:overflow-visible print:bg-white print:block"
    >
      {/* 1. DEDICATED MYBILLBOOK SETTINGS SIDEBAR (When in Settings mode and permission granted) */}
      {isSettingsPage && !routePermissionDenied && (
        <div className="hidden lg:flex shrink-0 h-full print:hidden">
          <SettingsSidebar />
        </div>
      )}

      {/* 2. REGULAR DESKTOP MYBILLBOOK SIDEBAR (When in dashboard mode and not in full-screen purchase bill mode, or when settings permission denied) */}
      {(!isSettingsPage || routePermissionDenied) && !isPurchaseBillPage && (
        <aside
          className={`hidden lg:flex flex-col shrink-0 h-full border-r border-slate-200/90 bg-white text-slate-800 transition-all duration-300 z-30 select-none print:hidden ${
            isSidebarCollapsed ? "w-[72px]" : "w-[240px]"
          }`}
        >
          {/* Top Brand Logo matching Reference Image */}
          <div className="shrink-0 h-[60px] flex items-center justify-between px-3.5 border-b border-slate-200/80 bg-white">
            <Link href="/" className="flex items-center gap-2 overflow-hidden group">
              {isSidebarCollapsed ? (
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  <Image
                    src="/logo-icon.png"
                    alt="myownbillbook"
                    width={32}
                    height={32}
                    className="object-contain"
                    priority
                  />
                </div>
              ) : (
                <div className="h-8 flex items-center">
                  <Image
                    src="/logo-full.png"
                    alt="myownbillbook"
                    width={160}
                    height={36}
                    className="h-7.5 w-auto object-contain"
                    priority
                  />
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
              return visibleNavigationSections.map((section) => {
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
                        <div className="px-3.5 pt-3.5 pb-1 text-[11px] font-medium tracking-wider text-slate-400 uppercase">
                          {section.group}
                        </div>
                      )}
                      <Link
                        href={section.href}
                        className={`flex items-center transition-all ${isSidebarCollapsed
                            ? `w-11 h-11 mx-auto justify-center rounded-xl ${isActive
                              ? "text-[#2563EB] typo-nav-active bg-[#EFF6FF] shadow-2xs"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 typo-nav"
                            }`
                            : `gap-3 px-3.5 py-2 rounded-xl ${isActive
                              ? "text-[#2563EB] typo-nav-active bg-[#EFF6FF] shadow-2xs"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 typo-nav"
                            }`
                          }`}
                        title={
                          lang === "gu" ? section.nameGujarati : section.name
                        }
                      >
                        <span
                          className={isActive ? "text-[#2563EB]" : "text-slate-500"}
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
                            ? "text-[#2563EB] font-bold bg-[#EFF6FF] shadow-2xs"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                          }`}
                        title={
                          lang === "gu" ? section.nameGujarati : section.name
                        }
                      >
                        <span
                          className={
                            hasActiveChild ? "text-[#2563EB]" : "text-slate-500"
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
                        className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl transition-all ${hasActiveChild
                            ? "text-[#2563EB] typo-nav-active bg-[#EFF6FF]/70"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 typo-nav"
                          }`}
                        title={section.name}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <span
                            className={
                              hasActiveChild ? "text-[#2563EB]" : "text-slate-500"
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
                                className={`group relative flex items-center justify-between py-1.5 px-2.5 rounded-xl transition-all duration-150 ${isItemActive
                                    ? "text-[#2563EB] typo-nav-active bg-[#EFF6FF] shadow-2xs"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 typo-nav"
                                  }`}
                              >
                                <div className="flex items-center gap-2 truncate min-w-0">
                                  {isItemActive && (
                                    <span
                                      aria-hidden="true"
                                      className="w-1.5 h-1.5 rounded-full bg-[#2563EB] shrink-0"
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
        </aside>
      )}

      {/* 2. MAIN APPLICATION CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden print:h-auto print:min-h-0 print:overflow-visible print:block print:w-full relative bg-[#F5F7FA]">
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

        {/* TOPBAR HEADER: In Settings mode (if permitted), show mobile header with Back to Dashboard; in regular mode, show regular topbar */}
        {isSettingsPage && !routePermissionDenied ? (
          <header className="lg:hidden shrink-0 h-[60px] bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3 flex items-center justify-between z-20 shadow-[0_1px_3px_0_rgba(15,23,42,0.03)] print:hidden">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800 hover:text-slate-900 h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors shadow-2xs"
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
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl flex items-center gap-1 transition-colors"
              title="Settings Menu"
            >
              <span className="text-[11px] font-semibold text-slate-500">Menu</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </header>
        ) : (
          <header className="shrink-0 h-[60px] bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_3px_0_rgba(15,23,42,0.03)] px-3 sm:px-5 flex items-center justify-between z-20 max-w-full min-w-0 print:hidden sticky top-0">
            {/* Left: Brand Logo (on full-screen purchase bill) + Active Company Context & Financial Year */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
              {/* Brand Logo in header when sidebar is hidden on Purchase Bill page */}
              {isPurchaseBillPage && (
                <Link href="/" className="hidden sm:flex items-center gap-2.5 shrink-0 mr-1 sm:mr-3 group">
                  <Image
                    src="/logo-full.png"
                    alt="myownbillbook"
                    width={160}
                    height={36}
                    className="h-8 w-auto object-contain"
                    priority
                  />
                </Link>
              )}

              {/* Menu Drawer Toggle Button (Visible on mobile) */}
              {!isPurchaseBillPage && (
                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="lg:hidden flex items-center justify-center w-9 h-9 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
                  title={lang === "gu" ? "મેનૂ ખોલો" : "Open Navigation Menu"}
                  aria-label="Navigation Menu"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}

              {/* Company Switcher */}
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <CompanySwitcher />

                {/* Financial Year Selector Switcher */}
                <FinancialYearSwitcher />
              </div>
            </div>

            {/* Center: Prominent Global Search matching Reference Image */}
            <div className="hidden md:flex items-center flex-1 max-w-md lg:max-w-lg xl:max-w-xl mx-3 lg:mx-6">
              <GlobalSearch />
            </div>

            {/* Right: Notifications, Help, User Profile matching Reference Image */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto pl-1 sm:pl-2">
              {/* Mobile Search Button (visible on small screens) */}
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen(true)}
                className="md:hidden w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title={lang === "gu" ? "શોધો (Ctrl+K)" : "Search (Ctrl+K)"}
                aria-label="Search"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* Notification Bell Center */}
              <NotificationCenter />

              {/* Help Circle Icon */}
              <button
                type="button"
                className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-transparent hover:border-slate-200/60 transition-all cursor-pointer"
                title="Help & Support"
              >
                <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {/* Subtle Vertical Divider */}
              <div className="hidden sm:block h-6 w-px bg-slate-200/80 mx-1 shrink-0" aria-hidden="true" />

              {/* User Profile & Account Dropdown */}
              <UserProfileDropdown />

              {/* Logout button (when not on dashboard) */}
              {pathname !== "/" && (
                <button
                  onClick={logout}
                  className="hidden md:inline-flex items-center justify-center w-9 h-9 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
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
          className={`flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden relative z-10 ${
            isPurchaseBillPage
              ? "p-2 sm:p-3 lg:p-4 pb-28 overscroll-y-contain focus:outline-none print:p-0 print:m-0 print:overflow-visible print:h-auto print:w-full print:block"
              : isStudioPage
                ? "p-3 sm:p-4 lg:px-5 lg:py-4 pb-28 lg:pb-28 overscroll-y-contain focus:outline-none print:p-0 print:m-0 print:overflow-visible print:h-auto print:w-full print:block"
                : "p-3 sm:p-4 lg:px-5 lg:py-4 pb-24 lg:pb-8 overscroll-y-contain focus:outline-none print:p-0 print:m-0 print:overflow-visible print:h-auto print:w-full print:block"
          }`}
        >
          <div
            className="w-full min-w-0 max-w-none print:max-w-none print:w-full print:p-0 print:m-0"
          >
            {planRestrictionDenied ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[55vh]">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-50 to-orange-100 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 shadow-sm ring-4 ring-amber-50">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 mb-2.5">
                  <span>{lang === "gu" ? "પ્લાન અપગ્રેડ જરૂરી છે" : "Plan Upgrade Required"}</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-1.5">
                  {lang === "gu" ? planRestrictionDenied.titleGujarati : planRestrictionDenied.title}
                </h2>
                <p className="text-sm text-slate-600 max-w-md mb-2">
                  {lang === "gu"
                    ? `આ સુવિધા તમારા હાલના (${entitlements?.nameGujarati || entitlements?.name || "ચાલુ"}) પ્લાનમાં સમાવિષ્ટ નથી.`
                    : `This feature is not included in your current (${entitlements?.name || "active"}) subscription tier.`}
                </p>
                <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
                  {lang === "gu"
                    ? `આ મોડ્યુલ વાપરવા માટે કૃપા કરીને તમારો પ્લાન (${planRestrictionDenied.minTier}) અથવા ઉચ્ચમાં અપગ્રેડ કરો.`
                    : `Please upgrade your subscription to ${planRestrictionDenied.minTier} or contact your Super Admin to unlock access.`}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/#pricing"
                    className="px-5 py-2.5 bg-[#1677E8] hover:bg-[#1268D3] text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{lang === "gu" ? "પ્લાન અપગ્રેડ કરો" : "Upgrade Subscription Plan"}</span>
                  </Link>
                  <Link
                    href="/"
                    className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                  >
                    {lang === "gu" ? "મુખ્ય ડેશબોર્ડ" : "Back to Dashboard"}
                  </Link>
                </div>
              </div>
            ) : routePermissionDenied ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[50vh]">
                <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4 shadow-xs">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">
                  {lang === "gu" ? "પ્રવેશ પ્રતિબંધિત છે" : "Access Restricted"}
                </h2>
                <p className="text-sm text-slate-500 max-w-md mb-6">
                  {lang === "gu"
                    ? "તમારી પાસે આ મોડ્યુલ ઍક્સેસ કરવાની પરવાનગી નથી. કૃપા કરીને તમારા વ્યવસાય એડમિનિસ્ટ્રેટરનો સંપર્ક કરો."
                    : "You do not have permission to access this module. Please contact your organization administrator."}
                </p>
                <Link
                  href="/"
                  className="px-5 py-2.5 bg-[#1677E8] hover:bg-[#1268D3] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  {lang === "gu" ? "ડેશબોર્ડ પર પાછા જાઓ" : "Return to Dashboard"}
                </Link>
              </div>
            ) : (
              children
            )}
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
            {isSettingsPage && !routePermissionDenied ? (
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
                    <X className="w-4 h-4" />
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
                    <Image
                      src="/logo-full.png"
                      alt="myownbillbook"
                      width={150}
                      height={34}
                      className="h-8 w-auto object-contain"
                      priority
                    />
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
                  {visibleNavigationSections.map((sec) => (
                    <div key={sec.id} className="space-y-0.5">
                      {sec.href ? (
                        <Link
                          href={sec.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeNav.isDirectLinkActive(sec.id, sec.href)
                              ? "bg-[#EFF6FF] text-[#2563EB] font-bold shadow-2xs"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                            }`}
                        >
                          <span className={activeNav.isDirectLinkActive(sec.id, sec.href) ? "text-[#2563EB]" : "text-slate-500"}>
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
                                      ? "bg-[#EFF6FF] text-[#2563EB] font-bold shadow-2xs"
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
                      <CustomSelect
                        size="sm"
                        value={currentBranch?.id || ""}
                        onChange={(val: any) => switchBranch(val)}
                        options={branches.map((b) => ({
                          value: b.id,
                          label: b.name,
                        }))}
                        triggerClassName="rounded-md border-slate-200 bg-white font-medium text-slate-800"
                      />
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

      {/* 5. MOBILE BOTTOM NAVIGATION BAR (Hidden in Settings mode & Studio mode) */}
      {(!isSettingsPage || routePermissionDenied) && !isStudioPage && (
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

      {/* 6. MOBILE SEARCH MODAL OVERLAY */}
      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-slate-900/60 backdrop-blur-xs flex flex-col p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-3 shadow-2xl border border-slate-200 mt-2">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <span className="text-[13px] font-bold text-slate-800">
                {lang === "gu" ? "ગ્લોબલ સર્ચ" : "Global Search"}
              </span>
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Close search"
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            <GlobalSearch
              isMobileDrawer
              onCloseMobileDrawer={() => setIsMobileSearchOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
