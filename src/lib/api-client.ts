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

const DEFAULT_TIMEOUT_MS = 60000; // 60s to accommodate cloud cold starts (Render/Fly)

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

const CONFIGURED_API_BASE = (process.env.NEXT_PUBLIC_API_URL || "/api/v1").replace(/\/$/, "");

/**
 * The browser always talks to the Next.js origin (`/api/v1`). next.config
 * rewrites that to the Nest API. A direct call to another origin (for example
 * http://localhost:4000) makes Chrome send an OPTIONS preflight before every
 * GET that carries Authorization or tenant headers.
 * Server-side code still needs an absolute URL.
 */
function resolveApiBase(): string {
  if (typeof window !== "undefined") {
    return "/api/v1";
  }
  if (/^https?:\/\//i.test(CONFIGURED_API_BASE)) return CONFIGURED_API_BASE;
  const internal = process.env.API_INTERNAL_URL;
  if (internal && /^https?:\/\//i.test(internal)) return internal.replace(/\/$/, "");
  return "http://127.0.0.1:4000/api/v1";
}

/** Bumped by writes so a refetch after a mutation never reuses a list GET that started earlier. */
let getEpoch = 0;
const inflightGets = new Map<string, Promise<unknown>>();

function invalidateInflightGets() {
  getEpoch += 1;
}

function tenantScopeKey(custom?: TenantHeaders): string {
  const tenant = { ...getStoredTenant(), ...custom };
  return [
    tenant.organizationId || "",
    tenant.companyId || "",
    tenant.branchId || "",
    tenant.financialYearId || "",
  ].join("|");
}

function normalizedGetKey(fullPath: string, tenant?: TenantHeaders, timeoutMs?: number): string {
  const qIndex = fullPath.indexOf("?");
  let pathKey = fullPath;
  if (qIndex !== -1) {
    const params = new URLSearchParams(fullPath.slice(qIndex + 1));
    const sorted = [...params.entries()].sort((a, b) =>
      a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0]),
    );
    pathKey = `${fullPath.slice(0, qIndex)}?${sorted.map(([k, v]) => `${k}=${v}`).join("&")}`;
  }
  return `${getEpoch}|${pathKey}|${tenantScopeKey(tenant)}|${timeoutMs ?? ""}`;
}

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
  const url = `${resolveApiBase()}${cleanPath}`;

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
        `Request to ${cleanPath} timed out after ${Math.round(timeoutMs / 1000)}s. If the backend is on a free tier (Render), it may be waking up from sleep. Please try again in a few moments.`,
        "સર્વર શરૂ થવામાં સમય લાગી રહ્યો છે (Render Cold Start). કૃપા કરીને ૧૦-૧૫ સેકન્ડ પછી ફરી પ્રયાસ કરો.",
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

    const profileRole = (() => {
      try {
        const raw = localStorage.getItem("billing_user_profile");
        return raw ? JSON.parse(raw)?.role : undefined;
      } catch {
        return undefined;
      }
    })();
    const isPlatformAdmin = profileRole === "SUPER_ADMIN";
    const tenantScopedKick =
      errBody?.error === "TENANT_SUSPENDED" || errBody?.error === "SESSION_REVOKED";

    if (
      !(isPlatformAdmin && tenantScopedKick) &&
      (response.status === 401 ||
        (response.status === 403 &&
          (tenantScopedKick || errBody?.error === "ACCOUNT_DEACTIVATED"))) &&
      typeof window !== "undefined" &&
      !options.skipAuthRedirect
    ) {
      handleUnauthorized();
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
  getBaseUrl(): string {
    return resolveApiBase();
  },

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
    // An explicit abort signal must stay private to that caller.
    if (options?.signal) {
      return request<T>(fullPath, { method: "GET", ...options }, tenant);
    }

    const key = normalizedGetKey(fullPath, tenant, options?.timeoutMs);
    const existing = inflightGets.get(key);
    if (existing) return existing as Promise<T>;

    const promise = request<T>(fullPath, { method: "GET", ...options }, tenant).finally(() => {
      if (inflightGets.get(key) === promise) inflightGets.delete(key);
    });
    inflightGets.set(key, promise);
    return promise;
  },

  post<T>(
    path: string,
    body?: any,
    tenant?: TenantHeaders,
    idempotencyKey?: string,
    options?: RequestOptions,
  ): Promise<T> {
    invalidateInflightGets();
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    return request<T>(
      path,
      {
        method: "POST",
        body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
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
    invalidateInflightGets();
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    return request<T>(
      path,
      {
        method: "PUT",
        body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
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
    invalidateInflightGets();
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    return request<T>(
      path,
      {
        method: "PATCH",
        body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
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
    invalidateInflightGets();
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
        `${resolveApiBase()}${fullPath.startsWith("/") ? fullPath : `/${fullPath}`}`,
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
