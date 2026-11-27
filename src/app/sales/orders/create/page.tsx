"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreateSalesOrderRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("category", "SALES_ORDER");
    router.replace(`/sales/invoices/new?${params.toString()}`);
  }, [router]);

  return (
    <div className="p-8 text-center text-sm text-slate-500">
      Loading Sales Order form...
    </div>
  );
}
