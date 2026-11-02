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
          className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Go to E-Invoices
        </Link>
      </div>
    </GstFrame>
  );
}
