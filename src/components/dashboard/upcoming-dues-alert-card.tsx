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

  // If there are no dues (count === 0 on "ALL" or totalDue === 0), hide section completely
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
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden mb-6">
      {/* Header with Title, Stats, and Clean Segmented Filters */}
      <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-[15px] font-semibold text-slate-900 tracking-tight">
                {lang === "gu" ? "આગામી બાકી રકમ (ડ્યુ)" : "Upcoming Dues"}
              </h2>
              {count > 0 && (
                <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                  {count} {lang === "gu" ? "બિલ બાકી" : "Bills Due"}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {lang === "gu"
                ? `આગામી ${daysFilter} દિવસમાં બાકી લેણી/ચૂકવણી`
                : `Due within next ${daysFilter} days`}
              {totalDue > 0 && (
                <span className="ml-1.5 font-semibold text-slate-800">
                  • {lang === "gu" ? "કુલ: " : "Total: "}
                  {formatCurrency(totalDue)}
                </span>
              )}
              {Boolean(data?.totalOverdueAmount && data.totalOverdueAmount > 0) && (
                <span className="ml-1.5 font-semibold text-rose-600">
                  ({formatCurrency(data?.totalOverdueAmount || 0)}{" "}
                  {lang === "gu" ? "મુદત વીતી ગઈ" : "overdue"})
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Filter Controls: Clean & Minimalist */}
        <div className="flex items-center gap-2 self-start md:self-center shrink-0 flex-wrap">
          {/* Type Filter: ALL, SALES, PURCHASES */}
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setTypeFilter("ALL")}
              className={`px-2.5 py-1 rounded-md transition ${
                typeFilter === "ALL"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {lang === "gu" ? "બધા" : "All"}
              {data?.count !== undefined && typeFilter === "ALL" ? ` (${data.count})` : ""}
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("SALES")}
              className={`px-2.5 py-1 rounded-md transition ${
                typeFilter === "SALES"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {lang === "gu" ? "લેવાના" : "Receivables"}
              {data?.salesCount !== undefined ? ` (${data.salesCount})` : ""}
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("PURCHASES")}
              className={`px-2.5 py-1 rounded-md transition ${
                typeFilter === "PURCHASES"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {lang === "gu" ? "ચૂકવવાના" : "Payables"}
              {data?.purchaseCount !== undefined ? ` (${data.purchaseCount})` : ""}
            </button>
          </div>

          {/* Days Horizon Filter: 3 Days, 7 Days */}
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setDaysFilter(3)}
              className={`px-2.5 py-1 rounded-md transition ${
                daysFilter === 3
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              3 {lang === "gu" ? "દિવસ" : "Days"}
            </button>
            <button
              type="button"
              onClick={() => setDaysFilter(7)}
              className={`px-2.5 py-1 rounded-md transition ${
                daysFilter === 7
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              7 {lang === "gu" ? "દિવસ" : "Days"}
            </button>
          </div>
        </div>
      </div>

      {/* Dues Cards Grid */}
      <div className="p-4 sm:p-5">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : count === 0 ? (
          /* Empty state for filtered tab */
          <div className="py-8 px-4 text-center flex flex-col items-center justify-center">
            <p className="text-xs font-medium text-slate-500">
              {typeFilter === "SALES"
                ? lang === "gu"
                  ? "કોઈ સેલ્સ લેણી બાકી નથી."
                  : "No sales receivables due in this period."
                : lang === "gu"
                ? "કોઈ પરચેઝ બિલ ચૂકવવાના બાકી નથી."
                : "No purchase bills due in this period."}
            </p>
            <button
              type="button"
              onClick={() => setTypeFilter("ALL")}
              className="mt-2 text-xs font-semibold text-[#1677E8] hover:underline cursor-pointer"
            >
              {lang === "gu" ? "તમામ ડ્યુ જુઓ" : "Show All Dues"}
            </button>
          </div>
        ) : (
          /* Responsive Cards Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {duesList.map((item) => {
              const isOverdue = item.daysRemaining < 0;
              const isToday = item.daysRemaining === 0;
              const isTomorrow = item.daysRemaining === 1;
              const isSales = item.type === "SALES_INVOICE";

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="p-3.5 sm:p-4 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-2xs transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Urgency Status Dot and Type Label */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isOverdue
                              ? "bg-rose-500"
                              : isToday
                              ? "bg-amber-500"
                              : "bg-blue-500"
                          }`}
                        />
                        <span
                          className={
                            isOverdue
                              ? "text-rose-600 font-semibold"
                              : isToday
                              ? "text-amber-600 font-semibold"
                              : "text-slate-600"
                          }
                        >
                          {isOverdue
                            ? lang === "gu"
                              ? `${Math.abs(item.daysRemaining)} દિવસ મોડું`
                              : `Overdue ${Math.abs(item.daysRemaining)}d`
                            : isToday
                            ? lang === "gu"
                              ? "આજે બાકી"
                              : "Due Today"
                            : isTomorrow
                            ? lang === "gu"
                              ? "આવતીકાલે"
                              : "Tomorrow"
                            : lang === "gu"
                            ? `${item.daysRemaining} દિવસમાં`
                            : `In ${item.daysRemaining}d`}
                        </span>
                      </div>

                      <span className="text-[11px] font-medium text-slate-500">
                        {isSales
                          ? lang === "gu"
                            ? "લેવાના"
                            : "Receivable"
                          : lang === "gu"
                          ? "ચૂકવવાના"
                          : "Payable"}
                      </span>
                    </div>

                    {/* Party Name */}
                    <h4
                      className="text-sm font-semibold text-slate-900 truncate"
                      title={item.partyName}
                    >
                      {item.partyName}
                    </h4>

                    {/* Invoice No & Due Date */}
                    <div className="flex items-center justify-between gap-2 mt-1 text-xs text-slate-500">
                      <Link
                        href={item.deepLink}
                        className="font-medium text-[#1677E8] hover:underline truncate"
                        title={item.invoiceNumber}
                      >
                        {item.invoiceNumber}
                      </Link>
                      <span className="tabular-nums shrink-0">
                        {formatDueDate(item.dueDate)}
                      </span>
                    </div>
                  </div>

                  {/* Amount and Action CTA */}
                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">
                        {isSales
                          ? lang === "gu"
                            ? "બાકી રકમ"
                            : "Balance"
                          : lang === "gu"
                          ? "ચૂકવવાપાત્ર"
                          : "Payable"}
                      </span>
                      <span className="text-sm sm:text-[15px] font-bold text-slate-900 tabular-nums">
                        {formatCurrency(item.balanceAmount)}
                      </span>
                    </div>

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
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition flex items-center gap-1 shrink-0 ${
                        isSales
                          ? "bg-[#1677E8] hover:bg-blue-600 text-white"
                          : "bg-slate-900 hover:bg-slate-800 text-white"
                      }`}
                    >
                      <span>
                        {isSales
                          ? lang === "gu"
                            ? "ઉઘરાણી"
                            : "Collect"
                          : lang === "gu"
                            ? "ચૂકવો"
                            : "Pay"}
                      </span>
                      <span>→</span>
                    </Link>
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
