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
  // 4. PARTIES SUB-ITEMS
  // =========================================================================
  else if (
    path === "/app/home/shared-ledger" ||
    isPathPrefixMatch(path, "/masters/parties/shared-ledger") ||
    isPathPrefixMatch(path, "/portal/shared-ledger")
  ) {
    activeSectionId = "parties";
    activeSubItemHref = "/app/home/shared-ledger";
  } else if (isPathPrefixMatch(path, "/masters/parties")) {
    activeSectionId = "parties";
    activeSubItemHref = "/masters/parties";
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
    path === "/settings/user-management" ||
    isPathPrefixMatch(path, "/app/settings/user-management")
  ) {
    activeSectionId = "users";
  } else if (
    isPathPrefixMatch(path, "/home/sms-marketing") ||
    isPathPrefixMatch(path, "/sms-marketing")
  ) {
    activeSectionId = "sms_marketing";
  } else if (
    isPathPrefixMatch(path, "/marketing")
  ) {
    activeSectionId = "marketing";
  } else if (
    isPathPrefixMatch(path, "/settings") ||
    isPathPrefixMatch(path, "/pricing-settings") ||
    isPathPrefixMatch(path, "/app/settings")
  ) {
    activeSectionId = "settings";
  } else if (
    isPathPrefixMatch(path, "/accounting") ||
    isPathPrefixMatch(path, "/vouchers") ||
    isPathPrefixMatch(path, "/app/home/vouchers")
  ) {
    // General accounting/vouchers map to cash_bank or reports
    activeSectionId = "cash_bank";
  }

  return {
    activeSectionId,
    activeSubItemHref,
    hasActiveChild: (sectionId: string) => activeSectionId === sectionId && !!activeSubItemHref,
    isSubItemActive: (subHref: string) => activeSubItemHref === subHref,
    isDirectLinkActive: (sectionId: string, href?: string) => {
      if (activeSectionId === sectionId && !activeSubItemHref) return true;
      if (href && href !== "/" && isPathPrefixMatch(path, href)) return true;
      return false;
    },
  };
}

