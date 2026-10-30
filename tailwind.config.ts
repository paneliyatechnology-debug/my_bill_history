import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: "380px",
      },
      colors: {
        // Forest Teal Signature Brand Palette
        primary: {
          DEFAULT: "#26A58A", // Jade Teal for primary action buttons & active states
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
          600: "#208E76",
          700: "#1B7864",
          800: "#165F50",
          900: "#124C40",
        },
        forest: {
          DEFAULT: "#174B43", // Forest Teal: Sidebar & main navigation
          hover: "#133E37",
          dark: "#0F322C",
          light: "#1F5E54",
          subtle: "#EBF2F0",
          50: "#F0F5F4",
          100: "#EBF2F0",
          500: "#174B43",
          600: "#133E37",
          700: "#0F322C",
        },
        jade: {
          DEFAULT: "#26A58A",
          hover: "#208E76",
          pressed: "#1B7864",
          light: "#E6F7F2",
          subtle: "#F2FAF7",
        },
        ivory: {
          DEFAULT: "#F6F7F1", // Soft Ivory: Main workspace background
          dark: "#ECEFE7",
          light: "#FAFBF7",
        },
        // Backward-compatibility token for existing saffron references
        saffron: {
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
          600: "#208E76",
          700: "#1B7864",
          800: "#165F50",
          900: "#124C40",
        },
        // Surfaces & Backgrounds
        surface: {
          bg: "#F6F7F1",
          card: "#FFFFFF",
          sidebar: "#174B43",
          muted: "#EEF1E8",
        },
        // Typography & Text
        content: {
          main: "#1A2E2B",
          secondary: "#5A6B66",
          muted: "#8E9F9A",
        },
        // Borders
        divider: "#E2E8E5",
        border: "#E2E8E5",
        muted: "#5A6B66",
        // Semantic Indicators
        status: {
          success: "#16834A",
          successBg: "#EAF7EF",
          warning: "#B45309",
          warningBg: "#FFF7E6",
          error: "#DC3545",
          errorBg: "#FFF0F0",
          info: "#2563EB",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "var(--font-noto-gujarati)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        editorial: [
          "var(--font-playfair)",
          "var(--font-noto-gujarati)",
          "Georgia",
          "serif",
        ],
        manrope: [
          "var(--font-manrope)",
          "var(--font-noto-gujarati)",
          "sans-serif",
        ],
        gujarati: [
          "var(--font-noto-gujarati)",
          "Shruti",
          "Nirmala UI",
          "Gujarati Sangam MN",
          "sans-serif",
        ],
        mono: [
          "var(--font-dm-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(23, 75, 67, 0.05)",
        card: "0 1px 3px 0 rgba(23, 75, 67, 0.06), 0 1px 2px 0 rgba(23, 75, 67, 0.03)",
        dropdown: "0 10px 15px -3px rgba(23, 75, 67, 0.1), 0 4px 6px -2px rgba(23, 75, 67, 0.05)",
        saffron: "0 4px 14px 0 rgba(38, 165, 138, 0.25)",
        jade: "0 4px 14px 0 rgba(38, 165, 138, 0.25)",
        forest: "0 4px 14px 0 rgba(23, 75, 67, 0.25)",
      },
      borderRadius: {
        button: "8px",
        card: "12px",
      },
    },
  },
  plugins: [],
};

export default config;
