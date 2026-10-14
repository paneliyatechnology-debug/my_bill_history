/**
 * Tenancy and Request Context
 */
export interface TenantContext {
  organizationId: string;
  companyId: string;
  branchId?: string;
  financialYearId?: string;
  userId?: string;
  isSystemBypass?: boolean;
}

/**
 * User Roles
 */
export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ORG_ADMIN = "ORG_ADMIN",
  COMPANY_ADMIN = "COMPANY_ADMIN",
  ACCOUNTANT = "ACCOUNTANT",
  BRANCH_MANAGER = "BRANCH_MANAGER",
  CASHIER = "CASHIER",
  SALESMAN = "SALESMAN",
  AUDITOR = "AUDITOR",
}

/**
 * Subscription Tiers
 */
export enum SubscriptionTier {
  TRIAL = "TRIAL",
  RETAIL_BASIC = "RETAIL_BASIC",
  WHOLESALE_PRO = "WHOLESALE_PRO",
  DISTRIBUTION_ENTERPRISE = "DISTRIBUTION_ENTERPRISE",
  MANUFACTURING_SUITE = "MANUFACTURING_SUITE",
}

/**
 * GST Registration Types
 */
export enum GstRegistrationType {
  REGULAR = "REGULAR",
  COMPOSITION = "COMPOSITION",
  UNREGISTERED = "UNREGISTERED",
  CONSUMER = "CONSUMER",
  OVERSEAS = "OVERSEAS",
  SPECIAL_ECONOMIC_ZONE = "SPECIAL_ECONOMIC_ZONE",
}

/**
 * Party Types
 */
export enum PartyType {
  CUSTOMER = "CUSTOMER",
  SUPPLIER = "SUPPLIER",
  BOTH = "BOTH",
  BROKER = "BROKER",
  JOB_WORKER = "JOB_WORKER",
}

/**
 * Item Types
 */
export enum ItemType {
  PRODUCT = "PRODUCT",
  SERVICE = "SERVICE",
}

/**
 * HSN Code Types (Goods vs Services)
 */
export enum HsnType {
  HSN = "HSN",
  SAC = "SAC",
}

/**
 * Inventory Costing Valuation Methods
 */
export enum ValuationMethod {
  FIFO = "FIFO",
  WEIGHTED_AVERAGE = "WEIGHTED_AVERAGE",
}

/**
 * Account Nature (Five fundamental heads of accounting)
 */
export enum AccountNature {
  ASSET = "ASSET",
  LIABILITY = "LIABILITY",
  EQUITY = "EQUITY",
  INCOME = "INCOME",
  EXPENSE = "EXPENSE",
}

/**
 * Standard Voucher Types
 */
export enum VoucherType {
  SALES = "SALES",
  PURCHASE = "PURCHASE",
  PAYMENT = "PAYMENT",
  RECEIPT = "RECEIPT",
  CONTRA = "CONTRA",
  JOURNAL = "JOURNAL",
  CREDIT_NOTE = "CREDIT_NOTE",
  DEBIT_NOTE = "DEBIT_NOTE",
}

/**
 * Account Opening & Balance Type
 */
export type AccountOpeningType = "DR" | "CR";

/**
 * Invoice Categories
 */
export enum InvoiceCategory {
  TAX_INVOICE = "TAX_INVOICE",
  BILL_OF_SUPPLY = "BILL_OF_SUPPLY",
  EXPORT_INVOICE = "EXPORT_INVOICE",
  PROFORMA_INVOICE = "PROFORMA_INVOICE",
  DELIVERY_CHALLAN = "DELIVERY_CHALLAN",
}

/**
 * Invoice Status
 */
export enum InvoiceStatus {
  DRAFT = "DRAFT",
  ISSUED = "ISSUED",
  PAID = "PAID",
  PARTIALLY_PAID = "PARTIALLY_PAID",
  OVERDUE = "OVERDUE",
  CANCELLED = "CANCELLED",
}

/**
 * Payment Modes
 */
export enum PaymentMode {
  CASH = "CASH",
  UPI_QR = "UPI_QR",
  BANK_TRANSFER = "BANK_TRANSFER",
  CHEQUE = "CHEQUE",
  CREDIT_NOTE = "CREDIT_NOTE",
  SPLIT = "SPLIT",
  UNPAID_CREDIT = "UNPAID_CREDIT",
}

/**
 * Stock Transaction Types
 */
