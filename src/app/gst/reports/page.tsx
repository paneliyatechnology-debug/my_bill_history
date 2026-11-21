"use client";

import React from "react";
import Link from "next/link";
import { GstFrame } from "../../../components/gst/gst-kit";
import {
  FileText,
  TrendingUp,
  Receipt,
  Scale,
  ShieldCheck,
  Truck,
  QrCode,
  ArrowRight,
  Download,
  BarChart3,
} from "lucide-react";

export default function GstReportsPage() {
  const REPORT_CARDS = [
    {
      id: "gstr1",
      title: "1. GSTR-1 Outward Supplies Summary",
      category: "Statutory Return",
      description: "Comprehensive outward supplies schedule: B2B, B2CL, B2CS, exports, credit/debit notes, and nil-rated summaries.",
      href: "/gst/gstr-1",
      icon: <TrendingUp className="w-4 h-4 text-emerald-600" />,
      tag: "Section 37",
    },
    {
      id: "gstr3b",
      title: "2. GSTR-3B Return Summary",
      category: "Monthly Return",
      description: "Table 3.1 outward liabilities, Table 4 eligible ITC, and Table 6.1 cash ledger set-off per statutory Rule 88A.",
      href: "/gst/gstr-3b",
      icon: <Scale className="w-4 h-4 text-purple-600" />,
      tag: "Rule 61(5)",
    },
    {
      id: "sales-summary",
      title: "3. Sales GST Summary",
      category: "Tax Register",
      description: "Aggregated outward supply register grouped by state, place of supply, and GST registration category.",
      href: "/gst/sales",
      icon: <FileText className="w-4 h-4 text-[#1677E8]" />,
      tag: "Sales",
    },
    {
      id: "purchase-summary",
      title: "4. Purchase GST Summary",
      category: "Tax Register",
      description: "Inward supply register categorized by vendor GSTIN, document type, and CGST/SGST/IGST breakdown.",
      href: "/gst/purchases",
      icon: <Receipt className="w-4 h-4 text-indigo-600" />,
      tag: "Purchases",
    },
    {
      id: "itc-report",
      title: "5. Input Tax Credit (ITC) Report",
      category: "ITC Audit",
      description: "Detailed breakdown of eligible ITC, Section 17(5) blocked credits, RCM inward taxes, and reversal schedules.",
      href: "/gst/purchases",
      icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
      tag: "Sec 16/17",
    },
    {
      id: "output-tax",
      title: "6. Output Tax Report",
      category: "Liability Schedule",
      description: "Invoice-by-invoice outward tax liability register across CGST, SGST, IGST, UTGST, and GST compensation cess.",
      href: "/gst/sales",
      icon: <BarChart3 className="w-4 h-4 text-blue-600" />,
      tag: "Output",
    },
    {
      id: "gst-liability",
      title: "7. GST Liability & Cash Ledger Report",
      category: "Settlement",
      description: "Net cash tax payable vs. electronic credit ledger utilization statement with penalty and interest calculations.",
      href: "/gst/gstr-3b",
      icon: <Scale className="w-4 h-4 text-rose-600" />,
      tag: "Cash Ledger",
    },
    {
      id: "gstr2b-recon",
      title: "8. GSTR-2B Reconciliation Report",
      category: "Reconciliation",
      description: "Purchase register vs. supplier portal filings matching report with accountant review decision audit trail.",
      href: "/gst/gstr-2b",
      icon: <ShieldCheck className="w-4 h-4 text-teal-600" />,
      tag: "Sec 16(2)(aa)",
    },
    {
      id: "hsn-summary",
      title: "9. HSN Summary Report",
      category: "Table 12",
      description: "Harmonized System of Nomenclature (HSN) & SAC code-wise quantity, taxable value, and tax rate summary.",
      href: "/gst/gstr-1",
      icon: <FileText className="w-4 h-4 text-slate-700" />,
      tag: "Table 12",
    },
    {
      id: "rate-wise",
      title: "10. Tax Rate-wise Summary",
      category: "Analytics",
      description: "Supplies distributed across 0%, 5%, 12%, 18%, and 28% GST rate slabs for both outward and inward documents.",
      href: "/gst/sales",
      icon: <BarChart3 className="w-4 h-4 text-amber-600" />,
      tag: "Rates",
    },
    {
      id: "transactions",
      title: "11. GST Transaction Details (Audit)",
      category: "Complete Audit",
      description: "Unified audit trail of all GST documents: invoices, credit notes, debit notes, IRNs, and E-Way Bills.",
      href: "/gst/sales",
      icon: <FileText className="w-4 h-4 text-slate-600" />,
      tag: "Audit Trail",
    },
    {
      id: "accounting-reports",
      title: "12. Double-Entry Accounting Hub",
      category: "General Ledger",
      description: "General ledger accounts, Day Book, Trial Balance, Profit & Loss, Balance Sheet, and TDS compliance statements.",
      href: "/reports",
      icon: <BarChart3 className="w-4 h-4 text-purple-600" />,
      tag: "Books",
    },
  ];

  return (
    <GstFrame
      title="GST Statutory Reports & Audit Statements"
      notice="All report figures are compiled in real-time from double-entry accounting registers and statutory GST returns."
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REPORT_CARDS.map((report) => (
            <Link
              key={report.title}
              href={report.href}
              className="bg-white border border-slate-200 hover:border-[#1677E8] rounded-2xl p-5 shadow-xs transition-all hover:shadow-sm flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 group-hover:bg-blue-50/50 transition-colors">
                      {report.icon}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        {report.category}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#1677E8] transition-colors">
                        {report.title}
                      </h3>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                    {report.tag}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mt-2">{report.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#1677E8]">
                <span>Open Statement</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </GstFrame>
  );
}
