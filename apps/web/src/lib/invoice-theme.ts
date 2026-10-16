/**
 * Authoritative Invoice Theme & Customization Engine
 * Provides 5 distinct GST-compliant themes + full customization controls
 */

export type InvoiceThemeId =
  | "classic-corporate"
  | "modern-saffron"
  | "emerald-trade"
  | "royal-violet"
  | "charcoal-minimal";

export type InvoiceFontFamily = "font-sans" | "font-serif" | "font-mono";
export type InvoiceHeaderLayout = "banner" | "split" | "minimal" | "boxed";

export interface InvoiceThemePreset {
  id: InvoiceThemeId;
  name: string;
  nameGujarati: string;
  tagline: string;
  taglineGujarati: string;
  primaryColor: string; // Primary brand color
  secondaryColor: string; // Complementary secondary color
  accentBg: string; // Light background accent
  badgeBg: string;
  badgeText: string;
  tableHeaderBg: string;
  tableHeaderText: string;
  borderColor: string;
  fontFamily: InvoiceFontFamily;
  headerLayout: InvoiceHeaderLayout;
  previewBorderColor: string;
}

export interface InvoiceCustomization {
  themeId: InvoiceThemeId;
  customPrimaryColor?: string; // Custom hex color override
  fontFamily: InvoiceFontFamily;
  headerLayout: InvoiceHeaderLayout;
  showLogo: boolean;
  showUpiQr: boolean;
  showBankDetails: boolean;
  showSignature: boolean;
  showTerms: boolean;
  showHsn: boolean;
  showDiscount: boolean;
  watermarkText: string;
  companyTagline: string;
}

export const INVOICE_THEMES: Record<InvoiceThemeId, InvoiceThemePreset> = {
  "modern-saffron": {
    id: "modern-saffron",
    name: "Modern Saffron",
    nameGujarati: "આધુનિક કેસરી (ભગવા)",
    tagline: "Signature brand warmth for retail & trade",
    taglineGujarati: "વેપાર અને રિટેલ માટે ઉત્તમ ભગવા રંગ",
    primaryColor: "#F47721",
    secondaryColor: "#D95F12",
    accentBg: "#FFF8F3",
    badgeBg: "#F47721",
    badgeText: "#FFFFFF",
    tableHeaderBg: "#FAFBFD",
    tableHeaderText: "#202124",
    borderColor: "#FED7AA",
    fontFamily: "font-sans",
    headerLayout: "banner",
    previewBorderColor: "#F47721",
  },
  "classic-corporate": {
    id: "classic-corporate",
    name: "Classic Corporate",
    nameGujarati: "ક્લાસિક કોર્પોરેટ (બ્લુ)",
    tagline: "Authoritative navy blue for corporate B2B",
    taglineGujarati: "B2B અને પાકા વેપાર માટે ઔપચારિક બ્લુ",
    primaryColor: "#1E3A8A",
    secondaryColor: "#2563EB",
    accentBg: "#EFF6FF",
    badgeBg: "#1E3A8A",
    badgeText: "#FFFFFF",
    tableHeaderBg: "#F1F5F9",
    tableHeaderText: "#0F172A",
    borderColor: "#CBD5E1",
    fontFamily: "font-sans",
    headerLayout: "split",
    previewBorderColor: "#1E3A8A",
  },
  "emerald-trade": {
    id: "emerald-trade",
    name: "Emerald Trade",
    nameGujarati: "એમેરાલ્ડ ગ્રીન (લીલો)",
    tagline: "Fresh green for pharma, agri & groceries",
    taglineGujarati: "દવાઓ, અનાજ અને એગ્રી વેપાર માટે લીલો રંગ",
    primaryColor: "#059669",
    secondaryColor: "#047857",
    accentBg: "#ECFDF5",
    badgeBg: "#059669",
    badgeText: "#FFFFFF",
    tableHeaderBg: "#F0FDF4",
    tableHeaderText: "#064E3B",
    borderColor: "#A7F3D0",
    fontFamily: "font-sans",
    headerLayout: "boxed",
    previewBorderColor: "#059669",
  },
  "royal-violet": {
    id: "royal-violet",
    name: "Royal Violet",
    nameGujarati: "રોયલ વાયોલેટ (જાંબલી)",
    tagline: "Premium luxury look for electronics & textiles",
    taglineGujarati: "કાપડ, ઈલેક્ટ્રોનિક્સ અને પ્રીમિયમ શોપ",
    primaryColor: "#4F46E5",
    secondaryColor: "#4338CA",
    accentBg: "#EEF2FF",
    badgeBg: "#4F46E5",
    badgeText: "#FFFFFF",
    tableHeaderBg: "#F5F3FF",
    tableHeaderText: "#312E81",
    borderColor: "#C7D2FE",
    fontFamily: "font-sans",
    headerLayout: "banner",
    previewBorderColor: "#4F46E5",
  },
  "charcoal-minimal": {
    id: "charcoal-minimal",
    name: "Charcoal Minimal",
    nameGujarati: "ચારકોલ મિનિમલ (બ્લેક)",
    tagline: "High-contrast printer friendly black & white",
    taglineGujarati: "પ્રિન્ટરમાં શાહી બચાવવા માટે સ્પષ્ટ બ્લેક",
    primaryColor: "#111827",
    secondaryColor: "#374151",
    accentBg: "#F9FAFB",
    badgeBg: "#111827",
    badgeText: "#FFFFFF",
    tableHeaderBg: "#F3F4F6",
    tableHeaderText: "#111827",
    borderColor: "#E5E7EB",
    fontFamily: "font-sans",
    headerLayout: "minimal",
    previewBorderColor: "#111827",
  },
};

