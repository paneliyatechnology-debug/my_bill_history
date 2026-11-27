"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "../../../../context/auth-context";
import { apiClient } from "../../../../lib/api-client";
import { formatDate } from "@/lib/date-utils";
import { formatInr } from "@/components/design-system/tokens";
import { Badge } from "../../../../components/ui/badge";
import { DataTablePagination } from "../../../../components/ui/data-table-pagination";
import { ArrowLeft, RefreshCw, Search } from "lucide-react";

interface Warehouse {
  id: string;
  name: string;
  isDefault: boolean;
  address?: string;
  branchId?: string;
  createdAt: string;
}

export default function WarehouseDetailPage() {
  const params = useParams();
  const warehouseId = String(params?.id || "");
  const { lang, tenantContext } = useAuth();

  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [activeTab, setActiveTab] = useState<"stock" | "history">("stock");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [stockTotals, setStockTotals] = useState({
    totalItems: 0,
    totalQty: 0,
    totalValuation: 0,
  });
  const [movements, setMovements] = useState<any[]>([]);

  const loadWarehouseData = useCallback(async () => {
    if (!warehouseId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [whListRes, stockRes, moveRes]: any = await Promise.all([
        apiClient.get("/masters/warehouses"),
        apiClient.get("/reports/stock-summary", { warehouseId }),
        apiClient.get("/reports/stock-movement", { warehouseId }),
      ]);

      const whList: Warehouse[] = Array.isArray(whListRes) ? whListRes : [];
      const found = whList.find((w) => w.id === warehouseId) || null;
      setWarehouse(found);

      const itemsList = Array.isArray(stockRes?.items) ? stockRes.items : [];
      setStockItems(itemsList);
      setStockTotals({
        totalItems: itemsList.filter((it: any) => Number(it.currentStockQuantity || 0) !== 0).length,
        totalQty: Number(stockRes?.totals?.grandStockQuantity ?? stockRes?.summary?.totalQuantity ?? 0),
        totalValuation: Number(stockRes?.totals?.grandStockValuation ?? stockRes?.summary?.totalValuation ?? 0),
      });
      setMovements(Array.isArray(moveRes?.transactions) ? moveRes.transactions : []);
    } catch (err: any) {
      setError(err?.message || "Failed to load warehouse details.");
    } finally {
      setIsLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => {
    if (tenantContext.companyId && warehouseId) {
      loadWarehouseData();
    }
  }, [tenantContext.companyId, warehouseId, loadWarehouseData]);

  const filteredStock = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stockItems.filter(
      (it) =>
        !q ||
        String(it.name || "").toLowerCase().includes(q) ||
        String(it.sku || "").toLowerCase().includes(q) ||
        String(it.categoryName || "").toLowerCase().includes(q),
    );
  }, [stockItems, search]);

  const filteredMovements = useMemo(() => {
    const q = search.trim().toLowerCase();
    return movements.filter(
      (m) =>
        !q ||
        String(m.item || "").toLowerCase().includes(q) ||
        String(m.sku || "").toLowerCase().includes(q) ||
        String(m.docType || "").toLowerCase().includes(q) ||
        String(m.transactionType || "").toLowerCase().includes(q),
    );
  }, [movements, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search, pageSize]);

  const activeTotalRecords = activeTab === "stock" ? filteredStock.length : filteredMovements.length;
  const totalPages = Math.max(1, Math.ceil(activeTotalRecords / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedStock = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredStock.slice(start, start + pageSize);
  }, [filteredStock, safePage, pageSize]);

  const paginatedMovements = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredMovements.slice(start, start + pageSize);
  }, [filteredMovements, safePage, pageSize]);

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/masters/warehouses"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{lang === "gu" ? "બધા ગોડાઉન પર પાછા જાઓ" : "Back to Warehouses"}</span>
          </Link>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
              {warehouse?.name || (isLoading ? "Loading..." : "Warehouse Details")}
            </h1>
            {warehouse?.isDefault && <Badge variant="success">Primary Default</Badge>}
          </div>
          <p className="text-xs text-slate-500">
            {warehouse?.address || (lang === "gu" ? "આઇટમ મુજબ સ્ટોક અને જૂના સ્ટોક વ્યવહારો" : "Item-wise stock levels and movement ledger")}
          </p>
        </div>

        <button
          type="button"
          onClick={loadWarehouseData}
          disabled={isLoading}
          className="h-9 px-3.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? "animate-spin" : ""}`} />
          <span>{lang === "gu" ? "રિફ્રેશ" : "Refresh"}</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
          {error}
        </div>
      )}

      {/* Summary Strip */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        <div className="px-5 py-4">
          <span className="text-[11px] font-medium text-slate-500 block">
            {lang === "gu" ? "સ્ટોકમાં આઇટમ્સ" : "Items with Stock"}
          </span>
          <span className="text-xl font-bold text-[#0F172A] tabular-nums mt-0.5 block">
            {stockTotals.totalItems}
          </span>
        </div>
        <div className="px-5 py-4">
          <span className="text-[11px] font-medium text-slate-500 block">
            {lang === "gu" ? "કુલ જથ્થો" : "Total Quantity"}
          </span>
          <span className="text-xl font-bold text-[#0F172A] tabular-nums mt-0.5 block">
            {stockTotals.totalQty.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="px-5 py-4">
          <span className="text-[11px] font-medium text-slate-500 block">
            {lang === "gu" ? "કુલ સ્ટોક વેલ્યુ" : "Total Stock Valuation"}
          </span>
          <span className="text-xl font-bold text-[#1677E8] tabular-nums mt-0.5 block">
            {formatInr(stockTotals.totalValuation)}
          </span>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex bg-slate-100 p-1 rounded-xl self-start">
            <button
              type="button"
              onClick={() => setActiveTab("stock")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "stock" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {lang === "gu" ? "આઇટમ મુજબ સ્ટોક" : "Item-wise Stock"} ({filteredStock.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "history" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {lang === "gu" ? "જૂના સ્ટોક વ્યવહારો" : "Past Movements"} ({filteredMovements.length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === "gu" ? "આઇટમ, SKU અથવા પ્રકાર શોધો..." : "Search item, SKU or type..."}
              className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#1677E8]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading warehouse stock &amp; history...</div>
          ) : activeTab === "stock" ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase">
                <tr>
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Stock Qty</th>
                  <th className="py-3 px-4 text-right">Purchase Rate</th>
                  <th className="py-3 px-4 text-right">Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      No items found in this warehouse.
                    </td>
                  </tr>
                ) : (
                  paginatedStock.map((it) => {
                    const qty = Number(it.currentStockQuantity || 0);
                    return (
                      <tr key={it.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{it.name}</div>
                          {it.sku && <div className="text-[11px] text-slate-400">{it.sku}</div>}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{it.categoryName || "—"}</td>
                        <td
                          className={`py-3 px-4 text-right font-semibold tabular-nums ${
                            qty < 0 ? "text-rose-600" : qty === 0 ? "text-slate-400" : "text-slate-900"
                          }`}
                        >
                          {qty.toLocaleString("en-IN", { maximumFractionDigits: 2 })} {it.uomSymbol || ""}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-slate-600">
                          {formatInr(Number(it.purchaseRate || 0))}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold tabular-nums text-slate-900">
                          {formatInr(Number(it.totalValuation || 0))}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-4 text-right">Qty</th>
                  <th className="py-3 px-4 text-right">Rate</th>
                  <th className="py-3 px-4 text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      No stock movement history recorded for this warehouse yet.
                    </td>
                  </tr>
                ) : (
                  paginatedMovements.map((m) => {
                    const isIn = Number(m.quantity || 0) > 0;
                    const label = String(m.transactionType || m.docType || "MOVEMENT").replace(/_/g, " ");
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 text-slate-600 tabular-nums">{formatDate(m.date)}</td>
                        <td className="py-3 px-4">
                          <span className={`text-[11px] font-semibold ${isIn ? "text-emerald-700" : "text-rose-700"}`}>
                            {label}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          <div>{m.item}</div>
                          {m.sku && <div className="text-[11px] text-slate-400">{m.sku}</div>}
                        </td>
                        <td className={`py-3 px-4 text-right font-semibold tabular-nums ${isIn ? "text-emerald-700" : "text-rose-600"}`}>
                          {isIn ? `+${m.quantity}` : m.quantity} {m.uom || ""}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-slate-600">
                          {formatInr(Number(m.rate || 0))}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold tabular-nums text-slate-900">
                          {formatInr(Math.abs(Number(m.valuation || 0)))}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {!isLoading && activeTotalRecords > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 bg-white">
            <DataTablePagination
              currentPage={safePage}
              pageSize={pageSize}
              totalRecords={activeTotalRecords}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              pageSizeOptions={[10, 25, 50, 100]}
              lang={lang === "gu" ? "gu" : "en"}
              showFirstLast
            />
          </div>
        )}
      </div>
    </div>
  );
}
