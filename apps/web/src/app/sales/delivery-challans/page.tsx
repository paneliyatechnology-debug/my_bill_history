"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";
import { Modal } from "../../../components/ui/modal";
import { Badge, StatusBadge } from "../../../components/ui/badge";
import { DataTable, ColumnDef } from "../../../components/ui/data-table";

interface DeliveryChallanItem {
  id: string;
  itemId: string;
  description?: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  taxableAmount: number;
  taxRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  item?: { id: string; name: string; sku?: string };
}

interface DeliveryChallan {
  id: string;
  companyId: string;
  challanNumber: string;
  challanDate: string;
  challanType: "JOB_WORK" | "SUPPLY_ON_APPROVAL" | "BRANCH_TRANSFER" | "OTHER";
  status: "DRAFT" | "ISSUED" | "CLOSED" | "CANCELLED";
  eWayBillNumber?: string;
  placeOfSupply?: string;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  partyId?: string;
  warehouseId: string;
  party?: { id: string; name: string; gstin?: string };
  warehouse?: { id: string; name: string };
  items: DeliveryChallanItem[];
}

interface PartyOption {
  id: string;
  name: string;
  gstin?: string;
  type: string;
}

interface WarehouseOption {
  id: string;
  name: string;
  isDefault: boolean;
}

interface ItemOption {
  id: string;
  name: string;
  hsnCode?: string;
  taxRate?: number;
  purchaseRate?: number;
  retailPrice?: number;
}

