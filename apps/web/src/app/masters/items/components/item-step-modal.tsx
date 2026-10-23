"use client";

import React, { useState, useEffect } from "react";
import { HsnSelector } from "../../../../components/ui/hsn-selector";
import { ItemBarcodeModal } from "./item-barcode-modal";
import { apiClient, extractList } from "../../../../lib/api-client";
import { PartyWisePriceRule, setItemPartyPrices } from "../../../../lib/party-item-pricing";

export type ItemTab = "basic" | "stock" | "pricing" | "party_pricing" | "custom";

export interface UnitOption {
  id: string;
  name: string;
  code: string;
  symbol?: string;
}

export interface CategoryOption {
  id: string;
  name: string;
}

export interface WarehouseOption {
  id: string;
  name: string;
  isDefault?: boolean;
}

export interface PartyOption {
  id: string;
  name: string;
  phone?: string;
  type?: string;
}

export interface ItemFormData {
  id?: string;
  type: "PRODUCT" | "SERVICE";
  name: string;
  nameGujarati: string;
  sku: string;
  barcode: string;
  hsnCode: string;
  primaryUomId: string;
  secondaryUomId?: string;
  conversionFactor?: number;
  categoryId: string;
  taxRate: number;
  isTaxInclusive: boolean;
  retailPrice: number | string;
  purchaseRate: number | string;
  isPurchaseTaxInclusive: boolean;
  mrp: number | string;
  discountPercent?: number | string;
  wholesalePrice?: number | string;
  minWholesaleQty?: number | string;
  openingStock: number | string;
  asOfDate?: string;
  warehouseId: string;
  minStockLevel: number | string;
  enableLowStockWarning: boolean;
  trackBatches: boolean;
  trackSerialNo: boolean;
  showInOnlineStore: boolean;
  openingBatchNumber?: string;
  openingMfgDate?: string;
  openingExpiryDate?: string;
  brand?: string;
  model?: string;
  sizeColor?: string;
  description?: string;
  isActive: boolean;
  partyWisePrices?: PartyWisePriceRule[];
}

interface ItemStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ItemFormData) => Promise<void>;
  initialData?: Partial<ItemFormData>;
  isEditMode?: boolean;
  units: UnitOption[];
  categories: CategoryOption[];
  warehouses: WarehouseOption[];
  companyName?: string;
  lang?: "en" | "gu";
  onAddCategory?: (name: string) => Promise<CategoryOption | null>;
  parties?: PartyOption[];
}

