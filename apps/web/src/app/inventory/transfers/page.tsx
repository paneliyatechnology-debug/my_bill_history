"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";
import { Modal } from "../../../components/ui/modal";
import { Badge, StatusBadge } from "../../../components/ui/badge";
import { DataTable, ColumnDef } from "../../../components/ui/data-table";

interface TransferItem {
  id: string;
  transferId: string;
  itemId: string;
  batchId?: string;
  quantity: number;
  receivedQuantity?: number;
  unitCost: number;
  totalCost: number;
  item?: {
    id: string;
    name: string;
    sku?: string;
    primaryUom?: { code: string };
  };
  batch?: {
    id: string;
    batchNumber: string;
  };
}

interface StockTransfer {
  id: string;
  companyId: string;
  transferNumber: string;
  transferDate: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  status: "DRAFT" | "DISPATCHED" | "RECEIVED" | "CANCELLED";
  challanNumber?: string;
  dispatchedAt?: string;
  receivedAt?: string;
  notes?: string;
  fromWarehouse?: { id: string; name: string };
  toWarehouse?: { id: string; name: string };
  items: TransferItem[];
}

interface WarehouseOption {
  id: string;
  name: string;
  isDefault: boolean;
}

interface ItemOption {
  id: string;
  name: string;
  sku?: string;
  purchaseRate?: number;
  primaryUom?: { code: string };
}

interface ReconciliationData {
  transferId: string;
  transferNumber: string;
  status: string;
  totalDispatchedQty: number;
  totalReceivedQty: number;
  totalShortageQty: number;
  totalValuation: number;
  items: Array<{
    itemId: string;
    itemName: string;
    dispatchedQty: number;
    receivedQty: number;
    shortageQty: number;
    damageQty: number;
    unitCost: number;
    shortageValuation: number;
  }>;
}

