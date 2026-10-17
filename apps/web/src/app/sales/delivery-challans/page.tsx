"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";
import { Modal } from "../../../components/ui/modal";
import { Badge, StatusBadge } from "../../../components/ui/badge";
import { DataTable, ColumnDef } from "../../../components/ui/data-table";
import { EwbSlipModal } from "../../../components/gst/ewb-slip-modal";

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
  const router = useRouter();
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
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isEwbModalOpen, setIsEwbModalOpen] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState<DeliveryChallan | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Keyboard shortcut (F2: New Delivery Challan)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        router.push("/sales/delivery-challans/new");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  // Issue Form
  const [issueEwbNumber, setIssueEwbNumber] = useState("");

  // Cancel Form
  const [cancelReason, setCancelReason] = useState("");

  // EWB Generation & Management Form
  const [viewEwbSlipNumber, setViewEwbSlipNumber] = useState<string | null>(null);
  const [ewbTab, setEwbTab] = useState<"GENERATE" | "LINK" | "JSON">("GENERATE");
  const [linkEwbNumber, setLinkEwbNumber] = useState("");
  const [ewbSuccessResult, setEwbSuccessResult] = useState<any | null>(null);
  const [ewbForm, setEwbForm] = useState({
    transporterId: "",
    transporterName: "",
    vehicleNumber: "",
    distanceKm: 50,
  });
  const [generatedEwbPayload, setGeneratedEwbPayload] = useState<any | null>(null);
  const [copiedEwb, setCopiedEwb] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

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
    if (ch.eWayBillNumber) {
      setViewEwbSlipNumber(ch.eWayBillNumber);
      return;
    }
    setSelectedChallan(ch);
    setEwbTab("GENERATE");
    setLinkEwbNumber("");
    setEwbSuccessResult(null);
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

  const handleEwbGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChallan) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      const res: any = await apiClient.post(
        `/gst/eway-bills/challans/${selectedChallan.id}/generate`,
        {
          transporterId: ewbForm.transporterId?.trim() || undefined,
          transporterName: ewbForm.transporterName?.trim() || undefined,
          vehicleNumber: ewbForm.vehicleNumber?.toUpperCase().trim() || undefined,
          distanceKm: Number(ewbForm.distanceKm || 50),
        }
      );
      if (res.outcome === "SUCCEEDED" && res.ewbNumber) {
        setEwbSuccessResult(res);
        if (res.draft) setGeneratedEwbPayload(res.draft);
        await fetchData();
      } else {
        setActionError(res.message || "Failed to generate E-Way Bill.");
      }
    } catch (err: any) {
      setActionError(err.message || "Failed to generate E-Way Bill.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEwbLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChallan) return;
    const clean = linkEwbNumber.replace(/\s+/g, "").trim();
    if (!/^\d{12}$/.test(clean)) {
      setActionError("E-Way Bill Number must be exactly 12 numeric digits.");
      return;
    }
    setIsSubmitting(true);
    setActionError(null);
    try {
      const res: any = await apiClient.post("/gst/eway-bills/link", {
        challanId: selectedChallan.id,
        ewbNumber: clean,
        distanceKm: Number(ewbForm.distanceKm || 50),
        vehicleNumber: ewbForm.vehicleNumber?.toUpperCase().trim() || undefined,
        transporterId: ewbForm.transporterId?.trim() || undefined,
        transporterName: ewbForm.transporterName?.trim() || undefined,
      });
      if (res.outcome === "SUCCEEDED") {
        setEwbSuccessResult({ ewbNumber: clean, ...res });
        await fetchData();
      } else {
        setActionError(res.message || "Failed to link E-Way Bill.");
      }
    } catch (err: any) {
      setActionError(err.message || "Failed to link E-Way Bill.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrepareJson = async () => {
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
      setGeneratedEwbPayload(res.payload || res);
    } catch (err: any) {
      setActionError(err.message || "Failed to prepare NIC JSON payload.");
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
            <button
              onClick={() => setViewEwbSlipNumber(ch.eWayBillNumber!)}
              className="text-[10px] text-indigo-700 hover:text-indigo-900 font-bold font-mono bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded block mt-0.5 hover:underline"
              title="Click to view & print Form GST EWB-01 slip"
            >
              EWB: {ch.eWayBillNumber}
            </button>
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
          {ch.eWayBillNumber ? (
            <button
              onClick={() => setViewEwbSlipNumber(ch.eWayBillNumber!)}
              className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold px-2 py-1 rounded border border-indigo-200 flex items-center gap-1 transition-colors"
              title="Print Form GST EWB-01 Official Slip"
            >
              <svg className="w-3 h-3 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print EWB Slip
            </button>
          ) : (
            <button
              onClick={() => handleOpenEwb(ch)}
              className="text-xs bg-orange-50 text-orange-700 hover:bg-orange-100 font-semibold px-2 py-1 rounded border border-orange-200 transition-colors"
              title="Generate / Link E-Way Bill"
            >
              {lang === "gu" ? "E-Way બિલ" : "E-Way Bill"}
            </button>
          )}

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
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {lang === "gu" ? "ડિલિવરી ચલણ (Delivery Challans)" : "Delivery Challans (Sec 55 GST)"}
          </h1>
          <p className="text-xs text-muted mt-1">
            {lang === "gu"
              ? "જોબ વર્ક, અપ્રુવલ પર માલ મોકલવા અને બ્રાન્ચ ટ્રાન્સફર માટે જીએસટી નિયમ ૫૫ મુજબ ચલણ વ્યવસ્થા"
              : "Section 55 compliant non-sale delivery challans for Job Work, Supply on Approval, and Movement of Goods"}
          </p>
        </div>

        <Link
          href="/sales/delivery-challans/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#F47721] hover:bg-[#D95F12] active:bg-[#B94B0A] text-white rounded-xl text-xs sm:text-sm font-bold shadow-saffron transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          {lang === "gu" ? "નવું ડિલિવરી ચલણ (F2)" : "Create Delivery Challan (F2)"}
        </Link>
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
          <div key={ch.id} className="space-y-2">
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
              {ch.eWayBillNumber ? (
                <button
                  onClick={() => setViewEwbSlipNumber(ch.eWayBillNumber!)}
                  className="text-xs text-indigo-700 font-semibold underline"
                >
                  Print EWB Slip
                </button>
              ) : (
                <button
                  onClick={() => handleOpenEwb(ch)}
                  className="text-xs text-[#F47721] font-semibold"
                >
                  + E-Way Bill
                </button>
              )}
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

      {/* E-Way Bill Setup & Generation Modal */}
      <Modal
        isOpen={isEwbModalOpen}
        onClose={() => setIsEwbModalOpen(false)}
        title={lang === "gu" ? "E-Way બિલ સંપૂર્ણ વ્યવસ્થા (Rule 138)" : "E-Way Bill Compliance (Rule 138)"}
        titleGujarati={selectedChallan ? `ચલણ: ${selectedChallan.challanNumber}` : undefined}
        maxWidth="2xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-[11px] text-slate-500 hidden sm:block">
              {ewbTab === "GENERATE" && "⚡ Rule 138: 1 day per 200 KM calculation"}
              {ewbTab === "LINK" && "🔗 Official 12-digit portal number verification"}
              {ewbTab === "JSON" && "📄 NIC Standard Schema (Form GST EWB-01)"}
            </div>
            <button
              type="button"
              onClick={() => setIsEwbModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors ml-auto"
            >
              {lang === "gu" ? "બંધ કરો" : "Close"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Active Challan Context Summary Strip */}
          {selectedChallan && (
            <div className="bg-gradient-to-r from-orange-50/80 via-amber-50/40 to-slate-50 border border-orange-200/80 rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#F47721] flex items-center justify-center shrink-0 shadow-xs">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 font-mono text-sm">
                      {selectedChallan.challanNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-800 uppercase tracking-wide">
                      {selectedChallan.challanType?.replace(/_/g, " ")}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(selectedChallan.challanDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] mt-0.5 truncate max-w-sm">
                    Consignee: <strong className="text-slate-800">{selectedChallan.party?.name || "Direct / Internal Movement"}</strong>
                    {selectedChallan.party?.gstin && <span className="font-mono ml-1 text-slate-500">({selectedChallan.party.gstin})</span>}
                  </p>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-orange-200/60 pt-2 sm:pt-0 sm:pl-4 shrink-0">
                <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Total Value</span>
                <span className="text-sm sm:text-base font-bold text-slate-900 font-mono">
                  ₹{(selectedChallan.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-rose-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{actionError}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionError(null)}
                className="text-rose-500 hover:text-rose-700 text-xs font-bold px-1.5 py-0.5"
              >
                ✕
              </button>
            </div>
          )}

          {ewbSuccessResult ? (
            /* SUCCESS STATE */
            <div className="p-5 sm:p-6 bg-gradient-to-b from-emerald-50/90 to-white border border-emerald-200 rounded-2xl space-y-4 text-center shadow-xs">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider mb-1">
                  ✓ Statutory EWB Recorded
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {lang === "gu" ? "E-Way Bill સફળતાપૂર્વક તૈયાર થયેલ છે!" : "E-Way Bill Successfully Recorded!"}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Challan <strong className="font-mono text-slate-800">{selectedChallan?.challanNumber}</strong> is now compliant under Rule 138.
                </p>
              </div>

              <div className="p-4 bg-white border border-emerald-200/90 rounded-xl max-w-sm mx-auto shadow-xs space-y-2">
                <div className="text-[11px] text-slate-500 uppercase font-semibold tracking-wider">
                  Official Form GST EWB-01 Number
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-mono font-black text-slate-900 tracking-widest">
                    {ewbSuccessResult.ewbNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(ewbSuccessResult.ewbNumber);
                      setCopiedEwb(true);
                      setTimeout(() => setCopiedEwb(false), 2000);
                    }}
                    title="Copy E-Way Bill Number"
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    {copiedEwb ? (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">✓ Copied</span>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
                {ewbSuccessResult.validUpto && (
                  <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-100 flex items-center justify-center gap-1">
                    <span className="text-slate-400">Valid Until:</span>
                    <strong className="text-slate-800">
                      {new Date(ewbSuccessResult.validUpto).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </strong>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const num = ewbSuccessResult.ewbNumber;
                    setIsEwbModalOpen(false);
                    setViewEwbSlipNumber(num);
                  }}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Print Form GST EWB-01 Slip</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEwbModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  {lang === "gu" ? "બંધ કરો" : "Done / Close"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Segmented Tab Switcher */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setEwbTab("GENERATE")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                    ewbTab === "GENERATE"
                      ? "bg-white text-orange-700 shadow-sm border border-orange-200/60 font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
                >
                  <svg className="w-3.5 h-3.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>{lang === "gu" ? "1. બિલ જનરેટ કરો" : "1. Generate EWB"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEwbTab("LINK")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                    ewbTab === "LINK"
                      ? "bg-white text-indigo-700 shadow-sm border border-indigo-200/60 font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
                >
                  <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span>{lang === "gu" ? "2. પોર્ટલ EWB જોડો" : "2. Link Govt EWB"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEwbTab("JSON");
                    if (!generatedEwbPayload) handlePrepareJson();
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                    ewbTab === "JSON"
                      ? "bg-white text-slate-900 shadow-sm border border-slate-300/80 font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
                >
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  <span>{lang === "gu" ? "3. NIC JSON ફાઇલ" : "3. NIC JSON File"}</span>
                </button>
              </div>

              {/* Tab 1: Generate */}
              {ewbTab === "GENERATE" && (
                <form onSubmit={handleEwbGenerate} className="space-y-4 pt-1">
                  {/* Statutory Info Card with Live Validity */}
                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 sm:p-3.5 text-xs text-amber-900 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-bold flex items-center gap-1.5 text-amber-900">
                        <svg className="w-4 h-4 text-amber-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Rule 138 Statutory Calculation
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                        ⚡ Validity: <strong>{Math.max(1, Math.ceil((ewbForm.distanceKm || 50) / 200))} Day(s)</strong>
                      </span>
                    </div>
                    <p className="text-amber-800/90 text-[11.5px] leading-relaxed">
                      Statutory validity is automatically computed at <strong>1 day per 200 KM</strong> (Rule 138(10)). An official 12-digit Form GST EWB-01 record will be created and linked to this challan.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Vehicle Number <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={ewbForm.vehicleNumber}
                          onChange={(e) => setEwbForm({ ...ewbForm, vehicleNumber: e.target.value.toUpperCase() })}
                          placeholder="GJ01AB1234"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium uppercase tracking-wider focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:normal-case placeholder:tracking-normal placeholder:font-sans placeholder:text-slate-400"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Format: State + RTO + Series (e.g. GJ01AB1234)
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Approx Distance (KM) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          required
                          value={ewbForm.distanceKm}
                          onChange={(e) => setEwbForm({ ...ewbForm, distanceKm: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 pr-12 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                          KM
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-1">
                        {Math.max(1, Math.ceil((ewbForm.distanceKm || 50) / 200))} Day(s) Statutory Movement Window
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Transporter ID (GSTIN / TRANSIN)
                      </label>
                      <input
                        type="text"
                        value={ewbForm.transporterId}
                        onChange={(e) => setEwbForm({ ...ewbForm, transporterId: e.target.value.toUpperCase() })}
                        placeholder="24AABCT1234F1Z0"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono uppercase tracking-wide focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400"
                      />
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Required if goods handed over to a transporter
                      </span>
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
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400"
                      />
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Registered transport agency or logistics fleet
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-[#F47721] hover:from-orange-600 hover:to-[#D95F12] text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generating Statutory E-Way Bill (Rule 138)...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Generate Statutory E-Way Bill (Rule 138)
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Tab 2: Link */}
              {ewbTab === "LINK" && (
                <form onSubmit={handleEwbLink} className="space-y-4 pt-1">
                  <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-xl text-xs text-blue-900 leading-relaxed flex items-start gap-2.5">
                    <svg className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      Enter the official 12-digit E-Way Bill Number generated on <strong className="text-blue-950 underline">ewaybillgst.gov.in</strong> to link it with this Delivery Challan.
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        12-Digit E-Way Bill Number <span className="text-rose-500">*</span>
                      </label>
                      <span className={`text-[10px] font-mono font-semibold ${linkEwbNumber.length === 12 ? "text-emerald-600" : "text-slate-400"}`}>
                        {linkEwbNumber.length === 12 ? "✓ 12/12 digits" : `${linkEwbNumber.length} / 12 digits`}
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={12}
                      value={linkEwbNumber}
                      onChange={(e) => setLinkEwbNumber(e.target.value.replace(/\D/g, ""))}
                      placeholder="e.g. 241088219920"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-mono font-bold tracking-widest text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Vehicle Number
                      </label>
                      <input
                        type="text"
                        value={ewbForm.vehicleNumber}
                        onChange={(e) => setEwbForm({ ...ewbForm, vehicleNumber: e.target.value.toUpperCase() })}
                        placeholder="GJ01AB1234"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono uppercase tracking-wide focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Approx Distance (KM)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          value={ewbForm.distanceKm}
                          onChange={(e) => setEwbForm({ ...ewbForm, distanceKm: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 pr-12 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                          KM
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting || linkEwbNumber.length !== 12}
                      className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Linking Portal Number...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          Link Portal E-Way Bill Number
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Tab 3: NIC JSON */}
              {ewbTab === "JSON" && (
                <div className="space-y-3 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      NIC Compatible JSON Payload
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!generatedEwbPayload) return;
                          navigator.clipboard.writeText(JSON.stringify(generatedEwbPayload, null, 2));
                          setCopiedJson(true);
                          setTimeout(() => setCopiedJson(false), 2000);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-orange-50 text-[#F47721] hover:bg-orange-100 transition-colors flex items-center gap-1"
                      >
                        {copiedJson ? "✓ Copied" : "Copy JSON"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!generatedEwbPayload) return;
                          const blob = new Blob([JSON.stringify(generatedEwbPayload, null, 2)], {
                            type: "application/json",
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `EWB-Challan-${selectedChallan?.challanNumber}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download .JSON
                      </button>
                    </div>
                  </div>

                  <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-72 border border-slate-800 shadow-inner">
                    {generatedEwbPayload ? JSON.stringify(generatedEwbPayload, null, 2) : "Preparing NIC compliant payload..."}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>

      {/* Official Form GST EWB-01 Print Slip Modal */}
      <EwbSlipModal
        ewbNumber={viewEwbSlipNumber}
        isOpen={Boolean(viewEwbSlipNumber)}
        onClose={() => setViewEwbSlipNumber(null)}
        onVehicleUpdated={fetchData}
        onCancelled={fetchData}
      />
    </div>
  );
}
