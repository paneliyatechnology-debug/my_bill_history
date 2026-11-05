"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";

export interface DueInvoiceItem {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  hasExplicitDueDate: boolean;
  daysRemaining: number;
  urgencyStatus: "OVERDUE" | "DUE_TODAY" | "DUE_SOON";
  partyId?: string;
  partyName: string;
  partyPhone?: string;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  type: "SALES_INVOICE" | "PURCHASE_INVOICE";
  deepLink: string;
  actionLink: string;
  actionLabel: string;
}

interface UpcomingDuesResponse {
  dues: DueInvoiceItem[];
  totalSalesDueAmount?: number;
  totalPurchaseDueAmount?: number;
  salesCount?: number;
  purchaseCount?: number;
  totalOverdueAmount: number;
  totalDueSoonAmount: number;
  totalDueAmount: number;
  count: number;
}

export function UpcomingDuesAlertCard() {
  const { lang, tenantContext } = useAuth();
  const [data, setData] = useState<UpcomingDuesResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [daysFilter, setDaysFilter] = useState<number>(3);
  const [typeFilter, setTypeFilter] = useState<"ALL" | "SALES" | "PURCHASES">("ALL");

  const fetchDues = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<UpcomingDuesResponse>(
        "/dashboard/upcoming-dues",
        {
          days: daysFilter,
          type: typeFilter,
        }
      );
      if (res && Array.isArray(res.dues)) {
        setData(res);
      }
    } catch (err) {
      console.error("[UpcomingDues] Failed to fetch dues:", err);
    } finally {
      setIsLoading(false);
    }
  }, [daysFilter, typeFilter]);

  useEffect(() => {
    if (!tenantContext?.companyId) return;
    fetchDues();
  }, [fetchDues, tenantContext?.companyId, tenantContext?.financialYearId]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchDues();
    };
    window.addEventListener("financial-year-changed", handleRefresh);
    window.addEventListener("tenant-context-updated", handleRefresh);
    return () => {
      window.removeEventListener("financial-year-changed", handleRefresh);
      window.removeEventListener("tenant-context-updated", handleRefresh);
    };
  }, [fetchDues]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDueDate = (dateStr: string) => {
    if (!dateStr) return "";
    const clean = dateStr.split("T")[0];
    const parts = clean.split("-");
    if (parts.length === 3) {
      const year = Number(parts[0]);
      const monthIndex = Number(parts[1]) - 1;
      const day = Number(parts[2]);
      const d = new Date(year, monthIndex, day);
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
    return dateStr;
  };

  const duesList = data?.dues || [];
  const totalDue = data?.totalDueAmount || 0;
  const count = duesList.length;

  // CRITICAL USER REQUIREMENT:
  // If there are no dues (count === 0 on "ALL" or totalDue === 0), the entire section MUST be completely hidden!
  if (typeFilter === "ALL" && !isLoading && count === 0) {
    return null;
  }

  // During initial load before any data is received, do not render or flash anything
  if (isLoading && !data) {
    return null;
  }

  // If data was received and there are 0 overall dues in the company, hide completely
  if (data && data.count === 0 && typeFilter === "ALL") {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-rose-200/90 shadow-sm overflow-hidden mb-6 transition-all hover:border-rose-300">
      {/* 1. Header with Red Blinking Alert Indicator */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-50/90 via-white to-amber-50/50 border-b border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                {lang === "gu"
                  ? "આગામી બાકી લેણી અને ચૂકવણી ચેતવણી (Next 3 Days Dues)"
                  : "Upcoming Dues & Urgent Collections Alert (Next 3 Days)"}
              </h3>
              {count > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300 shadow-xs animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                  {count} {lang === "gu" ? "બિલ બાકી" : "Bills Due"}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {lang === "gu"
                ? "આગામી 3 દિવસમાં વસૂલવાના સેલ્સ બિલ (લેવાના) અને ચૂકવવાના પરચેઝ બિલ (દેવાના)ની લાઈવ યાદી"
                : "Real-time list of receivables to collect and purchase bills to pay within 3 days"}
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
          {/* Type Filter: ALL, SALES, PURCHASES */}
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTypeFilter("ALL")}
              className={`px-3 py-1 rounded-lg transition ${
                typeFilter === "ALL"
                  ? "bg-white text-rose-700 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {lang === "gu" ? "બધા ડ્યુ" : "All Dues"}
              {data?.count !== undefined && typeFilter === "ALL" ? ` (${data.count})` : ""}
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("SALES")}
              className={`px-3 py-1 rounded-lg transition ${
                typeFilter === "SALES"
                  ? "bg-white text-rose-700 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {lang === "gu" ? "↑ લેવાના (સેલ્સ)" : "↑ Receivables"}
              {data?.salesCount !== undefined ? ` (${data.salesCount})` : ""}
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("PURCHASES")}
              className={`px-3 py-1 rounded-lg transition ${
                typeFilter === "PURCHASES"
                  ? "bg-white text-rose-700 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {lang === "gu" ? "↓ ચૂકવવાના (પરચેઝ)" : "↓ Payables"}
              {data?.purchaseCount !== undefined ? ` (${data.purchaseCount})` : ""}
            </button>
          </div>

          {/* Days Horizon Filter: 3 Days, 7 Days */}
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setDaysFilter(3)}
              className={`px-2.5 py-1 rounded-lg transition ${
                daysFilter === 3
                  ? "bg-rose-600 text-white shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              3 {lang === "gu" ? "દિવસ" : "Days"}
            </button>
            <button
              type="button"
              onClick={() => setDaysFilter(7)}
              className={`px-2.5 py-1 rounded-lg transition ${
                daysFilter === 7
                  ? "bg-rose-600 text-white shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              7 {lang === "gu" ? "દિવસ" : "Days"}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Outstanding Balance Metric Ribbon */}
      <div className="px-4 sm:px-5 py-2.5 bg-rose-50/50 border-b border-rose-100 flex items-center justify-between gap-3 text-xs flex-wrap">
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          {/* Sales to Collect (લેવાના) */}
          {(data?.totalSalesDueAmount ?? 0) > 0 && (
            <div>
              <span className="text-slate-500 font-medium">
                {lang === "gu" ? "↑ લેવાના (સેલ્સ): " : "↑ To Collect: "}
              </span>
              <span className="font-extrabold text-blue-700 tabular-nums">
                {formatCurrency(data?.totalSalesDueAmount || 0)}
              </span>
            </div>
          )}

          {/* Purchases to Pay (ચૂકવવાના) */}
          {(data?.totalPurchaseDueAmount ?? 0) > 0 && (
            <div>
              <span className="text-slate-500 font-medium">
                {lang === "gu" ? "↓ ચૂકવવાના (પરચેઝ): " : "↓ To Pay: "}
              </span>
              <span className="font-extrabold text-amber-700 tabular-nums">
                {formatCurrency(data?.totalPurchaseDueAmount || 0)}
              </span>
            </div>
          )}

          {/* Net / Total Dues */}
          <div>
            <span className="text-slate-500 font-medium">
              {lang === "gu" ? "કુલ ડ્યુ રકમ: " : "Total Due: "}
            </span>
            <span className="font-extrabold text-rose-700 text-sm tabular-nums">
              {formatCurrency(totalDue)}
            </span>
          </div>

          {/* Overdue alert badge if any */}
          {Boolean(data?.totalOverdueAmount && data.totalOverdueAmount > 0) && (
            <div className="text-rose-600 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>
                {lang === "gu" ? "મુદત વીતી ગયેલ:" : "Overdue:"}{" "}
                {formatCurrency(data?.totalOverdueAmount || 0)}
              </span>
            </div>
          )}
        </div>

        {/* Quick links to full modules */}
        <div className="flex items-center gap-3">
          <Link
            href="/sales/invoices"
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1"
          >
            <span>{lang === "gu" ? "સેલ્સ ઇનવોઇસ" : "Sales Invoices"}</span>
            <span>&rarr;</span>
          </Link>
          <span className="text-slate-300">|</span>
          <Link
            href="/purchases"
            className="text-xs font-semibold text-amber-700 hover:text-amber-900 hover:underline flex items-center gap-1"
          >
            <span>{lang === "gu" ? "પરચેઝ બિલ" : "Purchase Bills"}</span>
            <span>&rarr;</span>
          </Link>
        </div>
      </div>

      {/* 3. Invoices List / Table */}
      <div className="p-4 sm:p-5">
        {isLoading ? (
          <div className="space-y-3 py-2">
            <div className="h-14 bg-slate-100 rounded-xl animate-pulse" />
            <div className="h-14 bg-slate-100 rounded-xl animate-pulse" />
          </div>
        ) : count === 0 ? (
          /* Empty state only shown if user explicitly filtered into an empty tab */
          <div className="py-6 px-4 text-center flex flex-col items-center justify-center">
            <p className="text-xs font-semibold text-slate-500">
              {typeFilter === "SALES"
                ? lang === "gu"
                  ? "આ કેટેગરીમાં કોઈ સેલ્સ લેણી બાકી નથી."
                  : "No sales receivables due in this horizon."
                : lang === "gu"
                ? "આ કેટેગરીમાં કોઈ પરચેઝ બિલ ચૂકવવાના બાકી નથી."
                : "No purchase bills due in this horizon."}
            </p>
            <button
              type="button"
              onClick={() => setTypeFilter("ALL")}
              className="mt-2 text-xs font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
            >
              {lang === "gu" ? "તમામ ડ્યુ જુઓ (Show All Dues)" : "Show All Dues"}
            </button>
          </div>
        ) : (
          /* Cards Grid of Due Bills */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
            {duesList.map((item) => {
              const isOverdue = item.daysRemaining < 0;
              const isToday = item.daysRemaining === 0;
              const isTomorrow = item.daysRemaining === 1;
              const isSales = item.type === "SALES_INVOICE";

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    isOverdue
                      ? "border-rose-300 bg-rose-50/40 hover:bg-rose-50/70"
                      : isToday
                      ? "border-amber-300 bg-amber-50/40 hover:bg-amber-50/70"
                      : isSales
                      ? "border-blue-200/90 bg-white hover:border-blue-300 hover:shadow-xs"
                      : "border-amber-200/90 bg-white hover:border-amber-300 hover:shadow-xs"
                  }`}
                >
                  <div>
                    {/* Top Badges: Type (Sales/Purchase) & Urgency */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      {/* Urgency Badge with Blinking Dot */}
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2.5 w-2.5 shrink-0">
                          <span
                            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                              isOverdue ? "bg-rose-500" : isToday ? "#FFF7ED" : "bg-blue-500"
                            }`}
                          />
                          <span
                            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                              isOverdue ? "bg-rose-600" : isToday ? "bg-amber-600" : "bg-blue-600"
                            }`}
                          />
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                            isOverdue
                              ? "bg-rose-100 text-rose-800 border border-rose-300"
                              : isToday
                              ? "bg-amber-100 text-amber-800 border border-amber-300 animate-pulse"
                              : isTomorrow
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {isOverdue
                            ? lang === "gu"
                              ? `${Math.abs(item.daysRemaining)} દિવસ મોડું`
                              : `Overdue ${Math.abs(item.daysRemaining)}d`
                            : isToday
                            ? lang === "gu"
                              ? "આજે જ ભરો!"
                              : "Due Today"
                            : isTomorrow
                            ? lang === "gu"
                              ? "આવતીકાલે Due"
                              : "Tomorrow"
                            : lang === "gu"
                            ? `${item.daysRemaining} દિવસમાં Due`
                            : `In ${item.daysRemaining}d`}
                        </span>
                      </div>

                      {/* Direction Tag: To Collect (Sales) vs To Pay (Purchase) */}
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isSales
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {isSales
                          ? lang === "gu"
                            ? "↑ લેવાના (Sales)"
                            : "↑ To Collect"
                          : lang === "gu"
                          ? "↓ ચૂકવવાના (Purchase)"
                          : "↓ To Pay"}
                      </span>
                    </div>

                    {/* Invoice Number & Due Date */}
                    <div className="mb-2">
                      <Link
                        href={item.deepLink}
                        className="text-xs font-bold text-slate-900 hover:text-[#1677E8] transition flex items-center gap-1"
                      >
                        <span className="truncate">{item.invoiceNumber}</span>
                        <span className="text-[10px] text-slate-500 font-semibold shrink-0 bg-slate-100 px-1.5 py-0.5 rounded">
                          {formatDueDate(item.dueDate)}
                        </span>
                      </Link>

                      {/* Party Name */}
                      <p className="text-xs font-semibold text-slate-700 truncate mt-0.5" title={item.partyName}>
                        <span className="text-[10px] text-slate-400 font-normal mr-1">
                          {isSales ? (lang === "gu" ? "ગ્રાહક:" : "Customer:") : (lang === "gu" ? "વેપારી:" : "Supplier:")}
                        </span>
                        {item.partyName}
                      </p>
                      {item.partyPhone && (
                        <p className="text-[10px] text-slate-400 mt-0.5">{item.partyPhone}</p>
                      )}

                      {/* Explicit Due Date Highlight */}
                      <div className="mt-1.5 flex items-center justify-between text-[11px] bg-slate-50 rounded px-2 py-1 border border-slate-100">
                        <span className="text-slate-500">{lang === "gu" ? "મુદત:" : "Due Date:"}</span>
                        <span className="font-bold text-slate-800 tabular-nums">{formatDueDate(item.dueDate)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Amounts & Action CTA */}
                  <div className="pt-2.5 border-t border-slate-200/60 mt-auto flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        {isSales
                          ? lang === "gu"
                            ? "બાકી લેણી (Due):"
                            : "Receivable:"
                          : lang === "gu"
                          ? "બાકી ચૂકવણી (Due):"
                          : "Payable:"}
                      </span>
                      <span
                        className={`text-xs sm:text-sm font-extrabold tabular-nums ${
                          isSales ? "text-blue-700" : "text-amber-800"
                        }`}
                      >
                        {formatCurrency(item.balanceAmount)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link
                        href={
                          item.actionLink
                            ? item.actionLink.includes("amount=")
                              ? item.actionLink
                              : `${item.actionLink}${item.actionLink.includes("?") ? "&" : "?"}amount=${item.balanceAmount}`
                            : isSales
                            ? `/sales/payment-in/new?partyId=${item.partyId || ""}&invoiceId=${item.id}&amount=${item.balanceAmount}`
                            : `/purchases/payment-out/new?partyId=${item.partyId || ""}&billId=${item.id}&amount=${item.balanceAmount}`
                        }
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1 text-white ${
                          isSales
                            ? "bg-blue-600 hover:bg-blue-700"
                            : "bg-amber-600 hover:bg-amber-700"
                        }`}
                      >
                        <span>
                          {isSales
                            ? lang === "gu"
                              ? "ઉઘરાણી નોંધો"
                              : "Collect"
                            : lang === "gu"
                            ? "ચુકવણી કરો"
                            : "Pay"}
                        </span>
                        <span>&rarr;</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