export function ItemStepModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isEditMode = false,
  units,
  categories,
  warehouses,
  companyName = "myownbillbook",
  lang = "en",
  onAddCategory,
  parties,
}: ItemStepModalProps) {
  const [activeTab, setActiveTab] = useState<ItemTab>("basic");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [showAlternativeUnit, setShowAlternativeUnit] = useState(false);
  const [showWholesaleRate, setShowWholesaleRate] = useState(false);
  const [showHsnFinder, setShowHsnFinder] = useState(false);

  // New Category inline creation state
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  // Party Wise Pricing state
  const [partiesList, setPartiesList] = useState<PartyOption[]>(parties || []);
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [partyPriceInput, setPartyPriceInput] = useState("");
  const [isPartyPriceWithTax, setIsPartyPriceWithTax] = useState(true);

  // Load parties if not supplied
  useEffect(() => {
    if (parties && parties.length > 0) {
      setPartiesList(parties);
    } else if (isOpen) {
      apiClient
        .get("/parties", { type: "CUSTOMER" })
        .then((res: any) => {
          const list = extractList(res);
          setPartiesList(list);
        })
        .catch(() => {});
    }
  }, [parties, isOpen]);

  const defaultWh = warehouses.find((w) => w.isDefault)?.id || warehouses[0]?.id || "";
  const defaultUom = units[0]?.id || "";
  const defaultCat = categories[0]?.id || "";

  // Initialize today's date formatted as YYYY-MM-DD
  const todayFormatted = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState<ItemFormData>({
    type: "PRODUCT",
    name: "",
    nameGujarati: "",
    sku: "",
    barcode: "",
    hsnCode: "1006",
    primaryUomId: defaultUom,
    secondaryUomId: "",
    conversionFactor: 1,
    categoryId: defaultCat,
    taxRate: 5,
    isTaxInclusive: true,
    retailPrice: "",
    purchaseRate: "",
    isPurchaseTaxInclusive: false,
    mrp: "",
    discountPercent: "",
    wholesalePrice: "",
    minWholesaleQty: "",
    openingStock: "",
    asOfDate: todayFormatted,
    warehouseId: defaultWh,
    minStockLevel: 10,
    enableLowStockWarning: true,
    trackBatches: false,
    trackSerialNo: false,
    showInOnlineStore: false,
    openingBatchNumber: "",
    openingMfgDate: "",
    openingExpiryDate: "",
    brand: "",
    model: "",
    sizeColor: "",
    description: "",
    isActive: true,
    partyWisePrices: [],
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          type: initialData.type || "PRODUCT",
          name: initialData.name || "",
          nameGujarati: initialData.nameGujarati || "",
          sku: initialData.sku || "",
          barcode: initialData.barcode || "",
          hsnCode: initialData.hsnCode || "1006",
          primaryUomId: initialData.primaryUomId || defaultUom,
          secondaryUomId: initialData.secondaryUomId || "",
          conversionFactor: initialData.conversionFactor || 1,
          categoryId: initialData.categoryId || defaultCat,
          taxRate: initialData.taxRate ?? 5,
          isTaxInclusive: initialData.isTaxInclusive ?? true,
          retailPrice: initialData.retailPrice ?? "",
          purchaseRate: initialData.purchaseRate ?? "",
          isPurchaseTaxInclusive: initialData.isPurchaseTaxInclusive ?? false,
          mrp: initialData.mrp ?? "",
          discountPercent: initialData.discountPercent ?? "",
          wholesalePrice: initialData.wholesalePrice ?? "",
          minWholesaleQty: initialData.minWholesaleQty ?? "",
          openingStock: initialData.openingStock ?? "",
          asOfDate: initialData.asOfDate || todayFormatted,
          warehouseId: initialData.warehouseId || defaultWh,
          minStockLevel: initialData.minStockLevel ?? 10,
          enableLowStockWarning: initialData.enableLowStockWarning ?? true,
          trackBatches: initialData.trackBatches ?? false,
          trackSerialNo: initialData.trackSerialNo ?? false,
          showInOnlineStore: initialData.showInOnlineStore ?? false,
          openingBatchNumber: initialData.openingBatchNumber || "",
          openingMfgDate: initialData.openingMfgDate || "",
          openingExpiryDate: initialData.openingExpiryDate || "",
          brand: initialData.brand || "",
          model: initialData.model || "",
          sizeColor: initialData.sizeColor || "",
          description: initialData.description || "",
          isActive: initialData.isActive ?? true,
          partyWisePrices: initialData.partyWisePrices || [],
        });
        if (initialData.secondaryUomId) {
          setShowAlternativeUnit(true);
        }
        if (initialData.wholesalePrice) {
          setShowWholesaleRate(true);
        }
      } else {
        // Reset to empty clean state
        setForm({
          type: "PRODUCT",
          name: "",
          nameGujarati: "",
          sku: "",
          barcode: "",
          hsnCode: "1006",
          primaryUomId: defaultUom,
          secondaryUomId: "",
          conversionFactor: 1,
          categoryId: defaultCat,
          taxRate: 5,
          isTaxInclusive: true,
          retailPrice: "",
          purchaseRate: "",
          isPurchaseTaxInclusive: false,
          mrp: "",
          discountPercent: "",
          wholesalePrice: "",
          minWholesaleQty: "",
          openingStock: "",
          asOfDate: todayFormatted,
          warehouseId: defaultWh,
          minStockLevel: 10,
          enableLowStockWarning: true,
          trackBatches: false,
          trackSerialNo: false,
          showInOnlineStore: false,
          openingBatchNumber: "",
          openingMfgDate: "",
          openingExpiryDate: "",
          brand: "",
          model: "",
          sizeColor: "",
          description: "",
          isActive: true,
        });
        setShowAlternativeUnit(false);
        setShowWholesaleRate(false);
      }
      setActiveTab("basic");
      setErrorMsg(null);
    }
  }, [isOpen, initialData, defaultUom, defaultCat, defaultWh, todayFormatted]);

  if (!isOpen) return null;

  // Generate unique 11-digit Barcode
  const handleGenerateBarcode = () => {
    // Generate an 11-digit unique barcode e.g. 63611559163
    const prefix = "63";
    const randomDigits = Math.floor(100000000 + Math.random() * 900000000).toString();
    const generated = `${prefix}${randomDigits}`;
    setForm((prev) => ({
      ...prev,
      barcode: generated,
      sku: prev.sku ? prev.sku : generated,
    }));
  };

  const handleCreateNewCategory = async () => {
    if (!newCatName.trim() || !onAddCategory) return;
    try {
      const created = await onAddCategory(newCatName.trim());
      if (created) {
        setForm((prev) => ({ ...prev, categoryId: created.id }));
        setNewCatName("");
        setIsCreatingCategory(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create category");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setActiveTab("basic");
      setErrorMsg(lang === "gu" ? "આઇટમનું નામ દાખલ કરો." : "Please enter the Item Name.");
      return;
    }
    if (!form.hsnCode.trim()) {
      setActiveTab("stock");
      setErrorMsg(lang === "gu" ? "HSN/SAC કોડ જરૂરી છે." : "HSN/SAC code is required.");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate discount percentage on MRP if both MRP and retailPrice exist
  const mrpNum = Number(form.mrp) || 0;
  const retailNum = Number(form.retailPrice) || 0;
  let mrpDiscountText = "--";
  if (mrpNum > 0 && retailNum > 0 && mrpNum >= retailNum) {
    const disc = ((mrpNum - retailNum) / mrpNum) * 100;
    mrpDiscountText = `${disc.toFixed(1)}%`;
  }

  const selectedPrimaryUom = units.find((u) => u.id === form.primaryUomId);
  const uomCode = selectedPrimaryUom?.code || selectedPrimaryUom?.name || "PCS";

  // Tab definitions
  const tabs: { id: ItemTab; label: string; labelGu: string; icon: React.ReactNode; isRequired?: boolean }[] = [
    {
      id: "basic",
      label: "Basic Details",
      labelGu: "મૂળભૂત વિગતો",
      isRequired: true,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: "stock",
      label: "Stock Details",
      labelGu: "સ્ટોક વિગતો",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      id: "pricing",
      label: "Pricing Details",
      labelGu: "ભાવ અને કર વિગતો",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: "party_pricing",
      label: "Party Wise Prices",
      labelGu: "પાર્ટી મુજબ ભાવ",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      id: "custom",
      label: "Custom Fields",
      labelGu: "કસ્ટમ ફીલ્ડ્સ",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
    },
  ];

  const currentTabIndex = tabs.findIndex((t) => t.id === activeTab);

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 font-bold shadow-xs">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  {isEditMode
                    ? lang === "gu"
                      ? "વસ્તુ સુધારો (Edit Item)"
                      : "Edit Item"
                    : lang === "gu"
                    ? "નવી વસ્તુ બનાવો (Create New Item)"
                    : "Create New Item"}
                </h2>
                <p className="text-xs text-slate-500 font-normal">
                  {lang === "gu"
                    ? "ઉત્પાદન, સ્ટોક, બારકોડ અને ભાવ વિગતો સેટ કરો"
                    : "Step-wise configuration with instant barcode creation & stock tracking"}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Close Modal"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-200 text-xs text-rose-700 font-medium flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
              <button
                onClick={() => setErrorMsg(null)}
                className="text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Body: Left Sidebar + Form Area */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 bg-slate-50/50">
            {/* Left Step Sidebar matching Screencast Video */}
            <div className="w-full md:w-56 bg-white border-b md:border-b-0 md:border-r border-slate-200 p-3 sm:p-4 shrink-0 flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible">
              {/* Tab 1: Basic Details */}
              <button
                type="button"
                onClick={() => setActiveTab("basic")}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                  activeTab === "basic"
                    ? "bg-purple-50 text-purple-700 border border-purple-200 shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={activeTab === "basic" ? "text-purple-600" : "text-slate-400"}>
                    {tabs[0].icon}
                  </span>
                  <span className="truncate">
                    {lang === "gu" ? tabs[0].labelGu : tabs[0].label} <span className="text-purple-500 font-bold">*</span>
                  </span>
                </div>
                {form.name.trim() && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Filled" />
                )}
              </button>

              {/* Section Header: Advance Details */}
              <div className="hidden md:block pt-4 pb-1.5 px-3.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                {lang === "gu" ? "અદ્યતન વિગતો" : "Advance Details"}
              </div>

              {/* Tabs 2, 3, 4 */}
              {tabs.slice(1).map((t) => {
                const isActive = activeTab === t.id;
                let isFilled = false;
                if (t.id === "stock" && (form.barcode || form.openingStock)) isFilled = true;
                if (t.id === "pricing" && (form.retailPrice || form.purchaseRate)) isFilled = true;
                if (t.id === "custom" && (form.brand || form.description)) isFilled = true;

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                      isActive
                        ? "bg-purple-50 text-purple-700 border border-purple-200 shadow-xs"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={isActive ? "text-purple-600" : "text-slate-400"}>
                        {t.icon}
                      </span>
                      <span className="truncate">{lang === "gu" ? t.labelGu : t.label}</span>
                    </div>
                    {isFilled && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    )}
                  </button>
                );
              })}

              {/* Quick Barcode Preview badge in sidebar if barcode generated */}
              {form.barcode && (
                <div className="hidden md:block mt-auto pt-4">
                  <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-center">
                    <span className="text-[10px] uppercase font-bold text-indigo-700 block tracking-wider mb-1">
                      {lang === "gu" ? "તૈયાર બારકોડ" : "Active Barcode"}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-indigo-200 inline-block">
                      {form.barcode}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsBarcodeModalOpen(true)}
                      className="mt-2 w-full text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 underline block cursor-pointer"
                    >
                      {lang === "gu" ? "સ્ટીકર પ્રીવ્યૂ" : "View Sticker 🔍"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Content Area: Form Tab Screens */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-white">
                {/* ============================================================ */}
                {/* TAB 1: BASIC DETAILS                                         */}
                {/* ============================================================ */}
                {activeTab === "basic" && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    {/* Item Type & Category Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Item Type Radio */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                          {lang === "gu" ? "વસ્તુનો પ્રકાર *" : "Item Type *"}
                        </label>
                        <div className="flex items-center gap-3">
                          <label className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                            form.type === "PRODUCT"
                              ? "bg-purple-50 text-purple-700 border-purple-300 ring-1 ring-purple-400"
                              : "bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100"
                          }`}>
                            <input
                              type="radio"
                              name="itemType"
                              value="PRODUCT"
                              checked={form.type === "PRODUCT"}
                              onChange={() => setForm({ ...form, type: "PRODUCT" })}
                              className="accent-purple-600 w-3.5 h-3.5"
                            />
                            <span>{lang === "gu" ? "ઉત્પાદન (Product)" : "Product"}</span>
                          </label>

                          <label className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                            form.type === "SERVICE"
                              ? "bg-purple-50 text-purple-700 border-purple-300 ring-1 ring-purple-400"
                              : "bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100"
                          }`}>
                            <input
                              type="radio"
                              name="itemType"
                              value="SERVICE"
                              checked={form.type === "SERVICE"}
                              onChange={() => setForm({ ...form, type: "SERVICE" })}
                              className="accent-purple-600 w-3.5 h-3.5"
                            />
                            <span>{lang === "gu" ? "સેવા (Service)" : "Service"}</span>
                          </label>
                        </div>
                      </div>

                      {/* Category Selection */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                            {lang === "gu" ? "કેટેગરી" : "Category"}
                          </label>
                          {onAddCategory && !isCreatingCategory && (
                            <button
                              type="button"
                              onClick={() => setIsCreatingCategory(true)}
                              className="text-[11px] font-semibold text-purple-600 hover:text-purple-800 cursor-pointer"
                            >
                              + {lang === "gu" ? "નવી કેટેગરી" : "New Category"}
                            </button>
                          )}
                        </div>

                        {isCreatingCategory ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={newCatName}
                              onChange={(e) => setNewCatName(e.target.value)}
                              placeholder="e.g. Clothing, Groceries"
                              className="flex-1 text-xs p-2 bg-white border border-purple-300 rounded-lg focus:ring-1 focus:ring-purple-500"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={handleCreateNewCategory}
                              className="px-2.5 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 cursor-pointer"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsCreatingCategory(false);
                                setNewCatName("");
                              }}
                              className="px-2 py-2 bg-slate-200 text-slate-600 rounded-lg text-xs hover:bg-slate-300 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <select
                            value={form.categoryId}
                            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 font-medium text-slate-800"
                          >
                            <option value="">{lang === "gu" ? "-- કેટેગરી પસંદ કરો --" : "Search Categories..."}</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    {/* Item Name & Gujarati Name */}
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                            {lang === "gu" ? "વસ્તુનું નામ (અંગ્રેજી) *" : "Item Name *"}
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                            <input
                              type="checkbox"
                              checked={form.showInOnlineStore}
                              onChange={(e) => setForm({ ...form, showInOnlineStore: e.target.checked })}
                              className="accent-purple-600 rounded"
                            />
                            <span className="text-[11px] font-medium text-slate-600">
                              {lang === "gu" ? "ઓનલાઇન સ્ટોરમાં બતાવો" : "Show Item in Online Store"}
                            </span>
                          </label>
                        </div>
                        <input
                          type="text"
                          required
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          placeholder={lang === "gu" ? "દા.ત. Pants, Basmati Rice 25kg Bag" : "e.g. Pants, Basmati Rice 25kg"}
                          className="w-full text-xs sm:text-sm p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 font-medium text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                          {lang === "gu" ? "નામ ગુજરાતીમાં (વૈકલ્પિક)" : "Name in Gujarati (Optional)"}
                        </label>
                        <input
                          type="text"
                          value={form.nameGujarati}
                          onChange={(e) => setForm({ ...form, nameGujarati: e.target.value })}
                          placeholder="દા.ત. પેન્ટ્સ, બાસમતી ચોખા ૨૫ કિલો"
                          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 font-medium text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Sales Price & GST Tax Rate Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Sales Price */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                          {lang === "gu" ? "વેચાણ ભાવ *" : "Sales Price"}
                        </label>
                        <div className="flex rounded-xl border border-slate-300 bg-slate-50 overflow-hidden focus-within:ring-2 focus-within:ring-purple-500 focus-within:bg-white">
                          <span className="px-3 py-2 text-xs font-bold text-slate-500 bg-slate-100 border-r border-slate-300 flex items-center">
                            ₹
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            value={form.retailPrice}
                            onChange={(e) => setForm({ ...form, retailPrice: e.target.value })}
                            placeholder="ex: 1500"
                            className="flex-1 text-xs p-2 bg-transparent focus:outline-none font-semibold text-slate-900"
                          />
                          <select
                            value={form.isTaxInclusive ? "WITH" : "WITHOUT"}
                            onChange={(e) =>
                              setForm({ ...form, isTaxInclusive: e.target.value === "WITH" })
                            }
                            className="text-[11px] font-semibold text-slate-700 bg-slate-100 border-l border-slate-300 px-2.5 py-1 focus:outline-none cursor-pointer"
                          >
                            <option value="WITH">{lang === "gu" ? "કર સહિત (With Tax)" : "With Tax"}</option>
                            <option value="WITHOUT">{lang === "gu" ? "કર વગર (Without Tax)" : "Without Tax"}</option>
                          </select>
                        </div>
                      </div>

                      {/* GST Tax Rate */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                          {lang === "gu" ? "જીએસટી કર દર (%) *" : "GST Tax Rate (%)"}
                        </label>
                        <select
                          value={form.taxRate}
                          onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })}
                          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 font-semibold text-slate-800"
                        >
                          <option value={0}>None (0%)</option>
                          <option value={0}>Exempted</option>
                          <option value={0.1}>GST @ 0.1%</option>
                          <option value={0.25}>GST @ 0.25%</option>
                          <option value={3}>GST @ 3%</option>
                          <option value={5}>GST @ 5% (Standard Essential)</option>
                          <option value={12}>GST @ 12% (Standard)</option>
                          <option value={18}>GST @ 18% (Standard Services/Goods)</option>
                          <option value={28}>GST @ 28% (Luxury / Sin)</option>
                        </select>
                      </div>
                    </div>

                    {/* Measuring Unit & Opening Stock Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                          {lang === "gu" ? "માપન એકમ (Unit) *" : "Measuring Unit *"}
                        </label>
                        <select
                          value={form.primaryUomId}
                          onChange={(e) => setForm({ ...form, primaryUomId: e.target.value })}
                          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 font-semibold text-slate-800"
                        >
                          {units.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      {form.type === "PRODUCT" && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                            {lang === "gu" ? "પ્રારંભિક સ્ટોક (Opening Stock)" : "Opening Stock"}
                          </label>
                          <div className="flex rounded-xl border border-slate-300 bg-slate-50 overflow-hidden focus-within:ring-2 focus-within:ring-purple-500 focus-within:bg-white">
                            <input
                              type="number"
                              step="any"
                              value={form.openingStock}
                              onChange={(e) => setForm({ ...form, openingStock: e.target.value })}
                              placeholder="ex: 150"
                              className="flex-1 text-xs p-2.5 bg-transparent focus:outline-none font-semibold text-slate-900"
                            />
                            <span className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 border-l border-slate-300 flex items-center">
                              {uomCode}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Batching & Serialisation Toggles matching Video Screenshot */}
                    {form.type === "PRODUCT" && (
                      <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                              {lang === "gu" ? "બેચ ટ્રેકિંગ સક્રિય કરો" : "Enable Batching"}
                              <span className="text-slate-400 font-normal text-[11px]" title="Track batch numbers and expiry dates">ℹ️</span>
                            </span>
                            <span className="text-[11px] text-slate-500 block">
                              {lang === "gu" ? "બેચ નંબર, ઉત્પાદન અને એક્સપાયરી તારીખ" : "Track Batch #, Mfg & Expiry dates"}
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            checked={form.trackBatches}
                            onChange={(e) => setForm({ ...form, trackBatches: e.target.checked })}
                            className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                          />
                        </div>

                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                              {lang === "gu" ? "સીરીયલ નંબર ટ્રેકિંગ" : "Enable Serialisation"}
                              <span className="text-slate-400 font-normal text-[11px]" title="Track individual serial numbers per unit">ℹ️</span>
                            </span>
                            <span className="text-[11px] text-slate-500 block">
                              {lang === "gu" ? "ઇલેક્ટ્રોનિક્સ અને મશીનરી માટે" : "For electronics & unique IMEI / Serials"}
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            checked={form.trackSerialNo}
                            onChange={(e) => setForm({ ...form, trackSerialNo: e.target.checked })}
                            className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ============================================================ */}
                {/* TAB 2: STOCK DETAILS (Barcode Creation + HSN + Godown)         */}
                {/* ============================================================ */}
                {activeTab === "stock" && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    {/* Item Code (Barcode) & HSN Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Item Code / Barcode Input with Generate & View Buttons */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                            {lang === "gu" ? "આઇટમ કોડ / બારકોડ" : "Item Code / Barcode"}
                          </label>
                        </div>

                        <div className="relative flex items-center">
                          <input
                            type="text"
                            value={form.barcode}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                barcode: e.target.value,
                                sku: form.sku ? form.sku : e.target.value,
                              })
                            }
                            placeholder="ex: 63611559163"
                            className="w-full text-xs p-2.5 pr-28 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 font-mono font-bold text-slate-800"
                          />

                          {/* Action Button inside / right of input matching Video (Generate Barcode / View Barcode) */}
                          <div className="absolute right-1.5 flex items-center gap-1">
                            {form.barcode ? (
                              <>
                                <button
                                  type="button"
                                  id="view-barcode-btn"
                                  onClick={() => setIsBarcodeModalOpen(true)}
                                  className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                                  title="View and print scannable barcode sticker"
                                >
                                  {lang === "gu" ? "બારકોડ જુઓ" : "View Barcode"}
                                </button>
                                <button
                                  type="button"
                                  id="regenerate-barcode-btn"
                                  onClick={handleGenerateBarcode}
                                  className="p-1 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                                  title="Regenerate new barcode"
                                >
                                  🔄
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                id="generate-barcode-btn"
                                onClick={handleGenerateBarcode}
                                className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                                title="Auto generate unique barcode number"
                              >
                                {lang === "gu" ? "બારકોડ બનાવો" : "Generate Barcode"}
                              </button>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {lang === "gu"
                            ? "બારકોડ સ્કેનર અને પ્રિન્ટીંગ માટે સ્કેનેબલ Code-128"
                            : "Click 'Generate Barcode' to instantly create a ready scannable Code-128 barcode"}
                        </span>
                      </div>

                      {/* HSN Code & Finder */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                            {lang === "gu" ? "એચએસએન કોડ (HSN/SAC) *" : "HSN code *"}
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowHsnFinder(!showHsnFinder)}
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                          >
                            {showHsnFinder ? "Close Finder" : (lang === "gu" ? "HSN કોડ શોધો" : "Find HSN Code")}
                          </button>
                        </div>

                        {showHsnFinder ? (
                          <div className="p-2.5 bg-indigo-50/50 border border-indigo-200 rounded-xl">
                            <HsnSelector
                              value={form.hsnCode}
                              onChange={(code, opt) => {
                                setForm((prev) => ({
                                  ...prev,
                                  hsnCode: code,
                                  taxRate: opt ? Number(opt.gstRate) : prev.taxRate,
                                }));
                                setShowHsnFinder(false);
                              }}
                              required
                            />
                          </div>
                        ) : (
                          <input
                            type="text"
                            required
                            value={form.hsnCode}
                            onChange={(e) => setForm({ ...form, hsnCode: e.target.value })}
                            placeholder="ex: 1006 or 2443"
                            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 font-mono font-bold text-slate-800"
                          />
                        )}
                      </div>
                    </div>

                    {/* Measuring Unit & Alternative Unit Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                          {lang === "gu" ? "પ્રાથમિક માપન એકમ *" : "Measuring Unit *"}
                        </label>
                        <select
                          value={form.primaryUomId}
                          onChange={(e) => setForm({ ...form, primaryUomId: e.target.value })}
                          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 font-semibold text-slate-800"
                        >
                          {units.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col justify-end">
                        {!showAlternativeUnit ? (
                          <button
                            type="button"
                            onClick={() => setShowAlternativeUnit(true)}
                            className="text-left text-xs font-bold text-indigo-600 hover:text-indigo-800 py-2.5 flex items-center gap-1 cursor-pointer"
                          >
                            <span>+</span>
                            <span>{lang === "gu" ? "વૈકલ્પિક એકમ ઉમેરો (Alternative Unit)" : "Alternative Unit"}</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <select
                              value={form.secondaryUomId}
                              onChange={(e) => setForm({ ...form, secondaryUomId: e.target.value })}
                              className="text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg flex-1"
                            >
                              <option value="">-- {lang === "gu" ? "ગૌણ એકમ" : "Select Secondary Unit"} --</option>
                              {units
                                .filter((u) => u.id !== form.primaryUomId)
                                .map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.name} ({u.code})
                                  </option>
                                ))}
                            </select>
                            <input
                              type="number"
                              placeholder="Conversion e.g. 10"
                              value={form.conversionFactor || ""}
                              onChange={(e) =>
                                setForm({ ...form, conversionFactor: Number(e.target.value) || 1 })
                              }
                              className="w-24 text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
                              title="Conversion factor: 1 Primary UOM = X Secondary UOM"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setShowAlternativeUnit(false);
                                setForm({ ...form, secondaryUomId: "", conversionFactor: 1 });
                              }}
                              className="text-slate-400 hover:text-rose-500 text-xs p-1"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Godowns / Warehouses Stock Table matching Video Frame 060 */}
                    {form.type === "PRODUCT" && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">
                              {lang === "gu" ? "ગોડાઉન / વેરહાઉસ" : "Godowns"}
                            </label>
                            <select
                              value={form.warehouseId}
                              onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
                              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800"
                            >
                              {warehouses.map((w) => (
                                <option key={w.id} value={w.id}>
                                  {w.name} {w.isDefault ? "(Default)" : ""}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">
                              {lang === "gu" ? "પ્રારંભિક સ્ટોક" : "Opening Stock"}
                            </label>
                            <div className="flex rounded-lg border border-slate-300 bg-white overflow-hidden">
                              <input
                                type="number"
                                step="any"
                                value={form.openingStock}
                                onChange={(e) => setForm({ ...form, openingStock: e.target.value })}
                                placeholder="ex: 150 PCS"
                                className="flex-1 text-xs p-2 focus:outline-none font-bold text-slate-900"
                              />
                              <span className="px-2.5 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 border-l border-slate-300 flex items-center">
                                {uomCode}
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">
                              {lang === "gu" ? "તારીખ અનુસાર (As of Date)" : "As of Date"}
                            </label>
                            <input
                              type="date"
                              value={form.asOfDate}
                              onChange={(e) => setForm({ ...form, asOfDate: e.target.value })}
                              className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-800"
                            />
                          </div>
                        </div>

                        {/* Batch Details if Batching Enabled */}
                        {form.trackBatches && (
                          <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">
                                {lang === "gu" ? "બેચ નંબર" : "Batch Number"}
                              </label>
                              <input
                                type="text"
                                value={form.openingBatchNumber}
                                onChange={(e) => setForm({ ...form, openingBatchNumber: e.target.value })}
                                placeholder="e.g. BATCH-01"
                                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-mono font-medium"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">
                                {lang === "gu" ? "ઉત્પાદન તારીખ (Mfg Date)" : "Mfg Date"}
                              </label>
                              <input
                                type="date"
                                value={form.openingMfgDate}
                                onChange={(e) => setForm({ ...form, openingMfgDate: e.target.value })}
                                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">
                                {lang === "gu" ? "એક્સપાયરી તારીખ (Expiry Date)" : "Expiry Date"}
                              </label>
                              <input
                                type="date"
                                value={form.openingExpiryDate}
                                onChange={(e) => setForm({ ...form, openingExpiryDate: e.target.value })}
                                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Low Stock Quantity Warning Toggle & Level */}
                    {form.type === "PRODUCT" && (
                      <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.enableLowStockWarning}
                            onChange={(e) =>
                              setForm({ ...form, enableLowStockWarning: e.target.checked })
                            }
                            className="w-4 h-4 accent-amber-600 rounded"
                          />
                          <div>
                            <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                              {lang === "gu"
                                ? "ઓછા સ્ટોક માટે ચેતવણી સક્રિય કરો"
                                : "+ Enable Low stock quantity warning"}
                              <span className="text-amber-500 font-normal text-[11px]">ℹ️</span>
                            </span>
                            <span className="text-[11px] text-amber-700 block">
                              {lang === "gu"
                                ? "જ્યારે સ્ટોક લઘુત્તમ સ્તરથી નીચે જશે ત્યારે એલર્ટ મળશે"
                                : "Get notified when available stock falls below safety threshold"}
                            </span>
                          </div>
                        </label>

                        {form.enableLowStockWarning && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-amber-900">
                              {lang === "gu" ? "લઘુત્તમ જથ્થો:" : "Min Level:"}
                            </span>
                            <input
                              type="number"
                              value={form.minStockLevel}
                              onChange={(e) => setForm({ ...form, minStockLevel: e.target.value })}
                              className="w-20 text-xs p-1.5 bg-white border border-amber-300 rounded-lg font-bold text-center"
                            />
                            <span className="text-xs font-bold text-amber-800">{uomCode}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ============================================================ */}
                {/* TAB 3: PRICING DETAILS (Sales Price + Purchase Price + MRP)   */}
                {/* ============================================================ */}
                {activeTab === "pricing" && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    {/* Sales Price & Purchase Price Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Sales Price */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                          {lang === "gu" ? "વેચાણ ભાવ (Sales Price)" : "Sales Price"}
                        </label>
                        <div className="flex rounded-xl border border-slate-300 bg-slate-50 overflow-hidden focus-within:ring-2 focus-within:ring-purple-500 focus-within:bg-white">
                          <span className="px-3 py-2 text-xs font-bold text-slate-500 bg-slate-100 border-r border-slate-300 flex items-center">
                            ₹
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            value={form.retailPrice}
                            onChange={(e) => setForm({ ...form, retailPrice: e.target.value })}
                            placeholder="ex: 1500"
                            className="flex-1 text-xs p-2 bg-transparent focus:outline-none font-bold text-slate-900"
                          />
                          <select
                            value={form.isTaxInclusive ? "WITH" : "WITHOUT"}
                            onChange={(e) =>
                              setForm({ ...form, isTaxInclusive: e.target.value === "WITH" })
                            }
                            className="text-[11px] font-semibold text-slate-700 bg-slate-100 border-l border-slate-300 px-2 py-1 focus:outline-none cursor-pointer"
                          >
                            <option value="WITHOUT">{lang === "gu" ? "Without Tax" : "Without Tax"}</option>
                            <option value="WITH">{lang === "gu" ? "With Tax" : "With Tax"}</option>
                          </select>
                        </div>
                      </div>

                      {/* Purchase Price */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                          {lang === "gu" ? "ખરીદ ભાવ (Purchase Price)" : "Purchase Price"}
                        </label>
                        <div className="flex rounded-xl border border-slate-300 bg-slate-50 overflow-hidden focus-within:ring-2 focus-within:ring-purple-500 focus-within:bg-white">
                          <span className="px-3 py-2 text-xs font-bold text-slate-500 bg-slate-100 border-r border-slate-300 flex items-center">
                            ₹
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            value={form.purchaseRate}
                            onChange={(e) => setForm({ ...form, purchaseRate: e.target.value })}
                            placeholder="ex: 1200"
                            className="flex-1 text-xs p-2 bg-transparent focus:outline-none font-bold text-slate-900"
                          />
                          <select
                            value={form.isPurchaseTaxInclusive ? "WITH" : "WITHOUT"}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                isPurchaseTaxInclusive: e.target.value === "WITH",
                              })
                            }
                            className="text-[11px] font-semibold text-slate-700 bg-slate-100 border-l border-slate-300 px-2 py-1 focus:outline-none cursor-pointer"
                          >
                            <option value="WITHOUT">{lang === "gu" ? "Without Tax" : "Without Tax"}</option>
                            <option value="WITH">{lang === "gu" ? "With Tax" : "With Tax"}</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* MRP & GST Tax Rate Row matching Video Frame 065 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Maximum Retail Price (MRP) */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide flex items-center justify-between">
                          <span>
                            {lang === "gu" ? "મહત્તમ છૂટક કિંમત (MRP)" : "Maximum Retail Price (MRP)"}
                          </span>
                          <span className="text-[11px] font-bold text-emerald-600 font-mono">
                            Disc. on MRP: {mrpDiscountText}
                          </span>
                        </label>
                        <div className="flex rounded-xl border border-slate-300 bg-slate-50 overflow-hidden focus-within:ring-2 focus-within:ring-purple-500 focus-within:bg-white">
                          <span className="px-3 py-2 text-xs font-bold text-slate-500 bg-slate-100 border-r border-slate-300 flex items-center">
                            ₹
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            value={form.mrp}
                            onChange={(e) => setForm({ ...form, mrp: e.target.value })}
                            placeholder="ex: 2000"
                            className="flex-1 text-xs p-2 bg-transparent focus:outline-none font-bold text-slate-900"
                          />
                        </div>
                      </div>

                      {/* GST Tax Rate */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                          {lang === "gu" ? "જીએસટી દર (%)" : "GST Tax Rate(%)"}
                        </label>
                        <select
                          value={form.taxRate}
                          onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })}
                          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 font-semibold text-slate-800"
                        >
                          <option value={0}>None (0%)</option>
                          <option value={0}>Exempted</option>
                          <option value={0.1}>GST @ 0.1%</option>
                          <option value={0.25}>GST @ 0.25%</option>
                          <option value={3}>GST @ 3%</option>
                          <option value={5}>GST @ 5%</option>
                          <option value={12}>GST @ 12%</option>
                          <option value={18}>GST @ 18%</option>
                          <option value={28}>GST @ 28%</option>
                        </select>
                      </div>
                    </div>

                    {/* Discount on Sales Price Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                          {lang === "gu" ? "વેચાણ ભાવ પર ડિસ્કાઉન્ટ" : "Discount on Sales Price"}
                        </label>
                        <div className="flex rounded-xl border border-slate-300 bg-slate-50 overflow-hidden focus-within:ring-2 focus-within:ring-purple-500 focus-within:bg-white">
                          <input
                            type="number"
                            step="0.1"
                            value={form.discountPercent}
                            onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                            placeholder="ex: 10"
                            className="flex-1 text-xs p-2 bg-transparent focus:outline-none font-bold text-slate-900"
                          />
                          <span className="px-3 py-2 text-xs font-bold text-slate-500 bg-slate-100 border-l border-slate-300 flex items-center">
                            %
                          </span>
                        </div>
                      </div>

                      {/* Wholesale Rate Action / Section */}
                      <div className="flex flex-col justify-end">
                        {!showWholesaleRate ? (
                          <button
                            type="button"
                            onClick={() => setShowWholesaleRate(true)}
                            className="text-left text-xs font-bold text-indigo-600 hover:text-indigo-800 py-2.5 flex items-center gap-1 cursor-pointer"
                          >
                            <span>+</span>
                            <span>{lang === "gu" ? "જથ્થાબંધ ભાવ (Wholesale Rate)" : "Wholesale Rate"}</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 flex rounded-lg border border-slate-300 bg-slate-50 overflow-hidden">
                              <span className="px-2 py-1 text-xs text-slate-500 bg-slate-100">₹</span>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Wholesale ₹"
                                value={form.wholesalePrice || ""}
                                onChange={(e) =>
                                  setForm({ ...form, wholesalePrice: e.target.value })
                                }
                                className="w-full text-xs p-1.5 bg-transparent focus:outline-none font-semibold"
                              />
                            </div>
                            <input
                              type="number"
                              placeholder="Min Qty e.g. 10"
                              value={form.minWholesaleQty || ""}
                              onChange={(e) =>
                                setForm({ ...form, minWholesaleQty: e.target.value })
                              }
                              className="w-24 text-xs p-1.5 bg-slate-50 border border-slate-300 rounded-lg"
                              title="Minimum wholesale order quantity"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setShowWholesaleRate(false);
                                setForm({ ...form, wholesalePrice: "", minWholesaleQty: "" });
                              }}
                              className="text-slate-400 hover:text-rose-500 text-xs p-1"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ============================================================ */}
                {/* TAB: PARTY WISE PRICES (Matching myBillBook UI)              */}
                {/* ============================================================ */}
                {activeTab === "party_pricing" && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <h3 className="text-sm font-bold text-slate-800">
                      {lang === "gu" ? "પાર્ટી મુજબ ભાવ ઉમેરો" : "Add Party Wise Prices"}
                    </h3>

                    {/* Top Inputs Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl">
                      {/* Select Party */}
                      <div className="sm:col-span-6">
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          {lang === "gu" ? "પાર્ટી પસંદ કરો" : "Select Party"}
                        </label>
                        <select
                          value={selectedPartyId}
                          onChange={(e) => {
                            setSelectedPartyId(e.target.value);
                            if (!partyPriceInput && form.retailPrice) {
                              setPartyPriceInput(String(form.retailPrice));
                            }
                          }}
                          className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium text-slate-700 cursor-pointer shadow-2xs"
                        >
                          <option value="">{lang === "gu" ? "પાર્ટી શોધો..." : "Search Party"}</option>
                          {partiesList.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.phone ? `(${p.phone})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Sales Price with With Tax Toggle */}
                      <div className="sm:col-span-4">
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          {lang === "gu" ? "વેચાણ ભાવ" : "Sales Price"}
                        </label>
                        <div className="flex items-center rounded-lg border border-slate-300 bg-white overflow-hidden shadow-2xs focus-within:ring-1 focus-within:ring-purple-500">
                          <span className="px-2.5 py-1.5 text-xs text-slate-500 font-semibold bg-slate-50 border-r border-slate-200 select-none">
                            ₹
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={partyPriceInput}
                            onChange={(e) => setPartyPriceInput(e.target.value)}
                            className="w-full text-xs p-1.5 font-mono font-semibold text-slate-800 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setIsPartyPriceWithTax(!isPartyPriceWithTax)}
                            className={`px-2.5 py-1.5 text-[11px] font-semibold border-l border-slate-200 transition-colors whitespace-nowrap cursor-pointer ${
                              isPartyPriceWithTax
                                ? "bg-purple-50 text-purple-700 hover:bg-purple-100"
                                : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                            }`}
                            title="Toggle Tax Inclusive / Exclusive"
                          >
                            {isPartyPriceWithTax ? "With Tax" : "Without Tax"}
                          </button>
                        </div>
                      </div>

                      {/* Add Button */}
                      <div className="sm:col-span-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedPartyId || !partyPriceInput || Number(partyPriceInput) <= 0) return;
                            const pt = partiesList.find((p) => p.id === selectedPartyId);
                            if (!pt) return;

                            const newRule: PartyWisePriceRule = {
                              partyId: pt.id,
                              partyName: pt.name + (pt.phone ? ` (${pt.phone})` : ""),
                              price: Number(partyPriceInput),
                              isTaxInclusive: isPartyPriceWithTax,
                            };

                            const currentList = form.partyWisePrices || [];
                            const existingIndex = currentList.findIndex((r) => r.partyId === pt.id);
                            let updated: PartyWisePriceRule[];
                            if (existingIndex >= 0) {
                              updated = [...currentList];
                              updated[existingIndex] = newRule;
                            } else {
                              updated = [...currentList, newRule];
                            }

                            setForm({ ...form, partyWisePrices: updated });
                            if (initialData?.id) {
                              setItemPartyPrices(initialData.id, updated, form.name || initialData.name);
                            }
                            setSelectedPartyId("");
                            setPartyPriceInput(form.retailPrice ? String(form.retailPrice) : "");
                          }}
                          disabled={!selectedPartyId || !partyPriceInput || Number(partyPriceInput) <= 0}
                          className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold text-xs rounded-lg transition-all shadow-2xs cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1"
                        >
                          <span>+</span>
                          <span>{lang === "gu" ? "ઉમેરો" : "Add"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Table matching myBillBook */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-[#FAFBFD] border-b border-slate-200 text-slate-600 font-bold">
                          <tr>
                            <th className="py-2.5 px-4 font-bold text-slate-700">
                              {lang === "gu" ? "પાર્ટીનું નામ" : "Party Name"}
                            </th>
                            <th className="py-2.5 px-4 font-bold text-slate-700">
                              {lang === "gu" ? "વેચાણ ભાવ" : "Sales Price"}
                            </th>
                            <th className="py-2.5 px-4 text-right w-16"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {/* Row 1: All Parties Price */}
                          <tr className="bg-slate-50/40">
                            <td className="py-3 px-4 font-semibold text-slate-800 flex items-center gap-2">
                              <span>🌐</span>
                              <span>{lang === "gu" ? "બધી પાર્ટીઓ માટે ભાવ" : "All Parties Price"}</span>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">
                              ₹ {Number(form.retailPrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right text-[11px] text-slate-400 font-medium italic">
                              {lang === "gu" ? "ડિફોલ્ટ" : "Default"}
                            </td>
                          </tr>

                          {/* Dynamic rows: Specific Party Prices */}
                          {(form.partyWisePrices || []).map((pp) => (
                            <tr key={pp.partyId} className="hover:bg-purple-50/30 transition-colors">
                              <td className="py-3 px-4 font-medium text-slate-800 flex items-center gap-2">
                                <span className="text-purple-600">👤</span>
                                <span>{pp.partyName}</span>
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-purple-900">
                                ₹ {Number(pp.price).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                <span className="ml-1.5 text-[10px] text-slate-500 font-sans font-normal">
                                  {pp.isTaxInclusive ? "(With Tax)" : "(Without Tax)"}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentList = form.partyWisePrices || [];
                                    const updated = currentList.filter((r) => r.partyId !== pp.partyId);
                                    setForm({
                                      ...form,
                                      partyWisePrices: updated,
                                    });
                                    if (initialData?.id) {
                                      setItemPartyPrices(initialData.id, updated, form.name || initialData.name);
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete party rate"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ============================================================ */}
                {/* TAB 4: CUSTOM FIELDS (Brand, Model, Size, Description)       */}
                {/* ============================================================ */}
                {activeTab === "custom" && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                          {lang === "gu" ? "બ્રાન્ડ / ઉત્પાદક" : "Brand / Manufacturer"}
                        </label>
                        <input
                          type="text"
                          value={form.brand}
                          onChange={(e) => setForm({ ...form, brand: e.target.value })}
                          placeholder="e.g. Raymond, Tata, Amul, Samsung"
                          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 font-medium text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                          {lang === "gu" ? "મોડેલ / વેરિઅન્ટ" : "Model / Variant"}
                        </label>
                        <input
                          type="text"
                          value={form.model}
                          onChange={(e) => setForm({ ...form, model: e.target.value })}
                          placeholder="e.g. Slim Fit, Series 5, XL"
                          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 font-medium text-slate-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                        {lang === "gu" ? "કદ / રંગ / સ્પેસિફિકેશન" : "Size / Color / Specification"}
                      </label>
                      <input
                        type="text"
                        value={form.sizeColor}
                        onChange={(e) => setForm({ ...form, sizeColor: e.target.value })}
                        placeholder="e.g. Size: 32 / Color: Navy Blue"
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 font-medium text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                        {lang === "gu" ? "વર્ણન / નોંધ (Description / Bill Remarks)" : "Item Description / Bill Notes"}
                      </label>
                      <textarea
                        rows={3}
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder={lang === "gu" ? "ઇન્વોઇસ પર દર્શાવવા માટે વિશેષ નોંધ..." : "Additional item specifications or bill notes..."}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 font-medium text-slate-800"
                      />
                    </div>

                    <div className="p-3 bg-purple-50/50 border border-purple-200 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-purple-900 block">
                          {lang === "gu" ? "સક્રિય આઇટમ સ્થિતિ" : "Item Status"}
                        </span>
                        <span className="text-[11px] text-purple-700">
                          {lang === "gu" ? "ઇન્વોઇસ અને બિલિંગમાં આ આઇટમ પસંદ કરી શકાય" : "Item is active and available in billing and catalog"}
                        </span>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.isActive}
                          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                          className="w-4 h-4 accent-purple-600 rounded"
                        />
                        <span className="text-xs font-bold text-purple-900">
                          {form.isActive ? (lang === "gu" ? "સક્રિય (Active)" : "Active") : (lang === "gu" ? "નિષ્ક્રિય (Inactive)" : "Inactive")}
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer matching Screencast Video (Cancel on left, Navigation & Save on right) */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-50/80 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl border border-slate-300 transition-colors cursor-pointer"
                >
                  {lang === "gu" ? "રદ કરો (Cancel)" : "Cancel"}
                </button>

                <div className="flex items-center gap-2.5">
                  {/* Previous Tab button */}
                  {currentTabIndex > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab(tabs[currentTabIndex - 1].id)}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
                    >
                      ← {lang === "gu" ? "પાછળ" : "Previous"}
                    </button>
                  )}

                  {/* Next Tab button */}
                  {currentTabIndex < tabs.length - 1 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab(tabs[currentTabIndex + 1].id)}
                      className="px-4 py-2 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors cursor-pointer"
                    >
                      {lang === "gu" ? "આગળ" : "Next"} →
                    </button>
                  )}

                  {/* Save Item button with spinner matching video */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>{lang === "gu" ? "સાચવી રહ્યું છે..." : "Creating Item..."}</span>
                      </>
                    ) : (
                      <span>
                        {isEditMode
                          ? lang === "gu"
                            ? "સુધારો સાચવો"
                            : "Update Item"
                          : lang === "gu"
                          ? "વસ્તુ સાચવો"
                          : "Save Item"}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Barcode Sticker Preview Modal */}
      <ItemBarcodeModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        barcode={form.barcode || "63611559163"}
        itemName={form.name || (lang === "gu" ? "નવી આઇટમ" : "New Item")}
        salesPrice={Number(form.retailPrice) || 0}
        companyName={companyName}
        lang={lang}
      />
    </>
  );
}
