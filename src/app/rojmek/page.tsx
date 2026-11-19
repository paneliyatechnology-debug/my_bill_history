import type { Metadata } from "next";
import { MyownbillbookLanding } from "../../components/landing/myownbillbook-landing";

export const metadata: Metadata = {
  title: "MyOwn BillBook — Modern Indian GST Billing, POS & Accounting ERP",
  description:
    "Fast GST billing, POS counter, inventory management and double-entry accounting for retailers, wholesalers, and distributors.",
  icons: { icon: "/favicon.ico" },
};

export default function MyownbillbookPage() {
  return <MyownbillbookLanding />;
}
