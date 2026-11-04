// src/components/design-system/tokens.ts
/**
 * MyOwnBillBook Centralized Design System Tokens
 * Primary Blue, Success Green, Alert Orange & Modern Flat Aesthetic
 */
import { THEME } from "../../lib/theme";
export { THEME };

export const DS_COLORS = {
  // Brand Palette: Vibrant Blue
  primary: {
    DEFAULT: "#1677E8",
    hover: "#125CC0",
    pressed: "#0E4C9E",
    light: "#D6E8FF",
    subtle: "#EAF3FF",
    50: "#EAF3FF",
    100: "#D6E8FF",
    200: "#B9D6FF",
    300: "#8EBEFF",
    400: "#4C97F0",
    500: "#1677E8",
    600: "#125CC0",
    700: "#0E4C9E",
  },
  // Forest / Jade Teal retained for backwards compatibility
  forestTeal: {
    DEFAULT: "#0F172A",
    hover: "#1E293B",
    dark: "#020617",
    light: "#334155",
    subtle: "#F1F5F9",
    50: "#F0F5F4",
    100: "#F1F5F9",
  },
  jadeTeal: {
    DEFAULT: "#1677E8",
    hover: "#125CC0",
    pressed: "#0E4C9E",
    light: "#EAF3FF",
    subtle: "#F8FBFF",
    50: "#F8FBFF",
    100: "#EAF3FF",
    200: "#B9D6FF",
    300: "#8EBEFF",
    400: "#4C97F0",
    500: "#1677E8",
  },
  softIvory: {
    DEFAULT: "#F5F8FC",
    dark: "#E3EAF3",
    light: "#FFFFFF",
  },
  surface: {
    card: "#FFFFFF",
    bg: "#F5F8FC",
    sidebar: "#FFFFFF",
    subtle: "#F8FBFF",
    border: "#E3EAF3",
    borderStrong: "#D5E1EE",
  },
  text: {
    main: "#182230",
    secondary: "#64748B",
    muted: "#94A3B8",
  },
  status: {
    paid: {
      bg: "#EAF8EF",
      text: "#15803D",
      border: "#BBF7D0",
      dot: "#16A34A",
    },
    partiallyPaid: {
      bg: "#FFF5E5",
      text: "#B45309",
      border: "#FDE68A",
      dot: "#F59E0B",
    },
    unpaid: {
      bg: "#FEF0F0",
      text: "#DC2626",
      border: "#FECACA",
      dot: "#DC2626",
    },
    draft: {
      bg: "#F1F5F9",
      text: "#475569",
      border: "#E2E8F0",
      dot: "#94A3B8",
    },
    cancelled: {
      bg: "#F3F4F6",
      text: "#6B7280",
      border: "#E5E7EB",
      dot: "#9CA3AF",
    },
  },
} as const;

/**
 * Format Indian Rupee currency with standard Indian Numbering system (Lakhs & Crores)
 * Defensively cleans any pre-existing currency symbols to prevent double symbol bugs
 */
export function formatInr(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === "") return "₹ 0.00";
  let num: number;
  if (typeof val === "string") {
    const cleaned = val.replace(/[₹,\sINR]/gi, "");
    num = Number(cleaned) || 0;
  } else {
    num = Number(val) || 0;
  }
  return "₹ " + num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format Indian Rupee without decimals (compact for charts and dashboard cards)
 */
export function formatInrCompact(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === "") return "₹ 0";
  let num: number;
  if (typeof val === "string") {
    const cleaned = val.replace(/[₹,\sINR]/gi, "");
    num = Number(cleaned) || 0;
  } else {
    num = Number(val) || 0;
  }
  return "₹ " + num.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });
}

/**
 * Format Indian Rupee without symbol for input fields
 */
export function formatNumber(val: number | string | undefined | null): string {
  const num = Number(val) || 0;
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Indian Number to Words (INR) converter for Invoices & Vouchers
 */
export function numberToWordsINR(amount: number, lang: "en" | "gu" = "en"): string {
  if (amount === 0) return lang === "gu" ? "શૂન્ય રૂપિયા માત્ર" : "Zero Rupees Only";
  if (!amount || isNaN(amount)) return "";

  const absAmount = Math.abs(amount);
  const rupees = Math.floor(absAmount);
  const paise = Math.round((absAmount - rupees) * 100);

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
  ];

  function convertTwoDigits(n: number): string {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rem = n % 100;
    let res = "";
    if (hundred > 0) res += ones[hundred] + " Hundred";
    if (rem > 0) res += (res ? " " : "") + convertTwoDigits(rem);
    return res;
  }

  let words = "";
  let rem = rupees;

  const crore = Math.floor(rem / 10000000);
  rem %= 10000000;
  if (crore > 0) words += convertTwoDigits(crore) + " Crore ";

  const lakh = Math.floor(rem / 100000);
  rem %= 100000;
  if (lakh > 0) words += convertTwoDigits(lakh) + " Lakh ";

  const thousand = Math.floor(rem / 1000);
  rem %= 1000;
  if (thousand > 0) words += convertTwoDigits(thousand) + " Thousand ";

  if (rem > 0) words += convertThreeDigits(rem);

  words = words.trim() + " Rupees";

  if (paise > 0) {
    words += " and " + convertTwoDigits(paise) + " Paise";
  }

  words += " Only";

  if (lang === "gu") {
    // Return Gujarati translation banner
    return `${words} (રૂપિયા માત્ર)`;
  }

  return words;
}
