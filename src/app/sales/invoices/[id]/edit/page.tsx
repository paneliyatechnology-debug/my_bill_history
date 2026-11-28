"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../../context/auth-context";
import { apiClient, extractList } from "../../../../../lib/api-client";
import { getPartyItemPrice, getPartyItemDiscount } from "../../../../../lib/party-item-pricing";
import { Pencil, Save, AlertTriangle, Check, X } from "lucide-react";
import { CustomSelect, CustomCombobox } from "@/components/ui/dropdown-system";
import { CleanNumberInput } from "@/components/ui/clean-number-input";
import { CustomDatePicker } from "@/components/ui/custom-datepicker";
import { DocumentAdditionalInfoCard } from "@/components/document-studio/document-lower-sections";

interface PartyOption {
  id: string;
  name: string;
  nameGujarati?: string;
  gstin?: string;
  stateCode: string;
  phone?: string;
  type?: string;
}

interface ItemOption {
  id: string;
  name: string;
  nameGujarati?: string;
  hsnCode: string;
  taxRate: number;
  retailPrice: number;
  stockQuantity?: number;
  unit?: string;
}

interface InvoiceItemRow {
  itemId: string;
  hsnCode: string;
  quantity: number | "";
  unitPrice: number | "";
  discountPercent: number | "";
  taxRate: number;
  isManualRate?: boolean;
}

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { lang, tenantContext, currentCompany } = useAuth();

  const [parties, setParties] = useState<PartyOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [existingPaidAmount, setExistingPaidAmount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [category, setCategory] = useState<
    "TAX_INVOICE" | "PROFORMA_INVOICE" | "BILL_OF_SUPPLY" | "DELIVERY_CHALLAN"
  >("TAX_INVOICE");
  const [partyId, setPartyId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [paymentMode, setPaymentMode] = useState("UNPAID_CREDIT");
  const [placeOfSupply, setPlaceOfSupply] = useState(
    currentCompany?.stateCode || "24",
  );
  const [notes, setNotes] = useState("");
  const [isTaxInclusive, setIsTaxInclusive] = useState(false);

  // Additional Shipping & Freight Fields
  const [freightAmount, setFreightAmount] = useState<number | "">("");
  const [overallDiscount, setOverallDiscount] = useState<number | "">("");
  const [loadedTcsMeta, setLoadedTcsMeta] = useState<{ tcsSection?: string; tcsRate?: number; tcsAmount?: number } | null>(null);
  const [transportMode, setTransportMode] = useState("Road");
  const [vehicleNo, setVehicleNo] = useState("");
  const [ewayBillNo, setEwayBillNo] = useState("");
  const [dispatchDate, setDispatchDate] = useState("");

  const [rows, setRows] = useState<InvoiceItemRow[]>([]);

  const fetchInvoiceAndData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [invRes, partiesRes, itemsRes]: any = await Promise.all([
        apiClient.get(`/sales/invoices/${id}`),
        apiClient.get("/masters/parties", { type: "CUSTOMER", limit: 500 }),
        apiClient.get("/masters/items", { limit: 500 }),
      ]);

      const pList = extractList<PartyOption>(partiesRes).filter(
        (p) => p.type === "CUSTOMER" || p.type === "BOTH" || (!p.type && (p as any).isCustomer),
      );
      const iList = extractList<ItemOption>(itemsRes);
      setParties(pList);
      setItems(iList);

      if (invRes) {
        setInvoiceNumber(invRes.invoiceNumber || "");
        setCategory(invRes.category || "TAX_INVOICE");
        setPartyId(invRes.partyId || invRes.party?.id || "");
        setInvoiceDate(
          invRes.invoiceDate
            ? new Date(invRes.invoiceDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
        );
        setDueDate(
          invRes.dueDate
            ? new Date(invRes.dueDate).toISOString().split("T")[0]
            : "",
        );
        setPaymentMode(invRes.paymentMode || "UNPAID_CREDIT");
        setPlaceOfSupply(invRes.placeOfSupply || currentCompany?.stateCode || "24");
        setNotes(invRes.notes || "");
        setIsTaxInclusive(
          Boolean(
            invRes.isTaxInclusive ??
              (Array.isArray(invRes.items) && invRes.items[0]?.isTaxInclusive),
          ),
        );
        setExistingPaidAmount(Number(invRes.paidAmount || 0));

        const shipAddr: any = invRes.shippingAddress || {};
        const loadedFreight = Number(
          invRes.freightAmount ??
          invRes.freight ??
          shipAddr.freightAmount ??
          shipAddr.freight ??
          (invRes.additionalCharges
            ? Array.isArray(invRes.additionalCharges)
              ? invRes.additionalCharges.reduce((a: number, b: any) => a + (Number(b.amount) || 0), 0)
              : invRes.additionalCharges
            : 0)
        );
        setFreightAmount(loadedFreight > 0 ? loadedFreight : "");
        const loadedDisc = Number(invRes.discountAmount ?? invRes.billDiscount ?? invRes.overallDiscount ?? 0);
        setOverallDiscount(loadedDisc > 0 ? loadedDisc : "");
        if (shipAddr.tcsSection) {
          setLoadedTcsMeta({
            tcsSection: shipAddr.tcsSection,
            tcsRate: shipAddr.tcsRate,
            tcsAmount: shipAddr.tcsAmount,
          });
        } else {
          setLoadedTcsMeta(null);
        }
        if (shipAddr.vehicleNo || (invRes as any).vehicleNumber) {
          setVehicleNo(shipAddr.vehicleNo || (invRes as any).vehicleNumber || "");
        }
        if (shipAddr.transportMode) {
          setTransportMode(shipAddr.transportMode);
        }
        if (shipAddr.ewayBillNo || (invRes as any).ewayBillNo) {
          setEwayBillNo(shipAddr.ewayBillNo || (invRes as any).ewayBillNo || "");
        }
        if (shipAddr.dispatchDate) {
          setDispatchDate(
            shipAddr.dispatchDate.includes("T")
              ? shipAddr.dispatchDate.split("T")[0]
              : shipAddr.dispatchDate,
          );
        }

        if (Array.isArray(invRes.items) && invRes.items.length > 0) {
          setRows(
            invRes.items.map((it: any) => ({
              itemId: it.itemId || it.item?.id || "",
              hsnCode: it.hsnCode || "9999",
              quantity: Number(it.quantity) || 1,
              unitPrice: Number(it.unitPrice) || 0,
              discountPercent: Number(it.discountPercent) || 0,
              taxRate: Number(it.taxRate) || 0,
            })),
          );
        } else if (iList.length > 0) {
          setRows([
            {
              itemId: iList[0].id,
              hsnCode: iList[0].hsnCode || "9999",
              quantity: 1,
              unitPrice: iList[0].retailPrice || 100,
              discountPercent: 0,
              taxRate: iList[0].taxRate ?? 5,
            },
          ]);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load sales invoice.");
    } finally {
      setIsLoading(false);
    }
  }, [id, currentCompany?.stateCode]);

  useEffect(() => {
    if (tenantContext.companyId && id) {
      fetchInvoiceAndData();
    }
  }, [tenantContext.companyId, id, fetchInvoiceAndData]);

  const handlePartyChange = (pId: string) => {
    setPartyId(pId);
    const selected = parties.find((p) => p.id === pId);
    const resolvedState =
      selected?.stateCode ||
      (selected?.gstin && selected.gstin.length >= 2 ? selected.gstin.slice(0, 2) : "");
    if (resolvedState) {
      setPlaceOfSupply(resolvedState);
    }

    // Automatically recalculate item prices & party discounts in existing rows only if not manually overridden
    setRows((prevRows) =>
      prevRows.map((r) => {
        if (!r.itemId || r.isManualRate) return r;
        const it = items.find((i) => i.id === r.itemId);
        const partyPrice = getPartyItemPrice(pId, r.itemId, selected?.name, it?.name);
        const partyDisc = getPartyItemDiscount(pId, r.itemId, selected?.name, it?.name);
        const nextDisc = partyDisc !== null ? partyDisc : r.discountPercent;
        if (partyPrice !== null) {
          return { ...r, unitPrice: partyPrice, discountPercent: nextDisc };
        } else if (it && (Number(r.unitPrice) || 0) === 0) {
          return { ...r, unitPrice: it.retailPrice, discountPercent: nextDisc };
        } else if (partyDisc !== null) {
          return { ...r, discountPercent: nextDisc };
        }
        return r;
      })
    );
  };

  const handleItemSelect = (idx: number, itId: string) => {
    const item = items.find((i) => i.id === itId);
    if (!item) return;

    const selected = parties.find((p) => p.id === partyId);
    const partyPrice = partyId
      ? getPartyItemPrice(partyId, item.id, selected?.name, item.name)
      : null;
    const partyDisc = partyId
      ? getPartyItemDiscount(partyId, item.id, selected?.name, item.name)
      : null;
    const effectiveUnitPrice = partyPrice !== null ? partyPrice : item.retailPrice;

    const updated = [...rows];
    updated[idx] = {
      ...updated[idx],
      itemId: item.id,
      hsnCode: item.hsnCode || "1001",
      unitPrice: effectiveUnitPrice,
      discountPercent: partyDisc !== null ? partyDisc : updated[idx].discountPercent,
      taxRate: item.taxRate,
      isManualRate: false,
    };
    setRows(updated);
  };

  const handleRowChange = (
    idx: number,
    field: keyof InvoiceItemRow,
    val: any,
  ) => {
    const updated = [...rows];
    updated[idx] = {
      ...updated[idx],
      [field]: val,
      ...(field === "unitPrice" ? { isManualRate: true } : {}),
    };
    setRows(updated);
  };

  const handleAddRow = () => {
    const firstItem = items[0];
    const selected = parties.find((p) => p.id === partyId);
    const partyPrice =
      partyId && firstItem?.id
        ? getPartyItemPrice(partyId, firstItem.id, selected?.name, firstItem.name)
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
        taxRate: firstItem?.taxRate ?? 5,
      },
    ]);
  };

  const handleRemoveRow = (idx: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== idx));
  };

  // Statutory GST tax calculations
  const companyState = String(currentCompany?.stateCode || "24").trim().slice(0, 2);
  const normalizedPos = String(placeOfSupply || companyState).trim().slice(0, 2);
  const isInterState = normalizedPos !== companyState;

  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  rows.forEach((r) => {
    const qty = Number(r.quantity) || 0;
    const rate = Number(r.unitPrice) || 0;
    const disc = Number(r.discountPercent) || 0;
    const gross = qty * rate;
    const grossAfterDisc = gross - (gross * disc) / 100;

    let taxable = grossAfterDisc;
    let taxAmount = 0;
    if (isTaxInclusive) {
      taxable = grossAfterDisc / (1 + r.taxRate / 100);
      taxAmount = grossAfterDisc - taxable;
    } else {
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

  const freightVal = Number(freightAmount) || 0;
  const freightTaxRate = rows.reduce((max, r) => Math.max(max, Number(r.taxRate) || 0), 0);
  if (freightVal > 0 && freightTaxRate > 0) {
    const freightTax = (freightVal * freightTaxRate) / 100;
    if (isInterState) {
      totalIgst += freightTax;
    } else {
      totalCgst += freightTax / 2;
      totalSgst += freightTax / 2;
    }
  }
  const totalTax = totalCgst + totalSgst + totalIgst;
  const overallDiscVal = Number(overallDiscount) || 0;
  const rawTotal = Math.max(0, totalTaxable + totalTax + freightVal - overallDiscVal);
  const grandTotal = Math.round(rawTotal);
  const roundOff = Number((grandTotal - rawTotal).toFixed(2));
  const pendingBalance = Math.max(0, grandTotal - existingPaidAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!partyId) {
      setError(lang === "gu" ? "કૃપા કરીને ગ્રાહક પસંદ કરો." : "Please select a customer/party.");
      return;
    }
    if (rows.some((r) => !r.itemId || Number(r.quantity) <= 0)) {
      setError(lang === "gu" ? "તમામ આઇટમ્સમાં જથ્થો શૂન્યથી વધુ હોવો જોઈએ." : "All items must have valid quantity > 0.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      category,
      partyId,
      invoiceDate: new Date(invoiceDate).toISOString(),
      dueDate: dueDate ? new Date(dueDate.includes("T") ? dueDate : `${dueDate}T00:00:00.000Z`).toISOString() : undefined,
      paymentMode,
      placeOfSupply,
      notes,
      isTaxInclusive,
      discountType: "AFTER_TAX",
      discountAmount: overallDiscVal,
      additionalCharges: freightVal > 0 ? [{ name: "Freight", amount: freightVal, taxRate: freightTaxRate }] : [],
      freightAmount: freightVal > 0 ? freightVal : 0,
      freightTaxRate,
      vehicleNumber: vehicleNo || undefined,
      shippingAddress: {
        freight: freightVal,
        freightAmount: freightVal,
        freightTaxRate,
        ...(vehicleNo ? { vehicleNo } : {}),
        ...(transportMode ? { transportMode } : {}),
        ...(ewayBillNo ? { ewayBillNo } : {}),
        ...(dispatchDate ? { dispatchDate } : {}),
        ...(loadedTcsMeta?.tcsSection
          ? {
              tcsSection: loadedTcsMeta.tcsSection,
              tcsRate: loadedTcsMeta.tcsRate,
              tcsAmount:
                Math.round(
                  ((grandTotal * (Number(loadedTcsMeta.tcsRate) || 0.1)) / 100) * 100,
                ) / 100,
            }
          : {}),
      },
      items: rows.map((r) => ({
        itemId: r.itemId,
        hsnCode: r.hsnCode,
        quantity: Number(r.quantity),
        unitPrice: Number(r.unitPrice),
        discountPercent: Number(r.discountPercent) || 0,
        taxRate: Number(r.taxRate),
        isTaxInclusive,
      })),
    };

    try {
      await apiClient.put(`/sales/invoices/${id}`, payload);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("refresh-notifications"));
      }
      router.push(`/sales/invoices/${id}`);
    } catch (err: any) {
      setError(err.message || "Failed to update sales invoice.");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 space-y-3">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold">
          {lang === "gu" ? "ઇન્વોઇસ લોડ થઈ રહ્યું છે..." : "Loading invoice details..."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header with Breadcrumb & Action */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/sales/invoices" className="hover:text-primary">
              {lang === "gu" ? "સેલ્સ ઇન્વોઇસ" : "Sales Invoices"}
            </Link>
            <span>/</span>
            <Link href={`/sales/invoices/${id}`} className="hover:text-primary tabular-nums">
              {invoiceNumber}
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-700">
              {lang === "gu" ? "સુધારો (Edit)" : "Edit"}
            </span>
          </div>
          <h1 className="text-[22px] font-semibold text-[#182230] tracking-tight flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" />
            <span>
              {lang === "gu" ? "વેચાણ બિલ સુધારો" : "Edit Sales Invoice"} #{invoiceNumber}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === "gu"
              ? "આઇટમ્સ, રેટ, ટેક્સ અને ગ્રાહકની વિગતો બદલો. અગાઉ મળેલ ચુકવણી આપમેળે હિસાબમાં લેવાશે."
              : "Update items, rates, taxes, or customer details. Existing payments will remain credited."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/sales/invoices/${id}`}
            className="h-9 px-3 border border-slate-300 text-slate-700 hover:bg-slate-50 text-[13px] font-medium rounded-xl transition-all"
          >
            {lang === "gu" ? "← બહાર નીકળો" : "← Exit / Cancel"}
          </Link>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-9 px-3.5 bg-primary hover:bg-primary-hover active:bg-primary-pressed text-white text-[13px] font-medium rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{lang === "gu" ? "સાચવી રહ્યું છે..." : "Saving Changes..."}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{lang === "gu" ? "બિલ અપડેટ કરો" : "Update Sales Invoice"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Customer & Basic Meta Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
        <h2 className="text-xs font-semibold text-[#182230] uppercase tracking-wider border-b border-slate-100 pb-2">
          {lang === "gu" ? "૧. ગ્રાહક અને બિલિંગ વિગતો" : "1. Customer & Invoice Details"}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-[12px] font-medium text-slate-700 mb-1">
              {lang === "gu" ? "બિલ નંબર (Invoice No.)" : "Invoice No."}
            </label>
            <div className="relative">
              <input
                type="text"
                readOnly
                tabIndex={-1}
                value={invoiceNumber}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-mono font-semibold text-slate-800 cursor-default select-all focus:outline-none h-10 tabular-nums"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-200/70 px-1.5 py-0.5 rounded pointer-events-none">
                Fixed
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-slate-700 mb-1">
              {lang === "gu" ? "ગ્રાહક (Customer / Party) *" : "Customer / Party *"}
            </label>
            <CustomCombobox
              value={partyId}
              onChange={(val: any) => handlePartyChange(val)}
              options={parties.map((p) => ({
                value: p.id,
                label: `${p.name} ${p.gstin ? `(${p.gstin})` : ""}`,
              }))}
              placeholder={lang === "gu" ? "-- ગ્રાહક પસંદ કરો --" : "-- Select Customer --"}
              triggerClassName="rounded-lg border-slate-300"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-slate-700 mb-1">
              {lang === "gu" ? "બિલ પ્રકાર (Document Category)" : "Document Category"}
            </label>
            <CustomSelect
              value={category}
              onChange={(val: any) => setCategory(val as any)}
              options={[
                { value: "TAX_INVOICE", label: "Tax Invoice" },
                { value: "BILL_OF_SUPPLY", label: "Bill of Supply" },
                { value: "PROFORMA_INVOICE", label: "Proforma Invoice" },
                { value: "DELIVERY_CHALLAN", label: "Delivery Challan" },
              ]}
              triggerClassName="rounded-lg border-slate-300"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-slate-700 mb-1">
              {lang === "gu" ? "તારીખ (Invoice Date)" : "Invoice Date"}
            </label>
            <CustomDatePicker
              value={invoiceDate}
              onChange={(val) => setInvoiceDate(val)}
              placeholder="DD/MM/YYYY"
              triggerClassName="rounded-lg border-slate-300 h-10"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-slate-700 mb-1">
              {lang === "gu" ? "મુદત તારીખ (Due Date)" : "Due Date"}
            </label>
            <CustomDatePicker
              value={dueDate}
              onChange={(val) => setDueDate(val)}
              placeholder="DD/MM/YYYY"
              triggerClassName="rounded-lg border-slate-300 h-10"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-slate-700 mb-1">
              {lang === "gu" ? "ચુકવણી મોડ (Payment Mode)" : "Payment Mode"}
            </label>
            <CustomSelect
              value={paymentMode}
              onChange={(val: any) => setPaymentMode(val)}
              options={[
                { value: "UNPAID_CREDIT", label: lang === "gu" ? "Unpaid / Credit (બાકી)" : "Unpaid / Credit" },
                { value: "CASH", label: lang === "gu" ? "Cash (રોકડ)" : "Cash" },
                { value: "BANK_TRANSFER", label: "Bank Transfer / NEFT" },
                { value: "UPI", label: "UPI Payment" },
                { value: "CHEQUE", label: "Cheque" },
              ]}
              triggerClassName="rounded-lg border-slate-300"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-[12px] font-medium text-slate-700 mb-1">
              {lang === "gu" ? "પુરવઠાનું સ્થળ (Place of Supply)" : "Place of Supply"}
            </label>
            <input
              type="text"
              value={placeOfSupply}
              onChange={(e) => setPlaceOfSupply(e.target.value)}
              placeholder="24"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[13px] tabular-nums font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none h-10"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 inline-flex items-center gap-1">
              {isInterState ? (
                <>
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  <span>Inter-State (IGST Applicable)</span>
                </>
              ) : (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>Intra-State (CGST + SGST Applicable)</span>
                </>
              )}
            </span>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[12px] font-medium text-slate-700 mb-1">
              {lang === "gu" ? "ખાસ નોંધ (Notes / Instructions)" : "Notes / Remarks"}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Thanks for your business!"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[13px] font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none h-10"
            />
          </div>
        </div>
      </div>

      {/* 3. Line Items Table Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-xs font-semibold text-[#182230] uppercase tracking-wider">
            {lang === "gu" ? "૨. વસ્તુઓ / સેવાઓ (Line Items)" : "2. Items / Products & Services"}
          </h2>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer text-[12px] font-medium text-slate-700">
              <input
                type="checkbox"
                checked={isTaxInclusive}
                onChange={(e) => setIsTaxInclusive(e.target.checked)}
                className="rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span>{lang === "gu" ? "ભાવમાં ટેક્સ સામેલ છે (Tax Inclusive)" : "Tax Inclusive Rates"}</span>
            </label>
            <button
              type="button"
              onClick={handleAddRow}
              className="h-9 px-3 bg-primary/10 hover:bg-primary/20 text-primary text-[13px] font-medium rounded-lg transition-all flex items-center gap-1"
            >
              <span>+ Add Item</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3 min-w-[220px]">{lang === "gu" ? "પ્રોડક્ટ / આઇટમ" : "Item / Product"}</th>
                <th className="py-2.5 px-3 w-24">HSN</th>
                <th className="py-2.5 px-3 w-20 text-right">{lang === "gu" ? "જથ્થો" : "Qty"}</th>
                <th className="py-2.5 px-3 w-28 text-right">{lang === "gu" ? "ભાવ (₹)" : "Rate (₹)"}</th>
                <th className="py-2.5 px-3 w-20 text-right">{lang === "gu" ? "ડિસ્ક. %" : "Disc %"}</th>
                <th className="py-2.5 px-3 w-24 text-right">GST %</th>
                <th className="py-2.5 px-3 w-28 text-right">{lang === "gu" ? "કુલ (₹)" : "Total (₹)"}</th>
                <th className="py-2.5 px-3 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, idx) => {
                const q = Number(row.quantity) || 0;
                const r = Number(row.unitPrice) || 0;
                const d = Number(row.discountPercent) || 0;
                const gross = q * r - (q * r * d) / 100;
                const lineTotal = isTaxInclusive
                  ? gross
                  : gross + (gross * row.taxRate) / 100;

                return (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2 px-3 text-slate-400 tabular-nums">{idx + 1}</td>
                    <td className="py-2 px-3">
                      <CustomCombobox
                        size="sm"
                        value={row.itemId}
                        onChange={(val: any) => handleItemSelect(idx, val)}
                        options={items.map((it) => ({
                          value: it.id,
                          label: `${it.name} (₹${it.retailPrice})`,
                        }))}
                        placeholder="-- Select Item --"
                        triggerClassName="rounded-lg border-slate-300"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={row.hsnCode}
                        onChange={(e) => handleRowChange(idx, "hsnCode", e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-[13px] tabular-nums focus:ring-2 focus:ring-primary/20 focus:outline-none h-10"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <CleanNumberInput
                        value={row.quantity}
                        onChange={(val) => handleRowChange(idx, "quantity", val)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-[13px] tabular-nums text-center focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/10 focus:bg-white font-normal h-10"
                        placeholder="1"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <CleanNumberInput
                        value={row.unitPrice}
                        onChange={(val) => handleRowChange(idx, "unitPrice", val)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-[13px] tabular-nums text-right focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/10 focus:bg-white h-10"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <CleanNumberInput
                        value={row.discountPercent}
                        onChange={(val) => handleRowChange(idx, "discountPercent", val)}
                        placeholder="0"
                        suffix={<span className="text-[10px] text-slate-400 font-bold ml-1">%</span>}
                        className="w-full text-[13px] tabular-nums text-right focus:outline-none bg-transparent"
                        containerClassName="px-2 py-1.5 border border-slate-300 rounded-lg h-10 focus-within:ring-2 focus-within:ring-primary/20"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <CleanNumberInput
                        value={row.taxRate}
                        onChange={(val) => handleRowChange(idx, "taxRate", val)}
                        placeholder="0"
                        list="gst-rates-edit-table"
                        suffix={<span className="text-[11px] font-bold text-slate-400 pointer-events-none ml-1">%</span>}
                        className="w-full text-[13px] tabular-nums text-right focus:outline-none bg-transparent"
                        containerClassName="relative flex items-center min-w-[70px] px-2 py-1.5 border border-slate-300 rounded-lg h-10 focus-within:ring-2 focus-within:ring-primary/20"
                      />
                      <datalist id="gst-rates-edit-table">
                        <option value="0">0% (None)</option>
                        <option value="0.1">0.1%</option>
                        <option value="0.25">0.25%</option>
                        <option value="3">3%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </datalist>
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-medium text-slate-900">
                      ₹{lineTotal.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1 rounded"
                          title="Remove Line Item"
                          aria-label="Remove Line Item"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Additional Shipping & Freight Info */}
      <DocumentAdditionalInfoCard
        transportMode={transportMode}
        onTransportModeChange={setTransportMode}
        vehicleNo={vehicleNo}
        onVehicleNoChange={setVehicleNo}
        ewayBillNo={ewayBillNo}
        onEwayBillNoChange={setEwayBillNo}
        dispatchDate={dispatchDate}
        onDispatchDateChange={setDispatchDate}
        freightAmount={freightAmount}
        onFreightAmountChange={setFreightAmount}
      />

      {/* 5. Calculation Summary Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle flex flex-col md:flex-row items-start justify-between gap-6">
        <div className="space-y-2 text-xs text-slate-500 max-w-sm">
          <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
            {lang === "gu" ? "જીએસટી ટેક્સ વિશ્લેષણ:" : "GST Statutory Summary:"}
          </p>
          <p>
            {isInterState ? "Inter-State Sale: 100% IGST applied to Central Treasury." : "Intra-State Sale: Equal 50/50 split between CGST and SGST."}
          </p>
          {existingPaidAmount > 0 && (
            <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800">
              <span className="font-bold inline-flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Already Paid Amount:</span>
              </span>{" "}
              ₹{existingPaidAmount.toFixed(2)}
            </div>
          )}
        </div>

        <div className="w-full md:w-80 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          <div className="flex justify-between text-slate-700">
            <span>{lang === "gu" ? "કરપાત્ર રકમ (Taxable):" : "Taxable Value:"}</span>
            <span className="tabular-nums font-semibold text-slate-900">₹{totalTaxable.toFixed(2)}</span>
          </div>

          {!isInterState ? (
            <>
              <div className="flex justify-between text-slate-700">
                <span>CGST:</span>
                <span className="tabular-nums text-slate-900">₹{totalCgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>SGST:</span>
                <span className="tabular-nums text-slate-900">₹{totalSgst.toFixed(2)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between text-slate-700">
              <span>IGST:</span>
              <span className="tabular-nums text-slate-900">₹{totalIgst.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-slate-700">
            <span>Total GST Tax:</span>
            <span className="tabular-nums text-slate-900">₹{totalTax.toFixed(2)}</span>
          </div>

          {freightVal > 0 && (
            <div className="flex justify-between text-slate-700 font-medium">
              <span>Freight:</span>
              <span className="tabular-nums text-slate-900">₹{freightVal.toFixed(2)}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 text-slate-700">
            <span>{lang === "gu" ? "કુલ ડિસ્કાઉન્ટ (₹):" : "Overall Discount (₹):"}</span>
            <input
              type="number"
              min="0"
              step="any"
              value={overallDiscount}
              onChange={(e) => setOverallDiscount(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
              placeholder="0.00"
              className="w-24 px-2 py-1 text-right bg-white border border-slate-200 rounded text-xs tabular-nums focus:border-primary focus:outline-none"
            />
          </div>

          {roundOff !== 0 && (
            <div className="flex justify-between text-slate-700">
              <span>Round-off:</span>
              <span className="tabular-nums text-slate-900">₹{roundOff.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200 text-sm">
            <span>{lang === "gu" ? "કુલ બિલ રકમ (Grand Total):" : "Grand Total:"}</span>
            <span className="tabular-nums text-primary text-base">₹{grandTotal.toFixed(2)}</span>
          </div>

          {existingPaidAmount > 0 && (
            <div className="flex justify-between text-emerald-700 font-semibold pt-1">
              <span>Less: Paid:</span>
              <span className="tabular-nums">-₹{existingPaidAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between font-bold text-amber-900 pt-1 border-t border-slate-200">
            <span>{lang === "gu" ? "ચોખ્ખી બાકી રકમ (Balance):" : "Outstanding Balance:"}</span>
            <span className="tabular-nums">₹{pendingBalance.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 5. Bottom Fixed Save Bar */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <Link
          href={`/sales/invoices/${id}`}
          className="h-9 px-3.5 border border-slate-300 text-slate-700 hover:bg-slate-50 text-[13px] font-medium rounded-xl transition-all"
        >
          {lang === "gu" ? "રદ કરો (Cancel)" : "Cancel"}
        </Link>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-pressed text-white text-[13px] font-medium rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>{lang === "gu" ? "સાચવી રહ્યું છે..." : "Saving Changes..."}</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{lang === "gu" ? "બિલ અપડેટ કરો (Update Invoice)" : "Update Sales Invoice"}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
