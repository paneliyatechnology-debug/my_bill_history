"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../context/auth-context";
import { apiClient } from "../../lib/api-client";
import {
  PERMISSION_MODULE_GROUPS,
  INDUSTRY_ROLE_TEMPLATES,
  extractPermissionMatrix,
  countGrantedPermissions,
  TOTAL_ACTIONS_COUNT,
  ModuleGroupDefinition,
  SubmenuDefinition,
} from "../../lib/permissions-catalog";
import {
  ShieldCheck,
  Shield,
  Users,
  Briefcase,
  Package,
  Truck,
  Receipt,
  FileSpreadsheet,
  Crown,
  Lock,
  X,
  Key,
  LogOut,
  Sliders,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Copy,
  Trash2,
  Edit2,
  Pencil,
  Building,
  Building2,
  AlertTriangle,
  AlertCircle,
  Search,
  Filter,
  Download,
  RotateCcw,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Check,
  Calculator,
  User,
  LayoutDashboard,
  ShoppingCart,
  ShoppingBag,
  BookOpen,
  BarChart3,
  Settings,
  Sparkles,
  ArrowRight,
  Eye,
  CheckSquare,
  Square,
  HelpCircle,
  Maximize2,
  Minimize2,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================
export interface CustomRole {
  id: string;
  sysKey?: string;
  name: string;
  nameGujarati?: string;
  description?: string;
  isPredefined?: boolean;
  isSystem?: boolean;
  isCustomized?: boolean;
  systemRole?: string;
  userCount?: number;
  usersCount?: number;
  isActive?: boolean;
  dataScope?: "OWN_RECORDS" | "ASSIGNED_BRANCH" | "ALL_ORGANIZATION";
  permissions: any;
  permissionsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffUser {
  id: string;
  fullName: string;
  name?: string;
  phone: string;
  email?: string;
  role: string;
  customRoleId?: string;
  customRoleName?: string;
  isActive: boolean;
  branches: Array<{ id: string; name: string }>;
}

// Map role name / system role to appropriate icon
function getRoleIcon(role: CustomRole) {
  const name = (role.name || "").toLowerCase();
  const sys = (role.systemRole || role.sysKey || "").toLowerCase();

  if (name.includes("owner") || name.includes("admin") || sys.includes("admin")) {
    return <Crown className="w-4 h-4 text-amber-500 fill-amber-100" />;
  }
  if (name.includes("partner") || sys.includes("partner")) {
    return <Users className="w-4 h-4 text-blue-600" />;
  }
  if (name.includes("accountant") || sys.includes("accountant")) {
    return <Calculator className="w-4 h-4 text-indigo-600" />;
  }
  if (name.includes("salesman") || sys.includes("salesman")) {
    return <User className="w-4 h-4 text-sky-600" />;
  }
  if (name.includes("stock") || name.includes("inventory") || sys.includes("stock")) {
    return <Package className="w-4 h-4 text-emerald-600" />;
  }
  if (name.includes("delivery") || sys.includes("delivery")) {
    return <Truck className="w-4 h-4 text-blue-500" />;
  }
  if (name.includes("cashier") || sys.includes("cashier")) {
    return <Receipt className="w-4 h-4 text-teal-600" />;
  }
  if (name.includes("chartered") || name.includes("ca") || name.includes("auditor") || sys.includes("auditor")) {
    return <FileSpreadsheet className="w-4 h-4 text-violet-600" />;
  }
  return <Shield className="w-4 h-4 text-purple-600" />;
}

// Module icon selector for drawer accordion
function getModuleIcon(moduleId: string) {
  switch (moduleId) {
    case "dashboard":
      return <LayoutDashboard className="w-4 h-4 text-blue-600" />;
    case "parties":
      return <Users className="w-4 h-4 text-teal-600" />;
    case "items":
      return <Package className="w-4 h-4 text-amber-600" />;
    case "sales":
      return <ShoppingCart className="w-4 h-4 text-sky-600" />;
    case "purchases":
      return <ShoppingBag className="w-4 h-4 text-indigo-600" />;
    case "expenses":
      return <Receipt className="w-4 h-4 text-rose-600" />;
    case "accounting":
      return <BookOpen className="w-4 h-4 text-purple-600" />;
    case "reports":
      return <BarChart3 className="w-4 h-4 text-blue-700" />;
    case "settings":
      return <Settings className="w-4 h-4 text-slate-700" />;
    default:
      return <Shield className="w-4 h-4 text-slate-600" />;
  }
}

// Default standard action columns in the matrix table
const STANDARD_ACTIONS = [
  { key: "view", label: "View" },
  { key: "create", label: "Create" },
  { key: "edit", label: "Edit" },
  { key: "delete", label: "Delete" },
  { key: "convert", label: "Convert" },
  { key: "print", label: "Print" },
  { key: "export", label: "Export" },
  { key: "approve", label: "Approve" },
];

export default function RolesManagementView() {
  const { lang, refreshUserProfile } = useAuth();

  // Data states
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [users, setUsers] = useState<StaffUser[]>([]);
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

  // Filter controls
  const [roleSearchTerm, setRoleSearchTerm] = useState("");
  const [roleStatusFilter, setRoleStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [roleTypeFilter, setRoleTypeFilter] = useState<"ALL" | "SYSTEM" | "CUSTOM">("ALL");
  const [roleCurrentPage, setRoleCurrentPage] = useState(1);
  const [roleRowsPerPage, setRoleRowsPerPage] = useState(10);

  // Configure Role Permissions Modal State (Dedicated Spacious Modal)
  const [configuringRole, setConfiguringRole] = useState<CustomRole | null>(null);
  const [isModalFullScreen, setIsModalFullScreen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"permissions" | "rules" | "staff">("permissions");
  const [drawerSearch, setDrawerSearch] = useState("");
  const [roleMatrix, setRoleMatrix] = useState<Record<string, Record<string, boolean>>>({});
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    sales: true,
  });
  const [roleDataScope, setRoleDataScope] = useState<"ALL_ORGANIZATION" | "ASSIGNED_BRANCH" | "OWN_RECORDS">("ALL_ORGANIZATION");
  const [isDrawerDirty, setIsDrawerDirty] = useState(false);
  const [isSavingDrawer, setIsSavingDrawer] = useState(false);

  // Modals
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({
    name: "",
    description: "",
    cloneFromRoleId: "",
    dataScope: "ALL_ORGANIZATION" as "ALL_ORGANIZATION" | "ASSIGNED_BRANCH" | "OWN_RECORDS",
    isActive: true,
  });

  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [editingRoleItem, setEditingRoleItem] = useState<CustomRole | null>(null);
  const [editRoleForm, setEditRoleForm] = useState({
    name: "",
    description: "",
    dataScope: "ALL_ORGANIZATION" as "ALL_ORGANIZATION" | "ASSIGNED_BRANCH" | "OWN_RECORDS",
  });

  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateSourceRole, setDuplicateSourceRole] = useState<CustomRole | null>(null);
  const [duplicateRoleName, setDuplicateRoleName] = useState("");

  const [showDeleteConfirmRole, setShowDeleteConfirmRole] = useState<CustomRole | null>(null);

  // Fetch roles and users
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rolesRes, usersRes] = await Promise.allSettled([
        apiClient.get<any[]>("/api/v1/roles"),
        apiClient.get<any[]>("/api/v1/users"),
      ]);

      if (rolesRes.status === "fulfilled" && Array.isArray(rolesRes.value)) {
        setRoles(rolesRes.value);
      }

      if (usersRes.status === "fulfilled" && Array.isArray(usersRes.value)) {
        setUsers(usersRes.value);
      } else {
        try {
          const fallbackUsers = await apiClient.get<any[]>("/tenants/users");
          if (Array.isArray(fallbackUsers)) setUsers(fallbackUsers);
        } catch {}
      }
    } catch (err: any) {
      console.error("Error loading roles:", err);
      showError(err?.message || "Failed to load roles.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Summary Metrics (Strictly Role-Centric)
  const summaryMetrics = useMemo(() => {
    const totalRoles = roles.length;
    const activeRoles = roles.filter((r) => r.isActive !== false).length;
    const customRoles = roles.filter((r) => !r.isPredefined && !r.isSystem).length;
    const systemRoles = roles.filter((r) => r.isPredefined || r.isSystem).length;

    return { totalRoles, activeRoles, customRoles, systemRoles };
  }, [roles]);

  // Filtered Roles
  const filteredRoles = useMemo(() => {
    return roles.filter((role) => {
      if (roleSearchTerm.trim()) {
        const query = roleSearchTerm.toLowerCase();
        const nameMatch = (role.name || "").toLowerCase().includes(query);
        const descMatch = (role.description || "").toLowerCase().includes(query);
        if (!nameMatch && !descMatch) return false;
      }

      if (roleStatusFilter === "ACTIVE" && role.isActive === false) return false;
      if (roleStatusFilter === "INACTIVE" && role.isActive !== false) return false;

      const isSystem = Boolean(role.isPredefined || role.isSystem);
      if (roleTypeFilter === "SYSTEM" && !isSystem) return false;
      if (roleTypeFilter === "CUSTOM" && isSystem) return false;

      return true;
    });
  }, [roles, roleSearchTerm, roleStatusFilter, roleTypeFilter]);

  const paginatedRoles = useMemo(() => {
    const startIdx = (roleCurrentPage - 1) * roleRowsPerPage;
    return filteredRoles.slice(startIdx, startIdx + roleRowsPerPage);
  }, [filteredRoles, roleCurrentPage, roleRowsPerPage]);

  const totalRolePages = Math.max(1, Math.ceil(filteredRoles.length / roleRowsPerPage));

  // Configure Drawer/Modal actions
  const openConfigureModal = (role: CustomRole) => {
    setConfiguringRole(role);
    setDrawerTab("permissions");
    setDrawerSearch("");
    setRoleMatrix(extractPermissionMatrix(role.permissions));
    setRoleDataScope(role.dataScope || "ALL_ORGANIZATION");
    setIsDrawerDirty(false);
    setIsModalFullScreen(false);
    setExpandedModules({ sales: true });
  };

  const closeConfigureModal = () => {
    if (isDrawerDirty) {
      if (!confirm("You have unsaved permission changes. Discard changes?")) {
        return;
      }
    }
    setConfiguringRole(null);
    setIsDrawerDirty(false);
  };

  const handleToggleAction = (submenuId: string, actionKey: string) => {
    setIsDrawerDirty(true);
    setRoleMatrix((prev) => {
      const currentVal = Boolean(prev[submenuId]?.[actionKey]);
      const nextVal = !currentVal;
      const sub = { ...(prev[submenuId] || {}), [actionKey]: nextVal };
      const nextMatrix = { ...prev, [submenuId]: sub };

      const syncPair = (a: string, b: string) => {
        if (submenuId === a) nextMatrix[b] = { ...(nextMatrix[b] || {}), [actionKey]: nextVal };
        else if (submenuId === b) nextMatrix[a] = { ...(nextMatrix[a] || {}), [actionKey]: nextVal };
      };
      syncPair("sales_invoices", "invoices");
      syncPair("proforma_invoices", "proformas");
      syncPair("cash_bank", "banking");
      syncPair("gst_tax", "gst");
      syncPair("journal_vouchers", "vouchers");

      return nextMatrix;
    });
  };

  const handleToggleSubmenuAll = (submenu: SubmenuDefinition) => {
    setIsDrawerDirty(true);
    setRoleMatrix((prev) => {
      const currentSub = prev[submenu.id] || {};
      const allActive = submenu.actions.every((a) => Boolean(currentSub[a.action]));
      const nextVal = !allActive;

      const newSub: Record<string, boolean> = {};
      for (const a of submenu.actions) {
        newSub[a.action] = nextVal;
      }

      const nextMatrix = { ...prev, [submenu.id]: newSub };

      const syncPair = (a: string, b: string) => {
        if (submenu.id === a) nextMatrix[b] = { ...newSub };
        else if (submenu.id === b) nextMatrix[a] = { ...newSub };
      };
      syncPair("sales_invoices", "invoices");
      syncPair("proforma_invoices", "proformas");
      syncPair("cash_bank", "banking");
      syncPair("gst_tax", "gst");
      syncPair("journal_vouchers", "vouchers");

      return nextMatrix;
    });
  };

  const handleToggleModuleAll = (group: ModuleGroupDefinition) => {
    setIsDrawerDirty(true);
    setRoleMatrix((prev) => {
      let allGroupActive = true;
      for (const sub of group.submenus) {
        for (const a of sub.actions) {
          if (!prev[sub.id]?.[a.action]) {
            allGroupActive = false;
            break;
          }
        }
        if (!allGroupActive) break;
      }

      const nextVal = !allGroupActive;
      const nextMatrix = { ...prev };

      for (const sub of group.submenus) {
        const newSub: Record<string, boolean> = {};
        for (const a of sub.actions) {
          newSub[a.action] = nextVal;
        }
        nextMatrix[sub.id] = newSub;

        const syncPair = (a: string, b: string) => {
          if (sub.id === a) nextMatrix[b] = { ...newSub };
          else if (sub.id === b) nextMatrix[a] = { ...newSub };
        };
        syncPair("sales_invoices", "invoices");
        syncPair("proforma_invoices", "proformas");
        syncPair("cash_bank", "banking");
        syncPair("gst_tax", "gst");
        syncPair("journal_vouchers", "vouchers");
      }

      return nextMatrix;
    });
  };

  const handleExpandAllModules = () => {
    const next: Record<string, boolean> = {};
    for (const g of PERMISSION_MODULE_GROUPS) {
      next[g.id] = true;
    }
    setExpandedModules(next);
  };

  const handleCollapseAllModules = () => {
    setExpandedModules({});
  };

  const handleGrantAllPermissions = () => {
    setIsDrawerDirty(true);
    const full: Record<string, Record<string, boolean>> = {};
    for (const g of PERMISSION_MODULE_GROUPS) {
      for (const sub of g.submenus) {
        full[sub.id] = {};
        for (const a of sub.actions) {
          full[sub.id][a.action] = true;
        }
      }
    }
    setRoleMatrix(full);
  };

  const handleClearAllPermissions = () => {
    setIsDrawerDirty(true);
    const empty: Record<string, Record<string, boolean>> = {};
    for (const g of PERMISSION_MODULE_GROUPS) {
      for (const sub of g.submenus) {
        empty[sub.id] = {};
        for (const a of sub.actions) {
          empty[sub.id][a.action] = false;
        }
      }
    }
    setRoleMatrix(empty);
  };

  const handleResetToDefaults = () => {
    if (!configuringRole) return;
    if (!confirm(`Reset permissions for "${configuringRole.name}" back to system baseline defaults?`)) {
      return;
    }
    setIsDrawerDirty(true);
    const orig = extractPermissionMatrix(configuringRole.permissions);
    setRoleMatrix(orig);
    showSuccess("Permissions reset to role baseline.");
  };

  const handleSaveDrawerPermissions = async () => {
    if (!configuringRole) return;
    setIsSavingDrawer(true);
    try {
      const permissionsList: Array<{ module: string; action: string; allowed: boolean }> = [];
      for (const [mod, acts] of Object.entries(roleMatrix)) {
        if (typeof acts === "object" && acts !== null) {
          for (const [act, allowed] of Object.entries(acts)) {
            permissionsList.push({ module: mod, action: act, allowed: Boolean(allowed) });
          }
        }
      }

      await apiClient.put(`/api/v1/roles/${configuringRole.id}`, {
        name: configuringRole.name,
        description: configuringRole.description,
        dataScope: roleDataScope,
        permissions: permissionsList,
      });

      showSuccess(`Permissions saved successfully for "${configuringRole.name}". Assigned staff members will inherit updated rules.`);
      setIsDrawerDirty(false);

      try {
        localStorage.setItem("billing_permissions_last_updated", String(Date.now()));
        window.dispatchEvent(new Event("user-permissions-updated"));
      } catch {}

      await refreshUserProfile();
      await fetchData();
      setConfiguringRole(null);
    } catch (err: any) {
      console.error("Save role permissions failed:", err);
      showError(err?.message || "Failed to save role permissions.");
    } finally {
      setIsSavingDrawer(false);
    }
  };

  const handleDuplicateRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!duplicateSourceRole || !duplicateRoleName.trim()) return;

    try {
      await apiClient.post(`/api/v1/roles/${duplicateSourceRole.id}/duplicate`, {
        name: duplicateRoleName.trim(),
      });
      showSuccess(`Role cloned successfully as "${duplicateRoleName.trim()}".`);
      setShowDuplicateModal(false);
      setDuplicateSourceRole(null);
      setDuplicateRoleName("");
      await fetchData();
    } catch (err: any) {
      showError(err?.message || "Failed to duplicate role.");
    }
  };

  const handleCreateRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleForm.name.trim()) {
      showError("Please enter a role name.");
      return;
    }

    try {
      await apiClient.post("/api/v1/roles", {
        name: newRoleForm.name.trim(),
        description: newRoleForm.description.trim() || undefined,
        cloneFromRoleId: newRoleForm.cloneFromRoleId || undefined,
        dataScope: newRoleForm.dataScope,
        isActive: newRoleForm.isActive,
      });

      showSuccess(`Role "${newRoleForm.name.trim()}" created successfully.`);
      setShowCreateRoleModal(false);
      setNewRoleForm({
        name: "",
        description: "",
        cloneFromRoleId: "",
        dataScope: "ALL_ORGANIZATION",
        isActive: true,
      });
      await fetchData();
    } catch (err: any) {
      showError(err?.message || "Failed to create role.");
    }
  };

  const handleEditRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoleItem) return;

    try {
      await apiClient.put(`/api/v1/roles/${editingRoleItem.id}`, {
        name: editRoleForm.name.trim() || editingRoleItem.name,
        description: editRoleForm.description.trim(),
        dataScope: editRoleForm.dataScope,
      });

      showSuccess(`Role "${editingRoleItem.name}" updated successfully.`);
      setShowEditRoleModal(false);
      setEditingRoleItem(null);
      await fetchData();
    } catch (err: any) {
      showError(err?.message || "Failed to update role.");
    }
  };

  const handleDeleteRole = async (role: CustomRole) => {
    if (role.isPredefined || role.isSystem) {
      showError("System roles are protected and cannot be deleted.");
      return;
    }
    const staffCount = role.userCount ?? role.usersCount ?? 0;
    if (staffCount > 0) {
      showError(`Cannot delete role "${role.name}" because ${staffCount} staff members are currently assigned to it.`);
      return;
    }

    try {
      await apiClient.delete(`/api/v1/roles/${role.id}`);
      showSuccess(`Role "${role.name}" was permanently deleted.`);
      setShowDeleteConfirmRole(null);
      if (configuringRole?.id === role.id) {
        setConfiguringRole(null);
      }
      await fetchData();
    } catch (err: any) {
      showError(err?.message || "Failed to delete role.");
    }
  };

  const handleExportRoles = async () => {
    try {
      const headers = ["#", "Role Name", "Type", "Assigned Staff", "Status", "Permissions Count", "Data Scope", "Description"];
      const rows = roles.map((r, idx) => [
        idx + 1,
        `"${r.name.replace(/"/g, '""')}"`,
        r.isPredefined || r.isSystem ? "System" : "Custom",
        r.userCount ?? r.usersCount ?? 0,
        r.isActive === false ? "Inactive" : "Active",
        `${countGrantedPermissions(r.permissions, r.name)}/${TOTAL_ACTIONS_COUNT}`,
        r.dataScope || "ALL_ORGANIZATION",
        `"${(r.description || "").replace(/"/g, '""')}"`,
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Roles_Export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSuccess("Roles exported successfully.");
    } catch (err: any) {
      showError("Export failed: " + err?.message);
    }
  };

  const filteredModuleGroups = useMemo(() => {
    if (!drawerSearch.trim()) return PERMISSION_MODULE_GROUPS;
    const query = drawerSearch.toLowerCase();

    return PERMISSION_MODULE_GROUPS.map((grp) => {
      const groupMatch = grp.name.toLowerCase().includes(query);
      const filteredSubmenus = grp.submenus.filter((sub) => {
        if (groupMatch) return true;
        const subMatch = sub.name.toLowerCase().includes(query);
        const actionMatch = sub.actions.some((a) => a.label.toLowerCase().includes(query) || a.action.toLowerCase().includes(query));
        return subMatch || actionMatch;
      });

      return {
        ...grp,
        submenus: filteredSubmenus,
      };
    }).filter((grp) => grp.submenus.length > 0);
  }, [drawerSearch]);

  const roleAssignedStaffList = useMemo(() => {
    if (!configuringRole) return [];
    return users.filter((u) => {
      if (configuringRole.id && u.customRoleId === configuringRole.id) return true;
      if (configuringRole.systemRole && u.role === configuringRole.systemRole) return true;
      if (u.role === configuringRole.name?.toUpperCase().replace(/\s+/g, "_")) return true;
      return false;
    });
  }, [configuringRole, users]);

  const currentConfiguredGrantedCount = useMemo(() => {
    if (!configuringRole) return 0;
    return countGrantedPermissions(roleMatrix, configuringRole.name);
  }, [configuringRole, roleMatrix]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* Toast Banner Alerts */}
      {actionSuccessMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-emerald-600 text-white rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{actionSuccessMessage}</span>
          <button onClick={() => setActionSuccessMessage("")} className="ml-2 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {actionErrorMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-rose-600 text-white rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2 text-sm font-medium">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{actionErrorMessage}</span>
          <button onClick={() => setActionErrorMessage("")} className="ml-2 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-2">
          <span>Settings</span>
          <span>&rsaquo;</span>
          <span className="text-slate-900 font-semibold">Role & Permissions</span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Role & Permission Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage organizational roles, menu access permissions, and data security access rules.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportRoles}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export</span>
            </button>
            <button
              type="button"
              onClick={fetchData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-slate-500 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setNewRoleForm({
                  name: "",
                  description: "",
                  cloneFromRoleId: "",
                  dataScope: "ALL_ORGANIZATION",
                  isActive: true,
                });
                setShowCreateRoleModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1677E8] hover:bg-[#1268D3] text-white text-xs font-semibold rounded-xl shadow-2xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Role</span>
            </button>
          </div>
        </div>

        {/* 4 Summary KPI Cards (Strictly Roles-focused) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* 1. Total Roles */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Total Roles</div>
              <div className="text-2xl font-bold text-slate-900 leading-tight mt-0.5">
                {summaryMetrics.totalRoles}
              </div>
            </div>
          </div>

          {/* 2. Active Roles */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Active Roles</div>
              <div className="text-2xl font-bold text-slate-900 leading-tight mt-0.5">
                {summaryMetrics.activeRoles}
              </div>
            </div>
          </div>

          {/* 3. Custom Roles */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Custom Roles</div>
              <div className="text-2xl font-bold text-slate-900 leading-tight mt-0.5">
                {summaryMetrics.customRoles}
              </div>
            </div>
          </div>

          {/* 4. System Roles */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">System Roles</div>
              <div className="text-2xl font-bold text-slate-900 leading-tight mt-0.5">
                {summaryMetrics.systemRoles}
              </div>
            </div>
          </div>
        </div>

        {/* Roles Table Section */}
        <div className="w-full">
          {/* Filter controls */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative min-w-[260px] flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search role by name or description..."
                  value={roleSearchTerm}
                  onChange={(e) => {
                    setRoleSearchTerm(e.target.value);
                    setRoleCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] transition-all"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-medium">Status:</span>
                <select
                  value={roleStatusFilter}
                  onChange={(e) => {
                    setRoleStatusFilter(e.target.value as any);
                    setRoleCurrentPage(1);
                  }}
                  className="py-1 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1677E8]"
                >
                  <option value="ALL">All</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              {/* Type Filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-medium">Type:</span>
                <select
                  value={roleTypeFilter}
                  onChange={(e) => {
                    setRoleTypeFilter(e.target.value as any);
                    setRoleCurrentPage(1);
                  }}
                  className="py-1 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1677E8]"
                >
                  <option value="ALL">All</option>
                  <option value="SYSTEM">System</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>
            </div>
          </div>

          {/* Roles Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3.5 w-10 text-center">#</th>
                    <th className="py-3 px-4">Role Name</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-3 text-center">Type</th>
                    <th className="py-3 px-4 w-44">Menu Access</th>
                    <th className="py-3 px-3 text-center">Assigned Staff</th>
                    <th className="py-3 px-3.5 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRoles.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No matching roles found.
                      </td>
                    </tr>
                  ) : (
                    paginatedRoles.map((role, idx) => {
                      const isSystem = Boolean(role.isPredefined || role.isSystem);
                      const isConfiguringThis = configuringRole?.id === role.id;
                      const grantedCount = countGrantedPermissions(role.permissions, role.name);
                      const totalCount = TOTAL_ACTIONS_COUNT || 87;
                      const percent = Math.min(100, Math.round((grantedCount / totalCount) * 100));
                      const staffCount = role.userCount ?? role.usersCount ?? 0;
                      const rowNum = (roleCurrentPage - 1) * roleRowsPerPage + idx + 1;

                      return (
                        <tr
                          key={role.id}
                          className={`transition-colors ${
                            isConfiguringThis
                              ? "bg-blue-50/80 border-l-4 border-l-[#1677E8]"
                              : "hover:bg-slate-50/70"
                          }`}
                        >
                          <td className="py-3.5 px-3.5 text-center text-slate-400 font-medium">
                            {rowNum}
                          </td>

                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            <div className="flex items-center gap-2.5">
                              <div className="shrink-0">{getRoleIcon(role)}</div>
                              <span className="truncate max-w-[180px]">{role.name}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-500 max-w-sm truncate text-[11px]" title={role.description}>
                            {role.description || "No description provided."}
                          </td>

                          <td className="py-3.5 px-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                                isSystem
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-purple-50 text-purple-700 border border-purple-200"
                              }`}
                            >
                              {isSystem ? "System" : "Custom"}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="w-full">
                              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1">
                                <span>{grantedCount} / {totalCount}</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    percent >= 80
                                      ? "bg-emerald-500"
                                      : percent >= 30
                                      ? "bg-[#1677E8]"
                                      : "bg-amber-500"
                                  }`}
                                  style={{ width: `${Math.max(percent, 4)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 text-center font-bold text-slate-800">
                            {staffCount}
                          </td>

                          <td className="py-3.5 px-3.5 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                role.isActive !== false
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  role.isActive !== false ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                                }`}
                              />
                              {role.isActive !== false ? "Active" : "Inactive"}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRoleItem(role);
                                  setEditRoleForm({
                                    name: role.name,
                                    description: role.description || "",
                                    dataScope: role.dataScope || "ALL_ORGANIZATION",
                                  });
                                  setShowEditRoleModal(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Role Details"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => openConfigureModal(role)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isConfiguringThis
                                    ? "bg-[#1677E8] text-white"
                                    : "text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                }`}
                                title="Configure Granular Permissions"
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setDuplicateSourceRole(role);
                                  setDuplicateRoleName(`${role.name} (Custom)`);
                                  setShowDuplicateModal(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Duplicate Role"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                disabled={isSystem || staffCount > 0}
                                onClick={() => setShowDeleteConfirmRole(role)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isSystem || staffCount > 0
                                    ? "text-slate-300 cursor-not-allowed"
                                    : "text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                }`}
                                title={
                                  isSystem
                                    ? "System roles cannot be deleted"
                                    : staffCount > 0
                                    ? "Reassign staff members before deleting"
                                    : "Delete Custom Role"
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
              <div>
                Showing {filteredRoles.length > 0 ? (roleCurrentPage - 1) * roleRowsPerPage + 1 : 0}-
                {Math.min(roleCurrentPage * roleRowsPerPage, filteredRoles.length)} of {filteredRoles.length} roles
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span>Rows per page:</span>
                  <select
                    value={roleRowsPerPage}
                    onChange={(e) => {
                      setRoleRowsPerPage(Number(e.target.value));
                      setRoleCurrentPage(1);
                    }}
                    className="py-1 px-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={roleCurrentPage <= 1}
                    onClick={() => setRoleCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    &lsaquo;
                  </button>
                  <span className="px-2.5 py-1 bg-[#1677E8] text-white rounded-lg font-bold">
                    {roleCurrentPage}
                  </span>
                  <button
                    type="button"
                    disabled={roleCurrentPage >= totalRolePages}
                    onClick={() => setRoleCurrentPage((p) => Math.min(totalRolePages, p + 1))}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    &rsaquo;
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* CONFIGURE ROLE PERMISSIONS: DEDICATED MODAL POPUP & FULL-SCREEN VIEW */}
      {/* =================================================================== */}
      {configuringRole && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-150">
          <div
            className={`bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-200 ${
              isModalFullScreen
                ? "fixed inset-0 z-50 rounded-none w-screen h-screen"
                : "w-full max-w-6xl max-h-[92vh] h-[92vh] rounded-2xl animate-in zoom-in-95"
            }`}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#1677E8] flex items-center justify-center shrink-0 shadow-2xs">
                  {getRoleIcon(configuringRole)}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                      Configure Role: {configuringRole.name}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#1677E8] border border-blue-200">
                      {currentConfiguredGrantedCount} / {TOTAL_ACTIONS_COUNT || 87} Granted
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Set granular menu access, action permissions, and data security rules for this role.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsModalFullScreen(!isModalFullScreen)}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  title={isModalFullScreen ? "Exit Fullscreen" : "Fullscreen View"}
                >
                  {isModalFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={closeConfigureModal}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center border-b border-slate-200 px-6 shrink-0 bg-slate-50/70">
              <button
                type="button"
                onClick={() => setDrawerTab("permissions")}
                className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                  drawerTab === "permissions"
                    ? "border-[#1677E8] text-[#1677E8] bg-white"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Menu & Action Permissions</span>
              </button>

              <button
                type="button"
                onClick={() => setDrawerTab("rules")}
                className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                  drawerTab === "rules"
                    ? "border-[#1677E8] text-[#1677E8] bg-white"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Data Access Rules</span>
              </button>

              <button
                type="button"
                onClick={() => setDrawerTab("staff")}
                className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                  drawerTab === "staff"
                    ? "border-[#1677E8] text-[#1677E8] bg-white"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Assigned Staff ({roleAssignedStaffList.length})</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/40">
              {drawerTab === "permissions" && (
                <>
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                    <div className="relative flex-1 min-w-[260px] max-w-md">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search permission by module, submenu, or action..."
                        value={drawerSearch}
                        onChange={(e) => setDrawerSearch(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8]"
                      />
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-xs font-medium">
                      <button
                        type="button"
                        onClick={handleExpandAllModules}
                        className="px-3 py-1.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-slate-200 bg-white"
                      >
                        Expand All
                      </button>
                      <button
                        type="button"
                        onClick={handleCollapseAllModules}
                        className="px-3 py-1.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-slate-200 bg-white"
                      >
                        Collapse All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={handleGrantAllPermissions}
                        className="px-3 py-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer font-semibold"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAllPermissions}
                        className="px-3 py-1.5 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer font-semibold"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {filteredModuleGroups.map((group) => {
                      const isExpanded = Boolean(expandedModules[group.id]);

                      const activeSubmenusCount = group.submenus.filter((sub) =>
                        sub.actions.some((a) => Boolean(roleMatrix[sub.id]?.[a.action]))
                      ).length;
                      const totalSubmenusCount = group.submenus.length;

                      return (
                        <div
                          key={group.id}
                          className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs"
                        >
                          <div
                            onClick={() =>
                              setExpandedModules((prev) => ({
                                ...prev,
                                [group.id]: !prev[group.id],
                              }))
                            }
                            className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                              isExpanded ? "bg-slate-50/80 border-b border-slate-200" : "hover:bg-slate-50/50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                                {getModuleIcon(group.id)}
                              </div>
                              <div>
                                <span className="text-sm font-bold text-slate-900">{group.name}</span>
                                <div className="text-[11px] text-slate-500">
                                  {totalSubmenusCount} application submenus & actions
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                {activeSubmenusCount} / {totalSubmenusCount} submenus active
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="p-4 overflow-x-auto">
                              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-800">
                                  <input
                                    type="checkbox"
                                    checked={
                                      group.submenus.length > 0 &&
                                      group.submenus.every((sub) =>
                                        sub.actions.every((a) => Boolean(roleMatrix[sub.id]?.[a.action]))
                                      )
                                    }
                                    onChange={() => handleToggleModuleAll(group)}
                                    className="w-4 h-4 rounded text-[#1677E8] border-slate-300 focus:ring-[#1677E8]"
                                  />
                                  <span>Select All in {group.name}</span>
                                </label>
                              </div>

                              <div className="min-w-[760px]">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px] bg-slate-50/50">
                                      <th className="py-2.5 px-3">Menu / Submenu</th>
                                      {STANDARD_ACTIONS.map((act) => (
                                        <th key={act.key} className="py-2.5 px-2 text-center w-20">
                                          {act.label}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {group.submenus.map((submenu) => {
                                      const subPerms = roleMatrix[submenu.id] || {};
                                      const isSubmenuAllGranted = submenu.actions.every((a) =>
                                        Boolean(subPerms[a.action])
                                      );
                                      const isSubmenuSomeGranted = submenu.actions.some((a) =>
                                        Boolean(subPerms[a.action])
                                      );

                                      return (
                                        <tr key={submenu.id} className="hover:bg-slate-50/70 transition-colors">
                                          <td className="py-3 px-3 font-semibold text-slate-900">
                                            <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                              <input
                                                type="checkbox"
                                                checked={isSubmenuAllGranted}
                                                ref={(el) => {
                                                  if (el) {
                                                    el.indeterminate = isSubmenuSomeGranted && !isSubmenuAllGranted;
                                                  }
                                                }}
                                                onChange={() => handleToggleSubmenuAll(submenu)}
                                                className="w-4 h-4 rounded text-[#1677E8] border-slate-300 focus:ring-[#1677E8]"
                                              />
                                              <span>{submenu.name}</span>
                                            </label>
                                          </td>

                                          {STANDARD_ACTIONS.map((act) => {
                                            const actionDef = submenu.actions.find((a) => a.action === act.key);
                                            if (!actionDef) {
                                              return (
                                                <td key={act.key} className="py-3 px-2 text-center text-slate-300">
                                                  -
                                                </td>
                                              );
                                            }

                                            const isChecked = Boolean(subPerms[act.key]);

                                            return (
                                              <td key={act.key} className="py-3 px-2 text-center">
                                                <input
                                                  type="checkbox"
                                                  checked={isChecked}
                                                  onChange={() => handleToggleAction(submenu.id, act.key)}
                                                  className="w-4 h-4 rounded text-[#1677E8] border-slate-300 focus:ring-[#1677E8] cursor-pointer"
                                                  title={`${actionDef.label}: ${actionDef.description}`}
                                                />
                                              </td>
                                            );
                                          })}
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {drawerTab === "rules" && (
                <div className="space-y-4 max-w-3xl mx-auto py-2">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
                      Data Access Scope
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Controls which records staff members with this role are authorized to query and access at the backend database query level.
                    </p>

                    <div className="space-y-3">
                      <label className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:border-blue-400 transition-colors">
                        <input
                          type="radio"
                          name="role_scope_modal"
                          value="ALL_ORGANIZATION"
                          checked={roleDataScope === "ALL_ORGANIZATION"}
                          onChange={() => {
                            setIsDrawerDirty(true);
                            setRoleDataScope("ALL_ORGANIZATION");
                          }}
                          className="mt-1 text-[#1677E8]"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900">All Company Data</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Full access across all branches, warehouses, customers, and financial records.
                          </div>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:border-blue-400 transition-colors">
                        <input
                          type="radio"
                          name="role_scope_modal"
                          value="ASSIGNED_BRANCH"
                          checked={roleDataScope === "ASSIGNED_BRANCH"}
                          onChange={() => {
                            setIsDrawerDirty(true);
                            setRoleDataScope("ASSIGNED_BRANCH");
                          }}
                          className="mt-1 text-[#1677E8]"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900">Assigned Branch Only</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Restricted strictly to invoices, parties, and vouchers created under staff's designated branches.
                          </div>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:border-blue-400 transition-colors">
                        <input
                          type="radio"
                          name="role_scope_modal"
                          value="OWN_RECORDS"
                          checked={roleDataScope === "OWN_RECORDS"}
                          onChange={() => {
                            setIsDrawerDirty(true);
                            setRoleDataScope("OWN_RECORDS");
                          }}
                          className="mt-1 text-[#1677E8]"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900">Own Created Records Only</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Field agents can only view and manage invoices and quotes they personally generated.
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-800 space-y-1">
                    <div className="font-bold flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      Backend RBAC Enforcement
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      All menu and action permissions configured here are enforced by middleware at the backend database query level. Requests lacking authorization return HTTP 403 Forbidden.
                    </p>
                  </div>
                </div>
              )}

              {drawerTab === "staff" && (
                <div className="space-y-4 max-w-4xl mx-auto py-2">
                  <div className="text-xs text-slate-500 mb-2">
                    Staff members currently operating under the{" "}
                    <strong className="text-slate-900">{configuringRole.name}</strong> role:
                  </div>

                  {roleAssignedStaffList.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200 text-xs">
                      No staff users are currently assigned to this role.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {roleAssignedStaffList.map((staff) => (
                        <div
                          key={staff.id}
                          className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-2xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-[#1677E8] font-bold flex items-center justify-center text-xs">
                              {(staff.fullName || staff.name || "U").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900">{staff.fullName || staff.name}</div>
                              <div className="text-[11px] text-slate-500">{staff.phone}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                staff.isActive
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-100 text-slate-500 border border-slate-200"
                              }`}
                            >
                              {staff.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Sticky Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-200 shrink-0 bg-slate-50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetToDefaults}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer font-medium border border-slate-200 bg-white"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Defaults</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={closeConfigureModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingDrawer}
                  onClick={handleSaveDrawerPermissions}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-[#1677E8] hover:bg-[#1268D3] text-white text-xs font-semibold rounded-xl shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingDrawer ? "Saving Changes..." : "Save Permissions"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE ROLE */}
      {showCreateRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#1677E8]" />
                Create New Role
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateRoleModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Warehouse Dispatcher"
                  value={newRoleForm.name}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Summarize this role's business functions..."
                  value={newRoleForm.description}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Clone Baseline Permissions From
                </label>
                <select
                  value={newRoleForm.cloneFromRoleId}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, cloneFromRoleId: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#1677E8]"
                >
                  <option value="">Start Empty / Default</option>
                  <optgroup label="Existing Roles">
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Default Data Access Scope</label>
                <select
                  value={newRoleForm.dataScope}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, dataScope: e.target.value as any })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#1677E8]"
                >
                  <option value="ALL_ORGANIZATION">All Company Data</option>
                  <option value="ASSIGNED_BRANCH">Assigned Branch Only</option>
                  <option value="OWN_RECORDS">Own Created Records Only</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="new_role_active"
                  checked={newRoleForm.isActive}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-[#1677E8] border-slate-300 focus:ring-[#1677E8]"
                />
                <label htmlFor="new_role_active" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Activate role immediately upon creation
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateRoleModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1677E8] hover:bg-[#1268D3] text-white text-xs font-semibold rounded-xl shadow-2xs"
                >
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT ROLE DETAILS */}
      {showEditRoleModal && editingRoleItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[#1677E8]" />
                Edit Role: {editingRoleItem.name}
              </h2>
              <button
                type="button"
                onClick={() => setShowEditRoleModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditRoleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role Name *</label>
                <input
                  type="text"
                  required
                  disabled={editingRoleItem.name.toLowerCase().includes("owner")}
                  value={editRoleForm.name}
                  onChange={(e) => setEditRoleForm({ ...editRoleForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#1677E8] disabled:bg-slate-100 disabled:text-slate-500"
                />
                {editingRoleItem.name.toLowerCase().includes("owner") && (
                  <p className="text-[10px] text-slate-400 mt-1">Owner role title is protected.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editRoleForm.description}
                  onChange={(e) => setEditRoleForm({ ...editRoleForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#1677E8]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Data Scope</label>
                <select
                  value={editRoleForm.dataScope}
                  onChange={(e) => setEditRoleForm({ ...editRoleForm, dataScope: e.target.value as any })}
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
                  onClick={() => setShowEditRoleModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1677E8] hover:bg-[#1268D3] text-white text-xs font-semibold rounded-xl shadow-2xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DUPLICATE ROLE */}
      {showDuplicateModal && duplicateSourceRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Copy className="w-4 h-4 text-[#1677E8]" />
                Duplicate Role: {duplicateSourceRole.name}
              </h2>
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDuplicateRoleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Role Name *</label>
                <input
                  type="text"
                  required
                  value={duplicateRoleName}
                  onChange={(e) => setDuplicateRoleName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#1677E8]"
                />
              </div>

              <p className="text-xs text-slate-500">
                All menu & action permissions will be cloned into this new custom role.
              </p>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDuplicateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1677E8] hover:bg-[#1268D3] text-white text-xs font-semibold rounded-xl shadow-2xs"
                >
                  Duplicate Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE ROLE CONFIRMATION */}
      {showDeleteConfirmRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-sm font-bold text-slate-900 text-center mb-1">
              Delete Custom Role?
            </h3>
            <p className="text-xs text-slate-500 text-center leading-relaxed mb-5">
              Are you sure you want to delete <strong className="text-slate-800">{showDeleteConfirmRole.name}</strong>? This action cannot be reversed.
            </p>

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmRole(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteRole(showDeleteConfirmRole)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-2xs flex-1"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
