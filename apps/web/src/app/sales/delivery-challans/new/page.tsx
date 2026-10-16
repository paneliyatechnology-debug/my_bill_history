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
  type?: string;
  stateCode?: string;
  phone?: string;
}

interface WarehouseOption {
  id: string;
  name: string;
  isDefault?: boolean;
}

interface ItemOption {
  id: string;
  name: string;
  hsnCode?: string;
  taxRate?: number;
  purchaseRate?: number;
  retailPrice?: number;
  stockQuantity?: number;
}

interface ChallanItemRow {
  itemId: string;
  description: string;
  hsnCode: string;
  quantity: number | "";
  unitPrice: number | "";
  taxRate: number;
}

export default function NewDeliveryChallanPage() {
  const router = useRouter();
  const { lang, tenantContext, currentCompany } = useAuth();

  const [parties, setParties] = useState<PartyOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [challanNumber, setChallanNumber] = useState(
    `DC-${Date.now().toString().slice(-6)}`
  );
  const [challanDate, setChallanDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [challanType, setChallanType] = useState<
    "JOB_WORK" | "SUPPLY_ON_APPROVAL" | "BRANCH_TRANSFER" | "OTHER"
  >("JOB_WORK");
  const [partyId, setPartyId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState(
    currentCompany?.stateCode || "24"
  );
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [rows, setRows] = useState<ChallanItemRow[]>([
    {
      itemId: "",
      description: "",
      hsnCode: "",
      quantity: 1,
      unitPrice: "",
      taxRate: 5,
    },
  ]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ptRes, whRes, itRes]: any = await Promise.allSettled([
        apiClient.get("/parties"),
        apiClient.get("/warehouses"),
        apiClient.get("/items"),
      ]);

      const pList = ptRes.status === "fulfilled" ? extractList<PartyOption>(ptRes.value) : [];
      const wList = whRes.status === "fulfilled" ? extractList<WarehouseOption>(whRes.value) : [];
      const iList = itRes.status === "fulfilled" ? extractList<ItemOption>(itRes.value) : [];

      setParties(pList);
      setWarehouses(wList);
      setItems(iList);

      if (wList.length > 0) {
        const defaultWh = wList.find((w) => w.isDefault) || wList[0];
        setWarehouseId(defaultWh.id);
      }

      if (iList.length > 0) {
        setRows([
          {
            itemId: iList[0].id,
            description: iList[0].name,
            hsnCode: iList[0].hsnCode || "1006",
            quantity: 1,
            unitPrice: iList[0].retailPrice || 100,
            taxRate: iList[0].taxRate ?? 5,
          },
        ]);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load master data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [tenantContext.companyId, fetchData]);

  useEffect(() => {
    if (currentCompany?.stateCode && !partyId) {
      setPlaceOfSupply(currentCompany.stateCode);
    }
  }, [currentCompany?.stateCode, partyId]);

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
      description: item.name,
      hsnCode: item.hsnCode || "1006",
      unitPrice: item.retailPrice || 0,
      taxRate: item.taxRate ?? 5,
    };
    setRows(updated);
  };

  const handleRowChange = (
    idx: number,
    field: keyof ChallanItemRow,
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
        description: firstItem?.name || "",
        hsnCode: firstItem?.hsnCode || "1006",
        quantity: 1,
        unitPrice: firstItem?.retailPrice || 0,
        taxRate: firstItem?.taxRate ?? 5,
      },
    ]);
  };

  const handleRemoveRow = (idx: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== idx));
  };

  // Keyboard shortcut F2 for fast row addition
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

  // Statutory Tax Calculations
  const companyState = currentCompany?.stateCode || "24";
  const isInterState = placeOfSupply !== companyState;

  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalQuantity = 0;

  rows.forEach((r) => {
    const qty = Number(r.quantity) || 0;
    const rate = Number(r.unitPrice) || 0;
    const lineTaxable = qty * rate;
    const lineTax = (lineTaxable * r.taxRate) / 100;

    totalQuantity += qty;
    totalTaxable += lineTaxable;

    if (isInterState) {
      totalIgst += lineTax;
    } else {
      totalCgst += lineTax / 2;
      totalSgst += lineTax / 2;
    }
  });

  const totalTax = totalCgst + totalSgst + totalIgst;
  const grandTotal = totalTaxable + totalTax;

  const formatInr = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseId) {
      setError(lang === "gu" ? "ગોડાઉન પસંદ કરવું ફરજિયાત છે." : "Dispatch Warehouse is required.");
      return;
    }
    if (rows.length === 0 || !rows.some((r) => r.itemId && Number(r.quantity) > 0)) {
      setError(
        lang === "gu"
          ? "ઓછામાં ઓછી એક વસ્તુ અને તેનો જથ્થો ઉમેરવો જરૂરી છે."
          : "Please specify at least one valid item with positive quantity."
      );
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await apiClient.post("/distribution/challans", {
        challanNumber: challanNumber.trim() || undefined,
        challanDate,
        challanType,
        partyId: partyId || undefined,
        warehouseId,
        placeOfSupply: placeOfSupply.trim() || undefined,
        vehicleNumber: vehicleNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        items: rows.map((r) => ({
          itemId: r.itemId,
          description: r.description || undefined,
          hsnCode: r.hsnCode || undefined,
          quantity: Number(r.quantity) || 1,
          unitPrice: Number(r.unitPrice) || 0,
          taxRate: Number(r.taxRate) || 0,
        })),
      });

      router.push("/sales/delivery-challans");
    } catch (err: any) {
      setError(
        lang === "gu" && err.messageGujarati
          ? err.messageGujarati
          : err.message || "Failed to create delivery challan."
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. TOP HEADER & BREADCRUMB */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href="/sales/delivery-challans"
              className="text-xs font-semibold text-[#F47721] hover:underline flex items-center gap-1"
            >
              ← {lang === "gu" ? "બધા ડિલિવરી ચલણ" : "Back to Delivery Challans"}
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#202124] tracking-tight">
            {lang === "gu" ? "નવું ડિલિવરી ચલણ બનાવો" : "Create Delivery Challan"}
          </h1>
          <p className="text-xs text-[#667085] mt-1">
            {lang === "gu"
              ? "GST નિયમ ૫૫ મુજબ જોબ વર્ક, અપ્રુવલ પર માલ મોકલવા અને બ્રાન્ચ ટ્રાન્સફર માટે નોન-સેલ ચલણ"
              : "Section 55 GST Non-Sale Delivery Challan for Job Work, Supply on Approval, and Branch Movement"}
          </p>
        </div>

        {/* Live Total Badge */}
        <div className="bg-[#FAFBFD] border border-[#E5E7EB] rounded-xl p-3 sm:px-5 flex items-center justify-between sm:justify-end gap-4 shrink-0">
          <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
            {lang === "gu" ? "ચલણ કુલ મૂલ્ય" : "Challan Value"}
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-[#F47721] font-mono tracking-tight">
            {formatInr(grandTotal)}
          </span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-500 hover:text-rose-700 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 2. CHALLAN META CARD */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E5E7EB] bg-[#FAFBFD] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-[#202124] uppercase tracking-wider">
                {lang === "gu" ? "ચલણ સામાન્ય વિગતો" : "Challan & Dispatch Information"}
              </h2>
            </div>
            <span className="text-[11px] text-[#667085] font-medium">Rule 55 CGST</span>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Challan Number */}
          <div>
            <label className="block text-xs font-bold text-[#202124] uppercase mb-1">
              {lang === "gu" ? "ચલણ નંબર" : "Challan Number"}
            </label>
            <input
              type="text"
              value={challanNumber}
              onChange={(e) => setChallanNumber(e.target.value)}
              placeholder="DC-0001"
              className="w-full text-xs p-2.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg font-mono font-bold text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#F47721] focus:outline-none"
            />
          </div>

          {/* Challan Date */}
          <div>
            <label className="block text-xs font-bold text-[#202124] uppercase mb-1">
              {lang === "gu" ? "તારીખ *" : "Challan Date *"}
            </label>
            <input
              type="date"
              required
              value={challanDate}
              onChange={(e) => setChallanDate(e.target.value)}
              className="w-full text-xs p-2.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg font-mono text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#F47721] focus:outline-none"
            />
          </div>

          {/* Challan Type */}
          <div>
            <label className="block text-xs font-bold text-[#202124] uppercase mb-1">
              {lang === "gu" ? "ચલણ પ્રકાર *" : "Challan Purpose *"}
            </label>
            <select
              value={challanType}
              onChange={(e) => setChallanType(e.target.value as any)}
              className="w-full text-xs p-2.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg font-bold text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#F47721] focus:outline-none"
            >
              <option value="JOB_WORK">
                {lang === "gu" ? "જોબ વર્ક (Rule 55)" : "Job Work (Rule 55)"}
              </option>
              <option value="SUPPLY_ON_APPROVAL">
                {lang === "gu" ? "અપ્રુવલ પર માલ (Supply on Approval)" : "Supply on Approval"}
              </option>
              <option value="BRANCH_TRANSFER">
                {lang === "gu" ? "બ્રાન્ચ / ગોડાઉન ટ્રાન્સફર" : "Branch Transfer"}
              </option>
              <option value="OTHER">
                {lang === "gu" ? "અન્ય હેરફેર (Other Movement)" : "Other Movement of Goods"}
              </option>
            </select>
          </div>

          {/* Dispatch Warehouse */}
          <div>
            <label className="block text-xs font-bold text-[#202124] uppercase mb-1">
              {lang === "gu" ? "ડિસ્પેચ ગોડાઉન *" : "Dispatch Warehouse *"}
            </label>
            <select
              value={warehouseId}
              required
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full text-xs p-2.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg font-semibold text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#F47721] focus:outline-none"
            >
              {warehouses.length === 0 ? (
                <option value="">{lang === "gu" ? "કોઈ ગોડાઉન નથી" : "No Warehouses Available"}</option>
              ) : (
                warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.isDefault ? "(Default)" : ""}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Party / Recipient */}
          <div>
            <label className="block text-xs font-bold text-[#202124] uppercase mb-1">
              {lang === "gu" ? "વેપારી / મેળવનાર (Party)" : "Recipient / Party"}
            </label>
            <select
              value={partyId}
              onChange={(e) => handlePartyChange(e.target.value)}
              className="w-full text-xs p-2.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg font-semibold text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#F47721] focus:outline-none"
            >
              <option value="">{lang === "gu" ? "-- સીધા / પોતાને (Direct/Self) --" : "-- Direct / Self / Non-Party --"}</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.gstin ? `(${p.gstin})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Place of Supply */}
          <div>
            <label className="block text-xs font-bold text-[#202124] uppercase mb-1">
              {lang === "gu" ? "સપ્લાય રાજ્ય કોડ" : "Place of Supply State Code"}
            </label>
            <input
              type="text"
              value={placeOfSupply}
              onChange={(e) => setPlaceOfSupply(e.target.value)}
              placeholder="24 (Gujarat)"
              className="w-full text-xs p-2.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg font-mono font-bold text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#F47721] focus:outline-none"
            />
          </div>

          {/* Vehicle Number */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-[#202124] uppercase mb-1">
              {lang === "gu" ? "વાહન નંબર (Vehicle / Transport #)" : "Vehicle / Transport Number"}
            </label>
            <input
              type="text"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
              placeholder="e.g. GJ-01-AB-1234"
              className="w-full text-xs p-2.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg font-mono text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#F47721] focus:outline-none"
            />
          </div>
        </div>
      </div>

        {/* 3. ITEMS TABLE CARD */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
          {/* Table Header Controls */}
          <div className="p-4 border-b border-[#E5E7EB] bg-[#FAFBFD] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div>
                <h2 className="text-xs font-bold text-[#202124] uppercase tracking-wider">
                  {lang === "gu" ? "ચલણ માલસામાન વિગત (Goods Items)" : "Goods & Materials for Movement"}
                </h2>
                <p className="text-[11px] text-[#667085]">
                  {isInterState
                    ? (lang === "gu" ? "આંતરરાજ્ય સપ્લાય (IGST લાગુ થશે)" : "Inter-State Movement (IGST Applicable)")
                    : (lang === "gu" ? "સ્થાનિક ગુજરાત સપ્લાય (CGST 50% + SGST 50%)" : "Intra-State Movement (CGST + SGST Applicable)")}
                </p>
              </div>
            </div>

            {/* Quick Add Row Button */}
            <button
              type="button"
              onClick={handleAddRow}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#F47721] hover:bg-[#D95F12] text-white rounded-xl text-xs font-bold shadow-saffron transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>{lang === "gu" ? "આઈટમ ઉમેરો (F2)" : "Add Item (F2)"}</span>
            </button>
          </div>

          {/* Table Body */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FB] text-[#667085] uppercase tracking-wider font-semibold border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-3 py-3 w-10 text-center">#</th>
                  <th className="px-4 py-3 min-w-[240px]">{lang === "gu" ? "વસ્તુનું નામ / વિગત" : "Item & Description"}</th>
                  <th className="px-3 py-3 w-24">{lang === "gu" ? "HSN કોડ" : "HSN"}</th>
                  <th className="px-3 py-3 w-28 text-right">{lang === "gu" ? "જથ્થો (Qty)" : "Quantity"}</th>
                  <th className="px-3 py-3 w-32 text-right">{lang === "gu" ? "મૂલ્યાંકન દર (₹)" : "Rate (₹)"}</th>
                  <th className="px-3 py-3 w-24 text-right">{lang === "gu" ? "GST %" : "GST %"}</th>
                  <th className="px-4 py-3 w-36 text-right">{lang === "gu" ? "કુલ રકમ (₹)" : "Line Total (₹)"}</th>
                  <th className="px-3 py-3 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {rows.map((row, idx) => {
                  const qty = Number(row.quantity) || 0;
                  const rate = Number(row.unitPrice) || 0;
                  const lineTaxable = qty * rate;
                  const lineTax = (lineTaxable * row.taxRate) / 100;
                  const lineTotal = lineTaxable + lineTax;

                  return (
                    <tr key={idx} className="hover:bg-[#FFFAF5] transition-colors">
                      <td className="px-3 py-2 text-center text-[#98A2B3] font-mono">{idx + 1}</td>

                      {/* Item Select */}
                      <td className="px-4 py-2">
                        <select
                          value={row.itemId}
                          onChange={(e) => handleItemSelect(idx, e.target.value)}
                          className="w-full text-xs p-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg font-semibold text-[#202124] focus:bg-white focus:ring-1 focus:ring-[#F47721]"
                        >
                          <option value="">{lang === "gu" ? "-- વસ્તુ પસંદ કરો --" : "-- Select Item --"}</option>
                          {items.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.name} {it.stockQuantity !== undefined ? `(Stock: ${it.stockQuantity})` : ""}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* HSN */}
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={row.hsnCode}
                          onChange={(e) => handleRowChange(idx, "hsnCode", e.target.value)}
                          className="w-full text-xs p-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg font-mono text-[#202124] focus:bg-white"
                        />
                      </td>

                      {/* Quantity */}
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0.001"
                          step="any"
                          required
                          value={row.quantity}
                          onChange={(e) => handleRowChange(idx, "quantity", e.target.value)}
                          className="w-full text-xs p-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg text-right font-mono font-bold text-[#202124] focus:bg-white"
                        />
                      </td>

                      {/* Unit Price */}
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={row.unitPrice}
                          onChange={(e) => handleRowChange(idx, "unitPrice", e.target.value)}
                          className="w-full text-xs p-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg text-right font-mono font-bold text-[#202124] focus:bg-white"
                        />
                      </td>

                      {/* GST Tax Rate */}
                      <td className="px-3 py-2">
                        <select
                          value={row.taxRate}
                          onChange={(e) => handleRowChange(idx, "taxRate", Number(e.target.value))}
                          className="w-full text-xs p-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg text-right font-mono font-bold text-[#F47721] focus:bg-white"
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

                      {/* Delete */}
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          disabled={rows.length <= 1}
                          className="text-[#98A2B3] hover:text-[#DC3545] disabled:opacity-20 p-1 rounded transition-colors"
                          title="Remove item"
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

        {/* 4. REMARKS & SUMMARY BREAKDOWN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Notes Card */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden flex flex-col justify-between">
            <div>
              <div className="p-4 border-b border-[#E5E7EB] bg-[#FAFBFD] flex items-center gap-2">
                <h2 className="text-xs font-bold text-[#202124] uppercase tracking-wider">
                  {lang === "gu" ? "ટ્રાન્સપોર્ટ / ડિલિવરી નોંધ (Remarks)" : "Transport Remarks & Delivery Notes"}
                </h2>
              </div>
              <div className="p-5 space-y-3">
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    lang === "gu"
                      ? "ટ્રાન્સપોર્ટર વિગત, જોબ વર્ક સૂચના અથવા વિશેષ નોંધ..."
                      : "Transporter details, handling instructions, or Job Work reference..."
                  }
                  className="w-full text-xs p-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-[#202124] focus:bg-white focus:ring-2 focus:ring-[#F47721] focus:outline-none"
                />
              </div>
            </div>
            <div className="px-5 pb-5 text-[11px] text-[#667085] flex items-center gap-1.5">
              <span>📄</span>
              <span>
                {lang === "gu"
                  ? "જીએસટી નિયમ ૫૫ મુજબ આ દસ્તાવેજ વેચાણ વગર માલસામાનની હેરફેર માટે માન્ય છે."
                  : "Section 55 compliant document for goods movement without passing ownership/sale."}
              </span>
            </div>
          </div>

          {/* Tax Breakdown & Grand Total Card */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#E5E7EB] bg-[#FAFBFD] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-[#202124] uppercase tracking-wider">
                  {lang === "gu" ? "કર અને રકમ વિગત" : "Tax Breakdown & Summary"}
                </h2>
              </div>
            </div>
            <div className="p-5 space-y-3">
            <div className="space-y-2 text-xs text-[#667085] pb-3 border-b border-[#E5E7EB]">
              <div className="flex justify-between">
                <span>{lang === "gu" ? "કુલ વસ્તુઓ / જથ્થો" : "Total Lines / Quantity"}:</span>
                <span className="font-mono font-semibold text-[#202124]">
                  {rows.length} {rows.length === 1 ? "line" : "lines"} • {totalQuantity} {lang === "gu" ? "એકમ" : "units"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{lang === "gu" ? "કરપાત્ર કિંમત" : "Taxable Value"}:</span>
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
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-bold text-[#202124] uppercase">
                {lang === "gu" ? "કુલ ચલણ મૂલ્ય" : "Total Challan Value"}:
              </span>
              <span className="text-2xl font-extrabold text-[#F47721] font-mono">
                {formatInr(grandTotal)}
              </span>
            </div>

            {/* Submit Action Buttons */}
            <div className="pt-3 flex items-center justify-end gap-3">
              <Link
                href="/sales/delivery-challans"
                className="px-4 py-2.5 bg-[#F8F9FB] hover:bg-[#F3F4F6] text-[#667085] border border-[#E5E7EB] rounded-xl text-xs font-semibold transition-colors"
              >
                {lang === "gu" ? "રદ કરો" : "Cancel"}
              </Link>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-[#F47721] hover:bg-[#D95F12] text-white rounded-xl text-xs sm:text-sm font-bold shadow-saffron transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{lang === "gu" ? "ચલણ બની રહ્યું છે..." : "Generating Challan..."}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{lang === "gu" ? "ચલણ સાચવો" : "Create Delivery Challan"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  </div>
);
}
