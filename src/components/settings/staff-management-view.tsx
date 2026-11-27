"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../context/auth-context";
import { apiClient } from "../../lib/api-client";
import { CustomSelect } from "@/components/ui/dropdown-system";
import {
  PERMISSION_MODULE_GROUPS,
  extractPermissionMatrix,
} from "../../lib/permissions-catalog";
import {
  Users,
  User,
  Shield,
  Plus,
  Pencil,
  Key,
  LogOut,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  X,
  AlertTriangle,
  Building2,
  Lock,
  UserCheck,
  UserX,
} from "lucide-react";

export interface StaffUser {
  id: string;
  fullName: string;
  name?: string;
  phone: string;
  email?: string;
  username?: string;
  role: string;
  customRoleId?: string;
  customRoleName?: string;
  isActive: boolean;
  status?: "Active" | "Inactive";
  dataScope: "OWN_RECORDS" | "ASSIGNED_BRANCH" | "ALL_ORGANIZATION";
  maxInvoiceAmount?: number | null;
  maxDiscountPercent?: number | null;
  canOverridePrice?: boolean;
  branches: Array<{ id: string; name: string; code: string; isDefault?: boolean }>;
  createdAt?: string;
}

export interface CustomRole {
  id: string;
  name: string;
  isSystem?: boolean;
  isPredefined?: boolean;
}

