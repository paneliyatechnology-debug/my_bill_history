import type { Metadata } from "next";
import { MyownbillbookLanding } from "../../components/landing/myownbillbook-landing";

export const metadata: Metadata = {
  title: "GST Billing & Accounting | MyOwn BillBook",
  description:
    "Fast GST billing, POS counter, inventory management and double-entry accounting for retailers, wholesalers, and distributors.",
  alternates: {
    canonical: "https://myownbillbook.com/rojmek",
  },
  icons: { icon: "/favicon.ico" },
};

export default function MyownbillbookPage() {
  return <MyownbillbookLanding />;
}
