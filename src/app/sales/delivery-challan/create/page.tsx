"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../context/auth-context";
import { apiClient, extractList } from "../../../../lib/api-client";
import { Modal } from "../../../../components/ui/modal";
import { AddItemsModal, CatalogItem } from "@/components/invoice/add-items-modal";
import { QuickSettingsModal, DEFAULT_QUICK_SETTINGS, QuickSettingsConfig } from "@/components/invoice/quick-settings-modal";
import { ShortcutsModal } from "@/components/invoice/shortcuts-modal";
import { SignatureModal } from "@/components/invoice/signature-modal";
import { InvoiceLivePreviewModal } from "@/components/invoice/invoice-live-preview-modal";
import { DEFAULT_INVOICE_CUSTOMIZATION } from "@/lib/invoice-theme";
import { INDIAN_STATES } from "@billing/shared-types";

interface PartyOption {
  id: string;
  name: string;
  gstin?: string;
  stateCode: string;
  phone?: string;
  address?: string;
  billingAddress?: {
    line1?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
}

interface ItemOption {
  id: string;
  name: string;
  hsnCode: string;
  taxRate: number;
  retailPrice: number;
  stockQuantity?: number;
  primaryUom?: {
    id: string;
    symbol: string;
    name: string;
  };
}

interface ChallanItemRow {
  id: string;
  itemId: string;
  itemName: string;
  description?: string;
  hsnCode: string;
  quantity: number | "";
  unit: string;
  unitPrice: number | "";
  discountPercent: number | "";
  taxRate: number;
}

export default function CreateDeliveryChallanPage() {
  const router = useRouter();
  const { lang, tenantContext, currentCompany } = useAuth();

  const [parties, setParties] = useState<PartyOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View Mode: Edit Mode vs Preview Mode (Matching Reference Header Switcher)
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");

  // Form Fields
  const [challanNumber, setChallanNumber] = useState("1");
  const [challanDate, setChallanDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [partyId, setPartyId] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState(
    currentCompany?.stateCode || "24"
  );
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [transporterName, setTransporterName] = useState("");
  const [eWayBillNumber, setEWayBillNumber] = useState("");

  // Items table rows
  const [rows, setRows] = useState<ChallanItemRow[]>([]);

  // Notes, Terms & Conditions
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState(
    `1. Goods once sold will not be taken back or exchanged\n2. All disputes are subject to ${currentCompany?.city || "AHMEDABAD"} jurisdiction only`
  );

  // Bank Account & Payment QR visibility
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [showPaymentQr, setShowPaymentQr] = useState(false);

  // Additional Charges & Overall Discount
  const [showAdditionalCharges, setShowAdditionalCharges] = useState(false);
  const [additionalChargeName, setAdditionalChargeName] = useState("Delivery / Freight");
  const [additionalChargeAmount, setAdditionalChargeAmount] = useState<number | "">("");

  const [showOverallDiscount, setShowOverallDiscount] = useState(false);
  const [overallDiscountAmount, setOverallDiscountAmount] = useState<number | "">("");

  // Auto Round Off & Payment Received
  const [autoRoundOff, setAutoRoundOff] = useState(false);
  const [roundOffType, setRoundOffType] = useState<"add" | "reduce">("add");
  const [paymentAmountReceived, setPaymentAmountReceived] = useState<number | "">("");

  // Modals state
  const [isAddPartyModalOpen, setIsAddPartyModalOpen] = useState(false);
  const [partySearchQuery, setPartySearchQuery] = useState("");
  const [newPartyName, setNewPartyName] = useState("");
  const [newPartyPhone, setNewPartyPhone] = useState("");
  const [newPartyGstin, setNewPartyGstin] = useState("");
  const [newPartyState, setNewPartyState] = useState("24");
  const [isSavingParty, setIsSavingParty] = useState(false);
  const [partyError, setPartyError] = useState<string | null>(null);

  const [isAddItemsModalOpen, setIsAddItemsModalOpen] = useState(false);
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);
  const [quickSettingsTab, setQuickSettingsTab] = useState<"invoice" | "party" | "items">("invoice");
  const [quickSettings, setQuickSettings] = useState<QuickSettingsConfig>(DEFAULT_QUICK_SETTINGS);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  // Barcode Scanner Modal
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);
  const [barcodeQuery, setBarcodeQuery] = useState("");

