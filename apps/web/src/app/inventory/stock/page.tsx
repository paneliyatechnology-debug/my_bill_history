"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../../context/auth-context";
import { apiClient } from "../../../lib/api-client";
import { Badge } from "../../../components/ui/badge";
import { DataTable, ColumnDef } from "../../../components/ui/data-table";

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

  const totalInventoryValue = useMemo(() => {
    return stock.reduce((sum, s) => sum + (Number(s.closingValue) || 0), 0);
  }, [stock]);

  const stockColumns = useMemo<ColumnDef<StockSummaryRow>[]>(
    () => [
      {
        id: "itemName",
        header: lang === "gu" ? "વસ્તુનું નામ" : "Item Name",
        accessorKey: "itemName",
        sortable: true,
        className: "font-semibold text-slate-900",
      },
      {
        id: "sku",
        header: lang === "gu" ? "એસકેયુ" : "SKU",
        accessorFn: (s) => s.sku || s.itemCode || "—",
        sortable: true,
        className: "font-mono text-slate-600",
      },
      {
        id: "uom",
        header: lang === "gu" ? "એકમ" : "UOM",
        accessorKey: "uom",
        sortable: true,
        className: "text-slate-600",
      },
      {
        id: "inwardQty",
        header: lang === "gu" ? "આવક (In)" : "Inward Qty",
        accessorKey: "inwardQty",
        sortable: true,
        className: "text-right font-mono text-slate-700",
      },
      {
        id: "outwardQty",
        header: lang === "gu" ? "જાવક (Out)" : "Outward Qty",
        accessorKey: "outwardQty",
        sortable: true,
        className: "text-right font-mono text-slate-700",
      },
      {
        id: "closingQty",
        header: lang === "gu" ? "આખર સ્ટોક" : "Closing Qty",
        accessorKey: "closingQty",
        sortable: true,
        className: "text-right font-mono font-bold text-slate-900",
      },
      {
        id: "valuationRate",
        header: lang === "gu" ? "મૂલ્યાંકન દર (₹)" : "Valuation Rate (₹)",
        accessorKey: "valuationRate",
        sortable: true,
        className: "text-right font-mono text-slate-700",
        cell: (s) => `₹${Number(s.valuationRate || 0).toFixed(2)}`,
      },
      {
        id: "closingValue",
        header: lang === "gu" ? "કુલ મૂલ્ય (₹)" : "Closing Value (₹)",
        accessorKey: "closingValue",
        sortable: true,
        className: "text-right font-mono font-bold text-emerald-800",
        cell: (s) => `₹${Number(s.closingValue || 0).toFixed(2)}`,
      },
      {
        id: "status",
        header: lang === "gu" ? "સ્થિતિ" : "Stock Alert",
        cell: (s) => {
          const isLowStock =
            s.minStockLevel !== undefined && s.closingQty <= s.minStockLevel;
          return isLowStock ? (
            <Badge variant="danger">
              {lang === "gu" ? "ઓછો સ્ટોક" : "Low Stock"}
            </Badge>
          ) : s.closingQty > 0 ? (
            <Badge variant="success">
              {lang === "gu" ? "સ્ટોકમાં" : "In Stock"}
            </Badge>
          ) : (
            <Badge variant="warning">
              {lang === "gu" ? "ખાલી સ્ટોક" : "Zero Stock"}
            </Badge>
          );
        },
      },
    ],
    [lang]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-border shadow-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {lang === "gu"
                ? "સ્ટોક સિલક અને મૂલ્યાંકન (Stock Summary)"
                : "Physical Stock Summary & Valuation"}
            </h1>
          </div>
          <p className="text-xs text-muted mt-1">
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

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-xs text-rose-700 font-medium rounded-xl">
          {error}
        </div>
      )}

      {/* Stock DataTable */}
      <DataTable<StockSummaryRow>
        data={stock}
        columns={stockColumns}
        keyExtractor={(s) => s.itemId}
        searchPlaceholder={
          lang === "gu"
            ? "વસ્તુનું નામ અથવા એસકેયુ દ્વારા શોધો..."
            : "Search stock by item name or SKU..."
        }
        searchKeys={["itemName", "sku", "itemCode"]}
        customSearchFn={(s, q) =>
          Boolean(
            s.itemName.toLowerCase().includes(q) ||
              (s.sku && s.sku.toLowerCase().includes(q)) ||
              (s.itemCode && s.itemCode.toLowerCase().includes(q))
          )
        }
        isLoading={isLoading}
        lang={lang}
        themeColor="saffron"
        exportable
        exportFileName="stock_summary"
        mobileCardRender={(s) => {
          const isLowStock =
            s.minStockLevel !== undefined && s.closingQty <= s.minStockLevel;
          return (
            <div
              key={s.itemId}
              className="p-3.5 hover:bg-slate-50 transition-colors space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-900 text-sm">
                  {s.itemName}
                </span>
                {isLowStock ? (
                  <Badge variant="danger">
                    {lang === "gu" ? "ઓછો સ્ટોક" : "Low Stock"}
                  </Badge>
                ) : s.closingQty > 0 ? (
                  <Badge variant="success">
                    {lang === "gu" ? "સ્ટોકમાં" : "In Stock"}
                  </Badge>
                ) : (
                  <Badge variant="warning">
                    {lang === "gu" ? "ખાલી સ્ટોક" : "Zero Stock"}
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 font-mono">
                <span>SKU: {s.sku || s.itemCode || "—"}</span>
                <span>Unit: {s.uom}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">
                    {lang === "gu" ? "આવક" : "Inward"}
                  </span>
                  <span className="font-mono font-semibold text-slate-800">
                    {s.inwardQty}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">
                    {lang === "gu" ? "જાવક" : "Outward"}
                  </span>
                  <span className="font-mono font-semibold text-slate-800">
                    {s.outwardQty}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase block">
                    {lang === "gu" ? "આખર સ્ટોક" : "Closing"}
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {s.closingQty}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs font-mono pt-1">
                <span className="text-slate-500">
                  Rate: ₹{Number(s.valuationRate || 0).toFixed(2)}
                </span>
                <span className="font-bold text-emerald-800">
                  Value: ₹{Number(s.closingValue || 0).toFixed(2)}
                </span>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
