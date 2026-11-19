import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter, Manrope } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "../context/auth-context";
import { AppShell } from "../components/layout/app-shell";
import { PwaRegister } from "../components/pwa-register";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-manrope",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

const notoSansGujarati = localFont({
  src: [
    {
      path: "../fonts/noto-sans-gujarati-gujarati-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../fonts/noto-sans-gujarati-latin-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-noto-gujarati",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "MyOwn BillBook — Modern Indian GST Billing, Invoicing & ERP Software",
  description:
    "Fast, reliable Indian GST billing, inventory, POS, and accounting platform in English & Gujarati. Run your business smarter.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png",
  },
  openGraph: {
    title: "MyOwn BillBook — Modern Indian GST Billing & Accounting ERP",
    description:
      "Fast GST billing, POS counter, instant bill scanning, inventory and double-entry accounting in English and Gujarati.",
    type: "website",
    locale: "en_IN",
    siteName: "MyOwn BillBook",
    url: "https://www.myownbillbook.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "MyOwn BillBook — Modern Indian GST Billing & Accounting ERP",
    description:
      "Fast GST billing, POS counter, instant bill scanning, inventory and double-entry accounting in English and Gujarati.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "MyOwn BillBook",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Windows, Android, iOS",
  offers: {
    "@type": "Offer",
    price: "399",
    priceCurrency: "INR",
  },
  author: {
    "@type": "Organization",
    name: "Paneliya Technology",
    url: "https://www.myownbillbook.com",
  },
  description:
    "Enterprise-grade Indian GST billing, inventory management, barcode POS counter, and double-entry accounting software.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${manrope.variable} ${ibmPlexMono.variable} ${notoSansGujarati.variable} scroll-smooth`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased min-h-screen bg-[#F7F9FC] text-[#172033]">
        <PwaRegister />
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
