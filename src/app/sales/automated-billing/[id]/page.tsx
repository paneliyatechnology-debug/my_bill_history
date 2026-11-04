"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  automatedBillingApi,
  AutomatedBillingSchedule,
  AutomatedBillingRun,
  formatCurrency,
} from "@/lib/automated-billing";

export default function AutomatedBillingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const scheduleId = params?.id as string;

  const [schedule, setSchedule] = useState<AutomatedBillingSchedule | null>(null);
  const [runs, setRuns] = useState<AutomatedBillingRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "RUN_HISTORY">("OVERVIEW");
  const [runningNow, setRunningNow] = useState(false);
  const [retryingRunId, setRetryingRunId] = useState<string | null>(null);
  const [showStopModal, setShowStopModal] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadScheduleData = useCallback(async () => {
    if (!scheduleId) return;
    setIsLoading(true);
    try {
      const [schedRes, runsRes] = await Promise.all([
        automatedBillingApi.getScheduleById(scheduleId),
        automatedBillingApi.getRuns(scheduleId).catch(() => ({ items: [], total: 0 })),
      ]);
      setSchedule(schedRes);
      setRuns(runsRes.items || []);
    } catch (err: any) {
      setNotification({
        type: "error",
        text: err.message || "Failed to load schedule details.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [scheduleId]);

  useEffect(() => {
    loadScheduleData();
  }, [loadScheduleData]);

  const handleRunNow = async () => {
    if (!schedule || runningNow) return;
    setRunningNow(true);
    try {
      const res = await automatedBillingApi.runNow(schedule.id);
      setNotification({
        type: "success",
        text: `Invoice #${res.invoice?.invoiceNumber || "generated"} created successfully!`,
      });
      loadScheduleData();
    } catch (err: any) {
      setNotification({
        type: "error",
        text: err.message || "Invoice execution failed.",
      });
    } finally {
      setRunningNow(false);
    }
  };

  const handleTogglePause = async () => {
    if (!schedule) return;
    try {
      if (schedule.status === "ACTIVE") {
        await automatedBillingApi.pauseSchedule(schedule.id);
        setNotification({ type: "success", text: "Schedule paused." });
      } else if (schedule.status === "PAUSED") {
        await automatedBillingApi.resumeSchedule(schedule.id);
        setNotification({ type: "success", text: "Schedule resumed." });
      }
      loadScheduleData();
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Action failed." });
    }
  };

  const handleConfirmStop = async () => {
    if (!schedule) return;
    setIsStopping(true);
    try {
      await automatedBillingApi.stopSchedule(schedule.id);
      setNotification({
        type: "success",
        text: "Schedule has been permanently stopped.",
      });
      setShowStopModal(false);
      loadScheduleData();
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to stop schedule." });
    } finally {
      setIsStopping(false);
    }
  };

  const handleRetryRun = async (runId: string) => {
    if (!schedule || retryingRunId) return;
    setRetryingRunId(runId);
    try {
      await automatedBillingApi.retryRun(schedule.id, runId);
      setNotification({ type: "success", text: "Run retried successfully!" });
      loadScheduleData();
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Retry failed." });
    } finally {
      setRetryingRunId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        <div className="h-64 bg-gray-100 rounded-2xl animate-pulse"></div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-[15px] font-semibold text-gray-800">Schedule Not Found</h2>
        <Link
          href="/sales/automated-billing"
          className="text-xs text-[#0F172A] font-bold hover:underline"
        >
          ← Back to Automated Billing List
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
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
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Link href="/sales/automated-billing" className="hover:text-emerald-700">
              Automated Billing
            </Link>
            <span>/</span>
            <span className="tabular-nums text-gray-700">{schedule.id.slice(0, 8)}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-semibold text-[#182230]">{schedule.scheduleName}</h1>
            <span
              className={`px-3 py-0.5 rounded-full text-xs font-bold ${
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
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {schedule.status !== "STOPPED" && (
            <>
              <button
                onClick={handleRunNow}
                disabled={runningNow}
                className="inline-flex items-center gap-2 bg-[#1677E8] hover:bg-[#1268D3] text-white h-9 px-3 rounded-xl font-medium text-[13px] shadow-sm transition disabled:opacity-50"
              >
                {runningNow ? (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  </svg>
                )}
                <span>Run Invoice Now</span>
              </button>

              <button
                onClick={handleTogglePause}
                className="h-9 px-3 text-[13px] font-medium border border-gray-200 bg-white hover:bg-gray-50 rounded-xl text-gray-700 transition"
              >
                {schedule.status === "ACTIVE" ? "Pause" : "Resume"}
              </button>

              <button
                onClick={() => setShowStopModal(true)}
                className="h-9 px-3 text-[13px] font-medium border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl transition"
              >
                Stop Schedule
              </button>
            </>
          )}

          <Link
            href="/sales/automated-billing"
            className="h-9 px-3 text-[13px] font-medium border border-gray-200 bg-white hover:bg-gray-50 rounded-xl text-gray-600 transition"
          >
            Back
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab("OVERVIEW")}
          className={`pb-3 transition ${
            activeTab === "OVERVIEW"
              ? "border-b-2 border-[#0F172A] text-[#0F172A]"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          Overview & Items
        </button>
        <button
          onClick={() => setActiveTab("RUN_HISTORY")}
          className={`pb-3 transition flex items-center gap-1.5 ${
            activeTab === "RUN_HISTORY"
              ? "border-b-2 border-[#0F172A] text-[#0F172A]"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <span>Run History</span>
          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-[10px]">
            {runs.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "OVERVIEW" && (
        <div className="space-y-6">
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Details */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
              <span className="text-xs font-semibold text-gray-400 uppercase">Customer Information</span>
              <div className="space-y-1">
                <div className="text-base font-bold text-gray-900">{schedule.party.name}</div>
                <div className="text-xs text-gray-600">Phone: {schedule.party.phone || "—"}</div>
                {schedule.party.email && (
                  <div className="text-xs text-gray-600">Email: {schedule.party.email}</div>
                )}
                <div className="text-xs text-gray-600">
                  GSTIN: {schedule.party.gstin || "Unregistered"} (State: {schedule.party.stateCode || "—"})
                </div>
              </div>
            </div>

            {/* Recurrence Details */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
              <span className="text-xs font-semibold text-gray-400 uppercase">Schedule Recurrence</span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">Frequency</span>
                  <span className="font-bold text-gray-900">{schedule.frequency}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">Payment Terms</span>
                  <span className="font-medium text-gray-800">{schedule.paymentTerms || "Due on Receipt"}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">Next Run Date</span>
                  <span className="tabular-nums font-bold text-emerald-800">
                    {schedule.nextRunAt ? new Date(schedule.nextRunAt).toLocaleDateString() : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">Start Date</span>
                  <span className="tabular-nums text-gray-700">
                    {new Date(schedule.startDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Configured Line Items */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-gray-900">Configured Billing Line Items</h3>
              <span className="text-xs tabular-nums font-bold text-[#0F172A]">
                Estimated Total: {formatCurrency(schedule.estimatedTotal)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-3">HSN/SAC</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                    <th className="py-2.5 px-3 text-right">Disc %</th>
                    <th className="py-2.5 px-3 text-right">GST %</th>
                    <th className="py-2.5 px-4 text-right">Line Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {schedule.lines?.map((line, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="py-3 px-4 font-medium text-gray-800">
                        {line.description}
                        {line.item?.sku && (
                          <span className="text-[10px] text-gray-400 block tabular-nums">SKU: {line.item.sku}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 tabular-nums text-gray-600">{line.hsnCode || "—"}</td>
                      <td className="py-3 px-3 text-right tabular-nums">
                        {Number(line.quantity)} {line.unit || ""}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(line.rate)}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{Number(line.discountPercent || 0)}%</td>
                      <td className="py-3 px-3 text-right tabular-nums">{Number(line.taxRate || 0)}%</td>
                      <td className="py-3 px-4 text-right tabular-nums font-medium text-gray-900">
                        {formatCurrency(line.totalAmount || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {schedule.notes && (
              <div className="p-4 bg-gray-50/60 border-t border-gray-100 text-xs text-gray-600">
                <span className="font-semibold text-gray-700 block mb-0.5">Invoice Notes:</span>
                <p className="whitespace-pre-wrap">{schedule.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Run History */}
      {activeTab === "RUN_HISTORY" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-gray-900">Historical & Scheduled Executions</h3>
            <span className="text-xs text-gray-500">
              Total Runs: {schedule.totalRunsCount} (Success: {schedule.successfulRunsCount}, Failed: {schedule.failedRunsCount})
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Scheduled For</th>
                  <th className="py-2.5 px-4">Executed At</th>
                  <th className="py-2.5 px-3">Triggered By</th>
                  <th className="py-2.5 px-4">Generated Invoice</th>
                  <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-400">
                      No runs executed yet. Click &quot;Run Invoice Now&quot; to test.
                    </td>
                  </tr>
                ) : (
                  runs.map((run) => (
                    <tr key={run.id} className="hover:bg-gray-50/50">
                      <td className="py-3 px-4 tabular-nums text-gray-700">
                        {new Date(run.scheduledFor).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 tabular-nums text-gray-600 text-[11px]">
                        {new Date(run.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-gray-700 font-medium">
                        {run.triggeredBy === "MANUAL_RUN_NOW"
                          ? "Manual (Run Now)"
                          : run.triggeredBy === "MANUAL_RETRY"
                          ? "Manual (Retry)"
                          : "Automated"}
                      </td>
                      <td className="py-3 px-4 tabular-nums font-medium">
                        {run.invoice ? (
                          <Link
                            href={`/sales/invoices/${run.invoice.id}`}
                            className="text-[#0F172A] hover:underline"
                          >
                            #{run.invoice.invoiceNumber}
                          </Link>
                        ) : run.invoiceNumber ? (
                          <span className="text-gray-900">#{run.invoiceNumber}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums font-semibold text-gray-900">
                        {run.grandTotal !== null && run.grandTotal !== undefined
                          ? formatCurrency(run.grandTotal)
                          : "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            run.status === "SUCCESS"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {run.status}
                        </span>
                        {run.errorMessage && (
                          <span className="block text-[10px] text-rose-600 max-w-xs truncate mx-auto mt-0.5" title={run.errorMessage}>
                            {run.errorMessage}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {run.status === "FAILED" && (
                          <button
                            onClick={() => handleRetryRun(run.id)}
                            disabled={retryingRunId === run.id}
                            className="px-2.5 py-1 text-[11px] font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition"
                          >
                            {retryingRunId === run.id ? "Retrying..." : "Retry Run"}
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
      )}

      {/* Stop Confirmation Modal */}
      {showStopModal && (
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
              Are you sure you want to stop <strong>&quot;{schedule.scheduleName}&quot;</strong>?
              According to statutory rules, <strong>Stopped schedules cannot be resumed</strong>. No future invoices will be generated for this schedule.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowStopModal(false)}
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
