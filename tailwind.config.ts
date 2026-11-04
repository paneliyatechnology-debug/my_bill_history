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
        // Centralized Primary Blue Palette
        primary: {
          DEFAULT: "#1677E8",
          hover: "#1268D3",
          pressed: "#0D5FC4",
          light: "#D6E8FF",
          subtle: "#EAF3FF",
          50: "#EAF3FF",
          100: "#D6E8FF",
          200: "#B9D6FF",
          300: "#8EBEFF",
          400: "#4C97F0",
          500: "#1677E8",
          600: "#1268D3",
          700: "#0D5FC4",
          800: "#1E40AF",
          900: "#1E3A8A",
        },
        forest: {
          DEFAULT: "#0F172A", // Dark Slate
          hover: "#1E293B",
          dark: "#020617",
          light: "#334155",
          subtle: "#F1F5F9",
          50: "#F8FAFC",
          100: "#F1F5F9",
          500: "#1677E8",
          600: "#1268D3",
          700: "#0D5FC4",
        },
        jade: {
          DEFAULT: "#1677E8",
          hover: "#1268D3",
          pressed: "#0D5FC4",
          light: "#D6E8FF",
          subtle: "#EAF3FF",
        },
        ivory: {
          DEFAULT: "#F5F8FC",
          dark: "#E3EAF3",
          light: "#FFFFFF",
        },
        // Backward-compatibility token for existing saffron references
        saffron: {
          DEFAULT: "#1677E8",
          hover: "#1268D3",
          pressed: "#0D5FC4",
          light: "#D6E8FF",
          subtle: "#EAF3FF",
          50: "#EAF3FF",
          100: "#D6E8FF",
          200: "#B9D6FF",
          300: "#8EBEFF",
          400: "#4C97F0",
          500: "#1677E8",
          600: "#1268D3",
          700: "#0D5FC4",
          800: "#0D5FC4",
          900: "#0B3A78",
        },
        surface: {
          bg: "#F5F8FC",
          card: "#FFFFFF",
          sidebar: "#FFFFFF",
          muted: "#F8FBFF",
        },
        content: {
          main: "#182230",
          secondary: "#64748B",
          muted: "#94A3B8",
        },
        divider: "#E3EAF3",
        border: "#E3EAF3",
        muted: "#64748B",
        status: {
          success: "#16A34A",
          successBg: "#EAF8EF",
          warning: "#F59E0B",
          warningBg: "#FFF5E5",
          error: "#DC2626",
          errorBg: "#FEF0F0",
          info: "#1677E8",
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
          "var(--font-inter)",
          "var(--font-noto-gujarati)",
          "sans-serif",
        ],
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        card: "0 1px 2px 0 rgba(24, 34, 48, 0.04), 0 1px 3px 0 rgba(24, 34, 48, 0.04)",
        dropdown: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        saffron: "0 4px 14px 0 rgba(30, 107, 255, 0.25)",
        jade: "0 4px 14px 0 rgba(30, 107, 255, 0.25)",
        forest: "0 4px 14px 0 rgba(15, 23, 42, 0.25)",
      },
      borderRadius: {
        button: "8px",
        card: "12px",
        control: "10px",
      },
    },
  },
  plugins: [],
};

export default config;
