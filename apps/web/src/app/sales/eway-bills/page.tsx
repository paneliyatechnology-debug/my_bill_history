"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";
import { Modal } from "../../../components/ui/modal";
import { Badge } from "../../../components/ui/badge";
import { DataTable, ColumnDef } from "../../../components/ui/data-table";
import { EwbSlipModal } from "../../../components/gst/ewb-slip-modal";

interface EWayBillListItem {
  id: string;
  ewbNumber: string;
  ewbDate: string;
  validUpto: string;
  distanceKm: number;
  vehicleNumber?: string;
  transporterId?: string;
  transporterName?: string;
  status: "ACT" | "CNL" | string;
  cancelReason?: string;
  cancelledAt?: string;
  environment?: string;
  docType: "TAX_INVOICE" | "DELIVERY_CHALLAN";
  docNumber: string;
  docDate: string;
  partyName: string;
  partyGstin?: string;
  taxableAmount: number;
  totalAmount: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
  invoiceId?: string;
  deliveryChallanId?: string;
}

interface EwbSummary {
  totalCount: number;
  activeCount: number;
  expiringSoonCount: number;
  cancelledCount: number;
  expiredCount: number;
  inTransitValue: number;
}

export default function EWayBillsPage() {
  const { lang, tenantContext } = useAuth();

  const [items, setItems] = useState<EWayBillListItem[]>([]);
  const [summary, setSummary] = useState<EwbSummary>({
    totalCount: 0,
    activeCount: 0,
    expiringSoonCount: 0,
    cancelledCount: 0,
    expiredCount: 0,
    inTransitValue: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<"ALL" | "ACT" | "SOON" | "EXP" | "CNL">("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [selectedEwbForSlip, setSelectedEwbForSlip] = useState<string | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  // Link Form State
  const [linkDocType, setLinkDocType] = useState<"INVOICE" | "CHALLAN">("CHALLAN");
  const [availableInvoices, setAvailableInvoices] = useState<any[]>([]);
  const [availableChallans, setAvailableChallans] = useState<any[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [linkForm, setLinkForm] = useState({
    ewbNumber: "",
    distanceKm: 50,
    vehicleNumber: "",
    transporterId: "",
    transporterName: "",
  });
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Quick Vehicle Update & Cancel directly from table
  const [vehicleUpdateTarget, setVehicleUpdateTarget] = useState<EWayBillListItem | null>(null);
  const [quickVehicleNum, setQuickVehicleNum] = useState("");
  const [quickVehicleReason, setQuickVehicleReason] = useState("1");
  const [isQuickUpdatingVehicle, setIsQuickUpdatingVehicle] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<EWayBillListItem | null>(null);
  const [quickCancelReasonCode, setQuickCancelReasonCode] = useState("1");
  const [quickCancelRemarks, setQuickCancelRemarks] = useState("");
  const [isQuickCancelling, setIsQuickCancelling] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get("/gst/eway-bills");
      if (res && res.items) {
        setItems(res.items);
        if (res.summary) setSummary(res.summary);
      } else {
        setItems([]);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load E-Way bills.");
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

  // Load eligible documents when opening link modal
  const handleOpenLinkModal = async () => {
    setIsLinkModalOpen(true);
    setLinkError(null);
    setSelectedDocId("");
    try {
      const [invRes, chlRes] = await Promise.allSettled([
        apiClient.get<any[]>("/sales/invoices"),
        apiClient.get<any[]>("/distribution/challans"),
      ]);
      if (invRes.status === "fulfilled") {
        setAvailableInvoices(extractList(invRes.value));
      }
      if (chlRes.status === "fulfilled") {
        setAvailableChallans(extractList(chlRes.value));
      }
    } catch {
      // ignore
    }
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId) {
      setLinkError("Please select an Invoice or Delivery Challan.");
      return;
    }
    const cleanEwb = linkForm.ewbNumber.replace(/\s+/g, "").trim();
    if (!/^\d{12}$/.test(cleanEwb)) {
      setLinkError("E-Way Bill Number must be exactly 12 numeric digits.");
      return;
    }

    setIsLinking(true);
    setLinkError(null);
    try {
      await apiClient.post("/gst/eway-bills/link", {
        invoiceId: linkDocType === "INVOICE" ? selectedDocId : undefined,
        challanId: linkDocType === "CHALLAN" ? selectedDocId : undefined,
        ewbNumber: cleanEwb,
        distanceKm: Number(linkForm.distanceKm || 50),
        vehicleNumber: linkForm.vehicleNumber?.toUpperCase().trim() || undefined,
        transporterId: linkForm.transporterId?.trim() || undefined,
        transporterName: linkForm.transporterName?.trim() || undefined,
      });

      setIsLinkModalOpen(false);
      setLinkForm({
        ewbNumber: "",
        distanceKm: 50,
        vehicleNumber: "",
        transporterId: "",
        transporterName: "",
      });
      await fetchData();
    } catch (err: any) {
      setLinkError(err?.message || "Failed to link E-Way Bill.");
    } finally {
      setIsLinking(false);
    }
  };

  const handleQuickVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleUpdateTarget || !quickVehicleNum) return;
    setIsQuickUpdatingVehicle(true);
    try {
      await apiClient.post(`/gst/eway-bills/${vehicleUpdateTarget.ewbNumber}/vehicle`, {
        vehicleNumber: quickVehicleNum.toUpperCase().trim(),
        reasonCode: quickVehicleReason,
      });
      setVehicleUpdateTarget(null);
      setQuickVehicleNum("");
      await fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to update vehicle number.");
    } finally {
      setIsQuickUpdatingVehicle(false);
    }
  };

  const handleQuickCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTarget) return;
    setIsQuickCancelling(true);
    try {
      await apiClient.post(`/gst/eway-bills/${cancelTarget.ewbNumber}/cancel`, {
        reasonCode: quickCancelReasonCode,
        remarks: quickCancelRemarks || "Cancelled by user",
      });
      setCancelTarget(null);
      setQuickCancelRemarks("");
      await fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to cancel E-Way Bill.");
    } finally {
      setIsQuickCancelling(false);
    }
  };

  // Filter items by active tab and search
  const filteredItems = items.filter((item) => {
    if (activeTab === "ACT" && (item.status !== "ACT" || item.isExpired)) return false;
    if (activeTab === "SOON" && !item.isExpiringSoon) return false;
    if (activeTab === "EXP" && !item.isExpired) return false;
    if (activeTab === "CNL" && item.status !== "CNL") return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match =
        item.ewbNumber.toLowerCase().includes(q) ||
        item.docNumber?.toLowerCase().includes(q) ||
        item.partyName?.toLowerCase().includes(q) ||
        item.vehicleNumber?.toLowerCase().includes(q) ||
        item.transporterName?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const columns: ColumnDef<EWayBillListItem>[] = [
    {
      header: lang === "gu" ? "ઈ-વે બિલ વિગત" : "E-Way Bill Details",
      accessorKey: "ewbNumber",
      cell: (item: EWayBillListItem) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedEwbForSlip(item.ewbNumber)}
              className="font-mono font-bold text-indigo-700 hover:text-indigo-900 hover:underline text-xs"
              title="Click to view & print Form GST EWB-01 slip"
            >
              {item.ewbNumber}
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(item.ewbNumber);
                alert(`Copied EWB ${item.ewbNumber} to clipboard!`);
              }}
              className="text-slate-400 hover:text-slate-600 p-0.5"
              title="Copy EWB Number"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
          <div className="text-[10px] text-slate-500">
            {new Date(item.ewbDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </div>
        </div>
      ),
    },
    {
      header: lang === "gu" ? "દસ્તાવેજ" : "Document",
      accessorKey: "docNumber",
      cell: (item: EWayBillListItem) => {
        const linkHref =
          item.docType === "TAX_INVOICE" && item.invoiceId
            ? `/sales/invoices/${item.invoiceId}`
            : `/sales/delivery-challans`;
        return (
          <div className="space-y-1">
            <span
              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                item.docType === "TAX_INVOICE"
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "bg-purple-50 text-purple-700 border border-purple-200"
              }`}
            >
              {item.docType === "TAX_INVOICE" ? "Tax Invoice" : "Delivery Challan"}
            </span>
            <div>
              <Link
                href={linkHref}
                className="font-mono text-xs font-semibold text-slate-800 hover:text-indigo-600 hover:underline block"
              >
                {item.docNumber}
              </Link>
            </div>
          </div>
        );
      },
    },
    {
      header: lang === "gu" ? "ગ્રાહક / પક્ષકાર" : "Consignee / Party",
      accessorKey: "partyName",
      cell: (item: EWayBillListItem) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-xs text-slate-900 truncate max-w-[180px]">
            {item.partyName}
          </div>
          <div className="text-[10px] font-mono text-slate-500">
            {item.partyGstin ? `GSTIN: ${item.partyGstin}` : "Unregistered (URP)"}
          </div>
        </div>
      ),
    },
    {
      header: lang === "gu" ? "વાહન / ટ્રાન્સપોર્ટ (Part-B)" : "Part-B (Vehicle / Transport)",
      accessorKey: "vehicleNumber",
      cell: (item: EWayBillListItem) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-slate-800 text-xs bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 uppercase">
              {item.vehicleNumber || "NOT ASSIGNED"}
            </span>
            {item.status === "ACT" && !item.isExpired && (
              <button
                onClick={() => {
                  setVehicleUpdateTarget(item);
                  setQuickVehicleNum(item.vehicleNumber || "");
                }}
                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold underline"
                title="Update Vehicle Number"
              >
                Edit
              </button>
            )}
          </div>
          <div className="text-[10px] text-slate-500">
            {item.transporterName || "Direct"} • {item.distanceKm} KM
          </div>
        </div>
      ),
    },
    {
      header: lang === "gu" ? "માન્યતા સમયમર્યાદા" : "Validity Window",
      accessorKey: "validUpto",
      cell: (item: EWayBillListItem) => {
        const validDate = new Date(item.validUpto);
        const hoursLeft = Math.round(
          (validDate.getTime() - new Date().getTime()) / (1000 * 60 * 60)
        );

        return (
          <div className="space-y-1">
            <div className="text-xs font-medium text-slate-800">
              {validDate.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            {item.status === "CNL" ? (
              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                Cancelled
              </span>
            ) : item.isExpired ? (
              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300 uppercase">
                Expired
              </span>
            ) : item.isExpiringSoon ? (
              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                Expiring ({hoursLeft}h left)
              </span>
            ) : (
              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active ({hoursLeft}h left)
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: lang === "gu" ? "માલની કિંમત" : "Consignment Value",
      accessorKey: "totalAmount",
      cell: (item: EWayBillListItem) => (
        <div className="text-right">
          <div className="font-mono font-bold text-xs text-slate-900">
            ₹{Number(item.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            Taxable: ₹{Number(item.taxableAmount).toLocaleString("en-IN", { minimumFractionDigits: 0 })}
          </div>
        </div>
      ),
    },
    {
      header: lang === "gu" ? "ક્રિયાઓ" : "Actions",
      cell: (item: EWayBillListItem) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => setSelectedEwbForSlip(item.ewbNumber)}
            className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded shadow-sm flex items-center gap-1 transition-colors"
            title="Print Form GST EWB-01 Slip"
          >
            <svg className="w-3 h-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Slip
          </button>

          {item.status === "ACT" && !item.isExpired && (
            <button
              onClick={() => {
                setCancelTarget(item);
                setQuickCancelRemarks("");
              }}
              className="px-2 py-1 text-[11px] font-medium text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded"
              title="Cancel E-Way Bill"
            >
              Cancel
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {lang === "gu" ? "ઈ-વે બિલ રજીસ્ટર અને પાલન" : "E-Way Bills Register"}
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
              Rule 138 GST
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === "gu"
              ? "માલસામાનની હેરફેર માટે કાનૂની ઈ-વે બિલ જનરેશન, વાહન અપડેટ અને માન્ય Form GST EWB-01 સ્લિપ પ્રિન્ટિંગ."
              : "Statutory goods movement compliance under Section 68 of CGST Act. Vehicle updates (Part-B) & official Form GST EWB-01 slips."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenLinkModal}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            {lang === "gu" ? "+ પોર્ટલ EWB લિંક કરો" : "+ Link Govt Portal EWB"}
          </button>

          <Link
            href="/sales/delivery-challans"
            className="px-3.5 py-2 bg-[#F47721] hover:bg-[#D95F12] text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {lang === "gu" ? "ડિલિવરી ચલણ" : "Delivery Challans"}
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Active E-Way Bills */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {lang === "gu" ? "ચાલુ ઈ-વે બિલ" : "Active Consignments"}
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {summary.activeCount}
          </div>
          <p className="text-[11px] text-emerald-600 mt-1 font-medium">
            Valid & moving on road
          </p>
        </div>

        {/* In-Transit Consignment Value */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {lang === "gu" ? "ટ્રાન્સિટ માલ કિંમત" : "In-Transit Value"}
            </span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-slate-900 font-mono truncate">
            ₹{Number(summary.inTransitValue).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Active goods in transit
          </p>
        </div>

        {/* Expiring Soon */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {lang === "gu" ? "ટૂંક સમયમાં પૂર્ણ (<૨૪ કલાક)" : "Expiring Soon (< 24h)"}
            </span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-700 font-mono">
            {summary.expiringSoonCount}
          </div>
          <p className="text-[11px] text-amber-700 mt-1 font-medium">
            Requires extension or vehicle update
          </p>
        </div>

        {/* Cancelled / Expired */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {lang === "gu" ? "રદ / મુદત વીતી ગયેલ" : "Cancelled / Expired"}
            </span>
            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-700 font-mono">
            {summary.cancelledCount + summary.expiredCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {summary.cancelledCount} Cancelled • {summary.expiredCount} Expired
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === "ALL"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {lang === "gu" ? "બધા (All)" : "All Bills"} ({summary.totalCount})
          </button>
          <button
            onClick={() => setActiveTab("ACT")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === "ACT"
                ? "bg-white text-emerald-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {lang === "gu" ? "ચાલુ (Active)" : "Active"} ({summary.activeCount})
          </button>
          <button
            onClick={() => setActiveTab("SOON")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === "SOON"
                ? "bg-white text-amber-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {lang === "gu" ? "પૂર્ણ થવાના આરે" : "Expiring Soon"} ({summary.expiringSoonCount})
          </button>
          <button
            onClick={() => setActiveTab("EXP")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === "EXP"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {lang === "gu" ? "મુદત વીતેલ" : "Expired"} ({summary.expiredCount})
          </button>
          <button
            onClick={() => setActiveTab("CNL")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === "CNL"
                ? "bg-white text-rose-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {lang === "gu" ? "રદ કરેલ" : "Cancelled"} ({summary.cancelledCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              lang === "gu"
                ? "EWB નંબર, બિલ, વાહન અથવા ગ્રાહક..."
                : "Search EWB, Bill No, Vehicle, Party..."
            }
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute left-2.5 top-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* E-Way Bills DataTable */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredItems}
          keyExtractor={(item) => item.id}
          isLoading={isLoading}
          emptyMessage={
            lang === "gu"
              ? "કોઈ પણ E-Way Bill મળ્યા નથી. નવું બિલ અથવા ડિલિવરી ચલણ બનાવીને ઈ-વે બિલ જનરેટ કરો."
              : "No E-Way Bills found. Generate an E-Way Bill from Sales Invoices or Delivery Challans, or link one above."
          }
          mobileCardRender={(item) => (
            <div key={item.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <button
                    onClick={() => setSelectedEwbForSlip(item.ewbNumber)}
                    className="font-mono font-bold text-xs text-indigo-700 underline"
                  >
                    {item.ewbNumber}
                  </button>
                  <span className="text-[10px] text-slate-500 block">
                    {item.docType}: {item.docNumber}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    item.status === "ACT" && !item.isExpired
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {item.status === "ACT" ? (item.isExpired ? "EXPIRED" : "ACTIVE") : "CANCELLED"}
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-900">{item.partyName}</div>
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Vehicle: <strong className="font-mono">{item.vehicleNumber || "—"}</strong></span>
                <span className="font-mono font-bold">₹{Number(item.totalAmount).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                <button
                  onClick={() => setSelectedEwbForSlip(item.ewbNumber)}
                  className="text-xs text-indigo-600 font-semibold"
                >
                  Print Form EWB-01
                </button>
                {item.status === "ACT" && !item.isExpired && (
                  <button
                    onClick={() => {
                      setVehicleUpdateTarget(item);
                      setQuickVehicleNum(item.vehicleNumber || "");
                    }}
                    className="text-xs text-slate-700 font-medium"
                  >
                    Edit Vehicle
                  </button>
                )}
              </div>
            </div>
          )}
        />
      </div>

      {/* Official Form GST EWB-01 Print Slip Modal */}
      <EwbSlipModal
        ewbNumber={selectedEwbForSlip}
        isOpen={Boolean(selectedEwbForSlip)}
        onClose={() => setSelectedEwbForSlip(null)}
        onVehicleUpdated={fetchData}
        onCancelled={fetchData}
      />

      {/* Link Existing Portal E-Way Bill Modal */}
      <Modal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        title="Link Govt Portal E-Way Bill (મેન્યુઅલ રેકોર્ડ)"
        titleGujarati="સરકારી પોર્ટલ (ewaybillgst.gov.in) પરથી બનેલ ૧૨ અંકનો EWB નંબર જોડો"
        maxWidth="lg"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setIsLinkModalOpen(false)}
              className="px-3.5 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="link-ewb-form"
              disabled={isLinking}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm"
            >
              {isLinking ? "Linking..." : "Link E-Way Bill"}
            </button>
          </div>
        }
      >
        <form id="link-ewb-form" onSubmit={handleLinkSubmit} className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-xs leading-relaxed">
            ℹ️ If you have generated the E-Way bill on <strong>ewaybillgst.gov.in</strong> or third-party portal, enter the official 12-digit number and vehicle details below to associate it with your Invoice or Delivery Challan.
          </div>

          {linkError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs">
              {linkError}
            </div>
          )}

          {/* Document Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Document Type to Link
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setLinkDocType("CHALLAN");
                  setSelectedDocId("");
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-colors ${
                  linkDocType === "CHALLAN"
                    ? "bg-purple-50 border-purple-500 text-purple-900 ring-1 ring-purple-500"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Delivery Challan (ચલણ)
              </button>
              <button
                type="button"
                onClick={() => {
                  setLinkDocType("INVOICE");
                  setSelectedDocId("");
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-colors ${
                  linkDocType === "INVOICE"
                    ? "bg-blue-50 border-blue-500 text-blue-900 ring-1 ring-blue-500"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Sales Invoice (વેચાણ બિલ)
              </button>
            </div>
          </div>

          {/* Select Specific Document */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select {linkDocType === "INVOICE" ? "Sales Invoice" : "Delivery Challan"} <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-orange-500"
            >
              <option value="">-- Choose document --</option>
              {linkDocType === "INVOICE"
                ? availableInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} - {inv.party?.name || "Direct"} (₹{Number(inv.grandTotal).toLocaleString("en-IN")})
                    </option>
                  ))
                : availableChallans.map((chl) => (
                    <option key={chl.id} value={chl.id}>
                      {chl.challanNumber} - {chl.party?.name || "Direct"} (₹{Number(chl.totalAmount).toLocaleString("en-IN")})
                    </option>
                  ))}
            </select>
          </div>

          {/* E-Way Bill Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Official 12-Digit E-Way Bill Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={12}
              value={linkForm.ewbNumber}
              onChange={(e) => setLinkForm({ ...linkForm, ewbNumber: e.target.value.replace(/\D/g, "") })}
              placeholder="e.g. 241088219920"
              className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs font-mono tracking-widest text-base focus:ring-1 focus:ring-orange-500"
            />
          </div>

          {/* Transport Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vehicle Number
              </label>
              <input
                type="text"
                value={linkForm.vehicleNumber}
                onChange={(e) => setLinkForm({ ...linkForm, vehicleNumber: e.target.value.toUpperCase() })}
                placeholder="e.g. GJ01AB1234"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Approx Distance (KM) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={linkForm.distanceKm}
                onChange={(e) => setLinkForm({ ...linkForm, distanceKm: parseInt(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-mono"
              />
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Rule 138: 1 day validity per 200 KM
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Transporter ID (GSTIN / TRANSIN)
              </label>
              <input
                type="text"
                value={linkForm.transporterId}
                onChange={(e) => setLinkForm({ ...linkForm, transporterId: e.target.value })}
                placeholder="e.g. 24AABCT1234F1Z0"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Transporter Name
              </label>
              <input
                type="text"
                value={linkForm.transporterName}
                onChange={(e) => setLinkForm({ ...linkForm, transporterName: e.target.value })}
                placeholder="e.g. Gujarat Express Logistics"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Quick Vehicle Update Modal */}
      <Modal
        isOpen={Boolean(vehicleUpdateTarget)}
        onClose={() => setVehicleUpdateTarget(null)}
        title={`Update Vehicle: ${vehicleUpdateTarget?.ewbNumber || ""}`}
        maxWidth="sm"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setVehicleUpdateTarget(null)}
              className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="quick-vehicle-form"
              disabled={isQuickUpdatingVehicle}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded"
            >
              {isQuickUpdatingVehicle ? "Updating..." : "Update"}
            </button>
          </div>
        }
      >
        <form id="quick-vehicle-form" onSubmit={handleQuickVehicleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Vehicle Number
            </label>
            <input
              type="text"
              required
              value={quickVehicleNum}
              onChange={(e) => setQuickVehicleNum(e.target.value.toUpperCase())}
              placeholder="e.g. GJ01AB1234"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-mono uppercase"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason Code
            </label>
            <select
              value={quickVehicleReason}
              onChange={(e) => setQuickVehicleReason(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"
            >
              <option value="1">1 - Breakdown</option>
              <option value="2">2 - Transshipment</option>
              <option value="3">3 - Others</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Quick Cancel Modal */}
      <Modal
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title={`Cancel E-Way Bill: ${cancelTarget?.ewbNumber || ""}`}
        maxWidth="sm"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setCancelTarget(null)}
              className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded"
            >
              Back
            </button>
            <button
              type="submit"
              form="quick-cancel-form"
              disabled={isQuickCancelling}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded"
            >
              {isQuickCancelling ? "Cancelling..." : "Cancel EWB"}
            </button>
          </div>
        }
      >
        <form id="quick-cancel-form" onSubmit={handleQuickCancelSubmit} className="space-y-3">
          <p className="text-xs text-slate-600">
            Confirm cancellation of E-Way Bill <strong>{cancelTarget?.ewbNumber}</strong>. Must be within 24 hours of generation.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cancellation Reason
            </label>
            <select
              value={quickCancelReasonCode}
              onChange={(e) => setQuickCancelReasonCode(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"
            >
              <option value="1">1 - Duplicate E-Way Bill</option>
              <option value="2">2 - Order Cancelled</option>
              <option value="3">3 - Data Entry Error</option>
              <option value="4">4 - Others</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Remarks
            </label>
            <input
              type="text"
              required
              value={quickCancelRemarks}
              onChange={(e) => setQuickCancelRemarks(e.target.value)}
              placeholder="State cancellation reason..."
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
