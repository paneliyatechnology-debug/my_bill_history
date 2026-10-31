"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { apiClient, extractList } from "@/lib/api-client";
import { SignatureModal } from "@/components/invoice/signature-modal";
import { Modal } from "@/components/ui/modal";
import { ConfettiCanvas } from "@/components/invoice/confetti-canvas";
import {
  QuickSettingsModal,
  QuickSettingsConfig,
  DEFAULT_PURCHASE_QUICK_SETTINGS,
} from "@/components/invoice/quick-settings-modal";
import { ShortcutsModal } from "@/components/invoice/shortcuts-modal";

interface Party {
  id: string;
  name: string;
  nameGujarati?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  stateCode?: string;
  billingAddress?: any;
  shippingAddress?: any;
  currentBalance?: number;
  type?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  nameGujarati?: string;
  hsnCode?: string;
  purchaseRate?: number | string;
  purchasePrice?: number | string;
  retailPrice?: number | string;
  salePrice?: number | string;
  taxRate?: number | string;
  currentStock?: number;
  unit?: string;
}

interface OrderItemLine {
  id: string;
  itemId?: string;
  name: string;
  description?: string;
  showDescriptionInput?: boolean;
  hsn: string;
  quantity: number | "";
  unit: string;
  freeQuantity?: number | "";
  unitPrice: number | "";
  discount: number;
  discountType: "%" | "₹";
  taxRate: number;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
}

const COMMON_UNITS = ["BOX", "PCS", "KG", "LTR", "MTR", "PKT", "NOS", "SET", "BAG", "TON"];

