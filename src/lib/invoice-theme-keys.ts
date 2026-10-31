export interface ThemeDefinition {
  uniqueKey: string;
  baseTheme: string;
  variant: number;
  displayName: string;
  displayNameGu: string;
  isFestive: boolean;
  bgImageSrc?: string;
  thumbSrc?: string;
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
];

export function resolveThemeDefinition(
  key?: string | null,
  fallbackVariant: number = 1
): ThemeDefinition {
  const raw = (key || "").toLowerCase().trim();

  // 1. Direct match on uniqueKey
  const direct = ALL_THEME_KEYS.find((t) => t.uniqueKey === raw);
  if (direct) {
    return direct;
  }

  // 2. Handle aliases like "navaratri_1", "navaratri_2"
  if (raw === "navaratri_2") return ALL_THEME_KEYS.find((t) => t.uniqueKey === "navratri_2")!;
  if (raw === "navaratri_1") return ALL_THEME_KEYS.find((t) => t.uniqueKey === "navratri_1")!;

  // 3. Handle base themes with fallbackVariant
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
  if (raw === "navratri" || raw === "navaratri") {
    return fallbackVariant === 2
      ? ALL_THEME_KEYS.find((t) => t.uniqueKey === "navratri_2")!
      : ALL_THEME_KEYS.find((t) => t.uniqueKey === "navratri_1")!;
  }

  if (raw === "logo") return ALL_THEME_KEYS.find((t) => t.uniqueKey === "your_logo")!;
  if (raw === "advanced_gst_tally" || raw === "tally" || raw === "gst" || raw === "tallybook" || raw === "advanced_gst") {
    return ALL_THEME_KEYS.find((t) => t.uniqueKey === "advanced_gst_tally") || ALL_THEME_KEYS.find((t) => t.uniqueKey === "tally")!;
  }

  // Fallback to stylish
  return ALL_THEME_KEYS.find((t) => t.uniqueKey === "stylish")!;
}
