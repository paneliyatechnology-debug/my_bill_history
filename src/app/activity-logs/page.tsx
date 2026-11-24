"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../context/auth-context";
import { apiClient } from "../../lib/api-client";
import {
  History,
  Search,
  Filter,
  Download,
  RefreshCw,
  Clock,
  User,
  ShieldCheck,
  FileSpreadsheet,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  Building2,
  Calendar,
  Layers,
} from "lucide-react";
import {
  ActivityDetailDrawer,
  ActivityEventDetail,
} from "../../components/audit/activity-detail-drawer";
import * as XLSX from "xlsx";

export default function ActivityLogsPage() {
  const { user, lang, currentCompany, companies } = useAuth();

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

  // Summary Metrics
  const [summary, setSummary] = useState({
    totalEvents: 0,
    todayEvents: 0,
    distinctOperators: 0,
    eventsWithDiffs: 0,
  });

  // Drawer
  const [selectedEvent, setSelectedEvent] = useState<ActivityEventDetail | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  // Calculate Date Ranges
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
      const params: any = {
        page: currentPage,
        limit: pageSize,
      };

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (selectedModule !== "ALL") {
        params.module = selectedModule;
      }
      if (selectedAction !== "ALL") {
        params.action = selectedAction;
      }
      if (dateRange.fromDate) {
        params.fromDate = dateRange.fromDate;
      }
      if (dateRange.toDate) {
        params.toDate = dateRange.toDate;
      }
      if (isSuperAdmin && selectedCompanyId) {
        params.companyId = selectedCompanyId;
      }

      const res = await apiClient.get<any>("/activity-logs", params);
      const itemsList = (res && (res.items || res.logs)) || [];
      if (res) {
        setLogs(itemsList);
        setTotalEntries(res.total || itemsList.length);
        if (res.summary) {
          setSummary({
            totalEvents: res.summary.total || res.summary.totalEvents || res.total || 0,
            todayEvents: res.summary.today || res.summary.todayEvents || 0,
            distinctOperators: res.summary.activeUsers || res.summary.distinctOperators || 0,
            eventsWithDiffs: res.summary.updatesCount || res.summary.eventsWithDiffs || 0,
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

  const handleInspect = (item: ActivityEventDetail) => {
    setSelectedEvent(item);
    setIsDrawerOpen(true);
  };

  const handleExportExcel = () => {
    if (logs.length === 0) return;
    const rows = logs.map((l) => ({
      "Timestamp": new Date(l.timestamp).toLocaleString("en-IN"),
      "Operator": l.userName || "System",
      "Phone": l.phone || "-",
      "Action": l.action,
      "Module / Entity": l.entityName,
      "Reference ID": l.entityId,
      "IP Address": l.ipAddress || "-",
      "Fields Changed Count": l.changes?.length || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Activity_Logs");
    XLSX.writeFile(wb, `Activity_Logs_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const totalPages = Math.ceil(totalEntries / pageSize) || 1;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      {/* 1. Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
            <span>{lang === "gu" ? "મુખ્ય પૃષ્ઠ" : "Dashboard"}</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#0F172A] font-semibold">
              {lang === "gu" ? "પ્રવૃત્તિ લૉગ્સ (Audit Trail)" : "Activity Logs"}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight mt-1">
            {lang === "gu"
              ? "સિસ્ટમ પ્રવૃત્તિ લૉગ્સ & સંપૂર્ણ ઓડિટ ટ્રેઇલ"
              : "System Activity Logs & Enterprise Audit Trail"}
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            {lang === "gu"
              ? "તમામ મેનૂ, દસ્તાવેજો અને વ્યવહારોમાં થયેલા ફેરફારોની જૂની & નવી કિંમતો સાથે સુરક્ષિત ટ્રેકિંગ."
              : "Cryptographically verified, immutable record of every user action with field-level Old vs. New value diffs."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0F172A] bg-white border border-[#CBD5E1] rounded-lg hover:bg-[#F8FAFC] shadow-2xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            {lang === "gu" ? "રીફ્રેશ" : "Refresh"}
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0F172A] bg-white border border-[#CBD5E1] rounded-lg hover:bg-[#F8FAFC] shadow-2xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#0F172A]" />
            {lang === "gu" ? "એક્સેલ ડાઉનલોડ" : "Export Excel"}
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Summary Cards (Clean Corporate UI - text-[#0F172A], NO pastel pills) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
          <span className="text-[11px] text-[#64748B] uppercase font-semibold block">
            {lang === "gu" ? "કુલ સુરક્ષા ઇવેન્ટ્સ" : "Total Security Events"}
          </span>
          <p className="tabular-nums font-bold text-xl sm:text-2xl text-[#0F172A] mt-1">
            {summary.totalEvents.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-[#64748B] block mt-0.5">
            {lang === "gu" ? "સંપૂર્ણ ઓડિટ ટ્રેઇલ રેકોર્ડ્સ" : "All-time logged actions"}
          </span>
        </div>

        <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
          <span className="text-[11px] text-[#64748B] uppercase font-semibold block">
            {lang === "gu" ? "આજના વ્યવહારો" : "Today's Actions"}
          </span>
          <p className="tabular-nums font-bold text-xl sm:text-2xl text-[#0F172A] mt-1">
            {summary.todayEvents.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-[#64748B] block mt-0.5">
            {lang === "gu" ? "આજના દિવસમાં થયેલી ક્રિયાઓ" : "Logged in current session date"}
          </span>
        </div>

        <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
          <span className="text-[11px] text-[#64748B] uppercase font-semibold block">
            {lang === "gu" ? "સક્રિય ઓપરેટર્સ" : "Active Operators"}
          </span>
          <p className="tabular-nums font-bold text-xl sm:text-2xl text-[#0F172A] mt-1">
            {summary.distinctOperators.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-[#64748B] block mt-0.5">
            {lang === "gu" ? "પ્રમાણિત યુઝર્સ & સ્ટાફ" : "Authorized team members"}
          </span>
        </div>

        <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
          <span className="text-[11px] text-[#64748B] uppercase font-semibold block">
            {lang === "gu" ? "ફેરફાર થયેલા મૂલ્યો" : "Value Diffs Tracked"}
          </span>
          <p className="tabular-nums font-bold text-xl sm:text-2xl text-[#0F172A] mt-1">
            {summary.eventsWithDiffs.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-[#64748B] block mt-0.5">
            {lang === "gu" ? "જૂની vs નવી કિંમતો સાથે" : "With Old vs New field values"}
          </span>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={
                lang === "gu"
                  ? "યુઝર, એક્શન, મોડ્યુલ, દસ્તાવેજ આઈડી અથવા આઈપી શોધો..."
                  : "Search operator, action, module, reference ID, IP..."
              }
              className="w-full pl-9 pr-3 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1677E8] text-[#0F172A] placeholder:text-[#94A3B8]"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* SuperAdmin Multi-Tenant Company Selector */}
            {isSuperAdmin && (
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#64748B]" />
                <select
                  value={selectedCompanyId}
                  onChange={(e) => {
                    setSelectedCompanyId(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 text-xs font-semibold border border-[#CBD5E1] rounded-lg text-[#0F172A] bg-white focus:outline-none focus:ring-1 focus:ring-[#1677E8]"
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

            {/* Module Filter */}
            <select
              value={selectedModule}
              onChange={(e) => {
                setSelectedModule(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs font-semibold border border-[#CBD5E1] rounded-lg text-[#0F172A] bg-white focus:outline-none focus:ring-1 focus:ring-[#1677E8]"
            >
              <option value="ALL">{lang === "gu" ? "બધા મોડ્યુલ્સ" : "All Modules"}</option>
              <option value="SalesInvoice">Sales (વેચાણ)</option>
              <option value="PurchaseInvoice">Purchases (ખરીદી)</option>
              <option value="Voucher">Accounting Vouchers (વાઉચર)</option>
              <option value="Item">Inventory Items (આઇટમ)</option>
              <option value="Party">Parties / Khata (પાર્ટી)</option>
              <option value="LedgerAccount">Ledger Accounts (ખાતાવહી)</option>
              <option value="User">Users & Staff (વપરાશકર્તા)</option>
              <option value="HsnMaster">HSN / SAC Masters</option>
              <option value="ImportJob">Data Imports (ડેટા આયાત)</option>
            </select>

            {/* Action Filter */}
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs font-semibold border border-[#CBD5E1] rounded-lg text-[#0F172A] bg-white focus:outline-none focus:ring-1 focus:ring-[#1677E8]"
            >
              <option value="ALL">{lang === "gu" ? "બધી ક્રિયાઓ" : "All Actions"}</option>
              <option value="CREATE">Created (નવું ઉમેરેલ)</option>
              <option value="UPDATE">Updated (ફેરફાર કરેલ)</option>
              <option value="DELETE">Deleted (કાઢી નાખેલ)</option>
              <option value="POST">Posted / Approved (મંજૂર)</option>
              <option value="CANCEL">Cancelled (રદ કરેલ)</option>
              <option value="IMPORT">Imported (આયાત)</option>
              <option value="AUTH">Authentication / Login</option>
            </select>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs font-semibold border border-[#CBD5E1] rounded-lg text-[#0F172A] bg-white focus:outline-none focus:ring-1 focus:ring-[#1677E8]"
            >
              <option value="TODAY">{lang === "gu" ? "આજે" : "Today"}</option>
              <option value="YESTERDAY">{lang === "gu" ? "ગઈકાલે" : "Yesterday"}</option>
              <option value="THIS_WEEK">{lang === "gu" ? "આ અઠવાડિયે" : "This Week"}</option>
              <option value="THIS_MONTH">{lang === "gu" ? "આ મહિને" : "This Month"}</option>
              <option value="THIS_FY">{lang === "gu" ? "ચાલુ નાણાકીય વર્ષ" : "This FY"}</option>
              <option value="ALL">{lang === "gu" ? "બધો સમય" : "All Time"}</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Main Activity Logs Table */}
      <div className="border border-[#E2E8F0] rounded-xl overflow-hidden shadow-2xs bg-white">
        <div className="overflow-x-auto w-full -webkit-overflow-scrolling-touch">
          <table className="w-full min-w-[850px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold text-[11px]">
                <th className="py-3 px-4">{lang === "gu" ? "સમય & તારીખ" : "Timestamp"}</th>
                <th className="py-3 px-4">{lang === "gu" ? "ઓપરેટર / સ્ટાફ" : "Performed By"}</th>
                <th className="py-3 px-4">{lang === "gu" ? "ક્રિયા (Action)" : "Action"}</th>
                <th className="py-3 px-4">{lang === "gu" ? "મોડ્યુલ / એન્ટિટી" : "Module / Entity"}</th>
                <th className="py-3 px-4">{lang === "gu" ? "સંદર્ભ આઈડી" : "Reference ID"}</th>
                <th className="py-3 px-4">{lang === "gu" ? "મૂલ્ય ફેરફાર (Diff)" : "Diff Summary"}</th>
                <th className="py-3 px-4 text-right">{lang === "gu" ? "કાર્ય" : "Action"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#64748B]">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#1677E8]" />
                      <span>{lang === "gu" ? "લૉગ્સ લોડ થઈ રહ્યા છે..." : "Loading activity trail..."}</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#64748B]">
                    {lang === "gu"
                      ? "કોઈ પ્રવૃત્તિ લૉગ્સ મળ્યા નથી."
                      : "No activity logs match the selected filters."}
                  </td>
                </tr>
              ) : (
                logs.map((item) => {
                  const hasDiff = item.changes && item.changes.length > 0;
                  const isCreate = item.action.includes("CREATE");
                  const isDelete = item.action.includes("DELETE");

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
                      onClick={() => handleInspect(item)}
                    >
                      <td className="py-3 px-4 tabular-nums text-[#64748B] whitespace-nowrap">
                        {new Date(item.timestamp).toLocaleString("en-IN", {
                          dateStyle: "short",
                          timeStyle: "medium",
                        })}
                      </td>

                      <td className="py-3 px-4 font-semibold text-[#0F172A] whitespace-nowrap">
                        <div>{item.userName || "System"}</div>
                        {item.phone && (
                          <span className="text-[10px] text-[#64748B] font-normal block tabular-nums">
                            {item.phone}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0F172A]" />
                          <span className="font-mono text-xs font-semibold text-[#0F172A]">
                            {item.action}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 tabular-nums text-[#0F172A] whitespace-nowrap">
                        {item.entityName}
                      </td>

                      <td className="py-3 px-4 tabular-nums font-mono text-[#64748B] whitespace-nowrap">
                        {item.entityId ? item.entityId.slice(0, 14) + "..." : "—"}
                      </td>

                      <td className="py-3 px-4 text-[#0F172A]">
                        {hasDiff ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-semibold text-[#0F172A]">
                              {item.changes!.length}{" "}
                              {item.changes!.length === 1 ? "field changed" : "fields changed"}
                            </span>
                            <span className="text-[10px] text-[#64748B] truncate max-w-[150px]">
                              ({item.changes!.map((c) => c.label || c.field).slice(0, 2).join(", ")}
                              {item.changes!.length > 2 ? "..." : ""})
                            </span>
                          </div>
                        ) : isCreate ? (
                          <span className="text-xs text-[#64748B]">New Record Created</span>
                        ) : isDelete ? (
                          <span className="text-xs text-[#64748B]">Record Deleted</span>
                        ) : (
                          <span className="text-xs text-[#94A3B8]">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleInspect(item)}
                          className="px-2.5 py-1 text-xs font-semibold text-[#0F172A] bg-white border border-[#CBD5E1] rounded hover:bg-[#F1F5F9] transition-colors"
                        >
                          {lang === "gu" ? "વિગત જુઓ" : "Inspect Diff"}
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
        <div className="p-4 border-t border-[#E2E8F0] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
          <div className="flex items-center gap-2">
            <span>
              {lang === "gu" ? "કુલ રેકોર્ડ્સ:" : "Total Records:"}{" "}
              <strong className="text-[#0F172A]">{totalEntries}</strong>
            </span>
            <span>•</span>
            <div className="flex items-center gap-1">
              <span>{lang === "gu" ? "પ્રતિ પેજ:" : "Rows per page:"}</span>
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
              className="px-2.5 py-1 border border-[#CBD5E1] rounded hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {lang === "gu" ? "પાછળ" : "Prev"}
            </button>
            <span className="px-3 py-1 font-semibold text-[#0F172A]">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-2.5 py-1 border border-[#CBD5E1] rounded hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {lang === "gu" ? "આગળ" : "Next"}
            </button>
          </div>
        </div>
      </div>

      {/* 5. Diff Inspection Drawer */}
      <ActivityDetailDrawer
        event={selectedEvent}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        lang={lang}
      />
    </div>
  );
}
