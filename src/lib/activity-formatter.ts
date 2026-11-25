import type { ActivityChangeItem } from "../components/audit/activity-detail-drawer";

export type ActionTone = "create" | "update" | "delete" | "post" | "cancel" | "auth" | "neutral";

export interface FormattedActionInfo {
  title: string;
  titleGu: string;
  badge: string;
  badgeGu: string;
  tone: ActionTone;
}

export interface FormattedModuleInfo {
  label: string;
  labelGu: string;
}

const MODULE_MAP: Record<string, FormattedModuleInfo> = {
  SalesInvoice: { label: "Sales", labelGu: "વેચાણ" },
  SalesReturn: { label: "Sales Return", labelGu: "વેચાણ પરત" },
  PurchaseInvoice: { label: "Purchases", labelGu: "ખરીદી" },
  PurchaseReturn: { label: "Purchase Return", labelGu: "ખરીદી પરત" },
  Voucher: { label: "Vouchers", labelGu: "વાઉચર" },
  Item: { label: "Inventory", labelGu: "આઇટમ / સ્ટોક" },
  Party: { label: "Parties", labelGu: "પાર્ટી" },
  LedgerAccount: { label: "Ledgers", labelGu: "ખાતાવહી" },
  User: { label: "Users & Auth", labelGu: "યુઝર્સ અને લોગિન" },
  HsnMaster: { label: "HSN / SAC", labelGu: "HSN / SAC" },
  ImportJob: { label: "Data Import", labelGu: "ડેટા આયાત" },
  BankAccount: { label: "Bank & Cash", labelGu: "બેંક અને રોકડ" },
  Expense: { label: "Expenses", labelGu: "ખર્ચ" },
  StockTransfer: { label: "Stock Transfer", labelGu: "સ્ટોક ટ્રાન્સફર" },
  DeliveryChallan: { label: "Delivery Challan", labelGu: "ડિલિવરી ચલણ" },
  Company: { label: "Company Settings", labelGu: "કંપની સેટિંગ્સ" },
  Branch: { label: "Branches", labelGu: "શાખાઓ" },
  AutomatedBilling: { label: "Automated Bills", labelGu: "ઓટોમેટેડ બિલ" },
};

