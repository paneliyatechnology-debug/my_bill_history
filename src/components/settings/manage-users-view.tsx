"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../context/auth-context";
import { apiClient } from "../../lib/api-client";

// ============================================================================
// Types
// ============================================================================
export type UserRoleType =
  | "Admin"
  | "Partner"
  | "Salesman"
  | "Stock Manager"
  | "Delivery Boy"
  | "CA"
  | "Cashier"
  | "Accountant";

export interface ManagedUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRoleType;
  branch: string;
  status: "Active" | "Inactive";
  activitiesCount?: number;
  lastActive?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userName: string;
  userRole: string;
  action: string;
  timestamp: string;
  details: string;
}

export default function ManageUsersView() {
  const { user, lang, currentCompany, tenantContext, branches } = useAuth();

  // Strict organization-scoped storage keys
  const orgId = tenantContext?.organizationId || currentCompany?.id || "default_org";
  const STORAGE_KEY = `myownbillbook_users_org_${orgId}`;
  const ACTIVITIES_KEY = `myownbillbook_activities_org_${orgId}`;

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("ALL");

  // Modals
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddCaModal, setShowAddCaModal] = useState(false);
  const [showActivitiesModal, setShowActivitiesModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Form states
  const [newUserName, setNewUserName] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRoleType>("Salesman");
  const [newUserBranch, setNewUserBranch] = useState("All Branches");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // CA Form states
  const [caName, setCaName] = useState("");
  const [caPhone, setCaPhone] = useState("");
  const [caFirm, setCaFirm] = useState("");

  // Helper to map UI role to UserRole enum
  const mapUiRoleToBackend = (role: UserRoleType): string => {
    switch (role) {
      case "Admin":
      case "Partner":
        return "COMPANY_ADMIN";
      case "Salesman":
        return "SALESMAN";
      case "Stock Manager":
        return "BRANCH_MANAGER";
      case "CA":
      case "Accountant":
        return "ACCOUNTANT";
      case "Cashier":
      case "Delivery Boy":
      default:
        return "CASHIER";
    }
  };

  // Helper to map backend role to UI display
  const mapBackendRoleToUi = (role: string): UserRoleType => {
    if (role === "COMPANY_ADMIN" || role === "ORG_ADMIN" || role === "SUPER_ADMIN") return "Admin";
    if (role === "SALESMAN") return "Salesman";
    if (role === "BRANCH_MANAGER") return "Stock Manager";
    if (role === "ACCOUNTANT") return "Accountant";
    if (role === "AUDITOR") return "CA";
    return "Cashier";
  };

  // Fetch organization users from backend API with organization-scoped localStorage fallback
  const fetchOrganizationUsers = useCallback(async () => {
    setIsLoading(true);
    let loadedUsers: ManagedUser[] = [];

    try {
      const response = await apiClient.get<any[]>("/tenants/users");
      if (Array.isArray(response) && response.length > 0) {
        loadedUsers = response.map((u) => ({
          id: u.id,
          name: u.name || u.fullName,
          phone: u.phone,
          email: u.email,
          role: mapBackendRoleToUi(u.role),
          branch: u.branch || "All Branches",
          status: u.status === "Inactive" ? "Inactive" : "Active",
          activitiesCount: 0,
          lastActive: "Active",
          createdAt: u.createdAt || new Date().toISOString(),
        }));
      }
    } catch {
      // Fallback to organization-scoped localStorage
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loadedUsers = parsed;
          }
        }
      } catch {}
    }

    // If no users exist yet in this organization, initialize ONLY with the current authenticated user as Owner/Admin
    if (loadedUsers.length === 0 && user) {
      const ownerUser: ManagedUser = {
        id: user.id || `owner_${orgId}`,
        name: user.fullName || user.name || "Organization Owner",
        phone: user.phone || "",
        email: user.email || undefined,
        role: "Admin",
        branch: "All Branches",
        status: "Active",
        activitiesCount: 0,
        lastActive: "Just now",
        createdAt: new Date().toISOString(),
      };
      loadedUsers = [ownerUser];
    }

    setUsers(loadedUsers);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loadedUsers));
    } catch {}

    // Fetch activities
    try {
      const actRes = await apiClient.get<any[]>("/tenants/activities");
      if (Array.isArray(actRes)) {
        setActivities(actRes);
        localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(actRes));
      } else {
        const storedAct = localStorage.getItem(ACTIVITIES_KEY);
        setActivities(storedAct ? JSON.parse(storedAct) : []);
      }
    } catch {
      const storedAct = localStorage.getItem(ACTIVITIES_KEY);
      setActivities(storedAct ? JSON.parse(storedAct) : []);
    }

    setIsLoading(false);
  }, [STORAGE_KEY, ACTIVITIES_KEY, orgId, user]);

  // Load on mount and when organization/company changes
  useEffect(() => {
    fetchOrganizationUsers();
  }, [fetchOrganizationUsers]);

  // Save users helper
  const saveUsersList = (updated: ManagedUser[]) => {
    setUsers(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Add User submit
  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) {
      setFormError(lang === "gu" ? "કૃપા કરીને નામ દાખલ કરો" : "Please enter user name");
      return;
    }
    if (!newUserPhone.trim() || newUserPhone.length < 10) {
      setFormError(lang === "gu" ? "માન્ય 10 અંકનો મોબાઈલ દાખલ કરો" : "Please enter valid 10-digit mobile");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    const backendRole = mapUiRoleToBackend(newUserRole);

    try {
      await apiClient.post("/tenants/users", {
        name: newUserName.trim(),
        phone: newUserPhone.trim(),
        email: newUserEmail.trim() || undefined,
        role: backendRole,
      });
    } catch (err: any) {
      console.warn("Could not save to API, saving to organization storage", err);
    }

    const newUser: ManagedUser = {
      id: `usr_${Date.now()}`,
      name: newUserName.trim(),
      phone: newUserPhone.trim(),
      email: newUserEmail.trim() || undefined,
      role: newUserRole,
      branch: newUserBranch,
      status: "Active",
      activitiesCount: 0,
      lastActive: "Just added",
      createdAt: new Date().toISOString(),
    };

    saveUsersList([...users, newUser]);

    // Record activity
    const newLog: ActivityLog = {
      id: `act_${Date.now()}`,
      userName: user?.fullName || user?.name || "Admin",
      userRole: "Admin",
      action: `Added user ${newUser.name} (${newUser.role})`,
      timestamp: "Just now",
      details: `Mobile: ${newUser.phone}`,
    };
    const updatedActivities = [newLog, ...activities];
    setActivities(updatedActivities);
    try {
      localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(updatedActivities));
    } catch {}

    // Reset & close
    setNewUserName("");
    setNewUserPhone("");
    setNewUserEmail("");
    setNewUserRole("Salesman");
    setFormError("");
    setIsSubmitting(false);
    setShowAddUserModal(false);
  };

  // Add CA submit
  const handleAddCaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caName.trim() || !caPhone.trim()) return;

    try {
      await apiClient.post("/tenants/users", {
        name: `CA ${caName.trim()}`,
        phone: caPhone.trim(),
        role: "AUDITOR",
      });
    } catch (err) {
      console.warn("Could not save CA to API", err);
    }

    const newCa: ManagedUser = {
      id: `usr_${Date.now()}`,
      name: `CA ${caName.trim()}`,
      phone: caPhone.trim(),
      role: "CA",
      branch: "All Branches",
      status: "Active",
      activitiesCount: 0,
      lastActive: "Invited",
      createdAt: new Date().toISOString(),
    };

    saveUsersList([...users, newCa]);
    setCaName("");
    setCaPhone("");
    setCaFirm("");
    setShowAddCaModal(false);
  };

  const toggleUserStatus = async (id: string) => {
    const targetUser = users.find((u) => u.id === id);
    if (!targetUser || targetUser.role === "Admin") return;

    const newStatus = targetUser.status === "Active" ? "Inactive" : "Active";

    try {
      await apiClient.patch(`/tenants/users/${id}`, {
        isActive: newStatus === "Active",
      });
    } catch {}

    const updated = users.map((u) => {
      if (u.id === id) {
        return {
          ...u,
          status: newStatus as "Active" | "Inactive",
        };
      }
      return u;
    });
    saveUsersList(updated);
  };

  const handleRoleChange = async (id: string, newRole: UserRoleType) => {
    try {
      await apiClient.patch(`/tenants/users/${id}`, {
        role: mapUiRoleToBackend(newRole),
      });
    } catch {}

    const updated = users.map((u) => (u.id === id ? { ...u, role: newRole } : u));
    saveUsersList(updated);
  };

  const removeUser = async (id: string) => {
    if (confirm(lang === "gu" ? "શું તમે ખરેખર આ યુઝરને દૂર કરવા માંગો છો?" : "Are you sure you want to remove this user?")) {
      try {
        await apiClient.delete(`/tenants/users/${id}`);
      } catch {}

      const updated = users.filter((u) => u.id !== id);
      saveUsersList(updated);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone.includes(searchTerm) ||
        u.role.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (selectedRoleFilter === "ALL") return true;
      return u.role === selectedRoleFilter;
    });
  }, [users, searchTerm, selectedRoleFilter]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-800">
      
      {/* ================================================================= */}
      {/* 1. TOP HEADER & METRICS CARDS */}
      {/* ================================================================= */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {lang === "gu" ? "યુઝર્સ મેનેજમેન્ટ (Manage Users)" : "Manage Users"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Organization: <span className="font-semibold text-slate-700">{currentCompany?.legalName || currentCompany?.tradeName || "Current Organization"}</span>
            </p>
          </div>
          <button
            onClick={() => setShowHelpModal(true)}
            className="w-8 h-8 rounded-full border border-slate-300 text-slate-500 hover:text-indigo-600 hover:border-indigo-400 flex items-center justify-center transition-colors text-sm font-semibold shadow-2xs"
            title="Help & Role Permissions Guide"
          >
            ?
          </button>
        </div>

        {/* 2 Top metric cards matching screenshot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Number of Users card */}
          <div className="bg-white rounded-xl border-2 border-indigo-200/90 p-4 sm:p-5 shadow-2xs relative overflow-hidden">
            <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs sm:text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>{lang === "gu" ? "કુલ યુઝર્સ સંખ્યા" : "Number of Users"}</span>
            </div>
            <div className="text-3xl font-bold text-slate-900 mt-2 font-mono">
              {users.length}
            </div>
          </div>

          {/* Activities Performed card */}
          <div
            onClick={() => setShowActivitiesModal(true)}
            className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs hover:border-blue-400 transition-all cursor-pointer relative group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs sm:text-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>{lang === "gu" ? "થયેલી પ્રવૃત્તિઓ" : "Activities Performed"}</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                Last 30 Days
              </span>
            </div>
            <div className="text-3xl font-bold text-slate-900 mt-2 font-mono flex items-center justify-between">
              <span>{activities.length}</span>
              <span className="text-xs text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                View Tracker →
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ================================================================= */}
      {/* 2. CENTER VISUAL ILLUSTRATION & BANNER (Exact match to screenshot) */}
      {/* ================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col items-center text-center relative overflow-hidden">
        
        {/* Role Hierarchy Illustration Container */}
        <div className="w-full max-w-2xl py-4 relative">
          
          <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-6 relative">
            
            {/* Root: Admin */}
            <div className="md:col-span-4 flex flex-col items-center">
              <div className="relative p-1 rounded-2xl border-2 border-emerald-500/80 bg-emerald-50/40 shadow-xs">
                <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center text-3xl shadow-2xs">
                  👨‍💼
                </div>
                <div className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-1 rounded-full shadow-xs" title="Full Vision">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
              </div>
              <span className="font-bold text-xs sm:text-sm text-slate-800 mt-2">Admin</span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full mt-0.5">
                Full Vision
              </span>
            </div>

            {/* Connecting lines indicator */}
            <div className="hidden md:flex md:col-span-1 justify-center text-slate-300 text-xl font-light">
              ➔
            </div>

            {/* Target Role Cards Grid */}
            <div className="md:col-span-7 grid grid-cols-2 gap-3 text-left">
              
              {/* Partner */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center gap-3 shadow-2xs">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-xl shadow-2xs border border-slate-100 shrink-0">
                  🤝
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-800">Partner</div>
                  <div className="text-[10px] text-slate-500">Co-owner access</div>
                </div>
              </div>

              {/* Salesman */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center gap-3 shadow-2xs relative">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-xl shadow-2xs border border-slate-100 shrink-0">
                  💼
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-800">Salesman</div>
                  <div className="text-[10px] text-amber-700 font-medium">Daybook Report</div>
                </div>
              </div>

              {/* Stock Manager */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center gap-3 shadow-2xs">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-xl shadow-2xs border border-slate-100 shrink-0">
                  📦
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-800">Stock Manager</div>
                  <div className="text-[10px] text-blue-600 font-medium">Activity Tracker</div>
                </div>
              </div>

              {/* Delivery Boy */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center gap-3 shadow-2xs">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-xl shadow-2xs border border-slate-100 shrink-0">
                  🛵
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-800">Delivery Boy</div>
                  <div className="text-[10px] text-slate-500">Challan & Receipt</div>
                </div>
              </div>

              {/* CA */}
              <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/50 flex items-center gap-3 shadow-2xs col-span-2">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-xl shadow-2xs border border-indigo-100 shrink-0">
                  💻
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-indigo-950">Chartered Accountant (CA)</div>
                    <div className="text-[10px] text-indigo-700">Audit, GST & Balance Sheet Only</div>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-200">
                    Read Only
                  </span>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Text and CTA Buttons */}
        <div className="mt-4 max-w-lg">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            {lang === "gu"
              ? "યુઝર્સને એક્સેસ આપો અને તેમની ક્રિયાઓ પર નજર રાખો"
              : "Give access to users and monitor their actions"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {lang === "gu"
              ? "સંપૂર્ણ નિયંત્રણ અને પારદર્શિતા સાથે તમારા વ્યવસાયનું સંચાલન કરો"
              : "Manage your business more efficiently with full control and vision"}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
            <button
              onClick={() => {
                setFormError("");
                setShowAddUserModal(true);
              }}
              className="px-5 py-2.5 bg-[#4c3cce] hover:bg-[#3f31b5] text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>{lang === "gu" ? "+ નવો યુઝર ઉમેરો" : "+ Add New User"}</span>
            </button>

            <button
              onClick={() => setShowAddCaModal(true)}
              className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 shadow-2xs cursor-pointer"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>{lang === "gu" ? "+ તમારા CA ઉમેરો" : "+ Add Your CA"}</span>
            </button>
          </div>
        </div>

      </div>

      {/* ================================================================= */}
      {/* 3. USERS DIRECTORY TABLE */}
      {/* ================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Table Filters Header */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={lang === "gu" ? "નામ, મોબાઈલ અથવા રોલ શોધો..." : "Search user by name, phone..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
            {["ALL", "Admin", "Salesman", "Stock Manager", "CA", "Delivery Boy", "Cashier"].map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRoleFilter(role)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedRoleFilter === role
                    ? "bg-[#4c3cce] text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 sm:px-6">{lang === "gu" ? "યુઝર નામ" : "USER NAME"}</th>
                <th className="py-3.5 px-4">{lang === "gu" ? "મોબાઇલ (LOGIN ID)" : "PHONE (LOGIN ID)"}</th>
                <th className="py-3.5 px-4">{lang === "gu" ? "સોંપેલ રોલ" : "ASSIGNED ROLE"}</th>
                <th className="py-3.5 px-4">{lang === "gu" ? "શાખા એક્સેસ" : "BRANCH ACCESS"}</th>
                <th className="py-3.5 px-4 text-center">{lang === "gu" ? "સ્થિતિ" : "STATUS"}</th>
                <th className="py-3.5 px-4 text-right">{lang === "gu" ? "ક્રિયા" : "ACTIONS"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <p className="font-medium text-slate-600">
                        {lang === "gu" ? "આ ઓર્ગેનાઇઝેશનમાં કોઈ વધારાના યુઝર્સ નથી" : "No users found in this organization"}
                      </p>
                      <button
                        onClick={() => setShowAddUserModal(true)}
                        className="text-xs text-indigo-600 font-semibold hover:underline"
                      >
                        + Add Team Member
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    
                    {/* Name */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{u.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {u.email || (u.lastActive ? `Active: ${u.lastActive}` : "Active")}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      {u.phone || "—"}
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      {u.role === "Admin" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          👑 Owner (Admin)
                        </span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRoleType)}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="Partner">Partner</option>
                          <option value="Salesman">Salesman (Daybook & Billing)</option>
                          <option value="Stock Manager">Stock Manager (Inventory)</option>
                          <option value="Delivery Boy">Delivery Boy (Challan)</option>
                          <option value="CA">Chartered Accountant (CA)</option>
                          <option value="Cashier">Cashier</option>
                        </select>
                      )}
                    </td>

                    {/* Branch */}
                    <td className="py-3.5 px-4">
                      <span className="text-slate-600 font-medium">
                        {u.branch || "All Branches"}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        disabled={u.role === "Admin"}
                        onClick={() => toggleUserStatus(u.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
                          u.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.status === "Active" ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                        <span>{u.status}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      {u.role !== "Admin" && (
                        <button
                          type="button"
                          onClick={() => removeUser(u.id)}
                          className="text-rose-600 hover:text-rose-800 text-xs font-semibold px-2 py-1 rounded hover:bg-rose-50"
                        >
                          Remove
                        </button>
                      )}
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* ================================================================= */}
      {/* MODAL: ADD NEW USER */}
      {/* ================================================================= */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                {lang === "gu" ? "નવા યુઝર ઉમેરો" : "Add New User"}
              </h2>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Bhai Patel"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4c3cce]/20 focus:border-[#4c3cce]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number (Login ID) *
                </label>
                <div className="flex rounded-lg border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-[#4c3cce]/20 focus-within:border-[#4c3cce]">
                  <span className="px-3 py-2 bg-slate-50 text-slate-500 text-xs sm:text-sm border-r border-slate-300 font-mono">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="98XXXXXXXX"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value.replace(/\D/g, ""))}
                    className="w-full text-xs sm:text-sm px-3 py-2 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="user@business.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Role & Permissions *
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRoleType)}
                    className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none bg-white"
                  >
                    <option value="Salesman">Salesman (Bills & Orders)</option>
                    <option value="Partner">Partner (Co-owner)</option>
                    <option value="Stock Manager">Stock Manager (Godown)</option>
                    <option value="Delivery Boy">Delivery Boy (Challan)</option>
                    <option value="CA">Chartered Accountant (CA)</option>
                    <option value="Cashier">Cashier</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Store / Branch Access
                  </label>
                  <select
                    value={newUserBranch}
                    onChange={(e) => setNewUserBranch(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none bg-white"
                  >
                    <option value="All Branches">All Branches</option>
                    {branches && branches.map((b) => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Role description banner */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                <span className="font-semibold text-slate-900">Permissions preview: </span>
                {newUserRole === "Salesman" && "Can generate sales invoices, quotations, and view daily sales. Item purchase costs and net profit are hidden."}
                {newUserRole === "Partner" && "Full administrative control, business performance reports, ledgers, and settings."}
                {newUserRole === "Stock Manager" && "Inventory management, godown transfers, stock-in/out, and purchase order receipts."}
                {newUserRole === "Delivery Boy" && "Delivery challan tracking, customer drop-off verification, and collection receipts."}
                {newUserRole === "CA" && "Read-only access to GSTR-1, GSTR-3B, Balance Sheet, Profit & Loss, and Daybook audit."}
                {newUserRole === "Cashier" && "Fast counter billing, cash drawer receipts, and receipt printing."}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#4c3cce] hover:bg-[#3f31b5] text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Adding..." : "Add User"}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: ADD YOUR CA */}
      {/* ================================================================= */}
      {showAddCaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                {lang === "gu" ? "તમારા CA ને ઇન્વાઇટ કરો" : "Invite Your Chartered Accountant (CA)"}
              </h2>
              <button onClick={() => setShowAddCaModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCaSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CA Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. keyur sangani & Associates"
                  value={caName}
                  onChange={(e) => setCaName(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CA Mobile Number *
                </label>
                <div className="flex rounded-lg border border-slate-300 overflow-hidden">
                  <span className="px-3 py-2 bg-slate-50 text-slate-500 text-xs sm:text-sm border-r border-slate-300 font-mono">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="9898XXXXXX"
                    value={caPhone}
                    onChange={(e) => setCaPhone(e.target.value.replace(/\D/g, ""))}
                    className="w-full text-xs sm:text-sm px-3 py-2 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Firm Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sangani & Co. Chartered Accountants"
                  value={caFirm}
                  onChange={(e) => setCaFirm(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900">
                🔒 Your CA gets secure <strong>Read-Only Access</strong> to GSTR-1, GSTR-3B, Balance Sheet, and Ledgers without access to create or delete bills.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCaModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#4c3cce] hover:bg-[#3f31b5] text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Send Invite & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: ACTIVITIES TRACKER DRAWER */}
      {/* ================================================================= */}
      {showActivitiesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  ⚡
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Activity Tracker</h2>
                  <p className="text-xs text-slate-500">Audit logs of team operations</p>
                </div>
              </div>
              <button onClick={() => setShowActivitiesModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-3">
              {activities.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No activity logs recorded yet for this organization.
                </div>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{act.userName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{act.timestamp}</span>
                    </div>
                    <div className="font-semibold text-indigo-700 mt-1">{act.action}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{act.details}</div>
                  </div>
                ))
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-100 text-right">
              <button
                onClick={() => setShowActivitiesModal(false)}
                className="px-4 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: ROLE PERMISSIONS GUIDE */}
      {/* ================================================================= */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Role & Access Guide</h2>
              <button onClick={() => setShowHelpModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                <strong>👑 Admin / Partner:</strong> Full access to all billing, purchases, settings, user permissions, and financial profit calculations.
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                <strong>💼 Salesman:</strong> Can issue sales invoices, delivery challans, and quotations. Purchase rate and net profit are completely hidden.
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                <strong>📦 Stock Manager:</strong> Can manage godowns, inventory adjustments, batch numbers, and purchase inward bills.
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                <strong>🛵 Delivery Boy:</strong> Can view assigned delivery orders, verify customer deliveries, and collect cash/UPI receipts.
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                <strong>💻 Chartered Accountant (CA):</strong> Dedicated read-only access to audit registers, GSTR reports, balance sheet, and daybook.
              </div>
            </div>
            <div className="px-6 py-3 border-t border-slate-100 text-right">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-1.5 bg-[#4c3cce] text-white rounded-lg text-xs font-semibold"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
