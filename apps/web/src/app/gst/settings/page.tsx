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
        environment: "SANDBOX",
        productionEnabled: false,
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
      const result = await apiClient.post<any>("/gst/integration/sandbox-ping");
      setMessage(`${result.outcome}: ${result.message || "No further detail."}`);
    } catch (err: any) {
      setMessage(err.message || "Sandbox check failed.");
    }
  };

  return (
    <Panel loading={loading} error={error} onRetry={load} empty={!tenantContext.companyId ? "Sign in and select a company before changing GST settings." : null}>
      <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm space-y-2">
        <p>Company GSTIN: {currentCompany?.gstin || "Add it in Company Settings. This page does not invent one."}</p>
        <p>State code: {currentCompany?.stateCode || "—"}</p>
        <p>Environment: {config?.environment} · credential status: {config?.credentialStatus}</p>
        <p>{config?.message}</p>
        <p>Production mode: {config?.productionMode}. Sandbox live flag: {String(config?.sandboxLiveEnabled)}.</p>
        <p>Put client secret and password in GST_EINVOICE_CLIENT_SECRET and GST_EINVOICE_PASSWORD. Set GST_CREDENTIALS_ENCRYPTION_KEY before storing ciphertext. Follow docs/gst-sandbox-checklist.md.</p>
        {canWrite ? (
          <div className="space-y-2">
            <input className="border rounded px-2 py-1 w-full sm:w-80" placeholder="Sandbox client id" value={clientId} onChange={(event) => setClientId(event.target.value)} />
            <input className="border rounded px-2 py-1 w-full sm:w-80" placeholder="Sandbox username" value={username} onChange={(event) => setUsername(event.target.value)} />
            <div className="flex gap-2">
              <button type="button" className="px-3 py-1.5 rounded bg-slate-900 text-white" onClick={save}>Save sandbox identifiers</button>
              <button type="button" className="px-3 py-1.5 rounded border" onClick={ping}>Sandbox connectivity check</button>
            </div>
          </div>
        ) : <p>Your role cannot change GST settings.</p>}
        {message ? <p>{message}</p> : null}
      </div>
    </Panel>
  );
}
