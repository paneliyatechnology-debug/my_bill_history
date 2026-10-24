import type { Metadata } from "next";
import { DM_Mono, Manrope, Playfair_Display } from "next/font/google";
import { MyownbillbookLanding } from "../../components/landing/rojmek-landing";

const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["500", "600", "700"],
  variable: "--font-playfair",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Myownbillbook — રોજમેળ",
  description:
    "Fast GST billing, inventory and ખાતાવહી for retailers, wholesalers, distributors and small manufacturers.",
  icons: { icon: "/Myownbillbook-mark.svg" },
};

export default function MyownbillbookPage() {
  return (
    <div className={`${playfair.variable} ${manrope.variable} ${dmMono.variable}`}>
      <MyownbillbookLanding />
    </div>
  );
}
