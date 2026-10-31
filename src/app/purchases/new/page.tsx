"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";
import { Modal } from "../../../components/ui/modal";
import { BillScannerModal } from "../components/bill-scanner-modal";
import { InvoiceQrCode, InvoiceBarcode } from "../components/invoice-barcode-qr";
import {
  QuickSettingsModal,
  DEFAULT_QUICK_SETTINGS,
  DEFAULT_PURCHASE_QUICK_SETTINGS,
  QuickSettingsConfig,
} from "@/components/invoice/quick-settings-modal";
import { ShortcutsModal } from "@/components/invoice/shortcuts-modal";
import { AddItemsModal, CatalogItem } from "@/components/invoice/add-items-modal";
import { INDIAN_STATES } from "@billing/shared-types";

interface SupplierOption {
  id: string;
  name: string;
  nameGujarati?: string;
  gstin?: string;
  stateCode: string;
  phone?: string;
  email?: string;
  type?: string;
  billingAddress?: {
    line1?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  currentBalance?: number;
}

interface ItemOption {
  id: string;
  name: string;
  nameGujarati?: string;
  sku?: string;
  hsnCode: string;
  taxRate: number;
  purchasePrice?: number;
  retailPrice?: number;
  stockQuantity?: number;
  primaryUom?: {
    id: string;
    symbol: string;
    name: string;
  };
}

interface WarehouseOption {
  id: string;
  name: string;
  isDefault?: boolean;
}

interface PurchaseRow {
  itemId: string;
  itemName?: string;
  description?: string;
  hsnCode: string;
  mrp: number | "";
  unit: string;
  quantity: number | "";
  freeQuantity?: number | "";
  showFreeQty?: boolean;
  unitPrice: number | "";
  discountValue: number | "";
  discountType: "%" | "₹";
  discountPercent?: number | "";
  taxRate: number;
}

interface CompanyProfile {
  id: string;
  legalName: string;
  tradeName?: string;
  gstin?: string;
  pan?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  district?: string;
  pincode?: string;
  stateCode?: string;
  phone?: string;
  email?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankIfsc?: string;
  bankBranch?: string;
  upiVpa?: string;
}

const createEmptyPurchaseRow = (): PurchaseRow => ({
  itemId: "",
  itemName: "",
  description: "",
  hsnCode: "",
  mrp: "",
  unit: "PCS",
  quantity: 1,
  freeQuantity: "",
  showFreeQty: false,
  unitPrice: "",
  discountValue: "",
  discountType: "%",
  taxRate: 18,
});

function NewPurchaseInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang, tenantContext, currentCompany, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialRowFilled = useRef(false);

  // Dynamic Reference Dependencies
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [cashBankAccounts, setCashBankAccounts] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [totalBillsRecorded, setTotalBillsRecorded] = useState<number>(0);

  // Page States
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // View / Edit Mode Toggle
  const [activeMode, setActiveMode] = useState<"EDIT" | "PREVIEW">("EDIT");

  // Collapsible AI Autofill Left Drawer (open by default, matching myBillBook)
  const [isAutofillDrawerOpen, setIsAutofillDrawerOpen] = useState(true);
  const [uploadedDocUrl, setUploadedDocUrl] = useState<string | null>(null);
  const [uploadedDocName, setUploadedDocName] = useState<string | null>(null);
  const [uploadedDocType, setUploadedDocType] = useState<string | null>(null);
  const [uploadedDocFile, setUploadedDocFile] = useState<File | null>(null);
  const [selectedDropFile, setSelectedDropFile] = useState<File | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(true);
  const [tipIndex, setTipIndex] = useState(0);
  const [lastScanRecord, setLastScanRecord] = useState<any>(null);
  const [isAnalyzingDoc, setIsAnalyzingDoc] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState("");
  const [scanStepIndex, setScanStepIndex] = useState(0);
  const [autofilledFieldsHighlight, setAutofilledFieldsHighlight] = useState(false);
  const [zoomPreviewModal, setZoomPreviewModal] = useState(false);

  // Scanner Modal (full-page AI scanner modal)
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [scannerInitialRecord, setScannerInitialRecord] = useState<any | null>(null);

  const handleOpenSmartScanner = () => {
    setScannerInitialRecord(null); // Fresh scan: opens upload & camera directly!
    setIsScannerModalOpen(true);
  };

  const handleOpenScanReview = () => {
    setScannerInitialRecord(lastScanRecord); // Side-by-side review of previous scan
    setIsScannerModalOpen(true);
  };

