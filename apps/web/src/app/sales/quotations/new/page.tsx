"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { apiClient, extractList } from "@/lib/api-client";
import { Modal } from "@/components/ui/modal";

interface PartyOption {
  id: string;
  name: string;
  gstin?: string;
  stateCode: string;
  phone?: string;
  billingAddress?: any;
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

interface QuotationItemRow {
  itemId: string;
  hsnCode: string;
  quantity: number | "";
  unitPrice: number | "";
  discountPercent: number | "";
  taxRate: number;
}

export default function NewQuotationPage() {
  const router = useRouter();
  const { lang, tenantContext, currentCompany } = useAuth();

  const [parties, setParties] = useState<PartyOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [partyId, setPartyId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  // Default 15 days validity
  const defaultDueDate = new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0];
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [placeOfSupply, setPlaceOfSupply] = useState(
    currentCompany?.stateCode || "24",
  );
  const [customQuoteNumber, setCustomQuoteNumber] = useState("");
  const [notes, setNotes] = useState(
    lang === "gu"
      ? "ભાવપત્રક તારીખથી ૧૫ દિવસ સુધી માન્ય રહેશે. ૫૦% એડવાન્સ જરૂરી છે."
      : "Quotation valid for 15 days from date of issue. Subject to market price fluctuations.",
  );
  const [termsAndConditions, setTermsAndConditions] = useState(
    lang === "gu"
      ? "૧. ડિલિવરી ઓર્ડર કન્ફર્મ થયાના ૫ દિવસમાં.\n૨. માલ પરત લેવામાં આવશે નહીં."
      : "1. Delivery within 5 business days of order confirmation.\n2. Goods once sold will not be taken back without prior inspection.",
  );

  // Quick Customer Creation Modal
  const [isNewPartyModalOpen, setIsNewPartyModalOpen] = useState(false);
  const [newPartyForm, setNewPartyForm] = useState({
    name: "",
    phone: "",
    gstin: "",
    stateCode: currentCompany?.stateCode || "24",
  });
  const [isSubmittingParty, setIsSubmittingParty] = useState(false);
  const [partyError, setPartyError] = useState<string | null>(null);

  const [rows, setRows] = useState<QuotationItemRow[]>([
    {
      itemId: "",
      hsnCode: "",
      quantity: 1,
      unitPrice: "",
      discountPercent: 0,
      taxRate: 0,
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
      if (pList.length > 0 && !partyId) {
        setPartyId(pList[0].id);
        if (pList[0].stateCode) {
          setPlaceOfSupply(pList[0].stateCode);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load master records.");
    } finally {
      setIsLoading(false);
    }
  }, [partyId]);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchData();
    }
  }, [tenantContext.companyId, fetchData]);

  // Selected party object
  const selectedParty = useMemo(() => {
    return parties.find((p) => p.id === partyId);
  }, [parties, partyId]);

  // Update place of supply on party change
  const handlePartyChange = (pid: string) => {
    setPartyId(pid);
    const p = parties.find((x) => x.id === pid);
    if (p?.stateCode) {
      setPlaceOfSupply(p.stateCode);
    }
  };

  // Add line item
  const handleAddRow = () => {
    setRows([
      ...rows,
      {
        itemId: "",
        hsnCode: "",
        quantity: 1,
        unitPrice: "",
        discountPercent: 0,
        taxRate: 0,
      },
    ]);
  };

