"use client";

import { formatDate } from "@/lib/date-utils";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../context/auth-context";
import { apiClient } from "../../lib/api-client";
import {
  Clock,
  Search,
  Filter,
  Download,
  RefreshCw,
  Shield,
  Users,
  Key,
  Lock,
  LogOut,
  Sliders,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  LogIn,
  RotateCw,
  Plus,
  Pencil,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  Info,
  Calendar,
} from "lucide-react";

export interface ActivityLogItem {
  id: string;
  userName?: string;
  userPhone?: string;
  userRole?: string;
  action: string;
  module?: string;
  documentId?: string;
  timestamp: string;
  details?: string;
  newState?: any;
  previousState?: any;
  ipAddress?: string;
}

// Helper to format Indian date & time nicely
function formatDateTime(isoStr: string) {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;

    const dateFormatted = formatDate(d);

    const timeFormatted = d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    return `${dateFormatted}, ${timeFormatted}`;
  } catch {
    return isoStr;
  }
}

// Relative time (e.g., "5 mins ago", "2 hours ago")
function formatRelativeTime(isoStr: string) {
  try {
    const diff = Date.now() - new Date(isoStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes === 1) return "1 min ago";
    if (minutes < 60) return `${minutes} mins ago`;
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return "1 hour ago";
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  } catch {
    return "";
  }
}

// Parse details safely
function parsePayload(detailsStr?: string, stateObj?: any): Record<string, any> | null {
  if (stateObj && typeof stateObj === "object") return stateObj;
  if (!detailsStr || detailsStr.trim() === "") return null;
  try {
    return JSON.parse(detailsStr);
  } catch {
    return null;
  }
}

