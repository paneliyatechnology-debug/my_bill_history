export interface ThemeDefinition {
  uniqueKey: string;
  baseTheme: string;
  variant: number;
  displayName: string;
  displayNameGu: string;
  isFestive: boolean;
  bgImageSrc?: string;
  thumbSrc?: string;
  primaryColor?: string;
  badge?: string | null;
  description?: string;
}

export const ALL_THEME_KEYS: ThemeDefinition[] = [
  // Festive Themes with variants
  {
    uniqueKey: "diwali_1",
    baseTheme: "diwali",
    variant: 1,
    displayName: "Diwali 1 (Shri Ram Darbar)",
    displayNameGu: "દિવાળી ૧ (શ્રી રામ દરબાર)",
    isFestive: true,
    bgImageSrc: "/themes/diwali_1.jpg",
    thumbSrc: "/themes/diwali_thumb.png",
  },
  {
    uniqueKey: "diwali_2",
    baseTheme: "diwali",
    variant: 2,
    displayName: "Diwali 2 (Deepotsav & Fireworks)",
    displayNameGu: "દિવાળી ૨ (દીપોત્સવ & ફટાકડા)",
    isFestive: true,
    bgImageSrc: "/themes/diwali_2.jpg",
    thumbSrc: "/themes/diwali_2_thumb.png",
  },
  {
    uniqueKey: "dhanteras_1",
    baseTheme: "dhanteras",
    variant: 1,
    displayName: "Dhanteras 1 (Maa Lakshmi)",
    displayNameGu: "ધનતેરસ ૧ (માં લક્ષ્મીજી)",
    isFestive: true,
    bgImageSrc: "/themes/dhanteras_1.jpg",
    thumbSrc: "/themes/dhanteras_thumb.png",
  },
  {
    uniqueKey: "dhanteras_2",
    baseTheme: "dhanteras",
    variant: 2,
    displayName: "Dhanteras 2 (Gold Coins & Kalash)",
    displayNameGu: "ધનતેરસ ૨ (સોનાના સિક્કા & કળશ)",
    isFestive: true,
    bgImageSrc: "/themes/dhanteras_2.jpg",
    thumbSrc: "/themes/dhanteras_2_thumb.png",
  },
  {
    uniqueKey: "navratri_1",
    baseTheme: "navratri",
    variant: 1,
    displayName: "Navaratri 1 (Garba & Dandiya)",
    displayNameGu: "નવરાત્રિ ૧ (ગરબા & દાંડિયા)",
    isFestive: true,
    bgImageSrc: "/themes/navaratri_1.jpg",
    thumbSrc: "/themes/navaratri_thumb.png",
  },
  {
    uniqueKey: "navratri_2",
    baseTheme: "navratri",
    variant: 2,
    displayName: "Navaratri 2 (Maa Ambe)",
    displayNameGu: "નવરાત્રિ ૨ (માં અંબે)",
    isFestive: true,
    bgImageSrc: "/themes/navaratri_2.jpg",
    thumbSrc: "/themes/navaratri_2_thumb.png",
  },
  {
    uniqueKey: "durga_puja_1",
    baseTheme: "durga_puja",
    variant: 1,
    displayName: "Durga Puja (Shubho Sharodiya)",
    displayNameGu: "દુર્ગા પૂજા (શુભો શારોદિયા)",
    isFestive: true,
    bgImageSrc: "/themes/durga_puja_1.jpg",
    thumbSrc: "/themes/durga_puja_thumb.png",
  },
  {
    uniqueKey: "durga_puja_2",
    baseTheme: "durga_puja",
    variant: 2,
    displayName: "Durga Puja 2",
    displayNameGu: "દુર્ગા પૂજા ૨",
    isFestive: true,
    bgImageSrc: "/themes/durga_puja_1.jpg",
    thumbSrc: "/themes/durga_puja_thumb.png",
  },
  {
    uniqueKey: "durga_puja",
    baseTheme: "durga_puja",
    variant: 1,
    displayName: "Durga Puja (Shubho Sharodiya)",
    displayNameGu: "દુર્ગા પૂજા (શુભો શારોદિયા)",
    isFestive: true,
    bgImageSrc: "/themes/durga_puja_1.jpg",
    thumbSrc: "/themes/durga_puja_thumb.png",
  },
  {
    uniqueKey: "dussehra_1",
    baseTheme: "dussehra",
    variant: 1,
    displayName: "Dussehra 1 (Vijayadashami)",
    displayNameGu: "દશેરા ૧ (વિજયાદશમી)",
    isFestive: true,
    bgImageSrc: "/themes/dussehra_1.jpg",
    thumbSrc: "/themes/dussehra_thumb.png",
  },
  {
    uniqueKey: "dussehra_2",
    baseTheme: "dussehra",
    variant: 2,
    displayName: "Dussehra 2",
    displayNameGu: "દશેરા ૨",
    isFestive: true,
    bgImageSrc: "/themes/dussehra_1.jpg",
    thumbSrc: "/themes/dussehra_thumb.png",
  },
  {
    uniqueKey: "dussehra",
    baseTheme: "dussehra",
    variant: 1,
    displayName: "Dussehra (Vijayadashami)",
    displayNameGu: "દશેરા (વિજયાદશમી)",
    isFestive: true,
    bgImageSrc: "/themes/dussehra_1.jpg",
    thumbSrc: "/themes/dussehra_thumb.png",
  },
  {
    uniqueKey: "uttarayan_1",
    baseTheme: "uttarayan",
    variant: 1,
    displayName: "Uttarayan 1 (Makar Sankranti)",
    displayNameGu: "ઉત્તરાયણ ૧ (મકરસંક્રાંતિ)",
    isFestive: true,
    bgImageSrc: "/themes/navaratri_1.jpg",
    thumbSrc: "/themes/navaratri_thumb.png",
  },
  {
    uniqueKey: "uttarayan_2",
    baseTheme: "uttarayan",
    variant: 2,
    displayName: "Uttarayan 2",
    displayNameGu: "ઉત્તરાયણ ૨",
    isFestive: true,
    bgImageSrc: "/themes/navaratri_1.jpg",
    thumbSrc: "/themes/navaratri_thumb.png",
  },
  {
    uniqueKey: "uttarayan",
    baseTheme: "uttarayan",
    variant: 1,
    displayName: "Uttarayan (Makar Sankranti)",
    displayNameGu: "ઉત્તરાયણ (મકરસંક્રાંતિ)",
    isFestive: true,
    bgImageSrc: "/themes/navaratri_1.jpg",
    thumbSrc: "/themes/navaratri_thumb.png",
  },
  {
    uniqueKey: "independence_1",
    baseTheme: "independence",
    variant: 1,
    displayName: "Independence Day 1",
    displayNameGu: "સ્વતંત્રતા દિવસ ૧",
    isFestive: true,
    bgImageSrc: "/themes/navaratri_1.jpg",
    thumbSrc: "/themes/navaratri_thumb.png",
  },
  {
    uniqueKey: "independence_2",
    baseTheme: "independence",
    variant: 2,
    displayName: "Independence Day 2",
    displayNameGu: "સ્વતંત્રતા દિવસ ૨",
    isFestive: true,
    bgImageSrc: "/themes/navaratri_1.jpg",
    thumbSrc: "/themes/navaratri_thumb.png",
  },
  {
    uniqueKey: "independence",
    baseTheme: "independence",
    variant: 1,
    displayName: "Independence Day",
    displayNameGu: "સ્વતંત્રતા દિવસ",
    isFestive: true,
    bgImageSrc: "/themes/navaratri_1.jpg",
    thumbSrc: "/themes/navaratri_thumb.png",
  },
  {
    uniqueKey: "ganesh_chaturthi_1",
    baseTheme: "ganesh_chaturthi",
    variant: 1,
    displayName: "Ganesh Chaturthi 1",
    displayNameGu: "ગણેશ ચતુર્થી ૧",
    isFestive: true,
    bgImageSrc: "/themes/navaratri_1.jpg",
    thumbSrc: "/themes/navaratri_thumb.png",
  },
  {
    uniqueKey: "ganesh_chaturthi_2",
    baseTheme: "ganesh_chaturthi",
    variant: 2,
    displayName: "Ganesh Chaturthi 2",
    displayNameGu: "ગણેશ ચતુર્થી ૨",
    isFestive: true,
    bgImageSrc: "/themes/navaratri_1.jpg",
    thumbSrc: "/themes/navaratri_thumb.png",
  },
  {
    uniqueKey: "ganesh_chaturthi",
    baseTheme: "ganesh_chaturthi",
    variant: 1,
    displayName: "Ganesh Chaturthi",
    displayNameGu: "ગણેશ ચતુર્થી",
    isFestive: true,
    bgImageSrc: "/themes/navaratri_1.jpg",
    thumbSrc: "/themes/navaratri_thumb.png",
  },
  {
    uniqueKey: "your_logo",
    baseTheme: "your_logo",
    variant: 1,
    displayName: "Your Logo",
    displayNameGu: "યોર લોગો (Brand Logo)",
    isFestive: true,
    bgImageSrc: undefined,
  },
  {
    uniqueKey: "your_logo_1",
    baseTheme: "your_logo",
    variant: 1,
    displayName: "Your Logo",
    displayNameGu: "યોર લોગો (Brand Logo)",
    isFestive: true,
    bgImageSrc: undefined,
  },
  // Standard Themes
  {
    uniqueKey: "luxury",
    baseTheme: "luxury",
    variant: 1,
    displayName: "Executive Luxury",
    displayNameGu: "એક્ઝિક્યુટિવ લક્ઝરી",
    isFestive: false,
  },
  {
    uniqueKey: "stylish",
    baseTheme: "stylish",
    variant: 1,
    displayName: "Stylish Brand",
    displayNameGu: "સ્ટાઇલિશ બ્રાન્ડ",
    isFestive: false,
  },
  {
    uniqueKey: "advanced_gst_tally",
    baseTheme: "advanced_gst_tally",
    variant: 1,
    displayName: "Advanced GST (Tally)",
    displayNameGu: "એડવાન્સ્ડ GST (ટેલી)",
    isFestive: false,
  },
  {
    uniqueKey: "tally",
    baseTheme: "advanced_gst_tally",
    variant: 1,
    displayName: "Advanced GST (Tally)",
    displayNameGu: "એડવાન્સ્ડ GST (ટેલી)",
    isFestive: false,
  },
  {
    uniqueKey: "advanced_gst",
    baseTheme: "advanced_gst",
    variant: 1,
    displayName: "Advanced GST",
    displayNameGu: "એડવાન્સ્ડ GST",
    isFestive: false,
  },
  {
    uniqueKey: "tallybook",
    baseTheme: "tallybook",
    variant: 1,
    displayName: "TallyBook",
    displayNameGu: "ટેલીબુક",
    isFestive: false,
  },
  {
    uniqueKey: "tallybook_lite",
    baseTheme: "tallybook_lite",
    variant: 1,
    displayName: "Billbook (A5)",
    displayNameGu: "બિલબુક (A5)",
    isFestive: false,
  },
  {
    uniqueKey: "advanced_compact",
    baseTheme: "advanced_compact",
    variant: 1,
    displayName: "Advanced GST (A5)",
    displayNameGu: "એડવાન્સ્ડ GST (A5)",
    isFestive: false,
  },
  {
    uniqueKey: "modern",
    baseTheme: "modern",
    variant: 1,
    displayName: "Modern Accent",
    displayNameGu: "મોડર્ન એક્સેન્ટ",
    isFestive: false,
  },
  {
    uniqueKey: "simple",
    baseTheme: "simple",
    variant: 1,
    displayName: "Classic Simple",
    displayNameGu: "ક્લાસિક સિમ્પલ",
    isFestive: false,
  },
  {
    uniqueKey: "billbook",
    baseTheme: "billbook",
    variant: 1,
    displayName: "Billbook Logo",
    displayNameGu: "બિલબુક લોગો",
    isFestive: false,
  },
  {
    uniqueKey: "custom",
    baseTheme: "custom",
    variant: 1,
    displayName: "Custom Theme",
    displayNameGu: "કસ્ટમ થીમ",
    isFestive: false,
  },
];

