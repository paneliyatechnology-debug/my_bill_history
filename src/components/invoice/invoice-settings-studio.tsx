"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/auth-context";
import { apiClient } from "../../lib/api-client";
import { FestiveThumb, InvoiceLivePreview, ThemeMiniCard } from "./invoice-live-preview";

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

const DEFAULT_STATE: InvoiceStudioState = {
  themeId: "stylish",
  themeMode: "preset",
  accentColor: "#111111",
  customColorHex: "#111111",
  festiveTheme: null,

  showPartyBalance: false,
  enableFreeItemQuantity: false,
  showItemDescription: true,
  showAlternateUnit: false,
  showPhoneNumber: true,
  showTimeOnInvoice: false,
  priceHistory: false,
  autoApplyLuxuryForSharing: true,

  industryType: "General Trade",
  showPoNumber: false,
  showEwayBillNumber: false,
  showVehicleNumber: false,
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

const COLOR_PALETTE = [
  { id: "#111111", name: "Charcoal Black" },
  { id: "#16A34A", name: "Forest Green" },
  { id: "#0284C7", name: "Ocean Blue" },
  { id: "#7C3AED", name: "Royal Purple" },
  { id: "#DC2626", name: "Crimson Red" },
  { id: "#4F46E5", name: "Slate Indigo" },
  { id: "#D97706", name: "Mustard Gold" },
  { id: "#C2410C", name: "Rust Brown" },
];

const FESTIVE_THEMES = [
  { id: "logo", name: "Your logo", tone: "linear-gradient(160deg,#FFF7ED,#FFFFFF)" },
  { id: "navratri", name: "Navaratri", tone: "linear-gradient(160deg,#FED7AA,#FFF7ED)" },
  { id: "durga_puja", name: "Durga Puja", tone: "linear-gradient(160deg,#FECDD3,#FFF1F2)" },
  { id: "dussehra", name: "Dussehra", tone: "linear-gradient(160deg,#FDBA74,#FFF7ED)" },
  { id: "dhanteras", name: "Dhanteras", tone: "linear-gradient(160deg,#FDE68A,#FEFCE8)" },
  { id: "diwali", name: "Diwali", tone: "linear-gradient(160deg,#E9D5FF,#FAF5FF)" },
  { id: "uttarayan", name: "Uttarayan", tone: "linear-gradient(160deg,#BAE6FD,#F0F9FF)" },
  { id: "independence", name: "Independence", tone: "linear-gradient(160deg,#BBF7D0,#FFEDD5)" },
  { id: "ganesh_chaturthi", name: "Ganesh Puja", tone: "linear-gradient(160deg,#FDE68A,#FFEDD5)" },
];

const STANDARD_THEMES = [
  { id: "stylish", name: "Stylish", kind: "stylish" as const, desc: "Clean modern bill without heavy boxes" },
  { id: "luxury", name: "Luxury", kind: "luxury" as const, isNew: true, desc: "Ornate border, premium header & gold lines" },
  { id: "advanced_gst_tally", name: "Advanced GST (Tally)", kind: "tally" as const, desc: "Boxed GST layout with complete HSN table" },
];

const ALL_MODAL_THEMES: Array<{
  id: string;
  name: string;
  tag: string;
  kind: "stylish" | "luxury" | "tally" | "gst" | "tallybook" | "lite" | "compact" | "modern" | "simple" | "billbook" | "festival";
}> = [
  { id: "stylish", name: "Stylish", tag: "Clean open bill", kind: "stylish" },
  { id: "luxury", name: "Luxury", tag: "Double gold frame", kind: "luxury" },
  { id: "advanced_gst_tally", name: "Advanced GST (Tally)", tag: "Ruled HSN invoice", kind: "tally" },
  { id: "advanced_gst", name: "Advanced GST", tag: "Colour banner + tax column", kind: "gst" },
  { id: "tallybook", name: "TallyBook", tag: "Classic black boxes", kind: "tallybook" },
  { id: "tallybook_lite", name: "TallyBook Lite", tag: "Light frame", kind: "lite" },
  { id: "advanced_compact", name: "Advanced compact", tag: "Tight A5 GST", kind: "compact" },
  { id: "modern", name: "Modern", tag: "Accent rail + pill bar", kind: "modern" },
  { id: "simple", name: "Simple", tag: "Hairline rules only", kind: "simple" },
  { id: "billbook", name: "Billbook", tag: "Logo mark + footer", kind: "billbook" },
];

export function InvoiceSettingsStudio() {
  const { currentCompany, user } = useAuth();

  const [state, setState] = useState<InvoiceStudioState>(DEFAULT_STATE);
  const [history, setHistory] = useState<InvoiceStudioState[]>([DEFAULT_STATE]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [openAccordion, setOpenAccordion] = useState<string | null>("theme-settings");
  const [focusedSection, setFocusedSection] = useState<string | null>(null);

  const [showAllThemesModal, setShowAllThemesModal] = useState(false);
  const [showCustomThemeModal, setShowCustomThemeModal] = useState(false);
  const [showCustomFieldModal, setShowCustomFieldModal] = useState<{
    target: "invoice" | "party" | "column";
  } | null>(null);
  const [customFieldInput, setCustomFieldInput] = useState({ label: "", value: "" });

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAttachedImage, setAiAttachedImage] = useState<string | null>(null);
  const [selectorActive, setSelectorActive] = useState(false);
  const [aiToast, setAiToast] = useState<{ message: string; showUndo: boolean } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<InvoiceStudioState>(DEFAULT_STATE);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const skipRemoteLoad = useRef(false);
  const signatureInputRef = useRef<HTMLInputElement>(null);

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
        const res: any = await apiClient.get("/invoice-settings");
        if (res && res.settings) {
          if (skipRemoteLoad.current) return;
          const s = res.settings;
          const merged: InvoiceStudioState = {
            ...DEFAULT_STATE,
            themeId: s.themeId || DEFAULT_STATE.themeId,
            festiveTheme:
              s.festiveTheme === "logo"
                ? "logo"
                : s.festiveTheme ||
                  ([
                    "your_logo",
                    "navratri",
                    "durga_puja",
                    "dussehra",
                    "dhanteras",
                    "diwali",
                    "uttarayan",
                    "independence",
                    "ganesh_chaturthi",
                  ].includes(s.themeId)
                    ? s.themeId === "your_logo"
                      ? "logo"
                      : s.themeId
                    : null),
            accentColor: s.accentColor || DEFAULT_STATE.accentColor,
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
          const merged = { ...DEFAULT_STATE, ...parsed };
          setState(merged);
          setHistory([merged]);
          setHistoryIndex(0);
        }
      } catch {}
    };

    loadSettings();
    skipRemoteLoad.current = false;
  }, [companyKey]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const dto = {
        themeId:
          state.festiveTheme === "logo"
            ? "your_logo"
            : state.festiveTheme
              ? state.festiveTheme
              : state.themeId,
        festiveTheme: state.festiveTheme === "logo" ? "your_logo" : state.festiveTheme,
        accentColor: state.accentColor,
        showPartyBalance: state.showPartyBalance,
        enableFreeItemQuantity: state.enableFreeItemQuantity,
        showItemDescription: state.showItemDescription,
        showAlternateUnit: state.showAlternateUnit,
        showPhoneNumber: state.showPhoneNumber,
        showTimeOnInvoice: state.showTimeOnInvoice,
        printHistory: state.priceHistory,
        autoApplyLuxuryForSharing: state.autoApplyLuxuryForSharing,
        showPoNumber: state.showPoNumber,
        showEwayBillNumber: state.showEwayBillNumber,
        showVehicleNumber: state.showVehicleNumber,
        showDiscount: state.showDiscount,
        showTaxBreakup: state.showTax,
        showTaxColumn: state.showTax,
        showHsn: state.showHsn,
        showShippingAddress: state.showShippingAddress,
        showPricePerItem: state.showPricePerItem,
        showQuantity: state.showQuantity,
        showBatch: state.showBatchNo,
        showExpiry: state.showExpDate,
        showMfgDate: state.showMfgDate,
        itemCustomColumns: state.itemCustomColumns,
        invoiceCustomFields: state.invoiceCustomFields,
        partyCustomFields: state.partyCustomFields,
        industryType: state.industryType,
        fontFamily: state.fontFamily,
        fontSize: state.fontSize,
        tablePadding: state.tablePadding,
        borderStyle: state.borderStyle,
        selectedBankAccount: state.selectedBankAccount,
        selectedPaymentQr: state.selectedPaymentQr,
        termsAndConditions: state.termsAndConditions,
        enableReceiverSignature: state.enableReceiverSignature,
      };

      await apiClient.put("/invoice-settings", dto);

      localStorage.setItem(`billing_invoice_settings_${companyKey}`, JSON.stringify(state));
      localStorage.setItem(`billing_invoice_settings`, JSON.stringify(state));

      setLastSaved(state);
      setSaveBanner("Changes saved successfully!");
      setTimeout(() => setSaveBanner(null), 3000);
    } catch {
      setSaveBanner("Failed to save changes. Saved to browser storage.");
      setTimeout(() => setSaveBanner(null), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerAi = async (overridePrompt?: string) => {
    const promptToSend = (overridePrompt || aiPrompt).trim();
    if (!promptToSend) return;

    setAiLoading(true);
    try {
      const res: any = await apiClient.post("/invoice-settings/ai-style", {
        prompt: promptToSend,
        currentSettings: state,
        selectedElement: selectorActive ? focusedSection : null,
        imageBase64: aiAttachedImage,
      });

      if (res && res.updatedSettings) {
        const festivalIds = [
          "your_logo",
          "navratri",
          "durga_puja",
          "dussehra",
          "dhanteras",
          "diwali",
          "uttarayan",
          "independence",
          "ganesh_chaturthi",
        ];
        const patch = { ...res.updatedSettings };
        if (festivalIds.includes(patch.themeId)) {
          patch.festiveTheme = patch.themeId === "your_logo" ? "logo" : patch.themeId;
        } else if (patch.themeId) {
          patch.festiveTheme = null;
        }
        updateState((prev) => ({
          ...prev,
          ...patch,
        }));
        setAiToast({
          message: res.explanation || "AI applied new invoice styles!",
          showUndo: true,
        });
        setAiPrompt("");
        setAiAttachedImage(null);
        setSelectorActive(false);
      }
    } catch {
      if (promptToSend.toLowerCase().includes("easy to read")) {
        updateState({
          themeId: "stylish",
          festiveTheme: null,
          accentColor: "#111111",
          showItemDescription: true,
          showAlternateUnit: true,
          showHsn: true,
        });
        setAiToast({
          message: "Applied clean, high-contrast typography and spaced item layout.",
          showUndo: true,
        });
      } else if (promptToSend.toLowerCase().includes("brand touch")) {
        updateState({
          themeId: "luxury",
          festiveTheme: null,
          accentColor: "#4F46E5",
          autoApplyLuxuryForSharing: true,
        });
        setAiToast({
          message: "Applied luxury branding theme with elegant slate indigo accents.",
          showUndo: true,
        });
      } else if (promptToSend.toLowerCase().includes("highlight key info")) {
        updateState({
          themeId: "advanced_gst_tally",
          festiveTheme: null,
          accentColor: "#DC2626",
          showPoNumber: true,
          showPartyBalance: true,
          showTax: true,
        });
        setAiToast({
          message: "Highlighted PO Number, Party Balance, and GST Tax Breakup.",
          showUndo: true,
        });
      } else if (promptToSend.toLowerCase().includes("fix layout")) {
        updateState({
          themeId: "advanced_gst_tally",
          festiveTheme: null,
          accentColor: "#0284C7",
          fontSize: "12",
        });
        setAiToast({
          message: "Rebalanced column widths and normalized table margins.",
          showUndo: true,
        });
      } else if (promptToSend.toLowerCase().includes("make it creative")) {
        updateState({
          themeId: "diwali",
          festiveTheme: "diwali",
          showTimeOnInvoice: true,
        });
        setAiToast({
          message: "Applied the Diwali frame with diyas, purple border, and a full item table.",
          showUndo: true,
        });
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setAiAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
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
      name: "PARLE-G 200G",
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

  const companyDisplayName = currentCompany?.tradeName || currentCompany?.legalName || "JKEnterprise";
  const companyPhone = (currentCompany as any)?.phone || user?.phone || "8238812890";
  const companyAddress = (currentCompany as any)?.address || "Amreli, Gujarat, 365630";

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] pb-12 font-sans text-slate-800">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFileChange}
      />
      <input
        ref={signatureInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleSignatureUpload}
      />

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-3.5 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Invoice Settings</h1>
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600 border border-blue-100">
            Live Preview Studio
          </span>
        </div>

        <div className="flex items-center gap-3">
          {saveBanner && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 animate-in fade-in">
              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>{saveBanner}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || JSON.stringify(state) === JSON.stringify(lastSaved)}
            className="flex items-center gap-2 rounded-xl bg-[#5346F5] hover:bg-[#4338CA] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all active:scale-95 disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </header>

      {aiToast && (
        <div className="mx-6 mt-3 flex items-center justify-between rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-2.5 text-xs text-indigo-900 shadow-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="text-base">✨</span>
            <span className="font-medium">{aiToast.message}</span>
          </div>
          <div className="flex items-center gap-2">
            {aiToast.showUndo && (
              <button
                type="button"
                onClick={handleUndo}
                className="font-bold underline hover:text-indigo-700"
              >
                Undo
              </button>
            )}
            <button
              type="button"
              onClick={() => setAiToast(null)}
              className="text-slate-400 hover:text-slate-600 ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <main className="grid grid-cols-1 gap-6 p-4 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px] max-w-[1720px] mx-auto">
        <section className="flex flex-col items-center">
          <div className="mb-3 flex w-full max-w-[850px] items-center justify-between px-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                title="Undo last change"
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-40"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l6-6M3 10l6 6" />
                </svg>
                <span>Undo</span>
              </button>

              <button
                type="button"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                title="Redo change"
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-40"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a5 5 0 00-5 5v2m15-7l-6-6m6 6l-6 6" />
                </svg>
                <span>Redo</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleRevertToOriginal}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Revert to Original</span>
            </button>
          </div>

          <div
            className={`relative w-full max-w-[850px] min-h-[640px] overflow-auto rounded-lg bg-white p-5 text-[12px] shadow-[0_8px_30px_rgba(15,23,42,0.08)] transition-all ${
              selectorActive ? "cursor-crosshair ring-2 ring-indigo-400" : ""
            }`}
          >
            <InvoiceLivePreview
              state={state}
              companyName={companyDisplayName}
              companyPhone={companyPhone}
              companyAddress={companyAddress}
              companyGstin={(currentCompany as any)?.gstin || "24AAAPL1234C1ZV"}
              items={sampleItems}
              focusedSection={focusedSection}
              onFocus={(section, accordion) => {
                setFocusedSection(section);
                setOpenAccordion(accordion);
              }}
            />
          </div>

          <div className="sticky bottom-4 z-20 mt-4 w-full max-w-[850px] rounded-2xl border border-indigo-100 bg-white/95 p-3.5 shadow-xl backdrop-blur-md">
            <div className="mb-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="flex items-center gap-1 font-bold text-indigo-700 whitespace-nowrap mr-1">
                <span className="text-sm">✨</span> Try using:
              </span>
              {[
                { label: "Easy to Read", prompt: "Make the invoice easy to read with clean typography and high contrast" },
                { label: "Brand Touch", prompt: "Apply a premium brand touch with luxury theme and executive colors" },
                { label: "Highlight Key Info", prompt: "Highlight key billing information, tax breakup, and due dates prominently" },
                { label: "Fix Layout", prompt: "Fix and rebalance the table columns and layout for maximum neatness" },
                { label: "Make it Creative", prompt: "Make it creative with vibrant festive colors and decorative styling" },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleTriggerAi(chip.prompt)}
                  disabled={aiLoading}
                  className="rounded-full border border-slate-200 bg-slate-50/80 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 px-3 py-1 text-[11px] font-medium text-slate-600 transition-all whitespace-nowrap active:scale-95"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <div className="relative flex items-center rounded-xl border border-slate-200 bg-slate-50/50 p-1.5 focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleTriggerAi();
                  }
                }}
                placeholder="Write anything to style your invoice... (e.g. 'Use emerald green with tax breakup & PO field')"
                className="flex-1 bg-transparent px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
              />

              <div className="flex items-center gap-1.5 pr-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach reference image or logo"
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    aiAttachedImage
                      ? "bg-indigo-100 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-200/60"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{aiAttachedImage ? "Image Attached" : "Attach Image"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectorActive(!selectorActive)}
                  title="Target a specific invoice block"
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    selectorActive
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-slate-200/60"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle cx="12" cy="12" r="7" strokeWidth={2} />
                    <path strokeLinecap="round" strokeWidth={2} d="M12 2v3m0 14v3M2 12h3m14 0h3" />
                  </svg>
                  <span>{selectorActive ? "Target Active" : "Selector"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTriggerAi()}
                  disabled={aiLoading || (!aiPrompt.trim() && !aiAttachedImage)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-all active:scale-90 shadow-2xs"
                >
                  {aiLoading ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-violet-100 bg-[#FBF7FF] p-4 shadow-xs">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-base">🎁</span>
                <h3 className="text-sm font-semibold tracking-tight text-slate-800">ThemeStore</h3>
                <span className="text-slate-400 hover:text-slate-600 cursor-pointer" title="Seasonal and festive designs">ⓘ</span>
              </div>
              {state.festiveTheme && (
                <button
                  type="button"
                  onClick={() => updateState({ festiveTheme: null })}
                  className="text-[10px] font-semibold text-rose-600 hover:underline"
                >
                  Clear Festive
                </button>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {FESTIVE_THEMES.map((th) => {
                const isActive = state.festiveTheme === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() =>
                      updateState({
                        festiveTheme: isActive ? null : th.id,
                        themeId: isActive ? "advanced_gst_tally" : th.id === "logo" ? "your_logo" : th.id,
                        themeMode: "preset",
                      })
                    }
                    className={`flex shrink-0 flex-col items-center rounded-md p-0.5 transition-all ${
                      isActive ? "ring-2 ring-[#7C3AED]" : "hover:ring-1 hover:ring-slate-300"
                    }`}
                  >
                    <FestiveThumb id={th.id} name={th.id === "logo" ? "YOUR LOGO" : th.name} tone={th.tone} />
                    <span className="mt-1 max-w-[84px] truncate text-[10px] font-medium text-slate-700">{th.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="themeMode"
                  checked={state.themeMode === "preset"}
                  onChange={() => updateState({ themeMode: "preset" })}
                  className="accent-[#5346F5]"
                />
                <span>Themes</span>
              </label>

              <button
                type="button"
                onClick={() => setShowAllThemesModal(true)}
                className="text-xs font-bold text-[#5346F5] hover:underline"
              >
                See All
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {STANDARD_THEMES.map((thm) => {
                const isSelected = !state.festiveTheme && state.themeMode === "preset" && state.themeId === thm.id;
                return (
                  <button
                    key={thm.id}
                    type="button"
                    onClick={() =>
                      updateState({
                        themeId: thm.id,
                        themeMode: "preset",
                        festiveTheme: null,
                        accentColor: thm.id === "luxury" && state.accentColor === "#111111" ? "#C9A227" : state.accentColor,
                      })
                    }
                    className={`relative flex flex-col items-center rounded-md p-1 text-center transition-all ${
                      isSelected ? "ring-2 ring-[#7C3AED]" : "hover:ring-1 hover:ring-slate-300"
                    }`}
                  >
                    {thm.isNew && (
                      <span className="absolute -top-1 right-0 z-10 rounded bg-rose-500 px-1 text-[8px] font-bold uppercase text-white">
                        NEW
                      </span>
                    )}
                    <ThemeMiniCard kind={thm.kind} />
                    <span className="mt-1 text-[11px] font-medium leading-tight text-slate-800">{thm.name}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setShowAllThemesModal(true)}
                className="flex flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-xs font-semibold text-[#5346F5] hover:bg-indigo-50"
              >
                See All
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="themeMode"
                  checked={state.themeMode === "custom"}
                  onChange={() => updateState({ themeMode: "custom" })}
                  className="accent-[#5346F5]"
                />
                <span>Create Custom Theme</span>
                <span className="text-slate-400 hover:text-slate-600" title="Customize margins, fonts and layouts">ⓘ</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  updateState({ themeMode: "custom" });
                  setShowCustomThemeModal(true);
                }}
                className="mt-2.5 w-full rounded-xl bg-[#5346F5] hover:bg-[#4338CA] py-2 text-xs font-semibold text-white shadow-xs transition-colors"
              >
                Create your own theme
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-800">Select Color</h3>
            <div className="flex flex-wrap items-center gap-2.5">
              {COLOR_PALETTE.map((c) => {
                const isSelected = state.accentColor.toLowerCase() === c.id.toLowerCase();
                return (
                  <button
                    key={c.id}
                    type="button"
                    title={c.name}
                    onClick={() => updateState({ accentColor: c.id, customColorHex: c.id })}
                    style={{ backgroundColor: c.id }}
                    className={`relative flex h-8 w-8 items-center justify-center rounded-lg transition-transform active:scale-90 ${
                      isSelected ? "ring-2 ring-offset-2 ring-slate-900 scale-105" : "hover:opacity-90"
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-4 h-4 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}

              <div className="flex items-center gap-1.5 ml-auto">
                <input
                  type="color"
                  value={state.customColorHex}
                  onChange={(e) => updateState({ accentColor: e.target.value, customColorHex: e.target.value })}
                  className="h-8 w-8 cursor-pointer rounded-lg border border-slate-200 p-0.5"
                  title="Pick custom hex color"
                />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <button
              type="button"
              onClick={() => setOpenAccordion(openAccordion === "theme-settings" ? null : "theme-settings")}
              className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-slate-50"
            >
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Theme Settings</h3>
                <span className="rounded-full bg-blue-100 px-2 py-0.2 text-[9px] font-bold text-blue-700">NEW</span>
              </div>
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform ${openAccordion === "theme-settings" ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openAccordion === "theme-settings" && (
              <div className="space-y-2.5 border-t border-slate-100 p-4 text-xs">
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
                    tooltip: "Print exact billing time alongside invoice date",
                    val: state.showTimeOnInvoice,
                    set: (v: boolean) => updateState({ showTimeOnInvoice: v }),
                  },
                  {
                    key: "priceHistory",
                    label: "Price History",
                    tooltip: "Track past selling prices for the customer",
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
                  <label key={item.key} className="flex items-center justify-between py-0.5 cursor-pointer select-none">
                    <span className="flex items-center gap-1 text-slate-700">
                      {item.label}
                      {item.tooltip && (
                        <span className="text-slate-400 hover:text-slate-600" title={item.tooltip}>ⓘ</span>
                      )}
                    </span>
                    <input
                      type="checkbox"
                      checked={item.val}
                      onChange={(e) => item.set(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 accent-[#5346F5]"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <button
              type="button"
              onClick={() => setOpenAccordion(openAccordion === "invoice-details" ? null : "invoice-details")}
              className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-slate-50"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Invoice Details</h3>
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform ${openAccordion === "invoice-details" ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openAccordion === "invoice-details" && (
              <div className="space-y-3.5 border-t border-slate-100 p-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Industry Type</label>
                  <select
                    value={state.industryType}
                    onChange={(e) => updateState({ industryType: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="General Trade">General Trade</option>
                    <option value="Retail Store">Retail Store & Supermarket</option>
                    <option value="Wholesale">Wholesale & Distribution</option>
                    <option value="Pharmacy">Pharmacy & Healthcare</option>
                    <option value="Manufacturing">Manufacturing & Processing</option>
                    <option value="Textiles">Textiles & Apparel</option>
                    <option value="Electronics">Electronics & Hardware</option>
                    <option value="Services">Services & IT Consulting</option>
                  </select>
                </div>

                <div className="space-y-2">
                  {[
                    { label: "PO Number", checked: state.showPoNumber, set: (v: boolean) => updateState({ showPoNumber: v }) },
                    { label: "E-way Bill Number", checked: state.showEwayBillNumber, set: (v: boolean) => updateState({ showEwayBillNumber: v }) },
                    { label: "Vehicle Number", checked: state.showVehicleNumber, set: (v: boolean) => updateState({ showVehicleNumber: v }) },
                  ].map((field) => (
                    <label key={field.label} className="flex items-center justify-between cursor-pointer py-0.5">
                      <span className="text-slate-700">{field.label}</span>
                      <input
                        type="checkbox"
                        checked={field.checked}
                        onChange={(e) => field.set(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 accent-[#5346F5]"
                      />
                    </label>
                  ))}
                </div>

                {state.invoiceCustomFields.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <span className="font-semibold text-slate-500 text-[11px]">Custom Fields:</span>
                    {state.invoiceCustomFields.map((cf) => (
                      <div key={cf.id} className="flex items-center justify-between bg-slate-50 px-2.5 py-1.5 rounded-lg">
                        <span className="text-slate-700 font-medium">{cf.label}</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateState({
                              invoiceCustomFields: state.invoiceCustomFields.filter((f) => f.id !== cf.id),
                            })
                          }
                          className="text-rose-500 hover:text-rose-700 text-xs"
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
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 font-semibold text-xs transition-colors"
                >
                  <span>+ Add Custom Field</span>
                </button>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <button
              type="button"
              onClick={() => setOpenAccordion(openAccordion === "party-details" ? null : "party-details")}
              className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-slate-50"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Party Details</h3>
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform ${openAccordion === "party-details" ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openAccordion === "party-details" && (
              <div className="space-y-3.5 border-t border-slate-100 p-4 text-xs">
                <label className="flex items-center justify-between cursor-pointer py-0.5">
                  <span className="text-slate-700">Show Shipping Address</span>
                  <input
                    type="checkbox"
                    checked={state.showShippingAddress}
                    onChange={(e) => updateState({ showShippingAddress: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 accent-[#5346F5]"
                  />
                </label>

                {state.partyCustomFields.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <span className="font-semibold text-slate-500 text-[11px]">Custom Party Fields:</span>
                    {state.partyCustomFields.map((pf) => (
                      <div key={pf.id} className="flex items-center justify-between bg-slate-50 px-2.5 py-1.5 rounded-lg">
                        <span className="text-slate-700 font-medium">{pf.label}</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateState({
                              partyCustomFields: state.partyCustomFields.filter((f) => f.id !== pf.id),
                            })
                          }
                          className="text-rose-500 hover:text-rose-700 text-xs"
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
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 font-semibold text-xs transition-colors"
                >
                  <span>+ Add Custom Field</span>
                </button>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <button
              type="button"
              onClick={() => setOpenAccordion(openAccordion === "item-table" ? null : "item-table")}
              className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-slate-50"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Item Table Columns</h3>
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform ${openAccordion === "item-table" ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openAccordion === "item-table" && (
              <div className="space-y-3.5 border-t border-slate-100 p-4 text-xs">
                <div className="space-y-2">
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
                    <label key={col.label} className="flex items-center justify-between cursor-pointer py-0.5">
                      <span className="text-slate-700">{col.label}</span>
                      <input
                        type="checkbox"
                        checked={col.checked}
                        onChange={(e) => col.set(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 accent-[#5346F5]"
                      />
                    </label>
                  ))}
                </div>

                {state.itemCustomColumns.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <span className="font-semibold text-slate-500 text-[11px]">Custom Columns:</span>
                    {state.itemCustomColumns.map((col) => (
                      <div key={col.id} className="flex items-center justify-between bg-slate-50 px-2.5 py-1.5 rounded-lg">
                        <span className="text-slate-700 font-medium">{col.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateState({
                              itemCustomColumns: state.itemCustomColumns.filter((c) => c.id !== col.id),
                            })
                          }
                          className="text-rose-500 hover:text-rose-700 text-xs"
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
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 font-semibold text-xs transition-colors"
                >
                  <span>+ Add Custom Column</span>
                </button>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <button
              type="button"
              onClick={() => setOpenAccordion(openAccordion === "misc-details" ? null : "misc-details")}
              className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-slate-50"
            >
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Miscellaneous Details</h3>
                <span className="rounded-full bg-blue-100 px-2 py-0.2 text-[9px] font-bold text-blue-700">NEW</span>
              </div>
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform ${openAccordion === "misc-details" ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openAccordion === "misc-details" && (
              <div className="space-y-4 border-t border-slate-100 p-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bank Account</label>
                  <select
                    value={state.selectedBankAccount}
                    onChange={(e) => updateState({ selectedBankAccount: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="primary">HDFC Bank - 50200034821 (Primary)</option>
                    <option value="icici">ICICI Bank - 00210501923</option>
                    <option value="sbi">State Bank of India - 310928419</option>
                    <option value="none">Don&apos;t print bank details</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment QR</label>
                  <select
                    value={state.selectedPaymentQr}
                    onChange={(e) => updateState({ selectedPaymentQr: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="primary_upi">Dynamic UPI QR (HDFC / Google Pay / PhonePe)</option>
                    <option value="paytm">Paytm Merchant QR</option>
                    <option value="none">Don&apos;t print Payment QR</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Terms and Conditions</label>
                  <select
                    value={state.termsDocType}
                    onChange={(e) => updateState({ termsDocType: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none mb-2"
                  >
                    <option value="sales">Sales Invoices</option>
                    <option value="quotation">Quotations / Estimates</option>
                    <option value="challan">Delivery Challans</option>
                  </select>

                  <textarea
                    rows={4}
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
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none leading-relaxed"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setSaveBanner("Terms and Conditions updated!");
                      setTimeout(() => setSaveBanner(null), 2500);
                    }}
                    className="mt-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition-colors"
                  >
                    Save Terms
                  </button>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Signature</label>
                  <select
                    value={state.signatureType}
                    onChange={(e) => updateState({ signatureType: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none mb-2"
                  >
                    <option value="desktop">Upload from Desktop</option>
                    <option value="saved">Use Saved Signature</option>
                    <option value="none">None</option>
                  </select>

                  {state.signatureType === "desktop" && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => signatureInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-indigo-300 py-3 text-indigo-600 hover:bg-indigo-50 font-semibold text-xs transition-colors"
                      >
                        <span>Choose an Image</span>
                      </button>
                      <p className="text-[10px] text-slate-400 text-center">
                        PNG, JPEG supported, upto 3 MB and dimensions over 300 X 300
                      </p>

                      {state.signatureUrl && (
                        <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2 border border-slate-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={state.signatureUrl} alt="Signature preview" className="h-8 object-contain" />
                          <button
                            type="button"
                            onClick={() => updateState({ signatureUrl: null })}
                            className="text-xs font-semibold text-rose-600 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <label className="mt-3 flex items-center justify-between cursor-pointer py-1">
                    <span className="text-slate-700">Enable receiver&apos;s signature field on invoice</span>
                    <input
                      type="checkbox"
                      checked={state.enableReceiverSignature}
                      onChange={(e) => updateState({ enableReceiverSignature: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 accent-[#5346F5]"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </aside>
      </main>

      {showAllThemesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Select Invoice Theme</h3>
              <button
                type="button"
                onClick={() => setShowAllThemesModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Invoice layouts</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto p-1">
              {ALL_MODAL_THEMES.map((th) => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => {
                    updateState({ themeId: th.id, themeMode: "preset", festiveTheme: null });
                    setShowAllThemesModal(false);
                  }}
                  className={`flex flex-col items-center rounded-xl border p-3 text-center transition-all ${
                    !state.festiveTheme && state.themeId === th.id
                      ? "border-[#5346F5] bg-indigo-50/50 ring-2 ring-[#5346F5]"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="mb-2 w-full">
                    <ThemeMiniCard kind={th.kind} />
                  </div>
                  <span className="text-xs font-bold text-slate-900">{th.name}</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">{th.tag}</span>
                </button>
              ))}
              {FESTIVE_THEMES.map((th) => {
                const active =
                  state.festiveTheme === th.id ||
                  state.themeId === th.id ||
                  (th.id === "logo" && state.themeId === "your_logo");
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => {
                      updateState({
                        festiveTheme: th.id,
                        themeId: th.id === "logo" ? "your_logo" : th.id,
                        themeMode: "preset",
                      });
                      setShowAllThemesModal(false);
                    }}
                    className={`flex flex-col items-center rounded-xl border p-3 text-center transition-all ${
                      active
                        ? "border-[#5346F5] bg-indigo-50/50 ring-2 ring-[#5346F5]"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <FestiveThumb id={th.id} name={th.name} />
                    <span className="mt-2 text-xs font-bold text-slate-900">{th.name}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">Festival frame</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showCustomThemeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create Custom Theme</h3>
                <p className="text-xs text-slate-500">Fine-tune fonts, margins, and typography</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomThemeModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Font Family</label>
                <select
                  value={state.fontFamily}
                  onChange={(e) => updateState({ fontFamily: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs"
                >
                  <option value="Inter, sans-serif">Inter (Modern Clean)</option>
                  <option value="Georgia, serif">Georgia (Editorial Serif)</option>
                  <option value="'Courier New', monospace">Courier (Typewriter / POS)</option>
                  <option value="system-ui, sans-serif">System Default</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Base Font Size</label>
                <div className="grid grid-cols-4 gap-2">
                  {["11", "12", "13", "14"].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => updateState({ fontSize: sz })}
                      className={`py-2 rounded-lg border font-semibold ${
                        state.fontSize === sz
                          ? "border-[#5346F5] bg-indigo-50 text-indigo-700"
                          : "border-slate-200"
                      }`}
                    >
                      {sz}px
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Table Padding</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "compact", label: "Compact" },
                    { id: "normal", label: "Normal" },
                    { id: "relaxed", label: "Relaxed" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => updateState({ tablePadding: p.id })}
                      className={`py-2 rounded-lg border font-semibold ${
                        state.tablePadding === p.id
                          ? "border-[#5346F5] bg-indigo-50 text-indigo-700"
                          : "border-slate-200"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCustomThemeModal(false)}
                className="rounded-xl bg-[#5346F5] px-5 py-2 text-xs font-semibold text-white shadow-xs"
              >
                Apply Custom Theme
              </button>
            </div>
          </div>
        </div>
      )}

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
                className="text-slate-400 hover:text-slate-600"
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
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-indigo-500 focus:outline-none"
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
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCustomFieldModal(null)}
                className="flex-1 rounded-xl bg-slate-100 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomField}
                disabled={!customFieldInput.label.trim()}
                className="flex-1 rounded-xl bg-[#5346F5] py-2 text-xs font-semibold text-white hover:bg-[#4338CA] transition-colors disabled:opacity-50"
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
