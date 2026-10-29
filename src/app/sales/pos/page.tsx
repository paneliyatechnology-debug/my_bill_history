"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";
import { getPartyItemPrice } from "../../../lib/party-item-pricing";
import QRCode from "qrcode";

// Interfaces
interface CatalogItem {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  retailPrice: number;
  wholesalePrice?: number;
  purchaseRate?: number;
  taxRate: number;
  hsnCode?: string;
  currentStock?: number;
  unit?: string;
  mrp?: number;
  category?: {
    id: string;
    name: string;
  };
}

interface CartItem {
  id: string;
  item: CatalogItem;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  mrp: number;
  taxRate: number;
  description?: string;
}

interface Party {
  id: string;
  name: string;
  mobile?: string;
  gstin?: string;
  outstandingBalance?: number;
}

interface AdditionalCharge {
  id: string;
  name: string;
  amount: number;
}

interface BillingScreen {
  id: string;
  title: string;
  items: CartItem[];
  selectedRowIndex: number | null;
  customerName: string;
  customerMobile: string;
  selectedParty: Party | null;
  discountType: "BEFORE_TAX" | "AFTER_TAX";
  discountPercent: number;
  discountAmount: number;
  additionalCharges: AdditionalCharge[];
  paymentMode: "CASH" | "UPI" | "CHEQUE" | "CARD" | "SPLIT";
  receivedAmount: number | "";
  splitCash: number | "";
  splitOnline: number | "";
  notes?: string;
}

interface PosSettings {
  hideCustomerInfo: boolean;
  fullyPaidBills: boolean;
  roundOff: boolean;
  hideMrp: boolean;
  notes: boolean;
  itemDescription: boolean;
  printerType: "A4" | "80mm" | "58mm";
}

const DEFAULT_SETTINGS: PosSettings = {
  hideCustomerInfo: false,
  fullyPaidBills: true,
  roundOff: true,
  hideMrp: false,
  notes: false,
  itemDescription: false,
  printerType: "80mm",
};

