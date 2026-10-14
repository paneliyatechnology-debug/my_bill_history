"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../../lib/api-client";
import { useAuth } from "../../../context/auth-context";
import { DataTable, GstFrame, Panel, useCanWriteGst, useGstPeriod } from "../../../components/gst/gst-kit";

const STATUSES = ["", "MATCHED", "PARTIAL_MATCH", "MISSING_IN_BOOKS", "MISSING_IN_GSTR2B", "DUPLICATE", "MISMATCH"];

export default function Gstr2bPage() {
  return (
    <GstFrame title="GSTR-2B reconciliation" notice="A match does not claim ITC. Accepting a row stores a review and does not post a voucher.">
      <Body />
    </GstFrame>
  );
}

function Body() {
  const { tenantContext } = useAuth();
  const period = useGstPeriod();
  const canWrite = useCanWriteGst();
  const [status, setStatus] = useState("");
  const [fileText, setFileText] = useState("");
  const [fileName, setFileName] = useState("gstr2b.json");
  const [preview, setPreview] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [decision, setDecision] = useState("ACCEPTED");
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
      const listed = await apiClient.get<any>("/gst/gstr-2b/reconciliations", {
        returnPeriod: period.returnPeriod,
        status: status || undefined,
      });
      setRows(listed.rows || []);
    } catch (err: any) {
      setError(err.message || "Reconciliation could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [tenantContext.companyId, period.returnPeriod, status]);
  useEffect(() => {
    load();
  }, [load]);

  const onFile = async (file: File) => {
    setFileName(file.name);
    const text = await file.text();
    setFileText(text);
    try {
      const parsed = JSON.parse(text);
      const count = JSON.stringify(parsed).match(/inum/g)?.length || 0;
      setPreview(`JSON preview: about ${count} invoice number fields. Import will validate GSTIN and period on the server.`);
    } catch {
      setPreview(`CSV or text preview: ${text.split(/\r?\n/).length} lines. The server accepts the GSTR-2B JSON shape and a CSV with the columns it already parses.`);
    }
  };

  const importFile = async () => {
    setMessage(null);
    try {
      const result = await apiClient.post<any>("/gst/gstr-2b/imports", {
        fileName,
        content: fileText,
        returnPeriod: period.returnPeriod,
      });
      setMessage(result.duplicateFile ? "This file was already imported. No second copy was created." : "Import stored. ITC remains unreviewed.");
      await load();
    } catch (err: any) {
      setMessage(err.message || "Import failed.");
    }
  };

  const review = async () => {
    if (!selected) return;
    setMessage(null);
    try {
      const result = await apiClient.post<any>(`/gst/gstr-2b/reconciliations/${selected.id}/review`, {
        itcDecision: decision,
        reason,
      });
      setMessage(`${result.message} Accounting posting: ${result.accountingPosting}.`);
      await load();
    } catch (err: any) {
      setMessage(err.message || "Review was rejected.");
    }
  };

  return (
    <Panel loading={loading} error={error} onRetry={load} empty={!tenantContext.companyId ? "Sign in and select a company before importing GSTR-2B." : null}>
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
        <input type="file" accept=".json,.csv,text/csv,application/json" onChange={(event) => event.target.files?.[0] && onFile(event.target.files[0])} />
        {preview ? <p className="text-sm text-slate-600">{preview}</p> : null}
        {canWrite ? (
          <button type="button" className="px-3 py-1.5 rounded bg-slate-900 text-white text-sm" disabled={!fileText} onClick={importFile}>
            Import for {period.returnPeriod}
          </button>
        ) : (
          <p className="text-sm">Your role can review the list but cannot import or change ITC decisions.</p>
        )}
        {message ? <p className="text-sm">{message}</p> : null}
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {STATUSES.map((item) => (
          <button key={item || "ALL"} type="button" className={`px-3 py-1 rounded-full text-xs border ${status === item ? "bg-slate-900 text-white" : "bg-white"}`} onClick={() => setStatus(item)}>
            {item || "All"}
          </button>
        ))}
        <button type="button" className="text-xs underline" onClick={() => apiClient.downloadCsv("/gst/gstr-2b/export", `gstr-2b-${period.returnPeriod}.csv`, { returnPeriod: period.returnPeriod })}>
          Export CSV
        </button>
      </div>
      <DataTable
        columns={["Status", "ITC", "Supplier", "Books", "Portal", "Taxable books / portal"]}
        rows={rows.map((row) => [
          row.status,
          row.itcDecision,
          row.supplierGstin,
          row.books?.documentNumber || "—",
          row.portal?.invoiceNumber || "—",
          `${row.books?.taxableValue || "—"} / ${row.portal?.taxableValue || "—"}`,
        ])}
        onRow={(index) => setSelected(rows[index])}
      />
      {selected ? (
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm space-y-2">
          <p className="font-medium">{selected.status} · {selected.itcDecision}</p>
          <p>Books GSTIN {selected.books?.supplierGstin || "—"} · Portal supplier {selected.supplierGstin}</p>
          <p>Dates {selected.books?.documentDate || "—"} / {selected.portal?.invoiceDate || "—"}</p>
          <p>CGST {selected.books?.cgst || "—"} / {selected.portal?.cgst || "—"} · SGST {selected.books?.sgst || "—"} / {selected.portal?.sgst || "—"} · UTGST books {selected.books?.utgst || "—"} · IGST {selected.books?.igst || "—"} / {selected.portal?.igst || "—"}</p>
          <p>{(selected.explanation?.rules || []).join(" ")}</p>
          {canWrite ? (
            <div className="space-y-2">
              <select className="border rounded px-2 py-1" value={decision} onChange={(event) => setDecision(event.target.value)}>
                <option>ACCEPTED</option>
                <option>REJECTED</option>
                <option>DEFERRED</option>
              </select>
              <textarea className="w-full border rounded p-2" placeholder="Reason, at least 10 characters" value={reason} onChange={(event) => setReason(event.target.value)} />
              <button type="button" className="px-3 py-1.5 rounded bg-slate-900 text-white" onClick={review}>
                Save review
              </button>
            </div>
          ) : null}
          <p>Accepted rows are the only ITC used in the GSTR-3B draft. Pending and excluded amounts stay visible there.</p>
        </div>
      ) : null}
    </Panel>
  );
}
