"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";
import { Badge, StatusBadge } from "../../../components/ui/badge";
import { StatCard } from "../../../components/ui/stat-card";
import { DataTable, ColumnDef } from "../../../components/ui/data-table";

interface StockGlRecon {
  companyId: string;
  asOfDate: string;
  physicalStockValuation: number;
  totalItemsCount: number;
  generalLedgerPurchaseTotal: number;
  inTransitValuation: number;
  transitLossValuation: number;
  manufacturingWipValuation: number;
  reconciliationVariance: number;
  isBalanced: boolean;
  notes: string[];
  openingStockValuation?: number;
  costOfGoodsSoldValuation?: number;
  expectedPeriodicInventory?: number;
  glInventoryAssetBalance?: number;
  periodicVariance?: number;
  perpetualVariance?: number;
  accountingPolicy?: "PERIODIC" | "PERPETUAL";
}

interface InTransitRecon {
  companyId: string;
  totalInTransitQuantity: number;
  totalInTransitValuation: number;
  transfersCount: number;
  transfers: Array<{
    transferId: string;
    transferNumber: string;
    fromWarehouse: string;
    toWarehouse: string;
    dispatchedAt: string;
    itemsCount: number;
    inTransitQuantity: number;
    inTransitValuation: number;
  }>;
}

interface ManufacturingCostRecon {
  companyId: string;
  totalOrdersCount: number;
  totalRawMaterialCost: number;
  totalActualLaborCost: number;
  totalActualOverheadCost: number;
  totalProductionCost: number;
  totalFinishedValuationYield: number;
  unabsorbedVariance: number;
}

interface WarehouseOption {
  id: string;
  name: string;
}

