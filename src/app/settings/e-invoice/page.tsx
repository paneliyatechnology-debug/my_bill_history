"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { apiClient } from "@/lib/api-client";
import { einvoiceApi, EInvoiceSettingsData } from "@/lib/einvoice";

export default function EInvoiceSettingsPage() {
  const { tenantContext, currentCompany, lang, refreshTenantMetadata } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingPing, setTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState<any>(null);
  const [isApplicable, setIsApplicable] = useState(!!currentCompany?.eInvoiceApplicable);

  const [settings, setSettings] = useState<EInvoiceSettingsData>({
    environment: "SANDBOX",
    productionEnabled: false,
    einvoiceClientId: "",
    einvoiceUsername: "",
    ewayClientId: "",
    ewayUsername: "",
    credentialStatus: "MISSING",
    secretsPresent: false,
    sandboxLiveEnabled: false,
    message: "",
  });

  const [acknowledgeProductionGate, setAcknowledgeProductionGate] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      if (!tenantContext.companyId) return;
      setLoading(true);
      try {
        const res = await einvoiceApi.getSettings();
        setSettings(res);
      } catch (err: any) {
        console.warn("Could not load e-invoice settings", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenantContext.companyId]);

  useEffect(() => {
    setIsApplicable(!!currentCompany?.eInvoiceApplicable);
  }, [currentCompany?.eInvoiceApplicable]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      if (isApplicable !== !!currentCompany?.eInvoiceApplicable) {
        await apiClient.patch("/tenants/company", {
          eInvoiceApplicable: isApplicable,
        });
        await refreshTenantMetadata();
      }

      const res = await einvoiceApi.saveSettings({
        environment: settings.environment,
        productionEnabled: settings.productionEnabled,
        acknowledgeProductionGate: settings.productionEnabled ? acknowledgeProductionGate : undefined,
        einvoiceClientId: settings.einvoiceClientId || undefined,
        einvoiceUsername: settings.einvoiceUsername || undefined,
        ewayClientId: settings.ewayClientId || undefined,
        ewayUsername: settings.ewayUsername || undefined,
      });
      setFeedback({ type: "success", text: res.message || "Settings saved successfully." });
      // Refresh
      const updated = await einvoiceApi.getSettings();
      setSettings(updated);
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  const handlePing = async () => {
    setTestingPing(true);
    setPingResult(null);
    try {
      const res = await einvoiceApi.pingSandbox();
      setPingResult(res);
    } catch (err: any) {
      setPingResult({ attempted: false, outcome: "ERROR", message: err.message || "Ping failed" });
    } finally {
      setTestingPing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent"></div>
          <span className="text-sm font-semibold text-slate-600">Loading IRP provider configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/sales/e-invoices" className="hover:text-emerald-700 transition">
              E-Invoices
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800">Settings</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            {lang === "gu" ? "ઈ-ઇનવોઇસ અને IRP સેટિંગ્સ" : "E-Invoice & IRP Provider Configuration"}
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Configure Invoice Registration Portal (IRP) credentials, sandbox environment, and compliance safeguards.
          </p>
        </div>

        <Link
          href="/sales/e-invoices"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs"
        >
          ← Back to E-Invoices
        </Link>
      </div>

      {feedback && (
        <div
          className={`mb-6 rounded-xl border p-4 text-xs font-semibold ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : "bg-rose-50 border-rose-300 text-rose-900"
          }`}
        >
          {feedback.text}
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (8 Cols) */}
        <div className="space-y-6 lg:col-span-8">
          {/* Company GST Registration Identity */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] text-slate-700">1</span>
              Company GSTIN Identity
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Company Legal Name</label>
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2 font-bold text-slate-800">
                  {settings.company?.legalName || currentCompany?.legalName || "Not configured"}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Registered GSTIN</label>
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2 font-mono font-bold text-emerald-800">
                  {settings.company?.gstin || currentCompany?.gstin || "No GSTIN on file"}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">State Code</label>
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2 font-mono text-slate-700">
                  {settings.company?.stateCode || currentCompany?.stateCode || "24"}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Registered Pincode</label>
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2 font-mono text-slate-700">
                  {settings.company?.pincode || currentCompany?.pincode || "Not set"}
                </div>
              </div>

              {/* Dynamic E-Invoicing Applicable Toggle */}
              <div className="sm:col-span-2 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <label className="block font-semibold text-slate-800 text-xs">Enable Statutory E-Invoicing for this Company</label>
                  <p className="text-[11px] text-slate-500">
                    Activates government IRP IRN generation and signed QR code printing across sales invoices.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsApplicable(!isApplicable)}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${isApplicable ? "bg-[#1E7A4C]" : "bg-slate-300"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isApplicable ? "left-5" : "left-0.5"}`} />
                </button>
              </div>

              {!currentCompany?.gstin && (
                <div className="sm:col-span-2 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between text-xs">
                  <span className="text-amber-800">
                    Your company does not have a GSTIN configured yet. E-invoicing requires a valid 15-character GSTIN.
                  </span>
                  <Link
                    href="/settings/company"
                    className="font-semibold text-amber-900 underline hover:text-amber-700 shrink-0 ml-2"
                  >
                    Add GSTIN in Company Settings &rarr;
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Provider & Environment Configuration */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] text-slate-700">2</span>
              IRP API Credentials & Environment
            </h2>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">IRP / GSP Integration Provider</label>
                  <select
                    disabled
                    value="NIC"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-slate-50 text-slate-600"
                  >
                    <option value="NIC">NIC GST Invoice Registration Portal (Authorized Adapter)</option>
                  </select>
                  <p className="mt-1 text-[11px] text-slate-400">Direct integration via authorized government IRP API specs.</p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Operating Environment</label>
                  <select
                    value={settings.environment}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        environment: e.target.value as any,
                        productionEnabled: e.target.value === "PRODUCTION",
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="SANDBOX">Sandbox / Testing (Pre-production)</option>
                    <option value="PRODUCTION">Production (Government Portal Live)</option>
                  </select>
                </div>
              </div>

              {/* Safety Gate Warning for Production */}
              {settings.environment === "PRODUCTION" && (
                <div className="rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 p-4 text-amber-950">
                  <div className="font-bold text-sm text-amber-900 mb-1">⚠️ Production Onboarding Gate</div>
                  <p className="text-[11px] leading-relaxed">
                    Live production submissions will generate legal statutory GST tax documents directly with the Government IRP. Real production client secrets and certificates must be provisioned via secure server environment variables.
                  </p>
                  <label className="mt-3 flex items-center gap-2 font-bold cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={acknowledgeProductionGate}
                      onChange={(e) => setAcknowledgeProductionGate(e.target.checked)}
                      className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                    />
                    I acknowledge that I have tested sandbox registration and wish to enable production mode.
                  </label>
                </div>
              )}

              {/* Credentials Fields */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">E-Invoice API Client ID</label>
                  <input
                    type="text"
                    value={settings.einvoiceClientId || ""}
                    onChange={(e) => setSettings((prev) => ({ ...prev, einvoiceClientId: e.target.value }))}
                    placeholder="e.g. NIC Client ID"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">E-Invoice Portal Username</label>
                  <input
                    type="text"
                    value={settings.einvoiceUsername || ""}
                    onChange={(e) => setSettings((prev) => ({ ...prev, einvoiceUsername: e.target.value }))}
                    placeholder="IRP API username"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">E-Way Bill API Client ID (Optional)</label>
                  <input
                    type="text"
                    value={settings.ewayClientId || ""}
                    onChange={(e) => setSettings((prev) => ({ ...prev, ewayClientId: e.target.value }))}
                    placeholder="E-Way client ID"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">E-Way Bill Portal Username (Optional)</label>
                  <input
                    type="text"
                    value={settings.ewayUsername || ""}
                    onChange={(e) => setSettings((prev) => ({ ...prev, ewayUsername: e.target.value }))}
                    placeholder="E-Way API username"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Secrets Security Note */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
                <span className="font-bold text-slate-800">Security Architecture: </span>
                Client secrets and API passwords are never transmitted or stored in the browser. They are encrypted at rest on the backend server or injected via secure server environment variables (<code className="font-mono text-emerald-800">GST_EINVOICE_CLIENT_SECRET</code>, <code className="font-mono text-emerald-800">GST_EINVOICE_PASSWORD</code>).
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 Cols) */}
        <div className="space-y-6 lg:col-span-4">
          {/* Status & Diagnostic Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
              Connection Status
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Credential Status:</span>
                <span
                  className={`rounded-full px-2 py-0.5 font-bold text-[10px] ${
                    settings.credentialStatus === "READY"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {settings.credentialStatus}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Backend Secrets Present:</span>
                <span className="font-mono font-semibold">
                  {settings.secretsPresent ? "YES (Encrypted)" : "NO"}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Live Sandbox Flag:</span>
                <span className="font-mono font-semibold">
                  {settings.sandboxLiveEnabled ? "ENABLED" : "DRY RUN"}
                </span>
              </div>
            </div>

            {/* Test Ping Action */}
            <div className="border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={handlePing}
                disabled={testingPing}
                className="w-full rounded-lg border border-slate-300 bg-slate-50/70 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
              >
                {testingPing ? "Testing Heartbeat..." : "Test Sandbox Heartbeat Ping"}
              </button>

              {pingResult && (
                <div
                  className={`mt-2 rounded p-2 text-[11px] ${
                    pingResult.outcome === "REACHABLE"
                      ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                      : "bg-amber-50 text-amber-900 border border-amber-200"
                  }`}
                >
                  <div className="font-bold">Result: {pingResult.outcome}</div>
                  <div className="text-[10px] mt-0.5">{pingResult.message}</div>
                </div>
              )}
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {saving ? "Saving Changes..." : "Save Settings"}
            </button>
          </div>

          {/* Statutory Compliance Guidelines */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs text-xs text-slate-600 space-y-2.5">
            <h4 className="font-bold text-slate-900">GST E-Invoice Rules & Notes</h4>
            <ul className="list-disc pl-4 space-y-1.5 text-[11px]">
              <li>
                <b>Turnover Threshold:</b> Mandatory for businesses whose aggregate annual turnover exceeded ₹5 Crore in any preceding financial year from 2017-18.
              </li>
              <li>
                <b>30-Day Reporting Window:</b> Effective 1 April 2025, businesses with AATO ≥ ₹10 Crore cannot report invoices older than 30 days to the IRP.
              </li>
              <li>
                <b>24-Hour Cancellation Limit:</b> Once an IRN is generated, it cannot be cancelled on the IRP after 24 hours. A credit note must be issued instead.
              </li>
              <li>
                <b>Signed QR Code:</b> Locally generated QR codes are not valid for e-invoicing; the official signed QR returned by the IRP must be printed on the invoice.
              </li>
            </ul>
          </div>
        </div>
      </form>
    </div>
  );
}

