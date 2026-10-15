"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";
import { Modal } from "../../../components/ui/modal";

interface CatalogItem {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  retailPrice: number;
  taxRate: number;
}

interface CartItem {
  item: CatalogItem;
  quantity: number;
}

export default function PosTerminalPage() {
  const { lang, tenantContext } = useAuth();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Offline State
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Payment State
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "CARD">(
    "CASH",
  );
  const [tenderedAmount, setTenderedAmount] = useState<number | "">("");

  // Receipt Modal
  const [lastReceipt, setLastReceipt] = useState<any | null>(null);

  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // Load queued offline orders
    try {
      const saved = localStorage.getItem("billing_pos_offline_queue");
      if (saved) {
        setOfflineQueue(JSON.parse(saved));
      }
    } catch {
      setOfflineQueue([]);
    }

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const res: any = await apiClient.get("/items");
      const list = extractList<CatalogItem>(res);
      setItems(list);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchItems();
    }
  }, [tenantContext.companyId, fetchItems]);

  const addToCart = (item: CatalogItem) => {
    const existing = cart.find((c) => c.item.id === item.id);
    if (existing) {
      setCart(
        cart.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c,
        ),
      );
    } else {
      setCart([...cart, { item, quantity: 1 }]);
    }
  };

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

  const clearCart = () => {
    setCart([]);
    setTenderedAmount("");
  };

  // Computations
  let subtotal = 0;
  let taxTotal = 0;
  cart.forEach((c) => {
    const lineBase = c.item.retailPrice * c.quantity;
    const lineTax = (lineBase * c.item.taxRate) / 100;
    subtotal += lineBase;
    taxTotal += lineTax;
  });

  const grandTotal = Math.round(subtotal + taxTotal);
  const changeDue =
    typeof tenderedAmount === "number" && tenderedAmount >= grandTotal
      ? tenderedAmount - grandTotal
      : 0;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);
    setError(null);

    const clientOfflineUuid = `pos_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const offlineBillNumber = `OFFLINE-${Date.now().toString().slice(-4)}`;

    const orderPayload = {
      clientOfflineUuid,
      offlineBillNumber,
      paymentMode,
      receivedAmount:
        typeof tenderedAmount === "number" ? tenderedAmount : grandTotal,
      items: cart.map((c) => ({
        itemId: c.item.id,
        quantity: c.quantity,
        unitPrice: c.item.retailPrice,
        taxRate: c.item.taxRate,
      })),
    };

    // If device is offline, store in local offline queue
    if (!navigator.onLine) {
      const updatedQueue = [...offlineQueue, orderPayload];
      setOfflineQueue(updatedQueue);
      localStorage.setItem("billing_pos_offline_queue", JSON.stringify(updatedQueue));

      setLastReceipt({
        invoiceNumber: offlineBillNumber,
        grandTotal,
        paymentMode,
        changeDue,
        items: [...cart],
        date: new Date().toLocaleTimeString("en-IN"),
        isOffline: true,
      });

      clearCart();
      setIsCheckingOut(false);
      return;
    }

    try {
      const res: any = await apiClient.post("/invoices/pos-checkout", orderPayload);

      setLastReceipt({
        invoiceNumber: res?.invoiceNumber || "—",
        grandTotal,
        paymentMode,
        changeDue,
        items: [...cart],
        date: new Date().toLocaleTimeString("en-IN"),
      });

      clearCart();
    } catch (err: any) {
      // If network failed mid-request, save safely to offline queue
      if (!navigator.onLine || err.message?.includes("Failed to fetch") || err.message?.includes("NetworkError")) {
        const updatedQueue = [...offlineQueue, orderPayload];
        setOfflineQueue(updatedQueue);
        localStorage.setItem("billing_pos_offline_queue", JSON.stringify(updatedQueue));

        setLastReceipt({
          invoiceNumber: offlineBillNumber,
          grandTotal,
          paymentMode,
          changeDue,
          items: [...cart],
          date: new Date().toLocaleTimeString("en-IN"),
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

      // Keep only unsynced or failed orders in the queue
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
        localStorage.setItem(
          "billing_pos_offline_queue",
          JSON.stringify(remainingQueue),
        );
        setError(
          lang === "gu"
            ? `${syncedSet.size} બિલો સિંક થયા. ${remainingQueue.length} બિલોમાં ક્ષતિ હોવાથી કતારમાં જળવાઈ રહ્યા.`
            : `${syncedSet.size} orders synced. ${remainingQueue.length} order(s) failed and remain recoverable in queue.`,
        );
      } else {
        localStorage.removeItem("billing_pos_offline_queue");
        setSyncStatus(
          lang === "gu"
            ? `તમામ ${syncedSet.size} ઑફલાઇન બિલો સફળતાપૂર્વક સર્વર સાથે સિંક થઈ ગયા!`
            : `All ${syncedSet.size} offline bill(s) synchronized successfully!`,
        );
      }
    } catch (err: any) {
      setError(err.message || "Offline sync failed.");
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredItems = items.filter((it) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      it.name.toLowerCase().includes(term) ||
      (it.barcode && it.barcode.toLowerCase().includes(term)) ||
      (it.sku && it.sku.toLowerCase().includes(term))
    );
  });

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col lg:flex-row gap-6">
      {/* Left Column: Fast Item Grid */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm p-4 overflow-hidden">
        {/* Offline Status & Sync Banner */}
        <div className="mb-3 flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-rose-500"
                }`}
            />
            <span className="font-semibold text-slate-700">
              {isOnline
                ? lang === "gu"
                  ? "ઓનલાઇન કનેક્ટેડ (Online)"
                  : "Online Connected"
                : lang === "gu"
                  ? "ઓફલાઇન મોડ (સ્થાનિક સ્ટોરેજ)"
                  : "Offline Mode (Local Storage)"}
            </span>
          </div>

          {offlineQueue.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-amber-800 font-mono font-medium">
                {offlineQueue.length}{" "}
                {lang === "gu" ? "બિલ સિંક બાકી" : "queued"}
              </span>
              <button
                onClick={handleSyncOffline}
                disabled={isSyncing || !isOnline}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-bold rounded-lg text-[11px] shadow-sm flex items-center gap-1"
              >
                {isSyncing
                  ? "..."
                  : "🔄 " + (lang === "gu" ? "હવે સિંક કરો" : "Sync Now")}
              </button>
            </div>
          )}
        </div>

        {syncStatus && (
          <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex justify-between items-center">
            <span>✓ {syncStatus}</span>
            <button
              onClick={() => setSyncStatus(null)}
              className="text-emerald-600 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Search / Barcode Scanner Input */}
        <div className="mb-4">
          <div className="relative">
            <svg
              className="w-5 h-5 absolute left-3.5 top-3 text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={lang === "gu" ? "બારકોડ સ્કેન કરો અથવા વસ્તુ શોધો (F2)..." : "Scan Barcode or Search Products (F2)..."}
              autoFocus
              className="w-full pl-11 pr-4 py-2.5 text-sm bg-slate-50 border border-border rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium transition-all"
            />
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="py-20 text-center text-muted text-xs">
              <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
              <p>{lang === "gu" ? "માલસામાન લોડ થઈ રહ્યો છે..." : "Loading catalog..."}</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-20 text-center text-muted text-xs">
              <p className="font-semibold text-slate-700 mb-1">{lang === "gu" ? "કોઈ માલ મળ્યો નથી" : "No items found matching search."}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="p-3 bg-white hover:bg-saffron-very-light border border-border hover:border-primary/50 hover:shadow-subtle rounded-xl text-left transition-all active:scale-[0.98] flex flex-col justify-between h-28 group"
                >
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs line-clamp-2 group-hover:text-primary transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-[10px] text-muted font-mono mt-0.5">
                      {item.barcode || item.sku || "PROD"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      ₹{Number(item.retailPrice).toFixed(2)}
                    </span>
                    <span className="text-[10px] bg-saffron-light text-primary font-bold px-1.5 py-0.5 rounded">
                      +{item.taxRate}%
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Checkout Cart & Tender */}
      <div className="w-full lg:w-96 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">
              Current Cart
            </span>
            <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">
              {cart.reduce((s, c) => s + c.quantity, 0)}
            </span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2">
          {cart.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-xs">
              <div className="text-3xl mb-2">🛒</div>
              Cart is empty. Select items to scan.
            </div>
          ) : (
            cart.map((c) => (
              <div
                key={c.item.id}
                className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs"
              >
                <div className="flex-1 mr-2">
                  <p className="font-semibold text-slate-900 truncate">
                    {c.item.name}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    ₹{c.item.retailPrice} × {c.quantity}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-slate-300 rounded bg-white">
                    <button
                      onClick={() => updateQuantity(c.item.id, -1)}
                      className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 font-bold"
                    >
                      -
                    </button>
                    <span className="px-2 font-mono font-bold text-slate-800">
                      {c.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(c.item.id, 1)}
                      className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 font-bold"
                    >
                      +
                    </button>
                  </div>
                  <span className="font-mono font-bold text-slate-900 w-16 text-right">
                    ₹{(c.item.retailPrice * c.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Error notice */}
        {error && (
          <div className="p-2 mb-2 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-700">
            {error}
          </div>
        )}

        {/* Totals & Tender */}
        <div className="border-t border-slate-200 pt-3 space-y-3">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>GST Tax:</span>
              <span className="font-mono">₹{taxTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-base text-slate-900 pt-2 border-t border-slate-100">
              <span className="text-slate-800">{lang === "gu" ? "કુલ રકમ (Total):" : "Grand Total:"}</span>
              <span className="font-mono text-primary text-lg">
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Mode Selector */}
          <div className="grid grid-cols-3 gap-2">
            {(["CASH", "UPI", "CARD"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setPaymentMode(mode)}
                className={`py-2 text-xs font-bold rounded-xl border transition-all ${paymentMode === mode
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-slate-50 text-slate-700 border-border hover:bg-slate-100"
                  }`}
              >
                {mode === "CASH" ? (lang === "gu" ? "💵 રોકડ" : "💵 CASH") : mode === "UPI" ? "📱 UPI" : "💳 CARD"}
              </button>
            ))}
          </div>

          {/* Cash Tender Input with Quick Value Shortcuts */}
          {paymentMode === "CASH" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={tenderedAmount}
                  onChange={(e) =>
                    setTenderedAmount(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  placeholder={lang === "gu" ? "ગ્રાહકે આપેલી રોકડ (₹)..." : "Cash Tendered (₹)..."}
                  className="flex-1 text-xs p-2.5 bg-slate-50 border border-border rounded-xl font-mono font-bold focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900"
                />
                {changeDue > 0 && (
                  <div className="text-right text-xs bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    <span className="text-[10px] text-emerald-600 block font-semibold">
                      {lang === "gu" ? "પાછા આપવા:" : "Change:"}
                    </span>
                    <span className="font-mono font-bold text-emerald-800">
                      ₹{changeDue.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
              {/* Quick Cash Buttons */}
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {[grandTotal, 100, 200, 500].map((amt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setTenderedAmount(amt)}
                    className="px-2 py-1 bg-slate-100 hover:bg-saffron-light hover:text-primary text-slate-700 font-mono text-[11px] font-semibold rounded-lg border border-border transition-all"
                  >
                    {idx === 0 ? "Exact" : `₹${amt}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Complete Sale Button */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isCheckingOut}
            className="w-full py-3 bg-primary hover:bg-primary-hover active:bg-primary-pressed disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-card hover:shadow-hover transition-all flex items-center justify-center gap-2"
          >
            {isCheckingOut ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : null}
            <span>
              {isCheckingOut ? "Processing..." : `${lang === "gu" ? "બિલ પૂરું કરો" : "Checkout"} ₹${grandTotal}`}
            </span>
          </button>
        </div>
      </div>

      {/* POS Receipt Modal */}
      {lastReceipt && (
        <Modal
          isOpen={true}
          onClose={() => setLastReceipt(null)}
          title="POS Counter Receipt"
          titleGujarati="રોકડ બિલ પહોંચ (POS Receipt)"
          maxWidth="sm"
        >
          <div className="space-y-4 text-center font-mono">
            <div className="border-b border-dashed border-slate-300 pb-3">
              <div className="w-10 h-10 rounded-full bg-saffron-light text-primary flex items-center justify-center mx-auto mb-1 text-lg font-bold">
                🧾
              </div>
              <h3 className="font-bold text-base text-slate-900">
                MyBill History POS
              </h3>
              <p className="text-xs text-muted">{lastReceipt.date}</p>
              <p className="text-xs font-bold text-primary mt-1">
                {lastReceipt.invoiceNumber}
              </p>
              {lastReceipt.isOffline && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-2 mt-2 font-sans text-left space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900">
                    <span>⚠️</span>
                    <span>PROVISIONAL ESTIMATE / કાચો અંદાજ</span>
                  </div>
                  <p className="text-[10px] text-amber-800 leading-tight">
                    {lang === "gu"
                      ? "આ માત્ર કાચો અંદાજ છે. સર્વર સાથે સિંક ન થાય ત્યાં સુધી જીએસટી હેઠળ કાયદેસર ટેક્સ ઇનવોઇસ નથી."
                      : "Pending server sync. Not an official Tax Invoice under GST law until server acceptance."}
                  </p>
                </div>
              )}
            </div>

            <div className="text-left text-xs space-y-1.5 max-h-48 overflow-y-auto">
              {lastReceipt.items?.map((it: CartItem, i: number) => (
                <div key={i} className="flex justify-between items-center py-0.5 border-b border-slate-100">
                  <span className="truncate pr-2">
                    {it.item.name} × {it.quantity}
                  </span>
                  <span className="font-bold text-slate-900">
                    ₹{(it.item.retailPrice * it.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-slate-300 pt-3 text-sm font-bold flex justify-between">
              <span>Paid ({lastReceipt.paymentMode}):</span>
              <span className="text-primary font-bold">
                ₹{lastReceipt.grandTotal.toFixed(2)}
              </span>
            </div>

            {lastReceipt.changeDue > 0 && (
              <div className="text-xs flex justify-between text-muted">
                <span>Change Returned:</span>
                <span className="font-bold text-emerald-700">₹{lastReceipt.changeDue.toFixed(2)}</span>
              </div>
            )}

            <div className="pt-4 flex gap-2">
              <button
                onClick={() => window.print()}
                className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl font-sans shadow-sm flex items-center justify-center gap-1.5 transition-all"
              >
                <span>🖨️ Print</span>
              </button>
              <button
                onClick={() => setLastReceipt(null)}
                className="flex-1 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-pressed text-white text-xs font-bold rounded-xl font-sans shadow-card transition-all"
              >
                {lang === "gu" ? "નવો ગ્રાહક (Next Customer)" : "Next Customer"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
