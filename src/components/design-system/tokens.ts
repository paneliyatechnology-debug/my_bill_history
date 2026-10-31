// src/components/design-system/tokens.ts
/**
 * MyOwnBillBook Centralized Design System Tokens
 * Signature Forest Teal & Jade Teal Enterprise Palette
 */

export const DS_COLORS = {
  // Brand Palette
  forestTeal: {
    DEFAULT: "#174B43",
    hover: "#133E37",
    dark: "#0F322C",
    light: "#1F5E54",
    subtle: "#EBF2F0",
    50: "#F0F5F4",
    100: "#EBF2F0",
  },
  jadeTeal: {
    DEFAULT: "#26A58A",
    hover: "#208E76",
    pressed: "#1B7864",
    light: "#E6F7F2",
    subtle: "#F2FAF7",
    50: "#F2FAF7",
    100: "#E6F7F2",
    200: "#BCEADF",
    300: "#85D5C2",
    400: "#4EBFA5",
    500: "#26A58A",
  },
  softIvory: {
    DEFAULT: "#F6F7F1",
    dark: "#ECEEE5",
    light: "#FAFBF7",
  },
  surface: {
    card: "#FFFFFF",
    bg: "#F6F7F1",
    sidebar: "#174B43",
    subtle: "#F8FAF9",
    border: "#E2E8E5",
    borderStrong: "#CBD5E1",
  },
  text: {
    main: "#1A2E2B",
    secondary: "#5A6B66",
    muted: "#8E9F9A",
  },
  status: {
    paid: {
      bg: "#EAF7EF",
      text: "#16834A",
      border: "#A7F3D0",
      dot: "#10B981",
    },
    partiallyPaid: {
      bg: "#FFFBEB",
      text: "#B45309",
      border: "#FDE68A",
      dot: "#F59E0B",
    },
    unpaid: {
      bg: "#FFF0F0",
      text: "#DC3545",
      border: "#FECDD3",
      dot: "#EF4444",
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
 */
export function formatInr(val: number | string | undefined | null): string {
  const num = Number(val) || 0;
  return "₹ " + num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
