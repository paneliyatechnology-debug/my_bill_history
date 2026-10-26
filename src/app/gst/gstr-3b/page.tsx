"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../../lib/api-client";
import { useAuth } from "../../../context/auth-context";
import { GstFrame, Panel, downloadJson, useGstPeriod } from "../../../components/gst/gst-kit";
import { ExportDropdown } from "../../../components/ui/export-dropdown";
import { ExportColumn, ExportFormat, ExportMetadata } from "../../../lib/export/export-types";
import { executeExport } from "../../../lib/export/export-engine";

export default function Gstr3bPage() {
  return (
    <GstFrame title="GSTR-3B preparation" notice="This draft does not post a voucher and does not file GSTR-3B. Table 6 uses only ITC marked ACCEPTED.">
      <Body />
    </GstFrame>
  );
}

function Body() {
  const { tenantContext, currentCompany } = useAuth();
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
      setData(await apiClient.get<any>("/reports/gstr-3b", { fromDate: period.fromDate, toDate: period.toDate }));
    } catch (err: any) {
      setError(err.message || "GSTR-3B could not be prepared.");
    } finally {
      setLoading(false);
    }
  }, [tenantContext.companyId, period.fromDate, period.toDate]);
  useEffect(() => {
    load();
  }, [load]);
  const itc = data?.table4_eligibleItc;
  const pay = data?.table6_1_paymentOfTax;
  const use = data?.table6_itcUtilization;
  const handleExportGstr3b = async (format: ExportFormat) => {
    if (!data) return;
    const rows = [
      { section: "3.1 (a) Outward Taxable Supplies", ...data.table3_1_outwardSupplies },
      { section: "3.1 (b) Zero-rated Outward Supplies", ...data.table3_1_zeroRated },
      { section: "3.1 (c) Other Outward Supplies (Nil/Exempt)", ...data.table3_1_nilRated },
      { section: "3.1 (d) Inward Supplies (Reverse Charge)", ...data.table3_1_inwardReverseCharge },
      { section: "3.1 (e) Non-GST Outward Supplies", ...data.table3_1_nonGst },
      { section: "4 (A) Eligible ITC - All Other ITC", ...data.table4_eligibleItc?.allOtherItc },
      { section: "4 (C) Net ITC Available", ...data.table4_eligibleItc?.netItcAvailable },
    ];
    const columns: ExportColumn[] = [
      { header: "Schedule / Nature of Supply", key: "section", type: "string" },
      { header: "Taxable Value (₹)", key: "taxableAmount", type: "currency", align: "right" },
      { header: "IGST (₹)", key: "igst", type: "currency", align: "right" },
      { header: "CGST (₹)", key: "cgst", type: "currency", align: "right" },
      { header: "SGST (₹)", key: "sgst", type: "currency", align: "right" },
      { header: "Cess (₹)", key: "cess", type: "currency", align: "right" },
    ];
    const metadata: ExportMetadata = {
      title: "GSTR-3B Monthly Statutory Self-Assessment",
      fileName: `GSTR_3B_${period.returnPeriod}`,
      filterDescription: `Return Period: ${period.returnPeriod} (${period.fromDate} to ${period.toDate})`,
      companyName: currentCompany?.legalName || currentCompany?.tradeName || "My Business",
      companyGstin: currentCompany?.gstin,
    };
    await executeExport(format, columns, rows, metadata);
  };

  return (
    <Panel loading={loading} error={error} onRetry={load} empty={!tenantContext.companyId ? "Sign in and select a company before preparing GSTR-3B." : null}>
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <button type="button" className="text-xs font-semibold underline text-slate-600 hover:text-slate-900" onClick={() => downloadJson(`gstr-3b-${period.returnPeriod}-draft.json`, data)}>
          Download draft JSON
        </button>
        <ExportDropdown
          onExport={handleExportGstr3b}
          disabled={!data || loading}
          themeColor="saffron"
        />
      </div>
      <Section title="Outward supplies" rows={bucketRows(data?.table3_1_outwardSupplies)} />
      <Section title="Nil-rated" rows={bucketRows(data?.table3_1_nilRated)} />
      <Section title="Exempt" rows={bucketRows(data?.table3_1_exempt)} />
      <Section title="Non-GST" rows={bucketRows(data?.table3_1_nonGst)} />
      <Section title="Outward reverse charge" rows={bucketRows(data?.table3_1_reverseChargeOutward)} />
      <Section title="Inward reverse charge" rows={bucketRows(data?.table3_1_inwardReverseCharge)} />
      <Section title="Books net ITC" rows={moneyRows(itc?.booksNetItc)} />
      <Section title="Accepted ITC" rows={moneyRows(itc?.reviewedAcceptedItc)} />
      <Section title="Pending review ITC" rows={moneyRows(itc?.pendingReviewItc)} />
      <Section title="Excluded ITC" rows={moneyRows(itc?.excludedItc)} />
      <Section title="Estimated cash payable" rows={moneyRows(pay)} />
      <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm space-y-2">
        <h2 className="font-medium">Credit utilization</h2>
        <p>{data?.claimPolicy}</p>
        <p>IGST allocation required: {String(use?.igstCreditAllocationRequired ?? false)}. Remaining IGST credit {use?.remainingIgstCredit || "0.00"}.</p>
        <p>Ledger tie-out: {data?.ledgerTieOut ? JSON.stringify(data.ledgerTieOut) : "No ledger comparison was returned."}</p>
        <ul className="list-disc pl-5">
          {(data?.statutoryAssumptions || []).map((item: string) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

function bucketRows(bucket: any) {
  if (!bucket) return [];
  return Object.entries(bucket).map(([key, value]) => [key, String(value)]);
}

function moneyRows(bucket: any) {
  if (!bucket) return [];
  return Object.entries(bucket).map(([key, value]) => [key, String(value)]);
}

function Section({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <h2 className="font-medium mb-2">{title}</h2>
      {rows.length === 0 ? <p className="text-sm text-slate-500">No amount in this section.</p> : (
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          {rows.map(([key, value]) => (
            <div key={key}>
              <dt className="text-xs text-slate-500">{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
