"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";
import { Modal } from "../../../components/ui/modal";
import { Badge, StatusBadge } from "../../../components/ui/badge";

interface ProductionBatch {
  id: string;
  batchNumber: string;
  actualProducedQty: number;
  scrapQuantity: number;
  rawMaterialCost: number;
  actualLaborCost: number;
  actualOverheadCost: number;
  unitCost: number;
  completedAt: string;
}

interface ProductionOrder {
  id: string;
  companyId: string;
  bomId: string;
  orderNumber: string;
  targetQuantity: number;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  startDate: string;
  completedDate?: string;
  createdAt: string;
  bom?: {
    id: string;
    bomName: string;
    batchYieldQty: number;
    laborCostEst?: number;
    overheadCostEst?: number;
    finishedItem?: {
      id: string;
      name: string;
      sku?: string;
      primaryUom?: { name: string; code: string };
    };
    items?: Array<{
      id: string;
      quantity: number;
      wastagePercent?: number;
      rawItem?: { id: string; name: string; sku?: string };
    }>;
  };
  batches?: ProductionBatch[];
}

interface BomOption {
  id: string;
  bomName: string;
  batchYieldQty: number;
  finishedItem?: { id: string; name: string; sku?: string };
}

interface WarehouseOption {
  id: string;
  name: string;
  isDefault: boolean;
}

