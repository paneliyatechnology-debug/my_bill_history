"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";
import { Badge } from "../../../components/ui/badge";

interface StockMovement {
  id: string;
  transactionDate: string;
  transactionType: string;
  quantity: number;
  item?: { name: string; sku?: string };
  warehouse?: { name: string };
  referenceType?: string;
  referenceId?: string;
}

export default function StockMovementsPage() {
  const { lang, tenantContext } = useAuth();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMovements = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get("/invoices/stock/transactions");
      const list = extractList<StockMovement>(res);
      setMovements(list);
    } catch (err: any) {
      setError(err.message || "Failed to load stock movements.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchMovements();
    }
  }, [tenantContext.companyId, fetchMovements]);

  const typeBadgeVariant = (
    type: string,
  ): "success" | "warning" | "danger" | "info" | "neutral" => {
    if (
      [
        "OPENING",
        "PURCHASE_RECEIPT",
        "SALES_RETURN",
        "SALES_CANCELLATION",
      ].includes(type)
    ) {
      return "success";
    }
    if (["SALES_DISPATCH"].includes(type)) {
      return "warning";
    }
    return "neutral";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {lang === "gu"
              ? "સ્ટોક આવક-જાવક હિસાબ (Stock Movements)"
              : "Stock Movement Audit Ledger"}
          </h1>
          <p className="text-xs text-slate-500">
            {lang === "gu"
              ? "વેચાણ રવાનગી, પરત અને એડજસ્ટમેન્ટનો હિસાબ"
              : "Append-only immutable audit trail for every physical stock transaction"}
          </p>
        </div>
      </div>

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
                  {lang === "gu" ? "તારીખ" : "Date"}
                </th>
                <th className="py-3 px-4">
                  {lang === "gu" ? "વસ્તુ" : "Item"}
                </th>
                <th className="py-3 px-4">
                  {lang === "gu" ? "વ્યવહાર પ્રકાર" : "Movement Type"}
                </th>
                <th className="py-3 px-4">
                  {lang === "gu" ? "ગોડાઉન" : "Warehouse"}
                </th>
                <th className="py-3 px-4 text-right">
                  {lang === "gu" ? "જથ્થો" : "Quantity"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="inline-block w-6 h-6 border-2 border-[#F47721] border-t-transparent rounded-full animate-spin mb-2" />
                    <p>Loading movements...</p>
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-700 mb-1">
                      No stock movements recorded
                    </p>
                    <p className="text-[11px]">
                      Inward stock or sales dispatches will log entries here
                      automatically.
                    </p>
                  </td>
                </tr>
              ) : (
                movements.map((m) => {
                  const isInward = [
                    "OPENING",
                    "PURCHASE_RECEIPT",
                    "SALES_RETURN",
                    "SALES_CANCELLATION",
                  ].includes(m.transactionType);
                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {new Date(m.transactionDate).toLocaleDateString(
                          "en-IN",
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {m.item?.name || "Inventory Item"}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={typeBadgeVariant(m.transactionType)}>
                          {m.transactionType.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {m.warehouse?.name || "Main Godown"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span
                          className={
                            isInward ? "text-emerald-700" : "text-amber-700"
                          }
                        >
                          {isInward ? "+" : "-"}
                          {Math.abs(Number(m.quantity))}
                        </span>
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
