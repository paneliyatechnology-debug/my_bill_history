"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "../../context/auth-context";
import { apiClient } from "../../lib/api-client";
import { FestiveThumb, InvoiceLivePreview, ThemeMiniCard } from "./invoice-live-preview";
import { resolveThemeDefinition, registerDynamicThemes } from "@/lib/invoice-theme-keys";

export interface CustomField {
  id: string;
  label: string;
  value: string;
  enabled: boolean;
}

export interface CustomColumn {
  id: string;
  name: string;
  sampleValue: string;
  enabled: boolean;
}

export interface InvoiceStudioState {
  themeId: string;
  themeMode: "preset" | "custom";
  accentColor: string;
  customColorHex: string;
  festiveTheme: string | null;
  festiveVariant?: number;
  uniqueThemeKey?: string;
  paperSize?: "A4" | "A5" | "US_LETTER" | "LEGAL" | "THERMAL_80" | "DL";

  // Theme Settings Toggles
  showPartyBalance: boolean;
  enableFreeItemQuantity: boolean;
  showItemDescription: boolean;
  showAlternateUnit: boolean;
  showPhoneNumber: boolean;
  showTimeOnInvoice: boolean;
  priceHistory: boolean;
  autoApplyLuxuryForSharing: boolean;

  // Invoice Details Accordion
  industryType: string;
  showPoNumber: boolean;
  showEwayBillNumber: boolean;
  showVehicleNumber: boolean;
  invoiceCustomFields: CustomField[];

  // Party Details Accordion
  showShippingAddress: boolean;
  partyCustomFields: CustomField[];

  // Item Table Columns Accordion
  showPricePerItem: boolean;
  showQuantity: boolean;
  showBatchNo: boolean;
  showExpDate: boolean;
  showMfgDate: boolean;
  showDiscount: boolean;
  showTax: boolean;
  showHsn: boolean;
  itemCustomColumns: CustomColumn[];

  // Miscellaneous Details Accordion
  selectedBankAccount: string;
  selectedPaymentQr: string;
  termsDocType: "sales" | "quotation" | "challan";
  termsAndConditions: Record<string, string>;
  signatureType: "desktop" | "saved" | "none";
  signatureUrl: string | null;
  enableReceiverSignature: boolean;

  // Custom Theme Parameters
  fontFamily: string;
  fontSize: string;
  tablePadding: string;
  borderStyle: string;
}

export const DEFAULT_INVOICE_STUDIO_STATE: InvoiceStudioState = {
  themeId: "stylish",
  themeMode: "preset",
  accentColor: "#2563EB",
  customColorHex: "#2563EB",
  festiveTheme: null,
  festiveVariant: 1,
  uniqueThemeKey: "stylish",
  paperSize: "A4",

  showPartyBalance: false,
  enableFreeItemQuantity: true,
  showItemDescription: true,
  showAlternateUnit: true,
  showPhoneNumber: true,
  showTimeOnInvoice: true,
  priceHistory: true,
  autoApplyLuxuryForSharing: true,

  industryType: "General Trade",
  showPoNumber: true,
  showEwayBillNumber: true,
  showVehicleNumber: true,
  invoiceCustomFields: [],

  showShippingAddress: true,
  partyCustomFields: [],

  showPricePerItem: true,
  showQuantity: true,
  showBatchNo: false,
  showExpDate: false,
  showMfgDate: false,
  showDiscount: true,
  showTax: true,
  showHsn: true,
  itemCustomColumns: [],

  selectedBankAccount: "primary",
  selectedPaymentQr: "primary_upi",
  termsDocType: "sales",
  termsAndConditions: {
    sales:
      "1. Goods once sold will not be accepted back or exchanged.\n2. Interest @ 18% per annum will be charged if payment is delayed beyond due date.\n3. All disputes are subject to local jurisdiction only.",
    quotation:
      "1. Quotation valid for 15 days from issue date.\n2. 50% advance required for order confirmation.",
    challan:
      "1. Goods dispatched for inspection/transit.\n2. Not for sale, returnable on demand.",
  },
  signatureType: "desktop",
  signatureUrl: null,
  enableReceiverSignature: false,

  fontFamily: "Inter, sans-serif",
  fontSize: "12",
  tablePadding: "normal",
  borderStyle: "solid",
};

const DEFAULT_STATE = DEFAULT_INVOICE_STUDIO_STATE;

const COLOR_PALETTE = [
  { id: "#0F172A", name: "Navy Charcoal" },
  { id: "#2563EB", name: "Primary Blue" },
  { id: "#7C3AED", name: "Royal Purple" },
  { id: "#DC2626", name: "Crimson Red" },
  { id: "#EA580C", name: "Rust Orange" },
  { id: "#65A30D", name: "Olive Green" },
  { id: "#0284C7", name: "Ocean Blue" },
  { id: "#0D9488", name: "Teal Emerald" },
];

const STANDARD_THEMES = [
  { id: "stylish", name: "Stylish", kind: "stylish" as const, desc: "Clean modern bill without heavy boxes" },
  { id: "luxury", name: "Luxury", kind: "luxury" as const, isNew: true, desc: "Ornate border, premium header & gold lines" },
  { id: "advanced_gst_tally", name: "Advanced GST (Tally)", kind: "tally" as const, desc: "Boxed GST layout with complete HSN table" },
  { id: "advanced_gst", name: "Advanced GST", kind: "gst" as const, desc: "Colour banner + tax column" },
  { id: "billbook", name: "Billbook", kind: "billbook" as const, desc: "Logo mark + footer" },
  { id: "advanced_compact", name: "Advanced GST (A5)", kind: "compact" as const, desc: "Tight A5 GST layout" },
  { id: "tallybook_lite", name: "Billbook (A5)", kind: "lite" as const, desc: "Light A5 bill format" },
  { id: "modern", name: "Modern", kind: "modern" as const, desc: "Accent rail + pill bar" },
  { id: "simple", name: "Simple", kind: "simple" as const, desc: "Hairline rules only" },
];

type SettingsTab = "design" | "invoice_details" | "party_details" | "item_columns" | "misc";

