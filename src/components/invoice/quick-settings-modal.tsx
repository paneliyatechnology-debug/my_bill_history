"use client";

import React, { useState, useEffect } from "react";

export interface CustomField {
  id: string;
  label: string;
  value?: string;
}

export interface QuickSettingsConfig {
  // Invoice Details
  enablePrefix: boolean;
  invoicePrefix: string;
  invoiceSequence: string;
  enableDueDate: boolean;
  enablePoDetails: boolean;
  enableVehicleDetails: boolean;
  enableEwayBill: boolean;
  customInvoiceFields?: CustomField[];

  // Party Details
  showPartyBalance: boolean;
  showShippingAddress: boolean;
  showContactPerson: boolean;
  customPartyFields?: CustomField[];

  // Item Table Details
  showPurchasePrice: boolean;
  showItemImage: boolean;
  enablePriceHistory: boolean;
  isTaxInclusive: boolean;
  showHsnColumn: boolean;
  showDiscountColumn: boolean;
  showTaxColumn: boolean;
  defaultTaxRate: number;
  customItemFields?: CustomField[];
}

export const DEFAULT_QUICK_SETTINGS: QuickSettingsConfig = {
  enablePrefix: true,
  invoicePrefix: "INV-26-27-",
  invoiceSequence: "0014",
  enableDueDate: false,
  enablePoDetails: false,
  enableVehicleDetails: false,
  enableEwayBill: false,
  customInvoiceFields: [],

  showPartyBalance: true,
  showShippingAddress: false,
  showContactPerson: false,
  customPartyFields: [],

  showPurchasePrice: false,
  showItemImage: false,
  enablePriceHistory: true,
  isTaxInclusive: false,
  showHsnColumn: true,
  showDiscountColumn: true,
  showTaxColumn: true,
  defaultTaxRate: 5,
  customItemFields: [],
};

export const DEFAULT_PURCHASE_QUICK_SETTINGS: QuickSettingsConfig = {
  ...DEFAULT_QUICK_SETTINGS,
  invoicePrefix: "PUR-26-",
  invoiceSequence: "0014",
};

export interface QuickSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: QuickSettingsConfig;
  initialTab?: "invoice" | "party" | "items";
  onSave: (newSettings: QuickSettingsConfig) => void;
  voucherType?: "sales" | "purchase" | "estimate" | "challan";
  voucherTitle?: string;
  prefixLabel?: string;
  prefixPlaceholder?: string;
  storageKey?: string;
}

