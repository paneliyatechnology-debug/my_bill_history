"use client";

import React, { useState } from "react";
import {
  X,
  Copy,
  Check,
  Clock,
  User,
  Shield,
  Laptop,
  ArrowRight,
  FileText,
  Code,
  Layers,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit3,
  PlusCircle,
} from "lucide-react";

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

function formatValue(val: any): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "object") {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

export function ActivityDetailDrawer({
  event,
  isOpen,
  onClose,
  lang = "en",
}: ActivityDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<"diff" | "snapshot" | "raw">("diff");
  const [copiedId, setCopiedId] = useState(false);

  if (!isOpen || !event) return null;

  const handleCopyId = () => {
    if (!event.entityId) return;
    navigator.clipboard.writeText(event.entityId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const isUpdate =
    event.action.includes("UPDATE") ||
    event.action.includes("EDIT") ||
    event.action.includes("CHANGE");
  const isCreate =
    event.action.includes("CREATE") ||
    event.action.includes("ADD") ||
    event.action.includes("IMPORT");
  const isDelete =
    event.action.includes("DELETE") || event.action.includes("REMOVE");

  const changesList = event.changes || [];
  const hasDiffs = changesList.length > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end transition-opacity">
      <div
        className="relative w-full max-w-2xl bg-white shadow-2xl h-full flex flex-col border-l border-[#E2E8F0] transform transition-transform duration-200 ease-out"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between bg-white shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#1677E8]" />
              <h2 className="text-base font-semibold text-[#0F172A] tracking-tight">
                {lang === "gu" ? "પ્રવૃત્તિ વિગત & ઓડિટ ડેટા" : "Activity Event & Audit Diff"}
              </h2>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              {new Date(event.timestamp).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "medium",
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Overview Header Box */}
        <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0] shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {isCreate && <PlusCircle className="w-4 h-4 text-[#0F172A]" />}
              {isUpdate && <Edit3 className="w-4 h-4 text-[#0F172A]" />}
              {isDelete && <Trash2 className="w-4 h-4 text-[#0F172A]" />}
              <span className="text-xs font-bold text-[#0F172A] tracking-wide font-mono">
                {event.action}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-[#0F172A] px-2 py-0.5 bg-white border border-[#CBD5E1] rounded">
              {event.entityName || "General"}
            </span>
          </div>

          {/* Quick Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-[#E2E8F0]/80">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#64748B] block">
                {lang === "gu" ? "ઓપરેટર" : "Operator"}
              </span>
              <p className="text-xs font-semibold text-[#0F172A] mt-0.5 truncate">
                {event.userName || "System"}
              </p>
              {event.phone && (
                <span className="text-[10px] text-[#64748B] tabular-nums block">
                  {event.phone}
                </span>
              )}
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-[#64748B] block">
                {lang === "gu" ? "ભૂમિકા" : "Role"}
              </span>
              <p className="text-xs font-semibold text-[#0F172A] mt-0.5 truncate">
                {event.userRole || "Company Admin / Staff"}
              </p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-[#64748B] block">
                {lang === "gu" ? "આઈપી સરનામું" : "IP Address"}
              </span>
              <p className="text-xs font-mono text-[#0F172A] mt-0.5 tabular-nums">
                {event.ipAddress || "Internal"}
              </p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-[#64748B] block">
                {lang === "gu" ? "સંદર્ભ આઈડી" : "Reference ID"}
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs font-mono text-[#0F172A] truncate max-w-[85px]">
                  {event.entityId || "—"}
                </span>
                {event.entityId && (
                  <button
                    onClick={handleCopyId}
                    className="text-[#64748B] hover:text-[#0F172A] transition-colors"
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#E2E8F0] px-6 bg-white shrink-0">
          <button
            onClick={() => setActiveTab("diff")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "diff"
                ? "border-[#1677E8] text-[#1677E8]"
                : "border-transparent text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            {lang === "gu" ? "મૂલ્ય ફેરફાર (Diff)" : "Field Changes (Diff)"}
            {hasDiffs && (
              <span className="ml-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-[#0F172A] border border-slate-200">
                {changesList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("snapshot")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "snapshot"
                ? "border-[#1677E8] text-[#1677E8]"
                : "border-transparent text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            {lang === "gu" ? "રેકોર્ડ સ્નેપશોટ" : "Record Snapshot"}
          </button>

          <button
            onClick={() => setActiveTab("raw")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "raw"
                ? "border-[#1677E8] text-[#1677E8]"
                : "border-transparent text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            {lang === "gu" ? "ટેકનિકલ JSON" : "Raw JSON Audit"}
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "diff" && (
            <div>
              {hasDiffs ? (
                <div className="border border-[#E2E8F0] rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold text-[11px]">
                        <th className="py-2.5 px-3 w-1/3">
                          {lang === "gu" ? "ફીલ્ડ નામ" : "Field Name"}
                        </th>
                        <th className="py-2.5 px-3 w-1/3">
                          {lang === "gu" ? "જૂનું મૂલ્ય (પહેલાં)" : "Old Value (Before)"}
                        </th>
                        <th className="py-2.5 px-3 w-1/3">
                          {lang === "gu" ? "નવું મૂલ્ય (પછી)" : "New Value (After)"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {changesList.map((ch, idx) => (
                        <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-[#0F172A]">
                            <div>{ch.label || ch.field}</div>
                            <span className="text-[10px] font-mono text-[#64748B]">
                              {ch.field}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-xs text-[#64748B] line-through bg-slate-50/50">
                            {formatValue(ch.oldValue)}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-xs font-semibold text-[#0F172A]">
                            {formatValue(ch.newValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : isCreate ? (
                <div className="p-5 border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-[#0F172A] mx-auto opacity-75" />
                  <h4 className="text-sm font-semibold text-[#0F172A]">
                    {lang === "gu" ? "નવો રેકોર્ડ ઉમેરાયેલ છે" : "New Record Created"}
                  </h4>
                  <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                    {lang === "gu"
                      ? "આ ઇવેન્ટ નવી એન્ટ્રી બનાવવાની છે. વિગતો માટે 'રેકોર્ડ સ્નેપશોટ' ટેબ જુઓ."
                      : "This event initialized a brand-new entity. Review the full created fields in the 'Record Snapshot' tab."}
                  </p>
                </div>
              ) : isDelete ? (
                <div className="p-5 border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] text-center space-y-2">
                  <Trash2 className="w-8 h-8 text-[#0F172A] mx-auto opacity-75" />
                  <h4 className="text-sm font-semibold text-[#0F172A]">
                    {lang === "gu" ? "રેકોર્ડ સિસ્ટમમાંથી કાઢી નાખેલ છે" : "Record Permanently Deleted"}
                  </h4>
                  <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                    {lang === "gu"
                      ? "આ રેકોર્ડ સિસ્ટમમાંથી કાઢવામાં આવેલ છે. કાઢી નાખતા પહેલાનો ડેટા સ્નેપશોટમાં સુરક્ષિત છે."
                      : "This document or entity was removed. Its last known state prior to deletion is archived in the Record Snapshot."}
                  </p>
                </div>
              ) : (
                <div className="p-5 border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-[#64748B] mx-auto" />
                  <h4 className="text-sm font-semibold text-[#0F172A]">
                    {lang === "gu" ? "કોઈ સીધા ફીલ્ડ ફેરફારો નથી" : "No Direct Scalar Diffs"}
                  </h4>
                  <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                    {lang === "gu"
                      ? "આ ક્રિયા સ્થિતિ અથવા પ્રમાણીકરણ સાથે સંબંધિત છે."
                      : "This action performed an event without property-level modifications. Check Record Snapshot or Raw JSON for full payload."}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "snapshot" && (
            <div className="space-y-4">
              {event.newState && (
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-2">
                    {isDelete ? "Archived State Prior to Deletion" : "New / Current State"}
                  </h4>
                  <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-[#F8FAFC] p-3.5">
                    <pre className="text-xs font-mono text-[#0F172A] overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
                      {typeof event.newState === "object"
                        ? JSON.stringify(event.newState, null, 2)
                        : String(event.newState)}
                    </pre>
                  </div>
                </div>
              )}

              {event.previousState && (
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-2">
                    Previous State (Before Modification)
                  </h4>
                  <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-[#F8FAFC] p-3.5">
                    <pre className="text-xs font-mono text-[#64748B] overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
                      {typeof event.previousState === "object"
                        ? JSON.stringify(event.previousState, null, 2)
                        : String(event.previousState)}
                    </pre>
                  </div>
                </div>
              )}

              {!event.newState && !event.previousState && (
                <div className="p-6 text-center text-xs text-[#64748B] border border-[#E2E8F0] rounded-xl bg-[#F8FAFC]">
                  No structured state payload recorded for this event.
                </div>
              )}
            </div>
          )}

          {activeTab === "raw" && (
            <div>
              <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-[#0F172A] p-4">
                <pre className="text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
                  {JSON.stringify(event, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E2E8F0] bg-white flex items-center justify-between shrink-0">
          <span className="text-[11px] text-[#64748B]">
            Cryptographically logged • Multi-tenant isolated
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#0F172A] bg-white border border-[#CBD5E1] rounded-lg hover:bg-[#F1F5F9] transition-colors"
          >
            {lang === "gu" ? "બંધ કરો" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
