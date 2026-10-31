"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../context/auth-context";
import { apiClient, extractList } from "../../../../lib/api-client";
import { InvoiceLivePreviewModal } from "@/components/invoice/invoice-live-preview-modal";
import { ConfettiCanvas } from "@/components/invoice/confetti-canvas";
import { AddItemsModal, CatalogItem } from "@/components/invoice/add-items-modal";
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
  getActiveThemePreset,
} from "@/lib/invoice-theme";
import { getPartyItemPrice } from "../../../../lib/party-item-pricing";

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
  hsnCode: string;
  taxRate: number;
  retailPrice: number;
  stockQuantity?: number;
}

interface InvoiceItemRow {
  rowId?: string;
  itemId: string;
  hsnCode: string;
  quantity: number | "";
  unit?: string;
  unitPrice: number | "";
  discountPercent: number | "";
  taxRate: number;
}

interface AdditionalChargeItem {
  id: string;
  name: string;
  amount: number | "";
  taxRate: number;
}

interface SplitPaymentRow {
  mode: string;
  amount: number | "";
  reference?: string;
}

function numberToWordsINR(amount: number): string {
  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ",
    "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen ",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(num: number): string {
    if ((num = num.toString().length > 9 ? parseFloat(num.toString().substring(0, 9)) : num) === 0) return "";
    const n = ("000000000" + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return "";
    let str = "";
    str += Number(n[1]) !== 0 ? (a[Number(n[1])] || b[Number(n[1][0])] + " " + a[Number(n[1][1])]) + "Crore " : "";
    str += Number(n[2]) !== 0 ? (a[Number(n[2])] || b[Number(n[2][0])] + " " + a[Number(n[2][1])]) + "Lakh " : "";
    str += Number(n[3]) !== 0 ? (a[Number(n[3])] || b[Number(n[3][0])] + " " + a[Number(n[3][1])]) + "Thousand " : "";
    str += Number(n[4]) !== 0 ? (a[Number(n[4])] || b[Number(n[4][0])] + " " + a[Number(n[4][1])]) + "Hundred " : "";
    str += Number(n[5]) !== 0 ? ((str !== "") ? "and " : "") + (a[Number(n[5])] || b[Number(n[5][0])] + " " + a[Number(n[5][1])]) : "";
    return str.trim();
  }

  const whole = Math.floor(amount);
  const paise = Math.round((amount - whole) * 100);
  let res = whole === 0 ? "Zero Rupees" : inWords(whole) + " Rupees";
  if (paise > 0) {
    res += " and " + inWords(paise) + " Paise";
  }
  return res + " Only";
}

export default function NewInvoicePage() {
  const router = useRouter();
  const { lang, tenantContext, currentCompany } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [parties, setParties] = useState<PartyOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View Mode: Edit Mode vs Preview Mode (Exact myBillBook Header Switcher)
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");

  // Left AI Panel State (Drawer)
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(true);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [scanProgressText, setScanProgressText] = useState("");
  const [scanSuccessBanner, setScanSuccessBanner] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [isConfettiActive, setIsConfettiActive] = useState(false);
  const [scanDurationSeconds, setScanDurationSeconds] = useState<string>("0.0");
  const [scannedSummaryTime, setScannedSummaryTime] = useState<string | null>(null);
  const [isAddItemsModalOpen, setIsAddItemsModalOpen] = useState(false);
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [quickSettings, setQuickSettings] = useState<QuickSettingsConfig>(DEFAULT_QUICK_SETTINGS);
  const [quickSettingsTab, setQuickSettingsTab] = useState<"invoice" | "party" | "items">("invoice");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dynamic fields configured via Quick Settings
  const [poNumber, setPoNumber] = useState("");
  const [poDate, setPoDate] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [ewayBillNumber, setEwayBillNumber] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [contactPersonName, setContactPersonName] = useState("");
  const [contactPersonPhone, setContactPersonPhone] = useState("");
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  const [isPartyNewlyScanned, setIsPartyNewlyScanned] = useState(false);
  const [newlyScannedItemIndices, setNewlyScannedItemIndices] = useState<number[]>([]);
  const todayDateStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Form Fields matching MyBillBook
  const [category, setCategory] = useState<
    "TAX_INVOICE" | "PROFORMA_INVOICE" | "BILL_OF_SUPPLY" | "DELIVERY_CHALLAN"
  >("TAX_INVOICE");
  const [partyId, setPartyId] = useState("");
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const [partySearchTerm, setPartySearchTerm] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("2");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const isInvoiceDateChanged = invoiceDate !== todayDateStr;
  const [repeatInvoice, setRepeatInvoice] = useState(false);

  // Due Date & Payment Terms
  const [showDueDate, setShowDueDate] = useState(false);
  const [paymentTermsDays, setPaymentTermsDays] = useState(30);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });

  const [placeOfSupply, setPlaceOfSupply] = useState(
    currentCompany?.stateCode || "24"
  );
  const [isTaxInclusive, setIsTaxInclusive] = useState(false);

  // Bottom Add-ons
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState(
    "1. Goods once sold will not be taken back or exchanged\n2. All disputes are subject to [ENTER_YOUR_CITY_NAME] jurisdiction only"
  );
  const [showBankAccount, setShowBankAccount] = useState(false);
  const [showPaymentQr, setShowPaymentQr] = useState(false);

  // Additional Charges matching MyBillBook exact inline row
  const [additionalCharges, setAdditionalCharges] = useState<AdditionalChargeItem[]>([]);
  const [showAdditionalCharges, setShowAdditionalCharges] = useState(false);

  // Overall Discount matching MyBillBook exact inline row
  const [showOverallDiscount, setShowOverallDiscount] = useState(false);
  const [discountTiming, setDiscountTiming] = useState<"AFTER_TAX" | "BEFORE_TAX">("AFTER_TAX");
  const [overallDiscountPercent, setOverallDiscountPercent] = useState<number | "">("");
  const [overallDiscountAmount, setOverallDiscountAmount] = useState<number | "">("");

  const [autoRoundOff, setAutoRoundOff] = useState(true);

  // Payments
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [amountReceived, setAmountReceived] = useState<number | "">(0);
  const [isFullyPaid, setIsFullyPaid] = useState(false);

  // Split Payment Modal State
  const [isSplitPaymentOpen, setIsSplitPaymentOpen] = useState(false);
  const [splitRows, setSplitRows] = useState<SplitPaymentRow[]>([
    { mode: "CASH", amount: 0 },
    { mode: "BANK_TRANSFER", amount: 0 },
    { mode: "UPI_QR", amount: 0 },
  ]);

  // Barcode scanner modal simulation
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Create Party Modal State
  const [isCreatePartyModalOpen, setIsCreatePartyModalOpen] = useState(false);
  const [partyModalTab, setPartyModalTab] = useState<
    "basic" | "address" | "credit" | "contact" | "bank" | "custom"
  >("basic");
  const [partyFormData, setPartyFormData] = useState({
    type: "CUSTOMER" as "CUSTOMER" | "SUPPLIER",
    category: "",
    name: "",
    phone: "",
    gstin: "",
    panNumber: "",
    email: "",
    openingBalance: 0,
    balanceType: "TO_COLLECT" as "TO_COLLECT" | "TO_PAY",
    billingLine1: "",
    billingCity: "Ahmedabad",
    billingState: "Gujarat",
    billingPincode: "380001",
    creditLimit: 0,
    creditDays: 30,
    contactPersonName: "",
    contactPersonPhone: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
  });
  const [isCreatingParty, setIsCreatingParty] = useState(false);

  // Theme & Customization State
  const [customization, setCustomization] = useState<InvoiceCustomization>(
    DEFAULT_INVOICE_CUSTOMIZATION
  );
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  useEffect(() => {
    setCustomization(loadInvoiceCustomization());
  }, []);

  function incrementSequenceNumber(seq: string): string {
    if (!seq) return "0001";
    const num = parseInt(seq, 10);
    if (isNaN(num)) return seq;
    const next = num + 1;
    const len = seq.length;
    return String(next).padStart(len, "0");
  }

  // Load Quick Settings from localStorage dynamically on mount
  useEffect(() => {
    const companyKey = tenantContext?.companyId || "default";
    const storageKey = `billing_quick_settings_${companyKey}`;
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          const merged: QuickSettingsConfig = { ...DEFAULT_QUICK_SETTINGS, ...parsed };
          setQuickSettings(merged);

          // Apply prefix and sequence dynamically
          if (merged.enablePrefix && merged.invoicePrefix) {
            setInvoiceNumber(`${merged.invoicePrefix}${merged.invoiceSequence || "0001"}`);
          } else if (merged.invoiceSequence) {
            setInvoiceNumber(merged.invoiceSequence);
          }

          if (typeof merged.enableDueDate === "boolean") {
            setShowDueDate(merged.enableDueDate);
          }
          if (typeof merged.isTaxInclusive === "boolean") {
            setIsTaxInclusive(merged.isTaxInclusive);
          }
        } else {
          if (DEFAULT_QUICK_SETTINGS.enablePrefix && DEFAULT_QUICK_SETTINGS.invoicePrefix) {
            setInvoiceNumber(`${DEFAULT_QUICK_SETTINGS.invoicePrefix}${DEFAULT_QUICK_SETTINGS.invoiceSequence}`);
          }
        }
      }
    } catch (e) {
      console.error("Error loading quick settings:", e);
    }
  }, [tenantContext?.companyId]);

  // Toast auto-dismiss effect
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleSaveQuickSettings = (newSettings: QuickSettingsConfig) => {
    setQuickSettings(newSettings);
    const companyKey = tenantContext?.companyId || "default";
    const storageKey = `billing_quick_settings_${companyKey}`;
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, JSON.stringify(newSettings));
      }
    } catch (e) {
      console.error("Error saving quick settings to localStorage:", e);
    }

    // Apply prefix and sequence
    if (newSettings.enablePrefix && newSettings.invoicePrefix) {
      setInvoiceNumber(`${newSettings.invoicePrefix}${newSettings.invoiceSequence || "0001"}`);
    } else if (newSettings.invoiceSequence) {
      setInvoiceNumber(newSettings.invoiceSequence);
    }

    // Apply Due Date toggle
    setShowDueDate(newSettings.enableDueDate);

    // Apply Tax Inclusive toggle
    setIsTaxInclusive(newSettings.isTaxInclusive);

    setToastMessage("Settings saved and applied successfully!");
  };

  const [rows, setRows] = useState<InvoiceItemRow[]>([]);
  const [scannedBillsCount, setScannedBillsCount] = useState<number>(0);
  const remainingScans = Math.max(0, 50 - scannedBillsCount);
  const timeSavedMinutes = Math.round(scannedBillsCount * 5);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [partiesRes, itemsRes, unitsRes]: any = await Promise.all([
        apiClient.get("/masters/parties", { type: "CUSTOMER" }),
        apiClient.get("/masters/items"),
        apiClient.get("/masters/units").catch(() => []),
      ]);
      const pList = extractList<PartyOption>(partiesRes);
      const iList = extractList<ItemOption>(itemsRes);
      const uList = extractList<any>(unitsRes);
      setParties(pList);
      setItems(iList);
      setUnits(uList);

      // Keep form BLANK by default (Exact MyBillBook standard - do not auto-select party or items)
      // Check if duplicating an existing invoice from dashboard
      if (typeof window !== "undefined") {
        const cloneRaw = localStorage.getItem("billing_clone_invoice");
        if (cloneRaw) {
          try {
            const cloneData = JSON.parse(cloneRaw);
            localStorage.removeItem("billing_clone_invoice");
            if (cloneData.partyId || cloneData.party?.id) {
              setPartyId(cloneData.partyId || cloneData.party?.id);
            }
            if (cloneData.party?.stateCode || cloneData.placeOfSupply) {
              setPlaceOfSupply(cloneData.party?.stateCode || cloneData.placeOfSupply);
            }
            if (Array.isArray(cloneData.items) && cloneData.items.length > 0) {
              const clonedRows: InvoiceItemRow[] = cloneData.items.map((it: any) => ({
                itemId: it.itemId || it.item?.id || "",
                quantity: Number(it.quantity) || 1,
                unit: it.unit || it.item?.baseUnit || "PCS",
                unitPrice: Number(it.unitPrice) || 0,
                discountPercent: Number(it.discountPercent) || 0,
                taxRate: Number(it.taxRate) || 0,
                hsnCode: it.hsnCode || it.item?.hsnCode || "1001",
              }));
              setRows(clonedRows);
            }
            if (cloneData.notes) {
              setNotes(cloneData.notes);
              setShowNotes(true);
            }
            if (cloneData.termsAndConditions) {
              setTermsAndConditions(cloneData.termsAndConditions);
            }
            if (cloneData.poNumber) setPoNumber(cloneData.poNumber);
            if (cloneData.poDate) setPoDate(cloneData.poDate.split("T")[0]);
            if (cloneData.vehicleNumber) setVehicleNumber(cloneData.vehicleNumber);
            if (cloneData.ewayBillNumber) setEwayBillNumber(cloneData.ewayBillNumber);
            if (cloneData.shippingAddress) setShippingAddress(cloneData.shippingAddress);
            setToastMessage("Cloned invoice loaded. You can modify and save as a new invoice.");
          } catch (e) {
            console.error("Failed to parse cloned invoice:", e);
          }
        }
      }

      // Load AI scan count dynamically
      try {
        const scansRes: any = await apiClient.get("/purchases/scans", { limit: 100 }).catch(() => null);
        const totalScans = scansRes?.total ?? scansRes?.data?.length;
        if (typeof totalScans === "number") {
          setScannedBillsCount(totalScans);
          if (typeof window !== "undefined" && tenantContext.companyId) {
            localStorage.setItem(`billing_ai_scans_count_${tenantContext.companyId}`, String(totalScans));
          }
        } else if (typeof window !== "undefined" && tenantContext.companyId) {
          const saved = localStorage.getItem(`billing_ai_scans_count_${tenantContext.companyId}`);
          if (saved) setScannedBillsCount(Number(saved) || 0);
        }
      } catch {
        if (typeof window !== "undefined" && tenantContext.companyId) {
          const saved = localStorage.getItem(`billing_ai_scans_count_${tenantContext.companyId}`);
          if (saved) setScannedBillsCount(Number(saved) || 0);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load customers and catalog.");
    } finally {
      setIsLoading(false);
    }
  }, [tenantContext.companyId]);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchData();
    }
  }, [tenantContext.companyId, fetchData]);

  const selectedParty = parties.find((p) => p.id === partyId);

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

  const handlePartyChange = (id: string) => {
    setPartyId(id);
    setIsPartyDropdownOpen(false);
    setPartySearchTerm("");
    const selected = parties.find((p) => p.id === id);
    if (selected?.stateCode) {
      setPlaceOfSupply(selected.stateCode);
    }

    // Automatically recalculate item prices in existing rows according to the selected party's prices
    setRows((prevRows) =>
      prevRows.map((r) => {
        if (!r.itemId) return r;
        const it = items.find((i) => i.id === r.itemId);
        const partyPrice = getPartyItemPrice(id, r.itemId, selected?.name, it?.name);
        if (partyPrice !== null) {
          return { ...r, unitPrice: partyPrice };
        } else if (it) {
          return { ...r, unitPrice: it.retailPrice };
        }
        return r;
      })
    );
  };

  const handleItemSelect = (idx: number, itId: string) => {
    const item = items.find((i) => i.id === itId);
    if (!item) return;

    const partyPrice = partyId
      ? getPartyItemPrice(partyId, item.id, selectedParty?.name, item.name)
      : null;
    const effectiveUnitPrice = partyPrice !== null ? partyPrice : item.retailPrice;

    const updated = [...rows];
    updated[idx] = {
      ...updated[idx],
      itemId: item.id,
      hsnCode: item.hsnCode || "1001",
      unitPrice: effectiveUnitPrice,
      taxRate: item.taxRate,
    };
    setRows(updated);
  };

  const handleRowChange = (
    idx: number,
    field: keyof InvoiceItemRow,
    val: any
  ) => {
    const updated = [...rows];
    updated[idx] = { ...updated[idx], [field]: val };
    setRows(updated);
  };

  const handleAddRow = (specificItemId?: string) => {
    const firstItem = specificItemId ? items.find((it) => it.id === specificItemId) : items[0];
    const partyPrice =
      partyId && firstItem?.id
        ? getPartyItemPrice(partyId, firstItem.id, selectedParty?.name, firstItem.name)
        : null;
    const effectiveUnitPrice = partyPrice !== null ? partyPrice : (firstItem?.retailPrice || 100);

    setRows((prev) => [
      ...prev,
      {
        rowId: `row-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        itemId: firstItem?.id || "",
        hsnCode: firstItem?.hsnCode || "1001",
        quantity: 1,
        unit: "PCS",
        unitPrice: effectiveUnitPrice,
        discountPercent: 0,
        taxRate: firstItem?.taxRate ?? quickSettings.defaultTaxRate ?? 5,
      },
    ]);
  };

  const handleAddBlankRow = () => {
    setRows((prev) => [
      ...prev,
      {
        rowId: `row-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        itemId: items[0]?.id || "",
        hsnCode: items[0]?.hsnCode || "1001",
        quantity: 1,
        unit: "PCS",
        unitPrice: 0,
        discountPercent: 0,
        taxRate: quickSettings.defaultTaxRate ?? 5,
      },
    ]);
  };

  const handleRemoveRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  // Additional Charges Handlers
  const handleAddChargeRow = () => {
    setAdditionalCharges((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: "",
        amount: 0,
        taxRate: 0,
      },
    ]);
    setShowAdditionalCharges(true);
  };

  const handleUpdateCharge = (
    id: string,
    field: keyof AdditionalChargeItem,
    val: any
  ) => {
    setAdditionalCharges((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: val } : c))
    );
  };

  const handleRemoveCharge = (id: string) => {
    setAdditionalCharges((prev) => prev.filter((c) => c.id !== id));
  };

  // Statutory GST tax calculations
  const companyState = currentCompany?.stateCode || "24";
  const isInterState = placeOfSupply !== companyState;

  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalQty = 0;
  let totalDiscountAmt = 0;

  rows.forEach((r) => {
    const qty = Number(r.quantity) || 0;
    const rate = Number(r.unitPrice) || 0;
    const disc = Number(r.discountPercent) || 0;
    totalQty += qty;

    const gross = qty * rate;
    const discAmt = (gross * disc) / 100;
    totalDiscountAmt += discAmt;
    const grossAfterDisc = gross - discAmt;

    let taxable = grossAfterDisc;
    let taxAmount = 0;
    if (isTaxInclusive) {
      taxable = grossAfterDisc / (1 + r.taxRate / 100);
      taxAmount = grossAfterDisc - taxable;
    } else {
      taxable = grossAfterDisc;
      taxAmount = (taxable * r.taxRate) / 100;
    }

    totalTaxable += taxable;

    if (isInterState) {
      totalIgst += taxAmount;
    } else {
      totalCgst += taxAmount / 2;
      totalSgst += taxAmount / 2;
    }
  });

  // Calculate Additional Charges + Taxes
  let totalAdditionalCharges = 0;
  let additionalChargesTax = 0;
  additionalCharges.forEach((c) => {
    const amt = Number(c.amount) || 0;
    totalAdditionalCharges += amt;
    if (c.taxRate > 0) {
      additionalChargesTax += (amt * c.taxRate) / 100;
    }
  });

  const totalTax = totalCgst + totalSgst + totalIgst + additionalChargesTax;
  const itemsSubtotal = totalTaxable + totalTax;

  // Calculate Overall Discount
  const discValue = Number(overallDiscountAmount) || 0;

  const netBeforeRound =
    itemsSubtotal +
    totalAdditionalCharges -
    discValue;

  const roundedGrandTotal = autoRoundOff
    ? Math.round(netBeforeRound)
    : Number(netBeforeRound.toFixed(2));
  const roundOff = autoRoundOff ? roundedGrandTotal - netBeforeRound : 0;

  const effectiveReceived = isFullyPaid
    ? roundedGrandTotal
    : Number(amountReceived || 0);
  const balanceAmount = Math.max(0, roundedGrandTotal - effectiveReceived);

  const formatInr = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const normalizeDateStr = (raw?: string | null): string => {
    if (!raw) return new Date().toISOString().split("T")[0];
    const clean = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
    const dmy = clean.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
    if (dmy) {
      return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
    }
    const ymd = clean.match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})$/);
    if (ymd) {
      return `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`;
    }
    const d = new Date(clean);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    return new Date().toISOString().split("T")[0];
  };

  const resolveOrCreateCustomer = async (
    target: { name?: string | null; gstin?: string | null; phone?: string | null; address?: string | null; stateCode?: string | null }
  ): Promise<PartyOption | null> => {
    const rawName = (target.name || "").trim();
    const rawGstin = (target.gstin || "").trim().toUpperCase();
    const rawPhone = (target.phone || "").trim().replace(/\D/g, "");

    // 1. Match in local state parties
    let matched = parties.find(
      (p) =>
        (rawGstin && p.gstin && p.gstin.trim().toUpperCase() === rawGstin) ||
        (rawPhone && rawPhone.length >= 10 && p.phone && p.phone.replace(/\D/g, "").endsWith(rawPhone.slice(-10))) ||
        (rawName && p.name.trim().toLowerCase() === rawName.toLowerCase()) ||
        (rawName && rawName.length > 4 && p.name.toLowerCase().includes(rawName.toLowerCase()))
    );
    if (matched) return matched;

    // 2. Query backend parties
    try {
      const searchRes: any = await apiClient.get("/masters/parties", {
        type: "CUSTOMER",
        search: rawGstin || rawName || rawPhone,
        limit: 5,
      });
      const searchList = extractList<PartyOption>(searchRes);
      matched = searchList.find(
        (p) =>
          (rawGstin && p.gstin && p.gstin.trim().toUpperCase() === rawGstin) ||
          (rawPhone && rawPhone.length >= 10 && p.phone && p.phone.replace(/\D/g, "").endsWith(rawPhone.slice(-10))) ||
          (rawName && p.name.trim().toLowerCase() === rawName.toLowerCase())
      );
      if (matched) {
        setParties((prev) => (prev.some((p) => p.id === matched!.id) ? prev : [matched!, ...prev]));
        return matched;
      }
    } catch (err) {
      console.warn("Party search warning:", err);
    }

    // 3. Auto-create customer if name provided
    if (rawName && rawName.length > 1) {
      try {
        const stateCode = target.stateCode || (rawGstin ? rawGstin.slice(0, 2) : "24");
        const res: any = await apiClient.post("/masters/parties", {
          type: "CUSTOMER",
          name: rawName,
          phone: rawPhone || undefined,
          gstin: rawGstin || undefined,
          stateCode,
          billingAddress: {
            line1: (target.address || "").trim(),
            city: "Ahmedabad",
            pincode: "380001",
          },
        });
        if (res?.id) {
          const newParty: PartyOption = {
            id: res.id,
            name: res.name || rawName,
            phone: res.phone || rawPhone,
            gstin: res.gstin || rawGstin,
            stateCode: res.stateCode || stateCode,
            address: target.address || "",
            type: "CUSTOMER",
          };
          setParties((prev) => [newParty, ...prev]);
          return newParty;
        }
      } catch (err: any) {
        console.warn("Auto-create customer note:", err);
      }
    }
    return null;
  };

  const resolveOrCreateItem = async (
    nameOrDesc?: string,
    hsn?: string,
    rate?: number,
    taxRate?: number,
    unitSymbol?: string
  ): Promise<ItemOption | null> => {
    const cleanName = (nameOrDesc || "").trim();
    if (!cleanName) return null;
    const lower = cleanName.toLowerCase();

    // 1. Check local state items
    let match = items.find(
      (i) =>
        i.name.toLowerCase() === lower ||
        (cleanName.length > 3 && i.name.toLowerCase().includes(lower)) ||
        (i.name.length > 3 && lower.includes(i.name.toLowerCase()))
    );
    if (match) return match;

    // 2. Query backend items
    try {
      const searchRes: any = await apiClient.get("/masters/items", { search: cleanName, limit: 5 });
      const searchList = extractList<ItemOption>(searchRes);
      match = searchList.find(
        (i) =>
          i.name.toLowerCase() === lower ||
          i.name.toLowerCase().includes(lower) ||
          lower.includes(i.name.toLowerCase())
      );
      if (match) {
        setItems((prev) => (prev.some((it) => it.id === match!.id) ? prev : [match!, ...prev]));
        return match;
      }
    } catch (err) {
      console.warn("Item search warning:", err);
    }

    // 3. Auto-create item in catalog
    try {
      let primaryUomId = units[0]?.id;
      if (!primaryUomId) {
        const uomRes: any = await apiClient.get("/masters/units").catch(() => []);
        const uomList = extractList<any>(uomRes);
        if (uomList.length > 0) {
          setUnits(uomList);
          primaryUomId = uomList[0].id;
        } else {
          const newUom: any = await apiClient.post("/masters/units", {
            name: "Pieces",
            symbol: "PCS",
            uqcCode: "PCS",
            decimalPlaces: 0,
          }).catch(() => null);
          if (newUom?.id) {
            setUnits([newUom]);
            primaryUomId = newUom.id;
          }
        }
      }

      const isService =
        (hsn && hsn.startsWith("99")) ||
        lower.includes("service") ||
        lower.includes("charge");

      const created: any = await apiClient.post("/masters/items", {
        type: isService ? "SERVICE" : "PRODUCT",
        name: cleanName,
        hsnCode: hsn?.trim() || (isService ? "9983" : "1001"),
        primaryUomId: primaryUomId || undefined,
        taxRate: Number(taxRate) || 0,
        purchaseRate: Number(rate) || 0,
        retailPrice: Number(rate) || 0,
      });

      if (created?.id) {
        const newItemOpt: ItemOption = {
          id: created.id,
          name: created.name,
          hsnCode: created.hsnCode,
          taxRate: created.taxRate,
          retailPrice: created.retailPrice,
          stockQuantity: created.stockQuantity ?? 0,
        };
        setItems((prev) => [newItemOpt, ...prev]);
        return newItemOpt;
      }
    } catch (createErr) {
      console.error("Auto-create item failed:", createErr);
    }
    return null;
  };

  const executeAiScan = async (fileToScan?: File) => {
    const file = fileToScan || uploadedFile;
    if (!file) return;

    setIsAiProcessing(true);
    setScanError(null);
    setScanSuccessBanner(null);
    setScanDurationSeconds("0.0");
    const scanStartTime = performance.now();

    const progressSteps = [
      lang === "gu" ? "દસ્તાવેજ વાંચી રહ્યું છે..." : "Reading document stream...",
      lang === "gu" ? "AI જેમિની વિઝન સ્કેન કરી રહ્યું છે..." : "AI Gemini Vision is analyzing invoice...",
      lang === "gu" ? "ગ્રાહક અને GSTIN શોધી રહ્યું છે..." : "Detecting Customer, GSTIN & Invoice #...",
      lang === "gu" ? "આઇટમ્સ, HSN અને ટેક્સ રેટ સ્કેન થાય છે..." : "Parsing items, HSN & tax rates...",
      lang === "gu" ? "ફોર્મમાં વિગતો ભરાઈ રહી છે..." : "Autofilling sales invoice form...",
    ];

    let stepTimer = 0;
    setScanProgressText(progressSteps[0]);
    const interval = setInterval(() => {
      stepTimer++;
      setScanProgressText(progressSteps[stepTimer % progressSteps.length]);
    }, 1200);

    const timerInterval = setInterval(() => {
      const elapsed = (performance.now() - scanStartTime) / 1000;
      setScanDurationSeconds(elapsed.toFixed(1));
    }, 100);

    try {
      const formData = new FormData();
      formData.append("file", file, file.name);

      const response: any = await apiClient.post(
        "/purchases/scans/upload?async=true",
        formData,
        undefined,
        undefined,
        { timeoutMs: 60000 }
      );

      let finalRecord = response;
      if (response?.status === "PROCESSING" || response?.status === "PENDING") {
        const pollStart = performance.now();
        while (finalRecord.status === "PROCESSING" || finalRecord.status === "PENDING") {
          if (performance.now() - pollStart > 90000) break;
          await new Promise((r) => setTimeout(r, 1200));
          try {
            finalRecord = await apiClient.get(`/purchases/scans/${response.id}`);
          } catch {
            break;
          }
        }
      }

      const ed = finalRecord?.extractedData;
      if (ed) {
        const inv = ed.invoice || {};
        const buyer = ed.buyer || {};
        const sup = ed.supplier || {};
        const itemsList = ed.items || [];
        const rawOcr = finalRecord?.rawOcrText || "";

        // 1. Invoice Number
        let detectedInvNo = inv.invoiceNumber || ed.invoiceNumber;
        if (!detectedInvNo || /^(?:screenshot|img_|file_)/i.test(detectedInvNo.trim())) {
          const payMatch = rawOcr.match(/pay_[A-Za-z0-9]+/i) ||
            rawOcr.match(/(?:Payment\s*Id|Payment\s*ID|Order\s*Id|Order\s*ID|Txn\s*Id|Transaction\s*Id|Ref\s*No|Reference\s*No)[\s:]+([A-Za-z0-9_-]+)/i);
          if (payMatch) {
            detectedInvNo = payMatch[1] || payMatch[0];
          } else {
            detectedInvNo = file.name.replace(/\.[^/.]+$/, "").substring(0, 16);
          }
        }
        if (detectedInvNo) {
          setInvoiceNumber(detectedInvNo);
        }

        // 2. Invoice Date & Due Date
        if (inv.invoiceDate || ed.invoiceDate) {
          setInvoiceDate(normalizeDateStr(inv.invoiceDate || ed.invoiceDate));
        }
        if (inv.dueDate || ed.dueDate) {
          setDueDate(normalizeDateStr(inv.dueDate || ed.dueDate));
          setShowDueDate(true);
        }

        // 3. Customer / Party Matching ("Bill To")
        const targetParty = (buyer.name || buyer.gstin) ? buyer : sup;
        const resolvedParty = await resolveOrCreateCustomer(targetParty);
        if (resolvedParty) {
          setPartyId(resolvedParty.id);
          if (resolvedParty.stateCode) {
            setPlaceOfSupply(resolvedParty.stateCode);
          }
        } else if (targetParty.stateCode) {
          setPlaceOfSupply(targetParty.stateCode);
        }

        // 4. Line Items Mapping
        if (itemsList.length > 0) {
          const mappedRows: InvoiceItemRow[] = [];
          for (const it of itemsList) {
            const desc = it.description || it.itemName || "Item";
            const hsn = it.hsnCode || "1001";
            const unitPrice = Number(it.unitPrice) || Number(it.rate) || 0;
            const taxRate = Number(it.taxRate ?? it.gstRate ?? 5);
            const qty = Number(it.quantity) || 1;
            const disc = Number(it.discountPercent ?? it.discountAmount ?? 0);

            const resolvedItem = await resolveOrCreateItem(desc, hsn, unitPrice, taxRate, it.unit);

            let chosenId = resolvedItem?.id;
            let chosenHsn = resolvedItem?.hsnCode || hsn;
            let chosenRate = unitPrice > 0 ? unitPrice : (resolvedItem?.retailPrice || 100);
            let chosenTax = resolvedItem?.taxRate !== undefined ? resolvedItem.taxRate : taxRate;

            if (!chosenId) {
              const fallbackItem: ItemOption = {
                id: `scanned_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                name: desc,
                hsnCode: chosenHsn,
                retailPrice: chosenRate,
                taxRate: chosenTax,
              };
              setItems((prev) => [fallbackItem, ...prev]);
              chosenId = fallbackItem.id;
            }

            mappedRows.push({
              itemId: chosenId,
              hsnCode: chosenHsn,
              quantity: qty,
              unitPrice: chosenRate,
              discountPercent: disc,
              taxRate: chosenTax,
            });
          }
          if (mappedRows.length > 0) {
            setRows(mappedRows);
            setNewlyScannedItemIndices(mappedRows.map((_, i) => i));
          }
        } else if (ed.financials?.grandTotal) {
          const gTot = Number(ed.financials.grandTotal);
          const resolvedItem = await resolveOrCreateItem("Commercial Sale / Item", "9983", gTot, 0, "PCS");
          setRows([
            {
              itemId: resolvedItem?.id || items[0]?.id || "",
              hsnCode: "9983",
              quantity: 1,
              unitPrice: gTot,
              discountPercent: 0,
              taxRate: 0,
            },
          ]);
          setNewlyScannedItemIndices([0]);
        }

        // 5. Auto Round Off
        if (ed.financials?.roundOff !== undefined && ed.financials?.roundOff !== null) {
          setAutoRoundOff(true);
        }

        const partyDisplayName = resolvedParty?.name || targetParty.name || "";
        const count = itemsList.length > 0 ? itemsList.length : 1;
        const finalSecs = ((performance.now() - scanStartTime) / 1000).toFixed(1);
        setScannedSummaryTime(finalSecs);
        setIsConfettiActive(true);
        setIsPartyNewlyScanned(true);

        // Dynamically increment scanned bills counter
        setScannedBillsCount((prev) => {
          const next = prev + 1;
          if (typeof window !== "undefined" && tenantContext.companyId) {
            localStorage.setItem(`billing_ai_scans_count_${tenantContext.companyId}`, String(next));
          }
          return next;
        });

        setScanSuccessBanner(
          lang === "gu"
            ? `🎉 સ્કેન સફળ (${finalSecs}s માં)! બિલ વિગતો ફોર્મમાં ભરાઈ ગઈ: ${partyDisplayName ? partyDisplayName + ", " : ""}બિલ #${detectedInvNo || ""}, ${count} આઇટમ્સ`
            : `🎉 Scanned in ${finalSecs}s! Form autofilled: ${partyDisplayName ? partyDisplayName + ", " : ""}Invoice #${detectedInvNo || ""}, ${count} item(s) extracted.`
        );
      } else {
        throw new Error(
          finalRecord?.errorMessage ||
            "AI could not extract structured fields from this document. Please verify the document is legible."
        );
      }
    } catch (err: any) {
      console.error("AI Scan failed:", err);
      setScanError(
        lang === "gu"
          ? `સ્કેન નિષ્ફળ: ${err.message || "દસ્તાવેજ વાંચવામાં ભૂલ આવી"}`
          : `Scan failed: ${err.message || "Failed to parse document"}`
      );
    } finally {
      clearInterval(interval);
      clearInterval(timerInterval);
      setIsAiProcessing(false);
      setScanProgressText("");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      executeAiScan(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setUploadedFile(file);
      executeAiScan(file);
    }
  };

  // Create New Party submission handler
  const handleSaveNewParty = async (andNew: boolean = false) => {
    if (!partyFormData.name.trim()) {
      alert("Party name is required.");
      return;
    }
    setIsCreatingParty(true);
    try {
      const payload = {
        type: partyFormData.type,
        name: partyFormData.name.trim(),
        phone: partyFormData.phone.trim() || undefined,
        email: partyFormData.email.trim() || undefined,
        gstin: partyFormData.gstin.trim() || undefined,
        stateCode: partyFormData.gstin.trim().slice(0, 2) || "24",
        creditLimit: Number(partyFormData.creditLimit) || 0,
        creditDays: Number(partyFormData.creditDays) || 30,
        billingAddress: {
          line1: partyFormData.billingLine1.trim(),
          city: partyFormData.billingCity.trim(),
          pincode: partyFormData.billingPincode.trim(),
        },
      };

      let newPartyObj: PartyOption;
      try {
        const res: any = await apiClient.post("/masters/parties", payload);
        newPartyObj = {
          id: res.id || String(Date.now()),
          name: res.name || partyFormData.name,
          phone: res.phone || partyFormData.phone,
          gstin: res.gstin || partyFormData.gstin,
          stateCode: payload.stateCode,
          address: `${partyFormData.billingLine1}, ${partyFormData.billingCity}`,
          outstandingBalance: partyFormData.openingBalance,
          type: partyFormData.type,
        };
      } catch {
        // Local fallback if API fails
        newPartyObj = {
          id: String(Date.now()),
          name: partyFormData.name,
          phone: partyFormData.phone,
          gstin: partyFormData.gstin,
          stateCode: payload.stateCode,
          address: `${partyFormData.billingLine1}, ${partyFormData.billingCity}`,
          outstandingBalance: partyFormData.openingBalance,
          type: partyFormData.type,
        };
      }

      setParties((prev) => [newPartyObj, ...prev]);
      setPartyId(newPartyObj.id);
      setPlaceOfSupply(newPartyObj.stateCode);

      if (andNew) {
        setPartyFormData({
          type: "CUSTOMER",
          category: "",
          name: "",
          phone: "",
          gstin: "",
          panNumber: "",
          email: "",
          openingBalance: 0,
          balanceType: "TO_COLLECT",
          billingLine1: "",
          billingCity: "Ahmedabad",
          billingState: "Gujarat",
          billingPincode: "380001",
          creditLimit: 0,
          creditDays: 30,
          contactPersonName: "",
          contactPersonPhone: "",
          bankName: "",
          accountNumber: "",
          ifscCode: "",
        });
      } else {
        setIsCreatePartyModalOpen(false);
      }
    } finally {
      setIsCreatingParty(false);
    }
  };

  const handleSubmit = async (isDraft: boolean, isSaveAndNew: boolean = false) => {
    setError(null);

    // 1. Validate Customer / Party Selection
    if (!partyId) {
      const msg = "Please select a Customer / Party for this invoice.";
      setError(msg);
      setToastMessage("Customer / Party is required.");
      setIsPartyDropdownOpen(true);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    // 2. Validate Items Array
    if (!rows || rows.length === 0) {
      const msg = "Please add at least one line item to the invoice before saving.";
      setError(msg);
      setToastMessage("At least one line item is required.");
      setIsAddItemsModalOpen(true);
      return;
    }

    // 3. Ensure each row has an itemId and valid quantity
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.itemId) {
        if (items.length > 0) {
          r.itemId = items[0].id;
        } else {
          const msg = `Item at row #${i + 1} is empty. Please select a valid item.`;
          setError(msg);
          setToastMessage(msg);
          return;
        }
      }
      if (!r.quantity || Number(r.quantity) <= 0) {
        const msg = `Quantity for row #${i + 1} must be greater than zero.`;
        setError(msg);
        setToastMessage(msg);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Determine payment parameters
      const resolvedPaymentMode = isFullyPaid
        ? (paymentMode as any)
        : "UNPAID_CREDIT";

      const invoicePayload: any = {
        category,
        partyId,
        invoiceNumber,
        invoiceDate: new Date(invoiceDate).toISOString(),
        dueDate: showDueDate ? new Date(dueDate).toISOString() : undefined,
        paymentMode: resolvedPaymentMode,
        placeOfSupply,
        notes: notes.trim() || undefined,
        termsAndConditions: termsAndConditions.trim() || undefined,
        additionalCharges: totalAdditionalCharges,
        overallDiscount: discValue,
        items: rows.map((r) => ({
          itemId: r.itemId || items[0]?.id,
          hsnCode: r.hsnCode || "1001",
          quantity: Number(r.quantity) || 1,
          unitPrice: Number(r.unitPrice) || 0,
          discountPercent: Number(r.discountPercent) || 0,
          taxRate: r.taxRate,
        })),
        receivedAmount: isFullyPaid ? roundedGrandTotal : 0,
        poNumber: quickSettings.enablePoDetails ? poNumber || undefined : undefined,
        poDate: quickSettings.enablePoDetails && poDate ? new Date(poDate).toISOString() : undefined,
        vehicleNumber: (quickSettings.enableVehicleDetails && vehicleNumber) || undefined,
        ewayBillNumber: (quickSettings.enableEwayBill && ewayBillNumber) || undefined,
        shippingAddress: (quickSettings.showShippingAddress && shippingAddress) ? { address: shippingAddress } : undefined,
      };

      const res: any = await apiClient.post(
        `/sales/invoices${isDraft ? "?isDraft=true" : ""}`,
        invoicePayload
      );

      // If partial payment was recorded, post it against the created invoice
      if (!isFullyPaid && effectiveReceived > 0 && res?.id) {
        try {
          await apiClient.post(`/sales/invoices/${res.id}/payments`, {
            amount: effectiveReceived,
            paymentMode,
            paymentDate: new Date(invoiceDate).toISOString(),
            notes: "Initial payment recorded at invoice creation",
          });
        } catch (payErr) {
          console.warn("Partial payment recording error:", payErr);
        }
      }

      // Update sequence in quick settings
      const nextSeq = incrementSequenceNumber(quickSettings.invoiceSequence);
      const updatedSettings = { ...quickSettings, invoiceSequence: nextSeq };
      setQuickSettings(updatedSettings);
      const companyKey = tenantContext?.companyId || "default";
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(`billing_quick_settings_${companyKey}`, JSON.stringify(updatedSettings));
        }
      } catch {}

      if (isSaveAndNew) {
        if (updatedSettings.enablePrefix && updatedSettings.invoicePrefix) {
          setInvoiceNumber(`${updatedSettings.invoicePrefix}${nextSeq}`);
        } else {
          setInvoiceNumber(nextSeq);
        }
        setRows([]);
        setPartyId("");
        setPoNumber("");
        setPoDate("");
        setVehicleNumber("");
        setEwayBillNumber("");
        setShippingAddress("");
        setContactPersonName("");
        setContactPersonPhone("");
        setCustomFieldValues({});
        setAmountReceived(0);
        setIsFullyPaid(false);
        setUploadedFile(null);
        setToastMessage("Invoice created successfully! Ready for next invoice.");
      } else {
        setToastMessage(`Invoice #${invoiceNumber} created successfully!`);
        router.push("/sales/invoices");
      }
    } catch (err: any) {
      console.error("Error creating sales invoice:", err);
      const msg = err.messageGujarati || err.message || "Failed to create sales invoice. Please check the details.";
      setError(msg);
      setToastMessage(msg);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard Shortcuts Listener (Shift+S, Shift+N, Shift+I, Shift+P, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsAddItemsModalOpen(false);
        setIsQuickSettingsOpen(false);
        setIsShortcutsOpen(false);
        setIsSignatureModalOpen(false);
        setIsPartyDropdownOpen(false);
        setIsScannerOpen(false);
        setIsSplitPaymentOpen(false);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSubmit(false, false);
        return;
      }
      if (e.shiftKey && e.key === "S") {
        e.preventDefault();
        handleSubmit(false, false);
        return;
      }
      if (e.shiftKey && e.key === "N") {
        e.preventDefault();
        handleSubmit(false, true);
        return;
      }
      if (e.shiftKey && e.key === "I") {
        e.preventDefault();
        setIsAddItemsModalOpen(true);
        return;
      }
      if (e.shiftKey && e.key === "P") {
        e.preventDefault();
        setIsPartyDropdownOpen((prev) => !prev);
        return;
      }
      if (e.shiftKey && e.key === "D") {
        e.preventDefault();
        setShowOverallDiscount((prev) => !prev);
        return;
      }
      if (e.shiftKey && e.key === "R") {
        e.preventDefault();
        setAutoRoundOff((prev) => !prev);
        return;
      }
      if (e.shiftKey && e.key === "M") {
        e.preventDefault();
        setViewMode((prev) => (prev === "edit" ? "preview" : "edit"));
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSubmit]);

  return (
    <div className="min-h-screen bg-[#F6F8F7] pb-24 text-slate-800">
      {/* =========================================================================
          TOP BAR: Compact Forest Teal Signature Enterprise Toolbar (Full-Width)
          ========================================================================= */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="w-full max-w-[1720px] mx-auto flex items-center justify-between gap-3 min-w-0">
          
          {/* Left: Exit, Title & Category Badge */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
            <Link
              href="/sales/invoices"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-[#F2FAF7] hover:border-[#85D5C2] rounded-lg text-xs font-bold text-[#174B43] shadow-2xs transition-colors shrink-0"
              title="Return to Sales Invoices list"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Exit</span>
            </Link>

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-sm sm:text-base font-extrabold text-[#1A2E2B] tracking-tight truncate">
                {lang === "gu" ? "વેચાણ ઇન્વોઇસ બનાવો" : "Create Sales Invoice"}
              </h1>
              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#E6F7F2] text-[#174B43] border border-[#85D5C2]/50 shrink-0">
                {category.replace("_", " ")}
              </span>
              <span className="hidden xl:inline-block font-mono text-[11px] text-slate-500 font-semibold px-2 py-0.5 bg-slate-100 rounded-md">
                #{invoiceNumber || "DRAFT"}
              </span>
            </div>
          </div>

          {/* Center: Edit Mode / Preview Mode Switcher & Visual Workflow Breadcrumb */}
          <div className="hidden lg:flex items-center gap-4 shrink-0">
            {/* Visual Workflow Steps (Non-blocking contextual guide) */}
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
              <span className="flex items-center gap-1 text-[#174B43] font-bold">
                <span className="w-4 h-4 rounded-full bg-[#E6F7F2] text-[#174B43] border border-[#85D5C2] flex items-center justify-center text-[10px]">1</span>
                <span>Customer</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-[#174B43] font-bold">
                <span className="w-4 h-4 rounded-full bg-[#E6F7F2] text-[#174B43] border border-[#85D5C2] flex items-center justify-center text-[10px]">2</span>
                <span>Items ({rows.length})</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-500 font-medium">
                <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px]">3</span>
                <span>Settlement</span>
              </span>
            </div>

            {/* Segmented Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode("edit")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "edit"
                    ? "bg-white text-[#174B43] shadow-xs border border-[#85D5C2]/40"
                    : "text-[#5A6B66] hover:text-[#174B43]"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("preview")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "preview"
                    ? "bg-white text-[#174B43] shadow-xs border border-[#85D5C2]/40"
                    : "text-[#5A6B66] hover:text-[#174B43]"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>Preview</span>
              </button>
            </div>
          </div>

          {/* Right: Actions, AI Scan trigger & Primary Save CTA */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* AI Scan Trigger Button */}
            <button
              id="btn-show-ai-panel"
              type="button"
              onClick={() => setShowAiPanel(true)}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-amber-900 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              title="Open Mira AI Autofill Scanner"
            >
              <span className="text-sm">⚡</span>
              <span className="hidden sm:inline">AI Scan</span>
              <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 text-[9px] font-black rounded-full">
                {remainingScans}
              </span>
            </button>

            {/* Quick Settings Icon */}
            <button
              type="button"
              onClick={() => {
                setQuickSettingsTab("invoice");
                setIsQuickSettingsOpen(true);
              }}
              className="p-2 border border-[#E2E8E5] hover:bg-[#F2FAF7] hover:border-[#85D5C2] rounded-xl text-[#5A6B66] hover:text-[#174B43] transition-colors cursor-pointer"
              title="Quick Settings (Sequence, Prefix, Custom Fields)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Save & New Secondary Action */}
            <button
              type="button"
              onClick={() => handleSubmit(false, true)}
              disabled={isSubmitting}
              className="hidden sm:inline-flex px-3.5 py-2 border border-[#E2E8E5] hover:bg-[#F2FAF7] hover:border-[#85D5C2] text-[#174B43] font-bold text-xs rounded-xl shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              Save & New
            </button>

            {/* Save Invoice Primary CTA */}
            <button
              type="button"
              onClick={() => handleSubmit(false, false)}
              disabled={isSubmitting}
              className="px-4 sm:px-6 py-2 bg-gradient-to-r from-[#174B43] to-[#26A58A] hover:from-[#133E37] hover:to-[#208E76] active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-950/15 transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="hidden sm:inline">Saving...</span>
                  <span className="sm:hidden">...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Save Invoice</span>
                </>
              )}
            </button>

            {/* Keyboard Shortcuts Icon */}
            <button
              type="button"
              onClick={() => setIsShortcutsOpen(true)}
              className="hidden md:inline-flex p-2 border border-[#E2E8E5] hover:bg-[#F2FAF7] hover:border-[#85D5C2] rounded-xl text-[#5A6B66] hover:text-[#174B43] transition-colors cursor-pointer"
              title="Keyboard Shortcuts (Ctrl+S, Shift+N, Shift+I, etc.)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zM7 9h.01M11 9h.01M15 9h.01M7 12h.01M11 12h.01M15 12h.01M7 15h10" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          SLIDE-OVER DRAWER: Mira AI Document Scanner & Autofill Utility
          (Clean slide-over drawer that frees up 100% of the invoice canvas)
          ========================================================================= */}
      {showAiPanel && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop blur */}
          <div
            onClick={() => setShowAiPanel(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
              
              {/* Drawer Header */}
              <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-orange-50/60 to-amber-50/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#174B43] to-[#E65F12] text-white flex items-center justify-center shadow-xs">
                    <span className="text-base">⚡</span>
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900">
                      Mira AI Bill Scanner
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Extract items, GST & totals automatically
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    FREE • {remainingScans} LEFT
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAiPanel(false)}
                    className="w-8 h-8 rounded-lg hover:bg-slate-200/60 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    title="Close scanner drawer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Stats Summary Strip */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-slate-700">
                    <span>📋</span>
                    <span><strong>{scannedBillsCount}</strong> bills scanned</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-orange-700 justify-end">
                    <span>⏰</span>
                    <span><strong>~{timeSavedMinutes} mins</strong> saved</span>
                  </div>
                </div>

                {/* Live Processing Card */}
                {isAiProcessing ? (
                  <div className="border-2 border-dashed border-orange-400 bg-orange-50/90 rounded-2xl p-6 text-center space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-full bg-orange-100 flex items-center justify-center text-3xl animate-spin">
                      🔍
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-orange-950">
                        Analyzing Document...
                      </p>
                      <p className="text-xl font-black font-mono text-orange-600 mt-0.5">
                        {scanDurationSeconds}s
                      </p>
                    </div>
                    <div className="w-full bg-orange-200 rounded-full h-2 overflow-hidden">
                      <div className="bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 h-2 w-full animate-pulse" />
                    </div>
                    <p className="text-xs font-semibold text-orange-800">
                      {scanProgressText || "AI Gemini Vision is extracting fields..."}
                    </p>
                    <p className="text-[10px] text-amber-900 bg-amber-100/80 p-2 rounded-lg border border-amber-300">
                      ⚠️ Please check extracted details actively before saving.
                    </p>
                  </div>
                ) : uploadedFile ? (
                  /* Scanned / Uploaded Thumbnail Card */
                  <div className="border-2 border-emerald-400 bg-emerald-50/70 rounded-2xl p-4 text-left space-y-3 shadow-xs">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">📄</span>
                        <div className="truncate max-w-[200px]">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {uploadedFile.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {(uploadedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                        ✓ Ready
                      </span>
                    </div>

                    {scannedSummaryTime && (
                      <div className="p-2.5 bg-white rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between font-medium">
                        <span>Scanned in {scannedSummaryTime}s!</span>
                        <span className="text-emerald-700 font-bold">✓ Autofilled into form</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => executeAiScan()}
                        className="flex-1 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                      >
                        ↻ Re-scan Document
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedFile(null);
                          setScannedSummaryTime(null);
                          setScanSuccessBanner(null);
                          setScanError(null);
                        }}
                        className="py-2 px-3 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Drag & Drop Upload Zone */
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                      isDragOver
                        ? "border-orange-500 bg-orange-100/70 scale-[1.01]"
                        : "border-orange-300 bg-orange-50/40 hover:bg-orange-50/80 hover:border-orange-400"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center text-2xl mb-3 shadow-inner">
                      📄
                    </div>
                    <p className="text-xs font-bold text-orange-950">
                      {isDragOver ? "Drop file to scan immediately" : "Click or Drag & Drop invoice here"}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Supports PDF, JPG, JPEG & PNG (max 5MB)
                    </p>
                  </div>
                )}

                {/* Proceed Button */}
                {!scannedSummaryTime && (
                  <button
                    type="button"
                    disabled={!uploadedFile || isAiProcessing}
                    onClick={() => executeAiScan()}
                    className={`w-full py-2.5 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 ${
                      !uploadedFile || isAiProcessing
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/20 active:scale-95 cursor-pointer"
                    }`}
                  >
                    {isAiProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{scanProgressText || "Extracting Data..."}</span>
                      </>
                    ) : (
                      <>
                        <span>✨</span>
                        <span>{uploadedFile ? "Proceed & Autofill Invoice" : "Upload File to Proceed"}</span>
                      </>
                    )}
                  </button>
                )}

                {/* How it works card */}
                {showHowItWorks && (
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="text-blue-500">ℹ️</span> How AI Scanning Works
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowHowItWorks(false)}
                        className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    <ul className="text-[11px] text-slate-600 space-y-2">
                      <li className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-[10px]">1</span>
                        <span>Upload any customer invoice or challan document</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-[10px]">2</span>
                        <span>AI extracts customer, GSTIN, line items & taxes</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">3</span>
                        <span>Form is filled instantly with zero manual typing</span>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MAIN APPLICATION CANVAS
          ========================================================================= */}
      <main className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        
        {/* Validation or API Error Banner */}
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

        {/* AI Scan Success / Error Notifications */}
        {scanSuccessBanner && (
          <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-medium shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">🎉</span>
              <span>{scanSuccessBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setScanSuccessBanner(null)}
              className="text-emerald-500 hover:text-emerald-700 font-bold ml-3 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {scanError && (
          <div className="flex items-center justify-between p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-medium shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>{scanError}</span>
            </div>
            <button
              type="button"
              onClick={() => setScanError(null)}
              className="text-rose-500 hover:text-rose-700 font-bold ml-3 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* =======================================================================
            VIEW MODE: PREVIEW MODE (A4 Tax Invoice Document Sheet)
            ======================================================================= */}
        {viewMode === "preview" ? (
          <div className="space-y-4 max-w-4xl mx-auto">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-[#E2E8E5] shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  Preview Mode • Standard Tax Invoice (A4 Format)
                </span>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                  Ready to Print
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                >
                  <span>🖨️</span>
                  <span>Print Invoice</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("edit")}
                  className="px-4 py-1.5 bg-[#174B43] hover:bg-[#133E37] text-white text-xs font-bold rounded-xl transition-colors shadow-2xs cursor-pointer"
                >
                  ✏️ Return to Edit
                </button>
              </div>
            </div>

            {/* A4 Document Sheet */}
            <div className="bg-white rounded-3xl border border-[#E2E8E5] shadow-sm p-8 space-y-6">
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {currentCompany?.tradeName || currentCompany?.legalName || "MY BILL BOOK"}
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    GSTIN: <span className="font-mono font-bold">{currentCompany?.gstin || "24AAAAA0000A1Z5"}</span>
                  </p>
                  <p className="text-xs text-slate-600">
                    State: {currentCompany?.stateCode || "Gujarat (24)"} • {(currentCompany as any)?.phone ? `Phone: ${(currentCompany as any).phone}` : (currentCompany?.city ? `City: ${currentCompany.city}` : "GST Registered")}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-[#E6F7F2] text-[#174B43] border border-[#85D5C2] font-black text-xs uppercase tracking-wider rounded-md mb-2">
                    {category.replace("_", " ")}
                  </span>
                  <p className="text-xs font-bold text-slate-900">
                    Invoice #: <span className="font-mono">{invoiceNumber}</span>
                  </p>
                  <p className="text-xs text-slate-600">Date: {invoiceDate}</p>
                  {showDueDate && (
                    <p className="text-xs text-slate-600">Due: {dueDate}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Billed To
                  </span>
                  <p className="text-sm font-bold text-slate-900">
                    {selectedParty?.name || "Cash Customer / Walk-in"}
                  </p>
                  {selectedParty?.phone && (
                    <p className="text-xs text-slate-600">Phone: {selectedParty.phone}</p>
                  )}
                  {selectedParty?.gstin && (
                    <p className="text-xs text-slate-600 font-mono">
                      GSTIN: {selectedParty.gstin}
                    </p>
                  )}
                  {selectedParty?.address && (
                    <p className="text-xs text-slate-500">{selectedParty.address}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Place of Supply
                  </span>
                  <p className="text-xs font-bold text-slate-800">
                    {placeOfSupply === "24" ? "Gujarat (24)" : `State Code: ${placeOfSupply}`}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Payment Mode: <strong className="text-slate-800">{paymentMode}</strong>
                  </p>
                </div>
              </div>

              {/* Preview Table */}
              <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-[#174B43] text-white">
                  <tr>
                    <th className="py-2.5 px-3 text-left">#</th>
                    <th className="py-2.5 px-3 text-left">Item Name</th>
                    <th className="py-2.5 px-3 text-center">HSN</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">Rate</th>
                    <th className="py-2.5 px-3 text-right">Tax</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {rows.map((r, i) => {
                    const it = items.find((item) => item.id === r.itemId);
                    const q = Number(r.quantity) || 0;
                    const p = Number(r.unitPrice) || 0;
                    const disc = Number(r.discountPercent) || 0;
                    const net = q * p - (q * p * disc) / 100;
                    const total = net + (net * r.taxRate) / 100;

                    return (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-400">{i + 1}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">
                          {it?.name || "Product / Item"}
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-slate-600">
                          {r.hsnCode}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">{q}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatInr(p)}</td>
                        <td className="py-2 px-3 text-right font-mono">{r.taxRate}%</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {formatInr(total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Totals Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pt-2">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Total Amount In Words:
                  </span>
                  <p className="text-xs font-bold text-slate-900">
                    {numberToWordsINR(roundedGrandTotal)}
                  </p>
                </div>

                <div className="space-y-1.5 text-xs bg-slate-50/60 p-4 rounded-2xl border border-slate-200">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Amount:</span>
                    <span className="font-mono">{formatInr(totalTaxable)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST (CGST + SGST):</span>
                    <span className="font-mono">{formatInr(totalTax)}</span>
                  </div>
                  {totalAdditionalCharges > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Additional Charges:</span>
                      <span className="font-mono">+{formatInr(totalAdditionalCharges)}</span>
                    </div>
                  )}
                  {discValue > 0 && (
                    <div className="flex justify-between text-rose-600 font-medium">
                      <span>Discount:</span>
                      <span className="font-mono">-{formatInr(discValue)}</span>
                    </div>
                  )}
                  {roundOff !== 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Round Off:</span>
                      <span className="font-mono">{roundOff >= 0 ? `+${roundOff.toFixed(2)}` : roundOff.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-2">
                    <span>Grand Total:</span>
                    <span className="font-mono font-black text-[#174B43]">{formatInr(roundedGrandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Bank Details & Terms */}
              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                <div className="space-y-3 text-xs text-slate-600">
                  {showBankAccount && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                      <p className="font-bold text-slate-900">Bank Details:</p>
                      <p>Bank: <strong>HDFC Bank</strong> • A/c: <strong>50200012345678</strong></p>
                      <p>IFSC: <strong>HDFC0000123</strong> • Branch: Ahmedabad Main</p>
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-slate-800">Terms & Conditions:</p>
                    <p className="whitespace-pre-line text-slate-500 mt-1">{termsAndConditions}</p>
                  </div>
                </div>

                <div className="text-right flex flex-col justify-between items-end">
                  <p className="text-xs font-bold text-slate-800">
                    For {currentCompany?.tradeName || currentCompany?.legalName || "MY BILL BOOK"}
                  </p>
                  <div className="pt-4 text-center inline-block min-w-[170px]">
                    {signatureData ? (
                      <img
                        src={signatureData}
                        alt="Authorized Signature"
                        className="h-14 object-contain mx-auto mb-1"
                      />
                    ) : (
                      <div className="h-14 border border-dashed border-slate-300 rounded flex items-center justify-center text-[10px] text-slate-400 mb-1">
                        (Authorized Signature)
                      </div>
                    )}
                    <p className="text-[11px] font-bold text-slate-700 border-t border-slate-300 pt-1">
                      Authorized Signatory
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* =======================================================================
              VIEW MODE: EDIT MODE (Modern Enterprise Full-Width Layout)
              ======================================================================= */
          <div className="space-y-5">
            
            {/* ===================================================================
                SECTION 1: UNIFIED MASTER CARD — CUSTOMER & INVOICE DETAILS
                (Clean, balanced two-column presentation with zero bulky dashed outlines)
                =================================================================== */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E2E8E5] shadow-xs p-5 sm:p-6 transition-all">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Column A: Customer Selection & Details (6 cols) */}
                <div className="lg:col-span-6 space-y-3.5 lg:border-r lg:border-slate-100 lg:pr-6">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#E6F7F2] text-[#174B43] flex items-center justify-center font-bold text-xs">
                        👤
                      </div>
                      <div>
                        <span className="text-xs font-extrabold text-[#1A2E2B] tracking-tight block">
                          Bill To / Customer
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Select existing party or create new
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setQuickSettingsTab("party");
                        setIsQuickSettingsOpen(true);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-[#174B43] hover:bg-slate-50 transition-colors"
                      title="Customize Customer Fields"
                    >
                      ⚙️
                    </button>
                  </div>

                  {/* Customer Selector / Selected Info Card */}
                  <div className="relative">
                    {selectedParty ? (
                      /* Selected Customer Rich Card */
                      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-50 to-[#F2FAF7]/60 border border-[#BCEADF] space-y-2.5 relative shadow-2xs">
                        <div className="flex items-start justify-between">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-extrabold text-slate-900 leading-tight">
                                {selectedParty.name}
                              </p>
                              {isPartyNewlyScanned && (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded-full uppercase tracking-wider animate-pulse">
                                  NEW
                                </span>
                              )}
                            </div>
                            {quickSettings.showPartyBalance && (
                              <p className="text-[11px] font-mono">
                                Balance:{" "}
                                <span
                                  className={
                                    (selectedParty.outstandingBalance ?? 0) > 0
                                      ? "text-rose-600 font-bold"
                                      : "text-emerald-700 font-bold"
                                  }
                                >
                                  {formatInr(selectedParty.outstandingBalance ?? 0)}
                                </span>
                              </p>
                            )}
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setIsPartyDropdownOpen(true);
                              setPartySearchTerm("");
                            }}
                            className="text-xs font-bold text-[#174B43] hover:text-[#26A58A] underline cursor-pointer shrink-0"
                          >
                            Change
                          </button>
                        </div>

                        {/* Contact details pills */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                          {selectedParty.phone && (
                            <span className="flex items-center gap-1 font-mono">
                              <span>📞</span> {selectedParty.phone}
                            </span>
                          )}
                          {selectedParty.gstin && (
                            <span className="flex items-center gap-1 font-mono">
                              <span className="px-1 py-0.2 bg-slate-200 text-slate-700 text-[9px] font-bold rounded">GSTIN</span>
                              <span>{selectedParty.gstin}</span>
                            </span>
                          )}
                        </div>

                        {selectedParty.address && (
                          <p className="text-[11px] text-slate-500 truncate">
                            📍 {selectedParty.address}
                          </p>
                        )}

                        {/* Expandable Shipping & Contact Person Details */}
                        {quickSettings.showShippingAddress && (
                          <div className="pt-2 border-t border-slate-200/80">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              Shipping Address (Ship-To)
                            </label>
                            <textarea
                              rows={2}
                              value={shippingAddress}
                              onChange={(e) => setShippingAddress(e.target.value)}
                              placeholder="Enter shipping address if different from billing..."
                              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#26A58A]"
                            />
                          </div>
                        )}

                        {quickSettings.showContactPerson && (
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                Contact Person
                              </label>
                              <input
                                type="text"
                                value={contactPersonName}
                                onChange={(e) => setContactPersonName(e.target.value)}
                                placeholder="Contact Name"
                                className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#26A58A]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                Contact Phone
                              </label>
                              <input
                                type="text"
                                value={contactPersonPhone}
                                onChange={(e) => setContactPersonPhone(e.target.value)}
                                placeholder="Phone"
                                className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#26A58A]"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Clean Customer Search Combobox */
                      <div className="space-y-2">
                        <div className="relative">
                          <input
                            type="text"
                            value={partySearchTerm}
                            onChange={(e) => {
                              setPartySearchTerm(e.target.value);
                              setIsPartyDropdownOpen(true);
                            }}
                            onFocus={() => setIsPartyDropdownOpen(true)}
                            placeholder="Type to search customer by name, mobile, or GSTIN..."
                            className="w-full text-xs p-3 pl-9 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#26A58A] rounded-xl text-slate-900 focus:outline-none transition-all shadow-2xs"
                          />
                          <span className="absolute left-3 top-3 text-slate-400 text-sm">
                            🔍
                          </span>
                          {partySearchTerm && (
                            <button
                              type="button"
                              onClick={() => {
                                setPartySearchTerm("");
                                setIsPartyDropdownOpen(false);
                              }}
                              className="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-600"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {/* Dropdown Menu when searching / focused */}
                        {isPartyDropdownOpen && (
                          <div className="absolute left-0 right-0 top-12 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-72 flex flex-col animate-in fade-in slide-in-from-top-1">
                            {/* Header row */}
                            <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              <span>Customer / Business Name</span>
                              {quickSettings.showPartyBalance && <span>Current Balance</span>}
                            </div>

                            {/* Party List */}
                            <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
                              {filteredParties.length === 0 ? (
                                <div className="p-4 text-center text-xs text-slate-500 space-y-1">
                                  <p>No customers found matching &quot;{partySearchTerm}&quot;</p>
                                  <p className="text-[11px] text-slate-400">You can create a new party directly below</p>
                                </div>
                              ) : (
                                filteredParties.map((p) => {
                                  const bal = p.outstandingBalance ?? 0;
                                  return (
                                    <div
                                      key={p.id}
                                      onClick={() => handlePartyChange(p.id)}
                                      className="flex items-center justify-between px-3.5 py-2.5 hover:bg-[#F2FAF7] cursor-pointer transition-colors text-xs"
                                    >
                                      <div>
                                        <p className="font-bold text-slate-900">{p.name}</p>
                                        <p className="text-[10px] text-slate-500">
                                          {p.phone || p.gstin || "Walk-in Cash Customer"}
                                        </p>
                                      </div>
                                      {quickSettings.showPartyBalance && (
                                        <div className="text-right font-mono font-bold">
                                          {bal > 0 ? (
                                            <span className="text-rose-600 flex items-center gap-1 justify-end">
                                              <span>{formatInr(bal)}</span>
                                              <span>↑</span>
                                            </span>
                                          ) : bal < 0 ? (
                                            <span className="text-emerald-700 flex items-center gap-1 justify-end">
                                              <span>{formatInr(Math.abs(bal))}</span>
                                              <span>↓</span>
                                            </span>
                                          ) : (
                                            <span className="text-slate-400">₹ 0</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>

                            {/* Bottom: + Create Party Action */}
                            <div className="p-2 border-t border-slate-100 bg-slate-50/50">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsPartyDropdownOpen(false);
                                  setIsCreatePartyModalOpen(true);
                                }}
                                className="w-full py-2 bg-white hover:bg-[#F2FAF7] border border-[#85D5C2] rounded-xl text-xs font-bold text-[#174B43] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              >
                                <span>+ Create New Customer</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Quick action strip if dropdown is closed */}
                        {!isPartyDropdownOpen && (
                          <div className="flex items-center justify-between text-xs px-1">
                            <span className="text-[11px] text-slate-500">
                              {parties.length} customers registered
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsCreatePartyModalOpen(true)}
                              className="text-[11px] font-bold text-[#174B43] hover:text-[#26A58A] transition-colors"
                            >
                              + New Customer
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Column B: Invoice Metadata & Settings (6 cols) */}
                <div className="lg:col-span-6 space-y-3.5">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#E6F7F2] text-[#174B43] flex items-center justify-center font-bold text-xs">
                        📄
                      </div>
                      <div>
                        <span className="text-xs font-extrabold text-[#1A2E2B] tracking-tight block">
                          Invoice Information
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Date, numbering and statutory terms
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={repeatInvoice}
                          onChange={(e) => setRepeatInvoice(e.target.checked)}
                          className="rounded text-[#174B43] focus:ring-0"
                        />
                        <span className="text-[11px] font-semibold">Recurring</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickSettingsTab("invoice");
                          setIsQuickSettingsOpen(true);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-[#174B43] hover:bg-slate-50 transition-colors"
                        title="Customize Invoice Fields"
                      >
                        ⚙️
                      </button>
                    </div>
                  </div>

                  {/* Primary Fields Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Invoice Number */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Invoice Number *
                      </label>
                      <input
                        type="text"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        className="w-full text-xs p-2.5 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#26A58A] rounded-xl font-mono font-bold text-slate-900 focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Invoice Date */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Invoice Date *
                      </label>
                      <input
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        className="w-full text-xs p-2.5 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#26A58A] rounded-xl font-mono text-slate-900 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Secondary Fields: Place of Supply & Due Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Place of Supply */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Place of Supply (State)
                      </label>
                      <select
                        value={placeOfSupply}
                        onChange={(e) => setPlaceOfSupply(e.target.value)}
                        className="w-full text-xs p-2.5 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#26A58A] rounded-xl text-slate-800 focus:outline-none transition-colors"
                      >
                        <option value="24">Gujarat (24) - Intra State (CGST+SGST)</option>
                        <option value="27">Maharashtra (27) - Inter State (IGST)</option>
                        <option value="08">Rajasthan (08) - Inter State (IGST)</option>
                        <option value="23">Madhya Pradesh (23) - Inter State (IGST)</option>
                        <option value="07">Delhi (07) - Inter State (IGST)</option>
                        <option value="29">Karnataka (29) - Inter State (IGST)</option>
                        <option value="33">Tamil Nadu (33) - Inter State (IGST)</option>
                        <option value="09">Uttar Pradesh (09) - Inter State (IGST)</option>
                        <option value="19">West Bengal (19) - Inter State (IGST)</option>
                        <option value="36">Telangana (36) - Inter State (IGST)</option>
                      </select>
                    </div>

                    {/* Due Date & Terms */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Payment Due Date
                      </label>
                      {!showDueDate ? (
                        <button
                          type="button"
                          onClick={() => setShowDueDate(true)}
                          className="w-full py-2.5 px-3 border border-dashed border-[#85D5C2] bg-[#F2FAF7]/60 hover:bg-[#E6F7F2] rounded-xl text-xs font-bold text-[#174B43] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>+ Add Payment Terms / Due Date</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={paymentTermsDays}
                            onChange={(e) => {
                              const days = Number(e.target.value) || 0;
                              setPaymentTermsDays(days);
                              const d = new Date(invoiceDate || new Date());
                              d.setDate(d.getDate() + days);
                              setDueDate(d.toISOString().split("T")[0]);
                            }}
                            className="w-16 text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center font-mono font-bold"
                            title="Net payment days"
                          />
                          <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="flex-1 text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowDueDate(false)}
                            className="text-slate-400 hover:text-slate-600 p-1 text-xs"
                            title="Remove due date"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tax Inclusive Switch */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={isTaxInclusive}
                        onChange={(e) => setIsTaxInclusive(e.target.checked)}
                        className="rounded text-[#174B43] focus:ring-0"
                      />
                      <span>Item prices are tax-inclusive (GST Included in Rate)</span>
                    </label>
                  </div>

                  {/* Optional PO Details (when enabled) */}
                  {quickSettings.enablePoDetails && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          PO Number
                        </label>
                        <input
                          type="text"
                          value={poNumber}
                          onChange={(e) => setPoNumber(e.target.value)}
                          placeholder="PO-2026-01"
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          PO Date
                        </label>
                        <input
                          type="date"
                          value={poDate}
                          onChange={(e) => setPoDate(e.target.value)}
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                        />
                      </div>
                    </div>
                  )}

                  {/* Optional Vehicle & E-Way Bill (when enabled) */}
                  {(quickSettings.enableVehicleDetails || quickSettings.enableEwayBill) && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                      {quickSettings.enableVehicleDetails && (
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Vehicle Number
                          </label>
                          <input
                            type="text"
                            value={vehicleNumber}
                            onChange={(e) => setVehicleNumber(e.target.value)}
                            placeholder="GJ-01-AB-1234"
                            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase text-slate-900"
                          />
                        </div>
                      )}
                      {quickSettings.enableEwayBill && (
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            E-Way Bill Number
                          </label>
                          <input
                            type="text"
                            value={ewayBillNumber}
                            onChange={(e) => setEwayBillNumber(e.target.value)}
                            placeholder="12-digit number"
                            maxLength={12}
                            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ===================================================================
                SECTION 2: INVOICE ITEMS WORKSPACE (THE HERO CENTERPIECE)
                (Document-grade table layout, clean empty state, rapid data-entry)
                =================================================================== */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E2E8E5] shadow-xs overflow-hidden transition-all">
              
              {/* Items Section Header Toolbar */}
              <div className="px-5 py-4 border-b border-[#E2E8E5] bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#E6F7F2] text-[#174B43] flex items-center justify-center font-bold text-xs shadow-2xs">
                    📦
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-[#1A2E2B] tracking-tight flex items-center gap-2">
                      <span>Line Items & Inventory</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {rows.length} {rows.length === 1 ? "Item" : "Items"}
                      </span>
                    </h2>
                    <p className="text-[10px] text-slate-400">
                      Add products or services from catalog with tax and rates
                    </p>
                  </div>
                </div>

                {/* Table Actions Strip */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddItemsModalOpen(true)}
                    className="px-3.5 py-1.5 bg-[#26A58A] hover:bg-[#208E76] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>+ Add from Catalog</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddBlankRow()}
                    className="px-3 py-1.5 bg-white border border-[#E2E8E5] hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>+ Add Blank Row</span>
                  </button>

                  <button
                    id="btn-scan-barcode"
                    type="button"
                    onClick={() => setIsAddItemsModalOpen(true)}
                    className="hidden sm:inline-flex px-3 py-1.5 bg-white border border-[#E2E8E5] hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-colors items-center gap-1 cursor-pointer"
                    title="Scan product barcode"
                  >
                    <span>📷</span>
                    <span>Scan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setQuickSettingsTab("items");
                      setIsQuickSettingsOpen(true);
                    }}
                    className="p-1.5 border border-[#E2E8E5] hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer"
                    title="Table Columns & GST Settings"
                  >
                    ⚙️
                  </button>
                </div>
              </div>

              {/* Document-Grade Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[750px]">
                  <thead className="bg-[#FAFBF7] text-[#5A6B66] uppercase tracking-wider font-extrabold border-b border-[#E2E8E5] text-[10px]">
                    <tr>
                      <th className="py-3 px-3.5 w-10 text-center">#</th>
                      <th className="py-3 px-3.5 min-w-[260px]">ITEM & DESCRIPTION</th>
                      {quickSettings.showHsnColumn && (
                        <th className="py-3 px-3 w-24 text-center">HSN/SAC</th>
                      )}
                      <th className="py-3 px-3 w-20 text-right">QTY</th>
                      <th className="py-3 px-3 w-32 text-right">PRICE (₹)</th>
                      {quickSettings.showDiscountColumn && (
                        <th className="py-3 px-3 w-24 text-right">DISCOUNT</th>
                      )}
                      {quickSettings.showTaxColumn && (
                        <th className="py-3 px-3 w-24 text-right">TAX (GST)</th>
                      )}
                      <th className="py-3 px-4 w-32 text-right">AMOUNT (₹)</th>
                      <th className="py-3 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.length === 0 ? (
                      /* Clean Empty State */
                      <tr>
                        <td
                          colSpan={
                            5 +
                            (quickSettings.showHsnColumn ? 1 : 0) +
                            (quickSettings.showDiscountColumn ? 1 : 0) +
                            (quickSettings.showTaxColumn ? 1 : 0)
                          }
                          className="py-12 px-4 text-center"
                        >
                          <div className="max-w-sm mx-auto space-y-3">
                            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#E6F7F2] text-[#174B43] flex items-center justify-center text-2xl shadow-inner">
                              📦
                            </div>
                            <div>
                              <h3 className="text-sm font-extrabold text-[#1A2E2B]">
                                No items in this invoice yet
                              </h3>
                              <p className="text-xs text-slate-500 mt-1">
                                Add products or services from your catalog or create a custom entry.
                              </p>
                            </div>
                            <div className="flex items-center justify-center gap-2 pt-2">
                              <button
                                type="button"
                                onClick={() => setIsAddItemsModalOpen(true)}
                                className="px-4 py-2 bg-[#174B43] hover:bg-[#133E37] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                              >
                                + Browse Catalog
                              </button>
                              <button
                                type="button"
                                onClick={handleAddBlankRow}
                                className="px-4 py-2 bg-white border border-[#E2E8E5] hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                              >
                                + Add Blank Row
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      /* Rows Mapping */
                      rows.map((row, idx) => {
                        const qty = Number(row.quantity) || 0;
                        const rate = Number(row.unitPrice) || 0;
                        const disc = quickSettings.showDiscountColumn
                          ? Number(row.discountPercent) || 0
                          : 0;
                        const gross = qty * rate;
                        const grossAfterDisc = gross - (gross * disc) / 100;
                        const effectiveTaxRate = quickSettings.showTaxColumn ? row.taxRate : 0;
                        const lineTotal = isTaxInclusive
                          ? grossAfterDisc
                          : grossAfterDisc + (grossAfterDisc * effectiveTaxRate) / 100;

                        return (
                          <tr key={row.rowId || `row-${idx}`} className="hover:bg-slate-50/80 transition-colors group">
                            {/* Line Number */}
                            <td className="py-2.5 px-3.5 text-center text-slate-400 font-mono text-[11px]">
                              {idx + 1}
                            </td>

                            {/* Item Selector */}
                            <td className="py-2.5 px-3.5">
                              <div className="flex items-center gap-2">
                                <select
                                  value={row.itemId}
                                  onChange={(e) => handleItemSelect(idx, e.target.value)}
                                  className="w-full text-xs p-2 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#26A58A] rounded-xl font-medium text-slate-900 focus:outline-none transition-colors"
                                >
                                  {items.map((it) => (
                                    <option key={it.id} value={it.id}>
                                      {it.name} (Stock: {it.stockQuantity ?? 0})
                                    </option>
                                  ))}
                                </select>
                                {newlyScannedItemIndices.includes(idx) && (
                                  <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded-full uppercase tracking-wider shrink-0 animate-pulse">
                                    NEW
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* HSN */}
                            {quickSettings.showHsnColumn && (
                              <td className="py-2.5 px-3">
                                <input
                                  type="text"
                                  value={row.hsnCode}
                                  onChange={(e) => handleRowChange(idx, "hsnCode", e.target.value)}
                                  className="w-full text-xs p-2 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#26A58A] rounded-xl text-center font-mono text-slate-800 focus:outline-none"
                                />
                              </td>
                            )}

                            {/* QTY */}
                            <td className="py-2.5 px-3">
                              <input
                                type="number"
                                min="0.001"
                                step="any"
                                value={row.quantity}
                                onChange={(e) => handleRowChange(idx, "quantity", e.target.value)}
                                className="w-full text-xs p-2 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#26A58A] rounded-xl text-right font-mono font-bold text-slate-900 focus:outline-none"
                              />
                            </td>

                            {/* PRICE / ITEM */}
                            <td className="py-2.5 px-3">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={row.unitPrice}
                                onChange={(e) => handleRowChange(idx, "unitPrice", e.target.value)}
                                className="w-full text-xs p-2 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#26A58A] rounded-xl text-right font-mono font-bold text-slate-900 focus:outline-none"
                              />
                              {partyId && row.itemId && getPartyItemPrice(partyId, row.itemId, selectedParty?.name) !== null && (
                                <div className="flex justify-end mt-1">
                                  <span
                                    title={`Party specific price active for ${selectedParty?.name || "this party"}`}
                                    className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-1 py-0.2 rounded"
                                  >
                                    <span>🏷️</span>
                                    <span>Party Rate</span>
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* DISCOUNT */}
                            {quickSettings.showDiscountColumn && (
                              <td className="py-2.5 px-3">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={row.discountPercent}
                                  onChange={(e) => handleRowChange(idx, "discountPercent", e.target.value)}
                                  placeholder="0 %"
                                  className="w-full text-xs p-2 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#26A58A] rounded-xl text-right font-mono text-slate-700 focus:outline-none"
                                />
                              </td>
                            )}

                            {/* TAX (GST) */}
                            {quickSettings.showTaxColumn && (
                              <td className="py-2.5 px-3">
                                <div className="relative flex items-center min-w-[70px]">
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    max="100"
                                    list="gst-rates-table"
                                    value={row.taxRate}
                                    onChange={(e) => handleRowChange(idx, "taxRate", Number(e.target.value) || 0)}
                                    placeholder="0"
                                    className="w-full text-xs p-2 pr-4 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#26A58A] rounded-xl text-right font-mono font-bold text-slate-800 focus:outline-none"
                                  />
                                  <span className="absolute right-1 text-[11px] font-bold text-slate-400 pointer-events-none">%</span>
                                </div>
                              </td>
                            )}

                            {/* AMOUNT */}
                            <td className="py-2.5 px-4 text-right font-mono font-black text-slate-900 text-xs">
                              {formatInr(lineTotal)}
                            </td>

                            {/* DELETE ACTION - UNCONDITIONALLY ACTIVE ON EVERY ROW */}
                            <td className="py-2.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(idx)}
                                className="w-7 h-7 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center cursor-pointer"
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

              {/* Subtotal Summary Strip */}
              <div className="bg-[#FAFBF7] border-t border-[#E2E8E5] px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-[#1A2E2B] text-xs uppercase tracking-wider">Subtotal Summary</span>
                  <span className="text-slate-400">•</span>
                  <span>Total Qty: <strong className="font-mono text-slate-900">{totalQty}</strong></span>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-mono text-slate-700">
                  {discValue > 0 || totalDiscountAmt > 0 ? (
                    <span>Discount: <strong className="text-rose-600">-{formatInr(totalDiscountAmt)}</strong></span>
                  ) : null}
                  <span>GST Tax: <strong className="text-slate-900">{formatInr(totalTax)}</strong></span>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                    <span className="text-xs uppercase text-slate-400">Items Total:</span>
                    <span className="text-[#174B43] font-black">{formatInr(itemsSubtotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ===================================================================
                SECTION 3: BOTTOM SETTLEMENT & COMMERCIAL TERMS (2-COLUMN GRID)
                (Left: Terms, Bank, QR, Signature. Right: Calculations & Payments)
                =================================================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              
              {/* Left Pane (6 cols): Terms, Notes, Bank & Signature */}
              <div className="lg:col-span-6 space-y-4">
                
                {/* Terms and Conditions Card */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E2E8E5] p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#1A2E2B] tracking-tight">
                      Terms & Conditions
                    </span>
                    <span className="text-[10px] text-slate-400">Included on print</span>
                  </div>
                  <textarea
                    rows={3}
                    value={termsAndConditions}
                    onChange={(e) => setTermsAndConditions(e.target.value)}
                    className="w-full text-xs p-3 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#26A58A] rounded-xl text-slate-700 focus:outline-none transition-colors"
                  />

                  {/* Customer Notes */}
                  <div className="pt-2 border-t border-slate-100">
                    {!showNotes ? (
                      <button
                        type="button"
                        onClick={() => setShowNotes(true)}
                        className="text-xs font-bold text-[#174B43] hover:text-[#26A58A] flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>📝</span>
                        <span>+ Add Customer Notes / Remarks</span>
                      </button>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700">Notes / Remarks</label>
                          <button
                            type="button"
                            onClick={() => {
                              setShowNotes(false);
                              setNotes("");
                            }}
                            className="text-[11px] text-slate-400 hover:text-slate-600"
                          >
                            Remove
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Special instructions or delivery notes for customer..."
                          className="w-full text-xs p-2.5 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Bank Account & Payment QR */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E2E8E5] p-5 shadow-xs space-y-3">
                  <span className="text-xs font-extrabold text-[#1A2E2B] tracking-tight block">
                    Payment Options on Invoice
                  </span>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setShowBankAccount(!showBankAccount)}
                      className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                        showBankAccount
                          ? "bg-[#E6F7F2] text-[#174B43] border-[#85D5C2]"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span>🏛️</span>
                      <span>Bank Account {showBankAccount ? "✓" : "+"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowPaymentQr(!showPaymentQr)}
                      className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                        showPaymentQr
                          ? "bg-[#E6F7F2] text-[#174B43] border-[#85D5C2]"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span>📱</span>
                      <span>UPI QR Code {showPaymentQr ? "✓" : "+"}</span>
                    </button>
                  </div>

                  {showBankAccount && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-0.5">
                      <p className="font-bold text-slate-900">Bank Details Included on Invoice:</p>
                      <p>Bank: <strong>HDFC Bank</strong> • A/c: <strong>50200012345678</strong></p>
                      <p>IFSC: <strong>HDFC0000123</strong> • Branch: Ahmedabad Main</p>
                    </div>
                  )}

                  {showPaymentQr && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-0.5">
                      <p className="font-bold text-slate-900">Dynamic UPI QR Code Active:</p>
                      <p>QR code with payment link will be printed directly on this invoice for instant customer scan-to-pay.</p>
                    </div>
                  )}
                </div>

                {/* Authorized Signature Card */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E2E8E5] p-5 shadow-xs">
                  {signatureData ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Authorized Signature
                        </span>
                        <img
                          src={signatureData}
                          alt="Signature"
                          className="h-12 object-contain"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsSignatureModalOpen(true)}
                          className="text-xs font-bold text-[#174B43] hover:underline cursor-pointer"
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
                      className="w-full py-4 border-2 border-dashed border-[#85D5C2] rounded-2xl bg-[#F2FAF7]/40 hover:bg-[#E6F7F2]/60 flex flex-col items-center justify-center text-xs text-slate-500 cursor-pointer transition-colors"
                    >
                      <span className="font-bold text-[#174B43] flex items-center gap-1.5">
                        <span>✍️</span>
                        <span>+ Add Authorized Signature</span>
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        Click to draw, upload or type signature
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Pane (6 cols): Financial Calculations, Grand Total & Payments */}
              <div className="lg:col-span-6 space-y-4">
                
                {/* Financial Summary & Grand Total Card */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E2E8E5] p-5 sm:p-6 shadow-xs space-y-4">
                  
                  {/* Additional Charges - Clean Inline Rows */}
                  <div className="space-y-2 text-xs">
                    {additionalCharges.map((chg) => (
                      <div key={chg.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Charge description (e.g. Delivery, Packing)"
                          value={chg.name}
                          onChange={(e) => handleUpdateCharge(chg.id, "name", e.target.value)}
                          className="flex-1 text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#26A58A]"
                        />
                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 w-24">
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
                        <div className="relative flex items-center min-w-[70px]">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            max="100"
                            list="gst-rates-table"
                            value={chg.taxRate}
                            onChange={(e) =>
                              handleUpdateCharge(chg.id, "taxRate", Number(e.target.value) || 0)
                            }
                            placeholder="0"
                            className="w-full text-xs p-1.5 pr-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-700 text-right focus:outline-none"
                          />
                          <span className="absolute right-1 text-[11px] font-bold text-slate-400 pointer-events-none">%</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCharge(chg.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    <datalist id="gst-rates-table">
                      <option value="0">0% (Nil)</option>
                      <option value="5">5% (Essential)</option>
                      <option value="12">12% (Standard)</option>
                      <option value="18">18% (Standard Services/Goods)</option>
                      <option value="28">28% (Luxury / Sin)</option>
                    </datalist>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={handleAddChargeRow}
                        className="text-xs font-bold text-[#174B43] hover:text-[#26A58A] flex items-center gap-1 cursor-pointer"
                      >
                        <span>+ Add Additional Charges</span>
                      </button>

                      {/* Add Discount Toggle */}
                      {!showOverallDiscount ? (
                        <button
                          type="button"
                          onClick={() => {
                            setShowOverallDiscount(true);
                            setOverallDiscountPercent(0);
                            setOverallDiscountAmount(0);
                          }}
                          className="text-xs font-bold text-[#174B43] hover:text-[#26A58A] flex items-center gap-1 cursor-pointer"
                        >
                          <span>+ Add Discount</span>
                        </button>
                      ) : null}
                    </div>

                    {/* Overall Discount Input Strip */}
                    {showOverallDiscount && (
                      <div className="flex items-center gap-2 pt-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <select
                          value={discountTiming}
                          onChange={(e) =>
                            setDiscountTiming(e.target.value as "AFTER_TAX" | "BEFORE_TAX")
                          }
                          className="text-xs p-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
                        >
                          <option value="AFTER_TAX">After Tax</option>
                          <option value="BEFORE_TAX">Before Tax</option>
                        </select>
                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 w-20">
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
                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 flex-1">
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
                            setOverallDiscountPercent("");
                            setOverallDiscountAmount("");
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Calculations Line Breakdown */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Taxable Amount</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {formatInr(totalTaxable)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-600">
                      <span>
                        GST Breakdown ({isInterState ? "IGST" : "CGST + SGST"})
                      </span>
                      <span className="font-mono font-semibold text-slate-900">
                        {formatInr(totalTax)}
                      </span>
                    </div>

                    {totalAdditionalCharges > 0 && (
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Additional Charges</span>
                        <span className="font-mono font-semibold text-slate-900">
                          +{formatInr(totalAdditionalCharges)}
                        </span>
                      </div>
                    )}

                    {discValue > 0 && (
                      <div className="flex justify-between items-center text-rose-600 font-medium">
                        <span>Overall Discount</span>
                        <span className="font-mono">
                          -{formatInr(discValue)}
                        </span>
                      </div>
                    )}

                    {/* Auto Round Off */}
                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={autoRoundOff}
                          onChange={(e) => setAutoRoundOff(e.target.checked)}
                          className="rounded text-[#174B43]"
                        />
                        <span>Auto Round Off</span>
                      </label>
                      <span className="font-mono text-slate-600">
                        {roundOff >= 0 ? `+${roundOff.toFixed(2)}` : roundOff.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Grand Total Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-[#174B43] to-[#1F5E54] text-white space-y-1 shadow-md">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                        Total Invoice Amount
                      </span>
                      <span className="text-2xl font-black font-mono tracking-tight text-white">
                        {formatInr(roundedGrandTotal)}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-100/90 italic truncate pt-1 border-t border-white/10">
                      {numberToWordsINR(roundedGrandTotal)}
                    </p>
                  </div>
                </div>

                {/* Payment Recording & Balance Settlement Card */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E2E8E5] p-5 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#1A2E2B] tracking-tight">
                      Payment Settlement
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-900">
                      Received: {formatInr(effectiveReceived)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-7 flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                      <span className="text-slate-400 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        value={isFullyPaid ? roundedGrandTotal : amountReceived}
                        disabled={isFullyPaid}
                        onChange={(e) => setAmountReceived(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full text-xs bg-transparent font-mono font-bold text-slate-900 focus:outline-none disabled:text-slate-500"
                      />
                    </div>

                    <div className="sm:col-span-5">
                      <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="CASH">Cash</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="UPI_QR">UPI</option>
                        <option value="CHEQUE">Cheque</option>
                        <option value="UNPAID_CREDIT">Credit (Unpaid)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={isFullyPaid}
                        onChange={(e) => {
                          setIsFullyPaid(e.target.checked);
                          if (e.target.checked) {
                            setAmountReceived(roundedGrandTotal);
                          }
                        }}
                        className="rounded text-[#174B43]"
                      />
                      <span>Mark as fully paid</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setSplitRows([
                          { mode: "CASH", amount: effectiveReceived || roundedGrandTotal },
                          { mode: "UPI_QR", amount: 0 },
                          { mode: "BANK_TRANSFER", amount: 0 },
                        ]);
                        setIsSplitPaymentOpen(true);
                      }}
                      className="text-[#174B43] hover:text-[#26A58A] font-bold underline cursor-pointer"
                    >
                      + Split Payment
                    </button>
                  </div>

                  {/* Balance Indicator Banner */}
                  <div className={`p-3 rounded-xl border flex items-center justify-between ${
                    balanceAmount === 0
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-amber-50 border-amber-200 text-amber-900"
                  }`}>
                    <span className="text-xs font-bold">
                      {balanceAmount === 0 ? "✓ Fully Settled" : "⏳ Balance Due"}
                    </span>
                    <span className="text-sm font-black font-mono">
                      {formatInr(balanceAmount)}
                    </span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </main>

      {/* FLOATING HELP BUTTON (?) matching MyBillBook */}
      <button
        type="button"
        onClick={() => alert("Need help creating an invoice? Contact support at 9510442798 or visit help docs.")}
        className="fixed bottom-6 right-6 w-10 h-10 rounded-full bg-slate-900 text-white shadow-xl flex items-center justify-center text-sm font-black hover:bg-slate-800 transition-all z-40"
        title="Help & Support"
      >
        ?
      </button>

      {/* CREATE NEW PARTY MODAL (Exact MyBillBook Tabs & Layout) */}
      {isCreatePartyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Create New Party</h2>
              <button
                type="button"
                onClick={() => setIsCreatePartyModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Body: Left Tabs + Right Form */}
            <div className="flex-1 overflow-hidden flex">
              
              {/* Left Navigation Column */}
              <div className="w-56 bg-slate-50 border-r border-slate-200 p-3 space-y-1">
                <button
                  type="button"
                  onClick={() => setPartyModalTab("basic")}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
                    partyModalTab === "basic"
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>👤</span>
                  <span>Basic Details *</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPartyModalTab("address")}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
                    partyModalTab === "address"
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>📍</span>
                  <span>Address</span>
                </button>

                <div className="pt-3 pb-1 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Advance Details
                </div>

                <button
                  type="button"
                  onClick={() => setPartyModalTab("credit")}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors ${
                    partyModalTab === "credit"
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>💳</span>
                  <span>Credit Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPartyModalTab("contact")}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors ${
                    partyModalTab === "contact"
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>📞</span>
                  <span>Contact Person Details</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPartyModalTab("bank")}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors ${
                    partyModalTab === "bank"
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>🏛️</span>
                  <span>Party Bank Account</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPartyModalTab("custom")}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors ${
                    partyModalTab === "custom"
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>🏷️</span>
                  <span>Custom Fields</span>
                </button>
              </div>

              {/* Right Form Container */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 text-xs">
                {partyModalTab === "basic" && (
                  <>
                    {/* Party Type Radio Cards & Category */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Party Type *
                        </label>
                        <div className="flex items-center gap-2">
                          <label
                            onClick={() =>
                              setPartyFormData({ ...partyFormData, type: "CUSTOMER" })
                            }
                            className={`flex-1 p-2.5 rounded-xl border flex items-center justify-between cursor-pointer font-bold ${
                              partyFormData.type === "CUSTOMER"
                                ? "bg-blue-50/60 border-blue-600 text-blue-700"
                                : "bg-white border-slate-200 text-slate-700"
                            }`}
                          >
                            <span>Customer</span>
                            <span className="w-3.5 h-3.5 rounded-full border-2 border-blue-600 flex items-center justify-center">
                              {partyFormData.type === "CUSTOMER" && (
                                <span className="w-2 h-2 rounded-full bg-blue-600" />
                              )}
                            </span>
                          </label>
                          <label
                            onClick={() =>
                              setPartyFormData({ ...partyFormData, type: "SUPPLIER" })
                            }
                            className={`flex-1 p-2.5 rounded-xl border flex items-center justify-between cursor-pointer font-bold ${
                              partyFormData.type === "SUPPLIER"
                                ? "bg-blue-50/60 border-blue-600 text-blue-700"
                                : "bg-white border-slate-200 text-slate-700"
                            }`}
                          >
                            <span>Supplier</span>
                            <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-400 flex items-center justify-center">
                              {partyFormData.type === "SUPPLIER" && (
                                <span className="w-2 h-2 rounded-full bg-blue-600" />
                              )}
                            </span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Party Category
                        </label>
                        <select
                          value={partyFormData.category}
                          onChange={(e) =>
                            setPartyFormData({ ...partyFormData, category: e.target.value })
                          }
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none"
                        >
                          <option value="">Search Categories</option>
                          <option value="Retail">Retail</option>
                          <option value="Wholesale">Wholesale</option>
                          <option value="Distributor">Distributor</option>
                        </select>
                      </div>
                    </div>

                    {/* Party Name & Mobile */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Party Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Enter Name"
                          value={partyFormData.name}
                          onChange={(e) =>
                            setPartyFormData({ ...partyFormData, name: e.target.value })
                          }
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Mobile Number
                        </label>
                        <input
                          type="text"
                          placeholder="Enter Mobile Number"
                          value={partyFormData.phone}
                          onChange={(e) =>
                            setPartyFormData({ ...partyFormData, phone: e.target.value })
                          }
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* GSTIN & PAN */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          GSTIN
                        </label>
                        <input
                          type="text"
                          placeholder="EX: 29XXXXX94381XX"
                          value={partyFormData.gstin}
                          onChange={(e) =>
                            setPartyFormData({ ...partyFormData, gstin: e.target.value.toUpperCase() })
                          }
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:bg-white focus:outline-none"
                        />
                        <p className="text-[10px] text-blue-600 mt-1">
                          Note: You can auto populate party details from GSTIN
                        </p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          PAN Number
                        </label>
                        <input
                          type="text"
                          placeholder="Enter PAN Number"
                          value={partyFormData.panNumber}
                          onChange={(e) =>
                            setPartyFormData({ ...partyFormData, panNumber: e.target.value.toUpperCase() })
                          }
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Email & Opening Balance */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          placeholder="Enter Email"
                          value={partyFormData.email}
                          onChange={(e) =>
                            setPartyFormData({ ...partyFormData, email: e.target.value })
                          }
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Opening Balance
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 flex-1">
                            <span className="text-slate-400 font-bold">₹</span>
                            <input
                              type="number"
                              value={partyFormData.openingBalance}
                              onChange={(e) =>
                                setPartyFormData({
                                  ...partyFormData,
                                  openingBalance: Number(e.target.value) || 0,
                                })
                              }
                              className="w-full text-xs bg-transparent font-mono font-bold focus:outline-none"
                            />
                          </div>
                          <select
                            value={partyFormData.balanceType}
                            onChange={(e) =>
                              setPartyFormData({
                                ...partyFormData,
                                balanceType: e.target.value as "TO_COLLECT" | "TO_PAY",
                              })
                            }
                            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none"
                          >
                            <option value="TO_COLLECT">To Collect</option>
                            <option value="TO_PAY">To Pay</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {partyModalTab === "address" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Billing Address
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Street, locality, building name..."
                        value={partyFormData.billingLine1}
                        onChange={(e) =>
                          setPartyFormData({ ...partyFormData, billingLine1: e.target.value })
                        }
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          value={partyFormData.billingCity}
                          onChange={(e) =>
                            setPartyFormData({ ...partyFormData, billingCity: e.target.value })
                          }
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          State
                        </label>
                        <input
                          type="text"
                          value={partyFormData.billingState}
                          onChange={(e) =>
                            setPartyFormData({ ...partyFormData, billingState: e.target.value })
                          }
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Pincode
                        </label>
                        <input
                          type="text"
                          value={partyFormData.billingPincode}
                          onChange={(e) =>
                            setPartyFormData({ ...partyFormData, billingPincode: e.target.value })
                          }
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {partyModalTab === "credit" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Credit Limit (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="0 (Unlimited)"
                        value={partyFormData.creditLimit}
                        onChange={(e) =>
                          setPartyFormData({
                            ...partyFormData,
                            creditLimit: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Credit Period (Days)
                      </label>
                      <input
                        type="number"
                        placeholder="30"
                        value={partyFormData.creditDays}
                        onChange={(e) =>
                          setPartyFormData({
                            ...partyFormData,
                            creditDays: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                      />
                    </div>
                  </div>
                )}

                {partyModalTab === "contact" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Contact Person Name
                      </label>
                      <input
                        type="text"
                        placeholder="Manager / Accountant Name"
                        value={partyFormData.contactPersonName}
                        onChange={(e) =>
                          setPartyFormData({
                            ...partyFormData,
                            contactPersonName: e.target.value,
                          })
                        }
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Contact Person Phone
                      </label>
                      <input
                        type="text"
                        placeholder="Phone Number"
                        value={partyFormData.contactPersonPhone}
                        onChange={(e) =>
                          setPartyFormData({
                            ...partyFormData,
                            contactPersonPhone: e.target.value,
                          })
                        }
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                      />
                    </div>
                  </div>
                )}

                {partyModalTab === "bank" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Bank Name
                        </label>
                        <input
                          type="text"
                          placeholder="HDFC / SBI / ICICI"
                          value={partyFormData.bankName}
                          onChange={(e) =>
                            setPartyFormData({ ...partyFormData, bankName: e.target.value })
                          }
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Account Number
                        </label>
                        <input
                          type="text"
                          placeholder="Account Number"
                          value={partyFormData.accountNumber}
                          onChange={(e) =>
                            setPartyFormData({
                              ...partyFormData,
                              accountNumber: e.target.value,
                            })
                          }
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        IFSC Code
                      </label>
                      <input
                        type="text"
                        placeholder="HDFC0000123"
                        value={partyFormData.ifscCode}
                        onChange={(e) =>
                          setPartyFormData({
                            ...partyFormData,
                            ifscCode: e.target.value.toUpperCase(),
                          })
                        }
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                      />
                    </div>
                  </div>
                )}

                {partyModalTab === "custom" && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-center">
                    No custom fields configured for this tenant.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsCreatePartyModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveNewParty(true)}
                  disabled={isCreatingParty}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  Save & New
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveNewParty(false)}
                  disabled={isCreatingParty}
                  className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isCreatingParty ? "Saving..." : "Save"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SPLIT PAYMENT MODAL */}
      {isSplitPaymentOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Split Payment Mode</h3>
              <button
                type="button"
                onClick={() => setIsSplitPaymentOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex justify-between items-center text-xs">
              <span className="text-blue-900 font-semibold">Total Amount:</span>
              <span className="font-mono font-black text-blue-900 text-base">
                {formatInr(roundedGrandTotal)}
              </span>
            </div>

            <div className="space-y-3">
              {splitRows.map((sr, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-24 text-xs font-bold text-slate-700">
                    {sr.mode === "CASH"
                      ? "Cash"
                      : sr.mode === "UPI_QR"
                      ? "UPI"
                      : "Bank Transfer"}
                  </span>
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 flex-1">
                    <span className="text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={sr.amount}
                      onChange={(e) => {
                        const updated = [...splitRows];
                        updated[idx].amount = Number(e.target.value) || 0;
                        setSplitRows(updated);
                      }}
                      className="w-full text-xs bg-transparent font-mono font-bold focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Split Sum and Action */}
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-600 font-bold">Total Split Entered:</span>
              <span className="font-mono font-bold text-slate-900">
                {formatInr(
                  splitRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
                )}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                const totalSplit = splitRows.reduce(
                  (sum, r) => sum + (Number(r.amount) || 0),
                  0
                );
                setAmountReceived(totalSplit);
                setIsFullyPaid(totalSplit >= roundedGrandTotal);
                setIsSplitPaymentOpen(false);
              }}
              className="w-full py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-colors"
            >
              Apply Split Payment
            </button>
          </div>
        </div>
      )}

      {/* BARCODE SCANNER MODAL SIMULATION */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center">
            <h3 className="font-bold text-base text-slate-900">Scan Product Barcode</h3>
            <div className="h-44 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-4">
              <span className="text-3xl mb-2 animate-bounce">📷</span>
              <p className="text-xs text-slate-500">Camera / USB Scanner Ready</p>
            </div>
            <button
              onClick={() => {
                handleAddRow();
                setIsScannerOpen(false);
              }}
              className="w-full py-2 bg-blue-600 text-white font-bold text-xs rounded-xl"
            >
              Simulate Scan & Add Row
            </button>
            <button
              onClick={() => setIsScannerOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* LIVE PREVIEW MODAL POPUP */}
      <InvoiceLivePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        customization={customization}
        lang={lang}
        invoiceData={{
          category,
          invoiceNumber,
          invoiceDate,
          paymentMode,
          placeOfSupply,
          partyName: selectedParty?.name || "Cash Customer / Walk-in",
          partyGstin: selectedParty?.gstin,
          partyPhone: selectedParty?.phone,
          partyAddress: selectedParty?.address,
          companyName: currentCompany?.tradeName || currentCompany?.legalName || "MODI CHAI",
          companyGstin: currentCompany?.gstin || "24AAAAA0000A1Z5",
          companyState: currentCompany?.stateCode ? `Gujarat (${currentCompany.stateCode})` : "Gujarat (24)",
          notes,
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
          roundedGrandTotal,
          isTaxInclusive,
          isInterState,
        }}
      />

      {/* Confetti Animation Canvas */}
      <ConfettiCanvas
        active={isConfettiActive}
        onComplete={() => setIsConfettiActive(false)}
      />

      {/* Add Items to Bill Catalog Modal */}
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
            unit: "PCS",
          };
        })}
        onAddSelectedItems={(selected) => {
          const isFirstEmpty =
            rows.length === 0 ||
            (rows.length === 1 &&
              !rows[0].itemId &&
              (!rows[0].quantity || rows[0].quantity === 1));

          const newRows: InvoiceItemRow[] = selected.map((s, idx) => {
            const partyPrice = partyId
              ? getPartyItemPrice(partyId, s.item.id, selectedParty?.name, s.item.name)
              : null;
            return {
              rowId: `row-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
              itemId: s.item.id,
              hsnCode: s.item.hsnCode || "1001",
              quantity: s.quantity,
              unit: s.item.unit || "PCS",
              unitPrice: partyPrice !== null ? partyPrice : s.unitPrice,
              discountPercent: 0,
              taxRate: s.item.taxRate ?? 5,
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

      {/* Quick Settings Modal */}
      <QuickSettingsModal
        isOpen={isQuickSettingsOpen}
        onClose={() => setIsQuickSettingsOpen(false)}
        settings={quickSettings}
        initialTab={quickSettingsTab}
        onSave={handleSaveQuickSettings}
      />

      {/* MOBILE STICKY BOTTOM ACTION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2.5 shadow-xl flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">Total Amount</span>
          <span className="text-base font-black font-mono text-slate-900 truncate block">
            {formatInr(roundedGrandTotal)}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleSubmit(false, true)}
            disabled={isSubmitting}
            className="px-3 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-colors disabled:opacity-50"
          >
            Save & New
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(false, false)}
            disabled={isSubmitting}
            className="px-5 py-2 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSubmitting ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-16 sm:bottom-6 right-4 sm:right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 border border-slate-700">
          <span>✅</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Add Signature Modal */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSaveSignature={(sig) => setSignatureData(sig)}
        existingSignature={signatureData}
      />
    </div>
  );
}