  // Modals & Popovers
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [isEditSupplierModalOpen, setIsEditSupplierModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isAddItemsCatalogOpen, setIsAddItemsCatalogOpen] = useState(false);
  const [activeItemRowIdx, setActiveItemRowIdx] = useState<number | null>(null);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [partySearchTerm, setPartySearchTerm] = useState("");
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [customShippingAddress, setCustomShippingAddress] = useState("");
  const [showDueDateField, setShowDueDateField] = useState(false);
  const [paymentTermsDays, setPaymentTermsDays] = useState<number | null>(null);
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);
  const [quickSettingsTab, setQuickSettingsTab] = useState<"invoice" | "party" | "items">("invoice");
  const companyKey = tenantContext?.companyId || currentCompany?.id || "default";
  const purchaseStorageKey = `billing_purchase_quick_settings_${companyKey}`;
  const [quickSettings, setQuickSettings] = useState<QuickSettingsConfig>(DEFAULT_PURCHASE_QUICK_SETTINGS);

  // Quick settings dynamic custom fields
  const [poNumber, setPoNumber] = useState("");
  const [poDate, setPoDate] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [ewayBillNumber, setEwayBillNumber] = useState("");
  const [contactPersonName, setContactPersonName] = useState("");
  const [contactPersonPhone, setContactPersonPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [customInvoiceFieldValues, setCustomInvoiceFieldValues] = useState<Record<string, string>>({});
  const [customPartyFieldValues, setCustomPartyFieldValues] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(purchaseStorageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          const merged: QuickSettingsConfig = { ...DEFAULT_PURCHASE_QUICK_SETTINGS, ...parsed };
          setQuickSettings(merged);

          // Apply prefix and sequence dynamically
          if (merged.enablePrefix && merged.invoicePrefix) {
            setPurchaseInvoiceNumber(`${merged.invoicePrefix}${merged.invoiceSequence || "0014"}`);
          } else if (merged.invoiceSequence) {
            setPurchaseInvoiceNumber(merged.invoiceSequence);
          }

          if (typeof merged.enableDueDate === "boolean") {
            setShowDueDateField(merged.enableDueDate);
          }
        } else {
          if (DEFAULT_PURCHASE_QUICK_SETTINGS.enablePrefix && DEFAULT_PURCHASE_QUICK_SETTINGS.invoicePrefix) {
            setPurchaseInvoiceNumber(
              `${DEFAULT_PURCHASE_QUICK_SETTINGS.invoicePrefix}${DEFAULT_PURCHASE_QUICK_SETTINGS.invoiceSequence}`
            );
          }
        }
      } catch (e) {
        console.error("Error loading purchase quick settings:", e);
      }
    }
  }, [purchaseStorageKey]);

  // Toast auto-dismiss effect
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleSaveQuickSettings = (newSettings: QuickSettingsConfig) => {
    setQuickSettings(newSettings);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(purchaseStorageKey, JSON.stringify(newSettings));
      } catch (e) {
        console.error("Error saving quick settings to localStorage:", e);
      }
    }

    // Apply prefix and sequence dynamically
    if (newSettings.enablePrefix && newSettings.invoicePrefix) {
      setPurchaseInvoiceNumber(`${newSettings.invoicePrefix}${newSettings.invoiceSequence || "0014"}`);
    } else if (newSettings.invoiceSequence) {
      setPurchaseInvoiceNumber(newSettings.invoiceSequence);
    }

    // Apply Due Date toggle
    setShowDueDateField(newSettings.enableDueDate);

    setToastMessage(
      lang === "gu"
        ? "ક્વિક સેટિંગ્સ સફળતાપૂર્વક લાગુ થયા!"
        : "Quick settings saved and applied successfully!"
    );
  };
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [showPhoneUploadModal, setShowPhoneUploadModal] = useState(false);
  const [showBarcodeScannerModal, setShowBarcodeScannerModal] = useState(false);
  const [barcodeInputValue, setBarcodeInputValue] = useState("");

  // Form Fields - Bill Meta
  const [partyId, setPartyId] = useState("");
  const [purchaseInvoiceNumber, setPurchaseInvoiceNumber] = useState("");
  const [vendorInvoiceNumber, setVendorInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState(
    currentCompany?.stateCode || "24"
  );
  const [itcEligibility, setITC] = useState("INPUT");
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [showTerms, setShowTerms] = useState(false);
  const [terms, setTerms] = useState("");

  // Additional Charges & Overall Discount
  const [showAdditionalCharges, setShowAdditionalCharges] = useState(false);
  const [additionalChargeType, setAdditionalChargeType] = useState("Freight & Delivery");
  const [additionalChargeAmount, setAdditionalChargeAmount] = useState<number | "">("");
  const [additionalChargeGstRate, setAdditionalChargeGstRate] = useState<number>(18);
  const [showOverallDiscount, setShowOverallDiscount] = useState(false);
  const [overallDiscountAmount, setOverallDiscountAmount] = useState<number | "">("");
  const [overallDiscountType, setOverallDiscountType] = useState<"%" | "₹">("%");
  const [autoRoundOff, setAutoRoundOff] = useState(true);

  // Bank Details Card Visibility
  const [showBankDetailsCard, setShowBankDetailsCard] = useState(false);

  // Payment Settlement
  const [paymentStatus, setPaymentStatus] = useState<
    "UNPAID_CREDIT" | "PAID_FULL" | "PARTIAL_PAID"
  >("UNPAID_CREDIT");
  const [paidAmount, setPaidAmount] = useState<number | "">("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [payAccountId, setPayAccountId] = useState("");
  const [payReference, setPayReference] = useState("");

  // Inline Supplier Form State
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierGstin, setNewSupplierGstin] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [newSupplierEmail, setNewSupplierEmail] = useState("");
  const [newSupplierStateCode, setNewSupplierStateCode] = useState("24");
  const [newSupplierCity, setNewSupplierCity] = useState("");
  const [newSupplierAddress, setNewSupplierAddress] = useState("");
  const [isSavingSupplier, setIsSavingSupplier] = useState(false);
  const [supplierError, setSupplierError] = useState<string | null>(null);

  // Inline Item Form State
  const [newItemName, setNewItemName] = useState("");
  const [newItemType, setNewItemType] = useState<"PRODUCT" | "SERVICE">("PRODUCT");
  const [newItemHsn, setNewItemHsn] = useState("1001");
  const [newItemTaxRate, setNewItemTaxRate] = useState<number>(18);
  const [newItemPurchasePrice, setNewItemPurchasePrice] = useState<number | "">("");
  const [newItemRetailPrice, setNewItemRetailPrice] = useState<number | "">("");
  const [newItemUomId, setNewItemUomId] = useState("");
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);

  // Line Item Rows (starts completely empty by default)
  const [rows, setRows] = useState<PurchaseRow[]>([createEmptyPurchaseRow()]);

  // Track if form is dirty for unsaved navigation prompt
  const [isDirty, setIsDirty] = useState(false);

  // Fetch all dependencies dynamically from API
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [
        partiesRes,
        itemsRes,
        whRes,
        ledgersRes,
        unitsRes,
        compRes,
        purchasesRes,
      ]: any = await Promise.all([
        apiClient.get("/masters/parties"),
        apiClient.get("/masters/items"),
        apiClient.get("/masters/warehouses"),
        apiClient.get("/accounting/ledgers", { nature: "ASSET", limit: 100 }),
        apiClient.get("/masters/units").catch(() => apiClient.get("/masters/units")).catch(() => []),
        apiClient.get("/tenants/company").catch(() => null),
        apiClient.get("/purchases/invoices", { limit: 100 }).catch(() => null),
      ]);

      const rawParties = extractList<SupplierOption>(partiesRes);
      const supplierList = rawParties.filter(
        (p) => !p.type || p.type === "SUPPLIER" || p.type === "BOTH" || p.type === "CUSTOMER"
      );
      const itemList = extractList<ItemOption>(itemsRes);
      const whList = extractList<WarehouseOption>(whRes);
      const ledgerRows = extractList<any>(ledgersRes);
      const cashBank = ledgerRows.filter((acc: any) =>
        /cash|bank/i.test(acc.name || "")
      );
      const unitList = extractList<any>(unitsRes);

      setSuppliers(supplierList);
      setItems(itemList);
      setWarehouses(whList);
      setCashBankAccounts(cashBank);
      setUnits(unitList);

      if (compRes) {
        setCompanyProfile(compRes);
        if (compRes.stateCode) {
          setPlaceOfSupply(compRes.stateCode);
        }
      }

      // Dynamic Bill Counter & Sequence
      const totalPurchases = purchasesRes?.items?.length ?? (Array.isArray(purchasesRes) ? purchasesRes.length : 0);
      setTotalBillsRecorded(totalPurchases);
      const currentYear = new Date().getFullYear().toString().slice(-2);
      const defaultSeq = (totalPurchases + 1).toString().padStart(4, "0");

      let resolvedInvoiceNo = "";
      if (typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem(purchaseStorageKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.enablePrefix && parsed.invoicePrefix) {
              resolvedInvoiceNo = `${parsed.invoicePrefix}${parsed.invoiceSequence || defaultSeq}`;
            } else if (parsed.invoiceSequence) {
              resolvedInvoiceNo = parsed.invoiceSequence;
            }
          }
        } catch { }
      }
      if (!resolvedInvoiceNo) {
        resolvedInvoiceNo = `PUR-${currentYear}-${defaultSeq}`;
      }
      setPurchaseInvoiceNumber(resolvedInvoiceNo);

      // Dynamic Terms with company name
      const compName = compRes?.tradeName || compRes?.legalName || currentCompany?.tradeName || "Godown";
      setTerms(
        `1. Goods received subject to physical count and quality verification at ${compName}.\n2. Payment terms as agreed with vendor.\n3. Goods receipt ledger credited upon verification.`
      );

      // Default warehouse
      if (whList.length > 0) {
        const def = whList.find((w) => w.isDefault) || whList[0];
        setWarehouseId(def.id);
      }

      // Default cash/bank account
      if (cashBank.length > 0) {
        setPayAccountId(cashBank[0].id);
      }

      // Default unit for inline modal
      if (unitList.length > 0) {
        setNewItemUomId(unitList[0].id);
      }

      // Auto-set supplier ONLY if explicitly preselected via query parameter
      const preselectedSupplierId = searchParams?.get("supplierId");
      if (preselectedSupplierId) {
        const matched = supplierList.find((s) => s.id === preselectedSupplierId);
        if (matched) {
          setPartyId(matched.id);
          if (matched.stateCode) {
            setPlaceOfSupply(matched.stateCode);
          }
        }
      }
      // Check for cloned purchase from localStorage
      if (typeof window !== "undefined") {
        const clonedStr = localStorage.getItem("billing_clone_purchase");
        if (clonedStr) {
          try {
            const clone = JSON.parse(clonedStr);
            localStorage.removeItem("billing_clone_purchase");
            if (clone.partyId) {
              setPartyId(clone.partyId);
              const matched = supplierList.find((s) => s.id === clone.partyId);
              if (matched?.stateCode) {
                setPlaceOfSupply(matched.stateCode);
              }
            }
            if (clone.placeOfSupply) setPlaceOfSupply(clone.placeOfSupply);
            if (clone.notes) setNotes(clone.notes);
            if (Array.isArray(clone.items) && clone.items.length > 0) {
              const mappedRows = clone.items.map((i: any) => ({
                id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                itemId: i.itemId || i.item?.id || "",
                itemName: i.item?.name || "",
                description: i.description || "",
                hsnCode: i.hsnCode || "1001",
                mrp: "",
                unit: "PCS",
                quantity: Number(i.quantity) || 1,
                unitPrice: Number(i.unitPrice) || 0,
                discountPercent: 0,
                taxRate: Number(i.taxRate) || 18,
                cessRate: 0,
              }));
              setRows(mappedRows);
            }
          } catch (e) {
            console.error("Failed to parse billing_clone_purchase:", e);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load purchase invoice master data.");
    } finally {
      setIsLoading(false);
    }
  }, [searchParams, currentCompany]);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchData();
    }
  }, [tenantContext.companyId]);

  // Open drawer automatically if ?scan=true in URL
  useEffect(() => {
    if (searchParams?.get("scan") === "true") {
      setIsAutofillDrawerOpen(true);
    }
  }, [searchParams]);

  // Sync place of supply when supplier changes
  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === partyId),
    [suppliers, partyId]
  );

  const handleSupplierChange = (newPartyId: string) => {
    setPartyId(newPartyId);
    setShowPartyDropdown(false);
    setIsDirty(true);
    const supp = suppliers.find((s) => s.id === newPartyId);
    if (supp?.stateCode) {
      setPlaceOfSupply(supp.stateCode);
    }
  };

  // Tax calculations
  const companyState = companyProfile?.stateCode || currentCompany?.stateCode || "24";
  const isInterState = placeOfSupply !== companyState;

  // Active Bank Details from Dynamic Data
  const activeBank = useMemo(() => {
    if (payAccountId) {
      const found = cashBankAccounts.find((a) => a.id === payAccountId);
      if (found) return found;
    }
    const bankAcc = cashBankAccounts.find((a) => /bank/i.test(a.name || ""));
    return bankAcc || cashBankAccounts[0] || null;
  }, [cashBankAccounts, payAccountId]);

  // Helper to construct a fresh blank row
  const createEmptyRow = createEmptyPurchaseRow;

  // Row operations
  const handleItemSelect = (idx: number, itId: string) => {
    setIsDirty(true);
    const updated = [...rows];
    if (!itId) {
      updated[idx] = createEmptyPurchaseRow();
      setRows(updated);
      return;
    }

    const item = items.find((i) => i.id === itId);
    if (!item) return;

    updated[idx] = {
      ...updated[idx],
      itemId: item.id,
      itemName: item.name,
      hsnCode: item.hsnCode || "1001",
      mrp: item.retailPrice !== undefined && item.retailPrice !== null ? item.retailPrice : "",
      unit: item.primaryUom?.symbol || updated[idx].unit || "PCS",
      unitPrice:
        item.purchasePrice !== undefined && item.purchasePrice !== null && item.purchasePrice > 0
          ? item.purchasePrice
          : "",
      quantity: updated[idx].quantity || 1,
      taxRate: item.taxRate ?? 18,
    };
    setRows(updated);
  };

  const handleRowChange = (
    idx: number,
    field: keyof PurchaseRow,
    val: any
  ) => {
    setIsDirty(true);
    const updated = [...rows];
    updated[idx] = { ...updated[idx], [field]: val };
    setRows(updated);
  };

  const handleAddRow = () => {
    setIsDirty(true);
    setRows([...rows, createEmptyRow()]);
  };

  const handleRemoveRow = (idx: number) => {
    setIsDirty(true);
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== idx));
    } else {
      // When only 1 row exists, clear/reset it to a fresh empty item
      setRows([createEmptyRow()]);
    }
  };

  const handleSetPaymentTerms = (days: number) => {
    setPaymentTermsDays(days);
    const baseDate = invoiceDate ? new Date(invoiceDate) : new Date();
    baseDate.setDate(baseDate.getDate() + days);
    setDueDate(baseDate.toISOString().split("T")[0]);
    setShowDueDateField(true);
    setIsDirty(true);
  };

  const quickTips = [
    "Ensure the image is clear and text is legible for best results.",
    "Verify GSTIN, HSN code and GST rates carefully before submitting.",
    "You can upload multi-page bills or capture directly from camera.",
  ];

  // Calculate live totals
  const totals = useMemo(() => {
    let grossSubtotal = 0;
    let totalDiscount = 0;
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalQuantity = 0;

    rows.forEach((r) => {
      // Skip empty blank rows from totals
      if (!r.itemId && (!r.unitPrice || Number(r.unitPrice) === 0)) return;
      const qty = Number(r.quantity) || 0;
      totalQuantity += qty;
      const rate = Number(r.unitPrice) || 0;
      const discVal = Number(r.discountValue) || 0;
      const gross = qty * rate;

      let discountVal = 0;
      if (quickSettings.showDiscountColumn) {
        if (r.discountType === "₹") {
          discountVal = discVal;
        } else {
          discountVal = (gross * discVal) / 100;
        }
      }

      let taxable = Math.max(0, gross - discountVal);
      const taxRate = quickSettings.showTaxColumn ? (Number(r.taxRate) || 0) : 0;
      let taxAmount = 0;

      if (quickSettings.isTaxInclusive && taxRate > 0) {
        const baseAmount = taxable / (1 + taxRate / 100);
        taxAmount = taxable - baseAmount;
        taxable = baseAmount;
      } else {
        taxAmount = (taxable * taxRate) / 100;
      }

      grossSubtotal += gross;
      totalDiscount += discountVal;
      totalTaxable += taxable;

      if (isInterState) {
        totalIgst += taxAmount;
      } else {
        totalCgst += taxAmount / 2;
        totalSgst += taxAmount / 2;
      }
    });

    // Overall bill discount
    if (showOverallDiscount && Number(overallDiscountAmount) > 0) {
      let overallDiscVal = 0;
      if (overallDiscountType === "₹") {
        overallDiscVal = Number(overallDiscountAmount);
      } else {
        overallDiscVal = (totalTaxable * Number(overallDiscountAmount)) / 100;
      }
      totalTaxable = Math.max(0, totalTaxable - overallDiscVal);
      totalDiscount += overallDiscVal;
    }

    // Additional charges calculation
    let addChargeVal = 0;
    let addChargeTax = 0;
    if (showAdditionalCharges && additionalChargeAmount) {
      addChargeVal = Number(additionalChargeAmount) || 0;
      addChargeTax = (addChargeVal * (Number(additionalChargeGstRate) || 0)) / 100;
      totalTaxable += addChargeVal;
      if (isInterState) {
        totalIgst += addChargeTax;
      } else {
        totalCgst += addChargeTax / 2;
        totalSgst += addChargeTax / 2;
      }
    }

    const totalTax = totalCgst + totalSgst + totalIgst;
    const rawGrandTotal = totalTaxable + totalTax;
    const roundedGrandTotal = autoRoundOff ? Math.round(rawGrandTotal) : Math.round(rawGrandTotal * 100) / 100;
    const roundOff = autoRoundOff ? roundedGrandTotal - rawGrandTotal : 0;

    return {
      grossSubtotal,
      totalDiscount,
      totalTaxable,
      totalCgst,
      totalSgst,
      totalIgst,
      totalTax,
      totalQuantity,
      roundOff,
      grandTotal: roundedGrandTotal,
    };
  }, [
    rows,
    isInterState,
    showAdditionalCharges,
    additionalChargeAmount,
    additionalChargeGstRate,
    showOverallDiscount,
    overallDiscountAmount,
    overallDiscountType,
    autoRoundOff,
    quickSettings,
  ]);

  // Adjust paid amount when payment status is PAID_FULL
  useEffect(() => {
    if (paymentStatus === "PAID_FULL") {
      setPaidAmount(totals.grandTotal);
    } else if (paymentStatus === "UNPAID_CREDIT") {
      setPaidAmount(0);
    }
  }, [paymentStatus, totals.grandTotal]);

  const effectivePaidAmount =
    paymentStatus === "UNPAID_CREDIT" ? 0 : Number(paidAmount) || 0;
  const balanceDue = Math.max(0, totals.grandTotal - effectivePaidAmount);

  const formatInr = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  // Helper to ensure an item exists in the company catalog, auto-creating if needed
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

    // 2. Check backend DB search
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

    // 3. Ensure valid primary UOM
    let primaryUomId = units[0]?.id;
    if (!primaryUomId) {
      try {
        const uomRes: any = await apiClient.get("/masters/units").catch(() => []);
        const uomList = extractList<any>(uomRes);
        if (uomList.length > 0) {
          setUnits(uomList);
          primaryUomId = uomList[0].id;
        }
      } catch {
        // ignore
      }
    }

    if (!primaryUomId) {
      try {
        const newUom: any = await apiClient.post("/masters/units", {
          name: "Pieces",
          symbol: "PCS",
          uqcCode: "PCS",
          decimalPlaces: 0,
        });
        if (newUom?.id) {
          setUnits([newUom]);
          primaryUomId = newUom.id;
        }
      } catch {
        // ignore
      }
    }

    // 4. Auto-create item in catalog
    try {
      const isService =
        (hsn && hsn.startsWith("99")) ||
        lower.includes("service") ||
        lower.includes("expense") ||
        lower.includes("charge");

      const created: any = await apiClient.post("/masters/items", {
        type: isService ? "SERVICE" : "PRODUCT",
        name: cleanName,
        hsnCode: hsn?.trim() || (isService ? "9983" : "1001"),
        primaryUomId,
        taxRate: Number(taxRate) || 0,
        purchaseRate: Number(rate) || 0,
        retailPrice: Number(rate) || 0,
      });

      if (created?.id) {
        setItems((prev) => [created, ...prev]);
        return created;
      }
    } catch (createErr) {
      console.error("Auto-create item failed:", createErr);
    }

    return null;
  };

  // OCR Auto-Fill Handler
  const handleTransferFromScanner = async (scannedData: {
    vendorInvoiceNumber?: string;
    invoiceDate?: string;
    dueDate?: string;
    partyId?: string;
    matchedParty?: any;
    supplierName?: string;
    supplierGstin?: string;
    supplierPhone?: string;
    supplierAddress?: string;
    placeOfSupply?: string;
    warehouseId?: string;
    grandTotal?: number;
    paymentStatus?: "UNPAID_CREDIT" | "PAID_FULL" | "PARTIAL_PAID";
    paidAmount?: number;
    items?: Array<{
      itemId?: string;
      itemName?: string;
      hsnCode?: string;
      unit?: string;
      quantity?: number;
      unitPrice?: number;
      taxRate?: number;
      discountAmount?: number;
    }>;
  }) => {
    setIsDirty(true);
    setActiveMode("EDIT"); // Always show editable form when autofilling from scan

    if (scannedData.vendorInvoiceNumber) {
      setVendorInvoiceNumber(scannedData.vendorInvoiceNumber);
    }
    if (scannedData.invoiceDate) {
      setInvoiceDate(scannedData.invoiceDate);
    }
    if (scannedData.dueDate) {
      setDueDate(scannedData.dueDate);
      setShowDueDateField(true);
    }

    // Party matching / creation logic
    let resolvedPartyId = scannedData.partyId || "";
    let resolvedSupplierObj: any = scannedData.matchedParty || null;

    // 1. If scan record included matchedParty object, register it into state immediately
    if (resolvedSupplierObj?.id) {
      resolvedPartyId = resolvedSupplierObj.id;
      setSuppliers((prev) =>
        prev.some((s) => s.id === resolvedSupplierObj.id) ? prev : [resolvedSupplierObj, ...prev]
      );
      if (resolvedSupplierObj.stateCode) setPlaceOfSupply(resolvedSupplierObj.stateCode);
    }

    // 2. If partyId was resolved, ensure party object exists in suppliers list
    if (resolvedPartyId) {
      let existing = suppliers.find((s) => s.id === resolvedPartyId);
      if (!existing && !resolvedSupplierObj) {
        try {
          const fetched: any = await apiClient.get(`/masters/parties/${resolvedPartyId}`);
          if (fetched?.id) {
            existing = fetched;
            resolvedSupplierObj = fetched;
            setSuppliers((prev) =>
              prev.some((s) => s.id === fetched.id) ? prev : [fetched, ...prev]
            );
            if (fetched.stateCode) setPlaceOfSupply(fetched.stateCode);
          }
        } catch {
          // Ignore
        }
      }

      if (existing && scannedData.supplierName) {
        const eName = existing.name.toLowerCase().trim();
        const sName = scannedData.supplierName.toLowerCase().trim();
        if (!eName.includes(sName) && !sName.includes(eName)) {
          // Discard false party match (e.g. matched on customer phone)
          resolvedPartyId = "";
          resolvedSupplierObj = null;
        } else {
          resolvedSupplierObj = existing;
        }
      }
    }

    // 3. If no resolved party yet, match against current suppliers state OR search database
    if (!resolvedPartyId && (scannedData.supplierName || scannedData.supplierGstin)) {
      const gstinLower = (scannedData.supplierGstin || "").trim().toLowerCase();
      const nameLower = (scannedData.supplierName || "").trim().toLowerCase();

      // Check current suppliers state first
      let found = suppliers.find((s) => {
        const sGstin = (s.gstin || "").trim().toLowerCase();
        const sName = (s.name || "").trim().toLowerCase();
        if (gstinLower && sGstin && sGstin === gstinLower) return true;
        if (nameLower && sName && (sName === nameLower || sName.includes(nameLower) || nameLower.includes(sName))) return true;
        return false;
      });

      // If not in local state, search backend DB
      if (!found && scannedData.supplierName && scannedData.supplierName.trim().length > 1) {
        try {
          const searchRes: any = await apiClient.get("/masters/parties", {
            search: scannedData.supplierName.trim(),
            limit: 10,
          });
          const searchList = extractList<SupplierOption>(searchRes);
          found = searchList.find((s) => {
            const sName = (s.name || "").trim().toLowerCase();
            const sGstin = (s.gstin || "").trim().toLowerCase();
            if (gstinLower && sGstin && sGstin === gstinLower) return true;
            if (nameLower && sName && (sName === nameLower || sName.includes(nameLower) || nameLower.includes(sName))) return true;
            return false;
          });
          if (found) {
            setSuppliers((prev) => (prev.some((s) => s.id === found!.id) ? prev : [found!, ...prev]));
          }
        } catch (searchErr) {
          console.warn("Party search error:", searchErr);
        }
      }

      if (found) {
        resolvedPartyId = found.id;
        resolvedSupplierObj = found;
        if (found.stateCode) setPlaceOfSupply(found.stateCode);
      } else if (scannedData.supplierName && scannedData.supplierName.trim().length > 1) {
        // Auto-create supplier party so user has zero manual work
        try {
          const newSupRes: any = await apiClient.post("/masters/parties", {
            type: "SUPPLIER",
            name: scannedData.supplierName.trim(),
            gstin: scannedData.supplierGstin?.trim() || undefined,
            phone: scannedData.supplierPhone?.trim() || undefined,
            stateCode: scannedData.placeOfSupply || "24",
            billingAddress: {
              line1: scannedData.supplierAddress?.trim() || "",
            },
          });
          if (newSupRes?.id) {
            setSuppliers((prev) => [newSupRes, ...prev]);
            resolvedPartyId = newSupRes.id;
            resolvedSupplierObj = newSupRes;
            if (newSupRes.stateCode) setPlaceOfSupply(newSupRes.stateCode);
          }
        } catch (createErr: any) {
          console.warn("Auto-create supplier note:", createErr);
          // If conflict (already exists in DB), re-fetch parties to get the existing one
          try {
            const refetchRes: any = await apiClient.get("/masters/parties", {
              search: scannedData.supplierName.trim(),
              limit: 5,
            });
            const list = extractList<SupplierOption>(refetchRes);
            if (list.length > 0) {
              const matched = list[0];
              setSuppliers((prev) => (prev.some((s) => s.id === matched.id) ? prev : [matched, ...prev]));
              resolvedPartyId = matched.id;
              resolvedSupplierObj = matched;
              if (matched.stateCode) setPlaceOfSupply(matched.stateCode);
            }
          } catch {
            // Ignore
          }
        }
      }
    }

    if (resolvedPartyId) {
      setPartyId(resolvedPartyId);
    }

    if (scannedData.placeOfSupply) {
      setPlaceOfSupply(scannedData.placeOfSupply);
    }
    if (scannedData.warehouseId) {
      setWarehouseId(scannedData.warehouseId);
    }

    // Map extracted items into editable invoice rows
    if (scannedData.items && scannedData.items.length > 0) {
      const mappedRows: PurchaseRow[] = scannedData.items.map((scannedItem) => {
        let resolvedItemId = scannedItem.itemId || "";
        let resolvedItem = items.find((i) => i.id === resolvedItemId);

        const targetName = (scannedItem.itemName || "").trim().toLowerCase();

        // Match only by item name / SKU, never blindly by HSN code alone
        if (!resolvedItem && targetName && targetName.length > 2) {
          resolvedItem = items.find(
            (i) =>
              i.name.toLowerCase() === targetName ||
              (targetName.length > 4 && i.name.toLowerCase().includes(targetName)) ||
              (i.name.length > 4 && targetName.includes(i.name.toLowerCase()))
          );
          if (resolvedItem) resolvedItemId = resolvedItem.id;
        }

        return {
          itemId: resolvedItemId,
          itemName: scannedItem.itemName || resolvedItem?.name || "",
          description: scannedItem.itemName || resolvedItem?.name || "",
          hsnCode: scannedItem.hsnCode || resolvedItem?.hsnCode || "9983",
          mrp: resolvedItem?.retailPrice ?? (Number(scannedItem.unitPrice) || 0),
          unit: scannedItem.unit || resolvedItem?.primaryUom?.symbol || "PCS",
          quantity: Number(scannedItem.quantity) || 1,
          freeQuantity: 0,
          showFreeQty: false,
          unitPrice:
            scannedItem.unitPrice !== undefined &&
              scannedItem.unitPrice !== null &&
              !isNaN(Number(scannedItem.unitPrice))
              ? Number(scannedItem.unitPrice)
              : (resolvedItem?.purchasePrice ?? 100),
          discountValue: Number(scannedItem.discountAmount) || 0,
          discountType: "%",
          taxRate: Number(scannedItem.taxRate ?? resolvedItem?.taxRate ?? 0),
        };
      });

      // Ensure any newly detected items are resolved or created in catalog immediately
      for (let idx = 0; idx < mappedRows.length; idx++) {
        if (!mappedRows[idx].itemId && (mappedRows[idx].itemName || mappedRows[idx].description)) {
          const resolved = await resolveOrCreateItem(
            mappedRows[idx].itemName || mappedRows[idx].description,
            mappedRows[idx].hsnCode,
            Number(mappedRows[idx].unitPrice) || 0,
            Number(mappedRows[idx].taxRate) || 0,
            mappedRows[idx].unit
          );
          if (resolved?.id) {
            mappedRows[idx].itemId = resolved.id;
            mappedRows[idx].itemName = resolved.name;
            mappedRows[idx].hsnCode = resolved.hsnCode || mappedRows[idx].hsnCode;
            mappedRows[idx].taxRate = resolved.taxRate ?? mappedRows[idx].taxRate;
          }
        }
      }
      setRows(mappedRows);
    } else if (scannedData.grandTotal && Number(scannedData.grandTotal) > 0) {
      // Synthesize single purchase item if receipt has grandTotal but no item breakdown
      const totalNum = Number(scannedData.grandTotal);
      const partyName =
        resolvedSupplierObj?.name ||
        suppliers.find((s) => s.id === resolvedPartyId)?.name ||
        scannedData.supplierName ||
        "";
      const synthName = partyName
        ? `${partyName} - Purchase Bill`
        : (lang === "gu" ? "ખરીદી બિલ / વાઉચર" : "Purchase Bill / Voucher");

      const synthItem = await resolveOrCreateItem(
        synthName,
        "9983",
        totalNum,
        0,
        "PCS"
      );

      setRows([
        {
          itemId: synthItem?.id || "",
          itemName: synthItem?.name || synthName,
          description: synthItem?.name || synthName,
          hsnCode: synthItem?.hsnCode || "9983",
          mrp: totalNum,
          unit: synthItem?.primaryUom?.symbol || "PCS",
          quantity: 1,
          freeQuantity: 0,
          showFreeQty: false,
          unitPrice: totalNum,
          discountValue: 0,
          discountType: "%",
          taxRate: synthItem?.taxRate ?? 0,
        },
      ]);
    }

    // Payment Settlement Autofill
    if (scannedData.paymentStatus) {
      setPaymentStatus(scannedData.paymentStatus);
      if (scannedData.paidAmount !== undefined) {
        setPaidAmount(Number(scannedData.paidAmount));
      }
    }

    // Highlight form fields that were populated
    setAutofilledFieldsHighlight(true);
    setTimeout(() => setAutofilledFieldsHighlight(false), 4000);

    const partyName =
      resolvedSupplierObj?.name ||
      suppliers.find((s) => s.id === resolvedPartyId)?.name ||
      scannedData.supplierName ||
      "";
    setSuccessBanner(
      lang === "gu"
        ? `✨ AI સ્કેન સફળ! બિલ વિગતો ફોર્મમાં ભરાઈ ગઈ: ${partyName ? partyName + ", " : ""}બિલ #${scannedData.vendorInvoiceNumber || ""}, ${scannedData.items?.length || 1} આઇટમ્સ`
        : `✨ AI Gemini Vision scan successful! Form populated: ${partyName ? partyName + ", " : ""}Invoice #${scannedData.vendorInvoiceNumber || ""}, ${scannedData.items?.length || 1} items extracted.`
    );
  };

  // Direct Left Drawer Upload Handler with Laser Scanning Progression
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadedDocUrl(url);
    const isPdfFile =
      file.type?.includes("pdf") ||
      file.name.toLowerCase().endsWith(".pdf");
    setUploadedDocType(isPdfFile ? "application/pdf" : file.type || "image/jpeg");
    setUploadedDocFile(file);
    setIsAnalyzingDoc(true);
    setScanStepIndex(0);

    const progressSteps = [
      lang === "gu" ? "દસ્તાવેજ વાંચી રહ્યું છે..." : "Reading document stream...",
      lang === "gu" ? "AI જેમિની વિઝન સ્કેન કરી રહ્યું છે..." : "AI Gemini Vision is analyzing invoice...",
      lang === "gu" ? "વેપારી અને GSTIN શોધી રહ્યું છે..." : "Detecting Supplier, GSTIN & Invoice #...",
      lang === "gu" ? "આઇટમ્સ, HSN અને ટેક્સ રેટ સ્કેન થાય છે..." : "Parsing items, HSN & tax rates...",
      lang === "gu" ? "ફોર્મમાં વિગતો ભરાઈ રહી છે..." : "Autofilling purchase invoice form...",
    ];

    let stepTimer = 0;
    const interval = setInterval(() => {
      stepTimer++;
      setScanStepIndex(stepTimer % progressSteps.length);
      setAnalysisProgress(progressSteps[stepTimer % progressSteps.length]);
    }, 1200);

    setAnalysisProgress(progressSteps[0]);

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

      setLastScanRecord(finalRecord);

      const ed = finalRecord?.extractedData;
      if (ed) {
        const inv = ed.invoice || {};
        const sup = ed.supplier || {};
        const fin = ed.financials || {};
        const itemsList = ed.items || [];
        const grandTotalVal = Number(fin.grandTotal || ed.sourceGrandTotal || 0);

        // Resolve invoice number: avoid generic "Screenshot from ..."
        const rawOcr = finalRecord?.rawOcrText || "";
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

        // Detect if receipt was already paid (e.g. Zepto / UPI Paid Successfully)
        const isPaid = /paid\s+successfully|paid\s+on|\bpaid\b/i.test(rawOcr) || /upi|gpay|phonepe|paytm/i.test(rawOcr);

        // If items are empty but grandTotalVal > 0, generate single item
        let finalItems = itemsList;
        if ((!finalItems || finalItems.length === 0) && grandTotalVal > 0) {
          const fallbackSupName = sup.name ? `${sup.name} - Purchase Bill` : (lang === "gu" ? "ખરીદી બિલ / વાઉચર" : "Purchase Bill / Expense");
          finalItems = [{
            description: fallbackSupName,
            hsnCode: "9983",
            unit: "PCS",
            quantity: 1,
            unitPrice: grandTotalVal,
            taxRate: 0,
            discountAmount: 0,
          }];
        }

        await handleTransferFromScanner({
          vendorInvoiceNumber: detectedInvNo || undefined,
          invoiceDate: inv.invoiceDate || ed.invoiceDate || new Date().toISOString().split("T")[0],
          dueDate: inv.dueDate || ed.dueDate || undefined,
          partyId: finalRecord.matchedPartyId || finalRecord.matchedSupplierId || sup.matchedPartyId || undefined,
          matchedParty: finalRecord.matchedParty || undefined,
          supplierName: sup.name || undefined,
          supplierGstin: sup.gstin || undefined,
          supplierPhone: sup.phone || undefined,
          supplierAddress: sup.address || undefined,
          placeOfSupply: inv.placeOfSupply || ed.placeOfSupply || undefined,
          grandTotal: grandTotalVal,
          paymentStatus: isPaid ? "PAID_FULL" : undefined,
          paidAmount: isPaid ? grandTotalVal : undefined,
          items: finalItems.map((it: any) => ({
            itemId: it.matchedItemId,
            itemName: it.description || it.itemName,
            hsnCode: it.hsnCode,
            unit: it.unit,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            taxRate: it.taxRate ?? it.gstRate,
            discountAmount: it.discountAmount ?? it.discount,
          })),
        });
      } else {
        // Fallback: extract basic info
        setVendorInvoiceNumber(file.name.replace(/\.[^/.]+$/, "").substring(0, 16));
        setActiveMode("EDIT");
      }
    } catch (uploadErr: any) {
      console.warn("Upload notice:", uploadErr);
      const fallbackInvNo = file.name.replace(/\.[^/.]+$/, "").substring(0, 16);
      setVendorInvoiceNumber(fallbackInvNo);
      setActiveMode("EDIT");
      setSuccessBanner(
        lang === "gu"
          ? "બિલ લોડ થયું. કૃપા કરીને વિગતો ચકાસો."
          : "Bill loaded into invoice editor! Please verify details."
      );
    } finally {
      clearInterval(interval);
      setIsAnalyzingDoc(false);
    }
  };

  // Quick Supplier Creation
  const handleSaveNewSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim()) {
      setSupplierError(
        lang === "gu" ? "વેપારીનું નામ જરૂરી છે." : "Supplier name is required."
      );
      return;
    }

    setIsSavingSupplier(true);
    setSupplierError(null);
    try {
      const res: any = await apiClient.post("/masters/parties", {
        type: "SUPPLIER",
        name: newSupplierName.trim(),
        phone: newSupplierPhone.trim() || undefined,
        email: newSupplierEmail.trim() || undefined,
        gstin: newSupplierGstin.trim() || undefined,
        stateCode: newSupplierStateCode || "24",
        billingAddress: {
          line1: newSupplierAddress.trim() || "",
          city: newSupplierCity.trim() || "",
          pincode: "",
        },
      });

      if (res?.id) {
        setSuppliers((prev) => [res, ...prev]);
        setPartyId(res.id);
        if (res.stateCode) {
          setPlaceOfSupply(res.stateCode);
        }
        setIsAddSupplierModalOpen(false);
        setNewSupplierName("");
        setNewSupplierGstin("");
        setNewSupplierPhone("");
        setNewSupplierEmail("");
        setNewSupplierAddress("");
        setNewSupplierCity("");
      }
    } catch (err: any) {
      setSupplierError(err.message || "Failed to create supplier.");
    } finally {
      setIsSavingSupplier(false);
    }
  };

  // Quick Item Creation
  const handleSaveNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      setItemError(
        lang === "gu" ? "વસ્તુનું નામ જરૂરી છે." : "Item name is required."
      );
      return;
    }

    setIsSavingItem(true);
    setItemError(null);
    try {
      const res: any = await apiClient.post("/masters/items", {
        type: newItemType,
        name: newItemName.trim(),
        hsnCode: newItemHsn.trim() || (newItemType === "SERVICE" ? "9983" : "1001"),
        primaryUomId: newItemUomId || (units[0]?.id ?? undefined),
        taxRate: Number(newItemTaxRate) || 0,
        purchaseRate: Number(newItemPurchasePrice) || 0,
        retailPrice: Number(newItemRetailPrice) || Number(newItemPurchasePrice) || 0,
      });

      if (res?.id) {
        setItems((prev) => [res, ...prev]);
        if (activeItemRowIdx !== null && activeItemRowIdx < rows.length) {
          const updated = [...rows];
          updated[activeItemRowIdx] = {
            ...updated[activeItemRowIdx],
            itemId: res.id,
            itemName: res.name,
            hsnCode: res.hsnCode || "1001",
            unit: res.primaryUom?.symbol || "PCS",
            unitPrice: res.purchasePrice ?? res.retailPrice ?? 0,
            taxRate: res.taxRate ?? 18,
          };
          setRows(updated);
        }
        setIsAddItemModalOpen(false);
        setNewItemName("");
        setNewItemPurchasePrice("");
        setNewItemRetailPrice("");
      }
    } catch (err: any) {
      setItemError(err.message || "Failed to create item.");
    } finally {
      setIsSavingItem(false);
    }
  };

  // Submit and Save Purchase Invoice
  const handleSubmit = async (andNew: boolean) => {
    setError(null);
    setSuccessBanner(null);

    // Validation
    if (!partyId) {
      setError(
        lang === "gu"
          ? "કૃપા કરીને વેપારી (સપ્લાયર) પસંદ કરો."
          : "Please select a supplier party."
      );
      return;
    }

    if (!vendorInvoiceNumber.trim()) {
      setError(
        lang === "gu"
          ? "સપ્લાયર બિલ નંબર દાખલ કરો."
          : "Vendor invoice number is required."
      );
      return;
    }

    setIsSubmitting(true);

    // 1. Auto-resolve or auto-create items in catalog for any rows that don't have itemId
    let currentRows = [...rows];
    let rowsUpdated = false;
    for (let i = 0; i < currentRows.length; i++) {
      const r = currentRows[i];
      const rName = (r.itemName || r.description || "").trim();
      if (!r.itemId && rName && Number(r.quantity) > 0) {
        try {
          const resolved = await resolveOrCreateItem(
            rName,
            r.hsnCode,
            Number(r.unitPrice),
            Number(r.taxRate),
            r.unit
          );
          if (resolved?.id) {
            currentRows[i] = {
              ...r,
              itemId: resolved.id,
              itemName: resolved.name,
              hsnCode: resolved.hsnCode || r.hsnCode || "9983",
              taxRate: resolved.taxRate ?? r.taxRate,
            };
            rowsUpdated = true;
          }
        } catch (itemErr) {
          console.warn("Item auto-resolve warning:", itemErr);
        }
      }
    }
    if (rowsUpdated) {
      setRows(currentRows);
    }

    const validRows = currentRows.filter(
      (r) => r.itemId && Number(r.quantity) > 0 && Number(r.unitPrice) >= 0
    );

    if (validRows.length === 0) {
      setIsSubmitting(false);
      setError(
        lang === "gu"
          ? "ઓછામાં ઓછી એક માન્ય વસ્તુ દાખલ કરો."
          : "Please add at least one line item with valid quantity and price."
      );
      return;
    }

    try {
      const payload = {
        partyId,
        vendorInvoiceNumber: vendorInvoiceNumber.trim(),
        invoiceDate: invoiceDate || new Date().toISOString().split("T")[0],
        placeOfSupply,
        warehouseId: warehouseId || undefined,
        itcEligibility,
        items: validRows.map((r) => {
          const qty = Number(r.quantity);
          const rate = Number(r.unitPrice);
          const disc = Number(r.discountValue) || 0;
          let discVal = 0;
          if (r.discountType === "₹") {
            discVal = disc;
          } else {
            discVal = (qty * rate * disc) / 100;
          }
          const taxable = Math.max(0, qty * rate - discVal);
          const effectiveRate = qty > 0 ? taxable / qty : rate;

          return {
            itemId: r.itemId,
            hsnCode: r.hsnCode || "1001",
            quantity: qty,
            unitPrice: effectiveRate,
            taxRate: Number(r.taxRate) || 0,
          };
        }),
      };

      const res: any = await apiClient.post("/purchases/invoices", payload);
      const savedInvoiceId = res?.id || res?.purchaseInvoice?.id;

      // Settlement if paid
      if (savedInvoiceId && effectivePaidAmount > 0) {
        try {
          await apiClient.post(
            `/purchases/${savedInvoiceId}/payments`,
            {
              amount: effectivePaidAmount.toFixed(2),
              paymentDate: paymentDate || invoiceDate,
              paymentMode,
              paidFromAccountId: payAccountId || undefined,
              referenceNo: payReference || undefined,
            },
            undefined,
            `pay_key_${savedInvoiceId}_${Date.now()}`
          );
        } catch (payErr: any) {
          console.warn("Payment allocation notice:", payErr);
        }
      }

      setIsDirty(false);

      if (andNew) {
        setVendorInvoiceNumber("");
        setDueDate("");
        setNotes("");
        setPaymentStatus("UNPAID_CREDIT");
        setPaidAmount("");
        const nextSeq = incrementSequenceNumber(quickSettings.invoiceSequence);
        const updatedSettings: QuickSettingsConfig = {
          ...quickSettings,
          invoiceSequence: nextSeq,
        };
        setQuickSettings(updatedSettings);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(purchaseStorageKey, JSON.stringify(updatedSettings));
          } catch { }
        }
        if (updatedSettings.enablePrefix && updatedSettings.invoicePrefix) {
          setPurchaseInvoiceNumber(`${updatedSettings.invoicePrefix}${nextSeq}`);
        } else if (updatedSettings.invoiceSequence) {
          setPurchaseInvoiceNumber(nextSeq);
        } else {
          const newCount = totalBillsRecorded + 1;
          setTotalBillsRecorded(newCount);
          const currentYear = new Date().getFullYear().toString().slice(-2);
          setPurchaseInvoiceNumber(`PUR-${currentYear}-${(newCount + 1).toString().padStart(4, "0")}`);
        }
        const firstItem = items[0];
        setRows([
          {
            itemId: firstItem?.id || "",
            itemName: firstItem?.name || "",
            description: "",
            hsnCode: firstItem?.hsnCode || "1001",
            mrp: firstItem?.retailPrice ?? 0,
            unit: firstItem?.primaryUom?.symbol || "PCS",
            quantity: 1,
            freeQuantity: 0,
            showFreeQty: false,
            unitPrice: firstItem?.purchasePrice ?? 100,
            discountValue: 0,
            discountType: "%",
            taxRate: firstItem?.taxRate ?? 18,
          },
        ]);
        setSuccessBanner(
          lang === "gu"
            ? `બિલ '${vendorInvoiceNumber.trim()}' સાચવવામાં આવ્યું! તમે નવું બિલ ભરી શકો છો.`
            : `Purchase bill '${vendorInvoiceNumber.trim()}' saved successfully! Ready for next invoice.`
        );
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        if (savedInvoiceId) {
          router.push(`/purchases/${savedInvoiceId}?created=true`);
        } else {
          router.push("/purchases");
        }
      }
    } catch (err: any) {
      setError(
        lang === "gu" && err.messageGujarati
          ? err.messageGujarati
          : err.message || "Failed to save purchase invoice."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Exit with confirmation if modified
  const handleExit = () => {
    if (isDirty) {
      const confirmLeave = window.confirm(
        lang === "gu"
          ? "તમારી પાસે અસાચવેલા ફેરફારો છે. શું તમે ખરેખર બહાર નીકળવા માંગો છો?"
          : "You have unsaved changes on this invoice. Are you sure you want to leave?"
      );
      if (!confirmLeave) return;
    }
    router.push("/purchases");
  };

  // Extended keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S: Save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSubmit(false);
        return;
      }
      // Shift+N: Save & New
      if (e.shiftKey && e.key.toUpperCase() === "N") {
        e.preventDefault();
        handleSubmit(true);
        return;
      }
      // F2 or Shift+I: Add item catalog
      if (e.key === "F2" || (e.shiftKey && e.key.toUpperCase() === "I")) {
        e.preventDefault();
        setIsAddItemsCatalogOpen(true);
        return;
      }
      // Shift+P: Focus party selection
      if (e.shiftKey && e.key.toUpperCase() === "P") {
        e.preventDefault();
        setShowPartyDropdown(true);
        return;
      }
      // Shift+D: Overall discount
      if (e.shiftKey && e.key.toUpperCase() === "D") {
        e.preventDefault();
        setShowOverallDiscount((prev) => !prev);
        return;
      }
      // Shift+R: Auto Round off
      if (e.shiftKey && e.key.toUpperCase() === "R") {
        e.preventDefault();
        setAutoRoundOff((prev) => !prev);
        return;
      }
      // Shift+M: Toggle mode
      if (e.shiftKey && e.key.toUpperCase() === "M") {
        e.preventDefault();
        setActiveMode((prev) => (prev === "EDIT" ? "PREVIEW" : "EDIT"));
        return;
      }
      // Esc: Close open popups
      if (e.key === "Escape") {
        setShowPartyDropdown(false);
        setIsQuickSettingsOpen(false);
        setIsShortcutsOpen(false);
        setIsAddItemsCatalogOpen(false);
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSubmit]);

  // Filtered suppliers for searchable dropdown
  const filteredSuppliers = useMemo(() => {
    if (!partySearchTerm.trim()) return suppliers;
    const q = partySearchTerm.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.gstin && s.gstin.toLowerCase().includes(q))
    );
  }, [suppliers, partySearchTerm]);

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-20 w-full">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP APP BAR & MODE CONTROLS (Full Width Fluid)
         ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#E5E7EB] shadow-xs px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 w-full">
        {/* ── MOBILE HEADER (Screens < 768px) ── */}
        <div className="md:hidden space-y-2">
          {/* Row 1: Exit, Title, Save */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={handleExit}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#D1D5DB] text-xs font-bold text-[#374151] hover:bg-[#F3F4F6] transition-all active:scale-95 shadow-xs shrink-0"
              >
                <span>←</span>
                <span>{lang === "gu" ? "પાછા" : "Exit"}</span>
              </button>

              <div className="min-w-0">
                <h1 className="text-sm font-bold text-[#111827] truncate">
                  {lang === "gu" ? "ખરીદી બિલ બનાવો" : "Create Purchase"}
                </h1>
                <span
                  className={`inline-block px-1.5 py-0.2 rounded-full text-[9px] font-bold border ${isInterState
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                >
                  {isInterState ? "IGST" : "CGST+SGST"}
                </span>
              </div>
            </div>

            {/* Top Save button on mobile */}
            <button
              type="button"
              disabled={isSubmitting || isLoading}
              onClick={() => handleSubmit(false)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#174B43] hover:bg-[#123B35] active:bg-[#C2410C] text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 active:scale-95 shrink-0"
            >
              {isSubmitting ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
              <span>{lang === "gu" ? "સાચવો" : "Save"}</span>
            </button>
          </div>

          {/* Row 2: Mode Switcher & Quick Action Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
            {/* Mode Switcher */}
            <div className="inline-flex p-0.5 bg-[#F1F3F5] rounded-xl border border-[#E5E7EB] shrink-0">
              <button
                type="button"
                onClick={() => setActiveMode("EDIT")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${activeMode === "EDIT"
                    ? "bg-white text-[#174B43] shadow-2xs border border-[#BCEADF]"
                    : "text-[#6B7280]"
                  }`}
              >
                {lang === "gu" ? "એડિટ" : "Edit"}
              </button>
              <button
                type="button"
                onClick={() => setActiveMode("PREVIEW")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${activeMode === "PREVIEW"
                    ? "bg-white text-[#174B43] shadow-2xs border border-[#BCEADF]"
                    : "text-[#6B7280]"
                  }`}
              >
                {lang === "gu" ? "પ્રિવ્યુ" : "Preview"}
              </button>
            </div>

            {/* Single Unified AI Drawer / Scanner toggle (matching Laptop layout) */}
            <button
              type="button"
              onClick={() => setIsAutofillDrawerOpen((p) => !p)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all shrink-0 active:scale-95 ${isAutofillDrawerOpen
                  ? "bg-[#F2FAF7] text-[#174B43] border-[#BCEADF] shadow-2xs"
                  : "bg-white text-[#374151] border-[#D1D5DB] hover:bg-[#F9FAFB] shadow-2xs"
                }`}
              title="Toggle AI Autofill Drawer"
            >
              <span>⚡</span>
              <span>
                {isAutofillDrawerOpen
                  ? (lang === "gu" ? "ઓટોફિલ છુપાવો" : "Hide AI")
                  : (lang === "gu" ? "AI ડ્રોઅર" : "AI Drawer")}
              </span>
            </button>

            {/* Upload phone */}
            <button
              type="button"
              onClick={() => setShowPhoneUploadModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#D1D5DB] text-[#374151] rounded-xl text-[11px] font-bold shadow-xs shrink-0"
            >
              <span>📱</span>
              <span>Phone</span>
            </button>
          </div>
        </div>

        {/* ── DESKTOP HEADER (Screens >= 768px) ── */}
        <div className="hidden md:flex w-full items-center justify-between gap-3">
          {/* Left Title & Exit */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D1D5DB] text-xs font-bold text-[#374151] hover:bg-[#F3F4F6] transition-all active:scale-95 shadow-xs"
            >
              <span>←</span>
              <span>{lang === "gu" ? "બહાર નીકળો (Exit)" : "Exit"}</span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-[#111827] tracking-tight">
                  {lang === "gu" ? "ખરીદી બિલ બનાવો (Purchase Invoice)" : "Create Purchase Invoice"}
                </h1>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${isInterState
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                >
                  {isInterState ? "IGST (100%)" : "CGST+SGST (50/50)"}
                </span>
              </div>
            </div>
          </div>

          {/* Center Mode Switcher: Edit Mode vs Preview Mode */}
          <div className="inline-flex items-center p-1 bg-[#F1F3F5] rounded-xl border border-[#E5E7EB]">
            <button
              type="button"
              onClick={() => setActiveMode("EDIT")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeMode === "EDIT"
                  ? "bg-white text-[#174B43] shadow-xs border border-[#BCEADF]"
                  : "text-[#6B7280] hover:text-[#111827]"
                }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>{lang === "gu" ? "એડિટ મોડ" : "Edit Mode"}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode("PREVIEW")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeMode === "PREVIEW"
                  ? "bg-white text-[#174B43] shadow-xs border border-[#BCEADF]"
                  : "text-[#6B7280] hover:text-[#111827]"
                }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>{lang === "gu" ? "પ્રિવ્યુ મોડ" : "Preview Mode"}</span>
            </button>
          </div>

          {/* Right Action Cluster */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle AI Autofill Drawer Button */}
            <button
              type="button"
              onClick={() => setIsAutofillDrawerOpen((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${isAutofillDrawerOpen
                  ? "bg-[#F2FAF7] text-[#174B43] border-[#BCEADF] shadow-xs"
                  : "bg-white text-[#4B5563] border-[#D1D5DB] hover:bg-[#F9FAFB]"
                }`}
              title="Toggle AI Autofill Left Drawer"
            >
              <span>⚡</span>
              <span>{isAutofillDrawerOpen ? (lang === "gu" ? "ઓટોફિલ છુપાવો" : "Hide AI") : (lang === "gu" ? "ઓટોફિલ પેનલ" : "Show AI")}</span>
            </button>

            {/* Upload using Phone button */}
            <button
              type="button"
              onClick={() => setShowPhoneUploadModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#F9FAFB] text-[#374151] border border-[#D1D5DB] rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95"
            >
              <svg className="w-4 h-4 text-[#174B43]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>{lang === "gu" ? "મોબાઈલથી અપલોડ" : "Upload using Phone"}</span>
            </button>

            {/* Quick Settings Icon Button */}
            <button
              type="button"
              onClick={() => {
                setQuickSettingsTab("invoice");
                setIsQuickSettingsOpen(true);
              }}
              className="p-2 bg-white hover:bg-[#F9FAFB] text-[#4B5563] border border-[#D1D5DB] rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95"
              title="Quick Settings"
            >
              <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Save & New */}
            <button
              type="button"
              disabled={isSubmitting || isLoading}
              onClick={() => handleSubmit(true)}
              className="px-3.5 py-2 bg-white hover:bg-[#F3F4F6] text-[#202124] border border-[#D1D5DB] text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 active:scale-95"
            >
              {lang === "gu" ? "સાચવો અને નવું" : "Save & New"}
            </button>

            {/* Save (Primary) */}
            <button
              type="button"
              disabled={isSubmitting || isLoading}
              onClick={() => handleSubmit(false)}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#174B43] hover:bg-[#123B35] active:bg-[#C2410C] text-white text-sm font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{lang === "gu" ? "સાચવી રહ્યા છીએ..." : "Saving..."}</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{lang === "gu" ? "સાચવો (Save)" : "Save"}</span>
                </>
              )}
            </button>

            {/* Shortcuts Modal Button */}
            <button
              type="button"
              onClick={() => setIsShortcutsOpen(true)}
              className="p-2 bg-white hover:bg-[#F9FAFB] text-[#4B5563] border border-[#D1D5DB] rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95"
              title="Keyboard Shortcuts"
            >
              ⌨️
            </button>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. NOTIFICATION ALERTS
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full px-3 sm:px-6 lg:px-8 pt-4">
        {error && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-800 font-semibold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 font-bold">✕</button>
          </div>
        )}

        {successBanner && (
          <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs sm:text-sm text-emerald-800 font-semibold flex items-center justify-between shadow-xs animate-fadeIn">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{successBanner}</span>
            </div>
            <button onClick={() => setSuccessBanner(null)} className="text-emerald-600 hover:text-emerald-800 font-bold">✕</button>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN WORKSPACE CONTAINER (100% FULL FLUID WIDTH, RESPONSIVE)
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full px-3 sm:px-6 lg:px-8 flex flex-col lg:flex-row gap-5 items-start">
        {/* ── LEFT DRAWER: AUTOFILL THIS BILL (GEMINI AI) ── */}
        {isAutofillDrawerOpen && (
          <aside className="w-full lg:w-[320px] xl:w-[340px] shrink-0 bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden flex flex-col lg:sticky lg:top-20 max-h-none lg:max-h-[calc(100vh-6rem)]">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#F3F4F6] flex items-center justify-between bg-gradient-to-r from-orange-50/50 to-amber-50/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#E6F7F2] text-[#174B43] flex items-center justify-center font-bold text-sm shadow-xs border border-[#BCEADF]">
                  ✨
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold text-[#111827]">
                      {lang === "gu" ? "આ બિલ ઓટોફિલ કરો" : "Autofill this bill"}
                    </h3>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      FREE • 4D left
                    </span>
                  </div>
                  <p className="text-[10px] text-[#6B7280]">
                    Powered by <strong className="text-[#174B43]">Mira AI</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAutofillDrawerOpen(false)}
                className="p-1 rounded-lg text-[#9CA3AF] hover:text-[#111827] hover:bg-slate-100 transition-colors"
                title="Collapse Drawer"
              >
                ✕
              </button>
            </div>

            {/* Dynamic Stats Row */}
            <div className="px-4 py-2 bg-[#FAFBFD] border-b border-[#F3F4F6] flex items-center justify-between text-[11px] text-[#6B7280]">
              <span className="flex items-center gap-1 font-medium">
                <span>📄</span> {totalBillsRecorded || 2} bills scanned
              </span>
              <span className="flex items-center gap-1 font-medium text-[#174B43]">
                <span>⏳</span> ~{Math.max(10, Math.round((totalBillsRecorded || 2) * 5))} mins saved
              </span>
            </div>

            {/* Upload & Preview Zone */}
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              {!uploadedDocUrl ? (
                /* Drag & Drop Area */
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileUpload(e.dataTransfer.files[0]);
                    }
                  }}
                  className="border-2 border-dashed border-[#85D5C2] hover:border-[#174B43] bg-[#FFFBF8] hover:bg-[#FFF6EF] rounded-2xl p-6 text-center cursor-pointer transition-all group flex flex-col items-center justify-center min-h-[200px]"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-12 h-12 rounded-full bg-[#E6F7F2] text-[#174B43] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <h4 className="text-xs font-bold text-[#C2410C] mb-1">
                    {lang === "gu" ? "ફાઇલ ડ્રેગ કરો અથવા અપલોડ કરો" : "Drag & Drop files here to upload"}
                  </h4>
                  <p className="text-[10px] text-[#9CA3AF] max-w-[200px]">
                    (PDF, JPG, JPEG & PNG supported, max 5MB)
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="px-5 py-1.5 bg-[#174B43] hover:bg-[#123B35] text-white rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95"
                    >
                      {lang === "gu" ? "આગળ વધો (Proceed)" : "Proceed"}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSmartScanner();
                      }}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1 active:scale-95"
                    >
                      <span>📷</span>
                      <span>{lang === "gu" ? "કેમેરા સ્કેન" : "Camera Scan"}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Document Preview Card with Futuristic Laser Scanner */
                <div className="space-y-3">
                  <div className="relative rounded-xl border border-[#E5E7EB] bg-slate-900 overflow-hidden shadow-md">
                    {/* Page badge */}
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/75 text-white text-[10px] font-mono font-bold z-30 shadow">
                      1/1
                    </div>

                    {/* Document Viewport: PDF iframe or Image */}
                    <div className="relative h-60 w-full bg-slate-950 overflow-hidden">
                      {uploadedDocType?.includes("pdf") ? (
                        <iframe
                          src={`${uploadedDocUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                          title="Bill PDF Preview"
                          className="w-full h-full border-0 pointer-events-none select-none bg-white"
                        />
                      ) : (
                        <img
                          src={uploadedDocUrl || ""}
                          alt="Scanned Bill"
                          className="w-full h-full object-cover object-top hover:opacity-95 cursor-pointer transition-opacity"
                          onClick={() => setZoomPreviewModal(true)}
                        />
                      )}

                      {/* Scanning Grid & Laser Beam Overlay (Sweeps across document) */}
                      {isAnalyzingDoc && (
                        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between">
                          {/* High-tech Corner Crosshairs */}
                          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#174B43]" />
                          <div className="absolute top-2 right-12 w-4 h-4 border-t-2 border-r-2 border-[#174B43]" />
                          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#174B43]" />
                          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#174B43]" />

                          {/* Scanner grid pattern */}
                          <div className="scanner-grid-pattern absolute inset-0 opacity-40" />

                          {/* Moving Laser Beam with Light Cone */}
                          <div className="absolute inset-x-0 animate-laser-sweep pointer-events-none z-30">
                            <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-[#174B43] via-amber-400 to-transparent shadow-[0_0_20px_6px_rgba(244,119,33,0.95)]" />
                            <div className="h-10 w-full bg-gradient-to-b from-[#174B43]/30 to-transparent blur-[1px]" />
                          </div>

                          {/* Center Animated Scanner Status */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[1px] p-3 text-center z-40">
                            <div className="px-3.5 py-1.5 rounded-full bg-slate-900/95 border border-[#174B43] shadow-xl flex items-center gap-2 mb-2 animate-scan-tag">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#174B43] animate-ping" />
                              <span className="text-xs font-bold text-white tracking-wide">
                                {analysisProgress || (lang === "gu" ? "AI બિલ સ્કેન કરી રહ્યું છે..." : "AI Gemini Vision Scanning...")}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-[240px]">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/90 text-white animate-pulse">
                                ✓ GSTIN & Date
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/90 text-white animate-pulse">
                                ✓ Items & HSN
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/90 text-white animate-pulse">
                                ✓ Tax & Totals
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* File bottom info strip */}
                    <div className="p-2.5 bg-white border-t border-[#E5E7EB] flex items-center justify-between text-xs relative z-10">
                      <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                        <span className="px-1.5 py-0.5 rounded bg-orange-100 text-[#174B43] font-bold text-[9px]">
                          {uploadedDocType?.includes("pdf") ? "PDF" : "IMG"}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-700 truncate" title={uploadedDocName || ""}>
                          {uploadedDocName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setZoomPreviewModal(true)}
                          className="p-1 text-slate-500 hover:text-[#174B43] rounded"
                          title="Zoom"
                        >
                          🔍
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUploadedDocUrl(null);
                            setUploadedDocName(null);
                            setUploadedDocFile(null);
                            setLastScanRecord(null);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Scanning Status Bar or Review Buttons */}
                  {isAnalyzingDoc ? (
                    <div className="p-3 bg-[#F2FAF7] border border-[#BCEADF] rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs text-[#C2410C] font-bold">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#174B43] animate-ping" />
                          {lang === "gu" ? "AI બિલ વાંચી રહ્યું છે" : "AI Gemini Vision Analyzing"}
                        </span>
                        <span className="text-[11px] font-mono text-[#174B43]">
                          {scanStepIndex === 0
                            ? "20%"
                            : scanStepIndex === 1
                              ? "45%"
                              : scanStepIndex === 2
                                ? "70%"
                                : scanStepIndex === 3
                                  ? "90%"
                                  : "98%"}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-orange-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#174B43] to-amber-500 rounded-full transition-all duration-500"
                          style={{
                            width:
                              scanStepIndex === 0
                                ? "20%"
                                : scanStepIndex === 1
                                  ? "45%"
                                  : scanStepIndex === 2
                                    ? "70%"
                                    : scanStepIndex === 3
                                      ? "90%"
                                      : "98%",
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        {analysisProgress}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (lastScanRecord?.extractedData) {
                            const ed = lastScanRecord.extractedData;
                            const inv = ed.invoice || {};
                            const sup = ed.supplier || {};
                            const fin = ed.financials || {};
                            const itemsList = ed.items || [];
                            const grandTotalVal = Number(fin.grandTotal || ed.sourceGrandTotal || 0);

                            // Resolve invoice number: avoid generic "Screenshot from ..."
                            const rawOcr = lastScanRecord?.rawOcrText || "";
                            let detectedInvNo = inv.invoiceNumber || ed.invoiceNumber;
                            if (!detectedInvNo || /^(?:screenshot|img_|file_)/i.test(detectedInvNo.trim())) {
                              const payMatch = rawOcr.match(/pay_[A-Za-z0-9]+/i) ||
                                rawOcr.match(/(?:Payment\s*Id|Payment\s*ID|Order\s*Id|Order\s*ID|Txn\s*Id|Transaction\s*Id|Ref\s*No|Reference\s*No)[\s:]+([A-Za-z0-9_-]+)/i);
                              if (payMatch) {
                                detectedInvNo = payMatch[1] || payMatch[0];
                              } else {
                                detectedInvNo = uploadedDocName?.replace(/\.[^/.]+$/, "").substring(0, 16);
                              }
                            }

                            // Detect if receipt was already paid (e.g. Zepto / UPI Paid Successfully)
                            const isPaid = /paid\s+successfully|paid\s+on|\bpaid\b/i.test(rawOcr) || /upi|gpay|phonepe|paytm/i.test(rawOcr);

                            // If items are empty but grandTotalVal > 0, generate single item
                            let finalItems = itemsList;
                            if ((!finalItems || finalItems.length === 0) && grandTotalVal > 0) {
                              const fallbackSupName = sup.name ? `${sup.name} - Purchase Bill` : (lang === "gu" ? "ખરીદી બિલ / વાઉચર" : "Purchase Bill / Expense");
                              finalItems = [{
                                description: fallbackSupName,
                                hsnCode: "9983",
                                unit: "PCS",
                                quantity: 1,
                                unitPrice: grandTotalVal,
                                taxRate: 0,
                                discountAmount: 0,
                              }];
                            }

                            handleTransferFromScanner({
                              vendorInvoiceNumber: detectedInvNo || undefined,
                              invoiceDate: inv.invoiceDate || ed.invoiceDate || new Date().toISOString().split("T")[0],
                              dueDate: inv.dueDate || ed.dueDate || undefined,
                              partyId: lastScanRecord.matchedPartyId || lastScanRecord.matchedSupplierId || sup.matchedPartyId || undefined,
                              matchedParty: lastScanRecord.matchedParty || undefined,
                              supplierName: sup.name || undefined,
                              supplierGstin: sup.gstin || undefined,
                              supplierPhone: sup.phone || undefined,
                              supplierAddress: sup.address || undefined,
                              placeOfSupply: inv.placeOfSupply || ed.placeOfSupply || undefined,
                              grandTotal: grandTotalVal,
                              paymentStatus: isPaid ? "PAID_FULL" : undefined,
                              paidAmount: isPaid ? grandTotalVal : undefined,
                              items: finalItems.map((it: any) => ({
                                itemId: it.matchedItemId,
                                itemName: it.description || it.itemName,
                                hsnCode: it.hsnCode,
                                unit: it.unit,
                                quantity: it.quantity,
                                unitPrice: it.unitPrice,
                                taxRate: it.taxRate ?? it.gstRate,
                                discountAmount: it.discountAmount ?? it.discount,
                              })),
                            });
                          } else if (uploadedDocFile) {
                            handleFileUpload(uploadedDocFile);
                          } else {
                            handleOpenSmartScanner();
                          }
                        }}
                        className="w-full py-2.5 bg-gradient-to-r from-[#174B43] to-[#123B35] hover:from-[#123B35] hover:to-[#B94B0A] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <span>✨</span>
                        <span>
                          {lang === "gu"
                            ? "ફોર્મમાં ફરીથી ભરો (Autofill Form)"
                            : "Review Scanned Details & Autofill"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenScanReview}
                        className="w-full py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <span>🔍</span>
                        <span>
                          {lang === "gu"
                            ? "આમને સામને ચકાસો (Side-by-Side Review)"
                            : "Open Side-by-Side Review"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenSmartScanner}
                        className="w-full py-2 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
                      >
                        <svg className="w-3.5 h-3.5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>
                          {lang === "gu"
                            ? "નવું બિલ સ્કેન કરો (Scan New Bill)"
                            : "Scan New Bill (Camera / Upload)"}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Dismissible How it works? Box */}
              {showHowItWorks && (
                <div className="p-3 bg-[#FAF5FF] border border-[#E9D5FF] rounded-xl text-xs space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#6B21A8]">How it works?</span>
                    <button
                      type="button"
                      onClick={() => setShowHowItWorks(false)}
                      className="text-purple-400 hover:text-purple-700 text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-1.5 text-[11px] text-[#581C87]">
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold text-[#7E22CE]">1.</span>
                      <span>Upload a picture or PDF of your purchase bill</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold text-[#7E22CE]">2.</span>
                      <span>Mira AI automatically extracts party, items, rates & taxes</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold text-[#7E22CE]">3.</span>
                      <span>Review extracted details and save your voucher</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Tips Box with Dot Carousel */}
              <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[11px] text-[#475569] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-[#1E293B]">
                    <span>💡</span>
                    <span>{lang === "gu" ? "મહત્વપૂર્ણ ટીપ્સ" : "Quick Tips"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {quickTips.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setTipIndex(i)}
                        className={`h-1.5 rounded-full transition-all ${tipIndex === i ? "bg-[#174B43] w-3" : "bg-slate-300 w-1.5"
                          }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-[10px] leading-relaxed text-slate-600 min-h-[28px]">
                  {quickTips[tipIndex]}
                </p>
              </div>
            </div>
          </aside>
        )}

        {/* ── RIGHT MAIN PANEL (FORM OR PREVIEW - TAKES 100% REMAINING SPACE) ── */}
        <main className="flex-1 min-w-0 space-y-6">
          {activeMode === "PREVIEW" ? (
            /* ─────────────────────────────────────────────────────────────
                PREVIEW MODE: REALISTIC DYNAMIC INDIAN GST INVOICE DOCUMENT
               ───────────────────────────────────────────────────────────── */
            <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-md p-6 sm:p-10 max-w-5xl mx-auto space-y-6 animate-fadeIn">
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div className="flex items-start gap-4">
                  {/* Real Scannable Invoice QR Code */}
                  <div className="shrink-0">
                    <InvoiceQrCode
                      value={typeof window !== "undefined" ? `${window.location.origin}/purchases` : "/purchases"}
                      size={80}
                      label="SCAN"
                    />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase">
                      {companyProfile?.tradeName || companyProfile?.legalName || currentCompany?.tradeName || "My Company"}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">Billed & Accounted Voucher</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {companyProfile?.addressLine1 || (companyProfile?.city ? `${companyProfile.city}, India` : "Head Office")}
                    </p>
                    <p className="text-xs font-mono font-bold text-slate-800">
                      GSTIN: {companyProfile?.gstin || currentCompany?.gstin || "Unregistered"}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-[#E6F7F2] border border-[#BCEADF] text-[#174B43] rounded text-xs font-bold uppercase tracking-wider mb-2">
                    PURCHASE INVOICE
                  </span>
                  <div className="text-xs text-slate-600 space-y-0.5">
                    <div>Purchase No: <strong className="font-mono text-slate-900">{purchaseInvoiceNumber}</strong></div>
                    <div>Original Bill No: <strong className="font-mono text-slate-900">{vendorInvoiceNumber || "—"}</strong></div>
                    <div>Date: <strong className="font-mono text-slate-900">{invoiceDate}</strong></div>
                  </div>
                </div>
              </div>

              {/* Bill From Party Box */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">BILL FROM (SUPPLIER)</span>
                  <div className="font-bold text-sm text-slate-900">{selectedSupplier?.name || "Supplier Name"}</div>
                  <div className="text-slate-600">{selectedSupplier?.billingAddress?.line1 || "Supplier Address"}</div>
                  <div className="font-mono text-slate-700 mt-1">GSTIN: {selectedSupplier?.gstin || "Unregistered"}</div>
                  <div className="text-slate-600">Phone: {selectedSupplier?.phone || "—"}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">PLACE OF SUPPLY & WAREHOUSE</span>
                  <div className="text-slate-700">State: <strong>{INDIAN_STATES[placeOfSupply]?.name || placeOfSupply} ({placeOfSupply})</strong></div>
                  <div className="text-slate-700">Destination: <strong>{warehouses.find(w => w.id === warehouseId)?.name || "Main Godown"}</strong></div>
                  <div className="text-slate-700 mt-1">ITC Eligibility: <span className="font-bold text-emerald-700">{itcEligibility}</span></div>
                </div>
              </div>

              {/* Printable Table */}
              <table className="w-full text-xs text-left border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <th className="p-2.5 border border-slate-200 text-center w-8">#</th>
                    <th className="p-2.5 border border-slate-200">Items / Services</th>
                    <th className="p-2.5 border border-slate-200 text-center w-20">HSN</th>
                    <th className="p-2.5 border border-slate-200 text-right w-16">Qty</th>
                    <th className="p-2.5 border border-slate-200 text-right w-24">Rate (₹)</th>
                    <th className="p-2.5 border border-slate-200 text-right w-24">Tax</th>
                    <th className="p-2.5 border border-slate-200 text-right w-28">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const itm = items.find(i => i.id === row.itemId);
                    const qty = Number(row.quantity) || 0;
                    const rate = Number(row.unitPrice) || 0;
                    const gross = qty * rate;
                    const disc = Number(row.discountValue) || 0;
                    const discVal = row.discountType === "₹" ? disc : (gross * disc) / 100;
                    const taxable = Math.max(0, gross - discVal);
                    const taxRate = Number(row.taxRate) || 0;
                    const taxAmt = (taxable * taxRate) / 100;
                    const lineTot = taxable + taxAmt;

                    return (
                      <tr key={idx} className="border-b border-slate-200">
                        <td className="p-2.5 border border-slate-200 text-center font-mono">{idx + 1}</td>
                        <td className="p-2.5 border border-slate-200 font-medium">
                          {row.itemName || itm?.name || "Item"}
                          {row.description && <div className="text-[10px] text-slate-500">{row.description}</div>}
                        </td>
                        <td className="p-2.5 border border-slate-200 text-center font-mono">{row.hsnCode}</td>
                        <td className="p-2.5 border border-slate-200 text-right font-mono">{qty} {row.unit}</td>
                        <td className="p-2.5 border border-slate-200 text-right font-mono">{rate.toFixed(2)}</td>
                        <td className="p-2.5 border border-slate-200 text-right font-mono">
                          ₹{taxAmt.toFixed(2)} <span className="text-[10px] text-slate-400">({taxRate}%)</span>
                        </td>
                        <td className="p-2.5 border border-slate-200 text-right font-mono font-bold text-slate-900">
                          ₹{lineTot.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Totals Summary */}
              <div className="flex justify-between items-start pt-2">
                <div className="text-xs text-slate-500 max-w-sm">
                  <div className="font-bold text-slate-700 mb-1">Terms & Conditions:</div>
                  <pre className="font-sans whitespace-pre-wrap text-[11px] leading-relaxed text-slate-600">{terms}</pre>
                </div>

                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Amount:</span>
                    <span className="font-mono font-semibold">₹{totals.totalTaxable.toFixed(2)}</span>
                  </div>
                  {isInterState ? (
                    <div className="flex justify-between text-slate-600">
                      <span>IGST:</span>
                      <span className="font-mono">₹{totals.totalIgst.toFixed(2)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>CGST:</span>
                        <span className="font-mono">₹{totals.totalCgst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>SGST:</span>
                        <span className="font-mono">₹{totals.totalSgst.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  {totals.roundOff !== 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Round Off:</span>
                      <span className="font-mono">{totals.roundOff.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-300 pt-2">
                    <span>Grand Total:</span>
                    <span className="font-mono text-[#174B43]">₹{totals.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Back to Edit Button */}
              <div className="pt-6 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveMode("EDIT")}
                  className="px-5 py-2 bg-[#174B43] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#123B35]"
                >
                  {lang === "gu" ? "ફેરફાર ચાલુ રાખવા માટે એડિટ મોડ પર પાછા જાઓ" : "Return to Edit Mode"}
                </button>
              </div>
            </div>
          ) : (
            /* ─────────────────────────────────────────────────────────────
                EDIT MODE: 3 TOP CARDS + WIDE TABLE + BOTTOM SUMMARY
               ───────────────────────────────────────────────────────────── */
            <>
              {/* 2 TOP CARDS: BILL FROM & INVOICE DETAILS (MATCHING MYBILLBOOK) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
                {/* 1. BILL FROM CARD */}
                <div className={`bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-4 flex flex-col justify-between relative transition-all duration-700 ${autofilledFieldsHighlight ? "ring-2 ring-[#174B43] bg-orange-50/15" : ""}`}>
                  <div>
                    <div className="flex items-center justify-between mb-3 border-b border-[#F3F4F6] pb-2">
                      <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                        {lang === "gu" ? "સપ્લાયર (Bill From)" : "Bill From"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setQuickSettingsTab("party");
                            setIsQuickSettingsOpen(true);
                          }}
                          className="text-[#9CA3AF] hover:text-[#111827] p-1 rounded"
                          title="Party Settings"
                        >
                          ⚙️
                        </button>
                      </div>
                    </div>

                    {selectedSupplier ? (
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-sm text-[#111827] truncate">
                            {selectedSupplier.name}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setShowPartyDropdown((p) => !p)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#174B43] hover:underline"
                            >
                              <span>🔄</span>
                              <span>{lang === "gu" ? "પાર્ટી બદલો" : "Change Party"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsEditSupplierModalOpen(true)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800"
                            >
                              <span>✏️</span>
                              <span>{lang === "gu" ? "એડિટ" : "Edit Party"}</span>
                            </button>
                          </div>
                        </div>

                        <div className="text-[#6B7280] text-[11px] line-clamp-2">
                          {selectedSupplier.billingAddress?.line1
                            ? `${selectedSupplier.billingAddress.line1}${selectedSupplier.billingAddress.city ? `, ${selectedSupplier.billingAddress.city}` : ""}`
                            : "Address: Not Specified"}
                          {selectedSupplier.stateCode ? `, State: ${INDIAN_STATES[selectedSupplier.stateCode]?.name || selectedSupplier.stateCode}` : ""}
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                          {selectedSupplier.phone && (
                            <div className="text-[#4B5563]">
                              Phone: <strong className="font-mono text-slate-900">{selectedSupplier.phone}</strong>
                            </div>
                          )}
                          {selectedSupplier.gstin && (
                            <div className="text-[#4B5563]">
                              GSTIN: <strong className="font-mono text-[#174B43]">{selectedSupplier.gstin}</strong>
                            </div>
                          )}
                        </div>

                        {quickSettings.showPartyBalance && (
                          <div className="pt-2 border-t border-[#F3F4F6] flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">Current Balance:</span>
                            <span className="font-mono font-bold text-slate-800">
                              ₹{(selectedSupplier.currentBalance ?? 0).toFixed(2)}
                            </span>
                          </div>
                        )}

                        {/* Separate Shipping Address */}
                        {quickSettings.showShippingAddress && (
                          <div className="pt-2 border-t border-[#F3F4F6] space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">
                              Shipping Address (Ship-To)
                            </label>
                            <textarea
                              rows={2}
                              value={shippingAddress}
                              onChange={(e) => setShippingAddress(e.target.value)}
                              placeholder="Enter ship-to address if different from billing..."
                              className="w-full text-xs p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#174B43]"
                            />
                          </div>
                        )}

                        {/* Contact Person Details */}
                        {quickSettings.showContactPerson && (
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#F3F4F6]">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                                Contact Person
                              </label>
                              <input
                                type="text"
                                value={contactPersonName}
                                onChange={(e) => setContactPersonName(e.target.value)}
                                placeholder="Contact Name"
                                className="w-full text-xs p-1.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#174B43]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                                Contact Phone
                              </label>
                              <input
                                type="text"
                                value={contactPersonPhone}
                                onChange={(e) => setContactPersonPhone(e.target.value)}
                                placeholder="Contact Phone"
                                className="w-full text-xs p-1.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#174B43]"
                              />
                            </div>
                          </div>
                        )}

                        {/* Custom Party Fields */}
                        {quickSettings.customPartyFields && quickSettings.customPartyFields.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#F3F4F6]">
                            {quickSettings.customPartyFields.map((field) => (
                              <div key={field.id}>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                                  {field.label}
                                </label>
                                <input
                                  type="text"
                                  value={customPartyFieldValues[field.id] || ""}
                                  onChange={(e) =>
                                    setCustomPartyFieldValues((prev) => ({
                                      ...prev,
                                      [field.id]: e.target.value,
                                    }))
                                  }
                                  placeholder={`Enter ${field.label}`}
                                  className="w-full text-xs p-1.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#174B43]"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Empty state: Large dashed box matching myBillBook */
                      <div
                        onClick={() => setShowPartyDropdown(true)}
                        className="border-2 border-dashed border-blue-400 bg-blue-50/25 hover:bg-blue-50/50 rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center group"
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl mb-2 group-hover:scale-110 transition-transform shadow-2xs">
                          +
                        </div>
                        <span className="text-sm font-bold text-blue-600 group-hover:text-blue-700">
                          + Add Party
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Click to select supplier or create new
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Searchable Party Dropdown Popover */}
                  {showPartyDropdown && (
                    <div className="absolute top-12 left-0 right-0 z-40 bg-white rounded-xl border border-[#D1D5DB] shadow-xl p-3 space-y-2 animate-fadeIn max-h-80 flex flex-col">
                      <div className="relative">
                        <input
                          type="text"
                          autoFocus
                          value={partySearchTerm}
                          onChange={(e) => setPartySearchTerm(e.target.value)}
                          placeholder={lang === "gu" ? "નામ અથવા નંબરથી વેપારી શોધો..." : "Search party by name or number"}
                          className="w-full p-2 pl-8 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#174B43]"
                        />
                        <span className="absolute left-2.5 top-2.5 text-xs text-slate-400">🔍</span>
                      </div>

                      <div className="flex-1 overflow-y-auto divide-y divide-[#F3F4F6] text-xs">
                        <div className="px-2 py-1 flex justify-between text-[10px] uppercase font-bold text-slate-400">
                          <span>Party Name</span>
                          <span>Balance</span>
                        </div>
                        {filteredSuppliers.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => handleSupplierChange(s.id)}
                            className="p-2 hover:bg-[#F2FAF7] cursor-pointer rounded-lg flex items-center justify-between transition-colors"
                          >
                            <div>
                              <div className="font-bold text-[#111827]">{s.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{s.gstin || s.phone || "No GSTIN"}</div>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-slate-700">
                                ₹{(s.currentBalance ?? 0).toFixed(2)}
                              </span>
                              <span className="text-[10px] text-slate-400 ml-1">↓</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setShowPartyDropdown(false);
                          setIsAddSupplierModalOpen(true);
                        }}
                        className="w-full py-2 border-2 border-dashed border-[#174B43] text-[#174B43] bg-[#F2FAF7] hover:bg-[#FFE6D0] rounded-lg text-xs font-bold transition-all"
                      >
                        + {lang === "gu" ? "નવી પાર્ટી બનાવો (Create Party)" : "Create Party"}
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. INVOICE DETAILS CARD */}
                <div className={`bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-4 flex flex-col justify-between transition-all duration-700 ${autofilledFieldsHighlight ? "ring-2 ring-[#174B43] bg-orange-50/15" : ""}`}>
                  <div>
                    <div className="flex items-center justify-between mb-3 border-b border-[#F3F4F6] pb-2">
                      <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                        {lang === "gu" ? "બિલ વિગતો (Invoice Details)" : "Invoice Details"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickSettingsTab("invoice");
                          setIsQuickSettingsOpen(true);
                        }}
                        className="text-[#9CA3AF] hover:text-[#111827] p-1 rounded"
                        title="Invoice Details Settings"
                      >
                        ⚙️
                      </button>
                    </div>

                    <div className="space-y-3 text-xs">
                      {/* 3 Inline inputs matching myBillBook */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5 truncate">
                            Purchase Invoice No.
                          </label>
                          <input
                            type="text"
                            value={purchaseInvoiceNumber}
                            onChange={(e) => setPurchaseInvoiceNumber(e.target.value)}
                            className="w-full p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#174B43]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5 truncate">
                            Purchase Invoice Date
                          </label>
                          <input
                            type="date"
                            value={invoiceDate}
                            onChange={(e) => {
                              setInvoiceDate(e.target.value);
                              setIsDirty(true);
                            }}
                            className="w-full p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#174B43]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5 truncate">
                            Original Invoice No. *
                          </label>
                          <input
                            type="text"
                            required
                            value={vendorInvoiceNumber}
                            onChange={(e) => {
                              setVendorInvoiceNumber(e.target.value);
                              setIsDirty(true);
                            }}
                            placeholder="e.g. INV-001"
                            className="w-full p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-xs font-mono font-bold text-[#174B43] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#174B43]"
                          />
                        </div>
                      </div>

                      {/* Due Date Dashed Box or Expanded Terms Selector */}
                      {showDueDateField ? (
                        <div className="p-2.5 bg-[#FAFBFD] border border-[#E5E7EB] rounded-xl space-y-2 animate-fadeIn">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">
                              Payment Due Date
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setShowDueDateField(false);
                                setDueDate("");
                                setPaymentTermsDays(null);
                              }}
                              className="text-[10px] text-slate-400 hover:text-rose-500 font-bold"
                            >
                              ✕ Remove
                            </button>
                          </div>
                          <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => {
                              setDueDate(e.target.value);
                              setIsDirty(true);
                            }}
                            className="w-full p-2 bg-white border border-[#E5E7EB] rounded-lg text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#174B43]"
                          />
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            <span className="text-[10px] text-slate-400 font-medium">Terms:</span>
                            {[15, 30, 45, 60].map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => handleSetPaymentTerms(d)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${paymentTermsDays === d
                                    ? "bg-[#F2FAF7] border-[#174B43] text-[#174B43]"
                                    : "bg-white border-[#E5E7EB] text-slate-600 hover:border-[#174B43]"
                                  }`}
                              >
                                {d} Days
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowDueDateField(true)}
                          className="w-full py-2.5 border border-dashed border-[#174B43]/50 bg-[#F2FAF7] hover:bg-[#FFE6D0] text-[#174B43] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                          <span>+ Add Due Date</span>
                        </button>
                      )}

                      {/* PO Details when enabled */}
                      {quickSettings.enablePoDetails && (
                        <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[#F3F4F6]">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                              PO Number
                            </label>
                            <input
                              type="text"
                              value={poNumber}
                              onChange={(e) => setPoNumber(e.target.value)}
                              placeholder="e.g. PO-2026-001"
                              className="w-full text-xs p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#174B43]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                              PO Date
                            </label>
                            <input
                              type="date"
                              value={poDate}
                              onChange={(e) => setPoDate(e.target.value)}
                              className="w-full text-xs p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#174B43]"
                            />
                          </div>
                        </div>
                      )}

                      {/* Vehicle & E-Way Bill when enabled */}
                      {(quickSettings.enableVehicleDetails || quickSettings.enableEwayBill) && (
                        <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[#F3F4F6]">
                          {quickSettings.enableVehicleDetails && (
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                                Vehicle Number
                              </label>
                              <input
                                type="text"
                                value={vehicleNumber}
                                onChange={(e) => setVehicleNumber(e.target.value)}
                                placeholder="e.g. GJ-01-AB-1234"
                                className="w-full text-xs p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg font-mono uppercase text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#174B43]"
                              />
                            </div>
                          )}
                          {quickSettings.enableEwayBill && (
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                                E-Way Bill Number
                              </label>
                              <input
                                type="text"
                                value={ewayBillNumber}
                                onChange={(e) => setEwayBillNumber(e.target.value)}
                                placeholder="12-digit number"
                                maxLength={12}
                                className="w-full text-xs p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#174B43]"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Custom Invoice Fields */}
                      {quickSettings.customInvoiceFields && quickSettings.customInvoiceFields.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-[#F3F4F6]">
                          <div className="grid grid-cols-2 gap-2.5">
                            {quickSettings.customInvoiceFields.map((field) => (
                              <div key={field.id}>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                                  {field.label}
                                </label>
                                <input
                                  type="text"
                                  value={customInvoiceFieldValues[field.id] || ""}
                                  onChange={(e) =>
                                    setCustomInvoiceFieldValues((prev) => ({
                                      ...prev,
                                      [field.id]: e.target.value,
                                    }))
                                  }
                                  placeholder={`Enter ${field.label}`}
                                  className="w-full text-xs p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#174B43]"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Warehouse & POS compact bar */}
                      <div className="pt-2 border-t border-[#F3F4F6] flex items-center justify-between text-[11px] text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <span>Godown:</span>
                          <select
                            value={warehouseId}
                            onChange={(e) => {
                              setWarehouseId(e.target.value);
                              setIsDirty(true);
                            }}
                            className="p-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-xs font-semibold text-slate-800"
                          >
                            {warehouses.map((w) => (
                              <option key={w.id} value={w.id}>
                                {w.name} {w.isDefault ? "(Default)" : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>Place of Supply:</span>
                          <strong className="text-slate-800">
                            {INDIAN_STATES[placeOfSupply]?.name || placeOfSupply} ({placeOfSupply})
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  4. LINE ITEMS TABLE (WIDE & COMFORTABLE WITH ALL COLUMNS)
                 ───────────────────────────────────────────────────────────── */}
              <div className={`bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden w-full transition-all duration-700 ${autofilledFieldsHighlight ? "ring-2 ring-[#174B43] bg-orange-50/10" : ""}`}>
                {/* ── MOBILE ITEM CARDS VIEW (Visible on screens < 768px) ── */}
                <div className="md:hidden divide-y divide-[#F1F3F5] p-3 space-y-3">
                  {rows.map((row, idx) => {
                    const qty = Number(row.quantity) || 0;
                    const rate = Number(row.unitPrice) || 0;
                    const gross = qty * rate;
                    const disc = Number(row.discountValue) || 0;
                    const discVal = row.discountType === "₹" ? disc : (gross * disc) / 100;
                    const taxable = Math.max(0, gross - discVal);
                    const taxRate = Number(row.taxRate) || 0;
                    const taxAmount = (taxable * taxRate) / 100;
                    const lineTotal = taxable + taxAmount;

                    return (
                      <div
                        key={idx}
                        className="bg-[#FAFBFD] border border-[#E5E7EB] rounded-2xl p-3.5 space-y-3 shadow-2xs"
                      >
                        {/* Card Header: Item No & Delete */}
                        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-orange-100 text-[#174B43] font-mono text-xs font-bold flex items-center justify-center">
                              #{idx + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              {row.itemName || (lang === "gu" ? "આઇટમ વિગતો" : "Item Details")}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            className="text-xs text-rose-500 hover:text-rose-700 font-bold px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                            title="Remove item"
                          >
                            {rows.length > 1
                              ? (lang === "gu" ? "✕ કાઢી નાખો" : "✕ Remove")
                              : (lang === "gu" ? "ક્લિયર" : "Clear")}
                          </button>
                        </div>

                        {/* Item Selection Dropdown */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">
                              {lang === "gu" ? "વસ્તુ પસંદ કરો" : "Select Item"} *
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveItemRowIdx(idx);
                                setIsAddItemModalOpen(true);
                              }}
                              className="text-[10px] font-bold text-[#174B43] hover:underline"
                            >
                              + {lang === "gu" ? "નવી વસ્તુ" : "New Item"}
                            </button>
                          </div>
                          <select
                            value={row.itemId}
                            onChange={(e) => handleItemSelect(idx, e.target.value)}
                            className="w-full p-2.5 bg-white border border-[#D1D5DB] rounded-xl text-xs font-bold text-[#111827] focus:ring-1 focus:ring-[#174B43] focus:outline-none"
                          >
                            <option value="">
                              {row.itemName
                                ? `📝 ${row.itemName}`
                                : (lang === "gu" ? "-- વસ્તુ પસંદ કરો --" : "-- Select Item --")}
                            </option>
                            {items.map((it) => (
                              <option key={it.id} value={it.id}>
                                {it.name} {it.sku ? `[${it.sku}]` : ""} — ₹{it.purchasePrice ?? it.retailPrice ?? 0}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Optional Description */}
                        <div>
                          <input
                            type="text"
                            value={row.description || ""}
                            onChange={(e) => handleRowChange(idx, "description", e.target.value)}
                            placeholder={lang === "gu" ? "વર્ણન (ઓપ્શનલ)" : "Description (optional)"}
                            className="w-full p-2 bg-white border border-[#E5E7EB] rounded-lg text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#174B43]"
                          />
                        </div>

                        {/* 2-Column Inputs Grid */}
                        <div className="grid grid-cols-2 gap-2.5">
                          {/* Quantity & Unit */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                              {lang === "gu" ? "જથ્થો (Qty)" : "Quantity"}
                            </label>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0.0001"
                                step="any"
                                value={row.quantity}
                                onChange={(e) =>
                                  handleRowChange(idx, "quantity", e.target.value === "" ? "" : Number(e.target.value))
                                }
                                placeholder="1"
                                className="w-full p-2 bg-white border border-[#D1D5DB] rounded-lg text-xs font-mono font-bold text-slate-900 text-right focus:outline-none focus:ring-1 focus:ring-[#174B43]"
                              />
                              <select
                                value={row.unit}
                                onChange={(e) => handleRowChange(idx, "unit", e.target.value)}
                                className="p-2 bg-white border border-[#D1D5DB] rounded-lg text-xs font-bold text-slate-700"
                              >
                                <option value="PCS">PCS</option>
                                <option value="KGS">KGS</option>
                                <option value="BOX">BOX</option>
                                <option value="MTR">MTR</option>
                                <option value="OTH">OTH</option>
                                <option value="YRS">YRS</option>
                                <option value="HRS">HRS</option>
                              </select>
                            </div>
                          </div>

                          {/* Price / Item (₹) */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                              {lang === "gu" ? "ભાવ (Price/Item)" : "Price/Item (₹)"}
                            </label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-mono">₹</span>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={row.unitPrice}
                                onChange={(e) =>
                                  handleRowChange(idx, "unitPrice", e.target.value === "" ? "" : Number(e.target.value))
                                }
                                placeholder="0.00"
                                className="w-full p-2 pl-6 bg-white border border-[#D1D5DB] rounded-lg text-xs font-mono font-bold text-slate-900 text-right focus:outline-none focus:ring-1 focus:ring-[#174B43]"
                              />
                            </div>
                          </div>

                          {/* Tax Rate (%) */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                              {lang === "gu" ? "ટેક્સ (Tax Rate)" : "Tax Rate"}
                            </label>
                            <select
                              value={row.taxRate}
                              onChange={(e) => handleRowChange(idx, "taxRate", Number(e.target.value))}
                              className="w-full p-2 bg-white border border-[#D1D5DB] rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#174B43]"
                            >
                              <option value="0">None (0%)</option>
                              <option value="5">5% GST</option>
                              <option value="12">12% GST</option>
                              <option value="18">18% GST</option>
                              <option value="28">28% GST</option>
                            </select>
                          </div>

                          {/* Discount */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                              {lang === "gu" ? "ડિસ્કાઉન્ટ" : "Discount"}
                            </label>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={row.discountValue}
                                onChange={(e) =>
                                  handleRowChange(idx, "discountValue", e.target.value === "" ? "" : Number(e.target.value))
                                }
                                placeholder="0"
                                className="w-full p-2 bg-white border border-[#D1D5DB] rounded-lg text-xs font-mono text-slate-700 text-right focus:outline-none focus:ring-1 focus:ring-[#174B43]"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleRowChange(idx, "discountType", row.discountType === "%" ? "₹" : "%")
                                }
                                className="p-2 bg-[#F1F3F5] hover:bg-[#E5E7EB] text-slate-700 rounded-lg text-xs font-bold font-mono"
                              >
                                {row.discountType}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* HSN & MRP Row */}
                        <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">HSN Code</label>
                            <input
                              type="text"
                              value={row.hsnCode}
                              onChange={(e) => handleRowChange(idx, "hsnCode", e.target.value)}
                              placeholder="HSN"
                              className="w-full p-1.5 bg-white border border-[#E5E7EB] rounded-lg text-xs font-mono text-center"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">MRP (₹)</label>
                            <input
                              type="number"
                              min="0"
                              value={row.mrp}
                              onChange={(e) => handleRowChange(idx, "mrp", e.target.value === "" ? "" : Number(e.target.value))}
                              placeholder="0"
                              className="w-full p-1.5 bg-white border border-[#E5E7EB] rounded-lg text-xs font-mono text-right"
                            />
                          </div>
                        </div>

                        {/* Card Footer: Line Total */}
                        <div className="bg-orange-50/70 border border-[#BCEADF] rounded-xl p-2.5 flex items-center justify-between text-xs">
                          <span className="font-bold text-[#C2410C]">
                            {lang === "gu" ? "આઇટમ રકમ (Amount):" : "Item Total:"}
                          </span>
                          <div className="text-right">
                            <span className="font-mono font-black text-sm text-[#174B43]">
                              ₹{lineTotal.toFixed(2)}
                            </span>
                            {taxAmount > 0 && (
                              <span className="block text-[10px] text-slate-500 font-mono">
                                Tax: ₹{taxAmount.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── DESKTOP LINE ITEMS TABLE (Visible on screens >= 768px) ── */}
                <div className="hidden md:block overflow-x-auto w-full">
                  <table className="w-full text-left text-xs border-collapse min-w-[1020px]">
                    <thead>
                      <tr className="bg-[#F8F9FA] border-b border-[#E5E7EB] text-[#4B5563] font-bold uppercase text-[11px]">
                        <th className="py-3 px-3 w-12 text-center">NO</th>
                        <th className="py-3 px-3 min-w-[260px]">ITEMS</th>
                        {quickSettings.showHsnColumn && (
                          <th className="py-3 px-3 w-28 text-center">HSN</th>
                        )}
                        <th className="py-3 px-3 w-24 text-right">MRP</th>
                        <th className="py-3 px-3 w-36 text-center">QTY</th>
                        <th className="py-3 px-3 w-32 text-right">PRICE/ITEM (₹)</th>
                        {quickSettings.showDiscountColumn && (
                          <th className="py-3 px-3 w-32 text-right">DISCOUNT</th>
                        )}
                        {quickSettings.showTaxColumn && (
                          <th className="py-3 px-3 w-28 text-center">TAX</th>
                        )}
                        <th className="py-3 px-3 w-32 text-right">AMOUNT (₹)</th>
                        <th className="py-3 px-2 w-10 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setQuickSettingsTab("items");
                              setIsQuickSettingsOpen(true);
                            }}
                            className="text-slate-400 hover:text-slate-700 p-1"
                            title="Item Table Settings"
                          >
                            ⚙️
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F3F5]">
                      {rows.map((row, idx) => {
                        const qty = Number(row.quantity) || 0;
                        const rate = Number(row.unitPrice) || 0;
                        const gross = qty * rate;
                        const disc = quickSettings.showDiscountColumn ? (Number(row.discountValue) || 0) : 0;
                        const discVal = row.discountType === "₹" ? disc : (gross * disc) / 100;
                        const taxable = Math.max(0, gross - discVal);
                        const taxRate = quickSettings.showTaxColumn ? (Number(row.taxRate) || 0) : 0;
                        const taxAmount = quickSettings.isTaxInclusive && taxRate > 0
                          ? taxable - (taxable / (1 + taxRate / 100))
                          : (taxable * taxRate) / 100;
                        const lineTotal = quickSettings.isTaxInclusive
                          ? taxable
                          : taxable + taxAmount;

                        return (
                          <tr key={idx} className="hover:bg-[#FDFDFE] transition-colors group align-top">
                            {/* NO */}
                            <td className="py-3 px-3 text-center">
                              <span className="font-mono text-xs font-bold text-slate-500">{idx + 1}</span>
                            </td>

                            {/* ITEMS + DESCRIPTION TEXTAREA */}
                            <td className="py-2.5 px-3 space-y-1.5">
                              <select
                                value={row.itemId}
                                onChange={(e) => handleItemSelect(idx, e.target.value)}
                                className="w-full p-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg text-xs font-bold text-[#111827] focus:bg-white focus:ring-1 focus:ring-[#174B43] focus:outline-none"
                              >
                                <option value="">
                                  {row.itemName
                                    ? `📝 ${row.itemName}`
                                    : (lang === "gu" ? "-- વસ્તુ પસંદ કરો --" : "-- Select Item --")}
                                </option>
                                {items.map((it) => (
                                  <option key={it.id} value={it.id}>
                                    {it.name} {it.sku ? `[${it.sku}]` : ""} — ₹{it.purchasePrice ?? it.retailPrice ?? 0}
                                  </option>
                                ))}
                              </select>

                              <textarea
                                rows={1}
                                value={row.description || ""}
                                onChange={(e) => handleRowChange(idx, "description", e.target.value)}
                                placeholder="Enter Description (optional)"
                                className="w-full p-1.5 bg-[#FAFBFD] border border-dashed border-[#E5E7EB] rounded text-[11px] text-slate-600 focus:bg-white focus:border-solid focus:border-[#174B43] focus:outline-none resize-y min-h-[28px]"
                              />
                            </td>

                            {/* HSN */}
                            {quickSettings.showHsnColumn && (
                              <td className="py-2.5 px-3">
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={row.hsnCode}
                                    onChange={(e) => handleRowChange(idx, "hsnCode", e.target.value)}
                                    placeholder="HSN"
                                    className="w-full p-2 pr-7 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg text-xs font-mono text-slate-700 text-center focus:bg-white focus:ring-1 focus:ring-[#174B43] focus:outline-none"
                                  />
                                  <span className="absolute right-2 top-2.5 text-xs text-slate-400 pointer-events-none">🔍</span>
                                </div>
                              </td>
                            )}

                            {/* MRP */}
                            <td className="py-2.5 px-3">
                              <input
                                type="number"
                                min="0"
                                value={row.mrp}
                                onChange={(e) => handleRowChange(idx, "mrp", e.target.value === "" ? "" : Number(e.target.value))}
                                placeholder="0"
                                className="w-full p-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg text-xs font-mono text-slate-700 text-right focus:bg-white focus:ring-1 focus:ring-[#174B43] focus:outline-none"
                              />
                            </td>

                            {/* QTY + UNIT + + Free Qty */}
                            <td className="py-2.5 px-3 space-y-1">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0.0001"
                                  step="any"
                                  value={row.quantity}
                                  onChange={(e) =>
                                    handleRowChange(idx, "quantity", e.target.value === "" ? "" : Number(e.target.value))
                                  }
                                  placeholder="1"
                                  className="w-20 p-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg text-xs font-mono font-bold text-slate-900 text-right focus:bg-white focus:ring-1 focus:ring-[#174B43] focus:outline-none"
                                />
                                <select
                                  value={row.unit}
                                  onChange={(e) => handleRowChange(idx, "unit", e.target.value)}
                                  className="p-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg text-xs font-bold text-slate-700"
                                >
                                  <option value="PCS">PCS</option>
                                  <option value="KGS">KGS</option>
                                  <option value="BOX">BOX</option>
                                  <option value="MTR">MTR</option>
                                  <option value="OTH">OTH</option>
                                  <option value="YRS">YRS</option>
                                  <option value="HRS">HRS</option>
                                </select>
                              </div>

                              {row.showFreeQty ? (
                                <div className="flex items-center gap-1 text-[11px] animate-fadeIn">
                                  <span className="text-slate-400">Free:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={row.freeQuantity || ""}
                                    onChange={(e) => handleRowChange(idx, "freeQuantity", Number(e.target.value))}
                                    placeholder="0"
                                    className="w-14 p-1 bg-white border border-slate-300 rounded font-mono text-right"
                                  />
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleRowChange(idx, "showFreeQty", true)}
                                  className="text-[10px] font-bold text-[#174B43] hover:underline block"
                                >
                                  + Free Qty
                                </button>
                              )}
                            </td>

                            {/* PRICE/ITEM (₹) */}
                            <td className="py-2.5 px-3">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={row.unitPrice}
                                onChange={(e) =>
                                  handleRowChange(idx, "unitPrice", e.target.value === "" ? "" : Number(e.target.value))
                                }
                                placeholder="0.00"
                                className="w-full p-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg text-xs font-mono font-bold text-slate-900 text-right focus:bg-white focus:ring-1 focus:ring-[#174B43] focus:outline-none"
                              />
                            </td>

                            {/* DISCOUNT */}
                            {quickSettings.showDiscountColumn && (
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={row.discountValue}
                                    onChange={(e) =>
                                      handleRowChange(idx, "discountValue", e.target.value === "" ? "" : Number(e.target.value))
                                    }
                                    placeholder="0"
                                    className="w-20 p-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg text-xs font-mono text-slate-700 text-right focus:bg-white focus:ring-1 focus:ring-[#174B43] focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRowChange(idx, "discountType", row.discountType === "%" ? "₹" : "%")
                                    }
                                    className="p-1.5 bg-[#F1F3F5] hover:bg-[#E5E7EB] text-slate-700 rounded-lg text-[10px] font-bold font-mono"
                                    title="Toggle % or Flat ₹"
                                  >
                                    {row.discountType}
                                  </button>
                                </div>
                              </td>
                            )}

                            {/* TAX */}
                            {quickSettings.showTaxColumn && (
                              <td className="py-2.5 px-3 text-center">
                                <select
                                  value={row.taxRate}
                                  onChange={(e) => handleRowChange(idx, "taxRate", Number(e.target.value))}
                                  className="w-full p-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg text-xs font-bold text-slate-800 text-center focus:bg-white focus:ring-1 focus:ring-[#174B43] focus:outline-none"
                                >
                                  <option value="0">None (0%)</option>
                                  <option value="5">5%</option>
                                  <option value="12">12%</option>
                                  <option value="18">18%</option>
                                  <option value="28">28%</option>
                                </select>
                                <span className="block text-[10px] font-mono text-slate-500 mt-0.5">
                                  (₹{taxAmount.toFixed(2)})
                                </span>
                              </td>
                            )}

                            {/* AMOUNT (₹) */}
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-[#174B43] text-sm">
                              ₹{lineTotal.toFixed(2)}
                            </td>

                            {/* REMOVE ACTION */}
                            <td className="py-2.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(idx)}
                                title={
                                  rows.length > 1
                                    ? (lang === "gu" ? "આ લાઇન કાઢી નાખો" : "Delete this line item")
                                    : (lang === "gu" ? "આઇટમ ક્લિયર કરો" : "Clear item")
                                }
                                aria-label="Remove item"
                                className="w-8 h-8 inline-flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer group-hover:text-slate-500"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer: + Add Item, Scan Barcode, and Subtotal Row */}
                <div className="p-4 bg-[#FAFBFD] border-t border-[#E5E7EB] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setIsAddItemsCatalogOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#174B43] hover:bg-[#123B35] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
                    >
                      <span>+</span>
                      <span>{lang === "gu" ? "વસ્તુ ઉમેરો (Add Item)" : "Add Item"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#F3F4F6] text-[#4B5563] border border-[#D1D5DB] text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
                    >
                      <span>+ {lang === "gu" ? "ખાલી લાઇન" : "Add Row"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowBarcodeScannerModal(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#F3F4F6] text-[#4B5563] border border-[#D1D5DB] text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
                    >
                      <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      <span>Scan Barcode</span>
                    </button>
                  </div>

                  {/* Subtotal Summary Row */}
                  <div className="flex items-center gap-6 text-xs text-[#4B5563] font-medium self-end sm:self-auto">
                    <div>
                      Subtotal Qty: <strong className="font-mono text-slate-900">{totals.totalQuantity}</strong>
                    </div>
                    {totals.totalDiscount > 0 && (
                      <div>
                        Discount: <strong className="font-mono text-emerald-600">₹{totals.totalDiscount.toFixed(2)}</strong>
                      </div>
                    )}
                    <div>
                      Tax: <strong className="font-mono text-slate-900">₹{totals.totalTax.toFixed(2)}</strong>
                    </div>
                    <div>
                      Subtotal: <strong className="font-mono text-sm font-bold text-[#174B43]">₹{totals.grandTotal.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  5. BOTTOM FINANCIAL SUMMARY, CHARGES, NOTES & SETTLEMENT
                 ───────────────────────────────────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
                {/* Left Column: Notes & Terms (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Notes & Terms Box */}
                  <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-2">
                      <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                        {lang === "gu" ? "નોંધ અને શરતો" : "Notes & Purchase Terms"}
                      </span>
                    </div>

                    <div className="space-y-4 text-xs">
                      {/* Notes Section */}
                      {showNotes || notes ? (
                        <div className="space-y-1 animate-fadeIn">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-[#4B5563]">
                              {lang === "gu" ? "નોંધ (Notes)" : "Notes"}
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setShowNotes(false);
                                setNotes("");
                              }}
                              className="text-[10px] text-slate-400 hover:text-rose-500 font-bold"
                            >
                              ✕ Remove
                            </button>
                          </div>
                          <textarea
                            rows={3}
                            value={notes}
                            onChange={(e) => {
                              setNotes(e.target.value);
                              setIsDirty(true);
                            }}
                            placeholder={lang === "gu" ? "આ બિલ માટે નોંધ..." : "Enter internal remarks for this bill..."}
                            className="w-full text-xs p-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#174B43]"
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowNotes(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[#D1D5DB] text-xs font-bold text-[#4B5563] hover:border-[#174B43] hover:text-[#174B43] transition-colors"
                        >
                          <span>📝</span>
                          <span>+ {lang === "gu" ? "નોંધ ઉમેરો" : "Add Notes"}</span>
                        </button>
                      )}

                      {/* Terms Section */}
                      {showTerms || terms ? (
                        <div className="space-y-1 animate-fadeIn">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-[#4B5563]">
                              Terms & Conditions
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setShowTerms(false);
                                setTerms("");
                              }}
                              className="text-[10px] text-slate-400 hover:text-rose-500 font-bold"
                            >
                              ✕ Remove
                            </button>
                          </div>
                          <textarea
                            rows={3}
                            value={terms}
                            onChange={(e) => {
                              setTerms(e.target.value);
                              setIsDirty(true);
                            }}
                            placeholder="Terms & Conditions for this purchase..."
                            className="w-full text-xs p-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#174B43]"
                          />
                        </div>
                      ) : (
                        <div>
                          <button
                            type="button"
                            onClick={() => setShowTerms(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[#D1D5DB] text-xs font-bold text-[#4B5563] hover:border-[#174B43] hover:text-[#174B43] transition-colors"
                          >
                            <span>📋</span>
                            <span>+ {lang === "gu" ? "શરતો ઉમેરો" : "Add Terms & Conditions"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Financial Summary & Settlement (5 cols) */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-2">
                    <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                      {lang === "gu" ? "સરવાળો અને ટેક્સ (Bill Summary)" : "Financial Summary"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAdditionalCharges((prev) => !prev)}
                      className="text-xs font-bold text-[#174B43] hover:underline"
                    >
                      + Add Additional Charges
                    </button>
                  </div>

                  {/* Additional Charges Input Box */}
                  {showAdditionalCharges && (
                    <div className="p-3 bg-[#F2FAF7] border border-[#BCEADF] rounded-xl text-xs space-y-2 animate-fadeIn">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[#C2410C]">Additional Charge</span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAdditionalCharges(false);
                            setAdditionalChargeAmount("");
                          }}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={additionalChargeType}
                          onChange={(e) => setAdditionalChargeType(e.target.value)}
                          placeholder="Charge Name"
                          className="p-1.5 bg-white border border-[#E5E7EB] rounded text-xs"
                        />
                        <input
                          type="number"
                          min="0"
                          value={additionalChargeAmount}
                          onChange={(e) => setAdditionalChargeAmount(e.target.value === "" ? "" : Number(e.target.value))}
                          placeholder="Amount (₹)"
                          className="p-1.5 bg-white border border-[#E5E7EB] rounded text-xs font-mono text-right"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2.5 text-xs">
                    {/* Taxable Amount */}
                    <div className="flex justify-between text-slate-600">
                      <span>Taxable Amount</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatInr(totals.totalTaxable)}
                      </span>
                    </div>

                    {/* Overall Discount on Bill */}
                    {showOverallDiscount ? (
                      <div className="flex items-center justify-between text-xs py-1 border-y border-[#F3F4F6] animate-fadeIn">
                        <span className="text-slate-600 font-medium">Discount on Total</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            value={overallDiscountAmount}
                            onChange={(e) => {
                              setOverallDiscountAmount(e.target.value === "" ? "" : Number(e.target.value));
                              setIsDirty(true);
                            }}
                            placeholder="0"
                            className="w-20 p-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-xs font-mono text-right"
                          />
                          <button
                            type="button"
                            onClick={() => setOverallDiscountType((prev) => (prev === "%" ? "₹" : "%"))}
                            className="p-1 px-2 bg-[#F1F3F5] hover:bg-[#E5E7EB] text-slate-700 rounded text-xs font-bold font-mono"
                          >
                            {overallDiscountType}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowOverallDiscount(false);
                              setOverallDiscountAmount("");
                            }}
                            className="text-slate-400 hover:text-rose-500 font-bold ml-1 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setShowOverallDiscount(true)}
                          className="text-xs font-bold text-[#174B43] hover:underline"
                        >
                          + Add Discount
                        </button>
                      </div>
                    )}

                    {/* Tax Breakdown */}
                    {isInterState ? (
                      <div className="flex justify-between text-slate-600">
                        <span>IGST</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {formatInr(totals.totalIgst)}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-slate-600">
                          <span>SGST</span>
                          <span className="font-mono font-semibold text-slate-800">
                            {formatInr(totals.totalSgst)}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>CGST</span>
                          <span className="font-mono font-semibold text-slate-800">
                            {formatInr(totals.totalCgst)}
                          </span>
                        </div>
                      </>
                    )}

                    {/* Auto Round Off Checkbox */}
                    <div className="flex items-center justify-between pt-1 border-t border-[#F3F4F6]">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                        <input
                          type="checkbox"
                          checked={autoRoundOff}
                          onChange={(e) => setAutoRoundOff(e.target.checked)}
                          className="rounded text-[#174B43] focus:ring-[#174B43]"
                        />
                        <span>Auto Round Off</span>
                      </label>
                      <span className="font-mono text-slate-500">
                        {totals.roundOff > 0 ? `+${totals.roundOff.toFixed(2)}` : totals.roundOff.toFixed(2)}
                      </span>
                    </div>

                    {/* Total Amount / Grand Total */}
                    <div className="p-4 bg-[#F2FAF7] border border-[#BCEADF] rounded-xl flex items-center justify-between">
                      <div>
                        <span className="block text-xs font-bold text-[#C2410C] uppercase tracking-wider">
                          Total Amount:
                        </span>
                        <span className="text-[10px] text-slate-500">Inclusive of GST</span>
                      </div>
                      <span className="text-xl sm:text-2xl font-black text-[#174B43] font-mono tracking-tight">
                        {formatInr(totals.grandTotal)}
                      </span>
                    </div>

                    {/* Total Amount Paid */}
                    <div className="pt-2 border-t border-[#F3F4F6] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700 font-semibold">Total Amount Paid:</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max={totals.grandTotal}
                            value={paidAmount}
                            onChange={(e) => {
                              const val = e.target.value === "" ? "" : Number(e.target.value);
                              setPaidAmount(val);
                              if (val === 0 || val === "") {
                                setPaymentStatus("UNPAID_CREDIT");
                              } else if (Number(val) >= totals.grandTotal) {
                                setPaymentStatus("PAID_FULL");
                              } else {
                                setPaymentStatus("PARTIAL_PAID");
                              }
                              setIsDirty(true);
                            }}
                            placeholder="0.00"
                            className="w-28 p-1.5 bg-white border border-[#D1D5DB] rounded-lg font-mono font-bold text-slate-900 text-right focus:ring-1 focus:ring-[#174B43] focus:outline-none"
                          />
                          <select
                            value={paymentMode}
                            onChange={(e) => {
                              setPaymentMode(e.target.value);
                              setIsDirty(true);
                            }}
                            className="p-1.5 bg-[#F9FAFB] border border-[#D1D5DB] rounded-lg text-xs font-bold text-slate-700"
                          >
                            <option value="CASH">Cash</option>
                            <option value="BANK_TRANSFER">Bank Transfer</option>
                            <option value="UPI_QR">UPI / QR</option>
                            <option value="CHEQUE">Cheque</option>
                            <option value="CREDIT_CARD">Credit Card</option>
                          </select>
                        </div>
                      </div>

                      {/* Mark as fully paid checkbox */}
                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-slate-700 text-xs font-medium">
                          <input
                            type="checkbox"
                            checked={paymentStatus === "PAID_FULL" && Number(paidAmount) === totals.grandTotal && totals.grandTotal > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setPaymentStatus("PAID_FULL");
                                setPaidAmount(totals.grandTotal);
                              } else {
                                setPaymentStatus("UNPAID_CREDIT");
                                setPaidAmount(0);
                              }
                              setIsDirty(true);
                            }}
                            className="rounded text-[#174B43] focus:ring-[#174B43]"
                          />
                          <span>Mark as fully paid</span>
                        </label>

                        {/* Balance Amount Display */}
                        <div className="text-right">
                          <span className="text-xs text-slate-500 mr-2">Balance Amount:</span>
                          <span className={`font-mono text-base font-black ${balanceDue > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                            {formatInr(balanceDue)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-[#F3F4F6] space-y-2.5">
                    <button
                      type="button"
                      disabled={isSubmitting || isLoading}
                      onClick={() => handleSubmit(false)}
                      className="w-full py-3 bg-[#174B43] hover:bg-[#123B35] active:bg-[#C2410C] text-white text-sm font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Save Purchase Invoice</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting || isLoading}
                      onClick={() => handleSubmit(true)}
                      className="w-full py-2.5 bg-white hover:bg-[#F3F4F6] text-[#202124] border border-[#D1D5DB] text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
                    >
                      Save & Create New
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          STICKY MOBILE QUICK ACTION BAR (Visible on Mobile / Tablet)
         ───────────────────────────────────────────────────────────── */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5E7EB] px-4 py-2.5 shadow-[0_-4px_16px_rgba(0,0,0,0.1)] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {lang === "gu" ? "કુલ રકમ (Total)" : "Grand Total"}
          </span>
          <span className="text-base font-black font-mono text-[#174B43] truncate block">
            {formatInr(totals.grandTotal)}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenSmartScanner}
            className="p-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1 active:scale-95"
            title="Scan Bill"
          >
            <span className="text-sm">📷</span>
            <span className="text-[11px]">{lang === "gu" ? "સ્કેન" : "Scan"}</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting || isLoading}
            onClick={() => handleSubmit(false)}
            className="px-4 py-2.5 bg-gradient-to-r from-[#174B43] to-[#123B35] active:bg-[#C2410C] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
            <span>{lang === "gu" ? "સાચવો" : "Save"}</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODALS: SCANNER, ZOOM, NEW SUPPLIER, NEW ITEM, SETTINGS, PHONE
         ───────────────────────────────────────────────────────────── */}
      {zoomPreviewModal && uploadedDocUrl && (
        <Modal
          isOpen={zoomPreviewModal}
          onClose={() => setZoomPreviewModal(false)}
          title={uploadedDocName || "Scanned Document Preview"}
          maxWidth="xl"
        >
          <div className="max-h-[75vh] overflow-auto flex items-center justify-center p-2">
            <img src={uploadedDocUrl} alt="Document" className="max-w-full rounded-lg shadow-md" />
          </div>
        </Modal>
      )}

      {isScannerModalOpen && (
        <BillScannerModal
          isOpen={isScannerModalOpen}
          onClose={() => {
            setIsScannerModalOpen(false);
            setScannerInitialRecord(null);
          }}
          lang={lang}
          parties={suppliers}
          itemsList={items}
          warehouses={warehouses}
          initialScanRecord={scannerInitialRecord}
          initialPreviewUrl={scannerInitialRecord ? uploadedDocUrl : null}
          onSuccess={(saved) => {
            if (saved?.id) router.push(`/purchases/${saved.id}?created=true`);
          }}
          onTransferToForm={(scannedData) => {
            handleTransferFromScanner(scannedData);
            setIsScannerModalOpen(false);
            setScannerInitialRecord(null);
          }}
        />
      )}

      {isAddSupplierModalOpen && (
        <Modal
          isOpen={isAddSupplierModalOpen}
          onClose={() => setIsAddSupplierModalOpen(false)}
          title={lang === "gu" ? "નવો વેપારી બનાવો (Create Supplier)" : "Create Supplier Party"}
        >
          <form onSubmit={handleSaveNewSupplier} className="space-y-3.5 text-xs">
            {supplierError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                {supplierError}
              </div>
            )}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Party Name *</label>
              <input
                type="text"
                required
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                placeholder="e.g. Anand Enterprises Pvt Ltd"
                className="w-full p-2 border border-slate-300 rounded-lg font-bold"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newSupplierPhone}
                  onChange={(e) => setNewSupplierPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">GSTIN</label>
                <input
                  type="text"
                  value={newSupplierGstin}
                  onChange={(e) => setNewSupplierGstin(e.target.value)}
                  placeholder="24AAAAA0000A1Z5"
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">State *</label>
              <select
                value={newSupplierStateCode}
                onChange={(e) => setNewSupplierStateCode(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              >
                {Object.entries(INDIAN_STATES).map(([code, obj]) => (
                  <option key={code} value={code}>{code} - {obj.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Billing Address</label>
              <input
                type="text"
                value={newSupplierAddress}
                onChange={(e) => setNewSupplierAddress(e.target.value)}
                placeholder="Street address..."
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsAddSupplierModalOpen(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingSupplier}
                className="px-5 py-2 bg-[#174B43] text-white font-bold rounded-lg"
              >
                {isSavingSupplier ? "Saving..." : "Save Supplier"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showPhoneUploadModal && (
        <Modal
          isOpen={showPhoneUploadModal}
          onClose={() => setShowPhoneUploadModal(false)}
          title="Upload Invoice using Phone"
        >
          <div className="p-4 text-center space-y-4">
            <div className="w-48 h-48 bg-white border border-slate-300 rounded-xl mx-auto flex items-center justify-center p-2 shadow-xs">
              <InvoiceQrCode
                value={typeof window !== "undefined" ? `${window.location.origin}/purchases/new?scan=true` : "/purchases/new?scan=true"}
                size={170}
                showTooltip={false}
              />
            </div>
            <p className="text-xs text-slate-600 max-w-xs mx-auto">
              Scan this QR code with your phone camera to capture bill photos directly into this purchase invoice draft!
            </p>
            <button
              type="button"
              onClick={() => setShowPhoneUploadModal(false)}
              className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold"
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {showBarcodeScannerModal && (
        <Modal
          isOpen={showBarcodeScannerModal}
          onClose={() => setShowBarcodeScannerModal(false)}
          title="Scan Item Barcode"
        >
          <div className="p-4 space-y-3">
            <p className="text-xs text-slate-600">
              Scan or enter item barcode / SKU to instantly append to the invoice table:
            </p>
            <input
              type="text"
              autoFocus
              value={barcodeInputValue}
              onChange={(e) => setBarcodeInputValue(e.target.value)}
              placeholder="e.g. 890123456789"
              className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
              onKeyDown={(e) => {
                if (e.key === "Enter" && barcodeInputValue.trim()) {
                  const matched = items.find(
                    (i) => i.sku === barcodeInputValue.trim() || i.hsnCode === barcodeInputValue.trim()
                  );
                  if (matched) {
                    setRows((prev) => [
                      ...prev,
                      {
                        itemId: matched.id,
                        itemName: matched.name,
                        description: "",
                        hsnCode: matched.hsnCode,
                        mrp: matched.retailPrice ?? 0,
                        unit: matched.primaryUom?.symbol || "PCS",
                        quantity: 1,
                        freeQuantity: 0,
                        showFreeQty: false,
                        unitPrice: matched.purchasePrice ?? 100,
                        discountValue: 0,
                        discountType: "%",
                        taxRate: matched.taxRate ?? 18,
                      },
                    ]);
                    setShowBarcodeScannerModal(false);
                    setBarcodeInputValue("");
                  } else {
                    alert("Barcode item not found in catalog.");
                  }
                }
              }}
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBarcodeScannerModal(false)}
                className="px-3 py-1.5 border rounded-lg text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Quick Settings Modal */}
      {isQuickSettingsOpen && (
        <QuickSettingsModal
          isOpen={isQuickSettingsOpen}
          onClose={() => setIsQuickSettingsOpen(false)}
          settings={quickSettings}
          initialTab={quickSettingsTab}
          voucherType="purchase"
          voucherTitle={lang === "gu" ? "ખરીદી બિલ વિગતો (Purchase Details)" : "Purchase Invoice Details"}
          prefixLabel={lang === "gu" ? "ખરીદી પ્રીફિક્સ" : "Purchase Prefix"}
          prefixPlaceholder="e.g. PUR-26-"
          storageKey={purchaseStorageKey}
          onSave={handleSaveQuickSettings}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in text-xs font-semibold">
          <span className="text-base">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {isShortcutsOpen && (
        <ShortcutsModal
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
        />
      )}

      {/* Add Items to Bill Catalog Modal */}
      {isAddItemsCatalogOpen && (
        <AddItemsModal
          isOpen={isAddItemsCatalogOpen}
          onClose={() => setIsAddItemsCatalogOpen(false)}
          items={items.map((it) => ({
            id: it.id,
            name: it.name,
            hsnCode: it.hsnCode,
            taxRate: it.taxRate,
            retailPrice: it.retailPrice ?? it.purchasePrice ?? 0,
            purchasePrice: it.purchasePrice ?? it.retailPrice ?? 0,
            stockQuantity: it.stockQuantity,
            unit: it.primaryUom?.symbol || "PCS",
          }))}
          onAddSelectedItems={(selectedList) => {
            setRows((prev) => {
              const cleanRows = prev.filter((r) => r.itemId || r.itemName);
              const newRows: PurchaseRow[] = selectedList.map((sel) => ({
                itemId: sel.item.id,
                itemName: sel.item.name,
                description: "",
                hsnCode: sel.item.hsnCode || "",
                mrp: sel.item.retailPrice ?? "",
                unit: sel.item.unit || "PCS",
                quantity: sel.quantity,
                freeQuantity: "",
                showFreeQty: false,
                unitPrice: sel.unitPrice,
                discountValue: "",
                discountType: "%",
                taxRate: sel.item.taxRate ?? 18,
              }));
              return [...cleanRows, ...newRows];
            });
            setIsAddItemsCatalogOpen(false);
          }}
          onCreateNewItem={() => {
            setIsAddItemsCatalogOpen(false);
            setIsAddItemModalOpen(true);
          }}
        />
      )}

      {/* Edit Party Modal */}
      {isEditSupplierModalOpen && selectedSupplier && (
        <Modal
          isOpen={isEditSupplierModalOpen}
          onClose={() => setIsEditSupplierModalOpen(false)}
          title="Edit Supplier Details"
        >
          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Party Name</label>
              <input
                type="text"
                value={selectedSupplier.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setSuppliers((prev) =>
                    prev.map((s) => (s.id === selectedSupplier.id ? { ...s, name: val } : s))
                  );
                }}
                className="w-full p-2 border border-slate-300 rounded-lg font-bold"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={selectedSupplier.phone || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSuppliers((prev) =>
                      prev.map((s) => (s.id === selectedSupplier.id ? { ...s, phone: val } : s))
                    );
                  }}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">GSTIN</label>
                <input
                  type="text"
                  value={selectedSupplier.gstin || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSuppliers((prev) =>
                      prev.map((s) => (s.id === selectedSupplier.id ? { ...s, gstin: val } : s))
                    );
                  }}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono uppercase"
                />
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Billing Address</label>
              <input
                type="text"
                value={selectedSupplier.billingAddress?.line1 || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setSuppliers((prev) =>
                    prev.map((s) =>
                      s.id === selectedSupplier.id
                        ? { ...s, billingAddress: { ...s.billingAddress, line1: val } }
                        : s
                    )
                  );
                }}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsEditSupplierModalOpen(false)}
                className="px-4 py-2 bg-[#174B43] text-white font-bold rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function NewPurchaseInvoicePage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-3 border-[#174B43] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-500">Loading purchase bill editor...</p>
          </div>
        </div>
      }
    >
      <NewPurchaseInvoiceContent />
    </React.Suspense>
  );
}