export function getBackendOrigin(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || "";
  if (envUrl.startsWith("http://") || envUrl.startsWith("https://")) {
    return envUrl.replace(/\/api\/v1\/?$/, "");
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:4000";
    }
    if (host.includes("myownbillbook.com")) {
      return "https://api.myownbillbook.com";
    }
  }
  return "";
}

export function resolveThemeAssetUrl(url?: string | null): string {
  if (!url) return "";
  const trimmed = String(url).trim();
  if (!trimmed) return "";

  // 1. Base64 Data URLs and Blob URLs are self-contained
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }

  const backendOrigin = getBackendOrigin();

  // 2. Handle absolute URLs (e.g. http://localhost:4000/... vs https://api.myownbillbook.com/...)
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    if (backendOrigin && !backendOrigin.includes("localhost") && trimmed.includes("localhost:4000")) {
      return trimmed.replace("http://localhost:4000", backendOrigin);
    }
    if (backendOrigin && backendOrigin.includes("localhost") && trimmed.includes("api.myownbillbook.com")) {
      return trimmed.replace("https://api.myownbillbook.com", backendOrigin);
    }
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    return trimmed;
  }

  // Ensure path starts with /
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  // 3. Built-in preset themes bundled statically in Next.js public/themes
  const isBuiltInPreset =
    path.startsWith("/themes/navaratri_") ||
    path.startsWith("/themes/diwali_") ||
    path.startsWith("/themes/durga_puja_") ||
    path.startsWith("/themes/dussehra_") ||
    path.startsWith("/themes/dhanteras_");

  // Dynamically uploaded themes (e.g. /themes/invoice_christmas_...) reside on the backend server
  if (!isBuiltInPreset && backendOrigin) {
    return `${backendOrigin}${path}`;
  }

  return path;
}

