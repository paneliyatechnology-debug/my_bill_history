import { redirect } from "next/navigation";

export default function QuotationDetailsRedirect({ params }: { params: { id: string } }) {
  redirect(`/sales/invoices/${params.id}`);
}