// Format raw activity into human-friendly description and styling
function getActivityMeta(act: ActivityLogItem) {
  const payload = parsePayload(act.details, act.newState);
  const action = (act.action || "").toUpperCase();

  // 1. Role Events
  if (action === "ROLE_UPDATE") {
    const roleName = payload?.roleName || payload?.name || act.documentId || "Role";
    const count = payload?.permissionsCount;
    return {
      category: "ROLES",
      title: "Role Permissions Updated",
      description: `Updated permissions & access rules for "${roleName}"${count !== undefined ? ` (${count} active permissions)` : ""}.`,
      badgeText: "ROLE UPDATE",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      icon: <Sliders className="w-4 h-4 text-blue-600" />,
      target: `Role: ${roleName}`,
    };
  }

  if (action === "ROLE_CREATE") {
    const roleName = payload?.roleName || payload?.name || "Custom Role";
    return {
      category: "ROLES",
      title: "New Role Created",
      description: `Created new organizational role: "${roleName}".`,
      badgeText: "ROLE CREATED",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: <Plus className="w-4 h-4 text-emerald-600" />,
      target: `Role: ${roleName}`,
    };
  }

  if (action === "ROLE_DUPLICATE") {
    const cloned = payload?.clonedRole || payload?.newName || "Duplicated Role";
    return {
      category: "ROLES",
      title: "Role Duplicated",
      description: `Cloned role permissions to create "${cloned}".`,
      badgeText: "ROLE DUPLICATED",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      icon: <Copy className="w-4 h-4 text-purple-600" />,
      target: `Role: ${cloned}`,
    };
  }

  if (action === "ROLE_DELETE") {
    const deletedName = payload?.deletedRoleName || act.documentId || "Custom Role";
    return {
      category: "ROLES",
      title: "Role Deleted",
      description: `Permanently deleted role "${deletedName}".`,
      badgeText: "ROLE DELETED",
      badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
      icon: <Trash2 className="w-4 h-4 text-rose-600" />,
      target: `Role: ${deletedName}`,
    };
  }

  // 2. Staff Management Events
  if (action === "STAFF_CREATE") {
    const staffName = payload?.fullName || payload?.name || "Staff Member";
    const role = payload?.role || payload?.customRoleName || "Staff";
    return {
      category: "STAFF",
      title: "Staff Member Created",
      description: `Created login account for "${staffName}" assigned to role "${role}".`,
      badgeText: "STAFF CREATED",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: <Users className="w-4 h-4 text-emerald-600" />,
      target: `User: ${staffName}`,
    };
  }

  if (action === "STAFF_UPDATE") {
    const staffName = payload?.fullName || payload?.name || act.documentId || "Staff Member";
    return {
      category: "STAFF",
      title: "Staff Profile Updated",
      description: `Updated profile details, role assignment, or branch access for "${staffName}".`,
      badgeText: "STAFF UPDATED",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      icon: <Pencil className="w-4 h-4 text-blue-600" />,
      target: `User: ${staffName}`,
    };
  }

  if (action === "STAFF_ACTIVATE") {
    const staffName = act.documentId || "Staff Member";
    return {
      category: "STAFF",
      title: "Staff Account Activated",
      description: `Restored active login privileges for "${staffName}".`,
      badgeText: "ACTIVATED",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
      target: `User: ${staffName}`,
    };
  }

  if (action === "STAFF_DEACTIVATE") {
    const staffName = act.documentId || "Staff Member";
    return {
      category: "STAFF",
      title: "Staff Account Deactivated",
      description: `Suspended login access for "${staffName}".`,
      badgeText: "DEACTIVATED",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      icon: <Lock className="w-4 h-4 text-amber-600" />,
      target: `User: ${staffName}`,
    };
  }

  if (action === "STAFF_PASSWORD_RESET") {
    const staffName = act.documentId || "Staff Member";
    return {
      category: "STAFF",
      title: "Password Reset Initiated",
      description: `Security credentials updated for user "${staffName}".`,
      badgeText: "PASSWORD RESET",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      icon: <Key className="w-4 h-4 text-amber-600" />,
      target: `User: ${staffName}`,
    };
  }

  if (action === "STAFF_SESSIONS_REVOKED") {
    const staffName = act.documentId || "Staff Member";
    return {
      category: "STAFF",
      title: "Active Sessions Revoked",
      description: `Forced logout and invalidated authentication tokens for "${staffName}".`,
      badgeText: "SESSIONS REVOKED",
      badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
      icon: <LogOut className="w-4 h-4 text-rose-600" />,
      target: `User: ${staffName}`,
    };
  }

  if (action === "STAFF_PERMISSIONS_UPDATED") {
    const staffName = act.documentId || "Staff Member";
    const count = payload?.overridesCount;
    return {
      category: "STAFF",
      title: "Custom Overrides Configured",
      description: `Configured individual 3-way permission overrides for "${staffName}"${count ? ` (${count} overrides)` : ""}.`,
      badgeText: "OVERRIDES UPDATED",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      icon: <Sliders className="w-4 h-4 text-indigo-600" />,
      target: `User: ${staffName}`,
    };
  }

  if (action === "STAFF_PERMISSIONS_RESET") {
    const staffName = act.documentId || "Staff Member";
    return {
      category: "STAFF",
      title: "Overrides Cleared",
      description: `Reset all custom permission overrides for "${staffName}". Inheriting base role defaults.`,
      badgeText: "OVERRIDES CLEARED",
      badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
      icon: <RotateCw className="w-4 h-4 text-slate-600" />,
      target: `User: ${staffName}`,
    };
  }

  // 3. Auth & Session Events
  if (action === "AUTH_LOGIN") {
    return {
      category: "AUTH",
      title: "User Sign In",
      description: `Authenticated and signed into billing workspace via Web Portal.`,
      badgeText: "SIGN IN",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: <LogIn className="w-4 h-4 text-emerald-600" />,
      target: act.userName || "Web Session",
    };
  }

  if (action === "AUTH_REFRESH_TOKEN") {
    return {
      category: "AUTH",
      title: "Session Refreshed",
      description: `Refreshed security authentication token for active work session.`,
      badgeText: "TOKEN REFRESH",
      badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
      icon: <RefreshCw className="w-4 h-4 text-slate-500" />,
      target: "Session",
    };
  }

  // 4. Document Approvals
  if (action === "APPROVAL_APPROVED") {
    return {
      category: "APPROVALS",
      title: "Document Approved",
      description: `Manager approved invoice document exceeding limits.`,
      badgeText: "APPROVED",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
      target: act.documentId ? `Invoice #${act.documentId}` : "Invoice",
    };
  }

  if (action === "APPROVAL_REJECTED") {
    return {
      category: "APPROVALS",
      title: "Document Rejected",
      description: `Management rejected invoice approval request.`,
      badgeText: "REJECTED",
      badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
      icon: <XCircle className="w-4 h-4 text-rose-600" />,
      target: act.documentId ? `Invoice #${act.documentId}` : "Invoice",
    };
  }

  // Default Fallback
  return {
    category: "GENERAL",
    title: action.replace(/_/g, " "),
    description: act.details || "Activity recorded by system.",
    badgeText: action,
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    icon: <Clock className="w-4 h-4 text-slate-500" />,
    target: act.module || "System",
  };
}

