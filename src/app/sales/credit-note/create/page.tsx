"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "../../../../context/auth-context";
import { apiClient, extractList } from "../../../../lib/api-client";
import { useActiveInvoiceTheme } from "@/lib/use-active-invoice-theme";
import { DynamicThemedInvoice } from "@/components/invoice/dynamic-themed-invoice";
import { AddItemsModal, CatalogItem } from "../../../../components/invoice/add-items-modal";
import { SignatureModal } from "../../../../components/invoice/signature-modal";
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
import { INDIAN_STATES } from "@/shared-types";

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
  const { lang, tenantContext, currentCompany } = useAuth();
  const { state: activeInvoiceTheme } = useActiveInvoiceTheme(currentCompany?.id);
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
    const [activeNotesTab, setActiveNotesTab] = useState<"notes" | "terms">("notes");
  const [transportMode, setTransportMode] = useState("Road");
  const [vehicleNo, setVehicleNo] = useState("");
  const [ewayBillNo, setEwayBillNo] = useState("");
  const [dispatchDate, setDispatchDate] = useState("");
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
      {/* Top header replaced by unified DocumentHeaderCard */}

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
        <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4 animate-fadeIn">
          {/* Preview Top Control Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveMode("edit")}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>← {lang === "gu" ? "એડિટ મોડ પર પાછા જાઓ" : "Back to Edit Mode"}</span>
              </button>
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>
                    {isDebitNote
                      ? lang === "gu"
                        ? "ડેબિટ નોટ પ્રિવ્યૂ"
                        : "Debit Note Preview"
                      : lang === "gu"
                      ? "ક્રેડિટ નોટ પ્રિવ્યૂ"
                      : "Credit Note Preview"}
                  </span>
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
                <span>🖨️ {lang === "gu" ? "પ્રિન્ટ" : `Print ${isDebitNote ? "Debit Note" : "Credit Note"}`}</span>
              </button>
            </div>
          </div>

          {/* Themed Document using DynamicThemedInvoice */}
          <div className="bg-slate-100/70 p-4 sm:p-8 rounded-2xl border border-slate-200 overflow-x-auto flex justify-center">
            <DynamicThemedInvoice
              invoice={{
                category: isDebitNote ? "DEBIT_NOTE" : "CREDIT_NOTE",
                invoiceNumber: returnNumber || (isDebitNote ? "DN-001" : "CN-001"),
                invoiceDate: returnDate,
                paymentMode: isDebitNote ? "DEBIT NOTE" : "CREDIT NOTE",
                placeOfSupply: selectedParty?.stateCode ? `State Code (${selectedParty.stateCode})` : "Gujarat (24)",
                taxableAmount: subtotalTaxable,
                cgstAmount: subtotalTax > 0 ? subtotalTax / 2 : 0,
                sgstAmount: subtotalTax > 0 ? subtotalTax / 2 : 0,
                igstAmount: 0,
                roundOff: autoRoundOff ? roundOffAmount : 0,
                grandTotal: calculatedGrandTotal,
                paidAmount: calculatedGrandTotal,
                balanceAmount: 0,
                notes: notes,
                party: {
                  name: selectedParty?.name || "Cash Customer",
                  gstin: selectedParty?.gstin,
                  phone: selectedParty?.phone,
                  billingAddress: selectedParty?.billingAddress,
                },
                items: itemCalculations.map((item, idx) => ({
                  id: item.id || `row-${idx}`,
                  description: item.name || "Item",
                  hsnCode: item.hsn,
                  quantity: item.quantity,
                  unit: item.unit || "PCS",
                  unitPrice: item.unitPrice,
                  taxRate: item.taxRate,
                  taxableAmount: item.taxable,
                  cgstAmount: item.taxAmount / 2,
                  sgstAmount: item.taxAmount / 2,
                  igstAmount: 0,
                  totalAmount: item.totalAmount,
                  item: { name: item.name },
                })),
                eWayBillRecord: {
                  originalInvoiceNumber: selectedInvoice?.invoiceNumber,
                },
              }}
              settings={{
                ...activeInvoiceTheme,
                termsAndConditions: {
                  ...activeInvoiceTheme.termsAndConditions,
                  sales: terms || activeInvoiceTheme.termsAndConditions?.sales,
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
              printableId={isDebitNote ? "printable-sales-debit-note" : "printable-sales-credit-note"}
            />
          </div>
        </div>
      ) : (
        <main className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
          {/* DOCUMENT HEADER CARD */}
          <DocumentHeaderCard
            title={lang === "gu" ? (isDebitNote ? "ડેબિટ નોટ" : "ક્રેડિટ નોટ") : (isDebitNote ? "Debit Note" : "Credit Note")}
            subtitle={lang === "gu" ? "ક્રેડિટ / ડેબિટ નોટ બનાવો અને વ્યવસ્થિત કરો" : `Create and manage your ${docLabel.toLowerCase()}`}
            status="Draft"
            onPreview={() => setActiveMode("preview")}
            onPrint={() => window.print()}
            onSave={() => handleSaveReturn(false)}
            onSaveAsDraft={() => handleSaveReturn(true)}
            isSaving={isSaving}
            saveButtonLabel={`Save ${docLabel}`}
            moreMenuItems={[
              { label: "Authorized Signature", onClick: () => setIsSignatureModalOpen(true) },
            ]}
          />

          {/* 5-COLUMN DOCUMENT INFO STRIP */}
          <DocumentInfoStrip
            fields={[
              {
                id: "party",
                label: isDebitNote ? "Vendor / Supplier" : "Customer",
                required: true,
                type: "custom",
                customRender: (
                  <PartySelectorCompact
                    selectedParty={selectedParty ? {
                      id: selectedParty.id,
                      name: selectedParty.name,
                      phone: selectedParty.phone,
                      gstin: selectedParty.gstin,
                      address: selectedParty.billingAddress?.line1,
                    } : null}
                    searchTerm={partySearchQuery}
                    onSearchChange={setPartySearchQuery}
                    isOpen={isPartyDropdownOpen}
                    onOpenChange={setIsPartyDropdownOpen}
                    filteredParties={filteredParties.map((p) => ({
                      id: p.id,
                      name: p.name,
                      phone: p.phone,
                      gstin: p.gstin,
                      outstandingBalance: p.balance,
                    }))}
                    onSelectParty={(id) => {
                      const p = parties.find((party) => party.id === id);
                      if (p) setSelectedParty(p);
                    }}
                    onClearParty={() => {
                      setSelectedParty(null);
                      setPartySearchQuery("");
                    }}
                    placeholder={`Search ${isDebitNote ? "vendor" : "customer"}...`}
                  />
                ),
              },
              {
                id: "returnNumber",
                label: `${docLabel} No.`,
                type: "text",
                value: returnNumber,
                onChange: setReturnNumber,
                placeholder: isDebitNote ? "DN-001" : "CN-001",
              },
              {
                id: "returnDate",
                label: `${docLabel} Date`,
                type: "date",
                value: returnDate,
                onChange: setReturnDate,
              },
              {
                id: "originalInvoice",
                label: "Original Invoice Ref",
                type: "select",
                value: selectedInvoice?.id || "",
                onChange: (val) => {
                  const inv = invoices.find((i) => i.id === val);
                  if (inv) handleSelectInvoice(inv);
                },
                options: invoices.map((inv) => ({
                  label: `#${inv.invoiceNumber} (${formatDisplayDate(inv.invoiceDate)} - ₹${inv.grandTotal})`,
                  value: inv.id,
                })),
                placeholder: "-- Select Invoice (Optional) --",
              },
              {
                id: "reason",
                label: "Reason for Return",
                type: "text",
                value: notes,
                onChange: setNotes,
                placeholder: "e.g. Sales Return / Defective Goods",
              },
            ]}
          />

          {/* MAIN 2-COLUMN WORKSPACE MATCHING REFERENCE IMAGE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column (8 cols): Items & Services Table + Notes & Additional Info */}
            <div className="lg:col-span-8 space-y-5">
              <DocumentItemsCard
                title="Return Line Items"
                itemsCount={lineItems.length}
                totalQty={totalQuantity}
                itemsTotal={calculatedGrandTotal}
                onImportItems={() => setIsAddItemsModalOpen(true)}
                onAddItem={() => setIsAddItemsModalOpen(true)}
                onAddBlankRow={() => {
                  const newRow: ReturnLineItem = {
                    id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                    name: "Return Item",
                    description: "",
                    hsn: "1001",
                    quantity: 1,
                    unit: "PCS",
                    unitPrice: 0,
                    discountValue: 0,
                    discountType: "PERCENT",
                    taxRate: 18,
                  };
                  setLineItems((curr) => [...curr, newRow]);
                }}
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
                    {itemCalculations.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400">
                          <div className="max-w-xs mx-auto space-y-2">
                            <span className="text-2xl">📦</span>
                            <p className="font-bold text-slate-700">No return items added yet</p>
                            <p className="text-[11px] text-slate-400">Add an item or select an original invoice above</p>
                            <button
                              type="button"
                              onClick={() => setIsAddItemsModalOpen(true)}
                              className="px-3.5 py-1.5 bg-[#174B43] text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer"
                            >
                              + Add Item
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      itemCalculations.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>

                          <td className="py-3 px-3">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateLineItem(item.id, { name: e.target.value })}
                              placeholder="Item name / description"
                              className="w-full text-xs py-1.5 px-2.5 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#26A58A] rounded-xl font-bold text-slate-800"
                            />
                          </td>

                          <td className="py-3 px-3">
                            <input
                              type="text"
                              value={item.hsn}
                              onChange={(e) => updateLineItem(item.id, { hsn: e.target.value })}
                              className="w-full text-xs py-1.5 px-2 text-center font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white"
                              placeholder="HSN"
                            />
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                              <input
                                type="number"
                                min="0.001"
                                step="any"
                                value={item.quantity}
                                onChange={(e) => updateLineItem(item.id, { quantity: Number(e.target.value) || 0 })}
                                className="w-full text-xs text-right font-mono font-bold text-slate-800 bg-transparent focus:outline-none"
                              />
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.unitPrice}
                              onChange={(e) => updateLineItem(item.id, { unitPrice: Number(e.target.value) || 0 })}
                              className="w-full text-xs py-1.5 px-2 text-right font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white"
                            />
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                              <input
                                type="number"
                                min="0"
                                value={item.discountValue}
                                onChange={(e) => updateLineItem(item.id, { discountValue: Number(e.target.value) || 0 })}
                                placeholder="0"
                                className="w-full text-xs text-right font-mono bg-transparent focus:outline-none"
                              />
                              <span className="text-[10px] text-slate-400">%</span>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <select
                              value={item.taxRate}
                              onChange={(e) => updateLineItem(item.id, { taxRate: Number(e.target.value) || 0 })}
                              className="w-full text-xs py-1.5 px-2 text-right font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white"
                            >
                              {GST_RATES.map((r) => (
                                <option key={r.label} value={r.value}>
                                  {r.label}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-black text-slate-900 text-xs">
                            {formatInr(item.totalAmount)}
                          </td>

                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeLineItem(item.id)}
                              className="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                              title="Delete row"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
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

            {/* Right Column (4 cols): Summary Card + Payment/Adjustment Card */}
            <div className="lg:col-span-4 space-y-5">
              <DocumentSummaryCard
                title={`${docLabel} Valuation`}
                subtotal={subtotalTaxable}
                discount={Number(discountAmount) > 0 ? Number(discountAmount) : undefined}
                roundOff={autoRoundOff ? roundOffAmount : undefined}
                grandTotal={calculatedGrandTotal}
              />

              <DocumentPaymentCard
                amountReceived={isMarkAsFullyPaid ? calculatedGrandTotal : amountReceived}
                onAmountReceivedChange={(val) => {
                  setIsMarkAsFullyPaid(false);
                  setAmountReceived(val === "" ? "0" : String(val));
                }}
                paymentMode={paymentMode}
                onPaymentModeChange={setPaymentMode}
                balanceDue={balanceAmount}
                onPaidInFull={() => {
                  setIsMarkAsFullyPaid(true);
                  setAmountReceived(String(calculatedGrandTotal));
                }}
              />
            </div>
          </div>

          {/* STICKY BOTTOM ACTION BAR */}
          <DocumentBottomBar
            totalItems={lineItems.length}
            totalAmount={calculatedGrandTotal}
            onSaveAsDraft={() => handleSaveReturn(true)}
            onSave={() => handleSaveReturn(false)}
            isSaving={isSaving}
            saveButtonLabel={`Save ${docLabel}`}
            backHref={isDebitNote ? "/sales/debit-note" : "/sales/credit-note"}
          />
        </main>

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