export default function DeliveryChallansPage() {
  const { lang, tenantContext } = useAuth();
  const [challans, setChallans] = useState<DeliveryChallan[]>([]);
  const [parties, setParties] = useState<PartyOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isEwbModalOpen, setIsEwbModalOpen] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState<DeliveryChallan | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    challanNumber: "",
    challanDate: new Date().toISOString().split("T")[0],
    challanType: "JOB_WORK" as "JOB_WORK" | "SUPPLY_ON_APPROVAL" | "BRANCH_TRANSFER" | "OTHER",
    partyId: "",
    warehouseId: "",
    placeOfSupply: "24",
    notes: "",
    items: [
      {
        itemId: "",
        description: "",
        hsnCode: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: 0,
      },
    ] as Array<{
      itemId: string;
      description: string;
      hsnCode: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
    }>,
  });

  // Issue Form
  const [issueEwbNumber, setIssueEwbNumber] = useState("");

  // Cancel Form
  const [cancelReason, setCancelReason] = useState("");

  // EWB Generation Form
  const [ewbForm, setEwbForm] = useState({
    transporterId: "",
    transporterName: "",
    vehicleNumber: "",
    distanceKm: 50,
  });
  const [generatedEwbPayload, setGeneratedEwbPayload] = useState<any | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [chSettled, ptSettled, whSettled, itSettled] = await Promise.allSettled([
        apiClient.get("/distribution/challans"),
        apiClient.get("/parties"),
        apiClient.get("/warehouses"),
        apiClient.get("/items"),
      ]);

      if (chSettled.status === "fulfilled") {
        setChallans(extractList(chSettled.value));
      } else {
        setError(chSettled.reason?.message || "Failed to load delivery challans.");
      }

      if (ptSettled.status === "fulfilled") {
        setParties(extractList(ptSettled.value));
      }
      if (whSettled.status === "fulfilled") {
        setWarehouses(extractList(whSettled.value));
      }
      if (itSettled.status === "fulfilled") {
        setItems(extractList(itSettled.value));
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load delivery challans.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [tenantContext.companyId, fetchData]);

  // Handlers
  const handleOpenCreate = () => {
    setCreateForm({
      challanNumber: `DC-${Date.now().toString().slice(-6)}`,
      challanDate: new Date().toISOString().split("T")[0],
      challanType: "JOB_WORK",
      partyId: parties[0]?.id || "",
      warehouseId: warehouses[0]?.id || "",
      placeOfSupply: "24",
      notes: "",
      items: [
        {
          itemId: items[0]?.id || "",
          description: items[0]?.name || "",
          hsnCode: items[0]?.hsnCode || "",
          quantity: 1,
          unitPrice: items[0]?.retailPrice || 0,
          taxRate: items[0]?.taxRate || 0,
        },
      ],
    });
    setActionError(null);
    setIsCreateModalOpen(true);
  };

  const handleAddItem = () => {
    setCreateForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          itemId: items[0]?.id || "",
          description: items[0]?.name || "",
          hsnCode: items[0]?.hsnCode || "",
          quantity: 1,
          unitPrice: items[0]?.retailPrice || 0,
          taxRate: items[0]?.taxRate || 0,
        },
      ],
    }));
  };

  const handleRemoveItem = (idx: number) => {
    setCreateForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleItemChange = (idx: number, field: string, val: any) => {
    setCreateForm((prev) => {
      const updated = [...prev.items];
      updated[idx] = { ...updated[idx], [field]: val };
      if (field === "itemId") {
        const matched = items.find((it) => it.id === val);
        if (matched) {
          updated[idx].description = matched.name;
          updated[idx].hsnCode = matched.hsnCode || "1006";
          updated[idx].taxRate = matched.taxRate || 5;
        }
      }
      return { ...prev, items: updated };
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.warehouseId) {
      setActionError(lang === "gu" ? "ગોડાઉન પસંદ કરો." : "Warehouse is required.");
      return;
    }
    if (createForm.items.length === 0) {
      setActionError(lang === "gu" ? "ઓછામાં ઓછી એક આઈટમ ઉમેરો." : "At least one item is required.");
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    try {
      await apiClient.post("/distribution/challans", {
        challanNumber: createForm.challanNumber || undefined,
        challanDate: createForm.challanDate,
        challanType: createForm.challanType,
        partyId: createForm.partyId || undefined,
        warehouseId: createForm.warehouseId,
        placeOfSupply: createForm.placeOfSupply || undefined,
        notes: createForm.notes || undefined,
        items: createForm.items.map((it) => ({
          itemId: it.itemId,
          description: it.description || undefined,
          hsnCode: it.hsnCode || undefined,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          taxRate: Number(it.taxRate),
        })),
      });
      setIsCreateModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setActionError(err.message || "Failed to create delivery challan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Issue
  const handleOpenIssue = (ch: DeliveryChallan) => {
    setSelectedChallan(ch);
    setIssueEwbNumber("");
    setActionError(null);
    setIsIssueModalOpen(true);
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChallan) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await apiClient.post(`/distribution/challans/${selectedChallan.id}/issue`, {
        eWayBillNumber: issueEwbNumber || undefined,
      });
      setIsIssueModalOpen(false);
      setSelectedChallan(null);
      await fetchData();
    } catch (err: any) {
      setActionError(err.message || "Failed to issue delivery challan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close
  const handleOpenClose = (ch: DeliveryChallan) => {
    setSelectedChallan(ch);
    setActionError(null);
    setIsCloseModalOpen(true);
  };

  const handleCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChallan) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await apiClient.post(`/distribution/challans/${selectedChallan.id}/close`);
      setIsCloseModalOpen(false);
      setSelectedChallan(null);
      await fetchData();
    } catch (err: any) {
      setActionError(err.message || "Failed to close challan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel
  const handleOpenCancel = (ch: DeliveryChallan) => {
    setSelectedChallan(ch);
    setCancelReason("");
    setActionError(null);
    setIsCancelModalOpen(true);
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChallan) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await apiClient.post(`/distribution/challans/${selectedChallan.id}/cancel`, {
        reason: cancelReason || "Cancelled by user",
      });
      setIsCancelModalOpen(false);
      setSelectedChallan(null);
      await fetchData();
    } catch (err: any) {
      setActionError(err.message || "Failed to cancel challan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // E-Way Bill Generation Modal
  const handleOpenEwb = (ch: DeliveryChallan) => {
    setSelectedChallan(ch);
    setEwbForm({
      transporterId: "",
      transporterName: "",
      vehicleNumber: "",
      distanceKm: 50,
    });
    setGeneratedEwbPayload(null);
    setActionError(null);
    setIsEwbModalOpen(true);
  };

  const handleEwbSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChallan) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      const res: any = await apiClient.post(
        `/distribution/challans/${selectedChallan.id}/eway-bill`,
        {
          transporterId: ewbForm.transporterId || undefined,
          transporterName: ewbForm.transporterName || undefined,
          vehicleNumber: ewbForm.vehicleNumber || undefined,
          distanceKm: Number(ewbForm.distanceKm || 50),
        }
      );
      setGeneratedEwbPayload(res);
    } catch (err: any) {
      setActionError(err.message || "Failed to generate E-Way Bill payload.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredChallans = challans.filter((c) => {
    if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
    if (typeFilter !== "ALL" && c.challanType !== typeFilter) return false;
    return true;
  });

  const columns: ColumnDef<DeliveryChallan>[] = [
    {
      header: lang === "gu" ? "ચલણ #" : "Challan #",
      accessorKey: "challanNumber",
      sortable: true,
      cell: (ch) => (
        <div className="font-mono font-medium text-slate-900">
          <div>{ch.challanNumber}</div>
          {ch.eWayBillNumber ? (
            <span className="text-[10px] text-indigo-600 font-sans block">
              EWB: {ch.eWayBillNumber}
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 font-sans block">
              No EWB Recorded
            </span>
          )}
        </div>
      ),
    },
    {
      header: lang === "gu" ? "તારીખ" : "Date",
      accessorKey: "challanDate",
      sortable: true,
      cell: (ch) => (
        <span className="text-xs text-slate-600 whitespace-nowrap">
          {new Date(ch.challanDate).toLocaleDateString("en-IN")}
        </span>
      ),
    },
    {
      header: lang === "gu" ? "પ્રકાર" : "Type",
      accessorKey: "challanType",
      sortable: true,
      cell: (ch) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
          {ch.challanType.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      header: lang === "gu" ? "પાર્ટી / ગોડાઉન" : "Recipient / Warehouse",
      accessorKey: "partyId",
      cell: (ch) => (
        <div>
          <div className="font-medium text-slate-800">
            {ch.party?.name || ch.warehouse?.name || "Direct / Self"}
          </div>
          {ch.party?.gstin && (
            <span className="text-xs text-slate-400 font-mono">
              GSTIN: {ch.party.gstin}
            </span>
          )}
        </div>
      ),
    },
    {
      header: lang === "gu" ? "સ્થિતિ" : "Status",
      accessorKey: "status",
      sortable: true,
      className: "text-center",
      cell: (ch) => <StatusBadge status={ch.status} />,
    },
    {
      header: lang === "gu" ? "રકમ (₹)" : "Total Amount",
      accessorKey: "totalAmount",
      sortable: true,
      className: "text-right font-mono",
      cell: (ch) => (
        <div>
          <div className="font-semibold text-slate-900">
            ₹{Number(ch.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400 block">
            Tax: ₹{(Number(ch.cgstAmount) + Number(ch.sgstAmount) + Number(ch.igstAmount)).toFixed(2)}
          </span>
        </div>
      ),
    },
    {
      header: lang === "gu" ? "ક્રિયાઓ" : "Actions",
      className: "text-right whitespace-nowrap",
      cell: (ch) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleOpenEwb(ch)}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-2 py-1 rounded transition-colors"
            title="E-Way Bill Payload"
          >
            {lang === "gu" ? "E-Way બિલ" : "E-Way Bill"}
          </button>

          {ch.status === "DRAFT" && (
            <button
              onClick={() => handleOpenIssue(ch)}
              className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold px-2.5 py-1 rounded"
            >
              {lang === "gu" ? "ઇશ્યૂ કરો" : "Issue"}
            </button>
          )}

          {ch.status === "ISSUED" && (
            <button
              onClick={() => handleOpenClose(ch)}
              className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold px-2.5 py-1 rounded"
            >
              {lang === "gu" ? "બંધ કરો" : "Close"}
            </button>
          )}

          {ch.status === "DRAFT" && (
            <button
              onClick={() => handleOpenCancel(ch)}
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
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-6 bg-primary rounded-full inline-block"></span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {lang === "gu" ? "ડિલિવરી ચલણ (Delivery Challans)" : "Delivery Challans (Sec 55 GST)"}
            </h1>
          </div>
          <p className="text-xs text-muted mt-1 ml-4.5">
            {lang === "gu"
              ? "જોબ વર્ક, અપ્રુવલ પર માલ મોકલવા અને બ્રાન્ચ ટ્રાન્સફર માટે જીએસટી નિયમ ૫૫ મુજબ ચલણ વ્યવસ્થા"
              : "Section 55 compliant non-sale delivery challans for Job Work, Supply on Approval, and Movement of Goods"}
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-pressed text-white rounded-xl text-xs sm:text-sm font-bold shadow-card hover:shadow-hover transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          {lang === "gu" ? "નવું ડિલિવરી ચલણ" : "New Delivery Challan"}
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
      <DataTable<DeliveryChallan>
        data={filteredChallans}
        columns={columns}
        keyExtractor={(c) => c.id}
        searchPlaceholder={
          lang === "gu"
            ? "ચલણ # અથવા વેપારીથી શોધો..."
            : "Search challan # or party..."
        }
        searchKeys={["challanNumber", "challanType", "status", "eWayBillNumber"]}
        defaultPageSize={10}
        isLoading={isLoading}
        emptyMessage={
          lang === "gu"
            ? "કોઈ ડિલિવરી ચલણ મળ્યું નથી. જોબ વર્ક અથવા માલ મોકલવા માટે નવું ચલણ બનાવો."
            : "No Delivery Challans found. Generate a delivery challan for job work or transport."
        }
        exportFilename="delivery_challans"
        themeColor="saffron"
        toolbarChildren={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {(["ALL", "JOB_WORK", "SUPPLY_ON_APPROVAL", "BRANCH_TRANSFER"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                    typeFilter === t
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-slate-50 text-slate-700 border-border hover:bg-slate-100"
                  }`}
                >
                  {t === "ALL" ? "All Types" : t.replace(/_/g, " ")}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {(["ALL", "DRAFT", "ISSUED", "CLOSED", "CANCELLED"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    statusFilter === st
                      ? "bg-[#F47721] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st === "ALL" ? (lang === "gu" ? "બધી સ્થિતિ" : "All Status") : st.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        }
        mobileCardRender={(ch) => (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-slate-900">{ch.challanNumber}</span>
                {ch.eWayBillNumber && (
                  <span className="text-[10px] text-indigo-600 block">EWB: {ch.eWayBillNumber}</span>
                )}
              </div>
              <StatusBadge status={ch.status} />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{new Date(ch.challanDate).toLocaleDateString("en-IN")}</span>
              <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-slate-100 font-medium">
                {ch.challanType.replace(/_/g, " ")}
              </span>
            </div>
            <div className="text-xs font-medium text-slate-800">
              {ch.party?.name || ch.warehouse?.name || "Direct / Self"}
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
              <span className="text-slate-500">Amount:</span>
              <span className="font-mono font-bold text-slate-900">
                ₹{Number(ch.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => handleOpenEwb(ch)}
                className="text-xs text-indigo-600 font-medium"
              >
                E-Way Bill
              </button>
              {ch.status === "DRAFT" && (
                <button
                  onClick={() => handleOpenIssue(ch)}
                  className="text-xs text-[#F47721] font-semibold"
                >
                  Issue
                </button>
              )}
              {ch.status === "ISSUED" && (
                <button
                  onClick={() => handleOpenClose(ch)}
                  className="text-xs text-emerald-600 font-semibold"
                >
                  Close
                </button>
              )}
              {ch.status === "DRAFT" && (
                <button
                  onClick={() => handleOpenCancel(ch)}
                  className="text-xs text-rose-600 font-medium"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      />

      {/* Create Delivery Challan Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={lang === "gu" ? "નવું ડિલિવરી ચલણ બનાવો" : "Create Delivery Challan"}
        titleGujarati="સેક્શન ૫૫ મુજબ નોન-સેલ ટ્રાન્સપોર્ટ ચલણ"
        maxWidth="4xl"
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
              form="create-challan-form"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#F47721] hover:bg-[#D95F12] text-white rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "..." : lang === "gu" ? "ચલણ બનાવો" : "Create Challan"}
            </button>
          </>
        }
      >
        <form id="create-challan-form" onSubmit={handleCreateSubmit} className="space-y-4">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              {actionError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "ચલણ નંબર" : "Challan Number"}
              </label>
              <input
                type="text"
                value={createForm.challanNumber}
                onChange={(e) => setCreateForm({ ...createForm, challanNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "તારીખ *" : "Date *"}
              </label>
              <input
                type="date"
                value={createForm.challanDate}
                onChange={(e) => setCreateForm({ ...createForm, challanDate: e.target.value })}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "ચલણનો પ્રકાર *" : "Challan Type *"}
              </label>
              <select
                value={createForm.challanType}
                onChange={(e) => setCreateForm({ ...createForm, challanType: e.target.value as any })}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
              >
                <option value="JOB_WORK">Job Work (Rule 55)</option>
                <option value="SUPPLY_ON_APPROVAL">Supply on Approval</option>
                <option value="BRANCH_TRANSFER">Branch Transfer</option>
                <option value="OTHER">Other Movement</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "વેપારી / ગ્રાહક (Party)" : "Party / Recipient"}
              </label>
              <select
                value={createForm.partyId}
                onChange={(e) => setCreateForm({ ...createForm, partyId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
              >
                <option value="">{lang === "gu" ? "-- પસંદ કરો --" : "-- Select Party --"}</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.gstin ? `(${p.gstin})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "ગોડાઉન (Warehouse) *" : "Dispatch Warehouse *"}
              </label>
              <select
                value={createForm.warehouseId}
                onChange={(e) => setCreateForm({ ...createForm, warehouseId: e.target.value })}
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
                {lang === "gu" ? "સપ્લાય સ્ટેટ કોડ" : "Place of Supply Code"}
              </label>
              <input
                type="text"
                value={createForm.placeOfSupply}
                onChange={(e) => setCreateForm({ ...createForm, placeOfSupply: e.target.value })}
                placeholder="24 (Gujarat)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono"
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
              <span className="text-xs font-bold text-slate-700 uppercase">
                {lang === "gu" ? "ચલણ માલસામાન યાદી" : "Goods List"}
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs text-indigo-600 font-semibold hover:text-indigo-800"
              >
                + {lang === "gu" ? "આઈટમ ઉમેરો" : "Add Item"}
              </button>
            </div>

            <div className="p-3 space-y-3">
              {createForm.items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-12 sm:col-span-4">
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">Item</label>
                    <select
                      value={it.itemId}
                      onChange={(e) => handleItemChange(idx, "itemId", e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    >
                      {items.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">HSN</label>
                    <input
                      type="text"
                      value={it.hsnCode}
                      onChange={(e) => handleItemChange(idx, "hsnCode", e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">Quantity</label>
                    <input
                      type="number"
                      min="0.001"
                      step="any"
                      value={it.quantity}
                      onChange={(e) => handleItemChange(idx, "quantity", parseFloat(e.target.value) || 0)}
                      required
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">Unit Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={it.unitPrice}
                      onChange={(e) => handleItemChange(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                      required
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-1">
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">GST %</label>
                    <select
                      value={it.taxRate}
                      onChange={(e) => handleItemChange(idx, "taxRate", parseFloat(e.target.value) || 0)}
                      className="w-full px-1.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </div>
                  <div className="col-span-1 text-right pt-3">
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
        </form>
      </Modal>

      {/* Issue Modal */}
      <Modal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        title={lang === "gu" ? "ચલણ ઇશ્યૂ કરો (Issue Challan)" : "Issue Delivery Challan"}
        titleGujarati={selectedChallan?.challanNumber}
        maxWidth="sm"
        footer={
          <>
            <button
              onClick={() => setIsIssueModalOpen(false)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600"
            >
              {lang === "gu" ? "રદ કરો" : "Cancel"}
            </button>
            <button
              type="submit"
              form="issue-challan-form"
              disabled={isSubmitting}
              className="px-3 py-1.5 bg-[#F47721] hover:bg-[#D95F12] text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              {isSubmitting ? "..." : lang === "gu" ? "ઇશ્યૂ કરો" : "Confirm Issue"}
            </button>
          </>
        }
      >
        <form id="issue-challan-form" onSubmit={handleIssueSubmit} className="space-y-3">
          <p className="text-xs text-slate-600">
            {lang === "gu"
              ? "આ ચલણ ઇશ્યૂ કરવાથી માલની ડિલિવરી અધિકૃત થશે."
              : "Issuing authorizes physical movement of goods under Section 55."}
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === "gu" ? "E-Way બિલ નંબર (જો ઉપલબ્ધ હોય)" : "E-Way Bill Number (Optional)"}
            </label>
            <input
              type="text"
              value={issueEwbNumber}
              onChange={(e) => setIssueEwbNumber(e.target.value)}
              placeholder="e.g. 231012345678"
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono"
            />
          </div>
        </form>
      </Modal>

      {/* Close Modal */}
      <Modal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        title={lang === "gu" ? "ચલણ બંધ કરો (Close Challan)" : "Close Delivery Challan"}
        maxWidth="sm"
        footer={
          <>
            <button
              onClick={() => setIsCloseModalOpen(false)}
              className="px-3 py-1.5 border border-slate-200 rounded text-xs text-slate-600"
            >
              {lang === "gu" ? "રદ કરો" : "Cancel"}
            </button>
            <button
              type="submit"
              form="close-challan-form"
              disabled={isSubmitting}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
            >
              {isSubmitting ? "..." : lang === "gu" ? "હા, બંધ કરો" : "Confirm Close"}
            </button>
          </>
        }
      >
        <form id="close-challan-form" onSubmit={handleCloseSubmit} className="space-y-2">
          <p className="text-xs text-slate-600">
            {lang === "gu"
              ? "શું જોબ વર્ક અથવા માલની હેરફેર પૂર્ણ થઈ ગઈ છે? ચલણ બંધ કરવાથી સ્ટેટસ CLOSED થશે."
              : "Confirm closing this challan once job work or approval movement has concluded."}
          </p>
        </form>
      </Modal>

      {/* Cancel Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title={lang === "gu" ? "ચલણ રદ કરો" : "Cancel Delivery Challan"}
        maxWidth="sm"
        footer={
          <>
            <button
              onClick={() => setIsCancelModalOpen(false)}
              className="px-3 py-1.5 border border-slate-200 rounded text-xs text-slate-600"
            >
              {lang === "gu" ? "પાછા જાઓ" : "Back"}
            </button>
            <button
              type="submit"
              form="cancel-challan-form"
              disabled={isSubmitting}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold"
            >
              {isSubmitting ? "..." : lang === "gu" ? "હા, રદ કરો" : "Confirm Cancel"}
            </button>
          </>
        }
      >
        <form id="cancel-challan-form" onSubmit={handleCancelSubmit} className="space-y-3">
          <p className="text-xs text-slate-600">
            {lang === "gu"
              ? "શું તમે આ ડ્રાફ્ટ ડિલિવરી ચલણ રદ કરવા માંગો છો?"
              : "Are you sure you want to cancel this delivery challan?"}
          </p>
          <input
            type="text"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason for cancellation"
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs"
          />
        </form>
      </Modal>

      {/* E-Way Bill Generation Modal */}
      <Modal
        isOpen={isEwbModalOpen}
        onClose={() => setIsEwbModalOpen(false)}
        title={lang === "gu" ? "E-Way બિલ ડેટા અને પેલોડ" : "E-Way Bill Compliance Payload"}
        titleGujarati="જીએસટી સેક્શન ૫૫ અને નિયમ ૧૩૮ મુજબ"
        maxWidth="2xl"
        footer={
          <button
            onClick={() => setIsEwbModalOpen(false)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
          >
            {lang === "gu" ? "બંધ કરો" : "Close"}
          </button>
        }
      >
        <div className="space-y-4">
          {/* Statutory Disclosure Notice */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
            <span className="font-bold block mb-1">
              ⚠️ {lang === "gu" ? "કાનૂની સૂચના (Statutory Notice):" : "Statutory Notice & Policy Compliance:"}
            </span>
            {lang === "gu"
              ? "સિસ્ટમ NIC પોર્ટલ અપલોડ માટે કાયદેસર E-Way Bill JSON પેલોડ તૈયાર કરે છે. કોઈ પણ બનાવટી IRN અથવા ડમી E-Way Bill નંબર જનરેટ કરવામાં આવતો નથી. સરકારી પોર્ટલ પરથી સાચો EWB જનરેટ કરીને અહીં નંબર દાખલ કરો."
              : "This screen prepares the official GST E-Way Bill JSON payload in compliance with Section 55 & Rule 138. The system does not fabricate simulated IRN/EWB numbers. Use this payload for NIC portal upload or configure your approved GSP API credentials."}
          </div>

          {!generatedEwbPayload ? (
            <form onSubmit={handleEwbSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transporter ID (GSTIN / TRANSIN)
                  </label>
                  <input
                    type="text"
                    value={ewbForm.transporterId}
                    onChange={(e) => setEwbForm({ ...ewbForm, transporterId: e.target.value })}
                    placeholder="e.g. 24AABCT1234F1Z0"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transporter Name
                  </label>
                  <input
                    type="text"
                    value={ewbForm.transporterName}
                    onChange={(e) => setEwbForm({ ...ewbForm, transporterName: e.target.value })}
                    placeholder="e.g. Gujarat Express Logistics"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    value={ewbForm.vehicleNumber}
                    onChange={(e) => setEwbForm({ ...ewbForm, vehicleNumber: e.target.value })}
                    placeholder="e.g. GJ01AB1234"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Approx Distance (KM)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={ewbForm.distanceKm}
                    onChange={(e) => setEwbForm({ ...ewbForm, distanceKm: parseInt(e.target.value) || 0 })}
                    required
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2 bg-[#F47721] hover:bg-[#D95F12] text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  {isSubmitting ? "Generating..." : "Generate Statutory E-Way Bill JSON Payload"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase">
                  NIC Compatible JSON Payload
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(generatedEwbPayload, null, 2));
                    alert("JSON payload copied to clipboard!");
                  }}
                  className="text-xs text-[#F47721] font-semibold hover:text-[#D95F12]"
                >
                  Copy JSON
                </button>
              </div>

              <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-64">
                {JSON.stringify(generatedEwbPayload, null, 2)}
              </pre>

              <button
                onClick={() => setGeneratedEwbPayload(null)}
                className="text-xs text-slate-500 hover:text-slate-700 underline"
              >
                Modify details & regenerate
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
