"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { automatedBillingApi, formatCurrency } from "@/lib/automated-billing";

interface MasterParty {
  id: string;
  name: string;
  phone: string;
  gstin?: string;
  stateCode?: string;
  billingAddress?: any;
}

interface MasterItem {
  id: string;
  name: string;
  sku?: string;
  hsnCode?: string;
  salePrice?: number;
  retailPrice?: number;
  taxRate?: number;
  primaryUom?: { symbol: string; name: string };
}

interface FormLine {
  id: string;
  itemId: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  rate: number;
  discountPercent: number;
  taxRate: number;
}

export default function CreateAutomatedBillingPage() {
  const router = useRouter();

  // Form State
  const [scheduleName, setScheduleName] = useState("");
  const [partyId, setPartyId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [frequency, setFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY">("MONTHLY");
  const [interval, setInterval] = useState(1);
  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday default
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [paymentTerms, setPaymentTerms] = useState("Net 15");
  const [dueDays, setDueDays] = useState(15);
  const [notes, setNotes] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");

  // Line items state
  const [lines, setLines] = useState<FormLine[]>([
    {
      id: "line-1",
      itemId: "",
      description: "",
      hsnCode: "",
      quantity: 1,
      unit: "PCS",
      rate: 0,
      discountPercent: 0,
      taxRate: 18,
    },
  ]);

  // Master Data
  const [parties, setParties] = useState<MasterParty[]>([]);
  const [items, setItems] = useState<MasterItem[]>([]);
  const [isLoadingMasters, setIsLoadingMasters] = useState(true);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load Parties and Items
  useEffect(() => {
    (async () => {
      setIsLoadingMasters(true);
      try {
        const [partyRes, itemRes] = await Promise.all([
          apiClient.get<any>("/parties", { limit: 100 }),
          apiClient.get<any>("/items", { limit: 100 }),
        ]);

        const partyList = Array.isArray(partyRes)
          ? partyRes
          : partyRes.items || partyRes.data || [];
        const itemList = Array.isArray(itemRes)
          ? itemRes
          : itemRes.items || itemRes.data || [];

        setParties(partyList);
        setItems(itemList);
      } catch (err: any) {
        console.error("Failed to load master parties or items:", err);
      } finally {
        setIsLoadingMasters(false);
      }
    })();
  }, []);

  const selectedParty = useMemo(() => {
    return parties.find((p) => p.id === partyId);
  }, [parties, partyId]);

  // Auto-generate schedule name if empty when party or frequency changes
  useEffect(() => {
    if (selectedParty && !scheduleName) {
      setScheduleName(`${selectedParty.name} - ${frequency} Retainer`);
    }
  }, [selectedParty, frequency, scheduleName]);

  // Handle line change
  const handleLineChange = (index: number, field: keyof FormLine, value: any) => {
    setLines((prev) => {
      const next = [...prev];
      const line = { ...next[index], [field]: value };

      if (field === "itemId") {
        const found = items.find((it) => it.id === value);
        if (found) {
          line.description = found.name;
          line.hsnCode = found.hsnCode || "";
          line.rate = Number(found.salePrice || found.retailPrice || 0);
          line.taxRate = Number(found.taxRate !== undefined ? found.taxRate : 18);
          line.unit = found.primaryUom?.symbol || "PCS";
        }
      }

      next[index] = line;
      return next;
    });
  };

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}`,
        itemId: "",
        description: "",
        hsnCode: "",
        quantity: 1,
        unit: "PCS",
        rate: 0,
        discountPercent: 0,
        taxRate: 18,
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTaxable = 0;
    let totalTax = 0;

    lines.forEach((l) => {
      const qty = Number(l.quantity) || 0;
      const rate = Number(l.rate) || 0;
      const discPct = Number(l.discountPercent) || 0;
      const taxRate = Number(l.taxRate) || 0;

      const lineGross = qty * rate;
      const lineDisc = lineGross * (discPct / 100);
      const lineTaxable = Math.max(0, lineGross - lineDisc);
      const lineTax = lineTaxable * (taxRate / 100);

      subtotal += lineGross;
      totalDiscount += lineDisc;
      totalTaxable += lineTaxable;
      totalTax += lineTax;
    });

    const grandTotal = totalTaxable + totalTax;

    return {
      subtotal,
      totalDiscount,
      totalTaxable,
      totalTax,
      grandTotal,
    };
  }, [lines]);

  // Recurrence Preview String
  const recurrencePreview = useMemo(() => {
    if (frequency === "DAILY") {
      return interval === 1 ? "Every day" : `Every ${interval} days`;
    }
    if (frequency === "WEEKLY") {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return `Every ${interval > 1 ? `${interval} weeks` : "week"} on ${days[dayOfWeek]}`;
    }
    if (frequency === "MONTHLY") {
      return `Every ${interval > 1 ? `${interval} months` : "month"} on day ${dayOfMonth}`;
    }
    if (frequency === "YEARLY") {
      return `Every ${interval > 1 ? `${interval} years` : "year"} on starting calendar date`;
    }
    return "";
  }, [frequency, interval, dayOfWeek, dayOfMonth]);

  const validateAndPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!scheduleName.trim()) {
      setErrorMessage("Please enter a schedule name.");
      return;
    }
    if (!partyId) {
      setErrorMessage("Please select a customer / party.");
      return;
    }
    if (!startDate) {
      setErrorMessage("Please select a valid start date.");
      return;
    }
    if (lines.some((l) => !l.description.trim() || Number(l.rate) < 0 || Number(l.quantity) <= 0)) {
      setErrorMessage("Each line item must have a description, valid rate, and quantity > 0.");
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await automatedBillingApi.createSchedule({
        scheduleName: scheduleName.trim(),
        partyId,
        startDate,
        endDate: endDate ? endDate : undefined,
        frequency,
        interval,
        dayOfWeek: frequency === "WEEKLY" ? dayOfWeek : undefined,
        dayOfMonth: frequency === "MONTHLY" ? dayOfMonth : undefined,
        paymentTerms,
        dueDays,
        notes: notes.trim() || undefined,
        termsAndConditions: termsAndConditions.trim() || undefined,
        lines: lines.map((l) => ({
          itemId: l.itemId || undefined,
          description: l.description.trim(),
          hsnCode: l.hsnCode.trim() || undefined,
          quantity: Number(l.quantity),
          unit: l.unit.trim() || undefined,
          rate: Number(l.rate),
          discountPercent: Number(l.discountPercent || 0),
          taxRate: Number(l.taxRate || 0),
        })),
      });

      router.push("/sales/automated-billing");
    } catch (err: any) {
      setShowConfirmModal(false);
      setErrorMessage(err.message || "Failed to create automated billing schedule.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb & Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Link href="/sales/automated-billing" className="hover:text-emerald-700">
              Automated Billing
            </Link>
            <span>/</span>
            <span className="text-gray-800 font-semibold">New Schedule</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Automated Invoice Schedule</h1>
        </div>

        <Link
          href="/sales/automated-billing"
          className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
        >
          Cancel
        </Link>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          {errorMessage}
        </div>
      )}

      <form onSubmit={validateAndPrompt} className="space-y-6">
        {/* Section 1: Schedule Configuration */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#174B43] flex items-center justify-center text-xs font-bold">
              1
            </span>
            <h2 className="text-sm font-bold text-gray-900">Schedule & Frequency</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Schedule Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Acme Corp - Monthly Retainer"
                value={scheduleName}
                onChange={(e) => setScheduleName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Repeat Frequency <span className="text-rose-500">*</span>
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-semibold"
              >
                <option value="DAILY">Daily (દરરોજ)</option>
                <option value="WEEKLY">Weekly (દર અઠવાડિયે)</option>
                <option value="MONTHLY">Monthly (દર મહિને)</option>
                <option value="YEARLY">Yearly (દર વર્ષે)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-mono"
              />
              <span className="text-[10px] text-gray-400">Leave blank to repeat indefinitely until stopped.</span>
            </div>

            {/* Conditional Frequency Rules */}
            {frequency === "WEEKLY" && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Run on Weekday</label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                >
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                  <option value={6}>Saturday</option>
                  <option value={0}>Sunday</option>
                </select>
              </div>
            )}

            {frequency === "MONTHLY" && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Day of Month (1 - 31)</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(Math.min(31, Math.max(1, Number(e.target.value))))}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-mono"
                />
                <span className="text-[10px] text-gray-400">Month-ends (31st) clamp to 28/29/30 automatically.</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Terms</label>
              <select
                value={paymentTerms}
                onChange={(e) => {
                  setPaymentTerms(e.target.value);
                  if (e.target.value === "Due on Receipt") setDueDays(0);
                  if (e.target.value === "Net 15") setDueDays(15);
                  if (e.target.value === "Net 30") setDueDays(30);
                  if (e.target.value === "Net 45") setDueDays(45);
                }}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              >
                <option value="Due on Receipt">Due on Receipt (Immediate)</option>
                <option value="Net 15">Net 15 Days</option>
                <option value="Net 30">Net 30 Days</option>
                <option value="Net 45">Net 45 Days</option>
              </select>
            </div>
          </div>

          {/* Recurrence Summary Box */}
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center gap-2 text-xs text-emerald-800">
            <svg className="w-4 h-4 text-emerald-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              <strong>Recurrence Rule:</strong> {recurrencePreview}
            </span>
          </div>
        </div>

        {/* Section 2: Customer / Party */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#174B43] flex items-center justify-center text-xs font-bold">
              2
            </span>
            <h2 className="text-sm font-bold text-gray-900">Customer (Party) Details</h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Select Customer / Party <span className="text-rose-500">*</span>
            </label>
            <select
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              required
            >
              <option value="">-- Choose from Master Parties --</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.phone ? `(${p.phone})` : ""} {p.gstin ? `[GSTIN: ${p.gstin}]` : ""}
                </option>
              ))}
            </select>
          </div>

          {selectedParty && (
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Legal Name</span>
                <span className="font-bold text-gray-900">{selectedParty.name}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Phone</span>
                <span className="font-medium text-gray-800">{selectedParty.phone || "—"}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">GSTIN / State</span>
                <span className="font-medium text-gray-800">
                  {selectedParty.gstin || "Unregistered"} (State: {selectedParty.stateCode || "—"})
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Line Items */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#174B43] flex items-center justify-center text-xs font-bold">
                3
              </span>
              <h2 className="text-sm font-bold text-gray-900">Line Items & Services</h2>
            </div>
            <button
              type="button"
              onClick={handleAddLine}
              className="text-xs font-bold text-[#174B43] hover:text-[#123B35] flex items-center gap-1"
            >
              + Add Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-semibold">
                <tr>
                  <th className="py-2.5 px-3 min-w-[200px]">Item / Description</th>
                  <th className="py-2.5 px-2 w-20">HSN/SAC</th>
                  <th className="py-2.5 px-2 w-20">Qty</th>
                  <th className="py-2.5 px-2 w-20">Unit</th>
                  <th className="py-2.5 px-2 w-24">Rate (₹)</th>
                  <th className="py-2.5 px-2 w-16">Disc %</th>
                  <th className="py-2.5 px-2 w-20">GST %</th>
                  <th className="py-2.5 px-3 text-right w-24">Total (₹)</th>
                  <th className="py-2.5 px-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map((line, index) => {
                  const gross = (Number(line.quantity) || 0) * (Number(line.rate) || 0);
                  const disc = gross * ((Number(line.discountPercent) || 0) / 100);
                  const taxable = Math.max(0, gross - disc);
                  const tax = taxable * ((Number(line.taxRate) || 0) / 100);
                  const lineTotal = taxable + tax;

                  return (
                    <tr key={line.id} className="hover:bg-gray-50/50">
                      {/* Item selector & Description */}
                      <td className="py-2.5 px-3 space-y-1">
                        <select
                          value={line.itemId}
                          onChange={(e) => handleLineChange(index, "itemId", e.target.value)}
                          className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                        >
                          <option value="">-- Choose Item from Catalog --</option>
                          {items.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.name} ({it.sku || "No SKU"})
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Item Description"
                          value={line.description}
                          onChange={(e) => handleLineChange(index, "description", e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs"
                          required
                        />
                      </td>

                      {/* HSN */}
                      <td className="py-2.5 px-2">
                        <input
                          type="text"
                          value={line.hsnCode}
                          onChange={(e) => handleLineChange(index, "hsnCode", e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-mono"
                        />
                      </td>

                      {/* Qty */}
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          min={0.01}
                          step="any"
                          value={line.quantity}
                          onChange={(e) => handleLineChange(index, "quantity", Number(e.target.value))}
                          className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-mono"
                          required
                        />
                      </td>

                      {/* Unit */}
                      <td className="py-2.5 px-2">
                        <input
                          type="text"
                          value={line.unit}
                          onChange={(e) => handleLineChange(index, "unit", e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs uppercase"
                        />
                      </td>

                      {/* Rate */}
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={line.rate}
                          onChange={(e) => handleLineChange(index, "rate", Number(e.target.value))}
                          className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-mono text-right"
                          required
                        />
                      </td>

                      {/* Discount % */}
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="any"
                          value={line.discountPercent}
                          onChange={(e) => handleLineChange(index, "discountPercent", Number(e.target.value))}
                          className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-mono text-right"
                        />
                      </td>

                      {/* Tax Rate % */}
                      <td className="py-2.5 px-2">
                        <select
                          value={line.taxRate}
                          onChange={(e) => handleLineChange(index, "taxRate", Number(e.target.value))}
                          className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-mono"
                        >
                          <option value={0}>0%</option>
                          <option value={5}>5%</option>
                          <option value={12}>12%</option>
                          <option value={18}>18%</option>
                          <option value={28}>28%</option>
                        </select>
                      </td>

                      {/* Line Total */}
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-gray-900">
                        {formatCurrency(lineTotal)}
                      </td>

                      {/* Delete Action */}
                      <td className="py-2.5 px-2 text-center">
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(index)}
                            className="text-gray-400 hover:text-rose-600 transition"
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

          {/* Totals Summary */}
          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="w-full sm:w-1/2 space-y-2">
              <label className="block text-xs font-semibold text-gray-700">Notes / Remarks</label>
              <textarea
                rows={3}
                placeholder="Notes to appear on every generated invoice..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div className="w-full sm:w-72 bg-gray-50/70 p-4 rounded-xl border border-gray-200 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span className="font-mono">{formatCurrency(calculations.subtotal)}</span>
              </div>
              {calculations.totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount:</span>
                  <span className="font-mono">- {formatCurrency(calculations.totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Taxable Value:</span>
                <span className="font-mono">{formatCurrency(calculations.totalTaxable)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Total GST:</span>
                <span className="font-mono">{formatCurrency(calculations.totalTax)}</span>
              </div>
              <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-gray-900 text-sm">
                <span>Est. Grand Total:</span>
                <span className="font-mono">{formatCurrency(calculations.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/sales/automated-billing"
            className="px-5 py-2.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="px-6 py-2.5 text-xs font-bold text-white bg-[#174B43] hover:bg-[#123B35] rounded-xl shadow-sm transition flex items-center gap-2"
          >
            Save & Activate Schedule
          </button>
        </div>
      </form>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-center gap-3 text-[#174B43]">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-gray-900">Confirm Schedule Activation</h3>
            </div>

            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Customer:</span>
                <span className="font-bold text-gray-900">{selectedParty?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Frequency:</span>
                <span className="font-bold text-gray-900">{recurrencePreview}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Start Date:</span>
                <span className="font-mono text-gray-900">{startDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Estimated Amount:</span>
                <span className="font-mono font-bold text-[#174B43]">{formatCurrency(calculations.grandTotal)}</span>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Upon confirmation, this schedule will become <strong>Active</strong>. On each eligible run date, a real statutory GST sales invoice will be automatically created with inventory updates and double-entry general ledger vouchers.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={isSubmitting}
                className="px-5 py-2 bg-[#174B43] hover:bg-[#123B35] text-white rounded-xl text-xs font-bold transition flex items-center gap-2"
              >
                {isSubmitting ? "Creating..." : "Confirm & Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