export default function ActivityLogsView() {
  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>("ALL");
  const [selectedDetailModalItem, setSelectedDetailModalItem] = useState<ActivityLogItem | null>(null);

  // Fetch activities
  const fetchActivities = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<any[]>("/api/v1/users/activities");
      if (Array.isArray(res)) {
        setActivities(res);
      } else {
        try {
          const fallback = await apiClient.get<any[]>("/tenants/activities");
          if (Array.isArray(fallback)) setActivities(fallback);
        } catch {}
      }
    } catch (err) {
      console.error("Error loading activity logs:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const total = activities.length;
    let rolesCount = 0;
    let staffCount = 0;
    let authCount = 0;

    for (const a of activities) {
      const act = (a.action || "").toUpperCase();
      if (act.startsWith("ROLE_")) rolesCount++;
      else if (act.startsWith("STAFF_")) staffCount++;
      else if (act.startsWith("AUTH_")) authCount++;
    }

    return { total, rolesCount, staffCount, authCount };
  }, [activities]);

  // Filtered Activities
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      const meta = getActivityMeta(act);

      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const userName = (act.userName || "").toLowerCase();
        const title = meta.title.toLowerCase();
        const desc = meta.description.toLowerCase();
        const target = meta.target.toLowerCase();
        const action = act.action.toLowerCase();
        if (!userName.includes(q) && !title.includes(q) && !desc.includes(q) && !target.includes(q) && !action.includes(q)) {
          return false;
        }
      }

      // Category
      if (selectedCategory !== "ALL" && meta.category !== selectedCategory) {
        return false;
      }

      // Action
      if (selectedActionFilter !== "ALL" && act.action !== selectedActionFilter) {
        return false;
      }

      return true;
    });
  }, [activities, searchTerm, selectedCategory, selectedActionFilter]);

  // Export to CSV
  const handleExportCSV = () => {
    try {
      const headers = ["Timestamp", "Actor", "Actor Role", "Action", "Description", "Target", "Details", "IP Address"];
      const rows = filteredActivities.map((a) => {
        const meta = getActivityMeta(a);
        return [
          `"${formatDateTime(a.timestamp)}"`,
          `"${(a.userName || "System").replace(/"/g, '""')}"`,
          `"${a.userRole || ""}"`,
          `"${meta.badgeText}"`,
          `"${meta.description.replace(/"/g, '""')}"`,
          `"${meta.target.replace(/"/g, '""')}"`,
          `"${(a.details || "").replace(/"/g, '""')}"`,
          `"${a.ipAddress || ""}"`,
        ];
      });

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Activity_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-2">
          <span>Settings</span>
          <span>&rsaquo;</span>
          <span className="text-slate-900 font-semibold">Activity Logs</span>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Activity & Audit Logs</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Comprehensive, human-readable audit trail of administrative events, permission modifications, authentication actions, and staff updates.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={fetchActivities}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-slate-500 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* 4 Summary KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Total Events Logged</div>
              <div className="text-2xl font-bold text-slate-900 leading-tight mt-0.5">
                {summaryMetrics.total}
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Role & Permission Changes</div>
              <div className="text-2xl font-bold text-slate-900 leading-tight mt-0.5">
                {summaryMetrics.rolesCount}
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Staff Management Events</div>
              <div className="text-2xl font-bold text-slate-900 leading-tight mt-0.5">
                {summaryMetrics.staffCount}
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Security & Auth Events</div>
              <div className="text-2xl font-bold text-slate-900 leading-tight mt-0.5">
                {summaryMetrics.authCount}
              </div>
            </div>
          </div>
        </div>

        {/* Filter controls */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative min-w-[280px] flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by actor, action description, role, or target..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="py-1 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1677E8]"
              >
                <option value="ALL">All Categories</option>
                <option value="ROLES">Role & Permissions</option>
                <option value="STAFF">Staff & User Management</option>
                <option value="AUTH">Authentication & Security</option>
                <option value="APPROVALS">Document Approvals</option>
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-900">{filteredActivities.length}</strong> events
          </div>
        </div>

        {/* Activity Logs Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-44">Timestamp</th>
                  <th className="py-3 px-4 w-48">Actor</th>
                  <th className="py-3 px-3 text-center w-36">Event Type</th>
                  <th className="py-3 px-4">Activity Description</th>
                  <th className="py-3 px-4 w-48">Target</th>
                  <th className="py-3 px-4 text-right w-24">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredActivities.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400">
                      No activity log records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredActivities.map((act) => {
                    const meta = getActivityMeta(act);
                    const payload = parsePayload(act.details, act.newState);

                    return (
                      <tr key={act.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Timestamp */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{formatDateTime(act.timestamp)}</div>
                          <div className="text-[10px] text-slate-400">{formatRelativeTime(act.timestamp)}</div>
                        </td>

                        {/* Actor */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-[#1677E8] font-bold flex items-center justify-center text-xs shrink-0">
                              {(act.userName || "S").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">{act.userName || "System"}</div>
                              <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                                {act.userRole || "ADMIN"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Event Type Badge */}
                        <td className="py-3.5 px-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${meta.badgeColor}`}>
                            {meta.icon}
                            <span>{meta.badgeText}</span>
                          </span>
                        </td>

                        {/* Human-Readable Description */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-xs">{meta.title}</div>
                          <div className="text-slate-600 text-[11px] leading-relaxed mt-0.5">
                            {meta.description}
                          </div>
                        </td>

                        {/* Target */}
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-800 text-[11px] bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 inline-block truncate max-w-[180px]">
                            {meta.target}
                          </span>
                        </td>

                        {/* Details Modal Trigger */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedDetailModalItem(act)}
                            className="text-xs text-[#1677E8] hover:text-[#1268D3] font-semibold hover:underline cursor-pointer"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedDetailModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-[#1677E8]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Activity Event Details
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Event ID: {selectedDetailModalItem.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailModalItem(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-[10px]">Actor</span>
                  <span className="font-bold text-slate-800">{selectedDetailModalItem.userName || "System"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Action</span>
                  <span className="font-bold text-slate-800">{selectedDetailModalItem.action}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Timestamp</span>
                  <span className="font-bold text-slate-800">{formatDateTime(selectedDetailModalItem.timestamp)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">IP Address</span>
                  <span className="font-bold text-slate-800">{selectedDetailModalItem.ipAddress || "Internal / Local"}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-700 font-bold block mb-1">State Payload / Changes</span>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-60 leading-relaxed">
                  {selectedDetailModalItem.details
                    ? JSON.stringify(parsePayload(selectedDetailModalItem.details, selectedDetailModalItem.newState), null, 2)
                    : "// No state payload recorded"}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => setSelectedDetailModalItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
