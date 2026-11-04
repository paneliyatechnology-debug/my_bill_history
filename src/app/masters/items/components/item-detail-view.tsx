"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "../../../../lib/api-client";
import {
  PartyWisePriceRule,
  getItemPartyPrices,
  setItemPartyPrices,
} from "../../../../lib/party-item-pricing";

export interface ItemDetailData {
  id: string;
  type: "PRODUCT" | "SERVICE";
  name: string;
  nameGujarati?: string;
  sku?: string;
  barcode?: string;
  hsnCode: string;
  taxRate: number;
  retailPrice: number;
  mrp?: number;
  purchaseRate?: number;
  wholesalePrice?: number;
  minStockLevel?: number;
  currentStock?: number;
  trackBatches?: boolean;
  trackSerialNo?: boolean;
  isActive: boolean;
  description?: string;
  categoryId?: string | null;
  primaryUomId?: string;
  secondaryUomId?: string | null;
  conversionFactor?: number | null;
  primaryUom?: {
    id: string;
    name: string;
    code?: string;
    uqcCode?: string;
    symbol?: string;
  };
  secondaryUom?: {
    id: string;
    name: string;
    code?: string;
    uqcCode?: string;
    symbol?: string;
  };
  category?: {
    id: string;
    name: string;
  };
}

interface StockMovementRow {
  id: string;
  date: string;
  transactionType: string;
  quantity: number;
  invoiceNumber: string;
  invoiceId?: string | null;
  docLink?: string;
  closingStock: number;
  valuationRate?: number;
  totalValuation?: number;
}

interface PartyReportRow {
  partyId: string;
  partyName: string;
  salesQuantity: number;
  salesAmount: number;
  purchaseQuantity: number;
  purchaseAmount: number;
}

interface PartyOption {
  id: string;
  name: string;
}

export type ItemDetailTab = "details" | "stock" | "party_report" | "party_prices";

interface ItemDetailViewProps {
  item: ItemDetailData;
  allItems: ItemDetailData[];
  onSelectItem: (id: string) => void;
  onBack: () => void;
  onEdit: (item: ItemDetailData) => void;
  onAdjustStock: (item: ItemDetailData) => void;
  onBarcode: (item: ItemDetailData) => void;
  onDelete: (item: ItemDetailData) => void;
  onCreateItem: () => void;
  parties?: PartyOption[];
  categories?: Array<{ id: string; name: string }>;
  lang?: "en" | "gu";
}

function formatInr(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === "" || val === 0) return "-";
  const num = Number(val) || 0;
  return (
    "₹ " +
    num.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  );
}

