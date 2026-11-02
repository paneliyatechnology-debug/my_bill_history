"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function PurchaseOrderRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  useEffect(() => {
    if (id) {
      router.replace(`/purchases/orders?view=${encodeURIComponent(id)}`);
    } else {
      router.replace("/purchases/orders");
    }
  }, [id, router]);

  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
    </div>
  );
}

