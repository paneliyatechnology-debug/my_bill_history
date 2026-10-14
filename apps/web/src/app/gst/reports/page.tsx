"use client";

import React from "react";
import Link from "next/link";
import { GstFrame } from "../../../components/gst/gst-kit";

const LINKS = [
  { href: "/gst/gstr-1", title: "GSTR-1 draft", text: "Review B2B, B2C, notes, nil supplies and HSN, then download the draft JSON." },
  { href: "/gst/gstr-3b", title: "GSTR-3B draft", text: "Read outward tax, ITC split and the cash estimate. Nothing is filed from here." },
  { href: "/gst/purchases", title: "Purchase register", text: "Posted bills and returns with the tax stored on those documents." },
  { href: "/gst/gstr-2b", title: "GSTR-2B export", text: "Export the reconciliation CSV after import." },
  { href: "/reports", title: "Reports center", text: "The existing accounting reports, including the same GSTR endpoints." },
];

export default function GstReportsPage() {
  return (
    <GstFrame title="GST reports" notice="These links open the live draft screens. None of them mark a return as filed.">
      <div className="grid gap-3">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="font-medium">{link.title}</p>
            <p className="text-sm text-slate-600">{link.text}</p>
          </Link>
        ))}
      </div>
    </GstFrame>
  );
}