export default function InventoryReconciliationPage() {
  const { lang, tenantContext, user } = useAuth();
  const [activeTab, setActiveTab] = useState<"stock-gl" | "in-transit" | "manufacturing">("stock-gl");

  // Filters
  const [asOfDate, setAsOfDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);

  // Data states
  const [stockGlData, setStockGlData] = useState<StockGlRecon | null>(null);
  const [inTransitData, setInTransitData] = useState<InTransitRecon | null>(null);
  const [mfgCostData, setMfgCostData] = useState<ManufacturingCostRecon | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);

  // Load warehouses
  useEffect(() => {
    async function loadWarehouses() {
      try {
        const res: any = await apiClient.get("/warehouses");
        setWarehouses(extractList(res));
      } catch {
        // ignore
      }
    }
    if (tenantContext.companyId) {
      loadWarehouses();
    }
  }, [tenantContext.companyId]);

  // Fetch reconciliation data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsPermissionDenied(false);

    const queryParams: Record<string, string> = {};
    if (asOfDate) queryParams.asOfDate = asOfDate;
    if (warehouseId) queryParams.warehouseId = warehouseId;

    try {
      const [reconRes, transitRes, mfgRes]: any = await Promise.all([
        apiClient.get("/reconciliation/stock-gl", queryParams),
        apiClient.get("/reconciliation/in-transit", queryParams),
        apiClient.get("/reconciliation/manufacturing-cost", queryParams),
      ]);

      setStockGlData(reconRes);
      setInTransitData(transitRes);
      setMfgCostData(mfgRes);
    } catch (err: any) {
      if (err.statusCode === 403 || err.message?.includes("Forbidden")) {
        setIsPermissionDenied(true);
      } else {
        setError(err.message || "Failed to load reconciliation data.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [asOfDate, warehouseId]);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchData();
    }
  }, [tenantContext.companyId, fetchData]);

  // Total owned inventory value = Physical + InTransit + WIP
  const totalOwnedValuation =
    (Number(stockGlData?.physicalStockValuation) || 0) +
    (Number(stockGlData?.inTransitValuation) || 0) +
    (Number(stockGlData?.manufacturingWipValuation) || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {lang === "gu"
              ? "ઇન્વેન્ટરી અને ખાતાવહી મેળવણી (Inventory Reconciliation)"
              : "Inventory & General Ledger Reconciliation"}
          </h1>
          <p className="text-xs text-slate-500">
            {lang === "gu"
              ? "વાસ્તવિક સ્ટોક સિલક, ઇન-ટ્રાન્ઝિટ માલ, મેન્યુફેક્ચરિંગ WIP અને જનરલ લેજર ખાતાવહીનું મેળવણું"
              : "Audited stock subledger reconciliation against GL purchase & asset ledgers under Periodic & Perpetual policies"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {stockGlData && (
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                stockGlData.isBalanced
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  stockGlData.isBalanced ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                }`}
              />
              {stockGlData.isBalanced
                ? lang === "gu"
                  ? "મેળવણું સુસંગત છે (Balanced)"
                  : "Audit Verified (₹0.00 Variance)"
                : lang === "gu"
                ? "તફાવત જણાયો (Variance Detected)"
                : `Variance: ₹${Math.abs(Number(stockGlData.reconciliationVariance)).toFixed(2)}`}
            </span>
          )}

          <button
            onClick={fetchData}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Permission Denied Banner */}
      {isPermissionDenied && (
        <div className="p-8 text-center bg-white rounded-xl border border-rose-200 shadow-sm">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-9h-4a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V8a2 2 0 00-2-2z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {lang === "gu" ? "આ અહેવાલ જોવાની પરવાનગી નથી" : "Access Restricted / Permission Denied"}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            {lang === "gu"
              ? "ઇન્વેન્ટરી અને ખાતાવહી મેળવણી જોવા માટે એકાઉન્ટન્ટ અથવા એડમિન રોલ જરૂરી છે."
              : "Financial ledger reconciliation requires Accountant, Company Admin, or Super Admin privileges."}
          </p>
        </div>
      )}

      {/* Error Banner */}
      {error && !isPermissionDenied && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchData} className="underline font-medium hover:text-rose-900 ml-4">
            {lang === "gu" ? "ફરી પ્રયાસ કરો" : "Retry"}
          </button>
        </div>
      )}

      {!isPermissionDenied && (
        <>
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
                  {lang === "gu" ? "તારીખ સુધી (As of Date)" : "As of Date"}
                </label>
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
                  {lang === "gu" ? "ગોડાઉન ફિલ્ટર" : "Warehouse Scope"}
                </label>
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="">{lang === "gu" ? "તમામ ગોડાઉન (All Warehouses)" : "All Warehouses"}</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Accounting Policy Indicator */}
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                Accounting Policy
              </span>
              <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {stockGlData?.accountingPolicy || "PERIODIC"} TRADING BASIS
              </span>
            </div>
          </div>

          {/* Executive Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                {lang === "gu" ? "ગોડાઉન સ્ટોક મૂલ્યાંકન" : "Physical Godown Stock"}
              </span>
              <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                ₹{Number(stockGlData?.physicalStockValuation || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {stockGlData?.totalItemsCount || 0} active catalog items
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                {lang === "gu" ? "ઇન-ટ્રાન્ઝિટ માલસામાન" : "In-Transit Inventory"}
              </span>
              <div className="text-lg font-bold font-mono text-indigo-600 mt-1">
                ₹{Number(stockGlData?.inTransitValuation || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {inTransitData?.transfersCount || 0} open dispatched transfers
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                {lang === "gu" ? "ઉત્પાદન કાર્ય (WIP)" : "Work-in-Progress (WIP)"}
              </span>
              <div className="text-lg font-bold font-mono text-amber-600 mt-1">
                ₹{Number(stockGlData?.manufacturingWipValuation || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Active production batch WIP
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                {lang === "gu" ? "કુલ માલિકી સ્ટોક મૂલ્ય" : "Total Owned Inventory"}
              </span>
              <div className="text-lg font-bold font-mono text-emerald-900 mt-1">
                ₹{totalOwnedValuation.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-emerald-700 mt-0.5 block">
                Godown + In-Transit + WIP
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-slate-200 flex gap-4 text-sm font-medium">
            <button
              onClick={() => setActiveTab("stock-gl")}
              className={`pb-3 px-1 border-b-2 font-semibold transition-colors ${
                activeTab === "stock-gl"
                  ? "border-[#F47721] text-[#F47721]"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {lang === "gu"
                ? "૧. સ્ટોક અને ખાતાવહી મેળવણી (Stock vs GL)"
                : "1. Stock vs General Ledger Reconciliation"}
            </button>
            <button
              onClick={() => setActiveTab("in-transit")}
              className={`pb-3 px-1 border-b-2 font-semibold transition-colors ${
                activeTab === "in-transit"
                  ? "border-[#F47721] text-[#F47721]"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {lang === "gu"
                ? "૨. ઇન-ટ્રાન્ઝિટ માલ વિગત"
                : "2. In-Transit Transfer Valuation"}
            </button>
            <button
              onClick={() => setActiveTab("manufacturing")}
              className={`pb-3 px-1 border-b-2 font-semibold transition-colors ${
                activeTab === "manufacturing"
                  ? "border-[#F47721] text-[#F47721]"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {lang === "gu"
                ? "૩. ઉત્પાદન ખર્ચ અને WIP"
                : "3. Manufacturing Cost & WIP Absorption"}
            </button>
          </div>

          {/* Tab Content */}
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
              <svg className="w-8 h-8 animate-spin mx-auto text-[#F47721] mb-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="text-sm font-medium">Computing live reconciliation balances...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: Stock vs GL */}
              {activeTab === "stock-gl" && stockGlData && (
                <div className="space-y-6">
                  {/* Detailed Mathematical Audit Card */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      {lang === "gu"
                        ? "પેરીયોડીક અને પરપેચ્યુઅલ ઓડિટ ગણતરી (Audit Formulas)"
                        : "Periodic & Perpetual Inventory Reconciliation Mathematics"}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Periodic Trading Model */}
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 uppercase">
                            Periodic Trading Reconciliation
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            Opening + Purchases - COGS - Transit Loss
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span className="text-slate-600">Opening Stock Valuation:</span>
                            <span className="font-mono text-slate-900">
                              +₹{Number(stockGlData.openingStockValuation || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span className="text-slate-600">Net GL Purchases (A/c 5010):</span>
                            <span className="font-mono text-slate-900">
                              +₹{Number(stockGlData.generalLedgerPurchaseTotal || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span className="text-slate-600">Cost of Goods Sold (Dispatches):</span>
                            <span className="font-mono text-slate-900">
                              -₹{Number(stockGlData.costOfGoodsSoldValuation || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span className="text-slate-600">Transit Losses / Shortage:</span>
                            <span className="font-mono text-slate-900">
                              -₹{Number(stockGlData.transitLossValuation || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between py-1.5 font-bold text-slate-900 border-b border-slate-300">
                            <span>Expected Periodic Inventory:</span>
                            <span className="font-mono text-indigo-700">
                              ₹{Number(stockGlData.expectedPeriodicInventory || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between py-1.5 font-bold text-slate-900">
                            <span>Periodic Variance:</span>
                            <span
                              className={`font-mono ${
                                Math.abs(Number(stockGlData.periodicVariance || 0)) < 0.01
                                  ? "text-emerald-700"
                                  : "text-rose-600"
                              }`}
                            >
                              ₹{Number(stockGlData.periodicVariance || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Perpetual Asset Model */}
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 uppercase">
                            Perpetual Asset Reconciliation
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            Subledger Goods vs GL Asset Ledgers
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span className="text-slate-600">Total Owned Goods (Physical + Transit + WIP):</span>
                            <span className="font-mono text-slate-900">
                              ₹{totalOwnedValuation.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span className="text-slate-600">GL Stock-in-Hand / Inventory Balance:</span>
                            <span className="font-mono text-slate-900">
                              ₹{Number(stockGlData.glInventoryAssetBalance || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between py-1.5 font-bold text-slate-900 border-b border-slate-300">
                            <span>Perpetual Variance:</span>
                            <span
                              className={`font-mono ${
                                Math.abs(Number(stockGlData.perpetualVariance || 0)) < 0.01
                                  ? "text-emerald-700"
                                  : "text-amber-700"
                              }`}
                            >
                              ₹{Number(stockGlData.perpetualVariance || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="p-2.5 bg-slate-100 rounded-lg text-[11px] text-slate-600">
                          {stockGlData.notes && stockGlData.notes[0]}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: In-Transit Details */}
              {activeTab === "in-transit" && inTransitData && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">
                        {lang === "gu" ? "રસ્તામાં રહેલ માલસામાન (In-Transit Transfers)" : "Active In-Transit Goods"}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Dispatched from source warehouses awaiting delivery receipt
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-200">
                      Total In-Transit: ₹{Number(inTransitData.totalInTransitValuation).toFixed(2)}
                    </span>
                  </div>

                  <DataTable<InTransitRecon["transfers"][number]>
                    data={inTransitData.transfers}
                    columns={[
                      {
                        id: "transferNumber",
                        header: lang === "gu" ? "ટ્રાન્સફર #" : "Transfer #",
                        accessorKey: "transferNumber",
                        sortable: true,
                        cell: (t) => <span className="font-mono font-medium text-slate-900">{t.transferNumber}</span>,
                      },
                      {
                        id: "route",
                        header: lang === "gu" ? "રૂટ (ગોડાઉન)" : "Route",
                        accessorFn: (t) => `${t.fromWarehouse} → ${t.toWarehouse}`,
                        sortable: true,
                        cell: (t) => <span className="text-slate-800 font-medium">{t.fromWarehouse} → {t.toWarehouse}</span>,
                      },
                      {
                        id: "dispatchedAt",
                        header: lang === "gu" ? "મોકલ્યા તારીખ" : "Dispatched At",
                        accessorKey: "dispatchedAt",
                        sortable: true,
                        cell: (t) => <span className="text-slate-600">{new Date(t.dispatchedAt).toLocaleDateString()}</span>,
                      },
                      {
                        id: "itemsCount",
                        header: lang === "gu" ? "આઇટમ્સ" : "Items",
                        accessorKey: "itemsCount",
                        sortable: true,
                        align: "right",
                        cell: (t) => <span className="font-mono text-slate-700">{t.itemsCount}</span>,
                      },
                      {
                        id: "inTransitQuantity",
                        header: lang === "gu" ? "રસ્તામાં જથ્થો" : "In-Transit Qty",
                        accessorKey: "inTransitQuantity",
                        sortable: true,
                        align: "right",
                        cell: (t) => <span className="font-mono font-bold text-indigo-700">{t.inTransitQuantity}</span>,
                      },
                      {
                        id: "inTransitValuation",
                        header: lang === "gu" ? "કુલ મૂલ્ય (₹)" : "Valuation (₹)",
                        accessorKey: "inTransitValuation",
                        sortable: true,
                        align: "right",
                        cell: (t) => <span className="font-mono font-bold text-slate-900">₹{Number(t.inTransitValuation).toFixed(2)}</span>,
                      },
                    ]}
                    searchPlaceholder={lang === "gu" ? "ટ્રાન્સફર # અથવા ગોડાઉન શોધો..." : "Search transfer # or warehouse..."}
                    exportFileName="in_transit_goods"
                    themeColor="saffron"
                    pageSize={10}
                    emptyState={
                      <div className="p-8 text-center text-slate-400 text-xs">
                        {lang === "gu" ? "કોઈ સક્રિય માલ રસ્તામાં નથી." : "No active goods currently in transit."}
                      </div>
                    }
                    mobileCardRender={(t) => (
                      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs">
                        <div className="flex justify-between items-start">
                          <span className="font-mono font-bold text-slate-900">{t.transferNumber}</span>
                          <span className="font-mono font-bold text-slate-900">₹{Number(t.inTransitValuation).toFixed(2)}</span>
                        </div>
                        <div className="text-slate-700 font-medium">{t.fromWarehouse} → {t.toWarehouse}</div>
                        <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-100">
                          <span>Dispatched: {new Date(t.dispatchedAt).toLocaleDateString()}</span>
                          <span className="font-mono text-indigo-700 font-bold">Qty: {t.inTransitQuantity}</span>
                        </div>
                      </div>
                    )}
                  />
                </div>
              )}

              {/* TAB 3: Manufacturing Cost & WIP */}
              {activeTab === "manufacturing" && mfgCostData && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    {lang === "gu"
                      ? "ઉત્પાદન ખર્ચ સમાવેશ અને પરિણામ મૂલ્ય (Cost Absorption Breakdown)"
                      : "Manufacturing Cost Absorption & Yield Breakdown"}
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <span className="text-slate-500 block">Raw Material Cost</span>
                      <span className="text-base font-bold font-mono text-slate-900 mt-1 block">
                        ₹{Number(mfgCostData.totalRawMaterialCost).toFixed(2)}
                      </span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <span className="text-slate-500 block">Actual Labor Cost</span>
                      <span className="text-base font-bold font-mono text-slate-900 mt-1 block">
                        ₹{Number(mfgCostData.totalActualLaborCost).toFixed(2)}
                      </span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <span className="text-slate-500 block">Actual Overhead Cost</span>
                      <span className="text-base font-bold font-mono text-slate-900 mt-1 block">
                        ₹{Number(mfgCostData.totalActualOverheadCost).toFixed(2)}
                      </span>
                    </div>

                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs">
                      <span className="text-emerald-800 block">Total Finished Yield</span>
                      <span className="text-base font-bold font-mono text-emerald-900 mt-1 block">
                        ₹{Number(mfgCostData.totalFinishedValuationYield).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                    <span className="text-slate-600">
                      Completed Production Orders Audited: <strong>{mfgCostData.totalOrdersCount}</strong>
                    </span>
                    <span className="text-slate-600">
                      Unabsorbed Cost Variance:{" "}
                      <strong className="font-mono text-slate-900">
                        ₹{Number(mfgCostData.unabsorbedVariance).toFixed(2)}
                      </strong>
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
