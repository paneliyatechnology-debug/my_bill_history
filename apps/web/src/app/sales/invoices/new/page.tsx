"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../context/auth-context";
import { apiClient, extractList } from "../../../../lib/api-client";

interface PartyOption {
  id: string;
  name: string;
  gstin?: string;
  stateCode: string;
  phone?: string;
}

interface ItemOption {
  id: string;
  name: string;
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

export default function NewInvoicePage() {
  const router = useRouter();
  const { lang, tenantContext, currentCompany } = useAuth();

  const [parties, setParties] = useState<PartyOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [category, setCategory] = useState<
    "TAX_INVOICE" | "PROFORMA_INVOICE" | "BILL_OF_SUPPLY" | "DELIVERY_CHALLAN"
  >("TAX_INVOICE");
  const [partyId, setPartyId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [paymentMode, setPaymentMode] = useState("UNPAID_CREDIT");
  const [placeOfSupply, setPlaceOfSupply] = useState("24"); // Default Gujarat
  const [notes, setNotes] = useState("");
  const [isTaxInclusive, setIsTaxInclusive] = useState(false);

  const [rows, setRows] = useState<InvoiceItemRow[]>([
    {
      itemId: "",
      hsnCode: "",
      quantity: 1,
      unitPrice: 100,
      discountPercent: 0,
      taxRate: 5,
    },
  ]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [partiesRes, itemsRes]: any = await Promise.all([
        apiClient.get("/parties", { type: "CUSTOMER" }),
        apiClient.get("/items"),
      ]);
      const pList = extractList<PartyOption>(partiesRes);
      const iList = extractList<ItemOption>(itemsRes);
      setParties(pList);
      setItems(iList);

      if (pList.length > 0) {
        setPartyId(pList[0].id);
        setPlaceOfSupply(pList[0].stateCode || "24");
      }
      if (iList.length > 0) {
        setRows([
          {
            itemId: iList[0].id,
            hsnCode: iList[0].hsnCode || "1001",
            quantity: 1,
            unitPrice: iList[0].retailPrice || 100,
            discountPercent: 0,
            taxRate: iList[0].taxRate ?? 5,
          },
        ]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load customers and catalog.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchData();
    }
  }, [tenantContext.companyId, fetchData]);

  const handlePartyChange = (id: string) => {
    setPartyId(id);
    const selected = parties.find((p) => p.id === id);
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
    val: any
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

  // Keyboard shortcut for fast counter billing (F2: Add Item)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        handleAddRow();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

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
      taxable = grossAfterDisc;
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
  const rawGrandTotal = totalTaxable + totalTax;
  const roundedGrandTotal = Math.round(rawGrandTotal);
  const roundOff = roundedGrandTotal - rawGrandTotal;

  const formatInr = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const handleSubmit = async (isDraft: boolean) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const res: any = await apiClient.post(
        "/invoices",
        {
          category,
          partyId: partyId || undefined,
          invoiceDate,
          paymentMode,
          placeOfSupply,
          isDraft: isDraft || category === "PROFORMA_INVOICE",
          notes: notes || undefined,
          items: rows.map((r) => ({
            itemId: r.itemId,
            hsnCode: r.hsnCode,
            quantity: Number(r.quantity) || 1,
            unitPrice: Number(r.unitPrice) || 0,
            discountPercent: Number(r.discountPercent) || 0,
            taxRate: r.taxRate,
            isTaxInclusive,
          })),
        },
        undefined,
        `inv_key_${Date.now()}_${Math.random()}`
      );

      if (res?.id) {
        router.push(`/sales/invoices/${res.id}`);
      } else {
        router.push("/sales/invoices");
      }
    } catch (err: any) {
      setError(
        lang === "gu" && err.messageGujarati
          ? err.messageGujarati
          : err.message || "Failed to create sales invoice."
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. TOP HEADER & BREADCRUMB */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/sales/invoices"
              className="text-xs font-semibold text-[#F47721] hover:underline flex items-center gap-1"
            >
              ← {lang === "gu" ? "બધા વેચાણ બિલ" : "Back to Invoices"}
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#202124] tracking-tight flex items-center gap-2">
            <span>{lang === "gu" ? "નવું વેચાણ બિલ (New Bill)" : "Create Sales Invoice"}</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FFF3E8] text-[#F47721] border border-[#FED7AA]">
              {category.replace(/_/g, " ")}
            </span>
          </h1>
          <p className="text-xs text-[#667085]">
            {isInterState
              ? (lang === "gu" ? "આંતરરાજ્ય સપ્લાય (IGST લાગુ થશે)" : "Inter-State Supply (IGST Applicable)")
              : (lang === "gu" ? "સ્થાનિક ગુજરાત સપ્લાય (CGST 50% + SGST 50% લાગુ થશે)" : "Intra-State Supply (CGST + SGST Applicable)")}
          </p>
        </div>

        {/* Live Grand Total Badge (Prominent for cashiers) */}
        <div className="bg-[#FFFAF5] border border-[#FED7AA] rounded-card p-3 sm:px-5 flex items-center justify-between sm:justify-end gap-4 shadow-subtle border-r-4 border-r-[#F47721]">
          <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
            {lang === "gu" ? "કુલ બિલ રકમ" : "Grand Total"}
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-[#F47721] font-mono tracking-tight">
            {formatInr(roundedGrandTotal)}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-card text-xs text-rose-800 font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* 2. INVOICE META SETTINGS CARD */}
      <div className="bg-white p-5 rounded-card border border-[#E5E7EB] shadow-card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Document Type */}
        <div>
          <label className="block text-xs font-bold text-[#202124] uppercase mb-1">
            {lang === "gu" ? "બિલનો પ્રકાર *" : "Document Type *"}
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as any)}
            className="w-full text-xs p-2.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg font-bold text-[#202124] focus:bg-white focus:ring-1 focus:ring-[#F47721] focus:outline-none"
          >
            <option value="TAX_INVOICE">{lang === "gu" ? "પાકું બિલ (Tax Invoice)" : "Tax Invoice"}</option>
            <option value="PROFORMA_INVOICE">{lang === "gu" ? "કાચું બિલ / અંદાજપત્ર (Quotation)" : "Quotation / Estimate"}</option>
            <option value="BILL_OF_SUPPLY">{lang === "gu" ? "બિલ ઓફ સપ્લાય (મુક્ત)" : "Bill of Supply"}</option>
            <option value="DELIVERY_CHALLAN">{lang === "gu" ? "ડિલિવરી ચલણ" : "Delivery Challan"}</option>
          </select>
        </div>

        {/* Customer / Party */}
        <div>
          <label className="block text-xs font-bold text-[#202124] uppercase mb-1">
            {lang === "gu" ? "ગ્રાહક (Customer) *" : "Customer / Party *"}
          </label>
          <select
            value={partyId}
            onChange={(e) => handlePartyChange(e.target.value)}
            className="w-full text-xs p-2.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg font-semibold text-[#202124] focus:bg-white focus:ring-1 focus:ring-[#F47721] focus:outline-none"
          >
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.gstin ? `(${p.gstin})` : `(${p.phone || "Walk-in"})`}
              </option>
            ))}
          </select>
        </div>

        {/* Invoice Date */}
        <div>
          <label className="block text-xs font-bold text-[#202124] uppercase mb-1">
            {lang === "gu" ? "તારીખ (Date) *" : "Invoice Date *"}
          </label>
          <input
            type="date"
            required
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            className="w-full text-xs p-2.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg font-mono text-[#202124] focus:bg-white focus:ring-1 focus:ring-[#F47721] focus:outline-none"
          />
        </div>

        {/* Payment Mode */}
        <div>
          <label className="block text-xs font-bold text-[#202124] uppercase mb-1">
            {lang === "gu" ? "ચુકવણી પ્રકાર *" : "Payment Mode *"}
          </label>
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            className="w-full text-xs p-2.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg font-semibold text-[#202124] focus:bg-white focus:ring-1 focus:ring-[#F47721] focus:outline-none"
          >
            <option value="UNPAID_CREDIT">{lang === "gu" ? "ઉધાર / બાકી (Credit)" : "CREDIT (Unpaid)"}</option>
            <option value="CASH">{lang === "gu" ? "રોકડ (Cash)" : "CASH"}</option>
            <option value="BANK_TRANSFER">{lang === "gu" ? "બેંક ટ્રાન્સફર (NEFT/RTGS)" : "BANK TRANSFER"}</option>
            <option value="UPI_QR">{lang === "gu" ? "યુપીઆઇ (UPI QR)" : "UPI"}</option>
            <option value="CHEQUE">{lang === "gu" ? "ચેક (Cheque)" : "CHEQUE"}</option>
          </select>
        </div>

        {/* Place of Supply */}
        <div>
          <label className="block text-xs font-bold text-[#202124] uppercase mb-1">
            {lang === "gu" ? "સપ્લાય રાજ્ય કોડ *" : "Place of Supply *"}
          </label>
          <input
            type="text"
            required
            value={placeOfSupply}
            onChange={(e) => setPlaceOfSupply(e.target.value)}
            placeholder="24 (Gujarat)"
            className="w-full text-xs p-2.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg font-mono font-bold text-[#202124] focus:bg-white focus:ring-1 focus:ring-[#F47721] focus:outline-none"
          />
        </div>
      </div>

      {/* 3. ITEMS TABLE CARD */}
      <div className="bg-white rounded-card border border-[#E5E7EB] shadow-card overflow-hidden">
        {/* Table Controls Header */}
        <div className="p-4 border-b border-[#E5E7EB] bg-[#FFFAF5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold text-[#202124] uppercase tracking-wider">
              {lang === "gu" ? "માલસામાનની વિગત (Items Entry)" : "Items & Tax Rates"}
            </h2>
            <p className="text-[11px] text-[#667085]">
              {isTaxInclusive
                ? (lang === "gu" ? "ભાવ GST સહિત છે (Tax-Inclusive)" : "Rates are Tax-Inclusive (GST is included in entered price)")
                : (lang === "gu" ? "ભાવ GST વગરનો છે (Tax-Exclusive)" : "Rates are Tax-Exclusive (GST is added extra on base price)")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Tax Inclusive / Exclusive Switch */}
            <div className="flex items-center bg-[#F3F4F6] p-0.5 rounded-lg border border-[#E5E7EB] text-xs">
              <button
                type="button"
                onClick={() => setIsTaxInclusive(false)}
                className={`px-3 py-1 rounded-md font-bold transition-all ${
                  !isTaxInclusive
                    ? "bg-white text-[#F47721] shadow-xs"
                    : "text-[#667085] hover:text-[#202124]"
                }`}
              >
                {lang === "gu" ? "GST અલગથી (+Extra)" : "Tax Exclusive"}
              </button>
              <button
                type="button"
                onClick={() => setIsTaxInclusive(true)}
                className={`px-3 py-1 rounded-md font-bold transition-all ${
                  isTaxInclusive
                    ? "bg-white text-[#F47721] shadow-xs"
                    : "text-[#667085] hover:text-[#202124]"
                }`}
              >
                {lang === "gu" ? "GST સહિત (Inclusive)" : "Tax Inclusive"}
              </button>
            </div>

            {/* Quick Add Row Button */}
            <button
              type="button"
              onClick={handleAddRow}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F47721] hover:bg-[#D95F12] text-white rounded-button text-xs font-bold shadow-saffron transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>{lang === "gu" ? "+ વસ્તુ ઉમેરો (F2)" : "+ Add Item (F2)"}</span>
            </button>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F9FB] text-[#667085] uppercase tracking-wider font-semibold border-b border-[#E5E7EB]">
              <tr>
                <th className="px-4 py-3 min-w-[200px]">{lang === "gu" ? "વસ્તુનું નામ" : "Item Description"}</th>
                <th className="px-3 py-3 w-24">{lang === "gu" ? "HSN કોડ" : "HSN"}</th>
                <th className="px-3 py-3 w-24 text-right">{lang === "gu" ? "જથ્થો (Qty)" : "Quantity"}</th>
                <th className="px-3 py-3 w-28 text-right">{lang === "gu" ? "દર (Rate ₹)" : "Rate (₹)"}</th>
                <th className="px-3 py-3 w-24 text-right">{lang === "gu" ? "વટાવ (Disc %)" : "Disc %"}</th>
                <th className="px-3 py-3 w-24 text-right">{lang === "gu" ? "જીએસટી %" : "GST %"}</th>
                <th className="px-4 py-3 w-32 text-right">{lang === "gu" ? "કુલ રકમ (₹)" : "Line Total"}</th>
                <th className="px-3 py-3 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {rows.map((row, idx) => {
                const qty = Number(row.quantity) || 0;
                const rate = Number(row.unitPrice) || 0;
                const disc = Number(row.discountPercent) || 0;
                const gross = qty * rate;
                const grossAfterDisc = gross - (gross * disc) / 100;
                const lineTotal = isTaxInclusive
                  ? grossAfterDisc
                  : grossAfterDisc + (grossAfterDisc * row.taxRate) / 100;

                return (
                  <tr key={idx} className="hover:bg-[#FFFAF5] transition-colors">
                    {/* Item Select */}
                    <td className="px-4 py-2">
                      <select
                        value={row.itemId}
                        onChange={(e) => handleItemSelect(idx, e.target.value)}
                        className="w-full text-xs p-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-md font-semibold text-[#202124] focus:bg-white focus:ring-1 focus:ring-[#F47721]"
                      >
                        {items.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.name} (Stock: {it.stockQuantity ?? 0})
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* HSN Code */}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={row.hsnCode}
                        onChange={(e) => handleRowChange(idx, "hsnCode", e.target.value)}
                        className="w-full text-xs p-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-md font-mono text-[#202124] focus:bg-white"
                      />
                    </td>

                    {/* Quantity */}
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0.001"
                        step="any"
                        value={row.quantity}
                        onChange={(e) => handleRowChange(idx, "quantity", e.target.value)}
                        className="w-full text-xs p-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-md text-right font-mono font-bold text-[#202124] focus:bg-white"
                      />
                    </td>

                    {/* Rate */}
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={row.unitPrice}
                        onChange={(e) => handleRowChange(idx, "unitPrice", e.target.value)}
                        className="w-full text-xs p-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-md text-right font-mono font-bold text-[#202124] focus:bg-white"
                      />
                    </td>

                    {/* Discount % */}
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={row.discountPercent}
                        onChange={(e) => handleRowChange(idx, "discountPercent", e.target.value)}
                        className="w-full text-xs p-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-md text-right font-mono text-[#202124] focus:bg-white"
                      />
                    </td>

                    {/* Tax Rate % */}
                    <td className="px-3 py-2">
                      <select
                        value={row.taxRate}
                        onChange={(e) => handleRowChange(idx, "taxRate", Number(e.target.value))}
                        className="w-full text-xs p-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-md text-right font-mono font-bold text-[#F47721] focus:bg-white"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </td>

                    {/* Line Total */}
                    <td className="px-4 py-2 text-right font-mono font-bold text-sm text-[#202124]">
                      {formatInr(lineTotal)}
                    </td>

                    {/* Remove Action */}
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        disabled={rows.length <= 1}
                        className="text-[#98A2B3] hover:text-[#DC3545] disabled:opacity-20 p-1 rounded transition-colors"
                        title="Remove row"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. TOTALS SUMMARY & SUBMISSION STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Notes & Terms */}
        <div className="bg-white p-5 rounded-card border border-[#E5E7EB] shadow-card space-y-3">
          <label className="block text-xs font-bold text-[#202124] uppercase">
            {lang === "gu" ? "નોંધ / શરતો (Notes & Remarks)" : "Invoice Notes & Terms"}
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={lang === "gu" ? "ગ્રાહક માટે વિશેષ નોંધ અથવા ચૂકવણી શરતો..." : "Special instructions or payment terms for the customer..."}
            className="w-full text-xs p-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg text-[#202124] focus:bg-white focus:ring-1 focus:ring-[#F47721] focus:outline-none"
          />
          <div className="text-[11px] text-[#667085] flex items-center gap-1.5">
            <span>💡</span>
            <span>{lang === "gu" ? "આ બિલ સાચવતા જ સ્ટોક અને ઉઘરાણી આપોઆપ અપડેટ થશે." : "Saving will automatically adjust inventory and customer ledger balance."}</span>
          </div>
        </div>

        {/* Tax Breakdown & Final Grand Total Card */}
        <div className="bg-white p-5 rounded-card border border-[#E5E7EB] shadow-card space-y-3">
          <div className="space-y-1.5 text-xs text-[#667085] pb-3 border-b border-[#E5E7EB]">
            <div className="flex justify-between">
              <span>{lang === "gu" ? "કરપાત્ર રકમ (Taxable Value)" : "Taxable Value"}:</span>
              <span className="font-mono font-semibold text-[#202124]">{formatInr(totalTaxable)}</span>
            </div>
            {!isInterState ? (
              <>
                <div className="flex justify-between">
                  <span>CGST (50%):</span>
                  <span className="font-mono font-semibold text-[#202124]">{formatInr(totalCgst)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST (50%):</span>
                  <span className="font-mono font-semibold text-[#202124]">{formatInr(totalSgst)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between">
                <span>IGST (100%):</span>
                <span className="font-mono font-semibold text-[#202124]">{formatInr(totalIgst)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#98A2B3]">
              <span>{lang === "gu" ? "રાઉન્ડ ઓફ (Round Off)" : "Round Off"}:</span>
              <span className="font-mono font-semibold">
                {roundOff >= 0 ? `+${roundOff.toFixed(2)}` : roundOff.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-bold text-[#202124] uppercase">
              {lang === "gu" ? "આખરી રકમ (Final Bill Amount)" : "Grand Total"}:
            </span>
            <span className="text-2xl font-extrabold text-[#F47721] font-mono">
              {formatInr(roundedGrandTotal)}
            </span>
          </div>

          {/* Submission Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
              className="px-4 py-2.5 bg-[#F8F9FB] hover:bg-[#F3F4F6] text-[#667085] border border-[#E5E7EB] rounded-button text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {lang === "gu" ? "કાચું સાચવો (Draft)" : "Save Draft"}
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="px-6 py-2.5 bg-[#F47721] hover:bg-[#D95F12] text-white rounded-button text-xs sm:text-sm font-bold shadow-saffron transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{lang === "gu" ? "બિલ બની રહ્યું છે..." : "Generating Bill..."}</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{lang === "gu" ? "સાચવો અને પ્રિન્ટ કરો (Save & Print)" : "Save & Print Bill"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
