"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { apiClient } from "../lib/api-client";

export interface UserProfile {
  id: string;
  name: string;
  fullName?: string;
  email?: string;
  phone: string;
  role?: string;
}

export interface CompanyInfo {
  id: string;
  legalName: string;
  tradeName?: string;
  gstin?: string;
  stateCode?: string;
  city?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankIfsc?: string;
  bankBranch?: string;
  upiVpa?: string;
  bankAccountBarcode?: string;
  signatoryName?: string;
  signatoryDesignation?: string;
  signatureUrl?: string;
}

export interface BranchInfo {
  id: string;
  name: string;
  code: string;
  isMainBranch: boolean;
  city?: string;
  stateCode?: string;
}

export interface FinancialYearInfo {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isLocked: boolean;
}

export interface PlanEntitlementsInfo {
  tier: string;
  name: string;
  nameGujarati: string;
  maxCompanies: number;
  currentCount: number;
  canAddCompany: boolean;
  maxBranchesPerCompany: number;
  maxUsers: number;
  subscriptionEnds?: string | null;
  isExpired?: boolean;
  daysRemaining?: number;
  isActive: boolean;
  features: {
    multiCompany: boolean;
    multiBranch: boolean;
    posCounter: boolean;
    manufacturing: boolean;
    distribution: boolean;
    gstrReconciliation: boolean;
    eInvoiceEWay: boolean;
  };
}

export interface TenantContextState {
  organizationId?: string;
  companyId?: string;
  branchId?: string;
  financialYearId?: string;
}

const WORKSPACE_CACHE_KEY = "billing_workspace_cache";
const LOGOUT_NOTICE_KEY = "billing_logout_notice";
const SUBSCRIPTION_DISMISS_KEY = "billing_subscription_dismissed";

interface WorkspaceCache {
  companyId: string;
  organizationId?: string;
  companies: CompanyInfo[];
  branches: BranchInfo[];
  financialYears: FinancialYearInfo[];
  entitlements: PlanEntitlementsInfo | null;
}

export interface SubscriptionNotice {
  message: string;
  messageGujarati?: string;
  subscriptionEnds?: string | null;
  daysRemaining?: number;
  tier?: string;
}

function readWorkspaceCache(): WorkspaceCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(WORKSPACE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkspaceCache;
    if (!parsed?.companyId || !Array.isArray(parsed.companies)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeWorkspaceCache(cache: WorkspaceCache) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(WORKSPACE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage failover
  }
}

function clearSessionWorkspace() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(WORKSPACE_CACHE_KEY);
    sessionStorage.removeItem(SUBSCRIPTION_DISMISS_KEY);
  } catch {
    // Storage failover
  }
}

