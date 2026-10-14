"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "../../../lib/api-client";
import { useAuth } from "../../../context/auth-context";
import { DataTable, GstFrame, Panel, useCanWriteGst, useGstPeriod } from "../../../components/gst/gst-kit";

export default function EwayPage() {
  return (
    <GstFrame title="E-Way Bill" notice="A bill number is shown only when a provider response stored one. UTGST invoices stay blocked. Production calls stay off.">
      <Body />
    </GstFrame>
  );
}

function Body() {
  const { tenantContext } = useAuth();
  const period = useGstPeriod();
  const canWrite = useCanWriteGst();
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [distance, setDistance] = useState("10");
  const [vehicle, setVehicle] = useState("");
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
      setRows(await apiClient.get<any[]>("/gst/documents", { fromDate: period.fromDate, toDate: period.toDate }));
    } catch (err: any) {
      setError(err.message || "E-way documents could not be loaded.");
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
      const result = await apiClient.post<any>(`/gst/eway-bills/invoices/${selected.id}/generate`, {
        distanceKm: Number(distance),
        vehicleNumber: vehicle,
      }, undefined, `ui-eway-${selected.id}-${vehicle}`);
      setMessage(result.ewbNumber ? `E-way number stored: ${result.ewbNumber}` : result.message || result.outcome);
      await load();
    } catch (err: any) {
      setMessage(err.message || "E-way generation did not succeed.");
    }
  };

  const lookup = async () => {
    if (!selected?.eWayBill?.ewbNumber) return;
    try {
      const result = await apiClient.get<any>(`/gst/eway-bills/${selected.eWayBill.ewbNumber}`);
      setMessage(JSON.stringify(result));
    } catch (err: any) {
      setMessage(err.message || "Lookup failed.");
    }
  };

  return (
    <Panel loading={loading} error={error} onRetry={load} empty={!tenantContext.companyId ? "Sign in and select a company to see e-way documents." : rows.length === 0 ? "No documents in this period." : null}>
      <DataTable
        columns={["Document", "Date", "Total", "UTGST blocked", "E-way number", "Status"]}
        rows={rows.map((row) => [row.documentNumber, row.documentDate, row.grandTotal, row.utgstBlockedForEway ? "Blocked" : "Allowed to attempt", row.eWayBill?.ewbNumber || "Not generated", row.eWayBill?.status || "—"])}
        onRow={(index) => setSelected(rows[index])}
      />
      {selected ? (
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm space-y-2">
          <p className="font-medium">{selected.documentNumber}</p>
          <p>Required before submission: distance in kilometres and either a vehicle number or a transporter id. Vehicle is collected here.</p>
          {selected.utgstBlockedForEway ? <p>This invoice has UTGST. Generation stays blocked until the e-way schema confirms the UT amount field.</p> : null}
          {selected.eWayBill ? <p>Stored number {selected.eWayBill.ewbNumber}, valid until {selected.eWayBill.validUpto}, vehicle {selected.eWayBill.vehicleNumber || "—"}.</p> : <p>No e-way number is stored.</p>}
          {canWrite && !selected.utgstBlockedForEway ? (
            <div className="flex flex-wrap gap-2">
              <input className="border rounded px-2 py-1 w-24" value={distance} onChange={(event) => setDistance(event.target.value)} />
              <input className="border rounded px-2 py-1" placeholder="Vehicle number" value={vehicle} onChange={(event) => setVehicle(event.target.value)} />
              <button type="button" className="px-3 py-1.5 rounded bg-slate-900 text-white" onClick={generate}>Generate</button>
            </div>
          ) : null}
          {selected.eWayBill ? <button type="button" className="underline" onClick={lookup}>Look up stored bill</button> : null}
          {message ? <p>{message}</p> : null}
          <Link className="underline" href={selected.href}>Open invoice</Link>
        </div>
      ) : null}
    </Panel>
  );
}
