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
}

interface ItemOption {
  id: string;
  name: string;
  hsnCode: string;
  taxRate: number;
  retailPrice: number;
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
    new Date().toISOString().split("T")[0],
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
            hsnCode: iList[0].hsnCode,
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
      hsnCode: item.hsnCode,
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
        hsnCode: firstItem?.hsnCode || "1006",
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

  // Tax calculations
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

  const handleSubmit = async (isDraft: boolean) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const res: any = await apiClient.post(
        "/invoices/sales",
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
        `inv_key_${Date.now()}_${Math.random()}`,
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
          : err.message || "Failed to create sales invoice.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/sales/invoices"
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              ← Back to Invoices
            </Link>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {lang === "gu"
              ? "નવું વેચાણ બિલ બનાવો (New Tax Invoice)"
              : "Create Sales Invoice"}
          </h1>
          <p className="text-xs text-slate-500">
            {isInterState
              ? "Inter-State (IGST Applicable)"
              : "Intra-State (CGST + SGST Applicable)"}{" "}
            • Authoritative statutory calculations
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Invoice Meta Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-5 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Document Type *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as any)}
            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:bg-white"
          >
            <option value="TAX_INVOICE">Tax Invoice (પાકું બિલ)</option>
            <option value="PROFORMA_INVOICE">
              Quotation / Estimate (કાચું બિલ)
            </option>
            <option value="BILL_OF_SUPPLY">Bill of Supply (મુક્તિ)</option>
            <option value="DELIVERY_CHALLAN">Delivery Challan (ચલણ)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Customer / Party *
          </label>
          <select
            value={partyId}
            onChange={(e) => handlePartyChange(e.target.value)}
            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-900 focus:bg-white"
          >
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.gstin ? `(${p.gstin})` : "(Unregistered)"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Invoice Date *
          </label>
          <input
            type="date"
            required
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 focus:bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Payment Mode *
          </label>
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900 focus:bg-white"
          >
            <option value="UNPAID_CREDIT">CREDIT (ઉધાર / બાકી)</option>
            <option value="CASH">CASH (રોકડ)</option>
            <option value="BANK_TRANSFER">
              BANK TRANSFER (નેફ્ટ/આરટીજીએસ)
            </option>
            <option value="UPI_QR">UPI (યુપીઆઈ)</option>
            <option value="CHEQUE">CHEQUE (ચેક)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Place of Supply (State) *
          </label>
          <input
            type="text"
            required
            value={placeOfSupply}
            onChange={(e) => setPlaceOfSupply(e.target.value)}
            placeholder="24"
            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:bg-white"
          />
        </div>
      </div>

      {/* Items Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {lang === "gu" ? "વસ્તુઓની યાદી અને કર (Items & Tax Rates)" : "Items & Tax Rates"}
            </h2>
            <p className="text-[11px] text-slate-500">
              {isTaxInclusive
                ? (lang === "gu" ? "ભાવ GST સહિત છે — મૂળ કરપાત્ર ભાવ આપોઆપ ગણાશે" : "Rates are Tax-Inclusive (GST is included in entered price)")
                : (lang === "gu" ? "ભાવ GST વગરનો છે — GST અલગથી ઉમેરાશે" : "Rates are Tax-Exclusive (GST is added extra on base price)")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setIsTaxInclusive(false)}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  !isTaxInclusive
                    ? "bg-white text-emerald-800 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {lang === "gu" ? "GST અલગથી (+Extra)" : "Tax Exclusive"}
              </button>
              <button
                type="button"
                onClick={() => setIsTaxInclusive(true)}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  isTaxInclusive
                    ? "bg-white text-emerald-800 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {lang === "gu" ? "GST ભાવમાં સામેલ (Incl.)" : "Tax Inclusive"}
              </button>
            </div>

            <button
              type="button"
              onClick={handleAddRow}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200"
            >
              + Add Product Row
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-2.5 px-3 w-10">#</th>
                <th className="py-2.5 px-3 w-64">Item Name</th>
                <th className="py-2.5 px-3 w-24">HSN</th>
                <th className="py-2.5 px-3 w-24 text-right">Qty</th>
                <th className="py-2.5 px-3 w-32 text-right">
                  {isTaxInclusive ? "Price (Incl. GST)" : "Price (Excl. GST)"}
                </th>
                <th className="py-2.5 px-3 w-20 text-right">Disc %</th>
                <th className="py-2.5 px-3 w-24 text-right">GST %</th>
                <th className="py-2.5 px-3 w-36 text-right">Line Total (₹)</th>
                <th className="py-2.5 px-3 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, idx) => {
                const qty = Number(row.quantity) || 0;
                const price = Number(row.unitPrice) || 0;
                const disc = Number(row.discountPercent) || 0;
                const gross = qty * price;
                const afterDisc = gross - (gross * disc) / 100;
                const lineTaxable = isTaxInclusive
                  ? afterDisc / (1 + row.taxRate / 100)
                  : afterDisc;
                const lineTax = isTaxInclusive
                  ? afterDisc - lineTaxable
                  : (lineTaxable * row.taxRate) / 100;
                const lineTotal = lineTaxable + lineTax;

                return (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={row.itemId}
                        onChange={(e) => handleItemSelect(idx, e.target.value)}
                        className="w-full text-xs p-1.5 bg-slate-50 border border-slate-300 rounded font-medium text-slate-800"
                      >
                        {items.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {row.hsnCode}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={row.quantity}
                        onChange={(e) =>
                          handleRowChange(
                            idx,
                            "quantity",
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                        className="w-full text-xs p-1.5 bg-slate-50 border border-slate-300 rounded text-right font-mono"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.unitPrice}
                        onChange={(e) =>
                          handleRowChange(
                            idx,
                            "unitPrice",
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                        className="w-full text-xs p-1.5 bg-slate-50 border border-slate-300 rounded text-right font-mono"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={row.discountPercent}
                        onChange={(e) =>
                          handleRowChange(
                            idx,
                            "discountPercent",
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                        className="w-full text-xs p-1.5 bg-slate-50 border border-slate-300 rounded text-right font-mono"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <select
                        value={row.taxRate}
                        onChange={(e) =>
                          handleRowChange(
                            idx,
                            "taxRate",
                            Number(e.target.value),
                          )
                        }
                        className="w-full text-xs p-1.5 bg-slate-50 border border-slate-300 rounded text-right font-mono font-semibold"
                      >
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      <div className="font-bold text-slate-900 text-sm">₹{lineTotal.toFixed(2)}</div>
                      <div className="text-[10px] text-slate-500 font-sans">
                        Taxable: ₹{lineTaxable.toFixed(2)} | GST: ₹{lineTax.toFixed(2)}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1"
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

        {/* Invoice Summary Card */}
        <div className="bg-slate-50/50 p-5 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Customer Notes & Terms
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Goods once sold will not be taken back..."
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Total Taxable Amount:</span>
              <span className="font-mono font-semibold text-slate-900">
                ₹{totalTaxable.toFixed(2)}
              </span>
            </div>
            {!isInterState ? (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>CGST:</span>
                  <span className="font-mono text-slate-800">
                    ₹{totalCgst.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>SGST:</span>
                  <span className="font-mono text-slate-800">
                    ₹{totalSgst.toFixed(2)}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-slate-600">
                <span>IGST (Inter-State):</span>
                <span className="font-mono text-slate-800">
                  ₹{totalIgst.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Sec 170 Round Off:</span>
              <span className="font-mono text-slate-800">
                {roundOff >= 0
                  ? `+₹${roundOff.toFixed(2)}`
                  : `-₹${Math.abs(roundOff).toFixed(2)}`}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-300 flex justify-between text-sm font-bold text-slate-900">
              <span>Grand Total:</span>
              <span className="font-mono text-emerald-800 text-base">
                ₹{roundedGrandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        <Link
          href="/sales/invoices"
          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors"
        >
          Cancel
        </Link>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleSubmit(true)}
          className="px-5 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition-colors"
        >
          Save Draft (કાચું બિલ)
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleSubmit(false)}
          className="px-6 py-2.5 text-xs font-bold text-slate-950 bg-[#FF9933] hover:bg-[#E67E17] disabled:bg-amber-200 rounded-lg shadow-sm transition-colors flex items-center gap-2"
        >
          {isSubmitting ? (
            <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          ) : null}
          <span>Issue Tax Invoice (બિલ જારી કરો)</span>
        </button>
      </div>
    </div>
  );
}
