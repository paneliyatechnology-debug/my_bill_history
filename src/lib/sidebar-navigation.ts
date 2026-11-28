/**
 * Centralized Sidebar Navigation Resolver & Routing Matcher
 *
 * Provides exact, deterministic route matching for:
 * - Parent accordion sections (auto-expansion & active child state)
 * - Submenu items (exact matching, nested dynamic routes, sub-pages like /new, /edit, /[id])
 * - Direct navigation links
 * - Normalization of paths (query params, trailing slashes, route aliases)
 */

export interface NavMatchTarget {
  sectionId: string;
  subItemHref?: string;
}

export const SIDEBAR_AUTO_COLLAPSE_KEY = "sidebar_auto_collapse";
export const SIDEBAR_COLLAPSED_KEY = "sidebar_collapsed";
export const SIDEBAR_PREFERENCE_EVENT = "sidebar-preference-changed";

export function getSidebarAutoCollapse(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SIDEBAR_AUTO_COLLAPSE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setSidebarAutoCollapse(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SIDEBAR_AUTO_COLLAPSE_KEY, String(enabled));
    window.dispatchEvent(new Event(SIDEBAR_PREFERENCE_EVENT));
  } catch {
    // ignore storage access error
  }
}

export function getSidebarCollapsedPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

export function setSidebarCollapsedPreference(collapsed: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    window.dispatchEvent(new Event(SIDEBAR_PREFERENCE_EVENT));
  } catch {
    // ignore storage access error
  }
}

/**
 * Normalizes a pathname:
 * - Removes query strings and hash anchors
 * - Trims whitespace
 * - Strips trailing slashes (except root "/")
 */
export function normalizePath(rawPath: string | null | undefined): string {
  if (!rawPath) return "/";
  const withoutQuery = rawPath.split("?")[0].split("#")[0].trim();
  if (withoutQuery.length > 1 && withoutQuery.endsWith("/")) {
    return withoutQuery.replace(/\/+$/, "");
  }
  return withoutQuery || "/";
}

/**
 * Checks if a pathname matches a base path exactly or as a sub-path segment.
 * E.g., isPathPrefixMatch("/sales/invoices/new", "/sales/invoices") => true
 * E.g., isPathPrefixMatch("/sales/invoices-archive", "/sales/invoices") => false
 */
export function isPathPrefixMatch(pathname: string, prefix: string): boolean {
  if (pathname === prefix) return true;
  return pathname.startsWith(prefix + "/");
}

/**
 * Comprehensive resolution of the active sidebar navigation state for any pathname.
 */
