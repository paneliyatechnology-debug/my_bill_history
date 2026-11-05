"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../../../context/auth-context";
import { apiClient, extractList } from "../../../../lib/api-client";
import { DocumentHeaderCard, DocumentBottomBar } from "@/components/document-studio";

interface Party {
  id: string;
  name: string;
  phone?: string;
  gstin?: string;
  stateCode?: string;
}

interface InvoiceItem {
  id: string;
  itemId?: string;
  item?: {
    id: string;
    name: string;
    sku?: string;
    hsnCode?: string;
    primaryUom?: { code: string };
  };
  quantity: number;
  unitPrice: number;
  discountRate?: number;
  taxRate: number;
  taxableAmount: number;
  totalAmount: number;
}

interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  grandTotal: number;
  balanceAmount: number;
  partyId: string;
  party?: Party;
  placeOfSupply?: string;
  items: InvoiceItem[];
  returns?: Array<{
    id: string;
    returnNumber: string;
    items: Array<{
      salesItemId: string;
      quantity: number;
    }>;
  }>;
}

interface Warehouse {
  id: string;
  name: string;
  isDefault?: boolean;
}

interface ReturnLineItem {
  salesItemId: string;
  itemId?: string;
  itemName: string;
  sku?: string;
  hsnCode?: string;
  uom: string;
  originalQty: number;
  previouslyReturnedQty: number;
  availableQty: number;
  returnQty: number;
  unitPrice: number;
  discountPercent: number;
  taxRate: number;
  disposition: "SELLABLE" | "DAMAGED" | "SCRAPPED";
}

const RETURN_REASONS = [
  "Damaged Goods",
  "Defective Product",
  "Wrong Product Delivered",
  "Excess Quantity",
  "Quality Issue",
  "Customer Rejection",
  "Expired Product",
  "Other",
];

function CreateSalesReturnForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang, currentCompany, tenantContext } = useAuth();

  const paramInvoiceId =
    searchParams?.get("invoiceId") ||
    searchParams?.get("id") ||
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("invoiceId") ||
        new URLSearchParams(window.location.search).get("id") ||
        ""
      : "");
  const paramPartyId =
    searchParams?.get("partyId") ||
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("partyId") || ""
      : "");

  // Form State
  const [returnNumber, setReturnNumber] = useState("");
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [returnReason, setReturnReason] = useState<string>("Damaged Goods");
  const [notes, setNotes] = useState<string>("");
  const [settlementMode, setSettlementMode] = useState<
    "CUSTOMER_CREDIT" | "ADJUST_OUTSTANDING" | "REFUND_CASH" | "REFUND_BANK"
  >("CUSTOMER_CREDIT");

  // Returned Line Items State
  const [lineItems, setLineItems] = useState<ReturnLineItem[]>([]);

  // Master Data
  const [parties, setParties] = useState<Party[]>([]);
  const [customerInvoices, setCustomerInvoices] = useState<SalesInvoice[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // UI States
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const [partySearchQuery, setPartySearchQuery] = useState("");
  const [isInvoiceDropdownOpen, setIsInvoiceDropdownOpen] = useState(false);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const partyDropdownRef = useRef<HTMLDivElement>(null);
  const invoiceDropdownRef = useRef<HTMLDivElement>(null);

  // Auto-generate return number prefix
  useEffect(() => {
    const yr = new Date(returnDate).getFullYear();
    (async () => {
      try {
        const res: any = await apiClient.get("/sales-returns", {
          docType: "SALES_RETURN",
          limit: 1,
        });
        const list = extractList<any>(res);
        const count = list.length + 1;
        setReturnNumber(`SR-${yr}-${String(count).padStart(4, "0")}`);
      } catch {
        setReturnNumber(`SR-${yr}-0001`);
      }
    })();
  }, [returnDate]);

  // Load Parties & Warehouses
  useEffect(() => {
    if (!tenantContext.companyId) return;
    (async () => {
      try {
        const [partyRes, whRes]: any = await Promise.all([
          apiClient.get("/masters/parties", {
            type: "CUSTOMER",
            availableForReturnOnly: true,
            limit: 500,
          }),
          apiClient.get("/tenants/warehouses", { limit: 50 }).catch(() => ({ data: [] })),
        ]);
        const pList = extractList<Party>(partyRes);
        setParties(pList);

        const whList = extractList<Warehouse>(whRes);
        setWarehouses(whList);
        const defWh = whList.find((w) => w.isDefault) || whList[0];
        if (defWh) setSelectedWarehouseId(defWh.id);

        if (paramPartyId) {
          const matchedParty = pList.find((p) => p.id === paramPartyId);
          if (matchedParty) setSelectedParty(matchedParty);
        }
      } catch (err: any) {
        console.error("Failed to load initial master data:", err);
      }
    })();
  }, [tenantContext.companyId, paramPartyId]);

  // Load customer invoices when party changes
  useEffect(() => {
    if (!selectedParty?.id) {
      setCustomerInvoices([]);
      return;
    }
    let cancelled = false;
    setIsLoadingInvoices(true);
    (async () => {
      try {
        const res: any = await apiClient.get("/sales/invoices", {
          partyId: selectedParty.id,
          availableForReturnOnly: true,
          limit: 100,
        });
        if (cancelled) return;
        const list = extractList<SalesInvoice>(res).filter(
          (inv) =>
            (inv as any).status !== "CANCELLED" &&
            (inv as any).status !== "DRAFT" &&
            !(inv as any).isFullyReturned,
        );
        setCustomerInvoices(list);

        // If invoiceId param is passed, auto-select it
        if (paramInvoiceId) {
          const target = list.find((i) => i.id === paramInvoiceId || i.invoiceNumber === paramInvoiceId);
          if (target) {
            handleSelectInvoice(target);
          }
        }
      } catch (err: any) {
        console.error("Failed to load customer invoices:", err);
      } finally {
        if (!cancelled) setIsLoadingInvoices(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedParty?.id, paramInvoiceId]);

  // If invoiceId is provided directly from URL but party is not yet selected
  useEffect(() => {
    if (paramInvoiceId && !selectedInvoice) {
      (async () => {
        try {
          const invRes: any = await apiClient
            .get<any>(`/sales/invoices/${paramInvoiceId}`)
            .catch(() => apiClient.get<any>(`/invoices/${paramInvoiceId}`));
          const inv: SalesInvoice = invRes?.data || invRes;
          if (inv && inv.id) {
            if (inv.party && !selectedParty) {
              setSelectedParty(inv.party);
            }
            handleSelectInvoice(inv);
          }
        } catch (err) {
          console.error("Could not fetch invoice by URL id:", err);
        }
      })();
    }
  }, [paramInvoiceId]);

  // Populate returnable items when an invoice is selected
  const handleSelectInvoice = useCallback((invoice: SalesInvoice) => {
    setSelectedInvoice(invoice);
    setIsInvoiceDropdownOpen(false);

    // Calculate previously returned quantities from invoice.returns
    const returnedMap = new Map<string, number>();
    (invoice.returns || []).forEach((ret) => {
      (ret.items || []).forEach((ri) => {
        if (ri.salesItemId) {
          const cur = returnedMap.get(ri.salesItemId) || 0;
          returnedMap.set(ri.salesItemId, cur + Number(ri.quantity || 0));
        }
      });
    });

    const lines: ReturnLineItem[] = (invoice.items || []).map((it) => {
      const origQty = Number(it.quantity || 0);
      const prevQty = returnedMap.get(it.id) || 0;
      const availQty = Math.max(0, origQty - prevQty);

      return {
        salesItemId: it.id,
        itemId: it.itemId || it.item?.id,
        itemName: it.item?.name || "Item",
        sku: it.item?.sku,
        hsnCode: it.item?.hsnCode,
        uom: it.item?.primaryUom?.code || "Unit",
        originalQty: origQty,
        previouslyReturnedQty: prevQty,
        availableQty: availQty,
        returnQty: availQty > 0 ? 0 : 0, // default to 0; user enters returned amount
        unitPrice: Number(it.unitPrice || 0),
        discountPercent: Number(it.discountRate || 0),
        taxRate: Number(it.taxRate || 0),
        disposition: "SELLABLE",
      };
    });

    setLineItems(lines);
  }, []);

  // Update line return quantity
  const handleQtyChange = (index: number, val: number) => {
    setLineItems((prev) => {
      const updated = [...prev];
      const target = updated[index];
      if (!target) return prev;
      const validQty = Math.min(Math.max(0, val), target.availableQty);
      target.returnQty = validQty;
      return updated;
    });
  };

  // Update line disposition
  const handleDispositionChange = (
    index: number,
    disposition: "SELLABLE" | "DAMAGED" | "SCRAPPED",
  ) => {
    setLineItems((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index].disposition = disposition;
      }
      return updated;
    });
  };

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(e.target as Node)) {
        setIsPartyDropdownOpen(false);
      }
      if (invoiceDropdownRef.current && !invoiceDropdownRef.current.contains(e.target as Node)) {
        setIsInvoiceDropdownOpen(false);
      }
    }
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Financial summary calculations
  const financials = useMemo(() => {
    let taxable = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    const isIntraState = selectedInvoice?.placeOfSupply
      ? selectedInvoice.placeOfSupply === (currentCompany?.stateCode || "24")
      : true;

    lineItems.forEach((line) => {
      if (line.returnQty <= 0) return;
      const base = line.returnQty * line.unitPrice;
      const disc = (base * line.discountPercent) / 100;
      const lineTaxable = Math.max(0, base - disc);
      taxable += lineTaxable;

      const lineTax = (lineTaxable * line.taxRate) / 100;
      if (isIntraState) {
        cgst += lineTax / 2;
        sgst += lineTax / 2;
      } else {
        igst += lineTax;
      }
    });

    const totalTax = cgst + sgst + igst;
    const rawTotal = taxable + totalTax;
    const grandTotal = Math.round(rawTotal * 100) / 100;
    const roundOff = grandTotal - rawTotal;

    const activeItemsCount = lineItems.filter((i) => i.returnQty > 0).length;
    const totalReturnedUnits = lineItems.reduce((acc, i) => acc + (i.returnQty || 0), 0);

    return {
      taxable,
      cgst,
      sgst,
      igst,
      totalTax,
      roundOff,
      grandTotal,
      activeItemsCount,
      totalReturnedUnits,
    };
  }, [lineItems, selectedInvoice, currentCompany?.stateCode]);

  // Submit Handler
  const handleSaveSalesReturn = async () => {
    setError(null);

    if (!selectedParty) {
      setError(lang === "gu" ? "કૃપા કરીને ગ્રાહક પસંદ કરો." : "Please select a customer.");
      return;
    }
    if (!selectedInvoice) {
      setError(
        lang === "gu"
          ? "કૃપા કરીને ઓરિજિનલ સેલ્સ ઇનવોઇસ પસંદ કરો."
          : "Please select the original Sales Invoice.",
      );
      return;
    }
    if (!selectedWarehouseId) {
      setError(
        lang === "gu"
          ? "કૃપા કરીને માલ પરત લેવા માટે વેરહાઉસ પસંદ કરો."
          : "Please select a warehouse to receive returned inventory.",
      );
      return;
    }

    const itemsToSubmit = lineItems
      .filter((i) => i.returnQty > 0)
      .map((i) => ({
        salesItemId: i.salesItemId,
        quantity: i.returnQty,
        disposition: i.disposition,
        reason: returnReason,
      }));

    if (itemsToSubmit.length === 0) {
      setError(
        lang === "gu"
          ? "કૃપા કરીને ઓછામાં ઓછી એક આઇટમ માટે પરત જથ્થો (Return Qty > 0) દાખલ કરો."
          : "Please enter a valid return quantity (> 0) for at least one item.",
      );
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        salesInvoiceId: selectedInvoice.id,
        returnNumber: returnNumber.trim() || undefined,
        returnDate,
        docType: "SALES_RETURN",
        warehouseId: selectedWarehouseId,
        restoreStock: true,
        settlementMode,
        reason: returnReason,
        notes: notes || undefined,
        items: itemsToSubmit,
      };

      const res: any = await apiClient.post("/sales-returns", payload);
      const targetId = res?.id || res?.data?.id;

      if (targetId) {
        router.push(`/sales/returns/${targetId}`);
      } else {
        router.push("/sales/returns");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to create sales return.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredParties = useMemo(() => {
    if (!partySearchQuery.trim()) return parties;
    const q = partySearchQuery.toLowerCase();
    return parties.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.phone && p.phone.includes(q)) ||
        (p.gstin && p.gstin.toLowerCase().includes(q)),
    );
  }, [parties, partySearchQuery]);

  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4 font-sans min-w-0">
      {/* 1. DOCUMENT HEADER */}
      <DocumentHeaderCard
        title={lang === "gu" ? "વેચાણ પરત નોંધ (Sales Return)" : "Create Sales Return"}
        subtitle={
          lang === "gu"
            ? "ગ્રાહક પાસેથી આવેલ ભૌતિક માલ વાપસી, સ્ટોક રિટર્ન અને ડિસ્પોઝિશન"
            : "Record physical return of goods, select warehouse, inspect disposition, and update inventory"
        }
        status="Draft"
        onSave={handleSaveSalesReturn}
        isSaving={isSaving}
        saveButtonLabel={lang === "gu" ? "વેચાણ પરત સાચવો" : "Save Sales Return"}
      />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 flex items-center justify-between shadow-2xs">
          <span className="font-medium">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-500 hover:text-rose-700 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. TOP FORM CONTROLS: Customer, Invoice, Warehouse, Date */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Customer & Invoice Selection */}
        <div className="lg:col-span-2 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer Picker */}
            <div className="relative" ref={partyDropdownRef}>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                Customer (ગ્રાહક) <span className="text-rose-500">*</span>
              </label>
              {selectedParty ? (
                <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/50 px-3.5 py-2.5 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">{selectedParty.name}</span>
                    <span className="text-[11px] text-slate-500">
                      {selectedParty.phone || "No phone"} {selectedParty.gstin ? `· ${selectedParty.gstin}` : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedParty(null);
                      setSelectedInvoice(null);
                      setLineItems([]);
                    }}
                    className="text-slate-400 hover:text-slate-600 font-bold px-1.5 py-0.5 rounded"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => setIsPartyDropdownOpen(!isPartyDropdownOpen)}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-400 cursor-pointer hover:border-slate-300"
                >
                  <span>Select customer...</span>
                  <svg className="w-4 h-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              )}

              {isPartyDropdownOpen && (
                <div className="absolute left-0 right-0 z-40 mt-1 rounded-xl border border-slate-200 bg-white shadow-xl py-1 text-xs">
                  <div className="p-2 border-b border-slate-100">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Search customer by name or phone..."
                      value={partySearchQuery}
                      onChange={(e) => setPartySearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {filteredParties.length === 0 ? (
                      <div className="p-4 text-center text-slate-500">
                        <p className="font-semibold text-slate-700">No return-eligible customers found</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Only customers with active, unreturned sales invoices are shown here.
                        </p>
                      </div>
                    ) : (
                      filteredParties.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedParty(p);
                            setIsPartyDropdownOpen(false);
                            setPartySearchQuery("");
                          }}
                          className="flex items-center justify-between px-3.5 py-2 hover:bg-slate-50 cursor-pointer"
                        >
                          <div>
                            <p className="font-semibold text-slate-800">{p.name}</p>
                            <p className="text-[11px] text-slate-400">
                              {p.phone || "No phone"}
                              {(p as any).returnableInvoicesCount ? ` • ${(p as any).returnableInvoicesCount} invoice(s) eligible` : ""}
                            </p>
                          </div>
                          {p.gstin && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                              {p.gstin}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sales Invoice Picker */}
            <div className="relative" ref={invoiceDropdownRef}>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                Original Sales Invoice <span className="text-rose-500">*</span>
              </label>
              {selectedInvoice ? (
                <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/50 px-3.5 py-2.5 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">#{selectedInvoice.invoiceNumber}</span>
                    <span className="text-[11px] text-slate-500">
                      Date: {new Date(selectedInvoice.invoiceDate).toLocaleDateString("en-GB")} · Total: ₹{Number(selectedInvoice.grandTotal || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInvoice(null);
                      setLineItems([]);
                    }}
                    className="text-slate-400 hover:text-slate-600 font-bold px-1.5 py-0.5 rounded"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => {
                    if (!selectedParty) {
                      setError("Please select a customer first to view invoices.");
                      return;
                    }
                    setIsInvoiceDropdownOpen(!isInvoiceDropdownOpen);
                  }}
                  className={`flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs cursor-pointer ${
                    !selectedParty ? "opacity-60 bg-slate-50 cursor-not-allowed text-slate-400" : "hover:border-slate-300 text-slate-400"
                  }`}
                >
                  <span>
                    {isLoadingInvoices
                      ? "Loading invoices..."
                      : selectedParty
                      ? "Select sales invoice to return from..."
                      : "Select customer first"}
                  </span>
                  <svg className="w-4 h-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              )}

              {isInvoiceDropdownOpen && (
                <div className="absolute left-0 right-0 z-40 mt-1 rounded-xl border border-slate-200 bg-white shadow-xl py-1 text-xs max-h-60 overflow-y-auto">
                  {customerInvoices.length === 0 ? (
                    <div className="p-4 text-center text-slate-400">
                      No eligible issued invoices found for this customer.
                    </div>
                  ) : (
                    customerInvoices.map((inv) => (
                      <div
                        key={inv.id}
                        onClick={() => handleSelectInvoice(inv)}
                        className="flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-none"
                      >
                        <div>
                          <p className="font-bold text-slate-900">#{inv.invoiceNumber}</p>
                          <p className="text-[11px] text-slate-500">
                            {new Date(inv.invoiceDate).toLocaleDateString("en-GB")} · {inv.items?.length || 0} items
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900 tabular-nums">
                            ₹{Number(inv.grandTotal || 0).toLocaleString("en-IN")}
                          </p>
                          <p className="text-[10px] text-amber-700 font-medium">
                            Balance: ₹{Number(inv.balanceAmount || 0).toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Warehouse and Reason Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                Warehouse / Godown (ગોડાઉન) <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none h-10"
              >
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} {wh.isDefault ? "(Default)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                Return Reason (પરત આવવાનું કારણ)
              </label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none h-10"
              >
                {RETURN_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Right Card: Return Number, Date & Settlement */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs space-y-3.5">
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1">
              Sales Return Number
            </label>
            <input
              type="text"
              value={returnNumber}
              onChange={(e) => setReturnNumber(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none h-10 font-mono"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1">
              Return Date
            </label>
            <input
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none h-10"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1">
              Settlement Mode
            </label>
            <select
              value={settlementMode}
              onChange={(e) => setSettlementMode(e.target.value as any)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none h-10"
            >
              <option value="CUSTOMER_CREDIT">Customer Credit Balance (Hold on Account)</option>
              <option value="ADJUST_OUTSTANDING">Adjust Against Invoice Outstanding</option>
              <option value="REFUND_CASH">Immediate Cash Refund</option>
              <option value="REFUND_BANK">Immediate Bank Refund</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. RETURN ITEMS & DISPOSITION TABLE */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-[13px] font-bold text-slate-900">
              Return Line Items & Disposition (પરત માલ અને સ્ટોક વિગત)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Enter return quantity and set physical disposition for each item.
            </p>
          </div>
          {lineItems.length > 0 && (
            <span className="text-xs font-bold text-blue-700 bg-blue-100/70 border border-blue-200 px-2.5 py-1 rounded-full">
              {lineItems.length} Items Available
            </span>
          )}
        </div>

        {lineItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            {selectedInvoice
              ? "No items found in selected invoice."
              : "Select a Sales Invoice above to load eligible return items."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs border-collapse">
              <thead className="bg-[#F8FAF9] border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Item Description</th>
                  <th className="px-4 py-3 text-center">Invoiced Qty</th>
                  <th className="px-4 py-3 text-center">Returned Qty</th>
                  <th className="px-4 py-3 text-center">Available</th>
                  <th className="px-4 py-3 text-center w-36">
                    Return Qty <span className="text-rose-500">*</span>
                  </th>
                  <th className="px-4 py-3 text-center w-40">
                    Disposition <span className="text-rose-500">*</span>
                  </th>
                  <th className="px-4 py-3 text-right">Rate (₹)</th>
                  <th className="px-4 py-3 text-center">Tax %</th>
                  <th className="px-4 py-3 text-right">Taxable (₹)</th>
                  <th className="px-4 py-3 text-right">Line Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lineItems.map((line, idx) => {
                  const base = line.returnQty * line.unitPrice;
                  const disc = (base * line.discountPercent) / 100;
                  const lineTaxable = Math.max(0, base - disc);
                  const lineTax = (lineTaxable * line.taxRate) / 100;
                  const lineTotal = lineTaxable + lineTax;
                  const isEligible = line.availableQty > 0;

                  return (
                    <tr
                      key={line.salesItemId}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        line.returnQty > 0 ? "bg-blue-50/20" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900 block">{line.itemName}</span>
                        <span className="text-[10px] text-slate-400">
                          {line.sku ? `SKU: ${line.sku} ` : ""}
                          {line.hsnCode ? `· HSN: ${line.hsnCode}` : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-slate-700 tabular-nums">
                        {line.originalQty} {line.uom}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-amber-700 tabular-nums">
                        {line.previouslyReturnedQty} {line.uom}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-700 tabular-nums">
                        {line.availableQty} {line.uom}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max={line.availableQty}
                          step="0.0001"
                          disabled={!isEligible}
                          value={line.returnQty || ""}
                          onChange={(e) => handleQtyChange(idx, parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-24 text-center rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none disabled:bg-slate-100 disabled:opacity-50"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <select
                          value={line.disposition}
                          disabled={line.returnQty <= 0}
                          onChange={(e) => handleDispositionChange(idx, e.target.value as any)}
                          className={`rounded-lg border px-2 py-1.5 text-[11px] font-bold focus:outline-none ${
                            line.disposition === "SELLABLE"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : line.disposition === "DAMAGED"
                              ? "bg-amber-50 text-amber-800 border-amber-300"
                              : "bg-rose-50 text-rose-800 border-rose-300"
                          } disabled:opacity-40`}
                        >
                          <option value="SELLABLE">Sellable (Restock)</option>
                          <option value="DAMAGED">Damaged (No Restock)</option>
                          <option value="SCRAPPED">Scrapped (Write-off)</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800 tabular-nums">
                        ₹{line.unitPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600 font-medium">
                        {line.taxRate}%
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800 tabular-nums">
                        ₹{lineTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 tabular-nums">
                        ₹{lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. FINANCIAL SUMMARY & NOTES CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Notes */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs space-y-2">
          <label className="block text-[12px] font-semibold text-slate-700">
            Internal Notes / Instructions
          </label>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any internal inspection notes, customer communication, or transport details..."
            className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Calculation Summary */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs space-y-2.5">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Return Calculation Breakdown
          </h4>

          <div className="flex items-center justify-between text-xs py-1 text-slate-600">
            <span>Taxable Amount</span>
            <span className="font-semibold text-slate-900 tabular-nums">
              ₹{financials.taxable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {financials.cgst > 0 && (
            <div className="flex items-center justify-between text-xs py-1 text-slate-600">
              <span>CGST</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                ₹{financials.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {financials.sgst > 0 && (
            <div className="flex items-center justify-between text-xs py-1 text-slate-600">
              <span>SGST</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                ₹{financials.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {financials.igst > 0 && (
            <div className="flex items-center justify-between text-xs py-1 text-slate-600">
              <span>IGST</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                ₹{financials.igst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-200">
            <span className="font-bold text-slate-900">Total Return Value</span>
            <span className="font-extrabold text-blue-700 text-base tabular-nums">
              ₹{financials.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 text-[11px] text-slate-500 mt-2">
            Stock will be updated for {lineItems.filter((i) => i.returnQty > 0 && i.disposition === "SELLABLE").length} items marked as{" "}
            <span className="font-bold text-emerald-700">Sellable</span>. Damaged or scrapped items will not be returned to sellable stock.
          </div>
        </div>
      </div>

      {/* 5. BOTTOM BAR */}
      <DocumentBottomBar
        totalItems={financials.activeItemsCount}
        totalAmount={financials.grandTotal}
        onSave={handleSaveSalesReturn}
        isSaving={isSaving}
        saveButtonLabel={lang === "gu" ? "વેચાણ પરત સાચવો" : "Save Sales Return"}
        backHref="/sales/returns"
      />
    </div>
  );
}

export default function CreateSalesReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F4F5F7] p-8 text-center text-slate-500 text-sm">
          Loading sales return form...
        </div>
      }
    >
      <CreateSalesReturnForm />
    </Suspense>
  );
}
