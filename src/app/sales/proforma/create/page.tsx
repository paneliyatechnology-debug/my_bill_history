"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../context/auth-context";
import { apiClient, extractList } from "../../../../lib/api-client";
import { Modal } from "../../../../components/ui/modal";
import { AddItemsModal, CatalogItem } from "@/components/invoice/add-items-modal";
import { QuickSettingsModal, DEFAULT_QUICK_SETTINGS, QuickSettingsConfig } from "@/components/invoice/quick-settings-modal";
import { ShortcutsModal } from "@/components/invoice/shortcuts-modal";
import { SignatureModal } from "@/components/invoice/signature-modal";
import { useActiveInvoiceTheme } from "@/lib/use-active-invoice-theme";
import { DynamicThemedInvoice } from "@/components/invoice/dynamic-themed-invoice";
import { InvoiceLivePreviewModal } from "@/components/invoice/invoice-live-preview-modal";
import {
  InvoiceCustomization,
  DEFAULT_INVOICE_CUSTOMIZATION,
  loadInvoiceCustomization,
} from "@/lib/invoice-theme";
import { INDIAN_STATES } from "@billing/shared-types";
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

interface ProformaItemRow {
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

export default function CreateProformaInvoicePage() {
  const router = useRouter();
  const { lang, tenantContext, currentCompany } = useAuth();
  const { state: activeInvoiceTheme } = useActiveInvoiceTheme(currentCompany?.id);

  const [parties, setParties] = useState<PartyOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View Mode: Edit Mode vs Preview Mode
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const [customization, setCustomization] = useState<InvoiceCustomization>(DEFAULT_INVOICE_CUSTOMIZATION);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCustomization(loadInvoiceCustomization());
    }
  }, []);

  // Form Fields
  const [invoiceNumber, setInvoiceNumber] = useState("1");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [showDueDate, setShowDueDate] = useState(false);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0]
  );
  const [partyId, setPartyId] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState(
    currentCompany?.stateCode || "24"
  );
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");

  // Items table rows
  const [rows, setRows] = useState<ProformaItemRow[]>([]);

  // Notes, Terms & Conditions
  const [showNotes, setShowNotes] = useState(false);
    const [activeNotesTab, setActiveNotesTab] = useState<"notes" | "terms">("notes");
  const [transportMode, setTransportMode] = useState("Road");
  const [vehicleNo, setVehicleNo] = useState("");
  const [ewayBillNo, setEwayBillNo] = useState("");
  const [dispatchDate, setDispatchDate] = useState("");
  const [paymentMode, setPaymentMode] = useState("Bank Transfer");
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
        apiClient.get("/masters/parties"),
        apiClient.get("/masters/items"),
        apiClient.get("/masters/warehouses"),
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

      // Fetch sequence
      try {
        const seqRes: any = await apiClient.get("/sales/invoices/next-number", { category: "PROFORMA_INVOICE" }).catch(() => null);
        if (seqRes?.nextNumber) {
          setInvoiceNumber(String(seqRes.nextNumber));
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
  const handleCatalogItemsSelected = (
    selected: Array<{
      item: CatalogItem;
      quantity: number;
      unitPrice: number;
    }>
  ) => {
    const newRows: ProformaItemRow[] = selected.map((s) => ({
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

  const handleUpdateRow = (id: string, field: keyof ProformaItemRow, val: any) => {
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
    if (rows.length === 0 || !rows.some((r) => Number(r.quantity) > 0)) {
      setError("Please add at least one item with valid quantity.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await apiClient.post("/sales/invoices?isDraft=true", {
        category: "PROFORMA_INVOICE",
        invoiceNumber: invoiceNumber.trim() || undefined,
        invoiceDate: new Date(invoiceDate).toISOString(),
        dueDate: showDueDate && dueDate ? new Date(dueDate).toISOString() : undefined,
        partyId: partyId || undefined,
        placeOfSupply,
        warehouseId: selectedWarehouseId || warehouses[0]?.id,
        notes: notes.trim() || undefined,
        termsAndConditions: terms.trim() || undefined,
        additionalCharges: addCharges,
        overallDiscount: overallDisc,
        receivedAmount: amountReceived,
        items: rows.map((r) => ({
          itemId: r.itemId || items[0]?.id,
          description: r.itemName || r.description || "Proforma Item",
          hsnCode: r.hsnCode || "1001",
          quantity: Number(r.quantity) || 1,
          unitPrice: Number(r.unitPrice) || 0,
          discountPercent: Number(r.discountPercent) || 0,
          taxRate: r.taxRate,
        })),
      });

      if (isSaveAndNew) {
        setInvoiceNumber((prev) => String(Number(prev || 0) + 1));
        setRows([]);
        setPartyId("");
        setPaymentAmountReceived("");
      } else {
        router.push("/sales/proforma");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to save proforma invoice.");
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
      const res: any = await apiClient.post("/masters/parties", {
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
    <div className="min-h-screen bg-[#F6F8F7] pb-24 text-slate-800 font-sans">
      {/* =========================================================================
          TOP BAR: Compact Forest Teal Signature Enterprise Toolbar (Full-Width)
          ========================================================================= */}
      {/* Top header replaced by unified DocumentHeaderCard */}

      {/* Main Container */}
      <main className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-800 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-500 font-bold hover:underline">
              ✕
            </button>
          </div>
        )}

        {/* View Mode: Preview */}
        {viewMode === "preview" ? (
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
                    <span>{lang === "gu" ? "પ્રોફોર્મા ઇન્વોઇસ પ્રિવ્યૂ" : "Proforma Invoice Preview"}</span>
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
                  <span>🖨️ {lang === "gu" ? "પ્રિન્ટ" : "Print Document"}</span>
                </button>
              </div>
            </div>

            {/* Themed Document using DynamicThemedInvoice */}
            <div className="bg-slate-100/70 p-4 sm:p-8 rounded-2xl border border-slate-200 overflow-x-auto flex justify-center">
              <DynamicThemedInvoice
                invoice={{
                  category: "PROFORMA_INVOICE",
                  invoiceNumber: invoiceNumber || "PI-001",
                  invoiceDate: invoiceDate,
                  dueDate: dueDate,
                  paymentMode: "PROFORMA",
                  placeOfSupply: placeOfSupply ? `State Code (${placeOfSupply})` : "Gujarat (24)",
                  taxableAmount: totalTaxable,
                  cgstAmount: totalCgst,
                  sgstAmount: totalSgst,
                  igstAmount: totalIgst,
                  roundOff: autoRoundOff ? grandTotal - rawSubtotal : 0,
                  grandTotal: grandTotal,
                  paidAmount: Number(paymentAmountReceived) || 0,
                  balanceAmount: balanceAmount,
                  notes: notes,
                  party: {
                    name: selectedParty?.name || "Customer / Prospect",
                    gstin: selectedParty?.gstin,
                    phone: selectedParty?.phone,
                    billingAddress: selectedParty?.billingAddress?.line1 || selectedParty?.address,
                  },
                  items: rows.map((r, idx) => {
                    const q = Number(r.quantity) || 0;
                    const rate = Number(r.unitPrice) || 0;
                    const gross = q * rate;
                    const disc = Number(r.discountPercent) || 0;
                    const discVal = (gross * disc) / 100;
                    const taxable = Math.max(0, gross - discVal);
                    const taxRate = Number(r.taxRate) || 0;
                    const taxAmt = (taxable * taxRate) / 100;
                    return {
                      id: `row-${idx}`,
                      description: r.itemName || "Product / Item",
                      hsnCode: r.hsnCode,
                      quantity: q,
                      unit: r.unit || "PCS",
                      unitPrice: rate,
                      discountPercent: disc,
                      taxRate: taxRate,
                      taxableAmount: taxable,
                      cgstAmount: isInterState ? 0 : taxAmt / 2,
                      sgstAmount: isInterState ? 0 : taxAmt / 2,
                      igstAmount: isInterState ? taxAmt : 0,
                      totalAmount: taxable + taxAmt,
                      item: { name: r.itemName },
                    };
                  }),
                }}
                settings={{
                  ...activeInvoiceTheme,
                  termsAndConditions: {
                    ...activeInvoiceTheme.termsAndConditions,
                    sales: terms || activeInvoiceTheme.termsAndConditions?.sales,
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
                printableId="printable-proforma-invoice"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* DOCUMENT HEADER CARD */}
            <DocumentHeaderCard
              title={lang === "gu" ? "પ્રોફોર્મા ઇન્વોઇસ" : "Proforma Invoice"}
              subtitle={lang === "gu" ? "પ્રોફોર્મા ઇન્વોઇસ બનાવો અને મેનેજ કરો" : "Create and manage your proforma invoice"}
              status="Draft"
              onPreview={() => setViewMode("preview")}
              onPrint={() => window.print()}
              onSave={() => handleSubmit(false)}
              onSaveAsDraft={() => handleSubmit(true)}
              isSaving={isSubmitting}
              saveButtonLabel="Save Proforma"
              moreMenuItems={[
                { label: "Quick Settings", onClick: () => { setQuickSettingsTab("invoice"); setIsQuickSettingsOpen(true); } },
                { label: "Keyboard Shortcuts", onClick: () => setIsShortcutsOpen(true) },
                { label: "Authorized Signature", onClick: () => setIsSignatureModalOpen(true) },
              ]}
            />

            {/* 5-COLUMN DOCUMENT INFO STRIP */}
            <DocumentInfoStrip
              fields={[
                {
                  id: "customer",
                  label: "Customer",
                  required: true,
                  type: "custom",
                  customRender: (
                    <PartySelectorCompact
                      selectedParty={selectedParty}
                      searchTerm={partySearchQuery}
                      onSearchChange={setPartySearchQuery}
                      isOpen={isAddPartyModalOpen}
                      onOpenChange={setIsAddPartyModalOpen}
                      filteredParties={filteredParties}
                      onSelectParty={(id) => {
                        setPartyId(id);
                        const p = parties.find((party) => party.id === id);
                        if (p?.stateCode) setPlaceOfSupply(p.stateCode);
                      }}
                      onClearParty={() => {
                        setPartyId("");
                        setPartySearchQuery("");
                      }}
                      onAddNew={() => setIsAddPartyModalOpen(true)}
                      placeholder="Search customer..."
                    />
                  ),
                },
                {
                  id: "invoiceNumber",
                  label: "Proforma No.",
                  type: "text",
                  value: invoiceNumber,
                  onChange: setInvoiceNumber,
                  placeholder: "PI-001",
                },
                {
                  id: "invoiceDate",
                  label: "Proforma Date",
                  type: "date",
                  value: invoiceDate,
                  onChange: setInvoiceDate,
                },
                {
                  id: "dueDate",
                  label: "Valid Till",
                  type: "date",
                  value: dueDate,
                  onChange: setDueDate,
                },
                {
                  id: "placeOfSupply",
                  label: "Place of Supply",
                  type: "select",
                  value: placeOfSupply,
                  onChange: setPlaceOfSupply,
                  options: Object.entries(INDIAN_STATES).map(([code, st]) => ({
                    label: `${st.name} (${code})`,
                    value: code,
                  })),
                },
              ]}
            />

            {/* MAIN 2-COLUMN WORKSPACE MATCHING REFERENCE IMAGE */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column (8 cols): Items & Services Table + Notes & Additional Info */}
              <div className="lg:col-span-8 space-y-5">
                <DocumentItemsCard
                  title="Items & Services"
                  itemsCount={rows.length}
                  totalQty={totalQuantity}
                  itemsTotal={grandTotal}
                  onScanItem={() => setIsBarcodeOpen(true)}
                  onImportItems={() => setIsAddItemsModalOpen(true)}
                  onAddItem={() => setIsAddItemsModalOpen(true)}
                  onAddBlankRow={() => {
                    const newRow: ProformaItemRow = {
                      id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                      itemId: items[0]?.id || "",
                      itemName: items[0]?.name || "",
                      hsnCode: items[0]?.hsnCode || "1001",
                      quantity: 1,
                      unit: "PCS",
                      unitPrice: items[0]?.retailPrice || 0,
                      discountPercent: 0,
                      taxRate: items[0]?.taxRate ?? 18,
                    };
                    setRows((prev) => [...prev, newRow]);
                  }}
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
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-400">
                            <div className="max-w-xs mx-auto space-y-2">
                              <span className="text-2xl">📦</span>
                              <p className="font-bold text-slate-700">No items added yet</p>
                              <p className="text-[11px] text-slate-400">Add an item from catalog or enter details below</p>
                              <button
                                type="button"
                                onClick={() => setIsAddItemsModalOpen(true)}
                                className="px-3.5 py-1.5 bg-[#174B43] text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer"
                              >
                                + Add From Catalog
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        rows.map((row, idx) => {
                          const q = Number(row.quantity) || 0;
                          const rate = Number(row.unitPrice) || 0;
                          const disc = Number(row.discountPercent) || 0;
                          const gross = q * rate;
                          const net = gross - (gross * disc) / 100;
                          const lineTax = (net * row.taxRate) / 100;
                          const lineTotal = net + lineTax;

                          return (
                            <tr key={row.id || `row-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                                {idx + 1}
                              </td>

                              <td className="py-3 px-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <select
                                      value={row.itemId}
                                      onChange={(e) => handleUpdateRow(row.id, "itemId", e.target.value)}
                                      className="w-full text-xs py-1.5 px-2.5 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#26A58A] rounded-xl font-bold text-slate-800"
                                    >
                                      {items.map((it) => (
                                        <option key={it.id} value={it.id}>
                                          {it.name} (Stock: {it.stockQuantity ?? 0})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-3">
                                <input
                                  type="text"
                                  value={row.hsnCode}
                                  onChange={(e) => handleUpdateRow(row.id, "hsnCode", e.target.value)}
                                  className="w-full text-xs py-1.5 px-2 text-center font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white"
                                  placeholder="1001"
                                />
                              </td>

                              <td className="py-3 px-3">
                                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                                  <input
                                    type="number"
                                    min="0.001"
                                    step="any"
                                    value={row.quantity}
                                    onChange={(e) => handleUpdateRow(row.id, "quantity", e.target.value === "" ? "" : Number(e.target.value))}
                                    className="w-full text-xs text-right font-mono font-bold text-slate-800 bg-transparent focus:outline-none"
                                  />
                                </div>
                              </td>

                              <td className="py-3 px-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={row.unitPrice}
                                  onChange={(e) => handleUpdateRow(row.id, "unitPrice", e.target.value === "" ? "" : Number(e.target.value))}
                                  className="w-full text-xs py-1.5 px-2 text-right font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white"
                                />
                              </td>

                              <td className="py-3 px-3">
                                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={row.discountPercent}
                                    onChange={(e) => handleUpdateRow(row.id, "discountPercent", e.target.value === "" ? "" : Number(e.target.value))}
                                    placeholder="0"
                                    className="w-full text-xs text-right font-mono bg-transparent focus:outline-none"
                                  />
                                  <span className="text-[10px] text-slate-400">%</span>
                                </div>
                              </td>

                              <td className="py-3 px-3">
                                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                                  <input
                                    type="number"
                                    step="any"
                                    value={row.taxRate}
                                    onChange={(e) => handleUpdateRow(row.id, "taxRate", Number(e.target.value) || 0)}
                                    placeholder="18"
                                    className="w-full text-xs text-right font-mono font-bold bg-transparent focus:outline-none"
                                  />
                                  <span className="text-[10px] text-slate-400">%</span>
                                </div>
                              </td>

                              <td className="py-3 px-3 text-right font-mono font-black text-slate-900 text-xs">
                                ₹ {lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>

                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveRow(row.id)}
                                    className="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                                    title="Delete row"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
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

              {/* Right Column (4 cols): Summary Card + Payment Details Card */}
              <div className="lg:col-span-4 space-y-5">
                <DocumentSummaryCard
                  title="Proforma Summary"
                  subtotal={totalTaxable}
                  discount={Number(overallDiscountAmount) > 0 ? Number(overallDiscountAmount) : undefined}
                  cgst={!isInterState ? totalCgst : undefined}
                  sgst={!isInterState ? totalSgst : undefined}
                  igst={isInterState ? totalIgst : undefined}
                  roundOff={autoRoundOff ? (grandTotal - (totalTaxable + totalTax)) : undefined}
                  grandTotal={grandTotal}
                />

                <DocumentPaymentCard
                  amountReceived={paymentAmountReceived}
                  onAmountReceivedChange={(val) => setPaymentAmountReceived(val === "" ? "" : val)}
                  paymentMode={paymentMode}
                  onPaymentModeChange={setPaymentMode}
                  balanceDue={balanceAmount}
                  onPaidInFull={() => setPaymentAmountReceived(grandTotal)}
                />
              </div>
            </div>

            {/* STICKY BOTTOM ACTION BAR */}
            <DocumentBottomBar
              totalItems={rows.length}
              totalAmount={grandTotal}
              onSaveAsDraft={() => handleSubmit(true)}
              onSave={() => handleSubmit(false)}
              isSaving={isSubmitting}
              saveButtonLabel="Save Proforma"
              backHref="/sales/proforma"
            />
          </div>

        )}
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
                    className="w-full text-left p-2 hover:bg-teal-50 flex items-center justify-between"
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
                className="px-4 py-1.5 bg-[#174B43] hover:bg-[#123B35] text-white rounded-lg font-bold shadow-xs cursor-pointer disabled:opacity-50"
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
              className="px-4 py-1.5 bg-[#174B43] text-white rounded-lg font-bold"
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
        onSaveSignature={(data) => {
          setSignatureData(data);
          setIsSignatureModalOpen(false);
        }}
      />

      {/* Live Preview Modal (if modal view is requested) */}
      <InvoiceLivePreviewModal
        isOpen={false}
        onClose={() => setViewMode("edit")}
        customization={customization}
        lang={lang}
        companyId={currentCompany?.id}
        settings={activeInvoiceTheme}
        invoiceData={{
          category: "PROFORMA_INVOICE",
          invoiceNumber,
          invoiceDate,
          paymentMode: "PROFORMA / ESTIMATE",
          placeOfSupply: placeOfSupply ? `State Code (${placeOfSupply})` : "Gujarat (24)",
          partyName: selectedParty?.name || "Cash / Direct Customer",
          partyGstin: selectedParty?.gstin,
          partyPhone: selectedParty?.phone,
          partyAddress:
            selectedParty?.address ||
            (selectedParty?.billingAddress
              ? `${selectedParty.billingAddress.line1 || ""}, ${selectedParty.billingAddress.city || ""}`
              : undefined),
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
          roundOff: autoRoundOff ? grandTotal - rawSubtotal : 0,
          roundedGrandTotal: grandTotal,
          isTaxInclusive: false,
          isInterState,
        }}
      />
    </div>
  );
}