export function resolveActiveNavigation(rawPath: string): {
  activeSectionId: string | null;
  activeSubItemHref: string | null;
  hasActiveChild: (sectionId: string) => boolean;
  isSubItemActive: (subHref: string) => boolean;
  isDirectLinkActive: (sectionId: string, href?: string) => boolean;
} {
  const path = normalizePath(rawPath);

  let activeSectionId: string | null = null;
  let activeSubItemHref: string | null = null;

  // =========================================================================
  // 1. DASHBOARD
  // =========================================================================
  if (path === "/" || path === "/dashboard") {
    activeSectionId = "dashboard";
    activeSubItemHref = null;
  }

  // =========================================================================
  // 2. PURCHASES SUB-ITEMS
  // (Evaluate specific sub-items first before broad purchase matching)
  // =========================================================================
  else if (isPathPrefixMatch(path, "/purchases/payment-out")) {
    activeSectionId = "purchases";
    activeSubItemHref = "/purchases/payment-out";
  } else if (isPathPrefixMatch(path, "/purchases/returns")) {
    activeSectionId = "purchases";
    activeSubItemHref = "/purchases/returns";
  } else if (
    isPathPrefixMatch(path, "/purchases/debit-memo") ||
    isPathPrefixMatch(path, "/purchases/debit-note")
  ) {
    activeSectionId = "purchases";
    activeSubItemHref = "/purchases/debit-memo";
  } else if (
    isPathPrefixMatch(path, "/purchases/orders") ||
    isPathPrefixMatch(path, "/purchases/purchase-order") ||
    isPathPrefixMatch(path, "/purchases/purchase_order") ||
    isPathPrefixMatch(path, "/purchases/purchase-orders")
  ) {
    activeSectionId = "purchases";
    activeSubItemHref = "/purchases/orders";
  } else if (
    path === "/purchases" ||
    isPathPrefixMatch(path, "/purchases/invoices") ||
    path === "/purchases/new" ||
    path === "/purchases/create" ||
    (isPathPrefixMatch(path, "/purchases") &&
      !path.startsWith("/purchases/payment-out") &&
      !path.startsWith("/purchases/returns") &&
      !path.startsWith("/purchases/debit-memo") &&
      !path.startsWith("/purchases/debit-note") &&
      !path.startsWith("/purchases/orders") &&
      !path.startsWith("/purchases/purchase-order") &&
      !path.startsWith("/purchases/purchase_order") &&
      !path.startsWith("/purchases/purchase-orders"))
  ) {
    activeSectionId = "purchases";
    activeSubItemHref = "/purchases";
  }

  // =========================================================================
  // 3. SALES SUB-ITEMS
  // =========================================================================
  else if (
    isPathPrefixMatch(path, "/sales/e-invoices") ||
    isPathPrefixMatch(path, "/sales/einvoices")
  ) {
    activeSectionId = "sales";
    activeSubItemHref = "/sales/e-invoices";
  } else if (isPathPrefixMatch(path, "/sales/invoices")) {
    activeSectionId = "sales";
    activeSubItemHref = "/sales/invoices";
  } else if (isPathPrefixMatch(path, "/sales/quotations")) {
    activeSectionId = "sales";
    activeSubItemHref = "/sales/quotations";
  } else if (isPathPrefixMatch(path, "/sales/orders")) {
    activeSectionId = "sales";
    activeSubItemHref = "/sales/orders";
  } else if (isPathPrefixMatch(path, "/sales/payment-in")) {
    activeSectionId = "sales";
    activeSubItemHref = "/sales/payment-in";
  } else if (
    isPathPrefixMatch(path, "/sales/credit-note")
  ) {
    activeSectionId = "sales";
    activeSubItemHref = "/sales/credit-note";
  } else if (
    isPathPrefixMatch(path, "/sales/debit-note")
  ) {
    activeSectionId = "sales";
    activeSubItemHref = "/sales/debit-note";
  } else if (
    isPathPrefixMatch(path, "/sales/delivery-challan") ||
    isPathPrefixMatch(path, "/sales/delivery-challans")
  ) {
    activeSectionId = "sales";
    activeSubItemHref = "/sales/delivery-challan";
  } else if (isPathPrefixMatch(path, "/sales/proforma")) {
    activeSectionId = "sales";
    activeSubItemHref = "/sales/proforma";
  } else if (
    isPathPrefixMatch(path, "/sales/returns") &&
    !path.includes("credit-note")
  ) {
    activeSectionId = "sales";
    activeSubItemHref = "/sales/returns";
  }

  // =========================================================================
  // 4. PARTIES
  // =========================================================================
  else if (
    path === "/app/home/shared-ledger" ||
    isPathPrefixMatch(path, "/masters/parties/shared-ledger") ||
    isPathPrefixMatch(path, "/portal/shared-ledger") ||
    isPathPrefixMatch(path, "/masters/parties")
  ) {
    activeSectionId = "parties";
  }

  // =========================================================================
  // 5. ITEMS (INVENTORY) SUB-ITEMS
  // =========================================================================
  else if (isPathPrefixMatch(path, "/masters/warehouses")) {
    activeSectionId = "items";
    activeSubItemHref = "/masters/warehouses";
  } else if (isPathPrefixMatch(path, "/masters/categories")) {
    activeSectionId = "items";
    activeSubItemHref = "/masters/categories";
  } else if (isPathPrefixMatch(path, "/masters/units")) {
    activeSectionId = "items";
    activeSubItemHref = "/masters/units";
  } else if (isPathPrefixMatch(path, "/inventory/stock-journal")) {
    activeSectionId = "items";
    activeSubItemHref = "/inventory/stock-journal";
  } else if (isPathPrefixMatch(path, "/masters/hsn")) {
    activeSectionId = "items";
    activeSubItemHref = "/masters/hsn";
  } else if (
    isPathPrefixMatch(path, "/masters/items") ||
    isPathPrefixMatch(path, "/masters/batches") ||
    isPathPrefixMatch(path, "/inventory") ||
    isPathPrefixMatch(path, "/manufacturing")
  ) {
    activeSectionId = "items";
    activeSubItemHref = "/masters/items";
  }

  // =========================================================================
  // 6. DIRECT / ACCOUNTING SOLUTIONS / BUSINESS TOOLS SECTIONS
  // =========================================================================
  else if (
    isPathPrefixMatch(path, "/finance/cash-bank") ||
    isPathPrefixMatch(path, "/cash-bank")
  ) {
    activeSectionId = "cash_bank";
  } else if (
    isPathPrefixMatch(path, "/finance/expenses") ||
    isPathPrefixMatch(path, "/expenses") ||
    isPathPrefixMatch(path, "/vouchers/expense")
  ) {
    activeSectionId = "expenses";
  } else if (isPathPrefixMatch(path, "/reports/tally-insights")) {
    activeSectionId = "tally-insights";
  } else if (
    isPathPrefixMatch(path, "/reports") ||
    isPathPrefixMatch(path, "/finance/reports")
  ) {
    activeSectionId = "reports";
  } else if (
    isPathPrefixMatch(path, "/gst") ||
    isPathPrefixMatch(path, "/sales/eway-bills")
  ) {
    activeSectionId = "gst_returns";
  } else if (
    isPathPrefixMatch(path, "/sales/pos/orders") ||
    isPathPrefixMatch(path, "/pos/orders")
  ) {
    activeSectionId = "pos_orders";
  } else if (
    path === "/sales/pos" ||
    path === "/pos"
  ) {
    activeSectionId = "pos";
  } else if (
    isPathPrefixMatch(path, "/sales/automated-billing") ||
    isPathPrefixMatch(path, "/sales/automated-bills") ||
    isPathPrefixMatch(path, "/app/home/vouchers/automated_billing")
  ) {
    activeSectionId = "automated_bills";
  } else if (
    isPathPrefixMatch(path, "/app/data-import") ||
    isPathPrefixMatch(path, "/data-import")
  ) {
    activeSectionId = "data_import";
  } else if (isPathPrefixMatch(path, "/finance/ai-collections")) {
    activeSectionId = "ai_collections";
  } else if (
    isPathPrefixMatch(path, "/app/sam") ||
    isPathPrefixMatch(path, "/payroll")
  ) {
    activeSectionId = "payroll";
  } else if (
    path === "/settings/roles" ||
    path === "/settings/role-and-permissions" ||
    path === "/settings/roles-and-permissions" ||
    isPathPrefixMatch(path, "/settings/roles")
  ) {
    activeSectionId = "settings";
    activeSubItemHref = "/settings/roles";
  } else if (
    path === "/settings/activity-logs" ||
    path === "/settings/activities" ||
    path === "/settings/audit-logs" ||
    isPathPrefixMatch(path, "/app/settings/activity-logs") ||
    isPathPrefixMatch(path, "/settings/activity-logs")
  ) {
    activeSectionId = "settings";
    activeSubItemHref = "/settings/activity-logs";
  } else if (
    path === "/settings/user-management" ||
    isPathPrefixMatch(path, "/app/settings/user-management") ||
    isPathPrefixMatch(path, "/settings/user-management")
  ) {
    activeSectionId = "settings";
    activeSubItemHref = "/settings/user-management";
  } else if (
    path === "/settings/company" ||
    path === "/settings/manage-business" ||
    isPathPrefixMatch(path, "/settings/company")
  ) {
    activeSectionId = "settings";
    activeSubItemHref = "/settings/company";
  } else if (
    path === "/settings/invoice" ||
    path === "/settings/invoice-settings" ||
    isPathPrefixMatch(path, "/settings/invoice")
  ) {
    activeSectionId = "settings";
    activeSubItemHref = "/settings/invoice";
  } else if (
    path === "/settings/e-invoice" ||
    path === "/settings/einvoice" ||
    isPathPrefixMatch(path, "/settings/e-invoice")
  ) {
    activeSectionId = "settings";
    activeSubItemHref = "/settings/e-invoice";
  } else if (
    path === "/settings/sidebar" ||
    path === "/settings/sidebar-settings" ||
    isPathPrefixMatch(path, "/settings/sidebar")
  ) {
    activeSectionId = "settings";
    activeSubItemHref = "/settings/sidebar";
  } else if (
    path === "/settings/account" ||
    isPathPrefixMatch(path, "/settings/account")
  ) {
    activeSectionId = "settings";
    activeSubItemHref = "/settings/account";
  } else if (
    isPathPrefixMatch(path, "/settings") ||
    isPathPrefixMatch(path, "/pricing-settings") ||
    isPathPrefixMatch(path, "/app/settings")
  ) {
    activeSectionId = "settings";
    activeSubItemHref = "/settings/roles";
  } else if (
    isPathPrefixMatch(path, "/accounting/vouchers/new") ||
    isPathPrefixMatch(path, "/finance/vouchers/new")
  ) {
    activeSectionId = "vouchers";
    activeSubItemHref = "/accounting/vouchers/new";
  } else if (
    isPathPrefixMatch(path, "/vouchers/all_transactions") ||
    isPathPrefixMatch(path, "/app/home/vouchers/all_transactions")
  ) {
    activeSectionId = "vouchers";
    activeSubItemHref = "/vouchers/all_transactions";
  } else if (
    isPathPrefixMatch(path, "/accounting/ledgers") ||
    isPathPrefixMatch(path, "/finance/ledgers")
  ) {
    activeSectionId = "vouchers";
    activeSubItemHref = "/accounting/ledgers";
  } else if (
    isPathPrefixMatch(path, "/accounting/chart-of-accounts")
  ) {
    activeSectionId = "vouchers";
    activeSubItemHref = "/accounting/chart-of-accounts";
  } else if (isPathPrefixMatch(path, "/activity-logs")) {
    activeSectionId = "activity_logs";
  } else if (
    isPathPrefixMatch(path, "/accounting") ||
    isPathPrefixMatch(path, "/vouchers") ||
    isPathPrefixMatch(path, "/finance/vouchers") ||
    isPathPrefixMatch(path, "/app/home/vouchers")
  ) {
    activeSectionId = "vouchers";
    activeSubItemHref = "/accounting/vouchers";
  }

  return {
    activeSectionId,
    activeSubItemHref,
    hasActiveChild: (sectionId: string) => activeSectionId === sectionId && !!activeSubItemHref,
    isSubItemActive: (subHref: string) => activeSubItemHref === subHref,
    isDirectLinkActive: (sectionId: string, href?: string) => {
      if (activeSectionId === sectionId && !activeSubItemHref) return true;
      if (!activeSectionId && href && href !== "/" && isPathPrefixMatch(path, href)) return true;
      return false;
    },
  };
}

