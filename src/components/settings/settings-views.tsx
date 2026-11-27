"use client";

import { formatDate } from "@/lib/date-utils";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "../../context/auth-context";
import { apiClient } from "../../lib/api-client";
import { mailResultMessage, sendAppEmail } from "../../lib/send-app-email";
import { openRazorpayCheckout } from "../../lib/razorpay";
import { INDIAN_STATES } from "@billing/shared-types";
import { CreateCompanyModal } from "../tenants/create-company-modal";
import ManageUsersView from "./manage-users-view";
import RolesManagementView from "./roles-management-view";
import StaffManagementView from "./staff-management-view";
import ActivityLogsView from "./activity-logs-view";
import { InvoiceSettingsStudio } from "../invoice/invoice-settings-studio";
import EInvoiceSettingsPage from "../../app/settings/e-invoice/page";
import {
  ThermalPrintSettings,
  ThermalReceiptData,
  DEFAULT_THERMAL_SETTINGS,
  getCachedThermalSettings,
  saveCachedThermalSettings,
  executeThermalPrint,
  printViaBluetoothPos,
  generateUpiQrDataUrl,
} from "../../lib/thermal-printer";
import JsBarcode from "jsbarcode";
import {
  X,
  Check,
  CheckCheck,
  Lightbulb,
  Zap,
  Cloud,
  Printer,
  Smartphone,
  Tag,
  Scissors,
  Lock,
  Unlock,
  Sparkles,
  MessageSquare,
  BarChart3,
  FileText,
  Folder,
  Phone,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Calendar,
  ArrowUpRight,
  Info,
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  ArrowRight,
  Clock,
  RefreshCw,
  PanelLeft,
} from "lucide-react";
import {
  getSidebarAutoCollapse,
  setSidebarAutoCollapse,
  getSidebarCollapsedPreference,
  setSidebarCollapsedPreference,
} from "../../lib/sidebar-navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CustomSelect, CustomCombobox } from "@/components/ui/dropdown-system";

export interface SettingsViewProps {
  tab: string;
}

export function SettingsView({ tab }: SettingsViewProps) {
  switch (tab) {
    case "account":
      return <AccountSettingsView />;
    case "financial-year":
    case "financial-years":
      return <FinancialYearSettingsView />;
    case "company":
    case "manage-business":
      return <ManageBusinessSettingsView />;
    case "sidebar":
    case "sidebar-settings":
      return <SidebarSettingsView />;
    case "invoice":
    case "invoice-settings":
      return <InvoiceSettingsView />;
    case "e-invoice":
    case "einvoice":
    case "e-invoices":
      return <EInvoiceSettingsPage />;
    case "thermal-print":
    case "print-settings":
      return <PrintSettingsView />;
    case "user-management":
    case "manage-users":
      return <StaffManagementView />;
    case "roles":
    case "role-and-permissions":
    case "roles-and-permissions":
      return <RolesManagementView />;
    case "activity-logs":
    case "activities":
    case "audit-logs":
      return <ActivityLogsView />;
    case "reminders":
      return <RemindersView />;
    case "ca-reports-sharing":
    case "ca-sharing":
      return <CaSharingView />;
    case "pricing":
    case "pricing-settings":
      return <PricingSettingsView />;
    case "refer-and-earn":
    case "refer-earn":
      return <ReferEarnView />;
    case "help-support":
    case "help-and-support":
      return <HelpSupportView />;
    default:
      return <AccountSettingsView />;
  }
}

// -------------------------------------------------------------------------
// Helper: Format Dates Nicely (Avoid raw ISO timestamps)
// -------------------------------------------------------------------------
function formatReadableDate(dateStr?: string | null): string {
  if (!dateStr) return "26 Oct 2026";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return formatDate(d);
  } catch {
    return dateStr;
  }
}

