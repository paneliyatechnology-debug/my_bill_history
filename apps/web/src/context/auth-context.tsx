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
      // 1. Fetch companies
      const comps = await apiClient.get<CompanyInfo[]>("/tenants/companies");
      setCompanies(comps || []);

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
    const updated: TenantContextState = {
      ...tenantContext,
      companyId,
    };
    setTenantContext(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("billing_tenant_context", JSON.stringify(updated));
    }
    await refreshTenantMetadata();
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
        currentCompany,
        currentBranch,
        currentFY,
        login,
        logout,
        switchCompany,
        switchBranch,
        switchFinancialYear,
        refreshTenantMetadata,
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