export default function ProductionOrdersPage() {
  const { lang, tenantContext } = useAuth();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [boms, setBoms] = useState<BomOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Forms
  const [createForm, setCreateForm] = useState({
    bomId: "",
    orderNumber: "",
    targetQuantity: 100,
    startDate: new Date().toISOString().split("T")[0],
  });

  const [startForm, setStartForm] = useState({
    sourceWarehouseId: "",
  });

  const [completeForm, setCompleteForm] = useState({
    targetWarehouseId: "",
    actualProducedQty: 100,
    scrapQuantity: 0,
    actualLaborCost: 0,
    actualOverheadCost: 0,
    batchNumber: "",
    mfgDate: new Date().toISOString().split("T")[0],
    expiryDate: "",
  });

  const [cancelForm, setCancelForm] = useState({
    reason: "",
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [orderRes, bomRes, whRes]: any = await Promise.all([
        apiClient.get("/manufacturing/orders"),
        apiClient.get("/manufacturing/boms"),
        apiClient.get("/warehouses"),
      ]);
      setOrders(extractList(orderRes));
      setBoms(extractList(bomRes));
      setWarehouses(extractList(whRes));
    } catch (err: any) {
      setError(err.message || "Failed to load production orders.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchData();
    }
  }, [tenantContext.companyId, fetchData]);

  // Handlers
  const handleOpenCreate = () => {
    setCreateForm({
      bomId: boms[0]?.id || "",
      orderNumber: `MFG-${Date.now().toString().slice(-6)}`,
      targetQuantity: boms[0]?.batchYieldQty || 1,
      startDate: new Date().toISOString().split("T")[0],
    });
    setActionError(null);
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.bomId) {
      setActionError(lang === "gu" ? "BOM રેસિપી પસંદ કરો." : "Please select a BOM.");
      return;
    }
    if (createForm.targetQuantity <= 0) {
      setActionError(lang === "gu" ? "લક્ષ્ય જથ્થો ૦ થી વધુ હોવો જોઈએ." : "Target quantity must be > 0.");
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    try {
      await apiClient.post("/manufacturing/orders", {
        bomId: createForm.bomId,
        orderNumber: createForm.orderNumber || undefined,
        targetQuantity: Number(createForm.targetQuantity),
        startDate: createForm.startDate || undefined,
      });
      setIsCreateModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setActionError(err.message || "Failed to create production order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenStart = (order: ProductionOrder) => {
    setSelectedOrder(order);
    setStartForm({
      sourceWarehouseId: warehouses[0]?.id || "",
    });
    setActionError(null);
    setIsStartModalOpen(true);
  };

  const handleStartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    if (!startForm.sourceWarehouseId) {
      setActionError(lang === "gu" ? "કાચા માલનું ગોડાઉન પસંદ કરો." : "Please select source warehouse.");
      return;
    }
    setIsSubmitting(true);
    setActionError(null);
    try {
      await apiClient.post(`/manufacturing/orders/${selectedOrder.id}/start`, {
        sourceWarehouseId: startForm.sourceWarehouseId,
      });
      setIsStartModalOpen(false);
      setSelectedOrder(null);
      await fetchData();
    } catch (err: any) {
      setActionError(err.message || "Failed to start production.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenComplete = (order: ProductionOrder) => {
    setSelectedOrder(order);
    const dateStr = new Date().toISOString().split("T")[0];
    const expiryStr = new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split("T")[0];
    setCompleteForm({
      targetWarehouseId: warehouses[0]?.id || "",
      actualProducedQty: Number(order.targetQuantity),
      scrapQuantity: 0,
      actualLaborCost: Number(order.bom?.laborCostEst || 0),
      actualOverheadCost: Number(order.bom?.overheadCostEst || 0),
      batchNumber: `BAT-${order.orderNumber}`,
      mfgDate: dateStr,
      expiryDate: expiryStr,
    });
    setActionError(null);
    setIsCompleteModalOpen(true);
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    if (completeForm.actualProducedQty <= 0) {
      setActionError(lang === "gu" ? "ઉત્પાદન જથ્થો ૦ થી વધુ હોવો જોઈએ." : "Produced quantity must be > 0.");
      return;
    }
    if (!completeForm.targetWarehouseId) {
      setActionError(lang === "gu" ? "તૈયાર માલનું ગોડાઉન પસંદ કરો." : "Please select target warehouse.");
      return;
    }
    setIsSubmitting(true);
    setActionError(null);
    try {
      await apiClient.post(`/manufacturing/orders/${selectedOrder.id}/complete`, {
        targetWarehouseId: completeForm.targetWarehouseId,
        actualProducedQty: Number(completeForm.actualProducedQty),
        scrapQuantity: Number(completeForm.scrapQuantity || 0),
        actualLaborCost: Number(completeForm.actualLaborCost || 0),
        actualOverheadCost: Number(completeForm.actualOverheadCost || 0),
        batchNumber: completeForm.batchNumber || undefined,
        mfgDate: completeForm.mfgDate || undefined,
        expiryDate: completeForm.expiryDate || undefined,
      });
      setIsCompleteModalOpen(false);
      setSelectedOrder(null);
      await fetchData();
    } catch (err: any) {
      setActionError(err.message || "Failed to complete production.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCancel = (order: ProductionOrder) => {
    setSelectedOrder(order);
    setCancelForm({ reason: "" });
    setActionError(null);
    setIsCancelModalOpen(true);
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await apiClient.post(`/manufacturing/orders/${selectedOrder.id}/cancel`, {
        reason: cancelForm.reason || "Cancelled by user",
      });
      setIsCancelModalOpen(false);
      setSelectedOrder(null);
      await fetchData();
    } catch (err: any) {
      setActionError(err.message || "Failed to cancel production order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenView = (order: ProductionOrder) => {
    setSelectedOrder(order);
    setIsViewModalOpen(true);
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const orderMatch = o.orderNumber.toLowerCase().includes(term);
    const itemMatch = o.bom?.finishedItem?.name.toLowerCase().includes(term);
    return orderMatch || itemMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {lang === "gu" ? "ઉત્પાદન ઓર્ડર (Production Orders)" : "Production Orders"}
          </h1>
          <p className="text-xs text-slate-500">
            {lang === "gu"
              ? "કાચો માલ વાપરીને તૈયાર માલનું ઉત્પાદન, બેચ કોસ્ટિંગ અને સ્ક્રેપ ટ્રેકિંગ"
              : "Manufacturing execution lifecycle: material issuance, WIP tracking, batch yield & cost absorption"}
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#F47721] hover:bg-[#D95F12] text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {lang === "gu" ? "નવો ઉત્પાદન ઓર્ડર" : "New Production Order"}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                lang === "gu"
                  ? "ઓર્ડર નંબર અથવા તૈયાર માલથી શોધો..."
                  : "Search order # or finished item..."
              }
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F47721] focus:bg-white"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {(["ALL", "PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === st
                    ? "bg-[#F47721] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st === "ALL" ? (lang === "gu" ? "બધા" : "All") : st.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-500 whitespace-nowrap">
          {lang === "gu"
            ? `કુલ ${filteredOrders.length} ઓર્ડર મળ્યા`
            : `Showing ${filteredOrders.length} order(s)`}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchData} className="underline font-medium hover:text-rose-900 ml-4">
            {lang === "gu" ? "ફરી પ્રયાસ કરો" : "Retry"}
          </button>
        </div>
      )}

      {/* Listing */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          <svg className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm font-medium">
            {lang === "gu" ? "ડેટા લોડ થઈ રહ્યો છે..." : "Loading Production Orders..."}
          </span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-slate-700">
            {lang === "gu" ? "કોઈ ઉત્પાદન ઓર્ડર મળ્યો નથી" : "No Production Orders found"}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {lang === "gu"
              ? "તૈયાર માલનું ઉત્પાદન શરૂ કરવા માટે ઓર્ડર બનાવો."
              : "Launch a production order to start material consumption and batch yield."}
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-[#FFF3E8] text-[#F47721] rounded-lg text-xs font-semibold hover:bg-[#F47721] hover:text-white transition-colors"
          >
            + {lang === "gu" ? "પ્રથમ ઓર્ડર બનાવો" : "Create First Order"}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 font-semibold">{lang === "gu" ? "ઓર્ડર નંબર" : "Order #"}</th>
                  <th className="px-6 py-3 font-semibold">{lang === "gu" ? "તૈયાર માલ / BOM" : "Finished Item / BOM"}</th>
                  <th className="px-6 py-3 font-semibold text-right">{lang === "gu" ? "લક્ષ્ય જથ્થો" : "Target Qty"}</th>
                  <th className="px-6 py-3 font-semibold text-center">{lang === "gu" ? "સ્થિતિ" : "Status"}</th>
                  <th className="px-6 py-3 font-semibold">{lang === "gu" ? "તારીખ" : "Timeline"}</th>
                  <th className="px-6 py-3 font-semibold text-right">{lang === "gu" ? "ક્રિયાઓ" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => {
                  const batch = order.batches?.[0];
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-slate-900">
                        <div>{order.orderNumber}</div>
                        <span className="text-[10px] text-slate-400 font-sans block">
                          ID: {order.id.slice(0, 8)}...
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">
                          {order.bom?.finishedItem?.name || "Finished Item"}
                        </div>
                        <span className="text-xs text-indigo-600 font-medium block">
                          BOM: {order.bom?.bomName || "Standard"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right font-mono font-semibold text-slate-700">
                        {Number(order.targetQuantity).toLocaleString()}
                        {batch && (
                          <span className="text-[11px] text-emerald-600 block">
                            Yield: {Number(batch.actualProducedQty).toLocaleString()}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={order.status} />
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-600">
                        <div>Start: {new Date(order.startDate).toLocaleDateString()}</div>
                        {order.completedDate && (
                          <span className="text-[11px] text-emerald-600 block">
                            End: {new Date(order.completedDate).toLocaleDateString()}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenView(order)}
                          className="text-xs text-slate-600 hover:text-indigo-600 font-medium px-2 py-1 rounded hover:bg-slate-100"
                        >
                          {lang === "gu" ? "વિગતો" : "View"}
                        </button>

                        {/* Lifecycle buttons */}
                        {order.status === "PLANNED" && (
                          <button
                            onClick={() => handleOpenStart(order)}
                            className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold px-2.5 py-1 rounded"
                          >
                            {lang === "gu" ? "શરૂ કરો" : "Start"}
                          </button>
                        )}

                        {order.status === "IN_PROGRESS" && (
                          <button
                            onClick={() => handleOpenComplete(order)}
                            className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold px-2.5 py-1 rounded"
                          >
                            {lang === "gu" ? "પૂર્ણ કરો" : "Complete"}
                          </button>
                        )}

                        {(order.status === "PLANNED" || order.status === "IN_PROGRESS") && (
                          <button
                            onClick={() => handleOpenCancel(order)}
                            className="text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-1 rounded hover:bg-rose-50"
                          >
                            {lang === "gu" ? "રદ કરો" : "Cancel"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={lang === "gu" ? "નવો ઉત્પાદન ઓર્ડર બનાવો" : "Create Production Order"}
        titleGujarati="ઉત્પાદન પ્રક્રિયા શેડ્યૂલ કરો"
        maxWidth="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {lang === "gu" ? "રદ કરો" : "Cancel"}
            </button>
            <button
              type="submit"
              form="create-order-form"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#F47721] hover:bg-[#D95F12] text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting
                ? lang === "gu"
                  ? "બનાવી રહ્યું છે..."
                  : "Creating..."
                : lang === "gu"
                ? "ઓર્ડર બનાવો"
                : "Create Order"}
            </button>
          </>
        }
      >
        <form id="create-order-form" onSubmit={handleCreateSubmit} className="space-y-4">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              {actionError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === "gu" ? "BOM રેસિપી પસંદ કરો *" : "Select BOM Formula *"}
            </label>
            <select
              value={createForm.bomId}
              onChange={(e) => setCreateForm({ ...createForm, bomId: e.target.value })}
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{lang === "gu" ? "-- BOM પસંદ કરો --" : "-- Select BOM --"}</option>
              {boms.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bomName} ({b.finishedItem?.name || "Item"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === "gu" ? "ઓર્ડર નંબર" : "Order Number"}
            </label>
            <input
              type="text"
              value={createForm.orderNumber}
              onChange={(e) => setCreateForm({ ...createForm, orderNumber: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === "gu" ? "લક્ષ્ય ઉત્પાદન જથ્થો (Target Qty) *" : "Target Yield Quantity *"}
            </label>
            <input
              type="number"
              min="0.001"
              step="any"
              value={createForm.targetQuantity}
              onChange={(e) => setCreateForm({ ...createForm, targetQuantity: parseFloat(e.target.value) || 0 })}
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === "gu" ? "શરૂઆતની તારીખ" : "Scheduled Start Date"}
            </label>
            <input
              type="date"
              value={createForm.startDate}
              onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </form>
      </Modal>

      {/* Start Production Modal */}
      <Modal
        isOpen={isStartModalOpen}
        onClose={() => setIsStartModalOpen(false)}
        title={lang === "gu" ? "ઉત્પાદન શરૂ કરો (કાચો માલ ઇશ્યૂ કરો)" : "Start Production Execution"}
        titleGujarati={selectedOrder?.orderNumber}
        maxWidth="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsStartModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {lang === "gu" ? "રદ કરો" : "Cancel"}
            </button>
            <button
              type="submit"
              form="start-order-form"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#F47721] hover:bg-[#D95F12] text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting
                ? lang === "gu"
                  ? "શરૂ થઈ રહ્યું છે..."
                  : "Starting..."
                : lang === "gu"
                ? "ઉત્પાદન શરૂ કરો"
                : "Issue Materials & Start"}
            </button>
          </>
        }
      >
        <form id="start-order-form" onSubmit={handleStartSubmit} className="space-y-4">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              {actionError}
            </div>
          )}

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            {lang === "gu"
              ? "નોંધ: ઉત્પાદન શરૂ કરવાથી પસંદ કરેલા ગોડાઉનમાંથી જરૂરી કાચો માલ તરત જ બાદ (Deduct) થશે અને WIP માં રૂપાંતરિત થશે."
              : "Note: Starting production immediately deducts required raw materials from the selected warehouse into Work-in-Progress (WIP)."}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === "gu" ? "કાચા માલનું ગોડાઉન (Source Warehouse) *" : "Source Warehouse for Raw Materials *"}
            </label>
            <select
              value={startForm.sourceWarehouseId}
              onChange={(e) => setStartForm({ sourceWarehouseId: e.target.value })}
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} {w.isDefault ? "(Default)" : ""}
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      {/* Complete Production Modal */}
      <Modal
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        title={lang === "gu" ? "ઉત્પાદન પૂર્ણ કરો અને બેચ જમા કરો" : "Complete Production & Yield Finished Batch"}
        titleGujarati={selectedOrder?.orderNumber}
        maxWidth="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsCompleteModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {lang === "gu" ? "રદ કરો" : "Cancel"}
            </button>
            <button
              type="submit"
              form="complete-order-form"
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting
                ? lang === "gu"
                  ? "પ્રોસેસ થઈ રહ્યું છે..."
                  : "Completing..."
                : lang === "gu"
                ? "બેચ જમા કરો અને પૂર્ણ કરો"
                : "Receive Batch & Complete"}
            </button>
          </>
        }
      >
        <form id="complete-order-form" onSubmit={handleCompleteSubmit} className="space-y-4">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              {actionError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "તૈયાર માલનું ગોડાઉન (Destination) *" : "Target Warehouse for Finished Goods *"}
              </label>
              <select
                value={completeForm.targetWarehouseId}
                onChange={(e) => setCompleteForm({ ...completeForm, targetWarehouseId: e.target.value })}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.isDefault ? "(Default)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "વાસ્તવિક ઉત્પાદન જથ્થો (Actual Produced) *" : "Actual Produced Quantity *"}
              </label>
              <input
                type="number"
                min="0.001"
                step="any"
                value={completeForm.actualProducedQty}
                onChange={(e) => setCompleteForm({ ...completeForm, actualProducedQty: parseFloat(e.target.value) || 0 })}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "બગાડ / સ્ક્રેપ જથ્થો (Scrap Qty)" : "Scrap Quantity"}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={completeForm.scrapQuantity}
                onChange={(e) => setCompleteForm({ ...completeForm, scrapQuantity: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "બેચ નંબર (Batch Number)" : "Batch Number"}
              </label>
              <input
                type="text"
                value={completeForm.batchNumber}
                onChange={(e) => setCompleteForm({ ...completeForm, batchNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "વાસ્તવિક મજૂરી ખર્ચ (Labor Cost ₹)" : "Actual Labor Cost (₹)"}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={completeForm.actualLaborCost}
                onChange={(e) => setCompleteForm({ ...completeForm, actualLaborCost: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "વાસ્તવિક ઓવરહેડ ખર્ચ (Overhead ₹)" : "Actual Overhead Cost (₹)"}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={completeForm.actualOverheadCost}
                onChange={(e) => setCompleteForm({ ...completeForm, actualOverheadCost: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "ઉત્પાદન તારીખ (Mfg Date)" : "Manufacturing Date"}
              </label>
              <input
                type="date"
                value={completeForm.mfgDate}
                onChange={(e) => setCompleteForm({ ...completeForm, mfgDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "એક્સપાયરી તારીખ (Expiry Date)" : "Expiry Date"}
              </label>
              <input
                type="date"
                value={completeForm.expiryDate}
                onChange={(e) => setCompleteForm({ ...completeForm, expiryDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Cancel Order Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title={lang === "gu" ? "ઓર્ડર રદ કરવાની પુષ્ટિ" : "Confirm Order Cancellation"}
        maxWidth="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(false)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-100"
            >
              {lang === "gu" ? "પાછા જાઓ" : "Go Back"}
            </button>
            <button
              type="submit"
              form="cancel-order-form"
              disabled={isSubmitting}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "..." : lang === "gu" ? "હા, રદ કરો" : "Confirm Cancel"}
            </button>
          </>
        }
      >
        <form id="cancel-order-form" onSubmit={handleCancelSubmit} className="space-y-3">
          {actionError && (
            <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
              {actionError}
            </div>
          )}
          <p className="text-xs text-slate-600">
            {lang === "gu"
              ? "જો ઓર્ડર શરૂ થયેલો હશે તો વાપરેલો કાચો માલ આપમેળે ગોડાઉનમાં રિવર્સ થઈ જશે."
              : "Cancelling an in-progress order restores legitimately consumed raw materials back to inventory."}
          </p>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {lang === "gu" ? "રદ કરવાનું કારણ" : "Cancellation Reason"}
            </label>
            <input
              type="text"
              value={cancelForm.reason}
              onChange={(e) => setCancelForm({ reason: e.target.value })}
              placeholder="e.g. Defective raw materials / customer cancelled"
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={selectedOrder?.orderNumber || "Order Details"}
        titleGujarati={selectedOrder?.bom?.finishedItem?.name}
        maxWidth="2xl"
        footer={
          <button
            onClick={() => setIsViewModalOpen(false)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            {lang === "gu" ? "બંધ કરો" : "Close"}
          </button>
        }
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block">Status:</span>
                <StatusBadge status={selectedOrder.status} />
              </div>
              <div>
                <span className="text-slate-500 block">Target Qty:</span>
                <span className="font-bold font-mono text-slate-800 text-sm">
                  {Number(selectedOrder.targetQuantity).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Start Date:</span>
                <span className="font-medium text-slate-800">
                  {new Date(selectedOrder.startDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Batch Yield Details if completed */}
            {selectedOrder.batches && selectedOrder.batches.length > 0 && (
              <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 uppercase">
                    Finished Batch Costing
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-800">
                    Batch: {selectedOrder.batches[0].batchNumber}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Produced Qty</span>
                    <span className="font-bold font-mono text-slate-900">
                      {Number(selectedOrder.batches[0].actualProducedQty).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Raw Material Cost</span>
                    <span className="font-mono text-slate-900">
                      ₹{Number(selectedOrder.batches[0].rawMaterialCost).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Labor + OH</span>
                    <span className="font-mono text-slate-900">
                      ₹{(Number(selectedOrder.batches[0].actualLaborCost) + Number(selectedOrder.batches[0].actualOverheadCost)).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Final Unit Cost</span>
                    <span className="font-bold font-mono text-emerald-700 text-sm">
                      ₹{Number(selectedOrder.batches[0].unitCost).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
