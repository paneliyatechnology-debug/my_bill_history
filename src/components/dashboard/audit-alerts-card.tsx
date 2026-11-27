"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { formatInr } from "@/components/design-system/tokens";
import { formatDate } from "@/lib/date-utils";
import { ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";

interface AuditAlertItem {
  id: string;
  action: string;
  entityName: string;
  entityId: string;
  docNumber: string;
  amount: number;
  userName: string;
  createdAt: string;
  severity: "HIGH" | "MEDIUM";
}

export function AuditAlertsCard() {
  const { tenantContext } = useAuth();
  const [alerts, setAlerts] = useState<AuditAlertItem[]>([]);
  const [highRiskCount, setHighRiskCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!tenantContext.companyId) return;
    apiClient
      .get<any>("/dashboard/audit-alerts", { limit: 15 })
      .then((res) => {
        setAlerts(res?.alerts || []);
        setHighRiskCount(res?.highRiskCount || 0);
      })
      .catch(() => {});
  }, [tenantContext.companyId]);

  if (alerts.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors cursor-pointer text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#0F172A]">Bill Modification &amp; Fraud Audit Alerts</h3>
              {highRiskCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                  {highRiskCount} High-Risk
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {alerts.length} recent bill deletions, cancellations, or edits tracked
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-500">
                <th className="px-4 py-2.5">Action</th>
                <th className="px-4 py-2.5">Document</th>
                <th className="px-4 py-2.5">User</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
                <th className="px-4 py-2.5 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {alerts.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        a.severity === "HIGH"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {a.action}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-[#0F172A]">
                    {a.entityName} #{a.docNumber}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{a.userName}</td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                    {a.amount > 0 ? formatInr(a.amount) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-500">{formatDate(a.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
