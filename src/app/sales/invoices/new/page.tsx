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
  itemId: string;
  hsnCode: string;
  quantity: number | "";
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

  // Left AI Panel State
  const [showAiPanel, setShowAiPanel] = useState(true);
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
        quantity: 1,
        unitPrice: effectiveUnitPrice,
        discountPercent: 0,
        taxRate: firstItem?.taxRate ?? quickSettings.defaultTaxRate ?? 5,
      },
    ]);
  };

  const handleRemoveRow = (idx: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== idx));
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
    <div className="min-h-screen bg-[#F0F2F5] pb-24 text-slate-800">
      {/* TOP BAR: Exact MyBillBook Style with Mode Switcher & Exit */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs px-3 sm:px-6 py-2.5">
        <div className="w-full flex items-center justify-between gap-2 sm:gap-4 min-w-0">
          
          {/* Left: Exit & Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href="/sales/invoices"
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 shadow-2xs transition-colors shrink-0"
            >
              <span>←</span>
              <span>Exit</span>
            </Link>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
              Create Sales Invoice
            </h1>
          </div>

          {/* Center: Edit Mode / Preview Mode Switcher (Hidden on small mobile) */}
          <div className="hidden md:flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("edit")}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
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
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
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
              className="p-1.5 sm:p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 text-sm transition-colors cursor-pointer"
              title="Quick Settings (Sequence, Prefix, Custom Fields)"
            >
              ⚙️
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(false, true)}
              disabled={isSubmitting}
              className="hidden sm:inline-flex px-3 sm:px-4 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg shadow-2xs transition-colors disabled:opacity-50"
            >
              Save & New
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(false, false)}
              disabled={isSubmitting}
              className="px-4 sm:px-6 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="hidden sm:inline">Saving...</span>
                  <span className="sm:hidden">...</span>
                </>
              ) : (
                <span>Save</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsShortcutsOpen(true)}
              className="hidden md:inline-flex p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 text-sm transition-colors cursor-pointer"
              title="Keyboard Shortcuts"
            >
              ⌨️
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER: FULL SCREEN WIDE LAYOUT */}
      <div className="w-full px-4 sm:px-6 py-4">
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-rose-500 hover:text-rose-700 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {viewMode === "preview" ? (
          /* PREVIEW MODE CANVAS */
          <div className="space-y-4 max-w-4xl mx-auto">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">Preview Mode • Standard Tax Invoice (A4)</span>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded">Ready to Print</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                >
                  <span>🖨️</span>
                  <span>Print Invoice</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("edit")}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs cursor-pointer"
                >
                  ✏️ Back to Edit
                </button>
              </div>
            </div>

            {/* A4 Tax Invoice Document Sheet */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {currentCompany?.tradeName || currentCompany?.legalName || "MODI CHAI"}
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    GSTIN: <span className="font-mono font-bold">{currentCompany?.gstin || "24AAAAA0000A1Z5"}</span>
                  </p>
                  <p className="text-xs text-slate-600">
                    State: Gujarat (24) • Phone: 9510442798
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 font-black text-xs uppercase tracking-wider rounded-md mb-2">
                    TAX INVOICE
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

              <div className="grid grid-cols-2 gap-6 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
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

              {/* Preview Items Table */}
              <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-[#0E1726] text-white">
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

              {/* Amount in words and Totals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pt-2">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Total Amount In Words:
                  </span>
                  <p className="text-xs font-bold text-slate-900">
                    {numberToWordsINR(roundedGrandTotal)}
                  </p>
                </div>

                <div className="space-y-1.5 text-xs bg-slate-50/60 p-3.5 rounded-xl border border-slate-200">
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
                    <span className="font-mono font-black text-blue-700">{formatInr(roundedGrandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Bank Details & Terms & Signature */}
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
                    For {currentCompany?.tradeName || currentCompany?.legalName || "MODI CHAI"}
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
          /* EDIT MODE (EXACT 2-COLUMN LAYOUT WITH COLLAPSIBLE AI PANEL) */
          <div className="flex flex-col lg:flex-row items-start gap-4 w-full">
            
            {/* COLLAPSED AI REOPEN BUTTON (Exact MyBillBook style when AI panel is closed) */}
            {!showAiPanel && (
              <div className="shrink-0 pt-0.5">
                <button
                  id="btn-show-ai-panel"
                  type="button"
                  onClick={() => setShowAiPanel(true)}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F47721] to-[#E65F12] text-white flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer group"
                  title="Open AI Autofill (Mira AI)"
                  aria-label="Open AI Autofill"
                >
                  <svg
                    className="w-5 h-5 text-white group-hover:rotate-12 transition-transform"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                    <path d="M7 12h10" />
                    <path d="M12 9v6" />
                  </svg>
                </button>
              </div>
            )}

            {/* LEFT COLUMN: AUTOFILL THIS BILL (MIRA AI) */}
            {showAiPanel && (
              <div className="w-full lg:w-[320px] shrink-0 space-y-3.5 transition-all">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs relative">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F47721] to-[#E65F12] text-white flex items-center justify-center shadow-xs shrink-0">
                        <svg
                          className="w-4 h-4 text-white"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                          <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                          <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                          <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                          <path d="M7 12h10" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-xs font-bold text-slate-900 leading-tight">
                          Autofill this bill
                        </h2>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-[#DC2626] text-white text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                        <span>🕒</span>
                        <span>FREE • {remainingScans} LEFT</span>
                      </span>
                      <button
                        id="btn-hide-ai-panel"
                        type="button"
                        onClick={() => setShowAiPanel(false)}
                        className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                        title="Hide AI panel"
                        aria-label="Hide AI panel"
                      >
                        <span className="text-base font-bold leading-none">✕</span>
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Stats row matching MyBillBook reference */}
                  <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-600">
                    <div className="flex items-center gap-1 font-medium">
                      <span>📋</span>
                      <span><strong>{scannedBillsCount}</strong> bills scanned</span>
                    </div>
                    <div className="flex items-center gap-1 font-medium justify-end text-orange-600">
                      <span>⏰</span>
                      <span><strong>~{timeSavedMinutes} mins</strong> saved</span>
                    </div>
                  </div>

                  {/* Live Processing Card */}
                  {isAiProcessing ? (
                    <div className="mt-3.5 border-2 border-dashed border-orange-400 bg-orange-50/90 rounded-xl p-5 text-center">
                      <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-orange-100 flex items-center justify-center text-2xl animate-spin">
                        🔍
                      </div>
                      <p className="text-xs font-bold text-orange-950">
                        Scanning Document...
                      </p>
                      <p className="text-lg font-black font-mono text-orange-600 mt-1">
                        {scanDurationSeconds}s
                      </p>
                      <div className="w-full bg-orange-200 rounded-full h-1.5 overflow-hidden my-2">
                        <div className="bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 h-1.5 w-full animate-pulse" />
                      </div>
                      <p className="text-[11px] font-medium text-orange-800">
                        {scanProgressText || "AI Gemini Vision is extracting fields..."}
                      </p>
                      <div className="mt-3 p-2 bg-amber-100/80 border border-amber-300 rounded-lg text-[10px] text-amber-900 font-medium">
                        ⚠️ Please check the details actively. AI can make mistakes.
                      </div>
                    </div>
                  ) : uploadedFile ? (
                    /* Scanned / Uploaded Thumbnail Card */
                    <div className="mt-3.5 border-2 border-emerald-400 bg-emerald-50/70 rounded-xl p-4 text-left space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">📄</span>
                          <div className="truncate max-w-[150px]">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {uploadedFile.name}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {(uploadedFile.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                          ✓ 1/1 scanned
                        </span>
                      </div>

                      {scannedSummaryTime && (
                        <div className="p-2 bg-white rounded-lg border border-emerald-200 text-[11px] text-emerald-800 flex items-center justify-between">
                          <span className="font-semibold">Scanned in {scannedSummaryTime}s!</span>
                          <span className="text-emerald-600 font-bold">✓ Autofilled</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => executeAiScan()}
                          className="flex-1 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-colors shadow-2xs"
                        >
                          ↻ Re-scan
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUploadedFile(null);
                            setScannedSummaryTime(null);
                            setScanSuccessBanner(null);
                            setScanError(null);
                          }}
                          className="py-1.5 px-3 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg text-xs font-bold transition-colors shadow-2xs"
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
                      className={`mt-3.5 border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                        isDragOver
                          ? "border-orange-500 bg-orange-100/70 scale-[1.02]"
                          : "border-[#F38A71] bg-[#FFF5F2] hover:bg-[#FFEAE4]"
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <div className="text-2xl mb-1.5 animate-bounce">📄</div>
                      <p className="text-xs font-bold text-[#E05335]">
                        {isDragOver ? "Drop file here to scan" : "Drag & Drop or Upload file"}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        (PDF, JPG, JPEG & PNG file supported, max 5MB)
                      </p>
                    </div>
                  )}

                  {/* Proceed Button */}
                  {!scannedSummaryTime && (
                    <button
                      type="button"
                      disabled={!uploadedFile || isAiProcessing}
                      onClick={() => executeAiScan()}
                      className={`w-full mt-3 py-2.5 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 ${
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
                          <span>{uploadedFile ? "Proceed & Autofill Bill" : "Proceed"}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* How it works card */}
                {showHowItWorks && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="text-blue-500">ℹ️</span> How it works?
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowHowItWorks(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs p-0.5 rounded cursor-pointer"
                        title="Dismiss"
                      >
                        ✕
                      </button>
                    </div>
                    <ul className="text-[11px] text-slate-600 space-y-2">
                      <li className="flex items-center gap-2">
                        <span className="text-orange-500 font-bold">1.</span>
                        <span>Upload invoice document</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-orange-500 font-bold">2.</span>
                        <span>AI scans & extracts items & GST</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-500 font-bold">3.</span>
                        <span>Fields auto-filled instantly</span>
                      </li>
                    </ul>
                  </div>
                )}

                {/* Quick Tips */}
                <div className="bg-[#FFFDF9] rounded-2xl border border-amber-200 p-3.5 shadow-2xs space-y-1.5">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-amber-900">
                    <span>💡</span> Quick Tips
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    PDF uploads give more accurate results than camera captured photos - try it next time.
                  </p>
                  <div className="flex items-center justify-center gap-1 pt-1 text-[8px] text-amber-400">
                    <span className="text-amber-600 font-bold">●</span>
                    <span>○</span>
                    <span>○</span>
                  </div>
                </div>
              </div>
            )}

            {/* RIGHT MAIN INVOICE CANVAS (Matching MyBillBook) */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 space-y-5">

                {/* AI Shimmering Skeleton during Scanning */}
                {isAiProcessing && (
                  <div className="space-y-4 animate-pulse pb-2">
                    <div className="p-4 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-xl text-white flex items-center justify-between shadow-md">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center animate-spin text-base">
                          🔍
                        </div>
                        <div>
                          <p className="font-bold text-xs">
                            Mira AI Scanning in progress • <span className="font-mono text-sm underline">{scanDurationSeconds}s</span>
                          </p>
                          <p className="text-[11px] text-white/90">
                            {scanProgressText || "Extracting customer name, GSTIN, invoice date and line items..."}
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-wider">
                        AI Processing
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                        <div className="h-3 bg-slate-200 rounded w-1/4" />
                        <div className="h-5 bg-slate-200 rounded w-3/4" />
                        <div className="h-3 bg-slate-200 rounded w-1/2" />
                        <div className="h-3 bg-slate-200 rounded w-2/3" />
                      </div>
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                        <div className="h-3 bg-slate-200 rounded w-1/3" />
                        <div className="grid grid-cols-2 gap-3">
                          <div className="h-8 bg-slate-200 rounded" />
                          <div className="h-8 bg-slate-200 rounded" />
                        </div>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-4 space-y-3">
                      <div className="h-3 bg-slate-200 rounded w-1/6" />
                      <div className="space-y-2">
                        <div className="h-8 bg-slate-200 rounded w-full" />
                        <div className="h-8 bg-slate-200 rounded w-full" />
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Scan Success / Error Notifications */}
                {scanSuccessBanner && (
                  <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium shadow-xs">
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
                  <div className="flex items-center justify-between p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium shadow-xs">
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
                
                {/* ROW 1: BILL TO & INVOICE DETAILS CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Left Box: Bill To */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2.5 relative">
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-xs font-bold text-slate-800">Bill To</span>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickSettingsTab("party");
                          setIsQuickSettingsOpen(true);
                        }}
                        className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                        title="Customize Party Fields & Balance"
                      >
                        ⚙️
                      </button>
                    </div>

                    {/* Party Input trigger / Dropdown exactly matching MyBillBook */}
                    <div className="relative">
                      {!isPartyDropdownOpen && selectedParty ? (
                        <div className="p-3 border border-slate-200 rounded-xl bg-slate-50/60 space-y-2 relative">
                          <div className="flex items-start justify-between">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-slate-900 leading-tight">
                                  {selectedParty.name}
                                </p>
                                {isPartyNewlyScanned && (
                                  <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded uppercase tracking-wider animate-pulse">
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
                                        : "text-emerald-600 font-bold"
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
                              className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                            >
                              Change
                            </button>
                          </div>
                          {selectedParty.phone && (
                            <p className="text-xs text-slate-600">Phone: {selectedParty.phone}</p>
                          )}
                          {selectedParty.gstin && (
                            <p className="text-xs text-slate-600 font-mono">
                              GSTIN: {selectedParty.gstin}
                            </p>
                          )}
                          {selectedParty.address && (
                            <p className="text-xs text-slate-500 truncate">{selectedParty.address}</p>
                          )}

                          {/* Separate Shipping Address */}
                          {quickSettings.showShippingAddress && (
                            <div className="pt-2 border-t border-slate-200/60">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                Shipping Address (Ship-To)
                              </label>
                              <textarea
                                rows={2}
                                value={shippingAddress}
                                onChange={(e) => setShippingAddress(e.target.value)}
                                placeholder="Enter shipping address if different from billing..."
                                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500"
                              />
                            </div>
                          )}

                          {/* Contact Person Details */}
                          {quickSettings.showContactPerson && (
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                  Contact Person
                                </label>
                                <input
                                  type="text"
                                  value={contactPersonName}
                                  onChange={(e) => setContactPersonName(e.target.value)}
                                  placeholder="Name"
                                  className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500"
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
                                  className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500"
                                />
                              </div>
                            </div>
                          )}

                          {/* Custom Party Fields */}
                          {quickSettings.customPartyFields && quickSettings.customPartyFields.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                              {quickSettings.customPartyFields.map((field) => (
                                <div key={field.id}>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                    {field.label}
                                  </label>
                                  <input
                                    type="text"
                                    value={customFieldValues[field.id] || ""}
                                    onChange={(e) =>
                                      setCustomFieldValues({
                                        ...customFieldValues,
                                        [field.id]: e.target.value,
                                      })
                                    }
                                    placeholder={`Enter ${field.label}`}
                                    className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : !isPartyDropdownOpen && !selectedParty ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsPartyDropdownOpen(true);
                            setPartySearchTerm("");
                          }}
                          className="w-full py-7 border-2 border-dashed border-blue-400 bg-blue-50/30 hover:bg-blue-50/70 transition-colors rounded-xl flex items-center justify-center cursor-pointer min-h-[96px] shadow-2xs"
                        >
                          <span className="text-blue-600 font-bold text-xs flex items-center gap-1.5">
                            <span className="text-base font-black">+</span>
                            <span>Add Party</span>
                          </span>
                        </button>
                      ) : (
                        <div>
                          {/* Search party input */}
                          <div className="relative">
                            <input
                              type="text"
                              autoFocus
                              value={partySearchTerm}
                              onChange={(e) => {
                                setPartySearchTerm(e.target.value);
                                setIsPartyDropdownOpen(true);
                              }}
                              placeholder="Search party by name or number"
                              className="w-full text-xs p-2.5 bg-slate-50 border-2 border-blue-400 rounded-xl text-slate-900 focus:bg-white focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setIsPartyDropdownOpen(false)}
                              className="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-600"
                            >
                              ✕
                            </button>
                          </div>

                          {/* Dropdown Menu with Party Name and Balance columns */}
                          {isPartyDropdownOpen && (
                            <div className="absolute left-0 right-0 top-12 z-50 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-72 flex flex-col">
                              {/* Header row */}
                              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                <span>Party Name</span>
                                {quickSettings.showPartyBalance && <span>Balance</span>}
                              </div>

                              {/* Rows list */}
                              <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
                                {filteredParties.length === 0 ? (
                                  <div className="p-3 text-center text-xs text-slate-500">
                                    No parties found matching &quot;{partySearchTerm}&quot;
                                  </div>
                                ) : (
                                  filteredParties.map((p) => {
                                    const bal = p.outstandingBalance ?? 0;
                                    return (
                                      <div
                                        key={p.id}
                                        onClick={() => handlePartyChange(p.id)}
                                        className="flex items-center justify-between px-3 py-2.5 hover:bg-blue-50/60 cursor-pointer transition-colors text-xs"
                                      >
                                        <div>
                                          <p className="font-bold text-slate-900">{p.name}</p>
                                          <p className="text-[10px] text-slate-500">
                                            {p.phone || p.gstin || "Cash Customer"}
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
                                              <span className="text-emerald-600 flex items-center gap-1 justify-end">
                                                <span>{formatInr(Math.abs(bal))}</span>
                                                <span>↓</span>
                                              </span>
                                            ) : (
                                              <span className="text-slate-500">₹ 0</span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>

                              {/* Bottom: + Create Party dashed button */}
                              <div className="p-2 border-t border-slate-100 bg-white">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsPartyDropdownOpen(false);
                                    setIsCreatePartyModalOpen(true);
                                  }}
                                  className="w-full py-2 border-2 border-dashed border-blue-400 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50/50 transition-colors"
                                >
                                  + Create Party
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Box: Invoice Details */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-xs font-bold text-slate-800">Invoice Details</span>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={repeatInvoice}
                            onChange={(e) => setRepeatInvoice(e.target.checked)}
                            className="rounded text-blue-600 focus:ring-0"
                          />
                          <span>Repeat this Invoice</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setQuickSettingsTab("invoice");
                            setIsQuickSettingsOpen(true);
                          }}
                          className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                          title="Customize Invoice Fields"
                        >
                          ⚙️
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Sales Invoice No.
                        </label>
                        <input
                          type="text"
                          value={invoiceNumber}
                          onChange={(e) => setInvoiceNumber(e.target.value)}
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:bg-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Sales Invoice Date
                        </label>
                        <input
                          type="date"
                          value={invoiceDate}
                          onChange={(e) => setInvoiceDate(e.target.value)}
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* PO Details when enabled */}
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
                            placeholder="e.g. PO-2026-01"
                            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:bg-white focus:outline-none"
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
                            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:bg-white focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Vehicle & E-Way Bill when enabled */}
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
                              placeholder="e.g. GJ-01-AB-1234"
                              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono uppercase text-slate-900 focus:bg-white focus:outline-none"
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
                              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:bg-white focus:outline-none"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Custom Invoice Fields */}
                    {quickSettings.customInvoiceFields && quickSettings.customInvoiceFields.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="grid grid-cols-2 gap-3">
                          {quickSettings.customInvoiceFields.map((field) => (
                            <div key={field.id}>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                {field.label}
                              </label>
                              <input
                                type="text"
                                value={customFieldValues[field.id] || ""}
                                onChange={(e) =>
                                  setCustomFieldValues({
                                    ...customFieldValues,
                                    [field.id]: e.target.value,
                                  })
                                }
                                placeholder={`Enter ${field.label}`}
                                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:bg-white focus:outline-none"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Date Change Warning Alert */}
                    {isInvoiceDateChanged && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start gap-1.5 leading-snug">
                        <span className="text-sm">⚠️</span>
                        <span>
                          Changing the invoice date can cause invoice numbering and GSTR-1 mismatches with prior filings.
                        </span>
                      </div>
                    )}

                    {/* Expandable: + Add Due Date */}
                    {!showDueDate ? (
                      <button
                        type="button"
                        onClick={() => setShowDueDate(true)}
                        className="w-full py-2 border-2 border-dashed border-blue-400 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50/40 transition-colors"
                      >
                        + Add Due Date
                      </button>
                    ) : (
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 gap-3 relative">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                            Payment Terms
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={paymentTermsDays}
                              onChange={(e) => {
                                const days = Number(e.target.value) || 0;
                                setPaymentTermsDays(days);
                                const d = new Date(invoiceDate || new Date());
                                d.setDate(d.getDate() + days);
                                setDueDate(d.toISOString().split("T")[0]);
                              }}
                              className="w-16 text-xs p-1.5 bg-white border border-slate-200 rounded-md text-right font-mono"
                            />
                            <span className="text-xs text-slate-500">Days</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                            Due Date
                          </label>
                          <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-md font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ROW 2: ITEMS TABLE (Exact MyBillBook Columns & Styling) */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                      <thead className="bg-[#F8F9FA] text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">NO</th>
                          <th className="py-2.5 px-3 min-w-[240px]">ITEMS</th>
                          {quickSettings.showHsnColumn && (
                            <th className="py-2.5 px-3 w-24 text-center">HSN</th>
                          )}
                          <th className="py-2.5 px-3 w-20 text-right">QTY</th>
                          <th className="py-2.5 px-3 w-28 text-right">PRICE/ITEM (₹)</th>
                          {quickSettings.showDiscountColumn && (
                            <th className="py-2.5 px-3 w-24 text-right">DISCOUNT</th>
                          )}
                          {quickSettings.showTaxColumn && (
                            <th className="py-2.5 px-3 w-24 text-right">TAX</th>
                          )}
                          <th className="py-2.5 px-3 w-28 text-right">AMOUNT (₹)</th>
                          <th className="py-2.5 px-2 w-10 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setQuickSettingsTab("items");
                                setIsQuickSettingsOpen(true);
                              }}
                              className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                              title="Customize Items Table Columns & Settings"
                            >
                              ⚙️
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={
                                5 +
                                (quickSettings.showHsnColumn ? 1 : 0) +
                                (quickSettings.showDiscountColumn ? 1 : 0) +
                                (quickSettings.showTaxColumn ? 1 : 0)
                              }
                              className="p-3"
                            >
                              <button
                                type="button"
                                onClick={() => setIsAddItemsModalOpen(true)}
                                className="w-full py-4 border-2 border-dashed border-blue-400 bg-blue-50/30 hover:bg-blue-50/70 transition-colors rounded-xl text-xs font-bold text-blue-600 flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                              >
                                <span className="text-base font-black">+</span>
                                <span>Add Item</span>
                              </button>
                            </td>
                          </tr>
                        ) : (
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
                              <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                {/* NO */}
                                <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                                  {idx + 1}
                                </td>

                                {/* ITEMS */}
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-1.5">
                                    <select
                                      value={row.itemId}
                                      onChange={(e) => handleItemSelect(idx, e.target.value)}
                                      className="flex-1 text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-900 focus:bg-white focus:outline-none"
                                    >
                                      {items.map((it) => (
                                        <option key={it.id} value={it.id}>
                                          {it.name} (Stock: {it.stockQuantity ?? 0})
                                        </option>
                                      ))}
                                    </select>
                                    {newlyScannedItemIndices.includes(idx) && (
                                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded uppercase tracking-wider shrink-0 animate-pulse">
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
                                      className="w-full text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-md text-center font-mono text-slate-800 focus:bg-white focus:outline-none"
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
                                    className="w-full text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-md text-right font-mono font-bold text-slate-900 focus:bg-white focus:outline-none"
                                  />
                                </td>

                                {/* PRICE/ITEM */}
                                <td className="py-2.5 px-3">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={row.unitPrice}
                                    onChange={(e) => handleRowChange(idx, "unitPrice", e.target.value)}
                                    className="w-full text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-md text-right font-mono font-bold text-slate-900 focus:bg-white focus:outline-none"
                                  />
                                  {partyId && row.itemId && getPartyItemPrice(partyId, row.itemId, selectedParty?.name) !== null && (
                                    <div className="flex justify-end mt-1">
                                      <span
                                        title={`Party specific price active for ${selectedParty?.name || "this party"}`}
                                        className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-1 py-0.5 rounded shadow-2xs"
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
                                      className="w-full text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-md text-right font-mono text-slate-700 focus:bg-white focus:outline-none"
                                    />
                                  </td>
                                )}

                                {/* TAX */}
                                {quickSettings.showTaxColumn && (
                                  <td className="py-2.5 px-3">
                                    <select
                                      value={row.taxRate}
                                      onChange={(e) => handleRowChange(idx, "taxRate", Number(e.target.value))}
                                      className="w-full text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-md text-right font-mono font-semibold text-slate-800 focus:bg-white focus:outline-none"
                                    >
                                      <option value="0">0%</option>
                                      <option value="5">5%</option>
                                      <option value="12">12%</option>
                                      <option value="18">18%</option>
                                      <option value="28">28%</option>
                                    </select>
                                  </td>
                                )}

                                {/* AMOUNT */}
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                  {formatInr(lineTotal)}
                                </td>

                                {/* ACTIONS */}
                                <td className="py-2.5 px-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveRow(idx)}
                                    disabled={rows.length <= 1}
                                    className="text-slate-400 hover:text-rose-600 disabled:opacity-20 transition-colors cursor-pointer"
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

                  {/* + Add Item & Scan Barcode Action Strip */}
                  {/* <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setIsAddItemsModalOpen(true)}
                      className="flex-1 py-2 bg-blue-50/70 border-2 border-dashed border-blue-400 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-100/70 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <span className="text-sm">+</span>
                      <span>Add Items to Bill</span>
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
                      id="btn-scan-barcode"
                      type="button"
                      onClick={() => setIsAddItemsModalOpen(true)}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
                    >
                      <span>📷</span>
                      <span>Scan Barcode</span>
                    </button>
                  </div> */}

                  {/* Subtotal Strip */}
                  <div className="bg-[#F8F9FA] border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 font-medium">
                    <span className="font-bold text-slate-900">Subtotal</span>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-6 font-mono text-slate-700">
                      <span>Total Qty: <strong>{totalQty}</strong></span>
                      <span>Discount: <strong>{formatInr(totalDiscountAmt)}</strong></span>
                      <span>Tax: <strong>{formatInr(totalTax)}</strong></span>
                      <span className="font-bold text-slate-900 text-sm">
                        {formatInr(itemsSubtotal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ROW 3: BOTTOM SECTION (2 COLUMNS: NOTES/TERMS & TOTALS/PAYMENT) */}
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
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Notes / Remarks</label>
                        <textarea
                          rows={2}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Special instructions or notes for the customer..."
                          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none"
                        />
                      </div>
                    )}

                    {/* Terms & Conditions Box */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">Terms & Conditions</span>
                        <span className="text-xs text-slate-400">⚙️</span>
                      </div>
                      <textarea
                        rows={3}
                        value={termsAndConditions}
                        onChange={(e) => setTermsAndConditions(e.target.value)}
                        className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:outline-none"
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
                        <span>+ Add Bank Account</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPaymentQr(!showPaymentQr)}
                        className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>📱</span>
                        <span>+ Add Payment QR</span>
                      </button>
                    </div>

                    {showBankAccount && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1">
                        <p className="font-bold text-slate-900">Bank Details Included on Invoice:</p>
                        <p>Bank: <strong>HDFC Bank</strong> • A/c: <strong>50200012345678</strong></p>
                        <p>IFSC: <strong>HDFC0000123</strong> • Branch: Ahmedabad Main</p>
                      </div>
                    )}

                    {showPaymentQr && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1">
                        <p className="font-bold text-slate-900">UPI QR Code Enabled:</p>
                        <p>Dynamic UPI QR will be printed directly on this invoice for instant payment.</p>
                      </div>
                    )}
                  </div>

                  {/* Right Column (5 cols): Additional Charges, Round Off, Grand Total, Payments */}
                  <div className="lg:col-span-5 space-y-3.5">
                    
                    {/* Add Additional Charges - EXACT MyBillBook Inline Expansion */}
                    <div className="space-y-2 text-xs">
                      {additionalCharges.map((chg) => (
                        <div key={chg.id} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Enter charge"
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
                            <option value="0">No Tax Applicable</option>
                            <option value="5">GST @ 5%</option>
                            <option value="12">GST @ 12%</option>
                            <option value="18">GST @ 18%</option>
                            <option value="28">GST @ 28%</option>
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
                        <span>🔄</span>
                        <span>{additionalCharges.length === 0 ? "+ Add Additional Charges" : "+ Add Another Charge"}</span>
                      </button>

                      {/* Taxable Amount */}
                      <div className="flex justify-between items-center text-slate-600 pt-1">
                        <span>Taxable Amount</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {formatInr(totalTaxable)}
                        </span>
                      </div>

                      {/* Add Discount - EXACT MyBillBook Inline Expansion */}
                      {!showOverallDiscount ? (
                        <button
                          type="button"
                          onClick={() => {
                            setShowOverallDiscount(true);
                            setOverallDiscountPercent(0);
                            setOverallDiscountAmount(0);
                          }}
                          className="font-bold text-blue-600 hover:underline flex items-center gap-1.5 cursor-pointer pt-1"
                        >
                          <span>%</span>
                          <span>+ Add Discount</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 pt-1">
                          <select
                            value={discountTiming}
                            onChange={(e) =>
                              setDiscountTiming(e.target.value as "AFTER_TAX" | "BEFORE_TAX")
                            }
                            className="text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
                          >
                            <option value="AFTER_TAX">After Tax</option>
                            <option value="BEFORE_TAX">Before Tax</option>
                          </select>
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
                              setOverallDiscountPercent("");
                              setOverallDiscountAmount("");
                            }}
                            className="text-slate-400 hover:text-rose-600 text-sm p-1"
                          >
                            ⨂
                          </button>
                        </div>
                      )}

                      {/* Auto Round Off */}
                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={autoRoundOff}
                            onChange={(e) => setAutoRoundOff(e.target.checked)}
                            className="rounded text-blue-600"
                          />
                          <span>Auto Round Off</span>
                        </label>
                        <span className="font-mono text-slate-600">
                          {roundOff >= 0 ? `+${roundOff.toFixed(2)}` : roundOff.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Total Amount Display (Prominent) */}
                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-base font-bold text-slate-900">Total Amount:</span>
                      <span className="text-2xl font-black font-mono text-slate-900">
                        {formatInr(roundedGrandTotal)}
                      </span>
                    </div>

                    {/* Total Amount Received & Payment Mode */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">Total Amount Received</span>
                        <span className="text-xs font-mono font-bold text-slate-900">
                          {formatInr(effectiveReceived)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-bold text-xs">₹</span>
                        <input
                          type="number"
                          value={isFullyPaid ? roundedGrandTotal : amountReceived}
                          disabled={isFullyPaid}
                          onChange={(e) => setAmountReceived(Number(e.target.value) || 0)}
                          placeholder="0"
                          className="flex-1 text-xs p-2 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-900 disabled:bg-slate-100"
                        />
                        <select
                          value={paymentMode}
                          onChange={(e) => setPaymentMode(e.target.value)}
                          className="text-xs p-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800 focus:outline-none"
                        >
                          <option value="CASH">Cash</option>
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                          <option value="CHEQUE">Cheque</option>
                          <option value="UPI_QR">UPI</option>
                          <option value="UNPAID_CREDIT">Credit (Unpaid)</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                          <input
                            type="checkbox"
                            checked={isFullyPaid}
                            onChange={(e) => {
                              setIsFullyPaid(e.target.checked);
                              if (e.target.checked) {
                                setAmountReceived(roundedGrandTotal);
                              }
                            }}
                            className="rounded text-blue-600"
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
                          className="text-blue-600 font-bold hover:underline cursor-pointer"
                        >
                          + Split Payment
                        </button>
                      </div>
                    </div>

                    {/* Balance Amount Indicator */}
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="font-bold text-slate-700">Balance Amount</span>
                      <span className={`font-mono font-black text-sm ${balanceAmount === 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {formatInr(balanceAmount)}
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
                          className="w-full h-20 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50 hover:bg-slate-50 flex flex-col items-center justify-center text-xs text-slate-500 cursor-pointer transition-colors"
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
              </div>
            </div>
          </div>
        )}
      </div>

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

          const newRows: InvoiceItemRow[] = selected.map((s) => {
            const partyPrice = partyId
              ? getPartyItemPrice(partyId, s.item.id, selectedParty?.name, s.item.name)
              : null;
            return {
              itemId: s.item.id,
              hsnCode: s.item.hsnCode || "1001",
              quantity: s.quantity,
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
