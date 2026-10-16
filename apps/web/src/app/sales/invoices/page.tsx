"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";
import { StatusBadge } from "../../../components/ui/badge";
import { DataTable, ColumnDef } from "../../../components/ui/data-table";

interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  status: "DRAFT" | "ISSUED" | "PAID" | "PARTIALLY_PAID" | "CANCELLED";
  party?: {
    id: string;
    name: string;
    gstin?: string;
  };
  taxableAmount: number;
  totalTax: number;
  grandTotal: number;
  paidAmount: number;
  outstandingBalance: number;
  isB2B: boolean;
}

export default function SalesInvoicesPage() {
  const { lang, tenantContext } = useAuth();
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status Filter
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get("/invoices/sales");
      setInvoices(extractList(res));
    } catch (err: any) {
      setError(err.message || "Failed to load sales invoices.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchInvoices();
    }
  }, [tenantContext.companyId, fetchInvoices]);

  const displayInvoices = useMemo(() => {
    if (statusFilter === "ALL") return invoices;
    return invoices.filter((inv) => inv.status === statusFilter);
  }, [invoices, statusFilter]);

  // Calculate high-level summary metrics
  const totalSalesValue = invoices.reduce(
    (sum, inv) => sum + Number(inv.grandTotal || 0),
    0
  );
  const totalOutstanding = invoices.reduce(
    (sum, inv) => sum + Number(inv.outstandingBalance || 0),
    0
  );
  const totalPaid = invoices.reduce(
    (sum, inv) => sum + Number(inv.paidAmount || 0),
    0
  );

  const formatCurrency = (val: number) => {
    return (
      "₹" +
      Number(val || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  const invoiceColumns = useMemo<ColumnDef<SalesInvoice>[]>(
    () => [
      {
        id: "invoiceNumber",
        header: lang === "gu" ? "બિલ નંબર" : "Invoice No.",
        accessorKey: "invoiceNumber",
        sortable: true,
        cell: (inv) => (
          <Link
            href={`/sales/invoices/${inv.id}`}
            className="font-mono font-bold text-[#F47721] hover:text-[#D95F12] hover:underline"
          >
            {inv.invoiceNumber}
          </Link>
        ),
      },
      {
        id: "invoiceDate",
        header: lang === "gu" ? "તારીખ" : "Date",
        accessorKey: "invoiceDate",
        sortable: true,
        cell: (inv) => (
          <span className="font-mono text-[#667085]">
            {new Date(inv.invoiceDate).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        ),
      },
      {
        id: "partyName",
        header: lang === "gu" ? "ગ્રાહક" : "Customer / Party",
        accessorFn: (inv) =>
          inv.party?.name ||
          (lang === "gu" ? "રોકડા ગ્રાહક" : "Walk-in Cash Customer"),
        sortable: true,
        cell: (inv) => (
          <div>
            <div className="font-semibold text-[#202124]">
              {inv.party?.name ||
                (lang === "gu" ? "રોકડા ગ્રાહક" : "Walk-in Cash Customer")}
            </div>
            {inv.party?.gstin && (
              <div className="text-[10px] font-mono text-[#F47721] font-bold">
                GST: {inv.party.gstin}
              </div>
            )}
          </div>
        ),
      },
      {
        id: "taxableAmount",
        header: lang === "gu" ? "કરપાત્ર (₹)" : "Taxable (₹)",
        accessorKey: "taxableAmount",
        sortable: true,
        className: "text-right font-mono text-slate-700",
        cell: (inv) => formatCurrency(inv.taxableAmount || 0),
      },
      {
        id: "grandTotal",
        header: lang === "gu" ? "કુલ બિલ (₹)" : "Grand Total (₹)",
        accessorKey: "grandTotal",
        sortable: true,
        className: "text-right font-mono font-bold text-[#202124]",
        cell: (inv) => formatCurrency(inv.grandTotal),
      },
      {
        id: "outstandingBalance",
        header: lang === "gu" ? "બાકી રકમ (₹)" : "Balance (₹)",
        accessorKey: "outstandingBalance",
        sortable: true,
        className: "text-right font-mono font-semibold",
        cell: (inv) =>
          Number(inv.outstandingBalance) > 0 ? (
            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md text-xs font-semibold">
              {formatCurrency(inv.outstandingBalance)}
            </span>
          ) : (
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-xs font-semibold">
              ₹0.00
            </span>
          ),
      },
      {
        id: "status",
        header: lang === "gu" ? "સ્થિતિ" : "Status",
        accessorKey: "status",
        sortable: true,
        className: "text-center",
        cell: (inv) => <StatusBadge status={inv.status} />,
      },
      {
        id: "actions",
        header: lang === "gu" ? "કાર્ય" : "Action",
        className: "text-right",
        cell: (inv) => (
          <Link
            href={`/sales/invoices/${inv.id}`}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#F47721] hover:text-[#D95F12] px-2.5 py-1 rounded-lg hover:bg-[#FFF3E8] transition-all"
          >
            <span>{lang === "gu" ? "જુઓ / પ્રિન્ટ" : "View / Print"}</span>
            <span>→</span>
          </Link>
        ),
      },
    ],
    [lang]
  );

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full min-w-0">
      {/* 1. Header with Title and Primary Saffron Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E7EB] shadow-subtle min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-[1.75rem] font-bold text-[#202124] tracking-tight leading-tight">
            {lang === "gu"
              ? "વેચાણ બિલોની યાદી (Sales Invoices)"
              : "Sales Invoices & Billing"}
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] mt-1 leading-relaxed break-words font-normal">
            {lang === "gu"
              ? "ટેક્સ ઇન્વોઇસ, બિલ-બાય-બિલ ચુકવણી અને ગ્રાહકની બાકી રકમનું સંચાલન"
              : "GST Tax Invoices, bill-by-bill receivables, and payment allocations"}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 w-full sm:w-auto">
          <Link
            href="/sales/pos"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 bg-[#FFF3E8] hover:bg-[#FFE6D0] text-[#F47721] border border-[#F47721]/30 text-xs font-bold rounded-xl transition-all shadow-xs"
          >
            <span>⚡ {lang === "gu" ? "પીઓએસ કાઉન્ટર" : "POS Counter"}</span>
          </Link>
          <Link
            href="/sales/invoices/new"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 py-2 sm:px-5 sm:py-2.5 bg-[#F47721] hover:bg-[#D95F12] active:bg-[#B94B0A] text-white text-xs sm:text-sm font-bold rounded-xl shadow-saffron transition-all"
          >
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="truncate">
              {lang === "gu" ? "નવું બિલ બનાવો (F2)" : "Create New Bill (F2)"}
            </span>
          </Link>
        </div>
      </div>

      {/* 2. Responsive Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 min-w-0">
        {/* Total Invoices */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#E5E7EB] shadow-xs min-w-0 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider truncate">
              {lang === "gu" ? "કુલ બિલો" : "Total Invoices"}
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#FFF3E8] text-[#F47721] flex items-center justify-center shrink-0">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-2 min-w-0">
            {isLoading ? (
              <div className="h-7 w-16 bg-slate-100 animate-pulse rounded my-0.5" />
            ) : (
              <p className="text-lg sm:text-2xl font-bold font-mono text-[#202124] tracking-tight truncate">
                {invoices.length}
              </p>
            )}
            <span className="text-[10px] text-[#667085] truncate block mt-0.5">
              {invoices.filter((i) => i.status === "PAID").length}{" "}
              {lang === "gu" ? "ચૂકતે થયેલ" : "paid fully"}
            </span>
          </div>
        </div>

        {/* Total Sales Value */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#E5E7EB] shadow-xs min-w-0 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider truncate">
              {lang === "gu" ? "કુલ વેચાણ રકમ" : "Total Sales Value"}
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-[#475569] flex items-center justify-center shrink-0">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
          </div>
          <div className="mt-2 min-w-0">
            {isLoading ? (
              <div className="h-7 w-24 bg-slate-100 animate-pulse rounded my-0.5" />
            ) : (
              <p
                className="text-base sm:text-xl lg:text-2xl font-bold font-mono text-[#202124] tracking-tight truncate"
                title={formatCurrency(totalSalesValue)}
              >
                {formatCurrency(totalSalesValue)}
              </p>
            )}
            <span className="text-[10px] text-emerald-600 font-semibold truncate block mt-0.5">
              {lang === "gu" ? "તમામ ઇશ્યુ કરેલ બિલો" : "Gross billed revenue"}
            </span>
          </div>
        </div>

        {/* Received Payments */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#E5E7EB] shadow-xs min-w-0 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider truncate">
              {lang === "gu" ? "મળેલી રોકડ / રકમ" : "Received Payments"}
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-2 min-w-0">
            {isLoading ? (
              <div className="h-7 w-24 bg-slate-100 animate-pulse rounded my-0.5" />
            ) : (
              <p
                className="text-base sm:text-xl lg:text-2xl font-bold font-mono text-emerald-700 tracking-tight truncate"
                title={formatCurrency(totalPaid)}
              >
                {formatCurrency(totalPaid)}
              </p>
            )}
            <span className="text-[10px] text-[#667085] truncate block mt-0.5">
              {lang === "gu" ? "ખાતામાં જમા થયેલ" : "Settled collections"}
            </span>
          </div>
        </div>

        {/* Outstanding Due */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#E5E7EB] shadow-xs min-w-0 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider truncate">
              {lang === "gu" ? "કુલ બાકી ઉઘરાણી" : "Outstanding Due"}
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-2 min-w-0">
            {isLoading ? (
              <div className="h-7 w-24 bg-slate-100 animate-pulse rounded my-0.5" />
            ) : (
              <p
                className="text-base sm:text-xl lg:text-2xl font-bold font-mono text-amber-700 tracking-tight truncate"
                title={formatCurrency(totalOutstanding)}
              >
                {formatCurrency(totalOutstanding)}
              </p>
            )}
            <span className="text-[10px] text-amber-600 font-semibold truncate block mt-0.5">
              {invoices.filter((i) => Number(i.outstandingBalance) > 0).length}{" "}
              {lang === "gu" ? "બિલ બાકી" : "pending invoices"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Error Message Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-xs sm:text-sm text-rose-800">
          <div className="flex items-center gap-2 min-w-0">
            <svg
              className="w-5 h-5 text-rose-500 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="truncate">{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchInvoices}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs shrink-0 transition-colors shadow-xs"
          >
            {lang === "gu" ? "ફરી પ્રયાસ કરો (Retry)" : "Retry"}
          </button>
        </div>
      )}

      {/* 4. Sales Invoices DataTable */}
      <DataTable<SalesInvoice>
        data={displayInvoices}
        columns={invoiceColumns}
        keyExtractor={(inv) => inv.id}
        searchPlaceholder={
          lang === "gu"
            ? "બિલ નંબર, ગ્રાહક અથવા GSTIN શોધો..."
            : "Search invoice no., customer, GSTIN..."
        }
        searchKeys={["invoiceNumber", "status"]}
        customSearchFn={(inv, q) =>
          Boolean(
            inv.invoiceNumber.toLowerCase().includes(q) ||
              (inv.party?.name && inv.party.name.toLowerCase().includes(q)) ||
              (inv.party?.gstin && inv.party.gstin.toLowerCase().includes(q)) ||
              inv.status.toLowerCase().includes(q)
          )
        }
        isLoading={isLoading}
        lang={lang}
        themeColor="saffron"
        exportable
        exportFileName="sales_invoices"
        filtersSlot={
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by invoice status"
              className="bg-[#F8F9FB] border border-[#E5E7EB] text-xs font-semibold rounded-xl px-3 py-1.5 text-[#202124] focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#F47721] cursor-pointer"
            >
              <option value="ALL">{lang === "gu" ? "તમામ સ્થિતિ (All Statuses)" : "All Statuses"}</option>
              <option value="ISSUED">{lang === "gu" ? "ઇશ્યુ કરેલ (ISSUED)" : "ISSUED"}</option>
              <option value="PAID">{lang === "gu" ? "ચૂકતે થયેલ (PAID)" : "PAID"}</option>
              <option value="PARTIALLY_PAID">{lang === "gu" ? "અંશતઃ બાકી (PARTIALLY PAID)" : "PARTIALLY PAID"}</option>
              <option value="DRAFT">{lang === "gu" ? "કાચું બિલ (DRAFT)" : "DRAFT"}</option>
              <option value="CANCELLED">{lang === "gu" ? "રદ થયેલ (CANCELLED)" : "CANCELLED"}</option>
            </select>
          </div>
        }
        mobileCardRender={(inv) => (
          <div
            key={inv.id}
            className="p-3.5 hover:bg-[#FFFAF5] transition-colors space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <Link
                href={`/sales/invoices/${inv.id}`}
                className="font-mono font-bold text-sm text-[#F47721] hover:underline truncate"
              >
                {inv.invoiceNumber}
              </Link>
              <StatusBadge status={inv.status} />
            </div>

            <div className="flex items-start justify-between gap-2 text-xs">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[#202124] truncate">
                  {inv.party?.name ||
                    (lang === "gu"
                      ? "રોકડા ગ્રાહક (Walk-in)"
                      : "Walk-in Cash Customer")}
                </p>
                {inv.party?.gstin && (
                  <p className="text-[10px] font-mono text-[#F47721] font-bold truncate">
                    GST: {inv.party.gstin}
                  </p>
                )}
              </div>
              <span className="text-[11px] font-mono text-[#667085] shrink-0 mt-0.5">
                {new Date(inv.invoiceDate).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <span className="text-[10px] text-[#667085] uppercase tracking-wider block">
                  {lang === "gu" ? "કુલ બિલ" : "Grand Total"}
                </span>
                <span className="font-mono font-bold text-sm text-[#202124] truncate block">
                  {formatCurrency(inv.grandTotal)}
                </span>
              </div>

              <div className="text-right min-w-0">
                <span className="text-[10px] text-[#667085] uppercase tracking-wider block">
                  {lang === "gu" ? "બાકી રકમ" : "Due Balance"}
                </span>
                {Number(inv.outstandingBalance) > 0 ? (
                  <span className="font-mono font-bold text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                    {formatCurrency(inv.outstandingBalance)}
                  </span>
                ) : (
                  <span className="font-mono font-semibold text-xs text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    ₹0.00 Paid
                  </span>
                )}
              </div>
            </div>

            <div className="pt-0.5">
              <Link
                href={`/sales/invoices/${inv.id}`}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-[#FFF3E8] hover:bg-[#FFE6D0] active:bg-[#FED7AA] text-[#F47721] border border-[#F47721]/20 rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                <span>
                  {lang === "gu"
                    ? "બિલ જુઓ / પ્રિન્ટ કરો"
                    : "View / Print Bill"}
                </span>
                <span>→</span>
              </Link>
            </div>
          </div>
        )}
      />
    </div>
  );
}
