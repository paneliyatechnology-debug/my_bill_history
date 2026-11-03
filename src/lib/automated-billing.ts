import { apiClient } from "./api-client";

export interface AutomatedBillingLine {
  id?: string;
  itemId?: string | null;
  description: string;
  hsnCode?: string | null;
  quantity: number;
  unit?: string | null;
  rate: number;
  discountPercent?: number;
  discountAmount?: number;
  taxRate?: number;
  taxableAmount?: number;
  totalAmount?: number;
  sortOrder?: number;
  item?: {
    id: string;
    name: string;
    nameGujarati?: string;
    sku?: string;
  };
}

export interface AutomatedBillingRun {
  id: string;
  scheduleId: string;
  occurrenceKey: string;
  scheduledFor: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
  attemptCount: number;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  grandTotal?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  triggeredBy: string;
  startedAt: string;
  completedAt?: string | null;
  createdAt: string;
  invoice?: {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    grandTotal: number;
    status: string;
  };
}

export interface AutomatedBillingSchedule {
  id: string;
  organizationId: string;
  companyId: string;
  branchId?: string | null;
  scheduleName: string;
  partyId: string;
  status: "ACTIVE" | "PAUSED" | "STOPPED" | "COMPLETED";
  startDate: string;
  endDate?: string | null;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval: number;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  nextRunAt?: string | null;
  lastRunAt?: string | null;
  lastRunStatus?: "SUCCESS" | "FAILED" | null;
  paymentTerms?: string | null;
  dueDays: number;
  notes?: string | null;
  termsAndConditions?: string | null;
  estimatedTotal: number;
  totalRunsCount: number;
  successfulRunsCount: number;
  failedRunsCount: number;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  party: {
    id: string;
    name: string;
    nameGujarati?: string | null;
    phone: string;
    email?: string | null;
    gstin?: string | null;
    billingAddress?: any;
    stateCode?: string | null;
  };
  lines?: AutomatedBillingLine[];
  runs?: AutomatedBillingRun[];
  _count?: {
    lines: number;
    runs: number;
  };
}

export interface AutomatedBillingSummary {
  activeSchedulesCount: number;
  dueSoonCount: number;
  invoicesThisMonthCount: number;
  needsAttentionCount: number;
}

export interface CreateAutomatedBillingPayload {
  scheduleName: string;
  partyId: string;
  startDate: string;
  endDate?: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval?: number;
  dayOfWeek?: number;
  dayOfMonth?: number;
  paymentTerms?: string;
  dueDays?: number;
  notes?: string;
  termsAndConditions?: string;
  lines: {
    itemId?: string;
    description: string;
    hsnCode?: string;
    quantity: number;
    unit?: string;
    rate: number;
    discountPercent?: number;
    taxRate?: number;
  }[];
}

export const automatedBillingApi = {
  async getSummary(): Promise<AutomatedBillingSummary> {
    return await apiClient.get<AutomatedBillingSummary>("/sales/automated-billing/summary");
  },

  async listSchedules(params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: AutomatedBillingSchedule[]; total: number; page: number; totalPages: number }> {
    return await apiClient.get<any>("/sales/automated-billing", params);
  },

  async getScheduleById(id: string): Promise<AutomatedBillingSchedule> {
    return await apiClient.get<AutomatedBillingSchedule>(`/sales/automated-billing/${id}`);
  },

  async createSchedule(payload: CreateAutomatedBillingPayload): Promise<AutomatedBillingSchedule> {
    return await apiClient.post<AutomatedBillingSchedule>("/sales/automated-billing", payload);
  },

  async updateSchedule(id: string, payload: Partial<CreateAutomatedBillingPayload>): Promise<AutomatedBillingSchedule> {
    return await apiClient.patch<AutomatedBillingSchedule>(`/sales/automated-billing/${id}`, payload);
  },

  async pauseSchedule(id: string): Promise<AutomatedBillingSchedule> {
    return await apiClient.post<AutomatedBillingSchedule>(`/sales/automated-billing/${id}/pause`);
  },

  async resumeSchedule(id: string): Promise<AutomatedBillingSchedule> {
    return await apiClient.post<AutomatedBillingSchedule>(`/sales/automated-billing/${id}/resume`);
  },

  async stopSchedule(id: string): Promise<AutomatedBillingSchedule> {
    return await apiClient.post<AutomatedBillingSchedule>(`/sales/automated-billing/${id}/stop`);
  },

  async runNow(id: string): Promise<{ success: boolean; invoice: any; run: AutomatedBillingRun }> {
    return await apiClient.post<any>(`/sales/automated-billing/${id}/run-now`);
  },

  async getRuns(scheduleId: string, params?: { page?: number; limit?: number }): Promise<{ items: AutomatedBillingRun[]; total: number }> {
    return await apiClient.get<any>(`/sales/automated-billing/${scheduleId}/runs`, params);
  },

  async retryRun(scheduleId: string, runId: string): Promise<any> {
    return await apiClient.post<any>(`/sales/automated-billing/${scheduleId}/runs/${runId}/retry`);
  },
};

export function formatCurrency(amount: number | string | null | undefined): string {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
}
