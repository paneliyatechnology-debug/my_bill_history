import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter, Manrope } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "../context/auth-context";
import { AppShell } from "../components/layout/app-shell";
import { PwaRegister } from "../components/pwa-register";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
  metadataBase: new URL("https://myownbillbook.com"),
  title: {
    default: "MyOwn BillBook — GST Billing & Accounting Software",
    template: "%s | MyOwn BillBook",
  },
  description:
    "Fast, statutory Indian GST billing, inventory, POS counter, e-invoicing & accounting software in English & Gujarati. Start free trial today.",
  applicationName: "MyOwn BillBook",
  authors: [{ name: "Paneliya Technology", url: "https://myownbillbook.com" }],
  generator: "Next.js",
  keywords: [
    "GST Billing Software",
    "GST Invoicing Software India",
    "Accounting Software for Small Business",
    "Inventory Management Software",
    "E-Invoicing Software GST",
    "E-Way Bill Generation",
    "Vyapar Alternative",
    "MyBillBook Alternative",
    "Gujarati Billing Software",
    "Online Billing App India",
    "POS Billing Software",
    "Barcode Billing Software",
    "Double Entry Accounting",
    "Daybook Rojmel App",
    "Paneliya Technology",
  ],
  alternates: {
    canonical: "https://myownbillbook.com",
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png",
  },
  openGraph: {
    title: "MyOwn BillBook — GST Billing & Accounting Software",
    description:
      "Fast GST billing, POS counter, instant bill scanning, inventory and double-entry accounting in English and Gujarati.",
    type: "website",
    locale: "en_IN",
    siteName: "MyOwn BillBook",
    url: "https://myownbillbook.com",
    images: [
      {
        url: "https://myownbillbook.com/logo-full.png",
        width: 1200,
        height: 630,
        alt: "MyOwn BillBook — GST Billing & Accounting Software",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MyOwn BillBook — GST Billing & Accounting Software",
    description:
      "Fast GST billing, POS counter, instant bill scanning, inventory and double-entry accounting in English and Gujarati.",
    images: ["https://myownbillbook.com/logo-full.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "finance",
};

const structuredSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://myownbillbook.com/#website",
      "url": "https://myownbillbook.com",
      "name": "MyOwn BillBook",
      "description":
        "Enterprise-grade Indian GST billing, invoicing & double-entry accounting software.",
      "publisher": {
        "@id": "https://myownbillbook.com/#organization",
      },
      "inLanguage": ["en-IN", "gu-IN"],
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://myownbillbook.com/?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": "https://myownbillbook.com/#organization",
      "name": "Paneliya Technology",
      "url": "https://myownbillbook.com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://myownbillbook.com/logo-full.png",
        "width": 512,
        "height": 512,
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+91-82388-78965",
        "contactType": "customer service",
        "availableLanguage": ["English", "Gujarati", "Hindi"],
        "areaServed": "IN",
      },
      "sameAs": [
        "https://www.facebook.com/myownbillbook",
        "https://twitter.com/myownbillbook",
        "https://www.linkedin.com/company/myownbillbook",
        "https://www.instagram.com/myownbillbook",
        "https://www.youtube.com/@myownbillbook",
      ],
    },
    {
      "@type": "LocalBusiness",
      "@id": "https://myownbillbook.com/#localbusiness",
      "name": "MyOwn BillBook - GST Billing & Accounting Software",
      "image": "https://myownbillbook.com/logo-full.png",
      "url": "https://myownbillbook.com",
      "telephone": "+91-82388-78965",
      "priceRange": "₹399 - ₹2499",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Ahmedabad",
        "addressRegion": "Gujarat",
        "addressCountry": "IN",
      },
      "openingHoursSpecification": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ],
        "opens": "09:00",
        "closes": "20:00",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://myownbillbook.com/#software",
      "name": "MyOwn BillBook",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web, Windows, Android, iOS, Cloud",
      "offers": {
        "@type": "AggregateOffer",
        "priceCurrency": "INR",
        "lowPrice": "399",
        "highPrice": "2499",
        "offerCount": "4",
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "reviewCount": "1280",
        "bestRating": "5",
        "worstRating": "1",
      },
      "featureList": [
        "Statutory Indian GST Invoicing (B2B, B2C, SEZ)",
        "Automated E-Invoicing & E-Way Bill Generation",
        "Multi-Godown Inventory & Stock Transfers",
        "Barcode POS Billing Counter",
        "Double-Entry Accounting & Rojmel (Daybook)",
        "Automated WhatsApp Payment Reminders",
        "Bilingual English & Gujarati Interface",
      ],
      "author": {
        "@id": "https://myownbillbook.com/#organization",
      },
      "description":
        "Fast, statutory Indian GST billing, multi-godown inventory, POS billing, and double-entry accounting software.",
    },
  ],
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
        <link rel="canonical" href="https://myownbillbook.com/" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredSchema) }}
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
