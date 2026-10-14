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
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-gujarati",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "MyBill History — Modern Indian Billing & Accounting",
  description:
    "Fast, reliable Indian GST billing, inventory, POS, and accounting platform in English & Gujarati",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${notoSansGujarati.variable}`}>
      <body className="antialiased min-h-screen bg-[#F8F9FB] text-[#202124]">
        <PwaRegister />
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
