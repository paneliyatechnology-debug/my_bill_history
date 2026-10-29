"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "../../../../context/auth-context";
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

        {/* 1. TOP NAVBAR */}
        <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-lg border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-4">
            <Link
              href={isDebitMemo ? "/purchases/debit-memo" : isDebitNote ? "/purchases/debit-note" : "/purchases/returns"}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <span>← Exit</span>
            </Link>

            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              {isEditMode ? `Edit ${voucherLabel}` : `Create ${voucherLabel}`}
            </h1>

            {/* Mode Toggle Pills (Edit Mode vs Preview Mode) */}
            <div className="hidden sm:inline-flex items-center bg-[#F1F5F9] p-0.5 rounded-lg text-xs font-medium text-slate-600">
              <button
                type="button"
                onClick={() => setViewMode("edit")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                  viewMode === "edit"
                    ? "bg-white text-[#4F46E5] font-semibold shadow-xs"
                    : "hover:text-slate-900"
                }`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>Edit Mode</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("preview")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                  viewMode === "preview"
                    ? "bg-white text-[#4F46E5] font-semibold shadow-xs"
                    : "hover:text-slate-900"
                }`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span>Preview Mode</span>
              </button>
            </div>
          </div>

          {/* Right section: Settings, Save & New, Save, Shortcuts */}
          <div className="flex items-center gap-2">
            {viewMode === "preview" ? (
              <>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("edit")}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#4F46E5] rounded hover:bg-[#4338CA] transition-colors shadow-2xs"
                >
                  Back to Edit
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => openSettings("invoice")}
                  title="Debit Memo Settings"
                  className="flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-2xs cursor-pointer transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSubmit(true)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  Save & New
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSubmit(false)}
                  className="flex items-center gap-1.5 px-5 py-1.5 text-xs font-semibold text-white bg-[#4F46E5] rounded hover:bg-[#4338CA] transition-colors shadow-2xs"
                >
                  {isSubmitting && <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  <span>{isEditMode ? "Update" : "Save"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => showToast("Shortcuts: Ctrl+S (Save), Alt+I (Add Item)")}
                  className="flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 shadow-2xs"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <line x1="6" y1="8" x2="6.01" y2="8" />
                    <line x1="10" y1="8" x2="10.01" y2="8" />
                    <line x1="14" y1="8" x2="14.01" y2="8" />
                    <line x1="18" y1="8" x2="18.01" y2="8" />
                    <line x1="6" y1="12" x2="6.01" y2="12" />
                    <line x1="10" y1="12" x2="10.01" y2="12" />
                    <line x1="14" y1="12" x2="14.01" y2="12" />
                    <line x1="18" y1="12" x2="18.01" y2="12" />
                    <line x1="8" y1="16" x2="16" y2="16" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700 flex items-center justify-between">
            <span>{errorMessage}</span>
            <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">✕</button>
          </div>
        )}

        {/* 2. DYNAMIC CONTENT: PREVIEW MODE vs EDIT MODE */}
        {viewMode === "preview" ? (
          /* PREVIEW MODE DOCUMENT MATCHING MYBILLBOOK */
          <div className="flex justify-center p-4 bg-slate-200 rounded-xl">
            <div className="w-full max-w-4xl bg-white p-8 rounded border-4 border-[#C8A26A] shadow-2xl text-slate-800 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between border-b-2 border-[#C8A26A] pb-4">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-[#1E3A8A] uppercase tracking-wide">
                    {currentCompany?.tradeName || currentCompany?.legalName || "MODI CHAI"}
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">📞 {(currentCompany as any)?.phone || "9510442798"}</p>
                  <p className="text-xs text-slate-600">📍 {(currentCompany as any)?.address || currentCompany?.city || "Gujarat, India"}</p>
                  {currentCompany?.gstin && (
                    <p className="text-xs font-mono font-bold text-slate-700 mt-0.5">GSTIN: {currentCompany.gstin}</p>
                  )}
                </div>

                <div className="text-right">
                  <h3 className="text-xl font-serif font-bold text-[#1E3A8A] tracking-wider uppercase">
                    {isDebitMemo ? "DEBIT MEMO" : isDebitNote ? "DEBIT NOTE" : "PURCHASE RETURN"}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {isDebitMemo ? "(PURCHASE RETURN)" : isDebitNote ? "(PURCHASE RETURN)" : "(DEBIT NOTE)"}
                  </p>
                  <div className="text-xs text-slate-700 mt-2 space-y-0.5">
                    <p>{voucherLabel} No: <strong>#{returnNumber}</strong></p>
                    <p>{voucherLabel} Date: <strong>{new Date(returnDate).toLocaleDateString("en-GB")}</strong></p>
                    {selectedInvoiceId && <p>Orig. Bill: <strong>#{invoiceSearchQuery.replace(/^#+/, "")}</strong></p>}
                  </div>
                </div>
              </div>

              {/* Bill To */}
              <div className="bg-[#FAF8F5] p-4 rounded border border-[#EBE4D8] text-xs">
                <p className="font-bold text-[#1E3A8A] uppercase tracking-wider text-[11px] mb-1">
                  Bill To
                </p>
                <p className="text-sm font-bold text-slate-900">{selectedParty?.name || "Cash Customer / Vendor"}</p>
                {selectedParty?.phone && <p className="text-slate-600 mt-0.5">Mobile: {selectedParty.phone}</p>}
                {selectedParty?.gstin && <p className="text-slate-600">GSTIN: {selectedParty.gstin}</p>}
                {selectedParty?.billingAddress && <p className="text-slate-500 mt-0.5">{selectedParty.billingAddress}</p>}
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 overflow-hidden">
                <table className="min-w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F5EFE6] border-b border-slate-300 font-semibold text-slate-800">
                    <tr>
                      <th className="px-3 py-2 w-10 text-center">No</th>
                      <th className="px-3 py-2">Items</th>
                      <th className="px-3 py-2">HSN</th>
                      <th className="px-3 py-2 text-right">Qty.</th>
                      <th className="px-3 py-2 text-right">Rate</th>
                      <th className="px-3 py-2 text-right">Discount</th>
                      <th className="px-3 py-2 text-right">Tax</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((line, idx) => (
                      <tr key={line.id}>
                        <td className="px-3 py-2.5 text-center text-slate-500">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-semibold text-slate-900">{line.name || `Item #${idx + 1}`}</td>
                        <td className="px-3 py-2.5 text-slate-600">{line.hsn || "—"}</td>
                        <td className="px-3 py-2.5 text-right font-medium">{line.quantity}</td>
                        <td className="px-3 py-2.5 text-right">₹ {line.unitPrice.toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-right text-slate-600">
                          {line.discount > 0 ? `₹ ${line.discount} (${line.discountType})` : "₹ 0.00"}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-600">
                          ₹ {line.taxAmount.toFixed(2)} ({line.taxRate}%)
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                          ₹ {line.totalAmount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="flex justify-end pt-2">
                <div className="w-72 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Amount:</span>
                    <span>₹ {calculations.totalTaxable.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST / Tax Amount:</span>
                    <span>₹ {calculations.totalTax.toFixed(2)}</span>
                  </div>
                  {additionalCharges > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Additional Charges:</span>
                      <span>₹ {additionalCharges.toFixed(2)}</span>
                    </div>
                  )}
                  {overallDiscount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Overall Discount:</span>
                      <span>- ₹ {overallDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {calculations.roundOffDiff !== 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Round Off:</span>
                      <span>{calculations.roundOffDiff >= 0 ? `+ ₹${calculations.roundOffDiff}` : `- ₹${Math.abs(calculations.roundOffDiff)}`}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t-2 border-slate-900 pt-2 text-sm font-bold text-slate-900">
                    <span>Grand Total:</span>
                    <span className="text-[#1E3A8A]">₹ {calculations.finalTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-700">
                    <span>Amount Paid / Refunded:</span>
                    <span>₹ {calculations.paid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-[#16A34A]">
                    <span>Balance Amount:</span>
                    <span>₹ {calculations.balance.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Bank Details & Payment QR Section */}
              {(bankAdded || qrAdded) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-4 pb-1 text-xs">
                  {bankAdded && (
                    <div className="rounded-lg border border-[#EBE4D8] bg-[#FAF8F5] p-3 text-slate-700">
                      <p className="font-bold text-[#1E3A8A] uppercase tracking-wider text-[11px] mb-1.5 flex items-center gap-1.5">
                        <span>🏛️</span> Bank Details
                      </p>
                      <div className="space-y-0.5 text-xs">
                        <p>
                          <span className="text-slate-500">Bank Name:</span>{" "}
                          <strong>{effectiveBankName}</strong>
                        </p>
                        <p>
                          <span className="text-slate-500">A/c No:</span>{" "}
                          <strong className="font-mono">{bankForm.accountNumber}</strong>
                        </p>
                        <p>
                          <span className="text-slate-500">IFSC Code:</span>{" "}
                          <strong className="font-mono">{bankForm.ifscCode}</strong>
                        </p>
                        {bankForm.branchName && (
                          <p>
                            <span className="text-slate-500">Branch:</span>{" "}
                            <strong>{bankForm.branchName}</strong>
                          </p>
                        )}
                        {bankForm.accountHolderName && (
                          <p>
                            <span className="text-slate-500">Account Holder:</span>{" "}
                            <strong>{bankForm.accountHolderName}</strong>
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {qrAdded && upiUri && (
                    <div className="rounded-lg border border-indigo-200 bg-white p-3 text-slate-700 flex items-center justify-between gap-3 shadow-2xs">
                      <div>
                        <p className="font-bold text-slate-900 text-xs mb-1 flex items-center gap-1">
                          <span>📱</span> Scan &amp; Pay via UPI
                        </p>
                        <p className="text-[11px] text-slate-500 mb-1">
                          Scan with GPay, PhonePe, Paytm or any UPI App
                        </p>
                        <p className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded inline-block border border-indigo-100">
                          {qrForm.upiId}
                        </p>
                      </div>
                      <div className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-2xs shrink-0">
                        <InvoiceQrCode value={upiUri} size={72} label="UPI QR" showTooltip={false} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Terms & Signature */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-6 text-xs text-slate-500">
                <div>
                  <p className="font-semibold text-slate-700 mb-1">Terms & Conditions:</p>
                  <p className="text-[11px] leading-relaxed whitespace-pre-line">{terms}</p>
                </div>
                <div className="text-right flex flex-col justify-end items-end">
                  <p className="text-slate-700 font-semibold mb-1">For {currentCompany?.tradeName || currentCompany?.legalName || "MODI CHAI"}</p>
                  {signatureData ? (
                    <div className="group relative cursor-pointer" onClick={() => setIsSignatureModalOpen(true)}>
                      <img src={signatureData} alt="Signature" className="h-14 object-contain my-1" />
                      <span className="hidden group-hover:inline text-[9px] text-blue-600 underline absolute -top-3 right-0">Change</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsSignatureModalOpen(true)}
                      className="h-12 border border-dashed border-slate-300 rounded px-3 py-1 text-[11px] font-medium text-blue-600 hover:bg-slate-50 flex items-center justify-center my-1"
                    >
                      + Add Signature
                    </button>
                  )}
                  <p className="text-[11px] text-slate-500 border-t border-slate-300 pt-1 w-44 text-center">Authorized Signatory</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* EDIT MODE */
          <>
            {/* Top Section: Bill From, Ship From, Invoice Details */}
            <div className={`grid grid-cols-1 ${selectedParty ? "lg:grid-cols-3" : "lg:grid-cols-2"} gap-3`}>
              {/* Bill From Card */}
              <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs relative">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
                  <span>Bill From</span>
                  {selectedParty && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleOpenEditParty}
                        className="flex items-center gap-1 text-slate-600 hover:text-[#2563EB] font-medium"
                      >
                        <span>✎ Edit Party</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPartySearchTerm("");
                          setIsPartySearchOpen(true);
                        }}
                        className="flex items-center gap-1 text-[#2563EB] hover:underline font-semibold"
                      >
                        <span>🔄 Change Party</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* If party search dropdown is open */}
                {isPartySearchOpen ? (
                  <div className="space-y-2 relative z-30">
                    <div className="relative">
                      <input
                        type="text"
                        autoFocus
                        value={partySearchTerm}
                        onChange={(e) => setPartySearchTerm(e.target.value)}
                        placeholder="Search party by name or number"
                        className="w-full rounded border border-[#2563EB] px-3 py-1.5 text-xs text-slate-800 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setIsPartySearchOpen(false)}
                        className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="rounded border border-slate-200 max-h-52 overflow-y-auto divide-y divide-slate-100 text-xs bg-white shadow-xl">
                      <div className="flex justify-between px-3 py-1.5 bg-[#F8FAFC] font-semibold text-[11px] text-slate-500 sticky top-0 z-10">
                        <span>Party Name</span>
                        <span>Balance</span>
                      </div>
                      {parties
                        .filter(
                          (p) =>
                            p.name.toLowerCase().includes(partySearchTerm.toLowerCase()) ||
                            (p.phone && p.phone.includes(partySearchTerm)),
                        )
                        .map((p) => (
                          <div
                            key={p.id}
                            onClick={() => handleSelectParty(p)}
                            className="px-3 py-2 flex items-center justify-between hover:bg-indigo-50/60 cursor-pointer transition-colors"
                          >
                            <div>
                              <div className="font-semibold text-slate-900">{p.name}</div>
                              {p.phone && <div className="text-[11px] text-slate-500">{p.phone}</div>}
                            </div>
                            <div className="text-right font-medium text-slate-700">
                              ₹ {p.currentBalance ? Number(p.currentBalance).toLocaleString("en-IN") : "0"}
                            </div>
                          </div>
                        ))}
                      <div
                        onClick={() => {
                          setCreatePartyForm({
                            name: partySearchTerm,
                            phone: "",
                            gstin: "",
                            billingAddress: "",
                          });
                          setIsCreatePartyModalOpen(true);
                        }}
                        className="p-2.5 text-center font-bold text-[#2563EB] hover:bg-indigo-50 cursor-pointer border-t border-dashed border-indigo-200 sticky bottom-0 bg-white"
                      >
                        + Create Party
                      </div>
                    </div>
                  </div>
                ) : selectedParty ? (
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-slate-900">{selectedParty.name}</h4>
                    <p className="text-xs text-slate-600">
                      Phone Number: <span className="font-medium text-slate-800">{selectedParty.phone || "9510442798"}</span>
                    </p>
                    {selectedParty.gstin && (
                      <p className="text-xs text-slate-500 font-mono">GSTIN: {selectedParty.gstin}</p>
                    )}
                    {selectedParty.billingAddress && (
                      <p className="text-xs text-slate-500">
                        {typeof selectedParty.billingAddress === "string"
                          ? selectedParty.billingAddress
                          : (selectedParty.billingAddress as any)?.line1 || ""}
                      </p>
                    )}
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      setPartySearchTerm("");
                      setIsPartySearchOpen(true);
                    }}
                    className="w-full h-28 rounded-lg border-2 border-dashed border-[#93C5FD] bg-[#F0F7FF] flex flex-col items-center justify-center cursor-pointer hover:bg-[#E5F0FF] transition-all"
                  >
                    <span className="text-sm font-semibold text-[#2563EB]">+ Add Party</span>
                  </div>
                )}
              </div>

              {/* Ship From Card */}
              {selectedParty && (
                <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
                    <span>Ship From</span>
                    <button type="button" onClick={() => showToast("Shipping address updated")} className="text-slate-600 hover:text-[#2563EB]">
                      🔄 Change Shipping Address
                    </button>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-slate-900">
                      {currentCompany?.tradeName || currentCompany?.legalName || "Business Name"}
                    </h4>
                    <p className="text-xs text-slate-600">
                      Phone Number: <span className="font-medium text-slate-800">{(currentCompany as any)?.phone || "9510442798"}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Invoice Details Card */}
              <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Invoice Details</span>
                  <button
                    type="button"
                    onClick={() => openSettings("invoice")}
                    title="Customize Voucher Details"
                    className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5 rounded hover:bg-slate-100 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">{voucherLabel} No.</label>
                    <input
                      type="text"
                      value={returnNumber}
                      onChange={(e) => setReturnNumber(e.target.value)}
                      className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 mb-1">{voucherLabel} Date</label>
                    <input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-[#2563EB]"
                    />
                  </div>
                </div>

                {/* Link to Purchase Invoice */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-slate-600 font-medium">Link to Purchase Invoice :</label>
                    <span className="rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 border border-indigo-200">
                      Auto-fill
                    </span>
                  </div>

                  {selectedInvoiceId ? (
                    <div className="flex items-center justify-between rounded-lg border border-indigo-300 bg-indigo-50/70 p-2.5 text-xs transition-all shadow-2xs">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[11px] text-white">✓</span>
                        <div>
                          <p className="font-bold text-indigo-950">Linked: #{invoiceSearchQuery.replace(/^#+/, "")}</p>
                          <p className="text-[10px] text-indigo-700">Vendor &amp; items auto-filled from purchase bill</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleUnlinkInvoice}
                        className="rounded border border-indigo-200 bg-white px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 shadow-2xs transition-colors"
                      >
                        ✕ Unlink / Change
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={invoiceSearchQuery}
                        onFocus={() => setIsInvoiceDropdownOpen(true)}
                        onChange={(e) => {
                          setInvoiceSearchQuery(e.target.value);
                          setIsInvoiceDropdownOpen(true);
                        }}
                        placeholder={selectedParty ? `Search purchase bills for ${selectedParty.name}...` : "Search all purchase bills to auto-fill..."}
                        className="w-full rounded border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#2563EB]"
                      />
                    </div>
                  )}

                  {!selectedInvoiceId && isInvoiceDropdownOpen && (
                    <div className="absolute left-0 right-0 top-14 z-50 rounded-lg border border-slate-200 bg-white py-1 shadow-xl max-h-56 overflow-y-auto text-xs divide-y divide-slate-100">
                      {isLoadingInvoices ? (
                        <div className="p-4 text-center text-slate-400">Loading purchase invoices...</div>
                      ) : invoices.length === 0 ? (
                        <div className="p-4 text-center text-slate-400">
                          {selectedParty ? `No purchase bills for ${selectedParty.name}` : "No purchase bills found."}
                        </div>
                      ) : (
                        invoices
                          .filter((inv) => {
                            const q = invoiceSearchQuery.toLowerCase();
                            const num = (inv.vendorInvoiceNumber || inv.invoiceNumber || "").toLowerCase();
                            const party = (inv.party?.name || "").toLowerCase();
                            return num.includes(q) || party.includes(q);
                          })
                          .map((inv) => (
                            <div
                              key={inv.id}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectInvoice(inv);
                              }}
                              className="px-3 py-2 hover:bg-indigo-50/60 cursor-pointer flex items-center justify-between transition-colors"
                            >
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900">
                                    Bill #{inv.vendorInvoiceNumber || inv.invoiceNumber || inv.id.slice(0, 8)}
                                  </span>
                                  {inv.party?.name && (
                                    <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                                      {inv.party.name}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("en-GB") : ""}
                                  {Array.isArray(inv.items) && ` • ${inv.items.length} items`}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-slate-900 block">
                                  ₹ {Number(inv.grandTotal || inv.totalAmount || 0).toLocaleString("en-IN")}
                                </span>
                                <span className="text-[10px] text-indigo-600 font-semibold hover:underline">
                                  Auto-fill ➜
                                </span>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-visible">
              <div className="overflow-x-auto lg:overflow-visible">
                <table className="min-w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-3 py-2.5 w-12 text-center">NO</th>
                      <th className="px-3 py-2.5 min-w-[260px]">ITEMS</th>
                      {quickSettings.showHsnColumn !== false && <th className="px-3 py-2.5 w-24">HSN</th>}
                      <th className="px-3 py-2.5 w-20 text-right">QTY</th>
                      <th className="px-3 py-2.5 w-28 text-right">PRICE/ITEM (₹)</th>
                      {quickSettings.showDiscountColumn !== false && <th className="px-3 py-2.5 w-32 text-right">DISCOUNT</th>}
                      {quickSettings.showTaxColumn !== false && <th className="px-3 py-2.5 w-28 text-right">TAX</th>}
                      <th className="px-3 py-2.5 w-28 text-right">AMOUNT (₹)</th>
                      <th className="px-2 py-2.5 w-8 text-center">
                        <button
                          type="button"
                          onClick={() => openSettings("items")}
                          title="Customize Item Columns"
                          className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 cursor-pointer transition-colors inline-flex items-center justify-center"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                          </svg>
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((line, idx) => (
                      <tr key={line.id} className={`hover:bg-slate-50/50 relative ${activeItemAutocompleteIdx === idx ? "z-40" : "z-10"}`}>
                        <td className="px-3 py-2 text-center text-slate-400 font-medium">{idx + 1}</td>
                        
                        {/* ITEM NAME */}
                        <td className="px-3 py-2 relative item-autocomplete-container">
                          {selectedInvoiceId ? (
                            <div className="py-1">
                              <p className="font-bold text-slate-900 text-xs">{line.name}</p>
                              {line.purchaseItemId && (
                                <span className="inline-flex items-center text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded mt-0.5">
                                  From Bill
                                </span>
                              )}
                            </div>
                          ) : (
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

                              {/* Autocomplete for Item */}
                              {activeItemAutocompleteIdx === idx && (
                                <div
                                  className="absolute left-0 top-[calc(100%+4px)] z-50 w-full min-w-[520px] max-w-[680px] rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden text-xs flex flex-col"
                                  style={{
                                    boxShadow: "0 18px 40px -4px rgba(0, 0, 0, 0.16), 0 8px 16px -4px rgba(0, 0, 0, 0.08)",
                                  }}
                                  onMouseDown={(e) => e.preventDefault()}
                                >
                                  {/* Table Header */}
                                  <div className="flex justify-between items-center px-4 py-2.5 bg-[#F8FAFC] text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 shrink-0 select-none">
                                    <span>{lang === "gu" ? "આઇટમ વિગત (ITEM DESCRIPTION)" : "ITEM DESCRIPTION"}</span>
                                    <span>{lang === "gu" ? "ભાવ / સ્ટોક (RATE / STOCK)" : "RATE / STOCK"}</span>
                                  </div>

                                  {/* Items List */}
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
                                          className="px-4 py-2.5 hover:bg-indigo-50/70 cursor-pointer flex items-center justify-between transition-colors group"
                                        >
                                          <div className="pr-3">
                                            <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
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
                                        <p className="text-[11px] text-slate-400 mt-1">
                                          {lang === "gu"
                                            ? "નીચે આપેલ બટનથી નવી આઇટમ ઉમેરો"
                                            : "Create a new item using the button below"}
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Add New Item Button */}
                                  <div
                                    onClick={() => {
                                      setActiveRowForNewItem(idx);
                                      setCreateItemForm({
                                        name: line.name || "",
                                        hsn: "",
                                        price: 0,
                                        taxRate: 18,
                                      });
                                      setIsCreateItemModalOpen(true);
                                      setActiveItemAutocompleteIdx(null);
                                    }}
                                    className="p-2.5 text-center font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/80 cursor-pointer border-t border-dashed border-indigo-200 bg-white shrink-0 transition-colors flex items-center justify-center gap-1.5 select-none"
                                  >
                                    <span className="text-base leading-none font-bold">+</span>
                                    <span>{lang === "gu" ? "નવી આઇટમ ઉમેરો (Add New Item)" : "Add New Item"}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* HSN */}
                        {quickSettings.showHsnColumn !== false && (
                          <td className="px-3 py-2">
                            {selectedInvoiceId ? (
                              <span className="text-xs text-slate-600 font-medium px-2 py-1 block">
                                {line.hsn || "—"}
                              </span>
                            ) : (
                              <input
                                type="text"
                                value={line.hsn || ""}
                                onChange={(e) => updateItemLine(idx, "hsn", e.target.value)}
                                placeholder="HSN"
                                className="w-full rounded border border-transparent hover:border-slate-300 focus:border-[#2563EB] bg-transparent px-2 py-1 text-xs text-slate-600"
                              />
                            )}
                          </td>
                        )}

                        {/* QTY (Editable return quantity with max limit) */}
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min="1"
                            max={line.originalQuantity}
                            value={line.quantity}
                            onChange={(e) => updateItemLine(idx, "quantity", Number(e.target.value))}
                            className="w-16 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-right font-bold text-slate-800 focus:outline-hidden focus:border-[#2563EB]"
                          />
                          {line.originalQuantity !== undefined && (
                            <span className="block text-[9px] text-slate-400 mt-0.5">
                              Max: {line.originalQuantity}
                            </span>
                          )}
                        </td>

                        {/* PRICE / ITEM (Locked when invoice selected) */}
                        <td className="px-3 py-2 text-right">
                          {selectedInvoiceId ? (
                            <span className="font-bold text-slate-800 text-xs block px-2 py-1">
                              {line.unitPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <input
                              type="number"
                              min="0"
                              value={line.unitPrice}
                              onChange={(e) => updateItemLine(idx, "unitPrice", Number(e.target.value))}
                              className="w-20 rounded border border-slate-200 px-2 py-1 text-xs text-right font-bold text-slate-800 focus:outline-hidden focus:border-[#2563EB]"
                            />
                          )}
                        </td>

                        {/* DISCOUNT (Locked when invoice selected) */}
                        {quickSettings.showDiscountColumn !== false && (
                          <td className="px-3 py-2 text-right">
                            {selectedInvoiceId ? (
                              <span className="text-xs text-slate-600 font-medium block px-1.5 py-1">
                                {line.discount ? `${line.discount} ${line.discountType}` : "0"}
                              </span>
                            ) : (
                              <div className="inline-flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={line.discount}
                                  onChange={(e) => updateItemLine(idx, "discount", Number(e.target.value))}
                                  className="w-14 rounded border border-slate-200 px-1.5 py-1 text-xs text-right text-slate-600 focus:outline-hidden focus:border-[#2563EB]"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateItemLine(idx, "discountType", line.discountType === "%" ? "₹" : "%")}
                                  className="rounded bg-slate-100 hover:bg-slate-200 px-1 py-1 text-[11px] font-bold text-slate-700"
                                >
                                  {line.discountType}
                                </button>
                              </div>
                            )}
                          </td>
                        )}

                        {/* TAX (Locked when invoice selected) */}
                        {quickSettings.showTaxColumn !== false && (
                          <td className="px-3 py-2 text-right">
                            {selectedInvoiceId ? (
                              <span className="inline-block rounded bg-slate-100 text-slate-700 px-2 py-1 text-[11px] font-semibold">
                                GST @ {line.taxRate}%
                              </span>
                            ) : (
                              <div className="relative flex items-center min-w-[70px]">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  max="100"
                                  list="gst-rates-return"
                                  value={line.taxRate}
                                  onChange={(e) => updateItemLine(idx, "taxRate", Number(e.target.value) || 0)}
                                  placeholder="0"
                                  className="w-22 rounded border border-slate-200 px-1.5 pr-4 py-1 text-xs text-right text-slate-700 font-mono focus:outline-hidden focus:border-[#2563EB]"
                                />
                                <span className="absolute right-1 text-[11px] font-bold text-slate-400 pointer-events-none">%</span>
                              </div>
                            )}
                          </td>
                        )}
                        {/* AMOUNT (₹) */}
                        <td className="px-3 py-2 text-right font-bold text-slate-900">
                          ₹ {line.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* REMOVE / EXCLUDE LINE */}
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeItemLine(idx)}
                            title="Remove this item from return"
                            className="text-slate-300 hover:text-rose-500 font-bold p-1 rounded hover:bg-rose-50 transition-colors"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* + Add Item Row or Lock Notice when linked to invoice */}
                    {!selectedInvoiceId ? (
                      <tr>
                        <td colSpan={4 + (quickSettings.showHsnColumn !== false ? 1 : 0) + (quickSettings.showDiscountColumn !== false ? 1 : 0) + (quickSettings.showTaxColumn !== false ? 1 : 0)} className="p-3">
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
                              <svg className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 5h2v14H3zM7 5h1v14H7zM10 5h2v14h-2zM14 5h1v14h-1zM17 5h3v14h-3z" />
                              </svg>
                              <span>Scan Barcode</span>
                            </button>
                          </div>
                        </td>
                        <td />
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan={5 + (quickSettings.showHsnColumn !== false ? 1 : 0) + (quickSettings.showDiscountColumn !== false ? 1 : 0) + (quickSettings.showTaxColumn !== false ? 1 : 0)} className="py-2.5 px-4 bg-slate-50/80 text-center text-xs text-slate-500 border-t border-dashed border-slate-200">
                          <div className="flex items-center justify-center gap-2">
                            <span>🔒</span>
                            <span>Items are locked to Purchase Bill #{invoiceSearchQuery.replace(/^#+/, "")}. Only return quantity can be adjusted.</span>
                            <button
                              type="button"
                              onClick={handleUnlinkInvoice}
                              className="text-indigo-600 font-semibold hover:underline ml-1"
                            >
                              Unlink to add custom items
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Subtotal row */}
                    <tr className="bg-[#F8FAFC] border-t border-slate-200 font-semibold text-slate-700 text-xs">
                      <td colSpan={quickSettings.showHsnColumn !== false ? 3 : 2} className="px-4 py-2.5 text-right font-bold text-slate-600">
                        Subtotal
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                        {calculations.totalQty}
                      </td>
                      <td />
                      {quickSettings.showDiscountColumn !== false && (
                        <td className="px-3 py-2.5 text-right font-medium text-slate-700">
                          ₹ {calculations.totalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      )}
                      {quickSettings.showTaxColumn !== false && (
                        <td className="px-3 py-2.5 text-right font-medium text-slate-700">
                          ₹ {calculations.totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      )}
                      <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                        ₹ {calculations.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom section: Left (Notes, Terms, Bank, QR) + Right (Charges, Payments, Signature) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
              {/* Left Column */}
              <div className="space-y-3">
                {/* Add Notes */}
                <div className="bg-white rounded-lg border border-slate-200 p-3.5 shadow-2xs">
                  {!showNotesInput ? (
                    <button
                      type="button"
                      onClick={() => setShowNotesInput(true)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:underline"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      <span>Add Notes</span>
                    </button>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                        <span>Notes</span>
                        <button type="button" onClick={() => setShowNotesInput(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                      </div>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Enter notes or return reasons..."
                        className="w-full rounded border border-slate-300 p-2 text-xs text-slate-800 focus:outline-hidden focus:border-[#2563EB]"
                      />
                    </div>
                  )}
                </div>

                {/* Terms & Conditions */}
                {showTerms && (
                  <div className="bg-white rounded-lg border border-slate-200 p-3.5 shadow-2xs space-y-2">
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

                {/* Bank Account & Payment QR Sections */}
                <div className="space-y-2.5 pt-1">
                  {/* BANK ACCOUNT */}
                  {!bankAdded ? (
                    <button
                      type="button"
                      onClick={() => setIsBankModalOpen(true)}
                      className="flex items-center gap-2 text-xs font-semibold text-[#2563EB] hover:text-blue-700 hover:underline transition-colors"
                    >
                      <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M8 10v11M12 10v11M16 10v11M20 10v11" />
                      </svg>
                      <span>+ Add Bank Account</span>
                    </button>
                  ) : (
                    <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-2.5 text-xs text-slate-700 space-y-1.5 transition-all shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-blue-950">
                          <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M8 10v11M12 10v11M16 10v11M20 10v11" />
                          </svg>
                          <span>Bank Account Added ✓</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsBankModalOpen(true)}
                            className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                          >
                            ✎ Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setBankAdded(false);
                              showToast("Bank account removed from voucher");
                            }}
                            className="text-slate-400 hover:text-rose-600 text-xs font-bold cursor-pointer"
                            title="Remove Bank Account"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] text-slate-600 pt-0.5">
                        <p>
                          <span className="text-slate-400">Bank:</span>{" "}
                          <strong>{effectiveBankName}</strong>
                        </p>
                        <p>
                          <span className="text-slate-400">A/c:</span>{" "}
                          <strong className="font-mono">{bankForm.accountNumber}</strong>
                        </p>
                        <p>
                          <span className="text-slate-400">IFSC:</span>{" "}
                          <strong className="font-mono">{bankForm.ifscCode}</strong>
                        </p>
                        {bankForm.branchName && (
                          <p>
                            <span className="text-slate-400">Branch:</span>{" "}
                            <strong>{bankForm.branchName}</strong>
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* PAYMENT QR */}
                  {!qrAdded ? (
                    <button
                      type="button"
                      onClick={() => setIsQrModalOpen(true)}
                      className="flex items-center gap-2 text-xs font-semibold text-[#2563EB] hover:text-blue-700 hover:underline transition-colors"
                    >
                      <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                      </svg>
                      <span>+ Add Payment QR</span>
                    </button>
                  ) : (
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-2.5 text-xs text-slate-700 space-y-1.5 transition-all shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                          <svg className="w-4 h-4 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" />
                            <rect x="14" y="3" width="7" height="7" />
                            <rect x="14" y="14" width="7" height="7" />
                            <rect x="3" y="14" width="7" height="7" />
                          </svg>
                          <span>Payment QR Attached ✓</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsQrModalOpen(true)}
                            className="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer"
                          >
                            ✎ Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setQrAdded(false);
                              showToast("Payment QR removed from voucher");
                            }}
                            className="text-slate-400 hover:text-rose-600 text-xs font-bold cursor-pointer"
                            title="Remove Payment QR"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <div className="text-[11px]">
                          <p className="text-slate-400">UPI ID / VPA:</p>
                          <p className="font-mono font-bold text-indigo-900">{qrForm.upiId}</p>
                          {qrForm.payeeName && (
                            <p className="text-[10px] text-slate-500 mt-0.5">Payee: {qrForm.payeeName}</p>
                          )}
                        </div>
                        {upiUri && (
                          <div className="p-1 bg-white border border-slate-200 rounded shadow-2xs shrink-0">
                            <InvoiceQrCode value={upiUri} size={44} showTooltip={false} />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Charges, Totals, Payments & Signature Box */}
              <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3.5">
                {/* Add Additional Charges */}
                <div className="flex items-center justify-between text-xs">
                  {!showChargesInput ? (
                    <button
                      type="button"
                      onClick={() => setShowChargesInput(true)}
                      className="flex items-center gap-1.5 font-semibold text-[#2563EB] hover:underline"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 8v8M8 12h8" />
                      </svg>
                      <span>Add Additional Charges</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 font-medium">Charges:</span>
                      <input
                        type="number"
                        value={additionalCharges}
                        onChange={(e) => setAdditionalCharges(Number(e.target.value))}
                        className="w-20 rounded border border-slate-300 px-2 py-0.5 text-xs text-right"
                      />
                      <button type="button" onClick={() => setShowChargesInput(false)} className="text-slate-400">✕</button>
                    </div>
                  )}
                  <span className="font-semibold text-slate-800">
                    ₹ {additionalCharges.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Taxable Amount */}
                <div className="flex items-center justify-between text-xs text-slate-700">
                  <span className="font-medium">Taxable Amount</span>
                  <span className="font-semibold text-slate-900">
                    ₹ {calculations.totalTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Add Discount */}
                <div className="flex items-center justify-between text-xs">
                  {!showDiscountInput ? (
                    <button
                      type="button"
                      onClick={() => setShowDiscountInput(true)}
                      className="flex items-center gap-1.5 font-semibold text-[#2563EB] hover:underline"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="9" />
                        <line x1="9" y1="15" x2="15" y2="9" />
                      </svg>
                      <span>Add Discount</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 font-medium">Discount:</span>
                      <input
                        type="number"
                        value={overallDiscount}
                        onChange={(e) => setOverallDiscount(Number(e.target.value))}
                        className="w-18 rounded border border-slate-300 px-2 py-0.5 text-xs text-right"
                      />
                      <button
                        type="button"
                        onClick={() => setOverallDiscountType(overallDiscountType === "%" ? "₹" : "%")}
                        className="rounded bg-slate-100 hover:bg-slate-200 px-1 py-0.5 text-[11px] font-bold text-slate-700"
                      >
                        {overallDiscountType}
                      </button>
                      <button type="button" onClick={() => setShowDiscountInput(false)} className="text-slate-400">✕</button>
                    </div>
                  )}
                  <span className="font-semibold text-slate-800">
                    ₹ {overallDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Auto Round Off */}
                <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={autoRoundOff}
                      onChange={(e) => setAutoRoundOff(e.target.checked)}
                      className="rounded border-slate-300 text-[#4F46E5] focus:ring-0"
                    />
                    <span>Auto Round Off</span>
                  </label>

                  <div className="flex items-center gap-1">
                    <select
                      disabled={autoRoundOff}
                      value={roundOffType}
                      onChange={(e) => setRoundOffType(e.target.value as any)}
                      className="rounded border border-slate-200 px-1 py-0.5 text-[11px] bg-slate-50 disabled:opacity-75"
                    >
                      <option>+ Add</option>
                      <option>- Reduce</option>
                    </select>
                    <input
                      type="number"
                      disabled={autoRoundOff}
                      value={autoRoundOff ? calculations.roundOffDiff : manualRoundOff}
                      onChange={(e) => setManualRoundOff(Number(e.target.value))}
                      className="w-16 rounded border border-slate-200 px-1.5 py-0.5 text-xs text-right disabled:bg-slate-50"
                    />
                  </div>
                </div>

                {/* Total Amount Row */}
                <div className="flex items-center justify-between bg-[#F8FAFC] p-3 rounded-lg border border-slate-200">
                  <span className="text-sm font-bold text-slate-900">Total Amount:</span>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-slate-900">
                      ₹ {calculations.finalTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Total Amount Received (Refund) */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>Total Amount Received</span>
                    <span className="font-bold text-slate-900">
                      ₹ {calculations.paid.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs">₹</span>
                      <input
                        type="number"
                        min="0"
                        disabled={isFullyPaid}
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(Number(e.target.value))}
                        placeholder="0"
                        className="w-full rounded border border-slate-300 bg-white py-1.5 pl-6 pr-2.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-[#2563EB] disabled:bg-slate-50"
                      />
                    </div>

                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-[#2563EB]"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                      <option value="UPI">UPI</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={isFullyPaid}
                      onChange={(e) => handleToggleFullyPaid(e.target.checked)}
                      className="rounded border-slate-300 text-[#4F46E5] focus:ring-0"
                    />
                    <span>Mark as fully paid</span>
                  </label>
                </div>

                {/* Balance Amount in Green */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 font-bold text-[#16A34A]">
                  <span>Balance Amount</span>
                  <span>
                    ₹ {calculations.balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* + Add Signature Box with Canvas/Upload Integration */}
                <div className="pt-2 flex justify-end">
                  {!signatureData ? (
                    <div
                      onClick={() => setIsSignatureModalOpen(true)}
                      className="w-48 h-20 rounded-lg border-2 border-dashed border-[#93C5FD] bg-[#F0F7FF] flex flex-col items-center justify-center cursor-pointer hover:bg-[#E5F0FF] transition-colors"
                    >
                      <span className="text-xs font-semibold text-[#2563EB]">+ Add Signature</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">Draw or upload sign</span>
                    </div>
                  ) : (
                    <div className="w-48 p-2 rounded-lg border border-slate-200 bg-white shadow-2xs relative group text-center">
                      <img src={signatureData} alt="Authorized Signature" className="h-12 mx-auto object-contain" />
                      <p className="text-[10px] font-semibold text-slate-600 mt-1 border-t border-slate-100 pt-0.5">
                        Authorized Signatory
                      </p>
                      <div className="flex justify-center gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => setIsSignatureModalOpen(true)}
                          className="text-[10px] text-indigo-600 hover:underline font-semibold"
                        >
                          Change
                        </button>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateSignature(null)}
                          className="text-[10px] text-rose-600 hover:underline font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Edit Party Modal */}
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
              className="px-5 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold rounded-lg transition-colors shadow-2xs"
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
              className="px-5 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold rounded-lg transition-colors shadow-2xs"
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
              className="px-5 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold rounded-lg transition-colors shadow-2xs"
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
                <p className="font-mono text-indigo-700 font-bold">{qrForm.upiId}</p>
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