export function InvoiceSettingsStudio() {
  const { currentCompany, user } = useAuth();

  const [activeTab, setActiveTab] = useState<SettingsTab>("design");
  const [state, setState] = useState<InvoiceStudioState>(DEFAULT_STATE);
  const [history, setHistory] = useState<InvoiceStudioState[]>([DEFAULT_STATE]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [openAccordion, setOpenAccordion] = useState<string | null>("theme-settings");
  const [focusedSection, setFocusedSection] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(0.70);

  const [showAllThemesModal, setShowAllThemesModal] = useState(false);
  const [showCustomFieldModal, setShowCustomFieldModal] = useState<{
    target: "invoice" | "party" | "column";
  } | null>(null);
  const [customFieldInput, setCustomFieldInput] = useState({ label: "", value: "" });

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<InvoiceStudioState>(DEFAULT_STATE);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [festiveThemesList, setFestiveThemesList] = useState<any[]>([]);
  const [standardThemesList, setStandardThemesList] = useState<any[]>(STANDARD_THEMES);
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(
    (currentCompany as any)?.logoUrl || null
  );

  const skipRemoteLoad = useRef(false);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const colorPickerInputRef = useRef<HTMLInputElement>(null);
  const themeStoreScrollRef = useRef<HTMLDivElement>(null);

  const handleOpenColorPicker = (e?: React.MouseEvent) => {
    if (colorPickerInputRef.current && "showPicker" in HTMLInputElement.prototype) {
      try {
        if (e) e.preventDefault();
        colorPickerInputRef.current.showPicker();
        return;
      } catch {
        // fallback to direct event
      }
    }
  };

  // Auto-load company logo from context or backend
  useEffect(() => {
    if ((currentCompany as any)?.logoUrl) {
      setCompanyLogoUrl((currentCompany as any).logoUrl);
      return;
    }
    let active = true;
    (async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("billing_auth_token") : null;
        const tenantRaw = typeof window !== "undefined" ? localStorage.getItem("billing_tenant_context") : null;
        const tenant = tenantRaw ? JSON.parse(tenantRaw) : {};
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        if (tenant.organizationId) headers["x-organization-id"] = tenant.organizationId;
        if (tenant.companyId) headers["x-company-id"] = tenant.companyId;
        if (tenant.branchId) headers["x-branch-id"] = tenant.branchId;
        const res = await fetch(`${apiClient.getBaseUrl()}/tenants/company/logo`, { headers });
        if (res.ok) {
          const blob = await res.blob();
          if (blob && blob.size > 0 && active) {
            const url = URL.createObjectURL(blob);
            setCompanyLogoUrl(url);
          }
        }
      } catch {
        // keep fallback
      }
    })();
    return () => {
      active = false;
    };
  }, [currentCompany?.id, (currentCompany as any)?.logoUrl]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setSaveBanner("Company logo must be under 5 MB");
        setTimeout(() => setSaveBanner(null), 3000);
        return;
      }
      const localUrl = URL.createObjectURL(file);
      setCompanyLogoUrl(localUrl);

      try {
        const fd = new FormData();
        fd.append("file", file);
        await apiClient.post("/tenants/company/logo", fd);
        setSaveBanner("Company logo updated successfully!");
        setTimeout(() => setSaveBanner(null), 3000);
      } catch {
        // Local preview remains active
      }
    }
  };

  const scrollThemeStoreLeft = () => {
    themeStoreScrollRef.current?.scrollBy({ left: -180, behavior: "smooth" });
  };

  const scrollThemeStoreRight = () => {
    themeStoreScrollRef.current?.scrollBy({ left: 180, behavior: "smooth" });
  };

  const companyKey = currentCompany?.id || "default_co";

  const updateState = (
    updater:
      | Partial<InvoiceStudioState>
      | ((prev: InvoiceStudioState) => Partial<InvoiceStudioState>),
  ) => {
    skipRemoteLoad.current = true;
    setState((prev) => {
      const nextUpdates = typeof updater === "function" ? updater(prev) : updater;
      const next: InvoiceStudioState = { ...prev, ...nextUpdates };
      const newHistory = history.slice(0, historyIndex + 1).concat([next]);
      if (newHistory.length > 30) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      return next;
    });
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const nextIdx = historyIndex - 1;
      setHistoryIndex(nextIdx);
      setState(history[nextIdx]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setState(history[nextIdx]);
    }
  };

  const handleRevertToOriginal = () => {
    updateState(DEFAULT_STATE);
    setSaveBanner("Reverted to original default theme settings.");
    setTimeout(() => setSaveBanner(null), 3000);
  };

  useEffect(() => {
    skipRemoteLoad.current = false;
    const loadSettings = async () => {
      try {
        let managedThemes: any[] = [];
        try {
          const themeCatalog: any = await apiClient.get("/invoice-settings/themes");
          if (themeCatalog?.managedThemes && Array.isArray(themeCatalog.managedThemes)) {
            managedThemes = themeCatalog.managedThemes;
          }
        } catch {
          try {
            const list: any = await apiClient.get("/invoice-settings/theme-list");
            if (Array.isArray(list)) managedThemes = list;
          } catch {}
        }

        if (managedThemes.length === 0 && typeof window !== "undefined") {
          try {
            const cached = localStorage.getItem("billing_managed_themes");
            if (cached) managedThemes = JSON.parse(cached);
          } catch {}
        }

        if (Array.isArray(managedThemes) && managedThemes.length > 0) {
          registerDynamicThemes(managedThemes);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("billing_managed_themes", JSON.stringify(managedThemes));
            } catch {}
          }
        }

        const activeThemes = Array.isArray(managedThemes)
          ? managedThemes.filter((t: any) => t && t.isActive !== false)
          : [];

        // ONLY SuperAdmin created themes with category festive/branding
        const festiveOnly = activeThemes
          .filter((t: any) => t.category === "festive" || t.category === "branding")
          .map((t: any) => ({
            id: t.id,
            name: t.name,
            category: t.category,
            festivalName: t.festivalName || t.name,
            primaryColor: t.primaryColor || "#F97316",
            badge: t.badge || null,
            thumbnail: t.thumbnail,
            variants: t.variants,
            tone: t.primaryColor
              ? `linear-gradient(160deg, ${t.primaryColor}22, #FFF7ED)`
              : "linear-gradient(160deg,#FED7AA,#FFF7ED)",
          }));
        setFestiveThemesList(festiveOnly);

        const standardOnly = activeThemes
          .filter((t: any) => t.category === "standard")
          .map((t: any) => {
            const kind =
              t.id === "luxury"
                ? "luxury"
                : t.id === "advanced_gst_tally"
                ? "tally"
                : t.id === "advanced_gst"
                ? "gst"
                : t.id === "billbook"
                ? "billbook"
                : t.id === "advanced_compact"
                ? "compact"
                : t.id === "tallybook_lite"
                ? "lite"
                : t.id === "modern"
                ? "modern"
                : t.id === "simple"
                ? "simple"
                : "stylish";
            return {
              id: t.id,
              name: t.name,
              kind,
              desc: t.description || t.name,
              tag: t.description || t.name,
              isNew: t.badge === "NEW",
            };
          });
        if (standardOnly.length > 0) {
          setStandardThemesList(standardOnly);
        }
      } catch (err) {
        console.warn("Failed to load invoice themes:", err);
      }

      try {
        const res: any = await apiClient.get("/invoice-settings");
        if (res && res.settings) {
          if (skipRemoteLoad.current) return;
          const s = res.settings;
          const def = resolveThemeDefinition(
            s.festiveTheme || s.uniqueThemeKey || s.themeId,
            s.festiveVariant
          );
          const merged: InvoiceStudioState = {
            ...DEFAULT_STATE,
            themeId: def.isFestive ? "festival" : def.uniqueKey,
            festiveTheme: def.isFestive ? def.baseTheme : null,
            festiveVariant: def.variant,
            uniqueThemeKey: def.uniqueKey,
            accentColor: s.accentColor || DEFAULT_STATE.accentColor,
            customColorHex: s.accentColor || DEFAULT_STATE.customColorHex,
            showPartyBalance: s.showPartyBalance ?? DEFAULT_STATE.showPartyBalance,
            enableFreeItemQuantity: s.enableFreeItemQuantity ?? DEFAULT_STATE.enableFreeItemQuantity,
            showItemDescription: s.showItemDescription ?? DEFAULT_STATE.showItemDescription,
            showAlternateUnit: s.showAlternateUnit ?? DEFAULT_STATE.showAlternateUnit,
            showPhoneNumber: s.showPhoneNumber ?? DEFAULT_STATE.showPhoneNumber,
            showTimeOnInvoice: s.showTimeOnInvoice ?? DEFAULT_STATE.showTimeOnInvoice,
            priceHistory: s.printHistory ?? DEFAULT_STATE.priceHistory,
            autoApplyLuxuryForSharing: s.autoApplyLuxuryForSharing ?? DEFAULT_STATE.autoApplyLuxuryForSharing,
            showPoNumber: s.showPoNumber ?? DEFAULT_STATE.showPoNumber,
            showEwayBillNumber: s.showEwayBillNumber ?? DEFAULT_STATE.showEwayBillNumber,
            showVehicleNumber: s.showVehicleNumber ?? DEFAULT_STATE.showVehicleNumber,
            showDiscount: s.showDiscount ?? DEFAULT_STATE.showDiscount,
            showTax: s.showTaxBreakup ?? DEFAULT_STATE.showTax,
            showHsn: s.showHsn ?? DEFAULT_STATE.showHsn,
            showShippingAddress: s.showShippingAddress ?? DEFAULT_STATE.showShippingAddress,
            invoiceCustomFields: Array.isArray(s.invoiceCustomFields) ? s.invoiceCustomFields : [],
            partyCustomFields: Array.isArray(s.partyCustomFields) ? s.partyCustomFields : [],
            showPricePerItem: s.showPricePerItem ?? DEFAULT_STATE.showPricePerItem,
            showQuantity: s.showQuantity ?? DEFAULT_STATE.showQuantity,
            showBatchNo: s.showBatch ?? DEFAULT_STATE.showBatchNo,
            showExpDate: s.showExpiry ?? DEFAULT_STATE.showExpDate,
            showMfgDate: s.showMfgDate ?? DEFAULT_STATE.showMfgDate,
            itemCustomColumns: Array.isArray(s.itemCustomColumns) ? s.itemCustomColumns : [],
            industryType: s.industryType || DEFAULT_STATE.industryType,
            fontFamily: s.fontFamily || DEFAULT_STATE.fontFamily,
            fontSize: s.fontSize || DEFAULT_STATE.fontSize,
            tablePadding: s.tablePadding || DEFAULT_STATE.tablePadding,
            borderStyle: s.borderStyle || DEFAULT_STATE.borderStyle,
            selectedBankAccount: s.selectedBankAccount || DEFAULT_STATE.selectedBankAccount,
            selectedPaymentQr: s.selectedPaymentQr || DEFAULT_STATE.selectedPaymentQr,
            termsAndConditions: s.termsAndConditions || DEFAULT_STATE.termsAndConditions,
            enableReceiverSignature: s.enableReceiverSignature ?? DEFAULT_STATE.enableReceiverSignature,
            signatureUrl: s.signatureUrl || DEFAULT_STATE.signatureUrl,
          };
          setState(merged);
          setHistory([merged]);
          setHistoryIndex(0);
          setLastSaved(merged);
          return;
        }
      } catch {}

      try {
        const local = localStorage.getItem(`billing_invoice_settings_${companyKey}`);
        if (local) {
          const parsed = JSON.parse(local);
          const def = resolveThemeDefinition(
            parsed.festiveTheme || parsed.uniqueThemeKey || parsed.themeId,
            parsed.festiveVariant
          );
          const merged: InvoiceStudioState = {
            ...DEFAULT_STATE,
            ...parsed,
            themeId: def.isFestive ? "festival" : def.uniqueKey,
            festiveTheme: def.isFestive ? def.baseTheme : null,
            festiveVariant: def.variant,
            uniqueThemeKey: def.uniqueKey,
          };
          setState(merged);
          setHistory([merged]);
          setHistoryIndex(0);
          setLastSaved(merged);
        }
      } catch {}
    };

    loadSettings();
    skipRemoteLoad.current = false;
  }, [companyKey]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const def = resolveThemeDefinition(
        state.festiveTheme
          ? `${state.festiveTheme}_${state.festiveVariant || 1}`
          : state.uniqueThemeKey || state.themeId,
        state.festiveVariant
      );
      const stateToSave: InvoiceStudioState = {
        ...state,
        uniqueThemeKey: def.uniqueKey,
        festiveVariant: def.variant,
        festiveTheme: def.isFestive ? def.baseTheme : null,
        themeId: def.isFestive ? "festival" : def.uniqueKey,
      };

      const dto = {
        themeId: def.baseTheme,
        festiveTheme: def.isFestive ? def.uniqueKey : null,
        festiveVariant: def.variant,
        uniqueThemeKey: def.uniqueKey,
        accentColor: stateToSave.accentColor,
        showPartyBalance: stateToSave.showPartyBalance,
        enableFreeItemQuantity: stateToSave.enableFreeItemQuantity,
        showItemDescription: stateToSave.showItemDescription,
        showAlternateUnit: stateToSave.showAlternateUnit,
        showPhoneNumber: stateToSave.showPhoneNumber,
        showTimeOnInvoice: stateToSave.showTimeOnInvoice,
        printHistory: stateToSave.priceHistory,
        autoApplyLuxuryForSharing: stateToSave.autoApplyLuxuryForSharing,
        showPoNumber: stateToSave.showPoNumber,
        showEwayBillNumber: stateToSave.showEwayBillNumber,
        showVehicleNumber: stateToSave.showVehicleNumber,
        showDiscount: stateToSave.showDiscount,
        showTaxBreakup: stateToSave.showTax,
        showTaxColumn: stateToSave.showTax,
        showHsn: stateToSave.showHsn,
        showShippingAddress: stateToSave.showShippingAddress,
        showPricePerItem: stateToSave.showPricePerItem,
        showQuantity: stateToSave.showQuantity,
        showBatch: stateToSave.showBatchNo,
        showExpiry: stateToSave.showExpDate,
        showMfgDate: stateToSave.showMfgDate,
        itemCustomColumns: stateToSave.itemCustomColumns,
        invoiceCustomFields: stateToSave.invoiceCustomFields,
        partyCustomFields: stateToSave.partyCustomFields,
        industryType: stateToSave.industryType,
        fontFamily: stateToSave.fontFamily,
        fontSize: stateToSave.fontSize,
        tablePadding: stateToSave.tablePadding,
        borderStyle: stateToSave.borderStyle,
        selectedBankAccount: stateToSave.selectedBankAccount,
        selectedPaymentQr: stateToSave.selectedPaymentQr,
        termsAndConditions: stateToSave.termsAndConditions,
        enableReceiverSignature: stateToSave.enableReceiverSignature,
      };

      await apiClient.put("/invoice-settings", dto);

      localStorage.setItem(`billing_invoice_settings_${companyKey}`, JSON.stringify(stateToSave));
      localStorage.setItem(`billing_invoice_settings`, JSON.stringify(stateToSave));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("billing_invoice_settings_updated", { detail: stateToSave }));
      }

      setLastSaved(stateToSave);
      setState(stateToSave);
      setSaveBanner("Changes saved successfully!");
      setTimeout(() => setSaveBanner(null), 3000);
    } catch {
      setSaveBanner("Failed to save changes. Saved to browser storage.");
      setTimeout(() => setSaveBanner(null), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        updateState({ signatureUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddCustomField = () => {
    if (!showCustomFieldModal || !customFieldInput.label.trim()) return;
    const { target } = showCustomFieldModal;
    const newField: CustomField = {
      id: "f_" + Date.now(),
      label: customFieldInput.label.trim(),
      value: customFieldInput.value.trim() || "-",
      enabled: true,
    };

    if (target === "invoice") {
      updateState((prev) => ({
        invoiceCustomFields: [...prev.invoiceCustomFields, newField],
      }));
    } else if (target === "party") {
      updateState((prev) => ({
        partyCustomFields: [...prev.partyCustomFields, newField],
      }));
    } else if (target === "column") {
      const newCol: CustomColumn = {
        id: "c_" + Date.now(),
        name: customFieldInput.label.trim(),
        sampleValue: customFieldInput.value.trim() || "Value",
        enabled: true,
      };
      updateState((prev) => ({
        itemCustomColumns: [...prev.itemCustomColumns, newCol],
      }));
    }

    setCustomFieldInput({ label: "", value: "" });
    setShowCustomFieldModal(null);
  };

  const sampleItems = [
    {
      name: "SAMSUNG A30",
      desc: "samsung phone",
      hsn: "1234",
      qty: "1 PCS",
      altUnit: "1 BOX",
      free: "0",
      rate: "10,000",
      disc: "1,000 (10%)",
      tax: "1,620 (18%)",
      amount: "10,620",
      batch: "B-8891",
      exp: "12/28",
      mfg: "01/24",
    },
    {
      name: "PARLE- G 200G",
      desc: "best biscuit",
      hsn: "40511209",
      qty: "1 BOX",
      altUnit: "24 PCS",
      free: "1",
      rate: "342.86",
      disc: "51.43 (15%)",
      tax: "14.57 (5%)",
      amount: "306",
      batch: "B-1044",
      exp: "08/26",
      mfg: "02/24",
    },
    {
      name: "PUMA BLUE ROUND NECK T-SHIRT",
      desc: "apparel",
      hsn: "2032",
      qty: "2 PCS",
      altUnit: "-",
      free: "0",
      rate: "900",
      disc: "0 (0%)",
      tax: "90 (5%)",
      amount: "1,890",
      batch: "T-2024",
      exp: "-",
      mfg: "03/24",
    },
  ];

  const companyDisplayName = currentCompany?.tradeName || currentCompany?.legalName || "JMK";
  const companyPhone = (currentCompany as any)?.phone || user?.phone || "8238878965";
  const companyAddress = (currentCompany as any)?.address || "Amreli, Gujarat, 365630";
  const companyGstin = (currentCompany as any)?.gstin || "24AAAPL1234C1ZV";

  return (
    <div className="w-full min-h-screen bg-[#F5F7FB] p-2 sm:p-3 font-sans text-slate-800">
      <input
        ref={signatureInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleSignatureUpload}
      />
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleLogoUpload}
      />

      {/* 1. TOP BREADCRUMB & PAGE HEADER (Compact Design) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 mb-1.5 border-b border-slate-200/60">
        <div>
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-0.5">
            <Link href="/settings" className="hover:text-slate-800 transition-colors">Settings</Link>
            <span className="text-slate-400">›</span>
            <span className="font-semibold text-slate-700">Invoice Settings</span>
          </nav>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 text-[#2563EB] flex items-center justify-center shrink-0 shadow-2xs">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#111827]">
                Invoice Settings
              </h1>
              <p className="text-[11px] text-slate-500 leading-none mt-0.5">
                Customize invoice appearance, theme, and details for your business.
              </p>
            </div>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {saveBanner && (
            <div className="hidden md:flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 animate-in fade-in">
              <svg className="w-3 h-3 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>{saveBanner}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleRevertToOriginal}
            className="flex items-center gap-1 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 h-8 px-2.5 text-xs font-semibold text-slate-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Revert to Original</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] h-8 px-3.5 text-xs font-semibold text-white shadow-xs transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            {isSaving ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin text-white shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. TOP SETTINGS HORIZONTAL NAVIGATION TABS (Compact) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-2.5 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("design")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === "design"
              ? "bg-[#2563EB] text-white shadow-xs"
              : "bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 21a4 4 0 01-4-4 4 4 0 014-4h2.586a1 1 0 00.707-.293l8.414-8.414a2 2 0 112.828 2.828l-8.414 8.414a1 1 0 00-.293.707V17a4 4 0 01-4 4H7z" />
          </svg>
          <span>Design &amp; Theme</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("invoice_details")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === "invoice_details"
              ? "bg-[#2563EB] text-white shadow-xs"
              : "bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Invoice Details</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("party_details")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === "party_details"
              ? "bg-[#2563EB] text-white shadow-xs"
              : "bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>Party Details</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("item_columns")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === "item_columns"
              ? "bg-[#2563EB] text-white shadow-xs"
              : "bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Item Table Columns</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("misc")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === "misc"
              ? "bg-[#2563EB] text-white shadow-xs"
              : "bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Miscellaneous</span>
        </button>
      </div>

      {/* 3. MAIN WORKSPACE — TWO COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.9fr)_minmax(310px,0.95fr)] xl:grid-cols-[minmax(0,2fr)_minmax(330px,1fr)] gap-3.5 items-start">
        
        {/* LEFT PANEL — LIVE INVOICE PREVIEW CARD */}
        <section className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
          {/* Preview Toolbar (with Zoom + Undo/Redo) */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-white">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>Live Preview</span>
            </div>

            {/* Middle: Compact Zoom Controls */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/90 rounded-md p-0.5">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.45, Number((z - 0.05).toFixed(2))))}
                title="Zoom out"
                className="w-6 h-6 rounded flex items-center justify-center text-slate-700 hover:bg-white transition-colors text-xs font-bold cursor-pointer"
              >
                −
              </button>
              <span className="text-[11px] font-mono font-bold text-slate-700 min-w-[36px] text-center select-none">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.2, Number((z + 0.05).toFixed(2))))}
                title="Zoom in"
                className="w-6 h-6 rounded flex items-center justify-center text-slate-700 hover:bg-white transition-colors text-xs font-bold cursor-pointer"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setZoom(0.70)}
                title="Reset zoom to fit"
                className="px-1.5 h-6 rounded text-[10px] font-bold text-slate-600 hover:bg-white hover:text-[#2563EB] transition-colors cursor-pointer border-l border-slate-200"
              >
                Fit
              </button>
            </div>

            {/* Right: Undo / Redo */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                title="Undo last change"
                className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l6-6M3 10l6 6" />
                </svg>
                <span>Undo</span>
              </button>

              <button
                type="button"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                title="Redo change"
                className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a5 5 0 00-5 5v2m15-7l-6-6m6 6l-6 6" />
                </svg>
                <span>Redo</span>
              </button>
            </div>
          </div>

          {/* Centered Scaled A4 Preview Container */}
          <div className="relative w-full max-h-[calc(100vh-170px)] min-h-[500px] overflow-y-auto overflow-x-auto bg-[#F8FAFC] p-2.5 sm:p-3 flex justify-center items-start">
            <div
              className="w-full flex justify-center items-start transition-transform origin-top"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "top center",
                marginBottom: `${(zoom - 1) * 1123}px`,
              }}
            >
              <InvoiceLivePreview
                state={state}
                companyName={companyDisplayName}
                companyPhone={companyPhone}
                companyAddress={companyAddress}
                companyGstin={companyGstin}
                companyLogoUrl={companyLogoUrl}
                items={sampleItems}
                focusedSection={focusedSection}
                onFocus={(section, accordion) => {
                  setFocusedSection(section);
                  setOpenAccordion(accordion);
                }}
              />
            </div>
          </div>
        </section>

        {/* RIGHT PANEL — COMPACT CUSTOMIZATION SIDEBAR */}
        <aside className="space-y-2.5 max-h-[calc(100vh-150px)] overflow-y-auto pr-1">
          
          {/* ============================================================= */}
          {/* TAB 1: DESIGN & THEME (Ultra-Compact Matching Reference) */}
          {/* ============================================================= */}
          {activeTab === "design" && (
            <>
              {/* SECTION A: INVOICE THEME */}
              <div className="rounded-xl border border-slate-200/90 bg-white p-2.5 sm:p-3 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded bg-blue-50 text-[#2563EB] flex items-center justify-center text-[11px] font-bold">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-xs font-bold text-slate-900">Invoice Theme</h3>
                  </div>

                  {state.festiveTheme && (
                    <button
                      type="button"
                      onClick={() =>
                        updateState({
                          festiveTheme: null,
                          themeId: "stylish",
                          uniqueThemeKey: "stylish",
                        })
                      }
                      className="text-[10px] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                    >
                      Clear Festive
                    </button>
                  )}
                </div>

                {/* Theme Thumbnails Carousel with < and > Arrows */}
                <div className="relative flex items-center">
                  {festiveThemesList.length > 4 && (
                    <button
                      type="button"
                      onClick={scrollThemeStoreLeft}
                      className="absolute -left-1.5 z-20 flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white shadow-md text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                      title="Previous themes"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}

                  <div
                    ref={themeStoreScrollRef}
                    className="flex gap-2 overflow-x-auto pb-1 pt-0.5 px-2 scrollbar-none w-full"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                  >
                    {festiveThemesList.length === 0 ? (
                      <div className="py-3 px-2 text-center text-[11px] text-slate-400 w-full italic">
                        No active invoice themes found in SuperAdmin
                      </div>
                    ) : (
                      festiveThemesList.map((th) => {
                        const targetId = th.id === "logo" ? "your_logo" : th.id;
                        const isActive =
                          state.festiveTheme === th.id ||
                          state.festiveTheme === targetId ||
                          (Boolean(state.uniqueThemeKey) && state.uniqueThemeKey!.startsWith(th.id)) ||
                          (Boolean(state.festiveTheme) && state.festiveTheme!.startsWith(th.id)) ||
                          (!state.festiveTheme &&
                            (state.themeId === targetId ||
                              (th.id === "logo" && state.themeId === "your_logo")));
                        return (
                          <div
                            key={th.id}
                            onClick={() =>
                              updateState({
                                festiveTheme: isActive ? null : targetId,
                                themeId: isActive ? "stylish" : targetId,
                                uniqueThemeKey: isActive ? "stylish" : `${targetId}_${state.festiveVariant || 1}`,
                                themeMode: "preset",
                              })
                            }
                            className="flex shrink-0 flex-col items-center cursor-pointer p-0.5"
                          >
                            <FestiveThumb
                              id={th.id}
                              name={th.name}
                              customThumbUrl={th.thumbnail}
                              companyLogoUrl={companyLogoUrl}
                              tone={th.tone}
                              isSelected={isActive}
                              onDeselect={() =>
                                updateState({
                                  festiveTheme: null,
                                  themeId: "stylish",
                                  uniqueThemeKey: "stylish",
                                })
                              }
                            />
                          </div>
                        );
                      })
                    )}
                  </div>

                  {festiveThemesList.length > 4 && (
                    <button
                      type="button"
                      onClick={scrollThemeStoreRight}
                      className="absolute -right-1.5 z-20 flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white shadow-md text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                      title="Next themes"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Company Logo Watermark Upload / Status for 'Your Logo' theme */}
                {(state.festiveTheme === "your_logo" || state.themeId === "your_logo") && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/80 border border-blue-200/70 mt-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {companyLogoUrl ? (
                        <img
                          src={companyLogoUrl}
                          alt="Logo"
                          className="w-7 h-7 object-contain rounded bg-white p-0.5 border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded bg-white flex items-center justify-center border border-dashed border-blue-300 text-blue-600 font-bold text-[9px] shrink-0">
                          LOGO
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-slate-800 truncate">
                          {companyLogoUrl ? "Company Logo Watermark Active" : "No Logo Uploaded"}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {companyLogoUrl ? "Real logo used as invoice watermark" : "Upload company logo to display as watermark"}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="px-2.5 py-1 text-[10px] font-semibold text-[#2563EB] bg-white rounded border border-[#2563EB]/40 hover:bg-blue-50 transition-colors shrink-0 cursor-pointer shadow-2xs"
                    >
                      {companyLogoUrl ? "Change" : "Upload"}
                    </button>
                  </div>
                )}
              </div>

              {/* SECTION B: COLOR THEME (Compact Small Circles & Inward Safe Picker) */}
              <div className="relative rounded-xl border border-slate-200/90 bg-white p-2.5 sm:p-3 shadow-2xs space-y-2">
                {/* Hidden color input anchored on the left of the card so Chrome native popup opens cleanly inward without clipping */}
                <input
                  ref={colorPickerInputRef}
                  type="color"
                  aria-label="Color Picker"
                  value={
                    state.customColorHex.startsWith("#") && state.customColorHex.length === 7
                      ? state.customColorHex
                      : "#2563EB"
                  }
                  onChange={(e) =>
                    updateState({ accentColor: e.target.value, customColorHex: e.target.value })
                  }
                  style={{
                    position: "absolute",
                    left: "14px",
                    bottom: "10px",
                    width: "28px",
                    height: "28px",
                    opacity: 0.01,
                    zIndex: -1,
                  }}
                  tabIndex={-1}
                />

                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded bg-blue-50 text-[#2563EB] flex items-center justify-center text-[11px] font-bold">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4 4 4 0 014-4h2.586a1 1 0 00.707-.293l8.414-8.414a2 2 0 112.828 2.828l-8.414 8.414a1 1 0 00-.293.707V17a4 4 0 01-4 4H7z" />
                    </svg>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900">Color Theme</h3>
                </div>

                {/* 8 Preset Circular Swatches (Small Circles) */}
                <div className="grid grid-cols-8 gap-1.5 justify-items-center items-center py-1">
                  {COLOR_PALETTE.map((c) => {
                    const isSelected = state.accentColor.toLowerCase() === c.id.toLowerCase();
                    return (
                      <button
                        key={c.id}
                        type="button"
                        title={c.name}
                        onClick={() => updateState({ accentColor: c.id, customColorHex: c.id })}
                        style={{ backgroundColor: c.id }}
                        className={`relative flex h-5 w-5 rounded-full items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? "ring-2 ring-offset-2 ring-slate-900 scale-110 shadow-xs"
                            : "hover:scale-105 opacity-90 hover:opacity-100"
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-2.5 h-2.5 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Color Input Row with Visible Color Picker Swatch Box */}
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                  <span className="text-[11px] font-medium text-slate-700">Custom Color</span>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-mono">HEX</span>
                    <input
                      type="text"
                      value={state.customColorHex}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^#?[0-9A-Fa-f]{0,6}$/.test(val)) {
                          const hex = val.startsWith("#") ? val : `#${val}`;
                          updateState({ customColorHex: hex });
                          if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                            updateState({ accentColor: hex });
                          }
                        }
                      }}
                      placeholder="#2563EB"
                      maxLength={7}
                      className="w-20 h-7 text-center font-mono text-[11px] font-bold text-slate-800 uppercase px-1 rounded-md border border-slate-200 focus:border-[#2563EB] focus:outline-none"
                    />

                    {/* Visible, Clickable Color Picker Box (Pickupbox) */}
                    <div
                      onClick={handleOpenColorPicker}
                      className="relative h-7 w-7 rounded-md border border-slate-300 shadow-2xs overflow-hidden cursor-pointer hover:scale-105 active:scale-95 transition-transform flex items-center justify-center shrink-0"
                      title="Pick custom color"
                    >
                      <input
                        type="color"
                        value={
                          state.customColorHex.startsWith("#") && state.customColorHex.length === 7
                            ? state.customColorHex
                            : "#2563EB"
                        }
                        onChange={(e) =>
                          updateState({ accentColor: e.target.value, customColorHex: e.target.value })
                        }
                        onClick={handleOpenColorPicker}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        title="Pick custom color"
                      />
                      <div
                        className="w-full h-full"
                        style={{ backgroundColor: state.accentColor }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION C: THEME SETTINGS (Ultra-Compact Checkbox Rows) */}
              <div className="rounded-xl border border-slate-200/90 bg-white p-2.5 sm:p-3 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded bg-blue-50 text-[#2563EB] flex items-center justify-center text-[11px] font-bold">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xs font-bold text-slate-900">Theme Settings</h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpenAccordion(openAccordion === "theme-settings" ? null : "theme-settings")}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                  >
                    <svg
                      className={`w-3.5 h-3.5 transition-transform ${openAccordion === "theme-settings" ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {openAccordion === "theme-settings" && (
                  <div className="space-y-0.5 pt-1 border-t border-slate-100">
                    {[
                      {
                        key: "showPartyBalance",
                        label: "Show party balance in invoice",
                        val: state.showPartyBalance,
                        set: (v: boolean) => updateState({ showPartyBalance: v }),
                      },
                      {
                        key: "enableFreeItemQuantity",
                        label: "Enable free item quantity",
                        val: state.enableFreeItemQuantity,
                        set: (v: boolean) => updateState({ enableFreeItemQuantity: v }),
                      },
                      {
                        key: "showItemDescription",
                        label: "Show item description in invoice",
                        val: state.showItemDescription,
                        set: (v: boolean) => updateState({ showItemDescription: v }),
                      },
                      {
                        key: "showAlternateUnit",
                        label: "Show Alternate Unit in Invoice",
                        val: state.showAlternateUnit,
                        set: (v: boolean) => updateState({ showAlternateUnit: v }),
                      },
                      {
                        key: "showPhoneNumber",
                        label: "Show phone number on Invoice",
                        val: state.showPhoneNumber,
                        set: (v: boolean) => updateState({ showPhoneNumber: v }),
                      },
                      {
                        key: "showTimeOnInvoice",
                        label: "Show time on Invoices",
                        val: state.showTimeOnInvoice,
                        set: (v: boolean) => updateState({ showTimeOnInvoice: v }),
                      },
                      {
                        key: "priceHistory",
                        label: "Price History",
                        val: state.priceHistory,
                        set: (v: boolean) => updateState({ priceHistory: v }),
                      },
                      {
                        key: "autoApplyLuxuryForSharing",
                        label: "Auto-apply luxury theme for sharing",
                        val: state.autoApplyLuxuryForSharing,
                        set: (v: boolean) => updateState({ autoApplyLuxuryForSharing: v }),
                      },
                    ].map((item) => (
                      <label key={item.key} className="flex items-center justify-between py-1 px-1 rounded hover:bg-slate-50 cursor-pointer select-none">
                        <span className="text-[11px] text-slate-700 font-medium leading-tight">{item.label}</span>
                        <input
                          type="checkbox"
                          checked={item.val}
                          onChange={(e) => item.set(e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-slate-300 accent-[#2563EB] cursor-pointer"
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION D: Standard Templates (Compact) */}
              <div className="rounded-xl border border-slate-200/90 bg-white p-2.5 sm:p-3 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-800">Standard Templates</h3>
                  <button
                    type="button"
                    onClick={() => setShowAllThemesModal(true)}
                    className="text-[10px] font-semibold text-[#2563EB] hover:underline cursor-pointer"
                  >
                    See All
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {standardThemesList.slice(0, 3).map((thm) => {
                    const isSelected = !state.festiveTheme && state.themeId === thm.id;
                    return (
                      <button
                        key={thm.id}
                        type="button"
                        onClick={() =>
                          updateState({
                            themeId: thm.id,
                            themeMode: "preset",
                            festiveTheme: null,
                            uniqueThemeKey: thm.id,
                          })
                        }
                        className={`relative flex flex-col items-center rounded-lg p-1.5 text-center transition-all cursor-pointer ${
                          isSelected ? "ring-2 ring-[#2563EB] bg-[#EFF6FF]" : "hover:bg-slate-50 border border-slate-200"
                        }`}
                      >
                        <ThemeMiniCard kind={thm.kind} />
                        <span className="mt-1 text-[10px] font-semibold text-slate-800 truncate max-w-full">{thm.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ============================================================= */}
          {/* TAB 2: INVOICE DETAILS (Compact) */}
          {/* ============================================================= */}
          {activeTab === "invoice_details" && (
            <div className="rounded-xl border border-slate-200/90 bg-white p-2.5 sm:p-3 shadow-2xs space-y-2.5">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-blue-50 text-[#2563EB] flex items-center justify-center text-[11px] font-bold">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xs font-bold text-slate-900">Invoice Details</h3>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Industry Type</label>
                <select
                  value={state.industryType}
                  onChange={(e) => updateState({ industryType: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="General Trade">General Trade</option>
                  <option value="Retail Store">Retail Store &amp; Supermarket</option>
                  <option value="Wholesale">Wholesale &amp; Distribution</option>
                  <option value="Pharmacy">Pharmacy &amp; Healthcare</option>
                  <option value="Manufacturing">Manufacturing &amp; Processing</option>
                  <option value="Textiles">Textiles &amp; Apparel</option>
                  <option value="Electronics">Electronics &amp; Hardware</option>
                  <option value="Services">Services &amp; IT Consulting</option>
                </select>
              </div>

              <div className="space-y-1 pt-1.5 border-t border-slate-100">
                {[
                  { label: "PO Number", checked: state.showPoNumber, set: (v: boolean) => updateState({ showPoNumber: v }) },
                  { label: "E-way Bill Number", checked: state.showEwayBillNumber, set: (v: boolean) => updateState({ showEwayBillNumber: v }) },
                  { label: "Vehicle Number", checked: state.showVehicleNumber, set: (v: boolean) => updateState({ showVehicleNumber: v }) },
                ].map((field) => (
                  <label key={field.label} className="flex items-center justify-between cursor-pointer py-0.5 px-1 rounded hover:bg-slate-50 select-none">
                    <span className="text-[11px] text-slate-700 font-medium">{field.label}</span>
                    <input
                      type="checkbox"
                      checked={field.checked}
                      onChange={(e) => field.set(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 accent-[#2563EB] cursor-pointer"
                    />
                  </label>
                ))}
              </div>

              {state.invoiceCustomFields.length > 0 && (
                <div className="space-y-1 pt-1.5 border-t border-slate-100">
                  <span className="font-semibold text-slate-500 text-[10px]">Custom Fields:</span>
                  {state.invoiceCustomFields.map((cf) => (
                    <div key={cf.id} className="flex items-center justify-between bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/60">
                      <span className="text-slate-700 text-[11px] font-medium">{cf.label}</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateState({
                            invoiceCustomFields: state.invoiceCustomFields.filter((f) => f.id !== cf.id),
                          })
                        }
                        className="text-rose-500 hover:text-rose-700 text-xs font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowCustomFieldModal({ target: "invoice" })}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-[#BFDBFE] text-[#2563EB] hover:bg-[#EFF6FF] font-semibold text-xs transition-colors cursor-pointer"
              >
                <span>+ Add Custom Field</span>
              </button>
            </div>
          )}

          {/* ============================================================= */}
          {/* TAB 3: PARTY DETAILS (Compact) */}
          {/* ============================================================= */}
          {activeTab === "party_details" && (
            <div className="rounded-xl border border-slate-200/90 bg-white p-2.5 sm:p-3 shadow-2xs space-y-2.5">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-blue-50 text-[#2563EB] flex items-center justify-center text-[11px] font-bold">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-xs font-bold text-slate-900">Party Details</h3>
              </div>

              <label className="flex items-center justify-between cursor-pointer py-0.5 px-1 rounded hover:bg-slate-50 select-none">
                <span className="text-[11px] text-slate-700 font-medium">Show Shipping Address</span>
                <input
                  type="checkbox"
                  checked={state.showShippingAddress}
                  onChange={(e) => updateState({ showShippingAddress: e.target.checked })}
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-[#2563EB] cursor-pointer"
                />
              </label>

              {state.partyCustomFields.length > 0 && (
                <div className="space-y-1 pt-1.5 border-t border-slate-100">
                  <span className="font-semibold text-slate-500 text-[10px]">Custom Party Fields:</span>
                  {state.partyCustomFields.map((pf) => (
                    <div key={pf.id} className="flex items-center justify-between bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/60">
                      <span className="text-slate-700 text-[11px] font-medium">{pf.label}</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateState({
                            partyCustomFields: state.partyCustomFields.filter((f) => f.id !== pf.id),
                          })
                        }
                        className="text-rose-500 hover:text-rose-700 text-xs font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowCustomFieldModal({ target: "party" })}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-[#BFDBFE] text-[#2563EB] hover:bg-[#EFF6FF] font-semibold text-xs transition-colors cursor-pointer"
              >
                <span>+ Add Custom Field</span>
              </button>
            </div>
          )}

          {/* ============================================================= */}
          {/* TAB 4: ITEM TABLE COLUMNS (Compact) */}
          {/* ============================================================= */}
          {activeTab === "item_columns" && (
            <div className="rounded-xl border border-slate-200/90 bg-white p-2.5 sm:p-3 shadow-2xs space-y-2.5">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-blue-50 text-[#2563EB] flex items-center justify-center text-[11px] font-bold">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xs font-bold text-slate-900">Item Table Columns</h3>
              </div>

              <div className="space-y-1">
                {[
                  { label: "Price/Item (₹)", checked: state.showPricePerItem, set: (v: boolean) => updateState({ showPricePerItem: v }) },
                  { label: "Quantity", checked: state.showQuantity, set: (v: boolean) => updateState({ showQuantity: v }) },
                  { label: "Batch No.", checked: state.showBatchNo, set: (v: boolean) => updateState({ showBatchNo: v }) },
                  { label: "Exp. Date", checked: state.showExpDate, set: (v: boolean) => updateState({ showExpDate: v }) },
                  { label: "Mfg Date", checked: state.showMfgDate, set: (v: boolean) => updateState({ showMfgDate: v }) },
                  { label: "Discount", checked: state.showDiscount, set: (v: boolean) => updateState({ showDiscount: v }) },
                  { label: "Tax", checked: state.showTax, set: (v: boolean) => updateState({ showTax: v }) },
                  { label: "HSN", checked: state.showHsn, set: (v: boolean) => updateState({ showHsn: v }) },
                ].map((col) => (
                  <label key={col.label} className="flex items-center justify-between cursor-pointer py-0.5 px-1 rounded hover:bg-slate-50 select-none">
                    <span className="text-[11px] text-slate-700 font-medium">{col.label}</span>
                    <input
                      type="checkbox"
                      checked={col.checked}
                      onChange={(e) => col.set(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 accent-[#2563EB] cursor-pointer"
                    />
                  </label>
                ))}
              </div>

              {state.itemCustomColumns.length > 0 && (
                <div className="space-y-1 pt-1.5 border-t border-slate-100">
                  <span className="font-semibold text-slate-500 text-[10px]">Custom Columns:</span>
                  {state.itemCustomColumns.map((col) => (
                    <div key={col.id} className="flex items-center justify-between bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/60">
                      <span className="text-slate-700 text-[11px] font-medium">{col.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateState({
                            itemCustomColumns: state.itemCustomColumns.filter((c) => c.id !== col.id),
                          })
                        }
                        className="text-rose-500 hover:text-rose-700 text-xs font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowCustomFieldModal({ target: "column" })}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-[#BFDBFE] text-[#2563EB] hover:bg-[#EFF6FF] font-semibold text-xs transition-colors cursor-pointer"
              >
                <span>+ Add Custom Column</span>
              </button>
            </div>
          )}

          {/* ============================================================= */}
          {/* TAB 5: MISCELLANEOUS (Compact) */}
          {/* ============================================================= */}
          {activeTab === "misc" && (
            <div className="rounded-xl border border-slate-200/90 bg-white p-2.5 sm:p-3 shadow-2xs space-y-2.5">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-blue-50 text-[#2563EB] flex items-center justify-center text-[11px] font-bold">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-xs font-bold text-slate-900">Miscellaneous Details</h3>
              </div>

              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="block text-[11px] font-semibold text-slate-700">Bank Account</label>
                  <Link
                    href="/settings"
                    className="text-[11px] text-[#2563EB] hover:underline font-semibold"
                  >
                    Edit Bank &rarr;
                  </Link>
                </div>
                <select
                  value={state.selectedBankAccount}
                  onChange={(e) => updateState({ selectedBankAccount: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="primary">
                    {currentCompany?.bankName
                      ? `${currentCompany.bankName} (${currentCompany.bankAccountNo ? `A/C: ${currentCompany.bankAccountNo}` : "Configured"})`
                      : "Company Bank Account (Primary)"}
                  </option>
                  <option value="none">Don&apos;t print bank details</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1 truncate">
                  {currentCompany?.bankAccountNo
                    ? `A/C: ${currentCompany.bankAccountNo} • IFSC: ${currentCompany.bankIfsc || "-"}`
                    : "Configure bank in Company Settings"}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="block text-[11px] font-semibold text-slate-700">Payment QR (Scanner)</label>
                  <Link
                    href="/settings"
                    className="text-[11px] text-[#2563EB] hover:underline font-semibold"
                  >
                    Edit UPI &rarr;
                  </Link>
                </div>
                <select
                  value={state.selectedPaymentQr}
                  onChange={(e) => updateState({ selectedPaymentQr: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="primary_upi">
                    {currentCompany?.upiVpa
                      ? `Dynamic UPI QR (${currentCompany.upiVpa})`
                      : "Dynamic UPI QR (Scan to Pay)"}
                  </option>
                  <option value="none">Don&apos;t print Payment QR</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1 truncate">
                  {currentCompany?.upiVpa
                    ? `UPI ID: ${currentCompany.upiVpa}`
                    : "Configure UPI ID in Company Settings"}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Terms and Conditions</label>
                <select
                  value={state.termsDocType}
                  onChange={(e) => updateState({ termsDocType: e.target.value as any })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 focus:border-[#2563EB] focus:outline-none mb-1.5"
                >
                  <option value="sales">Sales Invoices</option>
                  <option value="quotation">Quotations / Estimates</option>
                  <option value="challan">Delivery Challans</option>
                </select>

                <textarea
                  rows={3}
                  value={state.termsAndConditions[state.termsDocType] || ""}
                  onChange={(e) =>
                    updateState((prev) => ({
                      termsAndConditions: {
                        ...prev.termsAndConditions,
                        [prev.termsDocType]: e.target.value,
                      },
                    }))
                  }
                  placeholder="Enter terms and conditions..."
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-[#2563EB] focus:outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Authorized Signature</label>
                <select
                  value={state.signatureType}
                  onChange={(e) => updateState({ signatureType: e.target.value as any })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 focus:border-[#2563EB] focus:outline-none mb-1.5"
                >
                  <option value="desktop">Upload from Desktop</option>
                  <option value="saved">Use Saved Signature</option>
                  <option value="none">None</option>
                </select>

                {state.signatureType === "desktop" && (
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => signatureInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#BFDBFE] py-1.5 text-[#2563EB] hover:bg-[#EFF6FF] font-semibold text-xs transition-colors cursor-pointer"
                    >
                      <span>Choose Signature Image</span>
                    </button>

                    {state.signatureUrl && (
                      <div className="flex items-center justify-between rounded-lg bg-slate-50 p-1.5 border border-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={state.signatureUrl} alt="Signature preview" className="h-7 object-contain" />
                        <button
                          type="button"
                          onClick={() => updateState({ signatureUrl: null })}
                          className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <label className="mt-2 flex items-center justify-between cursor-pointer py-0.5 px-1 rounded hover:bg-slate-50 select-none">
                  <span className="text-[11px] text-slate-700 font-medium">Enable receiver&apos;s signature field</span>
                  <input
                    type="checkbox"
                    checked={state.enableReceiverSignature}
                    onChange={(e) => updateState({ enableReceiverSignature: e.target.checked })}
                    className="h-3.5 w-3.5 rounded border-slate-300 accent-[#2563EB] cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}

        </aside>
      </div>

      {/* ALL THEMES MODAL */}
      {showAllThemesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Select Invoice Theme</h3>
              <button
                type="button"
                onClick={() => setShowAllThemesModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Invoice Layouts</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto p-1">
              {standardThemesList.map((th) => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => {
                    updateState({ themeId: th.id, themeMode: "preset", festiveTheme: null, uniqueThemeKey: th.id });
                    setShowAllThemesModal(false);
                  }}
                  className={`flex flex-col items-center rounded-xl border p-3 text-center transition-all cursor-pointer ${
                    !state.festiveTheme && state.themeId === th.id
                      ? "border-[#2563EB] bg-[#EFF6FF] ring-2 ring-[#2563EB]"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="mb-2 w-full">
                    <ThemeMiniCard kind={th.kind || th.id} />
                  </div>
                  <span className="text-xs font-bold text-slate-900">{th.name}</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">{th.desc || th.tag || "Standard layout"}</span>
                </button>
              ))}
              {festiveThemesList.map((th) => {
                const targetId = th.id === "logo" ? "your_logo" : th.id;
                const active =
                  state.festiveTheme === th.id ||
                  state.festiveTheme === targetId ||
                  (Boolean(state.uniqueThemeKey) && state.uniqueThemeKey!.startsWith(th.id)) ||
                  (Boolean(state.festiveTheme) && state.festiveTheme!.startsWith(th.id)) ||
                  (!state.festiveTheme &&
                    (state.themeId === targetId ||
                      (th.id === "logo" && state.themeId === "your_logo")));
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => {
                      updateState({
                        festiveTheme: targetId,
                        themeId: targetId,
                        uniqueThemeKey: `${targetId}_${state.festiveVariant || 1}`,
                        themeMode: "preset",
                      });
                      setShowAllThemesModal(false);
                    }}
                    className={`flex flex-col items-center rounded-xl border p-3 text-center transition-all cursor-pointer ${
                      active
                        ? "border-[#2563EB] bg-[#EFF6FF] ring-2 ring-[#2563EB]"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <FestiveThumb id={th.id} name={th.name} customThumbUrl={th.thumbnail} companyLogoUrl={companyLogoUrl} />
                    <span className="mt-2 text-xs font-bold text-slate-900">{th.name}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">Festival frame</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM FIELD MODAL */}
      {showCustomFieldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">
                {showCustomFieldModal.target === "column"
                  ? "Add Custom Item Column"
                  : showCustomFieldModal.target === "party"
                  ? "Add Custom Party Field"
                  : "Add Custom Invoice Field"}
              </h3>
              <button
                type="button"
                onClick={() => setShowCustomFieldModal(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Field Label / Header Name</label>
                <input
                  type="text"
                  value={customFieldInput.label}
                  onChange={(e) => setCustomFieldInput({ ...customFieldInput, label: e.target.value })}
                  placeholder={
                    showCustomFieldModal.target === "column"
                      ? "e.g. Serial No, Size, Warranty"
                      : showCustomFieldModal.target === "party"
                      ? "e.g. Drug License No, Transporter"
                      : "e.g. Sales Rep, Delivery Terms"
                  }
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-[#2563EB] focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Sample Value / Placeholder</label>
                <input
                  type="text"
                  value={customFieldInput.value}
                  onChange={(e) => setCustomFieldInput({ ...customFieldInput, value: e.target.value })}
                  placeholder="e.g. DL-2024-99182"
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-[#2563EB] focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCustomFieldModal(null)}
                className="flex-1 rounded-lg bg-slate-100 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomField}
                disabled={!customFieldInput.label.trim()}
                className="flex-1 rounded-lg bg-[#2563EB] py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 cursor-pointer"
              >
                Add Field
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
