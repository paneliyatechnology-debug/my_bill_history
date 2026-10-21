"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { apiClient, extractList } from "@/lib/api-client";
import { AddItemsModal, CatalogItem } from "@/components/invoice/add-items-modal";
import { InvoiceLivePreviewModal } from "@/components/invoice/invoice-live-preview-modal";
import { ConfettiCanvas } from "@/components/invoice/confetti-canvas";
import {
  QuickSettingsModal,
  DEFAULT_QUICK_SETTINGS,
  QuickSettingsConfig,
} from "@/components/invoice/quick-settings-modal";
import { ShortcutsModal } from "@/components/invoice/shortcuts-modal";
import { SignatureModal } from "@/components/invoice/signature-modal";
import {
  InvoiceCustomization,
  loadInvoiceCustomization,
  DEFAULT_INVOICE_CUSTOMIZATION,
} from "@/lib/invoice-theme";
import { getPartyItemPrice } from "@/lib/party-item-pricing";

interface PartyOption {
  id: string;
  name: string;
  gstin?: string;
  stateCode: string;
  phone?: string;
  address?: string;
  outstandingBalance?: number;
  type?: string;
}

interface ItemOption {
  id: string;
  name: string;
  nameGujarati?: string;
  hsnCode: string;
  taxRate: number;
  retailPrice: number;
  stockQuantity?: number;
  unit?: string;
}

interface QuotationItemRow {
  itemId: string;
  hsnCode: string;
  description?: string;
  quantity: number | "";
  unit?: string;
  unitPrice: number | "";
  discountPercent: number | "";
  discountAmount?: number | "";
  taxRate: number;
}

interface AdditionalChargeItem {
  id: string;
  name: string;
  amount: number | "";
  taxRate: number;
}

