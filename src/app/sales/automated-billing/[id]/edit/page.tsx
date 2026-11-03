"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import {
  automatedBillingApi,
  AutomatedBillingSchedule,
  formatCurrency,
} from "@/lib/automated-billing";

interface FormLine {
  id: string;
  itemId?: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  rate: number;
  discountPercent: number;
  taxRate: number;
}

export default function EditAutomatedBillingPage() {
  const params = useParams();
  const router = useRouter();
  const scheduleId = params?.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [schedule, setSchedule] = useState<AutomatedBillingSchedule | null>(null);

  // Form State
  const [scheduleName, setScheduleName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [frequency, setFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY">("MONTHLY");
  const [interval, setInterval] = useState(1);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [paymentTerms, setPaymentTerms] = useState("Net 15");
  const [dueDays, setDueDays] = useState(15);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<FormLine[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!scheduleId) return;
    (async () => {
      setIsLoading(true);
      try {
        const s = await automatedBillingApi.getScheduleById(scheduleId);
        setSchedule(s);
        setScheduleName(s.scheduleName);
        setStartDate(s.startDate ? new Date(s.startDate).toISOString().split("T")[0] : "");
        setEndDate(s.endDate ? new Date(s.endDate).toISOString().split("T")[0] : "");
        setFrequency(s.frequency as any);
        setInterval(s.interval || 1);
        setDayOfWeek(s.dayOfWeek !== null && s.dayOfWeek !== undefined ? s.dayOfWeek : 1);
        setDayOfMonth(s.dayOfMonth || 1);
        setPaymentTerms(s.paymentTerms || "Due on Receipt");
        setDueDays(s.dueDays || 0);
        setNotes(s.notes || "");

        if (s.lines && s.lines.length > 0) {
          setLines(
            s.lines.map((l, i) => ({
              id: l.id || `line-${i}`,
              itemId: l.itemId || undefined,
              description: l.description,
              hsnCode: l.hsnCode || "",
              quantity: Number(l.quantity),
              unit: l.unit || "PCS",
              rate: Number(l.rate),
              discountPercent: Number(l.discountPercent || 0),
              taxRate: Number(l.taxRate || 0),
            })),
          );
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to load schedule.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [scheduleId]);

  const handleLineChange = (index: number, field: keyof FormLine, value: any) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}`,
        itemId: undefined,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedule) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await automatedBillingApi.updateSchedule(schedule.id, {
        scheduleName: scheduleName.trim(),
        startDate,
        endDate: endDate ? endDate : undefined,
        frequency,
        interval,
        dayOfWeek: frequency === "WEEKLY" ? dayOfWeek : undefined,
        dayOfMonth: frequency === "MONTHLY" ? dayOfMonth : undefined,
        paymentTerms,
        dueDays,
        notes: notes.trim() || undefined,
        lines: lines.map((l) => ({
          itemId: l.itemId,
          description: l.description.trim(),
          hsnCode: l.hsnCode.trim() || undefined,
          quantity: Number(l.quantity),
          unit: l.unit.trim() || undefined,
          rate: Number(l.rate),
          discountPercent: Number(l.discountPercent || 0),
          taxRate: Number(l.taxRate || 0),
        })),
      });

      router.push(`/sales/automated-billing/${schedule.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update schedule.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        <div className="h-64 bg-gray-100 rounded-2xl animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Link href="/sales/automated-billing" className="hover:text-emerald-700">
              Automated Billing
            </Link>
            <span>/</span>
            <Link href={`/sales/automated-billing/${scheduleId}`} className="hover:text-emerald-700 font-mono">
              {scheduleId?.slice(0, 8)}
            </Link>
            <span>/</span>
            <span className="text-gray-800 font-semibold">Edit</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Automated Schedule</h1>
        </div>

        <Link
          href={`/sales/automated-billing/${scheduleId}`}
          className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
        >
          Cancel
        </Link>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">
            Schedule Settings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Schedule Name</label>
              <input
                type="text"
                value={scheduleName}
                onChange={(e) => setScheduleName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Repeat Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h2 className="text-sm font-bold text-gray-900">Line Items & Services</h2>
            <button
              type="button"
              onClick={handleAddLine}
              className="text-xs font-bold text-[#174B43] hover:text-[#123B35]"
            >
              + Add Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-semibold">
                <tr>
                  <th className="py-2.5 px-3 min-w-[200px]">Description</th>
                  <th className="py-2.5 px-2 w-20">HSN</th>
                  <th className="py-2.5 px-2 w-20">Qty</th>
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
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) => handleLineChange(index, "description", e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs"
                          required
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={line.hsnCode}
                          onChange={(e) => handleLineChange(index, "hsnCode", e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-mono"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="any"
                          value={line.quantity}
                          onChange={(e) => handleLineChange(index, "quantity", Number(e.target.value))}
                          className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-mono"
                          required
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="any"
                          value={line.rate}
                          onChange={(e) => handleLineChange(index, "rate", Number(e.target.value))}
                          className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-mono text-right"
                          required
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="any"
                          value={line.discountPercent}
                          onChange={(e) => handleLineChange(index, "discountPercent", Number(e.target.value))}
                          className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-mono text-right"
                        />
                      </td>
                      <td className="py-2 px-2">
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
                      <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">
                        {formatCurrency(lineTotal)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(index)}
                            className="text-gray-400 hover:text-rose-600"
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

          <div className="flex justify-end pt-3 border-t border-gray-100 text-sm font-bold text-gray-900">
            <span>Estimated Grand Total: {formatCurrency(calculations.grandTotal)}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link
            href={`/sales/automated-billing/${scheduleId}`}
            className="px-5 py-2.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 text-xs font-bold text-white bg-[#174B43] hover:bg-[#123B35] rounded-xl shadow-sm transition disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
