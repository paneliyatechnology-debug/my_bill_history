"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/auth-context";
import { apiClient } from "../../../lib/api-client";
import { Badge } from "../../../components/ui/badge";

interface StockSummaryRow {
  itemId: string;
  itemName: string;
  itemCode?: string;
  sku?: string;
  uom: string;
  openingQty: number;
  inwardQty: number;
  outwardQty: number;
  closingQty: number;
  valuationRate: number;
  closingValue: number;
  minStockLevel?: number;
}

export default function StockSummaryPage() {
  const { lang, tenantContext } = useAuth();
  const [stock, setStock] = useState<StockSummaryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchStock = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get("/reports/stock-summary");
      const rawRows = res?.items || (Array.isArray(res) ? res : []);
      const rows: StockSummaryRow[] = rawRows.map((r: any) => ({
        itemId: r.itemId || r.id,
        itemName: r.name || r.itemName || "Item",
        itemCode: r.itemCode,
        sku: r.sku || "—",
        uom: r.uomSymbol || r.uom || "Unit",
        openingQty: Number(r.openingQty || 0),
        inwardQty: Number(r.inwardQty || 0),
        outwardQty: Number(r.outwardQty || 0),
        closingQty: Number(r.currentStockQuantity ?? r.closingQty ?? 0),
        valuationRate: Number(r.purchaseRate ?? r.valuationRate ?? 0),
        closingValue: Number(r.totalValuation ?? r.closingValue ?? 0),
        minStockLevel: r.minStockLevel,
      }));
      setStock(rows);
    } catch (err: any) {
      setError(err.message || "Failed to load stock summary.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchStock();
    }
  }, [tenantContext.companyId, fetchStock]);

  const filtered = stock.filter((s) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.itemName.toLowerCase().includes(term) ||
      (s.sku && s.sku.toLowerCase().includes(term))
    );
  });

  const totalInventoryValue = filtered.reduce(
    (sum, s) => sum + (Number(s.closingValue) || 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-border shadow-subtle">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-6 bg-primary rounded-full inline-block"></span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {lang === "gu"
                ? "સ્ટોક સિલક અને મૂલ્યાંકન (Stock Summary)"
                : "Physical Stock Summary & Valuation"}
            </h1>
          </div>
          <p className="text-xs text-muted mt-1 ml-4.5">
            {lang === "gu"
              ? "તમામ માલસામાનની વાસ્તવિક સિલક અને WAC/FIFO મૂલ્યાંકન"
              : "Live database-backed physical quantities, inward/outward totals, and valuation"}
          </p>
        </div>

        <div className="bg-saffron-light border border-primary/25 px-5 py-2.5 rounded-xl text-right">
          <span className="text-[10px] uppercase font-bold text-primary tracking-wider block">
            {lang === "gu" ? "કુલ સ્ટોક મૂલ્યાંકન" : "Total Inventory Value"}
          </span>
          <span className="font-mono font-bold text-slate-900 text-lg">
            ₹
            {totalInventoryValue.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-border shadow-subtle flex items-center gap-3">
        <div className="relative flex-1">
          <svg
            className="w-4 h-4 absolute left-3.5 top-3 text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={lang === "gu" ? "વસ્તુનું નામ અથવા એસકેયુ દ્વારા શોધો..." : "Search stock by item name or SKU..."}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white text-slate-900 transition-all"
          />
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {error && (
          <div className="p-4 bg-rose-50 border-b border-rose-100 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">
                  {lang === "gu" ? "વસ્તુનું નામ" : "Item Name"}
                </th>
                <th className="py-3 px-4">
                  {lang === "gu" ? "એસકેયુ" : "SKU"}
                </th>
                <th className="py-3 px-4">{lang === "gu" ? "એકમ" : "UOM"}</th>
                <th className="py-3 px-4 text-right">
                  {lang === "gu" ? "આવક (In)" : "Inward Qty"}
                </th>
                <th className="py-3 px-4 text-right">
                  {lang === "gu" ? "જાવક (Out)" : "Outward Qty"}
                </th>
                <th className="py-3 px-4 text-right">
                  {lang === "gu" ? "આખર સ્ટોક" : "Closing Qty"}
                </th>
                <th className="py-3 px-4 text-right">
                  {lang === "gu" ? "મૂલ્યાંકન દર (₹)" : "Valuation Rate (₹)"}
                </th>
                <th className="py-3 px-4 text-right">
                  {lang === "gu" ? "કુલ મૂલ્ય (₹)" : "Closing Value (₹)"}
                </th>
                <th className="py-3 px-4">
                  {lang === "gu" ? "સ્થિતિ" : "Stock Alert"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="inline-block w-6 h-6 border-2 border-[#F47721] border-t-transparent rounded-full animate-spin mb-2" />
                    <p>Loading stock summary...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-700 mb-1">
                      No stock records
                    </p>
                    <p className="text-[11px]">
                      Items registered in catalog will display physical
                      quantities here.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const isLowStock =
                    s.minStockLevel !== undefined &&
                    s.closingQty <= s.minStockLevel;
                  return (
                    <tr
                      key={s.itemId}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {s.itemName}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {s.sku || s.itemCode || "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{s.uom}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {s.inwardQty}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {s.outwardQty}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {s.closingQty}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        ₹{Number(s.valuationRate || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                        ₹{Number(s.closingValue || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        {isLowStock ? (
                          <Badge variant="danger">Low Stock</Badge>
                        ) : s.closingQty > 0 ? (
                          <Badge variant="success">In Stock</Badge>
                        ) : (
                          <Badge variant="warning">Zero Stock</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
