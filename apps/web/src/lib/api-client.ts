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
  isTimeout: boolean;
  isNetworkError: boolean;
  isAuthError: boolean;

  constructor(
    statusCode: number,
    message: string,
    messageGujarati?: string,
    originalError?: any,
    isTimeout = false,
    isNetworkError = false,
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.messageGujarati = messageGujarati;
    this.originalError = originalError;
    this.isTimeout = isTimeout;
    this.isNetworkError = isNetworkError;
    this.isAuthError = statusCode === 401 || statusCode === 403;
  }
}

export interface TenantHeaders {
  organizationId?: string;
  companyId?: string;
  branchId?: string;
  financialYearId?: string;
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  skipAuthRedirect?: boolean;
}

const DEFAULT_TIMEOUT_MS = 15000;

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

let isRedirectingToLogin = false;

export function handleUnauthorized(redirectTarget?: string) {
  if (typeof window === "undefined" || isRedirectingToLogin) return;
  if (window.location.pathname.startsWith("/login")) return;

  isRedirectingToLogin = true;
  try {
    localStorage.removeItem("billing_auth_token");
    localStorage.removeItem("billing_user_profile");
    localStorage.removeItem("billing_tenant_context");
  } catch {
    // Ignore storage errors
  }

  const currentTarget = redirectTarget || (window.location.pathname + window.location.search);
  const redirectParam =
    currentTarget && currentTarget !== "/" && !currentTarget.startsWith("/login")
      ? `?redirect=${encodeURIComponent(currentTarget)}`
      : "";

  // Use replace to avoid browser history trap
  window.location.replace(`/login${redirectParam}`);
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
  customTenant?: TenantHeaders,
  idempotencyKey?: string,
): Promise<T> {
  const token = getStoredToken();
  const tenant = { ...getStoredTenant(), ...customTenant };

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (options.body !== undefined && options.body !== null) {
    headers["Content-Type"] = "application/json";
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

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  if (options.signal) {
    options.signal.addEventListener("abort", () => {
      controller.abort();
    });
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (fetchError: any) {
    clearTimeout(timeoutId);
    if (timedOut || fetchError?.name === "AbortError") {
      throw new ApiError(
        408,
        `Request to ${cleanPath} timed out after ${timeoutMs}ms.`,
        "વિનંતીનો સમય સમાપ્ત થયો. કૃપા કરીને પુનઃ પ્રયાસ કરો.",
        fetchError,
        true,
        false,
      );
    }
    // Network failure (offline, connection refused, or DNS resolution failure)
    throw new ApiError(
      0,
      `Unable to reach backend server (${fetchError?.message || "Connection failed"}).`,
      "સર્વર સાથે કનેક્ટ કરવામાં અસમર્થ. સર્વર ચાલુ છે કે કેમ તે ચકાસો.",
      fetchError,
      false,
      true,
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 401 && typeof window !== "undefined" && !options.skipAuthRedirect) {
    handleUnauthorized();
  }

  if (!response.ok) {
    let errBody: any = null;
    try {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        errBody = await response.json();
      } else {
        const text = await response.text();
        errBody = { message: text || response.statusText };
      }
    } catch {
      errBody = { message: response.statusText || `HTTP ${response.status}` };
    }

    const message = Array.isArray(errBody?.message)
      ? errBody.message.join(", ")
      : errBody?.message || response.statusText || `Request failed with status ${response.status}`;

    throw new ApiError(
      response.status,
      message,
      errBody?.messageGujarati,
      errBody,
      false,
      false,
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
    options?: RequestOptions,
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
    return request<T>(fullPath, { method: "GET", ...options }, tenant);
  },

  post<T>(
    path: string,
    body?: any,
    tenant?: TenantHeaders,
    idempotencyKey?: string,
    options?: RequestOptions,
  ): Promise<T> {
    return request<T>(
      path,
      {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
        ...options,
      },
      tenant,
      idempotencyKey,
    );
  },

  put<T>(
    path: string,
    body?: any,
    tenant?: TenantHeaders,
    options?: RequestOptions,
  ): Promise<T> {
    return request<T>(
      path,
      {
        method: "PUT",
        body: body ? JSON.stringify(body) : undefined,
        ...options,
      },
      tenant,
    );
  },

  patch<T>(
    path: string,
    body?: any,
    tenant?: TenantHeaders,
    options?: RequestOptions,
  ): Promise<T> {
    return request<T>(
      path,
      {
        method: "PATCH",
        body: body ? JSON.stringify(body) : undefined,
        ...options,
      },
      tenant,
    );
  },

  delete<T>(
    path: string,
    tenant?: TenantHeaders,
    options?: RequestOptions,
  ): Promise<T> {
    return request<T>(path, { method: "DELETE", ...options }, tenant);
  },

  async downloadCsv(
    path: string,
    filename: string,
    params?: Record<string, any>,
    options?: RequestOptions,
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

    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(
        `${API_BASE}${fullPath.startsWith("/") ? fullPath : `/${fullPath}`}`,
        {
          headers,
          signal: controller.signal,
        },
      );
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err?.name === "AbortError") {
        throw new Error(`Report download timed out after ${timeoutMs}ms`);
      }
      throw new Error(`Failed to download report: ${err?.message || "Connection failed"}`);
    } finally {
      clearTimeout(timeoutId);
    }

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
