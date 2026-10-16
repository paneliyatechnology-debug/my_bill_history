"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";
import { Badge } from "../../../components/ui/badge";
import { DataTable, ColumnDef } from "../../../components/ui/data-table";

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-border shadow-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {lang === "gu"
                ? "સ્ટોક આવક-જાવક હિસાબ (Stock Movements)"
                : "Stock Movement Audit Ledger"}
            </h1>
          </div>
          <p className="text-xs text-muted mt-1">
            {lang === "gu"
              ? "વેચાણ રવાનગી, પરત અને એડજસ્ટમેન્ટનો હિસાબ"
              : "Append-only immutable audit trail for every physical stock transaction"}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-medium">
          {error}
        </div>
      )}

      {/* Main DataTable */}
      <DataTable<StockMovement>
        data={movements}
        columns={[
          {
            header: lang === "gu" ? "તારીખ" : "Date",
            accessorKey: "transactionDate",
            sortable: true,
            cell: (m) => (
              <span className="font-mono text-slate-600">
                {new Date(m.transactionDate).toLocaleDateString("en-IN")}
              </span>
            ),
          },
          {
            header: lang === "gu" ? "વસ્તુ" : "Item",
            accessorKey: "itemId",
            sortable: true,
            cell: (m) => (
              <span className="font-semibold text-slate-900">
                {m.item?.name || "Inventory Item"}
              </span>
            ),
          },
          {
            header: lang === "gu" ? "વ્યવહાર પ્રકાર" : "Movement Type",
            accessorKey: "transactionType",
            sortable: true,
            cell: (m) => (
              <Badge variant={typeBadgeVariant(m.transactionType)}>
                {m.transactionType.replace("_", " ")}
              </Badge>
            ),
          },
          {
            header: lang === "gu" ? "ગોડાઉન" : "Warehouse",
            accessorKey: "warehouseId",
            sortable: true,
            cell: (m) => (
              <span className="text-slate-600">{m.warehouse?.name || "Main Godown"}</span>
            ),
          },
          {
            header: lang === "gu" ? "જથ્થો" : "Quantity",
            accessorKey: "quantity",
            sortable: true,
            className: "text-right",
            cell: (m) => {
              const isInward = [
                "OPENING",
                "PURCHASE_RECEIPT",
                "SALES_RETURN",
                "SALES_CANCELLATION",
              ].includes(m.transactionType);
              return (
                <span
                  className={`font-mono font-bold ${
                    isInward ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {isInward ? "+" : "-"}
                  {Math.abs(Number(m.quantity))}
                </span>
              );
            },
          },
        ]}
        keyExtractor={(m) => m.id}
        searchPlaceholder={
          lang === "gu"
            ? "વસ્તુ, વ્યવહાર પ્રકાર કે ગોડાઉનથી શોધો..."
            : "Search movements by item, type or warehouse..."
        }
        searchKeys={["transactionType"]}
        defaultPageSize={10}
        isLoading={isLoading}
        emptyMessage={
          lang === "gu"
            ? "કોઈ સ્ટોક વ્યવહાર નોંધાયેલ નથી"
            : "No stock movements recorded. Inward or dispatch transactions log entries automatically."
        }
        exportFilename="stock_movements_audit"
        themeColor="saffron"
        mobileCardRender={(m) => {
          const isInward = [
            "OPENING",
            "PURCHASE_RECEIPT",
            "SALES_RETURN",
            "SALES_CANCELLATION",
          ].includes(m.transactionType);
          return (
            <div key={m.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">
                  {m.item?.name || "Inventory Item"}
                </span>
                <span
                  className={`font-mono font-bold text-sm ${
                    isInward ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {isInward ? "+" : "-"}
                  {Math.abs(Number(m.quantity))}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-mono">
                  {new Date(m.transactionDate).toLocaleDateString("en-IN")}
                </span>
                <Badge variant={typeBadgeVariant(m.transactionType)}>
                  {m.transactionType.replace("_", " ")}
                </Badge>
              </div>
              <div className="text-xs text-slate-600">
                Godown: {m.warehouse?.name || "Main Godown"}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
