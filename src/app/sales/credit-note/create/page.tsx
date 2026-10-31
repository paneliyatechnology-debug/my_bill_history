"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "../../../../context/auth-context";
import { apiClient, extractList } from "../../../../lib/api-client";
import { AddItemsModal, CatalogItem } from "../../../../components/invoice/add-items-modal";
import { SignatureModal } from "../../../../components/invoice/signature-modal";

interface Party {
  id: string;
  name: string;
  phone?: string;
  gstin?: string;
  stateCode?: string;
  type?: string;
  balance?: number;
  billingAddress?: {
    line1?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  shippingAddress?: {
    line1?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
}

interface SalesInvoiceOption {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  grandTotal: number;
  balanceAmount: number;
  items: Array<{
    id: string;
    itemId: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    taxableAmount: number;
    totalAmount: number;
    item?: {
      id: string;
      name: string;
      sku?: string;
      hsnCode?: string;
    };
  }>;
}

interface ReturnLineItem {
  id: string;
  salesItemId?: string;
  itemId?: string;
  name: string;
  description: string;
  hsn: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountValue: number;
  discountType: "PERCENT" | "FIXED";
  taxRate: number;
}

const GST_RATES = [
  { label: "0%", value: 0 },
  { label: "5%", value: 5 },
  { label: "12%", value: 12 },
  { label: "18%", value: 18 },
  { label: "28%", value: 28 },
  { label: "Exempt", value: 0 },
];

function formatInr(val: number | string): string {
  const num = Number(val) || 0;
  return (
    "₹ " +
    num.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  );
}

function formatDisplayDate(val?: string): string {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function CreateCreditNotePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDebitNote = pathname.includes("/debit-note");
  const editId = searchParams.get("edit");
  const duplicateId = searchParams.get("duplicate");
  const invoiceParamId = searchParams.get("invoiceId");
  const { lang, tenantContext } = useAuth();
  const docLabel = isDebitNote ? "Debit Note" : "Credit Note";

  // Mode: Edit vs Preview
  const [activeMode, setActiveMode] = useState<"edit" | "preview">("edit");

  // Party State
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const [partySearchQuery, setPartySearchQuery] = useState("");
  const partyDropdownRef = useRef<HTMLDivElement>(null);
  const partySearchInputRef = useRef<HTMLInputElement>(null);

  // Return Document Details
  const [returnNumber, setReturnNumber] = useState("1");
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Link to Sales Invoice
  const [invoices, setInvoices] = useState<SalesInvoiceOption[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoiceOption | null>(null);
  const [isInvoiceDropdownOpen, setIsInvoiceDropdownOpen] = useState(false);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const invoiceDropdownRef = useRef<HTMLDivElement>(null);

  // Items State
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [lineItems, setLineItems] = useState<ReturnLineItem[]>([]);
  const [isAddItemsModalOpen, setIsAddItemsModalOpen] = useState(false);

  // Bottom Fields: Notes, Terms, Additional Charges, Discount
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [showTerms, setShowTerms] = useState(false);
  const [terms, setTerms] = useState("");

  const [showAdditionalCharges, setShowAdditionalCharges] = useState(false);
  const [additionalCharges, setAdditionalCharges] = useState<number>(0);
  const [additionalChargeLabel, setAdditionalChargeLabel] = useState("Shipping & Handling");

  const [showDiscount, setShowDiscount] = useState(false);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  const [autoRoundOff, setAutoRoundOff] = useState(true);

  // Refund / Payment Received
  const [amountReceived, setAmountReceived] = useState<string>("0");
  const [paymentMode, setPaymentMode] = useState<string>("Cash");
  const [isMarkAsFullyPaid, setIsMarkAsFullyPaid] = useState(false);

  // Signature
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  // Create Customer Modal
  const [isCreatePartyModalOpen, setIsCreatePartyModalOpen] = useState(false);
  const [newPartyName, setNewPartyName] = useState("");
  const [newPartyPhone, setNewPartyPhone] = useState("");
  const [newPartyGstin, setNewPartyGstin] = useState("");
  const [newPartyAddress, setNewPartyAddress] = useState("");
  const [isCreatingParty, setIsCreatingParty] = useState(false);

  // Saving states
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial Load: Parties, Catalog Items, Next Return Number
  useEffect(() => {
    if (!tenantContext.companyId) return;
    let cancelled = false;
    (async () => {
      try {
        const [partyRes, itemRes, returnRes]: any = await Promise.all([
          apiClient.get("/parties", { limit: 200 }),
          apiClient.get("/items", { limit: 300 }),
          apiClient.get("/sales-returns", { limit: 1 }),
        ]);
        if (cancelled) return;

        const partyList = extractList<Party>(partyRes).filter(
          (p) => !p.type || p.type === "CUSTOMER" || p.type === "BOTH",
        );
        setParties(partyList);

        const items = extractList<any>(itemRes).map((i) => ({
          id: i.id,
          name: i.name,
          hsnCode: i.hsnCode,
          taxRate: Number(i.taxRate) || 0,
          retailPrice: Number(i.salesPrice || i.retailPrice || 0),
          purchasePrice: Number(i.purchasePrice || 0),
          stockQuantity: Number(i.currentStock || i.stockQuantity || 0),
          category: i.category?.name || "General",
          unit: i.unit?.code || "PCS",
        }));
        setCatalogItems(items);

        if (returnRes?.total !== undefined) {
          setReturnNumber(String(returnRes.total + 1));
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to load reference data.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantContext.companyId]);

  // Prefill when editing, duplicating, or linking specific invoice
  useEffect(() => {
    const idToFetch = editId || duplicateId;
    if (!idToFetch || !tenantContext.companyId) return;
    let cancelled = false;

    (async () => {
      try {
        const ret: any = await apiClient.get(`/sales-returns/${idToFetch}`);
        if (cancelled || !ret) return;

        if (editId) {
          setReturnNumber(ret.returnNumber || "1");
          if (ret.returnDate) {
            setReturnDate(new Date(ret.returnDate).toISOString().slice(0, 10));
          }
        }

        if (ret.party) {
          setSelectedParty({
            id: ret.party.id,
            name: ret.party.name,
            phone: ret.party.phone,
            gstin: ret.party.gstin,
            billingAddress: ret.party.billingAddress,
            stateCode: ret.party.stateCode,
          });
        }

        if (ret.salesInvoice) {
          setSelectedInvoice({
            id: ret.salesInvoice.id,
            invoiceNumber: ret.salesInvoice.invoiceNumber,
            invoiceDate: ret.salesInvoice.invoiceDate,
            grandTotal: Number(ret.salesInvoice.grandTotal) || 0,
            balanceAmount: Number(ret.salesInvoice.balanceAmount) || 0,
            items: (ret.salesInvoice.items || []).map((itm: any) => ({
              id: itm.id,
              itemId: itm.itemId,
              quantity: Number(itm.quantity) || 0,
              unitPrice: Number(itm.unitPrice) || 0,
              taxRate: Number(itm.taxRate) || 0,
              taxableAmount: Number(itm.taxableAmount) || 0,
              totalAmount: Number(itm.totalAmount) || 0,
              item: itm.item,
            })),
          });
        }

        if (ret.reason) {
          setNotes(ret.reason);
          setShowNotes(true);
        }

        if (ret.items && ret.items.length > 0) {
          const mappedLines: ReturnLineItem[] = ret.items.map((i: any) => ({
            id: crypto.randomUUID(),
            salesItemId: i.salesItemId,
            itemId: i.itemId,
            name: i.item?.name || "Item",
            description: "",
            hsn: i.item?.hsnCode || "",
            quantity: Number(i.quantity) || 1,
            unit: i.item?.primaryUom?.code || "PCS",
            unitPrice: Number(i.unitPrice) || 0,
            discountValue: 0,
            discountType: "PERCENT",
            taxRate: Number(i.taxRate) || 0,
          }));
          setLineItems(mappedLines);
        }
      } catch (err: any) {
        console.error("Failed to load sales return for edit/duplicate:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editId, duplicateId, tenantContext.companyId]);

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

  // Fetch party invoices when party is selected
  useEffect(() => {
    if (!selectedParty) {
      setInvoices([]);
      setSelectedInvoice(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res: any = await apiClient.get("/invoices/sales", {
          partyId: selectedParty.id,
          limit: 100,
        });
        if (cancelled) return;
        const invList: SalesInvoiceOption[] = extractList<any>(res)
          .filter((inv) => inv.status !== "CANCELLED" && inv.status !== "DRAFT")
          .map((inv) => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            invoiceDate: inv.invoiceDate,
            grandTotal: Number(inv.grandTotal) || 0,
            balanceAmount: Number(inv.balanceAmount || inv.outstandingBalance || 0),
            items: (inv.items || []).map((itm: any) => ({
              id: itm.id,
              itemId: itm.itemId,
              quantity: Number(itm.quantity) || 0,
              unitPrice: Number(itm.unitPrice) || 0,
              taxRate: Number(itm.taxRate) || 0,
              taxableAmount: Number(itm.taxableAmount) || 0,
              totalAmount: Number(itm.totalAmount) || 0,
              item: itm.item,
            })),
          }));
        setInvoices(invList);
      } catch (err: any) {
        console.error("Failed to load party invoices:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedParty]);

  // Handle invoice linking: automatically populate returnable items
  function handleSelectInvoice(inv: SalesInvoiceOption) {
    setSelectedInvoice(inv);
    setIsInvoiceDropdownOpen(false);

    // Populate lines from invoice
    if (inv.items && inv.items.length > 0) {
      const returnLines: ReturnLineItem[] = inv.items.map((i) => ({
        id: crypto.randomUUID(),
        salesItemId: i.id,
        itemId: i.itemId,
        name: i.item?.name || "Item",
        description: "",
        hsn: i.item?.hsnCode || "",
        quantity: i.quantity,
        unit: "PCS",
        unitPrice: i.unitPrice,
        discountValue: 0,
        discountType: "PERCENT",
        taxRate: i.taxRate,
      }));
      setLineItems(returnLines);
    }
  }

  function handleUnlinkInvoice() {
    setSelectedInvoice(null);
    setInvoiceSearchQuery("");
  }

  // Row update handlers
  function updateLineItem(id: string, updates: Partial<ReturnLineItem>) {
    setLineItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  }

  function removeLineItem(id: string) {
    setLineItems((current) => current.filter((item) => item.id !== id));
  }

  // Add items from Catalog modal
  function handleAddSelectedCatalogItems(
    selected: Array<{ item: CatalogItem; quantity: number; unitPrice: number }>,
  ) {
    const newLines: ReturnLineItem[] = selected.map((s) => ({
      id: crypto.randomUUID(),
      itemId: s.item.id,
      name: s.item.name,
      description: "",
      hsn: s.item.hsnCode || "",
      quantity: s.quantity || 1,
      unit: s.item.unit || "PCS",
      unitPrice: s.unitPrice || s.item.retailPrice || 0,
      discountValue: 0,
      discountType: "PERCENT",
      taxRate: s.item.taxRate || 18,
    }));
    setLineItems((curr) => [...curr, ...newLines]);
    setIsAddItemsModalOpen(false);
  }

  // Calculations for items
  const itemCalculations = useMemo(() => {
    return lineItems.map((item) => {
      const gross = item.quantity * item.unitPrice;
      const discount =
        item.discountType === "PERCENT"
          ? (gross * item.discountValue) / 100
          : item.discountValue;
      const taxable = Math.max(0, gross - discount);
      const taxAmount = (taxable * item.taxRate) / 100;
      const totalAmount = taxable + taxAmount;
      return {
        ...item,
        gross,
        discount,
        taxable,
        taxAmount,
        totalAmount,
      };
    });
  }, [lineItems]);

  const subtotalGross = itemCalculations.reduce((sum, i) => sum + i.gross, 0);
  const subtotalDiscount = itemCalculations.reduce((sum, i) => sum + i.discount, 0);
  const subtotalTaxable = itemCalculations.reduce((sum, i) => sum + i.taxable, 0);
  const subtotalTax = itemCalculations.reduce((sum, i) => sum + i.taxAmount, 0);
  const totalQuantity = itemCalculations.reduce((sum, i) => sum + i.quantity, 0);

  // Grand Total Calculations
  const calculatedGrandTotal = useMemo(() => {
    const base = subtotalTaxable + subtotalTax;
    const withExtra = base + Number(additionalCharges || 0) - Number(discountAmount || 0);
    if (!autoRoundOff) return withExtra;
    return Math.round(withExtra);
  }, [subtotalTaxable, subtotalTax, additionalCharges, discountAmount, autoRoundOff]);

  const roundOffAmount = useMemo(() => {
    const base = subtotalTaxable + subtotalTax + Number(additionalCharges || 0) - Number(discountAmount || 0);
    return calculatedGrandTotal - base;
  }, [subtotalTaxable, subtotalTax, additionalCharges, discountAmount, calculatedGrandTotal]);

  // Balance calculation
  const balanceAmount = useMemo(() => {
    const rec = Number(amountReceived) || 0;
    return Math.max(0, calculatedGrandTotal - rec);
  }, [calculatedGrandTotal, amountReceived]);

  useEffect(() => {
    if (isMarkAsFullyPaid) {
      setAmountReceived(calculatedGrandTotal.toString());
    }
  }, [isMarkAsFullyPaid, calculatedGrandTotal]);

  // Filtered parties for search dropdown
  const filteredParties = useMemo(() => {
    const q = partySearchQuery.trim().toLowerCase();
    if (!q) return parties;
    return parties.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.phone && p.phone.includes(q)) ||
        (p.gstin && p.gstin.toLowerCase().includes(q)),
    );
  }, [parties, partySearchQuery]);

  // Filtered invoices for linking
  const filteredInvoices = useMemo(() => {
    const q = invoiceSearchQuery.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((inv) => inv.invoiceNumber.toLowerCase().includes(q));
  }, [invoices, invoiceSearchQuery]);

  // Create party modal submit
  async function handleCreatePartySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newPartyName.trim()) return;

    setIsCreatingParty(true);
    try {
      const res: any = await apiClient.post("/parties", {
        name: newPartyName.trim(),
        phone: newPartyPhone.trim() || undefined,
        gstin: newPartyGstin.trim() || undefined,
        type: "CUSTOMER",
        billingAddress: newPartyAddress.trim() ? { line1: newPartyAddress.trim() } : undefined,
      });

      const newParty: Party = {
        id: res.id,
        name: res.name,
        phone: res.phone,
        gstin: res.gstin,
        type: res.type,
        balance: 0,
        billingAddress: res.billingAddress,
        shippingAddress: res.shippingAddress || res.billingAddress,
      };

      setParties((prev) => [newParty, ...prev]);
      setSelectedParty(newParty);
      setIsCreatePartyModalOpen(false);
      setIsPartyDropdownOpen(false);
      setNewPartyName("");
      setNewPartyPhone("");
      setNewPartyGstin("");
      setNewPartyAddress("");
    } catch (err: any) {
      alert(err.message || "Failed to create party.");
    } finally {
      setIsCreatingParty(false);
    }
  }

  // Save Sales Return / Credit Note
  async function handleSaveReturn(isNew: boolean = false) {
    setError(null);
    if (!selectedParty) {
      setError(lang === "gu" ? "કૃપા કરીને પાર્ટી પસંદ કરો." : "Please select a customer / party.");
      return;
    }
    if (lineItems.length === 0) {
      setError(lang === "gu" ? "ઓછામાં ઓછી એક આઇટમ ઉમેરો." : "Please add at least one line item to return.");
      return;
    }

    // Require an invoice to be linked
    if (!selectedInvoice) {
      setError(
        lang === "gu"
          ? "ક્રેડિટ નોટ બનાવવા માટે વેચાણ બિલ (Sales Invoice) લિંક કરો."
          : "Please link a Sales Invoice under 'Link to Invoice' to create this Sales Return / Credit Note.",
      );
      return;
    }

    // Validate quantities
    for (const itm of lineItems) {
      if (itm.quantity <= 0) {
        setError(`Quantity for ${itm.name} must be greater than zero.`);
        return;
      }
    }

    setIsSaving(true);
    try {
      // Find or map salesItemId from the linked invoice
      const itemsPayload = lineItems.map((line) => {
        let sId = line.salesItemId;
        if (!sId && selectedInvoice.items) {
          const match = selectedInvoice.items.find((i) => i.itemId === line.itemId);
          if (match) sId = match.id;
        }
        if (!sId && selectedInvoice.items && selectedInvoice.items.length > 0) {
          sId = selectedInvoice.items[0].id;
        }
        return {
          salesItemId: sId,
          quantity: line.quantity,
          reason: notes || line.description || "Customer Return",
        };
      });

      if (editId) {
        try {
          await apiClient.delete(`/sales-returns/${editId}`);
        } catch (e) {
          console.warn("Could not delete prior return:", e);
        }
      }

      const res: any = await apiClient.post("/sales-returns", {
        salesInvoiceId: selectedInvoice.id,
        returnDate,
        reason: notes || "Sales Return / Credit Note",
        items: itemsPayload,
      });

      if (isNew) {
        // Reset form
        setSelectedParty(null);
        setSelectedInvoice(null);
        setLineItems([]);
        setNotes("");
        setTerms("");
        setAmountReceived("0");
        setError(null);
        setReturnNumber((prev) => String(Number(prev) + 1));
      } else {
        const targetId = res?.id || res?.data?.id;
        if (targetId) {
          router.push(isDebitNote ? `/sales/debit-note` : `/sales/credit-note/view/${targetId}`);
        } else {
          router.push(isDebitNote ? "/sales/debit-note" : "/sales/credit-note");
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to create sales return / credit note.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-slate-800 flex flex-col font-sans select-none">
      {/* 1. TOP HEADER BAR: Exit | Title | Mode Tabs | Actions */}
      <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link
            href={isDebitNote ? "/sales/debit-note" : "/sales/credit-note"}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Exit</span>
          </Link>
          <h1 className="text-sm font-bold text-slate-900 tracking-tight">
            {lang === "gu" ? (isDebitNote ? "ડેબિટ નોટ બનાવો" : "ક્રેડિટ નોટ બનાવો") : (isDebitNote ? "Create Debit Note" : "Create Credit Note")}
          </h1>
        </div>

        {/* Center: Edit Mode / Preview Mode Tabs */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setActiveMode("edit")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all ${
              activeMode === "edit"
                ? "bg-white text-indigo-700 shadow-2xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Edit Mode</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode("preview")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all ${
              activeMode === "preview"
                ? "bg-white text-indigo-700 shadow-2xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>Preview Mode</span>
          </button>
        </div>

        {/* Right: Settings, Save & New, Save, Keyboard */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Settings"
            onClick={() => router.push("/settings")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSaveReturn(true)}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
          >
            Save &amp; New
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSaveReturn(false)}
            className="rounded-lg bg-[#174B43] hover:bg-[#123B35] px-5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>

          <button
            type="button"
            title="Shortcuts"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <line x1="6" y1="8" x2="6" y2="8" />
              <line x1="10" y1="8" x2="10" y2="8" />
              <line x1="14" y1="8" x2="14" y2="8" />
              <line x1="18" y1="8" x2="18" y2="8" />
              <line x1="7" y1="12" x2="17" y2="12" />
              <line x1="7" y1="16" x2="17" y2="16" />
            </svg>
          </button>
        </div>
      </header>

      {/* ERROR BANNER */}
      {error && (
        <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 text-xs text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span className="font-medium">{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* 2. MAIN BODY */}
      {activeMode === "preview" ? (
        /* PREVIEW MODE DOCUMENT */
        <div className="flex-1 p-6 flex justify-center overflow-y-auto">
          <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-xl shadow-lg p-8 space-y-6">
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  {isDebitNote ? "DEBIT NOTE" : "CREDIT NOTE / SALES RETURN"}
                </h2>
                <p className="text-xs text-slate-500 mt-1">Original for Recipient</p>
              </div>
              <div className="text-right text-xs space-y-1">
                <p className="font-bold text-slate-800">Return No: #{returnNumber}</p>
                <p className="text-slate-600">Date: {formatDisplayDate(returnDate)}</p>
                {selectedInvoice && (
                  <p className="text-teal-600 font-medium">Orig. Invoice: #{selectedInvoice.invoiceNumber}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 text-xs">
              <div>
                <p className="font-bold text-slate-500 uppercase tracking-wider mb-1">Bill To:</p>
                <p className="font-bold text-slate-900 text-sm">{selectedParty?.name || "Cash Customer"}</p>
                {selectedParty?.phone && <p className="text-slate-600 mt-0.5">Mobile: {selectedParty.phone}</p>}
                {selectedParty?.gstin && <p className="text-slate-600 mt-0.5">GSTIN: {selectedParty.gstin}</p>}
                {selectedParty?.billingAddress?.line1 && (
                  <p className="text-slate-600 mt-0.5">{selectedParty.billingAddress.line1}</p>
                )}
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-500 uppercase tracking-wider mb-1">Issued By:</p>
                <p className="font-bold text-slate-900 text-sm">{tenantContext.companyId ? "PANELIYA TECHNOLOGY" : "My Company"}</p>
                <p className="text-slate-600 mt-0.5">State Code: 24 (Gujarat)</p>
              </div>
            </div>

            {/* Preview items table */}
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2.5 w-10">#</th>
                  <th className="p-2.5">Item Description</th>
                  <th className="p-2.5">HSN</th>
                  <th className="p-2.5 text-right">Qty</th>
                  <th className="p-2.5 text-right">Rate</th>
                  <th className="p-2.5 text-right">Taxable</th>
                  <th className="p-2.5 text-right">Tax</th>
                  <th className="p-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itemCalculations.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="p-2.5 text-slate-500">{idx + 1}</td>
                    <td className="p-2.5 font-medium text-slate-900">{item.name}</td>
                    <td className="p-2.5 text-slate-600">{item.hsn || "—"}</td>
                    <td className="p-2.5 text-right font-medium">{item.quantity} {item.unit}</td>
                    <td className="p-2.5 text-right">{formatInr(item.unitPrice)}</td>
                    <td className="p-2.5 text-right">{formatInr(item.taxable)}</td>
                    <td className="p-2.5 text-right">{formatInr(item.taxAmount)} ({item.taxRate}%)</td>
                    <td className="p-2.5 text-right font-semibold">{formatInr(item.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                <tr>
                  <td colSpan={3} className="p-2.5 text-right">Total:</td>
                  <td className="p-2.5 text-right">{totalQuantity}</td>
                  <td className="p-2.5" />
                  <td className="p-2.5 text-right">{formatInr(subtotalTaxable)}</td>
                  <td className="p-2.5 text-right">{formatInr(subtotalTax)}</td>
                  <td className="p-2.5 text-right font-black text-indigo-700">{formatInr(calculatedGrandTotal)}</td>
                </tr>
              </tfoot>
            </table>

            <div className="flex justify-between items-end pt-4 border-t border-slate-200 text-xs">
              <div className="max-w-md space-y-2">
                {notes && (
                  <div>
                    <span className="font-bold text-slate-700">Notes: </span>
                    <span className="text-slate-600">{notes}</span>
                  </div>
                )}
                {terms && (
                  <div>
                    <span className="font-bold text-slate-700">Terms: </span>
                    <span className="text-slate-600">{terms}</span>
                  </div>
                )}
              </div>
              <div className="text-center">
                {signatureData ? (
                  <img src={signatureData} alt="Signature" className="h-12 mx-auto mb-1 object-contain" />
                ) : (
                  <div className="h-12" />
                )}
                <div className="w-40 border-t border-slate-300 pt-1 font-semibold text-slate-700">
                  Authorized Signatory
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* EDIT MODE (Exact myBillBook Layout) */
        <div className="flex-1 overflow-y-auto">
          {/* Top 3 Cards Grid */}
          <div className="bg-white border-b border-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
            {/* CARD 1: Bill To */}
            <div className="p-4 flex flex-col justify-between relative" ref={partyDropdownRef}>
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bill To</span>
                <div className="flex items-center gap-1">
                  {selectedParty && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsPartyDropdownOpen(true)}
                        className="px-2 py-0.5 text-[11px] font-semibold text-[#174B43] hover:bg-teal-50 rounded border border-slate-200"
                      >
                        Change Party
                      </button>
                    </>
                  )}
                  <button type="button" className="text-slate-400 hover:text-slate-600 p-0.5">
                    ⚙️
                  </button>
                </div>
              </div>

              {selectedParty ? (
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-slate-900 text-sm">{selectedParty.name}</p>
                  {selectedParty.phone && (
                    <p className="text-slate-600">Phone Number: {selectedParty.phone}</p>
                  )}
                  {selectedParty.gstin && (
                    <p className="text-slate-500">GSTIN: {selectedParty.gstin}</p>
                  )}
                  {selectedParty.billingAddress?.line1 && (
                    <p className="text-slate-500">{selectedParty.billingAddress.line1}</p>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => {
                    setIsPartyDropdownOpen(true);
                    setTimeout(() => partySearchInputRef.current?.focus(), 50);
                  }}
                  className="h-24 border-2 border-dashed border-teal-200 rounded-xl flex items-center justify-center text-xs font-semibold text-[#174B43] bg-teal-50/20 hover:bg-teal-50/50 cursor-pointer transition-colors"
                >
                  + Add Party
                </div>
              )}

              {/* Party Dropdown */}
              {isPartyDropdownOpen && (
                <div
                  className="absolute left-4 right-4 top-10 z-50 rounded-xl border border-slate-200 bg-white shadow-2xl py-1 text-xs animate-in fade-in zoom-in-95 duration-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-2 border-b border-slate-100 flex items-center gap-2">
                    <span className="text-slate-400">🔍</span>
                    <input
                      ref={partySearchInputRef}
                      type="text"
                      value={partySearchQuery}
                      onChange={(e) => setPartySearchQuery(e.target.value)}
                      placeholder="Search party by name or number"
                      className="w-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                    />
                  </div>

                  <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 flex justify-between uppercase">
                    <span>Party Name</span>
                    <span>Balance</span>
                  </div>

                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                    {filteredParties.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No parties found matching &quot;{partySearchQuery}&quot;
                      </div>
                    ) : (
                      filteredParties.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedParty(p);
                            setIsPartyDropdownOpen(false);
                          }}
                          className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">{p.name}</p>
                            {p.phone && <p className="text-[10px] text-slate-400">{p.phone}</p>}
                          </div>
                          <div className="text-right flex items-center gap-1 font-medium">
                            <span className="text-slate-700">{formatInr(p.balance || 0)}</span>
                            <span className={(p.balance || 0) >= 0 ? "text-rose-500" : "text-emerald-500"}>
                              {(p.balance || 0) >= 0 ? "↑" : "↓"}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPartyDropdownOpen(false);
                        setIsCreatePartyModalOpen(true);
                      }}
                      className="w-full py-2 border-2 border-dashed border-teal-200 rounded-lg text-center text-xs font-semibold text-[#174B43] hover:bg-teal-50/50 transition-colors"
                    >
                      + Create Party
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* CARD 2: Ship To (if party selected) */}
            <div className="p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ship To</span>
                {selectedParty && (
                  <button type="button" className="px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 rounded border border-slate-200">
                    Change Shipping Address
                  </button>
                )}
              </div>

              {selectedParty ? (
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-slate-900 text-sm">{selectedParty.name}</p>
                  {selectedParty.phone && (
                    <p className="text-slate-600">Phone Number: {selectedParty.phone}</p>
                  )}
                  {selectedParty.shippingAddress?.line1 && (
                    <p className="text-slate-500">{selectedParty.shippingAddress.line1}</p>
                  )}
                </div>
              ) : (
                <div className="h-24 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-xs text-slate-400">
                  Select a party to view shipping address
                </div>
              )}
            </div>

            {/* CARD 3: Invoice Details (Sales Return No, Date, Link to Invoice) */}
            <div className="p-4 space-y-3" ref={invoiceDropdownRef}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice Details</span>
                <button type="button" className="text-slate-400 hover:text-slate-600 p-0.5">⚙️</button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">{docLabel} No.</label>
                  <input
                    type="text"
                    value={returnNumber}
                    onChange={(e) => setReturnNumber(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">{docLabel} Date</label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Link to Invoice with red New badge */}
              <div className="relative pt-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <label className="text-[11px] font-medium text-slate-700">Link to Invoice :</label>
                  <span className="rounded bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.2">New</span>
                </div>

                {selectedInvoice ? (
                  <div className="flex items-center justify-between rounded-lg border border-teal-200 bg-teal-50/40 px-3 py-1.5 text-xs">
                    <span className="font-semibold text-indigo-900">
                      Invoice #{String(selectedInvoice.invoiceNumber || "").replace(/^#+/, "")} ({formatDisplayDate(selectedInvoice.invoiceDate)}) - {formatInr(selectedInvoice.grandTotal)}
                    </span>
                    <button
                      type="button"
                      onClick={handleUnlinkInvoice}
                      className="text-slate-400 hover:text-rose-600 font-bold px-1"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={invoiceSearchQuery}
                      onFocus={() => setIsInvoiceDropdownOpen(true)}
                      onChange={(e) => {
                        setInvoiceSearchQuery(e.target.value);
                        setIsInvoiceDropdownOpen(true);
                      }}
                      placeholder="🔍 Search invoices"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none"
                    />

                    {isInvoiceDropdownOpen && (
                      <div
                        className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl py-1 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!selectedParty ? (
                          <div className="p-3 text-center text-xs text-slate-400">
                            Please select a party first to view their invoices.
                          </div>
                        ) : filteredInvoices.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-400">
                            No posted sales invoices found for {selectedParty.name}.
                          </div>
                        ) : (
                          filteredInvoices.map((inv) => (
                            <div
                              key={inv.id}
                              onClick={() => handleSelectInvoice(inv)}
                              className="px-3 py-2 hover:bg-teal-50/50 cursor-pointer flex items-center justify-between border-b border-slate-50 last:border-b-0"
                            >
                              <div>
                                <p className="font-semibold text-slate-900">#{inv.invoiceNumber}</p>
                                <p className="text-[10px] text-slate-400">{formatDisplayDate(inv.invoiceDate)}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-slate-800">{formatInr(inv.grandTotal)}</p>
                                <p className="text-[10px] text-slate-400">Bal: {formatInr(inv.balanceAmount)}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. ITEMS TABLE */}
          <div className="p-4 space-y-2">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="min-w-full text-left text-xs border-collapse">
                <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-3 py-2.5 w-8">NO</th>
                    <th className="px-3 py-2.5 min-w-[200px]">ITEMS</th>
                    <th className="px-3 py-2.5 w-28">HSN</th>
                    <th className="px-3 py-2.5 w-28">QTY</th>
                    <th className="px-3 py-2.5 w-32">PRICE/ITEM (₹)</th>
                    <th className="px-3 py-2.5 w-32">DISCOUNT</th>
                    <th className="px-3 py-2.5 w-32">TAX</th>
                    <th className="px-3 py-2.5 w-32 text-right">AMOUNT (₹)</th>
                    <th className="px-3 py-2.5 w-10 text-center">⚙️</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {itemCalculations.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-3 py-2 text-slate-400 font-medium text-center">{index + 1}</td>

                      {/* Item Name & Description */}
                      <td className="px-3 py-2">
                        {selectedInvoice ? (
                          <div className="py-0.5">
                            <p className="font-bold text-slate-900 text-xs">{item.name}</p>
                            {item.salesItemId && (
                              <span className="inline-flex items-center text-[9px] font-semibold text-teal-600 bg-teal-50 border border-teal-100 px-1.5 py-0.2 rounded mt-0.5">
                                From Invoice
                              </span>
                            )}
                          </div>
                        ) : (
                          <>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateLineItem(item.id, { name: e.target.value })}
                              placeholder="Item name"
                              className="w-full font-semibold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-teal-500 focus:outline-none py-0.5"
                            />
                            <textarea
                              rows={1}
                              value={item.description}
                              onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                              placeholder="Enter Description (optional)"
                              className="w-full text-[11px] text-slate-500 mt-1 resize-none border border-slate-100 focus:border-slate-300 rounded p-1 focus:outline-none"
                            />
                          </>
                        )}
                      </td>

                      {/* HSN */}
                      <td className="px-3 py-2">
                        {selectedInvoice ? (
                          <span className="text-xs text-slate-600 font-medium px-2 py-1 block">{item.hsn || "—"}</span>
                        ) : (
                          <div className="relative">
                            <input
                              type="text"
                              value={item.hsn}
                              onChange={(e) => updateLineItem(item.id, { hsn: e.target.value })}
                              placeholder="HSN"
                              className="w-full rounded border border-slate-200 px-2 py-1 text-xs focus:border-teal-500 focus:outline-none"
                            />
                          </div>
                        )}
                      </td>

                      {/* QTY & Unit */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(item.id, { quantity: Number(e.target.value) || 0 })}
                            className="w-16 rounded border border-slate-200 px-2 py-1 text-xs font-semibold focus:border-teal-500 focus:outline-none"
                          />
                          <span className="text-[10px] font-bold text-slate-500 px-1 bg-slate-100 rounded py-1">
                            {item.unit}
                          </span>
                        </div>
                      </td>

                      {/* Price / Item */}
                      <td className="px-3 py-2">
                        {selectedInvoice ? (
                          <span className="text-xs font-bold text-slate-800 px-2 py-1 block text-right">
                            {formatInr(item.unitPrice)}
                          </span>
                        ) : (
                          <div className="relative">
                            <span className="absolute left-2 top-1.5 text-slate-400">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateLineItem(item.id, { unitPrice: Number(e.target.value) || 0 })}
                              className="w-full rounded border border-slate-200 pl-5 pr-2 py-1 text-xs font-semibold focus:border-teal-500 focus:outline-none"
                            />
                          </div>
                        )}
                      </td>

                      {/* Discount */}
                      <td className="px-3 py-2">
                        {selectedInvoice ? (
                          <span className="text-xs text-slate-600 font-medium px-1.5 py-1 block text-right">
                            {item.discountValue ? `${item.discountValue} ${item.discountType === "PERCENT" ? "%" : "₹"}` : "0"}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.discountValue}
                              onChange={(e) => updateLineItem(item.id, { discountValue: Number(e.target.value) || 0 })}
                              className="w-16 rounded border border-slate-200 px-2 py-1 text-xs focus:border-teal-500 focus:outline-none"
                            />
                            <select
                              value={item.discountType}
                              onChange={(e) => updateLineItem(item.id, { discountType: e.target.value as any })}
                              className="text-[10px] font-bold bg-slate-100 rounded border border-slate-200 px-1 py-1"
                            >
                              <option value="PERCENT">%</option>
                              <option value="FIXED">₹</option>
                            </select>
                          </div>
                        )}
                      </td>

                      {/* Tax */}
                      <td className="px-3 py-2">
                        {selectedInvoice ? (
                          <div className="text-right">
                            <span className="inline-block rounded bg-slate-100 text-slate-700 px-2 py-1 text-[11px] font-semibold">
                              GST @ {item.taxRate}%
                            </span>
                            <p className="text-[10px] text-slate-400 mt-0.5">({formatInr(item.taxAmount)})</p>
                          </div>
                        ) : (
                          <>
                            <select
                              value={item.taxRate}
                              onChange={(e) => updateLineItem(item.id, { taxRate: Number(e.target.value) })}
                              className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-medium focus:border-teal-500 focus:outline-none"
                            >
                              {GST_RATES.map((g) => (
                                <option key={g.label} value={g.value}>
                                  {g.label}
                                </option>
                              ))}
                            </select>
                            <p className="text-[10px] text-slate-400 mt-0.5 text-right">({formatInr(item.taxAmount)})</p>
                          </>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="px-3 py-2 text-right font-semibold text-slate-900 whitespace-nowrap">
                        {formatInr(item.totalAmount)}
                      </td>

                      {/* Action (Delete) */}
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeLineItem(item.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                          title="Remove item"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Add Item Dashed Box & Scan Barcode */}
              {!selectedInvoice ? (
                <div className="p-3 border-t border-slate-200 flex items-center justify-between gap-3 bg-white">
                  <button
                    type="button"
                    onClick={() => setIsAddItemsModalOpen(true)}
                    className="flex-1 py-2.5 border-2 border-dashed border-teal-200 rounded-xl text-center text-xs font-semibold text-[#174B43] hover:bg-teal-50/50 transition-colors cursor-pointer"
                  >
                    + Add Item
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shrink-0 shadow-2xs"
                  >
                    <span>📷</span>
                    <span>Scan Barcode</span>
                  </button>
                </div>
              ) : (
                <div className="p-2.5 bg-slate-50/80 border-t border-slate-200 text-center text-xs text-slate-500">
                  <span>🔒 Items are locked to Sales Invoice #{selectedInvoice.invoiceNumber}. Only return quantities can be adjusted.</span>
                </div>
              )}

              {/* Subtotal Row */}
              <div className="bg-[#F8FAFC] border-t border-slate-200 px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="font-bold">Subtotal</span>
                <div className="flex items-center gap-8">
                  <span>Qty: {totalQuantity}</span>
                  <span>Disc: {formatInr(subtotalDiscount)}</span>
                  <span>Tax: {formatInr(subtotalTax)}</span>
                  <span className="text-sm font-bold text-slate-900">{formatInr(subtotalTaxable + subtotalTax)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. BOTTOM SECTION: Notes/Terms (Left) + Totals & Payment (Right) */}
          <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left: Notes & Terms */}
            <div className="space-y-3">
              {showNotes ? (
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1 shadow-2xs">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700">Notes</label>
                    <button type="button" onClick={() => setShowNotes(false)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
                  </div>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter notes for this return..."
                    className="w-full text-xs text-slate-800 border border-slate-200 rounded-lg p-2 focus:border-teal-500 focus:outline-none"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNotes(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#174B43] hover:text-[#123B35] transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>+ Add Notes</span>
                </button>
              )}

              {showTerms ? (
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1 shadow-2xs">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700">Terms &amp; Conditions</label>
                    <button type="button" onClick={() => setShowTerms(false)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
                  </div>
                  <textarea
                    rows={2}
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    placeholder="Enter terms & conditions..."
                    className="w-full text-xs text-slate-800 border border-slate-200 rounded-lg p-2 focus:border-teal-500 focus:outline-none"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowTerms(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#174B43] hover:text-[#123B35] transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>+ Add Terms &amp; Conditions</span>
                </button>
              )}
            </div>

            {/* Right: Tax Breakdown, Extra Charges, Grand Total, Payment & Signature */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs text-xs">
              {/* Additional Charges toggle / input */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                {showAdditionalCharges ? (
                  <div className="flex items-center justify-between w-full">
                    <input
                      type="text"
                      value={additionalChargeLabel}
                      onChange={(e) => setAdditionalChargeLabel(e.target.value)}
                      className="border border-slate-200 rounded px-2 py-0.5 text-xs w-40"
                    />
                    <div className="flex items-center gap-1">
                      <span>₹</span>
                      <input
                        type="number"
                        min="0"
                        value={additionalCharges}
                        onChange={(e) => setAdditionalCharges(Number(e.target.value) || 0)}
                        className="border border-slate-200 rounded px-2 py-0.5 text-xs w-24 text-right"
                      />
                      <button type="button" onClick={() => setShowAdditionalCharges(false)} className="text-slate-400">✕</button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAdditionalCharges(true)}
                    className="text-[#174B43] font-semibold flex items-center gap-1 hover:underline"
                  >
                    <span>₹</span>
                    <span>+ Add Additional Charges</span>
                  </button>
                )}
              </div>

              {/* Taxable Amount */}
              <div className="flex justify-between items-center text-slate-600">
                <span>Taxable Amount</span>
                <span className="font-semibold text-slate-800">{formatInr(subtotalTaxable)}</span>
              </div>

              {/* Intra vs Inter-State GST breakdown */}
              <div className="flex justify-between items-center text-slate-500 text-[11px]">
                <span>SGST (Intra-state)</span>
                <span>{formatInr(subtotalTax / 2)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500 text-[11px]">
                <span>CGST (Intra-state)</span>
                <span>{formatInr(subtotalTax / 2)}</span>
              </div>

              {/* Extra Discount */}
              <div className="flex items-center justify-between py-1 border-y border-slate-100">
                {showDiscount ? (
                  <div className="flex items-center justify-between w-full">
                    <span>Discount</span>
                    <div className="flex items-center gap-1">
                      <span>₹</span>
                      <input
                        type="number"
                        min="0"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                        className="border border-slate-200 rounded px-2 py-0.5 text-xs w-24 text-right"
                      />
                      <button type="button" onClick={() => setShowDiscount(false)} className="text-slate-400">✕</button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDiscount(true)}
                    className="text-[#174B43] font-semibold flex items-center gap-1 hover:underline"
                  >
                    <span>%</span>
                    <span>+ Add Discount</span>
                  </button>
                )}
              </div>

              {/* Auto Round Off */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRoundOff}
                    onChange={(e) => setAutoRoundOff(e.target.checked)}
                    className="rounded text-[#174B43] focus:ring-teal-500"
                  />
                  <span>Auto Round Off</span>
                </label>
                <span className="text-slate-500 font-medium">
                  {roundOffAmount >= 0 ? `+ ${formatInr(roundOffAmount)}` : `- ${formatInr(Math.abs(roundOffAmount))}`}
                </span>
              </div>

              {/* Total Amount Header */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-sm font-bold text-slate-900">Total Amount:</span>
                <span className="text-base font-black text-slate-900">{formatInr(calculatedGrandTotal)}</span>
              </div>

              {/* Total Amount Received / Refund */}
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <div className="flex justify-between text-slate-600">
                  <span>Total Amount Received</span>
                  <span className="font-semibold">{formatInr(amountReceived)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1.5 text-slate-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      className="w-full rounded border border-slate-200 pl-6 pr-2 py-1 text-xs font-semibold focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="rounded border border-slate-200 px-3 py-1 text-xs font-medium focus:border-teal-500 focus:outline-none"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={isMarkAsFullyPaid}
                    onChange={(e) => setIsMarkAsFullyPaid(e.target.checked)}
                    className="rounded text-[#174B43] focus:ring-teal-500"
                  />
                  <span>Mark as fully paid</span>
                </label>
              </div>

              {/* Balance Amount */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <span className="font-semibold text-slate-700">Balance Amount</span>
                <span className="font-bold text-emerald-600">{formatInr(balanceAmount)}</span>
              </div>

              {/* Signature Dashed Box */}
              <div className="pt-2 flex justify-end">
                {signatureData ? (
                  <div className="border border-slate-200 rounded-lg p-2 text-center bg-slate-50">
                    <img src={signatureData} alt="Signature" className="h-10 mx-auto object-contain" />
                    <button
                      type="button"
                      onClick={() => setSignatureData(null)}
                      className="text-[10px] text-rose-500 hover:underline mt-1"
                    >
                      Remove Signature
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsSignatureModalOpen(true)}
                    className="px-4 py-2 border-2 border-dashed border-teal-200 rounded-lg text-xs font-semibold text-[#174B43] hover:bg-teal-50/50 transition-colors"
                  >
                    + Add Signature
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Items Modal */}
      <AddItemsModal
        isOpen={isAddItemsModalOpen}
        onClose={() => setIsAddItemsModalOpen(false)}
        items={catalogItems}
        onAddSelectedItems={handleAddSelectedCatalogItems}
      />

      {/* Signature Modal */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSaveSignature={(data) => {
          setSignatureData(data);
          setIsSignatureModalOpen(false);
        }}
        existingSignature={signatureData}
      />

      {/* Create Party / Customer Modal */}
      {isCreatePartyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Create New Customer</h3>
              <button
                type="button"
                onClick={() => setIsCreatePartyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePartySubmit} className="space-y-3 pt-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Customer / Business Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  placeholder="e.g. NIRAJBHAI"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mobile No.</label>
                  <input
                    type="tel"
                    value={newPartyPhone}
                    onChange={(e) => setNewPartyPhone(e.target.value)}
                    placeholder="98XXXXXXXX"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={newPartyGstin}
                    onChange={(e) => setNewPartyGstin(e.target.value.toUpperCase())}
                    placeholder="24AAAAA0000A1Z5"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={newPartyAddress}
                  onChange={(e) => setNewPartyAddress(e.target.value)}
                  placeholder="Address..."
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
                  disabled={isCreatingParty || !newPartyName.trim()}
                  className="px-5 py-2 bg-[#174B43] hover:bg-[#123B35] text-white rounded-lg font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
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
