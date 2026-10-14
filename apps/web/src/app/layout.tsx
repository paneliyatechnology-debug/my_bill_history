import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../context/auth-context";
import { AppShell } from "../components/layout/app-shell";
import { PwaRegister } from "../components/pwa-register";

export const metadata: Metadata = {
  title: "MyBill History — Your Invoice & History Companion",
  description:
    "Fast, offline-resilient Indian billing, accounting, and inventory platform in English & Gujarati",
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
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        <PwaRegister />
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
