"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Copy,
  Check,
  ArrowRight,
  FileText,
  Layers,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit3,
  PlusCircle,
  ShieldCheck,
  RefreshCw,
  Info,
} from "lucide-react";
import { apiClient } from "../../lib/api-client";
import {
  extractRecordSubject,
  formatActivityAction,
  formatActivityModule,
  getActionToneClasses,
  getMeaningfulChanges,
} from "../../lib/activity-formatter";

export interface ActivityChangeItem {
  field: string;
  label: string;
  oldValue: any;
  newValue: any;
}

export interface ActivityEventDetail {
  id: string;
  timestamp: string;
  userName: string;
  phone?: string;
  userPhone?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  entityName: string;
  entityId: string;
  ipAddress?: string;
  userAgent?: string;
  companyName?: string;
  previousState?: any;
  newState?: any;
  changes?: ActivityChangeItem[];
}

interface ActivityDetailDrawerProps {
  event: ActivityEventDetail | null;
  isOpen: boolean;
  onClose: () => void;
  lang?: "en" | "gu";
}

const TECHNICAL_ID_KEYS = new Set([
  "id",
  "organizationId",
  "companyId",
  "userId",
  "branchId",
  "financialYearId",
  "createdById",
  "updatedById",
  "primaryUomId",
  "secondaryUomId",
  "categoryId",
  "hsnMasterId",
  "partyId",
  "passwordHash",
  "refreshTokenHash",
]);

function humanizeFieldKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function formatScalarValue(val: any): string {
  if (val === null || val === undefined || val === "") return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "number") return val.toLocaleString("en-IN");
  const str = String(val);
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    const d = new Date(str);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    }
  }
  return str;
}