export default function StaffManagementView() {
  const { lang, branches } = useAuth();

  const [users, setUsers] = useState<StaffUser[]>([]);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Status banner alerts
  const [actionSuccessMessage, setActionSuccessMessage] = useState("");
  const [actionErrorMessage, setActionErrorMessage] = useState("");

  const showSuccess = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(""), 5000);
  };
  const showError = (msg: string) => {
    setActionErrorMessage(msg);
    setTimeout(() => setActionErrorMessage(""), 7000);
  };

  // Filters
  const [staffSearchTerm, setStaffSearchTerm] = useState("");
  const [staffRoleFilter, setStaffRoleFilter] = useState<string>("ALL");
  const [staffBranchFilter, setStaffBranchFilter] = useState<string>("ALL");
  const [staffStatusFilter, setStaffStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Modals
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaffItem, setEditingStaffItem] = useState<StaffUser | null>(null);
  const [staffForm, setStaffForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    username: "",
    password: "",
    role: "SALESMAN",
    customRoleId: "",
    branchIds: [] as string[],
    dataScope: "OWN_RECORDS" as "OWN_RECORDS" | "ASSIGNED_BRANCH" | "ALL_ORGANIZATION",
    maxInvoiceAmount: "",
    maxDiscountPercent: "",
    canOverridePrice: false,
  });

  const [resetPasswordStaff, setResetPasswordStaff] = useState<StaffUser | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState("");

  const [overridingStaff, setOverridingStaff] = useState<StaffUser | null>(null);
  const [staffOverrideMatrix, setStaffOverrideMatrix] = useState<Record<string, Record<string, boolean | null>>>({});
  const [isSavingOverrides, setIsSavingOverrides] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.allSettled([
        apiClient.get<any[]>("/api/v1/users"),
        apiClient.get<any[]>("/api/v1/roles"),
      ]);

      if (usersRes.status === "fulfilled" && Array.isArray(usersRes.value)) {
        setUsers(usersRes.value);
      } else {
        try {
          const fallbackUsers = await apiClient.get<any[]>("/tenants/users");
          if (Array.isArray(fallbackUsers)) setUsers(fallbackUsers);
        } catch {}
      }

      if (rolesRes.status === "fulfilled" && Array.isArray(rolesRes.value)) {
        setRoles(rolesRes.value);
      }
    } catch (err: any) {
      console.error("Error loading staff data:", err);
      showError(err?.message || "Failed to load staff list.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalStaff = users.length;
    const activeStaff = users.filter((u) => u.isActive !== false).length;
    const inactiveStaff = users.filter((u) => u.isActive === false).length;
    const uniqueRolesCount = new Set(users.map((u) => u.customRoleName || u.role)).size;

    return { totalStaff, activeStaff, inactiveStaff, uniqueRolesCount };
  }, [users]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (staffSearchTerm.trim()) {
        const q = staffSearchTerm.toLowerCase();
        const n = (u.fullName || u.name || "").toLowerCase();
        const p = (u.phone || "").toLowerCase();
        const e = (u.email || "").toLowerCase();
        const un = (u.username || "").toLowerCase();
        if (!n.includes(q) && !p.includes(q) && !e.includes(q) && !un.includes(q)) return false;
      }
      if (staffRoleFilter !== "ALL") {
        const matchCustom = u.customRoleName === staffRoleFilter;
        const matchSys = u.role === staffRoleFilter;
        if (!matchCustom && !matchSys) return false;
      }
      if (staffBranchFilter !== "ALL") {
        if (!u.branches || !u.branches.some((b) => b.id === staffBranchFilter || b.name === staffBranchFilter)) {
          return false;
        }
      }
      if (staffStatusFilter === "ACTIVE" && u.isActive === false) return false;
      if (staffStatusFilter === "INACTIVE" && u.isActive !== false) return false;
      return true;
    });
  }, [users, staffSearchTerm, staffRoleFilter, staffBranchFilter, staffStatusFilter]);

  // Staff Modal Actions
  const openAddStaffModal = () => {
    setEditingStaffItem(null);
    setStaffForm({
      fullName: "",
      phone: "",
      email: "",
      username: "",
      password: "",
      role: "SALESMAN",
      customRoleId: "",
      branchIds: branches?.[0] ? [branches[0].id] : [],
      dataScope: "OWN_RECORDS",
      maxInvoiceAmount: "",
      maxDiscountPercent: "",
      canOverridePrice: false,
    });
    setShowStaffModal(true);
  };

  const openEditStaffModal = (staff: StaffUser) => {
    setEditingStaffItem(staff);
    setStaffForm({
      fullName: staff.fullName || staff.name || "",
      phone: staff.phone,
      email: staff.email || "",
      username: staff.username || "",
      password: "",
      role: staff.role,
      customRoleId: staff.customRoleId || "",
      branchIds: staff.branches.map((b) => b.id),
      dataScope: staff.dataScope || "ALL_ORGANIZATION",
      maxInvoiceAmount: staff.maxInvoiceAmount ? String(staff.maxInvoiceAmount) : "",
      maxDiscountPercent: staff.maxDiscountPercent ? String(staff.maxDiscountPercent) : "",
      canOverridePrice: staff.canOverridePrice ?? true,
    });
    setShowStaffModal(true);
  };

  const handleStaffFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.fullName.trim() || !staffForm.phone.trim()) {
      showError("Please enter full name and mobile number.");
      return;
    }

    try {
      const payload: any = {
        fullName: staffForm.fullName.trim(),
        phone: staffForm.phone.trim(),
        email: staffForm.email.trim() || undefined,
        username: staffForm.username.trim() || undefined,
        role: staffForm.customRoleId ? "CUSTOM" : staffForm.role,
        customRoleId: staffForm.customRoleId || undefined,
        branchIds: staffForm.branchIds,
        dataScope: staffForm.dataScope,
        maxInvoiceAmount: staffForm.maxInvoiceAmount ? parseFloat(staffForm.maxInvoiceAmount) : null,
        maxDiscountPercent: staffForm.maxDiscountPercent ? parseFloat(staffForm.maxDiscountPercent) : null,
        canOverridePrice: staffForm.canOverridePrice,
      };

      if (!editingStaffItem) {
        payload.password = staffForm.password.trim() || staffForm.phone.trim();
        await apiClient.post("/api/v1/users", payload);
        showSuccess("Staff account created successfully.");
      } else {
        if (staffForm.password.trim()) {
          payload.password = staffForm.password.trim();
        }
        await apiClient.put(`/api/v1/users/${editingStaffItem.id}`, payload);
        showSuccess("Staff details updated successfully.");
      }

      setShowStaffModal(false);
      await fetchData();
    } catch (err: any) {
      showError(err?.message || "Failed to save staff account.");
    }
  };

  const handleToggleStaffStatus = async (staff: StaffUser) => {
    if (staff.role === "ORG_ADMIN" || staff.role === "SUPER_ADMIN" || staff.role === "COMPANY_ADMIN") return;
    try {
      await apiClient.patch(`/api/v1/users/${staff.id}/status`, {
        isActive: !staff.isActive,
      });
      showSuccess(`Staff "${staff.fullName}" ${!staff.isActive ? "activated" : "deactivated"}.`);
      await fetchData();
    } catch (err: any) {
      showError(err?.message || "Failed to update staff status.");
    }
  };

  const handleRevokeStaffSessions = async (staff: StaffUser) => {
    if (!confirm(`Revoke all active login sessions for ${staff.fullName}?`)) return;
    try {
      await apiClient.post(`/api/v1/users/${staff.id}/revoke-sessions`, {});
      showSuccess(`All active sessions revoked for ${staff.fullName}.`);
    } catch (err: any) {
      showError(err?.message || "Failed to revoke sessions.");
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordStaff || !resetPasswordVal || resetPasswordVal.length < 6) {
      showError("Password must be at least 6 characters.");
      return;
    }
    try {
      await apiClient.post(`/api/v1/users/${resetPasswordStaff.id}/reset-password`, {
        newPassword: resetPasswordVal,
      });
      showSuccess(`Password reset successfully for ${resetPasswordStaff.fullName}.`);
      setResetPasswordStaff(null);
      setResetPasswordVal("");
    } catch (err: any) {
      showError(err?.message || "Failed to reset password.");
    }
  };

  // Staff Overrides Drawer
  const openStaffOverridesDrawer = async (staff: StaffUser) => {
    setOverridingStaff(staff);
    try {
      const res = await apiClient.get<any>(`/api/v1/users/${staff.id}/permissions`);
      if (res && res.overrides) {
        const matrix: Record<string, Record<string, boolean | null>> = {};
        for (const o of res.overrides) {
          if (!matrix[o.module]) matrix[o.module] = {};
          matrix[o.module][o.action] = o.allowed;
        }
        setStaffOverrideMatrix(matrix);
      } else {
        setStaffOverrideMatrix({});
      }
    } catch (err) {
      console.error(err);
      setStaffOverrideMatrix({});
    }
  };

  const handleSetStaffOverride = (moduleId: string, actionKey: string, val: boolean | null) => {
    setStaffOverrideMatrix((prev) => {
      const mod = { ...(prev[moduleId] || {}) };
      if (val === null) {
        delete mod[actionKey];
      } else {
        mod[actionKey] = val;
      }
      return { ...prev, [moduleId]: mod };
    });
  };

  const handleSaveStaffOverrides = async () => {
    if (!overridingStaff) return;
    setIsSavingOverrides(true);
    try {
      const overrides: Array<{ module: string; action: string; allowed: boolean }> = [];
      for (const [module, actions] of Object.entries(staffOverrideMatrix)) {
        for (const [action, allowed] of Object.entries(actions)) {
          if (allowed !== null && allowed !== undefined) {
            overrides.push({ module, action, allowed: Boolean(allowed) });
          }
        }
      }

      await apiClient.put(`/api/v1/users/${overridingStaff.id}/permissions`, { overrides });
      showSuccess(`Individual permission overrides saved for ${overridingStaff.fullName}.`);
      setOverridingStaff(null);
      await fetchData();
    } catch (err: any) {
      showError(err?.message || "Failed to save overrides.");
    } finally {
      setIsSavingOverrides(false);
    }
  };

  const handleResetStaffOverrides = async () => {
    if (!overridingStaff) return;
    if (!confirm(`Reset all custom overrides for ${overridingStaff.fullName} to inherit purely from their role?`)) {
      return;
    }
    try {
      await apiClient.post(`/api/v1/users/${overridingStaff.id}/reset-permissions`, {});
      showSuccess(`Overrides reset for ${overridingStaff.fullName}. Inheriting role defaults.`);
      setStaffOverrideMatrix({});
      setOverridingStaff(null);
      await fetchData();
    } catch (err: any) {
      showError(err?.message || "Failed to reset overrides.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-12">
      {/* Toast Banner Alerts */}
      {actionSuccessMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-emerald-600 text-white rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccessMessage}</span>
          <button onClick={() => setActionSuccessMessage("")} className="ml-2 hover:opacity-75 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {actionErrorMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-rose-600 text-white rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionErrorMessage}</span>
          <button onClick={() => setActionErrorMessage("")} className="ml-2 hover:opacity-75 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
            User &amp; Staff Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create staff accounts, assign roles, designate branch access, and control data security scopes.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchData}
            disabled={isLoading}
            className="h-9 px-3.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={openAddStaffModal}
            className="h-9 px-4 bg-[#1677E8] hover:bg-[#1268D3] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff User</span>
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
        <div className="px-5 py-3.5">
          <div className="text-[11px] text-slate-500 font-medium">Total Staff</div>
          <div className="text-lg font-bold text-[#0F172A] tabular-nums mt-0.5">
            {summaryMetrics.totalStaff}
          </div>
        </div>

        <div className="px-5 py-3.5">
          <div className="text-[11px] text-slate-500 font-medium">Active</div>
          <div className="text-lg font-bold text-emerald-700 tabular-nums mt-0.5">
            {summaryMetrics.activeStaff}
          </div>
        </div>

        <div className="px-5 py-3.5">
          <div className="text-[11px] text-slate-500 font-medium">Inactive</div>
          <div className="text-lg font-bold text-slate-600 tabular-nums mt-0.5">
            {summaryMetrics.inactiveStaff}
          </div>
        </div>

        <div className="px-5 py-3.5">
          <div className="text-[11px] text-slate-500 font-medium">Roles</div>
          <div className="text-lg font-bold text-[#0F172A] tabular-nums mt-0.5">
            {summaryMetrics.uniqueRolesCount}
          </div>
        </div>
      </div>

      {/* Unified Staff Directory Card (Toolbar + Table) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Filter Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, phone, email, username..."
              value={staffSearchTerm}
              onChange={(e) => setStaffSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-40">
              <CustomSelect
                size="sm"
                value={staffRoleFilter}
                onChange={(val) => setStaffRoleFilter(val)}
                options={[
                  { value: "ALL", label: "All Roles" },
                  ...roles.map((r) => ({ value: r.name, label: r.name })),
                ]}
              />
            </div>

            {branches && branches.length > 0 && (
              <div className="w-40">
                <CustomSelect
                  size="sm"
                  value={staffBranchFilter}
                  onChange={(val) => setStaffBranchFilter(val)}
                  options={[
                    { value: "ALL", label: "All Branches" },
                    ...branches.map((b) => ({ value: b.id, label: b.name })),
                  ]}
                />
              </div>
            )}

            <div className="w-32">
              <CustomSelect
                size="sm"
                value={staffStatusFilter}
                onChange={(val) => setStaffStatusFilter(val as any)}
                options={[
                  { value: "ALL", label: "All Status" },
                  { value: "ACTIVE", label: "Active" },
                  { value: "INACTIVE", label: "Inactive" },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Staff Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-10 text-center">#</th>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Branch Access</th>
                <th className="py-3 px-4 text-center">Data Scope</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No matching staff members found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((staff, idx) => (
                  <tr key={staff.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 text-center text-slate-400 font-medium tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-semibold flex items-center justify-center text-xs shrink-0">
                          {(staff.fullName || staff.name || "U").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-[13px]">{staff.fullName || staff.name}</div>
                          <div className="text-[11px] text-slate-500 tabular-nums">
                            {staff.phone} {staff.username ? `• @${staff.username}` : ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 font-medium text-xs">
                      {staff.customRoleName ||
                        (staff.role === "COMPANY_ADMIN"
                          ? "Company Admin"
                          : staff.role?.replace(/_/g, " "))}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs">
                      {staff.branches && staff.branches.length > 0
                        ? staff.branches.map((b) => b.name).join(", ")
                        : "All Branches"}
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-600 text-xs">
                      {staff.dataScope === "ALL_ORGANIZATION"
                        ? "All Company"
                        : staff.dataScope === "ASSIGNED_BRANCH"
                        ? "Assigned Branch"
                        : "Own Records"}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStaffStatus(staff)}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer hover:underline ${
                          staff.isActive ? "text-emerald-700" : "text-slate-500"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            staff.isActive ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        {staff.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditStaffModal(staff)}
                          className="w-8 h-8 inline-flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Staff Details"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => openStaffOverridesDrawer(staff)}
                          className="w-8 h-8 inline-flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Configure Custom Overrides"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setResetPasswordStaff(staff);
                            setResetPasswordVal("");
                          }}
                          className="w-8 h-8 inline-flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="Reset Password"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRevokeStaffSessions(staff)}
                          className="w-8 h-8 inline-flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Revoke Active Sessions"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD / EDIT STAFF MEMBER */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#1677E8]" />
                {editingStaffItem ? `Edit Staff: ${editingStaffItem.fullName || editingStaffItem.name}` : "Add Staff Member"}
              </h2>
              <button
                type="button"
                onClick={() => setShowStaffModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStaffFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patel"
                    value={staffForm.fullName}
                    onChange={(e) => setStaffForm({ ...staffForm, fullName: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#1677E8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile"
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#1677E8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="ramesh@example.com"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#1677E8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Login Username</label>
                  <input
                    type="text"
                    placeholder="ramesh_sales"
                    value={staffForm.username}
                    onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#1677E8]"
                  />
                </div>
              </div>

              {!editingStaffItem && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Initial Password (defaults to mobile number)
                  </label>
                  <input
                    type="password"
                    placeholder="Leave empty to use phone number as password"
                    value={staffForm.password}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#1677E8]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Role *</label>
                <select
                  value={staffForm.customRoleId ? `CUSTOM:${staffForm.customRoleId}` : staffForm.role}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.startsWith("CUSTOM:")) {
                      setStaffForm({
                        ...staffForm,
                        role: "CUSTOM",
                        customRoleId: val.replace("CUSTOM:", ""),
                      });
                    } else {
                      setStaffForm({
                        ...staffForm,
                        role: val,
                        customRoleId: "",
                      });
                    }
                  }}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#1677E8]"
                >
                  <optgroup label="System Roles">
                    <option value="SALESMAN">Salesman</option>
                    <option value="ACCOUNTANT">Accountant</option>
                    <option value="STOCK_MANAGER">Stock Manager</option>
                    <option value="CASHIER">Cashier</option>
                    <option value="DELIVERY_BOY">Delivery Boy</option>
                    <option value="PARTNER">Partner</option>
                    <option value="AUDITOR">Auditor / CA</option>
                  </optgroup>
                  {roles.filter((r) => !r.isPredefined && !r.isSystem).length > 0 && (
                    <optgroup label="Custom Roles">
                      {roles
                        .filter((r) => !r.isPredefined && !r.isSystem)
                        .map((r) => (
                          <option key={r.id} value={`CUSTOM:${r.id}`}>
                            {r.name}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Data Access Scope</label>
                <select
                  value={staffForm.dataScope}
                  onChange={(e) => setStaffForm({ ...staffForm, dataScope: e.target.value as any })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#1677E8]"
                >
                  <option value="ALL_ORGANIZATION">All Company Data</option>
                  <option value="ASSIGNED_BRANCH">Assigned Branch Only</option>
                  <option value="OWN_RECORDS">Own Created Records Only</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1677E8] hover:bg-[#1268D3] text-white text-xs font-semibold rounded-xl shadow-2xs"
                >
                  {editingStaffItem ? "Update Staff" : "Create Staff Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESET PASSWORD */}
      {resetPasswordStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <Key className="w-5 h-5" />
            </div>

            <h3 className="text-sm font-bold text-slate-900 text-center mb-1">
              Reset Password for {resetPasswordStaff.fullName || resetPasswordStaff.name}
            </h3>
            <p className="text-xs text-slate-500 text-center mb-4">
              Enter a new secure password (minimum 6 characters).
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <input
                type="password"
                required
                minLength={6}
                placeholder="New password..."
                value={resetPasswordVal}
                onChange={(e) => setResetPasswordVal(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#1677E8]"
              />

              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordStaff(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1677E8] hover:bg-[#1268D3] text-white text-xs font-semibold rounded-xl shadow-2xs flex-1"
                >
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER: STAFF CUSTOM PERMISSION OVERRIDES */}
      {overridingStaff && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Custom Overrides: {overridingStaff.fullName || overridingStaff.name}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Role: <strong className="text-slate-800">{overridingStaff.customRoleName || overridingStaff.role}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOverridingStaff(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border-b border-amber-200 text-xs text-amber-800 flex items-start gap-2 shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Permission Precedence:</strong> Explicit Deny &gt; Explicit Allow &gt; Inherited Role Default.
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {PERMISSION_MODULE_GROUPS.map((grp) => (
                <div key={grp.id} className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                  <div className="text-xs font-bold text-slate-900 mb-2">{grp.name}</div>

                  <div className="space-y-2">
                    {grp.submenus.map((sub) => (
                      <div key={sub.id} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                        <div className="font-semibold text-slate-800 mb-1.5">{sub.name}</div>
                        <div className="flex flex-wrap gap-2">
                          {sub.actions.map((act) => {
                            const currentOverride = staffOverrideMatrix[sub.id]?.[act.action];

                            return (
                              <div
                                key={act.action}
                                className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded border border-slate-200 text-[11px]"
                              >
                                <span className="text-slate-600 font-medium">{act.label}:</span>
                                <select
                                  value={
                                    currentOverride === true
                                      ? "ALLOW"
                                      : currentOverride === false
                                      ? "DENY"
                                      : "INHERIT"
                                  }
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    handleSetStaffOverride(
                                      sub.id,
                                      act.action,
                                      v === "ALLOW" ? true : v === "DENY" ? false : null
                                    );
                                  }}
                                  className={`text-[10px] font-bold rounded px-1.5 py-0.5 border ${
                                    currentOverride === true
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                      : currentOverride === false
                                      ? "bg-rose-50 text-rose-700 border-rose-300"
                                      : "bg-white text-slate-600 border-slate-200"
                                  }`}
                                >
                                  <option value="INHERIT">Inherit</option>
                                  <option value="ALLOW">Allow</option>
                                  <option value="DENY">Deny</option>
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
              <button
                type="button"
                onClick={handleResetStaffOverrides}
                className="px-3.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-medium"
              >
                Reset All Overrides
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOverridingStaff(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingOverrides}
                  onClick={handleSaveStaffOverrides}
                  className="px-4 py-1.5 bg-[#1677E8] hover:bg-[#1268D3] text-white text-xs font-semibold rounded-xl shadow-2xs"
                >
                  {isSavingOverrides ? "Saving..." : "Save Overrides"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
