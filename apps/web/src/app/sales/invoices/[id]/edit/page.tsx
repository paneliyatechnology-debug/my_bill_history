"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../../context/auth-context";
import { apiClient, extractList } from "../../../../../lib/api-client";

interface PartyOption {
  id: string;
  name: string;
  nameGujarati?: string;
  gstin?: string;
  stateCode: string;
  phone?: string;
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
  const [paymentMode, setPaymentMode] = useState("UNPAID_CREDIT");
  const [placeOfSupply, setPlaceOfSupply] = useState(
    currentCompany?.stateCode || "24",
  );
  const [notes, setNotes] = useState("");
  const [isTaxInclusive, setIsTaxInclusive] = useState(false);

  const [rows, setRows] = useState<InvoiceItemRow[]>([]);

  const fetchInvoiceAndData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [invRes, partiesRes, itemsRes]: any = await Promise.all([
        apiClient.get(`/invoices/sales/${id}`),
        apiClient.get("/parties", { type: "CUSTOMER" }),
        apiClient.get("/items"),
      ]);

      const pList = extractList<PartyOption>(partiesRes);
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
        setPaymentMode(invRes.paymentMode || "UNPAID_CREDIT");
        setPlaceOfSupply(invRes.placeOfSupply || currentCompany?.stateCode || "24");
        setNotes(invRes.notes || "");
        setExistingPaidAmount(Number(invRes.paidAmount || 0));

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
    if (selected?.stateCode) {
      setPlaceOfSupply(selected.stateCode);
    }
  };

  const handleItemSelect = (idx: number, itId: string) => {
    const item = items.find((i) => i.id === itId);
    if (!item) return;

    const updated = [...rows];
    updated[idx] = {
      ...updated[idx],
      itemId: item.id,
      hsnCode: item.hsnCode || "1001",
      unitPrice: item.retailPrice,
      taxRate: item.taxRate,
    };
    setRows(updated);
  };

  const handleRowChange = (
    idx: number,
    field: keyof InvoiceItemRow,
    val: any,
  ) => {
    const updated = [...rows];
    updated[idx] = { ...updated[idx], [field]: val };
    setRows(updated);
  };

  const handleAddRow = () => {
    const firstItem = items[0];
    setRows([
      ...rows,
      {
        itemId: firstItem?.id || "",
        hsnCode: firstItem?.hsnCode || "1001",
        quantity: 1,
        unitPrice: firstItem?.retailPrice || 100,
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
  const companyState = currentCompany?.stateCode || "24";
  const isInterState = placeOfSupply !== companyState;

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

  const totalTax = totalCgst + totalSgst + totalIgst;
  const rawTotal = totalTaxable + totalTax;
  const grandTotal = Math.round(rawTotal);
  const roundOff = grandTotal - rawTotal;
  const pendingBalance = Math.max(0, grandTotal - existingPaidAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      paymentMode,
      placeOfSupply,
      notes,
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
      await apiClient.put(`/invoices/sales/${id}`, payload);
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
            <Link href={`/sales/invoices/${id}`} className="hover:text-primary font-mono">
              {invoiceNumber}
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-700">
              {lang === "gu" ? "સુધારો (Edit)" : "Edit"}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>✏️</span>
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
            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition-all"
          >
            {lang === "gu" ? "← બહાર નીકળો" : "← Exit / Cancel"}
          </Link>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-pressed text-white text-xs font-bold rounded-xl shadow-saffron transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{lang === "gu" ? "સાચવી રહ્યું છે..." : "Saving Changes..."}</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span>{lang === "gu" ? "બિલ અપડેટ કરો" : "Update Sales Invoice"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* 2. Customer & Basic Meta Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
          {lang === "gu" ? "૧. ગ્રાહક અને બિલિંગ વિગતો" : "1. Customer & Invoice Details"}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === "gu" ? "ગ્રાહક (Customer / Party) *" : "Customer / Party *"}
            </label>
            <select
              value={partyId}
              onChange={(e) => handlePartyChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              <option value="">{lang === "gu" ? "-- ગ્રાહક પસંદ કરો --" : "-- Select Customer --"}</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.gstin ? `(${p.gstin})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === "gu" ? "બિલ પ્રકાર (Document Category)" : "Document Category"}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              <option value="TAX_INVOICE">Tax Invoice</option>
              <option value="BILL_OF_SUPPLY">Bill of Supply</option>
              <option value="PROFORMA_INVOICE">Proforma Invoice</option>
              <option value="DELIVERY_CHALLAN">Delivery Challan</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === "gu" ? "તારીખ (Invoice Date)" : "Invoice Date"}
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === "gu" ? "ચુકવણી મોડ (Payment Mode)" : "Payment Mode"}
            </label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              <option value="UNPAID_CREDIT">Unpaid / Credit (બાકી)</option>
              <option value="CASH">Cash (રોકડ)</option>
              <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
              <option value="UPI">UPI Payment</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === "gu" ? "પુરવઠાનું સ્થળ (Place of Supply)" : "Place of Supply"}
            </label>
            <input
              type="text"
              value={placeOfSupply}
              onChange={(e) => setPlaceOfSupply(e.target.value)}
              placeholder="24"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              {isInterState ? "⚠️ Inter-State (IGST Applicable)" : "✓ Intra-State (CGST + SGST Applicable)"}
            </span>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === "gu" ? "ખાસ નોંધ (Notes / Instructions)" : "Notes / Remarks"}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Thanks for your business!"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 3. Line Items Table Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {lang === "gu" ? "૨. વસ્તુઓ / સેવાઓ (Line Items)" : "2. Items / Products & Services"}
          </h2>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
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
              className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg transition-all flex items-center gap-1"
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
                    <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2 px-3">
                      <select
                        value={row.itemId}
                        onChange={(e) => handleItemSelect(idx, e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none"
                      >
                        <option value="">-- Select Item --</option>
                        {items.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.name} (₹{it.retailPrice})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={row.hsnCode}
                        onChange={(e) => handleRowChange(idx, "hsnCode", e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-primary/20 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="1"
                        value={row.quantity}
                        onChange={(e) => handleRowChange(idx, "quantity", e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-right focus:ring-2 focus:ring-primary/20 focus:outline-none font-bold"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.unitPrice}
                        onChange={(e) => handleRowChange(idx, "unitPrice", e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-right focus:ring-2 focus:ring-primary/20 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={row.discountPercent}
                        onChange={(e) => handleRowChange(idx, "discountPercent", e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-right focus:ring-2 focus:ring-primary/20 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={row.taxRate}
                        onChange={(e) => handleRowChange(idx, "taxRate", Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-right focus:ring-2 focus:ring-primary/20 focus:outline-none"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      ₹{lineTotal.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                          title="Remove Line Item"
                        >
                          ✕
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

      {/* 4. Calculation Summary Card */}
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
              <span className="font-bold">✓ Already Paid Amount:</span> ₹{existingPaidAmount.toFixed(2)}
            </div>
          )}
        </div>

        <div className="w-full md:w-80 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          <div className="flex justify-between text-slate-700">
            <span>{lang === "gu" ? "કરપાત્ર રકમ (Taxable):" : "Taxable Value:"}</span>
            <span className="font-mono font-semibold text-slate-900">₹{totalTaxable.toFixed(2)}</span>
          </div>

          {!isInterState ? (
            <>
              <div className="flex justify-between text-slate-700">
                <span>CGST:</span>
                <span className="font-mono text-slate-900">₹{totalCgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>SGST:</span>
                <span className="font-mono text-slate-900">₹{totalSgst.toFixed(2)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between text-slate-700">
              <span>IGST:</span>
              <span className="font-mono text-slate-900">₹{totalIgst.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-slate-700">
            <span>Total GST Tax:</span>
            <span className="font-mono text-slate-900">₹{totalTax.toFixed(2)}</span>
          </div>

          {roundOff !== 0 && (
            <div className="flex justify-between text-slate-700">
              <span>Round-off:</span>
              <span className="font-mono text-slate-900">₹{roundOff.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200 text-sm">
            <span>{lang === "gu" ? "કુલ બિલ રકમ (Grand Total):" : "Grand Total:"}</span>
            <span className="font-mono text-primary text-base">₹{grandTotal.toFixed(2)}</span>
          </div>

          {existingPaidAmount > 0 && (
            <div className="flex justify-between text-emerald-700 font-semibold pt-1">
              <span>Less: Paid:</span>
              <span className="font-mono">-₹{existingPaidAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between font-bold text-amber-900 pt-1 border-t border-slate-200">
            <span>{lang === "gu" ? "ચોખ્ખી બાકી રકમ (Balance):" : "Outstanding Balance:"}</span>
            <span className="font-mono">₹{pendingBalance.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 5. Bottom Fixed Save Bar */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <Link
          href={`/sales/invoices/${id}`}
          className="px-5 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition-all"
        >
          {lang === "gu" ? "રદ કરો (Cancel)" : "Cancel"}
        </Link>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-pressed text-white text-xs font-bold rounded-xl shadow-saffron transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>{lang === "gu" ? "સાચવી રહ્યું છે..." : "Saving Changes..."}</span>
            </>
          ) : (
            <>
              <span>💾</span>
              <span>{lang === "gu" ? "બિલ અપડેટ કરો (Update Invoice)" : "Update Sales Invoice"}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
