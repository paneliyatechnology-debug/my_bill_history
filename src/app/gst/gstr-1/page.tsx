"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "../../../lib/api-client";
import { useAuth } from "../../../context/auth-context";
import { DataTable, GstFrame, Panel, downloadJson, useGstPeriod } from "../../../components/gst/gst-kit";

const TABS = ["B2B", "B2C large", "B2C small", "Notes", "Nil / exempt / non-GST", "HSN"] as const;

export default function Gstr1Page() {
  return (
    <GstFrame title="GSTR-1 preparation" notice="This is a draft from posted books. Downloading it does not file GSTR-1.">
      <Body />
    </GstFrame>
  );
}

function Body() {
  const { tenantContext } = useAuth();
  const period = useGstPeriod();
  const [tab, setTab] = useState<(typeof TABS)[number]>("B2B");
  const [data, setData] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
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
      const params = { fromDate: period.fromDate, toDate: period.toDate, month: period.month, year: period.year };
      const [report, documents] = await Promise.all([
        apiClient.get<any>("/reports/gstr-1", params),
        apiClient.get<any[]>("/gst/documents", params),
      ]);
      setData(report);
      setDocs(documents);
    } catch (err: any) {
      setError(err.message || "GSTR-1 could not be prepared.");
    } finally {
      setLoading(false);
    }
  }, [tenantContext.companyId, period.fromDate, period.toDate, period.month, period.year]);
  useEffect(() => {
    load();
  }, [load]);

  const rows = rowsFor(tab, data);
  return (
    <Panel loading={loading} error={error} onRetry={load} empty={!tenantContext.companyId ? "Sign in and select a company before preparing GSTR-1." : !data ? "No draft was returned." : null}>
      <div className="flex flex-wrap gap-2 items-center">
        {TABS.map((item) => (
          <button key={item} type="button" className={`px-3 py-1 rounded-full text-xs border ${tab === item ? "bg-slate-900 text-white" : "bg-white"}`} onClick={() => setTab(item)}>
            {item}
          </button>
        ))}
        <button type="button" className="text-xs underline" onClick={() => downloadJson(`gstr-1-${period.returnPeriod}-draft.json`, data)}>
          Download draft JSON
        </button>
        <span className="text-xs text-slate-500">Status {data?.filingStatus}. Books taxable {data?.totalTaxable}. Draft taxable is the same figure because the draft is built from those books.</span>
      </div>
      <DataTable
        columns={["Document", "Date", "GSTIN / place", "Taxable", "Tax", "Total", "Check"]}
        rows={rows.map((row: { doc: string; date: string; party: string; taxable: string; tax: string; total: string; check: string }) => [row.doc, row.date, row.party, row.taxable, row.tax, row.total, row.check])}
        onRow={(index) => setSelected(rows[index])}
      />
      {selected ? (
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm space-y-2">
          <p className="font-medium">{selected.doc}</p>
          <p>{selected.detail}</p>
          {docs.find((doc) => doc.documentNumber === selected.doc) ? (
            <Link className="underline" href={docs.find((doc) => doc.documentNumber === selected.doc).href}>
              Open the sales invoice
            </Link>
          ) : (
            <p>This row is a summary or a note. Change the source document in sales or purchases. This screen does not edit posted invoices.</p>
          )}
        </div>
      ) : null}
    </Panel>
  );
}

function rowsFor(tab: string, data: any) {
  if (!data) return [];
  if (tab === "B2B") {
    return (data.b2b || []).flatMap((party: any) =>
      (party.inv || []).map((invoice: any) => ({
        doc: invoice.inum,
        date: invoice.idt,
        party: party.ctin,
        taxable: invoice.itms?.[0]?.itm_det?.txval,
        tax: `IGST ${invoice.itms?.[0]?.itm_det?.iamt} CGST ${invoice.itms?.[0]?.itm_det?.camt} State/UT ${invoice.itms?.[0]?.itm_det?.samt}`,
        total: invoice.val,
        check: invoice.pos ? "Place of supply present" : "Missing place of supply",
        detail: JSON.stringify(invoice),
      })),
    );
  }
  if (tab === "B2C large") {
    return (data.b2cl || []).flatMap((group: any) =>
      (group.inv || []).map((invoice: any) => ({
        doc: invoice.inum,
        date: invoice.idt,
        party: group.pos,
        taxable: invoice.itms?.[0]?.itm_det?.txval,
        tax: invoice.itms?.[0]?.itm_det?.iamt,
        total: invoice.val,
        check: "Inter-state unregistered above ₹2,50,000",
        detail: JSON.stringify(invoice),
      })),
    );
  }
  if (tab === "B2C small") {
    return (data.b2cs || []).map((row: any) => ({
      doc: row.sply_ty,
      date: "",
      party: row.pos,
      taxable: row.txval,
      tax: `IGST ${row.iamt} CGST ${row.camt} State/UT ${row.samt}`,
      total: row.txval,
      check: `Rate ${row.rt}`,
      detail: JSON.stringify(row),
    }));
  }
  if (tab === "Notes") {
    const registered = (data.cdnr || []).flatMap((party: any) =>
      (party.nt || []).map((note: any) => ({
        doc: note.nt_num,
        date: note.nt_dt,
        party: party.ctin,
        taxable: note.itms?.[0]?.itm_det?.txval,
        tax: note.ntty,
        total: note.val,
        check: note.ntty === "D" ? "Debit note" : "Credit note",
        detail: JSON.stringify(note),
      })),
    );
    const unregistered = (data.cdnur || []).map((note: any) => ({
      doc: note.nt_num,
      date: note.nt_dt,
      party: note.typ,
      taxable: note.itms?.[0]?.itm_det?.txval,
      tax: note.ntty,
      total: note.val,
      check: "Unregistered note",
      detail: JSON.stringify(note),
    }));
    return [...registered, ...unregistered];
  }
  if (tab === "HSN") {
    return (data.hsn?.data || []).map((row: any) => ({
      doc: row.hsn_sc,
      date: "",
      party: row.uqc,
      taxable: row.txval,
      tax: `IGST ${row.iamt} CGST ${row.camt} State/UT ${row.samt}`,
      total: row.qty,
      check: row.desc,
      detail: JSON.stringify(row),
    }));
  }
  return (data.nil?.rows || []).map((row: any) => ({
    doc: row.sply_ty,
    date: "",
    party: row.pos,
    taxable: `Nil ${row.nil_amt}`,
    tax: `Exempt ${row.expt_amt}`,
    total: `Non-GST ${row.ngsup_amt}`,
    check: data.nil?.assumption,
    detail: JSON.stringify(row),
  }));
}
