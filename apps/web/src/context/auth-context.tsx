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

    // Deduplicate in-flight calls
    if (inFlightRefreshRef.current) {
      return inFlightRefreshRef.current;
    }

    setIsMetadataLoading(true);

    const refreshPromise = (async () => {
      try {
        // Run tenant requests concurrently using Promise.allSettled
        const [compSettled, branchSettled, fySettled] = await Promise.allSettled([
          apiClient.get<any>("/tenants/companies"),
          apiClient.get<BranchInfo[]>("/tenants/branches"),
          apiClient.get<FinancialYearInfo[]>("/tenants/financial-years"),
        ]);

        let hasError = false;
        let lastErrorMsg = "";

        // 1. Process Companies
        if (compSettled.status === "fulfilled") {
          const res = compSettled.value;
          const compsList = Array.isArray(res) ? res : res?.companies || [];
          setCompanies(compsList);
          if (res?.entitlements) {
            setEntitlements(res.entitlements);
          }
        } else {
          hasError = true;
          lastErrorMsg = compSettled.reason?.message || "Failed to load companies";
        }

        // 2. Process Branches
        if (branchSettled.status === "fulfilled") {
          setBranches(branchSettled.value || []);
        } else {
          hasError = true;
          lastErrorMsg = branchSettled.reason?.message || "Failed to load branches";
        }

        // 3. Process Financial Years
        if (fySettled.status === "fulfilled") {
          setFinancialYears(fySettled.value || []);
        } else {
          hasError = true;
          lastErrorMsg = fySettled.reason?.message || "Failed to load financial years";
        }

        // If companies loaded, clear error even if secondary metadata had transient issue
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

  // Sync tenant metadata when authenticated and tenant context is available
  useEffect(() => {
    if (token && tenantContext.companyId) {
      refreshTenantMetadata();
    }
  }, [token, tenantContext.companyId, refreshTenantMetadata]);

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

  const logout = () => {
    setToken(null);
    setUser(null);
    setTenantContext({});
    setCompanies([]);
    setBranches([]);
    setFinancialYears([]);
    setWorkspaceError(null);

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("billing_auth_token");
        localStorage.removeItem("billing_user_profile");
        localStorage.removeItem("billing_tenant_context");
      } catch {
        // Storage failover
      }
      window.location.replace("/login");
    }
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
        switchCompany,
        switchBranch,
        switchFinancialYear,
        refreshTenantMetadata,
        retryWorkspace,
        createCompany,
      }}
    >
      {children}
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
