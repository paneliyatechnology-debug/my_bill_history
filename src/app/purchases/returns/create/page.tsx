"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useActiveInvoiceTheme } from "@/lib/use-active-invoice-theme";
import { DynamicThemedInvoice } from "@/components/invoice/dynamic-themed-invoice";
import { useAuth } from "../../../../context/auth-context";
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
import { apiClient, extractList } from "../../../../lib/api-client";
import { SignatureModal } from "../../../../components/invoice/signature-modal";
import { Modal } from "../../../../components/ui/modal";
import { InvoiceQrCode } from "../../components/invoice-barcode-qr";
import {
  QuickSettingsModal,
  QuickSettingsConfig,
  DEFAULT_PURCHASE_QUICK_SETTINGS,
} from "../../../../components/invoice/quick-settings-modal";

const COMMON_BANKS = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Bank of Baroda",
  "Punjab National Bank",
  "Kotak Mahindra Bank",
  "Canara Bank",
  "Union Bank of India",
  "IndusInd Bank",
  "Other Bank",
];

interface Party {
  id: string;
  name: string;
  nameGujarati?: string;
  phone?: string;
  gstin?: string;
  billingAddress?: string;
  currentBalance?: number;
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
}

interface ReturnItemLine {
  id: string;
  purchaseItemId?: string;
  itemId?: string;
  name: string;
  hsn?: string;
  quantity: number;
  originalQuantity?: number;
  unitPrice: number;
  discount: number;
  discountType: "%" | "₹";
  taxRate: number;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
}

