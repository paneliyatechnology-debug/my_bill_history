"use client";

import { formatDate } from "@/lib/date-utils";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";

export interface DueInvoiceItem {
  id: string;
  type: "SALES_INVOICE" | "PURCHASE_INVOICE";
  invoiceNumber: string;
  partyId?: string;
  partyName: string;
  dueDate: string;
  daysRemaining: number;
  balanceAmount: number;
  invoiceDate?: string;
  hasExplicitDueDate?: boolean;
  urgencyStatus?: "OVERDUE" | "DUE_TODAY" | "DUE_SOON";
  partyPhone?: string;
  grandTotal?: number;
  paidAmount?: number;
  deepLink?: string;
  actionLink?: string;
  actionLabel?: string;
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
          type: "ALL",
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
  }, [daysFilter]);

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
      return formatDate(d);
    }
    return dateStr;
  };

  const allDues = data?.dues || [];
  const salesCount = data?.salesCount ?? allDues.filter((d) => d.type === "SALES_INVOICE").length;
  const purchaseCount = data?.purchaseCount ?? allDues.filter((d) => d.type === "PURCHASE_INVOICE").length;
  const totalCount = allDues.length;

  const duesList = useMemo(() => {
    if (typeFilter === "SALES") {
      return allDues.filter((d) => d.type === "SALES_INVOICE");
    }
    if (typeFilter === "PURCHASES") {
      return allDues.filter((d) => d.type === "PURCHASE_INVOICE");
    }
    return allDues;
  }, [allDues, typeFilter]);

  const activeTotalDue = useMemo(() => {
    return duesList.reduce((sum, d) => sum + (d.balanceAmount || 0), 0);
  }, [duesList]);

  const activeOverdue = useMemo(() => {
    return duesList
      .filter((d) => d.daysRemaining < 0)
      .reduce((sum, d) => sum + (d.balanceAmount || 0), 0);
  }, [duesList]);

  // If there are no dues at all, hide section completely
  if (!isLoading && data && totalCount === 0) {
    return null;
  }

  // During initial load before any data is received, do not render or flash anything
  if (isLoading && !data) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
      {/* Header with Title, Stats, and Clean Segmented Filters */}
      <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[#EDF0F4] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE]/60 text-[#2563EB] flex items-center justify-center shrink-0 shadow-2xs">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="typo-section-heading text-[#1E293B]">
                Upcoming Dues
              </h2>
              {duesList.length > 0 && (
                <span className="typo-badge text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                  {duesList.length} Bills Due
                </span>
              )}
            </div>

            <p className="typo-page-subtitle text-[#64748B] mt-0.5 truncate">
              Due within next {daysFilter} days
              {activeTotalDue > 0 && (
                <span className="ml-1.5 font-medium text-[#1E293B]">
                  • Total: {formatCurrency(activeTotalDue)}
                </span>
              )}
              {activeOverdue > 0 && (
                <span className="ml-1.5 font-medium text-[#D45B5B]">
                  ({formatCurrency(activeOverdue)} overdue)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Filter Controls: Clean Minimalist Segmented Pills */}
        <div className="flex items-center gap-2.5 self-start md:self-center shrink-0 flex-wrap">
          {/* Type Filter: ALL, SALES, PURCHASES */}
          <div className="inline-flex rounded-xl bg-slate-100/90 p-1 text-xs border border-slate-200/80">
            <button
              type="button"
              onClick={() => setTypeFilter("ALL")}
              className={`px-3 py-1 rounded-lg transition-all ${
                typeFilter === "ALL"
                  ? "bg-[#2563EB] text-white shadow-2xs font-semibold"
                  : "text-[#64748B] hover:text-[#1E293B] font-medium"
              }`}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("SALES")}
              className={`px-3 py-1 rounded-lg transition-all ${
                typeFilter === "SALES"
                  ? "bg-[#2563EB] text-white shadow-2xs font-semibold"
                  : "text-[#64748B] hover:text-[#1E293B] font-medium"
              }`}
            >
              Receivables ({salesCount})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("PURCHASES")}
              className={`px-3 py-1 rounded-lg transition-all ${
                typeFilter === "PURCHASES"
                  ? "bg-[#2563EB] text-white shadow-2xs font-semibold"
                  : "text-[#64748B] hover:text-[#1E293B] font-medium"
              }`}
            >
              Payables ({purchaseCount})
            </button>
          </div>

          {/* Days Horizon Filter: 3 Days, 7 Days */}
          <div className="inline-flex rounded-xl bg-slate-100/90 p-1 text-xs border border-slate-200/80">
            <button
              type="button"
              onClick={() => setDaysFilter(3)}
              className={`px-3 py-1 rounded-lg transition-all ${
                daysFilter === 3
                  ? "bg-[#2563EB] text-white shadow-2xs font-semibold"
                  : "text-[#64748B] hover:text-[#1E293B] font-medium"
              }`}
            >
              3 Days
            </button>
            <button
              type="button"
              onClick={() => setDaysFilter(7)}
              className={`px-3 py-1 rounded-lg transition-all ${
                daysFilter === 7
                  ? "bg-[#2563EB] text-white shadow-2xs font-semibold"
                  : "text-[#64748B] hover:text-[#1E293B] font-medium"
              }`}
            >
              7 Days
            </button>
          </div>
        </div>
      </div>

      {/* Dues Cards Grid - Clean Professional Layout with Proper Height & Neutral Badges */}
      <div className="p-3.5 sm:p-4">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-slate-50 border border-slate-200/60 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : duesList.length === 0 ? (
          /* Empty state for filtered tab */
          <div className="py-8 px-4 text-center flex flex-col items-center justify-center">
            <p className="text-xs font-medium text-[#64748B]">
              {typeFilter === "SALES"
                ? "No sales receivables due in this period."
                : "No purchase bills due in this period."}
            </p>
            <button
              type="button"
              onClick={() => setTypeFilter("ALL")}
              className="mt-2 text-xs font-semibold text-[#2563EB] hover:underline cursor-pointer"
            >
              Show All Dues
            </button>
          </div>
        ) : (
          /* Responsive 4-Column Cards Grid - High Visibility & Clean Label Styling */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {duesList.map((item) => {
              const isOverdue = item.daysRemaining < 0;
              const isToday = item.daysRemaining === 0;
              const isTomorrow = item.daysRemaining === 1;
              const isSales = item.type === "SALES_INVOICE";

              const leftBorderColor = isOverdue
                ? "border-l-[#D45B5B]"
                : isSales
                ? "border-l-[#2563EB]"
                : "border-l-[#E58A45]";

              const dotColor = isOverdue
                ? "bg-[#D45B5B]"
                : isSales
                ? "bg-[#2563EB]"
                : "bg-[#E58A45]";

              const statusText = isOverdue
                ? `Overdue ${Math.abs(item.daysRemaining)}d`
                : isToday
                ? "Due Today"
                : isTomorrow
                ? "Due in 1d"
                : `Due in ${item.daysRemaining}d`;

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className={`p-3.5 sm:p-4 rounded-xl border border-[#E2E8F0] border-l-4 ${leftBorderColor} bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between gap-2.5 min-h-[104px]`}
                >
                  {/* Row 1: Party name + Due/Overdue Status without pastel background box */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                      <h4
                        className="text-[13px] font-bold text-[#0F172A] truncate"
                        title={item.partyName}
                      >
                        {item.partyName}
                      </h4>
                    </div>

                    <span
                      className={`text-xs font-semibold shrink-0 ${
                        isOverdue
                          ? "text-[#DC2626]"
                          : isSales
                          ? "text-[#64748B]"
                          : "text-[#B45309]"
                      }`}
                    >
                      {statusText}
                    </span>
                  </div>

                  {/* Row 2: Invoice No • Due Date */}
                  <div className="flex items-center justify-between gap-1.5 text-xs text-[#64748B]">
                    <Link
                      href={
                        item.deepLink ||
                        (isSales
                          ? `/sales/invoices/${item.id}`
                          : `/purchases/${item.id}`)
                      }
                      className="font-mono text-xs text-[#2563EB] hover:underline truncate"
                      title={item.invoiceNumber}
                    >
                      {item.invoiceNumber}
                    </Link>
                    <span className="tabular-nums shrink-0 text-xs text-[#64748B]">
                      {formatDueDate(item.dueDate)}
                    </span>
                  </div>

                  {/* Row 3: Balance Amount + Clean Corporate Collect/Pay Button */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#EDF0F4]">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-[#64748B] block leading-none mb-0.5">
                        {isSales ? "Balance" : "Payable"}
                      </span>
                      <span className="text-sm font-bold text-[#0F172A] tabular-nums block leading-tight">
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
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#0F172A] bg-white border border-[#CBD5E1] hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-2xs flex items-center gap-1.5 shrink-0"
                    >
                      <span>
                        {isSales ? "Collect" : "Pay"}
                      </span>
                      <span className="text-xs">→</span>
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
