"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useActiveInvoiceTheme } from "@/lib/use-active-invoice-theme";
import { DynamicThemedInvoice } from "@/components/invoice/dynamic-themed-invoice";
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
import {
  DocumentHeaderCard,
  DocumentInfoStrip,
  DocumentItemsCard,
  DocumentNotesAndTermsCard,
  DocumentAdditionalInfoCard,
  DocumentSummaryCard,
  DocumentPaymentCard,
  DocumentBottomBar,
  PartySelectorCompact,
} from "@/components/document-studio";

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
  const { state: activeInvoiceTheme } = useActiveInvoiceTheme(currentCompany?.id);

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
    const [activeNotesTab, setActiveNotesTab] = useState<"notes" | "terms">("notes");
  const [transportMode, setTransportMode] = useState("Road");
  const [vehicleNo, setVehicleNo] = useState("");
  const [ewayBillNo, setEwayBillNo] = useState("");
  const [dispatchDate, setDispatchDate] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
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
        {/* Top header replaced by unified DocumentHeaderCard */}
        {/* Main Form Area */}
        <div className="space-y-3">
        {viewMode === "edit" ? (
          <div className="space-y-4">
            {/* DOCUMENT HEADER CARD */}
            <DocumentHeaderCard
              title={lang === "gu" ? "ખરીદી ઓર્ડર (Purchase Order)" : "Purchase Order"}
              subtitle={lang === "gu" ? "તમારો સપ્લાયર ઓર્ડર બનાવો અને મેનેજ કરો" : "Create and manage your supplier purchase orders"}
              status="Draft"
              onPreview={() => setViewMode("preview")}
              onPrint={() => window.print()}
              onSave={() => handleSaveOrder(false)}
              onSaveAsDraft={() => handleSaveOrder(false)}
              isSaving={isSaving}
              saveButtonLabel="Save Purchase Order"
              moreMenuItems={[
                { label: "Quick Settings", onClick: () => setIsSettingsOpen(true) },
                { label: "Keyboard Shortcuts", onClick: () => setIsShortcutsOpen(true) },
              ]}
            />

            {/* 5-COLUMN DOCUMENT INFO STRIP */}
            <DocumentInfoStrip
              fields={[
                {
                  id: "vendor",
                  label: "Supplier / Vendor",
                  required: true,
                  type: "custom",
                  customRender: (
                    <PartySelectorCompact
                      selectedParty={selectedParty ? {
                        id: selectedParty.id,
                        name: selectedParty.name,
                        phone: selectedParty.phone,
                        gstin: selectedParty.gstin,
                        address: typeof selectedParty.billingAddress === "string" ? selectedParty.billingAddress : selectedParty.billingAddress?.line1,
                      } : null}
                      searchTerm={partySearchQuery}
                      onSearchChange={setPartySearchQuery}
                      isOpen={isPartySearchOpen}
                      onOpenChange={setIsPartySearchOpen}
                      filteredParties={parties
                        .filter((p) => p.name.toLowerCase().includes(partySearchQuery.toLowerCase()))
                        .map((p) => ({
                          id: p.id,
                          name: p.name,
                          phone: p.phone,
                          gstin: p.gstin,
                          outstandingBalance: p.currentBalance,
                        }))}
                      onSelectParty={(id) => {
                        const p = parties.find((party) => party.id === id);
                        if (p) setSelectedParty(p);
                      }}
                      onClearParty={() => {
                        setSelectedParty(null);
                        setPartySearchQuery("");
                      }}
                      onAddNew={() => setIsCreatePartyModalOpen(true)}
                      placeholder="Search vendor..."
                    />
                  ),
                },
                {
                  id: "orderNumber",
                  label: "PO Number",
                  type: "text",
                  value: orderNumber,
                  onChange: setOrderNumber,
                  placeholder: "PO-001",
                },
                {
                  id: "orderDate",
                  label: "PO Date",
                  type: "date",
                  value: orderDate,
                  onChange: setOrderDate,
                },
                {
                  id: "validTill",
                  label: "Expected Delivery",
                  type: "date",
                  value: validTill,
                  onChange: setValidTill,
                },
                {
                  id: "placeOfSupply",
                  label: "Place of Supply",
                  type: "text",
                  value: selectedParty?.stateCode ? `State Code: ${selectedParty.stateCode}` : "Gujarat (24)",
                },
              ]}
            />

            {/* MAIN 2-COLUMN WORKSPACE MATCHING REFERENCE IMAGE */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column (8 cols): Items Table + Notes & Additional Info */}
              <div className="lg:col-span-8 space-y-5">
                <DocumentItemsCard
                  title="Items & Services"
                  itemsCount={items.length}
                  totalQty={calculations.totalQty}
                  itemsTotal={calculations.finalGrandTotal}
                  onImportItems={handleAddItem}
                  onAddItem={handleAddItem}
                  onAddBlankRow={handleAddItem}
                  addItemLabel="+ Add Item"
                >
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#FAFBF7] border-b border-slate-200 text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-3.5 text-center w-12">#</th>
                        <th className="py-3 px-3.5">Item / Description</th>
                        <th className="py-3 px-3 text-center w-28">HSN/SAC</th>
                        <th className="py-3 px-3 text-right w-24">Qty</th>
                        <th className="py-3 px-3 text-right w-28">Rate (₹)</th>
                        <th className="py-3 px-3 text-right w-24">Discount</th>
                        <th className="py-3 px-3 text-right w-24">Tax (%)</th>
                        <th className="py-3 px-3 text-right w-28">Amount (₹)</th>
                        <th className="py-3 px-3 text-center w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((row, idx) => (
                        <tr key={row.id || idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>

                          <td className="py-3 px-3">
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={row.name}
                                onChange={(e) => updateItemLine(idx, "name", e.target.value)}
                                placeholder="Type item name..."
                                className="w-full text-xs py-1.5 px-2.5 font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#26A58A]"
                              />
                              {inventoryItems.length > 0 && !row.name && (
                                <select
                                  onChange={(e) => {
                                    const itm = inventoryItems.find((it) => it.id === e.target.value);
                                    if (itm) handlePickInventoryItem(idx, itm);
                                  }}
                                  defaultValue=""
                                  className="w-full text-[11px] py-1 px-2 text-slate-500 bg-white border border-dashed border-slate-200 rounded-lg"
                                >
                                  <option value="" disabled>Choose from Catalog...</option>
                                  {inventoryItems.map((it) => (
                                    <option key={it.id} value={it.id}>{it.name} (₹{it.purchaseRate || it.purchasePrice || 0})</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <input
                              type="text"
                              value={row.hsn}
                              onChange={(e) => updateItemLine(idx, "hsn", e.target.value)}
                              placeholder="HSN"
                              className="w-full text-xs py-1.5 px-2 text-center font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white"
                            />
                          </td>

                          <td className="py-3 px-3">
                            <input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={(e) => updateItemLine(idx, "quantity", e.target.value === "" ? "" : Number(e.target.value))}
                              className="w-full text-xs py-1.5 px-2 text-right font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                            />
                          </td>

                          <td className="py-3 px-3">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={row.unitPrice}
                              onChange={(e) => updateItemLine(idx, "unitPrice", e.target.value === "" ? "" : Number(e.target.value))}
                              className="w-full text-xs py-1.5 px-2 text-right font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                            />
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                              <input
                                type="number"
                                min="0"
                                value={row.discount}
                                onChange={(e) => updateItemLine(idx, "discount", Number(e.target.value) || 0)}
                                className="w-full text-xs text-right font-mono bg-transparent focus:outline-none"
                              />
                              <span className="text-[10px] text-slate-400 font-bold ml-1">{row.discountType}</span>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <input
                              type="number"
                              value={row.taxRate}
                              onChange={(e) => updateItemLine(idx, "taxRate", Number(e.target.value) || 0)}
                              className="w-full text-xs py-1.5 px-2 text-right font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white"
                            />
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-black text-slate-900 text-xs">
                            ₹ {row.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                              title="Delete row"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </DocumentItemsCard>

                {/* Side-by-side: Notes & Terms + Additional Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <DocumentNotesAndTermsCard
                    activeTab={activeNotesTab}
                    onTabChange={setActiveNotesTab}
                    notes={notes}
                    onNotesChange={setNotes}
                    terms={terms}
                    onTermsChange={setTerms}
                  />

                  <DocumentAdditionalInfoCard
                    transportMode={transportMode}
                    onTransportModeChange={setTransportMode}
                    vehicleNo={vehicleNo}
                    onVehicleNoChange={setVehicleNo}
                    ewayBillNo={ewayBillNo}
                    onEwayBillNoChange={setEwayBillNo}
                    dispatchDate={dispatchDate}
                    onDispatchDateChange={setDispatchDate}
                  />
                </div>
              </div>

              {/* Right Column (4 cols): Summary Card + Advance Payment Card */}
              <div className="lg:col-span-4 space-y-5">
                <DocumentSummaryCard
                  title="Order Summary"
                  subtotal={calculations.totalTaxable}
                  discount={calculations.totalDiscount > 0 ? calculations.totalDiscount : undefined}
                  cgst={calculations.cgst > 0 ? calculations.cgst : undefined}
                  sgst={calculations.sgst > 0 ? calculations.sgst : undefined}
                  igst={calculations.igst > 0 ? calculations.igst : undefined}
                  roundOff={calculations.roundOffDelta !== 0 ? calculations.roundOffDelta : undefined}
                  grandTotal={calculations.finalGrandTotal}
                />

                <DocumentPaymentCard
                  amountReceived={Number(advancePaid) || 0}
                  onAmountReceivedChange={(val) => setAdvancePaid(val)}
                  paymentMode={paymentMode}
                  onPaymentModeChange={setPaymentMode}
                  balanceDue={calculations.balance}
                  onPaidInFull={() => setAdvancePaid(calculations.finalGrandTotal)}
                />
              </div>
            </div>

            {/* STICKY BOTTOM ACTION BAR */}
            <DocumentBottomBar
              totalItems={items.length}
              totalAmount={calculations.finalGrandTotal}
              onSaveAsDraft={() => handleSaveOrder(false)}
              onSave={() => handleSaveOrder(false)}
              isSaving={isSaving}
              saveButtonLabel="Save Purchase Order"
              backHref="/purchases/orders"
            />
          </div>

        ) : (
          <div className="space-y-4 animate-fadeIn">
            {/* Preview Top Control Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setViewMode("edit")}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>← {lang === "gu" ? "એડિટ મોડ પર પાછા જાઓ" : "Back to Edit Mode"}</span>
                </button>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>{lang === "gu" ? "ખરીદી ઓર્ડર પ્રિવ્યૂ" : "Purchase Order Preview"}</span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: activeInvoiceTheme.accentColor || "#174B43" }}
                    >
                      {activeInvoiceTheme.uniqueThemeKey || activeInvoiceTheme.themeId}
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {lang === "gu" ? "સેટિંગ્સમાંથી પસંદ કરેલી થીમ મુજબ લાઇવ પ્રિવ્યૂ" : "Live preview rendered with your saved settings theme"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-[#174B43] hover:bg-[#123B35] text-white rounded-xl text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🖨️ {lang === "gu" ? "પ્રિન્ટ" : "Print PO"}</span>
                </button>
              </div>
            </div>

            {/* Themed Document using DynamicThemedInvoice */}
            <div className="bg-slate-100/70 p-4 sm:p-8 rounded-2xl border border-slate-200 overflow-x-auto flex justify-center">
              <DynamicThemedInvoice
                invoice={{
                  category: "PURCHASE_ORDER",
                  invoiceNumber: orderNumber || "PO-001",
                  invoiceDate: orderDate,
                  dueDate: validTill,
                  paymentMode: paymentMode,
                  placeOfSupply: selectedParty?.stateCode ? `State Code (${selectedParty.stateCode})` : "Gujarat (24)",
                  taxableAmount: calculations.totalTaxable,
                  cgstAmount: calculations.cgst,
                  sgstAmount: calculations.sgst,
                  igstAmount: calculations.igst,
                  roundOff: calculations.roundOffDelta,
                  grandTotal: calculations.finalGrandTotal,
                  paidAmount: Number(advancePaid) || 0,
                  balanceAmount: calculations.balance,
                  notes: notes,
                  party: {
                    name: selectedParty?.name || "Supplier Name",
                    gstin: selectedParty?.gstin,
                    phone: selectedParty?.phone,
                    billingAddress: typeof selectedParty?.billingAddress === "string" ? selectedParty.billingAddress : selectedParty?.billingAddress?.line1,
                  },
                  items: items.map((r, idx) => ({
                    id: r.id || `row-${idx}`,
                    description: r.name || "Item",
                    hsnCode: r.hsn,
                    quantity: typeof r.quantity === "number" ? r.quantity : Number(r.quantity) || 0,
                    unit: r.unit || "PCS",
                    unitPrice: typeof r.unitPrice === "number" ? r.unitPrice : Number(r.unitPrice) || 0,
                    discountPercent: r.discountType === "%" ? Number(r.discount) || 0 : 0,
                    taxRate: Number(r.taxRate) || 0,
                    taxableAmount: r.taxableAmount,
                    cgstAmount: calculations.cgst > 0 ? r.taxAmount / 2 : 0,
                    sgstAmount: calculations.sgst > 0 ? r.taxAmount / 2 : 0,
                    igstAmount: calculations.igst > 0 ? r.taxAmount : 0,
                    totalAmount: r.totalAmount,
                    item: { name: r.name },
                  })),
                  eWayBillRecord: {
                    poNumber: orderNumber,
                    vehicleNo: vehicleNo,
                    ewayBillNo: ewayBillNo,
                    dispatchDate: dispatchDate,
                    transportMode: transportMode,
                  },
                }}
                settings={{
                  ...activeInvoiceTheme,
                  termsAndConditions: {
                    ...activeInvoiceTheme.termsAndConditions,
                    sales: terms,
                  },
                }}
                company={{
                  tradeName: currentCompany?.tradeName || currentCompany?.legalName || "My Company",
                  legalName: currentCompany?.legalName,
                  addressLine1: (currentCompany as any)?.address || currentCompany?.city || "Gujarat, India",
                  city: currentCompany?.city,
                  gstin: currentCompany?.gstin,
                  phone: (currentCompany as any)?.phone,
                  stateCode: currentCompany?.stateCode || "24",
                }}
                printableId="printable-purchase-order"
              />
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
