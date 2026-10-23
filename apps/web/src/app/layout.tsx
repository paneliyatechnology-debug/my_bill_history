import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Gujarati } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../context/auth-context";
import { AppShell } from "../components/layout/app-shell";
import { PwaRegister } from "../components/pwa-register";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansGujarati = Noto_Sans_Gujarati({
  subsets: ["gujarati"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-noto-gujarati",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "MyBill History — Modern Indian GST Billing, Invoicing & ERP Software",
  description:
    "Fast, reliable Indian GST billing, inventory, POS, and accounting platform in English & Gujarati",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png",
  },
  openGraph: {
    title: "MyBill History — Modern Indian GST Billing & Accounting ERP",
    description:
      "Fast GST billing, POS counter, Gemini AI bill scanning, inventory and double-entry accounting in English and Gujarati.",
    type: "website",
    locale: "en_IN",
    siteName: "MyBill History",
  },
  twitter: {
    card: "summary_large_image",
    title: "MyBill History — Modern Indian GST Billing & Accounting ERP",
    description:
      "Fast GST billing, POS counter, Gemini AI bill scanning, inventory and double-entry accounting in English and Gujarati.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} ${notoSansGujarati.variable} scroll-smooth`}>
      <body className="antialiased min-h-screen bg-[#F8F9FB] text-[#202124]">
        <PwaRegister />
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
