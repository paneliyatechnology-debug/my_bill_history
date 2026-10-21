"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";
import { getPartyItemPrice } from "../../../lib/party-item-pricing";
import { Modal } from "../../../components/ui/modal";
import QRCode from "qrcode";

interface CatalogItem {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  retailPrice: number;
  wholesalePrice?: number;
  taxRate: number;
  hsnCode?: string;
  currentStock?: number;
  category?: {
    id: string;
    name: string;
  };
}

interface CartItem {
  item: CatalogItem;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
}

interface Party {
  id: string;
  name: string;
  mobile?: string;
  gstin?: string;
  outstandingBalance?: number;
}

interface HeldCart {
  id: string;
  timestamp: string;
  customerName: string;
  customerPhone: string;
  partyId?: string;
  items: CartItem[];
  paymentMode: "CASH" | "UPI" | "CARD" | "CREDIT" | "SPLIT";
}

interface RecentInvoice {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  totalAmount: number;
  paymentMode?: string;
  customerName?: string;
  customerPhone?: string;
  status?: string;
}

export default function PosTerminalPage() {
  const { lang, tenantContext, currentCompany, currentBranch, user } = useAuth();

  // Catalog & Cart State
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [pricingMode, setPricingMode] = useState<"RETAIL" | "WHOLESALE">("RETAIL");
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Customer State
  const [customerType, setCustomerType] = useState<"WALK_IN" | "REGISTERED">("WALK_IN");
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [partySearchTerm, setPartySearchTerm] = useState("");

  // Offline State
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Payment State
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "CARD" | "CREDIT" | "SPLIT">("CASH");
  const [tenderedAmount, setTenderedAmount] = useState<number | "">("");
  const [splitCash, setSplitCash] = useState<number | "">("");
  const [splitOnline, setSplitOnline] = useState<number | "">("");
  const [overallDiscount, setOverallDiscount] = useState<number | "">("");
  const [extraCharges, setExtraCharges] = useState<number | "">("");

  const [lastReceipt, setLastReceipt] = useState<any | null>(null);
  const [receiptSize, setReceiptSize] = useState<"80mm" | "58mm" | "A4">("80mm");
  const [showTaxBreakup, setShowTaxBreakup] = useState(true);
  const [showUpiQrOnReceipt, setShowUpiQrOnReceipt] = useState(true);

  // Dynamic Real UPI QR Codes
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string>("");
  const [receiptQrDataUrl, setReceiptQrDataUrl] = useState<string>("");

  // Modals
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [isHeldCartsModalOpen, setIsHeldCartsModalOpen] = useState(false);
  const [isRecentInvoicesModalOpen, setIsRecentInvoicesModalOpen] = useState(false);
  const [isDaySummaryModalOpen, setIsDaySummaryModalOpen] = useState(false);
  const [isQuickItemModalOpen, setIsQuickItemModalOpen] = useState(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);

  // Quick Item Form
  const [quickItemForm, setQuickItemForm] = useState({
    name: "",
    price: "",
    quantity: "1",
    taxRate: "18",
  });

  // Quick New Customer Form
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: "",
    mobile: "",
    gstin: "",
    city: "",
  });

  // Barcode input ref
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  // Scan Audio Feedback
  const playScanBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  };

  // Connectivity Listener
  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    try {
      const saved = localStorage.getItem("billing_pos_offline_queue");
      if (saved) setOfflineQueue(JSON.parse(saved));
      const savedHeld = localStorage.getItem("billing_pos_held_carts");
      if (savedHeld) setHeldCarts(JSON.parse(savedHeld));
    } catch {
      setOfflineQueue([]);
    }

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Fetch initial catalog, parties & recent sales
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [itemsRes, partiesRes, invoicesRes]: any = await Promise.all([
        apiClient.get("/items").catch(() => []),
        apiClient.get("/parties").catch(() => []),
        apiClient.get("/invoices", { limit: 15 }).catch(() => []),
      ]);

      setItems(extractList<CatalogItem>(itemsRes));
      setParties(extractList<Party>(partiesRes));
      setRecentInvoices(extractList<RecentInvoice>(invoicesRes));
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchData();
    }
  }, [tenantContext.companyId, fetchData]);

  // Categories
  const categories = useMemo(() => {
    const catMap = new Map<string, string>();
    items.forEach((it) => {
      if (it.category?.id && it.category?.name) {
        catMap.set(it.category.id, it.category.name);
      }
    });
    return Array.from(catMap.entries()).map(([id, name]) => ({ id, name }));
  }, [items]);

  // Add Item to cart
  const addToCart = (item: CatalogItem) => {
    playScanBeep();
    const partyPrice = selectedParty?.id
      ? getPartyItemPrice(selectedParty.id, item.id, selectedParty.name, item.name)
      : null;
    const price =
      partyPrice !== null
        ? partyPrice
        : pricingMode === "WHOLESALE" && item.wholesalePrice
        ? Number(item.wholesalePrice)
        : Number(item.retailPrice) || 0;

    const existing = cart.find((c) => c.item.id === item.id);
    if (existing) {
      setCart(
        cart.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c,
        ),
      );
    } else {
      setCart([
        ...cart,
        {
          item,
          quantity: 1,
          unitPrice: price,
        },
      ]);
    }
  };

  // Barcode / Search Enter key handler
  const handleBarcodeSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      const exactMatch = items.find(
        (it) =>
          it.barcode?.toLowerCase() === term || it.sku?.toLowerCase() === term,
      );
      if (exactMatch) {
        addToCart(exactMatch);
        setSearchTerm("");
        return;
      }

      const nameMatch = items.find((it) => it.name.toLowerCase() === term);
      if (nameMatch) {
        addToCart(nameMatch);
        setSearchTerm("");
        return;
      }

      const matches = items.filter(
        (it) =>
          it.name.toLowerCase().includes(term) ||
          (it.barcode && it.barcode.toLowerCase().includes(term)) ||
          (it.sku && it.sku.toLowerCase().includes(term)),
      );
      if (matches.length === 1) {
        addToCart(matches[0]);
        setSearchTerm("");
        return;
      }
    }
  };

  // Update item quantity
  const updateQuantity = (itemId: string, delta: number) => {
    setCart(
      cart
        .map((c) => {
          if (c.item.id === itemId) {
            const nextQty = c.quantity + delta;
            return nextQty > 0 ? { ...c, quantity: nextQty } : null;
          }
          return c;
        })
        .filter(Boolean) as CartItem[],
    );
  };

  const setExactQuantity = (itemId: string, qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter((c) => c.item.id !== itemId));
    } else {
      setCart(
        cart.map((c) => (c.item.id === itemId ? { ...c, quantity: qty } : c)),
      );
    }
  };

  // Update Item Price in cart directly
  const updateItemPrice = (itemId: string, price: number) => {
    setCart(
      cart.map((c) => (c.item.id === itemId ? { ...c, unitPrice: Math.max(0, price) } : c)),
    );
  };

  // Clear Cart
  const clearCart = () => {
    setCart([]);
    setTenderedAmount("");
    setSplitCash("");
    setSplitOnline("");
    setOverallDiscount("");
    setExtraCharges("");
    setSelectedParty(null);
    setCustomerType("WALK_IN");
    setCustomerName("");
    setCustomerPhone("");
    barcodeInputRef.current?.focus();
  };

  // Hold current cart
  const handleHoldCart = () => {
    if (cart.length === 0) return;
    const newHeld: HeldCart = {
      id: `HELD-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      customerName:
        selectedParty?.name || customerName || (lang === "gu" ? "વોક-ઇન ગ્રાહક" : "Walk-in"),
      customerPhone: selectedParty?.mobile || customerPhone,
      partyId: selectedParty?.id,
      items: [...cart],
      paymentMode,
    };
    const updated = [newHeld, ...heldCarts];
    setHeldCarts(updated);
    try {
      localStorage.setItem("billing_pos_held_carts", JSON.stringify(updated));
    } catch {}
    clearCart();
  };

  // Recall held cart
  const handleRecallCart = (held: HeldCart) => {
    setCart(held.items);
    if (held.partyId) {
      const p = parties.find((pt) => pt.id === held.partyId);
      if (p) {
        setSelectedParty(p);
        setCustomerType("REGISTERED");
      }
    } else {
      setCustomerName(
        held.customerName === "Walk-in" || held.customerName === "વોક-ઇન ગ્રાહક"
          ? ""
          : held.customerName,
      );
      setCustomerPhone(held.customerPhone);
      setCustomerType("WALK_IN");
    }
    setPaymentMode(held.paymentMode);

    const remaining = heldCarts.filter((h) => h.id !== held.id);
    setHeldCarts(remaining);
    try {
      localStorage.setItem("billing_pos_held_carts", JSON.stringify(remaining));
    } catch {}
    setIsHeldCartsModalOpen(false);
  };

  // Add Quick Item (Open Item)
  const handleAddQuickItem = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = Number(quickItemForm.price);
    const qty = Number(quickItemForm.quantity) || 1;
    const tax = Number(quickItemForm.taxRate) || 0;
    if (!quickItemForm.name.trim() || rate <= 0) return;

    const quickCatalogItem: CatalogItem = {
      id: `quick_${Date.now()}`,
      name: quickItemForm.name.trim(),
      retailPrice: rate,
      taxRate: tax,
      sku: "MISC",
    };

    setCart([
      ...cart,
      {
        item: quickCatalogItem,
        quantity: qty,
        unitPrice: rate,
      },
    ]);

    setQuickItemForm({ name: "", price: "", quantity: "1", taxRate: "18" });
    setIsQuickItemModalOpen(false);
    playScanBeep();
  };

  // Create Quick Customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.name.trim()) return;

    try {
      const res: any = await apiClient.post("/parties", {
        name: newCustomerForm.name.trim(),
        partyType: "CUSTOMER",
        mobile: newCustomerForm.mobile.trim() || undefined,
        gstin: newCustomerForm.gstin.trim() || undefined,
        city: newCustomerForm.city.trim() || undefined,
      });

      if (res?.id) {
        const newParty: Party = {
          id: res.id,
          name: newCustomerForm.name.trim(),
          mobile: newCustomerForm.mobile.trim(),
          gstin: newCustomerForm.gstin.trim(),
          outstandingBalance: 0,
        };
        setParties([newParty, ...parties]);
        setSelectedParty(newParty);
        setCustomerType("REGISTERED");
      }
      setIsNewCustomerModalOpen(false);
      setNewCustomerForm({ name: "", mobile: "", gstin: "", city: "" });
    } catch (err: any) {
      setError(err.message || "Failed to create customer.");
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      } else if (e.key === "F4") {
        e.preventDefault();
        clearCart();
      } else if (e.key === "F8") {
        e.preventDefault();
        handleHoldCart();
      } else if (e.key === "F9") {
        e.preventDefault();
        setIsHeldCartsModalOpen(true);
      } else if (e.key === "F10") {
        e.preventDefault();
        setIsRecentInvoicesModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, customerName, customerPhone, paymentMode, heldCarts, selectedParty]);

  // Computations
  let subtotal = 0;
  let taxTotal = 0;
  cart.forEach((c) => {
    const lineBase = c.unitPrice * c.quantity;
    const lineTax = (lineBase * (c.item.taxRate || 0)) / 100;
    subtotal += lineBase;
    taxTotal += lineTax;
  });

  const discountVal = Number(overallDiscount) || 0;
  const extraVal = Number(extraCharges) || 0;
  const rawTotal = subtotal + taxTotal - discountVal + extraVal;
  const grandTotal = Math.max(0, Math.round(rawTotal));
  const roundOff = (grandTotal - rawTotal);

  // Change Calculation
  const changeDue = useMemo(() => {
    if (paymentMode === "CASH") {
      const tendered = typeof tenderedAmount === "number" ? tenderedAmount : 0;
      return tendered >= grandTotal ? tendered - grandTotal : 0;
    }
    if (paymentMode === "SPLIT") {
      const c = Number(splitCash) || 0;
      const o = Number(splitOnline) || 0;
      const totalTendered = c + o;
      return totalTendered >= grandTotal ? totalTendered - grandTotal : 0;
    }
    return 0;
  }, [paymentMode, tenderedAmount, splitCash, splitOnline, grandTotal]);

  // Generate Real Dynamic UPI QR Code for Counter Screen
  useEffect(() => {
    if (grandTotal > 0) {
      const vpa = (currentCompany as any)?.upiVpa || "merchant@upi";
      const compName = currentCompany?.tradeName || currentCompany?.legalName || "Merchant";
      const upiUri = `upi://pay?pa=${vpa}&pn=${encodeURIComponent(compName)}&am=${grandTotal.toFixed(2)}&cu=INR&tn=POS%20Bill`;

      QRCode.toDataURL(upiUri, {
        width: 200,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
        errorCorrectionLevel: "M",
      })
        .then((url) => setUpiQrDataUrl(url))
        .catch(() => setUpiQrDataUrl(""));
    } else {
      setUpiQrDataUrl("");
    }
  }, [grandTotal, currentCompany]);

  // Generate Real QR Code for Receipt Print
  useEffect(() => {
    if (lastReceipt) {
      const vpa = (currentCompany as any)?.upiVpa || "merchant@upi";
      const compName = currentCompany?.tradeName || currentCompany?.legalName || "Merchant";
      const uri = `upi://pay?pa=${vpa}&pn=${encodeURIComponent(compName)}&am=${Number(lastReceipt.grandTotal).toFixed(2)}&cu=INR&tn=Bill%20${lastReceipt.invoiceNumber}`;

      QRCode.toDataURL(uri, {
        width: 140,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
        errorCorrectionLevel: "M",
      })
        .then((url) => setReceiptQrDataUrl(url))
        .catch(() => setReceiptQrDataUrl(""));
    }
  }, [lastReceipt, currentCompany]);

  // Checkout Handler
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);
    setError(null);

    const clientOfflineUuid = `pos_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const offlineBillNumber = `POS-${Date.now().toString().slice(-4)}`;

    const effectiveCustomerName = selectedParty?.name || customerName || "Walk-in Customer";
    const effectiveCustomerPhone = selectedParty?.mobile || customerPhone || undefined;

    const orderPayload = {
      clientOfflineUuid,
      offlineBillNumber,
      partyId: selectedParty?.id || undefined,
      customerName: effectiveCustomerName,
      customerPhone: effectiveCustomerPhone,
      paymentMode: paymentMode === "SPLIT" ? "CASH" : paymentMode,
      receivedAmount:
        paymentMode === "CASH"
          ? typeof tenderedAmount === "number"
            ? tenderedAmount
            : grandTotal
          : paymentMode === "SPLIT"
          ? (Number(splitCash) || 0) + (Number(splitOnline) || 0)
          : paymentMode === "CREDIT"
          ? 0
          : grandTotal,
      tenderedSplit:
        paymentMode === "SPLIT"
          ? {
              cash: Number(splitCash) || 0,
              upiQr: Number(splitOnline) || 0,
            }
          : undefined,
      items: cart.map((c) => ({
        itemId: c.item.id,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        taxRate: c.item.taxRate || 0,
      })),
    };

    // Offline Handling
    if (!navigator.onLine) {
      const updatedQueue = [...offlineQueue, orderPayload];
      setOfflineQueue(updatedQueue);
      try {
        localStorage.setItem("billing_pos_offline_queue", JSON.stringify(updatedQueue));
      } catch {}

      setLastReceipt({
        invoiceNumber: offlineBillNumber,
        grandTotal,
        subtotal,
        taxTotal,
        discountVal,
        roundOff,
        extraVal,
        paymentMode,
        changeDue,
        items: [...cart],
        customerName: effectiveCustomerName,
        customerPhone: effectiveCustomerPhone,
        date: new Date().toLocaleString("en-IN"),
        isOffline: true,
      });

      clearCart();
      setIsCheckingOut(false);
      return;
    }

    try {
      const res: any = await apiClient.post("/invoices/pos-checkout", orderPayload);

      setLastReceipt({
        invoiceNumber: res?.invoiceNumber || offlineBillNumber,
        grandTotal,
        subtotal,
        taxTotal,
        discountVal,
        roundOff,
        extraVal,
        paymentMode,
        changeDue,
        items: [...cart],
        customerName: effectiveCustomerName,
        customerPhone: effectiveCustomerPhone,
        date: new Date().toLocaleString("en-IN"),
      });

      clearCart();
      fetchData();
    } catch (err: any) {
      if (
        !navigator.onLine ||
        err.message?.includes("Failed to fetch") ||
        err.message?.includes("NetworkError")
      ) {
        const updatedQueue = [...offlineQueue, orderPayload];
        setOfflineQueue(updatedQueue);
        try {
          localStorage.setItem("billing_pos_offline_queue", JSON.stringify(updatedQueue));
        } catch {}

        setLastReceipt({
          invoiceNumber: offlineBillNumber,
          grandTotal,
          subtotal,
          taxTotal,
          discountVal,
          roundOff,
          extraVal,
          paymentMode,
          changeDue,
          items: [...cart],
          customerName: effectiveCustomerName,
          customerPhone: effectiveCustomerPhone,
          date: new Date().toLocaleString("en-IN"),
          isOffline: true,
        });

        clearCart();
      } else {
        setError(
          lang === "gu" && err.messageGujarati
            ? err.messageGujarati
            : err.message || "POS checkout failed.",
        );
      }
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Sync Offline
  const handleSyncOffline = async () => {
    if (offlineQueue.length === 0 || !navigator.onLine) return;
    setIsSyncing(true);
    setSyncStatus(null);
    setError(null);
    try {
      const res: any = await apiClient.post("/invoices/pos-sync", {
        terminalId: "POS-TERM-01",
        syncTimestamp: new Date().toISOString(),
        invoices: offlineQueue,
      });

      const syncedSet = new Set(
        (res?.results || [])
          .filter((r: any) => r.status === "SYNCED")
          .map((r: any) => r.clientOfflineUuid),
      );

      const remainingQueue = offlineQueue
        .filter((o) => !syncedSet.has(o.clientOfflineUuid))
        .map((o) => {
          const failure = (res?.results || []).find(
            (r: any) =>
              r.clientOfflineUuid === o.clientOfflineUuid &&
              r.status === "FAILED",
          );
          return failure ? { ...o, syncError: failure.error } : o;
        });

      setOfflineQueue(remainingQueue);

      if (remainingQueue.length > 0) {
        localStorage.setItem("billing_pos_offline_queue", JSON.stringify(remainingQueue));
        setError(
          lang === "gu"
            ? `${syncedSet.size} બિલો સિંક થયા. ${remainingQueue.length} કતારમાં છે.`
            : `${syncedSet.size} orders synced. ${remainingQueue.length} order(s) remain in queue.`,
        );
      } else {
        localStorage.removeItem("billing_pos_offline_queue");
        setSyncStatus(
          lang === "gu"
            ? `તમામ ${syncedSet.size} ઑફલાઇન બિલો સર્વર સાથે સિંક થઈ ગયા!`
            : `All ${syncedSet.size} offline bill(s) synchronized successfully!`,
        );
      }
    } catch (err: any) {
      setError(err.message || "Offline sync failed.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Filtered Catalog
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (selectedCategory !== "ALL" && it.category?.id !== selectedCategory) {
        return false;
      }
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        it.name.toLowerCase().includes(term) ||
        (it.barcode && it.barcode.toLowerCase().includes(term)) ||
        (it.sku && it.sku.toLowerCase().includes(term)) ||
        (it.hsnCode && it.hsnCode.toLowerCase().includes(term))
      );
    });
  }, [items, selectedCategory, searchTerm]);

  // Parties search
  const filteredParties = useMemo(() => {
    if (!partySearchTerm.trim()) return parties.slice(0, 5);
    const s = partySearchTerm.toLowerCase();
    return parties
      .filter((p) => p.name.toLowerCase().includes(s) || (p.mobile && p.mobile.includes(s)))
      .slice(0, 8);
  }, [parties, partySearchTerm]);

  // Day Summary Computation (Shift Summary)
  const daySummary = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const todayBills = recentInvoices.filter((inv) => inv.createdAt?.startsWith(todayStr));

    let cashTotal = 0;
    let upiTotal = 0;
    let cardTotal = 0;
    let creditTotal = 0;
    let grandSales = 0;

    todayBills.forEach((inv) => {
      const amt = Number(inv.totalAmount) || 0;
      grandSales += amt;
      if (inv.paymentMode === "CASH") cashTotal += amt;
      else if (inv.paymentMode === "UPI") upiTotal += amt;
      else if (inv.paymentMode === "CARD") cardTotal += amt;
      else creditTotal += amt;
    });

    return {
      billCount: todayBills.length,
      grandSales,
      cashTotal,
      upiTotal,
      cardTotal,
      creditTotal,
    };
  }, [recentInvoices]);

  // Isolated Iframe Printing: 100% clean, single page, zero top whitespace
  const handlePrintReceipt = () => {
    const printElem = document.getElementById("thermal-receipt-printable-content");
    if (!printElem) {
      window.print();
      return;
    }

    let iframe = document.getElementById("pos-print-hidden-frame") as HTMLIFrameElement;
    if (iframe) {
      iframe.remove();
    }
    iframe = document.createElement("iframe");
    iframe.id = "pos-print-hidden-frame";
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

    const widthStyle = receiptSize === "58mm" ? "52mm" : receiptSize === "A4" ? "100%" : "72mm";
    const pageStyle = receiptSize === "58mm" ? "58mm auto" : receiptSize === "A4" ? "A4 portrait" : "80mm auto";
    const fontStyle = receiptSize === "58mm" ? "9.5px" : receiptSize === "A4" ? "12px" : "11px";

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Receipt_${lastReceipt?.invoiceNumber || "POS"}</title>
          <style>
            @page {
              size: ${pageStyle};
              margin: 0;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: ${fontStyle};
              line-height: 1.25;
              color: #000;
              background: #fff;
              width: ${widthStyle};
              margin: 0 auto;
              padding: ${receiptSize === "A4" ? "8mm 10mm" : "2mm 3mm"};
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              padding: 2px 0;
            }
            .dashed-border-b {
              border-bottom: 1px dashed #000;
              padding-bottom: 4px;
              margin-bottom: 4px;
            }
            .dashed-border-t {
              border-top: 1px dashed #000;
              padding-top: 4px;
              margin-top: 4px;
            }
            .solid-border-t {
              border-top: 1px solid #000;
              padding-top: 4px;
              margin-top: 4px;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .font-bold { font-weight: bold; }
            .flex-between {
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            img {
              display: block;
              margin: 4px auto;
              max-width: 100%;
            }
          </style>
        </head>
        <body>
          ${printElem.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 250);
  };

  return (
    <div className="h-[calc(100vh-5.5rem)] flex flex-col font-sans -m-4 sm:-m-6 p-3 sm:p-4 bg-slate-100">

      {/* Top POS Utility Bar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#F47721] text-white flex items-center justify-center font-bold text-lg shadow-sm">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 leading-tight">
                {lang === "gu" ? "ઝડપી કાઉન્ટર બિલિંગ (POS)" : "Retail Counter POS Terminal"}
              </h1>
              {/* B2C Retail vs B2B Wholesale Toggle */}
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setPricingMode("RETAIL")}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    pricingMode === "RETAIL"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Retail (B2C)
                </button>
                <button
                  type="button"
                  onClick={() => setPricingMode("WHOLESALE")}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    pricingMode === "WHOLESALE"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Wholesale (B2B)
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {currentCompany?.tradeName || currentCompany?.legalName || "Store"} • {currentBranch?.name || "Counter 1"} • Cashier: {user?.name || "Admin"}
            </p>
          </div>
        </div>

        {/* Action Buttons in Header */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Open Item / Misc Item */}
          <button
            onClick={() => setIsQuickItemModalOpen(true)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1 transition-all"
            title="Add Custom / Misc Item"
          >
            <span>➕</span>
            <span>{lang === "gu" ? "+ ઓપન આઇટમ" : "+ Open Item"}</span>
          </button>

          {/* Recent Invoices / Reprint */}
          <button
            onClick={() => setIsRecentInvoicesModalOpen(true)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all"
            title="View today's bills / Reprint (F10)"
          >
            <span>📜</span>
            <span>{lang === "gu" ? "આજના બિલો" : "Past Bills (F10)"}</span>
          </button>

          {/* Shift / Day Summary Z-Report */}
          <button
            onClick={() => setIsDaySummaryModalOpen(true)}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold rounded-xl border border-indigo-200 flex items-center gap-1.5 transition-all"
            title="Shift / Cash Register Summary"
          >
            <span>📊</span>
            <span>{lang === "gu" ? "ડે-ક્લોઝ" : "Day Close (Z-Report)"}</span>
          </button>

          {/* Held Carts Badge */}
          {heldCarts.length > 0 && (
            <button
              onClick={() => setIsHeldCartsModalOpen(true)}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-xl border border-amber-300 flex items-center gap-1.5 transition-all animate-pulse"
              title="Recall Held Cart (F9)"
            >
              <span>⏸️</span>
              <span>{heldCarts.length} {lang === "gu" ? "હોલ્ડ બિલો" : "Held (F9)"}</span>
            </button>
          )}

          {/* Online/Offline Status */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
              isOnline
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-rose-500"}`} />
            <span>{isOnline ? "Online" : "Offline"}</span>
          </div>

          {offlineQueue.length > 0 && (
            <button
              onClick={handleSyncOffline}
              disabled={isSyncing || !isOnline}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1 transition-all"
            >
              {isSyncing ? "..." : `🔄 Sync (${offlineQueue.length})`}
            </button>
          )}
        </div>
      </div>

      {syncStatus && (
        <div className="mb-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex justify-between items-center">
          <span>✓ {syncStatus}</span>
          <button onClick={() => setSyncStatus(null)} className="text-emerald-600 font-bold ml-2">✕</button>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
        {/* Left Column: Fast Item Catalog */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm p-4 overflow-hidden">
          {/* Barcode / Search Input with Scanner Icon */}
          <div className="mb-3 flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-3 text-slate-400 text-sm">
                🔍
              </span>
              <input
                ref={barcodeInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleBarcodeSubmit}
                placeholder={
                  lang === "gu"
                    ? "બારકોડ સ્કેન કરો અથવા નામ/SKU લખી Enter દબાવો (F2)..."
                    : "Scan Barcode or Search Items (Press Enter to add, F2)..."
                }
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 font-medium transition-all outline-none"
              />
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 rounded-xl"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          {categories.length > 0 && (
            <div className="mb-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategory("ALL")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                  selectedCategory === "ALL"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {lang === "gu" ? "બધી વસ્તુઓ (All)" : "All Items"}
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                    selectedCategory === c.id
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {/* Product Cards Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="py-24 text-center text-slate-400 text-xs">
                <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2" />
                <p>{lang === "gu" ? "માલસામાન લોડ થઈ રહ્યો છે..." : "Loading catalog..."}</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-24 text-center text-slate-400 text-xs">
                <div className="text-4xl mb-2">📦</div>
                <p className="font-semibold text-slate-700">
                  {lang === "gu" ? "કોઈ માલ મળ્યો નથી" : "No products found matching search"}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Try another name or click '+ Open Item' to add miscellaneous item.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {filteredItems.map((item) => {
                  const inCartCount = cart.find((c) => c.item.id === item.id)?.quantity || 0;
                  const displayPrice =
                    pricingMode === "WHOLESALE" && item.wholesalePrice
                      ? Number(item.wholesalePrice)
                      : Number(item.retailPrice) || 0;

                  return (
                    <button
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className={`p-3 bg-white hover:bg-indigo-50/40 border rounded-2xl text-left transition-all active:scale-[0.98] flex flex-col justify-between h-32 group relative shadow-xs ${
                        inCartCount > 0 ? "border-indigo-500 ring-1 ring-indigo-500" : "border-slate-200 hover:border-indigo-300"
                      }`}
                    >
                      {inCartCount > 0 && (
                        <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow-md animate-in zoom-in-75">
                          {inCartCount}
                        </span>
                      )}

                      <div>
                        <h3 className="font-bold text-slate-900 text-xs line-clamp-2 group-hover:text-indigo-600 transition-colors">
                          {item.name}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                          {item.barcode ? `🏷️ ${item.barcode}` : item.sku || "PROD"}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          ₹{displayPrice.toFixed(2)}
                        </span>
                        <span className="text-[10px] bg-slate-100 group-hover:bg-indigo-100 text-slate-600 group-hover:text-indigo-700 font-bold px-1.5 py-0.5 rounded-lg transition-colors">
                          +{item.taxRate}%
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Checkout Cart & Instant Payment */}
        <div className="w-full lg:w-[450px] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm p-4 overflow-hidden">
          {/* Cart Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                {lang === "gu" ? "ગ્રાહક કાર્ટ (Cart)" : "Order Cart"}
              </span>
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {cart.reduce((s, c) => s + c.quantity, 0)} {lang === "gu" ? "વસ્તુઓ" : "items"}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {cart.length > 0 && (
                <>
                  <button
                    onClick={handleHoldCart}
                    className="text-xs text-amber-800 hover:text-amber-900 font-semibold px-2 py-1 bg-amber-50 rounded-lg border border-amber-200 transition-colors"
                    title="Hold cart (F8)"
                  >
                    ⏸️ {lang === "gu" ? "હોલ્ડ (F8)" : "Hold"}
                  </button>
                  <button
                    onClick={clearCart}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 bg-rose-50 rounded-lg border border-rose-200 transition-colors"
                    title="Clear Cart (F4)"
                  >
                    🗑️ {lang === "gu" ? "ખાલી" : "Clear"}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Customer Selection Toolbar */}
          <div className="py-2 border-b border-slate-100 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCustomerType("WALK_IN");
                    setSelectedParty(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                    customerType === "WALK_IN"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  🚶 {lang === "gu" ? "વોક-ઇન (Walk-in)" : "Walk-in"}
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerType("REGISTERED")}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                    customerType === "REGISTERED"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  👥 {lang === "gu" ? "ખાતા ગ્રાહક (Party)" : "Party Customer"}
                </button>
              </div>

              {customerType === "REGISTERED" && (
                <button
                  onClick={() => setIsNewCustomerModalOpen(true)}
                  className="text-[11px] font-bold text-indigo-600 hover:underline"
                >
                  + {lang === "gu" ? "નવો ગ્રાહક" : "New Customer"}
                </button>
              )}
            </div>

            {customerType === "WALK_IN" ? (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={lang === "gu" ? "ગ્રાહક નામ (વૈકલ્પિક)" : "Customer Name (Optional)"}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-none text-xs"
                />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder={lang === "gu" ? "મોબાઇલ નં." : "Mobile Number"}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-none text-xs font-mono"
                />
              </div>
            ) : (
              <div className="space-y-1">
                {selectedParty ? (
                  <div className="p-2 bg-indigo-50/60 border border-indigo-200 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-indigo-900">{selectedParty.name}</p>
                      <p className="text-[10px] text-indigo-700 font-mono">
                        {selectedParty.mobile || "No Mobile"} • Balance: ₹{Number(selectedParty.outstandingBalance || 0).toFixed(2)}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedParty(null)}
                      className="text-xs text-slate-400 hover:text-rose-600 font-bold px-1.5 py-0.5"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={partySearchTerm}
                      onChange={(e) => setPartySearchTerm(e.target.value)}
                      placeholder={lang === "gu" ? "ગ્રાહક નામ કે મોબાઈલ શોધો..." : "Search party by name or phone..."}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-indigo-500"
                    />
                    {partySearchTerm && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1 max-h-36 overflow-y-auto text-xs">
                        {filteredParties.length === 0 ? (
                          <p className="p-2 text-slate-400 text-center text-[11px]">No matching parties</p>
                        ) : (
                          filteredParties.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSelectedParty(p);
                                setPartySearchTerm("");
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex justify-between items-center"
                            >
                              <span className="font-semibold text-slate-800">{p.name}</span>
                              <span className="font-mono text-[10px] text-slate-400">{p.mobile || ""}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto py-2 space-y-1.5 pr-1">
            {cart.length === 0 ? (
              <div className="py-20 text-center text-slate-400 text-xs">
                <div className="text-4xl mb-2">🛒</div>
                <p className="font-semibold text-slate-700">
                  {lang === "gu" ? "કાર્ટ ખાલી છે" : "Cart is empty"}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Scan barcode (F2) or click items to add
                </p>
              </div>
            ) : (
              cart.map((c) => (
                <div
                  key={c.item.id}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100/70 rounded-xl text-xs border border-slate-200 transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-900 truncate flex-1 mr-2">
                      {c.item.name}
                    </p>
                    <button
                      onClick={() => setExactQuantity(c.item.id, 0)}
                      className="text-slate-400 hover:text-rose-600 text-sm font-bold p-0.5"
                      title="Remove Item"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {/* Price edit */}
                    <div className="flex items-center gap-1 font-mono text-[11px] text-slate-600">
                      <span>Rate: ₹</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={c.unitPrice}
                        onChange={(e) => updateItemPrice(c.item.id, parseFloat(e.target.value) || 0)}
                        className="w-16 px-1 py-0.5 bg-white border border-slate-200 rounded font-bold text-slate-900 text-xs outline-none"
                      />
                      <span className="text-[10px] text-slate-400">(+{c.item.taxRate}% GST)</span>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                        <button
                          onClick={() => updateQuantity(c.item.id, -1)}
                          className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 font-bold"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={c.quantity}
                          onChange={(e) =>
                            setExactQuantity(c.item.id, parseInt(e.target.value) || 0)
                          }
                          className="w-8 text-center font-mono font-bold text-slate-800 text-xs outline-none py-0.5"
                        />
                        <button
                          onClick={() => updateQuantity(c.item.id, 1)}
                          className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 font-bold"
                        >
                          +
                        </button>
                      </div>

                      <span className="font-mono font-bold text-slate-900 w-16 text-right">
                        ₹{(c.unitPrice * c.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-2 mb-2 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-700 font-semibold flex items-center gap-1.5">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Order Summary & Payment Mode */}
          <div className="border-t border-slate-200 pt-2.5 space-y-2">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Excl. Tax):</span>
                <span className="font-mono">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST Tax (CGST+SGST):</span>
                <span className="font-mono">₹{taxTotal.toFixed(2)}</span>
              </div>

              {/* Discount & Extra Charges */}
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-[10px] font-semibold text-slate-500">
                    {lang === "gu" ? "ડિસ્કાઉન્ટ:" : "Discount:"}
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={overallDiscount}
                    onChange={(e) =>
                      setOverallDiscount(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="₹ 0.00"
                    className="w-16 text-right text-xs font-mono py-0.5 px-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-[10px] font-semibold text-slate-500">
                    {lang === "gu" ? "ચાર્જિસ:" : "Delivery:"}
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={extraCharges}
                    onChange={(e) =>
                      setExtraCharges(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="₹ 0.00"
                    className="w-16 text-right text-xs font-mono py-0.5 px-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
              </div>

              {/* Grand Total */}
              <div className="flex justify-between items-center font-bold text-base text-slate-900 pt-1.5 border-t border-slate-200">
                <span className="text-slate-800">
                  {lang === "gu" ? "કુલ રકમ (Net Payable):" : "Net Payable:"}
                </span>
                <span className="font-mono text-[#F47721] text-xl font-extrabold">
                  ₹{grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Mode Selector */}
            <div className="grid grid-cols-5 gap-1 pt-1">
              {(["CASH", "UPI", "CARD", "CREDIT", "SPLIT"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPaymentMode(mode)}
                  className={`py-1.5 text-[10px] font-bold rounded-xl border transition-all ${
                    paymentMode === mode
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {mode === "CASH"
                    ? "💵 Cash"
                    : mode === "UPI"
                    ? "📱 UPI"
                    : mode === "CARD"
                    ? "💳 Card"
                    : mode === "CREDIT"
                    ? "📝 Credit"
                    : "⇄ Split"}
                </button>
              ))}
            </div>

            {/* Cash Tender Input with Quick Money Shortcuts */}
            {paymentMode === "CASH" && (
              <div className="space-y-1.5 pt-0.5 animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={tenderedAmount}
                      onChange={(e) =>
                        setTenderedAmount(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      placeholder={lang === "gu" ? "ગ્રાહકે આપેલ રોકડ..." : "Cash Received..."}
                      className="w-full text-xs pl-6 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold focus:bg-white focus:border-indigo-500 text-slate-900 outline-none"
                    />
                  </div>

                  {changeDue > 0 && (
                    <div className="text-right text-xs bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 animate-in zoom-in-95">
                      <span className="text-[10px] text-emerald-600 block font-semibold leading-tight">
                        {lang === "gu" ? "પરત આપવા:" : "Change Return:"}
                      </span>
                      <span className="font-mono font-bold text-emerald-800 text-sm">
                        ₹{changeDue.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Quick Cash Buttons */}
                <div className="flex gap-1 overflow-x-auto pb-0.5">
                  {[grandTotal, 50, 100, 200, 500, 2000].map((amt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTenderedAmount(amt)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-mono text-[10px] font-semibold rounded-lg border border-slate-200 transition-all whitespace-nowrap"
                    >
                      {idx === 0 ? "Exact" : `₹${amt}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Split Payment Input */}
            {paymentMode === "SPLIT" && (
              <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in duration-150 text-xs">
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Cash (₹)</label>
                  <input
                    type="number"
                    value={splitCash}
                    onChange={(e) => setSplitCash(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="Cash amt"
                    className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">UPI / Card (₹)</label>
                  <input
                    type="number"
                    value={splitOnline}
                    onChange={(e) => setSplitOnline(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="Online amt"
                    className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs outline-none"
                  />
                </div>
              </div>
            )}

            {/* UPI Dynamic QR Preview */}
            {paymentMode === "UPI" && (
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-center space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-900">
                  <span>📱 Scan & Pay via UPI</span>
                </div>
                {upiQrDataUrl ? (
                  <div className="p-2.5 bg-white rounded-xl inline-block shadow-sm border border-indigo-100">
                    <img
                      src={upiQrDataUrl}
                      alt="UPI QR Code"
                      className="w-32 h-32 mx-auto block"
                    />
                    <p className="text-xs font-bold text-indigo-900 mt-1.5 font-mono">
                      ₹{grandTotal.toFixed(2)}
                    </p>
                  </div>
                ) : (
                  <div className="w-32 h-32 bg-slate-100 rounded-xl flex items-center justify-center mx-auto text-xs text-slate-400">
                    <span>Generating UPI QR...</span>
                  </div>
                )}
                <p className="text-[10px] text-slate-500 font-medium">
                  Scan with GPay, PhonePe, Paytm, BHIM or any UPI app
                </p>
              </div>
            )}

            {/* Complete Sale Button */}
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isCheckingOut}
              className="w-full py-3 bg-[#F47721] hover:bg-[#D95F12] active:bg-[#B94B0A] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: cart.length > 0 ? "#F47721" : undefined }}
            >
              {isCheckingOut ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : null}
              <span>
                {isCheckingOut
                  ? "Processing Sale..."
                  : `${lang === "gu" ? "બિલ પૂરું કરો (Checkout)" : "Complete Sale & Print"} • ₹${grandTotal}`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* POS Receipt Modal with Standard Thermal Layout */}
      {lastReceipt && (
        <Modal
          isOpen={true}
          onClose={() => setLastReceipt(null)}
          title={lang === "gu" ? "બિલ પહોંચ અને પ્રિન્ટ (Receipt)" : "Sale Completed - Print Receipt"}
          titleGujarati="રોકડ બિલ પહોંચ"
          maxWidth="md"
        >
          <div className="space-y-4">
            {/* Print Settings Bar */}
            <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-600">Print Size:</span>
                {(["80mm", "58mm", "A4"] as const).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setReceiptSize(sz)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                      receiptSize === sz
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {sz === "80mm" ? "80mm (3\")" : sz === "58mm" ? "58mm (2\")" : "A4 Invoice"}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showUpiQrOnReceipt}
                    onChange={(e) => setShowUpiQrOnReceipt(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>UPI QR</span>
                </label>
                <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showTaxBreakup}
                    onChange={(e) => setShowTaxBreakup(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Tax Split</span>
                </label>
              </div>
            </div>

            {/* 
              THE THERMAL PRINT CONTAINER:
              Has id="thermal-receipt-printable-content" which prints cleanly via isolated iframe.
            */}
            <div className="flex justify-center max-h-[60vh] overflow-y-auto p-2 bg-slate-100/70 rounded-xl">
              <div
                id="thermal-receipt-printable-content"
                className={`bg-white p-4 shadow-sm border border-slate-300 font-mono text-slate-900 transition-all ${
                  receiptSize === "58mm" ? "w-[56mm] text-[10px]" : receiptSize === "A4" ? "w-[190mm] text-xs" : "w-[80mm] text-[11px]"
                }`}
                style={{ lineHeight: "1.3" }}
              >
                {/* Header */}
                <div className="text-center border-b border-dashed border-slate-400 pb-2 mb-2">
                  <h2 className="font-bold text-sm tracking-wider uppercase">
                    {currentCompany?.tradeName || currentCompany?.legalName || "MyBill History"}
                  </h2>
                  <p className="text-[10px] text-slate-600">
                    {currentBranch?.name || "Main Counter"}
                  </p>
                  {(currentCompany as any)?.city && (
                    <p className="text-[10px] text-slate-500">
                      {(currentCompany as any).city}
                    </p>
                  )}
                  {(currentCompany as any)?.gstin && (
                    <p className="text-[10px] font-bold mt-0.5">
                      GSTIN: {(currentCompany as any).gstin}
                    </p>
                  )}
                  <div className="flex justify-between text-[10px] text-slate-600 mt-2 pt-1 border-t border-slate-200">
                    <span>Bill: {lastReceipt.invoiceNumber}</span>
                    <span>{lastReceipt.date}</span>
                  </div>
                  {lastReceipt.customerName && lastReceipt.customerName !== "Walk-in Customer" && (
                    <p className="text-[10px] text-slate-700 text-left mt-0.5 font-bold">
                      Customer: {lastReceipt.customerName} {lastReceipt.customerPhone ? `(${lastReceipt.customerPhone})` : ""}
                    </p>
                  )}
                </div>

                {/* Items List Table */}
                <div className="space-y-1 py-1">
                  <div className="flex justify-between font-bold border-b border-slate-300 pb-1 text-[10px] uppercase text-slate-600">
                    <span className="flex-1">Item</span>
                    <span className="w-10 text-center">Qty</span>
                    <span className="w-12 text-right">Rate</span>
                    <span className="w-14 text-right">Amt (₹)</span>
                  </div>
                  {lastReceipt.items?.map((it: CartItem, i: number) => (
                    <div key={i} className="flex justify-between items-center py-0.5 border-b border-slate-100">
                      <span className="truncate flex-1 pr-1 font-semibold">{it.item.name}</span>
                      <span className="w-10 text-center">{it.quantity}</span>
                      <span className="w-12 text-right">{it.unitPrice.toFixed(2)}</span>
                      <span className="w-14 text-right font-bold">
                        {(it.unitPrice * it.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Totals Breakdown */}
                <div className="border-t border-dashed border-slate-400 pt-2 space-y-1">
                  <div className="flex justify-between text-slate-700">
                    <span>Subtotal:</span>
                    <span>₹{Number(lastReceipt.subtotal || 0).toFixed(2)}</span>
                  </div>

                  {showTaxBreakup && (
                    <>
                      <div className="flex justify-between text-slate-600 text-[10px]">
                        <span>CGST:</span>
                        <span>₹{(Number(lastReceipt.taxTotal || 0) / 2).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600 text-[10px]">
                        <span>SGST:</span>
                        <span>₹{(Number(lastReceipt.taxTotal || 0) / 2).toFixed(2)}</span>
                      </div>
                    </>
                  )}

                  {Number(lastReceipt.discountVal) > 0 && (
                    <div className="flex justify-between text-slate-700">
                      <span>Discount:</span>
                      <span>-₹{Number(lastReceipt.discountVal).toFixed(2)}</span>
                    </div>
                  )}

                  {Number(lastReceipt.extraVal) > 0 && (
                    <div className="flex justify-between text-slate-700">
                      <span>Extra Charges:</span>
                      <span>+₹{Number(lastReceipt.extraVal).toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between font-bold text-sm border-t border-slate-400 pt-1 text-slate-900">
                    <span>Grand Total:</span>
                    <span>₹{Number(lastReceipt.grandTotal).toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-600 pt-0.5">
                    <span>Mode of Payment:</span>
                    <span className="font-bold">{lastReceipt.paymentMode}</span>
                  </div>

                  {lastReceipt.changeDue > 0 && (
                    <div className="flex justify-between text-[11px] font-bold text-emerald-800">
                      <span>Change Returned:</span>
                      <span>₹{Number(lastReceipt.changeDue).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* QR Code on Receipt */}
                {showUpiQrOnReceipt && (
                  <div className="text-center py-2 border-t border-dashed border-slate-400 mt-2">
                    {receiptQrDataUrl ? (
                      <div className="inline-block">
                        <img
                          src={receiptQrDataUrl}
                          alt="UPI Payment QR"
                          className="w-20 h-20 mx-auto block"
                        />
                        <p className="text-[9px] font-bold text-slate-800 font-mono mt-0.5">
                          UPI: ₹{Number(lastReceipt.grandTotal).toFixed(2)}
                        </p>
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-slate-900 text-white mx-auto flex flex-col items-center justify-center text-[8px] rounded p-1">
                        <span>UPI PAY</span>
                        <span className="font-bold">₹{lastReceipt.grandTotal}</span>
                      </div>
                    )}
                    <p className="text-[8px] text-slate-500 mt-0.5">Scan to Verify / Pay</p>
                  </div>
                )}

                {/* Thermal Footer */}
                <div className="text-center text-[9px] text-slate-500 border-t border-dashed border-slate-400 pt-2 space-y-0.5">
                  <p className="font-bold">Thank you for shopping with us!</p>
                  <p>Goods once sold will not be taken back</p>
                  <p className="text-[8px]">Powered by MyBill History POS</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex flex-wrap gap-2">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl font-sans shadow-sm flex items-center justify-center gap-1.5 transition-all"
              >
                <span>🖨️ Print Slip ({receiptSize})</span>
              </button>

              <button
                onClick={() => {
                  const text = `*Invoice: ${lastReceipt.invoiceNumber}*\nTotal: ₹${lastReceipt.grandTotal}\nStore: ${currentCompany?.tradeName || "MyBill History"}\nThank you!`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                }}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl font-sans shadow-sm flex items-center justify-center gap-1.5 transition-all"
              >
                <span>📱 WhatsApp</span>
              </button>

              <button
                onClick={() => {
                  setLastReceipt(null);
                  barcodeInputRef.current?.focus();
                }}
                className="py-2.5 px-5 bg-[#F47721] hover:bg-[#D95F12] text-white text-xs font-bold rounded-xl font-sans shadow-md transition-all text-center"
              >
                {lang === "gu" ? "નવો ગ્રાહક (Next Customer)" : "Next Customer (F2)"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Held Carts Modal */}
      {isHeldCartsModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsHeldCartsModalOpen(false)}
          title={lang === "gu" ? "હોલ્ડ કરેલા બિલો (Held Carts)" : "Held Carts"}
          titleGujarati="હોલ્ડ કરેલા બિલો"
          maxWidth="md"
        >
          <div className="space-y-3">
            {heldCarts.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-8">
                {lang === "gu" ? "કોઈ હોલ્ડ બિલ નથી" : "No held carts currently."}
              </p>
            ) : (
              heldCarts.map((h) => {
                const total = Math.round(
                  h.items.reduce(
                    (s, it) =>
                      s + it.unitPrice * it.quantity * (1 + (it.item.taxRate || 0) / 100),
                    0,
                  ),
                );
                return (
                  <div
                    key={h.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{h.id}</span>
                        <span className="text-slate-400 font-mono text-[11px]">{h.timestamp}</span>
                      </div>
                      <p className="text-slate-700 font-semibold mt-0.5">
                        {h.customerName} {h.customerPhone ? `(${h.customerPhone})` : ""}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {h.items.length} items • Total: ₹{total}
                      </p>
                    </div>

                    <button
                      onClick={() => handleRecallCart(h)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
                    >
                      {lang === "gu" ? "કાર્ટ રિકોલ કરો" : "Recall Cart"}
                    </button>
                  </div>
                );
              })
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsHeldCartsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                {lang === "gu" ? "બંધ કરો" : "Close"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Past Invoices / Reprint Modal */}
      {isRecentInvoicesModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsRecentInvoicesModalOpen(false)}
          title={lang === "gu" ? "આજના બિલો (Past Bills)" : "Today's Bills & History"}
          titleGujarati="બિલ લિસ્ટ"
          maxWidth="lg"
        >
          <div className="space-y-3">
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 text-xs">
              {recentInvoices.length === 0 ? (
                <p className="text-center text-slate-400 py-6">No bills recorded today.</p>
              ) : (
                recentInvoices.map((inv) => (
                  <div key={inv.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-slate-900">{inv.invoiceNumber}</span>
                      <p className="text-[11px] text-slate-500">
                        {inv.createdAt ? new Date(inv.createdAt).toLocaleTimeString("en-IN") : ""} • {inv.customerName || "Walk-in"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-900">
                        ₹{Number(inv.totalAmount).toFixed(2)}
                      </span>
                      <Link
                        href={`/sales/invoices/${inv.id}`}
                        target="_blank"
                        className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                      >
                        🖨️ View / Print
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsRecentInvoicesModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                {lang === "gu" ? "બંધ કરો" : "Close"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Day Close / Shift Summary Z-Report Modal */}
      {isDaySummaryModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsDaySummaryModalOpen(false)}
          title={lang === "gu" ? "ડે-ક્લોઝ કેશ સમરી (Shift Z-Report)" : "Day Close & Cash Register Summary"}
          titleGujarati="કેશ સમરી"
          maxWidth="sm"
        >
          <div className="space-y-3 text-xs font-mono">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <h3 className="font-bold text-sm text-slate-900">SHIFT CLOSE SUMMARY</h3>
                <p className="text-[10px] text-slate-500">Date: {new Date().toLocaleDateString("en-IN")}</p>
                <p className="text-[10px] text-slate-500">Counter 1 • Cashier: {user?.name || "Admin"}</p>
              </div>

              <div className="space-y-1.5 pt-1 text-slate-700">
                <div className="flex justify-between">
                  <span>Total Bills:</span>
                  <span className="font-bold text-slate-900">{daySummary.billCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cash Sales:</span>
                  <span className="font-bold text-emerald-800">₹{daySummary.cashTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>UPI / QR Sales:</span>
                  <span className="font-bold text-indigo-800">₹{daySummary.upiTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Card Sales:</span>
                  <span className="font-bold text-blue-800">₹{daySummary.cardTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Credit (Udhar):</span>
                  <span className="font-bold text-amber-800">₹{daySummary.creditTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm border-t border-slate-300 pt-1 text-slate-900">
                  <span>Total Day Sales:</span>
                  <span className="text-[#F47721]">₹{daySummary.grandSales.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl font-sans"
              >
                🖨️ Print Shift Slip
              </button>
              <button
                onClick={() => setIsDaySummaryModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl font-sans"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Quick Add Custom Item (Open Item) Modal */}
      {isQuickItemModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsQuickItemModalOpen(false)}
          title={lang === "gu" ? "નવી ઓપન આઇટમ ઉમેરો" : "Add Custom / Open Item"}
          titleGujarati="ઓપન આઇટમ"
          maxWidth="sm"
        >
          <form onSubmit={handleAddQuickItem} className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Item Name *</label>
              <input
                type="text"
                required
                value={quickItemForm.name}
                onChange={(e) => setQuickItemForm({ ...quickItemForm, name: e.target.value })}
                placeholder="e.g. Miscellaneous Item, Custom Repair"
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Rate (₹) *</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={quickItemForm.price}
                  onChange={(e) => setQuickItemForm({ ...quickItemForm, price: e.target.value })}
                  placeholder="0.00"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Qty</label>
                <input
                  type="number"
                  min="1"
                  value={quickItemForm.quantity}
                  onChange={(e) => setQuickItemForm({ ...quickItemForm, quantity: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-mono outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">GST %</label>
                <select
                  value={quickItemForm.taxRate}
                  onChange={(e) => setQuickItemForm({ ...quickItemForm, taxRate: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                >
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsQuickItemModalOpen(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs"
              >
                Add to Cart
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add New Customer Modal */}
      {isNewCustomerModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsNewCustomerModalOpen(false)}
          title={lang === "gu" ? "નવો ગ્રાહક બનાવો" : "Create New Customer"}
          titleGujarati="ગ્રાહક ઉમેરો"
          maxWidth="sm"
        >
          <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Customer / Business Name *</label>
              <input
                type="text"
                required
                value={newCustomerForm.name}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                placeholder="e.g. Ramesh Patel"
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Mobile</label>
                <input
                  type="tel"
                  value={newCustomerForm.mobile}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, mobile: e.target.value })}
                  placeholder="9876543210"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-mono outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">City</label>
                <input
                  type="text"
                  value={newCustomerForm.city}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, city: e.target.value })}
                  placeholder="Ahmedabad"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">GSTIN (Optional for B2B)</label>
              <input
                type="text"
                value={newCustomerForm.gstin}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, gstin: e.target.value })}
                placeholder="24AAAAA0000A1Z5"
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsNewCustomerModalOpen(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs"
              >
                Save & Select Customer
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