const dynamicThemesRegistry = new Map<string, ThemeDefinition>();

export function registerDynamicThemes(managedThemes: any[]) {
  if (!Array.isArray(managedThemes)) return;
  dynamicThemesRegistry.clear();

  for (const t of managedThemes) {
    if (!t || !t.id || t.isActive === false) continue;
    const baseId = String(t.id).toLowerCase().trim();
    const isFestive = t.category === "festive" || t.category === "branding";
    const rawVariants: string[] = Array.isArray(t.variants) && t.variants.length > 0 
      ? t.variants 
      : (t.thumbnail ? [t.thumbnail] : (isFestive ? ["/themes/navaratri_1.jpg"] : []));
    const variants = rawVariants.map((v) => resolveThemeAssetUrl(v)).filter(Boolean);
    const thumbUrl = resolveThemeAssetUrl(t.thumbnail) || variants[0] || (isFestive ? "/themes/navaratri_1.jpg" : undefined);

    const baseDef: ThemeDefinition = {
      uniqueKey: baseId,
      baseTheme: baseId,
      variant: 1,
      displayName: t.name || baseId,
      displayNameGu: t.festivalName || t.name || baseId,
      isFestive,
      bgImageSrc: variants[0] || thumbUrl,
      thumbSrc: thumbUrl,
      primaryColor: t.primaryColor,
      badge: t.badge,
      description: t.description,
    };
    dynamicThemesRegistry.set(baseId, baseDef);

    const def1: ThemeDefinition = {
      ...baseDef,
      uniqueKey: `${baseId}_1`,
      variant: 1,
      displayName: variants.length > 1 ? `${t.name || baseId} 1` : (t.name || baseId),
      displayNameGu: variants.length > 1 ? `${t.festivalName || t.name || baseId} ૧` : (t.festivalName || t.name || baseId),
    };
    dynamicThemesRegistry.set(`${baseId}_1`, def1);

    if (variants.length > 1) {
      const def2: ThemeDefinition = {
        ...baseDef,
        uniqueKey: `${baseId}_2`,
        variant: 2,
        displayName: `${t.name || baseId} 2`,
        displayNameGu: `${t.festivalName || t.name || baseId} ૨`,
        bgImageSrc: variants[1] || variants[0],
      };
      dynamicThemesRegistry.set(`${baseId}_2`, def2);
    }
  }
}

