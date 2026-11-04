"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  automatedBillingApi,
  AutomatedBillingSchedule,
  AutomatedBillingSummary,
  formatCurrency,
} from "@/lib/automated-billing";

export default function AutomatedBillingPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "gu">("en");
  const [schedules, setSchedules] = useState<AutomatedBillingSchedule[]>([]);
  const [summary, setSummary] = useState<AutomatedBillingSummary>({
    activeSchedulesCount: 0,
    dueSoonCount: 0,
    invoicesThisMonthCount: 0,
    needsAttentionCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "ACTIVE" | "PAUSED" | "STOPPED">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modals and action loading states
  const [runningId, setRunningId] = useState<string | null>(null);
  const [scheduleToStop, setScheduleToStop] = useState<AutomatedBillingSchedule | null>(null);
  const [isStopping, setIsStopping] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Sync language
  useEffect(() => {
    const handleStorage = () => {
      const stored = localStorage.getItem("preferred_language");
      if (stored === "gu" || stored === "en") setLang(stored);
    };
    handleStorage();
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sumRes, listRes] = await Promise.all([
        automatedBillingApi.getSummary().catch(() => ({
          activeSchedulesCount: 0,
          dueSoonCount: 0,
          invoicesThisMonthCount: 0,
          needsAttentionCount: 0,
        })),
        automatedBillingApi.listSchedules({
          status: activeTab === "ALL" ? undefined : activeTab,
          search: searchTerm.trim() || undefined,
          page,
          limit: 15,
        }),
      ]);

      setSummary(sumRes);
      setSchedules(listRes.items || []);
      setTotalItems(listRes.total || 0);
      setTotalPages(listRes.totalPages || 1);
    } catch (err: any) {
      setNotification({
        type: "error",
        text: err.message || "Failed to load automated billing data.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, searchTerm, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRunNow = async (schedule: AutomatedBillingSchedule) => {
    if (runningId) return;
    setRunningId(schedule.id);
    try {
      const res = await automatedBillingApi.runNow(schedule.id);
      setNotification({
        type: "success",
        text: `Invoice #${res.invoice?.invoiceNumber || "generated"} created successfully!`,
      });
      loadData();
    } catch (err: any) {
      setNotification({
        type: "error",
        text: err.message || "Run failed. Please review error history.",
      });
    } finally {
      setRunningId(null);
    }
  };

  const handleTogglePause = async (schedule: AutomatedBillingSchedule) => {
    try {
      if (schedule.status === "ACTIVE") {
        await automatedBillingApi.pauseSchedule(schedule.id);
        setNotification({ type: "success", text: `Schedule "${schedule.scheduleName}" paused.` });
      } else if (schedule.status === "PAUSED") {
        await automatedBillingApi.resumeSchedule(schedule.id);
        setNotification({ type: "success", text: `Schedule "${schedule.scheduleName}" resumed.` });
      }
      loadData();
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Action failed." });
    }
  };

  const handleConfirmStop = async () => {
    if (!scheduleToStop) return;
    setIsStopping(true);
    try {
      await automatedBillingApi.stopSchedule(scheduleToStop.id);
      setNotification({
        type: "success",
        text: `Schedule "${scheduleToStop.scheduleName}" has been permanently stopped.`,
      });
      setScheduleToStop(null);
      loadData();
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to stop schedule." });
    } finally {
      setIsStopping(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm font-medium ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <span>{notification.text}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-gray-400 hover:text-gray-700 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-semibold text-[#182230]">
              {lang === "gu" ? "ઓટોમેટેડ બિલિંગ" : "Automated Billing"}
            </h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold">
              Recurring Invoices
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {lang === "gu"
              ? "રિકરિંગ વેચાણ ઇનવોઇસ અને નિર્ધારિત શિડ્યુલ મેનેજ કરો."
              : "Manage recurring sales invoices, automated schedules, and upcoming runs."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2.5 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
            title="Refresh"
          >
            <svg
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          <Link
            href="/sales/automated-billing/new"
            className="inline-flex items-center gap-2 bg-[#1677E8] hover:bg-[#1268D3] text-white h-9 px-3.5 rounded-xl font-medium text-[13px] shadow-sm transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>{lang === "gu" ? "+ નવું ઓટોમેટેડ બિલ" : "+ Create Automated Invoice"}</span>
          </Link>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Schedules */}
        <div
          onClick={() => setActiveTab("ACTIVE")}
          className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs cursor-pointer hover:border-emerald-300 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">
              {lang === "gu" ? "સક્રિય શિડ્યુલ" : "Active Schedules"}
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          </div>
          <div className="mt-3 text-2xl font-bold text-gray-900">
            {isLoading ? "..." : summary.activeSchedulesCount}
          </div>
          <div className="text-xs text-emerald-700 mt-1 font-medium">
            {lang === "gu" ? "નિયમિત રીતે ચાલુ" : "Running on schedule"}
          </div>
        </div>

        {/* Due Soon */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">
              {lang === "gu" ? "આગામી ૭ દિવસમાં" : "Due in 7 Days"}
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          </div>
          <div className="mt-3 text-2xl font-bold text-gray-900">
            {isLoading ? "..." : summary.dueSoonCount}
          </div>
          <div className="text-xs text-blue-700 mt-1 font-medium">
            {lang === "gu" ? "જલ્દી જ બિલ બનશે" : "Upcoming eligible runs"}
          </div>
        </div>

        {/* Generated This Month */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">
              {lang === "gu" ? "આ મહિને બનેલા બિલ" : "Generated This Month"}
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
          </div>
          <div className="mt-3 text-2xl font-bold text-gray-900">
            {isLoading ? "..." : summary.invoicesThisMonthCount}
          </div>
          <div className="text-xs text-indigo-700 mt-1 font-medium">
            {lang === "gu" ? "સફળતાપૂર્વક પોસ્ટ થયેલ" : "Successfully posted"}
          </div>
        </div>

        {/* Needs Attention */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">
              {lang === "gu" ? "ધ્યાન આપવાની જરૂર" : "Needs Attention"}
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          </div>
          <div className="mt-3 text-2xl font-bold text-gray-900">
            {isLoading ? "..." : summary.needsAttentionCount}
          </div>
          <div className="text-xs text-amber-700 mt-1 font-medium">
            {summary.needsAttentionCount > 0 ? "Requires review" : "All runs healthy"}
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            {(["ALL", "ACTIVE", "PAUSED", "STOPPED"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === tab
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {tab === "ALL"
                  ? lang === "gu"
                    ? "બધા (All)"
                    : "All"
                  : tab === "ACTIVE"
                  ? lang === "gu"
                    ? "સક્રિય (Active)"
                    : "Active"
                  : tab === "PAUSED"
                  ? lang === "gu"
                    ? "રોકેલા (Paused)"
                    : "Paused"
                  : lang === "gu"
                  ? "બંધ કરેલા (Stopped)"
                  : "Stopped"}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <input
              type="text"
              placeholder={lang === "gu" ? "શિડ્યુલ અથવા ગ્રાહક શોધો..." : "Search schedule or party..."}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[#1677E8] focus:bg-white h-10"
            />
            <svg
              className="w-4 h-4 text-gray-400 absolute left-3 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Schedules Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/75 border-b border-gray-200 text-gray-500 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">Schedule / ID</th>
                <th className="py-3 px-4">Party / Customer</th>
                <th className="py-3 px-4">Frequency</th>
                <th className="py-3 px-4">Next Run</th>
                <th className="py-3 px-4">Last Run</th>
                <th className="py-3 px-4 text-right">Est. Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-28"></div></td>
                    <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-36"></div></td>
                    <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="py-4 px-4 text-right"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                    <td className="py-4 px-4 text-center"><div className="h-5 bg-gray-200 rounded-full w-16 mx-auto"></div></td>
                    <td className="py-4 px-4 text-right"><div className="h-4 bg-gray-200 rounded w-20 ml-auto"></div></td>
                  </tr>
                ))
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-[#0F172A] mb-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.8}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      </div>
                      <h3 className="text-[15px] font-semibold text-gray-900">
                        {lang === "gu" ? "કોઈ ઓટોમેટેડ બિલિંગ શિડ્યુલ મળ્યું નથી" : "No Automated Billing Schedules Found"}
                      </h3>
                      <p className="text-xs text-gray-500 max-w-sm mt-1">
                        {lang === "gu"
                          ? "તમારા ગ્રાહકો માટે નિયમિત રિકરિંગ ઇનવોઇસ સેટ કરો જેથી આપમેળે બિલ બની જાય."
                          : "Set up repeating invoices for retainer clients, monthly services, or recurring subscriptions."}
                      </p>
                      <Link
                        href="/sales/automated-billing/new"
                        className="mt-4 inline-flex items-center gap-1.5 h-9 px-3 bg-[#1677E8] hover:bg-[#1268D3] text-white rounded-xl text-[13px] font-medium transition"
                      >
                        + Create Your First Schedule
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                schedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-gray-50/80 transition group">
                    {/* Schedule Name */}
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/sales/automated-billing/${schedule.id}`}
                        className="font-bold text-gray-900 hover:text-emerald-700 transition"
                      >
                        {schedule.scheduleName}
                      </Link>
                      <div className="text-[10px] text-gray-400 tabular-nums mt-0.5">
                        ID: {schedule.id.slice(0, 8)}...
                      </div>
                    </td>

                    {/* Party */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-800">{schedule.party.name}</div>
                      <div className="text-[11px] text-gray-500">{schedule.party.phone}</div>
                    </td>

                    {/* Frequency */}
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-gray-700">{schedule.frequency}</span>
                      {schedule.frequency === "MONTHLY" && schedule.dayOfMonth && (
                        <span className="text-[10px] text-gray-400 block">Day {schedule.dayOfMonth} of month</span>
                      )}
                      {schedule.frequency === "WEEKLY" && schedule.dayOfWeek !== null && (
                        <span className="text-[10px] text-gray-400 block">
                          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][schedule.dayOfWeek || 0]}
                        </span>
                      )}
                    </td>

                    {/* Next Run */}
                    <td className="py-3.5 px-4 tabular-nums text-gray-800">
                      {schedule.nextRunAt ? new Date(schedule.nextRunAt).toLocaleDateString() : "—"}
                    </td>

                    {/* Last Run */}
                    <td className="py-3.5 px-4">
                      {schedule.lastRunAt ? (
                        <div>
                          <span className="text-gray-700 block tabular-nums">
                            {new Date(schedule.lastRunAt).toLocaleDateString()}
                          </span>
                          <span
                            className={`inline-block text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                              schedule.lastRunStatus === "SUCCESS"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {schedule.lastRunStatus}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">Never</span>
                      )}
                    </td>

                    {/* Estimated Amount */}
                    <td className="py-3.5 px-4 text-right font-medium text-gray-900 tabular-nums">
                      {formatCurrency(schedule.estimatedTotal)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          schedule.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800"
                            : schedule.status === "PAUSED"
                            ? "bg-amber-100 text-amber-800"
                            : schedule.status === "COMPLETED"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {schedule.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Run Now Button */}
                        {schedule.status !== "STOPPED" && (
                          <button
                            onClick={() => handleRunNow(schedule)}
                            disabled={runningId === schedule.id}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            title="Generate Invoice Now"
                          >
                            {runningId === schedule.id ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>
                        )}

                        {/* Pause / Resume */}
                        {schedule.status !== "STOPPED" && (
                          <button
                            onClick={() => handleTogglePause(schedule)}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition"
                            title={schedule.status === "ACTIVE" ? "Pause Schedule" : "Resume Schedule"}
                          >
                            {schedule.status === "ACTIVE" ? (
                              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              </svg>
                            )}
                          </button>
                        )}

                        {/* Stop Schedule */}
                        {schedule.status !== "STOPPED" && (
                          <button
                            onClick={() => setScheduleToStop(schedule)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                            title="Stop Schedule Permanently"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                            </svg>
                          </button>
                        )}

                        {/* View Details */}
                        <Link
                          href={`/sales/automated-billing/${schedule.id}`}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition"
                          title="View Schedule Details"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalItems > 0 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
            <span>
              Showing {schedules.length} of {totalItems} schedules
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-9 px-3 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Stopping Schedule */}
      {scheduleToStop && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-[15px] font-semibold text-gray-900">Stop Automated Schedule?</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to stop <strong>&quot;{scheduleToStop.scheduleName}&quot;</strong>?
              According to the standard statutory rules, <strong>Stopped schedules cannot be resumed</strong>. No future invoices will be generated for this schedule.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setScheduleToStop(null)}
                disabled={isStopping}
                className="h-9 px-3 border border-gray-200 text-gray-700 rounded-xl text-[13px] font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStop}
                disabled={isStopping}
                className="h-9 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[13px] font-medium transition"
              >
                {isStopping ? "Stopping..." : "Confirm Stop Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