export enum StockTransactionType {
  OPENING = "OPENING",
  PURCHASE_RECEIPT = "PURCHASE_RECEIPT",
  PURCHASE_RETURN = "PURCHASE_RETURN",
  SALES_DISPATCH = "SALES_DISPATCH",
  SALES_RETURN = "SALES_RETURN",
  SALES_CANCELLATION = "SALES_CANCELLATION",
  STOCK_TRANSFER_IN = "STOCK_TRANSFER_IN",
  STOCK_TRANSFER_OUT = "STOCK_TRANSFER_OUT",
  MANUFACTURING_CONSUMPTION = "MANUFACTURING_CONSUMPTION",
  MANUFACTURING_YIELD = "MANUFACTURING_YIELD",
  STOCK_ADJUSTMENT_PLUS = "STOCK_ADJUSTMENT_PLUS",
  STOCK_ADJUSTMENT_MINUS = "STOCK_ADJUSTMENT_MINUS",
}

/**
 * RFC 7807 Problem Details
 */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  detailGujarati?: string;
  instance?: string;
  invalidParams?: Array<{
    name: string;
    reason: string;
  }>;
  timestamp: string;
}

/**
 * Standard Paginated Response
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Scan Status
 */
export enum ScanStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  READY_FOR_REVIEW = "READY_FOR_REVIEW",
  CONFIRMED = "CONFIRMED",
  FAILED = "FAILED",
  DISCARDED = "DISCARDED",
}

export interface ExtractedBillItem {
  id?: string;
  description: string;
  rawText?: string;
  hsnCode?: string | null;
  quantity: number | string;
  unit?: string | null;
  unitPrice: number | string;
  discountAmount?: number | string;
  taxableAmount: number | string;
  taxRate: number | string;
  cgstAmount?: number | string;
  sgstAmount?: number | string;
  igstAmount?: number | string;
  totalAmount: number | string;
  confidence: number;
  itemType?: "PRODUCT" | "SERVICE";
  isAmbiguous?: boolean;
  matchedItemId?: string | null;
  matchedItemName?: string | null;
  matchedItemScore?: number;
  matchType?: "BARCODE" | "SKU" | "EXACT_NAME" | "FUZZY_NAME" | "NEW_PRODUCT";
  suggestedItems?: Array<{
    id: string;
    name: string;
    sku?: string | null;
    score: number;
  }>;
}

export interface ExtractedBillData {
  currency?: string;
  exchangeRate?: number | null;
  sourceGrandTotal?: string | null;
  isRcm?: boolean;
  supplier: {
    name: string | null;
    gstin: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    confidence: number;
    matchedPartyId?: string | null;
    matchedPartyName?: string | null;
    matchedPartyGstin?: string | null;
    matchedPartyScore?: number;
    isNewSupplier?: boolean;
  };
  invoice: {
    invoiceNumber: string | null;
    invoiceDate: string | null;
    dueDate: string | null;
    placeOfSupply: string | null;
    confidence: number;
    isDuplicateWarning?: boolean;
  };
  financials: {
    subtotal: string | null;
    totalDiscount: string | null;
    taxableAmount: string | null;
    cgstAmount: string | null;
    sgstAmount: string | null;
    igstAmount: string | null;
    cessAmount: string | null;
    otherCharges: string | null;
    roundOff: string | null;
    grandTotal: string | null;
    isTaxMismatch?: boolean;
    taxMismatchReason?: string | null;
    confidence: number;
  };
  items: ExtractedBillItem[];
  documentMetadata: {
    fileName: string;
    pageCount: number;
    isMultiPage: boolean;
    overallConfidence: number;
    warnings: string[];
    engine?: string;
    isUnreadable?: boolean;
  };
}

export interface PurchaseBillScanRecord {
  id: string;
  organizationId: string;
  companyId: string;
  branchId?: string | null;
  fileName: string;
  fileMimeType: string;
  fileSizeBytes: number;
  fileStoragePath: string;
  fileSha256: string;
  status: ScanStatus;
  ocrProvider: string;
  extractedData?: ExtractedBillData | null;
  rawOcrText?: string | null;
  matchedPartyId?: string | null;
  matchedPartyScore?: number | null;
  purchaseInvoiceId?: string | null;
  errorMessage?: string | null;
  idempotencyKey?: string | null;
  createdAt: string;
  updatedAt: string;
  matchedParty?: {
    id: string;
    name: string;
    gstin?: string | null;
    phone?: string | null;
  } | null;
  purchaseInvoice?: {
    id: string;
    vendorInvoiceNumber: string;
    grandTotal: number | string;
    createdAt: string;
  } | null;
}

