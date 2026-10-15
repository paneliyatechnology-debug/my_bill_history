"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
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
  createCompany: (dto: any) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lang, setLangState] = useState<"en" | "gu">("en");
  const [tenantContext, setTenantContext] = useState<TenantContextState>({});

  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [financialYears, setFinancialYears] = useState<FinancialYearInfo[]>([]);
  const [entitlements, setEntitlements] = useState<PlanEntitlementsInfo | null>(null);

  const setLang = (newLang: "en" | "gu") => {
    setLangState(newLang);
    if (typeof window !== "undefined") {
      localStorage.setItem("billing_lang", newLang);
    }
  };

  const refreshTenantMetadata = useCallback(async () => {
    const storedToken = localStorage.getItem("billing_auth_token");
    if (!storedToken) return;

    try {
      // 1. Fetch companies with plan entitlements
      const res: any = await apiClient.get("/tenants/companies");
      const compsList = Array.isArray(res) ? res : (res?.companies || []);
      setCompanies(compsList);
      if (res?.entitlements) {
        setEntitlements(res.entitlements);
      }

      // 2. Fetch branches
      const brs = await apiClient.get<BranchInfo[]>("/tenants/branches");
      setBranches(brs || []);

      // 3. Fetch financial years
      const fys = await apiClient.get<FinancialYearInfo[]>(
        "/tenants/financial-years",
      );
      setFinancialYears(fys || []);
    } catch {
      // Silent error on metadata refresh if user not yet fully loaded
    }
  }, []);

  useEffect(() => {
    // Initial hydration
    if (typeof window !== "undefined") {
      const savedToken = localStorage.getItem("billing_auth_token");
      const savedUser = localStorage.getItem("billing_user_profile");
      const savedTenant = localStorage.getItem("billing_tenant_context");
      const savedLang = localStorage.getItem("billing_lang") as
        "en" | "gu" | null;

      if (savedLang) setLangState(savedLang);

      if (savedToken && savedUser) {
        setToken(savedToken);
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed && typeof parsed === "object") {
            parsed.name = parsed.name || parsed.fullName || "User";
          }
          setUser(parsed);
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
      setIsLoading(false);
    }
  }, []);

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

    if (typeof window !== "undefined") {
      localStorage.setItem("billing_auth_token", data.accessToken);
      localStorage.setItem(
        "billing_user_profile",
        JSON.stringify(normalizedUser),
      );
      localStorage.setItem("billing_tenant_context", JSON.stringify(ctx));
    }

    try {
      await refreshTenantMetadata();
    } catch {
      // ignore
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setTenantContext({});
    setCompanies([]);
    setBranches([]);
    setFinancialYears([]);

    if (typeof window !== "undefined") {
      localStorage.removeItem("billing_auth_token");
      localStorage.removeItem("billing_user_profile");
      localStorage.removeItem("billing_tenant_context");
      window.location.href = "/login";
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
      localStorage.setItem("billing_tenant_context", JSON.stringify(updated));
      // Dispatch company switched event across the application to reset caches
      window.dispatchEvent(
        new CustomEvent("billing_company_switched", {
          detail: {
            companyId: updated.companyId,
            branchId: updated.branchId,
            companyName: ctxData?.companyName,
          },
        }),
      );
    }

    // Refresh branches and financial years for the newly selected company
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
      localStorage.setItem("billing_tenant_context", JSON.stringify(updated));
    }
  };

  const switchFinancialYear = async (financialYearId: string) => {
    const updated: TenantContextState = {
      ...tenantContext,
      financialYearId,
    };
    setTenantContext(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("billing_tenant_context", JSON.stringify(updated));
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