  // Remove line item
  const handleRemoveRow = (idx: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== idx));
  };

  // Row change handler
  const handleRowChange = (
    idx: number,
    field: keyof QuotationItemRow,
    val: any,
  ) => {
    const updated = [...rows];
    updated[idx] = { ...updated[idx], [field]: val };

    if (field === "itemId") {
      const it = items.find((i) => i.id === val);
      if (it) {
        updated[idx].hsnCode = it.hsnCode || "";
        updated[idx].unitPrice = it.retailPrice || 0;
        updated[idx].taxRate = it.taxRate || 0;
      }
    }

    setRows(updated);
  };

  // Tax and Total Calculations
  const isInterState = placeOfSupply !== (currentCompany?.stateCode || "24");

  const calculations = useMemo(() => {
    let subTotal = 0;
    let totalDiscount = 0;
    let taxableAmount = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    rows.forEach((r) => {
      const q = Number(r.quantity) || 0;
      const rate = Number(r.unitPrice) || 0;
      const discPct = Number(r.discountPercent) || 0;
      const taxR = Number(r.taxRate) || 0;

      const rawAmount = q * rate;
      const discount = rawAmount * (discPct / 100);
      const netTaxable = rawAmount - discount;

      subTotal += rawAmount;
      totalDiscount += discount;
      taxableAmount += netTaxable;

      if (isInterState) {
        igstAmount += netTaxable * (taxR / 100);
      } else {
        cgstAmount += netTaxable * (taxR / 200);
        sgstAmount += netTaxable * (taxR / 200);
      }
    });

    const totalTax = isInterState ? igstAmount : cgstAmount + sgstAmount;
    const rawGrandTotal = taxableAmount + totalTax;
    const grandTotal = Math.round(rawGrandTotal);
    const roundOff = grandTotal - rawGrandTotal;

    return {
      subTotal,
      totalDiscount,
      taxableAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalTax,
      roundOff,
      grandTotal,
    };
  }, [rows, isInterState]);

  // Submit quotation
  const handleSubmit = async (convertImmediately = false) => {
    if (!partyId) {
      setError(lang === "gu" ? "કૃપા કરીને ગ્રાહક પસંદ કરો." : "Please select a customer.");
      return;
    }

    const validRows = rows.filter((r) => r.itemId && Number(r.quantity) > 0);
    if (validRows.length === 0) {
      setError(
        lang === "gu"
          ? "કૃપા કરીને ઓછામાં ઓછી ૧ વસ્તુ અને જથ્થો ઉમેરો."
          : "Please add at least one line item with valid quantity.",
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        category: "PROFORMA_INVOICE",
        partyId,
        invoiceDate,
        dueDate,
        placeOfSupply,
        paymentMode: "UNPAID_CREDIT",
        notes: notes || undefined,
        termsAndConditions: termsAndConditions || undefined,
        invoiceNumber: customQuoteNumber.trim() || undefined,
        isDraft: true,
        items: validRows.map((r) => ({
          itemId: r.itemId,
          hsnCode: r.hsnCode || "9999",
          quantity: Number(r.quantity),
          unitPrice: Number(r.unitPrice) || 0,
          discountPercent: Number(r.discountPercent) || 0,
          taxRate: Number(r.taxRate) || 0,
        })),
      };

      const res: any = await apiClient.post("/invoices/sales", payload);

      if (convertImmediately && res?.id) {
        // Automatically issue as legal Tax Invoice
        await apiClient.post(
          `/invoices/sales/${res.id}/issue`,
          { allowNegativeStock: true },
          undefined,
          `issue_qtn_auto_${Date.now()}`,
        );
        router.push(`/sales/invoices/${res.id}`);
      } else {
        router.push("/sales/quotations");
      }
    } catch (err: any) {
      setError(
        lang === "gu" && err.messageGujarati
          ? err.messageGujarati
          : err.message || "Failed to create quotation.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Customer Creation
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingParty(true);
    setPartyError(null);

    try {
      if (!newPartyForm.name.trim()) {
        throw new Error(lang === "gu" ? "ગ્રાહકનું નામ જરૂરી છે." : "Customer name is required.");
      }

      const res: any = await apiClient.post("/parties", {
        name: newPartyForm.name.trim(),
        phone: newPartyForm.phone.trim() || undefined,
        gstin: newPartyForm.gstin.trim() || undefined,
        type: "CUSTOMER",
        stateCode: newPartyForm.stateCode || "24",
      });

      setIsNewPartyModalOpen(false);
      setNewPartyForm({ name: "", phone: "", gstin: "", stateCode: "24" });

      await fetchData();
      if (res?.id) {
        setPartyId(res.id);
        if (res.stateCode) setPlaceOfSupply(res.stateCode);
      }
    } catch (err: any) {
      setPartyError(err.message || "Failed to create customer.");
    } finally {
      setIsSubmittingParty(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-border shadow-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/sales/quotations"
              className="text-xs font-semibold text-muted hover:text-primary flex items-center gap-1"
            >
              <span>←</span>
              <span>{lang === "gu" ? "પાછા કવોટેશન્સ પર જાઓ" : "Back to Quotations"}</span>
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {lang === "gu"
              ? "નવું કવોટેશન / એસ્ટીમેટ બનાવો (Create Quotation / Estimate)"
              : "Create New Quotation / Estimate"}
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            {lang === "gu"
              ? "કાચું બિલ અથવા ભાવપત્રક - સ્વીકારાયા બાદ ૧-ક્લિકમાં પાકા બિલમાં ફેરવી શકાય છે"
              : "Generate an itemized commercial quotation; non-financial until converted to Tax Invoice"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            📝 {lang === "gu" ? "કાચું બિલ (Quotation)" : "Draft Quotation Mode"}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Customer & Meta Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-subtle grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Select */}
        <div className="space-y-3 lg:col-span-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {lang === "gu" ? "ગ્રાહક પસંદ કરો (Customer) *" : "Select Customer *"}
            </label>
            <button
              type="button"
              onClick={() => {
                setPartyError(null);
                setIsNewPartyModalOpen(true);
              }}
              className="text-[11px] font-bold text-primary hover:underline"
            >
              + {lang === "gu" ? "નવો ગ્રાહક ઉમેરો" : "Add Customer"}
            </button>
          </div>

          <select
            value={partyId}
            onChange={(e) => handlePartyChange(e.target.value)}
            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-primary outline-none"
          >
            <option value="">{lang === "gu" ? "-- ગ્રાહક પસંદ કરો --" : "-- Select Customer --"}</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.phone ? `(${p.phone})` : ""} {p.gstin ? `[${p.gstin}]` : ""}
              </option>
            ))}
          </select>

          {selectedParty && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-900">{selectedParty.name}</div>
              {selectedParty.phone && (
                <div className="text-slate-500 font-mono">📞 {selectedParty.phone}</div>
              )}
              {selectedParty.gstin && (
                <div className="text-slate-500 font-mono">GSTIN: {selectedParty.gstin}</div>
              )}
              <div className="text-[11px] text-slate-400">
                State Code: {selectedParty.stateCode}
              </div>
            </div>
          )}
        </div>

        {/* Quotation Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:col-span-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {lang === "gu" ? "કવોટેશન તારીખ *" : "Quotation Date *"}
            </label>
            <input
              type="date"
              required
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {lang === "gu" ? "માન્યતા તારીખ (Valid Until) *" : "Valid Until / Due Date *"}
            </label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {lang === "gu" ? "સપ્લાય સ્થળ (Place of Supply) *" : "Place of Supply (State) *"}
            </label>
            <input
              type="text"
              required
              value={placeOfSupply}
              onChange={(e) => setPlaceOfSupply(e.target.value)}
              placeholder="e.g. 24 (Gujarat)"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:border-primary outline-none"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              {isInterState ? "Inter-state (IGST applies)" : "Intra-state (CGST + SGST applies)"}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {lang === "gu" ? "કસ્ટમ કવોટેશન નં. (ઓપ્શનલ)" : "Quotation No. (Optional)"}
            </label>
            <input
              type="text"
              value={customQuoteNumber}
              onChange={(e) => setCustomQuoteNumber(e.target.value)}
              placeholder="Auto-generated e.g. QTN/26-27/0001"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:border-primary outline-none"
            />
          </div>
        </div>
      </div>

      {/* Item Rows Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {lang === "gu"
              ? "માલસામાન / સેવાઓની યાદી (Quotation Line Items)"
              : "Quotation Line Items & Pricing"}
          </h2>
          <button
            type="button"
            onClick={handleAddRow}
            className="text-xs text-primary hover:text-primary-hover font-bold flex items-center gap-1 bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-xl border border-primary/20 transition-all"
          >
            <span>+ {lang === "gu" ? "નવી લાઇન ઉમેરો" : "Add Item"}</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-3 min-w-[200px]">
                  {lang === "gu" ? "વસ્તુનું નામ (Item Name) *" : "Item Name *"}
                </th>
                <th className="py-3 px-3 w-28">HSN/SAC</th>
                <th className="py-3 px-3 w-24 text-right">
                  {lang === "gu" ? "જથ્થો (Qty) *" : "Qty *"}
                </th>
                <th className="py-3 px-3 w-32 text-right">
                  {lang === "gu" ? "ભાવ (Rate ₹) *" : "Rate (₹) *"}
                </th>
                <th className="py-3 px-3 w-24 text-right">
                  {lang === "gu" ? "ડિસ્કાઉન્ટ %" : "Disc %"}
                </th>
                <th className="py-3 px-3 w-28 text-right">GST %</th>
                <th className="py-3 px-3 w-32 text-right">
                  {lang === "gu" ? "કુલ રકમ (₹)" : "Amount (₹)"}
                </th>
                <th className="py-3 px-3 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, idx) => {
                const q = Number(row.quantity) || 0;
                const r = Number(row.unitPrice) || 0;
                const disc = Number(row.discountPercent) || 0;
                const lineNet = q * r * (1 - disc / 100);
                const lineTax = lineNet * (Number(row.taxRate) / 100);
                const lineTotal = lineNet + lineTax;

                const selectedItem = items.find((i) => i.id === row.itemId);

                return (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 text-slate-400 font-mono text-center">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={row.itemId}
                        onChange={(e) => handleRowChange(idx, "itemId", e.target.value)}
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-primary outline-none"
                      >
                        <option value="">{lang === "gu" ? "-- વસ્તુ પસંદ કરો --" : "-- Select Item --"}</option>
                        {items.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.name} {it.stockQuantity !== undefined ? `(Stock: ${it.stockQuantity} ${it.unit || ""})` : ""}
                          </option>
                        ))}
                      </select>
                      {selectedItem && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Unit: {selectedItem.unit || "PCS"} | Base Price: ₹{selectedItem.retailPrice}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={row.hsnCode}
                        onChange={(e) => handleRowChange(idx, "hsnCode", e.target.value)}
                        placeholder="HSN"
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-800 focus:bg-white focus:border-primary outline-none"
                      />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        min="0.001"
                        step="any"
                        value={row.quantity}
                        onChange={(e) => handleRowChange(idx, "quantity", e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-xl text-right font-mono font-bold text-slate-900 focus:bg-white focus:border-primary outline-none"
                      />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.unitPrice}
                        onChange={(e) => handleRowChange(idx, "unitPrice", e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="0.00"
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-xl text-right font-mono font-bold text-slate-900 focus:bg-white focus:border-primary outline-none"
                      />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={row.discountPercent}
                        onChange={(e) => handleRowChange(idx, "discountPercent", e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="0%"
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-xl text-right font-mono text-slate-800 focus:bg-white focus:border-primary outline-none"
                      />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <select
                        value={row.taxRate}
                        onChange={(e) => handleRowChange(idx, "taxRate", Number(e.target.value))}
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-xl text-right font-mono font-semibold text-slate-800 focus:bg-white focus:border-primary outline-none"
                      >
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 text-sm">
                      ₹{lineTotal.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Remove item"
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

      {/* Bottom Section: Notes & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notes & Terms */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {lang === "gu" ? "શેરો / નોંધ (Quotation Remarks & Validity)" : "Quotation Remarks & Validity"}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {lang === "gu" ? "નિયમો અને શરતો (Terms & Conditions)" : "Terms & Conditions"}
            </label>
            <textarea
              rows={3}
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-primary outline-none"
            />
          </div>
        </div>

        {/* Calculation Summary Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle space-y-3 font-mono text-xs">
          <h3 className="font-sans font-bold text-slate-800 uppercase tracking-wider text-xs border-b border-slate-100 pb-2">
            {lang === "gu" ? "હિસાબી સારાંશ (Estimated Summary)" : "Estimated Financial Summary"}
          </h3>

          <div className="flex justify-between text-slate-600">
            <span>{lang === "gu" ? "કુલ સરવાળો (Subtotal):" : "Subtotal:"}</span>
            <span>₹{calculations.subTotal.toFixed(2)}</span>
          </div>

          {calculations.totalDiscount > 0 && (
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>{lang === "gu" ? "કુલ ડિસ્કાઉન્ટ (Discount):" : "Discount:"}</span>
              <span>-₹{calculations.totalDiscount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-slate-800 font-semibold">
            <span>{lang === "gu" ? "કરપાત્ર રકમ (Taxable Amount):" : "Taxable Amount:"}</span>
            <span>₹{calculations.taxableAmount.toFixed(2)}</span>
          </div>

          {isInterState ? (
            <div className="flex justify-between text-slate-600">
              <span>IGST:</span>
              <span>₹{calculations.igstAmount.toFixed(2)}</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-slate-600">
                <span>CGST:</span>
                <span>₹{calculations.cgstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>SGST:</span>
                <span>₹{calculations.sgstAmount.toFixed(2)}</span>
              </div>
            </>
          )}

          {calculations.roundOff !== 0 && (
            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>Round Off:</span>
              <span>{calculations.roundOff > 0 ? `+₹${calculations.roundOff.toFixed(2)}` : `-₹${Math.abs(calculations.roundOff).toFixed(2)}`}</span>
            </div>
          )}

          <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-slate-900 font-bold text-base">
            <span className="font-sans">{lang === "gu" ? "કુલ રકમ (Grand Total):" : "Estimated Total:"}</span>
            <span className="text-primary text-xl">₹{calculations.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3">
        <Link
          href="/sales/quotations"
          className="w-full sm:w-auto text-center px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 bg-slate-100 rounded-xl transition-all"
        >
          {lang === "gu" ? "રદ કરો" : "Cancel"}
        </Link>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleSubmit(false)}
          className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:bg-slate-300 rounded-xl shadow-card transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting && (
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          <span>{lang === "gu" ? "કવોટેશન સેવ કરો (Save Quotation)" : "Save as Quotation"}</span>
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleSubmit(true)}
          className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover active:bg-primary-pressed disabled:bg-slate-300 rounded-xl shadow-card hover:shadow-hover transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting && (
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          <span>🚀 {lang === "gu" ? "સેવ કરો & પાકું બિલ બનાવો" : "Save & Issue Tax Invoice"}</span>
        </button>
      </div>

      {/* Quick Add Customer Modal */}
      <Modal
        isOpen={isNewPartyModalOpen}
        onClose={() => setIsNewPartyModalOpen(false)}
        title={lang === "gu" ? "નવો ગ્રાહક ઉમેરો" : "Add New Customer"}
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          {partyError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{partyError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {lang === "gu" ? "ગ્રાહકનું નામ *" : "Customer Name *"}
            </label>
            <input
              type="text"
              required
              value={newPartyForm.name}
              onChange={(e) => setNewPartyForm({ ...newPartyForm, name: e.target.value })}
              placeholder="e.g. Ramesh Patel, Royal Enterprises"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-primary outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {lang === "gu" ? "મોબાઈલ નંબર" : "Mobile Phone"}
              </label>
              <input
                type="text"
                value={newPartyForm.phone}
                onChange={(e) => setNewPartyForm({ ...newPartyForm, phone: e.target.value })}
                placeholder="9876543210"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {lang === "gu" ? "GSTIN (જો હોય તો)" : "GSTIN (Optional)"}
              </label>
              <input
                type="text"
                value={newPartyForm.gstin}
                onChange={(e) => setNewPartyForm({ ...newPartyForm, gstin: e.target.value.toUpperCase() })}
                placeholder="24AAAAA0000A1Z5"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:border-primary outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewPartyModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              {lang === "gu" ? "રદ કરો" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmittingParty}
              className="px-6 py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover active:bg-primary-pressed rounded-xl shadow-card transition-all flex items-center gap-2"
            >
              {isSubmittingParty && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{lang === "gu" ? "ગ્રાહક ઉમેરો" : "Save Customer"}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
