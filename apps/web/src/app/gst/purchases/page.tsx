"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "../../../lib/api-client";
import { useAuth } from "../../../context/auth-context";
import { DataTable, GstFrame, Panel, useGstPeriod } from "../../../components/gst/gst-kit";

export default function PurchaseRegisterPage() {
  return (
    <GstFrame title="Purchase register" notice="Tax is the amount stored on the posted bill or return. A purchase tax amount is not eligible ITC until a GSTR-2B review accepts it.">
      <Body />
    </GstFrame>
  );
}

function Body() {
  const { tenantContext } = useAuth();
  const period = useGstPeriod();
  const [supplier, setSupplier] = useState("");
  const [kind, setKind] = useState("");
  const [itc, setItc] = useState("");
  const [data, setData] = useState<any>(null);
  const [recon, setRecon] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
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
      const [register, listed] = await Promise.all([
        apiClient.get<any>("/reports/purchase-register", { fromDate: period.fromDate, toDate: period.toDate }),
        apiClient.get<any>("/gst/gstr-2b/reconciliations", { returnPeriod: period.returnPeriod }).catch(() => ({ rows: [] })),
      ]);
      setData(register);
      setRecon(listed.rows || []);
    } catch (err: any) {
      setError(err.message || "Purchase register could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [tenantContext.companyId, period.fromDate, period.toDate, period.returnPeriod]);
  useEffect(() => {
    load();
  }, [load]);
  const items = (data?.items || []).filter((row: any) => {
    if (supplier && !`${row.supplierName} ${row.supplierGstin || ""}`.toLowerCase().includes(supplier.toLowerCase())) return false;
    if (kind && row.documentType !== kind) return false;
    if (itc && row.itcEligibility !== itc) return false;
    return true;
  });
  return (
    <Panel loading={loading} error={error} onRetry={load} empty={!tenantContext.companyId ? "Sign in and select a company to see the purchase register." : items.length === 0 ? "No posted purchase bills or returns in this period." : null}>
      <div className="flex flex-wrap gap-2">
        <input className="border rounded px-2 py-1 text-sm" placeholder="Supplier or GSTIN" value={supplier} onChange={(event) => setSupplier(event.target.value)} />
        <select className="border rounded px-2 py-1 text-sm" value={kind} onChange={(event) => setKind(event.target.value)}>
          <option value="">All documents</option>
          <option value="PURCHASE_INVOICE">Bills</option>
          <option value="PURCHASE_RETURN">Returns</option>
        </select>
        <select className="border rounded px-2 py-1 text-sm" value={itc} onChange={(event) => setItc(event.target.value)}>
          <option value="">All ITC labels</option>
          <option>INPUT</option>
          <option>INELIGIBLE</option>
          <option>BLOCKED</option>
          <option>RCM</option>
          <option>REVERSAL</option>
        </select>
      </div>
      <p className="text-sm text-slate-600">
        Taxable {data?.totals?.totalTaxable} · CGST {data?.totals?.totalCgst} · SGST {data?.totals?.totalSgst} · UTGST {data?.totals?.totalUtgst} · IGST {data?.totals?.totalIgst}
      </p>
      <DataTable
        columns={["Document", "Date", "Supplier", "GSTIN", "Taxable", "CGST", "SGST", "UTGST", "IGST", "ITC label"]}
        rows={items.map((row: any) => [row.vendorInvoiceNumber, row.invoiceDate, row.supplierName, row.supplierGstin || "—", row.taxableAmount, row.cgstAmount, row.sgstAmount, row.utgstAmount, row.igstAmount, `${row.documentType} · ${row.itcEligibility}`])}
        onRow={(index) => setSelected(items[index])}
      />
      {selected ? <Detail row={selected} recon={recon} /> : <p className="text-sm"><Link className="underline" href="/purchases">Open purchase bills</Link></p>}
    </Panel>
  );
}

function Detail({ row, recon }: { row: any; recon: any[] }) {
  const match = recon.find((item) => item.books?.documentNumber === row.vendorInvoiceNumber);
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm space-y-1">
      <p className="font-medium">{row.vendorInvoiceNumber}</p>
      <p>Cess {row.cessAmount || "0.00"} · Total {row.grandTotal} · ITC label {row.itcEligibility}. Claimed: no.</p>
      <p>
        {match
          ? `GSTR-2B status ${match.status}, review ${match.itcDecision}.`
          : "No GSTR-2B row is linked to this document number for the selected period."}
      </p>
      <Link className="underline" href="/gst/gstr-2b">Open reconciliation</Link>
    </div>
  );
}