const ACTION_OVERRIDES: Record<string, FormattedActionInfo> = {
  AUTH_LOGIN: {
    title: "Signed in to account",
    titleGu: "એકાઉન્ટમાં લોગિન કર્યું",
    badge: "Login",
    badgeGu: "લોગિન",
    tone: "auth",
  },
  AUTH_LOGOUT: {
    title: "Signed out",
    titleGu: "લોગઆઉટ કર્યું",
    badge: "Logout",
    badgeGu: "લોગઆઉટ",
    tone: "auth",
  },
  AUTH_REFRESH_TOKEN: {
    title: "Refreshed session / context",
    titleGu: "સેશન રિફ્રેશ થયું",
    badge: "Session",
    badgeGu: "સેશન",
    tone: "auth",
  },
  AUTH_REGISTER: {
    title: "Registered organization",
    titleGu: "નવી સંસ્થા રજીસ્ટર કરી",
    badge: "Created",
    badgeGu: "બનાવેલ",
    tone: "create",
  },
  ITEM_CREATE: {
    title: "Created inventory item",
    titleGu: "નવી આઇટમ ઉમેરી",
    badge: "Created",
    badgeGu: "બનાવેલ",
    tone: "create",
  },
  ITEM_UPDATE: {
    title: "Updated item details",
    titleGu: "આઇટમ વિગતો બદલી",
    badge: "Updated",
    badgeGu: "ફેરફાર",
    tone: "update",
  },
  ITEM_DELETE: {
    title: "Deleted inventory item",
    titleGu: "આઇટમ કાઢી નાખી",
    badge: "Deleted",
    badgeGu: "કાઢી નાખેલ",
    tone: "delete",
  },
  STOCK_ADJUST: {
    title: "Adjusted item stock",
    titleGu: "સ્ટોક એડજસ્ટ કર્યો",
    badge: "Stock",
    badgeGu: "સ્ટોક",
    tone: "update",
  },
  PARTY_CREATE: {
    title: "Added new party",
    titleGu: "નવી પાર્ટી ઉમેરી",
    badge: "Created",
    badgeGu: "બનાવેલ",
    tone: "create",
  },
  PARTY_UPDATE: {
    title: "Updated party details",
    titleGu: "પાર્ટી વિગતો બદલી",
    badge: "Updated",
    badgeGu: "ફેરફાર",
    tone: "update",
  },
  PARTY_DELETE: {
    title: "Deleted party",
    titleGu: "પાર્ટી કાઢી નાખી",
    badge: "Deleted",
    badgeGu: "કાઢી નાખેલ",
    tone: "delete",
  },
  SALES_INVOICE_CREATE: {
    title: "Created sales invoice",
    titleGu: "નવું વેચાણ બિલ બનાવ્યું",
    badge: "Created",
    badgeGu: "બનાવેલ",
    tone: "create",
  },
  SALES_INVOICE_UPDATE: {
    title: "Updated sales invoice",
    titleGu: "વેચાણ બિલમાં ફેરફાર કર્યો",
    badge: "Updated",
    badgeGu: "ફેરફાર",
    tone: "update",
  },
  SALES_INVOICE_CANCEL: {
    title: "Cancelled sales invoice",
    titleGu: "વેચાણ બિલ રદ કર્યું",
    badge: "Cancelled",
    badgeGu: "રદ",
    tone: "cancel",
  },
  PURCHASE_INVOICE_CREATE: {
    title: "Recorded purchase bill",
    titleGu: "નવું ખરીદી બિલ ઉમેર્યું",
    badge: "Created",
    badgeGu: "બનાવેલ",
    tone: "create",
  },
  PURCHASE_INVOICE_UPDATE: {
    title: "Updated purchase bill",
    titleGu: "ખરીદી બિલમાં ફેરફાર કર્યો",
    badge: "Updated",
    badgeGu: "ફેરફાર",
    tone: "update",
  },
  VOUCHER_CREATE: {
    title: "Created accounting voucher",
    titleGu: "નવું વાઉચર બનાવ્યું",
    badge: "Posted",
    badgeGu: "મંજૂર",
    tone: "post",
  },
  VOUCHER_DELETE: {
    title: "Deleted voucher",
    titleGu: "વાઉચર કાઢી નાખ્યું",
    badge: "Deleted",
    badgeGu: "કાઢી નાખેલ",
    tone: "delete",
  },
};

