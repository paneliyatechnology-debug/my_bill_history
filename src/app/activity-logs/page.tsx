"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../context/auth-context";
import { apiClient } from "../../lib/api-client";
import {
  Search,
  RefreshCw,
  FileSpreadsheet,
  ChevronRight,
  Eye,
  Building2,
  ArrowRight,
  Activity,
  Users,
  Clock,
  GitCompare,
  FilterX,
} from "lucide-react";
import {
  ActivityDetailDrawer,
  ActivityEventDetail,
} from "../../components/audit/activity-detail-drawer";
import {
  extractRecordSubject,
  formatActivityAction,
  formatActivityModule,
  formatCompactValue,
  getActionToneClasses,
  getMeaningfulChanges,
} from "../../lib/activity-formatter";
import * as XLSX from "xlsx";

export default function ActivityLogsPage() {
  const { user, lang, companies } = useAuth();

  const [logs, setLogs] = useState<ActivityEventDetail[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState("ALL");
  const [selectedAction, setSelectedAction] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("THIS_FY");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [hideAuthNoise, setHideAuthNoise] = useState(true);

  // Summary Metrics
  const [summary, setSummary] = useState({
    totalEvents: 0,
    todayEvents: 0,
    distinctOperators: 0,
    changesTracked: 0,
  });

  // Drawer
  const [selectedEvent, setSelectedEvent] = useState<ActivityEventDetail | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const dateRange = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    if (dateFilter === "TODAY") {
      return { fromDate: todayStr, toDate: todayStr };
    }
    if (dateFilter === "YESTERDAY") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split("T")[0];
      return { fromDate: yStr, toDate: yStr };
    }
    if (dateFilter === "THIS_WEEK") {
      const w = new Date();
      w.setDate(w.getDate() - 7);
      return { fromDate: w.toISOString().split("T")[0], toDate: todayStr };
    }
    if (dateFilter === "THIS_MONTH") {
      const m = new Date(now.getFullYear(), now.getMonth(), 1);
      return { fromDate: m.toISOString().split("T")[0], toDate: todayStr };
    }
    if (dateFilter === "THIS_FY") {
      const currentYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      return {
        fromDate: `${currentYear}-04-01`,
        toDate: todayStr,
      };
    }
    return { fromDate: undefined, toDate: undefined };
  }, [dateFilter]);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = {
        page: currentPage,
        limit: pageSize,
      };

      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedModule !== "ALL") params.module = selectedModule;
      if (selectedAction !== "ALL") params.action = selectedAction;
      if (dateRange.fromDate) params.fromDate = dateRange.fromDate;
      if (dateRange.toDate) params.toDate = dateRange.toDate;
      if (isSuperAdmin && selectedCompanyId) params.companyId = selectedCompanyId;

      const res = await apiClient.get<any>("/activity-logs", params);
      const itemsList: ActivityEventDetail[] = (res && (res.items || res.logs)) || [];
      if (res) {
        setLogs(itemsList);
        setTotalEntries(res.total || itemsList.length);
        const pageWithChanges = itemsList.filter(
          (l) => Array.isArray(l.changes) && l.changes.length > 0,
        ).length;

        if (res.summary) {
          setSummary({
            totalEvents: res.summary.total || res.summary.totalEvents || res.total || 0,
            todayEvents: res.summary.today || res.summary.todayEvents || 0,
            distinctOperators: res.summary.activeUsers || res.summary.distinctOperators || 0,
            changesTracked:
              res.summary.updatesCount ||
              res.summary.createsCount ||
              pageWithChanges,
          });
        }
      }
    } catch (err) {
      console.error("Failed to load activity logs:", err);
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    searchQuery,
    selectedModule,
    selectedAction,
    dateRange,
    isSuperAdmin,
    selectedCompanyId,
  ]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Client-side filter to hide noisy token refreshes when toggle is active
  // (only applies when user hasn't explicitly filtered to AUTH or User module)
  const displayedLogs = useMemo(() => {
    if (!hideAuthNoise || selectedAction === "AUTH" || selectedModule === "User") {
      return logs;
    }
    return logs.filter((l) => l.action !== "AUTH_REFRESH_TOKEN");
  }, [logs, hideAuthNoise, selectedAction, selectedModule]);

  const handleInspect = (item: ActivityEventDetail) => {
    setSelectedEvent(item);
    setIsDrawerOpen(true);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedModule("ALL");
    setSelectedAction("ALL");
    setDateFilter("THIS_FY");
    setSelectedCompanyId("");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedModule !== "ALL" ||
    selectedAction !== "ALL" ||
    dateFilter !== "THIS_FY" ||
    selectedCompanyId !== "";

  const handleExportExcel = () => {
    if (displayedLogs.length === 0) return;
    const rows = displayedLogs.map((l) => {
      const actionInfo = formatActivityAction(l.action, l.entityName);
      const moduleInfo = formatActivityModule(l.entityName);
      const subject = extractRecordSubject(l.changes);
      const meaningful = getMeaningfulChanges(l.changes);
      const summaryText = meaningful
        .slice(0, 4)
        .map((c) =>
          c.oldValue !== undefined && c.oldValue !== null
            ? `${c.label || c.field}: ${formatCompactValue(c.oldValue)} -> ${formatCompactValue(c.newValue)}`
            : `${c.label || c.field}: ${formatCompactValue(c.newValue)}`,
        )
        .join(" | ");

      return {
        "Timestamp": new Date(l.timestamp).toLocaleString("en-IN"),
        "Performed By": l.userName || "System",
        "Phone": l.userPhone || l.phone || "-",
        "Action Summary": actionInfo.title,
        "Action Code": l.action,
        "Module": moduleInfo.label,
        "Record": subject || l.entityId,
        "Changes Summary": summaryText || "-",
        "IP Address": l.ipAddress || "-",
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Activity_Logs");
    XLSX.writeFile(wb, `Activity_Logs_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const totalPages = Math.ceil(totalEntries / pageSize) || 1;

  return (
    <div className="p-4 sm:p-6 lg:p-7 space-y-5 max-w-[1600px] mx-auto min-h-screen">
      {/* 1. Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
            <span>{lang === "gu" ? "ડેશબોર્ડ" : "Dashboard"}</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#0F172A] font-semibold">
              {lang === "gu" ? "પ્રવૃત્તિ લૉગ્સ" : "Activity Logs"}
            </span>
          </div>
          <h1 className="page-title mt-1">
            {lang === "gu"
              ? "સિસ્ટમ પ્રવૃત્તિ લૉગ્સ & ફેરફાર ઇતિહાસ"
              : "Activity Logs & Change History"}
          </h1>
          <p className="page-description">
            {lang === "gu"
              ? "કોણે, ક્યારે અને કયા રેકોર્ડમાં શું ફેરફાર કર્યો તેની સરળ અને સ્પષ્ટ વિગત."
              : "Clear record of who performed each action and exactly what changed across your business."}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F172A] bg-white border border-[#CBD5E1] rounded-lg hover:bg-[#F8FAFC] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            {lang === "gu" ? "રીફ્રેશ" : "Refresh"}
          </button>
          <button
            onClick={handleExportExcel}
            disabled={displayedLogs.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#0F172A] bg-white border border-[#CBD5E1] rounded-lg hover:bg-[#F8FAFC] disabled:opacity-50 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            {lang === "gu" ? "એક્સેલ ડાઉનલોડ" : "Export Excel"}
          </button>
        </div>
      </div>

      {/* 2. Compact Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl flex items-start justify-between">
          <div>
            <span className="card-label uppercase block">
              {lang === "gu" ? "કુલ ઇવેન્ટ્સ" : "Total Logged Events"}
            </span>
            <p className="tabular-nums font-semibold text-xl text-[#0F172A] mt-1">
              {summary.totalEvents.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-[#F1F5F9] text-[#475569]">
            <Activity className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl flex items-start justify-between">
          <div>
            <span className="card-label uppercase block">
              {lang === "gu" ? "આજના કાર્યો" : "Today's Activity"}
            </span>
            <p className="tabular-nums font-semibold text-xl text-[#0F172A] mt-1">
              {summary.todayEvents.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-blue-50 text-[#1677E8]">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl flex items-start justify-between">
          <div>
            <span className="card-label uppercase block">
              {lang === "gu" ? "સક્રિય યુઝર્સ" : "Active Team Members"}
            </span>
            <p className="tabular-nums font-semibold text-xl text-[#0F172A] mt-1">
              {summary.distinctOperators.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl flex items-start justify-between">
          <div>
            <span className="card-label uppercase block">
              {lang === "gu" ? "ટ્રેક થયેલા ફેરફારો" : "Data Changes (Page)"}
            </span>
            <p className="tabular-nums font-semibold text-xl text-[#0F172A] mt-1">
              {displayedLogs.filter((l) => (l.changes?.length || 0) > 0).length}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <GitCompare className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 3. Filter & Quick View Bar */}
      <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl space-y-2.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={
                lang === "gu"
                  ? "યુઝર, મોડ્યુલ, એક્શન અથવા ID શોધો..."
                  : "Search by user, module, action, or record ID..."
              }
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1677E8] text-[#0F172A] placeholder:text-[#94A3B8]"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isSuperAdmin && (
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#64748B]" />
                <select
                  value={selectedCompanyId}
                  onChange={(e) => {
                    setSelectedCompanyId(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 text-xs font-medium border border-[#CBD5E1] rounded-lg text-[#0F172A] bg-white"
                >
                  <option value="">{lang === "gu" ? "બધી કંપનીઓ" : "All Companies"}</option>
                  {(companies || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.legalName || c.tradeName || c.id}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <select
              value={selectedModule}
              onChange={(e) => {
                setSelectedModule(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs font-medium border border-[#CBD5E1] rounded-lg text-[#0F172A] bg-white"
            >
              <option value="ALL">{lang === "gu" ? "બધા મોડ્યુલ્સ" : "All Modules"}</option>
              <option value="SalesInvoice">{lang === "gu" ? "વેચાણ (Sales)" : "Sales Invoices"}</option>
              <option value="PurchaseInvoice">{lang === "gu" ? "ખરીદી (Purchases)" : "Purchase Bills"}</option>
              <option value="Voucher">{lang === "gu" ? "વાઉચર (Vouchers)" : "Vouchers & Payments"}</option>
              <option value="Item">{lang === "gu" ? "આઇટમ / સ્ટોક" : "Inventory Items"}</option>
              <option value="Party">{lang === "gu" ? "પાર્ટી / ખાતા" : "Parties"}</option>
              <option value="LedgerAccount">{lang === "gu" ? "ખાતાવહી (Ledgers)" : "Ledger Accounts"}</option>
              <option value="User">{lang === "gu" ? "યુઝર્સ અને લોગિન" : "Users & Auth"}</option>
              <option value="HsnMaster">HSN / SAC</option>
              <option value="ImportJob">{lang === "gu" ? "ડેટા આયાત" : "Data Imports"}</option>
            </select>

            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs font-medium border border-[#CBD5E1] rounded-lg text-[#0F172A] bg-white"
            >
              <option value="ALL">{lang === "gu" ? "બધી ક્રિયાઓ" : "All Actions"}</option>
              <option value="CREATE">{lang === "gu" ? "નવું બનાવેલ (Created)" : "Created"}</option>
              <option value="UPDATE">{lang === "gu" ? "ફેરફાર કરેલ (Updated)" : "Updated"}</option>
              <option value="DELETE">{lang === "gu" ? "કાઢી નાખેલ (Deleted)" : "Deleted"}</option>
              <option value="POST">{lang === "gu" ? "મંજૂર કરેલ (Posted)" : "Posted / Approved"}</option>
              <option value="CANCEL">{lang === "gu" ? "રદ કરેલ (Cancelled)" : "Cancelled"}</option>
              <option value="IMPORT">{lang === "gu" ? "આયાત (Imported)" : "Imported"}</option>
              <option value="AUTH">{lang === "gu" ? "લોગિન / સુરક્ષા" : "Login & Security"}</option>
            </select>

            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs font-medium border border-[#CBD5E1] rounded-lg text-[#0F172A] bg-white"
            >
              <option value="TODAY">{lang === "gu" ? "આજે" : "Today"}</option>
              <option value="YESTERDAY">{lang === "gu" ? "ગઈકાલે" : "Yesterday"}</option>
              <option value="THIS_WEEK">{lang === "gu" ? "છેલ્લા ૭ દિવસ" : "Last 7 Days"}</option>
              <option value="THIS_MONTH">{lang === "gu" ? "આ મહિને" : "This Month"}</option>
              <option value="THIS_FY">{lang === "gu" ? "ચાલુ નાણાકીય વર્ષ" : "This FY"}</option>
              <option value="ALL">{lang === "gu" ? "બધો સમય" : "All Time"}</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#64748B] hover:text-[#0F172A] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg cursor-pointer"
              >
                <FilterX className="w-3.5 h-3.5" />
                {lang === "gu" ? "ક્લિયર" : "Reset"}
              </button>
            )}
          </div>
        </div>

        {/* Quick Toggle Row */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-[#F1F5F9]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHideAuthNoise((v) => !v)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                hideAuthNoise
                  ? "bg-blue-50 text-[#1677E8] border-blue-200"
                  : "bg-white text-[#64748B] border-[#E2E8F0] hover:text-[#0F172A]"
              }`}
            >
              {hideAuthNoise
                ? lang === "gu"
                  ? "✓ સેશન રિફ્રેશ છુપાયેલ છે (ફક્ત મુખ્ય ફેરફારો)"
                  : "✓ Hiding Session Refreshes (Cleaner View)"
                : lang === "gu"
                  ? "સેશન રિફ્રેશ સહિત બધું દેખાય છે"
                  : "Showing All Including Session Refreshes"}
            </button>
          </div>
          <span className="text-[11px] text-[#64748B]">
            {lang === "gu"
              ? `કોઈપણ લાઈન પર ક્લિક કરીને પહેલાં અને પછીના બધા ફેરફારો જુઓ`
              : `Click any row to inspect full Before vs. After changes`}
          </span>
        </div>
      </div>

      {/* 4. Clean Human-Readable Activity Table */}
      <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[880px] text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold text-[11px]">
                <th className="py-2.5 px-4 w-[15%]">{lang === "gu" ? "સમય" : "When"}</th>
                <th className="py-2.5 px-4 w-[16%]">{lang === "gu" ? "કોણે કર્યું" : "Who"}</th>
                <th className="py-2.5 px-4 w-[24%]">{lang === "gu" ? "શું કાર્ય કર્યું" : "Action Performed"}</th>
                <th className="py-2.5 px-4 w-[35%]">{lang === "gu" ? "શું બદલાયું / વિગત" : "What Changed / Details"}</th>
                <th className="py-2.5 px-4 text-right w-[10%]">{lang === "gu" ? "વિગત" : "Details"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#64748B]">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#1677E8]" />
                      <span>{lang === "gu" ? "લૉગ્સ લોડ થઈ રહ્યા છે..." : "Loading activity history..."}</span>
                    </div>
                  </td>
                </tr>
              ) : displayedLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#64748B]">
                    <p className="font-medium text-[#0F172A]">
                      {lang === "gu"
                        ? "કોઈ પ્રવૃત્તિ લૉગ્સ મળ્યા નથી."
                        : "No matching activity logs found."}
                    </p>
                    {hideAuthNoise && logs.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setHideAuthNoise(false)}
                        className="mt-2 text-xs text-[#1677E8] font-semibold hover:underline cursor-pointer"
                      >
                        {lang === "gu"
                          ? "સેશન રિફ્રેશ ઇવેન્ટ્સ પણ બતાવો"
                          : "Include session refresh events on this page"}
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                displayedLogs.map((item) => {
                  const actionInfo = formatActivityAction(item.action, item.entityName);
                  const moduleInfo = formatActivityModule(item.entityName);
                  const tone = getActionToneClasses(actionInfo.tone);
                  const meaningful = getMeaningfulChanges(item.changes);
                  const subject = extractRecordSubject(item.changes);
                  const isUpdateLike =
                    actionInfo.tone === "update" || actionInfo.tone === "post";
                  const isCreate = actionInfo.tone === "create";
                  const isAuth = actionInfo.tone === "auth";
                  const userInitial = (item.userName || "S").charAt(0).toUpperCase();
                  const phone = item.userPhone || item.phone;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
                      onClick={() => handleInspect(item)}
                    >
                      {/* When */}
                      <td className="py-3 px-4 tabular-nums text-[#475569] whitespace-nowrap align-top">
                        <div className="font-medium text-[#0F172A]">
                          {new Date(item.timestamp).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          {new Date(item.timestamp).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </div>
                      </td>

                      {/* Who */}
                      <td className="py-3 px-4 whitespace-nowrap align-top">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-[#EFF6FF] text-[#1677E8] font-semibold text-xs flex items-center justify-center shrink-0">
                            {userInitial}
                          </span>
                          <div className="min-w-0">
                            <div className="font-semibold text-[#0F172A] truncate">
                              {item.userName || "System"}
                            </div>
                            {phone && (
                              <span className="text-[11px] text-[#64748B] tabular-nums block">
                                {phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Action Performed */}
                      <td className="py-3 px-4 align-top">
                        <div className="font-semibold text-[#0F172A]">
                          {lang === "gu" ? actionInfo.titleGu : actionInfo.title}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.2 rounded-full text-[10.5px] font-semibold border ${tone.badge}`}
                          >
                            {lang === "gu" ? actionInfo.badgeGu : actionInfo.badge}
                          </span>
                          <span className="text-[11px] text-[#64748B]">
                            • {lang === "gu" ? moduleInfo.labelGu : moduleInfo.label}
                          </span>
                        </div>
                      </td>

                      {/* What Changed / Details */}
                      <td className="py-3 px-4 align-top">
                        {subject && (
                          <div className="font-semibold text-[#0F172A] mb-1 truncate max-w-[340px]">
                            {subject}
                          </div>
                        )}

                        {isAuth ? (
                          <div className="text-xs text-[#64748B]">
                            {item.action === "AUTH_LOGIN"
                              ? lang === "gu"
                                ? "સફળતાપૂર્વક લોગિન કર્યું"
                                : "User logged in"
                              : lang === "gu"
                                ? "સેશન / બ્રાન્ચ ટોકન રિફ્રેશ થયું"
                                : "Session / branch context refreshed"}
                            {item.ipAddress && item.ipAddress !== "-" && (
                              <span className="ml-1.5 font-mono text-[11px] text-[#94A3B8]">
                                ({item.ipAddress})
                              </span>
                            )}
                          </div>
                        ) : meaningful.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {meaningful.slice(0, 2).map((ch, idx) => {
                              const hasOld =
                                isUpdateLike &&
                                ch.oldValue !== null &&
                                ch.oldValue !== undefined &&
                                ch.oldValue !== "";
                              return (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-[#334155]"
                                >
                                  <span className="font-medium text-[#64748B]">
                                    {ch.label || ch.field}:
                                  </span>
                                  {hasOld && (
                                    <>
                                      <span className="line-through text-rose-600">
                                        {formatCompactValue(ch.oldValue)}
                                      </span>
                                      <ArrowRight className="w-2.5 h-2.5 text-[#94A3B8]" />
                                    </>
                                  )}
                                  <span className="font-semibold text-[#0F172A]">
                                    {formatCompactValue(ch.newValue ?? ch.oldValue)}
                                  </span>
                                </span>
                              );
                            })}
                            {meaningful.length > 2 && (
                              <span className="text-[11px] font-medium text-[#1677E8]">
                                +{meaningful.length - 2}{" "}
                                {lang === "gu" ? "વધુ" : "more"}
                              </span>
                            )}
                          </div>
                        ) : isCreate ? (
                          <span className="text-xs text-[#64748B]">
                            {lang === "gu" ? "નવો રેકોર્ડ ઉમેરાયો" : "New record created"}
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-[#94A3B8]">
                            ID: {item.entityId ? `${item.entityId.slice(0, 12)}…` : "—"}
                          </span>
                        )}
                      </td>

                      {/* View Details */}
                      <td
                        className="py-3 px-4 text-right whitespace-nowrap align-top"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleInspect(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#0F172A] bg-white border border-[#CBD5E1] rounded-lg hover:bg-[#F1F5F9] hover:border-[#94A3B8] transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#475569]" />
                          {lang === "gu" ? "જુઓ" : "View"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-4 py-3 border-t border-[#E2E8F0] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
          <div className="flex items-center gap-2">
            <span>
              {lang === "gu" ? "કુલ રેકોર્ડ્સ:" : "Total Records:"}{" "}
              <strong className="text-[#0F172A]">{totalEntries}</strong>
            </span>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <span>{lang === "gu" ? "પ્રતિ પેજ:" : "Rows:"}</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-0.5 border border-[#CBD5E1] rounded text-[#0F172A] bg-white"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-2.5 py-1 border border-[#CBD5E1] rounded hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {lang === "gu" ? "પાછળ" : "Prev"}
            </button>
            <span className="px-3 py-1 font-semibold text-[#0F172A] tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-2.5 py-1 border border-[#CBD5E1] rounded hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {lang === "gu" ? "આગળ" : "Next"}
            </button>
          </div>
        </div>
      </div>

      {/* 5. Detail Drawer */}
      <ActivityDetailDrawer
        event={selectedEvent}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        lang={lang}
      />
    </div>
  );
}
