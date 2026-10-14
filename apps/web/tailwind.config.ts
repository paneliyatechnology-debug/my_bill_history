import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Bhagwa Saffron Primary Brand Tokens
        primary: {
          DEFAULT: "#F47721",
          hover: "#D95F12",
          pressed: "#B94B0A",
          light: "#FFF3E8",
          subtle: "#FFFAF5",
          50: "#FFFAF5",
          100: "#FFF3E8",
          200: "#FED7AA",
          300: "#FDBA74",
          400: "#FB923C",
          500: "#F47721",
          600: "#D95F12",
          700: "#B94B0A",
          800: "#9A3412",
          900: "#7C2D12",
        },
        saffron: {
          DEFAULT: "#F47721",
          hover: "#D95F12",
          pressed: "#B94B0A",
          light: "#FFF3E8",
          subtle: "#FFFAF5",
          50: "#FFFAF5",
          100: "#FFF3E8",
          200: "#FED7AA",
          300: "#FDBA74",
          400: "#FB923C",
          500: "#F47721",
          600: "#D95F12",
          700: "#B94B0A",
          800: "#9A3412",
          900: "#7C2D12",
        },
        // Surfaces & Backgrounds
        surface: {
          bg: "#F7F8FA",
          card: "#FFFFFF",
          sidebar: "#FFFFFF",
          muted: "#F3F4F6",
        },
        // Typography & Text
        content: {
          main: "#202124",
          secondary: "#667085",
          muted: "#98A2B3",
        },
        // Borders
        divider: "#E5E7EB",
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
        gujarati: [
          "var(--font-noto-gujarati)",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(16, 24, 40, 0.05)",
        card: "0 1px 3px 0 rgba(16, 24, 40, 0.08), 0 1px 2px 0 rgba(16, 24, 40, 0.04)",
        dropdown: "0 10px 15px -3px rgba(16, 24, 40, 0.1), 0 4px 6px -2px rgba(16, 24, 40, 0.05)",
        saffron: "0 4px 14px 0 rgba(244, 119, 33, 0.25)",
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
