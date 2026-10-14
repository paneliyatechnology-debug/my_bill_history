"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "../../../lib/api-client";
import { useAuth } from "../../../context/auth-context";
import { DataTable, GstFrame, Panel, useCanWriteGst, useGstPeriod } from "../../../components/gst/gst-kit";

export default function EinvoicePage() {
  return (
    <GstFrame title="E-Invoice / IRN" notice="An IRN appears only after the provider returns one. A failed or blocked request is not an IRN.">
      <Body />
    </GstFrame>
  );
}

function Body() {
  const { tenantContext } = useAuth();
  const period = useGstPeriod();
  const canWrite = useCanWriteGst();
  const [rows, setRows] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!tenantContext.companyId) {
      setLoading(false);
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [documents, integration] = await Promise.all([
        apiClient.get<any[]>("/gst/documents", { fromDate: period.fromDate, toDate: period.toDate }),
        apiClient.get<any>("/gst/integration"),
      ]);
      setRows(documents.filter((row) => row.status !== "DRAFT" && row.status !== "CANCELLED"));
      setConfig(integration);
    } catch (err: any) {
      setError(err.message || "E-invoice documents could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [tenantContext.companyId, period.fromDate, period.toDate]);
  useEffect(() => {
    load();
  }, [load]);

  const generate = async () => {
    if (!selected) return;
    setMessage(null);
    try {
      const result = await apiClient.post<any>(`/gst/einvoice/${selected.id}/generate`, undefined, undefined, `ui-einvoice-${selected.id}`);
      setMessage(result.irn ? `IRN stored: ${result.irn}` : result.message || result.outcome);
      await load();
    } catch (err: any) {
      setMessage(err.message || "Generate did not succeed.");
    }
  };

  return (
    <Panel loading={loading} error={error} onRetry={load} empty={!tenantContext.companyId ? "Sign in and select a company to see e-invoice documents." : rows.length === 0 ? "No issued sales invoices in this period." : null}>
      <p className="text-sm">Environment {config?.environment || "SANDBOX"} · credentials {config?.credentialStatus} · sandbox live {String(config?.sandboxLiveEnabled)} · {config?.productionMode}</p>
      <DataTable
        columns={["Invoice", "Date", "Recipient GSTIN", "Taxable", "UTGST", "IRN status"]}
        rows={rows.map((row) => [row.documentNumber, row.documentDate, row.partyGstin || "Missing GSTIN", row.taxableAmount, row.utgstAmount, row.eInvoice?.irn || "Not generated"])}
        onRow={(index) => {
          setSelected(rows[index]);
          setPreview(null);
        }}
      />
      {selected ? (
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm space-y-2">
          <p className="font-medium">{selected.documentNumber}</p>
          <p>Eligibility: {selected.partyGstin ? "Recipient GSTIN is present." : "Blocked until the recipient has a GSTIN."} {Number(selected.utgstAmount) > 0 ? "UTGST is included in the IRP SgstAmt field." : ""}</p>
          <button type="button" className="underline" onClick={() => setPreview(JSON.stringify({ documentNumber: selected.documentNumber, taxable: selected.taxableAmount, cgst: selected.cgstAmount, sgst: selected.sgstAmount, utgst: selected.utgstAmount, igst: selected.igstAmount, total: selected.grandTotal }, null, 2))}>
            Preview payload values
          </button>
          {preview ? <pre className="text-xs bg-slate-50 p-2 overflow-x-auto">{preview}</pre> : null}
          {selected.eInvoice ? (
            <p>IRN {selected.eInvoice.irn} · Ack {selected.eInvoice.ackNo} · {selected.eInvoice.ackDate} · signed QR {selected.eInvoice.hasSignedQr ? "stored" : "missing"} · {selected.eInvoice.environment}</p>
          ) : (
            <p>No IRN is stored.</p>
          )}
          {canWrite ? (
            <button type="button" className="px-3 py-1.5 rounded bg-slate-900 text-white" onClick={generate} disabled={!selected.partyGstin || config?.credentialStatus !== "READY"}>
              Submit to configured environment
            </button>
          ) : null}
          {message ? <p>{message}</p> : null}
          <Link className="underline" href={selected.href}>Open invoice</Link>
        </div>
      ) : null}
    </Panel>
  );
}
