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
        brand: {
          50: "#fff9f2",
          100: "#ffeed9",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#ff9933",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
          950: "#431407",
        },
        saffron: {
          50: "#fff9f2",
          100: "#ffeed9",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#ff9933",
          600: "#e67e17",
          700: "#c7650c",
          800: "#994d00",
          900: "#733a00",
        },
      },
    },
  },
  plugins: [],
};

export default config;