function clearAuthStorage() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("billing_auth_token");
    localStorage.removeItem("billing_user_profile");
    localStorage.removeItem("billing_tenant_context");
    localStorage.removeItem("billing_support_session");
  } catch {
    // Storage failover
  }
  clearSessionWorkspace();
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isMetadataLoading: boolean;
  workspaceError: string | null;
  lang: "en" | "gu";
  setLang: (lang: "en" | "gu") => void;
  tenantContext: TenantContextState;
  companies: CompanyInfo[];
  branches: BranchInfo[];
  financialYears: FinancialYearInfo[];
  entitlements: PlanEntitlementsInfo | null;
  currentCompany: CompanyInfo | null;
  currentBranch: BranchInfo | null;
  currentFY: FinancialYearInfo | null;
  login: (data: {
    accessToken: string;
    user: UserProfile;
    defaultContext?: TenantContextState;
  }) => Promise<void>;
  logout: () => void;
  patchUser: (partial: Partial<UserProfile>) => void;
  switchCompany: (companyId: string) => Promise<void>;
  switchBranch: (branchId: string) => Promise<void>;
  switchFinancialYear: (financialYearId: string) => Promise<void>;
  refreshTenantMetadata: () => Promise<void>;
  retryWorkspace: () => Promise<void>;
  createCompany: (dto: any) => Promise<any>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMetadataLoading, setIsMetadataLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [lang, setLangState] = useState<"en" | "gu">("en");
  const [tenantContext, setTenantContext] = useState<TenantContextState>({});

  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [financialYears, setFinancialYears] = useState<FinancialYearInfo[]>([]);
  const [entitlements, setEntitlements] = useState<PlanEntitlementsInfo | null>(null);
  const [subscriptionNotice, setSubscriptionNotice] = useState<SubscriptionNotice | null>(null);

  // In-flight promise ref to deduplicate concurrent refreshTenantMetadata requests
  const inFlightRefreshRef = useRef<Promise<void> | null>(null);

  const setLang = (newLang: "en" | "gu") => {
    setLangState(newLang);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("billing_lang", newLang);
        document.documentElement.lang = newLang;
        document.documentElement.setAttribute("data-lang", newLang);
        if (newLang === "gu") {
          document.documentElement.classList.add("lang-gu");
          document.documentElement.classList.remove("lang-en");
        } else {
          document.documentElement.classList.add("lang-en");
          document.documentElement.classList.remove("lang-gu");
        }
      } catch {
        // Storage failover
      }
    }
  };

  // Keep document element lang and class synchronized with lang state
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.setAttribute("data-lang", lang);
      if (lang === "gu") {
        document.documentElement.classList.add("lang-gu");
        document.documentElement.classList.remove("lang-en");
      } else {
        document.documentElement.classList.add("lang-en");
        document.documentElement.classList.remove("lang-gu");
      }
    }
  }, [lang]);

  const refreshTenantMetadata = useCallback(async () => {
    const storedToken = typeof window !== "undefined" ? localStorage.getItem("billing_auth_token") : null;
    if (!storedToken) {
      setIsMetadataLoading(false);
      return;
    }

    if (inFlightRefreshRef.current) {
      return inFlightRefreshRef.current;
    }

    setIsMetadataLoading(true);

    const refreshPromise = (async () => {
      try {
        const [compSettled, branchSettled, fySettled] = await Promise.allSettled([
          apiClient.get<any>("/tenants/companies"),
          apiClient.get<BranchInfo[]>("/tenants/branches"),
          apiClient.get<FinancialYearInfo[]>("/tenants/financial-years"),
        ]);

        let hasError = false;
        let lastErrorMsg = "";
        let nextCompanies: CompanyInfo[] | null = null;
        let nextBranches: BranchInfo[] | null = null;
        let nextYears: FinancialYearInfo[] | null = null;
        let nextEntitlements: PlanEntitlementsInfo | null = null;

        if (compSettled.status === "fulfilled") {
          const res = compSettled.value;
          const list: CompanyInfo[] = Array.isArray(res)
            ? res
            : Array.isArray(res?.companies)
              ? res.companies
              : [];
          nextCompanies = list;
          setCompanies(list);
          if (res?.entitlements) {
            nextEntitlements = res.entitlements;
            setEntitlements(nextEntitlements);
          }
        } else {
          hasError = true;
          lastErrorMsg = compSettled.reason?.message || "Failed to load companies";
        }

        if (branchSettled.status === "fulfilled") {
          nextBranches = Array.isArray(branchSettled.value) ? branchSettled.value : [];
          setBranches(nextBranches);
        } else {
          hasError = true;
          lastErrorMsg = branchSettled.reason?.message || "Failed to load branches";
        }

        if (fySettled.status === "fulfilled") {
          nextYears = Array.isArray(fySettled.value) ? fySettled.value : [];
          setFinancialYears(nextYears);
        } else {
          hasError = true;
          lastErrorMsg = fySettled.reason?.message || "Failed to load financial years";
        }

        if (nextCompanies) {
          let companyId = "";
          let organizationId = "";
          try {
            const raw = localStorage.getItem("billing_tenant_context");
            const ctx = raw ? JSON.parse(raw) : {};
            companyId = ctx.companyId || "";
            organizationId = ctx.organizationId || "";
          } catch {
            companyId = "";
          }
          const previous = readWorkspaceCache();
          writeWorkspaceCache({
            companyId: companyId || previous?.companyId || "",
            organizationId: organizationId || previous?.organizationId,
            companies: nextCompanies,
            branches: nextBranches || previous?.branches || [],
            financialYears: nextYears || previous?.financialYears || [],
            entitlements: nextEntitlements || previous?.entitlements || null,
          });
          const ent = nextEntitlements || previous?.entitlements || null;
          if (ent?.isExpired) {
            const dismissed =
              typeof window !== "undefined"
                ? sessionStorage.getItem(SUBSCRIPTION_DISMISS_KEY)
                : null;
            if (dismissed !== String(ent.subscriptionEnds || "")) {
              setSubscriptionNotice({
                message: "Your subscription has ended. Renew the plan to continue billing.",
                messageGujarati:
                  "તમારું સબ્સ્ક્રિપ્શન પૂરું થઈ ગયું છે. બિલિંગ ચાલુ રાખવા પ્લાન રિન્યૂ કરો.",
                subscriptionEnds: ent.subscriptionEnds,
                daysRemaining: ent.daysRemaining,
                tier: ent.tier,
              });
            }
          } else {
            setSubscriptionNotice(null);
          }
        }

        if (compSettled.status === "fulfilled") {
          setWorkspaceError(null);
        } else if (hasError) {
          setWorkspaceError(lastErrorMsg);
        }
      } catch (err: any) {
        setWorkspaceError(err?.message || "Workspace initialization failed");
      } finally {
        setIsMetadataLoading(false);
        inFlightRefreshRef.current = null;
      }
    })();

    inFlightRefreshRef.current = refreshPromise;
    return refreshPromise;
  }, []);

  const retryWorkspace = useCallback(async () => {
    setWorkspaceError(null);
    await refreshTenantMetadata();
  }, [refreshTenantMetadata]);

  // Initial session hydration
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedToken = localStorage.getItem("billing_auth_token");
      const savedUser = localStorage.getItem("billing_user_profile");
      const savedTenant = localStorage.getItem("billing_tenant_context");
      const savedLang = localStorage.getItem("billing_lang") as "en" | "gu" | null;

      if (savedLang === "en" || savedLang === "gu") {
        setLangState(savedLang);
      }

      if (savedToken && savedUser) {
        setToken(savedToken);
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed && typeof parsed === "object") {
            parsed.name = parsed.name || parsed.fullName || "User";
            setUser(parsed);
          }
        } catch {
          setUser(null);
        }

        if (savedTenant) {
          try {
            setTenantContext(JSON.parse(savedTenant));
          } catch {
            setTenantContext({});
          }
        }

        const cached = readWorkspaceCache();
        if (cached) {
          setCompanies(cached.companies);
          setBranches(cached.branches || []);
          setFinancialYears(cached.financialYears || []);
          setEntitlements(cached.entitlements);
          if (cached.entitlements?.isExpired) {
            const dismissed = sessionStorage.getItem(SUBSCRIPTION_DISMISS_KEY);
            if (dismissed !== String(cached.entitlements.subscriptionEnds || "")) {
              setSubscriptionNotice({
                message: "Your subscription has ended. Renew the plan to continue billing.",
                messageGujarati:
                  "તમારું સબ્સ્ક્રિપ્શન પૂરું થઈ ગયું છે. બિલિંગ ચાલુ રાખવા પ્લાન રિન્યૂ કરો.",
                subscriptionEnds: cached.entitlements.subscriptionEnds,
                daysRemaining: cached.entitlements.daysRemaining,
                tier: cached.entitlements.tier,
              });
            }
          }
        }
      }
    } catch {
      // Safe fallback
    } finally {
      setIsLoading(false);
    }

    // Safety watchdog: Guarantee loading is false within 2.5s under all circumstances
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  // Read companies, branches, and financial years from the login session.
  // Hit the API only when that session cache is missing or belongs to another company.
  useEffect(() => {
    if (!token || !tenantContext.companyId) return;
    const cached = readWorkspaceCache();
    if (
      cached &&
      cached.companyId === tenantContext.companyId &&
      cached.companies.length > 0
    ) {
      setCompanies(cached.companies);
      setBranches(cached.branches || []);
      setFinancialYears(cached.financialYears || []);
      setEntitlements(cached.entitlements);
      setWorkspaceError(null);
      return;
    }
    refreshTenantMetadata();
  }, [token, tenantContext.companyId, refreshTenantMetadata]);

  // One live event from the server. No polling.
  // Suspended -> logout with the server reason.
  // Licence ended -> subscription popup. Licence renewed -> popup closes and the session cache updates.
  useEffect(() => {
    if (!token || !user) return;
    if (typeof window === "undefined") return;

    let es: EventSource | null = null;
    let retryTimer: number | null = null;
    let stopped = false;
    let retry = 0;

    const applySubscription = (payload: any, openPopup: boolean) => {
      const ends = payload?.subscriptionEnds ?? null;
      const isExpired = Boolean(payload?.isExpired);
      setEntitlements((prev) => {
        const next: PlanEntitlementsInfo = {
          tier: payload?.tier || prev?.tier || "TRIAL",
          name: prev?.name || payload?.tier || "Plan",
          nameGujarati: prev?.nameGujarati || prev?.name || "પ્લાન",
          maxCompanies: prev?.maxCompanies ?? 1,
          currentCount: prev?.currentCount ?? 0,
          canAddCompany: prev?.canAddCompany ?? false,
          maxBranchesPerCompany: prev?.maxBranchesPerCompany ?? 1,
          maxUsers: prev?.maxUsers ?? 1,
          subscriptionEnds: ends,
          isExpired,
          daysRemaining: Number(payload?.daysRemaining ?? prev?.daysRemaining ?? 0),
          isActive: !isExpired,
          features: prev?.features || {
            multiCompany: false,
            multiBranch: false,
            posCounter: false,
            manufacturing: false,
            distribution: false,
            gstrReconciliation: false,
            eInvoiceEWay: false,
          },
        };
        const cached = readWorkspaceCache();
        if (cached) {
          writeWorkspaceCache({ ...cached, entitlements: next });
        }
        return next;
      });
      if (!openPopup || !isExpired) {
        sessionStorage.removeItem(SUBSCRIPTION_DISMISS_KEY);
        setSubscriptionNotice(null);
        return;
      }
      setSubscriptionNotice({
        message: payload?.message || "Your subscription has ended. Renew the plan to continue billing.",
        messageGujarati: payload?.messageGujarati,
        subscriptionEnds: ends,
        daysRemaining: Number(payload?.daysRemaining ?? 0),
        tier: payload?.tier,
      });
    };

    const forceLogout = (condition: string, payload?: any) => {
      if (stopped) return;
      stopped = true;
      try {
        if (es) es.close();
      } catch {
        // ignore
      }
      try {
        sessionStorage.setItem(
          LOGOUT_NOTICE_KEY,
          JSON.stringify({
            reason: condition,
            message: payload?.message || "Your session has ended.",
            messageGujarati: payload?.messageGujarati || "",
          }),
        );
      } catch {
        // ignore
      }
      clearAuthStorage();
      window.location.replace(`/login?reason=${encodeURIComponent(condition)}`);
    };

    const connect = () => {
      if (stopped) return;
      try {
        if (es) es.close();
      } catch {
        // ignore
      }
      const baseUrl = apiClient.getBaseUrl();
      const orgId = tenantContext.organizationId || "";
      const streamUrl = `${baseUrl}/auth/session-stream?token=${encodeURIComponent(token)}&organizationId=${encodeURIComponent(orgId)}`;
      es = new EventSource(streamUrl);

      es.onopen = () => {
        retry = 0;
      };

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const condition = payload?.condition || payload?.type;
          if (!condition || condition === "PING") return;
          if (condition === "TENANT_SUSPENDED" || condition === "SESSION_REVOKED") {
            const sessionOrg = tenantContext.organizationId || "";
            const eventOrg = payload?.organizationId || "";
            const targetsThisAccount = Boolean(eventOrg && sessionOrg && eventOrg === sessionOrg);
            if (!targetsThisAccount) return;
            if (user?.role === "SUPER_ADMIN") {
              try {
                const raw = localStorage.getItem("billing_support_session");
                const support = raw ? JSON.parse(raw) : null;
                if (support?.originalToken) {
                  localStorage.setItem("billing_auth_token", support.originalToken);
                  localStorage.removeItem("billing_support_session");
                  localStorage.removeItem("billing_tenant_context");
                  window.location.replace("/");
                }
              } catch {
                // The platform admin stays signed in either way.
              }
              return;
            }
            forceLogout(condition === "TENANT_SUSPENDED" ? "suspended" : "session_revoked", payload);
            return;
          }
          if (condition === "SUBSCRIPTION_EXPIRED" || condition === "SUBSCRIPTION_ACTIVE" || condition === "TENANT_ACTIVATED") {
            const sessionOrg = tenantContext.organizationId || "";
            const eventOrg = payload?.organizationId || "";
            if (eventOrg && sessionOrg && eventOrg !== sessionOrg) return;
            if (user?.role === "SUPER_ADMIN") return;
          }
          if (condition === "SUBSCRIPTION_EXPIRED") {
            applySubscription(payload, true);
            return;
          }
          if (condition === "SUBSCRIPTION_ACTIVE" || condition === "TENANT_ACTIVATED") {
            applySubscription({ ...payload, isExpired: false }, false);
          }
        } catch {
          // Ignore malformed keep-alive frames
        }
      };

      es.onerror = () => {
        try {
          es?.close();
        } catch {
          // ignore
        }
        if (stopped) return;
        const delay = Math.min(15000, 1000 * 2 ** retry);
        retry += 1;
        retryTimer = window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      stopped = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      try {
        es?.close();
      } catch {
        // ignore
      }
    };
  }, [token, user, tenantContext.organizationId]);

  const login = async (data: {
    accessToken: string;
    user: UserProfile;
    defaultContext?: TenantContextState;
  }) => {
    const normalizedUser = {
      ...data.user,
      name: data.user.name || (data.user as any).fullName || "User",
    };
    setToken(data.accessToken);
    setUser(normalizedUser);
    const ctx = data.defaultContext || {};
    setTenantContext(ctx);
    setWorkspaceError(null);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("billing_auth_token", data.accessToken);
        localStorage.setItem(
          "billing_user_profile",
          JSON.stringify(normalizedUser),
        );
        localStorage.setItem("billing_tenant_context", JSON.stringify(ctx));
      } catch {
        // Storage failover
      }
    }

    try {
      await refreshTenantMetadata();
    } catch {
      // Ignore
    }
  };

  const patchUser = (partial: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        ...partial,
        name: partial.name || partial.fullName || prev.name,
      };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("billing_user_profile", JSON.stringify(next));
        } catch {
          // Storage failover
        }
      }
      return next;
    });
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setTenantContext({});
    setCompanies([]);
    setBranches([]);
    setFinancialYears([]);
    setEntitlements(null);
    setSubscriptionNotice(null);
    setWorkspaceError(null);
    clearAuthStorage();

    if (typeof window !== "undefined") {
      window.location.replace("/login");
    }
  };

  const dismissSubscriptionNotice = () => {
    const ends = subscriptionNotice?.subscriptionEnds || "";
    try {
      sessionStorage.setItem(SUBSCRIPTION_DISMISS_KEY, String(ends));
    } catch {
      // ignore
    }
    setSubscriptionNotice(null);
  };

  const switchCompany = async (companyId: string) => {
    // 1. Authoritative server-side context switch
    const res: any = await apiClient.post("/auth/switch-context", { companyId });
    const ctxData = res?.activeContext;

    const updated: TenantContextState = {
      organizationId: ctxData?.organizationId || tenantContext.organizationId,
      companyId: ctxData?.companyId || companyId,
      branchId: ctxData?.branchId || undefined,
      financialYearId: ctxData?.financialYearId || undefined,
    };

    setTenantContext(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("billing_tenant_context", JSON.stringify(updated));
        window.dispatchEvent(
          new CustomEvent("billing_company_switched", {
            detail: {
              companyId: updated.companyId,
              branchId: updated.branchId,
              companyName: ctxData?.companyName,
            },
          }),
        );
      } catch {
        // Ignore
      }
    }

    await refreshTenantMetadata();
  };

  const createCompany = async (dto: any) => {
    const res: any = await apiClient.post("/tenants/companies", dto);
    await refreshTenantMetadata();
    if (res?.company?.id) {
      await switchCompany(res.company.id);
    }
    return res;
  };

  const switchBranch = async (branchId: string) => {
    const updated: TenantContextState = {
      ...tenantContext,
      branchId,
    };
    setTenantContext(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("billing_tenant_context", JSON.stringify(updated));
      } catch {
        // Ignore
      }
    }
  };

  const switchFinancialYear = async (financialYearId: string) => {
    const updated: TenantContextState = {
      ...tenantContext,
      financialYearId,
    };
    setTenantContext(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("billing_tenant_context", JSON.stringify(updated));
      } catch {
        // Ignore
      }
    }
  };

  const currentCompany =
    companies.find((c) => c.id === tenantContext.companyId) ||
    companies[0] ||
    null;
  const currentBranch =
    branches.find((b) => b.id === tenantContext.branchId) ||
    branches[0] ||
    null;
  const currentFY =
    financialYears.find((f) => f.id === tenantContext.financialYearId) ||
    financialYears.find((f) => f.isCurrent) ||
    financialYears[0] ||
    null;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        isMetadataLoading,
        workspaceError,
        lang,
        setLang,
        tenantContext,
        companies,
        branches,
        financialYears,
        entitlements,
        currentCompany,
        currentBranch,
        currentFY,
        login,
        logout,
        patchUser,
        switchCompany,
        switchBranch,
        switchFinancialYear,
        refreshTenantMetadata,
        retryWorkspace,
        createCompany,
      }}
    >
      {children}
      {subscriptionNotice && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 p-6">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#C24E1D]">
              {lang === "gu" ? "સબ્સ્ક્રિપ્શન" : "Subscription"}
            </div>
            <h2 className="mt-1 text-lg font-bold text-slate-900">
              {lang === "gu" ? "લાઇસન્સ પૂરું થયું" : "Licence has ended"}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {lang === "gu"
                ? subscriptionNotice.messageGujarati || subscriptionNotice.message
                : subscriptionNotice.message}
            </p>
            <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-700 space-y-1">
              {subscriptionNotice.tier && (
                <div>
                  <span className="font-semibold">{lang === "gu" ? "પ્લાન: " : "Plan: "}</span>
                  {subscriptionNotice.tier}
                </div>
              )}
              {subscriptionNotice.subscriptionEnds && (
                <div>
                  <span className="font-semibold">{lang === "gu" ? "સમાપ્તિ: " : "Ended: "}</span>
                  {new Date(subscriptionNotice.subscriptionEnds).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              )}
              {typeof subscriptionNotice.daysRemaining === "number" && (
                <div>
                  <span className="font-semibold">{lang === "gu" ? "બાકી દિવસ: " : "Days left: "}</span>
                  {subscriptionNotice.daysRemaining}
                </div>
              )}
            </div>
            <div className="mt-5 flex gap-2">
              <a
                href="/settings/pricing"
                className="flex-1 h-10 rounded-xl bg-[#C24E1D] text-white text-sm font-semibold inline-flex items-center justify-center"
              >
                {lang === "gu" ? "પ્લાન જુઓ" : "View plans"}
              </a>
              <button
                type="button"
                onClick={dismissSubscriptionNotice}
                className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700"
              >
                {lang === "gu" ? "પછી" : "Later"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
