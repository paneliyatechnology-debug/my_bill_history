import type { Metadata } from "next";
import { IntroductionPage } from "../../components/landing/introduction-page";

export const metadata: Metadata = {
  title: "MyOwn BillBook — Modern Indian GST Billing, Inventory & Accounting Software",
  description:
    "Run your business smarter. Bill faster. Grow bigger. Everything you need for GST billing, inventory, POS counter, purchases and accounting.",
  openGraph: {
    title: "MyOwn BillBook — Modern Indian GST Billing, Inventory & Accounting",
    description:
      "Run your business smarter. Bill faster. Grow bigger. Everything you need for GST billing, inventory, POS counter, purchases and accounting.",
    url: "https://www.myownbillbook.com",
    siteName: "MyOwn BillBook",
    locale: "en_IN",
    type: "website",
  },
};

export default function IntroRoute() {
  return <IntroductionPage />;
}
