import { apiClient } from "./api-client";

export type EInvoiceStatus =
  | "ALL"
  | "DRAFT"
  | "READY"
  | "SUBMITTING"
  | "REGISTERED"
  | "REJECTED"
  | "UNKNOWN_RECONCILE"
  | "CANCELLED";

export interface EInvoiceRecordData {
  id?: string;
  irn: string;
  ackNo: string;
  ackDate: string;
  status: string; // "ACT" | "CNL"
  cancelReason?: string;
  cancelledAt?: string;
  signedInvoice?: string;
  signedQrCode?: string;
  environment?: string;
  providerName?: string;
  createdAt?: string;
}

export interface EInvoiceParty {
  id?: string;
  name: string;
  tradeName?: string;
  gstin: string | null;
  stateCode?: string;
  billingAddress?: any;
  shippingAddress?: any;
  phone?: string;
}

export interface EInvoiceListItem {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  category: string;
  status: string;
  einvoiceStatus: EInvoiceStatus;
  party: EInvoiceParty;
  placeOfSupply: string;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  grandTotal: number;
  eInvoice: EInvoiceRecordData | null;
  lastAttempt?: {
    outcome: string;
    errorCode?: string;
    errorMessage?: string;
    createdAt: string;
  } | null;
}

export interface EInvoiceValidationError {
  field: string;
  code: string;
  message: string;
  severity: "error" | "warning";
}

export interface EInvoiceValidationResult {
  valid: boolean;
  status: "READY" | "DRAFT";
  errors: EInvoiceValidationError[];
  warnings: EInvoiceValidationError[];
  summary: {
    documentNumber: string;
    documentDate: string;
    documentType: string;
    partyName: string;
    partyGstin: string;
    placeOfSupply: string;
    totalItems: number;
    taxableAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    cessAmount: number;
    roundOff: number;
    grandTotal: number;
  };
}

export interface EInvoiceListResponse {
  items: EInvoiceListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: {
    total: number;
    registered: number;
    ready: number;
    draft: number;
    rejected: number;
    reconcile: number;
    cancelled: number;
  };
}

export interface EInvoiceDetailsResponse {
  invoice: any;
  company: any;
  eInvoice: EInvoiceRecordData | null;
  auditLogs: Array<{
    id: string;
    operation: string;
    environment: string;
    outcome: string;
    errorCode?: string;
    errorMessage?: string;
    idempotencyKey?: string;
    createdAt: string;
  }>;
  validation: EInvoiceValidationResult;
}

export interface EInvoiceSettingsData {
  environment: "SANDBOX" | "PRODUCTION";
  productionEnabled: boolean;
  einvoiceClientId: string | null;
  einvoiceUsername: string | null;
  ewayClientId: string | null;
  ewayUsername: string | null;
  credentialStatus: string;
  secretsPresent: boolean;
  sandboxLiveEnabled: boolean;
  message?: string;
  company?: {
    id: string;
    legalName: string;
    tradeName?: string;
    gstin: string;
    stateCode: string;
    addressLine1?: string;
    city?: string;
    pincode?: string;
  };
}

export const einvoiceApi = {
  async list(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    documentType?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<EInvoiceListResponse> {
    return apiClient.get<EInvoiceListResponse>("/e-invoices", params as any);
  },

  async getDetails(id: string): Promise<EInvoiceDetailsResponse> {
    return apiClient.get<EInvoiceDetailsResponse>(`/e-invoices/${id}`);
  },

  async validate(invoiceId: string): Promise<EInvoiceValidationResult> {
    return apiClient.post<EInvoiceValidationResult>(`/e-invoices/${invoiceId}/validate`);
  },

  async generate(invoiceId: string): Promise<any> {
    const idempotencyKey = `einvoice-gen-${invoiceId}-${Date.now()}`;
    return apiClient.post<any>(`/e-invoices/${invoiceId}/generate`, undefined, undefined, idempotencyKey);
  },

  async reconcile(id: string): Promise<any> {
    return apiClient.post<any>(`/e-invoices/${id}/reconcile`);
  },

  async cancel(id: string, reasonCode: string, remarks: string): Promise<any> {
    const idempotencyKey = `einvoice-cancel-${id}-${Date.now()}`;
    return apiClient.post<any>(`/e-invoices/${id}/cancel`, { reasonCode, remarks }, undefined, idempotencyKey);
  },

  async getSettings(): Promise<EInvoiceSettingsData> {
    return apiClient.get<EInvoiceSettingsData>("/settings/e-invoice");
  },

  async saveSettings(data: Partial<EInvoiceSettingsData> & { acknowledgeProductionGate?: boolean }): Promise<any> {
    return apiClient.put<any>("/settings/e-invoice", data);
  },

  async pingSandbox(): Promise<any> {
    return apiClient.post<any>("/gst/integration/sandbox-ping");
  },

  async getAuditLogs(params?: { limit?: number }): Promise<{ rows: any[] }> {
    return apiClient.get<{ rows: any[] }>("/e-invoices/audit", params as any);
  },
};