export default function CreatePurchaseOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang, currentCompany } = useAuth();

  const editId = searchParams?.get("edit") || searchParams?.get("id");
  const [isEditMode, setIsEditMode] = useState(Boolean(editId));

  // Mode: edit or preview
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");

  // Masters
  const [parties, setParties] = useState<Party[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [activeItemAutocompleteIdx, setActiveItemAutocompleteIdx] = useState<number | null>(null);

  // Selected party
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [isPartySearchOpen, setIsPartySearchOpen] = useState(false);
  const [partySearchQuery, setPartySearchQuery] = useState("");
  const [isCreatePartyModalOpen, setIsCreatePartyModalOpen] = useState(false);
  const [newPartyForm, setNewPartyForm] = useState({
    name: "",
    phone: "",
    gstin: "",
    address: "",
  });

  // Shipping Address State
  const [isEditShippingOpen, setIsEditShippingOpen] = useState(false);
  const [customShippingAddress, setCustomShippingAddress] = useState("");

  // Order Details
  const [orderNumber, setOrderNumber] = useState("1");
  const [orderDate, setOrderDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [validTill, setValidTill] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });

  // Items State
  const [items, setItems] = useState<OrderItemLine[]>([
    {
      id: "line-1",
      name: "",
      description: "",
      showDescriptionInput: false,
      hsn: "",
      quantity: 1,
      unit: "BOX",
      freeQuantity: "",
      unitPrice: 0,
      discount: 0,
      discountType: "%",
      taxRate: 18,
      taxableAmount: 0,
      taxAmount: 0,
      totalAmount: 0,
    },
  ]);

  // Bottom Section State
  const [notes, setNotes] = useState("");
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [terms, setTerms] = useState(
    "1. Goods once sold will not be taken back or exchanged\n2. All disputes are subject to [ENTER_YOUR_CITY_NAME] jurisdiction only",
  );
  const [showTerms, setShowTerms] = useState(true);

  // Additional Charges & Overall Discount
  const [additionalCharges, setAdditionalCharges] = useState<{ name: string; amount: number }[]>([]);
  const [showAddChargeModal, setShowAddChargeModal] = useState(false);
  const [newChargeName, setNewChargeName] = useState("Delivery / Freight");
  const [newChargeAmount, setNewChargeAmount] = useState<number | "">("");

  const [overallDiscount, setOverallDiscount] = useState<number | "">("");
  const [showOverallDiscount, setShowOverallDiscount] = useState(false);

  // Auto round off
  const [autoRoundOff, setAutoRoundOff] = useState(false);
  const [manualRoundOff, setManualRoundOff] = useState<number>(0);

  // Advance paid / received
  const [advancePaid, setAdvancePaid] = useState<number | "">("");

  // Signature
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [quickSettings, setQuickSettings] = useState<QuickSettingsConfig>(DEFAULT_PURCHASE_QUICK_SETTINGS);
  const [isCreateItemModalOpen, setIsCreateItemModalOpen] = useState(false);
  const [activeRowForNewItem, setActiveRowForNewItem] = useState<number | null>(null);
  const [createItemForm, setCreateItemForm] = useState({
    name: "",
    hsn: "",
    price: 0,
    taxRate: 18,
    unit: "BOX",
  });

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch Parties & Items
  useEffect(() => {
    apiClient
      .get("/parties", { type: "SUPPLIER", limit: 200 })
      .then((res: any) => {
        const list = extractList<Party>(res);
        setParties(list);
      })
      .catch(() => {});

    apiClient
      .get("/items", { limit: 250 })
      .then((res: any) => {
        const list = extractList<any>(res);
        const mapped: InventoryItem[] = list.map((it: any) => ({
          id: it.id,
          name: it.name,
          nameGujarati: it.nameGujarati,
          hsnCode: it.hsnCode || it.hsn || "",
          purchaseRate: Number(it.purchaseRate || it.purchasePrice || it.retailPrice || it.salePrice || 0),
          purchasePrice: Number(it.purchaseRate || it.purchasePrice || it.retailPrice || it.salePrice || 0),
          taxRate: Number(it.taxRate ?? 18),
          currentStock: Number(it.currentStock ?? it.stockQuantity ?? 0),
          unit: it.unit || "BOX",
        }));
        setInventoryItems(mapped);
      })
      .catch(() => {});

    // Compute Next PO Number
    try {
      const stored = localStorage.getItem("billing_purchase_orders");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOrderNumber(String(parsed.length + 1));
        }
      }
    } catch {}
  }, []);

  // Load for edit if editId provided
  useEffect(() => {
    if (!editId) return;
    try {
      const stored = localStorage.getItem("billing_purchase_orders");
      if (stored) {
        const list = JSON.parse(stored);
        const match = list.find((o: any) => o.id === editId || o.orderNumber === editId);
        if (match) {
          setOrderNumber(match.orderNumber || "1");
          if (match.orderDate) setOrderDate(match.orderDate);
          if (match.validTill) setValidTill(match.validTill);
          if (match.party) setSelectedParty(match.party);
          if (match.items && Array.isArray(match.items)) setItems(match.items);
          if (match.notes) {
            setNotes(match.notes);
            setShowNotesInput(true);
          }
          if (match.terms) setTerms(match.terms);
          if (match.signatureUrl) setSignatureUrl(match.signatureUrl);
          if (match.advancePaid) setAdvancePaid(match.advancePaid);
        }
      }
    } catch {}
  }, [editId]);

  // Click outside to dismiss autocomplete dropdowns
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".item-autocomplete-container")) {
        setActiveItemAutocompleteIdx(null);
      }
      if (!target.closest(".party-autocomplete-container")) {
        setIsPartySearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleGlobalClick);
    return () => document.removeEventListener("mousedown", handleGlobalClick);
  }, []);

  // Keyboard shortcut listener (Alt+S to save)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveOrder();
      }
      if (e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handleAddItem();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, selectedParty, orderNumber, orderDate, validTill]);

  // Update item fields
  const updateItemLine = (idx: number, field: keyof OrderItemLine, val: any) => {
    setItems((prev) => {
      const copy = [...prev];
      const target = { ...copy[idx], [field]: val };

      const qty = typeof target.quantity === "number" ? target.quantity : Number(target.quantity) || 0;
      const rate = typeof target.unitPrice === "number" ? target.unitPrice : Number(target.unitPrice) || 0;
      const base = qty * rate;

      const discVal = Number(target.discount) || 0;
      const discAmt = target.discountType === "%" ? (base * discVal) / 100 : discVal;
      const taxable = Math.max(0, base - discAmt);
      const tax = (taxable * (Number(target.taxRate) || 0)) / 100;

      target.taxableAmount = Number(taxable.toFixed(2));
      target.taxAmount = Number(tax.toFixed(2));
      target.totalAmount = Number((taxable + tax).toFixed(2));

      copy[idx] = target;
      return copy;
    });
  };

  const handlePickInventoryItem = (idx: number, itm: InventoryItem) => {
    setItems((prev) => {
      const copy = [...prev];
      const target = { ...copy[idx] };
      target.itemId = itm.id;
      target.name = itm.name;
      target.hsn = itm.hsnCode || "";
      target.unit = itm.unit || "BOX";
      target.unitPrice = Number(itm.purchaseRate || itm.purchasePrice || 0);
      target.taxRate = Number(itm.taxRate || 18);

      const qty = typeof target.quantity === "number" ? target.quantity : Number(target.quantity) || 1;
      const base = qty * Number(target.unitPrice);
      const discVal = Number(target.discount) || 0;
      const discAmt = target.discountType === "%" ? (base * discVal) / 100 : discVal;
      const taxable = Math.max(0, base - discAmt);
      const tax = (taxable * target.taxRate) / 100;

      target.taxableAmount = Number(taxable.toFixed(2));
      target.taxAmount = Number(tax.toFixed(2));
      target.totalAmount = Number((taxable + tax).toFixed(2));

      copy[idx] = target;
      return copy;
    });
    setActiveItemAutocompleteIdx(null);
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}-${prev.length + 1}`,
        name: "",
        description: "",
        showDescriptionInput: false,
        hsn: "",
        quantity: 1,
        unit: "BOX",
        freeQuantity: "",
        unitPrice: 0,
        discount: 0,
        discountType: "%",
        taxRate: 18,
        taxableAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
      },
    ]);
  };

  const handleRemoveItem = (idx: number) => {
    if (items.length === 1) {
      setItems([
        {
          id: `line-${Date.now()}`,
          name: "",
          description: "",
          showDescriptionInput: false,
          hsn: "",
          quantity: 1,
          unit: "BOX",
          freeQuantity: "",
          unitPrice: 0,
          discount: 0,
          discountType: "%",
          taxRate: 18,
          taxableAmount: 0,
          taxAmount: 0,
          totalAmount: 0,
        },
      ]);
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Calculations
  const calculations = useMemo(() => {
    let totalQty = 0;
    let totalTaxable = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let rawTotal = 0;

    items.forEach((it) => {
      const q = Number(it.quantity) || 0;
      totalQty += q;
      totalTaxable += it.taxableAmount;
      totalTax += it.taxAmount;
      rawTotal += it.totalAmount;

      const base = q * (Number(it.unitPrice) || 0);
      const discVal = Number(it.discount) || 0;
      const discAmt = it.discountType === "%" ? (base * discVal) / 100 : discVal;
      totalDiscount += discAmt;
    });

    const addChargesSum = additionalCharges.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
    const extraDiscount = Number(overallDiscount) || 0;

    let preRoundTotal = rawTotal + addChargesSum - extraDiscount;
    if (preRoundTotal < 0) preRoundTotal = 0;

    let roundOffDelta = 0;
    let finalGrandTotal = preRoundTotal;

    if (autoRoundOff) {
      finalGrandTotal = Math.round(preRoundTotal);
      roundOffDelta = Number((finalGrandTotal - preRoundTotal).toFixed(2));
    } else if (manualRoundOff) {
      roundOffDelta = Number(manualRoundOff) || 0;
      finalGrandTotal = preRoundTotal + roundOffDelta;
    }

    const advance = Number(advancePaid) || 0;
    const balance = Math.max(0, finalGrandTotal - advance);

    // GST split (assuming Intrastate CGST + SGST by default, or IGST if interstate)
    const isInterstate = selectedParty?.stateCode && currentCompany?.stateCode && selectedParty.stateCode !== currentCompany.stateCode;
    const cgst = isInterstate ? 0 : totalTax / 2;
    const sgst = isInterstate ? 0 : totalTax / 2;
    const igst = isInterstate ? totalTax : 0;

    return {
      totalQty,
      totalTaxable: Number(totalTaxable.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      cgst: Number(cgst.toFixed(2)),
      sgst: Number(sgst.toFixed(2)),
      igst: Number(igst.toFixed(2)),
      addChargesSum,
      extraDiscount,
      roundOffDelta,
      finalGrandTotal: Number(finalGrandTotal.toFixed(2)),
      balance: Number(balance.toFixed(2)),
    };
  }, [items, additionalCharges, overallDiscount, autoRoundOff, manualRoundOff, advancePaid, selectedParty, currentCompany]);

  // Save Order
  const handleSaveOrder = (andNew = false) => {
    if (!selectedParty) {
      showToast(lang === "gu" ? "કૃપા કરીને સપ્લાયર / વેપારી પસંદ કરો" : "Please select a supplier / vendor");
      return;
    }

    const validItems = items.filter((it) => it.name.trim() !== "");
    if (validItems.length === 0) {
      showToast(lang === "gu" ? "ઓછામાં ઓછી એક આઇટમ ઉમેરો" : "Please enter at least one item");
      return;
    }

    setIsSaving(true);

    const newOrder = {
      id: editId || `po-${Date.now()}`,
      orderNumber,
      orderDate,
      validTill,
      party: selectedParty,
      shippingAddress: customShippingAddress || (selectedParty as any).shippingAddress || selectedParty.billingAddress,
      items: validItems,
      additionalCharges,
      overallDiscount: Number(overallDiscount) || 0,
      autoRoundOff,
      manualRoundOff,
      roundOffDelta: calculations.roundOffDelta,
      taxableAmount: calculations.totalTaxable,
      taxAmount: calculations.totalTax,
      cgstAmount: calculations.cgst,
      sgstAmount: calculations.sgst,
      igstAmount: calculations.igst,
      grandTotal: calculations.finalGrandTotal,
      advancePaid: Number(advancePaid) || 0,
      balanceAmount: calculations.balance,
      notes,
      terms,
      signatureUrl,
      status: "OPEN",
      createdAt: new Date().toISOString(),
      companyId: currentCompany?.id,
    };

    try {
      const stored = localStorage.getItem("billing_purchase_orders");
      const list = stored ? JSON.parse(stored) : [];
      let updatedList = [];
      if (editId) {
        updatedList = list.map((item: any) => (item.id === editId ? newOrder : item));
      } else {
        updatedList = [newOrder, ...list];
      }
      localStorage.setItem("billing_purchase_orders", JSON.stringify(updatedList));

      setShowConfetti(true);
      showToast(lang === "gu" ? "ખરીદી ઓર્ડર સફળતાપૂર્વક સાચવવામાં આવ્યો!" : "Purchase Order saved successfully!");

      if (andNew) {
        setTimeout(() => {
          setIsSaving(false);
          setShowConfetti(false);
          setSelectedParty(null);
          setOrderNumber(String(updatedList.length + 1));
          setItems([
            {
              id: `line-${Date.now()}`,
              name: "",
              description: "",
              showDescriptionInput: false,
              hsn: "",
              quantity: 1,
              unit: "BOX",
              freeQuantity: "",
              unitPrice: 0,
              discount: 0,
              discountType: "%",
              taxRate: 18,
              taxableAmount: 0,
              taxAmount: 0,
              totalAmount: 0,
            },
          ]);
          setAdvancePaid("");
        }, 800);
      } else {
        setTimeout(() => {
          setIsSaving(false);
          router.push(`/purchases/orders`);
        }, 1000);
      }
    } catch {
      setIsSaving(false);
      showToast("Failed to save purchase order");
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F3F8] text-slate-800 p-3 sm:p-4 font-sans">
      <ConfettiCanvas active={showConfetti} />

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900/90 text-white px-4 py-2.5 text-xs font-semibold shadow-xl backdrop-blur-sm animate-fade-in flex items-center gap-2">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-[1550px] mx-auto space-y-3">
        {/* Top Action Header Bar */}
        <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-lg border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-4">
            <Link
              href="/purchases/orders"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors shadow-2xs px-3 py-1.5"
            >
              <span>← Exit</span>
            </Link>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              {lang === "gu" ? "ખરીદી ઓર્ડર બનાવો (Create Purchase Order)" : "Create Purchase Order"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode("edit")}
                className={`px-3 py-1 rounded-md transition-all ${
                  viewMode === "edit"
                    ? "bg-white text-blue-600 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📝 Edit Mode
              </button>
              <button
                type="button"
                onClick={() => setViewMode("preview")}
                className={`px-3 py-1 rounded-md transition-all ${
                  viewMode === "preview"
                    ? "bg-white text-blue-600 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                👁 Preview Mode
              </button>
            </div>

            {/* Quick Settings */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              title="Column and Quick Settings"
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            >
              ⚙
            </button>

            {/* Shortcuts */}
            <button
              type="button"
              onClick={() => setIsShortcutsOpen(true)}
              title="Keyboard Shortcuts"
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            >
              ⌨
            </button>

            {/* Save & New */}
            <button
              type="button"
              onClick={() => handleSaveOrder(true)}
              disabled={isSaving}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
            >
              Save & New
            </button>

            {/* Save Primary Button */}
            <button
              type="button"
              onClick={() => handleSaveOrder(false)}
              disabled={isSaving}
              className="px-5 py-1.5 text-xs font-bold text-white bg-[#174B43] hover:bg-[#123B35] active:bg-[#0F322C] rounded-lg transition-colors shadow-sm inline-flex items-center gap-1.5"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* Main Form Area */}
        <div className="space-y-3">
        {viewMode === "edit" ? (
          <>
            {/* Top Cards: Bill From, Ship From, Invoice Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Card 1: Bill From (Supplier) */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs relative party-autocomplete-container">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bill From</span>
                  {selectedParty && (
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setNewPartyForm({
                            name: selectedParty.name,
                            phone: selectedParty.phone || "",
                            gstin: selectedParty.gstin || "",
                            address: selectedParty.billingAddress?.line1 || "",
                          });
                          setIsCreatePartyModalOpen(true);
                        }}
                        className="text-blue-600 hover:underline font-semibold flex items-center gap-0.5"
                      >
                        ✎ Edit Party
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedParty(null);
                          setIsPartySearchOpen(true);
                        }}
                        className="text-slate-600 hover:text-slate-900 font-semibold"
                      >
                        Change Party
                      </button>
                    </div>
                  )}
                </div>

                {selectedParty ? (
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 text-sm">{selectedParty.name}</p>
                    <p className="text-xs text-slate-600">
                      Phone Number: <span className="font-medium text-slate-900">{selectedParty.phone || "—"}</span>
                    </p>
                    {selectedParty.gstin && (
                      <p className="text-xs text-slate-600">
                        GSTIN: <span className="font-medium text-slate-800 font-mono">{selectedParty.gstin}</span>
                      </p>
                    )}
                    {(selectedParty.billingAddress?.line1 || selectedParty.billingAddress) && (
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {typeof selectedParty.billingAddress === "string"
                          ? selectedParty.billingAddress
                          : `${selectedParty.billingAddress?.line1 || ""} ${selectedParty.billingAddress?.city || ""}`}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <div
                      onClick={() => setIsPartySearchOpen(true)}
                      className="border-2 border-dashed border-blue-200 bg-blue-50/50 hover:bg-blue-50 rounded-xl p-5 text-center cursor-pointer transition-colors"
                    >
                      <span className="text-sm font-bold text-blue-600">+ Add Party (Supplier)</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">Search or create a new vendor</p>
                    </div>

                    {isPartySearchOpen && (
                      <div className="absolute left-0 right-0 top-0 z-50 bg-white rounded-xl border border-slate-200 shadow-2xl p-2 text-xs flex flex-col max-h-72">
                        <input
                          type="text"
                          autoFocus
                          value={partySearchQuery}
                          onChange={(e) => setPartySearchQuery(e.target.value)}
                          placeholder="Search vendor by name, phone, GSTIN..."
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold focus:outline-hidden focus:border-blue-500 mb-1"
                        />
                        <div className="overflow-y-auto max-h-48 divide-y divide-slate-100">
                          {parties
                            .filter(
                              (p) =>
                                !partySearchQuery.trim() ||
                                p.name.toLowerCase().includes(partySearchQuery.toLowerCase()) ||
                                (p.phone && p.phone.includes(partySearchQuery)) ||
                                (p.gstin && p.gstin.toLowerCase().includes(partySearchQuery.toLowerCase())),
                            )
                            .map((p) => (
                              <div
                                key={p.id}
                                onClick={() => {
                                  setSelectedParty(p);
                                  setIsPartySearchOpen(false);
                                  setPartySearchQuery("");
                                }}
                                className="p-2 hover:bg-blue-50/70 cursor-pointer rounded-lg flex items-center justify-between"
                              >
                                <div>
                                  <div className="font-bold text-slate-900">{p.name}</div>
                                  <div className="text-[11px] text-slate-500">
                                    {p.phone || "No phone"} {p.gstin ? `• GST: ${p.gstin}` : ""}
                                  </div>
                                </div>
                                <span className="text-blue-600 font-semibold text-[11px]">Select</span>
                              </div>
                            ))}
                        </div>
                        <div
                          onClick={() => {
                            setIsPartySearchOpen(false);
                            setNewPartyForm({
                              name: partySearchQuery,
                              phone: "",
                              gstin: "",
                              address: "",
                            });
                            setIsCreatePartyModalOpen(true);
                          }}
                          className="p-2 text-center text-blue-600 font-bold border-t border-dashed border-blue-200 hover:bg-blue-50 cursor-pointer mt-1"
                        >
                          + Create New Party &quot;{partySearchQuery || "Vendor"}&quot;
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card 2: Ship From */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ship From</span>
                  <button
                    type="button"
                    onClick={() => setIsEditShippingOpen(true)}
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    Change Shipping Address
                  </button>
                </div>

                <div className="space-y-1 text-xs">
                  <p className="font-bold text-slate-900">{selectedParty ? selectedParty.name : "—"}</p>
                  <p className="text-slate-600">
                    Phone Number: <span className="font-medium text-slate-900">{selectedParty?.phone || "—"}</span>
                  </p>
                  <p className="text-slate-500 line-clamp-2">
                    {customShippingAddress ||
                      (selectedParty?.shippingAddress
                        ? typeof selectedParty.shippingAddress === "string"
                          ? selectedParty.shippingAddress
                          : selectedParty.shippingAddress?.line1
                        : selectedParty?.billingAddress
                        ? typeof selectedParty.billingAddress === "string"
                          ? selectedParty.billingAddress
                          : selectedParty.billingAddress?.line1
                        : "Same as billing address")}
                  </p>
                </div>
              </div>

              {/* Card 3: Invoice / Order Details */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice Details</span>
                  <button type="button" onClick={() => setIsSettingsOpen(true)} className="text-slate-400 hover:text-slate-700">
                    ⚙
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">PO No.</label>
                    <input
                      type="text"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-blue-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">PO Date</label>
                    <input
                      type="date"
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Valid Till</label>
                  <input
                    type="date"
                    value={validTill}
                    onChange={(e) => setValidTill(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-blue-500 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-visible">
              <div className="overflow-x-auto lg:overflow-visible">
                <table className="min-w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-3 py-2.5 w-12 text-center">NO</th>
                      <th className="px-3 py-2.5 min-w-[280px]">ITEMS</th>
                      <th className="px-3 py-2.5 w-24">HSN</th>
                      <th className="px-3 py-2.5 w-28 text-right">QTY</th>
                      <th className="px-3 py-2.5 w-28 text-right">PRICE/ITEM (₹)</th>
                      <th className="px-3 py-2.5 w-28 text-right">DISCOUNT</th>
                      <th className="px-3 py-2.5 w-28 text-right">TAX</th>
                      <th className="px-3 py-2.5 w-28 text-right">AMOUNT (₹)</th>
                      <th className="px-2 py-2.5 w-8 text-center">
                        <button
                          type="button"
                          onClick={() => setIsSettingsOpen(true)}
                          title="Customize columns"
                          className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700"
                        >
                          ⚙
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((line, idx) => (
                      <tr key={line.id} className={`hover:bg-slate-50/50 relative ${activeItemAutocompleteIdx === idx ? "z-40" : "z-10"}`}>
                        <td className="px-3 py-2.5 text-center text-slate-400 font-medium">{idx + 1}</td>

                        {/* ITEMS Column */}
                        <td className="px-3 py-2 relative item-autocomplete-container">
                          <div className="relative w-full">
                            <input
                              type="text"
                              value={line.name}
                              onFocus={() => setActiveItemAutocompleteIdx(idx)}
                              onChange={(e) => {
                                updateItemLine(idx, "name", e.target.value);
                                setActiveItemAutocompleteIdx(idx);
                              }}
                              placeholder={lang === "gu" ? "આઇટમનું નામ દાખલ કરો..." : "Enter item name..."}
                              className="w-full rounded-md border border-slate-200 hover:border-slate-300 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 transition-colors focus:outline-hidden"
                            />

                            {/* Optional Item Description */}
                            {line.showDescriptionInput ? (
                              <div className="mt-1 flex items-start gap-1">
                                <textarea
                                  rows={1}
                                  value={line.description || ""}
                                  onChange={(e) => updateItemLine(idx, "description", e.target.value)}
                                  placeholder="Enter Description (optional)"
                                  className="w-full rounded border border-slate-200 p-1.5 text-[11px] text-slate-700 focus:outline-hidden focus:border-blue-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateItemLine(idx, "showDescriptionInput", false)}
                                  className="text-slate-400 hover:text-slate-600 text-xs p-1"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => updateItemLine(idx, "showDescriptionInput", true)}
                                className="text-[10px] text-blue-600 hover:underline mt-0.5 block font-medium"
                              >
                                + Add Description
                              </button>
                            )}

                            {/* Proper Size Item Autocomplete Dropdown */}
                            {activeItemAutocompleteIdx === idx && (
                              <div
                                className="absolute left-0 top-[calc(100%+4px)] z-50 w-full min-w-[520px] max-w-[680px] rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden text-xs flex flex-col"
                                style={{
                                  boxShadow: "0 18px 40px -4px rgba(0, 0, 0, 0.16), 0 8px 16px -4px rgba(0, 0, 0, 0.08)",
                                }}
                                onMouseDown={(e) => e.preventDefault()}
                              >
                                <div className="flex justify-between items-center px-4 py-2.5 bg-[#F8FAFC] text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 shrink-0 select-none">
                                  <span>{lang === "gu" ? "આઇટમ વિગત (ITEM DESCRIPTION)" : "ITEM DESCRIPTION"}</span>
                                  <span>{lang === "gu" ? "ભાવ / સ્ટોક (RATE / STOCK)" : "RATE / STOCK"}</span>
                                </div>

                                <div className="overflow-y-auto max-h-72 divide-y divide-slate-100 flex-1">
                                  {inventoryItems
                                    .filter((itm) => {
                                      const q = line.name.trim().toLowerCase();
                                      if (!q) return true;
                                      return (
                                        itm.name.toLowerCase().includes(q) ||
                                        (itm.nameGujarati && itm.nameGujarati.toLowerCase().includes(q)) ||
                                        (itm.hsnCode && itm.hsnCode.includes(q))
                                      );
                                    })
                                    .slice(0, 50)
                                    .map((itm) => (
                                      <div
                                        key={itm.id}
                                        onClick={() => handlePickInventoryItem(idx, itm)}
                                        className="px-4 py-2.5 hover:bg-teal-50/70 cursor-pointer flex items-center justify-between transition-colors group"
                                      >
                                        <div className="pr-3">
                                          <div className="font-bold text-slate-900 group-hover:text-teal-600 transition-colors flex items-center gap-1.5">
                                            <span>{itm.name}</span>
                                            {lang === "gu" && itm.nameGujarati && (
                                              <span className="text-[11px] font-normal text-slate-500">
                                                ({itm.nameGujarati})
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                            {itm.hsnCode && (
                                              <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono text-[9px] font-medium border border-slate-200/60">
                                                HSN: {itm.hsnCode}
                                              </span>
                                            )}
                                            <span className="text-slate-300">•</span>
                                            <span className="font-medium text-slate-600">GST: {itm.taxRate || 18}%</span>
                                          </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <div className="font-extrabold text-slate-900 text-xs">
                                            ₹ {Number(itm.purchasePrice || itm.salePrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </div>
                                          <div className="text-[10px] font-semibold text-emerald-600 mt-0.5">
                                            Stock: {itm.currentStock || 0}
                                          </div>
                                        </div>
                                      </div>
                                    ))}

                                  {inventoryItems.filter((itm) => {
                                    const q = line.name.trim().toLowerCase();
                                    if (!q) return true;
                                    return (
                                      itm.name.toLowerCase().includes(q) ||
                                      (itm.nameGujarati && itm.nameGujarati.toLowerCase().includes(q)) ||
                                      (itm.hsnCode && itm.hsnCode.includes(q))
                                    );
                                  }).length === 0 && (
                                    <div className="p-5 text-center text-slate-400">
                                      <p className="font-semibold text-xs text-slate-500">
                                        {lang === "gu" ? "કોઈ મેળ ખાતી આઇટમ મળી નથી" : "No matching items found"}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                <div
                                  onClick={() => {
                                    setActiveRowForNewItem(idx);
                                    setCreateItemForm({
                                      name: line.name || "",
                                      hsn: "",
                                      price: 0,
                                      taxRate: 18,
                                      unit: "BOX",
                                    });
                                    setIsCreateItemModalOpen(true);
                                    setActiveItemAutocompleteIdx(null);
                                  }}
                                  className="p-2.5 text-center font-bold text-teal-600 hover:text-teal-700 hover:bg-teal-50/80 cursor-pointer border-t border-dashed border-teal-200 bg-white shrink-0 transition-colors flex items-center justify-center gap-1.5 select-none"
                                >
                                  <span className="text-base leading-none font-bold">+</span>
                                  <span>{lang === "gu" ? "નવી આઇટમ ઉમેરો (Add New Item)" : "Add New Item"}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* HSN */}
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={line.hsn || ""}
                            onChange={(e) => updateItemLine(idx, "hsn", e.target.value)}
                            placeholder="HSN"
                            className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:outline-hidden focus:border-blue-500 font-mono"
                          />
                        </td>

                        {/* QTY & Unit */}
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              value={line.quantity}
                              onChange={(e) => updateItemLine(idx, "quantity", e.target.value === "" ? "" : Number(e.target.value))}
                              className="w-16 rounded border border-slate-200 px-2 py-1 text-xs text-right text-slate-900 font-bold focus:outline-hidden focus:border-blue-500"
                            />
                            <select
                              value={line.unit}
                              onChange={(e) => updateItemLine(idx, "unit", e.target.value)}
                              className="w-16 rounded border border-slate-200 px-1 py-1 text-[11px] font-semibold text-slate-600 bg-white"
                            >
                              {COMMON_UNITS.map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        {/* PRICE/ITEM */}
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitPrice}
                            onChange={(e) => updateItemLine(idx, "unitPrice", e.target.value === "" ? "" : Number(e.target.value))}
                            className="w-24 rounded border border-slate-200 px-2 py-1 text-xs text-right text-slate-900 font-semibold focus:outline-hidden focus:border-blue-500"
                          />
                        </td>

                        {/* DISCOUNT */}
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              value={line.discount}
                              onChange={(e) => updateItemLine(idx, "discount", Number(e.target.value))}
                              className="w-16 rounded border border-slate-200 px-1.5 py-1 text-xs text-right text-slate-600 focus:outline-hidden focus:border-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => updateItemLine(idx, "discountType", line.discountType === "%" ? "₹" : "%")}
                              className="rounded bg-slate-100 hover:bg-slate-200 px-1.5 py-1 text-[11px] font-bold text-slate-700"
                            >
                              {line.discountType}
                            </button>
                          </div>
                        </td>

                        {/* TAX */}
                        <td className="px-3 py-2 text-right">
                          <div className="relative flex items-center min-w-[70px]">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              max="100"
                              list="gst-rates-po"
                              value={line.taxRate}
                              onChange={(e) => updateItemLine(idx, "taxRate", Number(e.target.value) || 0)}
                              placeholder="0"
                              className="w-22 rounded border border-slate-200 px-1.5 pr-4 py-1 text-xs text-right text-slate-700 font-mono font-medium focus:outline-hidden focus:border-blue-500 bg-white"
                            />
                            <span className="absolute right-1 text-[11px] font-bold text-slate-400 pointer-events-none">%</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            (₹ {line.taxAmount.toFixed(1)})
                          </span>
                        </td>

                        {/* AMOUNT */}
                        <td className="px-3 py-2 text-right font-bold text-slate-900">
                          ₹ {line.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Actions */}
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1"
                            title="Remove line"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* Add Item Button Row */}
                    <tr>
                      <td colSpan={8} className="p-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={handleAddItem}
                            className="flex-1 rounded-lg border-2 border-dashed border-[#93C5FD] bg-[#F0F7FF] py-2 text-center text-xs font-semibold text-[#2563EB] hover:bg-[#E5F0FF] transition-colors"
                          >
                            + Add Item
                          </button>

                          <button
                            type="button"
                            onClick={() => showToast("Barcode scanner active")}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                          >
                            <span>📷</span>
                            <span>Scan Barcode</span>
                          </button>
                        </div>
                      </td>
                      <td />
                    </tr>

                    {/* Subtotal Row */}
                    <tr className="bg-[#F8FAFC] border-t border-slate-200 font-semibold text-slate-700 text-xs">
                      <td colSpan={3} className="px-4 py-2.5 text-right font-bold text-slate-600">
                        Subtotal
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-900">{calculations.totalQty}</td>
                      <td />
                      <td className="px-3 py-2.5 text-right font-medium text-slate-700">₹ {calculations.totalDiscount.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-slate-700">₹ {calculations.totalTax.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                        ₹ {calculations.finalGrandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Section: Notes & Terms (Left) + Totals & Calculations (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {/* Left Column: Notes, Terms, Bank, QR */}
              <div className="space-y-3">
                {/* Notes */}
                <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
                  {!showNotesInput ? (
                    <button
                      type="button"
                      onClick={() => setShowNotesInput(true)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:underline"
                    >
                      <span>+</span>
                      <span>Add Notes</span>
                    </button>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                        <span>Notes</span>
                        <button type="button" onClick={() => setShowNotesInput(false)} className="text-slate-400 hover:text-slate-600">
                          ✕
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Enter purchase order notes or delivery instructions..."
                        className="w-full rounded border border-slate-300 p-2 text-xs text-slate-800 focus:outline-hidden focus:border-[#2563EB]"
                      />
                    </div>
                  )}
                </div>

                {/* Terms & Conditions */}
                {showTerms && (
                  <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span>Terms & Conditions</span>
                      <button type="button" onClick={() => setShowTerms(false)} className="text-slate-400 hover:text-slate-600">
                        ✕
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={terms}
                      onChange={(e) => setTerms(e.target.value)}
                      className="w-full rounded border border-slate-200 p-2 text-xs text-slate-600 focus:outline-hidden focus:border-[#2563EB] font-sans"
                    />
                  </div>
                )}
              </div>

              {/* Right Column: Charges, Taxes, Grand Total, Signature */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3 text-xs">
                {/* Additional Charges */}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowAddChargeModal(true)}
                    className="text-blue-600 hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>+</span>
                    <span>Add Additional Charges</span>
                  </button>
                  {additionalCharges.length > 0 && (
                    <span className="font-bold text-slate-900">₹ {calculations.addChargesSum.toFixed(2)}</span>
                  )}
                </div>

                {/* Additional Charges List */}
                {additionalCharges.map((chg, i) => (
                  <div key={i} className="flex items-center justify-between pl-3 text-slate-600">
                    <span>{chg.name}</span>
                    <div className="flex items-center gap-2">
                      <span>₹ {chg.amount.toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => setAdditionalCharges((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-red-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}

                {/* Taxable Amount */}
                <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-100">
                  <span>Taxable Amount</span>
                  <span className="font-semibold text-slate-900">₹ {calculations.totalTaxable.toFixed(2)}</span>
                </div>

                {/* GST Split */}
                {calculations.igst > 0 ? (
                  <div className="flex items-center justify-between text-slate-600">
                    <span>IGST</span>
                    <span className="font-semibold text-slate-900">₹ {calculations.igst.toFixed(2)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>SGST</span>
                      <span className="font-semibold text-slate-900">₹ {calculations.sgst.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>CGST</span>
                      <span className="font-semibold text-slate-900">₹ {calculations.cgst.toFixed(2)}</span>
                    </div>
                  </>
                )}

                {/* Overall Discount */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  {!showOverallDiscount ? (
                    <button
                      type="button"
                      onClick={() => setShowOverallDiscount(true)}
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      + Add Discount
                    </button>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-slate-600">Overall Discount (₹)</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={overallDiscount}
                          onChange={(e) => setOverallDiscount(e.target.value === "" ? "" : Number(e.target.value))}
                          className="w-20 rounded border border-slate-200 px-2 py-0.5 text-right font-semibold"
                        />
                        <button type="button" onClick={() => { setOverallDiscount(""); setShowOverallDiscount(false); }} className="text-slate-400 hover:text-slate-600">
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Auto Round Off */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoRoundOff}
                      onChange={(e) => setAutoRoundOff(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600"
                    />
                    <span className="font-semibold text-slate-700">Auto Round Off</span>
                  </label>
                  <span className="font-mono text-slate-500">
                    {calculations.roundOffDelta > 0 ? `+₹ ${calculations.roundOffDelta}` : calculations.roundOffDelta < 0 ? `-₹ ${Math.abs(calculations.roundOffDelta)}` : "₹ 0.00"}
                  </span>
                </div>

                {/* Total Amount */}
                <div className="flex items-center justify-between pt-2 border-t-2 border-slate-200">
                  <span className="text-sm font-bold text-slate-900">Total Amount:</span>
                  <span className="text-base font-extrabold text-slate-900">
                    ₹ {calculations.finalGrandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Advance Amount */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-slate-600">Advance Paid (optional)</span>
                  <input
                    type="number"
                    min="0"
                    value={advancePaid}
                    onChange={(e) => setAdvancePaid(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="₹ 0.00"
                    className="w-24 rounded border border-slate-200 px-2 py-1 text-right font-semibold text-slate-900 focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* Balance Amount */}
                <div className="flex items-center justify-between pt-1 text-emerald-600 font-bold">
                  <span>Balance Amount</span>
                  <span>₹ {calculations.balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>



                {/* Signature Box */}
                <div className="pt-3 border-t border-slate-100 flex flex-col items-end">
                  {signatureUrl ? (
                    <div className="relative border border-slate-200 rounded-lg p-2 bg-slate-50/50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={signatureUrl} alt="Signature" className="h-14 object-contain" />
                      <button
                        type="button"
                        onClick={() => setSignatureUrl(null)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]"
                      >
                        ✕
                      </button>
                      <p className="text-[10px] text-center text-slate-500 mt-1 font-semibold">Authorized Signatory</p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsSignatureModalOpen(true)}
                      className="border border-dashed border-slate-300 rounded-lg px-4 py-2.5 text-center text-slate-500 hover:border-blue-500 hover:text-blue-600 transition-colors"
                    >
                      <span>✍️ Add Signature</span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">Authorized Signatory</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Live Printable A4 Preview Mode */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 max-w-4xl mx-auto text-slate-900 space-y-6">
            <div className="flex items-start justify-between border-b border-slate-200 pb-5">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {currentCompany?.tradeName || currentCompany?.legalName || "MY COMPANY"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  GSTIN: {currentCompany?.gstin || "24AABCU9603R1ZM"} • State: 24 (Gujarat)
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {currentCompany?.city ? `${currentCompany.city}, Gujarat` : "Main Market Road, Ahmedabad - 380001"}
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-teal-50 border border-teal-200 text-teal-700 font-extrabold text-xs uppercase tracking-wider rounded-md">
                  PURCHASE ORDER
                </span>
                <p className="text-xs font-bold text-slate-800 mt-2">PO #{orderNumber}</p>
                <p className="text-xs text-slate-500">Date: {orderDate}</p>
                <p className="text-xs text-slate-500">Valid Till: {validTill}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-500 uppercase text-[10px]">Vendor / Bill From:</p>
                <p className="font-bold text-slate-900 text-sm mt-1">{selectedParty?.name || "No Vendor Selected"}</p>
                <p className="text-slate-600 mt-0.5">Phone: {selectedParty?.phone || "—"}</p>
                {selectedParty?.gstin && <p className="text-slate-600">GSTIN: {selectedParty.gstin}</p>}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-500 uppercase text-[10px]">Ship From / Dispatch:</p>
                <p className="font-bold text-slate-900 mt-1">{selectedParty?.name || "—"}</p>
                <p className="text-slate-600 mt-0.5">
                  {customShippingAddress || "Same as vendor billing address"}
                </p>
              </div>
            </div>

            {/* Table */}
            <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-2.5 w-10 text-center">#</th>
                  <th className="p-2.5">Item Description</th>
                  <th className="p-2.5">HSN</th>
                  <th className="p-2.5 text-right">Qty</th>
                  <th className="p-2.5 text-right">Rate</th>
                  <th className="p-2.5 text-right">Taxable</th>
                  <th className="p-2.5 text-right">Tax</th>
                  <th className="p-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((line, idx) => (
                  <tr key={line.id}>
                    <td className="p-2.5 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-2.5">
                      <div className="font-bold text-slate-900">{line.name || "Untitled Item"}</div>
                      {line.description && <p className="text-[10px] text-slate-500 mt-0.5">{line.description}</p>}
                    </td>
                    <td className="p-2.5 text-slate-600 font-mono">{line.hsn || "—"}</td>
                    <td className="p-2.5 text-right font-semibold">
                      {line.quantity} {line.unit}
                    </td>
                    <td className="p-2.5 text-right">₹ {Number(line.unitPrice).toFixed(2)}</td>
                    <td className="p-2.5 text-right">₹ {line.taxableAmount.toFixed(2)}</td>
                    <td className="p-2.5 text-right">
                      ₹ {line.taxAmount.toFixed(2)} ({line.taxRate}%)
                    </td>
                    <td className="p-2.5 text-right font-bold text-slate-900">₹ {line.totalAmount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                <tr>
                  <td colSpan={3} className="p-2.5 text-right">Total:</td>
                  <td className="p-2.5 text-right">{calculations.totalQty}</td>
                  <td colSpan={3} className="p-2.5 text-right">Grand Total:</td>
                  <td className="p-2.5 text-right text-teal-700 font-extrabold">
                    ₹ {calculations.finalGrandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Bottom info in preview */}
            <div className="flex justify-between items-end pt-4 border-t border-slate-200 text-xs">
              <div className="max-w-md space-y-2">
                {notes && (
                  <div>
                    <span className="font-bold text-slate-700">Notes: </span>
                    <span className="text-slate-600">{notes}</span>
                  </div>
                )}
                {terms && (
                  <div>
                    <span className="font-bold text-slate-700">Terms & Conditions: </span>
                    <pre className="text-slate-600 font-sans whitespace-pre-line text-[11px] mt-0.5">{terms}</pre>
                  </div>
                )}
              </div>
              <div className="text-center">
                {signatureUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={signatureUrl} alt="Signature" className="h-12 mx-auto object-contain" />
                )}
                <div className="border-t border-slate-300 pt-1 mt-2 w-44 font-semibold text-slate-700">
                  Authorized Signatory
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Create New Party Modal */}
      {isCreatePartyModalOpen && (
        <Modal
          isOpen={isCreatePartyModalOpen}
          onClose={() => setIsCreatePartyModalOpen(false)}
          title="Add New Vendor / Supplier"
        >
          <div className="space-y-3 text-xs p-1">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Party Name *</label>
              <input
                type="text"
                value={newPartyForm.name}
                onChange={(e) => setNewPartyForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                placeholder="e.g. Adesh Patel"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Phone Number</label>
              <input
                type="text"
                value={newPartyForm.phone}
                onChange={(e) => setNewPartyForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                placeholder="e.g. 9876543210"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">GSTIN</label>
              <input
                type="text"
                value={newPartyForm.gstin}
                onChange={(e) => setNewPartyForm((prev) => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs uppercase"
                placeholder="24AAAAA0000A1Z5"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Address</label>
              <textarea
                rows={2}
                value={newPartyForm.address}
                onChange={(e) => setNewPartyForm((prev) => ({ ...prev, address: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                placeholder="Shop / office address..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreatePartyModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newPartyForm.name.trim()) return;
                  const newP: Party = {
                    id: `vendor-${Date.now()}`,
                    name: newPartyForm.name,
                    phone: newPartyForm.phone,
                    gstin: newPartyForm.gstin,
                    billingAddress: newPartyForm.address,
                    type: "SUPPLIER",
                  };
                  setParties((prev) => [newP, ...prev]);
                  setSelectedParty(newP);
                  setIsCreatePartyModalOpen(false);
                }}
                className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold"
              >
                Save Party
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add New Item Modal */}
      {isCreateItemModalOpen && (
        <Modal
          isOpen={isCreateItemModalOpen}
          onClose={() => setIsCreateItemModalOpen(false)}
          title="Add New Inventory Item"
        >
          <div className="space-y-3 text-xs p-1">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Item Name *</label>
              <input
                type="text"
                value={createItemForm.name}
                onChange={(e) => setCreateItemForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                placeholder="e.g. 3 INCH BOPP TAPE"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">HSN Code</label>
                <input
                  type="text"
                  value={createItemForm.hsn}
                  onChange={(e) => setCreateItemForm((prev) => ({ ...prev, hsn: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                  placeholder="e.g. 3919"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Unit</label>
                <select
                  value={createItemForm.unit}
                  onChange={(e) => setCreateItemForm((prev) => ({ ...prev, unit: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                >
                  {COMMON_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Purchase Price (₹)</label>
                <input
                  type="number"
                  value={createItemForm.price}
                  onChange={(e) => setCreateItemForm((prev) => ({ ...prev, price: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">GST Rate (%)</label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="100"
                    list="gst-rates-po"
                    value={createItemForm.taxRate}
                    onChange={(e) => setCreateItemForm((prev) => ({ ...prev, taxRate: Number(e.target.value) || 0 }))}
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-300 p-2 pr-6 text-xs text-right font-mono bg-white"
                  />
                  <span className="absolute right-2 text-xs font-bold text-slate-400 pointer-events-none">%</span>
                </div>
                <datalist id="gst-rates-po">
                  <option value="0">0% (None)</option>
                  <option value="0.1">0.1%</option>
                  <option value="0.25">0.25%</option>
                  <option value="3">3%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </datalist>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreateItemModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!createItemForm.name.trim()) return;
                  const newItem: InventoryItem = {
                    id: `item-${Date.now()}`,
                    name: createItemForm.name,
                    hsnCode: createItemForm.hsn,
                    purchasePrice: createItemForm.price,
                    purchaseRate: createItemForm.price,
                    taxRate: createItemForm.taxRate,
                    unit: createItemForm.unit,
                    currentStock: 100,
                  };
                  setInventoryItems((prev) => [newItem, ...prev]);
                  if (activeRowForNewItem !== null) {
                    handlePickInventoryItem(activeRowForNewItem, newItem);
                  }
                  setIsCreateItemModalOpen(false);
                }}
                className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold"
              >
                Save Item
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Additional Charge Modal */}
      {showAddChargeModal && (
        <Modal
          isOpen={showAddChargeModal}
          onClose={() => setShowAddChargeModal(false)}
          title="Add Additional Charge"
        >
          <div className="space-y-3 text-xs p-1">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Charge Name</label>
              <input
                type="text"
                value={newChargeName}
                onChange={(e) => setNewChargeName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                placeholder="e.g. Freight / Transport"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Amount (₹)</label>
              <input
                type="number"
                min="0"
                value={newChargeAmount}
                onChange={(e) => setNewChargeAmount(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                placeholder="0.00"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddChargeModal(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (Number(newChargeAmount) > 0) {
                    setAdditionalCharges((prev) => [
                      ...prev,
                      { name: newChargeName, amount: Number(newChargeAmount) },
                    ]);
                  }
                  setShowAddChargeModal(false);
                  setNewChargeAmount("");
                }}
                className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold"
              >
                Add Charge
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Change Shipping Address Modal */}
      {isEditShippingOpen && (
        <Modal
          isOpen={isEditShippingOpen}
          onClose={() => setIsEditShippingOpen(false)}
          title="Change Shipping Address"
        >
          <div className="space-y-3 text-xs p-1">
            <textarea
              rows={4}
              value={customShippingAddress}
              onChange={(e) => setCustomShippingAddress(e.target.value)}
              placeholder="Enter specific warehouse or delivery location address..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditShippingOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Signature Modal */}
      {/* Signature Modal */}
      {isSignatureModalOpen && (
        <SignatureModal
          isOpen={isSignatureModalOpen}
          onClose={() => setIsSignatureModalOpen(false)}
          onSaveSignature={(dataUrl: string) => {
            setSignatureUrl(dataUrl);
            setIsSignatureModalOpen(false);
          }}
        />
      )}

      {/* Quick Settings Modal */}
      {isSettingsOpen && (
        <QuickSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={quickSettings}
          voucherType="purchase"
          onSave={(cfg) => {
            setQuickSettings(cfg);
            setIsSettingsOpen(false);
          }}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      {isShortcutsOpen && (
        <ShortcutsModal
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
        />
      )}
    </div>
  );
}
