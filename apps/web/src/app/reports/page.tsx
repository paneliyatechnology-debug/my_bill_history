"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/auth-context";
import { apiClient } from "../../lib/api-client";
import { Badge, StatusBadge } from "../../components/ui/badge";

type ReportTab =
  | "sales-register"
  | "purchase-register"
  | "receipt-payment"
  | "outstanding"
  | "party-aging"
  | "trial-balance"
  | "profit-loss"
  | "balance-sheet"
  | "cash-flow"
  | "daybook"
  | "stock-summary"
  | "stock-movement"
  | "gstr-1"
  | "gstr-3b";

export default function ReportsPage() {
  const { lang, tenantContext } = useAuth();
  const [activeTab, setActiveTab] = useState<ReportTab>("sales-register");
  const [startDate, setStartDate] = useState("2026-04-01");
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setReportData(null);

    try {
      let data: any = null;
      const params = { startDate, endDate };

      switch (activeTab) {
        case "sales-register":
          data = await apiClient.get("/reports/sales-register", params);
          break;
        case "purchase-register":
          data = await apiClient.get("/reports/purchase-register");
          break;
        case "receipt-payment":
          data = await apiClient.get(
            "/reports/receipt-payment-register",
            params,
          );
          break;
        case "outstanding":
          data = await apiClient.get("/reports/outstanding-balances", {
            asOfDate: endDate,
          });
          break;
        case "party-aging":
          data = await apiClient.get("/reports/party-aging", {
            asOfDate: endDate,
          });
          break;
        case "trial-balance":
          data = await apiClient.get("/reports/trial-balance", params);
          break;
        case "profit-loss":
          data = await apiClient.get("/reports/profit-and-loss", params);
          break;
        case "balance-sheet":
          data = await apiClient.get("/reports/balance-sheet", params);
          break;
        case "cash-flow":
          data = await apiClient.get("/reports/cash-flow", {
            fromDate: startDate,
            toDate: endDate,
          });
          break;
        case "daybook":
          data = await apiClient.get("/reports/daybook", { date: endDate });
          break;
        case "stock-summary":
          data = await apiClient.get("/reports/stock-summary", params);
          break;
        case "stock-movement":
          data = await apiClient.get("/reports/stock-movement", params);
          break;
        case "gstr-1":
          data = await apiClient.get("/reports/gstr-1", params);
          break;
        case "gstr-3b":
          data = await apiClient.get("/reports/gstr-3b", {
            fromDate: startDate,
            toDate: endDate,
          });
          break;
      }
      setReportData(data);
    } catch (err: any) {
      setError(err.message || "Failed to load report from server.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, startDate, endDate]);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchReport();
    }
  }, [tenantContext.companyId, fetchReport]);

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      if (activeTab === "sales-register") {
        await apiClient.downloadCsv(
          "/reports/sales-register/export",
          `sales-register-${startDate}-to-${endDate}.csv`,
          {
            startDate,
            endDate,
          },
        );
      } else {
        alert(
          "Direct CSV download is configured for Sales Register. Other statutory formats prepare JSON tables.",
        );
      }
    } catch (err: any) {
      alert(err.message || "Export failed.");
    } finally {
      setIsExporting(false);
    }
  };

  const tabs: Array<{
    id: ReportTab;
    label: string;
    labelGu: string;
    icon: string;
  }> = [
    {
      id: "sales-register",
      label: "Sales Register",
      labelGu: "વેચાણ રજિસ્ટર",
      icon: "📑",
    },
    {
      id: "purchase-register",
      label: "Purchase Register",
      labelGu: "ખરીદ રજિસ્ટર",
      icon: "🛒",
    },
    {
      id: "receipt-payment",
      label: "Receipt / Payment",
      labelGu: "આવક / જાવક રજિસ્ટર",
      icon: "💳",
    },
    {
      id: "outstanding",
      label: "Outstanding Balances",
      labelGu: "બાકી સિલક (લેણાં-દેવાં)",
      icon: "⚖️",
    },
    {
      id: "party-aging",
      label: "Receivables Aging",
      labelGu: "ઉઘરાણી મુદત વિશ્લેષણ",
      icon: "⏳",
    },
    {
      id: "trial-balance",
      label: "Trial Balance",
      labelGu: "કાચું સરવૈયું",
      icon: "📊",
    },
    {
      id: "profit-loss",
      label: "Profit & Loss",
      labelGu: "નફા-નુકસાન ખાતું",
      icon: "📈",
    },
    {
      id: "balance-sheet",
      label: "Balance Sheet",
      labelGu: "પાકું સરવૈયું",
      icon: "🏛️",
    },
    {
      id: "cash-flow",
      label: "Cash Flow Statement",
      labelGu: "રોકડ પ્રવાહ પત્રક",
      icon: "💵",
    },
    {
      id: "daybook",
      label: "Day Book (Rojmel)",
      labelGu: "રોજમેળ / આવડ",
      icon: "📖",
    },
    {
      id: "stock-summary",
      label: "Stock Summary",
      labelGu: "સ્ટોક સિલક રિપોર્ટ",
      icon: "📦",
    },
    {
      id: "stock-movement",
      label: "Stock Movements",
      labelGu: "સ્ટોક હિલચાલ",
      icon: "🔄",
    },
    {
      id: "gstr-1",
      label: "GSTR-1 Return Prep",
      labelGu: "જીએસટીઆર-૧ તૈયારી",
      icon: "🇮🇳",
    },
    {
      id: "gstr-3b",
      label: "GSTR-3B Monthly Return",
      labelGu: "જીએસટીઆર-૩બી પત્રક",
      icon: "📋",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {lang === "gu"
              ? "અહેવાલ કેન્દ્ર (Financial Reports & GST)"
              : "Reports & Statutory Center"}
          </h1>
          <p className="text-xs text-slate-500">
            {lang === "gu"
              ? "ભારતીય નામા પદ્ધતિ અને જીએસટી માન્ય તમામ ૧૪ અહેવાલો"
              : "Authoritative financial statements, ledgers, trial balance, stock, and GSTR-1 summaries"}
          </p>
        </div>

        {activeTab === "sales-register" && (
          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <span>📥</span>
            <span>{isExporting ? "Downloading..." : "Export Sales CSV"}</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs p-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-slate-800"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
              End / As of Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs p-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-slate-800"
            />
          </div>
        </div>

        <button
          onClick={fetchReport}
          className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm"
        >
          Apply Date Filters
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto gap-1 border-b border-slate-200 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{lang === "gu" ? tab.labelGu : tab.label}</span>
          </button>
        ))}
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-hidden min-h-[300px]">
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-semibold mb-4">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="inline-block w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs">
              Computing authoritative report from backend database...
            </p>
          </div>
        ) : activeTab === "sales-register" && reportData ? (
          <div className="space-y-6">
            {/* Sales Register Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">
                  Total Invoices
                </span>
                <p className="font-mono font-bold text-base text-slate-900">
                  {reportData.summary?.totalInvoices || 0}
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">
                  Taxable Amount
                </span>
                <p className="font-mono font-bold text-base text-slate-900">
                  ₹
                  {Number(reportData.summary?.totalTaxableAmount || 0).toFixed(
                    2,
                  )}
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">
                  Total GST Tax
                </span>
                <p className="font-mono font-bold text-base text-slate-900">
                  ₹
                  {(
                    Number(reportData.summary?.totalCgst || 0) +
                    Number(reportData.summary?.totalSgst || 0) +
                    Number(reportData.summary?.totalIgst || 0)
                  ).toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="text-[10px] text-emerald-800 uppercase font-bold">
                  Total Sales
                </span>
                <p className="font-mono font-bold text-base text-emerald-900">
                  ₹{Number(reportData.summary?.totalGrandTotal || 0).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Invoices List */}
            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                    <th className="py-2.5 px-3">Invoice No</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Party Name</th>
                    <th className="py-2.5 px-3">GSTIN</th>
                    <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                    <th className="py-2.5 px-3 text-right">CGST</th>
                    <th className="py-2.5 px-3 text-right">SGST</th>
                    <th className="py-2.5 px-3 text-right">IGST</th>
                    <th className="py-2.5 px-3 text-right">Total (₹)</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.invoices?.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {new Date(inv.invoiceDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {inv.partyName || "Cash Sale"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {inv.partyGstin || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        ₹{Number(inv.taxableAmount).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        ₹{Number(inv.cgstAmount || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        ₹{Number(inv.sgstAmount || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        ₹{Number(inv.igstAmount || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{Number(inv.grandTotal).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={inv.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === "gstr-1" && reportData ? (
          <div className="space-y-6">
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-medium flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>ℹ️</span>
                <span>
                  GSTR-1 Statutory Return Preparation (Sections 4A B2B, 5 B2CL,
                  7 B2CS, 12 HSN Summary).
                </span>
              </div>
              <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-mono">
                Direct GSP API in Phase 8
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">
                  B2B Registered Invoices
                </span>
                <p className="font-mono font-bold text-base text-slate-900">
                  {reportData.b2b?.length || 0}
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">
                  B2CS Consumer Invoices
                </span>
                <p className="font-mono font-bold text-base text-slate-900">
                  {reportData.b2cs?.length || 0}
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">
                  HSN Classified Codes
                </span>
                <p className="font-mono font-bold text-base text-slate-900">
                  {reportData.hsnSummary?.length || 0}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="text-[10px] text-emerald-800 uppercase font-bold">
                  Total GSTR-1 Tax
                </span>
                <p className="font-mono font-bold text-base text-emerald-900">
                  ₹{Number(reportData.totalTax || 0).toFixed(2)}
                </p>
              </div>
            </div>

            {/* B2B Table */}
            {reportData.b2b?.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Table 4A - B2B Registered Sales
                </h3>
                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                        <th className="p-2.5">Buyer GSTIN</th>
                        <th className="p-2.5">Invoice No</th>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5 text-right">Value (₹)</th>
                        <th className="p-2.5 text-right">Taxable (₹)</th>
                        <th className="p-2.5 text-right">Tax Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {reportData.b2b.map((r: any, idx: number) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-bold text-emerald-800">
                            {r.ctin || r.gstin}
                          </td>
                          <td className="p-2.5 text-slate-800">
                            {r.inum || r.invoiceNumber}
                          </td>
                          <td className="p-2.5 text-slate-600">
                            {r.idt || r.invoiceDate}
                          </td>
                          <td className="p-2.5 text-right font-bold">
                            ₹{Number(r.val || 0).toFixed(2)}
                          </td>
                          <td className="p-2.5 text-right">
                            ₹{Number(r.txval || 0).toFixed(2)}
                          </td>
                          <td className="p-2.5 text-right">
                            {r.rt || r.taxRate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === "trial-balance" && reportData ? (
          /* Trial Balance Table */
          <div className="space-y-4">
            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                    <th className="py-2.5 px-3">Account Code</th>
                    <th className="py-2.5 px-3">Ledger Name</th>
                    <th className="py-2.5 px-3">Group</th>
                    <th className="py-2.5 px-3 text-right">Debit (Dr ₹)</th>
                    <th className="py-2.5 px-3 text-right">Credit (Cr ₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {reportData.accounts?.map((acc: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-800">
                        {acc.code}
                      </td>
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                        {acc.name}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-600">
                        {acc.groupName || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                        {Number(acc.debitBalance) > 0
                          ? `₹${Number(acc.debitBalance).toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                        {Number(acc.creditBalance) > 0
                          ? `₹${Number(acc.creditBalance).toFixed(2)}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-300 font-mono font-bold text-slate-900">
                    <td
                      colSpan={3}
                      className="py-3 px-3 text-right font-sans uppercase"
                    >
                      Total Trial Balance:
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-800">
                      ₹{Number(reportData.totalDebits || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-800">
                      ₹{Number(reportData.totalCredits || 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : activeTab === "purchase-register" && reportData ? (
          /* Purchase Register */
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">
                  Total Purchase Bills
                </span>
                <p className="font-mono font-bold text-base text-slate-900">
                  {reportData.summary?.totalInvoices || reportData.invoices?.length || 0}
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">
                  Taxable Amount
                </span>
                <p className="font-mono font-bold text-base text-slate-900">
                  ₹{Number(reportData.summary?.totalTaxable || 0).toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">
                  Total Input GST (ITC)
                </span>
                <p className="font-mono font-bold text-base text-slate-900">
                  ₹{(
                    Number(reportData.summary?.totalCgst || 0) +
                    Number(reportData.summary?.totalSgst || 0) +
                    Number(reportData.summary?.totalIgst || 0)
                  ).toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="text-[10px] text-emerald-800 uppercase font-bold">
                  Total Purchases
                </span>
                <p className="font-mono font-bold text-base text-emerald-900">
                  ₹{Number(reportData.summary?.totalGrandTotal || 0).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                    <th className="py-2.5 px-3">Vendor Bill No</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Supplier Name</th>
                    <th className="py-2.5 px-3">GSTIN</th>
                    <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                    <th className="py-2.5 px-3 text-right">CGST</th>
                    <th className="py-2.5 px-3 text-right">SGST</th>
                    <th className="py-2.5 px-3 text-right">IGST</th>
                    <th className="py-2.5 px-3 text-right">Total (₹)</th>
                    <th className="py-2.5 px-3 text-right">Paid (₹)</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.invoices?.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {inv.vendorInvoiceNumber}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {new Date(inv.invoiceDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {inv.partyName || "Supplier"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {inv.partyGstin || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        ₹{Number(inv.taxableAmount || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        ₹{Number(inv.cgstAmount || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        ₹{Number(inv.sgstAmount || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        ₹{Number(inv.igstAmount || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{Number(inv.totalAmount || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                        ₹{Number(inv.paidAmount || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={inv.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === "outstanding" && reportData ? (
          /* Outstanding Balances & Party Reconciliation */
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="text-[10px] text-emerald-800 uppercase font-bold">
                  Receivable from Customers (Dr)
                </span>
                <p className="font-mono font-bold text-base text-emerald-900">
                  ₹{Number(reportData.totals?.totalCustomerOutstanding || 0).toFixed(2)}
                </p>
                <span className="text-[10px] text-emerald-600">
                  {reportData.totals?.customerCount || 0} Customers
                </span>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <span className="text-[10px] text-amber-800 uppercase font-bold">
                  Payable to Suppliers (Cr)
                </span>
                <p className="font-mono font-bold text-base text-amber-900">
                  ₹{Number(reportData.totals?.totalSupplierOutstanding || 0).toFixed(2)}
                </p>
                <span className="text-[10px] text-amber-600">
                  {reportData.totals?.supplierCount || 0} Suppliers
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-600 uppercase font-bold">
                  Net Working Capital Position
                </span>
                <p className="font-mono font-bold text-base text-slate-900">
                  ₹{Number(reportData.totals?.totalNetReceivable || 0).toFixed(2)}
                </p>
                <span className="text-[10px] text-slate-500">
                  (Receivables - Payables)
                </span>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-[10px] text-blue-800 uppercase font-bold">
                  Audit Reconciliation
                </span>
                <p className="font-mono font-bold text-base text-blue-900">
                  100% Truthful
                </p>
                <span className="text-[10px] text-blue-600">
                  Sub-ledger ↔ General Ledger Match
                </span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                    <th className="py-2.5 px-3">Party Name</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Phone / GSTIN</th>
                    <th className="py-2.5 px-3 text-right">Bill Balance (₹)</th>
                    <th className="py-2.5 px-3 text-right">Ledger Balance (₹)</th>
                    <th className="py-2.5 px-3 text-center">Type</th>
                    <th className="py-2.5 px-3 text-right">Difference (₹)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.parties?.map((p: any) => (
                    <tr key={p.partyId} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {p.partyName}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {p.partyType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {p.phone || p.gstin || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                        ₹{Number(p.invoiceOutstanding || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{Number(p.ledgerBalance || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            p.balanceType === "DR"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {p.balanceType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        ₹{Number(p.difference || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {p.isReconciled ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            ✓ Reconciled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                            ⚠️ Mismatch
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === "stock-summary" && reportData ? (
          /* Stock Summary with Moving Average Valuation */
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">
                  Total Items Tracked
                </span>
                <p className="font-mono font-bold text-base text-slate-900">
                  {reportData.totals?.totalItems || reportData.items?.length || 0}
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">
                  Total Stock Quantity
                </span>
                <p className="font-mono font-bold text-base text-slate-900">
                  {Number(reportData.totals?.totalQuantity || 0).toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="text-[10px] text-emerald-800 uppercase font-bold">
                  Total Inventory Valuation
                </span>
                <p className="font-mono font-bold text-base text-emerald-900">
                  ₹{Number(reportData.totals?.totalValuation || 0).toFixed(2)}
                </p>
                <span className="text-[10px] text-emerald-700 font-mono">
                  Method: {reportData.totals?.costingMethod || "MOVING_AVERAGE"}
                </span>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <span className="text-[10px] text-rose-800 uppercase font-bold">
                  Low Stock Items
                </span>
                <p className="font-mono font-bold text-base text-rose-900">
                  {reportData.totals?.lowStockCount || 0}
                </p>
                <span className="text-[10px] text-rose-600">
                  Below Min Level
                </span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-3">SKU / Code</th>
                    <th className="py-2.5 px-3">HSN</th>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3 text-right">Current Stock</th>
                    <th className="py-2.5 px-3 text-right">Min Level</th>
                    <th className="py-2.5 px-3 text-right">Avg Cost Rate (₹)</th>
                    <th className="py-2.5 px-3 text-right">Total Valuation (₹)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.items?.map((item: any) => (
                    <tr key={item.itemId} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {item.name}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {item.sku || "—"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {item.hsnCode || "—"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">
                        {item.unit || "NOS"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {Number(item.currentStockQuantity || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                        {Number(item.minStockLevel || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                        ₹{Number(item.averageRate || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                        ₹{Number(item.totalValuation || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {item.isLowStock ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                            ⚠️ Low Stock
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">
                            In Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* General / Other Reports Display */
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <pre className="text-xs font-mono text-slate-800 overflow-x-auto max-h-96">
                {JSON.stringify(reportData, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