  // Fetch Master Data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ptRes, itRes, whRes]: any = await Promise.allSettled([
        apiClient.get("/parties"),
        apiClient.get("/items"),
        apiClient.get("/tenants/warehouses").catch(() => apiClient.get("/warehouses")),
      ]);

      const pList = ptRes.status === "fulfilled" ? extractList<PartyOption>(ptRes.value) : [];
      const iList = itRes.status === "fulfilled" ? extractList<ItemOption>(itRes.value) : [];
      const wList = whRes.status === "fulfilled" ? extractList<any>(whRes.value) : [];

      setParties(pList);
      setItems(iList);
      setWarehouses(wList);

      if (wList.length > 0) {
        const def = wList.find((w) => w.isDefault) || wList[0];
        setSelectedWarehouseId(def.id);
      }

      // Fetch next sequence
      try {
        const nextRes: any = await apiClient.get("/distribution/challans/next-number").catch(() => null);
        if (nextRes?.nextNumber) {
          setChallanNumber(String(nextRes.nextNumber));
        }
      } catch {}
    } catch (err: any) {
      setError(err?.message || "Failed to load master data.");
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

  // Selected party object
  const selectedParty = useMemo(
    () => parties.find((p) => p.id === partyId),
    [parties, partyId]
  );

  const filteredParties = useMemo(() => {
    if (!partySearchQuery.trim()) return parties;
    const q = partySearchQuery.toLowerCase().trim();
    return parties.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.phone && p.phone.includes(q)) ||
        (p.gstin && p.gstin.toLowerCase().includes(q))
    );
  }, [parties, partySearchQuery]);

  // Row Management
  const handleAddEmptyRow = () => {
    const newRow: ChallanItemRow = {
      id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      itemId: "",
      itemName: "",
      hsnCode: "",
      quantity: 1,
      unit: "PCS",
      unitPrice: "",
      discountPercent: 0,
      taxRate: 18,
    };
    setRows((prev) => [...prev, newRow]);
  };

  const handleCatalogItemsSelected = (
    selected: Array<{
      item: CatalogItem;
      quantity: number;
      unitPrice: number;
    }>
  ) => {
    const newRows: ChallanItemRow[] = selected.map((s) => ({
      id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      itemId: s.item.id,
      itemName: s.item.name,
      hsnCode: s.item.hsnCode || "1001",
      quantity: s.quantity || 1,
      unit: s.item.unit || "PCS",
      unitPrice: s.unitPrice || s.item.retailPrice || 0,
      discountPercent: 0,
      taxRate: s.item.taxRate ?? 18,
    }));
    setRows((prev) => [...prev, ...newRows]);
    setIsAddItemsModalOpen(false);
  };

  const handleUpdateRow = (id: string, field: keyof ChallanItemRow, val: any) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (field === "itemId") {
          const item = items.find((i) => i.id === val);
          return {
            ...r,
            itemId: val,
            itemName: item?.name || "",
            hsnCode: item?.hsnCode || "1001",
            unit: item?.primaryUom?.symbol || "PCS",
            unitPrice: item?.retailPrice || 0,
            taxRate: item?.taxRate ?? 18,
          };
        }
        return { ...r, [field]: val };
      })
    );
  };

  const handleRemoveRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Barcode quick add
  const handleBarcodeSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeQuery.trim()) return;
    const q = barcodeQuery.trim().toLowerCase();
    const matched = items.find(
      (i) => (i.hsnCode && i.hsnCode.toLowerCase() === q) || i.name.toLowerCase().includes(q)
    );
    if (matched) {
      setRows((prev) => [
        ...prev,
        {
          id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          itemId: matched.id,
          itemName: matched.name,
          hsnCode: matched.hsnCode || "1001",
          quantity: 1,
          unit: matched.primaryUom?.symbol || "PCS",
          unitPrice: matched.retailPrice || 0,
          discountPercent: 0,
          taxRate: matched.taxRate ?? 18,
        },
      ]);
      setBarcodeQuery("");
      setIsBarcodeOpen(false);
    } else {
      setError(`Item with barcode/code "${barcodeQuery}" not found.`);
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsAddItemsModalOpen(false);
        setIsQuickSettingsOpen(false);
        setIsShortcutsOpen(false);
        setIsSignatureModalOpen(false);
        setIsAddPartyModalOpen(false);
        setIsBarcodeOpen(false);
        return;
      }
      if (e.key === "F2") {
        e.preventDefault();
        setIsAddItemsModalOpen(true);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSubmit(false);
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // Calculations
  const companyState = currentCompany?.stateCode || "24";
  const isInterState = placeOfSupply !== companyState;

  let totalQuantity = 0;
  let totalTaxable = 0;
  let totalDiscount = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  rows.forEach((r) => {
    const qty = Number(r.quantity) || 0;
    const rate = Number(r.unitPrice) || 0;
    const discPercent = Number(r.discountPercent) || 0;

    const gross = qty * rate;
    const lineDiscount = (gross * discPercent) / 100;
    const taxable = Math.max(0, gross - lineDiscount);
    const tax = (taxable * r.taxRate) / 100;

    totalQuantity += qty;
    totalDiscount += lineDiscount;
    totalTaxable += taxable;

    if (isInterState) {
      totalIgst += tax;
    } else {
      totalCgst += tax / 2;
      totalSgst += tax / 2;
    }
  });

  const totalTax = totalCgst + totalSgst + totalIgst;
  const addCharges = Number(additionalChargeAmount) || 0;
  const overallDisc = Number(overallDiscountAmount) || 0;

  const rawSubtotal = totalTaxable + totalTax + addCharges - overallDisc;
  const grandTotal = autoRoundOff ? Math.round(rawSubtotal) : rawSubtotal;
  const roundOffDifference = grandTotal - rawSubtotal;

  const amountReceived = Number(paymentAmountReceived) || 0;
  const balanceAmount = Math.max(0, grandTotal - amountReceived);

  const formatInr = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  // Submit Handler
  const handleSubmit = async (isSaveAndNew = false) => {
    if (!selectedWarehouseId && warehouses.length > 0) {
      setSelectedWarehouseId(warehouses[0].id);
    }
    if (rows.length === 0 || !rows.some((r) => Number(r.quantity) > 0)) {
      setError("Please add at least one item with valid quantity.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await apiClient.post("/distribution/challans", {
        challanNumber: challanNumber.trim() || undefined,
        challanDate: new Date(challanDate).toISOString(),
        challanType: "JOB_WORK",
        partyId: partyId || undefined,
        warehouseId: selectedWarehouseId || warehouses[0]?.id,
        placeOfSupply,
        vehicleNumber: vehicleNumber.trim() || undefined,
        transporterName: transporterName.trim() || undefined,
        eWayBillNumber: eWayBillNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        terms: terms.trim() || undefined,
        items: rows.map((r) => ({
          itemId: r.itemId || items[0]?.id,
          description: r.itemName || r.description || "Goods Dispatch",
          hsnCode: r.hsnCode || "1001",
          quantity: Number(r.quantity) || 1,
          unitPrice: Number(r.unitPrice) || 0,
          discountPercent: Number(r.discountPercent) || 0,
          taxRate: r.taxRate,
        })),
      });

      if (isSaveAndNew) {
        setChallanNumber((prev) => String(Number(prev || 0) + 1));
        setRows([]);
        setPartyId("");
        setPaymentAmountReceived("");
      } else {
        router.push("/sales/delivery-challan");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to save delivery challan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Create Party
  const handleSaveParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartyName.trim()) {
      setPartyError("Party name is required.");
      return;
    }
    setIsSavingParty(true);
    setPartyError(null);
    try {
      const res: any = await apiClient.post("/parties", {
        name: newPartyName.trim(),
        phone: newPartyPhone.trim() || undefined,
        gstin: newPartyGstin.toUpperCase().trim() || undefined,
        stateCode: newPartyState,
        type: "CUSTOMER",
      });
      const created = res?.data || res;
      setParties((prev) => [created, ...prev]);
      setPartyId(created.id);
      setPlaceOfSupply(created.stateCode || "24");
      setIsAddPartyModalOpen(false);
      setNewPartyName("");
      setNewPartyPhone("");
      setNewPartyGstin("");
    } catch (err: any) {
      setPartyError(err.message || "Failed to create party.");
    } finally {
      setIsSavingParty(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-24 text-slate-800 font-sans">
      {/* 1. TOP HEADER (Exact myBillBook layout with Mode Switcher & Exit) */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs px-3 sm:px-6 py-2.5">
        <div className="w-full flex items-center justify-between gap-2 sm:gap-4 min-w-0">
          {/* Left: Exit & Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href="/sales/delivery-challan"
              className="flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 shadow-2xs transition-colors shrink-0"
            >
              <span>←</span>
              <span>Exit</span>
            </Link>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
              Create Delivery Challan
            </h1>
          </div>

          {/* Center: Edit Mode / Preview Mode Switcher */}
          <div className="hidden md:flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("edit")}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === "edit"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>📝</span>
              <span>Edit Mode</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === "preview"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>👁️</span>
              <span>Preview Mode</span>
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setQuickSettingsTab("invoice");
                setIsQuickSettingsOpen(true);
              }}
              className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="Quick Settings"
            >
              ⚙️
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
              className="px-3.5 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
            >
              Save & New
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="px-4 py-1.5 bg-[#4F46E5] hover:bg-[#4338CA] active:bg-[#3730A3] text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsShortcutsOpen(true)}
              className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="Shortcuts"
            >
              ⌨️
            </button>
          </div>
        </div>
      </header>

      {/* Error Alert */}
      {error && (
        <div className="w-full mt-3 px-3 sm:px-6">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-rose-500 font-bold hover:underline">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 2. MAIN VOUCHER CANVAS (Exact myBillBook Structure) */}
      <main className="w-full p-3 sm:p-5">
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          {/* ROW 1: Bill To (Left) + Invoice Details (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            {/* LEFT BOX: Bill To */}
            <div className="p-5 sm:p-6 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                <span>Bill To</span>
                <button
                  type="button"
                  onClick={() => setIsQuickSettingsOpen(true)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded"
                >
                  ⚙️
                </button>
              </div>

              {!selectedParty ? (
                /* Empty State: Large Dashed Blue Box matching myBillBook */
                <div
                  onClick={() => setIsAddPartyModalOpen(true)}
                  className="w-full h-32 border-2 border-dashed border-[#93C5FD] hover:border-blue-500 rounded-xl bg-blue-50/20 hover:bg-blue-50/50 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all group"
                >
                  <span className="text-blue-600 font-bold text-xs sm:text-sm group-hover:scale-105 transition-transform flex items-center gap-1.5">
                    <span className="text-lg">+</span>
                    <span>Add Party</span>
                  </span>
                </div>
              ) : (
                /* Selected Party Display Card */
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 text-xs space-y-1 relative">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm">{selectedParty.name}</h3>
                    <button
                      type="button"
                      onClick={() => setIsAddPartyModalOpen(true)}
                      className="text-blue-600 font-bold hover:underline text-[11px]"
                    >
                      Change
                    </button>
                  </div>
                  {selectedParty.phone && (
                    <p className="text-slate-500">Phone: {selectedParty.phone}</p>
                  )}
                  {selectedParty.gstin && (
                    <p className="font-mono text-indigo-700 font-bold">GSTIN: {selectedParty.gstin}</p>
                  )}
                  <p className="text-slate-500">
                    Place of Supply: {placeOfSupply} -{" "}
                    {INDIAN_STATES[placeOfSupply]?.name || "Gujarat"}
                  </p>
                </div>
              )}
            </div>

            {/* RIGHT BOX: Invoice Details (Challan No & Date) */}
            <div className="p-5 sm:p-6 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                <span>Invoice Details</span>
                <button
                  type="button"
                  onClick={() => setIsQuickSettingsOpen(true)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded"
                >
                  ⚙️
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Challan No. */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Challan No.
                  </label>
                  <input
                    type="text"
                    value={challanNumber}
                    onChange={(e) => setChallanNumber(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>

                {/* Challan Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Challan Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={challanDate}
                      onChange={(e) => setChallanDate(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 2: ITEMS TABLE (Exact Grid from myBillBook screenshot) */}
          <div className="border-t border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#FAFBFD] text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">NO</th>
                    <th className="py-2.5 px-3 min-w-[240px]">ITEMS</th>
                    <th className="py-2.5 px-3 w-28">HSN</th>
                    <th className="py-2.5 px-3 w-28 text-right">QTY</th>
                    <th className="py-2.5 px-3 w-32 text-right">PRICE/ITEM (₹)</th>
                    <th className="py-2.5 px-3 w-28 text-right">DISCOUNT</th>
                    <th className="py-2.5 px-3 w-24 text-right">TAX</th>
                    <th className="py-2.5 px-4 w-32 text-right">AMOUNT (₹)</th>
                    <th className="py-2.5 px-2 w-10 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setQuickSettingsTab("items");
                          setIsQuickSettingsOpen(true);
                        }}
                        className="text-slate-400 hover:text-slate-700 p-1"
                      >
                        ⚙️
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, idx) => {
                    const qty = Number(row.quantity) || 0;
                    const rate = Number(row.unitPrice) || 0;
                    const discPercent = Number(row.discountPercent) || 0;
                    const gross = qty * rate;
                    const discVal = (gross * discPercent) / 100;
                    const taxable = Math.max(0, gross - discVal);
                    const taxVal = (taxable * row.taxRate) / 100;
                    const lineTotal = taxable + taxVal;

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono font-semibold">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={row.itemName}
                            onChange={(e) => handleUpdateRow(row.id, "itemName", e.target.value)}
                            placeholder="Type item name..."
                            className="w-full p-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={row.hsnCode}
                            onChange={(e) => handleUpdateRow(row.id, "hsnCode", e.target.value)}
                            placeholder="HSN"
                            className="w-full p-1.5 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={row.quantity}
                            onChange={(e) => handleUpdateRow(row.id, "quantity", e.target.value)}
                            className="w-full p-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold text-right text-slate-900 focus:outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={row.unitPrice}
                            onChange={(e) => handleUpdateRow(row.id, "unitPrice", e.target.value)}
                            className="w-full p-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold text-right text-slate-900 focus:outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            value={row.discountPercent}
                            onChange={(e) => handleUpdateRow(row.id, "discountPercent", e.target.value)}
                            placeholder="%"
                            className="w-full p-1.5 border border-slate-200 rounded-lg text-xs font-mono text-right text-slate-700 focus:outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={row.taxRate}
                            onChange={(e) => handleUpdateRow(row.id, "taxRate", Number(e.target.value))}
                            className="w-full p-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold text-right text-indigo-700 focus:outline-none"
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                          {formatInr(lineTotal)}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                            title="Delete"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Large Dashed Blue Box: + Add Item & Scan Barcode */}
              <div className="p-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <div
                  onClick={() => setIsAddItemsModalOpen(true)}
                  className="flex-1 py-3 border-2 border-dashed border-[#93C5FD] hover:border-blue-500 rounded-xl bg-blue-50/20 hover:bg-blue-50/40 flex items-center justify-center gap-2 cursor-pointer transition-colors group"
                >
                  <span className="text-blue-600 font-bold text-xs group-hover:scale-105 transition-transform">
                    + Add Item
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsBarcodeOpen(true)}
                  className="px-4 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 shrink-0 cursor-pointer shadow-2xs"
                >
                  <span>📷</span>
                  <span>Scan Barcode</span>
                </button>
              </div>

              {/* Table Footer: Subtotal Row */}
              <div className="bg-[#FAFBFD] border-t border-slate-200 px-4 py-2.5 flex items-center text-xs font-semibold text-slate-600">
                <div className="w-12 text-center"></div>
                <div className="min-w-[240px] font-bold text-slate-700">Subtotal</div>
                <div className="w-28"></div>
                <div className="w-28 text-right font-mono font-bold text-slate-900">{totalQuantity}</div>
                <div className="w-32"></div>
                <div className="w-28 text-right font-mono text-slate-600">₹ {totalDiscount.toFixed(2)}</div>
                <div className="w-24 text-right font-mono text-slate-600">₹ {totalTax.toFixed(2)}</div>
                <div className="w-32 text-right font-mono font-bold text-slate-900 pr-1">
                  ₹ {totalTaxable.toFixed(2)}
                </div>
                <div className="w-10"></div>
              </div>
            </div>
          </div>

          {/* ROW 3: BOTTOM SECTION (Left: Notes/Terms | Right: Totals) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 border-t border-slate-200">
            {/* LEFT COLUMN: Add Notes, Terms & Conditions, Bank & QR */}
            <div className="lg:col-span-7 p-5 sm:p-6 space-y-4">
              {/* Add Notes */}
              <div>
                {!showNotes ? (
                  <button
                    type="button"
                    onClick={() => setShowNotes(true)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>📝</span>
                    <span>Add Notes</span>
                  </button>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                      <span>Notes</span>
                      <button
                        type="button"
                        onClick={() => setShowNotes(false)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any instructions or remarks for the recipient..."
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Terms & Conditions (Default Textbox with Clear X) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-600 font-bold">
                  <span>Terms & Conditions</span>
                  <button
                    type="button"
                    onClick={() => setTerms("")}
                    className="w-4 h-4 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-[10px] cursor-pointer"
                    title="Clear"
                  >
                    ✕
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Add Bank Account & Add Payment QR buttons */}
              <div className="pt-2 flex items-center gap-6 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setShowBankDetails(!showBankDetails)}
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🏛️</span>
                  <span>Add Bank Account</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPaymentQr(!showPaymentQr)}
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>📱</span>
                  <span>Add Payment QR</span>
                </button>
              </div>

              {showBankDetails && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1 animate-in fade-in">
                  <p className="font-bold text-slate-800">
                    Bank: {currentCompany?.bankName || "State Bank of India"}
                  </p>
                  <p className="font-mono text-slate-600">
                    A/C No: {currentCompany?.bankAccountNo || "XXXX-XXXX-XXXX"} • IFSC:{" "}
                    {currentCompany?.bankIfsc || "SBIN0001234"}
                  </p>
                </div>
              )}

              {showPaymentQr && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex items-center gap-3 animate-in fade-in">
                  <div className="w-12 h-12 bg-white border border-slate-300 rounded flex items-center justify-center font-bold text-xs">
                    QR
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">UPI Payment QR</p>
                    <p className="text-slate-500 font-mono">
                      {currentCompany?.upiVpa || "pay@business.upi"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Additional Charges, Discount, Totals & Signature */}
            <div className="lg:col-span-5 p-5 sm:p-6 space-y-3.5">
              {/* Add Additional Charges Link */}
              {!showAdditionalCharges ? (
                <button
                  type="button"
                  onClick={() => setShowAdditionalCharges(true)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>➕</span>
                  <span>Add Additional Charges</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={additionalChargeName}
                    onChange={(e) => setAdditionalChargeName(e.target.value)}
                    className="flex-1 text-xs p-1.5 border border-slate-200 rounded-lg"
                  />
                  <input
                    type="number"
                    value={additionalChargeAmount}
                    onChange={(e) => setAdditionalChargeAmount(e.target.value ? Number(e.target.value) : "")}
                    placeholder="₹ 0.00"
                    className="w-24 text-xs p-1.5 border border-slate-200 rounded-lg text-right font-mono"
                  />
                  <button onClick={() => setShowAdditionalCharges(false)} className="text-slate-400">
                    ✕
                  </button>
                </div>
              )}

              {/* Taxable Amount Row */}
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold">Taxable Amount</span>
                <span className="font-mono font-bold text-slate-900">{formatInr(totalTaxable)}</span>
              </div>

              {/* Add Discount Link */}
              {!showOverallDiscount ? (
                <button
                  type="button"
                  onClick={() => setShowOverallDiscount(true)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>➕</span>
                  <span>Add Discount</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">Discount:</span>
                  <input
                    type="number"
                    value={overallDiscountAmount}
                    onChange={(e) => setOverallDiscountAmount(e.target.value ? Number(e.target.value) : "")}
                    placeholder="₹ 0.00"
                    className="w-24 text-xs p-1.5 border border-slate-200 rounded-lg text-right font-mono"
                  />
                  <button onClick={() => setShowOverallDiscount(false)} className="text-slate-400">
                    ✕
                  </button>
                </div>
              )}

              {/* Auto Round Off */}
              <div className="flex items-center justify-between text-xs text-slate-600">
                <label className="flex items-center gap-2 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={autoRoundOff}
                    onChange={(e) => setAutoRoundOff(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Auto Round Off</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">+ Add ▾</span>
                  <span className="font-mono text-slate-600">{roundOffDifference.toFixed(2)}</span>
                </div>
              </div>

              {/* Big Row: Total Amount */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-sm font-black text-slate-900">Total Amount:</span>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-slate-600">₹</span>
                  <input
                    type="number"
                    value={paymentAmountReceived}
                    onChange={(e) => setPaymentAmountReceived(e.target.value ? Number(e.target.value) : "")}
                    placeholder={formatInr(grandTotal).replace("₹", "").trim()}
                    className="w-36 text-sm p-1.5 border border-slate-200 rounded-lg text-right font-mono font-black text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Balance Amount Row (Emerald / Green) */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="font-semibold text-emerald-700">Balance Amount</span>
                <span className="font-mono font-bold text-emerald-700">{formatInr(balanceAmount)}</span>
              </div>

              {/* Bottom Right: Add Signature Dashed Box */}
              <div className="pt-3 flex justify-end">
                {!signatureData ? (
                  <div
                    onClick={() => setIsSignatureModalOpen(true)}
                    className="w-48 h-20 border-2 border-dashed border-[#93C5FD] hover:border-blue-500 rounded-xl bg-blue-50/20 hover:bg-blue-50/40 flex items-center justify-center cursor-pointer transition-colors group"
                  >
                    <span className="text-blue-600 font-bold text-xs flex items-center gap-1.5 group-hover:scale-105 transition-transform">
                      <span>+</span>
                      <span>Add Signature</span>
                    </span>
                  </div>
                ) : (
                  <div className="relative group border border-slate-200 rounded-xl p-2 bg-white">
                    <img src={signatureData} alt="Signature" className="h-16 w-auto object-contain" />
                    <button
                      type="button"
                      onClick={() => setSignatureData(null)}
                      className="absolute top-1 right-1 bg-rose-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. MODALS */}

      {/* Add Party Modal */}
      <Modal
        isOpen={isAddPartyModalOpen}
        onClose={() => setIsAddPartyModalOpen(false)}
        title="Select or Add Party"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          {partyError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700">
              {partyError}
            </div>
          )}

          {/* Search Existing Parties */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Search Existing Parties</label>
            <input
              type="text"
              value={partySearchQuery}
              onChange={(e) => setPartySearchQuery(e.target.value)}
              placeholder="Search by party name, phone, or GSTIN..."
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
            {filteredParties.length > 0 && (
              <div className="mt-2 max-h-36 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {filteredParties.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPartyId(p.id);
                      if (p.stateCode) setPlaceOfSupply(p.stateCode);
                      setIsAddPartyModalOpen(false);
                    }}
                    className="w-full text-left p-2 hover:bg-indigo-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{p.name}</div>
                      {p.phone && <div className="text-[10px] text-slate-400">{p.phone}</div>}
                    </div>
                    {p.gstin && (
                      <span className="font-mono text-indigo-700 text-[10px] font-bold">
                        {p.gstin}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative border-t border-slate-200 my-2">
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-slate-400 text-[10px] uppercase font-bold">
              Or Add New Party
            </span>
          </div>

          {/* Add New Party Form */}
          <form onSubmit={handleSaveParty} className="space-y-2.5">
            <div>
              <label className="block font-bold text-slate-700 mb-0.5">Party Name *</label>
              <input
                type="text"
                required
                value={newPartyName}
                onChange={(e) => setNewPartyName(e.target.value)}
                placeholder="e.g. Acme Industries Ltd."
                className="w-full p-2 border border-slate-300 rounded-lg font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Phone Number</label>
                <input
                  type="tel"
                  value={newPartyPhone}
                  onChange={(e) => setNewPartyPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">GSTIN (Optional)</label>
                <input
                  type="text"
                  value={newPartyGstin}
                  onChange={(e) => setNewPartyGstin(e.target.value.toUpperCase())}
                  placeholder="24ABCDE1234F1Z5"
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddPartyModalOpen(false)}
                className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingParty}
                className="px-4 py-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-lg font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSavingParty ? "Saving..." : "Add & Select Party"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Add Items Modal */}
      <AddItemsModal
        isOpen={isAddItemsModalOpen}
        onClose={() => setIsAddItemsModalOpen(false)}
        onAddSelectedItems={handleCatalogItemsSelected}
        items={items.map((i) => ({
          id: i.id,
          name: i.name,
          hsnCode: i.hsnCode,
          retailPrice: i.retailPrice,
          taxRate: i.taxRate,
          stockQuantity: i.stockQuantity,
          unit: i.primaryUom?.symbol || "PCS",
        }))}
      />

      {/* Barcode Scanner Modal */}
      <Modal
        isOpen={isBarcodeOpen}
        onClose={() => setIsBarcodeOpen(false)}
        title="Scan Barcode / Search Code"
        maxWidth="sm"
      >
        <form onSubmit={handleBarcodeSearch} className="space-y-3 text-xs">
          <p className="text-slate-600">
            Scan barcode with your scanner or type HSN/Barcode to add item immediately.
          </p>
          <input
            type="text"
            autoFocus
            value={barcodeQuery}
            onChange={(e) => setBarcodeQuery(e.target.value)}
            placeholder="Scan or enter code..."
            className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-sm font-bold"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsBarcodeOpen(false)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#4F46E5] text-white rounded-lg font-bold"
            >
              Add Item
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Settings Modal */}
      <QuickSettingsModal
        isOpen={isQuickSettingsOpen}
        onClose={() => setIsQuickSettingsOpen(false)}
        settings={quickSettings}
        onSave={(newCfg) => setQuickSettings(newCfg)}
        initialTab={quickSettingsTab}
      />

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />

      {/* Signature Modal */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSaveSignature={(sig: string) => setSignatureData(sig)}
        existingSignature={signatureData}
      />

      {/* Live Preview Modal */}
      <InvoiceLivePreviewModal
        isOpen={viewMode === "preview"}
        onClose={() => setViewMode("edit")}
        customization={DEFAULT_INVOICE_CUSTOMIZATION}
        lang={lang}
        invoiceData={{
          category: "DELIVERY_CHALLAN",
          invoiceNumber: challanNumber,
          invoiceDate: challanDate,
          paymentMode: "DELIVERY_CHALLAN",
          placeOfSupply: placeOfSupply ? `State Code (${placeOfSupply})` : "Gujarat (24)",
          partyName: selectedParty?.name || "Cash / Direct Customer",
          partyGstin: selectedParty?.gstin,
          partyPhone: selectedParty?.phone,
          partyAddress: selectedParty?.address,
          companyName: currentCompany?.tradeName || currentCompany?.legalName || "myownbillbook",
          companyGstin: currentCompany?.gstin || "24AAAAA0000A1Z5",
          companyState: currentCompany?.stateCode ? `State Code (${currentCompany.stateCode})` : "Gujarat (24)",
          notes,
          termsAndConditions: terms,
          items: rows.map((r) => ({
            name: r.itemName || "Product / Item",
            hsnCode: r.hsnCode,
            quantity: Number(r.quantity) || 1,
            unitPrice: Number(r.unitPrice) || 0,
            discountPercent: Number(r.discountPercent) || 0,
            taxRate: r.taxRate,
          })),
          totalTaxable,
          totalCgst,
          totalSgst,
          totalIgst,
          roundOff: roundOffDifference,
          roundedGrandTotal: grandTotal,
          isTaxInclusive: false,
          isInterState,
        }}
      />
    </div>
  );
}