export default function PosTerminalPage() {
  const router = useRouter();
  const { tenantContext, currentCompany, user } = useAuth();

  // Settings State
  const [settings, setSettings] = useState<PosSettings>(DEFAULT_SETTINGS);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [tempSettings, setTempSettings] = useState<PosSettings>(DEFAULT_SETTINGS);

  // Catalog & Parties
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [units, setUnits] = useState<Array<{ id: string; name: string; symbol: string }>>([]);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Multi-Screen Billing Tabs
  const [screens, setScreens] = useState<BillingScreen[]>([
    {
      id: "screen_1",
      title: "Billing Screen 1",
      items: [],
      selectedRowIndex: null,
      customerName: "Cash Sale",
      customerMobile: "",
      selectedParty: null,
      discountType: "AFTER_TAX",
      discountPercent: 0,
      discountAmount: 0,
      additionalCharges: [],
      paymentMode: "CASH",
      receivedAmount: "",
      splitCash: "",
      splitOnline: "",
      notes: "",
    },
  ]);
  const [activeScreenId, setActiveScreenId] = useState<string>("screen_1");

  // Active Screen Selector & Updater
  const currentScreen = useMemo(() => {
    return screens.find((s) => s.id === activeScreenId) || screens[0];
  }, [screens, activeScreenId]);

  const updateCurrentScreen = useCallback(
    (updater: (prev: BillingScreen) => BillingScreen) => {
      setScreens((prevScreens) =>
        prevScreens.map((s) => (s.id === activeScreenId ? updater(s) : s))
      );
    },
    [activeScreenId]
  );

  // Search & Filter State
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(true);
  const [searchHighlightIndex, setSearchHighlightIndex] = useState(0);

  // Refs
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchDropdownRef = useRef<HTMLDivElement | null>(null);
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null);

  // Modals
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [tempDiscount, setTempDiscount] = useState<{
    type: "BEFORE_TAX" | "AFTER_TAX";
    percent: number;
    amount: number;
  }>({ type: "AFTER_TAX", percent: 0, amount: 0 });

  const [isChargesModalOpen, setIsChargesModalOpen] = useState(false);
  const [tempCharges, setTempCharges] = useState<AdditionalCharge[]>([]);

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [tempCustomer, setTempCustomer] = useState<{
    name: string;
    mobile: string;
    partyId?: string;
  }>({ name: "Cash Sale", mobile: "" });

  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [newItemForm, setNewItemForm] = useState({
    type: "PRODUCT",
    categoryId: "",
    name: "",
    showInOnlineStore: false,
    salesPrice: "",
    taxInclusive: true,
    taxRate: "18",
    unit: "PCS",
    openingStock: "0",
  });
  const [isSavingNewItem, setIsSavingNewItem] = useState(false);

  // Quick Inline Edit Modal (Price, Qty, Discount)
  const [quickEditModal, setQuickEditModal] = useState<{
    isOpen: boolean;
    type: "PRICE" | "QTY" | "DISCOUNT";
    itemId: string;
    value: string;
  }>({ isOpen: false, type: "PRICE", itemId: "", value: "" });

  // How to use POS Help modal
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Receipt & Print
  const [lastReceipt, setLastReceipt] = useState<any | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string>("");

  // Offline queue
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);

  // Sound effect for barcode scanner
  const playBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1050, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {}
  }, []);

  // Load persisted POS settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mybill_pos_settings");
      if (saved) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      }
    } catch {}
  }, []);

  // Fetch initial items, parties, categories, units, invoices
  const fetchData = useCallback(async () => {
    try {
      const [itemsRes, partiesRes, categoriesRes, unitsRes, invoicesRes]: any = await Promise.all([
        apiClient.get("/masters/items").catch(() => []),
        apiClient.get("/masters/parties").catch(() => []),
        apiClient.get("/masters/categories").catch(() => []),
        apiClient.get("/masters/units").catch(() => []),
        apiClient.get("/sales/invoices", { limit: 15 }).catch(() => []),
      ]);

      const loadedItems = extractList<CatalogItem>(itemsRes);
      setItems(loadedItems);
      setParties(extractList<Party>(partiesRes));
      setCategories(extractList<{ id: string; name: string }>(categoriesRes));
      setUnits(extractList<{ id: string; name: string; symbol: string }>(unitsRes));
      setRecentInvoices(extractList<any>(invoicesRes));
    } catch {}
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchData();
    }
  }, [tenantContext.companyId, fetchData]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setIsSearchDropdownOpen(false);
      }
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(e.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Filter items based on category and search query
  const filteredCatalogItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return items.filter((it) => {
      if (selectedCategory !== "ALL" && it.category?.id !== selectedCategory) {
        return false;
      }
      if (!term) return true;
      return (
        it.name.toLowerCase().includes(term) ||
        (it.barcode && it.barcode.toLowerCase().includes(term)) ||
        (it.sku && it.sku.toLowerCase().includes(term)) ||
        (it.hsnCode && it.hsnCode.toLowerCase().includes(term)) ||
        (it.category?.name && it.category.name.toLowerCase().includes(term))
      );
    });
  }, [items, selectedCategory, searchTerm]);

  // Add Item to active screen cart
  const addItemToCart = useCallback(
    (catalogItem: CatalogItem) => {
      playBeep();
      const partyPrice = currentScreen.selectedParty?.id
        ? getPartyItemPrice(
            currentScreen.selectedParty.id,
            catalogItem.id,
            currentScreen.selectedParty.name,
            catalogItem.name
          )
        : null;

      const effectivePrice =
        partyPrice !== null
          ? partyPrice
          : Number(catalogItem.retailPrice) || 0;

      updateCurrentScreen((prev) => {
        const existingIdx = prev.items.findIndex((c) => c.item.id === catalogItem.id);
        if (existingIdx >= 0) {
          const updated = [...prev.items];
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: updated[existingIdx].quantity + 1,
          };
          return {
            ...prev,
            items: updated,
            selectedRowIndex: existingIdx,
          };
        } else {
          const newItem: CartItem = {
            id: `line_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            item: catalogItem,
            quantity: 1,
            unitPrice: effectivePrice,
            discountPercent: 0,
            mrp: Number(catalogItem.mrp) || effectivePrice,
            taxRate: Number(catalogItem.taxRate) || 0,
            description: "",
          };
          const nextItems = [...prev.items, newItem];
          return {
            ...prev,
            items: nextItems,
            selectedRowIndex: nextItems.length - 1,
          };
        }
      });

      setSearchTerm("");
      setIsSearchDropdownOpen(false);
      searchInputRef.current?.focus();
    },
    [currentScreen.selectedParty, playBeep, updateCurrentScreen]
  );

  // Barcode / Search Enter key handler
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsSearchDropdownOpen(true);
      setSearchHighlightIndex((prev) =>
        prev < filteredCatalogItems.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSearchHighlightIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const term = searchTerm.trim().toLowerCase();
      if (!term) return;

      const exactMatch = items.find(
        (it) =>
          it.barcode?.toLowerCase() === term ||
          it.sku?.toLowerCase() === term
      );
      if (exactMatch) {
        addItemToCart(exactMatch);
        return;
      }

      if (
        isSearchDropdownOpen &&
        filteredCatalogItems.length > 0 &&
        filteredCatalogItems[searchHighlightIndex]
      ) {
        addItemToCart(filteredCatalogItems[searchHighlightIndex]);
        return;
      }

      const nameMatch = items.find((it) => it.name.toLowerCase() === term);
      if (nameMatch) {
        addItemToCart(nameMatch);
        return;
      }

      if (filteredCatalogItems.length === 1) {
        addItemToCart(filteredCatalogItems[0]);
        return;
      }

      setIsSearchDropdownOpen(true);
    } else if (e.key === "Escape") {
      setIsSearchDropdownOpen(false);
    }
  };

  // Calculations for current active screen
  const { subTotal, taxTotal, totalDiscount, totalCharges, grandTotal, roundOff } =
    useMemo(() => {
      let sub = 0;
      let tax = 0;

      currentScreen.items.forEach((c) => {
        const lineBase = c.unitPrice * c.quantity;
        const lineDisc = (lineBase * (c.discountPercent || 0)) / 100;
        const netBase = Math.max(0, lineBase - lineDisc);
        const lineTax = (netBase * (c.taxRate || 0)) / 100;

        sub += netBase;
        tax += lineTax;
      });

      let billDisc = 0;
      if (currentScreen.discountType === "BEFORE_TAX") {
        billDisc =
          currentScreen.discountAmount > 0
            ? currentScreen.discountAmount
            : (sub * (currentScreen.discountPercent || 0)) / 100;
        const ratio = sub > 0 ? Math.max(0, sub - billDisc) / sub : 1;
        tax = tax * ratio;
      } else {
        const beforeChargesTotal = sub + tax;
        billDisc =
          currentScreen.discountAmount > 0
            ? currentScreen.discountAmount
            : (beforeChargesTotal * (currentScreen.discountPercent || 0)) / 100;
      }

      const charges = currentScreen.additionalCharges.reduce(
        (sum, ch) => sum + (Number(ch.amount) || 0),
        0
      );

      const rawTotal = Math.max(0, sub + tax - billDisc + charges);
      let rounded = rawTotal;
      let ro = 0;
      if (settings.roundOff) {
        rounded = Math.round(rawTotal);
        ro = Number((rounded - rawTotal).toFixed(2));
      }

      return {
        subTotal: sub,
        taxTotal: tax,
        totalDiscount: billDisc,
        totalCharges: charges,
        grandTotal: rounded,
        roundOff: ro,
      };
    }, [
      currentScreen.items,
      currentScreen.discountType,
      currentScreen.discountPercent,
      currentScreen.discountAmount,
      currentScreen.additionalCharges,
      settings.roundOff,
    ]);

  // Keep receivedAmount in sync if settings.fullyPaidBills is true or empty
  useEffect(() => {
    if (settings.fullyPaidBills) {
      updateCurrentScreen((prev) => ({
        ...prev,
        receivedAmount: grandTotal,
      }));
    }
  }, [grandTotal, settings.fullyPaidBills, updateCurrentScreen]);

  // Dynamic UPI QR code generation
  useEffect(() => {
    if (currentScreen.paymentMode === "UPI" && grandTotal > 0) {
      const vpa = (currentCompany as any)?.upiVpa || "merchant@upi";
      const name = currentCompany?.tradeName || currentCompany?.legalName || "Store";
      const upiUrl = `upi://pay?pa=${vpa}&pn=${encodeURIComponent(name)}&am=${grandTotal.toFixed(2)}&cu=INR&tn=POS%20Bill`;
      QRCode.toDataURL(upiUrl, {
        width: 180,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      })
        .then((url) => setUpiQrDataUrl(url))
        .catch(() => setUpiQrDataUrl(""));
    } else {
      setUpiQrDataUrl("");
    }
  }, [currentScreen.paymentMode, grandTotal, currentCompany]);

  // Tab management: Add new billing screen (Hold bill)
  const handleAddNewScreen = useCallback(() => {
    const nextNumber = screens.length + 1;
    const newScreenId = `screen_${Date.now()}`;
    const newScreen: BillingScreen = {
      id: newScreenId,
      title: `Billing Screen ${nextNumber}`,
      items: [],
      selectedRowIndex: null,
      customerName: "Cash Sale",
      customerMobile: "",
      selectedParty: null,
      discountType: "AFTER_TAX",
      discountPercent: 0,
      discountAmount: 0,
      additionalCharges: [],
      paymentMode: "CASH",
      receivedAmount: "",
      splitCash: "",
      splitOnline: "",
      notes: "",
    };

    setScreens((prev) => [...prev, newScreen]);
    setActiveScreenId(newScreenId);
    searchInputRef.current?.focus();
    setIsSearchDropdownOpen(true);
  }, [screens.length]);

  // Tab management: Close billing screen
  const handleCloseScreen = (screenId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (screens.length <= 1) {
      updateCurrentScreen((prev) => ({
        ...prev,
        items: [],
        selectedRowIndex: null,
        customerName: "Cash Sale",
        customerMobile: "",
        selectedParty: null,
        discountPercent: 0,
        discountAmount: 0,
        additionalCharges: [],
        receivedAmount: "",
      }));
      return;
    }

    const remaining = screens.filter((s) => s.id !== screenId);
    setScreens(remaining);
    if (activeScreenId === screenId) {
      setActiveScreenId(remaining[0].id);
    }
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isAnyModalOpen =
        isSettingsModalOpen ||
        isDiscountModalOpen ||
        isChargesModalOpen ||
        isCustomerModalOpen ||
        isNewItemModalOpen ||
        quickEditModal.isOpen ||
        isHelpModalOpen;

      if (e.key === "Escape") {
        if (isSearchDropdownOpen) {
          setIsSearchDropdownOpen(false);
          return;
        }
        setIsSettingsModalOpen(false);
        setIsDiscountModalOpen(false);
        setIsChargesModalOpen(false);
        setIsCustomerModalOpen(false);
        setIsNewItemModalOpen(false);
        setQuickEditModal((prev) => ({ ...prev, isOpen: false }));
        setIsHelpModalOpen(false);
        searchInputRef.current?.focus();
        return;
      }

      if (isAnyModalOpen) return;

      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === "q") {
          e.preventDefault();
          router.push("/sales/invoices");
        } else if (key === "s") {
          e.preventDefault();
          setTempSettings({ ...settings });
          setIsSettingsModalOpen(true);
        } else if (key === "b") {
          e.preventDefault();
          handleAddNewScreen();
        } else if (key === "i") {
          e.preventDefault();
          setIsNewItemModalOpen(true);
        } else if (key === "c") {
          e.preventDefault();
          updateCurrentScreen((prev) => ({ ...prev, items: [], selectedRowIndex: null }));
        } else if (key >= "1" && key <= "9") {
          const tabIndex = parseInt(key) - 1;
          if (screens[tabIndex]) {
            e.preventDefault();
            setActiveScreenId(screens[tabIndex].id);
          }
        }
        return;
      }

      if (e.key === "F1") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchDropdownOpen(true);
      } else if (e.key === "F2") {
        e.preventDefault();
        setTempDiscount({
          type: currentScreen.discountType,
          percent: currentScreen.discountPercent,
          amount: currentScreen.discountAmount,
        });
        setIsDiscountModalOpen(true);
      } else if (e.key === "F3") {
        e.preventDefault();
        setTempCharges(
          currentScreen.additionalCharges.length > 0
            ? [...currentScreen.additionalCharges]
            : [{ id: `ch_${Date.now()}`, name: "", amount: 0 }]
        );
        setIsChargesModalOpen(true);
      } else if (e.key === "F4") {
        e.preventDefault();
        const el = document.getElementById("pos-received-amount-input");
        el?.focus();
      } else if (e.key === "F5") {
        e.preventDefault();
        setTempCustomer({
          name: currentScreen.customerName,
          mobile: currentScreen.customerMobile,
          partyId: currentScreen.selectedParty?.id,
        });
        setIsCustomerModalOpen(true);
      } else if (e.key === "F6") {
        e.preventDefault();
        handleCheckout(true);
      } else if (e.key === "F7") {
        e.preventDefault();
        handleCheckout(false);
      }

      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") {
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        updateCurrentScreen((prev) => {
          if (prev.items.length === 0) return prev;
          const nextIdx =
            prev.selectedRowIndex === null || prev.selectedRowIndex >= prev.items.length - 1
              ? 0
              : prev.selectedRowIndex + 1;
          return { ...prev, selectedRowIndex: nextIdx };
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        updateCurrentScreen((prev) => {
          if (prev.items.length === 0) return prev;
          const prevIdx =
            prev.selectedRowIndex === null || prev.selectedRowIndex <= 0
              ? prev.items.length - 1
              : prev.selectedRowIndex - 1;
          return { ...prev, selectedRowIndex: prevIdx };
        });
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handleDeleteSelectedItem();
      } else if (e.key.toLowerCase() === "p") {
        e.preventDefault();
        handleTriggerEdit("PRICE");
      } else if (e.key.toLowerCase() === "q") {
        e.preventDefault();
        handleTriggerEdit("QTY");
      } else if (e.key.toLowerCase() === "d") {
        e.preventDefault();
        handleTriggerEdit("DISCOUNT");
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [
    isSettingsModalOpen,
    isDiscountModalOpen,
    isChargesModalOpen,
    isCustomerModalOpen,
    isNewItemModalOpen,
    quickEditModal.isOpen,
    isHelpModalOpen,
    isSearchDropdownOpen,
    screens,
    currentScreen,
    settings,
    router,
    handleAddNewScreen,
    updateCurrentScreen,
  ]);

  const handleDeleteSelectedItem = () => {
    if (currentScreen.selectedRowIndex === null || currentScreen.items.length === 0) return;
    updateCurrentScreen((prev) => {
      const filtered = prev.items.filter((_, idx) => idx !== prev.selectedRowIndex);
      const nextIdx = filtered.length === 0 ? null : Math.min(prev.selectedRowIndex || 0, filtered.length - 1);
      return {
        ...prev,
        items: filtered,
        selectedRowIndex: nextIdx,
      };
    });
  };

  const handleTriggerEdit = (type: "PRICE" | "QTY" | "DISCOUNT") => {
    if (currentScreen.selectedRowIndex === null || currentScreen.items.length === 0) return;
    const selectedItem = currentScreen.items[currentScreen.selectedRowIndex];
    if (!selectedItem) return;

    const initialVal =
      type === "PRICE"
        ? String(selectedItem.unitPrice)
        : type === "QTY"
        ? String(selectedItem.quantity)
        : String(selectedItem.discountPercent || 0);

    setQuickEditModal({
      isOpen: true,
      type,
      itemId: selectedItem.id,
      value: initialVal,
    });
  };

  const handleApplyQuickEdit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = parseFloat(quickEditModal.value) || 0;

    updateCurrentScreen((prev) => {
      const updated = prev.items.map((it) => {
        if (it.id === quickEditModal.itemId) {
          if (quickEditModal.type === "PRICE") {
            return { ...it, unitPrice: Math.max(0, val) };
          } else if (quickEditModal.type === "QTY") {
            return { ...it, quantity: Math.max(1, val) };
          } else if (quickEditModal.type === "DISCOUNT") {
            return { ...it, discountPercent: Math.min(100, Math.max(0, val)) };
          }
        }
        return it;
      });
      return { ...prev, items: updated };
    });

    setQuickEditModal((prev) => ({ ...prev, isOpen: false }));
    searchInputRef.current?.focus();
  };

  const updateItemQty = (lineId: string, delta: number) => {
    updateCurrentScreen((prev) => {
      const updated = prev.items
        .map((it) => {
          if (it.id === lineId) {
            const nextQty = it.quantity + delta;
            return nextQty > 0 ? { ...it, quantity: nextQty } : null;
          }
          return it;
        })
        .filter(Boolean) as CartItem[];
      return { ...prev, items: updated };
    });
  };

  const handleSaveSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSettings(tempSettings);
    try {
      localStorage.setItem("mybill_pos_settings", JSON.stringify(tempSettings));
    } catch {}
    setIsSettingsModalOpen(false);
  };

  const handleCheckout = async (andPrint = false) => {
    if (currentScreen.items.length === 0) return;
    setIsCheckingOut(true);
    setError(null);

    const clientOfflineUuid = `pos_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const offlineBillNumber = `POS-${Date.now().toString().slice(-4)}`;

    const effectiveCustomerName = currentScreen.selectedParty?.name || currentScreen.customerName || "Cash Sale";
    const effectiveCustomerPhone = currentScreen.selectedParty?.mobile || currentScreen.customerMobile || undefined;

    const payload = {
      clientOfflineUuid,
      offlineBillNumber,
      partyId: currentScreen.selectedParty?.id || undefined,
      customerName: effectiveCustomerName,
      customerPhone: effectiveCustomerPhone,
      paymentMode: currentScreen.paymentMode === "SPLIT" ? "CASH" : currentScreen.paymentMode,
      receivedAmount:
        typeof currentScreen.receivedAmount === "number"
          ? currentScreen.receivedAmount
          : grandTotal,
      tenderedSplit:
        currentScreen.paymentMode === "SPLIT"
          ? {
              cash: Number(currentScreen.splitCash) || 0,
              upiQr: Number(currentScreen.splitOnline) || 0,
            }
          : undefined,
      notes: currentScreen.notes || undefined,
      items: currentScreen.items.map((c) => ({
        itemId: c.item.id,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        taxRate: c.taxRate,
        discountPercent: c.discountPercent,
        description: c.description || undefined,
      })),
    };

    let generatedInvoiceNumber = offlineBillNumber;
    let isSuccess = false;

    if (!navigator.onLine) {
      const updatedQueue = [...offlineQueue, payload];
      setOfflineQueue(updatedQueue);
      try {
        localStorage.setItem("mybill_pos_offline_queue", JSON.stringify(updatedQueue));
      } catch {}
      isSuccess = true;
    } else {
      try {
        const res: any = await apiClient.post("/sales/pos-checkout", payload);
        generatedInvoiceNumber = res?.invoiceNumber || offlineBillNumber;
        isSuccess = true;
      } catch (err: any) {
        if (!navigator.onLine || err.message?.includes("Failed to fetch")) {
          const updatedQueue = [...offlineQueue, payload];
          setOfflineQueue(updatedQueue);
          try {
            localStorage.setItem("mybill_pos_offline_queue", JSON.stringify(updatedQueue));
          } catch {}
          isSuccess = true;
        } else {
          setError(err.message || "Failed to complete POS sale.");
        }
      }
    }

    if (isSuccess) {
      const receiptData = {
        invoiceNumber: generatedInvoiceNumber,
        grandTotal,
        subTotal,
        taxTotal,
        totalDiscount,
        totalCharges,
        roundOff,
        paymentMode: currentScreen.paymentMode,
        receivedAmount:
          typeof currentScreen.receivedAmount === "number"
            ? currentScreen.receivedAmount
            : grandTotal,
        changeDue:
          typeof currentScreen.receivedAmount === "number" && currentScreen.receivedAmount > grandTotal
            ? currentScreen.receivedAmount - grandTotal
            : 0,
        items: [...currentScreen.items],
        customerName: effectiveCustomerName,
        customerPhone: effectiveCustomerPhone,
        date: new Date().toLocaleString("en-IN"),
        notes: currentScreen.notes,
      };

      setLastReceipt(receiptData);

      if (screens.length > 1) {
        handleCloseScreen(currentScreen.id);
      } else {
        updateCurrentScreen((prev) => ({
          ...prev,
          items: [],
          selectedRowIndex: null,
          customerName: "Cash Sale",
          customerMobile: "",
          selectedParty: null,
          discountPercent: 0,
          discountAmount: 0,
          additionalCharges: [],
          receivedAmount: "",
          notes: "",
        }));
      }

      if (andPrint) {
        setTimeout(() => {
          handlePrintReceipt(receiptData);
        }, 150);
      }

      fetchData();
    }

    setIsCheckingOut(false);
  };

  const handlePrintReceipt = (receiptToPrint?: any) => {
    const data = receiptToPrint || lastReceipt;
    if (!data) return;

    let iframe = document.getElementById("pos-receipt-print-frame") as HTMLIFrameElement;
    if (iframe) iframe.remove();
    iframe = document.createElement("iframe");
    iframe.id = "pos-receipt-print-frame";
    iframe.style.position = "fixed";
    iframe.style.top = "-99999px";
    iframe.style.left = "-99999px";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const isThermal = settings.printerType !== "A4";
    const widthStyle = settings.printerType === "58mm" ? "52mm" : isThermal ? "72mm" : "100%";
    const fontStyle = settings.printerType === "58mm" ? "10px" : isThermal ? "11.5px" : "13px";

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Receipt_${data.invoiceNumber}</title>
          <style>
            @page { margin: 0; size: ${isThermal ? (settings.printerType === "58mm" ? "58mm auto" : "80mm auto") : "A4 portrait"}; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: ${isThermal ? "'Courier New', Courier, monospace" : "system-ui, -apple-system, sans-serif"};
              font-size: ${fontStyle};
              color: #000;
              background: #fff;
              width: ${widthStyle};
              margin: 0 auto;
              padding: ${isThermal ? "3mm 4mm" : "12mm 15mm"};
              line-height: 1.3;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .border-b-dashed { border-bottom: 1px dashed #000; padding-bottom: 4px; margin-bottom: 4px; }
            .border-t-dashed { border-top: 1px dashed #000; padding-top: 4px; margin-top: 4px; }
            .flex-between { display: flex; justify-content: space-between; align-items: center; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 3px 0; }
          </style>
        </head>
        <body>
          <div class="text-center border-b-dashed">
            <h2 class="font-bold" style="font-size: 1.25em;">${currentCompany?.tradeName || currentCompany?.legalName || "STORE"}</h2>
            <p>${(currentCompany as any)?.address || ""}</p>
            <p>${(currentCompany as any)?.phone ? `Tel: ${(currentCompany as any).phone}` : ""}</p>
            ${currentCompany?.gstin ? `<p>GSTIN: ${currentCompany.gstin}</p>` : ""}
          </div>

          <div class="border-b-dashed" style="font-size: 0.9em;">
            <div class="flex-between">
              <span>Invoice: <strong>${data.invoiceNumber}</strong></span>
              <span>Date: ${data.date}</span>
            </div>
            <div class="flex-between">
              <span>Customer: <strong>${data.customerName}</strong></span>
              <span>${data.customerPhone || ""}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr class="border-b-dashed">
                <th style="text-align: left;">Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Rate</th>
                <th style="text-align: right;">Amt</th>
              </tr>
            </thead>
            <tbody>
              ${data.items
                .map(
                  (c: any) => `
                <tr>
                  <td>${c.item?.name || "Item"}</td>
                  <td style="text-align: center;">${c.quantity}</td>
                  <td style="text-align: right;">₹${Number(c.unitPrice).toFixed(2)}</td>
                  <td style="text-align: right;">₹${(c.unitPrice * c.quantity).toFixed(2)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          <div class="border-t-dashed">
            <div class="flex-between">
              <span>Subtotal:</span>
              <span>₹${Number(data.subTotal).toFixed(2)}</span>
            </div>
            <div class="flex-between">
              <span>GST Tax:</span>
              <span>₹${Number(data.taxTotal).toFixed(2)}</span>
            </div>
            ${
              data.totalDiscount > 0
                ? `<div class="flex-between"><span>Discount:</span><span>-₹${Number(data.totalDiscount).toFixed(2)}</span></div>`
                : ""
            }
            ${
              data.totalCharges > 0
                ? `<div class="flex-between"><span>Charges:</span><span>+₹${Number(data.totalCharges).toFixed(2)}</span></div>`
                : ""
            }
            ${
              data.roundOff !== 0
                ? `<div class="flex-between"><span>Round Off:</span><span>₹${Number(data.roundOff).toFixed(2)}</span></div>`
                : ""
            }
            <div class="flex-between font-bold border-t-dashed" style="font-size: 1.15em; margin-top: 4px; padding-top: 4px;">
              <span>TOTAL AMOUNT:</span>
              <span>₹${Number(data.grandTotal).toFixed(2)}</span>
            </div>
          </div>

          <div class="border-t-dashed" style="font-size: 0.9em;">
            <div class="flex-between">
              <span>Payment Mode:</span>
              <span>${data.paymentMode}</span>
            </div>
            <div class="flex-between">
              <span>Received:</span>
              <span>₹${Number(data.receivedAmount).toFixed(2)}</span>
            </div>
            ${
              data.changeDue > 0
                ? `<div class="flex-between font-bold"><span>Change Due:</span><span>₹${Number(data.changeDue).toFixed(2)}</span></div>`
                : ""
            }
          </div>

          ${
            data.notes
              ? `<div class="border-t-dashed"><p><strong>Note:</strong> ${data.notes}</p></div>`
              : ""
          }

          <div class="text-center border-t-dashed" style="margin-top: 8px;">
            <p>Thank you for shopping with us!</p>
            <p style="font-size: 0.8em; color: #555;">Powered by myownbillbook</p>
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 250);
  };

  const handleSaveNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemForm.name.trim()) return;
    setIsSavingNewItem(true);
    setError(null);

    try {
      const priceVal = parseFloat(newItemForm.salesPrice) || 0;
      const taxVal = parseFloat(newItemForm.taxRate) || 0;
      const defaultUom = units.find((u) => u.symbol?.toUpperCase() === newItemForm.unit.toUpperCase()) || units[0];

      const res: any = await apiClient.post("/masters/items", {
        type: newItemForm.type,
        name: newItemForm.name.trim(),
        categoryId: newItemForm.categoryId || undefined,
        primaryUomId: defaultUom?.id || "uom_pcs",
        taxRate: taxVal,
        retailPrice: priceVal,
        openingStock: parseFloat(newItemForm.openingStock) || 0,
        hsnCode: "9999",
      });

      const createdItem: CatalogItem = {
        id: res?.id || `item_${Date.now()}`,
        name: newItemForm.name.trim(),
        retailPrice: priceVal,
        taxRate: taxVal,
        unit: newItemForm.unit,
        currentStock: parseFloat(newItemForm.openingStock) || 0,
        mrp: priceVal,
        sku: "PROD",
      };

      setItems((prev) => [createdItem, ...prev]);
      addItemToCart(createdItem);

      setIsNewItemModalOpen(false);
      setNewItemForm({
        type: "PRODUCT",
        categoryId: "",
        name: "",
        showInOnlineStore: false,
        salesPrice: "",
        taxInclusive: true,
        taxRate: "18",
        unit: "PCS",
        openingStock: "0",
      });
    } catch {
      const priceVal = parseFloat(newItemForm.salesPrice) || 0;
      const taxVal = parseFloat(newItemForm.taxRate) || 0;
      const localItem: CatalogItem = {
        id: `local_${Date.now()}`,
        name: newItemForm.name.trim(),
        retailPrice: priceVal,
        taxRate: taxVal,
        unit: newItemForm.unit,
        currentStock: parseFloat(newItemForm.openingStock) || 0,
        mrp: priceVal,
        sku: "PROD",
      };
      setItems((prev) => [localItem, ...prev]);
      addItemToCart(localItem);
      setIsNewItemModalOpen(false);
    } finally {
      setIsSavingNewItem(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F8FAFC] font-sans select-none overflow-hidden text-slate-800">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER (Exact gradient, buttons, typography of MyBillBook) */}
      {/* ========================================================================= */}
      <header
        className="h-12 border-b border-[#E2E8F0] px-4 flex items-center justify-between shrink-0 z-20"
        style={{
          background: "linear-gradient(180deg, #EBF1FA 0%, #F5F8FC 100%)",
        }}
      >
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push("/sales/invoices")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1F2937] bg-white hover:bg-slate-50 rounded-md border border-[#D1D5DB] shadow-xs transition-colors cursor-pointer"
            title="Exit POS Terminal (CTRL + Q)"
          >
            <span className="text-sm">←</span>
            <span>Exit POS</span>
            <span className="text-[11px] text-[#8C939F] font-mono">[CTRL + Q]</span>
          </button>
        </div>

        {/* Center Title */}
        <div className="flex items-center gap-2">
          <h1 className="text-base font-bold text-[#1F2937] tracking-tight">
            POS Billing
          </h1>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsHelpModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#2563EB] bg-white hover:bg-blue-50/50 rounded-md border border-[#BFDBFE] transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 fill-[#2563EB]" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span>Watch how to use POS Billing</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTempSettings({ ...settings });
              setIsSettingsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1F2937] bg-white hover:bg-slate-50 rounded-md border border-[#D1D5DB] shadow-xs transition-colors cursor-pointer"
            title="Counter POS Settings (CTRL + S)"
          >
            <span>Settings</span>
            <span className="text-[11px] text-[#8C939F] font-mono">[CTRL + S]</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. HOLD BILL / MULTI-SCREEN TAB BAR (Exact MyBillBook tab styling) */}
      {/* ========================================================================= */}
      <div className="h-10 bg-white border-b border-[#E5E7EB] px-3 flex items-center gap-2 shrink-0 overflow-x-auto scrollbar-none">
        {screens.map((screen, idx) => {
          const isActive = screen.id === activeScreenId;
          const shortcutKey = idx < 9 ? `CTRL + ${idx + 1}` : "";
          return (
            <div
              key={screen.id}
              onClick={() => setActiveScreenId(screen.id)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap border-b-2 ${
                isActive
                  ? "border-[#5C56DF] text-[#1F2937] bg-white font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>{screen.title}</span>
              {shortcutKey && (
                <span className="text-[11px] text-[#10B981] font-mono font-medium">
                  [{shortcutKey}]
                </span>
              )}
              <button
                type="button"
                onClick={(e) => handleCloseScreen(screen.id, e)}
                className="text-slate-400 hover:text-slate-700 text-xs ml-1 p-0.5"
                title="Close billing screen"
              >
                ✕
              </button>
            </div>
          );
        })}

        {/* Hold Bill & Create Another Tab Button */}
        <button
          type="button"
          onClick={handleAddNewScreen}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-[#5C56DF] hover:text-[#4B45CF] transition-colors cursor-pointer whitespace-nowrap ml-2"
          title="Hold current bill and create new screen (CTRL + B)"
        >
          <span>+ Hold Bill & Create Another</span>
          <span className="text-[11px] font-mono font-normal">[CTRL + B]</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN WORKSPACE (Left: Actions, Search, Table; Right: Summary) */}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Actions Bar, Search, Table, Footer */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden border-r border-[#E5E7EB]">
          {/* Action Bar (Top) */}
          <div className="px-4 py-2.5 border-b border-[#E5E7EB] flex items-center gap-3 bg-white shrink-0">
            <button
              type="button"
              onClick={() => setIsNewItemModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1F2937] bg-white hover:bg-slate-50 rounded-md border border-[#E5E7EB] transition-colors cursor-pointer"
            >
              <span>+ New Item</span>
              <span className="text-[11px] text-[#9CA3AF] font-mono">[CTRL + I]</span>
            </button>

            <button
              type="button"
              onClick={() => handleTriggerEdit("PRICE")}
              disabled={currentScreen.selectedRowIndex === null || currentScreen.items.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1F2937] bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md border border-[#E5E7EB] transition-colors cursor-pointer"
            >
              <span>Change Price</span>
              <span className="text-[11px] text-[#9CA3AF] font-mono">[P]</span>
            </button>

            <button
              type="button"
              onClick={() => handleTriggerEdit("QTY")}
              disabled={currentScreen.selectedRowIndex === null || currentScreen.items.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1F2937] bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md border border-[#E5E7EB] transition-colors cursor-pointer"
            >
              <span>Change QTY</span>
              <span className="text-[11px] text-[#9CA3AF] font-mono">[Q]</span>
            </button>

            <button
              type="button"
              onClick={() => handleTriggerEdit("DISCOUNT")}
              disabled={currentScreen.selectedRowIndex === null || currentScreen.items.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1F2937] bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md border border-[#E5E7EB] transition-colors cursor-pointer"
            >
              <span>Change Discount</span>
              <span className="text-[11px] text-[#9CA3AF] font-mono">[D]</span>
            </button>

            <button
              type="button"
              onClick={handleDeleteSelectedItem}
              disabled={currentScreen.selectedRowIndex === null || currentScreen.items.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#DC2626] bg-white hover:bg-rose-50/50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md border border-[#E5E7EB] transition-colors cursor-pointer ml-auto"
            >
              <span>Delete Item</span>
              <span className="text-[11px] text-[#9CA3AF] font-mono">[DEL]</span>
            </button>
          </div>

          {/* Search Row: Category Button + Purple Bordered Input */}
          <div className="px-4 py-2 border-b border-[#E5E7EB] flex items-center gap-2.5 bg-white relative z-30 shrink-0">
            {/* Category Button */}
            <div className="relative" ref={categoryDropdownRef}>
              <button
                type="button"
                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#374151] bg-white hover:bg-slate-50 rounded-md border border-[#D1D5DB] transition-colors cursor-pointer whitespace-nowrap h-[38px]"
              >
                <span>
                  {selectedCategory === "ALL"
                    ? "Category"
                    : categories.find((c) => c.id === selectedCategory)?.name || "Category"}
                </span>
                <span className="text-[10px] text-slate-500">⌄</span>
              </button>

              {isCategoryDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-[#E5E7EB] rounded-md shadow-xl z-50 py-1 text-xs max-h-60 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("ALL");
                      setIsCategoryDropdownOpen(false);
                      searchInputRef.current?.focus();
                      setIsSearchDropdownOpen(true);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors ${
                      selectedCategory === "ALL" ? "font-bold text-[#5C56DF] bg-purple-50/40" : "text-slate-700"
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(c.id);
                        setIsCategoryDropdownOpen(false);
                        searchInputRef.current?.focus();
                        setIsSearchDropdownOpen(true);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors ${
                        selectedCategory === c.id ? "font-bold text-[#5C56DF] bg-purple-50/40" : "text-slate-700"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search Input Box with Purple Border */}
            <div className="relative flex-1">
              <div className="flex items-center h-[38px] px-3 bg-white border-2 border-[#8B5CF6] rounded-md shadow-2xs">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsSearchDropdownOpen(true);
                    setSearchHighlightIndex(0);
                  }}
                  onFocus={() => setIsSearchDropdownOpen(true)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search by Item/ Serial no./ HSN code/ SKU/ Custom Field / Category or Scan Barcode"
                  className="w-full text-xs font-medium text-[#1F2937] placeholder:text-[#9CA3AF] bg-transparent outline-none"
                  autoFocus
                />
                <span className="text-[11px] font-mono text-[#9CA3AF] pl-2 shrink-0">
                  F1
                </span>
              </div>

              {/* Autocomplete Dropdown Popup (underneath the purple search box) */}
              {isSearchDropdownOpen && (
                <div
                  ref={searchDropdownRef}
                  className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E5E7EB] rounded-md shadow-2xl z-50 overflow-hidden flex flex-col"
                  style={{ maxHeight: "360px" }}
                >
                  {/* Dropdown Header */}
                  <div className="px-4 py-2 bg-[#F8FAFC] border-b border-[#E5E7EB] flex justify-between items-center text-[11px] font-medium text-[#6B7280]">
                    <span>Item Name</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px]">Esc</span>
                      <button
                        type="button"
                        onClick={() => setIsSearchDropdownOpen(false)}
                        className="text-slate-400 hover:text-slate-700 text-xs font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Dropdown Items List */}
                  <div className="overflow-y-auto divide-y divide-[#F1F5F9] max-h-64">
                    {filteredCatalogItems.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No items found matching &quot;{searchTerm}&quot;
                      </div>
                    ) : (
                      filteredCatalogItems.map((item, idx) => {
                        const isHighlighted = idx === searchHighlightIndex;
                        return (
                          <div
                            key={item.id}
                            onClick={() => addItemToCart(item)}
                            onMouseEnter={() => setSearchHighlightIndex(idx)}
                            className={`px-4 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                              isHighlighted ? "bg-[#F8FAFC]" : "hover:bg-[#F8FAFC]"
                            }`}
                          >
                            <div>
                              <p className="text-xs font-bold text-[#1F2937] leading-tight">
                                {item.name}
                              </p>
                              <div className="flex items-center gap-2 text-[10.5px] text-[#6B7280] mt-0.5">
                                <span>
                                  STOCK : {item.currentStock ?? 0} {item.unit || "PCS"}
                                </span>
                                <span>•</span>
                                <span>
                                  PP : ₹ {Number(item.purchaseRate || item.retailPrice || 0).toFixed(2)}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[13px] font-bold text-[#1F2937]">
                                ₹ {Number(item.retailPrice).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </p>
                              <p className="text-[10.5px] text-[#6B7280]">/ {item.unit || "PCS"}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Dropdown Footer: + Create Item (Dashed cyan border matching MyBillBook) */}
                  <div className="p-3 bg-white border-t border-[#E5E7EB]">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSearchDropdownOpen(false);
                        setIsNewItemModalOpen(true);
                      }}
                      className="w-full py-2 border border-dashed border-[#60A5FA] bg-[#F8FAFC] hover:bg-blue-50/50 text-[#2563EB] text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>+ Create Item</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Items Billing Table Header (With thin vertical column borders) */}
          <div className="flex bg-white border-b border-[#E5E7EB] text-[11px] font-bold text-[#374151] shrink-0 uppercase tracking-wider">
            <div className="w-12 py-2.5 text-center border-r border-[#E5E7EB]">NO</div>
            <div className="flex-1 py-2.5 px-3 border-r border-[#E5E7EB]">ITEMS</div>
            <div className="w-28 py-2.5 px-3 border-r border-[#E5E7EB]">ITEM CODE</div>
            {!settings.hideMrp && (
              <div className="w-24 py-2.5 px-3 text-right border-r border-[#E5E7EB]">MRP</div>
            )}
            <div className="w-24 py-2.5 px-3 text-right border-r border-[#E5E7EB]">SP (₹)</div>
            <div className="w-24 py-2.5 px-3 text-center border-r border-[#E5E7EB]">DISC (%)</div>
            <div className="w-28 py-2.5 px-3 text-center border-r border-[#E5E7EB]">QUANTITY</div>
            <div className="w-28 py-2.5 px-3 text-right border-r border-[#E5E7EB]">AMOUNT (₹)</div>
            <div className="w-10 py-2.5 text-center"></div>
          </div>

          {/* Items Billing Table Body */}
          <div className="flex-1 overflow-y-auto bg-white">
            {currentScreen.items.length === 0 ? (
              /* Exact 3D Isometric Cube Empty State Illustration */
              <div className="h-full flex flex-col items-center justify-center text-[#6B7280] p-8">
                <div className="w-16 h-16 mb-4 flex items-center justify-center">
                  <svg width="56" height="56" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Top Cube */}
                    <path d="M30 4L42 11L30 18L18 11L30 4Z" stroke="#4F46E5" strokeWidth="1.5" strokeLinejoin="round"/>
                    <path d="M18 11V25L30 32V18L18 11Z" stroke="#4F46E5" strokeWidth="1.5" strokeLinejoin="round"/>
                    <path d="M30 18V32L42 25V11L30 18Z" stroke="#4F46E5" strokeWidth="1.5" strokeLinejoin="round"/>
                    {/* Plus sign on top cube */}
                    <path d="M28 11H32M30 9V13" stroke="#4F46E5" strokeWidth="1.5" strokeLinecap="round"/>
                    {/* Bottom-Left Cube */}
                    <path d="M18 25L30 32L18 39L6 32L18 25Z" stroke="#4F46E5" strokeWidth="1.5" strokeLinejoin="round"/>
                    <path d="M6 32V46L18 53V39L6 32Z" stroke="#4F46E5" strokeWidth="1.5" strokeLinejoin="round"/>
                    <path d="M18 39V53L30 46V32L18 39Z" stroke="#4F46E5" strokeWidth="1.5" strokeLinejoin="round"/>
                    {/* Bottom-Right Cube */}
                    <path d="M42 25L54 32L42 39L30 32L42 25Z" stroke="#4F46E5" strokeWidth="1.5" strokeLinejoin="round"/>
                    <path d="M30 32V46L42 53V39L30 32Z" stroke="#4F46E5" strokeWidth="1.5" strokeLinejoin="round"/>
                    <path d="M42 39V53L54 46V32L42 39Z" stroke="#4F46E5" strokeWidth="1.5" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="flex items-center gap-1.5 text-[13px] text-[#4B5563] font-medium">
                  <span className="text-sm">🔍</span>
                  <span>Add items by searching item name or item code</span>
                </div>
                <p className="text-xs text-[#9CA3AF] my-1 font-medium">Or</p>
                <div className="flex items-center gap-1.5 text-[13px] text-[#4B5563] font-medium">
                  <span className="text-sm">⛶</span>
                  <span>Simply scan barcode to add items</span>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[#E5E7EB]">
                {currentScreen.items.map((cartLine, idx) => {
                  const isSelected = currentScreen.selectedRowIndex === idx;
                  const lineTotal =
                    cartLine.unitPrice *
                    cartLine.quantity *
                    (1 - (cartLine.discountPercent || 0) / 100);

                  return (
                    <div
                      key={cartLine.id}
                      onClick={() =>
                        updateCurrentScreen((prev) => ({
                          ...prev,
                          selectedRowIndex: idx,
                        }))
                      }
                      className={`flex items-center text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-[#EEF2FF] font-semibold"
                          : "hover:bg-slate-50/70"
                      }`}
                    >
                      <div className="w-12 py-2.5 text-center text-slate-500 font-mono border-r border-[#E5E7EB]">
                        {idx + 1}
                      </div>
                      <div className="flex-1 py-2.5 px-3 border-r border-[#E5E7EB] min-w-0">
                        <p className="font-bold text-[#1F2937] truncate">
                          {cartLine.item.name}
                        </p>
                        {settings.itemDescription && (
                          <input
                            type="text"
                            placeholder="Add description..."
                            value={cartLine.description || ""}
                            onChange={(e) => {
                              const desc = e.target.value;
                              updateCurrentScreen((prev) => {
                                const copy = [...prev.items];
                                copy[idx] = { ...copy[idx], description: desc };
                                return { ...prev, items: copy };
                              });
                            }}
                            className="text-[10px] text-slate-500 border border-transparent hover:border-slate-300 rounded px-1 w-full outline-none"
                          />
                        )}
                      </div>
                      <div className="w-28 py-2.5 px-3 text-slate-500 font-mono text-[11px] truncate border-r border-[#E5E7EB]">
                        {cartLine.item.barcode || cartLine.item.sku || "-"}
                      </div>
                      {!settings.hideMrp && (
                        <div className="w-24 py-2.5 px-3 text-right font-mono text-slate-500 border-r border-[#E5E7EB]">
                          ₹{Number(cartLine.mrp || 0).toFixed(2)}
                        </div>
                      )}
                      <div className="w-24 py-2.5 px-3 text-right font-mono font-bold text-[#1F2937] border-r border-[#E5E7EB]">
                        ₹{Number(cartLine.unitPrice).toFixed(2)}
                      </div>
                      <div className="w-24 py-2.5 px-3 text-center font-mono text-slate-600 border-r border-[#E5E7EB]">
                        {cartLine.discountPercent || 0}%
                      </div>
                      <div className="w-28 py-2.5 px-3 flex items-center justify-center gap-1 border-r border-[#E5E7EB]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateItemQty(cartLine.id, -1);
                          }}
                          className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs"
                        >
                          -
                        </button>
                        <span className="font-mono font-bold px-1 text-center">
                          {cartLine.quantity} {cartLine.item.unit || "PCS"}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateItemQty(cartLine.id, 1);
                          }}
                          className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs"
                        >
                          +
                        </button>
                      </div>
                      <div className="w-28 py-2.5 px-3 text-right font-mono font-bold text-[#1F2937] border-r border-[#E5E7EB]">
                        ₹{lineTotal.toFixed(2)}
                      </div>
                      <div className="w-10 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateCurrentScreen((prev) => ({
                              ...prev,
                              items: prev.items.filter((it) => it.id !== cartLine.id),
                              selectedRowIndex:
                                prev.selectedRowIndex === idx ? null : prev.selectedRowIndex,
                            }));
                          }}
                          className="text-slate-300 hover:text-rose-600 p-0.5"
                          title="Remove item"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Items Billing Table Footer Bar */}
          <div className="h-10 bg-white border-t border-[#E5E7EB] px-4 flex items-center justify-between shrink-0 text-xs">
            <div className="flex items-center gap-4">
              <span className="text-[#374151] font-semibold">
                Total Items: <strong className="text-[#111827]">{currentScreen.items.length}</strong>
              </span>
              {currentScreen.items.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    updateCurrentScreen((prev) => ({ ...prev, items: [], selectedRowIndex: null }))
                  }
                  className="text-xs font-semibold text-[#DC2626] hover:underline cursor-pointer"
                  title="Clear all items (CTRL + C)"
                >
                  Clear All Items <span className="font-mono text-[11px]">[CTRL + C]</span>
                </button>
              )}
            </div>

            <div className="text-[11px] text-[#6B7280] font-medium flex items-center gap-1">
              <span>Use UP and DOWN</span>
              <span className="font-bold text-[#374151]">⇅</span>
              <span>arrow keys to scroll through different items</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Summary & Checkout (Matching MyBillBook exact style) */}
        {/* ========================================================================= */}
        <div className="w-[410px] bg-white flex flex-col justify-between shrink-0 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Top Shortcut Action Buttons: Add Discount [F2], Add Additional Charge [F3] */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setTempDiscount({
                    type: currentScreen.discountType,
                    percent: currentScreen.discountPercent,
                    amount: currentScreen.discountAmount,
                  });
                  setIsDiscountModalOpen(true);
                }}
                className="py-2 px-3 rounded-md border border-[#E5E7EB] hover:bg-slate-50 text-[#6B7280] font-medium text-xs flex items-center justify-between transition-colors cursor-pointer bg-white"
              >
                <span>Add Discount</span>
                <span className="text-[11px] text-[#9CA3AF] font-mono">[F2]</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTempCharges(
                    currentScreen.additionalCharges.length > 0
                      ? [...currentScreen.additionalCharges]
                      : [{ id: `ch_${Date.now()}`, name: "", amount: 0 }]
                  );
                  setIsChargesModalOpen(true);
                }}
                className="py-2 px-3 rounded-md border border-[#E5E7EB] hover:bg-slate-50 text-[#6B7280] font-medium text-xs flex items-center justify-between transition-colors cursor-pointer bg-white"
              >
                <span>Add Additional Charge</span>
                <span className="text-[11px] text-[#9CA3AF] font-mono">[F3]</span>
              </button>
            </div>

            {/* Bill Details Section */}
            <div className="space-y-2 text-xs pt-1">
              <p className="text-[13px] font-medium text-[#6B7280]">
                Bill details
              </p>

              <div className="flex justify-between items-center text-[#9CA3AF]">
                <span>Sub Total</span>
                <span className="font-mono">
                  ₹ {subTotal > 0 ? subTotal.toFixed(2) : "0"}
                </span>
              </div>

              <div className="flex justify-between items-center text-[#9CA3AF]">
                <span>Tax</span>
                <span className="font-mono">
                  ₹ {taxTotal > 0 ? taxTotal.toFixed(2) : "0"}
                </span>
              </div>

              {totalDiscount > 0 && (
                <div className="flex justify-between items-center text-[#10B981]">
                  <span>Discount</span>
                  <span className="font-mono font-semibold">
                    - ₹ {totalDiscount.toFixed(2)}
                  </span>
                </div>
              )}

              {totalCharges > 0 && (
                <div className="flex justify-between items-center text-[#374151]">
                  <span>Additional Charges</span>
                  <span className="font-mono font-semibold">
                    + ₹ {totalCharges.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Total Amount Green Card (Exact MyBillBook style) */}
              <div
                className="rounded-lg p-3.5 flex items-center justify-between mt-3"
                style={{
                  background: grandTotal > 0 ? "#EAF7EC" : "#F2F8F4",
                }}
              >
                <span
                  className="text-sm font-semibold"
                  style={{
                    color: grandTotal > 0 ? "#1B5E20" : "#8C9990",
                  }}
                >
                  Total Amount
                </span>
                <span
                  className="text-lg font-bold font-mono"
                  style={{
                    color: grandTotal > 0 ? "#1B5E20" : "#8C9990",
                  }}
                >
                  ₹ {grandTotal > 0 ? grandTotal.toFixed(0) : "0"}
                </span>
              </div>
            </div>

            {/* Received Amount Section [F4] */}
            <div className="space-y-1.5 pt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[12px] font-medium text-[#6B7280]">
                  Received Amount
                </span>
                <span className="text-[11px] text-[#9CA3AF] font-mono">[F4]</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2 text-xs text-[#9CA3AF]">
                    ₹
                  </span>
                  <input
                    id="pos-received-amount-input"
                    type="number"
                    value={currentScreen.receivedAmount}
                    onChange={(e) =>
                      updateCurrentScreen((prev) => ({
                        ...prev,
                        receivedAmount: e.target.value === "" ? "" : Number(e.target.value),
                      }))
                    }
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 text-xs font-mono bg-white border border-[#E5E7EB] rounded-md outline-none focus:border-[#8B5CF6] text-[#1F2937]"
                  />
                </div>

                <div className="relative w-32">
                  <select
                    value={currentScreen.paymentMode}
                    onChange={(e) =>
                      updateCurrentScreen((prev) => ({
                        ...prev,
                        paymentMode: e.target.value as any,
                      }))
                    }
                    className="w-full px-3 py-2 text-xs font-medium text-[#374151] bg-white border border-[#E5E7EB] rounded-md outline-none cursor-pointer appearance-none"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">Online / UPI</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CARD">Card</option>
                    <option value="SPLIT">Split</option>
                  </select>
                  <span className="absolute right-3 top-2.5 text-[10px] text-slate-400 pointer-events-none">
                    ⌄
                  </span>
                </div>
              </div>

              {/* UPI Instant QR Code Preview */}
              {currentScreen.paymentMode === "UPI" && upiQrDataUrl && (
                <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-lg text-center space-y-1 mt-2">
                  <p className="text-[11px] font-bold text-indigo-900">
                    Scan with UPI to Pay ₹{grandTotal}
                  </p>
                  <img
                    src={upiQrDataUrl}
                    alt="UPI QR Code"
                    className="w-28 h-28 mx-auto bg-white p-1 rounded border border-indigo-100"
                  />
                </div>
              )}
            </div>

            {/* Customer Details Section [F5] */}
            {!settings.hideCustomerInfo && (
              <div className="space-y-1.5 pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[12px] font-medium text-[#6B7280]">
                    Customer Details
                  </span>
                  <span className="text-[11px] text-[#9CA3AF] font-mono">[F5]</span>
                </div>

                <div
                  onClick={() => {
                    setTempCustomer({
                      name: currentScreen.customerName,
                      mobile: currentScreen.customerMobile,
                      partyId: currentScreen.selectedParty?.id,
                    });
                    setIsCustomerModalOpen(true);
                  }}
                  className="p-2.5 bg-white hover:bg-slate-50 border border-[#E5E7EB] rounded-md flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <p className="text-xs font-medium text-[#6B7280]">
                      {currentScreen.customerName || "Cash Sale"}
                    </p>
                    {currentScreen.customerMobile && (
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {currentScreen.customerMobile}
                      </p>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-[#9CA3AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
              </div>
            )}

            {error && (
              <div className="p-2 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 font-medium">
                {error}
              </div>
            )}
          </div>

          {/* Bottom Action Buttons: Save & Print [F6], Save Bill [F7] (Exact MyBillBook style) */}
          <div className="p-4 border-t border-[#E5E7EB] bg-white grid grid-cols-2 gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleCheckout(true)}
              disabled={currentScreen.items.length === 0 || isCheckingOut}
              className="h-10 rounded-md border border-[#C7D2FE] bg-white hover:bg-indigo-50/40 text-[#8B8EE0] hover:text-[#5C56DF] disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Save & Print [F6]</span>
            </button>

            <button
              type="button"
              onClick={() => handleCheckout(false)}
              disabled={currentScreen.items.length === 0 || isCheckingOut}
              className="h-10 rounded-md text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              style={{
                background: currentScreen.items.length > 0 ? "#5C56DF" : "#C4C7F5",
              }}
            >
              {isCheckingOut ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : null}
              <span>Save Bill [F7]</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODALS & POPUPS */}
      {/* ========================================================================= */}

      {/* MODAL 1: Counter POS Settings [CTRL + S] */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1F2937]">Counter POS Settings</h2>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto divide-y divide-slate-100 text-xs">
              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="font-semibold text-slate-800">Hide Customer Information field</p>
                  <p className="text-[11px] text-slate-400">Bills will be saved to Cash Sale Party by default</p>
                </div>
                <input
                  type="checkbox"
                  checked={tempSettings.hideCustomerInfo}
                  onChange={(e) =>
                    setTempSettings({ ...tempSettings, hideCustomerInfo: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#5C56DF] rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="font-semibold text-slate-800">Fully Paid Bills</p>
                  <p className="text-[11px] text-slate-400">All Bills will be marked as fully paid</p>
                </div>
                <input
                  type="checkbox"
                  checked={tempSettings.fullyPaidBills}
                  onChange={(e) =>
                    setTempSettings({ ...tempSettings, fullyPaidBills: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#5C56DF] rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="font-semibold text-slate-800">Round Off</p>
                  <p className="text-[11px] text-slate-400">Automatically add roundoff value to bill</p>
                </div>
                <input
                  type="checkbox"
                  checked={tempSettings.roundOff}
                  onChange={(e) =>
                    setTempSettings({ ...tempSettings, roundOff: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#5C56DF] rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="font-semibold text-slate-800">Hide MRP</p>
                  <p className="text-[11px] text-slate-400">Hide MRP from POS</p>
                </div>
                <input
                  type="checkbox"
                  checked={tempSettings.hideMrp}
                  onChange={(e) =>
                    setTempSettings({ ...tempSettings, hideMrp: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#5C56DF] rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="font-semibold text-slate-800">Notes</p>
                  <p className="text-[11px] text-slate-400">Add notes to your bills (Supported in A4 print only)</p>
                </div>
                <input
                  type="checkbox"
                  checked={tempSettings.notes}
                  onChange={(e) =>
                    setTempSettings({ ...tempSettings, notes: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#5C56DF] rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="font-semibold text-slate-800">Item Description</p>
                  <p className="text-[11px] text-slate-400">Add description to items in the bill (Supported in A4 print only)</p>
                </div>
                <input
                  type="checkbox"
                  checked={tempSettings.itemDescription}
                  onChange={(e) =>
                    setTempSettings({ ...tempSettings, itemDescription: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#5C56DF] rounded cursor-pointer"
                />
              </div>

              <div className="pt-3">
                <label className="font-semibold text-slate-800 block mb-1">Printer Type</label>
                <select
                  value={tempSettings.printerType}
                  onChange={(e) =>
                    setTempSettings({
                      ...tempSettings,
                      printerType: e.target.value as any,
                    })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-md text-xs outline-none cursor-pointer"
                >
                  <option value="A4">A4 Printer</option>
                  <option value="80mm">Thermal 3-inch (80mm)</option>
                  <option value="58mm">Thermal 2-inch (58mm)</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleSaveSettings}
                className="w-full py-2.5 bg-[#5C56DF] hover:bg-[#4D47CB] text-white font-bold text-xs rounded-md shadow-sm transition-colors cursor-pointer"
              >
                Save [F7]
              </button>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="w-full py-2 text-slate-600 hover:text-slate-900 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel [ESC]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Discount [F2] */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1F2937]">Add Discount</h2>
              <button
                type="button"
                onClick={() => setIsDiscountModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="discountTiming"
                    checked={tempDiscount.type === "BEFORE_TAX"}
                    onChange={() =>
                      setTempDiscount({ ...tempDiscount, type: "BEFORE_TAX" })
                    }
                    className="accent-[#5C56DF]"
                  />
                  <span>Discount before tax</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="discountTiming"
                    checked={tempDiscount.type === "AFTER_TAX"}
                    onChange={() =>
                      setTempDiscount({ ...tempDiscount, type: "AFTER_TAX" })
                    }
                    className="accent-[#5C56DF]"
                  />
                  <span>Discount after tax</span>
                </label>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Percentage</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">%</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={tempDiscount.percent || ""}
                    onChange={(e) => {
                      const p = parseFloat(e.target.value) || 0;
                      const base = tempDiscount.type === "BEFORE_TAX" ? subTotal : subTotal + taxTotal;
                      const amt = (base * p) / 100;
                      setTempDiscount({ ...tempDiscount, percent: p, amount: Number(amt.toFixed(2)) });
                    }}
                    placeholder="0"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-xs outline-none focus:bg-white focus:border-[#5C56DF] font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={tempDiscount.amount || ""}
                    onChange={(e) => {
                      const a = parseFloat(e.target.value) || 0;
                      const base = tempDiscount.type === "BEFORE_TAX" ? subTotal : subTotal + taxTotal;
                      const pct = base > 0 ? (a / base) * 100 : 0;
                      setTempDiscount({ ...tempDiscount, amount: a, percent: Number(pct.toFixed(2)) });
                    }}
                    placeholder="0"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-xs outline-none focus:bg-white focus:border-[#5C56DF] font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  updateCurrentScreen((prev) => ({
                    ...prev,
                    discountType: tempDiscount.type,
                    discountPercent: tempDiscount.percent,
                    discountAmount: tempDiscount.amount,
                  }));
                  setIsDiscountModalOpen(false);
                }}
                className="w-full py-2.5 bg-[#5C56DF] hover:bg-[#4D47CB] text-white font-bold text-xs rounded-md shadow-sm transition-colors cursor-pointer"
              >
                Save [F7]
              </button>
              <button
                type="button"
                onClick={() => setIsDiscountModalOpen(false)}
                className="w-full py-2 text-slate-600 hover:text-slate-900 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel [ESC]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Additional Charge [F3] */}
      {isChargesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1F2937]">Add Additional Charge</h2>
              <button
                type="button"
                onClick={() => setIsChargesModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-72 overflow-y-auto text-xs">
              {tempCharges.map((ch, idx) => (
                <div key={ch.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={ch.name}
                    onChange={(e) => {
                      const copy = [...tempCharges];
                      copy[idx] = { ...copy[idx], name: e.target.value };
                      setTempCharges(copy);
                    }}
                    placeholder="Enter Charge (Ex Carry Bag)"
                    className="flex-1 p-2 bg-slate-50 border border-slate-300 rounded-md text-xs outline-none focus:bg-white focus:border-[#5C56DF]"
                  />
                  <div className="relative w-28">
                    <span className="absolute left-2.5 top-2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={ch.amount || ""}
                      onChange={(e) => {
                        const copy = [...tempCharges];
                        copy[idx] = { ...copy[idx], amount: parseFloat(e.target.value) || 0 };
                        setTempCharges(copy);
                      }}
                      placeholder="0"
                      className="w-full pl-6 pr-2 py-2 bg-slate-50 border border-slate-300 rounded-md text-xs outline-none focus:bg-white focus:border-[#5C56DF] font-mono font-bold"
                    />
                  </div>
                  {tempCharges.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setTempCharges(tempCharges.filter((_, i) => i !== idx))
                      }
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setTempCharges([
                    ...tempCharges,
                    { id: `ch_${Date.now()}`, name: "", amount: 0 },
                  ])
                }
                className="text-[#5C56DF] hover:text-[#4D47CB] font-bold text-xs inline-flex items-center gap-1 mt-1 cursor-pointer"
              >
                + Add Additional Charge
              </button>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  updateCurrentScreen((prev) => ({
                    ...prev,
                    additionalCharges: tempCharges.filter((ch) => ch.name.trim() && ch.amount > 0),
                  }));
                  setIsChargesModalOpen(false);
                }}
                className="w-full py-2.5 bg-[#5C56DF] hover:bg-[#4D47CB] text-white font-bold text-xs rounded-md shadow-sm transition-colors cursor-pointer"
              >
                Save [F7]
              </button>
              <button
                type="button"
                onClick={() => setIsChargesModalOpen(false)}
                className="w-full py-2 text-slate-600 hover:text-slate-900 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel [ESC]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Customer Details [F5] */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1F2937]">Customer Details</h2>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Mobile</label>
                <div className="relative">
                  <input
                    type="tel"
                    value={tempCustomer.mobile}
                    onChange={(e) => {
                      const mob = e.target.value;
                      const matched = parties.find((p) => p.mobile === mob);
                      setTempCustomer({
                        mobile: mob,
                        name: matched ? matched.name : tempCustomer.name,
                        partyId: matched ? matched.id : undefined,
                      });
                    }}
                    placeholder="Enter customer mobile"
                    className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-md text-xs outline-none focus:bg-white focus:border-[#5C56DF] font-mono"
                    autoFocus
                  />
                  {tempCustomer.mobile && (
                    <button
                      type="button"
                      onClick={() => setTempCustomer({ ...tempCustomer, mobile: "" })}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Customer Name</label>
                <input
                  type="text"
                  value={tempCustomer.name}
                  onChange={(e) => setTempCustomer({ ...tempCustomer, name: e.target.value })}
                  placeholder="Cash Sale"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md text-xs outline-none focus:bg-white focus:border-[#5C56DF]"
                />
              </div>

              <div className="p-2.5 bg-slate-100 rounded-md text-[11px] text-slate-600">
                Cash Sale will be default if you don&apos;t enter customer details
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  const finalName = tempCustomer.name.trim() || "Cash Sale";
                  const partyMatch = parties.find((p) => p.id === tempCustomer.partyId);
                  updateCurrentScreen((prev) => ({
                    ...prev,
                    customerName: finalName,
                    customerMobile: tempCustomer.mobile.trim(),
                    selectedParty: partyMatch || null,
                  }));
                  setIsCustomerModalOpen(false);
                }}
                className="w-full py-2.5 bg-[#5C56DF] hover:bg-[#4D47CB] text-white font-bold text-xs rounded-md shadow-sm transition-colors cursor-pointer"
              >
                Save [F7]
              </button>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="w-full py-2 text-slate-600 hover:text-slate-900 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel [ESC]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Create New Item [CTRL + I] */}
      {isNewItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1F2937]">Create New Item</h2>
              <button
                type="button"
                onClick={() => setIsNewItemModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-1 min-h-[350px]">
              <div className="w-44 border-r border-slate-200 p-3 bg-slate-50/50 space-y-1 text-xs">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 rounded-md font-bold text-[#5C56DF] bg-purple-50 border border-purple-200 flex items-center gap-2"
                >
                  <span>📋</span>
                  <span>Basic Details *</span>
                </button>
                <div className="pt-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Advance Details
                </div>
                <button
                  type="button"
                  className="w-full text-left px-3 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 flex items-center gap-2"
                >
                  <span>📦</span>
                  <span>Stock Details</span>
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 flex items-center gap-2"
                >
                  <span>🏷️</span>
                  <span>Pricing Details</span>
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 flex items-center gap-2"
                >
                  <span>👥</span>
                  <span>Party Wise Prices</span>
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 flex items-center gap-2"
                >
                  <span>📑</span>
                  <span>Custom Fields</span>
                </button>
              </div>

              <form onSubmit={handleSaveNewItem} className="flex-1 p-5 space-y-3.5 text-xs overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Item Type *</label>
                    <div className="flex items-center gap-4 pt-1">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="itemType"
                          value="PRODUCT"
                          checked={newItemForm.type === "PRODUCT"}
                          onChange={() => setNewItemForm({ ...newItemForm, type: "PRODUCT" })}
                          className="accent-[#5C56DF]"
                        />
                        <span>Product</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="itemType"
                          value="SERVICE"
                          checked={newItemForm.type === "SERVICE"}
                          onChange={() => setNewItemForm({ ...newItemForm, type: "SERVICE" })}
                          className="accent-[#5C56DF]"
                        />
                        <span>Service</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Category</label>
                    <select
                      value={newItemForm.categoryId}
                      onChange={(e) => setNewItemForm({ ...newItemForm, categoryId: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md text-xs outline-none"
                    >
                      <option value="">Search Categories</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 items-center">
                  <div className="col-span-2">
                    <label className="block text-slate-600 font-medium mb-1">Item Name *</label>
                    <input
                      type="text"
                      value={newItemForm.name}
                      onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })}
                      placeholder="ex: Maggie 20gm"
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md text-xs outline-none focus:bg-white focus:border-[#5C56DF] font-medium"
                      autoFocus
                      required
                    />
                  </div>

                  <div className="pt-5 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-600">
                      Show Item in Online Store
                    </span>
                    <input
                      type="checkbox"
                      checked={newItemForm.showInOnlineStore}
                      onChange={(e) =>
                        setNewItemForm({ ...newItemForm, showInOnlineStore: e.target.checked })
                      }
                      className="w-4 h-4 accent-[#5C56DF] rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Sales Price</label>
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-2 text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          value={newItemForm.salesPrice}
                          onChange={(e) =>
                            setNewItemForm({ ...newItemForm, salesPrice: e.target.value })
                          }
                          placeholder="ex: 200"
                          className="w-full pl-6 pr-2 py-2 bg-slate-50 border border-slate-300 rounded-md text-xs outline-none focus:bg-white focus:border-[#5C56DF] font-mono font-bold"
                          required
                        />
                      </div>
                      <select
                        value={newItemForm.taxInclusive ? "WITH_TAX" : "WITHOUT_TAX"}
                        onChange={(e) =>
                          setNewItemForm({
                            ...newItemForm,
                            taxInclusive: e.target.value === "WITH_TAX",
                          })
                        }
                        className="p-2 bg-slate-50 border border-slate-300 rounded-md text-[11px] outline-none"
                      >
                        <option value="WITH_TAX">With Tax</option>
                        <option value="WITHOUT_TAX">Without Tax</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">GST Tax Rate(%)</label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        max="100"
                        list="gst-rates-pos"
                        value={newItemForm.taxRate}
                        onChange={(e) => setNewItemForm({ ...newItemForm, taxRate: e.target.value })}
                        placeholder="0"
                        className="w-full p-2 pr-6 bg-slate-50 border border-slate-300 rounded-md text-xs font-mono font-semibold text-right outline-none focus:bg-white"
                      />
                      <span className="absolute right-2 text-xs font-bold text-slate-400 pointer-events-none">%</span>
                    </div>
                    <datalist id="gst-rates-pos">
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Measuring Unit</label>
                    <select
                      value={newItemForm.unit}
                      onChange={(e) => setNewItemForm({ ...newItemForm, unit: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md text-xs outline-none"
                    >
                      <option value="PCS">Pieces(PCS)</option>
                      <option value="BOX">BOX</option>
                      <option value="KG">Kilogram(KG)</option>
                      <option value="LTR">Litre(LTR)</option>
                      <option value="MTR">Meter(MTR)</option>
                      <option value="PACKET">Packet(PKT)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Opening Stock</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={newItemForm.openingStock}
                        onChange={(e) =>
                          setNewItemForm({ ...newItemForm, openingStock: e.target.value })
                        }
                        placeholder="ex: 150 PCS"
                        className="flex-1 p-2 bg-slate-50 border border-slate-300 rounded-md text-xs outline-none font-mono"
                      />
                      <span className="text-[11px] font-bold text-slate-500">{newItemForm.unit}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsNewItemModalOpen(false)}
                    className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingNewItem}
                    className="px-5 py-2 bg-[#5C56DF] hover:bg-[#4D47CB] text-white font-bold text-xs rounded-md shadow-sm transition-colors cursor-pointer"
                  >
                    {isSavingNewItem ? "Saving..." : "Save Item"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* QUICK INLINE EDIT MODAL (PRICE, QTY, DISCOUNT) */}
      {quickEditModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xs bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#1F2937]">
                {quickEditModal.type === "PRICE"
                  ? "Change Item Price (P)"
                  : quickEditModal.type === "QTY"
                  ? "Change Quantity (Q)"
                  : "Change Discount % (D)"}
              </h3>
              <button
                type="button"
                onClick={() => setQuickEditModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyQuickEdit} className="p-4 space-y-3 text-xs">
              <input
                type="number"
                step={quickEditModal.type === "QTY" ? "1" : "0.01"}
                min="0"
                value={quickEditModal.value}
                onChange={(e) =>
                  setQuickEditModal((prev) => ({ ...prev, value: e.target.value }))
                }
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-md text-sm font-mono font-bold outline-none focus:bg-white focus:border-[#5C56DF]"
                autoFocus
              />

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#5C56DF] hover:bg-[#4D47CB] text-white font-bold text-xs rounded-md transition-colors"
                >
                  Apply [Enter]
                </button>
                <button
                  type="button"
                  onClick={() => setQuickEditModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-3 py-2 text-slate-600 hover:text-slate-900 font-medium text-xs rounded-md border border-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: How to use POS Help & Shortcuts Guide */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">⌨️</span>
                <h2 className="text-sm font-bold text-[#1F2937]">
                  POS Billing Keyboard Shortcuts & Quick Guide
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsHelpModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 max-h-[70vh] overflow-y-auto space-y-3 text-xs">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-[11px] font-bold text-left uppercase">
                    <th className="py-1.5">Action</th>
                    <th className="py-1.5 text-right">Shortcut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr>
                    <td className="py-2 text-slate-800">Search Item or Scan Barcode</td>
                    <td className="py-2 text-right"><span className="px-2 py-0.5 bg-slate-100 rounded font-mono font-bold">F1</span></td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-800">Add Discount</td>
                    <td className="py-2 text-right"><span className="px-2 py-0.5 bg-slate-100 rounded font-mono font-bold">F2</span></td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-800">Add Additional Charge</td>
                    <td className="py-2 text-right"><span className="px-2 py-0.5 bg-slate-100 rounded font-mono font-bold">F3</span></td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-800">Focus Received Amount</td>
                    <td className="py-2 text-right"><span className="px-2 py-0.5 bg-slate-100 rounded font-mono font-bold">F4</span></td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-800">Customer Details</td>
                    <td className="py-2 text-right"><span className="px-2 py-0.5 bg-slate-100 rounded font-mono font-bold">F5</span></td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-800">Save & Print Bill</td>
                    <td className="py-2 text-right"><span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-mono font-bold">F6</span></td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-800">Save Bill</td>
                    <td className="py-2 text-right"><span className="px-2 py-0.5 bg-[#5C56DF] text-white rounded font-mono font-bold">F7</span></td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-800">Hold Bill & Create Another</td>
                    <td className="py-2 text-right"><span className="px-2 py-0.5 bg-slate-100 rounded font-mono font-bold">CTRL + B</span></td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-800">Create New Item</td>
                    <td className="py-2 text-right"><span className="px-2 py-0.5 bg-slate-100 rounded font-mono font-bold">CTRL + I</span></td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-800">POS Settings</td>
                    <td className="py-2 text-right"><span className="px-2 py-0.5 bg-slate-100 rounded font-mono font-bold">CTRL + S</span></td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-800">Clear All Items</td>
                    <td className="py-2 text-right"><span className="px-2 py-0.5 bg-slate-100 rounded font-mono font-bold">CTRL + C</span></td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-800">Exit POS Screen</td>
                    <td className="py-2 text-right"><span className="px-2 py-0.5 bg-slate-100 rounded font-mono font-bold">CTRL + Q</span></td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-800">Change Price of selected item</td>
                    <td className="py-2 text-right"><span className="px-2 py-0.5 bg-slate-100 rounded font-mono font-bold">P</span></td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-800">Change QTY of selected item</td>
                    <td className="py-2 text-right"><span className="px-2 py-0.5 bg-slate-100 rounded font-mono font-bold">Q</span></td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-800">Change Discount of selected item</td>
                    <td className="py-2 text-right"><span className="px-2 py-0.5 bg-slate-100 rounded font-mono font-bold">D</span></td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-800">Delete selected item</td>
                    <td className="py-2 text-right"><span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded font-mono font-bold">DEL</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 text-right">
              <button
                type="button"
                onClick={() => setIsHelpModalOpen(false)}
                className="px-4 py-2 bg-[#5C56DF] text-white font-bold text-xs rounded-md"
              >
                Close [ESC]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