export default function NewQuotationPage() {
  const router = useRouter();
  const { lang, tenantContext, currentCompany } = useAuth();

  // Data lists
  const [parties, setParties] = useState<PartyOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modes & Modals
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [isAddItemsModalOpen, setIsAddItemsModalOpen] = useState(false);
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);
  const [quickSettingsTab, setQuickSettingsTab] = useState<"invoice" | "party" | "items">("items");
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isConfettiActive, setIsConfettiActive] = useState(false);
  const [isAutoRoundOff, setIsAutoRoundOff] = useState(true);

  // Settings & Theme
  const [quickSettings, setQuickSettings] = useState<QuickSettingsConfig>(DEFAULT_QUICK_SETTINGS);
  const [customization, setCustomization] = useState<InvoiceCustomization>(DEFAULT_INVOICE_CUSTOMIZATION);

  // Party Selection State
  const [partyId, setPartyId] = useState("");
  const [partySearchTerm, setPartySearchTerm] = useState("");
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const partyDropdownRef = useRef<HTMLDivElement | null>(null);

  // Quotation Meta
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [quotationNumber, setQuotationNumber] = useState("");
  const [quotationDate, setQuotationDate] = useState(todayStr);

  // Due Date / Validity (defaults to 15 days)
  const defaultValidDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split("T")[0];
  }, []);
  const [dueDate, setDueDate] = useState(defaultValidDate);
  const [showDueDate, setShowDueDate] = useState(false);

  // Shipping & PO Details
  const [placeOfSupply, setPlaceOfSupply] = useState(currentCompany?.stateCode || "24");
  const [shippingAddress, setShippingAddress] = useState("");
  const [isChangeShippingOpen, setIsChangeShippingOpen] = useState(false);
  const [poNumber, setPoNumber] = useState("");
  const [poDate, setPoDate] = useState("");
  const [showPoDetails, setShowPoDetails] = useState(false);

  // Bottom Add-ons
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState(
    "1. Goods once sold will not be taken back or exchanged\n2. All disputes are subject to [ENTER_YOUR_CITY_NAME] jurisdiction only"
  );
  const [showBankAccount, setShowBankAccount] = useState(false);
  const [showPaymentQr, setShowPaymentQr] = useState(false);

  // Additional Charges & Overall Discount
  const [additionalCharges, setAdditionalCharges] = useState<AdditionalChargeItem[]>([]);
  const [showOverallDiscount, setShowOverallDiscount] = useState(false);
  const [overallDiscountPercent, setOverallDiscountPercent] = useState<number | "">(0);
  const [overallDiscountAmount, setOverallDiscountAmount] = useState<number | "">(0);

  // Table Rows (starts with empty array matching myBillBook)
  const [rows, setRows] = useState<QuotationItemRow[]>([]);

  // Create/Edit Party Modal State
  const [isCreatePartyModalOpen, setIsCreatePartyModalOpen] = useState(false);
  const [partyFormData, setPartyFormData] = useState({
    name: "",
    phone: "",
    gstin: "",
    billingLine1: "",
    billingCity: "Ahmedabad",
    billingState: "Gujarat",
    billingPincode: "380001",
    stateCode: currentCompany?.stateCode || "24",
  });
  const [isCreatingParty, setIsCreatingParty] = useState(false);

  // Load Customization & Quick Settings
  useEffect(() => {
    if (typeof window !== "undefined") {
      const cust = loadInvoiceCustomization();
      setCustomization(cust);

      const savedSettings = localStorage.getItem("billing_quick_settings");
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setQuickSettings({ ...DEFAULT_QUICK_SETTINGS, ...parsed });
        } catch {}
      }
    }
  }, []);

  // Generate Quotation Number based on date & sequential number
  useEffect(() => {
    if (!quotationNumber) {
      const yr = new Date().getFullYear().toString().slice(-2);
      const nextYr = (Number(yr) + 1).toString();
      const randSeq = Math.floor(1000 + Math.random() * 9000);
      setQuotationNumber(`QTN-${yr}-${nextYr}-${randSeq}`);
    }
  }, [quotationNumber]);

  // Fetch Parties & Items
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [partiesRes, itemsRes, unitsRes]: any = await Promise.all([
        apiClient.get("/parties", { type: "CUSTOMER" }),
        apiClient.get("/items"),
        apiClient.get("/units").catch(() => []),
      ]);
      const pList = extractList<PartyOption>(partiesRes);
      const iList = extractList<ItemOption>(itemsRes);
      const uList = extractList<any>(unitsRes);
      setParties(pList);
      setItems(iList);
      setUnits(uList);
    } catch (err: any) {
      setError(err.message || "Failed to load quotation master data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchData();
    }
  }, [tenantContext.companyId, fetchData]);

  // Format INR Helper
  const formatInr = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  // Selected Party Object
  const selectedParty = useMemo(() => {
    return parties.find((p) => p.id === partyId);
  }, [parties, partyId]);

  // Filtered Parties for search
  const filteredParties = useMemo(() => {
    if (!partySearchTerm) return parties;
    const q = partySearchTerm.toLowerCase();
    return parties.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.phone && p.phone.toLowerCase().includes(q)) ||
        (p.gstin && p.gstin.toLowerCase().includes(q))
    );
  }, [parties, partySearchTerm]);

  // Party Selection Handler
  const handlePartyChange = (id: string) => {
    setPartyId(id);
    setIsPartyDropdownOpen(false);
    setPartySearchTerm("");
    const selected = parties.find((p) => p.id === id);
    if (selected?.stateCode) {
      setPlaceOfSupply(selected.stateCode);
    }

    // Recalculate prices according to party rates
    setRows((prevRows) =>
      prevRows.map((r) => {
        if (!r.itemId) return r;
        const it = items.find((i) => i.id === r.itemId);
        const partyPrice = getPartyItemPrice(id, r.itemId, selected?.name, it?.name);
        const effectivePrice = partyPrice !== null ? partyPrice : (it?.retailPrice || r.unitPrice);
        const q = Number(r.quantity) || 0;
        const gross = q * Number(effectivePrice);
        const p = Number(r.discountPercent) || 0;
        const discAmt = p > 0 ? Number(((gross * p) / 100).toFixed(2)) : 0;
        return {
          ...r,
          unitPrice: effectivePrice,
          discountAmount: discAmt,
        };
      })
    );
  };

  // Item Selection Handler
  const handleItemSelect = (idx: number, itId: string) => {
    const item = items.find((i) => i.id === itId);
    if (!item) return;

    const partyPrice = partyId
      ? getPartyItemPrice(partyId, item.id, selectedParty?.name, item.name)
      : null;
    const effectiveUnitPrice = partyPrice !== null ? partyPrice : item.retailPrice;

    const updated = [...rows];
    const q = Number(updated[idx].quantity) || 1;
    const gross = q * effectiveUnitPrice;
    const p = Number(updated[idx].discountPercent) || 0;
    const discAmt = p > 0 ? Number(((gross * p) / 100).toFixed(2)) : 0;

    updated[idx] = {
      ...updated[idx],
      itemId: item.id,
      hsnCode: item.hsnCode || "1001",
      quantity: q,
      unit: item.unit || "PCS",
      unitPrice: effectiveUnitPrice,
      discountAmount: discAmt,
      taxRate: item.taxRate,
    };
    setRows(updated);
  };

  // Row Field Change Handler
  const handleRowChange = (idx: number, field: keyof QuotationItemRow, val: any) => {
    const updated = [...rows];
    updated[idx] = { ...updated[idx], [field]: val };

    if (field === "quantity" || field === "unitPrice") {
      const q = Number(field === "quantity" ? val : updated[idx].quantity) || 0;
      const rate = Number(field === "unitPrice" ? val : updated[idx].unitPrice) || 0;
      const gross = q * rate;
      const p = Number(updated[idx].discountPercent) || 0;
      if (p > 0) {
        updated[idx].discountAmount = Number(((gross * p) / 100).toFixed(2));
      }
    }

    setRows(updated);
  };

  // Compound Discount Handlers
  const handleDiscountPercentChange = (idx: number, val: number | "") => {
    const updated = [...rows];
    const q = Number(updated[idx].quantity) || 0;
    const rate = Number(updated[idx].unitPrice) || 0;
    const gross = q * rate;
    const p = val === "" ? "" : Number(val);
    const amt = p === "" ? "" : Number(((gross * (p as number)) / 100).toFixed(2));
    updated[idx].discountPercent = p;
    updated[idx].discountAmount = amt;
    setRows(updated);
  };

  const handleDiscountAmountChange = (idx: number, val: number | "") => {
    const updated = [...rows];
    const q = Number(updated[idx].quantity) || 0;
    const rate = Number(updated[idx].unitPrice) || 0;
    const gross = q * rate;
    const amt = val === "" ? "" : Number(val);
    const p = amt === "" || gross === 0 ? "" : Number((((amt as number) / gross) * 100).toFixed(2));
    updated[idx].discountAmount = amt;
    updated[idx].discountPercent = p;
    setRows(updated);
  };

  // Add Blank Row
  const handleAddRow = () => {
    const firstItem = items[0];
    const partyPrice =
      partyId && firstItem?.id
        ? getPartyItemPrice(partyId, firstItem.id, selectedParty?.name, firstItem.name)
        : null;
    const effectiveUnitPrice = partyPrice !== null ? partyPrice : (firstItem?.retailPrice || 100);

    setRows([
      ...rows,
      {
        itemId: firstItem?.id || "",
        hsnCode: firstItem?.hsnCode || "1001",
        description: "",
        quantity: 1,
        unit: firstItem?.unit || "PCS",
        unitPrice: effectiveUnitPrice,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: firstItem?.taxRate ?? quickSettings.defaultTaxRate ?? 18,
      },
    ]);
  };

  // Remove Row
  const handleRemoveRow = (idx: number) => {
    setRows(rows.filter((_, i) => i !== idx));
  };

  // Additional Charges Handlers
  const handleAddChargeRow = () => {
    setAdditionalCharges([
      ...additionalCharges,
      {
        id: `charge_${Date.now()}`,
        name: "Shipping Charges",
        amount: 50,
        taxRate: 18,
      },
    ]);
  };

  const handleUpdateCharge = (id: string, field: keyof AdditionalChargeItem, value: any) => {
    setAdditionalCharges(
      additionalCharges.map((chg) => (chg.id === id ? { ...chg, [field]: value } : chg))
    );
  };

  const handleRemoveCharge = (id: string) => {
    setAdditionalCharges(additionalCharges.filter((chg) => chg.id !== id));
  };

  // Validity chips helper
  const setValidityDays = (days: number) => {
    const d = new Date(quotationDate || todayStr);
    d.setDate(d.getDate() + days);
    setDueDate(d.toISOString().split("T")[0]);
    setShowDueDate(true);
  };

  // Tax and Total Calculations
  const isInterState = placeOfSupply !== (currentCompany?.stateCode || "24");

  const {
    itemsSubtotal,
    totalDiscountAmt,
    totalTaxable,
    totalCgst,
    totalSgst,
    totalIgst,
    totalTax,
    totalQty,
    roundOff,
    grandTotal,
    totalAdditionalCharges,
  } = useMemo(() => {
    let subTotal = 0;
    let totalDiscount = 0;
    let taxable = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let qtyCount = 0;

    // Line items calculation
    rows.forEach((r) => {
      const q = Number(r.quantity) || 0;
      const rate = Number(r.unitPrice) || 0;
      const disc = Number(r.discountPercent) || 0;
      const taxR = Number(r.taxRate) || 0;

      const lineGross = q * rate;
      const lineDisc = (lineGross * disc) / 100;
      const netTaxable = lineGross - lineDisc;

      subTotal += lineGross;
      totalDiscount += lineDisc;
      taxable += netTaxable;
      qtyCount += q;

      if (isInterState) {
        igst += (netTaxable * taxR) / 100;
      } else {
        cgst += (netTaxable * taxR) / 200;
        sgst += (netTaxable * taxR) / 200;
      }
    });

    // Additional charges
    let chargesTotal = 0;
    additionalCharges.forEach((chg) => {
      const amt = Number(chg.amount) || 0;
      chargesTotal += amt;
      const tr = Number(chg.taxRate) || 0;
      if (isInterState) {
        igst += (amt * tr) / 100;
      } else {
        cgst += (amt * tr) / 200;
        sgst += (amt * tr) / 200;
      }
    });

    // Overall discount
    const overallDiscAmt = Number(overallDiscountAmount) || 0;
    const finalTaxable = Math.max(0, taxable + chargesTotal - overallDiscAmt);

    const taxTotal = isInterState ? igst : cgst + sgst;
    const rawGrandTotal = finalTaxable + taxTotal;
    const rounded = isAutoRoundOff ? Math.round(rawGrandTotal) : rawGrandTotal;
    const roundOffVal = rounded - rawGrandTotal;

    return {
      itemsSubtotal: subTotal,
      totalDiscountAmt: totalDiscount + overallDiscAmt,
      totalTaxable: finalTaxable,
      totalCgst: cgst,
      totalSgst: sgst,
      totalIgst: igst,
      totalTax: taxTotal,
      totalQty: qtyCount,
      roundOff: roundOffVal,
      grandTotal: rounded,
      totalAdditionalCharges: chargesTotal,
    };
  }, [
    rows,
    additionalCharges,
    overallDiscountAmount,
    isAutoRoundOff,
    isInterState,
  ]);

  // Save Quotation Handler
  const handleSave = async (convertImmediately = false, saveAndNew = false) => {
    if (!partyId) {
      setError(lang === "gu" ? "કૃપા કરીને ગ્રાહક પસંદ કરો." : "Please select a customer / party.");
      return;
    }

    const validRows = rows.filter((r) => r.itemId && Number(r.quantity) > 0);
    if (validRows.length === 0) {
      setError(
        lang === "gu"
          ? "કૃપા કરીને ઓછામાં ઓછી ૧ વસ્તુ અને જથ્થો ઉમેરો."
          : "Please add at least one line item with valid quantity."
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        category: "PROFORMA_INVOICE",
        partyId,
        invoiceDate: quotationDate,
        dueDate: showDueDate ? dueDate : undefined,
        placeOfSupply,
        paymentMode: "UNPAID_CREDIT",
        notes: notes || undefined,
        termsAndConditions: termsAndConditions || undefined,
        invoiceNumber: quotationNumber.trim() || undefined,
        poNumber: poNumber.trim() || undefined,
        poDate: poDate || undefined,
        shippingAddress: shippingAddress.trim() || undefined,
        signatureData: signatureData || undefined,
        isDraft: true,
        items: validRows.map((r) => ({
          itemId: r.itemId,
          hsnCode: r.hsnCode || "1001",
          description: r.description?.trim() || undefined,
          quantity: Number(r.quantity),
          unit: r.unit || "PCS",
          unitPrice: Number(r.unitPrice) || 0,
          discountPercent: Number(r.discountPercent) || 0,
          taxRate: Number(r.taxRate) || 0,
        })),
      };

      const res: any = await apiClient.post("/invoices/sales", payload);
      setIsConfettiActive(true);

      if (convertImmediately && res?.id) {
        // Immediate conversion to Tax Invoice
        await apiClient.post(
          `/invoices/sales/${res.id}/issue`,
          { allowNegativeStock: true },
          undefined,
          `issue_qtn_auto_${Date.now()}`
        );
        setToastMessage(
          lang === "gu"
            ? "કવોટેશન સાચવવામાં આવ્યું અને સફળતાપૂર્વક પાકા ટેક્સ ઇનવોઇસમાં રૂપાંતરિત થયું!"
            : "Quotation created and successfully converted to Tax Invoice!"
        );
        setTimeout(() => {
          router.push(`/sales/invoices/${res.id}`);
        }, 1500);
      } else if (saveAndNew) {
        setToastMessage("Quotation saved! Starting a new quotation...");
        // Reset rows & party
        setRows([]);
        setPartyId("");
        const yr = new Date().getFullYear().toString().slice(-2);
        const nextYr = (Number(yr) + 1).toString();
        const randSeq = Math.floor(1000 + Math.random() * 9000);
        setQuotationNumber(`QTN-${yr}-${nextYr}-${randSeq}`);
      } else {
        setToastMessage(
          lang === "gu"
            ? "કવોટેશન સફળતાપૂર્વક સાચવવામાં આવ્યું!"
            : "Quotation saved successfully!"
        );
        setTimeout(() => {
          router.push("/sales/quotations");
        }, 1200);
      }
    } catch (err: any) {
      setError(
        err.statusCode === 409
          ? lang === "gu"
            ? "આ નંબર સાથેનું કવોટેશન પહેલેથી હાજર છે."
            : "Quotation with this number already exists. Please choose another number."
          : err.message || "Failed to save quotation."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Customer Creation
  const handleCreateCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyFormData.name.trim()) return;

    setIsCreatingParty(true);
    try {
      const res: any = await apiClient.post("/parties", {
        name: partyFormData.name.trim(),
        phone: partyFormData.phone.trim() || undefined,
        gstin: partyFormData.gstin.trim() || undefined,
        type: "CUSTOMER",
        stateCode: partyFormData.stateCode || "24",
        billingAddress: {
          addressLine1: partyFormData.billingLine1,
          city: partyFormData.billingCity,
          state: partyFormData.billingState,
          pincode: partyFormData.billingPincode,
          country: "India",
        },
      });

      const newParty: PartyOption = {
        id: res.id,
        name: res.name || partyFormData.name.trim(),
        phone: res.phone || partyFormData.phone.trim(),
        gstin: res.gstin || partyFormData.gstin.trim(),
        stateCode: res.stateCode || partyFormData.stateCode,
        address: partyFormData.billingLine1,
        outstandingBalance: 0,
      };

      setParties((prev) => [newParty, ...prev]);
      setPartyId(newParty.id);
      setIsCreatePartyModalOpen(false);
      setPartyFormData({
        name: "",
        phone: "",
        gstin: "",
        billingLine1: "",
        billingCity: "Ahmedabad",
        billingState: "Gujarat",
        billingPincode: "380001",
        stateCode: currentCompany?.stateCode || "24",
      });
      setToastMessage("Customer created and selected!");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to create customer.");
    } finally {
      setIsCreatingParty(false);
    }
  };

  // Quick Settings Save Handler
  const handleSaveQuickSettings = (newSettings: QuickSettingsConfig) => {
    setQuickSettings(newSettings);
    if (typeof window !== "undefined") {
      localStorage.setItem("billing_quick_settings", JSON.stringify(newSettings));
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-24 text-slate-800">
      {/* Confetti Animation Canvas */}
      <ConfettiCanvas
        active={isConfettiActive}
        onComplete={() => setIsConfettiActive(false)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in text-xs font-semibold">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOP NAVBAR (Exact myBillBook Header)                                      */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-2xs px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Exit + Title */}
        <div className="flex items-center gap-3">
          <Link
            href="/sales/quotations"
            className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Exit to Quotations Register"
          >
            <span>←</span>
            <span>Exit</span>
          </Link>
          <div className="h-5 w-px bg-slate-200" />
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Create Quotation / Estimate
          </h1>
        </div>

        {/* Center: Mode Toggles (Edit Mode vs Preview Mode) */}
        <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
              mode === "edit"
                ? "bg-white text-[#4F46E5] shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            ✏️ Edit Mode
          </button>
          <button
            type="button"
            onClick={() => setIsPreviewModalOpen(true)}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
              mode === "preview"
                ? "bg-white text-[#4F46E5] shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            👁️ Preview Mode
          </button>
        </div>

        {/* Right: Settings, Save & New, Save, Shortcuts */}
        <div className="flex items-center gap-2">
          {/* Quick Settings Gear */}
          <button
            type="button"
            onClick={() => {
              setQuickSettingsTab("items");
              setIsQuickSettingsOpen(true);
            }}
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors cursor-pointer"
            title="Quotation Settings"
          >
            ⚙️
          </button>

          {/* Save & New */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSave(false, true)}
            className="hidden sm:inline-flex items-center px-4 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold shadow-2xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Save and create another quotation"
          >
            Save & New
          </button>

          {/* Primary Save Quotation Button */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSave(false, false)}
            className="px-6 py-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            {isSubmitting ? (
              <span className="animate-spin text-sm">⏳</span>
            ) : (
              <span>✓</span>
            )}
            <span>Save</span>
          </button>

          {/* Keyboard Shortcuts Icon */}
          <button
            type="button"
            onClick={() => setIsShortcutsOpen(true)}
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors cursor-pointer"
            title="Keyboard Shortcuts"
          >
            ⌨️
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN CONTAINER (FULL SCREEN WIDE)                                         */}
      {/* ========================================================================= */}
      <main className="w-full px-4 sm:px-6 py-4 space-y-4">
        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center justify-between shadow-2xs animate-shake">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-rose-700 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ROW 1: 2-PANEL CARDS (BILL TO | INVOICE DETAILS) - EXACT MYBILLBOOK       */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* CARD 1: BILL TO */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 flex flex-col justify-between min-h-[160px]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 tracking-wider">Bill To</span>
              <div className="flex items-center gap-1.5">
                {selectedParty && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setPartyFormData({
                          name: selectedParty.name,
                          phone: selectedParty.phone || "",
                          gstin: selectedParty.gstin || "",
                          billingLine1: selectedParty.address || "",
                          billingCity: "Ahmedabad",
                          billingState: "Gujarat",
                          billingPincode: "380001",
                          stateCode: selectedParty.stateCode || "24",
                        });
                        setIsCreatePartyModalOpen(true);
                      }}
                      className="text-[11px] font-bold text-slate-600 hover:text-slate-900 px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer"
                    >
                      ✏️ Edit Party
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPartyDropdownOpen(true);
                        setPartySearchTerm("");
                      }}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 px-2 py-0.5 rounded border border-blue-200 bg-blue-50/50 hover:bg-blue-50 cursor-pointer"
                    >
                      🔄 Change Party
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setQuickSettingsTab("party");
                    setIsQuickSettingsOpen(true);
                  }}
                  className="text-slate-400 hover:text-slate-700 text-xs p-1"
                  title="Party Settings"
                >
                  ⚙️
                </button>
              </div>
            </div>

            {/* Bill To Body */}
            {!selectedParty ? (
              <div className="py-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsPartyDropdownOpen(true);
                    setPartySearchTerm("");
                  }}
                  className="w-full py-5 border-2 border-dashed border-blue-400 bg-blue-50/30 hover:bg-blue-50/70 transition-colors rounded-xl flex items-center justify-center cursor-pointer shadow-2xs group"
                >
                  <span className="text-blue-600 font-bold text-xs flex items-center gap-1.5 group-hover:scale-105 transition-transform">
                    <span className="text-base font-black">+</span>
                    <span>Add Party</span>
                  </span>
                </button>
              </div>
            ) : (
              <div className="py-2 space-y-1">
                <p className="text-sm font-extrabold text-slate-900">{selectedParty.name}</p>
                <p className="text-xs text-slate-600">
                  <span className="text-slate-400 font-medium">Phone Number: </span>
                  <span className="font-semibold text-slate-800">{selectedParty.phone || "—"}</span>
                </p>
                {selectedParty.gstin && (
                  <p className="text-xs text-slate-600 font-mono">
                    <span className="text-slate-400 font-medium">GSTIN: </span>
                    <span>{selectedParty.gstin}</span>
                  </p>
                )}
                {selectedParty.address && (
                  <p className="text-xs text-slate-500 truncate" title={selectedParty.address}>
                    {selectedParty.address}
                  </p>
                )}
              </div>
            )}

            {/* Bill To Footer */}
            {selectedParty && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Balance:</span>
                <span
                  className={`font-mono font-bold ${
                    (selectedParty.outstandingBalance ?? 0) > 0
                      ? "text-rose-600"
                      : (selectedParty.outstandingBalance ?? 0) < 0
                      ? "text-emerald-600"
                      : "text-slate-500"
                  }`}
                >
                  {formatInr(selectedParty.outstandingBalance ?? 0)}
                  {(selectedParty.outstandingBalance ?? 0) > 0 ? " ↑" : (selectedParty.outstandingBalance ?? 0) < 0 ? " ↓" : ""}
                </span>
              </div>
            )}
          </div>

          {/* CARD 2: INVOICE DETAILS */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 flex flex-col justify-between min-h-[160px] space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 tracking-wider">Invoice Details</span>
              <button
                type="button"
                onClick={() => {
                  setQuickSettingsTab("invoice");
                  setIsQuickSettingsOpen(true);
                }}
                className="text-slate-400 hover:text-slate-700 text-xs p-1"
                title="Invoice Settings"
              >
                ⚙️
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Quotation No.
                </label>
                <input
                  type="text"
                  value={quotationNumber}
                  onChange={(e) => setQuotationNumber(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Quotation Date
                </label>
                <input
                  type="date"
                  value={quotationDate}
                  onChange={(e) => setQuotationDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Due Date / Validity section */}
            {!showDueDate ? (
              <button
                type="button"
                onClick={() => {
                  setShowDueDate(true);
                  const d = new Date(quotationDate || todayStr);
                  d.setDate(d.getDate() + 15);
                  setDueDate(d.toISOString().split("T")[0]);
                }}
                className="w-full py-2.5 border-2 border-dashed border-blue-400 bg-blue-50/30 hover:bg-blue-50/70 transition-colors rounded-xl flex items-center justify-center cursor-pointer text-blue-600 font-bold text-xs shadow-2xs"
              >
                <span>+ Add Due Date</span>
              </button>
            ) : (
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <label className="font-bold text-slate-700">Due Date / Valid Till</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setValidityDays(7)}
                      className="px-1.5 py-0.5 bg-slate-200/70 hover:bg-slate-200 rounded text-[9px] font-bold text-slate-700 cursor-pointer"
                    >
                      +7D
                    </button>
                    <button
                      type="button"
                      onClick={() => setValidityDays(15)}
                      className="px-1.5 py-0.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-[9px] font-bold cursor-pointer"
                    >
                      +15D
                    </button>
                    <button
                      type="button"
                      onClick={() => setValidityDays(30)}
                      className="px-1.5 py-0.5 bg-slate-200/70 hover:bg-slate-200 rounded text-[9px] font-bold text-slate-700 cursor-pointer"
                    >
                      +30D
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDueDate(false)}
                      className="text-slate-400 hover:text-rose-600 font-bold ml-1"
                      title="Remove Due Date"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-lg font-mono text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROW 2: ITEMS TABLE (EXACT MYBILLBOOK DESIGN)                             */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#FAFBFD] border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3 text-center w-12">NO</th>
                  <th className="py-3 px-3">ITEMS</th>
                  <th className="py-3 px-3 text-center w-28">HSN</th>
                  <th className="py-3 px-3 text-right w-28">QTY</th>
                  <th className="py-3 px-3 text-right w-36">PRICE/ITEM (₹)</th>
                  <th className="py-3 px-3 text-right w-32">DISCOUNT</th>
                  <th className="py-3 px-3 text-right w-28">TAX</th>
                  <th className="py-3 px-3 text-right w-36">AMOUNT (₹)</th>
                  <th className="py-3 px-2 text-center w-12">
                    <button
                      type="button"
                      onClick={() => {
                        setQuickSettingsTab("items");
                        setIsQuickSettingsOpen(true);
                      }}
                      className="text-slate-400 hover:text-slate-700 text-xs"
                      title="Item Table Settings"
                    >
                      ⚙️
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  /* Empty state card matching myBillBook with big dashed "+ Add Item" */
                  <tr>
                    <td colSpan={9} className="p-6">
                      <button
                        type="button"
                        onClick={() => setIsAddItemsModalOpen(true)}
                        className="w-full py-7 border-2 border-dashed border-blue-400 bg-blue-50/30 hover:bg-blue-50/70 transition-colors rounded-xl text-xs font-bold text-blue-600 flex items-center justify-center gap-2 cursor-pointer shadow-2xs group"
                      >
                        <span className="text-xl font-black group-hover:scale-125 transition-transform">+</span>
                        <span className="text-sm font-bold">Add Item to Quotation</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => {
                    const q = Number(row.quantity) || 0;
                    const rate = Number(row.unitPrice) || 0;
                    const disc = Number(row.discountPercent) || 0;
                    const gross = q * rate;
                    const netTaxable = gross - (gross * disc) / 100;
                    const taxRate = Number(row.taxRate) || 0;
                    const lineTaxAmount = (netTaxable * taxRate) / 100;
                    const lineTotal = netTaxable + lineTaxAmount;
                    const selectedItem = items.find((i) => i.id === row.itemId);

                    return (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        {/* NO */}
                        <td className="py-3 px-3 text-center text-slate-500 font-mono font-bold">
                          {idx + 1}
                        </td>

                        {/* ITEMS: TITLE + OPTIONAL DESCRIPTION */}
                        <td className="py-3 px-3">
                          {row.itemId && selectedItem ? (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900 text-xs">
                                  {selectedItem.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...rows];
                                    updated[idx].itemId = "";
                                    setRows(updated);
                                  }}
                                  className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                                >
                                  Change
                                </button>
                              </div>
                              <input
                                type="text"
                                placeholder="Enter Description (optional)"
                                value={row.description || ""}
                                onChange={(e) => handleRowChange(idx, "description", e.target.value)}
                                className="w-full text-[11px] p-1.5 bg-slate-50 border border-slate-200 rounded text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-none"
                              />
                            </div>
                          ) : (
                            <select
                              value={row.itemId}
                              onChange={(e) => handleItemSelect(idx, e.target.value)}
                              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-900 focus:bg-white focus:outline-none"
                            >
                              <option value="">-- Select Item --</option>
                              {items.map((it) => (
                                <option key={it.id} value={it.id}>
                                  {it.name} (Stock: {it.stockQuantity ?? 0})
                                </option>
                              ))}
                            </select>
                          )}
                        </td>

                        {/* HSN CODE WITH SEARCH ICON */}
                        <td className="py-3 px-3">
                          <div className="relative">
                            <input
                              type="text"
                              value={row.hsnCode}
                              onChange={(e) => handleRowChange(idx, "hsnCode", e.target.value)}
                              className="w-full text-xs p-1.5 pl-6 bg-slate-50 border border-slate-200 rounded-md text-center font-mono text-slate-800 focus:bg-white focus:outline-none"
                            />
                            <span className="absolute left-1.5 top-2 text-[10px] text-slate-400 pointer-events-none">
                              🔍
                            </span>
                          </div>
                        </td>

                        {/* QTY + UNIT BADGE */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                            <input
                              type="number"
                              min="0.001"
                              step="any"
                              value={row.quantity}
                              onChange={(e) => handleRowChange(idx, "quantity", e.target.value)}
                              className="w-full text-xs text-right font-mono font-bold text-slate-900 bg-transparent focus:outline-none"
                            />
                            <span className="text-[11px] font-bold text-slate-500 uppercase">
                              {row.unit || "PCS"}
                            </span>
                          </div>
                        </td>

                        {/* PRICE/ITEM WITH PARTY RATE BADGE */}
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={row.unitPrice}
                            onChange={(e) => handleRowChange(idx, "unitPrice", e.target.value)}
                            className="w-full text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-right font-mono font-bold text-slate-900 focus:bg-white focus:outline-none"
                          />
                          {partyId && row.itemId && getPartyItemPrice(partyId, row.itemId, selectedParty?.name) !== null && (
                            <div className="flex justify-end mt-1">
                              <span
                                title={`Party specific price active for ${selectedParty?.name || "this customer"}`}
                                className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-1 py-0.5 rounded shadow-2xs"
                              >
                                <span>🏷️</span>
                                <span>Party Rate</span>
                              </span>
                            </div>
                          )}
                        </td>

                        {/* STACKED DISCOUNT (₹ AND %) */}
                        <td className="py-3 px-3">
                          <div className="space-y-1 w-28 ml-auto">
                            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">
                              <span className="text-[10px] font-bold text-slate-400">₹</span>
                              <input
                                type="number"
                                min="0"
                                value={row.discountAmount ?? ""}
                                onChange={(e) =>
                                  handleDiscountAmountChange(
                                    idx,
                                    e.target.value === "" ? "" : Number(e.target.value)
                                  )
                                }
                                placeholder="0"
                                className="w-full text-xs text-right font-mono bg-transparent focus:outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">
                              <span className="text-[10px] font-bold text-slate-400">%</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={row.discountPercent ?? ""}
                                onChange={(e) =>
                                  handleDiscountPercentChange(
                                    idx,
                                    e.target.value === "" ? "" : Number(e.target.value)
                                  )
                                }
                                placeholder="0"
                                className="w-full text-xs text-right font-mono bg-transparent focus:outline-none"
                              />
                            </div>
                          </div>
                        </td>

                        {/* TAX DROPDOWN + CALCULATED TAX AMOUNT */}
                        <td className="py-3 px-3">
                          <select
                            value={row.taxRate}
                            onChange={(e) => handleRowChange(idx, "taxRate", Number(e.target.value))}
                            className="w-full text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-right font-mono text-slate-700 focus:bg-white focus:outline-none"
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 text-right">
                            ({formatInr(lineTaxAmount)})
                          </div>
                        </td>

                        {/* AMOUNT (₹) */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 text-xs">
                          {formatInr(lineTotal)}
                        </td>

                        {/* REMOVE BUTTON */}
                        <td className="py-3 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer p-1"
                            title="Remove item"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Action Strip: Add Items / Add Blank Row / Scan Barcode */}
          <div className="p-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsAddItemsModalOpen(true)}
              className="flex-1 py-2.5 bg-blue-50/70 border-2 border-dashed border-blue-400 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-100/70 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs group"
            >
              <span className="text-base font-black group-hover:scale-125 transition-transform">+</span>
              <span>Add Item</span>
            </button>
            <button
              type="button"
              onClick={handleAddRow}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer"
              title="Add a blank row"
            >
              <span>+ Add Blank Row</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddItemsModalOpen(true)}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer"
            >
              <span>📷</span>
              <span>Scan Barcode</span>
            </button>
          </div>

          {/* Subtotal Strip */}
          <div className="bg-[#F8F9FA] border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 font-medium">
            <span className="font-bold text-slate-900 uppercase">Subtotal</span>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-mono text-slate-700">
              <span>Total Qty: <strong>{totalQty}</strong></span>
              <span>Discount: <strong>{formatInr(totalDiscountAmt)}</strong></span>
              <span>Tax: <strong>{formatInr(totalTax)}</strong></span>
              <span className="font-bold text-slate-900 text-sm">
                {formatInr(itemsSubtotal)}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROW 3: BOTTOM SECTION (NOTES/TERMS & TOTALS)                             */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-2">
          
          {/* Left Column (7 cols): Notes, Terms & Conditions, Bank Account, QR */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Add Notes */}
            {!showNotes ? (
              <button
                type="button"
                onClick={() => setShowNotes(true)}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <span>📝</span>
                <span>+ Add Notes</span>
              </button>
            ) : (
              <div className="space-y-1 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Notes / Remarks</label>
                  <button
                    type="button"
                    onClick={() => setShowNotes(false)}
                    className="text-slate-400 hover:text-slate-600 text-[10px]"
                  >
                    Hide
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter notes or remarks for customer..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>
            )}

            {/* Terms & Conditions Box with Reset Icon */}
            <div className="space-y-1.5 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Terms & Conditions</span>
                <button
                  type="button"
                  onClick={() =>
                    setTermsAndConditions(
                      "1. Goods once sold will not be taken back or exchanged\n2. All disputes are subject to [ENTER_YOUR_CITY_NAME] jurisdiction only"
                    )
                  }
                  title="Reset to default terms"
                  className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer"
                >
                  ⊗
                </button>
              </div>
              <textarea
                rows={3}
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                placeholder="Terms and conditions for this quotation..."
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none font-sans"
              />
            </div>

            {/* Add Bank Account & Payment QR Links */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                type="button"
                onClick={() => setShowBankAccount(!showBankAccount)}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <span>🏛️</span>
                <span>{showBankAccount ? "Hide Bank Account" : "+ Add Bank Account"}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPaymentQr(!showPaymentQr)}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <span>📱</span>
                <span>{showPaymentQr ? "Hide Payment QR" : "+ Add Payment QR"}</span>
              </button>
            </div>

            {showBankAccount && (
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1 shadow-2xs">
                <p className="font-bold text-slate-900">Bank Details Included on Quotation:</p>
                <p>Bank: <strong>HDFC Bank</strong> • A/c: <strong>50200012345678</strong></p>
                <p>IFSC: <strong>HDFC0000123</strong> • Branch: Ahmedabad Main</p>
              </div>
            )}

            {showPaymentQr && (
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1 shadow-2xs">
                <p className="font-bold text-slate-900">UPI Payment QR Enabled:</p>
                <p>Dynamic UPI QR code will be printed on quotation for quick advance payment.</p>
              </div>
            )}
          </div>

          {/* Right Column (5 cols): Additional Charges, Tax, Discounts, Totals & Signature */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-3.5">
            
            {/* Additional Charges */}
            <div className="space-y-2 text-xs">
              {additionalCharges.map((chg) => (
                <div key={chg.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Enter charge name"
                    value={chg.name}
                    onChange={(e) => handleUpdateCharge(chg.id, "name", e.target.value)}
                    className="flex-1 text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
                  />
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 w-24">
                    <span className="text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={chg.amount}
                      onChange={(e) =>
                        handleUpdateCharge(chg.id, "amount", Number(e.target.value) || 0)
                      }
                      className="w-full text-xs text-right bg-transparent font-mono font-bold focus:outline-none"
                    />
                  </div>
                  <select
                    value={chg.taxRate}
                    onChange={(e) =>
                      handleUpdateCharge(chg.id, "taxRate", Number(e.target.value) || 0)
                    }
                    className="text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:bg-white focus:outline-none"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveCharge(chg.id)}
                    className="text-slate-400 hover:text-rose-600 text-sm p-1"
                  >
                    ⨂
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddChargeRow}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <span>₹</span>
                <span>
                  {additionalCharges.length === 0
                    ? "+ Add Additional Charges"
                    : "+ Add Another Charge"}
                </span>
              </button>
            </div>

            {/* Taxable Amount */}
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium pt-1">
              <span>Taxable Amount</span>
              <span className="font-mono font-bold text-slate-900">{formatInr(totalTaxable)}</span>
            </div>

            {/* Tax Breakdown */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
              {isInterState ? (
                <div className="flex items-center justify-between text-slate-600">
                  <span>Integrated GST (IGST)</span>
                  <span className="font-mono font-bold text-slate-900">{formatInr(totalIgst)}</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Central GST (CGST)</span>
                    <span className="font-mono font-bold text-slate-900">{formatInr(totalCgst)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>State GST (SGST)</span>
                    <span className="font-mono font-bold text-slate-900">{formatInr(totalSgst)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Add Discount */}
            {!showOverallDiscount ? (
              <button
                type="button"
                onClick={() => setShowOverallDiscount(true)}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1.5 cursor-pointer pt-1"
              >
                <span>%</span>
                <span>+ Add Discount</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 pt-1 text-xs">
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 w-20">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={overallDiscountPercent}
                    onChange={(e) => {
                      const p = Number(e.target.value) || 0;
                      setOverallDiscountPercent(p);
                      const calcAmt = (itemsSubtotal * p) / 100;
                      setOverallDiscountAmount(Number(calcAmt.toFixed(2)));
                    }}
                    className="w-full text-xs text-right bg-transparent font-mono focus:outline-none"
                  />
                  <span className="text-slate-500 font-bold">%</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 flex-1">
                  <span className="text-slate-500 font-bold">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={overallDiscountAmount}
                    onChange={(e) => {
                      const amt = Number(e.target.value) || 0;
                      setOverallDiscountAmount(amt);
                      if (itemsSubtotal > 0) {
                        setOverallDiscountPercent(
                          Number(((amt / itemsSubtotal) * 100).toFixed(2))
                        );
                      }
                    }}
                    className="w-full text-xs text-right bg-transparent font-mono font-bold focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowOverallDiscount(false);
                    setOverallDiscountPercent(0);
                    setOverallDiscountAmount(0);
                  }}
                  className="text-slate-400 hover:text-rose-600 text-sm p-1"
                >
                  ⨂
                </button>
              </div>
            )}

            {/* Auto Round Off */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={isAutoRoundOff}
                  onChange={(e) => setIsAutoRoundOff(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                />
                <span>Auto Round Off</span>
              </label>
              <span className="font-mono text-slate-600 font-bold">
                {roundOff >= 0 ? `+${formatInr(roundOff)}` : formatInr(roundOff)}
              </span>
            </div>

            {/* Total Amount Display */}
            <div className="pt-3 border-t-2 border-slate-200 flex items-center justify-between">
              <span className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Total Amount:
              </span>
              <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {formatInr(grandTotal)}
              </span>
            </div>

            {/* Balance Amount Indicator (Bright Green matching myBillBook) */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="font-bold text-slate-700">Balance Amount:</span>
              <span className="font-mono font-black text-base text-[#16A34A]">
                {formatInr(grandTotal)}
              </span>
            </div>

            {/* Signature Box */}
            <div className="pt-2">
              {signatureData ? (
                <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Authorized Signature
                    </span>
                    <img src={signatureData} alt="Signature" className="h-12 object-contain" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsSignatureModalOpen(true)}
                      className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignatureData(null)}
                      className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setIsSignatureModalOpen(true)}
                  className="w-full h-20 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50 hover:bg-slate-50 flex flex-col items-center justify-center text-xs text-slate-500 cursor-pointer transition-colors shadow-2xs"
                >
                  <span className="font-bold text-blue-600 flex items-center gap-1.5">
                    <span>✍️</span>
                    <span>+ Add Signature</span>
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    Click to draw, upload or type signature
                  </span>
                </div>
              )}
            </div>


          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* POPUP MODALS                                                              */}
      {/* ========================================================================= */}

      {/* Party Selection Modal / Dropdown */}
      {isPartyDropdownOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div
            ref={partyDropdownRef}
            className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Select Party / Customer</h3>
                <p className="text-[11px] text-slate-500">Choose a party for this quotation</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPartyDropdownOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1"
              >
                ✕
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-slate-100">
              <input
                type="text"
                autoFocus
                value={partySearchTerm}
                onChange={(e) => setPartySearchTerm(e.target.value)}
                placeholder="Search party by name, phone or GSTIN..."
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* List Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <span>Party Name</span>
              <span>Balance</span>
            </div>

            {/* Parties Scrollable List */}
            <div className="overflow-y-auto divide-y divide-slate-100 flex-1 max-h-80">
              {filteredParties.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No party found matching &quot;{partySearchTerm}&quot;
                </div>
              ) : (
                filteredParties.map((p) => {
                  const bal = p.outstandingBalance ?? 0;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handlePartyChange(p.id)}
                      className="flex items-center justify-between px-4 py-3 hover:bg-blue-50/60 cursor-pointer transition-colors text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{p.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {p.phone || p.gstin || "Cash Customer"}
                        </p>
                      </div>
                      <div className="text-right font-mono font-bold">
                        {bal > 0 ? (
                          <span className="text-rose-600 flex items-center gap-1 justify-end">
                            <span>{formatInr(bal)}</span>
                            <span>↑</span>
                          </span>
                        ) : bal < 0 ? (
                          <span className="text-emerald-600 flex items-center gap-1 justify-end">
                            <span>{formatInr(Math.abs(bal))}</span>
                            <span>↓</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">₹ 0</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer: + Create Party */}
            <div className="p-3 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setIsPartyDropdownOpen(false);
                  setIsCreatePartyModalOpen(true);
                }}
                className="w-full py-2.5 border-2 border-dashed border-blue-400 bg-white hover:bg-blue-50/50 rounded-xl text-xs font-bold text-blue-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span className="text-base font-bold">+</span>
                <span>Create New Party</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Catalog AddItemsModal (with Party Rate support) */}
      <AddItemsModal
        isOpen={isAddItemsModalOpen}
        onClose={() => setIsAddItemsModalOpen(false)}
        items={items.map((it) => {
          const partyPrice = partyId
            ? getPartyItemPrice(partyId, it.id, selectedParty?.name, it.name)
            : null;
          return {
            id: it.id,
            name: it.name,
            hsnCode: it.hsnCode,
            taxRate: it.taxRate,
            retailPrice: partyPrice !== null ? partyPrice : it.retailPrice,
            baseRetailPrice: it.retailPrice,
            isPartyRate: partyPrice !== null,
            stockQuantity: it.stockQuantity ?? 50,
            unit: it.unit || "PCS",
          };
        })}
        onAddSelectedItems={(selected) => {
          const isFirstEmpty =
            rows.length === 0 ||
            (rows.length === 1 &&
              !rows[0].itemId &&
              (!rows[0].quantity || rows[0].quantity === 1));

          const newRows: QuotationItemRow[] = selected.map((s) => {
            const partyPrice = partyId
              ? getPartyItemPrice(partyId, s.item.id, selectedParty?.name, s.item.name)
              : null;
            return {
              itemId: s.item.id,
              hsnCode: s.item.hsnCode || "1001",
              description: "",
              quantity: s.quantity,
              unit: s.item.unit || "PCS",
              unitPrice: partyPrice !== null ? partyPrice : s.unitPrice,
              discountPercent: 0,
              discountAmount: 0,
              taxRate: s.item.taxRate ?? 18,
            };
          });

          if (isFirstEmpty) {
            setRows(newRows);
          } else {
            setRows((prev) => [...prev, ...newRows]);
          }
        }}
        onCreateNewItem={() => {
          setIsAddItemsModalOpen(false);
          handleAddRow();
        }}
      />

      {/* Live Preview Modal */}
      <InvoiceLivePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        customization={customization}
        lang={lang}
        invoiceData={{
          category: "PROFORMA_INVOICE",
          invoiceNumber: quotationNumber,
          invoiceDate: quotationDate,
          paymentMode: "ESTIMATE",
          placeOfSupply: placeOfSupply ? `State Code (${placeOfSupply})` : "Gujarat (24)",
          partyName: selectedParty?.name || "Cash Customer / Prospect",
          partyGstin: selectedParty?.gstin,
          partyPhone: selectedParty?.phone,
          partyAddress: selectedParty?.address,
          companyName: currentCompany?.tradeName || currentCompany?.legalName || "MyBill History",
          companyGstin: currentCompany?.gstin || "24AAAAA0000A1Z5",
          companyState: currentCompany?.stateCode ? `Gujarat (${currentCompany.stateCode})` : "Gujarat (24)",
          notes,
          termsAndConditions,
          items: rows.map((r) => {
            const it = items.find((i) => i.id === r.itemId);
            return {
              name: it?.name || "Product / Service",
              hsnCode: r.hsnCode,
              quantity: Number(r.quantity) || 1,
              unitPrice: Number(r.unitPrice) || 0,
              discountPercent: Number(r.discountPercent) || 0,
              taxRate: r.taxRate,
            };
          }),
          totalTaxable,
          totalCgst,
          totalSgst,
          totalIgst,
          roundOff,
          roundedGrandTotal: grandTotal,
          isTaxInclusive: false,
          isInterState,
        }}
      />

      {/* Quick Settings Modal */}
      <QuickSettingsModal
        isOpen={isQuickSettingsOpen}
        onClose={() => setIsQuickSettingsOpen(false)}
        settings={quickSettings}
        initialTab={quickSettingsTab}
        onSave={handleSaveQuickSettings}
      />

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Signature Modal */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSaveSignature={(sig) => setSignatureData(sig)}
        existingSignature={signatureData}
      />

      {/* Create Customer Modal */}
      {isCreatePartyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                Create New Customer / Party
              </h3>
              <button
                type="button"
                onClick={() => setIsCreatePartyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomerSubmit} className="space-y-3 pt-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Customer / Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={partyFormData.name}
                  onChange={(e) => setPartyFormData({ ...partyFormData, name: e.target.value })}
                  placeholder="e.g. Ramesh Trading Co."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mobile No.</label>
                  <input
                    type="tel"
                    value={partyFormData.phone}
                    onChange={(e) => setPartyFormData({ ...partyFormData, phone: e.target.value })}
                    placeholder="98XXXXXXXX"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={partyFormData.gstin}
                    onChange={(e) => setPartyFormData({ ...partyFormData, gstin: e.target.value.toUpperCase() })}
                    placeholder="24AAAAA0000A1Z5"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={partyFormData.billingLine1}
                  onChange={(e) => setPartyFormData({ ...partyFormData, billingLine1: e.target.value })}
                  placeholder="Shop / Office address..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreatePartyModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingParty || !partyFormData.name.trim()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingParty ? "Saving..." : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