function StructuredValue({ value }: { value: any }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-[#94A3B8]">—</span>;
  }
  if (typeof value === "boolean") {
    return (
      <span
        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
          value ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
        }`}
      >
        {value ? "Yes" : "No"}
      </span>
    );
  }
  if (typeof value !== "object") {
    return <span className="text-[#0F172A] break-words">{formatScalarValue(value)}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-[#94A3B8]">None</span>;
    if (typeof value[0] !== "object") {
      return (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded bg-[#F1F5F9] text-[#0F172A] text-[11px]"
            >
              {formatScalarValue(v)}
            </span>
          ))}
        </div>
      );
    }
    return (
      <div className="space-y-2 mt-1">
        {value.map((row, idx) => (
          <div
            key={idx}
            className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] grid grid-cols-2 gap-x-4 gap-y-1.5"
          >
            {Object.entries(row as Record<string, any>)
              .filter(([k]) => !TECHNICAL_ID_KEYS.has(k))
              .map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <span className="text-[10px] uppercase font-medium text-[#64748B] block">
                    {humanizeFieldKey(k)}
                  </span>
                  <span className="text-xs font-medium text-[#0F172A] break-words">
                    {typeof v === "object" && v !== null ? formatScalarValue((v as any).name || (v as any).symbol || "—") : formatScalarValue(v)}
                  </span>
                </div>
              ))}
          </div>
        ))}
      </div>
    );
  }

  const entries = Object.entries(value as Record<string, any>).filter(
    ([k, v]) => !TECHNICAL_ID_KEYS.has(k) && v !== undefined,
  );
  if (entries.length === 0) return <span className="text-[#94A3B8]">—</span>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1 p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
      {entries.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <span className="text-[10px] uppercase font-medium text-[#64748B] block">
            {humanizeFieldKey(k)}
          </span>
          <span className="text-xs font-medium text-[#0F172A] break-words">
            {typeof v === "object" && v !== null
              ? formatScalarValue((v as any).name || (v as any).symbol || "—")
              : formatScalarValue(v)}
          </span>
        </div>
      ))}
    </div>
  );
}

function StructuredStateCard({
  title,
  state,
  showIds,
}: {
  title: string;
  state: Record<string, any> | any;
  showIds: boolean;
}) {
  if (!state || typeof state !== "object") {
    return (
      <div className="p-4 border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] text-xs text-[#0F172A]">
        <div className="font-semibold mb-1">{title}</div>
        <div>{String(state)}</div>
      </div>
    );
  }

  const allEntries = Object.entries(state).filter(
    ([k, v]) =>
      v !== undefined &&
      k !== "passwordHash" &&
      k !== "refreshTokenHash" &&
      (showIds || !TECHNICAL_ID_KEYS.has(k)),
  );

  return (
    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white">
      <div className="px-4 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <h4 className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
          {title}
        </h4>
      </div>
      <div className="divide-y divide-[#F1F5F9]">
        {allEntries.length === 0 ? (
          <div className="p-4 text-xs text-[#64748B]">No business fields recorded.</div>
        ) : (
          allEntries.map(([key, val]) => (
            <div
              key={key}
              className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4"
            >
              <div className="sm:w-44 shrink-0 text-xs font-medium text-[#64748B]">
                {humanizeFieldKey(key)}
              </div>
              <div className="flex-1 min-w-0 text-xs font-medium text-[#0F172A]">
                <StructuredValue value={val} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function ActivityDetailDrawer({
  event,
  isOpen,
  onClose,
  lang = "en",
}: ActivityDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<"diff" | "snapshot" | "meta">("diff");
  const [copiedId, setCopiedId] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showAllFields, setShowAllFields] = useState(false);
  const [fullEvent, setFullEvent] = useState<ActivityEventDetail | null>(null);
  const [isHydrating, setIsHydrating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setActiveTab("diff");
    setShowAllFields(false);
    setFullEvent(event);

    if (!isOpen || !event?.id) return;
    const needsFullPayload =
      event.previousState === undefined && event.newState === undefined;

    if (!needsFullPayload) return;

    let cancelled = false;
    setIsHydrating(true);
    apiClient
      .get<ActivityEventDetail>(`/activity-logs/${event.id}`)
      .then((detail) => {
        if (!cancelled && detail) {
          setFullEvent((prev) => ({
            ...(prev || event),
            ...detail,
          }));
        }
      })
      .catch(() => {
        // Keep initial event summary if detail fetch fails
      })
      .finally(() => {
        if (!cancelled) setIsHydrating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, event]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  const displayEvent = fullEvent || event;
  if (!isOpen || !displayEvent || !mounted) return null;

  const handleCopyId = () => {
    if (!displayEvent.entityId) return;
    navigator.clipboard.writeText(displayEvent.entityId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const actionInfo = formatActivityAction(displayEvent.action, displayEvent.entityName);
  const moduleInfo = formatActivityModule(displayEvent.entityName);
  const toneClasses = getActionToneClasses(actionInfo.tone);
  const subject = extractRecordSubject(
    displayEvent.changes,
    displayEvent.newState || displayEvent.previousState,
  );

  const isUpdate = actionInfo.tone === "update" || actionInfo.tone === "post";
  const isCreate = actionInfo.tone === "create";
  const isDelete = actionInfo.tone === "delete" || actionInfo.tone === "cancel";
  const isAuth = actionInfo.tone === "auth";

  const allChanges = displayEvent.changes || [];
  const meaningfulChanges = getMeaningfulChanges(allChanges);
  const visibleChanges = showAllFields ? allChanges : meaningfulChanges;
  const hiddenCount = Math.max(0, allChanges.length - meaningfulChanges.length);
  const hasDiffs = allChanges.length > 0;
  const operatorPhone = displayEvent.userPhone || displayEvent.phone;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bb-overlay relative w-full sm:max-w-2xl bg-white shadow-2xl h-full flex flex-col border-l border-[#E2E8F0] transform transition-transform duration-200 ease-out animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-white shrink-0">
          <div className="min-w-0 pr-3">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${toneClasses.dot}`} />
              <h2 className="text-sm sm:text-base font-semibold text-[#0F172A] tracking-tight truncate">
                {lang === "gu" ? actionInfo.titleGu : actionInfo.title}
                {subject ? ` — ${subject}` : ""}
              </h2>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5 truncate">
              {new Date(displayEvent.timestamp).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "medium",
              })}
              {displayEvent.companyName ? ` • ${displayEvent.companyName}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-1 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            title={lang === "gu" ? "બંધ કરો" : "Close"}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Plain-English Summary Card */}
        <div className="px-5 sm:px-6 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0] shrink-0 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${toneClasses.badge}`}
              >
                {isCreate && <PlusCircle className="w-3.5 h-3.5" />}
                {isUpdate && <Edit3 className="w-3.5 h-3.5" />}
                {isDelete && <Trash2 className="w-3.5 h-3.5" />}
                {isAuth && <ShieldCheck className="w-3.5 h-3.5" />}
                {lang === "gu" ? actionInfo.badgeGu : actionInfo.badge}
              </span>
              <span className="text-xs font-medium text-[#475569] px-2 py-0.5 bg-white border border-[#E2E8F0] rounded-md">
                {lang === "gu" ? moduleInfo.labelGu : moduleInfo.label}
              </span>
            </div>
            {isHydrating && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[#64748B]">
                <RefreshCw className="w-3 h-3 animate-spin" />
                {lang === "gu" ? "વિગતો લોડ થાય છે..." : "Loading details..."}
              </span>
            )}
          </div>

          {/* Quick Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#E2E8F0]/80">
            <div>
              <span className="text-[10px] uppercase font-semibold text-[#64748B] block">
                {lang === "gu" ? "કોણે કર્યું" : "Performed By"}
              </span>
              <p className="text-xs font-semibold text-[#0F172A] mt-0.5 truncate">
                {displayEvent.userName || "System"}
              </p>
              {operatorPhone && (
                <span className="text-[10px] text-[#64748B] tabular-nums block">
                  {operatorPhone}
                </span>
              )}
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-[#64748B] block">
                {lang === "gu" ? "ભૂમિકા" : "Role"}
              </span>
              <p className="text-xs font-semibold text-[#0F172A] mt-0.5 truncate">
                {humanizeFieldKey((displayEvent.userRole || "Admin").toLowerCase())}
              </p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-[#64748B] block">
                {lang === "gu" ? "આઈપી સરનામું" : "IP Address"}
              </span>
              <p className="text-xs font-mono text-[#0F172A] mt-0.5 tabular-nums">
                {displayEvent.ipAddress || "Internal"}
              </p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-[#64748B] block">
                {lang === "gu" ? "રેકોર્ડ આઈડી" : "Record ID"}
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs font-mono text-[#0F172A] truncate max-w-[95px]">
                  {displayEvent.entityId || "—"}
                </span>
                {displayEvent.entityId && (
                  <button
                    onClick={handleCopyId}
                    className="text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer"
                    title="Copy ID"
                  >
                    {copiedId ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (No Raw JSON!) */}
        <div className="flex border-b border-[#E2E8F0] px-5 sm:px-6 bg-white shrink-0">
          <button
            onClick={() => setActiveTab("diff")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === "diff"
                ? "border-[#1677E8] text-[#1677E8]"
                : "border-transparent text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            {lang === "gu" ? "શું બદલાયું" : "What Changed"}
            {hasDiffs && (
              <span className="ml-1 text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-slate-100 text-[#0F172A] border border-slate-200">
                {visibleChanges.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("snapshot")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === "snapshot"
                ? "border-[#1677E8] text-[#1677E8]"
                : "border-transparent text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            {lang === "gu" ? "રેકોર્ડ વિગતો" : "Record Details"}
          </button>

          <button
            onClick={() => setActiveTab("meta")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === "meta"
                ? "border-[#1677E8] text-[#1677E8]"
                : "border-transparent text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            {lang === "gu" ? "સત્ર અને સુરક્ષા વિગત" : "Session & Audit Info"}
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {activeTab === "diff" && (
            <div className="space-y-3">
              {hasDiffs ? (
                <>
                  {hiddenCount > 0 && (
                    <div className="flex items-center justify-between text-xs text-[#64748B] bg-[#F8FAFC] px-3 py-2 rounded-lg border border-[#E2E8F0]">
                      <span>
                        {lang === "gu"
                          ? `${meaningfulChanges.length} મુખ્ય ફેરફારો દેખાય છે (${hiddenCount} આંતરિક ID/સમય ફીલ્ડ્સ છુપાયેલ છે)`
                          : `Showing ${meaningfulChanges.length} key field(s) (${hiddenCount} internal ID/timestamp fields hidden)`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAllFields((v) => !v)}
                        className="text-[#1677E8] font-semibold hover:underline cursor-pointer"
                      >
                        {showAllFields
                          ? lang === "gu"
                            ? "ફક્ત મુખ્ય બતાવો"
                            : "Show Key Fields"
                          : lang === "gu"
                            ? "બધા બતાવો"
                            : "Show All Fields"}
                      </button>
                    </div>
                  )}

                  <div className="border border-[#E2E8F0] rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold text-[11px]">
                          <th className="py-2.5 px-3.5 w-[32%]">
                            {lang === "gu" ? "ફીલ્ડ" : "Field"}
                          </th>
                          <th className="py-2.5 px-3.5 w-[34%]">
                            {lang === "gu" ? "પહેલાં (Old)" : "Before (Old)"}
                          </th>
                          <th className="py-2.5 px-3.5 w-[34%]">
                            {lang === "gu" ? "પછી (New)" : "After (New)"}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {visibleChanges.map((ch, idx) => {
                          const hasOld =
                            ch.oldValue !== null &&
                            ch.oldValue !== undefined &&
                            ch.oldValue !== "";
                          const hasNew =
                            ch.newValue !== null &&
                            ch.newValue !== undefined &&
                            ch.newValue !== "";
                          return (
                            <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                              <td className="py-2.5 px-3.5 font-semibold text-[#0F172A] align-top">
                                <div>{ch.label || humanizeFieldKey(ch.field)}</div>
                              </td>
                              <td className="py-2.5 px-3.5 text-xs align-top">
                                {hasOld ? (
                                  <span className="inline-block px-2 py-0.5 rounded bg-rose-50 text-rose-700 line-through break-all">
                                    {formatScalarValue(ch.oldValue)}
                                  </span>
                                ) : (
                                  <span className="text-[#94A3B8]">—</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3.5 text-xs align-top">
                                {hasNew ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold break-all">
                                    {hasOld && <ArrowRight className="w-3 h-3 shrink-0" />}
                                    {formatScalarValue(ch.newValue)}
                                  </span>
                                ) : (
                                  <span className="text-[#94A3B8]">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : isCreate ? (
                <div className="p-5 border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="text-sm font-semibold text-[#0F172A]">
                    {lang === "gu" ? "નવો રેકોર્ડ ઉમેરાયેલ છે" : "New Record Created"}
                  </h4>
                  <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                    {lang === "gu"
                      ? "આ ક્રિયાથી નવો રેકોર્ડ બન્યો છે. બધી વિગતો 'રેકોર્ડ વિગતો' ટેબમાં જુઓ."
                      : "This action created a new record. Switch to 'Record Details' to view all saved values."}
                  </p>
                </div>
              ) : isDelete ? (
                <div className="p-5 border border-[#E2E8F0] rounded-xl bg-rose-50/40 text-center space-y-2">
                  <Trash2 className="w-8 h-8 text-rose-600 mx-auto" />
                  <h4 className="text-sm font-semibold text-[#0F172A]">
                    {lang === "gu" ? "રેકોર્ડ સિસ્ટમમાંથી કાઢી નાખેલ છે" : "Record Deleted"}
                  </h4>
                  <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                    {lang === "gu"
                      ? "કાઢી નાખતા પહેલાનો ડેટા 'રેકોર્ડ વિગતો' ટેબમાં સુરક્ષિત છે."
                      : "Its last known state prior to deletion is archived in 'Record Details'."}
                  </p>
                </div>
              ) : (
                <div className="p-5 border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-[#64748B] mx-auto" />
                  <h4 className="text-sm font-semibold text-[#0F172A]">
                    {lang === "gu" ? "કોઈ ફીલ્ડ ફેરફારો નથી" : "No Field-Level Changes"}
                  </h4>
                  <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                    {lang === "gu"
                      ? "આ ક્રિયા લોગિન, સેશન અથવા સ્ટેટસ ઇવેન્ટ સાથે સંબંધિત છે."
                      : "This event represents a session, login, or status action without field-level edits."}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "snapshot" && (
            <div className="space-y-4">
              {isHydrating ? (
                <div className="p-6 text-center text-xs text-[#64748B] border border-[#E2E8F0] rounded-xl bg-[#F8FAFC]">
                  {lang === "gu" ? "રેકોર્ડ વિગતો લોડ થઈ રહી છે..." : "Loading record details..."}
                </div>
              ) : (
                <>
                  {displayEvent.newState && (
                    <StructuredStateCard
                      title={
                        isDelete
                          ? lang === "gu"
                            ? "કાઢી નાખતા પહેલાની વિગતો"
                            : "Archived Details Prior to Deletion"
                          : lang === "gu"
                            ? "વર્તમાન / નવી વિગતો"
                            : "Current / Saved Details"
                      }
                      state={displayEvent.newState}
                      showIds={showAllFields}
                    />
                  )}

                  {displayEvent.previousState && (
                    <StructuredStateCard
                      title={lang === "gu" ? "જૂની વિગતો (ફેરફાર પહેલાં)" : "Previous Details (Before Change)"}
                      state={displayEvent.previousState}
                      showIds={showAllFields}
                    />
                  )}

                  {!displayEvent.newState && !displayEvent.previousState && (
                    <div className="p-6 text-center text-xs text-[#64748B] border border-[#E2E8F0] rounded-xl bg-[#F8FAFC]">
                      {lang === "gu"
                        ? "આ ઇવેન્ટ માટે કોઈ રેકોર્ડ વિગતો ઉપલબ્ધ નથી."
                        : "No structured record details recorded for this event."}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === "meta" && (
            <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white divide-y divide-[#F1F5F9]">
              {[
                {
                  label: lang === "gu" ? "કાર્ય (Action)" : "Action",
                  value: `${lang === "gu" ? actionInfo.titleGu : actionInfo.title} (${displayEvent.action})`,
                },
                {
                  label: lang === "gu" ? "મોડ્યુલ" : "Module",
                  value: lang === "gu" ? moduleInfo.labelGu : moduleInfo.label,
                },
                {
                  label: lang === "gu" ? "સમય અને તારીખ" : "Date & Time",
                  value: new Date(displayEvent.timestamp).toLocaleString("en-IN", {
                    dateStyle: "full",
                    timeStyle: "medium",
                  }),
                },
                {
                  label: lang === "gu" ? "યુઝર નામ" : "User Name",
                  value: displayEvent.userName || "System",
                },
                ...(operatorPhone
                  ? [{ label: lang === "gu" ? "ફોન નંબર" : "Phone", value: operatorPhone }]
                  : []),
                ...(displayEvent.userEmail
                  ? [{ label: lang === "gu" ? "ઈમેલ" : "Email", value: displayEvent.userEmail }]
                  : []),
                {
                  label: lang === "gu" ? "ભૂમિકા (Role)" : "Role",
                  value: humanizeFieldKey((displayEvent.userRole || "Admin").toLowerCase()),
                },
                ...(displayEvent.companyName
                  ? [{ label: lang === "gu" ? "કંપની" : "Company", value: displayEvent.companyName }]
                  : []),
                {
                  label: lang === "gu" ? "આઈપી સરનામું" : "IP Address",
                  value: displayEvent.ipAddress || "Internal",
                },
                {
                  label: lang === "gu" ? "બ્રાઉઝર / ડિવાઇસ" : "Browser / Device",
                  value: displayEvent.userAgent || "—",
                },
                {
                  label: lang === "gu" ? "રેકોર્ડ આઈડી" : "Record ID",
                  value: displayEvent.entityId || "—",
                },
                {
                  label: lang === "gu" ? "ઓડિટ ઇવેન્ટ આઈડી" : "Audit Event ID",
                  value: displayEvent.id,
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4"
                >
                  <div className="sm:w-44 shrink-0 text-xs font-medium text-[#64748B]">
                    {row.label}
                  </div>
                  <div className="flex-1 min-w-0 text-xs font-medium text-[#0F172A] break-words">
                    {row.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-[#E2E8F0] bg-white flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-[#64748B] truncate">
            {lang === "gu" ? "સુરક્ષિત ઓડિટ ટ્રેઇલ" : "Tamper-evident audit log"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-[#0F172A] bg-white border border-[#CBD5E1] rounded-lg hover:bg-[#F1F5F9] transition-colors cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            {lang === "gu" ? "બંધ કરો" : "Close"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
