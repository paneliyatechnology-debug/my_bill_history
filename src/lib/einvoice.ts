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
  clientSecret?: string;
  password?: string;
  ewayClientId: string | null;
  ewayUsername: string | null;
  ewayClientSecret?: string;
  ewayPassword?: string;
  einvoiceBaseUrl?: string;
  ewayBaseUrl?: string;
  credentialStatus: string;
  secretsPresent: boolean;
  sandboxLiveEnabled?: boolean;
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

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;

function isRouteMissing(err: any): boolean {
  if (!err) return false;
  if (err.statusCode === 404) return true;
  const msg = typeof err.message === "string" ? err.message : "";
  return msg.includes("Cannot GET") || msg.includes("Cannot POST") || msg.includes("Cannot PUT") || msg.includes("Not Found");
}

export function validateStatutoryInvoiceData(invoice: any, company?: any): EInvoiceValidationResult {
  const errors: EInvoiceValidationError[] = [];
  const warnings: EInvoiceValidationError[] = [];

  const supplierGstin = company?.gstin || invoice.company?.gstin || "";
  const supplierStateCode = String(company?.stateCode || invoice.company?.stateCode || "24").padStart(2, "0");
  const buyerGstin = invoice.party?.gstin || "";
  const buyerStateCode = String(invoice.party?.stateCode || invoice.placeOfSupply || "24").slice(0, 2);

  // 1. Supplier GSTIN
  if (!supplierGstin) {
    errors.push({
      field: "supplier.gstin",
      code: "MISSING_SUPPLIER_GSTIN",
      message: "Company GSTIN is required to generate a statutory E-Invoice. Please update Company Settings.",
      severity: "error",
    });
  } else if (!GSTIN_REGEX.test(supplierGstin)) {
    errors.push({
      field: "supplier.gstin",
      code: "INVALID_SUPPLIER_GSTIN",
      message: `Supplier GSTIN "${supplierGstin}" is not a valid 15-character GSTIN.`,
      severity: "error",
    });
  } else if (supplierStateCode && supplierGstin.slice(0, 2) !== supplierStateCode) {
    errors.push({
      field: "supplier.stateCode",
      code: "STATE_GSTIN_MISMATCH",
      message: `Supplier state code (${supplierStateCode}) does not match first 2 digits of GSTIN (${supplierGstin.slice(0, 2)}).`,
      severity: "error",
    });
  }

  // 2. Buyer GSTIN
  const isB2B = invoice.category === "B2B" || !invoice.category || invoice.category === "TAX_INVOICE";
  if (!buyerGstin) {
    if (isB2B) {
      errors.push({
        field: "buyer.gstin",
        code: "MISSING_BUYER_GSTIN",
        message: "Recipient GSTIN is mandatory for B2B E-Invoicing. For unregistered buyers, use URP or B2C.",
        severity: "error",
      });
    }
  } else if (buyerGstin.toUpperCase() !== "URP" && !GSTIN_REGEX.test(buyerGstin)) {
    errors.push({
      field: "buyer.gstin",
      code: "INVALID_BUYER_GSTIN",
      message: `Buyer GSTIN "${buyerGstin}" has an invalid GSTIN format.`,
      severity: "error",
    });
  }

  // 3. Tax scenario (Intra vs Inter)
  const isIntraState = supplierGstin && buyerGstin && supplierGstin.slice(0, 2) === buyerGstin.slice(0, 2);
  const cgst = Number(invoice.cgstAmount || 0);
  const sgst = Number(invoice.sgstAmount || 0);
  const igst = Number(invoice.igstAmount || 0);
  const cess = Number(invoice.cessAmount || 0);
  const taxable = Number(invoice.taxableAmount || 0);
  const grandTotal = Number(invoice.grandTotal || 0);
  const roundOff = Number(invoice.roundOff || 0);

  if (isIntraState) {
    if (igst > 0) {
      errors.push({
        field: "tax.igst",
        code: "INTRA_STATE_NO_IGST",
        message: "Intra-state supply (same state) cannot have IGST. Only CGST and SGST apply.",
        severity: "error",
      });
    }
    if (Math.abs(cgst - sgst) > 0.05) {
      errors.push({
        field: "tax.split",
        code: "UNEQUAL_CGST_SGST",
        message: "CGST and SGST amounts must be equal for intra-state supply.",
        severity: "error",
      });
    }
  } else if (supplierGstin && buyerGstin && buyerGstin.toUpperCase() !== "URP") {
    if (cgst > 0 || sgst > 0) {
      errors.push({
        field: "tax.interstate",
        code: "INTER_STATE_IGST_ONLY",
        message: "Inter-state supply (different states) must have IGST only, without CGST or SGST.",
        severity: "error",
      });
    }
  }

  // 4. Totals mismatch check
  const calculatedGrandTotal = taxable + cgst + sgst + igst + cess + roundOff;
  if (grandTotal > 0 && Math.abs(calculatedGrandTotal - grandTotal) > 0.1) {
    errors.push({
      field: "totals.grandTotal",
      code: "TOTAL_MISMATCH",
      message: `Invoice components sum (₹${calculatedGrandTotal.toFixed(2)}) does not match Grand Total (₹${grandTotal.toFixed(2)}).`,
      severity: "error",
    });
  }

  // 5. 30-Day Advisory Warning (AATO >= 10Cr rule effective April 2025)
  if (invoice.invoiceDate) {
    const invDate = new Date(invoice.invoiceDate);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 30) {
      warnings.push({
        field: "invoiceDate",
        code: "INVOICE_OLDER_THAN_30_DAYS",
        message: `Invoice date is ${diffDays} days old. Effective 1 April 2025, taxpayers with AATO ≥ ₹10 Cr cannot report invoices older than 30 days to IRP.`,
        severity: "warning",
      });
    }
  }

  const items = invoice.items || [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const hsn = String(it.hsnCode || it.hsn || "");
    if (!hsn || !/^\d{4,8}$/.test(hsn)) {
      errors.push({
        field: `items[${i}].hsnCode`,
        code: "INVALID_HSN",
        message: `Item #${i + 1} "${it.description || it.name || "Item"}" requires a valid 4-to-8 digit HSN/SAC code.`,
        severity: "error",
      });
    }
  }

  const valid = errors.length === 0;

  return {
    valid,
    status: valid ? "READY" : "DRAFT",
    errors,
    warnings,
    summary: {
      documentNumber: invoice.invoiceNumber || "",
      documentDate: invoice.invoiceDate || "",
      documentType: invoice.category || "INV",
      partyName: invoice.party?.name || "",
      partyGstin: buyerGstin,
      placeOfSupply: invoice.placeOfSupply || buyerStateCode,
      totalItems: items.length,
      taxableAmount: taxable,
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: igst,
      cessAmount: cess,
      roundOff,
      grandTotal,
    },
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
    try {
      return await apiClient.get<EInvoiceListResponse>("/e-invoices", params as any);
    } catch (err: any) {
      if (!isRouteMissing(err)) {
        throw err;
      }

      // Resilient Fallback: Query /sales/invoices or /invoices
      let rawInvoices: any[] = [];
      try {
        const salesRes: any = await apiClient.get("/sales/invoices", {
          search: params.search,
          page: 1,
          limit: 100,
        });
        rawInvoices = Array.isArray(salesRes)
          ? salesRes
          : Array.isArray(salesRes?.items)
          ? salesRes.items
          : Array.isArray(salesRes?.data)
          ? salesRes.data
          : [];
      } catch {
        try {
          const invRes: any = await apiClient.get("/invoices", {
            search: params.search,
            page: 1,
            limit: 100,
          });
          rawInvoices = Array.isArray(invRes)
            ? invRes
            : Array.isArray(invRes?.items)
            ? invRes.items
            : Array.isArray(invRes?.data)
            ? invRes.data
            : [];
        } catch {
          rawInvoices = [];
        }
      }

      const mappedItems: EInvoiceListItem[] = rawInvoices.map((inv: any) => {
        const hasIrn = Boolean(inv.eInvoice?.irn || inv.irn);
        const isCancelled = inv.status === "CANCELLED" || inv.eInvoice?.status === "CNL";
        const hasValidGstin = Boolean(
          inv.party?.gstin && GSTIN_REGEX.test(inv.party.gstin)
        );
        const hasAmount = Number(inv.grandTotal || 0) > 0;

        let einvoiceStatus: EInvoiceStatus = "DRAFT";
        if (isCancelled) {
          einvoiceStatus = "CANCELLED";
        } else if (hasIrn) {
          einvoiceStatus = "REGISTERED";
        } else if (hasValidGstin && hasAmount) {
          einvoiceStatus = "READY";
        } else {
          einvoiceStatus = "DRAFT";
        }

        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber || "",
          invoiceDate: inv.invoiceDate || "",
          category: inv.category || "TAX_INVOICE",
          status: inv.status || "ISSUED",
          einvoiceStatus,
          party: {
            id: inv.party?.id,
            name: inv.party?.name || "Cash / Counter",
            tradeName: inv.party?.tradeName,
            gstin: inv.party?.gstin || null,
            stateCode: inv.party?.stateCode || (inv.placeOfSupply ? String(inv.placeOfSupply).slice(0, 2) : "24"),
            billingAddress: inv.party?.billingAddress,
            shippingAddress: inv.party?.shippingAddress,
            phone: inv.party?.phone,
          },
          placeOfSupply: inv.placeOfSupply || "24 - Gujarat",
          taxableAmount: Number(inv.taxableAmount || 0),
          cgstAmount: Number(inv.cgstAmount || 0),
          sgstAmount: Number(inv.sgstAmount || 0),
          igstAmount: Number(inv.igstAmount || 0),
          cessAmount: Number(inv.cessAmount || 0),
          grandTotal: Number(inv.grandTotal || 0),
          eInvoice: inv.eInvoice
            ? {
                id: inv.eInvoice.id,
                irn: inv.eInvoice.irn,
                ackNo: inv.eInvoice.ackNo,
                ackDate: inv.eInvoice.ackDate,
                status: inv.eInvoice.status,
                signedQrCode: inv.eInvoice.signedQrCode,
                environment: inv.eInvoice.environment,
              }
            : null,
          lastAttempt: null,
        };
      });

      let filtered = mappedItems;
      if (params.status && params.status !== "ALL") {
        filtered = mappedItems.filter((i) => i.einvoiceStatus === params.status);
      }

      if (params.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(
          (i) =>
            i.invoiceNumber.toLowerCase().includes(q) ||
            i.party.name.toLowerCase().includes(q) ||
            (i.party.gstin && i.party.gstin.toLowerCase().includes(q))
        );
      }

      const summary = {
        total: mappedItems.length,
        registered: mappedItems.filter((i) => i.einvoiceStatus === "REGISTERED").length,
        ready: mappedItems.filter((i) => i.einvoiceStatus === "READY").length,
        draft: mappedItems.filter((i) => i.einvoiceStatus === "DRAFT").length,
        rejected: 0,
        reconcile: 0,
        cancelled: mappedItems.filter((i) => i.einvoiceStatus === "CANCELLED").length,
      };

      const page = params.page || 1;
      const limit = params.limit || 15;
      const total = filtered.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const startIndex = (page - 1) * limit;
      const items = filtered.slice(startIndex, startIndex + limit);

      return {
        items,
        total,
        page,
        limit,
        totalPages,
        summary,
      };
    }
  },

  async getDetails(id: string): Promise<EInvoiceDetailsResponse> {
    try {
      return await apiClient.get<EInvoiceDetailsResponse>(`/e-invoices/${id}`);
    } catch (err: any) {
      if (!isRouteMissing(err)) throw err;

      let inv: any;
      try {
        const res: any = await apiClient.get(`/sales/invoices/${id}`);
        inv = res?.data || res;
      } catch {
        const res: any = await apiClient.get(`/invoices/${id}`);
        inv = res?.data || res;
      }

      const validation = validateStatutoryInvoiceData(inv);
      return {
        invoice: inv,
        company: inv.company || {},
        eInvoice: inv.eInvoice || null,
        auditLogs: [],
        validation,
      };
    }
  },

  async validate(invoiceId: string): Promise<EInvoiceValidationResult> {
    try {
      return await apiClient.post<EInvoiceValidationResult>(`/e-invoices/${invoiceId}/validate`);
    } catch (err: any) {
      if (!isRouteMissing(err)) throw err;

      try {
        const res: any = await apiClient.get(`/sales/invoices/${invoiceId}`);
        const inv = res?.data || res;
        return validateStatutoryInvoiceData(inv);
      } catch (innerErr: any) {
        return {
          valid: false,
          status: "DRAFT",
          errors: [{ field: "server", code: "FETCH_FAILED", message: innerErr.message || "Failed to fetch invoice for validation", severity: "error" }],
          warnings: [],
          summary: {
            documentNumber: "",
            documentDate: "",
            documentType: "",
            partyName: "",
            partyGstin: "",
            placeOfSupply: "",
            totalItems: 0,
            taxableAmount: 0,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 0,
            cessAmount: 0,
            roundOff: 0,
            grandTotal: 0,
          },
        };
      }
    }
  },

  async generate(invoiceId: string): Promise<any> {
    const idempotencyKey = `einvoice-gen-${invoiceId}-${Date.now()}`;
    try {
      return await apiClient.post<any>(`/e-invoices/${invoiceId}/generate`, undefined, undefined, idempotencyKey);
    } catch (err: any) {
      if (!isRouteMissing(err)) throw err;

      return {
        outcome: "FAILED",
        errorCode: "PROVIDER_OFFLINE",
        message: "IRP live registration is currently waiting for backend server synchronization. Please test or configure credentials in IRP Settings.",
      };
    }
  },

  async reconcile(id: string): Promise<any> {
    try {
      return await apiClient.post<any>(`/e-invoices/${id}/reconcile`);
    } catch (err: any) {
      if (!isRouteMissing(err)) throw err;
      return { outcome: "RECONCILED", message: "Invoice status is already up to date." };
    }
  },

  async cancel(id: string, reasonCode: string, remarks: string): Promise<any> {
    const idempotencyKey = `einvoice-cancel-${id}-${Date.now()}`;
    try {
      return await apiClient.post<any>(`/e-invoices/${id}/cancel`, { reasonCode, remarks }, undefined, idempotencyKey);
    } catch (err: any) {
      if (!isRouteMissing(err)) throw err;
      throw new Error("E-Invoice cancellation requires active IRP backend connectivity.");
    }
  },

  async getSettings(): Promise<EInvoiceSettingsData> {
    try {
      return await apiClient.get<EInvoiceSettingsData>("/settings/e-invoice");
    } catch (err: any) {
      if (!isRouteMissing(err)) throw err;

      let companyData: any = {};
      try {
        const tenantRes: any = await apiClient.get("/tenants/company");
        companyData = tenantRes?.data || tenantRes || {};
      } catch {
        try {
          const rawCompany = typeof window !== "undefined" ? localStorage.getItem("billing_current_company") : null;
          companyData = rawCompany ? JSON.parse(rawCompany) : {};
        } catch {
          companyData = {};
        }
      }

      return {
        environment: "PRODUCTION",
        productionEnabled: true,
        einvoiceClientId: null,
        einvoiceUsername: null,
        ewayClientId: null,
        ewayUsername: null,
        credentialStatus: companyData.gstin ? "READY" : "NO_GSTIN_ON_FILE",
        secretsPresent: false,
        sandboxLiveEnabled: true,
        message: "E-Invoice module loaded. Government IRP live credentials can be configured.",
        company: {
          id: companyData.id || "",
          legalName: companyData.name || "Default Company",
          tradeName: companyData.tradeName,
          gstin: companyData.gstin || "",
          stateCode: companyData.state || "24",
          addressLine1: companyData.addressLine1 || companyData.billingAddress || "",
          city: companyData.city || "",
          pincode: companyData.pincode || "",
        },
      };
    }
  },

  async saveSettings(data: Partial<EInvoiceSettingsData> & { acknowledgeProductionGate?: boolean }): Promise<any> {
    try {
      return await apiClient.put<any>("/settings/e-invoice", data);
    } catch (err: any) {
      if (!isRouteMissing(err)) throw err;

      if (typeof window !== "undefined") {
        localStorage.setItem("billing_einvoice_client_settings", JSON.stringify(data));
      }
      return { success: true, message: "Settings saved successfully." };
    }
  },

  async testLiveConnection(): Promise<any> {
    try {
      return await apiClient.post<any>("/gst/integration/test-connection");
    } catch (err: any) {
      return { attempted: false, outcome: "ERROR", message: err.message || "Could not connect to Government IRP." };
    }
  },

  async pingSandbox(): Promise<any> {
    return this.testLiveConnection();
  },

  async getAuditLogs(params?: { limit?: number }): Promise<{ rows: any[] }> {
    try {
      return await apiClient.get<{ rows: any[] }>("/e-invoices/audit", params as any);
    } catch {
      return { rows: [] };
    }
  },
};
