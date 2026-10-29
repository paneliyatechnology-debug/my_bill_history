"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "./api-client";
import { InvoiceStudioState } from "@/components/invoice/invoice-settings-studio";
import { resolveThemeDefinition } from "./invoice-theme-keys";

export const DEFAULT_INVOICE_STUDIO_STATE: InvoiceStudioState = {
  themeId: "stylish",
  themeMode: "preset",
  accentColor: "#111111",
  customColorHex: "#111111",
  festiveTheme: null,
  festiveVariant: 1,
  uniqueThemeKey: "stylish",

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

export function getCachedInvoiceStudioState(companyId?: string): InvoiceStudioState {
  if (typeof window === "undefined") return DEFAULT_INVOICE_STUDIO_STATE;
  try {
    const key = companyId ? `billing_invoice_settings_${companyId}` : "billing_invoice_settings";
    const raw = localStorage.getItem(key) || localStorage.getItem("billing_invoice_settings");
    if (raw) {
      const parsed = JSON.parse(raw);
      const def = resolveThemeDefinition(parsed.uniqueThemeKey || parsed.festiveTheme || parsed.themeId, parsed.festiveVariant);
      return {
        ...DEFAULT_INVOICE_STUDIO_STATE,
        ...parsed,
        themeId: def.isFestive ? "festival" : def.uniqueKey,
        festiveTheme: def.isFestive ? def.baseTheme : null,
        festiveVariant: def.variant,
        uniqueThemeKey: def.uniqueKey,
      };
    }
  } catch (err) {
    console.warn("Failed reading cached invoice settings:", err);
  }
  return DEFAULT_INVOICE_STUDIO_STATE;
}

export function useActiveInvoiceTheme(companyId?: string) {
  const [state, setState] = useState<InvoiceStudioState>(() => getCachedInvoiceStudioState(companyId));
  const [isLoading, setIsLoading] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const res: any = await apiClient.get("/invoice-settings");
      if (res && res.settings) {
        const s = res.settings;
        const def = resolveThemeDefinition(
          s.festiveTheme || s.uniqueThemeKey || s.themeId,
          s.festiveVariant
        );
        const merged: InvoiceStudioState = {
          ...DEFAULT_INVOICE_STUDIO_STATE,
          themeId: def.isFestive ? "festival" : def.uniqueKey,
          festiveTheme: def.isFestive ? def.baseTheme : null,
          festiveVariant: def.variant,
          uniqueThemeKey: def.uniqueKey,
          accentColor: s.accentColor || DEFAULT_INVOICE_STUDIO_STATE.accentColor,
          showPartyBalance: s.showPartyBalance ?? DEFAULT_INVOICE_STUDIO_STATE.showPartyBalance,
          enableFreeItemQuantity: s.enableFreeItemQuantity ?? DEFAULT_INVOICE_STUDIO_STATE.enableFreeItemQuantity,
          showItemDescription: s.showItemDescription ?? DEFAULT_INVOICE_STUDIO_STATE.showItemDescription,
          showAlternateUnit: s.showAlternateUnit ?? DEFAULT_INVOICE_STUDIO_STATE.showAlternateUnit,
          showPhoneNumber: s.showPhoneNumber ?? DEFAULT_INVOICE_STUDIO_STATE.showPhoneNumber,
          showTimeOnInvoice: s.showTimeOnInvoice ?? DEFAULT_INVOICE_STUDIO_STATE.showTimeOnInvoice,
          priceHistory: s.printHistory ?? DEFAULT_INVOICE_STUDIO_STATE.priceHistory,
          autoApplyLuxuryForSharing: s.autoApplyLuxuryForSharing ?? DEFAULT_INVOICE_STUDIO_STATE.autoApplyLuxuryForSharing,
          showPoNumber: s.showPoNumber ?? DEFAULT_INVOICE_STUDIO_STATE.showPoNumber,
          showEwayBillNumber: s.showEwayBillNumber ?? DEFAULT_INVOICE_STUDIO_STATE.showEwayBillNumber,
          showVehicleNumber: s.showVehicleNumber ?? DEFAULT_INVOICE_STUDIO_STATE.showVehicleNumber,
          showDiscount: s.showDiscount ?? DEFAULT_INVOICE_STUDIO_STATE.showDiscount,
          showTax: s.showTaxBreakup ?? DEFAULT_INVOICE_STUDIO_STATE.showTax,
          showHsn: s.showHsn ?? DEFAULT_INVOICE_STUDIO_STATE.showHsn,
          showShippingAddress: s.showShippingAddress ?? DEFAULT_INVOICE_STUDIO_STATE.showShippingAddress,
          invoiceCustomFields: Array.isArray(s.invoiceCustomFields) ? s.invoiceCustomFields : [],
          partyCustomFields: Array.isArray(s.partyCustomFields) ? s.partyCustomFields : [],
          showPricePerItem: s.showPricePerItem ?? DEFAULT_INVOICE_STUDIO_STATE.showPricePerItem,
          showQuantity: s.showQuantity ?? DEFAULT_INVOICE_STUDIO_STATE.showQuantity,
          showBatchNo: s.showBatch ?? DEFAULT_INVOICE_STUDIO_STATE.showBatchNo,
          showExpDate: s.showExpiry ?? DEFAULT_INVOICE_STUDIO_STATE.showExpDate,
          showMfgDate: s.showMfgDate ?? DEFAULT_INVOICE_STUDIO_STATE.showMfgDate,
          itemCustomColumns: Array.isArray(s.itemCustomColumns) ? s.itemCustomColumns : [],
          industryType: s.industryType || DEFAULT_INVOICE_STUDIO_STATE.industryType,
          fontFamily: s.fontFamily || DEFAULT_INVOICE_STUDIO_STATE.fontFamily,
          fontSize: s.fontSize || DEFAULT_INVOICE_STUDIO_STATE.fontSize,
          tablePadding: s.tablePadding || DEFAULT_INVOICE_STUDIO_STATE.tablePadding,
          borderStyle: s.borderStyle || DEFAULT_INVOICE_STUDIO_STATE.borderStyle,
          selectedBankAccount: s.selectedBankAccount || DEFAULT_INVOICE_STUDIO_STATE.selectedBankAccount,
          selectedPaymentQr: s.selectedPaymentQr || DEFAULT_INVOICE_STUDIO_STATE.selectedPaymentQr,
          termsAndConditions: s.termsAndConditions || DEFAULT_INVOICE_STUDIO_STATE.termsAndConditions,
          enableReceiverSignature: s.enableReceiverSignature ?? DEFAULT_INVOICE_STUDIO_STATE.enableReceiverSignature,
          signatureUrl: s.signatureUrl || DEFAULT_INVOICE_STUDIO_STATE.signatureUrl,
        };
        setState(merged);
        if (typeof window !== "undefined") {
          const key = companyId ? `billing_invoice_settings_${companyId}` : "billing_invoice_settings";
          localStorage.setItem(key, JSON.stringify(merged));
          localStorage.setItem("billing_invoice_settings", JSON.stringify(merged));
        }
      }
    } catch {
      // Fallback to cached state
      const cached = getCachedInvoiceStudioState(companyId);
      setState(cached);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    reload();

    const handleUpdate = (e?: Event) => {
      const customEvent = e as CustomEvent<InvoiceStudioState>;
      if (customEvent?.detail) {
        setState(customEvent.detail);
      } else {
        reload();
      }
    };

    window.addEventListener("billing_invoice_settings_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("billing_invoice_settings_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [reload]);

  const updateThemeFast = useCallback(
    async (
      uniqueKeyOrThemeId: string,
      festiveThemeId?: string | null,
      newAccent?: string,
      variant?: number
    ) => {
      const keyToResolve = festiveThemeId || uniqueKeyOrThemeId;
      const def = resolveThemeDefinition(keyToResolve, variant);

      const updated: InvoiceStudioState = {
        ...state,
        themeId: def.isFestive ? "festival" : def.uniqueKey,
        festiveTheme: def.isFestive ? def.baseTheme : null,
        festiveVariant: def.variant,
        uniqueThemeKey: def.uniqueKey,
        accentColor: newAccent || state.accentColor,
      };
      setState(updated);
      if (typeof window !== "undefined") {
        const key = companyId ? `billing_invoice_settings_${companyId}` : "billing_invoice_settings";
        localStorage.setItem(key, JSON.stringify(updated));
        localStorage.setItem("billing_invoice_settings", JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("billing_invoice_settings_updated", { detail: updated }));
      }

      // Sync to backend asynchronously
      try {
        await apiClient.put("/invoice-settings", {
          themeId: def.baseTheme,
          festiveTheme: def.isFestive ? def.uniqueKey : null,
          festiveVariant: def.variant,
          uniqueThemeKey: def.uniqueKey,
          accentColor: updated.accentColor,
        });
      } catch (err) {
        console.warn("Background sync of invoice theme failed:", err);
      }
    },
    [state, companyId]
  );

  return { state, isLoading, reload, updateThemeFast };
}
