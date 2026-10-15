export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  messageGujarati?: string;
  error?: string;
}

export class ApiError extends Error {
  statusCode: number;
  messageGujarati?: string;
  originalError?: any;

  constructor(
    statusCode: number,
    message: string,
    messageGujarati?: string,
    originalError?: any,
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.messageGujarati = messageGujarati;
    this.originalError = originalError;
  }
}

export interface TenantHeaders {
  organizationId?: string;
  companyId?: string;
  branchId?: string;
  financialYearId?: string;
}

const getStoredToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("billing_auth_token");
};

const getStoredTenant = (): TenantHeaders => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("billing_tenant_context");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

async function request<T>(
  path: string,
  options: RequestInit = {},
  customTenant?: TenantHeaders,
  idempotencyKey?: string,
): Promise<T> {
  const token = getStoredToken();
  const tenant = { ...getStoredTenant(), ...customTenant };

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body !== undefined && options.body !== null) {
    if (isFormData) {
      delete headers["Content-Type"];
    } else if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (tenant.organizationId) {
    headers["x-organization-id"] = tenant.organizationId;
  }
  if (tenant.companyId) {
    headers["x-company-id"] = tenant.companyId;
  }
  if (tenant.branchId) {
    headers["x-branch-id"] = tenant.branchId;
  }
  if (tenant.financialYearId) {
    headers["x-financial-year-id"] = tenant.financialYearId;
  }
  if (idempotencyKey) {
    headers["idempotency-key"] = idempotencyKey;
    headers["x-idempotency-key"] = idempotencyKey;
  }

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE}${cleanPath}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 && typeof window !== "undefined") {
    // If unauthorized, redirect to login if not already on login page
    if (!window.location.pathname.startsWith("/login")) {
      localStorage.removeItem("billing_auth_token");
      localStorage.removeItem("billing_user_profile");
      const currentTarget = window.location.pathname + window.location.search;
      const redirectParam = currentTarget && currentTarget !== "/" ? `?redirect=${encodeURIComponent(currentTarget)}` : "";
      window.location.href = `/login${redirectParam}`;
    }
  }

  if (!response.ok) {
    let errBody: ApiErrorResponse | null = null;
    try {
      errBody = await response.json();
    } catch {
      // not JSON
    }

    const message = Array.isArray(errBody?.message)
      ? errBody?.message.join(", ")
      : errBody?.message || response.statusText || "Request failed";

    throw new ApiError(
      response.status,
      message,
      errBody?.messageGujarati,
      errBody,
    );
  }

  // Check if content-type is json
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }

  return response.text() as unknown as T;
}

export const apiClient = {
  get<T>(
    path: string,
    params?: Record<string, any>,
    tenant?: TenantHeaders,
  ): Promise<T> {
    let fullPath = path;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          searchParams.append(key, String(val));
        }
      });
      const queryStr = searchParams.toString();
      if (queryStr) {
        fullPath += (path.includes("?") ? "&" : "?") + queryStr;
      }
    }
    return request<T>(fullPath, { method: "GET" }, tenant);
  },

  post<T>(
    path: string,
    body?: any,
    tenant?: TenantHeaders,
    idempotencyKey?: string,
  ): Promise<T> {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    return request<T>(
      path,
      {
        method: "POST",
        body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      },
      tenant,
      idempotencyKey,
    );
  },

  put<T>(path: string, body?: any, tenant?: TenantHeaders): Promise<T> {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    return request<T>(
      path,
      {
        method: "PUT",
        body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      },
      tenant,
    );
  },

  patch<T>(path: string, body?: any, tenant?: TenantHeaders): Promise<T> {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    return request<T>(
      path,
      {
        method: "PATCH",
        body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      },
      tenant,
    );
  },

  delete<T>(path: string, tenant?: TenantHeaders): Promise<T> {
    return request<T>(path, { method: "DELETE" }, tenant);
  },

  async downloadCsv(
    path: string,
    filename: string,
    params?: Record<string, any>,
  ): Promise<void> {
    let fullPath = path;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          searchParams.append(key, String(val));
        }
      });
      const queryStr = searchParams.toString();
      if (queryStr) {
        fullPath += (path.includes("?") ? "&" : "?") + queryStr;
      }
    }

    const token = getStoredToken();
    const tenant = getStoredTenant();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (tenant.organizationId)
      headers["x-organization-id"] = tenant.organizationId;
    if (tenant.companyId) headers["x-company-id"] = tenant.companyId;
    if (tenant.branchId) headers["x-branch-id"] = tenant.branchId;
    if (tenant.financialYearId)
      headers["x-financial-year-id"] = tenant.financialYearId;

    const res = await fetch(
      `${API_BASE}${fullPath.startsWith("/") ? fullPath : `/${fullPath}`}`,
      {
        headers,
      },
    );

    if (!res.ok) {
      throw new Error(`Failed to download report: ${res.statusText}`);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};

export function extractList<T = any>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.items)) return res.items;
  if (Array.isArray(res.data)) return res.data;
  return [];
}