export function QuickSettingsModal({
  isOpen,
  onClose,
  settings,
  initialTab = "invoice",
  onSave,
  voucherType = "sales",
  voucherTitle,
  prefixLabel,
  prefixPlaceholder,
  storageKey,
}: QuickSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"invoice" | "party" | "items">(initialTab);
  const baseDefaults = voucherType === "purchase" ? DEFAULT_PURCHASE_QUICK_SETTINGS : DEFAULT_QUICK_SETTINGS;
  const [formData, setFormData] = useState<QuickSettingsConfig>(settings || baseDefaults);
  
  // Custom field input states
  const [newInvoiceFieldName, setNewInvoiceFieldName] = useState("");
  const [isAddingInvoiceField, setIsAddingInvoiceField] = useState(false);

  const [newPartyFieldName, setNewPartyFieldName] = useState("");
  const [isAddingPartyField, setIsAddingPartyField] = useState(false);

  const [newItemFieldName, setNewItemFieldName] = useState("");
  const [isAddingItemField, setIsAddingItemField] = useState(false);

  // Sync state whenever modal is opened or settings change
  useEffect(() => {
    if (isOpen) {
      const defaults = voucherType === "purchase" ? DEFAULT_PURCHASE_QUICK_SETTINGS : DEFAULT_QUICK_SETTINGS;
      setFormData({
        ...defaults,
        ...(settings || {}),
        invoicePrefix:
          settings?.invoicePrefix && settings.invoicePrefix !== "INV-26-27-"
            ? settings.invoicePrefix
            : voucherType === "purchase"
            ? (settings?.invoicePrefix === "INV-26-27-" ? "PUR-26-" : settings?.invoicePrefix || "PUR-26-")
            : settings?.invoicePrefix || "INV-26-27-",
      });
      if (initialTab) {
        setActiveTab(initialTab);
      }
      setIsAddingInvoiceField(false);
      setIsAddingPartyField(false);
      setIsAddingItemField(false);
    }
  }, [isOpen, settings, initialTab, voucherType]);

  if (!isOpen) return null;

  const handleToggle = (key: keyof QuickSettingsConfig) => {
    setFormData((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleAddCustomField = (type: "invoice" | "party" | "items") => {
    if (type === "invoice" && newInvoiceFieldName.trim()) {
      const field: CustomField = {
        id: `inv_custom_${Date.now()}`,
        label: newInvoiceFieldName.trim(),
      };
      setFormData((prev) => ({
        ...prev,
        customInvoiceFields: [...(prev.customInvoiceFields || []), field],
      }));
      setNewInvoiceFieldName("");
      setIsAddingInvoiceField(false);
    } else if (type === "party" && newPartyFieldName.trim()) {
      const field: CustomField = {
        id: `party_custom_${Date.now()}`,
        label: newPartyFieldName.trim(),
      };
      setFormData((prev) => ({
        ...prev,
        customPartyFields: [...(prev.customPartyFields || []), field],
      }));
      setNewPartyFieldName("");
      setIsAddingPartyField(false);
    } else if (type === "items" && newItemFieldName.trim()) {
      const field: CustomField = {
        id: `item_custom_${Date.now()}`,
        label: newItemFieldName.trim(),
      };
      setFormData((prev) => ({
        ...prev,
        customItemFields: [...(prev.customItemFields || []), field],
      }));
      setNewItemFieldName("");
      setIsAddingItemField(false);
    }
  };

  const handleRemoveCustomField = (type: "invoice" | "party" | "items", id: string) => {
    if (type === "invoice") {
      setFormData((prev) => ({
        ...prev,
        customInvoiceFields: (prev.customInvoiceFields || []).filter((f) => f.id !== id),
      }));
    } else if (type === "party") {
      setFormData((prev) => ({
        ...prev,
        customPartyFields: (prev.customPartyFields || []).filter((f) => f.id !== id),
      }));
    } else if (type === "items") {
      setFormData((prev) => ({
        ...prev,
        customItemFields: (prev.customItemFields || []).filter((f) => f.id !== id),
      }));
    }
  };

  const handleSave = () => {
    if (storageKey && typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, JSON.stringify(formData));
      } catch (e) {
        console.error("Failed to save quick settings to storage:", e);
      }
    }
    onSave(formData);
    onClose();
  };

  const isPurchase = voucherType === "purchase";
  const docDetailsLabel = voucherTitle || (isPurchase ? "Purchase Invoice Details" : "Invoice Details");
  const prefixHeading = isPurchase ? "Purchase Prefix & Sequence Number" : "Invoice Prefix & Sequence Number";
  const prefixDesc = isPurchase
    ? "Add your custom prefix & sequence for Purchase Invoice Number"
    : "Add your custom prefix & sequence for Invoice Number";
  const inputPrefixLabel = prefixLabel || (isPurchase ? "Purchase Prefix" : "Invoice Prefix");
  const inputPrefixPlaceholder = prefixPlaceholder || (isPurchase ? "e.g. PUR-26-" : "e.g. INV-26-27-");
  const customFieldsHeading = isPurchase ? "Show or Hide Purchase Custom Fields" : "Show or Hide Invoice Custom Fields";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Exact MyBillBook Design) */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <h2 className="text-base font-bold text-slate-900">Quick Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 font-bold text-lg p-1 transition-colors cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Two-Column Body: Tabs on left, Content on right */}
        <div className="flex flex-1 min-h-[460px] max-h-[70vh]">
          {/* Left Sidebar Tabs */}
          <div className="w-52 bg-slate-50 border-r border-slate-200 p-3 space-y-1 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("invoice")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                activeTab === "invoice"
                  ? "bg-blue-50 text-blue-700 font-bold border border-blue-200/60 shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="text-sm">📄</span>
              <span className="truncate">{docDetailsLabel}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("party")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                activeTab === "party"
                  ? "bg-blue-50 text-blue-700 font-bold border border-blue-200/60 shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="text-sm">👤</span>
              <span>Party Details</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("items")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                activeTab === "items"
                  ? "bg-blue-50 text-blue-700 font-bold border border-blue-200/60 shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="text-sm">📋</span>
              <span>Item Table Details</span>
            </button>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5 text-xs text-slate-800">
            {/* TAB 1: INVOICE DETAILS */}
            {activeTab === "invoice" && (
              <div className="space-y-5">
                {/* Invoice Prefix & Sequence */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 text-xs">
                        {prefixHeading}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {prefixDesc}
                      </p>
                    </div>
                    {/* iOS Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggle("enablePrefix")}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formData.enablePrefix ? "bg-blue-600" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          formData.enablePrefix ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {formData.enablePrefix && (
                    <div className="pt-2 border-t border-slate-100 space-y-2.5">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                            {inputPrefixLabel}
                          </label>
                          <input
                            type="text"
                            value={formData.invoicePrefix}
                            onChange={(e) =>
                              setFormData({ ...formData, invoicePrefix: e.target.value })
                            }
                            placeholder={inputPrefixPlaceholder}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                            Sequence / Starting No.
                          </label>
                          <input
                            type="text"
                            value={formData.invoiceSequence}
                            onChange={(e) =>
                              setFormData({ ...formData, invoiceSequence: e.target.value })
                            }
                            placeholder="e.g. 0014"
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Live Preview: <strong className="text-blue-600">{formData.invoicePrefix}{formData.invoiceSequence}</strong>
                      </p>
                    </div>
                  )}
                </div>

                {/* Show or Hide Invoice Custom Fields */}
                <div className="space-y-2.5">
                  <h3 className="font-bold text-slate-900 text-xs">
                    {customFieldsHeading}
                  </h3>
                  
                  <div className="space-y-2">
                    {/* Due Date */}
                    <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                      <div>
                        <p className="font-semibold text-slate-900 text-xs">Due Date & Payment Terms</p>
                        <p className="text-[10px] text-slate-500">
                          Show payment terms (days) and due date on the invoice
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.enableDueDate}
                        onChange={() => handleToggle("enableDueDate")}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      />
                    </label>

                    {/* PO Details */}
                    <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                      <div>
                        <p className="font-semibold text-slate-900 text-xs">Purchase Order (PO) Details</p>
                        <p className="text-[10px] text-slate-500">
                          Allow entering PO Number & PO Date on the invoice
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.enablePoDetails}
                        onChange={() => handleToggle("enablePoDetails")}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      />
                    </label>

                    {/* Vehicle Number */}
                    <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                      <div>
                        <p className="font-semibold text-slate-900 text-xs">Vehicle Number</p>
                        <p className="text-[10px] text-slate-500">
                          Vehicle number for transport & dispatch logistics
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.enableVehicleDetails}
                        onChange={() => handleToggle("enableVehicleDetails")}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      />
                    </label>

                    {/* E-way Bill Number */}
                    <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                      <div>
                        <p className="font-semibold text-slate-900 text-xs">E-Way Bill Number</p>
                        <p className="text-[10px] text-slate-500">
                          12-digit GST E-Way Bill Number for goods movement
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.enableEwayBill}
                        onChange={() => handleToggle("enableEwayBill")}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      />
                    </label>
                  </div>

                  {/* Custom Invoice Fields list */}
                  {formData.customInvoiceFields && formData.customInvoiceFields.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Your Custom Invoice Fields
                      </p>
                      {formData.customInvoiceFields.map((field) => (
                        <div
                          key={field.id}
                          className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        >
                          <span className="font-semibold text-slate-800">{field.label}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomField("invoice", field.id)}
                            className="text-slate-400 hover:text-rose-600 text-xs p-1"
                            title="Remove field"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add New Custom Field */}
                  {isAddingInvoiceField ? (
                    <div className="p-3 bg-slate-50 border border-blue-300 rounded-xl space-y-2">
                      <input
                        type="text"
                        autoFocus
                        value={newInvoiceFieldName}
                        onChange={(e) => setNewInvoiceFieldName(e.target.value)}
                        placeholder="e.g. Challan No, Delivery Note, Agent"
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddCustomField("invoice");
                        }}
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingInvoiceField(false);
                            setNewInvoiceFieldName("");
                          }}
                          className="px-3 py-1 text-slate-600 hover:text-slate-800 text-xs font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddCustomField("invoice")}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-bold hover:bg-blue-700"
                        >
                          Add Field
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingInvoiceField(true)}
                      className="w-full py-2.5 border-2 border-dashed border-blue-400 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50/50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>+</span>
                      <span>Add New Field</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: PARTY DETAILS */}
            {activeTab === "party" && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs">Party Display Options</h3>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Configure customer balance, shipping address & contact information
                  </p>
                </div>

                <div className="space-y-2.5">
                  {/* Party Balance */}
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
                    <div>
                      <p className="font-bold text-slate-900 text-xs">Show Party Balance</p>
                      <p className="text-[10px] text-slate-500">
                        Display previous outstanding balance in party dropdown & invoice
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggle("showPartyBalance")}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formData.showPartyBalance ? "bg-blue-600" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          formData.showPartyBalance ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Separate Shipping Address */}
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
                    <div>
                      <p className="font-bold text-slate-900 text-xs">Separate Shipping Address</p>
                      <p className="text-[10px] text-slate-500">
                        Allow adding a different ship-to destination address
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggle("showShippingAddress")}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formData.showShippingAddress ? "bg-blue-600" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          formData.showShippingAddress ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Contact Person Details */}
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
                    <div>
                      <p className="font-bold text-slate-900 text-xs">Contact Person Details</p>
                      <p className="text-[10px] text-slate-500">
                        Include contact person name & phone on invoice
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggle("showContactPerson")}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formData.showContactPerson ? "bg-blue-600" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          formData.showContactPerson ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Custom Party Fields list */}
                {formData.customPartyFields && formData.customPartyFields.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Your Custom Party Fields
                    </p>
                    {formData.customPartyFields.map((field) => (
                      <div
                        key={field.id}
                        className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      >
                        <span className="font-semibold text-slate-800">{field.label}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomField("party", field.id)}
                          className="text-slate-400 hover:text-rose-600 text-xs p-1"
                          title="Remove field"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Party Field */}
                {isAddingPartyField ? (
                  <div className="p-3 bg-slate-50 border border-blue-300 rounded-xl space-y-2">
                    <input
                      type="text"
                      autoFocus
                      value={newPartyFieldName}
                      onChange={(e) => setNewPartyFieldName(e.target.value)}
                      placeholder="e.g. GST Type, Route Name, Credit Limit"
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddCustomField("party");
                      }}
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingPartyField(false);
                          setNewPartyFieldName("");
                        }}
                        className="px-3 py-1 text-slate-600 hover:text-slate-800 text-xs font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddCustomField("party")}
                        className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-bold hover:bg-blue-700"
                      >
                        Add Field
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingPartyField(true)}
                    className="w-full py-2.5 border-2 border-dashed border-blue-400 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50/50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>+</span>
                    <span>Add New Field</span>
                  </button>
                )}
              </div>
            )}

            {/* TAB 3: ITEM TABLE DETAILS */}
            {activeTab === "items" && (
              <div className="space-y-4">
                <div className="space-y-2.5">
                  {/* Show Purchase Price */}
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
                    <div>
                      <p className="font-bold text-slate-900 text-xs">
                        Show Purchase Price while adding Items
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Display cost price reference when selecting items
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggle("showPurchasePrice")}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formData.showPurchasePrice ? "bg-blue-600" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          formData.showPurchasePrice ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Show Item Image */}
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
                    <div>
                      <p className="font-bold text-slate-900 text-xs">Show Item Image on Invoice</p>
                      <p className="text-[10px] text-slate-500">
                        Display item thumbnail image in line rows
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggle("showItemImage")}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formData.showItemImage ? "bg-blue-600" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          formData.showItemImage ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Price History */}
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-slate-900 text-xs">Price History</p>
                        <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[9px] font-bold rounded uppercase">
                          New
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Show last 5 sales / purchase price for selected party
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggle("enablePriceHistory")}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formData.enablePriceHistory ? "bg-blue-600" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          formData.enablePriceHistory ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Show or Hide Item Table Columns */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h3 className="font-bold text-slate-900 text-xs">
                    Show or Hide Item Table Columns
                  </h3>

                  <div className="space-y-1.5">
                    {/* Fixed Columns */}
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between opacity-80">
                      <div>
                        <span className="font-semibold text-slate-800 text-xs">Price / Item (₹)</span>
                        <span className="text-[10px] text-slate-400 ml-2">(Mandatory column)</span>
                      </div>
                      <input type="checkbox" checked disabled className="w-4 h-4 text-blue-600 rounded" />
                    </div>

                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between opacity-80">
                      <div>
                        <span className="font-semibold text-slate-800 text-xs">Quantity</span>
                        <span className="text-[10px] text-slate-400 ml-2">(Mandatory column)</span>
                      </div>
                      <input type="checkbox" checked disabled className="w-4 h-4 text-blue-600 rounded" />
                    </div>

                    {/* HSN Column */}
                    <label className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors">
                      <div>
                        <p className="font-semibold text-slate-900 text-xs">HSN / SAC Code</p>
                        <p className="text-[10px] text-slate-500">
                          Display HSN / SAC column in items table
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.showHsnColumn}
                        onChange={() => handleToggle("showHsnColumn")}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      />
                    </label>

                    {/* Discount Column */}
                    <label className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors">
                      <div>
                        <p className="font-semibold text-slate-900 text-xs">Discount Column</p>
                        <p className="text-[10px] text-slate-500">
                          Allow line-item level discount %
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.showDiscountColumn}
                        onChange={() => handleToggle("showDiscountColumn")}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      />
                    </label>

                    {/* Tax Column */}
                    <label className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors">
                      <div>
                        <p className="font-semibold text-slate-900 text-xs">Tax Column</p>
                        <p className="text-[10px] text-slate-500">
                          Allow item-level GST rate % selection
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.showTaxColumn}
                        onChange={() => handleToggle("showTaxColumn")}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* Tax Configuration */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h3 className="font-bold text-slate-900 text-xs">Tax Configuration</h3>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
                    <div>
                      <p className="font-bold text-slate-900 text-xs">Tax Inclusive Rates</p>
                      <p className="text-[10px] text-slate-500">
                        Entered unit prices already include GST
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggle("isTaxInclusive")}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formData.isTaxInclusive ? "bg-blue-600" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          formData.isTaxInclusive ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Default GST Rate for New Rows
                    </label>
                    <select
                      value={formData.defaultTaxRate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          defaultTaxRate: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
                    >
                      <option value="0">0% (Exempt / Nil)</option>
                      <option value="5">5% (Essential Goods)</option>
                      <option value="12">12% (Standard)</option>
                      <option value="18">18% (General Goods / Services)</option>
                      <option value="28">28% (Luxury / Sin Goods)</option>
                    </select>
                  </div>
                </div>

                {/* Custom Item Fields list */}
                {formData.customItemFields && formData.customItemFields.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Your Custom Item Fields
                    </p>
                    {formData.customItemFields.map((field) => (
                      <div
                        key={field.id}
                        className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      >
                        <span className="font-semibold text-slate-800">{field.label}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomField("items", field.id)}
                          className="text-slate-400 hover:text-rose-600 text-xs p-1"
                          title="Remove field"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Item Field */}
                {isAddingItemField ? (
                  <div className="p-3 bg-slate-50 border border-blue-300 rounded-xl space-y-2">
                    <input
                      type="text"
                      autoFocus
                      value={newItemFieldName}
                      onChange={(e) => setNewItemFieldName(e.target.value)}
                      placeholder="e.g. Serial No, Batch, Expiry, Model"
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddCustomField("items");
                      }}
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingItemField(false);
                          setNewItemFieldName("");
                        }}
                        className="px-3 py-1 text-slate-600 hover:text-slate-800 text-xs font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddCustomField("items")}
                        className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-bold hover:bg-blue-700"
                      >
                        Add Field
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingItemField(true)}
                    className="w-full py-2.5 border-2 border-dashed border-blue-400 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50/50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>+</span>
                    <span>Add New Field</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