// Auto-hydrate cached dynamic themes on client
if (typeof window !== "undefined") {
  try {
    const cached = localStorage.getItem("billing_managed_themes");
    if (cached) {
      registerDynamicThemes(JSON.parse(cached));
    }
  } catch {}
}

export function resolveThemeDefinition(
  key?: string | null,
  fallbackVariant: number = 1
): ThemeDefinition {
  const raw = (key || "").toLowerCase().trim();
  if (!raw) return ALL_THEME_KEYS.find((t) => t.uniqueKey === "stylish")!;

  // 0. Check dynamic themes registry first
  if (dynamicThemesRegistry.has(raw)) {
    return dynamicThemesRegistry.get(raw)!;
  }

  // 1. Direct match on uniqueKey
  const direct = ALL_THEME_KEYS.find((t) => t.uniqueKey === raw);
  if (direct) {
    return direct;
  }

  // 2. Direct match on baseTheme with fallbackVariant
  const baseMatch = ALL_THEME_KEYS.find((t) => t.baseTheme === raw && t.variant === fallbackVariant)
    || ALL_THEME_KEYS.find((t) => t.baseTheme === raw);
  if (baseMatch) {
    return baseMatch;
  }

  // 3. Handle common aliases
  if (raw === "navaratri_2" || raw === "navratri_2") return ALL_THEME_KEYS.find((t) => t.uniqueKey === "navratri_2")!;
  if (raw === "navaratri_1" || raw === "navratri_1" || raw === "navaratri" || raw === "navratri") {
    return fallbackVariant === 2
      ? ALL_THEME_KEYS.find((t) => t.uniqueKey === "navratri_2")!
      : ALL_THEME_KEYS.find((t) => t.uniqueKey === "navratri_1")!;
  }
  if (raw === "diwali") {
    return fallbackVariant === 2
      ? ALL_THEME_KEYS.find((t) => t.uniqueKey === "diwali_2")!
      : ALL_THEME_KEYS.find((t) => t.uniqueKey === "diwali_1")!;
  }
  if (raw === "dhanteras") {
    return fallbackVariant === 2
      ? ALL_THEME_KEYS.find((t) => t.uniqueKey === "dhanteras_2")!
      : ALL_THEME_KEYS.find((t) => t.uniqueKey === "dhanteras_1")!;
  }
  if (raw === "logo" || raw === "logo_1" || raw === "your_logo_1" || raw === "your_logo") {
    return ALL_THEME_KEYS.find((t) => t.uniqueKey === "your_logo")!;
  }
  if (raw === "tally" || raw === "advanced_gst_tally") {
    return ALL_THEME_KEYS.find((t) => t.uniqueKey === "advanced_gst_tally")!;
  }
  if (raw === "gst" || raw === "advanced_gst") {
    return ALL_THEME_KEYS.find((t) => t.uniqueKey === "advanced_gst")!;
  }
  if (raw === "tallybook") {
    return ALL_THEME_KEYS.find((t) => t.uniqueKey === "tallybook")!;
  }
  if (raw === "tallybook_lite" || raw === "lite") {
    return ALL_THEME_KEYS.find((t) => t.uniqueKey === "tallybook_lite")!;
  }
  if (raw === "advanced_compact" || raw === "compact") {
    return ALL_THEME_KEYS.find((t) => t.uniqueKey === "advanced_compact")!;
  }
  if (raw === "custom") {
    return ALL_THEME_KEYS.find((t) => t.uniqueKey === "custom")!;
  }

  // 4. Suffix matching e.g. "durga_puja_1" or "durga_puja_2" or "2027_8079_1"
  const suffixMatch = raw.match(/^(.*)_(\d+)$/);
  if (suffixMatch) {
    const base = suffixMatch[1];
    const variantNum = parseInt(suffixMatch[2], 10);

    // Check dynamic registry for this base + variant
    if (dynamicThemesRegistry.has(`${base}_${variantNum}`)) {
      return dynamicThemesRegistry.get(`${base}_${variantNum}`)!;
    }
    if (dynamicThemesRegistry.has(base)) {
      const baseDef = dynamicThemesRegistry.get(base)!;
      return {
        ...baseDef,
        variant: variantNum,
        uniqueKey: raw,
        bgImageSrc: variantNum === 2 ? (baseDef.thumbSrc || baseDef.bgImageSrc) : baseDef.bgImageSrc,
      };
    }

    const found = ALL_THEME_KEYS.find((t) => (t.baseTheme === base || t.uniqueKey === base) && t.variant === variantNum)
      || ALL_THEME_KEYS.find((t) => t.baseTheme === base || t.uniqueKey === base);
    if (found) {
      return {
        ...found,
        variant: variantNum,
        uniqueKey: raw,
      };
    }
  }

  // 5. Dynamic fallback for any custom festive theme not yet registered
  const standardIds = ["stylish", "luxury", "tally", "gst", "modern", "simple", "billbook", "tallybook", "tallybook_lite", "advanced_compact"];
  if (raw && !standardIds.includes(raw)) {
    return {
      uniqueKey: raw,
      baseTheme: raw.replace(/_\d+$/, ""),
      variant: fallbackVariant,
      displayName: raw,
      displayNameGu: raw,
      isFestive: true,
      bgImageSrc: `/themes/${raw}.jpg`,
      thumbSrc: `/themes/${raw}_thumb.png`,
    };
  }

  // Fallback to stylish
  return ALL_THEME_KEYS.find((t) => t.uniqueKey === "stylish")!;
}
