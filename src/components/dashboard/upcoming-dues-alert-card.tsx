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
                {lang === "gu" ? "આગામી બાકી રકમ (ડ્યુ)" : "Upcoming Dues"}
              </h2>
              {count > 0 && (
                <span className="typo-badge text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                  {count} {lang === "gu" ? "બિલ બાકી" : "Bills Due"}
                </span>
              )}
            </div>

            <p className="typo-page-subtitle text-[#64748B] mt-0.5 truncate">
              {lang === "gu"
                ? `આગામી ${daysFilter} દિવસમાં બાકી લેણી/ચૂકવણી`
                : `Due within next ${daysFilter} days`}
              {totalDue > 0 && (
                <span className="ml-1.5 font-medium text-[#1E293B]">
                  • {lang === "gu" ? "કુલ: " : "Total: "}
                  {formatCurrency(totalDue)}
                </span>
              )}
              {Boolean(data?.totalOverdueAmount && data.totalOverdueAmount > 0) && (
                <span className="ml-1.5 font-medium text-[#D45B5B]">
                  ({formatCurrency(data?.totalOverdueAmount || 0)}{" "}
                  {lang === "gu" ? "મુદત વીતી ગઈ" : "overdue"})
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
              {lang === "gu" ? "બધા" : "All"}
              {data?.count !== undefined && typeFilter === "ALL" ? ` (${data.count})` : ""}
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
              {lang === "gu" ? "લેવાના" : "Receivables"}
              {data?.salesCount !== undefined ? ` (${data.salesCount})` : ""}
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
              {lang === "gu" ? "ચૂકવવાના" : "Payables"}
              {data?.purchaseCount !== undefined ? ` (${data.purchaseCount})` : ""}
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
              3 {lang === "gu" ? "દિવસ" : "Days"}
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
              7 {lang === "gu" ? "દિવસ" : "Days"}
            </button>
          </div>
        </div>
      </div>

      {/* Dues Cards Grid */}
      <div className="p-4 sm:p-5">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-slate-50 border border-slate-200/60 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : count === 0 ? (
          /* Empty state for filtered tab */
          <div className="py-8 px-4 text-center flex flex-col items-center justify-center">
            <p className="text-xs font-medium text-[#64748B]">
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
              className="mt-2 text-xs font-semibold text-[#2563EB] hover:underline cursor-pointer"
            >
              {lang === "gu" ? "તમામ ડ્યુ જુઓ" : "Show All Dues"}
            </button>
          </div>
        ) : (
          /* Responsive 3-Column Cards Grid matching Reference Image */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
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

              const statusBadgeClass = isOverdue
                ? "bg-rose-50 text-[#D45B5B] border border-rose-200/60"
                : isSales
                ? "bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]/60"
                : "bg-[#FFF7ED] text-[#E58A45] border border-[#FED7AA]/60";

              const dotColor = isOverdue
                ? "bg-[#D45B5B]"
                : isSales
                ? "bg-[#2563EB]"
                : "bg-[#E58A45]";

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className={`p-4 rounded-xl border border-[#E2E8F0] border-l-4 ${leftBorderColor} bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between`}
                >
                  <div>
                    {/* Top row: Status Pill with Dot + Type Badge */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className={`flex items-center gap-1.5 typo-badge px-2.5 py-0.5 rounded-full ${statusBadgeClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                        <span>
                          {isOverdue
                            ? lang === "gu"
                              ? `${Math.abs(item.daysRemaining)} દિવસ મોડું`
                              : `Overdue in ${Math.abs(item.daysRemaining)}d`
                            : isToday
                            ? lang === "gu"
                              ? "આજે બાકી"
                              : "Due Today"
                            : isTomorrow
                            ? lang === "gu"
                              ? "આવતીકાલે"
                              : "Due in 1 day"
                            : lang === "gu"
                            ? `${item.daysRemaining} દિવસમાં`
                            : `Due in ${item.daysRemaining} days`}
                        </span>
                      </div>

                      <span className={`typo-badge px-2 py-0.5 rounded-md border ${
                        isSales
                          ? "bg-slate-50 text-[#64748B] border-slate-200/60"
                          : "bg-orange-50/60 text-[#E58A45] border-orange-200/60"
                      }`}>
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
                      className="typo-card-heading text-[#1E293B] truncate mt-2"
                      title={item.partyName}
                    >
                      {item.partyName}
                    </h4>

                    {/* Invoice No & Due Date */}
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <Link
                        href={item.deepLink}
                        className="typo-invoice-no text-[#2563EB] hover:underline truncate"
                        title={item.invoiceNumber}
                      >
                        {item.invoiceNumber}
                      </Link>
                      <span className="typo-card-desc text-[#64748B] tabular-nums shrink-0">
                        {formatDueDate(item.dueDate)}
                      </span>
                    </div>
                  </div>

                  {/* Amount and Action CTA */}
                  <div className="pt-3 mt-3 border-t border-[#EDF0F4] flex items-center justify-between gap-2">
                    <div>
                      <span className="typo-badge text-[#94A3B8] block uppercase tracking-wider">
                        {isSales
                          ? lang === "gu"
                            ? "બાકી રકમ"
                            : "Balance"
                          : lang === "gu"
                          ? "ચૂકવવાપાત્ર"
                          : "Payable"}
                      </span>
                      <span className="typo-amount-secondary text-[#1E293B] tabular-nums">
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
                      className={`px-3.5 py-1.5 rounded-lg typo-btn-secondary shadow-2xs transition flex items-center gap-1 shrink-0 ${
                        isSales
                          ? "bg-[#EFF6FF] hover:bg-blue-100 text-[#2563EB] border border-[#BFDBFE]/60"
                          : "bg-[#FFF7ED] hover:bg-orange-100 text-[#E58A45] border border-[#FED7AA]/60"
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
