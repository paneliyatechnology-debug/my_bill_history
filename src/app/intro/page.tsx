import type { Metadata } from "next";
import { IntroductionPage } from "../../components/landing/introduction-page";

export const metadata: Metadata = {
  title: "Features & Tour | MyOwn BillBook",
  description:
    "Explore GST billing, multi-godown inventory, POS counter, e-invoicing and accounting features built for Indian SMEs.",
  alternates: {
    canonical: "https://myownbillbook.com/intro",
  },
  openGraph: {
    title: "Features & Tour | MyOwn BillBook",
    description:
      "Explore GST billing, multi-godown inventory, POS counter, e-invoicing and accounting features built for Indian SMEs.",
    url: "https://myownbillbook.com/intro",
    siteName: "MyOwn BillBook",
    locale: "en_IN",
    type: "website",
  },
};

export default function IntroRoute() {
  return <IntroductionPage />;
}