function titleCaseWords(raw: string): string {
  return raw
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function formatActivityModule(entityName?: string): FormattedModuleInfo {
  if (!entityName) return { label: "System", labelGu: "સિસ્ટમ" };
  if (MODULE_MAP[entityName]) return MODULE_MAP[entityName];
  const spaced = entityName.replace(/([a-z])([A-Z])/g, "$1 $2");
  return { label: spaced, labelGu: spaced };
}

export function formatActivityAction(action: string, entityName?: string): FormattedActionInfo {
  const upper = (action || "").toUpperCase();
  if (ACTION_OVERRIDES[upper]) return ACTION_OVERRIDES[upper];

  const mod = formatActivityModule(entityName);
  if (upper.includes("CREATE") || upper.includes("ADD") || upper.includes("REGISTER")) {
    return {
      title: `Created ${mod.label.toLowerCase()}`,
      titleGu: `${mod.labelGu} ઉમેર્યું`,
      badge: "Created",
      badgeGu: "બનાવેલ",
      tone: "create",
    };
  }
  if (upper.includes("UPDATE") || upper.includes("EDIT") || upper.includes("ADJUST") || upper.includes("TOGGLE")) {
    return {
      title: `Updated ${mod.label.toLowerCase()}`,
      titleGu: `${mod.labelGu}માં ફેરફાર`,
      badge: "Updated",
      badgeGu: "ફેરફાર",
      tone: "update",
    };
  }
  if (upper.includes("DELETE") || upper.includes("REMOVE")) {
    return {
      title: `Deleted ${mod.label.toLowerCase()}`,
      titleGu: `${mod.labelGu} કાઢી નાખ્યું`,
      badge: "Deleted",
      badgeGu: "કાઢી નાખેલ",
      tone: "delete",
    };
  }
  if (upper.includes("CANCEL") || upper.includes("VOID")) {
    return {
      title: `Cancelled ${mod.label.toLowerCase()}`,
      titleGu: `${mod.labelGu} રદ કર્યું`,
      badge: "Cancelled",
      badgeGu: "રદ",
      tone: "cancel",
    };
  }
  if (upper.includes("POST") || upper.includes("APPROVE") || upper.includes("SETTLE")) {
    return {
      title: `Posted ${mod.label.toLowerCase()}`,
      titleGu: `${mod.labelGu} મંજૂર કર્યું`,
      badge: "Posted",
      badgeGu: "મંજૂર",
      tone: "post",
    };
  }
  if (upper.includes("IMPORT")) {
    return {
      title: `Imported ${mod.label.toLowerCase()}`,
      titleGu: `${mod.labelGu} આયાત કર્યું`,
      badge: "Imported",
      badgeGu: "આયાત",
      tone: "post",
    };
  }
  if (upper.includes("AUTH") || upper.includes("LOGIN") || upper.includes("TOKEN")) {
    return {
      title: titleCaseWords(upper),
      titleGu: titleCaseWords(upper),
      badge: "Security",
      badgeGu: "સુરક્ષા",
      tone: "auth",
    };
  }
  return {
    title: titleCaseWords(upper),
    titleGu: titleCaseWords(upper),
    badge: "Activity",
    badgeGu: "પ્રવૃત્તિ",
    tone: "neutral",
  };
}

export function getActionToneClasses(tone: ActionTone): {
  badge: string;
  dot: string;
} {
  switch (tone) {
    case "create":
      return {
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dot: "bg-emerald-500",
      };
    case "update":
      return {
        badge: "bg-blue-50 text-blue-700 border-blue-200",
        dot: "bg-blue-500",
      };
    case "post":
      return {
        badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
        dot: "bg-indigo-500",
      };
    case "delete":
    case "cancel":
      return {
        badge: "bg-rose-50 text-rose-700 border-rose-200",
        dot: "bg-rose-500",
      };
    case "auth":
    default:
      return {
        badge: "bg-slate-100 text-slate-700 border-slate-200",
        dot: "bg-slate-400",
      };
  }
}

const NOISY_FIELDS = new Set([
  "id",
  "organizationId",
  "companyId",
  "createdAt",
  "updatedAt",
  "userId",
  "branchId",
  "financialYearId",
  "primaryUomId",
  "secondaryUomId",
  "categoryId",
  "hsnMasterId",
  "partyId",
  "passwordHash",
  "refreshTokenHash",
]);

const SUBJECT_KEYS = [
  "name",
  "invoiceNumber",
  "vendorInvoiceNumber",
  "returnNumber",
  "voucherNumber",
  "code",
  "fullName",
  "legalName",
  "tradeName",
  "batchNumber",
  "title",
];

export function formatCompactValue(val: unknown): string {
  if (val === null || val === undefined || val === "") return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "number") return Number.isInteger(val) ? String(val) : val.toFixed(2);
  if (typeof val === "object") {
    if (Array.isArray(val)) return `${val.length} item(s)`;
    const obj = val as Record<string, unknown>;
    if (typeof obj.name === "string") return obj.name;
    if (typeof obj.symbol === "string") return obj.symbol;
    return "{...}";
  }
  const str = String(val);
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    return str.slice(0, 10);
  }
  return str.length > 26 ? `${str.slice(0, 24)}…` : str;
}

export function extractRecordSubject(
  changes?: ActivityChangeItem[],
  fallbackState?: any,
): string | null {
  if (Array.isArray(changes)) {
    for (const key of SUBJECT_KEYS) {
      const hit = changes.find((c) => c.field === key);
      const val = hit?.newValue ?? hit?.oldValue;
      if (val && typeof val === "string") return val;
    }
  }
  if (fallbackState && typeof fallbackState === "object") {
    for (const key of SUBJECT_KEYS) {
      const val = fallbackState[key];
      if (val && typeof val === "string") return val;
    }
  }
  return null;
}

export function getMeaningfulChanges(changes?: ActivityChangeItem[]): ActivityChangeItem[] {
  if (!Array.isArray(changes)) return [];
  const filtered = changes.filter((c) => !NOISY_FIELDS.has(c.field));
  return filtered.length > 0 ? filtered : changes;
}