export default function StockTransfersPage() {
  const { lang, tenantContext } = useAuth();
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isReconModalOpen, setIsReconModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);
  const [reconData, setReconData] = useState<ReconciliationData | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Create Form
  const [createForm, setCreateForm] = useState({
    transferNumber: "",
    transferDate: new Date().toISOString().split("T")[0],
    fromWarehouseId: "",
    toWarehouseId: "",
    notes: "",
    items: [{ itemId: "", quantity: 1 }] as Array<{
      itemId: string;
      quantity: number;
    }>,
  });

  // Dispatch Form
  const [dispatchForm, setDispatchForm] = useState({
    challanNumber: "",
    dispatchedAt: new Date().toISOString(),
  });

  // Receive Form (supports partial receipts)
  const [receiveItems, setReceiveItems] = useState<
    Array<{ transferItemId: string; itemName: string; dispatchedQty: number; receivedQty: number }>
  >([]);

  // Cancel Form
  const [cancelReason, setCancelReason] = useState("");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [trRes, whRes, itRes]: any = await Promise.all([
        apiClient.get("/distribution/transfers"),
        apiClient.get("/warehouses"),
        apiClient.get("/items"),
      ]);
      setTransfers(extractList(trRes));
      setWarehouses(extractList(whRes));
      setItems(extractList(itRes));
    } catch (err: any) {
      setError(err.message || "Failed to load stock transfers.");
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
      transferNumber: `TRF-${Date.now().toString().slice(-6)}`,
      transferDate: new Date().toISOString().split("T")[0],
      fromWarehouseId: warehouses[0]?.id || "",
      toWarehouseId: warehouses[1]?.id || warehouses[0]?.id || "",
      notes: "",
      items: [{ itemId: items[0]?.id || "", quantity: 1 }],
    });
    setActionError(null);
    setIsCreateModalOpen(true);
  };

  const handleAddItem = () => {
    setCreateForm((prev) => ({
      ...prev,
      items: [...prev.items, { itemId: items[0]?.id || "", quantity: 1 }],
    }));
  };

  const handleRemoveItem = (idx: number) => {
    setCreateForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleItemChange = (idx: number, field: "itemId" | "quantity", val: any) => {
    setCreateForm((prev) => {
      const updated = [...prev.items];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...prev, items: updated };
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.fromWarehouseId || !createForm.toWarehouseId) {
      setActionError(lang === "gu" ? "બંને ગોડાઉન પસંદ કરો." : "Please select both warehouses.");
      return;
    }
    if (createForm.fromWarehouseId === createForm.toWarehouseId) {
      setActionError(
        lang === "gu"
          ? "મોકલનાર અને મેળવનાર ગોડાઉન એક જ ન હોઈ શકે."
          : "Source and destination warehouses cannot be the same."
      );
      return;
    }
    if (createForm.items.length === 0) {
      setActionError(lang === "gu" ? "ઓછામાં ઓછો એક માલસામાન ઉમેરો." : "Add at least one item.");
      return;
    }
    for (const it of createForm.items) {
      if (it.quantity <= 0) {
        setActionError(lang === "gu" ? "જથ્થો ૦ થી વધુ હોવો જોઈએ." : "Quantity must be > 0.");
        return;
      }
    }

    setIsSubmitting(true);
    setActionError(null);
    try {
      await apiClient.post("/distribution/transfers", {
        transferNumber: createForm.transferNumber || undefined,
        transferDate: createForm.transferDate,
        fromWarehouseId: createForm.fromWarehouseId,
        toWarehouseId: createForm.toWarehouseId,
        notes: createForm.notes || undefined,
        items: createForm.items.map((it) => ({
          itemId: it.itemId,
          quantity: Number(it.quantity),
        })),
      });
      setIsCreateModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setActionError(err.message || "Failed to create transfer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dispatch
  const handleOpenDispatch = (tr: StockTransfer) => {
    setSelectedTransfer(tr);
    setDispatchForm({
      challanNumber: `DC-${tr.transferNumber}`,
      dispatchedAt: new Date().toISOString(),
    });
    setActionError(null);
    setIsDispatchModalOpen(true);
  };

  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransfer) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await apiClient.post(`/distribution/transfers/${selectedTransfer.id}/dispatch`, {
        challanNumber: dispatchForm.challanNumber || undefined,
      });
      setIsDispatchModalOpen(false);
      setSelectedTransfer(null);
      await fetchData();
    } catch (err: any) {
      setActionError(err.message || "Failed to dispatch transfer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Receive (Partial Receipts)
  const handleOpenReceive = (tr: StockTransfer) => {
    setSelectedTransfer(tr);
    setReceiveItems(
      tr.items.map((it) => ({
        transferItemId: it.id,
        itemName: it.item?.name || "Item",
        dispatchedQty: Number(it.quantity),
        receivedQty: Number(it.quantity), // default to full receipt
      }))
    );
    setActionError(null);
    setIsReceiveModalOpen(true);
  };

  const handleReceiveQtyChange = (transferItemId: string, qty: number) => {
    setReceiveItems((prev) =>
      prev.map((i) => (i.transferItemId === transferItemId ? { ...i, receivedQty: qty } : i))
    );
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransfer) return;
    for (const it of receiveItems) {
      if (it.receivedQty < 0) {
        setActionError(lang === "gu" ? "સ્વીકારેલ જથ્થો ઋણ ન હોઈ શકે." : "Received quantity cannot be negative.");
        return;
      }
      if (it.receivedQty > it.dispatchedQty) {
        setActionError(
          lang === "gu"
            ? "સ્વીકારેલ જથ્થો રવાના કરેલા જથ્થા કરતાં વધુ ન હોઈ શકે."
            : "Received quantity cannot exceed dispatched quantity."
        );
        return;
      }
    }

    setIsSubmitting(true);
    setActionError(null);
    try {
      await apiClient.post(`/distribution/transfers/${selectedTransfer.id}/receive`, {
        items: receiveItems.map((i) => ({
          transferItemId: i.transferItemId,
          receivedQuantity: Number(i.receivedQty),
        })),
      });
      setIsReceiveModalOpen(false);
      setSelectedTransfer(null);
      await fetchData();
    } catch (err: any) {
      setActionError(err.message || "Failed to receive transfer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel
  const handleOpenCancel = (tr: StockTransfer) => {
    setSelectedTransfer(tr);
    setCancelReason("");
    setActionError(null);
    setIsCancelModalOpen(true);
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransfer) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await apiClient.post(`/distribution/transfers/${selectedTransfer.id}/cancel`, {
        reason: cancelReason || "Cancelled by user",
      });
      setIsCancelModalOpen(false);
      setSelectedTransfer(null);
      await fetchData();
    } catch (err: any) {
      setActionError(err.message || "Failed to cancel transfer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reconciliation
  const handleOpenRecon = async (tr: StockTransfer) => {
    setSelectedTransfer(tr);
    setReconData(null);
    setIsReconModalOpen(true);
    try {
      const res: any = await apiClient.get(`/distribution/transfers/${tr.id}/reconciliation`);
      setReconData(res);
    } catch (err: any) {
      setActionError(err.message || "Failed to fetch reconciliation details.");
    }
  };

  const filteredTransfers = transfers.filter((t) => {
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    return true;
  });

  const columns: ColumnDef<StockTransfer>[] = [
    {
      header: lang === "gu" ? "ટ્રાન્સફર #" : "Transfer #",
      accessorKey: "transferNumber",
      sortable: true,
      cell: (tr) => (
        <div className="font-mono font-medium text-slate-900">
          <div>{tr.transferNumber}</div>
          {tr.challanNumber && (
            <span className="text-[10px] text-slate-400 block font-sans">
              Challan: {tr.challanNumber}
            </span>
          )}
        </div>
      ),
    },
    {
      header: lang === "gu" ? "તારીખ" : "Date",
      accessorKey: "transferDate",
      sortable: true,
      cell: (tr) => (
        <span className="text-xs text-slate-600 whitespace-nowrap">
          {new Date(tr.transferDate).toLocaleDateString("en-IN")}
        </span>
      ),
    },
    {
      header: lang === "gu" ? "મોકલનાર -> મેળવનાર ગોડાઉન" : "Route (From -> To)",
      accessorKey: "fromWarehouseId",
      cell: (tr) => (
        <div className="flex items-center gap-1.5 font-medium text-slate-800">
          <span>{tr.fromWarehouse?.name || "From"}</span>
          <span className="text-slate-400">→</span>
          <span>{tr.toWarehouse?.name || "To"}</span>
        </div>
      ),
    },
    {
      header: lang === "gu" ? "સ્થિતિ" : "Status",
      accessorKey: "status",
      sortable: true,
      className: "text-center",
      cell: (tr) => <StatusBadge status={tr.status} />,
    },
    {
      header: lang === "gu" ? "આઈટમ / જથ્થો" : "Items / Qty",
      accessorKey: "items",
      className: "text-right font-mono",
      cell: (tr) => {
        const totalQty = tr.items.reduce((s, i) => s + Number(i.quantity), 0);
        return (
          <div>
            <div className="font-semibold text-slate-800">
              {totalQty.toLocaleString()} units
            </div>
            <span className="text-[10px] text-slate-400 block font-sans">
              {tr.items.length} {lang === "gu" ? "આઈટમો" : "line(s)"}
            </span>
          </div>
        );
      },
    },
    {
      header: lang === "gu" ? "ક્રિયાઓ" : "Actions",
      className: "text-right space-x-1.5 whitespace-nowrap",
      cell: (tr) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleOpenRecon(tr)}
            className="text-xs text-slate-600 hover:text-[#F47721] font-medium px-2 py-1 rounded hover:bg-slate-100"
          >
            {lang === "gu" ? "મેળવણી" : "Audit / Recon"}
          </button>

          {tr.status === "DRAFT" && (
            <button
              onClick={() => handleOpenDispatch(tr)}
              className="text-xs bg-[#FFF3E8] text-[#F47721] hover:bg-[#F47721] hover:text-white font-semibold px-2.5 py-1 rounded transition-colors"
            >
              {lang === "gu" ? "રવાના કરો" : "Dispatch"}
            </button>
          )}

          {tr.status === "DISPATCHED" && (
            <button
              onClick={() => handleOpenReceive(tr)}
              className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold px-2.5 py-1 rounded"
            >
              {lang === "gu" ? "સ્વીકારો" : "Receive"}
            </button>
          )}

          {tr.status === "DRAFT" && (
            <button
              onClick={() => handleOpenCancel(tr)}
              className="text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-1 rounded hover:bg-rose-50"
            >
              {lang === "gu" ? "રદ કરો" : "Cancel"}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-border shadow-subtle">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {lang === "gu"
              ? "સ્ટોક ટ્રાન્સફર (Stock Transfers)"
              : "Stock Transfers & In-Transit Tracking"}
          </h1>
          <p className="text-xs text-muted mt-1">
            {lang === "gu"
              ? "એક ગોડાઉનમાંથી બીજા ગોડાઉનમાં માલની રવાનગી, ઇન-ટ્રાન્ઝિટ સિલક અને નુકસાની મેળવણી"
              : "Warehouse-to-warehouse transfers with dual-phase dispatch/receipt, partial acceptance, and shortage tracking"}
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-pressed text-white text-xs sm:text-sm font-bold rounded-xl shadow-card hover:shadow-hover transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {lang === "gu" ? "નવો સ્ટોક ટ્રાન્સફર" : "New Stock Transfer"}
        </button>
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

      {/* Main DataTable */}
      <DataTable<StockTransfer>
        data={filteredTransfers}
        columns={columns}
        keyExtractor={(tr) => tr.id}
        searchPlaceholder={
          lang === "gu"
            ? "ટ્રાન્સફર # અથવા ગોડાઉનથી શોધો..."
            : "Search transfer # or warehouse..."
        }
        searchKeys={["transferNumber", "challanNumber"]}
        defaultPageSize={10}
        isLoading={isLoading}
        emptyMessage={
          lang === "gu"
            ? "કોઈ સ્ટોક ટ્રાન્સફર મળ્યો નથી. ગોડાઉન વચ્ચે માલ મોકલવા માટે નવો સ્ટોક ટ્રાન્સફર બનાવો."
            : "No Stock Transfers found. Create a stock transfer to move inventory between warehouses."
        }
        exportFilename="stock_transfers"
        themeColor="saffron"
        toolbarChildren={
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {(["ALL", "DRAFT", "DISPATCHED", "RECEIVED", "CANCELLED"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === st
                    ? "bg-[#F47721] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st === "ALL" ? (lang === "gu" ? "બધા" : "All") : st.replace("_", " ")}
              </button>
            ))}
          </div>
        }
        mobileCardRender={(tr) => {
          const totalQty = tr.items.reduce((s, i) => s + Number(i.quantity), 0);
          return (
            <div key={tr.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-slate-900">
                    {tr.transferNumber}
                  </span>
                  {tr.challanNumber && (
                    <span className="text-[10px] text-slate-400 block">
                      Challan: {tr.challanNumber}
                    </span>
                  )}
                </div>
                <StatusBadge status={tr.status} />
              </div>
              <div className="text-xs text-slate-500">
                {new Date(tr.transferDate).toLocaleDateString("en-IN")}
              </div>
              <div className="text-xs font-medium text-slate-800">
                {tr.fromWarehouse?.name || "From"} → {tr.toWarehouse?.name || "To"}
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                <span className="text-slate-500">Items: {tr.items.length}</span>
                <span className="font-mono font-bold text-slate-900">
                  {totalQty.toLocaleString()} units
                </span>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => handleOpenRecon(tr)}
                  className="text-xs text-slate-600 font-medium"
                >
                  Audit
                </button>
                {tr.status === "DRAFT" && (
                  <button
                    onClick={() => handleOpenDispatch(tr)}
                    className="text-xs text-[#F47721] font-semibold"
                  >
                    Dispatch
                  </button>
                )}
                {tr.status === "DISPATCHED" && (
                  <button
                    onClick={() => handleOpenReceive(tr)}
                    className="text-xs text-emerald-600 font-semibold"
                  >
                    Receive
                  </button>
                )}
                {tr.status === "DRAFT" && (
                  <button
                    onClick={() => handleOpenCancel(tr)}
                    className="text-xs text-rose-600 font-medium"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          );
        }}
      />

      {/* Create Transfer Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={lang === "gu" ? "નવો સ્ટોક ટ્રાન્સફર બનાવો" : "Create Stock Transfer"}
        maxWidth="2xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
            >
              {lang === "gu" ? "રદ કરો" : "Cancel"}
            </button>
            <button
              type="submit"
              form="create-transfer-form"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#F47721] hover:bg-[#D95F12] text-white rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "..." : lang === "gu" ? "ડ્રાફ્ટ સેવ કરો" : "Save Transfer Draft"}
            </button>
          </>
        }
      >
        <form id="create-transfer-form" onSubmit={handleCreateSubmit} className="space-y-4">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              {actionError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "ટ્રાન્સફર તારીખ *" : "Transfer Date *"}
              </label>
              <input
                type="date"
                value={createForm.transferDate}
                onChange={(e) => setCreateForm({ ...createForm, transferDate: e.target.value })}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "મોકલનાર ગોડાઉન (From) *" : "From Warehouse *"}
              </label>
              <select
                value={createForm.fromWarehouseId}
                onChange={(e) => setCreateForm({ ...createForm, fromWarehouseId: e.target.value })}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "મેળવનાર ગોડાઉન (To) *" : "To Warehouse *"}
              </label>
              <select
                value={createForm.toWarehouseId}
                onChange={(e) => setCreateForm({ ...createForm, toWarehouseId: e.target.value })}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Items */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
              <span className="text-xs font-bold text-slate-700 uppercase">
                {lang === "gu" ? "ટ્રાન્સફર માલસામાન યાદી" : "Transfer Items"}
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs text-indigo-600 font-semibold hover:text-indigo-800"
              >
                + {lang === "gu" ? "આઈટમ ઉમેરો" : "Add Item"}
              </button>
            </div>

            <div className="p-3 space-y-2">
              {createForm.items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-8">
                    <select
                      value={it.itemId}
                      onChange={(e) => handleItemChange(idx, "itemId", e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    >
                      {items.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name} {opt.sku ? `(${opt.sku})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      min="0.001"
                      step="any"
                      value={it.quantity}
                      onChange={(e) => handleItemChange(idx, "quantity", parseFloat(e.target.value) || 0)}
                      required
                      placeholder="Qty"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div className="col-span-1 text-right">
                    {createForm.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {lang === "gu" ? "નોંધ (Notes)" : "Notes"}
            </label>
            <input
              type="text"
              value={createForm.notes}
              onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>
        </form>
      </Modal>

      {/* Dispatch Modal */}
      <Modal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        title={lang === "gu" ? "માલ રવાના કરો (Dispatch Transfer)" : "Dispatch Stock Transfer"}
        titleGujarati={selectedTransfer?.transferNumber}
        maxWidth="sm"
        footer={
          <>
            <button
              onClick={() => setIsDispatchModalOpen(false)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600"
            >
              {lang === "gu" ? "રદ કરો" : "Cancel"}
            </button>
            <button
              type="submit"
              form="dispatch-form"
              disabled={isSubmitting}
              className="px-3 py-1.5 bg-[#F47721] hover:bg-[#D95F12] text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              {isSubmitting ? "..." : lang === "gu" ? "રવાના કરો" : "Confirm Dispatch"}
            </button>
          </>
        }
      >
        <form id="dispatch-form" onSubmit={handleDispatchSubmit} className="space-y-3">
          {actionError && (
            <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
              {actionError}
            </div>
          )}
          <p className="text-xs text-slate-600">
            {lang === "gu"
              ? "માલ રવાના કરવાથી મોકલનાર ગોડાઉનમાંથી સ્ટોક બાદ થશે અને ઇન-ટ્રાન્ઝિટ (In-Transit) સિલક તરીકે જમા થશે."
              : "Dispatching immediately deducts goods from source warehouse and logs them into in-transit inventory."}
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === "gu" ? "ચલણ નંબર (Delivery Challan #)" : "Challan Number"}
            </label>
            <input
              type="text"
              value={dispatchForm.challanNumber}
              onChange={(e) => setDispatchForm({ ...dispatchForm, challanNumber: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
            />
          </div>
        </form>
      </Modal>

      {/* Receive Modal with Partial Receipts */}
      <Modal
        isOpen={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
        title={lang === "gu" ? "માલ સ્વીકારો (Receive Stock & Detect Shortage)" : "Receive Stock Transfer"}
        titleGujarati={selectedTransfer?.transferNumber}
        maxWidth="lg"
        footer={
          <>
            <button
              onClick={() => setIsReceiveModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
            >
              {lang === "gu" ? "રદ કરો" : "Cancel"}
            </button>
            <button
              type="submit"
              form="receive-form"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#F47721] hover:bg-[#D95F12] disabled:bg-[#F47721]/50 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
            >
              {isSubmitting ? "..." : lang === "gu" ? "સ્વીકાર પૂર્ણ કરો" : "Confirm Receipt"}
            </button>
          </>
        }
      >
        <form id="receive-form" onSubmit={handleReceiveSubmit} className="space-y-4">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              {actionError}
            </div>
          )}

          <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-800">
            {lang === "gu"
              ? "આંશિક સ્વીકૃતિ (Partial Receipt): જો માલ રસ્તામાં ઓછો મળ્યો હોય અથવા નુકસાન થયું હોય, તો વાસ્તવિક મળેલ જથ્થો લખો. સિસ્ટમ ખૂટતો જથ્થો (Shortage) આપમેળે ટ્રેક કરશે."
              : "Partial receipt enabled: Enter actual accepted quantities. Any deficit will automatically be recorded as transit shortage / damage variance."}
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2 font-semibold">Item</th>
                  <th className="px-4 py-2 font-semibold text-right">Dispatched Qty</th>
                  <th className="px-4 py-2 font-semibold text-right">Accepted / Received Qty</th>
                  <th className="px-4 py-2 font-semibold text-right">Shortage / Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receiveItems.map((it) => {
                  const shortage = Math.max(0, it.dispatchedQty - it.receivedQty);
                  return (
                    <tr key={it.transferItemId}>
                      <td className="px-4 py-2 font-medium text-slate-800">{it.itemName}</td>
                      <td className="px-4 py-2 text-right font-mono text-slate-600">
                        {it.dispatchedQty}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          max={it.dispatchedQty}
                          step="any"
                          value={it.receivedQty}
                          onChange={(e) =>
                            handleReceiveQtyChange(it.transferItemId, parseFloat(e.target.value) || 0)
                          }
                          required
                          className="w-24 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-right font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {shortage > 0 ? (
                          <span className="text-rose-600 font-bold">-{shortage}</span>
                        ) : (
                          <span className="text-emerald-600 font-medium">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </form>
      </Modal>

      {/* Cancel Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title={lang === "gu" ? "ટ્રાન્સફર રદ કરો" : "Cancel Transfer"}
        maxWidth="sm"
        footer={
          <>
            <button
              onClick={() => setIsCancelModalOpen(false)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600"
            >
              {lang === "gu" ? "પાછા જાઓ" : "Back"}
            </button>
            <button
              type="submit"
              form="cancel-tr-form"
              disabled={isSubmitting}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold"
            >
              {isSubmitting ? "..." : lang === "gu" ? "હા, રદ કરો" : "Confirm Cancel"}
            </button>
          </>
        }
      >
        <form id="cancel-tr-form" onSubmit={handleCancelSubmit} className="space-y-3">
          <p className="text-xs text-slate-600">
            {lang === "gu"
              ? "શું તમે આ ડ્રાફ્ટ સ્ટોક ટ્રાન્સફર રદ કરવા માંગો છો?"
              : "Are you sure you want to cancel this draft stock transfer?"}
          </p>
          <input
            type="text"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Cancellation reason"
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs"
          />
        </form>
      </Modal>

      {/* Reconciliation Modal */}
      <Modal
        isOpen={isReconModalOpen}
        onClose={() => setIsReconModalOpen(false)}
        title={selectedTransfer?.transferNumber || "Transfer Reconciliation"}
        titleGujarati="ઇન-ટ્રાન્ઝિટ સિલક અને નુકસાની ઓડિટ"
        maxWidth="2xl"
        footer={
          <button
            onClick={() => setIsReconModalOpen(false)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
          >
            {lang === "gu" ? "બંધ કરો" : "Close"}
          </button>
        }
      >
        {reconData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block">Status:</span>
                <StatusBadge status={reconData.status} />
              </div>
              <div>
                <span className="text-slate-500 block">Dispatched Qty:</span>
                <span className="font-bold font-mono text-slate-800">
                  {Number(reconData.totalDispatchedQty).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Received Qty:</span>
                <span className="font-bold font-mono text-emerald-700">
                  {Number(reconData.totalReceivedQty).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Shortage / Damage:</span>
                <span className="font-bold font-mono text-rose-600">
                  {Number(reconData.totalShortageQty).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Item</th>
                    <th className="px-4 py-2 font-semibold text-right">Dispatched</th>
                    <th className="px-4 py-2 font-semibold text-right">Received</th>
                    <th className="px-4 py-2 font-semibold text-right">Shortage</th>
                    <th className="px-4 py-2 font-semibold text-right">Shortage Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reconData.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 font-medium text-slate-800">{it.itemName}</td>
                      <td className="px-4 py-2 text-right font-mono">{it.dispatchedQty}</td>
                      <td className="px-4 py-2 text-right font-mono text-emerald-700">{it.receivedQty}</td>
                      <td className="px-4 py-2 text-right font-mono text-rose-600 font-bold">{it.shortageQty}</td>
                      <td className="px-4 py-2 text-right font-mono text-rose-700">₹{Number(it.shortageValuation).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400">Loading reconciliation data...</div>
        )}
      </Modal>
    </div>
  );
}