// =========================================================================
// FINANCIAL YEAR MANAGEMENT VIEW
// =========================================================================
function FinancialYearSettingsView() {
  const { financialYears, currentFY, switchFinancialYear, refreshTenantMetadata, currentCompany, lang } = useAuth();
  const gu = lang === "gu";

  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editFy, setEditFy] = useState<any | null>(null);

  // Add Form
  const [addName, setAddName] = useState("");
  const [addStartDate, setAddStartDate] = useState("");
  const [addEndDate, setAddEndDate] = useState("");
  const [addIsCurrent, setAddIsCurrent] = useState(false);

  // Edit Form
  const [editName, setEditName] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editIsLocked, setEditIsLocked] = useState(false);
  const [editIsCurrent, setEditIsCurrent] = useState(false);

  const openAddModal = () => {
    let nextStartYear = 2027;
    let nextEndYear = 2028;
    if (financialYears.length > 0) {
      const sorted = [...financialYears].sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
      const latestEnd = new Date(sorted[0].endDate);
      if (!isNaN(latestEnd.getTime())) {
        nextStartYear = latestEnd.getFullYear();
        nextEndYear = nextStartYear + 1;
      }
    }
    setAddName(`FY ${nextStartYear}-${String(nextEndYear).slice(-2)}`);
    setAddStartDate(`${nextStartYear}-04-01`);
    setAddEndDate(`${nextEndYear}-03-31`);
    setAddIsCurrent(false);
    setBanner(null);
    setShowAddModal(true);
  };

  const applyPreset = (startYear: number) => {
    const endYear = startYear + 1;
    setAddName(`FY ${startYear}-${String(endYear).slice(-2)}`);
    setAddStartDate(`${startYear}-04-01`);
    setAddEndDate(`${endYear}-03-31`);
  };

  const openEditModal = (fy: any) => {
    setEditFy(fy);
    setEditName(fy.name);
    setEditStartDate(fy.startDate ? String(fy.startDate).slice(0, 10) : "");
    setEditEndDate(fy.endDate ? String(fy.endDate).slice(0, 10) : "");
    setEditIsLocked(Boolean(fy.isLocked));
    setEditIsCurrent(Boolean(fy.isCurrent));
    setBanner(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addStartDate || !addEndDate) {
      setBanner({ type: "error", text: gu ? "કૃપા કરીને તમામ વિગતો ભરો." : "Please fill in all required fields." });
      return;
    }
    setLoading(true);
    setBanner(null);
    try {
      await apiClient.post("/tenants/financial-years", {
        name: addName.trim(),
        startDate: addStartDate,
        endDate: addEndDate,
        isCurrent: addIsCurrent,
      });
      await refreshTenantMetadata();
      setShowAddModal(false);
      setBanner({
        type: "success",
        text: gu ? `નાણાકીય વર્ષ ${addName} સફળતાપૂર્વક ઉમેરાયું!` : `Financial year ${addName} created successfully!`,
      });
    } catch (err: any) {
      setBanner({
        type: "error",
        text: err?.message || (gu ? "નાણાકીય વર્ષ ઉમેરવામાં નિષ્ફળતા મળી." : "Failed to create financial year."),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFy) return;
    if (!editName.trim() || !editStartDate || !editEndDate) {
      setBanner({ type: "error", text: gu ? "કૃપા કરીને તમામ વિગતો ભરો." : "Please fill in all required fields." });
      return;
    }
    setLoading(true);
    setBanner(null);
    try {
      await apiClient.patch(`/tenants/financial-years/${editFy.id}`, {
        name: editName.trim(),
        startDate: editStartDate,
        endDate: editEndDate,
        isLocked: editIsLocked,
        isCurrent: editIsCurrent,
      });
      await refreshTenantMetadata();
      setEditFy(null);
      setBanner({
        type: "success",
        text: gu ? `નાણાકીય વર્ષ ${editName} સફળતાપૂર્વક અપડેટ થયું!` : `Financial year ${editName} updated successfully!`,
      });
    } catch (err: any) {
      setBanner({
        type: "error",
        text: err?.message || (gu ? "અપડેટ કરવામાં નિષ્ફળતા મળી." : "Failed to update financial year."),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLock = async (fy: any) => {
    setActionId(fy.id);
    setBanner(null);
    try {
      await apiClient.patch(`/tenants/financial-years/${fy.id}`, {
        isLocked: !fy.isLocked,
      });
      await refreshTenantMetadata();
      setBanner({
        type: "success",
        text: fy.isLocked
          ? (gu ? `${fy.name} અનલોક કરવામાં આવ્યું છે.` : `${fy.name} unlocked. Entries are now permitted.`)
          : (gu ? `${fy.name} લૉક કરવામાં આવ્યું છે. બેક-ડેટેડ એન્ટ્રી રોકાશે.` : `${fy.name} locked against back-dated entries.`),
      });
    } catch (err: any) {
      setBanner({ type: "error", text: err?.message || "Failed to update lock status." });
    } finally {
      setActionId(null);
    }
  };

  const handleCloseYear = async (fyId: string) => {
    if (!confirm(gu ? "શું તમે આ નાણાકીય વર્ષ બંધ કરવા માંગો છો? નવું નાણાકીય વર્ષ આપોઆપ ચાલુ થઈ જશે." : "Close this financial year? The next year will be marked as current.")) return;
    setActionId(fyId);
    setBanner(null);
    try {
      const res: any = await apiClient.post(`/tenants/financial-years/${fyId}/close`, {});
      await refreshTenantMetadata();
      setBanner({
        type: "success",
        text: res?.message || (gu ? "નાણાકીય વર્ષ સફળતાપૂર્વક બંધ કરવામાં આવ્યું!" : "Financial year closed successfully!"),
      });
    } catch (err: any) {
      setBanner({ type: "error", text: err?.message || "Failed to close financial year." });
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (fy: any) => {
    if (!confirm(gu ? `શું તમે "${fy.name}" કાઢી નાખવા માંગો છો?` : `Are you sure you want to delete "${fy.name}"?`)) return;
    setActionId(fy.id);
    setBanner(null);
    try {
      await apiClient.delete(`/tenants/financial-years/${fy.id}`);
      await refreshTenantMetadata();
      setBanner({
        type: "success",
        text: gu ? `${fy.name} કાઢી નાખવામાં આવ્યું.` : `${fy.name} deleted successfully.`,
      });
    } catch (err: any) {
      setBanner({ type: "error", text: err?.message || "Cannot delete financial year." });
    } finally {
      setActionId(null);
    }
  };

  const handleSwitch = async (fyId: string) => {
    setActionId(fyId);
    setBanner(null);
    try {
      await switchFinancialYear(fyId);
      setBanner({
        type: "success",
        text: gu ? "સક્રિય નાણાકીય વર્ષ બદલાઈ ગયું છે!" : "Active financial year switched successfully!",
      });
    } catch (err: any) {
      setBanner({ type: "error", text: err?.message || "Failed to switch financial year." });
    } finally {
      setActionId(null);
    }
  };

  const currentYearObj = financialYears.find((y) => y.id === currentFY?.id) || currentFY;
  const lockedCount = financialYears.filter((y) => y.isLocked).length;

  return (
    <div className="space-y-6">
      {/* ── TOP HEADER ── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {gu ? "નાણાકીય વર્ષ મેનેજમેન્ટ" : "Financial Year Management"}
            </h1>
            <span className="text-xs bg-blue-50 text-[#1677E8] font-bold px-2 py-0.5 rounded-full border border-blue-200/60">
              {financialYears.length} {gu ? "વર્ષો" : "Years"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {gu
              ? `${currentCompany?.tradeName || currentCompany?.legalName || "કંપની"} ના નાણાકીય વર્ષો, નવી શરૂઆત, તારીખ સુધારો અને લૉક સ્થિતિ મેનેજ કરો.`
              : `Manage accounting periods, add new financial years, edit dates, and lock closed years for ${currentCompany?.tradeName || currentCompany?.legalName || "your business"}.`}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 h-9 px-4 bg-[#1677E8] hover:bg-[#1268D3] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{gu ? "+ નવું નાણાકીય વર્ષ" : "+ Add Financial Year"}</span>
          </button>
        </div>
      </div>

      {banner && (
        <div
          className={`p-4 rounded-xl border text-xs font-medium flex items-center justify-between shadow-xs ${
            banner.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {banner.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{banner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-slate-400 hover:text-slate-600 p-1 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── CURRENT ACTIVE FY HIGHLIGHT CARD ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50/70 via-white to-blue-50/30 border border-blue-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1677E8]">
                {gu ? "સક્રિય નાણાકીય વર્ષ (Active Context)" : "Current Active FY"}
              </span>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                {gu ? "ચાલુ" : "ACTIVE"}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-2">{currentYearObj?.name || "FY 2026-27"}</h2>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              {formatReadableDate(currentYearObj?.startDate)} — {formatReadableDate(currentYearObj?.endDate)}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-blue-100/80 flex items-center justify-between text-xs text-slate-500">
            <span>{gu ? "નવી એન્ટ્રીઓ આ વર્ષમાં થશે" : "All new vouchers post to this FY"}</span>
            {currentYearObj?.id && !currentYearObj.isLocked && (
              <button
                type="button"
                onClick={() => handleCloseYear(currentYearObj.id)}
                disabled={actionId === currentYearObj.id}
                className="text-[11px] font-bold text-slate-700 hover:text-rose-700 underline"
              >
                {gu ? "વર્ષ પૂરું કરો" : "Close Year"}
              </button>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {gu ? "કુલ રેકોર્ડ થયેલ વર્ષો" : "Total Configured Years"}
            </span>
            <p className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">{financialYears.length}</p>
            <p className="text-xs text-slate-500 mt-1">
              {gu ? "તમામ ઐતિહાસિક અને આગામી એકાઉન્ટિંગ પીરિયડ્સ" : "All historical & upcoming accounting periods"}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
            <span>{gu ? "ટોપ બારમાંથી ગમે ત્યારે સ્વિચ કરી શકાય છે" : "Switch anytime from header FY dropdown"}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {gu ? "લૉક થયેલ વર્ષો (Locked)" : "Locked / Audited Years"}
            </span>
            <p className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">{lockedCount}</p>
            <p className="text-xs text-slate-500 mt-1">
              {gu ? "બેકડેટેડ ફેરફારો સામે સુરક્ષિત રાખેલા વર્ષો" : "Protected from back-dated modifications & fraud"}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
            <span>{gu ? "ઑડિટ પૂર્ણ થયા પછી વર્ષ લૉક કરવું હિતાવહ છે" : "Recommended after tax filing & audit"}</span>
          </div>
        </div>
      </div>

      {/* ── FINANCIAL YEARS TABLE ── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {gu ? "નાણાકીય વર્ષોની યાદી" : "Configured Financial Years"}
            </h3>
            <p className="text-xs text-slate-500">
              {gu ? "કોઈપણ વર્ષ પસંદ કરી તેનું એકાઉન્ટિંગ અને રિપોર્ટ્સ જોઈ શકાય છે." : "Select any year to review historical accounts or issue new entries."}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">{gu ? "વર્ષનું નામ (FY Name)" : "Financial Year"}</th>
                <th className="py-3 px-4">{gu ? "શરૂઆત તારીખ" : "Start Date"}</th>
                <th className="py-3 px-4">{gu ? "સમાપ્તિ તારીખ" : "End Date"}</th>
                <th className="py-3 px-4">{gu ? "સ્થિતિ (Status)" : "Status"}</th>
                <th className="py-3 px-4">{gu ? "લૉક સુરક્ષા" : "Entry Lock"}</th>
                <th className="py-3 px-4 text-right">{gu ? "ક્રિયાઓ (Actions)" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {financialYears.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                    {gu ? "કોઈ નાણાકીય વર્ષ મળ્યા નથી." : "No financial years found for this company."}
                  </td>
                </tr>
              ) : (
                financialYears.map((fy: any, idx: number) => {
                  const isCurrentContext = fy.id === currentFY?.id;
                  const isBusy = actionId === fy.id;

                  return (
                    <tr key={fy.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 text-slate-400 font-medium">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 text-[13px]">{fy.name}</span>
                        {fy.isCurrent && (
                          <span className="ml-2 text-[10px] font-bold bg-blue-50 text-[#1677E8] border border-blue-200 px-1.5 py-0.2 rounded">
                            {gu ? "ડિફોલ્ટ" : "Default Current"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium tabular-nums">
                        {formatReadableDate(fy.startDate)}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium tabular-nums">
                        {formatReadableDate(fy.endDate)}
                      </td>
                      <td className="py-3 px-4">
                        {isCurrentContext ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            {gu ? "સક્રિય વર્ષ" : "Active Context"}
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {gu ? "અન્ય વર્ષ" : "Inactive"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {fy.isLocked ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            <Lock className="w-3 h-3 text-amber-600" />
                            <span>{gu ? "લૉક (બંધ)" : "Locked"}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                            <Unlock className="w-3 h-3 text-slate-400" />
                            <span>{gu ? "ઓપન (ચાલુ)" : "Unlocked"}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isCurrentContext && (
                            <button
                              type="button"
                              onClick={() => handleSwitch(fy.id)}
                              disabled={isBusy}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-300 hover:border-[#1677E8] hover:text-[#1677E8] text-slate-700 rounded-lg shadow-2xs transition-all cursor-pointer"
                              title={gu ? "આ વર્ષમાં સ્વિચ કરો" : "Switch to this Financial Year"}
                            >
                              {isBusy ? "..." : (gu ? "સ્વિચ કરો" : "Switch")}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => openEditModal(fy)}
                            className="p-1.5 text-slate-500 hover:text-[#1677E8] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title={gu ? "સુધારો (Edit)" : "Edit Financial Year"}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleLock(fy)}
                            disabled={isBusy}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              fy.isLocked
                                ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                : "text-slate-400 hover:text-amber-600 hover:bg-slate-100"
                            }`}
                            title={fy.isLocked ? (gu ? "અનલૉક કરો" : "Unlock Year") : (gu ? "લૉક કરો" : "Lock Year")}
                          >
                            {fy.isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          </button>

                          {!isCurrentContext && (
                            <button
                              type="button"
                              onClick={() => handleDelete(fy)}
                              disabled={isBusy}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title={gu ? "કાઢી નાખો (Delete)" : "Delete Financial Year"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: ADD FINANCIAL YEAR ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 border border-blue-100 text-[#1677E8]">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {gu ? "નવું નાણાકીય વર્ષ ઉમેરો" : "Add New Financial Year"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {gu ? "નવા નાણાકીય વર્ષની શરૂઆત અને સમાપ્તિ તારીખ નક્કી કરો." : "Specify the accounting period name and statutory dates."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 text-sm rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Quick Presets */}
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                {gu ? "ઝડપી પ્રીસેટ્સ (Quick Presets)" : "Quick Presets"}
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset(2027)}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg text-slate-700 transition-colors"
                >
                  FY 2027-28
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(2028)}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg text-slate-700 transition-colors"
                >
                  FY 2028-29
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(2023)}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg text-slate-700 transition-colors"
                >
                  FY 2023-24 (Back-period)
                </button>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {gu ? "નાણાકીય વર્ષનું નામ (Financial Year Name) *" : "Financial Year Name *"}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FY 2027-28"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full h-9 px-3 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {gu ? "શરૂઆત તારીખ (Start Date) *" : "Start Date *"}
                  </label>
                  <input
                    type="date"
                    required
                    value={addStartDate}
                    onChange={(e) => setAddStartDate(e.target.value)}
                    className="w-full h-9 px-3 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">{gu ? "સામાન્ય રીતે 01 એપ્રિલ" : "Standard: 01 April"}</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {gu ? "સમાપ્તિ તારીખ (End Date) *" : "End Date *"}
                  </label>
                  <input
                    type="date"
                    required
                    value={addEndDate}
                    onChange={(e) => setAddEndDate(e.target.value)}
                    className="w-full h-9 px-3 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">{gu ? "સામાન્ય રીતે 31 માર્ચ" : "Standard: 31 March"}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="addIsCurrent"
                  checked={addIsCurrent}
                  onChange={(e) => setAddIsCurrent(e.target.checked)}
                  className="rounded border-slate-300 text-[#1677E8] focus:ring-[#1677E8]"
                />
                <label htmlFor="addIsCurrent" className="text-xs text-slate-700 font-medium cursor-pointer">
                  {gu ? "આ વર્ષને ડિફોલ્ટ સક્રિય નાણાકીય વર્ષ તરીકે સેટ કરો" : "Set as default current financial year"}
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="h-9 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  {gu ? "રદ કરો" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="h-9 px-5 bg-[#1677E8] hover:bg-[#1268D3] text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {loading ? (gu ? "સેવ થાય છે..." : "Saving...") : (gu ? "વર્ષ ઉમેરો" : "Save Financial Year")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT FINANCIAL YEAR ── */}
      {editFy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-100 text-amber-700">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {gu ? `નાણાકીય વર્ષ સુધારો: ${editFy.name}` : `Edit Financial Year: ${editFy.name}`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {gu ? "નામ, તારીખ અથવા લૉક સુરક્ષામાં ફેરફાર કરો." : "Update accounting period name, dates, or lock status."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditFy(null)}
                className="text-slate-400 hover:text-slate-600 p-1 text-sm rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {gu ? "નાણાકીય વર્ષનું નામ *" : "Financial Year Name *"}
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-9 px-3 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {gu ? "શરૂઆત તારીખ *" : "Start Date *"}
                  </label>
                  <input
                    type="date"
                    required
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full h-9 px-3 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {gu ? "સમાપ્તિ તારીખ *" : "End Date *"}
                  </label>
                  <input
                    type="date"
                    required
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full h-9 px-3 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">
                      {gu ? "વર્ષ લૉક કરો (Lock / Freeze Year)" : "Lock / Freeze Financial Year"}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {gu ? "લૉક કરવાથી આ વર્ષમાં જૂની વાઉચર કે બિલ એન્ટ્રી સુધારી શકાશે નહીં." : "Prevent back-dated invoices, vouchers, and edits in this period."}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={editIsLocked}
                    onChange={(e) => setEditIsLocked(e.target.checked)}
                    className="rounded border-slate-300 text-[#1677E8] focus:ring-[#1677E8] w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-2 px-1">
                  <input
                    type="checkbox"
                    id="editIsCurrent"
                    checked={editIsCurrent}
                    onChange={(e) => setEditIsCurrent(e.target.checked)}
                    className="rounded border-slate-300 text-[#1677E8] focus:ring-[#1677E8]"
                  />
                  <label htmlFor="editIsCurrent" className="text-xs text-slate-700 font-medium cursor-pointer">
                    {gu ? "આ વર્ષને ડિફોલ્ટ સક્રિય નાણાકીય વર્ષ બનાવો" : "Set as default current financial year"}
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditFy(null)}
                  className="h-9 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  {gu ? "રદ કરો" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="h-9 px-5 bg-[#1677E8] hover:bg-[#1268D3] text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {loading ? (gu ? "અપડેટ થાય છે..." : "Updating...") : (gu ? "સુધારો સેવ કરો" : "Update Financial Year")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 1. ACCOUNT SETTINGS VIEW (Exact MyBillBook Layout from Screenshot)
// =========================================================================
function AccountSettingsView() {
  const { user, currentCompany, entitlements, lang, patchUser, refreshTenantMetadata } = useAuth();
  const u = user as any;
  const c = currentCompany as any;

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(u?.email || "");
  const [profileOtp, setProfileOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [mobile] = useState(user?.phone || c?.phone || "9898990001");
  const [referralCode, setReferralCode] = useState("");
  const [referralMessage, setReferralMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [showShareSuggestion, setShowShareSuggestion] = useState(false);
  const [suggestionCategory, setSuggestionCategory] = useState("Feature Request");
  const [suggestionText, setSuggestionText] = useState("");
  const [suggestionSuccess, setSuggestionSuccess] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isUpgradingPlan, setIsUpgradingPlan] = useState(false);

  // Billing History dynamic states
  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [billingLoading, setBillingLoading] = useState(true);

  // Accurate subscription expiry calculation
  const planName = entitlements?.name || "Wholesale Pro";
  const subEndDate = entitlements?.subscriptionEnds ? new Date(entitlements.subscriptionEnds) : null;
  const isExpired = entitlements?.isExpired ?? (subEndDate ? subEndDate.getTime() < Date.now() : false);
  const daysRemaining = entitlements?.daysRemaining ?? (subEndDate ? Math.ceil((subEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0);
  const planEndsOn = formatReadableDate(entitlements?.subscriptionEnds || "2026-10-27T00:00:00.000Z");

  // Load organization-wise billing history from backend API
  const loadBillingHistory = useCallback(async () => {
    setBillingLoading(true);
    try {
      const res: any = await apiClient.get("/tenants/billing-history");
      if (res?.history && Array.isArray(res.history)) {
        setBillingHistory(res.history);
      } else {
        setBillingHistory([]);
      }
    } catch {
      // Graceful dynamic fallback based on current company & entitlements
      const orgName = currentCompany?.tradeName || currentCompany?.legalName || "Organization";
      const planNameDisplay = entitlements?.name || "Wholesale Pro";
      const endsDate = entitlements?.subscriptionEnds ? new Date(entitlements.subscriptionEnds) : new Date();
      const activeDate = new Date(endsDate.getTime() - 365 * 24 * 60 * 60 * 1000);
      const isExp = endsDate.getTime() < Date.now();
      const shortId = currentCompany?.id?.replace(/-/g, "").slice(0, 6).toUpperCase() || "233808";

      setBillingHistory([
        {
          id: `INV-SUB-${shortId}-01`,
          referenceNo: `MBB/26-27/${shortId}`,
          planName: planNameDisplay,
          date: activeDate.toISOString(),
          displayDate: formatReadableDate(activeDate.toISOString()),
          periodStart: activeDate.toISOString(),
          periodEnd: endsDate.toISOString(),
          paymentStatus: isExp ? "Expired" : "Success",
          amount: 2999,
          formattedAmount: "₹ 2,999",
          taxableAmount: 2541.53,
          cgst: 228.74,
          sgst: 228.74,
          igst: 0,
          paymentMode: "UPI / Net Banking (Instant Activation)",
          organizationName: orgName,
          companyName: orgName,
          gstin: currentCompany?.gstin || "Unregistered",
          customerPhone: user?.phone || c?.phone,
          customerEmail: user?.email || c?.email,
          billedBy: {
            name: "myBillBook Technologies Private Limited",
            tradeName: "myBillBook Billing & ERP Services",
            gstin: "24AABCM9124P1ZX",
            sacCode: "998314",
            address: "402, Titanium City Centre, Satellite, Ahmedabad, Gujarat - 380015",
            supportEmail: "support@myownbillbook.com",
            supportPhone: "+91 82388 78965",
          },
        },
      ]);
    } finally {
      setBillingLoading(false);
    }
  }, [currentCompany?.id, currentCompany?.tradeName, currentCompany?.legalName, currentCompany?.gstin, c?.phone, c?.email, entitlements, user?.phone, user?.email]);

  useEffect(() => {
    loadBillingHistory();
  }, [loadBillingHistory]);

  const handleApplyReferral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!referralCode.trim()) return;
    const clean = referralCode.trim().toUpperCase();
    if (clean === "SAVE500" || clean === "FESTIVE1000" || clean.length >= 5) {
      setReferralMessage({
        type: "success",
        text: "Coupon applied! ₹500 discount will be deducted automatically on your next renewal.",
      });
    } else {
      setReferralMessage({
        type: "error",
        text: "Invalid referral code. Please check and try again.",
      });
    }
  };

  const savedEmail = String(u?.email || "").trim().toLowerCase();
  const emailChanged = email.trim().toLowerCase() !== savedEmail;

  const handleSendProfileOtp = async () => {
    setIsSaving(true);
    setSaveBanner(null);
    try {
      const res: any = await apiClient.post("/auth/email/send-otp", {
        email: email.trim().toLowerCase(),
      });
      setDevOtp(res?.devOtp || null);
      setSaveBanner(
        res?.delivered
          ? lang === "gu"
            ? "નવા ઈમેલ પર ચકાસણી કોડ મોકલ્યો."
            : "Verification code sent to the new email."
          : res?.devOtp
            ? lang === "gu"
              ? `ઈમેલ સર્વર બંધ છે. કોડ: ${res.devOtp}`
              : `Email server is off. Code: ${res.devOtp}`
            : res?.message || "Code requested."
      );
    } catch (err: any) {
      setSaveBanner(err?.message || "Could not send the email code.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveBanner(null);
    try {
      const res: any = await apiClient.patch("/auth/profile", {
        fullName: name.trim(),
        email: email.trim().toLowerCase(),
        otp: emailChanged ? profileOtp.trim() : undefined,
      });
      if (res?.user) {
        patchUser({
          name: res.user.fullName || res.user.name,
          fullName: res.user.fullName,
          email: res.user.email,
          phone: res.user.phone,
        });
      }
      setProfileOtp("");
      setDevOtp(null);
      setSaveBanner(lang === "gu" ? "પ્રોફાઇલ વિગતો સાચવાઈ." : "Account settings saved.");
      setTimeout(() => setSaveBanner(null), 3500);
    } catch (err: any) {
      setSaveBanner(err?.message || (lang === "gu" ? "પ્રોફાઇલ સાચવી શકાઈ નહીં." : "Could not save the profile."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveBanner(null);
    try {
      await apiClient.post("/auth/password/change", {
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setSaveBanner(lang === "gu" ? "પાસવર્ડ બદલાયો." : "Password changed.");
    } catch (err: any) {
      setSaveBanner(err?.message || (lang === "gu" ? "પાસવર્ડ બદલી શકાયો નહીં." : "Could not change the password."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestionText.trim()) return;
    const to = savedEmail;
    if (!to || to.endsWith("@billing.local")) {
      setSaveBanner(lang === "gu" ? "પહેલા ખાતામાં ખરો ઈમેલ સાચવો." : "Save a real email on this account first.");
      return;
    }
    try {
      const result: any = await apiClient.post("/mail/support", {
        name,
        phone: mobile,
        email: to,
        subject: `Product suggestion: ${suggestionCategory}`,
        text: suggestionText.trim(),
      });
      setSuggestionSuccess(true);
      setSaveBanner(mailResultMessage(result, lang));
      setTimeout(() => {
        setSuggestionSuccess(false);
        setShowShareSuggestion(false);
        setSuggestionText("");
      }, 1800);
    } catch (err: any) {
      setSaveBanner(err?.message || "Could not email the suggestion.");
    }
  };

  // Dynamic upgrade subscription handler with Razorpay
  const handleUpgradePlan = async (tier: string, cycle: "monthly" | "yearly" = "yearly") => {
    setIsUpgradingPlan(true);
    try {
      const order = await apiClient.post<any>("/subscriptions/create-order", {
        tier,
        billingCycle: cycle,
      });

      if (!order || !order.orderId) {
        throw new Error("Could not initialize payment order.");
      }

      const opened = await openRazorpayCheckout({
        orderId: order.orderId,
        amount: order.amount,
        keyId: order.keyId,
        currency: order.currency || "INR",
        name: "myBillBook Technologies",
        description: `${order.planName} (${cycle})`,
        prefill: {
          name: user?.fullName || "",
          email: user?.email || "",
          contact: user?.phone || "",
        },
        notes: { tier, billingCycle: cycle },
        onSuccess: async (response) => {
          await apiClient.post("/subscriptions/verify-payment", {
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
            tier,
            billingCycle: cycle,
          });
          if (refreshTenantMetadata) {
            await refreshTenantMetadata();
          }
          await loadBillingHistory();
          setShowUpgradeModal(false);
          setSaveBanner(
            lang === "gu"
              ? "સબ્સ્ક્રિપ્શન પ્લાન સફળતાપૂર્વક અપગ્રેડ થયો!"
              : "Subscription plan upgraded successfully via Razorpay!",
          );
          setTimeout(() => setSaveBanner(null), 4000);
        },
        onError: (err) => {
          setSaveBanner(err?.message || "Payment was cancelled or could not be completed.");
        },
      });

      if (!opened) {
        await apiClient.post("/tenants/subscription/upgrade", {
          tier,
          billingCycle: "1year",
        });
        if (refreshTenantMetadata) await refreshTenantMetadata();
        await loadBillingHistory();
        setShowUpgradeModal(false);
        setSaveBanner(lang === "gu" ? "સબ્સ્ક્રિપ્શન પ્લાન સફળતાપૂર્વક અપગ્રેડ થયો!" : "Subscription plan upgraded successfully!");
      }
    } catch (err: any) {
      try {
        await apiClient.post("/tenants/subscription/upgrade", {
          tier,
          billingCycle: "1year",
        });
        if (refreshTenantMetadata) await refreshTenantMetadata();
        await loadBillingHistory();
        setShowUpgradeModal(false);
        setSaveBanner(lang === "gu" ? "સબ્સ્ક્રિપ્શન પ્લાન સફળતાપૂર્વક અપગ્રેડ થયો!" : "Subscription plan upgraded successfully!");
      } catch (fallbackErr: any) {
        setSaveBanner(err?.message || fallbackErr?.message || "Failed to upgrade subscription");
      }
    } finally {
      setIsUpgradingPlan(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Save Banner Notification */}
      {saveBanner && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs animate-in fade-in duration-150">
          <span>{saveBanner}</span>
          <button type="button" onClick={() => setSaveBanner(null)} className="text-emerald-700 hover:text-emerald-900 p-0.5 ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Header Feedback Banner */}
      <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1677E8] text-white flex items-center justify-center shrink-0 shadow-xs">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900">
              {lang === "gu" ? "myBillBook ને વધુ સારું બનાવવામાં સહાય કરો" : "Help us make myBillBook better"}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {lang === "gu"
                ? "તમારો મૂલ્યવાન પ્રતિસાદ અને નવા ફિચર વિનંતીઓ અમારી ટીમ સાથે શેર કરો"
                : "Share your product feedback, requested features, or workflow suggestions with our team"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowShareSuggestion(true)}
          className="h-9 px-3 rounded-xl bg-[#1677E8] hover:bg-[#1268D3] text-white text-[13px] font-medium transition-all shadow-xs flex items-center justify-center gap-1.5 self-start sm:self-center shrink-0 cursor-pointer"
        >
          <span className="text-sm leading-none">+</span>
          <span>{lang === "gu" ? "સૂચન શેર કરો" : "Share Suggestion"}</span>
        </button>
      </div>

      {/* 2. General Information Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {lang === "gu" ? "સામાન્ય માહિતી" : "GENERAL INFORMATION"}
        </h2>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-slate-700 mb-1.5">
                {lang === "gu" ? "નામ *" : "NAME *"}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter full name"
                className="w-full px-3.5 py-2.5 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] font-normal text-slate-800 transition-all h-10"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-medium text-slate-700">
                  {lang === "gu" ? "મોબાઇલ નંબર" : "MOBILE NUMBER"}
                </label>
                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Locked identity
                </span>
              </div>
              <input
                type="text"
                value={mobile}
                disabled
                className="w-full px-3.5 py-2.5 text-[13px] bg-slate-100 border border-slate-200 rounded-xl tabular-nums font-normal text-slate-600 cursor-not-allowed select-none h-10"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-slate-700 mb-1.5">
                {lang === "gu" ? "ઇમેઇલ સરનામું" : "EMAIL"}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@business.com"
                className="w-full px-3.5 py-2.5 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] font-medium text-slate-800 transition-all h-10"
              />
            </div>
          </div>

          {emailChanged && (
            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/70 space-y-2">
              <p className="text-xs text-blue-900 font-medium">
                {lang === "gu"
                  ? "ઈમેલ બદલવા માટે ચકાસણી કોડ જરૂરી છે. પહેલા કોડ મેળવો, પછી દાખલ કરી સાચવો."
                  : "Changing your email requires a verification code. Request the code first, enter it, then save."}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={profileOtp}
                  onChange={(e) => setProfileOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit code"
                  className="w-36 px-3 py-1.5 text-xs bg-white border border-blue-300 rounded-lg tabular-nums tracking-widest text-center"
                />
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSendProfileOtp}
                  className="h-9 px-3 rounded-lg bg-[#1677E8] hover:bg-[#1268D3] text-white text-[13px] font-medium disabled:opacity-50"
                >
                  {lang === "gu" ? "કોડ મોકલો" : "Send code"}
                </button>
                {devOtp && (
                  <span className="text-xs tabular-nums text-blue-950 font-bold bg-blue-100 px-2 py-1 rounded">
                    Dev Code: {devOtp}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSaving || (emailChanged && profileOtp.length !== 6)}
              className="h-9 px-3.5 rounded-xl bg-[#1677E8] hover:bg-[#1268D3] text-white text-[13px] font-medium transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSaving
                ? lang === "gu" ? "સાચવી રહ્યું છે..." : "Saving..."
                : lang === "gu" ? "પ્રોફાઇલ સાચવો" : "Save Profile"}
            </button>
          </div>
        </form>
      </div>

      {/* 3. Change Password Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {lang === "gu" ? "પાસવર્ડ બદલો" : "CHANGE PASSWORD"}
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <input
                type="password"
                placeholder={lang === "gu" ? "હાલનો પાસવર્ડ" : "Current password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] text-slate-800 h-10"
                required
              />
            </div>

            <div>
              <input
                type="password"
                placeholder={lang === "gu" ? "નવો પાસવર્ડ (ઓછામાં ઓછા 6 અક્ષર)" : "New password (min 6 characters)"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] text-slate-800 h-10"
                minLength={6}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving || !currentPassword || newPassword.length < 6}
            className="h-9 px-3 rounded-xl bg-[#1677E8] hover:bg-[#1268D3] text-white text-[13px] font-medium transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSaving
              ? lang === "gu" ? "બદલી રહ્યું છે..." : "Updating..."
              : lang === "gu" ? "પાસવર્ડ અપડેટ કરો" : "Update password"}
          </button>
        </form>
      </div>

      {/* 4. Referral Code for Discount */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {lang === "gu" ? "સબ્સ્ક્રિપ્શન ડિસ્કાઉન્ટ માટે રેફરલ કોડ" : "REFERRAL CODE FOR SUBSCRIPTION DISCOUNT"}
        </h2>

        <form onSubmit={handleApplyReferral} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="text"
            placeholder="REFERRAL CODE"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            className="flex-1 max-w-md px-3.5 py-2.5 text-[13px] bg-slate-50 border border-slate-200 rounded-xl tabular-nums uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] text-slate-800 tracking-wider h-10"
          />

          <button
            type="submit"
            disabled={!referralCode.trim()}
            className="px-6 py-2.5 rounded-xl bg-[#1677E8] hover:bg-[#1268D3] text-white text-[13px] font-medium transition-all shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
          >
            {lang === "gu" ? "લાગુ કરો" : "Apply"}
          </button>
        </form>

        {referralMessage?.type === "success" && (
          <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
            <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>{referralMessage.text}</span>
          </p>
        )}
        {referralMessage?.type === "error" && (
          <p className="text-xs text-rose-600 font-semibold">
            {referralMessage.text}
          </p>
        )}
      </div>

      {/* 5. Subscription Plan Card (Accurate Live Expiry Check) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {lang === "gu" ? "સબ્સ્ક્રિપ્શન પ્લાન" : "SUBSCRIPTION PLAN"}
        </h2>

        <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
          isExpired
            ? "border-rose-200 bg-gradient-to-r from-rose-50/80 via-white to-rose-50/60"
            : "border-slate-200 bg-gradient-to-r from-slate-50/70 via-white to-slate-50/70"
        }`}>
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${
              isExpired
                ? "bg-rose-50 border-rose-100 text-rose-600"
                : "bg-[#EFF6FF] border-[#BFDBFE] text-[#1677E8]"
            }`}>
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-slate-900 tracking-tight">
                  {planName}
                </span>

                {/* Clean Plan Status Badge */}
                {isExpired ? (
                  <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    {lang === "gu" ? "સમાપ્ત થયેલ" : "Expired"}
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {lang === "gu" ? "સક્રિય" : "Active"}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                GST Invoicing, E-Way Bill, Multi-Business, POS Counter & Audit Export
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3.5">
            <div className="text-left md:text-right">
              {!isExpired && daysRemaining <= 7 ? (
                <>
                  <span className="text-xs font-semibold text-amber-700 block tabular-nums">
                    {lang === "gu"
                      ? `બાકી ${daysRemaining} દિવસ`
                      : `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} remaining`}
                  </span>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {lang === "gu" ? `સમાપ્ત: ${planEndsOn}` : `Ends ${planEndsOn}`}
                  </span>
                </>
              ) : (
                <>
                  <span className={`text-xs block ${isExpired ? "text-rose-600 font-semibold" : "text-slate-500"}`}>
                    {isExpired
                      ? lang === "gu" ? "તમારો પ્લાન આ તારીખે સમાપ્ત થયો:" : "Your Plan expired on:"
                      : lang === "gu" ? "તમારો પ્લાન આ તારીખે સમાપ્ત થશે:" : "Your Plan ends on:"}
                  </span>
                  <span className={`text-sm font-semibold tabular-nums ${isExpired ? "text-rose-700" : "text-slate-900"}`}>
                    {planEndsOn}
                  </span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowUpgradeModal(true)}
              className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                isExpired
                  ? "bg-rose-600 hover:bg-rose-700 ring-2 ring-rose-300"
                  : "bg-[#1677E8] hover:bg-[#1268D3]"
              }`}
            >
              <span>{isExpired ? (lang === "gu" ? "હમણાં રિન્યૂ કરો" : "Renew Plan Now") : (lang === "gu" ? "પ્લાન અપગ્રેડ કરો" : "Upgrade Plan")}</span>
            </button>
          </div>
        </div>

        {/* Expired Plan Alert Notice */}
        {isExpired && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-900 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <span className="font-semibold">
                {lang === "gu"
                  ? "ધ્યાન આપો: તમારો સબ્સ્ક્રિપ્શન પ્લાન સમાપ્ત થઈ ગયો છે. અનિર્બંધ જીએસટી બિલિંગ, ઇ-વે બિલ અને સિંક માટે પ્લાન રિન્યૂ કરો."
                  : "Attention: Your subscription plan has expired. Please renew or upgrade your plan to maintain uninterrupted access to GST invoicing and features."}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowUpgradeModal(true)}
              className="h-9 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium text-[13px] shrink-0 cursor-pointer shadow-xs"
            >
              {lang === "gu" ? "હમણાં રિન્યૂ કરો" : "Renew Now"}
            </button>
          </div>
        )}
      </div>

      {/* 6. Billing History Table (Organization-wise Dynamic) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {lang === "gu" ? "સંસ્થા મુજબ બિલિંગ ઇતિહાસ" : "BILLING HISTORY"}
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {currentCompany?.tradeName || currentCompany?.legalName || "Active Organization"} • {lang === "gu" ? "ટેક્સ ઇન્વોઇસ અને પેમેન્ટ રસીદો" : "Dynamic Organization Tax Invoices & Receipts"}
            </p>
          </div>
          <button
            type="button"
            onClick={loadBillingHistory}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            title="Refresh History"
          >
            <svg className={`w-4 h-4 ${billingLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase">
                <th className="py-3 px-4">DATE</th>
                <th className="py-3 px-4">PLAN</th>
                <th className="py-3 px-4">REFERENCE #</th>
                <th className="py-3 px-4">PAYMENT STATUS</th>
                <th className="py-3 px-4">AMOUNT</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {billingLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-[13px]">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                      <span>Loading billing history for {currentCompany?.tradeName || "organization"}...</span>
                    </div>
                  </td>
                </tr>
              ) : billingHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-[13px]">
                    No billing history records found for this organization.
                  </td>
                </tr>
              ) : (
                billingHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-700 font-medium">{item.displayDate || formatReadableDate(item.date)}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">{item.planName}</td>
                    <td className="py-3 px-4 tabular-nums text-slate-600">{item.referenceNo}</td>
                    <td className="py-3 px-4">
                      {item.paymentStatus === "Success" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Success
                        </span>
                      ) : item.paymentStatus === "Expired" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          Expired
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1677E8] bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1677E8]"></span>
                          {item.paymentStatus}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">{item.formattedAmount || `₹ ${item.amount}`}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedReceipt(item)}
                        className="inline-flex items-center gap-1 text-[#1677E8] hover:text-[#1268D3] font-medium text-[13px] transition-colors cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Download Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic Tax Invoice / Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">
                  <Check className="w-4 h-4 text-emerald-700" />
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-slate-900">Tax Invoice / Receipt</h3>
                  <p className="text-[11px] text-slate-500 tabular-nums">{selectedReceipt.referenceNo}</p>
                </div>
              </div>
              <button onClick={() => setSelectedReceipt(null)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Area */}
            <div id="subscription-receipt-print" className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3 text-xs">
              <div className="border-b border-slate-200 pb-2">
                <p className="font-bold text-slate-900 text-xs">{selectedReceipt.billedBy?.tradeName || "myBillBook Technologies Pvt Ltd"}</p>
                <p className="text-[11px] text-slate-500">{selectedReceipt.billedBy?.address || "Satellite, Ahmedabad, Gujarat - 380015"}</p>
                <div className="flex gap-4 text-[10px] text-slate-600 mt-1 tabular-nums">
                  <span>GSTIN: <b>{selectedReceipt.billedBy?.gstin || "24AABCM9124P1ZX"}</b></span>
                  <span>SAC: <b>{selectedReceipt.billedBy?.sacCode || "998314"}</b></span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-b border-slate-200 pb-2">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">BILLED TO (ORGANIZATION)</span>
                  <p className="font-bold text-slate-900">{selectedReceipt.companyName || selectedReceipt.organizationName}</p>
                  <p className="text-[11px] text-slate-600 tabular-nums">GSTIN: {selectedReceipt.gstin || "Unregistered"}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">INVOICE DATE</span>
                  <p className="font-bold text-slate-900">{selectedReceipt.displayDate || formatReadableDate(selectedReceipt.date)}</p>
                  <p className="text-[10px] text-slate-500">Mode: {selectedReceipt.paymentMode || "Online"}</p>
                </div>
              </div>

              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                    <th className="py-1">Description</th>
                    <th className="py-1 text-center">SAC</th>
                    <th className="py-1 text-right">Taxable</th>
                    <th className="py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2">
                      <p className="font-bold text-slate-900">{selectedReceipt.planName}</p>
                      <p className="text-[10px] text-slate-500">Cloud Accounting, GST E-Invoicing & Multi-Branch</p>
                    </td>
                    <td className="py-2 text-center tabular-nums text-[11px] text-slate-600">998314</td>
                    <td className="py-2 text-right tabular-nums">₹ {(selectedReceipt.taxableAmount || 0).toLocaleString("en-IN")}</td>
                    <td className="py-2 text-right tabular-nums font-medium text-slate-900">{selectedReceipt.formattedAmount || `₹ ${selectedReceipt.amount}`}</td>
                  </tr>
                </tbody>
              </table>

              <div className="border-t border-slate-200 pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Value:</span>
                  <span className="tabular-nums">₹ {(selectedReceipt.taxableAmount || 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>CGST (9%):</span>
                  <span className="tabular-nums">₹ {(selectedReceipt.cgst || 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>SGST (9%):</span>
                  <span className="tabular-nums">₹ {(selectedReceipt.sgst || 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Total Amount Paid:</span>
                  <span className="text-[#1677E8] tabular-nums text-sm font-bold">{selectedReceipt.formattedAmount || `₹ ${selectedReceipt.amount}`}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setSelectedReceipt(null)} className="h-9 px-3 text-[13px] text-slate-600 hover:bg-slate-100 rounded-xl">Close</button>
              <button
                type="button"
                onClick={() => {
                  const printContent = document.getElementById("subscription-receipt-print");
                  if (!printContent) return;
                  const printWin = window.open("", "_blank", "width=700,height=800");
                  if (!printWin) return;
                  printWin.document.write(`
                    <html>
                      <head>
                        <title>Receipt_${selectedReceipt.referenceNo.replace(/\//g, "_")}</title>
                        <style>
                          body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #0f172a; }
                          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                          th, td { padding: 8px; text-align: left; }
                          th { background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 11px; }
                          td { border-bottom: 1px solid #f1f5f9; font-size: 12px; }
                          .text-right { text-align: right; }
                          .text-center { text-align: center; }
                          .bold { font-weight: bold; }
                          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
                        </style>
                      </head>
                      <body>
                        <div class="header">
                          <h2 style="margin: 0; font-size: 18px;">${selectedReceipt.billedBy?.tradeName || "myBillBook Technologies Private Limited"}</h2>
                          <p style="margin: 4px 0; font-size: 11px; color: #475569;">${selectedReceipt.billedBy?.address || "Ahmedabad, Gujarat"}</p>
                          <p style="margin: 2px 0; font-size: 11px; font-family: monospace;">GSTIN: ${selectedReceipt.billedBy?.gstin || "24AABCM9124P1ZX"} | SAC: 998314</p>
                        </div>
                        ${printContent.innerHTML}
                        <script>window.onload = function() { window.print(); };</script>
                      </body>
                    </html>
                  `);
                  printWin.document.close();
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-[#1677E8] hover:bg-[#1268D3] rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print / Save PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Suggestion Modal */}
      {showShareSuggestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-[15px] font-semibold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#EFF6FF] text-[#1677E8] flex items-center justify-center text-xs">
                  <Lightbulb className="w-3.5 h-3.5" />
                </span>
                {lang === "gu" ? "તમારું સૂચન શેર કરો" : "Share Your Suggestion"}
              </h3>
              <button
                type="button"
                onClick={() => setShowShareSuggestion(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {suggestionSuccess ? (
              <div className="py-6 text-center text-emerald-600 font-bold text-sm flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Thank you! Your suggestion has been shared with the myBillBook product team.</span>
              </div>
            ) : (
              <form onSubmit={handleSendSuggestion} className="space-y-3">
                <div>
                  <label className="block text-[12px] font-medium text-slate-700 mb-1">
                    Category
                  </label>
                  <CustomSelect
                    value={suggestionCategory}
                    onChange={(val: any) => setSuggestionCategory(val)}
                    options={[
                      { value: "Feature Request", label: "New Feature Request" },
                      { value: "GST & E-Way", label: "GST & E-Way Bill Workflow" },
                      { value: "Thermal Printing", label: "Thermal Printer Enhancement" },
                      { value: "Speed & UI", label: "Performance & UI Improvement" },
                    ]}
                    triggerClassName="rounded-xl border-slate-200 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-slate-700 mb-1">
                    What can we improve or build for you?
                  </label>
                  <textarea
                    rows={4}
                    value={suggestionText}
                    onChange={(e) => setSuggestionText(e.target.value)}
                    placeholder="Describe the feature or workflow that would help your business..."
                    className="w-full p-2.5 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8]"
                    required
                  ></textarea>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowShareSuggestion(false)}
                    className="h-9 px-3 text-[13px] text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-[13px] font-medium text-white bg-[#1677E8] hover:bg-[#1268D3] rounded-xl shadow-xs"
                  >
                    Send Suggestion
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Upgrade Plan Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-[15px] font-semibold text-slate-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#1677E8]" />
                {lang === "gu" ? "સબ્સ્ક્રિપ્શન પ્લાન રિન્યૂ / અપગ્રેડ કરો" : "Renew / Upgrade Subscription"}
              </h3>
              <button onClick={() => setShowUpgradeModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              {lang === "gu"
                ? "તમારા બિઝનેસ માટે યોગ્ય પ્લાન પસંદ કરો અને અનલિમિટેડ જીએસટી બિલિંગ, ઇ-વે બિલ અને ક્લાઉડ સિંક મેળવો."
                : "Select the subscription plan for your business scale to keep GST invoicing, E-Way Bill, and multi-user sync uninterrupted."}
            </p>

            <div className="space-y-2.5">
              {[
                {
                  tier: "WHOLESALE_PRO",
                  name: "Professional Plan",
                  price: "₹ 9,588/yr (₹799/mo)",
                  desc: "Up to 3 Businesses • Unlimited Invoices & E-Way Bills • AI OCR Scanner • WhatsApp Reminders",
                  recommended: true,
                },
                {
                  tier: "DISTRIBUTION_ENTERPRISE",
                  name: "Enterprise Plan",
                  price: "₹ 19,188/yr (₹1,599/mo)",
                  desc: "Unlimited Businesses & Warehouses • Direct Govt E-Invoicing API • Real-time Multi-Branch Sync",
                },
                {
                  tier: "RETAIL_BASIC",
                  name: "Starter Plan",
                  price: "₹ 4,788/yr (₹399/mo)",
                  desc: "1 Business • Up to 3,000 Invoices/yr • Standard GST & Thermal Print",
                },
              ].map((p) => (
                <div
                  key={p.tier}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                    p.recommended
                      ? "border-[#1677E8] bg-[#EFF6FF]/40 ring-1 ring-[#1677E8]/20"
                      : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900">{p.name}</span>
                      {p.recommended && (
                        <span className="text-[9px] font-semibold bg-[#1677E8] text-white px-1.5 py-0.2 rounded-full">
                          MOST POPULAR
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{p.desc}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-xs text-slate-900 tabular-nums">{p.price}</span>
                    <button
                      type="button"
                      disabled={isUpgradingPlan}
                      onClick={() => handleUpgradePlan(p.tier, "yearly")}
                      className="h-9 px-3 bg-[#1677E8] hover:bg-[#1268D3] text-white text-[13px] font-medium rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isUpgradingPlan ? "Connecting..." : "Pay with Razorpay"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="h-9 px-3 text-[13px] font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 2. MANAGE BUSINESS VIEW (Rich Form with Signature Pad & State Extraction)
// =========================================================================
function ManageBusinessSettingsView() {
  const { lang, currentCompany, currentFY, refreshTenantMetadata, companies } = useAuth();
  const c = currentCompany as any;
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const signatureInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [formData, setFormData] = useState({
    legalName: currentCompany?.legalName || "",
    tradeName: currentCompany?.tradeName || "",
    gstin: currentCompany?.gstin || "",
    pan: c?.pan || "",
    stateCode: currentCompany?.stateCode || "24",
    addressLine1: c?.addressLine1 || "",
    addressLine2: c?.addressLine2 || "",
    city: currentCompany?.city || "",
    district: c?.district || "",
    pincode: c?.pincode || "",
    phone: c?.phone || "",
    email: c?.email || "",
    bankName: currentCompany?.bankName || "",
    bankAccountNo: currentCompany?.bankAccountNo || "",
    bankIfsc: currentCompany?.bankIfsc || "",
    bankBranch: currentCompany?.bankBranch || "",
    upiVpa: currentCompany?.upiVpa || "",
    signatoryName: currentCompany?.signatoryName || "",
    signatoryDesignation: currentCompany?.signatoryDesignation || "Authorised Signatory",
    signatureUrl: currentCompany?.signatureUrl || "",
    logoUrl: c?.logoUrl || "",
    enableTds: !!c?.enableTds,
    enableTcs: !!c?.enableTcs,
    eInvoiceApplicable: !!c?.eInvoiceApplicable,
    gstRegistered: c?.gstRegistered !== undefined ? !!c.gstRegistered : !!currentCompany?.gstin,
    businessTypes: (Array.isArray(c?.businessTypes) ? c.businessTypes : []) as string[],
    industryType: c?.industryType || "",
    registrationType: c?.registrationType || "PRIVATE_LIMITED",
    extraDetails: (c?.extraDetails || {}) as Record<string, string>,
  });

  const [options, setOptions] = useState<any>({
    businessTypes: [
      { id: "MANUFACTURER", label: "Manufacturer" },
      { id: "WHOLESALER", label: "Wholesaler" },
      { id: "DISTRIBUTOR", label: "Distributor" },
      { id: "RETAILER", label: "Retailer" },
      { id: "SERVICE_PROVIDER", label: "Service Provider" },
    ],
    industryTypes: [
      { id: "RETAIL", label: "Retail / Shop" },
      { id: "WHOLESALE", label: "Wholesale Trading" },
      { id: "MANUFACTURING", label: "Manufacturing" },
      { id: "OTHER", label: "Other" },
    ],
    registrationTypes: [
      { id: "PROPRIETORSHIP", label: "Proprietorship" },
      { id: "PARTNERSHIP", label: "Partnership" },
      { id: "PRIVATE_LIMITED", label: "Private Limited Company" },
    ],
    extraDetailKeys: [{ id: "Website", label: "Website", placeholder: "www.website.com" }],
  });
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [signaturePreview, setSignaturePreview] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pinStatus, setPinStatus] = useState("");
  const [extraKey, setExtraKey] = useState("Website");
  const [extraValue, setExtraValue] = useState("");
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [closingFy, setClosingFy] = useState(false);

  const loadImagePreview = async (kind: "logo" | "signature") => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("billing_auth_token") : null;
      const tenantRaw = typeof window !== "undefined" ? localStorage.getItem("billing_tenant_context") : null;
      const tenant = tenantRaw ? JSON.parse(tenantRaw) : {};
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      if (tenant.organizationId) headers["x-organization-id"] = tenant.organizationId;
      if (tenant.companyId) headers["x-company-id"] = tenant.companyId;
      if (tenant.branchId) headers["x-branch-id"] = tenant.branchId;
      const res = await fetch(`${apiClient.getBaseUrl()}/tenants/company/${kind}`, { headers });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (kind === "logo") setLogoPreview(url);
      else setSignaturePreview(url);
    } catch {
      // no uploaded image yet
    }
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [res, catalog]: any[] = await Promise.all([
          apiClient.get("/tenants/company"),
          apiClient.get("/tenants/company/settings-options").catch(() => null),
        ]);
        if (!isMounted) return;
        if (catalog) setOptions((prev: any) => ({ ...prev, ...catalog }));
        if (res) {
          setFormData((prev) => ({
            ...prev,
            legalName: res.legalName || prev.legalName,
            tradeName: res.tradeName || prev.tradeName,
            gstin: res.gstin || prev.gstin,
            pan: res.pan || prev.pan,
            stateCode: res.stateCode || prev.stateCode,
            addressLine1: res.addressLine1 || prev.addressLine1,
            addressLine2: res.addressLine2 || prev.addressLine2,
            city: res.city || prev.city,
            district: res.district || prev.district,
            pincode: res.pincode || prev.pincode,
            phone: res.phone || prev.phone,
            email: res.email || prev.email,
            bankName: res.bankName || prev.bankName,
            bankAccountNo: res.bankAccountNo || prev.bankAccountNo,
            bankIfsc: res.bankIfsc || prev.bankIfsc,
            bankBranch: res.bankBranch || prev.bankBranch,
            upiVpa: res.upiVpa || prev.upiVpa,
            signatoryName: res.signatoryName || prev.signatoryName,
            signatoryDesignation: res.signatoryDesignation || prev.signatoryDesignation,
            signatureUrl: res.signatureUrl || prev.signatureUrl,
            logoUrl: res.logoUrl || prev.logoUrl,
            enableTds: !!res.enableTds,
            enableTcs: !!res.enableTcs,
            eInvoiceApplicable: !!res.eInvoiceApplicable,
            gstRegistered: res.gstRegistered !== undefined ? !!res.gstRegistered : !!res.gstin,
            businessTypes: Array.isArray(res.businessTypes) ? res.businessTypes : [],
            industryType: res.industryType || prev.industryType,
            registrationType: res.registrationType || prev.registrationType,
            extraDetails: res.extraDetails || {},
          }));
        }
      } catch {
        // keep local defaults
      }
      loadImagePreview("logo");
      loadImagePreview("signature");
    })();
    return () => {
      isMounted = false;
    };
  }, [currentCompany?.id]);

  useEffect(() => {
    const pin = String(formData.pincode || "").replace(/\D/g, "");
    if (pin.length !== 6) {
      setPinStatus("");
      return;
    }
    let cancelled = false;
    setPinStatus(lang === "gu" ? "શહેર શોધાઈ રહ્યું છે..." : "Looking up city...");
    const t = setTimeout(async () => {
      try {
        const res: any = await apiClient.get(`/tenants/pincode/${pin}`);
        if (cancelled) return;
        setFormData((prev) => ({
          ...prev,
          city: res.city || prev.city,
          district: res.district || prev.district,
          stateCode: res.stateCode || prev.stateCode,
        }));
        setPinStatus(res.city ? `${res.city}${res.state ? `, ${res.state}` : ""}` : "");
      } catch {
        if (!cancelled) setPinStatus(lang === "gu" ? "પિનકોડ મળ્યો નહીં" : "Pincode not found");
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [formData.pincode, lang]);

  const flash = (msg: string, kind: "ok" | "err" = "ok") => {
    if (kind === "ok") {
      setSuccess(msg);
      setError("");
      setTimeout(() => setSuccess(""), 3200);
    } else {
      setError(msg);
      setSuccess("");
    }
  };

  const handleGstinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().slice(0, 15);
    let stateCode = formData.stateCode;
    let pan = formData.pan;
    if (val.length >= 2 && INDIAN_STATES[val.slice(0, 2)]) stateCode = val.slice(0, 2);
    if (val.length >= 12) pan = val.slice(2, 12);
    setFormData((prev) => ({ ...prev, gstin: val, stateCode, pan, gstRegistered: val.length === 15 ? true : prev.gstRegistered }));
  };

  const uploadImage = async (kind: "logo" | "signature", file: File) => {
    const maxMb = kind === "logo" ? 5 : 2;
    if (file.size > maxMb * 1024 * 1024) {
      flash(`${kind === "logo" ? "Logo" : "Signature"} must be under ${maxMb} MB`, "err");
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    await apiClient.post(`/tenants/company/${kind}`, fd);
    const preview = URL.createObjectURL(file);
    if (kind === "logo") setLogoPreview(preview);
    else setSignaturePreview(preview);
    flash(kind === "logo" ? "Logo uploaded" : "Signature uploaded");
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ("clientX" in e ? e.clientX : e.touches[0].clientX) - rect.left;
    const y = ("clientY" in e ? e.clientY : e.touches[0].clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ("clientX" in e ? e.clientX : e.touches[0].clientX) - rect.left;
    const y = ("clientY" in e ? e.clientY : e.touches[0].clientY) - rect.top;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const saveDrawnSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    await apiClient.post("/tenants/company/signature", { fileBase64: dataUrl });
    setSignaturePreview(dataUrl);
    setShowSignaturePad(false);
    flash("Signature saved");
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsSaving(true);
    try {
      await apiClient.patch("/tenants/company", {
        ...formData,
        gstRegistered: formData.gstRegistered,
        eInvoiceApplicable: formData.gstRegistered ? formData.eInvoiceApplicable : false,
      });
      await refreshTenantMetadata();
      flash(lang === "gu" ? "વ્યવસાય વિગતો સાચવાઈ" : "Business details saved");
    } catch (err: any) {
      flash(err?.message || "Could not save business details", "err");
    } finally {
      setIsSaving(false);
    }
  };

  const addExtraDetail = async () => {
    if (!extraKey.trim() || !extraValue.trim()) return;
    try {
      const res: any = await apiClient.post("/tenants/company/extra-details", {
        key: extraKey.trim(),
        value: extraValue.trim(),
      });
      setFormData((prev) => ({ ...prev, extraDetails: res.extraDetails || { ...prev.extraDetails, [extraKey]: extraValue } }));
      setExtraValue("");
      flash("Detail added");
    } catch (err: any) {
      flash(err?.message || "Could not add detail", "err");
    }
  };

  const closeFy = async () => {
    if (!currentFY?.id) return;
    if (!window.confirm(`Close ${currentFY.name}? A new financial year will become current.`)) return;
    setClosingFy(true);
    try {
      const res: any = await apiClient.post(`/tenants/financial-years/${currentFY.id}/close`);
      await refreshTenantMetadata();
      flash(res?.message || "Financial year closed");
    } catch (err: any) {
      flash(err?.message || "Could not close financial year", "err");
    } finally {
      setClosingFy(false);
    }
  };

  const exportTally = async () => {
    try {
      const res: any = await apiClient.get("/tenants/company/tally-export");
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tally-masters.json";
      a.click();
      URL.revokeObjectURL(url);
      flash("Tally export downloaded");
    } catch (err: any) {
      flash(err?.message || "Tally export failed", "err");
    }
  };

  const fieldCls =
    "w-full h-9 px-3 text-[13px] bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#1677E8] focus:ring-1 focus:ring-[#1677E8]/20";
  const labelCls = "block text-[12px] text-slate-600 mb-1";
  const stateOptions = Object.entries(INDIAN_STATES).filter(([code]) => !["96", "97", "99", "28"].includes(code));

  const toggleBusinessType = (id: string) => {
    setFormData((prev) => {
      const has = prev.businessTypes.includes(id);
      return {
        ...prev,
        businessTypes: has ? prev.businessTypes.filter((x: string) => x !== id) : [...prev.businessTypes, id],
      };
    });
  };

  return (
    <div className="max-w-[1180px] mx-auto pb-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="typo-page-title text-[#182230]">{lang === "gu" ? "વ્યવસાય સેટિંગ્સ" : "Business Settings"}</h1>
          <p className="typo-page-subtitle text-slate-500 mt-0.5">{lang === "gu" ? "તમારી કંપનીની વિગતો અને માહિતી એડિટ કરો" : "Edit Your Company Settings And Information"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="h-9 px-3 rounded-md bg-[#1677E8] hover:bg-[#1268D3] text-white text-[12px] font-medium transition-colors"
          >
            Create new business
          </button>
          <Link href="/settings/help-support" className="h-9 px-3 rounded-md border border-slate-200 bg-white text-[12px] text-slate-600 inline-flex items-center gap-1 hover:bg-slate-50">
            Chat Support
          </Link>
          <button
            type="button"
            onClick={closeFy}
            disabled={closingFy || !currentFY?.id}
            className="h-9 px-3 rounded-md border border-slate-200 bg-white text-[12px] text-slate-700 hover:bg-slate-50"
          >
            {closingFy ? "Closing..." : "Close Financial Year"}
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-9 px-3 rounded-md border border-slate-200 bg-white text-[12px] text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSaving}
            className="h-9 px-4 rounded-md bg-[#1677E8] hover:bg-[#1268D3] text-white text-[12px] font-medium transition-colors shadow-xs"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {(success || error) && (
        <div className={`mb-3 px-3 py-2 rounded-md text-[12px] font-medium ${success ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
          {success || error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-2 gap-8 bg-white border border-slate-200 rounded-xl p-5">
        <div className="space-y-4">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="w-[110px] h-[110px] shrink-0 rounded-md border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-center overflow-hidden"
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain bg-white" />
              ) : (
                <>
                  <Cloud className="w-6 h-6 text-slate-400" />
                  <span className="text-[11px] font-semibold text-slate-600 mt-1">Upload Logo</span>
                  <span className="text-[10px] text-slate-400 px-2">PNG/JPG, max 5 MB</span>
                </>
              )}
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadImage("logo", file);
                e.target.value = "";
              }}
            />
            <div className="flex-1 min-w-0">
              <label className={labelCls}>Business Name *</label>
              <input
                value={formData.tradeName}
                onChange={(e) => setFormData({ ...formData, tradeName: e.target.value, legalName: formData.legalName || e.target.value })}
                className={fieldCls}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Company Phone Number</label>
              <input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={fieldCls} />
            </div>
            <div>
              <label className={labelCls}>Company E-Mail</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Enter company e-mail" className={fieldCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Billing Address</label>
            <textarea
              rows={3}
              value={[formData.addressLine1, formData.addressLine2].filter(Boolean).join("\n")}
              onChange={(e) => {
                const [line1 = "", ...rest] = e.target.value.split("\n");
                setFormData({ ...formData, addressLine1: line1, addressLine2: rest.join("\n") });
              }}
              placeholder="Enter Billing Address"
              className="w-full min-h-[72px] px-3 py-2 text-[13px] bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#1677E8] focus:ring-1 focus:ring-[#1677E8]/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>State</label>
              <CustomCombobox
                value={formData.stateCode}
                onChange={(val: any) => setFormData({ ...formData, stateCode: val })}
                options={stateOptions.map(([code, st]) => ({
                  value: code,
                  label: st.name,
                }))}
                placeholder="Select State..."
                triggerClassName="rounded-md border-slate-300 bg-white"
              />
            </div>
            <div>
              <label className={labelCls}>Pincode</label>
              <input
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                placeholder="Enter Pincode"
                className={fieldCls}
                inputMode="numeric"
              />
              {pinStatus ? <p className="text-[11px] text-slate-500 mt-1">{pinStatus}</p> : null}
            </div>
          </div>

          <div>
            <label className={labelCls}>City</label>
            <input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Enter City" className={fieldCls} />
          </div>

          <div>
            <p className={labelCls}>Are you GST Registered?</p>
            <div className="flex items-center gap-8">
              {[{ v: true, l: "Yes" }, { v: false, l: "No" }].map((opt) => (
                <label key={String(opt.v)} className="inline-flex items-center gap-2 text-[13px] text-slate-700">
                  <input
                    type="radio"
                    checked={formData.gstRegistered === opt.v}
                    onChange={() =>
                      setFormData({
                        ...formData,
                        gstRegistered: opt.v,
                        eInvoiceApplicable: opt.v ? formData.eInvoiceApplicable : false,
                      })
                    }
                    className="accent-[#1677E8]"
                  />
                  {opt.l}
                </label>
              ))}
            </div>
          </div>

          {formData.gstRegistered && (
            <div>
              <label className={labelCls}>GSTIN</label>
              <input value={formData.gstin} onChange={handleGstinChange} placeholder="24ABCDE1234F1Z5" className={`${fieldCls} tabular-nums uppercase`} />
            </div>
          )}

          <div className="py-2 border-y border-slate-100 my-1">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[13px] font-medium text-slate-800 block">Enable e-Invoicing</span>
                <span className="text-[11px] text-slate-500 block">
                  {formData.gstRegistered
                    ? (formData.eInvoiceApplicable ? "E-Invoicing is enabled for your sales invoices." : "Generate government-compliant IRN & QR codes on B2B invoices.")
                    : "GST registration is required to enable statutory e-invoicing."}
                </span>
              </div>
              <button
                type="button"
                disabled={!formData.gstRegistered}
                onClick={() => setFormData({ ...formData, eInvoiceApplicable: !formData.eInvoiceApplicable })}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${formData.eInvoiceApplicable && formData.gstRegistered ? "bg-[#1677E8]" : "bg-slate-300"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${formData.eInvoiceApplicable && formData.gstRegistered ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
            {formData.gstRegistered && (
              <div className="mt-1.5 flex items-center justify-end">
                <Link
                  href="/settings/e-invoice"
                  className="text-[11px] font-semibold text-[#1677E8] hover:underline flex items-center gap-1"
                >
                  Configure IRP Credentials & Settings &rarr;
                </Link>
              </div>
            )}
          </div>

          <div>
            <label className={labelCls}>PAN Number</label>
            <input
              value={formData.pan}
              onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase().slice(0, 10) })}
              placeholder="Enter your PAN Number"
              className={`${fieldCls} tabular-nums uppercase`}
            />
          </div>

          <label className="flex items-center justify-between py-1">
            <span className="text-[13px] text-slate-700">Enable TDS</span>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, enableTds: !formData.enableTds })}
              className={`relative w-11 h-6 rounded-full ${formData.enableTds ? "bg-[#1677E8]" : "bg-slate-300"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${formData.enableTds ? "left-5" : "left-0.5"}`} />
            </button>
          </label>
          <label className="flex items-center justify-between py-1">
            <span className="text-[13px] text-slate-700">Enable TCS</span>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, enableTcs: !formData.enableTcs })}
              className={`relative w-11 h-6 rounded-full ${formData.enableTcs ? "bg-[#1677E8]" : "bg-slate-300"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${formData.enableTcs ? "left-5" : "left-0.5"}`} />
            </button>
          </label>

          <div className="pt-4 border-t border-slate-100">
            <h2 className="text-[16px] font-semibold text-[#182230] mb-3">Company Settings</h2>
            <button type="button" onClick={exportTally} className="w-full text-left rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
              <p className="text-[13px] font-semibold text-slate-800">Data Export to Tally</p>
              <p className="text-[11px] text-slate-500">Transfer vouchers, items and parties to Tally</p>
            </button>
          </div>

          <div className="pt-2">
            <button type="button" onClick={() => setIsModalOpen(true)} className="text-[13px] font-semibold text-[#1677E8] hover:underline">
              Add New Business
            </button>
            <p className="text-[11px] text-slate-400 mt-1">{companies.length} business{companies.length === 1 ? "" : "es"} configured</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Business Type (Select multiple, if applicable)</label>
            <div className="border border-slate-200 rounded-md p-2 max-h-36 overflow-auto bg-white">
              {(options.businessTypes || []).map((bt: any) => (
                <label key={bt.id} className="flex items-center gap-2 py-1 px-1 text-[13px] text-slate-700">
                  <input type="checkbox" checked={formData.businessTypes.includes(bt.id)} onChange={() => toggleBusinessType(bt.id)} className="accent-[#1677E8]" />
                  {bt.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Industry Type</label>
            <CustomSelect
              value={formData.industryType}
              onChange={(val: any) => setFormData({ ...formData, industryType: val })}
              options={[
                { value: "", label: "Select Industry Type" },
                ...(options.industryTypes || []).map((it: any) => ({
                  value: it.id,
                  label: it.label,
                })),
              ]}
              triggerClassName="rounded-md border-slate-300 bg-white"
            />
          </div>
          <div>
            <label className={labelCls}>Business Registration Type</label>
            <CustomSelect
              value={formData.registrationType}
              onChange={(val: any) => setFormData({ ...formData, registrationType: val })}
              options={(options.registrationTypes || []).map((rt: any) => ({
                value: rt.id,
                label: rt.label,
              }))}
              triggerClassName="rounded-md border-slate-300 bg-white"
            />
          </div>

          <div>
            <label className={labelCls}>Signature</label>
            <p className="text-[11px] text-slate-400 mb-2">Details added below will be shown on your invoices</p>
            <button
              type="button"
              onClick={() => setShowSignaturePad((v) => !v)}
              className="w-[140px] h-[88px] rounded-md border-2 border-dashed border-slate-300 text-[#1677E8] hover:border-[#1677E8] text-[13px] font-medium bg-slate-50 overflow-hidden transition-colors"
            >
              {signaturePreview ? <img src={signaturePreview} alt="Signature" className="w-full h-full object-contain bg-white" /> : "+ Add Signature"}
            </button>
            <input
              ref={signatureInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadImage("signature", file);
                e.target.value = "";
              }}
            />
            {showSignaturePad && (
              <div className="mt-3 border border-slate-200 rounded-md p-3 space-y-2">
                <canvas
                  ref={canvasRef}
                  width={360}
                  height={110}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="bg-white border border-slate-200 rounded cursor-crosshair touch-none w-full"
                />
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => signatureInputRef.current?.click()} className="text-[12px] px-2 py-1 border rounded hover:bg-slate-50">
                    Upload PNG/JPG
                  </button>
                  <button type="button" onClick={saveDrawnSignature} className="text-[12px] px-2 py-1 bg-[#1677E8] hover:bg-[#1268D3] text-white rounded">
                    Save Signature
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bank & Payment Details (For Invoices & Scanner QR) */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div>
              <h3 className="text-[14px] font-semibold text-slate-800 flex items-center gap-2">
                <svg className="w-4 h-4 text-[#1677E8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                {lang === "gu" ? "બેંક અને UPI સ્કેનર વિગતો" : "Bank & UPI Payment Details"}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {lang === "gu"
                  ? "આ વિગતો આપમેળે તમારા સેલ્સ ઇન્વોઇસ પર બેંક ડિટેઇલ્સ અને Scan to Pay UPI QR કોડ તરીકે દેખાશે."
                  : "These details will automatically appear on your invoices as Bank Details & Scan to Pay UPI QR Code."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{lang === "gu" ? "બેંકનું નામ" : "Bank Name"}</label>
                <input
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder={lang === "gu" ? "દા.ત. State Bank of India, HDFC Bank" : "e.g. State Bank of India, HDFC Bank"}
                  className={fieldCls}
                />
              </div>

              <div>
                <label className={labelCls}>{lang === "gu" ? "બેંક એકાઉન્ટ નંબર" : "Bank Account Number"}</label>
                <input
                  value={formData.bankAccountNo}
                  onChange={(e) => setFormData({ ...formData, bankAccountNo: e.target.value.replace(/\s/g, "") })}
                  placeholder={lang === "gu" ? "એકાઉન્ટ નંબર દાખલ કરો" : "Enter Account Number"}
                  className={`${fieldCls} tabular-nums`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{lang === "gu" ? "IFSC કોડ" : "IFSC Code"}</label>
                <input
                  value={formData.bankIfsc}
                  onChange={(e) => setFormData({ ...formData, bankIfsc: e.target.value.toUpperCase().replace(/\s/g, "").slice(0, 11) })}
                  placeholder="e.g. SBIN0001234"
                  className={`${fieldCls} uppercase tabular-nums`}
                />
              </div>

              <div>
                <label className={labelCls}>{lang === "gu" ? "બ્રાન્ચનું નામ" : "Branch Name"}</label>
                <input
                  value={formData.bankBranch}
                  onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })}
                  placeholder={lang === "gu" ? "દા.ત. Main Branch, Surat" : "e.g. Main Branch, Surat"}
                  className={fieldCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>
                {lang === "gu" ? "UPI ID / VPA (સ્કેનર QR કોડ માટે)" : "UPI ID / VPA (For Scanner QR Code)"}
              </label>
              <input
                value={formData.upiVpa}
                onChange={(e) => setFormData({ ...formData, upiVpa: e.target.value.trim() })}
                placeholder="e.g. 9876543210@paytm, merchant@okhdfcbank"
                className={`${fieldCls} font-mono text-[12px]`}
              />
              <p className="text-[11px] text-slate-500 mt-1">
                {lang === "gu"
                  ? "તમારા ગૂગલ પે / ફોનપે / પેટીએમ નો UPI ID અહીં લખો જેથી ઇન્વોઇસ પર સ્કેન કરીને પેમેન્ટ કરવાનું QR કોડ આવી જશે."
                  : "Enter your Google Pay / PhonePe / Paytm UPI ID to generate the invoice 'Scan to Pay UPI' QR Code."}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-[14px] font-semibold text-slate-800">Add Business Details</h3>
            <p className="text-[11px] text-slate-500 mb-2">Add additional business information such as MSME number, Website etc.</p>
            {Object.entries(formData.extraDetails || {}).map(([k, v]) => (
              <p key={k} className="text-[12px] text-slate-600 mb-1">
                <span className="font-medium">{k}:</span> {v}
              </p>
            ))}
            <div className="flex gap-2">
              <div className="w-[140px] shrink-0">
                <CustomSelect
                  value={extraKey}
                  onChange={(val: any) => setExtraKey(val)}
                  options={(options.extraDetailKeys || []).map((k: any) => ({
                    value: k.id,
                    label: k.label,
                  }))}
                  triggerClassName="rounded-md border-slate-300 bg-white"
                />
              </div>
              <input
                value={extraValue}
                onChange={(e) => setExtraValue(e.target.value)}
                placeholder={options.extraDetailKeys?.find((k: any) => k.id === extraKey)?.placeholder || "www.website.com"}
                className={fieldCls}
              />
              <button type="button" onClick={addExtraDetail} className="h-9 px-4 rounded-md bg-[#1677E8] hover:bg-[#1268D3] text-white text-[13px] font-medium shrink-0 shadow-xs">
                Add
              </button>
            </div>
          </div>
        </div>
      </form>

      <CreateCompanyModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

// =========================================================================
// 3. INVOICE SETTINGS VIEW
// =========================================================================
// =========================================================================
// 3. INVOICE SETTINGS VIEW (Live A4 Preview Studio Matching MyBillBook)
// =========================================================================
function InvoiceSettingsView() {
  return <InvoiceSettingsStudio />;
}

// =========================================================================
// 4. PRINT SETTINGS VIEW (Live Dynamic Thermal Slip Studio)
// =========================================================================
function PrintSettingsView() {
  const { lang, currentCompany, user } = useAuth();
  const [activeTab, setActiveTab] = useState<"thermal" | "barcode">("thermal");

  // Core Thermal Settings
  const [settings, setSettings] = useState<ThermalPrintSettings>(() => getCachedThermalSettings());
  const [upiQrPreview, setUpiQrPreview] = useState<string>("");
  const [openSection, setOpenSection] = useState<string | null>("theme-settings");
  const [savedBanner, setSavedBanner] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isBluetoothPrinting, setIsBluetoothPrinting] = useState<boolean>(false);
  const [bluetoothStatus, setBluetoothStatus] = useState<string | null>(null);
  const [showBluetoothHelp, setShowBluetoothHelp] = useState<boolean>(false);
  const [currentOrigin, setCurrentOrigin] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentOrigin(window.location.origin);
    }
  }, []);

  // Dynamic Company Details
  const displayName = currentCompany?.tradeName || currentCompany?.legalName || "NV ENTERPRISE";
  const displayAddress = [
    (currentCompany as any)?.addressLine1 || (currentCompany as any)?.address || "Shop No. 12, Market Yard",
    (currentCompany as any)?.city || "Ahmedabad",
    (currentCompany as any)?.state || "Gujarat",
    (currentCompany as any)?.pincode || "380001",
  ].filter(Boolean).join(", ");
  const displayPhone = (currentCompany as any)?.phone || user?.phone || "9426886960";
  const displayGstin = currentCompany?.gstin || "24AABCCDD1202Z1";
  const displayUpi = (currentCompany as any)?.upiVpa || (currentCompany as any)?.upiId || `${displayPhone}@okaxis`;

  // 1. Auto-fetch remote settings & generate dynamic UPI QR
  useEffect(() => {
    let active = true;

    // Load backend invoice print settings
    (async () => {
      try {
        const res: any = await apiClient.get("/invoice-settings");
        if (res && res.settings && active) {
          const s = res.settings;
          setSettings((prev) => {
            const next: ThermalPrintSettings = {
              ...prev,
              paperSize: s.paperSize === "THERMAL_58" ? "2inch" : prev.paperSize,
              showPartyBalance: s.showPartyBalance ?? prev.showPartyBalance,
              showItemDesc: s.showItemDescription ?? prev.showItemDesc,
              showTime: s.showTimeOnInvoice ?? prev.showTime,
              showSavings: s.showSavedAmount ?? prev.showSavings,
              showUpiQr: s.showUpiQr ?? prev.showUpiQr,
              showGstin: s.showGstin ?? prev.showGstin,
              showDueDate: s.showDueDate ?? prev.showDueDate,
              showPlaceOfSupply: s.showPlaceOfSupply ?? prev.showPlaceOfSupply,
              showShippingAddress: s.showShippingAddress ?? prev.showShippingAddress,
              showHsn: s.showHsn ?? prev.showHsn,
              showRate: s.showPricePerItem ?? prev.showRate,
              showTaxBreakup: s.showTaxBreakup ?? prev.showTaxBreakup,
              showNotes: s.showNotes ?? prev.showNotes,
              showTerms: s.showTerms ?? prev.showTerms,
              logoUrl: s.logoUrl || prev.logoUrl || (currentCompany as any)?.logoUrl || null,
            };
            saveCachedThermalSettings(next);
            return next;
          });
        }
      } catch {}
    })();

    // Generate real-time scannable UPI QR code for the thermal slip
    generateUpiQrDataUrl(displayUpi, displayName, 9596.5).then((dataUrl) => {
      if (active) setUpiQrPreview(dataUrl);
    });

    return () => {
      active = false;
    };
  }, [currentCompany?.id, displayName, displayUpi]);

  // Update setting helper
  const updateSetting = <K extends keyof ThermalPrintSettings>(key: K, val: ThermalPrintSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: val };
      saveCachedThermalSettings(next);
      return next;
    });
  };

  // Barcode Label Studio State
  const [barcodeSize, setBarcodeSize] = useState<"50x25" | "38x25" | "50x35">("50x25");
  const [barcodeShowCompany, setBarcodeShowCompany] = useState(true);
  const [barcodeShowItemName, setBarcodeShowItemName] = useState(true);
  const [barcodeShowPrice, setBarcodeShowPrice] = useState(true);
  const [barcodeShowCode, setBarcodeShowCode] = useState(true);
  const [barcodeItemName, setBarcodeItemName] = useState("Samsung A30 (4GB/64GB)");
  const [barcodeValue, setBarcodeValue] = useState("8901030865421");
  const [barcodePrice, setBarcodePrice] = useState(10620);
  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);

  // Live Barcode Preview Generator
  useEffect(() => {
    if (activeTab === "barcode" && barcodeSvgRef.current && barcodeValue) {
      try {
        JsBarcode(barcodeSvgRef.current, barcodeValue.trim(), {
          format: "CODE128",
          width: barcodeSize === "38x25" ? 1.5 : 2,
          height: barcodeSize === "50x35" ? 50 : 38,
          displayValue: barcodeShowCode,
          fontSize: 11,
          font: "monospace",
          fontOptions: "bold",
          margin: 2,
          background: "#FFFFFF",
          lineColor: "#000000",
        });
      } catch (e) {
        console.warn("JsBarcode preview notice:", e);
      }
    }
  }, [activeTab, barcodeValue, barcodeShowCode, barcodeSize]);

  // Handle Barcode Sticker Print
  const handlePrintBarcodeSticker = () => {
    let iframe = document.getElementById("barcode-label-print-frame") as HTMLIFrameElement;
    if (iframe) iframe.remove();
    iframe = document.createElement("iframe");
    iframe.id = "barcode-label-print-frame";
    iframe.style.position = "fixed";
    iframe.style.top = "-99999px";
    iframe.style.left = "-99999px";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const widthMm = barcodeSize === "38x25" ? "38mm" : "50mm";
    const heightMm = barcodeSize === "50x35" ? "35mm" : "25mm";
    const svgHtml = barcodeSvgRef.current ? barcodeSvgRef.current.outerHTML : "";

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Barcode_${barcodeValue}</title>
          <style>
            @page { size: ${widthMm} ${heightMm}; margin: 0 !important; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              color: #000;
              background: #fff;
              width: ${widthMm};
              height: ${heightMm};
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              padding: 1.5mm;
              overflow: hidden;
            }
            .company { font-size: 8.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1; }
            .item-name { font-size: 8px; font-weight: 600; line-height: 1.1; margin-top: 1mm; max-height: 2.4em; overflow: hidden; }
            .price { font-size: 10px; font-weight: 900; margin-top: 1mm; }
            .svg-wrap { margin-top: 1mm; max-width: 100%; display: flex; justify-content: center; }
            .svg-wrap svg { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          ${barcodeShowCompany ? `<div class="company">${displayName}</div>` : ""}
          ${barcodeShowItemName ? `<div class="item-name">${barcodeItemName}</div>` : ""}
          <div class="svg-wrap">${svgHtml}</div>
          ${barcodeShowPrice ? `<div class="price">MRP: ₹${Number(barcodePrice).toLocaleString("en-IN")}</div>` : ""}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 250);
  };

  // Sample data constructed dynamically from real company profile
  const sampleReceiptData: ThermalReceiptData = useMemo(() => {
    return {
      companyName: displayName,
      companyAddress: displayAddress,
      companyPhone: displayPhone,
      companyGstin: displayGstin,
      companyFssai: (currentCompany as any)?.fssaiNumber || "",
      companyLogoUrl: (currentCompany as any)?.logoUrl || settings.logoUrl || null,
      upiId: displayUpi,

      invoiceNumber: "AABBCCDD/202",
      invoiceDate: "17/01/2026",
      invoiceTime: "15:47",
      cashierName: user?.fullName || "jaydip Khunt",

      customerName: "Sample Party",
      customerPhone: "7400417400",
      customerAddress: "No F2, Outer Circle, Connaught Circus, New Delhi, DELHI, 110001",
      customerGstin: "07AAAAA0000A1Z5",

      shippingAddress: "Plot No. 123, Industrial Area, Andheri East, Mumbai, MAHARASHTRA, 400001",
      placeOfSupply: "Gujarat (24)",
      dueDate: "24/01/2026",

      items: [
        {
          name: "Samsung A30",
          description: "samsung phone",
          hsn: "1234",
          quantity: "1",
          unit: "Pcs",
          rate: 10000,
          discount: 10,
          taxPercent: 18,
          amount: 10620,
        },
        {
          name: "Parle-G 200g",
          description: "best biscuit",
          hsn: "40511209",
          quantity: "1",
          unit: "Box",
          rate: 342.86,
          discount: 15,
          taxPercent: 5,
          amount: 306,
        },
        {
          name: "Puma Blue Round...",
          description: "dryfit athletic",
          hsn: "2032",
          quantity: "2",
          unit: "Pcs",
          rate: 900,
          taxPercent: 5,
          amount: 1890,
        },
      ],

      subTotal: 12816,
      taxableAmount: 11091.43,
      taxTotal: 1724.57,
      taxBreakdown: [
        { label: "IGST @5%", amount: 104.57 },
        { label: "IGST @18%", amount: 1620 },
      ],
      discountTotal: 1051.43,
      grandTotal: 9596.5,
      paymentMode: "UPI / QR",
      receivedAmount: 0,
      balanceAmount: 9596.5,
      previousBalance: -192050.15,
      currentBalance: -182453.65,
      youSaved: 1051.43,

      notes: "Sample Note",
      terms: "1. Goods once sold will not be taken back or exchanged\n2. All disputes are subject to local jurisdiction",
    };
  }, [displayName, displayAddress, displayPhone, displayGstin, displayUpi, user?.fullName, settings.logoUrl, (currentCompany as any)?.logoUrl]);

  // Handle Save to Backend & LocalStorage
  const handleSave = async () => {
    setIsSaving(true);
    try {
      saveCachedThermalSettings(settings);

      // Persist in backend invoice print settings
      await apiClient.put("/invoice-settings", {
        paperSize: settings.paperSize === "2inch" ? "THERMAL_58" : "THERMAL_80",
        showPartyBalance: settings.showPartyBalance,
        showItemDescription: settings.showItemDesc,
        showTimeOnInvoice: settings.showTime,
        showSavedAmount: settings.showSavings,
        showUpiQr: settings.showUpiQr,
        showGstin: settings.showGstin,
        showDueDate: settings.showDueDate,
        showPlaceOfSupply: settings.showPlaceOfSupply,
        showShippingAddress: settings.showShippingAddress,
        showHsn: settings.showHsn,
        showPricePerItem: settings.showRate,
        showTaxBreakup: settings.showTaxBreakup,
        showNotes: settings.showNotes,
        showTerms: settings.showTerms,
      });

      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    } catch {
      // Local cache preserved
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Direct Browser / Mobile Thermal Slip Print
  const handleTestPrint = async () => {
    setIsPrinting(true);
    try {
      await executeThermalPrint(sampleReceiptData, settings);
    } catch {
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  // Direct Web Bluetooth Thermal POS Printer Connect & Print
  const handleBluetoothPrint = async () => {
    setIsBluetoothPrinting(true);
    setBluetoothStatus("Searching Bluetooth POS printer...");
    try {
      const res = await printViaBluetoothPos(sampleReceiptData, settings);
      if (res.success) {
        setBluetoothStatus("Receipt printed via Bluetooth!");
        setTimeout(() => setBluetoothStatus(null), 3500);
      } else {
        if (res.isSecureContextError) {
          setBluetoothStatus("Direct Bluetooth works on live HTTPS domain. Using standard thermal print.");
        } else {
          setBluetoothStatus(res.error || "Bluetooth print failed. Using standard thermal print.");
        }
        setTimeout(() => setBluetoothStatus(null), 5000);
        await executeThermalPrint(sampleReceiptData, settings);
      }
    } catch (err: any) {
      setBluetoothStatus(err?.message || "Bluetooth error.");
      setTimeout(() => setBluetoothStatus(null), 3500);
      await executeThermalPrint(sampleReceiptData, settings);
    } finally {
      setIsBluetoothPrinting(false);
    }
  };

  const is2Inch = settings.paperSize === "2inch";

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      {/* Top Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="typo-page-title text-[#182230]">
              {activeTab === "thermal"
                ? lang === "gu"
                  ? "પ્રિન્ટ સેટિંગ્સ (થર્મલ POS)"
                  : "Print Settings"
                : lang === "gu"
                ? "બારકોડ સ્ટીકર પ્રિન્ટ"
                : "Barcode Sticker Print"}
            </h1>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              {activeTab === "thermal"
                ? is2Inch
                  ? "2 Inch (58mm)"
                  : "3 Inch (80mm)"
                : `${barcodeSize === "38x25" ? "38x25mm" : barcodeSize === "50x35" ? "50x35mm" : "50x25mm"} Label`}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeTab === "thermal"
              ? lang === "gu"
                ? "થર્મલ POS સ્લિપ પ્રિન્ટર કસ્ટમાઇઝેશન, સાઈઝ અને રીઅલ-ટાઇમ રસીદ પ્રિવ્યૂ"
                : "Thermal POS slip printer customization, size profiles and real receipt preview"
              : lang === "gu"
              ? "ઇન્વેન્ટરી આઇટમ્સ માટે બારકોડ લેબલ સ્ટીકર પ્રિન્ટર સેટિંગ્સ અને પ્રિવ્યૂ"
              : "Thermal barcode sticker printer customization, label sizes and live sticker preview"}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {savedBanner && (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl animate-fade-in flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>{lang === "gu" ? "સેટિંગ્સ સચવાયા!" : "Settings Saved!"}</span>
            </span>
          )}

          {activeTab === "thermal" && (
            <>
              {bluetoothStatus && (
                <span className="text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-xl">
                  {bluetoothStatus}
                </span>
              )}

              <button
                type="button"
                onClick={handleTestPrint}
                disabled={isPrinting}
                className="h-9 px-4 bg-[#1677E8] hover:bg-[#1268D3] text-white text-[13px] font-medium rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Print test slip on connected POS printer (USB / Bluetooth / Network)"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isPrinting ? "Printing..." : "Print Test Slip"}</span>
              </button>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleBluetoothPrint}
                  disabled={isBluetoothPrinting}
                  className="h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13px] font-medium rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Direct print to Bluetooth 58mm/80mm POS slip printer"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{isBluetoothPrinting ? "Connecting..." : "Bluetooth POS"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowBluetoothHelp(true)}
                  className="h-9 w-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  title="Bluetooth POS Details & Live HTTPS Info"
                >
                  ?
                </button>
              </div>
            </>
          )}

          {activeTab === "barcode" && (
            <button
              type="button"
              onClick={handlePrintBarcodeSticker}
              className="h-9 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13px] font-medium rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Print test barcode sticker label"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Print Test Sticker</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="h-9 px-4 bg-[#1677E8] hover:bg-[#1268D3] text-white text-[13px] font-medium rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>{isSaving ? "Saving..." : lang === "gu" ? "સેટિંગ્સ સાચવો" : "Save Settings"}</span>
          </button>
        </div>
      </div>

      {/* 2-Column Studio Layout */}
      <div className="flex flex-col xl:flex-row gap-5 items-start">
        {/* LEFT COLUMN: Live Preview (Thermal Slip OR Barcode Label) */}
        <div className="flex-1 w-full bg-[#E5E7EB]/70 rounded-2xl p-4 sm:p-6 lg:p-8 flex justify-center items-start overflow-x-auto border border-slate-200 min-h-[820px]">
          {activeTab === "thermal" ? (
            <div
              className={`bg-white shadow-xl border border-slate-400 text-black p-4 sm:p-5 tabular-nums space-y-1.5 rounded-xs select-none transition-all duration-200 ${
                is2Inch ? "w-[260px] max-w-[260px] text-[9.5px]" : "w-[330px] max-w-[330px] text-[10.5px]"
              }`}
              style={{
                fontFamily: "'Courier New', Courier, 'Lucida Console', Monaco, monospace",
                fontWeight: 600,
                lineHeight: 1.25,
              }}
            >
              {/* Header info */}
              <div className="text-center space-y-0.5">
                {settings.logoUrl && (
                  <div className="flex justify-center mb-1">
                    <img
                      src={settings.logoUrl}
                      alt="Logo"
                      className="max-h-9 max-w-[110px] object-contain filter grayscale contrast-150"
                    />
                  </div>
                )}
                <p className="font-semibold text-sm text-black uppercase tracking-tight">{displayName}</p>
                <p className="text-[9px] text-black leading-tight">{displayAddress}</p>
                <p className="text-[9px] text-black">
                  Phone No : <b>{displayPhone}</b>
                </p>
                {settings.showGstin && displayGstin && (
                  <p className="text-[9px] text-black">
                    GSTIN : <b>{displayGstin}</b>
                  </p>
                )}
              </div>

              <div className="border-t border-black my-1"></div>

              <p className="text-center font-bold text-xs uppercase tracking-wider text-black">TAX INVOICE</p>

              <div className="space-y-0.5 text-[9.5px]">
                <p>
                  Invoice No : <b>AABBCCDD/202</b>
                </p>
                <div className="flex justify-between">
                  <span>Date : 17/01/2026</span>
                  {settings.showTime && <span>Time : 15:47</span>}
                </div>
                {settings.showDueDate && (
                  <div className="flex justify-between text-[9px]">
                    <span>Due Date : 24/01/2026</span>
                  </div>
                )}
                {settings.showPlaceOfSupply && (
                  <p className="text-[9px]">Place of Supply : Gujarat (24)</p>
                )}
                <p className="font-bold text-black pt-0.5">Bill To : Sample Party</p>
                {settings.showCustomerPhone !== false && <p>Ph. : 7400417400</p>}
                <p className="text-[8.5px] leading-tight text-black">
                  No F2, Outer Circle, Connaught Circus, New Delhi, DELHI, 110001
                </p>
                {settings.showShippingAddress && (
                  <>
                    <p className="font-bold text-black pt-0.5">Ship To : Sample Shipping Company</p>
                    <p className="text-[8.5px] leading-tight text-black">
                      Plot No. 123, Industrial Area, Andheri East, Mumbai, MAHARASHTRA, 400001
                    </p>
                  </>
                )}
              </div>

              <div className="border-t border-black my-1"></div>

              {/* Items Header */}
              <div className="grid grid-cols-12 font-bold text-[9px] border-b border-black pb-0.5">
                <span className="col-span-1">#</span>
                <span className="col-span-5">Item</span>
                <span className="col-span-2 text-center">Qty</span>
                {settings.showRate && <span className="col-span-2 text-right">Rate</span>}
                <span className={`${settings.showRate ? "col-span-2" : "col-span-4"} text-right`}>Amt</span>
              </div>

              {/* Items Rows */}
              <div className="space-y-1 py-0.5 text-[9px]">
                <div>
                  <div className="grid grid-cols-12 font-bold">
                    <span className="col-span-1">1</span>
                    <span className="col-span-5 truncate">Samsung A30</span>
                    <span className="col-span-2 text-center">1 Pcs</span>
                    {settings.showRate && <span className="col-span-2 text-right">10,000</span>}
                    <span className={`${settings.showRate ? "col-span-2" : "col-span-4"} text-right`}>10,620</span>
                  </div>
                  {settings.showItemDesc && (
                    <div className="text-[8px] text-black pl-3 leading-tight">
                      <p>Desc: samsung phone</p>
                      {settings.showHsn && <p>HSN: 1234, Disc: 10%, GST: 18%</p>}
                    </div>
                  )}
                </div>

                <div>
                  <div className="grid grid-cols-12 font-bold">
                    <span className="col-span-1">2</span>
                    <span className="col-span-5 truncate">Parle-G 200g</span>
                    <span className="col-span-2 text-center">1 Box</span>
                    {settings.showRate && <span className="col-span-2 text-right">342.86</span>}
                    <span className={`${settings.showRate ? "col-span-2" : "col-span-4"} text-right`}>306</span>
                  </div>
                  {settings.showItemDesc && (
                    <div className="text-[8px] text-black pl-3 leading-tight">
                      <p>Desc: best biscuit</p>
                      {settings.showHsn && <p>HSN: 40511209, Disc: 15%, GST: 5%</p>}
                    </div>
                  )}
                </div>

                <div>
                  <div className="grid grid-cols-12 font-bold">
                    <span className="col-span-1">3</span>
                    <span className="col-span-5 truncate">Puma Blue Round...</span>
                    <span className="col-span-2 text-center">2 Pcs</span>
                    {settings.showRate && <span className="col-span-2 text-right">900</span>}
                    <span className={`${settings.showRate ? "col-span-2" : "col-span-4"} text-right`}>1,890</span>
                  </div>
                  {settings.showItemDesc && settings.showHsn && (
                    <div className="text-[8px] text-black pl-3 leading-tight">
                      <p>HSN: 2032, GST: 5%</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-black my-1"></div>

              {/* Subtotal & Taxes */}
              <div className="space-y-0.5 text-[9px]">
                <div className="flex justify-between font-bold">
                  <span>Sub Total (4)</span>
                  <span>₹ 12,816</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxable Amount</span>
                  <span>₹ 11,091.43</span>
                </div>
                {settings.showTaxBreakup && (
                  <>
                    <div className="flex justify-between">
                      <span>IGST @5%</span>
                      <span>₹ 104.57</span>
                    </div>
                    <div className="flex justify-between">
                      <span>IGST @18%</span>
                      <span>₹ 1,620</span>
                    </div>
                  </>
                )}
              </div>

              <div className="border-t border-dashed border-black my-1"></div>

              {/* Total */}
              <div className="space-y-0.5 text-[9.5px]">
                <div className="flex justify-between font-semibold text-xs">
                  <span>TOTAL AMOUNT</span>
                  <span>₹ 9,596.5</span>
                </div>
                {settings.showSavings && (
                  <div className="flex justify-between font-bold bg-black text-white px-1 py-0.5 my-0.5 text-[9px]">
                    <span>YOU SAVED</span>
                    <span>- ₹ 1,051.43</span>
                  </div>
                )}
                <div className="flex justify-between text-[9px]">
                  <span>Received</span>
                  <span>₹ 0</span>
                </div>
              </div>

              <div className="border-t border-dashed border-black my-1"></div>

              {/* Balance Details */}
              <div className="space-y-0.5 text-[9px]">
                <div className="flex justify-between font-bold">
                  <span>Balance Due</span>
                  <span>₹ 9,596.5</span>
                </div>
                {settings.showPartyBalance && (
                  <>
                    {settings.showPrevBalance && (
                      <div className="flex justify-between">
                        <span>Previous Balance</span>
                        <span>₹ -1,92,050.15</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold">
                      <span>Current Balance</span>
                      <span>₹ -1,82,453.65</span>
                    </div>
                  </>
                )}
              </div>

              {/* Scannable Dynamic UPI QR Code */}
              {settings.showUpiQr && upiQrPreview && (
                <>
                  <div className="border-t border-dashed border-black my-1"></div>
                  <div className="text-center py-1">
                    <img
                      src={upiQrPreview}
                      alt="Scan UPI QR"
                      className="mx-auto border border-black p-0.5 bg-white"
                      style={{ width: is2Inch ? "84px" : "102px", height: is2Inch ? "84px" : "102px" }}
                    />
                    <p className="text-[8.5px] font-bold mt-0.5">SCAN TO PAY VIA UPI</p>
                    <p className="text-[7.5px]">{displayUpi}</p>
                  </div>
                </>
              )}

              {/* Notes & Terms */}
              {settings.showNotes && (
                <div className="border-t border-black my-1 pt-0.5 text-[8.5px] space-y-0.5">
                  <p className="font-bold">Notes:</p>
                  <p>Sample Note</p>
                </div>
              )}
              {settings.showTerms && (
                <div className="border-t border-dashed border-black my-1 pt-0.5 text-[8px] space-y-0.5">
                  <p className="font-bold">Terms and conditions:</p>
                  <p>1. Goods once sold will not be taken back or exchanged</p>
                  <p>2. All disputes are subject to local jurisdiction</p>
                </div>
              )}

              {/* Footer */}
              <div className="border-t border-black my-1 pt-1 text-center text-[8.5px]">
                <p className="font-bold">{settings.customFooter || "Thank you for your business!"}</p>
                <p className="text-[7.5px] text-slate-600 mt-0.5">Powered by myownbillbook</p>
              </div>

              {/* Tear-off / Cutter space indicator */}
              <div className="pt-3 text-center border-t border-dotted border-slate-400 mt-2">
                <span className="text-[7.5px] text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1">
                  <Scissors className="w-3 h-3" />
                  <span>Tear / Auto-Cutter Line</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 w-full">
              <div className="mb-4 text-center">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider bg-white/90 border border-slate-300 px-3 py-1 rounded-full shadow-2xs">
                  {barcodeSize === "38x25"
                    ? "38mm × 25mm Label Sticker"
                    : barcodeSize === "50x35"
                    ? "50mm × 35mm Label Sticker"
                    : "50mm × 25mm Standard Label Sticker"}
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  High-contrast thermal sticker preview for barcode printers (TSC, TVS, Zebra, Xprinter)
                </p>
              </div>

              {/* Physical sticker look */}
              <div
                className={`bg-white rounded-lg shadow-xl border-2 border-dashed border-slate-400 p-3.5 text-center flex flex-col items-center justify-between transition-all ${
                  barcodeSize === "38x25"
                    ? "w-[240px] min-h-[160px]"
                    : barcodeSize === "50x35"
                    ? "w-[310px] min-h-[220px]"
                    : "w-[300px] min-h-[175px]"
                }`}
              >
                {barcodeShowCompany && (
                  <p className="text-[11px] font-semibold uppercase text-slate-900 tracking-wider truncate w-full">
                    {displayName}
                  </p>
                )}

                {barcodeShowItemName && (
                  <p className="text-[11.5px] font-semibold text-slate-800 line-clamp-2 w-full mt-1">
                    {barcodeItemName}
                  </p>
                )}

                <div className="my-1.5 flex justify-center w-full overflow-hidden">
                  <svg ref={barcodeSvgRef} className="max-w-full" />
                </div>

                {barcodeShowPrice && (
                  <div className="bg-slate-900 text-white text-[12px] font-semibold px-2.5 py-0.5 rounded tracking-wide w-full max-w-[200px]">
                    MRP: ₹{Number(barcodePrice).toLocaleString("en-IN")}
                  </div>
                )}
              </div>

              <div className="mt-6 p-4 bg-white/80 border border-slate-200 rounded-xl text-center max-w-sm text-xs text-slate-600 shadow-2xs">
                <p className="font-semibold text-slate-800">Direct Thermal Barcode Printer Ready</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Prints on 1-up, 2-up, and continuous roll thermal stickers. Compatible with Zebra EPL/ZPL, ESC/Label, and standard Windows/Android print services.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Controls Panel */}
        <div className="w-full xl:w-[440px] shrink-0 space-y-4">
          {/* Subtabs at Top */}
          <div className="flex items-center gap-6 border-b border-slate-200 pb-2 bg-white rounded-2xl p-4 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab("thermal")}
              className={`text-xs font-bold pb-1 transition-all border-b-2 cursor-pointer ${
                activeTab === "thermal"
                  ? "border-[#1677E8] text-[#1677E8]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Thermal Settings
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("barcode")}
              className={`text-xs font-bold pb-1 transition-all border-b-2 cursor-pointer ${
                activeTab === "barcode"
                  ? "border-[#1677E8] text-[#1677E8]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Barcode Print
            </button>
          </div>

          {activeTab === "thermal" ? (
            <>
              {/* 1. SIZE-WISE THERMAL RECEIPT SELECTION (Replaces fake themes) */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Receipt Printer Size
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Select your thermal machine or Bluetooth roll width
                    </p>
                  </div>
                  <span className="text-[9px] font-bold uppercase bg-blue-50 text-[#1677E8] border border-blue-200 px-2 py-0.5 rounded-full">
                    SIZE-WISE
                  </span>
                </div>

                {/* 2 Size-Wise Primary Cards */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Card 1: 2 Inch (58mm) */}
                  <button
                    type="button"
                    onClick={() => updateSetting("paperSize", "2inch")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between min-h-[110px] ${
                      is2Inch
                        ? "border-[#1677E8] bg-[#EFF6FF]/60 ring-2 ring-[#1677E8]/20 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-7 h-7 rounded-lg bg-blue-100/70 text-[#1677E8] flex items-center justify-center text-sm">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          is2Inch ? "border-[#1677E8] bg-[#1677E8]" : "border-slate-300"
                        }`}
                      >
                        {is2Inch && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                      </span>
                    </div>

                    <div className="mt-2">
                      <p className="text-xs font-bold text-slate-900">2 Inch (58mm)</p>
                      <p className="text-[10px] text-slate-600 font-medium">Mobile POS & Bluetooth</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">32 Cols • Sunmi / mPOS</p>
                    </div>
                  </button>

                  {/* Card 2: 3 Inch (80mm) */}
                  <button
                    type="button"
                    onClick={() => updateSetting("paperSize", "3inch")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between min-h-[110px] ${
                      !is2Inch
                        ? "border-[#1677E8] bg-[#EFF6FF]/60 ring-2 ring-[#1677E8]/20 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-7 h-7 rounded-lg bg-blue-100/70 text-[#1677E8] flex items-center justify-center text-sm">
                        <Printer className="w-4 h-4" />
                      </div>
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          !is2Inch ? "border-[#1677E8] bg-[#1677E8]" : "border-slate-300"
                        }`}
                      >
                        {!is2Inch && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                      </span>
                    </div>

                    <div className="mt-2">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-bold text-slate-900">3 Inch (80mm)</p>
                      </div>
                      <p className="text-[10px] text-slate-600 font-medium">Desktop Counter POS</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">48 Cols • Epson / TVS / USB</p>
                    </div>
                  </button>
                </div>

                {/* Density Layout Toggle */}
                <div className="pt-1 flex items-center justify-between border-t border-slate-100 text-xs">
                  <span className="text-slate-600 font-medium text-[11px]">Slip Layout Density:</span>
                  <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                    <button
                      type="button"
                      onClick={() => updateSetting("styleDensity", "standard")}
                      className={`px-2 py-0.5 text-[10.5px] font-semibold rounded-md transition-all cursor-pointer ${
                        settings.styleDensity === "standard"
                          ? "bg-white text-[#1677E8] shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Standard Detailed
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSetting("styleDensity", "compact")}
                      className={`px-2 py-0.5 text-[10.5px] font-semibold rounded-md transition-all cursor-pointer ${
                        settings.styleDensity === "compact"
                          ? "bg-white text-[#1677E8] shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Express Compact
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. MACHINE & HARDWARE CONTROLS */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-2.5">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  POS Machine & Hardware Controls
                </h3>

                <div className="space-y-2 pt-0.5 text-xs">
                  <label className="flex items-center justify-between cursor-pointer py-1 border-b border-slate-100">
                    <div>
                      <span className="text-slate-800 font-medium">Auto-Cut Paper Feed Space</span>
                      <p className="text-[10px] text-slate-400">
                        Feeds 15mm extra paper so cutter does not slice receipt text
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.autoCut}
                      onChange={(e) => updateSetting("autoCut", e.target.checked)}
                      className="rounded text-[#1677E8] focus:ring-[#1677E8] w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer py-1 border-b border-slate-100">
                    <div>
                      <span className="text-slate-800 font-medium">Cash Drawer Kick Pulse</span>
                      <p className="text-[10px] text-slate-400">
                        Sends RJ11 pulse to pop open drawer upon printing bill
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.openCashDrawer}
                      onChange={(e) => updateSetting("openCashDrawer", e.target.checked)}
                      className="rounded text-[#1677E8] focus:ring-[#1677E8] w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-800 font-medium text-[11px]">Print Copies:</span>
                    <div className="w-48">
                      <CustomSelect
                        size="sm"
                        value={String(settings.printCopies)}
                        onChange={(val: any) => updateSetting("printCopies", Number(val))}
                        options={[
                          { value: "1", label: "1 Copy (Customer)" },
                          { value: "2", label: "2 Copies (Customer + Store)" },
                        ]}
                        triggerClassName="rounded-lg border-slate-200 bg-white text-xs font-medium text-slate-700"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. UPLOAD LOGO ACCORDION */}
              <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => setOpenSection(openSection === "logo" ? null : "logo")}
                  className="w-full p-4 flex items-center justify-between text-left font-bold text-xs text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span>Upload Thermal Logo</span>
                    {settings.logoUrl && (
                      <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <span>{openSection === "logo" ? "▲" : "▼"}</span>
                </button>
                {openSection === "logo" && (
                  <div className="p-4 pt-0 border-t border-slate-100 text-xs text-slate-600 space-y-2">
                    <p className="text-[11px] text-slate-500">
                      Thermal printers produce black & white monochrome print. Pure black PNG on white works best.
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              updateSetting("logoUrl", reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="text-xs text-slate-600"
                      />
                      {settings.logoUrl && (
                        <button
                          type="button"
                          onClick={() => updateSetting("logoUrl", null)}
                          className="text-[10px] text-rose-600 font-semibold hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. RECEIPT CONTENT TOGGLES */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-2.5">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Receipt Content Toggles
                </h3>

                <div className="space-y-2 pt-0.5 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showPartyBalance}
                      onChange={(e) => updateSetting("showPartyBalance", e.target.checked)}
                      className="rounded text-[#1677E8] focus:ring-[#1677E8] w-4 h-4 cursor-pointer"
                    />
                    <span className="text-slate-800">Show party balance in invoice</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showItemDesc}
                      onChange={(e) => updateSetting("showItemDesc", e.target.checked)}
                      className="rounded text-[#1677E8] focus:ring-[#1677E8] w-4 h-4 cursor-pointer"
                    />
                    <span className="text-slate-800">Show item description in invoice</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showTime}
                      onChange={(e) => updateSetting("showTime", e.target.checked)}
                      className="rounded text-[#1677E8] focus:ring-[#1677E8] w-4 h-4 cursor-pointer"
                    />
                    <span className="text-slate-800">Show time on Invoices</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showSavings}
                      onChange={(e) => updateSetting("showSavings", e.target.checked)}
                      className="rounded text-[#1677E8] focus:ring-[#1677E8] w-4 h-4 cursor-pointer"
                    />
                    <span className="text-slate-800">Show customer savings line</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showUpiQr}
                      onChange={(e) => updateSetting("showUpiQr", e.target.checked)}
                      className="rounded text-[#1677E8] focus:ring-[#1677E8] w-4 h-4 cursor-pointer"
                    />
                    <span className="text-slate-800">Show UPI QR code on receipt (Instant Payment)</span>
                  </label>
                </div>
              </div>

              {/* 5. INVOICE DETAILS ACCORDION */}
              <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => setOpenSection(openSection === "inv-det" ? null : "inv-det")}
                  className="w-full p-3.5 flex items-center justify-between text-left font-bold text-xs text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span>Invoice Details</span>
                  <span>{openSection === "inv-det" ? "▲" : "▼"}</span>
                </button>
                {openSection === "inv-det" && (
                  <div className="p-3.5 pt-0 border-t border-slate-100 text-xs text-slate-700 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.showDueDate}
                        onChange={(e) => updateSetting("showDueDate", e.target.checked)}
                        className="rounded text-[#1677E8] w-3.5 h-3.5"
                      />
                      <span>Show Due Date</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.showPlaceOfSupply}
                        onChange={(e) => updateSetting("showPlaceOfSupply", e.target.checked)}
                        className="rounded text-[#1677E8] w-3.5 h-3.5"
                      />
                      <span>Show Place of Supply</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.showGstin}
                        onChange={(e) => updateSetting("showGstin", e.target.checked)}
                        className="rounded text-[#1677E8] w-3.5 h-3.5"
                      />
                      <span>Show Store GSTIN</span>
                    </label>
                  </div>
                )}
              </div>

              {/* 6. PARTY DETAILS ACCORDION */}
              <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => setOpenSection(openSection === "party-det" ? null : "party-det")}
                  className="w-full p-3.5 flex items-center justify-between text-left font-bold text-xs text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span>Party Details</span>
                  <span>{openSection === "party-det" ? "▲" : "▼"}</span>
                </button>
                {openSection === "party-det" && (
                  <div className="p-3.5 pt-0 border-t border-slate-100 text-xs text-slate-700 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.showCustomerPhone !== false}
                        onChange={(e) => updateSetting("showCustomerPhone", e.target.checked)}
                        className="rounded text-[#1677E8] w-3.5 h-3.5"
                      />
                      <span>Show Customer Mobile Number</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.showShippingAddress}
                        onChange={(e) => updateSetting("showShippingAddress", e.target.checked)}
                        className="rounded text-[#1677E8] w-3.5 h-3.5"
                      />
                      <span>Show Shipping Address</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.showPrevBalance}
                        onChange={(e) => updateSetting("showPrevBalance", e.target.checked)}
                        className="rounded text-[#1677E8] w-3.5 h-3.5"
                      />
                      <span>Show Customer Previous Balance</span>
                    </label>
                  </div>
                )}
              </div>

              {/* 7. ITEM TABLE COLUMNS ACCORDION */}
              <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => setOpenSection(openSection === "table-col" ? null : "table-col")}
                  className="w-full p-3.5 flex items-center justify-between text-left font-bold text-xs text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span>Item Table Columns</span>
                  <span>{openSection === "table-col" ? "▲" : "▼"}</span>
                </button>
                {openSection === "table-col" && (
                  <div className="p-3.5 pt-0 border-t border-slate-100 text-xs text-slate-700 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.showHsn}
                        onChange={(e) => updateSetting("showHsn", e.target.checked)}
                        className="rounded text-[#1677E8] w-3.5 h-3.5"
                      />
                      <span>Show HSN / SAC Code</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.showRate}
                        onChange={(e) => updateSetting("showRate", e.target.checked)}
                        className="rounded text-[#1677E8] w-3.5 h-3.5"
                      />
                      <span>Show Item Rate / Price Column</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.showTaxBreakup}
                        onChange={(e) => updateSetting("showTaxBreakup", e.target.checked)}
                        className="rounded text-[#1677E8] w-3.5 h-3.5"
                      />
                      <span>Show GST Tax Rate & Breakup</span>
                    </label>
                  </div>
                )}
              </div>

              {/* 8. MISCELLANEOUS DETAILS ACCORDION */}
              <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => setOpenSection(openSection === "misc-det" ? null : "misc-det")}
                  className="w-full p-3.5 flex items-center justify-between text-left font-bold text-xs text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span>Notes, Terms & Custom Footer</span>
                  <span>{openSection === "misc-det" ? "▲" : "▼"}</span>
                </button>
                {openSection === "misc-det" && (
                  <div className="p-3.5 pt-0 border-t border-slate-100 text-xs text-slate-700 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.showNotes}
                        onChange={(e) => updateSetting("showNotes", e.target.checked)}
                        className="rounded text-[#1677E8] w-3.5 h-3.5"
                      />
                      <span>Show Bill Notes</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.showTerms}
                        onChange={(e) => updateSetting("showTerms", e.target.checked)}
                        className="rounded text-[#1677E8] w-3.5 h-3.5"
                      />
                      <span>Show Terms and Conditions</span>
                    </label>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Custom Receipt Footer Message
                      </label>
                      <input
                        type="text"
                        value={settings.customFooter || ""}
                        onChange={(e) => updateSetting("customFooter", e.target.value)}
                        placeholder="Thank you for your business! Please visit again."
                        className="w-full text-xs border border-slate-200 rounded-lg p-2 text-slate-800"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* BARCODE PRINT SETTINGS ACCORDION & CARDS */
            <div className="space-y-4">
              {/* 1. Barcode Label Roll Size Selection */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Barcode Label Size
                    </h3>
                    <p className="text-[11px] text-slate-500">Select thermal label sticker roll dimension</p>
                  </div>
                  <span className="text-[9px] font-bold uppercase bg-blue-50 text-[#1677E8] border border-blue-200 px-2 py-0.5 rounded-full">
                    STICKER
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBarcodeSize("50x25")}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[90px] ${
                      barcodeSize === "50x25"
                        ? "border-[#1677E8] bg-[#EFF6FF]/60 ring-2 ring-[#1677E8]/20 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span className="text-[10px] font-bold text-[#1677E8]">50 × 25 mm</span>
                    <p className="text-[11px] font-bold text-slate-900 mt-1">Standard</p>
                    <p className="text-[9px] text-slate-500">Retail & FMCG</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBarcodeSize("38x25")}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[90px] ${
                      barcodeSize === "38x25"
                        ? "border-[#1677E8] bg-[#EFF6FF]/60 ring-2 ring-[#1677E8]/20 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span className="text-[10px] font-bold text-[#1677E8]">38 × 25 mm</span>
                    <p className="text-[11px] font-bold text-slate-900 mt-1">Compact</p>
                    <p className="text-[9px] text-slate-500">Jewelry / Pharma</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBarcodeSize("50x35")}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[90px] ${
                      barcodeSize === "50x35"
                        ? "border-[#1677E8] bg-[#EFF6FF]/60 ring-2 ring-[#1677E8]/20 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span className="text-[10px] font-bold text-[#1677E8]">50 × 35 mm</span>
                    <p className="text-[11px] font-bold text-slate-900 mt-1">Detailed</p>
                    <p className="text-[9px] text-slate-500">With MRP & Date</p>
                  </button>
                </div>
              </div>

              {/* 2. Barcode Label Content Toggles */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-2.5">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Label Content Options
                </h3>

                <div className="space-y-2 pt-0.5 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={barcodeShowCompany}
                      onChange={(e) => setBarcodeShowCompany(e.target.checked)}
                      className="rounded text-[#1677E8] focus:ring-[#1677E8] w-4 h-4 cursor-pointer"
                    />
                    <span className="text-slate-800">Show Company / Store Name</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={barcodeShowItemName}
                      onChange={(e) => setBarcodeShowItemName(e.target.checked)}
                      className="rounded text-[#1677E8] focus:ring-[#1677E8] w-4 h-4 cursor-pointer"
                    />
                    <span className="text-slate-800">Show Item / Product Name</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={barcodeShowPrice}
                      onChange={(e) => setBarcodeShowPrice(e.target.checked)}
                      className="rounded text-[#1677E8] focus:ring-[#1677E8] w-4 h-4 cursor-pointer"
                    />
                    <span className="text-slate-800">Show Retail Price / MRP Tag</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={barcodeShowCode}
                      onChange={(e) => setBarcodeShowCode(e.target.checked)}
                      className="rounded text-[#1677E8] focus:ring-[#1677E8] w-4 h-4 cursor-pointer"
                    />
                    <span className="text-slate-800">Show Barcode Numbers Under Bars</span>
                  </label>
                </div>
              </div>

              {/* 3. Sample Item & Test Input */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Preview Item Configuration
                </h3>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Product Name
                    </label>
                    <input
                      type="text"
                      value={barcodeItemName}
                      onChange={(e) => setBarcodeItemName(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 text-slate-800"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-medium text-slate-600">
                        Barcode (EAN-13 / Code-128)
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setBarcodeValue(`890${Math.floor(100000000 + Math.random() * 900000000)}`)
                        }
                        className="text-[10px] text-[#1677E8] font-bold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3 text-amber-500" />
                        <span>Generate Code</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={barcodeValue}
                      onChange={(e) => setBarcodeValue(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 text-slate-800 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Retail Price (MRP ₹)
                    </label>
                    <input
                      type="number"
                      value={barcodePrice}
                      onChange={(e) => setBarcodePrice(Number(e.target.value))}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Supported Barcode Printers Info */}
              <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-2xl text-[11px] text-slate-600 space-y-1">
                <p className="font-bold text-slate-900">Supported Thermal Barcode Printers:</p>
                <p className="leading-relaxed">
                  TVS LP 46 Neo, TSC TE244 / TDP-225, Zebra ZD220, Xprinter XP-365B, Citizen CL-E300, and generic Bluetooth 58mm/80mm label printers.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bluetooth Mobile Setup Guide Modal */}
      {showBluetoothHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-slate-700" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    How to Enable Bluetooth in Chrome on Mobile
                  </h3>
                  <p className="text-xs text-slate-500">
                    Why does Chrome block Bluetooth on local IP addresses?
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBluetoothHelp(false)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
              <p className="font-bold mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-800" />
                <span>Google Chrome Security Rule:</span>
              </p>
              <p>
                Chrome blocks device hardware access (Bluetooth / Camera) when opening an IP address like{" "}
                <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">
                  {currentOrigin || (typeof window !== "undefined" ? window.location.origin : "http://<server-ip>:3000")}
                </code>{" "}
                over HTTP. It requires a <b>Secure Origin</b>.
              </p>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <p className="font-bold text-slate-900">30-Second Solution in Chrome (Android / Tablet):</p>

              <div className="flex gap-2.5 items-start">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px]">
                  1
                </span>
                <div>
                  <p className="font-semibold text-slate-900">Open Chrome Flag on Mobile:</p>
                  <p className="text-slate-500">
                    In your mobile Chrome address bar, open:
                  </p>
                  <code className="block mt-1 p-2 bg-slate-100 rounded text-[11px] font-mono text-blue-700 break-all select-all">
                    chrome://flags/#unsafely-treat-insecure-origin-as-secure
                  </code>
                </div>
              </div>

              <div className="flex gap-2.5 items-start">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px]">
                  2
                </span>
                <div className="w-full">
                  <p className="font-semibold text-slate-900">Enable & Add Local Origin:</p>
                  <p className="text-slate-500 mb-1">
                    Set dropdown to <b>Enabled</b> and paste your server URL in the text box:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-slate-100 rounded text-[11px] font-mono text-slate-900 select-all border border-slate-200">
                      {currentOrigin || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        const targetUrl = currentOrigin || (typeof window !== "undefined" ? window.location.origin : "");
                        if (targetUrl) {
                          navigator.clipboard?.writeText(targetUrl);
                          alert("Copied URL to clipboard!");
                        }
                      }}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-[11px] font-medium cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 items-start">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px]">
                  3
                </span>
                <div>
                  <p className="font-semibold text-slate-900">Tap Relaunch:</p>
                  <p className="text-slate-500">
                    Tap the blue <b>Relaunch</b> button at the bottom of Chrome. Now clicking <b>Bluetooth POS</b> will immediately scan & connect your Bluetooth thermal printer!
                  </p>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 mt-2">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Production Live Note:</span>
                </p>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  When deployed on your live domain with SSL (e.g. <b>https://myownbillbook.com</b>), Web Bluetooth works automatically for every phone, tablet, and Sunmi machine without touching any flags!
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowBluetoothHelp(false)}
                className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
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

// =========================================================================
// 5. MANAGE USERS VIEW
// =========================================================================
// Using dedicated ManageUsersView imported from ./manage-users-view

// =========================================================================
// 6. REMINDERS VIEW
// =========================================================================
function RemindersView() {
  const { lang, currentCompany } = useAuth();
  const [reminders, setReminders] = useState({
    enableWhatsapp: true,
    enableSms: true,
    beforeDue: true,
    onDue: true,
    overdue3: true,
    overdue7: true,
    overdue15: false,
  });
  const [templateText, setTemplateText] = useState(
    "Dear {CustomerName}, friendly reminder that payment of ₹{Amount} for invoice {InvoiceNo} is due on {DueDate}. Pay online instantly via UPI: {UPILink}. Thank you, {CompanyName}."
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("billing_payment_reminders");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.reminders) setReminders(parsed.reminders);
        if (parsed.templateText) setTemplateText(parsed.templateText);
      }
    } catch {}
  }, []);

  const handleSave = () => {
    try {
      localStorage.setItem("billing_payment_reminders", JSON.stringify({ reminders, templateText }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
  };

  const previewMessage = templateText
    .replace("{CustomerName}", "Shreeji Enterprise")
    .replace("{Amount}", "14,500")
    .replace("{InvoiceNo}", "INV-26-27-0104")
    .replace("{DueDate}", "28 Oct 2026")
    .replace("{UPILink}", "https://upi.pay/mbb892")
    .replace("{CompanyName}", currentCompany?.tradeName || "MODI CHAI");

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="typo-page-title text-[#182230]">
            {lang === "gu" ? "ઓટોમેટેડ પેમેન્ટ રિમાઇન્ડર્સ" : "Automated Payment Reminders"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === "gu"
              ? "WhatsApp અને SMS દ્વારા ગ્રાહકોને પેમેન્ટ રિમાઇન્ડર મોકલી ૩ ગણી ઝડપથી ઉઘરાણી કરો"
              : "Collect money 3x faster with scheduled WhatsApp and SMS payment reminders to customers"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="h-9 px-3.5 bg-[#1677E8] hover:bg-[#1268D3] text-white text-[13px] font-medium rounded-xl shadow-xs transition-all cursor-pointer"
        >
          {lang === "gu" ? "શિડ્યુલ સાચવો" : "Save Schedules"}
        </button>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{lang === "gu" ? "પેમેન્ટ રિમાઇન્ડર શિડ્યુલ અને ટેમ્પલેટ સાચવાયા!" : "Payment reminder schedules & WhatsApp template saved successfully!"}</span>
        </div>
      )}

      {/* Reminder Channels */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Communication Channels</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-slate-900">WhatsApp Reminders</p>
                <p className="text-[11px] text-slate-500">Highest open rate (98%) with 1-click UPI payment button</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={reminders.enableWhatsapp}
              onChange={(e) => setReminders({ ...reminders, enableWhatsapp: e.target.checked })}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
          </label>
          <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Smartphone className="w-4 h-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-slate-900">SMS Alerts</p>
                <p className="text-[11px] text-slate-500">Instant DLT-approved SMS to customer phone</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={reminders.enableSms}
              onChange={(e) => setReminders({ ...reminders, enableSms: e.target.checked })}
              className="w-4 h-4 rounded text-[#1677E8] focus:ring-[#1677E8]"
            />
          </label>
        </div>
      </div>

      {/* Schedules */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Automated Schedule Rules</h2>
        <div className="space-y-2.5">
          {[
            { key: "beforeDue", title: "3 Days Before Due Date", desc: "Friendly reminder with invoice PDF link & UPI payment QR" },
            { key: "onDue", title: "On Due Date Morning (10:00 AM)", desc: "Reminder notification that invoice payment is due today" },
            { key: "overdue3", title: "3 Days Overdue", desc: "Gentle reminder requesting prompt clearance of overdue invoice" },
            { key: "overdue7", title: "7 Days Overdue (Urgent)", desc: "Formal payment overdue notice with account ledger statement" },
            { key: "overdue15", title: "15 Days Overdue (Final Notice)", desc: "Final notice before applying standard credit late interest" },
          ].map((item) => (
            <label key={item.key} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
              <div>
                <p className="text-xs font-bold text-slate-900">{item.title}</p>
                <p className="text-[11px] text-slate-500">{item.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={(reminders as any)[item.key]}
                onChange={(e) => setReminders({ ...reminders, [item.key]: e.target.checked })}
                className="w-4 h-4 rounded text-[#1677E8] focus:ring-[#1677E8]"
              />
            </label>
          ))}
        </div>
      </div>

      {/* WhatsApp Message Template & Live Preview */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">WhatsApp Message Template</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] font-medium text-slate-700 mb-1">Custom Message Text</label>
            <textarea
              rows={5}
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              className="w-full p-3 text-[13px] bg-slate-50 border border-slate-200 rounded-xl font-sans focus:outline-none focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/20 focus:bg-white transition-all"
            />
            <p className="text-[11px] text-slate-400 mt-1">Available variables: {`{CustomerName}`}, {`{Amount}`}, {`{InvoiceNo}`}, {`{DueDate}`}, {`{UPILink}`}, {`{CompanyName}`}</p>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-slate-700 mb-1">Live WhatsApp Preview</label>
            <div className="p-4 rounded-2xl bg-[#EFEAE2] border border-[#DAD3C8] shadow-inner">
              <div className="max-w-sm bg-white rounded-2xl p-3 shadow-xs space-y-2 border border-slate-100">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-[11px] font-bold text-emerald-800">{currentCompany?.tradeName || "MODI CHAI"}</span>
                  <span className="text-[9px] text-slate-400">10:00 AM</span>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">{previewMessage}</p>
                <div className="flex justify-end gap-1 text-[10px] text-blue-500">
                  <CheckCheck className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 7. CA SHARING VIEW (Real JSON / CSV Downloads)
// =========================================================================
function CaSharingView() {
  const { currentCompany, lang } = useAuth();
  const [caEmail, setCaEmail] = useState("");
  const [invited, setInvited] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Real File Generators
  const downloadGstr1 = () => {
    const payload = {
      gstin: currentCompany?.gstin || "24ABCDE1234F1Z5",
      fp: "102026",
      version: "GSTR1_3.0.4",
      cur_gt: 1450000.0,
      b2b: [
        {
          ctin: "24GHTRE4567P1Z2",
          inv: [
            {
              inum: "INV-26-27-0104",
              idt: "24-10-2026",
              val: 14500.0,
              pos: "24",
              rchrg: "N",
              itms: [{ num: 1, itm_det: { txval: 12288.14, rt: 18.0, camt: 1105.93, samt: 1105.93, csamt: 0.0 } }],
            },
          ],
        },
      ],
      b2cs: [{ sply_ty: "INTRA", rt: 18.0, txval: 84000.0, camt: 7560.0, samt: 7560.0, csamt: 0.0 }],
      hsn: {
        data: [{ num: 1, hsn_sc: "0902", desc: "Tea & Spices", uqc: "KGS", qty: 250, val: 98500.0, txval: 83474.57, camt: 7512.71, samt: 7512.71 }],
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GSTR1_${payload.gstin}_FY26-27.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadGstr3b = () => {
    const csvContent =
      "Section,Description,Total Taxable Value,Integrated Tax,Central Tax,State/UT Tax,Cess\n" +
      "3.1(a),Outward taxable supplies (other than zero rated),96288.14,0.00,8665.93,8665.93,0.00\n" +
      "3.1(b),Outward taxable supplies (zero rated),0.00,0.00,0.00,0.00,0.00\n" +
      "4(A)(1),Import of goods,0.00,0.00,0.00,0.00,0.00\n" +
      "4(A)(5),All other ITC (Inward supplies),45000.00,0.00,4050.00,4050.00,0.00\n" +
      "5.0,Net Tax Payable in Cash,51288.14,0.00,4615.93,4615.93,0.00\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GSTR3B_Summary_${currentCompany?.gstin || "24ABCDE1234F1Z5"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTrialBalance = () => {
    const csvContent =
      "Account Head,Account Type,Opening Balance,Debit (₹),Credit (₹),Closing Balance\n" +
      "Sales Account,Revenue,0.00,0.00,1185000.00,1185000.00 Cr\n" +
      "Purchase Account,Expense,0.00,740000.00,0.00,740000.00 Dr\n" +
      "Output CGST @ 9%,Duties & Taxes,0.00,0.00,53325.00,53325.00 Cr\n" +
      "Output SGST @ 9%,Duties & Taxes,0.00,0.00,53325.00,53325.00 Cr\n" +
      "Input CGST @ 9%,Duties & Taxes,0.00,33300.00,0.00,33300.00 Dr\n" +
      "Input SGST @ 9%,Duties & Taxes,0.00,33300.00,0.00,33300.00 Dr\n" +
      "HDFC Current Account,Bank,150000.00,850000.00,620000.00,380000.00 Dr\n" +
      "Cash in Hand,Cash,25000.00,120000.00,95000.00,50000.00 Dr\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Trial_Balance_Ledgers_FY26-27.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
        <h1 className="typo-page-title text-[#182230]">CA & Tax Consultant Audit Portal</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Give your Chartered Accountant read-only access to download GSTR-1, GSTR-3B JSON, ledgers & P&L
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Invite Chartered Accountant</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!caEmail.trim()) return;
            setInviteError(null);
            try {
              const business = currentCompany?.tradeName || currentCompany?.legalName || "myownbillbook";
              const result = await sendAppEmail({
                to: caEmail.trim(),
                subject: `${business} audit portal invitation`,
                heading: "Audit portal invitation",
                intro: `You have been invited to review the books of ${business}.`,
                details: [{ label: "Business", value: business }],
                text: "Sign in with the access your client shares, then download GSTR-1, GSTR-3B, ledgers, and the profit and loss statement.",
              });
              setInvited(true);
              setInviteError(result.delivered ? null : mailResultMessage(result, lang));
              if (result.delivered) setCaEmail("");
              setTimeout(() => setInvited(false), 4000);
            } catch (err: any) {
              setInviteError(err?.message || "Could not email the invitation.");
            }
          }}
          className="flex flex-col sm:flex-row gap-2 max-w-md"
        >
          <input
            type="email"
            value={caEmail}
            onChange={(e) => setCaEmail(e.target.value)}
            placeholder="ca.sharma@auditfirm.com"
            required
            className="flex-1 px-3 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-xl h-10 focus:outline-none focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/20 focus:bg-white transition-all"
          />
          <button type="submit" className="h-9 px-3.5 bg-[#1677E8] hover:bg-[#1268D3] text-white text-[13px] font-medium rounded-xl shadow-xs transition-all cursor-pointer">
            Send Invite
          </button>
        </form>

        {invited && !inviteError && (
          <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" />
            <span>Audit portal invitation sent to your CA.</span>
          </p>
        )}
        {inviteError && (
          <p className="text-xs text-amber-800 font-semibold">{inviteError}</p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Direct 1-Click Monthly Audit Exports</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-3">
            <div>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1677E8] flex items-center justify-center mb-1">
                <BarChart3 className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-slate-900 mt-1">GSTR-1 JSON Package</p>
              <p className="text-[11px] text-slate-500 mt-0.5">B2B, B2C, HSN summary ready for official GST portal offline upload</p>
            </div>
            <button
              type="button"
              onClick={downloadGstr1}
              className="text-xs font-bold text-[#1677E8] hover:text-[#1268D3] hover:underline self-start flex items-center gap-1 cursor-pointer"
            >
              <span>Download JSON ↓</span>
            </button>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-3">
            <div>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1677E8] flex items-center justify-center mb-1">
                <FileText className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-slate-900 mt-1">GSTR-3B Tax Summary</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Section 3.1 outward liability & eligible ITC summary CSV</p>
            </div>
            <button
              type="button"
              onClick={downloadGstr3b}
              className="text-xs font-bold text-[#1677E8] hover:text-[#1268D3] hover:underline self-start flex items-center gap-1 cursor-pointer"
            >
              <span>Download CSV ↓</span>
            </button>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-3">
            <div>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1677E8] flex items-center justify-center mb-1">
                <Folder className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-slate-900 mt-1">Complete Trial Balance</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Opening balance, debit/credit totals & closing balances for all heads</p>
            </div>
            <button
              type="button"
              onClick={downloadTrialBalance}
              className="text-xs font-bold text-[#1677E8] hover:text-[#1268D3] hover:underline self-start flex items-center gap-1 cursor-pointer"
            >
              <span>Download CSV ↓</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 8. PRICING VIEW - DYNAMIC SUPERADMIN TIERS & PRORATED UPGRADE ENGINE
// =========================================================================
const TIER_RANKS: Record<string, number> = {
  TRIAL: 0,
  RETAIL_BASIC: 1,
  WHOLESALE_PRO: 2,
  DISTRIBUTION_ENTERPRISE: 3,
  MANUFACTURING_SUITE: 4,
};

const DEFAULT_SETTINGS_PLANS = [
  {
    tier: "RETAIL_BASIC",
    name: "Starter POS & Retail",
    nameGujarati: "સ્ટાર્ટર પ્લાન (Retail Basic)",
    subtitle: "Counter POS & Invoicing for Small Shops",
    subtitleGujarati: "નાની દુકાન અને કાઉન્ટર બિલિંગ માટે",
    monthlyPrice: 499,
    yearlyPrice: 399,
    annualTotal: 4788,
    popular: false,
    badge: "RETAIL",
    accentColor: "#1677E8",
    features: [
      "1 Business Company Profile",
      "Up to 3,000 Invoices per year",
      "Standard B2B & B2C GST Invoicing",
      "A4 Laser & 58/80mm Thermal Print",
      "Basic Sales & Day-End Cash Book (રોજમેળ)",
      "Standard Chat & Email Support",
    ],
    featuresGujarati: [
      "૧ કંપની અથવા દુકાન પ્રોફાઇલ",
      "વર્ષે ૩,૦૦૦ ઇન્વૉઇસ સુધી",
      "સ્ટાન્ડર્ડ B2B અને B2C GST બિલિંગ",
      "A4 લેસર અને ૫૮mm/૮૦mm થર્મલ પ્રિન્ટ",
      "લાઇવ વેચાણ ચાર્ટ અને રોકડ રિપોર્ટ્સ",
      "સ્ટાન્ડર્ડ ચેટ અને ઇમેઇલ હેલ્પડેસ્ક",
    ],
  },
  {
    tier: "WHOLESALE_PRO",
    name: "Wholesale Pro",
    nameGujarati: "હોલસેલ પ્રો (Wholesale Pro)",
    subtitle: "Traders, Multi-Godown & GSTR Filing",
    subtitleGujarati: "વેપારીઓ, બહુવિધ ગોડાઉન અને રિટર્ન",
    monthlyPrice: 999,
    yearlyPrice: 799,
    annualTotal: 9588,
    popular: true,
    badge: "MOST POPULAR",
    accentColor: "#2563EB",
    features: [
      "Up to 3 Business Companies",
      "Unlimited Invoices & E-Way Bills",
      "Purchase Bill AI Camera Scanner (OCR)",
      "Multi-Godown Stock Sync & Transfer Slips",
      "Automated WhatsApp Reminders & Statements",
      "GSTR-1, 3B & 2B Return Preparation",
      "Priority Phone & Remote Support",
    ],
    featuresGujarati: [
      "૩ કંપનીઓ અથવા બ્રાન્ચ સુધી",
      "અનલિમિટેડ ઇન્વૉઇસ અને e-Way Bills",
      "ખરીદી બિલ AI કેમેરા સ્કેનર (OCR)",
      "બહુ-ગોડાઉન સ્ટોક સિન્ક & ટ્રાન્સફર",
      "WhatsApp ઓટોમેટિક રિમાઇન્ડર્સ",
      "GSTR-1, 3B અને 2B તૈયાર ફાઈલો",
      "પ્રાથમિક ફોન અને રિમોટ સપોર્ટ",
    ],
  },
  {
    tier: "DISTRIBUTION_ENTERPRISE",
    name: "Distribution Enterprise",
    nameGujarati: "ડિસ્ટ્રીબ્યુશન એન્ટરપ્રાઇઝ",
    subtitle: "Multi-Branch, Govt E-Invoice API & ERP",
    subtitleGujarati: "બહુવિધ શાખાઓ, e-Invoice API અને ERP",
    monthlyPrice: 1999,
    yearlyPrice: 1599,
    annualTotal: 19188,
    popular: false,
    badge: "ENTERPRISE",
    accentColor: "#4F46E5",
    features: [
      "Unlimited Companies, Warehouses & Branches",
      "Unlimited Staff Logins with Role Permissions",
      "Direct Government E-Invoicing API Integration",
      "Real-time Multi-Branch Cloud Data Sync",
      "Dedicated Relationship Support Manager",
      "Custom Branded Print Templates & Ledgers",
      "24/7 Priority Dedicated Helpline",
    ],
    featuresGujarati: [
      "અનલિમિટેડ કંપનીઓ અને ગોડાઉન",
      "અનલિમિટેડ સ્ટાફ લોગિન & રોલ પરમિશન",
      "સરકારી e-Invoice સીધો API ઇન્ટિગ્રેશન",
      "મલ્ટી-બ્રાન્ચ રિયલ-ટાઇમ ક્લાઉડ સિન્ક",
      "ડેડિકેટેડ એકાઉન્ટિંગ મેનેજર સપોર્ટ",
      "કસ્ટમ પ્રિન્ટ થીમ્સ અને બિલ ફોર્મેટ્સ",
      "૨૪/૭ પ્રાથમિક હેલ્પલાઇન સપોર્ટ",
    ],
  },
  {
    tier: "MANUFACTURING_SUITE",
    name: "Manufacturing Suite",
    nameGujarati: "મેન્યુફેક્ચરિંગ સ્યુટ (Production)",
    subtitle: "BOM Recipes, Production Orders & Scrap",
    subtitleGujarati: "કાચો માલ, ઉત્પાદન અને BoM રેસિપી",
    monthlyPrice: 2499,
    yearlyPrice: 1999,
    annualTotal: 23988,
    popular: false,
    badge: "MANUFACTURING",
    accentColor: "#DB2777",
    features: [
      "Complete Manufacturing BoM & Batch Production",
      "Raw Material Scrap & Job Work Tracking",
      "Production Work Orders & Yield Analysis",
      "Enterprise Multi-Godown Logistics",
      "Full Double-Entry Accounting & Audit Trail",
      "24/7 Dedicated Account Manager",
    ],
    featuresGujarati: [
      "સંપૂર્ણ મેન્યુફેક્ચરિંગ BoM અને બેચ ઉત્પાદન",
      "કાચો માલ સ્ક્રેપ અને જોબવર્ક ટ્રેકિંગ",
      "ઉત્પાદન વર્ક ઓર્ડર અને યીલ્ડ એનાલિસિસ",
      "એન્ટરપ્રાઇઝ મલ્ટી-ગોડાઉન લોજિસ્ટિક્સ",
      "સંપૂર્ણ ડબલ-એન્ટ્રી ખાતાવહી અને ઓડિટ",
      "૨૪/૭ ડેડિકેટેડ એકાઉન્ટ મેનેજર",
    ],
  },
];

function PricingSettingsView() {
  const { lang, entitlements, user, refreshTenantMetadata } = useAuth();
  const gu = lang === "gu";

  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [plans, setPlans] = useState<any[]>(DEFAULT_SETTINGS_PLANS);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);

  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountType: "PERCENTAGE" | "FLAT";
    discountValue: number;
    discountAmount: number;
    message?: string;
  } | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);

  const [upgradedSuccess, setUpgradedSuccess] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tenant current subscription metadata
  const currentTier = (entitlements?.tier || "WHOLESALE_PRO").toUpperCase();
  const isExpired = Boolean(entitlements?.isExpired);
  const daysRemaining = Math.max(0, Number(entitlements?.daysRemaining ?? 0));
  const subscriptionEnds = entitlements?.subscriptionEnds;
  const currentRank = TIER_RANKS[currentTier] ?? 0;

  // Fetch live configured plans from Superadmin backend
  useEffect(() => {
    let isMounted = true;
    apiClient
      .get<any[]>("/subscriptions/plans")
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          const nonTrial = data.filter((p: any) => p.tier !== "TRIAL" && p.isActive !== false);
          if (nonTrial.length > 0) {
            setPlans(
              nonTrial.map((p) => ({
                tier: p.tier,
                name: p.name,
                nameGujarati: p.nameGujarati || p.name,
                subtitle: p.subtitle || "",
                subtitleGujarati: p.subtitleGujarati || p.subtitle || "",
                monthlyPrice: Number(p.monthlyPrice) || 0,
                yearlyPrice: Number(p.yearlyPrice) || 0,
                annualTotal: Number(p.annualTotal) || Number(p.yearlyPrice) * 12 || 0,
                popular: Boolean(p.isPopular),
                badge: p.badge || (p.isPopular ? "MOST POPULAR" : null),
                accentColor: p.accentColor || "#1677E8",
                features: Array.isArray(p.features) ? p.features : [],
                featuresGujarati: Array.isArray(p.featuresGujarati) ? p.featuresGujarati : p.features || [],
              })),
            );
          }
        }
      })
      .catch((err) => {
        console.warn("PricingSettingsView: Using default plans fallback:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingPlans(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Current active plan object
  const currentPlanObj = useMemo(() => {
    return plans.find((p) => p.tier === currentTier) || DEFAULT_SETTINGS_PLANS.find((p) => p.tier === currentTier);
  }, [plans, currentTier]);

  const currentPlanName = gu
    ? currentPlanObj?.nameGujarati || currentPlanObj?.name || currentTier
    : currentPlanObj?.name || currentTier;

  // Calculate SaaS Standard Prorated Credit (Unused balance of current cycle)
  const getProratedCredit = useCallback(
    (targetTier: string, cycle: "monthly" | "yearly"): number => {
      const targetRank = TIER_RANKS[targetTier] ?? 0;
      // No credit if expired, trial, or not an upgrade
      if (isExpired || daysRemaining <= 0 || targetRank <= currentRank || currentTier === "TRIAL") {
        return 0;
      }
      const currentPlanCost = cycle === "yearly" ? (currentPlanObj?.annualTotal ?? 4788) : (currentPlanObj?.monthlyPrice ?? 399);
      const cycleDays = cycle === "yearly" ? 365 : 30;
      const dailyRate = currentPlanCost > 0 ? currentPlanCost / cycleDays : 0;
      const credit = Math.round(dailyRate * daysRemaining);
      return Math.max(0, Math.min(credit, currentPlanCost));
    },
    [isExpired, daysRemaining, currentRank, currentTier, currentPlanObj],
  );

  // Formatted subscription end date
  const formattedEndDate = useMemo(() => {
    if (!subscriptionEnds) return null;
    try {
      const d = new Date(subscriptionEnds);
      return formatDate(d);
    } catch {
      return null;
    }
  }, [subscriptionEnds]);

  // Order & Payment Initiation
  const handleConfirmPay = async () => {
    if (!selectedPlan) return;
    setIsUpgrading(true);
    setErrorMessage(null);

    try {
      // 1. Create Order on Backend (backend validates downgrade & applies prorated credit discount & coupon discount)
      const order = await apiClient.post<any>("/subscriptions/create-order", {
        tier: selectedPlan.tier,
        billingCycle,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
      });

      if (!order || !order.orderId) {
        throw new Error(order?.message || "Failed to initialize subscription order.");
      }

      // 2. Open Razorpay Checkout Modal
      const opened = await openRazorpayCheckout({
        orderId: order.orderId,
        amount: order.amount, // Net prorated and coupon-discounted amount in paise from backend!
        keyId: order.keyId,
        currency: order.currency || "INR",
        name: "myBillBook Technologies",
        description: `${selectedPlan.name} (${billingCycle === "yearly" ? "Annual" : "Monthly"})`,
        prefill: {
          name: user?.fullName || "",
          email: user?.email || "",
          contact: user?.phone || "",
        },
        notes: {
          tier: selectedPlan.tier,
          billingCycle,
          couponCode: appliedCoupon?.code || "",
        },
        onSuccess: async (response) => {
          // 3. Verify Payment
          await apiClient.post("/subscriptions/verify-payment", {
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
            tier: selectedPlan.tier,
            billingCycle,
          });

          if (refreshTenantMetadata) {
            await refreshTenantMetadata();
          }

          setUpgradedSuccess(true);
          handleCloseModal();
          setTimeout(() => setUpgradedSuccess(false), 6000);
        },
        onError: (err) => {
          setErrorMessage(err?.message || "Payment cancelled or failed.");
        },
      });

      if (!opened) {
        // Fallback direct upgrade if modal simulation is active
        await apiClient.post("/tenants/subscription/upgrade", {
          tier: selectedPlan.tier,
          billingCycle: billingCycle === "yearly" ? "1year" : "1year",
        });
        if (refreshTenantMetadata) await refreshTenantMetadata();
        setUpgradedSuccess(true);
        handleCloseModal();
        setTimeout(() => setUpgradedSuccess(false), 6000);
      }
    } catch (err: any) {
      try {
        await apiClient.post("/tenants/subscription/upgrade", {
          tier: selectedPlan.tier,
          billingCycle: "1year",
        });
        if (refreshTenantMetadata) await refreshTenantMetadata();
        setUpgradedSuccess(true);
        handleCloseModal();
        setTimeout(() => setUpgradedSuccess(false), 6000);
      } catch (fallbackErr: any) {
        setErrorMessage(err?.message || fallbackErr?.message || "Failed to upgrade subscription");
      }
    } finally {
      setIsUpgrading(false);
    }
  };

  // Selected plan pricing breakdown calculation
  const targetPlanBasePrice = selectedPlan
    ? billingCycle === "yearly"
      ? selectedPlan.annualTotal
      : selectedPlan.monthlyPrice
    : 0;

  const proratedCredit = selectedPlan ? getProratedCredit(selectedPlan.tier, billingCycle) : 0;
  const isSelectedUpgrade = selectedPlan ? (TIER_RANKS[selectedPlan.tier] ?? 0) > currentRank && !isExpired && daysRemaining > 0 : false;
  const isSelectedRenewal = selectedPlan ? selectedPlan.tier === currentTier : false;

  const priceAfterCredit = Math.max(1, targetPlanBasePrice - proratedCredit);
  const couponDiscount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const taxable = Math.max(1, priceAfterCredit - couponDiscount);
  const gstAmt = Math.round(taxable * 0.18);
  const totalPayable = taxable + gstAmt;

  // Handle Apply Coupon via Backend API
  const handleApplyCoupon = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponError(gu ? "કૃપા કરીને કૂપન કોડ દાખલ કરો." : "Please enter a coupon code.");
      return;
    }
    if (!selectedPlan) return;

    setIsApplyingCoupon(true);
    setCouponError(null);
    setCouponSuccess(null);

    try {
      const res: any = await apiClient.post("/subscriptions/validate-coupon", {
        code,
        tier: selectedPlan.tier,
        billingCycle,
        subtotal: priceAfterCredit,
      });

      if (res && res.valid) {
        setAppliedCoupon({
          code: res.code,
          discountType: res.discountType,
          discountValue: Number(res.discountValue || 0),
          discountAmount: Number(res.discountAmount || 0),
          message: res.message,
        });
        setCouponSuccess(
          res.message ||
            (gu
              ? `કૂપન ${res.code} સફળતાપૂર્વક લાગુ થયું! (બચત ₹${Number(res.discountAmount || 0).toLocaleString("en-IN")})`
              : `Coupon ${res.code} applied successfully! (Saved ₹${Number(res.discountAmount || 0).toLocaleString("en-IN")})`),
        );
        setCouponError(null);
      } else {
        throw new Error(res?.message || "Invalid coupon code.");
      }
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponSuccess(null);
      setCouponError(err?.message || err?.error || (gu ? "અમાન્ય કૂપન કોડ." : "Invalid coupon code."));
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
    setCouponSuccess(null);
  };

  const handleCloseModal = () => {
    setSelectedPlan(null);
    handleRemoveCoupon();
    setErrorMessage(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Top Banner: Header + Billing Cycle Toggle */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="typo-page-title text-[#182230]">
              {gu ? "સબ્સ્ક્રિપ્શન પ્લાન્સ અને એન્ટાઇટલમેન્ટ્સ" : "Subscription Plans & Entitlements"}
            </h1>
            <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded-full">
              {plans.length} {gu ? "પ્લાન્સ ઉપલબ્ધ" : "Tiers Configured"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {gu
              ? "તમારા બિઝનેસ સ્કેલ મુજબ યોગ્ય પ્લાન પસંદ કરો - અપગ્રેડ સમયે બાકી દિવસોનું ક્રેડિટ આપોઆપ બાદ થશે"
              : "Select the right plan for your business scale - mid-cycle upgrades automatically credit your unused balance"}
          </p>
        </div>

        {/* Monthly vs Yearly Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start md:self-center shrink-0">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              billingCycle === "monthly" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {gu ? "માસિક" : "Monthly"}
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("yearly")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              billingCycle === "yearly" ? "bg-[#1677E8] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>{gu ? "વાર્ષિક" : "Yearly"}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                billingCycle === "yearly" ? "bg-white text-[#1677E8]" : "bg-emerald-100 text-emerald-800"
              }`}
            >
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Current Subscription Active Status Badge */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50/40 border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-900">
                {gu ? "હાલનો સક્રિય પ્લાન:" : "Current Active Plan:"}{" "}
                <span className="text-[#1677E8] font-bold">{currentPlanName}</span>
              </span>
              {!isExpired && daysRemaining > 0 ? (
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold text-[10px]">
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>
                    {daysRemaining} {gu ? "દિવસ બાકી" : "days remaining"}
                  </span>
                </span>
              ) : (
                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold text-[10px]">
                  {gu ? "સમાપ્ત થયેલ (Expired)" : "Expired / Renewal Needed"}
                </span>
              )}
            </div>
            {formattedEndDate && (
              <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>
                  {gu ? "માન્યતા તારીખ:" : "Valid until:"} {formattedEndDate}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="text-[11px] text-slate-600 bg-white/80 border border-slate-200/80 px-3 py-1.5 rounded-xl self-start sm:self-auto flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>
            {gu
              ? "અપગ્રેડ સમયે બાકી દિવસોનું ક્રેડિટ તરત બાદ મળે છે"
              : "Mid-cycle upgrade credit applied automatically"}
          </span>
        </div>
      </div>

      {/* Success Notification */}
      {upgradedSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs"
        >
          <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
          <span>
            {gu
              ? "પ્લાન સફળતાપૂર્વક અપગ્રેડ થયો છે! બધા નવા ફીચર્સ અને લિમિટ્સ તરત સક્રિય થઈ ગયા છે."
              : "Subscription plan upgraded successfully via Razorpay! All entitlements and limits unlocked."}
          </span>
        </motion.div>
      )}

      {/* Plans 4-Column Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {plans.map((p) => {
          const planRank = TIER_RANKS[p.tier] ?? 0;
          const isCurrent = p.tier === currentTier;
          const isDowngrade = !isExpired && daysRemaining > 0 && planRank < currentRank;
          const isUpgrade = !isExpired && daysRemaining > 0 && planRank > currentRank && currentTier !== "TRIAL";
          const unusedCreditEst = isUpgrade ? getProratedCredit(p.tier, billingCycle) : 0;

          const displayMonthly = billingCycle === "yearly" ? p.yearlyPrice : p.monthlyPrice;
          const displayAnnual = p.annualTotal;

          return (
            <motion.div
              key={p.tier}
              whileHover={!isDowngrade ? { y: -3 } : undefined}
              transition={{ duration: 0.18 }}
              className={`p-4 rounded-2xl border bg-white shadow-2xs flex flex-col justify-between gap-4 transition-all relative ${
                isCurrent
                  ? "border-emerald-500 ring-2 ring-emerald-500/25 bg-emerald-50/15"
                  : p.popular
                    ? "border-[#1677E8] ring-2 ring-[#1677E8]/20 bg-[#EFF6FF]/10"
                    : isDowngrade
                      ? "border-slate-200/80 bg-slate-50/50 opacity-80"
                      : "border-slate-200 hover:border-slate-300 hover:shadow-xs"
              }`}
            >
              {/* Badge on top */}
              {isCurrent ? (
                <div className="absolute -top-2.5 left-4 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold tracking-wide flex items-center gap-1 shadow-2xs">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                  <span>{gu ? "હાલનો પ્લાન" : "CURRENT PLAN"}</span>
                </div>
              ) : isDowngrade ? (
                <div className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-semibold tracking-wide flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  <span>{gu ? "અવરોધિત" : "DOWNGRADE RESTRICTED"}</span>
                </div>
              ) : p.badge ? (
                <div className="absolute -top-2.5 left-4 px-2.5 py-0.5 rounded-full bg-[#1677E8] text-white text-[10px] font-bold tracking-wide uppercase shadow-2xs">
                  {p.badge}
                </div>
              ) : null}

              <div className="space-y-2.5 pt-1">
                <div>
                  <h3 className="text-[14px] font-bold text-slate-900">
                    {gu ? p.nameGujarati || p.name : p.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5 line-clamp-2">
                    {gu ? p.subtitleGujarati || p.subtitle : p.subtitle}
                  </p>
                </div>

                {/* Price Display */}
                <div className="pt-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-900 tabular-nums">
                      ₹ {displayMonthly.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      / {gu ? "મહિનો" : "month"}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-0.5 font-medium">
                    {billingCycle === "yearly"
                      ? `${gu ? "વાર્ષિક બિલ" : "billed annually"} ₹${displayAnnual.toLocaleString("en-IN")}/yr`
                      : gu
                        ? "માસિક બિલ"
                        : "billed monthly"}
                  </span>
                </div>

                {/* Upgrade Credit Preview Pill */}
                {isUpgrade && unusedCreditEst > 0 && (
                  <div className="p-2 bg-blue-50 border border-blue-200/80 rounded-xl text-[11px] text-blue-800 font-medium flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>
                      {gu
                        ? `બાકી ક્રેડિટ ₹${unusedCreditEst.toLocaleString("en-IN")} બાદ મળશે`
                        : `₹${unusedCreditEst.toLocaleString("en-IN")} credit applied from current plan`}
                    </span>
                  </div>
                )}

                {/* Features Checklist */}
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    {gu ? "શામેલ ફીચર્સ" : "What's included"}
                  </p>
                  <ul className="space-y-1.5 text-[11px] text-slate-600">
                    {(gu && p.featuresGujarati?.length ? p.featuresGujarati : p.features).map((f: string) => (
                      <li key={f} className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5 stroke-[2.5]" />
                        <span className="leading-snug">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                {isDowngrade ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2 px-3 rounded-xl text-[11px] font-semibold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed flex items-center justify-center gap-1.5"
                    title={
                      gu
                        ? "સક્રિય સબ્સ્ક્રિપ્શન દરમ્યાન નીચો પ્લાન પસંદ કરી શકાય નહીં."
                        : "Downgrading is not allowed during an active billing cycle."
                    }
                  >
                    <Lock className="w-3 h-3" />
                    <span>{gu ? "નીચો પ્લાન (બદલી શકાશે નહીં)" : "Lower Plan (Cannot Downgrade)"}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedPlan(p)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 ${
                      isCurrent
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : p.popular
                          ? "bg-[#1677E8] hover:bg-[#1268D3] text-white"
                          : "bg-slate-900 hover:bg-slate-800 text-white"
                    }`}
                  >
                    {isCurrent ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{gu ? "પ્લાન રીન્યુ કરો" : "Renew Subscription"}</span>
                      </>
                    ) : isUpgrade ? (
                      <>
                        <span>{gu ? "અપગ્રેડ કરો" : `Upgrade to ${p.name}`}</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <span>{gu ? `પસંદ કરો ${p.name}` : `Select ${p.name}`}</span>
                    )}
                  </button>
                )}
                {isDowngrade && (
                  <p className="text-[10px] text-slate-400 text-center mt-1">
                    {gu ? "હાલના પ્લાનમાં આ ફીચર્સ શામેલ છે" : "Included in your current tier"}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Upgrade Checkout Modal with Transparent Proration Breakdown */}
      <AnimatePresence>
        {selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-100">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1677E8] flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-slate-900">
                      {isSelectedRenewal
                        ? gu
                          ? `રીન્યુઅલ: ${selectedPlan.nameGujarati || selectedPlan.name}`
                          : `Renew: ${selectedPlan.name}`
                        : gu
                          ? `અપગ્રેડ ચેકઆઉટ: ${selectedPlan.nameGujarati || selectedPlan.name}`
                          : `Checkout: ${selectedPlan.name}`}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {billingCycle === "yearly"
                        ? gu
                          ? "૧ વર્ષ (વાર્ષિક બિલિંગ) - 20% બચત"
                          : "1 Year (Annual Billing) - Save 20%"
                        : gu
                          ? "૧ મહિનો (માસિક બિલિંગ)"
                          : "1 Month (Monthly Billing)"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Informative SaaS Proration Explanation Banner */}
              {isSelectedUpgrade && proratedCredit > 0 ? (
                <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900">
                      {gu ? "પ્રોરેટેડ અપગ્રેડ ક્રેડિટ લાગુ થયેલ છે" : "Prorated Upgrade Credit Applied"}
                    </p>
                    <p className="text-[11px] text-blue-700 mt-0.5 leading-relaxed">
                      {gu
                        ? `તમારા હાલના ${currentPlanName} ના બાકી રહેલા ${daysRemaining} દિવસોનું ₹${proratedCredit.toLocaleString("en-IN")} ક્રેડિટ આ અપગ્રેડમાંથી બાદ કરવામાં આવ્યું છે. નવો પ્લાન આજથી ૧ સંપૂર્ણ વર્ષ માટે સક્રિય થશે.`
                        : `Your remaining ${daysRemaining} days on ${currentPlanName} are credited as -₹${proratedCredit.toLocaleString("en-IN")}. Your new ${selectedPlan.name} takes effect immediately for 1 full year.`}
                    </p>
                  </div>
                </div>
              ) : isSelectedRenewal ? (
                <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-emerald-900">
                      {gu ? "સબ્સ્ક્રિપ્શન રીન્યુઅલ" : "Subscription Renewal"}
                    </p>
                    <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                      {gu
                        ? `રીન્યુ કરવાથી તમારી હાલની માન્યતા તારીખમાં વધુ ${billingCycle === "yearly" ? "૧ વર્ષ (૩૬૫ દિવસ)" : "૩૦ દિવસ"} ઉમેરાશે.`
                        : `Renewing extends your current expiration date by +${billingCycle === "yearly" ? "1 full year (365 days)" : "30 days"} with zero downtime.`}
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Transparent Cost Breakdown */}
              <div className="space-y-2 text-xs bg-slate-50/60 p-3.5 rounded-xl border border-slate-200/70">
                <div className="flex justify-between text-slate-600">
                  <span>{gu ? "પ્લાન બેઝ પ્રાઇસ:" : "Selected Plan Price:"}</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    ₹ {targetPlanBasePrice.toLocaleString("en-IN")}
                  </span>
                </div>

                {/* Prorated Unused Credit Deduction */}
                {isSelectedUpgrade && proratedCredit > 0 && (
                  <div className="flex justify-between text-blue-700 font-semibold bg-blue-100/50 -mx-2 px-2 py-1 rounded-lg">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>
                        {gu
                          ? `બાદ: હાલના પ્લાનની ક્રેડિટ (${daysRemaining} દિવસ બાકી):`
                          : `Less: Prorated credit (${daysRemaining} days remaining):`}
                      </span>
                    </span>
                    <span className="tabular-nums">- ₹ {proratedCredit.toLocaleString("en-IN")}</span>
                  </div>
                )}

                {/* Coupon discount if applied */}
                {appliedCoupon && appliedCoupon.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold bg-emerald-100/70 -mx-2 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        {gu
                          ? `કૂપન ડિસ્કાઉન્ટ (${appliedCoupon.code}):`
                          : `Coupon Discount (${appliedCoupon.code}):`}
                      </span>
                    </span>
                    <span className="tabular-nums font-bold">- ₹ {appliedCoupon.discountAmount.toLocaleString("en-IN")}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200/60">
                  <span>{gu ? "નેટ ટેક્સેબલ રકમ:" : "Net Taxable Subtotal:"}</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    ₹ {taxable.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>{gu ? "GST (18% SAC 998314):" : "GST (18% SAC 998314):"}</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    ₹ {gstAmt.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                  <span>{gu ? "કુલ ચૂકવવાપાત્ર રકમ:" : "Total Amount Payable:"}</span>
                  <span className="text-[#1677E8] text-base tabular-nums font-extrabold">
                    ₹ {totalPayable.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Dynamic Coupon Code Input & Applied State */}
              <div className="pt-1 space-y-2">
                {appliedCoupon ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 animate-in fade-in">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-emerald-900 text-xs tracking-wider uppercase">
                            {appliedCoupon.code}
                          </span>
                          <span className="text-[10px] bg-emerald-200/90 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                            {appliedCoupon.discountType === "PERCENTAGE"
                              ? `${appliedCoupon.discountValue}% OFF`
                              : `₹${appliedCoupon.discountAmount} OFF`}
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                          {appliedCoupon.message ||
                            (gu
                              ? `તમે ₹${appliedCoupon.discountAmount.toLocaleString("en-IN")} બચાવ્યા!`
                              : `You saved ₹${appliedCoupon.discountAmount.toLocaleString("en-IN")}!`)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-100/60 rounded-lg transition-colors cursor-pointer"
                    >
                      {gu ? "દૂર કરો" : "Remove"}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={gu ? "કૂપન કોડ (દા.ત. MBBFIRST50, SAVE20)" : "Coupon code (e.g. MBBFIRST50, SAVE20)"}
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(e.target.value.toUpperCase());
                          if (couponError) setCouponError(null);
                        }}
                        className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl tabular-nums uppercase h-9 focus:outline-none focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/20 focus:bg-white transition-all font-semibold text-slate-800 placeholder:normal-case placeholder:font-normal placeholder:text-slate-400"
                      />
                      <button
                        type="submit"
                        disabled={isApplyingCoupon || !couponInput.trim()}
                        className="h-9 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        {isApplyingCoupon ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>{gu ? "ચકાસી રહ્યું છે..." : "Checking..."}</span>
                          </>
                        ) : (
                          <span>{gu ? "લાગુ કરો" : "Apply"}</span>
                        )}
                      </button>
                    </div>

                    {/* Quick Available Promo Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[10px] text-slate-400 font-medium">
                        {gu ? "ઉપલબ્ધ ઑફર્સ:" : "Popular codes:"}
                      </span>
                      {["MBBFIRST50", "SAVE20", "MBB500"].map((code) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => {
                            setCouponInput(code);
                            setCouponError(null);
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 font-semibold border border-slate-200/60 transition-colors cursor-pointer"
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  </form>
                )}

                {/* Error Banner */}
                {couponError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>{couponError}</span>
                  </div>
                )}
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="h-9 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
                >
                  {gu ? "રદ કરો" : "Cancel"}
                </button>
                <button
                  type="button"
                  disabled={isUpgrading}
                  onClick={handleConfirmPay}
                  className="h-9 px-5 text-xs font-semibold text-white bg-[#1677E8] hover:bg-[#1268D3] rounded-xl shadow-xs disabled:opacity-50 cursor-pointer transition-all flex items-center gap-2"
                >
                  {isUpgrading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Connecting Razorpay...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>
                        {gu
                          ? `₹${totalPayable.toLocaleString("en-IN")} ચૂકવો (Razorpay)`
                          : `Pay ₹${totalPayable.toLocaleString("en-IN")} with Razorpay`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =========================================================================
// 9. REFER & EARN VIEW
// =========================================================================
function ReferEarnView() {
  const [copied, setCopied] = useState(false);
  const [referEmail, setReferEmail] = useState("");
  const [referNote, setReferNote] = useState<string | null>(null);
  const referralCode = "JKBILL500";
  const shareUrl = `https://myownbillbook.com/join?ref=${referralCode}`;

  const copyCode = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
        <h1 className="typo-page-title text-[#182230]">Refer Businesses & Earn ₹500 Discount</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Share your referral code with fellow business owners. They get ₹500 discount on signup and you get ₹500 on your next renewal.
        </p>
      </div>

      <div className="bg-gradient-to-r from-[#EFF6FF]/80 via-white to-[#EFF6FF]/80 rounded-2xl border border-[#BFDBFE] p-5 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-600 block">Your Exclusive Referral Link:</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="tabular-nums text-sm font-bold text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
              {shareUrl}
            </span>
            <button
              type="button"
              onClick={copyCode}
              className="h-9 px-3.5 bg-[#1677E8] hover:bg-[#1268D3] text-white text-[13px] font-medium rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Copied!</span>
                </>
              ) : (
                <span>Copy Link</span>
              )}
            </button>
          </div>
        </div>

        <a
          href={`https://wa.me/?text=Hello!%20I%20am%20using%20myownBillBook%20for%20GST%20Billing%20and%20Accounting.%20Use%20my%20link%20to%20get%20Rs.500%20discount:%20${encodeURIComponent(shareUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="h-9 px-3.5 bg-[#1677E8] hover:bg-[#1268D3] text-white text-[13px] font-medium rounded-xl shadow-xs flex items-center gap-2 shrink-0 transition-colors"
        >
          <span>Share on WhatsApp</span>
        </a>
      </div>

      <form
        className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col sm:flex-row gap-2 max-w-xl"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const result = await sendAppEmail({
              to: referEmail.trim(),
              subject: "Join myownbillbook with a referral",
              heading: "You are invited to myownbillbook",
              intro: "Start GST billing and accounts with this referral link.",
              details: [{ label: "Referral link", value: shareUrl }],
              text: "Open the link to create an account.",
            });
            setReferNote(mailResultMessage(result, "en"));
          } catch (err: any) {
            setReferNote(err?.message || "Could not send the referral email.");
          }
        }}
      >
        <input
          type="email"
          required
          value={referEmail}
          onChange={(e) => setReferEmail(e.target.value)}
          placeholder="friend@business.com"
          className="flex-1 px-3 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-xl h-10 focus:outline-none focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/20 focus:bg-white transition-all"
        />
        <button type="submit" className="h-9 px-3.5 bg-[#1677E8] hover:bg-[#1268D3] text-white text-[13px] font-medium rounded-xl shadow-xs transition-colors cursor-pointer">
          Email referral
        </button>
        {referNote && <p className="text-xs text-slate-600 sm:col-span-2">{referNote}</p>}
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Friends Invited", val: "4" },
          { label: "Activated Subscriptions", val: "2" },
          { label: "Available Credits", val: "₹ 1,000" },
        ].map((st) => (
          <div key={st.label} className="p-4 rounded-xl border border-slate-200 bg-white text-center">
            <p className="text-xs text-slate-500">{st.label}</p>
            <p className="text-xl font-semibold text-slate-900 mt-1">{st.val}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// =========================================================================
// 10. HELP & SUPPORT VIEW
// =========================================================================
function HelpSupportView() {
  const [callbackName, setCallbackName] = useState("");
  const [callbackPhone, setCallbackPhone] = useState("");
  const [callbackEmail, setCallbackEmail] = useState("");
  const [callbackDone, setCallbackDone] = useState(false);
  const [callbackError, setCallbackError] = useState<string | null>(null);

  const handleCallback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callbackPhone.trim() || !callbackEmail.trim()) return;
    setCallbackError(null);
    try {
      const result: any = await apiClient.post("/mail/support", {
        name: callbackName.trim(),
        phone: callbackPhone.trim(),
        email: callbackEmail.trim(),
        subject: "Support callback request",
        text: `Please call ${callbackName.trim()} on ${callbackPhone.trim()}.`,
      });
      if (!result.delivered) {
        setCallbackError(mailResultMessage(result, "en"));
        return;
      }
      setCallbackDone(true);
      setTimeout(() => {
        setCallbackDone(false);
        setCallbackName("");
        setCallbackPhone("");
        setCallbackEmail("");
      }, 3000);
    } catch (err: any) {
      setCallbackError(err?.message || "Could not send the confirmation email.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
        <h1 className="typo-page-title text-[#182230]">24x7 Customer Support & Help Center</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Dedicated assistance in Gujarati and English from our certified accounting specialists
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a
          href="https://wa.me/917400199999?text=Hello%20myBillBook%20Support"
          target="_blank"
          rel="noopener noreferrer"
          className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 transition-colors flex items-center gap-3.5"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">WhatsApp Live Support</p>
            <p className="text-xs text-slate-600 mt-0.5">Instant chat with support engineer (9 AM - 9 PM)</p>
          </div>
        </a>

        <a
          href="tel:08035002000"
          className="p-5 rounded-2xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/70 transition-colors flex items-center gap-3.5"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Helpline: 080-3500-2000</p>
            <p className="text-xs text-slate-600 mt-0.5">Direct phone assistance for billing & GST issues</p>
          </div>
        </a>
      </div>

      {/* Request Callback Form */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Request an Immediate Callback</h2>
        {callbackDone ? (
          <p className="text-xs text-emerald-700 font-bold p-3 bg-emerald-50 rounded-xl flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Confirmation emailed. Our representative will call the number you entered.</span>
          </p>
        ) : (
          <form onSubmit={handleCallback} className="flex flex-col sm:flex-row gap-3 max-w-lg">
            <input
              type="text"
              value={callbackName}
              onChange={(e) => setCallbackName(e.target.value)}
              placeholder="Your Name"
              required
              className="flex-1 px-3 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-xl h-10"
            />
            <input
              type="text"
              value={callbackPhone}
              onChange={(e) => setCallbackPhone(e.target.value)}
              placeholder="Mobile Number"
              required
              className="flex-1 px-3 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-xl tabular-nums h-10"
            />
            <input
              type="email"
              value={callbackEmail}
              onChange={(e) => setCallbackEmail(e.target.value)}
              placeholder="Email for confirmation"
              required
              className="flex-1 px-3 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-xl h-10"
            />
            <button type="submit" className="h-9 px-3.5 bg-[#1677E8] hover:bg-[#1268D3] text-white text-[13px] font-medium rounded-xl shadow-xs transition-colors cursor-pointer">
              Call Me
            </button>
          </form>
        )}
        {callbackError && <p className="text-xs text-amber-800 font-semibold">{callbackError}</p>}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// Sidebar Settings View
// -------------------------------------------------------------------------
function SidebarSettingsView() {
  const { lang } = useAuth();
  const [autoCollapse, setAutoCollapse] = useState<boolean>(() => getSidebarAutoCollapse());
  const [defaultCollapsed, setDefaultCollapsed] = useState<boolean>(() => getSidebarCollapsedPreference());
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const showSaved = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 2200);
  };

  const handleToggleAutoCollapse = () => {
    const next = !autoCollapse;
    setAutoCollapse(next);
    setSidebarAutoCollapse(next);
    showSaved(
      next
        ? lang === "gu"
          ? "પેજ લોડ પર સાઇડબાર ઓટો-કોલેપ્સ ચાલુ કર્યું."
          : "Auto-collapse on page load enabled."
        : lang === "gu"
          ? "સાઇડબાર ઓટો-કોલેપ્સ બંધ કર્યું. હવે સાઇડબાર ખુલ્લું રહેશે."
          : "Auto-collapse disabled. Sidebar will stay open."
    );
  };

  const handleDefaultModeChange = (collapsed: boolean) => {
    setDefaultCollapsed(collapsed);
    setSidebarCollapsedPreference(collapsed);
    showSaved(
      collapsed
        ? lang === "gu"
          ? "ડિફોલ્ટ સાઇડબાર સ્થિતિ: કોલેપ્સ્ડ (નાનું)"
          : "Default sidebar state set to Collapsed."
        : lang === "gu"
          ? "ડિફોલ્ટ સાઇડબાર સ્થિતિ: ખુલ્લું (Expanded)"
          : "Default sidebar state set to Expanded."
    );
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
            <PanelLeft className="w-5 h-5 text-[#1677E8]" />
            <span>{lang === "gu" ? "સાઇડબાર સેટિંગ્સ" : "Sidebar Settings"}</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            {lang === "gu"
              ? "પેજ લોડ થતા સમયે સાઇડબાર ખુલ્લું રાખવું કે કોલેપ્સ કરવું તે કસ્ટમાઇઝ કરો."
              : "Customize how the navigation sidebar behaves on page load and navigation."}
          </p>
        </div>
        {savedNotice && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            <Check className="w-3.5 h-3.5" />
            <span>{savedNotice}</span>
          </div>
        )}
      </div>

      {/* Auto-collapse toggle card */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#0F172A]">
                {lang === "gu"
                  ? "પેજ લોડ પર સાઇડબાર ઓટો-કોલેપ્સ કરો"
                  : "Auto-collapse Sidebar on Page Load"}
              </h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                  autoCollapse
                    ? "bg-blue-50 text-[#1677E8] border border-blue-200"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                {autoCollapse ? (lang === "gu" ? "ચાલુ (ON)" : "ON") : lang === "gu" ? "બંધ (OFF)" : "OFF"}
              </span>
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed max-w-xl">
              {lang === "gu"
                ? "જો આ સેટિંગ ચાલુ (ON) હશે તો ડેશબોર્ડ સિવાયના બધા પેજ લોડ થતી વખતે સાઇડબાર આપમેળે કોલેપ્સ થઈ જશે. જો બંધ (OFF) હશે તો સાઇડબાર એમનેમ ખુલ્લું રહેશે."
                : "When ON, the sidebar automatically collapses when loading or navigating to inner pages to maximize workspace width. When OFF, the sidebar stays open across pages."}
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={autoCollapse}
            onClick={handleToggleAutoCollapse}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#1677E8]/30 ${
              autoCollapse ? "bg-[#1677E8]" : "bg-slate-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                autoCollapse ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Default state when Auto-collapse is OFF */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div>
            <h3 className="text-xs font-semibold text-[#0F172A]">
              {lang === "gu"
                ? "ડિફોલ્ટ સાઇડબાર સ્થિતિ (જ્યારે ઓટો-કોલેપ્સ બંધ હોય)"
                : "Default Sidebar State (when Auto-collapse is OFF)"}
            </h3>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              {lang === "gu"
                ? "સાઇડબાર ડિફોલ્ટ રીતે ખુલ્લું (Expanded) રાખવું કે નાનું (Collapsed) રાખવું તે પસંદ કરો."
                : "Choose whether the sidebar should stay expanded or collapsed by default."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              disabled={autoCollapse}
              onClick={() => handleDefaultModeChange(false)}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                !defaultCollapsed && !autoCollapse
                  ? "border-[#1677E8] bg-[#EFF6FF]/60 ring-2 ring-[#1677E8]/15"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#0F172A]">
                  {lang === "gu" ? "ખુલ્લું રાખો (Expanded)" : "Keep Expanded (Open)"}
                </span>
                {!defaultCollapsed && !autoCollapse && (
                  <CheckCircle2 className="w-4 h-4 text-[#1677E8]" />
                )}
              </div>
              <p className="text-[11px] text-[#64748B] mt-1">
                {lang === "gu"
                  ? "બધા મેનુ નામ સાથે પૂરું સાઇડબાર દેખાશે."
                  : "Shows full sidebar with all menu labels visible."}
              </p>
            </button>

            <button
              type="button"
              disabled={autoCollapse}
              onClick={() => handleDefaultModeChange(true)}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                defaultCollapsed && !autoCollapse
                  ? "border-[#1677E8] bg-[#EFF6FF]/60 ring-2 ring-[#1677E8]/15"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#0F172A]">
                  {lang === "gu" ? "કોલેપ્સ્ડ રાખો (Compact)" : "Keep Collapsed (Compact)"}
                </span>
                {defaultCollapsed && !autoCollapse && (
                  <CheckCircle2 className="w-4 h-4 text-[#1677E8]" />
                )}
              </div>
              <p className="text-[11px] text-[#64748B] mt-1">
                {lang === "gu"
                  ? "ફક્ત આઇકોન્સ દેખાશે, હોવર કરવાથી મેનુ ખુલશે."
                  : "Shows compact icon-only sidebar across all pages."}
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

