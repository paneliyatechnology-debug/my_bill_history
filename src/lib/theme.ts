/**
 * Centralized Theme & Design Tokens for MyOwn BillBook
 * Primary Blue #1677E8 · Page #F5F8FC · Border #E3EAF3
 */

export const THEME = {
  colors: {
    primary: {
      DEFAULT: "#1677E8",
      hover: "#1268D3",
      active: "#0D5FC4",
      subtle: "#EAF3FF",
      light: "#D6E8FF",
      50: "#EAF3FF",
      100: "#D6E8FF",
      200: "#B9D6FF",
      500: "#1677E8",
      600: "#1268D3",
      700: "#0D5FC4",
    },
    success: {
      DEFAULT: "#16A34A",
      hover: "#15803D",
      bg: "#EAF8EF",
      subtle: "#F4FBF6",
      border: "#BBF7D0",
      text: "#15803D",
      dot: "#16A34A",
    },
    warning: {
      DEFAULT: "#F59E0B",
      hover: "#D97706",
      bg: "#FFF5E5",
      subtle: "#FFFBF3",
      border: "#FDE68A",
      text: "#B45309",
      dot: "#F59E0B",
    },
    danger: {
      DEFAULT: "#DC2626",
      hover: "#B91C1C",
      bg: "#FEF0F0",
      subtle: "#FFF8F8",
      border: "#FECACA",
      text: "#DC2626",
    },
    // Purple / Lavender
    purple: {
      DEFAULT: "#7C3AED",
      hover: "#6D28D9",
      bg: "#EDE9FE",
      subtle: "#F5F3FF",
      border: "#DDD6FE",
      text: "#6D28D9",
    },
    // Sky / Cyan
    sky: {
      DEFAULT: "#0284C7",
      hover: "#0369A1",
      bg: "#E0F2FE",
      subtle: "#F0F9FF",
      border: "#BAE6FD",
      text: "#0284C7",
    },
    // Surfaces & Backgrounds
    surface: {
      canvas: "#F5F8FC",
      card: "#FFFFFF",
      sidebar: "#FFFFFF",
      header: "#FFFFFF",
      muted: "#F8FBFF",
      border: "#E3EAF3",
      borderLight: "#EEF3F9",
    },
    text: {
      heading: "#182230",
      body: "#182230",
      secondary: "#64748B",
      muted: "#64748B",
      subtle: "#94A3B8",
      white: "#FFFFFF",
    },
  },
  typography: {
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  shadows: {
    card: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)",
    cardHover: "0 8px 20px -4px rgba(30, 107, 255, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.03)",
  },
  radius: {
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.25rem",
    full: "9999px",
  },
} as const;

export type ThemeColors = typeof THEME.colors;

