"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../../lib/api-client";
import { useAuth } from "../../../context/auth-context";
import { GstFrame, Panel, useCanWriteGst } from "../../../components/gst/gst-kit";

export default function GstSettingsPage() {
  return (
    <GstFrame title="GST settings and provider status" notice="Secrets are not entered here. Production stays off unless the server-side gate is explicitly acknowledged and credentials are complete.">
      <Body />
    </GstFrame>
  );
}

function Body() {
  const { currentCompany, tenantContext } = useAuth();
  const canWrite = useCanWriteGst();
  const [config, setConfig] = useState<any>(null);
  const [clientId, setClientId] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!tenantContext.companyId) {
      setLoading(false);
      setConfig(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const value = await apiClient.get<any>("/gst/integration");
      setConfig(value);
      setClientId(value.einvoiceClientId || "");
      setUsername(value.einvoiceUsername || "");
    } catch (err: any) {
      setError(err.message || "GST settings could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [tenantContext.companyId]);
  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setMessage(null);
    try {
      const saved = await apiClient.put<any>("/gst/integration", {
        environment: "PRODUCTION",
        productionEnabled: true,
        einvoiceClientId: clientId,
        einvoiceUsername: username,
      });
      setMessage(`Saved ${saved.environment}. Production enabled: ${saved.productionEnabled}.`);
      await load();
    } catch (err: any) {
      setMessage(err.message || "Save failed.");
    }
  };

  const ping = async () => {
    setMessage(null);
    try {
      const result = await apiClient.post<any>("/gst/integration/live-ping");
      setMessage(`${result.outcome}: ${result.message || "No further detail."}`);
    } catch (err: any) {
      setMessage(err.message || "Connection check failed.");
    }
  };

  return (
    <Panel loading={loading} error={error} onRetry={load} empty={!tenantContext.companyId ? "Sign in and select a company before changing GST settings." : null}>
      <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm space-y-2">
        <p>Company GSTIN: {currentCompany?.gstin || "Add it in Company Settings."}</p>
        <p>State code: {currentCompany?.stateCode || "—"}</p>
        <p>Environment: {config?.environment || "PRODUCTION"} · credential status: {config?.credentialStatus}</p>
        <p>{config?.message}</p>
        <p>Production mode: {config?.productionMode || "LIVE_GOVERNMENT_PORTAL"}.</p>
        {canWrite ? (
          <div className="space-y-2">
            <input className="border rounded px-2 py-1 w-full sm:w-80" placeholder="IRP Client ID" value={clientId} onChange={(event) => setClientId(event.target.value)} />
            <input className="border rounded px-2 py-1 w-full sm:w-80" placeholder="IRP Username" value={username} onChange={(event) => setUsername(event.target.value)} />
            <div className="flex gap-2">
              <button type="button" className="px-3 py-1.5 rounded bg-emerald-700 text-white" onClick={save}>Save IRP Identifiers</button>
              <button type="button" className="px-3 py-1.5 rounded border" onClick={ping}>Test Live IRP Connection</button>
            </div>
          </div>
        ) : <p>Your role cannot change GST settings.</p>}
        {message ? <p>{message}</p> : null}
      </div>
    </Panel>
  );
}
