"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "../../lib/api-client";
import { useAuth } from "../../context/auth-context";
import { GstFrame, Panel, useGstPeriod } from "../../components/gst/gst-kit";

export default function GstDashboardPage() {
  return (
    <GstFrame
      title="GST Dashboard"
      notice="Amounts are draft preparation figures from posted books. filingStatus NOT_FILED means this software has not received a portal acknowledgement."
    >
      <DashboardBody />
    </GstFrame>
  );
}

function DashboardBody() {
  const { tenantContext } = useAuth();
  const period = useGstPeriod();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenantContext.companyId) {
      setLoading(false);
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = { fromDate: period.fromDate, toDate: period.toDate, month: period.month, year: period.year };
      const [gstr1, gstr3b, summary, audit, documents, integration] = await Promise.all([
        apiClient.get<any>("/reports/gstr-1", params),
        apiClient.get<any>("/reports/gstr-3b", { fromDate: period.fromDate, toDate: period.toDate }),
        apiClient.get<any>("/gst/gstr-2b/summary", { returnPeriod: period.returnPeriod }).catch(() => ({ counts: {} })),
        apiClient.get<any>("/gst/audit"),
        apiClient.get<any[]>("/gst/documents", { fromDate: period.fromDate, toDate: period.toDate }),
        apiClient.get<any>("/gst/integration"),
      ]);
      setData({ gstr1, gstr3b, summary, audit, documents, integration });
    } catch (err: any) {
      setError(err.message || "The GST dashboard could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [tenantContext.companyId, period.fromDate, period.toDate, period.month, period.year, period.returnPeriod]);

  useEffect(() => {
    load();
  }, [load]);

  const itc = data?.gstr3b?.table4_eligibleItc;
  const counts = data?.summary?.counts || {};
  const documents = data?.documents || [];
  const irnCount = documents.filter((row: any) => row.eInvoice?.irn).length;
  const ewayCount = documents.filter((row: any) => row.eWayBill?.ewbNumber).length;
  const missingGstin = documents.filter((row: any) => !row.partyGstin && Number(row.taxableAmount) > 0).length;

  return (
      <Panel loading={loading} error={error} onRetry={load} empty={!tenantContext.companyId ? "Sign in and select a company. Figures stay empty until that company and period are loaded." : null}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <Card label="Sales taxable value" value={data?.gstr1?.totalTaxable} hint="GSTR-1 draft" />
          <Card label="Outward CGST / SGST / IGST / UTGST" value={`${data?.gstr1?.totalCgst} / ${data?.gstr1?.totalSgst} / ${data?.gstr1?.totalIgst} / ${data?.gstr1?.totalUtgst || "0.00"}`} />
          <Card label="Books ITC IGST / CGST / SGST" value={`${itc?.booksNetItc?.igst || "0.00"} / ${itc?.booksNetItc?.cgst || "0.00"} / ${itc?.booksNetItc?.sgst || "0.00"}`} hint="Not claimed" />
          <Card label="Accepted ITC total" value={itc?.reviewedAcceptedItc?.total || "0.00"} hint="Review flag only" />
          <Card label="Pending review ITC IGST" value={itc?.pendingReviewItc?.igst || "0.00"} />
          <Card label="Excluded ITC IGST" value={itc?.excludedItc?.igst || "0.00"} />
          <Card label="Estimated cash CGST / SGST / IGST" value={`${data?.gstr3b?.table6_1_paymentOfTax?.cgst || "0.00"} / ${data?.gstr3b?.table6_1_paymentOfTax?.sgst || "0.00"} / ${data?.gstr3b?.table6_1_paymentOfTax?.igst || "0.00"}`} hint="Draft estimate" />
          <Card label="GSTR-1 / GSTR-3B status" value={`${data?.gstr1?.filingStatus} / ${data?.gstr3b?.filingStatus}`} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {["MATCHED", "PARTIAL_MATCH", "MISSING_IN_BOOKS", "MISSING_IN_GSTR2B", "DUPLICATE", "MISMATCH"].map((status) => (
            <Link key={status} href="/gst/gstr-2b" className="bg-white border border-slate-200 rounded-xl p-3">
              <p className="text-xs text-slate-500">{status}</p>
              <p className="text-lg font-semibold">{counts[status] || 0}</p>
            </Link>
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm space-y-1">
          <p>E-invoice IRNs stored for this period: {irnCount}. E-way numbers stored: {ewayCount}.</p>
          <p>Documents without a recipient GSTIN: {missingGstin}. Provider status: {data?.integration?.credentialStatus}. Production: {data?.integration?.productionMode}.</p>
          <p>Next step: import GSTR-2B for {period.returnPeriod}, then review exceptions before reading the GSTR-3B draft.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="font-medium mb-2">Recent GST activity</h2>
          {(data?.audit?.rows || []).length === 0 ? (
            <p className="text-sm text-slate-500">No provider audit rows for this company.</p>
          ) : (
            <ul className="text-sm space-y-1">
              {data.audit.rows.slice(0, 8).map((row: any) => (
                <li key={row.id}>
                  {new Date(row.createdAt).toLocaleString()} · {row.operation} · {row.outcome}
                  {row.errorMessage ? ` · ${row.errorMessage}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>
  );
}

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm sm:text-base font-semibold break-words">{value || "0.00"}</p>
      {hint ? <p className="text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  );
}
