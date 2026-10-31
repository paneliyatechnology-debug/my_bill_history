"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { apiClient, extractList } from "@/lib/api-client";
import { useActiveInvoiceTheme } from "@/lib/use-active-invoice-theme";
import { DynamicThemedInvoice } from "@/components/invoice/dynamic-themed-invoice";
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
import {
  DocumentHeaderCard,
  DocumentInfoStrip,
  DocumentItemsCard,
  DocumentNotesAndTermsCard,
  DocumentAdditionalInfoCard,
  DocumentSummaryCard,
  DocumentBottomBar,
  PartySelectorCompact,
} from "@/components/document-studio";
import { INDIAN_STATES } from "@/shared-types";

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
  const { state: activeInvoiceTheme } = useActiveInvoiceTheme(currentCompany?.id);

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
    const [activeNotesTab, setActiveNotesTab] = useState<"notes" | "terms">("notes");
  const [transportMode, setTransportMode] = useState("Road");
  const [vehicleNo, setVehicleNo] = useState("");
  const [ewayBillNo, setEwayBillNo] = useState("");
  const [dispatchDate, setDispatchDate] = useState("");
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
    <div className="min-h-screen bg-[#F6F8F7] pb-24 text-slate-800">
      {/* Confetti Animation Canvas */}
      <ConfettiCanvas
        active={isConfettiActive}
        onComplete={() => setIsConfettiActive(false)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#174B43] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in text-xs font-semibold border border-[#85D5C2]/40">
          <span className="w-4 h-4 rounded-full bg-emerald-400 text-[#174B43] flex items-center justify-center text-[10px] font-black">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =========================================================================
          TOP BAR: Compact Forest Teal Signature Enterprise Toolbar (Full-Width)
          ========================================================================= */}
      {/* Top header replaced by unified DocumentHeaderCard */}

      {/* =========================================================================
          MAIN APPLICATION CANVAS
          ========================================================================= */}
      <main className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-800 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-500 hover:text-rose-800 font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* =======================================================================
            VIEW MODE: PREVIEW MODE (A4 Document Sheet)
            ======================================================================= */}
        {mode === "preview" ? (
          <div className="space-y-4 animate-fadeIn">
            {/* Preview Top Control Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMode("edit")}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>← {lang === "gu" ? "એડિટ મોડ પર પાછા જાઓ" : "Back to Edit Mode"}</span>
                </button>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>{lang === "gu" ? "ક્વોટેશન પ્રિવ્યૂ" : "Quotation Preview"}</span>
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
                  <span>🖨️ {lang === "gu" ? "પ્રિન્ટ" : "Print Quotation"}</span>
                </button>
              </div>
            </div>

            {/* Themed Document using DynamicThemedInvoice */}
            <div className="bg-slate-100/70 p-4 sm:p-8 rounded-2xl border border-slate-200 overflow-x-auto flex justify-center">
              <DynamicThemedInvoice
                invoice={{
                  category: "QUOTATION",
                  invoiceNumber: quotationNumber || "QT-001",
                  invoiceDate: quotationDate,
                  dueDate: dueDate,
                  paymentMode: "QUOTATION",
                  placeOfSupply: placeOfSupply ? `State Code (${placeOfSupply})` : "Gujarat (24)",
                  taxableAmount: totalTaxable,
                  cgstAmount: totalTax > 0 ? totalTax / 2 : 0,
                  sgstAmount: totalTax > 0 ? totalTax / 2 : 0,
                  igstAmount: 0,
                  roundOff: roundOff,
                  grandTotal: grandTotal,
                  paidAmount: 0,
                  balanceAmount: grandTotal,
                  notes: notes,
                  party: {
                    name: selectedParty?.name || "Cash Customer / Prospect",
                    gstin: selectedParty?.gstin,
                    phone: selectedParty?.phone,
                    billingAddress: selectedParty?.address,
                  },
                  items: rows.map((r, idx) => {
                    const selIt = items.find((i) => i.id === r.itemId);
                    const q = Number(r.quantity) || 0;
                    const rate = Number(r.unitPrice) || 0;
                    const disc = Number(r.discountPercent) || 0;
                    const gross = q * rate;
                    const discVal = (gross * disc) / 100;
                    const taxable = Math.max(0, gross - discVal);
                    const taxRate = Number(r.taxRate) || 0;
                    const taxAmt = (taxable * taxRate) / 100;
                    return {
                      id: r.itemId || `row-${idx}`,
                      description: selIt?.name || "Product / Item",
                      hsnCode: r.hsnCode,
                      quantity: q,
                      unit: r.unit || "PCS",
                      unitPrice: rate,
                      discountPercent: disc,
                      taxRate: taxRate,
                      taxableAmount: taxable,
                      cgstAmount: taxAmt / 2,
                      sgstAmount: taxAmt / 2,
                      igstAmount: 0,
                      totalAmount: taxable + taxAmt,
                      item: { name: selIt?.name },
                    };
                  }),
                }}
                settings={{
                  ...activeInvoiceTheme,
                  termsAndConditions: {
                    ...activeInvoiceTheme.termsAndConditions,
                    sales: termsAndConditions || activeInvoiceTheme.termsAndConditions?.quotation || activeInvoiceTheme.termsAndConditions?.sales,
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
                printableId="printable-quotation"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* DOCUMENT HEADER CARD */}
            <DocumentHeaderCard
              title={lang === "gu" ? "ક્વોટેશન / એસ્ટીમેટ બનાવો" : "Create Quotation / Estimate"}
              subtitle={lang === "gu" ? "તમારું ક્વોટેશન બનાવો અને મેનેજ કરો" : "Create and manage your quotation or estimate"}
              status="Draft"
              onPreview={() => setMode("preview")}
              onPrint={() => window.print()}
              onSave={() => handleSave(false, false)}
              onSaveAsDraft={() => handleSave(true, false)}
              isSaving={isSubmitting}
              saveButtonLabel="Save Quotation"
              moreMenuItems={[
                { label: "Quick Settings", onClick: () => { setQuickSettingsTab("items"); setIsQuickSettingsOpen(true); } },
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
                      searchTerm={partySearchTerm}
                      onSearchChange={setPartySearchTerm}
                      isOpen={isPartyDropdownOpen}
                      onOpenChange={setIsPartyDropdownOpen}
                      filteredParties={filteredParties}
                      onSelectParty={(id) => {
                        setPartyId(id);
                        const p = parties.find((party) => party.id === id);
                        if (p?.stateCode) setPlaceOfSupply(p.stateCode);
                      }}
                      onClearParty={() => {
                        setPartyId("");
                        setPartySearchTerm("");
                      }}
                      onAddNew={() => setIsCreatePartyModalOpen(true)}
                      placeholder="Search customer..."
                    />
                  ),
                },
                {
                  id: "quotationNumber",
                  label: "Quotation No.",
                  type: "text",
                  value: quotationNumber,
                  onChange: setQuotationNumber,
                  placeholder: "EST-001",
                },
                {
                  id: "quotationDate",
                  label: "Quotation Date",
                  type: "date",
                  value: quotationDate,
                  onChange: setQuotationDate,
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
                  totalQty={totalQty}
                  itemsTotal={itemsSubtotal}
                  onScanItem={() => setIsAddItemsModalOpen(true)}
                  onImportItems={() => setIsAddItemsModalOpen(true)}
                  onAddItem={() => setIsAddItemsModalOpen(true)}
                  onAddBlankRow={handleAddRow}
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
                          const netTaxable = gross - (gross * disc) / 100;
                          const taxRate = Number(row.taxRate) || 0;
                          const lineTaxAmount = (netTaxable * taxRate) / 100;
                          const lineTotal = netTaxable + lineTaxAmount;
                          const selectedItem = items.find((i) => i.id === row.itemId);

                          return (
                            <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                                {idx + 1}
                              </td>

                              <td className="py-3 px-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <select
                                      value={row.itemId}
                                      onChange={(e) => handleItemSelect(idx, e.target.value)}
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
                                  onChange={(e) => handleRowChange(idx, "hsnCode", e.target.value)}
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
                                    onChange={(e) => handleRowChange(idx, "quantity", e.target.value)}
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
                                  onChange={(e) => handleRowChange(idx, "unitPrice", e.target.value)}
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
                                    onChange={(e) => handleRowChange(idx, "discountPercent", e.target.value)}
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
                                    onChange={(e) => handleRowChange(idx, "taxRate", Number(e.target.value) || 0)}
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
                                    onClick={() => handleRemoveRow(idx)}
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
                    terms={termsAndConditions}
                    onTermsChange={setTermsAndConditions}
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

              {/* Right Column (4 cols): Summary Card */}
              <div className="lg:col-span-4 space-y-5">
                <DocumentSummaryCard
                  title="Quotation Summary"
                  subtotal={itemsSubtotal}
                  discount={Number(overallDiscountAmount) > 0 ? Number(overallDiscountAmount) : undefined}
                  cgst={!isInterState ? totalCgst : undefined}
                  sgst={!isInterState ? totalSgst : undefined}
                  igst={isInterState ? totalIgst : undefined}
                  roundOff={roundOff}
                  grandTotal={grandTotal}
                />
              </div>
            </div>

            {/* STICKY BOTTOM ACTION BAR */}
            <DocumentBottomBar
              totalItems={rows.length}
              totalAmount={grandTotal}
              onSaveAsDraft={() => handleSave(true, false)}
              onSave={() => handleSave(false, false)}
              isSaving={isSubmitting}
              saveButtonLabel="Save Quotation"
              backHref="/sales/quotations"
            />
          </div>

        )}
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
        companyId={currentCompany?.id}
        settings={activeInvoiceTheme}
        invoiceData={{
          category: "QUOTATION",
          invoiceNumber: quotationNumber,
          invoiceDate: quotationDate,
          paymentMode: "ESTIMATE",
          placeOfSupply: placeOfSupply ? `State Code (${placeOfSupply})` : "Gujarat (24)",
          partyName: selectedParty?.name || "Cash Customer / Prospect",
          partyGstin: selectedParty?.gstin,
          partyPhone: selectedParty?.phone,
          partyAddress: selectedParty?.address,
          companyName: currentCompany?.tradeName || currentCompany?.legalName || "myownbillbook",
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
