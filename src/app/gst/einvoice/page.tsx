"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GstFrame } from "../../../components/gst/gst-kit";

export default function EinvoicePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/sales/e-invoices");
  }, [router]);

  return (
    <GstFrame title="E-Invoices" notice="Redirecting to the official E-Invoice module...">
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 shadow-sm">
        <p className="text-slate-600 mb-4">Redirecting to statutory E-Invoices module...</p>
        <Link
          href="/sales/e-invoices"
          className="inline-flex items-center h-9 px-3 bg-[#1677E8] hover:bg-[#1268D3] text-white rounded-lg text-[13px] font-medium transition-colors"
        >
          Go to E-Invoices
        </Link>
      </div>
    </GstFrame>
  );
}
