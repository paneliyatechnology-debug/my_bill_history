import { redirect } from "next/navigation";

export default async function QuotationDetailsRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id || id === "undefined") {
    redirect("/sales/quotations");
  }
  redirect(`/sales/invoices/${id}`);
}