export default function CreatePurchaseReturnPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { lang, currentCompany } = useAuth();
  const { state: activeInvoiceTheme } = useActiveInvoiceTheme(currentCompany?.id);

  const isDebitMemo = useMemo(() => {
    return pathname?.includes("debit-memo") || searchParams?.get("type") === "debit-memo";
  }, [pathname, searchParams]);

  const isDebitNote = useMemo(() => {
    return (
      isDebitMemo ||
      pathname?.includes("debit-note") ||
      searchParams?.get("type") === "debit-note"
    );
  }, [isDebitMemo, pathname, searchParams]);

  const editId = searchParams?.get("edit") || searchParams?.get("id");
  const [isEditMode, setIsEditMode] = useState(Boolean(editId));

  const voucherLabel = isDebitMemo ? "Debit Memo" : isDebitNote ? "Debit Note" : "Purchase Return";

  // Mode: edit or preview
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");

  // Masters
  const [parties, setParties] = useState<Party[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  // Party selector state
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [isPartySearchOpen, setIsPartySearchOpen] = useState(false);
  const [partySearchTerm, setPartySearchTerm] = useState("");

  // Invoice state
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const [isInvoiceDropdownOpen, setIsInvoiceDropdownOpen] = useState(false);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

  // Return details
  const [returnNumber, setReturnNumber] = useState<string>("1");
  const [returnDate, setReturnDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  // Items table
  const [items, setItems] = useState<ReturnItemLine[]>([
    {
      id: `line-${Date.now()}`,
      name: "",
      hsn: "",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      discountType: "₹",
      taxRate: 18,
      taxableAmount: 0,
      taxAmount: 0,
      totalAmount: 0,
    },
  ]);
  const [activeItemAutocompleteIdx, setActiveItemAutocompleteIdx] = useState<number | null>(null);

  // Notes & Terms
  const [showNotesInput, setShowNotesInput] = useState(false);
    const [activeNotesTab, setActiveNotesTab] = useState<"notes" | "terms">("notes");
  const [transportMode, setTransportMode] = useState("Road");
  const [vehicleNo, setVehicleNo] = useState("");
  const [ewayBillNo, setEwayBillNo] = useState("");
  const [dispatchDate, setDispatchDate] = useState("");
const [notes, setNotes] = useState<string>("");
  const [showTerms, setShowTerms] = useState(true);
  const [terms, setTerms] = useState<string>(
    "1. Goods once sold will not be taken back or exchanged\n2. All disputes are subject to [ENTER_YOUR_CITY_NAME] jurisdiction only",
  );
  // Bank Account & Payment QR state
  const [bankAdded, setBankAdded] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankForm, setBankForm] = useState({
    bankName: "State Bank of India",
    customBankName: "",
    accountNumber: "50200012345678",
    ifscCode: "SBIN0001234",
    branchName: "Ahmedabad Main",
    accountHolderName: "",
  });

  const [qrAdded, setQrAdded] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrForm, setQrForm] = useState({
    upiId: "audit.traders@okhdfcbank",
    payeeName: "",
  });

  // Signature state & modal with localStorage persistence
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("business_signature") || localStorage.getItem("mybillbook_signature") || null;
    }
    return null;
  });

  const handleUpdateSignature = (sig: string | null) => {
    setSignatureData(sig);
    if (typeof window !== "undefined") {
      if (sig) {
        localStorage.setItem("business_signature", sig);
        localStorage.setItem("mybillbook_signature", sig);
      } else {
        localStorage.removeItem("business_signature");
        localStorage.removeItem("mybillbook_signature");
      }
    }
  };

  // Quick Settings state (wired to all gear icons)
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);
  const [quickSettingsTab, setQuickSettingsTab] = useState<"invoice" | "party" | "items">("invoice");
  const [quickSettings, setQuickSettings] = useState<QuickSettingsConfig>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("billing_debit_memo_quick_settings");
        if (saved) return { ...DEFAULT_PURCHASE_QUICK_SETTINGS, ...JSON.parse(saved) };
      } catch {}
    }
    return {
      ...DEFAULT_PURCHASE_QUICK_SETTINGS,
      invoicePrefix: "DM-26-",
      invoiceSequence: "0003",
    };
  });

  const openSettings = (tab: "invoice" | "party" | "items" = "invoice") => {
    setQuickSettingsTab(tab);
    setIsQuickSettingsOpen(true);
  };

  const handleSaveQuickSettings = (newSettings: QuickSettingsConfig) => {
    setQuickSettings(newSettings);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("billing_debit_memo_quick_settings", JSON.stringify(newSettings));
      } catch {}
    }
    if (newSettings.enablePrefix && newSettings.invoicePrefix) {
      setReturnNumber(`${newSettings.invoicePrefix}${newSettings.invoiceSequence || "0003"}`);
    } else if (newSettings.invoiceSequence) {
      setReturnNumber(newSettings.invoiceSequence);
    }
    setIsQuickSettingsOpen(false);
    showToast("Voucher settings updated successfully!");
  };

  // Bottom financials
  const [showChargesInput, setShowChargesInput] = useState(false);
  const [additionalCharges, setAdditionalCharges] = useState<number>(0);
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [overallDiscount, setOverallDiscount] = useState<number>(0);
  const [overallDiscountType, setOverallDiscountType] = useState<"%" | "₹">("₹");
  const [autoRoundOff, setAutoRoundOff] = useState(true);
  const [roundOffType, setRoundOffType] = useState<"+ Add" | "- Reduce">("+ Add");
  const [manualRoundOff, setManualRoundOff] = useState<number>(0);

  // Payment
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>("Cash");
  const [isFullyPaid, setIsFullyPaid] = useState(false);

  // Status & Modals
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Party Modals
  const [isEditPartyModalOpen, setIsEditPartyModalOpen] = useState(false);
  const [editPartyForm, setEditPartyForm] = useState({
    name: "",
    phone: "",
    gstin: "",
    billingAddress: "",
  });

  const [isCreatePartyModalOpen, setIsCreatePartyModalOpen] = useState(false);
  const [createPartyForm, setCreatePartyForm] = useState({
    name: "",
    phone: "",
    gstin: "",
    billingAddress: "",
  });

  // Item Modal
  const [isCreateItemModalOpen, setIsCreateItemModalOpen] = useState(false);
  const [activeRowForNewItem, setActiveRowForNewItem] = useState<number | null>(null);
  const [createItemForm, setCreateItemForm] = useState({
    name: "",
    hsn: "",
    price: 0,
    taxRate: 18,
  });

  // Load parties, inventory, and count on mount
  useEffect(() => {
    apiClient
      .get("/masters/parties")
      .then((res: any) => {
        const list = extractList<Party>(res);
        setParties(list);
      })
      .catch(() => {});

    apiClient
      .get("/masters/items")
      .then((res: any) => {
        const list = extractList<any>(res);
        const mapped: InventoryItem[] = list.map((it: any) => ({
          id: it.id,
          name: it.name,
          nameGujarati: it.nameGujarati,
          hsnCode: it.hsnCode || it.hsn || "",
          purchaseRate: Number(it.purchaseRate || it.purchasePrice || it.retailPrice || it.salePrice || 0),
          purchasePrice: Number(it.purchaseRate || it.purchasePrice || it.retailPrice || it.salePrice || 0),
          retailPrice: Number(it.retailPrice || it.salePrice || 0),
          salePrice: Number(it.retailPrice || it.salePrice || 0),
          taxRate: Number(it.taxRate ?? 18),
          currentStock: Number(it.currentStock ?? it.stockQuantity ?? 100),
        }));
        setInventoryItems(mapped);
      })
      .catch(() => {});

    apiClient
      .get("/purchases/debit-notes")
      .then((res: any) => {
        const list = extractList<any>(res);
        setReturnNumber(String(list.length + 1));
      })
      .catch(() => {});

    // Preload recent purchase invoices for instant linking and auto-fill
    setIsLoadingInvoices(true);
    apiClient
      .get("/purchases/invoices", { limit: 100 })
      .then((res: any) => {
        const list = extractList<any>(res);
        setInvoices(list);
      })
      .catch(() => {})
      .finally(() => setIsLoadingInvoices(false));

    // Load persisted Bank & Payment QR from company profile / localStorage
    if (typeof window !== "undefined") {
      const savedBank = localStorage.getItem("voucher_bank_details");
      if (savedBank) {
        try {
          const parsed = JSON.parse(savedBank);
          setBankForm((prev) => ({ ...prev, ...parsed }));
        } catch {}
      }
      const savedQr = localStorage.getItem("voucher_qr_details");
      if (savedQr) {
        try {
          const parsed = JSON.parse(savedQr);
          setQrForm((prev) => ({ ...prev, ...parsed }));
        } catch {}
      }
    }

    apiClient
      .get("/tenants/company")
      .then((res: any) => {
        if (res) {
          setBankForm((prev) => ({
            ...prev,
            bankName: res.bankName || prev.bankName,
            accountNumber: res.bankAccountNo || prev.accountNumber,
            ifscCode: res.bankIfsc || prev.ifscCode,
            branchName: res.bankBranch || prev.branchName,
            accountHolderName: res.tradeName || res.legalName || prev.accountHolderName,
          }));
          setQrForm((prev) => ({
            ...prev,
            upiId: res.upiVpa || prev.upiId,
            payeeName: res.tradeName || res.legalName || prev.payeeName,
          }));
        }
      })
      .catch(() => {});
  }, []);

  // Pre-fill form when editing an existing voucher
  useEffect(() => {
    if (!editId) return;
    setIsEditMode(true);
    apiClient
      .get(`/purchases/invoices/debit-notes/${editId}`)
      .then((res: any) => {
        const ret = res?.data || res;
        if (!ret) return;

        if (ret.returnNumber) setReturnNumber(ret.returnNumber);
        if (ret.returnDate) setReturnDate(ret.returnDate.split("T")[0]);
        if (ret.reason) setNotes(ret.reason);

        // Party
        const partyData = ret.party || ret.purchaseInvoice?.party;
        if (partyData) {
          setSelectedParty({
            id: partyData.id,
            name: partyData.name,
            phone: partyData.phone || "",
            gstin: partyData.gstin || "",
            billingAddress: partyData.billingAddress || "",
          });
        }

        // Invoice
        if (ret.purchaseInvoiceId) {
          setSelectedInvoiceId(ret.purchaseInvoiceId);
          const invNo =
            ret.purchaseInvoice?.vendorInvoiceNumber ||
            ret.purchaseInvoice?.invoiceNumber ||
            "";
          if (invNo) setInvoiceSearchQuery(invNo);
        }

        // Items
        if (Array.isArray(ret.items) && ret.items.length > 0) {
          const mappedItems: ReturnItemLine[] = ret.items.map(
            (it: any, idx: number) => {
              const qty = Number(it.quantity || 1);
              const rate = Number(it.unitPrice || 0);
              const taxR = Number(it.taxRate || 18);
              const taxable = Number(it.taxableAmount || qty * rate);
              const taxAmt =
                Number(it.cgstAmount || 0) +
                  Number(it.sgstAmount || 0) +
                  Number(it.igstAmount || 0) || taxable * (taxR / 100);
              const total = Number(it.totalAmount || taxable + taxAmt);

              return {
                id: it.id || `line-${Date.now()}-${idx}`,
                name:
                  it.item?.name ||
                  it.purchaseItem?.item?.name ||
                  it.name ||
                  "Item",
                hsn: it.item?.hsnCode || it.hsnCode || it.hsn || "",
                quantity: qty,
                originalQuantity: Number(it.purchaseItem?.quantity || qty),
                unitPrice: rate,
                discount: Number(it.discount || 0),
                discountType: "₹",
                taxRate: taxR,
                taxableAmount: taxable,
                taxAmount: taxAmt,
                totalAmount: total,
                itemId: it.itemId || it.item?.id,
                purchaseItemId: it.purchaseItemId || it.id,
              };
            },
          );
          setItems(mappedItems);
        }
      })
      .catch((err) => {
        console.error("Failed to load edit return:", err);
      });
  }, [editId]);

  // Click outside to dismiss item dropdown
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".item-autocomplete-container")) {
        setActiveItemAutocompleteIdx(null);
      }
    };
    document.addEventListener("mousedown", handleGlobalClick);
    return () => document.removeEventListener("mousedown", handleGlobalClick);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // When Party is picked
  const handleSelectParty = async (party: Party) => {
    setSelectedParty(party);
    setIsPartySearchOpen(false);
    setSelectedInvoiceId("");
    setInvoiceSearchQuery("");
    setIsLoadingInvoices(true);

    try {
      const res: any = await apiClient.get("/purchases/invoices", { partyId: party.id });
      const list = extractList<any>(res);
      setInvoices(list);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  // Open Edit Party Modal with prefilled data
  const handleOpenEditParty = () => {
    if (!selectedParty) return;
    setEditPartyForm({
      name: selectedParty.name || "",
      phone: selectedParty.phone || "",
      gstin: selectedParty.gstin || "",
      billingAddress:
        typeof selectedParty.billingAddress === "string"
          ? selectedParty.billingAddress
          : (selectedParty.billingAddress as any)?.line1 || "",
    });
    setIsEditPartyModalOpen(true);
  };

  // Save changes to party
  const handleSaveEditParty = async () => {
    if (!selectedParty) return;
    try {
      const updatedData = {
        name: editPartyForm.name.trim(),
        phone: editPartyForm.phone.trim() || undefined,
        gstin: editPartyForm.gstin.trim() || undefined,
        billingAddress: editPartyForm.billingAddress.trim() || undefined,
      };

      await apiClient.put(`/masters/parties/${selectedParty.id}`, updatedData).catch(() => {});

      const updatedParty: Party = {
        ...selectedParty,
        name: editPartyForm.name.trim() || selectedParty.name,
        phone: editPartyForm.phone.trim(),
        gstin: editPartyForm.gstin.trim(),
        billingAddress: editPartyForm.billingAddress.trim(),
      };

      setSelectedParty(updatedParty);
      setParties((prev) =>
        prev.map((p) => (p.id === selectedParty.id ? updatedParty : p)),
      );
      setIsEditPartyModalOpen(false);
      showToast("Party details updated successfully!");
    } catch (e) {
      console.error("Failed to edit party", e);
      setIsEditPartyModalOpen(false);
    }
  };

  // Create new party
  const handleCreateParty = async () => {
    if (!createPartyForm.name.trim()) {
      showToast("Please enter party name");
      return;
    }
    try {
      const payload = {
        name: createPartyForm.name.trim(),
        type: "VENDOR",
        phone: createPartyForm.phone.trim() || undefined,
        gstin: createPartyForm.gstin.trim() || undefined,
        billingAddress: createPartyForm.billingAddress.trim()
          ? { line1: createPartyForm.billingAddress.trim() }
          : undefined,
      };

      const res: any = await apiClient.post("/masters/parties", payload).catch(() => null);
      const newParty: Party = {
        id: res?.data?.id || res?.id || `p-${Date.now()}`,
        name: createPartyForm.name.trim(),
        phone: createPartyForm.phone.trim(),
        gstin: createPartyForm.gstin.trim(),
        billingAddress: createPartyForm.billingAddress.trim(),
        currentBalance: 0,
      };

      setParties((prev) => [newParty, ...prev]);
      handleSelectParty(newParty);
      setIsCreatePartyModalOpen(false);
      setIsPartySearchOpen(false);
      setCreatePartyForm({ name: "", phone: "", gstin: "", billingAddress: "" });
      showToast("Party created and selected successfully!");
    } catch (e) {
      console.error("Failed to create party", e);
    }
  };

  // Create new inventory item
  const handleCreateItem = async () => {
    if (!createItemForm.name.trim()) {
      showToast("Please enter item name");
      return;
    }
    try {
      const payload = {
        name: createItemForm.name.trim(),
        type: "PRODUCT",
        hsnCode: createItemForm.hsn.trim() || undefined,
        purchaseRate: Number(createItemForm.price || 0),
        retailPrice: Number(createItemForm.price || 0),
        taxRate: Number(createItemForm.taxRate || 18),
      };

      const res: any = await apiClient.post("/masters/items", payload).catch(() => null);
      const newItem: InventoryItem = {
        id: res?.data?.id || res?.id || `itm-${Date.now()}`,
        name: createItemForm.name.trim(),
        hsnCode: createItemForm.hsn.trim(),
        purchasePrice: Number(createItemForm.price || 0),
        purchaseRate: Number(createItemForm.price || 0),
        retailPrice: Number(createItemForm.price || 0),
        salePrice: Number(createItemForm.price || 0),
        taxRate: Number(createItemForm.taxRate || 18),
        currentStock: 100,
      };

      setInventoryItems((prev) => [newItem, ...prev]);

      if (activeRowForNewItem !== null) {
        handlePickInventoryItem(activeRowForNewItem, newItem);
      }
      setIsCreateItemModalOpen(false);
      setCreateItemForm({ name: "", hsn: "", price: 0, taxRate: 18 });
      showToast("Item created and added successfully!");
    } catch (e) {
      console.error("Failed to create item", e);
    }
  };

  // When Purchase Invoice is picked: Auto-fill Vendor, Items, and Totals
  const handleSelectInvoice = async (inv: any) => {
    setSelectedInvoiceId(inv.id);
    const rawBillNum = String(inv.vendorInvoiceNumber || inv.invoiceNumber || `PB-${inv.id.slice(0, 8)}`);
    const billNum = rawBillNum.replace(/^#+/, "");
    setInvoiceSearchQuery(billNum);
    setIsInvoiceDropdownOpen(false);

    // 1. Auto-fill Vendor / Party if present
    const partyData = inv.party;
    if (partyData) {
      setSelectedParty({
        id: partyData.id,
        name: partyData.name,
        nameGujarati: partyData.nameGujarati,
        phone: partyData.phone,
        gstin: partyData.gstin,
        billingAddress:
          typeof partyData.billingAddress === "string"
            ? partyData.billingAddress
            : partyData.billingAddress?.line1 || "",
        currentBalance: partyData.currentBalance || 0,
      });
    }

    // 2. Fetch full bill details or fallback to inv.items to auto-fill line items
    try {
      let fullItems: any[] = [];
      try {
        const full: any = await apiClient.get(`/purchases/invoices/${inv.id}`);
        if (full?.party) {
          const p = full.party;
          setSelectedParty({
            id: p.id,
            name: p.name,
            nameGujarati: p.nameGujarati,
            phone: p.phone,
            gstin: p.gstin,
            billingAddress:
              typeof p.billingAddress === "string" ? p.billingAddress : p.billingAddress?.line1 || "",
            currentBalance: p.currentBalance || 0,
          });
        }
        if (full && Array.isArray(full.items) && full.items.length > 0) {
          fullItems = full.items;
        }
      } catch (e) {
        console.warn("Falling back to invoice items from list", e);
      }

      if (fullItems.length === 0 && Array.isArray(inv.items) && inv.items.length > 0) {
        fullItems = inv.items;
      }

      if (fullItems.length > 0) {
        const newLines: ReturnItemLine[] = fullItems.map((pi: any, idx: number) => {
          const qty = Number(pi.quantity || 1);
          const price = Number(pi.unitPrice || 0);
          const taxRate = Number(pi.taxRate || 0);
          const taxable = Number(pi.taxableAmount || qty * price);
          const tax = Number(pi.taxAmount || (taxable * taxRate) / 100);
          const total = Number(pi.totalAmount || taxable + tax);
          return {
            id: `line-${idx}-${Date.now()}`,
            purchaseItemId: pi.id,
            itemId: pi.itemId,
            name: pi.item?.name || pi.itemName || `Item ${idx + 1}`,
            hsn: pi.item?.hsnCode || pi.hsn || "",
            quantity: qty,
            originalQuantity: qty,
            unitPrice: price,
            discount: Number(pi.discountAmount || 0),
            discountType: "₹",
            taxRate: taxRate,
            taxableAmount: taxable,
            taxAmount: tax,
            totalAmount: total,
          };
        });
        setItems(newLines);
        showToast(`Auto-filled ${newLines.length} items from ${billNum}!`);
      } else {
        showToast(`Linked to ${billNum}`);
      }
    } catch (err) {
      console.error("Failed to load invoice items", err);
    }
  };

  const handleUnlinkInvoice = () => {
    setSelectedInvoiceId("");
    setInvoiceSearchQuery("");
    showToast("Unlinked purchase invoice.");
  };

  // Add Item Line
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: "",
        hsn: "",
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        discountType: "₹",
        taxRate: 18,
        taxableAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
      },
    ]);
  };

  // Pick Item from Inventory Autocomplete
  const handlePickInventoryItem = (idx: number, itm: InventoryItem) => {
    setItems((prev) => {
      const copy = [...prev];
      const target = { ...copy[idx] };
      target.itemId = itm.id;
      target.name = itm.name;
      target.hsn = itm.hsnCode || "";
      target.unitPrice = Number(itm.purchaseRate || itm.purchasePrice || itm.retailPrice || itm.salePrice || 0);
      target.taxRate = Number(itm.taxRate || 18);

      const qty = Number(target.quantity) || 1;
      const base = qty * target.unitPrice;
      const discVal = Number(target.discount) || 0;
      const discAmount = target.discountType === "%" ? (base * discVal) / 100 : discVal;
      const taxable = Math.max(0, base - discAmount);
      const tax = (taxable * target.taxRate) / 100;

      target.taxableAmount = Number(taxable.toFixed(2));
      target.taxAmount = Number(tax.toFixed(2));
      target.totalAmount = Number((taxable + tax).toFixed(2));

      copy[idx] = target;
      return copy;
    });
    setActiveItemAutocompleteIdx(null);
  };

  // Update item field with precise formulas
  const updateItemLine = (idx: number, field: keyof ReturnItemLine, val: any) => {
    setItems((prev) => {
      const copy = [...prev];
      const target = { ...copy[idx] };
      let finalVal = val;
      if (field === "quantity" && target.originalQuantity !== undefined) {
        const num = Number(val);
        if (num > target.originalQuantity) {
          finalVal = target.originalQuantity;
          showToast(`Return quantity cannot exceed billed quantity (${target.originalQuantity})`);
        } else if (num < 1) {
          finalVal = 1;
        }
      }
      (target as any)[field] = finalVal;

      const qty = Number(target.quantity) || 0;
      const price = Number(target.unitPrice) || 0;
      const base = qty * price;

      const discVal = Number(target.discount) || 0;
      const discAmount = target.discountType === "%" ? (base * discVal) / 100 : discVal;
      const taxable = Math.max(0, base - discAmount);

      const taxRate = Number(target.taxRate) || 0;
      const tax = (taxable * taxRate) / 100;

      target.taxableAmount = Number(taxable.toFixed(2));
      target.taxAmount = Number(tax.toFixed(2));
      target.totalAmount = Number((taxable + tax).toFixed(2));

      copy[idx] = target;
      return copy;
    });
  };

  const removeItemLine = (idx: number) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  };

  // Precise Calculations matching myBillBook
  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalTaxable = 0;
    let totalTax = 0;
    let totalQty = 0;
    let totalDiscount = 0;

    for (const itm of items) {
      subtotal += itm.totalAmount;
      totalTaxable += itm.taxableAmount;
      totalTax += itm.taxAmount;
      totalQty += Number(itm.quantity || 0);

      const base = Number(itm.quantity || 0) * Number(itm.unitPrice || 0);
      const d = itm.discountType === "%" ? (base * Number(itm.discount || 0)) / 100 : Number(itm.discount || 0);
      totalDiscount += d;
    }

    const addCharges = Number(additionalCharges || 0);
    const invDiscount =
      overallDiscountType === "%"
        ? (subtotal * Number(overallDiscount || 0)) / 100
        : Number(overallDiscount || 0);

    const baseAmount = subtotal + addCharges - invDiscount;

    let finalTotal = baseAmount;
    let roundOffDiff = 0;

    if (autoRoundOff) {
      finalTotal = Math.round(baseAmount);
      roundOffDiff = Number((finalTotal - baseAmount).toFixed(2));
    } else {
      finalTotal = roundOffType === "+ Add" ? baseAmount + Number(manualRoundOff || 0) : baseAmount - Number(manualRoundOff || 0);
    }

    finalTotal = Math.max(0, Number(finalTotal.toFixed(2)));
    const paid = isFullyPaid ? finalTotal : Number(amountReceived || 0);
    const balance = Math.max(0, Number((finalTotal - paid).toFixed(2)));

    return {
      subtotal: Number(subtotal.toFixed(2)),
      totalTaxable: Number(totalTaxable.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      totalQty,
      totalDiscount: Number(totalDiscount.toFixed(2)),
      finalTotal,
      roundOffDiff,
      paid,
      balance,
    };
  }, [
    items,
    additionalCharges,
    overallDiscount,
    overallDiscountType,
    autoRoundOff,
    roundOffType,
    manualRoundOff,
    isFullyPaid,
    amountReceived,
  ]);

  // When "Mark as fully paid" is toggled
  const handleToggleFullyPaid = (checked: boolean) => {
    setIsFullyPaid(checked);
    if (checked) {
      setAmountReceived(calculations.finalTotal);
    } else {
      setAmountReceived(0);
    }
  };

  // Effective bank name calculation
  const effectiveBankName =
    bankForm.bankName === "Other Bank"
      ? bankForm.customBankName || "Bank"
      : bankForm.bankName;

  // Real Scannable UPI Payment URI
  const upiUri = useMemo(() => {
    const upi = qrForm.upiId?.trim();
    if (!upi) return "";
    const payee = encodeURIComponent(
      qrForm.payeeName ||
        currentCompany?.tradeName ||
        currentCompany?.legalName ||
        "Merchant",
    );
    const amt =
      calculations.finalTotal > 0
        ? `&am=${calculations.finalTotal.toFixed(2)}`
        : "";
    return `upi://pay?pa=${upi}&pn=${payee}${amt}&cu=INR`;
  }, [qrForm, currentCompany, calculations.finalTotal]);

  // Save Bank Account
  const handleSaveBank = () => {
    if (!bankForm.accountNumber.trim()) {
      showToast("Please enter bank account number");
      return;
    }
    setBankAdded(true);
    setIsBankModalOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("voucher_bank_details", JSON.stringify(bankForm));
    }
    apiClient
      .patch("/tenants/company", {
        bankName: effectiveBankName,
        bankAccountNo: bankForm.accountNumber.trim(),
        bankIfsc: bankForm.ifscCode.trim(),
        bankBranch: bankForm.branchName.trim(),
      })
      .catch(() => {});
    showToast("Bank account added to voucher!");
  };

  // Save Payment QR
  const handleSaveQr = () => {
    if (!qrForm.upiId.trim()) {
      showToast("Please enter UPI ID");
      return;
    }
    setQrAdded(true);
    setIsQrModalOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("voucher_qr_details", JSON.stringify(qrForm));
    }
    apiClient
      .patch("/tenants/company", {
        upiVpa: qrForm.upiId.trim(),
      })
      .catch(() => {});
    showToast("Payment QR attached to voucher!");
  };

  // Submit Handler
  const handleSubmit = async (saveAndNew = false) => {
    setErrorMessage(null);

    if (!selectedParty) {
      setErrorMessage("Please select a vendor / party before saving.");
      return;
    }

    const validItems = items.filter((itm) => itm.name.trim() !== "");
    if (validItems.length === 0) {
      setErrorMessage("Please enter at least one item name and quantity.");
      return;
    }

    setIsSubmitting(true);

    try {
      let purchaseId = selectedInvoiceId;

      if (!purchaseId) {
        if (invoices.length > 0) {
          purchaseId = invoices[0].id;
        } else {
          const createdPurchase: any = await apiClient.post("/purchases/invoices", {
            vendorInvoiceNumber: `PB-${Date.now().toString().slice(-6)}`,
            invoiceDate: returnDate,
            partyId: selectedParty.id,
            items: validItems.map((itm) => ({
              itemId: itm.itemId || inventoryItems[0]?.id || "custom",
              quantity: itm.quantity,
              unitPrice: itm.unitPrice || 100,
              taxRate: itm.taxRate || 18,
            })),
          });
          purchaseId = createdPurchase?.id;
        }
      }

      const payload = {
        returnNumber,
        returnDate,
        purchaseInvoiceId: purchaseId,
        partyId: selectedParty.id,
        reason: notes || voucherLabel,
        taxableAmount: calculations.totalTaxable,
        grandTotal: calculations.finalTotal,
        amountReceived: calculations.paid,
        paymentMode: paymentMode,
        items: validItems.map((itm) => ({
          purchaseItemId: itm.purchaseItemId || "default-item",
          itemId: itm.itemId || inventoryItems[0]?.id,
          quantity: itm.quantity,
          unitPrice: itm.unitPrice,
          taxRate: itm.taxRate,
          taxableAmount: itm.taxableAmount,
          totalAmount: itm.totalAmount,
        })),
      };

      let res: any;
      if (editId) {
        res = await apiClient.put(`/purchases/invoices/debit-notes/${editId}`, payload);
      } else {
        res = await apiClient.post("/purchases/debit-notes", payload);
      }
      const newId = res?.id || res?.purchaseReturn?.id;

      if (saveAndNew) {
        setSelectedParty(null);
        setSelectedInvoiceId("");
        setInvoiceSearchQuery("");
        setItems([
          {
            id: `line-${Date.now()}`,
            name: "",
            hsn: "",
            quantity: 1,
            unitPrice: 0,
            discount: 0,
            discountType: "₹",
            taxRate: 18,
            taxableAmount: 0,
            taxAmount: 0,
            totalAmount: 0,
          },
        ]);
        setAmountReceived(0);
        setIsFullyPaid(false);
        setReturnNumber(String(Number(returnNumber) + 1));
        showToast(`${voucherLabel} ${isEditMode ? "updated" : "saved"}! Ready for next voucher.`);
      } else {
        showToast(`${voucherLabel} ${isEditMode ? "updated" : "saved"} successfully!`);
        const exitUrl = isDebitMemo ? "/purchases/debit-memo" : isDebitNote ? "/purchases/debit-note" : "/purchases/returns";
        router.push(exitUrl);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || `Failed to save ${voucherLabel}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F3F8] text-slate-800 p-3 sm:p-4 font-sans">
      <div className="max-w-[1550px] mx-auto space-y-3">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-4 right-4 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-2xl animate-fade-in flex items-center gap-2">
            <span>✓</span>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top header replaced by unified DocumentHeaderCard */}
        {/* 2. DYNAMIC CONTENT: PREVIEW MODE vs EDIT MODE */}
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
                    <span>{voucherLabel} {lang === "gu" ? "પ્રિવ્યૂ" : "Preview"}</span>
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
                  <span>🖨️ {lang === "gu" ? "પ્રિન્ટ" : "Print Voucher"}</span>
                </button>
              </div>
            </div>

            {/* Themed Document using DynamicThemedInvoice */}
            <div className="bg-slate-100/70 p-4 sm:p-8 rounded-2xl border border-slate-200 overflow-x-auto flex justify-center">
              <DynamicThemedInvoice
                invoice={{
                  category: isDebitMemo ? "DEBIT_MEMO" : "PURCHASE_RETURN",
                  invoiceNumber: returnNumber || "PR-001",
                  invoiceDate: returnDate,
                  paymentMode: paymentMode,
                  placeOfSupply: "24 (Gujarat)",
                  taxableAmount: calculations.totalTaxable,
                  cgstAmount: calculations.totalTax > 0 ? Number((calculations.totalTax / 2).toFixed(2)) : 0,
                  sgstAmount: calculations.totalTax > 0 ? Number((calculations.totalTax / 2).toFixed(2)) : 0,
                  igstAmount: 0,
                  roundOff: calculations.roundOffDiff,
                  grandTotal: calculations.finalTotal,
                  paidAmount: isFullyPaid ? calculations.finalTotal : Number(amountReceived) || 0,
                  balanceAmount: calculations.balance,
                  notes: notes,
                  party: {
                    name: selectedParty?.name || "Supplier Name",
                    gstin: selectedParty?.gstin,
                    phone: selectedParty?.phone,
                    billingAddress: selectedParty?.billingAddress,
                  },
                  items: items.map((r, idx) => {
                    const gross = Number(r.quantity || 0) * Number(r.unitPrice || 0);
                    const disc = Number(r.discount || 0);
                    const discVal = r.discountType === "₹" ? disc : (gross * disc) / 100;
                    const taxable = Math.max(0, gross - discVal);
                    const taxRate = Number(r.taxRate || 0);
                    const taxAmt = (taxable * taxRate) / 100;
                    return {
                      id: r.id || `row-${idx}`,
                      description: r.name || "Item",
                      hsnCode: r.hsn,
                      quantity: Number(r.quantity || 0),
                      unitPrice: Number(r.unitPrice || 0),
                      discountPercent: r.discountType === "%" ? disc : gross > 0 ? (disc / gross) * 100 : 0,
                      taxRate: taxRate,
                      taxableAmount: taxable,
                      cgstAmount: taxAmt / 2,
                      sgstAmount: taxAmt / 2,
                      totalAmount: taxable + taxAmt,
                      item: { name: r.name },
                    };
                  }),
                  eWayBillRecord: {
                    originalInvoiceNumber: invoices.find((i) => i.id === selectedInvoiceId)?.vendorInvoiceNumber || selectedInvoiceId,
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
                printableId="printable-purchase-return"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* DOCUMENT HEADER CARD */}
            <DocumentHeaderCard
              title={voucherLabel}
              subtitle={isDebitMemo ? "Create and manage your supplier debit memos" : "Create and manage your purchase return debit notes"}
              status="Draft"
              onPreview={() => setViewMode("preview")}
              onPrint={() => window.print()}
              onSave={() => handleSubmit(false)}
              onSaveAsDraft={() => handleSubmit(false)}
              isSaving={isSubmitting}
              saveButtonLabel={isDebitMemo ? "Save Debit Memo" : "Save Purchase Return"}
              moreMenuItems={[
                { label: "Voucher Settings", onClick: () => openSettings("invoice") },
                { label: "Keyboard Shortcuts", onClick: () => showToast("Shortcuts: Ctrl+S (Save), Alt+I (Add Item)") },
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
                        address: selectedParty.billingAddress,
                      } : null}
                      searchTerm={partySearchTerm}
                      onSearchChange={setPartySearchTerm}
                      isOpen={isPartySearchOpen}
                      onOpenChange={setIsPartySearchOpen}
                      filteredParties={parties
                        .filter((p) => p.name.toLowerCase().includes(partySearchTerm.toLowerCase()))
                        .map((p) => ({
                          id: p.id,
                          name: p.name,
                          phone: p.phone,
                          gstin: p.gstin,
                          outstandingBalance: p.currentBalance,
                        }))}
                      onSelectParty={(id) => {
                        const p = parties.find((party) => party.id === id);
                        if (p) {
                          setSelectedParty(p);
                          setIsPartySearchOpen(false);
                        }
                      }}
                      onClearParty={() => {
                        setSelectedParty(null);
                        setPartySearchTerm("");
                      }}
                      onAddNew={() => setIsCreatePartyModalOpen(true)}
                      placeholder="Search vendor..."
                    />
                  ),
                },
                {
                  id: "returnNumber",
                  label: isDebitMemo ? "Debit Memo No." : "Return No.",
                  type: "text",
                  value: returnNumber,
                  onChange: setReturnNumber,
                  placeholder: "PR-001",
                },
                {
                  id: "returnDate",
                  label: isDebitMemo ? "Debit Memo Date" : "Return Date",
                  type: "date",
                  value: returnDate,
                  onChange: setReturnDate,
                },
                {
                  id: "originalInvoice",
                  label: "Original Bill Ref",
                  type: "select",
                  value: selectedInvoiceId,
                  onChange: (val) => {
                    const inv = invoices.find((i) => i.id === val);
                    if (inv) handleSelectInvoice(inv);
                    else setSelectedInvoiceId(val);
                  },
                  options: [
                    { label: "Direct Return (No Ref)", value: "" },
                    ...invoices.map((inv) => ({
                      label: `${inv.vendorInvoiceNumber || inv.invoiceNumber || inv.id.slice(0, 8)} (${new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString("en-IN")})`,
                      value: inv.id,
                    })),
                  ],
                },
                {
                  id: "placeOfSupply",
                  label: "Place of Supply",
                  type: "text",
                  value: "Gujarat (24)",
                },
              ]}
            />

            {/* MAIN 2-COLUMN WORKSPACE MATCHING REFERENCE IMAGE */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column (8 cols): Items Table + Notes & Additional Info */}
              <div className="lg:col-span-8 space-y-5">
                <DocumentItemsCard
                  title="Return Items & Services"
                  itemsCount={items.length}
                  totalQty={calculations.totalQty}
                  itemsTotal={calculations.finalTotal}
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
                              value={row.hsn || ""}
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
                              onChange={(e) => updateItemLine(idx, "quantity", Number(e.target.value) || 0)}
                              className="w-full text-xs py-1.5 px-2 text-right font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                            />
                          </td>

                          <td className="py-3 px-3">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={row.unitPrice}
                              onChange={(e) => updateItemLine(idx, "unitPrice", Number(e.target.value) || 0)}
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
                              onClick={() => removeItemLine(idx)}
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

              {/* Right Column (4 cols): Summary Card + Payment Adjustment Card */}
              <div className="lg:col-span-4 space-y-5">
                <DocumentSummaryCard
                  title={isDebitMemo ? "Debit Memo Summary" : "Return Summary"}
                  subtotal={calculations.totalTaxable}
                  discount={calculations.totalDiscount > 0 ? calculations.totalDiscount : undefined}
                  cgst={calculations.totalTax > 0 ? Number((calculations.totalTax / 2).toFixed(2)) : undefined}
                  sgst={calculations.totalTax > 0 ? Number((calculations.totalTax / 2).toFixed(2)) : undefined}
                  roundOff={calculations.roundOffDiff !== 0 ? calculations.roundOffDiff : undefined}
                  grandTotal={calculations.finalTotal}
                />

                <DocumentPaymentCard
                  amountReceived={isFullyPaid ? calculations.finalTotal : (Number(amountReceived) || 0)}
                  onAmountReceivedChange={(val) => {
                    setIsFullyPaid(false);
                    setAmountReceived(val === "" ? 0 : val);
                  }}
                  paymentMode={paymentMode}
                  onPaymentModeChange={setPaymentMode}
                  balanceDue={calculations.balance}
                  onPaidInFull={() => {
                    setIsFullyPaid(true);
                    setAmountReceived(calculations.finalTotal);
                  }}
                />
              </div>
            </div>

            {/* STICKY BOTTOM ACTION BAR */}
            <DocumentBottomBar
              totalItems={items.length}
              totalAmount={calculations.finalTotal}
              onSaveAsDraft={() => handleSubmit(false)}
              onSave={() => handleSubmit(false)}
              isSaving={isSubmitting}
              saveButtonLabel={isDebitMemo ? "Save Debit Memo" : "Save Purchase Return"}
              backHref={isDebitMemo ? "/purchases/debit-memo" : isDebitNote ? "/purchases/debit-note" : "/purchases/returns"}
            />
          </div>
        )}
      </div>


      <Modal
        isOpen={isEditPartyModalOpen}
        onClose={() => setIsEditPartyModalOpen(false)}
        title="Edit Party Details"
      >
        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Party / Vendor Name *</label>
            <input
              type="text"
              value={editPartyForm.name}
              onChange={(e) => setEditPartyForm({ ...editPartyForm, name: e.target.value })}
              className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:border-[#2563EB]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={editPartyForm.phone}
                onChange={(e) => setEditPartyForm({ ...editPartyForm, phone: e.target.value })}
                placeholder="e.g. 9825123456"
                className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 font-mono focus:outline-none focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">GSTIN</label>
              <input
                type="text"
                value={editPartyForm.gstin}
                onChange={(e) => setEditPartyForm({ ...editPartyForm, gstin: e.target.value.toUpperCase() })}
                placeholder="24AAAAA0000A1Z5"
                className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 font-mono uppercase focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Billing Address</label>
            <textarea
              rows={2}
              value={editPartyForm.billingAddress}
              onChange={(e) => setEditPartyForm({ ...editPartyForm, billingAddress: e.target.value })}
              placeholder="Enter complete billing address"
              className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#2563EB]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsEditPartyModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEditParty}
              className="px-5 py-2 bg-[#174B43] hover:bg-[#123B35] text-white font-bold rounded-lg transition-colors shadow-2xs"
            >
              Save Changes
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Party Modal */}
      <Modal
        isOpen={isCreatePartyModalOpen}
        onClose={() => setIsCreatePartyModalOpen(false)}
        title="Create New Party / Supplier"
      >
        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Party / Vendor Name *</label>
            <input
              type="text"
              autoFocus
              value={createPartyForm.name}
              onChange={(e) => setCreatePartyForm({ ...createPartyForm, name: e.target.value })}
              placeholder="e.g. Mahavir Enterprise"
              className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:border-[#2563EB]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={createPartyForm.phone}
                onChange={(e) => setCreatePartyForm({ ...createPartyForm, phone: e.target.value })}
                placeholder="10 digit mobile"
                className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 font-mono focus:outline-none focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">GSTIN</label>
              <input
                type="text"
                value={createPartyForm.gstin}
                onChange={(e) => setCreatePartyForm({ ...createPartyForm, gstin: e.target.value.toUpperCase() })}
                placeholder="15-digit GSTIN"
                className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 font-mono uppercase focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Billing Address</label>
            <textarea
              rows={2}
              value={createPartyForm.billingAddress}
              onChange={(e) => setCreatePartyForm({ ...createPartyForm, billingAddress: e.target.value })}
              placeholder="Enter address"
              className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#2563EB]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsCreatePartyModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateParty}
              className="px-5 py-2 bg-[#174B43] hover:bg-[#123B35] text-white font-bold rounded-lg transition-colors shadow-2xs"
            >
              Create & Select
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Item Modal */}
      <Modal
        isOpen={isCreateItemModalOpen}
        onClose={() => setIsCreateItemModalOpen(false)}
        title="Add New Inventory Item"
      >
        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Item Name *</label>
            <input
              type="text"
              autoFocus
              value={createItemForm.name}
              onChange={(e) => setCreateItemForm({ ...createItemForm, name: e.target.value })}
              placeholder="e.g. Parle-G Gold 1kg"
              className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:border-[#2563EB]"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">HSN Code</label>
              <input
                type="text"
                value={createItemForm.hsn}
                onChange={(e) => setCreateItemForm({ ...createItemForm, hsn: e.target.value })}
                placeholder="e.g. 1905"
                className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 font-mono focus:outline-none focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Purchase Rate (₹)</label>
              <input
                type="number"
                min="0"
                value={createItemForm.price || ""}
                onChange={(e) => setCreateItemForm({ ...createItemForm, price: Number(e.target.value) })}
                placeholder="0"
                className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 font-bold text-right focus:outline-none focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">GST Tax Rate</label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  step="any"
                  min="0"
                  max="100"
                  list="gst-rates-return"
                  value={createItemForm.taxRate}
                  onChange={(e) => setCreateItemForm({ ...createItemForm, taxRate: Number(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-full p-2 pr-6 border border-slate-300 rounded-lg text-slate-800 font-semibold text-right font-mono focus:outline-none focus:border-[#2563EB]"
                />
                <span className="absolute right-2 text-xs font-bold text-slate-400 pointer-events-none">%</span>
              </div>
              <datalist id="gst-rates-return">
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
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsCreateItemModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateItem}
              className="px-5 py-2 bg-[#174B43] hover:bg-[#123B35] text-white font-bold rounded-lg transition-colors shadow-2xs"
            >
              Save Item
            </button>
          </div>
        </div>
      </Modal>

      {/* Bank Account Modal */}
      <Modal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
        title="Bank Account Details"
      >
        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Select Bank</label>
            <select
              value={bankForm.bankName}
              onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
              className="w-full p-2 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:outline-none focus:border-[#2563EB]"
            >
              {COMMON_BANKS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {bankForm.bankName === "Other Bank" && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">Custom Bank Name *</label>
              <input
                type="text"
                value={bankForm.customBankName}
                onChange={(e) => setBankForm({ ...bankForm, customBankName: e.target.value })}
                placeholder="Enter bank name"
                className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 font-bold focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Account Number *</label>
            <input
              type="text"
              value={bankForm.accountNumber}
              onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value.trim() })}
              placeholder="e.g. 50200012345678"
              className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">IFSC Code *</label>
              <input
                type="text"
                value={bankForm.ifscCode}
                onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value.toUpperCase().trim() })}
                placeholder="e.g. HDFC0000123"
                className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold uppercase focus:outline-none focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Branch Name</label>
              <input
                type="text"
                value={bankForm.branchName}
                onChange={(e) => setBankForm({ ...bankForm, branchName: e.target.value })}
                placeholder="e.g. Ahmedabad Main"
                className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Account Holder Name</label>
            <input
              type="text"
              value={bankForm.accountHolderName}
              onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value })}
              placeholder={currentCompany?.tradeName || currentCompany?.legalName || "Audit Traders Ahmedabad"}
              className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsBankModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveBank}
              className="px-5 py-2 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-2xs"
            >
              Save Bank Account
            </button>
          </div>
        </div>
      </Modal>

      {/* Payment QR Modal */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title="Setup Payment QR Code"
      >
        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">UPI ID / VPA *</label>
            <input
              type="text"
              autoFocus
              value={qrForm.upiId}
              onChange={(e) => setQrForm({ ...qrForm, upiId: e.target.value.trim() })}
              placeholder="e.g. 9898990001@upi or business@okhdfcbank"
              className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Payee Name</label>
            <input
              type="text"
              value={qrForm.payeeName}
              onChange={(e) => setQrForm({ ...qrForm, payeeName: e.target.value })}
              placeholder={currentCompany?.tradeName || currentCompany?.legalName || "Audit Traders"}
              className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          {/* Live QR Preview */}
          {upiUri ? (
            <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-2xs shrink-0">
                <InvoiceQrCode value={upiUri} size={90} label="UPI QR" showTooltip={false} />
              </div>
              <div className="space-y-1 text-[11px] text-slate-600">
                <p className="font-bold text-slate-900">Live Scannable QR Preview</p>
                <p>Accepts payments via GPay, PhonePe, Paytm, BHIM, and banking apps.</p>
                <p className="font-mono text-teal-700 font-bold">{qrForm.upiId}</p>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 italic">Enter a valid UPI ID to generate the live QR preview.</p>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsQrModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveQr}
              className="px-5 py-2 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-2xs"
            >
              Attach Payment QR
            </button>
          </div>
        </div>
      </Modal>

      {/* Signature Modal */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSaveSignature={(sig) => {
          handleUpdateSignature(sig);
          setIsSignatureModalOpen(false);
          showToast("Signature added successfully!");
        }}
        existingSignature={signatureData}
      />

      {/* Quick Settings Modal (Wired from all gear icons) */}
      <QuickSettingsModal
        isOpen={isQuickSettingsOpen}
        onClose={() => setIsQuickSettingsOpen(false)}
        settings={quickSettings}
        initialTab={quickSettingsTab}
        onSave={handleSaveQuickSettings}
        voucherType="purchase"
        voucherTitle="Debit Memo Settings"
        prefixLabel="Debit Memo Prefix"
        prefixPlaceholder="e.g. DM-26-"
        storageKey="billing_debit_memo_quick_settings"
      />
    </div>
  );
}