export const COLOR_PALETTE_SWATCHES = [
  { label: "Saffron", hex: "#F47721" },
  { label: "Navy Blue", hex: "#1E3A8A" },
  { label: "Emerald", hex: "#059669" },
  { label: "Royal Violet", hex: "#4F46E5" },
  { label: "Ruby Crimson", hex: "#DC2626" },
  { label: "Charcoal Dark", hex: "#111827" },
  { label: "Teal Modern", hex: "#0D9488" },
  { label: "Warm Amber", hex: "#D97706" },
];

export const DEFAULT_INVOICE_CUSTOMIZATION: InvoiceCustomization = {
  themeId: "modern-saffron",
  customPrimaryColor: undefined,
  fontFamily: "font-sans",
  headerLayout: "banner",
  showLogo: true,
  showUpiQr: true,
  showBankDetails: true,
  showSignature: true,
  showTerms: true,
  showHsn: true,
  showDiscount: true,
  watermarkText: "TAX INVOICE",
  companyTagline: "Quality & Trust Guaranteed",
};

const STORAGE_KEY = "mybill_invoice_theme_settings_v1";

export function loadInvoiceCustomization(): InvoiceCustomization {
  if (typeof window === "undefined") {
    return DEFAULT_INVOICE_CUSTOMIZATION;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_INVOICE_CUSTOMIZATION;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_INVOICE_CUSTOMIZATION,
      ...parsed,
    };
  } catch (err) {
    console.error("Failed to load invoice theme settings:", err);
    return DEFAULT_INVOICE_CUSTOMIZATION;
  }
}

export function saveInvoiceCustomization(customization: InvoiceCustomization): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customization));
  } catch (err) {
    console.error("Failed to save invoice theme settings:", err);
  }
}

export function getActiveThemePreset(customization: InvoiceCustomization): InvoiceThemePreset {
  const base = INVOICE_THEMES[customization.themeId] || INVOICE_THEMES["modern-saffron"];
  if (customization.customPrimaryColor) {
    return {
      ...base,
      primaryColor: customization.customPrimaryColor,
      badgeBg: customization.customPrimaryColor,
      previewBorderColor: customization.customPrimaryColor,
    };
  }
  return base;
}