function formatDateDisplay(val?: string): string {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export function ItemDetailView({
  item,
  allItems,
  onSelectItem,
  onBack,
  onEdit,
  onAdjustStock,
  onBarcode,
  onDelete,
  onCreateItem,
  parties = [],
  categories = [],
  lang = "en",
}: ItemDetailViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ItemDetailTab>("details");
  const [leftSearch, setLeftSearch] = useState("");

  // Date Range state for Stock Details & Party Report
  const [dateRangeKey, setDateRangeKey] = useState<string>("last-365-days");

  // Stock Details State
  const [stockMovements, setStockMovements] = useState<StockMovementRow[]>([]);
  const [isLoadingStock, setIsLoadingStock] = useState(false);

  // Party Wise Report State
  const [partyReports, setPartyReports] = useState<PartyReportRow[]>([]);
  const [isLoadingPartyReport, setIsLoadingPartyReport] = useState(false);

  // Party Wise Prices State
  const [partyPrices, setPartyPrices] = useState<PartyWisePriceRule[]>([]);
  const [partyPriceSearch, setPartyPriceSearch] = useState("");
  const [isEditPartyPricesModalOpen, setIsEditPartyPricesModalOpen] = useState(false);
  const [editingPartyPriceId, setEditingPartyPriceId] = useState("");
  const [newPartyPriceVal, setNewPartyPriceVal] = useState("");

  // Compute date range
  const dateRangeBounds = useMemo(() => {
    const now = new Date();
    let start: Date | null = null;
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    if (dateRangeKey === "today") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (dateRangeKey === "last-7-days") {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
    } else if (dateRangeKey === "last-30-days") {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
    } else if (dateRangeKey === "last-365-days") {
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
    }

    return {
      startDate: start ? start.toISOString().slice(0, 10) : undefined,
      endDate: end.toISOString().slice(0, 10),
    };
  }, [dateRangeKey]);

  // Load Stock Movements
  const loadStockDetails = useCallback(async () => {
    if (!item.id) return;
    setIsLoadingStock(true);
    try {
      const res: any = await apiClient.get(`/masters/items/${item.id}/stock-details`, {
        startDate: dateRangeBounds.startDate,
        endDate: dateRangeBounds.endDate,
      });
      setStockMovements(res.transactions || []);
    } catch {
      setStockMovements([]);
    } finally {
      setIsLoadingStock(false);
    }
  }, [item.id, dateRangeBounds]);

  // Load Party Report
  const loadPartyReport = useCallback(async () => {
    if (!item.id) return;
    setIsLoadingPartyReport(true);
    try {
      const res: any = await apiClient.get(`/masters/items/${item.id}/party-report`, {
        startDate: dateRangeBounds.startDate,
        endDate: dateRangeBounds.endDate,
      });
      setPartyReports(res.parties || []);
    } catch {
      setPartyReports([]);
    } finally {
      setIsLoadingPartyReport(false);
    }
  }, [item.id, dateRangeBounds]);

  // Load Party Wise Prices
  const loadPartyPrices = useCallback(() => {
    if (!item.id) return;
    const rules = getItemPartyPrices(item.id);
    setPartyPrices(rules);
  }, [item.id]);

  useEffect(() => {
    if (activeTab === "stock") {
      loadStockDetails();
    } else if (activeTab === "party_report") {
      loadPartyReport();
    } else if (activeTab === "party_prices") {
      loadPartyPrices();
    }
  }, [activeTab, loadStockDetails, loadPartyReport, loadPartyPrices]);

  // Left side item search filter
  const filteredLeftItems = useMemo(() => {
    if (!leftSearch.trim()) return allItems;
    const q = leftSearch.toLowerCase().trim();
    return allItems.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        (it.hsnCode && it.hsnCode.includes(q)) ||
        (it.sku && it.sku.toLowerCase().includes(q)) ||
        (it.barcode && it.barcode.toLowerCase().includes(q)),
    );
  }, [allItems, leftSearch]);

  const uomLabel =
    item.primaryUom?.code ||
    item.primaryUom?.uqcCode ||
    item.primaryUom?.symbol ||
    item.primaryUom?.name ||
    "PCS";

  const secondaryUomLabel =
    item.secondaryUom?.code ||
    item.secondaryUom?.uqcCode ||
    item.secondaryUom?.symbol ||
    item.secondaryUom?.name ||
    "-";

  const categoryName =
    item.category?.name || categories.find((c) => c.id === item.categoryId)?.name || "-";

  const currentStockNum = Number(item.currentStock) || 0;
  const stockValuation =
    currentStockNum * (Number(item.purchaseRate) || Number(item.retailPrice) || 0);

  // Stock status badge
  const isOutOfStock = currentStockNum <= 0;
  const isLowStock =
    !isOutOfStock &&
    Boolean(item.minStockLevel && item.minStockLevel > 0 && currentStockNum <= item.minStockLevel);

  // Handle Save Party Price
  const handleSavePartyPriceRule = () => {
    if (!editingPartyPriceId) return;
    const matchedParty = parties.find((p) => p.id === editingPartyPriceId);
    if (!matchedParty) return;

    const priceNum = parseFloat(newPartyPriceVal) || 0;
    const updated = partyPrices.filter((r) => r.partyId !== editingPartyPriceId);
    if (priceNum > 0) {
      updated.push({
        partyId: matchedParty.id,
        partyName: matchedParty.name,
        price: priceNum,
      });
    }

    setItemPartyPrices(item.id, updated, item.name);
    setPartyPrices(updated);
    setIsEditPartyPricesModalOpen(false);
    setEditingPartyPriceId("");
    setNewPartyPriceVal("");
  };

  const handleExportStockCsv = () => {
    if (stockMovements.length === 0) return;
    const headers = ["Date", "Transaction Type", "Quantity", "Invoice Number", "Closing Stock"];
    const rows = stockMovements.map((m) => [
      formatDateDisplay(m.date),
      m.transactionType,
      `${m.quantity} ${uomLabel}`,
      m.invoiceNumber || "-",
      `${m.closingStock} ${uomLabel}`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((x) => `"${x}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Stock_Details_${item.name.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPartyReportCsv = () => {
    if (partyReports.length === 0) return;
    const headers = ["Party Name", "Sales Quantity", "Sales Amount", "Purchase Quantity", "Purchase Amount"];
    const rows = partyReports.map((p) => [
      p.partyName,
      p.salesQuantity,
      p.salesAmount,
      p.purchaseQuantity,
      p.purchaseAmount,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((x) => `"${x}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Party_Report_${item.name.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col md:flex-row bg-[#F8FAFC] border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[calc(100vh-170px)]">
      {/* ======================================================== */}
      {/* LEFT COLUMN: ITEM LIST WITH SEARCH & CREATE              */}
      {/* ======================================================== */}
      <div className="w-full md:w-72 lg:w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
        {/* Search Input */}
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
              🔍
            </span>
            <input
              type="text"
              value={leftSearch}
              onChange={(e) => setLeftSearch(e.target.value)}
              placeholder="Search by HSN / Name..."
              className="w-full pl-8 pr-3 py-1.5 text-[13px] bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all h-10"
            />
          </div>
        </div>

        {/* Create Item Button */}
        <div className="p-3 border-b border-slate-100">
          <button
            type="button"
            onClick={onCreateItem}
            className="w-full py-2 px-3 border border-dashed border-indigo-400 rounded-lg text-[13px] font-medium text-indigo-600 bg-indigo-50/40 hover:bg-indigo-50 hover:border-indigo-500 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <span>+</span>
            <span>Create Item</span>
          </button>
        </div>

        {/* Scrollable Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[calc(100vh-270px)]">
          {filteredLeftItems.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">No items match your search.</div>
          ) : (
            filteredLeftItems.map((it) => {
              const isSelected = it.id === item.id;
              const itStock = Number(it.currentStock) || 0;
              const itUom =
                it.primaryUom?.code ||
                it.primaryUom?.uqcCode ||
                it.primaryUom?.symbol ||
                "PCS";
              return (
                <div
                  key={it.id}
                  onClick={() => onSelectItem(it.id)}
                  className={`px-4 py-3 cursor-pointer transition-all flex items-center justify-between text-xs ${
                    isSelected
                      ? "bg-[#EDE9FE]/50 text-indigo-950 font-bold border-l-4 border-l-[#5c56df]"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className="truncate pr-2">{it.name}</span>
                  <span
                    className={`shrink-0 font-medium ${
                      itStock > 0 ? "text-slate-600" : "text-slate-400"
                    }`}
                  >
                    {itStock > 0 ? `${itStock} ${itUom}` : "-"}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT COLUMN: ITEM DETAIL & 4 TABS                       */}
      {/* ======================================================== */}
      <div className="flex-1 bg-white flex flex-col overflow-y-auto min-w-0">
        {/* 1. Header Bar matching myBillBook */}
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              title="Back to All Items"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M9.707 14.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 9H16a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <h1 className="text-[22px] font-semibold text-[#182230]">{item.name}</h1>
            <span
              className={`px-2 py-0.5 text-[11px] font-bold rounded-md uppercase tracking-wide border ${
                isOutOfStock
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : isLowStock
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}
            >
              {isOutOfStock ? "Out of Stock" : isLowStock ? "Low Stock" : "In Stock"}
            </span>
          </div>

          {/* Action Buttons: Print Barcode, Adjust Stock, Edit, Delete, Settings */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onBarcode(item)}
              className="h-9 px-3 border border-slate-300 rounded-lg text-[13px] font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <span>🏷️</span>
              <span>Print Barcode</span>
            </button>

            {item.type === "PRODUCT" && (
              <button
                type="button"
                onClick={() => onAdjustStock(item)}
                className="h-9 px-3 border border-slate-300 rounded-lg text-[13px] font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <span>📦</span>
                <span>Adjust Stock</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onEdit(item)}
              className="h-9 px-3 border border-slate-300 rounded-lg text-[13px] font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <span>✏️</span>
              <span>Edit</span>
            </button>

            <button
              type="button"
              onClick={() => onDelete(item)}
              title="Delete Item"
              className="p-1.5 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>

            <button
              type="button"
              className="p-1.5 border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="Settings"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* 2. Tabs Navigation Row matching myBillBook */}
        <div className="flex border-b border-slate-200 px-6 gap-8 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab("details")}
            className={`py-3 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer relative ${
              activeTab === "details"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>📄</span>
            <span>Item Details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("stock")}
            className={`py-3 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer relative ${
              activeTab === "stock"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>📦</span>
            <span>Stock Details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("party_report")}
            className={`py-3 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer relative ${
              activeTab === "party_report"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>📊</span>
            <span>Party Wise Report</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("party_prices")}
            className={`py-3 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer relative ${
              activeTab === "party_prices"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>🏷️</span>
            <span>Party Wise Prices</span>
          </button>
        </div>

        {/* 3. Tab Contents */}
        <div className="p-6">
          {/* TAB 1: ITEM DETAILS (Matching Image 2) */}
          {activeTab === "details" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card 1: General Details */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">📋</span>
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-[#182230]">
                      General Details
                    </h2>
                  </div>
                  <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded">
                    General Details
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-y-5 gap-x-4 text-xs">
                  <div>
                    <p className="text-slate-400 font-medium">Item Name</p>
                    <p className="mt-1 font-semibold text-slate-900">{item.name}</p>
                  </div>

                  <div>{/* spacer */}</div>

                  <div>
                    <p className="text-slate-400 font-medium">Item Code</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {item.sku || item.barcode || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400 font-medium">Category</p>
                    <p className="mt-1 font-semibold text-slate-900">{categoryName}</p>
                  </div>

                  <div>
                    <p className="text-slate-400 font-medium">Current Stock</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {currentStockNum} {uomLabel}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-slate-400 font-medium">Stock Value</p>
                      <span className="cursor-help text-slate-400 text-[10px]" title="Calculated from Purchase Rate / Price">
                        ⓘ
                      </span>
                    </div>
                    <p className="mt-1 font-semibold text-slate-900">{formatInr(stockValuation)}</p>
                  </div>

                  <div>
                    <p className="text-slate-400 font-medium">Low Stock Quantity</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {item.minStockLevel && item.minStockLevel > 0
                        ? `${item.minStockLevel} ${uomLabel}`
                        : "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400 font-medium">Low Stock Warning</p>
                    <p
                      className={`mt-1 font-semibold ${
                        item.minStockLevel && item.minStockLevel > 0
                          ? "text-emerald-600"
                          : "text-rose-500"
                      }`}
                    >
                      {item.minStockLevel && item.minStockLevel > 0 ? "Enabled" : "Disabled"}
                    </p>
                  </div>

                  <div className="col-span-2 pt-2 border-t border-slate-100">
                    <p className="text-slate-400 font-medium">Item Description</p>
                    <p className="mt-1 text-slate-800">{item.description || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Card 2: Pricing Details */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <span className="text-slate-400">💳</span>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-[#182230]">
                    Pricing Details
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-y-5 gap-x-4 text-xs">
                  <div>
                    <p className="text-slate-400 font-medium">Sales Price</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {formatInr(item.retailPrice)}{" "}
                      <span className="text-slate-400 font-normal text-[11px]">Without Tax</span>
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400 font-medium">Purchase Price</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {formatInr(item.purchaseRate)}{" "}
                      <span className="text-slate-400 font-normal text-[11px]">Without Tax</span>
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400 font-medium">Disc. on Sales Price</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      0% ({formatInr(item.retailPrice)})
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400 font-medium">GST Tax Rate</p>
                    <p className="mt-1 font-semibold text-slate-900">{item.taxRate || 0}%</p>
                  </div>

                  <div>
                    <p className="text-slate-400 font-medium">HSN Code</p>
                    <p className="mt-1 font-semibold text-slate-900">{item.hsnCode || "-"}</p>
                  </div>

                  <div>
                    <p className="text-slate-400 font-medium">Secondary Unit</p>
                    <p className="mt-1 font-semibold text-slate-900">{secondaryUomLabel}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STOCK DETAILS (Matching Image 3) */}
          {activeTab === "stock" && (
            <div className="space-y-4">
              {/* Filter Toolbar: Date Range, Download, Print */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="relative">
                  <select
                    value={dateRangeKey}
                    onChange={(e) => setDateRangeKey(e.target.value)}
                    className="text-[13px] bg-white border border-slate-300 text-slate-700 rounded-lg px-3 py-1.5 font-medium focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer shadow-2xs pr-7 appearance-none h-10"
                  >
                    <option value="today">Today</option>
                    <option value="last-7-days">Last 7 Days</option>
                    <option value="last-30-days">Last 30 Days</option>
                    <option value="last-365-days">Last 365 Days</option>
                    <option value="all-time">All Time</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-slate-400 text-[10px]">
                    ▼
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportStockCsv}
                    className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-300 bg-white text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    <span>📥</span>
                    <span>Download</span>
                    <span className="text-[10px]">▼</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-300 bg-white text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    <span>🖨️</span>
                    <span>Print PDF</span>
                  </button>
                </div>
              </div>

              {/* Stock Movements Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                <table className="min-w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-5 py-3 whitespace-nowrap">Date</th>
                      <th className="px-5 py-3 whitespace-nowrap">Transaction Type</th>
                      <th className="px-5 py-3 whitespace-nowrap">Quantity</th>
                      <th className="px-5 py-3 whitespace-nowrap">Invoice Number</th>
                      <th className="px-5 py-3 whitespace-nowrap">Closing Stock</th>
                      <th className="px-5 py-3 text-right whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {isLoadingStock ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                          <div className="flex items-center justify-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                            <span>Loading stock transactions...</span>
                          </div>
                        </td>
                      </tr>
                    ) : stockMovements.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                          No stock movements found for the selected period.
                        </td>
                      </tr>
                    ) : (
                      stockMovements.map((m) => {
                        const isMinus = m.quantity < 0;
                        const hasLink = Boolean(m.docLink);
                        return (
                          <tr
                            key={m.id}
                            onClick={() => {
                              if (m.docLink) {
                                router.push(m.docLink);
                              }
                            }}
                            className={`transition-colors ${
                              hasLink
                                ? "cursor-pointer hover:bg-indigo-50/70 group"
                                : "hover:bg-slate-50/60"
                            }`}
                          >
                            <td className="px-5 py-3 whitespace-nowrap text-slate-700">
                              {formatDateDisplay(m.date)}
                            </td>
                            <td className="px-5 py-3 whitespace-nowrap font-medium text-slate-900">
                              <span className={hasLink ? "group-hover:text-indigo-600 transition-colors" : ""}>
                                {m.transactionType}
                              </span>
                            </td>
                            <td
                              className={`px-5 py-3 whitespace-nowrap font-semibold ${
                                isMinus ? "text-rose-600" : "text-emerald-700"
                              }`}
                            >
                              {m.quantity > 0 ? `+${m.quantity}` : `${m.quantity}`} {uomLabel}
                            </td>
                            <td className="px-5 py-3 whitespace-nowrap">
                              {hasLink ? (
                                <Link
                                  href={m.docLink!}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                                >
                                  <span>{m.invoiceNumber && m.invoiceNumber !== "-" ? m.invoiceNumber : "Open Invoice"}</span>
                                  <span className="text-[10px]">↗</span>
                                </Link>
                              ) : (
                                <span className="text-slate-500 font-medium">{m.invoiceNumber || "-"}</span>
                              )}
                            </td>
                            <td className="px-5 py-3 whitespace-nowrap font-semibold text-slate-900">
                              {m.closingStock} {uomLabel}
                            </td>
                            <td className="px-5 py-3 text-right whitespace-nowrap">
                              {hasLink ? (
                                <Link
                                  href={m.docLink!}
                                  onClick={(e) => e.stopPropagation()}
                                  title="Open Invoice / Voucher"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[13px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                                >
                                  <span>Open</span>
                                  <span className="text-[10px]">↗</span>
                                </Link>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PARTY WISE REPORT (Matching Image 4) */}
          {activeTab === "party_report" && (
            <div className="space-y-4">
              {/* Filter Toolbar: Date Range, Download, Print */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="relative">
                  <select
                    value={dateRangeKey}
                    onChange={(e) => setDateRangeKey(e.target.value)}
                    className="text-[13px] bg-white border border-slate-300 text-slate-700 rounded-lg px-3 py-1.5 font-medium focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer shadow-2xs pr-7 appearance-none h-10"
                  >
                    <option value="today">Today</option>
                    <option value="last-7-days">Last 7 Days</option>
                    <option value="last-30-days">Last 30 Days</option>
                    <option value="last-365-days">Last 365 Days</option>
                    <option value="all-time">All Time</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-slate-400 text-[10px]">
                    ▼
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportPartyReportCsv}
                    className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-300 bg-white text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    <span>📥</span>
                    <span>Download</span>
                    <span className="text-[10px]">▼</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-300 bg-white text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    <span>🖨️</span>
                    <span>Print PDF</span>
                  </button>
                </div>
              </div>

              {/* Party Wise Report Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                <table className="min-w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-5 py-3 whitespace-nowrap">Party Name</th>
                      <th className="px-5 py-3 whitespace-nowrap">Sales Quantity</th>
                      <th className="px-5 py-3 whitespace-nowrap">Sales Amount</th>
                      <th className="px-5 py-3 whitespace-nowrap">Purchase Quantity</th>
                      <th className="px-5 py-3 whitespace-nowrap">Purchase Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {isLoadingPartyReport ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                          <div className="flex items-center justify-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                            <span>Loading party report...</span>
                          </div>
                        </td>
                      </tr>
                    ) : partyReports.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                          No party-wise transactions found for this item.
                        </td>
                      </tr>
                    ) : (
                      partyReports.map((p) => (
                        <tr key={p.partyId} className="hover:bg-slate-50/60">
                          <td className="px-5 py-3 whitespace-nowrap font-medium text-slate-900">
                            {p.partyName}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap text-slate-700">
                            {p.salesQuantity > 0 ? p.salesQuantity : 0}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap font-medium text-slate-900">
                            {p.salesAmount > 0 ? formatInr(p.salesAmount) : "-"}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap text-slate-700">
                            {p.purchaseQuantity > 0 ? p.purchaseQuantity : 0}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap font-medium text-slate-900">
                            {p.purchaseAmount > 0 ? formatInr(p.purchaseAmount) : "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: PARTY WISE PRICES (Matching Image 5) */}
          {activeTab === "party_prices" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="relative w-64">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
                    🔍
                  </span>
                  <input
                    type="text"
                    value={partyPriceSearch}
                    onChange={(e) => setPartyPriceSearch(e.target.value)}
                    placeholder="Search Party..."
                    className="w-full pl-8 pr-3 py-1.5 text-[13px] bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs h-10"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditPartyPricesModalOpen(true)}
                  className="h-9 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-[13px] font-medium text-slate-700 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>✏️</span>
                  <span>Edit Party Wise Prices</span>
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                <table className="min-w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-5 py-3 whitespace-nowrap">Party Name</th>
                      <th className="px-5 py-3 whitespace-nowrap">Sales Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {/* All Parties Default Price */}
                    <tr className="hover:bg-slate-50/60 bg-slate-50/30">
                      <td className="px-5 py-3 whitespace-nowrap font-medium text-slate-900">
                        All Parties Price
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap font-medium text-indigo-700">
                        {formatInr(item.retailPrice)}
                      </td>
                    </tr>

                    {/* Custom Party Specific Prices */}
                    {partyPrices
                      .filter(
                        (r) =>
                          !partyPriceSearch.trim() ||
                          r.partyName.toLowerCase().includes(partyPriceSearch.toLowerCase()),
                      )
                      .map((rule) => (
                        <tr key={rule.partyId} className="hover:bg-slate-50/60">
                          <td className="px-5 py-3 whitespace-nowrap font-medium text-slate-900">
                            {rule.partyName}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap font-semibold text-slate-900">
                            {formatInr(rule.price)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Edit Party Wise Prices */}
      {isEditPartyPricesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-[15px] font-semibold text-slate-900">Edit Party Wise Prices</h3>
              <button
                type="button"
                onClick={() => setIsEditPartyPricesModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-slate-500 mb-1">Select Party</label>
                <select
                  value={editingPartyPriceId}
                  onChange={(e) => {
                    setEditingPartyPriceId(e.target.value);
                    const existingRule = partyPrices.find((r) => r.partyId === e.target.value);
                    setNewPartyPriceVal(existingRule ? String(existingRule.price) : "");
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] text-slate-800 focus:outline-none focus:border-indigo-500 h-10"
                >
                  <option value="">-- Choose Party --</option>
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate-500 mb-1">
                  Custom Sales Price (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  value={newPartyPriceVal}
                  onChange={(e) => setNewPartyPriceVal(e.target.value)}
                  placeholder={`Default is ₹ ${item.retailPrice}`}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] text-slate-800 focus:outline-none focus:border-indigo-500 h-10"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditPartyPricesModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePartyPriceRule}
                disabled={!editingPartyPriceId}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-[13px] font-medium text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
              >
                Save Price
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

